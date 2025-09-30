// pages/settings/DatabaseProviderSettingsPage.tsx
import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useAppData } from '@/hooks/useAppData';
import { CogIcon, DatabaseIcon, CheckCircleIcon, AlertTriangleIcon, InformationCircleIcon } from '../../../components/ui/icons';
import { useTranslation } from 'react-i18next';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';
import { DataServiceFactory } from '@/services/DataServiceFactory';
import { DATA_LAYER_CONFIG } from '@/config/dataLayerConfig';

const DatabaseProviderSettingsPage: React.FC = () => {
  const { 
    isDatabaseModeActive, 
    initializationError 
  } = useAppData();
  
  const { config, updateConfig } = useUnifiedConfig();
  const currentMode = config.dataMode === 'demo' ? 'demo' : 'production';
  const currentEnvironment = config.environment;

  // State for database provider selection
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  // Initialize available providers based on environment
  useEffect(() => {
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
  }, [currentEnvironment]);

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
      await updateConfig({
        ...config,
        database: {
          ...config.database,
          provider: selectedProvider
        }
      });
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

  // Provider descriptions
  const providerDescriptions: Record<string, string> = {
    sqlite: 'SQLite WASM with OPFS - High performance local database with persistent storage',
    pouchdb: 'PouchDB - IndexedDB-based database with CouchDB sync capabilities',
    rxdb: 'RxDB - Advanced reactive database (requires license)',
    livestore: 'LiveStore - SQLite WASM with OPFS and real-time sync capabilities',
    mock: 'Mock Data - In-memory data for development and testing'
  };

  // Provider icons
  const providerIcons: Record<string, React.ReactNode> = {
    sqlite: <DatabaseIcon className="w-5 h-5 text-blue-500" />,
    pouchdb: <DatabaseIcon className="w-5 h-5 text-green-500" />,
    rxdb: <DatabaseIcon className="w-5 h-5 text-purple-500" />,
    livestore: <DatabaseIcon className="w-5 h-5 text-orange-500" />,
    mock: <DatabaseIcon className="w-5 h-5 text-gray-500" />
  };

  if (currentMode !== 'production' && currentMode !== 'demo') {
    return (
      <Card title="Database Provider Settings">
        <div className="p-6 text-center">
          <CogIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Database provider configuration is only available in 'Demo' or 'Production' mode.</p>
          <p className="text-sm text-gray-500 mt-1">Currently in '{currentMode}' mode.</p>
        </div>
      </Card>
    );
  }
  
  if (initializationError) {
     return (
      <Card title="Database Provider Settings">
        <div className="p-6 text-center">
          <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700">Database Initialization Failed</h3>
          <p className="text-red-600 mt-1">The application is currently running in fallback mode using mock data.</p>
          <p className="text-sm text-gray-500 mt-2">Error: {initializationError.message}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Database Provider Configuration">
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Current Environment</h3>
                <p className="text-sm text-blue-700 mt-1">
                  You are currently in <strong>{currentEnvironment}</strong> mode. 
                  Available database providers for this environment: {availableProviders.join(', ')}.
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Note: Changes to database provider configuration will take effect on application restart.
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
              />
              {selectedProvider && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center">
                    {providerIcons[selectedProvider]}
                    <span className="ml-2 font-medium text-gray-900">
                      {selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {providerDescriptions[selectedProvider]}
                  </p>
                </div>
              )}
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
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment
                </label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {currentEnvironment.charAt(0).toUpperCase() + currentEnvironment.slice(1)}
                  </span>
                </div>
              </div>
            </div>
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
        </div>
      </Card>

      {/* Provider Information */}
      <Card title="Database Provider Information">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(providerDescriptions).map(([provider, description]) => (
              <div 
                key={provider} 
                className={`p-4 rounded-lg border ${
                  availableProviders.includes(provider) 
                    ? 'border-gray-200 bg-white' 
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center">
                  {providerIcons[provider]}
                  <h3 className="ml-2 font-medium text-gray-900">
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </h3>
                  {!availableProviders.includes(provider) && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      Not available
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">{description}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800">SQLite WASM in Demo Mode</h3>
            <p className="text-sm text-blue-700 mt-1">
              As requested, SQLite WASM is available as an option in demo mode. This allows you to test 
              the full database functionality without requiring a backend connection.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Simple spinner component for use in the file
const Spinner: React.FC<{size?: 'sm' | 'md' | 'lg'}> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <div className={`inline-block ${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full animate-spin`} />
  );
};



export default DatabaseProviderSettingsPage;