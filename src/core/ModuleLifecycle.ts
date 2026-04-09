import type { ModuleMetadata, LoadedModule } from '@/core/types/module';
import { EventEmitter } from 'events';

export interface LifecycleContext {
  moduleId: string;
  metadata: ModuleMetadata;
  services: Map<string, unknown>;
  config: Record<string, unknown>;
}

export type LifecycleHook = (context: LifecycleContext) => Promise<void> | void;

export interface LifecycleHooks {
  onRegister?: LifecycleHook;
  onEnable?: LifecycleHook;
  onDisable?: LifecycleHook;
  onUnregister?: LifecycleHook;
}

export interface ModuleState {
  id: string;
  status: 'registered' | 'enabled' | 'disabled' | 'error';
  metadata: ModuleMetadata;
  hooks: LifecycleHooks;
  services: Map<string, unknown>;
  error?: Error;
  enabledAt?: Date;
  disabledAt?: Date;
}

export type ModuleStatus = ModuleState['status'];

/**
 * Manages module lifecycle: register → enable → disable → unregister
 * Emits events for state changes
 */
export class ModuleLifecycle extends EventEmitter {
  private modules = new Map<string, ModuleState>();
  private hookRegistry = new Map<string, LifecycleHooks>();

  // Event types
  static readonly REGISTERED = 'module:registered';
  static readonly ENABLED = 'module:enabled';
  static readonly DISABLED = 'module:disabled';
  static readonly UNREGISTERED = 'module:unregistered';
  static readonly ERROR = 'module:error';

  /**
   * Register lifecycle hooks for a module
   */
  registerHooks(moduleId: string, hooks: LifecycleHooks): void {
    this.hookRegistry.set(moduleId, hooks);
  }

  /**
   * Register a module
   */
  async register(module: LoadedModule, config: Record<string, unknown> = {}): Promise<void> {
    const { id, metadata } = module;

    if (this.modules.has(id)) {
      throw new Error(`Module "${id}" is already registered`);
    }

    const hooks = this.hookRegistry.get(id) || {};
    const context: LifecycleContext = {
      moduleId: id,
      metadata,
      services: new Map(),
      config
    };

    const state: ModuleState = {
      id,
      status: 'registered',
      metadata,
      hooks,
      services: new Map()
    };

    this.modules.set(id, state);

    // Execute onRegister hook
    if (hooks.onRegister) {
      try {
        await hooks.onRegister(context);
      } catch (error) {
        state.status = 'error';
        state.error = error as Error;
        this.emit(ModuleLifecycle.ERROR, { moduleId: id, phase: 'register', error });
        throw error;
      }
    }

    this.emit(ModuleLifecycle.REGISTERED, { moduleId: id, state });
  }

  /**
   * Enable a registered module
   */
  async enable(moduleId: string): Promise<void> {
    const state = this.modules.get(moduleId);
    if (!state) {
      throw new Error(`Module "${moduleId}" is not registered`);
    }

    if (state.status === 'enabled') {
      return; // Already enabled
    }

    if (state.status === 'error') {
      throw new Error(`Module "${moduleId}" is in error state`);
    }

    const context: LifecycleContext = {
      moduleId,
      metadata: state.metadata,
      services: state.services,
      config: state.metadata.config || {}
    };

    // Execute onEnable hook
    if (state.hooks.onEnable) {
      try {
        await state.hooks.onEnable(context);
      } catch (error) {
        state.status = 'error';
        state.error = error as Error;
        this.emit(ModuleLifecycle.ERROR, { moduleId, phase: 'enable', error });
        throw error;
      }
    }

    state.status = 'enabled';
    state.enabledAt = new Date();
    this.emit(ModuleLifecycle.ENABLED, { moduleId, state });
  }

  /**
   * Disable an enabled module
   */
  async disable(moduleId: string): Promise<void> {
    const state = this.modules.get(moduleId);
    if (!state) {
      throw new Error(`Module "${moduleId}" is not registered`);
    }

    // Only disable if currently enabled
    if (state.status !== 'enabled') {
      return; // Nothing to disable
    }

    const context: LifecycleContext = {
      moduleId,
      metadata: state.metadata,
      services: state.services,
      config: state.metadata.config || {}
    };

    // Execute onDisable hook
    if (state.hooks.onDisable) {
      try {
        await state.hooks.onDisable(context);
      } catch (error) {
        state.status = 'error';
        state.error = error as Error;
        this.emit(ModuleLifecycle.ERROR, { moduleId, phase: 'disable', error });
        throw error;
      }
    }

    state.status = 'disabled';
    state.disabledAt = new Date();
    this.emit(ModuleLifecycle.DISABLED, { moduleId, state });
  }

  /**
   * Unregister a module
   */
  async unregister(moduleId: string): Promise<void> {
    const state = this.modules.get(moduleId);
    if (!state) {
      throw new Error(`Module "${moduleId}" is not registered`);
    }

    // Disable first if enabled
    if (state.status === 'enabled') {
      await this.disable(moduleId);
    }

    const context: LifecycleContext = {
      moduleId,
      metadata: state.metadata,
      services: state.services,
      config: state.metadata.config || {}
    };

    // Execute onUnregister hook
    if (state.hooks.onUnregister) {
      try {
        await state.hooks.onUnregister(context);
      } catch (error) {
        this.emit(ModuleLifecycle.ERROR, { moduleId, phase: 'unregister', error });
        throw error;
      }
    }

    this.modules.delete(moduleId);
    this.hookRegistry.delete(moduleId);
    this.emit(ModuleLifecycle.UNREGISTERED, { moduleId });
  }

  /**
   * Get module state
   */
  getState(moduleId: string): ModuleState | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Get all registered modules
   */
  getAllStates(): ModuleState[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get modules by status
   */
  getByStatus(status: ModuleStatus): ModuleState[] {
    return this.getAllStates().filter(s => s.status === status);
  }

  /**
   * Check if a module is registered
   */
  isRegistered(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  /**
   * Check if a module is enabled
   */
  isEnabled(moduleId: string): boolean {
    return this.modules.get(moduleId)?.status === 'enabled';
  }

  /**
   * Get enabled modules
   */
  getEnabledModules(): string[] {
    return this.getByStatus('enabled').map(s => s.id);
  }

  /**
   * Enable multiple modules in dependency order
   */
  async enableBatch(moduleIds: string[]): Promise<void> {
    for (const id of moduleIds) {
      if (this.isRegistered(id) && !this.isEnabled(id)) {
        await this.enable(id);
      }
    }
  }

  /**
   * Disable multiple modules in reverse dependency order
   */
  async disableBatch(moduleIds: string[]): Promise<void> {
    // Reverse the order to disable dependents first
    const reversed = [...moduleIds].reverse();
    for (const id of reversed) {
      if (this.isEnabled(id)) {
        await this.disable(id);
      }
    }
  }

  /**
   * Clear all modules
   */
  async clear(): Promise<void> {
    const enabled = this.getEnabledModules();
    await this.disableBatch(enabled);
    
    const all = Array.from(this.modules.keys());
    for (const id of all) {
      await this.unregister(id);
    }
  }
}

// Singleton instance
export const moduleLifecycle = new ModuleLifecycle();
