// ABOUTME: Migration M1: the legacy school profile, year structures, academic years, terms and
// ABOUTME: financial years become canonical rows, with the id map and the verification report.

import type { SqliteBindValue } from '@/data/adapters/sqlite';
import {
  academicPeriodSchema,
  academicYearSchema,
  calendarSchema,
  financialYearSchema,
  institutionIdentifierSchema,
  institutionSchema,
} from '@/domain/schema';

import {
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
  verifyCalendarMigration,
} from './001-calendar-verification';
import {
  DEFAULT_INSTITUTION_DEFAULTS,
  M1_ENTITIES,
  readLegacyCalendarSource,
  tableExists,
  type InstitutionDefaults,
  type LegacyCalendarSource,
  type M1Entity,
  type SqlReader,
} from './001-legacy-calendar';
import { planCalendarMigration, type CalendarMigrationPlan, type PlanOptions } from './001-calendar-plan';
import type { Migration, MigrationContext } from './types';
export {
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
  readMigrationReport,
  type CalendarMigrationVerification,
  type MigrationCheck,
} from './001-calendar-verification';

/** The canonical tables migration M1 writes. */
export const CANONICAL_TABLES: Record<M1Entity, string> = {
  institution: 'institution',
  institution_identifier: 'institution_identifier',
  calendar: 'calendar',
  academic_year: 'academic_year',
  academic_period: 'academic_period',
  financial_year: 'financial_year',
};

const MAPPING_TABLES_DDL = [
  `CREATE TABLE IF NOT EXISTS "${LEGACY_ID_MAP_TABLE}" (
     legacy_table TEXT NOT NULL,
     legacy_id TEXT NOT NULL,
     canonical_entity TEXT NOT NULL,
     canonical_id TEXT NOT NULL,
     PRIMARY KEY (legacy_table, legacy_id, canonical_entity)
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_legacy_id_map_canonical_id"
     ON "${LEGACY_ID_MAP_TABLE}" (canonical_id)`,
  `CREATE TABLE IF NOT EXISTS "${LEGACY_UNMAPPABLE_TABLE}" (
     legacy_table TEXT NOT NULL,
     legacy_id TEXT NOT NULL,
     canonical_entity TEXT NOT NULL,
     reason TEXT NOT NULL,
     detail TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS "idx_legacy_unmappable_legacy"
     ON "${LEGACY_UNMAPPABLE_TABLE}" (legacy_table, legacy_id)`,
  `CREATE TABLE IF NOT EXISTS "${LEGACY_NOTES_TABLE}" (
     migration_version INTEGER NOT NULL,
     severity TEXT NOT NULL,
     code TEXT NOT NULL,
     entity TEXT NOT NULL,
     legacy_table TEXT NOT NULL,
     legacy_id TEXT NOT NULL,
     message TEXT NOT NULL
   )`,
];

/** The options the migration takes. */
export interface InstitutionCalendarMigrationOptions {
  /** The clock; the statuses are derived against the day it returns. */
  readonly now?: () => Date;
  /** The values applied where the legacy data has none. */
  readonly institutionDefaults?: InstitutionDefaults;
}

async function insertRow(
  context: MigrationContext,
  table: string,
  row: Record<string, SqliteBindValue | undefined>
): Promise<void> {
  const columns: string[] = [];
  const values: SqliteBindValue[] = [];
  for (const [column, value] of Object.entries(row)) {
    if (value === undefined) continue;
    columns.push(column);
    values.push(value);
  }
  await context.run(
    `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})`,
    values
  );
}

/** Writes the canonical rows of a plan, the id map, the unmappable rows and the notes. */
export async function writeCalendarPlan(
  context: MigrationContext,
  plan: CalendarMigrationPlan
): Promise<void> {
  for (const statement of MAPPING_TABLES_DDL) {
    await context.exec(statement);
  }

  if (plan.institution !== null) {
    const row = institutionSchema.parse(plan.institution);
    await insertRow(context, 'institution', {
      id: row.id,
      name: row.name,
      short_name: row.short_name,
      motto: row.motto,
      country: row.country,
      region: row.region,
      county: row.county,
      ownership: row.ownership,
      gender_policy: row.gender_policy,
      boarding_policy: row.boarding_policy,
      default_locale: row.default_locale,
      time_zone: row.time_zone,
      base_currency: row.base_currency,
      setup_completed_at: row.setup_completed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  if (plan.institutionIdentifier !== null) {
    const row = institutionIdentifierSchema.parse(plan.institutionIdentifier);
    await insertRow(context, 'institution_identifier', {
      id: row.id,
      institution_id: row.institution_id,
      scheme: row.scheme,
      value: row.value,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  for (const calendar of plan.calendars) {
    const row = calendarSchema.parse(calendar);
    await insertRow(context, 'calendar', {
      id: row.id,
      institution_id: row.institution_id,
      name: row.name,
      programme_ids: JSON.stringify(row.programme_ids),
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  // The financial years come before the academic years: an academic year points at one.
  for (const financialYear of plan.financialYears) {
    const row = financialYearSchema.parse(financialYear);
    await insertRow(context, 'financial_year', {
      id: row.id,
      institution_id: row.institution_id,
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  for (const academicYear of plan.academicYears) {
    const row = academicYearSchema.parse(academicYear);
    await insertRow(context, 'academic_year', {
      id: row.id,
      institution_id: row.institution_id,
      calendar_id: row.calendar_id,
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      financial_year_id: row.financial_year_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  for (const period of plan.academicPeriods) {
    const row = academicPeriodSchema.parse(period);
    await insertRow(context, 'academic_period', {
      id: row.id,
      institution_id: row.institution_id,
      academic_year_id: row.academic_year_id,
      kind: row.kind,
      sequence: row.sequence,
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      parent_period_id: row.parent_period_id,
      is_reporting: row.is_reporting ? 1 : 0,
      is_billing: row.is_billing ? 1 : 0,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  for (const entry of plan.mapping) {
    await context.run(
      `INSERT INTO "${LEGACY_ID_MAP_TABLE}" (legacy_table, legacy_id, canonical_entity, canonical_id)
       VALUES (?, ?, ?, ?)`,
      [entry.legacyTable, entry.legacyId, entry.canonicalEntity, entry.canonicalId]
    );
  }

  for (const row of plan.unmappable) {
    await context.run(
      `INSERT INTO "${LEGACY_UNMAPPABLE_TABLE}" (legacy_table, legacy_id, canonical_entity, reason, detail)
       VALUES (?, ?, ?, ?, ?)`,
      [row.legacyTable, row.legacyId, row.canonicalEntity, row.reason, row.detail ?? null]
    );
  }

  for (const issue of plan.issues) {
    await context.run(
      `INSERT INTO "${LEGACY_NOTES_TABLE}" (migration_version, severity, code, entity, legacy_table, legacy_id, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        context.version,
        issue.severity,
        issue.code,
        issue.entity,
        issue.legacyTable,
        issue.legacyId,
        issue.message,
      ]
    );
  }

  for (const assumption of plan.assumptions) {
    await context.run(
      `INSERT INTO "${LEGACY_NOTES_TABLE}" (migration_version, severity, code, entity, legacy_table, legacy_id, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        context.version,
        'info',
        'assumption',
        'institution',
        'school_details',
        '',
        assumption,
      ]
    );
  }
}

async function assertCanonicalTables(reader: SqlReader): Promise<void> {
  const missing: string[] = [];
  for (const entity of M1_ENTITIES) {
    const table = CANONICAL_TABLES[entity];
    if (!(await tableExists(reader, table))) missing.push(table);
  }
  if (missing.length > 0) {
    throw new Error(
      `Migration M1 writes the canonical tables (${missing.join(', ')}), but the database does not hold them; apply the canonical schema first`
    );
  }
}

async function assertCanonicalTablesEmpty(reader: SqlReader): Promise<void> {
  for (const entity of M1_ENTITIES) {
    const table = CANONICAL_TABLES[entity];
    const row = await reader.get<{ total: number }>(
      `SELECT COUNT(*) AS total FROM "${table}"`
    );
    const total = row?.total ?? 0;
    if (total > 0) {
      throw new Error(
        `Migration M1 writes the canonical table "${table}", but it already holds ${total} row(s); the canonical data is newer than the legacy data, so there is nothing to migrate`
      );
    }
  }
}

function planOptions(options: InstitutionCalendarMigrationOptions): PlanOptions {
  const now = options.now?.() ?? new Date();
  return {
    referenceDate: now.toISOString().slice(0, 10),
    referenceTimestamp: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    defaults: options.institutionDefaults ?? DEFAULT_INSTITUTION_DEFAULTS,
  };
}

/**
 * Builds migration M1.
 *
 * The migration reads the legacy tables and writes the canonical ones in the framework's
 * transaction, so the rows and the ledger row commit together or not at all. Its SQL is not
 * declared: the ids are generated and the rows are written one by one, so the migration states
 * a checksum of its own instead. The framework holds the checksum, not the statement text.
 */
export function createInstitutionCalendarMigration(
  options: InstitutionCalendarMigrationOptions = {}
): Migration {
  return {
    version: 1,
    name: 'migrate the institution and the calendar',
    checksum: 'm1-institution-calendar-v1',
    destructive: true,
    async up(context: MigrationContext) {
      await assertCanonicalTables(context);
      await assertCanonicalTablesEmpty(context);
      const source: LegacyCalendarSource = await readLegacyCalendarSource(context);
      const plan = planCalendarMigration(source, planOptions(options));
      await writeCalendarPlan(context, plan);
      const verification = await verifyCalendarMigration(context, source);

      // An error-severity note stops the migration: the run fails and the database keeps the
      // state it had. The operator does not have to read the report and roll back by hand.
      const fatal = verification.issues.filter((issue) => issue.severity === 'error');
      if (fatal.length > 0) {
        throw new Error(
          `Migration M1 cannot migrate this database: ${fatal
            .map((issue) => issue.message)
            .join('; ')}`
        );
      }

      const failures = verification.checks.filter(
        (entry) => !entry.ok && entry.severity === 'error'
      );
      if (failures.length > 0) {
        const detail = failures
          .slice(0, 5)
          .map(
            (entry) =>
              `${entry.entity} ${entry.legacyId || '(no id)'}: ${entry.check} was ${entry.actual}, expected ${entry.expected}`
          )
          .join('; ');
        throw new Error(
          `Migration M1 wrote ${failures.length} row(s) that do not match the legacy rows: ${detail}`
        );
      }
    },
    async down(context: MigrationContext) {
      for (const entity of [
        'academic_period',
        'academic_year',
        'financial_year',
        'calendar',
        'institution_identifier',
        'institution',
      ] as const) {
        await context.exec(
          `DELETE FROM "${CANONICAL_TABLES[entity]}"
             WHERE id IN (SELECT canonical_id FROM "${LEGACY_ID_MAP_TABLE}" WHERE canonical_entity = '${entity}')`
        );
      }
      await context.exec(`DROP TABLE IF EXISTS "${LEGACY_ID_MAP_TABLE}"`);
      await context.exec(`DROP TABLE IF EXISTS "${LEGACY_UNMAPPABLE_TABLE}"`);
      await context.exec(`DROP TABLE IF EXISTS "${LEGACY_NOTES_TABLE}"`);
    },
  };
}

/** Migration M1: the legacy institution and calendar become canonical rows. */
export const migrateInstitutionAndCalendar: Migration = createInstitutionCalendarMigration();
