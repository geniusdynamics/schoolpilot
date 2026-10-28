// ABOUTME: Read-only view of a saved class register: choose a class and a date, then read the
// ABOUTME: marks the manual entry or dynamic tracker wrote. It never creates or edits a register.
import React, { useEffect, useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import type { RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';
import { AttendanceService } from '@/domain/services';
import { logger } from '@/utils/logging';

import { useCanonicalClassGroups } from '../data/useCanonicalClassGroups';
import { useCanonicalLearners } from '../data/useCanonicalLearners';
import { useWritableRepository } from '../data/useWritableRepository';

interface AttendanceViewRow {
  readonly id: string;
  readonly learner_name: string;
  readonly admission_no: string;
  readonly status: string;
  readonly reason: string;
  readonly minutes_late: string;
}

const today = (): string => new Date().toISOString().slice(0, 10);

const sessionLabel = (session: RepositoryRow<'attendance_session'>): string =>
  `${session.session} · ${session.date}`;

export const StudentAttendanceView: React.FC = () => {
  const repository = useWritableRepository();
  const { classGroups } = useCanonicalClassGroups();
  const { learners } = useCanonicalLearners();

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClass, setSelectedClass] = useState('');
  const [sessions, setSessions] = useState<RepositoryRow<'attendance_session'>[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [marks, setMarks] = useState<RepositoryRow<'attendance_mark'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const learnerById = useMemo(
    () => new Map(learners.map((learner) => [learner.id, learner])),
    [learners]
  );

  useEffect(() => {
    let cancelled = false;
    if (!selectedClass) {
      setSessions([]);
      setSelectedSessionId('');
      setMarks([]);
      return;
    }

    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const page = await repository.list('attendance_session', {
          where: { class_group_id: selectedClass, date: selectedDate },
          limit: 20,
        });
        if (cancelled) return;
        const ordered = [...page.items].sort((left, right) =>
          left.session.localeCompare(right.session)
        );
        setSessions(ordered);
        setSelectedSessionId(ordered[0]?.id ?? '');
      } catch (caught) {
        if (cancelled) return;
        logger.error('Failed to load attendance registers:', caught);
        setError('The attendance registers could not be loaded.');
        setSessions([]);
        setSelectedSessionId('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repository, selectedClass, selectedDate]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedSessionId) {
      setMarks([]);
      return;
    }

    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const service = new AttendanceService({ repository });
        const rows = await service.listMarks(asId<'attendance_session'>(selectedSessionId));
        if (!cancelled) setMarks(rows);
      } catch (caught) {
        if (cancelled) return;
        logger.error('Failed to load attendance marks:', caught);
        setError('The marks of this register could not be loaded.');
        setMarks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repository, selectedSessionId]);

  const rows = useMemo<AttendanceViewRow[]>(
    () =>
      marks.map((mark) => {
        const learner = learnerById.get(mark.learner_id);
        return {
          id: mark.id,
          learner_name: learner?.name ?? mark.learner_id,
          admission_no: learner?.admission_no ?? '—',
          status: mark.status,
          reason: mark.reason ?? '—',
          minutes_late: mark.minutes_late ? `${mark.minutes_late} min` : '—',
        };
      }),
    [marks, learnerById]
  );

  const counts = useMemo(() => {
    const totals = { present: 0, absent: 0, late: 0 };
    for (const mark of marks) {
      if (mark.status === 'present') totals.present += 1;
      else if (mark.status === 'absent') totals.absent += 1;
      else if (mark.status === 'late') totals.late += 1;
    }
    return totals;
  }, [marks]);

  const columns: DataGridColumn<AttendanceViewRow>[] = [
    { key: 'learner_name', header: 'Learner', sortable: true, filterable: true },
    { key: 'admission_no', header: 'Admission No', sortable: true, filterable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => <span className="capitalize">{String(value)}</span>,
    },
    { key: 'reason', header: 'Reason', filterable: true },
    { key: 'minutes_late', header: 'Minutes late', sortable: true },
  ];

  return (
    <Card
      title="Attendance View"
      info="Read a register that was already taken. This view never changes a mark."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="attendance-view-class"
            className="mb-1 block text-sm font-medium text-surface-foreground"
          >
            Class
          </label>
          <select
            id="attendance-view-class"
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
            className="w-full rounded-md border border-surface-border px-3 py-2"
          >
            <option value="">Select a class</option>
            {classGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.display_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="attendance-view-date"
            className="mb-1 block text-sm font-medium text-surface-foreground"
          >
            Date
          </label>
          <input
            id="attendance-view-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="w-full rounded-md border border-surface-border px-3 py-2"
          />
        </div>
        {sessions.length > 1 ? (
          <div>
            <label
              htmlFor="attendance-view-session"
              className="mb-1 block text-sm font-medium text-surface-foreground"
            >
              Register
            </label>
            <select
              id="attendance-view-session"
              value={selectedSessionId}
              onChange={(event) => setSelectedSessionId(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {sessionLabel(session)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {!selectedClass ? (
        <p className="mt-4 text-sm text-surface-muted-fg">
          Select a class and a date to see the register taken that day.
        </p>
      ) : null}

      {selectedClass && !loading && sessions.length === 0 ? (
        <p className="mt-4 text-sm text-surface-muted-fg">
          No register was taken for this class on this date.
        </p>
      ) : null}

      {selectedSessionId ? (
        <>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span>
              Present:{' '}
              <strong data-testid="attendance-view-present">{counts.present}</strong>
            </span>
            <span>
              Absent: <strong data-testid="attendance-view-absent">{counts.absent}</strong>
            </span>
            <span>
              Late: <strong data-testid="attendance-view-late">{counts.late}</strong>
            </span>
          </div>
          <div className="mt-3">
            <DataGrid
              columns={columns}
              data={rows}
              loading={loading}
              sortable
              filterable
              emptyState={
                <div className="py-6 text-center text-sm text-surface-muted-fg">
                  This register has no marks.
                </div>
              }
            />
          </div>
        </>
      ) : null}
    </Card>
  );
};
