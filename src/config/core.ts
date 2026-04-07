/**
 * Core Configuration
 * Environment detection, base types/interfaces, and core config building blocks.
 */

export type {
  Environment,
  DataMode,
  DatabaseProvider,
  EnvironmentConfig,
} from './environmentMatrix';

export {
  detectEnvironment,
  getEnvironmentConfig,
  getDefaultDataMode,
  canSwitchDataModes,
  getAllowedDataModes,
  getDefaultDatabaseProvider,
} from './environmentMatrix';

// ---------------------------------------------------------------------------
// Legacy type for backward compatibility
// ---------------------------------------------------------------------------
export type BackendEnvironment = 'development' | 'production' | 'staging' | 'unknown';

// ---------------------------------------------------------------------------
// Core interfaces
// ---------------------------------------------------------------------------

/** Backend Status Interface */
export interface BackendStatus {
  environment: BackendEnvironment;
  version: string;
  demoModeEnabled: boolean;
  available: boolean;
}

/** Development Settings */
export interface DevelopmentConfig {
  enableDebugMode: boolean;
  enableMockData: boolean;
  enablePerformanceMonitoring: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/** Demo Configuration */
export interface DemoConfig {
  available: boolean;
  active: boolean;
  canToggle: boolean;
  lastActivated?: Date;
}

/** Backend Configuration */
export interface BackendConfig {
  url: string;
  environment: BackendEnvironment;
  available: boolean;
  lastChecked?: Date;
}

/** Backend API Configuration for external system integration */
export interface BackendAPIConfig {
  apiBaseUrl: string;
  apiKey?: string;
  authToken?: string;
  authType?: 'bearer' | 'api-key' | 'basic' | 'custom';
  customHeaders?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  syncInterval?: number;
  batchSize?: number;
  enableOfflineQueue?: boolean;
  conflictResolution?: 'local' | 'remote' | 'manual';
  endpoints?: {
    [collectionName: string]: {
      basePath: string;
      idField?: string;
      timestampField?: string;
      methods?: {
        list?: string;
        get?: string;
        create?: string;
        update?: string;
        delete?: string;
        sync?: string;
      };
      mapping?: {
        [localField: string]: string;
      };
      filters?: Record<string, any>;
    };
  };
}

/** Enhanced Database Configuration */
export interface DatabaseConfig {
  provider: import('./environmentMatrix').DatabaseProvider;
  allowedProviders: import('./environmentMatrix').DatabaseProvider[];
  autoDetect: boolean;
  connectionString?: string;
  options: Record<string, any>;
  apiConfig?: BackendAPIConfig;

  performance: {
    enableIndexing: boolean;
    enableCaching: boolean;
    cacheSize: number; // MB
    queryTimeout: number; // ms
    batchSize: number;
  };

  storage: {
    maxSize: number; // MB, 0 = unlimited
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
    backupEnabled: boolean;
    retentionDays: number;
  };

  sync: {
    enabled: boolean;
    interval: number; // ms
    conflictResolution: 'local' | 'remote' | 'manual' | 'merge';
    batchSize: number;
    retryAttempts: number;
    timeout: number; // ms
  };

  monitoring: {
    enableHealthChecks: boolean;
    healthCheckInterval: number; // ms
    enablePerformanceMetrics: boolean;
    enableErrorReporting: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };

  features: {
    enableFullTextSearch: boolean;
    enableTransactions: boolean;
    enableRealTimeUpdates: boolean;
    enableOfflineMode: boolean;
    enableDataValidation: boolean;
    enableAuditLog: boolean;
  };
}

/** Production Demo Configuration Integration */
export interface ProductionDemoConfigIntegration {
  config: import('./productionDemo').ProductionDemoConfig;
  state: import('./productionDemo').ProductionDemoState;
  transitionAvailable: boolean;
}

/** Environment Configuration Integration */
export interface EnvironmentConfigIntegration {
  current: import('./environmentMatrix').Environment;
  config: import('./environmentMatrix').EnvironmentConfig;
  detectedAutomatically: boolean;
  overrideSource?: 'url' | 'env' | 'manual';
}

// ---------------------------------------------------------------------------
// Storage / version constants (core-level)
// ---------------------------------------------------------------------------
export const CONFIG_STORAGE_KEY = 'unified_app_config';
export const CONFIG_VERSION_KEY = 'unified_app_config_version';
export const BACKEND_STATUS_CACHE_KEY = 'backend_status_cache';
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// RxDB Constants (migrated from config.ts)
export const RXDB_DB_NAME = 'schoolpilot';
export const RXDB_LEADER_ELECTION_DISABLED = true;
export const RXDB_SETTINGS_COLLECTION_NAME = 'app_settings';
export const RXDB_DUMMY_DATA_FLAG_ID = 'using_dummy_data';

// Legacy AppMode type compatibility
export type AppMode = import('./environmentMatrix').DataMode;
