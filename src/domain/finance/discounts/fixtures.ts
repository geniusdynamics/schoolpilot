// ABOUTME: The fixtures the acceptance names: the spec's own Grade 10 boarder bill, a household of
// ABOUTME: three children and the sibling discount each earns, and a bill split across two sponsors
// ABOUTME: and the family with the exact shillings asserted.

import { fromMajor, fromMinor, type CurrencyCode, type Money } from '@/domain/money';

import { siblingRule } from './siblings';
import type { BillLineInput, DiscountRule, SponsorshipAgreement } from './types';

/** The currency every fixture is stated in, the spec's own example currency. */
export const FIXTURE_CURRENCY: CurrencyCode = 'KES';

/** The bill of spec 05 §2.2's Grade 10 boarder column, as data. */
export const GRADE10_BOARDER_BILL: readonly BillLineInput[] = [
  {
    feeItemId: 'fee-tuition',
    feeItemCode: 'TUITION',
    feeItemName: 'Tuition',
    fundingSource: 'parent',
    amount: fromMajor('6000', FIXTURE_CURRENCY),
  },
  {
    feeItemId: 'fee-boarding',
    feeItemCode: 'BOARDING_MEALS',
    feeItemName: 'Boarding and meals',
    fundingSource: 'parent',
    amount: fromMajor('18500', FIXTURE_CURRENCY),
  },
  {
    feeItemId: 'fee-activity',
    feeItemCode: 'ACTIVITY',
    feeItemName: 'Activity',
    fundingSource: 'parent',
    amount: fromMajor('1000', FIXTURE_CURRENCY),
  },
  {
    feeItemId: 'fee-admission',
    feeItemCode: 'ADMISSION',
    feeItemName: 'Admission',
    fundingSource: 'parent',
    amount: fromMajor('2000', FIXTURE_CURRENCY),
  },
];

/** The Grade 10 boarder column's total: 27,500 KES, the same figure the schedule fixture asserts. */
export const GRADE10_BOARDER_TOTAL: Money = fromMinor(2_750_000, FIXTURE_CURRENCY);

/** One child's bill in the sibling fixture: tuition and activity, both parent-funded. */
export const SIBLING_CHILD_BILL: readonly BillLineInput[] = [
  {
    feeItemId: 'fee-tuition',
    feeItemCode: 'TUITION',
    feeItemName: 'Tuition',
    fundingSource: 'parent',
    amount: fromMajor('6000', FIXTURE_CURRENCY),
  },
  {
    feeItemId: 'fee-activity',
    feeItemCode: 'ACTIVITY',
    feeItemName: 'Activity',
    fundingSource: 'parent',
    amount: fromMajor('1000', FIXTURE_CURRENCY),
  },
];

/** One child's bill total before any discount: 7,000 KES. */
export const SIBLING_CHILD_GROSS: Money = fromMinor(700_000, FIXTURE_CURRENCY);

/** The three children of the fixture household, in the order they were admitted. */
export const SIBLING_HOUSEHOLD = [
  { learnerId: 'lrn-amina', admittedOn: '2024-01-05' },
  { learnerId: 'lrn-brian', admittedOn: '2025-01-06' },
  { learnerId: 'lrn-chloe', admittedOn: '2026-01-07' },
] as const;

/** The sibling rule of spec 05 §2.3: the 2nd child 5 %, the 3rd and after 10 %, on tuition only. */
export function siblingFixtureRule(): DiscountRule {
  return siblingRule({
    id: 'rule-sibling',
    name: 'Sibling discount',
    basis: { kind: 'percent', percent: 0 },
    feeItemCodes: ['TUITION'],
    precedence: 40,
    reason: 'Sibling discount on tuition',
  });
}

/**
 * What each child of the fixture household owes, in minor units.
 *
 * Rank 1 earns nothing, rank 2 earns 5 % of the 6,000 tuition (300), and rank 3 earns 10 % (600).
 * The activity fee is untouched: the rule's scope is tuition, as the spec's example states.
 */
export const SIBLING_EXPECTED = [
  { learnerId: 'lrn-amina', rank: 1, discountMinor: 0, netMinor: 700_000 },
  { learnerId: 'lrn-brian', rank: 2, discountMinor: 30_000, netMinor: 670_000 },
  { learnerId: 'lrn-chloe', rank: 3, discountMinor: 60_000, netMinor: 640_000 },
] as const;

/** The county bursary of the split fixture: 40 % of the bill. */
export const SPLIT_COUNTY_BURSARY: SponsorshipAgreement = {
  id: 'spon-county',
  sponsorName: 'Nairobi County Bursary',
  fundingSource: 'county_bursary',
  sharePercent: 40,
  startsOn: '2027-01-01',
  endsOn: '2027-12-31',
};

/** The NGO of the split fixture: an agreed 5,000 KES. */
export const SPLIT_NGO_TRUST: SponsorshipAgreement = {
  id: 'spon-elimu',
  sponsorName: 'Elimu Trust',
  fundingSource: 'ngo',
  agreedAmount: fromMajor('5000', FIXTURE_CURRENCY),
};

/**
 * The sponsor split fixture: the 27,500 KES Grade 10 boarder bill across two sponsors and the family.
 *
 * The county bursary's 40 % is 11,000, the NGO's agreed 5,000 is honoured to the shilling, and the
 * family takes the residual: 27,500 - 11,000 - 5,000 = 11,500. The three parts sum to the bill
 * exactly.
 */
export const SPLIT_EXPECTED = {
  totalMinor: 2_750_000,
  countyMinor: 1_100_000,
  ngoMinor: 500_000,
  familyMinor: 1_150_000,
} as const;

/**
 * A bill that does not divide evenly, so the allocator's odd minor unit is visible.
 *
 * Two sponsors at 33.33 % each leave the family 33.34 % of a 100,001 minor-unit bill. The parts are
 * 33,330 / 33,330 / 33,341: the odd unit goes to the largest remainder, which is the family's, and
 * the parts still sum to the bill exactly.
 */
export const ODD_UNIT_SPLIT = {
  totalMinor: 100_001,
  firstSharePercent: 33.33,
  secondSharePercent: 33.33,
  firstMinor: 33_330,
  secondMinor: 33_330,
  familyMinor: 33_341,
} as const;

/** A bursary of 50 % of tuition, capped at 2,000 KES: the cap does the work. */
export function cappedBursaryFixtureRule(): DiscountRule {
  return {
    id: 'rule-bursary-capped',
    name: 'Capped bursary',
    kind: 'bursary',
    basis: { kind: 'percent', percent: 50, cap: fromMajor('2000', FIXTURE_CURRENCY) },
    scope: { feeItemCodes: ['TUITION'] },
    period: {},
    reason: 'A 50 % bursary capped at 2,000',
    fundingSource: 'school',
    precedence: 20,
  };
}

/** A fixed bursary of 10,000 KES on a 6,000 tuition: it cannot exceed what it discounts. */
export function overLargeBursaryFixtureRule(): DiscountRule {
  return {
    id: 'rule-bursary-oversized',
    name: 'Oversized bursary',
    kind: 'bursary',
    basis: { kind: 'amount', amount: fromMajor('10000', FIXTURE_CURRENCY) },
    scope: { feeItemCodes: ['TUITION'] },
    period: {},
    reason: 'A fixed bursary larger than the tuition it names',
    fundingSource: 'school',
    precedence: 20,
  };
}

/** A county-funded scholarship: a third party pays it, so it is that party's share of the bill. */
export function countyScholarshipFixtureRule(): DiscountRule {
  return {
    id: 'rule-county-scholarship',
    name: 'County scholarship',
    kind: 'scholarship',
    basis: { kind: 'percent', percent: 50 },
    scope: { feeItemCodes: ['TUITION'] },
    period: {},
    reason: 'A county scholarship of 50 % of tuition',
    fundingSource: 'county_bursary',
    precedence: 10,
  };
}

/** A staff-ward rule: 50 % of tuition for a member of staff's child. */
export function staffWardFixtureRule(): DiscountRule {
  return {
    id: 'rule-staff-ward',
    name: 'Staff ward discount',
    kind: 'staff_ward',
    basis: { kind: 'percent', percent: 50 },
    scope: { feeItemCodes: ['TUITION'] },
    period: {},
    reason: 'A member of staff child discount on tuition',
    fundingSource: 'school',
    precedence: 30,
  };
}
