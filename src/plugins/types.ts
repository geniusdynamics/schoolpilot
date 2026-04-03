/**
 * Plugin Types
 * 
 * Type definitions for the plugin system.
 * Enhanced with white-label, marketplace, admin config, and engine types.
 */

import type { ComponentType } from 'react';

// ============================================================================
// Plugin Type Definitions
// ============================================================================

export type PluginType = 
  | 'module'       // Full feature module (e.g., advanced grading)
  | 'theme'        // Visual theme customization
  | 'integration'  // External service integration (e.g., payment gateway)
  | 'report'       // Custom report templates
  | 'widget'       // Dashboard widgets
  | 'whitelabel'   // Branding and label customization
  | 'engine';      // Go-based computation engine (WASM)

export type PluginCategory =
  | 'builtin'      // Shipped with core
  | 'verified'     // Reviewed by SchoolPilot team
  | 'community'    // Third-party
  | 'private'      // Custom per-school
  | 'engine';      // Go WASM binaries

export type HookType = 'action' | 'filter' | 'async';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// ============================================================================
// Plugin Privileges & Security
// ============================================================================

export interface PluginPrivileges {
  // Data access
  dataRead: string[];      // Collections plugin can read
  dataWrite: string[];     // Collections plugin can write
  
  // UI access
  uiInject: boolean;       // Can inject UI components
  menuModify: boolean;     // Can modify navigation menu
  settingsAccess: boolean; // Can access settings
  
  // System access
  networkAccess: boolean;  // Can make external HTTP requests
  fileSystemAccess: boolean; // Can read/write files (limited)
  executeCode: boolean;    // Can execute dynamic code (WASM/scripts)
}

export type PermissionsPreset = 'strict' | 'balanced' | 'permissive';

// ============================================================================
// Plugin Manifest
// ============================================================================

export interface PluginManifest {
  // Required fields
  id: string;                    // Unique identifier: com.company.plugin-name
  name: string;                  // Display name
  version: string;               // Semantic version: 1.0.0
  type: PluginType;              // Plugin type
  entry: string;                 // Entry point: ./index.js or ./index.ts
  
  // Metadata
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  icon?: string;                 // URL or embedded data URL
  category?: PluginCategory;
  
  // Compatibility
  minAppVersion?: string;        // Minimum SchoolPilot version
  maxAppVersion?: string;        // Maximum compatible version
  requires?: string[];           // Plugin dependencies
  conflicts?: string[];          // Incompatible plugins
  
  // Capabilities
  permissions?: string[];        // Requested permissions
  privileges?: Partial<PluginPrivileges>; // Detailed privileges
  hooks?: string[];              // Hooks this plugin uses
  provides?: string[];           // Hooks this plugin provides
  
  // UI Integration
  routes?: PluginRoute[];
  menuItems?: PluginMenuItem[];
  widgets?: PluginWidget[];
  settings?: PluginSetting[];
  
  // Engine-specific (for type: 'engine')
  engine?: {
    wasmFile: string;            // Path to WASM binary
    exports: string[];           // Exported function names
    fallbackBehavior?: 'error' | 'fallback' | 'silent';
  };
  
  // Marketplace metadata
  marketplace?: {
    price?: number;              // Price in USD (0 = free)
    currency?: string;
    featured?: boolean;
    downloads?: number;
    rating?: number;
    reviewCount?: number;
  };
}

// ============================================================================
// White-Label Manifest Extension
// ============================================================================

export interface WhiteLabelManifest extends PluginManifest {
  type: 'whitelabel';
  
  branding: {
    appName?: string;
    tagline?: string;
    logo?: {
      light: string;
      dark: string;
      favicon?: string;
    };
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      text?: string;
    };
    fonts?: {
      heading?: string;
      body?: string;
    };
  };
  
  labelOverrides?: Record<string, string>;
  
  featureVisibility?: {
    hideModules?: string[];
    hideMenuItems?: string[];
    hideBranding?: boolean;
    customFooter?: string;
  };
}

// ============================================================================
// Engine Manifest Extension
// ============================================================================

export interface EngineManifest extends PluginManifest {
  type: 'engine';
  engine: {
    wasmFile: string;
    exports: string[];
    fallbackBehavior?: 'error' | 'fallback' | 'silent';
    memoryLimit?: number;  // In MB
  };
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
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json' | 'color' | 'file';
  defaultValue?: any;
  options?: { label: string; value: any }[];
  required?: boolean;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  module: PluginModule;
  status: PluginStatus;
  error?: string;
  loadedAt: Date;
  installedAt?: Date;
  source: 'builtin' | 'local' | 'marketplace';
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

// ============================================================================
// Plugin Module & Lifecycle
// ============================================================================

export interface PluginLifecycleEvents {
  'plugin:discovered': { plugin: PluginManifest; source: 'marketplace' | 'local' };
  'plugin:download:start': { pluginId: string };
  'plugin:download:progress': { pluginId: string; progress: number };
  'plugin:download:complete': { pluginId: string; path: string };
  'plugin:download:error': { pluginId: string; error: Error };
  'plugin:validate:start': { pluginId: string };
  'plugin:validate:success': { pluginId: string };
  'plugin:validate:error': { pluginId: string; errors: string[] };
  'plugin:install:start': { pluginId: string };
  'plugin:install:complete': { pluginId: string };
  'plugin:activate:start': { pluginId: string };
  'plugin:activate:complete': { pluginId: string };
  'plugin:activate:error': { pluginId: string; error: Error };
  'plugin:deactivate:start': { pluginId: string };
  'plugin:deactivate:complete': { pluginId: string };
  'plugin:uninstall:start': { pluginId: string };
  'plugin:uninstall:complete': { pluginId: string };
}

export interface PluginModule {
  install?: (context: PluginContext) => Promise<void> | void;
  uninstall?: (context: PluginContext) => Promise<void> | void;
  activate?: (context: PluginContext) => Promise<void> | void;
  deactivate?: (context: PluginContext) => Promise<void> | void;
  components?: Record<string, ComponentType<any>>;
  hooks?: Record<string, (...args: any[]) => any>;
  api?: Record<string, any>;
  routes?: PluginRoute[];
  menuItems?: PluginMenuItem[];
  widgets?: PluginWidget[];
}

// ============================================================================
// Admin Configuration
// ============================================================================

export interface AdminPluginConfig {
  // Master switch
  pluginsEnabled: boolean;
  
  // Marketplace settings
  marketplace: {
    enabled: boolean;
    marketplaceKey?: string;
    allowFreePlugins: boolean;
    allowPaidPlugins: boolean;
    requireApprovalForInstall: boolean;
  };
  
  // Plugin loading settings
  loading: {
    allowLocalPlugins: boolean;
    allowUnsignedPlugins: boolean;
    allowedTypes: PluginType[];
    maxInstalledPlugins: number;
  };
  
  // Security settings
  security: {
    sandboxEnabled: boolean;
    networkWhitelist: string[];
    permissionsPreset: PermissionsPreset;
  };
  
  // Per-plugin overrides
  pluginOverrides: Record<string, {
    enabled: boolean;
    permissions?: Partial<PluginPrivileges>;
  }>;
}

// ============================================================================
// Marketplace Integration
// ============================================================================

export interface MarketplaceKeyConfig {
  key: string;
  instanceId: string;
  activatedAt: string;
  plan: 'free' | 'standard' | 'enterprise';
  permissions: {
    accessMarketplace: boolean;
    installFreePlugins: boolean;
    installPaidPlugins: boolean;
    maxPlugins: number;
    prioritySupport: boolean;
  };
  tracking: {
    reportingEnabled: boolean;
    analyticsEnabled: boolean;
  };
}

export interface MarketplacePlugin {
  manifest: PluginManifest;
  downloadUrl: string;
  signature: PluginSignature;
  rating: number;
  downloads: number;
  reviews: PluginReview[];
  installed?: boolean;
  updateAvailable?: boolean;
}

export interface PluginSignature {
  algorithm: 'RS256' | 'ES256';
  publicKey: string;
  signature: string;
  timestamp: string;
  expiresAt: string;
}

export interface PluginReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
  verified: boolean;
}

export interface MarketplaceClientConfig {
  registryUrl: string;
  marketplaceKey?: string;
  instanceId: string;
  cacheTimeout?: number;
}

// ============================================================================
// Plugin Configuration
// ============================================================================

export interface PluginConfig {
  pluginsDir?: string;
  allowedTypes?: PluginType[];
  autoActivate?: boolean;
  sandboxMode?: boolean;
  adminConfig?: AdminPluginConfig;
  marketplaceConfig?: MarketplaceClientConfig;
}

// ============================================================================
// Hook System Types
// ============================================================================

export interface HookDefinition {
  name: string;
  type: HookType;
  description: string;
  parameters: string[];
  returnType?: string;
}

export interface PluginHookHandler {
  pluginId: string;
  priority: number;
  handler: (...args: any[]) => any;
}

export interface PluginHook {
  name: string;
  handlers: PluginHookHandler[];
}

// ============================================================================
// Utility Types
// ============================================================================

export type PluginStatus = 'unloaded' | 'loaded' | 'active' | 'inactive' | 'error' | 'installing' | 'updating';

export interface PluginInstallResult {
  success: boolean;
  plugin?: LoadedPlugin;
  error?: string;
  requiresRestart?: boolean;
}

export interface PluginUpdateInfo {
  pluginId: string;
  currentVersion: string;
  latestVersion: string;
  changelog?: string;
  securityUpdate: boolean;
  breaking: boolean;
}
