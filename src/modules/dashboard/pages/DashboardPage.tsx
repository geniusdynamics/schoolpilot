import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppData } from '@/hooks/useAppData';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';
import { AlertBanner, StatCard, ChartCard, ProgressRing, CalendarWidget } from '../components';
import {
  AcademicCapIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  UsersIcon,
  UserGroupIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  BuildingLibraryIcon,
  PlusIcon,
  ArrowRightIcon,
  MegaphoneIcon,
  TableCellsIcon,
} from '@/components/ui/icons';

type DashboardRole = 'administrator' | 'teacher' | 'student' | 'parent' | 'general';

// ============================================================================
// Helper Functions
// ============================================================================
const parseDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatCurrency = (value: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

// ============================================================================
// Main Dashboard Component
// ============================================================================
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
    isOnline,
  } = useAppData();
  
  const { t } = useTranslation('dashboard');
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  
  const [canViewDashboard, setCanViewDashboard] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Check permissions
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

  // Determine user role
  const roleType: DashboardRole = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    if (role.includes('admin') || role.includes('principal') || role.includes('finance')) {
      return 'administrator';
    }
    if (role.includes('teacher')) return 'teacher';
    if (role.includes('student')) return 'student';
    if (role.includes('parent') || role.includes('guardian')) return 'parent';
    return 'general';
  }, [user?.role]);

  // ============================================================================
  // Data Computations
  // ============================================================================
  
  // Attendance summary
  const attendanceSummary = useMemo(() => {
    const records = studentAttendance || [];
    if (records.length === 0) return { percent: 0, present: 0, total: 0 };
    
    const presentStatuses = new Set(['present', 'on_time', 'attended', 'in_class']);
    const present = records.filter((record: any) => {
      const status = String(record?.status || record?.attendanceStatus || record?.state || '').toLowerCase();
      return presentStatuses.has(status);
    }).length;
    
    return {
      percent: Number(((present / records.length) * 100).toFixed(1)),
      present,
      total: records.length,
    };
  }, [studentAttendance]);

  // Gender distribution
  const genderDistribution = useMemo(() => {
    const male = (students || []).filter((s: any) => s?.gender?.toLowerCase() === 'male').length;
    const female = (students || []).filter((s: any) => s?.gender?.toLowerCase() === 'female').length;
    const other = (students || []).length - male - female;
    return { male, female, other, total: (students || []).length };
  }, [students]);

  // Department distribution (mock data for demo - can be connected to real data)
  const departmentData = useMemo(() => [
    { name: 'Sciences', value: 450, color: '#3b82f6' },
    { name: 'Arts', value: 320, color: '#10b981' },
    { name: 'Commerce', value: 280, color: '#f59e0b' },
    { name: 'Technical', value: 200, color: '#8b5cf6' },
    { name: 'Languages', value: 150, color: '#ec4899' },
  ], []);

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return (schoolPeriods || [])
      .map((period: any) => ({
        id: String(period?.id ?? `${period?.name ?? 'period'}-${period?.period_number ?? ''}`),
        title: String(period?.name || period?.period_name || period?.title || t('eventFallback', 'Academic event')),
        start: parseDate(period?.startDate || period?.start_date || period?.start || period?.dateFrom),
        end: parseDate(period?.endDate || period?.end_date || period?.end || period?.dateTo),
        type: period?.type || 'academic',
      }))
      .filter((event) => event.start && event.start >= now)
      .sort((a, b) => (a.start!.getTime() - b.start!.getTime()))
      .slice(0, 5);
  }, [schoolPeriods, t]);

  // Recent announcements
  const recentAnnouncements = useMemo(() => {
    const campaignAnnouncements = (campaigns || []).map((campaign: any) => ({
      id: String(campaign?.id ?? `campaign-${campaign?.name ?? ''}`),
      title: String(campaign?.name || campaign?.title || t('announcementFallback', 'Campaign update')),
      details: String(campaign?.description || campaign?.message || t('announcementDetailsFallback', 'No details available')),
      updatedAt: parseDate(campaign?.updatedAt || campaign?.updated_at || campaign?.createdAt || campaign?.created_at),
      type: 'campaign',
      priority: campaign?.priority || 'normal',
    }));

    const templateAnnouncements = (templatesComm || []).map((template: any) => ({
      id: String(template?.id ?? `template-${template?.name ?? ''}`),
      title: String(template?.name || template?.title || t('announcementFallback', 'Communication update')),
      details: String(template?.content || template?.body || template?.description || t('announcementDetailsFallback', 'No details available')),
      updatedAt: parseDate(template?.updatedAt || template?.updated_at || template?.createdAt || template?.created_at),
      type: 'template',
      priority: 'normal',
    }));

    return [...campaignAnnouncements, ...templateAnnouncements]
      .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))
      .slice(0, 5);
  }, [campaigns, templatesComm, t]);

  // Enrollment trends
  const enrollmentTrendData = useMemo(() => {
    const monthLabels = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString(undefined, { month: 'short' }),
        total: 0,
      };
    });

    const byMonth = new Map(monthLabels.map((month) => [month.key, month]));
    (students || []).forEach((student: any) => {
      const created = parseDate(student?.createdAt || student?.created_at || student?.admissionDate || student?.admission_date);
      if (!created) return;
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      if (byMonth.has(key)) {
        byMonth.get(key)!.total += 1;
      }
    });

    return monthLabels.map((month, index, array) => ({
      name: month.label,
      enrolled: month.total,
      cumulative: index === 0 ? month.total : array.slice(0, index + 1).reduce((sum, item) => sum + item.total, 0),
    }));
  }, [students]);

  // Performance analytics
  const performanceAnalyticsData = useMemo(() => [
    { name: t('belowBasic', 'Below 50%'), learners: 0, color: '#ef4444' },
    { name: t('developing', '50% - 69%'), learners: 0, color: '#f59e0b' },
    { name: t('proficient', '70% - 84%'), learners: 0, color: '#3b82f6' },
    { name: t('advanced', '85%+'), learners: 0, color: '#10b981' },
  ], [t]);

  // Calculate actual performance data
  useMemo(() => {
    (studentExamResults || []).forEach((result: any) => {
      const scoreCandidates = [
        result?.average_mark,
        result?.averageMark,
        result?.percentage,
        result?.total_percentage,
        result?.finalScore,
      ];
      const score = scoreCandidates.find((c) => typeof c === 'number' && Number.isFinite(c));
      if (typeof score !== 'number') return;
      if (score < 50) performanceAnalyticsData[0].learners += 1;
      else if (score < 70) performanceAnalyticsData[1].learners += 1;
      else if (score < 85) performanceAnalyticsData[2].learners += 1;
      else performanceAnalyticsData[3].learners += 1;
    });
  }, [studentExamResults, performanceAnalyticsData]);

  // Financial summary
  const financialSummaryData = useMemo(() => {
    const monthLabels = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        name: date.toLocaleDateString(undefined, { month: 'short' }),
        billed: 0,
        collected: 0,
      };
    });

    const byMonth = new Map(monthLabels.map((month) => [month.key, month]));

    (studentInvoices || []).forEach((invoice: any) => {
      const date = parseDate(invoice?.invoiceDate || invoice?.invoice_date || invoice?.createdAt || invoice?.created_at);
      const amount = Number(invoice?.grand_total || invoice?.total_amount || invoice?.total || 0);
      if (!date || !Number.isFinite(amount)) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (byMonth.has(key)) {
        byMonth.get(key)!.billed += amount;
      }
    });

    (studentPayments || []).forEach((payment: any) => {
      const date = parseDate(payment?.paymentDate || payment?.payment_date || payment?.createdAt || payment?.created_at);
      const amount = Number(payment?.amount_paid || payment?.amount || payment?.paidAmount || 0);
      if (!date || !Number.isFinite(amount)) return;
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

  // Reported students data (mock - can be connected to discipline module)
  const reportedStudentsData = useMemo(() => [
    { month: 'Jan', male: 12, female: 8 },
    { month: 'Feb', male: 15, female: 10 },
    { month: 'Mar', male: 18, female: 12 },
    { month: 'Apr', male: 10, female: 6 },
    { month: 'May', male: 22, female: 15 },
    { month: 'Jun', male: 14, female: 9 },
    { month: 'Jul', male: 8, female: 5 },
    { month: 'Aug', male: 16, female: 11 },
    { month: 'Sep', male: 20, female: 14 },
  ], []);

  // Subject registration stats
  const subjectRegistrationStats = useMemo(() => {
    const total = (students || []).length;
    const registered = Math.floor(total * 0.75); // Mock: 75% registered
    const notRegistered = total - registered;
    return { registered, notRegistered, total };
  }, [students]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

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

  return (
    <div className="min-h-screen bg-gray-50/50 pb-8">
      {/* ============================================================================
          HERO SECTION
      ============================================================================ */}
      {/* Compact Welcome Banner */}
      <section className="relative overflow-hidden rounded-b-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-4 py-4 text-white shadow-md sm:px-6">
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                <AcademicCapIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                  {user?.fullName ? t('welcomeBack', { name: user.fullName }) : t('welcomeBackDefault', 'Welcome back!')}
                </h1>
                <p className="text-xs text-blue-100">
                  {t('dashboardSubtitle', 'Monitor academics, attendance, finance, and communication.')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                <p className="text-xs text-blue-200">{t('lastUpdated', 'Last updated')}</p>
                <p className="text-xs font-medium">{currentTime.toLocaleString()}</p>
              </div>
              <div className={`rounded-lg px-3 py-1.5 backdrop-blur-sm ${isOnline ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-xs font-medium">{isOnline ? t('online', 'Online') : t('offline', 'Offline')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <PageContainer>
        <section className="mt-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quick Navigation
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { 
                key: 'students', 
                label: t('studentManagement', 'Student Management'), 
                desc: t('manageProfilesAdmissions', 'Profiles, admissions, guardians, and records'),
                path: '/administration/students',
                icon: <UsersIcon className="h-5 w-5" />,
                color: 'blue',
              },
              { 
                key: 'attendance', 
                label: t('attendanceTracking', 'Attendance Tracking'), 
                desc: t('monitorPresencePatterns', 'Daily registers, trends, and interventions'),
                path: '/administration/student-attendance',
                icon: <CalendarDaysIcon className="h-5 w-5" />,
                color: 'emerald',
              },
              { 
                key: 'gradebooks', 
                label: t('gradeBooks', 'Grade Books'), 
                desc: t('assessmentsAndOutcomes', 'Assessments, grading schemes, and outcomes'),
                path: '/academics/exam-analysis',
                icon: <BookOpenIcon className="h-5 w-5" />,
                color: 'violet',
              },
              { 
                key: 'scheduling', 
                label: t('scheduling', 'Scheduling'), 
                desc: t('timetablesExamsAndSessions', 'Timetables, exam sessions, and periods'),
                path: '/academics/timetable-entries',
                icon: <TableCellsIcon className="h-5 w-5" />,
                color: 'amber',
              },
              { 
                key: 'finance', 
                label: t('finance', 'Finance'), 
                desc: t('feeCollectionInvoices', 'Fee collection, invoices, and payments'),
                path: '/finance/student-payments',
                icon: <CurrencyDollarIcon className="h-5 w-5" />,
                color: 'cyan',
              },
              { 
                key: 'analytics', 
                label: t('analytics', 'Analytics'), 
                desc: t('insightsForLeadership', 'Enrollment, finance, and performance insights'),
                path: '/reports',
                icon: <ChartBarIcon className="h-5 w-5" />,
                color: 'indigo',
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.path)}
                className={`
                  flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left
                  transition-all duration-200 hover:shadow-md hover:border-${item.color}-200 hover:bg-${item.color}-50
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-${item.color}-500
                `}
              >
                <div className={`
                  flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg
                  bg-${item.color}-100 text-${item.color}-600
                `}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{item.label}</p>
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{item.desc}</p>
                </div>
                <ArrowRightIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
              </button>
            ))}
          </div>
        </section>

        {/* Alert Banners - New Messages, Tasks, etc */}
        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AlertBanner
            type="message"
            count={recentAnnouncements.length}
            label={t('newMessages', 'New Messages')}
            description={t('importantMessages', 'Important messages for you')}
            to="/administration/message-campaigns"
          />
          <AlertBanner
            type="task"
            count={15}
            label={t('pendingTasks', 'Pending Tasks')}
            description={t('tasksAwaiting', 'Tasks awaiting action')}
            to="/administration/tasks"
          />
          <AlertBanner
            type="overdue"
            count={5}
            label={t('overdueTasks', 'Overdue Tasks')}
            description={t('requiresAttention', 'Requires immediate attention')}
            to="/administration/tasks?filter=overdue"
          />
          <AlertBanner
            type="approval"
            count={14}
            label={t('approvalsPending', 'Approvals Pending')}
            description={t('awaitingApproval', 'Awaiting your approval')}
            to="/administration/approvals"
          />
        </section>

        {/* ============================================================================
            KEY STATISTICS ROW
        ============================================================================ */}
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('totalStudents', 'Total Students')}
            value={(students || []).length.toLocaleString()}
            subtitle={t('activeEnrollment', 'Active enrollment')}
            icon={<UsersIcon className="h-6 w-6" />}
            trend="up"
            trendValue="12%"
            colorScheme="blue"
            to="/administration/students"
          />
          <StatCard
            title={t('facultyCount', 'Faculty Count')}
            value={(staff || []).length.toLocaleString()}
            subtitle={t('teachingSupportStaff', 'Teaching & support staff')}
            icon={<UserGroupIcon className="h-6 w-6" />}
            trend="neutral"
            trendValue="0%"
            colorScheme="emerald"
            to="/administration/staff"
          />
          <StatCard
            title={t('attendanceRate', 'Attendance Rate')}
            value={`${attendanceSummary.percent}%`}
            subtitle={t('studentsPresentToday', '{{present}} of {{total}} present', { present: attendanceSummary.present, total: attendanceSummary.total })}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            trend={attendanceSummary.percent >= 85 ? 'up' : 'down'}
            trendValue={`${attendanceSummary.percent >= 85 ? '+' : '-'}${Math.abs(attendanceSummary.percent - 85).toFixed(1)}%`}
            colorScheme={attendanceSummary.percent >= 85 ? 'cyan' : 'amber'}
            to="/administration/student-attendance"
          />
          <StatCard
            title={t('feeCollection', 'Fee Collection')}
            value={formatCurrency(financialSummaryData.reduce((sum, m) => sum + m.collected, 0))}
            subtitle={t('outstandingBalance', 'Outstanding: {{amount}}', { amount: formatCurrency(outstandingBalance) })}
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            trend="up"
            trendValue="8.5%"
            colorScheme="violet"
            to="/finance/student-payments"
          />
        </section>

        {/* ============================================================================
            UPCOMING EVENTS, ANNOUNCEMENTS & CALENDAR SECTION
        ============================================================================ */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Upcoming Events */}
          <Card
            title={t('upcomingEvents', 'Upcoming Events')}
            className="border-gray-200 shadow-sm"
            icon={<CalendarDaysIcon className="h-5 w-5 text-blue-600" />}
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate('/academics/timetable-entries')}>
                {t('viewAll', 'View All')}
              </Button>
            }
          >
            <ul className="space-y-3" aria-label={t('upcomingEvents', 'Upcoming Events')}>
              {upcomingEvents.length === 0 && (
                <li className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 text-center">
                  {t('noUpcomingEvents', 'No upcoming events scheduled.')}
                </li>
              )}
              {upcomingEvents.map((event, index) => (
                <li
                  key={event.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-colors hover:bg-gray-100"
                >
                  <div className={`
                    flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg
                    ${index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}
                  `}>
                    <CalendarDaysIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                    <p className="text-xs text-gray-500">{event.start?.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                  {index === 0 && (
                    <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {t('soon', 'Soon')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          {/* Recent Announcements */}
          <Card
            title={t('recentAnnouncements', 'Recent Announcements')}
            className="border-gray-200 shadow-sm"
            icon={<MegaphoneIcon className="h-5 w-5 text-violet-600" />}
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate('/administration/message-campaigns')}>
                {t('viewAll', 'View All')}
              </Button>
            }
          >
            <ul className="space-y-3" aria-label={t('recentAnnouncements', 'Recent Announcements')}>
              {recentAnnouncements.length === 0 && (
                <li className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 text-center">
                  {t('noAnnouncements', 'No recent announcements yet.')}
                </li>
              )}
              {recentAnnouncements.map((announcement) => (
                <li
                  key={announcement.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-colors hover:bg-gray-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{announcement.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-600">{announcement.details}</p>
                    </div>
                    {announcement.priority === 'high' && (
                      <span className="flex-shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                        {t('urgent', 'Urgent')}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    {announcement.updatedAt?.toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          {/* Calendar Widget */}
          <CalendarWidget
            events={upcomingEvents.map(event => ({
              date: event.start || new Date(),
              title: event.title,
              type: 'event'
            }))}
            onAddEvent={() => navigate('/academics/timetable-entries')}
          />
        </section>

        {/* ============================================================================
            FORM PERFORMANCE SUMMARIES
        ============================================================================ */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <ChartBarIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{t('formPerformance', 'Form Performance Summaries')}</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Form 1 */}
            <Card className="border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 text-gray-600 mb-3 mx-auto">
                  <AcademicCapIcon className="h-6 w-6" />
                </div>
                <h3 className="text-center text-lg font-bold text-gray-900">Form 1</h3>
                <p className="text-center text-xs text-gray-500 mb-3">OPENER - (2024 Term 1)</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean Points</span>
                    <span className="font-semibold text-emerald-600">4.8904</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean Marks</span>
                    <span className="font-semibold text-emerald-600">46.3%</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-gray-600">Mean Grade</span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 font-bold rounded">C-</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Form 2 */}
            <Card className="border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 text-gray-600 mb-3 mx-auto">
                  <AcademicCapIcon className="h-6 w-6" />
                </div>
                <h3 className="text-center text-lg font-bold text-gray-900">Form 2</h3>
                <p className="text-center text-xs text-gray-500 mb-3">OPENER - (2024 Term 1)</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean Points</span>
                    <span className="font-semibold text-emerald-600">5.2156</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean Marks</span>
                    <span className="font-semibold text-emerald-600">52.8%</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-gray-600">Mean Grade</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold rounded">C+</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Form 3 */}
            <Card className="border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 text-gray-600 mb-3 mx-auto">
                  <AcademicCapIcon className="h-6 w-6" />
                </div>
                <h3 className="text-center text-lg font-bold text-gray-900">Form 3</h3>
                <p className="text-center text-xs text-gray-500 mb-3">MID TERM - (2024 Term 1)</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean Points</span>
                    <span className="font-semibold text-emerald-600">6.1458</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean Marks</span>
                    <span className="font-semibold text-emerald-600">61.5%</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-gray-600">Mean Grade</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-bold rounded">B</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Form 4 */}
            <Card className="border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 text-gray-600 mb-3 mx-auto">
                  <AcademicCapIcon className="h-6 w-6" />
                </div>
                <h3 className="text-center text-lg font-bold text-gray-900">Form 4</h3>
                <p className="text-center text-xs text-gray-500 mb-3">MID TERM - (2024 Term 1)</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean Points</span>
                    <span className="font-semibold text-emerald-600">7.2341</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mean Marks</span>
                    <span className="font-semibold text-emerald-600">72.3%</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-gray-600">Mean Grade</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-bold rounded">B+</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================================================
            STUDENTS MANAGEMENT SECTION
        ============================================================================ */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <UsersIcon className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{t('studentsManagement', 'Students Management')}</h2>
            </div>
            <Button variant="outline" size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => navigate('/administration/students/add')}>
              {t('addStudent', 'Add Student')}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Applicants Donut Chart */}
            <ChartCard
              title={t('applicants', 'Applicants')}
              subtitle={t('intakeDec2024', 'Intake: Dec 2024')}
              icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
            >
              <div className="flex items-center justify-center py-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: t('male', 'Male'), value: 240 },
                        { name: t('female', 'Female'), value: 120 },
                        { name: t('others', 'Others'), value: 80 },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#ec4899" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold text-gray-900">440</span>
                  <span className="text-xs text-gray-500">{t('totalApplicants', 'Total')}</span>
                </div>
              </div>
              <div className="mt-2 flex justify-center gap-4 text-sm">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />240 {t('male', 'Male')}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-500" />120 {t('female', 'Female')}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />80 {t('others', 'Others')}</span>
              </div>
            </ChartCard>

            {/* Gender Distribution Cards */}
            <div className="grid grid-cols-1 gap-3">
              <Card className="border-gray-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('male', 'Male')}</p>
                    <p className="text-2xl font-bold text-gray-900">{genderDistribution.male.toLocaleString()}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white">
                    <UsersIcon className="h-6 w-6" />
                  </div>
                </div>
              </Card>
              <Card className="border-gray-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('female', 'Female')}</p>
                    <p className="text-2xl font-bold text-gray-900">{genderDistribution.female.toLocaleString()}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500 text-white">
                    <UsersIcon className="h-6 w-6" />
                  </div>
                </div>
              </Card>
              <Card className="border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('others', 'Others')}</p>
                    <p className="text-2xl font-bold text-gray-900">{genderDistribution.other.toLocaleString()}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white">
                    <UsersIcon className="h-6 w-6" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Department Distribution */}
            <ChartCard
              title={t('studentsByDepartment', 'Students by Department')}
              icon={<BuildingLibraryIcon className="h-5 w-5" />}
            >
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} students`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </section>

        {/* ============================================================================
            CHARTS SECTION
        ============================================================================ */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Enrollment Trends */}
          <ChartCard
            title={t('enrollmentTrends', 'Enrollment Trends')}
            subtitle={t('last6Months', 'Last 6 months')}
            icon={<ChartBarIcon className="h-5 w-5" />}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={enrollmentTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="enrolled" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5} 
                  name={t('newEnrollments', 'New Enrollments')}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  name={t('cumulative', 'Cumulative')}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Reported Students */}
          <ChartCard
            title={t('reportedStudents', 'Reported Students')}
            subtitle={t('disciplinaryCases', 'Disciplinary cases by month')}
            icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={reportedStudentsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="male" name={t('male', 'Male')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="female" name={t('female', 'Female')} fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        {/* ============================================================================
            MORE CHARTS & STATS SECTION
        ============================================================================ */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Subject Registration */}
          <ChartCard
            title={t('subjectRegistration', 'Subject Registration')}
            subtitle={t('academicYear2024', 'Academic Year 2024')}
            icon={<BookOpenIcon className="h-5 w-5" />}
          >
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <CheckCircleIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{subjectRegistrationStats.registered.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{t('registered', 'Registered')}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-rose-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500 text-white">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{subjectRegistrationStats.notRegistered.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{t('notRegistered', 'Not Registered')}</p>
                  </div>
                </div>
              </div>
            </div>
          </ChartCard>

          {/* Performance Analytics */}
          <ChartCard
            title={t('performanceAnalytics', 'Performance Analytics')}
            subtitle={t('examResultsDistribution', 'Exam results distribution')}
            icon={<ChartBarIcon className="h-5 w-5" />}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={performanceAnalyticsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="learners" name={t('students', 'Students')} radius={[0, 4, 4, 0]}>
                  {performanceAnalyticsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Cumulative Student Record */}
          <ChartCard
            title={t('cumulativeRecord', 'Cumulative Record')}
            subtitle={t('studentStatusOverview', 'Student status overview')}
            icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
          >
            <div className="flex items-center justify-around py-4">
              <ProgressRing
                progress={85}
                size={100}
                strokeWidth={8}
                label={t('active', 'Active')}
                sublabel={`700 ${t('students', 'students')}`}
              />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-gray-600">{t('active', 'Active')}: 700</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-gray-600">{t('suspended', 'Suspended')}: 45</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500" />
                  <span className="text-sm text-gray-600">{t('dropped', 'Dropped')}: 90</span>
                </div>
              </div>
            </div>
          </ChartCard>
        </section>

        {/* ============================================================================
            FINANCIAL SUMMARY & EVENTS SECTION
        ============================================================================ */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Financial Summary */}
          <ChartCard
            title={t('financialSummary', 'Financial Summary')}
            subtitle={t('billedVsCollected', 'Billed vs Collected')}
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
            className="lg:col-span-2"
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={financialSummaryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)} 
                  tick={{ fill: '#6b7280', fontSize: 11 }} 
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="billed" 
                  stroke="#6366f1" 
                  fill="#818cf8" 
                  fillOpacity={0.3}
                  name={t('billedAmount', 'Billed Amount')}
                />
                <Area 
                  type="monotone" 
                  dataKey="collected" 
                  stroke="#10b981" 
                  fill="#34d399" 
                  fillOpacity={0.3}
                  name={t('paidAmount', 'Paid Amount')}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm text-gray-600">{t('outstandingBalanceFull', 'Outstanding Balance')}</span>
              <span className="text-lg font-bold text-rose-600">{formatCurrency(outstandingBalance)}</span>
            </div>
          </ChartCard>

          {/* Quick Info Column */}
          <div className="space-y-4">
            {/* Today's Attendance */}
            <Card className="border-gray-200 bg-gradient-to-br from-cyan-50 to-blue-50">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ClockIcon className="h-5 w-5 text-cyan-600" />
                  <h3 className="font-semibold text-gray-900">{t('todaysAttendance', "Today's Attendance")}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-white/70 p-2">
                    <span className="text-sm text-gray-600">{t('present', 'Present')}</span>
                    <span className="font-semibold text-emerald-600">{attendanceSummary.present}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/70 p-2">
                    <span className="text-sm text-gray-600">{t('late', 'Late')}</span>
                    <span className="font-semibold text-amber-600">12</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/70 p-2">
                    <span className="text-sm text-gray-600">{t('absent', 'Absent')}</span>
                    <span className="font-semibold text-rose-600">{attendanceSummary.total - attendanceSummary.present}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Transport Status */}
            <Card className="border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TruckIcon className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-900">{t('transportTracking', 'Transport Tracking')}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-white/70 p-2">
                    <span className="text-sm text-gray-600">{t('busesOnRoute', 'Buses on Route')}</span>
                    <span className="font-semibold text-gray-900">8</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/70 p-2">
                    <span className="text-sm text-gray-600">{t('studentsTransported', 'Students Transported')}</span>
                    <span className="font-semibold text-gray-900">342</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 w-full text-amber-600 hover:text-amber-700"
                  onClick={() => navigate('/finance/student-transport-assignments')}
                >
                  {t('viewDetails', 'View Details')} <ArrowRightIcon className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================================================
            FOOTER INFO
        ============================================================================ */}
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <AcademicCapIcon className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-gray-700">
                <span className="font-medium">{t('roleViewLabel', 'Current Role View')}:</span>{' '}
                <span className="capitalize text-blue-600">{roleType}</span>
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${syncStatus.state === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                {syncStatus.state === 'syncing' ? t('syncing', 'Syncing...') : t('synced', 'Synced')}
              </span>
              <span>|</span>
              <span>{t('dataSource', 'Data Source')}: {isOnline ? t('cloud', 'Cloud') : t('local', 'Local')}</span>
            </div>
          </div>
        </section>
      </PageContainer>
    </div>
  );
};

export default DashboardPage;
