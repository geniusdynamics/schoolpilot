// ABOUTME: The Ethiopian calendar (Amete Mihret): twelve months of thirty days and a short thirteenth, Pagume, with a
// ABOUTME: sixth day in every year that leaves 3 when divided by 4. Converts through the Julian day number; names come from ICU.

import { gregorianToJulianDay, julianDayToGregorian, localDay } from './days';
import { createCalendarSystem } from './system';
import type { CalendarDate } from './types';

/**
 * The Julian day number of day 0 of year 0, the Ethiopian count extended back one year. Starting the
 * count there makes every four-year cycle begin at a year divisible by four and end on the leap day.
 * Meskerem 1 of year 1 is 365 days later, Julian day 1 724 221 (29 August 8 CE, Julian).
 */
const EPOCH = 1_723_856;

const DAYS_IN_CYCLE = 1461;

/** The sixth day of Pagume falls in the years that leave 3 when divided by 4. */
const isLeapYear = (year: number): boolean => year % 4 === 3;

const toJulianDay = ({ year, month, day }: CalendarDate): number =>
  EPOCH + 365 * year + Math.floor(year / 4) + 30 * (month - 1) + (day - 1);

function fromJulianDay(julianDay: number): CalendarDate {
  const days = julianDay - EPOCH;
  const cycle = Math.floor(days / DAYS_IN_CYCLE);
  const inCycle = days - cycle * DAYS_IN_CYCLE;
  // The leap day is the last day of the cycle: it belongs to year 3, not to a fifth year.
  const yearInCycle = Math.min(Math.floor(inCycle / 365), 3);
  const dayOfYear = inCycle - yearInCycle * 365;
  return {
    year: cycle * 4 + yearInCycle,
    month: Math.floor(dayOfYear / 30) + 1,
    day: (dayOfYear % 30) + 1,
  };
}

const fromGregorian = (day: Date): CalendarDate =>
  fromJulianDay(gregorianToJulianDay(day.getFullYear(), day.getMonth() + 1, day.getDate()));

const toGregorian = (date: CalendarDate): Date => {
  const { year, month, day } = julianDayToGregorian(toJulianDay(date));
  return localDay(year, month, day);
};

/** The names the calendar's months have in English letters, for a platform that has no Ethiopic data. */
const TRANSLITERATED_MONTH_NAMES = [
  'Meskerem',
  'Tekemt',
  'Hedar',
  'Tahsas',
  'Ter',
  'Yekatit',
  'Megabit',
  'Miazia',
  'Genbot',
  'Sene',
  'Hamle',
  'Nehasse',
  'Pagumen',
] as const;

const monthNameCache = new Map<string, readonly string[]>();

/** The platform's own names for the thirteen months in a locale (CLDR), or the transliterated ones. */
function monthNames(locale: string): readonly string[] {
  const cached = monthNameCache.get(locale);
  if (cached) return cached;

  let names: readonly string[] = TRANSLITERATED_MONTH_NAMES;
  try {
    const tag = new Intl.Locale(locale, { calendar: 'ethiopic' }).toString();
    const formatter = new Intl.DateTimeFormat(tag, { month: 'long', timeZone: 'UTC' });
    if (formatter.resolvedOptions().calendar === 'ethiopic') {
      names = Array.from({ length: 13 }, (_, index) => {
        const day = toGregorian({ year: 2016, month: index + 1, day: 2 });
        return formatter.format(new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 12)));
      });
    }
  } catch {
    // An unknown locale, or an engine without the calendar: the transliterated names stand.
  }
  monthNameCache.set(locale, names);
  return names;
}

function weekdayName(day: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(day);
  } catch {
    return new Intl.DateTimeFormat('en', { weekday: 'long' }).format(day);
  }
}

export const ethiopicCalendar = createCalendarSystem({
  id: 'ethiopic',
  monthsInYear: 13,
  daysInMonth: (year, month) => (month === 13 ? (isLeapYear(year) ? 6 : 5) : 30),
  fromGregorian,
  toGregorian,
  monthNames,
  formatMonthYear: (day, locale) => {
    const { year, month } = fromGregorian(day);
    return `${monthNames(locale)[month - 1]} ${year}`;
  },
  formatLong: (day, locale) => {
    const { year, month, day: dayOfMonth } = fromGregorian(day);
    return `${weekdayName(day, locale)}, ${dayOfMonth} ${monthNames(locale)[month - 1]} ${year}`;
  },
});
