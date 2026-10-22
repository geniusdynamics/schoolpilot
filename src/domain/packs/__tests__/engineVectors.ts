// ABOUTME: Projects a pack's loosely typed JSON declarations into the typed definitions the
// ABOUTME: aggregation (B03) and progression (B04) engines accept, so pack tests run those engines.

import {
  AGGREGATION_OPERATORS,
  RESULT_VALUE_FIELDS,
  type AggregationDefinition,
} from '../../assessment/aggregation';
import {
  PROMOTION_RULES,
  THRESHOLD_FALLBACKS,
  type ProgressionDefinition,
  type SuppliedMetric,
} from '../../assessment/progression';

/** The keys each projection maps. Anything else is refused rather than silently dropped. */
const AGGREGATION_FIELDS: readonly string[] = [
  'code',
  'op',
  'value',
  'over',
  'precision',
  'result_scale',
];

const PROMOTION_FIELDS: readonly string[] = [
  'levels',
  'rule',
  'to_stage',
  'requires',
  'conditions',
  'else',
  'suggest',
];

export interface DeclaredAggregation {
  readonly code: string;
  readonly op: string;
  readonly value?: string;
  readonly over?: readonly string[];
  readonly precision?: number;
  readonly result_scale?: string;
}

export interface DeclaredPromotionRule {
  readonly levels: readonly string[];
  readonly rule: string;
  readonly to_stage?: string;
  readonly requires?: readonly string[];
  readonly conditions?: readonly { readonly metric: string; readonly gte: number | string }[];
  readonly else?: string;
  readonly suggest?: { readonly metric: string; readonly gte: number | string };
}

export interface DeclaredProgression {
  readonly progression: readonly DeclaredPromotionRule[];
  readonly graduation?: readonly { readonly levels: readonly string[]; readonly rule: string }[];
}

function mapped<T extends string>(allowed: readonly T[], value: string, what: string): T {
  const match = allowed.find((candidate) => candidate === value);
  if (match === undefined) throw new Error(`${what} "${value}" has no engine mapping`);
  return match;
}

function declaredOnly(value: object, allowed: readonly string[], what: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(`${what} declares "${key}", which this projection does not map yet`);
    }
  }
}

/** The aggregation the pack declares, typed for `evaluateAggregation`. */
export function engineAggregation(aggregation: DeclaredAggregation): AggregationDefinition {
  declaredOnly(aggregation, AGGREGATION_FIELDS, `aggregation ${aggregation.code}`);
  return {
    code: aggregation.code,
    op: mapped(AGGREGATION_OPERATORS, aggregation.op, `aggregation ${aggregation.code} op`),
    ...(aggregation.value === undefined
      ? {}
      : {
          value: mapped(
            RESULT_VALUE_FIELDS,
            aggregation.value,
            `aggregation ${aggregation.code} value`
          ),
        }),
    ...(aggregation.over === undefined ? {} : { over: aggregation.over }),
    ...(aggregation.precision === undefined ? {} : { precision: aggregation.precision }),
    ...(aggregation.result_scale === undefined ? {} : { result_scale: aggregation.result_scale }),
  };
}

/** The progression document the pack declares, typed for `evaluateProgression`. */
export function progressionDefinition(progression: DeclaredProgression): ProgressionDefinition {
  return {
    progression: progression.progression.map((rule) => {
      declaredOnly(rule, PROMOTION_FIELDS, `promotion rule for ${rule.levels.join(', ')}`);
      return {
        levels: rule.levels,
        rule: mapped(PROMOTION_RULES, rule.rule, 'promotion rule kind'),
        ...(rule.to_stage === undefined ? {} : { to_stage: rule.to_stage }),
        ...(rule.requires === undefined ? {} : { requires: rule.requires }),
        ...(rule.conditions === undefined ? {} : { conditions: rule.conditions }),
        ...(rule.else === undefined
          ? {}
          : { else: mapped(THRESHOLD_FALLBACKS, rule.else, 'threshold fallback') }),
        ...(rule.suggest === undefined ? {} : { suggest: rule.suggest }),
      };
    }),
    ...(progression.graduation === undefined
      ? {}
      : {
          graduation: progression.graduation.map((rule) => {
            declaredOnly(rule, ['levels', 'rule'], `graduation rule for ${rule.levels.join(', ')}`);
            if (rule.rule !== 'graduate') {
              throw new Error(`graduation rule for ${rule.levels.join(', ')} is not "graduate"`);
            }
            return { levels: rule.levels, rule: 'graduate' as const };
          }),
        }),
  };
}

/**
 * The metrics a progression vector supplies, keyed both bare and under `annual.`.
 *
 * A vector states the metric value directly, the same way the conformance runner hands it over:
 * `gcse_points_total: 24` fills `annual.gcse_points_total` without inventing an annual result.
 */
export function suppliedMetrics(
  input: Readonly<Record<string, unknown>>
): Record<string, SuppliedMetric> {
  const metrics: Record<string, SuppliedMetric> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'leaving_level') continue;
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(`vector input ${key} is not a metric value`);
    }
    metrics[key] = { value: String(value), complete: true };
    metrics[`annual.${key}`] = { value: String(value), complete: true };
  }
  return metrics;
}
