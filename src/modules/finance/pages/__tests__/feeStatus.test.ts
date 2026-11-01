// ABOUTME: Tests the fee status report's grouping and filters: one row per class and vote head,
// ABOUTME: distinct learners counted once, draft lines excluded, and exact minor-unit totals.

import { describe, expect, it } from 'vitest';

import type { FinanceInvoiceLineRow, FinanceLearnerRow } from '../../data/canonicalFinance';
import { buildFeeStatusReport, EMPTY_FEE_STATUS_FILTERS } from '../feeStatus';

const TUITION = '11111111-1111-7111-8111-111111111111';
const LUNCH = '22222222-2222-7222-8222-222222222222';

const learner = (id: string, className: string): FinanceLearnerRow =>
  ({
    id,
    name: id,
    admissionNumber: id,
    status: 'enrolled',
    className,
    levelId: 'level-1',
    levelName: 'Form 1',
    row: { id },
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

const learners = [learner('learner-1', 'Form 1 Blue'), learner('learner-2', 'Form 1 Red')];

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
  it('groups by class and vote head and counts a learner once per group', () => {
    const report = buildFeeStatusReport({
      lines,
      learners,
      feeItems,
      filters: EMPTY_FEE_STATUS_FILTERS,
    });

    expect(report.rows).toHaveLength(3);
    const blueTuition = report.rows.find(
      (row) => row.className === 'Form 1 Blue' && row.feeItem === 'TUITION Tuition'
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

  it('excludes draft and void lines, and narrows by class and vote head', () => {
    const report = buildFeeStatusReport({
      lines,
      learners,
      feeItems,
      filters: { ...EMPTY_FEE_STATUS_FILTERS, className: 'Form 1 Blue', feeItemId: TUITION },
    });

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      className: 'Form 1 Blue',
      feeItem: 'TUITION Tuition',
      learners: 1,
      billedMinor: 105_000,
      paidMinor: 40_000,
    });
    expect(report.totals.billedMinor).toBe(105_000);
  });

  it('keeps only rows with an outstanding balance when asked', () => {
    const report = buildFeeStatusReport({
      lines,
      learners,
      feeItems,
      filters: { ...EMPTY_FEE_STATUS_FILTERS, arrearsOnly: true },
    });

    expect(report.rows.map((row) => row.feeItem)).toEqual(['TUITION Tuition']);
    expect(report.rows[0]?.className).toBe('Form 1 Blue');
    expect(report.totals.balanceMinor).toBe(65_000);
    expect(report.rows.every((row) => row.balanceMinor > 0)).toBe(true);
  });
});
