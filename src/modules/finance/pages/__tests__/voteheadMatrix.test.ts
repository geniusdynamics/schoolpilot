// ABOUTME: Tests the class vote-head matrix: one row per learner, one balance column per vote head,
// ABOUTME: and exact totals. Draft lines and other class-groups are excluded by id.

import { describe, expect, it } from 'vitest';

import type { FinanceInvoiceLineRow, FinanceLearnerRow } from '../../data/canonicalFinance';
import { buildVoteheadMatrix, EMPTY_VOTEHEAD_MATRIX_FILTERS } from '../voteheadMatrix';

const TUITION = '11111111-1111-7111-8111-111111111111';
const LUNCH = '22222222-2222-7222-8222-222222222222';

interface LearnerInput {
  readonly id: string;
  readonly name: string;
  readonly classLabel: string;
  readonly streamName: string;
  readonly classGroupId: string;
  readonly levelId?: string;
  /** The display text an older reader produced: a bare stream name. The builder must not filter by it. */
  readonly className?: string;
}

const learner = (input: LearnerInput): FinanceLearnerRow =>
  ({
    id: input.id,
    name: input.name,
    admissionNumber: `ADM-${input.id}`,
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
  readonly learnerId: string;
  readonly feeItemId: string;
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
    learnerName: input.learnerId,
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
  learner({ id: 'learner-1', name: 'Amina Wanjiku', classLabel: 'Form 1', streamName: 'Blue', classGroupId: 'class-1' }),
  learner({ id: 'learner-2', name: 'Brian Otieno', classLabel: 'Form 1', streamName: 'Blue', classGroupId: 'class-1' }),
  learner({ id: 'learner-3', name: 'Cate Mwangi', classLabel: 'Form 2', streamName: 'Red', classGroupId: 'class-2', levelId: 'level-2' }),
];

const lines = [
  line({ id: 'line-1', learnerId: 'learner-1', feeItemId: TUITION, amountMinor: 100_000, paidMinor: 40_000 }),
  line({ id: 'line-2', learnerId: 'learner-1', feeItemId: LUNCH, amountMinor: 20_000, paidMinor: 20_000 }),
  line({ id: 'line-3', learnerId: 'learner-2', feeItemId: TUITION, amountMinor: 50_000, paidMinor: 0 }),
  line({ id: 'line-4', learnerId: 'learner-2', feeItemId: TUITION, amountMinor: 25_000, paidMinor: 25_000 }),
  line({ id: 'line-5', learnerId: 'learner-3', feeItemId: TUITION, amountMinor: 70_000, paidMinor: 0 }),
  line({
    id: 'line-6',
    learnerId: 'learner-3',
    feeItemId: TUITION,
    amountMinor: 999_000,
    paidMinor: 0,
    status: 'draft',
  }),
];

const feeItems = [
  { id: TUITION, code: 'TUITION', name: 'Tuition' },
  { id: LUNCH, code: 'LUNCH', name: 'Lunch' },
];

describe('buildVoteheadMatrix', () => {
  it('shows a learner row with one balance cell per vote head', () => {
    const report = buildVoteheadMatrix({
      lines,
      learners,
      feeItems,
      filters: EMPTY_VOTEHEAD_MATRIX_FILTERS,
    });

    expect(report.columns.map((column) => column.label)).toEqual([
      'LUNCH Lunch',
      'TUITION Tuition',
    ]);
    const amina = report.rows.find((row) => row.name === 'Amina Wanjiku');
    expect(amina).toMatchObject({
      classLabel: 'Form 1',
      streamName: 'Blue',
      totalBilledMinor: 120_000,
      totalPaidMinor: 60_000,
      totalBalanceMinor: 60_000,
    });
    expect(amina?.values[`v:${TUITION}`]).toBe(60_000);
    expect(amina?.values[`v:${LUNCH}`]).toBe(0);
    expect(report.totals).toMatchObject({
      billedMinor: 265_000,
      paidMinor: 85_000,
      balanceMinor: 180_000,
    });
  });

  it('filters by class-group id and excludes draft lines', () => {
    const report = buildVoteheadMatrix({
      lines,
      learners,
      feeItems,
      filters: { ...EMPTY_VOTEHEAD_MATRIX_FILTERS, classGroupId: 'class-1' },
    });

    expect(report.rows.map((row) => row.name)).toEqual(['Amina Wanjiku', 'Brian Otieno']);
    expect(report.rows.every((row) => row.streamName === 'Blue')).toBe(true);
    expect(report.totals.billedMinor).toBe(195_000);
    expect(report.totals.balanceMinor).toBe(110_000);
  });

  it('filters by grade id and keeps same-named streams distinct', () => {
    const twoGrades = [
      learner({
        id: 'learner-7',
        name: 'Achieng Grade Seven',
        classLabel: 'Grade 7',
        streamName: 'East',
        classGroupId: 'class-7-east',
        levelId: 'level-7',
        className: 'East',
      }),
      learner({
        id: 'learner-8',
        name: 'Achieng Grade Eight',
        classLabel: 'Grade 8',
        streamName: 'East',
        classGroupId: 'class-8-east',
        levelId: 'level-8',
        className: 'East',
      }),
    ];
    const report = buildVoteheadMatrix({
      lines: [
        line({ id: 'line-7', learnerId: 'learner-7', feeItemId: TUITION, amountMinor: 10_000, paidMinor: 0 }),
        line({ id: 'line-8', learnerId: 'learner-8', feeItemId: TUITION, amountMinor: 20_000, paidMinor: 0 }),
      ],
      learners: twoGrades,
      feeItems,
      filters: { ...EMPTY_VOTEHEAD_MATRIX_FILTERS, levelId: 'level-7' },
    });

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      name: 'Achieng Grade Seven',
      classLabel: 'Grade 7',
      streamName: 'East',
      classGroupId: 'class-7-east',
      totalBalanceMinor: 10_000,
    });
  });
});
