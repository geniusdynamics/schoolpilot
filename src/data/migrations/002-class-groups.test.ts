// ABOUTME: The fixture migration test for M2: the legacy classes and streams of the P0-era seed,
// ABOUTME: the interactive decision, the levels and class groups written, and the rollback.

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

import { legacyKey } from './001-legacy-calendar';
import { createInstitutionCalendarMigration, LEGACY_ID_MAP_TABLE, LEGACY_NOTES_TABLE, LEGACY_UNMAPPABLE_TABLE } from './001-institution-calendar';
import {
  createClassGroupMigration,
  CREATED_TABLE,
  readClassGroupMigrationReport,
} from './002-class-groups';
import { buildClassGroupFixture, FIXTURE_NOW, migrateCalendar, type ClassGroupFixtureOptions } from './002-legacy-fixture';
import {
  LEVEL_MAPPING_TABLE,
  proposeLevelMapping,
  readLevelMapping,
  readLevelMappingSource,
  saveLevelMapping,
  type LevelMappingEntry,
} from './002-level-mapping';

/** The only id format the canonical model stores (spec 02 §1.1). */
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

async function readRows(adapter: SqliteAdapter, table: string): Promise<Row[]> {
  return adapter.all<Row>(`SELECT * FROM "${table}" ORDER BY rowid`);
}

async function tableExists(adapter: SqliteAdapter, table: string): Promise<boolean> {
  const row = await adapter.get<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [table]
  );
  return row !== null;
}

/** Builds the legacy fixture and applies M1, the way the application runs the migrations. */
async function prepare(options: ClassGroupFixtureOptions = {}): Promise<SqliteAdapter> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  await applyCanonicalSchema(adapter);
  await buildClassGroupFixture(adapter, options);
  await migrateCalendar(adapter);
  return adapter;
}

/** Saves the proposed mapping, optionally corrected, the way the interactive step does. */
async function confirm(
  adapter: SqliteAdapter,
  correct?: (entries: readonly LevelMappingEntry[]) => readonly LevelMappingEntry[]
): Promise<LevelMappingEntry[]> {
  const source = await readLevelMappingSource(adapter);
  const proposal = proposeLevelMapping(source, { referenceDate: '2024-10-01' });
  const entries = (correct === undefined ? proposal.entries : correct(proposal.entries)).map(
    (entry) => ({ ...entry, confirmedAt: '2024-10-01T09:00:00Z' })
  );
  await adapter.transaction(async (tx) => {
    await saveLevelMapping(tx, entries);
  });
  return entries;
}

function runnerFor(adapter: SqliteAdapter, withBackup = false): MigrationRunner {
  return createMigrationRunner({
    adapter,
    migrations: [
      createInstitutionCalendarMigration({ now: () => FIXTURE_NOW }),
      createClassGroupMigration({ now: () => FIXTURE_NOW }),
    ],
    ...(withBackup ? { backup: createDumpBackupStrategy() } : { backupPolicy: 'never' as const }),
    now: () => FIXTURE_NOW,
  });
}

/** A map from the normalised legacy stream id to the class group it became. */
function classGroupByStream(map: readonly Row[]): Map<string, string> {
  return new Map(
    map
      .filter(
        (row) => row.legacy_table === 'class_streams' && row.canonical_entity === 'class_group'
      )
      .map((row) => [String(row.legacy_id), String(row.canonical_id)])
  );
}

describe('migration M2: the classes and streams', () => {
  let adapter: SqliteAdapter;

  beforeEach(async () => {
    adapter = await prepare();
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('writes a level for every class and a year-scoped class group for every stream', async () => {
    await confirm(adapter);
    const result = await runnerFor(adapter).run();
    expect(result.status).toBe('completed');

    const levels = await readRows(adapter, 'level');
    expect(levels).toHaveLength(5);
    expect(levels.map((level) => level.name)).toEqual(['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5']);
    expect(levels.map((level) => level.code)).toEqual(['FORM-1', 'FORM-2', 'FORM-3', 'FORM-4', 'FORM-5']);
    expect(levels.map((level) => level.ordinal)).toEqual([1, 2, 3, 4, 5]);
    expect(levels.find((level) => level.name === 'Form 5')?.is_terminal).toBe(1);
    for (const level of levels) {
      expect(String(level.id)).toMatch(UUID_V7);
    }

    const classGroups = await readRows(adapter, 'class_group');
    expect(classGroups).toHaveLength(7);
    expect(classGroups.map((group) => group.name).sort()).toEqual([
      'A',
      'A',
      'B',
      'B',
      'East',
      'Form 5',
      'North',
    ]);
    for (const group of classGroups) {
      expect(String(group.id)).toMatch(UUID_V7);
      expect(String(group.homeroom_teacher_ids)).toBe('[]');
    }

    // The two streams called A belong to different classes, so they are different class
    // groups in different levels.
    const formOne = levels.find((level) => level.name === 'Form 1');
    const formTwo = levels.find((level) => level.name === 'Form 2');
    const streamAInFormOne = classGroups.filter(
      (group) => group.name === 'A' && group.level_id === formOne?.id
    );
    const streamAInFormTwo = classGroups.filter(
      (group) => group.name === 'A' && group.level_id === formTwo?.id
    );
    expect(streamAInFormOne).toHaveLength(1);
    expect(streamAInFormTwo).toHaveLength(1);
    expect(streamAInFormOne[0].id).not.toBe(streamAInFormTwo[0].id);

    // A stream with no learners still becomes a class group.
    const north = classGroups.find((group) => group.name === 'North');
    expect(north).toBeDefined();
    // A class with no streams becomes one default class group.
    const defaultGroup = classGroups.find((group) => group.name === 'Form 5');
    expect(defaultGroup?.level_id).toBe(levels.find((level) => level.name === 'Form 5')?.id);
  });

  it('scopes every class group to the academic year the operator confirmed', async () => {
    await confirm(adapter);
    await runnerFor(adapter).run();

    const years = await readRows(adapter, 'academic_year');
    const current = years.find((year) => year.name === 'AY 2024/2025');
    expect(current).toBeDefined();

    const classGroups = await readRows(adapter, 'class_group');
    for (const group of classGroups) {
      expect(group.academic_year_id).toBe(current?.id);
      expect(group.campus_id).toBeTruthy();
      expect(group.programme_id).toBeTruthy();
    }

    const campuses = await readRows(adapter, 'campus');
    expect(campuses).toHaveLength(1);
    expect(campuses[0].name).toBe('Main Campus');
    expect(campuses[0].is_main).toBe(1);

    const programmes = await readRows(adapter, 'programme');
    expect(programmes).toHaveLength(1);
    expect(programmes[0].name).toBe('Migrated programme');
    expect(programmes[0].calendar_id).toBe(current?.calendar_id);
    expect(programmes[0].status).toBe('active');

    const stages = await readRows(adapter, 'stage');
    expect(stages).toHaveLength(1);
    expect(stages[0].code).toBe('LEGACY');
    expect(stages[0].programme_id).toBe(programmes[0].id);
  });

  it('every learner keeps their class: each stream resolves to the level and year of its class', async () => {
    const entries = await confirm(adapter);
    await runnerFor(adapter).run();

    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    const streamToGroup = classGroupByStream(map);
    const classGroups = await readRows(adapter, 'class_group');
    const levels = await readRows(adapter, 'level');
    const years = await readRows(adapter, 'academic_year');
    const currentYear = years.find((year) => year.name === 'AY 2024/2025');
    const students = await adapter.all<Row>(
      `SELECT id, admission_no, current_class_stream_id, current_class_name, current_class_stream_name
         FROM "students" ORDER BY id`
    );

    let resolved = 0;
    const unresolved: string[] = [];
    for (const student of students) {
      const key = legacyKey(student.current_class_stream_id as string | null);
      const groupId = key === null ? undefined : streamToGroup.get(key);
      if (groupId === undefined) {
        unresolved.push(String(student.id));
        continue;
      }
      const group = classGroups.find((entry) => entry.id === groupId);
      if (group === undefined) throw new Error(`the class group ${groupId} is missing`);
      const level = levels.find((entry) => entry.id === group.level_id);
      expect(level?.name).toBe(student.current_class_name);
      expect(group.academic_year_id).toBe(currentYear?.id);
      resolved += 1;
    }

    // The seed data gives every learner a stream in a class the database holds.
    expect(resolved).toBe(52);
    // The awkward learner points at a stream that does not exist; it is reported, not lost.
    expect(unresolved).toEqual(['S900']);

    // Every class group the map names is one of the class groups the migration wrote.
    expect(streamToGroup.size).toBe(6);
    for (const groupId of streamToGroup.values()) {
      expect(classGroups.some((group) => group.id === groupId)).toBe(true);
    }

    // The decisions kept in the database are the ones the run used.
    expect(await readLevelMapping(adapter)).toEqual(entries);
  });

  it('records the id map so C03 can resolve a learner reference with the normalised key', async () => {
    await confirm(adapter);
    await runnerFor(adapter).run();

    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    const m2Rows = map.filter(
      (row) => row.canonical_entity === 'level' || row.canonical_entity === 'class_group'
    );
    expect(m2Rows).toHaveLength(12);

    const formOne = map.find(
      (row) => row.canonical_entity === 'level' && row.legacy_table === 'classes' && row.legacy_id === '1'
    );
    expect(formOne).toBeDefined();

    const streamTwo = map.find(
      (row) =>
        row.canonical_entity === 'class_group' &&
        row.legacy_table === 'class_streams' &&
        row.legacy_id === '2'
    );
    expect(streamTwo).toBeDefined();
    expect(streamTwo?.legacy_id).toBe(legacyKey('2.0'));

    const classGroups = await readRows(adapter, 'class_group');
    const group = classGroups.find((entry) => entry.id === streamTwo?.canonical_id);
    expect(group?.level_id).toBe(formOne?.canonical_id);
  });

  it('verifies the counts, the level and year of every row, and every learner', async () => {
    await confirm(adapter);
    await runnerFor(adapter).run();

    const report = await readClassGroupMigrationReport(adapter);
    expect(report.counts.before).toEqual({ level: 5, class_group: 8 });
    expect(report.counts.after).toEqual({ level: 5, class_group: 7 });
    expect(report.counts.stray).toEqual({ level: 0, class_group: 0 });

    const failures = report.checks.filter((entry) => !entry.ok && entry.severity === 'error');
    expect(failures).toEqual([]);

    const learnerChecks = report.checks.filter((entry) => entry.check === 'learner_class');
    expect(learnerChecks).toHaveLength(53);
    expect(learnerChecks.filter((entry) => entry.ok)).toHaveLength(52);
    expect(learnerChecks.filter((entry) => !entry.ok).map((entry) => entry.legacyId)).toEqual(['S900']);
    expect(report.learnerResolutions).toHaveLength(52);

    const countChecks = report.checks.filter((entry) => entry.check === 'count');
    expect(countChecks).toHaveLength(2);
    expect(countChecks.every((entry) => entry.ok)).toBe(true);
  });

  it('reports a stream whose class the legacy database does not hold', async () => {
    await confirm(adapter);
    const result = await runnerFor(adapter).run();
    expect(result.status).toBe('completed');

    const unmappable = (await readRows(adapter, LEGACY_UNMAPPABLE_TABLE)).filter(
      (row) => row.canonical_entity === 'class_group'
    );
    expect(unmappable).toHaveLength(1);
    const orphan = unmappable[0];
    expect(orphan.legacy_table).toBe('class_streams');
    expect(orphan.legacy_id).toBe('90');
    expect(orphan.canonical_entity).toBe('class_group');
    expect(String(orphan.reason)).toContain('holds no class "99"');

    // The orphan stream did not become a class group, and the id map does not pretend it did.
    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    expect(map.some((row) => row.legacy_id === '90')).toBe(false);
  });

  it('reports the learners it could not place and why', async () => {
    await confirm(adapter);
    await runnerFor(adapter).run();

    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    const orphanLearner = notes.find(
      (note) => note.code === 'learner_without_class' && note.legacy_id === 'S900'
    );
    expect(orphanLearner).toBeDefined();
    expect(String(orphanLearner?.message)).toContain('class stream "99"');

    // The assumptions the migration made are on the record too.
    const assumptions = notes
      .filter((note) => note.severity === 'info')
      .map((note) => String(note.message));
    expect(assumptions.some((message) => message.includes('campus "Main Campus" was created'))).toBe(true);
    expect(assumptions.some((message) => message.includes('programme "Migrated programme" was created'))).toBe(true);
    expect(assumptions.some((message) => message.includes('stage "Legacy classes"'))).toBe(true);
    expect(assumptions.some((message) => message.includes('homeroom_teacher_ids is empty'))).toBe(true);
  });

  it('rolls back to the state before the migration and keeps the confirmed mapping', async () => {
    await confirm(adapter);
    const runner = runnerFor(adapter, true);
    const run = await runner.run();
    expect(run.status).toBe('completed');
    expect(run.backups).toHaveLength(1);

    const result = await runner.rollbackTo(1);
    expect(result.status).toBe('completed');

    for (const table of ['campus', 'programme', 'stage', 'level', 'class_group']) {
      expect(await readRows(adapter, table)).toHaveLength(0);
    }
    expect(await tableExists(adapter, CREATED_TABLE)).toBe(false);

    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    expect(map.some((row) => row.canonical_entity === 'level')).toBe(false);
    expect(map.some((row) => row.canonical_entity === 'class_group')).toBe(false);
    // M1's map rows stay.
    expect(map.some((row) => row.canonical_entity === 'academic_year')).toBe(true);

    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    expect(notes.some((note) => Number(note.migration_version) === 2)).toBe(false);
    expect(notes.some((note) => Number(note.migration_version) === 1)).toBe(true);

    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    expect(unmappable.some((row) => row.legacy_table === 'class_streams')).toBe(false);

    // The operator's decision is auditable and survives the rollback.
    expect(await readRows(adapter, LEVEL_MAPPING_TABLE)).toHaveLength(7);

    // The legacy rows are untouched: the migration only read them.
    expect(await readRows(adapter, 'classes')).toHaveLength(5);
    expect(await readRows(adapter, 'class_streams')).toHaveLength(7);
    expect(await readRows(adapter, 'students')).toHaveLength(53);

    // A re-run uses the same saved decision.
    const again = await runner.run();
    expect(again.status).toBe('completed');
    expect(await readRows(adapter, 'level')).toHaveLength(5);
    expect(await readRows(adapter, 'class_group')).toHaveLength(7);
  });

  it('uses the operator correction, not a fresh proposal, on a re-run', async () => {
    await confirm(adapter, (entries) =>
      entries.map((entry) =>
        entry.legacyClassName === 'Form 2'
          ? {
              ...entry,
              level: { ...entry.level, name: 'Grade 9', code: 'G9', ordinal: 9 },
              operatorCorrected: true,
            }
          : entry
      )
    );
    const runner = runnerFor(adapter);
    await runner.run();

    const levelNames = (await readRows(adapter, 'level')).map((level) => level.name);
    expect(levelNames).toContain('Grade 9');
    expect(levelNames).not.toContain('Form 2');

    const levels = await readRows(adapter, 'level');
    const gradeNine = levels.find((level) => level.name === 'Grade 9');
    const groups = await readRows(adapter, 'class_group');
    expect(groups.filter((group) => group.level_id === gradeNine?.id)).toHaveLength(2);

    await runner.rollbackTo(1);
    await runner.run();

    const reRunLevels = (await readRows(adapter, 'level')).map((level) => level.name);
    expect(reRunLevels).toContain('Grade 9');
    expect(reRunLevels).not.toContain('Form 2');
  });
});

describe('migration M2 on a database it cannot map', () => {
  let adapter: SqliteAdapter;

  beforeEach(async () => {
    adapter = await prepare();
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('refuses to run before the operator confirmed the mapping', async () => {
    const result = await runnerFor(adapter).run();
    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('needs the confirmed level mapping');
    expect(await readRows(adapter, 'level')).toHaveLength(0);
    expect(await readRows(adapter, 'class_group')).toHaveLength(0);
  });

  it('refuses to commit when the mapping does not cover a class', async () => {
    await confirm(adapter, (entries) =>
      entries.filter((entry) => entry.legacyClassName !== 'Form 4')
    );
    const result = await runnerFor(adapter).run();
    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('does not cover the class "Form 4"');
    expect(await readRows(adapter, 'level')).toHaveLength(0);
    expect(await readRows(adapter, 'class_group')).toHaveLength(0);
  });

  it('refuses to commit when nothing could be mapped', async () => {
    await confirm(adapter, (entries) =>
      entries.map((entry) => ({ ...entry, academicYearId: 'not-a-year' }))
    );
    const result = await runnerFor(adapter).run();
    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('could not map a single class group');
    expect(await readRows(adapter, 'level')).toHaveLength(0);
    expect(await readRows(adapter, 'class_group')).toHaveLength(0);
    // The decisions survive the failed run, so the operator can correct them.
    expect(await readRows(adapter, LEVEL_MAPPING_TABLE)).toHaveLength(7);
  });

  it('reports a class with no year and a year the database does not hold, and maps the rest', async () => {
    await confirm(adapter);
    // A mapping written by an older build or edited by hand can name no year. The step refuses
    // to save one, but the migration has to report the row rather than write an invalid row.
    await adapter.run(
      `UPDATE "${LEVEL_MAPPING_TABLE}" SET academic_year_id = 'not-a-year' WHERE legacy_class_name = 'Form 3'`
    );
    await adapter.run(
      `UPDATE "${LEVEL_MAPPING_TABLE}" SET academic_year_id = '' WHERE legacy_class_name = 'Form 4'`
    );
    const result = await runnerFor(adapter).run();
    expect(result.status).toBe('completed');

    expect(await readRows(adapter, 'level')).toHaveLength(5);
    expect(await readRows(adapter, 'class_group')).toHaveLength(5);

    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    const formThree = unmappable.find(
      (row) => row.legacy_table === 'class_streams' && row.legacy_id === '5'
    );
    const formFour = unmappable.find(
      (row) => row.legacy_table === 'class_streams' && row.legacy_id === '6'
    );
    expect(String(formThree?.reason)).toContain('is not one the canonical database holds');
    expect(String(formFour?.reason)).toContain('names no academic year');
  });
});

describe('migration M2 with foreign keys enforced', () => {
  it('writes and rolls back in the order the keys need', async () => {
    const adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
    await adapter.open();
    try {
      await applyCanonicalSchema(adapter);
      await buildClassGroupFixture(adapter);
      await migrateCalendar(adapter);
      await confirm(adapter);
      const runner = runnerFor(adapter);

      const result = await runner.run();
      expect(result.status).toBe('completed');
      expect(await readRows(adapter, 'class_group')).toHaveLength(7);

      const rolled = await runner.rollbackTo(1);
      expect(rolled.status).toBe('completed');
      expect(await readRows(adapter, 'class_group')).toHaveLength(0);
      expect(await readRows(adapter, 'level')).toHaveLength(0);
      expect(await readRows(adapter, 'campus')).toHaveLength(0);
    } finally {
      await adapter.close();
    }
  });
});
