// ABOUTME: Combined data management settings page with tabbed interface for database and backup operations
// ABOUTME: Merges DatabaseSettingsPage and BackupSettingsPage functionality using FeatureSettings pattern

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';
import { useAppData } from '@/hooks/useAppData';
import {
  CogIcon,
  ArchiveIcon,
  DeleteIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CircleStackIcon,
  DatabaseIcon,
  DownloadIcon,
  ExclamationTriangleIcon
} from '../../../components/ui/icons';
import { useTranslation } from 'react-i18next';
import { DataServiceFactory } from '../../../services/DataServiceFactory';
import { DATA_LAYER_CONFIG } from '../../../config/dataLayerConfig';
import { useUnifiedConfig, useEnvironment } from '../../../hooks/useUnifiedConfig';
import { getDatabaseManager } from '../../../services/database/ProviderSelector';

const DataManagementSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'database' | 'backup' | 'provider'>('database');
  
  // Provider-specific state
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  const { t } = useTranslation();
  
  // Get unified config and environment
  const { config: unifiedConfig } = useUnifiedConfig() || {};
  const { current: currentEnvironment } = useEnvironment();
  
  // Initialize provider settings
  useEffect(() => {
    const initializeProviders = () => {
      // Get available providers based on current environment
      let envProviders: string[] = [];
      
      if (currentEnvironment === 'development') {
        envProviders = [DATA_LAYER_CONFIG.development.provider];
      } else if (currentEnvironment === 'demo') {
        envProviders = [DATA_LAYER_CONFIG.demo.provider];
      } else if (currentEnvironment === 'production') {
        envProviders = [
          DATA_LAYER_CONFIG.production.default.provider,
          ...DATA_LAYER_CONFIG.production.alternatives.map(alt => alt.provider),
          ...Object.values(DATA_LAYER_CONFIG.backendIntegrations).map(integration => integration.provider)
        ];
      }
      
      setAvailableProviders(envProviders);
      
      // Set current provider from config
      const currentProvider = unifiedConfig?.dataLayer?.provider || 'mock';
      setSelectedProvider(currentProvider);
    };
    
    initializeProviders();
  }, [currentEnvironment, unifiedConfig]);
   
   // Provider handlers
   const handleProviderChange = (provider: string) => {
     setSelectedProvider(provider);
     setSaveMessage(null);
   };
   
   const handleSaveConfiguration = async () => {
     if (!selectedProvider) return;
     
     setIsSaving(true);
     setSaveMessage(null);
     
     try {
       // Set the user database configuration
       DataServiceFactory.setUserDatabaseConfig({
         provider: selectedProvider as any,
         environment: currentEnvironment,
         options: {}
       });
       
       setSaveMessage({
         type: 'success',
         text: `Database provider updated to ${selectedProvider}. Please restart the application for changes to take effect.`
       });
     } catch (error) {
       setSaveMessage({
         type: 'error',
         text: 'Failed to save configuration. Please try again.'
       });
     } finally {
       setIsSaving(false);
     }
   };
   
   const handleResetToDefault = () => {
     if (!window.confirm("Are you sure you want to reset to default database provider configuration?")) {
       return;
     }
     
     // Reset to default configuration
     DataServiceFactory.resetToDefaultConfig();
     
     let defaultProvider = 'mock';
     
     if (currentEnvironment === 'development') {
       defaultProvider = DATA_LAYER_CONFIG.development.provider;
     } else if (currentEnvironment === 'demo') {
       defaultProvider = DATA_LAYER_CONFIG.demo.provider;
     } else if (currentEnvironment === 'production') {
       defaultProvider = DATA_LAYER_CONFIG.production.default.provider;
     }
     
     setSelectedProvider(defaultProvider);
     setSaveMessage({
       type: 'info',
       text: `Reset to default provider: ${defaultProvider}`
     });
   };
   
   const { 
    isDatabaseModeActive, 
    isUsingRxDBDummyData, 
    triggerSeedRxDB: triggerSeedDatabase, 
    triggerClearRxDB: triggerClearDatabase,
    initializationError 
  } = useAppData();
  
  const currentMode = unifiedConfig?.dataMode === 'demo' ? 'demo' : 'production';

  // Database management state
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Backup management state
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [backupFileUrl, setBackupFileUrl] = useState<string | null>(null);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);

  // Database management handlers
  const handleSeedDatabase = async () => {
    if (!triggerSeedDatabase) return;
    if (!window.confirm("Are you sure you want to import dummy data? This will overwrite existing data in the local database if any.")) {
      return;
    }
    setIsSeeding(true);
    setActionMessage(null);
    try {
      await triggerSeedDatabase();
      setActionMessage({ type: 'success', text: 'Dummy data successfully imported into local database.' });
    } catch (error: any) {
      console.error("Error seeding database:", error);
      setActionMessage({ type: 'error', text: `Failed to import dummy data: ${error.message}` });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!triggerClearDatabase) return;
    if (!window.confirm("ARE YOU SURE you want to clear ALL data from the local database? This action cannot be undone.")) {
      return;
    }
    setIsClearing(true);
    setActionMessage(null);
    try {
      await triggerClearDatabase();
      setActionMessage({ type: 'success', text: 'All data successfully cleared from local database.' });
    } catch (error: any) {
      console.error("Error clearing database:", error);
      setActionMessage({ type: 'error', text: `Failed to clear data: ${error.message}` });
    } finally {
      setIsClearing(false);
    }
  };

  // Backup management handlers
  const handleCreateBackup = async () => {
    if (!window.confirm("Are you sure you want to create a backup of the database?")) {
      return;
    }
    
    setIsBackingUp(true);
    setBackupMessage(null);
    setBackupFileUrl(null);
    setBackupFileName(null);
    
    try {
      // Get the database manager instance
      const databaseManager = getDatabaseManager();
      
      // Create backup
      const backupData = await databaseManager.backup();
      
      // Create a Blob with the backup data
      const blob = new Blob([backupData], { type: 'application/json' });
      
      // Create a download URL
      const url = URL.createObjectURL(blob);
      const fileName = `schoolpilot_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      // Set state for download
      setBackupFileUrl(url);
      setBackupFileName(fileName);
      setBackupMessage({ type: 'success', text: 'Backup created successfully! Click the download button to save the file.' });
    } catch (error: any) {
      console.error("Error creating backup:", error);
      setBackupMessage({ type: 'error', text: `Failed to create backup: ${error.message}` });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadBackup = () => {
    if (!backupFileUrl || !backupFileName) return;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = backupFileUrl;
    link.download = backupFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    URL.revokeObjectURL(backupFileUrl);
    setBackupFileUrl(null);
    setBackupFileName(null);
  };

  // Common error states
  if (currentMode !== 'production') {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
          <p className="text-gray-600">Manage database operations and backup functionality</p>
        </div>
        
        <Card title="Data Management">
          <div className="p-6 text-center">
            <CogIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Data management features are only available in 'Production' mode.</p>
            <p className="text-sm text-gray-500 mt-1">Currently in '{currentMode}' mode.</p>
            <p className="text-sm text-blue-600 mt-2">Switch to Production mode in Feature Settings to access data management.</p>
          </div>
        </Card>
      </div>
    );
  }
  
  if (initializationError) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
          <p className="text-gray-600">Manage database operations and backup functionality</p>
        </div>
        
        <Card title="Data Management">
          <div className="p-6 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-700">Database Initialization Failed</h3>
            <p className="text-red-600 mt-1">The application is currently running in fallback mode using mock data.</p>
            <p className="text-sm text-gray-500 mt-2">Error: {initializationError.message}</p>
          </div>
        </Card>
      </div>
    );
  }
  
  if (!isDatabaseModeActive && currentMode === 'production') {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
          <p className="text-gray-600">Manage database operations and backup functionality</p>
        </div>
        
        <Card title="Data Management">
          <div className="p-6 text-center">
            <Spinner />
            <p className="text-gray-600 mt-2">Initializing database service... Please wait.</p>
          </div>
        </Card>
      </div>
    );
  }

  const renderDatabaseTab = () => (
    <div className="space-y-6">
      <Card title="Local Database Management">
        <div className="p-6 space-y-4">
          <div className={`p-3 rounded-md text-sm ${
            isUsingRxDBDummyData 
              ? 'bg-yellow-100 text-yellow-700' 
              : (isUsingRxDBDummyData === false 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700')
          }`}>
            <strong>Current Status:</strong> 
            {isUsingRxDBDummyData === null 
              ? ' Checking...' 
              : (isUsingRxDBDummyData 
                  ? ' Local database is currently using imported dummy data.' 
                  : ' Local database is using live data or is empty (not using dummy data).')}
          </div>

          <div className="space-x-4">
            <Button 
              onClick={handleSeedDatabase} 
              disabled={isSeeding || isClearing} 
              leftIcon={isSeeding ? <Spinner size="sm"/> : <ArchiveIcon className="w-5 h-5"/>}
            >
              {isSeeding ? 'Importing...' : 'Import Dummy Data to Database'}
            </Button>
            <Button 
              onClick={handleClearDatabase} 
              disabled={isClearing || isSeeding} 
              variant="danger"
              leftIcon={isClearing ? <Spinner size="sm"/> : <DeleteIcon className="w-5 h-5"/>}
            >
              {isClearing ? 'Clearing...' : 'Clear All Database Data'}
            </Button>
          </div>
          
          {actionMessage && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              actionMessage.type === 'success' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {actionMessage.text}
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-2">
            Note: 'Import Dummy Data' will clear existing database data before populating. 'Clear All Database Data' is irreversible.
          </p>
        </div>
      </Card>

      <Card title="Mock Data Information">
        <div className="p-6">
          <div className="flex items-start">
            <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Mock Data Handling</h3>
              <p className="text-sm text-blue-700 mt-1">
                When the application successfully migrates from mock data to the local database, 
                the mock data is automatically handled. The system will continue working with 
                the migrated data even if mock data is removed.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                If you remove mock data, the application will continue to function normally 
                using the data stored in your local database.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderBackupTab = () => (
    <div className="space-y-6">
      <Card title="Database Backup">
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700">
            <strong>Important:</strong> Creating a backup will export all data from the local database to a JSON file. 
            This file can be used to restore your data in case of corruption or migration.
          </div>

          <div className="space-x-4">
            <Button 
              onClick={handleCreateBackup} 
              disabled={isBackingUp} 
              leftIcon={isBackingUp ? <Spinner size="sm"/> : <DownloadIcon className="w-5 h-5"/>}
            >
              {isBackingUp ? 'Creating Backup...' : 'Create Database Backup'}
            </Button>
            
            {backupFileUrl && backupFileName && (
              <Button 
                onClick={handleDownloadBackup} 
                variant="success"
                leftIcon={<DownloadIcon className="w-5 h-5"/>}
              >
                Download Backup File
              </Button>
            )}
          </div>
          
          {backupMessage && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              backupMessage.type === 'success' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {backupMessage.text}
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="text-md font-semibold mb-2">Backup Instructions</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
              <li>Click "Create Database Backup" to generate a backup file</li>
              <li>After creation, click "Download Backup File" to save it to your computer</li>
              <li>Store backup files in a secure location</li>
              <li>Regular backups are recommended for data safety</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderProviderTab = () => (
    <div className="space-y-6">
      <Card title="Database Provider Settings">
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Current Environment</h3>
                <p className="text-sm text-blue-700 mt-1">
                  You are currently in <strong>{currentEnvironment}</strong> mode. 
                  Available providers: {availableProviders.join(', ')}.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Database Provider
              </label>
              <Select
                value={selectedProvider}
                onChange={handleProviderChange}
                options={availableProviders.map(provider => ({
                  value: provider,
                  label: provider.charAt(0).toUpperCase() + provider.slice(1)
                }))}
                disabled={isSaving}
                data-testid="provider-selector"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Status
              </label>
              <div className={`p-3 rounded-md text-sm ${isDatabaseModeActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                <div className="flex items-center">
                  {isDatabaseModeActive ? (
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                  ) : (
                    <AlertTriangleIcon className="w-4 h-4 mr-2" />
                  )}
                  <span>
                    {isDatabaseModeActive 
                      ? 'Using database provider for data storage' 
                      : 'Using mock data (database not active)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <Button 
              onClick={handleSaveConfiguration} 
              disabled={isSaving || !selectedProvider} 
              leftIcon={isSaving ? <Spinner size="sm"/> : null}
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button 
              onClick={handleResetToDefault} 
              variant="secondary"
              disabled={isSaving}
            >
              Reset to Default
            </Button>
          </div>
          
          {saveMessage && (
            <div className={`p-3 rounded-md text-sm ${
              saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 
              saveMessage.type === 'error' ? 'bg-red-100 text-red-700' : 
              'bg-blue-100 text-blue-700'
            }`}>
              {saveMessage.text}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const tabs = [
    { id: 'database', label: 'Database Management', icon: CircleStackIcon },
    { id: 'backup', label: 'Backup & Restore', icon: ArchiveIcon },
    { id: 'provider', label: 'Database Provider', icon: DatabaseIcon }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
            <p className="text-gray-600">Manage database operations, backup functionality, and provider settings</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'database' && renderDatabaseTab()}
        {activeTab === 'backup' && renderBackupTab()}
        {activeTab === 'provider' && renderProviderTab()}
      </div>
    </div>
  );
};

export default DataManagementSettingsPage;