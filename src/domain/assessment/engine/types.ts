// ABOUTME: The typed input, output and explanation-trace shapes of the assessment engine: the
// ABOUTME: scheme a pack contributes, the marks entered against it, and every number and decision
// ABOUTME: the evaluation produced.

import type { RoundingMode } from './exact';

export type { RoundingMode } from './exact';

// ------------------------------------------------------------------ vocabulary

/**
 * The mark status of spec 03 section 9 (`ABS`, `EXM`, `INC`, plus malpractice).
 *
 * `absent` is the not-sat case: the learner did not sit the assessment. `exempt` is a
 * learner the assessment does not apply to, and is excluded from every denominator.
 */
export type MarkStatus = 'present' | 'absent' | 'exempt' | 'incomplete' | 'malpractice';

/**
 * What a slot does with a mark it cannot use (spec 03 section 4).
 *
 * `zero` counts the mark as zero, `exclude` drops the part and renormalises the weights of
 * the parts that remain, `incomplete` drops it and flags the result as having no grade, and
 * `carry_previous` substitutes the value recorded for the same slot in the previous period.
 */
export type MissingPolicy = 'zero' | 'exclude' | 'incomplete' | 'carry_previous';

/** How the marks of a multi-assessment slot combine into one value. */
export type SlotCombine = 'sum' | 'mean' | 'best_of';

/** How the papers of one assessment combine into one value (spec 03 section 4). */
export type ComponentCombine = 'sum' | 'scale_each_then_sum' | 'weighted' | 'best_of';

/** Every combine an evaluation can record; replay treats them as weighted means of fractions. */
export type CombineOp = SlotCombine | ComponentCombine;

/** The points of the evaluation a rounding rule may name (spec 03 section 4). */
export type RoundingStage = 'slot' | 'learning_area_score';

// --------------------------------------------------------------------- scheme

/**
 * One assessment slot of a scheme.
 *
 * `max` is the raw maximum the slot accepts and the contribution it makes when `scale_to` is
 * absent; `scale_to` is the contribution when the slot is worth a different number of marks
 * than it accepts (a CAT out of 20 that counts 30). At least one of them is required.
 */
export interface SchemeSlot {
  readonly code: string;
  readonly label?: string;
  readonly max?: string;
  readonly scale_to?: string;
  /** True when several assessments land in this slot (e.g. three CATs). */
  readonly multi?: boolean;
  /** How a multi slot's assessments combine; defaults to `sum`. */
  readonly combine?: SlotCombine;
  /** How many assessments a `best_of` multi slot keeps. */
  readonly best_of?: number;
  /** True when the slot may be absent without the result being incomplete. */
  readonly optional?: boolean;
}

/** A paper-combination rule shared by every assessment of a scheme that carries components. */
export interface ComponentPolicy {
  readonly papers: ComponentCombine;
  /** The maximum the combined papers are expressed out of; defaults to the sum of weights. */
  readonly out_of?: string;
  /**
   * The weight of each paper, keyed by component code. A missing weight defaults to the
   * paper's `max_score`, which makes `sum` the plain total of the papers.
   */
  readonly weights?: Readonly<Record<string, string>>;
  /** How many papers a `best_of` policy keeps. */
  readonly best_of?: number;
}

/** One rounding rule; at most one per stage. */
export interface RoundingRule {
  readonly stage: RoundingStage;
  readonly precision: number;
  readonly mode: RoundingMode;
}

/** The learning-area total: the slots it is made of and the scale it is reported on. */
export interface LearningAreaScore {
  /** Only `sum` is part of the scheme model (spec 03 section 4); other aggregations live in section 6. */
  readonly op: 'sum';
  /** The slots that make up the total, in the order they are shown; defaults to every slot. */
  readonly of?: readonly string[];
  /** The maximum of the reported total; defaults to the sum of the counted slots' weights. */
  readonly out_of?: string;
}

/** An assessment scheme, as much of it as the evaluation reads. */
export interface SchemeDefinition {
  readonly code: string;
  readonly version?: string;
  readonly slots: readonly SchemeSlot[];
  readonly learning_area_score: LearningAreaScore;
  readonly component_policy?: ComponentPolicy;
  /** The missing policy of each slot, keyed by slot code. */
  readonly missing?: Readonly<Record<string, MissingPolicy>>;
  /** The policy of a slot the map does not name; defaults to `incomplete`. */
  readonly default_missing?: MissingPolicy;
  readonly rounding?: readonly RoundingRule[];
}

// ---------------------------------------------------------------------- marks

/** One entered mark, or the status that says why there is no usable score. */
export interface SchemeMark {
  /** The slot code the mark belongs to. */
  readonly slot: string;
  /** The assessment the mark belongs to; several assessments share a multi slot. */
  readonly assessment: string;
  /** The paper the mark belongs to, when the assessment is split into components. */
  readonly component?: string;
  /** The score as entered, a decimal string (`'18.5'`), never a float. */
  readonly score?: string;
  /** The assessment's own maximum, a decimal string. */
  readonly max_score?: string;
  readonly status: MarkStatus;
}

/** A value carried from the previous period for a slot under the `carry_previous` policy. */
export interface CarriedSlotValue {
  /** The raw score on the slot's own scale. */
  readonly raw: string;
  /** The raw maximum the carried score was expressed out of. */
  readonly max: string;
  /** The carried value of each paper, for a slot whose marks carry components. */
  readonly components?: Readonly<Record<string, CarriedComponentValue>>;
}

export interface CarriedComponentValue {
  readonly score: string;
  readonly max_score: string;
}

/** Everything the evaluation reads: the scheme, the learner's marks and any carried values. */
export interface SchemeEvaluationInput {
  readonly scheme: SchemeDefinition;
  readonly marks: readonly SchemeMark[];
  readonly carry_previous?: Readonly<Record<string, CarriedSlotValue>>;
}

// --------------------------------------------------------------------- trace

/** A raw mark as entered: the leaf of a trace. */
export interface MarkTrace {
  readonly kind: 'mark';
  readonly slot: string;
  readonly assessment: string;
  readonly component?: string;
  readonly status: MarkStatus;
  /** The score exactly as it was entered. */
  readonly entered: string;
  /** The assessment maximum the entered score is out of. */
  readonly max: string;
  readonly value: string;
}

/** A value the engine supplied itself: a zeroed mark or a carried previous value. */
export interface ConstantTrace {
  readonly kind: 'constant';
  readonly reason: 'zero' | 'carry_previous';
  readonly value: string;
  readonly source?: {
    readonly score: string;
    readonly max_score: string;
  };
}

/** A value divided by its maximum, so it can be combined with values of another scale. */
export interface FractionTrace {
  readonly kind: 'fraction';
  readonly input: TraceNode;
  readonly max: string;
  readonly value: string;
}

export interface CombinePart {
  /** The assessment or component code the part came from; also the `best_of` tie-break. */
  readonly key: string;
  /** A `fraction` node, valued between zero and one for an in-range mark. */
  readonly part: TraceNode;
  /** The part's share of the combine, as an exact value. */
  readonly weight: string;
}

/**
 * A weighted mean of part fractions - the one formula behind every combine mode.
 *
 * `max` is the sum of the weights, so `value / max` is the combined fraction. `sum` weights
 * each part by its maximum (the plain total of the papers); `mean` and `best_of` weight the
 * parts equally; `weighted` and `scale_each_then_sum` use the scheme's declared weights.
 * `best_of` also records the keys it kept, in the combine's output order.
 */
export interface CombineTrace {
  readonly kind: 'combine';
  readonly op: CombineOp;
  readonly parts: readonly CombinePart[];
  readonly max: string;
  readonly best_of?: number;
  readonly selected?: readonly string[];
  readonly value: string;
}

/** A value multiplied by a weight over its own scale: a slot's contribution to the total. */
export interface ScaleTrace {
  readonly kind: 'scale';
  readonly input: TraceNode;
  readonly from: string;
  readonly to: string;
  readonly value: string;
}

/** The exact sum of the counted slots' contributions. */
export interface SumTrace {
  readonly kind: 'sum';
  readonly parts: readonly TraceNode[];
  readonly value: string;
}

/** `input / by * of`: the counted contributions renormalised onto the reported maximum. */
export interface RatioTrace {
  readonly kind: 'ratio';
  readonly input: TraceNode;
  readonly by: string;
  readonly of: string;
  readonly value: string;
}

/** The one rounding applied at a stage, or the identity when no rule names the stage. */
export interface RoundTrace {
  readonly kind: 'round';
  readonly input: TraceNode;
  readonly stage: RoundingStage;
  readonly precision: number;
  readonly mode: RoundingMode;
  readonly applied: boolean;
  readonly value: string;
}

/** The total as a percentage of its maximum. */
export interface PercentTrace {
  readonly kind: 'percent';
  readonly input: TraceNode;
  readonly out_of: string;
  readonly value: string;
}

export type TraceNode =
  | MarkTrace
  | ConstantTrace
  | FractionTrace
  | CombineTrace
  | ScaleTrace
  | SumTrace
  | RatioTrace
  | RoundTrace
  | PercentTrace;

/** `counted` contributes; the others are why a slot, or a whole result, has no value. */
export type SlotOutcome = 'counted' | 'optional_absent' | 'excluded' | 'exempt';

/** What happened to one assessment's marks within a slot. */
export type PartDecision = 'counted' | 'dropped' | 'exempt';

/** One assessment that reached, or was dropped from, a slot's combination. */
export interface SlotPartTrace {
  readonly assessment: string;
  readonly decision: PartDecision;
  /** The status of the mark that decided the assessment, or `present` when it is counted. */
  readonly status: MarkStatus;
  /** The assessment's combined score and maximum, when counted. */
  readonly score: string | null;
  readonly max: string | null;
  readonly fraction: string | null;
  /** The tree that produced `score`, or the mark that was dropped. */
  readonly trace: TraceNode | null;
}

/** What the missing policy did with one unusable mark. */
export interface MissingDecision {
  readonly assessment: string;
  readonly component: string | null;
  readonly status: MarkStatus;
  readonly policy: MissingPolicy;
  readonly applied: 'zero' | 'excluded' | 'incomplete' | 'carried' | 'carry_unavailable';
}

/** The full explanation of one slot. */
export interface SlotTrace {
  readonly slot: string;
  readonly outcome: SlotOutcome;
  /** The policy that governed the unusable marks of the slot; null when none was unusable. */
  readonly policy: MissingPolicy | null;
  /** The slot's declared raw maximum, when it declared one. */
  readonly slot_max: string | null;
  /** The slot's contribution to the total; null when it did not contribute. */
  readonly weight: string | null;
  readonly parts: readonly SlotPartTrace[];
  readonly missing: readonly MissingDecision[];
  /** The combined score of the counted parts, on the combined maximum. */
  readonly combine: CombineTrace | null;
  /** The slot's value as a fraction of its maximum; a `round` may sit between it and `combine`. */
  readonly fraction: TraceNode | null;
  /** The fraction multiplied by the slot's weight. */
  readonly contribution: TraceNode | null;
}

/** The explanation of the whole result; `replaySchemeTrace` recomputes every number in it. */
export interface SchemeTrace {
  readonly scheme_code: string;
  readonly scheme_version: string | null;
  readonly slots: readonly SlotTrace[];
  readonly total: TraceNode | null;
  readonly percent: TraceNode | null;
  readonly out_of: string;
  /** The sum of the weights that contributed. */
  readonly counted_weight: string;
  /** The sum of the weights of every slot the scheme includes, counted or not. */
  readonly declared_weight: string;
}

// -------------------------------------------------------------------- result

export type SchemeStatus = 'complete' | 'incomplete' | 'exempt';

/** The rounding that was applied at a stage, exactly once; null when the stage had no rule. */
export interface RoundingRecord {
  readonly stage: RoundingStage;
  readonly precision: number;
  readonly mode: RoundingMode;
  readonly input: string;
  readonly output: string;
}

/** One slot's result, with the decisions that produced it. */
export interface SlotResult {
  readonly slot: string;
  readonly label: string | null;
  readonly outcome: SlotOutcome;
  readonly policy: MissingPolicy | null;
  /** The score on the slot's declared maximum, when it declared one. */
  readonly raw: string | null;
  readonly raw_max: string | null;
  readonly fraction: string | null;
  readonly weight: string | null;
  readonly contribution: string | null;
  readonly rounding: RoundingRecord | null;
  readonly missing: readonly MissingDecision[];
}

/** Something a caller may need to show or act on, identified by code, never by prose. */
export type EngineFlagCode =
  | 'mark_missing'
  | 'carried_previous'
  | 'carry_unavailable'
  | 'exempt'
  | 'malpractice'
  | 'optional_slot_absent';

export interface EngineFlag {
  readonly code: EngineFlagCode;
  readonly slot: string;
  readonly assessment?: string;
  readonly component?: string;
}

/** A deterministic evaluation: exact numbers, the decisions behind them and their trace. */
export interface SchemeResult {
  readonly scheme: {
    readonly code: string;
    readonly version: string | null;
  };
  /**
   * `complete` when every required slot produced a value, `incomplete` when a mark is missing
   * under the `incomplete` policy (or nothing could be counted), `exempt` when every slot was
   * exempted. Only `complete` may be graded and published.
   */
  readonly status: SchemeStatus;
  /** The total after the declared `learning_area_score` rounding; null when nothing counted. */
  readonly total: string | null;
  /** The total before that rounding. */
  readonly exact_total: string | null;
  readonly out_of: string;
  readonly percent: string | null;
  readonly rounding: RoundingRecord | null;
  readonly slots: readonly SlotResult[];
  readonly flags: readonly EngineFlag[];
  readonly trace: SchemeTrace;
}

/** Why the engine refused a scheme or a mark; `path` names the field at fault. */
export type EngineIssueCode =
  | 'empty_slots'
  | 'duplicate_slot'
  | 'slot_without_scale'
  | 'invalid_slot_max'
  | 'invalid_scale_to'
  | 'invalid_slot_combine'
  | 'invalid_best_of'
  | 'unsupported_op'
  | 'unknown_slot_in_score'
  | 'duplicate_slot_in_score'
  | 'invalid_out_of'
  | 'unknown_rounding_stage'
  | 'duplicate_rounding_stage'
  | 'invalid_precision'
  | 'invalid_rounding_mode'
  | 'unknown_slot_in_missing'
  | 'invalid_missing_policy'
  | 'invalid_mark_status'
  | 'invalid_component_policy'
  | 'invalid_component_weight'
  | 'mark_unknown_slot'
  | 'mark_slot_not_in_score'
  | 'duplicate_mark'
  | 'missing_max_score'
  | 'invalid_max_score'
  | 'missing_score'
  | 'invalid_score'
  | 'score_out_of_range'
  | 'component_without_policy'
  | 'multiple_assessments_in_single_slot'
  | 'invalid_carried_value';

export interface EngineIssue {
  readonly code: EngineIssueCode;
  /** A field path such as `slots[2].max` or `marks[1].score`. */
  readonly path: string;
  /** A developer diagnostic; never composed for display. */
  readonly detail: string;
}

export type SchemeEvaluation =
  | { readonly ok: true; readonly result: SchemeResult }
  | { readonly ok: false; readonly issues: readonly EngineIssue[] };

/** The numbers `replaySchemeTrace` recomputes and hands back. */
export interface ReplayedSchemeTrace {
  readonly total: string | null;
  readonly percent: string | null;
  readonly slots: ReadonlyMap<string, { readonly fraction: string | null; readonly contribution: string | null }>;
}
