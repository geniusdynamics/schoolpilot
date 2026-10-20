// ABOUTME: The legacy database the migration tests run against: the tables the legacy converter
// ABOUTME: creates, the P0-era seed rows, and the rows an installation can hold and the seed did not.

import type { SqliteAdapter, SqliteBindValue } from '@/data/adapters/sqlite';
import {
  initialMockAcademicPeriodDefinitions,
  initialMockAcademicYearStructures,
  initialMockAcademicYears,
  initialMockDormitories,
  initialMockSchoolDetails,
  initialMockSchoolPeriods,
} from '@/modules/administration/data/mockData';
import { initialMockFinancialYears } from '@/modules/finance/data/mockData';
import { collectionsDefinition } from '@/services/database/collections';
import { SchemaConverter } from '@/services/database/SchemaConverter';

/** The legacy tables the fixture creates, in the order the converter writes them. */
export const LEGACY_FIXTURE_TABLES = [
  'school_details',
  'academic_year_structures',
  'academic_period_definitions',
  'academic_years',
  'school_periods',
  'financial_years',
  'dormitories',
] as const;

/** How the fixture differs from the P0-era seed. */
export interface LegacyFixtureOptions {
  /** Whether the fixture holds the school profile. */
  readonly withProfile?: boolean;
  /** Whether the fixture holds the dormitories table. */
  readonly withDormitories?: boolean;
  /** The school type the profile carries; the seed says `International`. */
  readonly schoolType?: string;
  /** The legacy term the school marked as the running one; the seed marks term 7. */
  readonly activePeriodId?: number;
}

/** A term whose academic year the legacy database does not hold. */
export const TERM_WITH_MISSING_YEAR = {
  id: 10,
  academic_year_id: 99,
  period_definition_id: 1,
  financial_year_id: 3,
  start_date: '2026-09-01',
  end_date: '2026-12-15',
  is_active: false,
  name: 'Term 1 - AY 2026/2027',
  academic_year_name: 'AY 2026/2027',
  period_definition_name: 'Term 1',
  financial_year_name: 'FY 2025',
  created_at: '2026-01-05T00:00:00.000Z',
  updated_at: '2026-01-05T00:00:00.000Z',
};

/** A term the legacy database holds without dates. */
export const TERM_WITHOUT_DATES = {
  id: 11,
  academic_year_id: 3,
  period_definition_id: 4,
  financial_year_id: 2,
  start_date: null,
  end_date: null,
  is_active: false,
  name: 'Semester 1 - AY 2024/2025',
  academic_year_name: 'AY 2024/2025',
  period_definition_name: 'Semester 1',
  financial_year_name: 'FY 2024',
  created_at: '2026-01-05T00:00:00.000Z',
  updated_at: '2026-01-05T00:00:00.000Z',
};

async function insertLegacyRows(
  adapter: SqliteAdapter,
  table: string,
  rows: readonly Record<string, unknown>[]
): Promise<void> {
  for (const row of rows) {
    const columns = Object.keys(row);
    const values = columns.map((column) => row[column] as SqliteBindValue);
    await adapter.run(
      `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      values
    );
  }
}

/** Creates a legacy table with the DDL the legacy converter produces. */
async function createLegacyTable(adapter: SqliteAdapter, table: string): Promise<void> {
  const schema = collectionsDefinition[table].schema;
  const conversion = SchemaConverter.convertRxDBToSQLite(table, schema);
  await adapter.exec(SchemaConverter.generateCreateTableSQL(conversion.sqlSchema));
}

/**
 * Builds the legacy database the migration reads.
 *
 * The tables are created with the DDL the legacy converter produces, so the fixture is the
 * database an installation of the legacy build holds. The rows are the P0-era seed data, plus
 * the two rows an installation can hold and the seed never did: a term whose academic year is
 * missing and a term without dates.
 */
export async function buildLegacyFixture(
  adapter: SqliteAdapter,
  options: LegacyFixtureOptions = {}
): Promise<void> {
  const withProfile = options.withProfile ?? true;
  const withDormitories = options.withDormitories ?? true;
  const schoolType = options.schoolType ?? 'International';
  const activePeriodId = options.activePeriodId ?? 7;

  for (const table of LEGACY_FIXTURE_TABLES) {
    if (table === 'dormitories' && !withDormitories) continue;
    await createLegacyTable(adapter, table);
  }

  if (withProfile) {
    const profile = {
      ...(initialMockSchoolDetails as unknown as Record<string, unknown>),
      school_type: schoolType,
    };
    await insertLegacyRows(adapter, 'school_details', [profile]);
  }
  await insertLegacyRows(
    adapter,
    'academic_year_structures',
    initialMockAcademicYearStructures as unknown as Record<string, unknown>[]
  );
  await insertLegacyRows(
    adapter,
    'academic_period_definitions',
    initialMockAcademicPeriodDefinitions as unknown as Record<string, unknown>[]
  );
  await insertLegacyRows(
    adapter,
    'academic_years',
    initialMockAcademicYears as unknown as Record<string, unknown>[]
  );
  await insertLegacyRows(adapter, 'school_periods', [
    ...(initialMockSchoolPeriods as unknown as Record<string, unknown>[]).map((row) => ({
      ...row,
      is_active: String(row.id) === String(activePeriodId),
    })),
    TERM_WITH_MISSING_YEAR as unknown as Record<string, unknown>,
    TERM_WITHOUT_DATES as unknown as Record<string, unknown>,
  ]);
  await insertLegacyRows(
    adapter,
    'financial_years',
    initialMockFinancialYears as unknown as Record<string, unknown>[]
  );
  if (withDormitories) {
    await insertLegacyRows(
      adapter,
      'dormitories',
      initialMockDormitories as unknown as Record<string, unknown>[]
    );
  }
}
