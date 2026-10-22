// ABOUTME: Displaying a money value: Intl.NumberFormat with the currency's own decimals, fed the
// ABOUTME: exact decimal text of the amount so no float is ever formatted. A plain major-unit
// ABOUTME: number is a legacy bridge for call sites that still hold one, never an arithmetic path.

import { getCurrency, type CurrencyDefinition, type CurrencyCode } from './currency';
import { MoneyError } from './errors';
import { isMoney, toDecimalString, type Money } from './money';

/** What a missing or unreadable amount renders as, the app's placeholder for "no value". */
export const NO_AMOUNT = '—';

/**
 * Formats an amount of money.
 *
 * Given a `Money`, the amount is printed exactly: its minor units become the decimal text the
 * currency's exponent gives them, and `Intl.NumberFormat` reads that text (a string is read
 * exactly, so no double sits between the amount and the screen).
 *
 * Given a plain number, the number is taken as major units — the currency must be named, and the
 * formatter rounds it to the currency's decimals for display. That overload is a bridge for the
 * call sites that predate the money type; new code holds a `Money`.
 */
export function formatMoney(value: Money, locale?: string): string;
export function formatMoney(value: number | null | undefined, currency: CurrencyCode, locale?: string): string;
export function formatMoney(
  value: Money | number | null | undefined,
  currencyOrLocale?: CurrencyCode | string,
  locale?: string
): string {
  if (value === null || value === undefined) return NO_AMOUNT;

  if (isMoney(value)) {
    const definition = getCurrency(value.currency);
    const formatter = formatterFor(value.currency, definition, typeof currencyOrLocale === 'string' ? currencyOrLocale : undefined);
    return formatExactText(formatter, toDecimalString(value));
  }

  if (typeof currencyOrLocale !== 'string') {
    throw new MoneyError(
      'unknown_currency',
      'formatMoney needs the currency of a plain number amount, e.g. formatMoney(1500, "KES")'
    );
  }
  const definition = getCurrency(currencyOrLocale);
  if (!Number.isFinite(value)) return NO_AMOUNT;
  return formatterFor(currencyOrLocale as CurrencyCode, definition, locale).format(value);
}

/** Compact money for tight columns and charts, e.g. `formatMoneyCompact(1250000, 'KES')` → "Ksh 1.3M". */
export function formatMoneyCompact(value: Money, locale?: string): string;
export function formatMoneyCompact(
  value: number | null | undefined,
  currency: CurrencyCode,
  locale?: string
): string;
export function formatMoneyCompact(
  value: Money | number | null | undefined,
  currencyOrLocale?: CurrencyCode | string,
  locale?: string
): string {
  if (value === null || value === undefined) return NO_AMOUNT;

  if (isMoney(value)) {
    const definition = getCurrency(value.currency);
    const formatter = compactFormatterFor(value.currency, definition, typeof currencyOrLocale === 'string' ? currencyOrLocale : undefined);
    return formatExactText(formatter, toDecimalString(value));
  }

  if (typeof currencyOrLocale !== 'string') {
    throw new MoneyError(
      'unknown_currency',
      'formatMoneyCompact needs the currency of a plain number amount, e.g. formatMoneyCompact(1500, "KES")'
    );
  }
  const definition = getCurrency(currencyOrLocale);
  if (!Number.isFinite(value)) return NO_AMOUNT;
  return compactFormatterFor(currencyOrLocale as CurrencyCode, definition, locale).format(value);
}

/** The formatter of a currency: its own decimals, so UGX prints none and KWD prints three. */
function formatterFor(
  currency: CurrencyCode,
  definition: CurrencyDefinition,
  locale?: string
): Intl.NumberFormat {
  const decimals = definition.displayDecimals ?? definition.decimals;
  return new Intl.NumberFormat(locale ?? definition.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** The compact formatter of a currency, mirroring the format the app used before the money type. */
function compactFormatterFor(
  currency: CurrencyCode,
  definition: CurrencyDefinition,
  locale?: string
): Intl.NumberFormat {
  return new Intl.NumberFormat(locale ?? definition.locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/**
 * Formats an exact decimal text.
 *
 * `Intl.NumberFormat.format` has accepted a decimal string since ES2023 and reads it exactly;
 * the TypeScript lib this project compiles against (ES2022) still types the argument as a
 * number, so the call is made through this narrow cast rather than a cast of the value.
 */
function formatExactText(formatter: Intl.NumberFormat, text: string): string {
  return (formatter.format as unknown as (value: string) => string)(text);
}
