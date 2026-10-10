// ABOUTME: System management hub page
// ABOUTME: Consolidates data layer, module management, and plugin management

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  CircleStackIcon,
  PuzzlePieceIcon,
  ViewColumnsIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@/components/ui/icons';
import { DataLayerSettingsContent } from './DataLayerSettingsPage';
import { ModuleManagementContent } from './ModuleManagementPage';
import { ModuleDependencyReportContent } from './ModuleDependencyReportPage';
import { PluginSettingsContent } from './PluginSettingsPage';
import { DatabaseBackupContent } from './DatabaseBackupPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const SystemManagementPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'data-layer',
      label: t('navigation.settings.dataLayer', 'Data Layer'),
      icon: <CircleStackIcon className="w-4 h-4" />,
      component: <DataLayerSettingsContent />,
    },
    {
      id: 'modules',
      label: t('navigation.settings.modules', 'Modules'),
      icon: <ViewColumnsIcon className="w-4 h-4" />,
      component: <ModuleManagementContent />,
    },
    {
      id: 'dependencies',
      label: t('navigation.settings.dependencyReport', 'Dependencies'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <ModuleDependencyReportContent />,
    },
    {
      id: 'plugins',
      label: t('navigation.settings.plugins', 'Plugins'),
      icon: <PuzzlePieceIcon className="w-4 h-4" />,
      component: <PluginSettingsContent />,
    },
    {
      id: 'backup',
      label: t('navigation.settings.backup', 'Backup & Restore'),
      icon: <ClockIcon className="w-4 h-4" />,
      component: <DatabaseBackupContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'data-layer';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'data-layer') {
        navigate('/settings/system', { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [navigate, setSearchParams]
  );

  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('systemManagement.title', 'System Management')}
        subtitle={t('systemManagement.subtitle', 'Manage data layer, modules, dependencies, and plugins')}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="indigo"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default SystemManagementPage;
