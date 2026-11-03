// ABOUTME: The learner position behind the financial summary and the cashier: collected money counts
// ABOUTME: in full, a learner's credit is stated, and the balance equals the statement's closing figure.

import { describe, expect, it } from 'vitest';

import { buildLearnerPositions, positionOf } from '../learnerPosition';

const money = (amountMinor: number) => ({ amount_minor: amountMinor, currency: 'KES' });

const invoice = (id: string, learner: string, amountMinor: number, status = 'posted') => ({
  id,
  learnerId: learner,
  status,
  total: money(amountMinor),
});

const payment = (id: string, learner: string, amountMinor: number, status = 'posted') => ({
  id,
  learnerId: learner,
  status,
  amount: money(amountMinor),
});

const allocation = (paymentId: string, amountMinor: number) => ({
  paymentId,
  amount: money(amountMinor),
});

const note = (learner: string | null, amountMinor: number, status = 'posted') => ({
  learner_id: learner,
  status,
  amount: money(amountMinor),
});

describe('a learner position', () => {
  it('counts an overpayment in collected and states the credit the school holds', () => {
    const positions = buildLearnerPositions({
      invoiceRows: [invoice('i1', 'L', 100_000)],
      paymentRows: [payment('p1', 'L', 150_000)],
      allocationRows: [allocation('p1', 100_000)],
      creditNotes: [],
    });

    expect(positionOf(positions, 'L')).toEqual({
      billed: 100_000,
      collected: 150_000,
      creditNotes: 0,
      credit: 50_000,
      balance: -50_000,
    });
  });

  it('treats allocations above the bill as credit without double counting them', () => {
    const positions = buildLearnerPositions({
      invoiceRows: [invoice('i1', 'L', 100_000)],
      paymentRows: [payment('p1', 'L', 120_000)],
      allocationRows: [allocation('p1', 120_000)],
      creditNotes: [],
    });

    expect(positionOf(positions, 'L')).toMatchObject({
      collected: 120_000,
      credit: 20_000,
      balance: -20_000,
    });
  });

  it('states unallocated credit while the learner still owes on another invoice', () => {
    const positions = buildLearnerPositions({
      invoiceRows: [invoice('i1', 'L', 100_000)],
      paymentRows: [payment('p1', 'L', 60_000)],
      allocationRows: [allocation('p1', 40_000)],
      creditNotes: [],
    });

    expect(positionOf(positions, 'L')).toMatchObject({
      collected: 60_000,
      credit: 20_000,
      balance: 40_000,
    });
  });

  it('nets a posted credit note into the balance, and an unpaid note into credit', () => {
    const positions = buildLearnerPositions({
      invoiceRows: [invoice('i1', 'L', 100_000)],
      paymentRows: [payment('p1', 'L', 100_000)],
      allocationRows: [allocation('p1', 100_000)],
      creditNotes: [note('L', 20_000)],
    });

    expect(positionOf(positions, 'L')).toMatchObject({
      creditNotes: 20_000,
      credit: 20_000,
      balance: -20_000,
    });
  });

  it('leaves a normal partly-paid learner with no credit', () => {
    const positions = buildLearnerPositions({
      invoiceRows: [invoice('i1', 'L', 100_000)],
      paymentRows: [payment('p1', 'L', 40_000)],
      allocationRows: [allocation('p1', 40_000)],
      creditNotes: [],
    });

    expect(positionOf(positions, 'L')).toEqual({
      billed: 100_000,
      collected: 40_000,
      creditNotes: 0,
      credit: 0,
      balance: 60_000,
    });
  });

  it('ignores a draft invoice, a pending payment and a draft credit note', () => {
    const positions = buildLearnerPositions({
      invoiceRows: [invoice('i1', 'L', 100_000, 'draft'), invoice('i2', 'L', 50_000)],
      paymentRows: [payment('p1', 'L', 30_000, 'pending'), payment('p2', 'L', 20_000)],
      allocationRows: [allocation('p2', 20_000)],
      creditNotes: [note('L', 5_000, 'draft')],
    });

    expect(positionOf(positions, 'L')).toMatchObject({
      billed: 50_000,
      collected: 20_000,
      creditNotes: 0,
      balance: 30_000,
    });
  });

  it('returns the zero position for a learner with no documents', () => {
    expect(positionOf(buildLearnerPositions({
      invoiceRows: [],
      paymentRows: [],
      allocationRows: [],
      creditNotes: [],
    }), 'missing')).toEqual({
      billed: 0,
      collected: 0,
      creditNotes: 0,
      credit: 0,
      balance: 0,
    });
  });
});
