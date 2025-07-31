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
  applyPreset: (preset: 'development' | 'production' | 'demo') => void;
  
  // Backend Detection
  checkBackendStatus: (force?: boolean) => Promise<BackendStatus>;
  refreshBackendStatus: () => Promise<void>;
  
  // Data Mode Management
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

  const applyPreset = useCallback((preset: 'development' | 'production' | 'demo') => {
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
    
    // Data Mode Management
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
 * Hook for data mode management only
 */
export const useDataMode = (): {
  status: ReturnType<typeof dataModeManager.getDataModeStatus>;
  switchToDemo: (options?: DataModeManagerOptions) => Promise<{ success: boolean; message: string }>;
  switchToProduction: (options?: DataModeManagerOptions) => Promise<{ success: boolean; message: string }>;
  clearDemoData: () => Promise<{ success: boolean; message: string }>;
  isDemoActive: () => Promise<boolean>;
} => {
  const {
    getDataModeStatus,
    switchToDemo,
    switchToProduction,
    clearDemoData,
    isDemoDataActive,
  } = useUnifiedConfig();
  
  return {
    status: getDataModeStatus(),
    switchToDemo,
    switchToProduction,
    clearDemoData,
    isDemoActive: isDemoDataActive,
  };
};

export default UnifiedConfigContext;