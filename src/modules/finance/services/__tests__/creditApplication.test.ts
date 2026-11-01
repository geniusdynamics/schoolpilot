// ABOUTME: Tests the prepayment plan: priority, oldest-first and proportional application of a
// ABOUTME: learner's unallocated payments to outstanding invoices, with exact minor-unit amounts.

import { describe, expect, it } from 'vitest';

import { planCreditApplication } from '../creditApplication';

const invoices = [
  { id: 'invoice-old', issueDate: '2026-12-01', totalMinor: 100_000, paidMinor: 0, priority: 2 },
  { id: 'invoice-new', issueDate: '2027-01-01', totalMinor: 80_000, paidMinor: 20_000, priority: 1 },
  { id: 'invoice-paid', issueDate: '2026-11-01', totalMinor: 50_000, paidMinor: 50_000, priority: 1 },
];

const payments = [
  { id: 'payment-old', receivedAt: '2026-12-15T09:00:00.000Z', amountMinor: 60_000, allocatedMinor: 0 },
  { id: 'payment-new', receivedAt: '2027-01-10T09:00:00.000Z', amountMinor: 40_000, allocatedMinor: 10_000 },
];

describe('planCreditApplication', () => {
  it('pays the lowest vote-head priority first', () => {
    const plan = planCreditApplication({ invoices, payments, strategy: 'vote_head_priority' });

    expect(plan.appliedMinor).toBe(90_000);
    expect(plan.allocations).toEqual([
      { paymentId: 'payment-old', invoiceId: 'invoice-new', amountMinor: 60_000 },
      { paymentId: 'payment-new', invoiceId: 'invoice-old', amountMinor: 30_000 },
    ]);
  });

  it('pays the oldest invoice first when asked', () => {
    const plan = planCreditApplication({ invoices, payments, strategy: 'oldest_first' });

    expect(plan.allocations[0]).toEqual({
      paymentId: 'payment-old',
      invoiceId: 'invoice-old',
      amountMinor: 60_000,
    });
    expect(plan.appliedMinor).toBe(90_000);
  });

  it('splits proportionally across the outstanding balances', () => {
    const plan = planCreditApplication({ invoices, payments, strategy: 'proportional' });

    const byInvoice = new Map<string, number>();
    for (const allocation of plan.allocations) {
      byInvoice.set(allocation.invoiceId, (byInvoice.get(allocation.invoiceId) ?? 0) + allocation.amountMinor);
    }
    expect(byInvoice.get('invoice-old')).toBe(56_250);
    expect(byInvoice.get('invoice-new')).toBe(33_750);
    expect(plan.appliedMinor).toBe(90_000);
  });

  it('leaves the money unapplied when nothing is outstanding', () => {
    const plan = planCreditApplication({
      invoices: [{ id: 'paid', issueDate: '2026-01-01', totalMinor: 100, paidMinor: 100, priority: null }],
      payments,
      strategy: 'vote_head_priority',
    });
    expect(plan.allocations).toEqual([]);
    expect(plan.appliedMinor).toBe(0);
    expect(plan.unappliedMinor).toBe(90_000);
  });
});
