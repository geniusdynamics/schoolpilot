// ABOUTME: The typed refusals of the OIDC single-sign-on service: a status and a stable code, and
// ABOUTME: never the token, the code or the client secret that produced the refusal.

/** The refusals the SSO service raises. */
export type OidcErrorCode =
  | 'unknown_provider'
  | 'provider_unavailable'
  | 'discovery_failed'
  | 'insecure_endpoint'
  | 'token_exchange_failed'
  | 'invalid_state'
  | 'invalid_id_token'
  | 'email_missing'
  | 'email_unverified'
  | 'domain_not_allowed'
  | 'no_account'
  | 'account_disabled'
  | 'not_staff'
  | 'identity_conflict';

const STATUS: Record<OidcErrorCode, number> = {
  // A provider the hub was never configured with is not found, not forbidden.
  unknown_provider: 404,
  provider_unavailable: 503,
  // The provider answered something the hub refuses to trust; that is the provider's fault, not
  // the caller's, and it is deliberately not a 4xx the client could act on by retrying harder.
  discovery_failed: 502,
  insecure_endpoint: 502,
  token_exchange_failed: 401,
  // Everything the caller presented is checked the same way: an unknown, expired, replayed or
  // mismatched authorisation state is one refusal.
  invalid_state: 401,
  invalid_id_token: 401,
  // The account-link refusals. They are 403 rather than 401: the caller proved who they are at the
  // provider, and the hub is refusing to attach that identity to an account here.
  email_missing: 403,
  email_unverified: 403,
  domain_not_allowed: 403,
  no_account: 403,
  account_disabled: 403,
  not_staff: 403,
  identity_conflict: 409,
};

/**
 * A refusal of the single-sign-on service.
 *
 * The message is safe to show a user and says nothing about which accounts exist beyond the
 * refusal code itself, which is the caller's own identity being turned away.
 */
export class OidcError extends Error {
  readonly status: number;
  readonly code: OidcErrorCode;

  constructor(code: OidcErrorCode, message: string) {
    super(message);
    this.name = 'OidcError';
    this.status = STATUS[code];
    this.code = code;
  }
}
