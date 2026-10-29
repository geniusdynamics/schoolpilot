// ABOUTME: The portal's React data layer: the signed-in login resolved to its canonical identity, the
// ABOUTME: learner selected in the URL, and one hook per page that reads through the authorising data
// ABOUTME: functions. Pages hold no query of their own, so no page can widen the scope.

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { useCanonicalRepository } from '@/data/canonicalRepository';
import { useEntityQuery } from '@/data/query';
import { MAX_LIMIT, Repository } from '@/data/repository';
import type { QueryRepository } from '@/data/query';
import { resolveNamedCanonicalActor, type SessionIdentity } from '@/data/sessionActor';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useStudentFinancialSummary } from '@/modules/finance/hooks/useStudentFinancialSummary';

import {
  resolvePortalIdentity,
  type PortalIdentity,
  type PortalLearner,
  type PortalRole,
} from './portalAccess';
import { readLearnerBalance, type PortalBalance } from './portalBalances';
import {
  readAttendanceRecords,
  readAttendanceSummary,
  type AttendanceSessionSource,
  type PortalAttendanceRecord,
  type PortalAttendanceSummary,
} from './portalAttendance';
import {
  readConsents,
  saveConsent,
  type ConsentLink,
  type PortalConsent,
} from './portalConsent';
import { readNotices, type NoticeSource, type PortalNotice } from './portalNotices';
import { readTermReports, type PortalTermReport } from './portalReports';
import type { PayLinkOutcome } from './payLink';

const READ_ALL = { limit: MAX_LIMIT } as const;

/** The session as every portal page sees it. */
export interface PortalSession {
  readonly identity: PortalIdentity;
  readonly status: PortalIdentity['status'];
  readonly role: PortalRole | null;
  readonly learners: readonly PortalLearner[];
  readonly selectedLearner: PortalLearner | null;
  readonly selectLearner: (learnerId: string) => void;
  /** The name the page greets: the guardian's own, or the learner's. */
  readonly displayName: string;
  /** The canonical `user` id, the key a notice's read list carries. */
  readonly readerId: string;
  readonly loading: boolean;
  readonly error: string | null;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'The portal could not load.';

/**
 * The canonical repository, typed for writes.
 *
 * The provider hands pages the read half through the query contract; the consent editor writes, so
 * it resolves the same instance as a `Repository` and refuses a read-only double rather than
 * letting a consent change disappear.
 */
function writableRepository(repository: QueryRepository): Repository {
  if (!(repository instanceof Repository)) {
    throw new Error(
      'The portal saves consent through the canonical repository, but the provider handed a read-only one.'
    );
  }
  return repository;
}

function sessionIdentityOf(user: { id: string; username: string; role: string } | null): SessionIdentity {
  return { actorId: user?.id ?? '', username: user?.username ?? null, role: user?.role ?? null };
}

/**
 * The signed-in login, the canonical row it acts as, and the learners it may read.
 *
 * The selected learner lives in the URL (`?learner=<id>`), not in component state, so the child a
 * guardian picks stays picked across pages and a reload, and two hooks on one page cannot disagree
 * about which child is showing.
 */
export function usePortalSession(): PortalSession {
  const { user, isLoading: authLoading } = useAuth();
  const repository = useCanonicalRepository();
  const [params, setParams] = useSearchParams();

  const users = useEntityQuery(repository, 'user', READ_ALL);
  const learners = useEntityQuery(repository, 'learner', READ_ALL);
  const guardians = useEntityQuery(repository, 'guardian', READ_ALL);
  const learnerGuardians = useEntityQuery(repository, 'learner_guardian', READ_ALL);
  const enrolments = useEntityQuery(repository, 'enrolment', READ_ALL);
  const classGroups = useEntityQuery(repository, 'class_group', READ_ALL);

  const queries = [users, learners, guardians, learnerGuardians, enrolments, classGroups];
  const loading =
    authLoading ||
    queries.some((query) => query.status === 'idle' || query.status === 'loading' || !query.data);
  const errorRow = queries.find((query) => query.error);
  const error = errorRow ? messageOf(errorRow.error) : null;

  const canonicalUser = useMemo(
    () => resolveNamedCanonicalActor(users.data?.items ?? [], sessionIdentityOf(user)),
    [users.data, user]
  );

  const identity = useMemo(
    () =>
      resolvePortalIdentity({
        status: loading ? 'loading' : 'ready',
        loginUserId: user?.id ?? '',
        canonicalUser: canonicalUser
          ? { id: canonicalUser.id, username: canonicalUser.username, person_ref: canonicalUser.person_ref }
          : null,
        learners: learners.data?.items ?? [],
        enrolments: enrolments.data?.items ?? [],
        classGroups: classGroups.data?.items ?? [],
        guardians: guardians.data?.items ?? [],
        learnerGuardians: learnerGuardians.data?.items ?? [],
      }),
    [
      loading,
      user,
      canonicalUser,
      learners.data,
      enrolments.data,
      classGroups.data,
      guardians.data,
      learnerGuardians.data,
    ]
  );

  const requested = params.get('learner');
  const selectedLearner =
    identity.learners.find((learner) => learner.id === requested) ?? identity.learners[0] ?? null;

  const selectLearner = useCallback(
    (learnerId: string) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('learner', learnerId);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  return {
    identity,
    status: error ? 'unlinked' : identity.status,
    role: identity.role,
    learners: identity.learners,
    selectedLearner,
    selectLearner,
    displayName: identity.guardianName ?? selectedLearner?.name ?? user?.fullName ?? '',
    readerId: canonicalUser?.id ?? '',
    loading,
    error,
  };
}

/** The selected learner's balance, from the finance module's own summary. */
export function usePortalBalance(): {
  readonly session: PortalSession;
  readonly balance: PortalBalance | null;
  readonly loading: boolean;
  readonly error: string | null;
} {
  const session = usePortalSession();
  const finances = useStudentFinancialSummary();
  const learnerId = session.selectedLearner?.id ?? null;

  const balance = useMemo(() => {
    if (!learnerId || session.status !== 'linked') return null;
    return readLearnerBalance(session.identity, learnerId, finances.data);
  }, [learnerId, session.identity, session.status, finances.data]);

  return {
    session,
    balance,
    loading: session.loading || finances.loading,
    error: session.error ?? (finances.error ? messageOf(finances.error) : null),
  };
}

/** The selected learner's term reports, published cards only. */
export function usePortalReports(): {
  readonly session: PortalSession;
  readonly reports: readonly PortalTermReport[];
  readonly loading: boolean;
  readonly error: string | null;
} {
  const session = usePortalSession();
  const repository = useCanonicalRepository();
  const periods = useEntityQuery(repository, 'academic_period', READ_ALL);
  const enrolments = useEntityQuery(repository, 'enrolment', READ_ALL);
  const reportCards = useEntityQuery(repository, 'report_card', READ_ALL);
  const results = useEntityQuery(repository, 'result', READ_ALL);
  const learningAreas = useEntityQuery(repository, 'learning_area', READ_ALL);

  const queries = [periods, enrolments, reportCards, results, learningAreas];
  const learnerId = session.selectedLearner?.id ?? null;
  const rowsLoading = queries.some((query) => query.status === 'idle' || !query.data);
  const errorRow = queries.find((query) => query.error);

  const reports = useMemo(() => {
    if (!learnerId || session.status !== 'linked') return [];
    return readTermReports(session.identity, learnerId, {
      periods: periods.data?.items ?? [],
      enrolments: enrolments.data?.items ?? [],
      reportCards: reportCards.data?.items ?? [],
      results: results.data?.items ?? [],
      learningAreas: learningAreas.data?.items ?? [],
    });
  }, [
    learnerId,
    session.identity,
    session.status,
    periods.data,
    enrolments.data,
    reportCards.data,
    results.data,
    learningAreas.data,
  ]);

  return {
    session,
    reports,
    loading: session.loading || rowsLoading,
    error: session.error ?? (errorRow ? messageOf(errorRow.error) : null),
  };
}

/** The reporting term in force: the one holding today, else the latest that has started. */
function currentPeriod<T extends { readonly start_date: string; readonly end_date: string }>(
  periods: readonly T[],
  today: string
): T | null {
  const started = periods.filter((period) => period.start_date <= today);
  const containing = started.find((period) => period.end_date >= today);
  if (containing) return containing;
  return [...started].sort((left, right) => right.start_date.localeCompare(left.start_date))[0] ?? null;
}

/** The selected learner's attendance for the term in force. */
export function usePortalAttendance(): {
  readonly session: PortalSession;
  readonly summary: PortalAttendanceSummary | null;
  readonly records: readonly PortalAttendanceRecord[];
  readonly loading: boolean;
  readonly error: string | null;
} {
  const session = usePortalSession();
  const repository = useCanonicalRepository();
  const periods = useEntityQuery(repository, 'academic_period', READ_ALL);
  const sessions = useEntityQuery(repository, 'attendance_session', READ_ALL);
  const marks = useEntityQuery(repository, 'attendance_mark', READ_ALL);

  const learnerId = session.selectedLearner?.id ?? null;
  const queries = [periods, sessions, marks];
  const rowsLoading = queries.some((query) => query.status === 'idle' || !query.data);
  const errorRow = queries.find((query) => query.error);

  const sources = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const reporting = (periods.data?.items ?? []).filter((period) => period.is_reporting);
    return {
      period: currentPeriod(reporting, today),
      sessions: (sessions.data?.items ?? []) as readonly AttendanceSessionSource[],
      marks: marks.data?.items ?? [],
    };
  }, [periods.data, sessions.data, marks.data]);

  const summary = useMemo(() => {
    if (!learnerId || session.status !== 'linked') return null;
    return readAttendanceSummary(session.identity, learnerId, sources);
  }, [learnerId, session.identity, session.status, sources]);

  const records = useMemo(() => {
    if (!learnerId || session.status !== 'linked') return [];
    return readAttendanceRecords(session.identity, learnerId, sources);
  }, [learnerId, session.identity, session.status, sources]);

  return {
    session,
    summary,
    records,
    loading: session.loading || rowsLoading,
    error: session.error ?? (errorRow ? messageOf(errorRow.error) : null),
  };
}

interface AnnouncementRow extends NoticeSource {
  readonly readBy?: string[];
}

/** The notices this viewer may read, with the read state the portal can change. */
export function usePortalNotices(): {
  readonly session: PortalSession;
  readonly notices: readonly PortalNotice[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly markRead: (noticeId: string) => Promise<void>;
} {
  const session = usePortalSession();
  const collection = useDatabaseCollection<AnnouncementRow>('announcements');

  const notices = useMemo(() => {
    if (session.status !== 'linked') return [];
    return readNotices(session.identity, {
      notices: collection.data,
      readerId: session.readerId,
      now: new Date(),
    });
  }, [session.identity, session.status, session.readerId, collection.data]);

  const markRead = useCallback(
    async (noticeId: string) => {
      const notice = collection.data.find((row) => row.id === noticeId);
      if (!notice || !session.readerId) return;
      const readBy = notice.readBy ?? [];
      if (readBy.includes(session.readerId)) return;
      await collection.update(noticeId, { readBy: [...readBy, session.readerId] });
    },
    [collection, session.readerId]
  );

  return {
    session,
    notices,
    loading: session.loading || collection.loading,
    error: session.error ?? (collection.error ? messageOf(collection.error) : null),
    markRead,
  };
}

/** The consent preferences of each child the guardian is linked to. */
export function usePortalConsent(): {
  readonly session: PortalSession;
  readonly consents: readonly PortalConsent[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly save: (input: {
    consent: PortalConsent;
    receivesReports: boolean;
    receivesSms: boolean;
    preferredChannel: string;
    preferredLanguage: string;
  }) => Promise<void>;
} {
  const session = usePortalSession();
  const repository = useCanonicalRepository();
  const links = useEntityQuery(repository, 'learner_guardian', READ_ALL);

  const consents = useMemo(() => {
    if (session.role !== 'guardian') return [];
    return readConsents(session.identity, (links.data?.items ?? []) as readonly ConsentLink[]);
  }, [session.role, session.identity, links.data]);

  const save = useCallback(
    async (input: {
      consent: PortalConsent;
      receivesReports: boolean;
      receivesSms: boolean;
      preferredChannel: string;
      preferredLanguage: string;
    }) => {
      const link = links.data?.items.find((row) => row.id === input.consent.linkId);
      if (!link) throw new Error('That consent record no longer exists.');
      await saveConsent(writableRepository(repository), session.identity, {
        link: link as ConsentLink,
        receivesReports: input.receivesReports,
        receivesSms: input.receivesSms,
        preferredChannel: input.preferredChannel,
        preferredLanguage: input.preferredLanguage,
        actorId: session.readerId || undefined,
      });
      await links.refetch();
    },
    [links, repository, session.identity, session.readerId]
  );

  return {
    session,
    consents,
    loading: session.loading || links.status === 'idle' || !links.data,
    error: session.error ?? (links.error ? messageOf(links.error) : null),
    save,
  };
}

export type { PayLinkOutcome };
