// ABOUTME: Settings page for data layer configuration and mode management
// ABOUTME: Provides comprehensive interface for database provider settings and mode switching

import React, { useState, useEffect } from 'react';
import { UnifiedModeSwitch } from '../../../components/UnifiedModeSwitch';
import { useDataMode } from '../../../hooks/useDataMode';
import { DatabaseProviderFactory } from '../../../services/database/DatabaseProviderFactory';
import { getDataLayerConfig } from '../../../config/dataLayerConfig';
import { Database, Settings, Info, AlertCircle, CheckCircle, Server, Cog } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useAppData } from '@/hooks/useAppData';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';
import { DataServiceFactory } from '@/services/DataServiceFactory';
import { DATA_LAYER_CONFIG } from '@/config/dataLayerConfig';
import { useDatabaseProvider } from '../../../hooks/useDatabaseProvider';
import DatabaseProviderTab from '../components/DatabaseProviderTab';

interface ProviderInfo {
  type: string;
  name: string;
  description: string;
  isAvailable: boolean;
  isActive: boolean;
  config?: any;
}

interface BackendIntegrationInfo {
  type: string;
  name: string;
  description: string;
  isConfigured: boolean;
  config?: any;
}

export const DataLayerSettingsPage: React.FC = () => {
  const { status: dataModeStatus, switchMode, isLoading } = useDataMode();
  const currentMode = dataModeStatus?.currentMode || 'development';
  const [activeTab, setActiveTab] = useState<'mode' | 'providers' | 'backend' | 'database-provider'>('mode');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Database Provider tab state
  const { 
    isDatabaseModeActive, 
    initializationError 
  } = useAppData();
  
  const { config, updateConfig } = useUnifiedConfig();
  const currentEnvironment = config?.environment || 'development';
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [backendIntegrations, setBackendIntegrations] = useState<BackendIntegrationInfo[]>([]);
  const [status, setStatus] = useState({
    currentMode: 'development',
    activeProvider: 'SQLite File',
    dataCount: 0,
    lastSync: null as Date | null
  });

  // Load provider information
  const loadProviders = () => {
    const providerData: ProviderInfo[] = [
      {
        type: 'sqlite-file',
        name: 'SQLite File Storage',
        description: 'Local file-based SQLite database for development',
        isAvailable: true,
        isActive: currentMode === 'development',
        config: getDataLayerConfig('development').provider.config
      },
      {
        type: 'sqlite-wasm',
        name: 'SQLite WASM + OPFS',
        description: 'Browser-based SQLite with Origin Private File System',
        isAvailable: true,
        isActive: currentMode === 'demo',
        config: getDataLayerConfig('demo').provider.config
      },
      {
        type: 'pouchdb',
        name: 'PouchDB',
        description: 'Browser database with optional CouchDB sync',
        isAvailable: true,
        isActive: currentMode === 'production',
        config: getDataLayerConfig('production').provider.config
      },
      {
        type: 'couchdb',
        name: 'CouchDB Integration',
        description: 'Direct CouchDB connection for production',
        isAvailable: true,
        isActive: false,
        config: getDataLayerConfig('production', 'couchdb').provider.config
      },
      {
        type: 'postgresql',
        name: 'PostgreSQL',
        description: 'Enterprise PostgreSQL database',
        isAvailable: true,
        isActive: false,
        config: getDataLayerConfig('production', 'postgresql').provider.config
      }
    ];

    setProviders(providerData);

    // Update status
    setStatus({
      currentMode,
      activeProvider: providerData.find(p => p.isActive)?.name || 'Unknown',
      dataCount: 0, // This would be fetched from the actual provider
      lastSync: null
    });
  };

  // Load backend integration information
  const loadBackendIntegrations = () => {
    const backendData: BackendIntegrationInfo[] = [
      {
        type: 'none',
        name: 'No Backend Integration',
        description: 'Local-only data storage',
        isConfigured: true
      },
      {
        type: 'erpnext',
        name: 'ERPNext Integration',
        description: 'Sync with ERPNext ERP system',
        isConfigured: false,
        config: getDataLayerConfig('production', 'erpnext').backend
      },
      {
        type: 'couchdb',
        name: 'CouchDB Sync',
        description: 'Real-time sync with CouchDB server',
        isConfigured: false,
        config: getDataLayerConfig('production', 'couchdb').backend
      },
      {
        type: 'postgresql',
        name: 'PostgreSQL API',
        description: 'REST API connection to PostgreSQL',
        isConfigured: false,
        config: getDataLayerConfig('production', 'postgresql').backend
      },
      {
        type: 'api',
        name: 'Custom API',
        description: 'Generic REST API integration',
        isConfigured: false,
        config: getDataLayerConfig('production', 'api').backend
      }
    ];

    setBackendIntegrations(backendData);
  };

  // Initialize available providers based on environment
  const initializeDatabaseProviders = () => {
    let providers: string[] = [];
    
    switch (currentEnvironment) {
      case 'development':
        providers = ['sqlite', 'pouchdb', 'livestore', 'mock'];
        break;
      case 'production':
        providers = ['pouchdb', 'rxdb', 'livestore'];
        break;
      case 'demo':
        providers = ['sqlite', 'pouchdb', 'livestore', 'mock'];
        break;
      default:
        providers = ['sqlite', 'pouchdb', 'livestore', 'mock'];
    }
    
    setAvailableProviders(providers);
    
    // Set initial provider based on current configuration
    const currentProvider = DataServiceFactory.getUserDatabaseConfig()?.provider || 
                          (currentEnvironment === 'development' ? DATA_LAYER_CONFIG.development.provider :
                           currentEnvironment === 'production' ? DATA_LAYER_CONFIG.production.default.provider :
                           DATA_LAYER_CONFIG.demo.provider);
    
    setSelectedProvider(currentProvider);
  };

  useEffect(() => {
    loadProviders();
    loadBackendIntegrations();
    initializeDatabaseProviders();
  }, [currentMode, currentEnvironment]);



  // Database Provider handlers
  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
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
        text: `Database provider set to ${selectedProvider}. Changes will take effect on next application restart.` 
      });
      
      // Update unified config if needed
      if (updateConfig) {
        await updateConfig({
          ...config,
          database: {
            ...config.database,
            provider: selectedProvider
          }
        });
      }
    } catch (error: any) {
      console.error("Error saving database provider configuration:", error);
      setSaveMessage({ 
        type: 'error', 
        text: `Failed to save configuration: ${error.message}` 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm("Are you sure you want to reset to default database provider configuration?")) {
      return;
    }
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Reset to default configuration
      DataServiceFactory.resetToDefaultConfig();
      
      // Reset to environment default
      const defaultProvider = currentEnvironment === 'development' ? DATA_LAYER_CONFIG.development.provider :
                            currentEnvironment === 'production' ? DATA_LAYER_CONFIG.production.default.provider :
                            DATA_LAYER_CONFIG.demo.provider;
      
      setSelectedProvider(defaultProvider);
      
      setSaveMessage({ 
        type: 'success', 
        text: `Database provider reset to default (${defaultProvider}). Changes will take effect on next application restart.` 
      });
    } catch (error: any) {
      console.error("Error resetting database provider configuration:", error);
      setSaveMessage({ 
        type: 'error', 
        text: `Failed to reset configuration: ${error.message}` 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (isActive: boolean, isAvailable: boolean) => {
    if (!isAvailable) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (isActive) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <div className="w-4 h-4 rounded-full bg-gray-300" />;
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
            { id: 'mode', label: 'Mode Switching', icon: Settings },
            { id: 'providers', label: 'Database Providers', icon: Database },
            { id: 'database-provider', label: 'Database Provider', icon: Cog },
            { id: 'backend', label: 'Backend Integration', icon: Server }
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
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Data Mode Configuration</h3>
              
              <div className="space-y-4">
                <UnifiedModeSwitch 
                  variant="card"
                  showDescription={true}
                />

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                  </button>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Mode Switching Information</p>
                      <p className="mt-1">
                        Switching modes will change the underlying database provider and may require data migration.
                        Development mode uses local files, Demo mode uses browser storage with sample data,
                        and Production mode supports various backend integrations.
                      </p>
                    </div>
                  </div>
                </div>

                {showAdvanced && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Advanced Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Auto-migration:</span>
                        <span className="text-green-600">Enabled</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data validation:</span>
                        <span className="text-green-600">Enabled</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Backup on switch:</span>
                        <span className="text-green-600">Enabled</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Database Providers Tab */}
        {activeTab === 'providers' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Available Database Providers</h3>
              
              <div className="space-y-3">
                {providers.map((provider) => (
                  <div
                    key={provider.type}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      provider.isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(provider.isActive, provider.isAvailable)}
                      <div>
                        <h4 className="font-medium">{provider.name}</h4>
                        <p className="text-sm text-gray-600">{provider.description}</p>
                      </div>
                    </div>
                    <div className="text-sm">
                      {provider.isActive ? (
                        <span className="text-green-600 font-medium">Active</span>
                      ) : provider.isAvailable ? (
                        <span className="text-gray-500">Available</span>
                      ) : (
                        <span className="text-red-500">Unavailable</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Backend Integration Tab */}
        {activeTab === 'backend' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Backend Integration Options</h3>
              
              <div className="space-y-3">
                {backendIntegrations.map((integration) => (
                  <div
                    key={integration.type}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      integration.isConfigured ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {integration.isConfigured ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-300" />
                      )}
                      <div>
                        <h4 className="font-medium">{integration.name}</h4>
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      </div>
                    </div>
                    <div className="text-sm">
                      {integration.isConfigured ? (
                        <span className="text-green-600 font-medium">Configured</span>
                      ) : (
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          Configure
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Database Provider Tab */}
        {activeTab === 'database-provider' && (
          <DatabaseProviderTab
            currentEnvironment={process.env.NODE_ENV || 'development'}
            currentMode={currentMode}
            selectedProvider={selectedProvider}
            providers={providers}
            saveMessage={saveMessage}
            isSaving={isSaving}
            onProviderChange={handleProviderChange}
            onSaveConfiguration={handleSaveConfiguration}
            onResetToDefault={handleResetToDefault}
            getStatusIcon={getStatusIcon}
          />
        )}
      </div>

      {/* Current Status Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Current Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Mode:</span>
            <div className="font-medium capitalize">{status.currentMode}</div>
          </div>
          <div>
            <span className="text-gray-600">Provider:</span>
            <div className="font-medium">{status.activeProvider}</div>
          </div>
          <div>
            <span className="text-gray-600">Records:</span>
            <div className="font-medium">{status.dataCount}</div>
          </div>
          <div>
            <span className="text-gray-600">Last Sync:</span>
            <div className="font-medium">{status.lastSync ? status.lastSync.toLocaleString() : 'Never'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataLayerSettingsPage;