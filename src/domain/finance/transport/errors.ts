// ABOUTME: The refusals the transport billing rules raise, each naming the route, period or learner
// ABOUTME: the caller has to fix instead of leaving a generic failure in the dialog.

/** Why a transport charge was refused. */
export type TransportErrorCode =
  /** The institution is missing. */
  | 'institution_required'
  /** No route was named, or the route does not exist. */
  | 'route_not_found'
  /** The route is not active, so it is not offered for billing. */
  | 'route_inactive'
  /** The route belongs to a different institution than the one being billed. */
  | 'route_institution_mismatch'
  /** No academic period was named, or the period does not exist. */
  | 'period_not_found'
  /** The academic period is closed; it cannot receive a new charge. */
  | 'period_closed'
  /** The period belongs to a different institution than the one being billed. */
  | 'period_institution_mismatch'
  /** The issue date is empty or is not an ISO day. */
  | 'date_invalid'
  /** The route's cost is not a positive whole number of minor units. */
  | 'amount_invalid'
  /** The route names no revenue account to credit. */
  | 'revenue_account_missing'
  /** The repository cannot run the posting in a transaction. */
  | 'transaction_required'
  /** The store refused or could not complete the operation. */
  | 'storage';

export interface TransportErrorOptions {
  /** The id of the route, period or learner the refusal is about. */
  readonly id?: string;
  readonly cause?: unknown;
}

/** A refusal that belongs to the transport rules, not to the repository or the ledger. */
export class TransportError extends Error {
  readonly code: TransportErrorCode;
  readonly entity = 'transport_route' as const;
  readonly id?: string;

  constructor(code: TransportErrorCode, message: string, options: TransportErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'TransportError';
    this.code = code;
    if (options.id !== undefined) this.id = options.id;
  }
}

/** True when the error is a transport refusal, optionally of the given code. */
export function isTransportError(
  error: unknown,
  code?: TransportErrorCode
): error is TransportError {
  if (!(error instanceof TransportError)) return false;
  return code === undefined || error.code === code;
}
