// ABOUTME: Tab settings page component
// ABOUTME: Provides UI for configuring tab-related features with internal tabs

import React from 'react';
// import TabSettings from '@/components/TabSettings';
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';

export const TabSettingsContent: React.FC = () => {
  // const { t } = useTranslation(['settings', 'common']);
  
  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb Navigation - handled automatically by BreadcrumbNavigation component */}
      <div className="mb-4">
        <BreadcrumbNavigation />
      </div>
      
      {/* Page Header */}
      <PageHeaderWithTabs
        title="Tabbed Mode Settings"
        info="Configure and manage tabbed mode functionality"
      />
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* <TabSettings /> */}
        <div className="p-4 bg-surface-muted border rounded text-surface-muted-fg">
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
