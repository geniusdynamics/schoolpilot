// ABOUTME: The calendar abstraction: the Gregorian and Ethiopian calendars convert to and from a local Gregorian day,
// ABOUTME: round-trip over two centuries, and agree with the platform's own ICU Ethiopic calendar on every day checked.

import { describe, expect, it } from 'vitest';

import { CALENDAR_IDS, calendarForLocale, getCalendar } from '..';

const ethiopic = getCalendar('ethiopic');
const gregorian = getCalendar('gregorian');

/** A local calendar day. */
const day = (year: number, month: number, date: number): Date => new Date(year, month - 1, date);

/** Every local day from `from` to `to`, inclusive. */
function* eachDay(from: Date, to: Date): Generator<Date> {
  for (let current = from; current <= to; current = day(current.getFullYear(), current.getMonth() + 1, current.getDate() + 1)) {
    yield current;
  }
}

const icuHasEthiopic = (): boolean => {
  try {
    return Intl.supportedValuesOf('calendar').includes('ethiopic');
  } catch {
    return false;
  }
};

describe('the calendars on offer', () => {
  it('are the Gregorian calendar and the Ethiopian one', () => {
    expect([...CALENDAR_IDS]).toEqual(['gregorian', 'ethiopic']);
    expect(gregorian.id).toBe('gregorian');
    expect(ethiopic.id).toBe('ethiopic');
  });

  it('count twelve months in a Gregorian year and thirteen in an Ethiopian one', () => {
    expect(gregorian.monthsInYear).toBe(12);
    expect(ethiopic.monthsInYear).toBe(13);
  });
});

describe('the Gregorian calendar', () => {
  it('reads a local day as the year, month and day it shows', () => {
    expect(gregorian.fromGregorian(day(2024, 2, 29))).toEqual({ year: 2024, month: 2, day: 29 });
  });

  it('gives back the local day of a date', () => {
    expect(gregorian.toGregorian({ year: 2014, month: 3, day: 15 })).toEqual(day(2014, 3, 15));
  });

  it('knows the length of every month, leap years included', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => gregorian.daysInMonth(2023, month))).toEqual([
      31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ]);
    expect(gregorian.daysInMonth(2024, 2)).toBe(29);
    expect(gregorian.daysInMonth(1900, 2)).toBe(28);
    expect(gregorian.daysInMonth(2000, 2)).toBe(29);
  });

  it('refuses a date that is not on the calendar', () => {
    expect(gregorian.isValidDate({ year: 2023, month: 2, day: 29 })).toBe(false);
    expect(gregorian.isValidDate({ year: 2024, month: 2, day: 29 })).toBe(true);
    expect(gregorian.isValidDate({ year: 2024, month: 13, day: 1 })).toBe(false);
    expect(gregorian.isValidDate({ year: 2024, month: 0, day: 1 })).toBe(false);
    expect(gregorian.isValidDate({ year: 2024, month: 1, day: 0 })).toBe(false);
  });

  it('starts a month on its first day', () => {
    expect(gregorian.startOfMonth(day(2024, 2, 17))).toEqual(day(2024, 2, 1));
  });

  it('steps by months and keeps a day inside a shorter month', () => {
    expect(gregorian.addMonths(day(2024, 1, 31), 1)).toEqual(day(2024, 2, 29));
    expect(gregorian.addMonths(day(2023, 3, 31), -1)).toEqual(day(2023, 2, 28));
    expect(gregorian.addMonths(day(2023, 12, 15), 1)).toEqual(day(2024, 1, 15));
    expect(gregorian.addMonths(day(2024, 1, 15), -1)).toEqual(day(2023, 12, 15));
    expect(gregorian.addMonths(day(2024, 1, 15), 24)).toEqual(day(2026, 1, 15));
  });

  it('names its months in the locale', () => {
    expect(gregorian.monthNames('en-GB')[0]).toBe('January');
    expect(gregorian.monthNames('en-GB')).toHaveLength(12);
    expect(gregorian.monthNames('fr-FR')[0]).toBe('janvier');
  });

  it('writes a month and a long date the way the locale does', () => {
    expect(gregorian.formatMonthYear(day(2014, 3, 15), 'en-KE')).toBe('March 2014');
    expect(gregorian.formatLong(day(2014, 3, 15), 'en-KE')).toContain('15 March 2014');
  });
});

describe('the Ethiopian calendar', () => {
  // Each row is a Gregorian day and the Ethiopian date it falls on. The leap day, the end of the year, the
  // new year (Enkutatash) and the edges of the range the app uses are the days a conversion gets wrong.
  it.each([
    [[2023, 9, 12], [2016, 1, 1]], // Enkutatash 2016 E.C.
    [[2023, 9, 11], [2015, 13, 6]], // the sixth day of Pagume, the leap day of 2015
    [[2023, 9, 10], [2015, 13, 5]],
    [[2024, 9, 11], [2017, 1, 1]], // 2016 is not a leap year: its Pagume ends on the fifth day
    [[2024, 9, 10], [2016, 13, 5]],
    [[2025, 9, 11], [2018, 1, 1]],
    [[2027, 9, 11], [2019, 13, 6]], // 2019 is the next leap year
    [[2027, 9, 12], [2020, 1, 1]],
    [[2007, 9, 12], [2000, 1, 1]], // the millennium
    [[2024, 1, 7], [2016, 4, 28]],
    [[2000, 1, 1], [1992, 4, 22]],
    [[1900, 1, 1], [1892, 4, 23]],
    [[2100, 12, 31], [2093, 4, 21]],
  ] as const)('reads %j as %j', ([gy, gm, gd], [ey, em, ed]) => {
    expect(ethiopic.fromGregorian(day(gy, gm, gd))).toEqual({ year: ey, month: em, day: ed });
    expect(ethiopic.toGregorian({ year: ey, month: em, day: ed })).toEqual(day(gy, gm, gd));
  });

  it('has twelve months of thirty days and a short thirteenth', () => {
    for (let month = 1; month <= 12; month += 1) {
      expect(ethiopic.daysInMonth(2016, month)).toBe(30);
    }
    expect(ethiopic.daysInMonth(2016, 13)).toBe(5);
  });

  it('gives Pagume a sixth day in the years that leave 3 when divided by 4, and five in the rest', () => {
    expect([2011, 2015, 2019, 2023].map((year) => ethiopic.daysInMonth(year, 13))).toEqual([6, 6, 6, 6]);
    expect([2012, 2013, 2014, 2016, 2017, 2018].map((year) => ethiopic.daysInMonth(year, 13))).toEqual([5, 5, 5, 5, 5, 5]);
  });

  it('refuses a date that is not on the calendar', () => {
    expect(ethiopic.isValidDate({ year: 2016, month: 13, day: 6 })).toBe(false);
    expect(ethiopic.isValidDate({ year: 2015, month: 13, day: 6 })).toBe(true);
    expect(ethiopic.isValidDate({ year: 2016, month: 14, day: 1 })).toBe(false);
    expect(ethiopic.isValidDate({ year: 2016, month: 0, day: 1 })).toBe(false);
    expect(ethiopic.isValidDate({ year: 2016, month: 1, day: 31 })).toBe(false);
    expect(ethiopic.isValidDate({ year: 2016, month: 1, day: 30 })).toBe(true);
    expect(ethiopic.isValidDate({ year: 0, month: 1, day: 1 })).toBe(false);
    expect(ethiopic.isValidDate({ year: 2016.5, month: 1, day: 1 })).toBe(false);
  });

  it('round-trips every day from 1900 to 2100 through the Ethiopian date', () => {
    const wrong: string[] = [];
    for (const date of eachDay(day(1900, 1, 1), day(2100, 12, 31))) {
      const ethiopian = ethiopic.fromGregorian(date);
      const back = ethiopic.toGregorian(ethiopian);
      if (back.getTime() !== date.getTime() || !ethiopic.isValidDate(ethiopian)) {
        wrong.push(`${date.toDateString()} -> ${JSON.stringify(ethiopian)} -> ${back.toDateString()}`);
        if (wrong.length >= 5) break;
      }
    }
    expect(wrong).toEqual([]);
  });

  it('round-trips every Ethiopian date of the years 1893 to 2092 through the Gregorian day', () => {
    const wrong: string[] = [];
    for (let year = 1893; year <= 2092; year += 1) {
      for (let month = 1; month <= 13; month += 1) {
        for (let dayOfMonth = 1; dayOfMonth <= ethiopic.daysInMonth(year, month); dayOfMonth += 1) {
          const ethiopian = { year, month, day: dayOfMonth };
          const back = ethiopic.fromGregorian(ethiopic.toGregorian(ethiopian));
          if (back.year !== year || back.month !== month || back.day !== dayOfMonth) {
            wrong.push(`${JSON.stringify(ethiopian)} -> ${JSON.stringify(back)}`);
          }
        }
      }
    }
    expect(wrong.slice(0, 5)).toEqual([]);
  });

  it('runs on without a gap: the next Gregorian day is always the next Ethiopian day', () => {
    let previous = ethiopic.fromGregorian(day(1950, 1, 1));
    const wrong: string[] = [];
    for (const date of eachDay(day(1950, 1, 2), day(2060, 12, 31))) {
      const current = ethiopic.fromGregorian(date);
      const sameMonth = current.year === previous.year && current.month === previous.month && current.day === previous.day + 1;
      const nextMonth = current.day === 1 && previous.day === ethiopic.daysInMonth(previous.year, previous.month) &&
        ((current.month === previous.month + 1 && current.year === previous.year) ||
          (previous.month === 13 && current.month === 1 && current.year === previous.year + 1));
      if (!sameMonth && !nextMonth) {
        wrong.push(`${JSON.stringify(previous)} -> ${JSON.stringify(current)}`);
        if (wrong.length >= 5) break;
      }
      previous = current;
    }
    expect(wrong).toEqual([]);
  });

  it.skipIf(!icuHasEthiopic())('agrees with the platform ICU Ethiopic calendar on every day from 1990 to 2060', () => {
    const icu = new Intl.DateTimeFormat('en-u-ca-ethiopic', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
    const wrong: string[] = [];
    for (const date of eachDay(day(1990, 1, 1), day(2060, 12, 31))) {
      const parts = icu.formatToParts(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)));
      const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
      const expected = { year: read('year'), month: read('month'), day: read('day') };
      const actual = ethiopic.fromGregorian(date);
      if (actual.year !== expected.year || actual.month !== expected.month || actual.day !== expected.day) {
        wrong.push(`${date.toDateString()}: ICU ${JSON.stringify(expected)}, ours ${JSON.stringify(actual)}`);
        if (wrong.length >= 5) break;
      }
    }
    expect(wrong).toEqual([]);
  });

  it('starts a month on its first day', () => {
    expect(ethiopic.startOfMonth(day(2024, 1, 7))).toEqual(day(2023, 12, 11));
    expect(ethiopic.fromGregorian(ethiopic.startOfMonth(day(2024, 1, 7)))).toEqual({ year: 2016, month: 4, day: 1 });
  });

  it('steps by Ethiopian months, keeping the day where the month is long enough', () => {
    const step = (from: [number, number, number], months: number) =>
      ethiopic.fromGregorian(ethiopic.addMonths(ethiopic.toGregorian({ year: from[0], month: from[1], day: from[2] }), months));

    expect(step([2016, 1, 30], 1)).toEqual({ year: 2016, month: 2, day: 30 });
    expect(step([2016, 12, 30], 1)).toEqual({ year: 2016, month: 13, day: 5 }); // Pagume has five days in 2016
    expect(step([2015, 12, 30], 1)).toEqual({ year: 2015, month: 13, day: 6 }); // and six in 2015
    expect(step([2015, 13, 6], 1)).toEqual({ year: 2016, month: 1, day: 6 });
    expect(step([2016, 1, 15], -1)).toEqual({ year: 2015, month: 13, day: 6 });
    expect(step([2016, 4, 28], 13)).toEqual({ year: 2017, month: 4, day: 28 });
    expect(step([2016, 4, 28], -13)).toEqual({ year: 2015, month: 4, day: 28 });
  });

  it('names its thirteen months, from Meskerem to Pagumen', () => {
    const names = ethiopic.monthNames('en');
    expect(names).toHaveLength(13);
    expect(names[0]).toBe('Meskerem');
    expect(names[12]).toBe('Pagumen');
    expect(new Set(names).size).toBe(13);
  });

  it('names its months in Amharic when the platform has the data', () => {
    const names = ethiopic.monthNames('am');
    expect(names).toHaveLength(13);
    if (icuHasEthiopic()) expect(names[0]).not.toBe('Meskerem');
  });

  it('falls back to the transliterated names for a locale the platform does not know', () => {
    expect(ethiopic.monthNames('not a locale')[0]).toBe('Meskerem');
  });

  it('writes a month and a long date in Ethiopian terms, never the Gregorian ones', () => {
    expect(ethiopic.formatMonthYear(day(2023, 9, 12), 'en')).toBe('Meskerem 2016');
    expect(ethiopic.formatLong(day(2023, 9, 12), 'en')).toMatch(/^[A-Za-z]+, 1 Meskerem 2016$/);
    expect(ethiopic.formatLong(day(2023, 9, 11), 'en')).toMatch(/, 6 Pagumen 2015$/);
  });
});

describe('the calendar a locale uses', () => {
  it.each(['am-ET', 'am', 'ti-ET', 'om-ET', 'en-ET', 'en-u-ca-ethiopic'])('is Ethiopian for %s', (locale) => {
    expect(calendarForLocale(locale)).toBe('ethiopic');
  });

  it.each(['en-KE', 'en-GB', 'en-US', 'sw-KE', 'fr-FR', 'ar-EG', 'pt-PT', 'rw', 'en'])('is Gregorian for %s', (locale) => {
    expect(calendarForLocale(locale)).toBe('gregorian');
  });

  it('keeps to the calendar a locale asks for by name, over the one its region would use', () => {
    expect(calendarForLocale('am-ET-u-ca-gregory')).toBe('gregorian');
    expect(calendarForLocale('en-u-ca-gregory')).toBe('gregorian');
  });

  it('is Gregorian for something that is not a locale', () => {
    expect(calendarForLocale('')).toBe('gregorian');
    expect(calendarForLocale('not a locale')).toBe('gregorian');
  });
});
