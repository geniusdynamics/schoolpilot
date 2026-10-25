// ABOUTME: Locale-aware number and percentage formatting and parsing, plus the decimal and grouping
// ABOUTME: symbols a locale uses. Everything is Intl.NumberFormat; parsing maps the locale's own
// ABOUTME: digits and separators back to ASCII so a typed amount reads the same in every locale.

import { activeLocale, resolveLocale } from './locales';

/** What a missing or unreadable number renders as, the app's placeholder for "no value". */
export const NO_NUMBER = '—';

export interface LocaleNumberOptions {
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
  readonly useGrouping?: boolean;
  readonly signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
}

/** The characters a locale writes numbers with; the money and quantity fields parse with these. */
export interface NumberSymbols {
  readonly decimal: string;
  readonly group: string;
  readonly percentSign: string;
  readonly minusSign: string;
}

const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/** "1,234,567.89" in en-GB, "1 234 567,89" in fr-FR, "١٬٢٣٤٬٥٦٧٫٨٩" in ar-EG. */
export function formatLocaleNumber(
  value: number | null | undefined,
  locale: string = activeLocale(),
  options: LocaleNumberOptions = {}
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NO_NUMBER;
  const { tag } = resolveLocale(locale);
  return new Intl.NumberFormat(tag, options).format(value);
}

/** A ratio as a percentage: 0.256 is "25.6%" in en-GB, "25,6 %" in fr-FR. */
export function formatLocalePercent(
  value: number | null | undefined,
  locale: string = activeLocale(),
  options: { decimals?: number } = {}
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NO_NUMBER;
  const { tag } = resolveLocale(locale);
  // One decimal by default: a pass rate of 25.6% must not read as 26%.
  const decimals = options.decimals ?? 1;
  return new Intl.NumberFormat(tag, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** The decimal, grouping, percent and minus characters of a locale. */
export function numberSymbols(locale: string = activeLocale()): NumberSymbols {
  const { tag } = resolveLocale(locale);
  const numberParts = new Intl.NumberFormat(tag).formatToParts(1_234_567.89);
  const percentParts = new Intl.NumberFormat(tag, { style: 'percent' }).formatToParts(0.5);
  const minusParts = new Intl.NumberFormat(tag).formatToParts(-1);
  const pick = (parts: Intl.NumberFormatPart[], type: Intl.NumberFormatPart['type'], fallback: string) =>
    parts.find((part) => part.type === type)?.value ?? fallback;
  return {
    decimal: pick(numberParts, 'decimal', '.'),
    group: pick(numberParts, 'group', ','),
    percentSign: pick(percentParts, 'percentSign', '%'),
    minusSign: pick(minusParts, 'minusSign', '-'),
  };
}

/** Rewrites the Arabic-Indic digit sets as ASCII so a parser has one alphabet to read. */
export function toAsciiDigits(text: string): string {
  let result = '';
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      result += String(code - ARABIC_INDIC_ZERO);
    } else if (code >= EXTENDED_ARABIC_INDIC_ZERO && code <= EXTENDED_ARABIC_INDIC_ZERO + 9) {
      result += String(code - EXTENDED_ARABIC_INDIC_ZERO);
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Parses a number a user typed in their locale.
 *
 * The locale's grouping and decimal separators are honoured, Arabic-Indic digits are read, and
 * anything that is not a plain decimal number is refused rather than silently repaired. This is for
 * quantities (marks, counts); a money amount parses through the money field, which never uses a
 * float.
 */
export function parseLocaleNumber(
  text: string | null | undefined,
  locale: string = activeLocale()
): number | null {
  if (text === null || text === undefined) return null;
  const symbols = numberSymbols(locale);
  // Whitespace (including the narrow no-break space fr/pt group with) is never significant here.
  const compact = toAsciiDigits(text)
    .trim()
    .replace(/[\s\u00a0\u202f\u2009]/g, '');
  if (compact === '') return null;

  const signed = symbols.decimal !== '.' ? compact.split(symbols.decimal).join('.') : compact;
  const sign = /^[+-]/.test(signed) ? signed[0] : '';
  const unsigned = sign ? signed.slice(1) : signed;
  if (unsigned === '' || (unsigned.match(/\./g) ?? []).length > 1) return null;

  const dot = unsigned.indexOf('.');
  const integerPart = dot === -1 ? unsigned : unsigned.slice(0, dot);
  const fractionPart = dot === -1 ? '' : unsigned.slice(dot + 1);
  if (!/^\d*$/.test(fractionPart)) return null;

  if (symbols.group && integerPart.includes(symbols.group)) {
    const groups = integerPart.split(symbols.group);
    const [first, ...rest] = groups;
    if (!/^\d{1,3}$/.test(first) || !rest.every((group) => /^\d{3}$/.test(group))) return null;
  }
  if (!/^\d+$/.test(integerPart.split(symbols.group).join(''))) return null;

  const normalised = `${sign}${integerPart.split(symbols.group).join('')}${dot === -1 ? '' : `.${fractionPart}`}`;
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : null;
}
