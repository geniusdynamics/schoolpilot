/**
 * Enhanced FeatureSettings using the new AdaptiveTabs system
 * Demonstrates migration from custom tab implementation to unified system
 */

import React, { useState } from 'react';
import {
  CogIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ServerIcon,
  CheckCircleIcon,
  WifiIcon,
  XCircleIcon,
  RefreshCw
} from '@heroicons/react/24/outline';

// Import the new unified components
import AdaptiveTabs, { TabConfig, ActionConfig } from './ui/AdaptiveTabs';
import { useSimpleActions, usePageActions } from '../hooks/useSimpleActions';
import { useUnifiedConfig } from '../hooks/useUnifiedConfig';
import { useAppData } from '../contexts/AppDataContext';

// Import existing sub-components (reusable)
import SyncManagementPanel from './SyncManagementPanel';
import PerformanceDashboard from './PerformanceDashboard';
import { MemoryDashboard } from './MemoryDashboard';
import TooltipDemo from './__demos__/TooltipDemo';
import NetworkStatusIndicator from './NetworkStatusIndicator';
import ConflictResolutionComponent from './ConflictResolutionInterface';
import Card from './ui/Card';
import Button from './ui/Button';
import { UnifiedModeSwitch } from './UnifiedModeSwitch';

interface FeatureSettingsNewProps {
  className?: string;
}

const FeatureSettingsNew: React.FC<FeatureSettingsNewProps> = ({
  className = ''
}) => {
  const { config, updateConfig } = useUnifiedConfig();
  const { 
    isOnline, 
    backendAvailable, 
    syncStatus, 
    pendingSyncCount,
    conflicts = [],
    resolveConflict: resolveConflictFn,
    resolveAllConflicts: resolveAllConflictsFn,
    getQueueStatus,
    forceSync,
    clearSyncQueue
  } = useAppData() || {};

  const [refreshing, setRefreshing] = useState(false);

  // Transform conflicts for the component
  const transformedConflicts = conflicts.map((conflict: any) => ({
    id: conflict.id,
    entityName: conflict.entityName,
    entityId: conflict.entityId,
    localData: conflict.localData,
    serverData: conflict.remoteData,
    timestamp: conflict.timestamp,
    conflictType: conflict.conflictType
  }));

  // Page-level actions that appear in the action bar
  const pageActions: ActionConfig[] = [
    {
      id: 'refresh-all',
      label: 'Refresh All',
      icon: RefreshCw,
      variant: 'secondary',
      loading: refreshing,
      onClick: async () => {
        setRefreshing(true);
        try {
          await forceSync?.();
          // Simulate refresh delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setRefreshing(false);
        }
      },
      tooltip: 'Refresh all data and sync status'
    },
    {
      id: 'clear-cache',
      label: 'Clear Cache',
      icon: 'Trash2',
      variant: 'secondary',
      onClick: async () => {
        if (confirm('Are you sure you want to clear all cached data?')) {
          clearSyncQueue?.();
        }
      },
      tooltip: 'Clear all cached sync operations'
    },
    {
      id: 'export-config',
      label: 'Export Config',
      icon: 'Download',
      variant: 'ghost',
      onClick: () => {
        const configBlob = new Blob([JSON.stringify(config, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(configBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schoolpilot-config.json';
        a.click();
        URL.revokeObjectURL(url);
      },
      tooltip: 'Export current configuration'
    }
  ];

  // Register page actions using the new hook
  usePageActions(pageActions, 'feature-settings');

  // Helper functions (reused from original)
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

  const getFeatureDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      enhancedDataLayer: 'Advanced data management with RxDB integration',
      networkStatusIndicator: 'Real-time network connectivity display',
      moduleHealthIndicator: 'Module loading status and health monitoring',
      syncStatusComponent: 'Detailed sync progress and queue management',
      globalNotifications: 'System-wide notification management',
      performanceOptimizations: 'Bundle and runtime performance improvements',
      advancedErrorBoundaries: 'Enhanced error handling and recovery',
      performanceMonitorWidget: 'Show floating performance monitor widget'
    };
    return descriptions[key] || 'Enhanced application feature';
  };

  // Define tabs using the new unified system
  const tabs: TabConfig[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: CogIcon,
      content: (
        <div className="p-6 space-y-6">
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
                <div className="text-2xl font-bold text-green-600">{getQueueStatus?.()?.api?.completed || 0}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{getQueueStatus?.()?.sync?.errors || 0}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </div>
          </Card>

          {/* Feature Status */}
          <Card title="Enhanced Features Status">
            <div className="space-y-3">
              {Object.entries(config.features).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  {getStatusBadge(enabled, enabled ? 'Enabled' : 'Disabled')}
                </div>
              ))}
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
                  onClick={() => {
                    // This would switch to conflicts tab in the new system
                    const tabsComponent = document.querySelector('[role="tablist"]');
                    const conflictsTab = document.querySelector('[data-tab-id="conflicts"]') as HTMLElement;
                    conflictsTab?.click();
                  }}
                >
                  Resolve Conflicts
                </Button>
              </div>
            </Card>
          )}
        </div>
      )
    },
    {
      id: 'sync',
      title: 'Sync Management',
      icon: ArrowPathIcon,
      content: (
        <div className="p-6">
          <SyncManagementPanel className="!shadow-none !bg-transparent border border-gray-200" />
        </div>
      )
    },
    {
      id: 'features',
      title: 'Feature Flags',
      icon: Cog6ToothIcon,
      content: (
        <div className="p-6 space-y-6">
          {/* Application Mode */}
          <Card title="Application Mode">
            <UnifiedModeSwitch 
              variant="radio" 
              showDescription={true}
              onModeChange={(mode) => updateConfig({ ...config, dataMode: mode })}
            />
          </Card>

          {/* Feature Flags */}
          <Card title="Feature Flags">
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                Loaded {Object.keys(config.features).length} feature flags
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
        </div>
      )
    },
    {
      id: 'conflicts',
      title: `Conflicts ${transformedConflicts.length > 0 ? `(${transformedConflicts.length})` : ''}`,
      icon: ExclamationTriangleIcon,
      badge: transformedConflicts.length > 0 ? transformedConflicts.length : undefined,
      content: (
        <div className="p-6">
          {transformedConflicts.length > 0 ? (
            <ConflictResolutionComponent
              conflicts={transformedConflicts}
              onResolve={(conflictId, resolution, mergedData) => {
                if (resolveConflictFn) {
                  const strategy = resolution === 'local' ? 'local_wins' : 
                                  resolution === 'server' ? 'remote_wins' : 'merge';
                  resolveConflictFn(conflictId, { strategy, mergedData });
                }
              }}
              onResolveAll={(resolution) => {
                if (resolveAllConflictsFn) {
                  const strategy = resolution === 'local' ? 'local_wins' : 'remote_wins';
                  resolveAllConflictsFn(strategy);
                }
              }}
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
      )
    },
    {
      id: 'performance',
      title: 'Performance',
      icon: ClockIcon,
      content: <PerformanceDashboard />
    },
    {
      id: 'memory',
      title: 'Memory',
      icon: ServerIcon,
      content: <MemoryDashboard />
    },
    {
      id: 'ui-components',
      title: 'UI Components',
      icon: Cog6ToothIcon,
      content: <TooltipDemo />
    }
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

      {/* Unified Tabs System */}
      <AdaptiveTabs
        tabs={tabs}
        variant="page"
        closeable={false}
        scrollable={true}
        showActionBar={true}
        actions={pageActions}
        maxVisibleActions={3}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
        contentClassName="min-h-[500px]"
      />
    </div>
  );
};

export default FeatureSettingsNew;