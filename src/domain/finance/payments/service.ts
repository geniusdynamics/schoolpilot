// ABOUTME: The payments core: it takes a payment at the counter through the canonical repository,
// ABOUTME: numbers its receipt from the sequences module, plans its allocation with the allocation
// ABOUTME: engine, posts it with the ledger's payment derivation, and moves a cheque through its
// ABOUTME: lifecycle - reversing, never editing, when one bounces.

import type { RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { allocate, add, compare, fromMinor, isCurrencyCode, isZero, subtract, zero, type Money } from '@/domain/money';
import { planAllocation, type AllocationPlan, type OutstandingItem } from '@/domain/finance/allocation';
import type { JournalEntry, PaymentPostingInput } from '@/domain/finance/ledger';
import { CATALOG, type SequenceCatalog, type SequenceDefinition, type ScopeValues } from '@/domain/sequences';

import { channelLabel, isPaymentChannel, requiresReference } from './channels';
import { assertChequeTransition, chequeStateOfStatus, statusOfChequeState, type ChequeTransition } from './cheque';
import { PaymentError } from './errors';
import { buildReceiptView } from './receipt';
import type { CashierSessionService } from './session';
import type {
  BounceFeeInput,
  ChequeBounceInput,
  ChequeMoveInput,
  ChequeState,
  DocumentNumberSource,
  PaymentChannel,
  PaymentLedgerPort,
  PaymentsStore,
  ReceiptAllocationLine,
  ReceiptView,
  RecordPaymentInput,
  RecordedPayment,
} from './types';

/** The page size a read uses; the canonical repository caps a page at 500 rows. */
const PAGE_LIMIT = 500;

/**
 * The receipt sequence of spec 05 §5.2.
 *
 * The built-in catalog's `receipt` is partitioned by institution and year. The spec asks for a
 * number "per year/campus/cashier", and the sequences module allows a scope segment that is not
 * printed, so this definition widens the partition to the cashier while the number itself still
 * reads `RCT/2027/000123`. Supplying it is the caller's choice: a catalog is a parameter of
 * `SequenceService`, so nothing in the frozen sequences module changes.
 *
 * The **campus** half of the spec's partition is not reachable from a payment: the canonical
 * `payment` carries no campus, and a declared scope segment is one `resolveScope` requires, so a
 * campus in the scope would make every counter payment fail without one. A school that needs
 * per-campus runs widens this definition with the campus its cashier screen holds.
 */
export const RECEIPT_SEQUENCE: SequenceDefinition = {
  name: 'receipt',
  pattern: 'RCT/{YYYY}/{SEQ:6}',
  scope: ['institution', 'year', 'cashier'],
  reset: 'yearly',
};

/** The sequence catalog the payments core issues its numbers from. */
export const PAYMENTS_SEQUENCE_CATALOG: SequenceCatalog = { ...CATALOG, receipt: RECEIPT_SEQUENCE };

/** What a cheque move reported. */
export interface ChequeMoveResult {
  readonly payment: RepositoryRow<'payment'>;
  readonly transition: ChequeTransition;
  /** The journal entry the move posted or reversed, or null when the ledger was not involved. */
  readonly entry: JournalEntry | null;
}

/** What a bounce reported, including the fee it may have added. */
export interface ChequeBounceResult extends ChequeMoveResult {
  /** The allocations that were reversed, by invoice. */
  readonly reversedAllocations: readonly { readonly invoiceId: string; readonly amount: Money }[];
  /** The fee invoice the bounce added, or null when the caller asked for none. */
  readonly feeInvoiceId: string | null;
}

export interface PaymentsServiceOptions {
  /** The canonical repository every payment, receipt and allocation is written through. */
  readonly store: PaymentsStore;
  /** The sequences module, or anything that issues a number from it. */
  readonly numbers: DocumentNumberSource;
  /** The ledger's posting engine. Without it a payment is recorded but not posted. */
  readonly ledger?: PaymentLedgerPort;
  /** The cashier sessions, so a payment into a closed session is refused before anything is written. */
  readonly sessions?: CashierSessionService;
  /** The actor recorded on writes; the cashier when a call names one. */
  readonly actor?: string;
  readonly now?: () => Date;
}

/**
 * Takes payments, numbers their receipts, plans and writes their allocations, posts them, and
 * moves a cheque through its lifecycle.
 *
 * Nothing here derives a journal entry: the payment and its allocations go to the ledger's
 * `postPayment` derivation. Nothing here computes an allocation either: the allocation engine's
 * `planAllocation` decides where the money goes, and this service writes the plan. A correction is
 * a reversal - the ledger's own reversal for the posting, and a soft delete of the allocation rows
 * for the canonical side - never an edit of a posted row.
 */
export class PaymentsService {
  private readonly store: PaymentsStore;
  private readonly numbers: DocumentNumberSource;
  private readonly ledger: PaymentLedgerPort | undefined;
  private readonly sessions: CashierSessionService | undefined;
  private readonly actor: string | undefined;
  private readonly clock: () => Date;

  constructor(options: PaymentsServiceOptions) {
    this.store = options.store;
    this.numbers = options.numbers;
    this.ledger = options.ledger;
    this.sessions = options.sessions;
    this.actor = options.actor;
    this.clock = options.now ?? (() => new Date());
  }

  /**
   * Takes a payment at the counter.
   *
   * The receipt number comes from the sequences module before anything is written, so the number a
   * receipt prints is never invented and never reused. The payment, its allocations and its receipt
   * are written in one canonical transaction; the session attachment and the ledger posting follow
   * the commit, because they are a different store. A received cheque is not posted: its money is
   * not in the bank until it is deposited.
   */
  async recordPayment(input: RecordPaymentInput): Promise<RecordedPayment> {
    if (!isPaymentChannel(input.channel)) {
      throw new PaymentError('channel_invalid', `"${String(input.channel)}" is not a payment channel`, {
        detail: { channel: input.channel },
      });
    }
    const amount = assertPositiveMoney(input.amount);
    const reference = input.reference?.trim();
    if (requiresReference(input.channel) && !reference) {
      throw new PaymentError(
        'reference_required',
        `a ${channelLabel(input.channel)} payment carries a slip number, a cheque number or a provider reference`,
        { detail: { channel: input.channel } }
      );
    }

    const learner = await this.store.get('learner', input.learnerId);
    if (!learner) {
      throw new PaymentError('learner_missing', `the learner ${input.learnerId} does not exist`, {
        detail: { learnerId: input.learnerId },
      });
    }
    const institutionId = learner.institution_id;
    const currency = await this.institutionCurrency(institutionId);
    if (amount.currency !== currency) {
      throw new PaymentError(
        'amount_currency_mismatch',
        `the institution is counted in ${currency}, the payment in ${amount.currency}`,
        { detail: { expected: currency, actual: amount.currency } }
      );
    }

    if (input.sessionId) {
      const session = await this.sessionOrRefuse(input.sessionId);
      if (session.status === 'closed') {
        throw new PaymentError(
          'session_closed',
          `session ${session.id} was closed at ${session.closedAt}; a payment cannot be taken in a closed session`,
          { detail: { sessionId: session.id, closedAt: session.closedAt } }
        );
      }
    }

    const receivedAt = input.receivedAt ?? this.clock().toISOString();
    const issued = await this.issueReceiptNumber(institutionId, input.cashierUserId, receivedAt);
    const status = input.channel === 'cheque' ? statusOfChequeState('received') : 'posted';

    const write = async () => {
      const payment = await this.store.create('payment', {
        institution_id: institutionId,
        learner_id: learner.id,
        amount: { amount_minor: amount.amount_minor, currency: amount.currency },
        channel: input.channel,
        received_at: receivedAt,
        status,
        ...(reference ? { reference } : {}),
        ...(input.cashierUserId ? { cashier_user_id: input.cashierUserId } : {}),
      });

      const items = await this.outstandingItems(learner.id, currency, input.invoiceIds);
      const plan = planAllocation({
        source: {
          id: payment.id,
          kind: 'payment',
          amount,
          learnerId: learner.id,
          receivedOn: receivedAt,
        },
        items,
        ...(input.strategy ? { options: { strategy: input.strategy } } : {}),
      });

      const allocations = aggregateByInvoice(plan);
      for (const allocation of allocations) {
        await this.store.create('payment_allocation', {
          institution_id: institutionId,
          payment_id: payment.id,
          invoice_id: allocation.invoiceId,
          amount: { amount_minor: allocation.amount.amount_minor, currency: allocation.amount.currency },
          allocated_at: receivedAt,
        });
      }
      for (const invoiceId of new Set(allocations.map((allocation) => allocation.invoiceId))) {
        await this.refreshInvoiceStatus(invoiceId);
      }

      const receipt = await this.store.create('receipt', {
        institution_id: institutionId,
        number: issued.number,
        payment_id: payment.id,
        issued_at: receivedAt,
        status: 'issued',
        ...(input.cashierUserId ? { issued_by: input.cashierUserId } : {}),
      });
      return { payment, receipt, plan };
    };

    const result = this.store.transaction ? await this.store.transaction(write) : await write();

    // The session link lives in the session's own table, so it follows the canonical commit rather
    // than joining it: the adapter refuses a public call while another transaction is open.
    if (input.sessionId && this.sessions) {
      await this.sessions.attach(
        input.sessionId,
        { paymentId: result.payment.id, channel: input.channel, amount },
        receivedAt
      );
    }

    const post = input.post ?? true;
    const entry =
      post && status !== 'pending' && this.ledger ? await this.postPayment(result.payment.id) : null;

    const receiptView = await this.buildReceiptView(result.payment, result.receipt, {
      payerName: input.payerName,
      cashierName: input.cashierName ?? input.cashierUserId,
      currency,
    });

    return { payment: result.payment, receipt: result.receipt, plan: result.plan, receiptView, entry };
  }

  /** One payment, or null. */
  getPayment(id: Id<'payment'>): Promise<RepositoryRow<'payment'> | null> {
    return this.store.get('payment', id);
  }

  /** The payments a query names, newest first. */
  async listPayments(
    query: { readonly institutionId?: string; readonly learnerId?: string } = {}
  ): Promise<readonly RepositoryRow<'payment'>[]> {
    const page = await this.store.list('payment', {
      where: {
        ...(query.institutionId ? { institution_id: query.institutionId } : {}),
        ...(query.learnerId ? { learner_id: query.learnerId } : {}),
      },
      limit: PAGE_LIMIT,
    });
    return [...page.items].sort((left, right) => right.received_at.localeCompare(left.received_at));
  }

  /** The cheque state a payment is in, or null when it is not a cheque. */
  chequeState(payment: { readonly channel: string; readonly status: string }): ChequeState | null {
    if (payment.channel !== 'cheque') return null;
    return chequeStateOfStatus(payment.status);
  }

  /**
   * Posts a recorded payment to the ledger.
   *
   * The payment and its allocations are handed to the ledger's payment derivation; nothing is
   * derived here. A payment that already has an entry returns that entry rather than posting a
   * second one, which is what makes a retry after a failure safe.
   */
  async postPayment(id: Id<'payment'>): Promise<JournalEntry | null> {
    const payment = await this.requirePayment(id);
    if (payment.status !== 'posted' && payment.status !== 'cleared') {
      throw new PaymentError(
        'payment_state_invalid',
        `payment ${id} is ${payment.status}; only a posted or cleared payment is posted to the ledger`,
        { detail: { paymentId: id, status: payment.status } }
      );
    }
    if (!this.ledger) {
      throw new PaymentError(
        'storage',
        'no posting engine is configured, so the payment cannot be posted'
      );
    }

    const existing = await this.originalEntry(payment.id, payment.institution_id);
    if (existing) return existing;

    const allocations = await this.store.list('payment_allocation', {
      where: { payment_id: payment.id },
      limit: PAGE_LIMIT,
    });
    const postedBy = payment.cashier_user_id ?? this.actor;
    const input: PaymentPostingInput = {
      payment: {
        id: payment.id,
        institutionId: payment.institution_id,
        amount: asMoney(payment.amount),
        channel: payment.channel as PaymentChannel,
        ...(payment.reference ? { reference: payment.reference } : {}),
        receivedAt: payment.received_at,
      },
      allocations: allocations.items.map((allocation) => ({
        invoiceId: allocation.invoice_id,
        amount: asMoney(allocation.amount),
      })),
      ...(postedBy ? { postedBy } : {}),
    };
    return this.ledger.postPayment(input);
  }

  /** Deposits a received cheque into the bank, which is when its money is posted. */
  depositCheque(input: ChequeMoveInput): Promise<ChequeMoveResult> {
    return this.moveCheque(input, 'deposited');
  }

  /** Marks a deposited cheque cleared. The bank has honoured it; the posting stands. */
  clearCheque(input: ChequeMoveInput): Promise<ChequeMoveResult> {
    return this.moveCheque(input, 'cleared');
  }

  /**
   * Bounces a cheque.
   *
   * A bounce reverses what the cheque had done: the allocation rows are soft-deleted (so the
   * invoices the cheque had settled owe again), the ledger's posting is reversed through the
   * ledger's own reversal, and the payment's status becomes `bounced`. Nothing is edited. A fee may
   * be added, as spec 05 §5.1 says a bounce may.
   */
  async bounceCheque(input: ChequeBounceInput): Promise<ChequeBounceResult> {
    const reason = input.reason.trim();
    if (reason === '') {
      throw new PaymentError(
        'cheque_transition_invalid',
        'a bounce needs a reason; refusing a cheque is an audited decision',
        { detail: { paymentId: input.paymentId } }
      );
    }
    const payment = await this.requirePayment(input.paymentId);
    const from = this.chequeState(payment);
    if (!from) {
      throw new PaymentError(
        'not_a_cheque',
        `payment ${payment.id} arrived through "${payment.channel}", so the cheque lifecycle does not apply`,
        { detail: { paymentId: payment.id, channel: payment.channel } }
      );
    }
    const transition = assertChequeTransition(from, 'bounced');
    const on = input.on ?? this.clock().toISOString().slice(0, 10);

    const allocations = await this.store.list('payment_allocation', {
      where: { payment_id: payment.id },
      limit: PAGE_LIMIT,
    });
    const reversedAllocations = allocations.items.map((allocation) => ({
      invoiceId: allocation.invoice_id,
      amount: asMoney(allocation.amount),
    }));

    const updated = await this.store.update(
      'payment',
      payment.id,
      { status: statusOfChequeState('bounced') },
      { expectedVersion: payment.rowVersion, reason, ...(this.actor ? { actor: this.actor } : {}) }
    );

    for (const allocation of allocations.items) {
      await this.store.remove('payment_allocation', allocation.id, { reason });
    }
    for (const invoiceId of new Set(reversedAllocations.map((allocation) => allocation.invoiceId))) {
      await this.refreshInvoiceStatus(invoiceId);
    }

    let entry: JournalEntry | null = null;
    if (this.ledger) {
      const original = await this.originalEntry(payment.id, payment.institution_id);
      if (original) {
        const actor = input.actor ?? this.actor;
        entry = await this.ledger.reverse(original.id, {
          reason,
          entryDate: on,
          ...(actor ? { actor } : {}),
        });
      }
    }

    const feeInvoiceId = input.fee ? await this.addBounceFee(payment, input.fee, on) : null;

    return { payment: updated, transition, entry, reversedAllocations, feeInvoiceId };
  }

  /** The receipt of a payment, or null. */
  async receiptOf(paymentId: Id<'payment'>): Promise<RepositoryRow<'receipt'> | null> {
    const page = await this.store.list('receipt', {
      where: { payment_id: paymentId },
      limit: PAGE_LIMIT,
    });
    return page.items[0] ?? null;
  }

  /**
   * Voids a receipt.
   *
   * The number is kept - spec 05 §5.2 says a void keeps its number - and the status becomes
   * `void`. The payment itself is untouched: voiding a receipt is not reversing the money.
   */
  async voidReceipt(receiptId: Id<'receipt'>, reason?: string): Promise<RepositoryRow<'receipt'>> {
    const receipt = await this.store.get('receipt', receiptId);
    if (!receipt) {
      throw new PaymentError('not_found', `receipt ${receiptId} does not exist`, {
        detail: { receiptId },
      });
    }
    if (receipt.status === 'void') {
      throw new PaymentError('receipt_already_void', `receipt ${receipt.number} is already void`, {
        detail: { receiptId, number: receipt.number },
      });
    }
    return this.store.update(
      'receipt',
      receipt.id,
      { status: 'void' },
      {
        expectedVersion: receipt.rowVersion,
        ...(reason ? { reason } : {}),
        ...(this.actor ? { actor: this.actor } : {}),
      }
    );
  }

  /** Builds the view a receipt prints for a recorded payment. */
  async receiptView(
    paymentId: Id<'payment'>,
    options: { readonly payerName?: string; readonly cashierName?: string } = {}
  ): Promise<ReceiptView> {
    const payment = await this.requirePayment(paymentId);
    const receipt = await this.receiptOf(payment.id);
    if (!receipt) {
      throw new PaymentError('not_found', `payment ${paymentId} has no receipt`, {
        detail: { paymentId },
      });
    }
    const currency = await this.institutionCurrency(payment.institution_id);
    return this.buildReceiptView(payment, receipt, { ...options, currency });
  }

  /**
   * A learner's outstanding invoice lines, the input the allocation engine plans against.
   *
   * Each line's balance is its amount less the share of the invoice's payments that has landed on
   * it; the shares are split through the money module's allocator, so they sum to what was paid
   * exactly and no line drifts by a minor unit.
   */
  async outstandingItems(
    learnerId: string,
    currency: Money['currency'],
    invoiceIds?: readonly string[]
  ): Promise<readonly OutstandingItem[]> {
    const invoices = await this.store.list('invoice', {
      where: { learner_id: learnerId },
      limit: PAGE_LIMIT,
    });
    const wanted = invoiceIds && invoiceIds.length > 0 ? new Set(invoiceIds) : null;
    const items: OutstandingItem[] = [];

    for (const invoice of invoices.items) {
      if (invoice.status === 'draft' || invoice.status === 'void') continue;
      if (wanted && !wanted.has(invoice.id)) continue;
      const lines = await this.store.list('invoice_line', {
        where: { invoice_id: invoice.id },
        limit: PAGE_LIMIT,
      });
      if (lines.items.length === 0) continue;
      const allocations = await this.store.list('payment_allocation', {
        where: { invoice_id: invoice.id },
        limit: PAGE_LIMIT,
      });
      const paid = allocations.items.reduce(
        (running, allocation) => add(running, asMoney(allocation.amount)),
        zero(currency)
      );
      const weights = lines.items.map((line) => Math.max(0, asMoney(line.amount).amount_minor));
      const shares = weights.some((weight) => weight > 0)
        ? allocate(paid, weights)
        : lines.items.map(() => zero(currency));

      lines.items.forEach((line, index) => {
        const amount = asMoney(line.amount);
        const balance = subtract(amount, shares[index] ?? zero(currency));
        items.push({
          id: line.id,
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          learnerId: invoice.learner_id ?? null,
          issuedOn: invoice.issue_date,
          dueOn: invoice.due_date ?? null,
          kind: line.kind,
          feeItemId: line.fee_item_id ?? null,
          description: line.description,
          sequence: index,
          balance: compare(balance, zero(currency)) < 0 ? zero(currency) : balance,
        });
      });
    }
    return items;
  }

  /** What a learner still owes across every live invoice. */
  async outstandingBalance(learnerId: string, currency: Money['currency']): Promise<Money> {
    const items = await this.outstandingItems(learnerId, currency);
    return items.reduce((running, item) => add(running, item.balance), zero(currency));
  }

  /** The base currency of an institution, refusing one the money table does not know. */
  async institutionCurrency(institutionId: string): Promise<Money['currency']> {
    const institution = await this.store.get('institution', asId<'institution'>(institutionId));
    if (!institution) {
      throw new PaymentError('institution_missing', `the institution ${institutionId} does not exist`, {
        detail: { institutionId },
      });
    }
    const currency = institution.base_currency;
    if (!isCurrencyCode(currency)) {
      throw new PaymentError(
        'institution_currency_invalid',
        `the institution's base currency "${currency}" is not a currency of the money table`,
        { detail: { institutionId, currency } }
      );
    }
    return currency;
  }

  private async moveCheque(input: ChequeMoveInput, to: ChequeState): Promise<ChequeMoveResult> {
    const payment = await this.requirePayment(input.paymentId);
    const from = this.chequeState(payment);
    if (!from) {
      throw new PaymentError(
        'not_a_cheque',
        `payment ${payment.id} arrived through "${payment.channel}", so the cheque lifecycle does not apply`,
        { detail: { paymentId: payment.id, channel: payment.channel } }
      );
    }
    const transition = assertChequeTransition(from, to);
    const actor = input.actor ?? this.actor;
    const updated = await this.store.update(
      'payment',
      payment.id,
      { status: statusOfChequeState(to) },
      {
        expectedVersion: payment.rowVersion,
        ...(input.reason ? { reason: input.reason } : {}),
        ...(actor ? { actor } : {}),
      }
    );
    const entry = to === 'deposited' && this.ledger ? await this.postPayment(updated.id) : null;
    return { payment: updated, transition, entry };
  }

  private async addBounceFee(
    payment: RepositoryRow<'payment'>,
    fee: BounceFeeInput,
    issueDate: string
  ): Promise<string> {
    const amount = assertPositiveMoney(fee.amount);
    if (!payment.learner_id) {
      throw new PaymentError(
        'learner_missing',
        `payment ${payment.id} names no learner, so a bounce fee has nowhere to be charged`,
        { detail: { paymentId: payment.id } }
      );
    }
    const issued = await this.numbers.issue('invoice', {
      institution: payment.institution_id,
      term: fee.term,
      ...(fee.campus ? { campus: fee.campus } : {}),
    });
    const invoice = await this.store.create('invoice', {
      institution_id: payment.institution_id,
      number: issued.number,
      learner_id: payment.learner_id,
      issue_date: fee.issueDate ?? issueDate,
      total: { amount_minor: amount.amount_minor, currency: amount.currency },
      status: 'posted',
    });
    await this.store.create('invoice_line', {
      institution_id: payment.institution_id,
      invoice_id: invoice.id,
      description: fee.description,
      amount: { amount_minor: amount.amount_minor, currency: amount.currency },
      kind: 'fine',
      ...(fee.feeItemId ? { fee_item_id: fee.feeItemId } : {}),
    });
    return invoice.id;
  }

  private async refreshInvoiceStatus(invoiceId: string): Promise<void> {
    const invoice = await this.store.get('invoice', asId<'invoice'>(invoiceId));
    if (!invoice || invoice.status === 'draft' || invoice.status === 'void') return;
    const allocations = await this.store.list('payment_allocation', {
      where: { invoice_id: invoice.id },
      limit: PAGE_LIMIT,
    });
    const paid = allocations.items.reduce(
      (running, allocation) => running + allocation.amount.amount_minor,
      0
    );
    const total = invoice.total.amount_minor;
    const status: 'posted' | 'partially_paid' | 'paid' =
      paid >= total ? 'paid' : paid > 0 ? 'partially_paid' : 'posted';
    if (status === invoice.status) return;
    await this.store.update(
      'invoice',
      invoice.id,
      { status },
      {
        expectedVersion: invoice.rowVersion,
        reason: 'the payment allocations of this invoice changed',
        ...(this.actor ? { actor: this.actor } : {}),
      }
    );
  }

  private async buildReceiptView(
    payment: RepositoryRow<'payment'>,
    receipt: RepositoryRow<'receipt'>,
    options: {
      readonly payerName?: string;
      readonly cashierName?: string;
      readonly currency: Money['currency'];
    }
  ): Promise<ReceiptView> {
    const amount = asMoney(payment.amount);
    const learnerName = payment.learner_id
      ? await this.learnerLabel(asId<'learner'>(payment.learner_id))
      : '';
    const balanceAfter = payment.learner_id
      ? await this.outstandingBalance(payment.learner_id, options.currency)
      : zero(options.currency);
    return buildReceiptView({
      number: receipt.number,
      issuedAt: receipt.issued_at,
      status: receipt.status === 'void' ? 'void' : 'issued',
      payer: options.payerName ?? learnerName,
      learners: learnerName ? [learnerName] : [],
      amount,
      channel: payment.channel as PaymentChannel,
      reference: payment.reference ?? null,
      allocationByVoteHead: await this.allocationByVoteHead(payment.id, options.currency),
      balanceAfter,
      cashier: options.cashierName ?? payment.cashier_user_id ?? this.actor ?? '',
    });
  }

  private async allocationByVoteHead(
    paymentId: string,
    currency: Money['currency']
  ): Promise<readonly ReceiptAllocationLine[]> {
    const allocations = await this.store.list('payment_allocation', {
      where: { payment_id: paymentId },
      limit: PAGE_LIMIT,
    });
    const byFeeItem = new Map<string, Money>();
    for (const allocation of allocations.items) {
      const amount = asMoney(allocation.amount);
      const lines = await this.store.list('invoice_line', {
        where: { invoice_id: allocation.invoice_id },
        limit: PAGE_LIMIT,
      });
      const weights = lines.items.map((line) => Math.max(0, asMoney(line.amount).amount_minor));
      if (!weights.some((weight) => weight > 0)) continue;
      const shares = allocate(amount, weights);
      lines.items.forEach((line, index) => {
        const key = line.fee_item_id ?? 'unassigned';
        byFeeItem.set(key, add(byFeeItem.get(key) ?? zero(currency), shares[index] ?? zero(currency)));
      });
    }
    const out: ReceiptAllocationLine[] = [];
    for (const [key, amount] of byFeeItem) {
      if (isZero(amount)) continue;
      out.push({ label: await this.feeItemLabel(key), amount });
    }
    return out;
  }

  private async feeItemLabel(feeItemId: string): Promise<string> {
    if (feeItemId === 'unassigned') return 'Unassigned';
    const item = await this.store.get('fee_item', asId<'fee_item'>(feeItemId));
    return item ? `${item.code} ${item.name}` : feeItemId;
  }

  private async learnerLabel(learnerId: Id<'learner'>): Promise<string> {
    const learner = await this.store.get('learner', learnerId);
    if (!learner) return '';
    return `${learner.preferred_name ?? learner.given_name} ${learner.family_name}`.trim();
  }

  private async requirePayment(id: Id<'payment'>): Promise<RepositoryRow<'payment'>> {
    const payment = await this.store.get('payment', id);
    if (!payment) {
      throw new PaymentError('not_found', `payment ${id} does not exist`, { detail: { paymentId: id } });
    }
    return payment;
  }

  /** The session a payment names, refusing one that does not exist when a session service is held. */
  private async sessionOrRefuse(
    sessionId: string
  ): Promise<{ id: string; status: 'open' | 'closed'; closedAt: string | null }> {
    if (!this.sessions) return { id: sessionId, status: 'open', closedAt: null };
    const session = await this.sessions.session(sessionId);
    if (!session) {
      throw new PaymentError('session_missing', `cashier session ${sessionId} does not exist`, {
        detail: { sessionId },
      });
    }
    return session;
  }

  private async originalEntry(paymentId: string, institutionId: string): Promise<JournalEntry | null> {
    if (!this.ledger) return null;
    const entries = await this.ledger.listEntries({
      institutionId,
      sourceKind: 'payment',
      sourceId: paymentId,
    });
    return (
      entries.find((entry) => entry.reversesEntryId === null && entry.correctsEntryId === null) ?? null
    );
  }

  private async issueReceiptNumber(
    institutionId: string,
    cashierUserId: string | undefined,
    receivedAt: string
  ) {
    const year = /^\d{4}/.test(receivedAt)
      ? Number(receivedAt.slice(0, 4))
      : this.clock().getFullYear();
    const scope: ScopeValues = {
      institution: institutionId,
      year,
      // The catalog decides whether the cashier is a counter of its own; a payment taken without a
      // signed-in cashier is numbered under the placeholder rather than failing.
      cashier: cashierUserId ?? 'unassigned',
    };
    try {
      return await this.numbers.issue('receipt', scope);
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentError(
        'receipt_number_unavailable',
        `the receipt number could not be issued: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error, detail: { institutionId } }
      );
    }
  }
}

/** A payment amount must be a positive, whole number of minor units of a known currency. */
function assertPositiveMoney(value: Money): Money {
  if (
    !value ||
    typeof value !== 'object' ||
    !Number.isSafeInteger(value.amount_minor) ||
    !isCurrencyCode(value.currency)
  ) {
    throw new PaymentError('amount_invalid', 'an amount is whole minor units of a known currency', {
      detail: { amount: value as unknown },
    });
  }
  if (value.amount_minor <= 0) {
    throw new PaymentError(
      'amount_not_positive',
      `a payment is a positive amount, got ${value.amount_minor} ${value.currency}`,
      { detail: { amount: value } }
    );
  }
  return fromMinor(value.amount_minor, value.currency);
}

/** Reads a stored amount as a money value, refusing a currency the money table does not know. */
export function asMoney(value: unknown): Money {
  const candidate = value as { amount_minor?: unknown; currency?: unknown } | null;
  if (
    !candidate ||
    typeof candidate !== 'object' ||
    typeof candidate.amount_minor !== 'number' ||
    !Number.isSafeInteger(candidate.amount_minor) ||
    typeof candidate.currency !== 'string' ||
    !isCurrencyCode(candidate.currency)
  ) {
    throw new PaymentError(
      'amount_invalid',
      'a stored amount is not whole minor units of a known currency',
      { detail: { amount: value as unknown } }
    );
  }
  return fromMinor(candidate.amount_minor, candidate.currency);
}

/** Aggregates an allocation plan's per-line steps into the per-invoice amounts the ledger posts. */
export function aggregateByInvoice(
  plan: AllocationPlan
): readonly { readonly invoiceId: string; readonly amount: Money }[] {
  const byInvoice = new Map<string, Money>();
  for (const line of plan.allocations) {
    byInvoice.set(
      line.invoiceId,
      add(byInvoice.get(line.invoiceId) ?? zero(line.amount.currency), line.amount)
    );
  }
  return [...byInvoice.entries()]
    .filter(([, amount]) => !isZero(amount))
    .map(([invoiceId, amount]) => ({ invoiceId, amount }));
}
