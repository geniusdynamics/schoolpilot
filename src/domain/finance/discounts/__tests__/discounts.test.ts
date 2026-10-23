// ABOUTME: The discount rules engine, proven: every basis and its refusals, the cap that stops a
// ABOUTME: discount exceeding what it discounts, the precedence two rules apply in, the stacking
// ABOUTME: policies, and the composition with a fee item's own funding source.

import { describe, expect, it } from 'vitest';

import { fromMajor, fromMinor } from '@/domain/money';

import {
  DiscountError,
  applyDiscounts,
  assertDiscountBasis,
  assertDiscountRules,
  computeDiscount,
  discountableLine,
  isDiscountError,
  percentBasisPoints,
  ruleInPeriod,
  ruleScopesLine,
  siblingBasisForRank,
  siblingTierFor,
} from '..';
import { SPEC_SIBLING_POLICY } from '..';
import type { BillLineInput, DiscountRule, LearnerBillFacts, SiblingPolicy } from '..';
import { cappedBursaryFixtureRule, overLargeBursaryFixtureRule } from '../fixtures';

const KES = 'KES' as const;

function catchOf(action: () => unknown): unknown {
  try {
    action();
    return null;
  } catch (error) {
    return error;
  }
}

function line(overrides: Partial<BillLineInput> = {}): BillLineInput {
  return {
    feeItemId: 'fee-tuition',
    feeItemCode: 'TUITION',
    feeItemName: 'Tuition',
    fundingSource: 'parent',
    amount: fromMajor('6000', KES),
    ...overrides,
  };
}

function rule(overrides: Partial<DiscountRule> = {}): DiscountRule {
  return {
    id: 'rule-1',
    name: 'A discount',
    kind: 'other',
    basis: { kind: 'percent', percent: 10 },
    scope: {},
    period: {},
    reason: 'A discount on the fees',
    fundingSource: 'school',
    precedence: 50,
    ...overrides,
  };
}

function apply(
  rules: readonly DiscountRule[],
  lines: readonly BillLineInput[] = [line()],
  facts: LearnerBillFacts = { isStaffWard: false }
) {
  return applyDiscounts({
    lines: lines.map((entry) => discountableLine(entry, KES)),
    rules,
    facts,
    period: { on: '2027-02-01' },
    currency: KES,
  });
}

describe('the discount basis', () => {
  it('reads a percentage as basis points, refusing one that is not a percentage', () => {
    expect(percentBasisPoints(0, 'x')).toBe(0);
    expect(percentBasisPoints(5, 'x')).toBe(500);
    expect(percentBasisPoints(33.33, 'x')).toBe(3333);
    expect(percentBasisPoints(100, 'x')).toBe(10000);
    for (const bad of [-1, 100.01, Number.NaN, Number.POSITIVE_INFINITY, 33.333]) {
      expect(isDiscountError(catchOf(() => percentBasisPoints(bad, 'x')), 'discount_percent_invalid')).toBe(true);
    }
  });

  it('computes a percentage through the money module, exactly and rounded', () => {
    const base = fromMinor(600_000, KES);
    expect(computeDiscount({ kind: 'percent', percent: 5 }, base, KES).amount.amount_minor).toBe(30_000);
    expect(computeDiscount({ kind: 'percent', percent: 33.33 }, fromMinor(100_001, KES), KES).amount.amount_minor).toBe(
      33_330
    );
    // 33.33 % of 100 minor units is 33.33, which half-up rounds to 33.
    expect(computeDiscount({ kind: 'percent', percent: 33.33 }, fromMinor(100, KES), KES).amount.amount_minor).toBe(33);
  });

  it('applies the basis cap and says the cap did the work', () => {
    const base = fromMinor(600_000, KES);
    const capped = computeDiscount(
      { kind: 'percent', percent: 50, cap: fromMinor(200_000, KES) },
      base,
      KES
    );
    expect(capped.amount.amount_minor).toBe(200_000);
    expect(capped.basis).toBe('cap');
    expect(capped.capped).toBe(true);

    const underCap = computeDiscount(
      { kind: 'percent', percent: 10, cap: fromMinor(200_000, KES) },
      base,
      KES
    );
    expect(underCap.amount.amount_minor).toBe(60_000);
    expect(underCap.capped).toBe(false);
  });

  it('refuses a basis that is missing, malformed or in another currency', () => {
    expect(isDiscountError(catchOf(() => assertDiscountBasis(undefined, KES, 'x')), 'discount_basis_missing')).toBe(true);
    expect(
      isDiscountError(
        catchOf(() => assertDiscountBasis({ kind: 'amount', amount: fromMinor(0, KES) }, KES, 'x')),
        'discount_amount_invalid'
      )
    ).toBe(true);
    expect(
      isDiscountError(
        catchOf(() => assertDiscountBasis({ kind: 'amount', amount: fromMinor(100, 'UGX') }, KES, 'x')),
        'discount_amount_invalid'
      )
    ).toBe(true);
  });

  it('refuses a rule with no id, no name or a fractional precedence', () => {
    expect(isDiscountError(catchOf(() => assertDiscountRules([rule({ id: '' })], KES)), 'discount_rule_invalid')).toBe(
      true
    );
    expect(isDiscountError(catchOf(() => assertDiscountRules([rule({ name: ' ' })], KES)), 'discount_rule_invalid')).toBe(
      true
    );
    expect(
      isDiscountError(catchOf(() => assertDiscountRules([rule({ precedence: 1.5 })], KES)), 'discount_precedence_invalid')
    ).toBe(true);
    expect(
      isDiscountError(catchOf(() => assertDiscountRules([rule(), rule({ name: 'A twin' })], KES)), 'discount_rule_invalid')
    ).toBe(true);
  });
});

describe('the discount scope and period', () => {
  it('scopes by fee item id, by code, and by the item funding source', () => {
    const target = rule({ scope: { feeItemCodes: ['TUITION'] } });
    expect(ruleScopesLine(target, line())).toBe(true);
    expect(ruleScopesLine(target, line({ feeItemId: 'other', feeItemCode: 'ACTIVITY' }))).toBe(false);

    const byId = rule({ scope: { feeItemIds: ['fee-tuition'] } });
    expect(ruleScopesLine(byId, line())).toBe(true);

    // A capitation-funded item is not the family's to owe, so a discount that touches only
    // `parent` items does not reach it.
    const capitation = line({ fundingSource: 'government_capitation' });
    expect(ruleScopesLine(rule(), capitation)).toBe(false);
    expect(ruleScopesLine(rule({ scope: { fundingSources: ['government_capitation'] } }), capitation)).toBe(true);
  });

  it('applies only inside its period', () => {
    const dated = rule({ period: { startsOn: '2027-01-01', endsOn: '2027-03-31' } });
    expect(ruleInPeriod(dated, { on: '2027-01-01' })).toBe(true);
    expect(ruleInPeriod(dated, { on: '2027-02-15' })).toBe(true);
    expect(ruleInPeriod(dated, { on: '2027-03-31' })).toBe(true);
    expect(ruleInPeriod(dated, { on: '2027-06-01' })).toBe(false);

    const byPeriod = rule({ period: { periodIds: ['term-1'] } });
    expect(ruleInPeriod(byPeriod, { periodId: 'term-1', on: '2027-02-15' })).toBe(true);
    expect(ruleInPeriod(byPeriod, { periodId: 'term-2', on: '2027-02-15' })).toBe(false);
    expect(ruleInPeriod(byPeriod, { on: '2027-02-15' })).toBe(false);
  });

  it('does not discount a line another source funds, and says so', () => {
    const application = apply([rule()], [line({ fundingSource: 'government_capitation' })]);
    expect(application.applied).toHaveLength(0);
    expect(application.lines[0].learnerPayable.amount_minor).toBe(0);
    expect(application.lines[0].externallyFunded.amount_minor).toBe(600_000);
    expect(application.trace.join(' ')).toContain('nothing for the family to owe');
  });
});

describe('the cap that stops a discount exceeding what it discounts', () => {
  it('caps a percentage at the item it names', () => {
    const application = apply([cappedBursaryFixtureRule()], [line()], {
      isStaffWard: false,
      awardRuleIds: ['rule-bursary-capped'],
    });
    expect(application.applied[0].amount.amount_minor).toBe(200_000);
    expect(application.applied[0].basis).toBe('cap');
    expect(application.applied[0].capped).toBe(true);
    expect(application.lines[0].net.amount_minor).toBe(400_000);
  });

  it('caps a fixed amount at what is left, never taking the line below zero', () => {
    const application = apply([overLargeBursaryFixtureRule()], [line()], {
      isStaffWard: false,
      awardRuleIds: ['rule-bursary-oversized'],
    });
    expect(application.applied[0].amount.amount_minor).toBe(600_000);
    expect(application.applied[0].capped).toBe(true);
    expect(application.lines[0].net.amount_minor).toBe(0);
  });
});

describe('precedence and stacking', () => {
  const first = rule({ id: 'rule-a', name: 'First', precedence: 20, basis: { kind: 'amount', amount: fromMajor('1000', KES) } });
  const second = rule({ id: 'rule-b', name: 'Second', precedence: 30, basis: { kind: 'percent', percent: 50 } });

  it('applies the lowest precedence first, on what is left', () => {
    const application = apply([second, first]);
    expect(application.applied.map((discount) => discount.ruleId)).toEqual(['rule-a', 'rule-b']);
    // 6,000 - 1,000 = 5,000, and half of that is 2,500.
    expect(application.applied.map((discount) => discount.amount.amount_minor)).toEqual([100_000, 250_000]);
    expect(application.lines[0].net.amount_minor).toBe(250_000);
  });

  it('lets the order change the answer, which is why the order is stated', () => {
    const swapped = apply([
      { ...first, precedence: 30 },
      { ...second, precedence: 20 },
    ]);
    // Half of 6,000 is 3,000, then the 1,000 takes the rest: a different split of the same two rules.
    expect(swapped.applied.map((discount) => discount.amount.amount_minor)).toEqual([300_000, 100_000]);
    expect(swapped.lines[0].net.amount_minor).toBe(200_000);
  });

  it('breaks a precedence tie by rule id, so the order is total', () => {
    const twin = rule({ id: 'rule-a', name: 'A', precedence: 20, basis: { kind: 'amount', amount: fromMinor(100_000, KES) } });
    const other = rule({ id: 'rule-b', name: 'B', precedence: 20, basis: { kind: 'amount', amount: fromMinor(100_000, KES) } });
    expect(apply([other, twin]).applied.map((discount) => discount.ruleId)).toEqual(['rule-a', 'rule-b']);
  });

  it('takes only the largest under `highest_only`', () => {
    const application = applyDiscounts({
      lines: [discountableLine(line(), KES)],
      rules: [first, second],
      facts: { isStaffWard: false },
      period: { on: '2027-02-01' },
      currency: KES,
      options: { stacking: 'highest_only' },
    });
    expect(application.applied.map((discount) => discount.ruleId)).toEqual(['rule-b']);
    expect(application.applied[0].amount.amount_minor).toBe(300_000);
  });

  it('refuses a second rule under `refuse`', () => {
    const error = catchOf(() =>
      applyDiscounts({
        lines: [discountableLine(line(), KES)],
        rules: [first, second],
        facts: { isStaffWard: false },
        period: { on: '2027-02-01' },
        currency: KES,
        options: { stacking: 'refuse' },
      })
    );
    expect(isDiscountError(error, 'discount_stack_refused')).toBe(true);
  });

  it('refuses to share a line with an exclusive rule', () => {
    const error = catchOf(() => apply([{ ...first, exclusive: true }, second]));
    expect(isDiscountError(error, 'discount_stack_refused')).toBe(true);
    // An exclusive rule on its own is fine.
    expect(apply([{ ...first, exclusive: true }]).applied).toHaveLength(1);
  });

  it('lets a later rule take nothing when the first has taken everything', () => {
    const full = rule({ id: 'rule-full', precedence: 10, basis: { kind: 'percent', percent: 100 } });
    const application = apply([full, second]);
    expect(application.applied.map((discount) => discount.ruleId)).toEqual(['rule-full']);
    expect(application.lines[0].net.amount_minor).toBe(0);
  });
});

describe('the sibling policy', () => {
  it('names the tier a rank falls in, and no tier for the first child', () => {
    const policy: SiblingPolicy = SPEC_SIBLING_POLICY;
    expect(siblingTierFor(policy, 1)).toBeNull();
    expect(siblingTierFor(policy, 2)?.fromRank).toBe(2);
    expect(siblingTierFor(policy, 3)?.fromRank).toBe(3);
    expect(siblingTierFor(policy, 9)?.fromRank).toBe(3);
    expect(siblingBasisForRank(policy, 1)).toBeNull();
    expect(siblingBasisForRank(policy, 2)).toEqual({ kind: 'percent', percent: 5 });
    expect(siblingBasisForRank(policy, 3)).toEqual({ kind: 'percent', percent: 10 });
  });

  it('refuses a policy with overlapping tiers', () => {
    expect(
      isDiscountError(
        catchOf(() =>
          assertDiscountRules(
            [
              rule({
                kind: 'sibling',
                applicability: {
                  siblingPolicy: {
                    rankBy: 'provided',
                    tiers: [
                      { fromRank: 2, basis: { kind: 'percent', percent: 5 } },
                      { fromRank: 3, toRank: 4, basis: { kind: 'percent', percent: 10 } },
                    ],
                  },
                },
              }),
            ],
            KES
          )
        ),
        'sibling_policy_invalid'
      )
    ).toBe(true);
  });
});

describe('the discount error', () => {
  it('carries its code and its subject', () => {
    const error = new DiscountError('split_does_not_sum', 'the parts do not add up', 'bill-1');
    expect(error.code).toBe('split_does_not_sum');
    expect(error.subject).toBe('bill-1');
    expect(error.name).toBe('DiscountError');
    expect(isDiscountError(error)).toBe(true);
  });
});
