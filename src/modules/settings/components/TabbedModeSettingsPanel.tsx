// ABOUTME: Settings panel for controlling tabbed mode feature flags
// ABOUTME: Allows administrators to enable/disable tabbed mode per module

import React, { useState, useEffect } from 'react';
import { TabbedModeFeatureFlag, tabbedModeFeatureFlag, setTabbedModeModuleOverride, updateTabbedModeConfig } from '../../../services/tabbedModeFeatureFlag';
import { moduleRegistry } from '../../../core/moduleRegistry';
import { default as Card } from '../../../components/ui/Card';
import { default as Checkbox } from '../../../components/ui/Checkbox';
import { default as Button } from '../../../components/ui/Button';
import { useToastHelpers } from '../../../hooks/useToast';
import TabbedModeDemo from './TabbedModeDemo';

const TabbedModeSettingsPanel: React.FC = () => {
  // const { t } = useTranslation(['settings', 'common']);
  const { showSuccess, showError } = useToastHelpers();
  
  const [globalEnabled, setGlobalEnabled] = useState(tabbedModeFeatureFlag.isGloballyEnabled());
  const [perModuleControl, setPerModuleControl] = useState(tabbedModeFeatureFlag.isPerModuleControlEnabled());
  const [moduleOverrides, setModuleOverrides] = useState<Record<string, boolean>>(tabbedModeFeatureFlag.getModuleOverrides());
  
  // Update state when feature flag config changes
  useEffect(() => {
    const updateState = () => {
      setGlobalEnabled(tabbedModeFeatureFlag.isGloballyEnabled());
      setPerModuleControl(tabbedModeFeatureFlag.isPerModuleControlEnabled());
      setModuleOverrides({ ...tabbedModeFeatureFlag.getModuleOverrides() });
    };
    
    updateState();
    
    // Listen for config changes (if implemented)
    // For now, we'll just update on component mount
  }, []);
  
  // Handle global tabbed mode toggle
  const handleGlobalToggle = (enabled: boolean) => {
    try {
      updateTabbedModeConfig({
        globalEnabled: enabled
      });
      setGlobalEnabled(enabled);
      showSuccess(t('settings:tabbedMode.globalEnabledUpdated'));
    } catch (error) {
      console.error('Failed to update global tabbed mode setting:', error);
      showError(t('settings:tabbedMode.globalEnabledUpdateFailed'));
    }
  };
  
  // Handle per-module control toggle
  const handlePerModuleControlToggle = (enabled: boolean) => {
    try {
      updateTabbedModeConfig({
        enablePerModuleControl: enabled
      });
      setPerModuleControl(enabled);
      showSuccess(t('settings:tabbedMode.perModuleControlUpdated'));
    } catch (error) {
      console.error('Failed to update per-module control setting:', error);
      showError(t('settings:tabbedMode.perModuleControlUpdateFailed'));
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
      showSuccess(t('settings:tabbedMode.moduleOverrideUpdated', { module: moduleId }));
    } catch (error) {
      console.error(`Failed to update module override for ${moduleId}:`, error);
      showError(t('settings:tabbedMode.moduleOverrideUpdateFailed', { module: moduleId }));
    }
  };
  
  // Reset to defaults
  const handleResetDefaults = () => {
    try {
      tabbedModeFeatureFlag.resetConfig();
      setGlobalEnabled(tabbedModeFeatureFlag.isGloballyEnabled());
      setPerModuleControl(tabbedModeFeatureFlag.isPerModuleControlEnabled());
      setModuleOverrides({ ...tabbedModeFeatureFlag.getModuleOverrides() });
      showSuccess(t('settings:tabbedMode.resetToDefaultsSuccess'));
    } catch (error) {
      console.error('Failed to reset to defaults:', error);
      showError(t('settings:tabbedMode.resetToDefaultsFailed'));
    }
  };
  
  // Get all available modules
  const availableModules = moduleRegistry.getEnabledModules();
  
  return (
    <div className="space-y-6">
      <Card title={t('settings:tabbedMode.title')} className="shadow-sm">
        <div className="prose max-w-none">
          <p className="text-gray-600 mb-6">
            {t('settings:tabbedMode.description')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Global Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('settings:tabbedMode.globalSettings')}
              </h3>
              
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {t('settings:tabbedMode.enableGlobal')}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('settings:tabbedMode.enableGlobalDescription')}
                  </p>
                </div>
                <Checkbox
                  checked={globalEnabled}
                  onChange={(e) => handleGlobalToggle(e.target.checked)}
                  aria-label={t('settings:tabbedMode.enableGlobal')}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {t('settings:tabbedMode.enablePerModuleControl')}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('settings:tabbedMode.moduleOverrides')}
                </h3>
                <span className="text-sm text-gray-500">
                  {Object.keys(moduleOverrides).filter(id => moduleOverrides[id]).length} {t('common:enabled')}
                </span>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-3">
                {availableModules.map(module => (
                  <div 
                    key={module.id} 
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">
                        {module.name.replace('navigation:', '').replace('.title', '')}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {module.description ? t(module.description) : t('common:noDescription')}
                      </p>
                    </div>
                    <Checkbox
                      checked={moduleOverrides[module.id] ?? false}
                      onChange={(e) => handleModuleOverrideToggle(module.id, e.target.checked)}
                      aria-label={t('settings:tabbedMode.toggleModuleOverride', { 
                        module: module.name.replace('navigation:', '').replace('.title', '') 
                      })}
                      disabled={!perModuleControl}
                    />
                  </div>
                ))}
                
                {availableModules.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {t('settings:tabbedMode.noModulesAvailable')}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={handleResetDefaults}
              className="mr-3"
            >
              {t('common:resetToDefaults')}
            </Button>
            <Button variant="primary">
              {t('common:saveChanges')}
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Tabbed Mode Demo */}
      <TabbedModeDemo />
      
      {/* Help Information */}
      <Card title={t('common:helpAndSupport')} className="shadow-sm">
        <div className="prose max-w-none">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {t('settings:tabbedMode.helpTitle')}
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li>
              <strong>{t('settings:tabbedMode.helpGlobalToggle')}:</strong> {t('settings:tabbedMode.helpGlobalToggleDescription')}
            </li>
            <li>
              <strong>{t('settings:tabbedMode.helpPerModuleControl')}:</strong> {t('settings:tabbedMode.helpPerModuleControlDescription')}
            </li>
            <li>
              <strong>{t('settings:tabbedMode.helpModuleOverrides')}:</strong> {t('settings:tabbedMode.helpModuleOverridesDescription')}
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default TabbedModeSettingsPanel;