// ABOUTME: Settings page for data layer configuration and mode management
// ABOUTME: Provides comprehensive interface for database provider settings and mode switching

import React, { useState, useEffect } from 'react';
import { UnifiedModeSwitch } from '../components/UnifiedModeSwitch';
import { useDataMode } from '../hooks/useDataMode';
import { DatabaseProviderFactory } from '../services/database/DatabaseProviderFactory';
import { getDataLayerConfig } from '../config/dataLayerConfig';
import { Database, Settings, Info, AlertCircle, CheckCircle, Server } from 'lucide-react';

interface ProviderInfo {
  type: string;
  name: string;
  description: string;
  isAvailable: boolean;
  isActive: boolean;
  config?: any;
}

interface BackendIntegration {
  name: string;
  description: string;
  status: 'available' | 'configured' | 'unavailable';
  config?: any;
}

export const DataLayerSettings: React.FC = () => {
  const { status, error } = useDataMode();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [backendIntegrations, setBackendIntegrations] = useState<BackendIntegration[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'modes' | 'providers' | 'backend'>('modes');

  const dbFactory = DatabaseProviderFactory.getInstance();

  useEffect(() => {
    loadProviderInfo();
    loadBackendIntegrations();
  }, [status]);

  const loadProviderInfo = async () => {
    try {
      const availableProviders = dbFactory.getAvailableProviders();
      const activeProvider = dbFactory.getActiveProvider();
      
      const providerInfos: ProviderInfo[] = [
        {
          type: 'sqlite-file',
          name: 'SQLite File',
          description: 'Local SQLite database with file storage. Best for development and testing.',
          isAvailable: dbFactory.isProviderAvailable('sqlite-file'),
          isActive: activeProvider?.name === 'SQLiteFile',
          config: getDataLayerConfig('development').provider.config
        },
        {
          type: 'sqlite',
          name: 'SQLite OPFS',
          description: 'SQLite with Origin Private File System. Good for demo and offline usage.',
          isAvailable: dbFactory.isProviderAvailable('sqlite'),
          isActive: activeProvider?.name === 'SQLiteOPFS',
          config: getDataLayerConfig('demo').provider.config
        },
        {
          type: 'sqlite-wasm',
          name: 'SQLite WASM',
          description: 'WebAssembly SQLite for browser environments. Production-ready offline storage.',
          isAvailable: dbFactory.isProviderAvailable('sqlite-wasm'),
          isActive: activeProvider?.name === 'SQLiteWASM',
          config: getDataLayerConfig('production').provider.config
        },
        {
          type: 'pouchdb',
          name: 'PouchDB',
          description: 'NoSQL database with CouchDB synchronization. Great for offline-first apps.',
          isAvailable: dbFactory.isProviderAvailable('pouchdb'),
          isActive: activeProvider?.name === 'PouchDB',
          config: getDataLayerConfig('production', 'couchdb').provider.config
        },
        {
          type: 'rxdb',
          name: 'RxDB',
          description: 'Reactive database with PostgreSQL sync via ElectricSQL. Real-time updates.',
          isAvailable: dbFactory.isProviderAvailable('rxdb'),
          isActive: activeProvider?.name === 'RxDB',
          config: getDataLayerConfig('production', 'postgresql').provider.config
        }
      ];

      setProviders(providerInfos);
    } catch (error) {
      console.error('Failed to load provider info:', error);
    }
  };

  const loadBackendIntegrations = () => {
    const integrations: BackendIntegration[] = [
      {
        name: 'ERPNext',
        description: 'Enterprise Resource Planning system integration',
        status: 'available',
        config: getDataLayerConfig('production', 'erpnext').backend
      },
      {
        name: 'CouchDB',
        description: 'NoSQL database with built-in replication',
        status: 'available',
        config: getDataLayerConfig('production', 'couchdb').backend
      },
      {
        name: 'PostgreSQL',
        description: 'Relational database with ElectricSQL sync',
        status: 'available',
        config: getDataLayerConfig('production', 'postgresql').backend
      },
      {
        name: 'Custom API',
        description: 'Custom REST API integration',
        status: 'available',
        config: getDataLayerConfig('production', 'api').backend
      }
    ];

    setBackendIntegrations(integrations);
  };

  const getStatusIcon = (isAvailable: boolean, isActive: boolean) => {
    if (isActive) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    if (isAvailable) {
      return <Database className="w-4 h-4 text-blue-600" />;
    }
    return <AlertCircle className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = (isAvailable: boolean, isActive: boolean) => {
    if (isActive) return 'Active';
    if (isAvailable) return 'Available';
    return 'Unavailable';
  };

  const getStatusColor = (isAvailable: boolean, isActive: boolean) => {
    if (isActive) return 'text-green-600';
    if (isAvailable) return 'text-blue-600';
    return 'text-gray-400';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Data Layer Settings</h1>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'modes', label: 'Mode Switching', icon: Database },
            { id: 'providers', label: 'Database Providers', icon: Server },
            { id: 'backend', label: 'Backend Integration', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
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
      <div className="space-y-6">
        {/* Mode Switching Tab */}
        {activeTab === 'modes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Data Layer Mode Management</h2>
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
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Mode Descriptions:</p>
                  <ul className="mt-1 space-y-1">
                    <li><strong>Development:</strong> SQLite file storage for local development and debugging</li>
                    <li><strong>Demo:</strong> SQLite WASM with OPFS and pre-loaded sample data</li>
                    <li><strong>Production:</strong> Production database with live data and backend sync</li>
                  </ul>
                </div>
              </div>
            </div>

            <UnifiedModeSwitch 
              variant="card"
              showDescription={true}
            />
          </div>
        )}

        {/* Database Providers Tab */}
        {activeTab === 'providers' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Available Database Providers</h2>
            
            <div className="grid gap-4">
              {providers.map((provider) => (
                <div key={provider.type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(provider.isAvailable, provider.isActive)}
                      <h3 className="font-medium">{provider.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        provider.isActive 
                          ? 'bg-green-100 text-green-800'
                          : provider.isAvailable
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getStatusText(provider.isAvailable, provider.isActive)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{provider.description}</p>
                  
                  {provider.config && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                        Configuration Details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                        {JSON.stringify(provider.config, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backend Integration Tab */}
        {activeTab === 'backend' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Backend Integration Options</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Backend integrations are configured per environment.</p>
                  <p>Switch to production mode to enable backend synchronization.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {backendIntegrations.map((integration) => (
                <div key={integration.name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Server className="w-4 h-4 text-gray-600" />
                      <h3 className="font-medium">{integration.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        integration.status === 'configured'
                          ? 'bg-green-100 text-green-800'
                          : integration.status === 'available'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {integration.status}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{integration.description}</p>
                  
                  {integration.config && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                        Configuration Details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                        {JSON.stringify(integration.config, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Current Status Summary */}
      {status && (
        <div className="mt-8 p-4 bg-gray-50 border rounded-lg">
          <h3 className="font-medium mb-2">Current Status Summary</h3>
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
              <span className="text-gray-600">Last Switch:</span>
              <div className="font-medium">{status.lastSwitched.toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataLayerSettings;