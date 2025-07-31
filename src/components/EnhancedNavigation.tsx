// Enhanced navigation component with network status and sync indicators
import React from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { useUnifiedConfig } from '../contexts/UnifiedConfigContext';

const EnhancedNavigation: React.FC = () => {
  const {
    isOnline,
    backendAvailable,
    dataSource,
    connectionQuality,
    syncStatus,
    pendingSyncCount
  } = useAppData();
  
  const { config } = useUnifiedConfig();
  const currentMode = config.dataMode === 'demo' ? 'demo' : 'production';

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (!backendAvailable) return 'text-amber-500';
    if (connectionQuality === 'excellent') return 'text-green-500';
    if (connectionQuality === 'good') return 'text-blue-500';
    return 'text-amber-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!backendAvailable) return 'Local Only';
    return `Online (${connectionQuality})`;
  };

  const getDataSourceText = () => {
    switch (dataSource) {
      case 'mock': return 'Mock Data';
      case 'rxdb': return 'Local Database';
      case 'backend': return 'Live Server';
      case 'hybrid': return 'Hybrid Mode';
      default: return dataSource;
    }
  };

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">SchoolPilot3</h1>
            </div>

            {/* Mode indicator */}
            <div className="text-sm text-gray-500">
              {currentMode === 'demo' && '(Demo Mode)'}
              {currentMode === 'production' && '(Production)'}
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Network status */}
            <div className={`flex items-center space-x-2 text-sm ${getStatusColor()}`}>
              <div className={`w-2 h-2 rounded-full ${!isOnline ? 'bg-red-500' :
                  !backendAvailable ? 'bg-amber-500' :
                    connectionQuality === 'excellent' ? 'bg-green-500' :
                      connectionQuality === 'good' ? 'bg-blue-500' :
                        'bg-amber-500'
                }`}></div>
              <span className="font-medium">{getStatusText()}</span>
            </div>

            {/* Data source */}
            <div className="text-sm text-gray-600">
              Source: <span className="font-medium">{getDataSourceText()}</span>
            </div>

            {/* Subtle sync indicator - only show when actively syncing or has errors */}
            {syncStatus.state === 'syncing' && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span className="text-xs">Syncing</span>
              </div>
            )}

            {syncStatus.state === 'error' && (
              <div className="flex items-center space-x-2 text-red-600">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs">Sync Issue</span>
              </div>
            )}

            {/* Only show pending count if significant */}
            {pendingSyncCount > 10 && (
              <div className="flex items-center space-x-1 text-amber-600">
                <span className="text-xs">{pendingSyncCount} pending</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedNavigation;