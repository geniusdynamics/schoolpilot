/// <reference types="react" />
// ABOUTME: Simplified data context that integrates with UnifiedDatabaseManager
// ABOUTME: Provides consistent data access, loading states, error handling, and toast notifications

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getCurrentUnifiedConfig, updateAppConfig } from '../config/unifiedConfig';
import { UnifiedDatabaseManager } from '../services/database/UnifiedDatabaseManager';
import type { AppDataContextType, AppDataLoadingStates } from '../core/types';
import { useToastHelpers } from '../hooks/useToast';
import { NetworkStateManager, NetworkState } from '../services/NetworkStateManager';
import { getDataModeManager } from '../services/dataModeManager';
import { hasRequiredSchoolData } from '../services/database/demoDataSeed';
import {
  createAppDataLoadingState,
  normalizeAppDataCollections
} from './appData/appDataCollections';
import { BackupRestoreProvider, useBackupRestoreContext } from './appData/BackupRestoreContext';
import { DataGenerationProvider, useDataGenerationContext } from './appData/DataGenerationContext';
import { PaginationProvider, usePaginationContext } from './appData/PaginationContext';
import { ValidationProvider, useValidationContext } from './appData/ValidationContext';
import { useCoreDomain, useAcademicsDomain, useHRDomain, useFinanceDomain, useInventoryDomain, useSharedDomain } from './appData/domainContexts';

// Sync status interface
export interface SyncStatus {
  state: 'idle' | 'syncing' | 'error' | 'paused';
  progress: number;
  lastError: Error | null;
  lastSyncTime: Date | null;
  pendingOperations: number;
  conflictsCount: number;
}

// Sync settings interface
export interface SyncSettings {
  autoSync: boolean;
  backgroundSync: boolean;
  syncInterval: number;
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  enableConflictResolution: boolean;
  conflictResolution: 'local-wins' | 'remote-wins' | 'manual' | 'merge';
}

// Pagination options interface
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Pagination result interface
export interface PaginationResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Provider capabilities interface
export interface ProviderCapabilities {
  bulkOperations: boolean;
  advancedQueries: boolean;
  realTimeUpdates: boolean;
  conflictResolution: boolean;
  fullTextSearch: boolean;
  transactions: boolean;
}

// Data mode type
export type DataMode = 'online' | 'offline' | 'hybrid';

// Data strategy type
export type DataStrategy = 'api-first' | 'offline-first' | 'hybrid' | 'mock';

// Data source config interface
export interface DataSourceConfig {
  strategy: DataStrategy;
  fallbackEnabled: boolean;
  cacheTimeout: number;
  retryAttempts: number;
}

export { createAppDataLoadingState, normalizeAppDataCollections } from './appData/appDataCollections';

// Enhanced context type with database management and sync capabilities
export interface EnhancedAppDataContextType extends AppDataContextType {
  // Database status
  isDatabaseModeActive: boolean;
  isOnline: boolean;
  appVersion: string;
  deploymentMode: string;
  providerType: string | null;
  
  // Network state (from NetworkStateManager)
  backendAvailable: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  networkState: NetworkState | null;
  
  // Sync status
  syncStatus: SyncStatus;
  
  // Database operations
  refreshData: () => Promise<void>;
  backupData: () => Promise<any>;
  restoreData: (backup: any) => Promise<void>;
  clearAllData: () => Promise<void>;
  
  // Sync operations
  forceSync: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => void;
  cancelSync: () => void;
  
  // Sync settings
  getSyncSettings: () => SyncSettings;
  updateSyncSettings: (settings: Partial<SyncSettings>) => void;
  
  // Collection statistics
  getCollectionStats: () => Promise<Array<{
    name: string;
    count: number;
    status: string;
    health: 'healthy' | 'warning' | 'error';
  }>>;
  
  // Enhanced data refresh (Task 4.4.1)
  refreshCollection: (collectionName: string) => Promise<void>;
  refreshDataWithProgress: (onProgress?: (progress: number) => void) => Promise<void>;
  
  // Pagination (Task 4.4.2)
  getCollectionPage: <T = any>(collectionName: string, options: PaginationOptions) => Promise<PaginationResult<T>>;
  
  // Memory management (Task 4.4.3)
  cleanupOldData: (daysOld?: number) => Promise<void>;
  
  // Provider capabilities (Task 4.4.4)
  getProviderCapabilities: () => ProviderCapabilities;
  
  // Data mode tracking (Task 4.4.5)
  currentDataMode: DataMode;
  dataSourceDescription: string;
  
  // Data validation (Task 4.4.6)
  validateData: () => Promise<{
    isValid: boolean;
    issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; collection?: string }>;
  }>;
  
  // Data strategy (Task 4.4.8)
  getDataSourceConfig: () => DataSourceConfig;
  updateDataStrategy: (strategy: DataStrategy) => void;
  
  // Data generation (Task 5)
  generateData: (options?: {
    modules?: string[];
    counts?: Record<string, number>;
    useRealisticData?: boolean;
    includeTestData?: boolean;
    clearExisting?: boolean;
  }) => Promise<{ success: boolean; stats?: any; error?: string }>;
  
  seedDatabase: (seedConfig?: {
    dataMode?: 'demo' | 'development' | 'production';
    modules?: string[];
    volume?: 'tiny' | 'small' | 'medium' | 'large' | 'enterprise';
  }) => Promise<{ success: boolean; message: string; stats?: any }>;
}

// Create the context with a default undefined value
const AppDataContext = createContext<EnhancedAppDataContextType | undefined>(undefined);

export const hasAppDataContextContract = (
  context: EnhancedAppDataContextType | null | undefined
): context is EnhancedAppDataContextType => {
  return Boolean(
    context &&
    typeof context.refreshData === 'function' &&
    context.loading &&
    typeof context.loading === 'object'
  );
};

// Simplified provider component that uses UnifiedDatabaseManager
const AppDataValueProvider: React.FC<{
  children: ReactNode;
  coreValue: Partial<AppDataContextType>;
}> = ({ children, coreValue }) => {

  const { getCollectionPage } = usePaginationContext();
  const { validateData } = useValidationContext();

  const value = useMemo(() => ({
    ...coreValue,
    validateData
  }), [
    coreValue,
    validateData
  ]) as AppDataContextType;

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Consume Domain Contexts
  const coreDomain = useCoreDomain();
  const academicsDomain = useAcademicsDomain();
  const hrDomain = useHRDomain();
  const financeDomain = useFinanceDomain();
  const inventoryDomain = useInventoryDomain();
  const sharedDomain = useSharedDomain();

  // Reconstruct the legacy data object for internal operations if needed
  const data = useMemo(() => ({
    ...coreDomain,
    ...academicsDomain,
    ...hrDomain,
    ...financeDomain,
    ...inventoryDomain,
    ...sharedDomain
  }), [coreDomain, academicsDomain, hrDomain, financeDomain, inventoryDomain, sharedDomain]);

    
  // Network state
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  
  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'idle',
    progress: 0,
    lastError: null,
    lastSyncTime: null,
    pendingOperations: 0,
    conflictsCount: 0
  });
  
  // Sync settings (stored in localStorage)
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(() => {
    const unifiedSync = getCurrentUnifiedConfig().database.sync;
    try {
      const stored = localStorage.getItem('sync-settings');
      if (stored) {
        return {
          backgroundSync: true,
          maxRetries: unifiedSync.retryAttempts,
          retryDelay: 5000,
          enableConflictResolution: true,
          ...JSON.parse(stored)
        };
      }
    } catch (err) {
      console.warn('Failed to load sync settings:', err);
    }
    return {
      autoSync: unifiedSync.enabled,
      backgroundSync: true,
      syncInterval: unifiedSync.interval,
      batchSize: unifiedSync.batchSize,
      maxRetries: unifiedSync.retryAttempts,
      retryDelay: 5000,
      enableConflictResolution: unifiedSync.conflictResolution !== 'manual',
      conflictResolution: unifiedSync.conflictResolution === 'local' ? 'local-wins' : unifiedSync.conflictResolution === 'remote' ? 'remote-wins' : unifiedSync.conflictResolution
    };
  });
  
  // Data strategy (stored in localStorage)
  const [dataStrategy, setDataStrategy] = useState<DataStrategy>(() => {
    try {
      const stored = localStorage.getItem('data-strategy');
      if (stored) {
        return stored as DataStrategy;
      }
    } catch (err) {
      console.warn('Failed to load data strategy:', err);
    }
    return 'offline-first';
  });
  
  // Last refresh times per collection
  const lastRefreshTimes = useRef<Map<string, Date>>(new Map());
  
  const dbManager = useMemo(() => UnifiedDatabaseManager.getInstance(), []);
  const config = useMemo(() => getCurrentUnifiedConfig(), []);
  const toast = useToastHelpers(); // Toast functions are stable from the hook
  const networkManager = useMemo(() => NetworkStateManager.getInstance(), []);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const performSyncRef = useRef<(() => Promise<void>) | null>(null);

  // Initialize database manager - non-blocking to prevent app hang
  useEffect(() => {
    let mounted = true;

    const initializeDatabase = async () => {
      try {
        console.log('🚀 [AppDataContext] Starting database initialization (non-blocking)...');
        setIsLoading(false);
        setIsInitialized(true);

        const initPromise = dbManager.initialize();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database initialization timeout')), 15000);
        });

        await Promise.race([initPromise, timeoutPromise]);

        if (!mounted) return;

        if (config.dataMode !== 'production') {
          const provider = dbManager.getProvider();
          if (provider && !(await hasRequiredSchoolData(provider))) {
            await dbManager.seedDatabase({
              dataMode: 'demo',
              volume: 'medium'
            });
          }
        }

        window.dispatchEvent(new CustomEvent('appDataChanged'));
        const loadPromise = Promise.resolve();
        const loadTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Load collections timeout')), 20000);
        });

        await Promise.race([loadPromise, loadTimeoutPromise]);

        if (mounted) {
          console.log('✅ [AppDataContext] Database initialized successfully');
          toast.showSuccess('Database initialized successfully');
        }
      } catch (err) {
        console.warn('⚠️ [AppDataContext] Database init failed/timed out, continuing without DB:', err);
        if (mounted) {
          setIsInitialized(true);
          setIsLoading(false);
        }
      }
    };

    initializeDatabase();

    return () => {
      mounted = false;
    };
  }, [config.dataMode, dbManager, toast]);

  // Store sync settings in ref to avoid dependency
  const syncSettingsRef = useRef(syncSettings);
  useEffect(() => {
    syncSettingsRef.current = syncSettings;
  }, [syncSettings]);

  // Automatic sync interval
  useEffect(() => {
    // Clear existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    // Only set up auto-sync for providers that support it
    const providerType = dbManager.getProviderType();
    const supportsSync = providerType === 'backend-api' || providerType === 'pouchdb';

    if (!supportsSync || !syncSettingsRef.current.autoSync || !isInitialized) {
      return;
    }

    console.log(`🔄 [AppDataContext] Setting up automatic sync (interval: ${syncSettingsRef.current.syncInterval}ms)`);

    // Set up interval for automatic sync
    syncIntervalRef.current = setInterval(() => {
      if (isOnline && networkState?.backendAvailable && syncStatus.state !== 'paused' && !isSyncingRef.current && performSyncRef.current) {
        console.log('🔄 [AppDataContext] Automatic sync triggered');
        performSyncRef.current().catch(err => {
          console.error('Automatic sync failed:', err);
        });
      }
    }, syncSettingsRef.current.syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isInitialized, isOnline, networkState?.backendAvailable, syncStatus.state, dbManager]);


  useEffect(() => {
    const dataModeManager = getDataModeManager();
    const refreshFromEvent = () => {
      window.dispatchEvent(new CustomEvent('appDataChanged'));
    };

    dataModeManager.on('dataSeeded', refreshFromEvent);
    dataModeManager.on('dataCleared', refreshFromEvent);
    dataModeManager.on('modeChanged', refreshFromEvent);

    return () => {
        dataModeManager.off('dataSeeded', refreshFromEvent);
        dataModeManager.off('dataCleared', refreshFromEvent);
        dataModeManager.off('modeChanged', refreshFromEvent);
      };
    }, []);

    // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      window.dispatchEvent(new CustomEvent('appDataChanged'));
      toast.showSuccess('Data refreshed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      toast.showError(errorMessage);
      throw err;
    }
  }, [toast]); // Added toast to dependencies


  // Get collection statistics
  const getCollectionStats = useCallback(async () => {
    try {
      return await dbManager.getCollectionStatistics();
    } catch (err) {
      console.error('Failed to get collection stats:', err);
      return [];
    }
  }, [dbManager]);

  // Perform sync operation
  const performSync = useCallback(async () => {
    console.log('🔄 [DEBUG] performSync called with:', { 
      isOnline, 
      backendAvailable: networkState?.backendAvailable, 
      syncState: syncStatus.state 
    }); 

    // Only sync if provider supports it (backend-api or pouchdb)
    const providerType = dbManager.getProviderType();
    if (providerType !== 'backend-api' && providerType !== 'pouchdb') {
      console.log('ℹ️ [AppDataContext] Sync not supported for provider:', providerType);
      return;
    }

    if (!isOnline || !networkState?.backendAvailable) {
      console.log('ℹ️ [AppDataContext] Skipping sync - offline or backend unavailable');
      return;
    }

    if (isSyncingRef.current) {
      console.log('ℹ️ [AppDataContext] Sync already in progress');
      return;
    }

    if (syncStatus.state === 'paused') {
      console.log('ℹ️ [AppDataContext] Sync is paused');
      return;
    }

    try {
      isSyncingRef.current = true;
      setSyncStatus(prev => ({
        ...prev,
        state: 'syncing',
        progress: 0,
        lastError: null
      }));

      console.log('🔄 [AppDataContext] Starting sync...');
      
      // Get the current provider and check if it has sync capability
      const provider = dbManager.getCurrentProvider();
      if (provider && (provider as any).sync && typeof (provider as any).sync === 'function') {
        await (provider as any).sync();
        
        // Reload data after successful sync
        window.dispatchEvent(new CustomEvent('appDataChanged'));
        
        setSyncStatus(prev => ({
          ...prev,
          state: 'idle',
          progress: 100,
          lastSyncTime: new Date(),
          lastError: null
        }));
        
        console.log('✅ [AppDataContext] Sync completed successfully');
        toast.showSuccess('Data synchronized successfully');
      } else {
        console.warn('⚠️ [AppDataContext] Provider does not support sync');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ [AppDataContext] Sync failed:', error);
      
      setSyncStatus(prev => ({
        ...prev,
        state: 'error',
        lastError: error
      }));
      
      toast.showError(`Sync failed: ${error.message}`);
    } finally {
      isSyncingRef.current = false;
    }
  }, [dbManager, isOnline, networkState, syncStatus.state, toast]);

  // Store performSync in ref for use in effects
  useEffect(() => {
    performSyncRef.current = performSync;
  }, [performSync]);

  // Monitor online/offline status and network state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Subscribe to NetworkStateManager
    const unsubscribe = networkManager.subscribe((state) => {
      setNetworkState(state);
      setIsOnline(state.isOnline);
      
      // Trigger sync on network reconnection if auto-sync is enabled
      if (state.isOnline && syncSettingsRef.current.autoSync && !isSyncingRef.current && performSyncRef.current) {
        console.log('🔄 [AppDataContext] Network reconnected, triggering sync...');
        performSyncRef.current().catch(err => {
          console.error('Auto-sync on reconnection failed:', err);
        });
      }
    });
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [networkManager]);

  // Force sync
  const forceSync = useCallback(async () => {
    console.log('🔄 [AppDataContext] Force sync requested');
    await performSync();
  }, [performSync]);

  // Pause sync
  const pauseSync = useCallback(() => {
    console.log('⏸️ [AppDataContext] Sync paused');
    setSyncStatus(prev => ({ ...prev, state: 'paused' }));
    toast.showInfo('Automatic sync paused');
  }, [toast]);

  // Resume sync
  const resumeSync = useCallback(() => {
    console.log('▶️ [AppDataContext] Sync resumed');
    setSyncStatus(prev => ({ ...prev, state: 'idle' }));
    toast.showInfo('Automatic sync resumed');
    
    // Trigger immediate sync if online
    if (isOnline && networkState?.backendAvailable) {
      performSync().catch(err => {
        console.error('Sync on resume failed:', err);
      });
    }
  }, [isOnline, networkState, performSync, toast]);

  // Cancel sync
  const cancelSync = useCallback(() => {
    if (isSyncingRef.current) {
      console.log('🛑 [AppDataContext] Sync cancelled');
      isSyncingRef.current = false;
      setSyncStatus(prev => ({ ...prev, state: 'idle', progress: 0 }));
      toast.showWarning('Sync cancelled');
    }
  }, [toast]);

  // Get sync settings
  const getSyncSettings = useCallback(() => {
    return { ...syncSettings };
  }, [syncSettings]);

  // Update sync settings
  const updateSyncSettings = useCallback((newSettings: Partial<SyncSettings>) => {
    setSyncSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      try {
        localStorage.setItem('sync-settings', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save sync settings:', err);
      }

      const currentConfig = getCurrentUnifiedConfig();
      updateAppConfig({
        ...currentConfig,
        database: {
          ...currentConfig.database,
          sync: {
            ...currentConfig.database.sync,
            enabled: updated.autoSync,
            interval: updated.syncInterval,
            batchSize: updated.batchSize,
            retryAttempts: updated.maxRetries,
            conflictResolution: updated.conflictResolution === 'local-wins'
              ? 'local'
              : updated.conflictResolution === 'remote-wins'
                ? 'remote'
                : updated.conflictResolution
          }
        }
      });
      
      return updated;
    });
    
    toast.showSuccess('Sync settings updated');
  }, [toast]);

  // ========== Task 4.4: Data Refresh and State Management ==========

  // Task 4.4.1: Enhanced data refresh - Refresh single collection
  const refreshCollection = useCallback(async (collectionName: string) => {
    try {
      const collection = dbManager.getCollection(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      // Check throttling (max once per 5 seconds)
      const lastRefresh = lastRefreshTimes.current.get(collectionName);
      if (lastRefresh && Date.now() - lastRefresh.getTime() < 5000) {
        return;
      }

      console.log(`🔄 [AppDataContext] Refreshing collection: ${collectionName}`);
      
      if (typeof collection.find === 'function') {
        const docs = await collection.find({});
        setData(prev => ({ ...prev, [collectionName]: docs }));
        lastRefreshTimes.current.set(collectionName, new Date());
        toast.showSuccess(`${collectionName} refreshed successfully`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to refresh ${collectionName}`;
      console.error(`Failed to refresh collection ${collectionName}:`, err);
      toast.showError(errorMessage);
      throw err;
    }
  }, [dbManager, toast]);

  // Task 4.4.1: Refresh data with progress tracking
  const refreshDataWithProgress = useCallback(async (onProgress?: (progress: number) => void) => {
    try {
      const collections = dbManager.getAllCollections();
      const totalCollections = collections.size;
      let completed = 0;

      const loadedData: Record<string, any[]> = {};

      for (const [name, collection] of collections) {
        try {
          if (collection && typeof collection.find === 'function') {
            const docs = await collection.find({});
            loadedData[name] = docs;
          }
        } catch (err) {
          console.warn(`Failed to load collection ${name}:`, err);
          loadedData[name] = [];
        }

        completed++;
        const progress = Math.round((completed / totalCollections) * 100);
        if (onProgress) {
          onProgress(progress);
        }
      }

      setData(loadedData);
      toast.showSuccess('All data refreshed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      toast.showError(errorMessage);
      throw err;
    }
  }, [dbManager, toast]);

  const { getCollectionPage } = usePaginationContext();

  // Task 4.4.3: Memory management - Cleanup old data
  const cleanupOldData = useCallback(async (daysOld: number = 30) => {
    try {
      console.log(`🗑️ [AppDataContext] Cleaning up data older than ${daysOld} days...`);
      toast.showInfo(`Cleaning up data older than ${daysOld} days...`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let totalCleaned = 0;

      for (const [name, collection] of dbManager.getAllCollections()) {
        try {
          if (collection && typeof collection.find === 'function' && typeof collection.remove === 'function') {
            // Find all documents and filter old ones
            const allDocs = await collection.find({});
            const cutoffTime = cutoffDate.getTime();

            for (const doc of allDocs) {
              // Check if document is old based on createdAt or updatedAt
              const createdAt = doc.createdAt ? new Date(doc.createdAt).getTime() : null;
              const updatedAt = doc.updatedAt ? new Date(doc.updatedAt).getTime() : null;

              const isOld = (createdAt && createdAt < cutoffTime) || (updatedAt && updatedAt < cutoffTime);

              if (isOld && doc.id) {
                await collection.remove(doc.id);
                totalCleaned++;
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to cleanup collection ${name}:`, err);
        }
      }

      console.log(`✅ [AppDataContext] Cleaned up ${totalCleaned} old records`);
      toast.showSuccess(`Cleaned up ${totalCleaned} old records`);
      
      // Refresh data after cleanup
      window.dispatchEvent(new CustomEvent('appDataChanged'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cleanup old data';
      console.error('Cleanup failed:', err);
      toast.showError(errorMessage);
      throw err;
    }
  }, [dbManager]); // Removed toast to prevent re-render loop

  // Task 4.4.4: Provider capability detection
  const getProviderCapabilities = useCallback((): ProviderCapabilities => {
    const providerType = dbManager.getProviderType();

    // Define capabilities based on provider type
    const capabilities: Record<string, ProviderCapabilities> = {
      'sqlite-file': {
        bulkOperations: true,
        advancedQueries: true,
        realTimeUpdates: false,
        conflictResolution: false,
        fullTextSearch: true,
        transactions: true
      },
      'sqlite-wasm': {
        bulkOperations: true,
        advancedQueries: true,
        realTimeUpdates: false,
        conflictResolution: false,
        fullTextSearch: true,
        transactions: true
      },
      'pouchdb': {
        bulkOperations: true,
        advancedQueries: true,
        realTimeUpdates: true,
        conflictResolution: true,
        fullTextSearch: false,
      },
      'backend-api': {
        bulkOperations: true,
        advancedQueries: true,
        realTimeUpdates: true,
        conflictResolution: true,
        fullTextSearch: true,
        transactions: true
      },
      'livestore': {
        bulkOperations: true,
        advancedQueries: true,
        realTimeUpdates: true,
        conflictResolution: true,
        fullTextSearch: false,
        transactions: false
      }
    };

    return capabilities[providerType || 'pouchdb'] || capabilities['pouchdb'];
  }, [dbManager]);

  // Task 4.4.5: Data mode tracking
  const currentDataMode = useMemo((): DataMode => {
    if (!isOnline) return 'offline';
    if (networkState?.backendAvailable) return 'online';
    return 'hybrid';
  }, [isOnline, networkState]);

  const dataSourceDescription = useMemo((): string => {
    const providerType = dbManager.getProviderType();
    const mode = currentDataMode;

    if (mode === 'offline') {
      return `Offline mode - Using local ${providerType} database`;
    }
    if (mode === 'online') {
      return `Online mode - Syncing with backend via ${providerType}`;
    }
    return `Hybrid mode - Local ${providerType} with limited connectivity`;
  }, [dbManager, currentDataMode]);

  const { validateData } = useValidationContext();

  // Task 4.4.8: Data strategy configuration
  const getDataSourceConfig = useCallback((): DataSourceConfig => {
    return {
      strategy: dataStrategy,
      fallbackEnabled: true,
      cacheTimeout: 300000, // 5 minutes
      retryAttempts: 3
    };
  }, [dataStrategy]);

  const updateDataStrategy = useCallback((newStrategy: DataStrategy) => {
    if (config.environment !== 'development') {
      toast.showWarning('Data strategy can only be changed in development mode');
      return;
    }

    setDataStrategy(newStrategy);
    
    try {
      localStorage.setItem('data-strategy', newStrategy);
    } catch (err) {
      console.warn('Failed to save data strategy:', err);
    }

    toast.showSuccess(`Data strategy updated to: ${newStrategy}`);
  }, [config.environment]); // Removed toast to prevent re-render loop

  // ========== Task 5: Migrate Mock Data System to Database ==========



  
  const {
    getTimetablePeriodDefs,
    getTimetableEntries,
    getStudentAttendanceByFilters,
    saveStudentAttendance,
    addExamSession,
    updateExamSession,
    deleteExamSession,
    addExamPaperSetting,
    updateExamPaperSetting,
    deleteExamPaperSetting,
    saveStudentExamResult,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry
  } = useAcademicsOperations(dbManager, data);


  // Create context value
  const contextValue = useMemo(() => {
    const normalizedData = normalizeAppDataCollections(data);
    const loadingState = createAppDataLoadingState(isLoading);

    return {
      ...normalizedData,
      isInitialized,
      loading: loadingState,
      error,
      isDatabaseModeActive: isInitialized && !isLoading && !error,
      isOnline,
      appVersion: '1.0.0',
      deploymentMode: dbManager.getDeploymentMode(),
      providerType: dbManager.getProviderType(),
      backendAvailable: networkState?.backendAvailable || false,
      connectionQuality: networkState?.connectionQuality || 'offline',
      networkState,
      syncStatus,
      refreshData,
      getCollectionStats,
      forceSync,
      pauseSync,
      resumeSync,
      cancelSync,
      getSyncSettings,
      updateSyncSettings,
      refreshCollection,
      refreshDataWithProgress,
      cleanupOldData,
      getProviderCapabilities,
      currentDataMode,
      dataSourceDescription,
      getDataSourceConfig,
      updateDataStrategy,
      saveStudentAttendance,
      getStudentAttendanceByFilters,
      addExamSession,
      updateExamSession,
      deleteExamSession,
      addExamPaperSetting,
      updateExamPaperSetting,
      deleteExamPaperSetting,
      saveStudentExamResult,
      getTimetablePeriodDefs,
      getTimetableEntries,
      addTimetableEntry,
      updateTimetableEntry,
      deleteTimetableEntry
    };
  }, [
    data,
    isInitialized,
    isLoading,
    error,
    isOnline,
    dbManager,
    networkState,
    syncStatus,
    refreshData,
    getCollectionStats,
    forceSync,
    pauseSync,
    resumeSync,
    cancelSync,
    getSyncSettings,
    updateSyncSettings,
    refreshCollection,
    refreshDataWithProgress,
    cleanupOldData,
    getProviderCapabilities,
    currentDataMode,
    dataSourceDescription,
    getDataSourceConfig,
    updateDataStrategy,
    saveStudentAttendance,
    getStudentAttendanceByFilters,
    addExamSession,
    updateExamSession,
    deleteExamSession,
    addExamPaperSetting,
    updateExamPaperSetting,
    deleteExamPaperSetting,
    saveStudentExamResult,
    getTimetablePeriodDefs,
    getTimetableEntries,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry
  ]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading application data...</span>
      </div>
    );
  }

  // Error state with recovery options
  if (error && config.environment === 'production') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-6 max-w-md">
          <div className="text-red-600 text-xl mb-2">⚠️ Application Error</div>
          <div className="text-gray-700 mb-4">
            {error.message || 'We\'re experiencing technical difficulties. Please try again later.'}
          </div>
          <div className="space-x-2">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Application
            </button>
            <button 
              onClick={() => setError(null)} 
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppDataValueProvider coreValue={contextValue}>
      {children}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          📡 Offline Mode - Changes will sync when connection is restored
        </div>
      )}
    </AppDataValueProvider>
  );
};

// Hook to access the data context
export const useAppData = (): EnhancedAppDataContextType => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

// Export the context for use in other files
export { AppDataContext };
