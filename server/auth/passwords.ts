// ABOUTME: Password hashing for the hub: PBKDF2-SHA256 at the spec's floor of 600k iterations,
// ABOUTME: the minimum-length policy, and a fixed dummy hash so an unknown user costs a real verification.

import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

import { bytes } from './bytes';
import { AuthError } from './errors';

/** The spec 06 §5.1 minimum: a password is at least ten characters. */
export const MIN_PASSWORD_LENGTH = 10;

/** The spec 06 §5.1 floor for PBKDF2-SHA256, and the count every new hash uses. */
export const PBKDF2_ITERATIONS = 600_000;

/**
 * The highest iteration count a stored hash may ask for.
 *
 * Verification parses the count out of the stored string, so without a ceiling a corrupted or
 * hostile row could make every login attempt burn unbounded CPU. Four times the floor is far
 * above any real hash and still bounded.
 */
const MAX_ITERATIONS = PBKDF2_ITERATIONS * 4;

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/**
 * A hash of a password nobody knows, used to spend the same work on an unknown user as on a
 * known one. Without it the response time tells an attacker which usernames exist.
 */
const DUMMY_HASH =
  'pbkdf2-sha256$600000$vWIiAtyVk_VQzZCLQ4Qneg$4_NBl1Qin8PGyAalrPz9ctreKeXGhMCHXKNw1npQdAU';

export interface HashOptions {
  /** Iterations for the new hash. Defaults to, and never goes below, the spec floor. */
  readonly iterations?: number;
}

/** True when the stored value is a hash this module wrote. */
export function isPasswordHash(value: unknown): value is string {
  return typeof value === 'string' && /^pbkdf2-sha256\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/.test(value);
}

/** The iteration count of a stored hash, or null when it is not one of ours. */
export function iterationsOf(stored: string): number | null {
  const match = /^pbkdf2-sha256\$(\d+)\$/.exec(stored);
  if (!match) return null;
  const iterations = Number(match[1]);
  return Number.isInteger(iterations) ? iterations : null;
}

/**
 * Hashes a password.
 *
 * The format carries the algorithm, the iteration count and the salt, so a later change of
 * cost can verify the hashes written before it and rehash on the next successful login.
 */
export function hashPassword(password: string, options: HashOptions = {}): string {
  const iterations = Math.max(options.iterations ?? PBKDF2_ITERATIONS, PBKDF2_ITERATIONS);
  const salt = randomBytes(SALT_LENGTH);
  const derived = pbkdf2Sync(password, bytes(salt), iterations, KEY_LENGTH, 'sha256');
  return `pbkdf2-sha256$${iterations}$${base64url(salt)}$${base64url(derived)}`;
}

/**
 * Verifies a password against a stored hash.
 *
 * A malformed hash verifies as false rather than raising: the caller's answer is the same
 * generic refusal either way, and a corrupt row must not turn into a 500 that names the user.
 * The comparison is constant-time, and the stored iteration count is bounded.
 */
export function verifyPassword(password: string, stored: unknown): boolean {
  if (typeof stored !== 'string') return false;

  const match = /^pbkdf2-sha256\$(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/.exec(stored);
  if (!match) return false;

  const iterations = Number(match[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_ITERATIONS) {
    return false;
  }

  const salt = fromBase64url(match[2] ?? '');
  const expected = fromBase64url(match[3] ?? '');
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = pbkdf2Sync(password, bytes(salt), iterations, expected.length, 'sha256');
  return derived.length === expected.length && timingSafeEqual(bytes(derived), bytes(expected));
}

/**
 * Spends the work of a verification without revealing that there was nothing to verify.
 *
 * Used for an unknown username and for a row whose password field is not a hash (a guardian
 * identity, for instance), so every refused password costs the same order of time.
 */
export function verifyAgainstDummy(password: string): void {
  verifyPassword(password, DUMMY_HASH);
}

/**
 * Enforces the password policy of spec 06 §5.1.
 *
 * The only rule the spec states is a minimum of ten characters; the upper bound is a denial
 * of service guard, not a strength rule.
 */
export function assertPasswordPolicy(password: string, options: { readonly username?: string } = {}): void {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(
      'weak_password',
      `the password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }
  if (password.trim().length === 0) {
    throw new AuthError('weak_password', 'the password must not be only whitespace');
  }
  if (password.length > 1024) {
    throw new AuthError('weak_password', 'the password must not exceed 1024 characters');
  }
  if (options.username !== undefined && password.toLowerCase() === options.username.toLowerCase()) {
    throw new AuthError('weak_password', 'the password must not be the username');
  }
}

function base64url(value: Buffer): string {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value: string): Buffer {
  try {
    return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  } catch {
    return Buffer.alloc(0);
  }
}
