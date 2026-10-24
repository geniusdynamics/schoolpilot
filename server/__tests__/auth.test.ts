// ABOUTME: The authentication service proved against a real database: first run, lockout, session
// ABOUTME: expiry and revocation, TOTP replay, password reset and guardian phone OTP — successes and
// ABOUTME: refusals alike.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestContext, type TestContext } from '@/data/__tests__/harness';
import type { Id } from '@/domain/ids';

import {
  AuthenticationService,
  type AuthenticatedActor,
  type LoginOutcome,
  totpCode,
} from '../auth';
import { CaptureNotifier, SilentNotifier } from './helpers/authNotifier';

const ADMIN = 'director.wekesa';
const PASSWORD = 'mwangaza-2027-secret';
const NEW_PASSWORD = 'a-different-long-secret';

let context: TestContext;
let notifier: CaptureNotifier;
let auth: AuthenticationService;
let institutionId: Id<'institution'>;
let now: Date;

/** The clock every test shares, so a lockout or an expiry can be stepped over without waiting. */
const clock = (): Date => new Date(now);

beforeAll(async () => {
  context = await createTestContext({ entities: ['institution'] });
  institutionId = context.seed.idOf('institution');
  now = new Date('2027-03-01T08:00:00.000Z');

  notifier = new CaptureNotifier();
  auth = new AuthenticationService({
    adapter: context.adapter,
    repository: context.repository,
    authKey: Buffer.alloc(32, 9),
    notifier,
    now: clock,
    issuer: 'Mwangaza Secondary School',
  });
  await auth.setup();
}, 60000);

afterAll(async () => {
  await context?.close();
});

describe('first run', () => {
  it('creates the administrator once, stores a hash and keeps the token out of the database', async () => {
    expect(await auth.hasUsers()).toBe(false);

    const outcome = await auth.createFirstAdministrator({
      institutionId,
      username: ADMIN,
      password: PASSWORD,
    });
    expect(outcome.status).toBe('authenticated');
    if (outcome.status !== 'authenticated') return;

    expect(outcome.token).toMatch(/^sp1_[A-Za-z0-9_-]{43}$/);
    expect(outcome.user.username).toBe(ADMIN);
    expect(outcome.user.mfa).toBe(false);

    const [stored] = await context.adapter.all<{ password_hash: string }>(
      'SELECT "password_hash" FROM "user" WHERE "username" = ?',
      [ADMIN]
    );
    expect(stored?.password_hash).toMatch(/^pbkdf2-sha256\$600000\$/);
    expect(stored?.password_hash).not.toContain(PASSWORD);

    // The token is not in the database; only a hash of it is, so a stolen file holds no session.
    const sessions = await context.adapter.all<{ token_hash: string }>(
      'SELECT "token_hash" FROM "auth_session"'
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.token_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(sessions[0]?.token_hash).not.toContain(outcome.token.slice('sp1_'.length));

    expect(await auth.hasUsers()).toBe(true);
    await expect(
      auth.createFirstAdministrator({
        institutionId,
        username: 'second.admin',
        password: PASSWORD,
      })
    ).rejects.toMatchObject({ code: 'setup_complete' });
  }, 30000);

  it('refuses a weak password and an unknown institution', async () => {
    await expect(
      auth.createFirstAdministrator({
        institutionId,
        username: 'short.password',
        password: 'too-short',
      })
    ).rejects.toMatchObject({ code: 'weak_password' });

    await expect(
      auth.createFirstAdministrator({
        institutionId: '01930000-0000-7000-8000-00000000dead',
        username: 'elsewhere',
        password: PASSWORD,
      })
    ).rejects.toMatchObject({ code: 'not_found' });
  }, 30000);
});

describe('password sign-in', () => {
  it('answers a wrong password and an unknown user with the same refusal', async () => {
    const wrong = await refusalOf(
      auth.login({ username: ADMIN, password: 'not-the-password' })
    );
    const unknown = await refusalOf(
      auth.login({ username: 'nobody.here', password: 'not-the-password' })
    );

    expect(wrong.code).toBe('invalid_credentials');
    expect(unknown.code).toBe('invalid_credentials');
    expect(unknown.message).toBe(wrong.message);

    // The refusals are recorded, and neither says which account exists.
    const events = await context.adapter.all<{ kind: string }>(
      'SELECT "kind" FROM "auth_event" WHERE "kind" = ?',
      ['login_refused']
    );
    expect(events.length).toBeGreaterThanOrEqual(2);
  }, 30000);

  it('signs in, resolves the actor behind the token, and lets the actor manage its sessions', async () => {
    const first = await signIn();
    const second = await signIn();

    const actor = await auth.authenticate(second);
    expect(actor?.username).toBe(ADMIN);
    expect(actor?.institutionId).toBe(institutionId);
    expect(actor?.userId).toBe(await userIdOf(ADMIN));

    const sessions = await auth.listSessions(actor as AuthenticatedActor);
    const before = sessions.length;
    expect(before).toBeGreaterThanOrEqual(2);
    expect(sessions.every((session) => session.userId === actor?.userId)).toBe(true);

    // A token this hub never issued is not an identity, however well formed it looks.
    expect(await auth.authenticate(`sp1_${'A'.repeat(43)}`)).toBeNull();
    expect(await auth.authenticate('not-a-token')).toBeNull();

    expect(await auth.revokeOtherSessions(actor as AuthenticatedActor)).toBe(before - 1);
    expect(await auth.authenticate(first)).toBeNull();
    expect(await auth.authenticate(second)).not.toBeNull();
  }, 40000);

  it('expires an idle session and refuses a signed-out one', async () => {
    const idle = await signIn();
    const signedOut = await signIn();

    now = new Date(now.getTime() + 31 * 60_000);
    expect(await auth.authenticate(idle)).toBeNull();

    await auth.logout(signedOut);
    expect(await auth.authenticate(signedOut)).toBeNull();

    const [expired] = await context.adapter.all<{ revoked_reason: string }>(
      'SELECT "revoked_reason" FROM "auth_session" WHERE "revoked_at" IS NOT NULL AND "revoked_reason" = ?',
      ['idle_expiry']
    );
    expect(expired?.revoked_reason).toBe('idle_expiry');
  }, 40000);

  it('refuses a session that has outlived its absolute life even while it is in use', async () => {
    // A session that is touched constantly still ends when its absolute life does.
    const shortLived = new AuthenticationService({
      adapter: context.adapter,
      repository: context.repository,
      authKey: Buffer.alloc(32, 9),
      notifier,
      now: clock,
      session: { idleMs: 60 * 60_000, absoluteMs: 60_000 },
    });

    const outcome = await shortLived.login({ username: ADMIN, password: PASSWORD });
    expect(outcome.status).toBe('authenticated');
    if (outcome.status !== 'authenticated') return;

    now = new Date(now.getTime() + 61_000);
    expect(await shortLived.authenticate(outcome.token)).toBeNull();

    const [ended] = await context.adapter.all<{ revoked_reason: string }>(
      'SELECT "revoked_reason" FROM "auth_session" WHERE "revoked_at" IS NOT NULL AND "revoked_reason" = ?',
      ['absolute_expiry']
    );
    expect(ended?.revoked_reason).toBe('absolute_expiry');
  }, 40000);
});

describe('lockout', () => {
  it('locks after five failures, refuses the right password while locked, and recovers afterwards', async () => {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const refusal = await refusalOf(auth.login({ username: ADMIN, password: 'wrong-password' }));
      expect(refusal.code).toBe('invalid_credentials');
    }

    const locked = await refusalOf(auth.login({ username: ADMIN, password: 'wrong-password' }));
    expect(locked.code).toBe('account_locked');
    expect(locked.retryAfterSeconds).toBe(15 * 60);

    // The right password does not open a locked account.
    const stillLocked = await refusalOf(auth.login({ username: ADMIN, password: PASSWORD }));
    expect(stillLocked.code).toBe('account_locked');
    expect(stillLocked.retryAfterSeconds).toBeGreaterThan(0);

    now = new Date(now.getTime() + 16 * 60_000);
    const token = await signIn();
    expect(await auth.authenticate(token)).not.toBeNull();

    const rows = await context.adapter.all<{ key: string }>(
      'SELECT "key" FROM "auth_lockout" WHERE "key" = ?',
      [`password:${ADMIN}`]
    );
    expect(rows).toHaveLength(0);
  }, 40000);
});

describe('TOTP', () => {
  it('enrols an authenticator, then requires a code and refuses a replayed one', async () => {
    const actor = (await auth.authenticate(await signIn())) as AuthenticatedActor;

    const enrolment = await auth.startTotpEnrolment(actor);
    expect(enrolment.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(enrolment.uri).toContain('otpauth://totp/');
    expect(enrolment.uri).toContain(enrolment.secret);
    expect(enrolment.issuer).toBe('Mwangaza Secondary School');

    const confirmCode = totpCode(enrolment.secret, { at: now }).code;
    await expect(
      auth.confirmTotpEnrolment(actor, wrongCodeFor(confirmCode))
    ).rejects.toMatchObject({ code: 'invalid_code' });
    expect(await auth.confirmTotpEnrolment(actor, confirmCode)).toEqual({ enrolled: true });

    const [row] = await context.adapter.all<{ secret: string }>(
      'SELECT "secret" FROM "auth_totp" WHERE "user_id" = ?',
      [actor.userId]
    );
    expect(row?.secret).toMatch(/^v1\./);
    expect(row?.secret).not.toContain(enrolment.secret);

    // A password is no longer enough: the account now needs its second factor.
    const challenged = await auth.login({ username: ADMIN, password: PASSWORD });
    expect(challenged.status).toBe('mfa_required');
    if (challenged.status !== 'mfa_required') return;

    const replayed = await refusalOf(
      auth.completeTotpLogin({ challengeToken: challenged.challengeToken, code: confirmCode })
    );
    expect(replayed.code).toBe('invalid_code');

    now = new Date(now.getTime() + 30_000);
    const nextCode = totpCode(enrolment.secret, { at: now }).code;
    const signedIn = await auth.completeTotpLogin({
      challengeToken: challenged.challengeToken,
      code: nextCode,
    });
    expect(signedIn.status).toBe('authenticated');
    if (signedIn.status !== 'authenticated') return;
    expect(await auth.authenticate(signedIn.token)).not.toBeNull();

    // A challenge is single use, so the same code cannot be presented again.
    const reusedChallenge = await refusalOf(
      auth.completeTotpLogin({ challengeToken: challenged.challengeToken, code: nextCode })
    );
    expect(reusedChallenge.code).toBe('invalid_challenge');

    await auth.disableTotp(actor, PASSWORD);
    expect(await auth.login({ username: ADMIN, password: PASSWORD })).toMatchObject({
      status: 'authenticated',
    });
  }, 60000);
});

describe('password reset', () => {
  it('answers the same for a known and an unknown account, then resets once and revokes sessions', async () => {
    const token = await signIn();

    const unknown = await auth.requestPasswordReset({ username: 'nobody.here' });
    expect(unknown).toEqual({ status: 'sent' });
    expect(notifier.passwordResets).toHaveLength(0);

    const requested = await auth.requestPasswordReset({ username: ADMIN });
    expect(requested).toEqual({ status: 'sent' });
    expect(notifier.passwordResets).toHaveLength(1);

    const link = notifier.lastReset();
    expect(link.username).toBe(ADMIN);
    expect(link.token).toMatch(/^reset_[A-Za-z0-9_-]{43}$/);

    // Only a hash of the token is stored.
    const [stored] = await context.adapter.all<{ token_hash: string }>(
      'SELECT "token_hash" FROM "auth_reset"'
    );
    expect(stored?.token_hash).toMatch(/^sha256:[0-9a-f]{64}$/);

    await expect(auth.resetPassword({ token: link.token, password: 'short' })).rejects.toMatchObject(
      { code: 'weak_password' }
    );

    expect(await auth.resetPassword({ token: link.token, password: NEW_PASSWORD })).toEqual({
      status: 'reset',
    });

    // The reset is the response to a suspected compromise, so the old sessions are gone.
    expect(await auth.authenticate(token)).toBeNull();
    await expect(auth.resetPassword({ token: link.token, password: NEW_PASSWORD })).rejects.toMatchObject(
      { code: 'invalid_token' }
    );
    await expect(auth.resetPassword({ token: 'reset_forged', password: NEW_PASSWORD })).rejects.toMatchObject(
      { code: 'invalid_token' }
    );

    await expect(auth.login({ username: ADMIN, password: PASSWORD })).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
    expect(await auth.login({ username: ADMIN, password: NEW_PASSWORD })).toMatchObject({
      status: 'authenticated',
    });
  }, 60000);
});

describe('guardian phone OTP', () => {
  it('signs a guardian in by phone and never by password', async () => {
    const guardian = await context.repository.create('guardian', {
      institution_id: institutionId,
      given_name: 'Grace',
      family_name: 'Njeri',
      name_order: 'given_first',
      gender: 'female',
      phones: [{ number: '+254700111222', label: 'mobile' }],
    });

    const sent = await auth.requestGuardianOtp({ phone: '+254 700 111 222' });
    expect(sent.status).toBe('sent');
    expect(sent.challengeToken).toMatch(/^challenge_/);

    const code = notifier.lastOtp().code;
    expect(code).toMatch(/^\d{6}$/);

    await expect(
      auth.verifyGuardianOtp({ challengeToken: sent.challengeToken, code: wrongCodeFor(code) })
    ).rejects.toMatchObject({ code: 'invalid_code' });

    const outcome = await auth.verifyGuardianOtp({
      challengeToken: sent.challengeToken,
      code,
    });
    expect(outcome.status).toBe('authenticated');
    if (outcome.status !== 'authenticated') return;

    expect(outcome.user.username).toBe(`guardian.${guardian.id}`);
    expect(outcome.user.personRef).toEqual({ type: 'guardian', id: guardian.id });
    expect(await auth.authenticate(outcome.token)).not.toBeNull();

    // A challenge is single use.
    await expect(
      auth.verifyGuardianOtp({ challengeToken: sent.challengeToken, code })
    ).rejects.toMatchObject({ code: 'invalid_challenge' });

    // The guardian account carries a sentinel password, so no password signs it in.
    await expect(
      auth.login({ username: `guardian.${guardian.id}`, password: 'anything-at-all' })
    ).rejects.toMatchObject({ code: 'invalid_credentials' });
  }, 40000);

  it('answers the same for a phone number no guardian holds', async () => {
    const answer = await auth.requestGuardianOtp({ phone: '+254799999999' });
    expect(answer.status).toBe('sent');
    expect(notifier.guardianOtps).toHaveLength(1);

    await expect(
      auth.verifyGuardianOtp({ challengeToken: answer.challengeToken, code: '123456' })
    ).rejects.toMatchObject({ code: 'invalid_challenge' });
  }, 30000);

  it('refuses to pretend when the deployment has no delivery channel', async () => {
    const silent = new AuthenticationService({
      adapter: context.adapter,
      repository: context.repository,
      authKey: Buffer.alloc(32, 9),
      notifier: new SilentNotifier(),
      now: clock,
    });

    expect(silent.deliveryAvailable).toBe(false);
    await expect(silent.requestGuardianOtp({ phone: '+254700111222' })).rejects.toMatchObject({
      code: 'delivery_unavailable',
    });
    await expect(silent.requestPasswordReset({ username: ADMIN })).rejects.toMatchObject({
      code: 'delivery_unavailable',
    });
  }, 30000);
});

// --------------------------------------------------------------------------- helpers

/** Signs in and returns the bearer token, refusing a sign-in that did not produce one. */
async function signIn(password: string = PASSWORD): Promise<string> {
  const outcome: LoginOutcome = await auth.login({ username: ADMIN, password });
  if (outcome.status !== 'authenticated') {
    throw new Error(`expected a session, got ${outcome.status}`);
  }
  return outcome.token;
}

/** The refusal a login produced, so a test can compare two of them. */
async function refusalOf(promise: Promise<unknown>): Promise<{
  readonly code: string;
  readonly message: string;
  readonly retryAfterSeconds?: number;
}> {
  try {
    await promise;
  } catch (error) {
    const refusal = error as { code?: unknown; message?: unknown; retryAfterSeconds?: unknown };
    if (typeof refusal.code !== 'string' || typeof refusal.message !== 'string') throw error;
    return {
      code: refusal.code,
      message: refusal.message,
      ...(typeof refusal.retryAfterSeconds === 'number'
        ? { retryAfterSeconds: refusal.retryAfterSeconds }
        : {}),
    };
  }
  throw new Error('expected the call to be refused');
}

async function userIdOf(username: string): Promise<string> {
  const [row] = await context.adapter.all<{ id: string }>(
    'SELECT "id" FROM "user" WHERE "username" = ?',
    [username]
  );
  if (!row) throw new Error(`no user ${username}`);
  return row.id;
}

/** A six-digit code that is not the right one. */
function wrongCodeFor(code: string): string {
  const shifted = (Number(code) + 1) % 1_000_000;
  return String(shifted).padStart(6, '0');
}
