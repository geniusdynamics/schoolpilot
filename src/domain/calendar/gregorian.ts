// ABOUTME: The Gregorian calendar as a calendar system: the identity on a local day, with month names and labels
// ABOUTME: from Intl in the locale, exactly as the date picker has always shown them.

import { localDay } from './days';
import { createCalendarSystem } from './system';

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export const gregorianCalendar = createCalendarSystem({
  id: 'gregorian',
  monthsInYear: 12,
  daysInMonth: (year, month) => (month === 2 && isLeapYear(year) ? 29 : (MONTH_LENGTHS[month - 1] ?? 0)),
  fromGregorian: (day) => ({ year: day.getFullYear(), month: day.getMonth() + 1, day: day.getDate() }),
  toGregorian: ({ year, month, day }) => localDay(year, month, day),
  monthNames: (locale) => {
    const formatter = new Intl.DateTimeFormat(locale, { month: 'long' });
    return Array.from({ length: 12 }, (_, month) => formatter.format(new Date(2000, month, 1)));
  },
  formatMonthYear: (day, locale) => day.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
  formatLong: (day, locale) =>
    day.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
});
