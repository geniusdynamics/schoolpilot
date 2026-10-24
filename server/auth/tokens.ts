// ABOUTME: Opaque bearer tokens, their at-rest hashes and their constant-time comparison: the one
// ABOUTME: place a session token, a challenge token, a reset token or an OTP code is produced.

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

import { bytes } from './bytes';

/** The prefix of a session token, so a leaked string can be recognised by secret scanners. */
export const SESSION_TOKEN_PREFIX = 'sp1';

/**
 * A new opaque token.
 *
 * 32 random bytes is far beyond guessing, and the value is the only copy: every table stores
 * its SHA-256, so a stolen database holds no live credential.
 */
export function newSessionToken(): string {
  return `${SESSION_TOKEN_PREFIX}_${base64url(randomBytes(32))}`;
}

/** A new opaque token for a challenge or a password reset. */
export function newOpaqueToken(prefix: 'challenge' | 'reset'): string {
  return `${prefix}_${base64url(randomBytes(32))}`;
}

/** The SHA-256 of a token, in the form the tables store. */
export function hashToken(token: string): string {
  return `sha256:${createHash('sha256').update(token, 'utf8').digest('hex')}`;
}

/**
 * The hash of an OTP code, salted with the challenge token.
 *
 * A six-digit code has a million possibilities, so hashing it alone would be reversible by a
 * stolen table in a second. The challenge token is 256 random bits and only its hash is
 * stored, so the salt is unavailable to whoever stole the table and the code stays hidden.
 */
export function hashCode(challengeToken: string, code: string): string {
  return hashToken(`${challengeToken}:${code}`);
}

/** A numeric one-time code, zero-padded to `digits`. */
export function numericCode(digits = 6): string {
  const limit = 10 ** digits;
  return String(randomInt(0, limit)).padStart(digits, '0');
}

/** True when the two strings are equal, comparing in constant time. */
export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(bytes(a), bytes(b));
}

/** True when the value looks like a session token this module issued. */
export function isSessionToken(value: string): boolean {
  return new RegExp(`^${SESSION_TOKEN_PREFIX}_[A-Za-z0-9_-]{43}$`).test(value);
}

function base64url(value: Buffer): string {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
