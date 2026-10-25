// ABOUTME: The hub's single-sign-on service: it starts an authorisation against a configured
// ABOUTME: provider, completes it on the redirect with PKCE, resolves the verified identity to a hub
// ABOUTME: account, and ends in the same session a password sign-in would have issued.

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import type { Repository } from '@/data/repository';
import { generateUuidv7 } from '@/domain/ids';

import { AuthEventLog } from '../events';
import { decryptSecret, encryptSecret } from '../secrets';
import { hashToken } from '../tokens';
import type { AuthenticationService, LoginOutcome, SessionMeta } from '../service';
import { SsoAccountLinker, type SsoIdentity } from './accounts';
import { OidcClient } from './client';
import { OidcDiscovery } from './discovery';
import { OidcError } from './errors';
import type { IdTokenClaims } from './idToken';
import { OidcJwks } from './jwks';
import { newNonce, newPkce, newState } from './pkce';
import type { OidcProviderConfig } from './providerConfig';
import { applyOidcSchema } from './tables';

/** How long a started sign-in stays completable. */
export const DEFAULT_SSO_STATE_TTL_MS = 10 * 60_000;

/** What a sign-in page needs to offer a provider. Never the secret. */
export interface SsoProviderSummary {
  readonly id: string;
  readonly label: string;
  readonly issuer: string;
}

/** What starting a sign-in produces for the client. */
export interface SsoAuthorisation {
  readonly providerId: string;
  readonly authorizationUrl: string;
  /** The value the provider will echo back; the client hands it straight back on the redirect. */
  readonly state: string;
  readonly expiresAt: string;
}

export interface OidcSsoOptions {
  readonly adapter: SqliteAdapter;
  readonly repository: Repository;
  /** The service that mints the session a successful sign-in ends in. */
  readonly auth: AuthenticationService;
  /** The key the PKCE verifier is sealed with at rest. */
  readonly authKey: Buffer;
  readonly providers: readonly OidcProviderConfig[];
  readonly now?: () => Date;
  readonly fetch?: typeof fetch;
  readonly stateTtlMs?: number;
}

interface PendingLoginRow {
  readonly id: string;
  readonly provider: string;
  readonly issuer: string;
  readonly state_hash: string;
  readonly nonce: string;
  readonly code_verifier: string;
  readonly redirect_uri: string;
  readonly created_at: string;
  readonly expires_at: string;
  readonly consumed_at: string | null;
}

/**
 * Single sign-on for staff, over plain OpenID Connect.
 *
 * The flow is the authorisation code flow with PKCE. `beginLogin` reads the issuer's discovery
 * document, builds the authorisation URL and keeps the state, the nonce and the PKCE verifier —
 * the verifier sealed with the hub's own key, the state as its hash. `completeLogin` finds that
 * record, consumes it, exchanges the code, verifies the ID token against the issuer's published
 * keys, resolves the identity to a hub account through {@link SsoAccountLinker}, and asks the
 * authentication service for the session.
 *
 * The service is generic: a provider is a configuration, not a code path. Google Workspace and
 * Microsoft 365 are two of them, and so is any other issuer a hub is pointed at.
 */
export class OidcSsoService {
  private readonly adapter: SqliteAdapter;
  private readonly repository: Repository;
  private readonly auth: AuthenticationService;
  private readonly authKey: Buffer;
  private readonly clock: () => Date;
  private readonly stateTtlMs: number;
  private readonly providers = new Map<string, OidcProviderConfig>();
  private readonly clients = new Map<string, OidcClient>();
  private readonly discovery: OidcDiscovery;
  private readonly jwks: OidcJwks;
  private readonly events: AuthEventLog;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OidcSsoOptions) {
    this.adapter = options.adapter;
    this.repository = options.repository;
    this.auth = options.auth;
    this.authKey = options.authKey;
    this.clock = options.now ?? (() => new Date());
    this.stateTtlMs = options.stateTtlMs ?? DEFAULT_SSO_STATE_TTL_MS;
    this.fetchImpl = options.fetch ?? globalThis.fetch;

    for (const provider of options.providers) this.providers.set(provider.id, provider);

    // One discovery cache and one key cache, shared by every provider: a hub pointed at several
    // issuers fetches each document and each key set once.
    this.discovery = new OidcDiscovery({ fetch: this.fetchImpl });
    this.jwks = new OidcJwks({ fetch: this.fetchImpl });
    this.events = new AuthEventLog(this.adapter, { now: this.clock });
  }

  /** Creates the single-sign-on tables. Idempotent, so it runs on every start. */
  async setup(): Promise<void> {
    await applyOidcSchema(this.adapter);
  }

  /** The providers this hub offers, in configuration order. */
  listProviders(): SsoProviderSummary[] {
    return [...this.providers.values()].map((provider) => ({
      id: provider.id,
      label: provider.label,
      issuer: provider.issuer,
    }));
  }

  /**
   * Starts a sign-in.
   *
   * The client gets the URL to send the browser to and the state to expect back. Everything else
   * the flow needs — the nonce and the PKCE verifier — stays in the hub.
   */
  async beginLogin(input: { readonly providerId: string }): Promise<SsoAuthorisation> {
    const provider = this.provider(input.providerId);
    const client = this.client(provider);
    const pkce = newPkce();
    const state = newState();
    const nonce = newNonce();

    const authorizationUrl = await client.authorizationUrl({
      state,
      nonce,
      challenge: pkce.challenge,
    });

    const now = this.clock();
    const expiresAt = new Date(now.getTime() + this.stateTtlMs);
    await this.adapter.run(
      `INSERT INTO "auth_oidc_login"
         ("id", "provider", "issuer", "state_hash", "nonce", "code_verifier", "redirect_uri",
          "created_at", "expires_at", "consumed_at")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        generateUuidv7(),
        provider.id,
        provider.issuer,
        hashToken(state),
        nonce,
        // The verifier is a credential for this authorisation: it is sealed, never stored in the
        // clear, and never leaves the hub except to the token endpoint.
        encryptSecret(pkce.verifier, this.authKey),
        provider.redirectUri,
        now.toISOString(),
        expiresAt.toISOString(),
      ]
    );

    return {
      providerId: provider.id,
      authorizationUrl,
      state,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Completes a sign-in.
   *
   * The state is consumed before anything else happens, so a redirect can be replayed exactly
   * never — even if the exchange that follows fails, the client has to start again. Every refusal
   * on the way is recorded, without a token, a code or a secret in the record.
   */
  async completeLogin(input: {
    readonly providerId: string;
    readonly code: string;
    readonly state: string;
    readonly meta?: SessionMeta;
  }): Promise<LoginOutcome> {
    const provider = this.provider(input.providerId);
    const pending = await this.takePendingLogin(provider.id, input.state);

    if (typeof input.code !== 'string' || input.code.length === 0 || input.code.length > 4096) {
      throw new OidcError('invalid_state', 'this sign-in has no usable authorisation code');
    }

    const client = this.client(provider);
    const verifier = decryptSecret(pending.code_verifier, this.authKey);
    const tokens = await client.exchangeCode({ code: input.code, verifier });
    const claims = await client.verifyIdToken(tokens.idToken, pending.nonce, this.clock());

    const identity = identityOf(provider, claims);
    const linker = new SsoAccountLinker({
      adapter: this.adapter,
      repository: this.repository,
      provider,
      now: this.clock,
    });
    const link = await linker.resolve(identity);

    if (link.status === 'refused') {
      await this.events.append('sso_login_refused', {
        detail: { provider: provider.id, reason: link.code, email: identity.email },
      });
      throw new OidcError(link.code, link.message);
    }

    if (link.created) {
      await this.events.append('sso_account_linked', {
        actorId: link.userId,
        detail: { provider: provider.id, email: link.email },
      });
    }

    return this.auth.issueSessionForVerifiedAccount({
      userId: link.userId,
      kind: 'sso_login_succeeded',
      detail: { provider: provider.id, issuer: provider.issuer, email: link.email },
      ...(input.meta === undefined ? {} : { meta: input.meta }),
    });
  }

  /** Finds the provider a route named, or refuses. */
  private provider(providerId: string): OidcProviderConfig {
    const provider = this.providers.get(providerId);
    if (provider === undefined) {
      throw new OidcError('unknown_provider', `this hub has no single-sign-on provider ${providerId}`);
    }
    return provider;
  }

  private client(provider: OidcProviderConfig): OidcClient {
    const existing = this.clients.get(provider.id);
    if (existing !== undefined) return existing;

    const client = new OidcClient({
      provider,
      discovery: this.discovery,
      jwks: this.jwks,
      fetch: this.fetchImpl,
    });
    this.clients.set(provider.id, client);
    return client;
  }

  /**
   * Consumes the record of a started sign-in.
   *
   * The state is matched by its hash and consumed in one conditional update, so two callbacks
   * racing with the same redirect cannot both proceed. A state that belongs to another provider
   * is refused without being consumed: the sign-in it belongs to is still waiting to be finished.
   */
  private async takePendingLogin(providerId: string, state: string): Promise<PendingLoginRow> {
    if (typeof state !== 'string' || state.length === 0 || state.length > 512) {
      throw new OidcError('invalid_state', 'this sign-in response is not valid; sign in again');
    }

    const row = await this.adapter.get<PendingLoginRow>(
      'SELECT * FROM "auth_oidc_login" WHERE "state_hash" = ?',
      [hashToken(state)]
    );
    if (row === null || row.consumed_at !== null || row.provider !== providerId) {
      throw new OidcError('invalid_state', 'this sign-in response is not valid; sign in again');
    }

    if (Date.parse(row.expires_at) <= this.clock().getTime()) {
      await this.consumePending(row.id);
      throw new OidcError('invalid_state', 'this sign-in has taken too long; sign in again');
    }

    const consumed = await this.consumePending(row.id);
    if (!consumed) {
      throw new OidcError('invalid_state', 'this sign-in response is not valid; sign in again');
    }
    return row;
  }

  private async consumePending(id: string): Promise<boolean> {
    const result = await this.adapter.run(
      'UPDATE "auth_oidc_login" SET "consumed_at" = ? WHERE "id" = ? AND "consumed_at" IS NULL',
      [this.clock().toISOString(), id]
    );
    return result.changes > 0;
  }
}

/** The identity a verified ID token asserts, with the issuer taken from configuration. */
function identityOf(provider: OidcProviderConfig, claims: IdTokenClaims): SsoIdentity {
  return {
    providerId: provider.id,
    // The token's own `iss` was checked against the configured issuer, so the configured value is
    // what is recorded: nothing a provider sends is stored as the trust anchor.
    issuer: provider.issuer,
    subject: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : '',
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name: typeof claims.name === 'string' ? claims.name : null,
  };
}
