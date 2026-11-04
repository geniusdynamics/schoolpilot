// ABOUTME: Tests the fee status report's grouping and filters: one row per class-group and vote head,
// ABOUTME: distinct learners counted once, draft lines excluded, and exact minor-unit totals.

import { describe, expect, it } from 'vitest';

import type { FinanceInvoiceLineRow, FinanceLearnerRow } from '../../data/canonicalFinance';
import { buildFeeStatusReport, EMPTY_FEE_STATUS_FILTERS } from '../feeStatus';

const TUITION = '11111111-1111-7111-8111-111111111111';
const LUNCH = '22222222-2222-7222-8222-222222222222';

interface LearnerInput {
  readonly id: string;
  readonly classLabel: string;
  readonly streamName: string;
  readonly classGroupId: string;
  readonly levelId?: string;
  /** The display text an older reader produced: a bare stream name. The builder must not group by it. */
  readonly className?: string;
}

const learner = (input: LearnerInput): FinanceLearnerRow =>
  ({
    id: input.id,
    name: input.id,
    admissionNumber: input.id,
    status: 'enrolled',
    className: input.className ?? `${input.classLabel} · ${input.streamName}`,
    classLabel: input.classLabel,
    streamName: input.streamName,
    classGroupId: input.classGroupId,
    levelId: input.levelId ?? 'level-1',
    levelName: input.classLabel,
    row: { id: input.id },
  }) as unknown as FinanceLearnerRow;

const line = (input: {
  readonly id: string;
  readonly learnerId: string | null;
  readonly feeItemId: string | null;
  readonly amountMinor: number;
  readonly paidMinor: number;
  readonly status?: string;
  readonly description?: string;
}): FinanceInvoiceLineRow =>
  ({
    id: input.id,
    invoiceId: 'invoice-1',
    invoiceNumber: 'INV-1',
    learnerId: input.learnerId,
    learnerName: input.learnerId ?? '',
    periodId: 'period-1',
    periodName: 'Term 1',
    invoiceStatus: input.status ?? 'posted',
    description: input.description ?? 'Fee line',
    kind: 'fee',
    amount: { amount_minor: input.amountMinor, currency: 'KES' },
    paid: { amount_minor: input.paidMinor, currency: 'KES' },
    balance: { amount_minor: input.amountMinor - input.paidMinor, currency: 'KES' },
    row: { id: input.id, fee_item_id: input.feeItemId },
  }) as unknown as FinanceInvoiceLineRow;

const learners = [
  learner({ id: 'learner-1', classLabel: 'Form 1', streamName: 'Blue', classGroupId: 'class-1' }),
  learner({ id: 'learner-2', classLabel: 'Form 1', streamName: 'Red', classGroupId: 'class-2' }),
];

const lines = [
  line({ id: 'line-1', learnerId: 'learner-1', feeItemId: TUITION, amountMinor: 100_000, paidMinor: 40_000 }),
  line({ id: 'line-2', learnerId: 'learner-1', feeItemId: LUNCH, amountMinor: 20_000, paidMinor: 20_000 }),
  line({ id: 'line-3', learnerId: 'learner-1', feeItemId: TUITION, amountMinor: 5_000, paidMinor: 0 }),
  line({ id: 'line-4', learnerId: 'learner-2', feeItemId: TUITION, amountMinor: 50_000, paidMinor: 50_000 }),
  line({
    id: 'line-5',
    learnerId: 'learner-2',
    feeItemId: TUITION,
    amountMinor: 99_900,
    paidMinor: 0,
    status: 'draft',
  }),
];

const feeItems = [
  { id: TUITION, code: 'TUITION', name: 'Tuition' },
  { id: LUNCH, code: 'LUNCH', name: 'Lunch' },
];

describe('buildFeeStatusReport', () => {
  it('groups by class-group and vote head and counts a learner once per group', () => {
    const report = buildFeeStatusReport({
      lines,
      learners,
      feeItems,
      filters: EMPTY_FEE_STATUS_FILTERS,
    });

    expect(report.rows).toHaveLength(3);
    const blueTuition = report.rows.find(
      (row) =>
        row.classLabel === 'Form 1' && row.streamName === 'Blue' && row.feeItem === 'TUITION Tuition'
    );
    expect(blueTuition).toMatchObject({
      learners: 1,
      billedMinor: 105_000,
      paidMinor: 40_000,
      balanceMinor: 65_000,
    });
    expect(report.totals).toMatchObject({
      learners: 2,
      billedMinor: 175_000,
      paidMinor: 110_000,
      balanceMinor: 65_000,
    });
  });

  it('excludes draft and void lines, and narrows by class-group id and vote head', () => {
    const report = buildFeeStatusReport({
      lines,
      learners,
      feeItems,
      filters: { ...EMPTY_FEE_STATUS_FILTERS, classGroupId: 'class-1', feeItemId: TUITION },
    });

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      classGroupId: 'class-1',
      classLabel: 'Form 1',
      streamName: 'Blue',
      feeItem: 'TUITION Tuition',
      learners: 1,
      billedMinor: 105_000,
      paidMinor: 40_000,
    });
    expect(report.totals.billedMinor).toBe(105_000);
  });

  it('narrows by grade id without collapsing the streams inside it', () => {
    const report = buildFeeStatusReport({
      lines,
      learners,
      feeItems,
      filters: { ...EMPTY_FEE_STATUS_FILTERS, levelId: 'level-1' },
    });

    expect(report.rows).toHaveLength(3);
    expect(new Set(report.rows.map((row) => row.streamName))).toEqual(new Set(['Blue', 'Red']));
  });

  it('keeps same-named streams of different grades apart, because the id is the identity', () => {
    const twoGrades = [
      learner({
        id: 'learner-7',
        classLabel: 'Grade 7',
        streamName: 'East',
        classGroupId: 'class-7-east',
        levelId: 'level-7',
        className: 'East',
      }),
      learner({
        id: 'learner-8',
        classLabel: 'Grade 8',
        streamName: 'East',
        classGroupId: 'class-8-east',
        levelId: 'level-8',
        className: 'East',
      }),
    ];
    const report = buildFeeStatusReport({
      lines: [
        line({ id: 'line-7', learnerId: 'learner-7', feeItemId: TUITION, amountMinor: 10_000, paidMinor: 0 }),
        line({ id: 'line-8', learnerId: 'learner-8', feeItemId: TUITION, amountMinor: 20_000, paidMinor: 0 }),
      ],
      learners: twoGrades,
      feeItems,
      filters: EMPTY_FEE_STATUS_FILTERS,
    });

    expect(report.rows).toHaveLength(2);
    expect(new Set(report.rows.map((row) => row.id)).size).toBe(2);
    expect(report.rows.map((row) => row.classLabel)).toEqual(['Grade 7', 'Grade 8']);
    expect(report.rows.every((row) => row.streamName === 'East')).toBe(true);
    expect(report.rows.map((row) => row.billedMinor)).toEqual([10_000, 20_000]);
  });

  it('keeps only rows with an outstanding balance when asked', () => {
    const report = buildFeeStatusReport({
      lines,
      learners,
      feeItems,
      filters: { ...EMPTY_FEE_STATUS_FILTERS, arrearsOnly: true },
    });

    expect(report.rows.map((row) => row.feeItem)).toEqual(['TUITION Tuition']);
    expect(report.rows[0]?.streamName).toBe('Blue');
    expect(report.totals.balanceMinor).toBe(65_000);
    expect(report.rows.every((row) => row.balanceMinor > 0)).toBe(true);
  });
});
