// ABOUTME: The provider intake against real SQLite, driven by the recorded M-Pesa payloads: each
// ABOUTME: sandbox flow ends in a matched, posted payment with no manual step, a duplicate callback
// ABOUTME: writes once, an unknown learner goes to suspense and comes back to zero, and a charge with
// ABOUTME: no callback is completed by polling. No test reaches the network.

import { afterEach, describe, expect, it } from 'vitest';

import { closeTestContext, createTestContext, TEST_ACTOR, type TestContext } from '@/data/__tests__/harness';
import { fromMinor } from '@/domain/money';
import {
  CONTROL_ACCOUNTS,
  LedgerService,
  createLedgerAccountMapping,
  createSqliteLedgerStore,
  ensureLedgerSchema,
} from '@/domain/finance/ledger';
import { RECONCILIATION_ACCOUNTS } from '@/domain/finance/reconciliation';
import { SequenceService, createSqliteSequenceStore, ensureSequenceSchema } from '@/domain/sequences';
import { PAYMENTS_SEQUENCE_CATALOG, PaymentsService } from '@/domain/finance/payments';
import {
  ProviderPaymentService,
  createSqliteProviderEventStore,
  createSqliteProviderSuspenseStore,
  createStoreLearnerDirectory,
  ensureProviderPaymentSchema,
  type PaymentProvider,
  type ProviderEventStore,
  type ProviderSuspenseStore,
} from '@/domain/finance/payments/providers';

import { loadDarajaCredentials } from '../credentials';
import { MPESA_ROUTES } from '../payloads';
import { createMpesaProvider, MPESA_PROVIDER_ID, type MpesaProvider } from '../provider';
import { readPayload, withSubstitutions } from './fixtures';
import { createRecorderTransport, type RecorderTransport } from './recorder';

const CLOCK = () => new Date('2027-02-10T09:00:00.000Z');
const KES = (minor: number) => fromMinor(minor, 'KES');

/** The seeded learner's admission number, from the canonical fixtures. */
const ADMISSION = 'GA/2027/001';
const CALLBACK_TOKEN = 'callback-token-1';

const CREDENTIALS = loadDarajaCredentials({
  DARAJA_ENVIRONMENT: 'sandbox',
  DARAJA_CONSUMER_KEY: 'test-consumer-key',
  DARAJA_CONSUMER_SECRET: 'test-consumer-secret',
  DARAJA_SHORT_CODE: '174379',
  DARAJA_PASSKEY: 'test-passkey',
  DARAJA_INITIATOR_NAME: 'testapi',
  DARAJA_SECURITY_CREDENTIAL: 'test-security-credential',
  DARAJA_CALLBACK_BASE_URL: 'https://school.example.test',
  DARAJA_CALLBACK_TOKEN: CALLBACK_TOKEN,
  DARAJA_SOURCE_IP_ALLOWLIST: '196.201.214.200',
});

/** The source address the plugin accepts a delivery from, in the configured allowlist. */
const ALLOWED_SOURCE = '196.201.214.200';

interface Harness {
  readonly context: TestContext;
  readonly payments: PaymentsService;
  readonly ledger: LedgerService;
  readonly events: ProviderEventStore;
  readonly suspense: ProviderSuspenseStore;
  readonly intake: ProviderPaymentService;
  readonly provider: MpesaProvider;
  readonly transport: RecorderTransport;
  readonly institutionId: string;
  readonly learnerId: string;
  /** The canonical fixture's payment, which is not one the seam recorded. */
  readonly seededPaymentId: string;
}

const contexts: TestContext[] = [];

async function harness(): Promise<Harness> {
  const context = await createTestContext();
  contexts.push(context);
  const adapter = context.adapter;
  await ensureLedgerSchema(adapter);
  await ensureSequenceSchema(adapter);
  await ensureProviderPaymentSchema(adapter);

  const sequences = new SequenceService({
    store: createSqliteSequenceStore(adapter),
    definitions: PAYMENTS_SEQUENCE_CATALOG,
    deviceId: 'hub-1',
    now: CLOCK,
  });
  const ledger = new LedgerService({
    store: createSqliteLedgerStore(adapter),
    mapping: createLedgerAccountMapping(),
    actor: TEST_ACTOR,
    now: CLOCK,
  });
  const payments = new PaymentsService({
    store: context.repository,
    numbers: sequences,
    ledger,
    actor: TEST_ACTOR,
    now: CLOCK,
  });

  const events = createSqliteProviderEventStore(adapter);
  const suspense = createSqliteProviderSuspenseStore(adapter);
  const transport = createRecorderTransport();
  const provider = createMpesaProvider({ credentials: CREDENTIALS, transport, now: CLOCK });
  const intake = new ProviderPaymentService({
    store: context.repository,
    payments,
    events,
    suspense,
    learners: createStoreLearnerDirectory(context.repository),
    ledger,
    actor: TEST_ACTOR,
    now: CLOCK,
  });

  return {
    context,
    payments,
    ledger,
    events,
    suspense,
    intake,
    provider,
    transport,
    institutionId: context.seed.idOf('institution'),
    learnerId: context.seed.idOf('learner'),
    seededPaymentId: context.seed.idOf('payment'),
  };
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => closeTestContext(context)));
});

/** A delivery to one of the plugin's routes, carrying the configured callback token. */
function delivery(route: string, body: string) {
  return {
    route: `${route}?token=${CALLBACK_TOKEN}`,
    headers: { 'x-forwarded-for': ALLOWED_SOURCE },
    body,
  };
}

/** Queues the OAuth token, then the answer to the next API call. */
function queueTokenAnd(h: Harness, answer: string): void {
  h.transport.queue({ body: readPayload('oauth-token') });
  h.transport.queue({ body: answer });
}

/**
 * The payments the seam recorded.
 *
 * The canonical fixtures seed one payment, which the seam did not record, so it is left out: a test
 * that asserted "no payment" would otherwise pass for the wrong reason.
 */
async function payments(h: Harness) {
  const page = await h.context.repository.list('payment', { limit: 50 });
  return page.items.filter((row) => String(row.id) !== h.seededPaymentId);
}

/** The balance of one ledger account at the seeded institution. */
function balance(h: Harness, code: string) {
  return h.ledger.accountBalance(code, {
    institutionId: h.institutionId,
    currency: 'KES',
  });
}

describe('the provider seam refuses what a provider cannot do', () => {
  it('refuses with capability_unsupported rather than pretending', async () => {
    const h = await harness();
    const bare: PaymentProvider = {
      describe: () => ({
        id: 'no-nothing',
        name: 'A provider that can do nothing',
        capabilities: {
          collection: false,
          notification: false,
          refund: false,
          query: false,
          statement: false,
        },
      }),
      signature: () => ({ scheme: 'none', headerNames: [], description: 'nothing' }),
      idempotency: () => ({ retries: false, keyFields: [], description: 'nothing' }),
      idempotencyKey: (notification) => `no-nothing:${notification.transactionId}`,
      verifyWebhook: () => ({ valid: true, reason: 'nothing' }),
      parseNotification: () => null,
      initiateCharge: async () => {
        throw new Error('unreachable');
      },
      refund: async () => {
        throw new Error('unreachable');
      },
      queryTransaction: async () => {
        throw new Error('unreachable');
      },
      statementDialect: () => ({
        supported: false,
        format: null,
        columns: [],
        headerSignature: null,
        notes: null,
      }),
    };

    await expect(
      h.intake.receive(bare, delivery(MPESA_ROUTES.stk, '{}'), { institutionId: h.institutionId })
    ).rejects.toMatchObject({ code: 'capability_unsupported' });
    await expect(
      h.intake.initiateCharge(
        bare,
        {
          amount: KES(1000),
          accountReference: ADMISSION,
          phone: '254708374149',
          description: 'x',
          callbackUrl: 'https://school.example.test/hook',
        },
        { institutionId: h.institutionId }
      )
    ).rejects.toMatchObject({ code: 'capability_unsupported' });
    await expect(
      h.intake.reconcileOffline(bare, { institutionId: h.institutionId, transactionId: 'x' })
    ).rejects.toMatchObject({ code: 'capability_unsupported' });
  });
});

describe('auto-match: the recorded flows end in a matched, posted payment', () => {
  it('matches and posts an STK push from the recorded push and its callback', async () => {
    const h = await harness();
    queueTokenAnd(h, readPayload('stk-push-response'));

    const charge = await h.intake.initiateCharge(
      h.provider,
      {
        amount: KES(150_000),
        accountReference: ADMISSION,
        phone: '0708374149',
        description: 'Term 1 fees',
        callbackUrl: `https://school.example.test${MPESA_ROUTES.stk}?token=${CALLBACK_TOKEN}`,
      },
      { institutionId: h.institutionId }
    );
    expect(charge.transactionId).toBe('ws_CO_191220191020363925');
    // The charge is recorded as pending, so a callback can complete it.
    expect(charge.event).toMatchObject({ outcome: 'pending', learnerId: h.learnerId });

    const result = await h.intake.receive(
      h.provider,
      delivery(MPESA_ROUTES.stk, readPayload('stk-callback-success')),
      { institutionId: h.institutionId }
    );

    expect(result.outcome).toBe('matched');
    expect(result.paymentId).not.toBeNull();

    const stored = (await payments(h))[0];
    expect(stored).toMatchObject({
      learner_id: h.learnerId,
      channel: 'mobile_money',
      reference: 'NLJ7RT61SV',
      status: 'posted',
      amount: { amount_minor: 150_000, currency: 'KES' },
    });
    // It went through the payments core, so a receipt was numbered and the money posted.
    const receipts = await h.context.repository.list('receipt', {
      where: { payment_id: stored?.id },
    });
    expect(receipts.items).toHaveLength(1);
    expect(await balance(h, CONTROL_ACCOUNTS.mobile_money_clearing.code)).toEqual(KES(150_000));
    expect(await balance(h, CONTROL_ACCOUNTS.receivables.code)).toEqual(KES(-150_000));
  });

  it('matches and posts a C2B confirmation from the recorded payload', async () => {
    const h = await harness();
    const body = JSON.stringify(
      withSubstitutions('c2b-confirmation', { '1234': ADMISSION, '1500': '1500' })
    );

    const result = await h.intake.receive(h.provider, delivery(MPESA_ROUTES.c2bConfirmation, body), {
      institutionId: h.institutionId,
    });

    expect(result.outcome).toBe('matched');
    const stored = (await payments(h))[0];
    expect(stored).toMatchObject({
      learner_id: h.learnerId,
      channel: 'mobile_money',
      // For a C2B payment the TransID is the receipt the payer is told.
      reference: 'RKTQDM7W6S',
      status: 'posted',
      amount: { amount_minor: 150_000, currency: 'KES' },
    });
    expect(await balance(h, CONTROL_ACCOUNTS.mobile_money_clearing.code)).toEqual(KES(150_000));
  });
});

describe('webhook idempotency', () => {
  it('writes one payment and one posting when the identical callback arrives twice', async () => {
    const h = await harness();
    const body = JSON.stringify(withSubstitutions('c2b-confirmation', { '1234': ADMISSION }));

    const first = await h.intake.receive(
      h.provider,
      delivery(MPESA_ROUTES.c2bConfirmation, body),
      { institutionId: h.institutionId }
    );
    const second = await h.intake.receive(
      h.provider,
      delivery(MPESA_ROUTES.c2bConfirmation, body),
      { institutionId: h.institutionId }
    );

    expect(first.outcome).toBe('matched');
    expect(second.outcome).toBe('duplicate');
    expect(second.paymentId).toBe(first.paymentId);
    expect(await payments(h)).toHaveLength(1);
    const entries = await h.ledger.listEntries({
      institutionId: h.institutionId,
      sourceKind: 'payment',
    });
    expect(entries).toHaveLength(1);
  });

  it('moves the same record on when a different callback carries the same transaction id', async () => {
    const h = await harness();
    const validation = JSON.stringify(withSubstitutions('c2b-validation', { '1234': ADMISSION }));
    const confirmation = JSON.stringify(
      withSubstitutions('c2b-confirmation', { '1234': ADMISSION })
    );

    const first = await h.intake.receive(
      h.provider,
      delivery(MPESA_ROUTES.c2bValidation, validation),
      { institutionId: h.institutionId }
    );
    // The validation callback is the provider asking whether to accept; no money has moved yet.
    expect(first.outcome).toBe('validated');
    expect(first.paymentId).toBeNull();

    const second = await h.intake.receive(
      h.provider,
      delivery(MPESA_ROUTES.c2bConfirmation, confirmation),
      { institutionId: h.institutionId }
    );
    expect(second.outcome).toBe('matched');
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(await payments(h)).toHaveLength(1);
  });

  it('refuses a delivery whose amount is not the amount that was charged', async () => {
    const h = await harness();
    queueTokenAnd(h, readPayload('stk-push-response'));
    await h.intake.initiateCharge(
      h.provider,
      {
        amount: KES(150_000),
        accountReference: ADMISSION,
        phone: '254708374149',
        description: 'Term 1 fees',
        callbackUrl: `https://school.example.test${MPESA_ROUTES.stk}?token=${CALLBACK_TOKEN}`,
      },
      { institutionId: h.institutionId }
    );

    const wrong = JSON.stringify(
      withSubstitutions('stk-callback-success', { '1500': '2000' })
    );
    const result = await h.intake.receive(h.provider, delivery(MPESA_ROUTES.stk, wrong), {
      institutionId: h.institutionId,
    });

    expect(result.outcome).toBe('refused');
    expect(result.message).toContain('but 1500.00 was charged');
    expect(await payments(h)).toHaveLength(0);
    expect(await balance(h, CONTROL_ACCOUNTS.mobile_money_clearing.code)).toEqual(KES(0));
  });

  it('refuses a delivery that does not carry the callback token', async () => {
    const h = await harness();
    await expect(
      h.intake.receive(
        h.provider,
        { route: MPESA_ROUTES.stk, headers: {}, body: readPayload('stk-callback-success') },
        { institutionId: h.institutionId }
      )
    ).rejects.toMatchObject({ code: 'signature_invalid' });
  });

  it('refuses a body that is not one of the provider\'s', async () => {
    const h = await harness();
    await expect(
      h.intake.receive(h.provider, delivery(MPESA_ROUTES.stk, '{"hello":"world"}'), {
        institutionId: h.institutionId,
      })
    ).rejects.toMatchObject({ code: 'payload_unrecognised' });
  });
});

describe('the suspense queue', () => {
  it('holds an unrecognised reference in suspense, then returns the suspense account to zero', async () => {
    const h = await harness();
    // The recorded confirmation as it stands: BillRefNumber "1234" is nobody at this school.
    const result = await h.intake.receive(
      h.provider,
      delivery(MPESA_ROUTES.c2bConfirmation, readPayload('c2b-confirmation')),
      { institutionId: h.institutionId }
    );

    expect(result.outcome).toBe('suspended');
    expect(result.suspenseEntryId).not.toBeNull();
    expect(await payments(h)).toHaveLength(0);

    // The money is on the books as a liability, and the payload is kept verbatim.
    expect(await balance(h, RECONCILIATION_ACCOUNTS.suspense.code)).toEqual(KES(-150_000));
    expect(await balance(h, CONTROL_ACCOUNTS.mobile_money_clearing.code)).toEqual(KES(150_000));

    const open = await h.intake.listOpenSuspense(h.institutionId);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({
      transactionId: 'RKTQDM7W6S',
      receipt: 'RKTQDM7W6S',
      accountReference: '1234',
      payerName: 'John J Doe',
      amount: { amount_minor: 150_000, currency: 'KES' },
      status: 'open',
    });
    expect(open[0]?.payload).toContain('RKTQDM7W6S');

    const resolved = await h.intake.resolveSuspense(String(open[0]?.id), h.learnerId, TEST_ACTOR);
    expect(resolved.entry.status).toBe('resolved');
    expect(resolved.entry.resolvedLearnerId).toBe(h.learnerId);

    // The learner now holds a posted payment, and the suspense account is back to zero.
    const stored = (await payments(h))[0];
    expect(stored).toMatchObject({
      learner_id: h.learnerId,
      reference: 'RKTQDM7W6S',
      status: 'posted',
    });
    expect(await balance(h, RECONCILIATION_ACCOUNTS.suspense.code)).toEqual(KES(0));
    expect(await balance(h, CONTROL_ACCOUNTS.mobile_money_clearing.code)).toEqual(KES(150_000));
    expect(await balance(h, CONTROL_ACCOUNTS.receivables.code)).toEqual(KES(-150_000));
    expect(await h.intake.listOpenSuspense(h.institutionId)).toHaveLength(0);
  });

  it('refuses to resolve an entry twice', async () => {
    const h = await harness();
    const result = await h.intake.receive(
      h.provider,
      delivery(MPESA_ROUTES.c2bConfirmation, readPayload('c2b-confirmation')),
      { institutionId: h.institutionId }
    );
    await h.intake.resolveSuspense(String(result.suspenseEntryId), h.learnerId);
    await expect(
      h.intake.resolveSuspense(String(result.suspenseEntryId), h.learnerId)
    ).rejects.toMatchObject({ code: 'state_invalid' });
  });
});

describe('the offline topology: a device that missed the callback polls', () => {
  it('completes a charge that never got a callback, then ignores a stale query', async () => {
    const h = await harness();
    queueTokenAnd(h, readPayload('stk-push-response'));
    const charge = await h.intake.initiateCharge(
      h.provider,
      {
        amount: KES(150_000),
        accountReference: ADMISSION,
        phone: '254708374149',
        description: 'Term 1 fees',
        callbackUrl: `https://school.example.test${MPESA_ROUTES.stk}?token=${CALLBACK_TOKEN}`,
      },
      { institutionId: h.institutionId }
    );
    // No callback is delivered: the device was offline when it fired.
    expect(await payments(h)).toHaveLength(0);

    h.transport.queue({ body: readPayload('stk-query-success') });
    const polled = await h.intake.reconcileOffline(h.provider, {
      institutionId: h.institutionId,
      transactionId: charge.transactionId,
    });
    expect(polled.outcome).toBe('matched');
    expect(await payments(h)).toHaveLength(1);
    // The query carries no receipt, so the payment is referenced by the transaction id.
    expect((await payments(h))[0]?.reference).toBe('ws_CO_191220191020363925');
    expect(await balance(h, CONTROL_ACCOUNTS.mobile_money_clearing.code)).toEqual(KES(150_000));

    // A query that still says "processing" cannot undo a payment that already landed.
    h.transport.queue({ body: readPayload('stk-query-pending') });
    const stale = await h.intake.reconcileOffline(h.provider, {
      institutionId: h.institutionId,
      transactionId: charge.transactionId,
    });
    expect(stale.outcome).toBe('ignored');
    expect(await payments(h)).toHaveLength(1);
  });

  it('reports a transaction the provider is still processing as pending', async () => {
    const h = await harness();
    h.transport.queue({ body: readPayload('oauth-token') });
    h.transport.queue({ body: readPayload('stk-query-pending') });
    const result = await h.intake.reconcileOffline(h.provider, {
      institutionId: h.institutionId,
      transactionId: 'ws_CO_191220191020363925',
    });
    expect(result.outcome).toBe('pending');
    expect(result.message).toBe('The transaction is being processed');
  });
});

describe('a refund leaves through B2C and its result callback settles it', () => {
  it('marks the refund paid and posts it when the recorded success result arrives', async () => {
    const h = await harness();
    const refund = await h.context.repository.create('refund', {
      institution_id: h.institutionId,
      number: 'REF/2027/900001',
      learner_id: h.learnerId,
      amount: { amount_minor: 50_000, currency: 'KES' },
      reason: 'Deposit refund on transfer',
      requested_at: '2027-02-01T00:00:00Z',
      status: 'approved',
    });

    queueTokenAnd(h, readPayload('b2c-response'));
    const issued = await h.intake.issueRefund(h.provider, {
      institutionId: h.institutionId,
      refundId: refund.id,
      request: {
        amount: KES(50_000),
        phone: '254708374149',
        description: 'Deposit refund on transfer',
        resultUrl: `https://school.example.test${MPESA_ROUTES.b2cResult}?token=${CALLBACK_TOKEN}`,
        timeoutUrl: `https://school.example.test${MPESA_ROUTES.b2cTimeout}?token=${CALLBACK_TOKEN}`,
      },
    });
    expect(issued.transactionId).toBe('16740-34861180-1');
    expect(issued.status).toBe('pending');

    const result = await h.intake.receive(
      h.provider,
      delivery(MPESA_ROUTES.b2cResult, readPayload('b2c-result-success')),
      { institutionId: h.institutionId }
    );
    expect(result.outcome).toBe('refunded');

    const stored = await h.context.repository.get('refund', refund.id);
    expect(stored).toMatchObject({ status: 'paid', paid_at: '2019-12-19T08:45:50.000Z' });
    expect(await balance(h, CONTROL_ACCOUNTS.refunds_payable.code)).toEqual(KES(50_000));
    expect(await balance(h, CONTROL_ACCOUNTS.mobile_money_clearing.code)).toEqual(KES(-50_000));

    // The same result delivered twice settles once.
    const again = await h.intake.receive(
      h.provider,
      delivery(MPESA_ROUTES.b2cResult, readPayload('b2c-result-success')),
      { institutionId: h.institutionId }
    );
    expect(again.outcome).toBe('duplicate');
    const refundEntries = await h.ledger.listEntries({
      institutionId: h.institutionId,
      sourceKind: 'refund',
    });
    expect(refundEntries).toHaveLength(1);
  });

  it('refuses a refund result for a refund this system never issued', async () => {
    const h = await harness();
    await expect(
      h.intake.receive(
        h.provider,
        delivery(MPESA_ROUTES.b2cResult, readPayload('b2c-result-success')),
        { institutionId: h.institutionId }
      )
    ).rejects.toMatchObject({ code: 'transaction_unknown' });
  });

  it('records the recorded timeout as a failure and leaves the refund approved', async () => {
    const h = await harness();
    const refund = await h.context.repository.create('refund', {
      institution_id: h.institutionId,
      number: 'REF/2027/900002',
      learner_id: h.learnerId,
      amount: { amount_minor: 50_000, currency: 'KES' },
      reason: 'Deposit refund on transfer',
      requested_at: '2027-02-01T00:00:00Z',
      status: 'approved',
    });
    queueTokenAnd(h, readPayload('b2c-response'));
    await h.intake.issueRefund(h.provider, {
      institutionId: h.institutionId,
      refundId: refund.id,
      request: {
        amount: KES(50_000),
        phone: '254708374149',
        description: 'Deposit refund on transfer',
        resultUrl: `https://school.example.test${MPESA_ROUTES.b2cResult}?token=${CALLBACK_TOKEN}`,
        timeoutUrl: `https://school.example.test${MPESA_ROUTES.b2cTimeout}?token=${CALLBACK_TOKEN}`,
      },
    });

    const result = await h.intake.receive(
      h.provider,
      delivery(MPESA_ROUTES.b2cTimeout, readPayload('b2c-timeout')),
      { institutionId: h.institutionId }
    );
    expect(result.outcome).toBe('failed');
    expect((await h.context.repository.get('refund', refund.id))?.status).toBe('approved');
    expect(await balance(h, CONTROL_ACCOUNTS.refunds_payable.code)).toEqual(KES(0));
  });
});

describe('the provider the intake was driven by', () => {
  it('names itself and the currency it collects in', async () => {
    const h = await harness();
    expect(h.provider.describe()).toMatchObject({
      id: MPESA_PROVIDER_ID,
      capabilities: { collection: true, notification: true, refund: true, query: true },
    });
    expect(h.provider.currency).toBe('KES');
  });
});
