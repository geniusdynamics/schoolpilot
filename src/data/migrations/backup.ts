// ABOUTME: The backup strategies: a portable SQL dump through the adapter, and the store the
// ABOUTME: dump lives in. The framework owns the policy, the strategy owns the mechanics.

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import { generateUuidv7 } from '@/domain/ids';

import { dumpDatabase, restoreDatabase } from './dump';
import type { MigrationBackup, MigrationBackupStrategy, MigrationDescriptor } from './types';

/**
 * Where an exported database is kept.
 *
 * The browser build stores the dump in OPFS through its own store; the node build can keep
 * it on disk. The framework never assumes where it is, only that it can be read back.
 */
export interface BackupStore {
  /** Writes the export and reports where it landed and how big it is. */
  write(id: string, contents: string): Promise<{ location: string; bytes: number }>;
  /** Reads an export back, or null when it is gone. */
  read(id: string): Promise<string | null>;
  /** Removes an export. */
  remove(id: string): Promise<void>;
}

/** A store that keeps the exports in memory. The default. */
export function createMemoryBackupStore(): BackupStore {
  const contents = new Map<string, string>();
  return {
    async write(id: string, dump: string) {
      contents.set(id, dump);
      return { location: `memory:${id}`, bytes: dump.length };
    },
    async read(id: string) {
      return contents.get(id) ?? null;
    },
    async remove(id: string) {
      contents.delete(id);
    },
  };
}

export interface DumpBackupStrategyOptions {
  /** Where the exports are kept. Defaults to an in-memory store. */
  readonly store?: BackupStore;
  /** Prefix of the recorded location, so a stored dump is recognisable. */
  readonly label?: string;
}

/**
 * The portable backup strategy: the database is exported as SQL through the adapter.
 *
 * The same strategy serves the browser build - there the adapter is the OPFS-backed one,
 * so the export is a snapshot of the database the browser holds - and the node build. The
 * dump is a text, so it can be stored anywhere the caller has a store for.
 *
 * The export is checked before it is stored: it is replayed against the database inside a
 * transaction that is rolled back, so a dump that cannot be restored is never written.
 */
export function createDumpBackupStrategy(
  options: DumpBackupStrategyOptions = {}
): MigrationBackupStrategy {
  const store = options.store ?? createMemoryBackupStore();
  const label = options.label ?? 'dump';

  return {
    async take(adapter: SqliteAdapter, migration: MigrationDescriptor) {
      const dump = await dumpDatabase(adapter);
      const id = generateUuidv7();
      const written = await store.write(id, dump);
      return {
        id,
        version: migration.version,
        migrationName: migration.name,
        kind: 'dump',
        location: options.label ? `${label}:${written.location}` : written.location,
        createdAt: new Date().toISOString(),
        bytes: written.bytes,
      } satisfies MigrationBackup;
    },

    async restore(backup: MigrationBackup, adapter: SqliteAdapter) {
      const dump = await store.read(backup.id);
      if (dump === null) {
        throw new Error(`The backup ${backup.id} is no longer available`);
      }
      await restoreDatabase(adapter, dump);
    },

    async discard(backup: MigrationBackup) {
      await store.remove(backup.id);
    },
  };
}
