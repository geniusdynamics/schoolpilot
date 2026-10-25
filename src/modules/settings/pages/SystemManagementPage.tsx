// ABOUTME: System management hub page
// ABOUTME: Consolidates data layer, module management, and plugin management

import React, { useState, useCallback, useSyncExternalStore } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  CircleStackIcon,
  ClockIcon,
  HeartIcon,
} from '@/components/ui/icons';
import { DataLayerSettingsContent } from './DataLayerSettingsPage';
import { DatabaseBackupContent } from './DatabaseBackupPage';
import { SystemHealthContent } from './SystemHealthPage';
import {
  getSQLiteStorageStatus,
  subscribeSQLiteStorageStatus,
  type SQLiteStorageMode,
} from '@/services/database/SQLiteWASMProvider';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

/** Shows where SQLite keeps data and whether the browser granted persistent storage. */
const StorageStatusPanel: React.FC = () => {
  const { t } = useTranslation('settings');
  const status = useSyncExternalStore(subscribeSQLiteStorageStatus, getSQLiteStorageStatus);

  const modeLabels: Record<SQLiteStorageMode, string> = {
    'opfs-sahpool': t('systemManagement.storage.mode.opfs', 'Persistent (OPFS)'),
    memory: t('systemManagement.storage.mode.memory', 'Temporary (memory only)'),
    unavailable: t('systemManagement.storage.mode.unavailable', 'Unavailable'),
    uninitialised: t('systemManagement.storage.mode.uninitialised', 'Not opened yet'),
  };
  const persistedLabel =
    status.persisted === true
      ? t('systemManagement.storage.persisted.yes', 'Yes')
      : status.persisted === false
        ? t('systemManagement.storage.persisted.no', 'No')
        : t('systemManagement.storage.persisted.unknown', 'Unknown');

  return (
    <div data-testid="storage-status" className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <h2 className="mb-2 font-semibold text-slate-800">{t('systemManagement.storage.title', 'Browser storage')}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-slate-500">{t('systemManagement.storage.modeLabel', 'Storage mode')}</dt>
        <dd className={status.mode === 'opfs-sahpool' ? 'text-slate-800' : 'font-semibold text-red-700'}>
          {modeLabels[status.mode]}
        </dd>
        <dt className="text-slate-500">{t('systemManagement.storage.persistedLabel', 'Persistent storage granted')}</dt>
        <dd className={status.persisted === false ? 'font-semibold text-amber-700' : 'text-slate-800'}>{persistedLabel}</dd>
      </dl>
    </div>
  );
};

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
      id: 'backup',
      label: t('navigation.settings.backup', 'Backup & Restore'),
      icon: <ClockIcon className="w-4 h-4" />,
      component: <DatabaseBackupContent />,
    },
    {
      id: 'health',
      label: t('navigation.settings.health', 'System Health'),
      icon: <HeartIcon className="w-4 h-4" />,
      component: <SystemHealthContent />,
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
        info={t('systemManagement.subtitle', 'Manage data layer, modules, dependencies, and plugins')}
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
        <StorageStatusPanel />
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default SystemManagementPage;
