// ABOUTME: The portal's pay action: it asks the payment provider seam the finance module already
// ABOUTME: defines to collect the learner's outstanding balance, and says plainly when no provider is
// ABOUTME: configured or the provider cannot collect.

import { fromMinor, type Money } from '@/domain/money';
import type {
  CollectionResponse,
  PaymentProvider,
  ProviderTransactionStatus,
} from '@/domain/finance/payments/providers/types';
import { isProviderError } from '@/domain/finance/payments/providers/errors';

import { assertLearnerAccess, type PortalIdentity } from './portalAccess';

/** What the portal shows after the parent taps "Pay". */
export type PayLinkOutcome =
  | {
      readonly kind: 'issued';
      readonly transactionId: string;
      readonly status: ProviderTransactionStatus;
      readonly message: string | null;
    }
  | { readonly kind: 'not-configured' }
  | { readonly kind: 'unsupported'; readonly reason: string }
  | { readonly kind: 'refused'; readonly reason: string };

export interface PayLinkInput {
  readonly identity: PortalIdentity;
  readonly learnerId: string;
  /** The outstanding balance in whole minor units. */
  readonly amountMinor: number;
  readonly accountReference: string;
  readonly phone: string;
  readonly description: string;
  readonly callbackUrl: string;
  /** The configured provider; null when the school has not configured one. */
  readonly provider: PaymentProvider | null;
}

const NO_PROVIDER_REASON =
  'No payment provider is configured for this school, so the portal cannot request a payment.';

/**
 * Requests a collection of one learner's outstanding balance.
 *
 * The money movement is the provider's: this only builds the request the seam already defines
 * (`initiateCharge`) from the balance the finance module computed. Nothing here decides what is
 * owed, and an account that may not read the learner is refused before any provider is touched.
 */
export async function requestPayLink(input: PayLinkInput): Promise<PayLinkOutcome> {
  assertLearnerAccess(input.identity, input.learnerId);

  if (input.amountMinor <= 0) {
    return { kind: 'refused', reason: 'There is no outstanding balance to collect.' };
  }

  const provider = input.provider;
  if (!provider) return { kind: 'not-configured' };

  const identity = provider.describe();
  if (!identity.capabilities.collection) {
    return { kind: 'unsupported', reason: NO_PROVIDER_REASON };
  }

  const amount: Money = fromMinor(input.amountMinor, 'KES');

  let response: CollectionResponse;
  try {
    response = await provider.initiateCharge({
      amount,
      accountReference: input.accountReference,
      phone: input.phone,
      description: input.description,
      callbackUrl: input.callbackUrl,
    });
  } catch (error) {
    const reason = isProviderError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : 'The payment provider could not be reached.';
    return { kind: 'refused', reason };
  }

  return {
    kind: 'issued',
    transactionId: response.transactionId,
    status: response.status,
    message: response.message,
  };
}

/** The message the fees page shows for an outcome that did not issue a charge. */
export function payLinkMessage(outcome: PayLinkOutcome | null): string | null {
  if (!outcome) return null;
  switch (outcome.kind) {
    case 'not-configured':
      return NO_PROVIDER_REASON;
    case 'unsupported':
    case 'refused':
      return outcome.reason;
    default:
      return null;
  }
}
