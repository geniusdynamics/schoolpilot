/**
 * Plugins Provider
 * 
 * React context provider for the plugin system.
 */

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { PluginManager, initPlugins } from './PluginManager';
import type { PluginConfig, LoadedPlugin } from './types';
import whitelabelPlugin from './builtin/whitelabel';
import gradingEnginePlugin from './builtin/grading-engine';
import feeCalculatorPlugin from './builtin/fee-calculator';

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
      // Register builtin plugins
      const builtinPluginsData = [
        whitelabelPlugin,
        gradingEnginePlugin,
        feeCalculatorPlugin,
      ] as Array<{ manifest: any; module: any }>;

      const builtinPlugins: LoadedPlugin[] = builtinPluginsData.map((pluginData) => ({
        manifest: pluginData.manifest,
        module: pluginData.module,
        status: 'inactive' as const,
        loadedAt: new Date(),
        source: 'builtin' as const,
      }));

      // Register each builtin plugin
      for (const plugin of builtinPlugins) {
        try {
          manager.registerBuiltinPlugin(plugin);
        } catch (error) {
          console.error(`Failed to register builtin plugin ${plugin.manifest.id}:`, error);
        }
      }

      // Load additional manifests if provided
      if (manifests && manifests.length > 0) {
        await manager.loadPlugins(manifests);
      }

      setPlugins(manager.getAllPlugins());
      setIsReady(true);
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
