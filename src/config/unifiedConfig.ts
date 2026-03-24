/**
 * Unified Configuration System
 * Enhanced configuration management with environment separation, production demo capabilities, and data mode management
 * Integrates with environment matrix and production demo systems for comprehensive configuration control
 */

import {
  Environment,
  DataMode,
  DatabaseProvider,
  EnvironmentConfig,
  detectEnvironment,
  getEnvironmentConfig,
  getDefaultDataMode,
  canSwitchDataModes,
  getAllowedDataModes,
  getDefaultDatabaseProvider,
} from './environmentMatrix';
import {
  DataModeSwitchResult,
  DataModeState,
  switchDataMode,
  validateDataMode,
  getDataModeState,
  getStoredDataMode,
} from './dataModePolicies';
import {
  ProductionDemoConfig,
  ProductionDemoState,
  getProductionDemoConfig,
  getProductionDemoState,
  initializeProductionDemo,
  transitionToLiveMode,
} from './productionDemo';
import {
  DatabaseConfigValidator,
  databaseConfigValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './databaseConfigSchema';
// Environment Variable Keys for Database Configuration (must be defined early for module initialization)
export const DB_ENV_VARS = {
  // Provider Selection
  DATABASE_PROVIDER: 'REACT_APP_DATABASE_PROVIDER',
  DATABASE_AUTO_DETECT: 'REACT_APP_DATABASE_AUTO_DETECT',
  
  // Connection
  DATABASE_URL: 'REACT_APP_DATABASE_URL',
  DATABASE_NAME: 'REACT_APP_DATABASE_NAME',
  
  // Performance
  DATABASE_CACHE_SIZE: 'REACT_APP_DATABASE_CACHE_SIZE',
  DATABASE_QUERY_TIMEOUT: 'REACT_APP_DATABASE_QUERY_TIMEOUT',
  DATABASE_BATCH_SIZE: 'REACT_APP_DATABASE_BATCH_SIZE',
  DATABASE_ENABLE_CACHING: 'REACT_APP_DATABASE_ENABLE_CACHING',
  DATABASE_ENABLE_INDEXING: 'REACT_APP_DATABASE_ENABLE_INDEXING',
  
  // Storage
  DATABASE_MAX_SIZE: 'REACT_APP_DATABASE_MAX_SIZE',
  DATABASE_COMPRESSION: 'REACT_APP_DATABASE_COMPRESSION',
  DATABASE_ENCRYPTION: 'REACT_APP_DATABASE_ENCRYPTION',
  DATABASE_BACKUP: 'REACT_APP_DATABASE_BACKUP',
  DATABASE_RETENTION_DAYS: 'REACT_APP_DATABASE_RETENTION_DAYS',
  
  // Sync
  DATABASE_SYNC_ENABLED: 'REACT_APP_DATABASE_SYNC_ENABLED',
  DATABASE_SYNC_INTERVAL: 'REACT_APP_DATABASE_SYNC_INTERVAL',
  DATABASE_SYNC_CONFLICT_RESOLUTION: 'REACT_APP_DATABASE_SYNC_CONFLICT_RESOLUTION',
  DATABASE_SYNC_RETRY_ATTEMPTS: 'REACT_APP_DATABASE_SYNC_RETRY_ATTEMPTS',
  DATABASE_SYNC_TIMEOUT: 'REACT_APP_DATABASE_SYNC_TIMEOUT',
  
  // Monitoring
  DATABASE_HEALTH_CHECKS: 'REACT_APP_DATABASE_HEALTH_CHECKS',
  DATABASE_HEALTH_CHECK_INTERVAL: 'REACT_APP_DATABASE_HEALTH_CHECK_INTERVAL',
  DATABASE_PERFORMANCE_METRICS: 'REACT_APP_DATABASE_PERFORMANCE_METRICS',
  DATABASE_ERROR_REPORTING: 'REACT_APP_DATABASE_ERROR_REPORTING',
  DATABASE_LOG_LEVEL: 'REACT_APP_DATABASE_LOG_LEVEL',
  
  // Features
  DATABASE_FULL_TEXT_SEARCH: 'REACT_APP_DATABASE_FULL_TEXT_SEARCH',
  DATABASE_TRANSACTIONS: 'REACT_APP_DATABASE_TRANSACTIONS',
  DATABASE_REAL_TIME_UPDATES: 'REACT_APP_DATABASE_REAL_TIME_UPDATES',
  DATABASE_OFFLINE_MODE: 'REACT_APP_DATABASE_OFFLINE_MODE',
  DATABASE_DATA_VALIDATION: 'REACT_APP_DATABASE_DATA_VALIDATION',
  DATABASE_AUDIT_LOG: 'REACT_APP_DATABASE_AUDIT_LOG',
  
  // Backend API
  DATABASE_API_BASE_URL: 'REACT_APP_DATABASE_API_BASE_URL',
  DATABASE_API_KEY: 'REACT_APP_DATABASE_API_KEY',
  DATABASE_API_AUTH_TOKEN: 'REACT_APP_DATABASE_API_AUTH_TOKEN',
  DATABASE_API_AUTH_TYPE: 'REACT_APP_DATABASE_API_AUTH_TYPE',
  DATABASE_API_TIMEOUT: 'REACT_APP_DATABASE_API_TIMEOUT',
} as const;

// Legacy type for backward compatibility
export type BackendEnvironment = 'development' | 'production' | 'staging' | 'unknown';

// Backend Status Interface
export interface BackendStatus {
  environment: BackendEnvironment;
  version: string;
  demoModeEnabled: boolean;
  available: boolean;
}

// Feature Configuration
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
  
  // Tabbed Mode Features
  // Migrated to TabsConfig.advanced
  // enableTabbedMode: boolean;
  // enablePerModuleControl: boolean;
  // tabbedModeModuleOverrides: Record<string, boolean>;
}

// Development Settings
export interface DevelopmentConfig {
  enableDebugMode: boolean;
  enableMockData: boolean;
  enablePerformanceMonitoring: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Demo Configuration
export interface DemoConfig {
  available: boolean;
  active: boolean;
  canToggle: boolean;
  lastActivated?: Date;
}

// Backend Configuration
export interface BackendConfig {
  url: string;
  environment: BackendEnvironment;
  available: boolean;
  lastChecked?: Date;
}

// Backend API Configuration for external system integration
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

// Enhanced Database Configuration
export interface DatabaseConfig {
  provider: DatabaseProvider;
  allowedProviders: DatabaseProvider[];
  autoDetect: boolean;
  connectionString?: string;
  options: Record<string, any>;
  apiConfig?: BackendAPIConfig;
  
  // Enhanced configuration options
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

// Production Demo Configuration Integration
export interface ProductionDemoConfigIntegration {
  config: ProductionDemoConfig;
  state: ProductionDemoState;
  transitionAvailable: boolean;
}

// Environment Configuration Integration
export interface EnvironmentConfigIntegration {
  current: Environment;
  config: EnvironmentConfig;
  detectedAutomatically: boolean;
  overrideSource?: 'url' | 'env' | 'manual';
}

// Tabs Configuration
export interface TabsConfig {
  general: {
    openingDirection: 'ltr' | 'rtl';
    newTabPlacement: 'end' | 'next';
    defaultPage: string;
  };
  behavior: {
    closeButtonVisibility: 'always' | 'hover' | 'never';
    tabScrolling: 'smooth' | 'auto' | 'buttons';
    activationOnHoverTiming: number; // ms, 0 means disabled
    muteUnmuteBehavior: 'click' | 'context-menu' | 'disabled';
  };
  appearance: {
    minTabWidth: number; // px
    maxTabWidth: number; // px
    faviconVisibility: boolean;
    tabPreviewThumbnails: boolean;
    colorAccents: boolean;
  };
  advanced: {
    sessionRestoreGranularity: 'all' | 'pinned' | 'none';
    memorySuspendTimeout: number; // ms
    extensionOverrides: boolean;
    debuggingTelemetry: boolean;
    enableTabbedMode: boolean;
    enablePerModuleControl: boolean;
    tabbedModeModuleOverrides: Record<string, boolean>;
  };
}

// Main Unified Configuration Interface
export interface UnifiedAppConfig {
  // Core Configuration
  environment: Environment;
  dataMode: DataMode;
  useEnhancedFeatures: boolean;
  
  // Environment Integration
  environmentConfig: EnvironmentConfigIntegration;
  
  // Database Configuration
  database: DatabaseConfig;
  
  // Backend Configuration (Legacy)
  backend: BackendConfig;
  
  // Demo Configuration (Enhanced)
  demo: DemoConfig;
  
  // Production Demo Integration
  productionDemo: ProductionDemoConfigIntegration;
  
  // Feature flags for experimental functionality
  features: {
    // Enhanced features
    enhancedDataLayer: true,
    enhancedUI: false,
    performanceMonitorWidget: false,
    enableErrorReporting: true,
    enableLogging: true,
    
    // Module-specific features
    enableAcademicsModule: true,
    enableAdministrationModule: true,
    enableFinanceModule: true,
    enableHrModule: true,
    enableInventoryModule: true,
    enableLibraryModule: true,
    enableNutritionModule: true,
    enableReportsModule: true,
    enableSettingsModule: true,
    enableAdmissionsModule: true,
    
    // Feature-specific flags
    globalNotifications: true,
    enableAccessibility: true,
    enableDarkMode: true,
    enableMultiLanguage: true,
    enableOfflineMode: true,
    enableAuditTrail: true,
    enableDataExport: true,
    enableCustomFields: true,
    enableWorkflowEngine: true,
    enableDocumentManagement: true,
    enableCommunicationCenter: true,
    enableAnalyticsDashboard: true,
    
    // Tabbed mode feature flags (migrated)
    // enableTabbedMode: true,
    // enablePerModuleControl: true,
    // tabbedModeModuleOverrides: {...}
    
    // Demo/Test mode features
    demoMode: false,
    testMode: false,
    enableTestDataGeneration: false,
    showDebugInfo: false,
    enableTestLogin: false,
  },
  
  // Tabs Configuration
  tabs: TabsConfig;
  
  // Development Configuration
  development: DevelopmentConfig;
  
  // Metadata
  version: string;
  lastUpdated: Date;
  configVersion: string;
}

// Default Tabs Configuration
const DEFAULT_TABS_CONFIG: TabsConfig = {
  general: {
    openingDirection: 'ltr',
    newTabPlacement: 'end',
    defaultPage: 'dashboard',
  },
  behavior: {
    closeButtonVisibility: 'hover',
    tabScrolling: 'smooth',
    activationOnHoverTiming: 0,
    muteUnmuteBehavior: 'click',
  },
  appearance: {
    minTabWidth: 120,
    maxTabWidth: 240,
    faviconVisibility: true,
    tabPreviewThumbnails: false,
    colorAccents: true,
  },
  advanced: {
    sessionRestoreGranularity: 'all',
    memorySuspendTimeout: 300000,
    extensionOverrides: false,
    debuggingTelemetry: false,
    enableTabbedMode: true,
    enablePerModuleControl: true,
    tabbedModeModuleOverrides: {},
  },
};

// Default Feature Configuration
const DEFAULT_FEATURES: FeatureConfig = {
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
  
  // Tabbed Mode Features (migrated)
  // enableTabbedMode: true,
  // enablePerModuleControl: true,
  // tabbedModeModuleOverrides: {}
};

// Default Development Configuration
const DEFAULT_DEVELOPMENT: DevelopmentConfig = {
  enableDebugMode: false,
  enableMockData: true,
  enablePerformanceMonitoring: false,
  logLevel: 'info',
};

// Helper function to create default configuration
function createDefaultConfig(): UnifiedAppConfig {
  const detectedEnvironment = detectEnvironment();
  const envConfig = getEnvironmentConfig(detectedEnvironment);
  const defaultDataMode = getDefaultDataMode(detectedEnvironment);
  const defaultDatabaseProvider = getDefaultDatabaseProvider(detectedEnvironment);
  
  // Load database configuration from environment variables
  const envDatabaseConfig = loadDatabaseConfigFromEnv();
  
  return {
    // Core Configuration
    environment: detectedEnvironment,
    dataMode: getStoredDataMode() || defaultDataMode,
    useEnhancedFeatures: true,
    
    // Environment Integration
    environmentConfig: {
      current: detectedEnvironment,
      config: envConfig,
      detectedAutomatically: true,
      overrideSource: undefined,
    },
    
    // Database Configuration (with environment variable overrides)
    database: {
      // Base configuration
      provider: envDatabaseConfig.provider || defaultDatabaseProvider,
      allowedProviders: envConfig.allowedDatabaseProviders,
      autoDetect: envDatabaseConfig.autoDetect ?? true,
      connectionString: envDatabaseConfig.connectionString || process.env.REACT_APP_DATABASE_URL || process.env.DATABASE_URL,
      options: {},
      apiConfig: envDatabaseConfig.apiConfig,
      
      // Enhanced configuration with environment-based defaults and overrides
      performance: {
        enableIndexing: envDatabaseConfig.performance?.enableIndexing ?? true,
        enableCaching: envDatabaseConfig.performance?.enableCaching ?? (detectedEnvironment === 'production'),
        cacheSize: envDatabaseConfig.performance?.cacheSize ?? (detectedEnvironment === 'production' ? 100 : 50), // MB
        queryTimeout: envDatabaseConfig.performance?.queryTimeout ?? 30000, // 30 seconds
        batchSize: envDatabaseConfig.performance?.batchSize ?? (detectedEnvironment === 'production' ? 1000 : 100),
      },
      
      storage: {
        maxSize: envDatabaseConfig.storage?.maxSize ?? (detectedEnvironment === 'production' ? 0 : 500), // MB, 0 = unlimited in production
        compressionEnabled: envDatabaseConfig.storage?.compressionEnabled ?? (detectedEnvironment === 'production'),
        encryptionEnabled: envDatabaseConfig.storage?.encryptionEnabled ?? false, // Can be enabled per deployment
        backupEnabled: envDatabaseConfig.storage?.backupEnabled ?? (detectedEnvironment !== 'development'),
        retentionDays: envDatabaseConfig.storage?.retentionDays ?? (detectedEnvironment === 'production' ? 365 : 30),
      },
      
      sync: {
        enabled: envDatabaseConfig.sync?.enabled ?? (defaultDatabaseProvider === 'backend-api' || defaultDatabaseProvider === 'pouchdb'),
        interval: envDatabaseConfig.sync?.interval ?? 30000, // 30 seconds
        conflictResolution: envDatabaseConfig.sync?.conflictResolution ?? 'manual',
        batchSize: envDatabaseConfig.sync?.batchSize ?? 100,
        retryAttempts: envDatabaseConfig.sync?.retryAttempts ?? 3,
        timeout: envDatabaseConfig.sync?.timeout ?? 60000, // 1 minute
      },
      
      monitoring: {
        enableHealthChecks: envDatabaseConfig.monitoring?.enableHealthChecks ?? true,
        healthCheckInterval: envDatabaseConfig.monitoring?.healthCheckInterval ?? 300000, // 5 minutes
        enablePerformanceMetrics: envDatabaseConfig.monitoring?.enablePerformanceMetrics ?? (detectedEnvironment === 'production'),
        enableErrorReporting: envDatabaseConfig.monitoring?.enableErrorReporting ?? (detectedEnvironment !== 'development'),
        logLevel: envDatabaseConfig.monitoring?.logLevel ?? (detectedEnvironment === 'development' ? 'debug' : 'info'),
      },
      
      features: {
        enableFullTextSearch: envDatabaseConfig.features?.enableFullTextSearch ?? (defaultDatabaseProvider !== 'backend-api'),
        enableTransactions: envDatabaseConfig.features?.enableTransactions ?? (defaultDatabaseProvider === 'sqlite-file' || defaultDatabaseProvider === 'sqlite-wasm'),
        enableRealTimeUpdates: envDatabaseConfig.features?.enableRealTimeUpdates ?? (defaultDatabaseProvider === 'pouchdb' || defaultDatabaseProvider === 'livestore'),
        enableOfflineMode: envDatabaseConfig.features?.enableOfflineMode ?? (defaultDatabaseProvider !== 'backend-api'),
        enableDataValidation: envDatabaseConfig.features?.enableDataValidation ?? true,
        enableAuditLog: envDatabaseConfig.features?.enableAuditLog ?? (detectedEnvironment === 'production'),
      },
    },
    
    // Backend Configuration (Legacy)
    backend: {
      url: process.env.REACT_APP_API_URL || '',
      environment: 'unknown',
      available: false,
    },
    
    // Demo Configuration (Enhanced)
    demo: {
      available: envConfig.allowedDataModes.includes('demo'),
      active: defaultDataMode === 'demo',
      canToggle: envConfig.canSwitchDataModes,
    },
    
    // Production Demo Integration
    productionDemo: {
      config: getProductionDemoConfig(detectedEnvironment),
      state: getProductionDemoState(),
      transitionAvailable: detectedEnvironment === 'production',
    },
    
    // Feature Configuration
    features: {
      ...DEFAULT_FEATURES,
      ...envConfig.features,
    },
    
    // Tabs Configuration
    tabs: {
      ...DEFAULT_TABS_CONFIG,
    },
    
    // Development Configuration
    development: {
      ...DEFAULT_DEVELOPMENT,
      // enableDebugMode: envConfig.features.debugMode, // Property doesn't exist
    },
    
    // Metadata
    version: '2.0.0',
    lastUpdated: new Date(),
    configVersion: '2.0.0-enhanced',
  };
}

// Default Configuration
export const DEFAULT_UNIFIED_CONFIG: UnifiedAppConfig = createDefaultConfig();

// Configuration Presets (migrated from appConfig.ts)
const CONFIG_PRESETS_DEFINITIONS: Record<string, Partial<UnifiedAppConfig>> = {
  demo: {
    dataMode: 'demo',
    useEnhancedFeatures: true,
    features: {
      enhancedDataLayer: true,
      networkStatusIndicator: false,
      moduleHealthIndicator: false,
      syncStatusComponent: false,
      globalNotifications: false,
      performanceOptimizations: true,
      advancedErrorBoundaries: true,
      performanceMonitorWidget: false,
      enableAdvancedReporting: false,
      enableBulkOperations: true,
      enableDataExport: true,
      enableNotifications: true,
      enableAuditLog: false,
      enableMultiTenant: false,
      enableOfflineMode: false,
      enableRealTimeSync: false,
      enablePerformanceMonitoring: false,
    },
  },
  
  enhanced: {
    dataMode: 'production',
    useEnhancedFeatures: true,
    features: {
      enhancedDataLayer: true,
      networkStatusIndicator: true,
      moduleHealthIndicator: true,
      syncStatusComponent: true,
      globalNotifications: true,
      performanceOptimizations: true,
      advancedErrorBoundaries: true,
      performanceMonitorWidget: true,
      enableAdvancedReporting: true,
      enableBulkOperations: true,
      enableDataExport: true,
      enableNotifications: true,
      enableAuditLog: true,
      enableMultiTenant: true,
      enableOfflineMode: true,
      enableRealTimeSync: true,
      enablePerformanceMonitoring: true,
    },
  },
  
  development: {
    dataMode: 'demo',
    useEnhancedFeatures: true,
    features: {
      enhancedDataLayer: true,
      networkStatusIndicator: true,
      moduleHealthIndicator: true,
      syncStatusComponent: true,
      globalNotifications: true,
      performanceOptimizations: false,
      advancedErrorBoundaries: true,
      performanceMonitorWidget: true,
      enableAdvancedReporting: true,
      enableBulkOperations: true,
      enableDataExport: true,
      enableNotifications: true,
      enableAuditLog: true,
      enableMultiTenant: false,
      enableOfflineMode: true,
      enableRealTimeSync: false,
      enablePerformanceMonitoring: true,
    },
    development: {
      enableDebugMode: true,
      enableMockData: true,
      enablePerformanceMonitoring: true,
      logLevel: 'debug',
    },
  },
};

// Helper function to create configuration presets
function createConfigPresets() {
  const baseConfig = createDefaultConfig();
  
  return {
    development: {
      ...baseConfig,
      environment: 'development' as Environment,
      dataMode: 'mock' as DataMode,
      environmentConfig: {
        ...baseConfig.environmentConfig,
        current: 'development' as Environment,
        config: getEnvironmentConfig('development'),
      },
      features: {
        ...baseConfig.features,
        enablePerformanceMonitoring: true,
        enhancedDataLayer: true,
        networkStatusIndicator: true,
      },
      development: {
        ...baseConfig.development,
        enableDebugMode: true,
        enableMockData: true,
        enablePerformanceMonitoring: true,
        logLevel: 'debug' as const,
      },
    },
    staging: {
      ...baseConfig,
      environment: 'staging' as Environment,
      dataMode: 'demo' as DataMode,
      environmentConfig: {
        ...baseConfig.environmentConfig,
        current: 'staging' as Environment,
        config: getEnvironmentConfig('staging'),
      },
      features: {
        ...baseConfig.features,
        enableAdvancedReporting: true,
        enablePerformanceMonitoring: true,
        performanceOptimizations: true,
      },
      development: {
        ...baseConfig.development,
        enableDebugMode: false,
        enableMockData: false,
        logLevel: 'info' as const,
      },
    },
    production: {
      ...baseConfig,
      environment: 'production' as Environment,
      dataMode: 'demo' as DataMode,
      environmentConfig: {
        ...baseConfig.environmentConfig,
        current: 'production' as Environment,
        config: getEnvironmentConfig('production'),
      },
      productionDemo: {
        ...baseConfig.productionDemo,
        transitionAvailable: true,
      },
      features: {
        ...baseConfig.features,
        enableAdvancedReporting: true,
        enableAuditLog: true,
        enablePerformanceMonitoring: true,
        performanceOptimizations: true,
      },
      development: {
        ...baseConfig.development,
        enableDebugMode: false,
        enableMockData: false,
        enablePerformanceMonitoring: false,
        logLevel: 'warn' as const,
      },
    },
  };
}

// Configuration Presets
export const CONFIG_PRESETS = CONFIG_PRESETS_DEFINITIONS;

// Configuration Storage Keys
export const CONFIG_STORAGE_KEY = 'unified_app_config';
export const CONFIG_VERSION_KEY = 'unified_app_config_version';
export const BACKEND_STATUS_CACHE_KEY = 'backend_status_cache';
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Configuration version for migration
const CONFIG_VERSION = '2.0.0';

/**
 * Load database configuration from environment variables
 */
function loadDatabaseConfigFromEnv(): Partial<DatabaseConfig> {
  const config: Partial<DatabaseConfig> = {};
  
  // Provider selection
  if (process.env[DB_ENV_VARS.DATABASE_PROVIDER]) {
    config.provider = process.env[DB_ENV_VARS.DATABASE_PROVIDER] as DatabaseProvider;
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_AUTO_DETECT]) {
    config.autoDetect = process.env[DB_ENV_VARS.DATABASE_AUTO_DETECT] === 'true';
  }
  
  // Connection
  if (process.env[DB_ENV_VARS.DATABASE_URL] || process.env.DATABASE_URL) {
    config.connectionString = process.env[DB_ENV_VARS.DATABASE_URL] || process.env.DATABASE_URL;
  }
  
  // Performance settings
  const performance: Partial<DatabaseConfig['performance']> = {};
  
  if (process.env[DB_ENV_VARS.DATABASE_CACHE_SIZE]) {
    performance.cacheSize = parseInt(process.env[DB_ENV_VARS.DATABASE_CACHE_SIZE]);
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_QUERY_TIMEOUT]) {
    performance.queryTimeout = parseInt(process.env[DB_ENV_VARS.DATABASE_QUERY_TIMEOUT]);
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_BATCH_SIZE]) {
    performance.batchSize = parseInt(process.env[DB_ENV_VARS.DATABASE_BATCH_SIZE]);
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_ENABLE_CACHING]) {
    performance.enableCaching = process.env[DB_ENV_VARS.DATABASE_ENABLE_CACHING] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_ENABLE_INDEXING]) {
    performance.enableIndexing = process.env[DB_ENV_VARS.DATABASE_ENABLE_INDEXING] === 'true';
  }
  
  if (Object.keys(performance).length > 0) {
    config.performance = performance as DatabaseConfig['performance'];
  }
  
  // Storage settings
  const storage: Partial<DatabaseConfig['storage']> = {};
  
  if (process.env[DB_ENV_VARS.DATABASE_MAX_SIZE]) {
    storage.maxSize = parseInt(process.env[DB_ENV_VARS.DATABASE_MAX_SIZE]);
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_COMPRESSION]) {
    storage.compressionEnabled = process.env[DB_ENV_VARS.DATABASE_COMPRESSION] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_ENCRYPTION]) {
    storage.encryptionEnabled = process.env[DB_ENV_VARS.DATABASE_ENCRYPTION] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_BACKUP]) {
    storage.backupEnabled = process.env[DB_ENV_VARS.DATABASE_BACKUP] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_RETENTION_DAYS]) {
    storage.retentionDays = parseInt(process.env[DB_ENV_VARS.DATABASE_RETENTION_DAYS]);
  }
  
  if (Object.keys(storage).length > 0) {
    config.storage = storage as DatabaseConfig['storage'];
  }
  
  // Sync settings
  const sync: Partial<DatabaseConfig['sync']> = {};
  
  if (process.env[DB_ENV_VARS.DATABASE_SYNC_ENABLED]) {
    sync.enabled = process.env[DB_ENV_VARS.DATABASE_SYNC_ENABLED] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_SYNC_INTERVAL]) {
    sync.interval = parseInt(process.env[DB_ENV_VARS.DATABASE_SYNC_INTERVAL]);
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_SYNC_CONFLICT_RESOLUTION]) {
    sync.conflictResolution = process.env[DB_ENV_VARS.DATABASE_SYNC_CONFLICT_RESOLUTION] as DatabaseConfig['sync']['conflictResolution'];
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_SYNC_RETRY_ATTEMPTS]) {
    sync.retryAttempts = parseInt(process.env[DB_ENV_VARS.DATABASE_SYNC_RETRY_ATTEMPTS]);
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_SYNC_TIMEOUT]) {
    sync.timeout = parseInt(process.env[DB_ENV_VARS.DATABASE_SYNC_TIMEOUT]);
  }
  
  if (Object.keys(sync).length > 0) {
    config.sync = sync as DatabaseConfig['sync'];
  }
  
  // Monitoring settings
  const monitoring: Partial<DatabaseConfig['monitoring']> = {};
  
  if (process.env[DB_ENV_VARS.DATABASE_HEALTH_CHECKS]) {
    monitoring.enableHealthChecks = process.env[DB_ENV_VARS.DATABASE_HEALTH_CHECKS] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_HEALTH_CHECK_INTERVAL]) {
    monitoring.healthCheckInterval = parseInt(process.env[DB_ENV_VARS.DATABASE_HEALTH_CHECK_INTERVAL]);
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_PERFORMANCE_METRICS]) {
    monitoring.enablePerformanceMetrics = process.env[DB_ENV_VARS.DATABASE_PERFORMANCE_METRICS] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_ERROR_REPORTING]) {
    monitoring.enableErrorReporting = process.env[DB_ENV_VARS.DATABASE_ERROR_REPORTING] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_LOG_LEVEL]) {
    monitoring.logLevel = process.env[DB_ENV_VARS.DATABASE_LOG_LEVEL] as DatabaseConfig['monitoring']['logLevel'];
  }
  
  if (Object.keys(monitoring).length > 0) {
    config.monitoring = monitoring as DatabaseConfig['monitoring'];
  }
  
  // Feature settings
  const features: Partial<DatabaseConfig['features']> = {};
  
  if (process.env[DB_ENV_VARS.DATABASE_FULL_TEXT_SEARCH]) {
    features.enableFullTextSearch = process.env[DB_ENV_VARS.DATABASE_FULL_TEXT_SEARCH] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_TRANSACTIONS]) {
    features.enableTransactions = process.env[DB_ENV_VARS.DATABASE_TRANSACTIONS] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_REAL_TIME_UPDATES]) {
    features.enableRealTimeUpdates = process.env[DB_ENV_VARS.DATABASE_REAL_TIME_UPDATES] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_OFFLINE_MODE]) {
    features.enableOfflineMode = process.env[DB_ENV_VARS.DATABASE_OFFLINE_MODE] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_DATA_VALIDATION]) {
    features.enableDataValidation = process.env[DB_ENV_VARS.DATABASE_DATA_VALIDATION] === 'true';
  }
  
  if (process.env[DB_ENV_VARS.DATABASE_AUDIT_LOG]) {
    features.enableAuditLog = process.env[DB_ENV_VARS.DATABASE_AUDIT_LOG] === 'true';
  }
  
  if (Object.keys(features).length > 0) {
    config.features = features as DatabaseConfig['features'];
  }
  
  // Backend API configuration
  if (process.env[DB_ENV_VARS.DATABASE_API_BASE_URL] || 
      process.env[DB_ENV_VARS.DATABASE_API_KEY] || 
      process.env[DB_ENV_VARS.DATABASE_API_AUTH_TOKEN]) {
    
    config.apiConfig = {
      apiBaseUrl: process.env[DB_ENV_VARS.DATABASE_API_BASE_URL] || '',
      apiKey: process.env[DB_ENV_VARS.DATABASE_API_KEY],
      authToken: process.env[DB_ENV_VARS.DATABASE_API_AUTH_TOKEN],
      authType: (process.env[DB_ENV_VARS.DATABASE_API_AUTH_TYPE] as any) || 'bearer',
      timeout: process.env[DB_ENV_VARS.DATABASE_API_TIMEOUT] ? 
        parseInt(process.env[DB_ENV_VARS.DATABASE_API_TIMEOUT]) : undefined,
    };
  }
  
  return config;
}

/**
 * Load database configuration from configuration file
 */
async function loadDatabaseConfigFromFile(): Promise<Partial<DatabaseConfig>> {
  try {
    // Try to load from public/database-config.json
    const response = await fetch('/database-config.json');
    if (response.ok) {
      const config = await response.json();
      console.log('📁 [UnifiedConfig] Loaded database configuration from file');
      return config;
    }
  } catch (error) {
    // File doesn't exist or can't be loaded, which is fine
    console.log('📁 [UnifiedConfig] No database configuration file found');
  }
  
  return {};
}

// RxDB Constants (migrated from config.ts)
export const RXDB_DB_NAME = 'schoolpilot';
export const RXDB_LEADER_ELECTION_DISABLED = true;
export const RXDB_SETTINGS_COLLECTION_NAME = 'app_settings';
export const RXDB_DUMMY_DATA_FLAG_ID = 'using_dummy_data';

/**
 * Unified Configuration Manager
 * Handles configuration persistence, updates, and validation
 */
export class UnifiedConfigManager {
  private static instance: UnifiedConfigManager;
  private config: UnifiedAppConfig;
  private listeners: Set<(config: UnifiedAppConfig) => void> = new Set();

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): UnifiedConfigManager {
    if (!UnifiedConfigManager.instance) {
      UnifiedConfigManager.instance = new UnifiedConfigManager();
    }
    return UnifiedConfigManager.instance;
  }

  /**
   * Load configuration from localStorage or use defaults with URL parameter overrides
   */
  private loadConfig(): UnifiedAppConfig {
    let config = createDefaultConfig();
    
    // Load configuration file asynchronously (will be applied later)
    this.loadConfigurationFile();

    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
        const storedVersion = localStorage.getItem(CONFIG_VERSION_KEY);
        
        if (stored) {
          const parsed = JSON.parse(stored);
          
          // Check if we need to migrate configuration
          if (storedVersion !== CONFIG_VERSION) {
            console.log('Migrating unified configuration from version', storedVersion, 'to', CONFIG_VERSION);
            // Clear old config and use defaults with any user preferences
            localStorage.setItem(CONFIG_VERSION_KEY, CONFIG_VERSION);
          }
          
          // Deep merge features and tabs to ensure new config keys are included
            const mergedConfig = {
              ...config,
              ...parsed,
              features: {
                ...config.features, // Start with defaults to ensure all flags exist
                ...(parsed.features || {}) // Then apply user preferences
              },
              tabs: {
                general: { ...config.tabs.general, ...(parsed.tabs?.general || {}) },
                behavior: { ...config.tabs.behavior, ...(parsed.tabs?.behavior || {}) },
                appearance: { ...config.tabs.appearance, ...(parsed.tabs?.appearance || {}) },
                advanced: { ...config.tabs.advanced, ...(parsed.tabs?.advanced || {}) },
              },
              lastUpdated: new Date(parsed.lastUpdated || Date.now()),
            };
          
          // Check if any feature flags are missing and add them
          const defaultFeatureFlags = Object.keys(config.features) as (keyof FeatureConfig)[];
          const currentFeatureFlags = Object.keys(mergedConfig.features) as (keyof FeatureConfig)[];
          const missingFlags = defaultFeatureFlags.filter(flag => !currentFeatureFlags.includes(flag));
          
          if (missingFlags.length > 0) {
            console.log('Adding missing feature flags:', missingFlags);
            missingFlags.forEach(flag => {
              (mergedConfig.features as any)[flag] = (config.features as any)[flag];
            });
            // Update localStorage with the corrected config
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(mergedConfig));
          }
          
          config = mergedConfig;
        } else {
          // First time - set version
          localStorage.setItem(CONFIG_VERSION_KEY, CONFIG_VERSION);
        }
      } catch (error) {
        console.warn('Failed to load stored configuration:', error);
      }

      // Check URL parameters for configuration overrides
      const urlParams = new URLSearchParams(window.location.search);
      const preset = urlParams.get('preset');
      const mode = urlParams.get('mode') as DataMode;
      const enhanced = urlParams.get('enhanced') === 'true';
      const environment = urlParams.get('environment') as Environment;

      // Apply preset if specified with deep merge for features
      if (preset && CONFIG_PRESETS[preset]) {
        const presetConfig = CONFIG_PRESETS[preset];
        config = {
          ...config,
          ...presetConfig,
          features: {
            ...config.features,
            ...presetConfig.features
          }
        };
      }

      // Apply URL parameter overrides
      if (mode && ['demo', 'live'].includes(mode)) {
        config.dataMode = mode;
        config.demo.active = mode === 'demo';
      }
      if (enhanced !== undefined) {
        config.useEnhancedFeatures = enhanced;
      }
      if (environment && ['development', 'staging', 'production'].includes(environment)) {
        config.environment = environment;
        config.environmentConfig = {
          current: environment,
          config: getEnvironmentConfig(environment),
          detectedAutomatically: false,
          overrideSource: 'url',
        };
      }
    }

    return config;
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      this.config.lastUpdated = new Date();
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): UnifiedAppConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<UnifiedAppConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      lastUpdated: new Date(),
    };
    this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Update backend status
   */
  public updateBackendStatus(status: Partial<BackendStatus>): void {
    this.config.backend = {
      ...this.config.backend,
      ...status,
      lastChecked: new Date(),
    };
    
    // Update demo availability based on backend environment
    this.config.demo.available = status.environment === 'development' || 
                                 (status.environment === 'production' && status.demoModeEnabled === true);
    
    this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Switch data mode using enhanced policies
   */
  public async switchDataMode(toMode: DataMode, options: {
    skipConfirmation?: boolean;
    skipValidation?: boolean;
  } = {}): Promise<DataModeSwitchResult> {
    const currentMode = this.config.dataMode;
    const environment = this.config.environment;
    
    const result = await switchDataMode(toMode, this.config.dataMode, this.config.environment, options);
    
    if (result.success) {
      this.config.dataMode = result.newMode;
      this.config.demo.active = result.newMode === 'demo';
      
      if (result.newMode === 'demo') {
        this.config.demo.lastActivated = new Date();
      }
      
      // Update production demo state if in production
      if (environment === 'production') {
        this.config.productionDemo.state = getProductionDemoState();
      }
      
      this.saveConfig();
      this.notifyListeners();
    }
    
    return result;
  }

  /**
   * Switch to demo mode (legacy method)
   */
  public async switchToDemo(): Promise<void> {
    const result = await this.switchDataMode('demo');
    if (!result.success) {
      throw new Error(result.error || 'Failed to switch to demo mode');
    }
  }

  /**
   * Switch to production mode (legacy method)
   */
  public async switchToProduction(): Promise<void> {
    const result = await this.switchDataMode('production');
    if (!result.success) {
      throw new Error(result.error || 'Failed to switch to production mode');
    }
  }

  /**
   * Transition to live mode in production
   */
  public async transitionToLiveMode(confirmationInputs: Record<string, string> = {}): Promise<any> {
    if (this.config.environment !== 'production') {
      throw new Error('Live mode transition is only available in production');
    }
    
    const result = await transitionToLiveMode(this.config.environment);
    
    if (result.success) {
      this.config.dataMode = 'production';
      this.config.demo.active = false;
      this.config.productionDemo.state = getProductionDemoState();
      
      this.saveConfig();
      this.notifyListeners();
    }
    
    return result;
  }

  /**
   * Get current data mode state
   */
  public getDataModeState(): DataModeState {
    return getDataModeState(this.config.dataMode, this.config.environment);
  }

  /**
   * Get environment configuration
   */
  public getEnvironmentConfig(): EnvironmentConfig {
    return this.config.environmentConfig.config;
  }

  /**
   * Update environment (with validation)
   */
  public updateEnvironment(environment: Environment, source: 'url' | 'env' | 'manual' = 'manual'): void {
    const envConfig = getEnvironmentConfig(environment);
    const defaultDataMode = getDefaultDataMode(environment);
    
    this.config.environment = environment;
    this.config.environmentConfig = {
      current: environment,
      config: envConfig,
      detectedAutomatically: source !== 'manual',
      overrideSource: source,
    };
    
    // Update data mode if current mode is not allowed in new environment
    if (!envConfig.allowedDataModes.includes(this.config.dataMode)) {
      this.config.dataMode = defaultDataMode;
    }
    
    // Update database configuration
    this.config.database.allowedProviders = envConfig.allowedDatabaseProviders;
    // Note: autoDetectBackend property doesn't exist in EnvironmentConfig
    // this.config.database.autoDetect = envConfig.autoDetectBackend;
    
    // Update demo configuration
    this.config.demo.available = envConfig.allowedDataModes.includes('demo');
    this.config.demo.canToggle = envConfig.canSwitchDataModes;
    
    // Update production demo configuration
    if (environment === 'production') {
      this.config.productionDemo.state = getProductionDemoState();
      this.config.productionDemo.transitionAvailable = true;
    } else {
      this.config.productionDemo.transitionAvailable = false;
    }
    
    // Update features based on environment
    this.config.features = {
      ...this.config.features,
      ...envConfig.features,
    };
    
    this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Apply configuration preset
   */
  public applyPreset(preset: keyof typeof CONFIG_PRESETS): void {
    const presetConfig = CONFIG_PRESETS[preset];
    this.updateConfig(presetConfig);
  }

  /**
   * Subscribe to configuration changes
   */
  public subscribe(listener: (config: UnifiedAppConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }

  /**
   * Reset configuration to defaults
   */
  public reset(): void {
    this.config = createDefaultConfig();
    this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Validate configuration
   */
  public validate(): boolean {
    try {
      // Basic validation
      if (!this.config.environment || !this.config.dataMode) {
        return false;
      }
      
      // Validate backend URL
      if (this.config.backend.url && !this.isValidUrl(this.config.backend.url)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a specific feature is enabled (migrated from appConfig.ts)
   */
  public isFeatureEnabled(feature: keyof FeatureConfig): boolean {
    return this.config.features[feature];
  }

  /**
   * Check if development mode is enabled
   */
  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Update specific feature flags
   */
  public updateFeatures(features: Partial<FeatureConfig>): void {
    this.config.features = {
      ...this.config.features,
      ...features,
    };
    this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Get configuration version
   */
  public getConfigVersion(): string {
    return CONFIG_VERSION;
  }

  /**
     * Get current database configuration
     */
    public getDatabaseConfig(): DatabaseConfig {
      return { ...this.config.database };
    }

    /**
     * Get current tabs configuration
     */
    public getTabsConfig(): TabsConfig {
      return { ...this.config.tabs };
    }

    /**
     * Update tabs configuration
     */
    public updateTabsConfig(updates: Partial<TabsConfig>): void {
      this.config.tabs = {
        ...this.config.tabs,
        ...updates,
        general: { ...this.config.tabs.general, ...(updates.general || {}) },
        behavior: { ...this.config.tabs.behavior, ...(updates.behavior || {}) },
        appearance: { ...this.config.tabs.appearance, ...(updates.appearance || {}) },
        advanced: { ...this.config.tabs.advanced, ...(updates.advanced || {}) },
      };
      this.saveConfig();
      this.notifyListeners();
    }

    /**
     * Update database configuration
     */
  public updateDatabaseConfig(updates: Partial<DatabaseConfig>): void {
    this.config.database = {
      ...this.config.database,
      ...updates,
      // Deep merge nested objects
      performance: {
        ...this.config.database.performance,
        ...(updates.performance || {}),
      },
      storage: {
        ...this.config.database.storage,
        ...(updates.storage || {}),
      },
      sync: {
        ...this.config.database.sync,
        ...(updates.sync || {}),
      },
      monitoring: {
        ...this.config.database.monitoring,
        ...(updates.monitoring || {}),
      },
      features: {
        ...this.config.database.features,
        ...(updates.features || {}),
      },
    };
    this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Update database provider with automatic configuration adjustment
   */
  public updateDatabaseProvider(provider: DatabaseProvider): void {
    const envConfig = this.getEnvironmentConfig();
    
    // Validate provider is allowed
    if (!envConfig.allowedDatabaseProviders.includes(provider)) {
      throw new Error(`Provider ${provider} is not allowed in ${this.config.environment} environment`);
    }

    // Update provider and adjust configuration based on provider capabilities
    const updates: Partial<DatabaseConfig> = {
      provider,
      features: {
        ...this.config.database.features,
        enableFullTextSearch: provider !== 'backend-api',
        enableTransactions: provider === 'sqlite-file' || provider === 'sqlite-wasm',
        enableRealTimeUpdates: provider === 'pouchdb' || provider === 'livestore',
        enableOfflineMode: provider !== 'backend-api',
      },
      sync: {
        ...this.config.database.sync,
        enabled: provider === 'backend-api' || provider === 'pouchdb',
      },
    };

    this.updateDatabaseConfig(updates);
  }

  /**
   * Get database configuration presets
   */
  public getDatabaseConfigPresets(): Record<string, Partial<DatabaseConfig>> {
    return {
      performance: {
        performance: {
          enableIndexing: true,
          enableCaching: true,
          cacheSize: 200,
          queryTimeout: 15000,
          batchSize: 1000,
        },
        monitoring: {
          enableHealthChecks: true,
          healthCheckInterval: 60000, // 1 minute
          enablePerformanceMetrics: true,
          enableErrorReporting: true,
          logLevel: 'info',
        },
      },
      
      storage_optimized: {
        storage: {
          maxSize: 1000, // 1GB
          compressionEnabled: true,
          encryptionEnabled: false,
          backupEnabled: true,
          retentionDays: 90,
        },
        performance: {
          enableIndexing: true,
          enableCaching: true,
          cacheSize: 100,
          queryTimeout: 30000,
          batchSize: 500,
        },
      },
      
      sync_heavy: {
        sync: {
          enabled: true,
          interval: 10000, // 10 seconds
          conflictResolution: 'merge',
          batchSize: 50,
          retryAttempts: 5,
          timeout: 30000,
        },
        features: {
          enableFullTextSearch: true,
          enableTransactions: true,
          enableRealTimeUpdates: true,
          enableOfflineMode: true,
          enableDataValidation: true,
          enableAuditLog: false,
        },
      },
      
      development: {
        monitoring: {
          enableHealthChecks: true,
          healthCheckInterval: 300000, // 5 minutes
          enablePerformanceMetrics: false,
          enableErrorReporting: false,
          logLevel: 'debug',
        },
        storage: {
          maxSize: 100, // 100MB
          compressionEnabled: false,
          encryptionEnabled: false,
          backupEnabled: false,
          retentionDays: 7,
        },
      },
      
      production: {
        performance: {
          enableIndexing: true,
          enableCaching: true,
          cacheSize: 500,
          queryTimeout: 30000,
          batchSize: 2000,
        },
        storage: {
          maxSize: 0, // Unlimited
          compressionEnabled: true,
          encryptionEnabled: true,
          backupEnabled: true,
          retentionDays: 365,
        },
        monitoring: {
          enableHealthChecks: true,
          healthCheckInterval: 60000, // 1 minute
          enablePerformanceMetrics: true,
          enableErrorReporting: true,
          logLevel: 'warn',
        },
        features: {
          enableFullTextSearch: true,
          enableTransactions: true,
          enableRealTimeUpdates: true,
          enableOfflineMode: true,
          enableDataValidation: true,
          enableAuditLog: true,
        },
      },
    };
  }

  /**
   * Apply database configuration preset
   */
  public applyDatabaseConfigPreset(preset: string): void {
    const presets = this.getDatabaseConfigPresets();
    const presetConfig = presets[preset];
    
    if (!presetConfig) {
      throw new Error(`Unknown database configuration preset: ${preset}`);
    }
    
    this.updateDatabaseConfig(presetConfig);
  }

  /**
   * Load configuration from file asynchronously
   */
  private async loadConfigurationFile(): Promise<void> {
    try {
      const fileConfig = await loadDatabaseConfigFromFile();
      
      if (Object.keys(fileConfig).length > 0) {
        console.log('📁 [UnifiedConfig] Applying configuration from file');
        
        // Merge file configuration with current configuration
        this.updateDatabaseConfig(fileConfig);
      }
    } catch (error) {
      console.warn('📁 [UnifiedConfig] Failed to load configuration file:', error);
    }
  }

  /**
   * Reload configuration from environment variables
   */
  public reloadFromEnvironment(): void {
    console.log('🔄 [UnifiedConfig] Reloading configuration from environment variables');
    
    const envDatabaseConfig = loadDatabaseConfigFromEnv();
    
    if (Object.keys(envDatabaseConfig).length > 0) {
      this.updateDatabaseConfig(envDatabaseConfig);
      console.log('✅ [UnifiedConfig] Applied environment variable overrides');
    }
  }

  /**
   * Export current database configuration to environment variable format
   */
  public exportDatabaseConfigAsEnvVars(): Record<string, string> {
    const config = this.config.database;
    const envVars: Record<string, string> = {};
    
    // Provider settings
    if (config.provider) {
      envVars[DB_ENV_VARS.DATABASE_PROVIDER] = config.provider;
    }
    
    if (config.autoDetect !== undefined) {
      envVars[DB_ENV_VARS.DATABASE_AUTO_DETECT] = config.autoDetect.toString();
    }
    
    if (config.connectionString) {
      envVars[DB_ENV_VARS.DATABASE_URL] = config.connectionString;
    }
    
    // Performance settings
    envVars[DB_ENV_VARS.DATABASE_CACHE_SIZE] = config.performance.cacheSize.toString();
    envVars[DB_ENV_VARS.DATABASE_QUERY_TIMEOUT] = config.performance.queryTimeout.toString();
    envVars[DB_ENV_VARS.DATABASE_BATCH_SIZE] = config.performance.batchSize.toString();
    envVars[DB_ENV_VARS.DATABASE_ENABLE_CACHING] = config.performance.enableCaching.toString();
    envVars[DB_ENV_VARS.DATABASE_ENABLE_INDEXING] = config.performance.enableIndexing.toString();
    
    // Storage settings
    envVars[DB_ENV_VARS.DATABASE_MAX_SIZE] = config.storage.maxSize.toString();
    envVars[DB_ENV_VARS.DATABASE_COMPRESSION] = config.storage.compressionEnabled.toString();
    envVars[DB_ENV_VARS.DATABASE_ENCRYPTION] = config.storage.encryptionEnabled.toString();
    envVars[DB_ENV_VARS.DATABASE_BACKUP] = config.storage.backupEnabled.toString();
    envVars[DB_ENV_VARS.DATABASE_RETENTION_DAYS] = config.storage.retentionDays.toString();
    
    // Sync settings
    envVars[DB_ENV_VARS.DATABASE_SYNC_ENABLED] = config.sync.enabled.toString();
    envVars[DB_ENV_VARS.DATABASE_SYNC_INTERVAL] = config.sync.interval.toString();
    envVars[DB_ENV_VARS.DATABASE_SYNC_CONFLICT_RESOLUTION] = config.sync.conflictResolution;
    envVars[DB_ENV_VARS.DATABASE_SYNC_RETRY_ATTEMPTS] = config.sync.retryAttempts.toString();
    envVars[DB_ENV_VARS.DATABASE_SYNC_TIMEOUT] = config.sync.timeout.toString();
    
    // Monitoring settings
    envVars[DB_ENV_VARS.DATABASE_HEALTH_CHECKS] = config.monitoring.enableHealthChecks.toString();
    envVars[DB_ENV_VARS.DATABASE_HEALTH_CHECK_INTERVAL] = config.monitoring.healthCheckInterval.toString();
    envVars[DB_ENV_VARS.DATABASE_PERFORMANCE_METRICS] = config.monitoring.enablePerformanceMetrics.toString();
    envVars[DB_ENV_VARS.DATABASE_ERROR_REPORTING] = config.monitoring.enableErrorReporting.toString();
    envVars[DB_ENV_VARS.DATABASE_LOG_LEVEL] = config.monitoring.logLevel;
    
    // Feature settings
    envVars[DB_ENV_VARS.DATABASE_FULL_TEXT_SEARCH] = config.features.enableFullTextSearch.toString();
    envVars[DB_ENV_VARS.DATABASE_TRANSACTIONS] = config.features.enableTransactions.toString();
    envVars[DB_ENV_VARS.DATABASE_REAL_TIME_UPDATES] = config.features.enableRealTimeUpdates.toString();
    envVars[DB_ENV_VARS.DATABASE_OFFLINE_MODE] = config.features.enableOfflineMode.toString();
    envVars[DB_ENV_VARS.DATABASE_DATA_VALIDATION] = config.features.enableDataValidation.toString();
    envVars[DB_ENV_VARS.DATABASE_AUDIT_LOG] = config.features.enableAuditLog.toString();
    
    // API settings
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

  /**
   * Export current database configuration as JSON file content
   */
  public exportDatabaseConfigAsJSON(): string {
    return JSON.stringify(this.config.database, null, 2);
  }

  /**
   * Validate database configuration using schema validator
   */
  public validateDatabaseConfig(): ValidationResult {
    const config = this.config.database;
    const envConfig = this.getEnvironmentConfig();
    
    // Use schema validator for comprehensive validation
    const schemaValidation = databaseConfigValidator.validate(config);
    
    // Add environment-specific validation
    const environmentErrors: ValidationError[] = [];
    
    if (!envConfig.allowedDatabaseProviders.includes(config.provider)) {
      environmentErrors.push({
        field: 'provider',
        message: `Provider ${config.provider} is not allowed in ${this.config.environment} environment`,
        currentValue: config.provider,
        expectedValue: envConfig.allowedDatabaseProviders[0],
        autoFix: () => envConfig.allowedDatabaseProviders[0]
      });
    }
    
    return {
      ...schemaValidation,
      errors: [...schemaValidation.errors, ...environmentErrors],
      isValid: schemaValidation.isValid && environmentErrors.length === 0
    };
  }

  /**
   * Auto-fix database configuration issues
   */
  public autoFixDatabaseConfig(): {
    success: boolean;
    changes: string[];
    remainingIssues: ValidationResult;
  } {
    try {
      const { fixed, changes } = databaseConfigValidator.autoFix(this.config.database);
      
      // Apply the fixed configuration
      this.config.database = fixed;
      this.saveConfig();
      this.notifyListeners();
      
      // Validate the fixed configuration
      const remainingIssues = this.validateDatabaseConfig();
      
      return {
        success: true,
        changes,
        remainingIssues
      };
    } catch (error) {
      console.error('Auto-fix failed:', error);
      return {
        success: false,
        changes: [],
        remainingIssues: this.validateDatabaseConfig()
      };
    }
  }

  /**
   * Migrate database configuration to latest version
   */
  public migrateDatabaseConfig(currentVersion = '1.0.0'): {
    success: boolean;
    appliedMigrations: string[];
    validation: ValidationResult;
  } {
    try {
      const { migrated, appliedMigrations } = databaseConfigValidator.migrate(
        this.config.database, 
        currentVersion
      );
      
      // Apply the migrated configuration
      this.config.database = migrated;
      this.saveConfig();
      this.notifyListeners();
      
      // Validate the migrated configuration
      const validation = this.validateDatabaseConfig();
      
      return {
        success: true,
        appliedMigrations,
        validation
      };
    } catch (error) {
      console.error('Migration failed:', error);
      return {
        success: false,
        appliedMigrations: [],
        validation: this.validateDatabaseConfig()
      };
    }
  }

  /**
   * Reset database configuration to defaults
   */
  public resetDatabaseConfigToDefaults(): {
    success: boolean;
    validation: ValidationResult;
  } {
    try {
      const defaults = databaseConfigValidator.resetToDefaults(this.config.environment);
      
      // Apply environment-specific adjustments
      const envConfig = this.getEnvironmentConfig();
      if (envConfig.allowedDatabaseProviders.length > 0) {
        defaults.provider = envConfig.allowedDatabaseProviders[0];
      }
      
      this.config.database = defaults;
      this.saveConfig();
      this.notifyListeners();
      
      const validation = this.validateDatabaseConfig();
      
      return {
        success: true,
        validation
      };
    } catch (error) {
      console.error('Reset to defaults failed:', error);
      return {
        success: false,
        validation: this.validateDatabaseConfig()
      };
    }
  }

  /**
   * Repair database configuration (migrate + auto-fix)
   */
  public repairDatabaseConfig(currentVersion = '1.0.0'): {
    success: boolean;
    changes: string[];
    migrations: string[];
    validation: ValidationResult;
  } {
    try {
      const { repaired, changes, migrations } = databaseConfigValidator.repair(
        this.config.database,
        currentVersion
      );
      
      // Apply environment-specific fixes
      const envConfig = this.getEnvironmentConfig();
      if (!envConfig.allowedDatabaseProviders.includes(repaired.provider)) {
        repaired.provider = envConfig.allowedDatabaseProviders[0];
        changes.push(`provider: ${this.config.database.provider} → ${repaired.provider} (environment constraint)`);
      }
      
      this.config.database = repaired;
      this.saveConfig();
      this.notifyListeners();
      
      const validation = this.validateDatabaseConfig();
      
      return {
        success: true,
        changes,
        migrations,
        validation
      };
    } catch (error) {
      console.error('Repair failed:', error);
      return {
        success: false,
        changes: [],
        migrations: [],
        validation: this.validateDatabaseConfig()
      };
    }
  }
}

// Export singleton instance
export const unifiedConfigManager = UnifiedConfigManager.getInstance();

// Utility functions for backward compatibility
export const getAppMode = (): DataMode => {
  return unifiedConfigManager.getConfig().dataMode;
};

export const getEnvironment = (): Environment => {
  return unifiedConfigManager.getConfig().environment;
};

export const isDemo = (): boolean => {
  return unifiedConfigManager.getConfig().demo.active;
};

export const isDemoAvailable = (): boolean => {
  return unifiedConfigManager.getConfig().demo.available;
};

// Function to get current unified config for services
export const getCurrentUnifiedConfig = (): UnifiedAppConfig => {
  return unifiedConfigManager.getConfig();
};

// Function to initialize unified config
export const initializeUnifiedConfig = (): void => {
  // This will trigger the singleton initialization
  const config = unifiedConfigManager.getConfig();
  
  // Initialize production demo if in production and demo mode
  if (config.environment === 'production' && config.dataMode === 'demo') {
    initializeProductionDemo(config.environment, config.dataMode);
  }
};

// Enhanced utility functions
export const getUnifiedDataModeState = (): DataModeState => {
  return unifiedConfigManager.getDataModeState();
};

export const getUnifiedEnvironmentConfig = (): EnvironmentConfig => {
  return unifiedConfigManager.getEnvironmentConfig();
};

export const canSwitchModes = (): boolean => {
  const config = unifiedConfigManager.getConfig();
  return config.environmentConfig.config.canSwitchDataModes;
};

export const getAllowedModes = (): DataMode[] => {
  const config = unifiedConfigManager.getConfig();
  return config.environmentConfig.config.allowedDataModes;
};

export const getUnifiedProductionDemoState = (): ProductionDemoState => {
  const config = unifiedConfigManager.getConfig();
  return config.productionDemo.state;
};

export const isProductionDemoAvailable = (): boolean => {
  const config = unifiedConfigManager.getConfig();
  return config.productionDemo.transitionAvailable;
};

export const validateCurrentDataMode = () => {
  const config = unifiedConfigManager.getConfig();
  return validateDataMode(config.dataMode, config.environment);
};

// Database provider utilities
export const getCurrentDatabaseProvider = (): DatabaseProvider => {
  const config = unifiedConfigManager.getConfig();
  return config.database.provider;
};

export const getAllowedDatabaseProviders = (): DatabaseProvider[] => {
  const config = unifiedConfigManager.getConfig();
  return config.database.allowedProviders;
};

// Database configuration utilities
export const getDatabaseConfig = (): DatabaseConfig => {
  return unifiedConfigManager.getDatabaseConfig();
};

export const updateDatabaseConfig = (updates: Partial<DatabaseConfig>): void => {
    unifiedConfigManager.updateDatabaseConfig(updates);
  };

  export const getTabsConfig = (): TabsConfig => {
    return unifiedConfigManager.getTabsConfig();
  };

  export const updateTabsConfig = (updates: Partial<TabsConfig>): void => {
    unifiedConfigManager.updateTabsConfig(updates);
  };

export const updateDatabaseProvider = (provider: DatabaseProvider): void => {
  unifiedConfigManager.updateDatabaseProvider(provider);
};

export const getDatabaseConfigPresets = (): Record<string, Partial<DatabaseConfig>> => {
  return unifiedConfigManager.getDatabaseConfigPresets();
};

export const applyDatabaseConfigPreset = (preset: string): void => {
  unifiedConfigManager.applyDatabaseConfigPreset(preset);
};

export const validateDatabaseConfig = () => {
  return unifiedConfigManager.validateDatabaseConfig();
};

// Enhanced validation utilities
export const validateDatabaseConfigEnhanced = () => {
  const { databaseConfigValidator } = require('./databaseConfigSchema');
  const config = unifiedConfigManager.getDatabaseConfig();
  return databaseConfigValidator.validate(config);
};

export const resetDatabaseConfig = (environment?: 'development' | 'staging' | 'production') => {
  const { databaseConfigValidator } = require('./databaseConfigSchema');
  const resetConfig = databaseConfigValidator.reset(environment);
  unifiedConfigManager.updateDatabaseConfig(resetConfig);
  return resetConfig;
};

// Environment-based configuration utilities
export const reloadConfigFromEnvironment = (): void => {
  unifiedConfigManager.reloadFromEnvironment();
};

export const exportDatabaseConfigAsEnvVars = (): Record<string, string> => {
  return unifiedConfigManager.exportDatabaseConfigAsEnvVars();
};

export const exportDatabaseConfigAsJSON = (): string => {
  return unifiedConfigManager.exportDatabaseConfigAsJSON();
};

export const getDatabaseEnvVarKeys = () => {
  return DB_ENV_VARS;
};

// Database configuration validation and repair utilities
export const autoFixDatabaseConfig = () => {
  return unifiedConfigManager.autoFixDatabaseConfig();
};

export const migrateDatabaseConfig = (currentVersion?: string) => {
  return unifiedConfigManager.migrateDatabaseConfig(currentVersion);
};

export const resetDatabaseConfigToDefaults = () => {
  return unifiedConfigManager.resetDatabaseConfigToDefaults();
};

export const repairDatabaseConfig = (currentVersion?: string) => {
  return unifiedConfigManager.repairDatabaseConfig(currentVersion);
};

// Export validator for advanced usage
export { databaseConfigValidator, DatabaseConfigValidator } from './databaseConfigSchema';

// Configuration migration helper
export const migrateConfigurationToV2 = (): void => {
  const config = unifiedConfigManager.getConfig();
  
  // Check if migration is needed
  if (config.configVersion && config.configVersion.startsWith('2.')) {
    return; // Already migrated
  }
  
  // Perform migration
  const detectedEnvironment = detectEnvironment();
  unifiedConfigManager.updateEnvironment(detectedEnvironment, 'env');
  
  console.log('Configuration migrated to v2.0');
};

// Backward compatibility functions (migrated from appConfig.ts)
export const getAppConfig = (): UnifiedAppConfig => unifiedConfigManager.getConfig();
export const updateAppConfig = (updates: Partial<UnifiedAppConfig>): void => unifiedConfigManager.updateConfig(updates);
export const isFeatureEnabled = (feature: keyof FeatureConfig): boolean => unifiedConfigManager.isFeatureEnabled(feature);
export const subscribeToConfig = (listener: (config: UnifiedAppConfig) => void): (() => void) => unifiedConfigManager.subscribe(listener);

// Environment-based configuration detection (migrated from appConfig.ts)
export const detectOptimalConfiguration = (): Partial<UnifiedAppConfig> => {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const hasIndexedDB = typeof window !== 'undefined' && 'indexedDB' in window;
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

  return {
    useEnhancedFeatures: hasIndexedDB && hasServiceWorker,
    features: {
      enhancedDataLayer: hasIndexedDB,
      networkStatusIndicator: true,
      moduleHealthIndicator: true,
      syncStatusComponent: hasServiceWorker,
      globalNotifications: true,
      performanceOptimizations: isProduction,
      advancedErrorBoundaries: true,
      enableOfflineMode: hasServiceWorker && hasIndexedDB,
      enableRealTimeSync: isOnline && isProduction,
      enablePerformanceMonitoring: isProduction,
      enableAdvancedReporting: isProduction,
      enableBulkOperations: true,
      enableDataExport: true,
      enableNotifications: true,
      enableAuditLog: isProduction,
      enableMultiTenant: isProduction,
      performanceMonitorWidget: false,
    },
  };
};

// Legacy AppMode type compatibility
export type AppMode = DataMode;

// Re-export types for convenience
export type {
  Environment,
  DataMode,
  DatabaseProvider,
  EnvironmentConfig,
} from './environmentMatrix';

export type {
  DataModeSwitchResult,
  DataModeState,
} from './dataModePolicies';

export type {
  ProductionDemoConfig,
  ProductionDemoState,
} from './productionDemo';