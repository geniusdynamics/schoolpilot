// ABOUTME: Validation and preparation for the period-to-annual rule of spec 03 section 4.1: turn a
// ABOUTME: pack's annual block into the prepared form the evaluator and the trace read, resolving
// ABOUTME: the missing-policy and rounding defaults and refusing only a rule that cannot run.

import { MAX_PRECISION, ONE, ROUNDING_MODES, ZERO, compareExact, formatExact, parseExact, sumExact, type Exact, type RoundingMode } from '../engine';
import { decimalOfNumber } from './decimal';
import { ANNUAL_MISSING_POLICIES, ANNUAL_OPERATORS } from './types';
import type {
  AnnualDefinition,
  AnnualIssue,
  AnnualIssueCode,
  AnnualMissingPolicy,
  AnnualOperator,
  AnnualPeriodWeight,
  PreparedAnnual,
} from './types';

/** A JSON number or exact decimal string as an exact value, or null. */
function exactWeight(value: unknown): Exact | null {
  if (typeof value === 'number') {
    const decimal = decimalOfNumber(value);
    return decimal === null ? null : parseExact(decimal);
  }
  if (typeof value === 'string') return parseExact(value);
  return null;
}

export function annualIssue(code: AnnualIssueCode, path: string, detail: string): AnnualIssue {
  return { code, path, detail };
}

const isOperator = (value: unknown): value is AnnualOperator => ANNUAL_OPERATORS.some((op) => op === value);

const isMissingPolicy = (value: unknown): value is AnnualMissingPolicy =>
  ANNUAL_MISSING_POLICIES.some((policy) => policy === value);

const isRoundingMode = (value: unknown): value is RoundingMode => ROUNDING_MODES.some((mode) => mode === value);

/** A non-empty string, or null when the value cannot be a period code. */
function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/** Reads the declared population and, for a weighted mean, its weights. */
function readPeriods(
  definition: AnnualDefinition,
  operator: AnnualOperator,
  issues: AnnualIssue[]
): readonly AnnualPeriodWeight[] {
  const of = definition.of;

  if (of === undefined) {
    if (operator === 'weighted_mean') {
      issues.push(
        annualIssue('missing_periods', 'of', 'weighted_mean needs a map of period code to weight')
      );
    }
    return [];
  }

  if (Array.isArray(of)) {
    if (of.length === 0) {
      issues.push(annualIssue('missing_periods', 'of', 'of must name at least one period'));
      return [];
    }
    if (operator === 'weighted_mean') {
      issues.push(
        annualIssue('invalid_weights', 'of', 'weighted_mean needs a map of period code to weight, not a list')
      );
    }
    const codes: string[] = [];
    of.forEach((raw, index) => {
      const code = textOf(raw);
      if (code === null) {
        issues.push(annualIssue('invalid_periods', `of[${index}]`, 'a period code must be a non-empty string'));
        return;
      }
      if (codes.includes(code)) {
        issues.push(annualIssue('duplicate_period', `of[${index}]`, `period "${code}" is named twice`));
        return;
      }
      codes.push(code);
    });
    return codes.map((code) => ({ code, weight: null }));
  }

  if (typeof of === 'object' && of !== null) {
    const entries = Object.entries(of as Record<string, unknown>);
    if (entries.length === 0) {
      issues.push(annualIssue('missing_periods', 'of', 'of must name at least one period'));
      return [];
    }
    const periods: AnnualPeriodWeight[] = [];
    const weights: Exact[] = [];
    for (const [code, raw] of entries) {
      if (code.trim().length === 0) {
        issues.push(annualIssue('invalid_periods', 'of', 'a period code must be a non-empty string'));
        continue;
      }
      if (operator !== 'weighted_mean') {
        periods.push({ code, weight: null });
        continue;
      }
      const weight = exactWeight(raw);
      if (weight === null) {
        issues.push(
          annualIssue('invalid_weight', `of.${code}`, 'a period weight must be a decimal or an exact fraction')
        );
        continue;
      }
      if (compareExact(weight, ZERO) < 0 || compareExact(weight, ONE) > 0) {
        issues.push(annualIssue('invalid_weight', `of.${code}`, 'a period weight must be between 0 and 1'));
        continue;
      }
      periods.push({ code, weight: formatExact(weight) });
      weights.push(weight);
    }
    if (operator === 'weighted_mean' && weights.length === periods.length) {
      const total = sumExact(weights);
      if (compareExact(total, ONE) !== 0) {
        issues.push(
          annualIssue(
            'weights_not_unit',
            'of',
            `the period weights sum to ${formatExact(total)}; a weighted mean needs exactly 1`
          )
        );
      }
    }
    return periods;
  }

  issues.push(annualIssue('invalid_periods', 'of', 'of must be a list of period codes or a map of weights'));
  return [];
}

export type AnnualPreparation =
  | { readonly ok: true; readonly annual: PreparedAnnual }
  | { readonly ok: false; readonly issues: readonly AnnualIssue[] };

/**
 * Validates an annual definition and resolves its defaults.
 *
 * Only the fields the named operator reads are validated: the schema allows `n` and `of` on every
 * operator, so a field this operator ignores is ignored rather than refused. The defaults a trace
 * depends on are resolved here - `missing` to `incomplete`, `mode` to `half_up` - so replay never
 * has to guess them. `incomplete` is the default because it is the only policy that cannot publish
 * a score the periods do not support.
 */
export function prepareAnnual(definition: AnnualDefinition): AnnualPreparation {
  const issues: AnnualIssue[] = [];

  if (!isOperator(definition.op)) {
    issues.push(annualIssue('unsupported_op', 'op', `unknown annual operator "${String(definition.op)}"`));
    return { ok: false, issues };
  }
  const operator = definition.op;

  let missing: AnnualMissingPolicy = 'incomplete';
  if (definition.missing !== undefined) {
    if (!isMissingPolicy(definition.missing)) {
      issues.push(
        annualIssue('invalid_missing_policy', 'missing', `unknown missing policy "${String(definition.missing)}"`)
      );
    } else {
      missing = definition.missing;
    }
  }

  let precision: number | null = null;
  if (definition.precision !== undefined) {
    if (
      typeof definition.precision !== 'number' ||
      !Number.isInteger(definition.precision) ||
      definition.precision < 0 ||
      definition.precision > MAX_PRECISION
    ) {
      issues.push(
        annualIssue('invalid_precision', 'precision', `precision must be an integer between 0 and ${MAX_PRECISION}`)
      );
    } else {
      precision = definition.precision;
    }
  }

  let mode: RoundingMode = 'half_up';
  if (definition.mode !== undefined) {
    if (!isRoundingMode(definition.mode)) {
      issues.push(annualIssue('invalid_rounding_mode', 'mode', `unknown rounding mode "${String(definition.mode)}"`));
    } else {
      mode = definition.mode;
    }
  }

  const periods = readPeriods(definition, operator, issues);

  let n: number | null = null;
  if (operator === 'best_of') {
    if (typeof definition.n !== 'number' || !Number.isInteger(definition.n) || definition.n < 1) {
      issues.push(annualIssue('invalid_n', 'n', 'best_of needs an integer n of at least one'));
    } else if (periods.length > 0 && definition.n > periods.length) {
      issues.push(
        annualIssue(
          'invalid_n',
          'n',
          `best_of keeps ${definition.n} periods but the rule declares only ${periods.length}`
        )
      );
    } else {
      n = definition.n;
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    annual: {
      op: operator,
      periods,
      missing,
      mode,
      ...(n === null ? {} : { n }),
      ...(precision === null ? {} : { precision }),
    },
  };
}
