// ABOUTME: The hub's OIDC SSO for staff, exercised end to end against a real provider that runs in
// ABOUTME: this process: discovery, JWKS and rotation, PKCE, ID-token verification, the account-linking
// ABOUTME: rules that keep a stranger out, and the hub session a successful sign-in ends in.

// ABOUTME: The tests below never fake the provider. They drive it as a browser does — ask for the
// ABOUTME: authorisation URL, follow the redirect, hand the code back — so every leg of the flow runs.

import { randomBytes } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, TEST_ACTOR, type TestContext } from '@/data/__tests__/harness';

import { AuthEventLog, AuthenticationService, type LoginOutcome } from '../auth';
import {
  OidcSsoService,
  namedProviderConfig,
  type OidcErrorCode as SsoRefusalCode,
  type OidcProviderConfig,
} from '../auth/oidc';
import { LocalOidcProvider } from './oidcProvider';

const AUTH_KEY = randomBytes(32);
const REDIRECT_URI = 'http://127.0.0.1:5173/auth/sso/callback';
const STAFF_EMAIL = 'grace.wekesa@mwangaza.ac.ke';
const PROVIDER_ID = 'google';

let idp: LocalOidcProvider;
let context: TestContext;
let auth: AuthenticationService;
let sso: OidcSsoService;
let events: AuthEventLog;
let seededUserId: string;

beforeAll(async () => {
  idp = new LocalOidcProvider();
  await idp.start();
});

afterAll(async () => {
  await idp?.stop();
});

beforeEach(async () => {
  context = await createTestContext();
  auth = new AuthenticationService({
    adapter: context.adapter,
    repository: context.repository,
    authKey: AUTH_KEY,
  });
  await auth.setup();
  events = new AuthEventLog(context.adapter);

  // The seeded staff record carries no email, so the hub has nothing to match on until the school
  // records one. That is the row an SSO identity links to.
  const staffId = context.seed.idOf('staff');
  const staff = await context.repository.get('staff', staffId);
  await context.repository.update(
    'staff',
    staffId,
    { emails: [{ address: STAFF_EMAIL, label: 'work' }] },
    { expectedVersion: staff?.rowVersion ?? 0, actor: TEST_ACTOR, reason: 'test fixture' }
  );

  seededUserId = context.seed.idOf('user');

  idp.identity = {
    sub: 'provider-subject-1',
    email: STAFF_EMAIL,
    email_verified: true,
    name: 'Grace Wekesa',
  };
  idp.claimsOverride = {};
  idp.algorithm = 'RS256';
  idp.signWithUnpublishedKey = false;

  sso = new OidcSsoService({
    adapter: context.adapter,
    repository: context.repository,
    auth,
    authKey: AUTH_KEY,
    providers: [googleProvider()],
  });
  await sso.setup();
});

function googleProvider(overrides: Partial<OidcProviderConfig> = {}): OidcProviderConfig {
  return namedProviderConfig('google', {
    issuer: idp.issuer,
    clientId: idp.clientId,
    clientSecret: idp.clientSecret,
    redirectUri: REDIRECT_URI,
    allowedDomains: ['mwangaza.ac.ke'],
    ...overrides,
  });
}

/** Drives the browser half of the flow: ask, follow the redirect, hand the code back. */
async function signIn(
  service: OidcSsoService = sso,
  providerId: string = PROVIDER_ID
): Promise<LoginOutcome> {
  const started = await service.beginLogin({ providerId });
  const redirected = await fetch(started.authorizationUrl, { redirect: 'manual' });
  expect(redirected.status).toBe(302);
  const location = new URL(redirected.headers.get('location') as string);
  const code = location.searchParams.get('code');
  const state = location.searchParams.get('state');
  expect(code).toBeTruthy();
  expect(state).toBe(started.state);
  return service.completeLogin({ providerId, code: code as string, state: state as string });
}

/** The refusal code of a failed completion. */
async function refusalOf(run: () => Promise<unknown>): Promise<SsoRefusalCode> {
  try {
    await run();
  } catch (error) {
    return (error as { code?: SsoRefusalCode }).code ?? ('unknown' as SsoRefusalCode);
  }
  throw new Error('the flow was expected to be refused, but it succeeded');
}

describe('signing in over OIDC', () => {
  it('turns a Google Workspace sign-in into a real hub session', async () => {
    const outcome = await signIn();

    expect(outcome.status).toBe('authenticated');
    if (outcome.status !== 'authenticated') return;
    expect(outcome.token).toMatch(/^sp1_/);
    expect(outcome.user.id).toBe(seededUserId);

    // The token is a live hub session, not merely a string the service returned.
    const actor = await auth.authenticate(outcome.token);
    expect(actor?.userId).toBe(seededUserId);
    expect(actor?.sessionId).toBe(outcome.sessionId);
  });

  it('records the sign-in in the authentication trail without a token or a secret', async () => {
    await signIn();
    const recorded = await events.recent(20);
    const kinds = recorded.map((event) => event.kind);
    expect(kinds).toContain('sso_account_linked');
    expect(kinds).toContain('sso_login_succeeded');
    expect(kinds).toContain('login_succeeded');

    const serialised = JSON.stringify(recorded);
    expect(serialised).not.toContain(idp.clientSecret);
    expect(serialised).not.toContain('code_verifier');
    expect(serialised).not.toMatch(/sp1_/);
  });

  it('keeps the PKCE verifier sealed between the two legs of the flow', async () => {
    const started = await sso.beginLogin({ providerId: PROVIDER_ID });
    const row = await context.adapter.get<{ code_verifier: string }>(
      'SELECT "code_verifier" FROM "auth_oidc_login" WHERE "state_hash" IS NOT NULL'
    );
    expect(row).not.toBeNull();
    // What is stored is ciphertext this key wrote, never the verifier itself.
    expect(row?.code_verifier).toMatch(/^v1\./);

    await fetch(started.authorizationUrl, { redirect: 'manual' });
  });

  it('asks the provider for a code with PKCE, and the provider accepts the verifier', async () => {
    await signIn();
    expect(idp.lastTokenRequest?.codeVerifier).toBeTruthy();
    expect(idp.lastTokenRequest?.clientSecret).toBe(idp.clientSecret);
    expect(idp.refusedExchanges).toEqual([]);
  });

  it('offers the configured providers to a client that has not signed in', () => {
    expect(sso.listProviders()).toEqual([
      { id: 'google', label: 'Google Workspace', issuer: idp.issuer },
    ]);
  });
});

describe('the ID token', () => {
  it('is refused when it was minted for another nonce', async () => {
    idp.claimsOverride = { nonce: 'a-nonce-from-another-flow' };
    expect(await refusalOf(() => signIn())).toBe('invalid_id_token');
  });

  it('is refused when it was minted for another audience', async () => {
    idp.claimsOverride = { aud: 'another-client' };
    expect(await refusalOf(() => signIn())).toBe('invalid_id_token');
  });

  it('is refused when it came from another issuer', async () => {
    idp.claimsOverride = { iss: 'https://accounts.evil.example' };
    expect(await refusalOf(() => signIn())).toBe('invalid_id_token');
  });

  it('is refused when it has expired', async () => {
    idp.claimsOverride = { exp: Math.floor(Date.now() / 1000) - 60 };
    expect(await refusalOf(() => signIn())).toBe('invalid_id_token');
  });

  it('is refused when the JWKS does not publish the key that signed it', async () => {
    idp.signWithUnpublishedKey = true;
    expect(await refusalOf(() => signIn())).toBe('invalid_id_token');
  });

  it('is refused when it is unsigned', async () => {
    idp.algorithm = 'none';
    expect(await refusalOf(() => signIn())).toBe('invalid_id_token');
  });

  it('is refused when it is HMAC-signed with the client secret', async () => {
    idp.algorithm = 'HS256';
    expect(await refusalOf(() => signIn())).toBe('invalid_id_token');
  });

  it('is accepted after the provider rotates its signing key', async () => {
    const before = await signIn();
    expect(before.status).toBe('authenticated');

    idp.rotateKeys();
    const after = await signIn();
    expect(after.status).toBe('authenticated');
  });
});

describe('the authorisation state', () => {
  it('refuses a state the hub never issued', async () => {
    expect(
      await refusalOf(() => sso.completeLogin({ providerId: PROVIDER_ID, code: 'c', state: 'nope' }))
    ).toBe('invalid_state');
  });

  it('refuses a state that was already used', async () => {
    const started = await sso.beginLogin({ providerId: PROVIDER_ID });
    const redirected = await fetch(started.authorizationUrl, { redirect: 'manual' });
    const location = new URL(redirected.headers.get('location') as string);
    const code = location.searchParams.get('code') as string;

    const first = await sso.completeLogin({ providerId: PROVIDER_ID, code, state: started.state });
    expect(first.status).toBe('authenticated');

    expect(
      await refusalOf(() =>
        sso.completeLogin({ providerId: PROVIDER_ID, code, state: started.state })
      )
    ).toBe('invalid_state');
  });

  it('refuses a state that belongs to another provider', async () => {
    const microsoft = new OidcSsoService({
      adapter: context.adapter,
      repository: context.repository,
      auth,
      authKey: AUTH_KEY,
      providers: [
        googleProvider(),
        namedProviderConfig('microsoft', {
          issuer: idp.issuer,
          clientId: idp.clientId,
          clientSecret: idp.clientSecret,
          redirectUri: REDIRECT_URI,
        }),
      ],
    });
    await microsoft.setup();

    const started = await microsoft.beginLogin({ providerId: PROVIDER_ID });
    const redirected = await fetch(started.authorizationUrl, { redirect: 'manual' });
    const code = new URL(redirected.headers.get('location') as string).searchParams.get(
      'code'
    ) as string;

    expect(
      await refusalOf(() =>
        microsoft.completeLogin({ providerId: 'microsoft', code, state: started.state })
      )
    ).toBe('invalid_state');
  });
});

describe('account linking', () => {
  it('links the identity to the staff member whose recorded email matches', async () => {
    await signIn();
    const linked = await context.adapter.all<{ user_id: string; subject: string; email: string }>(
      'SELECT * FROM "auth_identity"'
    );
    expect(linked).toHaveLength(1);
    expect(linked[0]?.user_id).toBe(seededUserId);
    expect(linked[0]?.subject).toBe('provider-subject-1');
    expect(linked[0]?.email).toBe(STAFF_EMAIL);
  });

  it('links the identity to the account whose username is the email', async () => {
    // An address no staff record carries: the seeded staff member holds STAFF_EMAIL, and an account
    // whose username is that same address would be a second match, which the hub rightly refuses.
    const usernameEmail = 'registrar@mwangaza.ac.ke';
    const staffId = context.seed.idOf('staff');
    const created = await context.repository.create(
      'user',
      {
        institution_id: context.seed.idOf('institution'),
        username: usernameEmail,
        password_hash: '!sso-only',
        status: 'active',
        person_ref: { type: 'staff', id: staffId },
        mfa: false,
      },
      { origin: 'hub', reason: 'test fixture' }
    );
    idp.identity = { sub: 'username-subject', email: usernameEmail, email_verified: true };

    const outcome = await signIn();
    expect(outcome.status).toBe('authenticated');
    if (outcome.status !== 'authenticated') return;
    expect(outcome.user.id).toBe(created.id);
  });

  it('refuses a stranger and creates nothing', async () => {
    const usersBefore = (await context.repository.list('user', { limit: 500 })).total;
    idp.identity = {
      sub: 'stranger-subject',
      email: 'stranger@mwangaza.ac.ke',
      email_verified: true,
    };

    expect(await refusalOf(() => signIn())).toBe('no_account');

    const usersAfter = (await context.repository.list('user', { limit: 500 })).total;
    expect(usersAfter).toBe(usersBefore);
    const identities = await context.adapter.all('SELECT * FROM "auth_identity"');
    expect(identities).toHaveLength(0);

    const refused = (await events.recent(10)).filter((event) => event.kind === 'sso_login_refused');
    expect(refused).toHaveLength(1);
    expect(refused[0]?.detail?.reason).toBe('no_account');
  });

  it('refuses an identity whose email the provider has not verified', async () => {
    idp.identity = {
      sub: 'unverified-subject',
      email: STAFF_EMAIL,
      email_verified: false,
    };
    expect(await refusalOf(() => signIn())).toBe('email_unverified');
  });

  it('refuses an identity from outside the domains the hub allows', async () => {
    idp.identity = {
      sub: 'other-domain-subject',
      email: 'someone@gmail.com',
      email_verified: true,
    };
    expect(await refusalOf(() => signIn())).toBe('domain_not_allowed');
  });

  it('refuses a second identity for an account that is already linked', async () => {
    const first = await signIn();
    expect(first.status).toBe('authenticated');

    idp.identity = {
      sub: 'provider-subject-2',
      email: STAFF_EMAIL,
      email_verified: true,
    };
    expect(await refusalOf(() => signIn())).toBe('identity_conflict');

    const identities = await context.adapter.all('SELECT * FROM "auth_identity"');
    expect(identities).toHaveLength(1);
  });

  it('refuses an account that is not active', async () => {
    const user = await context.repository.get('user', context.seed.idOf('user'));
    if (!user) throw new Error('the seeded user was not found');
    await context.repository.update(
      'user',
      user.id,
      { status: 'disabled' },
      { expectedVersion: user.rowVersion, actor: TEST_ACTOR, reason: 'test fixture' }
    );

    expect(await refusalOf(() => signIn())).toBe('account_disabled');
  });

  it('refuses an account that belongs to a guardian rather than to staff', async () => {
    // The only way an address reaches a guardian's account is a username equal to it, and it must
    // be an address no staff record carries, or the staff match would be the one that answered.
    const guardianEmail = 'parent@mwangaza.ac.ke';
    const guardianId = context.seed.idOf('guardian');
    const guardianUser = await context.repository.create(
      'user',
      {
        institution_id: context.seed.idOf('institution'),
        username: guardianEmail,
        password_hash: '!guardian-otp-only',
        status: 'active',
        person_ref: { type: 'guardian', id: guardianId },
        mfa: false,
      },
      { origin: 'hub', reason: 'test fixture' }
    );

    idp.identity = { sub: 'guardian-subject', email: guardianEmail, email_verified: true };

    expect(await refusalOf(() => signIn())).toBe('not_staff');
    expect(guardianUser.id).toBeTruthy();
  });
});

describe('a hub that has just been installed', () => {
  it('never creates its first administrator from an SSO login', async () => {
    const empty = await createTestContext({ seed: false });
    try {
      const institution = await empty.repository.create(
        'institution',
        {
          name: 'New School',
          country: 'KE',
          ownership: 'private',
          gender_policy: 'mixed',
          boarding_policy: 'day',
          default_locale: 'en-KE',
          time_zone: 'Africa/Nairobi',
          base_currency: 'KES',
        },
        { origin: 'hub', reason: 'test fixture' }
      );

      const emptyAuth = new AuthenticationService({
        adapter: empty.adapter,
        repository: empty.repository,
        authKey: AUTH_KEY,
      });
      await emptyAuth.setup();

      const emptySso = new OidcSsoService({
        adapter: empty.adapter,
        repository: empty.repository,
        auth: emptyAuth,
        authKey: AUTH_KEY,
        providers: [
          namedProviderConfig('google', {
            issuer: idp.issuer,
            clientId: idp.clientId,
            clientSecret: idp.clientSecret,
            redirectUri: REDIRECT_URI,
          }),
        ],
      });
      await emptySso.setup();

      const started = await emptySso.beginLogin({ providerId: PROVIDER_ID });
      const redirected = await fetch(started.authorizationUrl, { redirect: 'manual' });
      const code = new URL(redirected.headers.get('location') as string).searchParams.get(
        'code'
      ) as string;

      let refused: SsoRefusalCode | null = null;
      try {
        await emptySso.completeLogin({ providerId: PROVIDER_ID, code, state: started.state });
      } catch (error) {
        refused = (error as { code?: SsoRefusalCode }).code ?? null;
      }
      expect(refused).toBe('no_account');

      const users = await empty.repository.list('user', { limit: 10 });
      expect(users.items).toHaveLength(0);
      expect(institution.id).toBeTruthy();
    } finally {
      await empty.close();
    }
  });
});
