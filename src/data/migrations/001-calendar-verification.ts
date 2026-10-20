// ABOUTME: The verification of migration M1: the counts before and after, the checks that every
// ABOUTME: canonical date is the legacy date, and the report the migration leaves behind.

import type { SqliteRow } from '@/data/adapters/sqlite';

import {
  LEGACY_SOURCES,
  legacyCounts,
  legacyDay,
  legacyId,
  legacyText,
  readLegacyCalendarSource,
  tableExists,
  type IdMapEntry,
  type LegacyCalendarSource,
  type M1Entity,
  type MigrationCounts,
  type MigrationIssue,
  type SqlReader,
  type UnmappableRow,
} from './001-legacy-calendar';

/** The table that records which canonical row a legacy row became. */
export const LEGACY_ID_MAP_TABLE = '_legacy_id_map';

/** The table that records the legacy rows the migration could not map. */
export const LEGACY_UNMAPPABLE_TABLE = '_legacy_unmappable';

/** The table that records what the migration found and assumed. */
export const LEGACY_NOTES_TABLE = '_legacy_migration_notes';

/** One check the migration made about the rows it wrote. */
export interface MigrationCheck {
  readonly entity: M1Entity;
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalId: string;
  readonly check: string;
  readonly expected: string;
  readonly actual: string;
  readonly ok: boolean;
  /** `error` breaks the migration; `warning` is a problem the legacy data carried in. */
  readonly severity: 'error' | 'warning';
}

/** The verification the migration made, read back from the database. */
export interface CalendarMigrationVerification {
  readonly counts: {
    /** The legacy rows that could become a row of the entity. */
    readonly before: MigrationCounts;
    /** The canonical rows the migration wrote. */
    readonly after: MigrationCounts;
    /** The canonical rows the migration did not write. */
    readonly stray: MigrationCounts;
  };
  readonly checks: readonly MigrationCheck[];
  readonly issues: readonly MigrationIssue[];
  readonly assumptions: readonly string[];
  readonly unmappable: readonly UnmappableRow[];
  readonly mapping: readonly IdMapEntry[];
}

/** The entities whose count the migration checks: every legacy row becomes a row or is reported. */
const COUNTED_ENTITIES: readonly M1Entity[] = [
  'institution',
  'institution_identifier',
  'calendar',
  'academic_year',
  'academic_period',
  'financial_year',
];

function emptyCounts(): MigrationCounts {
  return {
    institution: 0,
    institution_identifier: 0,
    calendar: 0,
    academic_year: 0,
    academic_period: 0,
    financial_year: 0,
  };
}

/** Counts the rows the id map or the unmappable table holds, per canonical entity. */
function countsByEntity(
  rows: readonly { readonly canonicalEntity: string }[]
): MigrationCounts {
  const counts = emptyCounts();
  for (const row of rows) {
    const entity = row.canonicalEntity as M1Entity;
    if (entity in counts) counts[entity] += 1;
  }
  return counts;
}

/** Reads the id map the migration wrote. */
export async function readIdMap(reader: SqlReader): Promise<IdMapEntry[]> {
  if (!(await tableExists(reader, LEGACY_ID_MAP_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_table, legacy_id, canonical_entity, canonical_id
       FROM "${LEGACY_ID_MAP_TABLE}"
      ORDER BY legacy_table, legacy_id, canonical_entity`
  );
  return rows.map((row) => ({
    legacyTable: legacyText(row, 'legacy_table') ?? '',
    legacyId: legacyText(row, 'legacy_id') ?? '',
    canonicalEntity: (legacyText(row, 'canonical_entity') ?? '') as M1Entity,
    canonicalId: legacyText(row, 'canonical_id') ?? '',
  }));
}

/** Reads the legacy rows the migration could not map. */
export async function readUnmappableRows(reader: SqlReader): Promise<UnmappableRow[]> {
  if (!(await tableExists(reader, LEGACY_UNMAPPABLE_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_table, legacy_id, canonical_entity, reason, detail
       FROM "${LEGACY_UNMAPPABLE_TABLE}"
      ORDER BY legacy_table, legacy_id`
  );
  return rows.map((row) => {
    const detail = legacyText(row, 'detail');
    return {
      legacyTable: legacyText(row, 'legacy_table') ?? '',
      legacyId: legacyText(row, 'legacy_id') ?? '',
      canonicalEntity: (legacyText(row, 'canonical_entity') ?? '') as M1Entity,
      reason: legacyText(row, 'reason') ?? '',
      ...(detail === null ? {} : { detail }),
    };
  });
}

/** One note the migration left: an assumption it made or a problem it found. */
export interface MigrationNote {
  readonly severity: string;
  readonly code: string;
  readonly entity: string;
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly message: string;
}

/** Reads the notes the migration left. */
export async function readNotes(reader: SqlReader): Promise<MigrationNote[]> {
  if (!(await tableExists(reader, LEGACY_NOTES_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT severity, code, entity, legacy_table, legacy_id, message
       FROM "${LEGACY_NOTES_TABLE}"
      ORDER BY rowid`
  );
  return rows.map((row) => ({
    severity: legacyText(row, 'severity') ?? 'warning',
    code: legacyText(row, 'code') ?? '',
    entity: legacyText(row, 'entity') ?? '',
    legacyTable: legacyText(row, 'legacy_table') ?? '',
    legacyId: legacyText(row, 'legacy_id') ?? '',
    message: legacyText(row, 'message') ?? '',
  }));
}

async function canonicalRows(
  reader: SqlReader,
  table: string
): Promise<Map<string, SqliteRow>> {
  const rows = await reader.all<SqliteRow>(`SELECT * FROM "${table}"`);
  return new Map(rows.map((row) => [legacyText(row, 'id') ?? '', row]));
}

function check(
  entity: M1Entity,
  legacyTable: string,
  legacyIdValue: string,
  canonicalId: string,
  name: string,
  expected: string,
  actual: string,
  severity: 'error' | 'warning'
): MigrationCheck {
  return {
    entity,
    legacyTable,
    legacyId: legacyIdValue,
    canonicalId,
    check: name,
    expected,
    actual,
    ok: expected === actual,
    severity,
  };
}

/** The legacy rows of one table, keyed by the id the id map uses. */
function legacyRowsById(source: LegacyCalendarSource, table: string): Map<string, SqliteRow> {
  const rows: readonly SqliteRow[] =
    table === LEGACY_SOURCES.schoolDetails
      ? source.schoolDetails
      : table === LEGACY_SOURCES.yearStructures
        ? source.yearStructures
        : table === LEGACY_SOURCES.academicYears
          ? source.academicYears
          : table === LEGACY_SOURCES.schoolPeriods
            ? source.schoolPeriods
            : source.financialYears;
  return new Map(rows.map((row) => [legacyId(row), row]));
}

/** The canonical row of a mapped entity. */
function canonicalRowFor(
  rows: ReadonlyMap<M1Entity, Map<string, SqliteRow>>,
  entity: M1Entity,
  id: string
): SqliteRow | undefined {
  return rows.get(entity)?.get(id);
}

/**
 * Verifies the rows the migration wrote against the legacy rows they came from.
 *
 * The checks are read back from the database, not from the plan, so they say what the database
 * holds. A date that does not match the legacy row is an error and stops the migration; a period
 * that lies outside its academic year is the legacy school's own inconsistency and is reported.
 */
export async function verifyCalendarMigration(
  reader: SqlReader,
  source: LegacyCalendarSource
): Promise<CalendarMigrationVerification> {
  const mapping = await readIdMap(reader);
  const unmappable = await readUnmappableRows(reader);
  const notes = await readNotes(reader);

  const canonical: ReadonlyMap<M1Entity, Map<string, SqliteRow>> = new Map([
    ['institution', await canonicalRows(reader, 'institution')],
    ['institution_identifier', await canonicalRows(reader, 'institution_identifier')],
    ['calendar', await canonicalRows(reader, 'calendar')],
    ['academic_year', await canonicalRows(reader, 'academic_year')],
    ['academic_period', await canonicalRows(reader, 'academic_period')],
    ['financial_year', await canonicalRows(reader, 'financial_year')],
  ]);

  const legacyRows = new Map<string, Map<string, SqliteRow>>();
  for (const table of [
    LEGACY_SOURCES.schoolDetails,
    LEGACY_SOURCES.yearStructures,
    LEGACY_SOURCES.academicYears,
    LEGACY_SOURCES.schoolPeriods,
    LEGACY_SOURCES.financialYears,
  ]) {
    legacyRows.set(table, legacyRowsById(source, table));
  }

  const checks: MigrationCheck[] = [];
  for (const entry of mapping) {
    const legacyRow = legacyRows.get(entry.legacyTable)?.get(entry.legacyId);
    const canonicalRow = canonicalRowFor(canonical, entry.canonicalEntity, entry.canonicalId);
    if (legacyRow === undefined || canonicalRow === undefined) {
      checks.push(
        check(
          entry.canonicalEntity,
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'row_present',
          'present',
          legacyRow === undefined
            ? 'the legacy row is gone'
            : 'the canonical row is missing',
          'error'
        )
      );
      continue;
    }

    const compare = (entity: M1Entity, name: string, expected: string, actual: string): void => {
      checks.push(
        check(
          entity,
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          name,
          expected,
          actual,
          'error'
        )
      );
    };

    if (entry.canonicalEntity === 'institution') {
      compare(
        'institution',
        'name',
        legacyText(legacyRow, 'name') ?? '',
        legacyText(canonicalRow, 'name') ?? ''
      );
    }
    if (entry.canonicalEntity === 'institution_identifier') {
      compare(
        'institution_identifier',
        'value',
        legacyText(legacyRow, 'school_code') ?? '',
        legacyText(canonicalRow, 'value') ?? ''
      );
    }
    if (entry.canonicalEntity === 'calendar') {
      compare(
        'calendar',
        'name',
        legacyText(legacyRow, 'name') ?? '',
        legacyText(canonicalRow, 'name') ?? ''
      );
    }
    if (entry.canonicalEntity === 'academic_year' || entry.canonicalEntity === 'financial_year') {
      compare(
        entry.canonicalEntity,
        'start_date',
        legacyDay(legacyRow, 'start_date') ?? '',
        legacyText(canonicalRow, 'start_date') ?? ''
      );
      compare(
        entry.canonicalEntity,
        'end_date',
        legacyDay(legacyRow, 'end_date') ?? '',
        legacyText(canonicalRow, 'end_date') ?? ''
      );
      compare(
        entry.canonicalEntity,
        'bounds',
        'the end is on or after the start',
        boundsText(
          legacyText(canonicalRow, 'start_date') ?? '',
          legacyText(canonicalRow, 'end_date') ?? ''
        )
      );
    }
    if (entry.canonicalEntity === 'academic_period') {
      const start = legacyText(canonicalRow, 'start_date') ?? '';
      const end = legacyText(canonicalRow, 'end_date') ?? '';
      compare(
        'academic_period',
        'start_date',
        legacyDay(legacyRow, 'start_date') ?? '',
        start
      );
      compare('academic_period', 'end_date', legacyDay(legacyRow, 'end_date') ?? '', end);
      compare(
        'academic_period',
        'bounds',
        'the end is on or after the start',
        boundsText(start, end)
      );

      const yearId = legacyText(canonicalRow, 'academic_year_id') ?? '';
      const year = canonical.get('academic_year')?.get(yearId);
      const yearStart = year === undefined ? '' : legacyText(year, 'start_date') ?? '';
      const yearEnd = year === undefined ? '' : legacyText(year, 'end_date') ?? '';
      const inside = year !== undefined && start >= yearStart && end <= yearEnd;
      checks.push(
        check(
          'academic_period',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'period_within_year',
          `between ${yearStart} and ${yearEnd}`,
          inside
            ? `between ${yearStart} and ${yearEnd}`
            : `the period runs from ${start} to ${end}`,
          'warning'
        )
      );
    }
  }

  // The counts: every legacy row either became a canonical row or was reported.
  const before = legacyCounts(source);
  const after = countsByEntity(mapping);
  const unmapped = countsByEntity(unmappable);
  for (const entity of COUNTED_ENTITIES) {
    checks.push(
      check(
        entity,
        'legacy',
        '',
        '',
        'count',
        String(before[entity]),
        String(after[entity] + unmapped[entity]),
        'error'
      )
    );
  }

  const stray = emptyCounts();
  for (const entity of COUNTED_ENTITIES) {
    const rows = canonical.get(entity)?.size ?? 0;
    stray[entity] = Math.max(0, rows - after[entity]);
  }

  const issues: MigrationIssue[] = notes
    .filter((note) => note.severity !== 'info')
    .map((note) => ({
      code: note.code,
      severity: note.severity === 'error' ? 'error' : 'warning',
      entity: (note.entity || 'institution') as M1Entity,
      legacyTable: note.legacyTable,
      legacyId: note.legacyId,
      message: note.message,
    }));
  const assumptions = notes
    .filter((note) => note.severity === 'info')
    .map((note) => note.message);

  return { counts: { before, after, stray }, checks, issues, assumptions, unmappable, mapping };
}

/** What the check of a row's own bounds says. */
function boundsText(start: string, end: string): string {
  return end < start
    ? `the end (${end}) is before the start (${start})`
    : 'the end is on or after the start';
}

/**
 * The report the migration left in the database.
 *
 * The report is read back from the database and re-derived from the legacy rows, so it says
 * what the database holds rather than what the plan intended.
 */
export async function readMigrationReport(
  reader: SqlReader
): Promise<CalendarMigrationVerification> {
  const source = await readLegacyCalendarSource(reader);
  return verifyCalendarMigration(reader, source);
}
