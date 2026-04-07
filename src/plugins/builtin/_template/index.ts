/**
 * Plugin Template
 *
 * This is a template for creating new builtin plugins for SchoolPilot3.
 * Copy this directory to create your own plugin.
 */

import type { PluginManifest, PluginModule, PluginContext } from '../../types';
// Import the plugin.json manifest
import manifest from './plugin.json';

/**
 * Plugin installation - called once when plugin is first installed
 * Use this to initialize storage, create default configs, etc.
 */
function install(context: PluginContext): void {
  console.log(`[${manifest.id}] Installing...`);
  // Initialize plugin storage, create default settings, etc.
}

/**
 * Plugin activation - called when plugin is enabled
 * Use this to register hooks, add menu items, register routes, etc.
 */
function activate(context: PluginContext): void {
  console.log(`[${manifest.id}] Activating...`);

  // Example: Register a hook
  context.api.addHook('app.init', () => {
    console.log(`[${manifest.id}] App initialized`);
  });

  // Example: Register a menu item
  context.api.registerMenuItem({
    id: 'my-plugin',
    label: 'My Plugin',
    route: '/plugins/my-plugin',
    icon: 'PluginIcon',
    order: 100,
  });

  // Example: Show notification
  context.api.showNotification('My Plugin is now active', 'success');
}

/**
 * Plugin deactivation - called when plugin is disabled
 * Use this to cleanup hooks, remove UI elements, etc.
 */
function deactivate(context: PluginContext): void {
  console.log(`[${manifest.id}] Deactivating...`);
  // Cleanup hooks, remove UI elements, etc.
  // Note: Hooks registered via context.api.addHook are automatically cleaned up
}

/**
 * Plugin uninstallation - called when plugin is removed
 * Use this to clean up all stored data
 */
function uninstall(context: PluginContext): void {
  console.log(`[${manifest.id}] Uninstalling...`);
  // Clean up all stored data, settings, etc.
}

/**
 * Plugin module definition
 * This is the main export that the plugin system uses
 */
const module: PluginModule = {
  install,
  activate,
  deactivate,
  uninstall,
  // Optional: Define hooks this plugin provides
  hooks: {
    // 'myPlugin.customHook': (arg: any) => { return arg; }
  },
  // Optional: Expose API for other plugins
  api: {
    // myMethod: () => { return 'Hello from my plugin!'; }
  },
};

/**
 * Default export
 * The plugin system expects { manifest, module } as the default export
 */
export default {
  manifest: manifest as PluginManifest,
  module,
};

// Also export individual components for testing
export { install, activate, deactivate, uninstall, module };
