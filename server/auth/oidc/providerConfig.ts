// ABOUTME: The per-hub configuration of an OIDC provider: issuer, client id, client secret, redirect
// ABOUTME: URI and allowed email domains, the two named presets, and the environment a hub reads them from.

import { OidcError } from './errors';

/** The two providers the platform names. The client itself is generic; these are presets. */
export type ProviderName = 'google' | 'microsoft';

/** What one provider of one hub needs to run the authorisation-code flow. */
export interface OidcProviderConfig {
  /** The id a client names in the route, e.g. `google`. */
  readonly id: string;
  /** The label a sign-in page shows. */
  readonly label: string;
  /** The issuer whose discovery document and ID tokens the hub trusts. */
  readonly issuer: string;
  readonly clientId: string;
  /** Never logged, never stored, never returned to a client. */
  readonly clientSecret: string;
  /** The URI registered with the provider; the authorisation code comes back to it. */
  readonly redirectUri: string;
  readonly scopes: readonly string[];
  /** The email domains an identity may come from; empty means any domain the account matches. */
  readonly allowedDomains: readonly string[];
}

/** The fields a caller supplies; the rest come from the preset. */
export interface OidcProviderInput {
  readonly id?: string;
  readonly label?: string;
  /** Defaults to the preset's issuer. */
  readonly issuer?: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly scopes?: readonly string[];
  readonly allowedDomains?: readonly string[];
}

interface ProviderPreset {
  readonly id: ProviderName;
  readonly label: string;
  readonly issuer: string;
  readonly scopes: readonly string[];
}

/**
 * What each named provider defaults to.
 *
 * Google Workspace answers discovery and signs tokens from `accounts.google.com`. Microsoft 365's
 * preset names the multi-tenant `common` endpoint for discovery only: it signs tokens whose issuer
 * is the signer's own tenant, so a hub must be given that tenant's issuer
 * (`SCHOOLPILOT_SSO_MICROSOFT_TENANT` does so from the environment, and refuses to start without
 * it). Neither provider is special-cased anywhere else: the hub speaks plain OIDC to whatever
 * issuer it is given.
 */
export const PROVIDER_PRESETS: Readonly<Record<ProviderName, ProviderPreset>> = {
  google: {
    id: 'google',
    label: 'Google Workspace',
    issuer: 'https://accounts.google.com',
    scopes: ['openid', 'email', 'profile'],
  },
  microsoft: {
    id: 'microsoft',
    label: 'Microsoft 365',
    issuer: 'https://login.microsoftonline.com/common/v2.0',
    scopes: ['openid', 'email', 'profile'],
  },
};

/** Builds a provider configuration from a named preset and the hub's own values. */
export function namedProviderConfig(
  name: ProviderName,
  input: OidcProviderInput
): OidcProviderConfig {
  const preset = PROVIDER_PRESETS[name];
  return {
    id: input.id ?? preset.id,
    label: input.label ?? preset.label,
    issuer: trimTrailingSlash(required(input.issuer ?? preset.issuer, 'issuer')),
    clientId: required(input.clientId, 'clientId'),
    clientSecret: required(input.clientSecret, 'clientSecret'),
    redirectUri: required(input.redirectUri, 'redirectUri'),
    scopes: input.scopes ?? preset.scopes,
    allowedDomains: normalizeDomains(input.allowedDomains ?? []),
  };
}

/** A configuration for an issuer that is not one of the named providers. */
export function oidcProviderConfig(input: OidcProviderInput): OidcProviderConfig {
  return {
    id: required(input.id ?? '', 'id'),
    label: input.label ?? input.id ?? 'Single sign-on',
    issuer: trimTrailingSlash(required(input.issuer ?? '', 'issuer')),
    clientId: required(input.clientId, 'clientId'),
    clientSecret: required(input.clientSecret, 'clientSecret'),
    redirectUri: required(input.redirectUri, 'redirectUri'),
    scopes: input.scopes ?? ['openid', 'email', 'profile'],
    allowedDomains: normalizeDomains(input.allowedDomains ?? []),
  };
}

/** The environment variable names one provider's configuration is read from. */
export interface ProviderEnvNames {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly issuer: string;
  readonly redirectUri: string;
  readonly allowedDomains: string;
  readonly tenant?: string;
}

export const PROVIDER_ENV: Readonly<Record<ProviderName, ProviderEnvNames>> = {
  google: {
    clientId: 'SCHOOLPILOT_SSO_GOOGLE_CLIENT_ID',
    clientSecret: 'SCHOOLPILOT_SSO_GOOGLE_CLIENT_SECRET',
    issuer: 'SCHOOLPILOT_SSO_GOOGLE_ISSUER',
    redirectUri: 'SCHOOLPILOT_SSO_GOOGLE_REDIRECT_URI',
    allowedDomains: 'SCHOOLPILOT_SSO_GOOGLE_ALLOWED_DOMAINS',
  },
  microsoft: {
    clientId: 'SCHOOLPILOT_SSO_MICROSOFT_CLIENT_ID',
    clientSecret: 'SCHOOLPILOT_SSO_MICROSOFT_CLIENT_SECRET',
    issuer: 'SCHOOLPILOT_SSO_MICROSOFT_ISSUER',
    redirectUri: 'SCHOOLPILOT_SSO_MICROSOFT_REDIRECT_URI',
    allowedDomains: 'SCHOOLPILOT_SSO_MICROSOFT_ALLOWED_DOMAINS',
    tenant: 'SCHOOLPILOT_SSO_MICROSOFT_TENANT',
  },
};

/** The redirect URI a hub shares between its providers when a provider names none. */
export const SHARED_REDIRECT_URI_ENV = 'SCHOOLPILOT_SSO_REDIRECT_URI';

/**
 * The providers a deployment has configured.
 *
 * A provider counts as configured when it has a client id and a client secret; a hub with neither
 * serves no SSO endpoints. A configured provider with no redirect URI raises rather than quietly
 * disappearing, because a hub whose sign-in button leads nowhere is worse than one that refuses
 * to start.
 */
export function ssoProvidersFromEnv(env: NodeJS.ProcessEnv): OidcProviderConfig[] {
  const shared = trimmed(env[SHARED_REDIRECT_URI_ENV]);
  const providers: OidcProviderConfig[] = [];

  for (const name of ['google', 'microsoft'] as const) {
    const names = PROVIDER_ENV[name];
    const clientId = trimmed(env[names.clientId]);
    const clientSecret = trimmed(env[names.clientSecret]);
    if (clientId === null || clientSecret === null) continue;

    const redirectUri = trimmed(env[names.redirectUri]) ?? shared;
    if (redirectUri === null) {
      throw new OidcError(
        'provider_unavailable',
        `the ${name} single-sign-on provider is configured without a redirect URI: set ${names.redirectUri} or ${SHARED_REDIRECT_URI_ENV}`
      );
    }

    const issuer =
      trimmed(env[names.issuer]) ?? (name === 'microsoft' ? microsoftIssuer(env) : undefined);

    providers.push(
      namedProviderConfig(name, {
        clientId,
        clientSecret,
        redirectUri,
        ...(issuer === undefined ? {} : { issuer }),
        allowedDomains: splitDomains(trimmed(env[names.allowedDomains])),
      })
    );  }

  return providers;
}

function microsoftIssuer(env: NodeJS.ProcessEnv): string {
  const names = PROVIDER_ENV.microsoft;
  const tenant = names.tenant === undefined ? null : trimmed(env[names.tenant]);
  if (tenant === null) {
    // The multi-tenant `common` endpoint signs tokens whose issuer names the signer's own tenant,
    // which the exact issuer check would refuse on every login. A hub that cannot sign anyone in
    // should say so when it starts, as it does for a missing redirect URI.
    throw new OidcError(
      'provider_unavailable',
      `the microsoft single-sign-on provider needs the school's tenant: set ${names.tenant} to its tenant id or domain`
    );
  }
  return `https://login.microsoftonline.com/${tenant}/v2.0`;
}

function normalizeDomains(domains: readonly string[]): readonly string[] {
  return [...new Set(domains.map((domain) => domain.trim().toLowerCase()).filter(Boolean))];
}

function splitDomains(value: string | null): readonly string[] {
  if (value === null) return [];
  return value
    .split(',')
    .map((domain) => domain.trim())
    .filter(Boolean);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function trimmed(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length === 0 ? null : text;
}

function required(value: string, field: string): string {
  const text = value.trim();
  if (text.length === 0) {
    throw new OidcError('provider_unavailable', `the single-sign-on provider has no ${field}`);
  }
  return text;
}
