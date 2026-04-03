import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import {
  AcademicCapIcon,
  BellIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  PlusIcon,
  TableCellsIcon,
  UserGroupIcon,
  UsersIcon
} from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import ModuleDashboardShell, { DashboardMetric, DashboardNotification, DashboardPanel, DashboardQuickAction } from '@/components/ModuleDashboardShell';

type DashboardRole = 'administrator' | 'teacher' | 'student' | 'parent' | 'general';

type MetricCard = {
  key: string;
  title: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
};

type NavSection = {
  key: string;
  label: string;
  description: string;
  path: string;
  icon: React.ReactNode;
};

type QuickAction = {
  key: string;
  label: string;
  path: string;
};

const parseDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const DashboardPage: React.FC = () => {
  const {
    students,
    staff,
    studentAttendance,
    schoolPeriods,
    campaigns,
    templatesComm,
    studentExamResults,
    studentInvoices,
    studentPayments,
    loading,
    syncStatus,
    isOnline
  } = useAppData();
  const { t } = useTranslation('dashboard');
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [canViewDashboard, setCanViewDashboard] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const hasAccess = await hasPermission('dashboard.view');
        setCanViewDashboard(hasAccess);
      } catch {
        setCanViewDashboard(false);
      } finally {
        setCheckingPermission(false);
      }
    };

    checkPermission();
  }, [hasPermission, user]);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const roleType: DashboardRole = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    if (role.includes('admin') || role.includes('principal') || role.includes('finance')) {
      return 'administrator';
    }
    if (role.includes('teacher')) {
      return 'teacher';
    }
    if (role.includes('student')) {
      return 'student';
    }
    if (role.includes('parent') || role.includes('guardian')) {
      return 'parent';
    }
    return 'general';
  }, [user?.role]);

  const attendanceSummary = useMemo(() => {
    const records = studentAttendance || [];
    if (records.length === 0) {
      return { percent: 0, present: 0, total: 0 };
    }

    const presentStatuses = new Set(['present', 'on_time', 'attended', 'in_class']);
    const present = records.filter((record: any) => {
      const statusValue = String(
        record?.status || record?.attendanceStatus || record?.state || ''
      ).toLowerCase();
      return presentStatuses.has(statusValue);
    }).length;

    const percent = Number(((present / records.length) * 100).toFixed(1));
    return { percent, present, total: records.length };
  }, [studentAttendance]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return (schoolPeriods || [])
      .map((period: any) => {
        const start = parseDate(period?.startDate || period?.start_date || period?.start || period?.dateFrom);
        const end = parseDate(period?.endDate || period?.end_date || period?.end || period?.dateTo);
        return {
          id: String(period?.id ?? `${period?.name ?? 'period'}-${period?.period_number ?? ''}`),
          title: String(period?.name || period?.period_name || period?.title || t('eventFallback', 'Academic event')),
          start,
          end
        };
      })
      .filter((event) => event.start && event.start >= now)
      .sort((a, b) => (a.start!.getTime() - b.start!.getTime()))
      .slice(0, 4);
  }, [schoolPeriods, t]);

  const recentAnnouncements = useMemo(() => {
    const campaignAnnouncements = (campaigns || []).map((campaign: any) => ({
      id: String(campaign?.id ?? `campaign-${campaign?.name ?? ''}`),
      title: String(campaign?.name || campaign?.title || t('announcementFallback', 'Campaign update')),
      details: String(campaign?.description || campaign?.message || t('announcementDetailsFallback', 'No details available')),
      updatedAt: parseDate(campaign?.updatedAt || campaign?.updated_at || campaign?.createdAt || campaign?.created_at)
    }));

    const templateAnnouncements = (templatesComm || []).map((template: any) => ({
      id: String(template?.id ?? `template-${template?.name ?? ''}`),
      title: String(template?.name || template?.title || t('announcementFallback', 'Communication update')),
      details: String(template?.content || template?.body || template?.description || t('announcementDetailsFallback', 'No details available')),
      updatedAt: parseDate(template?.updatedAt || template?.updated_at || template?.createdAt || template?.created_at)
    }));

    return [...campaignAnnouncements, ...templateAnnouncements]
      .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))
      .slice(0, 4);
  }, [campaigns, templatesComm, t]);

  const enrollmentTrendData = useMemo(() => {
    const monthLabels = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString(undefined, { month: 'short' }),
        total: 0
      };
    });

    const byMonth = new Map(monthLabels.map((month) => [month.key, month]));
    (students || []).forEach((student: any) => {
      const created = parseDate(student?.createdAt || student?.created_at || student?.admissionDate || student?.admission_date);
      if (!created) {
        return;
      }
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      if (byMonth.has(key)) {
        byMonth.get(key)!.total += 1;
      }
    });

    return monthLabels.map((month, index, array) => ({
      name: month.label,
      enrolled: month.total,
      cumulative:
        index === 0 ? month.total : array.slice(0, index + 1).reduce((sum, item) => sum + item.total, 0)
    }));
  }, [students]);

  const performanceAnalyticsData = useMemo(() => {
    const buckets = [
      { name: t('belowBasic', 'Below 50%'), learners: 0 },
      { name: t('developing', '50% - 69%'), learners: 0 },
      { name: t('proficient', '70% - 84%'), learners: 0 },
      { name: t('advanced', '85%+'), learners: 0 }
    ];

    (studentExamResults || []).forEach((result: any) => {
      const scoreCandidates = [
        result?.average_mark,
        result?.averageMark,
        result?.percentage,
        result?.total_percentage,
        result?.finalScore
      ];
      const score = scoreCandidates.find((candidate) => typeof candidate === 'number' && Number.isFinite(candidate));
      if (typeof score !== 'number') {
        return;
      }
      if (score < 50) {
        buckets[0].learners += 1;
      } else if (score < 70) {
        buckets[1].learners += 1;
      } else if (score < 85) {
        buckets[2].learners += 1;
      } else {
        buckets[3].learners += 1;
      }
    });

    return buckets;
  }, [studentExamResults, t]);

  const financialSummaryData = useMemo(() => {
    const monthLabels = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        name: date.toLocaleDateString(undefined, { month: 'short' }),
        billed: 0,
        collected: 0
      };
    });

    const byMonth = new Map(monthLabels.map((month) => [month.key, month]));

    (studentInvoices || []).forEach((invoice: any) => {
      const date = parseDate(invoice?.invoiceDate || invoice?.invoice_date || invoice?.createdAt || invoice?.created_at);
      const amount = Number(invoice?.grand_total || invoice?.total_amount || invoice?.total || 0);
      if (!date || !Number.isFinite(amount)) {
        return;
      }
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (byMonth.has(key)) {
        byMonth.get(key)!.billed += amount;
      }
    });

    (studentPayments || []).forEach((payment: any) => {
      const date = parseDate(payment?.paymentDate || payment?.payment_date || payment?.createdAt || payment?.created_at);
      const amount = Number(payment?.amount_paid || payment?.amount || payment?.paidAmount || 0);
      if (!date || !Number.isFinite(amount)) {
        return;
      }
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (byMonth.has(key)) {
        byMonth.get(key)!.collected += amount;
      }
    });

    return monthLabels;
  }, [studentInvoices, studentPayments]);

  const outstandingBalance = useMemo(() => {
    const billed = financialSummaryData.reduce((sum, month) => sum + month.billed, 0);
    const collected = financialSummaryData.reduce((sum, month) => sum + month.collected, 0);
    return Math.max(0, billed - collected);
  }, [financialSummaryData]);

  const metricCards: MetricCard[] = useMemo(() => ([
    {
      key: 'students',
      title: t('totalStudents', 'Total Students'),
      value: String((students || []).length),
      subtext: t('activeEnrollment', 'Active enrollment'),
      icon: <UsersIcon className="h-6 w-6 text-blue-700" />
    },
    {
      key: 'faculty',
      title: t('facultyCount', 'Faculty Count'),
      value: String((staff || []).length),
      subtext: t('teachingSupportStaff', 'Teaching and support staff'),
      icon: <UserGroupIcon className="h-6 w-6 text-emerald-700" />
    },
    {
      key: 'attendance',
      title: t('attendanceRate', 'Attendance Rate'),
      value: `${attendanceSummary.percent}%`,
      subtext: t('studentsPresentToday', '{{present}} of {{total}} present today', {
        present: attendanceSummary.present,
        total: attendanceSummary.total
      }),
      icon: <CheckCircleIcon className="h-6 w-6 text-teal-700" />
    },
    {
      key: 'events',
      title: t('upcomingEvents', 'Upcoming Events'),
      value: String(upcomingEvents.length),
      subtext: t('eventsScheduledAhead', 'Scheduled for this week'),
      icon: <CalendarDaysIcon className="h-6 w-6 text-indigo-700" />
    },
    {
      key: 'announcements',
      title: t('recentAnnouncements', 'Recent Announcements'),
      value: String(recentAnnouncements.length),
      subtext: t('newMessagesAndUpdates', 'New messages and updates'),
      icon: <BellIcon className="h-6 w-6 text-sky-700" />
    }
  ]), [t, students, staff, attendanceSummary, upcomingEvents.length, recentAnnouncements.length]);

  const navigationSections: NavSection[] = useMemo(() => ([
    {
      key: 'students',
      label: t('studentManagement', 'Student Management'),
      description: t('manageProfilesAdmissions', 'Profiles, admissions, guardians, and records'),
      path: '/administration/students',
      icon: <UsersIcon className="h-5 w-5 text-blue-700" />
    },
    {
      key: 'attendance',
      label: t('attendanceTracking', 'Attendance Tracking'),
      description: t('monitorPresencePatterns', 'Daily registers, trends, and interventions'),
      path: '/administration/student-attendance',
      icon: <CalendarDaysIcon className="h-5 w-5 text-emerald-700" />
    },
    {
      key: 'gradebooks',
      label: t('gradeBooks', 'Grade Books'),
      description: t('assessmentsAndOutcomes', 'Assessments, grading schemes, and outcomes'),
      path: '/academics/exam-analysis',
      icon: <BookOpenIcon className="h-5 w-5 text-teal-700" />
    },
    {
      key: 'scheduling',
      label: t('scheduling', 'Scheduling'),
      description: t('timetablesExamsAndSessions', 'Timetables, exam sessions, and periods'),
      path: '/academics/timetable-entries',
      icon: <TableCellsIcon className="h-5 w-5 text-cyan-700" />
    },
    {
      key: 'analytics',
      label: t('analytics', 'Analytics'),
      description: t('insightsForLeadership', 'Enrollment, finance, and performance insights'),
      path: '/reports',
      icon: <ChartBarIcon className="h-5 w-5 text-indigo-700" />
    }
  ]), [t]);

  const quickActionsByRole: Record<DashboardRole, QuickAction[]> = useMemo(() => ({
    administrator: [
      { key: 'add-student', label: t('addStudent', 'Add Student'), path: '/administration/students/add' },
      { key: 'assign-staff', label: t('manageStaff', 'Manage Staff'), path: '/administration/staff' },
      { key: 'run-report', label: t('generateReport', 'Generate Report'), path: '/reports' }
    ],
    teacher: [
      { key: 'take-attendance', label: t('recordAttendance', 'Record Attendance'), path: '/administration/student-attendance' },
      { key: 'create-assignment', label: t('createAssignment', 'Create Assignment'), path: '/academics/teacher-subject-assignments' },
      { key: 'gradebook', label: t('openGradeBook', 'Open Grade Book'), path: '/academics/student-exam-results-entry' }
    ],
    student: [
      { key: 'my-timetable', label: t('viewTimetable', 'View Timetable'), path: '/academics/timetable-entries' },
      { key: 'my-results', label: t('viewResults', 'View Results'), path: '/academics/exam-analysis' },
      { key: 'my-notices', label: t('viewNotices', 'View Notices'), path: '/administration/message-campaigns' }
    ],
    parent: [
      { key: 'child-attendance', label: t('childAttendance', 'Child Attendance'), path: '/administration/student-attendance' },
      { key: 'fee-statement', label: t('feeStatement', 'Fee Statement'), path: '/finance/student-payments' },
      { key: 'messages', label: t('schoolMessages', 'School Messages'), path: '/administration/message-campaigns' }
    ],
    general: [
      { key: 'students', label: t('studentsOverview', 'Students Overview'), path: '/administration/students' },
      { key: 'attendance', label: t('attendanceOverview', 'Attendance Overview'), path: '/administration/student-attendance' },
      { key: 'reports', label: t('reportsOverview', 'Reports Overview'), path: '/reports' }
    ]
  }), [t]);

  const notifications: DashboardNotification[] = useMemo(() => {
    const items = [
      {
        id: 'sync-state',
        title: t('syncStatus', 'Sync Status'),
        message: syncStatus.state === 'syncing'
          ? t('syncInProgress', 'Data synchronization is running.')
          : t('syncIdle', 'Data is up to date.'),
        severity: syncStatus.state === 'error' ? 'high' : 'normal'
      },
      {
        id: 'network-state',
        title: t('networkStatus', 'Network Status'),
        message: isOnline ? t('onlineConnected', 'You are connected and receiving live updates.') : t('offlineMode', 'You are offline. Changes will sync when connection returns.'),
        severity: isOnline ? 'normal' : 'high'
      },
      {
        id: 'attendance-alert',
        title: t('attendanceWatch', 'Attendance Watch'),
        message: attendanceSummary.percent < 85
          ? t('attendanceNeedsAttention', 'Attendance is below 85%. Review at-risk classes.')
          : t('attendanceHealthy', 'Attendance is healthy across tracked classes.'),
        severity: attendanceSummary.percent < 85 ? 'high' : 'normal'
      }
    ];

    return items;
  }, [t, syncStatus.state, isOnline, attendanceSummary.percent]);

  if (checkingPermission) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!canViewDashboard) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-14">
        <h2 className="text-2xl font-semibold text-slate-800">
          {t('noDashboardPermissionTitle', 'Dashboard Access Restricted')}
        </h2>
        <p className="max-w-2xl text-center text-slate-600">
          {t('noDashboardPermissionMessage', 'You do not have permission to view this dashboard. Contact your administrator for access.')}
        </p>
      </div>
    );
  }

  if (loading.students || loading.staff || loading.studentAttendance || loading.schoolPeriods || loading.all) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const quickActions = quickActionsByRole[roleType];
  const shellMetrics: DashboardMetric[] = metricCards.map((metric) => ({
    key: metric.key,
    label: metric.title,
    value: metric.value,
    description: metric.subtext,
    icon: metric.icon,
  }));
  const shellQuickActions: DashboardQuickAction[] = quickActions.map((action) => ({
    key: action.key,
    label: action.label,
    to: action.path,
    icon: <PlusIcon className="h-4 w-4" />,
    variant: 'outline',
  }));
  const currencyFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const chartPanels: DashboardPanel[] = [
    {
      key: 'enrollment-trends',
      title: t('enrollmentTrends', 'Enrollment Trends'),
      content: (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={enrollmentTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ee" />
            <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 12 }} />
            <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="enrolled" stroke="#2563eb" strokeWidth={2.5} name={t('newEnrollments', 'New Enrollments')} />
            <Line type="monotone" dataKey="cumulative" stroke="#0f766e" strokeWidth={2.5} name={t('cumulative', 'Cumulative')} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      key: 'performance-analytics',
      title: t('performanceAnalytics', 'Performance Analytics'),
      content: (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={performanceAnalyticsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ee" />
            <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 12 }} />
            <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="learners" name={t('students', 'Students')} fill="#0ea5e9" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      key: 'financial-summary',
      title: t('financialSummary', 'Financial Summary'),
      content: (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={financialSummaryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ee" />
              <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 12 }} />
              <YAxis tickFormatter={(value) => currencyFormatter.format(value)} tick={{ fill: '#334155', fontSize: 12 }} />
              <Tooltip formatter={(value: any) => currencyFormatter.format(Number(value || 0))} />
              <Legend />
              <Area type="monotone" dataKey="billed" stroke="#1d4ed8" fill="#93c5fd" fillOpacity={0.5} name={t('billedAmount', 'Billed Amount')} />
              <Area type="monotone" dataKey="collected" stroke="#047857" fill="#86efac" fillOpacity={0.4} name={t('paidAmount', 'Paid Amount')} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-slate-600">
            {t('outstandingBalance', 'Outstanding balance')}: <span className="font-semibold text-slate-900">{currencyFormatter.format(outstandingBalance)}</span>
          </p>
        </>
      ),
    },
  ];

  return (
    <ModuleDashboardShell
      title={user?.fullName ? t('welcomeBack', { interpolation: { name: user.fullName } }) : t('welcomeBackDefault', 'Welcome back!')}
      subtitle={`${t('dashboardSubtitle', 'Monitor academics, attendance, finance, and communication from one decision-ready dashboard.')} ${t('lastUpdated', 'Last updated')}: ${currentTime.toLocaleString()}`}
      heroIcon={<AcademicCapIcon className="h-8 w-8 text-white" />}
      metrics={shellMetrics}
      quickActions={shellQuickActions}
      charts={chartPanels}
      notifications={notifications}
    >
      <section className="grid grid-cols-1 gap-4">
        <Card
          title={t('navigationHub', 'Navigation Hub')}
          className="border-slate-200 bg-white shadow-sm"
          bodyClassName="space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {navigationSections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => navigate(section.path)}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                aria-label={section.label}
              >
                <div className="mb-2 flex items-center gap-2">
                  {section.icon}
                  <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                </div>
                <p className="text-xs text-slate-600">{section.description}</p>
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title={t('upcomingEvents', 'Upcoming Events')} className="border-slate-200 bg-white shadow-sm">
          <ul className="space-y-3" aria-label={t('upcomingEvents', 'Upcoming Events')}>
            {upcomingEvents.length === 0 && (
              <li className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {t('noUpcomingEvents', 'No upcoming events scheduled.')}
              </li>
            )}
            {upcomingEvents.map((event) => (
              <li key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                <p className="mt-1 text-xs text-slate-600">{event.start?.toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t('recentAnnouncements', 'Recent Announcements')} className="border-slate-200 bg-white shadow-sm">
          <ul className="space-y-3" aria-label={t('recentAnnouncements', 'Recent Announcements')}>
            {recentAnnouncements.length === 0 && (
              <li className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {t('noAnnouncements', 'No recent announcements yet.')}
              </li>
            )}
            {recentAnnouncements.map((announcement) => (
              <li key={announcement.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{announcement.details}</p>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <AcademicCapIcon className="h-5 w-5 text-blue-700" />
          <p className="font-medium">{t('roleViewLabel', 'Current Role View')}: {roleType}</p>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          {t('roleViewMessage', 'Content and actions adapt to each role to support secure, relevant decision-making.')}
        </p>
      </section>
    </ModuleDashboardShell>
  );
};

export default DashboardPage;
