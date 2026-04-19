// ABOUTME: This component renders the dashboard for the Settings module.
// ABOUTME: It displays system overview, quick settings access, and module status.

import React from 'react';
import {
  CogIcon,
  UsersIcon,
  CircleStackIcon,
  ClockIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  KeyIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  BellIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  WrenchIcon,
} from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardNotification,
  DashboardQuickAction,
  DashboardAlertBanner,
} from '@/components/ModuleDashboardShell';

const SettingsDashboardPage: React.FC = () => {
  const {
    loading,
    students,
    staff,
    users,
    roles,
    modules,
    schoolProfile,
  } = useAppData();

  const { t } = useTranslation('settings');

  const pageIsLoading = loading.all || loading.students || loading.staff || loading.users;

  if (pageIsLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  // Calculate stats for the dashboard
  const totalStudents = (students || []).length;
  const totalStaff = (staff || []).length;
  const totalUsers = (users || []).length;
  const totalRoles = (roles || []).length;
  const activeModules = (modules || []).filter((m: any) => m.enabled || m.active).length;
  const inactiveModules = (modules || []).length - activeModules;
  const systemStatus = 'Active';
  const hasProfile = !!schoolProfile;
  const adminUsers = (users || []).filter((u: any) => u.role === 'admin' || u.is_admin).length;

  // Enhanced metrics with trends and color schemes
  const metrics: DashboardMetric[] = [
    {
      key: 'users',
      label: t('userManagement.totalUsers') || 'Total Users',
      value: totalUsers.toLocaleString(),
      icon: <UsersIcon className="h-6 w-6" />,
      trend: totalUsers > 0 ? 'up' : 'neutral',
      trendValue: `${adminUsers} admins`,
      to: '/settings/unified',
      colorScheme: 'emerald',
      description: 'System user accounts',
    },
    {
      key: 'students',
      label: 'Total Students',
      value: totalStudents.toLocaleString(),
      icon: <UsersIcon className="h-6 w-6" />,
      trend: 'neutral',
      trendValue: 'Enrolled',
      to: '/administration/students',
      colorScheme: 'blue',
      description: 'Student accounts',
    },
    {
      key: 'staff',
      label: 'Total Staff',
      value: totalStaff.toLocaleString(),
      icon: <UsersIcon className="h-6 w-6" />,
      trend: 'neutral',
      trendValue: 'Active staff',
      to: '/administration/staff',
      colorScheme: 'violet',
      description: 'Staff accounts',
    },
    {
      key: 'system-status',
      label: 'System Status',
      value: systemStatus,
      icon: <CogIcon className="h-6 w-6" />,
      trend: 'up',
      trendValue: 'Operational',
      to: '/settings/unified',
      colorScheme: 'orange',
      description: 'All systems active',
    },
  ];

  // Alert banners
  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'message',
      count: activeModules,
      label: 'Active Modules',
      description: 'Features enabled',
      to: '/settings/modules',
    },
    {
      type: 'task',
      count: inactiveModules,
      label: 'Inactive Modules',
      description: 'Can be enabled',
      to: '/settings/modules',
    },
    {
      type: 'approval',
      count: totalRoles,
      label: 'User Roles',
      description: 'Permission sets',
      to: '/settings/unified',
    },
    {
      type: hasProfile ? 'message' : 'overdue',
      count: hasProfile ? 1 : 0,
      label: 'School Profile',
      description: hasProfile ? 'Configured' : 'Needs setup',
      to: '/settings/school-profile',
    },
  ];

  // Enhanced quick actions with descriptions
  const quickActions: DashboardQuickAction[] = [
    {
      key: 'unified',
      label: t('navigation.settings.unified') || 'Unified Settings',
      description: 'All settings in one place',
      to: '/settings/unified',
      icon: <CogIcon className="h-5 w-5" />,
      colorScheme: 'orange',
    },
    {
      key: 'features',
      label: t('navigation.settings.features') || 'Features',
      description: 'Toggle system features',
      to: '/settings/features',
      icon: <WrenchIcon className="h-5 w-5" />,
      colorScheme: 'amber',
    },
    {
      key: 'modules',
      label: t('navigation.settings.modules') || 'Modules',
      description: 'Manage active modules',
      to: '/settings/modules',
      icon: <CircleStackIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'profile',
      label: t('navigation.settings.schoolProfile') || 'School Profile',
      description: 'School information',
      to: '/settings/school-profile',
      icon: <IdentificationIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'audit',
      label: t('navigation.settings.auditLog') || 'Audit Log',
      description: 'System activity log',
      to: '/settings/audit-log',
      icon: <ClockIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
    {
      key: 'data',
      label: t('navigation.settings.dataManagement') || 'Data Management',
      description: 'Import/export data',
      to: '/settings/data-management',
      icon: <CircleStackIcon className="h-5 w-5" />,
      colorScheme: 'blue',
    },
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'system-state',
      title: 'System Health',
      message: systemStatus === 'Active'
        ? `System operational. ${activeModules} modules active, ${totalUsers} users registered.`
        : 'System status requires attention.',
      severity: systemStatus === 'Active' ? 'normal' : 'high',
    },
    {
      id: 'security-status',
      title: 'Security Overview',
      message: adminUsers > 0
        ? `${adminUsers} administrators configured. ${totalRoles} role types active.`
        : 'No administrators configured. Set up admin accounts for system access.',
      severity: adminUsers === 0 ? 'high' : 'normal',
    },
    {
      id: 'profile-status',
      title: 'School Profile',
      message: hasProfile
        ? 'School profile is configured and ready.'
        : 'School profile not configured. Complete setup for better branding.',
      severity: hasProfile ? 'normal' : 'warning',
    },
  ];

  // Recent settings activity
  const recentActivity = [
    { action: 'User permissions updated', time: '30 minutes ago', type: 'security' },
    { action: 'Module configuration changed', time: '2 hours ago', type: 'module' },
    { action: 'Audit log exported', time: '1 day ago', type: 'audit' },
    { action: 'School profile updated', time: '3 days ago', type: 'profile' },
  ];

  return (
    <ModuleDashboardShell
      title={t('navigation.settings.dashboard') || 'Settings Dashboard'}
      subtitle="Configure modules, users, school profile settings, and system governance in one place."
      heroIcon={<CogIcon className="h-8 w-8 text-white" />}
      accentColor="orange"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards={true}
      notifications={notifications}
    >
      {/* Additional Settings Info Panels */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* System Status */}
        <Card title="System Status" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Active Modules</span>
              <span className="font-semibold text-emerald-600">{activeModules}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Inactive Modules</span>
              <span className="font-semibold text-amber-600">{inactiveModules}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">User Roles</span>
              <span className="font-semibold text-violet-600">{totalRoles}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Admin Users</span>
              <span className="font-semibold text-blue-600">{adminUsers}</span>
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
                  ${activity.type === 'security' ? 'bg-rose-100 text-rose-600' :
                    activity.type === 'module' ? 'bg-cyan-100 text-cyan-600' :
                    activity.type === 'audit' ? 'bg-violet-100 text-violet-600' :
                    'bg-emerald-100 text-emerald-600'}
                `}>
                  {activity.type === 'security' ? <ShieldCheckIcon className="h-4 w-4" /> :
                   activity.type === 'module' ? <CircleStackIcon className="h-4 w-4" /> :
                   activity.type === 'audit' ? <ClockIcon className="h-4 w-4" /> :
                   <IdentificationIcon className="h-4 w-4" />}
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

        {/* Quick Overview */}
        <Card title="Quick Overview" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{totalUsers}</p>
                <p className="text-xs text-emerald-600">Total Users</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{adminUsers}</p>
                <p className="text-xs text-blue-600">Admins</p>
              </div>
            </div>
            <div className="rounded-lg bg-cyan-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-cyan-700">Module Utilization</span>
                <span className="font-bold text-cyan-700">
                  {(modules || []).length > 0 ? `${Math.round((activeModules / (modules || []).length) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="w-full bg-cyan-200 rounded-full h-2 mt-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full"
                  style={{ width: `${(modules || []).length > 0 ? (activeModules / (modules || []).length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg bg-violet-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-violet-700">School Profile</span>
                <span className={`font-bold ${hasProfile ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {hasProfile ? 'Complete' : 'Incomplete'}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/settings/unified'}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              Open Settings <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </section>
    </ModuleDashboardShell>
  );
};

export default SettingsDashboardPage;
