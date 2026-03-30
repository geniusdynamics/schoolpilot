import React from 'react';
import {
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  CheckCircleIcon,
  InboxIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
} from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import DonutChart from '@/components/ui/DonutChart';
import { useAdmissionsData } from '../data/useAdmissionsData';
import ModuleDashboardShell, { DashboardMetric, DashboardNotification, DashboardPanel, DashboardQuickAction } from '@/components/ModuleDashboardShell';

const AdmissionsDashboardPage: React.FC = () => {
  const { statistics, loading } = useAdmissionsData();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const statusChartData = statistics.byStatus.map(s => ({
    name: s.status,
    value: s.count,
  }));

  const classChartData = statistics.byClass.map(c => ({
    name: c.className,
    value: c.count,
  }));

  const metrics: DashboardMetric[] = [
    { key: 'total', label: 'Total Applications', value: statistics.totalApplications, icon: <DocumentTextIcon className="h-6 w-6 text-blue-700" /> },
    { key: 'pending', label: 'Pending Review', value: statistics.pendingReview, icon: <InboxIcon className="h-6 w-6 text-amber-700" /> },
    { key: 'approved', label: 'Approved', value: statistics.approved, icon: <CheckCircleIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'enrolled', label: 'Enrolled', value: statistics.enrolled, icon: <UsersIcon className="h-6 w-6 text-violet-700" /> },
    { key: 'rejected', label: 'Rejected', value: statistics.rejected, icon: <ExclamationTriangleIcon className="h-6 w-6 text-rose-700" /> },
    { key: 'this-month', label: 'This Month', value: statistics.thisMonth, icon: <ChartBarIcon className="h-6 w-6 text-sky-700" /> },
    { key: 'waitlisted', label: 'Waitlisted', value: statistics.waitlisted, icon: <UsersIcon className="h-6 w-6 text-orange-700" /> },
  ];

  const quickActions: DashboardQuickAction[] = [
    { key: 'new-application', label: 'New Application', to: '/admissions/new-application', icon: <PlusIcon className="h-5 w-5" />, variant: 'primary' },
    { key: 'applications', label: 'View Applications', to: '/admissions/applications', icon: <EyeIcon className="h-5 w-5" /> },
    { key: 'review-queue', label: 'Review Queue', to: '/admissions/review-queue', icon: <InboxIcon className="h-5 w-5" /> },
  ];

  const charts: DashboardPanel[] = [
    ...(statusChartData.length > 0 ? [{ key: 'status', title: 'Applications by Status', content: <DonutChart data={statusChartData} title="" /> }] : []),
    ...(classChartData.length > 0 ? [{ key: 'class', title: 'Applications by Class', content: <DonutChart data={classChartData} title="" /> }] : []),
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'pending-review',
      title: 'Pending Review Queue',
      message: `${statistics.pendingReview} applications are awaiting review.`,
      severity: statistics.pendingReview > 0 ? 'warning' : 'normal',
    },
  ];

  return (
    <ModuleDashboardShell
      title="Admissions Dashboard"
      subtitle="Manage student admission applications from submission through enrollment with real-time funnel visibility."
      heroIcon={<ChartBarIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      charts={charts}
      notifications={notifications}
    />
  );
};

export default AdmissionsDashboardPage;
