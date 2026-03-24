// ABOUTME: Consolidated Tabs Settings Page
// ABOUTME: Provides a cohesive interface for managing all tab-related configuration

import React, { useState } from 'react';
import BreadcrumbNavigation from '../../../components/BreadcrumbNavigation';
import { 
  CogIcon,
  AdjustmentsHorizontalIcon,
  PaintBrushIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import GeneralTab from '../components/tabs/GeneralTab';
import BehaviorTab from '../components/tabs/BehaviorTab';
import AppearanceTab from '../components/tabs/AppearanceTab';
import AdvancedTab from '../components/tabs/AdvancedTab';

const TabSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'behavior' | 'appearance' | 'advanced'>('general');

  const tabs = [
    { id: 'general', label: 'General', icon: CogIcon },
    { id: 'behavior', label: 'Behavior', icon: AdjustmentsHorizontalIcon },
    { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
    { id: 'advanced', label: 'Advanced', icon: WrenchScrewdriverIcon }
  ] as const;

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <BreadcrumbNavigation />
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Tabs Settings
        </h1>
        <p className="text-gray-600">
          Configure general behavior, appearance, and advanced options for the tabbed workspace.
        </p>
      </div>
      
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'behavior' && <BehaviorTab />}
        {activeTab === 'appearance' && <AppearanceTab />}
        {activeTab === 'advanced' && <AdvancedTab />}
      </div>
    </div>
  );
};

export default TabSettingsPage;
