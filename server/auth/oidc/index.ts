// ABOUTME: Public surface of the hub's single-sign-on module: the service a hub composes, the provider
// ABOUTME: configuration it is built from, and the typed refusal a client sees.

export { OidcError, type OidcErrorCode } from './errors';
export {
  PROVIDER_ENV,
  PROVIDER_PRESETS,
  SHARED_REDIRECT_URI_ENV,
  namedProviderConfig,
  oidcProviderConfig,
  ssoProvidersFromEnv,
  type OidcProviderConfig,
  type OidcProviderInput,
  type ProviderEnvNames,
  type ProviderName,
} from './providerConfig';
export { DISCOVERY_TTL_MS, OidcDiscovery, parseDiscovery, type OidcDiscoveryDocument } from './discovery';
export { JWKS_TTL_MS, MAX_JWKS_KEYS, OidcJwks, parseJwks } from './jwks';
export {
  ACCEPTED_ID_TOKEN_ALGORITHMS,
  DEFAULT_CLOCK_SKEW_SECONDS,
  MAX_ID_TOKEN_BYTES,
  readJwtHeader,
  verifyIdToken,
  type IdTokenClaims,
  type VerifyIdTokenOptions,
} from './idToken';
export { challengeFor, newNonce, newPkce, newState, type PkcePair } from './pkce';
export { OidcClient, type OidcClientOptions, type OidcTokenResponse } from './client';
export { SsoAccountLinker, type SsoIdentity, type SsoLinkResult } from './accounts';
export { OIDC_DDL, applyOidcSchema } from './tables';
export {
  DEFAULT_SSO_STATE_TTL_MS,
  OidcSsoService,
  type OidcSsoOptions,
  type SsoAuthorisation,
  type SsoProviderSummary,
} from './service';
