// ABOUTME: The refusals of the payment-provider seam: a capability the provider does not have, a
// ABOUTME: delivery that is not trusted or not recognised, a payment that does not match what was
// ABOUTME: charged, and the store and transport failures around them.

/** Why the provider seam refused. */
export type ProviderErrorCode =
  /** The provider does not have the capability the caller asked for. */
  | 'capability_unsupported'
  /** The delivery did not pass the provider's own signature, token or allowlist check. */
  | 'signature_invalid'
  /** The body is not a notification of this provider. */
  | 'payload_unrecognised'
  /** The body is one of the provider's, but a field it needs is missing or malformed. */
  | 'payload_invalid'
  /** The notification's amount is not the amount that was charged. */
  | 'amount_mismatch'
  /** The provider does not know the transaction. */
  | 'transaction_unknown'
  /** A second transaction carries a receipt number this provider has already been paid under. */
  | 'duplicate_receipt'
  /** A credential the provider needs was not supplied. */
  | 'credentials_missing'
  /** The provider refused to initiate the charge. */
  | 'charge_refused'
  /** The provider refused to issue the refund. */
  | 'refund_refused'
  /** The provider's own API refused or failed. */
  | 'transport'
  /** A record the caller named does not exist. */
  | 'not_found'
  /** The record is not in a state that permits what was asked. */
  | 'state_invalid'
  /** The store refused the write, or a uniqueness invariant held. */
  | 'storage';

/** The base of every error this seam raises. */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  /** The values that made the rule fail, so a caller can render the reason without parsing text. */
  readonly detail: Readonly<Record<string, unknown>>;

  constructor(
    code: ProviderErrorCode,
    message: string,
    options: { cause?: unknown; detail?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.detail = options.detail ?? {};
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** True for every error this seam raises. */
export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

/**
 * Refuses when a provider does not have a capability a caller is about to use.
 *
 * The seam asks before it acts, so a provider that cannot refund says so once, by name, rather than
 * a caller discovering it halfway through a refund. A provider declares its capabilities in
 * `describe()`, and this is the one place that declaration is enforced.
 */
export function requireCapability(
  identity: { readonly id: string },
  supported: boolean,
  capability: string,
  what: string
): void {
  if (!supported) {
    throw new ProviderError(
      'capability_unsupported',
      `${identity.id} does not support ${capability}, so it cannot ${what}`,
      { detail: { providerId: identity.id, capability, what } }
    );
  }
}
