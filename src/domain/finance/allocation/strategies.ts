// ABOUTME: The four allocation strategies of spec 05 §5.3, each a pure function of the money to
// ABOUTME: place, the outstanding lines and the options: oldest-first, vote-head priority,
// ABOUTME: proportional (through the money module's exact allocator) and manual (validated).

import { allocate, compare, fromMinor, isPositive, subtract, type Money } from '@/domain/money';

import { AllocationError } from './errors';
import { orderByVoteHeadPriority, orderOldestFirst, type OrderedItem } from './order';
import type {
  AllocationOptions,
  AllocationReason,
  AllocationStrategyKind,
  ItemAllocation,
  OutstandingItem,
  RemainderPolicy,
} from './types';

/** The balance still owing across the lines, as one amount. Empty is the zero of the currency. */
export function totalBalance(items: readonly OutstandingItem[], currency: Money['currency']): Money {
  let total = 0;
  for (const item of items) total += item.balance.amount_minor;
  return fromMinor(total, currency);
}

/** The smaller of two amounts in the same currency. */
export function minMoney(left: Money, right: Money): Money {
  return compare(left, right) <= 0 ? left : right;
}

/**
 * The money a strategy may actually place: never more than the outstanding debt.
 *
 * A payment larger than the debt leaves its excess unallocated; a strategy never places more than
 * the lines owe, so no line is ever over-allocated.
 */
function placeable(amount: Money, items: readonly OutstandingItem[]): Money {
  return minMoney(amount, totalBalance(items, amount.currency));
}

/** Fills items in a given order, each up to its balance, until the money runs out. */
function fillInOrder(
  amount: Money,
  ordered: readonly OrderedItem[],
  strategy: AllocationStrategyKind,
  ordering: AllocationReason['ordering']
): readonly ItemAllocation[] {
  const need = placeable(amount, ordered.map((entry) => entry.item));
  let left = need.amount_minor;
  const allocations: ItemAllocation[] = [];
  for (const { item, tieBreak } of ordered) {
    if (left <= 0) break;
    const take = Math.min(left, item.balance.amount_minor);
    if (take <= 0) continue;
    const capped = take < item.balance.amount_minor;
    allocations.push({
      itemId: item.id,
      amount: fromMinor(take, amount.currency),
      reason: {
        strategy,
        ordering,
        tieBreak,
        capped,
        fullyCovered: !capped,
      },
    });
    left -= take;
  }
  return allocations;
}

/**
 * Oldest-invoice-first, the default: fill the oldest line, then the next.
 *
 * Order is invoice date, then due date, then the line's order on its invoice, then its id — so the
 * same lines always fill in the same order.
 */
export function allocateOldestFirst(
  amount: Money,
  items: readonly OutstandingItem[]
): readonly ItemAllocation[] {
  return fillInOrder(amount, orderOldestFirst(items), 'oldest_first', 'invoice_date');
}

/** Vote-head priority: the fee items' declared order, the oldest invoice breaking a tie. */
export function allocateByVoteHeadPriority(
  amount: Money,
  items: readonly OutstandingItem[],
  options?: AllocationOptions
): readonly ItemAllocation[] {
  const lookup = options?.voteHeadPriority;
  if (!lookup) {
    throw new AllocationError(
      'missing_priority_lookup',
      'the vote_head_priority strategy needs a fee-item priority lookup'
    );
  }
  return fillInOrder(amount, orderByVoteHeadPriority(items, lookup), 'vote_head_priority', 'vote_head_priority');
}

/**
 * Proportional: split the money across every outstanding line in proportion to its balance.
 *
 * The split runs through the money module's `allocate`, so the parts sum to the money placed
 * exactly even when a share is a repeating decimal (`1/3` of a shilling still loses nothing). No
 * part can exceed its line's balance, because the money placed is never more than the total debt.
 */
export function allocateProportionally(
  amount: Money,
  items: readonly OutstandingItem[]
): readonly ItemAllocation[] {
  const need = placeable(amount, items);
  if (!isPositive(need)) return [];
  const weights = items.map((item) => item.balance.amount_minor);
  const weightSum = weights.reduce((running, weight) => running + weight, 0);
  const parts = allocate(need, weights);
  const allocations: ItemAllocation[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const part = parts[index];
    if (part.amount_minor <= 0) continue;
    const item = items[index];
    // The allocator gives each part the floor of its exact share, and one extra minor unit to the
    // parts with the largest remainders. A part above its floor took a remainder unit.
    const floor = Number(
      (BigInt(need.amount_minor) * BigInt(item.balance.amount_minor)) / BigInt(weightSum)
    );
    allocations.push({
      itemId: item.id,
      amount: part,
      reason: {
        strategy: 'proportional',
        ordering: 'proportional_share',
        tieBreak: part.amount_minor > floor ? 'largest_remainder' : null,
        capped: false,
        fullyCovered: part.amount_minor === item.balance.amount_minor,
        weightMinor: item.balance.amount_minor,
        weightSumMinor: weightSum,
      },
    });
  }
  return allocations;
}

/** A strategy, as the dispatcher and a manual plan's `spill` policy call it. */
export type StrategyFunction = (
  amount: Money,
  items: readonly OutstandingItem[],
  options?: AllocationOptions
) => readonly ItemAllocation[];

/** The strategy function a caller named. */
export function strategyFunction(strategy: AllocationStrategyKind): StrategyFunction {
  switch (strategy) {
    case 'oldest_first':
      return allocateOldestFirst;
    case 'vote_head_priority':
      return allocateByVoteHeadPriority;
    case 'proportional':
      return allocateProportionally;
    case 'manual':
      return allocateManually;
    default:
      throw new AllocationError('unknown_strategy', `unknown allocation strategy: ${String(strategy)}`);
  }
}

/** The lines a manual plan has already named, so a remainder policy can see what is left. */
function reduceBy(items: readonly OutstandingItem[], allocations: readonly ItemAllocation[]): OutstandingItem[] {
  const used = new Map<string, number>();
  for (const allocation of allocations) {
    used.set(allocation.itemId, (used.get(allocation.itemId) ?? 0) + allocation.amount.amount_minor);
  }
  const reduced: OutstandingItem[] = [];
  for (const item of items) {
    const applied = used.get(item.id) ?? 0;
    if (applied === 0) {
      reduced.push(item);
      continue;
    }
    reduced.push({ ...item, balance: subtract(item.balance, fromMinor(applied, item.balance.currency)) });
  }
  return reduced.filter((item) => item.balance.amount_minor > 0);
}

function manualReason(ordering: AllocationReason['ordering'], fullyCovered: boolean): AllocationReason {
  return {
    strategy: 'manual',
    ordering,
    tieBreak: null,
    capped: false,
    fullyCovered,
  };
}

/**
 * Manual: the caller names the (item, amount) pairs, and the plan validates every one of them.
 *
 * An instruction may not exceed the money available nor its item's balance, may not name an
 * unknown item and may not repeat one. Whatever is left is governed by the plan's remainder
 * policy, which the caller must state: leave it unallocated (it becomes learner credit), refuse
 * it, give it to one named item, or spill it into another strategy.
 */
export function allocateManually(
  amount: Money,
  items: readonly OutstandingItem[],
  options?: AllocationOptions
): readonly ItemAllocation[] {
  const manual = options?.manual;
  if (!manual) {
    throw new AllocationError('missing_manual_plan', 'the manual strategy needs a manual plan');
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const allocations: ItemAllocation[] = [];
  let named = 0;
  for (const instruction of manual.allocations) {
    const item = byId.get(instruction.itemId);
    if (!item) {
      throw new AllocationError('unknown_item', `no outstanding line has id ${instruction.itemId}`);
    }
    if (seen.has(instruction.itemId)) {
      throw new AllocationError('duplicate_item', `the manual plan names line ${instruction.itemId} twice`);
    }
    seen.add(instruction.itemId);
    if (instruction.amount.currency !== amount.currency) {
      throw new AllocationError(
        'currency_mismatch',
        `line ${instruction.itemId} is in ${instruction.amount.currency}, the payment in ${amount.currency}`
      );
    }
    if (instruction.amount.amount_minor <= 0) {
      throw new AllocationError(
        'non_positive_amount',
        `the manual amount for line ${instruction.itemId} must be positive`
      );
    }
    if (instruction.amount.amount_minor > item.balance.amount_minor) {
      throw new AllocationError(
        'manual_exceeds_item',
        `the manual amount for line ${instruction.itemId} exceeds its balance`
      );
    }
    named += instruction.amount.amount_minor;
    allocations.push({
      itemId: item.id,
      amount: instruction.amount,
      reason: manualReason('manual', instruction.amount.amount_minor === item.balance.amount_minor),
    });
  }
  if (named > amount.amount_minor) {
    throw new AllocationError(
      'manual_exceeds_payment',
      'the manual instructions together exceed the money available to allocate'
    );
  }

  const remainderMinor = amount.amount_minor - named;
  const policy: RemainderPolicy = manual.remainder;
  if (remainderMinor > 0) {
    switch (policy.kind) {
      case 'leave_unallocated':
        break;
      case 'refuse':
        throw new AllocationError(
          'manual_remainder',
          `the manual plan leaves ${remainderMinor} minor unit(s) unallocated, and its remainder policy refuses that`
        );
      case 'to_item': {
        const target = byId.get(policy.itemId);
        if (!target) {
          throw new AllocationError('unknown_item', `the remainder names line ${policy.itemId}, which is not outstanding`);
        }
        const already = allocations
          .filter((allocation) => allocation.itemId === target.id)
          .reduce((running, allocation) => running + allocation.amount.amount_minor, 0);
        const room = target.balance.amount_minor - already;
        if (remainderMinor > room) {
          throw new AllocationError(
            'manual_remainder_item',
            `the remainder of ${remainderMinor} minor unit(s) exceeds what line ${target.id} can still take (${room})`
          );
        }
        allocations.push({
          itemId: target.id,
          amount: fromMinor(remainderMinor, amount.currency),
          reason: manualReason('manual_remainder', already + remainderMinor === target.balance.amount_minor),
        });
        break;
      }
      case 'spill': {
        if (policy.strategy === 'manual') {
          throw new AllocationError(
            'unknown_strategy',
            'a manual plan cannot spill its remainder into another manual plan'
          );
        }
        const spill = strategyFunction(policy.strategy);
        allocations.push(
          ...spill(fromMinor(remainderMinor, amount.currency), reduceBy(items, allocations), options)
        );
        break;
      }
      default:
        throw new AllocationError('unknown_strategy', 'unknown manual remainder policy');
    }
  }
  return allocations;
}

/** Runs the strategy a caller named. */
export function allocateByStrategy(
  strategy: AllocationStrategyKind,
  amount: Money,
  items: readonly OutstandingItem[],
  options?: AllocationOptions
): readonly ItemAllocation[] {
  return strategyFunction(strategy)(amount, items, options);
}
