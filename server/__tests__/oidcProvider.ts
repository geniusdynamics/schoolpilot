// ABOUTME: A real OpenID Connect provider that runs inside the test process, so the hub's SSO flow
// ABOUTME: is exercised end to end against discovery, a JWKS, an authorisation endpoint that enforces
// ABOUTME: PKCE and a token endpoint that signs genuine RS256 ID tokens with a generated key.

import { createHash, generateKeyPairSync, randomUUID, sign as cryptoSign, type KeyObject } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

/** The identity the provider will assert on the next authorisation: who signed in at the provider. */
export interface ProviderIdentity {
  readonly sub: string;
  readonly email?: string;
  readonly email_verified?: boolean;
  readonly [claim: string]: unknown;
}

/** How the provider signs the ID token it issues. */
export type ProviderAlgorithm = 'RS256' | 'HS256' | 'none';

interface SigningKey {
  readonly kid: string;
  readonly privateKey: KeyObject;
  readonly publicJwk: Record<string, unknown>;
}

interface PendingCode {
  readonly code: string;
  readonly challenge: string;
  readonly method: string;
  readonly nonce: string;
  readonly redirectUri: string;
  readonly identity: ProviderIdentity;
  consumed: boolean;
}

/** What the token endpoint last received, so a test can prove what the hub actually sent. */
export interface TokenRequestRecord {
  readonly clientId: string | null;
  readonly clientSecret: string | null;
  readonly code: string | null;
  readonly codeVerifier: string | null;
  readonly redirectUri: string | null;
  readonly grantType: string | null;
}

export interface LocalOidcProviderOptions {
  readonly clientId?: string;
  readonly clientSecret?: string;
}

const DEFAULT_CLIENT_ID = 'hub-client-id';
const DEFAULT_CLIENT_SECRET = 'hub-client-secret';

/**
 * A local OIDC provider.
 *
 * It is not a stub: it serves a discovery document, publishes a JWKS, enforces the
 * authorisation-code flow with PKCE (S256) and signs real ID tokens. A test drives it exactly
 * as a browser would — ask for the authorisation URL, follow the redirect, hand the code back —
 * so the hub's discovery, JWKS, PKCE and ID-token verification all run for real.
 */
export class LocalOidcProvider {
  readonly clientId: string;
  readonly clientSecret: string;

  /** Who the provider will claim signed in. A test sets this before authorising. */
  identity: ProviderIdentity = {
    sub: 'provider-subject-1',
    email: 'grace.wekesa@mwangaza.ac.ke',
    email_verified: true,
    name: 'Grace Wekesa',
  };

  /** Claims merged into the ID token, applied last, so a test can forge a bad one. */
  claimsOverride: Record<string, unknown> = {};

  /** The algorithm the ID token is signed with. `none` produces an unsigned token. */
  algorithm: ProviderAlgorithm = 'RS256';

  /** A key id to sign with that is deliberately absent from the JWKS. */
  signWithUnpublishedKey = false;

  /** The last token request the endpoint received. */
  lastTokenRequest: TokenRequestRecord | null = null;

  /** Codes the token endpoint refused, with the reason it gave. */
  readonly refusedExchanges: string[] = [];

  private server: http.Server | null = null;
  private port = 0;
  private keys: SigningKey[] = [this.generateKey()];
  private readonly codes = new Map<string, PendingCode>();

  constructor(options: LocalOidcProviderOptions = {}) {
    this.clientId = options.clientId ?? DEFAULT_CLIENT_ID;
    this.clientSecret = options.clientSecret ?? DEFAULT_CLIENT_SECRET;
  }

  get issuer(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  get jwksUri(): string {
    return `${this.issuer}/jwks`;
  }

  get discoveryUrl(): string {
    return `${this.issuer}/.well-known/openid-configuration`;
  }

  async start(): Promise<void> {
    if (this.server) return;
    this.server = http.createServer((req, res) => {
      void this.handle(req, res);
    });
    await new Promise<void>((resolve) => this.server?.listen(0, '127.0.0.1', resolve));
    this.port = (this.server.address() as AddressInfo).port;
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = null;
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  /**
   * Replaces the published signing key with a fresh one.
   *
   * A token the hub receives afterwards carries a key id its cached JWKS has never seen, which
   * is the rotation the hub has to survive by refetching.
   */
  rotateKeys(): void {
    this.keys = [this.generateKey()];
  }

  /** The key ids the JWKS currently publishes. */
  get publishedKeyIds(): readonly string[] {
    return this.keys.map((key) => key.kid);
  }

  private generateKey(): SigningKey {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    return {
      kid: randomUUID(),
      privateKey,
      publicJwk: {
        ...(publicKey.export({ format: 'jwk' }) as Record<string, unknown>),
        use: 'sig',
        alg: 'RS256',
      },
    };
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', this.issuer);
    if (url.pathname === '/.well-known/openid-configuration') return this.discovery(res);
    if (url.pathname === '/jwks') return this.jwks(res);
    if (url.pathname === '/authorize') return this.authorize(url, res);
    if (url.pathname === '/token' && req.method === 'POST') return this.token(req, res);
    this.json(res, 404, { error: 'not_found' });
  }

  private discovery(res: http.ServerResponse): void {
    this.json(res, 200, {
      issuer: this.issuer,
      authorization_endpoint: `${this.issuer}/authorize`,
      token_endpoint: `${this.issuer}/token`,
      jwks_uri: this.jwksUri,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: ['openid', 'email', 'profile'],
    });
  }

  private jwks(res: http.ServerResponse): void {
    this.json(res, 200, {
      keys: this.keys.map((key) => ({ ...key.publicJwk, kid: key.kid })),
    });
  }

  private authorize(url: URL, res: http.ServerResponse): void {
    const responseType = url.searchParams.get('response_type');
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state');
    const nonce = url.searchParams.get('nonce');
    const challenge = url.searchParams.get('code_challenge');
    const method = url.searchParams.get('code_challenge_method');
    const scope = url.searchParams.get('scope') ?? '';

    if (responseType !== 'code') return this.json(res, 400, { error: 'unsupported_response_type' });
    if (clientId !== this.clientId) return this.json(res, 400, { error: 'invalid_client' });
    if (!redirectUri) return this.json(res, 400, { error: 'invalid_request', detail: 'redirect_uri' });
    if (!state) return this.json(res, 400, { error: 'invalid_request', detail: 'state' });
    if (!nonce) return this.json(res, 400, { error: 'invalid_request', detail: 'nonce' });
    if (!scope.split(' ').includes('openid')) {
      return this.json(res, 400, { error: 'invalid_scope' });
    }
    // PKCE is mandatory here, exactly as the hub has to send it.
    if (!challenge) return this.json(res, 400, { error: 'invalid_request', detail: 'code_challenge' });
    if (method !== 'S256') {
      return this.json(res, 400, { error: 'invalid_request', detail: 'code_challenge_method' });
    }

    const code = `code-${randomUUID()}`;
    this.codes.set(code, {
      code,
      challenge,
      method,
      nonce,
      redirectUri,
      identity: { ...this.identity },
      consumed: false,
    });

    const location = new URL(redirectUri);
    location.searchParams.set('code', code);
    location.searchParams.set('state', state);
    res.writeHead(302, { location: location.toString() });
    res.end();
  }

  private async token(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await readBody(req);
    const params = new URLSearchParams(body);
    this.lastTokenRequest = {
      clientId: params.get('client_id'),
      clientSecret: params.get('client_secret'),
      code: params.get('code'),
      codeVerifier: params.get('code_verifier'),
      redirectUri: params.get('redirect_uri'),
      grantType: params.get('grant_type'),
    };

    const refuse = (error: string, detail?: string): void => {
      this.refusedExchanges.push(detail === undefined ? error : `${error}:${detail}`);
      this.json(res, 400, { error, ...(detail === undefined ? {} : { error_description: detail }) });
    };

    if (params.get('grant_type') !== 'authorization_code') return refuse('unsupported_grant_type');
    if (params.get('client_id') !== this.clientId) return refuse('invalid_client');
    if (params.get('client_secret') !== this.clientSecret) return refuse('invalid_client', 'secret');

    const code = params.get('code');
    if (code === null) return refuse('invalid_request', 'code');
    const pending = this.codes.get(code);
    if (!pending) return refuse('invalid_grant', 'code');
    if (pending.consumed) return refuse('invalid_grant', 'replayed');

    if (params.get('redirect_uri') !== pending.redirectUri) {
      return refuse('invalid_grant', 'redirect_uri');
    }

    const verifier = params.get('code_verifier');
    if (verifier === null) return refuse('invalid_grant', 'code_verifier');
    if (s256(verifier) !== pending.challenge) return refuse('invalid_grant', 'pkce');

    pending.consumed = true;

    this.json(res, 200, {
      access_token: `access-${randomUUID()}`,
      token_type: 'Bearer',
      expires_in: 3600,
      id_token: this.signIdToken(pending),
    });
  }

  /** Builds and signs the ID token for a completed authorisation. */
  signIdToken(pending: PendingCode): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: Record<string, unknown> = {
      iss: this.issuer,
      sub: pending.identity.sub,
      aud: this.clientId,
      exp: now + 300,
      iat: now,
      nonce: pending.nonce,
      ...pending.identity,
      ...this.claimsOverride,
    };
    for (const [key, value] of Object.entries(claims)) {
      if (value === undefined) delete claims[key];
    }

    if (this.algorithm === 'none') {
      return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.`;
    }
    if (this.algorithm === 'HS256') {
      const signature = cryptoSign('sha256', Buffer.from(`${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}`), this.clientSecret);
      return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}.${base64url(signature)}`;
    }

    const key = this.signWithUnpublishedKey ? this.generateKey() : this.keys[0] as SigningKey;
    const header = { alg: 'RS256', typ: 'JWT', kid: key.kid };
    const signingInput = `${encode(header)}.${encode(claims)}`;
    const signature = cryptoSign('sha256', Buffer.from(signingInput), key.privateKey);
    return `${signingInput}.${base64url(signature)}`;
  }

  private json(res: http.ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
    });
    res.end(payload);
  }
}

/** The S256 code challenge of a verifier, the transformation PKCE prescribes. */
export function s256(verifier: string): string {
  return base64url(createHash('sha256').update(verifier, 'ascii').digest());
}

/** A fresh PKCE verifier a test can use to stand in for a browser. */
export function newVerifier(): string {
  return base64url(Buffer.from(randomUUID() + randomUUID(), 'utf8'));
}

function encode(value: unknown): string {
  return base64url(Buffer.from(JSON.stringify(value), 'utf8'));
}

function base64url(value: Buffer): string {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  let text = '';
  req.setEncoding('utf8');
  for await (const chunk of req) text += chunk as string;
  return text;
}
