// ABOUTME: The hub server of topology B: one Node HTTP server over the canonical SQLite database,
// ABOUTME: serving the typed repository and the unchanged domain services to clients on the school LAN.

import { mkdirSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { createRepository, type Repository } from '@/data/repository';
import { ServerNode } from '@/data/sync';
import { ENTITY_NAMES } from '@/domain/schema';

import { AuthenticationService, loadOrCreateAuthKey, type AuthNotifier } from '../../server/auth';
import { BackupError } from '../../server/backup/errors';
import { resolveBackupSecret, type BackupSecretSource } from '../../server/backup/key';
import { restoreArchive } from '../../server/backup/restore';
import { BackupScheduler } from '../../server/backup/schedule';
import { BackupService } from '../../server/backup/service';
import type { BackupRetentionPolicy } from '../../server/backup/types';
import { createHubRouter } from '../../server/http/hubRouter';
import { sendJson, setCorsHeaders } from '../../server/http/http';
import type { Router } from '../../server/http/router';

/** The automatic backup a hub runs, and where it finds its key. */
export interface LANServerBackupConfig {
  /** False turns the backup service off entirely, including the HTTP endpoints. */
  readonly enabled?: boolean;
  /** Defaults to `<dataDir>/backups`. */
  readonly directory?: string;
  /** A file holding the passphrase; it must live outside the backup directory. */
  readonly keyFile?: string;
  /** The passphrase itself; prefer `SCHOOLPILOT_BACKUP_PASSPHRASE` for an unattended hub. */
  readonly passphrase?: string;
  /** The daily run time in UTC, `HH:MM`; defaults to `02:00`. */
  readonly dailyAt?: string;
  readonly retention?: Partial<BackupRetentionPolicy>;
  /** How often the scheduler checks the cadence; defaults to one minute. */
  readonly intervalMs?: number;
}

interface LANServerConfig {
  /** The directory the hub keeps its database and, by default, its backups in. */
  dataDir: string;
  /** The port to listen on; `0` lets the operating system pick one. */
  port: number;
  /** The address to bind to. */
  host?: string;
  /** The SQLite file; `<dataDir>/schoolpilot.db` when omitted. */
  databaseFile?: string;
  /** Whether browsers on the LAN may call the hub from another origin. */
  enableCors?: boolean;
  /** The actor a write is stamped with when the request names none. */
  actor?: string;
  /** The channel that delivers guardian one-time codes and password-reset links. */
  notifier?: AuthNotifier;
  /** The label an authenticator app shows beside an enrolment. */
  authIssuer?: string;
  /** The automatic backup; `false` disables backups and their endpoints. */
  backup?: LANServerBackupConfig | false;
  /** Restore an archive into a fresh directory before the hub opens its database. */
  restore?: {
    /** The archive to restore. */
    readonly from: string;
    /** Where `schoolpilot.db` is written; defaults to the directory of `databaseFile`. */
    readonly to?: string;
  };
}

interface ServerState {
  running: boolean;
  startTime: Date | null;
}

/** The status a health check and an operator read. */
export interface LANServerStatus {
  readonly running: boolean;
  readonly host: string;
  readonly port: number;
  readonly uptime: number;
  readonly databaseFile: string;
  readonly entityCount: number;
  readonly startedAt: string | null;
  /** The backup surface, or null when backups are disabled for this hub. */
  readonly backup: {
    readonly enabled: boolean;
    readonly available: boolean;
    readonly lastBackupAt: string | null;
    readonly drillDue: boolean;
  } | null;
}

/**
 * The hub server.
 *
 * It owns one SQLite database on disk and one repository over it. The repository is the same
 * typed repository the browser runs, so the domain services the hub serves are the browser's
 * own services: the hub adds a transport, not a second domain layer.
 *
 * Usage:
 *   const server = new LANServer({ dataDir: './data', port: 3000 });
 *   await server.start();
 *
 * The hub is authenticated: every route but `/health` and the sign-in endpoints requires a
 * bearer session, and a write is stamped with the user that session belongs to. Real-time sync
 * (P4-A02), mDNS discovery and TLS (P4-D02) are later tasks; this skeleton is the HTTP surface
 * they extend.
 */
export class LANServer {
  private config: LANServerConfig;
  private httpServer: Server | null = null;
  private adapter: SqliteAdapter | null = null;
  private repository: Repository | null = null;
  private backupService: BackupService | null = null;
  private scheduler: BackupScheduler | null = null;
  private syncNode: ServerNode | null = null;
  private auth: AuthenticationService | null = null;
  private state: ServerState = {
    running: false,
    startTime: null,
  };

  constructor(config: Partial<LANServerConfig> = {}) {
    this.config = {
      dataDir: './data',
      port: 3000,
      host: '0.0.0.0',
      enableCors: true,
      ...config,
    };
  }

  /** The SQLite file the hub serves. */
  get databaseFile(): string {
    return this.config.databaseFile ?? path.join(this.config.dataDir, 'schoolpilot.db');
  }

  /** The address the hub listens on; null when it is not listening. */
  get address(): { host: string; port: number } | null {
    const address = this.httpServer?.address();
    if (!address || typeof address === 'string') return null;
    return { host: address.address, port: address.port };
  }

  /** Starts the hub: opens the database, applies the canonical schema and listens. */
  async start(): Promise<void> {
    if (this.state.running) return;

    try {
      mkdirSync(this.config.dataDir, { recursive: true });
      if (this.config.restore) await this.restoreBeforeOpen();

      const adapter = createNodeSqliteAdapter({
        filename: this.databaseFile,
        foreignKeys: true,
      });
      await adapter.open();
      this.adapter = adapter;

      const repository = createRepository({ adapter });
      await repository.setup();
      this.repository = repository;

      // The sync node opens its metadata beside the canonical tables and seeds the change log
      // from rows the hub already holds, so a device that joins after the hub was populated
      // pulls them instead of an empty page. Rows that already have a change are skipped.
      const sync = await ServerNode.open({
        repository,
        adapter,
        deviceId: 'hub',
        dialect: 'sqlite',
      });
      await sync.bootstrap();
      this.syncNode = sync;

      const auth = new AuthenticationService({
        adapter,
        repository,
        authKey: loadOrCreateAuthKey(path.join(this.config.dataDir, 'auth.key')),
        ...(this.config.notifier !== undefined ? { notifier: this.config.notifier } : {}),
        ...(this.config.authIssuer !== undefined ? { issuer: this.config.authIssuer } : {}),
      });
      await auth.setup();
      this.auth = auth;

      // The automatic backup runs last, once the hub is fully initialised, so the archive it
      // writes holds the sync metadata and the auth tables rather than a half-built database.
      const backup = await this.openBackups(adapter, repository);
      this.backupService = backup;
      if (backup) await this.startBackups(backup);

      const router = createHubRouter({
        repository,
        sync,
        auth,
        ...(this.config.actor !== undefined ? { actor: this.config.actor } : {}),
        ...(backup ? { backup } : {}),
      });
      router.add('GET', '/health', () => ({ body: this.getStatus() }), { auth: 'none' });

      const server = createServer((req, res) => this.handleRequest(router, req, res));
      this.httpServer = server;
      await this.listen(server);

      this.state.running = true;
      this.state.startTime = new Date();
      console.log(`LAN Server listening on http://${this.config.host}:${this.address?.port}`);
    } catch (error) {
      await this.release();
      console.error('Failed to start LAN Server:', error);
      throw error;
    }
  }

  /** Stops the hub: closes the connections, then the database. Idempotent. */
  async stop(): Promise<void> {
    if (!this.httpServer && !this.adapter) return;
    await this.release();
    console.log('LAN Server stopped');
  }

  /** The status of the hub. */
  getStatus(): LANServerStatus {
    const backup = this.backupService;
    const cached = backup?.cachedStatus() ?? null;
    return {
      running: this.state.running,
      host: this.config.host ?? '0.0.0.0',
      port: this.address?.port ?? this.config.port,
      uptime: this.state.startTime ? Date.now() - this.state.startTime.getTime() : 0,
      databaseFile: this.databaseFile,
      entityCount: ENTITY_NAMES.length,
      startedAt: this.state.startTime?.toISOString() ?? null,
      backup: backup
        ? {
            enabled: true,
            available: backup.isConfigured,
            lastBackupAt: cached?.lastBackupAt ?? null,
            drillDue: cached?.drill.due ?? true,
          }
        : null,
    };
  }

  /** The repository the hub serves; null before start and after stop. */
  getRepository(): Repository | null {
    return this.repository;
  }

  /** The backup service; null when backups are disabled or the hub is stopped. */
  getBackupService(): BackupService | null {
    return this.backupService;
  }

  /** The sync node the hub serves; null before start and after stop. */
  getSyncNode(): ServerNode | null {
    return this.syncNode;
  }

  /** The authentication service the hub serves; null before start and after stop. */
  getAuthentication(): AuthenticationService | null {
    return this.auth;
  }

  // ==================== Private Methods ====================

  /** Opens the backup service; null when backups are disabled for this hub. */
  private async openBackups(
    adapter: SqliteAdapter,
    repository: Repository
  ): Promise<BackupService | null> {
    const config = this.config.backup;
    if (config === false || config?.enabled === false) return null;

    const backupDir = path.resolve(
      config?.directory ?? path.join(this.config.dataDir, 'backups')
    );
    const secret = resolveBackupSecret(this.secretSource(backupDir));

    const service = new BackupService({
      adapter,
      repository,
      backupDir,
      secret,
      databaseFile: this.databaseFile,
      ...(config?.retention !== undefined ? { retention: config.retention } : {}),
      ...(config?.dailyAt !== undefined ? { dailyAt: config.dailyAt } : {}),
    });
    await service.refresh();
    return service;
  }

  /** Runs a due automatic backup before the hub listens, then keeps checking the cadence. */
  private async startBackups(service: BackupService): Promise<void> {
    if (!service.isConfigured) return;

    const config = this.config.backup === false ? undefined : this.config.backup;
    const scheduler = new BackupScheduler({
      service,
      ...(config?.dailyAt !== undefined ? { dailyAt: config.dailyAt } : {}),
      ...(config?.intervalMs !== undefined ? { intervalMs: config.intervalMs } : {}),
    });
    await scheduler.runDue();
    scheduler.start();
    this.scheduler = scheduler;
  }

  /** Where the backup key comes from: the config first, the environment second. */
  private secretSource(backupDir: string): BackupSecretSource {
    const config = this.config.backup === false ? undefined : this.config.backup;
    return {
      backupDir,
      env: process.env,
      ...(config?.passphrase !== undefined ? { passphrase: config.passphrase } : {}),
      ...(config?.keyFile !== undefined ? { keyFile: config.keyFile } : {}),
    };
  }

  /** Restores the configured archive before the database is opened. */
  private async restoreBeforeOpen(): Promise<void> {
    const restore = this.config.restore;
    if (!restore) return;

    const targetDir = path.resolve(restore.to ?? path.dirname(this.databaseFile));
    const config = this.config.backup === false ? undefined : this.config.backup;
    const backupDir = path.resolve(
      config?.directory ?? path.join(this.config.dataDir, 'backups')
    );
    const secret = resolveBackupSecret(this.secretSource(backupDir));
    if (!secret) {
      throw new BackupError(
        'key_missing',
        'a restore needs the backup key: set SCHOOLPILOT_BACKUP_PASSPHRASE or pass --backup-key-file'
      );
    }

    mkdirSync(targetDir, { recursive: true });
    const result = await restoreArchive({
      backupFile: path.resolve(restore.from),
      targetDir,
      secret,
    });
    console.log(
      `Restored backup ${result.backupId} into ${result.databaseFile} (${result.digest.rows} rows)`
    );
  }
  private handleRequest(router: Router, req: IncomingMessage, res: ServerResponse): void {
    if (this.config.enableCors) {
      setCorsHeaders(res);
      if ((req.method ?? '').toUpperCase() === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
    }

    void router.handle(req, res).catch((error: unknown) => {
      console.error('The hub failed to write a response:', error);
      if (!res.writableEnded) {
        sendJson(res, 500, {
          error: { code: 'internal', message: 'the hub failed to handle the request' },
        });
      }
    });
  }

  /** Listens and resolves once the socket is bound. */
  private listen(server: Server): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => reject(error);
      server.once('error', onError);
      server.listen(this.config.port, this.config.host, () => {
        server.off('error', onError);
        resolve();
      });
    });
  }

  /** Releases the socket and the database, whatever state the hub is in. */
  private async release(): Promise<void> {
    const scheduler = this.scheduler;
    this.scheduler = null;
    scheduler?.stop();

    const server = this.httpServer;
    this.httpServer = null;

    if (server?.listening) {
      // A LAN client that holds a keep-alive connection must not delay the stop.
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    const adapter = this.adapter;
    this.adapter = null;
    this.repository = null;
    this.backupService = null;
    this.syncNode = null;
    this.auth = null;
    if (adapter) await adapter.close();

    this.state.running = false;
    this.state.startTime = null;
  }
}

export default LANServer;
