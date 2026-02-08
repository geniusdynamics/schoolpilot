/**
 * Plugin System
 * 
 * Extensible plugin architecture for SchoolPilot3.
 * 
 * @example
 * ```tsx
 * // Plugin manifest
 * const myPlugin: PluginManifest = {
 *   id: 'my-plugin',
 *   name: 'My Plugin',
 *   version: '1.0.0',
 *   type: 'module',
 *   entry: './index.js',
 *   routes: [
 *     { path: '/my-route', component: 'MyComponent', title: 'My Route' }
 *   ],
 * };
 * 
 * // Load plugin
 * const manager = getPlugins();
 * await manager.loadPlugin(myPlugin);
 * 
 * // Use hook
 * const { plugins, activePlugins } = usePlugins();
 * ```
 */

// Types
export type {
  PluginType,
  PluginManifest,
  PluginRoute,
  PluginMenuItem,
  PluginWidget,
  PluginSetting,
  LoadedPlugin,
  PluginModule,
  PluginHook,
  PluginContext,
  PluginAPI,
  PluginConfig,
} from './types';

// Core
export { PluginManager, initPlugins, getPlugins } from './PluginManager';
export { PluginsContext } from './PluginsProvider';

// React
export { PluginsProvider } from './PluginsProvider';
export { usePlugins } from './usePlugins';
