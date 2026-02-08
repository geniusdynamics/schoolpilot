/**
 * Plugin Types
 * 
 * Type definitions for the plugin system.
 */

import type { ComponentType } from 'react';

export type PluginType = 'module' | 'theme' | 'integration' | 'report' | 'widget';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  type: PluginType;
  
  // Dependencies
  requires?: string[]; // Plugin IDs this plugin depends on
  conflicts?: string[]; // Plugin IDs this plugin conflicts with
  minAppVersion?: string;
  maxAppVersion?: string;
  
  // Entry points
  entry: string; // Main entry file
  icon?: string;
  
  // Capabilities
  permissions?: string[];
  hooks?: string[]; // Hooks this plugin uses
  provides?: string[]; // Hooks this plugin provides
  
  // UI integration
  routes?: PluginRoute[];
  menuItems?: PluginMenuItem[];
  widgets?: PluginWidget[];
  settings?: PluginSetting[];
  
  // Metadata
  license?: string;
  homepage?: string;
  repository?: string;
}

export interface PluginRoute {
  path: string;
  component: string;
  title: string;
  icon?: string;
  permissions?: string[];
  parent?: string; // Parent route path
}

export interface PluginMenuItem {
  id: string;
  label: string;
  icon?: string;
  route: string;
  order?: number;
  parent?: string; // Parent menu item ID
  permissions?: string[];
}

export interface PluginWidget {
  id: string;
  name: string;
  description?: string;
  component: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  category?: string;
}

export interface PluginSetting {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json';
  defaultValue?: any;
  options?: { label: string; value: any }[];
  required?: boolean;
  description?: string;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  module: PluginModule;
  status: 'active' | 'inactive' | 'error';
  error?: string;
  loadedAt: Date;
}

export interface PluginModule {
  activate?: () => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
  components?: Record<string, ComponentType<any>>;
  hooks?: Record<string, (...args: any[]) => any>;
  api?: Record<string, any>;
}

export interface PluginHook {
  name: string;
  handlers: PluginHookHandler[];
}

export interface PluginHookHandler {
  pluginId: string;
  priority: number;
  handler: (...args: any[]) => any;
}

export interface PluginRegistry {
  register(plugin: LoadedPlugin): void;
  unregister(pluginId: string): void;
  get(pluginId: string): LoadedPlugin | undefined;
  getAll(): LoadedPlugin[];
  getByType(type: PluginType): LoadedPlugin[];
  getActive(): LoadedPlugin[];
}

export interface PluginContext {
  pluginId: string;
  manifest: PluginManifest;
  settings: Record<string, any>;
  api: PluginAPI;
}

export interface PluginAPI {
  // Data access
  getData: (collection: string, query?: any) => Promise<any[]>;
  setData: (collection: string, id: string, data: any) => Promise<void>;
  
  // UI integration
  registerRoute: (route: PluginRoute) => void;
  registerMenuItem: (item: PluginMenuItem) => void;
  registerWidget: (widget: PluginWidget) => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  
  // Hooks
  addHook: (name: string, handler: (...args: any[]) => any, priority?: number) => void;
  removeHook: (name: string, handler: (...args: any[]) => any) => void;
  doHook: (name: string, ...args: any[]) => any[];
  
  // Storage
  getSetting: (key: string) => any;
  setSetting: (key: string, value: any) => Promise<void>;
  
  // Utilities
  translate: (key: string, options?: any) => string;
  formatDate: (date: Date | string) => string;
  formatNumber: (num: number) => string;
}

export interface PluginConfig {
  pluginsDir?: string;
  allowedTypes?: PluginType[];
  autoActivate?: boolean;
  sandboxMode?: boolean; // Run plugins in isolated context
}
