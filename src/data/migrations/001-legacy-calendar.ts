// ABOUTME: The legacy calendar source: the tables migration M1 reads, the row accessors and the
// ABOUTME: shared vocabulary the plan, the writer and the verifier speak.

import type { SqliteBindValue, SqliteRow } from '@/data/adapters/sqlite';

/** The canonical entities migration M1 writes. */
export const M1_ENTITIES = [
  'institution',
  'institution_identifier',
  'calendar',
  'academic_year',
  'academic_period',
  'financial_year',
] as const;

export type M1Entity = (typeof M1_ENTITIES)[number];

/** The legacy collections M1 reads. */
export const LEGACY_SOURCES = {
  schoolDetails: 'school_details',
  yearStructures: 'academic_year_structures',
  periodDefinitions: 'academic_period_definitions',
  academicYears: 'academic_years',
  schoolPeriods: 'school_periods',
  financialYears: 'financial_years',
  dormitories: 'dormitories',
} as const;

/** The platform values the legacy profile never carried. */
export interface InstitutionDefaults {
  readonly country: string;
  readonly defaultLocale: string;
  readonly timeZone: string;
  readonly baseCurrency: string;
  readonly ownership: 'public' | 'private' | 'faith_based' | 'community' | 'international';
  readonly genderPolicy: 'mixed' | 'boys' | 'girls';
  readonly boardingPolicy: 'day' | 'boarding' | 'mixed';
}

/**
 * The values the migration applies where the legacy data has none.
 *
 * The legacy `school_details` row predates the canonical institution: it carries no country,
 * locale, time zone, currency or boarding policy. The canonical model requires them, so the
 * migration applies the platform defaults and records them as assumptions in its report rather
 * than leaving the row invalid.
 */
export const DEFAULT_INSTITUTION_DEFAULTS: InstitutionDefaults = {
  country: 'KE',
  defaultLocale: 'en-KE',
  timeZone: 'Africa/Nairobi',
  baseCurrency: 'KES',
  ownership: 'public',
  genderPolicy: 'mixed',
  boardingPolicy: 'day',
};

/** A legacy row that could not be mapped onto a canonical row. */
export interface UnmappableRow {
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalEntity: M1Entity;
  readonly reason: string;
  readonly detail?: string;
}

/** A problem the migration found in the legacy data and reported rather than repaired. */
export interface MigrationIssue {
  readonly code: string;
  readonly severity: 'warning' | 'error';
  readonly entity: M1Entity;
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly message: string;
}

/** The mapping between a legacy row and the canonical row it became. */
export interface IdMapEntry {
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalEntity: M1Entity;
  readonly canonicalId: string;
}

/** The rows one entity holds, counted before and after the migration. */
export type MigrationCounts = Record<M1Entity, number>;

/** The surface the planner and the verifier read through. */
export interface SqlReader {
  all<T extends object = SqliteRow>(sql: string, params?: readonly SqliteBindValue[]): Promise<T[]>;
  get<T extends object = SqliteRow>(
    sql: string,
    params?: readonly SqliteBindValue[]
  ): Promise<T | null>;
}

/** The legacy rows migration M1 reads. */
export interface LegacyCalendarSource {
  readonly schoolDetails: readonly SqliteRow[];
  readonly yearStructures: readonly SqliteRow[];
  readonly periodDefinitions: readonly SqliteRow[];
  readonly academicYears: readonly SqliteRow[];
  readonly schoolPeriods: readonly SqliteRow[];
  readonly financialYears: readonly SqliteRow[];
  /** How many dormitories the legacy school had; it decides the boarding policy. */
  readonly dormitoryCount: number;
}

/** A trimmed text column, or null when the column is empty. */
export function legacyText(row: SqliteRow, column: string): string | null {
  const value = row[column];
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * The key a legacy id is compared under.
 *
 * The legacy ids are numbers, but the legacy provider binds them as doubles and the column is
 * TEXT, so the database holds `1.0` where the seed data says `1`. Two tables can therefore hold
 * the same legacy row under different text. The key normalises the fraction away, so `1.0` and
 * `1` are one id; an id that is not a number is left exactly as it is.
 */
export function legacyKey(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (/^-?\d+\.0+$/.test(trimmed)) return trimmed.replace(/\.0+$/, '');
  return trimmed;
}

/** A legacy row's id, as the key the id map and the references use. */
export function legacyId(row: SqliteRow): string {
  return legacyKey(legacyText(row, 'id')) ?? '';
}

/** A reference to another legacy row, as the key the id map uses. */
export function legacyRef(row: SqliteRow, column: string): string | null {
  return legacyKey(legacyText(row, column));
}

/** An integer column, or null when it is empty or not a whole number. */
export function legacyInteger(row: SqliteRow, column: string): number | null {
  const value = row[column];
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

/** A boolean column; the legacy stores flags as 0 and 1. */
export function legacyFlag(row: SqliteRow, column: string): boolean {
  const value = row[column];
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'bigint') return value !== 0n;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
  }
  return false;
}

/** True when the text is a real `YYYY-MM-DD` day. */
export function isCalendarDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [year, month, date] = day.split('-').map(Number);
  if (month < 1 || month > 12 || date < 1) return false;
  const stamp = Date.UTC(year, month - 1, date);
  const back = new Date(stamp);
  return (
    back.getUTCFullYear() === year &&
    back.getUTCMonth() === month - 1 &&
    back.getUTCDate() === date
  );
}

/** A legacy date column as a canonical day; a timestamp is truncated to its day. */
export function legacyDay(row: SqliteRow, column: string): string | null {
  const value = legacyText(row, column);
  if (value === null) return null;
  const day = value.slice(0, 10);
  return isCalendarDay(day) ? day : null;
}

/** A timestamp in the shape the canonical audit columns take: ISO-8601 UTC, no milliseconds. */
export function canonicalTimestamp(value: string | null, fallback: string): string {
  if (value === null) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** True when the reader can see the table. */
export async function tableExists(reader: SqlReader, table: string): Promise<boolean> {
  const row = await reader.get<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [table]
  );
  return row !== null;
}

/** Reads the rows of a table, or nothing when the legacy database does not hold it. */
async function readTable(reader: SqlReader, table: string): Promise<SqliteRow[]> {
  if (!(await tableExists(reader, table))) return [];
  return reader.all<SqliteRow>(`SELECT * FROM ${table} ORDER BY id`);
}

/** Reads every legacy row migration M1 works from. */
export async function readLegacyCalendarSource(reader: SqlReader): Promise<LegacyCalendarSource> {
  const schoolDetails = await readTable(reader, LEGACY_SOURCES.schoolDetails);
  const yearStructures = await readTable(reader, LEGACY_SOURCES.yearStructures);
  const periodDefinitions = await readTable(reader, LEGACY_SOURCES.periodDefinitions);
  const academicYears = await readTable(reader, LEGACY_SOURCES.academicYears);
  const schoolPeriods = await readTable(reader, LEGACY_SOURCES.schoolPeriods);
  const financialYears = await readTable(reader, LEGACY_SOURCES.financialYears);
  const dormitories = await readTable(reader, LEGACY_SOURCES.dormitories);

  return {
    schoolDetails,
    yearStructures,
    periodDefinitions,
    academicYears,
    schoolPeriods,
    financialYears,
    dormitoryCount: dormitories.length,
  };
}

/**
 * The counts of the legacy rows, per canonical entity.
 *
 * The institution identifier is counted from the school profiles that carry a school code: a
 * profile without one produces no identifier, so it is not a row the migration could have written.
 */
export function legacyCounts(source: LegacyCalendarSource): MigrationCounts {
  const identifiers = source.schoolDetails.filter(
    (row) => legacyText(row, 'school_code') !== null
  ).length;
  return {
    institution: source.schoolDetails.length,
    institution_identifier: identifiers,
    calendar: source.yearStructures.length,
    academic_year: source.academicYears.length,
    academic_period: source.schoolPeriods.length,
    financial_year: source.financialYears.length,
  };
}
