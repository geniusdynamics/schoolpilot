// ABOUTME: The typed vocabulary of period-to-annual aggregation (spec 03 section 4.1) and of the
// ABOUTME: promotion rules of section 7: the pack-shaped definitions, their prepared forms, the
// ABOUTME: replayable traces, and the suggestions the evaluator returns without deciding anything.

import type { AggregateTrace, AggregationDefinition, LearningAreaResult, TracePart } from '../aggregation';
import type { RoundingMode } from '../engine';
import type { GradingScaleDefinition, ScaleLookupTrace } from '../scales';

// ---------------------------------------------------------------- annual ops

/** The operators spec 03 section 4.1 allows, in the order the spec lists them. */
export const ANNUAL_OPERATORS = ['weighted_mean', 'mean', 'final_period_only', 'cumulative_sum', 'best_of'] as const;

export type AnnualOperator = (typeof ANNUAL_OPERATORS)[number];

/**
 * What happens when a period has no usable result (spec 03 section 4.1 and `assessment.schema.json`).
 *
 * `renormalise` drops the period and reweights the rest; `zero` scores it zero; `incomplete`
 * publishes no annual result; `carry_previous` uses the nearest earlier period. None of them
 * invents a value except `zero`, which the pack declares outright.
 */
export const ANNUAL_MISSING_POLICIES = ['renormalise', 'zero', 'incomplete', 'carry_previous'] as const;

export type AnnualMissingPolicy = (typeof ANNUAL_MISSING_POLICIES)[number];

/** Whether a series has a publishable value, no value because data is missing, or no periods at all. */
export type AnnualStatus = 'complete' | 'incomplete' | 'empty';

/**
 * The annual block of `assessment.json` (spec 03 section 4.1).
 *
 * `of` is a map of period code to weight for `weighted_mean`, or a list of period codes that
 * fixes the population and its order for every operator. `precision` and `mode` are the annual
 * rounding stage spec 03 section 4 names but `assessment.schema.json` has no field for; a pack
 * cannot declare them yet, and `SCHEMA-GAPS.md` records that.
 */
export interface AnnualDefinition {
  readonly op: AnnualOperator;
  readonly of?: Readonly<Record<string, number | string>> | readonly string[];
  readonly missing?: AnnualMissingPolicy;
  /** How many periods count when `op` is `best_of`. */
  readonly n?: number;
  readonly precision?: number;
  readonly mode?: RoundingMode;
}

/** One period of the population, with the weight the definition gave it. */
export interface AnnualPeriodWeight {
  readonly code: string;
  /** The declared weight as exact text, or null when the operator does not weight periods. */
  readonly weight: string | null;
}

/**
 * A definition with every default resolved, so a trace replays without the pack.
 *
 * The absent optional fields stay absent rather than null, which makes a prepared definition a
 * valid `AnnualDefinition` in its own right.
 */
export interface PreparedAnnual {
  readonly op: AnnualOperator;
  readonly periods: readonly AnnualPeriodWeight[];
  readonly missing: AnnualMissingPolicy;
  readonly n?: number;
  readonly precision?: number;
  readonly mode: RoundingMode;
}

// -------------------------------------------------------------- annual inputs

/** One period's overall result, and its learning-area results when the caller has them. */
export interface AnnualPeriodInput {
  readonly code: string;
  /** The period's overall result, as a decimal string. */
  readonly value?: string | null;
  /** False when the period is known to be unfinished; it then counts as missing. */
  readonly complete?: boolean;
  /** A period is never exempt as a whole; the field is accepted for symmetry with an area. */
  readonly exempt?: boolean;
  /** The period's learning-area results, each carrying the value the annual series reads. */
  readonly areas?: readonly LearningAreaResult[];
}

/** One period of one series, normalised to exact text, as a trace records it. */
export interface AnnualSeriesInput {
  readonly code: string;
  readonly value: string | null;
  readonly complete: boolean;
  readonly exempt: boolean;
}

/** Why a period contributes no value. `exempt` is not a gap: the period was never assessed. */
export type AnnualPeriodGap = 'absent' | 'incomplete' | 'no_result' | 'exempt';

/** What the missing policy did with a gap. `blocked` means the result cannot be published. */
export type AnnualPeriodTreatment = 'excluded' | 'zero' | 'carry' | 'blocked' | 'exempt';

/** One period's fate, with the value a `zero` or `carry` treatment supplied. */
export interface AnnualMissingEntry {
  readonly code: string;
  readonly reason: AnnualPeriodGap;
  readonly treatment: AnnualPeriodTreatment;
  readonly value: string | null;
  readonly carried_from: string | null;
  readonly weight: string | null;
}

/** The declared and the applied weight of one period, so a reweighting is visible without maths. */
export interface AnnualWeightTrace {
  readonly code: string;
  readonly declared: string | null;
  readonly effective: string | null;
}

/** One period the arithmetic actually consumed. */
export interface AnnualConsumedPeriod {
  readonly code: string;
  readonly value: string;
  readonly weight: string | null;
  readonly source: 'declared' | 'zero' | 'carried';
}

// --------------------------------------------------------------- annual trace

/**
 * How the period population was reduced, always the first step of an annual trace.
 *
 * It names every gap, what the policy did with it, every supplied period the definition does not
 * cover, and each period's declared and applied weight. A `renormalise` run is therefore legible
 * without comparing two numbers by hand.
 */
export interface AnnualMissingStep {
  readonly kind: 'missing';
  readonly policy: AnnualMissingPolicy;
  readonly entries: readonly AnnualMissingEntry[];
  readonly ignored: readonly string[];
  readonly weights: readonly AnnualWeightTrace[];
  readonly declared_weights_total: string | null;
  readonly effective_weights_total: string | null;
  readonly renormalised: boolean;
}

/**
 * The arithmetic of a weighted mean, mean, cumulative sum or best-of, delegated to the
 * aggregation operators of spec 03 section 6 and embedded whole so replay re-runs that engine.
 */
export interface AnnualAggregateStep {
  readonly kind: 'aggregate';
  readonly aggregate: AggregateTrace;
}

/** A pass-through value: the final period of a `final_period_only` run, with what it ignored. */
export interface AnnualValueStep {
  readonly kind: 'value';
  readonly selected: string;
  readonly ignored: readonly string[];
  readonly parts: readonly TracePart[];
  readonly value: string;
}

/** The annual rounding stage, applied once after the value is computed. */
export interface AnnualRoundStep {
  readonly kind: 'round';
  readonly input: string;
  readonly precision: number;
  readonly mode: RoundingMode;
  readonly value: string;
}

export type AnnualTraceStep = AnnualMissingStep | AnnualAggregateStep | AnnualValueStep | AnnualRoundStep;

/**
 * The explanation of one annual series.
 *
 * `definition` and `inputs` are the exact inputs of the run, and `steps` unfolds it, so
 * `replayAnnual` recomputes the value from the periods rather than trusting the stored number.
 */
export interface AnnualTrace {
  readonly annual: 'annual';
  /** `average` for the overall series, otherwise the learning-area code. */
  readonly subject: string;
  readonly op: AnnualOperator;
  readonly status: AnnualStatus;
  readonly definition: PreparedAnnual;
  readonly inputs: readonly AnnualSeriesInput[];
  readonly steps: readonly AnnualTraceStep[];
  readonly value: string | null;
}

// -------------------------------------------------------------- annual result

export type AnnualFlagCode =
  | 'missing_period'
  | 'renormalised'
  | 'zeroed_period'
  | 'carried_period'
  | 'exempt_period'
  | 'ignored_period'
  | 'no_previous_period'
  | 'insufficient_periods'
  | 'ungraded';

/** Something a caller may need to show or act on, identified by code, never by prose. */
export interface AnnualFlag {
  readonly code: AnnualFlagCode;
  readonly period: string | null;
  /** The learning area the flag belongs to; null on the overall series. */
  readonly area: string | null;
}

/** The annual rounding applied exactly once, and the value it started from. */
export interface AnnualRounding {
  readonly precision: number;
  readonly mode: RoundingMode;
  readonly input: string;
  readonly output: string;
}

/** One annual series: its value, what it consumed, and its replayable trace. */
export interface AnnualSeriesResult {
  readonly subject: string;
  readonly status: AnnualStatus;
  readonly value: string | null;
  /** The value before the annual rounding. */
  readonly exact_value: string | null;
  readonly rounding: AnnualRounding | null;
  readonly consumed: readonly AnnualConsumedPeriod[];
  /** The declared periods that carried no value, excluding exempt ones. */
  readonly missing: readonly string[];
  /** Supplied periods the definition does not cover. */
  readonly ignored: readonly string[];
  readonly flags: readonly AnnualFlag[];
  readonly trace: AnnualTrace;
}

/**
 * One learning area's annual result, with the band the annual value earns.
 *
 * `points` and `grade_points` both carry the band's points: a looked-up band's points are the
 * grade's points, and the two field names keep either declared `value` field resolvable.
 */
export interface AnnualAreaResult extends AnnualSeriesResult {
  readonly code: string;
  readonly group: string | null;
  readonly coefficient: string | null;
  readonly grade: string | null;
  readonly points: string | null;
  readonly grade_points: string | null;
  readonly scale: string | null;
  readonly lookup: ScaleLookupTrace | null;
}

/** The annual aggregate of a learner's year: the overall series and one per learning area. */
export interface AnnualResult {
  readonly status: AnnualStatus;
  /** `annual.average`: the annual aggregate of the period overall results. */
  readonly value: string | null;
  readonly exact_value: string | null;
  readonly rounding: AnnualRounding | null;
  readonly average: AnnualSeriesResult;
  readonly areas: readonly AnnualAreaResult[];
  readonly flags: readonly AnnualFlag[];
  /** The overall series trace; the same object as `average.trace`. */
  readonly trace: AnnualTrace;
}

/** The scales an annual evaluation resolves its optional grading scale against. */
export interface AnnualContext {
  readonly scales?: readonly GradingScaleDefinition[];
  /** Scale code used to grade every annual area result. */
  readonly grading_scale?: string;
}

export type AnnualIssueCode =
  | 'unsupported_op'
  | 'missing_periods'
  | 'invalid_periods'
  | 'duplicate_period'
  | 'invalid_period_value'
  | 'invalid_weights'
  | 'invalid_weight'
  | 'weights_not_unit'
  | 'invalid_n'
  | 'invalid_missing_policy'
  | 'invalid_precision'
  | 'invalid_rounding_mode'
  | 'zero_total_weight'
  | 'invalid_area'
  | 'duplicate_area'
  | 'invalid_area_value'
  | 'invalid_area_coefficient'
  | 'unknown_grading_scale'
  | 'invalid_grading_scale'
  | 'aggregation_failed';

export interface AnnualIssue {
  readonly code: AnnualIssueCode;
  readonly path: string;
  /** A developer diagnostic; never composed for display. */
  readonly detail: string;
}

export type AnnualEvaluation =
  | { readonly ok: true; readonly result: AnnualResult }
  | { readonly ok: false; readonly issues: readonly AnnualIssue[] };

/** The numbers `replayAnnual` recomputes and hands back. */
export interface ReplayedAnnual {
  readonly value: string | null;
  readonly consumed: readonly AnnualConsumedPeriod[];
}

/** The numbers `replayAnnualResult` recomputes: the overall value and each area's value and band. */
export interface ReplayedAnnualResult {
  readonly value: string | null;
  readonly areas: readonly { readonly code: string; readonly value: string | null; readonly grade: string | null }[];
}

// ------------------------------------------------------------- progression

/** The promotion methods spec 03 section 7 names. */
export const PROMOTION_RULES = ['automatic', 'stage_transition', 'threshold', 'class_council'] as const;

export type PromotionRuleKind = (typeof PROMOTION_RULES)[number];

/** The decision when a threshold condition fails (spec 03 section 7). */
export const THRESHOLD_FALLBACKS = ['repeat', 'repeat_or_council'] as const;

export type ThresholdFallback = (typeof THRESHOLD_FALLBACKS)[number];

/** The actions a suggestion can carry; `council` and `blocked` are not decisions, they are referrals. */
export const PROGRESSION_ACTIONS = ['promote', 'repeat', 'council', 'graduate', 'blocked'] as const;

export type ProgressionAction = (typeof PROGRESSION_ACTIONS)[number];

/**
 * What a rule tells the class council to consider.
 *
 * `refer_to_council` is not a recommendation: it records that the rule's own condition did not
 * settle the outcome and the council decides (spec 03 §7 `repeat or council`). Stating `repeat`
 * there would take a decision the council owns.
 */
export const COUNCIL_SUGGESTIONS = ['promote', 'repeat', 'refer_to_council'] as const;

export type CouncilSuggestionOutcome = (typeof COUNCIL_SUGGESTIONS)[number];

/**
 * One declared threshold condition.
 *
 * `gte` is a JSON number in `progression.schema.json`; an exact decimal string is accepted here
 * as the evaluator form of a threshold the schema cannot express exactly.
 */
export interface ProgressionConditionDefinition {
  readonly metric: string;
  readonly gte: number | string;
}

/** One promotion rule from `progression.json` (spec 03 section 7). */
export interface PromotionRuleDefinition {
  readonly levels: readonly string[];
  readonly rule: PromotionRuleKind;
  readonly to_stage?: string;
  /** Records that must exist before a stage transition; any name is looked up in the learner's records. */
  readonly requires?: readonly string[];
  readonly conditions?: readonly ProgressionConditionDefinition[];
  readonly else?: ThresholdFallback;
  readonly suggest?: ProgressionConditionDefinition;
}

/** A terminal level (spec 03 section 7). */
export interface GraduationRuleDefinition {
  readonly levels: readonly string[];
  readonly rule: 'graduate';
}

/** The `progression.json` document. */
export interface ProgressionDefinition {
  readonly progression: readonly PromotionRuleDefinition[];
  readonly graduation?: readonly GraduationRuleDefinition[];
}

/** One condition with its bound as exact text. */
export interface PreparedCondition {
  readonly metric: string;
  readonly gte: string;
}

/** One rule with every field the evaluator reads resolved and its position in the document kept. */
export interface PreparedPromotionRule {
  readonly index: number;
  readonly levels: readonly string[];
  readonly rule: PromotionRuleKind;
  readonly to_stage?: string;
  readonly requires: readonly string[];
  readonly conditions: readonly PreparedCondition[];
  readonly else?: ThresholdFallback;
  readonly suggest?: PreparedCondition;
}

/** A graduation rule, prepared. */
export interface PreparedGraduationRule {
  readonly index: number;
  readonly levels: readonly string[];
  readonly rule: 'graduate';
}

/** A rule of either kind, as a trace records it. */
export type PreparedRule = PreparedPromotionRule | PreparedGraduationRule;

/** The structural facts the evaluator needs: the pack's levels and stages, or a caller's own. */
export interface ProgressionLevel {
  readonly code: string;
  /** The level a learner moves to; absent or null ends the programme. */
  readonly next?: string | null;
}

export interface ProgressionStage {
  readonly code: string;
  readonly levels: readonly string[];
}

/**
 * A metric the caller computed outside the annual aggregator, such as the points total the
 * period-result pipeline derives. Built-in `annual.*` resolution always wins, so a supplied
 * metric can fill a gap but never override the annual result.
 */
export interface SuppliedMetric {
  readonly value?: string | null;
  readonly complete?: boolean;
  /** A developer diagnostic explaining why the value is absent or suspect. */
  readonly detail?: string | null;
}

/** Everything a suggestion may read. The evaluator mutates none of it. */
export interface ProgressionContext {
  readonly annual?: AnnualResult;
  readonly metrics?: Readonly<Record<string, SuppliedMetric>>;
  readonly aggregations?: readonly AggregationDefinition[];
  readonly scales?: readonly GradingScaleDefinition[];
  readonly levels?: readonly ProgressionLevel[];
  readonly stages?: readonly ProgressionStage[];
}

/** One learner to evaluate. */
export interface ProgressionLearner {
  readonly learner: string;
  readonly level: string;
  /** False when the learner's record is known to be incomplete; carried as a flag. */
  readonly complete?: boolean;
  /** Records that exist, by requirement name; a non-empty string also counts as present. */
  readonly requirements?: Readonly<Record<string, boolean | string | null>>;
}

export type MetricSource = 'annual_average' | 'annual_area' | 'annual_aggregation' | 'supplied';

export type MetricUnknownReason =
  | 'no_annual_result'
  | 'annual_empty'
  | 'annual_incomplete'
  | 'unknown_metric'
  | 'unknown_aggregation'
  | 'aggregation_rejected'
  | 'aggregation_incomplete'
  | 'supplied_incomplete'
  | 'invalid_value'
  | 'unsupported_scope';

/** One metric a rule read, with the trace that proves it when the evaluator computed it. */
export interface MetricTrace {
  readonly metric: string;
  readonly value: string | null;
  readonly status: 'resolved' | 'unknown';
  readonly source: MetricSource | null;
  readonly reason: MetricUnknownReason | null;
  /** The issue code that refused a named aggregation, when one did. */
  readonly issue: string | null;
  /** A developer diagnostic; never composed for display. */
  readonly detail: string | null;
  /** The annual series trace the value came from, for replay. */
  readonly annual: AnnualTrace | null;
  /** The aggregation trace the value came from, for replay. */
  readonly aggregate: AggregateTrace | null;
}

export type ProgressionReasonCode =
  | 'rule_automatic'
  | 'rule_threshold'
  | 'rule_class_council'
  | 'rule_stage_transition'
  | 'rule_graduate'
  | 'threshold_met'
  | 'threshold_failed'
  | 'else_repeat'
  | 'else_refer_to_council'
  | 'requirement_met'
  | 'requirement_unmet'
  | 'metric_resolved'
  | 'metric_unknown'
  | 'no_rule'
  | 'target_unknown'
  | 'learner_incomplete'
  | 'annual_incomplete';

/** Why a suggestion came out as it did, identified by code and bound to its metric or requirement. */
export interface ProgressionReason {
  readonly code: ProgressionReasonCode;
  readonly metric: string | null;
  readonly requirement: string | null;
  /** A developer diagnostic; never composed for display. */
  readonly detail: string | null;
}

export type ProgressionFlagCode = 'requirement_unmet' | 'metric_unknown' | 'data_incomplete' | 'no_rule' | 'target_unknown';

/** Something a reviewer must see: a missing record, an unknown metric, incomplete data. */
export interface ProgressionFlag {
  readonly code: ProgressionFlagCode;
  readonly metric: string | null;
  readonly requirement: string | null;
}

/** What the class council is told, never what it decides (spec 03 section 7). */
export interface CouncilSuggestion {
  readonly metric: MetricTrace;
  readonly gte: string;
  /** The outcome when the metric resolved, null when it did not. */
  readonly suggested: CouncilSuggestionOutcome | null;
}

/** The facts a progression trace records, enough to replay the decision without the pack. */
export interface ProgressionTrace {
  readonly learner: string;
  readonly level: string;
  /** The rule that produced the suggestion; null when no rule covers the level. */
  readonly rule: PreparedRule | null;
  /** The would-be destinations the structure offers, recorded so replay needs no structure. */
  readonly targets: { readonly next: string | null; readonly stage: string | null };
  readonly annual_status: AnnualStatus | null;
  readonly learner_complete: boolean;
  readonly requirements: Readonly<Record<string, boolean>>;
  readonly metrics: readonly MetricTrace[];
  readonly action: ProgressionAction;
  /** The level a promotion would enter; null for repeat and graduate. */
  readonly to_level: string | null;
  /** The stage a stage transition would enter; null for every other rule. */
  readonly to_stage: string | null;
  readonly council_suggested: CouncilSuggestionOutcome | null;
  readonly flags: readonly ProgressionFlag[];
  readonly complete: boolean;
}

/**
 * One learner's suggestion.
 *
 * Nothing here is a decision: the promotion run of spec 04 section 6 reviews, overrides with a
 * reason, approves and commits. `complete` is false when the data needed to decide is missing;
 * an unmet requirement makes a transition `blocked` while the data itself is complete.
 */
export interface ProgressionSuggestion {
  readonly learner: string;
  readonly level: string;
  readonly rule: PreparedRule | null;
  readonly action: ProgressionAction;
  readonly to_level: string | null;
  readonly to_stage: string | null;
  readonly metrics: readonly MetricTrace[];
  readonly council: CouncilSuggestion | null;
  readonly reasons: readonly ProgressionReason[];
  readonly flags: readonly ProgressionFlag[];
  readonly complete: boolean;
  readonly trace: ProgressionTrace;
}

export type ProgressionIssueCode =
  | 'invalid_definition'
  | 'invalid_levels'
  | 'invalid_rule'
  | 'duplicate_level'
  | 'invalid_condition'
  | 'invalid_metric'
  | 'invalid_threshold'
  | 'missing_conditions'
  | 'missing_else'
  | 'missing_suggest'
  | 'missing_to_stage'
  | 'invalid_requires'
  | 'invalid_graduation'
  | 'missing_structure'
  | 'unknown_level'
  | 'unknown_stage'
  | 'empty_stage'
  | 'missing_next_level'
  | 'invalid_learner'
  | 'duplicate_learner';

export interface ProgressionIssue {
  readonly code: ProgressionIssueCode;
  readonly path: string;
  /** A developer diagnostic; never composed for display. */
  readonly detail: string;
}

export type ProgressionPreparation =
  | {
      readonly ok: true;
      readonly rules: readonly PreparedPromotionRule[];
      readonly graduation: readonly PreparedGraduationRule[];
      readonly byLevel: ReadonlyMap<string, PreparedPromotionRule | PreparedGraduationRule>;
    }
  | { readonly ok: false; readonly issues: readonly ProgressionIssue[] };

export type ProgressionEvaluation =
  | { readonly ok: true; readonly suggestions: readonly ProgressionSuggestion[] }
  | { readonly ok: false; readonly issues: readonly ProgressionIssue[] };

/** The decision replay recomputes from a suggestion trace. */
export interface ReplayedProgression {
  readonly action: ProgressionAction;
  readonly to_level: string | null;
  readonly to_stage: string | null;
  readonly council_suggested: CouncilSuggestionOutcome | null;
  readonly complete: boolean;
}
