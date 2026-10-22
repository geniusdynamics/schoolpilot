// ABOUTME: Tests for credits: a plan consumes an incoming payment and existing credits in the stated
// ABOUTME: order, reports what it applied and what it left, and keeps the payment's own remainder.

import { describe, expect, it } from 'vitest';

import { planAllocation } from '..';
import { KES, distribution, line } from './fixtures';

const items = [line({ id: 'a', balance: 300 })];

const plan = (creditOrder: 'payment_first' | 'credit_first') =>
  planAllocation({
    source: { id: 'pay-1', kind: 'payment', amount: KES(100), learnerId: 'lrn-1' },
    items,
    credits: [{ id: 'cn-1', kind: 'credit_note', amount: KES(500), learnerId: 'lrn-1' }],
    options: { creditOrder },
  });

describe('the payment is consumed before credits by default', () => {
  const subject = plan('payment_first');

  it('applies the payment first, then the credit for the rest', () => {
    expect(distribution(subject)).toEqual([{ itemId: 'a', minor: 300 }]);
    expect(subject.allocatedFromPayment.amount_minor).toBe(100);
    expect(subject.allocatedFromCredits.amount_minor).toBe(200);
    expect(subject.unallocated.amount_minor).toBe(0);
  });

  it('reports the credit applied and the credit left', () => {
    expect(subject.credits).toEqual([
      { id: 'cn-1', kind: 'credit_note', available: KES(500), applied: KES(200) },
    ]);
    expect(subject.unusedCredits).toEqual([
      { id: 'cn-1', kind: 'credit_note', available: KES(500), applied: KES(200) },
    ]);
  });

  it('funds each allocation line from the source that paid it', () => {
    const sources = subject.allocations.map((allocation) => [allocation.sourceKind, allocation.sourceId]);
    expect(sources).toEqual([
      ['payment', 'pay-1'],
      ['credit', 'cn-1'],
    ]);
  });
});

describe('credits can be consumed first', () => {
  const subject = plan('credit_first');

  it('drains the credit before touching the payment, so the payment stays unallocated', () => {
    expect(subject.allocatedFromCredits.amount_minor).toBe(300);
    expect(subject.allocatedFromPayment.amount_minor).toBe(0);
    expect(subject.unallocated.amount_minor).toBe(100);
  });

  it('applies only what the debt needs and leaves the rest of the credit', () => {
    expect(subject.credits[0].applied.amount_minor).toBe(300);
    expect(subject.unusedCredits[0].applied.amount_minor).toBe(300);
  });
});

describe('credits are conserved', () => {
  it('accounts for every credit minor unit as applied or unused', () => {
    const subject = planAllocation({
      source: { id: 'pay-1', kind: 'payment', amount: KES(100), learnerId: 'lrn-1' },
      items: [line({ id: 'a', balance: 300 })],
      credits: [
        { id: 'cn-1', kind: 'credit_note', amount: KES(120) },
        { id: 'cn-2', kind: 'overpayment', amount: KES(50) },
      ],
      options: { creditOrder: 'credit_first' },
    });
    const provided = 120 + 50;
    const applied = subject.credits.reduce((total, credit) => total + credit.applied.amount_minor, 0);
    const left = subject.unusedCredits.reduce(
      (total, credit) => total + (credit.available.amount_minor - credit.applied.amount_minor),
      0
    );
    expect(applied + left).toBe(provided);
    expect(subject.allocatedFromCredits.amount_minor).toBe(applied);
  });

  it('ignores credits when nothing is owed, leaving the payment whole', () => {
    const subject = planAllocation({
      source: { id: 'pay-1', kind: 'payment', amount: KES(100), learnerId: 'lrn-1' },
      items: [],
      credits: [{ id: 'cn-1', kind: 'credit_note', amount: KES(500) }],
    });
    expect(subject.allocations).toEqual([]);
    expect(subject.allocatedFromCredits.amount_minor).toBe(0);
    expect(subject.unallocated.amount_minor).toBe(100);
    expect(subject.unusedCredits[0].applied.amount_minor).toBe(0);
  });
});
