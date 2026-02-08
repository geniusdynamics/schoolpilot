// ABOUTME: This component renders the dashboard for the Settings module.
// ABOUTME: It displays system overview, quick settings access, and module status.

import React from 'react';
import Card from '@/components/ui/Card';
import { CogIcon, UsersIcon, CircleStackIcon, ClockIcon, IdentificationIcon, ArrowsRightLeftIcon, ViewColumnsIcon, IconProps } from '../../../components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode, iconBgColor?: string, iconColor?: string }> = 
    ({ title, value, icon, iconBgColor = 'bg-blue-100', iconColor = 'text-blue-600' }) => (
  <Card className="shadow-md">
    <div className="flex items-center p-4">
      <div className={`p-3 rounded-full ${iconBgColor} ${iconColor}`}>
        {React.cloneElement(icon as React.ReactElement<IconProps>, {className: "w-7 h-7"})}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </Card>
);

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

  return (
    <div className="space-y-6">
      <Card title={t('navigation.settings.dashboard')} className="bg-white shadow-xl">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard title={t('userManagement.totalUsers')} value={totalUsers} icon={<UsersIcon />} iconBgColor="bg-green-100" iconColor="text-green-600"/>
            <StatCard title={t('userManagement.totalUsers')} value={totalStudents} icon={<UsersIcon />} iconBgColor="bg-blue-100" iconColor="text-blue-600"/>
            <StatCard title="Total Staff" value={totalStaff} icon={<UsersIcon />} iconBgColor="bg-purple-100" iconColor="text-purple-600"/>
            <StatCard title="System Status" value={systemStatus} icon={<CogIcon />} iconBgColor="bg-orange-100" iconColor="text-orange-600"/>
          </div>

          <Card title="Settings Categories" className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                <Button as={Link} to="/settings/unified" variant="outline" leftIcon={<CogIcon className="w-5 h-5"/>}>
                    {t('navigation.settings.unified')}
                </Button>
                <Button as={Link} to="/settings/features" variant="outline" leftIcon={<CogIcon className="w-5 h-5"/>}>
                    {t('navigation.settings.features')}
                </Button>
                <Button as={Link} to="/settings/modules" variant="outline" leftIcon={<CircleStackIcon className="w-5 h-5"/>}>
                    {t('navigation.settings.modules')}
                </Button>
                <Button as={Link} to="/settings/school-profile" variant="outline" leftIcon={<IdentificationIcon className="w-5 h-5"/>}>
                    {t('navigation.settings.schoolProfile')}
                </Button>
                <Button as={Link} to="/settings/audit-log" variant="outline" leftIcon={<ClockIcon className="w-5 h-5"/>}>
                    {t('navigation.settings.auditLog')}
                </Button>
                <Button as={Link} to="/settings/data-management" variant="outline" leftIcon={<CircleStackIcon className="w-5 h-5"/>}>
                    {t('navigation.settings.dataManagement')}
                </Button>
            </div>
          </Card>
          
          <div className="text-center py-8 mt-6">
            <CogIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">System Settings &amp; Configuration Hub</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Manage system configuration, user accounts, modules, and school settings. 
              Configure features and monitor system activity across all school operations.
            </p>
             <div className="mt-6">
              <span className="inline-block bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full">
                Dashboard provides quick access to all settings categories and system overview.
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsDashboardPage;
