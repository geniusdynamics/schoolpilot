// ABOUTME: Resolves the backup secret from a passphrase, a key file or the environment and
// ABOUTME: refuses a key file kept inside the backup directory; the archive derives its own key.

import { createHash, scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { BackupError } from './errors';

/** The operator's secret, plus the non-secret id an archive header records. */
export interface BackupSecret {
  readonly secret: Buffer;
  readonly keyId: string;
}

/** Where the hub may find the backup secret. */
export interface BackupSecretSource {
  readonly passphrase?: string;
  readonly keyFile?: string;
  /** Defaults to `process.env`; injectable so a test never depends on the machine's environment. */
  readonly env?: Readonly<Record<string, string | undefined>>;
  /** The archive directory; a key file inside it is refused. */
  readonly backupDir?: string;
}

/** The environment variable an unattended hub reads its passphrase from. */
export const BACKUP_PASSPHRASE_ENV = 'SCHOOLPILOT_BACKUP_PASSPHRASE';

/**
 * Resolves the secret, or null when none is configured.
 *
 * A key file is read as UTF-8 and must hold at least 16 bytes after trimming. The key is never
 * written anywhere: the archive stores a scrypt salt and a short key id, never the key itself,
 * and a key file placed inside the backup directory is refused because copying that directory
 * would copy the key with the ciphertext.
 */
export function resolveBackupSecret(source: BackupSecretSource): BackupSecret | null {
  const env = source.env ?? process.env;
  const passphrase = source.passphrase ?? env[BACKUP_PASSPHRASE_ENV];

  let material: Buffer | null = null;

  if (passphrase !== undefined && passphrase.length > 0) {
    material = Buffer.from(passphrase, 'utf8');
  }

  if (source.keyFile !== undefined) {
    const keyPath = path.resolve(source.keyFile);
    if (source.backupDir !== undefined && isInside(keyPath, path.resolve(source.backupDir))) {
      throw new BackupError(
        'key_invalid',
        `the backup key file must live outside the backup directory: ${keyPath}`
      );
    }

    let text: string;
    try {
      text = readFileSync(keyPath, 'utf8');
    } catch (error) {
      throw new BackupError('key_invalid', `the backup key file could not be read: ${keyPath}`, {
        cause: error,
      });
    }
    material = Buffer.from(text.trim(), 'utf8');
  }

  if (!material || material.length < 16) {
    if (material) {
      throw new BackupError('key_invalid', 'the backup key must hold at least 16 bytes');
    }
    return null;
  }

  return {
    secret: material,
    keyId: createHash('sha256').update(material).digest('hex').slice(0, 16),
  };
}

/** Derives the 32-byte AES key of one archive from the secret and that archive's salt. */
export function deriveArchiveKey(secret: Buffer, salt: Buffer): Buffer {
  // N=16384, r=8, p=1 is the scrypt cost OWASP treats as a floor for interactive use.
  return scryptSync(secret, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

/** True when `candidate` is inside `directory` (or is the directory itself). */
function isInside(candidate: string, directory: string): boolean {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
