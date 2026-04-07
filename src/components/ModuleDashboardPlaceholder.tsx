// ABOUTME: Placeholder component for module dashboards that don't have explicit dashboard pages
// ABOUTME: Provides a consistent dashboard experience across all modules

import React from 'react';
import { useTranslation } from 'react-i18next';
import { extractModuleId } from '@/utils/moduleUtils';

interface ModuleDashboardPlaceholderProps {
  moduleName: string;
  modulePath: string;
}

const ModuleDashboardPlaceholder: React.FC<ModuleDashboardPlaceholderProps> = ({ 
  moduleName, 
  modulePath 
}) => {
  const { t } = useTranslation(['navigation', 'common']);
  
  // Extract clean module name for display
  const cleanModuleName = extractModuleId(moduleName);
  const displayName = t(`${cleanModuleName}.title`, { 
    defaultValue: cleanModuleName.charAt(0).toUpperCase() + cleanModuleName.slice(1) 
  });

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded"></div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {displayName} {t('dashboard', 'Dashboard')}
          </h1>
          <p className="text-gray-600">
            {t('moduleDashboardWelcome', 'Welcome to the {{moduleName}} module dashboard', { moduleName: displayName })}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('gettingStarted', 'Getting Started')}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('moduleDashboardDescription', 'This is the main dashboard for the {{moduleName}} module. Use the navigation menu on the left to access different features within this module.', { moduleName: displayName })}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {t('tip', 'Tip')}
            </div>
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {t('navigation', 'Navigation')}
            </div>
            <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              {t('features', 'Features')}
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          <p>
            {t('modulePath', 'Module Path')}: <code className="bg-gray-100 px-2 py-1 rounded">{modulePath}</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModuleDashboardPlaceholder;