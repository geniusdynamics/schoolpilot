// ABOUTME: The backup cadence and retention rules proved on their own: ISO week boundaries,
// ABOUTME: the union of daily, weekly and monthly buckets, and the retry backoff.

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RETENTION,
  isBackupDue,
  isoWeekKey,
  nextDailyTime,
  parseDailyTime,
  selectExpiredBackups,
} from '../backup';
import type { BackupReference } from '../backup';

/** One archive at 02:00 UTC on each listed day. */
function archivesOf(days: readonly string[]): BackupReference[] {
  return days.map((day) => ({ id: `backup-${day}`, createdAt: `${day}T02:00:00.000Z` }));
}

describe('the retention rule', () => {
  it('keeps seven dailies and deletes the three oldest of ten consecutive days', () => {
    const references = archivesOf([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
    ]);

    const expired = selectExpiredBackups(references, DEFAULT_RETENTION).map((entry) => entry.id);

    expect(expired).toEqual(['backup-2026-01-03', 'backup-2026-01-02', 'backup-2026-01-01']);
  });

  it('adds the newest of an older week once the daily window no longer reaches it', () => {
    const references = archivesOf([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
    ]);

    const expired = selectExpiredBackups(references, {
      daily: 1,
      weekly: 4,
      monthly: 12,
    }).map((entry) => entry.id);

    // The newest daily is 10 January; the weekly bucket adds 4 January, the newest of the
    // previous ISO week. Everything older expires.
    expect(expired).toContain('backup-2026-01-03');
    expect(expired).not.toContain('backup-2026-01-04');
    expect(expired).not.toContain('backup-2026-01-10');
    expect(expired).toHaveLength(8);
  });

  it('always keeps the newest archive even when every bucket is zero', () => {
    const references = archivesOf(['2026-02-01', '2026-02-02', '2026-02-03']);
    const expired = selectExpiredBackups(references, { daily: 0, weekly: 0, monthly: 0 });
    expect(expired.map((entry) => entry.id)).toEqual(['backup-2026-02-02', 'backup-2026-02-01']);
  });

  it('keeps one archive per month for the monthly bucket', () => {
    const references = archivesOf(['2026-01-31', '2026-02-01', '2026-02-28', '2026-03-01']);
    const expired = selectExpiredBackups(references, { daily: 0, weekly: 0, monthly: 2 });
    expect(expired.map((entry) => entry.id)).toEqual([
      'backup-2026-02-01',
      'backup-2026-01-31',
    ]);
  });
});

describe('the ISO week key', () => {
  it('puts the last days of December into the next ISO year when the week belongs there', () => {
    expect(isoWeekKey('2025-12-29T00:00:00.000Z')).toBe('2026-W01');
    expect(isoWeekKey('2025-12-28T23:59:59.000Z')).toBe('2025-W52');
  });

  it('counts weeks from Monday', () => {
    expect(isoWeekKey('2026-01-04T12:00:00.000Z')).toBe('2026-W01');
    expect(isoWeekKey('2026-01-05T00:00:00.000Z')).toBe('2026-W02');
  });
});

describe('the daily cadence', () => {
  it('refuses a time that is not HH:MM', () => {
    expect(() => parseDailyTime('24:00')).toThrow(/HH:MM/);
    expect(() => parseDailyTime('2:00')).toThrow(/HH:MM/);
    expect(parseDailyTime('02:30')).toEqual({ hours: 2, minutes: 30 });
  });

  it('moves to tomorrow when the daily time has passed or is exactly now', () => {
    expect(nextDailyTime(new Date('2026-03-01T01:00:00.000Z'), '02:00').toISOString()).toBe(
      '2026-03-01T02:00:00.000Z'
    );
    expect(nextDailyTime(new Date('2026-03-01T02:00:00.000Z'), '02:00').toISOString()).toBe(
      '2026-03-02T02:00:00.000Z'
    );
  });

  it('is due on a fresh hub and not due again until the next day', () => {
    expect(isBackupDue({}, '02:00', new Date('2026-03-01T09:00:00.000Z'))).toBe(true);

    const state = { lastAutomaticAt: '2026-03-01T02:00:00.000Z' };
    expect(isBackupDue(state, '02:00', new Date('2026-03-02T01:59:59.000Z'))).toBe(false);
    expect(isBackupDue(state, '02:00', new Date('2026-03-02T02:00:00.000Z'))).toBe(true);
  });

  it('backs off after a failure instead of retrying on every timer tick', () => {
    const state = {
      lastAutomaticAt: '2026-03-01T02:00:00.000Z',
      lastAttemptAt: '2026-03-02T02:00:00.000Z',
      lastFailure: { at: '2026-03-02T02:00:00.000Z', message: 'no key' },
    };

    expect(isBackupDue(state, '02:00', new Date('2026-03-02T02:05:00.000Z'))).toBe(false);
    expect(isBackupDue(state, '02:00', new Date('2026-03-02T02:16:00.000Z'))).toBe(true);
  });
});
