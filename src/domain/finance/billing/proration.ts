// ABOUTME: The proration of a fee line for a learner who joins or leaves mid-period. Every amount
// ABOUTME: is scaled by the money module's rational multiply with one named rounding rule, so the
// ABOUTME: fraction of a minor unit is a policy and never a float.

import { multiplyRational, type Money, type RoundingMode } from '@/domain/money';
import type { ScheduleProrationRule } from '@/domain/finance/schedules';

import type { ProrationRecord } from './types';

/**
 * The rounding rule of every proration.
 *
 * `half_up` is the rule a bursar expects of a pro-rata charge: the nearest minor unit, a half
 * rounded away from zero. `up` would systematically over-charge the family and `down` would
 * systematically under-charge the school, so neither is a policy anyone chose. It is the same rule
 * the fee-schedule module's copy-with-uplift uses, so a school's arithmetic is one policy.
 */
export const PRORATION_ROUNDING: RoundingMode = 'half_up';

/** The window a line is prorated over: the period, and the days the learner was enrolled in it. */
export interface ProrationWindow {
  /** The first day of the period, `YYYY-MM-DD`. */
  readonly periodStart: string;
  /** The last day of the period. */
  readonly periodEnd: string;
  /** The first day the learner was billable: the later of the period's start and the enrolment's. */
  readonly enrolledFrom: string;
  /** The last day the learner was billable: the earlier of the period's end and the enrolment's. */
  readonly enrolledTo: string;
}

const DAY_MS = 86_400_000;

/** The whole days from `from` to `to`, inclusive of both. */
export function daysInclusive(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / DAY_MS) + 1;
}

/** The day a whole count of days after `from`. */
function addDays(from: string, days: number): string {
  return new Date(Date.parse(`${from}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The later of two ISO days. */
export function laterDay(left: string, right: string): string {
  return left >= right ? left : right;
}

/** The earlier of two ISO days. */
export function earlierDay(left: string, right: string): string {
  return left <= right ? left : right;
}

/**
 * The fraction of a line a learner of this window is billed, per the line's proration rule.
 *
 * The rules are the canonical `PRORATION_RULES` of spec 05 §2.2, and this is what each means here:
 *
 * - `full` — the whole amount. The learner was enrolled for the whole period, or the line is not
 *   prorated at all.
 * - `none` — nothing. The line is not billed to a mid-period joiner.
 * - `pro_rata_days` — `days enrolled in the period / days in the period`, counted inclusively.
 * - `pro_rata_weeks` — `whole weeks enrolled / whole weeks in the period`, so a part week is not
 *   charged. The denominator is at least one week.
 * - `from_half_term` — the whole amount when the learner joined on or before the period's midpoint,
 *   half of it when they joined after it.
 *
 * The fraction is a pair of whole numbers, so the amount is scaled exactly and only the final
 * fraction of a minor unit is rounded, by {@link PRORATION_ROUNDING}.
 */
export function prorationRecord(
  rule: ScheduleProrationRule,
  window: ProrationWindow
): ProrationRecord {
  const periodDays = daysInclusive(window.periodStart, window.periodEnd);
  const enrolledFrom = laterDay(window.enrolledFrom, window.periodStart);
  const enrolledTo = earlierDay(window.enrolledTo, window.periodEnd);
  const billableDays = enrolledTo < enrolledFrom ? 0 : daysInclusive(enrolledFrom, enrolledTo);

  const base = {
    rule,
    rounding: PRORATION_ROUNDING,
    billableDays,
    periodDays,
    enrolledFrom,
    enrolledTo,
  };

  if (rule === 'full') {
    return { ...base, numerator: 1, denominator: 1 };
  }
  if (rule === 'none') {
    return { ...base, numerator: 0, denominator: 1 };
  }
  if (rule === 'pro_rata_weeks') {
    const weeks = Math.max(1, Math.floor(periodDays / 7));
    return { ...base, numerator: Math.floor(billableDays / 7), denominator: weeks };
  }
  if (rule === 'from_half_term') {
    const midpoint = addDays(window.periodStart, Math.floor(periodDays / 2));
    const half = enrolledFrom > midpoint;
    return { ...base, numerator: half ? 1 : 2, denominator: half ? 2 : 2 };
  }
  // pro_rata_days
  return {
    ...base,
    numerator: billableDays,
    denominator: Math.max(1, periodDays),
  };
}

/** True when a record leaves the line whole. */
export function isWhole(record: ProrationRecord): boolean {
  return record.denominator > 0 && record.numerator === record.denominator;
}

/** True when a record bills nothing at all. */
export function isNil(record: ProrationRecord): boolean {
  return record.numerator === 0;
}

/**
 * Scales a line by a proration record.
 *
 * The multiplication is the money module's `multiplyRational`, so it is done in `bigint` and
 * rounded once, by the record's own rounding rule. A whole fraction returns the amount unchanged,
 * which keeps a line that is not prorated bit-for-bit what the schedule priced.
 */
export function prorateAmount(amount: Money, record: ProrationRecord): Money {
  if (isWhole(record)) return amount;
  return multiplyRational(amount, record.numerator, record.denominator, record.rounding);
}

/** A one-line description of a proration, for the reason a preview line carries. */
export function describeProration(record: ProrationRecord): string {
  if (record.rule === 'full') return 'billed in full for the period';
  if (record.rule === 'none') return 'not prorated: the rule bills nothing for a mid-period joiner';
  if (record.rule === 'from_half_term') {
    return record.numerator === 2
      ? 'billed in full: the learner joined on or before half term'
      : 'billed at half: the learner joined after half term';
  }
  if (record.rule === 'pro_rata_weeks') {
    return `prorated ${record.numerator}/${record.denominator} whole weeks of the ${record.periodDays}-day period`;
  }
  return `prorated ${record.numerator}/${record.denominator} days of the ${record.periodDays}-day period`;
}
