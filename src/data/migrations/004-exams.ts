// ABOUTME: Migration M4: the legacy subjects, papers, exam sessions and results become canonical
// ABOUTME: learning areas, components, assessments, per-learner marks and period results.

import type { SqliteBindValue } from '@/data/adapters/sqlite';
import {
  assessmentSchema,
  componentSchema,
  learningAreaSchema,
  markSchema,
  periodResultSchema,
} from '@/domain/schema';

import { tableExists, type SqlReader } from './001-legacy-calendar';
import {
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
} from './001-institution-calendar';
import { CREATED_TABLE } from './002-class-groups';
import { readExamPlanSource } from './004-legacy-exams';
import {
  planExamMigration,
  type ExamMigrationPlan,
  type WrittenExamEntity,
} from './004-exam-plan';
import {
  readExamMigrationReport,
  verifyExamMigration,
  type ExamCheck,
  type ExamMigrationVerification,
} from './004-exam-verification';
import type { Migration, MigrationContext } from './types';

export { readExamMigrationReport, type ExamCheck, type ExamMigrationVerification };
export {
  EXAM_ENTITIES,
  planExamMigration,
  type ExamCounts,
  type ExamEntity,
  type ExamMigrationPlan,
  type ExamPlanOptions,
} from './004-exam-plan';
export { readExamPlanSource, type ExamPlanSource } from './004-legacy-exams';
export {
  assessmentKindOf,
  assessmentStatusOf,
  interpretLegacyScore,
  isDecimalText,
  normaliseScoreText,
  type ExamScoreKind,
  type InterpretedScore,
} from './004-exam-rules';

/** The canonical tables migration M4 writes. */
export const CANONICAL_TABLES: Record<WrittenExamEntity, string> = {
  learning_area: 'learning_area',
  component: 'component',
  assessment: 'assessment',
  mark: 'mark',
  period_result: 'period_result',
};

/** The created-rows table M2 introduced; M4 records its own rows in it under its version. */
const CREATED_DDL = `CREATE TABLE IF NOT EXISTS "${CREATED_TABLE}" (
   migration_version INTEGER NOT NULL,
   entity TEXT NOT NULL,
   id TEXT NOT NULL,
   PRIMARY KEY (migration_version, entity, id)
 )`;

/** The options the migration takes. */
export interface ExamMigrationOptions {
  /** The clock; the audit timestamps are derived from it when the legacy row carries none. */
  readonly now?: () => Date;
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
export async function writeExamPlan(
  context: MigrationContext,
  plan: ExamMigrationPlan
): Promise<void> {
  await context.exec(CREATED_DDL);

  for (const entry of plan.learningAreas) {
    const row = learningAreaSchema.parse(entry);
    await insertRow(context, 'learning_area', {
      id: row.id,
      institution_id: row.institution_id,
      programme_id: row.programme_id,
      code: row.code,
      name: row.name,
      ...(row.short_name === undefined ? {} : { short_name: row.short_name }),
      ...(row.group === undefined ? {} : { group: row.group }),
      kind: row.kind,
      level_ids: JSON.stringify(row.level_ids),
      pathway_ids: JSON.stringify(row.pathway_ids),
      ...(row.national_code === undefined ? {} : { national_code: row.national_code }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.components) {
    const row = componentSchema.parse(entry);
    await insertRow(context, 'component', {
      id: row.id,
      institution_id: row.institution_id,
      learning_area_id: row.learning_area_id,
      code: row.code,
      name: row.name,
      kind: row.kind,
      ...(row.weight === undefined ? {} : { weight: row.weight }),
      ...(row.max_score === undefined ? {} : { max_score: row.max_score }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.assessments) {
    const row = assessmentSchema.parse(entry);
    await insertRow(context, 'assessment', {
      id: row.id,
      institution_id: row.institution_id,
      academic_period_id: row.academic_period_id,
      kind: row.kind,
      name: row.name,
      ...(row.scheme_slot === undefined ? {} : { scheme_slot: row.scheme_slot }),
      level_ids: JSON.stringify(row.level_ids),
      class_group_ids: JSON.stringify(row.class_group_ids),
      learning_area_ids: JSON.stringify(row.learning_area_ids),
      component_ids: JSON.stringify(row.component_ids),
      ...(row.max_score === undefined ? {} : { max_score: row.max_score }),
      ...(row.date_window === undefined ? {} : { date_window: JSON.stringify(row.date_window) }),
      status: row.status,
      ...(row.grading_scale_id === undefined ? {} : { grading_scale_id: row.grading_scale_id }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.marks) {
    const row = markSchema.parse(entry);
    await insertRow(context, 'mark', {
      id: row.id,
      institution_id: row.institution_id,
      assessment_id: row.assessment_id,
      enrolment_id: row.enrolment_id,
      learning_area_id: row.learning_area_id,
      ...(row.component_id === undefined ? {} : { component_id: row.component_id }),
      ...(row.score === undefined ? {} : { score: row.score }),
      ...(row.rubric_level === undefined ? {} : { rubric_level: row.rubric_level }),
      status_code: row.status_code,
      ...(row.comment === undefined ? {} : { comment: row.comment }),
      ...(row.entered_by === undefined ? {} : { entered_by: row.entered_by }),
      ...(row.entered_at === undefined ? {} : { entered_at: row.entered_at }),
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.periodResults) {
    const row = periodResultSchema.parse(entry);
    await insertRow(context, 'period_result', {
      id: row.id,
      institution_id: row.institution_id,
      enrolment_id: row.enrolment_id,
      academic_period_id: row.academic_period_id,
      aggregates: JSON.stringify(row.aggregates),
      ...(row.class_teacher_comment === undefined
        ? {}
        : { class_teacher_comment: row.class_teacher_comment }),
      ...(row.head_comment === undefined ? {} : { head_comment: row.head_comment }),
      ...(row.conduct === undefined ? {} : { conduct: row.conduct }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
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
      [context.version, 'info', 'assumption', 'assessment', 'exam_sessions', '', assumption]
    );
  }

  for (const row of plan.created) {
    await context.run(
      `INSERT INTO "${CREATED_TABLE}" (migration_version, entity, id) VALUES (?, ?, ?)`,
      [context.version, row.entity, row.id]
    );
  }
}

async function assertCanonicalTables(reader: SqlReader): Promise<void> {
  const missing: string[] = [];
  for (const table of Object.values(CANONICAL_TABLES)) {
    if (!(await tableExists(reader, table))) missing.push(table);
  }
  if (missing.length > 0) {
    throw new Error(
      `Migration M4 writes the canonical tables (${missing.join(', ')}), but the database does not hold them; apply the canonical schema first`
    );
  }
}

/**
 * True when M1's report tables are there.
 *
 * M4 is a later migration: it appends to the id map, the unmappable rows and the notes M1
 * created. A database without them has not run M1, so the run is refused rather than writing a
 * second set of report tables under a different shape.
 */
async function assertReportTables(reader: SqlReader): Promise<void> {
  const missing: string[] = [];
  for (const table of [LEGACY_ID_MAP_TABLE, LEGACY_UNMAPPABLE_TABLE, LEGACY_NOTES_TABLE]) {
    if (!(await tableExists(reader, table))) missing.push(table);
  }
  if (missing.length > 0) {
    throw new Error(
      `Migration M4 appends to the report tables migration M1 created (${missing.join(', ')}); run migration M1 first`
    );
  }
}

/**
 * True when M3's enrolments are there.
 *
 * A mark belongs to an enrolment: it is how a score is attached to a learner. A database with no
 * enrolment has not run M3, and migrating it would write no mark at all - the one thing this
 * migration exists to carry.
 */
async function assertLearnersMigrated(reader: SqlReader): Promise<void> {
  if (!(await tableExists(reader, 'enrolment'))) {
    throw new Error(
      'Migration M4 attaches every mark to an enrolment, but the database holds no enrolment table; run migration M3 first'
    );
  }
  const row = await reader.get<{ total: number }>(`SELECT COUNT(*) AS total FROM "enrolment"`);
  if ((row?.total ?? 0) === 0) {
    throw new Error(
      'Migration M4 attaches every mark to an enrolment, but the database holds no enrolment; run migration M3 first'
    );
  }
}

/** The rows M4 owns: a second run would duplicate them, so the migration refuses a non-empty one. */
async function assertTargetsEmpty(reader: SqlReader): Promise<void> {
  for (const table of [...Object.values(CANONICAL_TABLES), 'result']) {
    const row = await reader.get<{ total: number }>(`SELECT COUNT(*) AS total FROM "${table}"`);
    const total = row?.total ?? 0;
    if (total > 0) {
      throw new Error(
        `Migration M4 writes the canonical table "${table}", but it already holds ${total} row(s); the canonical data is newer than the legacy data, so there is nothing to migrate`
      );
    }
  }
}

/**
 * Refuses a verification whose learners' marks did not survive the migration.
 *
 * This is the acceptance, computed rather than asserted: every learner's multiset of marks
 * before the migration equals the multiset read back from the canonical tables after it. A
 * learner whose marks differ stops the migration, and the transaction rolls back.
 */
export function assertMarksCarried(verification: ExamMigrationVerification): void {
  const mismatched = verification.learners.filter((entry) => !entry.matched);
  if (mismatched.length === 0) return;
  const detail = mismatched
    .slice(0, 5)
    .map(
      (entry) =>
        `${entry.legacyStudentId || '(no learner)'}: before ${entry.before.length} mark(s), after ${entry.after.length}`
    )
    .join('; ');
  throw new Error(
    `Migration M4 did not carry the marks of ${mismatched.length} learner(s), so it is rolled back: ${detail}`
  );
}

/**
 * Builds migration M4.
 *
 * The migration reads the legacy subjects, papers, exam sessions and results and writes the
 * canonical learning areas, components, assessments, marks and period results in the framework's
 * transaction, so the rows and the ledger row commit together or not at all. Its SQL is not
 * declared: the ids are generated and the rows are written one by one, so the migration states a
 * checksum of its own instead.
 *
 * Before it commits it reads every row back and compares the marks of every learner with the
 * marks the legacy data holds for them. A learner whose marks do not match stops the migration:
 * the transaction rolls back and the database keeps the state it had.
 */
export function createExamMigration(options: ExamMigrationOptions = {}): Migration {
  return {
    version: 4,
    name: 'migrate the exam sessions and results into assessments, marks and results',
    checksum: 'm4-exams-v1',
    destructive: true,
    async up(context: MigrationContext) {
      await assertCanonicalTables(context);
      await assertReportTables(context);
      await assertLearnersMigrated(context);
      await assertTargetsEmpty(context);

      const source = await readExamPlanSource(context);
      if (source.marks.length > 0 && source.enrolmentByStudent.size === 0) {
        throw new Error(
          'Migration M4 found legacy paper marks but no learner enrolment in the id map; run migration M3 first, so every mark has a learner to attach to'
        );
      }

      const referenceTimestamp = (options.now?.() ?? new Date())
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z');
      const plan = planExamMigration(source, { referenceTimestamp });

      // An error stops the migration before it writes: a database without the institution or the
      // programme is one M1 or M2 has not migrated, not one this migration guesses at.
      const fatal = plan.issues.filter((issue) => issue.severity === 'error');
      if (fatal.length > 0) {
        throw new Error(
          `Migration M4 cannot map this database: ${fatal.map((issue) => issue.message).join('; ')}`
        );
      }

      await writeExamPlan(context, plan);
      const verification = await verifyExamMigration(context);

      const issueFailures = verification.issues.filter((issue) => issue.severity === 'error');
      if (issueFailures.length > 0) {
        throw new Error(
          `Migration M4 wrote a mapping it cannot verify: ${issueFailures
            .map((issue) => issue.message)
            .join('; ')}`
        );
      }

      const failures: readonly ExamCheck[] = verification.checks.filter(
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
          `Migration M4 wrote ${failures.length} row(s) that do not match the legacy rows: ${detail}`
        );
      }

      // The acceptance, computed rather than asserted: every learner's multiset of marks before
      // the migration equals the multiset read back from the canonical tables after it.
      assertMarksCarried(verification);
    },
    async down(context: MigrationContext) {
      // Everything the migration created is recorded, so the rollback removes exactly that and
      // never a row it found. The rows go in the order the foreign keys need.
      if (await tableExists(context, CREATED_TABLE)) {
        for (const entity of [
          'period_result',
          'mark',
          'assessment',
          'component',
          'learning_area',
        ] as const) {
          await context.run(
            `DELETE FROM "${CANONICAL_TABLES[entity]}"
               WHERE id IN (SELECT id FROM "${CREATED_TABLE}"
                             WHERE migration_version = ? AND entity = ?)`,
            [context.version, entity]
          );
        }
        // The table and M2's and M3's rows stay: a rollback to version 2 must leave them able to
        // undo their own rows later.
        await context.run(`DELETE FROM "${CREATED_TABLE}" WHERE migration_version = ?`, [
          context.version,
        ]);
      }

      await context.exec(
        `DELETE FROM "${LEGACY_ID_MAP_TABLE}"
           WHERE (legacy_table = 'subjects' AND canonical_entity = 'learning_area')
              OR (legacy_table = 'subject_papers' AND canonical_entity = 'component')
              OR (legacy_table = 'student_exam_results'
                  AND canonical_entity IN ('period_result', 'mark'))
              OR (legacy_table = 'student_paper_marks' AND canonical_entity = 'mark')`
      );
      await context.exec(
        `DELETE FROM "${LEGACY_UNMAPPABLE_TABLE}"
           WHERE canonical_entity IN ('learning_area', 'component', 'assessment', 'mark', 'period_result')
             AND legacy_table IN ('subjects', 'subject_papers', 'exam_sessions',
                                  'student_exam_results', 'student_paper_marks')`
      );
      await context.run(`DELETE FROM "${LEGACY_NOTES_TABLE}" WHERE migration_version = ?`, [
        context.version,
      ]);
    },
  };
}

/** Migration M4: the legacy exams become canonical assessments, marks and period results. */
export const migrateExams: Migration = createExamMigration();
