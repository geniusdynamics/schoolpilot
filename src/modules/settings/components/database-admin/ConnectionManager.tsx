import React, { useState } from 'react';
import Card from '../../../../components/ui/Card';
import { useUnifiedConfig } from '../../../../hooks/useUnifiedConfig';

const ConnectionManager: React.FC = () => {
  const { config, updateDatabaseConfig, updateDatabaseProvider } = useUnifiedConfig();
  const [selectedProvider, setSelectedProvider] = useState(config.database?.provider || 'mock');

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    try {
      updateDatabaseProvider(provider as any);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card title="Connection & Backend Engine" className="shadow-sm">
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-600">Select the primary database engine for the application.</p>
        
        <div className="flex flex-col space-y-2">
          <label htmlFor="dbProvider" className="font-medium text-gray-900">Database Provider</label>
          <select 
            id="dbProvider"
            className="border border-gray-300 rounded-md p-2"
            value={selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
          >
            <option value="sqlite-wasm">SQLite (WASM in-memory/OPFS)</option>
            <option value="sqlite-file">SQLite (File-based)</option>
            <option value="pouchdb">PouchDB (Sync enabled)</option>
            <option value="backend-api">Remote Backend API</option>
            <option value="mock">Mock Data (Development)</option>
          </select>
        </div>

        {selectedProvider === 'backend-api' && (
          <div className="space-y-4 mt-4 border-t pt-4">
            <h4 className="font-medium text-gray-900">Remote API Configuration</h4>
            <div className="flex flex-col space-y-2">
              <label className="text-sm text-gray-700">API Base URL</label>
              <input 
                type="text" 
                className="border border-gray-300 rounded-md p-2"
                placeholder="https://api.example.com/v1"
                value={config.database?.apiConfig?.apiBaseUrl || ''}
                onChange={(e) => updateDatabaseConfig({ apiConfig: { ...config.database?.apiConfig, apiBaseUrl: e.target.value } })}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ConnectionManager;