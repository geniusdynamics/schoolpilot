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
 */
export function defaultAggregation(): AggregationDefinition {
  return {
    code: DEFAULT_AGGREGATION_CODE,
    op: 'mean',
    value: 'score',
    precision: 1,
  };
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
