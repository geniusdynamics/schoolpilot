/// <reference types="react" />
// ABOUTME: This file provides the main data context for the application, managing data sources and state
// ABOUTME: Enhanced implementation that provides necessary properties for settings pages

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { getCurrentUnifiedConfig } from '../config/unifiedConfig';
import { useRxDBData } from '../hooks/useRxDBData';
import { useModularMockData } from '../hooks/useModularMockData';
import { NetworkProvider, useNetwork } from './NetworkContext';
import { SyncProvider, useSync } from './SyncContext';
import { DataSourceProvider, useDataSource } from './DataSourceContext';

import type { AppDataContextType, RbacRole, Role } from '../core/types';
import Spinner from '../components/ui/Spinner';
import DismissibleBanner from '../components/DismissibleBanner';

// Create the context with a default undefined value
const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Internal component that uses the split contexts
const AppDataProviderInternal: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isOnline } = useNetwork();
  const { syncStatus } = useSync();
  const { dataStrategy } = useDataSource();

  // Get current config
  const currentConfig = useMemo(() => {
    return getCurrentUnifiedConfig();
  }, []);

  // Always call useRxDBData hook unconditionally
  const rxdbResult = useRxDBData();
  
  // Always call useModularMockData hook unconditionally
  const mockResult = useModularMockData();

  // Get current unified config to determine data source
  const shouldUseEnhancedData = currentConfig.features?.enhancedDataLayer;
  
  // Log configuration for debugging
  console.log('🔧 [AppDataContext] Configuration check:', {
    enhancedDataLayer: currentConfig.features?.enhancedDataLayer,
    dataMode: currentConfig.dataMode,
    shouldUseEnhancedData,
    usingMockData: !shouldUseEnhancedData
  });
  
  // Select appropriate data source based on enhanced data layer setting
  const selectedData = shouldUseEnhancedData ? rxdbResult : mockResult;
  
  console.log('📊 [AppDataContext] Data source selected:', {
    source: shouldUseEnhancedData ? 'RxDB/Enhanced' : 'Modular Mock Data',
    loading: selectedData.loading,
    hasData: Object.keys(selectedData).length > 0
  });

  // Create context value with all necessary properties
  const contextValue = useMemo((): AppDataContextType => {
    // Extract the properties we need for settings pages
    const schoolDetails = selectedData.schoolDetails || null;
    const users = selectedData.users || [];
    const isRxDBModeActive = !!shouldUseEnhancedData;
    
    return {
      // Core data from selected data source
      ...selectedData,
      
      // Settings page specific properties
      schoolDetails,
      users,
      isRxDBModeActive,
      
      // Loading and error states
      loading: selectedData.loading || false,
      error: selectedData.error || null,
      
      // Refresh function
      refresh: selectedData.refresh || (async () => {})
    };
  }, [selectedData, shouldUseEnhancedData]);

  // Loading state
  if (contextValue.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading application data...</span>
      </div>
    );
  }

  // Production mode error handling
  if (currentConfig.environment === 'production' && contextValue.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-6">
          <div className="text-red-600 text-xl mb-2">⚠️ Application Error</div>
          <div className="text-gray-700 mb-4">We're experiencing technical difficulties. Please try again later.</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
      
      {/* Status banners */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          📡 Offline Mode - Changes will sync when connection is restored
        </div>
      )}
      
      {syncStatus.state === 'syncing' && (
        <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 z-50">
          🔄 Syncing data... ({Math.round(syncStatus.progress)}%)
        </div>
      )}
      
      {syncStatus.state === 'error' && syncStatus.lastError && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
          ❌ Sync Error: {syncStatus.lastError.message}
        </div>
      )}
    </AppDataContext.Provider>
  );
};

// Main provider that wraps all context providers
export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <NetworkProvider>
      <SyncProvider>
        <DataSourceProvider>
          <AppDataProviderInternal>
            {children}
          </AppDataProviderInternal>
        </DataSourceProvider>
      </SyncProvider>
    </NetworkProvider>
  );
};

export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

// Export the context for use in other files
export { AppDataContext };