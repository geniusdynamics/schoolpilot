import { logger } from '@/utils/logging';

// ABOUTME: Cog6ToothIcon page for data layer configuration and mode management
// ABOUTME: Provides comprehensive interface for database provider settings and mode switching

import React, { useEffect, useMemo, useState } from 'react';
import SyncManagementPanel from '@/components/SyncManagementPanel';
import { BackendConfiguration } from '@/components/BackendConfiguration';
import { backendArchitecture, type BackendType } from '@/config/backendArchitecture';
import { useDataMode } from '@/hooks/useDataMode';
import { getDatabaseOptionsForMode, getBackendOptionsForModeAndProvider, normalizeProvider, resolveConsolidatedConfigurationOption, type ApplicationSettingsMode, type BackendIntegrationType } from '@/config/dataLayerConfig';
import {
  ArrowPathIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import { useAppData } from '@/hooks/useAppData';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';
import { DataServiceFactory } from '@/services/data/DataServiceFactory';
import { MODULE_SEEDER_OPTIONS, type SeederModuleId } from '@/services/database/seederModuleConfig';

export const DataLayerSettingsContent: React.FC = () => {
  const { status: dataModeStatus, switchMode, isLoading, seedData, clearData, isDemoReseedingDisabled, isDemoCleared } = useDataMode();
  const confirm = useConfirm();
  const currentMode = dataModeStatus?.currentMode || 'development';
  const [activeTab, setActiveTab] = useState<'mode' | 'sync'>('mode');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showModuleSelection, setShowModuleSelection] = useState(false);
  const [selectedModules, setSelectedModules] = useState<SeederModuleId[]>(['all']);
  
  const { syncStatus } = useAppData();
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

  const databaseOptions = useMemo(() => getDatabaseOptionsForMode(applicationMode), [applicationMode]);
  const backendOptions = useMemo(() => getBackendOptionsForModeAndProvider(applicationMode, selectedProvider as any), [applicationMode, selectedProvider]);
  const selectedConfiguration = useMemo(() => resolveConsolidatedConfigurationOption(applicationMode, selectedProvider as any, selectedBackendIntegration), [applicationMode, selectedProvider, selectedBackendIntegration]);

  const mapConflictResolution = (value: string | undefined) => {
    if (!value) return config.database.sync.conflictResolution;
    if (value === 'client-wins' || value === 'local-wins') return 'local';
    if (value === 'server-wins' || value === 'remote-wins' || value === 'last-write-wins') return 'remote';
    if (value === 'auto') return 'merge';
    if (value === 'manual' || value === 'merge') return value;
    return config.database.sync.conflictResolution;
  };

  const getApiBaseUrl = (option: typeof selectedConfiguration) => {
    if (!option) return config.database.apiConfig?.apiBaseUrl || config.backend.url;
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

  // Determine if switching to demo should be blocked (demo data was cleared)
  const isSwitchToDemoBlocked = useMemo(() => {
    // Block if trying to switch to demo and demo data has been cleared
    return selectedConfiguration?.applicationMode === 'demo' && isDemoCleared;
  }, [selectedConfiguration?.applicationMode, isDemoCleared]);

  const applyConsolidatedSelection = async () => {
    if (!selectedConfiguration) return;
    
    // HARD ENFORCEMENT: Prevent switching to demo if demo data was cleared
    if (isSwitchToDemoBlocked) {
      setSaveMessage({ 
        type: 'error', 
        text: 'Cannot switch to demo mode: Demo data has been permanently cleared to transition to production. This operation is blocked to prevent data loss.' 
      });
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
        demo: { ...config.demo, active: selectedConfiguration.applicationMode === 'demo' },
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
        backend: { ...config.backend, url: getApiBaseUrl(selectedConfiguration) }
      });

      setSaveMessage({ type: 'success', text: 'Configuration applied successfully! Reloading application to apply changes...' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      logger.error('Error applying consolidated data-management configuration:', error);
      setSaveMessage({ type: 'error', text: `Failed to apply configuration: ${error.message}` });
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
  }, [currentMode, config.dataMode, config.database.provider, config.database.options?.storageType, config.database.options?.backendIntegration]);

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    setSaveMessage(null);
    const nextConfiguration = resolveConsolidatedConfigurationOption(applicationMode, value as any, selectedBackendIntegration);
    setSelectedBackendIntegration(nextConfiguration?.backendIntegration || 'none');
    setSelectedBackendType(nextConfiguration?.backendType || 'frontend-only');
    if (nextConfiguration) backendArchitecture.switchBackend(nextConfiguration.backendType);
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
    if (nextConfiguration) backendArchitecture.switchBackend(nextConfiguration.backendType);
  };

  const handleSaveConfiguration = async () => await applyConsolidatedSelection();

  const handleResetToDefault = async () => {
    if (!(await confirm({ title: 'Reset configuration', message: 'Are you sure you want to reset to the recommended data-management configuration?' }))) return;
    try {
      DataServiceFactory.resetToDefaultConfig();
      syncSelectionState('demo');
      setSaveMessage({ type: 'info', text: 'The consolidated configuration has been reset to the default demo profile. Apply the selection to save it.' });
    } catch (error: any) {
      logger.error('Error resetting configuration:', error);
      setSaveMessage({ type: 'error', text: `Failed to reset: ${error.message}` });
    }
  };

  const handleSeedData = async () => {
    const moduleCount = selectedModules.includes('all') ? 'all' : selectedModules.length;
    const moduleText = selectedModules.includes('all') ? 'all modules' : `${moduleCount} selected module(s)`;
    if (!(await confirm({ title: 'Seed demo data', message: `Seed '${seedVolume}' demo data across ${moduleText}? This may take a moment.` }))) return;
    
    setIsSeeding(true);
    setSeedMessage(null);
    try {
      const modules = selectedModules.includes('all') ? undefined : selectedModules;
      await seedData(seedVolume, modules);
      setSeedMessage({ type: 'success', text: `Successfully seeded ${seedVolume} demo data across ${moduleText}!` });
    } catch (error: any) {
      setSeedMessage({ type: 'error', text: `Seeding failed: ${error.message}` });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    const warningText = currentMode === 'production'
      ? 'WARNING: You are about to clear ALL PRODUCTION DATA. This action cannot be undone. Type "DELETE" to confirm.'
      : 'Are you sure you want to clear ALL data from the current database?';
    let userInput: string | boolean | null;
    if (currentMode === 'production') {
      userInput = prompt(warningText);
    } else {
      userInput = await confirm({ title: 'Switch data mode', message: warningText });
    }
    if (currentMode === 'production' && userInput !== 'DELETE') return;
    if (currentMode !== 'production' && !userInput) return;

    try {
      await clearData();
      setSeedMessage({
        type: 'info',
        text: currentMode === 'production' ? 'All production data has been cleared.' : 'All data has been cleared. Demo data can no longer be re-seeded.'
      });
    } catch (error: any) {
      setSeedMessage({ type: 'error', text: `Clear failed: ${error.message}` });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-3">
      <PageHeaderWithTabs title="Data Layer Settings" />

      {isLoading && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            <span className="text-primary-800">Switching data mode...</span>
          </div>
        </div>
      )}

      <div className="border-b border-surface-border">
        <nav className="-mb-px flex w-full">
          {[{ id: 'mode', label: 'Configuration', icon: Cog6ToothIcon }, { id: 'sync', label: 'Sync Management', icon: ArrowPathIcon }].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className={`flex-1 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === id ? 'border-primary-500 text-primary-600' : 'border-transparent text-surface-muted-fg hover:text-surface-foreground hover:border-surface-border'}`}>
              <div className="flex items-center justify-center space-x-2">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        {activeTab === 'mode' && (
          <div className="space-y-6">
            <div className="bg-surface-card border border-surface-border rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Unified Data Management</h3>
                <p className="text-sm text-surface-muted-fg">Select the application mode, database type, and compatible backend from one consolidated workflow.</p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-1">
                  <div className="text-sm font-medium text-surface-foreground">Application Mode</div>
                  <div className="grid grid-cols-1 gap-2">
                    {(['demo', 'production'] as ApplicationSettingsMode[]).map((mode) => (
                      <label key={mode} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${applicationMode === mode ? 'border-primary-500 bg-primary-50' : 'border-surface-border'}`}>
                        <div>
                          <div className="font-medium capitalize">{mode}</div>
                          <div className="text-xs text-surface-muted-fg">{mode === 'demo' ? 'Browser-safe demo and local development configurations' : 'Live persistence and backend-enabled production profiles'}</div>
                        </div>
                        <input type="radio" name="applicationMode" checked={applicationMode === mode} onChange={() => handleApplicationModeChange(mode)} />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 lg:col-span-2">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-surface-foreground mb-2">Database Type</label>
                      <select aria-label="Database Type" value={selectedProvider} onChange={(e) => handleProviderChange(e.target.value)} className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm">
                        {databaseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <p className="mt-2 text-xs text-surface-muted-fg">{databaseOptions.find((option) => option.value === selectedProvider)?.description}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-foreground mb-2">Backend Configuration</label>
                      <select aria-label="Backend Configuration" value={selectedBackendIntegration} onChange={(e) => handleBackendIntegrationChange(e.target.value as BackendIntegrationType)} className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm">
                        {backendOptions.map((option) => <option key={option.id} value={option.backendIntegration}>{option.label}</option>)}
                      </select>
                      <p className="mt-2 text-xs text-surface-muted-fg">{selectedConfiguration?.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-surface-border p-4">
                      <div className="text-xs uppercase tracking-wide text-surface-muted-fg">Selected Mode</div>
                      <div className="mt-1 text-sm font-semibold capitalize">{applicationMode}</div>
                    </div>
                    <div className="rounded-lg border border-surface-border p-4">
                      <div className="text-xs uppercase tracking-wide text-surface-muted-fg">Database</div>
                      <div className="mt-1 text-sm font-semibold">{databaseOptions.find((option) => option.value === selectedProvider)?.label || 'Not selected'}</div>
                    </div>
                    <div className="rounded-lg border border-surface-border p-4">
                      <div className="text-xs uppercase tracking-wide text-surface-muted-fg">Backend Type</div>
                      <div className="mt-1 text-sm font-semibold capitalize">{selectedBackendType.replace(/-/g, ' ')}</div>
                    </div>
                  </div>

                  {isSwitchToDemoBlocked && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                      <div className="flex items-start space-x-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-amber-800">
                          <p className="font-medium">Production Mode Locked</p>
                          <p className="mt-1">Demo data has been cleared to transition to production. Switching back to demo mode is permanently disabled to prevent accidental data loss.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {saveMessage && (
                    <div className={`rounded-lg border px-4 py-3 text-sm ${saveMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : saveMessage.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-primary-200 bg-primary-50 text-primary-700'}`}>
                      {saveMessage.text}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex justify-end">
                      <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-primary-600 hover:text-primary-800">
                        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleResetToDefault}>Reset</Button>
                      <Button 
                        onClick={handleSaveConfiguration} 
                        disabled={isSaving || isSwitchToDemoBlocked}
                        title={isSwitchToDemoBlocked ? 'Cannot switch to demo mode: Demo data has been permanently cleared' : ''}
                      >
                        {isSaving ? 'Applying...' : 'Apply Configuration'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <InformationCircleIcon className="w-4 h-4 text-primary-600 mt-0.5" />
                  <div className="text-sm text-primary-800">
                    <p className="font-medium">Consolidation Notes</p>
                    <p className="mt-1">Demo mode groups browser demo and local development database options under one application mode.</p>
                  </div>
                </div>
              </div>

              {showAdvanced && (
                <div className="bg-surface-muted border border-surface-border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Advanced Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Source Mode:</span><span className="text-surface-foreground capitalize">{selectedConfiguration?.sourceMode || 'unknown'}</span></div>
                    <div className="flex justify-between"><span>Backend Integration:</span><span className="text-surface-foreground capitalize">{selectedBackendIntegration.replace(/-/g, ' ')}</span></div>
                    <div className="flex justify-between"><span>API Base URL:</span><span className="text-surface-foreground truncate max-w-[16rem] text-right">{getApiBaseUrl(selectedConfiguration) || 'Local only'}</span></div>
                  </div>
                </div>
              )}

              <div className={`border rounded-lg p-4 ${isDemoReseedingDisabled ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-start space-x-2 mb-3">
                  <InformationCircleIcon className={`w-4 h-4 mt-0.5 ${isDemoReseedingDisabled ? 'text-amber-600' : 'text-green-600'}`} />
                  <div className={`text-sm ${isDemoReseedingDisabled ? 'text-amber-800' : 'text-green-800'}`}>
                    <p className="font-medium">{isDemoReseedingDisabled ? 'Demo Data Cleared — Production Ready' : 'Demo Data Management'}</p>
                    <p className="mt-1">{isDemoReseedingDisabled ? 'Demo data has been cleared to transition to production.' : 'Populate the database with realistic school data across 12 modules.'}</p>
                  </div>
                </div>

                {!isDemoReseedingDisabled && (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <label className="text-sm font-medium text-green-900">Data Volume:</label>
                      <select value={seedVolume} onChange={(e) => setSeedVolume(e.target.value as any)} className="text-sm border border-green-300 rounded-md px-3 py-1.5 bg-surface-card">
                        <option value="tiny">Tiny (30 students)</option>
                        <option value="small">Small (150 students)</option>
                        <option value="medium">Medium (500 students)</option>
                        <option value="large">Large (1,500 students)</option>
                        <option value="enterprise">Enterprise (5,000 students)</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-green-900">Modules to Seed:</label>
                        <button onClick={() => setShowModuleSelection(!showModuleSelection)} className="text-xs text-green-700 hover:text-green-900 underline">
                          {showModuleSelection ? 'Hide' : 'Show'} Module Selection
                        </button>
                      </div>
                      {!showModuleSelection && (
                        <p className="text-xs text-green-700">{selectedModules.includes('all') ? 'All modules selected (~88 collections)' : `${selectedModules.length} module(s) selected`}</p>
                      )}
                      {showModuleSelection && (
                        <div className="bg-surface-card border border-green-200 rounded-lg p-3 mt-2">
                          <label className="flex items-center space-x-2 mb-3 pb-2 border-b border-green-100">
                            <input type="checkbox" checked={selectedModules.includes('all')} onChange={(e) => setSelectedModules(e.target.checked ? ['all'] : ['core'])} className="rounded border-green-300 text-green-600" />
                            <span className="text-sm font-medium text-green-900">All Modules</span>
                            <span className="text-xs text-green-600 ml-auto">~88 collections</span>
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {MODULE_SEEDER_OPTIONS.filter(m => m.id !== 'all').map((mod) => (
                              <label key={mod.id} className="flex items-start space-x-2 py-1">
                                <input type="checkbox" checked={selectedModules.includes(mod.id)} disabled={selectedModules.includes('all')} onChange={(e) => {
                                  const updated = e.target.checked ? [...selectedModules.filter(m => m !== 'all'), mod.id] : selectedModules.filter(m => m !== mod.id);
                                  setSelectedModules(updated.length === 0 ? ['all'] : updated);
                                }} className="rounded border-green-300 text-green-600 mt-0.5 disabled:opacity-50" />
                                <div className="flex-1">
                                  <span className={`text-sm ${selectedModules.includes('all') ? 'text-surface-muted-fg' : 'text-surface-foreground'}`}>{mod.name}</span>
                                  <p className="text-xs text-surface-muted-fg">{mod.description}</p>
                                  <p className="text-xs text-green-600">~{mod.estimatedRecords[seedVolume]} records</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleClearData} disabled={isSeeding} className="border-red-300 text-red-700 hover:bg-red-50">Clear All Data</Button>
                      <Button onClick={handleSeedData} disabled={isSeeding} className="bg-green-600 hover:bg-green-700">{isSeeding ? 'Seeding...' : 'Seed Demo Data'}</Button>
                    </div>
                  </>
                )}

                {seedMessage && (
                  <div className={`mt-3 rounded-lg border px-4 py-3 text-sm ${seedMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : seedMessage.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-primary-200 bg-primary-50 text-primary-700'}`}>
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
            <SyncManagementPanel className="!shadow-none border border-surface-border" />
          </div>
        )}
      </div>

      <div className="bg-surface-card border border-surface-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Current Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-surface-muted-fg">Mode:</span><div className="font-medium capitalize">{currentMode}</div></div>
          <div><span className="text-surface-muted-fg">Provider:</span><div className="font-medium">{config.database.provider}</div></div>
          <div><span className="text-surface-muted-fg">Records:</span><div className="font-medium">{dataModeStatus?.dataCount || 0} Records</div></div>
          <div><span className="text-surface-muted-fg">Last Sync:</span><div className="font-medium">{syncStatus?.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : 'Never'}</div></div>
        </div>
      </div>
    </div>
  );
};

const DataLayerSettingsPage: React.FC = () => {
  return <DataLayerSettingsContent />;
};

export default DataLayerSettingsPage;
