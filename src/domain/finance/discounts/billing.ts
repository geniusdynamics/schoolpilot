// ABOUTME: The billing seam: the pure function a billing run calls for one learner and one period,
// ABOUTME: returning every discount and split share that applies and why, with the parts summing to
// ABOUTME: the bill exactly.

import { add, multiplyRational, subtract, zero, type CurrencyCode, type Money } from '@/domain/money';

import { budgetStatuses } from './budget';
import { DiscountError } from './errors';
import { applyDiscounts, computeDiscount, discountableLine, percentBasisPoints } from './rules';
import { DEFAULT_SPONSOR_RISK, planSplit, sponsorSharesOf, type SplitPayer } from './split';
import type {
  DiscountFundingSource,
  LearnerBillInput,
  LearnerBillPlan,
  PlannedLine,
  SponsorRiskPolicy,
  SponsorshipAgreement,
} from './types';

/** The name and id a bill's family payer gets when the caller names neither. */
export const DEFAULT_FAMILY_PAYER = { payerId: 'family', name: 'Learner / guardian' } as const;

/** What the family owes on a line before the awards a third party funds are taken out. */
function familyBaseOf(line: PlannedLine, currency: CurrencyCode): Money {
  const school = line.discounts
    .filter((discount) => discount.fundingSource === 'school')
    .reduce((total, discount) => add(total, discount.amount), zero(currency));
  return subtract(line.learnerPayable, school);
}

/**
 * Plans one learner's bill for one period: every discount and split share that applies, and why.
 *
 * This is the seam a billing run (P3-C01) calls, and it is **pure**: it reads the rules, the
 * sponsorships, the budgets and the facts it is given and writes nothing. The run loads those from
 * the canonical repository (`DiscountService`) and posts the plan: the learner invoice carries the
 * family's residual and a discount line per school-funded discount (spec 05 §2.3, "all discounts are
 * explicit invoice lines (negative) or credit notes"), and each sponsor share is its own sponsor
 * invoice, which is the receivable that clears when the sponsor's money arrives.
 *
 * The split covers what the family and its sponsors owe: the lines the family funds, less the
 * discounts the school forgoes. An award a third party funds is **not** a reduction of the family's
 * bill - it is that third party's share, so it becomes a sponsor on the split. The parts of the
 * split sum to that base exactly, through the money module's allocator.
 */
export function planLearnerBill(input: LearnerBillInput): LearnerBillPlan {
  const currency = input.currency;
  if (typeof input.learnerId !== 'string' || input.learnerId.trim() === '') {
    throw new DiscountError('discount_rule_invalid', 'a bill needs the learner it is for', 'the learner');
  }
  if (input.period === undefined || typeof input.period.on !== 'string' || input.period.on.length < 10) {
    throw new DiscountError('discount_rule_invalid', 'a bill needs the period it is for', 'the period');
  }

  const lines = input.lines.map((line) => discountableLine(line, currency));
  const options = input.options ?? {};
  const sponsorRisk: SponsorRiskPolicy = options.sponsorRisk ?? DEFAULT_SPONSOR_RISK;

  const application = applyDiscounts({
    lines,
    rules: input.rules,
    facts: input.facts,
    period: input.period,
    currency,
    options,
  });

  const trace: string[] = [...application.trace];

  const grossBill = application.lines.reduce((total, line) => add(total, line.gross), zero(currency));
  const externallyFunded = application.lines.reduce(
    (total, line) => add(total, line.externallyFunded),
    zero(currency)
  );
  const learnerBill = application.lines.reduce(
    (total, line) => add(total, familyBaseOf(line, currency)),
    zero(currency)
  );

  // The payers: the family's residual, the sponsorships that are in force, and the awards a third
  // party funds. The family goes first so the shares read in the order a bursar expects.
  const family = input.family ?? DEFAULT_FAMILY_PAYER;
  const payers: SplitPayer[] = [
    { payerId: family.payerId ?? DEFAULT_FAMILY_PAYER.payerId, kind: 'family', name: family.name ?? DEFAULT_FAMILY_PAYER.name },
  ];

  for (const agreement of input.sponsorships ?? []) {
    const payer = sponsorshipSplitPayer(agreement, input, application.lines, currency, options);
    if (payer !== null) {
      payers.push(payer);
      trace.push(
        `${agreement.sponsorName} covers ${describePayer(payer)} of the bill under the sponsorship "${agreement.id}"`
      );
    }
  }

  for (const award of application.applied.filter((discount) => discount.fundingSource !== 'school')) {
    payers.push({
      payerId: `award:${award.ruleId}:${award.feeItemId}`,
      kind: 'sponsor',
      name: award.name,
      fundingSource: award.fundingSource,
      agreedAmount: award.amount,
      source: { kind: 'award', id: award.ruleId },
    });
    trace.push(
      `${award.name} is funded by ${award.fundingSource}, so its ${award.amount.amount_minor} ${currency} is that ` +
        `funder's share of the bill, not a reduction of the family's`
    );
  }

  const split = planSplit(learnerBill, payers);
  const familyShare = split.shares.find((share) => share.kind === 'family')?.amount ?? zero(currency);
  const sponsorShares = sponsorSharesOf(split);

  const proposedBySource = new Map<DiscountFundingSource, Money>();
  for (const discount of application.applied) {
    proposedBySource.set(
      discount.fundingSource,
      add(proposedBySource.get(discount.fundingSource) ?? zero(currency), discount.amount)
    );
  }
  const budgets = budgetStatuses(input.budgets ?? [], proposedBySource, options.budgetOverspend);
  for (const status of budgets) {
    trace.push(
      `${status.name}: ${status.committedAfter.amount_minor} of ${status.budget.amount_minor} ${currency} ` +
        `committed` +
        (status.withinBudget
          ? ''
          : `, an overspend of ${status.overspend.amount_minor} recorded under the ${status.policy} policy`)
    );
  }

  return {
    learnerId: input.learnerId,
    institutionId: input.institutionId,
    currency,
    period: input.period,
    lines: application.lines,
    grossBill,
    externallyFunded,
    schoolDiscountTotal: application.schoolDiscountTotal,
    awardTotal: application.awardTotal,
    learnerBill,
    split,
    familyShare,
    sponsorShares,
    sponsorRisk,
    budgets,
    trace,
  };
}

/**
 * The split payer a sponsorship is, or null when it covers nothing on this bill.
 *
 * An unscoped sponsorship covers a share of the whole bill and stays a share payer. A sponsorship
 * scoped to fee items covers a share of **those items' subtotal**, which is an amount on this bill,
 * so it becomes an amount payer: the share is exact for the lines it names rather than for the bill.
 * A sponsorship none of whose items the learner is billed does not apply, and says so.
 */
function sponsorshipSplitPayer(
  agreement: SponsorshipAgreement,
  input: LearnerBillInput,
  lines: readonly PlannedLine[],
  currency: CurrencyCode,
  options: LearnerBillInput['options']
): SplitPayer | null {
  const period = { periodId: input.period.periodId, on: input.period.on };
  if (agreement.startsOn !== undefined && period.on < agreement.startsOn) return null;
  if (agreement.endsOn !== undefined && period.on > agreement.endsOn) return null;

  const scoped = agreement.feeItemIds !== undefined && agreement.feeItemIds.length > 0;
  if (scoped) {
    const covered = lines
      .filter((line) => (agreement.feeItemIds as readonly string[]).includes(line.feeItemId))
      .reduce((total, line) => add(total, familyBaseOf(line, currency)), zero(currency));
    if (covered.amount_minor <= 0) return null;
    if (agreement.sharePercent !== undefined) {
      const points = percentBasisPoints(agreement.sharePercent, `${agreement.sponsorName}'s share`);
      const rounding = options?.rounding ?? 'half_up';
      return {
        payerId: agreement.id,
        kind: 'sponsor',
        name: agreement.sponsorName,
        fundingSource: agreement.fundingSource,
        agreedAmount: multiplyRational(covered, points, 10000, rounding),
        source: { kind: 'sponsorship', id: agreement.id },
      };
    }
    if (agreement.agreedAmount === undefined) {
      throw new DiscountError(
        'sponsorship_invalid',
        `the sponsorship "${agreement.id}" names neither a share nor an amount`,
        agreement.id
      );
    }
    return {
      payerId: agreement.id,
      kind: 'sponsor',
      name: agreement.sponsorName,
      fundingSource: agreement.fundingSource,
      agreedAmount: agreement.agreedAmount,
      source: { kind: 'sponsorship', id: agreement.id },
    };
  }

  if (agreement.sharePercent === undefined && agreement.agreedAmount === undefined) {
    throw new DiscountError(
      'sponsorship_invalid',
      `the sponsorship "${agreement.id}" names neither a share nor an amount`,
      agreement.id
    );
  }
  return {
    payerId: agreement.id,
    kind: 'sponsor',
    name: agreement.sponsorName,
    fundingSource: agreement.fundingSource,
    ...(agreement.sharePercent === undefined ? {} : { sharePercent: agreement.sharePercent }),
    ...(agreement.agreedAmount === undefined ? {} : { agreedAmount: agreement.agreedAmount }),
    source: { kind: 'sponsorship', id: agreement.id },
  };
}

/** How a payer's agreement reads in the trace. */
function describePayer(payer: SplitPayer): string {
  if (payer.sharePercent !== undefined) return `${payer.sharePercent}%`;
  if (payer.agreedAmount !== undefined) return `${payer.agreedAmount.amount_minor} minor units`;
  return 'nothing';
}

/**
 * The amount a discount rule would take off an amount, as a screen previews a rule without planning
 * a whole bill. It is the same arithmetic the plan uses.
 */
export function previewDiscount(
  rule: LearnerBillInput['rules'][number],
  base: Money,
  rounding: NonNullable<LearnerBillInput['options']>['rounding'] = 'half_up'
): Money {
  return computeDiscount(rule.basis, base, base.currency, rounding).amount;
}
