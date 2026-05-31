import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { CogIcon, IdentificationIcon, UserGroupIcon, CalendarDaysIcon, ShieldCheckIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import { Link } from 'react-router-dom';

export const SettingsGeneralContent: React.FC = () => {
  const { t } = useTranslation(['settings', 'common', 'navigation']);
  const { schoolDetails, users, isDatabaseModeActive } = useAppData();

  return (
    <div className="space-y-6">
      <Card title={t('general.title')}>
        <div className="text-center py-8">
          <CogIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">{t('general.appSettingsHeader')}</h2>
          <p className="text-gray-500">{t('general.appSettingsDescription')}</p>
        </div>
      </Card>

      {/* School Profile Overview */}
      <Card title={t('schoolProfile.title')}>
        <div className="flex items-start space-x-4">
          <IdentificationIcon className="w-8 h-8 text-indigo-500 mt-1" />
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('schoolProfile.nameLabel')}
                </label>
                <p className="text-gray-900">{schoolDetails?.name || t('schoolProfile.notConfigured')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('schoolProfile.codeLabel')}
                </label>
                <p className="text-gray-900">{schoolDetails?.school_code || t('schoolProfile.noCode')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('schoolProfile.emailLabel')}
                </label>
                <p className="text-gray-900">{schoolDetails?.email || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('schoolProfile.telephoneLabel')}
                </label>
                <p className="text-gray-900">{schoolDetails?.telephone || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('schoolProfile.headTeacherLabel')}
                </label>
                <p className="text-gray-900">{schoolDetails?.head_teacher || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('schoolProfile.genderLabel')}
                </label>
                <p className="text-gray-900">
                  {schoolDetails?.gender === 'mixed' && t('schoolProfile.genderMixed')}
                  {schoolDetails?.gender === 'boys' && t('schoolProfile.genderBoys')}
                  {schoolDetails?.gender === 'girls' && t('schoolProfile.genderGirls')}
                  {!schoolDetails?.gender && '-'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link 
                to="/settings/school-profile" 
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                {t('schoolProfile.manageProfile')} →
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* User Management Overview */}
      <Card title={t('userManagement.title')}>
        <div className="flex items-start space-x-4">
          <UserGroupIcon className="w-8 h-8 text-blue-500 mt-1" />
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('userManagement.totalUsers')}
                </label>
                <p className="text-2xl font-semibold text-gray-900">{users ? users.length : 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Active Users
                </label>
                <p className="text-2xl font-semibold text-green-600">
                  {users ? users.filter(user => user.isActive).length : 0}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inactive Users
                </label>
                <p className="text-2xl font-semibold text-red-600">
                  {users ? users.filter(user => !user.isActive).length : 0}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link 
                to="/settings/users" 
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                {t('userManagement.manageUsers')} →
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Academic Calendar Overview */}
      <Card title={t('academicCalendar.setupTitle')}>
        <div className="flex items-start space-x-4">
          <CalendarDaysIcon className="w-8 h-8 text-green-500 mt-1" />
          <div className="flex-1">
            <p className="text-gray-600 mb-4">{t('academicCalendar.description')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link 
                to="/administration/academic-structures" 
                className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <h4 className="font-medium text-gray-900">{t('academicCalendar.linkAcademicStructures')}</h4>
                <p className="text-sm text-gray-500">Configure term/semester structures</p>
              </Link>
              <Link 
                to="/administration/academic-period-definitions" 
                className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <h4 className="font-medium text-gray-900">{t('academicCalendar.linkAcademicPeriodDefinitions')}</h4>
                <p className="text-sm text-gray-500">Define academic period types</p>
              </Link>
              <Link 
                to="/administration/academic-years" 
                className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <h4 className="font-medium text-gray-900">{t('academicCalendar.linkAcademicYears')}</h4>
                <p className="text-sm text-gray-500">Manage academic years</p>
              </Link>
              <Link 
                to="/administration/school-periods" 
                className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <h4 className="font-medium text-gray-900">{t('academicCalendar.linkSchoolPeriods')}</h4>
                <p className="text-sm text-gray-500">Configure terms and semesters</p>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Roles & Permissions Overview */}
      <Card title={t('rolesPermissions.title')}>
        <div className="flex items-start space-x-4">
          <ShieldCheckIcon className="w-8 h-8 text-purple-500 mt-1" />
          <div className="flex-1">
            <p className="text-gray-600 mb-4">{t('rolesPermissions.description')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link 
                to="/settings/users" 
                className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <h4 className="font-medium text-gray-900">{t('navigation:settings.users')}</h4>
                <p className="text-sm text-gray-500">Manage user accounts and role assignments</p>
              </Link>
              <Link 
                to="/settings/workflows" 
                className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <h4 className="font-medium text-gray-900">{t('navigation:settings.workflows')}</h4>
                <p className="text-sm text-gray-500">Configure approval processes</p>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* System Information */}
      <Card title="System Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Mode
            </label>
            <p className="text-gray-900">
              {isDatabaseModeActive ? 'Local Database' : 'Mock Data'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Application Version
            </label>
            <p className="text-gray-900">SchoolPilot3 v1.0.0</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const SettingsGeneralPage: React.FC = () => {
  return <SettingsGeneralContent />;
};

export default SettingsGeneralPage;