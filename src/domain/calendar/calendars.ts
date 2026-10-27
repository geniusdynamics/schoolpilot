// ABOUTME: The calendars by id, and which one a locale uses when nothing asks for another: Ethiopian for the locales of
// ABOUTME: Ethiopia (Amharic, Tigrinya, Oromo, or any ET region), Gregorian for the rest.

import { ethiopicCalendar } from './ethiopic';
import { gregorianCalendar } from './gregorian';
import type { CalendarId, CalendarSystem } from './types';

const CALENDARS: Readonly<Record<CalendarId, CalendarSystem>> = {
  gregorian: gregorianCalendar,
  ethiopic: ethiopicCalendar,
};

export function getCalendar(id: CalendarId): CalendarSystem {
  return CALENDARS[id];
}

/**
 * The calendar a locale reads dates in.
 *
 * A calendar the tag names (`en-u-ca-ethiopic`) wins; one the platform cannot show (`ethioaa`) reads as Gregorian.
 * Without one, the locale's likely region decides: `am`, `ti-ET` and `en-ET` are Ethiopian, `en-KE` is not.
 */
export function calendarForLocale(locale: string): CalendarId {
  try {
    const parsed = new Intl.Locale(locale);
    if (parsed.calendar) return parsed.calendar === 'ethiopic' ? 'ethiopic' : 'gregorian';
    return parsed.maximize().region === 'ET' ? 'ethiopic' : 'gregorian';
  } catch {
    return 'gregorian';
  }
}
