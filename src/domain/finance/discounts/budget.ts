// ABOUTME: The budget a discount programme is tracked against: the stored figure the caller
// ABOUTME: supplies, what a bill would commit against it, and whether an overspend is refused,
// ABOUTME: warned about, or allowed with the overspend recorded.

import { add, compare, isZero, subtract, zero, type CurrencyCode, type Money } from '@/domain/money';

import { DiscountError } from './errors';
import type {
  BudgetOverspendPolicy,
  BudgetStatus,
  DiscountBudget,
  DiscountFundingSource,
} from './types';

/**
 * The overspend policy an unstated option falls back to: allowed, with the overspend recorded.
 *
 * A school tracks a bursary programme's budget (spec 05 §2.3) to report against it, not to turn a
 * learner away at the counter because the fund is exhausted. The engine therefore computes and
 * records the overspend and leaves the decision to the caller; a school that wants the engine to
 * refuse states `refuse`, and the refusal names the programme and the amount.
 */
export const DEFAULT_BUDGET_OVERSPEND: BudgetOverspendPolicy = 'warn';

/** Where the budget side of a status came from, so a screen can say it. */
export const BUDGET_SOURCE = 'Stored budget figure supplied to the engine (the platform models no budget entity)';

/** Validates a budget: Money of the bill's currency, and a committed figure that is not negative. */
export function assertDiscountBudget(budget: DiscountBudget, currency: CurrencyCode): DiscountBudget {
  const subject = budget?.programmeId ? `the budget ${budget.programmeId}` : 'a budget';
  if (!budget || typeof budget.programmeId !== 'string' || budget.programmeId.trim() === '') {
    throw new DiscountError('budget_invalid', `${subject}: a budget needs a programme id`, subject);
  }
  for (const [label, amount] of [
    ['amount', budget.amount],
    ['committed', budget.committed],
  ] as const) {
    if (
      amount === null ||
      typeof amount !== 'object' ||
      !Number.isSafeInteger((amount as Money).amount_minor) ||
      (amount as Money).currency !== currency
    ) {
      throw new DiscountError(
        'budget_invalid',
        `${subject}: its ${label} must be whole ${currency} minor units`,
        subject
      );
    }
  }
  if (budget.amount.amount_minor < 0 || budget.committed.amount_minor < 0) {
    throw new DiscountError('budget_invalid', `${subject}: neither its budget nor its committed figure may be negative`, subject);
  }
  return budget;
}

/**
 * Reports a budget against what a bill would commit.
 *
 * `committed` is what the caller has already recorded against the programme in the period (the
 * accounting reports' pattern: the platform models no budget entity, so the figure is supplied);
 * `proposed` is what this bill adds. The overspend is the amount over the budget, and the policy
 * says what the caller should do about it. Under `refuse` the engine raises rather than returning a
 * status, so a run cannot post a bill past a fund the school chose to enforce.
 */
export function budgetStatus(
  budget: DiscountBudget,
  proposed: Money,
  policy: BudgetOverspendPolicy = DEFAULT_BUDGET_OVERSPEND
): BudgetStatus {
  const currency = budget.amount.currency;
  assertDiscountBudget(budget, currency);
  if (proposed.currency !== currency || !Number.isSafeInteger(proposed.amount_minor) || proposed.amount_minor < 0) {
    throw new DiscountError(
      'budget_invalid',
      `the proposed amount for ${budget.programmeId} must be whole ${currency} minor units`,
      budget.programmeId
    );
  }

  const committedAfter = add(budget.committed, proposed);
  const remaining = subtract(budget.amount, committedAfter);
  const over = compare(committedAfter, budget.amount) > 0;
  const overspend = over ? subtract(committedAfter, budget.amount) : zero(currency);

  if (over && policy === 'refuse') {
    throw new DiscountError(
      'budget_exceeded',
      `${budget.name} holds ${budget.amount.amount_minor} ${currency}, ${budget.committed.amount_minor} is ` +
        `already committed and this bill would add ${proposed.amount_minor}, an overspend of ` +
        `${overspend.amount_minor}; the overspend policy refuses it`,
      budget.programmeId
    );
  }

  return {
    programmeId: budget.programmeId,
    name: budget.name,
    currency,
    budget: budget.amount,
    committedBefore: budget.committed,
    proposed,
    committedAfter,
    remaining,
    overspend,
    withinBudget: !over,
    policy,
    source: BUDGET_SOURCE,
  };
}

/**
 * Reports every budget against what a bill would commit to it.
 *
 * A discount reaches a programme by its **funding source**: the spec's bursaries carry a source
 * (school, CDF/NG-CDF, county bursary, NGO, church, alumni), and a programme's budget is for one of
 * them, so the county bursary's budget tracks every county-bursary discount. A programme no discount
 * draws on still reports, at zero proposed, so the screen never hides a fund.
 */
export function budgetStatuses(
  budgets: readonly DiscountBudget[],
  proposedByFundingSource: ReadonlyMap<DiscountFundingSource, Money>,
  policy: BudgetOverspendPolicy = DEFAULT_BUDGET_OVERSPEND
): readonly BudgetStatus[] {
  return budgets.map((budget) => {
    assertDiscountBudget(budget, budget.amount.currency);
    const proposed = proposedByFundingSource.get(budget.fundingSource) ?? zero(budget.amount.currency);
    return budgetStatus(budget, proposed, policy);
  });
}

/** True when every budget the bill touches is within its limit. */
export function withinEveryBudget(statuses: readonly BudgetStatus[]): boolean {
  return statuses.every((status) => status.withinBudget || isZero(status.overspend));
}
