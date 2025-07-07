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
import { useAppData } from '../contexts/AppDataContext';

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
  const { isOnline, backendAvailable, offlineCapabilities } = useAppData();
  
  const capability = offlineCapabilities.find(cap => cap.feature === feature);
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
          
          {syncStatus.state === 'syncing' && (
            <div className="flex items-center space-x-1 text-xs text-blue-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span>Syncing...</span>
            </div>
          )}
          
          {syncStatus.state === 'error' && (
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

// Sync status component
interface SyncStatusComponentProps {
  className?: string;
}

export const SyncStatusComponent: React.FC<SyncStatusComponentProps> = ({
  className = ''
}) => {
  const { 
    syncStatus, 
    pendingSyncCount, 
    forceSync, 
    getQueueStatus,
    isOnline,
    backendAvailable 
  } = useAppData();

  const queueStatus = getQueueStatus();
  const canSync = isOnline && backendAvailable;

  const getSyncStatusIcon = () => {
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
    switch (syncStatus.state) {
      case 'syncing':
        return `Syncing... (${Math.round(syncStatus.progress)}%)`;
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
      
      <div className="flex space-x-2">
        <button
          onClick={forceSync}
          disabled={!canSync || syncStatus.state === 'syncing'}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {syncStatus.state === 'syncing' ? 'Syncing...' : 'Force Sync'}
        </button>
        
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
  const { offlineCapabilities } = useAppData();
  
  const featureStatus = features.map(feature => {
    const capability = offlineCapabilities.find(cap => cap.feature === feature);
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

// Hook for checking feature availability
export const useFeatureAvailability = (feature: string) => {
  const { offlineCapabilities } = useAppData();
  
  const capability = offlineCapabilities.find(cap => cap.feature === feature);
  
  return {
    available: capability?.available ?? true,
    reason: capability?.reason,
    alternativeAction: capability?.alternativeAction
  };
};