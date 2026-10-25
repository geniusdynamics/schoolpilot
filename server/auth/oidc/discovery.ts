// ABOUTME: The OpenID Connect discovery document of an issuer: fetched from
// ABOUTME: `<issuer>/.well-known/openid-configuration`, validated, and cached until it goes stale.

import { OidcError } from './errors';
import { assertSecureEndpoint, fetchWithTimeout } from './http';

/** The parts of a discovery document the hub uses. */
export interface OidcDiscoveryDocument {
  readonly issuer: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly jwksUri: string;
}

/** How long a discovery document is reused before it is fetched again. */
export const DISCOVERY_TTL_MS = 10 * 60_000;

export interface OidcDiscoveryOptions {
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
  readonly ttlMs?: number;
  readonly timeoutMs?: number;
}

/**
 * The discovery documents the hub has read.
 *
 * A document is trusted only when the issuer it names is the issuer the hub was configured with,
 * and only when the endpoints it names are ones the hub may call. Anything else is refused before
 * it can be used to send a client secret somewhere.
 */
export class OidcDiscovery {
  private readonly fetchImpl: typeof fetch;
  private readonly clock: () => Date;
  private readonly ttlMs: number;
  private readonly timeoutMs: number | undefined;
  private readonly cache = new Map<string, { document: OidcDiscoveryDocument; readAt: number }>();
  private readonly inFlight = new Map<string, Promise<OidcDiscoveryDocument>>();

  constructor(options: OidcDiscoveryOptions = {}) {
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.clock = options.now ?? (() => new Date());
    this.ttlMs = options.ttlMs ?? DISCOVERY_TTL_MS;
    this.timeoutMs = options.timeoutMs;
  }

  /** The document of an issuer, from the cache when it is still fresh. */
  async documentFor(issuer: string): Promise<OidcDiscoveryDocument> {
    const cached = this.cache.get(issuer);
    if (cached && this.clock().getTime() - cached.readAt < this.ttlMs) return cached.document;

    const running = this.inFlight.get(issuer);
    if (running) return running;

    const pending = this.read(issuer).finally(() => this.inFlight.delete(issuer));
    this.inFlight.set(issuer, pending);
    return pending;
  }

  private async read(issuer: string): Promise<OidcDiscoveryDocument> {
    const url = `${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`;
    const response = await fetchWithTimeout(
      this.fetchImpl,
      url,
      { headers: { accept: 'application/json' }, redirect: 'error' },
      this.timeoutMs
    );

    if (!response.ok) {
      throw new OidcError(
        'discovery_failed',
        `the identity provider answered ${response.status} for its discovery document`
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new OidcError('discovery_failed', 'the provider discovery document is not JSON');
    }

    const document = parseDiscovery(body, issuer);
    this.cache.set(issuer, { document, readAt: this.clock().getTime() });
    return document;
  }
}

/** Reads a discovery document, refusing one that does not describe the issuer that answered. */
export function parseDiscovery(body: unknown, issuer: string): OidcDiscoveryDocument {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new OidcError('discovery_failed', 'the provider discovery document is not an object');
  }
  const record = body as Record<string, unknown>;

  // The document has to confirm the issuer it was fetched for. Without this a provider reached by
  // one name could hand the hub the endpoints and keys of another.
  if (record.issuer !== issuer) {
    throw new OidcError(
      'discovery_failed',
      `the discovery document names the issuer ${String(record.issuer)}, not ${issuer}`
    );
  }

  return {
    issuer,
    authorizationEndpoint: assertSecureEndpoint(
      record.authorization_endpoint,
      'authorization endpoint'
    ),
    tokenEndpoint: assertSecureEndpoint(record.token_endpoint, 'token endpoint'),
    jwksUri: assertSecureEndpoint(record.jwks_uri, 'JWKS URI'),
  };
}
