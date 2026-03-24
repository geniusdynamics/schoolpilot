// ABOUTME: Advanced tab settings including legacy tabbed mode controls
import React from 'react';
import { useTranslation } from 'react-i18next';
import { default as Card } from '../../../../components/ui/Card';
import { default as Checkbox } from '../../../../components/ui/Checkbox';
import { useUnifiedConfig } from '../../../../hooks/useUnifiedConfig';
import { moduleRegistry } from '../../../../core/moduleRegistry';
import { useToastHelpers } from '../../../../hooks/useToast';

const AdvancedTab: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { config, updateTabsConfig } = useUnifiedConfig();
  const { showSuccess, showError } = useToastHelpers();
  
  const advancedConfig = config.tabs?.advanced || {
    sessionRestoreGranularity: 'all',
    memorySuspendTimeout: 300000,
    extensionOverrides: false,
    debuggingTelemetry: false,
    enableTabbedMode: true,
    enablePerModuleControl: true,
    tabbedModeModuleOverrides: {}
  };

  const handleChange = (key: string, value: any) => {
    updateTabsConfig({
      advanced: {
        ...advancedConfig,
        [key]: value
      }
    });
    showSuccess(t('common:saved'));
  };

  const handleModuleOverrideToggle = (moduleId: string, enabled: boolean) => {
    const newOverrides = {
      ...advancedConfig.tabbedModeModuleOverrides,
      [moduleId]: enabled
    };
    updateTabsConfig({
      advanced: {
        ...advancedConfig,
        tabbedModeModuleOverrides: newOverrides
      }
    });
    showSuccess(t('settings:tabbedMode.moduleOverrideUpdated', { module: moduleId }));
  };

  const availableModules = moduleRegistry.getEnabledModules();

  return (
    <div className="space-y-6">
      <Card title="Advanced Settings" className="shadow-sm">
        <div className="space-y-4 p-4">
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Session Restore Granularity</label>
            <select 
              className="border border-gray-300 rounded-md p-2"
              value={advancedConfig.sessionRestoreGranularity}
              onChange={(e) => handleChange('sessionRestoreGranularity', e.target.value)}
            >
              <option value="all">Restore All Tabs</option>
              <option value="pinned">Restore Pinned Only</option>
              <option value="none">Do Not Restore</option>
            </select>
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Memory Suspend Timeout (ms)</label>
            <input 
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={advancedConfig.memorySuspendTimeout}
              onChange={(e) => handleChange('memorySuspendTimeout', parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <h4 className="font-medium text-gray-900">Extension Controlled Tab Overrides</h4>
              <p className="text-sm text-gray-500 mt-1">Allow extensions to manage tabs</p>
            </div>
            <Checkbox
              checked={advancedConfig.extensionOverrides}
              onChange={(checked) => handleChange('extensionOverrides', checked)}
              aria-label="Extension Overrides"
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <h4 className="font-medium text-gray-900">Debugging Telemetry</h4>
              <p className="text-sm text-gray-500 mt-1">Enable verbose logging for tab behavior</p>
            </div>
            <Checkbox
              checked={advancedConfig.debuggingTelemetry}
              onChange={(checked) => handleChange('debuggingTelemetry', checked)}
              aria-label="Debugging Telemetry"
            />
          </div>
        </div>
      </Card>

      {/* Migrated Legacy Settings */}
      <Card title="Legacy Tabbed Mode Overrides" className="shadow-sm">
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <h4 className="font-medium text-gray-900">Enable Global Tabbed Mode</h4>
            </div>
            <Checkbox
              checked={advancedConfig.enableTabbedMode}
              onChange={(checked) => handleChange('enableTabbedMode', checked)}
              aria-label="Enable Global"
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <h4 className="font-medium text-gray-900">Enable Per-Module Control</h4>
            </div>
            <Checkbox
              checked={advancedConfig.enablePerModuleControl}
              onChange={(checked) => handleChange('enablePerModuleControl', checked)}
              aria-label="Enable Per-Module Control"
            />
          </div>

          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Module Overrides</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {availableModules.map(module => (
                <div key={module.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="capitalize">{module.name.replace('navigation:', '').replace('.title', '')}</span>
                  <Checkbox
                    checked={advancedConfig.tabbedModeModuleOverrides[module.id] ?? false}
                    onChange={(checked) => handleModuleOverrideToggle(module.id, checked)}
                    disabled={!advancedConfig.enablePerModuleControl}
                    aria-label={`Toggle override for ${module.id}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdvancedTab;
