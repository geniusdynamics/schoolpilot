// ABOUTME: Backend configuration component for managing backend architecture settings
// ABOUTME: Provides UI for switching between different backend types and viewing capabilities

import React, { useState, useEffect } from 'react';
import {
  backendArchitecture,
  BackendType,
  BackendConfig
} from '../config/backendArchitecture';

interface BackendConfigurationProps {
  className?: string;
}

export const BackendConfiguration: React.FC<BackendConfigurationProps> = ({ className: _className = '' }) => {
  void _className;
  const [currentBackend, setCurrentBackend] = useState<BackendType>('frontend-only');
  const [backendConfig, setBackendConfig] = useState<BackendConfig | null>(null);
  const [isApiAvailable, setIsApiAvailable] = useState<boolean>(false);
  const [isCheckingApi, setIsCheckingApi] = useState<boolean>(false);

  useEffect(() => {
    // Initialize backend configuration
    const backendConfigFromArch = backendArchitecture.getConfig();
    setBackendConfig(backendConfigFromArch);
    setCurrentBackend(backendConfigFromArch.type);
    
    // Check API availability
    checkApiAvailability();
  }, []);

  const checkApiAvailability = async () => {
    setIsCheckingApi(true);
    try {
      const available = await backendArchitecture.isBackendAvailable();
      setIsApiAvailable(available);
    } catch (error) {
      console.warn('Error checking API availability:', error);
      setIsApiAvailable(false);
    } finally {
      setIsCheckingApi(false);
    }
  };

  const handleBackendSwitch = (backendType: BackendType) => {
    backendArchitecture.switchBackend(backendType);
    const newConfig = backendArchitecture.getConfig();
    setBackendConfig(newConfig);
    setCurrentBackend(backendType);
    
    // Recheck API availability for new backend
    if (backendType !== 'frontend-only') {
      checkApiAvailability();
    }
  };

  const renderCapabilitySection = (title: string, capabilities: Record<string, boolean>) => {
    const enabledCapabilities = Object.entries(capabilities)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
    
    const disabledCapabilities = Object.entries(capabilities)
      .filter(([, enabled]) => !enabled)
      .map(([name]) => name);

    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
        <div className="space-y-1">
          {enabledCapabilities.map(capability => (
            <div key={capability} className="flex items-center text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              <span className="text-gray-600 capitalize">{capability.replace(/([A-Z])/g, ' $1').trim()}</span>
            </div>
          ))}
          {disabledCapabilities.map(capability => (
            <div key={capability} className="flex items-center text-xs opacity-50">
              <span className="w-2 h-2 bg-gray-300 rounded-full mr-2"></span>
              <span className="text-gray-400 capitalize">{capability.replace(/([A-Z])/g, ' $1').trim()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getBackendStatusColor = () => {
    if (currentBackend === 'frontend-only') return 'text-blue-600';
    if (isApiAvailable) return 'text-green-600';
    return 'text-orange-600';
  };

  const getBackendStatusText = () => {
    if (currentBackend === 'frontend-only') return 'Local Database';
    if (isCheckingApi) return 'Checking...';
    if (isApiAvailable) return 'API Connected';
    return 'API Unavailable';
  };

  if (!backendConfig) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <div className="text-sm text-gray-500">Loading backend configuration...</div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Backend Configuration</h3>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${getBackendStatusColor()}`}>
            {getBackendStatusText()}
          </span>
          {currentBackend !== 'frontend-only' && (
            <button
              onClick={checkApiAvailability}
              disabled={isCheckingApi}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            >
              {isCheckingApi ? 'Checking...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {/* Backend Type Selection */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Backend Type</h4>
        <div className="grid grid-cols-2 gap-2">
          {(['frontend-only', 'frappe-education', 'custom-api', 'hybrid'] as BackendType[]).map((type) => (
            <label key={type} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="backendType"
                value={type}
                checked={currentBackend === type}
                onChange={() => handleBackendSwitch(type)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 capitalize">
                {type.replace(/-/g, ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Current Configuration Details */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Configuration Details</h4>
        <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
          <div><span className="font-medium">Data Source:</span> {backendConfig.dataSource}</div>
          <div><span className="font-medium">Sync Strategy:</span> {backendConfig.syncStrategy}</div>
          {backendConfig.endpoints.api && (
            <div><span className="font-medium">API Endpoint:</span> {backendConfig.endpoints.api}</div>
          )}
          {backendConfig.endpoints.couchdb && (
            <div><span className="font-medium">CouchDB:</span> {backendConfig.endpoints.couchdb}</div>
          )}
        </div>
      </div>

      {/* Capabilities Overview */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Available Capabilities</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            {renderCapabilitySection('Core Operations', backendConfig.capabilities.crud)}
          </div>
          
          <div className="bg-gray-50 p-3 rounded">
            {renderCapabilitySection('Advanced Features', backendConfig.capabilities.advanced)}
          </div>
          
          <div className="bg-gray-50 p-3 rounded">
            {renderCapabilitySection('Integrations', backendConfig.capabilities.integrations)}
          </div>
        </div>
      </div>

      {/* Fallback Strategy */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Fallback Strategy</h4>
        <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
          <div><span className="font-medium">Primary:</span> {backendConfig.fallbackStrategy.primary}</div>
          <div><span className="font-medium">Fallback:</span> {backendConfig.fallbackStrategy.fallback}</div>
          <div><span className="font-medium">Auto Fallback:</span> {backendConfig.fallbackStrategy.autoFallback ? 'Enabled' : 'Disabled'}</div>
          <div><span className="font-medium">Timeout:</span> {backendConfig.fallbackStrategy.fallbackTimeout}ms</div>
          <div><span className="font-medium">Retry Attempts:</span> {backendConfig.fallbackStrategy.retryAttempts}</div>
        </div>
      </div>

      {/* Warning for API backends when API is unavailable */}
      {currentBackend !== 'frontend-only' && !isApiAvailable && !isCheckingApi && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
          <div className="flex items-center">
            <span className="text-orange-600 text-sm font-medium">⚠️ API Unavailable</span>
          </div>
          <p className="text-xs text-orange-700 mt-1">
            The selected backend requires API access, but the API is currently unavailable. 
            The system will fall back to local database operations.
          </p>
        </div>
      )}
    </div>
  );
};

export default BackendConfiguration;