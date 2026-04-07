// ABOUTME: Custom hooks for accessing UnifiedConfigContext functionality
// ABOUTME: Separated from context file to maintain Fast Refresh compatibility

import { useContext } from 'react';
import { UnifiedConfigContext } from '@/contexts/UnifiedConfigContext';
import type {
  UnifiedConfigContextType,
  UnifiedAppConfig,
  BackendStatus,
  DataModeState,
  DataMode,
  DataModeSwitchResult,
  DataModeManagerOptions,
  Environment,
  EnvironmentConfig,
  DatabaseProvider,
  ProductionDemoState,
} from '@/contexts/UnifiedConfigContext';
import { dataModeManager } from '@/utils/dataModeManager';

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