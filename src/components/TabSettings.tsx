// ABOUTME: Tab settings component with internal tabs for configuration and testing
// ABOUTME: Consolidates tabbed mode settings and workspace test in a single interface

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CogIcon,
  WrenchIcon
} from '@heroicons/react/24/outline';
import TabbedModeSettingsPanel from '../modules/settings/components/TabbedModeSettingsPanel';
import TabbedModeTestPage from '../modules/settings/pages/TabbedModeTestPage';

interface TabSettingsProps {
  className?: string;
}

const TabSettings: React.FC<TabSettingsProps> = ({
  className = ''
}) => {
  const { t } = useTranslation(['settings', 'common']);
  const [activeTab, setActiveTab] = useState<'settings' | 'workspace'>('settings');

  const tabs = [
    { id: 'settings', label: t('settings:tabs.settingsTab'), icon: CogIcon },
    { id: 'workspace', label: t('settings:tabs.workspaceTab'), icon: WrenchIcon }
  ];

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'settings' && <TabbedModeSettingsPanel />}
        {activeTab === 'workspace' && <TabbedModeTestPage />}
      </div>
    </div>
  );
};

export default TabSettings;