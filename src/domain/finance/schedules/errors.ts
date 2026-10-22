// ABOUTME: The refusals of the fee-schedule module: a cell the matrix cannot resolve, a version
// ABOUTME: that may not be edited, a malformed amount, an uplift the service cannot apply, and the
// ABOUTME: maker-checker rule the workflow's own guard does not carry.

/** Why the schedule service refused a call. */
export type ScheduleErrorCode =
  /** The institution a version names does not exist. */
  | 'institution_missing'
  /** The institution's base currency is not one the money table holds. */
  | 'institution_currency_invalid'
  /** A version number is not a whole number at or above 1. */
  | 'version_invalid'
  /** The matrix name is empty. */
  | 'name_required'
  /** A version declares no cells. */
  | 'no_cells'
  /** Two cells of a version address the same point of the matrix. */
  | 'cell_duplicate'
  /** Two lines of a cell price the same fee item. */
  | 'line_duplicate'
  /** A cell addresses a value the schedule's header does not declare. */
  | 'cell_dimension_unknown'
  /** A dimension the schedule spans with more than one value was not named by the caller. */
  | 'cell_ambiguous'
  /** A dimension the schedule spans with no value was not named by the caller. */
  | 'cell_dimension_undeclared'
  /** No cell of the version prices the combination the caller asked for. */
  | 'cell_missing'
  /** An amount is not a Money value. */
  | 'amount_not_money'
  /** An amount is not in the institution's currency. */
  | 'amount_currency_mismatch'
  /** The version the caller named does not exist. */
  | 'version_not_found'
  /** The version is approved or published, so its prices are frozen; derive a new version instead. */
  | 'version_immutable'
  /** An uplift is malformed: a negative percentage, a non-finite value, or a delta in the wrong currency. */
  | 'uplift_invalid'
  /** The maker of a submission may not approve it. */
  | 'maker_cannot_approve'
  /** The workflow engine refused the move; `cause` carries its error. */
  | 'approval_denied'
  /** The row the caller named does not exist. */
  | 'not_found';

/** A refusal that belongs to the fee-schedule module. */
export class ScheduleError extends Error {
  readonly code: ScheduleErrorCode;
  /** The fee-schedule row the refusal is about, when one is known. */
  readonly feeScheduleId?: string;
  /** The underlying error, when the refusal wraps one. */
  override readonly cause?: unknown;

  constructor(
    code: ScheduleErrorCode,
    message: string,
    options: { readonly feeScheduleId?: string; readonly cause?: unknown } = {}
  ) {
    super(message);
    this.name = 'ScheduleError';
    this.code = code;
    if (options.feeScheduleId !== undefined) this.feeScheduleId = options.feeScheduleId;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** True when the error is a schedule error, optionally of the given code. */
export function isScheduleError(error: unknown, code?: ScheduleErrorCode): error is ScheduleError {
  if (!(error instanceof ScheduleError)) return false;
  return code === undefined || error.code === code;
}
