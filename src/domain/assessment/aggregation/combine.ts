// ABOUTME: Combining the values an aggregation consumed: the multiplier each area carries, the
// ABOUTME: multiplied value the aggregate counts, and the divisor - declared, the total of the
// ABOUTME: multipliers, or the operator's own - that the aggregate is divided by.

import { ONE, formatExact, multiplyExact, parseExact, sumExact, type Exact } from '../engine';
import type { ScopedArea } from './inputs';
import type {
  ConsumedValue,
  DivisorSource,
  PreparedAggregation,
  TracePart,
  WeightedTracePart,
} from './types';

/** One consumed area with its multiplier, its multiplied value and its weight. */
export interface CountedArea {
  readonly code: string;
  readonly base: Exact;
  readonly multiplier: Exact;
  readonly multiplied: Exact;
  readonly weight: Exact | null;
}

/** The multiplier a definition declares for one area, one when it declares none. */
export function multiplierOf(aggregation: PreparedAggregation, code: string): Exact {
  const text = aggregation.multipliers?.[code];
  return text === undefined ? ONE : (parseExact(text) as Exact);
}

/** Applies the declared multiplier to one consumed area before the aggregate is formed. */
export function countedArea(
  aggregation: PreparedAggregation,
  entry: ScopedArea & { readonly exact: Exact },
  weight: Exact | null
): CountedArea {
  const multiplier = multiplierOf(aggregation, entry.code);
  return {
    code: entry.code,
    base: entry.exact,
    multiplier,
    multiplied: multiplyExact(entry.exact, multiplier),
    weight,
  };
}

export function tracePartOf(area: CountedArea): TracePart {
  return {
    code: area.code,
    value: formatExact(area.base),
    multiplier: formatExact(area.multiplier),
    multiplied: formatExact(area.multiplied),
  };
}

export function weightedPartOf(area: CountedArea): WeightedTracePart {
  return { ...tracePartOf(area), weight: formatExact(area.weight as Exact) };
}

export function consumedOfArea(area: CountedArea): ConsumedValue {
  return {
    code: area.code,
    value: formatExact(area.base),
    weight: area.weight === null ? null : formatExact(area.weight),
    multiplier: formatExact(area.multiplier),
    multiplied: formatExact(area.multiplied),
  };
}

/**
 * The divisor the aggregate is divided by, and where it came from.
 *
 * A declared divisor always wins - including one declared without multipliers, which the contract
 * allows and which overrides the natural divisor a mean or a sum would use. `sum_of_multipliers` is
 * the total of the multipliers the run actually applied, so it reproduces the weighted-mean form of
 * a rule like Attainment 8, where eight results can total ten after English and mathematics double.
 */
export function divisorOf(
  aggregation: PreparedAggregation,
  areas: readonly CountedArea[],
  natural: { readonly value: Exact; readonly from: DivisorSource }
): { readonly value: Exact; readonly from: DivisorSource } {
  const declared = aggregation.divisor;
  if (declared === undefined) return natural;
  if (declared === 'sum_of_multipliers') {
    return { value: sumExact(areas.map((area) => area.multiplier)), from: 'sum_of_multipliers' };
  }
  return { value: parseExact(declared) as Exact, from: 'declared' };
}
