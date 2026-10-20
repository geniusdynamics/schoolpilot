// ABOUTME: The fixture migration test for M1: a legacy database built from the P0-era seed data
// ABOUTME: with the awkward rows added, migrated, verified and rolled back.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyCanonicalSchema,
  createNodeSqliteAdapter,
  type SqliteAdapter,
} from '@/data/adapters/sqlite';
import {
  createDumpBackupStrategy,
  createMigrationRunner,
  type MigrationRunner,
} from '@/data/migrations';

import { buildLegacyFixture } from './001-legacy-fixture';
import {
  createInstitutionCalendarMigration,
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
  readMigrationReport,
} from './001-institution-calendar';

/** The day the migration runs on in the tests; the statuses are derived against it. */
const FIXED_NOW = new Date('2024-10-01T09:00:00.000Z');

/** The only id format the canonical model stores (spec 02 §1.1). */
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

describe('migration M1: the institution and the calendar', () => {
  let adapter: SqliteAdapter;
  let runner: MigrationRunner;

  beforeEach(async () => {
    adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    await applyCanonicalSchema(adapter);
    await buildLegacyFixture(adapter);
    runner = createMigrationRunner({
      adapter,
      migrations: [createInstitutionCalendarMigration({ now: () => FIXED_NOW })],
      backup: createDumpBackupStrategy(),
      now: () => FIXED_NOW,
    });
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('migrates the school profile into the canonical institution', async () => {
    const result = await runner.run();
    expect(result.status).toBe('completed');

    const institutions = await readRows(adapter, 'institution');
    expect(institutions).toHaveLength(1);
    const [institution] = institutions;
    expect(institution.name).toBe('Greenwood High International');
    expect(institution.ownership).toBe('international');
    expect(institution.gender_policy).toBe('mixed');
    // The legacy school has dormitories, so it is a boarding school.
    expect(institution.boarding_policy).toBe('boarding');
    expect(institution.country).toBe('KE');
    expect(institution.region).toBe('Nairobi');
    expect(institution.motto).toBe('Excellence and Integrity');
    expect(institution.default_locale).toBe('en-KE');
    expect(institution.time_zone).toBe('Africa/Nairobi');
    expect(institution.base_currency).toBe('KES');
    // The legacy logo is a file path, not an attachment id, so it is not carried over.
    expect(institution.logo_attachment_id).toBeNull();

    const identifiers = await readRows(adapter, 'institution_identifier');
    expect(identifiers).toHaveLength(1);
    expect(identifiers[0].scheme).toBe('legacy.school_code');
    expect(identifiers[0].value).toBe('GHI001');
    expect(identifiers[0].institution_id).toBe(institution.id);
  });

  it('gives every canonical row a new UUIDv7 id, never a legacy numeric one', async () => {
    await runner.run();

    const tables = [
      'institution',
      'institution_identifier',
      'calendar',
      'academic_year',
      'academic_period',
      'financial_year',
    ];
    const ids: string[] = [];
    for (const table of tables) {
      for (const row of await readRows(adapter, table)) {
        ids.push(String(row.id));
      }
    }
    expect(ids.length).toBe(20);
    for (const id of ids) {
      expect(id).toMatch(UUID_V7);
    }
    expect(ids).not.toContain('1');
    expect(ids).not.toContain('2');
  });

  it('maps every year structure onto its own calendar', async () => {
    await runner.run();

    const calendars = await readRows(adapter, 'calendar');
    expect(calendars).toHaveLength(2);
    expect(calendars.map((row) => row.name).sort()).toEqual([
      'Semester System (2 Semesters)',
      'Standard 3-Term System',
    ]);
    const institutions = await readRows(adapter, 'institution');
    for (const calendar of calendars) {
      expect(calendar.institution_id).toBe(institutions[0].id);
    }
  });

  it('keeps the academic year dates and links the year to its calendar and financial year', async () => {
    await runner.run();

    const years = await readRows(adapter, 'academic_year');
    expect(years).toHaveLength(4);

    const current = years.find((row) => row.name === 'AY 2024/2025');
    expect(current).toBeDefined();
    expect(current?.start_date).toBe('2024-09-01');
    expect(current?.end_date).toBe('2025-06-30');
    expect(current?.status).toBe('current');

    const calendars = await readRows(adapter, 'calendar');
    expect(calendars.find((row) => row.id === current?.calendar_id)?.name).toBe(
      'Standard 3-Term System'
    );

    const financialYears = await readRows(adapter, 'financial_year');
    expect(financialYears.find((row) => row.id === current?.financial_year_id)?.name).toBe(
      'FY 2024'
    );

    // The year before the first financial year the legacy school had keeps no financial year.
    const oldest = years.find((row) => row.name === 'AY 2022/2023');
    expect(oldest?.financial_year_id).toBeNull();
    expect(oldest?.status).toBe('closed');

    // The year the legacy school had not started yet is planned.
    const future = years.find((row) => row.name === 'AY 2025/2026');
    expect(future?.status).toBe('planned');
  });

  it('keeps the period dates and links the period to its academic year', async () => {
    await runner.run();

    const periods = await readRows(adapter, 'academic_period');
    expect(periods).toHaveLength(9);

    const years = await readRows(adapter, 'academic_year');
    const current = years.find((row) => row.name === 'AY 2024/2025');
    const term = periods.find(
      (row) =>
        row.academic_year_id === current?.id && row.kind === 'term' && row.sequence === 1
    );
    expect(term).toBeDefined();
    expect(term?.name).toBe('Term 1');
    expect(term?.start_date).toBe('2024-09-01');
    expect(term?.end_date).toBe('2024-12-15');
    expect(term?.status).toBe('current');
    expect(term?.is_reporting).toBe(1);
    expect(term?.is_billing).toBe(1);
  });

  it('maps the financial years and keeps their bounds', async () => {
    await runner.run();

    const financialYears = await readRows(adapter, 'financial_year');
    expect(financialYears).toHaveLength(3);
    const current = financialYears.find((row) => row.name === 'FY 2024');
    expect(current?.start_date).toBe('2024-07-01');
    expect(current?.end_date).toBe('2025-06-30');
    expect(current?.status).toBe('current');
    const closed = financialYears.find((row) => row.name === 'FY 2023');
    expect(closed?.status).toBe('closed');
    const planned = financialYears.find((row) => row.name === 'FY 2025');
    expect(planned?.status).toBe('planned');
  });

  it('records the id map so a later migration can follow a legacy reference', async () => {
    await runner.run();

    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    expect(map).toHaveLength(20);

    const legacyYear = map.find(
      (row) => row.legacy_table === 'academic_years' && row.legacy_id === '3'
    );
    const legacyPeriod = map.find(
      (row) => row.legacy_table === 'school_periods' && row.legacy_id === '7'
    );
    expect(legacyYear).toBeDefined();
    expect(legacyPeriod).toBeDefined();
    expect(legacyYear?.canonical_entity).toBe('academic_year');
    expect(legacyPeriod?.canonical_entity).toBe('academic_period');

    // The period the legacy school held for that year points at the canonical year.
    const periods = await readRows(adapter, 'academic_period');
    const period = periods.find((row) => row.id === legacyPeriod?.canonical_id);
    expect(period?.academic_year_id).toBe(legacyYear?.canonical_id);

    // The legacy structure the year names points at the canonical calendar.
    const legacyStructure = map.find(
      (row) => row.legacy_table === 'academic_year_structures' && row.legacy_id === '1'
    );
    const years = await readRows(adapter, 'academic_year');
    const year = years.find((row) => row.id === legacyYear?.canonical_id);
    expect(year?.calendar_id).toBe(legacyStructure?.canonical_id);
  });

  it('verifies the counts and the dates and reports the periods the legacy school left outside their year', async () => {
    await runner.run();

    const report = await readMigrationReport(adapter);
    expect(report.counts.before).toEqual({
      institution: 1,
      institution_identifier: 1,
      calendar: 2,
      academic_year: 4,
      academic_period: 11,
      financial_year: 3,
    });
    expect(report.counts.after).toEqual({
      institution: 1,
      institution_identifier: 1,
      calendar: 2,
      academic_year: 4,
      academic_period: 9,
      financial_year: 3,
    });
    expect(report.counts.stray).toEqual({
      institution: 0,
      institution_identifier: 0,
      calendar: 0,
      academic_year: 0,
      academic_period: 0,
      financial_year: 0,
    });

    // Every check that must hold holds: the dates the migration wrote are the legacy dates.
    const failures = report.checks.filter((entry) => !entry.ok && entry.severity === 'error');
    expect(failures).toEqual([]);

    // The seed data leaves the third term of every year outside the year; the migration reports
    // it instead of inventing a date that would satisfy the rule.
    const warnings = report.checks.filter((entry) => !entry.ok);
    expect(warnings).toHaveLength(3);
    expect(warnings.every((entry) => entry.check === 'period_within_year')).toBe(true);

    // The counts themselves are checked, the institution identifier included.
    const countChecks = report.checks.filter((entry) => entry.check === 'count');
    expect(countChecks).toHaveLength(6);
    expect(countChecks.every((entry) => entry.ok)).toBe(true);
    expect(countChecks.map((entry) => entry.entity)).toContain('institution_identifier');
  });

  it('reports the rows it could not map instead of dropping them', async () => {
    await runner.run();

    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    expect(unmappable).toHaveLength(2);

    const missingYear = unmappable.find((row) => row.legacy_id === '10');
    expect(missingYear?.legacy_table).toBe('school_periods');
    expect(missingYear?.canonical_entity).toBe('academic_period');
    expect(String(missingYear?.reason)).toContain(
      'the academic year "99" is not one the legacy database holds'
    );

    const withoutDates = unmappable.find((row) => row.legacy_id === '11');
    expect(String(withoutDates?.reason)).toContain('the period has no start and end date');

    // The unmapped terms are not canonical rows, and the id map does not pretend they are.
    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    expect(map.some((row) => row.legacy_id === '10')).toBe(false);
    expect(map.some((row) => row.legacy_id === '11')).toBe(false);
  });

  it('records every default it applied, so nothing is decided silently', async () => {
    await runner.run();

    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    const assumptions = notes.filter((row) => row.severity === 'info');
    const messages = assumptions.map((row) => String(row.message));

    // Every default the migration applies leaves a trace.
    expect(messages.some((message) => message.includes('institution.country was set to "KE"')))
      .toBe(true);
    expect(
      messages.some((message) => message.includes('institution.default_locale was set to "en-KE"'))
    ).toBe(true);
    expect(
      messages.some((message) =>
        message.includes('institution.time_zone was set to "Africa/Nairobi"')
      )
    ).toBe(true);
    expect(
      messages.some((message) => message.includes('institution.base_currency was set to "KES"'))
    ).toBe(true);
    expect(
      messages.some((message) => message.includes('academic_period.is_reporting was set to true'))
    ).toBe(true);
    expect(
      messages.some((message) => message.includes('academic_period.is_billing was set to true'))
    ).toBe(true);

    // The school has dormitories, so the boarding policy came from the data, not a default.
    expect(
      messages.some((message) => message.includes('institution.boarding_policy was set to'))
    ).toBe(false);

    // The problems the legacy data carried are reported as warnings, not as assumptions.
    const issues = notes.filter((row) => row.severity !== 'info');
    expect(issues.some((row) => row.code === 'period_outside_academic_year')).toBe(true);
    expect(issues.every((row) => row.severity === 'warning')).toBe(true);
  });

  it('rolls back to the state before the migration', async () => {
    const run = await runner.run();
    expect(run.status).toBe('completed');
    expect(run.backups).toHaveLength(1);

    const result = await runner.rollbackTo(0);
    expect(result.status).toBe('completed');

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

    expect(await tableExists(adapter, LEGACY_ID_MAP_TABLE)).toBe(false);
    expect(await tableExists(adapter, LEGACY_UNMAPPABLE_TABLE)).toBe(false);
    expect(await tableExists(adapter, LEGACY_NOTES_TABLE)).toBe(false);

    // The legacy rows are untouched: the migration only read them.
    expect(await readRows(adapter, 'school_details')).toHaveLength(1);
    expect(await readRows(adapter, 'school_periods')).toHaveLength(11);
    expect(await readRows(adapter, 'academic_years')).toHaveLength(4);
    expect(await readRows(adapter, 'dormitories')).toHaveLength(2);
  });

  it('writes the rows in the order the foreign keys need', async () => {
    const strict = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
    await strict.open();
    try {
      await applyCanonicalSchema(strict);
      await buildLegacyFixture(strict);
      const strictRunner = createMigrationRunner({
        adapter: strict,
        migrations: [createInstitutionCalendarMigration({ now: () => FIXED_NOW })],
        now: () => FIXED_NOW,
      });

      const result = await strictRunner.run();
      expect(result.status).toBe('completed');
      expect(await readRows(strict, 'academic_period')).toHaveLength(9);

      const rolled = await strictRunner.rollbackTo(0);
      expect(rolled.status).toBe('completed');
      expect(await readRows(strict, 'institution')).toHaveLength(0);
    } finally {
      await strict.close();
    }
  });
});
