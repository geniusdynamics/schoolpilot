// ABOUTME: How a hub's SSO providers are read from its environment: a provider with no credentials is
// ABOUTME: simply absent, and one that cannot work is a startup error, not a sign-in button that fails.

import { describe, expect, it } from 'vitest';

import { OidcError, ssoProvidersFromEnv } from '../auth/oidc';

const REDIRECT = 'https://hub.school.lan:3000/auth/sso/callback';

describe('ssoProvidersFromEnv', () => {
  it('offers no provider when nothing is configured', () => {
    expect(ssoProvidersFromEnv({})).toEqual([]);
  });

  it('reads Google from its client credentials, the shared redirect and the allowed domains', () => {
    const providers = ssoProvidersFromEnv({
      SCHOOLPILOT_SSO_GOOGLE_CLIENT_ID: 'id',
      SCHOOLPILOT_SSO_GOOGLE_CLIENT_SECRET: 'secret',
      SCHOOLPILOT_SSO_REDIRECT_URI: REDIRECT,
      SCHOOLPILOT_SSO_GOOGLE_ALLOWED_DOMAINS: 'Mwangaza.ac.ke, staff.mwangaza.ac.ke',
    });

    expect(providers).toHaveLength(1);
    expect(providers[0]).toMatchObject({
      id: 'google',
      issuer: 'https://accounts.google.com',
      redirectUri: REDIRECT,
      allowedDomains: ['mwangaza.ac.ke', 'staff.mwangaza.ac.ke'],
    });
  });

  it('skips a provider that has a client id but no secret', () => {
    expect(
      ssoProvidersFromEnv({
        SCHOOLPILOT_SSO_GOOGLE_CLIENT_ID: 'id',
        SCHOOLPILOT_SSO_REDIRECT_URI: REDIRECT,
      })
    ).toEqual([]);
  });

  it('refuses to start a configured provider that has no redirect URI', () => {
    expect(() =>
      ssoProvidersFromEnv({
        SCHOOLPILOT_SSO_GOOGLE_CLIENT_ID: 'id',
        SCHOOLPILOT_SSO_GOOGLE_CLIENT_SECRET: 'secret',
      })
    ).toThrow(OidcError);
  });

  it('builds the Microsoft issuer from the school tenant', () => {
    const [microsoft] = ssoProvidersFromEnv({
      SCHOOLPILOT_SSO_MICROSOFT_CLIENT_ID: 'id',
      SCHOOLPILOT_SSO_MICROSOFT_CLIENT_SECRET: 'secret',
      SCHOOLPILOT_SSO_MICROSOFT_TENANT: 'mwangaza.onmicrosoft.com',
      SCHOOLPILOT_SSO_REDIRECT_URI: REDIRECT,
    });

    expect(microsoft?.issuer).toBe('https://login.microsoftonline.com/mwangaza.onmicrosoft.com/v2.0');
  });

  it('refuses a Microsoft provider with no tenant, because the common endpoint cannot be verified', () => {
    // The multi-tenant endpoint signs tokens whose issuer names the signer's own tenant, so a hub
    // that expects `.../common/v2.0` would refuse every login. Better to say so at start.
    expect(() =>
      ssoProvidersFromEnv({
        SCHOOLPILOT_SSO_MICROSOFT_CLIENT_ID: 'id',
        SCHOOLPILOT_SSO_MICROSOFT_CLIENT_SECRET: 'secret',
        SCHOOLPILOT_SSO_REDIRECT_URI: REDIRECT,
      })
    ).toThrow(/SCHOOLPILOT_SSO_MICROSOFT_TENANT/);
  });
});
