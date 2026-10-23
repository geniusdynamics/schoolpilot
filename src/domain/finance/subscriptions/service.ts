// ABOUTME: The subscription service: it creates, reads, lists and cancels subscriptions through the
// ABOUTME: store, and answers the billing seam for a learner by reading their subscriptions and
// ABOUTME: calling the pure billing function. The price always comes from the fee schedule.

import { generateUuidv7, type Id } from '@/domain/ids';
import { PRORATION_RULES } from '@/domain/schema';

import { billSubscriptions } from './billing';
import { isIsoDay } from './dates';
import { SubscriptionError } from './errors';
import {
  SUBSCRIPTION_SERVICE_KINDS,
  type CancellationRequest,
  type Subscription,
  type SubscriptionBillingContext,
  type SubscriptionBillingResult,
  type SubscriptionInput,
  type SubscriptionQuery,
  type SubscriptionStore,
} from './types';

/** What the service is built with. */
export interface SubscriptionServiceOptions {
  /** Where subscriptions are read and written. The SQLite store satisfies it; so does a double. */
  readonly store: SubscriptionStore;
  /** The clock the created/updated stamps read. Defaults to the wall. */
  readonly now?: () => Date;
  /** The id generator. Defaults to the platform's UUIDv7 generator. */
  readonly newId?: () => string;
}

/**
 * The subscription service.
 *
 * A subscription is a learner's recurring service for a period, priced from the fee schedule it
 * names. Creating one never takes an amount: the amount is whatever the schedule prices the fee item
 * at, resolved by the billing run. Cancelling one never deletes it and never changes what a past run
 * already billed — the invoices of the periods before the cancellation are immutable, and the billing
 * seam prorates only the period the cancellation falls in.
 */
export class SubscriptionService {
  private readonly store: SubscriptionStore;
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: SubscriptionServiceOptions) {
    this.store = options.store;
    this.clock = options.now ?? (() => new Date());
    this.newId = options.newId ?? generateUuidv7;
  }

  // ------------------------------------------------------------------ writing

  /** Creates a subscription. Refuses one whose dates or values are malformed, before anything is written. */
  async create(input: SubscriptionInput): Promise<Subscription> {
    assertCreateInput(input);
    const now = this.timestamp();
    const subscription: Subscription = {
      id: this.newId(),
      institutionId: input.institutionId,
      learnerId: input.learnerId,
      serviceKind: input.serviceKind,
      serviceRef: normalizeRef(input.serviceRef),
      feeItemId: input.feeItemId,
      feeScheduleId: input.feeScheduleId,
      academicPeriodId: input.academicPeriodId ?? null,
      startsOn: input.startsOn,
      endsOn: input.endsOn ?? null,
      prorationRule: input.prorationRule ?? 'full',
      status: 'active',
      cancelledOn: null,
      cancellationReason: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.store.insert(subscription);
    return subscription;
  }

  /**
   * Cancels a subscription from a day, with a stated effect.
   *
   * The row stays and its status becomes `cancelled`. Nothing already billed is touched: the
   * invoices of periods before the cancellation are what they were. The billing seam prorates the
   * period the cancellation falls in to the cancellation day, and skips every period after it.
   */
  async cancel(subscriptionId: string, request: CancellationRequest): Promise<Subscription> {
    const subscription = await this.get(subscriptionId);
    if (subscription.status === 'cancelled') {
      throw new SubscriptionError(
        'already_cancelled',
        `The subscription ${subscriptionId} was already cancelled on ${subscription.cancelledOn}.`,
        { subscriptionId }
      );
    }
    if (!isIsoDay(request.on)) {
      throw new SubscriptionError(
        'date_invalid',
        `The cancellation day ${String(request.on)} is not an ISO calendar day.`,
        { subscriptionId }
      );
    }
    if (request.on < subscription.startsOn) {
      throw new SubscriptionError(
        'cancelled_before_start',
        `The subscription starts on ${subscription.startsOn}; it cannot be cancelled on ${request.on}.`,
        { subscriptionId }
      );
    }
    const cancelled: Subscription = {
      ...subscription,
      status: 'cancelled',
      cancelledOn: request.on,
      cancellationReason: request.reason?.trim() ? request.reason.trim() : null,
      updatedAt: this.timestamp(),
    };
    await this.store.update(cancelled);
    return cancelled;
  }

  // ------------------------------------------------------------------ reading

  /** A subscription by id, or a refusal when the row does not exist. */
  async get(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.store.get(subscriptionId);
    if (!subscription) {
      throw new SubscriptionError(
        'not_found',
        `No subscription answers to ${subscriptionId}.`,
        { subscriptionId }
      );
    }
    return subscription;
  }

  /** The subscriptions a caller narrows to, earliest start first. */
  async list(query: SubscriptionQuery = {}): Promise<readonly Subscription[]> {
    return this.store.list(query);
  }

  // ------------------------------------------------------------------ billing

  /**
   * What every subscription of a learner adds to their bill for a period, and why.
   *
   * This is the seam P3-C01 calls. The billing run resolves the learner's schedule cell once (with
   * `FeeScheduleService.resolveForBilling`) and passes the period and the resolved lines in; this
   * reads the learner's subscriptions, active and cancelled alike, and returns one result per
   * subscription — each billed with its item, price and proration, or skipped with its reason.
   */
  async billableFor(
    learnerId: Id<'learner'>,
    context: SubscriptionBillingContext
  ): Promise<readonly SubscriptionBillingResult[]> {
    const subscriptions = await this.store.list({ learnerId });
    return billSubscriptions(subscriptions, context);
  }

  private timestamp(): string {
    return this.clock().toISOString();
  }
}

/** Refuses a subscription whose required fields or dates are malformed. */
export function assertCreateInput(input: SubscriptionInput): void {
  if (!input.institutionId) {
    throw new SubscriptionError('institution_missing', 'A subscription needs an institution.');
  }
  if (!input.learnerId) {
    throw new SubscriptionError('learner_required', 'A subscription needs a learner.');
  }
  if (!input.feeItemId) {
    throw new SubscriptionError(
      'fee_item_required',
      'A subscription needs a fee item; the fee schedule prices that item, so a subscription without one has no price.'
    );
  }
  if (!SUBSCRIPTION_SERVICE_KINDS.includes(input.serviceKind)) {
    throw new SubscriptionError(
      'service_kind_invalid',
      `"${String(input.serviceKind)}" is not a declared service kind.`
    );
  }
  if (
    input.prorationRule !== undefined &&
    !PRORATION_RULES.includes(input.prorationRule)
  ) {
    throw new SubscriptionError(
      'proration_rule_invalid',
      `"${String(input.prorationRule)}" is not a declared proration rule.`
    );
  }
  if (!isIsoDay(input.startsOn)) {
    throw new SubscriptionError(
      'date_invalid',
      `The start date ${String(input.startsOn)} is not an ISO calendar day.`
    );
  }
  if (input.endsOn !== undefined) {
    if (!isIsoDay(input.endsOn)) {
      throw new SubscriptionError(
        'date_invalid',
        `The end date ${String(input.endsOn)} is not an ISO calendar day.`
      );
    }
    if (input.endsOn < input.startsOn) {
      throw new SubscriptionError(
        'ends_before_starts',
        `The subscription ends on ${input.endsOn}, before it starts on ${input.startsOn}.`
      );
    }
  }
}

/** A trimmed service reference, or null when the caller named none. */
function normalizeRef(reference: string | undefined): string | null {
  if (reference === undefined) return null;
  const trimmed = reference.trim();
  return trimmed === '' ? null : trimmed;
}
