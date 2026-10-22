// ABOUTME: The period-to-annual evaluator of spec 03 section 4.1: reduce a learner's period results
// ABOUTME: to one annual series per learning area and one overall, applying the missing policy, the
// ABOUTME: declared operator and the exact arithmetic and trace of the aggregation engine (P2-B03).

import {
  evaluateAggregation,
  type AggregateTrace,
  type AggregationDefinition,
  type LearningAreaResult,
} from '../aggregation';
import { formatExact, parseExact, roundExact, type Exact } from '../engine';
import { givenScore, lookupScaleBand, prepareGradingScale } from '../scales';
import type { PreparedGradingScale } from '../scales';
import { prepareAnnual } from './annualPrepare';
import { annualIssue, planPeriods, readSeriesInputs, type AnnualPeriodPlan } from './annualPlan';
import type {
  AnnualAreaResult,
  AnnualConsumedPeriod,
  AnnualContext,
  AnnualDefinition,
  AnnualEvaluation,
  AnnualFlag,
  AnnualIssue,
  AnnualMissingStep,
  AnnualPeriodInput,
  AnnualRoundStep,
  AnnualSeriesInput,
  AnnualSeriesResult,
  AnnualStatus,
  AnnualTrace,
  AnnualTraceStep,
  AnnualValueStep,
  PreparedAnnual,
} from './types';

// ------------------------------------------------------------------ helpers

function missingStep(plan: AnnualPeriodPlan, definition: PreparedAnnual): AnnualMissingStep {
  return {
    kind: 'missing',
    policy: definition.missing,
    entries: plan.entries,
    ignored: plan.ignored,
    weights: plan.weights,
    declared_weights_total: plan.declared_weights_total,
    effective_weights_total: plan.effective_weights_total,
    renormalised: plan.renormalised,
  };
}

function flagsOf(
  plan: AnnualPeriodPlan,
  definition: PreparedAnnual,
  area: string | null
): AnnualFlag[] {
  const flags: AnnualFlag[] = [];
  for (const entry of plan.entries) {
    if (entry.reason === 'exempt') {
      flags.push({ code: 'exempt_period', period: entry.code, area });
      continue;
    }
    flags.push({ code: 'missing_period', period: entry.code, area });
    if (entry.treatment === 'zero') flags.push({ code: 'zeroed_period', period: entry.code, area });
    if (entry.treatment === 'carry') flags.push({ code: 'carried_period', period: entry.code, area });
    if (entry.treatment === 'blocked' && definition.missing === 'carry_previous') {
      flags.push({ code: 'no_previous_period', period: entry.code, area });
    }
  }
  if (plan.renormalised) flags.push({ code: 'renormalised', period: null, area });
  for (const code of plan.ignored) flags.push({ code: 'ignored_period', period: code, area });
  return flags;
}

/**
 * The aggregation definition the annual arithmetic delegates to.
 *
 * A period result is a learning-area result whose code is the period and whose value is the score;
 * the aggregation engine then owns the weighted mean, mean, sum and best-of arithmetic, the
 * selection tie-break and the trace, and the annual layer only records the population decisions.
 */
function aggregateDefinition(definition: PreparedAnnual, plan: AnnualPeriodPlan): AggregationDefinition {
  const over = plan.usable.map((period) => period.code);
  if (definition.op === 'weighted_mean') {
    return {
      code: 'annual',
      op: 'weighted_mean',
      value: 'score',
      over,
      weights: Object.fromEntries(plan.usable.map((period) => [period.code, period.weight ?? '0'])),
    };
  }
  if (definition.op === 'mean') {
    return { code: 'annual', op: 'mean', value: 'score', over };
  }
  if (definition.op === 'cumulative_sum') {
    return { code: 'annual', op: 'sum', value: 'score', over };
  }
  return {
    code: 'annual',
    op: 'best_n',
    n: definition.n ?? 0,
    value: 'score',
    over,
    groups: [{ fill_from: 'any' }],
    then: { op: 'mean' },
  };
}

const aggregationInputs = (plan: AnnualPeriodPlan): readonly LearningAreaResult[] =>
  plan.usable.map((period) => ({ code: period.code, score: period.value }));

function resolveScale(context: AnnualContext, issues: AnnualIssue[]): PreparedGradingScale | null {
  const code = context.grading_scale;
  if (code === undefined) return null;
  const definition = (context.scales ?? []).find((entry) => entry.code === code);
  if (definition === undefined) {
    issues.push(annualIssue('unknown_grading_scale', 'grading_scale', `no scale "${code}" is in scope`));
    return null;
  }
  const prepared = prepareGradingScale(definition);
  if (!prepared.ok) {
    issues.push(
      annualIssue(
        'invalid_grading_scale',
        'grading_scale',
        `scale "${code}" does not prepare: ${prepared.issues.map((entry) => `${entry.code} at ${entry.path}`).join(', ')}`
      )
    );
    return null;
  }
  return prepared.scale;
}

// ------------------------------------------------------------------- series

/**
 * Evaluates one annual series.
 *
 * A blocked population publishes no value at all: the trace still names every gap and what the
 * policy would have done with it, so a reviewer can see the missing period without being handed a
 * score the periods do not support. The arithmetic itself is the aggregation engine's, embedded
 * whole in the trace.
 */
function evaluateSeries(
  subject: string,
  definition: PreparedAnnual,
  inputs: readonly AnnualSeriesInput[],
  area: string | null,
  issues: AnnualIssue[]
): AnnualSeriesResult | null {
  const plan = planPeriods(definition, inputs, issues);
  if (plan === null) return null;

  const steps: AnnualTraceStep[] = [missingStep(plan, definition)];
  const flags = flagsOf(plan, definition, area);
  let status: AnnualStatus = plan.blocked ? (plan.blocked_status ?? 'incomplete') : 'complete';
  let running: Exact | null = null;
  let consumed: readonly AnnualConsumedPeriod[] = [];

  if (!plan.blocked) {
    if (definition.op === 'final_period_only') {
      if (plan.usable.length !== 1) {
        issues.push(
          annualIssue('aggregation_failed', 'of', 'final_period_only planned a population other than one period')
        );
        return null;
      }
      const period = plan.usable[0];
      const value = parseExact(period.value) as Exact;
      const step: AnnualValueStep = {
        kind: 'value',
        selected: period.code,
        ignored: plan.op_ignored,
        parts: [{ code: period.code, value: formatExact(value) }],
        value: formatExact(value),
      };
      steps.push(step);
      running = value;
      consumed = plan.usable.map((entry) => ({
        code: entry.code,
        value: entry.value,
        weight: entry.weight,
        source: entry.source,
      }));
    } else {
      const evaluation = evaluateAggregation(aggregateDefinition(definition, plan), aggregationInputs(plan));
      if (!evaluation.ok) {
        issues.push(
          annualIssue(
            'aggregation_failed',
            'of',
            `the aggregation engine refused the annual run: ${evaluation.issues.map((entry) => entry.code).join(', ')}`
          )
        );
        return null;
      }
      const aggregate: AggregateTrace = evaluation.result.trace;
      steps.push({ kind: 'aggregate', aggregate });
      status = evaluation.result.status;
      running = evaluation.result.value === null ? null : parseExact(evaluation.result.value);
      consumed = evaluation.result.consumed.map((entry) => {
        const planned = plan.usable.find((period) => period.code === entry.code);
        return {
          code: entry.code,
          value: entry.value,
          weight: entry.weight,
          source: planned === undefined ? 'declared' : planned.source,
        };
      });
      if (definition.op === 'best_of' && status === 'incomplete') {
        flags.push({ code: 'insufficient_periods', period: null, area });
      }
    }
  }

  let rounding: AnnualSeriesResult['rounding'] = null;
  let exactValue = status === 'complete' && running !== null ? formatExact(running) : null;
  let value = exactValue;
  if (status === 'complete' && running !== null && definition.precision !== undefined) {
    const rounded = roundExact(running, definition.precision, definition.mode);
    const step: AnnualRoundStep = {
      kind: 'round',
      input: formatExact(running),
      precision: definition.precision,
      mode: definition.mode,
      value: formatExact(rounded),
    };
    steps.push(step);
    rounding = {
      precision: definition.precision,
      mode: definition.mode,
      input: step.input,
      output: step.value,
    };
    value = step.value;
  }
  if (status !== 'complete') {
    running = null;
    exactValue = null;
    value = null;
    rounding = null;
  }

  const trace: AnnualTrace = {
    annual: 'annual',
    subject,
    op: definition.op,
    status,
    definition,
    inputs,
    steps,
    value,
  };

  return {
    subject,
    status,
    value,
    exact_value: exactValue,
    rounding,
    consumed,
    missing: plan.entries.filter((entry) => entry.reason !== 'exempt').map((entry) => entry.code),
    ignored: plan.ignored,
    flags,
    trace,
  };
}

// ------------------------------------------------------------------- areas

interface AreaSeries {
  readonly code: string;
  readonly group: string | null;
  readonly coefficient: string | null;
  readonly inputs: readonly AnnualSeriesInput[];
}

function emptyAreaInputs(periods: readonly AnnualPeriodInput[]): AnnualSeriesInput[] {
  return periods.map((period) => ({
    code: period.code,
    value: null,
    complete: true,
    exempt: false,
  }));
}

/**
 * Builds one series per learning area across the periods.
 *
 * An area a period does not list is absent, not zero; an exempt area is excluded rather than
 * missing; and an area's first declared group and coefficient travel with the annual result so a
 * named aggregation can still weight or group it.
 */
function readAreaSeries(periods: readonly AnnualPeriodInput[], issues: AnnualIssue[]): readonly AreaSeries[] {
  const order: string[] = [];
  const series = new Map<string, { group: string | null; coefficient: string | null; inputs: AnnualSeriesInput[] }>();

  periods.forEach((period, periodIndex) => {
    if (period.areas === undefined) return;
    if (!Array.isArray(period.areas)) {
      issues.push(annualIssue('invalid_area', `periods[${periodIndex}].areas`, 'areas must be a list'));
      return;
    }
    const seen = new Set<string>();
    period.areas.forEach((area, areaIndex) => {
      const path = `periods[${periodIndex}].areas[${areaIndex}]`;
      if (typeof area.code !== 'string' || area.code.trim().length === 0) {
        issues.push(annualIssue('invalid_area', `${path}.code`, 'a learning area needs a non-empty code'));
        return;
      }
      if (seen.has(area.code)) {
        issues.push(annualIssue('duplicate_area', `${path}.code`, `area "${area.code}" appears twice`));
        return;
      }
      seen.add(area.code);

      let entry = series.get(area.code);
      if (entry === undefined) {
        entry = {
          group: area.group ?? null,
          coefficient: null,
          inputs: emptyAreaInputs(periods),
        };
        series.set(area.code, entry);
        order.push(area.code);
      }
      if (entry.group === null && area.group !== undefined) entry.group = area.group;

      let coefficient: string | null = null;
      if (area.coefficient !== undefined) {
        const parsed = parseExact(area.coefficient);
        if (parsed === null || parsed.numerator < 0n) {
          issues.push(
            annualIssue(
              'invalid_area_coefficient',
              `${path}.coefficient`,
              `area "${area.code}" has a coefficient that is not a non-negative decimal`
            )
          );
        } else {
          coefficient = formatExact(parsed);
        }
      }
      if (entry.coefficient === null && coefficient !== null) entry.coefficient = coefficient;

      let value: string | null = null;
      if (area.score !== undefined) {
        const parsed = parseExact(area.score);
        if (parsed === null) {
          issues.push(
            annualIssue(
              'invalid_area_value',
              `${path}.score`,
              `area "${area.code}" has a score that is not a decimal`
            )
          );
        } else {
          value = formatExact(parsed);
        }
      }
      for (const field of ['complete', 'exempt'] as const) {
        if (area[field] !== undefined && typeof area[field] !== 'boolean') {
          issues.push(annualIssue('invalid_area', `${path}.${field}`, `${field} must be a boolean when declared`));
        }
      }

      entry.inputs[periodIndex] = {
        code: period.code,
        value,
        complete: area.complete ?? true,
        exempt: area.exempt ?? false,
      };
    });
  });

  return order.map((code) => {
    const entry = series.get(code) as { group: string | null; coefficient: string | null; inputs: AnnualSeriesInput[] };
    return { code, group: entry.group, coefficient: entry.coefficient, inputs: entry.inputs };
  });
}

function enrichArea(
  series: AnnualSeriesResult,
  code: string,
  group: string | null,
  coefficient: string | null,
  scale: PreparedGradingScale | null
): AnnualAreaResult {
  const exact = series.value === null ? null : parseExact(series.value);
  const lookup = scale !== null && exact !== null ? lookupScaleBand(scale, givenScore(exact)) : null;
  const matched = lookup !== null && lookup.matched;
  const flags =
    matched || lookup === null
      ? series.flags
      : [...series.flags, { code: 'ungraded' as const, period: null, area: code }];
  return {
    ...series,
    code,
    group,
    coefficient,
    grade: matched ? lookup.band.code : null,
    points: matched ? lookup.band.points : null,
    grade_points: matched ? lookup.band.points : null,
    scale: scale === null ? null : scale.code,
    lookup: lookup === null ? null : lookup.trace,
    flags,
  };
}

// ------------------------------------------------------------------ public

/**
 * Evaluates a pack's annual rule for one learner.
 *
 * `annual.average` is the annual aggregate of the period overall results; `annual.<AREA>` is the
 * annual aggregate of that learning area's period results. The two are computed by the same
 * operator and missing policy, and each carries its own replayable trace.
 */
export function evaluateAnnual(
  definition: AnnualDefinition,
  periods: readonly AnnualPeriodInput[],
  context: AnnualContext = {}
): AnnualEvaluation {
  const preparation = prepareAnnual(definition);
  if (!preparation.ok) return preparation;
  const prepared = preparation.annual;

  const issues: AnnualIssue[] = [];
  const scale = resolveScale(context, issues);
  if (issues.length > 0) return { ok: false, issues };

  const averageInputs = readSeriesInputs(periods, issues);
  const areaSeries = readAreaSeries(periods, issues);
  if (averageInputs === null || issues.length > 0) return { ok: false, issues };

  const average = evaluateSeries('average', prepared, averageInputs, null, issues);
  if (average === null || issues.length > 0) return { ok: false, issues };

  const areas: AnnualAreaResult[] = [];
  for (const area of areaSeries) {
    const series = evaluateSeries(area.code, prepared, area.inputs, area.code, issues);
    if (series === null || issues.length > 0) return { ok: false, issues };
    areas.push(enrichArea(series, area.code, area.group, area.coefficient, scale));
  }

  const flags = [...average.flags, ...areas.flatMap((area) => area.flags)];

  return {
    ok: true,
    result: {
      status: average.status,
      value: average.value,
      exact_value: average.exact_value,
      rounding: average.rounding,
      average,
      areas,
      flags,
      trace: average.trace,
    },
  };
}
