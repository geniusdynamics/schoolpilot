// ABOUTME: RFC 6238 TOTP over RFC 4226 HOTP with node:crypto — base32 secrets, code generation,
// ABOUTME: verification inside a clock window, replay refusal by step, and the otpauth URI.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { bytes } from './bytes';

/** The step every TOTP code lives in, in seconds. */
export const TOTP_STEP_SECONDS = 30;

/** The number of digits a code carries. */
export const TOTP_DIGITS = 6;

/** The algorithm authenticator apps default to. */
const TOTP_ALGORITHM = 'sha1';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** A new base32 secret of 160 bits, the length RFC 4226 recommends for HMAC-SHA1. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * The TOTP code of a step.
 *
 * `at` is a wall-clock instant; the step is the whole 30-second window it falls in.
 */
export function totpCode(
  secret: string,
  options: { readonly at: Date; readonly digits?: number; readonly stepSeconds?: number } = {
    at: new Date(),
  }
): { readonly code: string; readonly step: number } {
  const stepSeconds = options.stepSeconds ?? TOTP_STEP_SECONDS;
  const digits = options.digits ?? TOTP_DIGITS;
  const step = Math.floor(options.at.getTime() / 1000 / stepSeconds);
  return { code: hotp(secret, step, digits), step };
}

/** Why a code was refused. */
export type TotpRefusal = 'malformed' | 'mismatch' | 'replayed';

/** The answer of a TOTP verification. */
export type TotpVerification =
  | { readonly valid: true; readonly step: number }
  | { readonly valid: false; readonly reason: TotpRefusal };

/**
 * Verifies a code against a secret.
 *
 * The window admits the step before and after the current one, covering a clock a little
 * ahead or behind and the seconds on either side of a step boundary. A code is accepted at
 * most once: a matched step that is not after the last accepted step is a replay, even inside
 * the window. That is what makes a stolen code useless to the thief who watched it.
 */
export function verifyTotp(
  secret: string,
  code: string,
  options: {
    readonly at: Date;
    readonly window?: number;
    readonly digits?: number;
    readonly stepSeconds?: number;
    readonly lastUsedStep?: number | null;
  }
): TotpVerification {
  const normalized = normalizeCode(code, options.digits ?? TOTP_DIGITS);
  if (normalized === null) return { valid: false, reason: 'malformed' };

  const stepSeconds = options.stepSeconds ?? TOTP_STEP_SECONDS;
  const window = options.window ?? 1;
  const current = Math.floor(options.at.getTime() / 1000 / stepSeconds);
  const expectedLength = (options.digits ?? TOTP_DIGITS);

  for (let candidate = current - window; candidate <= current + window; candidate += 1) {
    if (candidate < 0) continue;
    const generated = hotp(secret, candidate, expectedLength);
    if (!constantTimeEquals(generated, normalized)) continue;
    if (options.lastUsedStep !== null && options.lastUsedStep !== undefined) {
      if (candidate <= options.lastUsedStep) return { valid: false, reason: 'replayed' };
    }
    return { valid: true, step: candidate };
  }

  return { valid: false, reason: 'mismatch' };
}

/** The URI an authenticator app reads from a QR code. */
export function totpUri(input: {
  readonly secret: string;
  readonly account: string;
  readonly issuer: string;
}): string {
  const label = `${encodeURIComponent(input.issuer)}:${encodeURIComponent(input.account)}`;
  const query = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: TOTP_ALGORITHM.toUpperCase(),
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

// --------------------------------------------------------------------------- internals

/** RFC 4226 HOTP over the counter, truncated to `digits`. */
function hotp(secret: string, counter: number, digits: number): string {
  const key = base32Decode(secret);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac(TOTP_ALGORITHM, bytes(key)).update(bytes(message)).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
}

/** The code without the spaces an app may show, or null when it is not the right shape. */
function normalizeCode(code: string, digits: number): string | null {
  const normalized = code.replace(/[\s-]/g, '');
  if (!new RegExp(`^\\d{${digits}}$`).test(normalized)) return null;
  return normalized;
}

function constantTimeEquals(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(bytes(a), bytes(b));
}

/** RFC 4648 base32 without padding. */
export function base32Encode(value: Buffer): string {
  let bits = 0;
  let accumulator = 0;
  let output = '';

  for (const byte of value) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(accumulator >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(accumulator << (5 - bits)) & 31];
  }
  return output;
}

/** RFC 4648 base32, tolerating lowercase, spaces and padding. */
export function base32Decode(value: string): Buffer {
  const clean = value.toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let accumulator = 0;
  const output: number[] = [];

  for (const character of clean) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) throw new Error(`"${character}" is not a base32 character`);
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}
