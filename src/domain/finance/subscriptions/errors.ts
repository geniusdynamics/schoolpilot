// ABOUTME: The refusals of the subscriptions module: a subscription with no learner or fee item, an
// ABOUTME: unknown service kind or proration rule, an end before a start, a cancellation before the
// ABOUTME: subscription began, and a second cancellation of one already cancelled.

/** Why the subscriptions module refused a call. */
export type SubscriptionErrorCode =
  /** A subscription names no institution. */
  | 'institution_missing'
  /** A subscription names no learner. */
  | 'learner_required'
  /** A subscription names no fee item, so nothing can price it. */
  | 'fee_item_required'
  /** The service kind is not one of the declared values. */
  | 'service_kind_invalid'
  /** The proration rule is not one of the declared values. */
  | 'proration_rule_invalid'
  /** A date is not an ISO calendar day. */
  | 'date_invalid'
  /** The end date falls before the start date. */
  | 'ends_before_starts'
  /** A cancellation is dated before the subscription starts. */
  | 'cancelled_before_start'
  /** The subscription is already cancelled. */
  | 'already_cancelled'
  /** The row the caller named does not exist. */
  | 'not_found'
  /** The store refused the write. */
  | 'storage';

/** A refusal that belongs to the subscriptions module. */
export class SubscriptionError extends Error {
  readonly code: SubscriptionErrorCode;
  /** The subscription the refusal is about, when one is known. */
  readonly subscriptionId?: string;
  /** The underlying error, when the refusal wraps one. */
  override readonly cause?: unknown;

  constructor(
    code: SubscriptionErrorCode,
    message: string,
    options: { readonly subscriptionId?: string; readonly cause?: unknown } = {}
  ) {
    super(message);
    this.name = 'SubscriptionError';
    this.code = code;
    if (options.subscriptionId !== undefined) this.subscriptionId = options.subscriptionId;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** True when the error is a subscriptions error, optionally of the given code. */
export function isSubscriptionError(
  error: unknown,
  code?: SubscriptionErrorCode
): error is SubscriptionError {
  if (!(error instanceof SubscriptionError)) return false;
  return code === undefined || error.code === code;
}
