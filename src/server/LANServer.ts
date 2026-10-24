// ABOUTME: The hub server of topology B: one Node HTTP server over the canonical SQLite database,
// ABOUTME: serving the typed repository and the unchanged domain services to clients on the school LAN.
// ABOUTME: It serves TLS when given a certificate, and advertises itself over mDNS when asked to.

import { mkdirSync } from 'node:fs';
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { X509Certificate } from 'node:crypto';
import path from 'node:path';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { createRepository, type Repository } from '@/data/repository';
import { ServerNode } from '@/data/sync';
import { ENTITY_NAMES } from '@/domain/schema';

import { AuthenticationService, loadOrCreateAuthKey, type AuthNotifier } from '../../server/auth';
import { createHubRouter } from '../../server/http/hubRouter';
import { sendJson, setCorsHeaders } from '../../server/http/http';
import type { Router } from '../../server/http/router';
import { advertisementFor, HUB_PROTOCOL_VERSION, MdnsAdvertiser, SCHOOLPILOT_SERVICE } from './discovery';
import { lanIpv4Addresses, mdnsHostName } from './network';

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
  /** The channel that delivers guardian one-time codes and password-reset links. */
  notifier?: AuthNotifier;
  /** The label an authenticator app shows beside an enrolment. */
  authIssuer?: string;
  /** The actor a write is stamped with when the request names none. */
  actor?: string;
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
 * TLS is served when a certificate pair is passed; `src/server/cli.ts` issues and stores one for a
 * LAN install. Discovery is opt-in per hub, and a hub whose mDNS port is taken still serves clients.
 */
export class LANServer {
  private config: LANServerConfig;
  private httpServer: Server | null = null;
  private adapter: SqliteAdapter | null = null;
  private repository: Repository | null = null;
  private syncNode: ServerNode | null = null;
  private auth: AuthenticationService | null = null;
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

      const router = createHubRouter({
        repository,
        sync,
        auth,
        ...(this.config.actor !== undefined ? { actor: this.config.actor } : {}),
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

  /** The repository the hub serves; null before start and after stop. */
  getRepository(): Repository | null {
    return this.repository;
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
    const advertiser = this.advertiser;
    this.advertiser = null;
    if (advertiser) await advertiser.stop();
    this.discoveryStatus = null;

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
    this.syncNode = null;
    this.auth = null;
    if (adapter) await adapter.close();

    this.state.running = false;
    this.state.startTime = null;
  }
}

export default LANServer;
