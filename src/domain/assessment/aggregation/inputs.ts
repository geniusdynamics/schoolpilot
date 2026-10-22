// ABOUTME: Reading the learning-area results an aggregation consumes: validating their codes and
// ABOUTME: weights, scoping them to the areas the definition covers, resolving the result scale, and
// ABOUTME: turning each one into the exact value the operator combines or the reason it has none.

import { parseExact, type Exact } from '../engine';
import { prepareGradingScale } from '../scales';
import type { GradingScaleDefinition, PreparedGradingScale } from '../scales';
import type {
  AggregateFlag,
  AggregateFlagCode,
  AggregationContext,
  AggregationIssue,
  AggregationIssueCode,
  LearningAreaResult,
  PreparedAggregation,
  ResultValueField,
} from './types';

// ----------------------------------------------------------------- diagnostics

export function issue(code: AggregationIssueCode, path: string, detail: string): AggregationIssue {
  return { code, path, detail };
}

export function flag(code: AggregateFlagCode, area: string | null): AggregateFlag {
  return { code, area };
}

// ---------------------------------------------------------------------- values

/** The path a field is reported under; `score_20` reads `score`. */
function fieldPath(field: ResultValueField): string {
  return field === 'score_20' ? 'score' : field;
}

/** The field one area carries, or undefined when it has none. */
function rawValue(area: LearningAreaResult, field: ResultValueField): string | undefined {
  switch (field) {
    case 'grade':
      return area.grade;
    case 'points':
      return area.points;
    case 'grade_points':
      return area.grade_points;
    case 'rubric_level':
      return area.rubric_level;
    case 'score':
    case 'score_20':
      return area.score;
  }
}

/** One area as the operator saw it, or the reason it contributed nothing. */
export interface ScopedArea {
  readonly code: string;
  readonly group: string | null;
  /** The value as entered; null when the area has no usable value. */
  readonly text: string | null;
  readonly exact: Exact | null;
}

export function validateInputs(inputs: readonly LearningAreaResult[], issues: AggregationIssue[]): void {
  const seen = new Set<string>();
  inputs.forEach((area, index) => {
    if (typeof area.code !== 'string' || area.code.trim().length === 0) {
      issues.push(issue('invalid_area_code', `inputs[${index}].code`, 'a learning area needs a non-empty code'));
      return;
    }
    if (seen.has(area.code)) {
      issues.push(issue('duplicate_area', `inputs[${index}].code`, `area "${area.code}" appears twice`));
    }
    seen.add(area.code);
    for (const field of ['coefficient', 'credit'] as const) {
      const text = area[field];
      if (text === undefined) continue;
      const parsed = parseExact(text);
      if (parsed === null || parsed.numerator < 0n) {
        issues.push(
          issue(
            field === 'coefficient' ? 'invalid_coefficient' : 'invalid_credit',
            `inputs[${index}].${field}`,
            `area "${area.code}" has a ${field} that is not a non-negative decimal`
          )
        );
      }
    }
  });
}

// ----------------------------------------------------------------------- scale

export function resolveScale(
  aggregation: PreparedAggregation,
  context: AggregationContext,
  issues: AggregationIssue[]
): PreparedGradingScale | null {
  const code = aggregation.result_scale;
  if (code === undefined) return null;
  const definitions: readonly GradingScaleDefinition[] = context.scales ?? [];
  const definition = definitions.find((entry) => entry.code === code);
  if (definition === undefined) {
    issues.push(issue('unknown_result_scale', 'result_scale', `no scale "${code}" is in scope`));
    return null;
  }
  const prepared = prepareGradingScale(definition);
  if (!prepared.ok) {
    const codes = prepared.issues.map((entry) => `${entry.code} at ${entry.path}`).join(', ');
    issues.push(issue('invalid_scale', 'result_scale', `scale "${code}" does not prepare: ${codes}`));
    return null;
  }
  return prepared.scale;
}

/**
 * The scale's bands from best to worst, for a `fail_if` cap.
 *
 * A pack declares its bands best first - the spec's examples and every pack in this repository do,
 * and a cap like "at most Division IV" is only meaningful in that order. The order is recorded in
 * the trace, so a reader can check the comparison the cap made.
 */
export function qualityOrder(
  scale: PreparedGradingScale | null,
  aggregation: PreparedAggregation,
  issues: AggregationIssue[]
): readonly string[] | null {
  const rule = aggregation.fail_if;
  if (rule === undefined || scale === null) return null;
  const order = scale.bands.map((band) => band.code);
  if (!order.includes(rule.then_max_division)) {
    issues.push(
      issue('unknown_cap_band', 'fail_if.then_max_division', `scale "${scale.code}" has no band "${rule.then_max_division}"`)
    );
    return null;
  }
  return order;
}

// --------------------------------------------------------------------- scoping

/**
 * The areas this aggregation covers, in the order the definition states them.
 *
 * `over` fixes the population and the order a report shows; without it every non-exempt input is a
 * candidate. An area `over` names but the learner has no result for stays in the list with no
 * value, so a missing result is reported rather than quietly shrinking the denominator.
 */
export function scopedAreas(
  aggregation: PreparedAggregation,
  inputs: readonly LearningAreaResult[],
  field: ResultValueField,
  issues: AggregationIssue[],
  flags: AggregateFlag[]
): readonly ScopedArea[] {
  // A count or a distribution is defined over the areas that carry the field; every other operator
  // needs a value from each area it covers, so an absent one is a gap worth reporting.
  const requiresValue = aggregation.op !== 'count_where' && aggregation.op !== 'rubric_profile';
  const byCode = new Map(inputs.map((area) => [area.code, area]));
  const wanted: readonly { readonly code: string; readonly area: LearningAreaResult | null; readonly index: number }[] =
    aggregation.over === undefined
      ? inputs.map((area, index) => ({ code: area.code, area, index }))
      : aggregation.over.map((code) => ({ code, area: byCode.get(code) ?? null, index: -1 }));

  const scoped: ScopedArea[] = [];
  for (const entry of wanted) {
    const area = entry.area;
    const group = area?.group ?? null;
    if (area === null) {
      flags.push(flag('missing_value', entry.code));
      scoped.push({ code: entry.code, group, text: null, exact: null });
      continue;
    }
    if (area.exempt === true) {
      flags.push(flag('exempt_area', area.code));
      continue;
    }
    if (area.complete === false) {
      flags.push(flag('missing_value', area.code));
      scoped.push({ code: area.code, group, text: null, exact: null });
      continue;
    }
    const raw = rawValue(area, field);
    if (raw === undefined) {
      if (requiresValue) flags.push(flag('missing_value', area.code));
      scoped.push({ code: area.code, group, text: null, exact: null });
      continue;
    }
    if (field === 'grade') {
      scoped.push({ code: area.code, group, text: raw, exact: null });
      continue;
    }
    const exact = parseExact(raw);
    if (exact === null) {
      const path = entry.index < 0 ? `over.${area.code}` : `inputs[${entry.index}].${fieldPath(field)}`;
      issues.push(issue('invalid_area_value', path, `area "${area.code}" has a ${field} that is not a decimal`));
      scoped.push({ code: area.code, group, text: null, exact: null });
      continue;
    }
    scoped.push({ code: area.code, group, text: raw, exact });
  }
  return scoped;
}

export const hasValue = (entry: ScopedArea): entry is ScopedArea & { readonly exact: Exact } => entry.exact !== null;
