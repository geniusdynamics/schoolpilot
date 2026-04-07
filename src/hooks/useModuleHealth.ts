// Module Health Hook
// Provides access to module health data and monitoring capabilities

import { useState, useEffect } from 'react';
import { moduleHealthMonitor } from '../services/module/moduleHealthMonitor';
import { ModuleHealth, ModuleHealthStatus } from '../services/module/enhancedModuleLoader';
import { dynamicModuleLoader } from '../services/module/dynamicModuleLoader';

interface UseModuleHealthOptions {
  moduleId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseModuleHealthReturn {
  health: ModuleHealth | undefined;
  allHealth: Map<string, ModuleHealth>;
  isHealthy: boolean;
  hasWarnings: boolean;
  hasErrors: boolean;
  isLoading: boolean;
  reloadModule: (moduleId: string) => Promise<boolean>;
  refreshHealth: () => Promise<void>;
  modulesWithIssues: ModuleHealth[];
  modulesWithCriticalIssues: ModuleHealth[];
  statusCounts: Record<ModuleHealthStatus, number>;
}

export const useModuleHealth = (options: UseModuleHealthOptions = {}): UseModuleHealthReturn => {
  const { 
    moduleId, 
    autoRefresh = false, 
    refreshInterval = 60000 // 1 minute
  } = options;
  
  const [health, setHealth] = useState<ModuleHealth | undefined>(
    moduleId ? moduleHealthMonitor.getModuleHealth(moduleId) : undefined
  );
  
  const [allHealth, setAllHealth] = useState<Map<string, ModuleHealth>>(
    moduleHealthMonitor.getAllModuleHealth()
  );
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Subscribe to health updates
  useEffect(() => {
    // Initial load
    if (moduleId) {
      const moduleHealth = moduleHealthMonitor.getModuleHealth(moduleId);
      setHealth(moduleHealth);
    }
    
    setAllHealth(moduleHealthMonitor.getAllModuleHealth());
    setIsLoading(false);
    
    // Set up subscription
    let unsubscribe: (() => void) | undefined;
    
    if (moduleId) {
      unsubscribe = moduleHealthMonitor.subscribeToModuleHealth(moduleId, (updatedHealth) => {
        setHealth(updatedHealth);
      });
    }
    
    // Start monitoring if not already started
    moduleHealthMonitor.startMonitoring();
    
    // Set up auto-refresh
    let refreshTimer: NodeJS.Timeout | undefined;
    
    if (autoRefresh) {
      refreshTimer = setInterval(async () => {
        if (moduleId) {
          await moduleHealthMonitor.checkModuleHealth(moduleId);
        } else {
          await moduleHealthMonitor.checkAllModules();
        }
        
        setAllHealth(moduleHealthMonitor.getAllModuleHealth());
      }, refreshInterval);
    }
    
    // Clean up
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [moduleId, autoRefresh, refreshInterval]);
  
  // Calculate derived state
  const isHealthy = moduleId 
    ? health?.status === ModuleHealthStatus.HEALTHY
    : Array.from(allHealth.values()).every(h => h.status === ModuleHealthStatus.HEALTHY);
  
  const hasWarnings = moduleId
    ? health?.status === ModuleHealthStatus.WARNING
    : Array.from(allHealth.values()).some(h => h.status === ModuleHealthStatus.WARNING);
  
  const hasErrors = moduleId
    ? health?.status === ModuleHealthStatus.ERROR || health?.status === ModuleHealthStatus.FAILED
    : Array.from(allHealth.values()).some(h => 
        h.status === ModuleHealthStatus.ERROR || h.status === ModuleHealthStatus.FAILED
      );
  
  const modulesWithIssues = moduleHealthMonitor.getModulesWithIssues();
  const modulesWithCriticalIssues = moduleHealthMonitor.getModulesWithCriticalIssues();
  
  // Calculate status counts
  const statusCounts = {
    [ModuleHealthStatus.HEALTHY]: 0,
    [ModuleHealthStatus.WARNING]: 0,
    [ModuleHealthStatus.ERROR]: 0,
    [ModuleHealthStatus.FAILED]: 0,
    [ModuleHealthStatus.LOADING]: 0,
    [ModuleHealthStatus.DISABLED]: 0
  };
  
  allHealth.forEach(h => {
    statusCounts[h.status]++;
  });
  
  // Reload a module
  const reloadModule = async (id: string): Promise<boolean> => {
    return moduleHealthMonitor.reloadModule(id);
  };
  
  // Refresh health data
  const refreshHealth = async (): Promise<void> => {
    setIsLoading(true);
    
    if (moduleId) {
      await moduleHealthMonitor.checkModuleHealth(moduleId);
    } else {
      await moduleHealthMonitor.checkAllModules();
    }
    
    setAllHealth(moduleHealthMonitor.getAllModuleHealth());
    setIsLoading(false);
  };
  
  return {
    health,
    allHealth,
    isHealthy,
    hasWarnings,
    hasErrors,
    isLoading,
    reloadModule,
    refreshHealth,
    modulesWithIssues,
    modulesWithCriticalIssues,
    statusCounts
  };
};

export default useModuleHealth;