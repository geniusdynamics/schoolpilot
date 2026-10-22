// ABOUTME: The sum invariants of the allocation engine, property-tested with a seeded fast-check run
// ABOUTME: so a failure reproduces: the payment is conserved, no line is over-allocated, a covered set
// ABOUTME: leaves the exact excess, applying a plan twice is refused, and order changes only the
// ABOUTME: distribution — while proportional still sums exactly through the money module's allocator.

import { fromMinor, zero, type CurrencyCode } from '@/domain/money';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  applyAllocationPlan,
  planAllocation,
  type AllocationPlan,
  type AllocationStrategyKind,
  type OutstandingItem,
} from '..';
import { planMoney, priorityLookup } from './fixtures';

const OPTIONS = { seed: 20261022, numRuns: 200 } as const;

const CURRENCIES = ['KES', 'UGX', 'KWD'] as const;
const STRATEGIES: readonly AllocationStrategyKind[] = [
  'oldest_first',
  'vote_head_priority',
  'proportional',
];
const LOOKUP = priorityLookup({ 'fee-0': 1, 'fee-1': 2 });

const currency = fc.constantFrom(...CURRENCIES);
const balances = fc.array(fc.integer({ min: 1, max: 1_000_000 }), { minLength: 1, maxLength: 5 });
const paymentAmount = fc.integer({ min: 0, max: 3_000_000 });
const creditAmounts = fc.array(fc.integer({ min: 0, max: 500_000 }), { maxLength: 2 });
const strategy = fc.constantFrom(...STRATEGIES);
// A small pool of dates, so ties on the invoice date, the due date and the line order really happen.
const dates = fc.array(fc.constantFrom('2027-01-05', '2027-01-05', '2027-01-10', '2027-02-01'), {
  minLength: 1,
  maxLength: 3,
});

/** Builds unique outstanding lines from a list of balances. */
function linesFrom(code: CurrencyCode, list: readonly number[], datePool: readonly string[]): OutstandingItem[] {
  return list.map((balance, index) => ({
    id: `line-${index}`,
    invoiceId: `inv-${index % 2}`,
    invoiceNumber: `INV-${index % 2}`,
    learnerId: 'lrn-1',
    issuedOn: datePool[index % datePool.length],
    dueOn: datePool[(index + 1) % datePool.length],
    kind: 'fee',
    feeItemId: `fee-${index % 2}`,
    sequence: index,
    balance: fromMinor(balance, code),
  }));
}

function creditsFrom(code: CurrencyCode, amounts: readonly number[]) {
  return amounts.map((amount, index) => ({
    id: `cn-${index}`,
    kind: 'credit_note' as const,
    amount: fromMinor(amount, code),
  }));
}

function planOf(
  code: CurrencyCode,
  items: readonly OutstandingItem[],
  paid: number,
  amounts: readonly number[],
  chosen: AllocationStrategyKind
): AllocationPlan {
  return planAllocation({
    source: { id: 'pay-1', kind: 'payment', amount: fromMinor(paid, code), learnerId: 'lrn-1' },
    items,
    credits: creditsFrom(code, amounts),
    options: { strategy: chosen, voteHeadPriority: LOOKUP },
  });
}

/** The money a plan placed on one line, in minor units. */
function onLine(plan: AllocationPlan, itemId: string): number {
  return plan.allocations
    .filter((allocation) => allocation.itemId === itemId)
    .reduce((total, allocation) => total + allocation.amount.amount_minor, 0);
}

describe('the payment is conserved exactly', () => {
  it('leaves allocated plus unallocated equal to the payment, for every strategy', () => {
    fc.assert(
      fc.property(
        currency,
        balances,
        dates,
        paymentAmount,
        creditAmounts,
        strategy,
        (code, list, datePool, paid, amounts, chosen) => {
          const plan = planOf(code, linesFrom(code, list, datePool), paid, amounts, chosen);
          const minor = (value: number) => BigInt(value);
          expect(minor(plan.allocatedFromPayment.amount_minor) + minor(plan.unallocated.amount_minor)).toBe(minor(paid));
          expect(minor(plan.allocatedFromCredits.amount_minor) + minor(plan.allocatedFromPayment.amount_minor)).toBe(
            minor(plan.allocated.amount_minor)
          );
          expect(plan.unallocated.amount_minor).toBeGreaterThanOrEqual(0);
        }
      ),
      OPTIONS
    );
  });

  it('accounts for every credit as applied or left', () => {
    fc.assert(
      fc.property(currency, balances, dates, paymentAmount, creditAmounts, strategy, (code, list, datePool, paid, amounts, chosen) => {
        const plan = planOf(code, linesFrom(code, list, datePool), paid, amounts, chosen);
        const provided = amounts.reduce((total, amount) => total + amount, 0);
        const applied = plan.credits.reduce((total, credit) => total + credit.applied.amount_minor, 0);
        const left = plan.unusedCredits.reduce(
          (total, credit) => total + (credit.available.amount_minor - credit.applied.amount_minor),
          0
        );
        expect(applied + left).toBe(provided);
        expect(plan.allocatedFromCredits.amount_minor).toBe(applied);
      }),
      OPTIONS
    );
  });
});

describe('no line is over-allocated', () => {
  it('keeps every allocation non-negative and within the line balance', () => {
    fc.assert(
      fc.property(currency, balances, dates, paymentAmount, creditAmounts, strategy, (code, list, datePool, paid, amounts, chosen) => {
        const items = linesFrom(code, list, datePool);
        const plan = planOf(code, items, paid, amounts, chosen);
        for (const item of items) {
          expect(onLine(plan, item.id)).toBeLessThanOrEqual(item.balance.amount_minor);
          expect(onLine(plan, item.id)).toBeGreaterThanOrEqual(0);
        }
        for (const allocation of plan.allocations) {
          expect(allocation.amount.amount_minor).toBeGreaterThan(0);
        }
        for (const remaining of plan.remaining) {
          expect(remaining.balance.amount_minor).toBeGreaterThanOrEqual(0);
        }
      }),
      OPTIONS
    );
  });

  it('places no more than the outstanding debt', () => {
    fc.assert(
      fc.property(currency, balances, dates, paymentAmount, strategy, (code, list, datePool, paid, chosen) => {
        const items = linesFrom(code, list, datePool);
        const plan = planOf(code, items, paid, [], chosen);
        const debt = list.reduce((total, balance) => total + balance, 0);
        expect(plan.allocated.amount_minor).toBe(Math.min(paid, debt));
      }),
      OPTIONS
    );
  });
});

describe('a covered set leaves the exact excess', () => {
  it('leaves zero unallocated when the payment covers the debt, and the exact excess when it is larger', () => {
    fc.assert(
      fc.property(currency, balances, dates, paymentAmount, strategy, (code, list, datePool, paid, chosen) => {
        const items = linesFrom(code, list, datePool);
        const plan = planOf(code, items, paid, [], chosen);
        const debt = list.reduce((total, balance) => total + balance, 0);
        const expectedExcess = Math.max(0, paid - debt);
        expect(plan.unallocated.amount_minor).toBe(expectedExcess);
        if (paid >= debt) expect(plan.allocated.amount_minor).toBe(debt);
      }),
      OPTIONS
    );
  });
});

describe('applying a plan is deterministic and refuses over-allocation', () => {
  it('gives the same plan for the same input', () => {
    fc.assert(
      fc.property(
        currency,
        balances,
        dates,
        paymentAmount,
        creditAmounts,
        strategy,
        (code, list, datePool, paid, amounts, chosen) => {
          const items = linesFrom(code, list, datePool);
          expect(planMoney(planOf(code, items, paid, amounts, chosen))).toBe(
            planMoney(planOf(code, items, paid, amounts, chosen))
          );
        }
      ),
      OPTIONS
    );
  });

  it('refuses to apply a plan to lines that no longer carry the balance', () => {
    fc.assert(
      fc.property(
        currency,
        balances,
        dates,
        fc.integer({ min: 1, max: 3_000_000 }),
        strategy,
        (code, list, datePool, paid, chosen) => {
          const items = linesFrom(code, list, datePool);
          const plan = planOf(code, items, paid, [], chosen);
          if (plan.allocations.length === 0) return;
          const cleared = items.map((item) => ({ ...item, balance: zero(item.balance.currency) }));
          expect(() => applyAllocationPlan(cleared, plan)).toThrowError(
            expect.objectContaining({ code: 'plan_exceeds_balance' })
          );
        }
      ),
      OPTIONS
    );
  });
});

describe('order changes the distribution, never the total', () => {
  it('allocates the same total however the lines are ordered', () => {
    fc.assert(
      fc.property(currency, balances, dates, paymentAmount, (code, list, datePool, paid) => {
        const items = linesFrom(code, list, datePool);
        const shuffled = [...items].reverse();
        for (const chosen of STRATEGIES) {
          const forward = planOf(code, items, paid, [], chosen);
          const backward = planOf(code, shuffled, paid, [], chosen);
          expect(backward.allocated.amount_minor).toBe(forward.allocated.amount_minor);
          expect(backward.unallocated.amount_minor).toBe(forward.unallocated.amount_minor);
        }
      }),
      OPTIONS
    );
  });
});

describe('proportional sums exactly, however repeating the share', () => {
  it('places the money placed exactly across the parts, per line', () => {
    fc.assert(
      fc.property(currency, balances, dates, paymentAmount, (code, list, datePool, paid) => {
        const items = linesFrom(code, list, datePool);
        const plan = planOf(code, items, paid, [], 'proportional');
        const placed = items.reduce((total, item) => total + onLine(plan, item.id), 0);
        expect(placed).toBe(plan.allocated.amount_minor);
      }),
      OPTIONS
    );
  });

  it('splits a shilling three ways without losing a cent', () => {
    const items = linesFrom('KES', [100, 100, 100], ['2027-01-05']);
    const plan = planOf('KES', items, 100, [], 'proportional');
    expect(items.map((item) => onLine(plan, item.id))).toEqual([34, 33, 33]);
    expect(plan.allocated.amount_minor).toBe(100);
  });
});
