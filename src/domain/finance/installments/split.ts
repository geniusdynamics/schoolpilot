// ABOUTME: The rules an installment plan splits a total by: an equal split through the money
// ABOUTME: module's largest-remainder allocator, and a percentage split through its rational multiply
// ABOUTME: with a named rounding mode. Both always sum to the total exactly.

import {
  add,
  allocate,
  allocateEqually,
  isNegative,
  isZero,
  multiplyRational,
  subtract,
  sum,
  type Money,
  type RoundingMode,
} from '@/domain/money';

import { InstallmentError } from './errors';

/** The rounding rule a percentage split uses when a caller does not name one. */
export const DEFAULT_INSTALLMENT_ROUNDING: RoundingMode = 'half_up';

/** The number of basis points in a whole. A percent is held in basis points so it is an integer. */
const BASIS_POINTS = 10_000;

/**
 * Reads a percentage as whole basis points, refusing one that needs more than two decimals.
 *
 * A percent is scaled by 100 (7.5% is 750 basis points), and the rational multiply the split uses
 * takes integers only, so a percent with a third decimal cannot be honoured exactly. It is refused
 * by name rather than rounded silently, the same rule the fee-schedule uplift applies.
 */
export function percentBasisPoints(percent: number): number {
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new InstallmentError(
      'percent_invalid',
      `an installment's percentage must be a number between 0 and 100; got ${String(percent)}`
    );
  }
  const scaled = percent * 100;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-6) {
    throw new InstallmentError(
      'percent_precision',
      `the percentage ${String(percent)} needs more than two decimals; a plan holds percentages in basis points`
    );
  }
  return Math.round(scaled);
}

/** Refuses a percentage list that does not sum to exactly 100. */
export function assertPercentagesSumToWhole(percentages: readonly number[]): void {
  const total = percentages.reduce((running, percent) => running + percentBasisPoints(percent), 0);
  if (total !== BASIS_POINTS) {
    throw new InstallmentError(
      'percentages_do_not_sum',
      `the installments of a plan sum to ${total / 100}%, not 100%; a plan must divide the whole`
    );
  }
}

/** Refuses an installment count that is not a whole number at or above one. */
export function assertInstallmentCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new InstallmentError(
      'installment_count_invalid',
      `an installment count must be a whole number at or above 1; got ${String(count)}`
    );
  }
}

/**
 * Splits a total into `count` equal installments.
 *
 * The split goes through the money module's largest-remainder allocator, so the parts always sum to
 * the total exactly. The odd minor units go one each to the earliest installments, in index order:
 * 100.00 into 3 is 33.34, 33.33, 33.33, and 0.01 into 3 is 0.01, 0.00, 0.00. The placement is
 * deterministic and is asserted in the tests.
 */
export function splitEqually(total: Money, count: number): readonly Money[] {
  assertInstallmentCount(count);
  return allocateEqually(total, count);
}

/**
 * Splits a total by declared percentages, each rounded by `rounding` and the remainder settled.
 *
 * Every part but the last is the total scaled by its percentage through `multiplyRational`, so the
 * rounding rule the caller names is applied explicitly. The last installment is then the total less
 * the parts before it, so the parts always sum to the total exactly: the odd minor unit the rounding
 * leaves lands deterministically on the final installment. A split that would drive an installment
 * below zero is refused rather than written.
 */
export function splitByPercentages(
  total: Money,
  percentages: readonly number[],
  rounding: RoundingMode
): readonly Money[] {
  if (percentages.length === 0) {
    throw new InstallmentError('no_installments', 'a percentage split needs at least one installment');
  }
  assertPercentagesSumToWhole(percentages);
  const parts = percentages.map((percent) =>
    multiplyRational(total, percentBasisPoints(percent), BASIS_POINTS, rounding)
  );
  const residual = subtract(total, sum(parts));
  if (!isZero(residual)) {
    parts[parts.length - 1] = add(parts[parts.length - 1], residual);
  }
  for (const part of parts) {
    if (isNegative(part)) {
      throw new InstallmentError(
        'negative_installment',
        `the split leaves an installment of ${String(part.amount_minor)} minor units; the rounding rule and the total do not permit it`
      );
    }
  }
  return parts;
}

/**
 * Splits a total by arbitrary weights through the largest-remainder allocator.
 *
 * This is the seam a plan that declares weights rather than percentages uses; the parts always sum
 * to the total exactly. A weight list that is all zero is refused by the money module itself.
 */
export function splitByWeights(total: Money, weights: readonly number[]): readonly Money[] {
  if (weights.length === 0) {
    throw new InstallmentError('no_installments', 'a weighted split needs at least one installment');
  }
  return allocate(total, weights);
}
