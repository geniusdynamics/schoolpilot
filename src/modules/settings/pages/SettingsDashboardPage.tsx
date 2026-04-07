// ABOUTME: This component renders the dashboard for the Settings module.
// ABOUTME: It displays system overview, quick settings access, and module status.

import React from 'react';
import { CogIcon, UsersIcon, CircleStackIcon, ClockIcon, IdentificationIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import ModuleDashboardShell, { DashboardMetric, DashboardNotification, DashboardQuickAction } from '@/components/ModuleDashboardShell';

const SettingsDashboardPage: React.FC = () => {
  const { 
    loading, 
    students,
    staff,
    users
  } = useAppData();

  const { t } = useTranslation('settings');

  const pageIsLoading = loading.all || loading.students || loading.staff || loading.users;

  if (pageIsLoading) { 
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }
  
  // Calculate some basic stats for the dashboard
  const totalStudents = students?.length || 0;
  const totalStaff = staff?.length || 0;
  const totalUsers = users?.length || 0;
  const systemStatus = 'Active';

  const metrics: DashboardMetric[] = [
    { key: 'users', label: t('userManagement.totalUsers'), value: totalUsers, icon: <UsersIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'students', label: 'Total Students', value: totalStudents, icon: <UsersIcon className="h-6 w-6 text-blue-700" /> },
    { key: 'staff', label: 'Total Staff', value: totalStaff, icon: <UsersIcon className="h-6 w-6 text-violet-700" /> },
    { key: 'system-status', label: 'System Status', value: systemStatus, icon: <CogIcon className="h-6 w-6 text-orange-700" /> },
  ];

  const quickActions: DashboardQuickAction[] = [
    { key: 'unified', label: t('navigation.settings.unified'), to: '/settings/unified', icon: <CogIcon className="h-5 w-5" /> },
    { key: 'features', label: t('navigation.settings.features'), to: '/settings/features', icon: <CogIcon className="h-5 w-5" /> },
    { key: 'modules', label: t('navigation.settings.modules'), to: '/settings/modules', icon: <CircleStackIcon className="h-5 w-5" /> },
    { key: 'profile', label: t('navigation.settings.schoolProfile'), to: '/settings/school-profile', icon: <IdentificationIcon className="h-5 w-5" /> },
    { key: 'audit', label: t('navigation.settings.auditLog'), to: '/settings/audit-log', icon: <ClockIcon className="h-5 w-5" /> },
    { key: 'data', label: t('navigation.settings.dataManagement'), to: '/settings/data-management', icon: <CircleStackIcon className="h-5 w-5" /> },
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'system-state',
      title: 'System Health',
      message: systemStatus === 'Active' ? 'System configuration services are active.' : 'System status requires attention.',
      severity: systemStatus === 'Active' ? 'normal' : 'high',
    },
  ];

  return (
    <ModuleDashboardShell
      title={t('navigation.settings.dashboard')}
      subtitle="Configure modules, users, school profile settings, and system governance in one place."
      heroIcon={<CogIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      notifications={notifications}
    />
  );
};

export default SettingsDashboardPage;
