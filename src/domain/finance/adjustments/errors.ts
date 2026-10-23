// ABOUTME: The adjustments module's error vocabulary: one `AdjustmentError` whose code says why a
// ABOUTME: credit note, refund, write-off, recovery or clearance was refused, so a caller can branch
// ABOUTME: on the reason rather than read the message.

/** Why an adjustment was refused. */
export type AdjustmentErrorCode =
  /** A required field of the request is missing or malformed. */
  | 'invalid_request'
  /** The document the request names does not exist. */
  | 'not_found'
  /** The document is not in the state the request assumes (already decided, not posted, ...). */
  | 'wrong_state'
  /** A maker tried to approve or reject their own request. */
  | 'maker_cannot_approve'
  /** The workflow engine's guard refused the move (a role, a permission, a reason, a condition). */
  | 'approval_denied'
  /** The store offers no transaction, so nothing can be posted atomically. */
  | 'no_transaction'
  /** A posting the ledger refused. */
  | 'posting_failed'
  /** A credit note cannot be applied to an invoice it does not belong to, or over its own amount. */
  | 'application_refused'
  /** The learner is not clearable: a stated clearance condition does not hold. */
  | 'not_clearable'
  /** A document carries a currency the module does not handle, or two that do not match. */
  | 'currency_mismatch';

/** The refusal of an adjustment. */
export class AdjustmentError extends Error {
  readonly code: AdjustmentErrorCode;
  readonly detail: Readonly<Record<string, unknown>>;

  constructor(
    code: AdjustmentErrorCode,
    message: string,
    detail: Readonly<Record<string, unknown>> = {}
  ) {
    super(message);
    this.name = 'AdjustmentError';
    this.code = code;
    this.detail = detail;
  }
}

/** True when a value is an {@link AdjustmentError}. */
export function isAdjustmentError(value: unknown): value is AdjustmentError {
  return value instanceof AdjustmentError;
}
