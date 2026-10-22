// ABOUTME: Shared formatting utilities — money and dates. Money formatting delegates to the money
// ABOUTME: module (src/domain/money) so a value's currency decides its decimals; formatKES is a
// ABOUTME: deprecated wrapper. Adopt these instead of ad-hoc toLocaleString/toLocaleDateString.

import { formatMoney, formatMoneyCompact } from '@/domain/money';

/**
 * Format a number of Kenyan Shillings, e.g. formatKES(1500) → "Ksh 1,500.00".
 *
 * @deprecated Use `formatMoney(amount, 'KES')` from `@/domain/money`, which names the currency
 * explicitly. A KES amount in major units is no longer the only money the app holds.
 */
export function formatKES(amount: number | null | undefined): string {
  return formatMoney(amount, 'KES');
}

/**
 * Compact KES for tight columns/charts, e.g. formatKESCompact(1250000) → "Ksh 1.3M".
 *
 * @deprecated Use `formatMoneyCompact(amount, 'KES')` from `@/domain/money`.
 */
export function formatKESCompact(amount: number | null | undefined): string {
  return formatMoneyCompact(amount, 'KES');
}

const defaultDateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

/** "15 Mar 2026" — the app's standard display date. */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-KE', defaultDateOptions);
}

/** "15 Mar 2026, 14:30" for timestamps (payments, audit rows). */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-KE', {
    ...defaultDateOptions,
    hour: '2-digit',
    minute: '2-digit',
  });
}
