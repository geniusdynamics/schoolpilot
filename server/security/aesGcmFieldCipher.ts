// ABOUTME: The hub's restricted-data cipher: AES-256-GCM field sealing and the key's lifecycle,
// ABOUTME: which is the one secret whose loss makes encrypted columns unreadable.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import {
  RestrictedDataError,
  SEALED_PREFIX,
  type FieldCipher,
} from '@/data/security';

import { encryptedTables, tableExists } from './encryptedColumns';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/** The environment variable that supplies the key instead of the key file. */
export const RESTRICTED_KEY_ENV = 'SCHOOLPILOT_RESTRICTED_KEY';

/** The default key path under a hub's data directory. */
export function defaultRestrictedKeyFile(dataDir: string): string {
  return path.join(dataDir, 'keys', 'restricted-data.key');
}

/**
 * The hub's field cipher.
 *
 * The envelope is `enc:v1:<base64 iv>:<base64 tag>:<base64 ciphertext>`. It is self-describing,
 * so a future algorithm is a new prefix rather than a migration of the values already sealed, and
 * GCM's tag makes a tampered or truncated value an error instead of a wrong plaintext.
 */
export class AesGcmFieldCipher implements FieldCipher {
  private readonly key: Buffer;

  constructor(key: Buffer) {
    if (key.length !== KEY_BYTES) {
      throw new RestrictedDataError(
        'key_invalid',
        `the restricted-data key must be ${KEY_BYTES} bytes, not ${key.length}`
      );
    }
    this.key = key;
  }

  isSealed(value: string): boolean {
    return value.startsWith(SEALED_PREFIX);
  }

  seal(plaintext: string): string {
    if (this.isSealed(plaintext)) return plaintext;

    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [
      SEALED_PREFIX.slice(0, -1),
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  open(sealed: string): string {
    if (!this.isSealed(sealed)) return sealed;

    const parts = sealed.slice(SEALED_PREFIX.length).split(':');
    const [ivText, tagText, ciphertextText] = parts;
    if (parts.length !== 3 || !ivText || !tagText || ciphertextText === undefined) {
      throw new RestrictedDataError(
        'sealed_value_invalid',
        'the sealed value does not carry the iv, tag and ciphertext the envelope requires'
      );
    }

    const iv = Buffer.from(ivText, 'base64');
    const tag = Buffer.from(tagText, 'base64');
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
      throw new RestrictedDataError(
        'sealed_value_invalid',
        'the sealed value does not carry the iv, tag and ciphertext the envelope requires'
      );
    }

    try {
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertextText, 'base64')),
        decipher.final(),
      ]);
      return plaintext.toString('utf8');
    } catch {
      // A wrong key and a tampered value are indistinguishable here, and both mean the same
      // thing to the caller: this value cannot be trusted, so it is not returned.
      throw new RestrictedDataError(
        'sealed_value_invalid',
        'the sealed value cannot be opened with this key; it was sealed with another key or has been altered'
      );
    }
  }
}

/** Options for loading or creating the hub's restricted-data key. */
export interface RestrictedKeyOptions {
  /** The directory the key file lives under. */
  readonly dataDir: string;
  /** The open database, read to tell "no key yet" from "the key was lost". */
  readonly adapter?: SqliteAdapter;
  /** A key given inline (base64 or hex), for tests and for a deployment that injects it. */
  readonly key?: string;
  /** The key file; `<dataDir>/keys/restricted-data.key` when omitted. */
  readonly keyFile?: string;
}

/**
 * The key the hub seals restricted values with.
 *
 * Order of precedence: an inline key, then `SCHOOLPILOT_RESTRICTED_KEY`, then the key file. When
 * there is no key and the database already holds sealed values the hub refuses to start: a
 * freshly generated key would leave those rows unreadable while the hub happily reported healthy.
 * With no sealed values there is nothing to lose, so a key is generated and written 0600 inside a
 * 0700 directory.
 */
export async function loadOrCreateRestrictedKey(
  options: RestrictedKeyOptions
): Promise<Buffer> {
  if (options.key !== undefined) return parseKey(options.key, 'the supplied key');

  const fromEnv = process.env[RESTRICTED_KEY_ENV];
  if (fromEnv !== undefined && fromEnv.trim() !== '') {
    return parseKey(fromEnv, RESTRICTED_KEY_ENV);
  }

  const keyFile = options.keyFile ?? defaultRestrictedKeyFile(options.dataDir);
  if (existsSync(keyFile)) {
    return parseKey(readFileSync(keyFile, 'utf8'), keyFile);
  }

  if (options.adapter && (await containsSealedValues(options.adapter))) {
    throw new RestrictedDataError(
      'key_missing',
      `the database holds encrypted restricted values but no key was found at ${keyFile} and ` +
        `${RESTRICTED_KEY_ENV} is not set. Those values cannot be read without the key they were ` +
        'sealed with; restore the key file from backup, or set the environment variable, and start again.'
    );
  }

  const key = randomBytes(KEY_BYTES);
  const directory = path.dirname(keyFile);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  writeFileSync(keyFile, `${key.toString('base64')}\n`, { encoding: 'utf8', mode: 0o600 });
  chmodSync(keyFile, 0o600);
  return key;
}

/** Builds the cipher a hub seals and opens restricted values with. */
export async function createRestrictedDataCipher(
  options: RestrictedKeyOptions
): Promise<AesGcmFieldCipher> {
  return new AesGcmFieldCipher(await loadOrCreateRestrictedKey(options));
}

/** True when any encrypted column already holds a sealed value. */
export async function containsSealedValues(adapter: SqliteAdapter): Promise<boolean> {
  for (const { table, columns } of encryptedTables()) {
    if (!(await tableExists(adapter, table))) continue;
    for (const column of columns) {
      const hit = await adapter.get<{ hit: number }>(
        `SELECT 1 AS hit FROM "${table}" WHERE "${column}" LIKE ? LIMIT 1`,
        [`${SEALED_PREFIX}%`]
      );
      if (hit) return true;
    }
  }
  return false;
}

/** Reads a base64 or hex key, refusing anything that is not 32 bytes. */
function parseKey(value: string, source: string): Buffer {
  const text = value.trim();
  const key = /^[0-9a-fA-F]{64}$/.test(text)
    ? Buffer.from(text, 'hex')
    : Buffer.from(text, 'base64');

  if (key.length !== KEY_BYTES) {
    throw new RestrictedDataError(
      'key_invalid',
      `${source} does not hold a ${KEY_BYTES}-byte key (base64 or hex); it decoded to ${key.length} bytes`
    );
  }
  return key;
}
