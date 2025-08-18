// ABOUTME: Tab settings page component
// ABOUTME: Provides UI for configuring tab-related features with internal tabs

import React from 'react';
import { useTranslation } from 'react-i18next';
import TabSettings from '../../../components/TabSettings';
import BreadcrumbNavigation from '../../../components/BreadcrumbNavigation';

const TabSettingsPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  
  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb Navigation - handled automatically by BreadcrumbNavigation component */}
      <div className="mb-4">
        <BreadcrumbNavigation />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <TabSettings />
      </div>
    </div>
  );
};

export default TabSettingsPage;