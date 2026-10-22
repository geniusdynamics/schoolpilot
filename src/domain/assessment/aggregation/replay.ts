// ABOUTME: Replay for an aggregation trace: recomputes every step from the operands the trace
// ABOUTME: recorded and refuses a stored number that disagrees with them, so a result nobody can
// ABOUTME: audit fails loudly instead of being trusted.

import {
  ONE,
  TraceMismatchError,
  compareExact,
  divideExact,
  formatExact,
  multiplyExact,
  parseExact,
  roundExact,
  sumExact,
  type Exact,
} from '../engine';
import { replayScaleLookup } from '../scales';
import { selectBest, type SelectionCandidate } from './select';
import type {
  AggregateTrace,
  AggregateTraceStep,
  CountPredicate,
  DivisorSource,
  LearningAreaResult,
  LevelCount,
  PreparedAggregation,
  ProfilePart,
  ReplayedAggregate,
  ResultValueField,
  SelectionDecision,
} from './types';

function readExact(path: string, text: string): Exact {
  const value = parseExact(text);
  if (value === null) {
    throw new TraceMismatchError(path, 'an exact decimal or fraction', text);
  }
  return value;
}

function checkValue(path: string, recorded: string, recomputed: Exact): Exact {
  const expected = readExact(path, recorded);
  if (compareExact(expected, recomputed) !== 0) {
    throw new TraceMismatchError(path, formatExact(expected), formatExact(recomputed));
  }
  return expected;
}

function checkText(path: string, recorded: string | null, recomputed: string | null): void {
  if (recorded !== recomputed) {
    throw new TraceMismatchError(path, String(recorded), String(recomputed));
  }
}

function checkBoolean(path: string, recorded: boolean, recomputed: boolean): void {
  if (recorded !== recomputed) {
    throw new TraceMismatchError(path, String(recorded), String(recomputed));
  }
}

function sameList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

/** The multiplier the recorded definition declares for one area, one when it declares none. */
function multiplierFor(definition: PreparedAggregation, code: string): Exact {
  const text = definition.multipliers?.[code];
  return text === undefined ? ONE : (parseExact(text) as Exact);
}

/**
 * Checks the divisor a combine step recorded against the definition that produced it.
 *
 * A declared divisor must be the definition's own; `sum_of_multipliers` must be the total of the
 * multipliers the parts actually carry; a natural divisor (`count`, `one` or `weights`) must be the
 * operator's own and must not be claimed when the definition declared one.
 */
function checkDivisor(
  path: string,
  recorded: string,
  source: DivisorSource,
  multipliers: readonly Exact[],
  natural: Exact,
  definition: PreparedAggregation
): Exact {
  if (source === 'declared') {
    const declared = definition.divisor;
    if (declared === undefined || declared === 'sum_of_multipliers') {
      throw new TraceMismatchError(`${path}.divisor_from`, 'a declared divisor', source);
    }
    return checkValue(`${path}.divisor`, recorded, readExact(`${path}.divisor`, declared));
  }
  if (source === 'sum_of_multipliers') {
    if (definition.divisor !== 'sum_of_multipliers') {
      throw new TraceMismatchError(`${path}.divisor_from`, 'sum_of_multipliers', String(definition.divisor));
    }
    return checkValue(`${path}.divisor`, recorded, sumExact(multipliers));
  }
  if (definition.divisor !== undefined) {
    throw new TraceMismatchError(`${path}.divisor_from`, 'no declared divisor', String(definition.divisor));
  }
  return checkValue(`${path}.divisor`, recorded, natural);
}

/** The value the input carries for the field the definition names, as exact text. */
function recordedValue(input: LearningAreaResult, field: ResultValueField): string | null {
  const raw =
    field === 'grade'
      ? input.grade
      : field === 'points'
        ? input.points
        : field === 'grade_points'
          ? input.grade_points
          : field === 'rubric_level'
            ? input.rubric_level
            : input.score;
  if (raw === undefined) return null;
  if (field === 'grade') return raw;
  const exact = parseExact(raw);
  return exact === null ? null : formatExact(exact);
}

/** Recomputes the predicate's verdict from its operands, independently of the evaluator. */
function matches(predicate: CountPredicate, text: string | null, exact: Exact | null): boolean {
  if (text === null) return false;
  if (predicate.op === 'eq') return text === predicate.value;
  if (predicate.op === 'in') return predicate.values?.includes(text) === true;
  if (exact === null || predicate.value === undefined) return false;
  const bound = parseExact(predicate.value);
  if (bound === null) return false;
  const order = compareExact(exact, bound);
  if (predicate.op === 'gte') return order >= 0;
  if (predicate.op === 'gt') return order > 0;
  if (predicate.op === 'lte') return order <= 0;
  return order < 0;
}

function replaySelect(step: Extract<AggregateTraceStep, { kind: 'select' }>, path: string): Exact {
  const candidates: SelectionCandidate[] = step.decisions.map((decision: SelectionDecision) => ({
    code: decision.code,
    group: decision.group,
    value: decision.value === null ? null : readExact(`${path}.decisions[${decision.code}].value`, decision.value),
  }));
  const selection = selectBest({ candidates, groups: step.groups, n: step.n });
  if (!sameList(selection.selected, step.selected)) {
    throw new TraceMismatchError(
      `${path}.selected`,
      `[${step.selected.join(', ')}]`,
      `[${selection.selected.join(', ')}]`
    );
  }
  const value = checkValue(`${path}.value`, step.value, selection.value);
  for (const decision of step.decisions) {
    const recomputed = selection.decisions.find((entry) => entry.code === decision.code);
    if (recomputed === undefined) {
      throw new TraceMismatchError(`${path}.decisions[${decision.code}]`, 'a decision', 'nothing');
    }
    checkBoolean(`${path}.decisions[${decision.code}].selected`, decision.selected, recomputed.selected);
    checkText(`${path}.decisions[${decision.code}].reason`, decision.reason, recomputed.reason);
    checkText(`${path}.decisions[${decision.code}].lost_to`, decision.lost_to, recomputed.lost_to);
  }
  return value;
}

function replayProfile(
  step: Extract<AggregateTraceStep, { kind: 'profile' }>,
  path: string
): readonly LevelCount[] {
  const keyOf = (part: ProfilePart): string => part.band ?? part.level;
  const levels = [...new Set(step.parts.map(keyOf))];
  const counts = step.counts.map((entry, index) => {
    const recomputed = step.parts.filter((part) => keyOf(part) === entry.level).length;
    if (recomputed !== entry.count) {
      throw new TraceMismatchError(`${path}.counts[${index}].count`, String(entry.count), String(recomputed));
    }
    return { level: entry.level, label: entry.label, count: recomputed };
  });
  for (const level of levels) {
    if (!counts.some((entry) => entry.level === level)) {
      throw new TraceMismatchError(`${path}.counts`, `a count for level "${level}"`, 'nothing');
    }
  }
  return counts;
}

/**
 * Recomputes an aggregation from its trace alone.
 *
 * Every step is checked against its own operands: the selection re-runs from the decisions it
 * recorded, each combine re-adds its parts, the rounding re-rounds, the lookup replays its own
 * boundary checks and the cap re-applies the rule. Inputs are cross-checked too, so a trace whose
 * parts do not match the learning-area results it claims to have read is refused.
 */
export function replayAggregate(trace: AggregateTrace): ReplayedAggregate {
  const field = trace.definition.value;
  if (field === undefined && trace.steps.length > 0) {
    throw new TraceMismatchError('definition.value', 'a value field', 'nothing');
  }
  const byCode = new Map(trace.inputs.map((input) => [input.code, input]));
  let running: Exact | null = null;
  let distribution: readonly LevelCount[] = [];

  trace.steps.forEach((step, index) => {
    const path = `steps[${index}]`;
    switch (step.kind) {
      case 'select': {
        running = replaySelect(step, path);
        return;
      }
      case 'sum':
      case 'mean': {
        const bases = step.parts.map((part, at) => readExact(`${path}.parts[${at}].value`, part.value));
        const multipliers = step.parts.map((part, at) => readExact(`${path}.parts[${at}].multiplier`, part.multiplier));
        const multiplied = step.parts.map((part, at) => {
          const expected = multiplyExact(bases[at], multipliers[at]);
          checkValue(`${path}.parts[${at}].multiplied`, part.multiplied, expected);
          return expected;
        });
        for (const [at, part] of step.parts.entries()) {
          const input = byCode.get(part.code);
          if (input === undefined) {
            throw new TraceMismatchError(`${path}.parts[${at}].code`, 'a recorded input', part.code);
          }
          if (field !== undefined) {
            checkText(`${path}.parts[${at}].value`, part.value, recordedValue(input, field));
          }
          checkValue(`${path}.parts[${at}].multiplier`, part.multiplier, multiplierFor(trace.definition, part.code));
        }
        // The select step's value is the sum of the selected areas' own values, so the check that
        // the combine matches the selection uses the base values, never the multiplied ones.
        const total = sumExact(bases);
        if (running !== null) checkValue(`${path}.input`, formatExact(running), total);
        if (step.kind === 'mean' && step.parts.length === 0) {
          throw new TraceMismatchError(`${path}.parts`, 'at least one part', 'none');
        }
        const natural =
          step.kind === 'mean'
            ? { numerator: BigInt(step.parts.length), denominator: 1n }
            : { numerator: 1n, denominator: 1n };
        const divisor = checkDivisor(path, step.divisor, step.divisor_from, multipliers, natural, trace.definition);
        running = checkValue(`${path}.value`, step.value, divideExact(sumExact(multiplied), divisor));
        return;
      }
      case 'weighted_mean': {
        const bases = step.parts.map((part, at) => readExact(`${path}.parts[${at}].value`, part.value));
        const multipliers = step.parts.map((part, at) => readExact(`${path}.parts[${at}].multiplier`, part.multiplier));
        const weights = step.parts.map((part, at) => readExact(`${path}.parts[${at}].weight`, part.weight));
        const multiplied = step.parts.map((part, at) => {
          const expected = multiplyExact(bases[at], multipliers[at]);
          checkValue(`${path}.parts[${at}].multiplied`, part.multiplied, expected);
          return expected;
        });
        for (const [at, part] of step.parts.entries()) {
          const input = byCode.get(part.code);
          if (input === undefined) {
            throw new TraceMismatchError(`${path}.parts[${at}].code`, 'a recorded input', part.code);
          }
          if (field !== undefined) checkText(`${path}.parts[${at}].value`, part.value, recordedValue(input, field));
          checkValue(`${path}.parts[${at}].multiplier`, part.multiplier, multiplierFor(trace.definition, part.code));
        }
        const max = sumExact(weights);
        checkValue(`${path}.max`, step.max, max);
        const numerator = sumExact(multiplied.map((value, at) => multiplyExact(value, weights[at])));
        const divisor = checkDivisor(path, step.divisor, step.divisor_from, multipliers, max, trace.definition);
        running = checkValue(`${path}.value`, step.value, divideExact(numerator, divisor));
        return;
      }
      case 'count': {
        let matched = 0;
        step.parts.forEach((part, at) => {
          const exact = part.value === null ? null : parseExact(part.value);
          const recomputed = matches(step.predicate, part.value, exact);
          checkBoolean(`${path}.parts[${at}].matched`, part.matched, recomputed);
          if (recomputed) matched += 1;
        });
        running = checkValue(`${path}.value`, step.value, { numerator: BigInt(matched), denominator: 1n });
        return;
      }
      case 'profile': {
        distribution = replayProfile(step, path);
        return;
      }
      case 'round': {
        const input = readExact(`${path}.input`, step.input);
        if (running !== null) checkValue(`${path}.input`, step.input, running);
        running = checkValue(`${path}.value`, step.value, roundExact(input, step.precision, step.mode));
        return;
      }
      case 'lookup': {
        const score = readExact(`${path}.lookup.score`, step.lookup.score);
        checkValue(`${path}.input`, step.input, score);
        replayScaleLookup(step.lookup);
        return;
      }
      case 'fail_if': {
        for (const [at, code] of step.watched.entries()) {
          if (byCode.get(code) === undefined) {
            throw new TraceMismatchError(`${path}.watched[${at}]`, 'a recorded input', code);
          }
        }
        const trigger = step.watched.filter((code) => byCode.get(code)?.grade === step.rule.any_grade);
        if (!sameList(trigger, step.trigger)) {
          throw new TraceMismatchError(`${path}.trigger`, `[${step.trigger.join(', ')}]`, `[${trigger.join(', ')}]`);
        }
        checkBoolean(`${path}.fired`, step.fired, trigger.length > 0);
        let capped = step.awarded;
        if (trigger.length > 0 && step.awarded !== null) {
          const awardedRank = step.order.indexOf(step.awarded);
          const capRank = step.order.indexOf(step.rule.then_max_division);
          if (awardedRank >= 0 && capRank >= 0 && awardedRank < capRank) capped = step.rule.then_max_division;
        }
        checkText(`${path}.capped`, step.capped, capped);
        return;
      }
    }
  });

  const expectsValue = trace.op !== 'rubric_profile';
  if (expectsValue && trace.status === 'complete') {
    if (trace.value === null) {
      throw new TraceMismatchError('value', 'a published value', 'nothing');
    }
    if (running === null) {
      throw new TraceMismatchError('value', trace.value, 'nothing');
    }
    checkValue('value', trace.value, running);
  } else {
    checkText('value', trace.value, null);
  }
  if (distribution.length !== trace.distribution.length) {
    throw new TraceMismatchError('distribution', `${trace.distribution.length} levels`, `${distribution.length} levels`);
  }

  return { value: trace.value, distribution };
}
