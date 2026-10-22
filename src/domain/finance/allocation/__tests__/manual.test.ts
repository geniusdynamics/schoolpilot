// ABOUTME: Tests for the manual strategy: every validation refusal, and each remainder policy
// ABOUTME: (leave unallocated, refuse, one named line, or spill into another strategy).

import { describe, expect, it } from 'vitest';

import { planAllocation, type ManualPlan } from '..';
import { KES, distribution, line } from './fixtures';

const items = [line({ id: 'a', balance: 300 }), line({ id: 'b', balance: 200 })];

const manual = (minor: number, plan: ManualPlan) =>
  planAllocation({
    source: { id: 'pay-1', kind: 'payment', amount: KES(minor), learnerId: 'lrn-1' },
    items,
    options: { strategy: 'manual', manual: plan },
  });

const refusal = (work: () => unknown) => {
  try {
    work();
    return null;
  } catch (error) {
    return error as { code?: string };
  }
};

describe('a manual plan places exactly what it names', () => {
  it('places the named amounts and leaves the stated remainder unallocated', () => {
    const plan = manual(200, {
      allocations: [
        { itemId: 'a', amount: KES(100) },
        { itemId: 'b', amount: KES(50) },
      ],
      remainder: { kind: 'leave_unallocated' },
    });
    expect(distribution(plan)).toEqual([
      { itemId: 'a', minor: 100 },
      { itemId: 'b', minor: 50 },
    ]);
    expect(plan.unallocated.amount_minor).toBe(50);
    expect(plan.allocations.every((allocation) => allocation.reason.ordering === 'manual')).toBe(true);
  });

  it('leaves nothing unallocated when the instructions cover the payment', () => {
    const plan = manual(150, {
      allocations: [
        { itemId: 'a', amount: KES(100) },
        { itemId: 'b', amount: KES(50) },
      ],
      remainder: { kind: 'refuse' },
    });
    expect(plan.unallocated.amount_minor).toBe(0);
  });
});

describe('the remainder policies', () => {
  it('refuses a remainder when the plan says refuse', () => {
    expect(
      refusal(() =>
        manual(200, {
          allocations: [{ itemId: 'a', amount: KES(100) }],
          remainder: { kind: 'refuse' },
        })
      )?.code
    ).toBe('manual_remainder');
  });

  it('gives the remainder to one named line', () => {
    const plan = manual(200, {
      allocations: [{ itemId: 'b', amount: KES(50) }],
      remainder: { kind: 'to_item', itemId: 'a' },
    });
    expect(distribution(plan)).toEqual([
      { itemId: 'b', minor: 50 },
      { itemId: 'a', minor: 150 },
    ]);
    expect(plan.unallocated.amount_minor).toBe(0);
  });

  it('refuses a remainder a named line cannot take', () => {
    expect(
      refusal(() =>
        manual(400, {
          allocations: [{ itemId: 'a', amount: KES(100) }],
          remainder: { kind: 'to_item', itemId: 'b' },
        })
      )?.code
    ).toBe('manual_remainder_item');
  });

  it('spills the remainder into another strategy over the lines still owing', () => {
    const plan = manual(200, {
      allocations: [{ itemId: 'b', amount: KES(50) }],
      remainder: { kind: 'spill', strategy: 'oldest_first' },
    });
    // b keeps 50; the remaining 150 goes to the oldest line still owing (a, by id tie-break).
    expect(distribution(plan)).toEqual([
      { itemId: 'b', minor: 50 },
      { itemId: 'a', minor: 150 },
    ]);
    expect(plan.unallocated.amount_minor).toBe(0);
  });

  it('refuses to spill into another manual plan', () => {
    expect(
      refusal(() =>
        manual(200, {
          allocations: [{ itemId: 'b', amount: KES(50) }],
          remainder: { kind: 'spill', strategy: 'manual' },
        })
      )?.code
    ).toBe('unknown_strategy');
  });
});

describe('manual instructions are validated', () => {
  it('refuses an item that is not outstanding', () => {
    expect(
      refusal(() =>
        manual(100, { allocations: [{ itemId: 'zzz', amount: KES(10) }], remainder: { kind: 'leave_unallocated' } })
      )?.code
    ).toBe('unknown_item');
  });

  it('refuses the same item twice', () => {
    expect(
      refusal(() =>
        manual(100, {
          allocations: [
            { itemId: 'a', amount: KES(10) },
            { itemId: 'a', amount: KES(10) },
          ],
          remainder: { kind: 'leave_unallocated' },
        })
      )?.code
    ).toBe('duplicate_item');
  });

  it('refuses a zero or negative amount', () => {
    expect(
      refusal(() =>
        manual(100, { allocations: [{ itemId: 'a', amount: KES(0) }], remainder: { kind: 'leave_unallocated' } })
      )?.code
    ).toBe('non_positive_amount');
  });

  it('refuses an amount beyond its line balance', () => {
    expect(
      refusal(() =>
        manual(1000, { allocations: [{ itemId: 'a', amount: KES(400) }], remainder: { kind: 'leave_unallocated' } })
      )?.code
    ).toBe('manual_exceeds_item');
  });

  it('refuses instructions that together exceed the payment', () => {
    expect(
      refusal(() =>
        manual(100, {
          allocations: [
            { itemId: 'a', amount: KES(80) },
            { itemId: 'b', amount: KES(80) },
          ],
          remainder: { kind: 'leave_unallocated' },
        })
      )?.code
    ).toBe('manual_exceeds_payment');
  });

  it('refuses the manual strategy without a manual plan', () => {
    expect(
      refusal(() =>
        planAllocation({
          source: { id: 'pay-1', kind: 'payment', amount: KES(100), learnerId: 'lrn-1' },
          items,
          options: { strategy: 'manual' },
        })
      )?.code
    ).toBe('missing_manual_plan');
  });

  it('refuses an unknown strategy', () => {
    expect(
      refusal(() =>
        planAllocation({
          source: { id: 'pay-1', kind: 'payment', amount: KES(100), learnerId: 'lrn-1' },
          items,
          options: { strategy: 'newest_first' as never },
        })
      )?.code
    ).toBe('unknown_strategy');
  });
});
