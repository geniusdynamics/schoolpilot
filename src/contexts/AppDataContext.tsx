/// <reference types="react" />
// ABOUTME: This is the enhanced data context provider for the entire application.
// ABOUTME: It provides hybrid data layer architecture with backend integration, offline capabilities, and intelligent data synchronization.

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState, useCallback } from 'react';
import { APP_MODE } from './config';
import { useModularMockData, rawInitialData as modularMockDataContentForProdSeed } from '../hooks/useModularMockData';
import { NetworkStateManager, NetworkState } from '../services/NetworkStateManager';
import { DataStrategyManager, DataStrategy, DataOperation } from '../services/DataStrategyManager';
import { BackendAPIService } from '../services/BackendAPIService';

import type { AppDataContextType, RbacRole, Role } from '../core/types';
import Spinner from '../components/ui/Spinner';

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
  updateDataStrategy: (strategy: Partial<DataStrategy>) => void;
  
  // Queue management
  getQueueStatus: () => QueueStatus;
  clearQueue: () => void;
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
type RxDBServiceModuleType = typeof import('../services/rxdbService');

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
  // Original mock data hook
  const mockDataHookResult = useModularMockData();
  
  // Enhanced state management
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    backendAvailable: false,
    latency: null,
    lastCheck: new Date(),
    connectionQuality: 'offline'
  });
  
  const [dataStrategy, setDataStrategy] = useState<DataStrategy>(() => {
    const env = process.env.NODE_ENV || 'development';
    return DATA_STRATEGY_CONFIGS[APP_MODE] || DATA_STRATEGY_CONFIGS[env] || DATA_STRATEGY_CONFIGS.development;
  });
  
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
  
  // RxDB and service loading state
  const [rxDBServiceModule, setRxDBServiceModule] = useState<any>(null);
  const [isProdDepsLoaded, setIsProdDepsLoaded] = useState(false);
  const [prodDepsError, setProdDepsError] = useState<Error | null>(null);
  const [rxDBDataHookResult, setRxDBDataHookResult] = useState<AppDataContextType | null>(null);

  // Initialize network monitoring
  useEffect(() => {
    const unsubscribe = networkManager.subscribe(setNetworkState);
    return unsubscribe;
  }, [networkManager]);

  // Load RxDB modules in production mode
  useEffect(() => {
    let isMounted = true;
    
    if (APP_MODE === 'production' || dataStrategy.mode !== 'demo') {
      Promise.all([
        import('../hooks/useRxDBData'),
        import('../services/rxdbService')
      ]).then(([{ useRxDBData }, serviceModule]) => {
        if (isMounted) {
          setRxDBServiceModule(serviceModule);
          setIsProdDepsLoaded(true);

          // Initialize RxDB and useRxDBData
          serviceModule.getDatabase().then(() => {
            const hookResult = useRxDBData(
              serviceModule.getDatabase,
              serviceModule.seedDatabaseWithMockData,
              serviceModule.clearDatabase,
              serviceModule.getUsingDummyDataFlag,
              modularMockDataContentForProdSeed
            );
            setRxDBDataHookResult(hookResult);
          }).catch((error: Error) => {
            if (isMounted) {
              setProdDepsError(error);
            }
          });
        }
      }).catch(error => {
        if (isMounted) {
          setProdDepsError(error);
          setIsProdDepsLoaded(true);
        }
      });
    } else {
      setIsProdDepsLoaded(true);
    }
    
    return () => { isMounted = false; };
  }, [dataStrategy.mode]);

  // Initialize DataStrategyManager
  useEffect(() => {
    if (rxDBServiceModule && isProdDepsLoaded) {
      const manager = new DataStrategyManager(
        dataStrategy,
        rxDBServiceModule,
        { useModularMockData }
      );
      setDataStrategyManager(manager);
      
      return () => {
        manager.destroy();
      };
    }
  }, [dataStrategy, rxDBServiceModule, isProdDepsLoaded]);

  // Determine current data mode
  const currentDataMode = useMemo(() => {
    if (dataStrategy.mode === 'demo') return 'mock';
    if (APP_MODE === 'production' && isProdDepsLoaded && rxDBDataHookResult && !prodDepsError) {
      if (networkState.backendAvailable && dataStrategy.mode === 'online-first') {
        return 'backend';
      }
      return networkState.backendAvailable ? 'hybrid' : 'rxdb';
    }
    return 'mock';
  }, [dataStrategy.mode, isProdDepsLoaded, rxDBDataHookResult, prodDepsError, networkState.backendAvailable]);

  // Select active hook result
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

      // Financial operations (require backend)
      generateInvoices: async (params: any) => {
        const operation: DataOperation = {
          type: 'write',
          entity: 'invoices',
          priority: 'critical',
          requiresBackend: true,
          allowOffline: false
        };
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
    enhancedOperations,
    syncControls,
    getQueueStatus,
    backendAPI,
    dataStrategyManager
  ]);

  // Loading states
  if (APP_MODE === 'production' && !isProdDepsLoaded) {
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
      {APP_MODE === 'production' && prodDepsError && (
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
      
      {!networkState.isOnline && (
        <div style={{
          position: 'fixed', 
          top: '10px', 
          right: '10px',
          backgroundColor: 'rgba(239, 68, 68, 0.95)', 
          color: 'white',
          padding: '8px 15px', 
          borderRadius: '8px', 
          zIndex: 10000,
          fontSize: '0.85em', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}>
          <strong>Offline:</strong> Working in offline mode
        </div>
      )}
      
      {networkState.isOnline && !networkState.backendAvailable && (
        <div style={{
          position: 'fixed', 
          top: '10px', 
          right: '10px',
          backgroundColor: 'rgba(245, 158, 11, 0.95)', 
          color: 'white',
          padding: '8px 15px', 
          borderRadius: '8px', 
          zIndex: 10000,
          fontSize: '0.85em', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}>
          <strong>Backend Unavailable:</strong> Using local data
        </div>
      )}
      
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): EnhancedAppDataContextType => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

// Backward compatibility export
export const EnhancedAppDataProvider = AppDataProvider;
