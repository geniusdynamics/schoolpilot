// ABOUTME: The authentication primitives on their own: PBKDF2 at the spec floor, RFC 6238 vectors,
// ABOUTME: the lockout doubling, token hashing and the encryption of a TOTP secret at rest.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  AUTH_KEY_BYTES,
  PBKDF2_ITERATIONS,
  assertPasswordPolicy,
  base32Encode,
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  hashCode,
  hashPassword,
  hashToken,
  isPasswordHash,
  isSessionToken,
  iterationsOf,
  loadOrCreateAuthKey,
  lockoutDurationMs,
  newSessionToken,
  numericCode,
  safeEqual,
  totpCode,
  totpUri,
  verifyPassword,
  verifyTotp,
} from '../auth';

/** The secret RFC 4226 uses for its vectors, and its base32 form. */
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890', 'ascii'));
const RFC_SECRET_BASE32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('password hashing', () => {
  it('writes a self-describing hash at the spec floor and verifies only the right password', () => {
    const stored = hashPassword('a-long-enough-password');

    expect(isPasswordHash(stored)).toBe(true);
    expect(iterationsOf(stored)).toBe(PBKDF2_ITERATIONS);
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
    expect(stored).not.toContain('a-long-enough-password');

    expect(verifyPassword('a-long-enough-password', stored)).toBe(true);
    expect(verifyPassword('a-long-enough-passworD', stored)).toBe(false);
    expect(verifyPassword('a-long-enough-password', 'not-a-hash')).toBe(false);
    expect(verifyPassword('a-long-enough-password', null)).toBe(false);

    // A stored count below the floor is raised, never honoured.
    expect(iterationsOf(hashPassword('a-long-enough-password', { iterations: 1_000 }))).toBe(
      PBKDF2_ITERATIONS
    );

    // A corrupted count that would burn unbounded CPU verifies as false instead of running.
    const inflated = stored.replace('600000', '6000000000');
    expect(verifyPassword('a-long-enough-password', inflated)).toBe(false);
  }, 30000);

  it('refuses a password that is too short, blank, or the username', () => {
    expect(() => assertPasswordPolicy('123456789')).toThrowError(/at least 10/);
    expect(() => assertPasswordPolicy('          ')).toThrowError(/only whitespace/);
    expect(() =>
      assertPasswordPolicy('director.wekesa', { username: 'director.wekesa' })
    ).toThrowError(/must not be the username/);

    expect(() => assertPasswordPolicy('1234567890')).not.toThrow();
  });
});

describe('TOTP', () => {
  it('reproduces the RFC 6238 SHA-1 vectors', () => {
    expect(RFC_SECRET).toBe(RFC_SECRET_BASE32);

    const vectors: Array<[number, string]> = [
      [59, '94287082'],
      [1_111_111_109, '07081804'],
      [20_000_000_000, '65353130'],
    ];

    for (const [seconds, expected] of vectors) {
      const { code, step } = totpCode(RFC_SECRET, {
        at: new Date(seconds * 1000),
        digits: 8,
      });
      expect(code).toBe(expected);
      expect(step).toBe(Math.floor(seconds / 30));
    }
  });

  it('accepts a code inside the clock window and refuses one outside it', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);

    const at = new Date(1_000_000_000);
    const { code, step } = totpCode(secret, { at });

    expect(verifyTotp(secret, code, { at })).toEqual({ valid: true, step });
    // One step later the previous code is still inside the ±1 window.
    expect(verifyTotp(secret, code, { at: new Date(at.getTime() + 30_000) })).toEqual({
      valid: true,
      step,
    });
    // Three steps later it is not.
    expect(verifyTotp(secret, code, { at: new Date(at.getTime() + 90_000) })).toEqual({
      valid: false,
      reason: 'mismatch',
    });
    expect(verifyTotp(secret, '12345', { at })).toEqual({ valid: false, reason: 'malformed' });
    expect(verifyTotp(secret, 'abcdef', { at })).toEqual({ valid: false, reason: 'malformed' });
  });

  it('refuses a code that was already used, even inside its window', () => {
    const secret = generateTotpSecret();
    const at = new Date(1_700_000_000_000);
    const { code, step } = totpCode(secret, { at });

    expect(verifyTotp(secret, code, { at, lastUsedStep: step })).toEqual({
      valid: false,
      reason: 'replayed',
    });
    expect(verifyTotp(secret, code, { at, lastUsedStep: step - 1 })).toEqual({
      valid: true,
      step,
    });
  });

  it('builds the URI an authenticator app reads', () => {
    const uri = totpUri({ secret: RFC_SECRET, account: 'director', issuer: 'Mwangaza' });
    expect(uri.startsWith('otpauth://totp/Mwangaza:director?')).toBe(true);
    expect(uri).toContain(`secret=${RFC_SECRET}`);
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});

describe('lockout policy', () => {
  it('locks for fifteen minutes and doubles to a four-hour ceiling', () => {
    expect(lockoutDurationMs(0)).toBe(0);
    expect(lockoutDurationMs(1)).toBe(15 * 60_000);
    expect(lockoutDurationMs(2)).toBe(30 * 60_000);
    expect(lockoutDurationMs(3)).toBe(60 * 60_000);
    expect(lockoutDurationMs(4)).toBe(120 * 60_000);
    expect(lockoutDurationMs(5)).toBe(240 * 60_000);
    expect(lockoutDurationMs(9)).toBe(240 * 60_000);
    expect(lockoutDurationMs(-1)).toBe(0);
  });
});

describe('tokens', () => {
  it('hashes tokens deterministically and recognises the ones it issues', () => {
    expect(hashToken('value')).toBe(hashToken('value'));
    expect(hashToken('value')).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(hashToken('value')).not.toBe(hashToken('other'));

    const token = newSessionToken();
    expect(isSessionToken(token)).toBe(true);
    expect(isSessionToken('sp1_short')).toBe(false);
    expect(isSessionToken('nonsense')).toBe(false);

    // A six-digit code is only hidden because the salt is the challenge token itself.
    expect(hashCode('challenge-a', '123456')).not.toBe(hashCode('challenge-b', '123456'));
    expect(numericCode(6)).toMatch(/^\d{6}$/);

    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('the authentication key and the secret it protects', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schoolpilot-auth-'));

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('creates a key once and keeps using it', () => {
    const file = path.join(dir, 'nested', 'auth.key');

    const created = loadOrCreateAuthKey(file);
    expect(created).toHaveLength(AUTH_KEY_BYTES);
    expect(fs.readFileSync(file)).toHaveLength(AUTH_KEY_BYTES);

    const reloaded = loadOrCreateAuthKey(file);
    expect(reloaded.equals(created)).toBe(true);

    const wrongSize = path.join(dir, 'short.key');
    fs.writeFileSync(wrongSize, Buffer.alloc(16, 1));
    expect(() => loadOrCreateAuthKey(wrongSize)).toThrowError(/must be 32 bytes/);
  });

  it('round-trips a secret and refuses one another key or a tampered ciphertext wrote', () => {
    const key = Buffer.alloc(AUTH_KEY_BYTES, 3);
    const other = Buffer.alloc(AUTH_KEY_BYTES, 4);

    const stored = encryptSecret(RFC_SECRET, key);
    expect(stored).not.toContain(RFC_SECRET);
    expect(decryptSecret(stored, key)).toBe(RFC_SECRET);

    expect(() => decryptSecret(stored, other)).toThrow();
    expect(() => decryptSecret('v1.not-a-secret', key)).toThrow();

    const [version, iv, tag, ciphertext] = stored.split('.');
    const flipped = Buffer.from(ciphertext ?? '', 'base64');
    flipped[0] = (flipped[0] ?? 0) ^ 0xff;
    const tampered = [version, iv, tag, flipped.toString('base64').replace(/=+$/, '')].join('.');
    expect(() => decryptSecret(tampered, key)).toThrow();
  });
});
