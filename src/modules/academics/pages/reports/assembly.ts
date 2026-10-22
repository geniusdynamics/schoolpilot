// ABOUTME: Bulk report generation: each learner's card is assembled from the results screen's own
// ABOUTME: computation (P2-E03) and the pack's report template, with moderation applied and one
// ABOUTME: learner's failure isolated from the rest of the batch.

import { resolveDocument } from '@/domain/reports';
import type {
  ReportAttendance,
  ReportCardData,
  ReportColumnKind,
  ReportComment,
  ReportLocaleBundles,
  ReportResultRow,
  ReportRubricRow,
  ReportSchool,
  ReportSummaryItem,
  ReportTemplate,
  ReportTerm,
} from '@/domain/reports/types';

import type { AreaSource, GradeOverrideView, LearnerResultRow } from '../results';
import { displayNumber } from '../results';
import { freezeDocument } from './snapshot';
import type {
  FrozenAggregate,
  FrozenGrade,
  GeneratedReport,
  GenerationBatch,
  GenerationFailure,
} from './types';

export interface GenerateOptions {
  readonly areas: readonly AreaSource[];
  readonly rows: readonly LearnerResultRow[];
  readonly template: ReportTemplate;
  /** The template's version (the pack version), frozen into the snapshot. */
  readonly templateVersion: string;
  readonly locales: ReportLocaleBundles;
  readonly locale: string;
  readonly defaultLocale: string;
  readonly school: ReportSchool;
  readonly term: ReportTerm | null;
  /** The period the results belong to; carried into every publication's key. */
  readonly periodId: string;
  /** The verification host the preview's `?preview=1` URL is built against. */
  readonly verificationHost: string;
  /** The opaque id for a learner's report. Injected so a test names the ids it asserts. */
  readonly documentIdFor: (row: LearnerResultRow, index: number) => string;
  /** The clock the issued-at is read from. */
  readonly now: () => string;
  /** The moderation in force for a learner's aggregate, if any. */
  readonly moderationOf?: (enrolmentId: string) => GradeOverrideView | null;
  readonly attendanceOf?: (enrolmentId: string) => ReportAttendance | null;
  readonly commentsOf?: (enrolmentId: string) => readonly ReportComment[] | null;
  /** Learners the actor's teaching groups do not reach; they generate and are flagged at review. */
  readonly outsideScope?: ReadonlySet<string>;
  readonly pagination?: 'sheet' | 'flow';
}

/** A failure is a document that cannot be produced at all; a gap is a report that publishes as is. */
export class ReportAssemblyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportAssemblyError';
  }
}

/** The status word a report shows for an area that has no grade, matching the results screen. */
function areaStatusText(status: string): string {
  switch (status) {
    case 'exempt':
      return 'Exempt';
    case 'unevaluable':
      return 'Scheme incomplete';
    default:
      return 'Incomplete';
  }
}

function aggregateValueText(value: string | null): string | null {
  return value === null ? null : displayNumber(value);
}

/** The learner's area grades, frozen. */
function frozenGrades(areas: readonly AreaSource[], row: LearnerResultRow): FrozenGrade[] {
  return areas.map((area, index) => {
    const outcome = row.areas[index];
    return {
      areaCode: area.code,
      areaName: area.name,
      percent: outcome?.percent ?? null,
      gradeCode: outcome?.grade?.code ?? null,
      gradeLabel: outcome?.grade?.label ?? null,
    };
  });
}

/** The aggregate with the moderation beside the engine's value, per P2-E03's rule. */
function frozenAggregate(row: LearnerResultRow, moderation: GradeOverrideView | null): FrozenAggregate {
  const engineGrade = row.aggregate.grade?.code ?? null;
  return {
    code: row.aggregate.code,
    engineValue: row.aggregate.value,
    engineGrade,
    moderatedValue: moderation?.value ?? null,
    moderationReason: moderation?.reason ?? null,
    moderationActorId: moderation?.actorId ?? null,
    moderationAt: moderation?.at ?? null,
    publishedGrade: moderation?.value ?? engineGrade,
  };
}

function resultRows(areas: readonly AreaSource[], row: LearnerResultRow): ReportResultRow[] {
  return areas.map((area, index) => {
    const outcome = row.areas[index];
    const cells: Partial<Record<ReportColumnKind, string>> = {};
    if (outcome === undefined) {
      cells.total = areaStatusText('incomplete');
    } else if (outcome.status === 'complete' && outcome.percent !== null) {
      cells.total = displayNumber(outcome.percent);
      if (outcome.grade !== null) cells.grade = outcome.grade.code;
    } else {
      cells.total = areaStatusText(outcome.status);
      if (outcome.reason !== null) cells.remark = outcome.reason;
    }
    return { code: area.code, name: area.name, cells };
  });
}

function rubricRows(areas: readonly AreaSource[], row: LearnerResultRow): ReportRubricRow[] {
  return areas.map((area, index) => {
    const outcome = row.areas[index];
    if (outcome === undefined) {
      return { area: area.name, strand: null, level: areaStatusText('incomplete'), descriptor: null };
    }
    const level = outcome.grade?.code ?? areaStatusText(outcome.status);
    return { area: area.name, strand: null, level, descriptor: outcome.reason };
  });
}

/** The summary the report prints: the aggregate, and the moderation beside the engine's grade. */
function summaryItems(aggregate: FrozenAggregate): ReportSummaryItem[] {
  const items: ReportSummaryItem[] = [];
  const value = aggregateValueText(aggregate.engineValue);
  if (value !== null) items.push({ key: 'summary.mean', value });
  if (aggregate.publishedGrade !== null) {
    items.push({ key: 'summary.mean_grade', value: aggregate.publishedGrade });
  }
  if (aggregate.moderatedValue !== null) {
    items.push({
      key: 'summary.moderated',
      value: `${aggregate.moderatedValue} (engine computed ${aggregate.engineGrade ?? 'no grade'})`,
    });
    if (aggregate.moderationReason !== null) {
      items.push({ key: 'summary.moderation_reason', value: aggregate.moderationReason });
    }
  }
  return items;
}

/**
 * Assembles one learner's card from the results screen's own computation.
 *
 * The card is the *report's* view of the same numbers: an area's grade is the engine's band, an
 * incomplete area prints its reason instead of a grade, and the aggregate is the moderated value
 * with the engine's value kept beside it.
 *
 * @throws ReportAssemblyError when no report can be produced for the learner at all.
 */
export function assembleCard(
  options: GenerateOptions,
  row: LearnerResultRow
): { card: ReportCardData; grades: FrozenGrade[]; aggregate: FrozenAggregate; moderation: GradeOverrideView | null } {
  if (row.learnerName.trim() === '') {
    throw new ReportAssemblyError('No learner name is recorded for this enrolment.');
  }
  if (options.areas.length === 0) {
    throw new ReportAssemblyError('No learning area is marked for this class in this period.');
  }

  const moderation = options.moderationOf?.(row.enrolmentId) ?? null;
  const grades = frozenGrades(options.areas, row);
  const aggregate = frozenAggregate(row, moderation);
  const attendance = options.attendanceOf?.(row.enrolmentId) ?? null;
  const comments = options.commentsOf?.(row.enrolmentId) ?? null;

  const card: ReportCardData = {
    school: options.school,
    learner: {
      name: row.learnerName,
      admissionNo: row.admissionNumber,
      className: null,
    },
    term: options.term,
    attendance,
    results: {
      rows: resultRows(options.areas, row),
      totals: {
        code: 'TOTAL',
        name: aggregate.code,
        cells: {
          total: aggregateValueText(aggregate.engineValue) ?? '',
          grade: aggregate.publishedGrade ?? '',
        },
      },
    },
    rubric: { rows: rubricRows(options.areas, row), descriptors: null },
    competencies: null,
    traits: null,
    coCurricular: null,
    summary: summaryItems(aggregate),
    comments: comments ?? null,
    progression: null,
    fees: null,
    calendar: null,
    signatures: [
      { role: 'class_teacher', name: null },
      { role: 'head_teacher', name: null },
    ],
  };

  return { card, grades, aggregate, moderation };
}

/**
 * Generates a batch of report documents, one per learner.
 *
 * Every learner is assembled inside its own try/catch: a learner the batch cannot produce a document
 * for is recorded in `failures` with the reason, and the batch carries on. Progress is reported as
 * the batch runs, so a long batch shows movement.
 */
export function generateBatch(options: GenerateOptions): GenerationBatch {
  const reports: GeneratedReport[] = [];
  const failures: GenerationFailure[] = [];

  options.rows.forEach((row, index) => {
    try {
      const { card, grades, aggregate, moderation } = assembleCard(options, row);
      const documentId = options.documentIdFor(row, index);
      const issuedAt = options.now();
      const model = resolveDocument({
        template: options.template,
        card,
        locales: options.locales,
        locale: options.locale,
        defaultLocale: options.defaultLocale,
        documentId,
        issuedAt,
        verification: { host: options.verificationHost, preview: true },
        ...(options.pagination === undefined ? {} : { pagination: options.pagination }),
      });
      reports.push({
        enrolmentId: row.enrolmentId,
        learnerName: row.learnerName,
        admissionNumber: row.admissionNumber,
        house: null,
        documentId,
        periodId: options.periodId,
        issuedAt,
        card,
        grades,
        aggregate,
        previewDocument: freezeDocument(model, {
          bundles: options.locales,
          locale: options.locale,
          defaultLocale: options.defaultLocale,
        }),
        incomplete: row.aggregate.status !== 'complete',
        moderation,
        outsideScope: options.outsideScope?.has(row.enrolmentId) ?? false,
      });
    } catch (error) {
      failures.push({
        enrolmentId: row.enrolmentId,
        learnerName: row.learnerName,
        reason:
          error instanceof ReportAssemblyError
            ? error.message
            : `The report could not be prepared: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

  return {
    reports,
    failures,
    progress: { total: options.rows.length, done: reports.length, failed: failures.length },
    template: options.template,
    templateVersion: options.templateVersion,
  };
}
