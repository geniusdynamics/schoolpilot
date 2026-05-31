// ABOUTME: Tab settings page component
// ABOUTME: Provides UI for configuring tab-related features with internal tabs

import React from 'react';
// import TabSettings from '@/components/TabSettings';
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation';

export const TabSettingsContent: React.FC = () => {
  // const { t } = useTranslation(['settings', 'common']);
  
  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb Navigation - handled automatically by BreadcrumbNavigation component */}
      <div className="mb-4">
        <BreadcrumbNavigation />
      </div>
      
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Tabbed Mode Settings
        </h1>
        <p className="text-gray-600">
          Configure and manage tabbed mode functionality
        </p>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* <TabSettings /> */}
        <div className="p-4 bg-gray-50 border rounded text-gray-500">
          Tab settings component is currently unavailable.
        </div>
      </div>
    </div>
  );
};

const TabSettingsPage: React.FC = () => {
  return <TabSettingsContent />;
};

export default TabSettingsPage;
