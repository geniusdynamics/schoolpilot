// ABOUTME: The node-only backup strategy: copies the database file before a migration runs.
// ABOUTME: Kept out of the package barrel so a browser bundle never pulls in node:fs.

import { generateUuidv7 } from '@/domain/ids';

import type {
  MigrationBackup,
  MigrationBackupStrategy,
  MigrationDescriptor,
} from './types';

export interface FileBackupStrategyOptions {
  /** The database file the backup is copied from. */
  readonly source: string;
  /** The directory the backups are written to. */
  readonly directory: string;
  /** Prefix of the backup file name. */
  readonly label?: string;
}

interface NodeFileSystem {
  copyFile(from: string, to: string): Promise<void>;
  mkdir(directory: string, options: { recursive: boolean }): Promise<string | undefined>;
  rm(path: string, options: { force: boolean }): Promise<void>;
  stat(path: string): Promise<{ size: number }>;
}

async function nodeFileSystem(): Promise<NodeFileSystem> {
  const loaded = (await import(/* @vite-ignore */ 'node:fs/promises')) as unknown as NodeFileSystem;
  return loaded;
}

interface CheckpointRow {
  readonly busy: number;
  readonly log: number;
}

/**
 * Checkpoints the write-ahead log into the database file.
 *
 * A database in WAL mode keeps the transactions that were committed after the last
 * checkpoint in a separate file. A copy of the database file alone would miss them, so
 * the log is checkpointed first: the copy then holds every transaction that was committed
 * before the copy started.
 */
async function checkpoint(adapter: {
  all: <T extends object>(sql: string) => Promise<T[]>;
}): Promise<void> {
  const rows = await adapter.all<CheckpointRow>('PRAGMA wal_checkpoint(TRUNCATE)');
  const row = rows[0];
  if (!row) return;
  // A database that is not in WAL mode reports no log to checkpoint.
  if (row.log === -1) return;
  if (row.busy === 1) {
    throw new Error(
      'the write-ahead log could not be checkpointed, so the copy would not hold every committed transaction'
    );
  }
}

/**
 * The node backup strategy: the database file is copied before the migration runs.
 *
 * The guarantee the copy gives: it holds every transaction that was committed before the
 * copy started. It does not cover a write that commits while the copy is being taken, so
 * the database has to be quiet while the copy runs - the framework takes the backup
 * before a migration opens its transaction, which is exactly such a moment.
 *
 * Restoring closes the adapter and copies the backup back over the database file; the
 * caller opens the database again afterwards.
 */
export function createFileBackupStrategy(
  options: FileBackupStrategyOptions
): MigrationBackupStrategy {
  const label = options.label ?? 'backup';

  return {
    async take(adapter, migration: MigrationDescriptor) {
      const fs = await nodeFileSystem();
      await checkpoint(adapter);
      await fs.mkdir(options.directory, { recursive: true });
      const id = generateUuidv7();
      const location = `${options.directory}/${label}-${id}.sqlite`;
      await fs.copyFile(options.source, location);
      const stats = await fs.stat(location);
      return {
        id,
        version: migration.version,
        migrationName: migration.name,
        kind: 'file',
        location,
        createdAt: new Date().toISOString(),
        bytes: stats.size,
      } satisfies MigrationBackup;
    },

    async restore(backup: MigrationBackup, adapter) {
      const fs = await nodeFileSystem();
      await adapter.close();
      await fs.copyFile(backup.location, options.source);
    },

    async discard(backup: MigrationBackup) {
      const fs = await nodeFileSystem();
      await fs.rm(backup.location, { force: true });
    },
  };
}
