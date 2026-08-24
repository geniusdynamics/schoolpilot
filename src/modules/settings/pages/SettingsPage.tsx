// ABOUTME: This component renders the main settings dashboard, providing navigation and overview of various configuration sections.
// ABOUTME: It serves as a central hub for accessing different settings areas without duplicating functionality.

import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { CogIcon, IdentificationIcon, UserGroupIcon, ArrowsRightLeftIcon, ClockIcon, CircleStackIcon } from '@/components/ui/icons'; 
import { useAppData } from '@/hooks/useAppData'; 
import { User } from '@/types'; 
import { DataGrid } from '@/components/ui/data';
import { Link } from 'react-router-dom';
import ModuleManagementPanel from '@/components/settings/ModuleManagementPanel';
import UserPermissionsPanel from '@/components/settings/UserPermissionsPanel';
import Spinner from '@/components/ui/Spinner';
import ModuleDashboardShell, { DashboardMetric, DashboardNotification, DashboardQuickAction } from '@/components/ModuleDashboardShell';

export const SettingsContent: React.FC = () => {
  const { t } = useTranslation(['settings', 'common', 'navigation']);
  const { 
    users, 
    loading: usersLoading, 
    schoolDetails, 
    isDatabaseModeActive 
  } = useAppData(); 
  
  const userColumns = [
    { header: t('tableHeaders.username'), key: 'username' as keyof User },
    { header: t('tableHeaders.email'), key: 'email' as keyof User },
    { header: t('tableHeaders.userType'), key: 'userType' as keyof User},
    { header: t('tableHeaders.role'), key: 'role' as keyof User }, 
    { header: t('tableHeaders.status'), key: 'isActive' as keyof User }
  ];

  // Show only first 5 users as preview
  const previewUsers = users.slice(0, 5);

  if (usersLoading.all || usersLoading.users || usersLoading.schoolDetails) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const metrics: DashboardMetric[] = [
    { key: 'users', label: t('userManagement.totalUsers'), value: users.length, icon: <UserGroupIcon className="h-6 w-6 text-blue-700" /> },
    { key: 'school', label: t('navigation:settings.schoolProfile'), value: schoolDetails?.name || t('schoolProfile.notConfigured'), icon: <IdentificationIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'database-mode', label: t('dataManagement.title'), value: isDatabaseModeActive ? 'Database Mode Active' : 'Browser Mode', icon: <CircleStackIcon className="h-6 w-6 text-indigo-700" /> },
    { key: 'modules', label: t('moduleManagement.title'), value: t('common:manage'), icon: <CogIcon className="h-6 w-6 text-cyan-700" /> },
  ];

  const quickActions: DashboardQuickAction[] = [
    { key: 'school-profile', label: t('navigation:settings.schoolProfile'), to: '/settings/school-profile', icon: <IdentificationIcon className="h-5 w-5" /> },
    { key: 'users', label: t('navigation:settings.users'), to: '/settings/users', icon: <UserGroupIcon className="h-5 w-5" /> },
    { key: 'modules', label: t('navigation:settings.modules'), to: '/settings/modules', icon: <CircleStackIcon className="h-5 w-5" /> },
    { key: 'audit', label: t('navigation:settings.auditLog'), to: '/settings/audit-log', icon: <ClockIcon className="h-5 w-5" /> },
    { key: 'workflows', label: t('navigation:settings.workflows'), to: '/settings/workflows', icon: <ArrowsRightLeftIcon className="h-5 w-5" /> },
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'data-mode',
      title: t('dataManagement.title'),
      message: isDatabaseModeActive
        ? 'Advanced data tools are enabled.'
        : 'Running in browser mode with reduced data-management capabilities.',
      severity: isDatabaseModeActive ? 'normal' : 'warning',
    },
    {
      id: 'user-volume',
      title: t('userManagement.title'),
      message: users.length > 0
        ? `${users.length} user accounts are configured.`
        : 'No user accounts are currently configured.',
      severity: users.length > 0 ? 'normal' : 'warning',
    },
  ];

  return (
    <ModuleDashboardShell
      title={t('general.title')}
      subtitle={t('general.appSettingsDescription')}
      heroIcon={<CogIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      quickActions={quickActions}
      notifications={notifications}
    >
      <ModuleManagementPanel />
      <UserPermissionsPanel />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* School Profile Card */}
        <Card title={t('navigation:settings.schoolProfile')}>
          <div className="text-center py-6">
            <IdentificationIcon className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">{schoolDetails?.name || t('schoolProfile.notConfigured')}</h3>
            <p className="text-sm text-gray-500 mb-4">{schoolDetails?.school_code || t('schoolProfile.noCode')}</p>
            <Link 
              to="/settings/school-profile" 
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {t('schoolProfile.manageProfile')}
            </Link>
          </div>
        </Card>

        {/* User Management Card */}
        <Card title={t('navigation:settings.users')}>
          <div className="text-center py-6">
            <UserGroupIcon className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">{users.length} {t('userManagement.totalUsers')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('userManagement.quickOverview')}</p>
            <Link 
              to="/settings/users" 
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('userManagement.manageUsers')}
            </Link>
          </div>
        </Card>

        {/* Workflows Card */}
        <Card title={t('navigation:settings.workflows')}>
          <div className="text-center py-6">
            <ArrowsRightLeftIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">{t('workflows.title')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('workflows.description')}</p>
            <Link
              to="/settings/workflows"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {t('workflows.manageWorkflows')}
            </Link>
          </div>
        </Card>

        {/* Module Management Card */}
        <Card title={t('navigation:settings.modules')}>
          <div className="text-center py-6">
            <CircleStackIcon className="w-12 h-12 text-teal-500 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">{t('moduleManagement.title')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('moduleManagement.description')}</p>
            <Link
              to="/settings/modules"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-teal-700 bg-teal-100 hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              {t('common:manage')}
            </Link>
          </div>
        </Card>

        {/* Audit Log Card */}
        <Card title={t('navigation:settings.auditLog')}>
          <div className="text-center py-6">
            <ClockIcon className="w-12 h-12 text-purple-500 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">{t('auditLog.title')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('auditLog.description')}</p>
            <Link
              to="/settings/audit-log"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              {t('auditLog.viewLogs')}
            </Link>
          </div>
        </Card>

        {/* Data Management Card - Only show in RxDB mode */}
        {isDatabaseModeActive && (
          <Card title={t('navigation:settings.dataManagement')}>
            <div className="text-center py-6">
              <CircleStackIcon className="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">{t('dataManagement.title')}</h3>
              <p className="text-sm text-gray-500 mb-4">{t('dataManagement.description')}</p>
              <Link 
                to="/settings/data-management" 
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                {t('dataManagement.manage')}
              </Link>
            </div>
          </Card>
        )}
      </div>
      <Card title={t('userManagement.recentUsers')}>
        <div className="mb-4">
          <p className="text-gray-600">{t('userManagement.previewDescription')}</p>
        </div>
        <DataGrid columns={userColumns} data={previewUsers} loading={usersLoading.users} />
        <div className="mt-4 text-center">
          <Link 
            to="/settings/users" 
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            {t('userManagement.viewAllUsers')} →
          </Link>
        </div>
      </Card>

      <Card title={t('academicCalendar.setupTitle')}>
         <p className="text-gray-500">
            {t('academicCalendar.description')}
            <ul className="list-disc list-inside mt-2">
                <li><Link to="/administration/academic-structures" className="text-indigo-600 hover:underline">{t('academicCalendar.linkAcademicStructures')}</Link></li>
                <li><Link to="/administration/academic-period-definitions" className="text-indigo-600 hover:underline">{t('academicCalendar.linkAcademicPeriodDefinitions')}</Link></li>
                <li><Link to="/administration/academic-years" className="text-indigo-600 hover:underline">{t('academicCalendar.linkAcademicYears')}</Link></li>
                <li><Link to="/administration/school-periods" className="text-indigo-600 hover:underline">{t('academicCalendar.linkSchoolPeriods')}</Link></li>
            </ul>
          </p>
      </Card>

      <Card title={t('rolesPermissions.title')}>
         <p className="text-gray-500">
            {t('rolesPermissions.description', { userManagementLink: t('navigation:settings.users'), workflowsLink: t('navigation:settings.workflows') })}
          </p>
      </Card>
    </ModuleDashboardShell>
  );
};

const SettingsPage: React.FC = () => {
  return <SettingsContent />;
};

export default SettingsPage;
