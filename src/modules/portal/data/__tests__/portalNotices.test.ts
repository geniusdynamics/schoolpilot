// ABOUTME: The notices the portal shows: published, in date and addressed to the viewer's role, each
// ABOUTME: carrying whether this account has read it.

import { describe, expect, it } from 'vitest';

import { PortalAccessError, resolvePortalIdentity } from '../portalAccess';
import { readNotices, noticeIsForViewer } from '../portalNotices';

import { ENROLMENT_A, GUARDIAN, IDS, LEARNER_A, LINK_A, NOTICES } from './fixtures';

const identity = resolvePortalIdentity({
  status: 'ready',
  loginUserId: IDS.login,
  canonicalUser: { id: IDS.canonicalUser, username: 'grace', person_ref: { type: 'guardian', id: GUARDIAN.id } },
  learners: [LEARNER_A],
  enrolments: [ENROLMENT_A],
  classGroups: [],
  guardians: [GUARDIAN],
  learnerGuardians: [LINK_A],
});

const NOW = new Date('2026-02-10T12:00:00.000Z');

describe('the portal notices', () => {
  it('shows a guardian the notices for parents and everyone', () => {
    const notices = readNotices(identity, {
      notices: NOTICES,
      readerId: IDS.canonicalUser,
      now: NOW,
    });

    expect(notices.map((notice) => notice.id)).toEqual([IDS.noticeUnread, IDS.noticeRead]);
  });

  it('shows a learner the notices for students and everyone', () => {
    const notices = readNotices(identity, {
      notices: NOTICES,
      readerId: IDS.canonicalUser,
      now: NOW,
      audience: 'students',
    });

    expect(notices.map((notice) => notice.id)).toEqual([
      IDS.noticeStudents,
      IDS.noticeUnread,
    ]);
  });

  it('marks only the notices this account has read', () => {
    const notices = readNotices(identity, {
      notices: NOTICES,
      readerId: IDS.canonicalUser,
      now: NOW,
    });

    expect(notices.find((notice) => notice.id === IDS.noticeRead)?.read).toBe(true);
    expect(notices.find((notice) => notice.id === IDS.noticeUnread)?.read).toBe(false);
  });

  it('hides an expired notice and an unpublished one', () => {
    const notices = readNotices(identity, {
      notices: [
        ...NOTICES,
        { ...NOTICES[0], id: IDS.noticeExpired, expiresAt: '2026-02-09T00:00:00.000Z' },
        { ...NOTICES[0], id: '00000000-0000-7000-8000-000000007005', isPublished: false },
      ],
      readerId: IDS.canonicalUser,
      now: NOW,
    });

    expect(notices.map((notice) => notice.id)).not.toContain(IDS.noticeExpired);
    expect(notices).toHaveLength(2);
  });

  it('refuses notices for an unlinked account', () => {
    const unlinked = resolvePortalIdentity({
      status: 'ready',
      loginUserId: IDS.login,
      canonicalUser: null,
      learners: [LEARNER_A],
      enrolments: [ENROLMENT_A],
      classGroups: [],
      guardians: [GUARDIAN],
      learnerGuardians: [LINK_A],
    });

    expect(() =>
      readNotices(unlinked, { notices: NOTICES, readerId: IDS.login, now: NOW })
    ).toThrow(PortalAccessError);
  });

  it('tells a class-scoped notice from a school-wide one', () => {
    expect(noticeIsForViewer({ ...NOTICES[1], audience: 'all' }, 'parents')).toBe(true);
    expect(noticeIsForViewer({ ...NOTICES[1], audience: 'parents' }, 'parents')).toBe(true);
    expect(noticeIsForViewer({ ...NOTICES[1], audience: 'students' }, 'parents')).toBe(false);
    expect(noticeIsForViewer({ ...NOTICES[1], audience: 'staff' }, 'parents')).toBe(false);
  });
});
