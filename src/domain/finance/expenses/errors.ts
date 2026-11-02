// ABOUTME: The refusals the expense rules raise, each naming why so a dialog can mark the field the
// ABOUTME: caller has to fix instead of showing a generic failure.

/** Why a recorded expense was refused. */
export type ExpenseErrorCode =
  /** The institution is missing. */
  | 'institution_required'
  /** The date is empty or is not an ISO day. */
  | 'date_invalid'
  /** The payee is empty. */
  | 'payee_required'
  /** The amount is missing, not a whole number of minor units, or not positive. */
  | 'amount_invalid'
  /** The expense account or the payment account is missing. */
  | 'account_required'
  /** Another expense of the institution already carries the reference. */
  | 'reference_taken'
  /** The expense the caller named does not exist. */
  | 'not_found'
  /** The expense is already reversed. */
  | 'already_reversed'
  /** A reversal was asked for without a reason. */
  | 'reason_required';

export interface ExpenseErrorOptions {
  /** The id of the expense the refusal is about. */
  readonly id?: string;
  /** The form field the caller has to fix, e.g. `payee` or `amount`. */
  readonly field?: string;
  readonly cause?: unknown;
}

/** A refusal that belongs to the expense rules, not to the repository or the ledger. */
export class ExpenseError extends Error {
  readonly code: ExpenseErrorCode;
  readonly entity = 'expense' as const;
  readonly id?: string;
  readonly field?: string;

  constructor(code: ExpenseErrorCode, message: string, options: ExpenseErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ExpenseError';
    this.code = code;
    if (options.id !== undefined) this.id = options.id;
    if (options.field !== undefined) this.field = options.field;
  }
}

/** True when the error is an expense refusal, optionally of the given code. */
export function isExpenseError(error: unknown, code?: ExpenseErrorCode): error is ExpenseError {
  if (!(error instanceof ExpenseError)) return false;
  return code === undefined || error.code === code;
}
