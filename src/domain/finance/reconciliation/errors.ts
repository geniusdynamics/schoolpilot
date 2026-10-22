// ABOUTME: The refusals of statement import and reconciliation: a malformed file named by its line,
// ABOUTME: a statement counted in another currency, a line or a payment already matched, and an
// ABOUTME: unmatch without a reason.

/** Why statement import or reconciliation refused. */
export type ReconciliationErrorCode =
  /** The file carries no transaction record at all. */
  | 'empty_statement'
  /** The text is neither a CSV nor an OFX the parser knows. */
  | 'unknown_format'
  /** A column the statement cannot be read without is missing from the header. */
  | 'missing_columns'
  /** A record does not have the shape its header promised. */
  | 'malformed_row'
  /** A date that is not one of the shapes a statement writes, or does not exist. */
  | 'invalid_date'
  /** An amount that is not a decimal, or carries more precision than the currency holds. */
  | 'invalid_amount'
  /** A record carries no amount at all. */
  | 'missing_amount'
  /** A record's amount sign and its direction column disagree, or no direction can be read. */
  | 'ambiguous_direction'
  /** A record's amount is zero: a statement line moves money. */
  | 'zero_amount'
  /** The statement is counted in a code the money module does not know. */
  | 'unknown_currency'
  /** The statement's own currency is not the currency of the account it belongs to. */
  | 'currency_mismatch'
  /** The statement names an account the directory does not hold. */
  | 'account_not_found'
  /** The statement line does not exist. */
  | 'line_not_found'
  /** The payment or ledger entry a match names does not exist. */
  | 'candidate_not_found'
  /** The statement line already carries a confirmed match. */
  | 'line_already_matched'
  /** The payment or ledger entry already carries a confirmed match. */
  | 'candidate_already_matched'
  /** The match record does not exist. */
  | 'match_not_found'
  /** The match record has already been unmatched. */
  | 'match_already_unmatched'
  /** A match record is history: it is unmatched, never deleted. */
  | 'match_immutable'
  /** An unmatch without a reason is not an audit. */
  | 'reason_required'
  /** The statement line and the candidate are counted in different currencies. */
  | 'match_currency_mismatch'
  /** Nothing is unexplained: there is no difference to post. */
  | 'nothing_to_post'
  /** The exact file was imported before; importing it again would duplicate its lines. */
  | 'duplicate_statement'
  /** No suspense poster was supplied, so an unexplained difference cannot be posted. */
  | 'no_suspense_poster'
  /** The store refused or could not complete the operation. */
  | 'storage'
  /** A store bound to a transaction cannot open a second one. */
  | 'nested_transaction';

/**
 * A refusal of statement import or reconciliation.
 *
 * `detail` carries the values that made the rule fail - the file line number, the offending text,
 * the account - so a caller can render the reason without parsing the message.
 */
export class ReconciliationError extends Error {
  readonly code: ReconciliationErrorCode;
  readonly detail: Readonly<Record<string, unknown>>;

  constructor(
    code: ReconciliationErrorCode,
    message: string,
    options: { cause?: unknown; detail?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = 'ReconciliationError';
    this.code = code;
    this.detail = options.detail ?? {};
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** True for every error this module raises. */
export function isReconciliationError(error: unknown): error is ReconciliationError {
  return error instanceof ReconciliationError;
}
