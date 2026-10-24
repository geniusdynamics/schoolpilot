// ABOUTME: Pins the locale date formats for two locales per function, the local-calendar-day parsing
// ABOUTME: that stops a stored date moving with the reader's time zone, and the locale week.

import { describe, expect, it } from 'vitest';

import {
  NO_DATE,
  dateEntryPattern,
  formatIsoDate,
  formatLocaleDate,
  formatLocaleDateTime,
  formatLocaleMonthYear,
  formatLocaleTime,
  parseIsoDate,
  startOfLocaleWeek,
  weekdayLabels,
} from '../dates';

/** Drops the bidi control marks Intl adds around RTL dates so the text is readable. */
const clean = (text: string): string => text.replace(/[\u200e\u200f\u061c]/g, '');
/** Turns the narrow no-break spaces Intl uses for grouping into ordinary spaces. */
const spaced = (text: string): string => text.replace(/[\u00a0\u202f\u2009]/g, ' ');

describe('formatLocaleDate', () => {
  it('prints dd/mm/yyyy and the medium form in en-GB and en-KE', () => {
    expect(formatLocaleDate('2026-03-15', 'en-GB')).toBe('15 Mar 2026');
    expect(formatLocaleDate('2026-03-15', 'en-GB', { style: 'short' })).toBe('15/03/2026');
    expect(formatLocaleDate('2026-03-15', 'en-KE', { style: 'short' })).toBe('15/03/2026');
    expect(formatLocaleDate('2026-03-15', 'en-GB', { style: 'long' })).toBe('15 March 2026');
    expect(formatLocaleDate('2026-03-15', 'en-GB', { style: 'full' })).toBe('Sunday, 15 March 2026');
  });

  it('prints mm/dd/yyyy in en-US, because the locale decides the order', () => {
    expect(formatLocaleDate('2026-03-15', 'en-US', { style: 'short' })).toBe('03/15/2026');
  });

  it('prints French, Portuguese and Kiswahili month names', () => {
    expect(formatLocaleDate('2026-03-15', 'fr-FR', { style: 'long' })).toBe('15 mars 2026');
    expect(formatLocaleDate('2026-03-15', 'pt-PT', { style: 'long' })).toBe('15 de março de 2026');
    expect(formatLocaleDate('2026-03-15', 'sw-KE')).toBe('15 Mac 2026');
  });

  it('prints Arabic with Arabic-Indic digits and its own month name', () => {
    expect(formatLocaleDate('2026-03-15', 'ar-EG')).toBe('١٥ مارس ٢٠٢٦');
    expect(clean(formatLocaleDate('2026-03-15', 'ar-EG', { style: 'short' }))).toBe('١٥/٠٣/٢٠٢٦');
    expect(clean(formatLocaleDate('2026-03-15', 'ar-EG', { style: 'full' }))).toBe(
      'الأحد، ١٥ مارس ٢٠٢٦'
    );
  });

  it('renders the placeholder for a missing or unreadable date', () => {
    expect(formatLocaleDate(null)).toBe(NO_DATE);
    expect(formatLocaleDate(undefined)).toBe(NO_DATE);
    expect(formatLocaleDate('not a date')).toBe(NO_DATE);
  });
});

describe('ISO calendar days', () => {
  it('reads a YYYY-MM-DD string as a local calendar day, not as UTC midnight', () => {
    const date = parseIsoDate('2024-03-31');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2024);
    expect(date!.getMonth()).toBe(2);
    expect(date!.getDate()).toBe(31);
    expect(formatIsoDate(date!)).toBe('2024-03-31');
  });

  it('refuses an impossible calendar day', () => {
    expect(parseIsoDate('2023-02-29')).toBeNull();
    expect(parseIsoDate('15/03/2026')).toBeNull();
  });

  it('round-trips the DST boundaries the form relies on', () => {
    expect(formatIsoDate(parseIsoDate('2024-11-03')!)).toBe('2024-11-03');
    expect(formatLocaleDate('2024-03-31', 'en-GB', { style: 'short' })).toBe('31/03/2024');
  });
});

describe('time and month-year', () => {
  it('prints the locale clock', () => {
    const afternoon = new Date(2026, 2, 15, 14, 30);
    expect(formatLocaleTime(afternoon, 'en-GB')).toBe('14:30');
    expect(formatLocaleTime(afternoon, 'en-US')).toBe('02:30 PM');
    expect(clean(spaced(formatLocaleTime(afternoon, 'ar-EG')))).toBe('٠٢:٣٠ م');
    expect(formatLocaleTime(afternoon, 'en-GB', { seconds: true })).toBe('14:30:00');
  });

  it('prints date and time together', () => {
    expect(formatLocaleDateTime(new Date(2026, 2, 15, 14, 30), 'en-GB')).toBe('15 Mar 2026, 14:30');
  });

  it('prints the month and year', () => {
    expect(formatLocaleMonthYear('2026-03-15', 'fr-FR')).toBe('mars 2026');
    expect(formatLocaleMonthYear('2026-03-15', 'ar-EG')).toBe('مارس ٢٠٢٦');
  });
});

describe('date entry pattern and week', () => {
  it('gives the order a locale types dates in', () => {
    expect(dateEntryPattern('en-KE')).toEqual({
      order: ['day', 'month', 'year'],
      separator: '/',
      placeholder: 'dd/mm/yyyy',
    });
    expect(dateEntryPattern('en-US')).toEqual({
      order: ['month', 'day', 'year'],
      separator: '/',
      placeholder: 'mm/dd/yyyy',
    });
    expect(dateEntryPattern('ar-EG').placeholder).toBe('dd/mm/yyyy');
  });

  it('starts the weekday labels on the locale first day', () => {
    expect(weekdayLabels('en-GB')[0]).toBe('Mon');
    expect(weekdayLabels('en-GB', { width: 'long' })[0]).toBe('Monday');
    expect(weekdayLabels('en-US')[0]).toBe('Sun');
    expect(weekdayLabels('ar-EG')[0]).toBe('السبت');
  });

  it('finds the first day of the locale week', () => {
    // 2026-03-15 is a Sunday.
    expect(formatIsoDate(startOfLocaleWeek(new Date(2026, 2, 15), 'en-GB'))).toBe('2026-03-09');
    expect(formatIsoDate(startOfLocaleWeek(new Date(2026, 2, 15), 'ar-EG'))).toBe('2026-03-14');
  });
});
