// ABOUTME: The attendance the portal shows: one learner's marks in a term, summarised without counting
// ABOUTME: another learner's register.

import { describe, expect, it } from 'vitest';

import { PortalAccessError, resolvePortalIdentity } from '../portalAccess';
import { readAttendanceRecords, readAttendanceSummary } from '../portalAttendance';

import {
  ENROLMENT_A,
  GUARDIAN,
  IDS,
  LEARNER_A,
  LEARNER_B,
  LINK_A,
  MARK_ABSENT,
  MARK_LATE,
  MARK_OTHER_LEARNER,
  MARK_PRESENT,
  SESSION_ONE,
  SESSION_TWO,
  TERM_ONE,
} from './fixtures';

const identity = resolvePortalIdentity({
  status: 'ready',
  loginUserId: IDS.login,
  canonicalUser: { id: IDS.canonicalUser, username: 'amina', person_ref: { type: 'learner', id: IDS.learnerA } },
  learners: [LEARNER_A, LEARNER_B],
  enrolments: [ENROLMENT_A],
  classGroups: [],
  guardians: [GUARDIAN],
  learnerGuardians: [LINK_A],
});

const sources = {
  period: TERM_ONE,
  sessions: [SESSION_ONE, SESSION_TWO],
  marks: [MARK_PRESENT, MARK_LATE, MARK_ABSENT, MARK_OTHER_LEARNER],
};

describe('the portal attendance', () => {
  it('summarises the term from the learner’s own marks', () => {
    const summary = readAttendanceSummary(identity, IDS.learnerA, sources);

    expect(summary.periodName).toBe('Term 1 2026');
    expect(summary.total).toBe(3);
    expect(summary.present).toBe(1);
    expect(summary.late).toBe(1);
    expect(summary.excused).toBe(1);
    expect(summary.absent).toBe(0);
    expect(summary.percentage).toBe(33);
  });

  it('lists the marks newest first with their session date and status', () => {
    const records = readAttendanceRecords(identity, IDS.learnerA, sources);

    expect(records.map((record) => record.date)).toEqual(['2026-02-03', '2026-02-03', '2026-02-02']);
    expect(records[0].status).toBe('late');
    expect(records.every((record) => record.learnerId === IDS.learnerA)).toBe(true);
  });

  it('reports an empty term rather than a percentage of nothing', () => {
    const summary = readAttendanceSummary(identity, IDS.learnerA, { ...sources, marks: [] });

    expect(summary.total).toBe(0);
    expect(summary.percentage).toBeNull();
  });

  it('ignores a mark for another learner on the same register', () => {
    const summary = readAttendanceSummary(identity, IDS.learnerA, sources);

    expect(summary.absent).toBe(0);
  });

  it('refuses another learner’s attendance', () => {
    expect(() => readAttendanceSummary(identity, IDS.learnerB, sources)).toThrow(PortalAccessError);
    expect(() => readAttendanceRecords(identity, IDS.learnerOther, sources)).toThrow(
      PortalAccessError
    );
  });
});
