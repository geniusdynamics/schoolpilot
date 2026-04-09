import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AcademicCapIcon,
  ChartBarIcon,
  UsersIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
} from '@/components/ui/icons';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select, { SelectOption } from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { DashboardMetric } from '@/components/ModuleDashboardShell';
import { useAnalyticsData } from '../../data/useAnalyticsData';

interface TeacherRow {
  teacherId: string;
  teacherName: string;
  subjects: string;
  classes: string;
  totalStudents: number;
  avgStudentScore: number;
  passRate: number;
  attendanceRate: number;
  assignmentsGiven: number;
  gradingBacklog: number;
}

const AnalyticsTeacherDashboardPage: React.FC = () => {
  const { t } = useTranslation('analytics');
  const { teacherAnalytics, loading } = useAnalyticsData();

  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Gather unique subjects and classes for filters
  const allSubjects = useMemo(() => {
    const subjects = new Set<string>();
    (teacherAnalytics || []).forEach((ta) => {
      (ta.topicsCovered || []).forEach((s) => subjects.add(s));
      if (ta.subjectName) subjects.add(ta.subjectName);
    });
    return Array.from(subjects).sort();
  }, [teacherAnalytics]);

  const allClasses = useMemo(() => {
    const classes = new Set<string>();
    (teacherAnalytics || []).forEach((ta) => {
      (ta.classPerformance || []).forEach((cp) => classes.add(cp.className));
    });
    return Array.from(classes).sort();
  }, [teacherAnalytics]);

  // Build DataGrid rows
  const teacherRows: TeacherRow[] = useMemo(() => {
    return (teacherAnalytics || []).map((ta) => ({
      teacherId: ta.teacherId,
      teacherName: ta.teacherName,
      subjects: ta.subjectName || (ta.topicsCovered || []).slice(0, 3).join(', '),
      classes: (ta.classPerformance || []).map((c) => c.className).slice(0, 3).join(', '),
      totalStudents: (ta.classPerformance || []).reduce((sum, c) => sum + c.studentCount, 0),
      avgStudentScore: Math.round(
        (ta.classPerformance || []).length > 0
          ? (ta.classPerformance || []).reduce((sum, c) => sum + c.averageScore, 0) / (ta.classPerformance || []).length
          : 0
      ),
      passRate: Math.round(
        (ta.passRates || []).length > 0
          ? (ta.passRates || []).reduce((sum, p) => sum + p.passRate, 0) / (ta.passRates || []).length
          : 0
      ),
      attendanceRate: Math.round(ta.attendanceRate || 0),
      assignmentsGiven: ta.assignmentsCreated || 0,
      gradingBacklog: (ta.assignmentsCreated || 0) - (ta.assignmentsGraded || 0),
    }));
  }, [teacherAnalytics]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return teacherRows.filter((row) => {
      if (subjectFilter && !row.subjects.toLowerCase().includes(subjectFilter.toLowerCase())) return false;
      if (classFilter && !row.classes.toLowerCase().includes(classFilter.toLowerCase())) return false;
      if (searchTerm && !row.teacherName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [teacherRows, subjectFilter, classFilter, searchTerm]);

  // Top performing teachers
  const topTeachers = useMemo(() => {
    return [...teacherRows].sort((a, b) => b.passRate - a.passRate).slice(0, 5);
  }, [teacherRows]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalTeachers = (teacherAnalytics || []).length;
    const avgPassRate =
      teacherRows.length > 0
        ? Math.round(teacherRows.reduce((sum, r) => sum + r.passRate, 0) / teacherRows.length)
        : 0;
    const avgAttendance =
      teacherRows.length > 0
        ? Math.round(teacherRows.reduce((sum, r) => sum + r.attendanceRate, 0) / teacherRows.length)
        : 0;
    const totalBacklog = teacherRows.reduce((sum, r) => sum + r.gradingBacklog, 0);
    return { totalTeachers, avgPassRate, avgAttendance, totalBacklog };
  }, [teacherRows, teacherAnalytics]);

  const metrics: DashboardMetric[] = [
    {
      key: 'total-teachers',
      label: t('common.totalTeachers') || 'Total Teachers',
      value: stats.totalTeachers,
      icon: <UsersIcon className="h-6 w-6 text-blue-700" />,
    },
    {
      key: 'avg-pass-rate',
      label: t('dashboard.passRate'),
      value: `${stats.avgPassRate}%`,
      description: t('dashboard.overview'),
      icon: <CheckCircleIcon className="h-6 w-6 text-emerald-700" />,
    },
    {
      key: 'avg-attendance',
      label: t('dashboard.attendanceRate'),
      value: `${stats.avgAttendance}%`,
      icon: <AcademicCapIcon className="h-6 w-6 text-violet-700" />,
    },
    {
      key: 'grading-backlog',
      label: t('dashboard.assignmentsGraded'),
      value: stats.totalBacklog,
      description: stats.totalBacklog > 0 ? t('dashboard.assignmentsGraded') + ' pending' : 'All caught up',
      icon: <BookOpenIcon className="h-6 w-6 text-amber-700" />,
    },
  ];

  const performanceColor = (value: number) => {
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
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold">
            {value.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <span className="font-medium text-gray-900">{value}</span>
        </div>
      ),
    },
    { key: 'subjects', header: 'Subjects', sortable: true },
    { key: 'classes', header: 'Classes', sortable: false },
    { key: 'totalStudents', header: 'Students', sortable: true, align: 'center' },
    {
      key: 'avgStudentScore',
      header: 'Avg Score',
      sortable: true,
      align: 'center',
      render: (value: number) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${performanceColor(value)}`}>
          {value}%
        </span>
      ),
    },
    {
      key: 'passRate',
      header: 'Pass Rate',
      sortable: true,
      align: 'center',
      render: (value: number) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${performanceColor(value)}`}>
          {value}%
        </span>
      ),
    },
    {
      key: 'attendanceRate',
      header: 'Attendance',
      sortable: true,
      align: 'center',
      render: (value: number) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${performanceColor(value)}`}>
          {value}%
        </span>
      ),
    },
    {
      key: 'gradingBacklog',
      header: 'Grading Backlog',
      sortable: true,
      align: 'center',
      render: (value: number) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${value > 5 ? 'bg-rose-100 text-rose-800' : value > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {value}
        </span>
      ),
    },
  ];

  const subjectOptions: SelectOption[] = [
    { value: '', label: 'All Subjects' },
    ...allSubjects.map((s) => ({ value: s, label: s })),
  ];

  const classOptions: SelectOption[] = [
    { value: '', label: 'All Classes' },
    ...allClasses.map((c) => ({ value: c, label: c })),
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
      {/* Filters */}
      <Card title="Filters" className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search Teacher</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
            <Select
              value={subjectFilter}
              onChange={(val) => setSubjectFilter(val as string)}
              options={subjectOptions}
            />
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <Select
              value={classFilter}
              onChange={(val) => setClassFilter(val as string)}
              options={classOptions}
            />
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

      {/* Teacher Performance Table */}
      <Card
        title="Teacher Performance"
        className="border-slate-200 bg-white shadow-sm"
      >
        <DataGrid
          columns={columns}
          data={filteredRows}
          loading={loading}
          sortable
          filterable={false}
        />
      </Card>

      {/* Top Performing Teachers */}
      <Card
        title="Top Performing Teachers"
        className="border-slate-200 bg-white shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topTeachers.map((teacher, idx) => (
            <div
              key={teacher.teacherId}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                #{idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{teacher.teacherName}</p>
                <p className="text-xs text-gray-500 truncate">{teacher.subjects}</p>
              </div>
              <div className="flex items-center gap-1 text-emerald-700">
                <ArrowUpIcon className="h-4 w-4" />
                <span className="text-sm font-semibold">{teacher.passRate}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ModuleDashboardShell>
  );
};

export default AnalyticsTeacherDashboardPage;
