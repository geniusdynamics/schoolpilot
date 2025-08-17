// ABOUTME: Simple test component to verify tabbed mode feature flag functionality
// ABOUTME: Shows current tabbed mode status and allows toggling for testing

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isTabbedModeEnabled, setTabbedModeModuleOverride, updateTabbedModeConfig, tabbedModeFeatureFlag } from '../../../services/tabbedModeFeatureFlag';
import Card from '../../../components/ui/Card';
import { default as Checkbox } from '../../../components/ui/Checkbox';
import Button from '../../../components/ui/Button';
import { extractModuleId } from '../../../utils/moduleUtils';

const TabbedModeTestPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [isTabbedMode, setIsTabbedMode] = useState(isTabbedModeEnabled('dashboard'));
  const [globalEnabled, setGlobalEnabled] = useState(tabbedModeFeatureFlag.isGloballyEnabled());
  const [perModuleControl, setPerModuleControl] = useState(tabbedModeFeatureFlag.isPerModuleControlEnabled());
  const [moduleOverrides, setModuleOverrides] = useState<Record<string, boolean>>(tabbedModeFeatureFlag.getModuleOverrides());

  // Update state when feature flag config changes
  useEffect(() => {
    const updateState = () => {
      setIsTabbedMode(isTabbedModeEnabled(currentModule));
      setGlobalEnabled(tabbedModeFeatureFlag.isGloballyEnabled());
      setPerModuleControl(tabbedModeFeatureFlag.isPerModuleControlEnabled());
      setModuleOverrides({ ...tabbedModeFeatureFlag.getModuleOverrides() });
    };

    updateState();
  }, [currentModule]);

  // Handle module change
  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentModule(e.target.value);
  };

  // Handle global toggle
  const handleGlobalToggle = (enabled: boolean) => {
    try {
      updateTabbedModeConfig({
        globalEnabled: enabled
      });
      setGlobalEnabled(enabled);
    } catch (error) {
      console.error('Failed to update global setting:', error);
    }
  };

  // Handle per-module control toggle
  const handlePerModuleControlToggle = (enabled: boolean) => {
    try {
      updateTabbedModeConfig({
        enablePerModuleControl: enabled
      });
      setPerModuleControl(enabled);
    } catch (error) {
      console.error('Failed to update per-module control setting:', error);
    }
  };

  // Handle module override toggle
  const handleModuleOverrideToggle = (moduleId: string, enabled: boolean) => {
    try {
      setTabbedModeModuleOverride(moduleId, enabled);
      setModuleOverrides(prev => ({
        ...prev,
        [moduleId]: enabled
      }));
      // Update current module status if it matches
      if (moduleId === currentModule) {
        setIsTabbedMode(enabled);
      }
    } catch (error) {
      console.error(`Failed to update module override for ${moduleId}:`, error);
    }
  };

  // Test modules
  const testModules = [
    'dashboard',
    'settings',
    'reports',
    'academics',
    'administration',
    'finance',
    'hr',
    'inventory',
    'library',
    'nutrition',
    'admissions',
    'audit'
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {t('settings:tabbedMode.testPageTitle')}
      </h1>
      <p className="text-gray-600 mb-8">
        {t('settings:tabbedMode.testPageDescription')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Current Status Card */}
        <Card title={t('settings:tabbedMode.currentStatus')} className="shadow-sm">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings:tabbedMode.selectModule')}
              </label>
              <select
                value={currentModule}
                onChange={handleModuleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {testModules.map(module => (
                  <option key={module} value={module}>
                    {module.charAt(0).toUpperCase() + module.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {t('settings:tabbedMode.tabbedModeStatus')}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {currentModule.charAt(0).toUpperCase() + currentModule.slice(1)} Module
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isTabbedMode 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {isTabbedMode ? t('common:enabled') : t('common:disabled')}
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p className="mb-2">
                <strong>{t('settings:tabbedMode.evaluationLogic')}:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('settings:tabbedMode.globalCheck')}: {globalEnabled ? '✓' : '✗'}</li>
                <li>{t('settings:tabbedMode.perModuleCheck')}: {perModuleControl ? '✓' : '✗'}</li>
                <li>{t('settings:tabbedMode.moduleOverrideCheck')}: {moduleOverrides[currentModule] !== undefined ? (moduleOverrides[currentModule] ? '✓' : '✗') : 'N/A'}</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Configuration Card */}
        <Card title={t('settings:tabbedMode.configuration')} className="shadow-sm">
          <div className="space-y-6">
            {/* Global Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                {t('settings:tabbedMode.globalSettings')}
              </h3>
              
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {t('settings:tabbedMode.enableGlobal')}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings:tabbedMode.enableGlobalDescription')}
                  </p>
                </div>
                <Checkbox
                  checked={globalEnabled}
                  onChange={(e) => handleGlobalToggle(e.target.checked)}
                  aria-label={t('settings:tabbedMode.enableGlobal')}
                />
              </div>
            </div>

            {/* Per-Module Control */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                {t('settings:tabbedMode.perModuleControl')}
              </h3>
              
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {t('settings:tabbedMode.enablePerModuleControl')}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings:tabbedMode.enablePerModuleControlDescription')}
                  </p>
                </div>
                <Checkbox
                  checked={perModuleControl}
                  onChange={(e) => handlePerModuleControlToggle(e.target.checked)}
                  aria-label={t('settings:tabbedMode.enablePerModuleControl')}
                />
              </div>
            </div>

            {/* Module Overrides */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('settings:tabbedMode.moduleOverrides')}
                </h3>
                <span className="text-sm text-gray-500">
                  {Object.keys(moduleOverrides).filter(id => moduleOverrides[id]).length} {t('common:enabled')}
                </span>
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {testModules.map(module => (
                  <div 
                    key={module} 
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">
                        {module}
                      </h4>
                    </div>
                    <Checkbox
                      checked={moduleOverrides[module] ?? false}
                      onChange={(e) => handleModuleOverrideToggle(module, e.target.checked)}
                      aria-label={t('settings:tabbedMode.toggleModuleOverride', { module })}
                      disabled={!perModuleControl}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Test Actions */}
      <div className="mt-8 flex justify-end space-x-3">
        <Button
          variant="secondary"
          onClick={() => {
            tabbedModeFeatureFlag.resetConfig();
            setGlobalEnabled(tabbedModeFeatureFlag.isGloballyEnabled());
            setPerModuleControl(tabbedModeFeatureFlag.isPerModuleControlEnabled());
            setModuleOverrides({ ...tabbedModeFeatureFlag.getModuleOverrides() });
            setIsTabbedMode(isTabbedModeEnabled(currentModule));
          }}
        >
          {t('common:resetToDefaults')}
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            // Force refresh the current status
            setIsTabbedMode(isTabbedModeEnabled(currentModule));
          }}
        >
          {t('common:refresh')}
        </Button>
      </div>
    </div>
  );
};

export default TabbedModeTestPage;