// ABOUTME: The allocation priority of a fee item: the order allocation follows (P3-D02 consumes
// ABOUTME: this), the deterministic tie-break for rows that share a number, and the next free number.

import { FeeItemError } from './errors';

/** The lowest priority a fee item may carry. Allocation follows the lowest number first. */
export const MIN_FEE_ITEM_PRIORITY = 0;

/** The fields the allocation order reads from a fee item. */
export interface PriorityOrdered {
  readonly priority: number;
  readonly code: string;
  readonly id: string;
}

/** A priority as a whole number at or above the minimum, refused otherwise. */
export function assertPriority(priority: number): number {
  if (!Number.isSafeInteger(priority) || priority < MIN_FEE_ITEM_PRIORITY) {
    throw new FeeItemError(
      'priority_invalid',
      `a priority must be a whole number at or above ${MIN_FEE_ITEM_PRIORITY}; got ${String(priority)}`,
      { field: 'priority' }
    );
  }
  return priority;
}

/**
 * The order allocation follows: the lowest priority first.
 *
 * Two items that share a priority are ordered by their code and then by their id, so the order
 * is total and deterministic. A tie cannot happen for a row the service wrote - it refuses a
 * duplicate priority among active items - but rows the fee migration and the demo seed wrote do
 * share numbers, and allocation has to stay reproducible over them.
 */
export function compareFeeItemsForAllocation(left: PriorityOrdered, right: PriorityOrdered): number {
  if (left.priority !== right.priority) return left.priority - right.priority;
  if (left.code !== right.code) return left.code < right.code ? -1 : 1;
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

/** The fee items in the order allocation follows, without mutating the caller's list. */
export function orderFeeItemsForAllocation<T extends PriorityOrdered>(
  items: readonly T[]
): T[] {
  return [...items].sort(compareFeeItemsForAllocation);
}

/**
 * The priority a new item takes when the caller names none: one above the highest in use.
 *
 * The number is free, so it never collides, and it is above every number in use, so a new item is
 * ordered after the items the school already has instead of jumping the queue. An institution with
 * no items starts at the minimum.
 */
export function nextFreePriority(items: readonly { readonly priority: number }[]): number {
  let highest = MIN_FEE_ITEM_PRIORITY - 1;
  for (const item of items) {
    if (item.priority > highest) highest = item.priority;
  }
  return highest + 1;
}
