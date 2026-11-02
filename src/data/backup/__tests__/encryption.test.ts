// ABOUTME: Tests the passphrase encryption of a backup: a round trip, a wrong passphrase, a header
// ABOUTME: altered to weaken the key derivation, and the parameters the plaintext header records.

import { webcrypto } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  BackupPassphraseError,
  decryptBackup,
  encryptBackup,
  isEncryptedBackup,
  PBKDF2_ITERATIONS,
  readEncryptedHeader,
} from '../encryption';

const PASSPHRASE = 'correct horse battery staple';
const plaintext = new TextEncoder().encode('PK\u0003\u0004 a zip archive with the school data');

beforeAll(() => {
  // The jsdom environment may not carry WebCrypto; node's is the same standard API.
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
});

describe('backup encryption', () => {
  it('round-trips the archive and records its parameters in plain text', async () => {
    const encrypted = await encryptBackup(plaintext, PASSPHRASE);

    expect(isEncryptedBackup(encrypted)).toBe(true);
    const { header } = readEncryptedHeader(encrypted);
    expect(header).toMatchObject({
      format: 'schoolpilot-browser-backup',
      encryption: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: PBKDF2_ITERATIONS,
    });
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
    // The school data is not readable in the file.
    expect(Buffer.from(encrypted).includes(Buffer.from('school data'))).toBe(false);

    expect(new TextDecoder().decode(await decryptBackup(encrypted, PASSPHRASE))).toBe(
      new TextDecoder().decode(plaintext)
    );
  });

  it('refuses a wrong passphrase', async () => {
    const encrypted = await encryptBackup(plaintext, PASSPHRASE);
    await expect(decryptBackup(encrypted, 'not the passphrase')).rejects.toBeInstanceOf(
      BackupPassphraseError
    );
  });

  it('refuses a header altered to lower the iteration count', async () => {
    const encrypted = await encryptBackup(plaintext, PASSPHRASE);
    const text = Buffer.from(encrypted).toString('latin1');
    const altered = Buffer.from(
      text.replace(`"iterations":${PBKDF2_ITERATIONS}`, `"iterations":${PBKDF2_ITERATIONS - 1}`),
      'latin1'
    );
    expect(altered.equals(Buffer.from(encrypted))).toBe(false);

    await expect(decryptBackup(new Uint8Array(altered), PASSPHRASE)).rejects.toBeInstanceOf(
      BackupPassphraseError
    );
  });

  it('refuses a passphrase too short to protect anything', async () => {
    await expect(encryptBackup(plaintext, 'short')).rejects.toBeInstanceOf(BackupPassphraseError);
  });
});
