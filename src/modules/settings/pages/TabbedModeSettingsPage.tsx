// ABOUTME: Tabbed mode settings page component
// ABOUTME: Provides UI for configuring tabbed mode feature flags

import React from 'react';
import { useTranslation } from 'react-i18next';
import TabbedModeSettingsPanel from '../components/TabbedModeSettingsPanel';
import Card from '../../../components/ui/Card';
import BreadcrumbNavigation from '../../../components/BreadcrumbNavigation';

const TabbedModeSettingsPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  
  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb Navigation */}
      <div className="mb-4">
        <BreadcrumbNavigation />
      </div>
      
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('settings:tabbedMode.pageTitle')}
        </h1>
        <p className="text-gray-600">
          {t('settings:tabbedMode.pageDescription')}
        </p>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <TabbedModeSettingsPanel />
      </div>
    </div>
  );
};

export default TabbedModeSettingsPage;