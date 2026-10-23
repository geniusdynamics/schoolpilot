// ABOUTME: The billing seam P3-C01 calls: what a learner owes for a period, which discounts and
// ABOUTME: splits apply and why, and how an externally funded award becomes a sponsor's share.

import { describe, expect, it } from 'vitest';

import { add, fromMajor, fromMinor, zero } from '@/domain/money';

import {
  FIXTURE_CURRENCY,
  GRADE10_BOARDER_BILL,
  GRADE10_BOARDER_TOTAL,
  SPLIT_COUNTY_BURSARY,
  SPLIT_EXPECTED,
  SPLIT_NGO_TRUST,
  cappedBursaryFixtureRule,
  countyScholarshipFixtureRule,
  siblingFixtureRule,
  staffWardFixtureRule,
} from '../fixtures';
import { isDiscountError, planLearnerBill, previewDiscount, type BillLineInput, type DiscountRule } from '..';

const INSTITUTION = 'inst-mwangaza';
const PERIOD = { periodId: 'term-1-2027', on: '2027-02-15' };

function catchOf(action: () => unknown): unknown {
  try {
    action();
    return null;
  } catch (error) {
    return error;
  }
}

function plan(overrides: Partial<Parameters<typeof planLearnerBill>[0]> = {}) {
  return planLearnerBill({
    learnerId: 'lrn-amina',
    institutionId: INSTITUTION,
    currency: FIXTURE_CURRENCY,
    period: PERIOD,
    lines: GRADE10_BOARDER_BILL,
    rules: [],
    facts: { isStaffWard: false },
    ...overrides,
  });
}

describe('the billing seam', () => {
  it('prices a bill with no discount at all, and splits it to the family alone', () => {
    const result = plan();
    expect(result.grossBill.amount_minor).toBe(GRADE10_BOARDER_TOTAL.amount_minor);
    expect(result.externallyFunded.amount_minor).toBe(0);
    expect(result.schoolDiscountTotal.amount_minor).toBe(0);
    expect(result.awardTotal.amount_minor).toBe(0);
    expect(result.learnerBill.amount_minor).toBe(GRADE10_BOARDER_TOTAL.amount_minor);
    expect(result.familyShare.amount_minor).toBe(GRADE10_BOARDER_TOTAL.amount_minor);
    expect(result.sponsorShares).toHaveLength(0);
    expect(result.split.exact).toBe(true);
    expect(result.sponsorRisk).toBe('sponsor_liability');
    expect(result.period.periodId).toBe('term-1-2027');
  });

  it('reproduces the sponsor split fixture through the seam', () => {
    const result = plan({ sponsorships: [SPLIT_COUNTY_BURSARY, SPLIT_NGO_TRUST] });
    expect(result.learnerBill.amount_minor).toBe(SPLIT_EXPECTED.totalMinor);
    expect(result.familyShare.amount_minor).toBe(SPLIT_EXPECTED.familyMinor);
    expect(result.sponsorShares.map((share) => [share.name, share.amount.amount_minor])).toEqual([
      ['Nairobi County Bursary', SPLIT_EXPECTED.countyMinor],
      ['Elimu Trust', SPLIT_EXPECTED.ngoMinor],
    ]);
    expect(result.split.exact).toBe(true);
    const summed = result.split.shares.reduce((total, share) => add(total, share.amount), zero(FIXTURE_CURRENCY));
    expect(summed.amount_minor).toBe(result.learnerBill.amount_minor);
  });

  it('gives a school-funded discount as a negative line, and reduces what the family owes', () => {
    const result = plan({
      rules: [siblingFixtureRule()],
      facts: { isStaffWard: false, siblingRank: 2 },
    });
    expect(result.schoolDiscountTotal.amount_minor).toBe(30_000);
    expect(result.learnerBill.amount_minor).toBe(2_720_000);
    expect(result.familyShare.amount_minor).toBe(2_720_000);
    const tuition = result.lines.find((line) => line.feeItemCode === 'TUITION');
    expect(tuition?.discounts[0].reason).toBe('Sibling discount on tuition');
    expect(tuition?.discounts[0].amount.amount_minor).toBe(30_000);
    expect(tuition?.net.amount_minor).toBe(570_000);
  });

  it('turns an externally funded award into a sponsor share, not a reduction of the family bill', () => {
    const result = plan({
      rules: [countyScholarshipFixtureRule()],
      facts: { isStaffWard: false, awardRuleIds: ['rule-county-scholarship'] },
    });
    expect(result.schoolDiscountTotal.amount_minor).toBe(0);
    expect(result.awardTotal.amount_minor).toBe(300_000);
    expect(result.learnerBill.amount_minor).toBe(2_750_000);
    expect(result.familyShare.amount_minor).toBe(2_450_000);
    expect(result.sponsorShares).toHaveLength(1);
    expect(result.sponsorShares[0].amount.amount_minor).toBe(300_000);
    expect(result.sponsorShares[0].fundingSource).toBe('county_bursary');
    expect(result.sponsorShares[0].source.kind).toBe('award');
    expect(result.sponsorShares[0].posting).toBe('sponsor_receivable_on_invoice_cleared_on_receipt');
    expect(result.trace.join(' ')).toContain('is funded by county_bursary');
  });

  it('stacks a school-funded discount and an award in precedence order', () => {
    const result = plan({
      rules: [countyScholarshipFixtureRule(), staffWardFixtureRule()],
      facts: { isStaffWard: true, awardRuleIds: ['rule-county-scholarship'] },
    });
    // The scholarship (precedence 10) takes half the 6,000 tuition; the staff ward takes half of the rest.
    expect(result.awardTotal.amount_minor).toBe(300_000);
    expect(result.schoolDiscountTotal.amount_minor).toBe(150_000);
    expect(result.learnerBill.amount_minor).toBe(2_600_000);
    expect(result.familyShare.amount_minor).toBe(2_300_000);
  });

  it('takes a line another source funds out of the split and names the source', () => {
    const lines: BillLineInput[] = GRADE10_BOARDER_BILL.map((line) =>
      line.feeItemCode === 'BOARDING_MEALS' ? { ...line, fundingSource: 'sponsor' as const } : line
    );
    const result = plan({ lines });
    expect(result.externallyFunded.amount_minor).toBe(1_850_000);
    expect(result.learnerBill.amount_minor).toBe(900_000);
    const boarding = result.lines.find((line) => line.feeItemCode === 'BOARDING_MEALS');
    expect(boarding?.learnerPayable.amount_minor).toBe(0);
    expect(boarding?.externallyFunded.amount_minor).toBe(1_850_000);
  });

  it('honours a sponsorship scoped to one fee item on that item, not the whole bill', () => {
    const result = plan({
      sponsorships: [{ id: 'spon-tuition', sponsorName: 'Tuition Trust', fundingSource: 'ngo', feeItemIds: ['fee-tuition'], sharePercent: 50 }],
    });
    expect(result.sponsorShares[0].amount.amount_minor).toBe(300_000);
    expect(result.familyShare.amount_minor).toBe(2_450_000);
    expect(result.split.exact).toBe(true);
  });

  it('does not apply a sponsorship the learner is not under', () => {
    const result = plan({ sponsorships: [{ ...SPLIT_COUNTY_BURSARY, startsOn: '2028-01-01' }] });
    expect(result.sponsorShares).toHaveLength(0);
    expect(result.familyShare.amount_minor).toBe(2_750_000);
  });

  it('reports the budget a bill draws on, and refuses one the school enforces', () => {
    const budgets = [
      {
        programmeId: 'county-bursary-2027',
        name: 'County bursary fund 2027',
        fundingSource: 'county_bursary' as const,
        amount: fromMinor(1_000_000, FIXTURE_CURRENCY),
        committed: fromMinor(900_000, FIXTURE_CURRENCY),
      },
    ];
    const warned = plan({
      rules: [countyScholarshipFixtureRule()],
      facts: { isStaffWard: false, awardRuleIds: ['rule-county-scholarship'] },
      budgets,
    });
    expect(warned.budgets[0].overspend.amount_minor).toBe(200_000);
    expect(warned.budgets[0].withinBudget).toBe(false);
    expect(warned.trace.join(' ')).toContain('overspend of 200000 recorded');

    const error = catchOf(() =>
      plan({
        rules: [countyScholarshipFixtureRule()],
        facts: { isStaffWard: false, awardRuleIds: ['rule-county-scholarship'] },
        budgets,
        options: { budgetOverspend: 'refuse' },
      })
    );
    expect(isDiscountError(error, 'budget_exceeded')).toBe(true);
  });

  it('states who carries a sponsor shortfall, so the run can settle it', () => {
    const result = plan({ options: { sponsorRisk: 'family_liability' } });
    expect(result.sponsorRisk).toBe('family_liability');
  });

  it('previews a rule against an amount without planning a whole bill', () => {
    const rule: DiscountRule = cappedBursaryFixtureRule();
    expect(previewDiscount(rule, fromMajor('6000', FIXTURE_CURRENCY)).amount_minor).toBe(200_000);
    expect(previewDiscount(rule, fromMajor('3000', FIXTURE_CURRENCY)).amount_minor).toBe(150_000);
  });

  it('refuses a bill with no learner or no period', () => {
    expect(isDiscountError(catchOf(() => plan({ learnerId: '' })), 'discount_rule_invalid')).toBe(true);
    expect(
      isDiscountError(catchOf(() => plan({ period: { on: 'bad' } })), 'discount_rule_invalid')
    ).toBe(true);
  });

  it('keeps every line accounted for: gross equals what the family owes plus what others pay', () => {
    const result = plan({
      rules: [staffWardFixtureRule(), countyScholarshipFixtureRule()],
      facts: { isStaffWard: true, awardRuleIds: ['rule-county-scholarship'] },
      sponsorships: [SPLIT_NGO_TRUST],
    });
    const familyAndOthers = result.split.shares.reduce((total, share) => add(total, share.amount), zero(FIXTURE_CURRENCY));
    expect(familyAndOthers.amount_minor).toBe(result.learnerBill.amount_minor);
    expect(result.learnerBill.amount_minor + result.schoolDiscountTotal.amount_minor).toBe(
      result.grossBill.amount_minor - result.externallyFunded.amount_minor
    );
  });
});
