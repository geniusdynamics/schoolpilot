// ABOUTME: The legacy exam source: the subjects, papers, exam sessions with their nested paper
// ABOUTME: settings, results and paper marks migration M4 reads, and the canonical rows it needs.

import type { SqliteRow } from '@/data/adapters/sqlite';

import {
  legacyFlag,
  legacyKey,
  legacyRef,
  legacyText,
  tableExists,
  type SqlReader,
} from './001-legacy-calendar';
import { LEGACY_ID_MAP_TABLE } from './001-institution-calendar';

/** The legacy tables migration M4 reads. */
export const LEGACY_SOURCES = {
  subjects: 'subjects',
  papers: 'subject_papers',
  sessions: 'exam_sessions',
  results: 'student_exam_results',
  paperMarks: 'student_paper_marks',
} as const;

/** A legacy subject; it becomes a canonical learning area. */
export interface LegacySubject {
  readonly id: string;
  readonly code: string | null;
  readonly abbreviation: string | null;
  readonly name: string | null;
  readonly grouping: string | null;
  readonly isCompulsory: boolean;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** A legacy subject paper; it becomes a canonical component of its subject's learning area. */
export interface LegacyPaper {
  readonly id: string;
  readonly subjectId: string | null;
  readonly name: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** One paper configured in an exam session: what the session marks the paper out of and weighs. */
export interface LegacyPaperSetting {
  readonly id: string;
  readonly sessionId: string;
  readonly paperId: string | null;
  /** The paper's maximum score in this session; null when the row carries none. */
  readonly marksOutOf: number | null;
  readonly weight: number | null;
}

/** A legacy exam session, with the paper settings its row embeds. */
export interface LegacySession {
  readonly id: string;
  readonly name: string | null;
  readonly periodId: string | null;
  readonly status: string | null;
  readonly resultPublicationDate: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly settings: readonly LegacyPaperSetting[];
}

/** A learner's result in one exam session: the session totals and the rank. */
export interface LegacyResult {
  readonly id: string;
  readonly sessionId: string | null;
  readonly studentId: string | null;
  readonly totalMarks: number | null;
  readonly meanGrade: string | null;
  readonly classRank: number | null;
  readonly streamRank: number | null;
  readonly comment: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** One mark a learner scored: a row of `student_paper_marks`, or a mark a result row embeds. */
export interface LegacyMark {
  readonly id: string;
  /**
   * Where the mark was read from. The mark table is the shape the legacy app computes from; a
   * result row's `marks` array is the shape the collection declares. Both are read.
   */
  readonly legacyTable: 'student_paper_marks' | 'student_exam_results';
  readonly resultId: string;
  readonly paperSettingId: string | null;
  /** The value exactly as the legacy row holds it, trimmed; null when the row carries none. */
  readonly score: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** A canonical enrolment migration M3 wrote, and the learner it belongs to. */
export interface CanonicalEnrolment {
  readonly id: string;
  readonly learnerId: string;
  readonly classGroupId: string;
  readonly levelId: string;
}

/** Every legacy row and every canonical row migration M4 plans from. */
export interface ExamPlanSource {
  readonly institutionId: string | null;
  readonly programmeId: string | null;
  /** The normalised legacy period id to the academic period migration M1 made of it. */
  readonly periodByLegacyId: ReadonlyMap<string, string>;
  /** The legacy student id to the enrolment migration M3 made of it. */
  readonly enrolmentByStudent: ReadonlyMap<string, CanonicalEnrolment>;
  readonly subjects: readonly LegacySubject[];
  readonly papers: readonly LegacyPaper[];
  readonly sessions: readonly LegacySession[];
  readonly results: readonly LegacyResult[];
  readonly marks: readonly LegacyMark[];
}

/** Reads a legacy table, or nothing when the database does not hold it. */
async function readTable(reader: SqlReader, table: string): Promise<SqliteRow[]> {
  if (!(await tableExists(reader, table))) return [];
  return reader.all<SqliteRow>(`SELECT * FROM ${table} ORDER BY id`);
}

/** A value out of a parsed JSON object as text, or null when it is not one. */
function jsonText(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return null;
}

/** A value out of a parsed JSON object as a number, or null when it is not one. */
function jsonNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Parses a JSON array a legacy row carries as text; an unreadable value is an empty array. */
function parseJsonArray(value: unknown): Record<string, unknown>[] {
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === 'object' && entry !== null && !Array.isArray(entry)
    );
  } catch {
    return [];
  }
}

/** A legacy score as the text the row holds: a number as its decimal text, text trimmed. */
export function legacyScoreText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'bigint') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * A natural order for the legacy ids.
 *
 * The legacy ids are text, so the database sorts `10` before `2`. The migration orders them
 * numerically where both are numbers, so a paper's code follows the school's paper order.
 */
export function compareLegacyIds(left: string, right: string): number {
  const leftNumber = /^-?\d+$/.test(left) ? Number(left) : null;
  const rightNumber = /^-?\d+$/.test(right) ? Number(right) : null;
  if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;
  if (leftNumber !== null) return -1;
  if (rightNumber !== null) return 1;
  return left.localeCompare(right);
}

/** The rows in the natural order of their legacy ids. */
function sortById<T extends { readonly id: string }>(rows: T[]): T[] {
  return rows.sort((left, right) => compareLegacyIds(left.id, right.id));
}

/** Reads the legacy subjects. */
function readSubjects(rows: readonly SqliteRow[]): LegacySubject[] {
  return rows.map((row) => ({
    id: legacyKey(legacyText(row, 'id')) ?? '',
    code: legacyText(row, 'subject_code'),
    abbreviation: legacyText(row, 'abbreviation'),
    name: legacyText(row, 'name'),
    grouping: legacyText(row, 'grouping'),
    isCompulsory: legacyFlag(row, 'is_compulsory'),
    createdAt: legacyText(row, 'created_at'),
    updatedAt: legacyText(row, 'updated_at'),
  }));
}

/** Reads the legacy subject papers. */
function readPapers(rows: readonly SqliteRow[]): LegacyPaper[] {
  return rows.map((row) => ({
    id: legacyKey(legacyText(row, 'id')) ?? '',
    subjectId: legacyRef(row, 'subject_id'),
    name: legacyText(row, 'name'),
    createdAt: legacyText(row, 'created_at'),
    updatedAt: legacyText(row, 'updated_at'),
  }));
}

/** Reads the paper settings a session row embeds. */
function readPaperSettings(sessionId: string, row: SqliteRow): LegacyPaperSetting[] {
  const settings: LegacyPaperSetting[] = [];
  for (const entry of parseJsonArray(row['paper_settings'])) {
    const id = legacyKey(jsonText(entry, 'id')) ?? '';
    if (id === '') continue;
    settings.push({
      id,
      sessionId,
      paperId: legacyKey(jsonText(entry, 'subject_paper_id')),
      marksOutOf: jsonNumber(entry, 'marks_out_of'),
      weight: jsonNumber(entry, 'weight_percentage'),
    });
  }
  return sortById(settings);
}

/** Reads the legacy exam sessions and the paper settings their rows embed. */
function readSessions(rows: readonly SqliteRow[]): LegacySession[] {
  return rows.map((row) => {
    const id = legacyKey(legacyText(row, 'id')) ?? '';
    return {
      id,
      name: legacyText(row, 'name'),
      periodId: legacyRef(row, 'school_period_id'),
      status: legacyText(row, 'status'),
      resultPublicationDate: legacyText(row, 'result_publication_date'),
      createdAt: legacyText(row, 'created_at'),
      updatedAt: legacyText(row, 'updated_at'),
      settings: readPaperSettings(id, row),
    };
  });
}

/** A whole number out of a legacy row, or null when it is empty or not one. */
function legacyInteger(row: SqliteRow, column: string): number | null {
  const value = row[column];
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

/** A finite number out of a legacy row, or null when it is empty or not one. */
function legacyNumber(row: SqliteRow, column: string): number | null {
  const value = row[column];
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

/** Reads the legacy results. */
function readResults(rows: readonly SqliteRow[]): LegacyResult[] {
  return rows.map((row) => ({
    id: legacyKey(legacyText(row, 'id')) ?? '',
    sessionId: legacyRef(row, 'exam_session_id'),
    studentId: legacyRef(row, 'student_id'),
    totalMarks: legacyNumber(row, 'total_marks'),
    meanGrade: legacyText(row, 'mean_grade'),
    classRank: legacyInteger(row, 'class_rank'),
    streamRank: legacyInteger(row, 'stream_rank'),
    comment: legacyText(row, 'overall_comment'),
    createdAt: legacyText(row, 'created_at'),
    updatedAt: legacyText(row, 'updated_at'),
  }));
}

/**
 * Reads `student_paper_marks`.
 *
 * The table is read first so it wins over a result row's stale copy of the same paper: it is
 * the shape the legacy app computes the horizontal result view from.
 */
function readPaperMarkRows(rows: readonly SqliteRow[]): LegacyMark[] {
  const marks: LegacyMark[] = [];
  for (const row of rows) {
    const id = legacyKey(legacyText(row, 'id')) ?? '';
    const resultId = legacyRef(row, 'student_exam_result_id');
    if (id === '' || resultId === null) continue;
    marks.push({
      id,
      legacyTable: 'student_paper_marks',
      resultId,
      paperSettingId: legacyRef(row, 'paper_setting_id'),
      score: legacyScoreText(row['score']),
      createdAt: legacyText(row, 'created_at'),
      updatedAt: legacyText(row, 'updated_at'),
    });
  }
  return marks;
}

/** Reads the marks a result row embeds in its `marks` array. */
function readEmbeddedMarks(resultRows: readonly SqliteRow[]): LegacyMark[] {
  const marks: LegacyMark[] = [];
  for (const row of resultRows) {
    const resultId = legacyKey(legacyText(row, 'id')) ?? '';
    if (resultId === '') continue;
    parseJsonArray(row['marks']).forEach((entry, index) => {
      const id = legacyKey(jsonText(entry, 'id')) ?? `${resultId}:mark:${index + 1}`;
      marks.push({
        id,
        legacyTable: 'student_exam_results',
        resultId,
        paperSettingId: legacyKey(jsonText(entry, 'paper_setting_id')),
        score: legacyScoreText(entry['score']),
        createdAt: jsonText(entry, 'created_at'),
        updatedAt: jsonText(entry, 'updated_at'),
      });
    });
  }
  return marks;
}

/** Reads the canonical institution. */
async function readInstitutionId(reader: SqlReader): Promise<string | null> {
  if (!(await tableExists(reader, 'institution'))) return null;
  const row = await reader.get<SqliteRow>(
    `SELECT id FROM "institution" ORDER BY rowid LIMIT 1`
  );
  return row === null ? null : legacyText(row, 'id');
}

/**
 * Reads the canonical programme the exam data belongs to.
 *
 * The legacy exam data names no programme. A learning area belongs to one, so the migration
 * takes the programme the class groups migration M2 wrote: the class groups are what its
 * learners sit in, and one of them is the school's programme.
 */
async function readProgrammeId(reader: SqlReader): Promise<string | null> {
  if (!(await tableExists(reader, 'class_group'))) return null;
  const row = await reader.get<SqliteRow>(
    `SELECT programme_id FROM "class_group" ORDER BY rowid LIMIT 1`
  );
  const fromClassGroup = row === null ? null : legacyText(row, 'programme_id');
  if (fromClassGroup !== null) return fromClassGroup;
  if (!(await tableExists(reader, 'programme'))) return null;
  const programme = await reader.get<SqliteRow>(`SELECT id FROM "programme" ORDER BY rowid LIMIT 1`);
  return programme === null ? null : legacyText(programme, 'id');
}

/** Reads the academic period every legacy school period became, through M1's id map. */
async function readPeriodMap(reader: SqlReader): Promise<Map<string, string>> {
  const byLegacyId = new Map<string, string>();
  if (!(await tableExists(reader, LEGACY_ID_MAP_TABLE))) return byLegacyId;
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_id, canonical_id FROM "${LEGACY_ID_MAP_TABLE}"
      WHERE legacy_table = 'school_periods' AND canonical_entity = 'academic_period'
      ORDER BY legacy_id`
  );
  for (const row of rows) {
    const legacyPeriod = legacyKey(legacyText(row, 'legacy_id'));
    const canonicalId = legacyText(row, 'canonical_id');
    if (legacyPeriod === null || canonicalId === null) continue;
    byLegacyId.set(legacyPeriod, canonicalId);
  }
  return byLegacyId;
}

/**
 * Reads the enrolment each legacy student got, through M3's id map.
 *
 * A student with no enrolment is absent from the map: M3 writes none for a learner whose class
 * stream it could not resolve, and a mark cannot be attached to a learner who is not enrolled.
 */
async function readEnrolmentByStudent(reader: SqlReader): Promise<Map<string, CanonicalEnrolment>> {
  const byStudent = new Map<string, CanonicalEnrolment>();
  if (!(await tableExists(reader, LEGACY_ID_MAP_TABLE))) return byStudent;
  if (!(await tableExists(reader, 'enrolment'))) return byStudent;
  const rows = await reader.all<SqliteRow>(
    `SELECT m.legacy_id AS legacy_id, e.id AS id, e.learner_id AS learner_id,
            e.class_group_id AS class_group_id, e.level_id AS level_id
       FROM "${LEGACY_ID_MAP_TABLE}" m
       JOIN "enrolment" e ON e.id = m.canonical_id
      WHERE m.legacy_table = 'students' AND m.canonical_entity = 'enrolment'
      ORDER BY m.legacy_id`
  );
  for (const row of rows) {
    const studentId = legacyKey(legacyText(row, 'legacy_id'));
    const id = legacyText(row, 'id');
    const learnerId = legacyText(row, 'learner_id');
    const classGroupId = legacyText(row, 'class_group_id');
    const levelId = legacyText(row, 'level_id');
    if (
      studentId === null ||
      id === null ||
      learnerId === null ||
      classGroupId === null ||
      levelId === null
    ) {
      continue;
    }
    byStudent.set(studentId, { id, learnerId, classGroupId, levelId });
  }
  return byStudent;
}

/**
 * Reads every legacy row and every canonical row migration M4 plans from.
 *
 * The paper marks are the table's rows first and the result rows' embedded copies after, so the
 * table wins when both name the same paper; the plan reports the copy it did not write.
 */
export async function readExamPlanSource(reader: SqlReader): Promise<ExamPlanSource> {
  const subjectRows = await readTable(reader, LEGACY_SOURCES.subjects);
  const paperRows = await readTable(reader, LEGACY_SOURCES.papers);
  const sessionRows = await readTable(reader, LEGACY_SOURCES.sessions);
  const resultRows = await readTable(reader, LEGACY_SOURCES.results);
  const markRows = await readTable(reader, LEGACY_SOURCES.paperMarks);

  return {
    institutionId: await readInstitutionId(reader),
    programmeId: await readProgrammeId(reader),
    periodByLegacyId: await readPeriodMap(reader),
    enrolmentByStudent: await readEnrolmentByStudent(reader),
    subjects: sortById(readSubjects(subjectRows)),
    papers: sortById(readPapers(paperRows)),
    sessions: sortById(readSessions(sessionRows)),
    results: sortById(readResults(resultRows)),
    marks: [...sortById(readPaperMarkRows(markRows)), ...sortById(readEmbeddedMarks(resultRows))],
  };
}
