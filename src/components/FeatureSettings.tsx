// ABOUTME: Comprehensive settings panel for application features including sync management, offline capabilities, and feature flags
// ABOUTME: Provides user-friendly interface for configuring all application features

import React, { useState } from 'react';
import { 
  CogIcon, 
  WifiIcon, 
  ServerIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useAppData } from '../contexts/AppDataContext';
import { getAppConfig, updateAppConfig, isFeatureEnabled } from '../config/appConfig';
import { 
  SyncStatusComponent, 
  NetworkStatusIndicator, 
  ConflictResolutionComponent,
  FeatureAvailabilityIndicator 
} from './OfflineCapability';
import SyncManagementPanel from './SyncManagementPanel';
import PerformanceDashboard from './PerformanceDashboard';
import MemoryDashboard from './MemoryDashboard';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import TooltipDemo from './TooltipDemo';

interface FeatureSettingsProps {
  className?: string;
}

const FeatureSettings: React.FC<FeatureSettingsProps> = ({
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sync' | 'features' | 'conflicts' | 'performance' | 'memory' | 'ui-components'>('overview');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [config, setConfig] = useState(() => {
    // Force refresh configuration to ensure new feature flags are loaded
    const currentConfig = getAppConfig();
    console.log('FeatureSettings loaded config with features:', Object.keys(currentConfig.features));
    return currentConfig;
  });
  
  const { 
    isOnline, 
    backendAvailable, 
    syncStatus, 
    pendingSyncCount,
    conflicts = [],
    resolveConflict,
    resolveAllConflicts,
    getQueueStatus,
    forceSync,
    clearSyncQueue
  } = useAppData() || {};

  // Safely get queue status with comprehensive fallback
  const queueStatus = (getQueueStatus && typeof getQueueStatus === 'function') 
    ? getQueueStatus() 
    : {
        api: { pending: 0, processing: false, byPriority: {}, completed: 0 },
        sync: { pending: 0, processing: false, byPriority: {}, errors: 0 }
      };

  const handleFeatureToggle = (feature: keyof typeof config.features) => {
    const newConfig = {
      ...config,
      features: {
        ...config.features,
        [feature]: !config.features[feature]
      }
    };
    setConfig(newConfig);
    updateAppConfig(newConfig);
  };

  const handleModeChange = (mode: 'demo' | 'production') => {
    const newConfig = { ...config, mode };
    setConfig(newConfig);
    updateAppConfig(newConfig);
  };

  const getStatusBadge = (status: boolean, label: string) => (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      status 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      {status ? <CheckCircleIcon className="w-3 h-3 mr-1" /> : <XCircleIcon className="w-3 h-3 mr-1" />}
      {label}
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* System Status */}
      <Card title="System Status">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <WifiIcon className={`w-8 h-8 mx-auto mb-2 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
            <div className="text-sm font-medium">Network</div>
            <div className="text-xs text-gray-600">{isOnline ? 'Connected' : 'Offline'}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <ServerIcon className={`w-8 h-8 mx-auto mb-2 ${backendAvailable ? 'text-green-500' : 'text-amber-500'}`} />
            <div className="text-sm font-medium">Backend</div>
            <div className="text-xs text-gray-600">{backendAvailable ? 'Available' : 'Unavailable'}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <ArrowPathIcon className={`w-8 h-8 mx-auto mb-2 ${
              syncStatus?.state === 'syncing' ? 'text-blue-500 animate-spin' :
              syncStatus?.state === 'error' ? 'text-red-500' : 'text-green-500'
            }`} />
            <div className="text-sm font-medium">Sync</div>
            <div className="text-xs text-gray-600 capitalize">{syncStatus?.state || 'unknown'}</div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card title="Quick Statistics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{pendingSyncCount || 0}</div>
            <div className="text-sm text-gray-600">Pending Sync</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{Array.isArray(conflicts) ? conflicts.length : 0}</div>
            <div className="text-sm text-gray-600">Conflicts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{queueStatus?.api?.completed || 0}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{queueStatus?.sync?.errors || 0}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
        </div>
      </Card>

      {/* Feature Status */}
      <Card title="Enhanced Features Status">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Enhanced Data Layer</span>
            {getStatusBadge(config.features.enhancedDataLayer, config.features.enhancedDataLayer ? 'Enabled' : 'Disabled')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Network Status Indicator</span>
            {getStatusBadge(config.features.networkStatusIndicator, config.features.networkStatusIndicator ? 'Enabled' : 'Disabled')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Module Health Indicator</span>
            {getStatusBadge(config.features.moduleHealthIndicator, config.features.moduleHealthIndicator ? 'Enabled' : 'Disabled')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sync Status Component</span>
            {getStatusBadge(config.features.syncStatusComponent, config.features.syncStatusComponent ? 'Enabled' : 'Disabled')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Offline Capabilities</span>
            {getStatusBadge(config.enableOfflineCapabilities, config.enableOfflineCapabilities ? 'Enabled' : 'Disabled')}
          </div>
        </div>
      </Card>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card title="Attention Required" className="border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-red-900">
                {conflicts.length} sync conflict{conflicts.length > 1 ? 's' : ''} need resolution
              </span>
            </div>
            <Button 
              size="sm" 
              variant="danger"
              onClick={() => setActiveTab('conflicts')}
            >
              Resolve Conflicts
            </Button>
          </div>
        </Card>
      )}
    </div>
  );

  const renderSyncTab = () => (
    <div className="space-y-6">
      <SyncManagementPanel className="!shadow-none !bg-transparent border border-gray-200" />
    </div>
  );

  const renderFeaturesTab = () => (
    <div className="space-y-6">
      {/* Application Mode */}
      <Card title="Application Mode">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="mode"
                value="demo"
                checked={config.mode === 'demo'}
                onChange={() => handleModeChange('demo')}
                className="mr-2"
              />
              Demo Mode
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="mode"
                value="production"
                checked={config.mode === 'production'}
                onChange={() => handleModeChange('production')}
                className="mr-2"
              />
              Production Mode
            </label>
          </div>
          <p className="text-sm text-gray-600">
            Demo mode uses mock data, while production mode uses RxDB with real data persistence.
          </p>
        </div>
      </Card>

      {/* Feature Flags */}
      <Card title="Feature Flags">
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Loaded {Object.keys(config.features).length} feature flags
              <div className="text-xs text-gray-500 mt-1">
                {Object.keys(config.features).join(', ')}
              </div>
              {!config.features.performanceMonitorWidget && (
                <div className="text-xs text-red-500 mt-1">
                  ⚠️ performanceMonitorWidget is missing - click "Fix Missing Flags"
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // Clear localStorage and reload config
                  localStorage.removeItem('app-config');
                  localStorage.removeItem('app-config-version');
                  window.location.reload();
                }}
                className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
              >
                Reset Config
              </button>
              <button
                onClick={() => {
                  // Force complete reset - clear ALL localStorage
                  localStorage.clear();
                  // Force reload from scratch
                  window.location.href = window.location.origin + window.location.pathname;
                }}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
              >
                Force Reset
              </button>
              <button
                onClick={() => {
                  // Force add missing feature flag
                  const currentConfig = getAppConfig();
                  const updatedConfig = {
                    ...currentConfig,
                    features: {
                      ...currentConfig.features,
                      performanceMonitorWidget: false // Add the missing flag
                    }
                  };
                  
                  // Update both global config and local state
                  updateAppConfig(updatedConfig);
                  setConfig(updatedConfig);
                  
                  // Also force localStorage update
                  localStorage.setItem('app-config', JSON.stringify(updatedConfig));
                  localStorage.setItem('app-config-version', '1.2.0');
                  
                  console.log('Added missing performanceMonitorWidget flag');
                  window.location.reload();
                }}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
              >
                Fix Missing Flags
              </button>
              <button
                onClick={() => {
                  // Force restore all default feature flags
                  const defaultFeatures = {
                    enhancedDataLayer: false,
                    networkStatusIndicator: false,
                    moduleHealthIndicator: false,
                    syncStatusComponent: false,
                    globalNotifications: false,
                    performanceOptimizations: true,
                    advancedErrorBoundaries: true,
                    performanceMonitorWidget: false, // This is the missing one
                  };
                  
                  const currentConfig = getAppConfig();
                  const updatedConfig = {
                    ...currentConfig,
                    features: {
                      ...currentConfig.features,
                      ...defaultFeatures // Merge with defaults to ensure all flags exist
                    }
                  };
                  
                  // Update everything
                  updateAppConfig(updatedConfig);
                  setConfig(updatedConfig);
                  localStorage.setItem('app-config', JSON.stringify(updatedConfig));
                  localStorage.setItem('app-config-version', '1.2.0');
                  
                  console.log('Restored all default feature flags:', updatedConfig.features);
                  window.location.reload();
                }}
                className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
              >
                Restore Defaults
              </button>
              <button
                onClick={() => {
                  // Debug: Show current localStorage content
                  const stored = localStorage.getItem('app-config');
                  const version = localStorage.getItem('app-config-version');
                  console.log('=== DEBUG INFO ===');
                  console.log('Config version:', version);
                  console.log('Stored config:', stored ? JSON.parse(stored) : 'None');
                  console.log('Current config:', getAppConfig());
                  console.log('Feature flags:', Object.keys(getAppConfig().features));
                  alert('Check console for debug info');
                }}
                className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded transition-colors"
              >
                Debug
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {Object.entries(config.features).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div className="text-sm text-gray-600">
                  {getFeatureDescription(key)}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => handleFeatureToggle(key as keyof typeof config.features)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </Card>

      {/* Enhanced Capabilities */}
      <Card title="Enhanced Capabilities">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Offline Capabilities</div>
              <div className="text-sm text-gray-600">Enable offline-first data operations</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableOfflineCapabilities}
                onChange={(e) => setConfig(prev => ({ ...prev, enableOfflineCapabilities: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Backend Integration</div>
              <div className="text-sm text-gray-600">Enable backend API integration</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableBackendIntegration}
                onChange={(e) => setConfig(prev => ({ ...prev, enableBackendIntegration: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Feature Availability */}
      <FeatureAvailabilityIndicator 
        features={['student-management', 'data-sync', 'offline-storage', 'conflict-resolution']}
        className="!shadow-none !bg-transparent border border-gray-200"
      />
    </div>
  );

  const renderConflictsTab = () => (
    <div className="space-y-6">
      {conflicts.length > 0 ? (
        <ConflictResolutionComponent
          conflicts={conflicts}
          onResolve={resolveConflict}
          onResolveAll={resolveAllConflicts}
          className="!shadow-none !bg-transparent border border-gray-200"
        />
      ) : (
        <Card title="No Conflicts">
          <div className="text-center py-8">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-600">
              There are no sync conflicts that need resolution.
            </p>
          </div>
        </Card>
      )}
    </div>
  );

  const getFeatureDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      enhancedDataLayer: 'Advanced data management with RxDB integration',
      networkStatusIndicator: 'Real-time network connectivity display',
      moduleHealthIndicator: 'Module loading status and health monitoring',
      syncStatusComponent: 'Detailed sync progress and queue management',
      globalNotifications: 'System-wide notification management',
      performanceOptimizations: 'Bundle and runtime performance improvements',
      advancedErrorBoundaries: 'Enhanced error handling and recovery',
      performanceMonitorWidget: 'Show floating performance monitor widget (bottom-right corner)'
    };
    return descriptions[key] || 'Enhanced application feature';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: CogIcon },
    { id: 'sync', label: 'Sync Management', icon: ArrowPathIcon },
    { id: 'features', label: 'Feature Flags', icon: Cog6ToothIcon },
    { id: 'conflicts', label: `Conflicts ${conflicts.length > 0 ? `(${conflicts.length})` : ''}`, icon: ExclamationTriangleIcon },
    { id: 'performance', label: 'Performance', icon: ClockIcon },
    { id: 'memory', label: 'Memory', icon: ServerIcon },
    { id: 'ui-components', label: 'UI Components', icon: Cog6ToothIcon }
  ];

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feature Settings</h1>
            <p className="text-gray-600">Manage offline capabilities, sync settings, and application features</p>
          </div>
          <NetworkStatusIndicator showDetails={true} className="bg-white p-3 rounded-lg shadow" />
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
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'sync' && renderSyncTab()}
        {activeTab === 'features' && renderFeaturesTab()}
        {activeTab === 'conflicts' && renderConflictsTab()}
        {activeTab === 'performance' && <PerformanceDashboard />}
        {activeTab === 'memory' && <MemoryDashboard />}
        {activeTab === 'ui-components' && <TooltipDemo />}
      </div>
    </div>
  );
};

export default FeatureSettings;