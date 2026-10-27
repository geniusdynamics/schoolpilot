// ABOUTME: Day arithmetic the calendars share: the Julian day number of a Gregorian date and back, and a local day built
// ABOUTME: from a year, month and day without the two-digit-year surprise of `new Date(year, ...)`.

import type { CalendarDate } from './types';

/**
 * The Julian day number of a proleptic Gregorian date: a count of whole days that every calendar
 * here can convert through, so two calendars never need to know about each other.
 */
export function gregorianToJulianDay(year: number, month: number, day: number): number {
  const shift = Math.floor((14 - month) / 12);
  const y = year + 4800 - shift;
  const m = month + 12 * shift - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** The Gregorian date of a Julian day number; the inverse of `gregorianToJulianDay`. */
export function julianDayToGregorian(julianDay: number): CalendarDate {
  const f = julianDay + 1401 + Math.floor((Math.floor((4 * julianDay + 274277) / 146097) * 3) / 4) - 38;
  const e = 4 * f + 3;
  const g = Math.floor((e % 1461) / 4);
  const h = 5 * g + 2;
  const day = Math.floor((h % 153) / 5) + 1;
  const month = ((Math.floor(h / 153) + 2) % 12) + 1;
  const year = Math.floor(e / 1461) - 4716 + Math.floor((14 - month) / 12);
  return { year, month, day };
}

/**
 * A local day at midnight. `new Date(99, 0, 1)` is 1999, so the year is set on its own: a date typed
 * as year 0099 stays year 99 instead of silently becoming another one.
 */
export function localDay(year: number, month: number, day: number): Date {
  const date = new Date(2000, 0, 1);
  date.setFullYear(year, month - 1, day);
  return date;
}
