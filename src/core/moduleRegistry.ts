import type { ModuleMetadata, LoadedModule } from '@/core/types/module';
import { DependencyResolver, type ResolutionResult } from './DependencyResolver';
import { ModuleLifecycle, type LifecycleHooks, type ModuleState } from './ModuleLifecycle';
import { EventEmitter } from 'events';

export interface RegistryOptions {
  autoEnable?: boolean;
  parallelLoading?: boolean;
  timeout?: number;
}

export interface RegistryEventMap {
  'module:loading': { moduleId: string };
  'module:loaded': { moduleId: string; state: ModuleState };
  'module:error': { moduleId: string; error: Error };
  'registry:ready': { modules: string[] };
  'registry:error': { error: Error };
}

/**
 * Central registry for managing all modules.
 * Combines dependency resolution with lifecycle management.
 */
export class ModuleRegistry extends EventEmitter {
  private resolver = new DependencyResolver();
  private lifecycle = new ModuleLifecycle();
  private metadata = new Map<string, ModuleMetadata>();
  private options: RegistryOptions;
  private isReady = false;

  constructor(options: RegistryOptions = {}) {
    super();
    this.options = {
      autoEnable: true,
      parallelLoading: false,
      timeout: 30000,
      ...options
    };

    // Forward lifecycle events
    this.lifecycle.on('module:registered', (e) => this.emit('module:registered', e));
    this.lifecycle.on('module:enabled', (e) => this.emit('module:enabled', e));
    this.lifecycle.on('module:disabled', (e) => this.emit('module:disabled', e));
    this.lifecycle.on('module:unregistered', (e) => this.emit('module:unregistered', e));
    this.lifecycle.on('module:error', (e) => this.emit('module:error', e));
  }

  /**
   * Register a module with its metadata and optional hooks
   */
  async register(module: LoadedModule, hooks?: LifecycleHooks): Promise<void> {
    const { id, metadata } = module;

    // Store metadata
    this.metadata.set(id, metadata);

    // Register with resolver for dependency tracking
    this.resolver.registerModule(module);

    // Register hooks if provided
    if (hooks) {
      this.lifecycle.registerHooks(id, hooks);
    }

    // Register with lifecycle manager
    await this.lifecycle.register(module, metadata.config);
  }

  /**
   * Register multiple modules at once
   */
  async registerBatch(modules: LoadedModule[], hooksMap?: Map<string, LifecycleHooks>): Promise<void> {
    // First pass: register all modules with resolver and store metadata
    for (const module of modules) {
      this.resolver.registerModule(module);
      this.metadata.set(module.id, module.metadata);
    }

    // Second pass: resolve dependencies and register with lifecycle
    const resolution = this.resolver.resolve();
    
    if (resolution.circular.length > 0) {
      throw new Error(
        `Cannot register modules with circular dependencies: ${
          resolution.circular.map(c => c.join(' -> ')).join(', ')
        }`
      );
    }

    // Register in dependency order
    for (const moduleId of resolution.order) {
      const module = modules.find(m => m.id === moduleId);
      if (module && !this.lifecycle.isRegistered(moduleId)) {
        const hooks = hooksMap?.get(moduleId);
        // Register hooks BEFORE registering module so onRegister is called
        if (hooks) {
          this.lifecycle.registerHooks(moduleId, hooks);
        }
        await this.lifecycle.register(module, module.metadata.config);
      }
    }
  }

  /**
   * Initialize all registered modules
   * Resolves dependencies and enables modules in correct order
   */
  async initialize(): Promise<void> {
    try {
      const resolution = this.resolver.resolve();

      if (resolution.circular.length > 0) {
        const error = new Error(
          `Circular dependencies detected: ${
            resolution.circular.map(c => c.join(' -> ')).join(', ')
          }`
        );
        this.emit('registry:error', { error });
        throw error;
      }

      if (this.options.parallelLoading) {
        await this.initializeParallel(resolution);
      } else {
        await this.initializeSequential(resolution);
      }

      this.isReady = true;
      this.emit('registry:ready', { modules: this.getEnabledModules() });
    } catch (error) {
      this.emit('registry:error', { error: error as Error });
      throw error;
    }
  }

  /**
   * Initialize modules sequentially in dependency order
   */
  private async initializeSequential(resolution: ResolutionResult): Promise<void> {
    for (const moduleId of resolution.order) {
      if (this.options.autoEnable && !this.lifecycle.isEnabled(moduleId)) {
        this.emit('module:loading', { moduleId });
        await this.lifecycle.enable(moduleId);
        this.emit('module:loaded', { moduleId, state: this.lifecycle.getState(moduleId)! });
      }
    }
  }

  /**
   * Initialize modules in parallel batches based on dependency levels
   */
  private async initializeParallel(resolution: ResolutionResult): Promise<void> {
    const batches = this.resolver.getLoadingBatches();

    for (const batch of batches) {
      const promises = batch
        .filter(id => this.options.autoEnable && !this.lifecycle.isEnabled(id))
        .map(async (moduleId) => {
          this.emit('module:loading', { moduleId });
          try {
            await this.lifecycle.enable(moduleId);
            this.emit('module:loaded', { moduleId, state: this.lifecycle.getState(moduleId)! });
          } catch (error) {
            this.emit('module:error', { moduleId, error: error as Error });
            throw error;
          }
        });

      await Promise.all(promises);
    }
  }

  /**
   * Enable a specific module
   */
  async enable(moduleId: string): Promise<void> {
    // Check if dependencies are enabled
    const deps = this.resolver.getAllDependencies(moduleId);
    for (const dep of deps) {
      if (!this.lifecycle.isEnabled(dep)) {
        throw new Error(
          `Cannot enable "${moduleId}": dependency "${dep}" is not enabled`
        );
      }
    }

    await this.lifecycle.enable(moduleId);
  }

  /**
   * Disable a specific module
   */
  async disable(moduleId: string): Promise<void> {
    // Check if any dependents are still enabled
    const enabledModules = new Set(this.lifecycle.getEnabledModules());
    if (!this.resolver.canDisable(moduleId, enabledModules)) {
      const dependents = this.resolver.getDependents(moduleId)
        .filter(d => enabledModules.has(d));
      throw new Error(
        `Cannot disable "${moduleId}": modules depend on it: ${dependents.join(', ')}`
      );
    }

    await this.lifecycle.disable(moduleId);
  }

  /**
   * Unregister a module
   */
  async unregister(moduleId: string): Promise<void> {
    await this.lifecycle.unregister(moduleId);
    this.metadata.delete(moduleId);
  }

  /**
   * Get module metadata
   */
  getMetadata(moduleId: string): ModuleMetadata | undefined {
    return this.metadata.get(moduleId);
  }

  /**
   * Get all module metadata
   */
  getAllMetadata(): ModuleMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Get module state
   */
  getState(moduleId: string): ModuleState | undefined {
    return this.lifecycle.getState(moduleId);
  }

  /**
   * Get all module states
   */
  getAllStates(): ModuleState[] {
    return this.lifecycle.getAllStates();
  }

  /**
   * Check if module is enabled
   */
  isEnabled(moduleId: string): boolean {
    return this.lifecycle.isEnabled(moduleId);
  }

  /**
   * Check if module is registered
   */
  isRegistered(moduleId: string): boolean {
    return this.lifecycle.isRegistered(moduleId);
  }

  /**
   * Get list of enabled modules
   */
  getEnabledModules(): string[] {
    return this.lifecycle.getEnabledModules();
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph() {
    return this.resolver.buildGraph();
  }

  /**
   * Get loading order
   */
  getLoadingOrder(): string[] {
    return this.resolver.resolve().order;
  }

  /**
   * Get loading batches (for parallel loading)
   */
  getLoadingBatches(): string[][] {
    return this.resolver.getLoadingBatches();
  }

  /**
   * Get all dependencies for a module
   */
  getDependencies(moduleId: string): string[] {
    return this.resolver.getAllDependencies(moduleId);
  }

  /**
   * Get all dependents of a module
   */
  getDependents(moduleId: string): string[] {
    return this.resolver.getDependents(moduleId);
  }

  /**
   * Check if registry is ready
   */
  get ready(): boolean {
    return this.isReady;
  }

  /**
   * Wait for registry to be ready
   */
  async waitForReady(timeout = this.options.timeout): Promise<void> {
    if (this.isReady) return;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for registry to be ready after ${timeout}ms`));
      }, timeout);

      this.once('registry:ready', () => {
        clearTimeout(timer);
        resolve();
      });

      this.once('registry:error', ({ error }) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Get number of registered modules
   */
  get size(): number {
    return this.metadata.size;
  }

  /**
   * Clear all modules
   */
  async clear(): Promise<void> {
    await this.lifecycle.clear();
    this.metadata.clear();
    this.resolver.clear();
    this.isReady = false;
  }
}

// Singleton instance
export const moduleRegistry = new ModuleRegistry();
