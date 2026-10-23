// ABOUTME: The collections module's own error type and the codes a caller can branch on, so a
// ABOUTME: refusal reads as a decision rather than as a raw storage or crypto failure.

/** Why a collections operation was refused. */
export type CollectionsErrorCode =
  | 'schedule_not_found'
  | 'schedule_invalid'
  | 'interval_invalid'
  | 'template_unknown_variable'
  | 'template_missing_variable'
  | 'pay_link_not_found'
  | 'pay_link_expired'
  | 'pay_link_signature'
  | 'pay_link_used'
  | 'crypto_unavailable'
  | 'channel_unavailable'
  | 'storage';

/** The error the collections module throws. */
export class CollectionsError extends Error {
  readonly code: CollectionsErrorCode;
  readonly detail: Readonly<Record<string, unknown>>;

  constructor(
    code: CollectionsErrorCode,
    message: string,
    options: { readonly detail?: Readonly<Record<string, unknown>>; readonly cause?: unknown } = {}
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'CollectionsError';
    this.code = code;
    this.detail = options.detail ?? {};
  }
}

/** True when the failure is the module's own. */
export function isCollectionsError(value: unknown): value is CollectionsError {
  return value instanceof CollectionsError;
}
