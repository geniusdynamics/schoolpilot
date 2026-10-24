// ABOUTME: The typed refusals of the authentication service: a status, a stable code and, for a
// ABOUTME: locked account, the seconds a client should wait before trying again.

/** The refusals the authentication service raises. */
export type AuthErrorCode =
  | 'invalid_credentials'
  | 'account_locked'
  | 'account_disabled'
  | 'mfa_not_enrolled'
  | 'invalid_code'
  | 'invalid_challenge'
  | 'challenge_expired'
  | 'invalid_token'
  | 'invalid_username'
  | 'weak_password'
  | 'already_enrolled'
  | 'setup_complete'
  | 'institution_required'
  | 'not_found'
  | 'delivery_unavailable';

const STATUS: Record<AuthErrorCode, number> = {
  // The credentials refusal is deliberately the same answer for an unknown user, a wrong
  // password and a disabled account: the client learns nothing about which accounts exist.
  invalid_credentials: 401,
  account_locked: 423,
  account_disabled: 403,
  mfa_not_enrolled: 403,
  invalid_code: 401,
  invalid_challenge: 401,
  challenge_expired: 401,
  invalid_token: 400,
  invalid_username: 422,
  weak_password: 422,
  already_enrolled: 409,
  setup_complete: 409,
  institution_required: 422,
  not_found: 404,
  delivery_unavailable: 503,
};

/**
 * A refusal of the authentication service.
 *
 * The message is meant for the client: it never says whether an account exists, and for a
 * locked account it carries the wait in seconds so the page can count the lockout down.
 */
export class AuthError extends Error {
  readonly status: number;
  readonly code: AuthErrorCode;
  readonly retryAfterSeconds: number | undefined;

  constructor(code: AuthErrorCode, message: string, options: { retryAfterSeconds?: number } = {}) {
    super(message);
    this.name = 'AuthError';
    this.status = STATUS[code];
    this.code = code;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
