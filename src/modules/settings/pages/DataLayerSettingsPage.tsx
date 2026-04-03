// ABOUTME: Settings page for data layer configuration and mode management
// ABOUTME: Provides comprehensive interface for database provider settings and mode switching

import React, { useEffect, useMemo, useState } from 'react';
import SyncManagementPanel from '../../../components/SyncManagementPanel';
import { BackendConfiguration } from '../../../components/BackendConfiguration';
import { backendArchitecture, type BackendType } from '../../../config/backendArchitecture';
import { useDataMode } from '../../../hooks/useDataMode';
import { getDatabaseOptionsForMode, getBackendOptionsForModeAndProvider, normalizeProvider, resolveConsolidatedConfigurationOption, type ApplicationSettingsMode, type BackendIntegrationType } from '../../../config/dataLayerConfig';
import { Settings, Info, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAppData } from '@/hooks/useAppData';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';
import { DataServiceFactory } from '@/services/DataServiceFactory';

export const DataLayerSettingsPage: React.FC = () => {
  const { status: dataModeStatus, switchMode, isLoading, seedData, clearData, isDemoReseedingDisabled } = useDataMode();
  const currentMode = dataModeStatus?.currentMode || 'development';
  const [activeTab, setActiveTab] = useState<'mode' | 'sync'>('mode');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { 
    syncStatus
  } = useAppData();
  
  const { config, updateConfig } = useUnifiedConfig();
  const [applicationMode, setApplicationMode] = useState<ApplicationSettingsMode>('demo');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedBackendIntegration, setSelectedBackendIntegration] = useState<BackendIntegrationType>('none');
  const [selectedBackendType, setSelectedBackendType] = useState<BackendType>('frontend-only');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [seedVolume, setSeedVolume] = useState<'tiny' | 'small' | 'medium' | 'large' | 'enterprise'>('small');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);

  const databaseOptions = useMemo(
    () => getDatabaseOptionsForMode(applicationMode),
    [applicationMode]
  );
  const backendOptions = useMemo(
    () => getBackendOptionsForModeAndProvider(applicationMode, selectedProvider as any),
    [applicationMode, selectedProvider]
  );
  const selectedConfiguration = useMemo(
    () => resolveConsolidatedConfigurationOption(applicationMode, selectedProvider as any, selectedBackendIntegration),
    [applicationMode, selectedProvider, selectedBackendIntegration]
  );

  const mapConflictResolution = (value: string | undefined) => {
    if (!value) {
      return config.database.sync.conflictResolution;
    }

    if (value === 'client-wins' || value === 'local-wins') {
      return 'local';
    }

    if (value === 'server-wins' || value === 'remote-wins' || value === 'last-write-wins') {
      return 'remote';
    }

    if (value === 'auto') {
      return 'merge';
    }

    if (value === 'manual' || value === 'merge') {
      return value;
    }

    return config.database.sync.conflictResolution;
  };

  const getApiBaseUrl = (option: typeof selectedConfiguration) => {
    if (!option) {
      return config.database.apiConfig?.apiBaseUrl || config.backend.url;
    }

    return option.options.apiUrl || option.options.erpnextUrl || option.options.electricSqlUrl || option.options.postgresqlUrl || config.database.apiConfig?.apiBaseUrl || config.backend.url;
  };

  const syncSelectionState = (nextMode: ApplicationSettingsMode, nextProvider?: string, nextBackendIntegration?: BackendIntegrationType) => {
    const nextDatabaseOptions = getDatabaseOptionsForMode(nextMode);
    const resolvedProvider = nextProvider || nextDatabaseOptions[0]?.value || 'sqlite-wasm';
    const nextConfiguration = resolveConsolidatedConfigurationOption(nextMode, resolvedProvider as any, nextBackendIntegration);

    setApplicationMode(nextMode);
    setSelectedProvider(resolvedProvider);
    setSelectedBackendIntegration(nextConfiguration?.backendIntegration || 'none');
    setSelectedBackendType(nextConfiguration?.backendType || 'frontend-only');

    if (nextConfiguration) {
      backendArchitecture.switchBackend(nextConfiguration.backendType);
    }
  };

  const applyConsolidatedSelection = async () => {
    if (!selectedConfiguration) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await switchMode(selectedConfiguration.applicationMode === 'production' ? 'production' : 'demo');
      backendArchitecture.switchBackend(selectedConfiguration.backendType);
      setSelectedBackendType(selectedConfiguration.backendType);

      DataServiceFactory.setUserDatabaseConfig({
        provider: selectedConfiguration.provider as any,
        environment: selectedConfiguration.sourceMode,
        options: {
          ...selectedConfiguration.options,
          storageType: selectedConfiguration.storageType,
          backendIntegration: selectedConfiguration.backendIntegration,
          backendType: selectedConfiguration.backendType,
          configurationId: selectedConfiguration.id
        }
      });

      updateConfig({
        ...config,
        dataMode: selectedConfiguration.applicationMode,
        demo: {
          ...config.demo,
          active: selectedConfiguration.applicationMode === 'demo'
        },
        database: {
          ...config.database,
          provider: selectedConfiguration.normalizedProvider as any,
          allowedProviders: databaseOptions.map(option => option.value as any),
          options: {
            ...config.database.options,
            ...selectedConfiguration.options,
            storageType: selectedConfiguration.storageType,
            backendIntegration: selectedConfiguration.backendIntegration,
            backendType: selectedConfiguration.backendType,
            configurationId: selectedConfiguration.id
          },
          apiConfig: {
            ...config.database.apiConfig,
            apiBaseUrl: getApiBaseUrl(selectedConfiguration),
            apiKey: selectedConfiguration.options.apiKey || selectedConfiguration.options.erpnextApiKey || config.database.apiConfig?.apiKey,
            syncInterval: selectedConfiguration.options.syncInterval || config.database.apiConfig?.syncInterval,
            conflictResolution: mapConflictResolution(selectedConfiguration.options.conflictResolution) as any
          },
          sync: {
            ...config.database.sync,
            enabled: selectedConfiguration.options.sync ?? config.database.sync.enabled,
            interval: selectedConfiguration.options.syncInterval || config.database.sync.interval,
            conflictResolution: mapConflictResolution(selectedConfiguration.options.conflictResolution) as any,
            batchSize: config.database.sync.batchSize,
            retryAttempts: config.database.sync.retryAttempts,
            timeout: config.database.sync.timeout
          },
          features: {
            ...config.database.features,
            enableOfflineMode: selectedConfiguration.options.offlineSupport ?? config.database.features.enableOfflineMode,
            enableRealTimeUpdates: Boolean(selectedConfiguration.options.realTimeSync || selectedConfiguration.options.replication || config.database.features.enableRealTimeUpdates),
            enableTransactions: selectedConfiguration.normalizedProvider === 'sqlite-file' || selectedConfiguration.normalizedProvider === 'sqlite-wasm'
          }
        },
        backend: {
          ...config.backend,
          url: getApiBaseUrl(selectedConfiguration)
        }
      });

      setSaveMessage({
        type: 'success',
        text: 'Configuration applied successfully! Reloading application to apply changes...'
      });

      // Reload to ensure all singleton managers and contexts pick up the new configuration cleanly
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Error applying consolidated data-management configuration:', error);
      setSaveMessage({
        type: 'error',
        text: `Failed to apply configuration: ${error.message}`
      });
    } finally {
      setIsSaving(false);
    }
  };



  useEffect(() => {
    const resolvedMode: ApplicationSettingsMode = currentMode === 'production' ? 'production' : 'demo';
    const normalizedCurrentProvider = normalizeProvider(
      config.database.provider === 'sqlite-file' ? 'sqlite' : (config.database.provider as any),
      (config.database.options?.storageType || (config.database.provider === 'sqlite-file' ? 'file' : undefined)) as any
    );
    const initialProvider = getDatabaseOptionsForMode(resolvedMode).some(option => option.value === normalizedCurrentProvider)
      ? normalizedCurrentProvider
      : getDatabaseOptionsForMode(resolvedMode)[0]?.value;
    const storedBackendIntegration = config.database.options?.backendIntegration as BackendIntegrationType | undefined;

    syncSelectionState(resolvedMode, initialProvider, storedBackendIntegration);
  }, [
    currentMode, 
    config.dataMode, 
    config.database.provider, 
    config.database.options?.storageType, 
    config.database.options?.backendIntegration
  ]);



  // Database Provider handlers
  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    setSaveMessage(null);

    const nextConfiguration = resolveConsolidatedConfigurationOption(applicationMode, value as any, selectedBackendIntegration);
    setSelectedBackendIntegration(nextConfiguration?.backendIntegration || 'none');
    setSelectedBackendType(nextConfiguration?.backendType || 'frontend-only');

    if (nextConfiguration) {
      backendArchitecture.switchBackend(nextConfiguration.backendType);
    }
  };

  const handleApplicationModeChange = (mode: ApplicationSettingsMode) => {
    syncSelectionState(mode);
    setSaveMessage(null);
  };

  const handleBackendIntegrationChange = (value: BackendIntegrationType) => {
    setSelectedBackendIntegration(value);
    const nextConfiguration = resolveConsolidatedConfigurationOption(applicationMode, selectedProvider as any, value);
    setSelectedBackendType(nextConfiguration?.backendType || 'frontend-only');
    setSaveMessage(null);

    if (nextConfiguration) {
      backendArchitecture.switchBackend(nextConfiguration.backendType);
    }
  };

  const handleSaveConfiguration = async () => {
    await applyConsolidatedSelection();
  };

  const handleResetToDefault = async () => {
    if (!window.confirm('Are you sure you want to reset to the recommended data-management configuration?')) {
      return;
    }

    DataServiceFactory.resetToDefaultConfig();
    syncSelectionState('demo');
    setSaveMessage({
      type: 'info',
      text: 'The consolidated configuration has been reset to the default demo profile. Apply the selection to save it.'
    });
  };

  const handleSeedData = async () => {
    if (!window.confirm(`Seed '${seedVolume}' demo data across all 12 modules? This may take a moment.`)) {
      return;
    }
    setIsSeeding(true);
    setSeedMessage(null);
    try {
      await seedData(seedVolume);
      setSeedMessage({
        type: 'success',
        text: `Successfully seeded ${seedVolume} demo data! The collections are now populated with realistic school data.`
      });
    } catch (error: any) {
      setSeedMessage({
        type: 'error',
        text: `Seeding failed: ${error.message}`
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    const warningText = currentMode === 'production'
      ? 'WARNING: You are about to clear ALL PRODUCTION DATA. This action cannot be undone. Type "DELETE" to confirm.'
      : 'Are you sure you want to clear ALL data from the current database? This will mark demo data as cleared and disable future demo re-seeding.';

    const userInput = currentMode === 'production'
      ? prompt(warningText)
      : window.confirm(warningText);

    if (currentMode === 'production' && userInput !== 'DELETE') {
      return;
    }

    if (currentMode !== 'production' && !userInput) {
      return;
    }

    try {
      await clearData();
      setSeedMessage({
        type: 'info',
        text: currentMode === 'production'
          ? 'All production data has been cleared.'
          : 'All data has been cleared. Demo data can no longer be re-seeded to maintain data integrity. You can now configure production mode.'
      });
    } catch (error: any) {
      setSeedMessage({
        type: 'error',
        text: `Clear failed: ${error.message}`
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Data Layer Settings</h1>
      </div>

      {/* Error Display */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-800">Switching data mode...</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex w-full">
          {[
            { id: 'mode', label: 'Configuration', icon: Settings },
            { id: 'sync', label: 'Sync Management', icon: RefreshCw }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Mode Switching Tab */}
        {activeTab === 'mode' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Unified Data Management</h3>
                <p className="text-sm text-gray-600">
                  Select the application mode, database type, and compatible backend from one consolidated workflow.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-1">
                  <div className="text-sm font-medium text-gray-900">Application Mode</div>
                  <div className="grid grid-cols-1 gap-2">
                    {(['demo', 'production'] as ApplicationSettingsMode[]).map((mode) => (
                      <label
                        key={mode}
                        className={`flex items-center justify-between rounded-lg border px-4 py-3 ${applicationMode === mode ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                      >
                        <div>
                          <div className="font-medium capitalize">{mode}</div>
                          <div className="text-xs text-gray-500">
                            {mode === 'demo' ? 'Browser-safe demo and local development configurations' : 'Live persistence and backend-enabled production profiles'}
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="applicationMode"
                          checked={applicationMode === mode}
                          onChange={() => handleApplicationModeChange(mode)}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 lg:col-span-2">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Database Type</label>
                      <select
                        aria-label="Database Type"
                        value={selectedProvider}
                        onChange={(event) => handleProviderChange(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {databaseOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500">
                        {databaseOptions.find((option) => option.value === selectedProvider)?.description}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Backend Configuration</label>
                      <select
                        aria-label="Backend Configuration"
                        value={selectedBackendIntegration}
                        onChange={(event) => handleBackendIntegrationChange(event.target.value as BackendIntegrationType)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {backendOptions.map((option) => (
                          <option key={option.id} value={option.backendIntegration}>{option.label}</option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500">
                        {selectedConfiguration?.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Selected Mode</div>
                      <div className="mt-1 text-sm font-semibold capitalize">{applicationMode}</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Database</div>
                      <div className="mt-1 text-sm font-semibold">{databaseOptions.find((option) => option.value === selectedProvider)?.label || 'Not selected'}</div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Backend Type</div>
                      <div className="mt-1 text-sm font-semibold capitalize">{selectedBackendType.replace(/-/g, ' ')}</div>
                    </div>
                  </div>

                  {saveMessage && (
                    <div className={`rounded-lg border px-4 py-3 text-sm ${saveMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : saveMessage.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                      {saveMessage.text}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleResetToDefault}>Reset</Button>
                      <Button onClick={handleSaveConfiguration} disabled={isSaving}>
                        {isSaving ? 'Applying...' : 'Apply Configuration'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Consolidation Notes</p>
                    <p className="mt-1">
                      Demo mode groups browser demo and local development database options under one application mode.
                      Production mode exposes only production-safe databases and the backend combinations compatible with the selected database.
                    </p>
                  </div>
                </div>
              </div>

              {showAdvanced && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Advanced Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Source Mode:</span>
                      <span className="text-gray-700 capitalize">{selectedConfiguration?.sourceMode || 'unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Backend Integration:</span>
                      <span className="text-gray-700 capitalize">{selectedBackendIntegration.replace(/-/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>API Base URL:</span>
                      <span className="text-gray-700 truncate max-w-[16rem] text-right">{getApiBaseUrl(selectedConfiguration) || 'Local only'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className={`border rounded-lg p-4 ${isDemoReseedingDisabled ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-start space-x-2 mb-3">
                  <Info className={`w-4 h-4 mt-0.5 ${isDemoReseedingDisabled ? 'text-amber-600' : 'text-green-600'}`} />
                  <div className={`text-sm ${isDemoReseedingDisabled ? 'text-amber-800' : 'text-green-800'}`}>
                    <p className="font-medium">
                      {isDemoReseedingDisabled ? 'Demo Data Cleared — Production Ready' : 'Demo Data Management'}
                    </p>
                    <p className="mt-1">
                      {isDemoReseedingDisabled
                        ? 'Demo data has been cleared to transition to production. Re-seeding is disabled to prevent accidental data loss. You can now configure production mode below.'
                        : 'Populate the database with realistic school data across 12 modules — academics, finance, library, health, transport, and more.'}
                    </p>
                  </div>
                </div>
                {!isDemoReseedingDisabled && (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <label className="text-sm font-medium text-green-900">Data Volume:</label>
                      <select
                        value={seedVolume}
                        onChange={(e) => setSeedVolume(e.target.value as any)}
                        className="text-sm border border-green-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="tiny">Tiny (30 students)</option>
                        <option value="small">Small (150 students)</option>
                        <option value="medium">Medium (500 students)</option>
                        <option value="large">Large (1,500 students)</option>
                        <option value="enterprise">Enterprise (5,000 students)</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleClearData}
                        disabled={isSeeding}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Clear All Data
                      </Button>
                      <Button
                        onClick={handleSeedData}
                        disabled={isSeeding}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSeeding ? 'Seeding...' : 'Seed Demo Data'}
                      </Button>
                    </div>
                  </>
                )}
                {isDemoReseedingDisabled && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleClearData}
                      disabled={isSeeding}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Clear All Data (Final)
                    </Button>
                  </div>
                )}
                {seedMessage && (
                  <div className={`mt-3 rounded-lg border px-4 py-3 text-sm ${seedMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : seedMessage.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                    {seedMessage.text}
                  </div>
                )}
              </div>

              <BackendConfiguration key={selectedBackendType} />
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="space-y-4">
            <SyncManagementPanel className="!shadow-none border border-gray-200" />
          </div>
        )}
      </div>

      {/* Current Status Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Current Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Mode:</span>
            <div className="font-medium capitalize">{currentMode}</div>
          </div>
          <div>
            <span className="text-gray-600">Provider:</span>
            <div className="font-medium">{config.database.provider}</div>
          </div>
          <div>
            <span className="text-gray-600">Records:</span>
            <div className="font-medium">{dataModeStatus?.dataCount || 0} Records</div>
          </div>
          <div>
            <span className="text-gray-600">Last Sync:</span>
            <div className="font-medium">{syncStatus?.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : 'Never'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataLayerSettingsPage;