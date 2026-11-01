// ABOUTME: Monthly attendance report over the canonical attendance sessions and marks, with class and stream filters.
// ABOUTME: The report pages every session and mark in the month, so a large school is not truncated at one repository page.

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { CalendarIcon, ChartBarIcon, DocumentTextIcon, UserIcon } from '@/components/ui/icons';
import type { RepositoryRow } from '@/data/repository';
import { listAll } from '@/data/listAll';

import { useCanonicalRepository } from '../data/canonicalRepository';
import { useCanonicalLearners } from '../data/useCanonicalLearners';
import type { AttendanceReport } from '../data/types';

interface Bucket {
  present: number;
  absent: number;
  late: number;
  total: number;
}

const emptyBucket = (): Bucket => ({ present: 0, absent: 0, late: 0, total: 0 });

export const AttendanceReportsContent: React.FC = () => {
  const repository = useCanonicalRepository();
  const { learners, isLoading: learnersLoading, classGroupRows } = useCanonicalLearners();

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sessions, setSessions] = useState<RepositoryRow<'attendance_session'>[]>([]);
  const [marks, setMarks] = useState<RepositoryRow<'attendance_mark'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((current) => current + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const start = `${selectedMonth}-01`;
        const end = `${selectedMonth}-31`;
        const nextSessions = await listAll(repository, 'attendance_session', {
          conditions: { date: { greaterThanOrEqual: start, lessThanOrEqual: end } },
          orderBy: [{ field: 'date', direction: 'asc' }],
        });
        const sessionIds = nextSessions.map((session) => session.id);
        const nextMarks: RepositoryRow<'attendance_mark'>[] = [];
        for (let index = 0; index < sessionIds.length; index += 500) {
          const chunk = sessionIds.slice(index, index + 500);
          nextMarks.push(
            ...(await listAll(repository, 'attendance_mark', {
              conditions: { attendance_session_id: { in: chunk } },
            }))
          );
        }
        if (!cancelled) {
          setSessions(nextSessions);
          setMarks(nextMarks);
        }
      } catch (caught) {
        if (!cancelled) {
          setSessions([]);
          setMarks([]);
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [repository, selectedMonth, reloadToken]);

  const learnerById = useMemo(
    () => new Map(learners.map((learner) => [learner.id, learner] as const)),
    [learners]
  );

  const buckets = useMemo(() => {
    const byLearner = new Map<string, Bucket>();
    for (const mark of marks) {
      const learnerId = mark.learner_id;
      if (!learnerId) continue;
      let bucket = byLearner.get(learnerId);
      if (!bucket) {
        bucket = emptyBucket();
        byLearner.set(learnerId, bucket);
      }
      bucket.total += 1;
      if (mark.status === 'present') bucket.present += 1;
      else if (mark.status === 'late') bucket.late += 1;
      else bucket.absent += 1;
    }
    return byLearner;
  }, [marks]);

  const reports = useMemo<AttendanceReport[]>(() => {
    const year = parseInt(selectedMonth.slice(0, 4), 10) || new Date().getFullYear();
    const term = searchTerm.trim().toLowerCase();
    const rows: AttendanceReport[] = [];

    for (const [studentId, bucket] of buckets) {
      const learner = learnerById.get(studentId);
      if (selectedClass && learner?.current_class_name !== selectedClass) continue;
      if (selectedStream && learner?.current_class_stream_name !== selectedStream) continue;
      if (term) {
        const name = learner?.display_name.toLowerCase() ?? '';
        const admission = learner?.admission_no.toLowerCase() ?? '';
        if (!name.includes(term) && !admission.includes(term)) continue;
      }
      rows.push({
        id: `${studentId}-${selectedMonth}`,
        student_id: studentId,
        student_name: learner?.display_name ?? 'Unknown learner',
        admission_no: learner?.admission_no ?? '—',
        class_id: learner?.class_group_id ?? '',
        class_name: learner?.current_class_name || '—',
        stream_name: learner?.current_class_stream_name || '—',
        month: selectedMonth,
        year,
        total_days: bucket.total,
        present_days: bucket.present,
        absent_days: bucket.absent,
        late_days: bucket.late,
        percentage: bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 1000) / 10 : 0,
      });
    }

    return rows.sort(
      (a, b) =>
        a.class_name.localeCompare(b.class_name) ||
        a.stream_name.localeCompare(b.stream_name) ||
        a.student_name.localeCompare(b.student_name)
    );
  }, [buckets, learnerById, selectedMonth, selectedClass, selectedStream, searchTerm]);

  const classOptions = useMemo(
    () =>
      [...new Set(learners.map((learner) => learner.current_class_name).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [learners]
  );

  const streamOptions = useMemo(() => {
    const scoped = selectedClass
      ? learners.filter((learner) => learner.current_class_name === selectedClass)
      : learners;
    return [...new Set(scoped.map((learner) => learner.current_class_stream_name).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [learners, selectedClass]);

  const totals = useMemo(
    () => ({
      total_students: reports.length,
      avg_percentage:
        reports.length > 0 ? reports.reduce((sum, report) => sum + report.percentage, 0) / reports.length : 0,
      total_present: reports.reduce((sum, report) => sum + report.present_days, 0),
      total_absent: reports.reduce((sum, report) => sum + report.absent_days, 0),
    }),
    [reports]
  );

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const columns: DataGridColumn<AttendanceReport>[] = [
    {
      key: 'student_name',
      header: 'Student Name',
      sortable: true,
      filterable: false,
    },
    { key: 'admission_no', header: 'Admission No', sortable: true, filterable: false },
    { key: 'class_name', header: 'Class', sortable: true, filterable: false },
    { key: 'stream_name', header: 'Stream', sortable: true, filterable: false },
    {
      key: 'month',
      header: 'Month',
      sortable: true,
      filterable: false,
      render: (value: string) =>
        new Date(`${value}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    },
    { key: 'total_days', header: 'Total Days', sortable: true, filterable: false },
    {
      key: 'present_days',
      header: 'Present',
      sortable: true,
      filterable: false,
      render: (value: number) => <span className="font-semibold text-green-600">{value}</span>,
    },
    {
      key: 'absent_days',
      header: 'Absent',
      sortable: true,
      filterable: false,
      render: (value: number) => <span className="font-semibold text-red-600">{value}</span>,
    },
    {
      key: 'late_days',
      header: 'Late',
      sortable: true,
      filterable: false,
      render: (value: number) => <span className="font-semibold text-yellow-600">{value}</span>,
    },
    {
      key: 'percentage',
      header: 'Attendance %',
      sortable: true,
      filterable: false,
      render: (value: number) => (
        <span className={`font-semibold ${getPercentageColor(value)}`}>{value.toFixed(1)}%</span>
      ),
    },
    {
      key: 'actions',
      header: 'View',
      sortable: false,
      filterable: false,
      render: (_value, row) => (
        <a
          href={`/administration/students/${row.student_id}`}
          className="text-sm font-medium text-primary-700 hover:underline"
        >
          View student
        </a>
      ),
    },
  ];

  if ((learnersLoading || loading) && reports.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
        <span className="ml-2">Loading attendance reports...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="h-6 w-6 text-violet-600" />
            <span>Attendance Reports</span>
          </div>
        }
        info="Monthly attendance from the registers, filterable by class and stream. Every learner in the month's marks is listed; open a learner to see their full profile."
        actions={
          <Button variant="secondary" onClick={reload} disabled={loading}>
            Refresh
          </Button>
        }
      >
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <UserIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Total Students</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-surface-foreground">{totals.total_students}</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <ChartBarIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Avg Attendance</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-600">{totals.avg_percentage.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CalendarIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Total Present</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-600">{totals.total_present}</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center gap-2 text-surface-muted-fg">
              <CalendarIcon className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium">Total Absent</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-600">{totals.total_absent}</p>
          </div>
        </div>

        {error ? (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="mb-6 flex flex-wrap gap-4">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm font-medium text-surface-foreground">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm font-medium text-surface-foreground">Class</label>
            <select
              value={selectedClass}
              onChange={(event) => {
                setSelectedClass(event.target.value);
                setSelectedStream('');
              }}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All Classes</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm font-medium text-surface-foreground">Stream</label>
            <select
              value={selectedStream}
              onChange={(event) => setSelectedStream(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All Streams</option>
              {streamOptions.map((stream) => (
                <option key={stream} value={stream}>
                  {stream}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm font-medium text-surface-foreground">Search</label>
            <input
              type="text"
              placeholder="Student, admission..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </div>
        </div>

        <p className="mb-2 text-xs text-surface-muted-fg">
          {sessions.length} register{sessions.length === 1 ? '' : 's'} · {marks.length} mark
          {marks.length === 1 ? '' : 's'} in {selectedMonth}
          {classGroupRows.length > 0 ? ` · ${classGroupRows.length} class streams` : ''}
        </p>

        <DataGrid
          data={reports}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 25 }}
          sortable
          filterable={false}
          emptyState={{
            title: 'No attendance marks for this month',
            description: 'Take a register first, or change the month and filters.',
          }}
        />
      </Card>
    </div>
  );
};

const AttendanceReportsPage: React.FC = () => (
  <div className="space-y-3">
    <AttendanceReportsContent />
  </div>
);

export default AttendanceReportsPage;
