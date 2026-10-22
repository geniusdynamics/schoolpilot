// ABOUTME: The postings the rest of the system calls: one derivation per source document that
// ABOUTME: turns an invoice, a payment and its allocations, a refund, a credit note or an opening
// ABOUTME: balance into the double entry spec 05 section 8 describes.

import {
  abs,
  add,
  compare,
  isZero,
  subtract,
  zero,
  type CurrencyCode,
  type Money,
} from '@/domain/money';

import {
  resolveChannelAccount,
  resolveControlAccount,
  resolveRevenueAccount,
  type LedgerAccountMapping,
  type PaymentChannel,
} from './chart';
import { createJournalEntry, isIsoDay } from './entry';
import { LedgerError } from './errors';
import type { JournalEntry, JournalLineInput, JournalSide, LedgerAccount } from './types';

/** The clock and identity a derivation stamps on the entry it produces. */
export interface PostingOptions {
  readonly id?: string;
  readonly now?: () => Date;
  readonly postedBy?: string | null;
}

/** A line of the invoice an entry is derived from. */
export interface InvoicePostingLine {
  /** The fee item whose GL mapping names the revenue account (P3-B01). */
  readonly feeItemId?: string | null;
  readonly amount: Money;
  readonly description?: string;
}

export interface InvoicePostingInput {
  readonly invoice: {
    readonly id: string;
    readonly number?: string;
    readonly institutionId: string;
    readonly issueDate: string;
    /** The invoice total; checked against the sum of the lines when it is given. */
    readonly total?: Money;
    readonly lines: readonly InvoicePostingLine[];
  };
  readonly periodId?: string;
  readonly postedBy?: string;
}

export interface PaymentAllocationPosting {
  readonly invoiceId: string;
  readonly invoiceNumber?: string;
  readonly amount: Money;
}

export interface PaymentPostingInput {
  readonly payment: {
    readonly id: string;
    readonly institutionId: string;
    readonly amount: Money;
    readonly channel: PaymentChannel;
    readonly reference?: string;
    /** The value date and time; the entry is dated by its day. */
    readonly receivedAt?: string;
  };
  readonly allocations?: readonly PaymentAllocationPosting[];
  readonly periodId?: string;
  readonly postedBy?: string;
}

export interface RefundPostingInput {
  readonly refund: {
    readonly id: string;
    readonly number?: string;
    readonly institutionId: string;
    readonly amount: Money;
    /** The canonical refund status; a refund posts when it is paid. */
    readonly status?: string;
    /** The channel the money leaves through. Defaults to the bank. */
    readonly channel?: PaymentChannel;
    readonly paidAt?: string;
    readonly reason?: string;
  };
  readonly periodId?: string;
  readonly postedBy?: string;
}

export interface CreditNotePostingLine {
  readonly feeItemId?: string | null;
  readonly amount: Money;
}

export interface CreditNotePostingInput {
  readonly creditNote: {
    readonly id: string;
    readonly number?: string;
    readonly institutionId: string;
    readonly amount: Money;
    readonly issueDate: string;
    readonly reason?: string;
    /** The fee items the credit note credits; without them the whole note posts to fee revenue. */
    readonly lines?: readonly CreditNotePostingLine[];
  };
  readonly periodId?: string;
  readonly postedBy?: string;
}

export interface OpeningBalancePostingInput {
  readonly openingBalance: {
    readonly id: string;
    readonly institutionId: string;
    readonly asOfDate: string;
    readonly amount: Money;
    /** Which side the learner's balance sits on. */
    readonly side: JournalSide;
    /** The account the balance is held against. Defaults to fee receivables. */
    readonly accountCode?: string;
    readonly learnerId?: string;
  };
  readonly periodId?: string;
  readonly postedBy?: string;
}

/**
 * The entry of a posted invoice: the receivable against the revenue of each fee item.
 *
 * Debit receivables with the invoice total and credit the revenue account of every line; a
 * discount line (a negative amount) is a debit of its revenue account, so the contra-revenue
 * shows where the money went rather than hiding inside the total. The entry balances whatever mix
 * of positive and negative lines the invoice carries.
 */
export function invoiceEntry(
  input: InvoicePostingInput,
  mapping: LedgerAccountMapping,
  options: PostingOptions = {}
): JournalEntry {
  const { invoice } = input;
  if (invoice.lines.length === 0) {
    throw new LedgerError('invalid_entry', `invoice ${labelOf(invoice)} carries no lines to post`, {
      detail: { invoiceId: invoice.id },
    });
  }

  const currency = currencyOf(
    invoice.lines.map((line) => line.amount),
    `invoice ${labelOf(invoice)}`
  );
  const total = sumAmounts(
    invoice.lines.map((line) => line.amount),
    currency,
    `invoice ${labelOf(invoice)}`
  );
  if (invoice.total !== undefined && compare(invoice.total, total) !== 0) {
    throw new LedgerError(
      'invalid_entry',
      `invoice ${labelOf(invoice)} totals ${invoice.total.amount_minor} but its lines sum to ${total.amount_minor} ${currency}`,
      { detail: { invoiceId: invoice.id } }
    );
  }
  if (isZero(total)) {
    throw new LedgerError(
      'invalid_entry',
      `invoice ${labelOf(invoice)} nets to zero; there is nothing to post`,
      { detail: { invoiceId: invoice.id } }
    );
  }

  const receivables = resolveControlAccount(mapping, 'receivables');
  const lines: JournalLineInput[] = [];
  lines.push(
    total.amount_minor > 0
      ? { accountCode: receivables.code, accountName: receivables.name, debit: total, memo: 'invoice total' }
      : { accountCode: receivables.code, accountName: receivables.name, credit: abs(total), memo: 'invoice total' }
  );

  for (const line of invoice.lines) {
    if (isZero(line.amount)) continue;
    const account = resolveRevenueAccount(
      mapping,
      line.feeItemId,
      `invoice ${labelOf(invoice)}`
    );
    const memo = line.description ?? line.feeItemId ?? undefined;
    lines.push(
      line.amount.amount_minor > 0
        ? { accountCode: account.code, accountName: account.name, credit: line.amount, memo }
        : { accountCode: account.code, accountName: account.name, debit: abs(line.amount), memo }
    );
  }

  return createJournalEntry(
    {
      institutionId: invoice.institutionId,
      entryDate: invoice.issueDate,
      source: { kind: 'invoice', id: invoice.id, ...(invoice.number ? { number: invoice.number } : {}) },
      narration: `Invoice ${labelOf(invoice)} posted`,
      lines,
      ...optional(input),
    },
    options
  );
}

/**
 * The entry of a received payment and its allocations.
 *
 * The money lands in the account of the channel it arrived through; the allocated part clears the
 * receivable of the invoices it was applied to, and whatever is left over becomes learner credit,
 * the liability spec 05 section 5.3 names.
 */
export function paymentEntry(
  input: PaymentPostingInput,
  mapping: LedgerAccountMapping,
  options: PostingOptions = {}
): JournalEntry {
  const { payment } = input;
  const currency = payment.amount.currency;
  if (isZero(payment.amount) || payment.amount.amount_minor < 0) {
    throw new LedgerError(
      'invalid_entry',
      `payment ${payment.id} holds ${payment.amount.amount_minor} ${currency}; a payment is a positive amount`,
      { detail: { paymentId: payment.id } }
    );
  }

  const allocations = (input.allocations ?? []).filter((allocation) => !isZero(allocation.amount));
  const allocated = sumAmounts(
    allocations.map((allocation) => allocation.amount),
    currency,
    `payment ${payment.id}`
  );
  if (compare(allocated, payment.amount) > 0) {
    throw new LedgerError(
      'invalid_entry',
      `payment ${payment.id} allocates ${allocated.amount_minor} of ${payment.amount.amount_minor} ${currency}; an allocation cannot exceed the payment`,
      { detail: { paymentId: payment.id } }
    );
  }

  const channel = resolveChannelAccount(mapping, payment.channel);
  const receivables = resolveControlAccount(mapping, 'receivables');
  const lines: JournalLineInput[] = [
    {
      accountCode: channel.code,
      accountName: channel.name,
      debit: payment.amount,
      memo: payment.reference ?? payment.channel,
    },
  ];

  for (const allocation of allocations) {
    lines.push({
      accountCode: receivables.code,
      accountName: receivables.name,
      credit: allocation.amount,
      memo: `allocated to invoice ${allocation.invoiceNumber ?? allocation.invoiceId}`,
    });
  }

  const unallocated = subtract(payment.amount, allocated);
  if (!isZero(unallocated)) {
    const learnerCredit = resolveControlAccount(mapping, 'learner_credit');
    lines.push({
      accountCode: learnerCredit.code,
      accountName: learnerCredit.name,
      credit: unallocated,
      memo: 'learner credit',
    });
  }

  return createJournalEntry(
    {
      institutionId: payment.institutionId,
      entryDate: entryDay(payment.receivedAt, options),
      source: { kind: 'payment', id: payment.id, ...(payment.reference ? { number: payment.reference } : {}) },
      narration: `Payment received via ${payment.channel}`,
      lines,
      ...optional(input),
    },
    options
  );
}

/**
 * The entry of a paid refund: the payable settled out of the channel the money leaves through.
 *
 * A refund is the settlement of an amount the school owes the payer, so it debits the refunds
 * payable account and credits the bank (or the channel the payout used).
 */
export function refundEntry(
  input: RefundPostingInput,
  mapping: LedgerAccountMapping,
  options: PostingOptions = {}
): JournalEntry {
  const { refund } = input;
  if (refund.status !== undefined && refund.status !== 'paid') {
    throw new LedgerError(
      'invalid_entry',
      `refund ${labelOf(refund)} is ${refund.status}; a refund is posted when it is paid`,
      { detail: { refundId: refund.id, status: refund.status } }
    );
  }
  if (isZero(refund.amount) || refund.amount.amount_minor < 0) {
    throw new LedgerError(
      'invalid_entry',
      `refund ${labelOf(refund)} holds a non-positive amount; there is nothing to pay out`,
      { detail: { refundId: refund.id } }
    );
  }

  const payable = resolveControlAccount(mapping, 'refunds_payable');
  const channel = resolveChannelAccount(mapping, refund.channel ?? 'bank_deposit');

  return createJournalEntry(
    {
      institutionId: refund.institutionId,
      entryDate: entryDay(refund.paidAt, options),
      source: { kind: 'refund', id: refund.id, ...(refund.number ? { number: refund.number } : {}) },
      narration: `Refund ${labelOf(refund)} paid via ${refund.channel ?? 'bank_deposit'}${
        refund.reason ? `: ${refund.reason}` : ''
      }`,
      lines: [
        { accountCode: payable.code, accountName: payable.name, debit: refund.amount, memo: 'refund' },
        { accountCode: channel.code, accountName: channel.name, credit: refund.amount, memo: refund.reason },
      ],
      ...optional(input),
    },
    options
  );
}

/**
 * The entry of a posted credit note: revenue given back, against the receivable.
 *
 * A credit note that names the fee items it credits debits each of their revenue accounts; one
 * that does not debits fee revenue as a whole. The credit note reduces the receivable either way.
 */
export function creditNoteEntry(
  input: CreditNotePostingInput,
  mapping: LedgerAccountMapping,
  options: PostingOptions = {}
): JournalEntry {
  const { creditNote } = input;
  if (isZero(creditNote.amount) || creditNote.amount.amount_minor < 0) {
    throw new LedgerError(
      'invalid_entry',
      `credit note ${labelOf(creditNote)} holds a non-positive amount; there is nothing to credit`,
      { detail: { creditNoteId: creditNote.id } }
    );
  }

  const currency = creditNote.amount.currency;
  const lines: JournalLineInput[] = [];
  const detailLines = (creditNote.lines ?? []).filter((line) => !isZero(line.amount));
  if (detailLines.length > 0) {
    const sum = sumAmounts(
      detailLines.map((line) => line.amount),
      currency,
      `credit note ${labelOf(creditNote)}`
    );
    if (compare(sum, creditNote.amount) !== 0) {
      throw new LedgerError(
        'invalid_entry',
        `credit note ${labelOf(creditNote)} is ${creditNote.amount.amount_minor} but its lines sum to ${sum.amount_minor} ${currency}`,
        { detail: { creditNoteId: creditNote.id } }
      );
    }
    for (const line of detailLines) {
      const account = resolveRevenueAccount(
        mapping,
        line.feeItemId,
        `credit note ${labelOf(creditNote)}`
      );
      lines.push({
        accountCode: account.code,
        accountName: account.name,
        debit: line.amount,
        ...(line.feeItemId ? { memo: line.feeItemId } : {}),
      });
    }
  } else {
    const revenue = resolveRevenueAccount(mapping, null, `credit note ${labelOf(creditNote)}`);
    lines.push({
      accountCode: revenue.code,
      accountName: revenue.name,
      debit: creditNote.amount,
      memo: 'credit note',
    });
  }

  const receivables = resolveControlAccount(mapping, 'receivables');
  lines.push({
    accountCode: receivables.code,
    accountName: receivables.name,
    credit: creditNote.amount,
    memo: 'credit note',
  });

  return createJournalEntry(
    {
      institutionId: creditNote.institutionId,
      entryDate: creditNote.issueDate,
      source: {
        kind: 'credit_note',
        id: creditNote.id,
        ...(creditNote.number ? { number: creditNote.number } : {}),
      },
      narration: `Credit note ${labelOf(creditNote)} posted${creditNote.reason ? `: ${creditNote.reason}` : ''}`,
      lines,
      ...optional(input),
    },
    options
  );
}

/**
 * The entry of an opening balance: what a learner already owed (or had paid) on migration day.
 *
 * A debit balance is a receivable against opening-balance equity; a credit balance is equity
 * against the receivable. Spec 05 section 4.6 carries these as `kind = opening_balance` lines with
 * an as-of date.
 */
export function openingBalanceEntry(
  input: OpeningBalancePostingInput,
  mapping: LedgerAccountMapping,
  options: PostingOptions = {}
): JournalEntry {
  const { openingBalance } = input;
  if (isZero(openingBalance.amount) || openingBalance.amount.amount_minor < 0) {
    throw new LedgerError(
      'invalid_entry',
      `opening balance ${openingBalance.id} holds a non-positive amount; there is nothing to carry`,
      { detail: { openingBalanceId: openingBalance.id } }
    );
  }
  if (!isIsoDay(openingBalance.asOfDate)) {
    throw new LedgerError(
      'invalid_entry',
      `opening balance ${openingBalance.id} needs an ISO day as its as-of date, not "${openingBalance.asOfDate}"`,
      { detail: { openingBalanceId: openingBalance.id } }
    );
  }

  const account = openingBalance.accountCode
    ? accountOrRefuse(mapping, openingBalance.accountCode, openingBalance.id)
    : resolveControlAccount(mapping, 'receivables');
  const equity = resolveControlAccount(mapping, 'opening_balance_equity');
  const debitSide = openingBalance.side === 'debit' ? account : equity;
  const creditSide = openingBalance.side === 'debit' ? equity : account;

  return createJournalEntry(
    {
      institutionId: openingBalance.institutionId,
      entryDate: openingBalance.asOfDate,
      source: { kind: 'opening_balance', id: openingBalance.id },
      narration: `Opening balance at ${openingBalance.asOfDate}`,
      lines: [
        {
          accountCode: debitSide.code,
          accountName: debitSide.name,
          debit: openingBalance.amount,
          ...(openingBalance.learnerId ? { memo: openingBalance.learnerId } : {}),
        },
        { accountCode: creditSide.code, accountName: creditSide.name, credit: openingBalance.amount },
      ],
      ...optional(input),
    },
    options
  );
}

function accountOrRefuse(
  mapping: LedgerAccountMapping,
  code: string,
  openingBalanceId: string
): LedgerAccount {
  const account = mapping.account(code);
  if (!account) {
    throw new LedgerError(
      'no_mapping',
      `opening balance ${openingBalanceId} names account "${code}", which the chart of accounts does not hold`,
      { detail: { openingBalanceId, accountCode: code } }
    );
  }
  return account;
}

function labelOf(document: { id: string; number?: string }): string {
  return document.number ?? document.id;
}

/** The period and the actor a derivation copies from its own input. */
function optional(input: { periodId?: string; postedBy?: string }): {
  periodId?: string;
  postedBy?: string;
} {
  return {
    ...(input.periodId ? { periodId: input.periodId } : {}),
    ...(input.postedBy ? { postedBy: input.postedBy } : {}),
  };
}

/** The day an entry takes effect on: the day of the document, or the clock's day. */
function entryDay(timestamp: string | undefined, options: PostingOptions): string {
  if (timestamp !== undefined && timestamp.length >= 10) {
    const day = timestamp.slice(0, 10);
    if (isIsoDay(day)) return day;
  }
  return (options.now ?? (() => new Date()))().toISOString().slice(0, 10);
}

function currencyOf(amounts: readonly Money[], subject: string): CurrencyCode {
  const currency = amounts[0]?.currency;
  if (currency === undefined) {
    throw new LedgerError('invalid_entry', `${subject} carries no amount to post`, {
      detail: { subject },
    });
  }
  return currency;
}

function sumAmounts(amounts: readonly Money[], currency: CurrencyCode, subject: string): Money {
  let running = zero(currency);
  for (const amount of amounts) {
    if (amount.currency !== currency) {
      throw new LedgerError(
        'currency_mismatch',
        `${subject} mixes ${currency} and ${amount.currency}; a document is counted in one currency`,
        { detail: { subject, expected: currency, actual: amount.currency } }
      );
    }
    running = add(running, amount);
  }
  return running;
}
