import { logger } from '@/utils/logging';

// ABOUTME: Data source management context for handling different data strategies
// ABOUTME: Provides data source selection, configuration, and strategy management

import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';
import { useNetwork } from './NetworkContext';
import { useSync } from './SyncContext';

export type DataStrategy = 'api-first' | 'offline-first' | 'hybrid' | 'mock';

export interface DataSourceConfig {
  strategy: DataStrategy;
  fallbackEnabled: boolean;
  cacheTimeout: number;
  retryAttempts: number;
}

export interface DataSourceContextType {
  // Current data strategy
  dataStrategy: DataStrategy;
  currentDataMode: 'online' | 'offline' | 'hybrid';
  
  // Data source configuration
  getDataSourceConfig: () => DataSourceConfig;
  updateDataStrategy: (strategy: DataStrategy) => void;
  
  // Data source description
  dataSourceDescription: string;
  
  // Enhanced operations (when available)
  enhancedOperations: {
    bulkOperations: boolean;
    advancedQueries: boolean;
    realTimeUpdates: boolean;
    conflictResolution: boolean;
  };
}

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined);

const DATA_STRATEGY_CONFIGS: Record<DataStrategy, DataSourceConfig> = {
  'api-first': {
    strategy: 'api-first',
    fallbackEnabled: true,
    cacheTimeout: 300000, // 5 minutes
    retryAttempts: 3
  },
  'offline-first': {
    strategy: 'offline-first',
    fallbackEnabled: true,
    cacheTimeout: 3600000, // 1 hour
    retryAttempts: 1
  },
  'hybrid': {
    strategy: 'hybrid',
    fallbackEnabled: true,
    cacheTimeout: 600000, // 10 minutes
    retryAttempts: 2
  },
  'mock': {
    strategy: 'mock',
    fallbackEnabled: false,
    cacheTimeout: 0,
    retryAttempts: 0
  }
};

export const DataSourceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isOnline } = useNetwork();
  const { syncStatus } = useSync();
  
  const [dataStrategy, setDataStrategy] = useState<DataStrategy>('hybrid');

  // Determine current data mode based on network and strategy
  const currentDataMode = useMemo((): 'online' | 'offline' | 'hybrid' => {
    if (!isOnline) return 'offline';
    if (dataStrategy === 'offline-first') return 'offline';
    if (dataStrategy === 'api-first') return 'online';
    return 'hybrid';
  }, [isOnline, dataStrategy]);

  // Data source configuration
  const getDataSourceConfig = useCallback((): DataSourceConfig => {
    return DATA_STRATEGY_CONFIGS[dataStrategy];
  }, [dataStrategy]);

  const updateDataStrategy = useCallback((strategy: DataStrategy) => {
    logger.info(`Updating data strategy from ${dataStrategy} to ${strategy}`);
    setDataStrategy(strategy);
  }, [dataStrategy]);

  // Data source description
  const dataSourceDescription = useMemo(() => {
    switch (currentDataMode) {
      case 'online':
        return 'Using live API data with real-time updates';
      case 'offline':
        return 'Using local cached data - changes will sync when online';
      case 'hybrid':
        return 'Using optimized data strategy with local caching';
      default:
        return 'Data source configuration pending';
    }
  }, [currentDataMode]);

  // Enhanced operations availability
  const enhancedOperations = useMemo(() => ({
    bulkOperations: isOnline && dataStrategy !== 'mock',
    advancedQueries: isOnline || dataStrategy === 'offline-first',
    realTimeUpdates: isOnline && dataStrategy === 'api-first',
    conflictResolution: dataStrategy === 'hybrid' || dataStrategy === 'offline-first'
  }), [isOnline, dataStrategy]);

  const contextValue = useMemo((): DataSourceContextType => ({
    // Current data strategy
    dataStrategy,
    currentDataMode,
    
    // Data source configuration
    getDataSourceConfig,
    updateDataStrategy,
    
    // Data source description
    dataSourceDescription,
    
    // Enhanced operations
    enhancedOperations
  }), [
    dataStrategy,
    currentDataMode,
    getDataSourceConfig,
    updateDataStrategy,
    dataSourceDescription,
    enhancedOperations
  ]);

  return (
    <DataSourceContext.Provider value={contextValue}>
      {children}
    </DataSourceContext.Provider>
  );
};

export const useDataSource = (): DataSourceContextType => {
  const context = useContext(DataSourceContext);
  if (context === undefined) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
};