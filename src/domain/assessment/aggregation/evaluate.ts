// ABOUTME: The aggregation pipeline of spec 03 section 6: combine the learning-area values the inputs
// ABOUTME: module read, round once at the declared precision, look the result up in its scale and
// ABOUTME: apply the declared fail_if cap, recording every step as a replayable trace.

import { compareExact, divideExact, formatExact, multiplyExact, parseExact, roundExact, sumExact, ONE, type Exact } from '../engine';
import { givenScore, lookupScaleBand } from '../scales';
import type { PreparedGradingScale, ScaleLookupTrace } from '../scales';
import {
  flag,
  hasValue,
  issue,
  qualityOrder,
  resolveScale,
  scopedAreas,
  validateInputs,
  type ScopedArea,
} from './inputs';
import { countedArea, consumedOfArea, divisorOf, tracePartOf, weightedPartOf, type CountedArea } from './combine';
import { prepareAggregation } from './prepare';
import { selectBest, type SelectionCandidate } from './select';
import type {
  AggregateFlag,
  AggregateGrade,
  AggregateResult,
  AggregateRounding,
  AggregateStatus,
  AggregateTrace,
  AggregateTraceStep,
  AggregationContext,
  AggregationDefinition,
  AggregationEvaluation,
  AggregationIssue,
  ConsumedValue,
  CountPart,
  LearningAreaResult,
  LevelCount,
  PreparedAggregation,
  ProfilePart,
} from './types';

// --------------------------------------------------------- operator helpers

/** The weight one area carries: its credit for a GPA, its coefficient or the map's entry otherwise. */
function weightOf(
  aggregation: PreparedAggregation,
  area: LearningAreaResult | null,
  index: number,
  issues: AggregationIssue[],
  flags: AggregateFlag[]
): Exact | null {
  if (aggregation.op === 'gpa') {
    const parsed = parseExact(area?.credit ?? '1');
    if (parsed === null || parsed.numerator < 0n) {
      issues.push(issue('invalid_credit', `inputs[${index}].credit`, 'a credit must be a non-negative decimal'));
      return null;
    }
    return parsed;
  }
  if (aggregation.weights === 'coefficient') {
    const text = area?.coefficient;
    const parsed = text === undefined ? null : parseExact(text);
    if (parsed === null || parsed.numerator < 0n) {
      flags.push(flag('missing_weight', area?.code ?? null));
      return null;
    }
    return parsed;
  }
  if (aggregation.weights === undefined) return null;
  const text = aggregation.weights[area?.code ?? ''];
  const parsed = text === undefined ? null : parseExact(text);
  if (parsed === null) {
    flags.push(flag('missing_weight', area?.code ?? null));
    return null;
  }
  return parsed;
}

function predicateMatches(predicate: PreparedAggregation['where'], text: string, exact: Exact | null): boolean {
  if (predicate === undefined || text === '') return false;
  if (predicate.op === 'eq') return text === predicate.value;
  if (predicate.op === 'in') return predicate.values?.includes(text) === true;
  const bound = predicate.value === undefined ? null : parseExact(predicate.value);
  if (bound === null || exact === null) return false;
  const order = compareExact(exact, bound);
  if (predicate.op === 'gte') return order >= 0;
  if (predicate.op === 'gt') return order > 0;
  if (predicate.op === 'lte') return order <= 0;
  return order < 0;
}

/** The level a profile reports for one area: its scale band when it has one, else the raw level. */
function profileKey(part: ProfilePart): string {
  return part.band ?? part.level;
}

/** The levels a profile reports: every level the scale names, then anything the scale does not. */
function profileLevels(
  scale: PreparedGradingScale | null,
  parts: readonly ProfilePart[]
): readonly { readonly level: string; readonly label: string | null }[] {
  const present = new Set(parts.map(profileKey));
  const ordered: { level: string; label: string | null }[] = [];
  if (scale !== null) {
    for (const band of scale.bands) ordered.push({ level: band.code, label: band.label });
  }
  const rest = [...present].filter((level) => !ordered.some((entry) => entry.level === level));
  const numeric = rest.every((level) => parseExact(level) !== null);
  rest.sort((left, right) => {
    if (numeric) return compareExact(parseExact(right) as Exact, parseExact(left) as Exact);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  return [...ordered, ...rest.map((level) => ({ level, label: null }))];
}

/** One consumed area with its multiplier, its multiplied value and its weight. */

// -------------------------------------------------------------------- engine

/**
 * Applies one aggregation to one learner's learning-area results.
 *
 * The definition is validated first and refused as a whole when an operator cannot run with it.
 * Data gaps - a missing area, a missing coefficient - are flags on a result whose status is
 * `incomplete`, because they are facts about this learner rather than about the pack.
 *
 * Exempt areas are excluded from every candidate list and every denominator, as spec 03 section 4
 * requires, and leave an `exempt_area` flag so their absence stays visible.
 */
export function evaluateAggregation(
  definition: AggregationDefinition,
  inputs: readonly LearningAreaResult[],
  context: AggregationContext = {}
): AggregationEvaluation {
  const preparation = prepareAggregation(definition);
  if (!preparation.ok) return preparation;
  const aggregation = preparation.aggregation;

  const issues: AggregationIssue[] = [];
  const flags: AggregateFlag[] = [];
  validateInputs(inputs, issues);
  const scale = resolveScale(aggregation, context, issues);
  const capOrder = qualityOrder(scale, aggregation, issues);
  if (issues.length > 0) return { ok: false, issues };

  const field = aggregation.value;
  if (field === undefined) {
    return { ok: false, issues: [issue('missing_value_field', 'value', 'the operator consumes no value')] };
  }
  const scoped = scopedAreas(aggregation, inputs, field, issues, flags);
  if (issues.length > 0) return { ok: false, issues };

  const available = scoped.filter((entry) => entry.text !== null);
  const steps: AggregateTraceStep[] = [];
  let value: Exact | null = null;
  let subtotal: Exact | null = null;
  let divisorUsed: Exact | null = null;
  let consumed: readonly ConsumedValue[] = [];
  let selected: readonly string[] | null = null;
  let distribution: readonly LevelCount[] | null = null;
  let status: AggregateStatus = 'complete';

  if (aggregation.op === 'rubric_profile') {
    const parts: ProfilePart[] = available.map((entry) => {
      const level = entry.text as string;
      const exact = entry.exact;
      const lookup = scale === null || exact === null ? null : lookupScaleBand(scale, givenScore(exact));
      return { code: entry.code, level, band: lookup !== null && lookup.matched ? lookup.band.code : null };
    });
    const counts = profileLevels(scale, parts).map((entry) => ({
      level: entry.level,
      label: entry.label,
      count: parts.filter((part) => profileKey(part) === entry.level).length,
    }));
    steps.push({ kind: 'profile', parts, counts });
    distribution = counts;
    consumed = parts.map((part) => ({
      code: part.code,
      value: profileKey(part),
      weight: null,
      multiplier: '1',
      multiplied: profileKey(part),
    }));
    status = parts.length === 0 ? 'empty' : 'complete';
  } else if (aggregation.op === 'count_where') {
    const parts: CountPart[] = scoped.map((entry) => ({
      code: entry.code,
      value: entry.text,
      matched: predicateMatches(aggregation.where, entry.text ?? '', entry.exact),
    }));
    const matched = parts.filter((part) => part.matched);
    value = { numerator: BigInt(matched.length), denominator: 1n };
    steps.push({
      kind: 'count',
      predicate: aggregation.where as NonNullable<PreparedAggregation['where']>,
      parts,
      value: formatExact(value),
    });
    consumed = matched.map((part) => ({
      code: part.code,
      value: part.value as string,
      weight: null,
      multiplier: '1',
      multiplied: part.value as string,
    }));
    status = scoped.length === 0 ? 'empty' : 'complete';
  } else if (aggregation.op === 'best_n') {
    const candidates: SelectionCandidate[] = scoped.map((entry) => ({
      code: entry.code,
      group: entry.group,
      value: entry.exact,
    }));
    const selection = selectBest({ candidates, groups: aggregation.groups, n: aggregation.n ?? 0 });
    steps.push({
      kind: 'select',
      n: aggregation.n ?? 0,
      groups: aggregation.groups,
      tie_break: 'value_desc_code_asc',
      decisions: selection.decisions,
      selected: selection.selected,
      value: formatExact(selection.value),
    });
    selected = selection.selected;
    if (selection.status === 'required_missing') flags.push(flag('required_area_missing', null));
    if (selection.status === 'group_minimum_unmet') flags.push(flag('group_minimum_unmet', null));
    if (selection.status === 'insufficient') flags.push(flag('insufficient_candidates', null));

    const chosen = selection.selected
      .map((code) => scoped.find((entry) => entry.code === code))
      .filter((entry): entry is ScopedArea & { readonly exact: Exact } => entry !== undefined && hasValue(entry));
    // The selection is made on the areas' own values; a multiplier scales what is counted, never
    // which areas are chosen.
    const counted = chosen.map((entry) => countedArea(aggregation, entry, null));
    consumed = counted.map(consumedOfArea);
    const parts = counted.map(tracePartOf);
    const step = aggregation.then ?? { op: 'mean' };
    if (counted.length === 0) {
      value = null;
    } else {
      const total = sumExact(counted.map((area) => area.multiplied));
      subtotal = total;
      const divisor = divisorOf(
        aggregation,
        counted,
        step.op === 'mean'
          ? { value: { numerator: BigInt(counted.length), denominator: 1n }, from: 'count' }
          : { value: ONE, from: 'one' }
      );
      divisorUsed = divisor.value;
      value = divideExact(total, divisor.value);
      steps.push({
        kind: step.op === 'mean' ? 'mean' : 'sum',
        parts,
        divisor: formatExact(divisor.value),
        divisor_from: divisor.from,
        value: formatExact(value),
      });
    }
    status = scoped.length === 0 ? 'empty' : selection.status === 'ok' ? 'complete' : 'incomplete';
  } else {
    const missing = scoped.filter((entry) => entry.text === null);
    if (scoped.length === 0) {
      status = 'empty';
    } else if (available.length === 0) {
      // the learner has areas, but none of them carries a value this operator can combine
      status = 'incomplete';
    } else if (aggregation.op === 'weighted_mean' || aggregation.op === 'gpa') {
      const counted: CountedArea[] = [];
      for (const entry of available.filter(hasValue)) {
        const index = inputs.findIndex((area) => area.code === entry.code);
        const weight = weightOf(aggregation, index < 0 ? null : inputs[index], index, issues, flags);
        if (weight === null) continue;
        counted.push(countedArea(aggregation, entry, weight));
      }
      if (issues.length > 0) return { ok: false, issues };
      const max = sumExact(counted.map((entry) => entry.weight as Exact));
      if (max.numerator === 0n) {
        return { ok: false, issues: [issue('zero_total_weight', 'weights', 'the consumed weights sum to zero')] };
      }
      const numerator = sumExact(
        counted.map((entry) => multiplyExact(entry.multiplied, entry.weight as Exact))
      );
      const divisor = divisorOf(aggregation, counted, { value: max, from: 'weights' });
      divisorUsed = divisor.value;
      value = divideExact(numerator, divisor.value);
      if (counted.length !== available.length) status = 'incomplete';
      steps.push({
        kind: 'weighted_mean',
        parts: counted.map(weightedPartOf),
        max: formatExact(max),
        divisor: formatExact(divisor.value),
        divisor_from: divisor.from,
        value: formatExact(value),
      });
      consumed = counted.map(consumedOfArea);
    } else {
      const counted = available.filter(hasValue).map((entry) => countedArea(aggregation, entry, null));
      const averaging = aggregation.op === 'mean' || aggregation.op === 'points_mean';
      const total = sumExact(counted.map((area) => area.multiplied));
      subtotal = total;
      const divisor = divisorOf(
        aggregation,
        counted,
        averaging
          ? { value: { numerator: BigInt(counted.length), denominator: 1n }, from: 'count' }
          : { value: ONE, from: 'one' }
      );
      divisorUsed = divisor.value;
      value = divideExact(total, divisor.value);
      steps.push({
        kind: averaging ? 'mean' : 'sum',
        parts: counted.map(tracePartOf),
        divisor: formatExact(divisor.value),
        divisor_from: divisor.from,
        value: formatExact(value),
      });
      consumed = counted.map(consumedOfArea);
    }
    if (status === 'complete' && missing.length > 0) status = 'incomplete';
  }

  // ---- every declared multiplier must have scaled something
  //
  // An area whose result is absent is already reported as incomplete, so it is not repeated here;
  // an area that had a value and was still not counted is the silent no-op this refuses, because a
  // school that thinks it doubled mathematics must never be handed an undoubled total.
  const declaredMultipliers = aggregation.multipliers;
  if (declaredMultipliers !== undefined) {
    const consumedCodes = new Set(consumed.map((entry) => entry.code));
    const inScope = new Set(scoped.map((entry) => entry.code));
    const availableCodes = new Set(available.map((entry) => entry.code));
    const unconsumed = Object.keys(declaredMultipliers).filter(
      (code) => !consumedCodes.has(code) && (availableCodes.has(code) || !inScope.has(code))
    );
    if (unconsumed.length > 0) {
      return {
        ok: false,
        issues: unconsumed.map((code) =>
          issue(
            'multiplier_not_consumed',
            `multipliers.${code}`,
            inScope.has(code)
              ? `area "${code}" was not counted by "${aggregation.code}", so its multiplier was never applied`
              : `area "${code}" is not one of the areas "${aggregation.code}" covers`
          )
        ),
      };
    }
  }

  if (status !== 'complete') value = null;
  if (status === 'empty') subtotal = null;

  // ---- rounding: one pass, at the declared precision, with the engine's exact arithmetic
  const precision = aggregation.then?.precision ?? aggregation.precision;
  let rounding: AggregateRounding | null = null;
  if (value !== null && precision !== undefined) {
    const before = value;
    const rounded = roundExact(value, precision, aggregation.mode);
    value = rounded;
    steps.push({
      kind: 'round',
      input: formatExact(before),
      precision,
      mode: aggregation.mode,
      value: formatExact(rounded),
    });
    rounding = { precision, mode: aggregation.mode, input: formatExact(before), output: formatExact(rounded) };
  }

  // ---- lookup: the aggregate becomes a band through the pack's own scale
  let grade: AggregateGrade | null = null;
  if (value !== null && scale !== null) {
    const lookup = lookupScaleBand(scale, givenScore(value));
    const lookupTrace: ScaleLookupTrace = lookup.trace;
    steps.push({ kind: 'lookup', input: formatExact(value), lookup: lookupTrace });
    if (lookup.matched) {
      grade = {
        scale: scale.code,
        band: lookup.band.code,
        label: lookup.band.label,
        points: lookup.band.points,
        descriptor: lookup.band.descriptor,
        awarded: lookup.band.code,
        capped_by: null,
      };
    } else {
      flags.push(flag('ungraded', null));
    }
  }

  // ---- fail_if: a declared national rule caps the band after the lookup
  if (aggregation.fail_if !== undefined && capOrder !== null) {
    const rule = aggregation.fail_if;
    const watched =
      rule.in === undefined
        ? scoped.map((entry) => entry.code)
        : inputs.map((area) => area.code).filter((code) => rule.in?.includes(code) === true);
    const trigger = watched.filter((code) => inputs.find((area) => area.code === code)?.grade === rule.any_grade);
    const fired = trigger.length > 0;
    const awarded = grade === null ? null : grade.band;
    let capped = awarded;
    if (fired && awarded !== null) {
      const awardedRank = capOrder.indexOf(awarded);
      const capRank = capOrder.indexOf(rule.then_max_division);
      if (awardedRank >= 0 && capRank >= 0 && awardedRank < capRank) capped = rule.then_max_division;
    }
    steps.push({ kind: 'fail_if', rule, fired, watched, trigger, order: capOrder, awarded, capped });
    if (fired) flags.push(flag('fail_if_fired', trigger[0] ?? null));
    if (grade !== null && capped !== null && capped !== awarded && scale !== null) {
      const band = scale.bands.find((entry) => entry.code === capped);
      grade = {
        scale: grade.scale,
        band: capped,
        label: band?.label ?? capped,
        points: band?.points === undefined || band.points === null ? null : formatExact(band.points),
        descriptor: band?.descriptor ?? null,
        awarded: grade.awarded,
        capped_by: rule,
      };
    }
  }

  const trace: AggregateTrace = {
    aggregation: aggregation.code,
    op: aggregation.op,
    status,
    definition: aggregation,
    inputs,
    steps,
    value: value === null ? null : formatExact(value),
    distribution: distribution ?? [],
  };

  const result: AggregateResult = {
    code: aggregation.code,
    op: aggregation.op,
    status,
    value: value === null ? null : formatExact(value),
    exact_value: value === null ? null : rounding === null ? formatExact(value) : rounding.input,
    subtotal: subtotal === null ? null : formatExact(subtotal),
    divisor: divisorUsed === null ? null : formatExact(divisorUsed),
    consumed,
    selected,
    precision: rounding === null ? null : rounding.precision,
    rounding,
    grade,
    distribution,
    flags,
    trace,
  };

  return { ok: true, result };
}
