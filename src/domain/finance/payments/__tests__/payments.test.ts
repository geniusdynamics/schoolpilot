// ABOUTME: The payments core against real SQLite: a payment recorded and read back, its receipt
// ABOUTME: numbered by the sequences module, its allocation the engine's plan and its posting the
// ABOUTME: ledger's derivation; the cheque lifecycle and its refusals; a cashier session opened,
// ABOUTME: reconciled, closed and reported - with a payment refused once it is closed.

import { afterEach, describe, expect, it } from 'vitest';

import { closeTestContext, createTestContext, TEST_ACTOR, type TestContext } from '@/data/__tests__/harness';
import { fromMinor } from '@/domain/money';
import { CONTROL_ACCOUNTS, LedgerService, createLedgerAccountMapping, createSqliteLedgerStore, ensureLedgerSchema } from '@/domain/finance/ledger';
import { SequenceService, createSqliteSequenceStore, ensureSequenceSchema } from '@/domain/sequences';

import {
  PAYMENTS_SEQUENCE_CATALOG,
  CashierSessionService,
  PaymentError,
  PaymentsService,
  amountInWords,
  createSqliteCashierSessionStore,
  ensureCashierSchema,
  isCashChannel,
  numberToWords,
  type CashierSession,
} from '..';

const CLOCK = () => new Date('2027-02-10T09:00:00.000Z');
const RECEIVED_AT = '2027-02-10T09:00:00.000Z';
const KES = (minor: number) => fromMinor(minor, 'KES');

interface Harness {
  readonly context: TestContext;
  readonly sequences: SequenceService;
  readonly ledger: LedgerService;
  readonly sessions: CashierSessionService;
  readonly payments: PaymentsService;
  readonly institutionId: string;
  readonly learnerId: string;
  readonly invoiceId: string;
  readonly feeItemId: string;
  /** The seeded user, the only id `payment.cashier_user_id` may point at. */
  readonly cashierId: string;
}

const contexts: TestContext[] = [];

async function harness(): Promise<Harness> {
  const context = await createTestContext();
  contexts.push(context);
  const adapter = context.adapter;
  await ensureLedgerSchema(adapter);
  await ensureCashierSchema(adapter);
  await ensureSequenceSchema(adapter);

  const sequences = new SequenceService({
    store: createSqliteSequenceStore(adapter),
    definitions: PAYMENTS_SEQUENCE_CATALOG,
    deviceId: 'counter-1',
    now: CLOCK,
  });
  const ledger = new LedgerService({
    store: createSqliteLedgerStore(adapter),
    mapping: createLedgerAccountMapping(),
    actor: TEST_ACTOR,
    now: CLOCK,
  });
  const sessions = new CashierSessionService({
    store: createSqliteCashierSessionStore(adapter),
    now: CLOCK,
    actor: TEST_ACTOR,
  });
  const payments = new PaymentsService({
    store: context.repository,
    numbers: sequences,
    ledger,
    sessions,
    actor: TEST_ACTOR,
    now: CLOCK,
  });

  return {
    context,
    sequences,
    ledger,
    sessions,
    payments,
    institutionId: context.seed.idOf('institution'),
    learnerId: context.seed.idOf('learner'),
    invoiceId: context.seed.idOf('invoice'),
    feeItemId: context.seed.idOf('fee_item'),
    cashierId: context.seed.idOf('user'),
  };
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => closeTestContext(context)));
});

const cashPayment = (h: Harness, minor: number) => ({
  learnerId: h.learnerId as never,
  amount: KES(minor),
  channel: 'cash' as const,
  receivedAt: RECEIVED_AT,
});

describe('recording a payment', () => {
  it('writes the payment, its receipt and its allocation, and reads them back', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment(cashPayment(h, 300_000));

    expect(recorded.payment).toMatchObject({
      institution_id: h.institutionId,
      learner_id: h.learnerId,
      amount: { amount_minor: 300_000, currency: 'KES' },
      channel: 'cash',
      status: 'posted',
    });
    expect(recorded.receipt).toMatchObject({
      payment_id: recorded.payment.id,
      status: 'issued',
    });

    // Read back from the database, not from the returned object.
    const stored = await h.payments.getPayment(recorded.payment.id as never);
    expect(stored?.amount).toEqual({ amount_minor: 300_000, currency: 'KES' });

    const allocations = await h.context.repository.list('payment_allocation', {
      where: { payment_id: recorded.payment.id },
    });
    expect(allocations.items).toHaveLength(1);
    expect(allocations.items[0]?.amount).toEqual({ amount_minor: 300_000, currency: 'KES' });

    const invoice = await h.context.repository.get('invoice', h.invoiceId as never);
    expect(invoice?.status).toBe('paid');
  });

  it('takes its receipt number from the sequences module, and never reuses one', async () => {
    const h = await harness();
    const first = await h.payments.recordPayment(cashPayment(h, 100_000));
    const second = await h.payments.recordPayment(cashPayment(h, 100_000));

    expect(first.receipt.number).toMatch(/^RCT\/2027\/\d{6}$/);
    expect(second.receipt.number).toMatch(/^RCT\/2027\/\d{6}$/);
    expect(first.receipt.number).not.toBe(second.receipt.number);
    // The sequences module recognises them as its own, and the counters are consecutive.
    expect(h.sequences.matches('receipt', first.receipt.number)).toBe(true);
    expect(h.sequences.parse('receipt', first.receipt.number)?.seq).toBe(1);
    expect(h.sequences.parse('receipt', second.receipt.number)?.seq).toBe(2);
  });

  it('refuses a zero or negative amount, and an amount in another currency', async () => {
    const h = await harness();
    expect(
      await codeOf(() => h.payments.recordPayment(cashPayment(h, 0)))
    ).toBe('amount_not_positive');
    expect(
      await codeOf(() => h.payments.recordPayment({ ...cashPayment(h, 100), amount: KES(-100) }))
    ).toBe('amount_not_positive');
    expect(
      await codeOf(() =>
        h.payments.recordPayment({ ...cashPayment(h, 100), amount: fromMinor(100, 'UGX') })
      )
    ).toBe('amount_currency_mismatch');
  });

  it('refuses a channel that carries a reference without one', async () => {
    const h = await harness();
    expect(
      await codeOf(() =>
        h.payments.recordPayment({ ...cashPayment(h, 100_000), channel: 'bank_deposit' })
      )
    ).toBe('reference_required');
    // Cash needs none.
    await expect(h.payments.recordPayment(cashPayment(h, 100_000))).resolves.toBeTruthy();
  });

  it('refuses a learner who does not exist', async () => {
    const h = await harness();
    expect(
      await codeOf(() =>
        h.payments.recordPayment({ ...cashPayment(h, 100), learnerId: MISSING as never })
      )
    ).toBe('learner_missing');
  });
});

describe('the receipt of spec 05 §5.2', () => {
  it('shows payer, learner, the amount in figures and words, channel, reference, vote head, balance and cashier', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment({
      ...cashPayment(h, 300_000),
      channel: 'bank_deposit',
      reference: 'SLIP-77',
      payerName: 'Grace Mwangi',
      cashierUserId: h.cashierId,
    });
    const view = recorded.receiptView;

    expect(view.number).toBe(recorded.receipt.number);
    expect(view.payer).toBe('Grace Mwangi');
    expect(view.learners).toHaveLength(1);
    expect(view.learners[0]).toMatch(/Amani/);
    expect(view.amount).toEqual({ amount_minor: 300_000, currency: 'KES' });
    expect(view.amountInWords).toBe('three thousand shillings');
    expect(view.channel).toBe('bank_deposit');
    expect(view.channelLabel).toBe('Bank deposit / transfer');
    expect(view.reference).toBe('SLIP-77');
    expect(view.allocationByVoteHead).toEqual([{ label: 'TUITION Tuition', amount: KES(300_000) }]);
    expect(view.balanceAfter).toEqual({ amount_minor: 0, currency: 'KES' });
    expect(view.cashier).toBe(h.cashierId);
    expect(view.status).toBe('issued');
  });

  it('writes an amount out in words, exactly', () => {
    expect(numberToWords(0)).toBe('zero');
    expect(numberToWords(15)).toBe('fifteen');
    expect(numberToWords(105)).toBe('one hundred and five');
    expect(numberToWords(1_500)).toBe('one thousand five hundred');
    expect(amountInWords(KES(1_505))).toBe('fifteen shillings and five cents');
    expect(amountInWords(KES(300_000))).toBe('three thousand shillings');
    expect(amountInWords(fromMinor(150_000, 'UGX'))).toBe('one hundred and fifty thousand shillings');
    // A currency the unit table does not name reads as its code, and the figures stay exact.
    expect(amountInWords(fromMinor(150_000, 'KWD'))).toBe('one hundred and fifty KWD');
  });

  it('voids a receipt, keeping its number, and refuses a second void', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment(cashPayment(h, 100_000));
    const voided = await h.payments.voidReceipt(recorded.receipt.id as never, 'taken in error');
    expect(voided.status).toBe('void');
    expect(voided.number).toBe(recorded.receipt.number);
    expect(
      await codeOf(() => h.payments.voidReceipt(recorded.receipt.id as never))
    ).toBe('receipt_already_void');
  });
});

describe('the allocation is the engine\u2019s plan', () => {
  it('plans against the outstanding lines and reports the unallocated rest as learner credit', async () => {
    const h = await harness();
    // The seeded invoice owes 300 000 of 600 000; paying 400 000 leaves 100 000 as credit.
    const recorded = await h.payments.recordPayment(cashPayment(h, 400_000));

    expect(recorded.plan.source.id).toBe(recorded.payment.id);
    expect(recorded.plan.allocated).toEqual({ amount_minor: 300_000, currency: 'KES' });
    expect(recorded.plan.unallocated).toEqual({ amount_minor: 100_000, currency: 'KES' });
    expect(recorded.plan.allocations).toHaveLength(1);
    expect(recorded.plan.allocations[0]?.invoiceId).toBe(h.invoiceId);

    const invoice = await h.context.repository.get('invoice', h.invoiceId as never);
    expect(invoice?.status).toBe('paid');
  });

  it('plans nothing when the learner owes nothing, and the whole payment is credit', async () => {
    const h = await harness();
    await h.payments.recordPayment(cashPayment(h, 300_000));
    const second = await h.payments.recordPayment(cashPayment(h, 50_000));
    expect(second.plan.allocated).toEqual({ amount_minor: 0, currency: 'KES' });
    expect(second.plan.unallocated).toEqual({ amount_minor: 50_000, currency: 'KES' });
  });
});

describe('the posting is the ledger\u2019s derivation', () => {
  it('posts the payment and the trial balance balances', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment(cashPayment(h, 300_000));

    expect(recorded.entry).not.toBeNull();
    const entry = recorded.entry!;
    expect(entry.source).toMatchObject({ kind: 'payment', id: recorded.payment.id });
    const cashLine = entry.lines.find((line) => line.accountCode === CONTROL_ACCOUNTS.cash.code);
    const receivableLine = entry.lines.find(
      (line) => line.accountCode === CONTROL_ACCOUNTS.receivables.code
    );
    expect(cashLine?.debit?.amount_minor).toBe(300_000);
    expect(receivableLine?.credit?.amount_minor).toBe(300_000);

    const balance = await h.ledger.trialBalance({ institutionId: h.institutionId, currency: 'KES' });
    expect(balance.balanced).toBe(true);
  });

  it('posts the unallocated rest as learner credit', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment(cashPayment(h, 400_000));
    const creditLine = recorded.entry?.lines.find(
      (line) => line.accountCode === CONTROL_ACCOUNTS.learner_credit.code
    );
    expect(creditLine?.credit?.amount_minor).toBe(100_000);
  });

  it('does not post a payment twice', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment(cashPayment(h, 100_000));
    const again = await h.payments.postPayment(recorded.payment.id as never);
    expect(again?.id).toBe(recorded.entry?.id);
    const entries = await h.ledger.listEntries({
      institutionId: h.institutionId,
      sourceKind: 'payment',
      sourceId: recorded.payment.id,
    });
    expect(entries).toHaveLength(1);
  });
});

describe('the cheque lifecycle', () => {
  const cheque = (h: Harness, minor: number) => ({
    learnerId: h.learnerId as never,
    amount: KES(minor),
    channel: 'cheque' as const,
    reference: 'CHQ-000123',
    receivedAt: RECEIVED_AT,
  });

  it('receives a cheque without posting it, deposits it, then clears it', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment(cheque(h, 300_000));
    expect(recorded.payment.status).toBe('pending');
    expect(recorded.entry).toBeNull();
    expect(h.payments.chequeState(recorded.payment)).toBe('received');

    const deposited = await h.payments.depositCheque({ paymentId: recorded.payment.id as never });
    expect(deposited.payment.status).toBe('posted');
    expect(deposited.transition.verb).toBe('deposit');
    expect(deposited.entry).not.toBeNull();
    expect(h.payments.chequeState(deposited.payment)).toBe('deposited');

    const cleared = await h.payments.clearCheque({ paymentId: recorded.payment.id as never });
    expect(cleared.payment.status).toBe('cleared');
    expect(cleared.entry).toBeNull();
  });

  it('refuses to clear a cheque that was never deposited', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment(cheque(h, 300_000));
    expect(
      await codeOf(() => h.payments.clearCheque({ paymentId: recorded.payment.id as never }))
    ).toBe('cheque_transition_invalid');
  });

  it('refuses to move a cleared cheque, which is final', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment(cheque(h, 300_000));
    await h.payments.depositCheque({ paymentId: recorded.payment.id as never });
    await h.payments.clearCheque({ paymentId: recorded.payment.id as never });
    expect(
      await codeOf(() =>
        h.payments.bounceCheque({ paymentId: recorded.payment.id as never, reason: 'late' })
      )
    ).toBe('cheque_transition_invalid');
  });

  it('refuses the cheque lifecycle on a payment that is not a cheque', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment(cashPayment(h, 100_000));
    expect(
      await codeOf(() =>
        h.payments.depositCheque({ paymentId: recorded.payment.id as never })
      )
    ).toBe('not_a_cheque');
  });

  it('bounces a deposited cheque: the allocation reverses, the posting reverses, a fee may follow', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment(cheque(h, 300_000));
    const deposited = await h.payments.depositCheque({ paymentId: recorded.payment.id as never });
    expect((await h.context.repository.get('invoice', h.invoiceId as never))?.status).toBe('paid');

    const bounced = await h.payments.bounceCheque({
      paymentId: recorded.payment.id as never,
      reason: 'insufficient funds',
      on: '2027-02-20',
      fee: {
        amount: KES(5_000),
        description: 'Cheque return fee',
        term: 'T1',
        feeItemId: h.feeItemId,
      },
    });

    expect(bounced.payment.status).toBe('bounced');
    expect(bounced.reversedAllocations).toHaveLength(1);
    expect(bounced.reversedAllocations[0]?.amount).toEqual({ amount_minor: 300_000, currency: 'KES' });

    // The invoice owes again: the allocation rows are soft-deleted, never edited.
    const liveAllocations = await h.context.repository.list('payment_allocation', {
      where: { payment_id: recorded.payment.id },
    });
    expect(liveAllocations.items).toHaveLength(0);
    // The seeded payment still holds 300 000 of the invoice, so it owes that again.
    expect((await h.context.repository.get('invoice', h.invoiceId as never))?.status).toBe(
      'partially_paid'
    );

    // The posting is reversed through the ledger's own reversal, and the books net back.
    expect(bounced.entry?.reversesEntryId).toBe(deposited.entry?.id);
    const balance = await h.ledger.trialBalance({ institutionId: h.institutionId, currency: 'KES' });
    const cash = balance.rows.find((row) => row.accountCode === CONTROL_ACCOUNTS.cash.code);
    const bank = balance.rows.find((row) => row.accountCode === CONTROL_ACCOUNTS.bank.code);
    expect(cash?.balance.amount_minor ?? 0).toBe(0);
    expect(bank?.balance.amount_minor ?? 0).toBe(0);

    // The fee the bounce added is a posted one-line invoice.
    expect(bounced.feeInvoiceId).not.toBeNull();
    const fee = await h.context.repository.get('invoice', bounced.feeInvoiceId as never);
    expect(fee?.total).toEqual({ amount_minor: 5_000, currency: 'KES' });
    expect(fee?.number).toMatch(/^INV\/2027\/T1\/\d{6}$/);
  });

  it('refuses a bounce without a reason', async () => {
    const h = await harness();
    const recorded = await h.payments.recordPayment(cheque(h, 300_000));
    expect(
      await codeOf(() =>
        h.payments.bounceCheque({ paymentId: recorded.payment.id as never, reason: '  ' })
      )
    ).toBe('cheque_transition_invalid');
  });
});

describe('a cashier session', () => {
  async function openSession(h: Harness, floatMinor = 50_000): Promise<CashierSession> {
    return h.sessions.open({
      institutionId: h.institutionId as never,
      cashierUserId: TEST_ACTOR,
      cashierName: 'Grace the cashier',
      openingFloat: KES(floatMinor),
      openedAt: RECEIVED_AT,
    });
  }

  it('opens with a float, takes the payments, and closes with the difference stated', async () => {
    const h = await harness();
    const session = await openSession(h, 50_000);
    expect(session.status).toBe('open');
    expect(session.openingFloat).toEqual({ amount_minor: 50_000, currency: 'KES' });

    await h.payments.recordPayment({ ...cashPayment(h, 300_000), sessionId: session.id });
    await h.payments.recordPayment({
      ...cashPayment(h, 200_000),
      channel: 'mobile_money',
      reference: 'MPESA-1',
      sessionId: session.id,
    });

    const before = await h.sessions.reconciliation(session.id);
    expect(before.cashTaken).toEqual({ amount_minor: 300_000, currency: 'KES' });
    expect(before.expectedCash).toEqual({ amount_minor: 350_000, currency: 'KES' });
    expect(before.countedCash).toEqual(before.expectedCash);

    // The drawer is 500 short: the difference is stated, not hidden.
    const closed = await h.sessions.close({
      sessionId: session.id,
      countedCash: KES(349_500),
      closedAt: RECEIVED_AT,
      reason: 'till short at the close',
    });
    expect(closed.session.status).toBe('closed');
    expect(closed.reconciliation.expectedCash).toEqual({ amount_minor: 350_000, currency: 'KES' });
    expect(closed.reconciliation.countedCash).toEqual({ amount_minor: 349_500, currency: 'KES' });
    expect(closed.reconciliation.variance).toEqual({ amount_minor: -500, currency: 'KES' });
    expect(closed.reconciliation.balanced).toBe(false);
    expect(closed.session.closeReason).toBe('till short at the close');
  });

  it('reports a balanced session, and the Z-report figures by channel', async () => {
    const h = await harness();
    const session = await openSession(h, 0);
    await h.payments.recordPayment({ ...cashPayment(h, 300_000), sessionId: session.id });
    await h.payments.recordPayment({
      ...cashPayment(h, 200_000),
      channel: 'mobile_money',
      reference: 'MPESA-1',
      sessionId: session.id,
    });

    const closed = await h.sessions.close({ sessionId: session.id, countedCash: KES(300_000) });
    expect(closed.reconciliation.balanced).toBe(true);
    expect(closed.reconciliation.variance).toEqual({ amount_minor: 0, currency: 'KES' });

    const report = closed.report;
    expect(report.paymentCount).toBe(2);
    expect(report.total).toEqual({ amount_minor: 500_000, currency: 'KES' });
    expect(report.cashTotal).toEqual({ amount_minor: 300_000, currency: 'KES' });
    expect(report.expectedCash).toEqual({ amount_minor: 300_000, currency: 'KES' });
    expect(report.variance).toEqual({ amount_minor: 0, currency: 'KES' });
    const byChannel = new Map(report.lines.map((line) => [line.channel, line]));
    expect(byChannel.get('cash')).toMatchObject({ count: 1, isCash: true, label: 'Cash' });
    expect(byChannel.get('mobile_money')).toMatchObject({
      count: 1,
      isCash: false,
      label: 'Mobile money',
      amount: { amount_minor: 200_000, currency: 'KES' },
    });
    expect(report.session.id).toBe(session.id);
  });

  it('closes once', async () => {
    const h = await harness();
    const session = await openSession(h, 0);
    await h.sessions.close({ sessionId: session.id, countedCash: KES(0) });
    expect(
      await codeOf(() => h.sessions.close({ sessionId: session.id, countedCash: KES(0) }))
    ).toBe('session_already_closed');
  });

  it('refuses a payment into a closed session, writing nothing', async () => {
    const h = await harness();
    const session = await openSession(h, 0);
    await h.payments.recordPayment({ ...cashPayment(h, 10_000), sessionId: session.id });
    await h.sessions.close({ sessionId: session.id, countedCash: KES(10_000) });

    const before = (await h.context.repository.list('payment')).items.length;
    expect(
      await codeOf(() =>
        h.payments.recordPayment({ ...cashPayment(h, 10_000), sessionId: session.id })
      )
    ).toBe('session_closed');
    expect((await h.context.repository.list('payment')).items.length).toBe(before);

    expect(
      await codeOf(() =>
        h.sessions.attach(session.id, {
          paymentId: 'whatever',
          channel: 'cash',
          amount: KES(1),
        })
      )
    ).toBe('session_closed');
  });

  it('refuses a cashier who already holds an open session', async () => {
    const h = await harness();
    await openSession(h, 0);
    expect(await codeOf(() => openSession(h, 0))).toBe('session_already_open');
  });

  it('tells cash from everything else', () => {
    expect(isCashChannel('cash')).toBe(true);
    expect(isCashChannel('cheque')).toBe(false);
    expect(isCashChannel('mobile_money')).toBe(false);
  });
});

/** A UUIDv7 that names no row. */
const MISSING = '01930000-0000-7000-8000-0000deadbeef';

/** The error an async call rejects with. */
async function rejectOf(work: () => Promise<unknown>): Promise<unknown> {
  try {
    await work();
    return null;
  } catch (error) {
    return error;
  }
}

/** The code of the refusal an async call raises. */
async function codeOf(work: () => Promise<unknown>): Promise<string> {
  const error = await rejectOf(work);
  if (error instanceof PaymentError) return error.code;
  throw error ?? new Error('the call did not refuse');
}
