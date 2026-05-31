// ABOUTME: Settings configuration hub page
// ABOUTME: Consolidates general settings, unified settings, feature flags, and legacy general settings

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  CogIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  WrenchIcon,
} from '@/components/ui/icons';
import { SettingsContent } from './SettingsPage';
import { UnifiedSettingsContent } from './UnifiedSettingsPage';
import { FeatureSettingsContent } from './FeatureSettingsPage';
import { SettingsGeneralContent } from './SettingsGeneralPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const ConfigurationHubPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'settings',
      label: t('navigation.settings.dashboard', 'Main Settings'),
      icon: <CogIcon className="w-4 h-4" />,
      component: <SettingsContent />,
    },
    {
      id: 'unified',
      label: t('navigation.settings.unified', 'Unified Settings'),
      icon: <AdjustmentsHorizontalIcon className="w-4 h-4" />,
      component: <UnifiedSettingsContent />,
    },
    {
      id: 'features',
      label: t('navigation.settings.features', 'Feature Flags'),
      icon: <SparklesIcon className="w-4 h-4" />,
      component: <FeatureSettingsContent />,
    },
    {
      id: 'general',
      label: t('navigation.settings.general', 'General'),
      icon: <WrenchIcon className="w-4 h-4" />,
      component: <SettingsGeneralContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'settings';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'settings') {
        navigate('/settings/configuration', { replace: true });
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
        title={t('configuration.title', 'System Configuration')}
        subtitle={t('configuration.subtitle', 'Manage system settings, feature flags, and general preferences')}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="slate"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default ConfigurationHubPage;
