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
  const bodies: Record<SettingsTabId<'/settings/system'>, Pick<SettingsHubTab, 'icon' | 'render'>> = {
    'data-layer': {
      icon: <CircleStackIcon className="w-4 h-4" />,
      render: () => <DataLayerSettingsContent />,
    },
    sync: {
      icon: <ArrowPathIcon className="w-4 h-4" />,
      render: () => (
        <div className="space-y-6">
          <SyncConflictsPanel />
          <BackendSyncSettings />
        </div>
      ),
    },
    backup: {
      icon: <ClockIcon className="w-4 h-4" />,
      render: () => <DatabaseBackupContent />,
    },
    integrity: {
      icon: <ShieldCheckIcon className="w-4 h-4" />,
      render: () => <DataIntegrityTab />,
    },
    health: {
      icon: <HeartIcon className="w-4 h-4" />,
      render: () => <SystemHealthContent />,
    },
  };

  return (
    <SettingsHub
      title={t(HUB.title.key, HUB.title.text)}
      info={t(HUB.info.key, HUB.info.text)}
      tabs={HUB.tabs.map((tab) => ({ id: tab.id, label: t(tab.label.key, tab.label.text), ...bodies[tab.id] }))}
      defaultTab={HUB.defaultTab}
      movedTabs={MOVED_TABS}
      banner={<StorageWarning />}
      colorScheme="indigo"
    />
  );
};

export default DataAndSystemPage;
