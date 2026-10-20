// ABOUTME: The legacy database migration M2 runs against: the classes, streams and learners of
// ABOUTME: the P0-era seed data, plus the drift an installation can hold and the seed did not.

import type { SqliteAdapter, SqliteBindValue } from '@/data/adapters/sqlite';
import { createMigrationRunner } from '@/data/migrations';
import {
  initialMockClasses,
  initialMockClassStreams,
  initialMockStudents,
} from '@/modules/administration/data/mockData';
import { collectionsDefinition } from '@/services/database/collections';
import { SchemaConverter } from '@/services/database/SchemaConverter';

import { buildLegacyFixture, type LegacyFixtureOptions } from './001-legacy-fixture';
import { createInstitutionCalendarMigration } from './001-institution-calendar';

/** The day the fixture migrations run on; the academic years and the proposals derive from it. */
export const FIXTURE_NOW = new Date('2024-10-01T09:00:00.000Z');

/** The legacy tables migration M2 reads, in the order the converter writes them. */
export const CLASS_GROUP_FIXTURE_TABLES = ['classes', 'class_streams', 'students'] as const;

/** How the fixture differs from the P0-era seed. */
export interface ClassGroupFixtureOptions extends LegacyFixtureOptions {
  /** Whether the fixture holds the classes and streams tables. */
  readonly withClasses?: boolean;
  /** Whether the fixture holds a class with no streams. */
  readonly withStreamlessClass?: boolean;
  /** Whether the fixture holds a stream whose class does not exist. */
  readonly withOrphanStream?: boolean;
  /** Whether the fixture holds a learner pointing at a stream that does not exist. */
  readonly withOrphanLearner?: boolean;
  /**
   * Whether the numeric ids are stored as doubles (`1.0`), the way the legacy provider binds
   * them into TEXT columns. The default is true: the normalisation is part of the contract.
   */
  readonly doubleIds?: boolean;
}

/** A stream whose class the legacy database does not hold. */
export const ORPHAN_STREAM = {
  id: 90,
  class_id: 99,
  name: 'Ghost',
  class_teacher_id: 'STF000',
  class_name: 'Form 9',
  class_teacher_name: 'Nobody',
};

/** A class that carries no streams; it becomes one default class group. */
export const STREAMLESS_CLASS = { id: 5, name: 'Form 5' };

/** A learner pointing at a stream the legacy database does not hold. */
export const ORPHAN_LEARNER = {
  id: 'S900',
  admission_no: 'ADM900',
  first_name: 'Grace',
  last_name: 'Missing',
  gender: 'Female',
  current_class_stream_id: 99,
  status: 'Active',
  current_class_name: 'Form 9',
  current_class_stream_name: 'Ghost',
  display_name: 'Grace Missing',
};

/** The text the legacy provider writes for a numeric id. */
function legacyIdText(value: unknown, doubleIds: boolean): SqliteBindValue {
  if (typeof value === 'number' && doubleIds && Number.isInteger(value)) return `${value}.0`;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'string') return value;
  return null;
}

/** A value the legacy table can hold; nested objects and arrays travel as JSON text. */
function legacyValue(value: unknown): SqliteBindValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return JSON.stringify(value);
}

async function insertRows(
  adapter: SqliteAdapter,
  table: string,
  rows: readonly Record<string, unknown>[]
): Promise<void> {
  for (const row of rows) {
    const columns = Object.keys(row);
    await adapter.run(
      `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      columns.map((column) => legacyValue(row[column]))
    );
  }
}

/** Creates a legacy table with the DDL the legacy converter produces. */
async function createLegacyTable(adapter: SqliteAdapter, table: string): Promise<void> {
  const schema = collectionsDefinition[table].schema;
  const conversion = SchemaConverter.convertRxDBToSQLite(table, schema);
  await adapter.exec(SchemaConverter.generateCreateTableSQL(conversion.sqlSchema));
}

/** The classes, with the nested stream array the legacy row carries. */
function classRows(options: ClassGroupFixtureOptions): Record<string, unknown>[] {
  const doubleIds = options.doubleIds ?? true;
  const rows = initialMockClasses.map((entry) => ({
    id: legacyIdText(entry.id, doubleIds),
    name: entry.name,
    streams: initialMockClassStreams
      .filter((stream) => stream.class_id === entry.id)
      .map((stream) => ({
        id: legacyIdText(stream.id, doubleIds),
        class_id: legacyIdText(stream.class_id, doubleIds),
        name: stream.name,
        class_teacher_id: stream.class_teacher_id,
      })),
  }));
  if (options.withStreamlessClass ?? true) {
    rows.push({
      id: legacyIdText(STREAMLESS_CLASS.id, doubleIds),
      name: STREAMLESS_CLASS.name,
      streams: [],
    });
  }
  return rows;
}

/** The streams, including the one whose class does not exist. */
function streamRows(options: ClassGroupFixtureOptions): Record<string, unknown>[] {
  const doubleIds = options.doubleIds ?? true;
  const rows: Record<string, unknown>[] = initialMockClassStreams.map((entry) => ({
    id: legacyIdText(entry.id, doubleIds),
    class_id: legacyIdText(entry.class_id, doubleIds),
    name: entry.name,
    class_teacher_id: entry.class_teacher_id,
    class_name: entry.class_name,
    class_teacher_name: entry.class_teacher_name,
  }));
  if (options.withOrphanStream ?? true) {
    rows.push({
      id: legacyIdText(ORPHAN_STREAM.id, doubleIds),
      class_id: legacyIdText(ORPHAN_STREAM.class_id, doubleIds),
      name: ORPHAN_STREAM.name,
      class_teacher_id: ORPHAN_STREAM.class_teacher_id,
      class_name: ORPHAN_STREAM.class_name,
      class_teacher_name: ORPHAN_STREAM.class_teacher_name,
    });
  }
  return rows;
}

/** The learners, including the one pointing at a stream that does not exist. */
function learnerRows(options: ClassGroupFixtureOptions): Record<string, unknown>[] {
  const doubleIds = options.doubleIds ?? true;
  const rows: Record<string, unknown>[] = initialMockStudents.map((entry) => ({
    id: entry.id,
    admission_no: entry.admission_no,
    first_name: entry.first_name,
    last_name: entry.last_name,
    gender: entry.gender,
    current_class_stream_id: legacyIdText(entry.current_class_stream_id, doubleIds),
    status: entry.status,
    current_class_name: entry.current_class_name,
    current_class_stream_name: entry.current_class_stream_name,
    display_name: entry.display_name,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  }));
  if (options.withOrphanLearner ?? true) {
    rows.push({
      ...ORPHAN_LEARNER,
      current_class_stream_id: legacyIdText(ORPHAN_LEARNER.current_class_stream_id, doubleIds),
      created_at: FIXTURE_NOW.toISOString(),
      updated_at: FIXTURE_NOW.toISOString(),
    });
  }
  return rows;
}

/**
 * Builds the legacy database migration M2 reads.
 *
 * The tables are created with the DDL the legacy converter produces. The rows are the P0-era
 * seed data, plus the drift an installation can hold: a class with no streams, a stream whose
 * class is gone, and a learner pointing at a stream that does not exist. The default fixture
 * writes the numeric ids as doubles, the way the legacy provider binds them, so the tests
 * exercise the normalised legacy key.
 */
export async function buildClassGroupFixture(
  adapter: SqliteAdapter,
  options: ClassGroupFixtureOptions = {}
): Promise<void> {
  await buildLegacyFixture(adapter, options);
  if (!(options.withClasses ?? true)) return;

  for (const table of CLASS_GROUP_FIXTURE_TABLES) {
    await createLegacyTable(adapter, table);
  }
  await insertRows(adapter, 'classes', classRows(options));
  await insertRows(adapter, 'class_streams', streamRows(options));
  await insertRows(adapter, 'students', learnerRows(options));
}

/**
 * Runs migration M1, so the canonical academic years the mapping proposes the class groups
 * against exist.
 */
export async function migrateCalendar(adapter: SqliteAdapter, now: Date = FIXTURE_NOW): Promise<void> {
  const runner = createMigrationRunner({
    adapter,
    migrations: [createInstitutionCalendarMigration({ now: () => now })],
    backupPolicy: 'never',
    now: () => now,
  });
  const result = await runner.run();
  if (result.status === 'failed') {
    throw new Error(result.failed?.error ?? 'migration M1 failed');
  }
}

/** Builds the legacy fixture and applies migration M1. */
export async function buildMigratedClassGroupFixture(
  adapter: SqliteAdapter,
  options: ClassGroupFixtureOptions = {}
): Promise<void> {
  await buildClassGroupFixture(adapter, options);
  await migrateCalendar(adapter, FIXTURE_NOW);
}
