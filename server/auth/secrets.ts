// ABOUTME: Encryption of the TOTP secret at rest with AES-256-GCM under the hub's own key, and
// ABOUTME: the key file the hub creates on first start.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { bytes } from './bytes';

/** The length of the key AES-256-GCM takes. */
export const AUTH_KEY_BYTES = 32;

const IV_BYTES = 12;
const TAG_BYTES = 16;
const VERSION = 'v1';

/**
 * Encrypts a TOTP secret for storage.
 *
 * The secret is the whole factor, so it is not stored in the clear: a stolen database file
 * alone does not let the thief generate codes. The key lives in a separate file, which is the
 * separation a hub without an external KMS can offer; a thief who copies the whole data
 * directory copies both, which is what disk encryption (P4-D04) is for.
 */
export function encryptSecret(plaintext: string, key: Buffer): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', bytes(key), bytes(iv));
  const ciphertext = Buffer.concat([bytes(cipher.update(plaintext, 'utf8')), bytes(cipher.final())]);
  const tag = cipher.getAuthTag();
  return [VERSION, base64url(iv), base64url(tag), base64url(ciphertext)].join('.');
}

/** Decrypts a stored TOTP secret; a value this key did not write raises. */
export function decryptSecret(stored: string, key: Buffer): string {
  assertKey(key);
  const [version, ivPart, tagPart, ciphertextPart] = stored.split('.');
  if (version !== VERSION || !ivPart || !tagPart || !ciphertextPart) {
    throw new Error('the stored TOTP secret is not in the format this key wrote');
  }

  const iv = fromBase64url(ivPart);
  const tag = fromBase64url(tagPart);
  const ciphertext = fromBase64url(ciphertextPart);
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('the stored TOTP secret carries a malformed IV or tag');
  }

  const decipher = createDecipheriv('aes-256-gcm', bytes(key), bytes(iv));
  decipher.setAuthTag(bytes(tag));
  return Buffer.concat([bytes(decipher.update(bytes(ciphertext))), bytes(decipher.final())]).toString('utf8');
}

/**
 * Loads the hub's authentication key, creating it on first start.
 *
 * The key is 32 random bytes in its own file next to the database, written with owner-only
 * permissions. Losing the file means every TOTP enrolment has to be repeated; that is the
 * honest cost of not keeping the secret next to the data it protects.
 */
export function loadOrCreateAuthKey(file: string): Buffer {
  if (existsSync(file)) {
    const key = readFileSync(file);
    if (key.length !== AUTH_KEY_BYTES) {
      throw new Error(`the authentication key in ${file} must be ${AUTH_KEY_BYTES} bytes`);
    }
    return key;
  }

  mkdirSync(path.dirname(file), { recursive: true });
  const key = randomBytes(AUTH_KEY_BYTES);
  writeFileSync(file, bytes(key), { mode: 0o600 });
  try {
    // Windows ignores the mode; where it is honoured, make sure the umask did not widen it.
    chmodSync(file, 0o600);
  } catch {
    // A filesystem that cannot express the mode is not a reason to refuse to start.
  }
  return key;
}

function assertKey(key: Buffer): void {
  if (key.length !== AUTH_KEY_BYTES) {
    throw new Error(`the authentication key must be ${AUTH_KEY_BYTES} bytes`);
  }
}

function base64url(value: Buffer): string {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
