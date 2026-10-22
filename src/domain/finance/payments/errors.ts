// ABOUTME: The refusals of the payments core: a payment that cannot be taken, a cheque that cannot
// ABOUTME: make the move asked of it, and a cashier session that is closed or already reconciled.

/** Why the payments core refused. */
export type PaymentErrorCode =
  /** The amount is zero or negative; a payment is a positive amount. */
  | 'amount_not_positive'
  /** The amount is not a money value, or is not counted in the institution's currency. */
  | 'amount_invalid'
  /** The amount is in another currency than the institution's. */
  | 'amount_currency_mismatch'
  /** The learner the payment names does not exist. */
  | 'learner_missing'
  /** The institution the payment names does not exist. */
  | 'institution_missing'
  /** The institution's base currency is not a currency of the money table. */
  | 'institution_currency_invalid'
  /** The channel is not one of the six of spec 05 §5.1. */
  | 'channel_invalid'
  /** A channel that arrives with a slip or a provider reference was given none. */
  | 'reference_required'
  /** The cheque lifecycle has no move from the state it is in to the state asked for. */
  | 'cheque_transition_invalid'
  /** The payment is not a cheque, so the cheque lifecycle does not apply to it. */
  | 'not_a_cheque'
  /** The receipt or payment the caller names does not exist. */
  | 'not_found'
  /** The cashier session does not exist. */
  | 'session_missing'
  /** The cashier session is closed; nothing more may be attached to it. */
  | 'session_closed'
  /** The cashier session has already been reconciled and closed. */
  | 'session_already_closed'
  /** The cashier session's currency is not the amount's currency. */
  | 'session_currency_mismatch'
  /** A cashier session cannot be opened for a cashier who already holds an open one. */
  | 'session_already_open'
  /** The opening float is zero or negative, or is not a whole number of minor units. */
  | 'opening_float_invalid'
  /** The counted cash is not a whole number of minor units, or is negative. */
  | 'counted_cash_invalid'
  /** The payment has already been posted to the ledger, or the ledger refused the posting. */
  | 'already_posted'
  /** The payment is not in a state that may be posted, deposited, cleared or bounced. */
  | 'payment_state_invalid'
  /** The receipt number could not be issued. */
  | 'receipt_number_unavailable'
  /** A receipt is voided once; a second void is refused. */
  | 'receipt_already_void'
  /** The store refused or could not complete the operation. */
  | 'storage';

/** The base of every error this module raises. */
export class PaymentError extends Error {
  readonly code: PaymentErrorCode;
  /** The values that made the rule fail, so a caller can render the reason without parsing text. */
  readonly detail: Readonly<Record<string, unknown>>;

  constructor(
    code: PaymentErrorCode,
    message: string,
    options: { cause?: unknown; detail?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.detail = options.detail ?? {};
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** True for every error this module raises. */
export function isPaymentError(error: unknown): error is PaymentError {
  return error instanceof PaymentError;
}
