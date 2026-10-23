// ABOUTME: Quiet hours: the window a reminder must not be sent in, read in the schedule's own
// ABOUTME: time zone, and the instant a reminder deferred inside it is released. The wall clock
// ABOUTME: comes from the runtime's Intl, so no dependency and no hand-rolled zone table.

import { CollectionsError } from './errors';
import type { QuietHours } from './types';

/** A wall clock reading in a time zone: what a clock on the wall there would show. */
export interface WallClock {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timezone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  formatters.set(timezone, formatter);
  return formatter;
}

/** The wall clock in a time zone at an instant. */
export function wallClock(timezone: string, instant: Date): WallClock {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = formatterFor(timezone).formatToParts(instant);
  } catch (error) {
    throw new CollectionsError('schedule_invalid', `"${timezone}" is not an IANA time zone`, {
      detail: { timezone },
      cause: error,
    });
  }
  const read = (type: string): number => {
    const part = parts.find((candidate) => candidate.type === type);
    return part ? Number(part.value) : 0;
  };
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

/** The local day (`YYYY-MM-DD`) in a time zone at an instant. */
export function localIsoDay(timezone: string, instant: Date): string {
  const clock = wallClock(timezone, instant);
  return `${clock.year.toString().padStart(4, '0')}-${clock.month
    .toString()
    .padStart(2, '0')}-${clock.day.toString().padStart(2, '0')}`;
}

/** Minutes since local midnight in a time zone at an instant. */
export function localMinutes(timezone: string, instant: Date): number {
  const clock = wallClock(timezone, instant);
  return clock.hour * 60 + clock.minute;
}

/** Reads a local wall clock `HH:mm` as minutes since midnight. */
export function parseWallClock(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new CollectionsError('schedule_invalid', `"${value}" is not local wall clock "HH:mm"`, {
      detail: { value },
    });
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Whether an instant falls inside the quiet window.
 *
 * The window is `[start, end)` in the schedule's time zone. A window whose end is at or before its
 * start crosses midnight (20:00 to 07:00 is the usual one); a window with equal ends is empty.
 */
export function isWithinQuietHours(quiet: QuietHours, instant: Date): boolean {
  if (!quiet.enabled) return false;
  const start = parseWallClock(quiet.start);
  const end = parseWallClock(quiet.end);
  if (start === end) return false;
  const now = localMinutes(quiet.timezone, instant);
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

/** The UTC offset of a time zone at an instant, in milliseconds. */
function utcOffsetMs(timezone: string, instant: Date): number {
  const clock = wallClock(timezone, instant);
  const asUtc = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second);
  const truncated = Math.floor(instant.getTime() / 1000) * 1000;
  return asUtc - truncated;
}

/** The instant a local wall clock reading in a time zone happens at. */
export function instantForLocalWallClock(
  timezone: string,
  day: { readonly year: number; readonly month: number; readonly day: number },
  minutes: number
): Date {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const target = Date.UTC(day.year, day.month - 1, day.day, hour, minute, 0, 0);
  // Two passes: the offset at the first guess, then the offset at the refined instant, which
  // settles a zone that shifts its offset across the boundary being sought.
  let guess = target;
  for (let pass = 0; pass < 2; pass += 1) {
    guess = target - utcOffsetMs(timezone, new Date(guess));
  }
  return new Date(guess);
}

function addDays(day: WallClock, deltaDays: number): WallClock {
  const shifted = new Date(Date.UTC(day.year, day.month - 1, day.day + deltaDays));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  };
}

/**
 * The instant a reminder is released.
 *
 * An instant outside the window is released at once. An instant inside it is released when the
 * window next ends - today if the window does not cross midnight or the reading is in its early
 * hours, tomorrow otherwise. The reminder is queued for that instant, never dropped.
 */
export function quietHoursRelease(quiet: QuietHours, instant: Date): Date {
  if (!isWithinQuietHours(quiet, instant)) return instant;
  const start = parseWallClock(quiet.start);
  const end = parseWallClock(quiet.end);
  const clock = wallClock(quiet.timezone, instant);
  const crossesMidnight = end <= start;
  const afterMidnightPart = localMinutes(quiet.timezone, instant) >= start;
  const releaseDay = crossesMidnight && afterMidnightPart ? addDays(clock, 1) : clock;
  return instantForLocalWallClock(quiet.timezone, releaseDay, end);
}

/** The window, in the words a screen shows. */
export function quietHoursWindow(quiet: QuietHours): string {
  if (!quiet.enabled) return 'None: reminders go out at any hour.';
  return `${quiet.start}-${quiet.end} ${quiet.timezone}`;
}
