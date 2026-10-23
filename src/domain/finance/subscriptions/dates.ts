// ABOUTME: Calendar-day helpers for the subscriptions module: read an ISO day, count the days
// ABOUTME: between two of them inclusively, and step one day at a time. UTC only, never a local zone.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** True when `value` is an ISO calendar day (`YYYY-MM-DD`) that names a real date. */
export function isIsoDay(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** The UTC midnight of an ISO day, in milliseconds. Throws on anything that is not an ISO day. */
export function dayMillis(value: string): number {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed)) {
    throw new Error(`${String(value)} is not an ISO calendar day`);
  }
  return parsed;
}

/** The ISO day `days` after `value`; a negative `days` steps back. */
export function addDays(value: string, days: number): string {
  return new Date(dayMillis(value) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The number of days from `start` to `end`, both ends included. Negative when `end` is before. */
export function daysInclusive(start: string, end: string): number {
  return Math.round((dayMillis(end) - dayMillis(start)) / DAY_MS) + 1;
}

/** The later of two ISO days. */
export function laterDay(left: string, right: string): string {
  return left >= right ? left : right;
}

/** The earlier of two ISO days. */
export function earlierDay(left: string, right: string): string {
  return left <= right ? left : right;
}
