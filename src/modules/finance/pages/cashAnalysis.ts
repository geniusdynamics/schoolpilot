// ABOUTME: Cash analysis: the payments received in a date range and how they split by channel. It is
// ABOUTME: the modern form of the old cash-analysis report, read from canonical payments and receipts.

import { CHANNEL_LABELS, PAYMENT_CHANNEL_VALUES, type PaymentChannel } from '@/domain/finance/payments';

import type { FinancePaymentRow } from '../data/canonicalFinance';

export interface CashAnalysisFilters {
  /** Inclusive first day, ISO `YYYY-MM-DD`; empty means no lower bound. */
  readonly from: string;
  /** Inclusive last day, ISO `YYYY-MM-DD`; empty means no upper bound. */
  readonly to: string;
  /** One channel, or empty for every channel. */
  readonly channel: string;
}

export interface CashAnalysisRow {
  readonly id: string;
  readonly date: string;
  readonly receipt: string;
  readonly learner: string;
  readonly channel: string;
  readonly channelLabel: string;
  readonly reference: string;
  readonly status: string;
  readonly amountMinor: number;
}

export interface CashAnalysisChannelTotal {
  readonly channel: string;
  readonly label: string;
  readonly count: number;
  readonly amountMinor: number;
}

export interface CashAnalysisReport {
  readonly rows: readonly CashAnalysisRow[];
  readonly totals: readonly CashAnalysisChannelTotal[];
  readonly totalMinor: number;
}

export const EMPTY_CASH_ANALYSIS_FILTERS: CashAnalysisFilters = {
  from: '',
  to: '',
  channel: '',
};

const dayOf = (value: string): string => value.slice(0, 10);

const channelLabel = (channel: string): string =>
  PAYMENT_CHANNEL_VALUES.includes(channel as PaymentChannel)
    ? CHANNEL_LABELS[channel as PaymentChannel]
    : channel || 'Unspecified';

/** The payments in the range, newest first, with a total per channel. */
export function buildCashAnalysis(input: {
  readonly payments: readonly FinancePaymentRow[];
  readonly filters: CashAnalysisFilters;
}): CashAnalysisReport {
  const rows: CashAnalysisRow[] = input.payments
    .filter((payment) => payment.status !== 'void')
    .filter((payment) => {
      const day = dayOf(payment.receivedAt);
      if (input.filters.from && day < input.filters.from) return false;
      if (input.filters.to && day > input.filters.to) return false;
      if (input.filters.channel && payment.channel !== input.filters.channel) return false;
      return true;
    })
    .map((payment) => ({
      id: payment.id,
      date: dayOf(payment.receivedAt),
      receipt: payment.receiptNumber,
      learner: payment.learnerName,
      channel: payment.channel,
      channelLabel: channelLabel(payment.channel),
      reference: payment.reference,
      status: payment.status,
      amountMinor: payment.amount.amount_minor,
    }))
    .sort((left, right) => right.date.localeCompare(left.date) || right.receipt.localeCompare(left.receipt));

  const byChannel = new Map<
    string,
    { channel: string; label: string; count: number; amountMinor: number }
  >();
  for (const row of rows) {
    const current = byChannel.get(row.channel) ?? {
      channel: row.channel,
      label: row.channelLabel,
      count: 0,
      amountMinor: 0,
    };
    current.count += 1;
    current.amountMinor += row.amountMinor;
    byChannel.set(row.channel, current);
  }

  return {
    rows,
    totals: [...byChannel.values()].sort((left, right) => right.amountMinor - left.amountMinor),
    totalMinor: rows.reduce((sum, row) => sum + row.amountMinor, 0),
  };
}
