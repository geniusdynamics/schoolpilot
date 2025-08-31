/**
 * Production LiveStore Configuration
 * 
 * This file contains production-specific configuration for LiveStore
 * integration including sync endpoints, performance settings, and
 * deployment-specific options.
 * 
 * Features:
 * - Sync endpoint configuration
 * - Performance optimization settings
 * - Cross-tab persistence
 * - Error handling and recovery
 * - Monitoring and analytics
 */

// Production LiveStore configuration interface
export interface ProductionLiveStoreConfig {
  // Core configuration
  database: {
    name: string;
    version: number;
    opfsStorage: boolean;
    wasmSqlite: boolean;
    crossTabPersistence: boolean;
    autoCompaction: boolean;
  };
  
  // Sync configuration
  sync: {
    enabled: boolean;
    endpoint?: string;
    apiKey?: string;
    syncInterval: number; // milliseconds
    conflictResolution: 'client-wins' | 'server-wins' | 'last-write-wins';
    batchSize: number;
    retryAttempts: number;
    retryDelay: number; // milliseconds
  };
  
  // Performance settings
  performance: {
    cacheSize: number; // MB
    queryTimeout: number; // milliseconds
    transactionTimeout: number; // milliseconds
    maxConcurrentConnections: number;
    enableIndexing: boolean;
    enableCompression: boolean;
  };
  
  // Monitoring and analytics
  monitoring: {
    enabled: boolean;
    errorReporting: boolean;
    performanceMetrics: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  
  // Security settings
  security: {
    enableEncryption: boolean;
    encryptionKey?: string;
    enableDataValidation: boolean;
    enableAccessControl: boolean;
  };
  
  // Recovery settings
  recovery: {
    enableAutoBackup: boolean;
    backupInterval: number; // milliseconds
    maxBackupFiles: number;
    enableRecoveryMode: boolean;
  };
}

// Default production configuration
export const DEFAULT_PRODUCTION_CONFIG: ProductionLiveStoreConfig = {
  database: {
    name: 'schoolpilot_production',
    version: 1,
    opfsStorage: true,
    wasmSqlite: true,
    crossTabPersistence: true,
    autoCompaction: true
  },
  
  sync: {
    enabled: false, // Disable by default until backend is available
    endpoint: process.env.REACT_APP_SYNC_ENDPOINT,
    apiKey: process.env.REACT_APP_API_KEY,
    syncInterval: 30000, // 30 seconds
    conflictResolution: 'last-write-wins',
    batchSize: 100,
    retryAttempts: 3,
    retryDelay: 5000 // 5 seconds
  },
  
  performance: {
    cacheSize: 200, // MB
    queryTimeout: 10000, // 10 seconds
    transactionTimeout: 30000, // 30 seconds
    maxConcurrentConnections: 10,
    enableIndexing: true,
    enableCompression: true
  },
  
  monitoring: {
    enabled: true,
    errorReporting: true,
    performanceMetrics: true,
    logLevel: 'error' // Only log errors in production
  },
  
  security: {
    enableEncryption: false, // Can be enabled when needed
    encryptionKey: process.env.REACT_APP_ENCRYPTION_KEY,
    enableDataValidation: true,
    enableAccessControl: true
  },
  
  recovery: {
    enableAutoBackup: true,
    backupInterval: 24 * 60 * 60 * 1000, // 24 hours
    maxBackupFiles: 7, // Keep 1 week of backups
    enableRecoveryMode: true
  }
};

// Environment-specific configurations
export const ENVIRONMENT_CONFIGS = {
  development: {
    ...DEFAULT_PRODUCTION_CONFIG,
    database: {
      ...DEFAULT_PRODUCTION_CONFIG.database,
      name: 'schoolpilot_development'
    },
    sync: {
      ...DEFAULT_PRODUCTION_CONFIG.sync,
      enabled: false, // No sync in development
      syncInterval: 60000 // 1 minute for testing
    },
    performance: {
      ...DEFAULT_PRODUCTION_CONFIG.performance,
      cacheSize: 50, // MB - smaller for development
      enableCompression: false // Disable for faster development
    },
    monitoring: {
      ...DEFAULT_PRODUCTION_CONFIG.monitoring,
      logLevel: 'debug' as const // Full logging in development
    },
    security: {
      ...DEFAULT_PRODUCTION_CONFIG.security,
      enableEncryption: false,
      enableDataValidation: true
    }
  },
  
  staging: {
    ...DEFAULT_PRODUCTION_CONFIG,
    database: {
      ...DEFAULT_PRODUCTION_CONFIG.database,
      name: 'schoolpilot_staging'
    },
    sync: {
      ...DEFAULT_PRODUCTION_CONFIG.sync,
      enabled: true, // Enable sync for staging testing
      syncInterval: 15000, // 15 seconds for more frequent testing
      endpoint: process.env.REACT_APP_STAGING_SYNC_ENDPOINT
    },
    monitoring: {
      ...DEFAULT_PRODUCTION_CONFIG.monitoring,
      logLevel: 'info' as const // More verbose logging in staging
    }
  },
  
  production: DEFAULT_PRODUCTION_CONFIG
};

/**
 * Get LiveStore configuration for current environment
 */
export function getLiveStoreConfig(environment: 'development' | 'staging' | 'production' = 'production'): ProductionLiveStoreConfig {
  const config = ENVIRONMENT_CONFIGS[environment];
  
  // Validate required configuration
  if (config.sync.enabled && !config.sync.endpoint) {
    console.warn('[LiveStore] Sync is enabled but no endpoint configured - disabling sync');
    config.sync.enabled = false;
  }
  
  console.log(`[LiveStore] Using configuration for environment: ${environment}`);
  return config;
}

/**
 * Validate LiveStore configuration
 */
export function validateLiveStoreConfig(config: ProductionLiveStoreConfig): boolean {
  const errors: string[] = [];
  
  // Validate database configuration
  if (!config.database.name) {
    errors.push('Database name is required');
  }
  
  // Validate sync configuration
  if (config.sync.enabled) {
    if (!config.sync.endpoint) {
      errors.push('Sync endpoint is required when sync is enabled');
    }
    if (config.sync.syncInterval < 5000) {
      errors.push('Sync interval must be at least 5 seconds');
    }
  }
  
  // Validate performance configuration
  if (config.performance.cacheSize < 10) {
    errors.push('Cache size must be at least 10 MB');
  }
  
  if (errors.length > 0) {
    console.error('[LiveStore] Configuration validation failed:', errors);
    return false;
  }
  
  return true;
}

/**
 * Create database configuration for LiveStore provider
 */
export function createLiveStoreProviderConfig(config: ProductionLiveStoreConfig) {
  return {
    name: config.database.name,
    version: config.database.version,
    storage: {
      type: 'opfs' as const,
      wasmSqlite: config.database.wasmSqlite,
      crossTabPersistence: config.database.crossTabPersistence
    },
    options: {
      ...config.performance,
      ...config.security,
      sync: config.sync,
      monitoring: config.monitoring,
      recovery: config.recovery
    }
  };
}

export default {
  getLiveStoreConfig,
  validateLiveStoreConfig,
  createLiveStoreProviderConfig,
  DEFAULT_PRODUCTION_CONFIG,
  ENVIRONMENT_CONFIGS
};