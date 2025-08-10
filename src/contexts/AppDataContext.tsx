/// <reference types="react" />
// ABOUTME: This is the consolidated data context provider for the entire application.
// ABOUTME: It dynamically switches between mock data and RxDB based on the app mode.
// ABOUTME: Includes enhanced features like network status, sync capabilities, and offline support.

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState, useCallback } from 'react';
import { useUnifiedConfig, useConfig } from './UnifiedConfigContext';
import { unifiedConfigManager, DataMode } from '../config/unifiedConfig';
import { useModularMockData, rawInitialData as modularMockDataContentForProdSeed } from '../hooks/useModularMockData';
import { NetworkStateManager, NetworkState } from '../services/NetworkStateManager';
import { DataStrategyManager, DataStrategy, DataOperation } from '../services/DataStrategyManager';
import { BackendAPIService } from '../services/BackendAPIService';
import { globalDataConsistencyService, DataConsistencyConfig } from '../services/DataConsistencyService';
import { globalUnifiedCRUDService } from '../services/UnifiedCRUDService';
import { globalDataSyncMonitoringService, SyncStatus as DetailedSyncStatus } from '../services/DataSyncMonitoringService';

import type { AppDataContextType, RbacRole, Role } from '../core/types';
import Spinner from '../components/ui/Spinner';
import DismissibleBanner from '../components/DismissibleBanner';

// Sync settings interface
export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number;
  batchSize: number;
}

// Enhanced context type with backend integration features
export interface EnhancedAppDataContextType extends AppDataContextType {
  // Network and backend state
  isOnline: boolean;
  backendAvailable: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  
  // Data source information
  dataSource: 'mock' | 'rxdb' | 'backend' | 'hybrid';
  lastSyncTime: Date | null;
  
  // Sync status and controls
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  forceSync: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => void;
  
  // Offline capabilities
  offlineCapabilities: OfflineCapability[];
  disabledFeatures: string[];
  
  // Strategy management
  dataStrategy: DataStrategy;
  dataStrategyManager?: DataStrategyManager | null;
  updateDataStrategy: (strategy: Partial<DataStrategy>) => void;
  
  // Queue management
  getQueueStatus: () => QueueStatus;
  clearQueue: () => void;
  clearSyncQueue: () => void;
  
  // Sync settings
  getSyncSettings: () => SyncSettings;
  updateSyncSettings: (settings: Partial<SyncSettings>) => void;
  
  // Data validation and consistency
  validateEntity: (entityName: string, data: any, operation: 'create' | 'update' | 'delete') => Promise<import('../utils/dataValidation').ValidationResult>;
  runConsistencyCheck: () => Promise<import('../services/DataConsistencyService').ConsistencyReport>;
  getValidationConfig: () => DataConsistencyConfig;
  updateValidationConfig: (config: Partial<DataConsistencyConfig>) => void;
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'error' | 'paused';
  progress: number;
  lastError: Error | null;
  conflictsCount: number;
  lastSyncTime: Date | null;
}

export interface OfflineCapability {
  feature: string;
  available: boolean;
  reason?: string;
  alternativeAction?: string;
}

export interface QueueStatus {
  api: {
    pending: number;
    processing: boolean;
    byPriority: Record<string, number>;
  };
  sync: {
    pending: number;
    processing: boolean;
    byPriority: Record<string, number>;
    errors: number;
  };
}

const AppDataContext = createContext<EnhancedAppDataContextType | undefined>(undefined);

type UseRxDBDataHookType = typeof import('../hooks/useRxDBData').useRxDBData;
type DatabaseServiceModuleType = typeof import('../services/databaseService');

// Feature capability definitions
const FEATURE_CAPABILITIES: Record<string, OfflineCapability> = {
  'student-registration': {
    feature: 'student-registration',
    available: true,
    alternativeAction: 'Data will sync when online'
  },
  'student-photo-upload': {
    feature: 'student-photo-upload',
    available: true,
    alternativeAction: 'Photos will upload when online'
  },
  'invoice-generation': {
    feature: 'invoice-generation',
    available: false,
    reason: 'Requires backend for financial integrity'
  },
  'payment-processing': {
    feature: 'payment-processing',
    available: false,
    reason: 'Requires real-time payment gateway'
  },
  'fee-calculation': {
    feature: 'fee-calculation',
    available: true,
    alternativeAction: 'Calculations sync when online'
  },
  'grade-entry': {
    feature: 'grade-entry',
    available: true,
    alternativeAction: 'Grades will sync when online'
  },
  'exam-scheduling': {
    feature: 'exam-scheduling',
    available: true,
    alternativeAction: 'Schedule will sync when online'
  },
  'financial-reports': {
    feature: 'financial-reports',
    available: true,
    reason: 'Generated from local data',
    alternativeAction: 'Reports may not include latest backend data'
  },
  'academic-reports': {
    feature: 'academic-reports',
    available: true,
    alternativeAction: 'Reports generated from local data'
  }
};

// Data strategy configurations
const DATA_STRATEGY_CONFIGS: Record<string, DataStrategy> = {
  demo: {
    mode: 'demo',
    fallbackMode: 'offline',
    syncPolicy: 'manual',
    conflictResolution: 'client-wins'
  },
  development: {
    mode: 'hybrid',
    fallbackMode: 'offline',
    syncPolicy: 'batched',
    conflictResolution: 'prompt',
    batchSize: 5,
    syncInterval: 10000 // 10 seconds for development
  },
  production: {
    mode: 'online-first',
    fallbackMode: 'offline',
    syncPolicy: 'immediate',
    conflictResolution: 'server-wins',
    batchSize: 20,
    syncInterval: 30000 // 30 seconds for production
  }
};

// Mapping function: RbacRole -> Role (legacy)
function mapRbacRoleToLegacyRole(rbacRole: RbacRole, idx: number): Role {
  return {
    id: idx + 1,
    name: rbacRole.name,
    description: rbacRole.description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { config, isLoading: configLoading, error: configError } = useUnifiedConfig();
  // Original mock data hook
  const mockDataHookResult = useModularMockData();
  
  // Enhanced state management
  const [networkState, setNetworkState] = useState<NetworkState>(() => {
    const manager = NetworkStateManager.getInstance();
    return manager.getState();
  });
  
  const [dataStrategy, setDataStrategy] = useState<DataStrategy>(() => {
    const env = process.env.NODE_ENV || 'development';
    const appMode = config?.mode || env;
    return DATA_STRATEGY_CONFIGS[appMode] || DATA_STRATEGY_CONFIGS[env] || DATA_STRATEGY_CONFIGS.development;
  });

  // Update data strategy when config changes
  useEffect(() => {
    if (config?.mode) {
      const newStrategy = DATA_STRATEGY_CONFIGS[config.mode] || DATA_STRATEGY_CONFIGS.development;
      setDataStrategy(newStrategy);
    }
  }, [config?.mode]);
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'idle',
    progress: 0,
    lastError: null,
    conflictsCount: 0,
    lastSyncTime: null
  });
  
  // Service instances
  const [dataStrategyManager, setDataStrategyManager] = useState<DataStrategyManager | null>(null);
  const [backendAPI] = useState(() => new BackendAPIService());
  const [networkManager] = useState(() => NetworkStateManager.getInstance());
  
  // Database service loading state
  const [databaseServiceModule, setDatabaseServiceModule] = useState<any>(null);
  const [isProdDepsLoaded, setIsProdDepsLoaded] = useState(false);
  const [prodDepsError, setProdDepsError] = useState<Error | null>(null);
  const [rxDBDataHookResult, setRxDBDataHookResult] = useState<AppDataContextType | null>(null);
  const [UseRxDBData, setUseRxDBData] = useState<(() => AppDataContextType) | null>(null);

  // Initialize network monitoring
  useEffect(() => {
    const unsubscribe = networkManager.subscribe(setNetworkState);
    return unsubscribe;
  }, [networkManager]);

  // Load RxDB modules in production mode
  useEffect(() => {
    let isMounted = true;

    const loadRxDB = async () => {
      try {
        // Check if RxDB is available before loading
        const hasIndexedDB = typeof window !== 'undefined' && window.indexedDB;
        if (!hasIndexedDB) {
          console.warn('IndexedDB not available, skipping RxDB initialization');
          if (isMounted) {
            setProdDepsError(new Error('IndexedDB not available'));
            setIsProdDepsLoaded(true);
          }
          return;
        }

        const [{ useDatabaseData }, serviceModule] = await Promise.all([
          import('../hooks/useDatabaseData'),
          import('../services/databaseService'),
        ]);

        if (isMounted) {
          // Check if database is actually available
          const dbAvailable = serviceModule.isDatabaseAvailable?.() || serviceModule.initializationError === undefined;
          
          if (!dbAvailable) {
            console.warn('RxDB database not available, falling back to mock mode');
            setProdDepsError(new Error('RxDB database initialization failed'));
            setIsProdDepsLoaded(true);
            return;
          }

          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('reset') === 'true') {
            console.log('Reset parameter detected, clearing database...');
            try {
              const db = await serviceModule.getDatabase();
              await serviceModule.clearDatabase(db);
              console.log('Database cleared successfully.');
            } catch (clearError) {
              console.warn('Failed to clear database:', clearError);
            }
            // Remove the query param to avoid re-clearing on hot-reload
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          setDatabaseServiceModule(serviceModule);
          setUseRxDBData(() => useDatabaseData);
          setIsProdDepsLoaded(true);
          console.log('PouchDB database modules loaded successfully');
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load RxDB modules:', error);
          setProdDepsError(error);
          setIsProdDepsLoaded(true);
        }
      }
    };

    if (config && config.features.enhancedDataLayer) {
      loadRxDB();
    } else {
      setIsProdDepsLoaded(true); // Not using RxDB, so dependencies are 'loaded'
    }

    return () => {
      isMounted = false;
    };
  }, [config]);

  const currentDataMode = useMemo(() => {
    if (dataStrategy.mode === 'demo') return 'mock';
    if (config?.mode === 'production' && isProdDepsLoaded && !prodDepsError && UseRxDBData) {
      if (networkState.backendAvailable && dataStrategy.mode === 'online-first') {
        return 'backend';
      }
      return networkState.backendAvailable ? 'hybrid' : 'rxdb';
    }
    return 'mock';
  }, [config?.mode, dataStrategy.mode, isProdDepsLoaded, prodDepsError, networkState.backendAvailable, UseRxDBData]);

  const RxDBWrapper = useCallback(({ children }: { children: ReactNode }) => {
    if (!UseRxDBData) return null; // Should not happen if called correctly
    const rxDBResult = UseRxDBData(modularMockDataContentForProdSeed);
    const value = createContextValue(rxDBResult);
    return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
  }, [UseRxDBData, modularMockDataContentForProdSeed, networkState, dataStrategy, syncStatus, dataStrategyManager, backendAPI, currentDataMode, prodDepsError]);

  const createContextValue = (hookResult: AppDataContextType) => useMemo(() => ({
    ...hookResult,
    networkState,
    dataStrategy,
    syncStatus,
    dataStrategyManager,
    backendAPI,
    currentDataMode,
    isRxDBModeActive: config?.mode === 'production' && !prodDepsError,
    initializationError: prodDepsError,
    // Include all other enhanced context properties
  }), [hookResult, networkState, dataStrategy, syncStatus, dataStrategyManager, backendAPI, currentDataMode, prodDepsError]);

  if (config?.mode === 'production') {
    if (!isProdDepsLoaded) {
      return <Spinner message="Loading application data (Production Mode - Loading Database Modules)..." />;
    }
    if (prodDepsError) {
      console.warn('RxDB initialization failed, falling back to mock data:', prodDepsError);
      const value = createContextValue(mockDataHookResult);
      return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
    }
    if (UseRxDBData) {
      return <RxDBWrapper>{children}</RxDBWrapper>;
    }
    // Still loading the hook itself
    return <Spinner message="Initializing data context..." />;
  }

  // Initialize DataStrategyManager and related services
  useEffect(() => {
    if (databaseServiceModule && isProdDepsLoaded) {
      const manager = new DataStrategyManager(
        dataStrategy,
        databaseServiceModule,
        { useModularMockData }
      );
      setDataStrategyManager(manager);
      
      // Initialize data consistency service with appropriate config
      const consistencyConfig: DataConsistencyConfig = {
        enableValidation: true,
        enableReferentialIntegrity: true,
        enableConsistencyChecks: true,
        validationMode: dataStrategy.mode === 'demo' ? 'lenient' : 'strict',
        autoFix: false,
        logErrors: process.env.NODE_ENV === 'development'
      };
      globalDataConsistencyService.updateConfig(consistencyConfig);
      
      // Initialize unified CRUD service
      globalUnifiedCRUDService.updateServices(manager, { useModularMockData }, databaseServiceModule);
      
      // Initialize sync monitoring service
      globalDataSyncMonitoringService.updateDataStrategyManager(manager);
      
      // Import and initialize DataContextIntegrationService
      import('../services/DataContextIntegrationService').then(({ dataContextIntegrationService }) => {
        // We'll initialize it after the context value is created
        // This is handled in another useEffect below
      });
      
      return () => {
        manager.destroy();
        globalDataSyncMonitoringService.destroy();
        // Clean up DataContextIntegrationService
        import('../services/DataContextIntegrationService').then(({ dataContextIntegrationService }) => {
          dataContextIntegrationService.destroy();
        });
      };
    }
  }, [dataStrategy, databaseServiceModule, isProdDepsLoaded]);

  // currentDataMode is already defined above, removing duplicate declaration
  
  // createContextValue is already defined above, removing duplicate declaration

  // The rest of the return logic remains the same
  const activeHookResult = useMemo(() => {
    if (currentDataMode !== 'mock' && rxDBDataHookResult) {
      return rxDBDataHookResult;
    }
    return mockDataHookResult;
  }, [currentDataMode, mockDataHookResult, rxDBDataHookResult]);

  // Determine offline capabilities
  const offlineCapabilities = useMemo((): OfflineCapability[] => {
    return Object.values(FEATURE_CAPABILITIES).map(capability => ({
      ...capability,
      available: networkState.isOnline ? true : capability.available
    }));
  }, [networkState.isOnline]);

  // Determine disabled features
  const disabledFeatures = useMemo((): string[] => {
    return offlineCapabilities
      .filter(cap => !cap.available)
      .map(cap => cap.feature);
  }, [offlineCapabilities]);

  // Enhanced data operations using DataStrategyManager
  const enhancedOperations = useMemo(() => {
    if (!dataStrategyManager) return {};

    return {
      // Student operations
      addStudent: async (student: any) => {
        const operation: DataOperation = {
          type: 'write',
          entity: 'students',
          priority: 'high',
          requiresBackend: false,
          allowOffline: true
        };
        return dataStrategyManager.executeOperation(operation, student);
      },

      updateStudent: async (id: string, updates: any) => {
        const operation: DataOperation = {
          type: 'write',
          entity: 'students',
          priority: 'high',
          requiresBackend: false,
          allowOffline: true
        };
        return dataStrategyManager.executeOperation(operation, { id, ...updates });
      },

      deleteStudent: async (id: string) => {
        const operation: DataOperation = {
          type: 'delete',
          entity: 'students',
          priority: 'high',
          requiresBackend: false,
          allowOffline: true
        };
        return dataStrategyManager.executeOperation(operation, { id });
      },

      // Financial operations (allow offline for demo)
      generateInvoices: async (params: any) => {
        const operation: DataOperation = {
          type: 'write',
          entity: 'invoices',
          priority: 'critical',
          requiresBackend: false,
          allowOffline: true
        };
        return dataStrategyManager.executeOperation(operation, params);
      },

      // Alias for generateInvoices to match EffectFeeStructuresPage expectation
      generateStudentInvoices: async (feeTemplateId: number, schoolPeriodId: number, studentCriteria: any) => {
        const operation: DataOperation = {
          type: 'write',
          entity: 'invoices',
          priority: 'critical',
          requiresBackend: false,
          allowOffline: true
        };
        const params = { feeTemplateId, schoolPeriodId, studentCriteria };
        return dataStrategyManager.executeOperation(operation, params);
      },

      processPayment: async (payment: any) => {
        const operation: DataOperation = {
          type: 'write',
          entity: 'payments',
          priority: 'critical',
          requiresBackend: true,
          allowOffline: false
        };
        return dataStrategyManager.executeOperation(operation, payment);
      }
    };
  }, [dataStrategyManager]);

  // Sync control functions
  const syncControls = useMemo(() => ({
    forceSync: async () => {
      if (dataStrategyManager) {
        setSyncStatus(prev => ({ ...prev, state: 'syncing' }));
        try {
          await dataStrategyManager.forceSyncAll();
          setSyncStatus(prev => ({ 
            ...prev, 
            state: 'idle', 
            lastSyncTime: new Date(),
            lastError: null 
          }));
        } catch (error) {
          setSyncStatus(prev => ({ 
            ...prev, 
            state: 'error', 
            lastError: error as Error 
          }));
        }
      }
    },

    pauseSync: () => {
      setSyncStatus(prev => ({ ...prev, state: 'paused' }));
    },

    resumeSync: () => {
      setSyncStatus(prev => ({ ...prev, state: 'idle' }));
    }
  }), [dataStrategyManager]);

  // Queue status
  const getQueueStatus = useCallback((): QueueStatus => {
    const apiStatus = backendAPI.getQueueStatus();
    const syncStatus = dataStrategyManager?.getSyncStatus() || {
      pending: 0,
      processing: false,
      byPriority: {},
      errors: 0
    };

    return {
      api: apiStatus,
      sync: syncStatus
    };
  }, [backendAPI, dataStrategyManager]);

  // Data source description
  const dataSourceDescription = useMemo(() => {
    if (dataStrategy.mode === 'demo') return "Using Mock Data (Demo Mode)";
    if (!isProdDepsLoaded) return "Loading Database Modules...";
    if (prodDepsError) return `Using Mock Data (Fallback: ${prodDepsError.message})`;
    
    switch (currentDataMode) {
      case 'backend': return "Using Backend API";
      case 'hybrid': return "Using Hybrid Mode (Backend + Local)";
      case 'rxdb': return "Using Local Database";
      default: return "Using Mock Data";
    }
  }, [dataStrategy.mode, isProdDepsLoaded, prodDepsError, currentDataMode]);

  // Context value
  const contextValue = useMemo((): EnhancedAppDataContextType => {
    const getSyncSettings = () => ({ autoSync: true, syncInterval: 30000, batchSize: 10 });
    const updateSyncSettings = (settings: Partial<SyncSettings>) => {
      // Implement update logic
      console.log('Updated Settings:', settings);
    };
    // Include rbacRoles if present on activeHookResult
    const rbacRoles = (activeHookResult as any).rbacRoles || [];
    const legacyRoles = rbacRoles.map(mapRbacRoleToLegacyRole);
    
    const queueStatus = getQueueStatus();
    
    return {
      // Original context properties
      ...activeHookResult,
      roles: legacyRoles,
      ...(rbacRoles.length > 0 ? { rbacRoles } : {}),
      
      // Enhanced properties
      isOnline: networkState.isOnline,
      backendAvailable: networkState.backendAvailable,
      connectionQuality: networkState.connectionQuality,
      dataSource: currentDataMode,
      lastSyncTime: syncStatus.lastSyncTime,
      syncStatus,
      pendingSyncCount: queueStatus.sync.pending + queueStatus.api.pending,
      offlineCapabilities,
      disabledFeatures,
      dataStrategy,
      dataStrategyManager,
      
      // Enhanced operations
      ...enhancedOperations,
      
      // Control functions
      ...syncControls,
      updateDataStrategy: (newStrategy: Partial<DataStrategy>) => {
        const updatedStrategy = { ...dataStrategy, ...newStrategy };
        setDataStrategy(updatedStrategy);
        dataStrategyManager?.updateStrategy(newStrategy);
      },
      getQueueStatus,
      clearQueue: () => {
        backendAPI.clearQueue();
        dataStrategyManager?.clearSyncQueue();
      },
      clearSyncQueue: () => {
        dataStrategyManager?.clearSyncQueue();
      },
      getSyncSettings,
      updateSyncSettings,
      
      // Data validation and consistency functions
      validateEntity: async (entityName: string, data: any, operation: 'create' | 'update' | 'delete') => {
        return await globalDataConsistencyService.validateEntity(entityName, data, operation, {
          dataContext: { [entityName]: activeHookResult[entityName as keyof typeof activeHookResult] || [] },
          allData: activeHookResult
        });
      },
      
      runConsistencyCheck: async () => {
        const dataContext: Record<string, any[]> = {};
        
        // Collect all entity data from the active hook result
        const entityKeys = ['students', 'staff', 'financialYears', 'studentInvoices', 'examSessions', 
                           'classStreams', 'subjects', 'departments', 'designations', 'studentCategories', 
                           'dormitories', 'parentsGuardians', 'academicYears', 'schoolPeriods'];
        
        for (const key of entityKeys) {
          const entityData = activeHookResult[key as keyof typeof activeHookResult];
          if (Array.isArray(entityData)) {
            dataContext[key] = entityData;
          }
        }
        
        return await globalDataConsistencyService.runConsistencyCheck(dataContext, currentDataMode as any);
      },
      
      getValidationConfig: () => {
        return globalDataConsistencyService.getConfig();
      },
      
      updateValidationConfig: (config: Partial<DataConsistencyConfig>) => {
        globalDataConsistencyService.updateConfig(config);
      }
    };
  }, [
    activeHookResult, 
    networkState, 
    currentDataMode, 
    syncStatus, 
    offlineCapabilities, 
    disabledFeatures, 
    dataStrategy,
    dataStrategyManager,
    enhancedOperations,
    syncControls,
    getQueueStatus,
    backendAPI
  ]);
  
  // Initialize DataContextIntegrationService with the context value
  useEffect(() => {
    if (contextValue && dataStrategyManager) {
      import('../services/DataContextIntegrationService').then(({ dataContextIntegrationService }) => {
        dataContextIntegrationService.initialize(contextValue);
      });
    }
  }, [contextValue, dataStrategyManager]);

  // Loading states
  if (config?.mode === 'production' && !isProdDepsLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        fontSize: '1.2em', 
        backgroundColor: '#f0f0f0', 
        fontFamily: 'Inter, sans-serif' 
      }}>
        <Spinner className="loader" />
        <div style={{ marginTop: '20px' }}>
          Loading application data (Production Mode - Loading Database Modules)...
        </div>
      </div>
    );
  }

  if (activeHookResult.loading.all) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        fontSize: '1.2em', 
        backgroundColor: '#f0f0f0', 
        fontFamily: 'Inter, sans-serif' 
      }}>
        <Spinner className="loader" />
        <div style={{ marginTop: '20px' }}>
          Loading application data ({dataSourceDescription})...
        </div>
      </div>
    );
  }

  return (
    <AppDataContext.Provider value={contextValue}>
      {/* Network status warnings */}
      {config?.mode === 'production' && prodDepsError && (
        <div style={{
          position: 'fixed', 
          bottom: '10px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 204, 0, 0.95)', 
          color: '#333',
          padding: '8px 15px', 
          borderRadius: '8px', 
          zIndex: 10000,
          fontSize: '0.85em', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          textAlign: 'center',
        }}>
          <strong>Warning:</strong> Could not connect to local database. Using temporary sample data. 
          Changes will not be saved. ({prodDepsError.message})
        </div>
      )}
      
      {/* Unified status message system - show only one banner to prevent overlapping */}
      {(() => {
        const isDemoMode = dataStrategy.mode === 'demo';
        
        // Priority order: Offline > Demo Mode + Backend Unavailable > Backend Unavailable only
        if (!networkState.isOnline) {
          const message = isDemoMode 
            ? "Offline: Working in demo mode" 
            : "Offline: Working in offline mode";
          return (
            <DismissibleBanner 
              id="unified-status-banner"
              message={message}
              type="error" 
            />
          );
        }
        
        if (!networkState.backendAvailable) {
          const message = isDemoMode 
            ? "Demo Mode: Using sample data" 
            : "Backend Unavailable: Using local data";
          return (
            <DismissibleBanner 
              id="unified-status-banner"
              message={message}
              type={isDemoMode ? "info" : "warning"}
            />
          );
        }
        
        return null;
      })()}
      
      {children}
    </AppDataContext.Provider>
  );
};

// Note: useAppData and useAppDataInternal hooks have been moved to src/hooks/useAppData.ts
// for Fast Refresh compatibility (React Fast Refresh requires files to only export components)

// Export the context for use in other files
export { AppDataContext };
