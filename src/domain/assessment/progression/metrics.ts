// ABOUTME: Resolving the metric a progression condition names: `annual.average`, `annual.<AREA>`,
// ABOUTME: a named aggregation over the annual area results, or a value the caller computed. An
// ABOUTME: unresolvable metric is unknown with a reason, never zero and never a silent pass.

import { evaluateAggregation, type AggregationDefinition, type LearningAreaResult } from '../aggregation';
import { formatExact, parseExact } from '../engine';
import type { AnnualAreaResult, AnnualTrace, MetricTrace, MetricUnknownReason, ProgressionContext, SuppliedMetric } from './types';

function unknown(
  metric: string,
  reason: MetricUnknownReason,
  detail: string,
  options: { readonly issue?: string | null; readonly annual?: AnnualTrace | null } = {}
): MetricTrace {
  return {
    metric,
    value: null,
    status: 'unknown',
    source: null,
    reason,
    issue: options.issue ?? null,
    detail,
    annual: options.annual ?? null,
    aggregate: null,
  };
}

function resolved(metric: string, value: string, source: MetricTrace['source'], trace: { annual?: AnnualTrace; aggregate?: MetricTrace['aggregate'] }): MetricTrace {
  return {
    metric,
    value,
    status: 'resolved',
    source,
    reason: null,
    issue: null,
    detail: null,
    annual: trace.annual ?? null,
    aggregate: trace.aggregate ?? null,
  };
}

/** The series trace of an annual metric, when the annual result carries one. */
function fromArea(metric: string, area: AnnualAreaResult): MetricTrace {
  if (area.status === 'empty') {
    return unknown(metric, 'annual_empty', `area "${area.code}" has no assessed period`, { annual: area.trace });
  }
  if (area.status === 'incomplete' || area.value === null) {
    return unknown(metric, 'annual_incomplete', `annual result for area "${area.code}" is incomplete`, {
      annual: area.trace,
    });
  }
  const exact = parseExact(area.value);
  if (exact === null) {
    return unknown(metric, 'invalid_value', `area "${area.code}" has a value that is not a decimal`, {
      annual: area.trace,
    });
  }
  return resolved(metric, formatExact(exact), 'annual_area', { annual: area.trace });
}

/** The annual area results as learning-area inputs, with an incomplete area kept visible. */
function aggregationInputs(areas: readonly AnnualAreaResult[]): readonly LearningAreaResult[] {
  return areas.map((area) => {
    const complete = area.status === 'complete' && area.value !== null;
    return {
      code: area.code,
      ...(area.group === null ? {} : { group: area.group }),
      ...(area.coefficient === null ? {} : { coefficient: area.coefficient }),
      ...(complete ? { score: area.value as string } : {}),
      ...(area.grade === null ? {} : { grade: area.grade }),
      ...(area.points === null ? {} : { points: area.points }),
      ...(area.grade_points === null ? {} : { grade_points: area.grade_points }),
      complete,
      ...(area.status === 'empty' ? { exempt: true } : {}),
    };
  });
}

/** Runs a named aggregation over the annual area results. */
function fromAggregation(
  metric: string,
  aggregation: AggregationDefinition,
  context: ProgressionContext
): MetricTrace {
  if (context.annual === undefined) {
    return unknown(metric, 'no_annual_result', 'no annual result is in scope');
  }
  const evaluation = evaluateAggregation(aggregation, aggregationInputs(context.annual.areas), {
    ...(context.scales === undefined ? {} : { scales: context.scales }),
  });
  if (!evaluation.ok) {
    return unknown(
      metric,
      'aggregation_rejected',
      `aggregation "${aggregation.code}" was refused: ${evaluation.issues
        .map((entry) => `${entry.code} at ${entry.path}`)
        .join(', ')}`,
      { issue: evaluation.issues[0]?.code ?? null }
    );
  }
  const result = evaluation.result;
  if (result.status !== 'complete' || result.value === null) {
    return {
      metric,
      value: result.value,
      status: 'unknown',
      source: null,
      reason: 'aggregation_incomplete',
      issue: result.flags.length > 0 ? result.flags.map((flag) => flag.code).join(', ') : null,
      detail: `aggregation "${aggregation.code}" produced a ${result.status} result`,
      annual: null,
      aggregate: result.trace,
    };
  }
  return resolved(metric, result.value, 'annual_aggregation', { aggregate: result.trace });
}

/** Reads a caller-supplied metric as exact text. */
function fromSupplied(metric: string, supplied: SuppliedMetric, detail: string | null): MetricTrace {
  if (supplied.complete === false || supplied.value === undefined || supplied.value === null) {
    return unknown(metric, 'supplied_incomplete', supplied.detail ?? detail ?? 'the supplied metric has no value');
  }
  const exact = parseExact(supplied.value);
  if (exact === null) {
    return unknown(metric, 'invalid_value', supplied.detail ?? 'the supplied metric is not a decimal');
  }
  return {
    metric,
    value: formatExact(exact),
    status: 'resolved',
    source: 'supplied',
    reason: null,
    issue: null,
    detail: supplied.detail ?? detail,
    annual: null,
    aggregate: null,
  };
}

/**
 * Resolves an annual metric, returning null when the name is not an annual path this module owns.
 *
 * Resolution order is fixed: `average`, then a learning-area code, then a declared aggregation.
 * An area code wins over an aggregation code of the same name because the area is the narrower
 * declaration.
 */
function fromAnnual(metric: string, name: string, context: ProgressionContext): MetricTrace | null {
  if (context.annual === undefined) {
    return unknown(metric, 'no_annual_result', 'no annual result is in scope');
  }
  if (name === 'average') {
    const series = context.annual.average;
    if (series.status === 'empty') {
      return unknown(metric, 'annual_empty', 'the annual average has no assessed period', { annual: series.trace });
    }
    if (series.status === 'incomplete' || series.value === null) {
      return unknown(metric, 'annual_incomplete', 'the annual average is incomplete', { annual: series.trace });
    }
    return resolved(metric, series.value, 'annual_average', { annual: series.trace });
  }

  const area = context.annual.areas.find((entry) => entry.code === name);
  if (area !== undefined) return fromArea(metric, area);

  const aggregation = context.aggregations?.find((entry) => entry.code === name);
  if (aggregation !== undefined) return fromAggregation(metric, aggregation, context);

  return null;
}

/**
 * Resolves one condition metric.
 *
 * A supplied metric may fill a gap the built-in paths could not close, but it can never replace a
 * value the annual aggregator resolved: the built-in answer wins whenever it exists.
 */
export function resolveMetric(metric: string, context: ProgressionContext): MetricTrace {
  const parts = metric.split('.');
  if (parts.length === 2 && parts[0] === 'annual') {
    const built = fromAnnual(metric, parts[1], context);
    if (built !== null && built.status === 'resolved') return built;
    const supplied = context.metrics?.[metric];
    if (supplied !== undefined) {
      const detail = built === null ? null : `built-in metric unavailable: ${built.reason ?? 'unknown'}`;
      return fromSupplied(metric, supplied, detail);
    }
    if (built !== null) return built;
  }

  const supplied = context.metrics?.[metric];
  if (supplied !== undefined) return fromSupplied(metric, supplied, null);

  if (parts.length !== 2 || parts[0] !== 'annual') {
    return unknown(
      metric,
      'unsupported_scope',
      `metric scope "${parts[0] ?? ''}" is not resolved here; supply it through context.metrics`
    );
  }
  return unknown(metric, 'unknown_metric', `no annual average, area or aggregation is named "${parts[1]}"`);
}
