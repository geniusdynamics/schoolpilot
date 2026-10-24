// ABOUTME: The hub server of topology B: one Node HTTP server over the canonical SQLite database,
// ABOUTME: serving the typed repository and the unchanged domain services to clients on the school LAN.

import { mkdirSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { createRepository, type Repository } from '@/data/repository';
import { ENTITY_NAMES } from '@/domain/schema';

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

interface LANServerConfig {
  /** The directory the hub keeps its database and, later, its backups in. */
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
 * The hub is not yet authenticated: `x-actor` is trusted from the network until P4-C01 supplies
 * sessions, so it belongs on a trusted LAN. What the hub does own is its own hardening: restricted
 * columns are sealed at rest through a key it manages, every access to them is logged, the auth and
 * write surfaces are rate limited, and every response carries security headers. Real-time sync
 * (P4-A02), mDNS discovery and TLS (P4-D02) are later tasks; this skeleton is the HTTP surface they
 * extend.
 */
export class LANServer {
  private config: LANServerConfig;
  private httpServer: Server | null = null;
  private adapter: SqliteAdapter | null = null;
  private repository: Repository | null = null;
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

      const accessLog =
        this.config.accessLog ??
        new FileRestrictedAccessLog(defaultRestrictedAccessLogFile(this.config.dataDir));
      const router = createHubRouter({
        repository,
        accessLog,
        ...(this.config.actor !== undefined ? { actor: this.config.actor } : {}),
        ...(this.config.rateLimits === false ? {} : { rateLimiter: new RateLimiter() }),
      });
      router.add('GET', '/health', () => ({ body: this.getStatus() }));

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
    return {
      running: this.state.running,
      host: this.config.host ?? '0.0.0.0',
      port: this.address?.port ?? this.config.port,
      uptime: this.state.startTime ? Date.now() - this.state.startTime.getTime() : 0,
      databaseFile: this.databaseFile,
      entityCount: ENTITY_NAMES.length,
      startedAt: this.state.startTime?.toISOString() ?? null,
    };
  }

  /** The repository the hub serves; null before start and after stop. */
  getRepository(): Repository | null {
    return this.repository;
  }

  // ==================== Private Methods ====================

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
    if (adapter) await adapter.close();

    this.state.running = false;
    this.state.startTime = null;
  }
}

export default LANServer;
