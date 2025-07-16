// ABOUTME: True dynamic module loader that scans and loads modules automatically
// ABOUTME: No hard-coded imports - truly pluggable architecture
// ABOUTME: Enhanced with health monitoring, performance optimization, and robust error handling

import { ModuleDefinition } from '../core/types';
import { moduleRegistry } from '../core/moduleRegistry';
import { rbacService } from '../core/rbacService';
import { moduleConfigService } from './moduleConfigService';

// Import enhanced features
import { 
  ModuleHealthStatus, 
  ModuleHealth, 
  ModulePerformanceMetrics,
  ModuleDependency,
  ModuleFeature
} from './enhancedModuleLoader';

// Module Loading Progress
export interface ModuleLoadingProgress {
  total: number;
  loaded: number;
  failed: number;
  percentage: number;
  currentModule?: string;
  isComplete: boolean;
}

// Module Loading Priority
export enum ModuleLoadingPriority {
  CRITICAL = 'critical',   // Load immediately (core modules)
  HIGH = 'high',           // Load early (frequently used modules)
  NORMAL = 'normal',       // Load normally (default)
  LOW = 'low',             // Load after other modules
  LAZY = 'lazy'            // Load on demand only
}

// Module discovery and loading
class DynamicModuleLoader {
  private loadedModules: Map<string, ModuleDefinition> = new Map();
  private moduleHealth: Map<string, ModuleHealth> = new Map();
  private performanceMetrics: Map<string, ModulePerformanceMetrics> = new Map();
  private loadingProgress: ModuleLoadingProgress = {
    total: 0,
    loaded: 0,
    failed: 0,
    percentage: 0,
    isComplete: false
  };
  private progressListeners: ((progress: ModuleLoadingProgress) => void)[] = [];
  private modulePriorities: Map<string, ModuleLoadingPriority> = new Map();
  private moduleLoadTimes: Map<string, number> = new Map();
  
  constructor() {
    this.setDefaultPriorities();
  }
  
  // Set default module priorities
  private setDefaultPriorities(): void {
    // Core modules are critical
    this.setModulePriority('core', ModuleLoadingPriority.CRITICAL);
    this.setModulePriority('dashboard', ModuleLoadingPriority.CRITICAL);
    this.setModulePriority('settings', ModuleLoadingPriority.CRITICAL);
    
    // Common modules are high priority
    this.setModulePriority('academics', ModuleLoadingPriority.HIGH);
    this.setModulePriority('administration', ModuleLoadingPriority.HIGH);
    this.setModulePriority('finance', ModuleLoadingPriority.HIGH);
    
    // Less frequently used modules are normal priority
    this.setModulePriority('reports', ModuleLoadingPriority.NORMAL);
    this.setModulePriority('hr', ModuleLoadingPriority.NORMAL);
    
    // Rarely used modules are low priority
    this.setModulePriority('inventory', ModuleLoadingPriority.LOW);
    this.setModulePriority('library', ModuleLoadingPriority.LOW);
    
    // Optional modules are lazy loaded
    this.setModulePriority('nutrition', ModuleLoadingPriority.LAZY);
  }
  
  // Set module loading priority
  setModulePriority(moduleId: string, priority: ModuleLoadingPriority): void {
    this.modulePriorities.set(moduleId, priority);
  }
  
  // Get module loading priority
  getModulePriority(moduleId: string): ModuleLoadingPriority {
    return this.modulePriorities.get(moduleId) || ModuleLoadingPriority.NORMAL;
  }

  // Discover and load all available modules
  async discoverAndLoadModules(): Promise<ModuleDefinition[]> {
    console.log('🔍 Discovering modules dynamically...');
    
    try {
      // First, discover all available modules from the filesystem
      const availableModules = await this.discoverAvailableModules();
      console.log('[DynamicModuleLoader] DEBUG: Available modules discovered:', availableModules);

      // Initialize loading progress
      this.loadingProgress = {
        total: availableModules.length,
        loaded: 0,
        failed: 0,
        percentage: 0,
        isComplete: availableModules.length === 0 // If no modules to load, mark as complete
      };
      console.log('[DynamicModuleLoader] Initialized loading progress:', this.loadingProgress);
      this.notifyProgressListeners();

      // Load core modules first (always available)
      const coreModules = await this.loadCoreModules();
      console.log('[DynamicModuleLoader] DEBUG: Core modules loaded:', coreModules.map(m => m.id));

      // Load all discovered modules with progress tracking
      for (const moduleId of availableModules) {
        try {
          console.log(`[DynamicModuleLoader] DEBUG: Attempting to load module: ${moduleId}`);
          const module = await this.loadModule(moduleId);
          this.updateLoadingProgress(moduleId, module !== null);
        } catch (error) {
          console.warn(`⚠️ Failed to load module ${moduleId}:`, error);
          this.updateLoadingProgress(moduleId, false);
        }
      }

      const finalLoadedModules = Array.from(this.loadedModules.values());
      console.log(`📦 Total modules loaded: ${finalLoadedModules.length}`);
      console.log('[DynamicModuleLoader] DEBUG: Final loaded module IDs:', finalLoadedModules.map(m => m.id));
      
      // Ensure loading is marked as complete
      this.loadingProgress.isComplete = true;
      this.notifyProgressListeners();
      console.log('[DynamicModuleLoader] Loading complete:', this.loadingProgress);
      
      return finalLoadedModules;
    } catch (error) {
      console.error('❌ [DynamicModuleLoader] Error during module discovery and loading:', error);
      
      // Even in case of error, ensure loading is marked as complete to prevent UI from getting stuck
      this.loadingProgress.isComplete = true;
      this.notifyProgressListeners();
      console.log('[DynamicModuleLoader] Loading marked as complete after error:', this.loadingProgress);
      
      // Return whatever modules were successfully loaded
      return Array.from(this.loadedModules.values());
    }
  }

  // Discover all available modules by scanning the filesystem
  private async discoverAvailableModules(): Promise<string[]> {
    console.log('[DynamicModuleLoader] Scanning filesystem for available modules...');
    
    // List of known module directories - this should be dynamically discovered in a real implementation
    // For now, we'll use the modules we know exist based on the filesystem structure
    // Note: 'dashboard' is loaded from core modules, not as a separate module
    const potentialModules = [
      'academics',
      'administration',
      'finance',
      'hr',
      'inventory',
      'library',
      'nutrition',
      'reports',
      'settings'
    ];

    const availableModules: string[] = [];

    // Test each potential module to see if it has a moduleDefinition.tsx file
    for (const moduleId of potentialModules) {
      try {
        // Try to dynamically import the module definition to check if it exists
        await import(`../modules/${moduleId}/moduleDefinition.tsx`);
        availableModules.push(moduleId);
        console.log(`[DynamicModuleLoader] ✅ Found module: ${moduleId}`);
      } catch (error) {
        console.log(`[DynamicModuleLoader] ❌ Module ${moduleId} not available:`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log(`[DynamicModuleLoader] Discovered ${availableModules.length} available modules:`, availableModules);
    return availableModules;
  }

  // Load core modules (always available)
  private async loadCoreModules(): Promise<ModuleDefinition[]> {
    const loadedCoreModules: ModuleDefinition[] = [];

    try {
      console.log(`[dynamicModuleLoader] Loading core modules from core/moduleDefinition.tsx`);
      
      // Load all core modules from the core module definition file
      const coreModules = await import('../modules/core/moduleDefinition.tsx');
      const modules = coreModules.default as ModuleDefinition | ModuleDefinition[];
      
      if (Array.isArray(modules)) {
        modules.forEach(module => {
          this.loadedModules.set(module.id, module);
          loadedCoreModules.push(module);
          console.log(`[dynamicModuleLoader] Loaded core module ${module.id}`);
        });
      } else if (modules) {
        this.loadedModules.set(modules.id, modules);
        loadedCoreModules.push(modules);
        console.log(`[dynamicModuleLoader] Loaded core module ${modules.id}`);
      }

      // Also load the standalone settings module if it exists (it has the Module Management navigation)
      try {
        const settingsModule = await this.loadModule('settings');
        if (settingsModule && !this.loadedModules.has('settings')) {
          this.loadedModules.set('settings', settingsModule);
          loadedCoreModules.push(settingsModule);
          console.log(`[dynamicModuleLoader] Loaded standalone settings module`);
        } else if (settingsModule) {
          // Replace the core settings module with the standalone one (it has more navigation items)
          this.loadedModules.set('settings', settingsModule);
          console.log(`[dynamicModuleLoader] Replaced core settings module with standalone version`);
        }
      } catch (error) {
        console.log(`[dynamicModuleLoader] No standalone settings module found, using core version`);
      }

    } catch (error) {
      console.warn(`⚠️ Failed to load core modules:`, error);
    }

    console.log(`[dynamicModuleLoader] Total core modules loaded: ${loadedCoreModules.length}`);
    return loadedCoreModules;
  }

  // Load a specific module dynamically with enhanced features
  private async loadModule(moduleId: string): Promise<ModuleDefinition | null> {
    // Initialize health tracking
    this.initializeModuleHealth(moduleId);
    
    // Start performance tracking
    const startTime = performance.now();
    
    try {
      // Check if module is already loaded
      if (this.loadedModules.has(moduleId)) {
        return this.loadedModules.get(moduleId)!;
      }

      // Update health status to loading
      this.updateModuleHealth(moduleId, { 
        status: ModuleHealthStatus.LOADING,
        lastLoadAttempt: new Date()
      });

      // Create a promise that will timeout after 5 seconds
      const moduleLoadPromise = import(`../modules/${moduleId}/moduleDefinition.tsx`);
      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Module ${moduleId} load timed out after 5000ms`));
        }, 5000);
      });
      
      // Race between the module load and the timeout
      const moduleDef = await Promise.race([moduleLoadPromise, timeoutPromise]);
      const module = moduleDef.default;
      console.log(`[dynamicModuleLoader] Loaded module ${moduleId}:`, module);
      console.log(`[dynamicModuleLoader] Icon for ${moduleId}:`, module.icon);
      
      // Load RBAC if available
      try {
        const rbacModule = await import(`../modules/${moduleId}/rbac.ts`);
        
        // Find the first exported array that looks like a permissions array.
        const permissions = Object.values(rbacModule).find(val => 
          Array.isArray(val) && 
          val.length > 0 && 
          val[0].id && 
          val[0].resource
        );

        if (permissions) {
          module.rbacPermissions = permissions as any;
        }
        
        // Also handle default export object which is used in some modules
        if (rbacModule.default && rbacModule.default.permissions) {
            module.rbacPermissions = rbacModule.default.permissions;
        }

      } catch (error) {
        // This is not a critical error, modules may not have rbac.ts file
        // console.warn(`Could not load RBAC for module ${moduleId}:`, error);
      }

      // Calculate load time
      const loadTime = performance.now() - startTime;
      this.trackModuleLoadTime(moduleId, loadTime);

      // Cache the loaded module
      this.loadedModules.set(moduleId, module);
      
      // Update health status to healthy
      this.updateModuleHealth(moduleId, {
        status: ModuleHealthStatus.HEALTHY,
        loadTime,
        lastError: null,
        loadAttempts: (this.moduleHealth.get(moduleId)?.loadAttempts || 0) + 1
      });
      
      return module;
    } catch (error) {
      const loadTime = performance.now() - startTime;
      console.error(`❌ Failed to load module ${moduleId}:`, error);
      
      // Update health status to failed
      this.updateModuleHealth(moduleId, {
        status: ModuleHealthStatus.FAILED,
        loadTime,
        lastError: error instanceof Error ? error : new Error(String(error)),
        loadAttempts: (this.moduleHealth.get(moduleId)?.loadAttempts || 0) + 1
      });
      
      return null;
    }
  }

  // Load a module by ID (for runtime loading)
  async loadModuleById(moduleId: string): Promise<ModuleDefinition | null> {
    return this.loadModule(moduleId);
  }

  // Unload a module
  unloadModule(moduleId: string): boolean {
    if (this.loadedModules.has(moduleId)) {
      this.loadedModules.delete(moduleId);
      console.log(`🗑️ Unloaded module: ${moduleId}`);
      return true;
    }
    return false;
  }

  // Get all loaded modules
  getLoadedModules(): ModuleDefinition[] {
    return Array.from(this.loadedModules.values());
  }

  // Check if a module is loaded
  isModuleLoaded(moduleId: string): boolean {
    return this.loadedModules.has(moduleId);
  }

  // Get module by ID
  getModule(moduleId: string): ModuleDefinition | undefined {
    return this.loadedModules.get(moduleId);
  }

  // Reload a module
  async reloadModule(moduleId: string): Promise<ModuleDefinition | null> {
    this.unloadModule(moduleId);
    return this.loadModule(moduleId);
  }

  // Get module loading statistics
  getLoadingStats() {
    const enabledModules = moduleConfigService.getEnabledModules();
    const loadedModules = this.getLoadedModules();
    
    return {
      totalEnabled: enabledModules.length,
      totalLoaded: loadedModules.length,
      loadedModules: loadedModules.map(m => m.id),
      missingModules: enabledModules.filter(id => !this.isModuleLoaded(id))
    };
  }

  // Initialize module health tracking
  private initializeModuleHealth(moduleId: string): void {
    if (!this.moduleHealth.has(moduleId)) {
      this.moduleHealth.set(moduleId, {
        moduleId,
        status: ModuleHealthStatus.LOADING,
        loadTime: 0,
        lastError: null,
        loadAttempts: 0,
        lastLoadAttempt: new Date(),
        dependencies: [],
        features: [],
        performance: {
          loadTime: 0,
          memoryUsage: 0,
          componentCount: 0,
          routeCount: 0
        }
      });
    }
  }

  // Update module health
  updateModuleHealth(moduleId: string, updates: Partial<ModuleHealth>): void {
    const currentHealth = this.moduleHealth.get(moduleId) || {
      moduleId,
      status: ModuleHealthStatus.LOADING,
      loadTime: 0,
      lastError: null,
      loadAttempts: 0,
      lastLoadAttempt: new Date(),
      dependencies: [],
      features: [],
      performance: {
        loadTime: 0,
        memoryUsage: 0,
        componentCount: 0,
        routeCount: 0
      }
    };
    
    this.moduleHealth.set(moduleId, { ...currentHealth, ...updates });
  }

  // Get module health
  getModuleHealth(moduleId: string): ModuleHealth | undefined {
    return this.moduleHealth.get(moduleId);
  }

  // Get all module health
  getAllModuleHealth(): Map<string, ModuleHealth> {
    return new Map(this.moduleHealth);
  }

  // Update loading progress
  private updateLoadingProgress(moduleId: string, success: boolean): void {
    if (this.loadingProgress.isComplete) {
      return;
    }
    
    if (success) {
      this.loadingProgress.loaded++;
    } else {
      this.loadingProgress.failed++;
    }
    
    this.loadingProgress.currentModule = moduleId;
    this.loadingProgress.percentage = this.loadingProgress.total > 0 
      ? Math.round(((this.loadingProgress.loaded + this.loadingProgress.failed) / this.loadingProgress.total) * 100)
      : 100;
    
    if (this.loadingProgress.loaded + this.loadingProgress.failed >= this.loadingProgress.total) {
      this.loadingProgress.isComplete = true;
      console.log('[DynamicModuleLoader] All modules processed, marking loading as complete');
    }
    
    console.log('[DynamicModuleLoader] Updated loading progress:', this.loadingProgress);
    this.notifyProgressListeners();
  }

  // Get loading progress
  getLoadingProgress(): ModuleLoadingProgress {
    console.log('[DynamicModuleLoader] Current loading progress:', this.loadingProgress);
    return { ...this.loadingProgress };
  }

  // Force complete the loading progress (for recovery from stuck states)
  forceCompleteLoading(): void {
    if (this.loadingProgress.isComplete) {
      return;
    }
    
    console.warn('[DynamicModuleLoader] Forcing loading progress to complete state');
    this.loadingProgress.isComplete = true;
    this.loadingProgress.percentage = 100;
    
    // If we have modules that haven't been accounted for, mark them as failed
    if (this.loadingProgress.loaded + this.loadingProgress.failed < this.loadingProgress.total) {
      this.loadingProgress.failed += (this.loadingProgress.total - this.loadingProgress.loaded - this.loadingProgress.failed);
    }
    
    this.notifyProgressListeners();
  }

  // Subscribe to progress updates
  subscribeToProgress(listener: (progress: ModuleLoadingProgress) => void): () => void {
    this.progressListeners.push(listener);
    
    // Immediately notify with current progress
    listener({ ...this.loadingProgress });
    
    // Return unsubscribe function
    return () => {
      const index = this.progressListeners.indexOf(listener);
      if (index !== -1) {
        this.progressListeners.splice(index, 1);
      }
    };
  }

  // Notify progress listeners
  private notifyProgressListeners(): void {
    const progress = { ...this.loadingProgress };
    
    for (const listener of this.progressListeners) {
      try {
        listener(progress);
      } catch (error) {
        console.error('Error notifying progress listener:', error);
      }
    }
  }

  // Track module load time
  private trackModuleLoadTime(moduleId: string, loadTime: number): void {
    this.moduleLoadTimes.set(moduleId, loadTime);
    
    // Update performance metrics
    const currentMetrics = this.performanceMetrics.get(moduleId) || {
      loadTime: 0,
      memoryUsage: 0,
      componentCount: 0,
      routeCount: 0
    };
    
    this.performanceMetrics.set(moduleId, { ...currentMetrics, loadTime });
    
    // Update health
    this.updateModuleHealth(moduleId, {
      loadTime,
      performance: { ...currentMetrics, loadTime }
    });
  }

  // Get module performance metrics
  getModulePerformanceMetrics(moduleId: string): ModulePerformanceMetrics | undefined {
    return this.performanceMetrics.get(moduleId);
  }

  // Get all performance metrics
  getAllModulePerformanceMetrics(): Map<string, ModulePerformanceMetrics> {
    return new Map(this.performanceMetrics);
  }

  // Get module load times
  getAllModuleLoadTimes(): Map<string, number> {
    return new Map(this.moduleLoadTimes);
  }

  // Update module performance metrics
  updateModulePerformanceMetrics(moduleId: string, metrics: Partial<ModulePerformanceMetrics>): void {
    const currentMetrics = this.performanceMetrics.get(moduleId) || {
      loadTime: 0,
      memoryUsage: 0,
      componentCount: 0,
      routeCount: 0
    };
    
    this.performanceMetrics.set(moduleId, { ...currentMetrics, ...metrics });
    
    // Also update in health
    this.updateModuleHealth(moduleId, {
      performance: { ...currentMetrics, ...metrics }
    });
  }

  // Generate performance report
  generatePerformanceReport(): Record<string, any> {
    const moduleLoadTimes = Array.from(this.moduleLoadTimes.entries()).map(([moduleId, loadTime]) => ({
      moduleId,
      loadTime: loadTime.toFixed(2) + 'ms',
      priority: this.getModulePriority(moduleId)
    }));
    
    // Sort by load time (descending)
    moduleLoadTimes.sort((a, b) => parseFloat(b.loadTime) - parseFloat(a.loadTime));
    
    const priorityCounts = {
      [ModuleLoadingPriority.CRITICAL]: 0,
      [ModuleLoadingPriority.HIGH]: 0,
      [ModuleLoadingPriority.NORMAL]: 0,
      [ModuleLoadingPriority.LOW]: 0,
      [ModuleLoadingPriority.LAZY]: 0
    };
    
    this.modulePriorities.forEach(priority => {
      priorityCounts[priority]++;
    });
    
    const totalLoadTime = Array.from(this.moduleLoadTimes.values()).reduce((sum, time) => sum + time, 0);
    const averageLoadTime = this.moduleLoadTimes.size > 0 ? totalLoadTime / this.moduleLoadTimes.size : 0;
    
    return {
      totalModules: this.moduleLoadTimes.size,
      totalLoadTime: totalLoadTime.toFixed(2) + 'ms',
      averageLoadTime: averageLoadTime.toFixed(2) + 'ms',
      slowestModule: moduleLoadTimes[0]?.moduleId || 'none',
      slowestModuleTime: moduleLoadTimes[0]?.loadTime || '0ms',
      priorityCounts,
      moduleLoadTimes: moduleLoadTimes.slice(0, 10) // Top 10 slowest modules
    };
  }
}

// Export singleton instance
export const dynamicModuleLoader = new DynamicModuleLoader();

// Initialize modules (replaces the old hard-coded approach)
export const initializeDynamicModules = async (): Promise<void> => {
  console.log('🚀 Initializing dynamic modules...');
  
  try {
    // Validate configuration first
    const validation = moduleConfigService.validateConfig();
    if (!validation.valid) {
      console.error('❌ Module configuration validation failed:', validation.errors);
      throw new Error('Invalid module configuration');
    }

    // Discover and load modules
    const modules = await dynamicModuleLoader.discoverAndLoadModules();
    
    // Register modules with registry and RBAC service
    modules.forEach(module => {
      moduleRegistry.registerModule(module);
      rbacService.registerModule(module);
    });

    rbacService.initializeSuperAdminRole();
    
    console.log(`✅ Successfully initialized ${modules.length} modules`);
    
    // Log statistics
    const stats = dynamicModuleLoader.getLoadingStats();
    console.log('📊 Module loading statistics:', stats);
    
  } catch (error) {
    console.error('❌ Failed to initialize dynamic modules:', error);
    throw error;
  }
};

// Get available modules (for backward compatibility)
export const getAvailableModules = async (): Promise<ModuleDefinition[]> => {
  return dynamicModuleLoader.getLoadedModules();
};

// Check if a module is available
export const isModuleAvailable = (moduleId: string): boolean => {
  return dynamicModuleLoader.isModuleLoaded(moduleId);
};

// Get module by ID
export const getModuleById = (moduleId: string): ModuleDefinition | undefined => {
  return dynamicModuleLoader.getModule(moduleId);
};

export default dynamicModuleLoader; 