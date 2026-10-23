// ABOUTME: Where the Daraja credentials come from: the deployment configuration the hub/server
// ABOUTME: reads at runtime, never a client-inlined build variable, and the redaction that keeps
// ABOUTME: them out of a log line.

import { ProviderError } from '@/domain/finance/payments/providers';

/** Which Daraja deployment a credential set talks to. */
export type DarajaEnvironment = 'sandbox' | 'production';

/**
 * The environment keys the Daraja credentials are read from.
 *
 * The names carry no bundler prefix on purpose. This repo's client-visible variables are the
 * `REACT_APP_*` keys (see `src/config/databaseEnvVars.ts`), and a bundler inlines a prefixed
 * variable into the JavaScript it ships to the browser; an unprefixed name is read by the process
 * that runs the hub/server, which is where the webhook is terminated. A secret must never carry a
 * prefix that puts it in the bundle.
 */
export const DARAJA_ENV_KEYS = {
  environment: 'DARAJA_ENVIRONMENT',
  consumerKey: 'DARAJA_CONSUMER_KEY',
  consumerSecret: 'DARAJA_CONSUMER_SECRET',
  shortCode: 'DARAJA_SHORT_CODE',
  passkey: 'DARAJA_PASSKEY',
  initiatorName: 'DARAJA_INITIATOR_NAME',
  securityCredential: 'DARAJA_SECURITY_CREDENTIAL',
  callbackBaseUrl: 'DARAJA_CALLBACK_BASE_URL',
  callbackToken: 'DARAJA_CALLBACK_TOKEN',
  sourceIpAllowlist: 'DARAJA_SOURCE_IP_ALLOWLIST',
} as const;

/** The keys every credential set must carry. */
export const DARAJA_REQUIRED_KEYS = [
  'consumerKey',
  'consumerSecret',
  'shortCode',
  'passkey',
] as const;

/** The keys B2C needs on top of the required ones. */
export const DARAJA_B2C_KEYS = ['initiatorName', 'securityCredential'] as const;

/** The credentials one institution's Daraja integration holds. */
export interface DarajaCredentials {
  readonly environment: DarajaEnvironment;
  /** The Daraja app's consumer key. */
  readonly consumerKey: string;
  /** The Daraja app's consumer secret. */
  readonly consumerSecret: string;
  /** The paybill or till number the money is collected into. */
  readonly shortCode: string;
  /** The Lipa na M-Pesa passkey, used to build the STK push password. */
  readonly passkey: string;
  /** The B2C initiator, when B2C refunds are used. */
  readonly initiatorName: string | null;
  /** The B2C security credential: the initiator's password, RSA-encrypted per Daraja's rule. */
  readonly securityCredential: string | null;
  /** The public base URL the callbacks are delivered to. */
  readonly callbackBaseUrl: string | null;
  /** The secret token placed in the callback URL, checked on every delivery. */
  readonly callbackToken: string | null;
  /** The source addresses a callback is accepted from. Empty means no address check. */
  readonly sourceIpAllowlist: readonly string[];
}

/**
 * Reads the Daraja credentials out of a deployment's environment.
 *
 * A required key that is missing refuses with `credentials_missing` naming the key, rather than
 * defaulting to an empty string: a payment integration that silently runs with no key is worse than
 * one that will not start.
 */
export function loadDarajaCredentials(
  env: Readonly<Record<string, string | undefined>>
): DarajaCredentials {
  const read = (key: string): string | null => {
    const value = env[key];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  };

  const missing = DARAJA_REQUIRED_KEYS.filter((name) => read(DARAJA_ENV_KEYS[name]) === null);
  if (missing.length > 0) {
    throw new ProviderError(
      'credentials_missing',
      `the Daraja integration is missing ${missing
        .map((name) => DARAJA_ENV_KEYS[name])
        .join(', ')}; set them in the deployment configuration of the hub or server that terminates the webhook`,
      { detail: { missing: missing.map((name) => DARAJA_ENV_KEYS[name]) } }
    );
  }

  const environment = read(DARAJA_ENV_KEYS.environment);
  if (environment !== null && environment !== 'sandbox' && environment !== 'production') {
    throw new ProviderError(
      'credentials_missing',
      `${DARAJA_ENV_KEYS.environment} is "${environment}"; it is "sandbox" or "production"`,
      { detail: { key: DARAJA_ENV_KEYS.environment, value: environment } }
    );
  }

  const allowlist = read(DARAJA_ENV_KEYS.sourceIpAllowlist);

  return {
    environment: environment === 'production' ? 'production' : 'sandbox',
    consumerKey: read(DARAJA_ENV_KEYS.consumerKey) as string,
    consumerSecret: read(DARAJA_ENV_KEYS.consumerSecret) as string,
    shortCode: read(DARAJA_ENV_KEYS.shortCode) as string,
    passkey: read(DARAJA_ENV_KEYS.passkey) as string,
    initiatorName: read(DARAJA_ENV_KEYS.initiatorName),
    securityCredential: read(DARAJA_ENV_KEYS.securityCredential),
    callbackBaseUrl: read(DARAJA_ENV_KEYS.callbackBaseUrl),
    callbackToken: read(DARAJA_ENV_KEYS.callbackToken),
    sourceIpAllowlist: allowlist
      ? allowlist
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [],
  };
}

/**
 * The credentials with every secret replaced, for a log line or an error report.
 *
 * Only the shape is useful in a log: which environment, which short code, whether a token and a
 * B2C initiator are configured. The secrets themselves are reduced to whether they are present.
 */
export function redactDarajaCredentials(
  credentials: DarajaCredentials
): Readonly<Record<string, string | boolean>> {
  return {
    environment: credentials.environment,
    shortCode: credentials.shortCode,
    consumerKey: present(credentials.consumerKey),
    consumerSecret: present(credentials.consumerSecret),
    passkey: present(credentials.passkey),
    initiatorName: credentials.initiatorName ?? false,
    securityCredential: present(credentials.securityCredential ?? ''),
    callbackBaseUrl: credentials.callbackBaseUrl ?? false,
    callbackToken: present(credentials.callbackToken ?? ''),
    sourceIpAllowlist: credentials.sourceIpAllowlist.length > 0,
  };
}

/** The B2C half of the credentials, refused when it is not configured. */
export function requireB2cCredentials(credentials: DarajaCredentials): {
  initiatorName: string;
  securityCredential: string;
} {
  const missing = DARAJA_B2C_KEYS.filter((name) => {
    const value = name === 'initiatorName' ? credentials.initiatorName : credentials.securityCredential;
    return value === null || value === '';
  });
  if (missing.length > 0) {
    throw new ProviderError(
      'credentials_missing',
      `a Daraja refund needs ${missing.map((name) => DARAJA_ENV_KEYS[name]).join(', ')}; the collection half does not`,
      { detail: { missing: missing.map((name) => DARAJA_ENV_KEYS[name]) } }
    );
  }
  return {
    initiatorName: credentials.initiatorName as string,
    securityCredential: credentials.securityCredential as string,
  };
}

/** Whether a secret is set, without revealing it. */
function present(secret: string): boolean {
  return secret.trim() !== '';
}
