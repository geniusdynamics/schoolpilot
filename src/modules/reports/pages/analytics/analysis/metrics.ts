// ABOUTME: Exact summary arithmetic for analysis: the mean of the values a cohort produced and the
// ABOUTME: distribution of bands, both in the engine's exact vocabulary so a mean never becomes a
// ABOUTME: float and an unbanded result is counted rather than hidden.

import {
  divideExact,
  formatExact,
  fromInteger,
  parseExact,
  sumExact,
  type Exact,
} from '@/domain/assessment/engine';

import type { BandCount, CohortSummary } from './types';

/** The band code a distribution counts under when a result carried no band. */
export const UNGRADED_CODE = 'ungraded';

/** The label the unbanded bucket is shown under. */
export const UNGRADED_LABEL = 'No band awarded';

/** The exact mean of the decimal values, or null when there is nothing to average. */
export function meanOf(values: readonly string[]): string | null {
  const exacts = values.map(parseExact).filter((value): value is Exact => value !== null);
  if (exacts.length === 0) return null;
  return formatExact(divideExact(sumExact(exacts), fromInteger(BigInt(exacts.length))));
}

/** A band of the scale a distribution counts against. */
export interface DistributionBand {
  readonly code: string;
  readonly label: string;
}

/**
 * Counts the band codes in the scale's own order.
 *
 * A code the scale does not declare keeps its own row rather than being folded into a neighbour,
 * and a null code - a complete result the scale had no band for - is counted under one bucket so it
 * is visible in the total.
 */
export function distributionOf(
  codes: readonly (string | null)[],
  order: readonly DistributionBand[]
): BandCount[] {
  const counts = new Map<string | null, number>();
  for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1);

  const rows: BandCount[] = [];
  const seen = new Set<string | null>();
  for (const band of order) {
    seen.add(band.code);
    rows.push({ code: band.code, label: band.label, count: counts.get(band.code) ?? 0 });
  }

  const undeclared = [...counts.entries()]
    .filter(([code]) => code !== null && !seen.has(code))
    .sort(([left], [right]) => (left as string).localeCompare(right as string));
  for (const [code, count] of undeclared) {
    rows.push({ code: code as string, label: code as string, count });
  }

  const ungraded = counts.get(null);
  if (ungraded !== undefined) {
    rows.push({ code: UNGRADED_CODE, label: UNGRADED_LABEL, count: ungraded });
  }
  return rows;
}

/**
 * Summarises a population of results: the mean over those that have one, and the count of those
 * that do not. The missing count is carried, never discarded, so a partial cohort stays visible.
 *
 * The distribution counts only the results that exist: a learner with no result is reported as
 * missing, not as a band the scale had no place for.
 */
export function summarise(
  values: readonly (string | null)[],
  codes: readonly (string | null)[],
  order: readonly DistributionBand[]
): CohortSummary {
  const present: string[] = [];
  const presentCodes: (string | null)[] = [];
  values.forEach((value, index) => {
    if (value === null) return;
    present.push(value);
    presentCodes.push(codes[index] ?? null);
  });
  return {
    withResult: present.length,
    missing: values.length - present.length,
    total: values.length,
    mean: meanOf(present),
    distribution: distributionOf(presentCodes, order),
  };
}
