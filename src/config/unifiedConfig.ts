import { logger } from '@/utils/logging';

/**
 * Unified Configuration System — Thin Orchestrator
 *
 * This file is the backward-compatibility shim that re-exports everything
 * from the focused config modules so that existing imports of the form:
 *   import { X } from '@/config/unifiedConfig'
 * continue to work without any changes.
 *
 * Implementation lives in:
 *  - core.ts            — base types, constants, environment-detection re-exports
 *  - features.ts        — feature flags, defaults, presets
 *  - dataMode.ts        — data mode switching/validation/state (re-exports dataModePolicies)
 *  - configManager.ts   — UnifiedAppConfig interface, UnifiedConfigManager class,
 *                         createDefaultConfig, CONFIG_PRESETS, singleton, utility fns
 */

// ---------------------------------------------------------------------------
// Re-export from focused modules
// ---------------------------------------------------------------------------

// core.ts
export type {
  BackendEnvironment,
  BackendStatus,
  DevelopmentConfig,
  DemoConfig,
  BackendConfig,
  BackendAPIConfig,
  DatabaseConfig,
  ProductionDemoConfigIntegration,
  EnvironmentConfigIntegration,
  AppMode,
} from './core';
export {
  CONFIG_STORAGE_KEY,
  CONFIG_VERSION_KEY,
  BACKEND_STATUS_CACHE_KEY,
  CACHE_DURATION,
  RXDB_DB_NAME,
  RXDB_LEADER_ELECTION_DISABLED,
  RXDB_SETTINGS_COLLECTION_NAME,
  RXDB_SETTINGS_COLLECTION_NAME as SETTINGS_COLLECTION_NAME,
  RXDB_DUMMY_DATA_FLAG_ID,
  RXDB_DUMMY_DATA_FLAG_ID as DUMMY_DATA_FLAG_ID,
} from './core';

// features.ts
export type { FeatureConfig } from './features';
export { DEFAULT_FEATURES, DEFAULT_APP_FEATURE_FLAGS, FEATURE_PRESETS } from './features';

// dataMode.ts (re-exports dataModePolicies)
export type { DataModeSwitchResult, DataModeState } from './dataModePolicies';
export { switchDataMode, validateDataMode, getDataModeState, getStoredDataMode } from './dataModePolicies';

// Static imports to replace require() calls
import { initializeProductionDemo } from './productionDemo';
import { databaseConfigValidator } from './databaseConfigSchema';
import { DB_ENV_VARS } from './databaseEnvVars';
import { detectOptimalConfigurationRuntime } from './environmentRuntime';

// environmentMatrix
export type {
  Environment,
  DataMode,
  DatabaseProvider,
  EnvironmentConfig,
} from './environmentMatrix';

// productionDemo
export type { ProductionDemoConfig, ProductionDemoState } from './productionDemo';

// databaseConfigSchema
export { databaseConfigValidator, DatabaseConfigValidator } from './databaseConfigSchema';
export type { ValidationResult, ValidationError, ValidationWarning } from './databaseConfigSchema';

// databaseEnvVars
export { DB_ENV_VARS } from './databaseEnvVars';

// ---------------------------------------------------------------------------
// Re-export everything from configManager (the bulk of the implementation)
// ---------------------------------------------------------------------------
export type { UnifiedAppConfig } from './configManager';
export {
  createDefaultConfig,
  CONFIG_PRESETS,
  UnifiedConfigManager,
  unifiedConfigManager,
  initUnifiedConfig,
  DEFAULT_UNIFIED_CONFIG,
} from './configManager';

// ---------------------------------------------------------------------------
// Utility functions for backward compatibility
// (These depend on unifiedConfigManager from configManager.ts)
// ---------------------------------------------------------------------------
import { unifiedConfigManager as _mgr } from './configManager';
import type { UnifiedAppConfig } from './configManager';
import type { DataMode, Environment, DatabaseProvider, EnvironmentConfig } from './environmentMatrix';
import type { DataModeState } from './dataModePolicies';
import type { ProductionDemoState } from './productionDemo';
import type { DatabaseConfig } from './core';
import type { FeatureConfig } from './features';
import { validateDataMode } from './dataModePolicies';
import { detectEnvironment } from './environmentMatrix';

export const getAppMode = (): DataMode => _mgr.getConfig().dataMode;

export const getEnvironment = (): Environment => _mgr.getConfig().environment;

export const isDemo = (): boolean => _mgr.getConfig().demo.active;

export const isDemoAvailable = (): boolean => _mgr.getConfig().demo.available;

export const getCurrentUnifiedConfig = (): UnifiedAppConfig => _mgr.getConfig();

export const initializeUnifiedConfig = (): void => {
  const config = _mgr.getConfig();
  if (config.environment === 'production' && config.dataMode === 'demo') {
    initializeProductionDemo(config.environment, config.dataMode);
  }
};

export const getUnifiedDataModeState = (): DataModeState => _mgr.getDataModeState();

export const getUnifiedEnvironmentConfig = (): EnvironmentConfig => _mgr.getEnvironmentConfig();

export const canSwitchModes = (): boolean =>
  _mgr.getConfig().environmentConfig.config.canSwitchDataModes;

export const getAllowedModes = (): DataMode[] =>
  _mgr.getConfig().environmentConfig.config.allowedDataModes;

export const getUnifiedProductionDemoState = (): ProductionDemoState =>
  _mgr.getConfig().productionDemo.state;

export const isProductionDemoAvailable = (): boolean =>
  _mgr.getConfig().productionDemo.transitionAvailable;

export const validateCurrentDataMode = () => {
  const config = _mgr.getConfig();
  return validateDataMode(config.dataMode, config.environment);
};

export const getCurrentDatabaseProvider = (): DatabaseProvider =>
  _mgr.getConfig().database.provider;

export const getAllowedDatabaseProviders = (): DatabaseProvider[] =>
  _mgr.getConfig().database.allowedProviders;

export const getDatabaseConfig = (): DatabaseConfig => _mgr.getDatabaseConfig();

export const updateDatabaseConfig = (updates: Partial<DatabaseConfig>): void =>
  _mgr.updateDatabaseConfig(updates);

export const updateDatabaseProvider = (provider: DatabaseProvider): void =>
  _mgr.updateDatabaseProvider(provider);

export const getDatabaseConfigPresets = (): Record<string, Partial<DatabaseConfig>> =>
  _mgr.getDatabaseConfigPresets();

export const applyDatabaseConfigPreset = (preset: string): void =>
  _mgr.applyDatabaseConfigPreset(preset);

export const validateDatabaseConfig = () => _mgr.validateDatabaseConfig();

export const validateDatabaseConfigEnhanced = () => {
  const config = _mgr.getDatabaseConfig();
  return databaseConfigValidator.validate(config);
};

export const resetDatabaseConfig = (environment?: 'development' | 'staging' | 'production') => {
  const config = _mgr.getDatabaseConfig();
  _mgr.updateDatabaseConfig(config);
  return config;
};

export const reloadConfigFromEnvironment = (): void => _mgr.reloadFromEnvironment();

export const exportDatabaseConfigAsEnvVars = (): Record<string, string> =>
  _mgr.exportDatabaseConfigAsEnvVars();

export const exportDatabaseConfigAsJSON = (): string => _mgr.exportDatabaseConfigAsJSON();

export const getDatabaseEnvVarKeys = () => {
  return DB_ENV_VARS;
};

export const autoFixDatabaseConfig = () => _mgr.autoFixDatabaseConfig();

export const migrateDatabaseConfig = (currentVersion?: string) =>
  _mgr.migrateDatabaseConfig(currentVersion);

export const resetDatabaseConfigToDefaults = () => _mgr.resetDatabaseConfigToDefaults();

export const repairDatabaseConfig = (currentVersion?: string) =>
  _mgr.repairDatabaseConfig(currentVersion);

export const migrateConfigurationToV2 = (): void => {
  const config = _mgr.getConfig();
  if (config.configVersion && config.configVersion.startsWith('2.')) {
    return;
  }
  const detectedEnvironment = detectEnvironment();
  _mgr.updateEnvironment(detectedEnvironment, 'env');
  logger.info('Configuration migrated to v2.0');
};

// Backward compatibility functions (migrated from appConfig.ts)
export const getAppConfig = (): UnifiedAppConfig => _mgr.getConfig();
export const updateAppConfig = (updates: Partial<UnifiedAppConfig>): void =>
  _mgr.updateConfig(updates);
export const isFeatureEnabled = (feature: keyof FeatureConfig): boolean =>
  _mgr.isFeatureEnabled(feature);
export const subscribeToConfig = (
  listener: (config: UnifiedAppConfig) => void,
): (() => void) => _mgr.subscribe(listener);

export const detectOptimalConfiguration = (): Partial<UnifiedAppConfig> => {
  return detectOptimalConfigurationRuntime() as Partial<UnifiedAppConfig>;
};
