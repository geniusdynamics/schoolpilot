// ABOUTME: The sibling discount fixture of spec 05 §2.3: a household of three children, the rule's
// ABOUTME: tiers, and the exact shillings each child owes; and the staff-ward rule beside it.

import { describe, expect, it } from 'vitest';

import { fromMajor, fromMinor } from '@/domain/money';

import {
  FIXTURE_CURRENCY,
  SIBLING_CHILD_BILL,
  SIBLING_EXPECTED,
  SIBLING_HOUSEHOLD,
  siblingFixtureRule,
  staffWardFixtureRule,
} from '../fixtures';
import { planLearnerBill, rankSiblingsByAdmission, siblingRule } from '..';

const INSTITUTION = 'inst-mwangaza';
const PERIOD = { on: '2027-02-01' };

describe('the sibling discount fixture', () => {
  it('ranks the household deterministically, ties broken by learner id', () => {
    expect(rankSiblingsByAdmission(SIBLING_HOUSEHOLD).map((child) => [child.learnerId, child.rank])).toEqual([
      ['lrn-amina', 1],
      ['lrn-brian', 2],
      ['lrn-chloe', 3],
    ]);

    const tied = rankSiblingsByAdmission([
      { learnerId: 'lrn-zoe', admittedOn: '2025-01-06' },
      { learnerId: 'lrn-abe', admittedOn: '2025-01-06' },
    ]);
    expect(tied.map((child) => child.learnerId)).toEqual(['lrn-abe', 'lrn-zoe']);
    // The ranking does not depend on the order the caller lists the children in: the eldest is
    // always rank 1.
    expect(rankSiblingsByAdmission([...SIBLING_HOUSEHOLD].reverse()).map((child) => child.learnerId)).toEqual([
      'lrn-amina',
      'lrn-brian',
      'lrn-chloe',
    ]);
    expect(rankSiblingsByAdmission([...SIBLING_HOUSEHOLD].reverse()).map((child) => child.rank)).toEqual([1, 2, 3]);
  });

  it('gives the second child 5 % and the third 10 % of tuition, and the first nothing', () => {
    const ranks = new Map(rankSiblingsByAdmission(SIBLING_HOUSEHOLD).map((child) => [child.learnerId, child.rank]));
    const rule = siblingFixtureRule();

    for (const expected of SIBLING_EXPECTED) {
      const plan = planLearnerBill({
        learnerId: expected.learnerId,
        institutionId: INSTITUTION,
        currency: FIXTURE_CURRENCY,
        period: PERIOD,
        lines: SIBLING_CHILD_BILL,
        rules: [rule],
        facts: { isStaffWard: false, siblingRank: ranks.get(expected.learnerId) },
      });

      expect(plan.grossBill.amount_minor).toBe(SIBLING_CHILD_BILL.reduce((total, entry) => total + entry.amount.amount_minor, 0));
      expect(plan.schoolDiscountTotal.amount_minor).toBe(expected.discountMinor);
      expect(plan.learnerBill.amount_minor).toBe(expected.netMinor);
      expect(plan.familyShare.amount_minor).toBe(expected.netMinor);
      expect(plan.split.exact).toBe(true);
      expect(plan.sponsorShares).toHaveLength(0);

      const tuition = plan.lines.find((entry) => entry.feeItemCode === 'TUITION');
      const activity = plan.lines.find((entry) => entry.feeItemCode === 'ACTIVITY');
      expect(tuition?.net.amount_minor).toBe(600_000 - expected.discountMinor);
      // The rule's scope is tuition, as the spec's example states: the activity fee is untouched.
      expect(activity?.net.amount_minor).toBe(100_000);
      expect(activity?.discounts).toHaveLength(0);

      if (expected.discountMinor === 0) {
        expect(tuition?.discounts).toHaveLength(0);
      } else {
        expect(tuition?.discounts[0].reason).toBe('Sibling discount on tuition');
        expect(tuition?.discounts[0].amount.amount_minor).toBe(expected.discountMinor);
      }
    }
  });

  it('is configurable: a school states its own tiers, and the engine reads them', () => {
    const policy = {
      rankBy: 'provided' as const,
      tiers: [
        { fromRank: 2, toRank: 2, basis: { kind: 'percent' as const, percent: 15 } },
        { fromRank: 3, basis: { kind: 'percent' as const, percent: 25 } },
      ],
    };
    const rule = siblingRule({
      id: 'rule-sibling-local',
      name: 'Our sibling policy',
      basis: { kind: 'percent', percent: 0 },
      policy,
      feeItemCodes: ['TUITION'],
    });

    const second = planLearnerBill({
      learnerId: 'lrn-brian',
      institutionId: INSTITUTION,
      currency: FIXTURE_CURRENCY,
      period: PERIOD,
      lines: SIBLING_CHILD_BILL,
      rules: [rule],
      facts: { isStaffWard: false, siblingRank: 2 },
    });
    expect(second.schoolDiscountTotal.amount_minor).toBe(90_000);

    const third = planLearnerBill({
      learnerId: 'lrn-chloe',
      institutionId: INSTITUTION,
      currency: FIXTURE_CURRENCY,
      period: PERIOD,
      lines: SIBLING_CHILD_BILL,
      rules: [rule],
      facts: { isStaffWard: false, siblingRank: 3 },
    });
    expect(third.schoolDiscountTotal.amount_minor).toBe(150_000);
  });

  it('gives a member of staff child the staff-ward discount', () => {
    const plan = planLearnerBill({
      learnerId: 'lrn-staff',
      institutionId: INSTITUTION,
      currency: FIXTURE_CURRENCY,
      period: PERIOD,
      lines: SIBLING_CHILD_BILL,
      rules: [staffWardFixtureRule()],
      facts: { isStaffWard: true },
    });
    expect(plan.schoolDiscountTotal.amount_minor).toBe(300_000);
    expect(plan.learnerBill.amount_minor).toBe(400_000);
  });

  it('does not reach a learner who is not a staff ward', () => {
    const plan = planLearnerBill({
      learnerId: 'lrn-other',
      institutionId: INSTITUTION,
      currency: FIXTURE_CURRENCY,
      period: PERIOD,
      lines: SIBLING_CHILD_BILL,
      rules: [staffWardFixtureRule()],
      facts: { isStaffWard: false },
    });
    expect(plan.schoolDiscountTotal.amount_minor).toBe(0);
    expect(plan.learnerBill.amount_minor).toBe(700_000);
  });

  it('leaves a child with no sibling rank undiscounted', () => {
    const plan = planLearnerBill({
      learnerId: 'lrn-only',
      institutionId: INSTITUTION,
      currency: FIXTURE_CURRENCY,
      period: PERIOD,
      lines: [SIBLING_CHILD_BILL[0]],
      rules: [siblingFixtureRule()],
      facts: { isStaffWard: false },
    });
    expect(plan.schoolDiscountTotal.amount_minor).toBe(0);
    expect(plan.learnerBill.amount_minor).toBe(600_000);
  });

  it('reads a fixed sibling tier as an amount, capped at the tuition it names', () => {
    const rule = siblingRule({
      id: 'rule-sibling-fixed',
      name: 'Sibling flat rate',
      basis: { kind: 'percent', percent: 0 },
      policy: {
        rankBy: 'provided',
        tiers: [{ fromRank: 2, basis: { kind: 'amount', amount: fromMajor('500', FIXTURE_CURRENCY) } }],
      },
      feeItemCodes: ['TUITION'],
    });
    const plan = planLearnerBill({
      learnerId: 'lrn-brian',
      institutionId: INSTITUTION,
      currency: FIXTURE_CURRENCY,
      period: PERIOD,
      lines: SIBLING_CHILD_BILL,
      rules: [rule],
      facts: { isStaffWard: false, siblingRank: 2 },
    });
    expect(plan.schoolDiscountTotal.amount_minor).toBe(50_000);
    expect(plan.learnerBill.amount_minor).toBe(650_000);
  });

  it('discounts nothing when the tuition line is funded by another source', () => {
    const plan = planLearnerBill({
      learnerId: 'lrn-brian',
      institutionId: INSTITUTION,
      currency: FIXTURE_CURRENCY,
      period: PERIOD,
      lines: [{ ...SIBLING_CHILD_BILL[0], fundingSource: 'government_capitation' }],
      rules: [siblingFixtureRule()],
      facts: { isStaffWard: false, siblingRank: 2 },
    });
    expect(plan.schoolDiscountTotal.amount_minor).toBe(0);
    expect(plan.externallyFunded.amount_minor).toBe(600_000);
    expect(plan.learnerBill.amount_minor).toBe(0);
  });
});

describe('the sibling rule of the spec', () => {
  it('is a policy, not a constant: the spec example is the default, not the only reading', () => {
    const rule = siblingFixtureRule();
    expect(rule.applicability?.siblingPolicy?.tiers.map((tier) => tier.fromRank)).toEqual([2, 3]);
    expect(rule.scope.feeItemCodes).toEqual(['TUITION']);
    expect(rule.fundingSource).toBe('school');
    expect(rule.precedence).toBe(40);
  });

  it('rounds a percentage of an odd amount to a whole minor unit', () => {
    const rule = siblingRule({
      id: 'rule-sibling-odd',
      name: 'Sibling odd',
      basis: { kind: 'percent', percent: 0 },
      policy: { rankBy: 'provided', tiers: [{ fromRank: 2, basis: { kind: 'percent', percent: 5 } }] },
      feeItemCodes: ['TUITION'],
    });
    const plan = planLearnerBill({
      learnerId: 'lrn-odd',
      institutionId: INSTITUTION,
      currency: FIXTURE_CURRENCY,
      period: PERIOD,
      lines: [{ feeItemId: 'fee-tuition', feeItemCode: 'TUITION', fundingSource: 'parent', amount: fromMinor(100_001, FIXTURE_CURRENCY) }],
      rules: [rule],
      facts: { isStaffWard: false, siblingRank: 2 },
    });
    // 5 % of 100,001 is 5,000.05, which half-up is 5,000.
    expect(plan.schoolDiscountTotal.amount_minor).toBe(5_000);
  });
});
