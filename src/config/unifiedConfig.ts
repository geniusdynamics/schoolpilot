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
import { DB_ENV_VARS } from './databaseEnvVars';
import {
  loadDatabaseConfigFromEnvironment,
  loadDatabaseConfigFromFile,
  exportDatabaseConfigToEnvVars,
} from './databaseConfigRuntime';
import { detectOptimalConfigurationRuntime } from './environmentRuntime';
export { DB_ENV_VARS } from './databaseEnvVars';

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
  enableTabbedMode: boolean;
  enablePerModuleControl: boolean;
  tabbedModeModuleOverrides: Record<string, boolean>;
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
    
    // Tabbed mode feature flags
    enableTabbedMode: true,
    enablePerModuleControl: true,
    tabbedModeModuleOverrides: {
      'dashboard': true,
      'settings': true,
      'reports': true,
      'academics': false,
      'administration': false,
      'finance': false,
      'hr': false,
      'inventory': false,
      'library': false,
      'nutrition': false,
      'admissions': false,
      'audit': false,
    },
    
    // Demo/Test mode features
    demoMode: false,
    testMode: false,
    enableTestDataGeneration: false,
    showDebugInfo: false,
    enableTestLogin: false,
  },
  
  // Development Configuration
  development: DevelopmentConfig;
  
  // Metadata
  version: string;
  lastUpdated: Date;
  configVersion: string;
}

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
  
  // Tabbed Mode Features (enabled by default for testing)
  enableTabbedMode: true,
  enablePerModuleControl: true,
  tabbedModeModuleOverrides: {}
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
  const envDatabaseConfig = loadDatabaseConfigFromEnvironment();
  
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
  private initialized = false;

  private constructor() {
    // Initialize with defaults, async loading happens in init()
    this.config = createDefaultConfig();
  }

  /**
   * Initialize the config manager (async, loads from storage and file)
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.config = await this.loadConfig();
    await this.loadConfigurationFile();
    this.initialized = true;
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
  private async loadConfig(): Promise<UnifiedAppConfig> {
    let config = createDefaultConfig();

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
          
          // Deep merge features to ensure new feature flags are included
          const mergedConfig = {
            ...config,
            ...parsed,
            features: {
              ...config.features, // Start with defaults to ensure all flags exist
              ...parsed.features // Then apply user preferences
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
    
    const envDatabaseConfig = loadDatabaseConfigFromEnvironment();
    
    if (Object.keys(envDatabaseConfig).length > 0) {
      this.updateDatabaseConfig(envDatabaseConfig);
      console.log('✅ [UnifiedConfig] Applied environment variable overrides');
    }
  }

  /**
   * Export current database configuration to environment variable format
   */
  public exportDatabaseConfigAsEnvVars(): Record<string, string> {
    return exportDatabaseConfigToEnvVars(this.config.database);
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

// Async initialization helper
export const initUnifiedConfig = async (): Promise<void> => {
  await unifiedConfigManager.init();
};

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
  return detectOptimalConfigurationRuntime() as Partial<UnifiedAppConfig>;
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
