// ABOUTME: The break cases of migration M1: a legacy database that cannot be migrated whole, and
// ABOUTME: the legacy data that disagrees with itself.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyCanonicalSchema,
  createNodeSqliteAdapter,
  type SqliteAdapter,
} from '@/data/adapters/sqlite';
import { createMigrationRunner, type MigrationRunner } from '@/data/migrations';

import { buildLegacyFixture, type LegacyFixtureOptions } from './001-legacy-fixture';
import {
  createInstitutionCalendarMigration,
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
  readMigrationReport,
} from './001-institution-calendar';

/** The day the migration runs on in the tests; the statuses are derived against it. */
const FIXED_NOW = new Date('2024-10-01T09:00:00.000Z');

async function readRows(
  adapter: SqliteAdapter,
  table: string
): Promise<Record<string, unknown>[]> {
  return adapter.all<Record<string, unknown>>(`SELECT * FROM "${table}" ORDER BY rowid`);
}

async function tableExists(adapter: SqliteAdapter, table: string): Promise<boolean> {
  const row = await adapter.get<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [table]
  );
  return row !== null;
}

describe('migration M1 on a legacy database without dormitories', () => {
  let adapter: SqliteAdapter;
  let runner: MigrationRunner;

  beforeEach(async () => {
    adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    await applyCanonicalSchema(adapter);
    await buildLegacyFixture(adapter, { withDormitories: false });
    runner = createMigrationRunner({
      adapter,
      migrations: [createInstitutionCalendarMigration({ now: () => FIXED_NOW })],
      now: () => FIXED_NOW,
    });
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('calls a school without dormitories a day school, and says so', async () => {
    const result = await runner.run();
    expect(result.status).toBe('completed');

    const institutions = await readRows(adapter, 'institution');
    expect(institutions[0].boarding_policy).toBe('day');

    const report = await readMigrationReport(adapter);
    expect(
      report.assumptions.some((message) =>
        message.includes('institution.boarding_policy was set to "day"')
      )
    ).toBe(true);
  });
});

describe('migration M1 on a legacy database whose school cannot be migrated', () => {
  let adapter: SqliteAdapter;

  const cases: readonly { readonly name: string; readonly options: LegacyFixtureOptions }[] = [
    { name: 'without a school profile', options: { withProfile: false } },
    { name: 'with a school type the canonical model does not know', options: { schoolType: 'Martian' } },
  ];

  beforeEach(async () => {
    adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    await applyCanonicalSchema(adapter);
  });

  afterEach(async () => {
    await adapter.close();
  });

  for (const testCase of cases) {
    it(`refuses to commit on a legacy database ${testCase.name}`, async () => {
      await buildLegacyFixture(adapter, testCase.options);
      const runner = createMigrationRunner({
        adapter,
        migrations: [createInstitutionCalendarMigration({ now: () => FIXED_NOW })],
        now: () => FIXED_NOW,
      });

      const result = await runner.run();
      expect(result.status).toBe('failed');
      expect(result.failed?.error).toContain('Migration M1 cannot migrate this database');

      // Nothing was written: the run rolled back with its ledger row.
      for (const table of [
        'institution',
        'institution_identifier',
        'calendar',
        'academic_year',
        'academic_period',
        'financial_year',
      ]) {
        expect(await readRows(adapter, table)).toHaveLength(0);
      }
      // The mapping tables never came into being either.
      expect(await tableExists(adapter, LEGACY_ID_MAP_TABLE)).toBe(false);
      expect(await tableExists(adapter, LEGACY_NOTES_TABLE)).toBe(false);
      expect(await tableExists(adapter, LEGACY_UNMAPPABLE_TABLE)).toBe(false);
    });
  }
});

describe('migration M1 on a database that already holds canonical rows', () => {
  let adapter: SqliteAdapter;
  let runner: MigrationRunner;

  beforeEach(async () => {
    adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    await applyCanonicalSchema(adapter);
    await buildLegacyFixture(adapter);
    await adapter.run(
      `INSERT INTO "institution" ("id", "name", "country", "ownership", "gender_policy",
         "boarding_policy", "default_locale", "time_zone", "base_currency", "created_at", "updated_at")
       VALUES ('00000000-0000-7000-8000-000000000001', 'Another school', 'KE', 'public', 'mixed',
         'day', 'en-KE', 'Africa/Nairobi', 'KES', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')`
    );
    runner = createMigrationRunner({
      adapter,
      migrations: [createInstitutionCalendarMigration({ now: () => FIXED_NOW })],
      now: () => FIXED_NOW,
    });
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('refuses to run, because the canonical data is newer than the legacy data', async () => {
    const result = await runner.run();
    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('already holds 1 row(s)');
    expect(await readRows(adapter, 'calendar')).toHaveLength(0);
  });
});

describe('migration M1 on legacy data with a stale active mark', () => {
  let adapter: SqliteAdapter;
  let runner: MigrationRunner;

  beforeEach(async () => {
    adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    await applyCanonicalSchema(adapter);
    // The legacy school marked the first term of the oldest year as the running one, and
    // never updated it.
    await buildLegacyFixture(adapter, { activePeriodId: 1 });
    runner = createMigrationRunner({
      adapter,
      migrations: [createInstitutionCalendarMigration({ now: () => FIXED_NOW })],
      now: () => FIXED_NOW,
    });
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('warns that the mark does not cover the migration day', async () => {
    const result = await runner.run();
    expect(result.status).toBe('completed');

    const report = await readMigrationReport(adapter);
    const stale = report.issues.filter((issue) => issue.code === 'stale_active_flag');
    expect(stale).toHaveLength(1);
    expect(stale[0].severity).toBe('warning');
    expect(stale[0].message).toContain('does not cover the migration day 2024-10-01');
    expect(stale[0].message).toContain('AY 2022/2023');
  });

  it('keeps the year the migration day falls in as the current one', async () => {
    await runner.run();

    const years = await readRows(adapter, 'academic_year');
    const current = years.find((row) => row.status === 'current');
    expect(current?.name).toBe('AY 2024/2025');
    const stale = years.find((row) => row.name === 'AY 2022/2023');
    expect(stale?.status).toBe('closed');
  });
});
