/**
 * Plugin Manager
 * 
 * Core plugin system for SchoolPilot3.
 * Supports loading, activating, and managing plugins.
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
} from './types';

export class PluginManager {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private hooks: Map<string, PluginHook> = new Map();
  private settings: Map<string, Record<string, any>> = new Map();
  private config: PluginConfig;

  constructor(config: PluginConfig = {}) {
    this.config = {
      autoActivate: true,
      sandboxMode: true,
      ...config,
    };
  }

  // ============================================================================
  // Plugin Loading
  // ============================================================================

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
        console.error(`Failed to load plugin ${manifest.id}:`, error);
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
        console.error(`Error deactivating plugin ${pluginId}:`, error);
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
   * Execute hooks
   */
  doHook<T = any>(name: string, ...args: any[]): T[] {
    const hook = this.hooks.get(name);
    if (!hook) return [];

    const results: T[] = [];
    for (const { handler } of hook.handlers) {
      try {
        const result = handler(...args);
        results.push(result);
      } catch (error) {
        console.error(`Hook ${name} handler failed:`, error);
      }
    }

    return results;
  }

  /**
   * Execute hooks with filter (first non-null result wins)
   */
  applyHook<T = any>(name: string, ...args: any[]): T | undefined {
    const hook = this.hooks.get(name);
    if (!hook) return undefined;

    for (const { handler } of hook.handlers) {
      try {
        const result = handler(...args);
        if (result !== undefined && result !== null) {
          return result;
        }
      } catch (error) {
        console.error(`Hook ${name} handler failed:`, error);
      }
    }

    return undefined;
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

  private async loadModule(manifest: PluginManifest): Promise<PluginModule> {
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
      getData: async (collection: string, query?: any) => {
        // Implementation would connect to data layer
        return [];
      },
      setData: async (collection: string, id: string, data: any) => {
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
      translate: (key, options) => {
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
