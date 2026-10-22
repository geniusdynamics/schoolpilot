// ABOUTME: The results computation: each learning area's result comes from the assessment engine and
// ABOUTME: the learner's aggregate comes from the aggregation engine, so the page reads verdicts
// ABOUTME: rather than calculating them.

import { evaluateAggregation } from '@/domain/assessment/aggregation';
import type {
  AggregateResult,
  AggregationContext,
  AggregationDefinition,
  LearningAreaResult,
} from '@/domain/assessment/aggregation';
import { evaluateScheme, parseExact } from '@/domain/assessment/engine';
import type { MarkStatus, SchemeDefinition, SchemeMark } from '@/domain/assessment/engine';
import { evaluateGradingScale } from '@/domain/assessment/scales';
import type { GradingScaleDefinition } from '@/domain/assessment/scales';

import { evaluateRow } from '../marks/verdict';
import type { RowMark } from '../marks/scheme';
import type { SchemeColumn } from '../marks/types';
import { explainAggregate } from './explain';
import type { AggregateOutcome, AreaGrade, AreaOutcome, AreaResultStatus } from './types';

/** One learning area a results table has a column for, with the scheme it is marked under. */
export interface AreaSource {
  readonly groupId: string;
  readonly learningAreaId: string;
  readonly code: string;
  readonly name: string;
  /** The learning area's group (`sciences`, `humanities`), for a `best_n` constraint. */
  readonly group: string | null;
  readonly scheme: SchemeDefinition;
  readonly columns: readonly SchemeColumn[];
  /** The grading scale that turns this area's percentage into a band, when one is declared. */
  readonly scale: GradingScaleDefinition | null;
}

/** One stored mark, reduced to what a learning area's evaluation reads. */
export interface AreaMark {
  readonly assessmentId: string;
  readonly score: string | null;
  readonly status: MarkStatus;
}

/** The result a learner has in one learning area, as the engine produced it. */
export function evaluateArea(area: AreaSource, marks: readonly AreaMark[]): AreaOutcome {
  const byAssessment = new Map(marks.map((mark) => [mark.assessmentId, mark]));

  const rowMarks: RowMark[] = [];
  for (const column of area.columns) {
    if (column.assessmentId === null) continue;
    const mark = byAssessment.get(column.assessmentId);
    const score = (mark?.score ?? '').trim();
    const status = mark?.status ?? 'present';
    // A blank cell nobody flagged contributes no mark at all, so the engine decides what its
    // absence means under the scheme's own missing policy.
    if (score === '' && status === 'present') continue;
    rowMarks.push({
      slot: column.slot,
      assessment: column.assessmentId,
      score: score === '' ? undefined : score,
      maxScore: column.max === null ? undefined : String(column.max),
      status,
    });
  }

  const evaluation = evaluateScheme({
    scheme: area.scheme,
    marks: rowMarks.map<SchemeMark>((mark) => ({
      slot: mark.slot,
      assessment: mark.assessment,
      ...(mark.score === undefined ? {} : { score: mark.score }),
      ...(mark.maxScore === undefined ? {} : { max_score: mark.maxScore }),
      status: mark.status,
    })),
  });

  if (!evaluation.ok) {
    // The scheme itself is unusable. The mark grid already words that for a teacher, so the result
    // asks the same verdict rather than inventing a second explanation for the same failure.
    const verdict = evaluateRow(area.scheme, rowMarks);
    return {
      areaCode: area.code,
      status: 'unevaluable',
      percent: null,
      total: null,
      outOf: null,
      grade: null,
      missing: [],
      reason: verdict.reason ?? 'The scheme cannot be evaluated for this learner.',
    };
  }

  const result = evaluation.result;
  const missing = missingLabels(area.columns, result.flags);
  const status: AreaResultStatus =
    result.status === 'complete' ? 'complete' : result.status === 'exempt' ? 'exempt' : 'incomplete';

  if (status !== 'complete' || result.percent === null) {
    return {
      areaCode: area.code,
      status,
      percent: null,
      total: status === 'incomplete' ? result.total : null,
      outOf: result.out_of,
      grade: null,
      missing,
      reason: status === 'exempt' ? null : incompleteAreaReason(missing),
    };
  }

  return {
    areaCode: area.code,
    status: 'complete',
    percent: result.percent,
    total: result.total,
    outOf: result.out_of,
    grade: gradeOf(area.scale, result.percent),
    missing: [],
    reason: null,
  };
}

/** The band a scale awards for a percentage, or null when the scale has no band for it. */
function gradeOf(scale: GradingScaleDefinition | null, percent: string): AreaGrade | null {
  if (scale === null) return null;
  const value = parseExact(percent);
  if (value === null) return null;
  const outcome = evaluateGradingScale(scale, { source: 'percent', value });
  if (!outcome.ok || !outcome.matched) return null;
  return { code: outcome.band.code, label: outcome.band.label, points: outcome.band.points };
}

/** The assessment labels behind the engine's `mark_missing` flags. */
function missingLabels(
  columns: readonly SchemeColumn[],
  flags: readonly { readonly code: string; readonly slot: string; readonly assessment?: string }[]
): string[] {
  const byAssessment = new Map(columns.map((column) => [column.assessmentId, column.label] as const));
  const bySlot = new Map(columns.map((column) => [column.slot, column.label] as const));
  const labels = new Set<string>();
  for (const flag of flags) {
    if (flag.code !== 'mark_missing') continue;
    const label =
      (flag.assessment === undefined ? undefined : byAssessment.get(flag.assessment)) ??
      bySlot.get(flag.slot) ??
      flag.slot;
    labels.add(label);
  }
  return [...labels];
}

function incompleteAreaReason(missing: readonly string[]): string {
  if (missing.length === 0) return 'The scheme produced no total for this learner.';
  if (missing.length === 1) return `No result yet: ${missing[0]} has no mark.`;
  return `No result yet: ${missing.join(', ')} have no mark.`;
}

/** One learning area's outcome as the aggregation engine consumes it. */
export function toLearningAreaInput(area: AreaSource, outcome: AreaOutcome): LearningAreaResult {
  const shared = {
    code: area.code,
    ...(area.group === null ? {} : { group: area.group }),
  };
  if (outcome.status === 'exempt') return { ...shared, exempt: true };
  if (outcome.status !== 'complete' || outcome.percent === null) {
    return { ...shared, complete: false };
  }
  const grade = outcome.grade;
  return {
    ...shared,
    score: outcome.percent,
    ...(grade === null ? {} : { grade: grade.code }),
    // The scale's points are what the next operator consumes, whether it asks for the KCSE points
    // or for grade points: both are the band's declared worth.
    ...(grade?.points == null ? {} : { points: grade.points, grade_points: grade.points }),
    complete: true,
  };
}

export interface AggregateRequest {
  readonly definition: AggregationDefinition;
  readonly areas: readonly AreaSource[];
  readonly outcomes: readonly AreaOutcome[];
  readonly context?: AggregationContext;
}

/**
 * The learner's aggregate, evaluated by the aggregation engine with its trace intact.
 *
 * The areas and outcomes are index-aligned; a learner with no result in an area still passes that
 * area to the engine as incomplete, so the denominator and the missing-value flag stay honest.
 */
export function aggregateLearner(request: AggregateRequest): AggregateOutcome {
  const { definition, areas, outcomes } = request;
  const labels = new Map(areas.map((area) => [area.code, area.name] as const));
  const inputs = areas.map((area, index) => {
    const outcome = outcomes[index];
    return toLearningAreaInput(
      area,
      outcome ?? { areaCode: area.code, status: 'incomplete', percent: null, total: null, outOf: null, grade: null, missing: [], reason: null }
    );
  });

  const evaluation = evaluateAggregation(definition, inputs, request.context ?? {});
  if (!evaluation.ok) {
    return {
      code: definition.code,
      status: 'unavailable',
      value: null,
      grade: null,
      explanation: null,
      reason: aggregationIssueReason(evaluation.issues[0]?.code),
    };
  }

  const result = evaluation.result;
  return {
    code: result.code,
    status: result.status,
    value: result.value,
    grade:
      result.grade === null
        ? null
        : { code: result.grade.band, label: result.grade.label, points: result.grade.points },
    explanation: explainAggregate(result, labels),
    reason: aggregateReason(result, labels),
  };
}

/** What a reader is told when the aggregation produced no grade. */
function aggregateReason(result: AggregateResult, labels: ReadonlyMap<string, string>): string | null {
  if (result.status === 'complete') {
    if (result.grade !== null) return null;
    return result.flags.some((flag) => flag.code === 'ungraded')
      ? 'The result fell outside every band of the grading scale, so no grade was awarded.'
      : null;
  }
  if (result.status === 'empty') {
    return 'No learning area has a result this aggregation can count.';
  }

  const label = (code: string): string => labels.get(code) ?? code;
  const gaps = [
    ...new Set(
      result.flags
        .filter((flag) => flag.code === 'missing_value' && flag.area !== null)
        .map((flag) => label(flag.area as string))
    ),
  ];
  const parts: string[] = [];
  if (gaps.length > 0) {
    parts.push(`${gaps.join(', ')} ${gaps.length === 1 ? 'has' : 'have'} no complete result`);
  }
  if (result.flags.some((flag) => flag.code === 'required_area_missing')) {
    parts.push('a required learning area is missing');
  }
  if (result.flags.some((flag) => flag.code === 'group_minimum_unmet')) {
    parts.push('a group minimum could not be met');
  }
  if (result.flags.some((flag) => flag.code === 'insufficient_candidates')) {
    parts.push('there are too few learning areas to choose from');
  }
  if (result.flags.some((flag) => flag.code === 'missing_weight')) {
    parts.push('a counted learning area has no weight');
  }
  if (parts.length === 0) {
    return 'The aggregate needs a complete result from every learning area it counts.';
  }
  return `No grade yet: ${parts.join('; ')}.`;
}

/** Why an aggregation cannot be evaluated at all; `detail` names the field at fault, never shown. */
function aggregationIssueReason(code: string | undefined): string {
  switch (code) {
    case 'unknown_result_scale':
      return 'The aggregation names a grading scale this programme does not have, so no grade can be awarded.';
    case 'invalid_scale':
      return 'The grading scale the aggregation names is not valid, so no grade can be awarded.';
    case 'zero_total_weight':
      return 'Every learning area the aggregation weighs has a weight of zero, so there is nothing to divide by.';
    case 'invalid_divisor':
    case 'missing_divisor':
      return 'The aggregation does not say what its total is divided by.';
    case 'multiplier_not_consumed':
      return 'The aggregation gives a multiplier to a learning area it does not count.';
    default:
      return 'The aggregation cannot be computed for this programme; its definition needs attention.';
  }
}

