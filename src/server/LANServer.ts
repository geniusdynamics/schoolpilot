// ABOUTME: The hub server of topology B: one Node HTTP server over the canonical SQLite database,
// ABOUTME: serving the typed repository and the unchanged domain services to clients on the school LAN.
// ABOUTME: It serves TLS when given a certificate, and advertises itself over mDNS when asked to.

import { mkdirSync } from 'node:fs';
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { X509Certificate } from 'node:crypto';
import path from 'node:path';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { applySchemaMigrations } from '@/data/migrations';
import { createRepository, type Repository } from '@/data/repository';
import type { FieldCipher } from '@/data/security';
import { ServerNode } from '@/data/sync';
import { CATALOG, SequenceService, createSqliteSequenceStore } from '@/domain/sequences';
import { ENTITY_NAMES } from '@/domain/schema';

import { AuthenticationService, loadOrCreateAuthKey, type AuthNotifier } from '../../server/auth';
import { OidcSsoService, ssoProvidersFromEnv, type OidcProviderConfig } from '../../server/auth/oidc';
import { ApprovalEngine, RbacService } from '../../server/auth/rbac';
import { BackupError } from '../../server/backup/errors';
import { resolveBackupSecret, type BackupSecretSource } from '../../server/backup/key';
import { restoreArchive } from '../../server/backup/restore';
import { BackupScheduler } from '../../server/backup/schedule';
import { BackupService } from '../../server/backup/service';
import type { BackupRetentionPolicy } from '../../server/backup/types';
import { HealthService, type HubIntegration } from '../../server/health';
import { createHubRouter } from '../../server/http/hubRouter';
import { sendJson, setCorsHeaders } from '../../server/http/http';
import { RateLimiter } from '../../server/http/rateLimit';
import type { Router } from '../../server/http/router';
import { applySecurityHeaders } from '../../server/http/securityHeaders';
import {
  createRestrictedDataCipher,
  defaultRestrictedKeyFile,
} from '../../server/security/aesGcmFieldCipher';
import {
  FileRestrictedAccessLog,
  defaultRestrictedAccessLogFile,
  type RestrictedAccessLog,
} from '../../server/security/restrictedAccessLog';
import { sealRestrictedData } from '../../server/security/sealRestrictedData';
import { advertisementFor, HUB_PROTOCOL_VERSION, MdnsAdvertiser, SCHOOLPILOT_SERVICE } from './discovery';
import { lanIpv4Addresses, mdnsHostName } from './network';

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
  /**
   * The OIDC identity providers staff may sign in with.
   *
   * Omitted, they are read from the `SCHOOLPILOT_SSO_*` environment variables, and a hub with none
   * configured serves no SSO endpoints. `false` turns SSO off whatever the environment says.
   */
  sso?: readonly OidcProviderConfig[] | false;
  /** The PEM pair to serve; absent means plain HTTP. */
  tls?: { cert: string; key: string } | null;
  /** The mDNS advertisement; off unless asked for, so an embedder is never surprised. */
  discovery?: {
    enabled?: boolean;
    /** The instance label clients see; defaults to the machine's name. */
    instanceName?: string;
    /** The host label the A records answer for; defaults to `<instanceName>.local`. */
    hostName?: string;
    /** The UDP port to answer on; 5353 unless a test needs its own. */
    port?: number;
    /** The addresses to advertise; defaults to this machine's LAN addresses. */
    addresses?: readonly string[];
  };
  /** The restricted-data key (base64 or hex); the env var or the key file supplies it otherwise. */
  restrictedKey?: string;
  /** The restricted-data key file; `<dataDir>/keys/restricted-data.key` when omitted. */
  restrictedKeyFile?: string;
  /** Where restricted-data access is recorded; a JSONL file under the data directory by default. */
  accessLog?: RestrictedAccessLog;
  /** Whether the auth and write rate limits are enforced. Defaults to true. */
  rateLimits?: boolean;
  /** Whether the hub's security response headers are set. Defaults to true. */
  securityHeaders?: boolean;
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
  /** `https` when the hub serves TLS, `http` otherwise. */
  readonly protocol: 'http' | 'https';
  /** The SHA-256 fingerprint a client pins, or null over plain HTTP. */
  readonly tlsFingerprint: string | null;
  /** What the hub advertises over mDNS, or null when it advertises nothing. */
  readonly discovery: LANServerDiscoveryStatus | null;
  /** The backup surface, or null when backups are disabled for this hub. */
  readonly backup: {
    readonly enabled: boolean;
    readonly available: boolean;
    readonly lastBackupAt: string | null;
    readonly drillDue: boolean;
  } | null;
}

/** The discovery half of the hub's status. */
export interface LANServerDiscoveryStatus {
  readonly service: string;
  readonly instanceName: string;
  readonly hostName: string;
  readonly port: number;
  readonly addresses: readonly string[];
  readonly running: boolean;
  /** Why the advertisement is unavailable, when it is. */
  readonly error: string | null;
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
 * The hub is authenticated: every route but `/health`, the sign-in endpoints and the discovery
 * descriptor requires a bearer session, and a write is stamped with the user that session belongs
 * to.
 *
 * It hardens its own surface: restricted columns are sealed at rest through a key it manages, every
 * access to them is logged, the auth and write surfaces are rate limited, and every response
 * carries security headers.
 *
 * TLS is served when a certificate pair is passed; `src/server/cli.ts` issues and stores one for a
 * LAN install. Discovery is opt-in per hub, and a hub whose mDNS port is taken still serves clients.
 */
export class LANServer {
  private config: LANServerConfig;
  private httpServer: Server | null = null;
  private adapter: SqliteAdapter | null = null;
  private repository: Repository | null = null;
  private backupService: BackupService | null = null;
  private scheduler: BackupScheduler | null = null;
  private healthService: HealthService | null = null;
  private syncNode: ServerNode | null = null;
  private sequences: SequenceService | null = null;
  private auth: AuthenticationService | null = null;
  private rbac: RbacService | null = null;
  private advertiser: MdnsAdvertiser | null = null;
  private discoveryStatus: LANServerDiscoveryStatus | null = null;
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
      rateLimits: true,
      securityHeaders: true,
      ...config,
    };
  }

  /** The SQLite file the hub serves. */
  get databaseFile(): string {
    return this.config.databaseFile ?? path.join(this.config.dataDir, 'schoolpilot.db');
  }

  /** The SHA-256 fingerprint clients pin, or null when the hub serves plain HTTP. */
  get tlsFingerprint(): string | null {
    const cert = this.config.tls?.cert;
    return cert ? new X509Certificate(cert).fingerprint256 : null;
  }

  /** The URL a client on the LAN opens: the advertised mDNS name, else the bound host. */
  get url(): string {
    const scheme = this.config.tls ? 'https' : 'http';
    const fallback = this.config.host === '0.0.0.0' ? 'localhost' : (this.config.host ?? 'localhost');
    return `${scheme}://${this.discoveryStatus?.hostName ?? fallback}:${this.address?.port ?? this.config.port}`;
  }

  /**
   * The file the restricted-data key is read from.
   *
   * It is the one file that has to be backed up with the database: without it the sealed columns
   * cannot be read, and the hub refuses to start rather than generating a replacement.
   */
  get restrictedKeyFile(): string {
    return this.config.restrictedKeyFile ?? defaultRestrictedKeyFile(this.config.dataDir);
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

      // The key is loaded (or created) before the repository is built, so the cipher is in place
      // for every read and write, and the sweep seals any restricted value an older hub left in
      // the clear. A missing key over an already-encrypted database refuses to start here.
      const cipher = await createRestrictedDataCipher({
        dataDir: this.config.dataDir,
        adapter,
        ...(this.config.restrictedKey !== undefined
          ? { key: this.config.restrictedKey }
          : {}),
        ...(this.config.restrictedKeyFile !== undefined
          ? { keyFile: this.config.restrictedKeyFile }
          : {}),
      });

      const repository = createRepository({
        adapter,
        cipher,
        ...(this.config.actor !== undefined ? { actor: this.config.actor } : {}),
      });
      await repository.setup();
      await sealRestrictedData(adapter, cipher);
      this.repository = repository;

      // The module-owned tables (the sequences, the ledger, reconciliation) are not in the
      // canonical registry, so their migrations are applied here: the hub hands out number blocks
      // and must hold the tables they are recorded in. The device applies the same migrations when
      // it opens its own database, so the two schemas agree.
      await applySchemaMigrations(adapter);
      this.sequences = new SequenceService({
        store: createSqliteSequenceStore(adapter),
        definitions: CATALOG,
        deviceId: 'hub',
      });

      // The sync node opens its metadata beside the canonical tables and seeds the change log
      // from rows the hub already holds, so a device that joins after the hub was populated
      // pulls them instead of an empty page. Rows that already have a change are skipped.
      const sync = await ServerNode.open({
        repository,
        adapter,
        deviceId: 'hub',
        dialect: 'sqlite',
        cipher,
      });
      await sync.bootstrap();
      this.syncNode = sync;

      const authKey = loadOrCreateAuthKey(path.join(this.config.dataDir, 'auth.key'));
      const auth = new AuthenticationService({
        adapter,
        repository,
        authKey,
        ...(this.config.notifier !== undefined ? { notifier: this.config.notifier } : {}),
        ...(this.config.authIssuer !== undefined ? { issuer: this.config.authIssuer } : {}),
      });
      await auth.setup();
      this.auth = auth;

      // Single sign-on for staff. It signs people in through the authentication service above, so it
      // follows it, and it seals its in-flight state with the same key. A hub with no provider
      // configured serves no SSO routes at all.
      const ssoProviders =
        this.config.sso === false ? [] : (this.config.sso ?? ssoProvidersFromEnv(process.env));
      let sso: OidcSsoService | undefined;
      if (ssoProviders.length > 0) {
        sso = new OidcSsoService({ adapter, repository, auth, authKey, providers: ssoProviders });
        await sso.setup();
      }

      const accessLog =
        this.config.accessLog ??
        new FileRestrictedAccessLog(defaultRestrictedAccessLogFile(this.config.dataDir));

      // Authorisation. It follows the authentication service's setup because its first-run
      // backfill reads that service's event log. Every entity and service request acts through
      // the repository it hands out for the signed-in account.
      const rbac = new RbacService({ adapter, repository, cipher, accessLog });
      await rbac.setup();
      this.rbac = rbac;
      const approvals = new ApprovalEngine({ adapter });

      // The automatic backup runs last, once the hub is fully initialised, so the archive it
      // writes holds the sync metadata and the auth tables rather than a half-built database.
      const backup = await this.openBackups(adapter, repository, cipher);
      this.backupService = backup;
      if (backup) await this.startBackups(backup);

      const health = new HealthService({
        adapter,
        databaseFile: this.databaseFile,
        sync,
        ...(backup ? { backup } : {}),
        integrations: () => this.integrations(auth),
      });
      this.healthService = health;

      const router = createHubRouter({
        rbac,
        approvals,
        sync,
        auth,
        health,
        sequences: this.sequences,
        ...(sso ? { sso } : {}),
        ...(this.config.rateLimits === false ? {} : { rateLimiter: new RateLimiter() }),
        ...(backup ? { backup } : {}),
      });
      router.add('GET', '/health', () => ({ body: this.getStatus() }), { auth: 'none' });
      // A client has to read the descriptor before it can sign in, so this one is public too.
      router.add('GET', '/.well-known/schoolpilot-hub', () => ({ body: this.getDescriptor() }), {
        auth: 'none',
      });

      const tls = this.config.tls;
      const server = tls
        ? createHttpsServer({ cert: tls.cert, key: tls.key }, (req, res) =>
            this.handleRequest(router, req, res)
          )
        : createHttpServer((req, res) => this.handleRequest(router, req, res));
      this.httpServer = server;
      await this.listen(server);

      this.state.running = true;
      this.state.startTime = new Date();

      await this.advertise();
      console.log(
        `LAN Server listening on ${this.config.tls ? 'https' : 'http'}://${this.config.host}:${this.address?.port}`
      );
      if (this.tlsFingerprint) console.log(`TLS fingerprint (SHA-256): ${this.tlsFingerprint}`);
      if (this.discoveryStatus?.running) {
        console.log(
          `Discovery: ${this.discoveryStatus.hostName} (${this.discoveryStatus.service}) on port ${this.discoveryStatus.port}`
        );
      }
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
      protocol: this.config.tls ? 'https' : 'http',
      tlsFingerprint: this.tlsFingerprint,
      discovery: this.discoveryStatus,
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

  /**
   * What a client that found the hub needs to identify and trust it.
   *
   * Served at `/.well-known/schoolpilot-hub`: the mDNS name may be the only thing a client knows,
   * and this is how it confirms what answered before it pins the certificate.
   */
  getDescriptor(): {
    service: string;
    protocolVersion: number;
    protocol: 'http' | 'https';
    port: number;
    instanceName: string;
    hostName: string;
    addresses: readonly string[];
    tlsFingerprint: string | null;
    startedAt: string | null;
  } {
    const discovery = this.discoveryStatus;
    return {
      service: SCHOOLPILOT_SERVICE,
      protocolVersion: HUB_PROTOCOL_VERSION,
      protocol: this.config.tls ? 'https' : 'http',
      port: this.address?.port ?? this.config.port,
      instanceName: discovery?.instanceName ?? this.config.discovery?.instanceName ?? 'schoolpilot',
      hostName: discovery?.hostName ?? '',
      addresses: discovery?.addresses ?? lanIpv4Addresses(),
      tlsFingerprint: this.tlsFingerprint,
      startedAt: this.state.startTime?.toISOString() ?? null,
    };
  }

  /**
   * The outbound integrations the hub actually has, read on every report.
   *
   * Only what is configured is reported: a hub with no SMS or mail channel says so rather than
   * listing a channel that does not exist, and the mDNS advertisement appears only when asked for.
   */
  private integrations(auth: AuthenticationService): readonly HubIntegration[] {
    const checkedAt = new Date().toISOString();
    const entries: HubIntegration[] = [
      {
        id: 'delivery',
        name: 'Guardian and staff delivery',
        level: auth.deliveryAvailable ? 'ok' : 'attention',
        detail: auth.deliveryAvailable
          ? 'a channel can deliver one-time codes and password-reset links'
          : 'no SMS or mail channel is configured, so codes and reset links cannot be sent',
        checkedAt,
      },
    ];

    const discovery = this.discoveryStatus;
    if (discovery) {
      entries.push({
        id: 'discovery',
        name: 'LAN discovery',
        level: discovery.running ? 'ok' : 'attention',
        detail: discovery.running
          ? `advertising ${discovery.hostName} on the LAN`
          : `the advertisement is not running${discovery.error ? `: ${discovery.error}` : ''}`,
        checkedAt,
      });
    }

    return entries;
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

  /** The health service the hub serves; null before start and after stop. */
  getHealthService(): HealthService | null {
    return this.healthService;
  }

  /** The hub's sequences, which hand out the number blocks devices number from. */
  getSequences(): SequenceService | null {
    return this.sequences;
  }

  /** The authorisation layer the hub serves; null before start and after stop. */
  getAuthorisation(): RbacService | null {
    return this.rbac;
  }

  /** The authentication service the hub serves; null before start and after stop. */
  getAuthentication(): AuthenticationService | null {
    return this.auth;
  }

  // ==================== Private Methods ====================

  /**
   * Publishes the hub over mDNS.
   *
   * A failure here never fails the start: a hub whose port 5353 is taken by another responder (the
   * one Windows runs, for instance) still serves every client that can reach it by name or address.
   */
  private async advertise(): Promise<void> {
    const options = this.config.discovery;
    if (options?.enabled !== true) return;

    const port = this.address?.port ?? this.config.port;
    const instanceName = options.instanceName ?? 'schoolpilot';
    const hostName = options.hostName ?? mdnsHostName(instanceName);
    const addresses = options.addresses ?? lanIpv4Addresses();
    const fingerprint = this.tlsFingerprint;

    const advertiser = new MdnsAdvertiser(
      advertisementFor({
        instanceName,
        hostName,
        port,
        addresses,
        tls: fingerprint !== null,
        ...(fingerprint ? { fingerprint: fingerprint.replace(/:/g, '').toLowerCase() } : {}),
      }),
      {
        ...(options.port !== undefined ? { port: options.port } : {}),
        onError: (message) => console.warn(message),
      }
    );

    this.discoveryStatus = {
      service: SCHOOLPILOT_SERVICE,
      instanceName,
      hostName,
      port: advertiser.port,
      addresses,
      running: false,
      error: null,
    };

    const started = await advertiser.start();
    this.advertiser = started ? advertiser : null;
    this.discoveryStatus = {
      ...this.discoveryStatus,
      running: started,
      error: advertiser.error,
    };
  }

  /** Opens the backup service; null when backups are disabled for this hub. */
  private async openBackups(
    adapter: SqliteAdapter,
    repository: Repository,
    cipher: FieldCipher
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
      cipher,
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
    if (this.config.securityHeaders !== false) {
      applySecurityHeaders(res);
    }

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
    const advertiser = this.advertiser;
    this.advertiser = null;
    if (advertiser) await advertiser.stop();
    this.discoveryStatus = null;

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
    this.healthService = null;
    this.syncNode = null;
    this.sequences = null;
    this.auth = null;
    this.rbac = null;
    if (adapter) await adapter.close();

    this.state.running = false;
    this.state.startTime = null;
  }
}

export default LANServer;
