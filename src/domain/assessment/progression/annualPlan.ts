// ABOUTME: Reading the periods an annual series consumes and deciding what the missing policy does
// ABOUTME: with each one: which periods carry a value, which are reweighted away, which are zeroed or
// ABOUTME: carried, and which stop the annual result from being published at all.

import { ONE, ZERO, compareExact, divideExact, formatExact, parseExact, sumExact, type Exact } from '../engine';
import type {
  AnnualIssue,
  AnnualIssueCode,
  AnnualMissingEntry,
  AnnualPeriodGap,
  AnnualPeriodInput,
  AnnualPeriodTreatment,
  AnnualPeriodWeight,
  AnnualSeriesInput,
  AnnualWeightTrace,
  PreparedAnnual,
} from './types';

export function annualIssue(code: AnnualIssueCode, path: string, detail: string): AnnualIssue {
  return { code, path, detail };
}

/** One period the arithmetic consumes, with the weight actually applied. */
export interface AnnualUsablePeriod {
  readonly code: string;
  readonly value: string;
  readonly weight: string | null;
  readonly source: 'declared' | 'zero' | 'carried';
  readonly carried_from: string | null;
}

/** The population decisions of one annual series, before any arithmetic runs. */
export interface AnnualPeriodPlan {
  readonly entries: readonly AnnualMissingEntry[];
  /** Supplied periods the definition does not cover. */
  readonly ignored: readonly string[];
  /** Periods of the declared population the operator itself ignores (`final_period_only`). */
  readonly op_ignored: readonly string[];
  readonly weights: readonly AnnualWeightTrace[];
  readonly usable: readonly AnnualUsablePeriod[];
  readonly declared_weights_total: string | null;
  readonly effective_weights_total: string | null;
  readonly renormalised: boolean;
  readonly blocked: boolean;
  readonly blocked_status: 'incomplete' | 'empty' | null;
}

/**
 * Validates and normalises the periods of one series.
 *
 * A value is kept as canonical exact text so the arithmetic and the trace never disagree about
 * how a mark was written; an unparseable value is an issue naming its position, not a zero.
 */
export function readSeriesInputs(
  periods: readonly AnnualPeriodInput[],
  issues: AnnualIssue[]
): readonly AnnualSeriesInput[] | null {
  const seen = new Set<string>();
  const inputs: AnnualSeriesInput[] = [];
  let usable = true;

  periods.forEach((period, index) => {
    if (typeof period.code !== 'string' || period.code.trim().length === 0) {
      issues.push(annualIssue('invalid_periods', `periods[${index}].code`, 'a period needs a non-empty code'));
      usable = false;
      return;
    }
    if (seen.has(period.code)) {
      issues.push(annualIssue('duplicate_period', `periods[${index}].code`, `period "${period.code}" appears twice`));
      usable = false;
    }
    seen.add(period.code);

    let value: string | null = null;
    if (period.value !== undefined && period.value !== null) {
      if (typeof period.value !== 'string') {
        issues.push(
          annualIssue('invalid_period_value', `periods[${index}].value`, `period "${period.code}" has a non-text value`)
        );
        usable = false;
      } else {
        const exact = parseExact(period.value);
        if (exact === null) {
          issues.push(
            annualIssue(
              'invalid_period_value',
              `periods[${index}].value`,
              `period "${period.code}" has a value that is not a decimal`
            )
          );
          usable = false;
        } else {
          value = formatExact(exact);
        }
      }
    }

    for (const field of ['complete', 'exempt'] as const) {
      if (period[field] !== undefined && typeof period[field] !== 'boolean') {
        issues.push(
          annualIssue('invalid_periods', `periods[${index}].${field}`, `${field} must be a boolean when declared`)
        );
        usable = false;
      }
    }

    inputs.push({
      code: period.code,
      value,
      complete: period.complete ?? true,
      exempt: period.exempt ?? false,
    });
  });

  return usable ? inputs : null;
}

/** The sum of the declared weights of a weighted mean, as exact text, or null for another operator. */
function declaredTotal(definition: PreparedAnnual): string | null {
  if (definition.op !== 'weighted_mean') return null;
  const weights = definition.periods.map((period) =>
    period.weight === null ? ZERO : (parseExact(period.weight) as Exact)
  );
  return formatExact(sumExact(weights));
}

/**
 * Applies the missing policy to the declared population.
 *
 * The order is the declared order: `carry_previous` therefore reaches the nearest earlier period
 * and a carried value can serve the next gap, which is what "carry the previous period forward"
 * means. A gap that cannot be carried, or any gap under `incomplete`, blocks the result; nothing
 * is renormalised into a score the periods do not support.
 */
export function planPeriods(
  definition: PreparedAnnual,
  inputs: readonly AnnualSeriesInput[],
  issues: AnnualIssue[]
): AnnualPeriodPlan | null {
  const declared: readonly AnnualPeriodWeight[] =
    definition.periods.length > 0
      ? definition.periods
      : inputs.map((input) => ({ code: input.code, weight: null }));

  const byCode = new Map(inputs.map((input) => [input.code, input]));
  const declaredCodes = new Set(declared.map((period) => period.code));
  const ignored = inputs.filter((input) => !declaredCodes.has(input.code)).map((input) => input.code);

  const active =
    definition.op === 'final_period_only' && declared.length > 0
      ? [declared[declared.length - 1]]
      : declared;
  const opIgnored =
    definition.op === 'final_period_only' && declared.length > 0
      ? declared.slice(0, -1).map((period) => period.code)
      : [];

  const entries: AnnualMissingEntry[] = [];
  const usable: AnnualUsablePeriod[] = [];
  let lastUsable: AnnualUsablePeriod | null = null;
  let blocked = false;
  let blockedStatus: 'incomplete' | 'empty' | null = null;

  // `final_period_only` counts one period, but `carry_previous` still means the nearest earlier
  // period: seed the carry source from the periods the operator otherwise ignores.
  if (definition.op === 'final_period_only' && definition.missing === 'carry_previous' && active.length === 1) {
    for (let index = declared.length - 2; index >= 0; index -= 1) {
      const input = byCode.get(declared[index].code);
      if (input !== undefined && !input.exempt && input.complete && input.value !== null) {
        lastUsable = {
          code: input.code,
          value: input.value,
          weight: declared[index].weight,
          source: 'declared',
          carried_from: null,
        };
        break;
      }
    }
  }

  const gap = (period: AnnualPeriodWeight, reason: AnnualPeriodGap): void => {
    const base = { code: period.code, reason, weight: period.weight, carried_from: null };
    const treatmentFor = (treatment: AnnualPeriodTreatment, value: string | null): AnnualMissingEntry => ({
      ...base,
      treatment,
      value,
    });

    if (definition.missing === 'renormalise') {
      entries.push(treatmentFor('excluded', null));
      return;
    }
    if (definition.missing === 'zero') {
      const zeroed: AnnualUsablePeriod = {
        code: period.code,
        value: '0',
        weight: period.weight,
        source: 'zero',
        carried_from: null,
      };
      entries.push(treatmentFor('zero', '0'));
      usable.push(zeroed);
      lastUsable = zeroed;
      return;
    }
    if (definition.missing === 'carry_previous') {
      if (lastUsable === null) {
        entries.push(treatmentFor('blocked', null));
        blocked = true;
        blockedStatus = 'incomplete';
        return;
      }
      const carried: AnnualUsablePeriod = {
        code: period.code,
        value: lastUsable.value,
        weight: period.weight,
        source: 'carried',
        carried_from: lastUsable.code,
      };
      entries.push({ ...treatmentFor('carry', lastUsable.value), carried_from: lastUsable.code });
      usable.push(carried);
      lastUsable = carried;
      return;
    }
    entries.push(treatmentFor('blocked', null));
    blocked = true;
    blockedStatus = 'incomplete';
  };

  for (const period of active) {
    const input = byCode.get(period.code);
    if (input === undefined) {
      gap(period, 'absent');
      continue;
    }
    if (input.exempt) {
      entries.push({
        code: period.code,
        reason: 'exempt',
        treatment: 'exempt',
        value: null,
        carried_from: null,
        weight: period.weight,
      });
      continue;
    }
    if (!input.complete) {
      gap(period, 'incomplete');
      continue;
    }
    if (input.value === null) {
      gap(period, 'no_result');
      continue;
    }
    const consumed: AnnualUsablePeriod = {
      code: period.code,
      value: input.value,
      weight: period.weight,
      source: 'declared',
      carried_from: null,
    };
    usable.push(consumed);
    lastUsable = consumed;
  }

  if (active.length === 0) {
    blocked = true;
    blockedStatus = 'empty';
  } else if (usable.length === 0 && !blocked) {
    blocked = true;
    blockedStatus = 'empty';
  }

  // ---- weights: only a weighted mean applies them. Exempt periods are always excluded and the
  // remaining weights renormalised, whatever the missing policy says; a gap is renormalised only
  // when the policy declares it, because `zero` and `carry_previous` keep every declared weight.
  let weighted = usable;
  let renormalised = false;
  let effectiveTotal: string | null = null;
  const hasExempt = entries.some((entry) => entry.reason === 'exempt');
  if (definition.op === 'weighted_mean' && !blocked) {
    const declaredWeights = weighted.map((period) =>
      period.weight === null ? ZERO : (parseExact(period.weight) as Exact)
    );
    const usableTotal = sumExact(declaredWeights);
    if (compareExact(usableTotal, ZERO) === 0) {
      issues.push(
        annualIssue(
          'zero_total_weight',
          'of',
          'the weights of the periods that carry a result sum to zero'
        )
      );
      return null;
    }
    renormalised =
      (definition.missing === 'renormalise' || hasExempt) && compareExact(usableTotal, ONE) !== 0;
    weighted = usable.map((period, index) => {
      const weight = declaredWeights[index];
      const effective = renormalised ? divideExact(weight, usableTotal) : weight;
      return { ...period, weight: formatExact(effective) };
    });
    effectiveTotal = formatExact(
      sumExact(weighted.map((period) => parseExact(period.weight as string) as Exact))
    );
  } else if (definition.op === 'mean') {
    renormalised = (definition.missing === 'renormalise' || hasExempt) && entries.length > 0 && usable.length > 0;
  }

  const weights: AnnualWeightTrace[] = declared.map((period) => {
    if (definition.op !== 'weighted_mean') {
      return { code: period.code, declared: null, effective: null };
    }
    const applied = weighted.find((entry) => entry.code === period.code);
    return {
      code: period.code,
      declared: period.weight,
      effective: applied === undefined ? null : applied.weight,
    };
  });

  return {
    entries,
    ignored,
    op_ignored: opIgnored,
    weights,
    usable: weighted,
    declared_weights_total: declaredTotal(definition),
    effective_weights_total: effectiveTotal,
    renormalised,
    blocked,
    blocked_status: blockedStatus,
  };
}
