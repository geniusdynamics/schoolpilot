/**
 * usePlugins Hook
 * 
 * React hook for accessing plugin functionality.
 */

import { useContext, useCallback } from 'react';
import { PluginsContext } from './PluginsProvider';
import type { PluginManifest, LoadedPlugin } from './types';

interface UsePluginsResult {
  plugins: LoadedPlugin[];
  activePlugins: LoadedPlugin[];
  loadPlugin: (manifest: PluginManifest) => Promise<LoadedPlugin>;
  activatePlugin: (pluginId: string) => Promise<void>;
  deactivatePlugin: (pluginId: string) => Promise<void>;
  unloadPlugin: (pluginId: string) => Promise<void>;
  getPlugin: (pluginId: string) => LoadedPlugin | undefined;
  /** What a plugin has saved of its settings: only the keys that were set. */
  getPluginSettings: (pluginId: string) => Record<string, unknown>;
  /** Saves one setting of a plugin, and keeps it. */
  setPluginSetting: (pluginId: string, key: string, value: unknown) => Promise<void>;
}

/**
 * Hook for plugin management
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { plugins, activePlugins, loadPlugin } = usePlugins();
 *   
 *   return (
 *     <div>
 *       <p>Active plugins: {activePlugins.length}</p>
 *       {plugins.map(p => (
 *         <div key={p.manifest.id}>{p.manifest.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlugins(): UsePluginsResult {
  const context = useContext(PluginsContext);
  
  if (!context) {
    throw new Error('usePlugins must be used within PluginsProvider');
  }

  const { manager, plugins, setPlugins } = context;

  const loadPlugin = useCallback(
    async (manifest: PluginManifest) => {
      const plugin = await manager.loadPlugin(manifest);
      setPlugins(manager.getAllPlugins());
      return plugin;
    },
    [manager, setPlugins]
  );

  const activatePlugin = useCallback(
    async (pluginId: string) => {
      await manager.activatePlugin(pluginId);
      setPlugins(manager.getAllPlugins());
    },
    [manager, setPlugins]
  );

  const deactivatePlugin = useCallback(
    async (pluginId: string) => {
      await manager.deactivatePlugin(pluginId);
      setPlugins(manager.getAllPlugins());
    },
    [manager, setPlugins]
  );

  const unloadPlugin = useCallback(
    async (pluginId: string) => {
      await manager.unloadPlugin(pluginId);
      setPlugins(manager.getAllPlugins());
    },
    [manager, setPlugins]
  );

  const getPlugin = useCallback(
    (pluginId: string) => manager.getPlugin(pluginId),
    [manager]
  );

  const getPluginSettings = useCallback(
    (pluginId: string) => manager.getPluginSettings(pluginId),
    [manager]
  );

  const setPluginSetting = useCallback(
    (pluginId: string, key: string, value: unknown) => manager.setPluginSetting(pluginId, key, value),
    [manager]
  );

  return {
    plugins,
    activePlugins: plugins.filter(p => p.status === 'active'),
    loadPlugin,
    activatePlugin,
    deactivatePlugin,
    unloadPlugin,
    getPlugin,
    getPluginSettings,
    setPluginSetting,
  };
}

export default usePlugins;
