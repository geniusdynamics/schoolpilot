// ABOUTME: Public holidays from a country pack: Easter by the Gregorian computus, each holiday's rule
// ABOUTME: resolved to a date for a year, effective dating, and the Sunday-to-next-free-day rule.

import { getCountryPack } from './registry';
import type { CountryHoliday, DatedHoliday } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

function toIso(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function utc(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day);
}

/** Easter Sunday of a Gregorian year as `YYYY-MM-DD` (the anonymous Gregorian algorithm). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toIso(utc(year, month, day));
}

/** The date a holiday's rule gives for a year, or `undefined` when the rule names none. */
function nominalDate(holiday: CountryHoliday, year: number): string | undefined {
  const { rule } = holiday;
  if (rule.type === 'fixed') return toIso(utc(year, rule.month, rule.day));
  if (rule.type === 'easter') return toIso(Date.parse(`${easterSunday(year)}T00:00:00Z`) + rule.offsetDays * DAY_MS);
  return rule.dates[String(year)];
}

function isSunday(date: string): boolean {
  return new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
}

function inEffect(holiday: CountryHoliday, date: string): boolean {
  return date >= holiday.effectiveFrom && (holiday.effectiveTo === null || date <= holiday.effectiveTo);
}

/**
 * The public holidays of a year, in the order of the days they are observed.
 *
 * A holiday on a Sunday whose rule is `sunday_to_monday` is observed on the first following day
 * that is not itself a holiday (Public Holidays Act, Cap. 110), so a Sunday Christmas whose Monday
 * is Boxing Day is observed on the Tuesday. A year with no pack, or outside every holiday's
 * effective dates, has none.
 */
export function holidaysOf(country: string | null | undefined, year: number): DatedHoliday[] {
  const pack = getCountryPack(country);
  if (!pack || !Number.isInteger(year)) return [];

  const dated: { holiday: CountryHoliday; date: string }[] = [];
  for (const holiday of pack.holidays) {
    const date = nominalDate(holiday, year);
    if (date !== undefined && inEffect(holiday, date)) dated.push({ holiday, date });
  }
  dated.sort((left, right) => left.date.localeCompare(right.date));

  // Days already taken: every holiday that keeps its own date. A holiday moved off a Sunday takes
  // the first later day that is not in this set, and then joins it.
  const taken = new Set(
    dated
      .filter(({ holiday, date }) => !(holiday.observed === 'sunday_to_monday' && isSunday(date)))
      .map(({ date }) => date)
  );
  const result: DatedHoliday[] = dated.map(({ holiday, date }) => {
    let observed = date;
    if (holiday.observed === 'sunday_to_monday' && isSunday(date)) {
      let candidate = Date.parse(`${date}T00:00:00Z`);
      do {
        candidate += DAY_MS;
      } while (taken.has(toIso(candidate)));
      observed = toIso(candidate);
      taken.add(observed);
    }
    return {
      id: holiday.id,
      nameKey: holiday.nameKey,
      date,
      observed,
      verification: holiday.verification,
    };
  });
  return result.sort((left, right) => left.observed.localeCompare(right.observed) || left.date.localeCompare(right.date));
}
