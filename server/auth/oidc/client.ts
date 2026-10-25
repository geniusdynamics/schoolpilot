// ABOUTME: The generic OpenID Connect client: build the authorisation URL from the issuer's own
// ABOUTME: discovery document, exchange the code with PKCE at its token endpoint, and verify the ID
// ABOUTME: token it returns. Nothing here knows the name of any provider.

import { OidcError } from './errors';
import { OidcDiscovery } from './discovery';
import { OidcJwks } from './jwks';
import { verifyIdToken, type IdTokenClaims } from './idToken';
import { fetchWithTimeout } from './http';
import type { OidcProviderConfig } from './providerConfig';

/** The token endpoint's answer, as far as the hub uses it. */
export interface OidcTokenResponse {
  readonly idToken: string;
  readonly expiresIn: number | null;
}

export interface OidcClientOptions {
  readonly provider: OidcProviderConfig;
  readonly discovery?: OidcDiscovery;
  readonly jwks?: OidcJwks;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}

/**
 * One hub's client for one provider.
 *
 * The endpoints come from the issuer's discovery document rather than from configuration, so a
 * provider that moves an endpoint keeps working; the issuer string is the only thing an operator
 * has to get right. The client secret goes in the token request body and nowhere else: it is not
 * logged, not stored, and not returned.
 */
export class OidcClient {
  private readonly provider: OidcProviderConfig;
  private readonly discovery: OidcDiscovery;
  private readonly jwks: OidcJwks;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number | undefined;

  constructor(options: OidcClientOptions) {
    this.provider = options.provider;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.discovery = options.discovery ?? new OidcDiscovery({ fetch: this.fetchImpl });
    this.jwks = options.jwks ?? new OidcJwks({ fetch: this.fetchImpl });
    this.timeoutMs = options.timeoutMs;
  }

  /** The URL the browser is sent to, with PKCE, the state and the nonce. */
  async authorizationUrl(input: {
    readonly state: string;
    readonly nonce: string;
    readonly challenge: string;
  }): Promise<string> {
    const document = await this.discovery.documentFor(this.provider.issuer);
    const url = new URL(document.authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.provider.clientId);
    url.searchParams.set('redirect_uri', this.provider.redirectUri);
    url.searchParams.set('scope', this.provider.scopes.join(' '));
    url.searchParams.set('state', input.state);
    url.searchParams.set('nonce', input.nonce);
    url.searchParams.set('code_challenge', input.challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  /** Exchanges an authorisation code for tokens, proving possession of the PKCE verifier. */
  async exchangeCode(input: {
    readonly code: string;
    readonly verifier: string;
  }): Promise<OidcTokenResponse> {
    const document = await this.discovery.documentFor(this.provider.issuer);
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: this.provider.redirectUri,
      client_id: this.provider.clientId,
      client_secret: this.provider.clientSecret,
      code_verifier: input.verifier,
    });

    const response = await fetchWithTimeout(
      this.fetchImpl,
      document.tokenEndpoint,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: form.toString(),
        redirect: 'error',
      },
      this.timeoutMs
    );

    if (!response.ok) {
      // The provider's error code is useful to the operator; the body may carry a token, so only
      // the error field is ever read and it never reaches a log or a client.
      const code = await errorCodeOf(response);
      throw new OidcError(
        'token_exchange_failed',
        `the identity provider refused the authorisation code${code === null ? '' : ` (${code})`}`
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new OidcError('token_exchange_failed', 'the token endpoint did not answer with JSON');
    }

    const record = body as Record<string, unknown> | null;
    const idToken = record === null ? undefined : record.id_token;
    if (typeof idToken !== 'string' || idToken.length === 0) {
      throw new OidcError('token_exchange_failed', 'the token endpoint returned no ID token');
    }

    const expiresIn = record?.expires_in;
    return { idToken, expiresIn: typeof expiresIn === 'number' ? expiresIn : null };
  }

  /** Verifies an ID token against the issuer's published keys. */
  async verifyIdToken(token: string, nonce: string, now?: Date): Promise<IdTokenClaims> {
    const document = await this.discovery.documentFor(this.provider.issuer);
    const header = readHeader(token);
    const kid = typeof header.kid === 'string' ? header.kid : null;
    const alg = typeof header.alg === 'string' ? header.alg : '';
    const keys = await this.jwks.candidatesFor(document.jwksUri, kid, alg);

    return verifyIdToken({
      token,
      issuer: this.provider.issuer,
      clientId: this.provider.clientId,
      nonce,
      keys,
      ...(now === undefined ? {} : { now }),
    });
  }
}

function readHeader(token: string): Record<string, unknown> {
  try {
    const part = token.split('.')[0] ?? '';
    const value = JSON.parse(
      Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    ) as unknown;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function errorCodeOf(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as unknown;
    if (body === null || typeof body !== 'object') return null;
    const error = (body as Record<string, unknown>).error;
    return typeof error === 'string' ? error : null;
  } catch {
    return null;
  }
}
