// ABOUTME: The refusals a billing run raises: a missing period, a request with no transaction, a
// ABOUTME: charge that is not positive, and the conflict a replayed run identity is reported as.

/** Why a billing run was refused. */
export type BillingErrorCode =
  | 'period_missing'
  | 'period_invalid'
  | 'institution_missing'
  | 'no_transaction'
  | 'learner_missing'
  | 'charge_invalid'
  | 'currency_mismatch'
  | 'request_invalid'
  | 'storage';

/** Options of a {@link BillingError}. */
export interface BillingErrorOptions {
  readonly detail?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
}

/** A refusal of the billing module, carrying the code the caller branches on. */
export class BillingError extends Error {
  readonly code: BillingErrorCode;
  readonly detail: Readonly<Record<string, unknown>> | undefined;

  constructor(code: BillingErrorCode, message: string, options: BillingErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'BillingError';
    this.code = code;
    this.detail = options.detail;
  }
}

/** True when a value is a {@link BillingError}. */
export function isBillingError(value: unknown): value is BillingError {
  return value instanceof BillingError;
}
