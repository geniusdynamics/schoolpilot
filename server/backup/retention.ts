// ABOUTME: The retention rule of the backup directory: keep the newest daily, weekly and monthly
// ABOUTME: archives in a union, always keep the newest, and report everything else as expired.

import type { BackupReference, BackupRetentionPolicy } from './types';

/** The policy spec 06 §3.3 states: 7 daily, 4 weekly, 12 monthly. */
export const DEFAULT_RETENTION: BackupRetentionPolicy = {
  daily: 7,
  weekly: 4,
  monthly: 12,
};

/**
 * Chooses the archives to delete.
 *
 * The newest `daily` archives are kept outright; `weekly` keeps the newest archive of each ISO
 * week and `monthly` the newest of each calendar month, both newest first. The three sets are
 * unioned, so a month that only holds four dailies does not lose one to the monthly bucket.
 * The newest archive is always kept even when every bucket is zero.
 */
export function selectExpiredBackups(
  references: readonly BackupReference[],
  policy: BackupRetentionPolicy
): BackupReference[] {
  const newestFirst = [...references].sort(compareNewestFirst);
  if (newestFirst.length === 0) return [];

  const keep = new Set<string>();
  const newest = newestFirst[0];
  if (newest) keep.add(newest.id);

  for (const reference of newestFirst.slice(0, count(policy.daily))) {
    keep.add(reference.id);
  }

  keepNewestPerPeriod(newestFirst, count(policy.weekly), weekKey, keep);
  keepNewestPerPeriod(newestFirst, count(policy.monthly), monthKey, keep);

  return newestFirst.filter((reference) => !keep.has(reference.id));
}

/** The ISO week an archive belongs to, e.g. `2026-W35`. */
export function isoWeekKey(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'invalid';

  // ISO weeks belong to the year of their Thursday.
  const thursday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const weekday = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - weekday);

  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function monthKey(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'invalid';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function weekKey(isoDate: string): string {
  return isoWeekKey(isoDate);
}

/** Keeps the newest archive of each distinct period, until `limit` periods are held. */
function keepNewestPerPeriod(
  newestFirst: readonly BackupReference[],
  limit: number,
  keyOf: (createdAt: string) => string,
  keep: Set<string>
): void {
  if (limit <= 0) return;

  const seen = new Set<string>();
  for (const reference of newestFirst) {
    const period = keyOf(reference.createdAt);
    if (seen.has(period)) continue;
    seen.add(period);
    keep.add(reference.id);
    if (seen.size >= limit) return;
  }
}

function count(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function compareNewestFirst(left: BackupReference, right: BackupReference): number {
  const byTime = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  if (byTime !== 0) return byTime;
  return right.id.localeCompare(left.id);
}
