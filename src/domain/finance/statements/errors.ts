// ABOUTME: The refusals of the statements module: a subject the repository does not hold, a period
// ABOUTME: that runs backwards, and a document index that names no ledger entry.

/** Why the statements module refused. */
export type StatementErrorCode =
  /** The learner, household, sponsorship or institution does not exist. */
  | 'not_found'
  /** A period bound is not an ISO day, or the range runs backwards. */
  | 'invalid_period'
  /** A subject names no document, so there is no statement to build. */
  | 'no_documents'
  /** An amount is not a positive whole number of minor units. */
  | 'invalid_amount'
  /** The store or the ledger refused or could not complete the read. */
  | 'storage';

/** The base of every error this module raises. */
export class StatementError extends Error {
  readonly code: StatementErrorCode;
  /** The values that made the rule fail, so a caller can render the reason without parsing text. */
  readonly detail: Readonly<Record<string, unknown>>;

  constructor(
    code: StatementErrorCode,
    message: string,
    options: { cause?: unknown; detail?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = 'StatementError';
    this.code = code;
    this.detail = options.detail ?? {};
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** True for every error this module raises, or for one with a given code when one is named. */
export function isStatementError(error: unknown, code?: StatementErrorCode): error is StatementError {
  return error instanceof StatementError && (code === undefined || error.code === code);
}
