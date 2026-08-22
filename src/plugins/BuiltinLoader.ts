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
      logger.info(`[BuiltinLoader] âœ“ Loaded ${plugin.manifest.name} (${plugin.manifest.id})`);
    }
  }

  logger.info(`[BuiltinLoader] Total builtin plugins loaded: ${plugins.length}`);
  return plugins;
}

/**
 * Get list of available builtin plugin IDs
 */
export function getBuiltinPluginIds(): string[] {
  return BUILTIN_PLUGINS.map(p => p.name);
}
