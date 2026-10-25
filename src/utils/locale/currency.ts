// ABOUTME: Locale-aware money printing. Every amount goes through the money module's formatMoney, so
// ABOUTME: the currency's own precision and the exact minor units decide the digits; a locale may
// ABOUTME: change separators, symbol placement and digits, never the value and never its decimals.

import {
  MoneyError,
  NO_AMOUNT,
  formatMoney,
  formatMoneyCompact,
  isMoney,
  type CurrencyCode,
  type Money,
} from '@/domain/money';

import { currencyOfLocale, resolveLocale } from './locales';
import { numberSymbols } from './numbers';

/**
 * Prints a money value in a locale.
 *
 * The amount is the money module's `Money` (minor units plus currency) and is handed to
 * `formatMoney` untouched, so a locale cannot round it, widen its decimals or turn it into a
 * double. "Ksh 1,234.56" in en-KE, "1 234,56 KES" in fr-FR, "‏١٬٢٣٤٫٥٦ KES" in ar-EG.
 */
export function formatLocaleMoney(value: Money | null | undefined, locale?: string): string {
  if (value === null || value === undefined) return NO_AMOUNT;
  if (!isMoney(value)) {
    throw new MoneyError(
      'invalid_amount',
      'formatLocaleMoney needs a Money value (minor units plus currency); a locale must never be able to make a float of an amount'
    );
  }
  return formatMoney(value, resolveLocale(locale).tag);
}

/** The compact form of `formatLocaleMoney`, for tight columns and charts. */
export function formatLocaleMoneyCompact(value: Money | null | undefined, locale?: string): string {
  if (value === null || value === undefined) return NO_AMOUNT;
  if (!isMoney(value)) {
    throw new MoneyError(
      'invalid_amount',
      'formatLocaleMoneyCompact needs a Money value (minor units plus currency)'
    );
  }
  return formatMoneyCompact(value, resolveLocale(locale).tag);
}

/** The currency a locale's new amounts default to; null when the locale names no known one. */
export function localeCurrency(locale?: string): CurrencyCode | null {
  return currencyOfLocale(locale);
}

/** The separators a money input of this locale reads, for `MoneyField`'s parse options. */
export function moneyInputSeparators(locale?: string): {
  decimalSeparator: string;
  groupSeparator: string;
} {
  const symbols = numberSymbols(locale);
  return { decimalSeparator: symbols.decimal, groupSeparator: symbols.group };
}
