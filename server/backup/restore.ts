// ABOUTME: Restores one encrypted archive into a fresh directory, proving both the plaintext
// ABOUTME: hash and the restored database's logical digest before it reports success.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { decodeArchive } from './archive';
import { overallDigest } from './digest';
import { BackupError } from './errors';
import type { BackupSecret } from './key';
import { verifyDatabaseFile } from './snapshot';
import type { RestoreResult } from './types';

export interface RestoreArchiveOptions {
  readonly backupFile: string;
  /** The directory to write `schoolpilot.db` into; it must not already hold one. */
  readonly targetDir: string;
  readonly secret: BackupSecret;
  readonly now?: Date;
}

/**
 * Decrypts an archive and writes it into `targetDir`.
 *
 * The receipt is only written after the restored file passes `PRAGMA integrity_check` and its
 * logical digest matches the table digests in the header. A failed check removes the file, so a
 * half-restored database can never be mistaken for a usable one.
 */
export async function restoreArchive(options: RestoreArchiveOptions): Promise<RestoreResult> {
  const now = options.now ?? new Date();
  if (!fs.existsSync(options.backupFile)) {
    throw new BackupError('backup_not_found', `there is no backup at ${options.backupFile}`);
  }

  const targetFile = path.join(options.targetDir, 'schoolpilot.db');
  if (fs.existsSync(targetFile)) {
    throw new BackupError(
      'restore_target_exists',
      `refusing to overwrite the database at ${targetFile}; restore into a new directory`
    );
  }

  const archive = await fs.promises.readFile(options.backupFile);
  const { header, plaintext } = decodeArchive(archive, options.secret);

  const contentDigest = sha256(plaintext);
  if (contentDigest !== header.content.digest) {
    throw new BackupError(
      'digest_mismatch',
      `the decrypted content hashes to ${contentDigest}, not the ${header.content.digest} the header records`
    );
  }

  await fs.promises.mkdir(options.targetDir, { recursive: true });
  const temporary = `${targetFile}.${process.pid}.tmp`;
  await fs.promises.writeFile(temporary, plaintext);
  await fs.promises.rename(temporary, targetFile);

  let digest;
  try {
    digest = await verifyDatabaseFile(targetFile);
  } catch (error) {
    await fs.promises.rm(targetFile, { force: true });
    throw error;
  }

  const expected = overallDigest(header.content.tables);
  if (digest.overall !== expected) {
    await fs.promises.rm(targetFile, { force: true });
    throw new BackupError(
      'digest_mismatch',
      `the restored database hashes to ${digest.overall}, not the ${expected} the backup records`
    );
  }

  const restoredAt = now.toISOString();
  const receipt = {
    format: 'schoolpilot-restore',
    version: 1,
    backupId: header.id,
    backupCreatedAt: header.createdAt,
    restoredAt,
    databaseFile: targetFile,
    digest: digest.overall,
    rows: digest.rows,
  };
  await fs.promises.writeFile(
    path.join(options.targetDir, 'restore.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8'
  );

  return {
    backupId: header.id,
    restoredAt,
    databaseFile: targetFile,
    bytes: plaintext.length,
    digest,
  };
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}
