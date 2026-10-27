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
  const bodies: Record<SettingsTabId<'/settings/modules'>, Pick<SettingsHubTab, 'icon' | 'render'>> = {
    modules: {
      icon: <ViewColumnsIcon className="w-4 h-4" />,
      render: () => <ModulesTab />,
    },
    features: {
      icon: <SparklesIcon className="w-4 h-4" />,
      render: () => <FeaturesTab />,
    },
    plugins: {
      icon: <PuzzlePieceIcon className="w-4 h-4" />,
      render: () => <PluginSettingsContent />,
    },
  };

  return (
    <SettingsHub
      title={t(HUB.title.key, HUB.title.text)}
      info={t(HUB.info.key, HUB.info.text)}
      tabs={HUB.tabs.map((tab) => ({ id: tab.id, label: t(tab.label.key, tab.label.text), ...bodies[tab.id] }))}
      defaultTab={HUB.defaultTab}
      colorScheme="purple"
    />
  );
};

export default ModulesAndFeaturesPage;
