/**
 * Feature Flags Configuration
 * 
 * This module provides feature flags for gradual rollout of modularity improvements.
 * All flags default to false (current behavior) to ensure backward compatibility.
 * 
 * To enable a feature, set the corresponding environment variable to 'true':
 *   VITE_USE_SHARED_DATA_HOOK=true npm run dev
 * 
 * Or add to your .env file:
 *   VITE_USE_SHARED_DATA_HOOK=true
 * 
 * @module config/features
 */

/**
 * Application feature flags interface (legacy compatibility)
 */
export interface FeatureConfig {
  enableAdvancedReporting: boolean;
  enableBulkOperations: boolean;
  enableDataExport: boolean;
  enableNotifications: boolean;
  enableAuditLog: boolean;
  enableMultiTenant: boolean;
  enableOfflineMode: boolean;
  enableRealTimeSync: boolean;
  enablePerformanceMonitoring: boolean;
  enhancedDataLayer: boolean;
  networkStatusIndicator: boolean;
  moduleHealthIndicator: boolean;
  syncStatusComponent: boolean;
  globalNotifications: boolean;
  performanceOptimizations: boolean;
  advancedErrorBoundaries: boolean;
  performanceMonitorWidget: boolean;
  enableTabbedMode: boolean;
  enablePerModuleControl: boolean;
  tabbedModeModuleOverrides: Record<string, boolean>;
}

/**
 * Default feature configuration
 */
export const DEFAULT_FEATURES: FeatureConfig = {
  enableAdvancedReporting: false,
  enableBulkOperations: true,
  enableDataExport: true,
  enableNotifications: true,
  enableAuditLog: false,
  enableMultiTenant: false,
  enableOfflineMode: true,
  enableRealTimeSync: false,
  enablePerformanceMonitoring: false,
  enhancedDataLayer: true,
  networkStatusIndicator: false,
  moduleHealthIndicator: false,
  syncStatusComponent: false,
  globalNotifications: false,
  performanceOptimizations: true,
  advancedErrorBoundaries: true,
  performanceMonitorWidget: false,
  enableTabbedMode: true,
  enablePerModuleControl: true,
  tabbedModeModuleOverrides: {},
};

/**
 * Feature flag presets for different environments
 */
export const FEATURE_PRESETS = {
  development: {
    enableAdvancedReporting: true,
    enablePerformanceMonitoring: true,
    networkStatusIndicator: true,
    moduleHealthIndicator: true,
    syncStatusComponent: true,
    globalNotifications: true,
    performanceMonitorWidget: true,
  },
  demo: {
    enableAdvancedReporting: true,
    enableAuditLog: true,
    enableRealTimeSync: true,
    enablePerformanceMonitoring: true,
    networkStatusIndicator: true,
    moduleHealthIndicator: true,
    syncStatusComponent: true,
    globalNotifications: true,
    performanceMonitorWidget: true,
  },
  enhanced: {
    enableAdvancedReporting: true,
    enableAuditLog: true,
    enablePerformanceMonitoring: true,
  },
  production: DEFAULT_FEATURES,
};

/**
 * Default feature flags for app-wide usage
 */
export const DEFAULT_APP_FEATURE_FLAGS = DEFAULT_FEATURES;

/**
 * Feature flags interface (modularity)
 */
export interface FeatureFlags {
  /**
   * Enable useSharedData hook for cross-module data access.
   * 
   * When false (default): Modules use direct imports from other modules.
   * When true: Modules use useSharedData() hook for accessing shared entities.
   * 
   * @default false
   */
  useSharedDataHook: boolean;
  
  /**
   * Enable module.json metadata system.
   * 
   * When false (default): Module metadata comes from moduleDefinition.tsx only.
   * When true: Additional metadata loaded from module.json files.
   * 
   * @default false
   */
  useModuleMetadata: boolean;
  
  /**
   * Enable schema auto-registration.
   * 
   * When false (default): Schemas manually registered in collections.ts.
   * When true: Schemas auto-discovered from module schema.ts files.
   * 
   * @default false
   */
  useSchemaAutoRegistration: boolean;
  
  /**
   * Enable module migration system.
   * 
   * When false (default): No migrations run (current behavior).
   * When true: Module migrations run on application startup.
   * 
   * @default false
   */
  useModuleMigrations: boolean;
  
  /**
   * Enable strict module isolation.
   * 
   * When false (default): Cross-module imports allowed with warnings.
   * When true: Cross-module imports throw errors (enforced at runtime).
   * 
   * @default false
   */
  strictModuleIsolation: boolean;
  
  /**
   * Enable module deprecation warnings.
   * 
   * When true: Console warnings shown for cross-module imports.
   * 
   * @default true in development
   */
  enableDeprecationWarnings: boolean;
}

/**
 * Parse environment variable as boolean
 */
function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Feature flags instance
 * Values are read from environment variables at startup
 */
export const features: FeatureFlags = {
  useSharedDataHook: parseEnvBoolean(
    import.meta.env?.VITE_USE_SHARED_DATA_HOOK,
    false
  ),
  useModuleMetadata: parseEnvBoolean(
    import.meta.env?.VITE_USE_MODULE_METADATA,
    false
  ),
  useSchemaAutoRegistration: parseEnvBoolean(
    import.meta.env?.VITE_USE_SCHEMA_AUTO_REGISTRATION,
    false
  ),
  useModuleMigrations: parseEnvBoolean(
    import.meta.env?.VITE_USE_MODULE_MIGRATIONS,
    false
  ),
  strictModuleIsolation: parseEnvBoolean(
    import.meta.env?.VITE_STRICT_MODULE_ISOLATION,
    false
  ),
  enableDeprecationWarnings: parseEnvBoolean(
    import.meta.env?.VITE_ENABLE_DEPRECATION_WARNINGS,
    import.meta.env?.DEV ?? true
  ),
};

/**
 * Check if a feature is enabled
 * 
 * @param feature - Feature flag name
 * @returns True if feature is enabled
 * 
 * @example
 * ```typescript
 * if (isEnabled('useSharedDataHook')) {
 *   // Use new shared data hook
 * } else {
 *   // Use legacy approach
 * }
 * ```
 */
export function isEnabled<K extends keyof FeatureFlags>(feature: K): boolean {
  return features[feature];
}

/**
 * Check if a feature is disabled
 * 
 * @param feature - Feature flag name
 * @returns True if feature is disabled
 */
export function isDisabled<K extends keyof FeatureFlags>(feature: K): boolean {
  return !features[feature];
}

/**
 * Require a feature to be enabled
 * Throws error if feature is disabled
 * 
 * @param feature - Feature flag name
 * @throws Error if feature is disabled
 */
export function requireFeature<K extends keyof FeatureFlags>(feature: K): void {
  if (!features[feature]) {
    throw new Error(
      `Feature "${feature}" is required but disabled. ` +
      `Enable it by setting VITE_${feature.toUpperCase()}=true`
    );
  }
}

/**
 * Get all feature flags status
 * Useful for debugging and logging
 */
export function getFeatureStatus(): Record<keyof FeatureFlags, boolean> {
  return { ...features };
}

/**
 * Log feature flags status to console
 * Called during application startup
 */
export function logFeatureStatus(): void {
  console.log('🔧 Feature Flags:');
  for (const [key, value] of Object.entries(features)) {
    const status = value ? '✅ enabled' : '⬜ disabled';
    console.log(`   ${key}: ${status}`);
  }
}

// Log feature status in development
if (import.meta.env?.DEV) {
  logFeatureStatus();
}

export default features;
