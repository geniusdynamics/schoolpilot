// ABOUTME: Builds an allocation plan: it orders the outstanding lines by the chosen strategy, splits
// ABOUTME: the payment and any credits across them through the money module, and returns the plan
// ABOUTME: with a trace explaining every amount. It mutates nothing; applying is the caller's job.

import { add, compare, fromMinor, isNegative, subtract, zero, type Money } from '@/domain/money';

import { AllocationError } from './errors';
import { allocateByStrategy, minMoney, totalBalance } from './strategies';
import type {
  AllocationInput,
  AllocationLine,
  AllocationPlan,
  AllocationReason,
  AllocationSource,
  AllocationStrategyKind,
  AllocationTraceEntry,
  AppliedCredit,
  CreditBalance,
  CreditOrder,
  ItemBalance,
  OutstandingItem,
} from './types';

/** The policy an unstated strategy falls back to: oldest invoice first. */
export const DEFAULT_STRATEGY: AllocationStrategyKind = 'oldest_first';

/** The order sources are consumed in when a caller does not state one: the payment, then credits. */
export const DEFAULT_CREDIT_ORDER: CreditOrder = 'payment_first';

function assertSameCurrency(amount: Money, expected: string, what: string): void {
  if (amount.currency !== expected) {
    throw new AllocationError(
      'currency_mismatch',
      `${what} is in ${amount.currency}, the payment in ${expected}`
    );
  }
}

/** The credit's available balance as a source the waterfall can consume. */
function creditSource(credit: CreditBalance): AllocationSource {
  return {
    id: credit.id,
    kind: 'credit',
    amount: credit.amount,
    learnerId: credit.learnerId,
    receivedOn: credit.issuedOn,
  };
}

/** A one-line explanation of why an amount went where it did. */
function describeReason(reason: AllocationReason): string {
  const parts: string[] = [reason.strategy, `ordered by ${reason.ordering}`];
  if (reason.tieBreak) parts.push(`tie-break ${reason.tieBreak}`);
  if (reason.weightMinor !== undefined && reason.weightSumMinor !== undefined) {
    parts.push(`weight ${reason.weightMinor}/${reason.weightSumMinor}`);
  }
  parts.push(
    reason.capped ? 'capped at the line balance' : reason.fullyCovered ? 'clears the line' : 'partial'
  );
  return parts.join(' · ');
}

/** The amount of a payment funded from a source, and the credits it consumed, by slot. */
interface Waterfall {
  readonly lines: readonly AllocationLine[];
  readonly consumed: readonly number[];
}

/**
 * Attributes each item's allocation to a source, consuming the sources in order.
 *
 * The strategies decide how much each line gets; this decides which document paid for it. It walks
 * the allocation order and fills each line from the first source with room left, so the payment is
 * exhausted before a credit is touched (or the other way round when the caller asks for it).
 */
function attributeToSources(
  allocations: readonly { itemId: string; amount: Money; reason: AllocationReason }[],
  itemsById: ReadonlyMap<string, OutstandingItem>,
  slots: readonly AllocationSource[],
  currency: Money['currency']
): Waterfall {
  const consumed = slots.map(() => 0);
  const lines: AllocationLine[] = [];
  let slotIndex = 0;
  for (const allocation of allocations) {
    const item = itemsById.get(allocation.itemId);
    if (!item) {
      throw new AllocationError('unknown_item', `a strategy allocated to line ${allocation.itemId}, which is not outstanding`);
    }
    let left = allocation.amount.amount_minor;
    while (left > 0) {
      while (slotIndex < slots.length && consumed[slotIndex] >= slots[slotIndex].amount.amount_minor) {
        slotIndex += 1;
      }
      if (slotIndex >= slots.length) {
        throw new AllocationError('plan_exceeds_balance', 'the allocation exceeds the money available');
      }
      const slot = slots[slotIndex];
      const room = slot.amount.amount_minor - consumed[slotIndex];
      const take = Math.min(left, room);
      consumed[slotIndex] += take;
      lines.push({
        itemId: item.id,
        invoiceId: item.invoiceId,
        invoiceNumber: item.invoiceNumber,
        learnerId: item.learnerId,
        amount: fromMinor(take, currency),
        sourceKind: slot.kind,
        sourceId: slot.id,
        reason: allocation.reason,
      });
      left -= take;
    }
  }
  return { lines, consumed };
}

/**
 * Plans how a payment pays a learner's outstanding lines, without changing anything.
 *
 * The strategies are pure and the plan is deterministic: the same input always yields the same
 * plan, and re-planning against lines the plan already cleared allocates nothing (they are no
 * longer outstanding). Applying a plan to lines that no longer carry the balance is refused —
 * `applyAllocationPlan` will not push a line below zero — which is the repository's own
 * over-allocation invariant, in the small.
 */
export function planAllocation(input: AllocationInput): AllocationPlan {
  const options = input.options ?? {};
  const strategy = options.strategy ?? DEFAULT_STRATEGY;
  const currency = input.source.amount.currency;
  // Validates the currency code itself, and gives the empty plan a currency to be zero in.
  zero(currency);

  if (input.source.amount.amount_minor < 0) {
    throw new AllocationError('negative_amount', 'the payment amount cannot be negative');
  }

  const items: OutstandingItem[] = [];
  for (const item of input.items) {
    assertSameCurrency(item.balance, currency, `line ${item.id}`);
    if (isNegative(item.balance)) {
      throw new AllocationError('negative_balance', `line ${item.id} has a negative balance`);
    }
    if (item.balance.amount_minor > 0) items.push(item);
  }

  const credits: CreditBalance[] = [];
  for (const credit of input.credits ?? []) {
    assertSameCurrency(credit.amount, currency, `credit ${credit.id}`);
    if (isNegative(credit.amount)) {
      throw new AllocationError('negative_balance', `credit ${credit.id} has a negative amount`);
    }
    if (credit.amount.amount_minor > 0) credits.push(credit);
  }

  const creditOrder = options.creditOrder ?? DEFAULT_CREDIT_ORDER;
  const slots: AllocationSource[] = [];
  const creditForSlot: (CreditBalance | null)[] = [];
  const pushCredit = (credit: CreditBalance) => {
    slots.push(creditSource(credit));
    creditForSlot.push(credit);
  };
  if (creditOrder === 'credit_first') for (const credit of credits) pushCredit(credit);
  slots.push({ ...input.source });
  creditForSlot.push(null);
  if (creditOrder === 'payment_first') for (const credit of credits) pushCredit(credit);
  const sourceSlotIndex = creditForSlot.findIndex((entry) => entry === null);

  const debt = totalBalance(items, currency);
  const available = slots.reduce((total, slot) => add(total, slot.amount), zero(currency));
  const need = minMoney(available, debt);
  const allocations = allocateByStrategy(strategy, need, items, options);

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const { lines, consumed } = attributeToSources(allocations, itemsById, slots, currency);

  const allocatedFromPayment = fromMinor(consumed[sourceSlotIndex] ?? 0, currency);
  const allocatedFromCredits = subtract(need, allocatedFromPayment);
  const unallocated = subtract(input.source.amount, allocatedFromPayment);

  const creditsApplied: AppliedCredit[] = [];
  const creditsUnused: AppliedCredit[] = [];
  credits.forEach((credit, index) => {
    const slotIndex = creditOrder === 'payment_first' ? index + 1 : index;
    const applied = fromMinor(consumed[slotIndex] ?? 0, currency);
    const entry: AppliedCredit = {
      id: credit.id,
      kind: credit.kind,
      available: credit.amount,
      applied,
    };
    if (compare(applied, credit.amount) < 0) creditsUnused.push(entry);
    if (applied.amount_minor > 0) creditsApplied.push(entry);
  });

  const appliedByItem = new Map<string, number>();
  for (const line of lines) {
    appliedByItem.set(line.itemId, (appliedByItem.get(line.itemId) ?? 0) + line.amount.amount_minor);
  }
  const remaining: ItemBalance[] = input.items.map((item) => {
    const applied = appliedByItem.get(item.id) ?? 0;
    return {
      itemId: item.id,
      invoiceId: item.invoiceId,
      balance: applied === 0 ? item.balance : subtract(item.balance, fromMinor(applied, currency)),
    };
  });

  const consumption =
    creditOrder === 'payment_first' ? 'payment then credits' : 'credits then payment';
  const trace: AllocationTraceEntry[] = [
    {
      code: 'strategy',
      message: `${strategy} over ${items.length} outstanding line(s) in ${currency}, sources consumed ${consumption}`,
    },
    ...lines.map<AllocationTraceEntry>((line) => ({
      code: 'allocation',
      message: `${describeReason(line.reason)} → ${line.invoiceNumber ?? line.invoiceId} / ${line.itemId}, funded by ${line.sourceKind} ${line.sourceId}`,
      itemId: line.itemId,
      sourceId: line.sourceId,
      amount: line.amount,
    })),
    ...creditsApplied.map<AllocationTraceEntry>((credit) => ({
      code: 'credit',
      message: `credit ${credit.id} applied ${credit.applied.amount_minor} of ${credit.available.amount_minor} minor units`,
      sourceId: credit.id,
      amount: credit.applied,
    })),
  ];
  if (unallocated.amount_minor > 0) {
    trace.push({
      code: 'remainder',
      message: `${unallocated.amount_minor} minor unit(s) unallocated, becoming learner credit`,
      amount: unallocated,
    });
  }

  return {
    strategy,
    currency,
    source: input.source,
    allocations: lines,
    credits: creditsApplied,
    unusedCredits: creditsUnused,
    allocated: need,
    allocatedFromPayment,
    allocatedFromCredits,
    unallocated,
    remaining,
    trace,
  };
}

/**
 * Reduces the outstanding lines by a plan, without touching anything else.
 *
 * A plan applied to the lines it was built from clears them; applying the same plan a second time
 * is refused, because the lines no longer carry the balance. The engine is the pure half of the
 * operation — the ledger (P3-A02) owns the write.
 */
export function applyAllocationPlan(
  items: readonly OutstandingItem[],
  plan: AllocationPlan
): readonly OutstandingItem[] {
  const appliedByItem = new Map<string, number>();
  for (const line of plan.allocations) {
    appliedByItem.set(line.itemId, (appliedByItem.get(line.itemId) ?? 0) + line.amount.amount_minor);
  }
  return items.map((item) => {
    const applied = appliedByItem.get(item.id) ?? 0;
    if (applied === 0) return item;
    if (applied > item.balance.amount_minor) {
      throw new AllocationError(
        'plan_exceeds_balance',
        `applying the plan would over-allocate line ${item.id} by ${applied - item.balance.amount_minor} minor unit(s)`
      );
    }
    return { ...item, balance: subtract(item.balance, fromMinor(applied, item.balance.currency)) };
  });
}
