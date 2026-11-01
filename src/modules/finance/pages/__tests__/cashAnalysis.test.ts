// ABOUTME: Tests the cash analysis report: date and channel filters, newest-first rows, and the
// ABOUTME: per-channel totals the screen shows.

import { describe, expect, it } from 'vitest';

import type { FinancePaymentRow } from '../../data/canonicalFinance';
import { buildCashAnalysis, EMPTY_CASH_ANALYSIS_FILTERS } from '../cashAnalysis';

const payment = (input: {
  readonly id: string;
  readonly channel: string;
  readonly receivedAt: string;
  readonly amountMinor: number;
  readonly status?: string;
  readonly receipt?: string;
  readonly reference?: string;
}): FinancePaymentRow =>
  ({
    id: input.id,
    learnerId: 'learner-1',
    learnerName: 'Amina Wanjiku',
    amount: { amount_minor: input.amountMinor, currency: 'KES' },
    channel: input.channel,
    receivedAt: input.receivedAt,
    reference: input.reference ?? '',
    status: input.status ?? 'posted',
    receiptNumber: input.receipt ?? `RCT-${input.id}`,
    row: { id: input.id },
  }) as unknown as FinancePaymentRow;

const payments = [
  payment({ id: 'p1', channel: 'cash', receivedAt: '2027-02-10T09:00:00.000Z', amountMinor: 150_000 }),
  payment({
    id: 'p2',
    channel: 'bank_deposit',
    receivedAt: '2027-02-11T09:00:00.000Z',
    amountMinor: 250_000,
    receipt: 'RCT-2',
    reference: 'SLIP-1',
  }),
  payment({ id: 'p3', channel: 'cash', receivedAt: '2027-02-12T09:00:00.000Z', amountMinor: 50_000 }),
  payment({
    id: 'p4',
    channel: 'cash',
    receivedAt: '2027-02-13T09:00:00.000Z',
    amountMinor: 999_000,
    status: 'void',
  }),
];

describe('buildCashAnalysis', () => {
  it('lists payments newest first and totals them per channel', () => {
    const report = buildCashAnalysis({
      payments,
      filters: { ...EMPTY_CASH_ANALYSIS_FILTERS, from: '2027-02-01', to: '2027-02-28' },
    });

    expect(report.rows.map((row) => row.id)).toEqual(['p3', 'p2', 'p1']);
    expect(report.rows[1]).toMatchObject({
      channel: 'bank_deposit',
      channelLabel: 'Bank deposit / transfer',
      reference: 'SLIP-1',
      amountMinor: 250_000,
    });
    expect(report.totals).toEqual([
      expect.objectContaining({ channel: 'bank_deposit', count: 1, amountMinor: 250_000 }),
      expect.objectContaining({ channel: 'cash', count: 2, amountMinor: 200_000 }),
    ]);
    expect(report.totalMinor).toBe(450_000);
  });

  it('narrows by date and channel', () => {
    const report = buildCashAnalysis({
      payments,
      filters: { from: '2027-02-11', to: '2027-02-12', channel: 'cash' },
    });

    expect(report.rows.map((row) => row.id)).toEqual(['p3']);
    expect(report.totalMinor).toBe(50_000);
  });
});
