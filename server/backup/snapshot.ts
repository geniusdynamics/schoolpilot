// ABOUTME: Takes a consistent snapshot of a live SQLite database with VACUUM INTO and verifies a
// ABOUTME: database file's integrity and logical digest through a read-only connection.

import fs from 'node:fs';
import path from 'node:path';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';

import { digestDatabase } from './digest';
import { BackupError } from './errors';
import type { DatabaseDigest } from './types';

/**
 * Writes a consistent copy of the open database to `targetFile`.
 *
 * `VACUUM INTO` reads through the adapter's statement queue, so it never interleaves with a
 * write, and it produces a defragmented file with no WAL sidecars. Callers await
 * `repository.whenIdle()` first so a pending watch delivery is not still writing.
 */
export async function snapshotDatabase(adapter: SqliteAdapter, targetFile: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(targetFile), { recursive: true });
  await fs.promises.rm(targetFile, { force: true });

  try {
    await adapter.run('VACUUM INTO ?', [targetFile]);
  } catch (error) {
    throw new BackupError('backup_failed', `the database snapshot could not be taken: ${targetFile}`, {
      cause: error,
    });
  }
}

/**
 * Opens a database file read-only, checks SQLite's integrity report and hashes its contents.
 *
 * A snapshot that does not open, or that fails `integrity_check`, is not a backup and is
 * refused before its bytes are encrypted.
 */
export async function verifyDatabaseFile(filename: string): Promise<DatabaseDigest> {
  if (!fs.existsSync(filename)) {
    throw new BackupError('database_invalid', `the database file does not exist: ${filename}`);
  }

  const adapter = createNodeSqliteAdapter({ filename, readonly: true });
  await adapter.open();
  try {
    const integrity = await adapter.get<{ integrity_check: string }>('PRAGMA integrity_check');
    const verdict = integrity?.integrity_check ?? 'no result';
    if (verdict !== 'ok') {
      throw new BackupError('database_invalid', `the database failed its integrity check: ${verdict}`);
    }
    return await digestDatabase(adapter);
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError('database_invalid', `the database file could not be read: ${filename}`, {
      cause: error,
    });
  } finally {
    await adapter.close();
  }
}
