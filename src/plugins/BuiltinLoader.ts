/**
 * Builtin Plugin Loader
 * 
 * Auto-discovers and loads builtin plugins from the /src/plugins/builtin/ directory.
 * Uses plugin.json manifests for metadata and dynamically imports plugin modules.
 */

import type { LoadedPlugin, PluginManifest, PluginModule } from '../types';
import { logger } from '@/utils/logging';

// Use Vite's import.meta.glob for proper dynamic imports
const pluginModules = import.meta.glob('./builtin/*/index.ts', { eager: false });

interface PluginDirectory {
  name: string;
  path: string;
}

/**
 * List of builtin plugin directories to load
 * This is the source of truth for builtin plugins
 */
const BUILTIN_PLUGINS: PluginDirectory[] = [
  { name: 'whitelabel', path: 'whitelabel' },
  { name: 'grading-engine', path: 'grading-engine' },
  { name: 'fee-calculator', path: 'fee-calculator' },
  { name: 'analytics-mock', path: 'analytics-mock' },
  { name: 'payment-mock', path: 'payment-mock' },
  { name: 'sms-gateway', path: 'sms-gateway' },
  // Backend Integration Plugins
  { name: 'erpnext-integration', path: 'erpnext-integration' },
  { name: 'frappe-integration', path: 'frappe-integration' },
  { name: 'saas-backend', path: 'saas-backend' },
  { name: 'generic-rest', path: 'generic-rest' },
];

/**
 * Load a single builtin plugin
 */
async function loadBuiltinPlugin(dirInfo: PluginDirectory): Promise<LoadedPlugin | null> {
  try {
    // Check if plugin exists in glob map
    const modulePath = `./builtin/${dirInfo.path}/index.ts`;
    const loader = pluginModules[modulePath];
    
    if (!loader) {
      // Plugin doesn't exist, log at debug level only
      logger.debug(`[BuiltinLoader] Plugin ${dirInfo.name} not found at ${modulePath}`);
      return null;
    }

    // Load the module
    const pluginModule = await loader();
    
    if (!pluginModule || typeof pluginModule !== 'object') {
      logger.warn(`[BuiltinLoader] Plugin ${dirInfo.name} has invalid structure`);
      return null;
    }

    // Handle both default export and direct export patterns
    const mod = (pluginModule as any).default || pluginModule;
    
    if (!mod.manifest || !mod.module) {
      logger.warn(`[BuiltinLoader] Plugin ${dirInfo.name} missing manifest or module`);
      return null;
    }

    const { manifest, module } = mod as {
      manifest: PluginManifest;
      module: PluginModule;
    };

    return {
      manifest,
      module,
      status: 'inactive' as const,
      loadedAt: new Date(),
      source: 'builtin' as const,
    };
  } catch (error) {
    // Only log as error if it's not a "module not found" error
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('not found') || errorMsg.includes('Unknown variable')) {
      logger.debug(`[BuiltinLoader] Plugin ${dirInfo.name} not available: ${errorMsg}`);
    } else {
      logger.error(`[BuiltinLoader] Failed to load plugin ${dirInfo.name}:`, error);
    }
    return null;
  }
}

/**
 * Load all builtin plugins
 * Returns array of loaded plugins (excludes failed loads)
 */
export async function loadAllBuiltinPlugins(): Promise<LoadedPlugin[]> {
  logger.debug('[BuiltinLoader] Discovering builtin plugins...');
  
  const plugins: LoadedPlugin[] = [];
  
  for (const dirInfo of BUILTIN_PLUGINS) {
    const plugin = await loadBuiltinPlugin(dirInfo);
    if (plugin) {
      plugins.push(plugin);
      logger.debug(`[BuiltinLoader] ✓ Loaded ${plugin.manifest.name} (${plugin.manifest.id})`);
    }
  }

  logger.debug(`[BuiltinLoader] Total builtin plugins loaded: ${plugins.length}`);
  return plugins;
}

/**
 * Get list of available builtin plugin IDs
 */
export function getBuiltinPluginIds(): string[] {
  return BUILTIN_PLUGINS.map(p => p.name);
}
