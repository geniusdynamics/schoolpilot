// ABOUTME: The portal's pay action: a request for the outstanding balance through the payment
// ABOUTME: provider seam the finance module already uses, or an honest "no provider" answer.

import { describe, expect, it, vi } from 'vitest';

import type {
  CollectionRequest,
  CollectionResponse,
  PaymentProvider,
} from '@/domain/finance/payments/providers/types';
import { ProviderError } from '@/domain/finance/payments/providers/errors';

import { resolvePortalIdentity } from '../portalAccess';
import { requestPayLink } from '../payLink';

import { ENROLMENT_A, GUARDIAN, IDS, LEARNER_A, LINK_A } from './fixtures';

const identity = resolvePortalIdentity({
  status: 'ready',
  loginUserId: IDS.login,
  canonicalUser: { id: IDS.canonicalUser, username: 'grace', person_ref: { type: 'guardian', id: GUARDIAN.id } },
  learners: [LEARNER_A],
  enrolments: [ENROLMENT_A],
  classGroups: [],
  guardians: [GUARDIAN],
  learnerGuardians: [LINK_A],
});

const request = {
  identity,
  learnerId: IDS.learnerA,
  amountMinor: 125_000,
  accountReference: 'ADM/2026/001',
  phone: '+254712345678',
  description: 'Term 1 fees',
  callbackUrl: 'https://school.test/webhooks/mpesa',
};

/** A provider that records the request it was given and answers with a pending charge. */
function provider(capabilities: { collection: boolean } = { collection: true }) {
  const sent: CollectionRequest[] = [];
  const initiateCharge = vi.fn(
    async (request: CollectionRequest): Promise<CollectionResponse> => {
      sent.push(request);
      return {
        transactionId: 'ws_CO_1',
        status: 'pending',
        message: 'Enter your PIN',
        raw: {},
      };
    }
  );
  const value: PaymentProvider = {
    describe: () => ({
      id: 'mpesa',
      name: 'M-Pesa',
      capabilities: { collection: capabilities.collection, notification: true, refund: false, query: true, statement: false },
    }),
    signature: () => ({ scheme: 'none', headerNames: [], description: '' }),
    idempotency: () => ({ retries: false, keyFields: [], description: '' }),
    idempotencyKey: () => 'mpesa:ws_CO_1',
    verifyWebhook: () => ({ valid: true, reason: 'none' }),
    parseNotification: () => null,
    initiateCharge,
    refund: async () => {
      throw new Error('not used');
    },
    queryTransaction: async () => {
      throw new Error('not used');
    },
    statementDialect: () => ({ supported: false, format: null, columns: [], headerSignature: null, notes: null }),
  };
  return { value, initiateCharge, sent };
}

describe('the portal pay action', () => {
  it('says no provider is configured instead of failing silently', async () => {
    const outcome = await requestPayLink({ ...request, provider: null });

    expect(outcome).toEqual({ kind: 'not-configured' });
  });

  it('sends the outstanding balance through the provider interface', async () => {
    const { value, initiateCharge, sent } = provider();

    const outcome = await requestPayLink({ ...request, provider: value });

    expect(outcome).toEqual({
      kind: 'issued',
      transactionId: 'ws_CO_1',
      status: 'pending',
      message: 'Enter your PIN',
    });
    expect(initiateCharge).toHaveBeenCalledTimes(1);
    expect(sent[0]).toEqual({
      amount: { amount_minor: 125_000, currency: 'KES' },
      accountReference: 'ADM/2026/001',
      phone: '+254712345678',
      description: 'Term 1 fees',
      callbackUrl: 'https://school.test/webhooks/mpesa',
    });
  });

  it('refuses when the provider cannot collect money', async () => {
    const { value, initiateCharge } = provider({ collection: false });

    const outcome = await requestPayLink({ ...request, provider: value });

    expect(outcome.kind).toBe('unsupported');
    expect(initiateCharge).not.toHaveBeenCalled();
  });

  it('reports the provider’s refusal in its own words', async () => {
    const { value, initiateCharge } = provider();
    initiateCharge.mockRejectedValueOnce(new ProviderError('charge_refused', 'The payer cancelled the request'));

    const outcome = await requestPayLink({ ...request, provider: value });

    expect(outcome).toEqual({ kind: 'refused', reason: 'The payer cancelled the request' });
  });

  it('refuses a learner the account may not read before it calls any provider', async () => {
    const { value, initiateCharge } = provider();

    await expect(
      requestPayLink({ ...request, learnerId: IDS.learnerOther, provider: value })
    ).rejects.toThrow(/not linked/i);
    expect(initiateCharge).not.toHaveBeenCalled();
  });

  it('refuses a balance that is not a positive amount', async () => {
    const { value } = provider();

    const outcome = await requestPayLink({ ...request, amountMinor: 0, provider: value });

    expect(outcome.kind).toBe('refused');
  });
});
