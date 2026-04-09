/**
 * Modular System Integration
 * 
 * Central integration point for all modularity features.
 * Combines ModuleRegistry, ServiceRegistry, ModuleExports, and ModuleLoader.
 */

import { moduleRegistry } from './ModuleRegistry';
import { serviceRegistry } from './ServiceRegistry';
import { moduleExports } from './ModuleExports';
import { moduleLoader } from './ModuleLoader';
import { moduleBundler } from './ModuleBundler';
import type { LoadedModule, ModuleMetadata, LifecycleHooks } from './types/module';
import type { ServiceRegistration } from './ServiceRegistry';
import type { LoadModuleOptions } from './ModuleLoader';
import { EventEmitter } from 'events';

export interface ModularSystemConfig {
  autoEnable?: boolean;
  parallelLoading?: boolean;
  preloadDelay?: number;
  enableDevTools?: boolean;
}

export interface SystemStatus {
  ready: boolean;
  modules: {
    registered: number;
    enabled: number;
  };
  services: {
    registered: number;
    initialized: number;
  };
  exports: {
    services: number;
    entities: number;
    hooks: number;
    components: number;
  };
}

export interface ModuleRegistration {
  module: LoadedModule;
  hooks?: LifecycleHooks;
  services?: ServiceRegistration[];
  exports?: {
    services?: Map<string, unknown>;
    entities?: Map<string, unknown>;
    hooks?: Map<string, unknown>;
    components?: Map<string, unknown>;
    utils?: Map<string, unknown>;
  };
}

/**
 * Central integration point for the modular system
 */
export class ModularSystem extends EventEmitter {
  private config: Required<ModularSystemConfig>;
  private initialized = false;

  static readonly READY = 'system:ready';
  static readonly ERROR = 'system:error';

  constructor(config: ModularSystemConfig = {}) {
    super();
    this.config = {
      autoEnable: true,
      parallelLoading: false,
      preloadDelay: 2000,
      enableDevTools: false,
      ...config
    };
  }

  /**
   * Initialize the modular system
   */
  async initialize(): Promise<void> {
    try {
      // Forward events from subsystems
      this.setupEventForwarding();

      this.initialized = true;
      this.emit(ModularSystem.READY);

      if (this.config.enableDevTools) {
        this.setupDevTools();
      }
    } catch (error) {
      this.emit(ModularSystem.ERROR, error);
      throw error;
    }
  }

  /**
   * Register a module with all its components
   */
  async registerModule(registration: ModuleRegistration): Promise<void> {
    const { module, hooks, services, exports } = registration;
    const { id } = module;

    // Register with module registry
    await moduleRegistry.register(module, hooks);

    // Register services
    if (services) {
      for (const service of services) {
        serviceRegistry.register(service);
      }
    }

    // Register exports
    if (exports) {
      moduleExports.registerModule(module, exports);
    }

    // Auto-enable if configured
    if (this.config.autoEnable) {
      await moduleRegistry.enable(id);
    }
  }

  /**
   * Register multiple modules
   */
  async registerModules(registrations: ModuleRegistration[]): Promise<void> {
    // First pass: resolve dependencies
    const modules = registrations.map(r => r.module);
    const hooksMap = new Map(
      registrations
        .filter(r => r.hooks)
        .map(r => [r.module.id, r.hooks!])
    );

    await moduleRegistry.registerBatch(modules, hooksMap);

    // Second pass: register services and exports
    for (const registration of registrations) {
      const { module, services, exports } = registration;

      if (services) {
        for (const service of services) {
          serviceRegistry.register(service);
        }
      }

      if (exports) {
        moduleExports.registerModule(module, exports);
      }
    }

    // Initialize all services
    await serviceRegistry.initializeAll();

    // Enable all modules
    if (this.config.autoEnable) {
      await moduleRegistry.initialize();
    }
  }

  /**
   * Load a module dynamically
   */
  async loadModule(moduleId: string, options: Partial<LoadModuleOptions> = {}): Promise<boolean> {
    const result = await moduleLoader.load(moduleId, {
      autoEnable: this.config.autoEnable,
      ...options
    });
    return result.success;
  }

  /**
   * Unload a module
   */
  async unloadModule(moduleId: string): Promise<boolean> {
    return moduleLoader.unload(moduleId);
  }

  /**
   * Get a service
   */
  async getService<T>(moduleId: string, name: string): Promise<T> {
    return serviceRegistry.get<T>(moduleId, name);
  }

  /**
   * Get a service synchronously
   */
  getServiceSync<T>(moduleId: string, name: string): T | undefined {
    return serviceRegistry.getSync<T>(moduleId, name);
  }

  /**
   * Register a service
   */
  registerService<T>(registration: ServiceRegistration<T>): void {
    serviceRegistry.register(registration);
  }

  /**
   * Get module metadata
   */
  getModuleMetadata(moduleId: string): ModuleMetadata | undefined {
    return moduleRegistry.getMetadata(moduleId);
  }

  /**
   * Check if module is enabled
   */
  isModuleEnabled(moduleId: string): boolean {
    return moduleRegistry.isEnabled(moduleId);
  }

  /**
   * Check if module is loaded
   */
  isModuleLoaded(moduleId: string): boolean {
    return moduleLoader.isLoaded(moduleId) || moduleRegistry.isRegistered(moduleId);
  }

  /**
   * Get system status
   */
  getStatus(): SystemStatus {
    return {
      ready: this.initialized && moduleRegistry.ready,
      modules: {
        registered: moduleRegistry.size,
        enabled: moduleRegistry.getEnabledModules().length
      },
      services: {
        registered: serviceRegistry.size,
        initialized: serviceRegistry.initializedCount
      },
      exports: {
        services: moduleExports.listServices().length,
        entities: moduleExports.listEntities().length,
        hooks: 0, // Would need to add listHooks method
        components: 0 // Would need to add listComponents method
      }
    };
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph() {
    return moduleRegistry.getDependencyGraph();
  }

  /**
   * Validate all module exports
   */
  validateExports(): Map<string, { valid: boolean; errors: string[]; warnings: string[] }> {
    return moduleExports.validateAll();
  }

  /**
   * Preload a module
   */
  async preloadModule(moduleId: string): Promise<boolean> {
    return moduleLoader.preload(moduleId);
  }

  /**
   * Wait for system to be ready
   */
  async waitForReady(timeout = 30000): Promise<void> {
    if (this.initialized && moduleRegistry.ready) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for system to be ready after ${timeout}ms`));
      }, timeout);

      const checkReady = () => {
        if (this.initialized && moduleRegistry.ready) {
          clearTimeout(timer);
          resolve();
        }
      };

      this.on(ModularSystem.READY, () => {
        clearTimeout(timer);
        resolve();
      });

      // Check periodically
      const interval = setInterval(() => {
        checkReady();
        if (this.initialized && moduleRegistry.ready) {
          clearInterval(interval);
        }
      }, 100);
    });
  }

  /**
   * Export all modules to window for debugging (dev only)
   */
  private setupDevTools(): void {
    if (typeof window !== 'undefined') {
      (window as any).__MODULAR_SYSTEM__ = {
        registry: moduleRegistry,
        services: serviceRegistry,
        exports: moduleExports,
        loader: moduleLoader,
        bundler: moduleBundler,
        system: this,
        getStatus: () => this.getStatus(),
        getDependencyGraph: () => this.getDependencyGraph()
      };
      console.log('[ModularSystem] Dev tools enabled. Access via window.__MODULAR_SYSTEM__');
    }
  }

  /**
   * Forward events from subsystems
   */
  private setupEventForwarding(): void {
    // Module registry events
    moduleRegistry.on('module:registered', (e) => this.emit('module:registered', e));
    moduleRegistry.on('module:enabled', (e) => this.emit('module:enabled', e));
    moduleRegistry.on('module:disabled', (e) => this.emit('module:disabled', e));
    moduleRegistry.on('registry:ready', () => this.emit('modules:ready'));

    // Service registry events
    serviceRegistry.on('service:ready', (e) => this.emit('service:ready', e));

    // Module loader events
    moduleLoader.on('module:loaded', (e) => this.emit('module:loaded', e));
    moduleLoader.on('module:error', (e) => this.emit('module:error', e));
  }

  /**
   * Get the module registry instance
   */
  getRegistry() {
    return moduleRegistry;
  }

  /**
   * Get the service registry instance
   */
  getServiceRegistry() {
    return serviceRegistry;
  }

  /**
   * Get the exports manager
   */
  getExportsManager() {
    return moduleExports;
  }

  /**
   * Get the module loader
   */
  getLoader() {
    return moduleLoader;
  }

  /**
   * Shutdown the system
   */
  async shutdown(): Promise<void> {
    await moduleLoader.clear();
    await moduleRegistry.clear();
    serviceRegistry.clear();
    moduleExports.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const modularSystem = new ModularSystem();

// Export all subsystems for advanced use cases
export { moduleRegistry, serviceRegistry, moduleExports, moduleLoader, moduleBundler };
