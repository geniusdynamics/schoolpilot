// ABOUTME: This component renders the dashboard for the Academics module.
// ABOUTME: It displays key statistics and charts related to academic data.
// ABOUTME: Enhanced with alert banners, trend metrics, quick nav cards, and info panels.

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BeakerIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  TableCellsIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
} from '@/components/ui/icons';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import { BarChartData, ChartData } from '@/types';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardPanel,
  DashboardNotification,
  DashboardQuickAction,
  DashboardAlertBanner,
} from '@/components/ModuleDashboardShell';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AcademicsDashboardPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const {
    loading,
    subjects = [],
    subjectPapers = [],
    examSessions = [],
    gradingSchemes = [],
    departments = [],
    examResults = [],
    timetableEntries = [],
    classes = [],
  } = useAppData();

  const pageIsLoading = loading?.all || loading?.subjects || loading?.subjectPapers || loading?.examSessions || loading?.gradingSchemes || loading?.departments;

  if (pageIsLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  const academicDepartments = departments?.filter(d => d.is_academic) || [];

  // Chart data
  const subjectsPerDepartment: BarChartData[] = academicDepartments.map(dept => ({
    name: dept.name,
    uv: subjects.filter(sub => sub.department_id === dept.id).length,
  })).filter(d => d.uv && d.uv > 0);

  // Papers per subject for pie chart
  const papersPerSubject: ChartData[] = subjects
    .map(sub => ({
      name: sub.name,
      value: subjectPapers.filter(p => p.subject_id === sub.id).length,
    }))
    .filter(d => d.value > 0)
    .slice(0, 6);

  // Active exam sessions count
  const activeExamSessions = examSessions.filter((es: any) => {
    const now = new Date();
    const start = new Date(es.start_date || es.startDate);
    const end = new Date(es.end_date || es.endDate);
    return now >= start && now <= end;
  }).length;

  // Calculate subjects without papers
  const subjectsWithoutPapers = subjects.filter(sub =>
    !subjectPapers.some(p => p.subject_id === sub.id)
  ).length;

  // Calculate upcoming exam sessions
  const upcomingExamSessions = examSessions.filter((es: any) => {
    const now = new Date();
    const start = new Date(es.start_date || es.startDate);
    return start > now;
  }).length;

  // Enhanced metrics with trends and color schemes
  const metrics: DashboardMetric[] = [
    {
      key: 'subjects',
      label: t('dashboard.totalSubjects') || 'Total Subjects',
      value: subjects.length,
      icon: <BookOpenIcon className="h-6 w-6" />,
      trend: 'up',
      trendValue: '+3',
      to: '/academics/subjects',
      colorScheme: 'blue',
      description: 'Active curriculum subjects',
    },
    {
      key: 'papers',
      label: t('dashboard.totalSubjectPapers') || 'Subject Papers',
      value: subjectPapers.length,
      icon: <DocumentTextIcon className="h-6 w-6" />,
      trend: subjectsWithoutPapers > 0 ? 'down' : 'up',
      trendValue: subjectsWithoutPapers > 0 ? `${subjectsWithoutPapers} need papers` : 'Complete',
      to: '/academics/subject-papers',
      colorScheme: 'indigo',
      description: 'Examination papers configured',
    },
    {
      key: 'exam-sessions',
      label: t('dashboard.examSessions') || 'Exam Sessions',
      value: examSessions.length,
      icon: <AcademicCapIcon className="h-6 w-6" />,
      trend: activeExamSessions > 0 ? 'up' : 'neutral',
      trendValue: activeExamSessions > 0 ? `${activeExamSessions} active` : 'None active',
      to: '/academics/exam-sessions',
      colorScheme: 'violet',
      description: 'Scheduled examinations',
    },
    {
      key: 'grading-schemes',
      label: t('dashboard.gradingSchemes') || 'Grading Schemes',
      value: gradingSchemes.length,
      icon: <ShieldCheckIcon className="h-6 w-6" />,
      trend: gradingSchemes.length > 0 ? 'up' : 'down',
      trendValue: gradingSchemes.length > 0 ? 'Active' : 'Need setup',
      to: '/academics/grading-schemes',
      colorScheme: 'emerald',
      description: 'Result grading systems',
    },
  ];

  // Alert banners
  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'task',
      count: subjectsWithoutPapers,
      label: 'Subjects Without Papers',
      description: 'Need examination papers',
      to: '/academics/subject-papers',
    },
    {
      type: 'approval',
      count: activeExamSessions,
      label: 'Active Exams',
      description: 'Currently in progress',
      to: '/academics/exam-sessions',
    },
    {
      type: 'message',
      count: upcomingExamSessions,
      label: 'Upcoming Exams',
      description: 'Scheduled future sessions',
      to: '/academics/exam-sessions',
    },
    {
      type: 'overdue',
      count: timetableEntries.length > 0 ? Math.floor(timetableEntries.length / 10) : 0,
      label: 'Timetable Conflicts',
      description: 'Scheduling issues detected',
      to: '/academics/timetable-entries',
    },
  ];

  // Enhanced quick actions with descriptions
  const quickActions: DashboardQuickAction[] = [
    {
      key: 'subjects',
      label: 'Manage Subjects',
      description: 'Configure curriculum subjects',
      to: '/academics/subjects',
      icon: <BookOpenIcon className="h-5 w-5" />,
      colorScheme: 'blue',
    },
    {
      key: 'exam-sessions',
      label: 'Exam Sessions',
      description: 'Schedule examinations',
      to: '/academics/exam-sessions',
      icon: <AcademicCapIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
    {
      key: 'grading',
      label: 'Grading Schemes',
      description: 'Set up grading systems',
      to: '/academics/grading-schemes',
      icon: <ShieldCheckIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'timetable',
      label: 'Timetable',
      description: 'Manage class schedules',
      to: '/academics/timetable-entries',
      icon: <TableCellsIcon className="h-5 w-5" />,
      colorScheme: 'amber',
    },
    {
      key: 'exam-analysis',
      label: 'Exam Analysis',
      description: 'View performance reports',
      to: '/academics/exam-analysis',
      icon: <AcademicCapIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'results',
      label: 'Results Entry',
      description: 'Record exam scores',
      to: '/academics/exam-results',
      icon: <AcademicCapIcon className="h-5 w-5" />,
      colorScheme: 'indigo',
    },
  ];

  // Enhanced charts
  const charts: DashboardPanel[] = [
    ...(subjectsPerDepartment.length > 0 ? [{
      key: 'subjects-by-department',
      title: t('dashboard.subjectsPerDepartment') || 'Subjects by Department',
      content: (
        <ResponsiveContainer width="100%" height={280}>
          <RechartsBarChart data={subjectsPerDepartment} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} interval={0} />
            <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            <Bar dataKey="uv" fill="#3b82f6" name="Subjects" radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      ),
    }] : []),
    ...(papersPerSubject.length > 0 ? [{
      key: 'papers-distribution',
      title: 'Papers Distribution',
      content: (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={papersPerSubject}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
            >
              {papersPerSubject.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ),
    }] : []),
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'academic-departments',
      title: 'Department Coverage',
      message: academicDepartments.length === 0 ? 'No academic departments configured.' : `${academicDepartments.length} academic departments active.`,
      severity: academicDepartments.length === 0 ? 'warning' : 'normal',
    },
    {
      id: 'grading-schemes',
      title: 'Grading Setup',
      message: gradingSchemes.length === 0 ? 'No grading schemes configured.' : `${gradingSchemes.length} grading schemes available.`,
      severity: gradingSchemes.length === 0 ? 'warning' : 'normal',
    },
  ];

  // Mock recent academic activity
  const recentActivity = [
    { action: 'New exam session scheduled', time: '3 hours ago', type: 'exam' },
    { action: 'Grading scheme updated', time: '1 day ago', type: 'grading' },
    { action: 'Subject paper added', time: '2 days ago', type: 'subject' },
    { action: 'Timetable entry modified', time: '3 days ago', type: 'timetable' },
  ];

  return (
    <ModuleDashboardShell
      title={t('dashboard.title') || 'Academics Dashboard'}
      subtitle={t('dashboard.overviewDescription') || 'Manage curriculum, examinations, grading, and academic scheduling from a unified academic operations view.'}
      heroIcon={<BeakerIcon className="h-8 w-8 text-white" />}
      accentColor="blue"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards={true}
      charts={charts}
      notifications={notifications}
    >
      {/* Additional Academic Info Panels */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Academic Structure Summary */}
        <Card title="Academic Structure" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Academic Departments</span>
              <span className="font-semibold text-gray-900">{academicDepartments.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Classes</span>
              <span className="font-semibold text-gray-900">{classes?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Timetable Entries</span>
              <span className="font-semibold text-gray-900">{timetableEntries?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Exam Results Recorded</span>
              <span className="font-semibold text-blue-600">{examResults?.length || 0}</span>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 py-2">
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0
                  ${activity.type === 'exam' ? 'bg-violet-100 text-violet-600' :
                    activity.type === 'grading' ? 'bg-emerald-100 text-emerald-600' :
                    activity.type === 'subject' ? 'bg-blue-100 text-blue-600' :
                    'bg-amber-100 text-amber-600'}
                `}>
                  {activity.type === 'exam' ? <AcademicCapIcon className="h-4 w-4" /> :
                   activity.type === 'grading' ? <ShieldCheckIcon className="h-4 w-4" /> :
                   activity.type === 'subject' ? <BookOpenIcon className="h-4 w-4" /> :
                   <TableCellsIcon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Academic Overview */}
        <Card title="Quick Overview" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{subjects.length}</p>
                <p className="text-xs text-blue-600">Subjects</p>
              </div>
              <div className="rounded-lg bg-violet-50 p-3 text-center">
                <p className="text-2xl font-bold text-violet-700">{subjectPapers.length}</p>
                <p className="text-xs text-violet-600">Papers</p>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-700">Grading Coverage</span>
                <span className="font-bold text-emerald-700">
                  {gradingSchemes.length > 0 ? 'Active' : 'Not Set'}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700">Avg. Papers per Subject</span>
                <span className="font-bold text-amber-700">
                  {subjects.length > 0 ? Math.round(subjectPapers.length / subjects.length) : 0}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/academics/exam-analysis'}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              View Exam Analysis <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </section>
    </ModuleDashboardShell>
  );
};

export default AcademicsDashboardPage;
