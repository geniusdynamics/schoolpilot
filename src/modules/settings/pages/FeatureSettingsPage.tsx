// ABOUTME: Feature settings page that provides access to feature flags, offline capabilities, and application status
// ABOUTME: Integrates the FeatureSettings component into the settings module navigation

import React from 'react';
import { useTranslation } from 'react-i18next';
import FeatureSettings from '@/components/FeatureSettings';
import { useRBAC } from '@/hooks/useRBAC';

export const FeatureSettingsContent: React.FC = () => {
  const { t } = useTranslation('settings');
  const { hasPermission } = useRBAC();

  // Check if user has permission to access feature settings
  if (!hasPermission('settings.view')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-surface-foreground mb-2">
            {t('accessDeniedTitle')}
          </h2>
          <p className="text-surface-muted-fg">
            {t('accessDeniedMessage')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FeatureSettings />
    </div>
  );
};

const FeatureSettingsPage: React.FC = () => {
  return <FeatureSettingsContent />;
};

export default FeatureSettingsPage;
