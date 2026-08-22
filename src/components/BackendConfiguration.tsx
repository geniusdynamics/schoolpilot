import { logger } from '@/utils/logging';

// ABOUTME: Backend configuration component for managing backend architecture settings
// ABOUTME: Provides UI for switching between different backend types and viewing capabilities

import React, { useEffect, useMemo, useState } from 'react';
import {
  BACKEND_CONFIGS,
  backendArchitecture,
  BackendType,
  BackendConfig
} from '@/config/backendArchitecture';

interface BackendConfigurationProps {
  className?: string;
  title?: string;
  value?: BackendType;
  allowedTypes?: BackendType[];
  onChange?: (backendType: BackendType) => void;
}

const DEFAULT_BACKEND_TYPES: BackendType[] = ['frontend-only', 'frappe-education', 'custom-api', 'hybrid'];

export const BackendConfiguration: React.FC<BackendConfigurationProps> = ({
  className = '',
  title = 'Backend Configuration',
  value,
  allowedTypes,
  onChange
}) => {
  const backendTypes = useMemo(
    () => (allowedTypes && allowedTypes.length > 0 ? allowedTypes : DEFAULT_BACKEND_TYPES),
    [allowedTypes]
  );
  const [currentBackend, setCurrentBackend] = useState<BackendType>(value || backendArchitecture.getConfig().type);
  const [backendConfig, setBackendConfig] = useState<BackendConfig | null>(BACKEND_CONFIGS[value || backendArchitecture.getConfig().type]);
  const [isApiAvailable, setIsApiAvailable] = useState<boolean>(false);
  const [isCheckingApi, setIsCheckingApi] = useState<boolean>(false);

  const syncBackendConfig = (backendType: BackendType) => {
    backendArchitecture.switchBackend(backendType);
    setCurrentBackend(backendType);
    setBackendConfig(BACKEND_CONFIGS[backendType]);
  };

  useEffect(() => {
    const initialBackend = backendTypes.includes(value || backendArchitecture.getConfig().type)
      ? (value || backendArchitecture.getConfig().type)
      : backendTypes[0];

    syncBackendConfig(initialBackend);
  }, [value, backendTypes]);

  const checkApiAvailability = async () => {
    setIsCheckingApi(true);
    try {
      const available = await backendArchitecture.isBackendAvailable();
      setIsApiAvailable(available);
    } catch (error) {
      logger.warn('Error checking API availability:', error);
      setIsApiAvailable(false);
    } finally {
      setIsCheckingApi(false);
    }
  };

  useEffect(() => {
    if (currentBackend !== 'frontend-only') {
      checkApiAvailability();
      return;
    }

    setIsApiAvailable(false);
    setIsCheckingApi(false);
  }, [currentBackend]);

  const handleBackendSwitch = (backendType: BackendType) => {
    syncBackendConfig(backendType);
    onChange?.(backendType);
  };

  const renderCapabilitySection = (sectionTitle: string, capabilities: Record<string, boolean>) => {
    const entries = Object.entries(capabilities);

    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">{sectionTitle}</h4>
        <div className="space-y-1">
          {entries.map(([capability, enabled]) => (
            <div key={capability} className={`flex items-center text-xs ${enabled ? '' : 'opacity-50'}`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              <span className={enabled ? 'text-gray-600 capitalize' : 'text-gray-400 capitalize'}>
                {capability.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getBackendStatusColor = () => {
    if (currentBackend === 'frontend-only') {
      return 'text-blue-600';
    }

    if (isApiAvailable) {
      return 'text-green-600';
    }

    return 'text-orange-600';
  };

  const getBackendStatusText = () => {
    if (currentBackend === 'frontend-only') {
      return 'Local Database';
    }

    if (isCheckingApi) {
      return 'Checking...';
    }

    if (isApiAvailable) {
      return 'API Connected';
    }

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
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
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

      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Backend Type</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {backendTypes.map((type) => (
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

      {currentBackend !== 'frontend-only' && !isApiAvailable && !isCheckingApi && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
          <div className="flex items-center">
            <span className="text-orange-600 text-sm font-medium">âš ï¸ API Unavailable</span>
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
