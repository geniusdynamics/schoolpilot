// ABOUTME: Table tests for the four allocation strategies: hand-computed plans for oldest-first,
// ABOUTME: vote-head priority and proportional, the smallest-invoice case, and the trace each carries.

import { fromMinor } from '@/domain/money';
import { describe, expect, it } from 'vitest';

import { planAllocation, applyAllocationPlan } from '..';
import { KES, allocatedTo, distribution, line, priorityLookup } from './fixtures';

const payment = (minor: number) => ({
  source: { id: 'pay-1', kind: 'payment' as const, amount: KES(minor), learnerId: 'lrn-1' },
});

describe('oldest_first fills the oldest line first', () => {
  const items = [
    line({ id: 'a', balance: 300, issuedOn: '2027-01-10' }),
    line({ id: 'b', balance: 200, issuedOn: '2027-01-05' }),
    line({ id: 'c', balance: 100, issuedOn: '2027-01-15' }),
  ];

  it('fills every line and leaves the exact excess when the payment covers the debt', () => {
    const plan = planAllocation({ ...payment(1000), items });
    expect(distribution(plan)).toEqual([
      { itemId: 'b', minor: 200 },
      { itemId: 'a', minor: 300 },
      { itemId: 'c', minor: 100 },
    ]);
    expect(plan.allocated.amount_minor).toBe(600);
    expect(plan.allocatedFromPayment.amount_minor).toBe(600);
    expect(plan.unallocated.amount_minor).toBe(400);
  });

  it('caps the line it runs out of money on and leaves nothing unallocated', () => {
    const plan = planAllocation({ ...payment(250), items });
    expect(distribution(plan)).toEqual([
      { itemId: 'b', minor: 200 },
      { itemId: 'a', minor: 50 },
    ]);
    expect(plan.unallocated.amount_minor).toBe(0);
  });

  it('gives a payment smaller than the smallest invoice wholly to the oldest line', () => {
    const plan = planAllocation({ ...payment(50), items: [line({ id: 'only', balance: 200 })] });
    expect(plan.allocations).toHaveLength(1);
    expect(plan.allocations[0].itemId).toBe('only');
    expect(plan.allocations[0].amount.amount_minor).toBe(50);
    expect(plan.allocations[0].reason.capped).toBe(true);
    expect(plan.unallocated.amount_minor).toBe(0);
  });

  it('breaks a tie on the due date, then the line order, and says which', () => {
    const plan = planAllocation({
      ...payment(1000),
      items: [
        line({ id: 'late', balance: 10, issuedOn: '2027-01-05', dueOn: '2027-03-01', sequence: 0 }),
        line({ id: 'soon', balance: 10, issuedOn: '2027-01-05', dueOn: '2027-02-01', sequence: 1 }),
      ],
    });
    expect(distribution(plan).map((entry) => entry.itemId)).toEqual(['soon', 'late']);
    expect(plan.allocations[1].reason.tieBreak).toBe('due_date');
  });

  it('breaks a tie on the item id when the invoice, dates and line order all match', () => {
    const plan = planAllocation({
      ...payment(1000),
      items: [
        line({ id: 'z', balance: 10, issuedOn: '2027-01-05', sequence: 0 }),
        line({ id: 'a', balance: 10, issuedOn: '2027-01-05', sequence: 0 }),
      ],
    });
    expect(distribution(plan).map((entry) => entry.itemId)).toEqual(['a', 'z']);
    expect(plan.allocations[1].reason.tieBreak).toBe('item_id');
  });

  it('plans nothing when the learner has no outstanding line', () => {
    const plan = planAllocation({ ...payment(1000), items: [] });
    expect(plan.allocations).toEqual([]);
    expect(plan.allocated.amount_minor).toBe(0);
    expect(plan.unallocated.amount_minor).toBe(1000);
  });
});

describe('vote_head_priority follows the fee items declared order', () => {
  it('fills the lower priority number first, the oldest invoice breaking a tie', () => {
    const items = [
      line({ id: 'transport', balance: 100, feeItemId: 'transport', issuedOn: '2027-01-01' }),
      line({ id: 'tuition', balance: 300, feeItemId: 'tuition', issuedOn: '2027-01-10' }),
      line({ id: 'activity', balance: 200, feeItemId: 'activity', issuedOn: '2027-01-05' }),
    ];
    const plan = planAllocation({
      ...payment(250),
      items,
      options: {
        strategy: 'vote_head_priority',
        voteHeadPriority: priorityLookup({ tuition: 1, activity: 2, transport: 3 }),
      },
    });
    expect(distribution(plan)).toEqual([
      { itemId: 'tuition', minor: 250 },
    ]);
    expect(plan.allocations[0].reason.ordering).toBe('vote_head_priority');
    expect(plan.allocations[0].reason.capped).toBe(true);
  });

  it('runs an item with no declared priority after every item that has one', () => {
    const plan = planAllocation({
      ...payment(1000),
      items: [
        line({ id: 'unranked', balance: 10, feeItemId: null, issuedOn: '2027-01-01' }),
        line({ id: 'ranked', balance: 10, feeItemId: 'tuition', issuedOn: '2027-06-01' }),
      ],
      options: { strategy: 'vote_head_priority', voteHeadPriority: priorityLookup({ tuition: 9 }) },
    });
    expect(distribution(plan).map((entry) => entry.itemId)).toEqual(['ranked', 'unranked']);
    expect(plan.allocations[1].reason.tieBreak).toBe('vote_head_priority');
  });

  it('refuses the strategy without a priority lookup', () => {
    expect(() =>
      planAllocation({
        ...payment(100),
        items: [line({ id: 'a', balance: 100, feeItemId: 'tuition' })],
        options: { strategy: 'vote_head_priority' },
      })
    ).toThrowError(expect.objectContaining({ code: 'missing_priority_lookup' }));
  });
});

describe('proportional splits in proportion to the balances', () => {
  it('gives each line its share and the odd unit to the largest remainder', () => {
    const plan = planAllocation({
      ...payment(100),
      items: [
        line({ id: 'a', balance: 200 }),
        line({ id: 'b', balance: 300 }),
        line({ id: 'c', balance: 100 }),
      ],
      options: { strategy: 'proportional' },
    });
    expect(distribution(plan)).toEqual([
      { itemId: 'a', minor: 33 },
      { itemId: 'b', minor: 50 },
      { itemId: 'c', minor: 17 },
    ]);
    expect(plan.allocated.amount_minor).toBe(100);
    const c = plan.allocations.find((allocation) => allocation.itemId === 'c');
    expect(c?.reason.tieBreak).toBe('largest_remainder');
    expect(c?.reason.weightMinor).toBe(100);
    expect(c?.reason.weightSumMinor).toBe(600);
  });

  it('sums exactly across three equal balances, where the share is a repeating decimal', () => {
    const plan = planAllocation({
      ...payment(100),
      items: [
        line({ id: 'a', balance: 100 }),
        line({ id: 'b', balance: 100 }),
        line({ id: 'c', balance: 100 }),
      ],
      options: { strategy: 'proportional' },
    });
    expect(distribution(plan)).toEqual([
      { itemId: 'a', minor: 34 },
      { itemId: 'b', minor: 33 },
      { itemId: 'c', minor: 33 },
    ]);
    expect(plan.allocated.amount_minor).toBe(100);
  });

  it('places only the debt and leaves the excess when the payment is larger', () => {
    const plan = planAllocation({
      ...payment(1000),
      items: [line({ id: 'a', balance: 200 }), line({ id: 'b', balance: 300 })],
      options: { strategy: 'proportional' },
    });
    expect(distribution(plan)).toEqual([
      { itemId: 'a', minor: 200 },
      { itemId: 'b', minor: 300 },
    ]);
    expect(plan.unallocated.amount_minor).toBe(500);
  });
});

describe('a plan is deterministic and carries its trace', () => {
  it('gives the same plan for the same input', () => {
    const input = {
      ...payment(250),
      items: [line({ id: 'a', balance: 300, issuedOn: '2027-01-10' }), line({ id: 'b', balance: 200 })],
    };
    expect(planAllocation(input)).toEqual(planAllocation(input));
  });

  it('explains the strategy, the ordering, the tie-break and the cap in the trace', () => {
    const plan = planAllocation({
      ...payment(250),
      items: [line({ id: 'a', balance: 300, issuedOn: '2027-01-10' }), line({ id: 'b', balance: 200 })],
    });
    const messages = plan.trace.map((entry) => entry.message).join('\n');
    expect(messages).toContain('oldest_first over 2 outstanding line(s)');
    expect(messages).toContain('ordered by invoice_date');
    expect(messages).toContain('clears the line');
    expect(messages).toContain('capped at the line balance');
    expect(plan.trace[0].code).toBe('strategy');
  });
});

describe('the engine refuses impossible input', () => {
  it('refuses a negative payment amount', () => {
    expect(() => planAllocation({ ...payment(-1), items: [line({ id: 'a', balance: 10 })] })).toThrowError(
      expect.objectContaining({ code: 'negative_amount' })
    );
  });

  it('refuses a negative line balance', () => {
    expect(() =>
      planAllocation({ ...payment(100), items: [line({ id: 'a', balance: -10 })] })
    ).toThrowError(expect.objectContaining({ code: 'negative_balance' }));
  });

  it('refuses a line in another currency', () => {
    expect(() =>
      planAllocation({
        ...payment(100),
        items: [line({ id: 'a', balance: 10, currency: 'UGX' })],
      })
    ).toThrowError(expect.objectContaining({ code: 'currency_mismatch' }));
  });

  it('ignores a settled line and a zero credit', () => {
    const plan = planAllocation({
      ...payment(100),
      items: [line({ id: 'settled', balance: 0 }), line({ id: 'a', balance: 50 })],
      credits: [{ id: 'c0', kind: 'credit_note', amount: KES(0) }],
    });
    expect(allocatedTo(plan, 'settled')).toBe(0);
    expect(plan.allocations.map((allocation) => allocation.itemId)).toEqual(['a']);
    expect(plan.credits).toEqual([]);
  });
});

describe('applyAllocationPlan reduces the lines and refuses a second application', () => {
  it('clears the lines the plan covered', () => {
    const items = [line({ id: 'a', balance: 300 }), line({ id: 'b', balance: 200 })];
    const plan = planAllocation({ ...payment(200), items });
    const after = applyAllocationPlan(items, plan);
    expect(after.find((item) => item.id === 'a')?.balance.amount_minor).toBe(100);
    expect(after.find((item) => item.id === 'b')?.balance.amount_minor).toBe(200);
  });

  it('refuses to apply the same plan twice when it would over-allocate a line', () => {
    const items = [line({ id: 'a', balance: 300 }), line({ id: 'b', balance: 200 })];
    const plan = planAllocation({ ...payment(200), items });
    const once = applyAllocationPlan(items, plan);
    expect(() => applyAllocationPlan(once, plan)).toThrowError(
      expect.objectContaining({ code: 'plan_exceeds_balance' })
    );
  });

  it('clears a fully-covered line and refuses a second application', () => {
    const items = [line({ id: 'a', balance: 200 })];
    const plan = planAllocation({ ...payment(200), items });
    const once = applyAllocationPlan(items, plan);
    expect(once[0].balance.amount_minor).toBe(0);
    expect(() => applyAllocationPlan(once, plan)).toThrowError(
      expect.objectContaining({ code: 'plan_exceeds_balance' })
    );
  });

  it('is idempotent for a plan that allocated nothing', () => {
    const items = [line({ id: 'a', balance: 300 })];
    const plan = planAllocation({ ...payment(0), items });
    const once = applyAllocationPlan(items, plan);
    expect(applyAllocationPlan(once, plan)).toEqual(once);
  });

  it('never allocates a payment of zero', () => {
    const plan = planAllocation({ ...payment(0), items: [line({ id: 'a', balance: 300 })] });
    expect(plan.allocations).toEqual([]);
    expect(plan.unallocated.amount_minor).toBe(0);
  });

  it('keeps the payment in the plan for the caller to reuse', () => {
    const plan = planAllocation({ ...payment(500), items: [line({ id: 'a', balance: 300 })] });
    expect(plan.source.amount).toEqual(fromMinor(500, 'KES'));
  });
});
