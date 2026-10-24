// ABOUTME: Public surface of the hub's authentication module: the service, the notifier seam it
// ABOUTME: delivers codes through, and the table setup the composition root runs before serving.

export { AuthError, type AuthErrorCode } from './errors';
export { applyAuthSchema, AUTH_DDL } from './tables';
export {
  MIN_PASSWORD_LENGTH,
  PBKDF2_ITERATIONS,
  assertPasswordPolicy,
  hashPassword,
  isPasswordHash,
  iterationsOf,
  verifyPassword,
} from './passwords';
export { loadOrCreateAuthKey, AUTH_KEY_BYTES, encryptSecret, decryptSecret } from './secrets';
export {
  SESSION_TOKEN_PREFIX,
  hashCode,
  hashToken,
  isSessionToken,
  newSessionToken,
  numericCode,
  safeEqual,
} from './tokens';
export {
  DEFAULT_SESSION_POLICY,
  SessionStore,
  type SessionPolicy,
  type SessionRecord,
  type SessionSummary,
} from './sessions';
export {
  DEFAULT_LOCKOUT_POLICY,
  LockoutStore,
  lockoutDurationMs,
  type LockoutPolicy,
  type LockoutState,
} from './lockout';
export { AuthEventLog, type AuthEvent, type AuthEventKind } from './events';
export {
  UndeliverableNotifier,
  type AuthNotifier,
  type GuardianOtpMessage,
  type PasswordResetMessage,
} from './notifier';
export {
  DEFAULT_OTP_POLICY,
  DEFAULT_RESET_POLICY,
  AuthenticationService,
  type AuthenticatedActor,
  type AuthenticationOptions,
  type AuthUserView,
  type LoginOutcome,
  type PersonReference,
  type SessionMeta,
} from './service';
export {
  TOTP_DIGITS,
  TOTP_STEP_SECONDS,
  base32Decode,
  base32Encode,
  generateTotpSecret,
  totpCode,
  totpUri,
  verifyTotp,
  type TotpRefusal,
  type TotpVerification,
} from './totp';
