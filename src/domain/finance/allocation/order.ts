// ABOUTME: The ordering rules of the allocation engine: oldest-invoice-first, vote-head priority,
// ABOUTME: and the tie-break each item was placed by, so a plan can explain its own order.

import type { OrderTieBreak, OutstandingItem, VoteHeadPriorityLookup } from './types';

/** A date that is missing or unreadable sorts after every date that is present. */
const LAST_DATE = '\uffff';

const dateKey = (value: string | null | undefined): string =>
  value === null || value === undefined || value === '' ? LAST_DATE : value;

const sequenceOf = (item: OutstandingItem): number => item.sequence ?? 0;

/** The oldest-invoice-first comparator: invoice date, then due date, then line order, then id. */
export function compareOldestFirst(left: OutstandingItem, right: OutstandingItem): number {
  const byIssue = dateKey(left.issuedOn).localeCompare(dateKey(right.issuedOn));
  if (byIssue !== 0) return byIssue;
  const byDue = dateKey(left.dueOn).localeCompare(dateKey(right.dueOn));
  if (byDue !== 0) return byDue;
  const bySequence = sequenceOf(left) - sequenceOf(right);
  if (bySequence !== 0) return bySequence;
  return left.id.localeCompare(right.id);
}

/** Which key first separated two items already in oldest-first order. */
function oldestFirstTieBreak(previous: OutstandingItem, current: OutstandingItem): OrderTieBreak {
  if (dateKey(previous.issuedOn) !== dateKey(current.issuedOn)) return 'invoice_date';
  if (dateKey(previous.dueOn) !== dateKey(current.dueOn)) return 'due_date';
  if (sequenceOf(previous) !== sequenceOf(current)) return 'line_order';
  return 'item_id';
}

/** An item with the tie-break that placed it in the run. */
export interface OrderedItem {
  readonly item: OutstandingItem;
  readonly tieBreak: OrderTieBreak | null;
}

/** Orders items oldest-invoice-first and records the tie-break that placed each one. */
export function orderOldestFirst(items: readonly OutstandingItem[]): readonly OrderedItem[] {
  const sorted = [...items].sort(compareOldestFirst);
  return sorted.map((item, index) => ({
    item,
    tieBreak: index === 0 ? null : oldestFirstTieBreak(sorted[index - 1], item),
  }));
}

/** An item's declared priority; a missing or unknown priority sorts after every declared one. */
function priorityOf(lookup: VoteHeadPriorityLookup, item: OutstandingItem): number {
  const priority = lookup.priorityOf(item.feeItemId ?? null);
  return priority === null || !Number.isFinite(priority) ? Number.MAX_SAFE_INTEGER : priority;
}

/**
 * Orders items by their fee item's declared priority, the oldest invoice breaking a tie.
 *
 * The priority comes from the `VoteHeadPriorityLookup` the caller supplies (P3-B01's configuration);
 * the engine holds no table of its own.
 */
export function orderByVoteHeadPriority(
  items: readonly OutstandingItem[],
  lookup: VoteHeadPriorityLookup
): readonly OrderedItem[] {
  const sorted = [...items].sort((left, right) => {
    const difference = priorityOf(lookup, left) - priorityOf(lookup, right);
    if (difference !== 0) return difference;
    return compareOldestFirst(left, right);
  });
  return sorted.map((item, index) => ({
    item,
    tieBreak:
      index === 0
        ? null
        : priorityOf(lookup, sorted[index - 1]) !== priorityOf(lookup, item)
          ? 'vote_head_priority'
          : oldestFirstTieBreak(sorted[index - 1], item),
  }));
}
