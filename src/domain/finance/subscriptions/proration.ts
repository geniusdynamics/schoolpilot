// ABOUTME: The proration rules a subscription bills by: the whole price, nothing, a day or a week
// ABOUTME: share through the money module's rational multiply with one named rounding rule, and the
// ABOUTME: half-term split. Every rule returns the days it measured, so the amount explains itself.

import { multiplyRational, type Money, type RoundingMode } from '@/domain/money';

import { addDays, daysInclusive } from './dates';
import type { ProrationDetail, SubscriptionProrationRule, SubscriptionSkipReason } from './types';

/**
 * The rounding rule every proration uses.
 *
 * A pro-rata share of a price is usually not a whole minor unit, and the money module refuses to
 * round without a named rule. `half_up` is the rule a bursar expects of a part-term charge: the
 * nearest minor unit, a half rounded away from zero. `up` would over-charge the payer and `down`
 * would under-charge the school on every mid-term joiner, so neither is a policy anyone chose.
 */
export const PRORATION_ROUNDING: RoundingMode = 'half_up';

/** The window a subscription actually covers inside a billing period, both ends included. */
export interface ProrationWindow {
  readonly start: string;
  readonly end: string;
}

/** A price and the reason it became the amount, or the rule's refusal to bill anything. */
export interface ProratedPrice {
  readonly amount: Money;
  readonly detail: ProrationDetail;
  /** Set when the rule bills nothing for this window; `amount` is then zero. */
  readonly skip?: SubscriptionSkipReason;
}

/** The number of whole weeks a span of days rounds up to: a partial week counts as a week. */
function weeksCovered(days: number): number {
  return Math.ceil(days / 7);
}

/**
 * Applies a proration rule to a price over the window the subscription covers.
 *
 * The rules, stated:
 * - `full` — the whole price, whenever within the period the subscription starts.
 * - `none` — the whole price only when the window is the whole period; a subscription that covers
 *   part of it is not billed at all.
 * - `pro_rata_days` — `price × daysUsed ÷ daysInPeriod`, rounded half-up.
 * - `pro_rata_weeks` — `price × weeksUsed ÷ weeksInPeriod`, whole weeks counting up, rounded half-up.
 * - `from_half_term` — the whole price for a start on or before the period's midpoint, half of it
 *   after, rounded half-up.
 */
export function prorate(
  price: Money,
  rule: SubscriptionProrationRule,
  window: ProrationWindow,
  period: { readonly start: string; readonly end: string }
): ProratedPrice {
  const daysInPeriod = daysInclusive(period.start, period.end);
  const daysUsed = daysInclusive(window.start, window.end);
  const detail: ProrationDetail = {
    rule,
    daysUsed,
    daysInPeriod,
    weeksUsed: weeksCovered(daysUsed),
    weeksInPeriod: weeksCovered(daysInPeriod),
  };

  switch (rule) {
    case 'full':
      return { amount: price, detail };
    case 'none':
      if (window.start === period.start && window.end === period.end) {
        return { amount: price, detail };
      }
      return { amount: { amount_minor: 0, currency: price.currency }, detail, skip: 'not_billable_rule' };
    case 'pro_rata_days':
      return {
        amount: multiplyRational(price, daysUsed, daysInPeriod, PRORATION_ROUNDING),
        detail,
      };
    case 'pro_rata_weeks':
      return {
        amount: multiplyRational(price, detail.weeksUsed, detail.weeksInPeriod, PRORATION_ROUNDING),
        detail,
      };
    case 'from_half_term': {
      const midpoint = addDays(period.start, Math.floor((daysInPeriod - 1) / 2));
      if (window.start <= midpoint) return { amount: price, detail };
      return { amount: multiplyRational(price, 1, 2, PRORATION_ROUNDING), detail };
    }
    default: {
      const unreachable: never = rule;
      throw new Error(`unknown proration rule ${String(unreachable)}`);
    }
  }
}
