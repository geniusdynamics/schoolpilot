// ABOUTME: Enhanced portal dashboard page with modern widget-based layout
// ABOUTME: Features timetable, calendar, bulletin, statistics, and quick actions

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortalData } from '../data/usePortalData';
import {
  TimetableWidget,
  SchoolCalendarWidget,
  DailyBulletin,
  WhosOnline,
  SchoolStatistics,
  SchoolBlogFeed,
  QuickActionBar,
} from '../components';
import {
  HomeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  MegaphoneIcon,
  BellIcon,
  UserCircleIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowRightIcon,
} from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardNotification,
  DashboardQuickAction,
  DashboardAlertBanner,
} from '@/components/ModuleDashboardShell';

// Import existing panels for backward compatibility
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const PortalDashboardPage: React.FC = () => {
  const { t } = useTranslation('portal');
  const {
    announcements,
    feeSummaries,
    results,
    loading: portalLoading,
    loadAnnouncements,
    getAnnouncementsForUser,
    getAttendanceSummary,
  } = usePortalData();

  const { students, classes, subjects, loading: appLoading } = useAppData();

  const [userRole] = useState<string>('student');
  const [userName] = useState<string>('John Doe');
  const [currentDate, setCurrentDate] = useState<string>('Wednesday 09th September 2020');
  const [userGreeting] = useState<string>(
    new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  );

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const attendanceSummary = getAttendanceSummary();
  const publishedAnnouncements = getAnnouncementsForUser(userRole)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 5);

  const feeBalance = feeSummaries.length > 0 ? feeSummaries[0].currentBalance : 0;
  const recentResult = results.length > 0 ? results[0] : null;
  const newAnnouncements = publishedAnnouncements.filter((a) => {
    const publishedDate = new Date(a.publishedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return publishedDate > weekAgo;
  }).length;

  // Handle date navigation
  const handleDateChange = (direction: 'prev' | 'next') => {
    console.log(`Navigate ${direction}`);
  };

  // Enhanced metrics for portal
  const metrics: DashboardMetric[] = [
    {
      key: 'attendance',
      label: 'Attendance Rate',
      value: attendanceSummary ? `${attendanceSummary.attendancePercentage}%` : 'N/A',
      icon: <CheckCircleIcon className="h-6 w-6" />,
      trend: attendanceSummary && attendanceSummary.attendancePercentage >= 80 ? 'up' : 'down',
      trendValue: attendanceSummary ? `${attendanceSummary.presentDays} present days` : 'No data',
      to: '/portal/attendance',
      colorScheme: attendanceSummary && attendanceSummary.attendancePercentage >= 80 ? 'emerald' : 'amber',
      description: 'Current term attendance',
    },
    {
      key: 'results',
      label: 'Latest Grade',
      value: recentResult ? `${recentResult.grade}` : 'N/A',
      icon: <AcademicCapIcon className="h-6 w-6" />,
      trend: recentResult && ['A', 'B'].includes(recentResult.grade) ? 'up' : 'neutral',
      trendValue: recentResult ? recentResult.examName : 'No results yet',
      to: '/portal/results',
      colorScheme: recentResult && ['A', 'B'].includes(recentResult.grade) ? 'emerald' : 'blue',
      description: 'Most recent exam',
    },
    {
      key: 'fees',
      label: 'Fee Balance',
      value: feeBalance > 0 ? `KES ${feeBalance.toLocaleString()}` : 'Cleared',
      icon: <CurrencyDollarIcon className="h-6 w-6" />,
      trend: feeBalance > 0 ? 'down' : 'up',
      trendValue: feeBalance > 0 ? 'Payment pending' : 'All paid',
      to: '/portal/fees',
      colorScheme: feeBalance > 0 ? 'rose' : 'emerald',
      description: 'Current balance',
    },
    {
      key: 'announcements',
      label: 'New Announcements',
      value: newAnnouncements,
      icon: <MegaphoneIcon className="h-6 w-6" />,
      trend: newAnnouncements > 0 ? 'up' : 'neutral',
      trendValue: newAnnouncements > 0 ? 'This week' : 'No new',
      to: '/portal/announcements',
      colorScheme: newAnnouncements > 0 ? 'amber' : 'blue',
      description: 'Unread updates',
    },
  ];

  // Alert banners for portal
  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'message',
      count: newAnnouncements,
      label: 'New Announcements',
      description: 'Posted this week',
      to: '/portal/announcements',
    },
    {
      type: 'fees',
      count: feeBalance > 0 ? 1 : 0,
      label: 'Fee Balance Due',
      description: feeBalance > 0 ? `KES ${feeBalance.toLocaleString()}` : 'All cleared',
      to: '/portal/fees',
    },
    {
      type: 'task',
      count: attendanceSummary && attendanceSummary.absentDays > 0 ? attendanceSummary.absentDays : 0,
      label: 'Absent Days',
      description: 'This term',
      to: '/portal/attendance',
    },
    {
      type: 'approval',
      count: results.length,
      label: 'Exam Results',
      description: 'Published results',
      to: '/portal/results',
    },
  ];

  // Enhanced quick actions with descriptions
  const quickActions: DashboardQuickAction[] = [
    {
      key: 'timetable',
      label: 'My Timetable',
      description: 'View class schedule',
      to: '/portal/timetable',
      icon: <CalendarDaysIcon className="h-5 w-5" />,
      colorScheme: 'blue',
    },
    {
      key: 'results',
      label: 'Exam Results',
      description: 'View grades & reports',
      to: '/portal/results',
      icon: <AcademicCapIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
    {
      key: 'fees',
      label: 'Fee Statement',
      description: 'View & pay fees',
      to: '/portal/fees',
      icon: <CurrencyDollarIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'attendance',
      label: 'Attendance',
      description: 'Track presence',
      to: '/portal/attendance',
      icon: <CheckCircleIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'calendar',
      label: 'School Calendar',
      description: 'Events & holidays',
      to: '/portal/calendar',
      icon: <CalendarDaysIcon className="h-5 w-5" />,
      colorScheme: 'orange',
    },
    {
      key: 'profile',
      label: 'My Profile',
      description: 'Personal details',
      to: '/portal/profile',
      icon: <UserCircleIcon className="h-5 w-5" />,
      colorScheme: 'rose',
    },
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'attendance-alert',
      title: 'Attendance Summary',
      message: attendanceSummary
        ? `${attendanceSummary.attendancePercentage}% attendance rate with ${attendanceSummary.absentDays} absent days this term.`
        : 'Attendance data not available.',
      severity: attendanceSummary && attendanceSummary.attendancePercentage < 75 ? 'warning' : 'normal',
    },
    {
      id: 'fee-reminder',
      title: 'Fee Status',
      message: feeBalance > 0
        ? `Outstanding balance of KES ${feeBalance.toLocaleString()}. Please arrange payment.`
        : 'All fees cleared. Thank you for your prompt payment.',
      severity: feeBalance > 10000 ? 'high' : feeBalance > 0 ? 'warning' : 'normal',
    },
    {
      id: 'announcements',
      title: 'Recent Updates',
      message: newAnnouncements > 0
        ? `${newAnnouncements} new announcement${newAnnouncements > 1 ? 's' : ''} posted this week.`
        : 'No new announcements this week.',
      severity: 'normal',
    },
  ];

  // Recent portal activity
  const recentActivity = [
    { action: 'Exam results published', time: '2 days ago', type: 'academic' },
    { action: 'Fee payment received', time: '1 week ago', type: 'finance' },
    { action: 'New announcement', time: '3 days ago', type: 'announcement' },
    { action: 'Attendance updated', time: 'Yesterday', type: 'attendance' },
  ];

  if (portalLoading || appLoading.all) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <ModuleDashboardShell
      title={`${userGreeting}, ${userName}`}
      subtitle={t('dashboard.welcome') || 'Welcome to your student portal. Access your academic information, fees, and school updates.'}
      heroIcon={<HomeIcon className="h-8 w-8 text-white" />}
      accentColor="blue"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards={true}
      notifications={notifications}
    >
      {/* Portal Widget Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Widgets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timetable Widget */}
          <TimetableWidget
            date={currentDate}
            onDateChange={handleDateChange}
            onPrint={() => console.log('Print timetable')}
            onExport={() => console.log('Export timetable')}
            onView={() => console.log('View timetable')}
            onCreate={() => console.log('Create timetable')}
            onManage={() => console.log('Manage timetable')}
          />

          {/* School Calendar Widget */}
          <SchoolCalendarWidget
            date={currentDate}
            onDateChange={handleDateChange}
            onPrint={() => console.log('Print calendar')}
            onExport={() => console.log('Export calendar')}
            onCreate={() => console.log('Create event')}
            onManage={() => console.log('Manage calendar')}
          />

          {/* Daily Bulletin */}
          <DailyBulletin
            date={currentDate}
            onDateChange={handleDateChange}
            onPrint={() => console.log('Print bulletin')}
            onExport={() => console.log('Export bulletin')}
            onCreate={() => console.log('Create bulletin')}
            onManage={() => console.log('Manage bulletin')}
            onTagClick={(tag) => console.log('Tag clicked:', tag)}
          />
        </div>

        {/* Right Column - Side Panels */}
        <div className="space-y-6">
          {/* Who's Online */}
          <WhosOnline
            onLaunchMessenger={() => console.log('Launch messenger')}
          />

          {/* School Statistics */}
          <SchoolStatistics />

          {/* School Blog Feed */}
          <SchoolBlogFeed
            onPageChange={(page) => console.log('Page changed:', page)}
          />

          {/* Legacy Attendance Panel */}
          {attendanceSummary && (
            <Card title={t('dashboard.attendanceSummary') || 'Attendance Summary'}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-2xl font-semibold text-gray-900">
                      {attendanceSummary.attendancePercentage}%
                    </p>
                    <p className="text-xs text-gray-500">{t('attendance.percentage') || 'Attendance'}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      attendanceSummary.attendancePercentage >= 80
                        ? 'bg-emerald-500'
                        : attendanceSummary.attendancePercentage >= 60
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${attendanceSummary.attendancePercentage}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded bg-emerald-50 p-2">
                    <p className="text-lg font-semibold text-emerald-700">{attendanceSummary.presentDays}</p>
                    <p className="text-xs text-emerald-600">{t('attendance.present') || 'Present'}</p>
                  </div>
                  <div className="rounded bg-rose-50 p-2">
                    <p className="text-lg font-semibold text-rose-700">{attendanceSummary.absentDays}</p>
                    <p className="text-xs text-rose-600">{t('attendance.absent') || 'Absent'}</p>
                  </div>
                  <div className="rounded bg-amber-50 p-2">
                    <p className="text-lg font-semibold text-amber-700">{attendanceSummary.lateDays}</p>
                    <p className="text-xs text-amber-600">{t('attendance.late') || 'Late'}</p>
                  </div>
                  <div className="rounded bg-blue-50 p-2">
                    <p className="text-lg font-semibold text-blue-700">{attendanceSummary.excusedDays}</p>
                    <p className="text-xs text-blue-600">{t('attendance.excused') || 'Excused'}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Legacy Fee Panel */}
          {feeSummaries.length > 0 && (
            <Card title={t('dashboard.feeOverview') || 'Fee Overview'}>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      KES {feeSummaries[0].totalFees.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{t('fees.totalFees') || 'Total'}</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-emerald-600">
                      KES {feeSummaries[0].totalPaid.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{t('fees.totalPaid') || 'Paid'}</p>
                  </div>
                  <div>
                    <p className={`text-lg font-semibold ${feeBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      KES {feeBalance.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{t('fees.balance') || 'Balance'}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${
                        feeSummaries[0].totalFees > 0
                          ? (feeSummaries[0].totalPaid / feeSummaries[0].totalFees) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <Button variant="ghost" size="sm" className="text-sm w-full">
                  {t('navigation.fees') || 'View Fees'} &rarr;
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Additional Portal Info Panels */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 mt-6">
        {/* Quick Links */}
        <Card title="Quick Links" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-2">
            {quickActions.slice(0, 4).map((action) => (
              <button
                key={action.key}
                onClick={() => window.location.href = action.to}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  {action.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-gray-400 ml-auto" />
              </button>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 py-2">
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0
                  ${activity.type === 'academic' ? 'bg-violet-100 text-violet-600' :
                    activity.type === 'finance' ? 'bg-emerald-100 text-emerald-600' :
                    activity.type === 'announcement' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'}
                `}>
                  {activity.type === 'academic' ? <AcademicCapIcon className="h-4 w-4" /> :
                   activity.type === 'finance' ? <CurrencyDollarIcon className="h-4 w-4" /> :
                   activity.type === 'announcement' ? <MegaphoneIcon className="h-4 w-4" /> :
                   <CheckCircleIcon className="h-4 w-4" />}
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

        {/* School Info */}
        <Card title="School Overview" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Students</span>
              <span className="font-semibold text-blue-600">{(students || []).length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Classes</span>
              <span className="font-semibold text-violet-600">{(classes || []).length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Subjects</span>
              <span className="font-semibold text-orange-600">{(subjects || []).length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Announcements</span>
              <span className="font-semibold text-amber-600">{newAnnouncements} new</span>
            </div>
          </div>
        </Card>
      </section>

      {/* Quick Action Bar */}
      <div className="mt-8">
        <QuickActionBar />
      </div>
    </ModuleDashboardShell>
  );
};

export default PortalDashboardPage;
