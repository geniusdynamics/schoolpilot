// ABOUTME: Reads the discounts module's split into the household view a household statement shows:
// ABOUTME: per child the family's residual and each sponsor's part, side by side rather than netted.

import type { LearnerBillPlan } from '@/domain/finance/discounts';
import { add, isZero, zero, type CurrencyCode, type Money } from '@/domain/money';

import type { HouseholdMemberSplit, HouseholdSplit, HouseholdSponsorShare } from './types';

/**
 * One learner's split, read from the bill plan the discounts module produced.
 *
 * The family's share is the plan's residual and each sponsor's share is the plan's sponsor share;
 * nothing is recomputed here, so a household statement shows exactly the split the bill was posted
 * with - the sponsored part visible next to the family's rather than subtracted from it.
 */
export function memberSplitFromBillPlan(
  learnerId: string,
  learnerName: string,
  plan: LearnerBillPlan
): HouseholdMemberSplit {
  const family = plan.split.shares.find((share) => share.kind === 'family');
  const sponsors: HouseholdSponsorShare[] = plan.split.shares
    .filter((share) => share.kind === 'sponsor')
    .map((share) => ({
      payerId: share.payerId,
      name: share.name,
      ...(share.fundingSource === undefined ? {} : { fundingSource: share.fundingSource }),
      amount: share.amount,
    }));
  return {
    learnerId,
    learnerName,
    familyShare: family?.amount ?? zero(plan.currency),
    sponsorShares: sponsors,
    total: plan.split.total,
  };
}

/** Builds a household's split from its members' parts, summing the family's and the sponsors'. */
export function householdSplit(
  householdId: string,
  currency: CurrencyCode,
  members: readonly HouseholdMemberSplit[]
): HouseholdSplit {
  let familyTotal = zero(currency);
  let sponsorTotal = zero(currency);
  for (const member of members) {
    familyTotal = add(familyTotal, member.familyShare);
    for (const sponsor of member.sponsorShares) sponsorTotal = add(sponsorTotal, sponsor.amount);
  }
  return {
    householdId,
    currency,
    members,
    familyTotal,
    sponsorTotal,
    total: add(familyTotal, sponsorTotal),
  };
}

/** True when a split carries no money at all: a household whose children hold no invoice. */
export function isEmptySplit(split: HouseholdSplit): boolean {
  return isZero(split.familyTotal) && isZero(split.sponsorTotal);
}

/** A split with no members, for a household that holds no bill. */
export function emptyHouseholdSplit(householdId: string, currency: CurrencyCode): HouseholdSplit {
  return householdSplit(householdId, currency, []);
}

/** The money a split's members hold for one sponsor, by payer id. */
export function sponsorTotalFor(split: HouseholdSplit, payerId: string): Money {
  let total = zero(split.currency);
  for (const member of split.members) {
    for (const sponsor of member.sponsorShares) {
      if (sponsor.payerId === payerId) total = add(total, sponsor.amount);
    }
  }
  return total;
}
