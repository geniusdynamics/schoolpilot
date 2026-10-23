// ABOUTME: Split billing, proven: the sponsor split fixture's exact shillings, the allocator's odd
// ABOUTME: minor unit, every refusal, and what an underpaying sponsor does to the learner's balance.

import { describe, expect, it } from 'vitest';

import { add, fromMajor, fromMinor, zero } from '@/domain/money';

import {
  DiscountError,
  isDiscountError,
  planSplit,
  settleSponsors,
  sponsorSharesOf,
  sponsorshipPayer,
  type SplitPayer,
} from '..';
import {
  FIXTURE_CURRENCY,
  GRADE10_BOARDER_TOTAL,
  ODD_UNIT_SPLIT,
  SPLIT_COUNTY_BURSARY,
  SPLIT_EXPECTED,
  SPLIT_NGO_TRUST,
} from '../fixtures';

const FAMILY: SplitPayer = { payerId: 'family', kind: 'family', name: 'Learner / guardian' };

function catchOf(action: () => unknown): unknown {
  try {
    action();
    return null;
  } catch (error) {
    return error;
  }
}

function fixturePayers(): SplitPayer[] {
  return [FAMILY, sponsorshipPayer(SPLIT_COUNTY_BURSARY), sponsorshipPayer(SPLIT_NGO_TRUST)];
}

describe('the sponsor split fixture', () => {
  it('splits the 27,500 KES bill across two sponsors and the family, exactly', () => {
    const split = planSplit(GRADE10_BOARDER_TOTAL, fixturePayers());

    expect(split.total.amount_minor).toBe(SPLIT_EXPECTED.totalMinor);
    expect(split.exact).toBe(true);
    expect(split.shares.map((share) => [share.payerId, share.amount.amount_minor, share.basis])).toEqual([
      ['family', SPLIT_EXPECTED.familyMinor, 'residual'],
      ['spon-county', SPLIT_EXPECTED.countyMinor, 'share'],
      ['spon-elimu', SPLIT_EXPECTED.ngoMinor, 'agreed_amount'],
    ]);

    const summed = split.shares.reduce((total, share) => add(total, share.amount), zero(FIXTURE_CURRENCY));
    expect(summed.amount_minor).toBe(GRADE10_BOARDER_TOTAL.amount_minor);
  });

  it('reads the shares back as sponsor invoices, each its own receivable', () => {
    const sponsors = sponsorSharesOf(planSplit(GRADE10_BOARDER_TOTAL, fixturePayers()));
    expect(sponsors).toHaveLength(2);
    expect(sponsors.map((share) => share.name)).toEqual(['Nairobi County Bursary', 'Elimu Trust']);
    expect(sponsors.map((share) => share.fundingSource)).toEqual(['county_bursary', 'ngo']);
    for (const sponsor of sponsors) {
      expect(sponsor.invoice).toBe('sponsor_invoice');
      expect(sponsor.posting).toBe('sponsor_receivable_on_invoice_cleared_on_receipt');
      expect(sponsor.source.kind).toBe('sponsorship');
    }
  });

  it('gives the allocator\u2019s odd minor unit to the largest remainder, deterministically', () => {
    const payers: SplitPayer[] = [
      FAMILY,
      { payerId: 'sponsor-a', kind: 'sponsor', name: 'Sponsor A', sharePercent: ODD_UNIT_SPLIT.firstSharePercent },
      { payerId: 'sponsor-b', kind: 'sponsor', name: 'Sponsor B', sharePercent: ODD_UNIT_SPLIT.secondSharePercent },
    ];
    const total = fromMinor(ODD_UNIT_SPLIT.totalMinor, FIXTURE_CURRENCY);
    const split = planSplit(total, payers);
    expect(split.shares.map((share) => share.amount.amount_minor)).toEqual([
      ODD_UNIT_SPLIT.familyMinor,
      ODD_UNIT_SPLIT.firstMinor,
      ODD_UNIT_SPLIT.secondMinor,
    ]);
    expect(split.exact).toBe(true);

    // The same bill and the same agreements always give the same parts.
    const again = planSplit(total, payers);
    expect(again.shares.map((share) => share.amount.amount_minor)).toEqual(
      split.shares.map((share) => share.amount.amount_minor)
    );
  });

  it('sums exactly for every bill, across every mix of shares and amounts', () => {
    const totals = [1, 3, 7, 99, 100_001, 2_750_000, 999_999_999];
    const payerSets: SplitPayer[][] = [
      [FAMILY],
      [FAMILY, { payerId: 'a', kind: 'sponsor', name: 'A', sharePercent: 33.33 }, { payerId: 'b', kind: 'sponsor', name: 'B', sharePercent: 33.33 }],
      [FAMILY, { payerId: 'a', kind: 'sponsor', name: 'A', sharePercent: 1 }],
      [FAMILY, { payerId: 'a', kind: 'sponsor', name: 'A', agreedAmount: fromMinor(1, FIXTURE_CURRENCY) }],
    ];
    for (const totalMinor of totals) {
      for (const payers of payerSets) {
        const split = planSplit(fromMinor(totalMinor, FIXTURE_CURRENCY), payers);
        const summed = split.shares.reduce((total, share) => add(total, share.amount), zero(FIXTURE_CURRENCY));
        expect(summed.amount_minor).toBe(totalMinor);
        expect(split.exact).toBe(true);
      }
    }
  });

  it('gives every payer zero when the bill is zero', () => {
    const split = planSplit(fromMinor(0, FIXTURE_CURRENCY), [
      FAMILY,
      { payerId: 'a', kind: 'sponsor', name: 'A', sharePercent: 50 },
    ]);
    expect(split.shares.map((share) => share.amount.amount_minor)).toEqual([0, 0]);
    expect(split.exact).toBe(true);
  });

  it('honours an agreed amount to the shilling, and leaves the family the residual', () => {
    const split = planSplit(GRADE10_BOARDER_TOTAL, [
      FAMILY,
      { payerId: 'sponsor-a', kind: 'sponsor', name: 'Sponsor A', agreedAmount: fromMajor('7500', FIXTURE_CURRENCY) },
    ]);
    expect(split.shares.map((share) => share.amount.amount_minor)).toEqual([2_000_000, 750_000]);
  });
});

describe('the split refusals', () => {
  it('needs exactly one family payer', () => {
    expect(
      isDiscountError(
        catchOf(() => planSplit(GRADE10_BOARDER_TOTAL, [sponsorshipPayer(SPLIT_COUNTY_BURSARY)])),
        'split_family_invalid'
      )
    ).toBe(true);
    expect(
      isDiscountError(
        catchOf(() => planSplit(GRADE10_BOARDER_TOTAL, [FAMILY, { ...FAMILY, payerId: 'family-2' }])),
        'split_family_invalid'
      )
    ).toBe(true);
  });

  it('refuses shares that add up to more than the bill', () => {
    expect(
      isDiscountError(
        catchOf(() =>
          planSplit(GRADE10_BOARDER_TOTAL, [
            FAMILY,
            { payerId: 'a', kind: 'sponsor', name: 'A', sharePercent: 60 },
            { payerId: 'b', kind: 'sponsor', name: 'B', sharePercent: 60 },
          ])
        ),
        'split_share_exceeds_bill'
      )
    ).toBe(true);
  });

  it('refuses a sponsor whose agreed amount the residual cannot absorb', () => {
    expect(
      isDiscountError(
        catchOf(() =>
          planSplit(fromMinor(100_000, FIXTURE_CURRENCY), [
            FAMILY,
            { payerId: 'a', kind: 'sponsor', name: 'A', agreedAmount: fromMinor(50_000, FIXTURE_CURRENCY) },
            { payerId: 'b', kind: 'sponsor', name: 'B', agreedAmount: fromMinor(80_000, FIXTURE_CURRENCY) },
          ])
        ),
        'split_sponsor_exceeds_bill'
      )
    ).toBe(true);
  });

  it('refuses a sponsor that states neither or both of a share and an amount', () => {
    expect(
      isDiscountError(
        catchOf(() => planSplit(GRADE10_BOARDER_TOTAL, [FAMILY, { payerId: 'a', kind: 'sponsor', name: 'A' }])),
        'sponsorship_invalid'
      )
    ).toBe(true);
    expect(
      isDiscountError(
        catchOf(() =>
          planSplit(GRADE10_BOARDER_TOTAL, [
            FAMILY,
            { payerId: 'a', kind: 'sponsor', name: 'A', sharePercent: 10, agreedAmount: fromMinor(1, FIXTURE_CURRENCY) },
          ])
        ),
        'sponsorship_invalid'
      )
    ).toBe(true);
  });

  it('refuses a share that is not a percentage of at most two decimals', () => {
    expect(
      isDiscountError(
        catchOf(() =>
          planSplit(GRADE10_BOARDER_TOTAL, [FAMILY, { payerId: 'a', kind: 'sponsor', name: 'A', sharePercent: 33.333 }])
        ),
        'discount_percent_invalid'
      )
    ).toBe(true);
    expect(
      isDiscountError(
        catchOf(() =>
          planSplit(GRADE10_BOARDER_TOTAL, [FAMILY, { payerId: 'a', kind: 'sponsor', name: 'A', sharePercent: -1 }])
        ),
        'discount_percent_invalid'
      )
    ).toBe(true);
  });

  it('refuses an agreed amount in another currency', () => {
    expect(
      isDiscountError(
        catchOf(() =>
          planSplit(GRADE10_BOARDER_TOTAL, [
            FAMILY,
            { payerId: 'a', kind: 'sponsor', name: 'A', agreedAmount: fromMinor(1, 'UGX') },
          ])
        ),
        'split_amount_invalid'
      )
    ).toBe(true);
  });

  it('refuses a sponsorship that states neither a share nor an amount', () => {
    expect(
      isDiscountError(
        catchOf(() => sponsorshipPayer({ id: 'spon-x', sponsorName: 'X', fundingSource: 'ngo' })),
        'sponsorship_invalid'
      )
    ).toBe(true);
  });
});

describe('what an underpaying sponsor does to the learner', () => {
  const split = () => planSplit(GRADE10_BOARDER_TOTAL, fixturePayers());

  it('leaves the learner untouched under `sponsor_liability`, the default', () => {
    const result = settleSponsors(
      split(),
      [
        { payerId: 'spon-county', received: fromMajor('8000', FIXTURE_CURRENCY) },
        { payerId: 'spon-elimu', received: fromMajor('5000', FIXTURE_CURRENCY) },
      ],
      { learnerBalance: fromMinor(50_000, FIXTURE_CURRENCY) }
    );
    expect(result.policy).toBe('sponsor_liability');
    const county = result.settlements.find((entry) => entry.payerId === 'spon-county');
    expect(county?.share.amount_minor).toBe(1_100_000);
    expect(county?.received.amount_minor).toBe(800_000);
    expect(county?.shortfall.amount_minor).toBe(300_000);
    expect(county?.outstandingAgainst).toBe('sponsor');
    expect(county?.learnerBalanceEffect.amount_minor).toBe(0);
    expect(result.learnerBalanceAfter.amount_minor).toBe(50_000);
    expect(result.sponsorOutstanding.amount_minor).toBe(300_000);
  });

  it('moves the shortfall onto the learner under `family_liability`', () => {
    const result = settleSponsors(
      split(),
      [
        { payerId: 'spon-county', received: fromMajor('8000', FIXTURE_CURRENCY) },
        { payerId: 'spon-elimu', received: fromMajor('5000', FIXTURE_CURRENCY) },
      ],
      { policy: 'family_liability', learnerBalance: fromMinor(50_000, FIXTURE_CURRENCY) }
    );
    const county = result.settlements.find((entry) => entry.payerId === 'spon-county');
    expect(county?.outstandingAgainst).toBe('learner');
    expect(county?.learnerBalanceEffect.amount_minor).toBe(300_000);
    expect(result.learnerBalanceAfter.amount_minor).toBe(350_000);
    expect(result.sponsorOutstanding.amount_minor).toBe(0);
  });

  it('moves every unpaid share onto the learner when no sponsor pays at all', () => {
    const result = settleSponsors(split(), [], {
      policy: 'family_liability',
      learnerBalance: fromMinor(0, FIXTURE_CURRENCY),
    });
    expect(result.learnerBalanceAfter.amount_minor).toBe(1_600_000);
    expect(result.sponsorOutstanding.amount_minor).toBe(0);
  });

  it('treats a sponsor that pays nothing as owing its whole share', () => {
    const result = settleSponsors(split(), [], { learnerBalance: fromMinor(0, FIXTURE_CURRENCY) });
    expect(result.settlements.map((entry) => entry.shortfall.amount_minor)).toEqual([1_100_000, 500_000]);
    expect(result.sponsorOutstanding.amount_minor).toBe(1_600_000);
    expect(result.learnerBalanceAfter.amount_minor).toBe(0);
  });

  it('records an overpayment without touching the learner', () => {
    const result = settleSponsors(split(), [{ payerId: 'spon-elimu', received: fromMajor('6000', FIXTURE_CURRENCY) }], {
      learnerBalance: fromMinor(0, FIXTURE_CURRENCY),
    });
    const ngo = result.settlements.find((entry) => entry.payerId === 'spon-elimu');
    expect(ngo?.overpaid.amount_minor).toBe(100_000);
    expect(ngo?.shortfall.amount_minor).toBe(0);
    expect(result.learnerBalanceAfter.amount_minor).toBe(0);
  });

  it('refuses a settlement in another currency', () => {
    expect(
      isDiscountError(
        catchOf(() =>
          settleSponsors(split(), [{ payerId: 'spon-county', received: fromMinor(1, 'UGX') }], {
            learnerBalance: fromMinor(0, FIXTURE_CURRENCY),
          })
        ),
        'split_amount_invalid'
      )
    ).toBe(true);
  });

  it('carries the error type a caller catches', () => {
    expect(catchOf(() => planSplit(fromMinor(0, FIXTURE_CURRENCY), []))).toBeInstanceOf(DiscountError);
  });
});
