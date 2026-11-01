// ABOUTME: The aggregation a results page runs: the pack's declared rule when one is handed in,
// ABOUTME: otherwise a plain mean of the learning-area percentages, always evaluated by the engine.

import type { AggregationDefinition } from '@/domain/assessment/aggregation';

/** The code of the aggregation the page falls back to when the programme declares none. */
export const DEFAULT_AGGREGATION_CODE = 'learning_area_mean';

/**
 * The rule a report uses when no pack aggregation is declared for the programme.
 *
 * Spec 03 section 6's `cbe_mean_percent` is the same shape: the mean of the learning-area
 * percentages. A declared aggregation replaces it whole - the page never mixes the two.
 *
 * `resultScale` is the scale the mean is placed in. Without one the aggregate is a bare number and
 * the merit list has no grade, which is what a reader of the old system's mean-grade analysis comes
 * looking for; the caller passes the scale its class is marked on.
 */
export function defaultAggregation(resultScale?: string): AggregationDefinition {
  return {
    code: DEFAULT_AGGREGATION_CODE,
    op: 'mean',
    value: 'score',
    precision: 1,
    ...(resultScale === undefined ? {} : { result_scale: resultScale }),
  };
}

/**
 * The scale a class's aggregate is graded on.
 *
 * The assessments of the class decide: when they all name the same scale, that is the class's
 * scale. A class whose assessments name none falls back to the programme's only scale. Two
 * different scales on one class is a data problem, and no single aggregate grade can be claimed for
 * it, so the answer is `undefined` rather than an arbitrary pick.
 */
export function aggregateScaleCode(
  assessments: readonly { readonly grading_scale_id?: string }[],
  scales: readonly { readonly id: string; readonly code: string }[]
): string | undefined {
  const named = new Set(
    assessments
      .map((assessment) => assessment.grading_scale_id)
      .filter((id): id is string => typeof id === 'string')
  );
  if (named.size === 1) {
    const [id] = [...named];
    return scales.find((scale) => scale.id === id)?.code;
  }
  if (named.size === 0 && scales.length === 1) return scales[0].code;
  return undefined;
}

/** A sentence naming the rule, so the page says which one produced the numbers. */
export function describeAggregation(definition: AggregationDefinition): string {
  switch (definition.op) {
    case 'mean':
      return `Mean of the learning-area percentages${definition.result_scale === undefined ? '' : `, graded on ${definition.result_scale}`}.`;
    case 'weighted_mean':
      return `Coefficient-weighted mean${definition.result_scale === undefined ? '' : `, graded on ${definition.result_scale}`}.`;
    case 'sum':
      return `Total of the learning areas${definition.result_scale === undefined ? '' : `, placed in ${definition.result_scale}`}.`;
    case 'best_n':
      return `Best ${definition.n ?? 0} of the learning areas${definition.result_scale === undefined ? '' : `, graded on ${definition.result_scale}`}.`;
    case 'points_mean':
      return `Mean points, graded on ${definition.result_scale ?? 'no declared scale'}.`;
    case 'sum_points':
      return `Aggregate points, placed in ${definition.result_scale ?? 'no declared scale'}.`;
    case 'gpa':
      return 'Credit-weighted grade-point average.';
    case 'count_where':
      return 'Count of learning areas meeting a predicate.';
    case 'rubric_profile':
      return 'Distribution of rubric levels.';
  }
}
