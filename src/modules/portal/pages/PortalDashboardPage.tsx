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
} from '@/components/ui/icons';

// Import existing panels for backward compatibility
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const PortalDashboardPage: React.FC = () => {
  const { t } = useTranslation('portal');
  const {
    announcements,
    feeSummaries,
    results,
    loading,
    loadAnnouncements,
    getAnnouncementsForUser,
    getAttendanceSummary,
  } = usePortalData();

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

  // Handle date navigation
  const handleDateChange = (direction: 'prev' | 'next') => {
    // In a real app, this would calculate the actual date
    console.log(`Navigate ${direction}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {userGreeting}, {userName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{t('dashboard.welcome')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
              <HomeIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{t('portal.parent')}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
              <span className="text-sm font-medium">{t('portal.student')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
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

            {/* Legacy Panels (for backward compatibility) */}
            {attendanceSummary && (
              <Card title={t('dashboard.attendanceSummary')}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-gray-900">
                        {attendanceSummary.attendancePercentage}%
                      </p>
                      <p className="text-xs text-gray-500">{t('attendance.percentage')}</p>
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
                      <p className="text-xs text-emerald-600">{t('attendance.present')}</p>
                    </div>
                    <div className="rounded bg-rose-50 p-2">
                      <p className="text-lg font-semibold text-rose-700">{attendanceSummary.absentDays}</p>
                      <p className="text-xs text-rose-600">{t('attendance.absent')}</p>
                    </div>
                    <div className="rounded bg-amber-50 p-2">
                      <p className="text-lg font-semibold text-amber-700">{attendanceSummary.lateDays}</p>
                      <p className="text-xs text-amber-600">{t('attendance.late')}</p>
                    </div>
                    <div className="rounded bg-blue-50 p-2">
                      <p className="text-lg font-semibold text-blue-700">{attendanceSummary.excusedDays}</p>
                      <p className="text-xs text-blue-600">{t('attendance.excused')}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {feeSummaries.length > 0 && (
              <Card title={t('dashboard.feeOverview')}>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        KES {feeSummaries[0].totalFees.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{t('fees.totalFees')}</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-emerald-600">
                        KES {feeSummaries[0].totalPaid.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{t('fees.totalPaid')}</p>
                    </div>
                    <div>
                      <p className={`text-lg font-semibold ${feeBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        KES {feeBalance.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{t('fees.balance')}</p>
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
                    {t('navigation.fees')} &rarr;
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="mt-8">
          <QuickActionBar />
        </div>
      </div>
    </div>
  );
};

export default PortalDashboardPage;
