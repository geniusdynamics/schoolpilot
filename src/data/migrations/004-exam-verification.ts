// ABOUTME: The verification of migration M4: the counts, every canonical row read back, every
// ABOUTME: mark's assessment and enrolment, and the marks of every learner before and after.

import type { SqliteRow } from '@/data/adapters/sqlite';

import { legacyKey, legacyText, tableExists, type SqlReader } from './001-legacy-calendar';
import {
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
} from './001-institution-calendar';
import { CREATED_TABLE } from './002-class-groups';
import { isDecimalText, normaliseScoreText } from './004-exam-rules';
import {
  readExamPlanSource,
  type ExamPlanSource,
  type LegacyMark,
  type LegacyPaperSetting,
  type LegacySession,
} from './004-legacy-exams';
import {
  EXAM_ENTITIES,
  type ExamCounts,
  type ExamEntity,
  type ExamMapEntry,
  type ExamUnmappableRow,
  type WrittenExamEntity,
} from './004-exam-plan';

/** A text column of a row that may be missing. */
function textOf(row: SqliteRow | undefined, column: string): string | null {
  return row === undefined ? null : legacyText(row, column);
}

/** One check the migration made about the rows it wrote. */
export interface ExamCheck {
  readonly entity: ExamEntity;
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

/** One learner's marks before the migration and after it, as the multisets they are. */
export interface LearnerMarkEquality {
  readonly legacyStudentId: string;
  readonly learnerId: string;
  /** `(period, learning area, component, value)` per mark the legacy data holds. */
  readonly before: readonly string[];
  /** The same tuples read back from the canonical marks. */
  readonly after: readonly string[];
  readonly matched: boolean;
}

/** A note migration M4 left behind. */
export interface ExamNote {
  readonly severity: string;
  readonly code: string;
  readonly entity: string;
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly message: string;
}

/** The verification the migration made, read back from the database. */
export interface ExamMigrationVerification {
  readonly counts: {
    /** The legacy rows that could become a row of the entity. */
    readonly before: ExamCounts;
    /** The canonical rows the id map (or the created-rows record) names. */
    readonly after: ExamCounts;
    /** The legacy rows the migration reported instead of writing. */
    readonly unmapped: ExamCounts;
    /** The canonical rows the migration did not write. */
    readonly stray: ExamCounts;
  };
  readonly checks: readonly ExamCheck[];
  readonly learners: readonly LearnerMarkEquality[];
  readonly issues: readonly ExamNote[];
  readonly assumptions: readonly string[];
  readonly unmappable: readonly ExamUnmappableRow[];
  readonly mapping: readonly ExamMapEntry[];
}

function emptyCounts(): ExamCounts {
  return {
    learning_area: 0,
    component: 0,
    assessment: 0,
    mark: 0,
    period_result: 0,
    result: 0,
  };
}

function isExamEntity(value: string): value is ExamEntity {
  return (EXAM_ENTITIES as readonly string[]).includes(value);
}

function isWrittenEntity(value: string): value is WrittenExamEntity {
  return isExamEntity(value) && value !== 'result';
}

/** Every row of a canonical table, by id. */
async function rowsById(reader: SqlReader, table: string): Promise<Map<string, SqliteRow>> {
  if (!(await tableExists(reader, table))) return new Map();
  const rows = await reader.all<SqliteRow>(`SELECT * FROM "${table}"`);
  return new Map(rows.map((row) => [textOf(row, 'id') ?? '', row]));
}

/** Reads the id-map rows migration M4 wrote. */
async function readExamIdMap(reader: SqlReader): Promise<ExamMapEntry[]> {
  if (!(await tableExists(reader, LEGACY_ID_MAP_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_table, legacy_id, canonical_entity, canonical_id
       FROM "${LEGACY_ID_MAP_TABLE}"
      ORDER BY legacy_table, legacy_id, canonical_entity`
  );
  const entries: ExamMapEntry[] = [];
  for (const row of rows) {
    const canonicalEntity = textOf(row, 'canonical_entity') ?? '';
    if (!isExamEntity(canonicalEntity)) continue;
    entries.push({
      legacyTable: textOf(row, 'legacy_table') ?? '',
      legacyId: textOf(row, 'legacy_id') ?? '',
      canonicalEntity,
      canonicalId: textOf(row, 'canonical_id') ?? '',
    });
  }
  return entries;
}

/** Reads the unmappable rows migration M4 wrote. */
async function readExamUnmappable(reader: SqlReader): Promise<ExamUnmappableRow[]> {
  if (!(await tableExists(reader, LEGACY_UNMAPPABLE_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_table, legacy_id, canonical_entity, reason, detail
       FROM "${LEGACY_UNMAPPABLE_TABLE}"
      ORDER BY legacy_table, legacy_id, canonical_entity`
  );
  const entries: ExamUnmappableRow[] = [];
  for (const row of rows) {
    const canonicalEntity = textOf(row, 'canonical_entity') ?? '';
    if (!isWrittenEntity(canonicalEntity)) continue;
    const detail = textOf(row, 'detail');
    entries.push({
      legacyTable: textOf(row, 'legacy_table') ?? '',
      legacyId: textOf(row, 'legacy_id') ?? '',
      canonicalEntity,
      reason: textOf(row, 'reason') ?? '',
      ...(detail === null ? {} : { detail }),
    });
  }
  return entries;
}

/** Reads the notes migration M4 left; the earlier migrations' notes are other versions. */
async function readExamNotes(reader: SqlReader): Promise<ExamNote[]> {
  if (!(await tableExists(reader, LEGACY_NOTES_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT severity, code, entity, legacy_table, legacy_id, message
       FROM "${LEGACY_NOTES_TABLE}"
      WHERE migration_version = 4
      ORDER BY rowid`
  );
  return rows.map((row) => ({
    severity: textOf(row, 'severity') ?? 'warning',
    code: textOf(row, 'code') ?? '',
    entity: textOf(row, 'entity') ?? '',
    legacyTable: textOf(row, 'legacy_table') ?? '',
    legacyId: textOf(row, 'legacy_id') ?? '',
    message: textOf(row, 'message') ?? '',
  }));
}

/** The canonical ids the migration recorded as its own. */
async function readCreatedIds(reader: SqlReader, entity: WrittenExamEntity): Promise<Set<string>> {
  if (!(await tableExists(reader, CREATED_TABLE))) return new Set();
  const rows = await reader.all<SqliteRow>(
    `SELECT id FROM "${CREATED_TABLE}" WHERE migration_version = 4 AND entity = ?`,
    [entity]
  );
  return new Set(rows.map((row) => textOf(row, 'id') ?? ''));
}

/** The learner each legacy student became, through M3's id map. */
async function readStudentLearnerMap(
  reader: SqlReader
): Promise<{ legacyStudentId: string; learnerId: string }[]> {
  if (!(await tableExists(reader, LEGACY_ID_MAP_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_id, canonical_id FROM "${LEGACY_ID_MAP_TABLE}"
      WHERE legacy_table = 'students' AND canonical_entity = 'learner'
      ORDER BY legacy_id`
  );
  const entries: { legacyStudentId: string; learnerId: string }[] = [];
  for (const row of rows) {
    const legacyStudentId = legacyKey(textOf(row, 'legacy_id'));
    const learnerId = textOf(row, 'canonical_id');
    if (legacyStudentId === null || learnerId === null) continue;
    entries.push({ legacyStudentId, learnerId });
  }
  return entries;
}

/** A JSON array column as its text entries. */
function jsonList(row: SqliteRow | undefined, column: string): string[] {
  if (row === undefined) return [];
  const raw = row[column];
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
}

/** A JSON object column, or an empty object when it cannot be read. */
function jsonObject(row: SqliteRow | undefined, column: string): Record<string, unknown> {
  if (row === undefined) return {};
  const raw = row[column];
  if (typeof raw !== 'string' || raw.trim() === '') return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function check(
  entity: ExamEntity,
  legacyTable: string,
  legacyId: string,
  canonicalId: string,
  name: string,
  expected: string,
  actual: string,
  severity: 'error' | 'warning' = 'error'
): ExamCheck {
  return {
    entity,
    legacyTable,
    legacyId,
    canonicalId,
    check: name,
    expected,
    actual,
    ok: expected === actual,
    severity,
  };
}

/** The value a canonical mark carries, in the shape both sides of the equality compare. */
function canonicalMarkValue(row: SqliteRow): string {
  const score = textOf(row, 'score');
  if (score !== null) return `score:${normaliseScoreText(score)}`;
  const level = textOf(row, 'rubric_level');
  if (level !== null) return `level:${level}`;
  return `status:${textOf(row, 'status_code') ?? ''}`;
}

/** The status codes spec 03 §9 names; the second reading of a legacy score column. */
const STATUS_BY_SCORE: Readonly<Record<string, string>> = {
  abs: 'absent',
  absent: 'absent',
  exm: 'exempt',
  exempt: 'exempt',
  exempted: 'exempt',
  inc: 'incomplete',
  incomplete: 'incomplete',
  mal: 'malpractice',
  malpractice: 'malpractice',
  present: 'present',
};

/** The value a legacy score column carried, read without the plan's interpretation. */
function legacyMarkValue(mark: LegacyMark): string {
  const raw = mark.score;
  if (raw === null) return 'status:incomplete';
  if (isDecimalText(raw)) return `score:${normaliseScoreText(raw)}`;
  const trimmed = raw.trim();
  if (['-', '--', '—', '–', '/', 'n/a', 'nil'].includes(trimmed.toLowerCase())) {
    return 'status:incomplete';
  }
  const status = STATUS_BY_SCORE[trimmed.toLowerCase()];
  return status === undefined ? `level:${raw}` : `status:${status}`;
}

/** The tuple a mark is compared under: its period, learning area, component and value. */
function markTuple(
  academicPeriodId: string,
  learningAreaId: string,
  componentId: string,
  value: string
): string {
  return [academicPeriodId, learningAreaId, componentId, value].join('\u0001');
}

/** Every paper setting the legacy sessions carry, with the session that carries it. */
function allSettings(
  source: ExamPlanSource
): { setting: LegacyPaperSetting; session: LegacySession }[] {
  const entries: { setting: LegacyPaperSetting; session: LegacySession }[] = [];
  for (const session of source.sessions) {
    for (const setting of session.settings) entries.push({ setting, session });
  }
  return entries;
}

/** A canonical mark, the learner it belongs to and the value it carries. */
interface CanonicalMark {
  readonly row: SqliteRow;
  readonly learnerId: string;
  readonly legacyStudentId: string;
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly assessment: SqliteRow | undefined;
  readonly value: string;
}

/**
 * Verifies migration M4 against the rows it wrote.
 *
 * The counts and the per-learner mark equality are re-derived from the legacy rows and the
 * canonical tables, not from the plan: the plan is what the migration intended, and this is what
 * the database holds.
 */
export async function verifyExamMigration(
  reader: SqlReader
): Promise<ExamMigrationVerification> {
  const legacy = await readExamPlanSource(reader);
  const mapping = await readExamIdMap(reader);
  const unmappable = await readExamUnmappable(reader);
  const notes = await readExamNotes(reader);

  const learningAreas = await rowsById(reader, 'learning_area');
  const components = await rowsById(reader, 'component');
  const assessments = await rowsById(reader, 'assessment');
  const marks = await rowsById(reader, 'mark');
  const periodResults = await rowsById(reader, 'period_result');
  const results = await rowsById(reader, 'result');
  const enrolments = await rowsById(reader, 'enrolment');

  const mapByEntity = new Map<ExamEntity, ExamMapEntry[]>();
  for (const entity of EXAM_ENTITIES) {
    mapByEntity.set(
      entity,
      mapping.filter((entry) => entry.canonicalEntity === entity)
    );
  }
  const reportCount = (entity: WrittenExamEntity): number =>
    unmappable.filter((row) => row.canonicalEntity === entity).length;

  const createdAssessments = await readCreatedIds(reader, 'assessment');

  /** The canonical component each legacy paper became. */
  const componentByLegacyPaper = new Map<string, SqliteRow>();
  for (const entry of mapByEntity.get('component') ?? []) {
    const row = components.get(entry.canonicalId);
    if (row !== undefined) componentByLegacyPaper.set(entry.legacyId, row);
  }
  /** The canonical learning area each legacy subject became. */
  const learningAreaByLegacySubject = new Map<string, SqliteRow>();
  for (const entry of mapByEntity.get('learning_area') ?? []) {
    const row = learningAreas.get(entry.canonicalId);
    if (row !== undefined) learningAreaByLegacySubject.set(entry.legacyId, row);
  }

  const settings = allSettings(legacy);
  const settingById = new Map(settings.map((entry) => [entry.setting.id, entry]));
  const resultById = new Map(legacy.results.map((result) => [result.id, result]));
  const sessionById = new Map(legacy.sessions.map((session) => [session.id, session]));

  /** The learner each legacy student became, and back again. */
  const learnerByLegacyStudent = new Map<string, string>();
  const legacyStudentByLearner = new Map<string, string>();
  for (const entry of await readStudentLearnerMap(reader)) {
    learnerByLegacyStudent.set(entry.legacyStudentId, entry.learnerId);
    legacyStudentByLearner.set(entry.learnerId, entry.legacyStudentId);
  }

  const before = emptyCounts();
  before.learning_area = legacy.subjects.filter((subject) => subject.id !== '').length;
  before.component = legacy.papers.filter((paper) => paper.id !== '').length;
  before.mark = legacy.marks.length;
  before.period_result = legacy.results.length;
  before.assessment = countImpliedAssessments(legacy, componentByLegacyPaper);
  before.result = 0;

  const after = emptyCounts();
  after.learning_area = mapByEntity.get('learning_area')?.length ?? 0;
  after.component = mapByEntity.get('component')?.length ?? 0;
  after.assessment = assessments.size;
  after.mark = mapByEntity.get('mark')?.length ?? 0;
  after.period_result = mapByEntity.get('period_result')?.length ?? 0;
  after.result = results.size;

  const unmapped = emptyCounts();
  unmapped.learning_area = reportCount('learning_area');
  unmapped.component = reportCount('component');
  unmapped.assessment = reportCount('assessment');
  unmapped.mark = reportCount('mark');
  unmapped.period_result = reportCount('period_result');
  unmapped.result = 0;

  const stray = emptyCounts();
  stray.learning_area = countStray(learningAreas, mapByEntity.get('learning_area') ?? []);
  stray.component = countStray(components, mapByEntity.get('component') ?? []);
  stray.mark = countStray(marks, mapByEntity.get('mark') ?? []);
  stray.period_result = countStray(periodResults, mapByEntity.get('period_result') ?? []);
  stray.assessment = [...assessments.keys()].filter((id) => !createdAssessments.has(id)).length;
  stray.result = results.size;

  const checks: ExamCheck[] = [];

  for (const entity of EXAM_ENTITIES) {
    checks.push(
      check(entity, '', '', '', 'count', `${before[entity]}`, `${after[entity] + unmapped[entity]}`)
    );
    if (stray[entity] > 0) {
      checks.push(check(entity, '', '', '', 'stray', '0', `${stray[entity]}`));
    }
  }

  // The report names real legacy rows, with a reason, never an invented one.
  const legacyKeys = new Set<string>([
    ...legacy.subjects.map((row) => `subjects\u0000${row.id}`),
    ...legacy.papers.map((row) => `subject_papers\u0000${row.id}`),
    ...legacy.sessions.map((row) => `exam_sessions\u0000${row.id}`),
    ...legacy.results.map((row) => `student_exam_results\u0000${row.id}`),
    ...legacy.marks.map((row) => `${row.legacyTable}\u0000${row.id}`),
  ]);
  for (const row of unmappable) {
    const key = `${row.legacyTable}\u0000${row.legacyId}`;
    const named = legacyKeys.has(key) && row.reason.trim() !== '';
    checks.push(
      check(
        row.canonicalEntity,
        row.legacyTable,
        row.legacyId,
        '',
        'unmappable_row',
        'reported',
        named ? 'reported' : 'unexplained'
      )
    );
  }

  // Every learning area and component carries the name and the parent the legacy row named.
  for (const entry of mapByEntity.get('learning_area') ?? []) {
    const subject = legacy.subjects.find((row) => row.id === entry.legacyId);
    const row = learningAreas.get(entry.canonicalId);
    if (subject === undefined || row === undefined) {
      checks.push(
        check(
          'learning_area',
          'subjects',
          entry.legacyId,
          entry.canonicalId,
          'learning_area_row',
          'present',
          'missing'
        )
      );
      continue;
    }
    checks.push(
      check(
        'learning_area',
        'subjects',
        entry.legacyId,
        entry.canonicalId,
        'learning_area_name',
        subject.name ?? '',
        textOf(row, 'name') ?? ''
      )
    );
    const code = subject.code ?? subject.abbreviation ?? '';
    checks.push(
      check(
        'learning_area',
        'subjects',
        entry.legacyId,
        entry.canonicalId,
        'learning_area_code',
        code,
        textOf(row, 'code') ?? ''
      )
    );
  }

  for (const entry of mapByEntity.get('component') ?? []) {
    const paper = legacy.papers.find((row) => row.id === entry.legacyId);
    const row = components.get(entry.canonicalId);
    if (paper === undefined || row === undefined) {
      checks.push(
        check(
          'component',
          'subject_papers',
          entry.legacyId,
          entry.canonicalId,
          'component_row',
          'present',
          'missing'
        )
      );
      continue;
    }
    checks.push(
      check(
        'component',
        'subject_papers',
        entry.legacyId,
        entry.canonicalId,
        'component_name',
        paper.name ?? '',
        textOf(row, 'name') ?? ''
      )
    );
    const learningArea =
      paper.subjectId === null ? undefined : learningAreaByLegacySubject.get(paper.subjectId);
    checks.push(
      check(
        'component',
        'subject_papers',
        entry.legacyId,
        entry.canonicalId,
        'component_learning_area',
        textOf(learningArea, 'id') ?? '',
        textOf(row, 'learning_area_id') ?? ''
      )
    );
  }

  // Every mark points at a real assessment and a real enrolment, and carries what it held.
  const canonicalMarks: CanonicalMark[] = [];
  for (const entry of mapByEntity.get('mark') ?? []) {
    const row = marks.get(entry.canonicalId);
    const legacyMark = legacy.marks.find(
      (mark) => mark.legacyTable === entry.legacyTable && mark.id === entry.legacyId
    );
    if (row === undefined || legacyMark === undefined) {
      checks.push(
        check(
          'mark',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'mark_row',
          'present',
          'missing'
        )
      );
      continue;
    }
    const result = resultById.get(legacyMark.resultId);
    const settingEntry =
      legacyMark.paperSettingId === null ? undefined : settingById.get(legacyMark.paperSettingId);
    const component =
      settingEntry === undefined || settingEntry.setting.paperId === null
        ? undefined
        : componentByLegacyPaper.get(settingEntry.setting.paperId);
    const enrolment = enrolments.get(textOf(row, 'enrolment_id') ?? '');
    const learnerId = textOf(enrolment, 'learner_id') ?? '';
    const expectedLearner =
      result === undefined || result.studentId === null
        ? ''
        : learnerByLegacyStudent.get(result.studentId) ?? '';

    checks.push(
      check(
        'mark',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'mark_enrolment_row',
        'present',
        enrolment === undefined ? 'missing' : 'present'
      )
    );
    checks.push(
      check(
        'mark',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'mark_enrolment',
        expectedLearner,
        learnerId
      )
    );
    const assessment = assessments.get(textOf(row, 'assessment_id') ?? '');
    checks.push(
      check(
        'mark',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'mark_assessment_row',
        'present',
        assessment === undefined ? 'missing' : 'present'
      )
    );
    if (assessment !== undefined) {
      checks.push(
        check(
          'mark',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'mark_assessment_learning_area',
          '1',
          jsonList(assessment, 'learning_area_ids').includes(textOf(row, 'learning_area_id') ?? '')
            ? '1'
            : '0'
        )
      );
    }
    checks.push(
      check(
        'mark',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'mark_component',
        textOf(component, 'id') ?? '',
        textOf(row, 'component_id') ?? ''
      )
    );
    checks.push(
      check(
        'mark',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'mark_learning_area',
        textOf(component, 'learning_area_id') ?? '',
        textOf(row, 'learning_area_id') ?? ''
      )
    );
    checks.push(
      check(
        'mark',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'mark_value',
        legacyMarkValue(legacyMark),
        canonicalMarkValue(row)
      )
    );

    canonicalMarks.push({
      row,
      learnerId,
      legacyStudentId:
        result?.studentId ?? legacyStudentByLearner.get(learnerId) ?? '',
      legacyTable: entry.legacyTable,
      legacyId: entry.legacyId,
      assessment,
      value: canonicalMarkValue(row),
    });
  }

  // No two marks hold the same learner, assessment, learning area and component.
  const markKeys = new Set<string>();
  for (const mark of canonicalMarks) {
    const key = [
      textOf(mark.row, 'assessment_id') ?? '',
      textOf(mark.row, 'enrolment_id') ?? '',
      textOf(mark.row, 'learning_area_id') ?? '',
      textOf(mark.row, 'component_id') ?? '',
    ].join('\u0000');
    const unique = !markKeys.has(key);
    markKeys.add(key);
    checks.push(
      check(
        'mark',
        mark.legacyTable,
        mark.legacyId,
        textOf(mark.row, 'id') ?? '',
        'mark_unique',
        'unique',
        unique ? 'unique' : 'duplicate'
      )
    );
  }

  // Every assessment of a mark names the period of the legacy session in which it was sat.
  const assessmentPeriods = new Map<string, string>();
  for (const mark of canonicalMarks) {
    const legacyMark = legacy.marks.find(
      (row) => row.legacyTable === mark.legacyTable && row.id === mark.legacyId
    );
    const result = legacyMark === undefined ? undefined : resultById.get(legacyMark.resultId);
    const session = result?.sessionId === null || result === undefined
      ? undefined
      : sessionById.get(result.sessionId);
    if (session === undefined) continue;
    const periodId =
      session.periodId === null ? undefined : legacy.periodByLegacyId.get(session.periodId);
    if (periodId === undefined) continue;
    assessmentPeriods.set(textOf(mark.row, 'assessment_id') ?? '', periodId);
  }
  for (const [assessmentId, periodId] of assessmentPeriods) {
    checks.push(
      check(
        'assessment',
        'exam_sessions',
        '',
        assessmentId,
        'assessment_period',
        periodId,
        textOf(assessments.get(assessmentId), 'academic_period_id') ?? ''
      )
    );
  }

  // The period results point at a real enrolment, and carry the legacy totals.
  for (const entry of mapByEntity.get('period_result') ?? []) {
    const row = periodResults.get(entry.canonicalId);
    const result = resultById.get(entry.legacyId);
    const enrolment = enrolments.get(textOf(row, 'enrolment_id') ?? '');
    checks.push(
      check(
        'period_result',
        'student_exam_results',
        entry.legacyId,
        entry.canonicalId,
        'period_result_enrolment',
        result?.studentId === null || result === undefined
          ? ''
          : learnerByLegacyStudent.get(result.studentId) ?? '',
        textOf(enrolment, 'learner_id') ?? ''
      )
    );
    const aggregates = jsonObject(row, 'aggregates');
    checks.push(
      check(
        'period_result',
        'student_exam_results',
        entry.legacyId,
        entry.canonicalId,
        'period_result_total',
        result?.totalMarks === null || result === undefined ? '' : String(result.totalMarks),
        aggregates['total'] === undefined ? '' : String(aggregates['total'])
      )
    );
    const expectedGrade =
      result?.meanGrade !== null && result !== undefined && result.meanGrade.length <= 50
        ? result.meanGrade
        : '';
    checks.push(
      check(
        'period_result',
        'student_exam_results',
        entry.legacyId,
        entry.canonicalId,
        'period_result_grade',
        expectedGrade,
        typeof aggregates['mean_grade'] === 'string' ? aggregates['mean_grade'] : ''
      )
    );
    checks.push(
      check(
        'period_result',
        'student_exam_results',
        entry.legacyId,
        entry.canonicalId,
        'period_result_period',
        periodOfStudentResult(legacy, result),
        textOf(row, 'academic_period_id') ?? ''
      )
    );
  }

  const learners = compareLearnerMarks(legacy, canonicalMarks, unmappable, componentByLegacyPaper);
  for (const learner of learners) {
    checks.push(
      check(
        'mark',
        'students',
        learner.legacyStudentId,
        learner.learnerId,
        'mark_equality',
        JSON.stringify(learner.before),
        JSON.stringify(learner.after)
      )
    );
  }

  return {
    counts: { before, after, unmapped, stray },
    checks,
    learners,
    issues: notes,
    assumptions: notes.filter((note) => note.code === 'assumption').map((note) => note.message),
    unmappable,
    mapping,
  };
}

/** Reads the report of a database migration M4 has run on. */
export function readExamMigrationReport(reader: SqlReader): Promise<ExamMigrationVerification> {
  return verifyExamMigration(reader);
}

/** The academic period a legacy result belongs to. */
function periodOfStudentResult(
  source: ExamPlanSource,
  result: { readonly sessionId: string | null } | undefined
): string {
  if (result?.sessionId === null || result === undefined) return '';
  const session = source.sessions.find((row) => row.id === result.sessionId);
  if (session === undefined || session.periodId === null) return '';
  return source.periodByLegacyId.get(session.periodId) ?? '';
}

/** Counts the canonical rows the id map does not name. */
function countStray(rows: ReadonlyMap<string, SqliteRow>, map: readonly ExamMapEntry[]): number {
  const named = new Set(map.map((entry) => entry.canonicalId));
  return [...rows.keys()].filter((id) => !named.has(id)).length;
}

/** The distinct (session, learning area) pairs the legacy settings imply. */
function countImpliedAssessments(
  source: ExamPlanSource,
  componentByLegacyPaper: ReadonlyMap<string, SqliteRow>
): number {
  const pairs = new Set<string>();
  for (const entry of allSettings(source)) {
    const component =
      entry.setting.paperId === null ? undefined : componentByLegacyPaper.get(entry.setting.paperId);
    if (component === undefined) continue;
    pairs.add(`${entry.session.id}\u0000${textOf(component, 'learning_area_id') ?? ''}`);
  }
  return pairs.size;
}

/**
 * Compares the marks of every learner before and after the migration.
 *
 * The before-side is the legacy marks the migration did not report, read as raw rows; the
 * after-side is the canonical marks, joined back to the legacy student through the enrolment and
 * M3's id map. A mark that moved to another learner, another assessment period, another learning
 * area or another paper - or lost its value - makes the two multisets differ.
 */
function compareLearnerMarks(
  source: ExamPlanSource,
  canonicalMarks: readonly CanonicalMark[],
  unmappable: readonly ExamUnmappableRow[],
  componentByLegacyPaper: ReadonlyMap<string, SqliteRow>
): LearnerMarkEquality[] {
  const settings = allSettings(source);
  const settingById = new Map(settings.map((entry) => [entry.setting.id, entry]));
  const resultById = new Map(source.results.map((result) => [result.id, result]));
  const sessionById = new Map(source.sessions.map((session) => [session.id, session]));

  const reported = new Set(
    unmappable
      .filter((row) => row.canonicalEntity === 'mark')
      .map((row) => `${row.legacyTable}\u0000${row.legacyId}`)
  );
  const mapped = new Set(canonicalMarks.map((mark) => `${mark.legacyTable}\u0000${mark.legacyId}`));

  const before = new Map<string, string[]>();
  for (const mark of source.marks) {
    const key = `${mark.legacyTable}\u0000${mark.id}`;
    if (reported.has(key) && !mapped.has(key)) continue;
    const result = resultById.get(mark.resultId);
    if (result === undefined || result.studentId === null) continue;
    const session = result.sessionId === null ? undefined : sessionById.get(result.sessionId);
    const periodId =
      session === undefined || session.periodId === null
        ? ''
        : source.periodByLegacyId.get(session.periodId) ?? '';
    const settingEntry =
      mark.paperSettingId === null ? undefined : settingById.get(mark.paperSettingId);
    const component =
      settingEntry === undefined || settingEntry.setting.paperId === null
        ? undefined
        : componentByLegacyPaper.get(settingEntry.setting.paperId);
    if (component === undefined) continue;
    const tuples = before.get(result.studentId) ?? [];
    tuples.push(
      markTuple(
        periodId,
        textOf(component, 'learning_area_id') ?? '',
        textOf(component, 'id') ?? '',
        legacyMarkValue(mark)
      )
    );
    before.set(result.studentId, tuples);
  }

  const after = new Map<string, string[]>();
  for (const mark of canonicalMarks) {
    if (mark.legacyStudentId === '') continue;
    const tuples = after.get(mark.legacyStudentId) ?? [];
    tuples.push(
      markTuple(
        textOf(mark.assessment, 'academic_period_id') ?? '',
        textOf(mark.row, 'learning_area_id') ?? '',
        textOf(mark.row, 'component_id') ?? '',
        mark.value
      )
    );
    after.set(mark.legacyStudentId, tuples);
  }

  const learnerByLegacyStudent = new Map<string, string>();
  for (const mark of canonicalMarks) {
    if (mark.legacyStudentId !== '') {
      learnerByLegacyStudent.set(mark.legacyStudentId, mark.learnerId);
    }
  }

  const students = new Set<string>([...before.keys(), ...after.keys()]);
  const learners: LearnerMarkEquality[] = [];
  for (const legacyStudentId of [...students].sort()) {
    const beforeTuples = [...(before.get(legacyStudentId) ?? [])].sort();
    const afterTuples = [...(after.get(legacyStudentId) ?? [])].sort();
    learners.push({
      legacyStudentId,
      learnerId: learnerByLegacyStudent.get(legacyStudentId) ?? '',
      before: beforeTuples,
      after: afterTuples,
      matched:
        beforeTuples.length === afterTuples.length &&
        beforeTuples.every((tuple, index) => tuple === afterTuples[index]),
    });
  }
  return learners;
}
