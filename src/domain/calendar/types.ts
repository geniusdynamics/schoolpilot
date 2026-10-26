// ABOUTME: The shapes of the calendar module: a date as a calendar names it, and the system that converts it to and from
// ABOUTME: a Gregorian local day. Storage stays Gregorian; a calendar only changes how a day is read, typed, shown and stepped.

/** The calendars the app can show and take dates in. */
export const CALENDAR_IDS = ['gregorian', 'ethiopic'] as const;

export type CalendarId = (typeof CALENDAR_IDS)[number];

/** A day as a calendar names it. The month and the day count from 1. */
export interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/**
 * One calendar. Every method takes and returns a Gregorian local day (a `Date` at midnight) or a
 * `CalendarDate`, so a stored date never changes: a calendar is a way to read it.
 */
export interface CalendarSystem {
  readonly id: CalendarId;
  /** Months in a year; the Ethiopian year has a short thirteenth month. */
  readonly monthsInYear: number;
  daysInMonth(year: number, month: number): number;
  /** True when the year, month and day name a day that exists on this calendar. */
  isValidDate(date: CalendarDate): boolean;
  /** The date this calendar gives to a local Gregorian day. */
  fromGregorian(day: Date): CalendarDate;
  /** The local Gregorian day a date of this calendar falls on. */
  toGregorian(date: CalendarDate): Date;
  /** The first day of the calendar month that contains `day`. */
  startOfMonth(day: Date): Date;
  /** The same day of the month `months` away, or the last day of that month when it is shorter. */
  addMonths(day: Date, months: number): Date;
  /** The month names of a year in order, in the locale. */
  monthNames(locale: string): readonly string[];
  /** "March 2014", "Meskerem 2016". */
  formatMonthYear(day: Date, locale: string): string;
  /** "Saturday, 15 March 2014", "Tuesday, 1 Meskerem 2016": the label of a day for a screen reader. */
  formatLong(day: Date, locale: string): string;
}
