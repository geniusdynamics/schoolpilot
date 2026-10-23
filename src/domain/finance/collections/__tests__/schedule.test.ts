// ABOUTME: The schedule as data: the day an interval falls on, whether a run fires it (including
// ABOUTME: the catch-up window), the day arithmetic, and the shapes the validator refuses.

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INTERVALS,
  defaultReminderSchedule,
  intervalDay,
  intervalOffset,
  isCollectionsError,
  isIntervalDueOn,
  shiftDay,
  validateSchedule,
  type ReminderInterval,
  type ReminderSchedule,
} from '..';

const DUE = '2027-02-05';
const before: ReminderInterval = { id: 'before_due_3', phase: 'before_due', days: 3 };
const onDue: ReminderInterval = { id: 'on_due', phase: 'on_due', days: 0 };
const after: ReminderInterval = { id: 'after_due_7', phase: 'after_due', days: 7 };

describe('the day arithmetic', () => {
  it('shifts an ISO day across a month and a leap day', () => {
    expect(shiftDay('2027-02-05', -3)).toBe('2027-02-02');
    expect(shiftDay('2027-02-05', 7)).toBe('2027-02-12');
    expect(shiftDay('2027-01-31', 1)).toBe('2027-02-01');
    expect(shiftDay('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftDay('2027-12-31', 1)).toBe('2028-01-01');
    expect(() => shiftDay('05/02/2027', 1)).toThrowError();
  });

  it('signs an interval by its phase', () => {
    expect(intervalOffset(before)).toBe(-3);
    expect(intervalOffset(onDue)).toBe(0);
    expect(intervalOffset(after)).toBe(7);
  });

  it('places an interval on its day relative to the due date', () => {
    expect(intervalDay(before, DUE)).toBe('2027-02-02');
    expect(intervalDay(onDue, DUE)).toBe(DUE);
    expect(intervalDay(after, DUE)).toBe('2027-02-12');
  });
});

describe('whether a run is due to fire an interval', () => {
  it('fires on the interval day only, by default', () => {
    expect(isIntervalDueOn(onDue, DUE, DUE)).toBe(true);
    expect(isIntervalDueOn(onDue, DUE, '2027-02-04')).toBe(false);
    expect(isIntervalDueOn(onDue, DUE, '2027-02-06')).toBe(false);
    expect(isIntervalDueOn(before, DUE, '2027-02-02')).toBe(true);
    expect(isIntervalDueOn(before, DUE, DUE)).toBe(false);
  });

  it('catches a missed run up to the catch-up window, and no further', () => {
    expect(isIntervalDueOn(onDue, DUE, '2027-02-06', 1)).toBe(true);
    expect(isIntervalDueOn(onDue, DUE, '2027-02-08', 2)).toBe(false);
    expect(isIntervalDueOn(onDue, DUE, '2027-02-08', 3)).toBe(true);
    expect(isIntervalDueOn(onDue, DUE, '2027-02-04', 3)).toBe(false);
  });
});

describe('the default schedule', () => {
  it('is enabled, has the spec ladder and the default window', () => {
    const schedule = defaultReminderSchedule({
      id: 's1',
      institutionId: 'i1',
      name: 'Term fees',
      audience: 'household',
      category: 'fee_reminder',
    });
    expect(schedule.enabled).toBe(true);
    expect(schedule.intervals).toEqual(DEFAULT_INTERVALS);
    expect(schedule.quietHours).toMatchObject({ enabled: true, start: '20:00', end: '07:00' });
    expect(() => validateSchedule(schedule)).not.toThrowError();
  });
});

describe('the validator', () => {
  const base = (): ReminderSchedule =>
    defaultReminderSchedule({
      id: 's1',
      institutionId: 'i1',
      name: 'Term fees',
      audience: 'learner',
      category: 'fee_reminder',
    });

  const refusal = (schedule: ReminderSchedule): string => {
    try {
      validateSchedule(schedule);
    } catch (error) {
      if (isCollectionsError(error)) return error.code;
      throw error;
    }
    return 'no refusal';
  };

  it('refuses a schedule the run could not honour', () => {
    expect(refusal({ ...base(), name: '   ' })).toBe('schedule_invalid');
    expect(refusal({ ...base(), intervals: [] })).toBe('schedule_invalid');
    expect(refusal({ ...base(), channels: [] })).toBe('schedule_invalid');
    expect(
      refusal({ ...base(), intervals: [onDue, { ...onDue, phase: 'after_due', days: 7 }] })
    ).toBe('schedule_invalid');
    expect(refusal({ ...base(), intervals: [{ id: 'x', phase: 'after_due', days: -1 }] })).toBe(
      'schedule_invalid'
    );
    expect(refusal({ ...base(), intervals: [{ id: '', phase: 'on_due', days: 0 }] })).toBe(
      'schedule_invalid'
    );
    expect(
      refusal({ ...base(), quietHours: { ...base().quietHours, start: '8pm' } })
    ).toBe('schedule_invalid');
    expect(
      refusal({ ...base(), quietHours: { ...base().quietHours, timezone: 'Nowhere/Nothing' } })
    ).toBe('schedule_invalid');
    expect(refusal({ ...base(), catchUpDays: -1 })).toBe('schedule_invalid');
    expect(refusal({ ...base(), payLinkTtlDays: 0 })).toBe('schedule_invalid');
  });

  it('accepts a schedule that states an escalation and a floor', () => {
    const schedule: ReminderSchedule = {
      ...base(),
      escalationCategory: 'final_notice',
      catchUpDays: 3,
      minAmountMinor: 500,
      payLinkTtlDays: 7,
      locale: 'en-KE',
      templateIds: { sms: 'tpl-sms-gentle' },
    };
    expect(() => validateSchedule(schedule)).not.toThrowError();
  });
});
