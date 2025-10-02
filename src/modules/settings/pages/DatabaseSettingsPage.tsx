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
    </div>
  );
};

export default DatabaseSettingsPage;