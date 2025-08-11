/**
 * Unified Configuration Context
 * React context for the unified configuration system
 * Provides configuration state and management functions to React components
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, ReactElement } from 'react';
import {
  UnifiedAppConfig,
  unifiedConfigManager,
  BackendStatus,
  DataMode,
  Environment,
  DatabaseProvider,
  EnvironmentConfig,
  DataModeState,
  DataModeSwitchResult,
  ProductionDemoState,
  getUnifiedEnvironmentConfig,
  getUnifiedDataModeState,
  getUnifiedProductionDemoState,
  canSwitchModes,
  getAllowedModes,
  getAllowedDatabaseProviders,
} from '../config/unifiedConfig';

// Re-export UnifiedAppConfig for convenience
export type { UnifiedAppConfig };
import { backendDetectionService } from '../services/backendDetection';
import { dataModeManager, DataModeManagerOptions } from '../services/dataModeManager';

// Context Types
interface UnifiedConfigContextType {
  // Configuration State
  config: UnifiedAppConfig;
  isLoading: boolean;
  error: string | null;
  
  // Backend Status
  backendStatus: BackendStatus | null;
  isBackendChecking: boolean;
  
  // Configuration Management
  updateConfig: (updates: Partial<UnifiedAppConfig>) => void;
  resetConfig: () => void;
  applyPreset: (preset: 'development' | 'staging' | 'production') => void;
  
  // Backend Detection
  checkBackendStatus: (force?: boolean) => Promise<BackendStatus>;
  refreshBackendStatus: () => Promise<void>;
  
  // Enhanced Data Mode Management
  switchDataMode: (targetMode: DataMode, options?: { requiresReload?: boolean }) => Promise<DataModeSwitchResult>;
  getDataModeState: () => DataModeState;
  canSwitchToMode: (targetMode: DataMode) => boolean;
  getAllowedDataModes: () => DataMode[];
  
  // Environment Management
  getCurrentEnvironment: () => Environment;
  getEnvironmentConfig: () => EnvironmentConfig;
  updateEnvironment: (environment: Environment) => Promise<void>;
  
  // Database Provider Management
  getCurrentDatabaseProvider: () => DatabaseProvider;
  getAllowedDatabaseProviders: () => DatabaseProvider[];
  updateDatabaseProvider: (provider: DatabaseProvider) => Promise<void>;
  
  // Production Demo Management
  getProductionDemoState: () => ProductionDemoState;
  transitionToLiveMode: () => Promise<DataModeSwitchResult>;
  isProductionDemoAvailable: () => boolean;
  
  // Legacy Data Mode Management (for backward compatibility)
  switchToDemo: (options?: DataModeManagerOptions) => Promise<{ success: boolean; message: string }>;
  switchToProduction: (options?: DataModeManagerOptions) => Promise<{ success: boolean; message: string }>;
  clearDemoData: () => Promise<{ success: boolean; message: string }>;
  isDemoDataActive: () => Promise<boolean>;
  
  // Utility Functions
  getDataModeStatus: () => {
    mode: DataMode;
    isDemo: boolean;
    canSwitchToDemo: boolean;
    canSwitchToProduction: boolean;
  };
  validateServices: () => Promise<{
    rxdbAvailable: boolean;
    mockDataAvailable: boolean;
    allServicesReady: boolean;
  }>;
}

// Create Context
const UnifiedConfigContext = createContext<UnifiedConfigContextType | undefined>(undefined);

// Provider Props
interface UnifiedConfigProviderProps {
  children: ReactNode;
  autoDetectBackend?: boolean;
  backendDetectionInterval?: number;
}

/**
 * Unified Configuration Provider Component
 */
export function UnifiedConfigProvider({
  children,
  autoDetectBackend = false,
  backendDetectionInterval = 30000, // 30 seconds
}: UnifiedConfigProviderProps) {
  // State
  const [config, setConfig] = useState<UnifiedAppConfig>(unifiedConfigManager.getConfig());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [isBackendChecking, setIsBackendChecking] = useState(false);

  // Configuration Management Functions
  const updateConfig = useCallback((updates: Partial<UnifiedAppConfig>) => {
    try {
      unifiedConfigManager.updateConfig(updates);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    }
  }, []);

  const resetConfig = useCallback(() => {
    try {
      unifiedConfigManager.reset();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset configuration');
    }
  }, []);

  const applyPreset = useCallback((preset: 'development' | 'staging' | 'production') => {
    try {
      unifiedConfigManager.applyPreset(preset);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply preset');
    }
  }, []);

  // Backend Detection Functions
  const checkBackendStatus = useCallback(async (force: boolean = false): Promise<BackendStatus> => {
    setIsBackendChecking(true);
    setError(null);
    
    try {
      const status = await backendDetectionService.detectBackend(
        config.backend.url,
        { cacheEnabled: !force }
      );
      
      setBackendStatus(status);
      unifiedConfigManager.updateBackendStatus(status);
      
      return status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Backend detection failed';
      setError(errorMessage);
      
      const fallbackStatus: BackendStatus = {
        environment: 'unknown',
        version: 'unknown',
        demoModeEnabled: false,
        available: false,
      };
      
      setBackendStatus(fallbackStatus);
      return fallbackStatus;
    } finally {
      setIsBackendChecking(false);
    }
  }, [config.backend.url]);

  const refreshBackendStatus = useCallback(async () => {
    await checkBackendStatus(true);
  }, [checkBackendStatus]);

  // Data Mode Management Functions
  const switchToDemo = useCallback(async (options?: DataModeManagerOptions) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await dataModeManager.switchToDemo(options);
      if (!result.success) {
        setError(result.message);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch to demo mode';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchToProduction = useCallback(async (options?: DataModeManagerOptions) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await dataModeManager.switchToProduction(options);
      if (!result.success) {
        setError(result.message);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch to production mode';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearDemoData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await dataModeManager.clearDemoData();
      if (!result.success) {
        setError(result.message);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear demo data';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isDemoDataActive = useCallback(async () => {
    try {
      return await dataModeManager.isDemoDataActive();
    } catch (err) {
      console.error('Failed to check demo data status:', err);
      return false;
    }
  }, []);

  // Enhanced Data Mode Management Functions
  const switchDataMode = useCallback(async (targetMode: DataMode, options?: { requiresReload?: boolean }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await unifiedConfigManager.switchDataMode(targetMode, options);
      if (!result.success) {
        setError(result.message);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch data mode';
      setError(errorMessage);
      return { success: false, message: errorMessage, requiresReload: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getDataModeStateEnhanced = useCallback(() => {
    return unifiedConfigManager.getUnifiedDataModeState();
  }, []);

  const canSwitchToMode = useCallback((targetMode: DataMode) => {
    return canSwitchModes(config.environment, config.dataMode, targetMode);
  }, [config.environment, config.dataMode]);

  const getAllowedDataModesForEnv = useCallback(() => {
    return getAllowedModes(config.environment);
  }, [config.environment]);

  // Environment Management Functions
  const getCurrentEnvironment = useCallback(() => {
    return config.environment;
  }, [config.environment]);

  const getEnvironmentConfigCurrent = useCallback(() => {
    return unifiedConfigManager.getUnifiedEnvironmentConfig();
  }, []);

  const updateEnvironment = useCallback(async (environment: Environment) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await unifiedConfigManager.updateEnvironment(environment);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update environment';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Database Provider Management Functions
  const getCurrentDatabaseProvider = useCallback(() => {
    return config.database.provider;
  }, [config.database.provider]);

  const getAllowedDatabaseProvidersForEnv = useCallback(() => {
    return getAllowedDatabaseProviders(config.environment);
  }, [config.environment]);

  const updateDatabaseProvider = useCallback(async (provider: DatabaseProvider) => {
    setIsLoading(true);
    setError(null);
    
    try {
      updateConfig({
        database: {
          ...config.database,
          provider,
        },
      });
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update database provider';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [config.database, updateConfig]);

  // Production Demo Management Functions
  const getProductionDemoStateCurrent = useCallback(() => {
    return getUnifiedProductionDemoState();
  }, []);

  const transitionToLiveMode = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await unifiedConfigManager.transitionToLiveMode();
      if (!result.success) {
        setError(result.message);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to transition to live mode';
      setError(errorMessage);
      return { success: false, message: errorMessage, requiresReload: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isProductionDemoAvailable = useCallback(() => {
    return config.environment === 'production' && config.productionDemo.transitionAvailable;
  }, [config.environment, config.productionDemo.transitionAvailable]);

  // Utility Functions
  const getDataModeStatus = useCallback(() => {
    return dataModeManager.getDataModeStatus();
  }, []);

  const validateServices = useCallback(async () => {
    return await dataModeManager.validateServices();
  }, []);

  // Effects
  useEffect(() => {
    // Subscribe to configuration changes
    const unsubscribeConfig = unifiedConfigManager.subscribe((newConfig) => {
      setConfig(newConfig);
    });

    // Subscribe to backend status changes
    const unsubscribeBackend = backendDetectionService.subscribe((status) => {
      setBackendStatus(status);
    });

    // Subscribe to data mode changes
    const unsubscribeDataMode = dataModeManager.subscribe((mode, isDemo) => {
      // Configuration will be updated automatically by the manager
      // This is just for additional side effects if needed
      console.log(`Data mode changed to: ${mode}, Demo active: ${isDemo}`);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeBackend();
      unsubscribeDataMode();
    };
  }, []);

  useEffect(() => {
    // Initial backend detection
    if (autoDetectBackend && config.backend.url) {
      checkBackendStatus();
    }
  }, [autoDetectBackend, config.backend.url, checkBackendStatus]);

  useEffect(() => {
    // Periodic backend status checking
    if (autoDetectBackend && backendDetectionInterval > 0) {
      const interval = setInterval(() => {
        if (!isBackendChecking) {
          checkBackendStatus();
        }
      }, backendDetectionInterval);

      return () => clearInterval(interval);
    }
  }, [autoDetectBackend, backendDetectionInterval, isBackendChecking, checkBackendStatus]);

  // Context Value
  const contextValue: UnifiedConfigContextType = {
    // Configuration State
    config,
    isLoading,
    error,
    
    // Backend Status
    backendStatus,
    isBackendChecking,
    
    // Configuration Management
    updateConfig,
    resetConfig,
    applyPreset,
    
    // Backend Detection
    checkBackendStatus,
    refreshBackendStatus,
    
    // Enhanced Data Mode Management
    switchDataMode,
    getDataModeState: getDataModeStateEnhanced,
    canSwitchToMode,
    getAllowedDataModes: getAllowedDataModesForEnv,
    
    // Environment Management
    getCurrentEnvironment,
    getEnvironmentConfig: getEnvironmentConfigCurrent,
    updateEnvironment,
    
    // Database Provider Management
    getCurrentDatabaseProvider,
    getAllowedDatabaseProviders: getAllowedDatabaseProvidersForEnv,
    updateDatabaseProvider,
    
    // Production Demo Management
    getProductionDemoState: getProductionDemoStateCurrent,
    transitionToLiveMode,
    isProductionDemoAvailable,
    
    // Legacy Data Mode Management (for backward compatibility)
    switchToDemo,
    switchToProduction,
    clearDemoData,
    isDemoDataActive,
    
    // Utility Functions
    getDataModeStatus,
    validateServices,
  };

  return (
    <UnifiedConfigContext.Provider value={contextValue}>
      {children}
    </UnifiedConfigContext.Provider>
  );
};

/**
 * Hook to use the unified configuration context
 */
export const useUnifiedConfig = (): UnifiedConfigContextType => {
  const context = useContext(UnifiedConfigContext);
  if (context === undefined) {
    throw new Error('useUnifiedConfig must be used within a UnifiedConfigProvider');
  }
  return context;
};

/**
 * Hook for configuration state only (lighter alternative)
 */
export const useConfig = (): UnifiedAppConfig => {
  const { config } = useUnifiedConfig();
  return config;
};

/**
 * Hook for backend status only
 */
export const useBackendStatus = (): {
  status: BackendStatus | null;
  isChecking: boolean;
  refresh: () => Promise<void>;
} => {
  const { backendStatus, isBackendChecking, refreshBackendStatus } = useUnifiedConfig();
  return {
    status: backendStatus,
    isChecking: isBackendChecking,
    refresh: refreshBackendStatus,
  };
};

/**
 * Hook for enhanced data mode management
 */
export const useDataMode = (): {
  // Enhanced data mode management
  state: DataModeState;
  switchMode: (targetMode: DataMode, options?: { requiresReload?: boolean }) => Promise<DataModeSwitchResult>;
  canSwitchTo: (targetMode: DataMode) => boolean;
  allowedModes: DataMode[];
  
  // Legacy support
  status: ReturnType<typeof dataModeManager.getDataModeStatus>;
  switchToDemo: (options?: DataModeManagerOptions) => Promise<{ success: boolean; message: string }>;
  switchToProduction: (options?: DataModeManagerOptions) => Promise<{ success: boolean; message: string }>;
  clearDemoData: () => Promise<{ success: boolean; message: string }>;
  isDemoActive: () => Promise<boolean>;
} => {
  const {
    getDataModeState,
    switchDataMode,
    canSwitchToMode,
    getAllowedDataModes,
    getDataModeStatus,
    switchToDemo,
    switchToProduction,
    clearDemoData,
    isDemoDataActive,
  } = useUnifiedConfig();
  
  return {
    // Enhanced data mode management
    state: getDataModeState(),
    switchMode: switchDataMode,
    canSwitchTo: canSwitchToMode,
    allowedModes: getAllowedDataModes(),
    
    // Legacy support
    status: getDataModeStatus(),
    switchToDemo,
    switchToProduction,
    clearDemoData,
    isDemoActive: isDemoDataActive,
  };
};

/**
 * Hook for environment management
 */
export const useEnvironment = (): {
  current: Environment;
  config: EnvironmentConfig;
  update: (environment: Environment) => Promise<void>;
} => {
  const {
    getCurrentEnvironment,
    getEnvironmentConfig,
    updateEnvironment,
  } = useUnifiedConfig();
  
  return {
    current: getCurrentEnvironment(),
    config: getEnvironmentConfig(),
    update: updateEnvironment,
  };
};

/**
 * Hook for database provider management
 */
export const useDatabaseProvider = (): {
  current: DatabaseProvider;
  allowed: DatabaseProvider[];
  update: (provider: DatabaseProvider) => Promise<void>;
} => {
  const {
    getCurrentDatabaseProvider,
    getAllowedDatabaseProviders,
    updateDatabaseProvider,
  } = useUnifiedConfig();
  
  return {
    current: getCurrentDatabaseProvider(),
    allowed: getAllowedDatabaseProviders(),
    update: updateDatabaseProvider,
  };
};

/**
 * Hook for production demo management
 */
export const useProductionDemo = (): {
  state: ProductionDemoState;
  isAvailable: boolean;
  transitionToLive: () => Promise<DataModeSwitchResult>;
} => {
  const {
    getProductionDemoState,
    isProductionDemoAvailable,
    transitionToLiveMode,
  } = useUnifiedConfig();
  
  return {
    state: getProductionDemoState(),
    isAvailable: isProductionDemoAvailable(),
    transitionToLive: transitionToLiveMode,
  };
};

/**
 * Hook for comprehensive configuration management
 */
export const useConfigManagement = (): {
  environment: ReturnType<typeof useEnvironment>;
  dataMode: ReturnType<typeof useDataMode>;
  database: ReturnType<typeof useDatabaseProvider>;
  productionDemo: ReturnType<typeof useProductionDemo>;
  backend: ReturnType<typeof useBackendStatus>;
} => {
  return {
    environment: useEnvironment(),
    dataMode: useDataMode(),
    database: useDatabaseProvider(),
    productionDemo: useProductionDemo(),
    backend: useBackendStatus(),
  };
};

export default UnifiedConfigContext;