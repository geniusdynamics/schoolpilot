// ABOUTME: The fixture migration test for M4: the legacy subjects, papers, exam sessions and
// ABOUTME: results of the P0-era seed, the awkward scores, the duplicate marks and the rollback.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyCanonicalSchema,
  createNodeSqliteAdapter,
  type SqliteAdapter,
} from '@/data/adapters/sqlite';
import { createMigrationRunner, type MigrationRunner } from '@/data/migrations';

import { legacyKey } from './001-legacy-calendar';
import {
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
  createInstitutionCalendarMigration,
} from './001-institution-calendar';
import { createClassGroupMigration, CREATED_TABLE } from './002-class-groups';
import {
  LEVEL_MAPPING_TABLE,
  proposeLevelMapping,
  readLevelMappingSource,
  saveLevelMapping,
  type LevelMappingEntry,
} from './002-level-mapping';
import { createLearnerMigration } from './003-learners';
import { buildExamFixture, FIXTURE_NOW, type ExamFixtureOptions } from './004-legacy-fixture';
import {
  assertMarksCarried,
  createExamMigration,
  readExamMigrationReport,
} from './004-exams';
import { readExamPlanSource } from './004-legacy-exams';

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

function jsonList(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim() === '') return [];
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed)
    ? parsed.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

/** A cell as the text a statement binds; the tests read ids the migration wrote. */
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Builds the legacy fixture and applies the canonical schema. */
async function prepare(options: ExamFixtureOptions = {}): Promise<SqliteAdapter> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  await applyCanonicalSchema(adapter);
  await buildExamFixture(adapter, options);
  await migrateCalendarOnly(adapter);
  return adapter;
}

/** Runs migration M1 alone; the class groups, learners and exams wait for the full runner. */
async function migrateCalendarOnly(adapter: SqliteAdapter): Promise<void> {
  const runner = createMigrationRunner({
    adapter,
    migrations: [createInstitutionCalendarMigration({ now: () => FIXTURE_NOW })],
    backupPolicy: 'never',
    now: () => FIXTURE_NOW,
  });
  const result = await runner.run();
  if (result.status === 'failed') throw new Error(result.failed?.error ?? 'migration M1 failed');
}

/** Saves the proposed level mapping, the way the interactive step does. */
async function confirm(adapter: SqliteAdapter): Promise<LevelMappingEntry[]> {
  const source = await readLevelMappingSource(adapter);
  const proposal = proposeLevelMapping(source, { referenceDate: '2024-10-01' });
  const entries = proposal.entries.map((entry) => ({
    ...entry,
    confirmedAt: '2024-10-01T09:00:00Z',
  }));
  await adapter.transaction(async (tx) => {
    await saveLevelMapping(tx, entries);
  });
  return entries;
}

function runnerFor(adapter: SqliteAdapter, versions = 4): MigrationRunner {
  const migrations = [
    createInstitutionCalendarMigration({ now: () => FIXTURE_NOW }),
    createClassGroupMigration({ now: () => FIXTURE_NOW }),
    createLearnerMigration({ now: () => FIXTURE_NOW }),
    createExamMigration({ now: () => FIXTURE_NOW }),
  ].slice(0, versions);
  return createMigrationRunner({
    adapter,
    migrations,
    backupPolicy: 'never',
    now: () => FIXTURE_NOW,
  });
}

/** Prepares the database and runs M1 to M4. */
async function prepareAndRun(options: ExamFixtureOptions = {}): Promise<SqliteAdapter> {
  const adapter = await prepare(options);
  await confirm(adapter);
  const result = await runnerFor(adapter).run();
  if (result.status === 'failed') throw new Error(result.failed?.error ?? 'migration M4 failed');
  return adapter;
}

/** The legacy student each canonical learner was read from. */
function legacyStudentByLearner(map: readonly Row[]): Map<string, string> {
  return new Map(
    map
      .filter((row) => row.legacy_table === 'students' && row.canonical_entity === 'learner')
      .map((row) => [String(row.canonical_id), String(row.legacy_id)])
  );
}

describe('migration M4: the exam sessions, marks and results', () => {
  let adapter: SqliteAdapter;

  beforeEach(async () => {
    adapter = await prepareAndRun();
  });

  afterEach(async () => {
    await adapter?.close();
  });

  it('writes one learning area per subject and one component per paper', async () => {
    const learningAreas = await readRows(adapter, 'learning_area');
    const components = await readRows(adapter, 'component');

    expect(learningAreas).toHaveLength(18);
    for (const learningArea of learningAreas) {
      expect(String(learningArea.id)).toMatch(UUID_V7);
      expect(learningArea.programme_id).toBeTruthy();
      expect(jsonList(learningArea.level_ids)).toEqual([]);
      expect(jsonList(learningArea.pathway_ids)).toEqual([]);
    }
    const english = learningAreas.find((row) => row.code === '101');
    expect(english?.name).toBe('English');
    expect(english?.short_name).toBe('ENG');
    expect(english?.kind).toBe('core');

    // 41 of the 42 papers become components: the paper whose subject does not exist is reported.
    expect(components).toHaveLength(41);
    for (const component of components) {
      expect(String(component.id)).toMatch(UUID_V7);
      expect(learningAreas.some((row) => row.id === component.learning_area_id)).toBe(true);
      expect(component.kind).toBe('paper');
    }

    // A paper's code is its order within its subject, in the legacy id order.
    const englishPapers = components
      .filter((row) => row.learning_area_id === english?.id)
      .map((row) => `${row.code}:${row.name}`)
      .sort();
    expect(englishPapers).toEqual([
      'P1:English Paper 1 (Grammar)',
      'P2:English Paper 2 (Literature)',
      'P3:English Paper 3 (Creative Writing)',
      'P4:English Paper 4 (Oral)',
    ]);

    // The component is not scoped to a session: the same paper is marked out of 100 in one
    // session and 50 in another, so neither maximum is written on the paper.
    const first = components.find((row) => row.name === 'English Paper 1 (Grammar)');
    expect(first?.max_score).toBeNull();
    expect(first?.weight).toBeNull();
  });

  it('writes one assessment per session and learning area', async () => {
    const assessments = await readRows(adapter, 'assessment');
    const learningAreas = await readRows(adapter, 'learning_area');

    // ES001 has five subjects configured, ES002 three, ES901 one. ES902's period is unmapped and
    // ES903 configures no paper, so neither writes an assessment.
    expect(assessments).toHaveLength(9);
    for (const assessment of assessments) {
      expect(String(assessment.id)).toMatch(UUID_V7);
      expect(assessment.status).toBeTruthy();
    }

    const endTermEnglish = assessments.find(
      (row) => row.name === 'End of Term 3 Exams 2024 — English'
    );
    expect(endTermEnglish).toBeDefined();
    expect(endTermEnglish?.kind).toBe('end_term');
    expect(endTermEnglish?.status).toBe('open');
    expect(jsonList(endTermEnglish?.component_ids).length).toBe(3);
    expect(jsonList(endTermEnglish?.learning_area_ids)).toEqual([
      learningAreas.find((row) => row.code === '101')?.id,
    ]);
    // Three papers out of 100 each.
    expect(endTermEnglish?.max_score).toBe(300);
    // The class groups an assessment applies to are the ones its marks' enrolments sit in.
    expect(jsonList(endTermEnglish?.class_group_ids).length).toBeGreaterThan(0);
    expect(jsonList(endTermEnglish?.level_ids).length).toBeGreaterThan(0);

    const midTermBiology = assessments.find(
      (row) => row.name === 'Mid Term 1 Exams 2025 — Biology'
    );
    expect(midTermBiology?.kind).toBe('mid_term');
    // The legacy status "Planning" is the canonical draft.
    expect(midTermBiology?.status).toBe('draft');
    // 80 + 80 + 40.
    expect(midTermBiology?.max_score).toBe(200);

    const opener = assessments.find((row) => row.name === 'Opener Exams Term 1 2025 — English');
    expect(opener?.status).toBe('published');
    expect(opener?.max_score).toBe(50);

    // The mid-term subjects the seed configures but no learner sat are written: the session
    // configured them, so the assessment exists with no mark.
    const chemistry = assessments.find((row) => row.name === 'Mid Term 1 Exams 2025 — Chemistry');
    expect(chemistry).toBeDefined();
    expect(jsonList(chemistry?.class_group_ids)).toEqual([]);
  });

  it('writes one mark per learner, assessment, learning area and paper', async () => {
    const marks = await readRows(adapter, 'mark');
    expect(marks).toHaveLength(10);
    for (const mark of marks) {
      expect(String(mark.id)).toMatch(UUID_V7);
      expect(mark.version).toBe(1);
      expect(mark.status_code).toBeTruthy();
    }

    // The paper marks of SR001: English Paper 1 and 2, Mathematics Paper 1.
    const learner = await adapter.get<Row>(
      `SELECT id FROM "learner" WHERE "admission_number" = ?`,
      ['ADM001']
    );
    const enrolment = await adapter.get<Row>(
      `SELECT id FROM "enrolment" WHERE "learner_id" = ?`,
      [text(learner?.['id'])]
    );
    const learnerMarks = marks.filter((row) => row.enrolment_id === enrolment?.['id']);
    expect(learnerMarks).toHaveLength(4);
    expect(
      learnerMarks
        .map((row) => row.score ?? row.rubric_level ?? row.status_code)
        .sort()
    ).toEqual(['45', '60', '70', '85']);
    for (const mark of learnerMarks) {
      expect(mark.learning_area_id).toBeTruthy();
      expect(mark.component_id).toBeTruthy();
      expect(mark.assessment_id).toBeTruthy();
    }

    // No two marks hold the same learner, assessment, learning area and component.
    const keys = marks.map((row) =>
      [row.assessment_id, row.enrolment_id, row.learning_area_id, row.component_id].join('|')
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps a letter and a dash as the mark value instead of inventing a score', async () => {
    const marks = await readRows(adapter, 'mark');
    const withLevel = marks.find((row) => row.rubric_level === 'A');
    expect(withLevel).toBeDefined();
    expect(withLevel?.score).toBeNull();
    expect(withLevel?.status_code).toBe('present');

    const incomplete = marks.find((row) => row.status_code === 'incomplete');
    expect(incomplete).toBeDefined();
    expect(incomplete?.score).toBeNull();
    expect(incomplete?.rubric_level).toBeNull();

    const absent = marks.find((row) => row.status_code === 'absent');
    expect(absent).toBeDefined();
    expect(absent?.score).toBeNull();

    // The report says what it did with each, and no grading scale was invented.
    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    const codes = notes
      .filter((note) => Number(note.migration_version) === 4)
      .map((note) => note.code);
    expect(codes).toContain('mark_score_not_numeric');
    expect(codes).toContain('mark_without_score');
    expect(notes.some((note) => String(note.message).includes('does not scale, round or grade'))).toBe(
      true
    );

    // No canonical result row is written and no grading scale is invented.
    expect(await readRows(adapter, 'result')).toHaveLength(0);
    expect(await readRows(adapter, 'grading_scale')).toHaveLength(0);
  });

  it('writes a period result for the totals the legacy result carries', async () => {
    const periodResults = await readRows(adapter, 'period_result');
    expect(periodResults).toHaveLength(5);

    const aggregates = periodResults.map((row) => JSON.parse(String(row.aggregates)) as Row);
    expect(aggregates.map((entry) => entry['total']).sort((left, right) => Number(left) - Number(right)))
      .toEqual([45, 62, 98, 120, 215]);
    expect(aggregates.map((entry) => entry['mean_grade']).sort()).toEqual([
      'A',
      'B',
      'B+',
      'C',
      'C+',
    ]);

    // The class rank becomes the position; the stream rank is not carried and is reported.
    const first = aggregates.find((entry) => entry['total'] === 215);
    expect(first?.['position']).toBe(3);
    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    expect(
      notes.some(
        (note) =>
          Number(note.migration_version) === 4 &&
          String(note.message).includes('stream_rank was not carried')
      )
    ).toBe(true);

    // The overall comment is the only comment the legacy result holds.
    const withComment = periodResults.find((row) =>
      String(row.class_teacher_comment ?? '').includes('Good work')
    );
    expect(withComment).toBeDefined();
  });

  it('reports every legacy row it could not map, and why', async () => {
    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    const of = (entity: string): Row[] =>
      unmappable.filter((row) => row.canonical_entity === entity);

    // Two subjects cannot become a learning area.
    expect(of('learning_area').map((row) => String(row.legacy_id)).sort()).toEqual(['901', '902']);
    expect(String(of('learning_area')[0]?.reason)).toContain('code');

    // The paper whose subject does not exist.
    expect(of('component').map((row) => String(row.legacy_id))).toEqual(['901']);
    expect(String(of('component')[0]?.reason)).toContain('subject "999"');

    // The session whose school period M1 did not map: one row per learning area it configured.
    const assessments = of('assessment');
    expect(assessments).toHaveLength(1);
    expect(assessments[0].legacy_table).toBe('exam_sessions');
    expect(assessments[0].legacy_id).toBe('ES902');
    expect(String(assessments[0].reason)).toContain('"99" is not one migration M1 mapped');

    // Four marks the canonical model cannot hold, and the second result for one sitting.
    expect(of('mark').map((row) => String(row.legacy_id)).sort()).toEqual([
      'NEST001',
      'PM004',
      'PM005',
      'PM009',
      'PM011',
      'PM012',
    ]);
    expect(of('mark').filter((row) => String(row.reason).includes('duplicate'))).toHaveLength(3);
    expect(
      of('mark').some((row) => String(row.reason).includes('has no enrolment migration M3 wrote'))
    ).toBe(true);
    expect(
      of('mark').some((row) =>
        String(row.reason).includes('not to the result\'s session')
      )
    ).toBe(true);

    expect(of('period_result').map((row) => String(row.legacy_id)).sort()).toEqual([
      'SR004',
      'SR006',
      'SR901',
    ]);
    expect(
      of('period_result').some((row) => String(row.reason).includes('already holds a result'))
    ).toBe(true);
  });

  it('carries the marks of every learner: the multiset before equals the multiset after', async () => {
    const report = await readExamMigrationReport(adapter);
    const source = await readExamPlanSource(adapter);

    // The report compares one tuple per mark, so the count is the marks the migration kept.
    expect(report.learners).toHaveLength(4);
    expect(report.learners.every((entry) => entry.matched)).toBe(true);
    expect(report.counts.before.mark).toBe(source.marks.length);
    expect(report.counts.before.mark).toBe(
      report.counts.after.mark + report.counts.unmapped.mark
    );
    expect(report.counts.stray).toEqual({
      learning_area: 0,
      component: 0,
      assessment: 0,
      mark: 0,
      period_result: 0,
      result: 0,
    });

    const failures = report.checks.filter((entry) => !entry.ok && entry.severity === 'error');
    expect(failures).toEqual([]);

    // Every learner's before and after tuples are the same multiset, value included.
    const values = (tuples: readonly string[]): string[] =>
      tuples.map((tuple) => tuple.split('\u0001')[3] ?? '').sort();
    for (const learner of report.learners) {
      expect(values(learner.after)).toEqual(values(learner.before));
    }
    const s001 = report.learners.find((entry) => entry.legacyStudentId === 'S001');
    expect(values(s001?.after ?? [])).toEqual([
      'score:45',
      'score:60',
      'score:70',
      'score:85',
    ]);
  });

  it('refuses a learner whose marks changed after the migration', async () => {
    const before = await readExamMigrationReport(adapter);
    expect(before.learners.every((entry) => entry.matched)).toBe(true);

    // A single score changed is enough: the learner's multiset no longer matches the legacy row.
    await adapter.run(
      `UPDATE "mark" SET "score" = '0' WHERE "id" = (
         SELECT "id" FROM "mark" WHERE "score" = '85' ORDER BY "id" LIMIT 1
       )`
    );

    const after = await readExamMigrationReport(adapter);
    const changed = after.learners.filter((entry) => !entry.matched);
    expect(changed).toHaveLength(1);
    expect(changed[0].legacyStudentId).toBe('S001');
    expect(changed[0].before).not.toEqual(changed[0].after);
    expect(() => assertMarksCarried(after)).toThrow(/did not carry the marks of 1 learner/);
  });

  it('records the id map and links every mark to a real assessment and enrolment', async () => {
    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    const count = (legacyTable: string, entity: string): number =>
      map.filter((row) => row.legacy_table === legacyTable && row.canonical_entity === entity)
        .length;

    expect(count('subjects', 'learning_area')).toBe(18);
    expect(count('subject_papers', 'component')).toBe(41);
    expect(count('student_exam_results', 'period_result')).toBe(5);
    expect(count('student_paper_marks', 'mark')).toBe(10);
    expect(count('student_exam_results', 'mark')).toBe(0);

    // M1's, M2's and M3's rows stay, under the normalised key M1's contract requires.
    expect(count('school_periods', 'academic_period')).toBeGreaterThan(0);
    expect(count('class_streams', 'class_group')).toBe(6);
    expect(count('students', 'learner')).toBe(64);
    expect(map.find((row) => row.legacy_table === 'subject_papers' && row.legacy_id === '10')).toBeDefined();

    // A mark resolves through its own row to the legacy paper and learner, not by inference.
    const marks = await readRows(adapter, 'mark');
    const assessments = await readRows(adapter, 'assessment');
    const enrolments = await readRows(adapter, 'enrolment');
    const learnerByLegacy = legacyStudentByLearner(map);
    const students = await adapter.all<Row>(`SELECT id FROM "students"`);
    for (const mark of marks) {
      const assessment = assessments.find((row) => row.id === mark.assessment_id);
      const enrolment = enrolments.find((row) => row.id === mark.enrolment_id);
      expect(assessment).toBeDefined();
      expect(enrolment).toBeDefined();
      expect(jsonList(assessment?.learning_area_ids).includes(String(mark.learning_area_id))).toBe(
        true
      );
      const legacyStudent = learnerByLegacy.get(String(enrolment?.learner_id));
      expect(students.some((student) => legacyKey(String(student.id)) === legacyStudent)).toBe(true);
    }
  });

  it('verifies the counts, every row it wrote and every mark', async () => {
    const report = await readExamMigrationReport(adapter);

    expect(report.counts.before).toEqual({
      learning_area: 20,
      component: 42,
      assessment: 10,
      mark: 16,
      period_result: 8,
      result: 0,
    });
    expect(report.counts.after).toEqual({
      learning_area: 18,
      component: 41,
      assessment: 9,
      mark: 10,
      period_result: 5,
      result: 0,
    });
    expect(report.counts.unmapped).toEqual({
      learning_area: 2,
      component: 1,
      assessment: 1,
      mark: 6,
      period_result: 3,
      result: 0,
    });

    const countChecks = report.checks.filter((entry) => entry.check === 'count');
    expect(countChecks).toHaveLength(6);
    expect(countChecks.every((entry) => entry.ok)).toBe(true);

    const uniqueness = report.checks.filter((entry) => entry.check === 'mark_unique');
    expect(uniqueness).toHaveLength(10);
    expect(uniqueness.every((entry) => entry.ok)).toBe(true);

    const equality = report.checks.filter((entry) => entry.check === 'mark_equality');
    expect(equality).toHaveLength(4);
    expect(equality.every((entry) => entry.ok)).toBe(true);

    expect(report.assumptions.some((line) => line.includes('no result row is written'))).toBe(true);
    expect(report.assumptions.some((line) => line.includes('does not scale, round or grade'))).toBe(
      true
    );
  });

  it('rolls back to the state before M4 and leaves M1, M2, M3 and the legacy rows alone', async () => {
    const runner = runnerFor(adapter);
    const rolled = await runner.rollbackTo(3);
    expect(rolled.status).toBe('completed');

    for (const table of ['learning_area', 'component', 'assessment', 'mark', 'period_result']) {
      expect(await readRows(adapter, table)).toHaveLength(0);
    }

    // The created-rows table stays for M2 and M3, with their rows and none of M4's.
    expect(await tableExists(adapter, CREATED_TABLE)).toBe(true);
    const created = await readRows(adapter, CREATED_TABLE);
    expect(created.some((row) => Number(row.migration_version) === 4)).toBe(false);
    expect(created.some((row) => Number(row.migration_version) === 3)).toBe(true);
    expect(created.some((row) => Number(row.migration_version) === 2)).toBe(true);

    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    expect(map.some((row) => row.canonical_entity === 'learning_area')).toBe(false);
    expect(map.some((row) => row.canonical_entity === 'component')).toBe(false);
    expect(map.some((row) => row.canonical_entity === 'mark')).toBe(false);
    expect(map.some((row) => row.canonical_entity === 'period_result')).toBe(false);
    expect(map.some((row) => row.canonical_entity === 'learner')).toBe(true);
    expect(map.some((row) => row.canonical_entity === 'class_group')).toBe(true);

    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    expect(notes.some((note) => Number(note.migration_version) === 4)).toBe(false);
    expect(notes.some((note) => Number(note.migration_version) === 3)).toBe(true);

    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    expect(unmappable.some((row) => row.canonical_entity === 'learning_area')).toBe(false);
    expect(unmappable.some((row) => row.canonical_entity === 'mark')).toBe(false);

    // M1's, M2's and M3's rows and the legacy rows survive; only M4's rows went.
    expect(await readRows(adapter, 'learner')).toHaveLength(64);
    expect(await readRows(adapter, 'enrolment')).toHaveLength(62);
    expect(await readRows(adapter, 'class_group')).toHaveLength(7);
    expect(await readRows(adapter, LEVEL_MAPPING_TABLE)).toHaveLength(7);
    expect(await readRows(adapter, 'subjects')).toHaveLength(20);
    expect(await readRows(adapter, 'subject_papers')).toHaveLength(42);
    expect(await readRows(adapter, 'exam_sessions')).toHaveLength(5);
    expect(await readRows(adapter, 'student_exam_results')).toHaveLength(8);
    expect(await readRows(adapter, 'student_paper_marks')).toHaveLength(15);

    // A re-run writes the same rows again.
    const again = await runner.run();
    expect(again.status).toBe('completed');
    expect(await readRows(adapter, 'learning_area')).toHaveLength(18);
    expect(await readRows(adapter, 'assessment')).toHaveLength(9);
    expect(await readRows(adapter, 'mark')).toHaveLength(10);
    expect(await readRows(adapter, 'period_result')).toHaveLength(5);
  });
});

describe('migration M4 on a database it cannot map', () => {
  let adapter: SqliteAdapter;

  afterEach(async () => {
    await adapter.close();
  });

  it('refuses to run before the learners migration M3', async () => {
    adapter = await prepare();
    await confirm(adapter);
    const runner = createMigrationRunner({
      adapter,
      migrations: [
        createInstitutionCalendarMigration({ now: () => FIXTURE_NOW }),
        createClassGroupMigration({ now: () => FIXTURE_NOW }),
        createExamMigration({ now: () => FIXTURE_NOW }),
      ],
      backupPolicy: 'never',
      now: () => FIXTURE_NOW,
    });
    const result = await runner.run();
    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('run migration M3 first');
    expect(await readRows(adapter, 'mark')).toHaveLength(0);
  });

  it('refuses to write when the canonical exam tables already hold rows', async () => {
    adapter = await prepare();
    await confirm(adapter);
    const learned = createMigrationRunner({
      adapter,
      migrations: [
        createInstitutionCalendarMigration({ now: () => FIXTURE_NOW }),
        createClassGroupMigration({ now: () => FIXTURE_NOW }),
        createLearnerMigration({ now: () => FIXTURE_NOW }),
      ],
      backupPolicy: 'never',
      now: () => FIXTURE_NOW,
    });
    expect((await learned.run()).status).toBe('completed');

    const institution = await adapter.get<Row>(`SELECT id FROM "institution" ORDER BY rowid LIMIT 1`);
    const programme = await adapter.get<Row>(`SELECT id FROM "programme" ORDER BY rowid LIMIT 1`);
    await adapter.run(
      `INSERT INTO "learning_area" ("id", "institution_id", "programme_id", "code", "name", "kind",
         "level_ids", "pathway_ids", "created_at", "updated_at")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '00000000-0000-7000-8000-0000000000aa',
        text(institution?.['id']),
        text(programme?.['id']),
        'HAND',
        'Hand Written',
        'core',
        '[]',
        '[]',
        '2026-01-01T00:00:00Z',
        '2026-01-01T00:00:00Z',
      ]
    );

    const result = await runnerFor(adapter).run();
    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('already holds 1 row');
  });

  it('writes no mark for a database whose legacy database holds no exam session', async () => {
    adapter = await prepare({ withSessions: false });
    await confirm(adapter);
    const result = await runnerFor(adapter).run();
    expect(result.status).toBe('completed');

    // The subjects and papers are still migrated: they exist independently of a session.
    expect(await readRows(adapter, 'learning_area')).toHaveLength(18);
    expect(await readRows(adapter, 'assessment')).toHaveLength(0);
    expect(await readRows(adapter, 'mark')).toHaveLength(0);
    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    expect(
      notes.some(
        (note) =>
          Number(note.migration_version) === 4 && String(note.code) === 'no_sessions'
      )
    ).toBe(true);
  });
});
