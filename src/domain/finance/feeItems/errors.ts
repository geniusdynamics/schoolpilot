// ABOUTME: The refusals the fee-item rules raise. Every one names why it refused, so a form can
// ABOUTME: mark the field the caller has to fix instead of showing a generic failure.

/** Why a fee-item rule refused a write. */
export type FeeItemErrorCode =
  /** The institution the item names does not exist. */
  | 'institution_missing'
  /** The institution's base currency is not a currency of the table. */
  | 'institution_currency_invalid'
  /** The code is empty or carries characters a vote-head code cannot carry. */
  | 'code_malformed'
  /** Another fee item of the institution already holds the code. */
  | 'code_taken'
  /** The name is empty. */
  | 'name_required'
  /** The category is not one of the declared categories. */
  | 'category_invalid'
  /** The funding source is not one of the declared sources. */
  | 'funding_source_invalid'
  /** The priority is not a whole number at or above the minimum. */
  | 'priority_invalid'
  /** Another active fee item of the institution already holds the priority. */
  | 'priority_taken'
  /** The GL account code is empty or carries characters an account code cannot carry. */
  | 'gl_account_malformed'
  /** The GL account code names no account of the chart of accounts. */
  | 'gl_account_unresolved'
  /** The caller tried to clear a GL account code; the canonical column is optional but not nullable. */
  | 'gl_account_not_clearable'
  /** An amount is not a money value. */
  | 'amount_not_money'
  /** An amount is counted in a currency other than the institution's. */
  | 'amount_currency_mismatch'
  /** An amount is not a whole number of minor units of a currency of the table. */
  | 'amount_invalid'
  /** A fee structure or a live invoice references the item, so it cannot be deactivated. */
  | 'fee_item_in_use'
  /** The row the caller named does not exist. */
  | 'not_found';

export interface FeeItemErrorOptions {
  /** The id of the row the refusal is about. */
  readonly id?: string;
  /** The field of the item the caller has to fix, e.g. `code` or `priority`. */
  readonly field?: string;
  /** The failure that led to this one. */
  readonly cause?: unknown;
}

/** A refusal that belongs to the fee-item rules, not to the repository. */
export class FeeItemError extends Error {
  readonly code: FeeItemErrorCode;
  readonly entity = 'fee_item' as const;
  readonly id?: string;
  readonly field?: string;

  constructor(code: FeeItemErrorCode, message: string, options: FeeItemErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'FeeItemError';
    this.code = code;
    if (options.id !== undefined) this.id = options.id;
    if (options.field !== undefined) this.field = options.field;
  }
}

/** True when the error is a fee-item refusal, optionally of the given code. */
export function isFeeItemError(error: unknown, code?: FeeItemErrorCode): error is FeeItemError {
  if (!(error instanceof FeeItemError)) return false;
  return code === undefined || error.code === code;
}
