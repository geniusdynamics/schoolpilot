// ABOUTME: The portal dashboard: the figures a guardian or learner checks first — attendance, balance,
// ABOUTME: the latest report, unread notices — and links to each page.

import { withPortalRepository } from '../data/withPortalRepository';

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import { CalendarDaysIcon, ChartBarIcon, CurrencyDollarIcon, BellIcon } from '@/components/ui/icons';
import { formatMoneyMinor } from '@/modules/finance/data/canonicalFinance';

import { PortalShell } from '../components/PortalShell';
import {
  usePortalAttendance,
  usePortalBalance,
  usePortalNotices,
  usePortalReports,
} from '../data/usePortalSession';

const money = (minor: number): string => formatMoneyMinor(minor);

export const PortalDashboardContent: React.FC = () => {
  const { t } = useTranslation('portal');
  const attendance = usePortalAttendance();
  const fees = usePortalBalance();
  const reports = usePortalReports();
  const notices = usePortalNotices();

  const session = attendance.session;
  const summary = attendance.summary;
  const balance = fees.balance;
  const latestReport = reports.reports[0] ?? null;
  const unread = notices.notices.filter((notice) => !notice.read).length;
  const latestNotice = notices.notices[0] ?? null;

  const metrics = [
    {
      key: 'attendance',
      label: t('attendance.percentage', 'Attendance'),
      value: summary && summary.percentage !== null ? `${summary.percentage}%` : '—',
      description: summary ? `${summary.present}/${summary.total} ${t('attendance.present', 'present')}` : undefined,
      icon: <CalendarDaysIcon className="h-5 w-5 text-emerald-600" />,
      to: '/portal/attendance',
    },
    {
      key: 'fees',
      label: t('fees.outstanding', 'Outstanding'),
      value: balance ? money(balance.balance > 0 ? balance.balance : 0) : '—',
      description: balance ? t('fees.totalPaid', 'Paid') + `: ${money(balance.amountPaid)}` : undefined,
      icon: <CurrencyDollarIcon className="h-5 w-5 text-primary-600" />,
      to: '/portal/fees',
    },
    {
      key: 'reports',
      label: t('reports.latest', 'Latest report'),
      value: latestReport
        ? latestReport.state === 'published'
          ? t('reports.published', 'Published')
          : t('reports.notPublished', 'Not published yet')
        : '—',
      description: latestReport?.periodName,
      icon: <ChartBarIcon className="h-5 w-5 text-violet-600" />,
      to: '/portal/reports',
    },
    {
      key: 'notices',
      label: t('announcements.title', 'Notices'),
      value: String(unread),
      description: latestNotice?.title,
      icon: <BellIcon className="h-5 w-5 text-amber-600" />,
      to: '/portal/announcements',
    },
  ];

  return (
    <PortalShell session={session} title={t('dashboard.title', 'My dashboard')}>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <Link key={metric.key} to={metric.to} className="block focus:outline-none focus:ring-2 focus:ring-primary-500">
            <Card className="h-full border-slate-200 bg-surface-card">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-surface-accent p-2">{metric.icon}</div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-surface-muted-fg">{metric.label}</p>
                  <p className="text-lg font-semibold text-surface-foreground">{metric.value}</p>
                  {metric.description ? (
                    <p className="truncate text-xs text-surface-muted-fg">{metric.description}</p>
                  ) : null}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card title={t('dashboard.quickLinks', 'Quick links')} className="border-slate-200 bg-surface-card">
        <ul className="grid grid-cols-2 gap-2 text-sm">
          <li>
            <Link className="text-primary-700 underline" to="/portal/reports">
              {t('reports.title', 'Term reports')}
            </Link>
          </li>
          <li>
            <Link className="text-primary-700 underline" to="/portal/attendance">
              {t('attendance.title', 'Attendance')}
            </Link>
          </li>
          <li>
            <Link className="text-primary-700 underline" to="/portal/fees">
              {t('fees.title', 'Fee statement')}
            </Link>
          </li>
          <li>
            <Link className="text-primary-700 underline" to="/portal/announcements">
              {t('announcements.title', 'Notices')}
            </Link>
          </li>
          <li>
            <Link className="text-primary-700 underline" to="/portal/profile">
              {t('profile.title', 'My profile')}
            </Link>
          </li>
        </ul>
      </Card>
    </PortalShell>
  );
};

const PortalDashboardPage: React.FC = withPortalRepository(() => <PortalDashboardContent />);

export default PortalDashboardPage;
