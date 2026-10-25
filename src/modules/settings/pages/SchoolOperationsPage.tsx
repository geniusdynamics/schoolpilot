// ABOUTME: School operations hub page
// ABOUTME: Consolidates school profile, users, workflows, audit logs, and interface settings

import React, { useState, useCallback } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  IdentificationIcon,
  UsersIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  ViewColumnsIcon,
  ExclamationTriangleIcon,
} from '@/components/ui/icons';
import { SettingsSchoolProfileContent } from './SettingsSchoolProfilePage';
import { SettingsUsersContent } from './SettingsUsersPage';
import { SettingsWorkflowsContent } from './SettingsWorkflowsPage';
import { AuditLogContent } from './AuditLogPage';
import { TabSettingsContent } from './TabSettingsPage';
import { SyncConflictsPanel } from '../components/SyncConflictsPanel';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const SchoolOperationsPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'school-profile',
      label: t('navigation.settings.schoolProfile', 'School Profile'),
      icon: <IdentificationIcon className="w-4 h-4" />,
      component: <SettingsSchoolProfileContent />,
    },
    {
      id: 'users',
      label: t('navigation.settings.users', 'Users'),
      icon: <UsersIcon className="w-4 h-4" />,
      component: <SettingsUsersContent />,
    },
    {
      id: 'workflows',
      label: t('navigation.settings.workflows', 'Workflows'),
      icon: <ArrowsRightLeftIcon className="w-4 h-4" />,
      component: <SettingsWorkflowsContent />,
    },
    {
      id: 'audit',
      label: t('navigation.settings.auditLog', 'Audit Log'),
      icon: <ClockIcon className="w-4 h-4" />,
      component: <AuditLogContent />,
    },
    {
      id: 'sync-conflicts',
      label: t('navigation.settings.syncConflicts', 'Sync Conflicts'),
      icon: <ExclamationTriangleIcon className="w-4 h-4" />,
      component: <SyncConflictsPanel />,
    },
    {
      id: 'tabs',
      label: t('navigation.settings.tabs', 'Tab Settings'),
      icon: <ViewColumnsIcon className="w-4 h-4" />,
      component: <TabSettingsContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'school-profile';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'school-profile') {
        navigate('/settings/school', { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [navigate, setSearchParams]
  );

  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  // The Settings dashboard used to be a tab of this hub; it is the module root now. An old link to
  // ?tab=dashboard goes there rather than opening this hub on a tab that no longer exists.
  if (activeTabFromUrl === 'dashboard') {
    return <Navigate to="/settings" replace />;
  }

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('schoolOperations.title', 'School Operations')}
        info={t('schoolOperations.subtitle', 'Manage school profile, users, workflows, audit logs, and interface settings')}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="emerald"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default SchoolOperationsPage;
