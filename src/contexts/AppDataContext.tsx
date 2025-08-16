/// <reference types="react" />
// ABOUTME: This file provides the main data context for the application, managing data sources and state
// ABOUTME: Simplified implementation that eliminates hook order violations and infinite re-renders

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { getCurrentUnifiedConfig } from '../config/unifiedConfig';
// Simple inline mock data to replace broken import
const mockData = {
  academic: [{ id: 'mock-test-1', name: '🧪 MOCK DATA TEST - Academic Module', type: 'test' }],
  administration: [{ id: 'mock-test-2', name: '🧪 MOCK DATA TEST - Admin Module', type: 'test' }],
  finance: [{ id: 'mock-test-3', name: '🧪 MOCK DATA TEST - Finance Module', type: 'test' }],
  inventory: [{ id: 'mock-test-4', name: '🧪 MOCK DATA TEST - Inventory Module', type: 'test' }],
  library: [{ id: 'mock-test-5', name: '🧪 MOCK DATA TEST - Library Module', type: 'test' }],
  nutrition: [{ id: 'mock-test-6', name: '🧪 MOCK DATA TEST - Nutrition Module', type: 'test' }]
};
import { useRxDBData } from '../hooks/useRxDBData';
import { NetworkProvider, useNetwork } from './NetworkContext';
import { SyncProvider, useSync } from './SyncContext';
import { DataSourceProvider, useDataSource } from './DataSourceContext';

import type { AppDataContextType, RbacRole, Role } from '../core/types';
import Spinner from '../components/ui/Spinner';
import DismissibleBanner from '../components/DismissibleBanner';

export interface AppDataContextType {
  // Core data
  data: any;
  loading: boolean;
  error: Error | null;
  
  // Refresh functionality
  refresh: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Simple role mapping utility
function mapRbacRoleToLegacyRole(rbacRole: string): string {
  const roleMapping: Record<string, string> = {
    'super_admin': 'admin',
    'school_admin': 'admin',
    'teacher': 'teacher',
    'student': 'student',
    'parent': 'parent'
  };
  return roleMapping[rbacRole] || 'student';
}

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
  
  // Create mock result
  const mockResult = useMemo(() => ({
    data: mockData,
    loading: false,
    error: null,
    refresh: async () => {
      console.log('Mock refresh called');
    }
  }), []);

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
    source: shouldUseEnhancedData ? 'RxDB/Enhanced' : 'Mock Data',
    loading: selectedData.loading,
    hasData: Object.keys(selectedData.data || {}).length > 0
  });

  // Choose which result to use based on config
  const activeHookResult = useMemo(() => {
    return selectedData;
  }, [selectedData]);

  // Context value creation
  const contextValue = useMemo((): AppDataContextType => ({
    // Core data
    data: activeHookResult.data,
    loading: activeHookResult.loading,
    error: activeHookResult.error,
    refresh: activeHookResult.refresh
  }), [
    activeHookResult.data,
    activeHookResult.loading,
    activeHookResult.error,
    activeHookResult.refresh
  ]);

  // Loading state
  if (activeHookResult.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading application data...</span>
      </div>
    );
  }

  // Production mode error handling
  if (currentConfig.environment === 'production' && activeHookResult.error) {
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
