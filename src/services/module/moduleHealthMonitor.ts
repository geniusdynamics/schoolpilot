// Module Health Monitoring System
// Provides real-time monitoring, status tracking, and recovery capabilities for modules

import { ModuleHealth, ModuleHealthStatus } from './enhancedModuleLoader';
import { dynamicModuleLoader } from './dynamicModuleLoader';
import { ModuleDefinition } from '../../core/types';
import { moduleRegistry } from '../../core/moduleRegistry';

// Health Check Result
export interface HealthCheckResult {
  passed: boolean;
  message: string;
  details?: any;
}

// Module Health Check
export interface ModuleHealthCheck {
  name: string;
  description: string;
  run(moduleId: string, module: ModuleDefinition): Promise<HealthCheckResult>;
  severity: 'critical' | 'warning' | 'info';
  category: 'dependencies' | 'performance' | 'functionality' | 'resources';
}

// Module Health Monitor
export class ModuleHealthMonitor {
  private healthChecks: ModuleHealthCheck[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, ((health: ModuleHealth) => void)[]> = new Map();
  private checkInProgress: boolean = false;
  private moduleHealthMap: Map<string, ModuleHealth> = new Map();
  
  // Configuration
  private readonly DEFAULT_CHECK_INTERVAL = 60000; // 1 minute
  private readonly CRITICAL_CHECK_INTERVAL = 15000; // 15 seconds for modules with issues
  
  constructor() {
    this.registerDefaultHealthChecks();
  }
  
  // Register default health checks
  private registerDefaultHealthChecks(): void {
    this.registerHealthCheck({
      name: 'dependency-check',
      description: 'Checks if all required module dependencies are available and compatible',
      severity: 'critical',
      category: 'dependencies',
      async run(moduleId: string, module: ModuleDefinition): Promise<HealthCheckResult> {
        if (!module.dependencies || module.dependencies.length === 0) {
          return { passed: true, message: 'No dependencies to check' };
        }
        
        const missingDeps: string[] = [];
        const versionMismatchDeps: string[] = [];
        
        for (const dep of module.dependencies) {
          const depId = typeof dep === 'string' ? dep : dep.moduleId;
          const required = typeof dep === 'string' ? true : dep.required !== false;
          const version = typeof dep === 'string' ? undefined : dep.version;
          
          const depModule = moduleRegistry.getMetadata(depId);
          
          if (!depModule) {
            if (required) {
              missingDeps.push(depId);
            }
            continue;
          }
          
          if (version && depModule.version !== version) {
            versionMismatchDeps.push(`${depId} (expected: ${version}, found: ${depModule.version})`);
          }
        }
        
        if (missingDeps.length > 0 || versionMismatchDeps.length > 0) {
          return {
            passed: false,
            message: 'Dependency issues detected',
            details: {
              missing: missingDeps,
              versionMismatch: versionMismatchDeps
            }
          };
        }
        
        return { passed: true, message: 'All dependencies satisfied' };
      }
    });
    
    this.registerHealthCheck({
      name: 'route-check',
      description: 'Checks if module routes are properly defined and accessible',
      severity: 'warning',
      category: 'functionality',
      async run(moduleId: string, module: ModuleDefinition): Promise<HealthCheckResult> {
        if (!module.routes || module.routes.length === 0) {
          return { passed: true, message: 'No routes to check' };
        }
        
        const invalidRoutes: string[] = [];
        
        for (const route of module.routes) {
          if (!route.path || !route.page) {
            invalidRoutes.push(JSON.stringify(route));
          }
        }
        
        if (invalidRoutes.length > 0) {
          return {
            passed: false,
            message: 'Invalid routes detected',
            details: { invalidRoutes }
          };
        }
        
        return { passed: true, message: 'All routes valid' };
      }
    });
    
    this.registerHealthCheck({
      name: 'navigation-check',
      description: 'Checks if module navigation is properly defined',
      severity: 'warning',
      category: 'functionality',
      async run(moduleId: string, module: ModuleDefinition): Promise<HealthCheckResult> {
        if (!module.navigation) {
          return {
            passed: false,
            message: 'Navigation not defined',
            details: { moduleId }
          };
        }
        
        return { passed: true, message: 'Navigation properly defined' };
      }
    });
    
    this.registerHealthCheck({
      name: 'performance-check',
      description: 'Checks module performance metrics',
      severity: 'info',
      category: 'performance',
      async run(moduleId: string, module: ModuleDefinition): Promise<HealthCheckResult> {
        // Performance metrics are not available in the simplified loader
        // This is a placeholder for future implementation
        const metrics = null;
        
        if (!metrics) {
          return {
            passed: true,
            message: 'No performance metrics available',
            details: { moduleId }
          };
        }
        
        const issues: string[] = [];
        
        if (metrics.loadTime > 1000) {
          issues.push(`Load time (${metrics.loadTime.toFixed(2)}ms) exceeds 1000ms`);
        }
        
        if (metrics.memoryUsage > 10000000) { // 10MB
          issues.push(`Memory usage (${(metrics.memoryUsage / 1000000).toFixed(2)}MB) exceeds 10MB`);
        }
        
        if (issues.length > 0) {
          return {
            passed: false,
            message: 'Performance issues detected',
            details: { issues, metrics }
          };
        }
        
        return {
          passed: true,
          message: 'Performance metrics within acceptable ranges',
          details: metrics
        };
      }
    });
  }
  
  // Register a new health check
  registerHealthCheck(check: ModuleHealthCheck): void {
    this.healthChecks.push(check);
  }
  
  // Start monitoring
  startMonitoring(interval: number = this.DEFAULT_CHECK_INTERVAL): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }
    
    console.log(`🔍 [ModuleHealthMonitor] Starting module health monitoring (interval: ${interval}ms)`);
    
    this.monitoringInterval = setInterval(() => {
      this.checkAllModules();
    }, interval);
    
    // Run initial check
    this.checkAllModules();
  }
  
  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 [ModuleHealthMonitor] Module health monitoring stopped');
    }
  }
  
  // Check health of all modules
  async checkAllModules(): Promise<void> {
    if (this.checkInProgress) {
      return;
    }
    
    this.checkInProgress = true;
    
    try {
      const modules = moduleRegistry.getAllMetadata();
      
      for (const module of modules) {
        await this.checkModuleHealth(module.id);
      }
      
      console.log(`✅ [ModuleHealthMonitor] Completed health check for ${modules.length} modules`);
    } catch (error) {
      console.error('❌ [ModuleHealthMonitor] Error during health check:', error);
    } finally {
      this.checkInProgress = false;
    }
  }
  
  // Check health of a specific module
  async checkModuleHealth(moduleId: string): Promise<ModuleHealth | null> {
    console.log(`🔍 [ModuleHealthMonitor] Checking health of module: ${moduleId}`);
    
    const module = moduleRegistry.getMetadata(moduleId);
    
    if (!module) {
      console.warn(`⚠️ [ModuleHealthMonitor] Module not found: ${moduleId}`);
      return null;
    }
    
    // Get current health status or create initial health data
    let health = this.getModuleHealth(moduleId);
    
    if (!health) {
      // Create initial health data for the module
      health = {
        moduleId,
        status: ModuleHealthStatus.HEALTHY,
        lastChecked: new Date(),
        issues: [],
        checkResults: {}
      };
      this.updateModuleHealth(moduleId, health);
    }
    
    // Run all health checks
    const checkResults: Record<string, HealthCheckResult> = {};
    let criticalIssues = 0;
    let warningIssues = 0;
    
    for (const check of this.healthChecks) {
      try {
        const result = await check.run(moduleId, module);
        checkResults[check.name] = result;
        
        if (!result.passed) {
          if (check.severity === 'critical') {
            criticalIssues++;
          } else if (check.severity === 'warning') {
            warningIssues++;
          }
        }
      } catch (error) {
        console.error(`❌ [ModuleHealthMonitor] Error running health check ${check.name} for module ${moduleId}:`, error);
        checkResults[check.name] = {
          passed: false,
          message: `Error running check: ${error instanceof Error ? error.message : String(error)}`
        };
        
        if (check.severity === 'critical') {
          criticalIssues++;
        } else if (check.severity === 'warning') {
          warningIssues++;
        }
      }
    }
    
    // Determine overall health status
    let newStatus = ModuleHealthStatus.HEALTHY;
    
    if (criticalIssues > 0) {
      newStatus = ModuleHealthStatus.ERROR;
    } else if (warningIssues > 0) {
      newStatus = ModuleHealthStatus.WARNING;
    }
    
    // Update health status
    const updatedHealth = {
      ...health,
      status: newStatus,
      lastChecked: new Date(),
      checkResults
    };
    
    // Update in internal storage
    this.updateModuleHealth(moduleId, updatedHealth);
    
    // Notify listeners
    this.notifyListeners(moduleId, updatedHealth);
    
    return updatedHealth;
  }
  
  // Subscribe to health updates for a specific module
  subscribeToModuleHealth(moduleId: string, listener: (health: ModuleHealth) => void): () => void {
    if (!this.listeners.has(moduleId)) {
      this.listeners.set(moduleId, []);
    }
    
    this.listeners.get(moduleId)!.push(listener);
    
    // Return unsubscribe function
    return () => {
      const moduleListeners = this.listeners.get(moduleId);
      
      if (moduleListeners) {
        const index = moduleListeners.indexOf(listener);
        
        if (index !== -1) {
          moduleListeners.splice(index, 1);
        }
      }
    };
  }
  
  // Notify listeners of health updates
  private notifyListeners(moduleId: string, health: ModuleHealth): void {
    const moduleListeners = this.listeners.get(moduleId);
    
    if (moduleListeners) {
      for (const listener of moduleListeners) {
        try {
          listener(health);
        } catch (error) {
          console.error(`❌ [ModuleHealthMonitor] Error notifying listener for module ${moduleId}:`, error);
        }
      }
    }
  }
  
  // Get health status of all modules
  getAllModuleHealth(): Map<string, ModuleHealth> {
    return this.moduleHealthMap;
  }
  
  // Get health status of a specific module
  getModuleHealth(moduleId: string): ModuleHealth | undefined {
    return this.moduleHealthMap.get(moduleId);
  }
  
  // Update health status of a module
  updateModuleHealth(moduleId: string, health: ModuleHealth): void {
    this.moduleHealthMap.set(moduleId, health);
  }
  
  // Attempt to reload a failed module
  async reloadModule(moduleId: string): Promise<boolean> {
    console.log(`🔄 [ModuleHealthMonitor] Attempting to reload module: ${moduleId}`);
    
    try {
      // For now, we'll just reset the health status and re-check
      // In a full implementation, this would actually reload the module
      console.log(`⚠️ [ModuleHealthMonitor] Module reload not implemented in simplified loader, resetting health status`);
      
      // Reset health status to trigger a fresh check
      const currentHealth = this.getModuleHealth(moduleId);
      if (currentHealth) {
        const resetHealth = {
          ...currentHealth,
          status: ModuleHealthStatus.LOADING,
          lastChecked: new Date(),
          checkResults: {}
        };
        this.updateModuleHealth(moduleId, resetHealth);
      }
      
      // Check health after reset
      await this.checkModuleHealth(moduleId);
      
      console.log(`✅ [ModuleHealthMonitor] Reset health status for module: ${moduleId}`);
      return true;
    } catch (error) {
      console.error(`❌ [ModuleHealthMonitor] Error resetting module health ${moduleId}:`, error);
      return false;
    }
  }
  
  // Check if a module is healthy
  isModuleHealthy(moduleId: string): boolean {
    const health = this.getModuleHealth(moduleId);
    return health?.status === ModuleHealthStatus.HEALTHY;
  }
  
  // Get modules with issues
  getModulesWithIssues(): ModuleHealth[] {
    const allHealth = this.getAllModuleHealth();
    const modulesWithIssues: ModuleHealth[] = [];
    
    allHealth.forEach(health => {
      if (health.status === ModuleHealthStatus.ERROR || health.status === ModuleHealthStatus.WARNING) {
        modulesWithIssues.push(health);
      }
    });
    
    return modulesWithIssues;
  }
  
  // Get modules with critical issues
  getModulesWithCriticalIssues(): ModuleHealth[] {
    const allHealth = this.getAllModuleHealth();
    const modulesWithCriticalIssues: ModuleHealth[] = [];
    
    allHealth.forEach(health => {
      if (health.status === ModuleHealthStatus.ERROR) {
        modulesWithCriticalIssues.push(health);
      }
    });
    
    return modulesWithCriticalIssues;
  }
}

// Export singleton instance
export const moduleHealthMonitor = new ModuleHealthMonitor();

// Export default for direct import
export default moduleHealthMonitor;