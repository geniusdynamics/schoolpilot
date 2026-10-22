// ABOUTME: The postings derived from the finance documents: what each of an invoice, a payment, a
// ABOUTME: refund, a credit note and an opening balance debits and credits, and the refusals the
// ABOUTME: derivations make. Pure: the entries are created and read, never stored.

import { fromMinor } from '@/domain/money';
import { describe, expect, it } from 'vitest';

import {
  CONTROL_ACCOUNTS,
  LedgerError,
  createLedgerAccountMapping,
  creditNoteEntry,
  invoiceEntry,
  openingBalanceEntry,
  paymentEntry,
  refundEntry,
  type JournalEntry,
  type LedgerAccountMapping,
} from '..';

const kes = (minor: number) => fromMinor(minor, 'KES');
const usd = (minor: number) => fromMinor(minor, 'USD');

const FIXED_CLOCK = { now: () => new Date('2027-02-10T08:00:00.000Z') };

const CHART: LedgerAccountMapping = createLedgerAccountMapping({
  accounts: [
    { code: '4100', name: 'Tuition revenue', kind: 'revenue' },
    { code: '4200', name: 'Boarding revenue', kind: 'revenue' },
  ],
  feeItemRevenueAccounts: {
    'fee-tuition': '4100',
    'fee-boarding': '4200',
  },
});

/** A chart that refuses a fee item it does not know, instead of falling back to fee revenue. */
const STRICT_CHART: LedgerAccountMapping = createLedgerAccountMapping({
  accounts: [{ code: '4100', name: 'Tuition revenue', kind: 'revenue' }],
  feeItemRevenueAccounts: { 'fee-tuition': '4100' },
  requireFeeItemMapping: true,
});

interface LineShape {
  readonly account: string;
  readonly debit: number | null;
  readonly credit: number | null;
}

function shape(entry: JournalEntry): LineShape[] {
  return entry.lines.map((line) => ({
    account: line.accountCode,
    debit: line.debit === null ? null : line.debit.amount_minor,
    credit: line.credit === null ? null : line.credit.amount_minor,
  }));
}

function refusalOf(work: () => unknown): LedgerError {
  try {
    work();
  } catch (error) {
    if (error instanceof LedgerError) return error;
    throw error;
  }
  throw new Error('the posting was accepted, but it should have been refused');
}

const RECEIVABLES = CONTROL_ACCOUNTS.receivables.code;
const LEARNER_CREDIT = CONTROL_ACCOUNTS.learner_credit.code;
const REFUNDS_PAYABLE = CONTROL_ACCOUNTS.refunds_payable.code;
const OPENING_EQUITY = CONTROL_ACCOUNTS.opening_balance_equity.code;

describe('invoiceEntry', () => {
  it('debits the receivable and credits the revenue account of each fee item', () => {
    const entry = invoiceEntry(
      {
        invoice: {
          id: 'invoice-1',
          number: 'INV/2027/T1/000001',
          institutionId: 'inst-1',
          issueDate: '2027-01-10',
          lines: [
            { feeItemId: 'fee-tuition', amount: kes(600_000) },
            { feeItemId: 'fee-boarding', amount: kes(1_850_000) },
          ],
        },
      },
      CHART,
      FIXED_CLOCK
    );

    expect(entry.entryDate).toBe('2027-01-10');
    expect(entry.source).toEqual({ kind: 'invoice', id: 'invoice-1', number: 'INV/2027/T1/000001' });
    expect(shape(entry)).toEqual([
      { account: RECEIVABLES, debit: 2_450_000, credit: null },
      { account: '4100', debit: null, credit: 600_000 },
      { account: '4200', debit: null, credit: 1_850_000 },
    ]);
    expect(entry.totalDebit).toEqual(entry.totalCredit);
  });

  it('posts a discount line as a debit of revenue, so the contra-revenue is visible', () => {
    const entry = invoiceEntry(
      {
        invoice: {
          id: 'invoice-2',
          institutionId: 'inst-1',
          issueDate: '2027-01-10',
          lines: [
            { feeItemId: 'fee-tuition', amount: kes(600_000) },
            { amount: kes(-100_000), description: 'Sibling discount' },
          ],
        },
      },
      CHART,
      FIXED_CLOCK
    );

    expect(shape(entry)).toEqual([
      { account: RECEIVABLES, debit: 500_000, credit: null },
      { account: '4100', debit: null, credit: 600_000 },
      { account: CONTROL_ACCOUNTS.fee_revenue.code, debit: 100_000, credit: null },
    ]);
    expect(entry.totalDebit).toEqual(entry.totalCredit);
  });

  it('falls back to fee revenue for a line whose fee item carries no mapping', () => {
    const entry = invoiceEntry(
      {
        invoice: {
          id: 'invoice-3',
          institutionId: 'inst-1',
          issueDate: '2027-01-10',
          lines: [{ feeItemId: 'fee-unknown', amount: kes(50_000) }],
        },
      },
      CHART,
      FIXED_CLOCK
    );
    expect(shape(entry)[1]).toEqual({
      account: CONTROL_ACCOUNTS.fee_revenue.code,
      debit: null,
      credit: 50_000,
    });
  });

  it('refuses an unmapped fee item when the chart requires the mapping', () => {
    const error = refusalOf(() =>
      invoiceEntry(
        {
          invoice: {
            id: 'invoice-4',
            institutionId: 'inst-1',
            issueDate: '2027-01-10',
            lines: [{ feeItemId: 'fee-unknown', amount: kes(50_000) }],
          },
        },
        STRICT_CHART,
        FIXED_CLOCK
      )
    );
    expect(error.code).toBe('no_mapping');
    expect(error.detail.feeItemId).toBe('fee-unknown');
  });

  it('refuses a total that disagrees with the lines, and an invoice that nets to zero', () => {
    expect(
      refusalOf(() =>
        invoiceEntry(
          {
            invoice: {
              id: 'invoice-5',
              institutionId: 'inst-1',
              issueDate: '2027-01-10',
              total: kes(999),
              lines: [{ feeItemId: 'fee-tuition', amount: kes(600_000) }],
            },
          },
          CHART,
          FIXED_CLOCK
        )
      ).code
    ).toBe('invalid_entry');

    expect(
      refusalOf(() =>
        invoiceEntry(
          {
            invoice: {
              id: 'invoice-6',
              institutionId: 'inst-1',
              issueDate: '2027-01-10',
              lines: [
                { feeItemId: 'fee-tuition', amount: kes(600_000) },
                { amount: kes(-600_000) },
              ],
            },
          },
          CHART,
          FIXED_CLOCK
        )
      ).code
    ).toBe('invalid_entry');
  });

  it('refuses an invoice whose lines mix two currencies', () => {
    expect(
      refusalOf(() =>
        invoiceEntry(
          {
            invoice: {
              id: 'invoice-7',
              institutionId: 'inst-1',
              issueDate: '2027-01-10',
              lines: [
                { feeItemId: 'fee-tuition', amount: kes(600_000) },
                { feeItemId: 'fee-boarding', amount: usd(100) },
              ],
            },
          },
          CHART,
          FIXED_CLOCK
        )
      ).code
    ).toBe('currency_mismatch');
  });
});

describe('paymentEntry', () => {
  it('debits the channel and clears the receivable of every allocation', () => {
    const entry = paymentEntry(
      {
        payment: {
          id: 'payment-1',
          institutionId: 'inst-1',
          amount: kes(500_000),
          channel: 'bank_deposit',
          reference: 'SLIP-1',
          receivedAt: '2027-02-03T10:00:00.000Z',
        },
        allocations: [
          { invoiceId: 'invoice-1', invoiceNumber: 'INV/1', amount: kes(300_000) },
          { invoiceId: 'invoice-2', invoiceNumber: 'INV/2', amount: kes(200_000) },
        ],
      },
      CHART,
      FIXED_CLOCK
    );

    expect(entry.entryDate).toBe('2027-02-03');
    expect(shape(entry)).toEqual([
      { account: CONTROL_ACCOUNTS.bank.code, debit: 500_000, credit: null },
      { account: RECEIVABLES, debit: null, credit: 300_000 },
      { account: RECEIVABLES, debit: null, credit: 200_000 },
    ]);
    expect(entry.lines[1].memo).toContain('INV/1');
  });

  it('holds the unallocated part as learner credit', () => {
    const entry = paymentEntry(
      {
        payment: {
          id: 'payment-2',
          institutionId: 'inst-1',
          amount: kes(500_000),
          channel: 'mobile_money',
          receivedAt: '2027-02-03T10:00:00.000Z',
        },
        allocations: [{ invoiceId: 'invoice-1', amount: kes(300_000) }],
      },
      CHART,
      FIXED_CLOCK
    );

    expect(shape(entry)).toEqual([
      { account: CONTROL_ACCOUNTS.mobile_money_clearing.code, debit: 500_000, credit: null },
      { account: RECEIVABLES, debit: null, credit: 300_000 },
      { account: LEARNER_CREDIT, debit: null, credit: 200_000 },
    ]);
    expect(entry.totalDebit).toEqual(entry.totalCredit);
  });

  it('holds an entirely unallocated payment as learner credit', () => {
    const entry = paymentEntry(
      {
        payment: {
          id: 'payment-3',
          institutionId: 'inst-1',
          amount: kes(50_000),
          channel: 'cash',
          receivedAt: '2027-02-03T10:00:00.000Z',
        },
      },
      CHART,
      FIXED_CLOCK
    );
    expect(shape(entry)).toEqual([
      { account: CONTROL_ACCOUNTS.cash.code, debit: 50_000, credit: null },
      { account: LEARNER_CREDIT, debit: null, credit: 50_000 },
    ]);
  });

  it('refuses an allocation that exceeds the payment', () => {
    const error = refusalOf(() =>
      paymentEntry(
        {
          payment: {
            id: 'payment-4',
            institutionId: 'inst-1',
            amount: kes(500_000),
            channel: 'cash',
            receivedAt: '2027-02-03T10:00:00.000Z',
          },
          allocations: [{ invoiceId: 'invoice-1', amount: kes(500_001) }],
        },
        CHART,
        FIXED_CLOCK
      )
    );
    expect(error.code).toBe('invalid_entry');
  });
});

describe('refundEntry', () => {
  it('debits the refunds payable and credits the channel the money leaves through', () => {
    const entry = refundEntry(
      {
        refund: {
          id: 'refund-1',
          number: 'RFD/2027/000001',
          institutionId: 'inst-1',
          amount: kes(80_000),
          status: 'paid',
          paidAt: '2027-03-01T12:00:00.000Z',
          reason: 'deposit refund on exit',
        },
      },
      CHART,
      FIXED_CLOCK
    );

    expect(entry.entryDate).toBe('2027-03-01');
    expect(shape(entry)).toEqual([
      { account: REFUNDS_PAYABLE, debit: 80_000, credit: null },
      { account: CONTROL_ACCOUNTS.bank.code, debit: null, credit: 80_000 },
    ]);
  });

  it('pays out through the channel it was told to', () => {
    const entry = refundEntry(
      {
        refund: {
          id: 'refund-2',
          institutionId: 'inst-1',
          amount: kes(20_000),
          status: 'paid',
          channel: 'cash',
          paidAt: '2027-03-02T12:00:00.000Z',
        },
      },
      CHART,
      FIXED_CLOCK
    );
    expect(shape(entry)[1].account).toBe(CONTROL_ACCOUNTS.cash.code);
  });

  it('refuses a refund that is not paid', () => {
    expect(
      refusalOf(() =>
        refundEntry(
          {
            refund: {
              id: 'refund-3',
              institutionId: 'inst-1',
              amount: kes(20_000),
              status: 'requested',
            },
          },
          CHART,
          FIXED_CLOCK
        )
      ).code
    ).toBe('invalid_entry');
  });
});

describe('creditNoteEntry', () => {
  it('debits the revenue of the fee items it names and credits the receivable', () => {
    const entry = creditNoteEntry(
      {
        creditNote: {
          id: 'credit-1',
          number: 'CRN/2027/000001',
          institutionId: 'inst-1',
          amount: kes(150_000),
          issueDate: '2027-02-20',
          reason: 'overcharged',
          lines: [
            { feeItemId: 'fee-tuition', amount: kes(100_000) },
            { feeItemId: 'fee-boarding', amount: kes(50_000) },
          ],
        },
      },
      CHART,
      FIXED_CLOCK
    );

    expect(entry.entryDate).toBe('2027-02-20');
    expect(shape(entry)).toEqual([
      { account: '4100', debit: 100_000, credit: null },
      { account: '4200', debit: 50_000, credit: null },
      { account: RECEIVABLES, debit: null, credit: 150_000 },
    ]);
  });

  it('debits fee revenue as a whole when it names no fee item', () => {
    const entry = creditNoteEntry(
      {
        creditNote: {
          id: 'credit-2',
          institutionId: 'inst-1',
          amount: kes(150_000),
          issueDate: '2027-02-20',
        },
      },
      CHART,
      FIXED_CLOCK
    );
    expect(shape(entry)).toEqual([
      { account: CONTROL_ACCOUNTS.fee_revenue.code, debit: 150_000, credit: null },
      { account: RECEIVABLES, debit: null, credit: 150_000 },
    ]);
  });

  it('refuses lines that do not sum to the credit note', () => {
    expect(
      refusalOf(() =>
        creditNoteEntry(
          {
            creditNote: {
              id: 'credit-3',
              institutionId: 'inst-1',
              amount: kes(150_000),
              issueDate: '2027-02-20',
              lines: [{ feeItemId: 'fee-tuition', amount: kes(100_000) }],
            },
          },
          CHART,
          FIXED_CLOCK
        )
      ).code
    ).toBe('invalid_entry');
  });
});

describe('openingBalanceEntry', () => {
  it('carries a debit balance as a receivable against opening-balance equity', () => {
    const entry = openingBalanceEntry(
      {
        openingBalance: {
          id: 'opening-1',
          institutionId: 'inst-1',
          asOfDate: '2027-01-01',
          amount: kes(1_200_000),
          side: 'debit',
          learnerId: 'learner-1',
        },
      },
      CHART,
      FIXED_CLOCK
    );
    expect(shape(entry)).toEqual([
      { account: RECEIVABLES, debit: 1_200_000, credit: null },
      { account: OPENING_EQUITY, debit: null, credit: 1_200_000 },
    ]);
    expect(entry.lines[0].memo).toBe('learner-1');
  });

  it('carries a credit balance as equity against the receivable', () => {
    const entry = openingBalanceEntry(
      {
        openingBalance: {
          id: 'opening-2',
          institutionId: 'inst-1',
          asOfDate: '2027-01-01',
          amount: kes(30_000),
          side: 'credit',
        },
      },
      CHART,
      FIXED_CLOCK
    );
    expect(shape(entry)).toEqual([
      { account: OPENING_EQUITY, debit: 30_000, credit: null },
      { account: RECEIVABLES, debit: null, credit: 30_000 },
    ]);
  });

  it('holds the balance against the account it names', () => {
    const entry = openingBalanceEntry(
      {
        openingBalance: {
          id: 'opening-3',
          institutionId: 'inst-1',
          asOfDate: '2027-01-01',
          amount: kes(30_000),
          side: 'debit',
          accountCode: '4100',
        },
      },
      CHART,
      FIXED_CLOCK
    );
    expect(shape(entry)[0].account).toBe('4100');
  });

  it('refuses an account the chart does not hold and a date that is not a day', () => {
    expect(
      refusalOf(() =>
        openingBalanceEntry(
          {
            openingBalance: {
              id: 'opening-4',
              institutionId: 'inst-1',
              asOfDate: '2027-01-01',
              amount: kes(1),
              side: 'debit',
              accountCode: '9999',
            },
          },
          CHART,
          FIXED_CLOCK
        )
      ).code
    ).toBe('no_mapping');

    expect(
      refusalOf(() =>
        openingBalanceEntry(
          {
            openingBalance: {
              id: 'opening-5',
              institutionId: 'inst-1',
              asOfDate: 'yesterday',
              amount: kes(1),
              side: 'debit',
            },
          },
          CHART,
          FIXED_CLOCK
        )
      ).code
    ).toBe('invalid_entry');
  });
});
