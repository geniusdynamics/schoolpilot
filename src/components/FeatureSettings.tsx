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
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';

interface FeatureSettingsProps {
  className?: string;
}

const FeatureSettings: React.FC<FeatureSettingsProps> = ({
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sync' | 'features' | 'conflicts'>('overview');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [config, setConfig] = useState(getAppConfig());
  
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
  } = useAppData();

  const queueStatus = getQueueStatus();

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
              syncStatus.state === 'syncing' ? 'text-blue-500 animate-spin' :
              syncStatus.state === 'error' ? 'text-red-500' : 'text-green-500'
            }`} />
            <div className="text-sm font-medium">Sync</div>
            <div className="text-xs text-gray-600 capitalize">{syncStatus.state}</div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card title="Quick Statistics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{pendingSyncCount}</div>
            <div className="text-sm text-gray-600">Pending Sync</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{conflicts.length}</div>
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
      advancedErrorBoundaries: 'Enhanced error handling and recovery'
    };
    return descriptions[key] || 'Enhanced application feature';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: CogIcon },
    { id: 'sync', label: 'Sync Management', icon: ArrowPathIcon },
    { id: 'features', label: 'Feature Flags', icon: Cog6ToothIcon },
    { id: 'conflicts', label: `Conflicts ${conflicts.length > 0 ? `(${conflicts.length})` : ''}`, icon: ExclamationTriangleIcon }
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
      </div>
    </div>
  );
};

export default FeatureSettings;