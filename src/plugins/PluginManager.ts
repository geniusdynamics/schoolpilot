/**
 * Plugin Manager
 *
 * Core plugin system for SchoolPilot3 - Refactored to use modular architecture.
 * Delegates specific responsibilities to subsystems:
 * - PluginHookSystem: Hook registration and execution
 * - PluginSettingsManager: Configuration storage and validation
 * - PluginEventSystem: Lifecycle events and tracking
 * - PluginSecuritySandbox: Permission and security management
 */

import type {
  PluginManifest,
  LoadedPlugin,
  PluginModule,
  PluginContext,
  PluginAPI,
  PluginConfig,
  AdminPluginConfig,
  MarketplaceKeyConfig,
} from './types';
import { PluginHookSystem } from './PluginHookSystem';
import { PluginSettingsManager } from './PluginSettingsManager';
import { PluginEventSystem } from './PluginEventSystem';
import { PluginSecuritySandbox } from './PluginSecuritySandbox';
import { logger } from '@/utils/logging';

export class PluginManager {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private config: PluginConfig;
  private adminConfig: AdminPluginConfig | null = null;
  private marketplaceKey: MarketplaceKeyConfig | null = null;
  private instanceId: string;

  // Subsystems
  private hookSystem: PluginHookSystem;
  private settingsManager: PluginSettingsManager;
  private eventSystem: PluginEventSystem;
  private securitySandbox: PluginSecuritySandbox;

  constructor(config: PluginConfig = {}) {
    this.config = {
      autoActivate: true,
      sandboxMode: true,
      ...config,
    };

    this.instanceId = this.generateInstanceId();

    // Initialize subsystems
    this.hookSystem = new PluginHookSystem();
    this.settingsManager = new PluginSettingsManager();
    this.eventSystem = new PluginEventSystem();
    this.securitySandbox = new PluginSecuritySandbox();

    this.loadPersistedState();
  }

  // ============================================================================
  // Public API - Delegated to Subsystems
  // ============================================================================

  /** Register a hook handler */
  registerHook = (name: string, handler: (...args: any[]) => any, pluginId?: string, priority = 10): void => {
    this.hookSystem.registerHook(name, handler, pluginId || 'core', priority);
  };

  /** Remove a hook handler */
  removeHook = (name: string, handler: (...args: any[]) => any): void => {
    this.hookSystem.removeHook(name, handler);
  };

  /** Execute hooks and return all results */
  doHook = <T = any>(name: string, ...args: any[]): T[] => {
    return this.hookSystem.doHook<T>(name, ...args);
  };

  /** Execute hooks and return first non-null result */
  applyHook = <T = any>(name: string, ...args: any[]): T | undefined => {
    return this.hookSystem.applyHook<T>(name, ...args);
  };

  /** Subscribe to plugin events */
  on = <T extends any>(event: string, callback: (data: T) => void): (() => void) => {
    return this.eventSystem.on(event as any, callback);
  };

  /** Get plugin setting */
  getPluginSetting = <T>(pluginId: string, key: string): T | undefined => {
    return this.settingsManager.getSetting<T>(pluginId, key);
  };

  /** Set plugin setting */
  setPluginSetting = async (pluginId: string, key: string, value: any): Promise<void> => {
    await this.settingsManager.setSetting(pluginId, key, value);
  };

  /** Get all plugin settings */
  getPluginSettings = (pluginId: string): Record<string, any> => {
    return this.settingsManager.getAllSettings(pluginId);
  };

  // ============================================================================
  // Plugin Lifecycle
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

    // Register settings schema if provided
    if (plugin.manifest.settings) {
      this.settingsManager.registerSettingsSchema(plugin.manifest.id, plugin.manifest.settings);
    }

    // Load persisted settings
    this.settingsManager.loadSettings(plugin.manifest.id);

    this.eventSystem.emit('plugin:discovered', {
      plugin: plugin.manifest,
      source: 'builtin',
    });
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
    const validation = this.securitySandbox.validateManifest(manifest);
    if (!validation.valid) {
      throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
    }

    // Check security restrictions
    const loadCheck = this.securitySandbox.canLoadPlugin(
      manifest,
      this.config.allowedTypes,
      this.adminConfig?.loading.allowedTypes
    );
    if (!loadCheck.allowed) {
      throw new Error(loadCheck.reason);
    }

    // Check dependencies
    await this.checkDependencies(manifest);

    this.eventSystem.emit('plugin:load:start', { pluginId: manifest.id });

    // Load module
    let module: PluginModule;
    let error: string | undefined;

    try {
      module = await this.loadModule(manifest);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      module = {};
      this.eventSystem.emit('plugin:load:error', { pluginId: manifest.id, error });
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

    // Register settings schema
    if (manifest.settings) {
      this.settingsManager.registerSettingsSchema(manifest.id, manifest.settings);
    }

    if (!error) {
      this.eventSystem.emit('plugin:load:complete', { pluginId: manifest.id });

      // Auto-activate if configured
      if (this.config.autoActivate) {
        await this.activatePlugin(manifest.id);
      }
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

    this.eventSystem.emit('plugin:activate:start', { pluginId });

    // Create plugin context
    const context = this.createPluginContext(plugin.manifest);

    // Call activate hook
    if (plugin.module.activate) {
      try {
        await plugin.module.activate(context);
      } catch (error) {
        plugin.status = 'error';
        plugin.error = error instanceof Error ? error.message : String(error);
        this.eventSystem.emit('plugin:activate:error', { pluginId, error });
        throw error;
      }
    }

    // Register hooks
    if (plugin.module.hooks) {
      for (const [name, handler] of Object.entries(plugin.module.hooks)) {
        this.hookSystem.registerHook(name, handler, pluginId);
      }
    }

    plugin.status = 'active';
    this.eventSystem.emit('plugin:activate:complete', { pluginId });
  }

  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== 'active') {
      return;
    }

    this.eventSystem.emit('plugin:deactivate:start', { pluginId });

    // Call deactivate hook
    if (plugin.module.deactivate) {
      try {
        const context = this.createPluginContext(plugin.manifest);
        await plugin.module.deactivate(context);
      } catch (error) {
        logger.error(`Error deactivating plugin ${pluginId}:`, error);
      }
    }

    // Remove hooks
    this.hookSystem.unregisterPluginHooks(pluginId);

    plugin.status = 'inactive';
    this.eventSystem.emit('plugin:deactivate:complete', { pluginId });
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    this.eventSystem.emit('plugin:uninstall:start', { pluginId });

    await this.deactivatePlugin(pluginId);
    this.plugins.delete(pluginId);
    this.settingsManager.clearSettings(pluginId);
    this.securitySandbox.clearPermissions(pluginId);

    this.eventSystem.emit('plugin:uninstall:complete', { pluginId });
  }

  // ============================================================================
  // Plugin Access
  // ============================================================================

  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter((p) => p.status === 'active');
  }

  getPluginsByType(type: string): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter((p) => p.manifest.type === type);
  }

  getPluginAPI(pluginId: string): Record<string, any> | undefined {
    return this.plugins.get(pluginId)?.module?.api;
  }

  // ============================================================================
  // Admin & Marketplace Configuration
  // ============================================================================

  setAdminConfig(config: AdminPluginConfig): void {
    this.adminConfig = config;
    this.persistState();
  }

  getAdminConfig(): AdminPluginConfig | null {
    return this.adminConfig;
  }

  isPluginsEnabled(): boolean {
    return this.adminConfig?.pluginsEnabled ?? true;
  }

  isMarketplaceEnabled(): boolean {
    return this.adminConfig?.marketplace.enabled ?? false;
  }

  isPluginTypeAllowed(type: string): boolean {
    if (!this.adminConfig?.loading.allowedTypes) return true;
    return this.adminConfig.loading.allowedTypes.includes(type as any);
  }

  isMaxPluginsReached(): boolean {
    const maxPlugins = this.adminConfig?.loading.maxInstalledPlugins ?? 100;
    return this.plugins.size >= maxPlugins;
  }

  setMarketplaceKey(key: MarketplaceKeyConfig): void {
    this.marketplaceKey = key;
    this.persistState();
  }

  getMarketplaceKey(): MarketplaceKeyConfig | null {
    return this.marketplaceKey;
  }

  hasValidMarketplaceKey(): boolean {
    if (!this.marketplaceKey) return false;
    const expires = new Date(this.marketplaceKey.activatedAt);
    expires.setFullYear(expires.getFullYear() + 1);
    return expires > new Date();
  }

  getInstanceId(): string {
    return this.instanceId;
  }

  canInstallPlugin(isPaid: boolean): boolean {
    if (!this.isMarketplaceEnabled()) return false;
    if (!this.marketplaceKey) return !isPaid;

    if (isPaid) {
      return this.marketplaceKey.permissions.installPaidPlugins;
    }
    return this.marketplaceKey.permissions.installFreePlugins;
  }

  // ============================================================================
  // Subsystem Access (for advanced use cases)
  // ============================================================================

  getHookSystem(): PluginHookSystem {
    return this.hookSystem;
  }

  getSettingsManager(): PluginSettingsManager {
    return this.settingsManager;
  }

  getEventSystem(): PluginEventSystem {
    return this.eventSystem;
  }

  getSecuritySandbox(): PluginSecuritySandbox {
    return this.securitySandbox;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateInstanceId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

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
          const dep = manifests.find((m) => m.id === depId);
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
        this.hookSystem.doHook('registerRoute', route, manifest.id);
      },
      registerMenuItem: (item) => {
        this.hookSystem.doHook('registerMenuItem', item, manifest.id);
      },
      registerWidget: (widget) => {
        this.hookSystem.doHook('registerWidget', widget, manifest.id);
      },
      showNotification: (message, type = 'info') => {
        this.hookSystem.doHook('showNotification', { message, type });
      },
      addHook: (name, handler, priority = 10) => {
        this.hookSystem.registerHook(name, handler, manifest.id, priority);
      },
      removeHook: (name, handler) => {
        this.hookSystem.removeHook(name, handler);
      },
      doHook: (name, ...args) => {
        return this.hookSystem.doHook(name, ...args);
      },
      getSetting: (key) => {
        return this.settingsManager.getSetting(manifest.id, key);
      },
      setSetting: async (key, value) => {
        await this.settingsManager.setSetting(manifest.id, key, value);
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
      settings: this.settingsManager.getAllSettings(manifest.id),
      api,
    };
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
