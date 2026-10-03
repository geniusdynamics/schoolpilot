import React, { useMemo } from 'react';
import {
  TicketIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardNotification,
  DashboardPanel,
  DashboardQuickAction,
} from '@/components/ModuleDashboardShell';
import { usePickupData } from '../../data/pickup/usePickupData';
import { PickupCodeStatus } from '../../data/pickup/types';
import { useTranslation } from 'react-i18next';

const PickupDashboardPage: React.FC = () => {
  const { t } = useTranslation('pickup');
  const { pickupCodes, pickupLogs, loading, getTodaysPickupLogs } = usePickupData();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Compute stats
  const activeCodes = pickupCodes.filter(c => c.status === PickupCodeStatus.ACTIVE).length;
  const todaysLogs = getTodaysPickupLogs();
  const totalPickupsToday = todaysLogs.length;
  const flaggedIncidents = pickupLogs.filter(l => l.notes?.toLowerCase().includes('flag') || l.notes?.toLowerCase().includes('issue')).length;
  const expiredCodes = pickupCodes.filter(c => c.status === PickupCodeStatus.EXPIRED).length;

  const metrics: DashboardMetric[] = [
    {
      key: 'active-codes',
      label: t('dashboard.activeCodes'),
      value: activeCodes,
      icon: <TicketIcon className="h-6 w-6 text-primary-700" />,
    },
    {
      key: 'pickups-today',
      label: t('dashboard.todayPickups'),
      value: totalPickupsToday,
      icon: <ClipboardDocumentCheckIcon className="h-6 w-6 text-emerald-700" />,
    },
    {
      key: 'pending-pickups',
      label: t('dashboard.pendingPickups'),
      value: activeCodes,
      description: 'Students awaiting pickup',
      icon: <UsersIcon className="h-6 w-6 text-amber-700" />,
    },
    {
      key: 'flagged',
      label: 'Flagged Incidents',
      value: flaggedIncidents,
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-rose-700" />,
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      key: 'generate-code',
      label: t('pickupCode.actions.generate'),
      to: '/pickup/codes',
      icon: <PlusIcon className="h-5 w-5" />,
      variant: 'primary',
    },
    {
      key: 'view-logs',
      label: t('pickupLog.actions.view'),
      to: '/pickup/log',
      icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
    },
    {
      key: 'manage-persons',
      label: t('authorizedPerson.plural'),
      to: '/pickup/authorized-persons',
      icon: <UserGroupIcon className="h-5 w-5" />,
    },
  ];

  const notifications: DashboardNotification[] = [
    ...(expiredCodes > 0
      ? [{
          id: 'expired-codes',
          title: 'Expired Codes Need Cleanup',
          message: `${expiredCodes} expired pickup code${expiredCodes > 1 ? 's' : ''} should be reviewed and cleaned up.`,
          severity: 'warning' as const,
        }]
      : []),
    ...(flaggedIncidents > 0
      ? [{
          id: 'flagged-incidents',
          title: 'Flagged Incidents',
          message: `${flaggedIncidents} pickup incident${flaggedIncidents > 1 ? 's' : ''} require attention.`,
          severity: 'high' as const,
        }]
      : []),
  ];

  // Recent pickup logs
  const recentLogs = useMemo(() => {
    return [...pickupLogs]
      .sort((a, b) => new Date(b.pickupTime).getTime() - new Date(a.pickupTime).getTime())
      .slice(0, 10);
  }, [pickupLogs]);

  const logColumns: DataGridColumn<typeof recentLogs[number]>[] = [
    {
      key: 'studentName',
      header: 'Student',
      render: (value) => value || 'N/A',
    },
    {
      key: 'authorizedPersonName',
      header: 'Picked Up By',
      render: (value) => value || 'N/A',
    },
    {
      key: 'relationship',
      header: 'Relationship',
      render: (value) => <span className="text-xs">{value}</span>,
    },
    {
      key: 'pickupTime',
      header: 'Time',
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: 'verifiedByName',
      header: 'Verified By',
      render: (value) => value || 'N/A',
    },
  ];

  const charts: DashboardPanel[] = [
    {
      key: 'recent-activity',
      title: t('dashboard.recentActivity'),
      content: (
        <DataGrid
          columns={logColumns}
          data={recentLogs}
          sortable={false}
          filterable={false}
          loading={loading}
          className="shadow-none border-0"
        />
      ),
    },
  ];

  return (
    <ModuleDashboardShell
      title={t('dashboard.title')}
      subtitle={t('description')}
      heroIcon={<ChartBarIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      charts={charts}
      notifications={notifications}
    />
  );
};

export default PickupDashboardPage;
