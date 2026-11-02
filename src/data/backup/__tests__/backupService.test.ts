// ABOUTME: Tests the backup and restore sequence over two real node databases: a backup restores the
// ABOUTME: data it holds, a bad upload changes nothing, and a failed second replace puts the first back.

import { webcrypto } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import { applyCanonicalSchema, createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { fixtureRow, insertRow } from '@/data/adapters/sqlite/__tests__/helpers';
import { applySchemaMigrations, KNOWN_MIGRATION_VERSIONS } from '@/data/migrations';

import { buildBackupArchive } from '../archive';
import { readZip } from '../zip';
import {
  applyRestore,
  BackupRestoreError,
  createBackup,
  prepareRestore,
  type BackupDatabase,
  type BackupEnvironment,
} from '../backupService';
import { BackupValidationError } from '../validate';

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
});

async function openEmpty(): Promise<SqliteAdapter> {
  const adapter = createNodeSqliteAdapter();
  await adapter.open();
  return adapter;
}

function database(adapter: SqliteAdapter, fileName: string): BackupDatabase {
  return {
    fileName,
    exportDatabase: () => adapter.exportDatabase(),
    importDatabase: (bytes) => adapter.importDatabase(bytes),
  };
}

interface School {
  canonical: SqliteAdapter;
  legacy: SqliteAdapter;
  env: BackupEnvironment;
  saved: { name: string; bytes: Uint8Array }[];
}

async function school(name: string): Promise<School> {
  const canonical = await openEmpty();
  await applyCanonicalSchema(canonical);
  await applySchemaMigrations(canonical);
  await insertRow(canonical, 'institution', { ...fixtureRow('institution'), name });

  const legacy = await openEmpty();
  await legacy.exec('CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT)');
  await legacy.run('INSERT INTO users (id, username) VALUES (?, ?)', ['u1', `${name} admin`]);

  const saved: { name: string; bytes: Uint8Array }[] = [];
  return {
    canonical,
    legacy,
    saved,
    env: {
      canonical: database(canonical, 'schoolpilot-canonical.sqlite3'),
      legacy: database(legacy, 'schoolpilot_production.sqlite3'),
      appVersion: '3.4.0',
      dataMode: 'production',
      openEmpty,
      now: () => new Date('2026-11-02T10:15:00.000Z'),
      safetyCopies: {
        save: async (fileName, bytes) => {
          saved.push({ name: fileName, bytes });
          return `opfs:${fileName}`;
        },
      },
    },
  };
}

const institutionName = async (adapter: SqliteAdapter) =>
  (await adapter.get<{ name: string }>('SELECT name FROM institution'))?.name;
const usernames = async (adapter: SqliteAdapter) =>
  (await adapter.all<{ username: string }>('SELECT username FROM users ORDER BY id')).map((row) => row.username);

async function close(...schools: School[]) {
  for (const entry of schools) {
    await entry.canonical.close();
    await entry.legacy.close();
  }
}

describe('backup and restore', () => {
  it('names the file after the school and records what it holds', async () => {
    const source = await school('Mwangaza Academy');
    try {
      const backup = await createBackup(source.env);
      expect(backup.fileName).toBe('schoolpilot-backup-mwangaza-academy-20261102-1015.zip');
      expect(backup.manifest.institutionName).toBe('Mwangaza Academy');
      expect(backup.manifest.encryption).toBe('none');
      expect(backup.manifest.files.map((file) => file.name)).toEqual([
        'schoolpilot-canonical.sqlite3',
        'schoolpilot_production.sqlite3',
      ]);
      expect(backup.manifest.files[0].rowCounts.institution).toBe(1);
      expect(backup.manifest.files[1].rowCounts.users).toBe(1);

      const encrypted = await createBackup(source.env, { passphrase: 'mwangaza-backup-2026' });
      expect(encrypted.fileName).toBe('schoolpilot-backup-mwangaza-academy-20261102-1015.spbackup');
    } finally {
      await close(source);
    }
  });

  it('restores a backup into another install and keeps a safety copy of what it replaced', async () => {
    const source = await school('Mwangaza Academy');
    const target = await school('Placeholder School');
    try {
      const backup = await createBackup(source.env, { passphrase: 'mwangaza-backup-2026' });

      const prepared = await prepareRestore(target.env, backup.bytes, 'mwangaza-backup-2026');
      expect(prepared.manifest.institutionName).toBe('Mwangaza Academy');
      // Preparing touches nothing.
      expect(await institutionName(target.canonical)).toBe('Placeholder School');

      const result = await applyRestore(target.env, prepared);

      expect(await institutionName(target.canonical)).toBe('Mwangaza Academy');
      expect(await usernames(target.legacy)).toEqual(['Mwangaza Academy admin']);
      expect(result.safetyCopy).toBe('opfs:backup-before-restore-20261102-101500.zip');
      // The safety copy is itself a restorable archive of the replaced data.
      expect(readZip(target.saved[0].bytes).map((entry) => entry.name)).toContain('schoolpilot-canonical.sqlite3');
      const undo = await prepareRestore(target.env, target.saved[0].bytes);
      expect(undo.manifest.institutionName).toBe('Placeholder School');
    } finally {
      await close(source, target);
    }
  });

  it('refuses a newer schema before anything is replaced', async () => {
    const source = await school('Mwangaza Academy');
    const target = await school('Placeholder School');
    try {
      await source.canonical.run(
        "INSERT INTO _migrations (version, name, checksum, checksum_kind, applied_at) VALUES (?, 'later', 'x', 'explicit', '2027-01-01T00:00:00Z')",
        [Math.max(...KNOWN_MIGRATION_VERSIONS) + 1]
      );
      // An archive the way a newer build writes it: this build would refuse to back up such a
      // database, so the archive is assembled directly.
      const archive = await buildBackupArchive({
        createdAt: '2026-11-02T10:15:00.000Z',
        appVersion: '9.0.0',
        dataMode: 'production',
        institutionName: 'Mwangaza Academy',
        files: [
          { role: 'canonical', name: 'schoolpilot-canonical.sqlite3', bytes: await source.canonical.exportDatabase(), migrations: [], rowCounts: {} },
          { role: 'legacy', name: 'schoolpilot_production.sqlite3', bytes: await source.legacy.exportDatabase(), migrations: [], rowCounts: {} },
        ],
      });

      await expect(prepareRestore(target.env, archive.bytes)).rejects.toBeInstanceOf(BackupValidationError);
      expect(await institutionName(target.canonical)).toBe('Placeholder School');
      expect(target.saved).toEqual([]);
    } finally {
      await close(source, target);
    }
  });

  it('puts the first database back when the second cannot be replaced', async () => {
    const source = await school('Mwangaza Academy');
    const target = await school('Placeholder School');
    try {
      const prepared = await prepareRestore(target.env, (await createBackup(source.env)).bytes);
      let legacyImports = 0;
      const failingLegacy: BackupDatabase = {
        ...target.env.legacy,
        importDatabase: async (bytes) => {
          legacyImports += 1;
          // The restore's import fails; the rollback's import of the old file goes through.
          if (legacyImports === 1) throw new Error('the storage worker stopped');
          await target.legacy.importDatabase(bytes);
        },
      };

      const error = await applyRestore({ ...target.env, legacy: failingLegacy }, prepared).catch(
        (caught: unknown) => caught
      );

      expect(error).toBeInstanceOf(BackupRestoreError);
      expect((error as BackupRestoreError).rolledBack).toBe(true);
      expect((error as Error).message).toMatch(/the storage worker stopped/);
      expect(await institutionName(target.canonical)).toBe('Placeholder School');
      expect(await usernames(target.legacy)).toEqual(['Placeholder School admin']);
    } finally {
      await close(source, target);
    }
  });
});
