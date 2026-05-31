import type { ModuleMetadata, LoadedModule } from '@/core/types/module';
import { moduleRegistry } from './moduleRegistry';
import { moduleLifecycle } from './ModuleLifecycle';
import { EventEmitter } from 'events';

export interface LoadModuleOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  autoEnable?: boolean;
}

export interface LoadedModuleResult {
  moduleId: string;
  metadata: ModuleMetadata;
  success: boolean;
  error?: Error;
  loadTime: number;
}

export interface ModuleChunk {
  url: string;
  size: number;
  loaded: boolean;
  error?: Error;
}

export type ModuleLoadStatus = 'idle' | 'loading' | 'loaded' | 'error' | 'unloading';

export interface ModuleLoadState {
  moduleId: string;
  status: ModuleLoadStatus;
  progress: number;
  chunks: ModuleChunk[];
  error?: Error;
  loadedAt?: Date;
}

/**
 * Dynamically loads modules at runtime.
 * Supports lazy loading, code splitting, and hot module replacement.
 */
export class ModuleLoader extends EventEmitter {
  private loadStates = new Map<string, ModuleLoadState>();
  private loadedModules = new Map<string, LoadedModule>();
  private moduleFactories = new Map<string, () => Promise<LoadedModule>>();
  private options: Required<LoadModuleOptions>;

  // Event types
  static readonly MODULE_LOADING = 'module:loading';
  static readonly MODULE_LOADED = 'module:loaded';
  static readonly MODULE_ERROR = 'module:error';
  static readonly MODULE_UNLOADING = 'module:unloading';
  static readonly MODULE_UNLOADED = 'module:unloaded';
  static readonly PROGRESS_UPDATE = 'module:progress';

  constructor(options: LoadModuleOptions = {}) {
    super();
    this.options = {
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
      autoEnable: true,
      ...options
    };
  }

  /**
   * Register a module factory for dynamic loading
   */
  registerFactory(moduleId: string, factory: () => Promise<LoadedModule>): void {
    this.moduleFactories.set(moduleId, factory);
  }

  /**
   * Check if a module can be dynamically loaded
   */
  canLoad(moduleId: string): boolean {
    return this.moduleFactories.has(moduleId);
  }

  /**
   * Load a module dynamically
   */
  async load(moduleId: string, options: Partial<LoadModuleOptions> = {}): Promise<LoadedModuleResult> {
    const opts = { ...this.options, ...options };
    
    // Check if already loaded
    if (this.loadedModules.has(moduleId)) {
      return {
        moduleId,
        metadata: this.loadedModules.get(moduleId)!.metadata,
        success: true,
        loadTime: 0
      };
    }

    // Check if factory exists
    const factory = this.moduleFactories.get(moduleId);
    if (!factory) {
      const error = new Error(`No factory registered for module "${moduleId}"`);
      return {
        moduleId,
        metadata: {} as ModuleMetadata,
        success: false,
        error,
        loadTime: 0
      };
    }

    // Check if loading - if so, create a new promise that waits for completion
    const currentState = this.loadStates.get(moduleId);
    if (currentState?.status === 'loading') {
      // Return a promise that waits for the load to complete
      return this.waitForLoad(moduleId, opts.timeout);
    }

    // Start loading
    const startTime = Date.now();
    this.setLoadState(moduleId, { status: 'loading', progress: 0 });
    this.emit(ModuleLoader.MODULE_LOADING, { moduleId });

    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < opts.retryCount; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(opts.retryDelay * attempt);
        }

        const loadedModule = await this.loadWithTimeout(factory, opts.timeout);
        
        // Store loaded module
        this.loadedModules.set(moduleId, loadedModule);
        
        // Register with module registry — handle already-registered modules gracefully
        if (!moduleRegistry.isRegistered(moduleId)) {
          await moduleRegistry.register(loadedModule);
        }
        
        if (opts.autoEnable) {
          await moduleRegistry.enable(moduleId);
        }

        const loadTime = Date.now() - startTime;
        
        this.setLoadState(moduleId, { 
          status: 'loaded', 
          progress: 100,
          loadedAt: new Date()
        });
        
        this.emit(ModuleLoader.MODULE_LOADED, { moduleId, loadTime });

        return {
          moduleId,
          metadata: loadedModule.metadata,
          success: true,
          loadTime
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.updateProgress(moduleId, (attempt + 1) / opts.retryCount * 50);
      }
    }

    // All retries failed
    this.setLoadState(moduleId, { status: 'error', progress: 0, error: lastError });
    this.emit(ModuleLoader.MODULE_ERROR, { moduleId, error: lastError });

    return {
      moduleId,
      metadata: {} as ModuleMetadata,
      success: false,
      error: lastError,
      loadTime: Date.now() - startTime
    };
  }

  /**
   * Unload a dynamically loaded module
   */
  async unload(moduleId: string): Promise<boolean> {
    if (!this.loadedModules.has(moduleId)) {
      return false;
    }

    this.setLoadState(moduleId, { status: 'unloading', progress: 0 });
    this.emit(ModuleLoader.MODULE_UNLOADING, { moduleId });

    try {
      // Disable and unregister from module registry
      if (moduleRegistry.isEnabled(moduleId)) {
        await moduleRegistry.disable(moduleId);
      }
      
      if (moduleRegistry.isRegistered(moduleId)) {
        await moduleRegistry.unregister(moduleId);
      }

      // Clean up
      this.loadedModules.delete(moduleId);
      this.loadStates.delete(moduleId);

      this.emit(ModuleLoader.MODULE_UNLOADED, { moduleId });
      
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.setLoadState(moduleId, { status: 'error', progress: 0, error: err });
      this.emit(ModuleLoader.MODULE_ERROR, { moduleId, error: err });
      return false;
    }
  }

  /**
   * Load multiple modules in parallel
   */
  async loadBatch(moduleIds: string[], options: Partial<LoadModuleOptions> = {}): Promise<LoadedModuleResult[]> {
    const results = await Promise.all(
      moduleIds.map(id => this.load(id, options))
    );
    return results;
  }

  /**
   * Load modules in dependency order
   */
  async loadOrdered(moduleIds: string[], options: Partial<LoadModuleOptions> = {}): Promise<LoadedModuleResult[]> {
    const results: LoadedModuleResult[] = [];
    
    for (const moduleId of moduleIds) {
      const result = await this.load(moduleId, options);
      results.push(result);
      
      if (!result.success) {
        // Stop loading if a module fails
        break;
      }
    }
    
    return results;
  }

  /**
   * Preload a module (load without enabling)
   */
  async preload(moduleId: string): Promise<boolean> {
    const result = await this.load(moduleId, { autoEnable: false });
    return result.success;
  }

  /**
   * Check if a module is loaded
   */
  isLoaded(moduleId: string): boolean {
    return this.loadedModules.has(moduleId);
  }

  /**
   * Get load state for a module
   */
  getLoadState(moduleId: string): ModuleLoadState | undefined {
    return this.loadStates.get(moduleId);
  }

  /**
   * Get all loaded modules
   */
  getLoadedModules(): string[] {
    return Array.from(this.loadedModules.keys());
  }

  /**
   * Get loading progress for a module
   */
  getProgress(moduleId: string): number {
    return this.loadStates.get(moduleId)?.progress || 0;
  }

  /**
   * Check if module dependencies are satisfied
   */
  checkModuleDependencies(moduleId: string): { satisfied: boolean; missing: string[] } {
    const loadedModule = this.loadedModules.get(moduleId);
    if (!loadedModule) {
      return { satisfied: false, missing: ['Module not loaded'] };
    }

    const dependencies = loadedModule.metadata.dependencies || [];
    const missing: string[] = [];

    for (const dep of dependencies) {
      if (!dep.required) continue;
      if (!this.isLoaded(dep.moduleId)) {
        missing.push(dep.moduleId);
      }
    }

    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  /**
   * Get all enabled modules
   */
  getEnabledModules(): string[] {
    return Array.from(this.loadedModules.keys()).filter(id => 
      this.loadStates.get(id)?.status === 'loaded'
    );
  }

  /**
   * Wait for a module to finish loading
   */
  private waitForLoad(moduleId: string, timeout: number): Promise<LoadedModuleResult> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const state = this.loadStates.get(moduleId);
        
        if (state?.status === 'loaded') {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve({
            moduleId,
            metadata: this.loadedModules.get(moduleId)!.metadata,
            success: true,
            loadTime: 0
          });
        } else if (state?.status === 'error') {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve({
            moduleId,
            metadata: {} as ModuleMetadata,
            success: false,
            error: state.error,
            loadTime: 0
          });
        }
      }, 100);

      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Timeout waiting for module "${moduleId}" to load`));
      }, timeout);
    });
  }

  /**
   * Load with timeout
   */
  private async loadWithTimeout<T>(
    factory: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      factory(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Load timeout')), timeout);
      })
    ]);
  }

  /**
   * Set load state
   */
  private setLoadState(
    moduleId: string,
    partial: Partial<ModuleLoadState>
  ): void {
    const existing = this.loadStates.get(moduleId);
    const newState: ModuleLoadState = {
      moduleId,
      status: partial.status || existing?.status || 'idle',
      progress: partial.progress ?? existing?.progress ?? 0,
      chunks: partial.chunks || existing?.chunks || [],
      error: partial.error,
      loadedAt: partial.loadedAt
    };
    this.loadStates.set(moduleId, newState);
  }

  /**
   * Update progress
   */
  private updateProgress(moduleId: string, progress: number): void {
    const state = this.loadStates.get(moduleId);
    if (state) {
      state.progress = Math.min(100, Math.max(0, progress));
      this.emit(ModuleLoader.PROGRESS_UPDATE, { moduleId, progress: state.progress });
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all loaded modules
   */
  async clear(): Promise<void> {
    const moduleIds = Array.from(this.loadedModules.keys());
    for (const moduleId of moduleIds) {
      await this.unload(moduleId);
    }
    this.moduleFactories.clear();
  }
}

// Singleton instance
export const moduleLoader = new ModuleLoader();

// Standalone export functions for convenience
export function checkModuleDependencies(moduleId: string): { satisfied: boolean; missing: string[] } {
  return moduleLoader.checkModuleDependencies(moduleId);
}

export function getEnabledModules(): string[] {
  // Prefer moduleRegistry (the source of truth), fall back to moduleLoader
  const registryModules = moduleRegistry.getEnabledModules().filter(Boolean);
  if (registryModules.length > 0) {
    return registryModules;
  }
  return moduleLoader.getEnabledModules().filter(Boolean);
}

export function isModuleEnabled(moduleId: string): boolean {
  // Check moduleRegistry first (source of truth), fall back to moduleLoader
  if (moduleRegistry.isRegistered(moduleId)) {
    return moduleRegistry.isEnabled(moduleId);
  }
  return moduleLoader.isLoaded(moduleId);
}

export async function enableModule(moduleId: string): Promise<boolean> {
  const result = await moduleLoader.load(moduleId, { autoEnable: true });
  return result.success;
}

export async function disableModule(moduleId: string): Promise<boolean> {
  return moduleLoader.unload(moduleId);
}

export function getDynamicNavigationItems(): Array<{ id: string; name: string; path: string; icon?: string; isGroup?: boolean; children?: any[] }> {
  try {
    // Use moduleRegistry as the primary source of truth for enabled modules,
    // with moduleLoader as a fallback. This handles the case where modules are
    // registered directly with the registry (e.g., via registerAllModules())
    // but not loaded through the factory system.
    const registryEnabledModules = moduleRegistry.getEnabledModules().filter(Boolean);
    const loaderEnabledModules = moduleLoader.getEnabledModules().filter(Boolean);

    // Prefer registry, fall back to loader
    const enabledModules = registryEnabledModules.length > 0
      ? registryEnabledModules
      : loaderEnabledModules;

    const navigationItems: any[] = [];

    // Get navigation from each enabled module's metadata
    // Dashboard is excluded — it's a static page, not a module
    for (const moduleId of enabledModules) {
      if (!moduleId || moduleId === 'dashboard') continue;

      const metadata = moduleRegistry.getMetadata(moduleId);
      if (metadata) {
        // Create a group item for the module
        const moduleGroup: any = {
          id: moduleId,
          name: metadata.name || moduleId.charAt(0).toUpperCase() + moduleId.slice(1),
          path: metadata.path || `/${moduleId}`,
          modulePath: metadata.path || `/${moduleId}`,
          icon: metadata.icon,
          isGroup: true,
          children: []
        };

        // Add the module's navigation items as children with null checks
        if (metadata.navigation && Array.isArray(metadata.navigation)) {
          moduleGroup.children = metadata.navigation
            .filter((item: any) => item != null) // Filter out null/undefined items
            .map((item: any) => ({
              ...item,
              id: item.id || `${moduleId}-${item.path || 'unknown'}`,
              modulePath: metadata.path || `/${moduleId}`,
              name: item.name || 'Unknown',
              deprecated: item.deprecated || false,
              redirectTo: item.redirectTo,
              showInModes: item.showInModes,
            }));
        }

        navigationItems.push(moduleGroup);
      } else {
        // Fallback to basic navigation if metadata not found
        navigationItems.push({
          id: moduleId,
          name: moduleId.charAt(0).toUpperCase() + moduleId.slice(1),
          path: `/${moduleId}`,
          isGroup: true,
          children: []
        });
      }
    }

    return navigationItems;
  } catch (error) {
    console.error('[getDynamicNavigationItems] Error:', error);
    return []; // Return empty array on error
  }
}

/**
 * Initialize all modules
 * Loads all registered module factories and enables them
 */
export async function initializeModules(): Promise<void> {
  const moduleIds = Array.from(moduleLoader['moduleFactories'].keys());
  
  logger.debug(`[initializeModules] Found ${moduleIds.length} registered factories:`, moduleIds);
  
  if (moduleIds.length === 0) {
    // No factories registered yet, try to use moduleRegistry
    logger.warn('[initializeModules] No module factories registered, using registry fallback');
    await moduleRegistry.initialize();
    return;
  }
  
  // Load all modules in dependency order
  logger.debug('[initializeModules] Loading modules in dependency order...');
  const results = await moduleLoader.loadOrdered(moduleIds, { autoEnable: true });
  
  // Log results
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  logger.debug(`[initializeModules] Loaded ${successCount} modules via loader, ${failCount} failed`);
  
  // Log any errors
  results.filter(r => !r.success).forEach(r => {
    logger.error(`[initializeModules] Failed to load module ${r.moduleId}:`, r.error);
  });

  // IMPORTANT: Always initialize the moduleRegistry to enable any modules
  // that were registered directly (e.g., via registerAllModules()) but not
  // yet enabled. This handles the case where modules are registered with the
  // registry before the loader factories run.
  try {
    if (!moduleRegistry.ready) {
      logger.debug('[initializeModules] Initializing moduleRegistry to enable registered modules...');
      await moduleRegistry.initialize();
    }
  } catch (err) {
    logger.error('[initializeModules] moduleRegistry.initialize() failed:', err);
  }
}
