/**
 * Plugins Provider
 * 
 * React context provider for the plugin system.
 */

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { PluginManager, initPlugins } from './PluginManager';
import type { PluginConfig, LoadedPlugin, PluginManifest } from './types';
import { loadAllBuiltinPlugins } from './BuiltinLoader';
import { logger } from '../utils/logging';

interface PluginsContextValue {
  manager: PluginManager;
  plugins: LoadedPlugin[];
  setPlugins: (plugins: LoadedPlugin[]) => void;
}

export const PluginsContext = createContext<PluginsContextValue | null>(null);

interface PluginsProviderProps {
  children: ReactNode;
  config?: PluginConfig;
  manifests?: PluginManifest[];
}

/**
 * Plugins Provider Component
 * 
 * @example
 * ```tsx
 * <PluginsProvider config={{ autoActivate: true }}>
 *   <App />
 * </PluginsProvider>
 * ```
 */
export const PluginsProvider: React.FC<PluginsProviderProps> = ({
  children,
  config,
  manifests,
}) => {
  const [manager] = useState(() => initPlugins(config));
  const [plugins, setPlugins] = useState<LoadedPlugin[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadPlugins = async () => {
      try {
        // Auto-discover and load builtin plugins using BuiltinLoader
        const builtinPlugins = await loadAllBuiltinPlugins();
        
        // Register each discovered plugin
        for (const plugin of builtinPlugins) {
          try {
            manager.registerBuiltinPlugin(plugin);
          } catch (error) {
            logger.error(`[PluginsProvider] Failed to register ${plugin.manifest.id}:`, error);
          }
        }

        // Load additional custom manifests if provided
        if (manifests && manifests.length > 0) {
          await manager.loadPlugins(manifests);
        }

        setPlugins(manager.getAllPlugins());
        setIsReady(true);
      } catch (error) {
        logger.error('[PluginsProvider] Failed to initialize plugins:', error);
        setIsReady(true); // Still render app even if plugins fail
      }
    };

    loadPlugins();
  }, [manager, manifests]);

  if (!isReady) {
    return null;
  }

  return (
    <PluginsContext.Provider value={{ manager, plugins, setPlugins }}>
      {children}
    </PluginsContext.Provider>
  );
};

export default PluginsProvider;
