// ABOUTME: The fee book of the demo school and the terms it has billed: fee items with their GL accounts,
// ABOUTME: published schedules for this year and last, next year's in each approval state, and a billing
// ABOUTME: run per term through the billing service so every invoice is numbered and posted to the ledger.

import type { RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { fromMinor, type Money } from '@/domain/money';
import { BillingRunService } from '@/domain/finance/billing';
import type { AdHocChargeInput, OpeningBalanceInput } from '@/domain/finance/billing';
import {
  bursaryRule,
  discountRuleToRow,
  scholarshipRule,
  siblingRule,
  staffWardRule,
} from '@/domain/finance/discounts';

import type { DemoContext } from './context';
import { addDays, findOrCreate, listAll, sequenceYear, shiftYear } from './helpers';
import type { DemoRoster } from './people';

/** The fee items: the vote heads of the school, the GL revenue account each posts to, and the order a payment fills them. */
const FEE_ITEMS = [
  { code: 'TUITION', name: 'Tuition', category: 'tuition', gl: '4100', priority: 1 },
  { code: 'LUNCH', name: 'Lunch programme', category: 'meals', gl: '4200', priority: 2 },
  { code: 'ACTIVITY', name: 'Activity fee', category: 'activity', gl: '4300', priority: 3 },
  { code: 'EXAM', name: 'Internal examinations', category: 'exam', gl: '4400', priority: 4 },
  { code: 'EWC', name: 'Electricity, water and conservancy', category: 'other', gl: '4500', priority: 5 },
  { code: 'MEDICAL', name: 'Medical', category: 'other', gl: '4600', priority: 6 },
  { code: 'INSURANCE', name: 'Learner insurance', category: 'other', gl: '4700', priority: 7 },
  { code: 'DEVELOPMENT', name: 'Development levy', category: 'development_levy', gl: '4800', priority: 8 },
  { code: 'ADMISSION', name: 'Admission and ID card', category: 'other', gl: '4850', priority: 9 },
  { code: 'TRANSPORT', name: 'School bus', category: 'transport', gl: '4900', priority: 10 },
  { code: 'UNIFORM', name: 'Uniform and books', category: 'uniform_books', gl: '4950', priority: 11 },
  { code: 'LIBFINE', name: 'Library fines', category: 'fine', gl: '4960', priority: 12 },
] as const;

type FeeItemCode = (typeof FEE_ITEMS)[number]['code'];

/** What a level pays, in whole shillings, for the lowest, middle and top level; a line is billed per term unless it says otherwise. */
const SCHEDULE: ReadonlyArray<{
  readonly item: FeeItemCode;
  readonly amounts: readonly [number, number, number];
  readonly frequency: 'per_term' | 'per_year' | 'one_off_at_admission';
}> = [
  { item: 'TUITION', amounts: [11_000, 11_500, 12_000], frequency: 'per_term' },
  { item: 'LUNCH', amounts: [4_200, 4_200, 4_200], frequency: 'per_term' },
  { item: 'ACTIVITY', amounts: [1_200, 1_200, 1_200], frequency: 'per_term' },
  { item: 'EXAM', amounts: [800, 900, 1_000], frequency: 'per_term' },
  { item: 'EWC', amounts: [700, 700, 700], frequency: 'per_term' },
  { item: 'MEDICAL', amounts: [400, 400, 400], frequency: 'per_term' },
  { item: 'INSURANCE', amounts: [300, 300, 300], frequency: 'per_year' },
  { item: 'DEVELOPMENT', amounts: [2_000, 2_000, 2_000], frequency: 'per_year' },
  { item: 'ADMISSION', amounts: [1_500, 1_500, 1_500], frequency: 'one_off_at_admission' },
];

/** What a term of the school bus costs on each route, in whole shillings. */
const ROUTE_FARE = { route_a: 3_500, route_b: 4_200 } as const;
const ROUTE_LABEL = { route_a: 'Route A (town)', route_b: 'Route B (estate)' } as const;

/** Fees rise from one year to the next; this is last year's amount scaled up, to the nearest 50 shillings. */
const ANNUAL_RISE = 1.08;

export interface DemoFinance {
  readonly feeItems: ReadonlyMap<FeeItemCode, RepositoryRow<'fee_item'>>;
  readonly feeCategory: RepositoryRow<'fee_category'>;
  /** The invoices of each billed term, by the id of the term. */
  readonly invoicesByPeriod: ReadonlyMap<string, readonly RepositoryRow<'invoice'>[]>;
  /** The terms that were billed, oldest first, with the year each belongs to. */
  readonly billedTerms: readonly { readonly term: RepositoryRow<'academic_period'>; readonly isCurrentYear: boolean; readonly index: number }[];
  readonly money: (shillings: number) => Money;
}

const nearest50 = (shillings: number): number => Math.round(shillings / 50) * 50;

export async function seedFinance(
  ctx: DemoContext,
  roster: DemoRoster,
  actorUserId: string | undefined
): Promise<DemoFinance> {
  const { repository, institutionId, options } = ctx;
  ctx.at('fees');
  const money = (shillings: number) => ({ amount_minor: Math.round(shillings * 100), currency: ctx.currency });

  const feeItems = new Map<FeeItemCode, RepositoryRow<'fee_item'>>();
  for (const item of FEE_ITEMS) {
    const row = await findOrCreate<'fee_item'>(
      repository,
      'fee_item',
      { where: { institution_id: institutionId, code: item.code } },
      () => ({
        institution_id: institutionId,
        code: item.code,
        name: item.name,
        revenue_account_code: item.gl,
        category: item.category,
        refundable: false,
        taxable: false,
        priority: item.priority,
        funding_source: 'parent',
      }),
      options,
      () => ctx.count('fee_item')
    );
    feeItems.set(item.code, row);
  }

  // A fee schedule prices a cell of level x residence x category. The demo bills day scholars of one
  // category; declaring a dimension as exactly one value is what lets the billing run resolve a cell.
  const feeCategory = await findOrCreate<'fee_category'>(
    repository,
    'fee_category',
    { where: { institution_id: institutionId, code: 'DAY' } },
    () => ({ institution_id: institutionId, code: 'DAY', name: 'Day scholar' }),
    options,
    () => ctx.count('fee_category')
  );

  const levelIdsOf = (levels: readonly RepositoryRow<'level'>[]) => levels.map((level) => asId<'level'>(level.id));

  // The schedule of a year: one published version, a line per fee item per level.
  const writeSchedule = async (input: {
    readonly name: string;
    readonly year: RepositoryRow<'academic_year'>;
    readonly periods: readonly RepositoryRow<'academic_period'>[];
    readonly levels: readonly RepositoryRow<'level'>[];
    readonly factor: number;
    readonly status: 'draft' | 'submitted' | 'approved' | 'published';
  }): Promise<RepositoryRow<'fee_schedule'>> => {
    const schedule = await findOrCreate<'fee_schedule'>(
      repository,
      'fee_schedule',
      { where: { institution_id: institutionId, name: input.name } },
      () => ({
        institution_id: institutionId,
        name: input.name,
        academic_year_id: asId<'academic_year'>(input.year.id),
        academic_period_ids: input.periods.map((period) => asId<'academic_period'>(period.id)),
        programme_ids: [ctx.programmeId],
        level_ids: levelIdsOf(input.levels),
        residence_statuses: ['day'],
        fee_category_ids: [asId<'fee_category'>(feeCategory.id)],
        campus_id: ctx.campusId,
        new_learners_only: false,
        version: 1,
        status: input.status,
      }),
      options,
      () => ctx.count('fee_schedule')
    );
    const stored = await repository.list('fee_schedule_line', { where: { fee_schedule_id: schedule.id }, limit: 1 });
    if (stored.total > 0) return schedule;
    for (const level of input.levels) {
      const position = Math.min(ctx.levels.findIndex((candidate) => candidate.id === level.id), 2);
      for (const line of SCHEDULE) {
        const item = feeItems.get(line.item);
        if (!item) continue;
        await repository.create(
          'fee_schedule_line',
          {
            institution_id: institutionId,
            fee_schedule_id: asId<'fee_schedule'>(schedule.id),
            fee_item_id: asId<'fee_item'>(item.id),
            level_id: asId<'level'>(level.id),
            amount: money(nearest50((line.amounts[Math.max(position, 0)] ?? 0) * input.factor)),
            mandatory: true,
            frequency: line.frequency,
            due_dates: [input.periods[0]?.start_date ?? input.year.start_date],
            proration_rule: 'full',
            residence_status: 'day',
            fee_category_id: asId<'fee_category'>(feeCategory.id),
          },
          options
        );
        ctx.count('fee_schedule_line');
      }
    }
    return schedule;
  };

  await writeSchedule({
    name: `${ctx.previous.year.name} fees`,
    year: ctx.previous.year,
    periods: ctx.previous.terms,
    levels: ctx.levels,
    factor: 1,
    status: 'published',
  });
  await writeSchedule({
    name: `${ctx.current.year.name} fees`,
    year: ctx.current.year,
    periods: ctx.current.terms,
    levels: ctx.levels,
    factor: ANNUAL_RISE,
    status: 'published',
  });

  // Next year's fees are being worked out: each level's schedule sits at a different step of the
  // approval, so the schedules page shows a draft, one waiting for approval and one approved.
  const nextName = String(sequenceYear(ctx.current.year.start_date) + 1);
  const nextYear = await findOrCreate<'academic_year'>(
    repository,
    'academic_year',
    { where: { calendar_id: ctx.calendarId, name: nextName } },
    () => ({
      institution_id: institutionId,
      calendar_id: ctx.calendarId,
      name: nextName,
      start_date: shiftYear(ctx.current.year.start_date, 1),
      end_date: shiftYear(ctx.current.year.end_date, 1),
      status: 'planned',
    }),
    options,
    () => ctx.count('academic_year')
  );
  const steps = ['draft', 'submitted', 'approved'] as const;
  for (const [position, level] of ctx.levels.entries()) {
    await writeSchedule({
      name: `${nextName} fees - ${level.name}`,
      year: nextYear,
      periods: [],
      levels: [level],
      factor: ANNUAL_RISE * ANNUAL_RISE,
      status: steps[Math.min(position, steps.length - 1)] ?? 'draft',
    });
  }

  await seedDiscountPolicy(ctx, feeItems);

  // One billing run for each term the school has been through, oldest first.
  const billing = new BillingRunService({
    store: repository,
    ...(actorUserId ? { actor: actorUserId } : {}),
  });
  const billedTerms: Array<{ term: RepositoryRow<'academic_period'>; isCurrentYear: boolean; index: number }> = [
    ...ctx.previous.terms.map((term, index) => ({ term, isCurrentYear: false, index })),
    ...ctx.current.terms
      .map((term, index) => ({ term, isCurrentYear: true, index }))
      .filter((entry) => entry.index <= ctx.currentTermIndex),
  ];

  const invoicesByPeriod = new Map<string, readonly RepositoryRow<'invoice'>[]>();
  for (const billed of billedTerms) {
    const { term } = billed;
    const adhoc: AdHocChargeInput[] = [];
    const openings: OpeningBalanceInput[] = [];

    if (billed.isCurrentYear) {
      for (const entry of roster.learners) {
        const enrolled = entry.currentEnrolmentId !== null && (entry.leftOn === null || entry.leftOn >= term.start_date);
        if (!enrolled) continue;
        const { cast } = entry;
        const feeItem = (code: FeeItemCode): Id<'fee_item'> | undefined => {
          const row = feeItems.get(code);
          return row ? asId<'fee_item'>(row.id) : undefined;
        };

        const transport = feeItem('TRANSPORT');
        if (cast.transport && transport) {
          adhoc.push({
            learnerId: entry.learnerId,
            feeItemId: transport,
            description: `School bus, ${ROUTE_LABEL[cast.transport]}: ${term.name} ${ctx.current.year.name}`,
            amount: fromMinor(ROUTE_FARE[cast.transport] * 100, ctx.currency),
            kind: 'other',
          });
        }
        const uniform = feeItem('UNIFORM');
        if (cast.uniform && uniform && billed.index === 0) {
          adhoc.push({
            learnerId: entry.learnerId,
            feeItemId: uniform,
            description: `Uniform and books bought from the school store: ${ctx.current.year.name}`,
            amount: fromMinor(6_800 * 100, ctx.currency),
            kind: 'other',
          });
        }
        // A fine already settled belongs to the first term; one still owing belongs to this one.
        const fine = feeItem('LIBFINE');
        if (cast.libraryFine && fine) {
          const finedTerm = cast.libraryFine === 'paid' ? 0 : ctx.currentTermIndex;
          if (billed.index === finedTerm) {
            adhoc.push({
              learnerId: entry.learnerId,
              feeItemId: fine,
              description:
                cast.libraryFine === 'paid'
                  ? `Library fine: lost reader, ${term.name}`
                  : `Library fine: lost textbook, ${term.name}`,
              amount: fromMinor(850 * 100, ctx.currency),
              kind: 'fine',
            });
          }
        }
        if (cast.openingBalance && billed.index === 0) {
          openings.push({
            learnerId: entry.learnerId,
            amount: fromMinor(cast.openingBalance * 100, ctx.currency),
            side: 'debit',
            asOfDate: ctx.current.year.start_date,
          });
        }
      }
    }

    await billing.post({
      scope: { periodId: asId<'academic_period'>(term.id) },
      issueDate: term.start_date,
      dueDate: addDays(term.start_date, 14),
      ...(adhoc.length > 0 ? { adhocCharges: adhoc } : {}),
      ...(openings.length > 0 ? { openingBalances: openings } : {}),
    });
    ctx.count('billing_run');
    // Everything the run issued carries its issue date: an opening balance is an invoice with no
    // academic period, so grouping by period alone would leave it out of what the family pays.
    invoicesByPeriod.set(term.id, await listAll(repository, 'invoice', { where: { issue_date: term.start_date } }));
  }

  return { feeItems, feeCategory, invoicesByPeriod, billedTerms, money };
}

/**
 * The discount policy of the school, written as the rules and sponsorships a bursar would configure.
 *
 * The billing run does not apply discount rules yet (the discounts module is a seam the run does not
 * call), so the learners the notes name are given their discounts as credit notes, in the adjustments
 * step; these rows are the policy those credit notes follow, so the rules pages are not empty.
 */
async function seedDiscountPolicy(
  ctx: DemoContext,
  feeItems: ReadonlyMap<FeeItemCode, RepositoryRow<'fee_item'>>
): Promise<void> {
  const { repository, institutionId, options } = ctx;
  const tuition = feeItems.get('TUITION');
  const rules = [
    staffWardRule({ id: 'staff-ward-teaching', name: "Teacher's child: half tuition", basis: { kind: 'percent', percent: 50 }, feeItemCodes: ['TUITION'] }),
    staffWardRule({ id: 'staff-ward-support', name: "Support staff's child: quarter tuition", basis: { kind: 'percent', percent: 25 }, feeItemCodes: ['TUITION'] }),
    siblingRule({ id: 'sibling', name: 'Sibling discount', basis: { kind: 'percent', percent: 5 }, feeItemCodes: ['TUITION'] }),
    bursaryRule({ id: 'county-bursary', name: 'County bursary: half tuition', basis: { kind: 'percent', percent: 50 }, feeItemCodes: ['TUITION'], fundingSource: 'county_bursary' }),
    scholarshipRule({ id: 'proprietor-waiver', name: "Proprietor's child: fees waived", basis: { kind: 'percent', percent: 100 }, fundingSource: 'school' }),
  ];
  for (const rule of rules) {
    const row = discountRuleToRow(rule, institutionId);
    await findOrCreate<'discount_rule'>(
      repository,
      'discount_rule',
      { where: { institution_id: institutionId, name: rule.name } },
      () => row,
      options,
      () => ctx.count('discount_rule')
    );
  }
  for (const agreement of [
    { name: 'County bursary 2026', sponsor: 'County Education Board', source: 'county_bursary', percent: 50 },
    { name: 'Proprietor waiver', sponsor: 'School proprietor', source: 'school', percent: 100 },
  ] as const) {
    await findOrCreate<'sponsorship'>(
      repository,
      'sponsorship',
      { where: { institution_id: institutionId, name: agreement.name } },
      () => ({
        institution_id: institutionId,
        name: agreement.name,
        sponsor_name: agreement.sponsor,
        funding_source: agreement.source,
        fee_item_ids: tuition ? [asId<'fee_item'>(tuition.id)] : [],
        coverage_percent: agreement.percent,
        starts_on: ctx.current.year.start_date,
        ends_on: ctx.current.year.end_date,
      }),
      options,
      () => ctx.count('sponsorship')
    );
  }
}
