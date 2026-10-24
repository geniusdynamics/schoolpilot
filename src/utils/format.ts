// ABOUTME: Shared formatting utilities — money and dates. Money formatting delegates to the money
// ABOUTME: module (src/domain/money) so a value's currency decides its decimals; formatKES is a
// ABOUTME: deprecated wrapper. Dates delegate to the locale module and follow the active locale
// ABOUTME: rather than a fixed en-KE, so a caller may pass one but the app's locale is the default.

import { formatMoney, formatMoneyCompact } from '@/domain/money';
import { activeLocale, formatLocaleDate, formatLocaleDateTime } from '@/utils/locale';

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

/**
 * "15 Mar 2026" in en-GB/en-KE, "15 mars 2026" in fr-FR — the app's standard display date.
 *
 * The locale is the document's (`activeLocale`) unless one is passed; the app default is en-KE.
 */
export function formatDate(
  value: string | number | Date | null | undefined,
  locale: string = activeLocale()
): string {
  return formatLocaleDate(value, locale, { style: 'medium' });
}

/** "15 Mar 2026, 14:30" for timestamps (payments, audit rows), in the caller's locale. */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  locale: string = activeLocale()
): string {
  return formatLocaleDateTime(value, locale, { style: 'medium' });
}
