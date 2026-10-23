// ABOUTME: The refusals of the installments module: a plan that does not sum to 100, a percentage
// ABOUTME: held to more than two decimals, an invalid installment count, a missing due date, and the
// ABOUTME: schedule line or plan a caller named that does not exist.

/** Why the installments module refused a call. */
export type InstallmentErrorCode =
  /** The installment count is not a whole number at or above one. */
  | 'installment_count_invalid'
  /** A percentage is not a number between 0 and 100. */
  | 'percent_invalid'
  /** A percentage carries more than two decimals, so it cannot be held in basis points exactly. */
  | 'percent_precision'
  /** The percentages of a plan do not sum to 100. */
  | 'percentages_do_not_sum'
  /** A plan declares no installment. */
  | 'no_installments'
  /** A plan carries no name. */
  | 'name_required'
  /** The institution a plan names does not exist or was not named. */
  | 'institution_missing'
  /** Two installments of a plan share a sequence number. */
  | 'sequence_duplicate'
  /** An installment's sequence number is not a whole number at or above one. */
  | 'sequence_invalid'
  /** An installment's due date is not an ISO calendar day. */
  | 'due_date_invalid'
  /** A split left an installment below zero, which no rule of a percentage plan permits. */
  | 'negative_installment'
  /** The total a caller split is not a Money value. */
  | 'amount_not_money'
  /** The schedule line a caller named does not exist. */
  | 'schedule_line_not_found'
  /** The plan a caller named does not exist. */
  | 'plan_not_found'
  /** The row the caller named does not exist. */
  | 'not_found'
  /** The store refused the write. */
  | 'storage';

/** A refusal that belongs to the installments module. */
export class InstallmentError extends Error {
  readonly code: InstallmentErrorCode;
  /** The plan the refusal is about, when one is known. */
  readonly installmentPlanId?: string;
  /** The underlying error, when the refusal wraps one. */
  override readonly cause?: unknown;

  constructor(
    code: InstallmentErrorCode,
    message: string,
    options: { readonly installmentPlanId?: string; readonly cause?: unknown } = {}
  ) {
    super(message);
    this.name = 'InstallmentError';
    this.code = code;
    if (options.installmentPlanId !== undefined) this.installmentPlanId = options.installmentPlanId;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** True when the error is an installments error, optionally of the given code. */
export function isInstallmentError(
  error: unknown,
  code?: InstallmentErrorCode
): error is InstallmentError {
  if (!(error instanceof InstallmentError)) return false;
  return code === undefined || error.code === code;
}
