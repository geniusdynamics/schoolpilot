// ABOUTME: The attendance the portal shows for one learner in a term: the register marks that belong
// ABOUTME: to that learner, and the summary counted from them.

import { assertLearnerAccess, type PortalIdentity } from './portalAccess';

/** A register mark as the portal shows it. */
export interface PortalAttendanceRecord {
  readonly id: string;
  readonly learnerId: string;
  readonly date: string;
  readonly session: string;
  readonly status: string;
  readonly minutesLate: number | null;
  readonly reason: string | null;
}

/** The term summary the portal shows. */
export interface PortalAttendanceSummary {
  readonly periodId: string;
  readonly periodName: string;
  readonly total: number;
  readonly present: number;
  readonly absent: number;
  readonly late: number;
  readonly excused: number;
  /** Medical, exeat, suspended: not present, and not one of the four the page names. */
  readonly other: number;
  /** Present out of the marks counted, or null when the term has no marks. */
  readonly percentage: number | null;
}

export interface AttendancePeriodSource {
  readonly id: string;
  readonly name: string;
  readonly start_date: string;
  readonly end_date: string;
}

export interface AttendanceSessionSource {
  readonly id: string;
  readonly date: string;
  readonly session: string;
}

export interface AttendanceMarkSource {
  readonly id: string;
  readonly attendance_session_id: string;
  readonly learner_id: string;
  readonly status: string;
  readonly minutes_late?: number;
  readonly reason?: string;
  readonly deleted_at?: string | null;
}

export interface AttendanceSources {
  readonly period: AttendancePeriodSource | null;
  readonly sessions: readonly AttendanceSessionSource[];
  readonly marks: readonly AttendanceMarkSource[];
}

const isLive = (row: { readonly deleted_at?: string | null }): boolean =>
  row.deleted_at === undefined || row.deleted_at === null;

/**
 * The learner's marks inside the term, newest first.
 *
 * A term is the period's own date range, because a register is taken against a date and only some
 * registers carry the period. Marks of other learners on the same register are never returned.
 */
function learnerMarks(
  identity: PortalIdentity,
  learnerId: string,
  sources: AttendanceSources
): readonly (AttendanceMarkSource & { readonly session: AttendanceSessionSource })[] {
  assertLearnerAccess(identity, learnerId);

  const period = sources.period;
  const sessions = new Map(
    sources.sessions
      .filter((session) => {
        if (!period) return true;
        return session.date >= period.start_date && session.date <= period.end_date;
      })
      .map((session) => [session.id, session])
  );

  return sources.marks
    .filter((mark) => mark.learner_id === learnerId && isLive(mark))
    .map((mark) => ({ mark, session: sessions.get(mark.attendance_session_id) }))
    .filter(
      (entry): entry is { mark: AttendanceMarkSource; session: AttendanceSessionSource } =>
        entry.session !== undefined
    )
    .sort((left, right) => right.session.date.localeCompare(left.session.date))
    .map((entry) => ({ ...entry.mark, session: entry.session }));
}

/** The learner's attendance summary for the term. */
export function readAttendanceSummary(
  identity: PortalIdentity,
  learnerId: string,
  sources: AttendanceSources
): PortalAttendanceSummary {
  const rows = learnerMarks(identity, learnerId, sources);
  const count = (status: string): number => rows.filter((row) => row.status === status).length;

  const present = count('present');
  const absent = count('absent');
  const late = count('late');
  const excused = count('excused');
  const other = rows.length - present - absent - late - excused;

  return {
    periodId: sources.period?.id ?? '',
    periodName: sources.period?.name ?? '',
    total: rows.length,
    present,
    absent,
    late,
    excused,
    other,
    percentage: rows.length === 0 ? null : Math.round((present / rows.length) * 100),
  };
}

/** The learner's attendance marks for the term, newest first. */
export function readAttendanceRecords(
  identity: PortalIdentity,
  learnerId: string,
  sources: AttendanceSources
): readonly PortalAttendanceRecord[] {
  return learnerMarks(identity, learnerId, sources).map((row) => ({
    id: row.id,
    learnerId: row.learner_id,
    date: row.session.date,
    session: row.session.session,
    status: row.status,
    minutesLate: row.minutes_late ?? null,
    reason: row.reason ?? null,
  }));
}
