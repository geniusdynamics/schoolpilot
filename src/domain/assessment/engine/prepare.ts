// ABOUTME: Validation and preparation for a scheme evaluation: turns the pack's JSON-shaped scheme
// ABOUTME: and marks into parsed exact values plus a typed issue list, so the evaluator never has
// ABOUTME: to re-parse text or guess at an invalid field.

import {
  MAX_PRECISION,
  ROUNDING_MODES,
  compareExact,
  isNegativeExact,
  isZeroExact,
  parseExact,
  type Exact,
  type RoundingMode,
} from './exact';
import type {
  CarriedSlotValue,
  ComponentCombine,
  EngineIssue,
  EngineIssueCode,
  MarkStatus,
  MissingPolicy,
  RoundingStage,
  SchemeEvaluationInput,
  SchemeMark,
  SchemeSlot,
  SlotCombine,
} from './types';

export const SLOT_COMBINES: readonly SlotCombine[] = ['sum', 'mean', 'best_of'];
export const COMPONENT_COMBINES: readonly ComponentCombine[] = [
  'sum',
  'scale_each_then_sum',
  'weighted',
  'best_of',
];
export const MISSING_POLICIES: readonly MissingPolicy[] = [
  'zero',
  'exclude',
  'incomplete',
  'carry_previous',
];
export const MARK_STATUSES: readonly MarkStatus[] = [
  'present',
  'absent',
  'exempt',
  'incomplete',
  'malpractice',
];
export const ROUNDING_STAGES: readonly RoundingStage[] = ['slot', 'learning_area_score'];

export interface PreparedRounding {
  readonly precision: number;
  readonly mode: RoundingMode;
}

export interface PreparedComponentPolicy {
  readonly papers: ComponentCombine;
  readonly outOf: Exact | null;
  readonly weights: ReadonlyMap<string, Exact>;
  readonly bestOf: number | null;
}

export interface PreparedSlot {
  readonly code: string;
  readonly label: string | null;
  readonly max: Exact | null;
  readonly scaleTo: Exact | null;
  /** The slot's contribution when it is counted: `scale_to`, else its raw maximum. */
  readonly weight: Exact;
  readonly multi: boolean;
  readonly combine: SlotCombine;
  readonly bestOf: number | null;
  readonly optional: boolean;
  /** The position of the slot in the scheme, used to order issues and flags. */
  readonly index: number;
}

export interface PreparedCarry {
  readonly raw: Exact;
  readonly max: Exact;
  readonly components: ReadonlyMap<string, { readonly score: Exact; readonly max: Exact }>;
}

export interface PreparedScheme {
  readonly code: string;
  readonly version: string | null;
  readonly slots: readonly PreparedSlot[];
  readonly included: readonly PreparedSlot[];
  readonly outOf: Exact | null;
  readonly missing: ReadonlyMap<string, MissingPolicy>;
  readonly defaultMissing: MissingPolicy;
  readonly rounding: ReadonlyMap<RoundingStage, PreparedRounding>;
  readonly componentPolicy: PreparedComponentPolicy | null;
  readonly carry: ReadonlyMap<string, PreparedCarry>;
}

/** A mark together with the position it had in the caller's array, for issue paths. */
export interface IndexedMark {
  readonly index: number;
  readonly mark: SchemeMark;
}

export interface PreparedInput {
  readonly prepared: PreparedScheme;
  readonly marks: readonly IndexedMark[];
}

export type PrepareResult =
  | { readonly ok: true; readonly value: PreparedInput }
  | { readonly ok: false; readonly issues: readonly EngineIssue[] };

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  values.some((candidate) => candidate === value);

const isPositive = (value: Exact): boolean => !isNegativeExact(value) && !isZeroExact(value);

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Sorts marks into a canonical order: the scheme's slot order, then assessment, then paper. */
function canonicalise(
  marks: readonly SchemeMark[],
  order: ReadonlyMap<string, number>
): IndexedMark[] {
  return marks
    .map((mark, index) => ({ index, mark }))
    .sort((left, right) => {
      const leftSlot = order.get(left.mark.slot) ?? Number.MAX_SAFE_INTEGER;
      const rightSlot = order.get(right.mark.slot) ?? Number.MAX_SAFE_INTEGER;
      if (leftSlot !== rightSlot) return leftSlot - rightSlot;
      return (
        compareText(left.mark.slot, right.mark.slot) ||
        compareText(left.mark.assessment, right.mark.assessment) ||
        compareText(left.mark.component ?? '', right.mark.component ?? '') ||
        left.index - right.index
      );
    });
}

/**
 * Validates a scheme and its marks and prepares the exact values the evaluator needs.
 *
 * Every problem is collected, never thrown; the caller gets either the prepared input or the
 * complete list of issues. Scheme problems stop the check before the marks, because a slot
 * the scheme does not declare makes a mark's path ambiguous.
 */
export function prepareEvaluation(input: SchemeEvaluationInput): PrepareResult {
  const issues: EngineIssue[] = [];
  const add = (code: EngineIssueCode, path: string, detail: string): void => {
    issues.push({ code, path, detail });
  };

  const decimal = (
    text: string | undefined,
    path: string,
    code: EngineIssueCode,
    positive: boolean
  ): Exact | null => {
    if (text === undefined) return null;
    const value = parseExact(text);
    if (value === null || (positive && !isPositive(value))) {
      add(code, path, `${JSON.stringify(text)} is not ${positive ? 'a positive' : 'a'} decimal`);
      return null;
    }
    return value;
  };

  // ------------------------------------------------------------------ slots
  const scheme = input.scheme;
  if (scheme.slots.length === 0) {
    add('empty_slots', 'scheme.slots', 'a scheme needs at least one slot');
  }

  const declared = new Map<string, PreparedSlot>();
  const slots: PreparedSlot[] = scheme.slots.map((slot: SchemeSlot, index) => {
    const path = `scheme.slots[${index}]`;
    if (slot.code === '') add('empty_slots', `${path}.code`, 'a slot code cannot be empty');
    if (declared.has(slot.code)) {
      add('duplicate_slot', `${path}.code`, `the slot ${JSON.stringify(slot.code)} is declared twice`);
    }
    const max = decimal(slot.max, `${path}.max`, 'invalid_slot_max', true);
    const scaleTo = decimal(slot.scale_to, `${path}.scale_to`, 'invalid_scale_to', true);
    if (slot.max === undefined && slot.scale_to === undefined) {
      add('slot_without_scale', path, 'a slot needs a max, a scale_to, or both');
    }
    if (slot.combine !== undefined && !isOneOf(SLOT_COMBINES, slot.combine)) {
      add('invalid_slot_combine', `${path}.combine`, `unknown combine ${JSON.stringify(slot.combine)}`);
    }
    const multi = slot.multi === true;
    const combine = slot.combine ?? 'sum';
    const bestOf = slot.best_of;
    if (combine === 'best_of' && (bestOf === undefined || !Number.isInteger(bestOf) || bestOf < 1)) {
      add('invalid_best_of', `${path}.best_of`, 'a best_of combine needs a positive whole count');
    }
    const prepared: PreparedSlot = {
      code: slot.code,
      label: slot.label ?? null,
      max,
      scaleTo,
      weight: scaleTo ?? max ?? { numerator: 1n, denominator: 1n },
      multi,
      combine,
      bestOf: bestOf !== undefined && Number.isInteger(bestOf) && bestOf >= 1 ? bestOf : null,
      optional: slot.optional === true,
      index,
    };
    if (!declared.has(slot.code)) declared.set(slot.code, prepared);
    return prepared;
  });

  // -------------------------------------------------------- learning area
  if (scheme.learning_area_score.op !== 'sum') {
    add('unsupported_op', 'scheme.learning_area_score.op', 'only the sum operator is part of the scheme model');
  }
  const outOf = decimal(
    scheme.learning_area_score.out_of,
    'scheme.learning_area_score.out_of',
    'invalid_out_of',
    true
  );
  const declaredOf = scheme.learning_area_score.of;
  if (declaredOf !== undefined && declaredOf.length === 0) {
    add('empty_slots', 'scheme.learning_area_score.of', 'the score must name at least one slot');
  }
  const includedCodes =
    declaredOf !== undefined && declaredOf.length > 0
      ? declaredOf
      : scheme.slots.map((slot) => slot.code);
  const seenIncluded = new Set<string>();
  for (const code of includedCodes) {
    if (!declared.has(code)) {
      add('unknown_slot_in_score', 'scheme.learning_area_score.of', `the scheme has no slot ${JSON.stringify(code)}`);
    } else if (seenIncluded.has(code)) {
      add('duplicate_slot_in_score', 'scheme.learning_area_score.of', `the slot ${JSON.stringify(code)} is named twice`);
    }
    seenIncluded.add(code);
  }
  const included = includedCodes
    .map((code) => declared.get(code))
    .filter((slot): slot is PreparedSlot => slot !== undefined);
  const includedSet = new Set(included.map((slot) => slot.code));

  // -------------------------------------------------------------- rounding
  const rounding = new Map<RoundingStage, PreparedRounding>();
  for (const [index, rule] of (scheme.rounding ?? []).entries()) {
    const path = `scheme.rounding[${index}]`;
    if (!isOneOf(ROUNDING_STAGES, rule.stage)) {
      add('unknown_rounding_stage', `${path}.stage`, `unknown stage ${JSON.stringify(rule.stage)}`);
      continue;
    }
    if (rounding.has(rule.stage)) {
      add('duplicate_rounding_stage', `${path}.stage`, `the stage ${JSON.stringify(rule.stage)} has two rules`);
      continue;
    }
    if (!Number.isInteger(rule.precision) || rule.precision < 0 || rule.precision > MAX_PRECISION) {
      add('invalid_precision', `${path}.precision`, `precision must be a whole number from 0 to ${MAX_PRECISION}`);
      continue;
    }
    if (!isOneOf(ROUNDING_MODES, rule.mode)) {
      add('invalid_rounding_mode', `${path}.mode`, `unknown rounding mode ${JSON.stringify(rule.mode)}`);
      continue;
    }
    rounding.set(rule.stage, { precision: rule.precision, mode: rule.mode });
  }

  // --------------------------------------------------------- missing policy
  const missing = new Map<string, MissingPolicy>();
  for (const [code, policy] of Object.entries(scheme.missing ?? {})) {
    const path = `scheme.missing.${code}`;
    if (!declared.has(code)) {
      add('unknown_slot_in_missing', path, `the scheme has no slot ${JSON.stringify(code)}`);
    }
    if (!isOneOf(MISSING_POLICIES, policy)) {
      add('invalid_missing_policy', path, `unknown missing policy ${JSON.stringify(policy)}`);
      continue;
    }
    missing.set(code, policy);
  }
  const defaultMissing = scheme.default_missing ?? 'incomplete';
  if (scheme.default_missing !== undefined && !isOneOf(MISSING_POLICIES, scheme.default_missing)) {
    add('invalid_missing_policy', 'scheme.default_missing', `unknown missing policy ${JSON.stringify(scheme.default_missing)}`);
  }

  // ------------------------------------------------------- component policy
  let componentPolicy: PreparedComponentPolicy | null = null;
  if (scheme.component_policy !== undefined) {
    const policy = scheme.component_policy;
    const path = 'scheme.component_policy';
    const bestOf = policy.best_of;
    if (!isOneOf(COMPONENT_COMBINES, policy.papers)) {
      add('invalid_component_policy', `${path}.papers`, `unknown paper combine ${JSON.stringify(policy.papers)}`);
    }
    if (policy.papers === 'best_of' && (bestOf === undefined || !Number.isInteger(bestOf) || bestOf < 1)) {
      add('invalid_best_of', `${path}.best_of`, 'a best_of policy needs a positive whole count');
    }
    const weights = new Map<string, Exact>();
    for (const [code, weight] of Object.entries(policy.weights ?? {})) {
      const parsed = decimal(weight, `${path}.weights.${code}`, 'invalid_component_weight', true);
      if (parsed !== null) weights.set(code, parsed);
    }
    componentPolicy = {
      papers: policy.papers,
      outOf: decimal(policy.out_of, `${path}.out_of`, 'invalid_out_of', true),
      weights,
      bestOf: bestOf !== undefined && Number.isInteger(bestOf) && bestOf >= 1 ? bestOf : null,
    };
  }

  if (issues.length > 0) return { ok: false, issues };

  // ------------------------------------------------------- carried values
  const carry = new Map<string, PreparedCarry>();
  for (const [code, carried] of Object.entries(input.carry_previous ?? {})) {
    const preparedCarry = prepareCarry(code, carried, `carry_previous.${code}`, declared, add);
    if (preparedCarry !== null) carry.set(code, preparedCarry);
  }

  // ----------------------------------------------------------------- marks
  const order = new Map<string, number>(slots.map((slot) => [slot.code, slot.index]));
  const marks = canonicalise(input.marks, order);
  const seenMarks = new Set<string>();
  const assessmentsBySlot = new Map<string, Set<string>>();

  for (const { index, mark } of marks) {
    const path = `marks[${index}]`;
    const slot = declared.get(mark.slot);
    if (slot === undefined) {
      add('mark_unknown_slot', `${path}.slot`, `the scheme has no slot ${JSON.stringify(mark.slot)}`);
    } else if (!includedSet.has(mark.slot)) {
      add('mark_slot_not_in_score', `${path}.slot`, `the slot ${JSON.stringify(mark.slot)} is not part of the score`);
    }
    if (!isOneOf(MARK_STATUSES, mark.status)) {
      add('invalid_mark_status', `${path}.status`, `unknown mark status ${JSON.stringify(mark.status)}`);
    }
    if (mark.component !== undefined && componentPolicy === null) {
      add('component_without_policy', `${path}.component`, 'a mark with a component needs a component_policy');
    }

    const key = `${mark.slot}\u0000${mark.assessment}\u0000${mark.component ?? ''}`;
    if (seenMarks.has(key)) {
      add('duplicate_mark', path, `the mark for ${JSON.stringify(mark.assessment)} in ${JSON.stringify(mark.slot)} appears twice`);
    }
    seenMarks.add(key);

    const seenAssessments = assessmentsBySlot.get(mark.slot) ?? new Set<string>();
    seenAssessments.add(mark.assessment);
    assessmentsBySlot.set(mark.slot, seenAssessments);

    let score: Exact | null = null;
    if (mark.status === 'present') {
      if (mark.score === undefined) {
        add('missing_score', `${path}.score`, 'a present mark needs a score');
      } else {
        score = decimal(mark.score, `${path}.score`, 'invalid_score', false);
      }
    } else if (mark.score !== undefined) {
      score = decimal(mark.score, `${path}.score`, 'invalid_score', false);
    }

    const max = decimal(mark.max_score, `${path}.max_score`, 'invalid_max_score', true);
    if (mark.max_score === undefined && mark.status === 'present') {
      add('missing_max_score', `${path}.max_score`, 'a present mark needs the assessment maximum');
    }
    const policy = missing.get(mark.slot) ?? defaultMissing;
    if (mark.max_score === undefined && policy === 'zero') {
      add('missing_max_score', `${path}.max_score`, 'the zero policy needs the assessment maximum to weight the zero');
    }
    if (score !== null && max !== null && (isNegativeExact(score) || compareExact(score, max) > 0)) {
      add('score_out_of_range', `${path}.score`, `the score must be between 0 and ${mark.max_score ?? ''}`);
    }
  }

  for (const [code, assessments] of assessmentsBySlot) {
    const slot = declared.get(code);
    if (slot !== undefined && assessments.size > 1 && !slot.multi) {
      add(
        'multiple_assessments_in_single_slot',
        `scheme.slots[${slot.index}]`,
        `${assessments.size} assessments share a slot that is not multi`
      );
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    value: {
      prepared: {
        code: scheme.code,
        version: scheme.version ?? null,
        slots,
        included,
        outOf,
        missing,
        defaultMissing,
        rounding,
        componentPolicy,
        carry,
      },
      marks,
    },
  };
}

function prepareCarry(
  code: string,
  carried: CarriedSlotValue,
  path: string,
  declared: ReadonlyMap<string, PreparedSlot>,
  add: (code: EngineIssueCode, path: string, detail: string) => void
): PreparedCarry | null {
  const raw = parseExact(carried.raw);
  const max = parseExact(carried.max);
  if (raw === null || max === null || !isPositive(max) || isNegativeExact(raw)) {
    add('invalid_carried_value', path, 'a carried value needs a score and a positive maximum');
    return null;
  }
  if (compareExact(raw, max) > 0) {
    add('invalid_carried_value', `${path}.raw`, 'the carried score exceeds its maximum');
    return null;
  }
  if (!declared.has(code)) {
    add('invalid_carried_value', path, 'the carried value names a slot the scheme does not declare');
  }
  const components = new Map<string, { readonly score: Exact; readonly max: Exact }>();
  for (const [code, component] of Object.entries(carried.components ?? {})) {
    const score = parseExact(component.score);
    const maxScore = parseExact(component.max_score);
    if (
      score === null ||
      maxScore === null ||
      !isPositive(maxScore) ||
      isNegativeExact(score) ||
      score.numerator > maxScore.numerator
    ) {
      add('invalid_carried_value', `${path}.components.${code}`, 'the carried paper needs a score within its maximum');
      continue;
    }
    components.set(code, { score, max: maxScore });
  }
  return { raw, max, components };
}
