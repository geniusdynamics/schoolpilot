// ABOUTME: Tests restore validation of a database image in a throwaway in-memory database: a real
// ABOUTME: canonical image passes, a non-SQLite or foreign file is refused, and so is a newer schema.

import { describe, expect, it } from 'vitest';

import { applyCanonicalSchema, createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { fixtureRow, insertRow } from '@/data/adapters/sqlite/__tests__/helpers';
import { applySchemaMigrations, KNOWN_MIGRATION_VERSIONS } from '@/data/migrations';

import { BackupValidationError, inspectDatabaseImage } from '../validate';

async function openEmpty(): Promise<SqliteAdapter> {
  const adapter = createNodeSqliteAdapter();
  await adapter.open();
  return adapter;
}

/** A canonical database the way the app leaves one: the entity tables, the module schemas, a school. */
async function canonicalImage(change?: (adapter: SqliteAdapter) => Promise<void>): Promise<Uint8Array> {
  const adapter = await openEmpty();
  try {
    await applyCanonicalSchema(adapter);
    await applySchemaMigrations(adapter);
    await insertRow(adapter, 'institution', { ...fixtureRow('institution'), name: 'Mwangaza Academy' });
    await change?.(adapter);
    return await adapter.exportDatabase();
  } finally {
    await adapter.close();
  }
}

async function legacyImage(): Promise<Uint8Array> {
  const adapter = await openEmpty();
  try {
    await adapter.exec('CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT)');
    await adapter.run('INSERT INTO users (id, username) VALUES (?, ?)', ['u1', 'grace']);
    return await adapter.exportDatabase();
  } finally {
    await adapter.close();
  }
}

const refusal = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught
  );
  expect(error).toBeInstanceOf(BackupValidationError);
  return error as BackupValidationError;
};

describe('inspectDatabaseImage', () => {
  it('accepts a canonical image and reports its migrations', async () => {
    const report = await inspectDatabaseImage(await canonicalImage(), 'canonical', openEmpty);

    expect(report.migrations.length).toBeGreaterThan(0);
    expect(report.migrations.every((version) => KNOWN_MIGRATION_VERSIONS.includes(version))).toBe(true);
    expect(report.rowCounts.learner).toBe(0);
    expect(report.rowCounts.institution).toBe(1);
    expect(report.institutionName).toBe('Mwangaza Academy');
  });

  it('accepts a legacy image with its user table and counts its rows', async () => {
    const report = await inspectDatabaseImage(await legacyImage(), 'legacy', openEmpty);
    expect(report.rowCounts.users).toBe(1);
    expect(report.migrations).toEqual([]);
  });

  it('refuses a file that is not a SQLite database', async () => {
    const error = await refusal(
      inspectDatabaseImage(new TextEncoder().encode('{"collections":{}}'), 'canonical', openEmpty)
    );
    expect(error.code).toBe('not_sqlite');
  });

  it('refuses a SQLite file that is not a SchoolPilot canonical database', async () => {
    const error = await refusal(inspectDatabaseImage(await legacyImage(), 'canonical', openEmpty));
    expect(error.code).toBe('missing_tables');
    expect(error.message).toMatch(/institution/);
  });

  it('refuses an image whose schema was written by a newer build', async () => {
    const newest = Math.max(...KNOWN_MIGRATION_VERSIONS);
    const image = await canonicalImage(async (adapter) => {
      await adapter.run(
        "INSERT INTO _migrations (version, name, checksum, checksum_kind, applied_at) VALUES (?, 'from-the-future', 'x', 'explicit', '2027-01-01T00:00:00Z')",
        [newest + 1]
      );
    });

    const error = await refusal(inspectDatabaseImage(image, 'canonical', openEmpty));
    expect(error.code).toBe('newer_schema');
    expect(error.message).toMatch(String(newest + 1));
  });

  it('accepts an image from an older build that has applied fewer migrations', async () => {
    const newest = Math.max(...KNOWN_MIGRATION_VERSIONS);
    const image = await canonicalImage(async (adapter) => {
      await adapter.run('DELETE FROM _migrations WHERE version = ?', [newest]);
    });

    const report = await inspectDatabaseImage(image, 'canonical', openEmpty);
    expect(report.migrations).not.toContain(newest);
  });
});
