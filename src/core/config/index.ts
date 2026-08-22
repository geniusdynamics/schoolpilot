// src/core/config/index.ts
// ABOUTME: Barrel exports for core configuration
//
// ABOUTME: Legacy re-export point. src/config/ is the canonical source.
// New code should import from '@/config/' directly.
// Existing imports from 'core/config' continue to work via re-exports below.

export * from './coreConfig';
export * from './settingsRegistry';

// ---------------------------------------------------------------------------
// Re-exports from canonical config module (src/config/)
// These make src/config/ the single source of truth without breaking
// any existing consumers that import from src/core/config/.
// ---------------------------------------------------------------------------

// Environment types and detection (from environmentMatrix.ts)
export type {
  Environment,
  DataMode,
  DatabaseProvider,
  EnvironmentConfig,
} from '../../config/environmentMatrix';
export {
  detectEnvironment,
  getEnvironmentConfig,
  getDefaultDataMode,
  canSwitchDataModes,
  getAllowedDataModes,
  getDefaultDatabaseProvider,
} from '../../config/environmentMatrix';

// Core interfaces and constants (from core.ts)
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
} from '../../config/core';
export {
  CONFIG_STORAGE_KEY,
  CONFIG_VERSION_KEY,
  BACKEND_STATUS_CACHE_KEY,
  CACHE_DURATION,
  RXDB_DB_NAME,
  RXDB_LEADER_ELECTION_DISABLED,
  RXDB_SETTINGS_COLLECTION_NAME,
  RXDB_DUMMY_DATA_FLAG_ID,
} from '../../config/core';

// Feature flags (from features.ts)
export type {
  FeatureConfig,
  FeatureFlags,
} from '../../config/features';
export {
  DEFAULT_FEATURES,
  DEFAULT_APP_FEATURE_FLAGS,
  FEATURE_PRESETS,
  features,
  isEnabled,
  isDisabled,
  requireFeature,
  getFeatureStatus,
  logFeatureStatus,
} from '../../config/features';

// Data mode management (from dataModePolicies.ts)
export type {
  DataModeSwitchResult,
  DataModeState,
} from '../../config/dataModePolicies';
export {
  switchDataMode,
  validateDataMode,
  getDataModeState,
  getStoredDataMode,
} from '../../config/dataModePolicies';

// Production demo (from productionDemo.ts)
export type {
  ProductionDemoConfig,
  ProductionDemoState,
} from '../../config/productionDemo';

// Database config schema (from databaseConfigSchema.ts)
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../../config/databaseConfigSchema';
export {
  databaseConfigValidator,
  DatabaseConfigValidator,
} from '../../config/databaseConfigSchema';

// Database env vars (from databaseEnvVars.ts)
export { DB_ENV_VARS } from '../../config/databaseEnvVars';

// Unified config manager and utilities (from configManager.ts via unifiedConfig.ts)
export type { UnifiedAppConfig } from '../../config/configManager';
export {
  createDefaultConfig,
  CONFIG_PRESETS,
  UnifiedConfigManager,
  unifiedConfigManager,
  initUnifiedConfig,
  DEFAULT_UNIFIED_CONFIG,
  getAppMode,
  getEnvironment,
  isDemo,
  isDemoAvailable,
  getCurrentUnifiedConfig,
  initializeUnifiedConfig,
  getUnifiedDataModeState,
  getUnifiedEnvironmentConfig,
  canSwitchModes,
  getAllowedModes,
  getUnifiedProductionDemoState,
  isProductionDemoAvailable,
  validateCurrentDataMode,
  getCurrentDatabaseProvider,
  getAllowedDatabaseProviders,
  getDatabaseConfig,
  updateDatabaseConfig,
  updateDatabaseProvider,
  getDatabaseConfigPresets,
  applyDatabaseConfigPreset,
  validateDatabaseConfig,
  reloadConfigFromEnvironment,
  exportDatabaseConfigAsEnvVars,
  exportDatabaseConfigAsJSON,
  getDatabaseEnvVarKeys,
  autoFixDatabaseConfig,
  migrateDatabaseConfig,
  resetDatabaseConfigToDefaults,
  repairDatabaseConfig,
  migrateConfigurationToV2,
  getAppConfig,
  updateAppConfig,
  subscribeToConfig,
} from '../../config/unifiedConfig';
