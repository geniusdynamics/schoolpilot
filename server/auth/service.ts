// ABOUTME: The hub's authentication service: first-run administrator, password sign-in with
// ABOUTME: lockout, TOTP for enrolled accounts, guardian phone OTP, password reset and the sessions
// ABOUTME: a request is authenticated by.

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import {
  RepositoryConflictError,
  type Repository,
  type RepositoryRow,
} from '@/data/repository';
import { asId, generateUuidv7 } from '@/domain/ids';

import { AuthError } from './errors';
import { AuthEventLog, type AuthEventKind } from './events';
import {
  DEFAULT_LOCKOUT_POLICY,
  LockoutStore,
  type LockoutPolicy,
} from './lockout';
import { UndeliverableNotifier, type AuthNotifier } from './notifier';
import {
  assertPasswordPolicy,
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from './passwords';
import { decryptSecret, encryptSecret } from './secrets';
import {
  DEFAULT_SESSION_POLICY,
  SessionStore,
  type SessionPolicy,
  type SessionSummary,
} from './sessions';
import { applyAuthSchema } from './tables';
import {
  hashCode,
  hashToken,
  isSessionToken,
  newOpaqueToken,
  numericCode,
  safeEqual,
} from './tokens';
import { generateTotpSecret, totpUri, verifyTotp } from './totp';

/** The password field of a guardian identity, which no password can ever match. */
const GUARDIAN_PASSWORD_SENTINEL = '!guardian-otp-only';

const OTP_KIND = 'guardian_otp';
const TOTP_LOGIN_KIND = 'totp_login';

const GENERIC_CREDENTIALS = 'the username or password is incorrect';
const LOCKED_MESSAGE = 'too many failed sign-in attempts; this account is locked for a while';

/** How a guardian one-time code behaves. */
export interface OtpPolicy {
  readonly ttlMs: number;
  readonly maxAttempts: number;
  readonly digits: number;
}

/** Five minutes and five guesses: long enough to receive an SMS, short enough to be useless later. */
export const DEFAULT_OTP_POLICY: OtpPolicy = {
  ttlMs: 5 * 60_000,
  maxAttempts: 5,
  digits: 6,
};

/** How a password-reset link behaves. */
export interface ResetPolicy {
  readonly ttlMs: number;
}

export const DEFAULT_RESET_POLICY: ResetPolicy = { ttlMs: 30 * 60_000 };

/** A person an account belongs to, when it belongs to one. */
export interface PersonReference {
  readonly type: 'staff' | 'guardian' | 'learner';
  readonly id: string;
}

/** An account as the client sees it: never the password hash. */
export interface AuthUserView {
  readonly id: string;
  readonly username: string;
  readonly institutionId: string;
  readonly personRef: PersonReference | null;
  readonly mfa: boolean;
}

/** Who a request is, once its bearer token has been verified. */
export interface AuthenticatedActor {
  readonly userId: string;
  readonly username: string;
  readonly institutionId: string;
  readonly sessionId: string;
  readonly mfa: boolean;
  readonly personRef: PersonReference | null;
}

/** What a sign-in produced: a session, or the second factor still to come. */
export type LoginOutcome =
  | {
      readonly status: 'authenticated';
      readonly token: string;
      readonly sessionId: string;
      readonly expiresAt: string;
      readonly user: AuthUserView;
    }
  | {
      readonly status: 'mfa_required';
      readonly challengeToken: string;
      readonly expiresAt: string;
      readonly user: AuthUserView;
    };

/** The device a session belongs to, as far as the hub can tell. */
export interface SessionMeta {
  readonly deviceLabel?: string;
  readonly peer?: string;
}

export interface AuthenticationOptions {
  readonly adapter: SqliteAdapter;
  /** The hub's repository, without an authorizer: the service reads and writes `user` rows. */
  readonly repository: Repository;
  /** The key that encrypts TOTP secrets at rest. */
  readonly authKey: Buffer;
  readonly notifier?: AuthNotifier;
  readonly now?: () => Date;
  /** The label an authenticator app shows, the school's name by convention. */
  readonly issuer?: string;
  readonly session?: Partial<SessionPolicy>;
  readonly lockout?: Partial<LockoutPolicy>;
  readonly otp?: Partial<OtpPolicy>;
  readonly reset?: Partial<ResetPolicy>;
  /** The steps either side of now a TOTP code is accepted in. */
  readonly totpWindow?: number;
}

interface ChallengeRow {
  readonly id: string;
  readonly kind: string;
  readonly subject_id: string;
  readonly token_hash: string;
  readonly code_hash: string | null;
  readonly attempts: number;
  readonly created_at: string;
  readonly expires_at: string;
  readonly consumed_at: string | null;
}

interface TotpRow {
  readonly user_id: string;
  readonly secret: string;
  readonly confirmed_at: string | null;
  readonly last_used_step: number | null;
  readonly created_at: string;
  readonly updated_at: string;
}

interface ResetRow {
  readonly id: string;
  readonly user_id: string;
  readonly token_hash: string;
  readonly created_at: string;
  readonly expires_at: string;
  readonly consumed_at: string | null;
}

/**
 * The authentication the hub serves.
 *
 * Identity is a `user` row; a password is a PBKDF2 hash in that row; a session is an opaque
 * token whose SHA-256 sits in `auth_session`. The service reads and writes identity through the
 * hub's own repository, so a password change and a last-sign-in stamp are ordinary audited
 * writes, and keeps its own deployment state — sessions, challenges, lockouts, events — in the
 * raw tables `applyAuthSchema` creates.
 *
 * Call `setup()` once before serving. Everything else assumes the tables exist.
 */
export class AuthenticationService {
  private readonly adapter: SqliteAdapter;
  private readonly repository: Repository;
  private readonly authKey: Buffer;
  private readonly notifier: AuthNotifier;
  private readonly clock: () => Date;
  private readonly issuer: string;
  private readonly otp: OtpPolicy;
  private readonly reset: ResetPolicy;
  private readonly totpWindow: number;
  private readonly lockouts: LockoutStore;
  private readonly sessions: SessionStore;
  private readonly events: AuthEventLog;

  constructor(options: AuthenticationOptions) {
    this.adapter = options.adapter;
    this.repository = options.repository;
    this.authKey = options.authKey;
    this.notifier = options.notifier ?? new UndeliverableNotifier();
    this.clock = options.now ?? (() => new Date());
    this.issuer = options.issuer ?? 'SchoolPilot';
    this.otp = { ...DEFAULT_OTP_POLICY, ...options.otp };
    this.reset = { ...DEFAULT_RESET_POLICY, ...options.reset };
    this.totpWindow = options.totpWindow ?? 1;

    const lockoutPolicy: LockoutPolicy = { ...DEFAULT_LOCKOUT_POLICY, ...options.lockout };
    const sessionPolicy: SessionPolicy = { ...DEFAULT_SESSION_POLICY, ...options.session };
    this.lockouts = new LockoutStore(this.adapter, {
      policy: lockoutPolicy,
      now: this.clock,
    });
    this.sessions = new SessionStore(this.adapter, {
      policy: sessionPolicy,
      now: this.clock,
    });
    this.events = new AuthEventLog(this.adapter, { now: this.clock });
  }

  /** Creates the authentication tables. Idempotent, so it runs on every start. */
  async setup(): Promise<void> {
    await applyAuthSchema(this.adapter);
  }

  /** True when this deployment has a channel that can deliver a code or a reset link. */
  get deliveryAvailable(): boolean {
    return this.notifier.available;
  }

  /** True when the hub already holds an account, deleted ones included. */
  async hasUsers(): Promise<boolean> {
    const page = await this.repository.list('user', { limit: 1, includeDeleted: true });
    return page.items.length > 0;
  }

  /**
   * Creates the first administrator of an empty hub.
   *
   * There are no default credentials: the operator names the account during first run, and
   * the endpoint refuses forever after. The check and the insert run in one transaction, so
   * two setups racing cannot both succeed.
   */
  async createFirstAdministrator(input: {
    readonly institutionId: string;
    readonly username: string;
    readonly password: string;
    readonly meta?: SessionMeta;
  }): Promise<LoginOutcome> {
    const username = normalizeNewUsername(input.username);
    assertPasswordPolicy(input.password, { username });

    const institution = await this.repository.get(
      'institution',
      asId<'institution'>(input.institutionId)
    );
    if (institution === null) {
      throw new AuthError('not_found', `no institution with id ${input.institutionId}`);
    }

    const passwordHash = hashPassword(input.password);
    const user = await this.repository.transaction(async () => {
      if (await this.hasUsers()) {
        throw new AuthError('setup_complete', 'this hub already has an administrator; sign in instead');
      }
      return this.repository.create(
        'user',
        {
          institution_id: institution.id,
          username,
          password_hash: passwordHash,
          status: 'active',
          mfa: false,
        },
        { origin: 'hub', reason: 'first administrator created' }
      );
    });

    await this.events.append('administrator_created', {
      actorId: user.id,
      detail: { username: user.username },
    });
    return this.issueSession(user, input.meta ?? {});
  }

  /**
   * Verifies a username and password.
   *
   * Every refusal is the same refusal, whether the account is unknown, the password is wrong
   * or the account is disabled, and an unknown username costs a real password verification so
   * the response time does not answer the question either. Repeated failures lock the username
   * for a growing duration.
   */
  async login(input: {
    readonly username: string;
    readonly password: string;
    readonly institutionId?: string;
    readonly meta?: SessionMeta;
  }): Promise<LoginOutcome> {
    const password = typeof input.password === 'string' ? input.password : '';
    const username = normalizeExistingUsername(input.username);

    if (username === null) {
      verifyAgainstDummy(password);
      throw new AuthError('invalid_credentials', GENERIC_CREDENTIALS);
    }

    const key = lockoutKey(username);
    const state = await this.lockouts.state(key);
    if (state.lockedUntil !== null) {
      await this.events.append('login_locked', {
        detail: { username, retryAfterSeconds: state.retryAfterSeconds },
      });
      throw new AuthError('account_locked', LOCKED_MESSAGE, {
        retryAfterSeconds: state.retryAfterSeconds,
      });
    }

    const user = await this.userByUsername(username, input.institutionId);
    if (user === null) {
      verifyAgainstDummy(password);
      return this.refuseAttempt(key, username, 'unknown_username', null);
    }
    if (user.status === 'disabled') {
      verifyAgainstDummy(password);
      return this.refuseAttempt(key, username, 'disabled_account', user.id);
    }
    if (!verifyPassword(password, user.password_hash)) {
      return this.refuseAttempt(key, username, 'wrong_password', user.id);
    }
    if (user.status === 'locked') {
      const locked = await this.lockouts.state(key);
      const retryAfterSeconds =
        locked.retryAfterSeconds > 0
          ? locked.retryAfterSeconds
          : Math.ceil(this.lockouts.currentPolicy.baseLockMs / 1000);
      await this.events.append('login_locked', {
        actorId: user.id,
        detail: { username, reason: 'account_status' },
      });
      throw new AuthError('account_locked', LOCKED_MESSAGE, { retryAfterSeconds });
    }

    // The password was right, so the failures stop counting and the escalation is forgotten.
    await this.lockouts.clear(key);

    if (user.mfa) return this.beginTotpLogin(user);
    return this.issueSession(user, input.meta ?? {});
  }

  /** Verifies the TOTP code a password sign-in asked for, and finishes the sign-in. */
  async completeTotpLogin(input: {
    readonly challengeToken: string;
    readonly code: string;
    readonly meta?: SessionMeta;
  }): Promise<LoginOutcome> {
    const token = typeof input.challengeToken === 'string' ? input.challengeToken : '';
    const challenge = await this.challengeByToken(token, TOTP_LOGIN_KIND);
    if (challenge === null || challenge.consumed_at !== null) {
      throw new AuthError('invalid_challenge', 'this sign-in challenge is not valid; sign in again');
    }
    if (Date.parse(challenge.expires_at) <= this.clock().getTime()) {
      throw new AuthError('challenge_expired', 'this sign-in challenge has expired; sign in again');
    }
    if (challenge.attempts >= this.otp.maxAttempts) {
      await this.consumeChallenge(challenge.id);
      throw new AuthError('invalid_challenge', 'this sign-in challenge has been used too often');
    }

    const user = await this.repository.get('user', asId<'user'>(challenge.subject_id));
    if (user === null || user.status !== 'active') {
      throw new AuthError('invalid_challenge', 'this sign-in challenge is not valid; sign in again');
    }

    const factor = await this.totpRow(user.id);
    if (factor === null || factor.confirmed_at === null) {
      throw new AuthError(
        'mfa_not_enrolled',
        'this account must use a one-time code, but no authenticator has been enrolled'
      );
    }

    const secret = decryptSecret(factor.secret, this.authKey);
    const verification = verifyTotp(secret, input.code, {
      at: this.clock(),
      window: this.totpWindow,
      lastUsedStep: factor.last_used_step,
    });

    if (!verification.valid) {
      await this.adapter.run(
        'UPDATE "auth_challenge" SET "attempts" = "attempts" + 1 WHERE "id" = ?',
        [challenge.id]
      );
      await this.events.append('totp_refused', {
        actorId: user.id,
        detail: { reason: verification.reason },
      });
      throw new AuthError('invalid_code', 'the authenticator code is not correct');
    }

    const now = this.clock().toISOString();
    await this.adapter.run(
      'UPDATE "auth_totp" SET "last_used_step" = ?, "updated_at" = ? WHERE "user_id" = ?',
      [verification.step, now, user.id]
    );
    await this.consumeChallenge(challenge.id);
    return this.issueSession(user, input.meta ?? {});
  }

  /**
   * Resolves the actor behind a bearer token.
   *
   * Returns null for a token that is not, was never, or is no longer a live session; a session
   * whose account has been disabled raises, so the caller can say why.
   */
  async authenticate(token: string): Promise<AuthenticatedActor | null> {
    if (typeof token !== 'string' || !isSessionToken(token)) return null;

    const record = await this.sessions.verify(token);
    if (record === null) return null;

    const user = await this.repository.get('user', asId<'user'>(record.userId));
    if (user === null || user.deleted_at) return null;
    if (user.status !== 'active') {
      throw new AuthError('account_disabled', 'this account is no longer allowed to sign in');
    }

    return {
      userId: user.id,
      username: user.username,
      institutionId: user.institution_id,
      sessionId: record.id,
      mfa: user.mfa,
      personRef: user.person_ref ?? null,
    };
  }

  /** Ends one session. Idempotent: a token that is already dead is simply gone. */
  async logout(token: string): Promise<void> {
    if (typeof token !== 'string') return;
    const record = await this.sessions.findByToken(token);
    if (record === null) return;
    await this.sessions.revoke(record.id, 'logout');
    await this.events.append('logout', {
      actorId: record.userId,
      detail: { sessionId: record.id },
    });
  }

  /** The live sessions of the requesting account. */
  async listSessions(actor: AuthenticatedActor): Promise<SessionSummary[]> {
    return this.sessions.listForUser(actor.userId);
  }

  /** Signs one device out. A session of another account is not found, not forbidden. */
  async revokeSession(actor: AuthenticatedActor, sessionId: string): Promise<void> {
    const record = await this.sessions.findById(sessionId);
    if (record === null || record.userId !== actor.userId) {
      throw new AuthError('not_found', `no session with id ${sessionId}`);
    }
    await this.sessions.revoke(record.id, 'revoked_by_user');
    await this.events.append('session_revoked', {
      actorId: actor.userId,
      detail: { sessionId: record.id },
    });
  }

  /** Signs every other device out, keeping the session that asked. */
  async revokeOtherSessions(actor: AuthenticatedActor): Promise<number> {
    const revoked = await this.sessions.revokeForUser(actor.userId, 'revoked_by_user', {
      exceptId: actor.sessionId,
    });
    await this.events.append('session_revoked_all', {
      actorId: actor.userId,
      detail: { revoked },
    });
    return revoked;
  }

  /**
   * Starts TOTP enrolment.
   *
   * The secret is returned once, for the QR code, and stored encrypted. Until `confirmTotp`
   * accepts a code from it, the account does not require a second factor.
   */
  async startTotpEnrolment(actor: AuthenticatedActor): Promise<{
    readonly secret: string;
    readonly uri: string;
    readonly issuer: string;
    readonly account: string;
  }> {
    const existing = await this.totpRow(actor.userId);
    if (existing !== null && existing.confirmed_at !== null) {
      throw new AuthError('already_enrolled', 'this account already has an authenticator');
    }

    const secret = generateTotpSecret();
    const now = this.clock().toISOString();
    await this.adapter.run(
      `INSERT INTO "auth_totp" ("user_id", "secret", "confirmed_at", "last_used_step", "created_at", "updated_at")
       VALUES (?, ?, NULL, NULL, ?, ?)
       ON CONFLICT("user_id") DO UPDATE SET
         "secret" = excluded."secret",
         "confirmed_at" = NULL,
         "last_used_step" = NULL,
         "updated_at" = excluded."updated_at"`,
      [actor.userId, encryptSecret(secret, this.authKey), now, now]
    );

    return {
      secret,
      uri: totpUri({ secret, account: actor.username, issuer: this.issuer }),
      issuer: this.issuer,
      account: actor.username,
    };
  }

  /** Confirms an enrolment with a code from the authenticator, and turns the factor on. */
  async confirmTotpEnrolment(
    actor: AuthenticatedActor,
    code: string
  ): Promise<{ readonly enrolled: true }> {
    const factor = await this.totpRow(actor.userId);
    if (factor === null) {
      throw new AuthError('invalid_code', 'there is no enrolment to confirm; start one first');
    }
    if (factor.confirmed_at !== null) {
      throw new AuthError('already_enrolled', 'this account already has an authenticator');
    }

    const secret = decryptSecret(factor.secret, this.authKey);
    const verification = verifyTotp(secret, code, {
      at: this.clock(),
      window: this.totpWindow,
      lastUsedStep: factor.last_used_step,
    });

    if (!verification.valid) {
      await this.events.append('totp_refused', {
        actorId: actor.userId,
        detail: { reason: verification.reason },
      });
      throw new AuthError('invalid_code', 'the authenticator code is not correct');
    }

    const now = this.clock().toISOString();
    await this.adapter.run(
      'UPDATE "auth_totp" SET "confirmed_at" = ?, "last_used_step" = ?, "updated_at" = ? WHERE "user_id" = ?',
      [now, verification.step, now, actor.userId]
    );
    await this.setMfa(actor.userId, true);
    await this.events.append('totp_enrolled', { actorId: actor.userId });
    return { enrolled: true };
  }

  /** Turns the factor off. The password is required: a borrowed session must not remove it. */
  async disableTotp(actor: AuthenticatedActor, password: string): Promise<void> {
    const user = await this.requireUser(actor.userId);
    if (!verifyPassword(typeof password === 'string' ? password : '', user.password_hash)) {
      throw new AuthError('invalid_credentials', GENERIC_CREDENTIALS);
    }

    await this.adapter.run('DELETE FROM "auth_totp" WHERE "user_id" = ?', [actor.userId]);
    await this.setMfa(actor.userId, false);
    await this.events.append('totp_disabled', { actorId: actor.userId });
  }

  /**
   * Asks for a sign-in code by phone, and always answers the same way.
   *
   * A phone number with no guardian behind it gets a challenge token that will never verify,
   * so the endpoint cannot be used to discover which parents a school has. A delivery that
   * fails after the number was found is recorded for the operator and still answers the same.
   */
  async requestGuardianOtp(input: {
    readonly phone: string;
    readonly institutionId?: string;
  }): Promise<{ readonly status: 'sent'; readonly challengeToken: string; readonly expiresAt: string }> {
    this.assertDeliveryAvailable();

    const now = this.clock();
    const expiresAt = new Date(now.getTime() + this.otp.ttlMs);
    const unanswered = () => ({
      status: 'sent' as const,
      challengeToken: newOpaqueToken('challenge'),
      expiresAt: expiresAt.toISOString(),
    });

    const phone = normalizePhone(input.phone);
    if (phone === null) return unanswered();

    const guardian = await this.guardianByPhone(phone, input.institutionId);
    if (guardian === null) return unanswered();

    const challenge = await this.createChallenge({
      kind: OTP_KIND,
      subjectId: guardian.id,
      ttlMs: this.otp.ttlMs,
      code: numericCode(this.otp.digits),
    });
    await this.events.append('guardian_otp_requested', {
      detail: { guardianId: guardian.id },
    });

    try {
      await this.notifier.sendGuardianOtp({
        phone,
        code: challenge.code as string,
        challengeToken: challenge.token,
        expiresAt: challenge.expiresAt,
        guardianId: guardian.id,
        institutionId: guardian.institution_id,
      });
    } catch (error) {
      await this.events.append('guardian_otp_undeliverable', {
        detail: { guardianId: guardian.id, reason: messageOf(error) },
      });
    }

    return {
      status: 'sent',
      challengeToken: challenge.token,
      expiresAt: challenge.expiresAt.toISOString(),
    };
  }

  /** Verifies a guardian's one-time code and signs the guardian in. */
  async verifyGuardianOtp(input: {
    readonly challengeToken: string;
    readonly code: string;
    readonly meta?: SessionMeta;
  }): Promise<LoginOutcome> {
    const token = typeof input.challengeToken === 'string' ? input.challengeToken : '';
    const code = typeof input.code === 'string' ? input.code.replace(/[\s-]/g, '') : '';

    const challenge = await this.challengeByToken(token, OTP_KIND);
    if (challenge === null || challenge.consumed_at !== null) {
      throw new AuthError('invalid_challenge', 'this sign-in code is not valid; request another');
    }
    if (Date.parse(challenge.expires_at) <= this.clock().getTime()) {
      throw new AuthError('challenge_expired', 'this sign-in code has expired; request another');
    }
    if (challenge.attempts >= this.otp.maxAttempts) {
      await this.consumeChallenge(challenge.id);
      throw new AuthError('invalid_challenge', 'this sign-in code has been used too often');
    }

    const expected = challenge.code_hash;
    const matches =
      expected !== null &&
      new RegExp(`^\\d{${this.otp.digits}}$`).test(code) &&
      safeEqual(expected, hashCode(token, code));

    if (!matches) {
      await this.adapter.run(
        'UPDATE "auth_challenge" SET "attempts" = "attempts" + 1 WHERE "id" = ?',
        [challenge.id]
      );
      await this.events.append('guardian_otp_refused', {
        detail: { challengeId: challenge.id },
      });
      throw new AuthError('invalid_code', 'the one-time code is not correct');
    }

    const guardian = await this.repository.get(
      'guardian',
      asId<'guardian'>(challenge.subject_id)
    );
    if (guardian === null) {
      throw new AuthError('invalid_challenge', 'this sign-in code is not valid; request another');
    }

    await this.consumeChallenge(challenge.id);
    const user = await this.guardianIdentity(guardian);
    await this.events.append('guardian_otp_verified', {
      actorId: user.id,
      detail: { guardianId: guardian.id },
    });
    return this.issueSession(user, input.meta ?? {});
  }

  /**
   * Starts a password reset, and always answers the same way.
   *
   * The response never says whether the account exists. The token is returned to nobody but
   * the notifier, only its hash is stored, and it is single use.
   */
  async requestPasswordReset(input: {
    readonly username: string;
    readonly institutionId?: string;
  }): Promise<{ readonly status: 'sent' }> {
    this.assertDeliveryAvailable();

    const username = normalizeExistingUsername(input.username);
    if (username === null) return { status: 'sent' };

    const user = await this.userByUsername(username, input.institutionId);
    if (user === null || user.status !== 'active') {
      await this.events.append('password_reset_requested', {
        detail: { found: false },
      });
      return { status: 'sent' };
    }

    const token = newOpaqueToken('reset');
    const now = this.clock();
    const expiresAt = new Date(now.getTime() + this.reset.ttlMs);
    await this.adapter.run(
      `INSERT INTO "auth_reset" ("id", "user_id", "token_hash", "created_at", "expires_at", "consumed_at")
       VALUES (?, ?, ?, ?, ?, NULL)`,
      [generateUuidv7(), user.id, hashToken(token), now.toISOString(), expiresAt.toISOString()]
    );
    await this.events.append('password_reset_requested', {
      actorId: user.id,
      detail: { username },
    });

    try {
      await this.notifier.sendPasswordReset({
        username,
        token,
        expiresAt,
        userId: user.id,
        institutionId: user.institution_id,
      });
    } catch (error) {
      await this.events.append('password_reset_undeliverable', {
        actorId: user.id,
        detail: { reason: messageOf(error) },
      });
    }

    return { status: 'sent' };
  }

  /**
   * Completes a password reset.
   *
   * The token is consumed by the same call, and every session of the account is revoked: a
   * reset is the response to a suspected compromise, so the token that asked for it may be the
   * stolen one.
   */
  async resetPassword(input: {
    readonly token: string;
    readonly password: string;
  }): Promise<{ readonly status: 'reset' }> {
    const token = typeof input.token === 'string' ? input.token : '';
    if (token.length === 0 || token.length > 300) {
      throw new AuthError('invalid_token', 'this password-reset link is not valid');
    }

    const row = await this.adapter.get<ResetRow>(
      'SELECT * FROM "auth_reset" WHERE "token_hash" = ?',
      [hashToken(token)]
    );
    if (row === null || row.consumed_at !== null) {
      throw new AuthError('invalid_token', 'this password-reset link is not valid');
    }
    if (Date.parse(row.expires_at) <= this.clock().getTime()) {
      throw new AuthError('invalid_token', 'this password-reset link has expired');
    }

    const user = await this.repository.get('user', asId<'user'>(row.user_id));
    if (user === null || user.deleted_at) {
      throw new AuthError('invalid_token', 'this password-reset link is not valid');
    }

    assertPasswordPolicy(input.password, { username: user.username });

    await this.repository.update(
      'user',
      user.id,
      { password_hash: hashPassword(input.password) },
      {
        expectedVersion: user.rowVersion,
        actor: user.id,
        origin: 'hub',
        reason: 'password reset',
      }
    );
    await this.adapter.run(
      'UPDATE "auth_reset" SET "consumed_at" = ? WHERE "id" = ? AND "consumed_at" IS NULL',
      [this.clock().toISOString(), row.id]
    );

    const revoked = await this.sessions.revokeForUser(user.id, 'password_reset');
    await this.events.append('password_reset_completed', {
      actorId: user.id,
      detail: { revokedSessions: revoked },
    });

    return { status: 'reset' };
  }

  // ------------------------------------------------------------------ internals

  private async refuseAttempt(
    key: string,
    username: string,
    reason: string,
    actorId: string | null
  ): Promise<never> {
    const state = await this.lockouts.recordFailure(key);
    await this.events.append('login_refused', {
      actorId,
      detail: {
        username,
        reason,
        failures: state.failures,
        locked: state.lockedUntil !== null,
      },
    });

    if (state.lockedUntil !== null) {
      throw new AuthError('account_locked', LOCKED_MESSAGE, {
        retryAfterSeconds: state.retryAfterSeconds,
      });
    }
    throw new AuthError('invalid_credentials', GENERIC_CREDENTIALS);
  }

  private async beginTotpLogin(user: RepositoryRow<'user'>): Promise<LoginOutcome> {
    const factor = await this.totpRow(user.id);
    if (factor === null || factor.confirmed_at === null) {
      throw new AuthError(
        'mfa_not_enrolled',
        'this account must use a one-time code, but no authenticator has been enrolled; an administrator must enrol one first'
      );
    }

    const challenge = await this.createChallenge({
      kind: TOTP_LOGIN_KIND,
      subjectId: user.id,
      ttlMs: this.otp.ttlMs,
    });
    await this.events.append('login_mfa_required', {
      actorId: user.id,
      detail: { username: user.username },
    });

    return {
      status: 'mfa_required',
      challengeToken: challenge.token,
      expiresAt: challenge.expiresAt.toISOString(),
      user: viewOf(user),
    };
  }

  private async issueSession(
    user: RepositoryRow<'user'>,
    meta: SessionMeta
  ): Promise<LoginOutcome> {
    const issued = await this.sessions.create({
      userId: user.id,
      ...(meta.deviceLabel !== undefined ? { deviceLabel: meta.deviceLabel } : {}),
      ...(meta.peer !== undefined ? { peer: meta.peer } : {}),
    });
    await this.touchLogin(user);
    await this.events.append('login_succeeded', {
      actorId: user.id,
      detail: { username: user.username, sessionId: issued.session.id },
    });

    return {
      status: 'authenticated',
      token: issued.token,
      sessionId: issued.session.id,
      expiresAt: issued.session.expiresAt,
      user: viewOf(user),
    };
  }

  /**
   * Stamps the last sign-in.
   *
   * A concurrent sign-in of the same account can move the row first; the row version then
   * refuses this write, and that is no reason to fail a sign-in that already succeeded.
   */
  private async touchLogin(user: RepositoryRow<'user'>): Promise<void> {
    try {
      await this.repository.update(
        'user',
        user.id,
        { last_login_at: this.clock().toISOString() },
        {
          expectedVersion: user.rowVersion,
          actor: user.id,
          origin: 'hub',
          reason: 'signed in',
        }
      );
    } catch (error) {
      if (error instanceof RepositoryConflictError) return;
      throw error;
    }
  }

  private async setMfa(userId: string, mfa: boolean): Promise<void> {
    const user = await this.requireUser(userId);
    if (user.mfa === mfa) return;
    await this.repository.update(
      'user',
      user.id,
      { mfa },
      {
        expectedVersion: user.rowVersion,
        actor: userId,
        origin: 'hub',
        reason: mfa ? 'authenticator enrolled' : 'authenticator removed',
      }
    );
  }

  private async requireUser(userId: string): Promise<RepositoryRow<'user'>> {
    const user = await this.repository.get('user', asId<'user'>(userId));
    if (user === null) throw new AuthError('not_found', `no user with id ${userId}`);
    return user;
  }

  private async userByUsername(
    username: string,
    institutionId?: string
  ): Promise<RepositoryRow<'user'> | null> {
    const page = await this.repository.list('user', {
      where:
        institutionId === undefined
          ? { username }
          : { username, institution_id: institutionId },
      limit: 2,
    });

    if (page.items.length > 1) {
      throw new AuthError(
        'institution_required',
        'more than one institution holds that username, so the request must name its institution'
      );
    }
    return page.items[0] ?? null;
  }

  private async guardianByPhone(
    phone: string,
    institutionId?: string
  ): Promise<RepositoryRow<'guardian'> | null> {
    const page = await this.repository.list('guardian', {
      ...(institutionId === undefined ? {} : { where: { institution_id: institutionId } }),
      conditions: { phones: { contains: phone } },
      limit: 20,
    });

    const matches = page.items.filter((guardian) =>
      (guardian.phones ?? []).some((entry) => entry.number === phone)
    );
    if (matches.length === 0) return null;

    const institutions = new Set(matches.map((guardian) => guardian.institution_id));
    if (institutions.size > 1) {
      throw new AuthError(
        'institution_required',
        'that phone number belongs to guardians of more than one institution'
      );
    }
    return matches[0] ?? null;
  }

  /**
   * The account behind a guardian, created the first time the guardian signs in.
   *
   * Its username is derived from the guardian id and its password field is a sentinel no
   * password matches, so the account can only be used through the phone factor.
   */
  private async guardianIdentity(
    guardian: RepositoryRow<'guardian'>
  ): Promise<RepositoryRow<'user'>> {
    const username = `guardian.${guardian.id}`;
    const existing = await this.userByUsername(username, guardian.institution_id);
    if (existing !== null) return existing;

    try {
      return await this.repository.create(
        'user',
        {
          institution_id: guardian.institution_id,
          username,
          password_hash: GUARDIAN_PASSWORD_SENTINEL,
          status: 'active',
          person_ref: { type: 'guardian', id: guardian.id },
          mfa: false,
        },
        { origin: 'hub', reason: 'guardian identity created by phone OTP' }
      );
    } catch (error) {
      // Two codes verified at once: the unique username refuses the second insert, and the
      // account the first one created is the one both should use.
      if (error instanceof RepositoryConflictError) {
        const raced = await this.userByUsername(username, guardian.institution_id);
        if (raced !== null) return raced;
      }
      throw error;
    }
  }

  private async createChallenge(input: {
    readonly kind: string;
    readonly subjectId: string;
    readonly ttlMs: number;
    readonly code?: string;
  }): Promise<{ readonly token: string; readonly code: string | null; readonly expiresAt: Date }> {
    const token = newOpaqueToken('challenge');
    const now = this.clock();
    const expiresAt = new Date(now.getTime() + input.ttlMs);

    await this.adapter.run(
      `INSERT INTO "auth_challenge"
         ("id", "kind", "subject_id", "token_hash", "code_hash", "attempts", "created_at", "expires_at", "consumed_at")
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL)`,
      [
        generateUuidv7(),
        input.kind,
        input.subjectId,
        hashToken(token),
        input.code === undefined ? null : hashCode(token, input.code),
        now.toISOString(),
        expiresAt.toISOString(),
      ]
    );

    return { token, code: input.code ?? null, expiresAt };
  }

  private async challengeByToken(token: string, kind: string): Promise<ChallengeRow | null> {
    if (token.length === 0 || token.length > 300) return null;
    return this.adapter.get<ChallengeRow>(
      'SELECT * FROM "auth_challenge" WHERE "token_hash" = ? AND "kind" = ?',
      [hashToken(token), kind]
    );
  }

  private async consumeChallenge(id: string): Promise<void> {
    await this.adapter.run(
      'UPDATE "auth_challenge" SET "consumed_at" = ? WHERE "id" = ? AND "consumed_at" IS NULL',
      [this.clock().toISOString(), id]
    );
  }

  private async totpRow(userId: string): Promise<TotpRow | null> {
    return this.adapter.get<TotpRow>('SELECT * FROM "auth_totp" WHERE "user_id" = ?', [userId]);
  }

  private assertDeliveryAvailable(): void {
    if (!this.notifier.available) {
      throw new AuthError(
        'delivery_unavailable',
        'this hub has no channel that can deliver that message'
      );
    }
  }
}

function viewOf(user: RepositoryRow<'user'>): AuthUserView {
  return {
    id: user.id,
    username: user.username,
    institutionId: user.institution_id,
    personRef: user.person_ref ?? null,
    mfa: user.mfa,
  };
}

function lockoutKey(username: string): string {
  return `password:${username.toLowerCase()}`;
}

/** A username as it is looked up: trimmed, and refused when it cannot be one. */
function normalizeExistingUsername(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  return value.length === 0 || value.length > 100 ? null : value;
}

/** A username as it is created: the same rule, plus the minimum length first-run needs. */
function normalizeNewUsername(input: unknown): string {
  const value = normalizeExistingUsername(input);
  if (value === null || value.length < 3) {
    throw new AuthError('invalid_username', 'the username must be 3 to 100 characters');
  }
  return value;
}

/** A phone number in E.164, or null when it is not one. */
function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{6,14}$/.test(value) ? value : null;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Re-exported so a caller can name the event kinds it reads without importing the store. */
export type { AuthEventKind };
