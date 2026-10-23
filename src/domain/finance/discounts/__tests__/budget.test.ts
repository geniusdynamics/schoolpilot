// ABOUTME: The budget a discount programme is tracked against, proven: the committed figure against
// ABOUTME: the budget, the overspend, and the three policies an overspend can meet.

import { describe, expect, it } from 'vitest';

import { fromMinor } from '@/domain/money';

import {
  BUDGET_SOURCE,
  DEFAULT_BUDGET_OVERSPEND,
  assertDiscountBudget,
  budgetStatus,
  budgetStatuses,
  isDiscountError,
  withinEveryBudget,
  type DiscountBudget,
} from '..';

const KES = 'KES' as const;

function catchOf(action: () => unknown): unknown {
  try {
    action();
    return null;
  } catch (error) {
    return error;
  }
}

function budget(overrides: Partial<DiscountBudget> = {}): DiscountBudget {
  return {
    programmeId: 'county-bursary-2027',
    name: 'County bursary fund 2027',
    fundingSource: 'county_bursary',
    amount: fromMinor(1_000_000, KES),
    committed: fromMinor(900_000, KES),
    ...overrides,
  };
}

describe('the budget a programme is tracked against', () => {
  it('is the stored figure the caller supplies, and says so', () => {
    const status = budgetStatus(budget(), fromMinor(0, KES));
    expect(status.budget.amount_minor).toBe(1_000_000);
    expect(status.committedBefore.amount_minor).toBe(900_000);
    expect(status.remaining.amount_minor).toBe(100_000);
    expect(status.withinBudget).toBe(true);
    expect(status.overspend.amount_minor).toBe(0);
    expect(status.source).toBe(BUDGET_SOURCE);
    expect(status.source).toContain('no budget entity');
    expect(DEFAULT_BUDGET_OVERSPEND).toBe('warn');
  });

  it('records an overspend rather than refusing it, under the default policy', () => {
    const status = budgetStatus(budget(), fromMinor(300_000, KES));
    expect(status.committedAfter.amount_minor).toBe(1_200_000);
    expect(status.remaining.amount_minor).toBe(-200_000);
    expect(status.overspend.amount_minor).toBe(200_000);
    expect(status.withinBudget).toBe(false);
    expect(status.policy).toBe('warn');
  });

  it('records an overspend silently under `allow`', () => {
    const status = budgetStatus(budget(), fromMinor(300_000, KES), 'allow');
    expect(status.overspend.amount_minor).toBe(200_000);
    expect(status.policy).toBe('allow');
    expect(withinEveryBudget([status])).toBe(false);
  });

  it('refuses a bill that would exceed the budget under `refuse`, naming the programme', () => {
    const error = catchOf(() => budgetStatus(budget(), fromMinor(300_000, KES), 'refuse'));
    expect(isDiscountError(error, 'budget_exceeded')).toBe(true);
    expect((error as Error).message).toContain('County bursary fund 2027');
    expect((error as Error).message).toContain('overspend of 200000');
  });

  it('does not refuse a bill that lands exactly on the budget', () => {
    const status = budgetStatus(budget(), fromMinor(100_000, KES), 'refuse');
    expect(status.withinBudget).toBe(true);
    expect(status.remaining.amount_minor).toBe(0);
  });

  it('tracks each programme by the funding source its discounts draw on', () => {
    const statuses = budgetStatuses(
      [budget(), budget({ programmeId: 'ngo-2027', name: 'NGO fund', fundingSource: 'ngo', amount: fromMinor(500_000, KES), committed: fromMinor(0, KES) })],
      new Map([
        ['county_bursary' as const, fromMinor(300_000, KES)],
        ['ngo' as const, fromMinor(600_000, KES)],
      ])
    );
    expect(statuses.map((status) => [status.programmeId, status.proposed.amount_minor, status.overspend.amount_minor])).toEqual([
      ['county-bursary-2027', 300_000, 200_000],
      ['ngo-2027', 600_000, 100_000],
    ]);
    expect(withinEveryBudget(statuses)).toBe(false);
  });

  it('reports a programme no discount draws on at zero proposed', () => {
    const statuses = budgetStatuses([budget({ fundingSource: 'church' })], new Map());
    expect(statuses[0].proposed.amount_minor).toBe(0);
    expect(statuses[0].withinBudget).toBe(true);
  });

  it('refuses a budget that is malformed or in another currency', () => {
    expect(isDiscountError(catchOf(() => assertDiscountBudget(budget({ programmeId: '' }), KES)), 'budget_invalid')).toBe(
      true
    );
    expect(
      isDiscountError(catchOf(() => assertDiscountBudget(budget({ amount: fromMinor(1, 'UGX') }), KES)), 'budget_invalid')
    ).toBe(true);
    expect(
      isDiscountError(catchOf(() => assertDiscountBudget(budget({ committed: fromMinor(-1, KES) }), KES)), 'budget_invalid')
    ).toBe(true);
    expect(
      isDiscountError(catchOf(() => budgetStatus(budget(), fromMinor(-1, KES))), 'budget_invalid')
    ).toBe(true);
    expect(
      isDiscountError(catchOf(() => budgetStatus(budget(), fromMinor(1, 'UGX'))), 'budget_invalid')
    ).toBe(true);
  });
});
