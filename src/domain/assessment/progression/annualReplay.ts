// ABOUTME: Replay for an annual trace: recompute the period population, re-run the embedded
// ABOUTME: aggregation trace, re-round and re-look-up the band, and refuse a stored number that
// ABOUTME: disagrees with its operands.

import { replayAggregate } from '../aggregation';
import type { AggregateTrace } from '../aggregation';
import { TraceMismatchError, compareExact, formatExact, parseExact, roundExact, type Exact } from '../engine';
import { replayScaleLookup } from '../scales';
import { planPeriods, type AnnualPeriodPlan } from './annualPlan';
import type {
  AnnualConsumedPeriod,
  AnnualIssue,
  AnnualMissingStep,
  AnnualResult,
  AnnualTrace,
  AnnualTraceStep,
  PreparedAnnual,
  ReplayedAnnual,
  ReplayedAnnualResult,
} from './types';

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

function checkValue(path: string, recorded: string, recomputed: Exact): Exact {
  const expected = parseExact(recorded);
  if (expected === null) {
    throw new TraceMismatchError(path, 'an exact decimal or fraction', recorded);
  }
  if (compareExact(expected, recomputed) !== 0) {
    throw new TraceMismatchError(path, formatExact(expected), formatExact(recomputed));
  }
  return expected;
}

function sameList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function replayMissing(
  step: AnnualMissingStep,
  plan: AnnualPeriodPlan,
  definition: PreparedAnnual,
  path: string
): void {
  checkText(`${path}.policy`, step.policy, definition.missing);
  if (step.entries.length !== plan.entries.length) {
    throw new TraceMismatchError(
      `${path}.entries`,
      `${step.entries.length} entries`,
      `${plan.entries.length} entries`
    );
  }
  step.entries.forEach((entry, index) => {
    const recomputed = plan.entries[index];
    const at = `${path}.entries[${index}]`;
    checkText(`${at}.code`, entry.code, recomputed.code);
    checkText(`${at}.reason`, entry.reason, recomputed.reason);
    checkText(`${at}.treatment`, entry.treatment, recomputed.treatment);
    checkText(`${at}.value`, entry.value, recomputed.value);
    checkText(`${at}.carried_from`, entry.carried_from, recomputed.carried_from);
    checkText(`${at}.weight`, entry.weight, recomputed.weight);
  });
  if (!sameList(step.ignored, plan.ignored)) {
    throw new TraceMismatchError(`${path}.ignored`, `[${step.ignored.join(', ')}]`, `[${plan.ignored.join(', ')}]`);
  }
  if (step.weights.length !== plan.weights.length) {
    throw new TraceMismatchError(
      `${path}.weights`,
      `${step.weights.length} periods`,
      `${plan.weights.length} periods`
    );
  }
  step.weights.forEach((weight, index) => {
    const recomputed = plan.weights[index];
    const at = `${path}.weights[${index}]`;
    checkText(`${at}.code`, weight.code, recomputed.code);
    checkText(`${at}.declared`, weight.declared, recomputed.declared);
    checkText(`${at}.effective`, weight.effective, recomputed.effective);
  });
  checkText(`${path}.declared_weights_total`, step.declared_weights_total, plan.declared_weights_total);
  checkText(`${path}.effective_weights_total`, step.effective_weights_total, plan.effective_weights_total);
  checkBoolean(`${path}.renormalised`, step.renormalised, plan.renormalised);
}

/** Recomputes one aggregate step and checks it read the periods the plan selected. */
function replayAggregateStep(
  step: Extract<AnnualTraceStep, { kind: 'aggregate' }>,
  plan: AnnualPeriodPlan,
  op: PreparedAnnual['op'],
  path: string
): Exact | null {
  const recorded = step.aggregate as AggregateTrace;
  const expectedOp =
    op === 'cumulative_sum' ? 'sum' : op === 'best_of' ? 'best_n' : op;
  checkText(`${path}.aggregate.op`, recorded.op, expectedOp);
  checkText(`${path}.aggregate.definition.value`, recorded.definition?.value ?? null, 'score');
  const expectedCodes = plan.usable.map((period) => period.code);
  const recordedCodes = recorded.inputs.map((input) => input.code);
  if (!sameList(recordedCodes, expectedCodes)) {
    throw new TraceMismatchError(
      `${path}.aggregate.inputs`,
      `[${recordedCodes.join(', ')}]`,
      `[${expectedCodes.join(', ')}]`
    );
  }
  recorded.inputs.forEach((input, index) => {
    checkText(`${path}.aggregate.inputs[${index}].score`, input.score ?? null, plan.usable[index].value);
  });
  const replayed = replayAggregate(recorded);
  return replayed.value === null ? null : parseExact(replayed.value);
}

function replayValueStep(
  step: Extract<AnnualTraceStep, { kind: 'value' }>,
  plan: AnnualPeriodPlan,
  path: string
): Exact | null {
  checkText(`${path}.selected`, step.selected, plan.usable.length === 1 ? plan.usable[0].code : null);
  if (!sameList(step.ignored, plan.op_ignored)) {
    throw new TraceMismatchError(`${path}.ignored`, `[${step.ignored.join(', ')}]`, `[${plan.op_ignored.join(', ')}]`);
  }
  if (step.parts.length !== 1 || plan.usable.length !== 1) {
    throw new TraceMismatchError(`${path}.parts`, 'one period', `${step.parts.length}`);
  }
  checkText(`${path}.parts[0].code`, step.parts[0].code, plan.usable[0].code);
  checkText(`${path}.parts[0].value`, step.parts[0].value, plan.usable[0].value);
  const value = parseExact(step.parts[0].value);
  if (value === null) {
    throw new TraceMismatchError(`${path}.parts[0].value`, 'an exact decimal or fraction', step.parts[0].value);
  }
  return checkValue(`${path}.value`, step.value, value);
}

function replayRoundStep(
  step: Extract<AnnualTraceStep, { kind: 'round' }>,
  running: Exact | null,
  path: string
): Exact {
  if (running === null) {
    throw new TraceMismatchError(`${path}.input`, 'a computed value', 'nothing');
  }
  checkText(`${path}.input`, step.input, formatExact(running));
  const input = parseExact(step.input);
  if (input === null) {
    throw new TraceMismatchError(`${path}.input`, 'an exact decimal or fraction', step.input);
  }
  return checkValue(`${path}.value`, step.value, roundExact(input, step.precision, step.mode));
}

/**
 * Recomputes an annual series from its trace alone.
 *
 * Every step is checked against its own operands: the population plan is rebuilt, the embedded
 * aggregation trace replays through the P2-B03 engine, a pass-through value is checked against the
 * period it names, and the rounding re-rounds. A trace whose steps do not add up is refused.
 */
export function replayAnnual(trace: AnnualTrace): ReplayedAnnual {
  checkText('annual', trace.annual, 'annual');
  checkText('op', trace.op, trace.definition.op);
  const issues: AnnualIssue[] = [];
  const plan = planPeriods(trace.definition, trace.inputs, issues);
  if (plan === null) {
    throw new TraceMismatchError('definition.of', 'a computable weight total', 'zero');
  }
  if (trace.steps.length === 0 || trace.steps[0].kind !== 'missing') {
    throw new TraceMismatchError('steps[0]', 'a missing step', trace.steps.length === 0 ? 'nothing' : trace.steps[0].kind);
  }
  replayMissing(trace.steps[0], plan, trace.definition, 'steps[0]');
  if (plan.blocked && trace.steps.length !== 1) {
    throw new TraceMismatchError('steps', 'only the missing step', `${trace.steps.length} steps`);
  }

  let running: Exact | null = null;
  let status: AnnualTrace['status'] = plan.blocked ? (plan.blocked_status ?? 'incomplete') : 'complete';
  let rounded = false;
  let consumed: readonly AnnualConsumedPeriod[] = [];

  for (const [index, step] of trace.steps.entries()) {
    if (index === 0) continue;
    const path = `steps[${index}]`;
    if (rounded) {
      throw new TraceMismatchError(path, 'nothing after the rounding step', step.kind);
    }
    if (step.kind === 'aggregate') {
      if (trace.definition.op === 'final_period_only') {
        throw new TraceMismatchError(path, 'no aggregate for final_period_only', 'an aggregate');
      }
      const replayed = replayAggregateStep(step, plan, trace.definition.op, path);
      status = step.aggregate.status;
      running = replayed;
      const selection = step.aggregate.steps.find((candidate) => candidate.kind === 'select');
      const selected = selection !== undefined && selection.kind === 'select' ? selection.selected : null;
      const ordered =
        selected === null
          ? plan.usable
          : selected
              .map((code) => plan.usable.find((entry) => entry.code === code))
              .filter((entry): entry is (typeof plan.usable)[number] => entry !== undefined);
      consumed = ordered.map((entry) => ({
        code: entry.code,
        value: entry.value,
        weight: entry.weight,
        source: entry.source,
      }));
      continue;
    }
    if (step.kind === 'value') {
      if (trace.definition.op !== 'final_period_only') {
        throw new TraceMismatchError(path, 'a value step only for final_period_only', 'a value');
      }
      running = replayValueStep(step, plan, path);
      status = 'complete';
      consumed = plan.usable.map((entry) => ({
        code: entry.code,
        value: entry.value,
        weight: entry.weight,
        source: entry.source,
      }));
      continue;
    }
    if (step.kind === 'round') {
      if (trace.definition.precision === undefined) {
        throw new TraceMismatchError(`${path}.precision`, 'no annual rounding', String(step.precision));
      }
      running = replayRoundStep(step, running, path);
      rounded = true;
    }
  }

  if (trace.definition.precision !== undefined && status === 'complete' && !rounded) {
    throw new TraceMismatchError('steps', 'a rounding step', 'nothing');
  }

  if (status === 'complete') {
    if (running === null) throw new TraceMismatchError('value', 'a computed value', 'nothing');
    checkText('status', trace.status, 'complete');
    checkText('value', trace.value, formatExact(running));
  } else {
    checkText('status', trace.status, status);
    checkText('value', trace.value, null);
  }

  return {
    value: trace.value,
    consumed,
  };
}

/** Replays the overall series and every area, including the band each area was awarded. */
export function replayAnnualResult(result: AnnualResult): ReplayedAnnualResult {
  replayAnnual(result.trace);
  checkText('value', result.value, result.average.value);

  const areas = result.areas.map((area) => {
    const replayed = replayAnnual(area.trace);
    checkText(`areas[${area.code}].value`, area.value, replayed.value);
    if (area.value === null) {
      if (area.lookup !== null) {
        throw new TraceMismatchError(`areas[${area.code}].lookup`, 'no lookup for no value', 'a lookup');
      }
      return { code: area.code, value: null, grade: null };
    }
    if (area.scale !== null && area.lookup === null) {
      throw new TraceMismatchError(`areas[${area.code}].lookup`, 'a lookup', 'nothing');
    }
    if (area.lookup === null) return { code: area.code, value: area.value, grade: null };
    const lookup = replayScaleLookup(area.lookup);
    checkText(`areas[${area.code}].grade`, area.grade, lookup.band);
    return { code: area.code, value: area.value, grade: area.grade };
  });

  return { value: result.value, areas };
}
