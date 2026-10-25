// ABOUTME: The Modules & Features hub: what this installation runs and shows - the modules, the features that can be
// ABOUTME: switched and the plugins - on one row of tabs, each with its own body and no tab strip inside it.

import React from 'react';
import { useTranslation } from 'react-i18next';

import { PuzzlePieceIcon, SparklesIcon, ViewColumnsIcon } from '@/components/ui/icons';

import { FeaturesTab } from '../components/FeaturesTab';
import { ModulesTab } from '../components/ModulesTab';
import { SettingsHub, type SettingsHubTab } from '../components/SettingsHub';
import { SETTINGS_HUBS, type SettingsTabId } from '../hubTabs';
import { PluginSettingsContent } from './PluginSettingsPage';

const HUB = SETTINGS_HUBS['/settings/modules'];

const ModulesAndFeaturesPage: React.FC = () => {
  const { t } = useTranslation('settings');

  // Keyed by the shared tab list, so a tab added to or removed from it fails to compile here.
  const bodies: Record<SettingsTabId<'/settings/modules'>, Omit<SettingsHubTab, 'id'>> = {
    modules: {
      label: t('modulesFeatures.tabs.modules', 'Modules'),
      icon: <ViewColumnsIcon className="w-4 h-4" />,
      render: () => <ModulesTab />,
    },
    features: {
      label: t('modulesFeatures.tabs.features', 'Features'),
      icon: <SparklesIcon className="w-4 h-4" />,
      render: () => <FeaturesTab />,
    },
    plugins: {
      label: t('modulesFeatures.tabs.plugins', 'Plugins'),
      icon: <PuzzlePieceIcon className="w-4 h-4" />,
      render: () => <PluginSettingsContent />,
    },
  };

  return (
    <SettingsHub
      title={t('modulesFeatures.title', 'Modules & Features')}
      info={t('modulesFeatures.subtitle', 'What this installation runs and shows: the modules, the features that can be switched, and the plugins')}
      tabs={HUB.tabs.map((id) => ({ id, ...bodies[id] }))}
      defaultTab={HUB.defaultTab}
      colorScheme="purple"
    />
  );
};

export default ModulesAndFeaturesPage;
