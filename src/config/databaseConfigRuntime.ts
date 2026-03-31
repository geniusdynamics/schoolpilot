// ABOUTME: Runtime helpers for reading and exporting database configuration values.
// ABOUTME: Keeps env/file parsing separate while preserving unifiedConfig facade behavior.

import { DB_ENV_VARS } from './databaseEnvVars';
import { DatabaseProvider } from './environmentMatrix';

type RuntimeConflictResolution = 'local' | 'remote' | 'manual' | 'merge';
type RuntimeLogLevel = 'debug' | 'info' | 'warn' | 'error';
type RuntimeAuthType = 'bearer' | 'api-key' | 'basic' | 'custom';

interface RuntimeBackendApiConfig {
  apiBaseUrl: string;
  apiKey?: string;
  authToken?: string;
  authType?: RuntimeAuthType;
  timeout?: number;
}

interface RuntimeDatabaseConfig {
  provider: DatabaseProvider;
  autoDetect: boolean;
  connectionString?: string;
  performance: {
    enableIndexing: boolean;
    enableCaching: boolean;
    cacheSize: number;
    queryTimeout: number;
    batchSize: number;
  };
  storage: {
    maxSize: number;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
    backupEnabled: boolean;
    retentionDays: number;
  };
  sync: {
    enabled: boolean;
    interval: number;
    conflictResolution: RuntimeConflictResolution;
    batchSize: number;
    retryAttempts: number;
    timeout: number;
  };
  monitoring: {
    enableHealthChecks: boolean;
    healthCheckInterval: number;
    enablePerformanceMetrics: boolean;
    enableErrorReporting: boolean;
    logLevel: RuntimeLogLevel;
  };
  features: {
    enableFullTextSearch: boolean;
    enableTransactions: boolean;
    enableRealTimeUpdates: boolean;
    enableOfflineMode: boolean;
    enableDataValidation: boolean;
    enableAuditLog: boolean;
  };
  apiConfig?: RuntimeBackendApiConfig;
}

const readBooleanEnv = (value: string | undefined): boolean | undefined => {
  if (!value) {
    return undefined;
  }
  return value === 'true';
};

const readIntEnv = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  return parseInt(value, 10);
};

export function loadDatabaseConfigFromEnvironment(): Partial<RuntimeDatabaseConfig> {
  const config: Partial<RuntimeDatabaseConfig> = {};

  if (process.env[DB_ENV_VARS.DATABASE_PROVIDER]) {
    config.provider = process.env[DB_ENV_VARS.DATABASE_PROVIDER] as DatabaseProvider;
  }

  if (process.env[DB_ENV_VARS.DATABASE_AUTO_DETECT]) {
    config.autoDetect = process.env[DB_ENV_VARS.DATABASE_AUTO_DETECT] === 'true';
  }

  if (process.env[DB_ENV_VARS.DATABASE_URL] || process.env.DATABASE_URL) {
    config.connectionString = process.env[DB_ENV_VARS.DATABASE_URL] || process.env.DATABASE_URL;
  }

  const performance: Partial<RuntimeDatabaseConfig['performance']> = {};
  const cacheSize = readIntEnv(process.env[DB_ENV_VARS.DATABASE_CACHE_SIZE]);
  const queryTimeout = readIntEnv(process.env[DB_ENV_VARS.DATABASE_QUERY_TIMEOUT]);
  const batchSize = readIntEnv(process.env[DB_ENV_VARS.DATABASE_BATCH_SIZE]);
  const enableCaching = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_ENABLE_CACHING]);
  const enableIndexing = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_ENABLE_INDEXING]);

  if (cacheSize !== undefined) {
    performance.cacheSize = cacheSize;
  }
  if (queryTimeout !== undefined) {
    performance.queryTimeout = queryTimeout;
  }
  if (batchSize !== undefined) {
    performance.batchSize = batchSize;
  }
  if (enableCaching !== undefined) {
    performance.enableCaching = enableCaching;
  }
  if (enableIndexing !== undefined) {
    performance.enableIndexing = enableIndexing;
  }

  if (Object.keys(performance).length > 0) {
    config.performance = performance as RuntimeDatabaseConfig['performance'];
  }

  const storage: Partial<RuntimeDatabaseConfig['storage']> = {};
  const maxSize = readIntEnv(process.env[DB_ENV_VARS.DATABASE_MAX_SIZE]);
  const compressionEnabled = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_COMPRESSION]);
  const encryptionEnabled = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_ENCRYPTION]);
  const backupEnabled = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_BACKUP]);
  const retentionDays = readIntEnv(process.env[DB_ENV_VARS.DATABASE_RETENTION_DAYS]);

  if (maxSize !== undefined) {
    storage.maxSize = maxSize;
  }
  if (compressionEnabled !== undefined) {
    storage.compressionEnabled = compressionEnabled;
  }
  if (encryptionEnabled !== undefined) {
    storage.encryptionEnabled = encryptionEnabled;
  }
  if (backupEnabled !== undefined) {
    storage.backupEnabled = backupEnabled;
  }
  if (retentionDays !== undefined) {
    storage.retentionDays = retentionDays;
  }

  if (Object.keys(storage).length > 0) {
    config.storage = storage as RuntimeDatabaseConfig['storage'];
  }

  const sync: Partial<RuntimeDatabaseConfig['sync']> = {};
  const syncEnabled = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_SYNC_ENABLED]);
  const syncInterval = readIntEnv(process.env[DB_ENV_VARS.DATABASE_SYNC_INTERVAL]);
  const syncRetryAttempts = readIntEnv(process.env[DB_ENV_VARS.DATABASE_SYNC_RETRY_ATTEMPTS]);
  const syncTimeout = readIntEnv(process.env[DB_ENV_VARS.DATABASE_SYNC_TIMEOUT]);
  const syncConflictResolution = process.env[DB_ENV_VARS.DATABASE_SYNC_CONFLICT_RESOLUTION];

  if (syncEnabled !== undefined) {
    sync.enabled = syncEnabled;
  }
  if (syncInterval !== undefined) {
    sync.interval = syncInterval;
  }
  if (syncConflictResolution) {
    sync.conflictResolution = syncConflictResolution as RuntimeConflictResolution;
  }
  if (syncRetryAttempts !== undefined) {
    sync.retryAttempts = syncRetryAttempts;
  }
  if (syncTimeout !== undefined) {
    sync.timeout = syncTimeout;
  }

  if (Object.keys(sync).length > 0) {
    config.sync = sync as RuntimeDatabaseConfig['sync'];
  }

  const monitoring: Partial<RuntimeDatabaseConfig['monitoring']> = {};
  const enableHealthChecks = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_HEALTH_CHECKS]);
  const healthCheckInterval = readIntEnv(process.env[DB_ENV_VARS.DATABASE_HEALTH_CHECK_INTERVAL]);
  const enablePerformanceMetrics = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_PERFORMANCE_METRICS]);
  const enableErrorReporting = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_ERROR_REPORTING]);
  const logLevel = process.env[DB_ENV_VARS.DATABASE_LOG_LEVEL];

  if (enableHealthChecks !== undefined) {
    monitoring.enableHealthChecks = enableHealthChecks;
  }
  if (healthCheckInterval !== undefined) {
    monitoring.healthCheckInterval = healthCheckInterval;
  }
  if (enablePerformanceMetrics !== undefined) {
    monitoring.enablePerformanceMetrics = enablePerformanceMetrics;
  }
  if (enableErrorReporting !== undefined) {
    monitoring.enableErrorReporting = enableErrorReporting;
  }
  if (logLevel) {
    monitoring.logLevel = logLevel as RuntimeLogLevel;
  }

  if (Object.keys(monitoring).length > 0) {
    config.monitoring = monitoring as RuntimeDatabaseConfig['monitoring'];
  }

  const features: Partial<RuntimeDatabaseConfig['features']> = {};
  const enableFullTextSearch = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_FULL_TEXT_SEARCH]);
  const enableTransactions = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_TRANSACTIONS]);
  const enableRealTimeUpdates = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_REAL_TIME_UPDATES]);
  const enableOfflineMode = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_OFFLINE_MODE]);
  const enableDataValidation = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_DATA_VALIDATION]);
  const enableAuditLog = readBooleanEnv(process.env[DB_ENV_VARS.DATABASE_AUDIT_LOG]);

  if (enableFullTextSearch !== undefined) {
    features.enableFullTextSearch = enableFullTextSearch;
  }
  if (enableTransactions !== undefined) {
    features.enableTransactions = enableTransactions;
  }
  if (enableRealTimeUpdates !== undefined) {
    features.enableRealTimeUpdates = enableRealTimeUpdates;
  }
  if (enableOfflineMode !== undefined) {
    features.enableOfflineMode = enableOfflineMode;
  }
  if (enableDataValidation !== undefined) {
    features.enableDataValidation = enableDataValidation;
  }
  if (enableAuditLog !== undefined) {
    features.enableAuditLog = enableAuditLog;
  }

  if (Object.keys(features).length > 0) {
    config.features = features as RuntimeDatabaseConfig['features'];
  }

  if (
    process.env[DB_ENV_VARS.DATABASE_API_BASE_URL] ||
    process.env[DB_ENV_VARS.DATABASE_API_KEY] ||
    process.env[DB_ENV_VARS.DATABASE_API_AUTH_TOKEN]
  ) {
    config.apiConfig = {
      apiBaseUrl: process.env[DB_ENV_VARS.DATABASE_API_BASE_URL] || '',
      apiKey: process.env[DB_ENV_VARS.DATABASE_API_KEY],
      authToken: process.env[DB_ENV_VARS.DATABASE_API_AUTH_TOKEN],
      authType: (process.env[DB_ENV_VARS.DATABASE_API_AUTH_TYPE] as RuntimeAuthType) || 'bearer',
      timeout: process.env[DB_ENV_VARS.DATABASE_API_TIMEOUT]
        ? parseInt(process.env[DB_ENV_VARS.DATABASE_API_TIMEOUT], 10)
        : undefined,
    };
  }

  return config;
}

export async function loadDatabaseConfigFromFile(
  fetcher: typeof fetch = fetch,
): Promise<Partial<RuntimeDatabaseConfig>> {
  try {
    const response = await fetcher('/database-config.json');
    if (response.ok) {
      const config = await response.json();
      console.log('📁 [UnifiedConfig] Loaded database configuration from file');
      return config;
    }
  } catch {
    console.log('📁 [UnifiedConfig] No database configuration file found');
  }

  return {};
}

export function exportDatabaseConfigToEnvVars(config: RuntimeDatabaseConfig): Record<string, string> {
  const envVars: Record<string, string> = {};

  if (config.provider) {
    envVars[DB_ENV_VARS.DATABASE_PROVIDER] = config.provider;
  }
  if (config.autoDetect !== undefined) {
    envVars[DB_ENV_VARS.DATABASE_AUTO_DETECT] = config.autoDetect.toString();
  }
  if (config.connectionString) {
    envVars[DB_ENV_VARS.DATABASE_URL] = config.connectionString;
  }

  envVars[DB_ENV_VARS.DATABASE_CACHE_SIZE] = config.performance.cacheSize.toString();
  envVars[DB_ENV_VARS.DATABASE_QUERY_TIMEOUT] = config.performance.queryTimeout.toString();
  envVars[DB_ENV_VARS.DATABASE_BATCH_SIZE] = config.performance.batchSize.toString();
  envVars[DB_ENV_VARS.DATABASE_ENABLE_CACHING] = config.performance.enableCaching.toString();
  envVars[DB_ENV_VARS.DATABASE_ENABLE_INDEXING] = config.performance.enableIndexing.toString();

  envVars[DB_ENV_VARS.DATABASE_MAX_SIZE] = config.storage.maxSize.toString();
  envVars[DB_ENV_VARS.DATABASE_COMPRESSION] = config.storage.compressionEnabled.toString();
  envVars[DB_ENV_VARS.DATABASE_ENCRYPTION] = config.storage.encryptionEnabled.toString();
  envVars[DB_ENV_VARS.DATABASE_BACKUP] = config.storage.backupEnabled.toString();
  envVars[DB_ENV_VARS.DATABASE_RETENTION_DAYS] = config.storage.retentionDays.toString();

  envVars[DB_ENV_VARS.DATABASE_SYNC_ENABLED] = config.sync.enabled.toString();
  envVars[DB_ENV_VARS.DATABASE_SYNC_INTERVAL] = config.sync.interval.toString();
  envVars[DB_ENV_VARS.DATABASE_SYNC_CONFLICT_RESOLUTION] = config.sync.conflictResolution;
  envVars[DB_ENV_VARS.DATABASE_SYNC_RETRY_ATTEMPTS] = config.sync.retryAttempts.toString();
  envVars[DB_ENV_VARS.DATABASE_SYNC_TIMEOUT] = config.sync.timeout.toString();

  envVars[DB_ENV_VARS.DATABASE_HEALTH_CHECKS] = config.monitoring.enableHealthChecks.toString();
  envVars[DB_ENV_VARS.DATABASE_HEALTH_CHECK_INTERVAL] = config.monitoring.healthCheckInterval.toString();
  envVars[DB_ENV_VARS.DATABASE_PERFORMANCE_METRICS] = config.monitoring.enablePerformanceMetrics.toString();
  envVars[DB_ENV_VARS.DATABASE_ERROR_REPORTING] = config.monitoring.enableErrorReporting.toString();
  envVars[DB_ENV_VARS.DATABASE_LOG_LEVEL] = config.monitoring.logLevel;

  envVars[DB_ENV_VARS.DATABASE_FULL_TEXT_SEARCH] = config.features.enableFullTextSearch.toString();
  envVars[DB_ENV_VARS.DATABASE_TRANSACTIONS] = config.features.enableTransactions.toString();
  envVars[DB_ENV_VARS.DATABASE_REAL_TIME_UPDATES] = config.features.enableRealTimeUpdates.toString();
  envVars[DB_ENV_VARS.DATABASE_OFFLINE_MODE] = config.features.enableOfflineMode.toString();
  envVars[DB_ENV_VARS.DATABASE_DATA_VALIDATION] = config.features.enableDataValidation.toString();
  envVars[DB_ENV_VARS.DATABASE_AUDIT_LOG] = config.features.enableAuditLog.toString();

  if (config.apiConfig) {
    if (config.apiConfig.apiBaseUrl) {
      envVars[DB_ENV_VARS.DATABASE_API_BASE_URL] = config.apiConfig.apiBaseUrl;
    }
    if (config.apiConfig.apiKey) {
      envVars[DB_ENV_VARS.DATABASE_API_KEY] = config.apiConfig.apiKey;
    }
    if (config.apiConfig.authToken) {
      envVars[DB_ENV_VARS.DATABASE_API_AUTH_TOKEN] = config.apiConfig.authToken;
    }
    if (config.apiConfig.authType) {
      envVars[DB_ENV_VARS.DATABASE_API_AUTH_TYPE] = config.apiConfig.authType;
    }
    if (config.apiConfig.timeout) {
      envVars[DB_ENV_VARS.DATABASE_API_TIMEOUT] = config.apiConfig.timeout.toString();
    }
  }

  return envVars;
}
