// ABOUTME: Tests for the household split: one payment divided across siblings by rule, each sibling
// ABOUTME: planned on its own lines and credits, and the per-learner split reported.

import { describe, expect, it } from 'vitest';

import { planHouseholdAllocation } from '..';
import { KES, line } from './fixtures';

const members = [
  { learnerId: 'l1', items: [line({ id: 'a', balance: 300, learnerId: 'l1' })] },
  { learnerId: 'l2', items: [line({ id: 'b', balance: 100, learnerId: 'l2' })] },
];

const refusal = (work: () => unknown) => {
  try {
    work();
    return null;
  } catch (error) {
    return error as { code?: string };
  }
};

describe('the payment is divided across the siblings', () => {
  it('splits proportionally to each sibling debt by default', () => {
    const plan = planHouseholdAllocation({
      source: { id: 'pay-1', kind: 'payment', amount: KES(200) },
      members,
    });
    expect(plan.split).toBe('proportional');
    expect(plan.shares).toEqual([
      { learnerId: 'l1', amount: KES(150) },
      { learnerId: 'l2', amount: KES(50) },
    ]);
    expect(plan.plans.map((memberPlan) => memberPlan.allocatedFromPayment.amount_minor)).toEqual([150, 50]);
    expect(plan.allocated.amount_minor).toBe(200);
    expect(plan.unallocated.amount_minor).toBe(0);
  });

  it('splits equally on request, the odd minor unit going to the first sibling', () => {
    const plan = planHouseholdAllocation({
      source: { id: 'pay-1', kind: 'payment', amount: KES(201) },
      members,
      split: { kind: 'equal' },
    });
    expect(plan.shares).toEqual([
      { learnerId: 'l1', amount: KES(101) },
      { learnerId: 'l2', amount: KES(100) },
    ]);
    expect(plan.allocated.amount_minor).toBe(201);
  });

  it('splits by the weights a manual rule states', () => {
    const plan = planHouseholdAllocation({
      source: { id: 'pay-1', kind: 'payment', amount: KES(400) },
      members,
      split: { kind: 'manual', shares: { l1: 3, l2: 1 } },
    });
    expect(plan.shares).toEqual([
      { learnerId: 'l1', amount: KES(300) },
      { learnerId: 'l2', amount: KES(100) },
    ]);
  });

  it('leaves the excess unallocated when the payment exceeds the household debt', () => {
    const plan = planHouseholdAllocation({
      source: { id: 'pay-1', kind: 'payment', amount: KES(1000) },
      members,
    });
    expect(plan.allocated.amount_minor).toBe(400);
    expect(plan.unallocated.amount_minor).toBe(600);
  });

  it('plans nothing and leaves the payment whole for an empty household', () => {
    const plan = planHouseholdAllocation({
      source: { id: 'pay-1', kind: 'payment', amount: KES(100) },
      members: [],
    });
    expect(plan.shares).toEqual([]);
    expect(plan.plans).toEqual([]);
    expect(plan.unallocated.amount_minor).toBe(100);
  });
});

describe('each sibling is planned on its own lines and credits', () => {
  it('consumes a sibling credit inside that sibling plan', () => {
    const plan = planHouseholdAllocation({
      source: { id: 'pay-1', kind: 'payment', amount: KES(100) },
      members: [
        {
          learnerId: 'l1',
          items: [line({ id: 'a', balance: 300, learnerId: 'l1' })],
          credits: [{ id: 'cn-1', kind: 'credit_note', amount: KES(500), learnerId: 'l1' }],
        },
        { learnerId: 'l2', items: [line({ id: 'b', balance: 100, learnerId: 'l2' })] },
      ],
    });
    expect(plan.plans[0].allocatedFromPayment.amount_minor).toBe(75);
    expect(plan.plans[0].allocatedFromCredits.amount_minor).toBe(225);
    expect(plan.plans[0].credits[0].id).toBe('cn-1');
    expect(plan.plans[1].allocatedFromPayment.amount_minor).toBe(25);
    expect(plan.allocated.amount_minor).toBe(100);
  });

  it('applies the per-learner strategy to each sibling', () => {
    const plan = planHouseholdAllocation({
      source: { id: 'pay-1', kind: 'payment', amount: KES(200) },
      members,
      options: { strategy: 'proportional' },
    });
    expect(plan.plans.every((memberPlan) => memberPlan.strategy === 'proportional')).toBe(true);
  });

  it('traces the split and then each sibling plan', () => {
    const plan = planHouseholdAllocation({
      source: { id: 'pay-1', kind: 'payment', amount: KES(200) },
      members,
    });
    expect(plan.trace[0].message).toContain('household split proportional across 2 sibling(s)');
    expect(plan.trace.some((entry) => entry.message.includes('learner l1 takes 150'))).toBe(true);
  });
});

describe('the household split refuses impossible input', () => {
  it('refuses the same learner twice', () => {
    expect(
      refusal(() =>
        planHouseholdAllocation({
          source: { id: 'pay-1', kind: 'payment', amount: KES(100) },
          members: [
            { learnerId: 'l1', items: [line({ id: 'a', balance: 100, learnerId: 'l1' })] },
            { learnerId: 'l1', items: [line({ id: 'b', balance: 100, learnerId: 'l1' })] },
          ],
        })
      )?.code
    ).toBe('duplicate_member');
  });

  it('refuses a negative manual share', () => {
    expect(
      refusal(() =>
        planHouseholdAllocation({
          source: { id: 'pay-1', kind: 'payment', amount: KES(100) },
          members,
          split: { kind: 'manual', shares: { l1: -1, l2: 1 } },
        })
      )?.code
    ).toBe('invalid_share');
  });
});
