// ABOUTME: The schedule as data: the day an interval falls on, whether a run is due to fire it,
// ABOUTME: and the validation that keeps a malformed schedule out of the store. The arithmetic is
// ABOUTME: the statements module's own day count, so a reminder's day cannot drift from the aging.

import { daysBetween } from '@/domain/finance/statements';

import { CollectionsError } from './errors';
import {
  REMINDER_CATEGORIES,
  REMINDER_CHANNELS,
  type QuietHours,
  type ReminderAudience,
  type ReminderCategory,
  type ReminderInterval,
  type ReminderIntervalPhase,
  type ReminderSchedule,
} from './types';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const WALL_CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** The quiet hours a schedule starts with: nothing is sent between 20:00 and 07:00 local time. */
export const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: true,
  start: '20:00',
  end: '07:00',
  timezone: 'Africa/Nairobi',
};

/**
 * The reminder ladder of spec 05 §6, as a schedule's intervals: a nudge before the due date, one
 * on the day, and firmer ones as the arrears age. A school states its own; this is the default.
 */
export const DEFAULT_INTERVALS: readonly ReminderInterval[] = [
  { id: 'before_due_3', phase: 'before_due', days: 3, label: 'Three days before the due date' },
  { id: 'on_due', phase: 'on_due', days: 0, label: 'On the due date' },
  { id: 'after_due_7', phase: 'after_due', days: 7, label: 'A week past due' },
  { id: 'after_due_30', phase: 'after_due', days: 30, label: 'A month past due' },
];

/** Refuses a day that is not an ISO `YYYY-MM-DD`. */
function assertIsoDay(day: string, what: string): void {
  if (!ISO_DAY.test(day)) {
    throw new CollectionsError('interval_invalid', `${what} must be an ISO day (YYYY-MM-DD), not "${day}"`, {
      detail: { what, day },
    });
  }
}

/** Shifts an ISO day by whole days, in UTC, so a time zone cannot move it. */
export function shiftDay(day: string, deltaDays: number): string {
  assertIsoDay(day, 'the day to shift');
  const [year, month, date] = day.split('-').map((part) => Number(part));
  const shifted = new Date(Date.UTC(year, month - 1, date + deltaDays));
  return shifted.toISOString().slice(0, 10);
}

/** The signed day offset of an interval: negative before the due date, positive after it. */
export function intervalOffset(interval: ReminderInterval): number {
  switch (interval.phase) {
    case 'before_due':
      return -Math.abs(interval.days);
    case 'after_due':
      return Math.abs(interval.days);
    case 'on_due':
      return 0;
  }
}

/** The day an interval falls on for a due date. */
export function intervalDay(interval: ReminderInterval, dueDate: string): string {
  return shiftDay(dueDate, intervalOffset(interval));
}

/**
 * Whether a run on `runDay` is due to fire an interval for a due date.
 *
 * An interval fires on its own day. `catchUpDays` lets a run that was missed (a weekend, a
 * process that was down) still fire it in the following days, and only then: a reminder for a
 * date that is already `catchUpDays` behind is not fired late. The default of 0 is the exact day.
 */
export function isIntervalDueOn(
  interval: ReminderInterval,
  dueDate: string,
  runDay: string,
  catchUpDays = 0
): boolean {
  const offset = daysBetween(intervalDay(interval, dueDate), runDay);
  return offset >= 0 && offset <= Math.max(0, catchUpDays);
}

/**
 * Validates a schedule, refusing the shapes the run cannot honour.
 *
 * A schedule with no interval reminds nobody, a duplicate interval id makes the idempotency key
 * ambiguous, and a channel or category outside the module's list cannot be templated.
 */
export function validateSchedule(schedule: ReminderSchedule): void {
  const fail = (message: string, detail: Readonly<Record<string, unknown>> = {}): never => {
    throw new CollectionsError('schedule_invalid', message, { detail: { scheduleId: schedule.id, ...detail } });
  };

  if (schedule.name.trim() === '') fail('a schedule needs a name');
  if (!isAudience(schedule.audience)) fail(`"${schedule.audience}" is not an audience`, { audience: schedule.audience });
  if (!REMINDER_CATEGORIES.includes(schedule.category)) {
    fail(`"${schedule.category}" is not a category`, { category: schedule.category });
  }
  if (schedule.escalationCategory !== undefined && !REMINDER_CATEGORIES.includes(schedule.escalationCategory)) {
    fail(`"${schedule.escalationCategory}" is not a category`, { category: schedule.escalationCategory });
  }
  if (schedule.intervals.length === 0) fail('a schedule needs at least one interval');
  if (schedule.channels.length === 0) fail('a schedule needs at least one channel');

  const seen = new Set<string>();
  for (const interval of schedule.intervals) {
    if (interval.id.trim() === '') fail('an interval needs an id');
    if (seen.has(interval.id)) fail(`the interval id "${interval.id}" is used twice`, { intervalId: interval.id });
    seen.add(interval.id);
    if (!Number.isInteger(interval.days) || interval.days < 0) {
      fail(`the interval "${interval.id}" needs a whole, non-negative day count`, {
        intervalId: interval.id,
        days: interval.days,
      });
    }
    if (!isPhase(interval.phase)) {
      fail(`the interval "${interval.id}" has an unknown phase "${interval.phase}"`, { intervalId: interval.id });
    }
  }

  for (const channel of schedule.channels) {
    if (!REMINDER_CHANNELS.includes(channel)) fail(`"${channel}" is not a channel`, { channel });
  }

  const quiet = schedule.quietHours;
  if (!WALL_CLOCK.test(quiet.start) || !WALL_CLOCK.test(quiet.end)) {
    fail('quiet hours must be local wall clock "HH:mm"', { start: quiet.start, end: quiet.end });
  }
  if (quiet.enabled && !isTimeZone(quiet.timezone)) {
    fail(`"${quiet.timezone}" is not an IANA time zone`, { timezone: quiet.timezone });
  }
  if (schedule.payLinkTtlDays !== undefined && (!Number.isInteger(schedule.payLinkTtlDays) || schedule.payLinkTtlDays <= 0)) {
    fail('the pay-link lifetime must be a whole number of days above zero', { payLinkTtlDays: schedule.payLinkTtlDays });
  }
  if (schedule.catchUpDays !== undefined && (!Number.isInteger(schedule.catchUpDays) || schedule.catchUpDays < 0)) {
    fail('the catch-up window must be a whole, non-negative day count', { catchUpDays: schedule.catchUpDays });
  }
}

function isAudience(value: string): value is ReminderAudience {
  return value === 'learner' || value === 'household' || value === 'sponsor';
}

function isPhase(value: string): value is ReminderIntervalPhase {
  return value === 'before_due' || value === 'on_due' || value === 'after_due';
}

/** True when the runtime's `Intl` knows the time zone. */
export function isTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

/** A schedule with the module's defaults filled in, so a caller states only what differs. */
export function defaultReminderSchedule(input: {
  readonly id: string;
  readonly institutionId: string;
  readonly name: string;
  readonly audience: ReminderAudience;
  readonly category: ReminderCategory;
}): ReminderSchedule {
  return {
    id: input.id,
    institutionId: input.institutionId,
    name: input.name,
    enabled: true,
    audience: input.audience,
    category: input.category,
    intervals: DEFAULT_INTERVALS,
    channels: ['sms', 'email'],
    quietHours: DEFAULT_QUIET_HOURS,
  };
}
