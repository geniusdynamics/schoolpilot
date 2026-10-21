// ABOUTME: The legacy database migration M4 runs against: the P0-era subjects, papers and exam
// ABOUTME: sessions, plus the drift an installation can hold in its results and paper marks.

import type { SqliteAdapter, SqliteBindValue } from '@/data/adapters/sqlite';
import {
  initialMockExamSessions,
  initialMockSubjectPapers,
  initialMockSubjects,
} from '@/modules/academics/data/mockData';
import { collectionsDefinition } from '@/services/database/collections';
import { SchemaConverter } from '@/services/database/SchemaConverter';

import { buildPeopleFixture, FIXTURE_NOW, type PeopleFixtureOptions } from './003-legacy-fixture';

export { FIXTURE_NOW };

/** The tables migration M4 reads, in the order the fixture creates them. */
export const EXAM_FIXTURE_TABLES = [
  'subjects',
  'subject_papers',
  'exam_sessions',
  'student_exam_results',
  'student_paper_marks',
] as const;

/** A subject the seed does not carry. */
export interface ExtraSubject {
  readonly id: number;
  readonly subjectCode: string | null;
  readonly abbreviation: string | null;
  readonly name: string;
  readonly grouping: string;
  readonly isCompulsory: boolean;
}

/** A paper the seed does not carry. */
export interface ExtraPaper {
  readonly id: number;
  /** The legacy text the provider writes for the subject's numeric id (`1.0`, `999.0`). */
  readonly subjectId: string;
  readonly name: string;
}

/** A paper setting a fixture session carries. */
export interface FixturePaperSetting {
  readonly id: string;
  readonly sessionId: string;
  /** The paper's id as the seed data writes it: a number for the seed, text for the drift. */
  readonly paperId: string | number;
  readonly marksOutOf: number;
  readonly weight: number;
}

/** A result the fixture writes. */
export interface FixtureResult {
  readonly id: string;
  readonly studentId: string;
  readonly sessionId: string;
  readonly totalMarks?: number | null;
  readonly meanGrade?: string | null;
  readonly classRank?: number | null;
  readonly streamRank?: number | null;
  readonly comment?: string | null;
  /** The marks the result row embeds in its `marks` array. */
  readonly marks?: readonly FixtureEmbeddedMark[];
}

/** A mark a result row embeds. */
export interface FixtureEmbeddedMark {
  readonly id: string;
  readonly paperSettingId: string;
  readonly score: string | number | null;
}

/** A row of the paper marks table. */
export interface FixturePaperMark {
  readonly id: string;
  readonly resultId: string;
  readonly paperSettingId: string;
  readonly score: string | number | null;
}

/** The subject whose row carries no code the migration could use. */
export const SUBJECT_WITHOUT_CODE: ExtraSubject = {
  id: 901,
  subjectCode: null,
  abbreviation: null,
  name: 'Life Skills',
  grouping: 'Other',
  isCompulsory: false,
};

/** The subject whose code the first subject already holds. */
export const SUBJECT_WITH_DUPLICATE_CODE: ExtraSubject = {
  id: 902,
  subjectCode: '101',
  abbreviation: 'DUP',
  name: 'Duplicate Code',
  grouping: 'Other',
  isCompulsory: false,
};

/** The subjects the fixture adds to the seed. */
export const EXTRA_SUBJECTS = [SUBJECT_WITHOUT_CODE, SUBJECT_WITH_DUPLICATE_CODE] as const;

/** A paper whose subject the legacy database does not hold. */
export const PAPER_WITHOUT_SUBJECT: ExtraPaper = {
  id: 901,
  subjectId: '999.0',
  name: 'Ghost Paper',
};

/** A paper of a subject the database holds, which no session configures. */
export const PAPER_WITHOUT_SESSION: ExtraPaper = {
  id: 902,
  subjectId: '1.0',
  name: 'English Paper 4 (Oral)',
};

/** The papers the fixture adds to the seed. */
export const EXTRA_PAPERS = [PAPER_WITHOUT_SUBJECT, PAPER_WITHOUT_SESSION] as const;

/** A session the seed does not carry: the opener of the term after the end-of-term session. */
export const OPENER_SESSION = {
  id: 'ES901',
  name: 'Opener Exams Term 1 2025',
  periodId: 4,
  status: 'Published',
  settings: [{ id: 'EPS901', paperId: 1, marksOutOf: 50, weight: 100 }] as const,
};

/** A session whose school period migration M1 did not map. */
export const SESSION_WITHOUT_PERIOD = {
  id: 'ES902',
  name: 'Mock Exams 2025',
  periodId: 99,
  status: 'Published',
  settings: [{ id: 'EPS902', paperId: 7, marksOutOf: 100, weight: 100 }] as const,
};

/** A session that configures no paper at all. */
export const SESSION_WITHOUT_PAPERS = {
  id: 'ES903',
  name: 'National Assessment 2024',
  periodId: 3,
  status: 'Archived',
  settings: [] as const,
};

/** The paper settings of every fixture session, keyed by the session that carries them. */
export function paperSettingsOf(sessionId: string): FixturePaperSetting[] {
  const seed = initialMockExamSessions.find((session) => session.id === sessionId);
  const settings: FixturePaperSetting[] = (seed?.paper_settings ?? []).map((setting) => ({
    id: String(setting.id),
    sessionId,
    paperId: setting.subject_paper_id,
    marksOutOf: Number(setting.marks_out_of),
    weight: Number(setting.weight_percentage),
  }));
  for (const session of [OPENER_SESSION, SESSION_WITHOUT_PERIOD, SESSION_WITHOUT_PAPERS]) {
    if (session.id !== sessionId) continue;
    for (const setting of session.settings) {
      settings.push({
        id: setting.id,
        sessionId,
        paperId: setting.paperId,
        marksOutOf: setting.marksOutOf,
        weight: setting.weight,
      });
    }
  }
  return settings;
}

/** The results the fixture writes: the marks, the drift and the duplicates. */
export const FIXTURE_RESULTS: readonly FixtureResult[] = [
  {
    // The first learner of the end-of-term session. The paper marks are the table's rows.
    id: 'SR001',
    studentId: 'S001',
    sessionId: 'ES001',
    totalMarks: 215,
    meanGrade: 'B+',
    classRank: 3,
    streamRank: 2,
    comment: 'Good work; keep the mathematics revision going.',
  },
  {
    // A result whose paper mark is embedded in the row, the shape the collection declares.
    id: 'SR002',
    studentId: 'S002',
    sessionId: 'ES001',
    totalMarks: 120,
    meanGrade: 'B',
    classRank: 5,
    streamRank: 4,
    marks: [{ id: 'NEST001', paperSettingId: 'EPS007', score: 60 }],
  },
  {
    // A learner whose papers carry an absent mark, a letter in the score column and a dash.
    id: 'SR003',
    studentId: 'S003',
    sessionId: 'ES002',
    totalMarks: 98,
    meanGrade: 'C+',
    classRank: 7,
    streamRank: 3,
  },
  {
    // A learner migration M3 wrote no enrolment for: the result and its mark are reported.
    id: 'SR004',
    studentId: 'S903',
    sessionId: 'ES001',
    totalMarks: 40,
    meanGrade: 'D',
    classRank: 12,
  },
  {
    // The same learner sat a later session: one period result per period, both are kept.
    id: 'SR005',
    studentId: 'S001',
    sessionId: 'ES901',
    totalMarks: 45,
    meanGrade: 'A',
    classRank: 1,
  },
  {
    // The session belongs to a period migration M1 did not map.
    id: 'SR006',
    studentId: 'S002',
    sessionId: 'ES902',
    totalMarks: 70,
    meanGrade: 'B',
    classRank: 4,
  },
  {
    // A learner with one paper mark only.
    id: 'SR007',
    studentId: 'S004',
    sessionId: 'ES001',
    totalMarks: 62,
    meanGrade: 'C',
    classRank: 9,
    streamRank: 5,
  },
  {
    // The same learner and session as SR001: a second result row for one sitting.
    id: 'SR901',
    studentId: 'S001',
    sessionId: 'ES001',
    totalMarks: 215,
    meanGrade: 'B+',
    classRank: 3,
  },
];

/** The paper marks the fixture writes, one row per paper a learner sat. */
export const FIXTURE_PAPER_MARKS: readonly FixturePaperMark[] = [
  { id: 'PM001', resultId: 'SR001', paperSettingId: 'EPS001', score: 85 },
  { id: 'PM002', resultId: 'SR001', paperSettingId: 'EPS002', score: 70 },
  { id: 'PM003', resultId: 'SR001', paperSettingId: 'EPS007', score: 60 },
  // The same result and paper again: one mark per learner, assessment, learning area and paper.
  { id: 'PM004', resultId: 'SR001', paperSettingId: 'EPS002', score: 70 },
  // The paper setting belongs to the mid-term session, not to the result's end-of-term session.
  { id: 'PM005', resultId: 'SR002', paperSettingId: 'EPS009', score: 55 },
  { id: 'PM006', resultId: 'SR002', paperSettingId: 'EPS007', score: 60 },
  { id: 'PM007', resultId: 'SR003', paperSettingId: 'EPS009', score: 55 },
  // A status code in the score column: the mark is absent and carries no score.
  { id: 'PM008', resultId: 'SR003', paperSettingId: 'EPS010', score: 'ABS' },
  // The learner has no enrolment: the mark cannot attach to anybody.
  { id: 'PM009', resultId: 'SR004', paperSettingId: 'EPS001', score: 40 },
  { id: 'PM010', resultId: 'SR005', paperSettingId: 'EPS901', score: 45 },
  // The session's period is not one migration M1 mapped.
  { id: 'PM011', resultId: 'SR006', paperSettingId: 'EPS902', score: 70 },
  // The same learner, session, subject and paper as PM001: a duplicate result row's mark.
  { id: 'PM012', resultId: 'SR901', paperSettingId: 'EPS001', score: 99 },
  // A letter in a numeric column: kept as the mark's rubric level, reported.
  { id: 'PM013', resultId: 'SR003', paperSettingId: 'EPS011', score: 'A' },
  // A dash in a numeric column: the mark carries no score and is written as incomplete.
  { id: 'PM014', resultId: 'SR003', paperSettingId: 'EPS012', score: '-' },
  { id: 'PM015', resultId: 'SR007', paperSettingId: 'EPS001', score: 62 },
];

/** How the fixture differs from the P0-era seed. */
export interface ExamFixtureOptions extends PeopleFixtureOptions {
  /** Whether the fixture holds the subjects and papers tables. */
  readonly withSubjects?: boolean;
  /** Whether the fixture holds the exam sessions and their paper settings. */
  readonly withSessions?: boolean;
  /** Whether the fixture holds the results and the paper marks. */
  readonly withResults?: boolean;
}

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
      `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')})`
        + ` VALUES (${columns.map(() => '?').join(', ')})`,
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

/** The subject rows: the seed's subjects, then the two the migration reports. */
function subjectRows(options: ExamFixtureOptions): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  const rows: Record<string, unknown>[] = initialMockSubjects.map((subject) => ({
    id: legacyIdText(subject.id, options.doubleIds ?? true),
    subject_code: subject.subject_code,
    abbreviation: subject.abbreviation,
    name: subject.name,
    department_id: subject.department_id,
    is_compulsory: subject.is_compulsory,
    grouping: subject.grouping,
  }));
  for (const subject of EXTRA_SUBJECTS) {
    rows.push({
      id: legacyIdText(subject.id, options.doubleIds ?? true),
      subject_code: subject.subjectCode,
      abbreviation: subject.abbreviation,
      name: subject.name,
      is_compulsory: subject.isCompulsory,
      grouping: subject.grouping,
    });
  }
  return rows.map((row) => ({ ...row, created_at: timestamp, updated_at: timestamp }));
}

/** The paper rows: the seed's papers, then the two the migration handles differently. */
function paperRows(options: ExamFixtureOptions): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  const rows: Record<string, unknown>[] = initialMockSubjectPapers.map((paper) => ({
    id: legacyIdText(paper.id, options.doubleIds ?? true),
    subject_id: legacyIdText(paper.subject_id, options.doubleIds ?? true),
    name: paper.name,
  }));
  for (const paper of EXTRA_PAPERS) {
    rows.push({
      id: legacyIdText(paper.id, options.doubleIds ?? true),
      subject_id: paper.subjectId,
      name: paper.name,
    });
  }
  return rows.map((row) => ({ ...row, created_at: timestamp, updated_at: timestamp }));
}

/** The session rows, with the paper settings each row embeds. */
function sessionRows(options: ExamFixtureOptions): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  const sessions = [
    ...initialMockExamSessions.map((session) => ({
      id: session.id,
      name: session.name,
      periodId: session.school_period_id,
      status: session.status,
      resultPublicationDate: session.result_publication_date ?? null,
    })),
    {
      id: OPENER_SESSION.id,
      name: OPENER_SESSION.name,
      periodId: OPENER_SESSION.periodId,
      status: OPENER_SESSION.status,
      resultPublicationDate: null,
    },
    {
      id: SESSION_WITHOUT_PERIOD.id,
      name: SESSION_WITHOUT_PERIOD.name,
      periodId: SESSION_WITHOUT_PERIOD.periodId,
      status: SESSION_WITHOUT_PERIOD.status,
      resultPublicationDate: null,
    },
    {
      id: SESSION_WITHOUT_PAPERS.id,
      name: SESSION_WITHOUT_PAPERS.name,
      periodId: SESSION_WITHOUT_PAPERS.periodId,
      status: SESSION_WITHOUT_PAPERS.status,
      resultPublicationDate: null,
    },
  ];
  return sessions.map((session) => ({
    id: session.id,
    name: session.name,
    school_period_id: legacyIdText(session.periodId, options.doubleIds ?? true),
    status: session.status,
    result_publication_date: session.resultPublicationDate,
    paper_settings: paperSettingsOf(session.id).map((setting) => ({
      id: setting.id,
      exam_session_id: setting.sessionId,
      subject_paper_id: legacyIdText(setting.paperId, options.doubleIds ?? true),
      marks_out_of: setting.marksOutOf,
      weight_percentage: setting.weight,
      created_at: timestamp,
      updated_at: timestamp,
    })),
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

/** The result rows, with the marks each row embeds. */
function resultRows(): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  return FIXTURE_RESULTS.map((result) => ({
    id: result.id,
    student_id: result.studentId,
    exam_session_id: result.sessionId,
    total_marks: result.totalMarks ?? null,
    mean_grade: result.meanGrade ?? null,
    class_rank: result.classRank ?? null,
    stream_rank: result.streamRank ?? null,
    overall_comment: result.comment ?? null,
    marks: (result.marks ?? []).map((mark) => ({
      id: mark.id,
      student_exam_result_id: result.id,
      paper_setting_id: mark.paperSettingId,
      score: mark.score,
      created_at: timestamp,
      updated_at: timestamp,
    })),
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

/** The paper mark rows. */
function paperMarkRows(): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  return FIXTURE_PAPER_MARKS.map((mark) => ({
    id: mark.id,
    student_exam_result_id: mark.resultId,
    paper_setting_id: mark.paperSettingId,
    score: mark.score,
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

/**
 * Builds the legacy database migration M4 reads.
 *
 * The tables are created with the DDL the legacy converter produces. The rows are the P0-era
 * seed, plus the drift an installation can hold: a subject with no code and one whose code is
 * already taken, a paper whose subject does not exist and a paper no session configures, a
 * session whose school period M1 did not map and a session with no papers, a result for a learner
 * with no enrolment, a second result row for one sitting, a letter, a status code and a dash in
 * the score column, and the same paper marked twice.
 */
export async function buildExamFixture(
  adapter: SqliteAdapter,
  options: ExamFixtureOptions = {}
): Promise<void> {
  await buildPeopleFixture(adapter, options);

  if (options.withSubjects ?? true) {
    for (const table of ['subjects', 'subject_papers'] as const) {
      await createLegacyTable(adapter, table);
    }
    await insertRows(adapter, 'subjects', subjectRows(options));
    await insertRows(adapter, 'subject_papers', paperRows(options));
  }
  if (!(options.withSessions ?? true)) return;

  await createLegacyTable(adapter, 'exam_sessions');
  await insertRows(adapter, 'exam_sessions', sessionRows(options));
  if (!(options.withResults ?? true)) return;

  await createLegacyTable(adapter, 'student_exam_results');
  await createLegacyTable(adapter, 'student_paper_marks');
  await insertRows(adapter, 'student_exam_results', resultRows());
  await insertRows(adapter, 'student_paper_marks', paperMarkRows());
}
