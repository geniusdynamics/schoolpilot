// ABOUTME: The subscription model: a learner's recurring service (transport, lunch, a club, a trip)
// ABOUTME: for a period, priced from the fee schedule rather than from a typed-in amount, with the
// ABOUTME: billing seam a billing run reads and the store port every read and write goes through.

import type { Id } from '@/domain/ids';
import type { Money } from '@/domain/money';
import type { ResolvedLine, ScheduleProrationRule } from '@/domain/finance/schedules';

/** The optional services a learner can subscribe to (spec 05 §2.2). */
export const SUBSCRIPTION_SERVICE_KINDS = [
  'transport',
  'lunch',
  'club',
  'trip',
  'remedial',
  'other',
] as const;
export type SubscriptionServiceKind = (typeof SUBSCRIPTION_SERVICE_KINDS)[number];

/** A subscription is either running or cancelled. Cancelling never deletes it. */
export type SubscriptionStatus = 'active' | 'cancelled';

/** How a mid-period start or a cancellation is prorated. It is the schedule's own declared list. */
export type SubscriptionProrationRule = ScheduleProrationRule;

/**
 * One subscription: a learner, a service, a period, and the fee item a fee schedule prices.
 *
 * It carries **no amount of its own**. The price is whatever the named fee schedule prices the fee
 * item at for the learner's population, so a re-priced schedule re-prices every subscription that
 * bills through it and a subscription can never drift from the published prices.
 */
export interface Subscription {
  readonly id: string;
  readonly institutionId: Id<'institution'>;
  readonly learnerId: Id<'learner'>;
  readonly serviceKind: SubscriptionServiceKind;
  /**
   * The route, zone, club or trip the service is for. For transport it names the transport route
   * (`transport-route:<id>`); the canonical model has no transport-route entity, so it is a text
   * reference. Null for a service that has no reference of its own (a lunch programme).
   */
  readonly serviceRef: string | null;
  readonly feeItemId: Id<'fee_item'>;
  /** The fee-schedule version the subscription prices from. A published version is immutable. */
  readonly feeScheduleId: Id<'fee_schedule'>;
  readonly academicPeriodId: Id<'academic_period'> | null;
  /** The first day the learner has the service, `YYYY-MM-DD`. */
  readonly startsOn: string;
  /** The last day, or null for an open-ended subscription. */
  readonly endsOn: string | null;
  readonly prorationRule: SubscriptionProrationRule;
  readonly status: SubscriptionStatus;
  /** The day it was cancelled, or null. */
  readonly cancelledOn: string | null;
  readonly cancellationReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A subscription to create. */
export interface SubscriptionInput {
  readonly institutionId: Id<'institution'>;
  readonly learnerId: Id<'learner'>;
  readonly serviceKind: SubscriptionServiceKind;
  readonly serviceRef?: string;
  readonly feeItemId: Id<'fee_item'>;
  readonly feeScheduleId: Id<'fee_schedule'>;
  readonly academicPeriodId?: Id<'academic_period'>;
  readonly startsOn: string;
  readonly endsOn?: string;
  readonly prorationRule?: SubscriptionProrationRule;
}

/** A cancellation: the day it takes effect and why. */
export interface CancellationRequest {
  readonly on: string;
  readonly reason?: string;
}

/** What a caller can narrow the list of subscriptions by. */
export interface SubscriptionQuery {
  readonly institutionId?: Id<'institution'>;
  readonly learnerId?: Id<'learner'>;
  readonly status?: SubscriptionStatus;
  readonly serviceKind?: SubscriptionServiceKind;
  readonly feeScheduleId?: Id<'fee_schedule'>;
}

/** The persistence a subscriptions service needs. The SQLite store satisfies it; so does a double. */
export interface SubscriptionStore {
  insert(subscription: Subscription): Promise<void>;
  get(id: string): Promise<Subscription | null>;
  list(query: SubscriptionQuery): Promise<readonly Subscription[]>;
  update(subscription: Subscription): Promise<void>;
}

/** The span of days a billing run is billing for, both ends included. */
export interface BillingPeriod {
  readonly start: string;
  readonly end: string;
}

/**
 * The prices a billing run resolved for the learner's population.
 *
 * This is exactly what `FeeScheduleService.resolveForBilling` returns, narrowed to what a
 * subscription reads: the schedule version and its lines. The billing run resolves the cell once
 * and passes it in, so a subscription is never re-priced by a second lookup.
 */
export interface SubscriptionPricing {
  readonly feeScheduleId: Id<'fee_schedule'>;
  readonly version: number;
  readonly lines: readonly ResolvedLine[];
}

/** What a subscription is billed against: the period and the resolved prices. */
export interface SubscriptionBillingContext {
  readonly period: BillingPeriod;
  readonly pricing: SubscriptionPricing;
}

/** Why a subscription adds nothing to the bill for a period. */
export type SubscriptionSkipReason =
  /** The subscription starts after the period ends. */
  | 'not_started'
  /** The subscription ended before the period began. */
  | 'ended'
  /** The subscription's window and the period do not overlap. */
  | 'outside_period'
  /** The subscription was cancelled before the period began. */
  | 'cancelled'
  /** The subscription prices from a different schedule version than the run resolved. */
  | 'different_schedule'
  /** The resolved schedule prices no line for the subscription's fee item. */
  | 'fee_item_not_priced'
  /** The rule bills nothing for a subscription that does not cover the whole period. */
  | 'not_billable_rule';

/** How a price became the amount: the rule and the days it was measured over. */
export interface ProrationDetail {
  readonly rule: SubscriptionProrationRule;
  /** The days of the period the subscription covers, both ends included. */
  readonly daysUsed: number;
  /** The days of the period, both ends included. */
  readonly daysInPeriod: number;
  /** Whole weeks the covered days round up to; only meaningful for `pro_rata_weeks`. */
  readonly weeksUsed: number;
  /** Whole weeks the period rounds up to. */
  readonly weeksInPeriod: number;
}

/** What a subscription adds to a bill, and why. */
export interface SubscriptionBilling {
  readonly kind: 'billed';
  readonly subscriptionId: string;
  readonly learnerId: Id<'learner'>;
  readonly feeItemId: Id<'fee_item'>;
  readonly serviceKind: SubscriptionServiceKind;
  readonly serviceRef: string | null;
  readonly feeScheduleId: Id<'fee_schedule'>;
  readonly scheduleVersion: number;
  /** The price the schedule prices the fee item at, before proration. */
  readonly price: Money;
  /** What the subscription adds to the bill for this period. */
  readonly amount: Money;
  readonly proration: ProrationDetail;
  /** A short, human-readable statement of why the amount is what it is. */
  readonly reason: string;
}

/** Why a subscription adds nothing to a bill for a period. */
export interface SubscriptionSkip {
  readonly kind: 'skipped';
  readonly subscriptionId: string;
  readonly learnerId: Id<'learner'>;
  readonly feeItemId: Id<'fee_item'>;
  readonly serviceKind: SubscriptionServiceKind;
  readonly reason: SubscriptionSkipReason;
  readonly detail: string;
}

/** The answer the billing seam gives for one subscription in one period. */
export type SubscriptionBillingResult = SubscriptionBilling | SubscriptionSkip;
