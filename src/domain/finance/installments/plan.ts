// ABOUTME: The pure derivation of an installment plan: validate the dated percentages a plan
// ABOUTME: declares, split a schedule line's own amount by them (or equally across the line's own due
// ABOUTME: dates), and read the state an installment is in without ever touching its amount.

import type { Money, RoundingMode } from '@/domain/money';

import { InstallmentError } from './errors';
import {
  assertPercentagesSumToWhole,
  percentBasisPoints,
  splitByPercentages,
  splitEqually,
} from './split';
import type { DatedInstallment, InstallmentPart, InstallmentStatus } from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True when `value` is an ISO calendar day (`YYYY-MM-DD`) that names a real date. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed);
}

/**
 * Refuses a plan whose installments are malformed or do not divide the whole.
 *
 * A plan is its dated percentages: each sequence is a whole number at or above one and unique, each
 * due date is a real calendar day, each percentage is between 0 and 100 with at most two decimals,
 * and the percentages sum to exactly 100. The last rule is what makes a plan a split of a total
 * rather than a second, competing number: a plan that does not sum is refused by name.
 */
export function assertPlanInstallments(installments: readonly InstallmentPart[]): void {
  if (installments.length === 0) {
    throw new InstallmentError('no_installments', 'a plan needs at least one installment');
  }
  const seen = new Set<number>();
  for (const installment of installments) {
    if (!Number.isSafeInteger(installment.sequence) || installment.sequence < 1) {
      throw new InstallmentError(
        'sequence_invalid',
        `an installment's sequence must be a whole number at or above 1; got ${String(installment.sequence)}`
      );
    }
    if (seen.has(installment.sequence)) {
      throw new InstallmentError(
        'sequence_duplicate',
        `two installments of the plan share the sequence ${installment.sequence}`
      );
    }
    seen.add(installment.sequence);
    if (!isIsoDate(installment.dueDate)) {
      throw new InstallmentError(
        'due_date_invalid',
        `the due date ${String(installment.dueDate)} is not an ISO calendar day`
      );
    }
    percentBasisPoints(installment.percent);
  }
  assertPercentagesSumToWhole(installments.map((installment) => installment.percent));
}

/** The installments in sequence order, from the first due to the last. */
export function inSequenceOrder(
  installments: readonly InstallmentPart[]
): readonly InstallmentPart[] {
  return [...installments].sort((left, right) => left.sequence - right.sequence);
}

/** The due dates of a plan, in sequence order. */
export function dueDatesOf(installments: readonly InstallmentPart[]): readonly string[] {
  return inSequenceOrder(installments).map((installment) => installment.dueDate);
}

/**
 * Splits a total into the dated installments a plan declares.
 *
 * The plan supplies the percentages and the dates; the total is the schedule line's own amount.
 * The split is exact: the parts sum to the total, and the minor unit the rounding leaves lands on
 * the final installment.
 */
export function installmentsForAmount(
  total: Money,
  installments: readonly InstallmentPart[],
  rounding: RoundingMode
): readonly DatedInstallment[] {
  assertPlanInstallments(installments);
  const ordered = inSequenceOrder(installments);
  const amounts = splitByPercentages(
    total,
    ordered.map((installment) => installment.percent),
    rounding
  );
  return ordered.map((installment, index) => ({ ...installment, amount: amounts[index] }));
}

/**
 * Splits a total equally across the due dates a schedule line pins itself.
 *
 * This is what a line that names no `installment_plan` but carries its own `due_dates` uses: the
 * dates are the plan, and the split is equal, so the odd minor units go to the earliest dates. The
 * `percent` of each part is the exact share (`100 / count`) and is informational, because the
 * amounts come from the allocator rather than from the percentages.
 */
export function installmentsForDueDates(
  total: Money,
  dueDates: readonly string[]
): readonly DatedInstallment[] {
  if (dueDates.length === 0) {
    throw new InstallmentError('no_installments', 'a line with no due dates has nothing to split');
  }
  for (const dueDate of dueDates) {
    if (!isIsoDate(dueDate)) {
      throw new InstallmentError(
        'due_date_invalid',
        `the due date ${String(dueDate)} is not an ISO calendar day`
      );
    }
  }
  const amounts = splitEqually(total, dueDates.length);
  const share = 100 / dueDates.length;
  return dueDates.map((dueDate, index) => ({
    sequence: index + 1,
    dueDate,
    percent: share,
    amount: amounts[index],
  }));
}

/**
 * The state an installment is in on a day.
 *
 * A late installment is a state, not a change to the amount: this reads the due date and the day
 * and returns `overdue` without touching the money the installment is for. An installment is `paid`
 * only when a settlement day is given; `due` on its due date; `overdue` after it; `scheduled`
 * before it.
 */
export function installmentStatus(
  dueDate: string,
  asOf: string,
  paidOn?: string | null
): InstallmentStatus {
  if (!isIsoDate(dueDate)) {
    throw new InstallmentError(
      'due_date_invalid',
      `the due date ${String(dueDate)} is not an ISO calendar day`
    );
  }
  if (!isIsoDate(asOf)) {
    throw new InstallmentError(
      'due_date_invalid',
      `the day to read the state on, ${String(asOf)}, is not an ISO calendar day`
    );
  }
  if (paidOn !== undefined && paidOn !== null) return 'paid';
  if (asOf > dueDate) return 'overdue';
  if (asOf === dueDate) return 'due';
  return 'scheduled';
}
