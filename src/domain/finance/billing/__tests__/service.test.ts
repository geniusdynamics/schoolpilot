// ABOUTME: The billing-run service, proven against a real SQLite database: the preview and its
// ABOUTME: reasons, the post in one transaction with sequence numbers and journal entries,
// ABOUTME: idempotent re-runs, proration to the shilling, ad-hoc charges and opening balances.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { asId, type Id } from '@/domain/ids';
import { fromMinor, isCurrencyCode, toDecimalString } from '@/domain/money';
import {
  LedgerService,
  createSqliteLedgerStore,
  ensureLedgerSchema,
} from '@/domain/finance/ledger';

import { createBillingFixture, type BillingFixture } from './fixtures';

let fixture: BillingFixture;

/** The decimal text of a stored amount, which the schema types as a plain currency string. */
function decimalOf(value: { readonly amount_minor: number; readonly currency: string } | null | undefined): string {
  if (!value || !isCurrencyCode(value.currency)) return '-';
  return toDecimalString(fromMinor(value.amount_minor, value.currency));
}

beforeEach(async () => {
  fixture = await createBillingFixture();
});

afterEach(async () => {
  await fixture.close();
});

/** The tuition a day learner of the fixture's level is billed. */
const TUITION_DAY = 600_000;

/** A published schedule of two cells: a day and a boarder tuition, both prorated by days. */
async function publishTuition(spec: { name?: string; version?: number; amountMinor?: number } = {}) {
  const tuition = await fixture.feeItem('TUIT-T1', 'Tuition', '4100');
  const schedule = await fixture.publishSchedule({
    name: spec.name ?? 'Term 1 2027 Fees',
    version: spec.version ?? 1,
    levelIds: [fixture.levelId],
    residences: ['day', 'boarder'],
    feeCategoryIds: [fixture.feeCategoryId],
    lines: [
      {
        feeItemId: tuition,
        amountMinor: spec.amountMinor ?? TUITION_DAY,
        levelId: fixture.levelId,
        residence: 'day',
        prorationRule: 'pro_rata_days',
      },
      {
        feeItemId: tuition,
        amountMinor: 900_000,
        levelId: fixture.levelId,
        residence: 'boarder',
        prorationRule: 'pro_rata_days',
      },
    ],
  });
  return { tuition, schedule };
}

/** A day learner enrolled from the period's first day. */
async function enrolDayLearner(admissionNumber: string, startDate = '2027-01-05') {
  return fixture.enrol({
    admissionNumber,
    residence: 'day',
    levelId: fixture.levelId,
    startDate,
    admissionDate: startDate,
  });
}

async function invoicesOf(periodId?: Id<'academic_period'>) {
  const page = await fixture.context.repository.list('invoice', {
    where: { academic_period_id: periodId ?? fixture.periodId },
    limit: 500,
  });
  // The seeded canonical fixtures carry one posted invoice for the seeded learner; the tests assert
  // on the invoices their own learners got.
  return page.items.filter((invoice) => invoice.learner_id !== fixture.seededLearnerId);
}

/** Every invoice a learner holds, whatever period it names (an opening balance names none). */
async function invoicesForLearner(learnerId: string) {
  const page = await fixture.context.repository.list('invoice', {
    where: { learner_id: learnerId },
    limit: 500,
  });
  return page.items;
}

async function linesOf(invoiceId: string) {
  const page = await fixture.context.repository.list('invoice_line', {
    where: { invoice_id: invoiceId },
    limit: 500,
  });
  return page.items;
}

async function ledgerOf() {
  await ensureLedgerSchema(fixture.context.adapter);
  return new LedgerService({ store: createSqliteLedgerStore(fixture.context.adapter) });
}

describe('the preview', () => {
  it('prices each learner from the version in force and says why, writing nothing', async () => {
    const { tuition, schedule } = await publishTuition();
    const learner = await enrolDayLearner('PRE-1');

    const preview = await fixture.service().preview(fixture.request({ learnerIds: [learner] }));

    expect(preview.lines).toHaveLength(1);
    const line = preview.lines[0];
    expect(line?.learnerId).toBe(learner);
    expect(decimalOf(line?.amount)).toBe('6000.00');
    expect(line?.isNewInvoice).toBe(true);
    expect(line?.items).toHaveLength(1);
    expect(line?.items[0]?.scheduleId).toBe(schedule.id);
    expect(line?.items[0]?.scheduleVersion).toBe(1);
    expect(line?.items[0]?.feeItemId).toBe(tuition);
    expect(line?.items[0]?.proration).toBeNull();
    expect(line?.reasons[0]).toContain('priced from Term 1 2027 Fees v1 (published)');
    expect(line?.reasons[0]).toContain(`level ${fixture.levelId}`);
    expect(preview.schedulePins).toEqual([
      { feeScheduleId: schedule.id, name: schedule.name, version: 1, status: 'published' },
    ]);
    expect(preview.totals).toMatchObject({
      learnersInScope: 1,
      learnersBilled: 1,
      newInvoices: 1,
      supplementaryInvoices: 0,
    });
    // Nothing is written by a preview.
    expect(await invoicesOf()).toHaveLength(0);
  });

  it('reports a learner with no enrolment', async () => {
    await publishTuition();
    const orphan = await fixture.context.repository.create(
      'learner',
      fixture.context.seed.inputFor('learner', {
        admission_number: 'PRE-ORPHAN',
        residence_status: 'day',
        status: 'enrolled',
      })
    );

    const preview = await fixture.service().preview(fixture.request({ learnerIds: [orphan.id] }));

    expect(preview.lines).toHaveLength(0);
    expect(preview.skips).toEqual([
      expect.objectContaining({ learnerId: orphan.id, code: 'no_enrolment' }),
    ]);
  });

  it('reports a learner no schedule prices, naming the level', async () => {
    await publishTuition();
    const otherLevel = await fixture.level('F2', 'Form 2', 2);
    const learner = await enrolDayLearner('PRE-2');
    // The learner is billed from the schedule of their own level; this run is limited to another.
    const preview = await fixture
      .service()
      .preview(fixture.request({ learnerIds: [learner], levelIds: [otherLevel] }));

    expect(preview.lines).toHaveLength(0);
    expect(preview.skips[0]?.code).toBe('no_schedule');
    expect(preview.skips[0]?.detail).toContain('limited to other levels');
  });

  it('reports a cell the matrix cannot resolve rather than guessing', async () => {
    const tuition = await fixture.feeItem('TUIT-AMB', 'Tuition');
    // A version that spans two residences but prices neither: its line's cell is unknowable.
    const ambiguous = await fixture.publishSchedule({
      name: 'Ambiguous 2027',
      levelIds: [fixture.levelId],
      residences: ['day', 'boarder'],
      feeCategoryIds: [fixture.feeCategoryId],
      lines: [{ feeItemId: tuition, amountMinor: TUITION_DAY, levelId: fixture.levelId }],
    });
    const learner = await enrolDayLearner('PRE-3');

    const preview = await fixture
      .service()
      .preview(fixture.request({ learnerIds: [learner], scheduleIds: [ambiguous.id] }));

    expect(preview.lines).toHaveLength(0);
    expect(preview.skips[0]?.code).toBe('cell_unresolved');
    expect(preview.skips[0]?.detail).toContain('Ambiguous 2027 v1');
  });

  it('prorates a mid-period joiner and a leaver exactly, and says the fraction', async () => {
    await publishTuition();
    const joiner = await enrolDayLearner('PRE-4', '2027-02-01');
    const leaver = await fixture.enrol({
      admissionNumber: 'PRE-5',
      residence: 'day',
      levelId: fixture.levelId,
      startDate: '2027-01-05',
      endDate: '2027-03-15',
      status: 'left',
      exitReason: 'withdrawn',
    });

    const preview = await fixture
      .service()
      .preview(fixture.request({ learnerIds: [joiner, leaver] }));

    const byLearner = new Map(preview.lines.map((line) => [line.learnerId, line]));
    // The period is 2027-01-05..2027-04-10: 96 days. Joining 2027-02-01 leaves 69 days, so
    // 6,000.00 × 69/96 = 4,312.50 exactly. Leaving 2027-03-15 leaves 70 days, 6,000.00 × 70/96 =
    // 4,375.00 exactly.
    const joined = byLearner.get(joiner);
    expect(decimalOf(joined?.amount)).toBe('4312.50');
    expect(joined?.items[0]?.proration).toMatchObject({ numerator: 69, denominator: 96, rule: 'pro_rata_days' });
    expect(decimalOf(joined?.items[0]?.listAmount)).toBe('6000.00');

    const left = byLearner.get(leaver);
    expect(decimalOf(left?.amount)).toBe('4375.00');
    expect(left?.items[0]?.proration).toMatchObject({ numerator: 70, denominator: 96 });
  });

  it('rounds a prorated amount that is not a whole minor unit, half up', async () => {
    await publishTuition({ amountMinor: 550_000 });
    const joiner = await enrolDayLearner('PRE-6', '2027-02-01');

    const preview = await fixture.service().preview(fixture.request({ learnerIds: [joiner] }));

    // 5,500.00 × 69/96 = 3,953.125: half up is 3,953.13.
    expect(decimalOf(preview.lines[0]?.amount)).toBe('3953.13');
    expect(preview.lines[0]?.items[0]?.proration?.rounding).toBe('half_up');
  });

  it('shows a one-off charge and an opening balance with their reasons', async () => {
    await publishTuition();
    const fine = await fixture.feeItem('FINE-T1', 'Library fine', '4200');
    const learner = await enrolDayLearner('PRE-7');

    const preview = await fixture.service().preview(
      fixture.request(
        { learnerIds: [learner] },
        {
          adhocCharges: [
            {
              learnerId: learner,
              feeItemId: fine,
              description: 'Damaged textbook',
              amount: { amount_minor: 50_000, currency: 'KES' },
              kind: 'fine',
            },
          ],
          openingBalances: [
            { learnerId: learner, amount: { amount_minor: 250_000, currency: 'KES' }, side: 'debit', asOfDate: '2027-01-05' },
          ],
        }
      )
    );

    const line = preview.lines[0];
    expect(line?.items.map((item) => item.source)).toEqual(['schedule', 'adhoc', 'opening_balance']);
    expect(line?.items[1]?.kind).toBe('fine');
    expect(decimalOf(line?.amount)).toBe('9000.00');
    expect(line?.reasons.some((reason) => reason.includes('one-off charge: Damaged textbook'))).toBe(true);
    expect(line?.reasons.some((reason) => reason.includes('opening balance carried from a previous system'))).toBe(true);
  });

  it('reports a learner who is already billed, and a charge outside the cohort', async () => {
    await publishTuition();
    const learner = await enrolDayLearner('PRE-8');
    await fixture.service().post(fixture.request({ learnerIds: [learner] }));
    const stranger = await enrolDayLearner('PRE-9');
    const fine = await fixture.feeItem('FINE-T1', 'Library fine', '4200');

    const preview = await fixture.service().preview(
      fixture.request(
        { learnerIds: [learner] },
        {
          adhocCharges: [
            {
              learnerId: stranger,
              feeItemId: fine,
              description: 'Trip',
              amount: { amount_minor: 10_000, currency: 'KES' },
              kind: 'other',
            },
          ],
        }
      )
    );

    const codes = preview.skips.map((skip) => `${skip.learnerId}:${skip.code}`);
    expect(codes).toContain(`${learner}:already_billed`);
    expect(codes).toContain(`${stranger}:out_of_scope`);
  });
});

describe('the post', () => {
  it('writes one invoice per learner, numbers it from the sequence and posts the entry', async () => {
    const { tuition, schedule } = await publishTuition();
    const learner = await enrolDayLearner('POST-1');

    const outcome = await fixture.service().post(fixture.request({ learnerIds: [learner] }));

    expect(outcome.posted).toBe(true);
    expect(outcome.replayed).toBe(false);
    expect(outcome.invoicesCreated).toBe(1);
    expect(outcome.ledgerEntries).toBe(1);
    expect(toDecimalString(outcome.amount)).toBe('6000.00');

    const invoices = await invoicesOf();
    expect(invoices).toHaveLength(1);
    const invoice = invoices[0];
    expect(invoice?.number).toBe('INV/2027/1/000001');
    expect(invoice?.status).toBe('posted');
    expect(invoice?.learner_id).toBe(learner);
    expect(decimalOf(invoice?.total)).toBe('6000.00');

    const lines = await linesOf(invoice?.id ?? '');
    expect(lines).toHaveLength(1);
    expect(lines[0]?.fee_item_id).toBe(tuition);
    expect(lines[0]?.kind).toBe('fee');
    // The schedule version cannot be a column on the line, so the description carries it.
    expect(lines[0]?.description).toBe(`TUIT-T1 Tuition (${schedule.name} v1)`);

    const ledger = await ledgerOf();
    const entries = await ledger.listEntries({ institutionId: fixture.institutionId });
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry?.source).toEqual({ kind: 'invoice', id: invoice?.id, number: invoice?.number });
    expect(entry?.totalDebit).toEqual(entry?.totalCredit);
    const byCode = Object.fromEntries(
      (entry?.lines ?? []).map((line) => [line.accountCode, line.debit?.amount_minor ?? -(line.credit?.amount_minor ?? 0)])
    );
    // Receivables debited with the total, the fee item's own revenue account credited.
    expect(byCode['1100']).toBe(600_000);
    expect(byCode['4100']).toBe(-600_000);
  });

  it('posts nothing when a learner fails, because the run is one transaction', async () => {
    await publishTuition();
    const first = await enrolDayLearner('TX-1');
    const second = await enrolDayLearner('TX-2');
    const missingItem = asId<'fee_item'>('00000000-0000-7000-8000-00000000dead');

    await expect(
      fixture.service().post(
        fixture.request(
          { learnerIds: [first, second] },
          {
            adhocCharges: [
              {
                learnerId: second,
                feeItemId: missingItem,
                description: 'A charge against a vote head that does not exist',
                amount: { amount_minor: 1_000, currency: 'KES' },
                kind: 'fine',
              },
            ],
          }
        )
      )
    ).rejects.toThrow();

    expect(await invoicesOf()).toHaveLength(0);
    const ledger = await ledgerOf();
    expect(await ledger.listEntries({ institutionId: fixture.institutionId })).toHaveLength(0);
    // Nothing recorded the run, so it can be posted again once the cause is fixed.
    const retry = await fixture.service().post(fixture.request({ learnerIds: [first] }));
    expect(retry.posted).toBe(true);
    expect(await invoicesOf()).toHaveLength(1);
  });

  it('bills a one-off charge on the learner invoice with its own vote head', async () => {
    await publishTuition();
    const fine = await fixture.feeItem('FINE-T1', 'Library fine', '4200');
    const learner = await enrolDayLearner('POST-2');

    await fixture.service().post(
      fixture.request(
        { learnerIds: [learner] },
        {
          adhocCharges: [
            {
              learnerId: learner,
              feeItemId: fine,
              description: 'Damaged textbook',
              amount: { amount_minor: 50_000, currency: 'KES' },
              kind: 'fine',
            },
          ],
        }
      )
    );

    const invoices = await invoicesOf();
    expect(invoices).toHaveLength(1);
    expect(decimalOf(invoices[0]?.total)).toBe('6500.00');
    const lines = await linesOf(invoices[0]?.id ?? '');
    expect(lines.map((line) => line.kind).sort()).toEqual(['fee', 'fine']);
    const chargeLine = lines.find((line) => line.kind === 'fine');
    expect(chargeLine?.fee_item_id).toBe(fine);

    const ledger = await ledgerOf();
    const entry = (await ledger.listEntries({ institutionId: fixture.institutionId }))[0];
    const byCode = Object.fromEntries(
      (entry?.lines ?? []).map((line) => [line.accountCode, line.debit?.amount_minor ?? -(line.credit?.amount_minor ?? 0)])
    );
    // The charge posts to its own vote head's account, not to tuition.
    expect(byCode['4200']).toBe(-50_000);
    expect(byCode['4100']).toBe(-600_000);
    expect(byCode['1100']).toBe(650_000);
  });

  it('carries an opening balance through the opening-balance entry, not revenue', async () => {
    await publishTuition();
    const learner = await enrolDayLearner('POST-3');

    const outcome = await fixture.service().post(
      fixture.request(
        { learnerIds: [learner] },
        {
          openingBalances: [
            { learnerId: learner, amount: { amount_minor: 250_000, currency: 'KES' }, side: 'debit', asOfDate: '2027-01-05' },
          ],
        }
      )
    );

    expect(outcome.invoicesCreated).toBe(2);
    const invoices = await invoicesForLearner(learner);
    expect(invoices).toHaveLength(2);
    const opening = invoices.find((invoice) => invoice.number.endsWith('000002'));
    expect(opening).toBeDefined();
    expect(opening?.academic_period_id).toBeUndefined();
    expect(opening?.issue_date).toBe('2027-01-05');
    expect(decimalOf(opening?.total)).toBe('2500.00');
    const lines = await linesOf(opening?.id ?? '');
    expect(lines[0]?.kind).toBe('opening_balance');

    const ledger = await ledgerOf();
    const entries = await ledger.listEntries({ institutionId: fixture.institutionId });
    const openingEntry = entries.find((entry) => entry.source.kind === 'opening_balance');
    const byCode = Object.fromEntries(
      (openingEntry?.lines ?? []).map((line) => [line.accountCode, line.debit?.amount_minor ?? -(line.credit?.amount_minor ?? 0)])
    );
    // Receivables against opening-balance equity: an invoice entry would have credited revenue.
    expect(byCode['1100']).toBe(250_000);
    expect(byCode['3000']).toBe(-250_000);
  });
});

describe('idempotency', () => {
  it('replays the same run instead of billing twice, and the invoice count is unchanged', async () => {
    await publishTuition();
    const learner = await enrolDayLearner('IDEM-1');
    const request = fixture.request({ learnerIds: [learner] });

    const first = await fixture.service().post(request);
    const second = await fixture.service().post(request);

    expect(first.key).toBe(second.key);
    expect(second.replayed).toBe(true);
    expect(second.posted).toBe(false);
    expect(second.invoicesCreated).toBe(0);
    expect(second.ledgerEntries).toBe(0);
    expect(second.amount.amount_minor).toBe(0);
    expect(second.original?.invoicesCreated).toBe(1);
    expect(second.original?.learnersBilled).toBe(1);
    expect(await invoicesOf()).toHaveLength(1);
    const ledger = await ledgerOf();
    expect(await ledger.listEntries({ institutionId: fixture.institutionId })).toHaveLength(1);
  });

  it('adds only the missing items on a supplementary invoice when a new version prices more', async () => {
    const { tuition } = await publishTuition();
    const learner = await enrolDayLearner('IDEM-2');
    const first = await fixture.service().post(fixture.request({ learnerIds: [learner] }));

    // A second published version of the same matrix prices the tuition and an activity fee.
    const activity = await fixture.feeItem('ACT-T1', 'Activity');
    await fixture.publishSchedule({
      name: 'Term 1 2027 Fees',
      version: 2,
      levelIds: [fixture.levelId],
      residences: ['day', 'boarder'],
      feeCategoryIds: [fixture.feeCategoryId],
      lines: [
        { feeItemId: tuition, amountMinor: TUITION_DAY, levelId: fixture.levelId, residence: 'day', prorationRule: 'pro_rata_days' },
        { feeItemId: tuition, amountMinor: 900_000, levelId: fixture.levelId, residence: 'boarder', prorationRule: 'pro_rata_days' },
        { feeItemId: activity, amountMinor: 100_000, levelId: fixture.levelId, residence: 'day' },
      ],
    });

    const second = await fixture.service().post(fixture.request({ learnerIds: [learner] }));

    // The version changed, so this is a different run; the tuition is already billed, so only the
    // activity fee is added, on a supplementary invoice.
    expect(second.key).not.toBe(first.key);
    expect(second.replayed).toBe(false);
    expect(second.invoicesCreated).toBe(1);
    expect(second.supplementaryInvoices).toBe(1);
    expect(toDecimalString(second.amount)).toBe('1000.00');

    const invoices = await invoicesOf();
    expect(invoices).toHaveLength(2);
    const supplementary = invoices.find((invoice) => invoice.number !== 'INV/2027/1/000001');
    const lines = await linesOf(supplementary?.id ?? '');
    expect(lines).toHaveLength(1);
    expect(lines[0]?.fee_item_id).toBe(activity);
    // The invoice the learner was billed from is untouched: a posted invoice is immutable.
    const original = invoices.find((invoice) => invoice.number === 'INV/2027/1/000001');
    expect(decimalOf(original?.total)).toBe('6000.00');
  });

  it('prices a re-run with a wider cohort only for the learners it added', async () => {
    await publishTuition();
    const first = await enrolDayLearner('COH-1');
    const firstOutcome = await fixture.service().post(fixture.request({ learnerIds: [first] }));

    const admittedLater = await enrolDayLearner('COH-2');
    const second = await fixture.service().post(fixture.request({ learnerIds: [first, admittedLater] }));

    expect(second.key).not.toBe(firstOutcome.key);
    expect(second.invoicesCreated).toBe(1);
    expect(second.preview.totals.learnersSkipped).toBe(1);
    expect(second.preview.skips[0]).toMatchObject({ learnerId: first, code: 'already_billed' });
    expect(await invoicesOf()).toHaveLength(2);
  });
});
