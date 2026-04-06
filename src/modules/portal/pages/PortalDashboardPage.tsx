// ABOUTME: Portal dashboard page showing overview of attendance, fees, results, and announcements
// ABOUTME: Serves as the landing page for students and parents in the portal

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ModuleDashboardShell, { DashboardMetric, DashboardQuickAction, DashboardPanel } from '@/components/ModuleDashboardShell';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { usePortalData } from '../data/usePortalData';
import {
  HomeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  MegaphoneIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
} from '@/components/ui/icons';

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
  const [userGreeting] = useState<string>(new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening');

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const attendanceSummary = getAttendanceSummary();
  const publishedAnnouncements = getAnnouncementsForUser(userRole).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  ).slice(0, 5);

  const feeBalance = feeSummaries.length > 0 ? feeSummaries[0].currentBalance : 0;
  const recentResult = results.length > 0 ? results[0] : null;

  const metrics: DashboardMetric[] = [
    {
      key: 'attendance',
      label: t('attendance.percentage'),
      value: attendanceSummary ? `${attendanceSummary.attendancePercentage}%` : '--',
      description: attendanceSummary
        ? `${attendanceSummary.presentDays}/${attendanceSummary.totalDays} ${t('attendance.present')}`
        : undefined,
      icon: <CalendarDaysIcon className="w-5 h-5 text-emerald-600" />,
    },
    {
      key: 'fee-balance',
      label: t('fees.balance'),
      value: feeSummaries.length > 0 ? `KES ${feeBalance.toLocaleString()}` : '--',
      description: feeSummaries.length > 0
        ? feeBalance > 0 ? `${t('fees.totalFees')}: KES ${feeSummaries[0].totalFees.toLocaleString()}` : t('fees.totalPaid')
        : undefined,
      icon: <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />,
    },
    {
      key: 'recent-results',
      label: t('dashboard.recentResults'),
      value: recentResult?.meanGrade ?? '--',
      description: recentResult ? `${recentResult.examSessionName} - ${recentResult.academicPeriodName}` : undefined,
      icon: <ChartBarIcon className="w-5 h-5 text-violet-600" />,
    },
    {
      key: 'announcements',
      label: t('announcements.title'),
      value: publishedAnnouncements.length,
      description: publishedAnnouncements.length > 0 ? publishedAnnouncements[0].title : undefined,
      icon: <BellIcon className="w-5 h-5 text-amber-600" />,
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      key: 'view-attendance',
      label: t('navigation.attendance'),
      to: '/portal/attendance',
      icon: <CalendarDaysIcon className="w-4 h-4" />,
      variant: 'outline',
    },
    {
      key: 'view-results',
      label: t('navigation.results'),
      to: '/portal/results',
      icon: <ChartBarIcon className="w-4 h-4" />,
      variant: 'outline',
    },
    {
      key: 'view-fees',
      label: t('navigation.fees'),
      to: '/portal/fees',
      icon: <CurrencyDollarIcon className="w-4 h-4" />,
      variant: 'outline',
    },
    {
      key: 'view-announcements',
      label: t('navigation.announcements'),
      to: '/portal/announcements',
      icon: <MegaphoneIcon className="w-4 h-4" />,
      variant: 'outline',
    },
    {
      key: 'view-profile',
      label: t('navigation.profile'),
      to: '/portal/profile',
      icon: <UserCircleIcon className="w-4 h-4" />,
      variant: 'outline',
    },
  ];

  const priorityColors: Record<string, string> = {
    urgent: 'text-rose-600 bg-rose-50 border-rose-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-blue-600 bg-blue-50 border-blue-200',
    low: 'text-gray-600 bg-gray-50 border-gray-200',
  };

  const announcementsPanel: DashboardPanel = {
    key: 'announcements',
    title: t('dashboard.recentAnnouncements'),
    content: (
      <div className="space-y-3">
        {publishedAnnouncements.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <MegaphoneIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{t('announcements.noAnnouncements')}</p>
          </div>
        ) : (
          publishedAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className="rounded-lg border p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${priorityColors[announcement.priority]}`}>
                      {announcement.priority}
                    </span>
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{announcement.title}</h4>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{announcement.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {announcement.authorName} &middot; {new Date(announcement.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        {publishedAnnouncements.length > 0 && (
          <div className="pt-2">
            <Button variant="ghost" size="sm" as={Link} to="/portal/announcements" className="text-sm">
              {t('announcements.title')} &rarr;
            </Button>
          </div>
        )}
      </div>
    ),
  };

  const attendancePanel: DashboardPanel = {
    key: 'attendance',
    title: t('dashboard.attendanceSummary'),
    content: attendanceSummary ? (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{attendanceSummary.attendancePercentage}%</p>
            <p className="text-xs text-gray-500">{t('attendance.percentage')}</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${
              attendanceSummary.attendancePercentage >= 80 ? 'bg-emerald-500' :
              attendanceSummary.attendancePercentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
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
    ) : (
      <div className="text-center py-6 text-gray-500">
        <CalendarDaysIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">{t('common.noData')}</p>
      </div>
    ),
  };

  const feePanel: DashboardPanel = {
    key: 'fee-overview',
    title: t('dashboard.feeOverview'),
    content: feeSummaries.length > 0 ? (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-900">KES {feeSummaries[0].totalFees.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{t('fees.totalFees')}</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-emerald-600">KES {feeSummaries[0].totalPaid.toLocaleString()}</p>
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
            style={{ width: `${feeSummaries[0].totalFees > 0 ? (feeSummaries[0].totalPaid / feeSummaries[0].totalFees) * 100 : 0}%` }}
          />
        </div>
        <Button variant="ghost" size="sm" as={Link} to="/portal/fees" className="text-sm">
          {t('navigation.fees')} &rarr;
        </Button>
      </div>
    ) : (
      <div className="text-center py-6 text-gray-500">
        <CurrencyDollarIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">{t('common.noData')}</p>
      </div>
    ),
  };

  const notifications = [];
  if (feeBalance > 0 && feeSummaries.length > 0 && feeSummaries[0].dueDate) {
    const dueDate = new Date(feeSummaries[0].dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 0) {
      notifications.push({
        id: 'fee-overdue',
        title: t('fees.title'),
        message: `Your fee balance of KES ${feeBalance.toLocaleString()} is overdue. Please make payment as soon as possible.`,
        severity: 'high' as const,
      });
    } else if (daysUntilDue <= 7) {
      notifications.push({
        id: 'fee-due-soon',
        title: t('fees.title'),
        message: `Your fee balance of KES ${feeBalance.toLocaleString()} is due on ${dueDate.toLocaleDateString()}.`,
        severity: 'warning' as const,
      });
    }
  }
  const urgentAnnouncements = publishedAnnouncements.filter(a => a.priority === 'urgent');
  urgentAnnouncements.forEach((ann, idx) => {
    notifications.push({
      id: `urgent-${ann.id}`,
      title: ann.title,
      message: ann.content.substring(0, 100) + (ann.content.length > 100 ? '...' : ''),
      severity: 'high' as const,
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <ModuleDashboardShell
      title={`${userGreeting}, ${userName}`}
      subtitle={t('dashboard.welcome')}
      heroIcon={<HomeIcon className="w-8 h-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      charts={[announcementsPanel, attendancePanel, feePanel]}
      notifications={notifications}
    />
  );
};

export default PortalDashboardPage;
