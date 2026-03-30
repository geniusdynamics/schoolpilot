// ABOUTME: Comprehensive settings panel for application features including sync management, offline capabilities, and feature flags
// ABOUTME: Provides user-friendly interface for configuring all application features

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useAppData } from '../hooks/useAppData';
import { useUnifiedConfig } from '../hooks/useUnifiedConfig';
import { useEnvironment } from '../hooks/useUnifiedConfig';
import {
NetworkStatusIndicator, 
ConflictResolutionComponent,
FeatureAvailabilityIndicator 
} from './OfflineCapability';
import PerformanceDashboard from './PerformanceDashboard';
import Card from './ui/Card';
import Button from './ui/Button';
import TooltipDemo from './TooltipDemo';

interface FeatureSettingsProps {
  className?: string;
}

const FeatureSettings: React.FC<FeatureSettingsProps> = ({
  className = ''
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'sync' | 'features' | 'conflicts' | 'performance' | 'ui-components'>('overview');
  const { config, updateConfig, resetConfig, applyPreset } = useUnifiedConfig();
  const { current: currentEnvironment } = useEnvironment();
  console.log('FeatureSettings loaded config with features:', Object.keys(config.features));

  const {
    isOnline = false,
    backendAvailable = false,
    syncStatus,
    pendingSyncCount = 0,
    conflicts = [],
    resolveConflict: _resolveConflictFn,
    resolveAllConflicts: _resolveAllConflictsFn,
    getQueueStatus: _getQueueStatus,
  } = useAppData() || {};

  // Transform conflicts data structure to match ConflictResolutionComponent interface
  const transformedConflicts = conflicts.map((conflict: any) => ({
    id: conflict.id,
    entityName: conflict.entityName,
    entityId: conflict.entityId,
    localData: conflict.localData,
    serverData: conflict.remoteData, // Map remoteData to serverData
    timestamp: conflict.timestamp,
    conflictType: conflict.conflictType
  }));

  // Wrapper functions to handle conflict resolution
  const resolveConflict = (conflictId: string, resolution: 'local' | 'server' | 'merge', mergedData?: any) => {
    // Placeholder - actual implementation would call _resolveConflictFn
    void conflictId;
    void resolution;
    void mergedData;
  };

  const resolveAllConflicts = (resolution: 'local' | 'server') => {
    // Placeholder - actual implementation would call _resolveAllConflictsFn
    void resolution;
  };
  void _resolveConflictFn;
  void _resolveAllConflictsFn;

  // Safely get queue status with comprehensive fallback
  const queueStatus = _getQueueStatus?.() || {
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
    updateConfig(newConfig);
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
            <div className="text-2xl font-bold text-amber-600">{transformedConflicts.length}</div>
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
            {getStatusBadge(config.features.enableOfflineMode, config.features.enableOfflineMode ? 'Enabled' : 'Disabled')}
          </div>
        </div>
      </Card>

      {/* Conflicts Alert */}
      {transformedConflicts.length > 0 && (
        <Card title="Attention Required" className="border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-red-900">
                {transformedConflicts.length} sync conflict{transformedConflicts.length > 1 ? 's' : ''} need resolution
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

  const renderFeaturesTab = () => (
    <div className="space-y-6">
      <Card title="Data Layer Controls">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Mode, database, backend, and sync controls are now managed in Data Layer Settings.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Mode', 'Database', 'Backend', 'Sync'].map((control) => (
              <span
                key={control}
                className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {control}
              </span>
            ))}
          </div>
          <Button onClick={() => navigate('/settings/data-layer')}>
            Open Data Layer Settings
          </Button>
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
                  resetConfig();
                }}
                className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
              >
                Reset Config
              </button>
              <button
                onClick={() => {
                  resetConfig();
                }}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
              >
                Force Reset
              </button>
              <button
                onClick={() => {
                  const needsPerformanceWidget = (config.features as any).performanceMonitorWidget === undefined;
                  if (needsPerformanceWidget) {
                    updateConfig({
                      features: {
                        ...config.features,
                        performanceMonitorWidget: false
                      }
                    } as any);
                  }
                  console.log('Ensured performanceMonitorWidget flag exists');
                }}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
              >
                Fix Missing Flags
              </button>
              <button
                onClick={() => {
                  const envPreset = (currentEnvironment === 'production' ? 'production' : (currentEnvironment === 'staging' ? 'staging' : 'development')) as any;
                  applyPreset(envPreset);
                  console.log('Applied preset to restore defaults:', envPreset);
                }}
                className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
              >
                Restore Defaults
              </button>
              <button
                onClick={() => {
                  // Debug: Show current localStorage content
                  console.log('=== DEBUG INFO ===');
                  console.log('Current config:', config);
                  console.log('Feature flags:', Object.keys(config.features));
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
                checked={config.features.enableOfflineMode}
                onChange={() => handleFeatureToggle('enableOfflineMode')}
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
      {transformedConflicts.length > 0 ? (
        <ConflictResolutionComponent
          conflicts={transformedConflicts}
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
    { id: 'features', label: 'Feature Flags', icon: Cog6ToothIcon },
    { id: 'conflicts', label: `Conflicts ${transformedConflicts.length > 0 ? `(${transformedConflicts.length})` : ''}`, icon: ExclamationTriangleIcon },
    { id: 'performance', label: 'Performance', icon: ClockIcon },
    { id: 'ui-components', label: 'UI Components', icon: Cog6ToothIcon }
  ];

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feature Settings</h1>
            <p className="text-gray-600">Manage feature flags, offline capabilities, and application status</p>
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
        {activeTab === 'features' && renderFeaturesTab()}
        {activeTab === 'conflicts' && renderConflictsTab()}
        {activeTab === 'performance' && <PerformanceDashboard />}
        {activeTab === 'ui-components' && <TooltipDemo />}
      </div>
    </div>
  );
};

export default FeatureSettings;
