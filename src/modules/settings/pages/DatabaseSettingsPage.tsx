// ABOUTME: Database settings page for managing database operations and configuration
// ABOUTME: Provides UI for seeding, clearing, backup, restore, and database statistics

import React, { useState, useEffect } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import { useAppData } from '../../../contexts/AppDataContext';
import { CogIcon, ArchiveIcon, DeleteIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '../../../components/ui/icons';
import { useTranslation } from 'react-i18next';
import { useUnifiedConfig } from '../../../hooks/useUnifiedConfig';
import { 
  getDatabaseConfig, 
  updateDatabaseConfig, 
  getDatabaseConfigPresets, 
  applyDatabaseConfigPreset,
  validateDatabaseConfig,
  updateDatabaseProvider,
  reloadConfigFromEnvironment,
  exportDatabaseConfigAsEnvVars,
  exportDatabaseConfigAsJSON,
  getDatabaseEnvVarKeys,
  autoFixDatabaseConfig,
  migrateDatabaseConfig,
  resetDatabaseConfigToDefaults,
  repairDatabaseConfig
} from '../../../config/unifiedConfig';
import { 
  databaseConfigValidator, 
  databaseConfigMigrator,
  ValidationResult,
  RepairSuggestion,
  MigrationResult
} from '../../../config/databaseConfigSchema';

const DatabaseSettingsPage: React.FC = () => {
  const appData = useAppData();
  const { 
    isDatabaseModeActive,
    deploymentMode,
    providerType,
    isOnline,
    backendAvailable,
    connectionQuality,
    syncStatus,
    currentDataMode,
    dataSourceDescription,
    seedDatabase,
    clearAllData,
    backupData,
    restoreData,
    getCollectionStats,
    validateData,
    cleanupOldData,
    forceSync,
    pauseSync,
    resumeSync,
    getSyncSettings,
    updateSyncSettings,
    getProviderCapabilities
  } = appData;
  
  const error = (appData as any).error;
  
  const { config } = useUnifiedConfig();

  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [stats, setStats] = useState<any[]>([]);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [dbConfig, setDbConfig] = useState(getDatabaseConfig());
  const [configValidation, setConfigValidation] = useState(validateDatabaseConfig());
  const [enhancedValidation, setEnhancedValidation] = useState<ValidationResult | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [showRepairSuggestions, setShowRepairSuggestions] = useState(false);
  const { t } = useTranslation();

  // Configuration handlers
  const handleApplyPreset = async (preset: string) => {
    try {
      applyDatabaseConfigPreset(preset);
      setDbConfig(getDatabaseConfig());
      setConfigValidation(validateDatabaseConfig());
      setActionMessage({ type: 'success', text: `Applied ${preset} configuration preset` });
    } catch (error) {
      setActionMessage({ type: 'error', text: `Failed to apply preset: ${error}` });
    }
  };

  const handleConfigChange = (newConfig: any) => {
    setDbConfig(newConfig);
    setConfigValidation(validateDatabaseConfig());
  };

  const handleSaveConfig = async () => {
    try {
      const validation = validateDatabaseConfig();
      if (!validation.isValid) {
        setActionMessage({ type: 'error', text: 'Cannot save invalid configuration' });
        return;
      }
      
      updateDatabaseConfig(dbConfig);
      setActionMessage({ type: 'success', text: 'Database configuration saved successfully' });
    } catch (error) {
      setActionMessage({ type: 'error', text: `Failed to save configuration: ${error}` });
    }
  };

  const handleEnhancedValidation = () => {
    try {
      const result = databaseConfigValidator.validate(dbConfig);
      setEnhancedValidation(result);
      setActionMessage({ 
        type: result.isValid ? 'success' : 'error', 
        text: result.isValid ? 'Configuration is valid' : `Found ${result.errors.length} errors and ${result.warnings.length} warnings`
      });
    } catch (error) {
      setActionMessage({ type: 'error', text: `Validation failed: ${error}` });
    }
  };

  const handleRepairConfig = () => {
    try {
      if (!enhancedValidation?.repairSuggestions) {
        setActionMessage({ type: 'error', text: 'No repair suggestions available' });
        return;
      }
      
      const repairedConfig = databaseConfigValidator.repair(dbConfig, enhancedValidation.repairSuggestions);
      setDbConfig(repairedConfig);
      setConfigValidation(validateDatabaseConfig());
      
      // Re-validate after repair
      const newValidation = databaseConfigValidator.validate(repairedConfig);
      setEnhancedValidation(newValidation);
      
      setActionMessage({ type: 'success', text: 'Configuration repaired successfully' });
    } catch (error) {
      setActionMessage({ type: 'error', text: `Repair failed: ${error}` });
    }
  };

  const handleResetConfig = () => {
    try {
      const resetConfig = databaseConfigValidator.reset(config.environment as any);
      setDbConfig(resetConfig);
      setConfigValidation(validateDatabaseConfig());
      setEnhancedValidation(null);
      setActionMessage({ type: 'success', text: 'Configuration reset to defaults' });
    } catch (error) {
      setActionMessage({ type: 'error', text: `Reset failed: ${error}` });
    }
  };

  const handleMigrateConfig = () => {
    try {
      const result = databaseConfigMigrator.migrate(dbConfig);
      setMigrationResult(result);
      
      if (result.success && result.migratedConfig) {
        setDbConfig(result.migratedConfig);
        setConfigValidation(validateDatabaseConfig());
        setActionMessage({ type: 'success', text: `Configuration migrated from ${result.fromVersion} to ${result.toVersion}` });
      } else {
        setActionMessage({ type: 'error', text: `Migration failed: ${result.errors.join(', ')}` });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: `Migration failed: ${error}` });
    }
  };

  const handleReloadFromEnv = () => {
    try {
      reloadConfigFromEnvironment();
      setDbConfig(getDatabaseConfig());
      setConfigValidation(validateDatabaseConfig());
      setActionMessage({ type: 'success', text: 'Configuration reloaded from environment variables' });
    } catch (error) {
      setActionMessage({ type: 'error', text: `Failed to reload from environment: ${error}` });
    }
  };

  const handleExportEnvVars = () => {
    try {
      const envVars = exportDatabaseConfigAsEnvVars();
      const envContent = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      // Create and download file
      const blob = new Blob([envContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database-config.env';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setActionMessage({ type: 'success', text: 'Environment variables exported successfully' });
    } catch (error) {
      setActionMessage({ type: 'error', text: `Failed to export environment variables: ${error}` });
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonContent = exportDatabaseConfigAsJSON();
      
      // Create and download file
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setActionMessage({ type: 'success', text: 'Configuration JSON exported successfully' });
    } catch (error) {
      setActionMessage({ type: 'error', text: `Failed to export JSON: ${error}` });
    }
  };

  const handleAutoFix = () => {
    try {
      const result = autoFixDatabaseConfig();
      if (result.success) {
        setDbConfig(getDatabaseConfig());
        setConfigValidation(validateDatabaseConfig());
        setActionMessage({ 
          type: 'success', 
          text: `Auto-fixed ${result.changes.length} issues: ${result.changes.join(', ')}` 
        });
      } else {
        setActionMessage({ type: 'error', text: 'Auto-fix failed' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: `Auto-fix failed: ${error}` });
    }
  };

  const handleMigrate = () => {
    try {
      const result = migrateDatabaseConfig();
      if (result.success) {
        setDbConfig(getDatabaseConfig());
        setConfigValidation(validateDatabaseConfig());
        if (result.appliedMigrations.length > 0) {
          setActionMessage({ 
            type: 'success', 
            text: `Applied ${result.appliedMigrations.length} migrations` 
          });
        } else {
          setActionMessage({ type: 'info', text: 'Configuration is already up to date' });
        }
      } else {
        setActionMessage({ type: 'error', text: 'Migration failed' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: `Migration failed: ${error}` });
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all database configuration to defaults? This cannot be undone.')) {
      try {
        const result = resetDatabaseConfigToDefaults();
        if (result.success) {
          setDbConfig(getDatabaseConfig());
          setConfigValidation(validateDatabaseConfig());
          setActionMessage({ type: 'success', text: 'Configuration reset to defaults' });
        } else {
          setActionMessage({ type: 'error', text: 'Reset to defaults failed' });
        }
      } catch (error) {
        setActionMessage({ type: 'error', text: `Reset failed: ${error}` });
      }
    }
  };

  const handleRepair = () => {
    try {
      const result = repairDatabaseConfig();
      if (result.success) {
        setDbConfig(getDatabaseConfig());
        setConfigValidation(validateDatabaseConfig());
        const totalChanges = result.changes.length + result.migrations.length;
        setActionMessage({ 
          type: 'success', 
          text: `Repaired configuration with ${totalChanges} changes` 
        });
      } else {
        setActionMessage({ type: 'error', text: 'Configuration repair failed' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: `Repair failed: ${error}` });
    }
  };
  const [validationResult, setValidationResult] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);

  // Load collection statistics on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const collectionStats = await getCollectionStats();
      setStats(collectionStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleSeedDatabase = async (volume: 'small' | 'medium' | 'large' = 'medium') => {
    if (!window.confirm(`Are you sure you want to seed the database with ${volume} volume data? This will clear existing data.`)) {
      return;
    }
    setIsSeeding(true);
    setActionMessage(null);
    try {
      const result = await seedDatabase({
        dataMode: config.dataMode === 'demo' ? 'demo' : 'development',
        modules: ['administration', 'academic', 'finance'],
        volume
      });
      
      if (result.success) {
        setActionMessage({ type: 'success', text: result.message });
        await loadStats();
      } else {
        setActionMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      console.error("Error seeding database:", error);
      setActionMessage({ type: 'error', text: `Failed to seed database: ${error.message}` });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm("ARE YOU SURE you want to clear ALL data from the database? This action cannot be undone.")) {
      return;
    }
    if (!window.confirm("This is your FINAL WARNING. All data will be permanently deleted. Continue?")) {
      return;
    }
    setIsClearing(true);
    setActionMessage(null);
    try {
      await clearAllData();
      setActionMessage({ type: 'success', text: 'All data successfully cleared from database.' });
      await loadStats();
    } catch (error: any) {
      console.error("Error clearing database:", error);
      setActionMessage({ type: 'error', text: `Failed to clear data: ${error.message}` });
    } finally {
      setIsClearing(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    setActionMessage(null);
    try {
      const backup = await backupData();
      
      // Download backup as JSON file
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `database-backup-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      setActionMessage({ type: 'success', text: 'Backup downloaded successfully.' });
    } catch (error: any) {
      console.error("Error backing up database:", error);
      setActionMessage({ type: 'error', text: `Failed to backup: ${error.message}` });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Restoring will replace all current data. Continue?")) {
      event.target.value = '';
      return;
    }

    setIsRestoring(true);
    setActionMessage(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      
      await restoreData(backup);
      setActionMessage({ type: 'success', text: 'Database restored successfully.' });
      await loadStats();
    } catch (error: any) {
      console.error("Error restoring database:", error);
      setActionMessage({ type: 'error', text: `Failed to restore: ${error.message}` });
    } finally {
      setIsRestoring(false);
      event.target.value = '';
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setActionMessage(null);
    try {
      const result = await validateData();
      setValidationResult(result);
      
      if (result.isValid) {
        setActionMessage({ type: 'success', text: 'Data validation passed - no issues found.' });
      } else {
        const errorCount = result.issues.filter((i: any) => i.severity === 'error').length;
        setActionMessage({ type: 'error', text: `Data validation found ${errorCount} errors.` });
      }
    } catch (error: any) {
      console.error("Error validating data:", error);
      setActionMessage({ type: 'error', text: `Failed to validate: ${error.message}` });
    } finally {
      setIsValidating(false);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm("Clean up data older than 30 days?")) {
      return;
    }
    setIsCleaning(true);
    setActionMessage(null);
    try {
      await cleanupOldData(30);
      setActionMessage({ type: 'success', text: 'Old data cleaned up successfully.' });
      await loadStats();
    } catch (error: any) {
      console.error("Error cleaning up data:", error);
      setActionMessage({ type: 'error', text: `Failed to cleanup: ${error.message}` });
    } finally {
      setIsCleaning(false);
    }
  };

  if (error) {
    return (
      <Card title="Database Settings">
        <div className="p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700">Database Error</h3>
          <p className="text-red-600 mt-1">{error.message}</p>
        </div>
      </Card>
    );
  }
  
  if (!isDatabaseModeActive) {
    return (
      <Card title="Database Settings">
        <div className="p-6 text-center">
          <Spinner />
          <p className="text-gray-600 mt-2">Initializing database... Please wait.</p>
        </div>
      </Card>
    );
  }

  const capabilities = getProviderCapabilities();
  const syncSettings = getSyncSettings();

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card title="Database Status">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Deployment Mode</div>
              <div className="text-lg font-semibold">{deploymentMode}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Provider</div>
              <div className="text-lg font-semibold">{providerType}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Data Mode</div>
              <div className="text-lg font-semibold">{currentDataMode}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Connection</div>
              <div className={`text-lg font-semibold ${
                connectionQuality === 'excellent' ? 'text-green-600' :
                connectionQuality === 'good' ? 'text-blue-600' :
                connectionQuality === 'poor' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {connectionQuality}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {dataSourceDescription}
          </div>
        </div>
      </Card>

      {/* Sync Status Card */}
      {(providerType === 'backend-api' || providerType === 'pouchdb') && (
        <Card title="Sync Status">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">State</div>
                <div className={`text-lg font-semibold ${
                  syncStatus.state === 'syncing' ? 'text-blue-600' :
                  syncStatus.state === 'error' ? 'text-red-600' :
                  syncStatus.state === 'paused' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {syncStatus.state}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Last Sync</div>
                <div className="text-sm">
                  {syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : 'Never'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Pending Ops</div>
                <div className="text-lg font-semibold">{syncStatus.pendingOperations}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Conflicts</div>
                <div className="text-lg font-semibold">{syncStatus.conflictsCount}</div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={forceSync} disabled={syncStatus.state === 'syncing'} size="sm">
                Force Sync
              </Button>
              {syncStatus.state === 'paused' ? (
                <Button onClick={resumeSync} size="sm">Resume Sync</Button>
              ) : (
                <Button onClick={pauseSync} size="sm">Pause Sync</Button>
              )}
            </div>

            <div className="text-sm text-gray-600">
              <strong>Auto Sync:</strong> {syncSettings.autoSync ? 'Enabled' : 'Disabled'} | 
              <strong> Interval:</strong> {syncSettings.syncInterval / 1000}s | 
              <strong> Batch Size:</strong> {syncSettings.batchSize}
            </div>
          </div>
        </Card>
      )}

      {/* Collection Statistics */}
      <Card title="Collection Statistics">
        <div className="p-6">
          {stats.length === 0 ? (
            <div className="text-center text-gray-500">No collections found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.map((stat) => (
                    <tr key={stat.name}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          stat.health === 'healthy' ? 'bg-green-100 text-green-800' :
                          stat.health === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {stat.health}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Data Management */}
      <Card title="Data Management">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => handleSeedDatabase('small')} 
              disabled={isSeeding} 
              leftIcon={isSeeding ? <Spinner size="sm"/> : <ArchiveIcon className="w-5 h-5"/>}
            >
              Seed Small (50)
            </Button>
            <Button 
              onClick={() => handleSeedDatabase('medium')} 
              disabled={isSeeding} 
              leftIcon={isSeeding ? <Spinner size="sm"/> : <ArchiveIcon className="w-5 h-5"/>}
            >
              Seed Medium (200)
            </Button>
            <Button 
              onClick={() => handleSeedDatabase('large')} 
              disabled={isSeeding} 
              leftIcon={isSeeding ? <Spinner size="sm"/> : <ArchiveIcon className="w-5 h-5"/>}
            >
              Seed Large (1000)
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={handleBackup} 
              disabled={isBackingUp}
              leftIcon={isBackingUp ? <Spinner size="sm"/> : <ArchiveIcon className="w-5 h-5"/>}
            >
              {isBackingUp ? 'Backing up...' : 'Backup Database'}
            </Button>
            
            <label className="block">
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                disabled={isRestoring}
                className="hidden"
                id="restore-file"
              />
              <Button 
                as="label"
                htmlFor="restore-file"
                disabled={isRestoring}
                leftIcon={isRestoring ? <Spinner size="sm"/> : <ArchiveIcon className="w-5 h-5"/>}
              >
                {isRestoring ? 'Restoring...' : 'Restore Database'}
              </Button>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={handleValidate} 
              disabled={isValidating}
              leftIcon={isValidating ? <Spinner size="sm"/> : <CheckCircleIcon className="w-5 h-5"/>}
            >
              {isValidating ? 'Validating...' : 'Validate Data'}
            </Button>
            
            <Button 
              onClick={handleCleanup} 
              disabled={isCleaning}
              leftIcon={isCleaning ? <Spinner size="sm"/> : <DeleteIcon className="w-5 h-5"/>}
            >
              {isCleaning ? 'Cleaning...' : 'Cleanup Old Data'}
            </Button>

            <Button 
              onClick={handleClearDatabase} 
              disabled={isClearing} 
              variant="danger"
              leftIcon={isClearing ? <Spinner size="sm"/> : <DeleteIcon className="w-5 h-5"/>}
            >
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </div>

          {actionMessage && (
            <div className={`p-3 rounded-md text-sm ${
              actionMessage.type === 'success' ? 'bg-green-100 text-green-700' :
              actionMessage.type === 'error' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {actionMessage.text}
            </div>
          )}
        </div>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card title="Validation Results">
          <div className="p-6">
            <div className={`p-3 rounded-md mb-4 ${
              validationResult.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {validationResult.isValid ? 'All validations passed!' : `Found ${validationResult.issues.length} issues`}
            </div>
            
            {validationResult.issues.length > 0 && (
              <div className="space-y-2">
                {validationResult.issues.map((issue: any, index: number) => (
                  <div key={index} className={`p-2 rounded text-sm ${
                    issue.severity === 'error' ? 'bg-red-50 text-red-700' :
                    issue.severity === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    <strong>[{issue.severity.toUpperCase()}]</strong> {issue.message}
                    {issue.collection && <span className="ml-2 text-xs">({issue.collection})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Enhanced Validation Results */}
      {enhancedValidation && (
        <Card title="Enhanced Validation Results">
          <div className="p-6 space-y-4">
            {/* Validation Summary */}
            <div className={`p-3 rounded-md ${
              enhancedValidation.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {enhancedValidation.isValid ? 'Configuration is valid' : 'Configuration has issues'}
                </span>
                <div className="text-sm">
                  {enhancedValidation.errors.length} errors, {enhancedValidation.warnings.length} warnings
                </div>
              </div>
            </div>

            {/* Errors */}
            {enhancedValidation.errors.length > 0 && (
              <div>
                <h5 className="font-medium text-red-700 mb-2">Errors</h5>
                <div className="space-y-2">
                  {enhancedValidation.errors.map((error, index) => (
                    <div key={index} className="p-2 bg-red-50 text-red-700 rounded text-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <strong>{error.path}:</strong> {error.message}
                          {error.code && <span className="ml-2 text-xs">({error.code})</span>}
                        </div>
                        {error.suggestedFix && (
                          <span className="text-xs bg-red-200 px-2 py-1 rounded">
                            Fix: {JSON.stringify(error.suggestedFix)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {enhancedValidation.warnings.length > 0 && (
              <div>
                <h5 className="font-medium text-yellow-700 mb-2">Warnings</h5>
                <div className="space-y-2">
                  {enhancedValidation.warnings.map((warning, index) => (
                    <div key={index} className="p-2 bg-yellow-50 text-yellow-700 rounded text-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <strong>{warning.path}:</strong> {warning.message}
                          {warning.code && <span className="ml-2 text-xs">({warning.code})</span>}
                        </div>
                        {warning.suggestedFix && (
                          <span className="text-xs bg-yellow-200 px-2 py-1 rounded">
                            Fix: {JSON.stringify(warning.suggestedFix)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repair Suggestions */}
            {enhancedValidation.repairSuggestions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-blue-700">Repair Suggestions</h5>
                  <Button
                    onClick={() => setShowRepairSuggestions(!showRepairSuggestions)}
                    variant="outline"
                    size="sm"
                  >
                    {showRepairSuggestions ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
                
                {showRepairSuggestions && (
                  <div className="space-y-2">
                    {enhancedValidation.repairSuggestions.map((suggestion, index) => (
                      <div key={index} className={`p-3 rounded text-sm ${
                        suggestion.severity === 'critical' ? 'bg-red-50 text-red-700' :
                        suggestion.severity === 'recommended' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        <div className="font-medium">{suggestion.path}</div>
                        <div className="mt-1">{suggestion.description}</div>
                        <div className="mt-2 text-xs">
                          <span className="font-medium">Current:</span> {JSON.stringify(suggestion.currentValue)} →{' '}
                          <span className="font-medium">Suggested:</span> {JSON.stringify(suggestion.suggestedValue)}
                        </div>
                        <div className="mt-1 text-xs italic">{suggestion.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Migration Results */}
      {migrationResult && (
        <Card title="Configuration Migration Results">
          <div className="p-6">
            <div className={`p-3 rounded-md mb-4 ${
              migrationResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <div className="font-medium">
                Migration from {migrationResult.fromVersion} to {migrationResult.toVersion}: {migrationResult.success ? 'Success' : 'Failed'}
              </div>
            </div>
            
            {migrationResult.errors.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-red-700 mb-2">Errors</h5>
                <div className="space-y-1">
                  {migrationResult.errors.map((error, index) => (
                    <div key={index} className="p-2 bg-red-50 text-red-700 rounded text-sm">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {migrationResult.warnings.length > 0 && (
              <div>
                <h5 className="font-medium text-yellow-700 mb-2">Warnings</h5>
                <div className="space-y-1">
                  {migrationResult.warnings.map((warning, index) => (
                    <div key={index} className="p-2 bg-yellow-50 text-yellow-700 rounded text-sm">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Provider Capabilities */}
      <Card title="Provider Capabilities">
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(capabilities).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                {value ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Database Configuration */}
      <Card title="Database Configuration">
        <div className="p-6 space-y-6">
          {/* Configuration Status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Configuration Status</h3>
              <p className="text-sm text-gray-600">Current database configuration validation</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${
              configValidation.isValid 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {configValidation.isValid ? 'Valid' : 'Issues Found'}
            </div>
          </div>

          {/* Configuration Issues */}
          {(!configValidation.isValid || configValidation.warnings.length > 0 || configValidation.info.length > 0) && (
            <div className="space-y-2">
              {configValidation.errors.map((error, index) => (
                <div key={`error-${index}`} className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>Error ({error.field}):</strong> {error.message}
                      <div className="text-xs mt-1">Current: {JSON.stringify(error.currentValue)}</div>
                    </div>
                    {error.autoFix && (
                      <Button
                        onClick={() => {
                          const newValue = error.autoFix!();
                          const updatedConfig = { ...dbConfig };
                          const keys = error.field.split('.');
                          let target = updatedConfig;
                          for (let i = 0; i < keys.length - 1; i++) {
                            target = target[keys[i]];
                          }
                          target[keys[keys.length - 1]] = newValue;
                          setDbConfig(updatedConfig);
                          setConfigValidation(validateDatabaseConfig());
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Fix
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {configValidation.warnings.map((warning, index) => (
                <div key={`warning-${index}`} className="p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>Warning ({warning.field}):</strong> {warning.message}
                      <div className="text-xs mt-1">Current: {JSON.stringify(warning.currentValue)}</div>
                    </div>
                    {warning.autoFix && (
                      <Button
                        onClick={() => {
                          const newValue = warning.autoFix!();
                          const updatedConfig = { ...dbConfig };
                          const keys = warning.field.split('.');
                          let target = updatedConfig;
                          for (let i = 0; i < keys.length - 1; i++) {
                            target = target[keys[i]];
                          }
                          target[keys[keys.length - 1]] = newValue;
                          setDbConfig(updatedConfig);
                          setConfigValidation(validateDatabaseConfig());
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Fix
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {configValidation.info.map((info, index) => (
                <div key={`info-${index}`} className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
                  <strong>Info ({info.field}):</strong> {info.message}
                  <div className="text-xs mt-1">Current: {JSON.stringify(info.currentValue)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Configuration Repair Tools */}
          {(!configValidation.isValid || configValidation.canAutoFix) && (
            <div className="pt-4 border-t">
              <h4 className="text-md font-medium mb-3">Configuration Repair Tools</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {configValidation.canAutoFix && (
                  <Button
                    onClick={handleAutoFix}
                    variant="outline"
                    leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                  >
                    Auto-Fix Issues
                  </Button>
                )}
                
                <Button
                  onClick={handleMigrate}
                  variant="outline"
                  leftIcon={<CogIcon className="w-4 h-4" />}
                >
                  Migrate Config
                </Button>
                
                <Button
                  onClick={handleRepair}
                  variant="outline"
                  leftIcon={<CogIcon className="w-4 h-4" />}
                >
                  Full Repair
                </Button>
                
                <Button
                  onClick={handleResetToDefaults}
                  variant="outline"
                  leftIcon={<ExclamationTriangleIcon className="w-4 h-4" />}
                >
                  Reset to Defaults
                </Button>
              </div>
            </div>
          )}

          {/* Configuration Presets */}
          <div>
            <h4 className="text-md font-medium mb-3">Configuration Presets</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.keys(getDatabaseConfigPresets()).map((preset) => (
                <Button
                  key={preset}
                  onClick={() => handleApplyPreset(preset)}
                  variant="outline"
                  className="text-left"
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1).replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Configuration Editor Toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <h4 className="text-md font-medium">Advanced Configuration</h4>
              <p className="text-sm text-gray-600">Edit detailed database configuration settings</p>
            </div>
            <Button
              onClick={() => setShowConfigEditor(!showConfigEditor)}
              variant="outline"
              leftIcon={<CogIcon className="w-4 h-4" />}
            >
              {showConfigEditor ? 'Hide' : 'Show'} Config Editor
            </Button>
          </div>

          {/* Environment Configuration Management */}
          <div className="pt-4 border-t">
            <h4 className="text-md font-medium mb-3">Environment Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                onClick={handleReloadFromEnv}
                variant="outline"
                leftIcon={<InformationCircleIcon className="w-4 h-4" />}
              >
                Reload from Env
              </Button>
              
              <Button
                onClick={handleExportEnvVars}
                variant="outline"
                leftIcon={<ArchiveIcon className="w-4 h-4" />}
              >
                Export .env
              </Button>
              
              <Button
                onClick={handleExportJSON}
                variant="outline"
                leftIcon={<ArchiveIcon className="w-4 h-4" />}
              >
                Export JSON
              </Button>
              
              <Button
                onClick={() => window.open('/docs/database-environment-variables.md', '_blank')}
                variant="outline"
                leftIcon={<InformationCircleIcon className="w-4 h-4" />}
              >
                View Docs
              </Button>
            </div>
          </div>

          {/* Enhanced Validation and Repair Tools */}
          <div className="pt-4 border-t">
            <h4 className="text-md font-medium mb-3">Configuration Validation & Repair</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                onClick={handleEnhancedValidation}
                variant="outline"
                leftIcon={<CheckCircleIcon className="w-4 h-4" />}
              >
                Enhanced Validation
              </Button>
              
              <Button
                onClick={handleRepairConfig}
                variant="outline"
                disabled={!enhancedValidation?.repairSuggestions?.length}
                leftIcon={<CogIcon className="w-4 h-4" />}
              >
                Auto Repair
              </Button>
              
              <Button
                onClick={handleResetConfig}
                variant="outline"
                leftIcon={<DeleteIcon className="w-4 h-4" />}
              >
                Reset to Defaults
              </Button>
              
              <Button
                onClick={handleMigrateConfig}
                variant="outline"
                leftIcon={<ArchiveIcon className="w-4 h-4" />}
              >
                Migrate Config
              </Button>
            </div>
          </div>

          {/* Configuration Editor */}
          {showConfigEditor && (
            <DatabaseConfigEditor
              config={dbConfig}
              onConfigChange={handleConfigChange}
              onSave={handleSaveConfig}
              validation={configValidation}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

// Database Configuration Editor Component
const DatabaseConfigEditor: React.FC<{
  config: any;
  onConfigChange: (config: any) => void;
  onSave: () => void;
  validation: any;
}> = ({ config, onConfigChange, onSave, validation }) => {
  const [activeTab, setActiveTab] = useState('performance');

  const updateConfig = (section: string, updates: any) => {
    const newConfig = {
      ...config,
      [section]: {
        ...config[section],
        ...updates,
      },
    };
    onConfigChange(newConfig);
  };

  const tabs = [
    { id: 'performance', label: 'Performance' },
    { id: 'storage', label: 'Storage' },
    { id: 'sync', label: 'Sync' },
    { id: 'monitoring', label: 'Monitoring' },
    { id: 'features', label: 'Features' },
  ];

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enable Indexing
              </label>
              <input
                type="checkbox"
                checked={config.performance.enableIndexing}
                onChange={(e) => updateConfig('performance', { enableIndexing: e.target.checked })}
                className="rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enable Caching
              </label>
              <input
                type="checkbox"
                checked={config.performance.enableCaching}
                onChange={(e) => updateConfig('performance', { enableCaching: e.target.checked })}
                className="rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cache Size (MB)
              </label>
              <input
                type="number"
                value={config.performance.cacheSize}
                onChange={(e) => updateConfig('performance', { cacheSize: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="10"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Query Timeout (ms)
              </label>
              <input
                type="number"
                value={config.performance.queryTimeout}
                onChange={(e) => updateConfig('performance', { queryTimeout: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1000"
                max="300000"
              />
            </div>
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Size (MB, 0 = unlimited)
              </label>
              <input
                type="number"
                value={config.storage.maxSize}
                onChange={(e) => updateConfig('storage', { maxSize: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retention Days
              </label>
              <input
                type="number"
                value={config.storage.retentionDays}
                onChange={(e) => updateConfig('storage', { retentionDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compression Enabled
              </label>
              <input
                type="checkbox"
                checked={config.storage.compressionEnabled}
                onChange={(e) => updateConfig('storage', { compressionEnabled: e.target.checked })}
                className="rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Backup Enabled
              </label>
              <input
                type="checkbox"
                checked={config.storage.backupEnabled}
                onChange={(e) => updateConfig('storage', { backupEnabled: e.target.checked })}
                className="rounded"
              />
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sync Enabled
              </label>
              <input
                type="checkbox"
                checked={config.sync.enabled}
                onChange={(e) => updateConfig('sync', { enabled: e.target.checked })}
                className="rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sync Interval (ms)
              </label>
              <input
                type="number"
                value={config.sync.interval}
                onChange={(e) => updateConfig('sync', { interval: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conflict Resolution
              </label>
              <select
                value={config.sync.conflictResolution}
                onChange={(e) => updateConfig('sync', { conflictResolution: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="local">Local Wins</option>
                <option value="remote">Remote Wins</option>
                <option value="manual">Manual Resolution</option>
                <option value="merge">Auto Merge</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retry Attempts
              </label>
              <input
                type="number"
                value={config.sync.retryAttempts}
                onChange={(e) => updateConfig('sync', { retryAttempts: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                max="10"
              />
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Health Checks Enabled
              </label>
              <input
                type="checkbox"
                checked={config.monitoring.enableHealthChecks}
                onChange={(e) => updateConfig('monitoring', { enableHealthChecks: e.target.checked })}
                className="rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Health Check Interval (ms)
              </label>
              <input
                type="number"
                value={config.monitoring.healthCheckInterval}
                onChange={(e) => updateConfig('monitoring', { healthCheckInterval: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="30000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Log Level
              </label>
              <select
                value={config.monitoring.logLevel}
                onChange={(e) => updateConfig('monitoring', { logLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Performance Metrics
              </label>
              <input
                type="checkbox"
                checked={config.monitoring.enablePerformanceMetrics}
                onChange={(e) => updateConfig('monitoring', { enablePerformanceMetrics: e.target.checked })}
                className="rounded"
              />
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(config.features).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(e) => updateConfig('features', { [key]: e.target.checked })}
                  className="rounded"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6 pt-4 border-t">
        <Button
          onClick={onSave}
          disabled={!validation.isValid}
          leftIcon={<CheckCircleIcon className="w-4 h-4" />}
        >
          Save Configuration
        </Button>
      </div>
    </div>
  );
};

export default DatabaseSettingsPage;