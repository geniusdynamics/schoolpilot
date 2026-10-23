// ABOUTME: Quiet hours: the window read in the schedule's own time zone, the window that crosses
// ABOUTME: midnight, the day a run is made for, and the instant a reminder deferred inside the
// ABOUTME: window is released. All hand-computed against Africa/Nairobi, which is UTC+3 year-round.

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_QUIET_HOURS,
  isCollectionsError,
  isTimeZone,
  isWithinQuietHours,
  localIsoDay,
  localMinutes,
  parseWallClock,
  quietHoursRelease,
  quietHoursWindow,
  wallClock,
  type QuietHours,
} from '..';

const nairobi = (start: string, end: string): QuietHours => ({
  enabled: true,
  start,
  end,
  timezone: 'Africa/Nairobi',
});

describe('the wall clock in a time zone', () => {
  it('reads the local time and day in the schedule zone, not the machine zone', () => {
    // 18:00 UTC is 21:00 in Nairobi.
    expect(wallClock('Africa/Nairobi', new Date('2027-03-31T18:00:00Z'))).toMatchObject({
      year: 2027,
      month: 3,
      day: 31,
      hour: 21,
      minute: 0,
    });
    expect(localMinutes('Africa/Nairobi', new Date('2027-03-31T18:00:00Z'))).toBe(21 * 60);
    // 22:00 UTC is already the next day in Nairobi.
    expect(localIsoDay('Africa/Nairobi', new Date('2027-03-31T22:00:00Z'))).toBe('2027-04-01');
    expect(localIsoDay('Africa/Nairobi', new Date('2027-03-31T20:59:00Z'))).toBe('2027-03-31');
  });

  it('reads a local wall clock, and refuses one that is not HH:mm', () => {
    expect(parseWallClock('07:00')).toBe(420);
    expect(parseWallClock('20:30')).toBe(1230);
    expect(parseWallClock('00:00')).toBe(0);
    for (const bad of ['24:00', '7:00', '07:60', '0700', '']) {
      expect(() => parseWallClock(bad)).toThrowError();
    }
    let caught: unknown;
    try {
      parseWallClock('24:00');
    } catch (error) {
      caught = error;
    }
    expect(isCollectionsError(caught) && caught.code).toBe('schedule_invalid');
  });

  it('knows which time zones exist', () => {
    expect(isTimeZone('Africa/Nairobi')).toBe(true);
    expect(isTimeZone('Nowhere/Nothing')).toBe(false);
  });
});

describe('a window that crosses midnight', () => {
  const quiet = nairobi('20:00', '07:00');

  it('covers the evening and the small hours, and nothing between', () => {
    // 21:00 local: inside.
    expect(isWithinQuietHours(quiet, new Date('2027-03-31T18:00:00Z'))).toBe(true);
    // 05:00 local: inside, the small hours of the window.
    expect(isWithinQuietHours(quiet, new Date('2027-03-31T02:00:00Z'))).toBe(true);
    // 07:00 local exactly: the end is exclusive, so outside.
    expect(isWithinQuietHours(quiet, new Date('2027-03-31T04:00:00Z'))).toBe(false);
    // 11:00 local: outside.
    expect(isWithinQuietHours(quiet, new Date('2027-03-31T08:00:00Z'))).toBe(false);
    // 19:59 local: outside, one minute before the window opens.
    expect(isWithinQuietHours(quiet, new Date('2027-03-31T16:59:00Z'))).toBe(false);
  });

  it('releases an evening reminder at 07:00 the next local morning', () => {
    // 21:00 on 31 March local -> 07:00 on 1 April local -> 04:00 UTC on 1 April.
    expect(quietHoursRelease(quiet, new Date('2027-03-31T18:00:00Z')).toISOString()).toBe(
      '2027-04-01T04:00:00.000Z'
    );
  });

  it('releases an early-hours reminder at 07:00 the same local morning', () => {
    // 05:00 on 31 March local -> 07:00 on 31 March local -> 04:00 UTC on 31 March.
    expect(quietHoursRelease(quiet, new Date('2027-03-31T02:00:00Z')).toISOString()).toBe(
      '2027-03-31T04:00:00.000Z'
    );
  });
});

describe('a window inside one day', () => {
  const quiet = nairobi('13:00', '15:00');

  it('covers the middle of the day only', () => {
    expect(isWithinQuietHours(quiet, new Date('2027-03-31T11:00:00Z'))).toBe(true); // 14:00
    expect(isWithinQuietHours(quiet, new Date('2027-03-31T09:59:00Z'))).toBe(false); // 12:59
    expect(isWithinQuietHours(quiet, new Date('2027-03-31T12:00:00Z'))).toBe(false); // 15:00
  });

  it('releases at the end of the window the same day', () => {
    expect(quietHoursRelease(quiet, new Date('2027-03-31T11:00:00Z')).toISOString()).toBe(
      '2027-03-31T12:00:00.000Z'
    );
  });
});

describe('the edges of the window', () => {
  it('releases at once when the instant is outside the window', () => {
    const at = new Date('2027-03-31T08:00:00Z');
    expect(quietHoursRelease(DEFAULT_QUIET_HOURS, at).getTime()).toBe(at.getTime());
  });

  it('treats a disabled or empty window as no window at all', () => {
    expect(isWithinQuietHours({ ...nairobi('20:00', '07:00'), enabled: false }, new Date('2027-03-31T18:00:00Z'))).toBe(false);
    expect(isWithinQuietHours(nairobi('09:00', '09:00'), new Date('2027-03-31T06:00:00Z'))).toBe(false);
  });

  it('states the window in words', () => {
    expect(quietHoursWindow(DEFAULT_QUIET_HOURS)).toBe('20:00-07:00 Africa/Nairobi');
    expect(quietHoursWindow({ ...DEFAULT_QUIET_HOURS, enabled: false })).toMatch(/any hour/i);
  });
});
