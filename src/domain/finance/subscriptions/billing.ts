// ABOUTME: The billing seam: a pure function that answers, for one subscription and one period,
// ABOUTME: what it adds to the bill and why — the item, the schedule price, the proration, and the
// ABOUTME: reason it is skipped if it is. No store, no clock, no side effect: a billing run calls it.

import { earlierDay, laterDay } from './dates';
import { prorate } from './proration';
import type {
  ProrationDetail,
  Subscription,
  SubscriptionBilling,
  SubscriptionBillingContext,
  SubscriptionBillingResult,
  SubscriptionSkip,
  SubscriptionSkipReason,
} from './types';

/** A one-line statement of how a rule produced an amount. */
export function describeProration(rule: ProrationDetail['rule'], detail: ProrationDetail): string {
  switch (rule) {
    case 'full':
      return `the whole price for the period (${detail.daysInPeriod} days)`;
    case 'none':
      return 'the whole price: the subscription covers the whole period';
    case 'pro_rata_days':
      return `pro rata by days: ${detail.daysUsed} of ${detail.daysInPeriod} days`;
    case 'pro_rata_weeks':
      return `pro rata by weeks: ${detail.weeksUsed} of ${detail.weeksInPeriod} weeks`;
    case 'from_half_term':
      return 'the whole price: the start is on or before half term, half of it after';
    default:
      return 'priced by the schedule';
  }
}

function skip(
  subscription: Subscription,
  reason: SubscriptionSkipReason,
  detail: string
): SubscriptionSkip {
  return {
    kind: 'skipped',
    subscriptionId: subscription.id,
    learnerId: subscription.learnerId,
    feeItemId: subscription.feeItemId,
    serviceKind: subscription.serviceKind,
    reason,
    detail,
  };
}

/**
 * What one subscription adds to a learner's bill for a period, and why.
 *
 * The price is read from the resolved schedule lines, never from the subscription. The window is the
 * subscription's own dates clamped to the period and to the day it was cancelled, and the
 * subscription's declared rule prorates it through the money module. A subscription that adds
 * nothing returns a skip that names the reason rather than a silent zero.
 */
export function billSubscription(
  subscription: Subscription,
  context: SubscriptionBillingContext
): SubscriptionBillingResult {
  const { period, pricing } = context;

  if (subscription.feeScheduleId !== pricing.feeScheduleId) {
    return skip(
      subscription,
      'different_schedule',
      `the subscription prices from schedule ${subscription.feeScheduleId}, but the run resolved ${pricing.feeScheduleId}`
    );
  }

  const line = pricing.lines.find((candidate) => candidate.feeItemId === subscription.feeItemId);
  if (!line) {
    return skip(
      subscription,
      'fee_item_not_priced',
      `the schedule prices no line for fee item ${subscription.feeItemId}`
    );
  }

  if (
    subscription.status === 'cancelled' &&
    subscription.cancelledOn !== null &&
    subscription.cancelledOn < period.start
  ) {
    return skip(
      subscription,
      'cancelled',
      `the subscription was cancelled on ${subscription.cancelledOn}, before the period began`
    );
  }

  if (subscription.startsOn > period.end) {
    return skip(
      subscription,
      'not_started',
      `the subscription starts on ${subscription.startsOn}, after the period ends`
    );
  }

  if (subscription.endsOn !== null && subscription.endsOn < period.start) {
    return skip(
      subscription,
      'ended',
      `the subscription ended on ${subscription.endsOn}, before the period began`
    );
  }

  let endBound = subscription.endsOn ?? period.end;
  if (subscription.cancelledOn !== null) {
    endBound = earlierDay(endBound, subscription.cancelledOn);
  }
  const start = laterDay(subscription.startsOn, period.start);
  const end = earlierDay(endBound, period.end);

  if (end < start) {
    return skip(
      subscription,
      'outside_period',
      `the subscription covers ${subscription.startsOn}..${endBound}, which does not overlap the period`
    );
  }

  const prorated = prorate(line.amount, subscription.prorationRule, { start, end }, period);
  if (prorated.skip !== undefined) {
    return skip(
      subscription,
      prorated.skip,
      `the rule ${subscription.prorationRule} bills nothing for ${start}..${end} of the period`
    );
  }

  const billing: SubscriptionBilling = {
    kind: 'billed',
    subscriptionId: subscription.id,
    learnerId: subscription.learnerId,
    feeItemId: subscription.feeItemId,
    serviceKind: subscription.serviceKind,
    serviceRef: subscription.serviceRef,
    feeScheduleId: subscription.feeScheduleId,
    scheduleVersion: pricing.version,
    price: line.amount,
    amount: prorated.amount,
    proration: prorated.detail,
    reason: describeProration(subscription.prorationRule, prorated.detail),
  };
  return billing;
}

/**
 * What every subscription of a learner adds to their bill for a period.
 *
 * The order is the order the subscriptions were given, so a billing run can keep its own order and
 * the answer is deterministic. The batch is the whole seam: a run reads a learner's subscriptions,
 * resolves their schedule cell once, and gets one result per subscription, each billed or skipped
 * with its reason.
 */
export function billSubscriptions(
  subscriptions: readonly Subscription[],
  context: SubscriptionBillingContext
): readonly SubscriptionBillingResult[] {
  return subscriptions.map((subscription) => billSubscription(subscription, context));
}

/** The billed results of a batch, for a caller that only wants what is owed. */
export function billedOnly(
  results: readonly SubscriptionBillingResult[]
): readonly SubscriptionBilling[] {
  return results.filter((result): result is SubscriptionBilling => result.kind === 'billed');
}

/** The skipped results of a batch, for a preview's exceptions panel. */
export function skippedOnly(
  results: readonly SubscriptionBillingResult[]
): readonly SubscriptionSkip[] {
  return results.filter((result): result is SubscriptionSkip => result.kind === 'skipped');
}
