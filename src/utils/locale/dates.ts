// ABOUTME: Locale-aware date and time formatting, ISO date parsing and the week a locale starts on.
// ABOUTME: Everything goes through Intl.DateTimeFormat, so the pattern, month names and digits come
// ABOUTME: from the locale; a `YYYY-MM-DD` string is read as a local calendar day, never as UTC.

import { activeLocale, resolveLocale, weekStartsOn, type Weekday } from './locales';

/** What a missing or unreadable date renders as, the app's placeholder for "no value". */
export const NO_DATE = '—';

/** A value a date formatter accepts. */
export type DateInput = Date | string | number | null | undefined;

/** How much of a date a caller wants. */
export type DateStyleName = 'short' | 'medium' | 'long' | 'full';

/** A part of a numeric date, in the order the locale writes it. */
export type DatePart = 'day' | 'month' | 'year';

export interface LocaleDateOptions {
  readonly style?: DateStyleName;
  /** The institution's time zone; the browser's when omitted. */
  readonly timeZone?: string;
}

export interface LocaleTimeOptions {
  readonly seconds?: boolean;
  /** 12- or 24-hour clock; the locale's own default when omitted. */
  readonly hour12?: boolean;
  readonly timeZone?: string;
}

export interface LocaleDateTimeOptions extends LocaleDateOptions, LocaleTimeOptions {}

export interface DateEntryPattern {
  readonly order: readonly DatePart[];
  readonly separator: string;
  readonly placeholder: string;
}

export interface WeekdayLabelOptions {
  readonly width?: 'narrow' | 'short' | 'long';
  readonly weekStartsOn?: Weekday;
}

const STYLE_OPTIONS: Record<DateStyleName, Intl.DateTimeFormatOptions> = {
  short: { year: 'numeric', month: '2-digit', day: '2-digit' },
  medium: { year: 'numeric', month: 'short', day: 'numeric' },
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
};

const ENTRY_TOKENS: Record<DatePart, string> = { day: 'dd', month: 'mm', year: 'yyyy' };
const BIDI_MARKS = /[\u200e\u200f\u061c]/g;

/**
 * Parses a `YYYY-MM-DD` date as a local calendar day.
 *
 * `new Date('2026-03-15')` is UTC midnight, which is 14 March west of Greenwich; a stored date of
 * birth must not move a day because of the reader's time zone, so the fields are read directly.
 */
export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
}

/** The local calendar day of a date as `YYYY-MM-DD`; the inverse of `parseIsoDate`. */
export function formatIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** A date formatter can read: a Date, an instant, or a `YYYY-MM-DD` calendar day. */
function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return parseIsoDate(value);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "15 Mar 2026" in en-GB/en-KE, "15 mars 2026" in fr-FR, "١٥ مارس ٢٠٢٦" in ar-EG. */
export function formatLocaleDate(
  value: DateInput,
  locale: string = activeLocale(),
  options: LocaleDateOptions = {}
): string {
  const date = toDate(value);
  if (!date) return NO_DATE;
  const { tag } = resolveLocale(locale);
  return new Intl.DateTimeFormat(tag, {
    ...STYLE_OPTIONS[options.style ?? 'medium'],
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
}

/** "14:30" in en-GB, "2:30 PM" in en-US, "٢:٣٠ م" in ar-EG. */
export function formatLocaleTime(
  value: DateInput,
  locale: string = activeLocale(),
  options: LocaleTimeOptions = {}
): string {
  const date = toDate(value);
  if (!date) return NO_DATE;
  const { tag } = resolveLocale(locale);
  return new Intl.DateTimeFormat(tag, {
    hour: '2-digit',
    minute: '2-digit',
    ...(options.seconds ? { second: '2-digit' } : {}),
    ...(options.hour12 === undefined ? {} : { hour12: options.hour12 }),
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
}

/** The date and the time together, in the locale's order and clock. */
export function formatLocaleDateTime(
  value: DateInput,
  locale: string = activeLocale(),
  options: LocaleDateTimeOptions = {}
): string {
  const date = toDate(value);
  if (!date) return NO_DATE;
  const { tag } = resolveLocale(locale);
  return new Intl.DateTimeFormat(tag, {
    ...STYLE_OPTIONS[options.style ?? 'medium'],
    hour: '2-digit',
    minute: '2-digit',
    ...(options.seconds ? { second: '2-digit' } : {}),
    ...(options.hour12 === undefined ? {} : { hour12: options.hour12 }),
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
}

/** "March 2026" in en-GB, "mars 2026" in fr-FR, "مارس ٢٠٢٦" in ar-EG. */
export function formatLocaleMonthYear(
  value: DateInput,
  locale: string = activeLocale(),
  options: { timeZone?: string } = {}
): string {
  const date = toDate(value);
  if (!date) return NO_DATE;
  const { tag } = resolveLocale(locale);
  return new Intl.DateTimeFormat(tag, {
    month: 'long',
    year: 'numeric',
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
}

/**
 * The order a locale writes numeric dates in, with the separator it writes between the parts.
 *
 * The order comes from `Intl` itself: `en-GB` and `en-KE` give `dd/mm/yyyy`, `en-US` gives
 * `mm/dd/yyyy`, `ar-EG` gives `dd/mm/yyyy` in Arabic-Indic digits. Typed entry stays ASCII-digit
 * and reads this order, so a teacher types `15/03/2026` in every locale.
 */
export function dateEntryPattern(locale: string = activeLocale()): DateEntryPattern {
  const { tag } = resolveLocale(locale);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat(tag, { year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(2014, 2, 15));
  } catch {
    return { order: ['day', 'month', 'year'], separator: '/', placeholder: 'dd/mm/yyyy' };
  }
  const order = parts
    .map((part) => part.type)
    .filter((type): type is DatePart => type === 'day' || type === 'month' || type === 'year');
  const separator = parts
    .find((part) => part.type === 'literal')?.value
    .replace(BIDI_MARKS, '') || '/';
  const resolvedOrder = order.length === 3 ? order : (['day', 'month', 'year'] as const);
  return {
    order: resolvedOrder,
    separator,
    placeholder: resolvedOrder.map((part) => ENTRY_TOKENS[part]).join(separator),
  };
}

/** The seven weekday names of a locale, rotated so the locale's own week starts first. */
export function weekdayLabels(
  locale: string = activeLocale(),
  options: WeekdayLabelOptions = {}
): string[] {
  const profile = resolveLocale(locale);
  const formatter = new Intl.DateTimeFormat(profile.tag, {
    weekday: options.width ?? 'short',
    timeZone: 'UTC',
  });
  // 2024-01-07 is a Sunday; every label is read from a fixed week so no DST can shift one.
  const sunday = Date.UTC(2024, 0, 7);
  const labels = Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(sunday + index * 86_400_000))
  );
  const start = options.weekStartsOn ?? profile.weekStartsOn;
  return Array.from({ length: 7 }, (_, index) => labels[(index + start) % 7]);
}

/** Midnight on the locale's first day of the week that contains `date`. */
export function startOfLocaleWeek(
  date: Date,
  locale: string = activeLocale(),
  firstDay?: Weekday
): Date {
  const start = firstDay ?? weekStartsOn(locale);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (day.getDay() - start + 7) % 7;
  day.setDate(day.getDate() - offset);
  return day;
}

export { weekStartsOn };
