// ABOUTME: Shared fixtures for the allocation engine's tests: builders for outstanding lines, a
// ABOUTME: fee-item priority lookup and small helpers over a plan.

import { fromMinor, type CurrencyCode, type Money } from '@/domain/money';

import type { AllocationPlan, OutstandingItem, VoteHeadPriorityLookup } from '..';

export const KES = (minor: number): Money => fromMinor(minor, 'KES');

export interface LineSpec {
  readonly id: string;
  readonly balance: number;
  readonly invoiceId?: string;
  readonly invoiceNumber?: string;
  readonly learnerId?: string | null;
  readonly issuedOn?: string;
  readonly dueOn?: string | null;
  readonly kind?: string;
  readonly feeItemId?: string | null;
  readonly sequence?: number;
  readonly description?: string;
  readonly currency?: CurrencyCode;
}

/** One outstanding invoice line, with sensible defaults for everything but its id and balance. */
export function line(spec: LineSpec): OutstandingItem {
  return {
    id: spec.id,
    invoiceId: spec.invoiceId ?? `inv-${spec.id}`,
    invoiceNumber: spec.invoiceNumber ?? `INV-${spec.id}`,
    learnerId: spec.learnerId === undefined ? 'lrn-1' : spec.learnerId,
    issuedOn: spec.issuedOn ?? '2027-01-05',
    dueOn: spec.dueOn ?? null,
    kind: spec.kind ?? 'fee',
    feeItemId: spec.feeItemId ?? null,
    sequence: spec.sequence ?? 0,
    description: spec.description ?? spec.id,
    balance: fromMinor(spec.balance, spec.currency ?? 'KES'),
  };
}

/** A priority lookup over a plain map; a fee item not in the map declares no priority. */
export function priorityLookup(priorities: Readonly<Record<string, number>>): VoteHeadPriorityLookup {
  return {
    priorityOf: (feeItemId) =>
      feeItemId === null || feeItemId === undefined ? null : (priorities[feeItemId] ?? null),
  };
}

/** The minor units one line received across every allocation line of a plan. */
export function allocatedTo(plan: AllocationPlan, itemId: string): number {
  return plan.allocations
    .filter((allocation) => allocation.itemId === itemId)
    .reduce((total, allocation) => total + allocation.amount.amount_minor, 0);
}

/** The plan's allocation of a whole run, per item id, in order. */
export function distribution(plan: AllocationPlan): Array<{ itemId: string; minor: number }> {
  const byItem = new Map<string, number>();
  for (const allocation of plan.allocations) {
    byItem.set(allocation.itemId, (byItem.get(allocation.itemId) ?? 0) + allocation.amount.amount_minor);
  }
  return [...byItem].map(([itemId, minor]) => ({ itemId, minor }));
}

/** A stable, comparable snapshot of a plan's money, for an equality assertion. */
export function planMoney(plan: AllocationPlan): string {
  return JSON.stringify({
    allocated: plan.allocated.amount_minor,
    fromPayment: plan.allocatedFromPayment.amount_minor,
    fromCredits: plan.allocatedFromCredits.amount_minor,
    unallocated: plan.unallocated.amount_minor,
    lines: plan.allocations.map((line) => [line.itemId, line.sourceId, line.amount.amount_minor]),
  });
}
