import { logger } from '@/utils/logging';

/**
 * Builtin Plugin Loader
 * 
 * Auto-discovers and loads builtin plugins from the /src/plugins/builtin/ directory.
 * Uses plugin.json manifests for metadata and dynamically imports plugin modules.
 */

import type { LoadedPlugin, PluginManifest, PluginModule } from '../types';

interface PluginDirectory {
  name: string;
  path: string;
}

/**
 * List of builtin plugin directories to load
 * This is the source of truth for builtin plugins
 */
const BUILTIN_PLUGINS: PluginDirectory[] = [
  { name: 'whitelabel', path: './whitelabel' },
  { name: 'grading-engine', path: './grading-engine' },
  { name: 'fee-calculator', path: './fee-calculator' },
];

/**
 * Dormant builtin plugins (Phase 4.3).
 *
 * These ship with the app but stay unregistered until the corresponding
 * feature flag (`plugin_<name>`) is enabled in featureFlagStore — loading
 * them changes nothing by default.
 */
const DORMANT_PLUGINS: PluginDirectory[] = [
  { name: 'analytics-mock', path: './analytics-mock' },
  { name: 'erpnext-integration', path: './erpnext-integration' },
  { name: 'frappe-integration', path: './frappe-integration' },
  { name: 'generic-rest', path: './generic-rest' },
  { name: 'payment-mock', path: './payment-mock' },
  { name: 'saas-backend', path: './saas-backend' },
  { name: 'sms-gateway', path: './sms-gateway' },
  { name: 'sms-mock', path: './sms-mock' },
];

function isPluginEnabled(name: string): boolean {
  try {
    const raw = localStorage.getItem('sp_feature_flags_store');
    if (!raw) return false;
    const flags = JSON.parse(raw)?.state?.flags;
    return Boolean(flags?.[`plugin_${name}`]);
  } catch {
    return false;
  }
}

/**
 * Load a single builtin plugin
 */
async function loadBuiltinPlugin(dirInfo: PluginDirectory): Promise<LoadedPlugin | null> {
  try {
    // Dynamically import the plugin module (extension included so Vite can analyze the import)
    const pluginModule = await import(`./builtin/${dirInfo.name}/index.ts`);
    
    if (!pluginModule.default || !pluginModule.default.manifest || !pluginModule.default.module) {
      logger.warn(`[BuiltinLoader] Plugin ${dirInfo.name} has invalid structure`);
      return null;
    }

    const { manifest, module } = pluginModule.default as {
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
    logger.error(`[BuiltinLoader] Failed to load plugin ${dirInfo.name}:`, error);
    return null;
  }
}

/**
 * Load all builtin plugins
 * Returns array of loaded plugins (excludes failed loads)
 */
export async function loadAllBuiltinPlugins(): Promise<LoadedPlugin[]> {
  logger.info('[BuiltinLoader] Discovering builtin plugins...');
  
  const plugins: LoadedPlugin[] = [];
  
  for (const dirInfo of BUILTIN_PLUGINS) {
    const plugin = await loadBuiltinPlugin(dirInfo);
    if (plugin) {
      plugins.push(plugin);
      logger.info(`[BuiltinLoader] ✓ Loaded ${plugin.manifest.name} (${plugin.manifest.id})`);
    }
  }

  // Dormant plugins load only when explicitly enabled via feature flags
  for (const dirInfo of DORMANT_PLUGINS) {
    if (!isPluginEnabled(dirInfo.name)) continue;
    const plugin = await loadBuiltinPlugin(dirInfo);
    if (plugin) {
      plugins.push(plugin);
      logger.info(`[BuiltinLoader] ✓ Loaded dormant plugin ${plugin.manifest.name} (${plugin.manifest.id})`);
    }
  }

  logger.info(`[BuiltinLoader] Total builtin plugins loaded: ${plugins.length}`);
  return plugins;
}

/**
 * Get list of available builtin plugin IDs (active + dormant)
 */
export function getBuiltinPluginIds(): string[] {
  return [...BUILTIN_PLUGINS, ...DORMANT_PLUGINS].map(p => p.name);
}
