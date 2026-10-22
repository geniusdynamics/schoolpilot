// ABOUTME: The household split: divides one payment across siblings by a rule, then plans each
// ABOUTME: sibling's own outstanding lines, reporting the per-learner split and each plan.

import { add, allocate, subtract, zero, type CurrencyCode } from '@/domain/money';

import { AllocationError } from './errors';
import { planAllocation } from './plan';
import { totalBalance } from './strategies';
import type {
  AllocationTraceEntry,
  HouseholdAllocationInput,
  HouseholdAllocationPlan,
  HouseholdMember,
  HouseholdSplitRule,
  MemberShare,
} from './types';

/** The split an unstated rule falls back to: proportional to each sibling's outstanding debt. */
export const DEFAULT_HOUSEHOLD_SPLIT: HouseholdSplitRule = { kind: 'proportional' };

/** The weight each sibling carries in the split, read exactly (the shares are minor units). */
function splitWeights(
  split: HouseholdSplitRule,
  members: readonly HouseholdMember[],
  currency: CurrencyCode
): number[] {
  switch (split.kind) {
    case 'equal':
      return members.map(() => 1);
    case 'proportional':
      return members.map((member) =>
        totalBalance(
          member.items.filter((item) => item.balance.amount_minor > 0),
          currency
        ).amount_minor
      );
    case 'manual':
      return members.map((member) => {
        const weight = split.shares[member.learnerId] ?? 0;
        if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) {
          throw new AllocationError(
            'invalid_share',
            `the household share for learner ${member.learnerId} must be a non-negative finite number; got ${String(weight)}`
          );
        }
        return weight;
      });
    default:
      throw new AllocationError('unknown_strategy', 'unknown household split rule');
  }
}

/**
 * Plans one household payment across several siblings.
 *
 * The payment is divided across the siblings first — proportionally to their debt, equally, or by
 * the weights the caller states — through the money module's `allocate`, so the shares sum to the
 * payment exactly. Each sibling's share is then planned against that sibling's own lines with the
 * chosen strategy, and its own credits.
 */
export function planHouseholdAllocation(input: HouseholdAllocationInput): HouseholdAllocationPlan {
  const currency = input.source.amount.currency;
  zero(currency);
  const options = input.options ?? {};
  const split = input.split ?? DEFAULT_HOUSEHOLD_SPLIT;

  const seen = new Set<string>();
  for (const member of input.members) {
    if (seen.has(member.learnerId)) {
      throw new AllocationError('duplicate_member', `the household names learner ${member.learnerId} twice`);
    }
    seen.add(member.learnerId);
  }

  const weights = splitWeights(split, input.members, currency);
  const totalWeight = weights.reduce((running, weight) => running + weight, 0);
  const shares: MemberShare[] =
    input.members.length > 0 && totalWeight > 0
      ? allocate(input.source.amount, weights).map((amount, index) => ({
          learnerId: input.members[index].learnerId,
          amount,
        }))
      : input.members.map((member) => ({ learnerId: member.learnerId, amount: zero(currency) }));

  const plans = input.members.map((member, index) =>
    planAllocation({
      source: { ...input.source, amount: shares[index].amount, learnerId: member.learnerId },
      items: member.items,
      credits: member.credits,
      options,
    })
  );

  const allocated = plans.reduce((total, plan) => add(total, plan.allocatedFromPayment), zero(currency));
  const unallocated = subtract(input.source.amount, allocated);

  const trace: AllocationTraceEntry[] = [
    {
      code: 'strategy',
      message: `household split ${split.kind} across ${input.members.length} sibling(s)`,
    },
    ...shares.map<AllocationTraceEntry>((share) => ({
      code: 'order',
      message: `learner ${share.learnerId} takes ${share.amount.amount_minor} minor unit(s) of the payment`,
      amount: share.amount,
    })),
    ...plans.flatMap((plan) => plan.trace),
  ];
  if (unallocated.amount_minor > 0) {
    trace.push({
      code: 'remainder',
      message: `${unallocated.amount_minor} minor unit(s) unallocated, becoming learner credit`,
      amount: unallocated,
    });
  }

  return {
    source: input.source,
    split: split.kind,
    shares,
    plans,
    allocated,
    unallocated,
    trace,
  };
}
