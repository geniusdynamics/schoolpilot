// ABOUTME: The discount service against a real SQLite database: the canonical discount_rule and
// ABOUTME: sponsorship rows round-trip through the engine, and a bill is planned from what the
// ABOUTME: repository holds.

import { afterEach, describe, expect, it } from 'vitest';

import {
  closeTestContext,
  createTestContext,
  TEST_ACTOR,
  type TestContext,
} from '@/data/__tests__/harness';
import { asId } from '@/domain/ids';
import { fromMajor, fromMinor } from '@/domain/money';

import {
  DiscountService,
  isDiscountError,
  siblingRule,
  type DiscountRule,
  type SponsorshipAgreement,
} from '..';
import {
  FIXTURE_CURRENCY,
  GRADE10_BOARDER_BILL,
  SPLIT_COUNTY_BURSARY,
  SPLIT_EXPECTED,
  siblingFixtureRule,
} from '../fixtures';

const contexts: TestContext[] = [];

async function freshContext(): Promise<TestContext> {
  const context = await createTestContext();
  contexts.push(context);
  return context;
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => closeTestContext(context)));
});

function service(context: TestContext): DiscountService {
  return new DiscountService({ repository: context.repository, actor: TEST_ACTOR });
}

async function rejectionOf(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await action();
    return null;
  } catch (error) {
    return error;
  }
}

describe('the discount service against real SQLite', () => {
  it('reads the institution currency and the canonical rules the repository already holds', async () => {
    const context = await freshContext();
    const discount = service(context);
    const institutionId = context.seed.idOf('institution');

    expect(await discount.institutionCurrency(institutionId)).toBe('KES');

    const rules = await discount.listRules(institutionId);
    // The repository's own fixture seeds one discount rule: "Second child discount", a 5 % percent
    // rule whose conditions carry `sibling_rank`, scoped to one fee item.
    const seeded = rules.find((rule) => rule.name === 'Second child discount');
    expect(seeded).toBeDefined();
    expect(seeded?.kind).toBe('sibling');
    expect(seeded?.basis).toEqual({ kind: 'percent', percent: 5 });
    expect(seeded?.fundingSource).toBe('school');
    expect(seeded?.scope.feeItemIds).toHaveLength(1);
    expect(seeded?.reason).toContain('sibling');
  });

  it('round-trips a sibling rule with its tiers, scope, period and precedence', async () => {
    const context = await freshContext();
    const discount = service(context);
    const institutionId = context.seed.idOf('institution');

    const rule: DiscountRule = {
      ...siblingFixtureRule(),
      period: { startsOn: '2027-01-01', endsOn: '2027-12-31', periodIds: ['term-1-2027'] },
      precedence: 35,
    };
    const row = await discount.createRule(rule, institutionId, { reason: 'the school adopted the spec example' });
    expect(row.name).toBe('Sibling discount');
    expect(row.kind).toBe('percent');

    const rules = await discount.listRules(institutionId);
    const stored = rules.find((entry) => entry.id === row.id);
    expect(stored).toBeDefined();
    expect(stored?.kind).toBe('sibling');
    expect(stored?.applicability?.siblingPolicy?.tiers.map((tier) => [tier.fromRank, tier.toRank])).toEqual([
      [2, 2],
      [3, undefined],
    ]);
    expect(stored?.applicability?.siblingPolicy?.tiers.map((tier) => tier.basis)).toEqual([
      { kind: 'percent', percent: 5 },
      { kind: 'percent', percent: 10 },
    ]);
    expect(stored?.scope.feeItemCodes).toEqual(['TUITION']);
    expect(stored?.period).toEqual({ startsOn: '2027-01-01', endsOn: '2027-12-31', periodIds: ['term-1-2027'] });
    expect(stored?.precedence).toBe(35);
    expect(stored?.reason).toBe('Sibling discount on tuition');
  });

  it('refuses a rule the engine would refuse, before it writes', async () => {
    const context = await freshContext();
    const discount = service(context);
    const institutionId = context.seed.idOf('institution');

    const overPercent = siblingRule({
      id: 'rule-bad',
      name: 'Bad percent',
      basis: { kind: 'percent', percent: 101 },
    });
    expect(
      isDiscountError(await rejectionOf(() => discount.createRule(overPercent, institutionId)), 'discount_percent_invalid')
    ).toBe(true);

    expect(
      isDiscountError(
        await rejectionOf(() =>
          discount.createRule({ ...siblingFixtureRule(), id: 'rule-dup', name: 'Second child discount' }, institutionId)
        ),
        'discount_rule_invalid'
      )
    ).toBe(true);
  });

  it('round-trips a sponsorship and plans a bill against it', async () => {
    const context = await freshContext();
    const discount = service(context);
    const institutionId = context.seed.idOf('institution');

    const agreement: SponsorshipAgreement = { ...SPLIT_COUNTY_BURSARY, id: 'spon-local' };
    const row = await discount.createSponsorship(agreement, institutionId, 'County bursary 2027 (local)');
    expect(row.sponsor_name).toBe('Nairobi County Bursary');
    expect(row.coverage_percent).toBe(40);

    const read = await discount.getSponsorship(asId<'sponsorship'>(row.id));
    expect(read).toEqual({
      id: row.id,
      sponsorName: 'Nairobi County Bursary',
      fundingSource: 'county_bursary',
      sharePercent: 40,
      startsOn: '2027-01-01',
      endsOn: '2027-12-31',
    });

    const plan = await discount.planBill({
      institutionId,
      learnerId: 'lrn-amina',
      period: { periodId: 'term-1-2027', on: '2027-02-15' },
      lines: GRADE10_BOARDER_BILL,
      facts: { isStaffWard: false },
      sponsorshipIds: [row.id],
    });

    expect(plan.currency).toBe(FIXTURE_CURRENCY);
    expect(plan.learnerBill.amount_minor).toBe(SPLIT_EXPECTED.totalMinor);
    expect(plan.sponsorShares).toHaveLength(1);
    expect(plan.sponsorShares[0].amount.amount_minor).toBe(SPLIT_EXPECTED.countyMinor);
    expect(plan.sponsorShares[0].source.id).toBe(row.id);
    expect(plan.familyShare.amount_minor).toBe(SPLIT_EXPECTED.totalMinor - SPLIT_EXPECTED.countyMinor);
    expect(plan.split.exact).toBe(true);
  });

  it('plans a bill from a rule the repository holds, applying it to the lines', async () => {
    const context = await freshContext();
    const discount = service(context);
    const institutionId = context.seed.idOf('institution');

    await discount.createRule(
      {
        id: 'rule-ten-percent',
        name: 'Ten percent off',
        kind: 'other',
        basis: { kind: 'percent', percent: 10 },
        scope: {},
        period: {},
        reason: 'A ten percent reduction',
        fundingSource: 'school',
        precedence: 70,
      },
      institutionId
    );

    const plan = await discount.planBill({
      institutionId,
      learnerId: 'lrn-amina',
      period: { on: '2027-02-15' },
      lines: GRADE10_BOARDER_BILL,
      facts: { isStaffWard: false },
    });

    // The seeded sibling rule reaches nobody without a rank, so only the ten percent rule applies.
    expect(plan.schoolDiscountTotal.amount_minor).toBe(275_000);
    expect(plan.learnerBill.amount_minor).toBe(2_475_000);
    expect(plan.familyShare.amount_minor).toBe(2_475_000);
    expect(plan.lines.find((line) => line.feeItemCode === 'TUITION')?.discounts[0].reason).toBe('A ten percent reduction');
  });

  it('refuses a sponsorship the caller names but the repository does not hold', async () => {
    const context = await freshContext();
    const discount = service(context);
    const error = await rejectionOf(() =>
      discount.planBill({
        institutionId: context.seed.idOf('institution'),
        learnerId: 'lrn-amina',
        period: { on: '2027-02-15' },
        lines: GRADE10_BOARDER_BILL,
        facts: { isStaffWard: false },
        sponsorshipIds: ['00000000-0000-7000-8000-0000000000ff'],
      })
    );
    expect(isDiscountError(error, 'not_found')).toBe(true);
  });

  it('names the rules that reach a learner in a period', async () => {
    const context = await freshContext();
    const discount = service(context);
    const institutionId = context.seed.idOf('institution');

    await discount.createRule(
      {
        id: 'rule-window',
        name: 'Term 1 only',
        kind: 'other',
        basis: { kind: 'amount', amount: fromMajor('500', FIXTURE_CURRENCY) },
        scope: { feeItemCodes: ['TUITION'] },
        period: { startsOn: '2027-01-01', endsOn: '2027-03-31' },
        reason: 'A term one reduction',
        fundingSource: 'school',
        precedence: 70,
      },
      institutionId
    );

    const inside = await discount.applicableRules(institutionId, { isStaffWard: false }, { on: '2027-02-15' });
    expect(inside.map((rule) => rule.name)).toContain('Term 1 only');

    const outside = await discount.applicableRules(institutionId, { isStaffWard: false }, { on: '2027-06-15' });
    expect(outside.map((rule) => rule.name)).not.toContain('Term 1 only');

    // The seeded sibling rule reaches a learner only once they have a rank.
    const ranked = await discount.applicableRules(
      institutionId,
      { isStaffWard: false, siblingRank: 2 },
      { on: '2027-02-15' }
    );
    expect(ranked.map((rule) => rule.name)).toContain('Second child discount');
  });

  it('refuses a sponsorship that states neither a share nor an amount', async () => {
    const context = await freshContext();
    const discount = service(context);
    const error = await rejectionOf(() =>
      discount.createSponsorship(
        { id: 'spon-bad', sponsorName: 'Nobody', fundingSource: 'ngo' },
        context.seed.idOf('institution'),
        'Bad sponsorship'
      )
    );
    expect(isDiscountError(error, 'sponsorship_invalid')).toBe(true);
  });

  it('reports a fixed rule in a zero-decimal currency without a rounding', async () => {
    const context = await freshContext();
    const discount = service(context);
    const institutionId = context.seed.idOf('institution');
    const row = await discount.createRule(
      {
        id: 'rule-fixed',
        name: 'Fixed five hundred',
        kind: 'other',
        basis: { kind: 'amount', amount: fromMinor(500_000, FIXTURE_CURRENCY) },
        scope: {},
        period: {},
        reason: 'A fixed reduction',
        fundingSource: 'school',
        precedence: 70,
      },
      institutionId
    );
    const stored = (await discount.listRules(institutionId)).find((rule) => rule.id === row.id);
    expect(stored?.basis).toEqual({ kind: 'amount', amount: fromMinor(500_000, FIXTURE_CURRENCY) });
  });
});
