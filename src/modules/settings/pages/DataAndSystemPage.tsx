// ABOUTME: The Data & System hub: where the school's data lives and how it is kept safe - the data layer, sync, backup and
// ABOUTME: restore, integrity checks and health - on one row of tabs, with no tab strip inside any of them.

import React from 'react';
import { useTranslation } from 'react-i18next';

import { ArrowPathIcon, CircleStackIcon, ClockIcon, HeartIcon, ShieldCheckIcon } from '@/components/ui/icons';

import { BackendSyncSettings } from '../components/BackendSyncSettings';
import { DataIntegrityTab } from '../components/DataIntegrityTab';
import { SettingsHub, type SettingsHubTab } from '../components/SettingsHub';
import { StorageWarning } from '../components/StorageWarning';
import { SyncConflictsPanel } from '../components/SyncConflictsPanel';
import { SETTINGS_HUBS, type SettingsTabId } from '../hubTabs';
import { DatabaseBackupContent } from './DatabaseBackupPage';
import { DataLayerSettingsContent } from './DataLayerSettingsPage';
import { SystemHealthContent } from './SystemHealthPage';

const HUB = SETTINGS_HUBS['/settings/system'];

/** Old `?tab=` values of the System Management hub whose page lives in the Modules & Features hub now. */
const MOVED_TABS: Readonly<Record<string, string>> = {
  modules: '/settings/modules',
  dependencies: '/settings/modules',
  plugins: '/settings/modules?tab=plugins',
};

const DataAndSystemPage: React.FC = () => {
  const { t } = useTranslation('settings');

  // Keyed by the shared tab list, so a tab added to or removed from it fails to compile here.
  const bodies: Record<SettingsTabId<'/settings/system'>, Omit<SettingsHubTab, 'id'>> = {
    'data-layer': {
      label: t('dataSystem.tabs.dataLayer', 'Data Layer'),
      icon: <CircleStackIcon className="w-4 h-4" />,
      render: () => <DataLayerSettingsContent />,
    },
    sync: {
      label: t('dataSystem.tabs.sync', 'Sync'),
      icon: <ArrowPathIcon className="w-4 h-4" />,
      render: () => (
        <div className="space-y-6">
          <SyncConflictsPanel />
          <BackendSyncSettings />
        </div>
      ),
    },
    backup: {
      label: t('dataSystem.tabs.backup', 'Backup & Restore'),
      icon: <ClockIcon className="w-4 h-4" />,
      render: () => <DatabaseBackupContent />,
    },
    integrity: {
      label: t('dataSystem.tabs.integrity', 'Data Integrity'),
      icon: <ShieldCheckIcon className="w-4 h-4" />,
      render: () => <DataIntegrityTab />,
    },
    health: {
      label: t('dataSystem.tabs.health', 'System Health'),
      icon: <HeartIcon className="w-4 h-4" />,
      render: () => <SystemHealthContent />,
    },
  };

  return (
    <SettingsHub
      title={t('dataSystem.title', 'Data & System')}
      info={t(
        'dataSystem.subtitle',
        "Where the school's data lives and how it is kept safe: the data layer, sync, backups, integrity checks and system health"
      )}
      tabs={HUB.tabs.map((id) => ({ id, ...bodies[id] }))}
      defaultTab={HUB.defaultTab}
      movedTabs={MOVED_TABS}
      banner={<StorageWarning />}
      colorScheme="indigo"
    />
  );
};

export default DataAndSystemPage;
