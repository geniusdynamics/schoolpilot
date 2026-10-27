// ABOUTME: Builds a calendar system from what differs between calendars (months, days in a month, names and the two
// ABOUTME: conversions) and adds what does not: validity, the start of a month, and stepping by months.

import type { CalendarDate, CalendarId, CalendarSystem } from './types';

/** What one calendar has to say for itself; the rest of a `CalendarSystem` follows from it. */
export interface CalendarSpec {
  readonly id: CalendarId;
  readonly monthsInYear: number;
  daysInMonth(year: number, month: number): number;
  fromGregorian(day: Date): CalendarDate;
  toGregorian(date: CalendarDate): Date;
  monthNames(locale: string): readonly string[];
  formatMonthYear(day: Date, locale: string): string;
  formatLong(day: Date, locale: string): string;
}

const LAST_YEAR = 9999;

export function createCalendarSystem(spec: CalendarSpec): CalendarSystem {
  const isValidDate = ({ year, month, day }: CalendarDate): boolean =>
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= 1 &&
    year <= LAST_YEAR &&
    month >= 1 &&
    month <= spec.monthsInYear &&
    day >= 1 &&
    day <= spec.daysInMonth(year, month);

  const startOfMonth = (day: Date): Date => {
    const { year, month } = spec.fromGregorian(day);
    return spec.toGregorian({ year, month, day: 1 });
  };

  const addMonths = (day: Date, months: number): Date => {
    const current = spec.fromGregorian(day);
    // Count months from year 0 so a step across a year boundary is plain integer arithmetic.
    const index = current.year * spec.monthsInYear + (current.month - 1) + months;
    const year = Math.floor(index / spec.monthsInYear);
    const month = index - year * spec.monthsInYear + 1;
    return spec.toGregorian({ year, month, day: Math.min(current.day, spec.daysInMonth(year, month)) });
  };

  return { ...spec, isValidDate, startOfMonth, addMonths };
}
