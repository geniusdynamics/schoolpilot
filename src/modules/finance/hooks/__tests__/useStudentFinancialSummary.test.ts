// ABOUTME: Proves a learner's row reads the same as their statement: a fine is not counted twice, an
// ABOUTME: unallocated payment is credit, and the balance is the statement's closing figure.

import { describe, expect, it } from 'vitest';

import { toSummaryRow } from '../useStudentFinancialSummary';

const learner = {
  id: 'learner-1',
  admission_number: 'ADM/2026/001',
  preferred_name: null,
  given_name: 'Amani',
  family_name: 'Wekesa',
};

describe('one learner row of the financial summary', () => {
  it('counts a fine once, because a fine is written as its own invoice', () => {
    // Billed 13,000 includes the 500 fine invoice; the fine is reported beside it, not added again.
    const row = toSummaryRow({
      learner,
      className: 'Grade 7 · East',
      position: { billed: 1_300_000, collected: 0, creditNotes: 0, credit: 0, balance: 1_300_000 },
      penalties: 50_000,
      earliestDueDate: '2026-02-01',
    });
    expect(row.feeAmount).toBe(1_300_000);
    expect(row.feePenalty).toBe(50_000);
    expect(row.balance).toBe(1_300_000);
  });

  it('shows an unallocated payment as money held, with the balance below zero', () => {
    const row = toSummaryRow({
      learner,
      className: null,
      position: { billed: 1_000_000, collected: 1_250_000, creditNotes: 0, credit: 250_000, balance: -250_000 },
      penalties: 0,
      earliestDueDate: null,
    });
    expect(row.amountPaid).toBe(1_250_000);
    expect(row.balance).toBe(-250_000);
    expect(row.overpay).toBe(250_000);
  });

  it('takes posted credit notes off the balance, not off the payments', () => {
    const row = toSummaryRow({
      learner,
      className: null,
      position: { billed: 800_000, collected: 300_000, creditNotes: 100_000, credit: 0, balance: 400_000 },
      penalties: 0,
      earliestDueDate: '2026-03-01',
    });
    expect(row.feeExemption).toBe(100_000);
    expect(row.balance).toBe(400_000);
  });

  it('names the learner the way a register does, preferring the name they use', () => {
    const row = toSummaryRow({
      learner: { ...learner, preferred_name: 'Ama' },
      className: null,
      position: { billed: 0, collected: 0, creditNotes: 0, credit: 0, balance: 0 },
      penalties: 0,
      earliestDueDate: null,
    });
    expect(row.name).toBe('Ama Wekesa');
  });
});
