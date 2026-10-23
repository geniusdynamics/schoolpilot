// ABOUTME: Split billing: divides a learner's bill between the family and its sponsors so the parts
// ABOUTME: sum to the bill exactly through the money module's allocator, and says what a sponsor's
// ABOUTME: shortfall does to the learner's balance.

import { add, allocate, compare, isZero, subtract, zero, type Money } from '@/domain/money';

import { DiscountError } from './errors';
import { percentBasisPoints } from './rules';
import type {
  BillSplit,
  DiscountFundingSource,
  SponsorRiskPolicy,
  SponsorShare,
  SplitShare,
  SponsorshipAgreement,
} from './types';

/** The payer a bill's residual falls to. Exactly one is required. */
export interface SplitPayer {
  readonly payerId: string;
  readonly kind: 'family' | 'sponsor';
  readonly name: string;
  readonly fundingSource?: DiscountFundingSource;
  /** The share of the bill this payer covers, as a percentage of at most two decimals. */
  readonly sharePercent?: number;
  /** The fixed amount this payer agreed to cover, instead of a share. */
  readonly agreedAmount?: Money;
  /** Where a sponsor share came from, so a plan can say it. */
  readonly source?: SponsorShare['source'];
}

/** The policy an unstated sponsor risk falls back to: the sponsor carries its own shortfall. */
export const DEFAULT_SPONSOR_RISK: SponsorRiskPolicy = 'sponsor_liability';

/**
 * Splits a bill across the family and its sponsors.
 *
 * The sponsors' agreed shares are percentages of the bill, and the family takes the residual. The
 * split runs through the money module's `allocate`, so the parts **sum to the bill exactly** and the
 * odd minor unit goes to the payer with the largest remainder, in payer order when the remainders
 * tie: the same bill and the same agreements always give the same parts.
 *
 * An agreed **amount** is honoured to the shilling: the family's residual absorbs it, so a sponsor
 * that agreed 5,000 pays 5,000 and the family pays the rest. A sponsor whose amount the residual
 * cannot absorb is refused rather than pushing the family below zero.
 */
export function planSplit(total: Money, payers: readonly SplitPayer[]): BillSplit {
  if (total.amount_minor < 0) {
    throw new DiscountError('split_amount_invalid', 'a bill cannot be negative', 'the bill');
  }
  const families = payers.filter((payer) => payer.kind === 'family');
  if (families.length !== 1) {
    throw new DiscountError(
      'split_family_invalid',
      `a split names exactly one family payer, the one the residual falls to; got ${families.length}`,
      'the family'
    );
  }
  const family = families[0];
  const sponsors = payers.filter((payer) => payer.kind === 'sponsor');

  const shareSponsors: SplitPayer[] = [];
  const amountSponsors: SplitPayer[] = [];
  let shareBasisPoints = 0;
  for (const sponsor of sponsors) {
    const hasShare = sponsor.sharePercent !== undefined;
    const hasAmount = sponsor.agreedAmount !== undefined;
    if (hasShare === hasAmount) {
      throw new DiscountError(
        'sponsorship_invalid',
        `${sponsor.name} must state exactly one of an agreed share and an agreed amount`,
        sponsor.payerId
      );
    }
    if (hasShare) {
      shareBasisPoints += percentBasisPoints(sponsor.sharePercent as number, `${sponsor.name}'s share`);
      shareSponsors.push(sponsor);
    } else {
      const amount = sponsor.agreedAmount as Money;
      if (
        amount === null ||
        typeof amount !== 'object' ||
        !Number.isSafeInteger(amount.amount_minor) ||
        amount.amount_minor <= 0 ||
        amount.currency !== total.currency
      ) {
        throw new DiscountError(
          'split_amount_invalid',
          `${sponsor.name}'s agreed amount must be a positive ${total.currency} figure`,
          sponsor.payerId
        );
      }
      amountSponsors.push(sponsor);
    }
  }
  if (shareBasisPoints > 10000) {
    throw new DiscountError(
      'split_share_exceeds_bill',
      `the sponsors' agreed shares add up to ${shareBasisPoints / 100}%, more than the whole bill`,
      'the sponsors'
    );
  }

  // The family's weight is whatever the sponsors' shares leave: the residual, exactly.
  const familyBasisPoints = 10000 - shareBasisPoints;
  const weights = [...shareSponsors.map((sponsor) => percentBasisPoints(sponsor.sharePercent as number, sponsor.name)), familyBasisPoints];
  const parts = allocate(total, weights);

  const shareOf = new Map<string, SplitShare>();
  shareSponsors.forEach((sponsor, index) => {
    shareOf.set(sponsor.payerId, {
      payerId: sponsor.payerId,
      kind: 'sponsor',
      name: sponsor.name,
      ...(sponsor.fundingSource === undefined ? {} : { fundingSource: sponsor.fundingSource }),
      amount: parts[index],
      basis: 'share',
      ...(sponsor.source === undefined ? {} : { source: sponsor.source }),
    });
  });
  let familyAmount = parts[parts.length - 1];

  for (const sponsor of amountSponsors) {
    const amount = sponsor.agreedAmount as Money;
    if (compare(amount, familyAmount) > 0) {
      throw new DiscountError(
        'split_sponsor_exceeds_bill',
        `${sponsor.name} agreed ${amount.amount_minor} ${total.currency}, but the family's residual is only ` +
          `${familyAmount.amount_minor}; the sponsors together exceed the bill`,
        sponsor.payerId
      );
    }
    shareOf.set(sponsor.payerId, {
      payerId: sponsor.payerId,
      kind: 'sponsor',
      name: sponsor.name,
      ...(sponsor.fundingSource === undefined ? {} : { fundingSource: sponsor.fundingSource }),
      amount,
      basis: 'agreed_amount',
      ...(sponsor.source === undefined ? {} : { source: sponsor.source }),
    });
    familyAmount = subtract(familyAmount, amount);
  }

  shareOf.set(family.payerId, {
    payerId: family.payerId,
    kind: 'family',
    name: family.name,
    amount: familyAmount,
    basis: 'residual',
  });

  const shares = payers.map((payer) => shareOf.get(payer.payerId) as SplitShare);
  const summed = shares.reduce((running, share) => add(running, share.amount), zero(total.currency));
  const exact = summed.amount_minor === total.amount_minor;
  if (!exact) {
    throw new DiscountError(
      'split_does_not_sum',
      `the split sums to ${summed.amount_minor} ${total.currency} but the bill is ${total.amount_minor}; ` +
        'this is an invariant of the allocator and must not happen',
      'the bill'
    );
  }

  return { total, shares, exact };
}

/** Turns a sponsorship agreement into the split payer it is. */
export function sponsorshipPayer(agreement: SponsorshipAgreement): SplitPayer {
  const hasShare = agreement.sharePercent !== undefined;
  const hasAmount = agreement.agreedAmount !== undefined;
  if (hasShare === hasAmount) {
    throw new DiscountError(
      'sponsorship_invalid',
      `the sponsorship "${agreement.id}" must state exactly one of a share and an amount`,
      agreement.id
    );
  }
  return {
    payerId: agreement.id,
    kind: 'sponsor',
    name: agreement.sponsorName,
    fundingSource: agreement.fundingSource,
    ...(hasShare ? { sharePercent: agreement.sharePercent as number } : {}),
    ...(hasAmount ? { agreedAmount: agreement.agreedAmount as Money } : {}),
    source: { kind: 'sponsorship', id: agreement.id },
  };
}

/** The sponsor shares of a split, with how each reaches the ledger. */
export function sponsorSharesOf(split: BillSplit): readonly SponsorShare[] {
  const shares: SponsorShare[] = [];
  for (const share of split.shares) {
    if (share.kind !== 'sponsor') continue;
    shares.push({
      ...share,
      kind: 'sponsor',
      invoice: 'sponsor_invoice',
      posting: 'sponsor_receivable_on_invoice_cleared_on_receipt',
      source: share.source ?? { kind: 'sponsorship', id: share.payerId },
    });
  }
  return shares;
}

/** What a sponsor paid against its share. */
export interface SponsorPayment {
  readonly payerId: string;
  readonly received: Money;
}

/** How one sponsor's share settled. */
export interface SponsorSettlement {
  readonly payerId: string;
  readonly name: string;
  readonly share: Money;
  readonly received: Money;
  /** What the sponsor still owes; positive when it underpaid. */
  readonly shortfall: Money;
  /** What it paid beyond its share; positive when it overpaid. */
  readonly overpaid: Money;
  /** Who the shortfall sits against. */
  readonly outstandingAgainst: 'sponsor' | 'learner';
  /** What the shortfall adds to the learner's balance; zero under `sponsor_liability`. */
  readonly learnerBalanceEffect: Money;
}

/** The result of settling a bill's sponsors. */
export interface SponsorSettlementResult {
  readonly policy: SponsorRiskPolicy;
  readonly settlements: readonly SponsorSettlement[];
  /** The learner's balance before the settlement. */
  readonly learnerBalanceBefore: Money;
  /** The learner's balance after it. */
  readonly learnerBalanceAfter: Money;
  /** What the sponsors together still owe the school. */
  readonly sponsorOutstanding: Money;
}

/**
 * Settles what the sponsors paid against their shares of a bill.
 *
 * A sponsor's share is money that arrives from a third party. Until it arrives it is the sponsor's
 * receivable, not the learner's: under `sponsor_liability` (the default) an underpayment or a
 * non-payment leaves the **learner's balance untouched** and the shortfall against the sponsor. A
 * school whose agreement makes the family guarantee the sponsored part states `family_liability`,
 * and the shortfall moves onto the learner's balance instead.
 */
export function settleSponsors(
  split: BillSplit,
  payments: readonly SponsorPayment[],
  options: {
    readonly policy?: SponsorRiskPolicy;
    readonly learnerBalance: Money;
  }
): SponsorSettlementResult {
  const policy = options.policy ?? DEFAULT_SPONSOR_RISK;
  const currency = split.total.currency;
  const receivedByPayer = new Map(payments.map((payment) => [payment.payerId, payment.received]));

  let learnerBalanceAfter = options.learnerBalance;
  let sponsorOutstanding = zero(currency);
  const settlements: SponsorSettlement[] = [];

  for (const share of split.shares) {
    if (share.kind !== 'sponsor') continue;
    const received = receivedByPayer.get(share.payerId) ?? zero(currency);
    if (received.currency !== currency) {
      throw new DiscountError(
        'split_amount_invalid',
        `${share.name}'s payment is ${received.currency}, but the bill is ${currency}`,
        share.payerId
      );
    }
    const shortfall = compare(received, share.amount) < 0 ? subtract(share.amount, received) : zero(currency);
    const overpaid = compare(received, share.amount) > 0 ? subtract(received, share.amount) : zero(currency);
    const onLearner = policy === 'family_liability' && !isZero(shortfall);
    if (onLearner) learnerBalanceAfter = add(learnerBalanceAfter, shortfall);
    if (!onLearner && !isZero(shortfall)) sponsorOutstanding = add(sponsorOutstanding, shortfall);
    settlements.push({
      payerId: share.payerId,
      name: share.name,
      share: share.amount,
      received,
      shortfall,
      overpaid,
      outstandingAgainst: onLearner ? 'learner' : 'sponsor',
      learnerBalanceEffect: onLearner ? shortfall : zero(currency),
    });
  }

  return {
    policy,
    settlements,
    learnerBalanceBefore: options.learnerBalance,
    learnerBalanceAfter,
    sponsorOutstanding,
  };
}
