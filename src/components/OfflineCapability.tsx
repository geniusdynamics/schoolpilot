// UI components for offline capability management and network status
import React from 'react';
import { 
  ExclamationTriangleIcon, 
  WifiIcon, 
  ServerIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  SignalIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline';
import { useAppData } from '../hooks/useAppData';

// Component to wrap features that may not be available offline
interface OfflineCapableComponentProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showOfflineIndicator?: boolean;
  className?: string;
}

export const OfflineCapableComponent: React.FC<OfflineCapableComponentProps> = ({
  feature,
  children,
  fallback,
  showOfflineIndicator = true,
  className = ''
}) => {
  const { isOnline, backendAvailable, offlineCapabilities } = useAppData() || {};
  
  const capability = Array.isArray(offlineCapabilities)
    ? offlineCapabilities.find(cap => cap?.feature === feature)
    : null;
  const isAvailable = capability?.available ?? true;
  
  if (!isAvailable) {
    return (
      <div className={`feature-unavailable ${className}`}>
        {fallback || (
          <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Feature Unavailable</h3>
              <p className="text-gray-600 mb-4">
                {capability?.reason || 'This feature requires an internet connection'}
              </p>
              {capability?.alternativeAction && (
                <p className="text-sm text-blue-600">
                  {capability.alternativeAction}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`relative ${className}`}>
      {children}
      {showOfflineIndicator && !isOnline && (
        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-xs">
          <SignalSlashIcon className="w-3 h-3" />
          <span>Offline</span>
        </div>
      )}
      {showOfflineIndicator && isOnline && !backendAvailable && (
        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
          <ServerIcon className="w-3 h-3" />
          <span>Local</span>
        </div>
      )}
    </div>
  );
};

// Network status indicator component
interface NetworkStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const { 
    isOnline, 
    backendAvailable, 
    connectionQuality, 
    dataSource,
    syncStatus,
    pendingSyncCount 
  } = useAppData();

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (!backendAvailable) return 'text-amber-500';
    if (connectionQuality === 'excellent') return 'text-green-500';
    if (connectionQuality === 'good') return 'text-blue-500';
    return 'text-amber-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <SignalSlashIcon className="w-4 h-4" />;
    if (!backendAvailable) return <ServerIcon className="w-4 h-4" />;
    return <SignalIcon className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!backendAvailable) return 'Local Only';
    return `Online (${connectionQuality})`;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
      
      {showDetails && (
        <>
          <div className="text-xs text-gray-500">
            Source: {dataSource}
          </div>
          
          {pendingSyncCount > 0 && (
            <div className="flex items-center space-x-1 text-xs text-amber-600">
              <ClockIcon className="w-3 h-3" />
              <span>{pendingSyncCount} pending</span>
            </div>
          )}
          
          {syncStatus?.state === 'syncing' && (
            <div className="flex items-center space-x-1 text-xs text-blue-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span>Syncing...</span>
            </div>
          )}
          
          {syncStatus?.state === 'error' && (
            <div className="flex items-center space-x-1 text-xs text-red-600">
              <XCircleIcon className="w-3 h-3" />
              <span>Sync Error</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Enhanced sync status component with queue management
interface SyncStatusComponentProps {
  className?: string;
  showQueueDetails?: boolean;
  showSettings?: boolean;
}

export const SyncStatusComponent: React.FC<SyncStatusComponentProps> = ({
  className = '',
  showQueueDetails = false,
  showSettings = false
}) => {
  const { 
    syncStatus,
    pendingSyncCount, 
    forceSync, 
    getQueueStatus,
    isOnline,
    backendAvailable,
    clearSyncQueue,
    pauseSync,
    resumeSync,
    getSyncSettings,
    updateSyncSettings
  } = useAppData() || {};

  // Safely get queue status with comprehensive fallback
  const queueStatus = (getQueueStatus && typeof getQueueStatus === 'function') 
    ? getQueueStatus() 
    : {
        api: { pending: 0, processing: false, byPriority: {}, completed: 0 },
        sync: { pending: 0, processing: false, byPriority: {}, errors: 0, items: [] }
      };
  const canSync = isOnline && backendAvailable;
  const syncSettings = getSyncSettings?.() || { autoSync: true, syncInterval: 30000, batchSize: 10 };

  const getSyncStatusIcon = () => {
    if (!syncStatus) return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    
    switch (syncStatus.state) {
      case 'syncing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
      case 'error':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <ClockIcon className="w-4 h-4 text-amber-500" />;
      default:
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    }
  };

  const getSyncStatusText = () => {
    if (!syncStatus) return 'Ready to sync';
    
    switch (syncStatus.state) {
      case 'syncing':
        return `Syncing... (${Math.round(syncStatus.progress || 0)}%)`;
      case 'error':
        return `Sync Error: ${syncStatus.lastError?.message || 'Unknown error'}`;
      case 'paused':
        return 'Sync Paused';
      default:
        return syncStatus.lastSyncTime 
          ? `Last sync: ${syncStatus.lastSyncTime.toLocaleTimeString()}`
          : 'Ready to sync';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Sync Status</h3>
        <div className="flex items-center space-x-2">
          {getSyncStatusIcon()}
          <span className="text-sm text-gray-600">{getSyncStatusText()}</span>
        </div>
      </div>
      
      {pendingSyncCount > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Pending Items</span>
            <span>{pendingSyncCount}</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>API Queue:</span>
              <span>{queueStatus.api.pending}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Sync Queue:</span>
              <span>{queueStatus.sync.pending}</span>
            </div>
            {queueStatus.sync.errors > 0 && (
              <div className="flex justify-between text-xs text-red-600">
                <span>Errors:</span>
                <span>{queueStatus.sync.errors}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Queue Details Section */}
      {showQueueDetails && pendingSyncCount > 0 && (
        <div className="mb-4 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Sync Queue Details</h4>
          <div className="space-y-2">
            {queueStatus.sync.items?.slice(0, 5).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                    item.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  <span className="font-medium">{item.operation?.entity || 'Unknown'}</span>
                  <span className="text-gray-500">{item.operation?.type || 'unknown'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    item.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.priority}
                  </span>
                  {item.retryCount > 0 && (
                    <span className="text-amber-600">Retry {item.retryCount}</span>
                  )}
                </div>
              </div>
            ))}
            {queueStatus.sync.pending > 5 && (
              <div className="text-xs text-gray-500 text-center">
                ... and {queueStatus.sync.pending - 5} more items
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Settings Section */}
      {showSettings && (
        <div className="mb-4 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Sync Settings</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Auto Sync</label>
              <input
                type="checkbox"
                checked={syncSettings.autoSync}
                onChange={(e) => updateSyncSettings?.({ autoSync: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Sync Interval (seconds)</label>
              <select
                value={syncSettings.syncInterval / 1000}
                onChange={(e) => updateSyncSettings?.({ syncInterval: parseInt(e.target.value) * 1000 })}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Batch Size</label>
              <select
                value={syncSettings.batchSize}
                onChange={(e) => updateSyncSettings?.({ batchSize: parseInt(e.target.value) })}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={forceSync}
          disabled={!canSync || syncStatus?.state === 'syncing'}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {syncStatus?.state === 'syncing' ? 'Syncing...' : 'Force Sync'}
        </button>
        
        {syncStatus?.state === 'syncing' && pauseSync && (
          <button
            onClick={pauseSync}
            className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700"
          >
            Pause
          </button>
        )}
        
        {syncStatus?.state === 'paused' && resumeSync && (
          <button
            onClick={resumeSync}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
          >
            Resume
          </button>
        )}
        
        {pendingSyncCount > 0 && clearSyncQueue && (
          <button
            onClick={() => {
              if (window.confirm('Clear all pending sync items? This cannot be undone.')) {
                clearSyncQueue();
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
          >
            Clear Queue
          </button>
        )}
        
        {!canSync && (
          <div className="flex-1 text-center text-xs text-gray-500 py-2">
            {!isOnline ? 'No internet connection' : 'Backend unavailable'}
          </div>
        )}
      </div>
    </div>
  );
};

// Feature availability indicator
interface FeatureAvailabilityProps {
  features: string[];
  className?: string;
}

export const FeatureAvailabilityIndicator: React.FC<FeatureAvailabilityProps> = ({
  features,
  className = ''
}) => {
  const { offlineCapabilities } = useAppData() || {};
  
  const featureStatus = features.map(feature => {
    const capability = Array.isArray(offlineCapabilities) 
      ? offlineCapabilities.find(cap => cap?.feature === feature)
      : null;
    return {
      feature,
      available: capability?.available ?? true,
      reason: capability?.reason,
      alternativeAction: capability?.alternativeAction
    };
  });
  
  const availableCount = featureStatus.filter(f => f.available).length;
  const totalCount = featureStatus.length;
  
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Feature Availability</h3>
        <div className="text-sm text-gray-600">
          {availableCount}/{totalCount} available
        </div>
      </div>
      
      <div className="space-y-2">
        {featureStatus.map(({ feature, available, reason, alternativeAction }) => (
          <div key={feature} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {available ? (
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
              ) : (
                <XCircleIcon className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-medium capitalize">
                {feature.replace('-', ' ')}
              </span>
            </div>
            
            {!available && (
              <div className="text-xs text-gray-500 max-w-xs text-right">
                {reason || alternativeAction}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Usage examples and HOCs
export const withOfflineCapability = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: string,
  fallback?: React.ReactNode
) => {
  return (props: P) => (
    <OfflineCapableComponent feature={feature} fallback={fallback}>
      <WrappedComponent {...props} />
    </OfflineCapableComponent>
  );
};

// Conflict resolution component
interface ConflictResolutionProps {
  conflicts: Array<{
    id: string;
    entityName: string;
    entityId: string;
    localData: any;
    serverData: any;
    timestamp: Date;
    conflictType: 'update' | 'delete' | 'create';
  }>;
  onResolve: (conflictId: string, resolution: 'local' | 'server' | 'merge', mergedData?: any) => void;
  onResolveAll: (resolution: 'local' | 'server') => void;
  className?: string;
}

export const ConflictResolutionComponent: React.FC<ConflictResolutionProps> = ({
  conflicts,
  onResolve,
  onResolveAll,
  className = ''
}) => {
  const [selectedConflict, setSelectedConflict] = React.useState<string | null>(null);
  const [mergeData, setMergeData] = React.useState<any>({});

  const conflict = conflicts.find(c => c.id === selectedConflict);

  const handleMergeChange = (field: string, value: any, source: 'local' | 'server') => {
    setMergeData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderDataComparison = (conflict: any) => {
    const localKeys = Object.keys(conflict.localData || {});
    const serverKeys = Object.keys(conflict.serverData || {});
    const allKeys = [...new Set([...localKeys, ...serverKeys])];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
          <div>Field</div>
          <div>Local Version</div>
          <div>Server Version</div>
        </div>
        {allKeys.map(key => {
          const localValue = conflict.localData?.[key];
          const serverValue = conflict.serverData?.[key];
          const isDifferent = JSON.stringify(localValue) !== JSON.stringify(serverValue);

          return (
            <div key={key} className={`grid grid-cols-3 gap-4 text-sm py-2 ${isDifferent ? 'bg-red-50' : 'bg-gray-50'}`}>
              <div className="font-medium">{key}</div>
              <div className="break-words">
                {typeof localValue === 'object' ? JSON.stringify(localValue, null, 2) : String(localValue || 'N/A')}
              </div>
              <div className="break-words">
                {typeof serverValue === 'object' ? JSON.stringify(serverValue, null, 2) : String(serverValue || 'N/A')}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-red-200 ${className}`}>
      <div className="bg-red-50 px-4 py-3 border-b border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-medium text-red-900">
              Sync Conflicts ({conflicts.length})
            </h3>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onResolveAll('local')}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Keep All Local
            </button>
            <button
              onClick={() => onResolveAll('server')}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Keep All Server
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {!selectedConflict ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              The following items have conflicts between your local changes and server data. 
              Choose how to resolve each conflict:
            </p>
            {conflicts.map(conflict => (
              <div key={conflict.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {conflict.entityName} #{conflict.entityId}
                    </div>
                    <div className="text-sm text-gray-500">
                      {conflict.conflictType} conflict • {conflict.timestamp.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedConflict(conflict.id)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => onResolve(conflict.id, 'local')}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Keep Local
                    </button>
                    <button
                      onClick={() => onResolve(conflict.id, 'server')}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Keep Server
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">
                Resolve Conflict: {conflict?.entityName} #{conflict?.entityId}
              </h4>
              <button
                onClick={() => setSelectedConflict(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>

            {conflict && (
              <>
                <div className="mb-6">
                  {renderDataComparison(conflict)}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      onResolve(conflict.id, 'local');
                      setSelectedConflict(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Keep Local Version
                  </button>
                  <button
                    onClick={() => {
                      onResolve(conflict.id, 'server');
                      setSelectedConflict(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Keep Server Version
                  </button>
                  <button
                    onClick={() => {
                      // For now, merge is simplified - in a real implementation,
                      // you'd want a more sophisticated merge UI
                      const merged = { ...conflict.localData, ...conflict.serverData, ...mergeData };
                      onResolve(conflict.id, 'merge', merged);
                      setSelectedConflict(null);
                      setMergeData({});
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Merge Changes
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for checking feature availability
export const useFeatureAvailability = (feature: string) => {
  const { offlineCapabilities } = useAppData() || {};
  
  const capability = Array.isArray(offlineCapabilities)
    ? offlineCapabilities.find(cap => cap?.feature === feature)
    : null;
  
  return {
    available: capability?.available ?? true,
    reason: capability?.reason,
    alternativeAction: capability?.alternativeAction
  };
};
