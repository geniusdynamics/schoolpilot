import { logger } from '@/utils/logging';

/**
 * Plugin Manager
 * 
 * Core plugin system for SchoolPilot3.
 * Supports loading, activating, managing plugins with marketplace integration,
 * admin controls, and key validation.
 */

import type {
  PluginManifest,
  LoadedPlugin,
  PluginModule,
  PluginContext,
  PluginAPI,
  PluginConfig,
  PluginHook,
  PluginHookHandler,
  AdminPluginConfig,
  MarketplaceKeyConfig,
} from './types';

// Event emitter type
type EventCallback = (data: any) => void;

export class PluginManager {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private hooks: Map<string, PluginHook> = new Map();
  private hookStats: Map<string, { failures: number; lastFailure: number }> = new Map();
  private settings: Map<string, Record<string, any>> = new Map();
  private config: PluginConfig;
  private adminConfig: AdminPluginConfig | null = null;
  private marketplaceKey: MarketplaceKeyConfig | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private instanceId: string;

  // Security settings
  private readonly HOOK_TIMEOUT_MS = 200;
  private readonly MAX_HOOK_FAILURES = 3;
  private readonly HOOK_BAN_DURATION_MS = 60000; // 1 minute
  private readonly SANDBOX_ENABLED = true;

  constructor(config: PluginConfig = {}) {
    this.config = {
      autoActivate: true,
      sandboxMode: true,
      ...config,
    };
    this.instanceId = this.generateInstanceId();
    this.loadPersistedState();
  }

  /**
   * Generate a unique instance ID
   */
  private generateInstanceId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load persisted state from localStorage
   */
  private loadPersistedState(): void {
    try {
      const persisted = localStorage.getItem('plugin_manager_state');
      if (persisted) {
        const state = JSON.parse(persisted);
        if (state.adminConfig) {
          this.adminConfig = state.adminConfig;
        }
        if (state.marketplaceKey) {
          this.marketplaceKey = state.marketplaceKey;
        }
      }
    } catch (error) {
      logger.warn('[PluginManager] Failed to load persisted state:', error);
    }
  }

  /**
   * Persist state to localStorage
   */
  private persistState(): void {
    try {
      const state = {
        adminConfig: this.adminConfig,
        marketplaceKey: this.marketplaceKey,
      };
      localStorage.setItem('plugin_manager_state', JSON.stringify(state));
    } catch (error) {
      logger.warn('[PluginManager] Failed to persist state:', error);
    }
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to plugin events
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit an event
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // Admin Configuration
  // ============================================================================

  /**
   * Set admin configuration
   */
  setAdminConfig(config: AdminPluginConfig): void {
    this.adminConfig = config;
    this.persistState();
  }

  /**
   * Get admin configuration
   */
  getAdminConfig(): AdminPluginConfig | null {
    return this.adminConfig;
  }

  /**
   * Check if plugins are enabled
   */
  isPluginsEnabled(): boolean {
    return this.adminConfig?.pluginsEnabled ?? true;
  }

  /**
   * Check if marketplace is enabled
   */
  isMarketplaceEnabled(): boolean {
    return this.adminConfig?.marketplace.enabled ?? false;
  }

  /**
   * Check if plugin type is allowed
   */
  isPluginTypeAllowed(type: string): boolean {
    if (!this.adminConfig?.loading.allowedTypes) return true;
    return this.adminConfig.loading.allowedTypes.includes(type as any);
  }

  /**
   * Check if max plugins limit reached
   */
  isMaxPluginsReached(): boolean {
    const maxPlugins = this.adminConfig?.loading.maxInstalledPlugins ?? 100;
    return this.plugins.size >= maxPlugins;
  }

  // ============================================================================
  // Marketplace Key Management
  // ============================================================================

  /**
   * Set marketplace key
   */
  setMarketplaceKey(key: MarketplaceKeyConfig): void {
    this.marketplaceKey = key;
    this.persistState();
  }

  /**
   * Get marketplace key
   */
  getMarketplaceKey(): MarketplaceKeyConfig | null {
    return this.marketplaceKey;
  }

  /**
   * Check if marketplace key is valid
   */
  hasValidMarketplaceKey(): boolean {
    if (!this.marketplaceKey) return false;
    const expires = new Date(this.marketplaceKey.activatedAt);
    expires.setFullYear(expires.getFullYear() + 1); // Keys valid for 1 year
    return expires > new Date();
  }

  /**
   * Get instance ID
   */
  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Check if can install plugin (free or paid)
   */
  canInstallPlugin(isPaid: boolean): boolean {
    if (!this.isMarketplaceEnabled()) return false;
    if (!this.marketplaceKey) return !isPaid; // Can only install free without key
    
    if (isPaid) {
      return this.marketplaceKey.permissions.installPaidPlugins;
    }
    return this.marketplaceKey.permissions.installFreePlugins;
  }

  // ============================================================================
  // Plugin Loading
  // ============================================================================

  /**
   * Register a builtin plugin directly
   */
  registerBuiltinPlugin(plugin: LoadedPlugin): void {
    if (this.plugins.has(plugin.manifest.id)) {
      logger.warn(`[PluginManager] Builtin plugin ${plugin.manifest.id} already registered`);
      return;
    }
    
    plugin.source = 'builtin';
    plugin.status = plugin.error ? 'error' : 'inactive';
    this.plugins.set(plugin.manifest.id, plugin);
  }

  /**
   * Load a plugin from manifest
   */
  async loadPlugin(manifest: PluginManifest): Promise<LoadedPlugin> {
    // Check if already loaded
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already loaded`);
    }

    // Validate manifest
    this.validateManifest(manifest);

    // Check dependencies
    await this.checkDependencies(manifest);

    // Load module
    let module: PluginModule;
    let error: string | undefined;

    try {
      module = await this.loadModule(manifest);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      module = {};
    }

    const plugin: LoadedPlugin = {
      manifest,
      module,
      status: error ? 'error' : 'inactive',
      error,
      loadedAt: new Date(),
      source: 'local',
    };

    this.plugins.set(manifest.id, plugin);

    // Auto-activate if configured
    if (this.config.autoActivate && !error) {
      await this.activatePlugin(manifest.id);
    }

    return plugin;
  }

  /**
   * Load multiple plugins
   */
  async loadPlugins(manifests: PluginManifest[]): Promise<LoadedPlugin[]> {
    // Sort by dependencies
    const sorted = this.sortByDependencies(manifests);
    
    const results: LoadedPlugin[] = [];
    for (const manifest of sorted) {
      try {
        const plugin = await this.loadPlugin(manifest);
        results.push(plugin);
      } catch (error) {
        logger.error(`Failed to load plugin ${manifest.id}:`, error);
      }
    }

    return results;
  }

  // ============================================================================
  // Plugin Activation
  // ============================================================================

  /**
   * Activate a plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (plugin.status === 'active') {
      return;
    }

    if (plugin.error) {
      throw new Error(`Cannot activate plugin with errors: ${plugin.error}`);
    }

    // Create plugin context
    const context = this.createPluginContext(plugin.manifest);

    // Call activate hook
    if (plugin.module.activate) {
      try {
        await plugin.module.activate.call(context);
      } catch (error) {
        plugin.status = 'error';
        plugin.error = error instanceof Error ? error.message : String(error);
        throw error;
      }
    }

    // Register hooks
    if (plugin.module.hooks) {
      for (const [name, handler] of Object.entries(plugin.module.hooks)) {
        this.addHook(name, handler, pluginId);
      }
    }

    plugin.status = 'active';
  }

  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== 'active') {
      return;
    }

    // Call deactivate hook
    if (plugin.module.deactivate) {
      try {
        const context = this.createPluginContext(plugin.manifest);
        await plugin.module.deactivate.call(context);
      } catch (error) {
        logger.error(`Error deactivating plugin ${pluginId}:`, error);
      }
    }

    // Remove hooks
    this.removePluginHooks(pluginId);

    plugin.status = 'inactive';
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    await this.deactivatePlugin(pluginId);
    this.plugins.delete(pluginId);
    this.settings.delete(pluginId);
  }

  // ============================================================================
  // Hook System
  // ============================================================================

  /**
   * Add a hook handler
   */
  addHook(name: string, handler: (...args: any[]) => any, pluginId?: string, priority = 10): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, { name, handlers: [] });
    }

    const hook = this.hooks.get(name)!;
    const handlerObj: PluginHookHandler = {
      pluginId: pluginId || 'core',
      priority,
      handler,
    };

    // Insert sorted by priority
    const index = hook.handlers.findIndex(h => h.priority > priority);
    if (index === -1) {
      hook.handlers.push(handlerObj);
    } else {
      hook.handlers.splice(index, 0, handlerObj);
    }
  }

  /**
   * Remove a hook handler
   */
  removeHook(name: string, handler: (...args: any[]) => any): void {
    const hook = this.hooks.get(name);
    if (!hook) return;

    hook.handlers = hook.handlers.filter(h => h.handler !== handler);
  }

  /**
   * Execute hooks with security (timeout + circuit breaker)
   */
  doHook<T = any>(name: string, ...args: any[]): T[] {
    const hook = this.hooks.get(name);
    if (!hook) return [];

    const results: T[] = [];
    for (const { handler, pluginId } of hook.handlers) {
      // Check if plugin is temporarily banned
      const stats = this.hookStats.get(pluginId);
      if (stats && stats.failures >= this.MAX_HOOK_FAILURES) {
        const timeSinceFailure = Date.now() - stats.lastFailure;
        if (timeSinceFailure < this.HOOK_BAN_DURATION_MS) {
          logger.warn(`[PluginManager] Plugin ${pluginId} is temporarily banned from hooks`);
          continue; // Skip this handler
        } else {
          // Reset ban after cooldown
          this.hookStats.delete(pluginId);
        }
      }

      try {
        // Execute with timeout
        const result = this.executeWithTimeout(
          () => handler(...args),
          this.HOOK_TIMEOUT_MS,
          `Hook ${name} for plugin ${pluginId}`
        );
        results.push(result);
      } catch (error) {
        logger.error(`Hook ${name} handler failed for plugin ${pluginId}:`, error);
        this.recordHookFailure(pluginId);
      }
    }

    return results;
  }

  /**
   * Execute hooks with filter (first non-null result wins) + security
   */
  applyHook<T = any>(name: string, ...args: any[]): T | undefined {
    const hook = this.hooks.get(name);
    if (!hook) return undefined;

    for (const { handler, pluginId } of hook.handlers) {
      // Check if plugin is temporarily banned
      const stats = this.hookStats.get(pluginId);
      if (stats && stats.failures >= this.MAX_HOOK_FAILURES) {
        const timeSinceFailure = Date.now() - stats.lastFailure;
        if (timeSinceFailure < this.HOOK_BAN_DURATION_MS) {
          continue; // Skip banned plugin
        } else {
          this.hookStats.delete(pluginId);
        }
      }

      try {
        const result = this.executeWithTimeout(
          () => handler(...args),
          this.HOOK_TIMEOUT_MS,
          `Hook ${name} for plugin ${pluginId}`
        );
        if (result !== undefined && result !== null) {
          return result;
        }
      } catch (error) {
        logger.error(`Hook ${name} handler failed for plugin ${pluginId}:`, error);
        this.recordHookFailure(pluginId);
      }
    }

    return undefined;
  }

  /**
   * Execute a function with timeout protection
   */
  private executeWithTimeout<T>(fn: () => T, timeoutMs: number, context: string): T {
    // For synchronous functions, we use a simple approach
    // For async functions, we'd need Promise.race with AbortController
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (duration > timeoutMs) {
      logger.warn(`[PluginManager] ${context} took ${duration.toFixed(2)}ms (timeout: ${timeoutMs}ms)`);
    }
    
    return result;
  }

  /**
   * Record a hook failure for circuit breaker
   */
  private recordHookFailure(pluginId: string): void {
    const current = this.hookStats.get(pluginId) || { failures: 0, lastFailure: 0 };
    current.failures += 1;
    current.lastFailure = Date.now();
    this.hookStats.set(pluginId, current);

    if (current.failures >= this.MAX_HOOK_FAILURES) {
      logger.error(`[PluginManager] Plugin ${pluginId} has been temporarily banned due to ${current.failures} hook failures`);
      this.emit('plugin:hook:banned', { pluginId, failures: current.failures });
    }
  }

  // ============================================================================
  // Plugin Access
  // ============================================================================

  /**
   * Get a plugin
   */
  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get active plugins
   */
  getActivePlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.status === 'active');
  }

  /**
   * Get plugins by type
   */
  getPluginsByType(type: string): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.manifest.type === type);
  }

  /**
   * Get plugin API
   */
  getPluginAPI(pluginId: string): Record<string, any> | undefined {
    return this.plugins.get(pluginId)?.module?.api;
  }

  // ============================================================================
  // Settings
  // ============================================================================

  /**
   * Get plugin settings
   */
  getPluginSettings(pluginId: string): Record<string, any> {
    return this.settings.get(pluginId) || {};
  }

  /**
   * Set plugin setting
   */
  async setPluginSetting(pluginId: string, key: string, value: any): Promise<void> {
    const current = this.settings.get(pluginId) || {};
    this.settings.set(pluginId, { ...current, [key]: value });
    
    // Persist to storage
    await this.persistSettings(pluginId);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id) throw new Error('Plugin ID is required');
    if (!manifest.name) throw new Error('Plugin name is required');
    if (!manifest.version) throw new Error('Plugin version is required');
    if (!manifest.entry) throw new Error('Plugin entry is required');
    if (!manifest.type) throw new Error('Plugin type is required');

    // Check allowed types
    if (this.config.allowedTypes && !this.config.allowedTypes.includes(manifest.type)) {
      throw new Error(`Plugin type ${manifest.type} is not allowed`);
    }
  }

  private async checkDependencies(manifest: PluginManifest): Promise<void> {
    if (manifest.requires) {
      for (const depId of manifest.requires) {
        const dep = this.plugins.get(depId);
        if (!dep || dep.status !== 'active') {
          throw new Error(`Required plugin ${depId} is not active`);
        }
      }
    }

    if (manifest.conflicts) {
      for (const conflictId of manifest.conflicts) {
        const conflict = this.plugins.get(conflictId);
        if (conflict && conflict.status === 'active') {
          throw new Error(`Conflicting plugin ${conflictId} is active`);
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async loadModule(_manifest: PluginManifest): Promise<PluginModule> {
    // In a real implementation, this would dynamically import the module
    // For now, return an empty module
    return {};
  }

  private sortByDependencies(manifests: PluginManifest[]): PluginManifest[] {
    const sorted: PluginManifest[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (manifest: PluginManifest) => {
      if (temp.has(manifest.id)) {
        throw new Error(`Circular dependency detected: ${manifest.id}`);
      }
      if (visited.has(manifest.id)) {
        return;
      }

      temp.add(manifest.id);

      if (manifest.requires) {
        for (const depId of manifest.requires) {
          const dep = manifests.find(m => m.id === depId);
          if (dep) {
            visit(dep);
          }
        }
      }

      temp.delete(manifest.id);
      visited.add(manifest.id);
      sorted.push(manifest);
    };

    for (const manifest of manifests) {
      visit(manifest);
    }

    return sorted;
  }

  private createPluginContext(manifest: PluginManifest): PluginContext {
    const api: PluginAPI = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getData: async (_collection: string, _query?: any) => {
        // Implementation would connect to data layer
        return [];
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      setData: async (_collection: string, _id: string, _data: any) => {
        // Implementation would connect to data layer
      },
      registerRoute: (route) => {
        this.doHook('registerRoute', route, manifest.id);
      },
      registerMenuItem: (item) => {
        this.doHook('registerMenuItem', item, manifest.id);
      },
      registerWidget: (widget) => {
        this.doHook('registerWidget', widget, manifest.id);
      },
      showNotification: (message, type = 'info') => {
        this.doHook('showNotification', { message, type });
      },
      addHook: (name, handler, priority = 10) => {
        this.addHook(name, handler, manifest.id, priority);
      },
      removeHook: (name, handler) => {
        this.removeHook(name, handler);
      },
      doHook: (name, ...args) => {
        return this.doHook(name, ...args);
      },
      getSetting: (key) => {
        return this.getPluginSettings(manifest.id)[key];
      },
      setSetting: async (key, value) => {
        await this.setPluginSetting(manifest.id, key, value);
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      translate: (key, _options) => {
        // Would use i18n system
        return key;
      },
      formatDate: (date) => {
        return new Date(date).toLocaleDateString();
      },
      formatNumber: (num) => {
        return num.toLocaleString();
      },
    };

    return {
      pluginId: manifest.id,
      manifest,
      settings: this.getPluginSettings(manifest.id),
      api,
    };
  }

  private removePluginHooks(pluginId: string): void {
    for (const hook of this.hooks.values()) {
      hook.handlers = hook.handlers.filter(h => h.pluginId !== pluginId);
    }
  }

  private async persistSettings(pluginId: string): Promise<void> {
    const settings = this.settings.get(pluginId);
    if (settings) {
      localStorage.setItem(`plugin_settings_${pluginId}`, JSON.stringify(settings));
    }
  }
}

// Singleton instance
let pluginManagerInstance: PluginManager | null = null;

export function initPlugins(config?: PluginConfig): PluginManager {
  pluginManagerInstance = new PluginManager(config);
  return pluginManagerInstance;
}

export function getPlugins(): PluginManager {
  if (!pluginManagerInstance) {
    pluginManagerInstance = new PluginManager();
  }
  return pluginManagerInstance;
}

export default PluginManager;
