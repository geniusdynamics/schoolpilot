// ABOUTME: The installments module proven against a real SQLite database and the money module: the
// ABOUTME: exact splits (equal and by percentage), the awkward cases that must sum to the total, the
// ABOUTME: due dates and the late state, the schedule line's own installment_plan column, and the refusals.

import { afterEach, describe, expect, it } from 'vitest';

import {
  closeTestContext,
  createTestContext,
  type TestContext,
} from '@/data/__tests__/harness';
import { asId } from '@/domain/ids';
import { fromMinor, isMoney, sum, toDecimalString, type Money } from '@/domain/money';

import { isInstallmentError, type InstallmentErrorCode } from '../errors';
import {
  dueDatesOf,
  installmentStatus,
  installmentsForAmount,
} from '../plan';
import { InstallmentPlanService } from '../service';
import {
  DEFAULT_INSTALLMENT_ROUNDING,
  percentBasisPoints,
  splitByPercentages,
  splitEqually,
} from '../split';
import type { InstallmentPart } from '../types';

const kes = (minor: number) => fromMinor(minor, 'KES');
const ugx = (minor: number) => fromMinor(minor, 'UGX');

const contexts: TestContext[] = [];

async function freshContext(): Promise<TestContext> {
  const context = await createTestContext();
  contexts.push(context);
  return context;
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => closeTestContext(context)));
});

function serviceFor(context: TestContext): InstallmentPlanService {
  return new InstallmentPlanService({ store: context.repository });
}

/** Runs a call and returns the refusal code it raised. */
async function refusalCode(run: () => Promise<unknown> | unknown): Promise<InstallmentErrorCode> {
  try {
    await run();
  } catch (error) {
    if (isInstallmentError(error)) return error.code;
    throw error;
  }
  throw new Error('the call was expected to be refused');
}

/** The minor-unit amounts of a split, for a compact assertion. */
const minors = (parts: readonly Money[]): number[] => parts.map((part) => part.amount_minor);

describe('the exact split: equal', () => {
  it('splits 100.00 into three so the parts sum exactly, the odd unit landing first', () => {
    const parts = splitEqually(kes(10_000), 3);
    expect(minors(parts)).toEqual([3334, 3333, 3333]);
    expect(toDecimalString(sum(parts))).toBe('100.00');
  });

  it('splits the smallest amount there is: 0.01 into three', () => {
    const parts = splitEqually(kes(1), 3);
    expect(minors(parts)).toEqual([1, 0, 0]);
    expect(sum(parts).amount_minor).toBe(1);
  });

  it('splits a zero-decimal currency: 100,000 UGX into three', () => {
    const parts = splitEqually(ugx(100_000), 3);
    expect(minors(parts)).toEqual([33334, 33333, 33333]);
    expect(parts.every((part) => part.currency === 'UGX')).toBe(true);
    expect(sum(parts).amount_minor).toBe(100_000);
  });

  it('refuses a count that is not a whole number at or above one', () => {
    expect(() => splitEqually(kes(100), 0)).toThrowError(/whole number/);
    expect(() => splitEqually(kes(100), 2.5)).toThrowError(/whole number/);
  });
});

describe('the exact split: by declared percentages', () => {
  const thirds = [33.33, 33.33, 33.34] as const;

  it('splits 100.00 into three percentages that sum exactly', () => {
    const parts = splitByPercentages(kes(10_000), thirds, 'half_up');
    expect(minors(parts)).toEqual([3333, 3333, 3334]);
    expect(sum(parts).amount_minor).toBe(10_000);
  });

  it('splits 0.01 into three percentages, the residual landing on the last', () => {
    const parts = splitByPercentages(kes(1), thirds, 'half_up');
    expect(minors(parts)).toEqual([0, 0, 1]);
    expect(sum(parts).amount_minor).toBe(1);
  });

  it('splits a zero-decimal currency exactly', () => {
    const parts = splitByPercentages(ugx(100_000), thirds, 'half_up');
    expect(sum(parts).amount_minor).toBe(100_000);
    expect(minors(parts)).toEqual([33330, 33330, 33340]);
  });

  it('applies the named rounding mode explicitly: half_up and down differ', () => {
    const half = splitByPercentages(kes(5), thirds, 'half_up');
    const down = splitByPercentages(kes(5), thirds, 'down');
    expect(minors(half)).toEqual([2, 2, 1]);
    expect(minors(down)).toEqual([1, 1, 3]);
    expect(sum(half).amount_minor).toBe(5);
    expect(sum(down).amount_minor).toBe(5);
  });

  it('refuses percentages that do not sum to 100', async () => {
    expect(await refusalCode(() => splitByPercentages(kes(10_000), [50, 40], 'half_up'))).toBe(
      'percentages_do_not_sum'
    );
  });

  it('refuses a percentage that needs more than two decimals', async () => {
    expect(
      await refusalCode(() => splitByPercentages(kes(10_000), [33.333, 33.333, 33.334], 'half_up'))
    ).toBe('percent_precision');
    expect(percentBasisPoints(7.5)).toBe(750);
  });
});

describe('a plan split into dated amounts', () => {
  const plan: readonly InstallmentPart[] = [
    { sequence: 1, dueDate: '2027-01-05', percent: 50 },
    { sequence: 2, dueDate: '2027-02-20', percent: 30 },
    { sequence: 3, dueDate: '2027-03-20', percent: 20 },
  ];

  it('gives each installment its share of the schedule line’s own amount', () => {
    const installments = installmentsForAmount(kes(600_000), plan, DEFAULT_INSTALLMENT_ROUNDING);
    expect(installments.map((installment) => installment.amount.amount_minor)).toEqual([
      300_000, 180_000, 120_000,
    ]);
    expect(sum(installments.map((installment) => installment.amount)).amount_minor).toBe(600_000);
    expect(installments.every((installment) => isMoney(installment.amount))).toBe(true);
  });

  it('reads the due dates in sequence order', () => {
    expect(dueDatesOf(plan)).toEqual(['2027-01-05', '2027-02-20', '2027-03-20']);
  });

  it('refuses a plan whose percentages do not sum', async () => {
    const bad: readonly InstallmentPart[] = [
      { sequence: 1, dueDate: '2027-01-05', percent: 50 },
      { sequence: 2, dueDate: '2027-02-20', percent: 40 },
    ];
    expect(
      await refusalCode(() => installmentsForAmount(kes(100), bad, DEFAULT_INSTALLMENT_ROUNDING))
    ).toBe('percentages_do_not_sum');
  });

  it('refuses a duplicate sequence and a malformed due date', async () => {
    expect(
      await refusalCode(() =>
        installmentsForAmount(
          kes(100),
          [
            { sequence: 1, dueDate: '2027-01-05', percent: 50 },
            { sequence: 1, dueDate: '2027-02-20', percent: 50 },
          ],
          DEFAULT_INSTALLMENT_ROUNDING
        )
      )
    ).toBe('sequence_duplicate');
    expect(
      await refusalCode(() =>
        installmentsForAmount(
          kes(100),
          [{ sequence: 1, dueDate: '5 January', percent: 100 }],
          DEFAULT_INSTALLMENT_ROUNDING
        )
      )
    ).toBe('due_date_invalid');
  });

  it('keeps a late installment a state, never a change to its amount', () => {
    const installment = installmentsForAmount(
      kes(10_000),
      [{ sequence: 1, dueDate: '2027-01-05', percent: 100 }],
      DEFAULT_INSTALLMENT_ROUNDING
    )[0];
    const before = installment.amount;
    expect(installmentStatus(installment.dueDate, '2027-01-05')).toBe('due');
    expect(installmentStatus(installment.dueDate, '2027-01-04')).toBe('scheduled');
    expect(installmentStatus(installment.dueDate, '2027-02-01')).toBe('overdue');
    expect(installmentStatus(installment.dueDate, '2027-02-01', '2027-01-06')).toBe('paid');
    expect(installment.amount).toEqual(before);
  });
});

describe('the canonical installment_plan rows, on real SQLite', () => {
  it('creates a plan and reads it back', async () => {
    const context = await freshContext();
    const service = serviceFor(context);
    const plan = await service.create({
      institutionId: context.seed.idOf('institution'),
      name: 'Term 1 thirds',
      academicPeriodId: context.seed.idOf('academic_period'),
      installments: [
        { sequence: 1, dueDate: '2027-01-05', percent: 50 },
        { sequence: 2, dueDate: '2027-02-20', percent: 30 },
        { sequence: 3, dueDate: '2027-03-20', percent: 20 },
      ],
    });

    const read = await service.plan(plan.id);
    expect(read.name).toBe('Term 1 thirds');
    expect(read.academicPeriodId).toBe(context.seed.idOf('academic_period'));
    expect(read.installments).toEqual([
      { sequence: 1, dueDate: '2027-01-05', percent: 50 },
      { sequence: 2, dueDate: '2027-02-20', percent: 30 },
      { sequence: 3, dueDate: '2027-03-20', percent: 20 },
    ]);
  });

  it('refuses a plan that does not sum to the whole, before anything is written', async () => {
    const context = await freshContext();
    const service = serviceFor(context);
    expect(
      await refusalCode(() =>
        service.create({
          institutionId: context.seed.idOf('institution'),
          name: 'Broken',
          installments: [
            { sequence: 1, dueDate: '2027-01-05', percent: 50 },
            { sequence: 2, dueDate: '2027-02-20', percent: 40 },
          ],
        })
      )
    ).toBe('percentages_do_not_sum');
    const page = await context.repository.list('installment_plan', { limit: 500 });
    // Only the seeded plan remains: the refused one was never written.
    expect(page.items.some((row) => row.name === 'Broken')).toBe(false);
  });

  it('refuses a plan with no name', async () => {
    const context = await freshContext();
    const service = serviceFor(context);
    expect(
      await refusalCode(() =>
        service.create({
          institutionId: context.seed.idOf('institution'),
          name: '   ',
          installments: [{ sequence: 1, dueDate: '2027-01-05', percent: 100 }],
        })
      )
    ).toBe('name_required');
  });

  it('refuses a plan that does not exist', async () => {
    const context = await freshContext();
    const service = serviceFor(context);
    expect(await refusalCode(() => service.plan(asId<'installment_plan'>('01930000-0000-7000-8000-000000000099')))).toBe(
      'plan_not_found'
    );
  });
});

describe('a schedule line’s own installment_plan column', () => {
  it('splits the line’s amount by the plan it names, without duplicating the plan', async () => {
    const context = await freshContext();
    const service = serviceFor(context);
    const result = await service.installmentsForScheduleLine(context.seed.idOf('fee_schedule_line'));

    expect(result.source).toBe('plan');
    expect(result.installmentPlanId).toBe(context.seed.idOf('installment_plan'));
    expect(result.planName).toBe('Term 1 three-part plan');
    expect(result.amount.amount_minor).toBe(600_000);
    expect(result.installments.map((installment) => installment.amount.amount_minor)).toEqual([
      300_000, 180_000, 120_000,
    ]);
    expect(result.installments.map((installment) => installment.dueDate)).toEqual([
      '2027-01-05', '2027-02-20', '2027-03-20',
    ]);
  });

  it('splits the amount equally across the line’s own due dates when it names no plan', async () => {
    const context = await freshContext();
    const service = serviceFor(context);
    const line = await context.repository.create(
      'fee_schedule_line',
      context.seed.inputFor('fee_schedule_line', {
        installment_plan_id: undefined,
        due_dates: ['2027-01-05', '2027-02-05', '2027-03-05'],
        amount: { amount_minor: 10_000, currency: 'KES' },
      })
    );

    const result = await service.installmentsForScheduleLine(line.id);
    expect(result.source).toBe('line_due_dates');
    expect(result.installments.map((installment) => installment.amount.amount_minor)).toEqual([
      3334, 3333, 3333,
    ]);
    expect(sum(result.installments.map((installment) => installment.amount)).amount_minor).toBe(
      10_000
    );
  });

  it('returns a line that names neither a plan nor due dates whole, not split', async () => {
    const context = await freshContext();
    const service = serviceFor(context);
    const line = await context.repository.create(
      'fee_schedule_line',
      context.seed.inputFor('fee_schedule_line', {
        installment_plan_id: undefined,
        due_dates: undefined,
      })
    );

    const result = await service.installmentsForScheduleLine(line.id);
    expect(result.source).toBe('whole');
    expect(result.installments).toEqual([]);
    expect(result.amount.amount_minor).toBe(600_000);
  });

  it('refuses a schedule line that does not exist', async () => {
    const context = await freshContext();
    const service = serviceFor(context);
    expect(
      await refusalCode(() =>
        service.installmentsForScheduleLine(
          asId<'fee_schedule_line'>('01930000-0000-7000-8000-000000000098')
        )
      )
    ).toBe('schedule_line_not_found');
  });
});
