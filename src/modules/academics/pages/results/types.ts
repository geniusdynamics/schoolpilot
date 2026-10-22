// ABOUTME: The vocabulary of the results page: one learning area's computed outcome, the learner's
// ABOUTME: aggregate, the step-by-step explanation of that aggregate, and the moderation of a grade.

import type { AggregateTraceStep } from '@/domain/assessment/aggregation';

/** How one learning area's result came out of the assessment engine. */
export type AreaResultStatus = 'complete' | 'incomplete' | 'exempt' | 'unevaluable';

/** The band a grading scale awarded, with the points the scale declares for it. */
export interface AreaGrade {
  readonly code: string;
  readonly label: string;
  readonly points: string | null;
}

/** One learner's result in one learning area. */
export interface AreaOutcome {
  readonly areaCode: string;
  readonly status: AreaResultStatus;
  /** The learning-area percentage, canonical exact text; null unless the result is complete. */
  readonly percent: string | null;
  /** The total the scheme produced and the maximum it was out of. */
  readonly total: string | null;
  readonly outOf: string | null;
  readonly grade: AreaGrade | null;
  /** The assessment slots that carry no mark, by the label the grid shows. */
  readonly missing: readonly string[];
  /** What a reader needs when the area has no usable result. */
  readonly reason: string | null;
}

/** How the learner's aggregate came out. */
export type AggregateResultStatus = 'complete' | 'incomplete' | 'empty' | 'unavailable';

/** A table the explanation shows under one step. */
export interface ExplanationTable {
  readonly caption: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

/** One grouped step of an explanation: a title, plain-language lines, and the numbers under them. */
export interface ExplanationStep {
  readonly kind: AggregateTraceStep['kind'];
  readonly title: string;
  readonly summary: string | null;
  readonly lines: readonly string[];
  readonly table: ExplanationTable | null;
}

/** The whole "Why this grade" answer, derived from the aggregate's own trace. */
export interface GradeExplanation {
  readonly headline: string;
  readonly steps: readonly ExplanationStep[];
  readonly bandCode: string | null;
  readonly bandLabel: string | null;
}

/** The learner's aggregate result, with the trace that explains it. */
export interface AggregateOutcome {
  readonly code: string;
  readonly status: AggregateResultStatus;
  /** The final value as exact text; null unless the result is complete. */
  readonly value: string | null;
  readonly grade: AreaGrade | null;
  readonly explanation: GradeExplanation | null;
  /** What is missing, in plain language, when there is no grade. */
  readonly reason: string | null;
}

/** One row of the results table. */
export interface LearnerResultRow {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly admissionNumber: string | null;
  /** One outcome per area, in the order the table's columns are in. */
  readonly areas: readonly AreaOutcome[];
  readonly aggregate: AggregateOutcome;
}

/** An override of a computed grade, as the workflow store records it. */
export interface GradeOverrideView {
  /** What the engine computed when the override was recorded. */
  readonly original: string;
  /** The grade the moderator set. */
  readonly value: string;
  readonly reason: string;
  readonly actorId: string;
  readonly at: string;
}
