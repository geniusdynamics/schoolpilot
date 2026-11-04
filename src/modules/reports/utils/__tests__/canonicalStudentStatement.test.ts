// ABOUTME: Tests for the canonical student votehead statement builder: opening balance as of the
// ABOUTME: period, period isolation, running balances, void exclusion and allocation-only credits.

import { describe, expect, it } from 'vitest';

import {
  buildCanonicalStudentStatement,
  type BuildCanonicalStudentStatementInput,
  type StatementAllocation,
  type StatementCreditNote,
  type StatementInvoice,
  type StatementInvoiceLine,
  type StatementPayment,
} from '../canonicalStudentStatement';

const LEARNER = 'learner-1';
const PERIOD = 'term-1';
const PRIOR_PERIOD = 'term-0';
const NEXT_PERIOD = 'term-2';
const START = '2027-01-05';
const END = '2027-04-03';

function invoice(overrides: Partial<StatementInvoice> & { id: string }): StatementInvoice {
  return {
    number: `INV-${overrides.id}`,
    learner_id: LEARNER,
    academic_period_id: PERIOD,
    issue_date: '2027-01-10',
    status: 'posted',
    total: { amount_minor: 1_000, currency: 'KES' },
    ...overrides,
  };
}

function line(
  overrides: Partial<StatementInvoiceLine> & { id: string; invoice_id: string }
): StatementInvoiceLine {
  return {
    description: `Line ${overrides.id}`,
    amount: { amount_minor: 1_000, currency: 'KES' },
    ...overrides,
  };
}

function payment(overrides: Partial<StatementPayment> & { id: string }): StatementPayment {
  return {
    learner_id: LEARNER,
    channel: 'mobile_money',
    received_at: '2027-01-06T09:00:00Z',
    reference: `REF-${overrides.id}`,
    status: 'posted',
    ...overrides,
  };
}

function allocation(
  overrides: Partial<StatementAllocation> & { id: string; payment_id: string; invoice_id: string }
): StatementAllocation {
  return {
    amount: { amount_minor: 500, currency: 'KES' },
    allocated_at: '2027-01-20T09:00:00Z',
    ...overrides,
  };
}

function creditNote(
  overrides: Partial<StatementCreditNote> & { id: string }
): StatementCreditNote {
  return {
    number: `CN-${overrides.id}`,
    learner_id: LEARNER,
    amount: { amount_minor: 1_000, currency: 'KES' },
    reason: 'Adjustment',
    issue_date: '2027-02-01',
    status: 'posted',
    ...overrides,
  };
}

function build(
  overrides: Partial<BuildCanonicalStudentStatementInput> = {}
): ReturnType<typeof buildCanonicalStudentStatement> {
  return buildCanonicalStudentStatement({
    learnerId: LEARNER,
    periodId: PERIOD,
    periodStartDate: START,
    periodEndDate: END,
    invoices: [],
    invoiceLines: [],
    payments: [],
    allocations: [],
    creditNotes: [],
    ...overrides,
  });
}

describe('buildCanonicalStudentStatement', () => {
  it('carries the billed-before-period balance less prior allocations and posted credit notes', () => {
    const statement = build({
      invoices: [
        invoice({
          id: 'old',
          number: 'INV-OLD',
          academic_period_id: PRIOR_PERIOD,
          issue_date: '2026-11-01',
          total: { amount_minor: 120_000, currency: 'KES' },
        }),
        invoice({ id: 'current', number: 'INV-100', issue_date: '2027-01-10' }),
      ],
      invoiceLines: [
        line({ id: 'old-line', invoice_id: 'old', description: 'Tuition 2026', amount: { amount_minor: 120_000, currency: 'KES' } }),
        line({ id: 'current-line', invoice_id: 'current', description: 'Tuition 2027', amount: { amount_minor: 150_000, currency: 'KES' } }),
      ],
      payments: [payment({ id: 'old-payment' })],
      allocations: [
        allocation({
          id: 'old-allocation',
          payment_id: 'old-payment',
          invoice_id: 'old',
          amount: { amount_minor: 30_000, currency: 'KES' },
          allocated_at: '2026-11-02T09:00:00Z',
        }),
      ],
      creditNotes: [
        creditNote({
          id: 'old-credit',
          number: 'CN-OLD',
          invoice_id: 'old',
          amount: { amount_minor: 20_000, currency: 'KES' },
          issue_date: '2026-11-03',
        }),
      ],
    });

    expect(statement.openingBalanceMinor).toBe(70_000);
    expect(statement.rows).toHaveLength(1);
    expect(statement.rows[0]).toMatchObject({
      date: '2027-01-10',
      description: 'Tuition 2027',
      reference: 'INV-100',
      debitMinor: 150_000,
      creditMinor: 0,
      balanceMinor: 220_000,
    });
    expect(statement.closingBalanceMinor).toBe(220_000);
  });

  it('shows only the selected period and leaves the prior and next periods to their own statements', () => {
    const statement = build({
      invoices: [
        invoice({
          id: 'old',
          academic_period_id: PRIOR_PERIOD,
          issue_date: '2026-11-01',
          total: { amount_minor: 120_000, currency: 'KES' },
        }),
        invoice({ id: 'current', issue_date: '2027-01-10' }),
        invoice({ id: 'next', academic_period_id: NEXT_PERIOD, issue_date: '2027-06-01' }),
      ],
      invoiceLines: [
        line({ id: 'old-line', invoice_id: 'old', description: 'Tuition 2026', amount: { amount_minor: 120_000, currency: 'KES' } }),
        line({ id: 'current-line', invoice_id: 'current', description: 'Tuition 2027', amount: { amount_minor: 150_000, currency: 'KES' } }),
        line({ id: 'next-line', invoice_id: 'next', description: 'Transport 2027', amount: { amount_minor: 400_000, currency: 'KES' } }),
      ],
      payments: [payment({ id: 'next-payment' })],
      allocations: [
        allocation({
          id: 'next-allocation',
          payment_id: 'next-payment',
          invoice_id: 'next',
          amount: { amount_minor: 25_000, currency: 'KES' },
        }),
      ],
    });

    expect(statement.rows.map((row) => row.description)).toEqual(['Tuition 2027']);
    expect(statement.openingBalanceMinor).toBe(120_000);
    expect(statement.totals.debitMinor).toBe(150_000);
    expect(statement.totals.creditMinor).toBe(0);
    expect(statement.closingBalanceMinor).toBe(270_000);
  });

  it('keeps a running balance from the opening balance through every entry', () => {
    const statement = build({
      invoices: [
        invoice({
          id: 'old',
          academic_period_id: PRIOR_PERIOD,
          issue_date: '2026-11-01',
          total: { amount_minor: 1_000, currency: 'KES' },
        }),
        invoice({ id: 'a', number: 'INV-A', issue_date: '2027-01-10' }),
        invoice({ id: 'b', number: 'INV-B', issue_date: '2027-01-11' }),
      ],
      invoiceLines: [
        line({ id: 'old-line', invoice_id: 'old', amount: { amount_minor: 1_000, currency: 'KES' } }),
        line({ id: 'a-line', invoice_id: 'a', amount: { amount_minor: 5_000, currency: 'KES' } }),
        line({ id: 'b-line', invoice_id: 'b', amount: { amount_minor: 2_000, currency: 'KES' } }),
      ],
      payments: [payment({ id: 'p-a' }), payment({ id: 'p-b' })],
      allocations: [
        allocation({
          id: 'a-allocation',
          payment_id: 'p-a',
          invoice_id: 'a',
          amount: { amount_minor: 1_500, currency: 'KES' },
          allocated_at: '2027-01-20T09:00:00Z',
        }),
        allocation({
          id: 'b-allocation',
          payment_id: 'p-b',
          invoice_id: 'b',
          amount: { amount_minor: 500, currency: 'KES' },
          allocated_at: '2027-01-21T09:00:00Z',
        }),
      ],
      creditNotes: [
        creditNote({
          id: 'current-credit',
          amount: { amount_minor: 300, currency: 'KES' },
          issue_date: '2027-01-22',
        }),
      ],
    });

    expect(statement.openingBalanceMinor).toBe(1_000);
    expect(statement.rows.map((row) => row.balanceMinor)).toEqual([6_000, 8_000, 6_500, 6_000, 5_700]);
    expect(statement.rows.at(-1)?.balanceMinor).toBe(statement.closingBalanceMinor);
    expect(statement.totals).toEqual({ debitMinor: 7_000, creditMinor: 2_300 });
    expect(statement.closingBalanceMinor).toBe(5_700);
  });

  it('excludes void and draft invoices, their lines and the allocations posted to them', () => {
    const statement = build({
      invoices: [
        invoice({
          id: 'posted',
          number: 'INV-100',
          issue_date: '2027-01-10',
          total: { amount_minor: 100_000, currency: 'KES' },
        }),
        invoice({
          id: 'void',
          number: 'INV-VOID',
          status: 'void',
          issue_date: '2027-01-11',
          total: { amount_minor: 999_999, currency: 'KES' },
        }),
        invoice({
          id: 'draft',
          number: 'INV-DRAFT',
          status: 'draft',
          issue_date: '2027-01-12',
          total: { amount_minor: 888_888, currency: 'KES' },
        }),
      ],
      invoiceLines: [
        line({ id: 'posted-line', invoice_id: 'posted', description: 'Tuition', amount: { amount_minor: 100_000, currency: 'KES' } }),
        line({ id: 'void-line', invoice_id: 'void', description: 'Void line', amount: { amount_minor: 999_999, currency: 'KES' } }),
        line({ id: 'draft-line', invoice_id: 'draft', description: 'Draft line', amount: { amount_minor: 888_888, currency: 'KES' } }),
      ],
      payments: [payment({ id: 'void-payment' })],
      allocations: [
        allocation({
          id: 'void-allocation',
          payment_id: 'void-payment',
          invoice_id: 'void',
          amount: { amount_minor: 10_000, currency: 'KES' },
        }),
      ],
      creditNotes: [
        creditNote({ id: 'void-credit', status: 'void', amount: { amount_minor: 5_000, currency: 'KES' } }),
        creditNote({ id: 'draft-credit', status: 'draft', amount: { amount_minor: 6_000, currency: 'KES' } }),
      ],
    });

    expect(statement.rows).toHaveLength(1);
    expect(statement.rows[0]).toMatchObject({ description: 'Tuition', debitMinor: 100_000 });
    expect(statement.totals).toEqual({ debitMinor: 100_000, creditMinor: 0 });
    expect(statement.closingBalanceMinor).toBe(100_000);
  });

  it('credits an allocation but not a payment that was never allocated', () => {
    const withoutAllocation = build({
      invoices: [invoice({ id: 'current', number: 'INV-100', total: { amount_minor: 100_000, currency: 'KES' } })],
      invoiceLines: [
        line({ id: 'current-line', invoice_id: 'current', amount: { amount_minor: 100_000, currency: 'KES' } }),
      ],
      payments: [payment({ id: 'unallocated', reference: 'MPESA-UNALLOCATED' })],
    });

    expect(withoutAllocation.rows).toHaveLength(1);
    expect(withoutAllocation.totals.creditMinor).toBe(0);

    const withAllocation = build({
      invoices: [invoice({ id: 'current', number: 'INV-100', total: { amount_minor: 100_000, currency: 'KES' } })],
      invoiceLines: [
        line({ id: 'current-line', invoice_id: 'current', amount: { amount_minor: 100_000, currency: 'KES' } }),
      ],
      payments: [payment({ id: 'allocated', reference: 'MPESA-ALLOCATED' })],
      allocations: [
        allocation({
          id: 'allocation',
          payment_id: 'allocated',
          invoice_id: 'current',
          amount: { amount_minor: 20_000, currency: 'KES' },
        }),
      ],
    });

    expect(withAllocation.rows).toHaveLength(2);
    expect(withAllocation.rows[1]).toMatchObject({
      date: '2027-01-20',
      description: 'Payment received (mobile money)',
      reference: 'MPESA-ALLOCATED',
      debitMinor: 0,
      creditMinor: 20_000,
      balanceMinor: 80_000,
    });
    expect(withAllocation.totals).toEqual({ debitMinor: 100_000, creditMinor: 20_000 });
    expect(withAllocation.closingBalanceMinor).toBe(80_000);
  });

  it('orders entries by date and then reference', () => {
    const statement = build({
      invoices: [
        invoice({ id: 'b', number: 'INV-B', issue_date: '2027-01-10' }),
        invoice({ id: 'a', number: 'INV-A', issue_date: '2027-01-10' }),
      ],
      invoiceLines: [
        line({ id: 'b-line', invoice_id: 'b', amount: { amount_minor: 2_000, currency: 'KES' } }),
        line({ id: 'a-line', invoice_id: 'a', amount: { amount_minor: 1_000, currency: 'KES' } }),
      ],
    });

    expect(statement.rows.map((row) => row.reference)).toEqual(['INV-A', 'INV-B']);
  });

  it('refuses an amount that is not whole minor units', () => {
    expect(() =>
      build({
        invoices: [invoice({ id: 'current' })],
        invoiceLines: [
          line({
            id: 'fractional',
            invoice_id: 'current',
            amount: { amount_minor: 1_000.5, currency: 'KES' },
          }),
        ],
      })
    ).toThrow(/whole minor units/i);
  });
});
