// ABOUTME: The typed vocabulary of result aggregation (spec 03 section 6): the learning-area results
// ABOUTME: an operator reads, the pack-shaped definition, the replayable trace it explains itself
// ABOUTME: with, the aggregate it produces, and the ranking policy of section 6.1.

import type { RoundingMode } from '../engine';
import type { GradingScaleDefinition, ScaleLookupTrace } from '../scales';

// ------------------------------------------------------------------ vocabulary

/** The operators of spec 03 section 6, in the order the spec's table lists them. */
export const AGGREGATION_OPERATORS = [
  'sum',
  'mean',
  'weighted_mean',
  'best_n',
  'points_mean',
  'sum_points',
  'gpa',
  'count_where',
  'rubric_profile',
] as const;

export type AggregationOperator = (typeof AGGREGATION_OPERATORS)[number];

/**
 * Which value of a learning-area result an operator consumes.
 *
 * `score_20` reads the same `score` field as `score`; it states that the score is expressed out of
 * twenty (the Francophone moyenne), and the operator never rescales it. `grade` is a band code and
 * is only usable by `count_where` and `fail_if`, which compare codes rather than arithmetic.
 */
export const RESULT_VALUE_FIELDS = [
  'points',
  'grade_points',
  'score',
  'score_20',
  'grade',
  'rubric_level',
] as const;

export type ResultValueField = (typeof RESULT_VALUE_FIELDS)[number];

/** How tied learners share positions (spec 03 section 6.1). */
export const TIE_METHODS = ['competition_1224', 'dense_1223', 'shared_average'] as const;

export type TieMethod = (typeof TIE_METHODS)[number];

/** The population a position is computed within (spec 03 section 6.1). */
export const RANKING_SCOPES = ['class_group', 'level', 'programme'] as const;

export type RankingScope = (typeof RANKING_SCOPES)[number];

// --------------------------------------------------------------- learning area

/**
 * One learning area's result, as the aggregation operators consume it.
 *
 * The assessment scheme has already decided what each mark is worth (P2-B01) and the grading scale
 * has already produced the band (P2-B02); this is the seam between them and the overall result.
 * Every value is a decimal string, never a float, so the exact arithmetic stays exact.
 *
 * `complete` defaults to true; an incomplete area contributes no value and makes the areas that
 * need one report an incomplete aggregate. `exempt` areas are excluded from every candidate list
 * and every denominator.
 */
export interface LearningAreaResult {
  readonly code: string;
  /** The learning area's group (`sciences`, `humanities`, ...), used by `best_n` constraints. */
  readonly group?: string;
  /** The subject coefficient a `weighted_mean` may weight by (spec 03 section 6). */
  readonly coefficient?: string;
  /** The credit a `gpa` weights grade points by; defaults to one credit. */
  readonly credit?: string;
  /** The learning-area score: a percentage, or a mark out of twenty when `value` is `score_20`. */
  readonly score?: string;
  /** The band code the grading scale awarded. */
  readonly grade?: string;
  /** The points the band is worth (the KCSE 12-point scale, the PLE grade points). */
  readonly points?: string;
  /** The grade points a GPA consumes. */
  readonly grade_points?: string;
  /** The rubric level as its numeric level (`4` for EE in the CBC four-level scale). */
  readonly rubric_level?: string;
  readonly complete?: boolean;
  readonly exempt?: boolean;
}

// ---------------------------------------------------------------- definition

/** One `best_n` constraint, in the three shapes the pack schema allows. */
export type GroupConstraint =
  | { readonly require_all: readonly string[] }
  | { readonly group: string; readonly min: number }
  | { readonly fill_from: 'any' };

/** The post-step a `best_n` selection is combined with. */
export interface PostStep {
  readonly op: 'mean' | 'sum' | 'lookup';
  readonly precision?: number;
}

/**
 * A declarable predicate for `count_where`.
 *
 * `eq` and `in` compare codes or exact values; `gte`, `gt`, `lte` and `lt` compare exact values
 * and are refused on the `grade` field, which has no declared order of its own.
 */
export interface CountPredicate {
  readonly op: 'eq' | 'in' | 'gte' | 'gt' | 'lte' | 'lt';
  readonly value?: string;
  readonly values?: readonly string[];
}

/**
 * The national-exam escape hatch (spec 03 section 6).
 *
 * When any area named by `in` (or any consumed area when it is absent) carries `any_grade`, the
 * awarded band is capped at `then_max_division`. `source` records the citation the pack README
 * must also carry; it is not in the current pack schema.
 */
export interface FailIfRule {
  readonly any_grade: string;
  readonly in?: readonly string[];
  readonly then_max_division: string;
  readonly source?: string;
}

/**
 * One aggregation as a pack states it (spec 03 section 6, `aggregation.schema.json`).
 *
 * Fields are optional because the operator decides which of them it needs; `prepareAggregation`
 * refuses a definition that is missing a field its operator cannot run without. `mode` and
 * `fail_if.source` are read even though the current schema has no place for them.
 */
export interface AggregationDefinition {
  readonly code: string;
  readonly op: AggregationOperator;
  /** How many results a `best_n` keeps. */
  readonly n?: number;
  readonly value?: ResultValueField;
  readonly groups?: readonly GroupConstraint[];
  readonly then?: PostStep;
  /** The learning areas the operator covers, in the order a report shows them. */
  readonly over?: readonly string[];
  readonly fail_if?: FailIfRule;
  readonly weights?: 'coefficient' | Readonly<Record<string, number | string>>;
  /**
   * Per learning-area multipliers applied to a consumed value before the aggregate is formed, for a
   * rule that counts one subject more than once (DfE Attainment 8 doubles English and mathematics).
   * One is the default; every key must be an area the run actually consumed.
   */
  readonly multipliers?: Readonly<Record<string, number | string>>;
  /**
   * What the multiplied aggregate is divided by: a number, or `sum_of_multipliers` for the total of
   * the multipliers actually applied. Absent, the operator's natural divisor applies (the number of
   * consumed results for a mean, one for a sum, the weight total for a weighted mean).
   */
  readonly divisor?: number | 'sum_of_multipliers' | string;
  /** Decimal places kept on the aggregate before lookup. */
  readonly precision?: number;
  /** Rounding mode; defaults to `half_up`, the mode the spec's examples use. */
  readonly mode?: RoundingMode;
  readonly result_scale?: string;
  readonly where?: CountPredicate;
}

/**
 * A definition with every default resolved, so a trace can replay it without the pack.
 *
 * Absent optional fields are absent rather than null, which makes a prepared aggregation a valid
 * `AggregationDefinition` in its own right: `evaluateAggregation(trace.definition, trace.inputs)`
 * re-runs the recorded run.
 */
export interface PreparedAggregation {
  readonly code: string;
  readonly op: AggregationOperator;
  readonly n?: number;
  readonly value?: ResultValueField;
  readonly groups: readonly GroupConstraint[];
  readonly then?: PostStep;
  readonly over?: readonly string[];
  readonly fail_if?: FailIfRule;
  readonly weights?: 'coefficient' | Readonly<Record<string, string>>;
  readonly multipliers?: Readonly<Record<string, string>>;
  readonly divisor?: string | 'sum_of_multipliers';
  readonly precision?: number;
  readonly mode: RoundingMode;
  readonly result_scale?: string;
  readonly where?: CountPredicate;
}

/** The grading scales an aggregation resolves its `result_scale` against. */
export interface AggregationContext {
  readonly scales?: readonly GradingScaleDefinition[];
}

// --------------------------------------------------------------------- trace

/** One value the operator consumed, after selection. */
export interface TracePart {
  readonly code: string;
  /** The value as the area's result carried it, before any multiplier. */
  readonly value: string;
  /** The multiplier applied to `value`; `1` when the definition declares none. */
  readonly multiplier: string;
  /** `value` times `multiplier`: what the aggregate actually counts for this area. */
  readonly multiplied: string;
}

/** One weighed value of a weighted mean or a GPA. */
export interface WeightedTracePart {
  readonly code: string;
  /** The value as the area's result carried it, before any multiplier. */
  readonly value: string;
  readonly weight: string;
  /** The multiplier applied to `value`; `1` when the definition declares none. */
  readonly multiplier: string;
  /** `value` times `multiplier`, which the weight then scales. */
  readonly multiplied: string;
}

/**
 * Why the divisor of a combine step is what it is.
 *
 * `declared` is the definition's own `divisor`; `sum_of_multipliers` is the total of the
 * multipliers the step applied; `count`, `one` and `weights` are the operator's natural divisor for
 * a mean, a sum and a weighted mean respectively.
 */
export type DivisorSource = 'declared' | 'sum_of_multipliers' | 'count' | 'one' | 'weights';

/** Why a candidate of a `best_n` selection was kept or dropped. */
export type SelectionReason =
  | 'required'
  | 'group_minimum'
  | 'fill'
  | 'missing_value'
  | 'lower_value'
  | 'slots_full';

/** One candidate's fate, with the selected area that displaced it when it was dropped. */
export interface SelectionDecision {
  readonly code: string;
  readonly group: string | null;
  readonly value: string | null;
  readonly selected: boolean;
  readonly reason: SelectionReason;
  readonly lost_to: string | null;
}

/** The predicate's verdict on one area, with the value it compared. */
export interface CountPart {
  readonly code: string;
  readonly value: string | null;
  readonly matched: boolean;
}

/** One area's rubric level, as the profile counted it. */
export interface ProfilePart {
  readonly code: string;
  /** The rubric level the result recorded. */
  readonly level: string;
  /** The scale band that level falls in, or null when the profile has no scale. */
  readonly band: string | null;
}

/** How many areas carry one level. */
export interface LevelCount {
  readonly level: string;
  readonly label: string | null;
  readonly count: number;
}

/**
 * One step of an aggregation, in the order it ran.
 *
 * The first step of a numeric operator is a source (`sum`, `mean`, `weighted_mean`, `count`); the
 * rest are transforms of the running value (`round`, `lookup`, `fail_if`). Replay recomputes each
 * step from its own operands rather than trusting the stored number.
 */
export type AggregateTraceStep =
  | {
      readonly kind: 'select';
      readonly n: number;
      readonly groups: readonly GroupConstraint[];
      readonly tie_break: 'value_desc_code_asc';
      readonly decisions: readonly SelectionDecision[];
      readonly selected: readonly string[];
      /** The sum of the selected values, before the post-step divides it. */
      readonly value: string;
    }
  | {
      readonly kind: 'sum';
      readonly parts: readonly TracePart[];
      /** The divisor applied to the summed multiplied values, and where it came from. */
      readonly divisor: string;
      readonly divisor_from: DivisorSource;
      readonly value: string;
    }
  | {
      readonly kind: 'mean';
      readonly parts: readonly TracePart[];
      readonly divisor: string;
      readonly divisor_from: DivisorSource;
      readonly value: string;
    }
  | {
      readonly kind: 'weighted_mean';
      readonly parts: readonly WeightedTracePart[];
      /** The sum of the weights, which is the natural divisor of a weighted mean. */
      readonly max: string;
      readonly divisor: string;
      readonly divisor_from: DivisorSource;
      readonly value: string;
    }
  | {
      readonly kind: 'count';
      readonly predicate: CountPredicate;
      readonly parts: readonly CountPart[];
      readonly value: string;
    }
  | {
      readonly kind: 'profile';
      readonly parts: readonly ProfilePart[];
      readonly counts: readonly LevelCount[];
    }
  | {
      readonly kind: 'round';
      readonly input: string;
      readonly precision: number;
      readonly mode: RoundingMode;
      readonly value: string;
    }
  | {
      readonly kind: 'lookup';
      readonly input: string;
      /** The scale lookup of P2-B02, with every boundary check it made. */
      readonly lookup: ScaleLookupTrace;
    }
  | {
      readonly kind: 'fail_if';
      readonly rule: FailIfRule;
      readonly fired: boolean;
      /** The areas the rule watched, so replay never has to guess the population. */
      readonly watched: readonly string[];
      /** The watched areas whose grade matched `any_grade`. */
      readonly trigger: readonly string[];
      /** The scale's band codes from best to worst, so the cap can be replayed. */
      readonly order: readonly string[];
      readonly awarded: string | null;
      readonly capped: string | null;
    };

/**
 * The explanation of an aggregate.
 *
 * `definition` and `inputs` are the exact inputs of the run, so re-evaluating them reproduces the
 * result; `steps` is the same run unfolded, so a reader can see where each number came from.
 */
export interface AggregateTrace {
  readonly aggregation: string;
  readonly op: AggregationOperator;
  readonly status: AggregateStatus;
  readonly definition: PreparedAggregation;
  readonly inputs: readonly LearningAreaResult[];
  readonly steps: readonly AggregateTraceStep[];
  /** The final number as canonical exact text; null for a profile or a failed run. */
  readonly value: string | null;
  readonly distribution: readonly LevelCount[];
}

// -------------------------------------------------------------------- result

export type AggregateStatus = 'complete' | 'incomplete' | 'empty';

export type AggregateFlagCode =
  | 'missing_value'
  | 'missing_weight'
  | 'exempt_area'
  | 'required_area_missing'
  | 'group_minimum_unmet'
  | 'insufficient_candidates'
  | 'fail_if_fired'
  | 'ungraded';

/** Something a caller may need to show or act on, identified by code, never by prose. */
export interface AggregateFlag {
  readonly code: AggregateFlagCode;
  readonly area: string | null;
}

/** The band an aggregate was awarded, and the cap that may have changed it. */
export interface AggregateGrade {
  readonly scale: string;
  readonly band: string;
  readonly label: string;
  readonly points: string | null;
  readonly descriptor: string | null;
  /** The band the lookup produced before any `fail_if` cap. */
  readonly awarded: string;
  /** The `fail_if` rule that capped the band, or null. */
  readonly capped_by: FailIfRule | null;
}

/** One value the operator consumed, with the weight and multiplier it carried. */
export interface ConsumedValue {
  readonly code: string;
  /** The value as the area's result carried it. */
  readonly value: string;
  readonly weight: string | null;
  readonly multiplier: string;
  /** `value` times `multiplier`. */
  readonly multiplied: string;
}

/** The rounding applied to the aggregate, exactly once. */
export interface AggregateRounding {
  readonly precision: number;
  readonly mode: RoundingMode;
  readonly input: string;
  readonly output: string;
}

/** A deterministic aggregate: exact numbers, the decisions behind them and their trace. */
export interface AggregateResult {
  readonly code: string;
  readonly op: AggregationOperator;
  readonly status: AggregateStatus;
  /** The final aggregate after the declared rounding; null when it could not be computed. */
  readonly value: string | null;
  /** The same value before that rounding. */
  readonly exact_value: string | null;
  /** The sum of the multiplied values before the division: the KCSE aggregate points. */
  readonly subtotal: string | null;
  /** The divisor applied to the subtotal, when the operator divides one. */
  readonly divisor: string | null;
  readonly consumed: readonly ConsumedValue[];
  /** The areas a `best_n` selected, in the order it selected them. */
  readonly selected: readonly string[] | null;
  readonly precision: number | null;
  readonly rounding: AggregateRounding | null;
  readonly grade: AggregateGrade | null;
  readonly distribution: readonly LevelCount[] | null;
  readonly flags: readonly AggregateFlag[];
  readonly trace: AggregateTrace;
}

/** Why the engine refused a definition or an input; `path` names the field at fault. */
export type AggregationIssueCode =
  | 'invalid_code'
  | 'unsupported_op'
  | 'invalid_n'
  | 'missing_value_field'
  | 'invalid_value_field'
  | 'missing_groups'
  | 'invalid_group_constraint'
  | 'invalid_then'
  | 'duplicate_fill_from'
  | 'constraints_exceed_n'
  | 'invalid_over'
  | 'duplicate_over'
  | 'missing_weights'
  | 'invalid_weights'
  | 'invalid_weight'
  | 'invalid_multiplier'
  | 'invalid_divisor'
  | 'missing_divisor'
  | 'multiplier_not_consumed'
  | 'invalid_precision'
  | 'invalid_rounding_mode'
  | 'missing_result_scale'
  | 'unknown_result_scale'
  | 'invalid_scale'
  | 'missing_where'
  | 'invalid_predicate'
  | 'relational_predicate_on_code'
  | 'invalid_fail_rule'
  | 'fail_if_without_scale'
  | 'unknown_cap_band'
  | 'unsupported_option'
  | 'invalid_area_code'
  | 'duplicate_area'
  | 'invalid_area_value'
  | 'invalid_coefficient'
  | 'invalid_credit'
  | 'zero_total_weight'
  | 'invalid_ranking'
  | 'duplicate_learner'
  | 'invalid_learner_value';

export interface AggregationIssue {
  readonly code: AggregationIssueCode;
  /** A field path such as `groups[2].min` or `inputs[1].points`. */
  readonly path: string;
  /** A developer diagnostic; never composed for display. */
  readonly detail: string;
}

export type AggregationEvaluation =
  | { readonly ok: true; readonly result: AggregateResult }
  | { readonly ok: false; readonly issues: readonly AggregationIssue[] };

/** The numbers `replayAggregate` recomputes and hands back. */
export interface ReplayedAggregate {
  readonly value: string | null;
  readonly distribution: readonly LevelCount[];
}
