// ABOUTME: The refusals of the posting engine: an entry that cannot balance, a chart that cannot
// ABOUTME: place a fee item, a period that is closed, and a posted entry that is immutable.

/** Why the posting engine refused. */
export type LedgerErrorCode =
  /** An entry with no lines. */
  | 'empty_entry'
  /** An entry with one line: a double entry needs at least two. */
  | 'single_line'
  /** A line carrying both a debit and a credit. */
  | 'both_sides'
  /** A line carrying neither a debit nor a credit. */
  | 'no_side'
  /** A line whose amount is zero or negative; a journal line is a positive amount on one side. */
  | 'zero_line'
  /** Two lines of one entry counted in different currencies. */
  | 'currency_mismatch'
  /** The debits do not equal the credits. */
  | 'unbalanced'
  /** A malformed field: a date that is not an ISO day, an empty narration, a missing source id. */
  | 'invalid_entry'
  /** The chart of accounts cannot place a fee item or a control account. */
  | 'no_mapping'
  /** The entry date lies inside a closed period. */
  | 'period_closed'
  /** Two periods of one institution overlap. */
  | 'period_overlap'
  /** A posted entry cannot be edited or deleted; post a reversal instead. */
  | 'immutable'
  /** The entry, the period or the source document does not exist. */
  | 'not_found'
  /** The source document already has a journal entry. */
  | 'conflict'
  /** The entry has already been reversed, or the document already corrected. */
  | 'already_reversed'
  /** The store refused or could not complete the operation. */
  | 'storage'
  /** A store bound to a transaction cannot open a second one. */
  | 'nested_transaction';

/** The base of every error this module raises. */
export class LedgerError extends Error {
  readonly code: LedgerErrorCode;
  /** The values that made the rule fail, so a caller can render the reason without parsing text. */
  readonly detail: Readonly<Record<string, unknown>>;

  constructor(
    code: LedgerErrorCode,
    message: string,
    options: { cause?: unknown; detail?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = 'LedgerError';
    this.code = code;
    this.detail = options.detail ?? {};
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** True for every error this module raises. */
export function isLedgerError(error: unknown): error is LedgerError {
  return error instanceof LedgerError;
}
