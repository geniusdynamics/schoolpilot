// ABOUTME: The teacher analytics screen: each staff member's recorded average from the marks in the
// ABOUTME: teaching groups they run. Attendance and grading backlog are shown as not recorded.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AcademicCapIcon,
  ArrowUpIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select, { SelectOption } from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { DashboardMetric } from '@/components/ModuleDashboardShell';

import { AnalyticsEmptyCard, AnalyticsScopeCard } from './AnalyticsScopeCard';
import { useReportAnalyticsScope } from './useReportAnalyticsScope';

interface TeacherRow {
  teacherId: string;
  teacherName: string;
  subjects: string;
  subjectIds: readonly string[];
  classes: string;
  classIds: readonly string[];
  totalStudents: number;
  avgStudentScore: number | null;
  passRate: number | null;
  attendanceRate: number | null;
  gradingBacklog: number | null;
}

const percent = (value: number | null): string => (value === null ? 'Not recorded' : `${value}%`);

const AnalyticsTeacherDashboardPage: React.FC = () => {
  const { t } = useTranslation('analytics');
  const { scopeState, analytics, hasYear, loading, error } = useReportAnalyticsScope('optional');
  const teacherAnalytics = analytics.teacherAnalytics;

  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const allSubjects = useMemo(() => {
    const byId = new Map<string, string>();
    for (const teacher of teacherAnalytics) {
      teacher.subjectIds.forEach((id, index) => byId.set(id, teacher.subjects[index] ?? id));
    }
    return [...byId.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [teacherAnalytics]);

  const allClasses = useMemo(() => {
    const byId = new Map<string, string>();
    for (const teacher of teacherAnalytics) {
      teacher.classIds.forEach((id, index) => byId.set(id, teacher.classNames[index] ?? id));
    }
    return [...byId.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [teacherAnalytics]);

  const teacherRows: TeacherRow[] = useMemo(
    () =>
      teacherAnalytics.map((teacher) => ({
        teacherId: teacher.teacherId,
        teacherName: teacher.teacherName,
        subjects: teacher.subjects.join(', '),
        subjectIds: teacher.subjectIds,
        classes: teacher.classNames.join(', '),
        classIds: teacher.classIds,
        totalStudents: teacher.studentCount,
        avgStudentScore: teacher.averageScore,
        passRate: teacher.passRate,
        attendanceRate: teacher.attendanceRate,
        gradingBacklog: teacher.gradingBacklog,
      })),
    [teacherAnalytics]
  );

  const filteredRows = useMemo(
    () =>
      teacherRows.filter((row) => {
        if (subjectFilter && !row.subjectIds.includes(subjectFilter)) return false;
        if (classFilter && !row.classIds.includes(classFilter)) return false;
        if (searchTerm && !row.teacherName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      }),
    [teacherRows, subjectFilter, classFilter, searchTerm]
  );

  const topTeachers = useMemo(
    () =>
      [...teacherRows]
        .filter((row) => row.avgStudentScore !== null)
        .sort((left, right) => (right.avgStudentScore ?? 0) - (left.avgStudentScore ?? 0))
        .slice(0, 5),
    [teacherRows]
  );

  const stats = useMemo(() => {
    const rated = teacherRows.filter((row) => row.passRate !== null);
    return {
      totalTeachers: teacherRows.length,
      avgPassRate:
        rated.length === 0
          ? null
          : Math.round(rated.reduce((sum, row) => sum + (row.passRate ?? 0), 0) / rated.length),
    };
  }, [teacherRows]);

  const metrics: DashboardMetric[] = [
    {
      key: 'total-teachers',
      label: t('common.totalTeachers') || 'Total Teachers',
      value: stats.totalTeachers,
      icon: <UsersIcon className="h-6 w-6 text-primary-700" />,
    },
    {
      key: 'avg-pass-rate',
      label: t('dashboard.passRate'),
      value: percent(stats.avgPassRate),
      description: stats.avgPassRate === null ? 'No grading scale band marks a pass' : t('dashboard.overview'),
      icon: <CheckCircleIcon className="h-6 w-6 text-emerald-700" />,
    },
    {
      key: 'avg-attendance',
      label: t('dashboard.attendanceRate'),
      value: 'Not recorded',
      description: 'A register names the class, not the teacher of a subject group',
      icon: <AcademicCapIcon className="h-6 w-6 text-violet-700" />,
    },
    {
      key: 'grading-backlog',
      label: t('dashboard.assignmentsGraded'),
      value: 'Not recorded',
      description: 'The canonical record has no assignment or grading queue',
      icon: <BookOpenIcon className="h-6 w-6 text-amber-700" />,
    },
  ];

  const performanceColor = (value: number | null) => {
    if (value === null) return 'bg-surface-accent text-surface-muted-fg';
    if (value >= 80) return 'bg-emerald-100 text-emerald-800';
    if (value >= 60) return 'bg-amber-100 text-amber-800';
    return 'bg-rose-100 text-rose-800';
  };

  const columns: DataGridColumn<TeacherRow>[] = [
    {
      key: 'teacherName',
      header: 'Teacher',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-semibold">
            {value
              .split(' ')
              .map((name) => name[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <span className="font-medium text-surface-foreground">{value}</span>
        </div>
      ),
    },
    { key: 'subjects', header: 'Subjects', sortable: true },
    { key: 'classes', header: 'Classes', sortable: false },
    { key: 'totalStudents', header: 'Students', sortable: true, align: 'center' },
    {
      key: 'avgStudentScore',
      header: 'Avg score',
      sortable: true,
      align: 'center',
      render: (value: number | null) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${performanceColor(value)}`}>{percent(value)}</span>
      ),
    },
    {
      key: 'passRate',
      header: 'Pass rate',
      sortable: true,
      align: 'center',
      render: (value: number | null) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${performanceColor(value)}`}>{percent(value)}</span>
      ),
    },
    {
      key: 'attendanceRate',
      header: 'Attendance',
      sortable: true,
      align: 'center',
      render: (value: number | null) => <span className="text-xs text-surface-muted-fg">{percent(value)}</span>,
    },
    {
      key: 'gradingBacklog',
      header: 'Grading backlog',
      sortable: true,
      align: 'center',
      render: (value: number | null) => (
        <span className="text-xs text-surface-muted-fg">{value === null ? 'Not recorded' : value}</span>
      ),
    },
  ];

  const subjectOptions: SelectOption[] = [
    { value: '', label: 'All subjects' },
    ...allSubjects.map(([value, label]) => ({ value, label })),
  ];

  const classOptions: SelectOption[] = [
    { value: '', label: 'All classes' },
    ...allClasses.map(([value, label]) => ({ value, label })),
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <ModuleDashboardShell
      title={t('dashboard.title')}
      subtitle={t('description')}
      heroIcon={<ChartBarIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
    >
      <AnalyticsScopeCard scope={scopeState} period="optional" />

      {error !== null && (
        <AnalyticsEmptyCard title="Teacher analysis" message="The academic record could not be read, so no teacher figures are shown." />
      )}

      {error === null && !hasYear && (
        <AnalyticsEmptyCard title="Teacher analysis" message="No academic year is set up, so there are no teaching groups to analyse." />
      )}

      {error === null && hasYear && teacherAnalytics.length === 0 && (
        <AnalyticsEmptyCard
          title="Teacher analysis"
          message="No teaching group in this scope names a teacher, so there is no teacher figure to show."
        />
      )}

      {error === null && hasYear && teacherAnalytics.length > 0 && (
        <>
          <Card title="Filters" className="border-slate-200 bg-surface-card shadow-sm">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="relative flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-surface-muted-fg mb-1">Search teacher</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 text-surface-muted-fg absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="min-w-[180px]">
                <label className="block text-xs font-medium text-surface-muted-fg mb-1">Subject</label>
                <Select value={subjectFilter} onValueChange={(value) => setSubjectFilter(String(value))} options={subjectOptions} />
              </div>
              <div className="min-w-[180px]">
                <label className="block text-xs font-medium text-surface-muted-fg mb-1">Class</label>
                <Select value={classFilter} onValueChange={(value) => setClassFilter(String(value))} options={classOptions} />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSubjectFilter('');
                  setClassFilter('');
                }}
              >
                Clear
              </Button>
            </div>
          </Card>

          <Card title="Teacher performance" className="border-slate-200 bg-surface-card shadow-sm">
            <DataGrid columns={columns} data={filteredRows} loading={loading} sortable filterable={false} />
          </Card>

          <Card title="Top performing teachers" className="border-slate-200 bg-surface-card shadow-sm">
            {topTeachers.length === 0 ? (
              <p className="text-sm text-surface-muted-fg">No teacher has a recorded mark in this scope yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topTeachers.map((teacher, index) => (
                  <div
                    key={teacher.teacherId}
                    className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-surface-foreground truncate">{teacher.teacherName}</p>
                      <p className="text-xs text-surface-muted-fg truncate">{teacher.subjects}</p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-700">
                      <ArrowUpIcon className="h-4 w-4" />
                      <span className="text-sm font-semibold">{percent(teacher.avgStudentScore)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </ModuleDashboardShell>
  );
};

export const AnalyticsTeacherDashboardPageContent = AnalyticsTeacherDashboardPage;
export default AnalyticsTeacherDashboardPage;
