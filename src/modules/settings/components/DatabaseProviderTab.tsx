import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Provider {
  type: string;
  name: string;
  description: string;
  isActive: boolean;
  isAvailable: boolean;
}

interface DatabaseProviderTabProps {
  currentEnvironment: string;
  currentMode: string;
  selectedProvider: string | null;
  providers: Provider[];
  saveMessage: { type: 'success' | 'error'; text: string } | null;
  isSaving: boolean;
  onProviderChange: (value: string) => void;
  onSaveConfiguration: () => void;
  onResetToDefault: () => void;
  getStatusIcon: (isActive: boolean, isAvailable: boolean) => React.ReactNode;
}

const DatabaseProviderTab: React.FC<DatabaseProviderTabProps> = ({
  currentEnvironment,
  currentMode,
  selectedProvider,
  providers,
  saveMessage,
  isSaving,
  onProviderChange,
  onSaveConfiguration,
  onResetToDefault,
  getStatusIcon
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Database Provider Configuration</h3>
        
        {/* Environment Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Current Environment</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className="font-medium capitalize">{currentEnvironment}</span>
            </div>
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="font-medium capitalize">{currentMode}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Provider:</span>
              <span className="font-medium">{selectedProvider || 'Not selected'}</span>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Database Provider
            </label>
            <select
              value={selectedProvider || ''}
              onChange={(e) => onProviderChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a provider...</option>
              {providers.filter(p => p.isAvailable).map((provider) => (
                <option key={provider.type} value={provider.type}>
                  {provider.name} - {provider.description}
                </option>
              ))}
            </select>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={`p-4 rounded-lg ${
              saveMessage.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {saveMessage.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onSaveConfiguration}
              disabled={!selectedProvider || isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
            
            <button
              onClick={onResetToDefault}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* Provider Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Provider Information</h3>
        
        <div className="space-y-4">
          {providers.map((provider) => (
            <div
              key={provider.type}
              className={`p-4 border rounded-lg ${
                provider.isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getStatusIcon(provider.isActive, provider.isAvailable)}
                  <div>
                    <h4 className="font-medium">{provider.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{provider.description}</p>
                    <div className="mt-2 text-xs">
                      <span className={`px-2 py-1 rounded ${
                        provider.isAvailable 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {provider.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                      {provider.isActive && (
                        <span className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-800">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {currentMode === 'demo' && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Demo Mode Note</p>
                <p className="mt-1">
                  In demo mode, SQLite WASM is used for browser-based storage with sample data.
                  This provides a realistic experience without requiring server setup.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseProviderTab;