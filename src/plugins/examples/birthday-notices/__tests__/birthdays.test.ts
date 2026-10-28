// ABOUTME: Tests for the example plug-in's birthday arithmetic: next occurrence, age, weekend filter,
// ABOUTME: year rollover, leap day and unusable dates.

import { describe, expect, it } from 'vitest';

import { buildNotice, upcomingBirthdays } from '../birthdays';
import type { LearnerBirthday } from '../birthdays';

const AMINA: LearnerBirthday = {
  learnerId: 'learner-amina',
  firstName: 'Amina',
  lastName: 'Otieno',
  dateOfBirth: '2012-05-25',
};
const BRIAN: LearnerBirthday = {
  learnerId: 'learner-brian',
  firstName: 'Brian',
  lastName: 'Kimani',
  dateOfBirth: '2011-01-03',
};
const CHLOE: LearnerBirthday = {
  learnerId: 'learner-chloe',
  firstName: 'Chloe',
  lastName: 'Mwangi',
  dateOfBirth: '2013-06-01',
};
const UNKNOWN: LearnerBirthday = {
  learnerId: 'learner-unknown',
  firstName: 'Dennis',
  lastName: 'Wafula',
  dateOfBirth: '',
};

const FROM_WEDNESDAY = new Date('2026-05-20T00:00:00.000Z');

describe('upcomingBirthdays', () => {
  it('lists only the learners whose next birthday falls inside the window', () => {
    const notices = upcomingBirthdays([AMINA, BRIAN, CHLOE, UNKNOWN], {
      from: FROM_WEDNESDAY,
      daysAhead: 7,
    });

    expect(notices).toHaveLength(1);
    expect(notices[0].learnerId).toBe(AMINA.learnerId);
    expect(notices[0].date).toBe('2026-05-25');
    expect(notices[0].daysUntil).toBe(5);
    expect(notices[0].turningAge).toBe(14);
  });

  it('orders notices by the days remaining, soonest first', () => {
    const notices = upcomingBirthdays([CHLOE, AMINA], { from: FROM_WEDNESDAY, daysAhead: 30 });

    expect(notices.map((notice) => notice.learnerId)).toEqual([AMINA.learnerId, CHLOE.learnerId]);
  });

  it('counts a birthday today as zero days away', () => {
    const notices = upcomingBirthdays([AMINA], { from: new Date('2026-05-25T00:00:00.000Z'), daysAhead: 1 });

    expect(notices).toHaveLength(1);
    expect(notices[0].daysUntil).toBe(0);
  });

  it('rolls a birthday that already passed over to next year', () => {
    const notices = upcomingBirthdays([BRIAN], {
      from: new Date('2026-12-30T00:00:00.000Z'),
      daysAhead: 7,
    });

    expect(notices).toHaveLength(1);
    expect(notices[0].date).toBe('2027-01-03');
    expect(notices[0].daysUntil).toBe(4);
    expect(notices[0].turningAge).toBe(16);
  });

  it('observes a 29 February birthday on 28 February in a common year', () => {
    const leapling: LearnerBirthday = {
      learnerId: 'learner-leapling',
      firstName: 'Lea',
      lastName: 'Achieng',
      dateOfBirth: '2012-02-29',
    };

    const notices = upcomingBirthdays([leapling], {
      from: new Date('2026-02-27T00:00:00.000Z'),
      daysAhead: 3,
    });

    expect(notices).toHaveLength(1);
    expect(notices[0].date).toBe('2026-02-28');
    expect(notices[0].turningAge).toBe(14);
  });

  it('includes weekend birthdays unless the settings say otherwise', () => {
    const sundayChild: LearnerBirthday = {
      learnerId: 'learner-sunday',
      firstName: 'Sam',
      lastName: 'Njoroge',
      dateOfBirth: '2012-05-24',
    };
    const from = new Date('2026-05-22T00:00:00.000Z');

    expect(upcomingBirthdays([sundayChild], { from, daysAhead: 7 })).toHaveLength(1);
    expect(
      upcomingBirthdays([sundayChild], { from, daysAhead: 7, includeWeekends: false })
    ).toHaveLength(0);
  });

  it('skips a learner whose date of birth is unusable', () => {
    expect(upcomingBirthdays([UNKNOWN], { from: FROM_WEDNESDAY, daysAhead: 365 })).toEqual([]);
  });
});

describe('buildNotice', () => {
  it('formats the notice from the plug-in setting template', () => {
    const notice = buildNotice({
      learner: AMINA,
      occurrenceDate: '2026-05-25',
      daysUntil: 5,
      turningAge: 14,
      template: '{name} turns {age} on {date} ({days} days)',
    });

    expect(notice.message).toBe('Amina Otieno turns 14 on 2026-05-25 (5 days)');
  });

  it('keeps the default template when none is configured', () => {
    const notice = buildNotice({
      learner: AMINA,
      occurrenceDate: '2026-05-25',
      daysUntil: 5,
      turningAge: 14,
    });

    expect(notice.message).toContain('Amina Otieno');
    expect(notice.message).toContain('14');
  });
});
