// ABOUTME: Tests the passphrase encryption of a backup: a round trip, a wrong passphrase, a header
// ABOUTME: altered to weaken the key derivation, and the parameters the plaintext header records.

import { webcrypto } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  BackupPassphraseError,
  decryptBackup,
  ENCRYPTED_MAGIC,
  EncryptedBackupFormatError,
  encryptBackup,
  isEncryptedBackup,
  MAX_PBKDF2_ITERATIONS,
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

  it('opens with the same passphrase typed on a keyboard that composes accents differently', async () => {
    const composed = 'café au lait 2026';
    const decomposed = 'café au lait 2026';
    expect(composed).not.toBe(decomposed);

    const encrypted = await encryptBackup(plaintext, decomposed);
    expect(new TextDecoder().decode(await decryptBackup(encrypted, composed))).toBe(
      new TextDecoder().decode(plaintext)
    );
    const fromComposed = await encryptBackup(plaintext, composed);
    await expect(decryptBackup(fromComposed, decomposed)).resolves.toBeInstanceOf(Uint8Array);
  });
});

/** An encrypted-backup prefix whose header records `iterations`, followed by junk ciphertext. */
function withIterations(iterations: number): Uint8Array {
  const header = new TextEncoder().encode(
    JSON.stringify({
      format: 'schoolpilot-browser-backup',
      encryption: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations,
      salt: Buffer.alloc(16, 1).toString('base64'),
      iv: Buffer.alloc(12, 2).toString('base64'),
    })
  );
  const bytes = new Uint8Array(ENCRYPTED_MAGIC.length + 4 + header.length + 32);
  bytes.set(new TextEncoder().encode(ENCRYPTED_MAGIC), 0);
  new DataView(bytes.buffer).setUint32(ENCRYPTED_MAGIC.length, header.length, true);
  bytes.set(header, ENCRYPTED_MAGIC.length + 4);
  return bytes;
}

describe('iteration count read from a file', () => {
  it('accepts the cap and refuses one more, before deriving anything', async () => {
    expect(MAX_PBKDF2_ITERATIONS).toBe(10_000_000);
    expect(readEncryptedHeader(withIterations(MAX_PBKDF2_ITERATIONS)).header.iterations).toBe(10_000_000);

    expect(() => readEncryptedHeader(withIterations(MAX_PBKDF2_ITERATIONS + 1))).toThrow(EncryptedBackupFormatError);
    expect(() => readEncryptedHeader(withIterations(MAX_PBKDF2_ITERATIONS + 1))).toThrow(/10,000,000/);
    // A crafted header is refused at once: decryption never starts a 2-billion-round derivation.
    const started = Date.now();
    await expect(decryptBackup(withIterations(2_000_000_000), PASSPHRASE)).rejects.toBeInstanceOf(
      EncryptedBackupFormatError
    );
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
