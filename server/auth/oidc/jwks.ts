// ABOUTME: The JSON Web Key Set of an issuer: fetched, cached for a short while, and refetched the
// ABOUTME: moment a token arrives signed by a key the cache has never seen, which is key rotation.

import { createPublicKey, type KeyObject } from 'node:crypto';

import { OidcError } from './errors';
import { fetchWithTimeout } from './http';

/** How long a key set is reused before it is fetched again. */
export const JWKS_TTL_MS = 5 * 60_000;

/** The most keys a provider may publish before the hub stops believing the document. */
export const MAX_JWKS_KEYS = 64;

export interface OidcJwksOptions {
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
  readonly ttlMs?: number;
  readonly timeoutMs?: number;
}

interface PublishedKey {
  readonly kid: string | null;
  readonly alg: string | null;
  readonly key: KeyObject;
}

/**
 * The public keys of an issuer.
 *
 * A provider rotates its signing keys without warning, so a key id the cache does not hold is not
 * a refusal: it is the signal to fetch the set again and try once more. Only a second miss is a
 * refusal, and it is the same refusal whatever went wrong.
 */
export class OidcJwks {
  private readonly fetchImpl: typeof fetch;
  private readonly clock: () => Date;
  private readonly ttlMs: number;
  private readonly timeoutMs: number | undefined;
  private readonly cache = new Map<string, { keys: readonly PublishedKey[]; readAt: number }>();
  private readonly inFlight = new Map<string, Promise<readonly PublishedKey[]>>();

  constructor(options: OidcJwksOptions = {}) {
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.clock = options.now ?? (() => new Date());
    this.ttlMs = options.ttlMs ?? JWKS_TTL_MS;
    this.timeoutMs = options.timeoutMs;
  }

  /**
   * The keys that may have signed a token.
   *
   * With a key id, the keys that carry it. Without one, every key the set publishes whose
   * declared algorithm allows the token's — the caller verifies against each in turn, which is
   * what the specification intends for a provider that names no key.
   */
  async candidatesFor(
    jwksUri: string,
    kid: string | null,
    alg: string
  ): Promise<readonly KeyObject[]> {
    const cached = await this.keysFor(jwksUri, true);
    const fromCache = select(cached, kid, alg);
    if (fromCache.length > 0) return fromCache;

    // The key is not one this hub has seen. Providers rotate, so ask again before refusing.
    const fresh = await this.keysFor(jwksUri, false);
    const selected = select(fresh, kid, alg);
    if (selected.length === 0) {
      throw new OidcError(
        'invalid_id_token',
        'the identity provider published no key that could have signed this token'
      );
    }
    return selected;
  }

  private async keysFor(jwksUri: string, allowCache: boolean): Promise<readonly PublishedKey[]> {
    const cached = this.cache.get(jwksUri);
    if (allowCache && cached && this.clock().getTime() - cached.readAt < this.ttlMs) {
      return cached.keys;
    }

    const running = this.inFlight.get(jwksUri);
    if (running) return running;

    const pending = this.read(jwksUri).finally(() => this.inFlight.delete(jwksUri));
    this.inFlight.set(jwksUri, pending);
    return pending;
  }

  private async read(jwksUri: string): Promise<readonly PublishedKey[]> {
    const response = await fetchWithTimeout(
      this.fetchImpl,
      jwksUri,
      { headers: { accept: 'application/json' }, redirect: 'error' },
      this.timeoutMs
    );
    if (!response.ok) {
      throw new OidcError(
        'invalid_id_token',
        `the identity provider answered ${response.status} for its key set`
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new OidcError('invalid_id_token', 'the provider key set is not JSON');
    }

    const keys = parseJwks(body);
    this.cache.set(jwksUri, { keys, readAt: this.clock().getTime() });
    return keys;
  }
}

/** Reads a key set into public keys, ignoring the entries the hub cannot or must not use. */
export function parseJwks(body: unknown): readonly PublishedKey[] {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new OidcError('invalid_id_token', 'the provider key set is not an object');
  }
  const entries = (body as { keys?: unknown }).keys;
  if (!Array.isArray(entries)) {
    throw new OidcError('invalid_id_token', 'the provider key set holds no keys');
  }
  if (entries.length > MAX_JWKS_KEYS) {
    throw new OidcError(
      'invalid_id_token',
      `the provider key set publishes more than ${MAX_JWKS_KEYS} keys`
    );
  }

  const keys: PublishedKey[] = [];
  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const jwk = entry as Record<string, unknown>;
    const key = publicKeyOf(jwk);
    if (key === null) continue;
    keys.push({
      kid: typeof jwk.kid === 'string' ? jwk.kid : null,
      alg: typeof jwk.alg === 'string' ? jwk.alg : null,
      key,
    });
  }
  return keys;
}

function select(
  keys: readonly PublishedKey[],
  kid: string | null,
  alg: string
): readonly KeyObject[] {
  const usable = keys.filter((key) => key.alg === null || key.alg === alg);
  const matching = kid === null ? usable : usable.filter((key) => key.kid === kid);
  return matching.map((entry) => entry.key);
}

/** A public key from a JWK, or null when the entry is one the hub will not use. */
function publicKeyOf(jwk: Record<string, unknown>): KeyObject | null {
  // A key set may publish keys for other purposes; only signing keys are candidates.
  if (jwk.use !== undefined && jwk.use !== 'sig') return null;
  if (Array.isArray(jwk.key_ops) && !(jwk.key_ops as unknown[]).includes('verify')) return null;

  try {
    if (jwk.kty === 'RSA') {
      return createPublicKey({
        key: { kty: 'RSA', n: jwk.n, e: jwk.e } as unknown as JsonWebKey,
        format: 'jwk',
      });
    }
    if (jwk.kty === 'EC') {
      return createPublicKey({
        key: { kty: 'EC', crv: jwk.crv, x: jwk.x, y: jwk.y } as unknown as JsonWebKey,
        format: 'jwk',
      });
    }
  } catch {
    // A key the runtime cannot import is a key this hub cannot use; the others may still verify.
    return null;
  }
  return null;
}
