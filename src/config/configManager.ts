import { logger } from '@/utils/logging';

/**
 * Unified Configuration Manager
 *
 * Contains:
 *  - createDefaultConfig() â€” factory function for UnifiedAppConfig
 *  - CONFIG_PRESETS â€” named configuration presets
 *  - UnifiedConfigManager â€” singleton class for config persistence, updates, listeners
 *  - Singleton instance and utility accessor functions
 *
 * Imported by unifiedConfig.ts which re-exports everything for backward compat.
 */

// ---------------------------------------------------------------------------
// Imports from focused config modules
// ---------------------------------------------------------------------------
import {
  Environment,
  DataMode,
  DatabaseProvider,
  EnvironmentConfig,
  detectEnvironment,
  getEnvironmentConfig,
  getDefaultDataMode,
  getDefaultDatabaseProvider,
} from './environmentMatrix';
import { DataModeSwitchResult, DataModeState, switchDataMode, getDataModeState, getStoredDataMode } from './dataModePolicies';
import { getProductionDemoConfig, getProductionDemoState, transitionToLiveMode } from './productionDemo';
import { databaseConfigValidator, ValidationResult, ValidationError } from './databaseConfigSchema';
import {
  loadDatabaseConfigFromEnvironment,
  loadDatabaseConfigFromFile,
  exportDatabaseConfigToEnvVars,
} from './databaseConfigRuntime';
import type {
  BackendEnvironment,
  BackendStatus,
  DevelopmentConfig,
  DemoConfig,
  BackendConfig,
  DatabaseConfig,
  ProductionDemoConfigIntegration,
  EnvironmentConfigIntegration,
} from './core';
import type { FeatureConfig } from './features';
import { DEFAULT_FEATURES } from './features';
import { CONFIG_STORAGE_KEY, CONFIG_VERSION_KEY } from './core';

// ---------------------------------------------------------------------------
// Main Unified Configuration Interface
// ---------------------------------------------------------------------------

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
    enhancedDataLayer: true;
    enhancedUI: boolean;
    performanceMonitorWidget: boolean;
    enableErrorReporting: boolean;
    enableLogging: boolean;

    // Module-specific features
    enableAcademicsModule: boolean;
    enableAdministrationModule: boolean;
    enableFinanceModule: boolean;
    enableHrModule: boolean;
    enableInventoryModule: boolean;
    enableLibraryModule: boolean;
    enableNutritionModule: boolean;
    enableReportsModule: boolean;
    enableSettingsModule: boolean;
    enableAdmissionsModule: boolean;

    // Feature-specific flags
    globalNotifications: boolean;
    enableAccessibility: boolean;
    enableDarkMode: boolean;
    enableMultiLanguage: boolean;
    enableOfflineMode: boolean;
    enableAuditTrail: boolean;
    enableDataExport: boolean;
    enableCustomFields: boolean;
    enableWorkflowEngine: boolean;
    enableDocumentManagement: boolean;
    enableCommunicationCenter: boolean;
    enableAnalyticsDashboard: boolean;

    // Tabbed mode feature flags
    enableTabbedMode: boolean;
    enablePerModuleControl: boolean;
    tabbedModeModuleOverrides: Record<string, boolean>;

    // Demo/Test mode features
    demoMode: boolean;
    testMode: boolean;
    enableTestDataGeneration: boolean;
    showDebugInfo: boolean;
    enableTestLogin: boolean;
  };

  // Development Configuration
  development: DevelopmentConfig;

  // Metadata
  version: string;
  lastUpdated: Date;
  configVersion: string;
}

// ---------------------------------------------------------------------------
// Default Development Configuration
// ---------------------------------------------------------------------------
const DEFAULT_DEVELOPMENT: DevelopmentConfig = {
  enableDebugMode: false,
  enableMockData: true,
  enablePerformanceMonitoring: false,
  logLevel: 'info',
};

// ---------------------------------------------------------------------------
// createDefaultConfig
// ---------------------------------------------------------------------------
export function createDefaultConfig(): UnifiedAppConfig {
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
      provider: envDatabaseConfig.provider || defaultDatabaseProvider,
      allowedProviders: envConfig.allowedDatabaseProviders,
      autoDetect: envDatabaseConfig.autoDetect ?? true,
      connectionString:
        envDatabaseConfig.connectionString ||
        process.env.REACT_APP_DATABASE_URL ||
        process.env.DATABASE_URL,
      options: {},
      apiConfig: envDatabaseConfig.apiConfig,

      performance: {
        enableIndexing: envDatabaseConfig.performance?.enableIndexing ?? true,
        enableCaching:
          envDatabaseConfig.performance?.enableCaching ??
          detectedEnvironment === 'production',
        cacheSize:
          envDatabaseConfig.performance?.cacheSize ??
          (detectedEnvironment === 'production' ? 100 : 50),
        queryTimeout: envDatabaseConfig.performance?.queryTimeout ?? 30000,
        batchSize:
          envDatabaseConfig.performance?.batchSize ??
          (detectedEnvironment === 'production' ? 1000 : 100),
      },

      storage: {
        maxSize:
          envDatabaseConfig.storage?.maxSize ??
          (detectedEnvironment === 'production' ? 0 : 500),
        compressionEnabled:
          envDatabaseConfig.storage?.compressionEnabled ??
          detectedEnvironment === 'production',
        encryptionEnabled: envDatabaseConfig.storage?.encryptionEnabled ?? false,
        backupEnabled:
          envDatabaseConfig.storage?.backupEnabled ??
          detectedEnvironment !== 'development',
        retentionDays:
          envDatabaseConfig.storage?.retentionDays ??
          (detectedEnvironment === 'production' ? 365 : 30),
      },

      sync: {
        enabled:
          envDatabaseConfig.sync?.enabled ??
          (defaultDatabaseProvider === 'backend-api' ||
            defaultDatabaseProvider === 'pouchdb'),
        interval: envDatabaseConfig.sync?.interval ?? 30000,
        conflictResolution: envDatabaseConfig.sync?.conflictResolution ?? 'manual',
        batchSize: envDatabaseConfig.sync?.batchSize ?? 100,
        retryAttempts: envDatabaseConfig.sync?.retryAttempts ?? 3,
        timeout: envDatabaseConfig.sync?.timeout ?? 60000,
      },

      monitoring: {
        enableHealthChecks: envDatabaseConfig.monitoring?.enableHealthChecks ?? true,
        healthCheckInterval:
          envDatabaseConfig.monitoring?.healthCheckInterval ?? 300000,
        enablePerformanceMetrics:
          envDatabaseConfig.monitoring?.enablePerformanceMetrics ??
          detectedEnvironment === 'production',
        enableErrorReporting:
          envDatabaseConfig.monitoring?.enableErrorReporting ??
          detectedEnvironment !== 'development',
        logLevel:
          envDatabaseConfig.monitoring?.logLevel ??
          (detectedEnvironment === 'development' ? 'debug' : 'info'),
      },

      features: {
        enableFullTextSearch:
          envDatabaseConfig.features?.enableFullTextSearch ??
          defaultDatabaseProvider !== 'backend-api',
        enableTransactions:
          envDatabaseConfig.features?.enableTransactions ??
          (defaultDatabaseProvider === 'sqlite-file' ||
            defaultDatabaseProvider === 'sqlite-wasm'),
        enableRealTimeUpdates:
          envDatabaseConfig.features?.enableRealTimeUpdates ??
          (defaultDatabaseProvider === 'pouchdb' ||
            defaultDatabaseProvider === 'livestore'),
        enableOfflineMode:
          envDatabaseConfig.features?.enableOfflineMode ??
          defaultDatabaseProvider !== 'backend-api',
        enableDataValidation:
          envDatabaseConfig.features?.enableDataValidation ?? true,
        enableAuditLog:
          envDatabaseConfig.features?.enableAuditLog ??
          detectedEnvironment === 'production',
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
    } as UnifiedAppConfig['features'],

    // Development Configuration
    development: {
      ...DEFAULT_DEVELOPMENT,
    },

    // Metadata
    version: '2.0.0',
    lastUpdated: new Date(),
    configVersion: '2.0.0-enhanced',
  };
}

// ---------------------------------------------------------------------------
// Configuration Presets
// ---------------------------------------------------------------------------
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
    } as any,
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
    } as any,
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
    } as any,
    development: {
      enableDebugMode: true,
      enableMockData: true,
      enablePerformanceMonitoring: true,
      logLevel: 'debug',
    },
  },
};

export const CONFIG_PRESETS = CONFIG_PRESETS_DEFINITIONS;

// Configuration version for migration (internal)
const CONFIG_VERSION = '2.0.0';

// ---------------------------------------------------------------------------
// UnifiedConfigManager
// ---------------------------------------------------------------------------

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
    this.config = createDefaultConfig();
  }

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

  private async loadConfig(): Promise<UnifiedAppConfig> {
    let config = createDefaultConfig();

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
        const storedVersion = localStorage.getItem(CONFIG_VERSION_KEY);

        if (stored) {
          const parsed = JSON.parse(stored);

          if (storedVersion !== CONFIG_VERSION) {
            logger.info(
              'Migrating unified configuration from version',
              storedVersion,
              'to',
              CONFIG_VERSION,
            );
            localStorage.setItem(CONFIG_VERSION_KEY, CONFIG_VERSION);
          }

          const mergedConfig = {
            ...config,
            ...parsed,
            features: {
              ...config.features,
              ...parsed.features,
            },
            lastUpdated: new Date(parsed.lastUpdated || Date.now()),
          };

          const defaultFeatureFlags = Object.keys(config.features) as (keyof FeatureConfig)[];
          const currentFeatureFlags = Object.keys(mergedConfig.features) as (keyof FeatureConfig)[];
          const missingFlags = defaultFeatureFlags.filter(
            (flag) => !currentFeatureFlags.includes(flag),
          );

          if (missingFlags.length > 0) {
            logger.info('Adding missing feature flags:', missingFlags);
            missingFlags.forEach((flag) => {
              (mergedConfig.features as any)[flag] = (config.features as any)[flag];
            });
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(mergedConfig));
          }

          config = mergedConfig;
        } else {
          localStorage.setItem(CONFIG_VERSION_KEY, CONFIG_VERSION);
        }
      } catch (error) {
        logger.warn('Failed to load stored configuration:', error);
      }

      const urlParams = new URLSearchParams(window.location.search);
      const preset = urlParams.get('preset');
      const mode = urlParams.get('mode') as DataMode;
      const enhanced = urlParams.get('enhanced') === 'true';
      const environment = urlParams.get('environment') as Environment;

      if (preset && CONFIG_PRESETS[preset]) {
        const presetConfig = CONFIG_PRESETS[preset];
        config = {
          ...config,
          ...presetConfig,
          features: {
            ...config.features,
            ...presetConfig.features,
          },
        };
      }

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

  private saveConfig(): void {
    try {
      this.config.lastUpdated = new Date();
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      logger.error('Failed to save configuration:', error);
    }
  }

  public getConfig(): UnifiedAppConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<UnifiedAppConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      lastUpdated: new Date(),
    };
    this.saveConfig();
    this.notifyListeners();
  }

  public updateBackendStatus(status: Partial<BackendStatus>): void {
    this.config.backend = {
      ...this.config.backend,
      ...status,
      lastChecked: new Date(),
    };

    this.config.demo.available =
      status.environment === 'development' ||
      (status.environment === 'production' && status.demoModeEnabled === true);

    this.saveConfig();
    this.notifyListeners();
  }

  public async switchDataMode(
    toMode: DataMode,
    options: { skipConfirmation?: boolean; skipValidation?: boolean } = {},
  ): Promise<DataModeSwitchResult> {
    const environment = this.config.environment;

    const result = await switchDataMode(
      toMode,
      this.config.dataMode,
      this.config.environment,
      options,
    );

    if (result.success) {
      this.config.dataMode = result.newMode;
      this.config.demo.active = result.newMode === 'demo';

      if (result.newMode === 'demo') {
        this.config.demo.lastActivated = new Date();
      }

      if (environment === 'production') {
        this.config.productionDemo.state = getProductionDemoState();
      }

      this.saveConfig();
      this.notifyListeners();
    }

    return result;
  }

  public async switchToDemo(): Promise<void> {
    const result = await this.switchDataMode('demo');
    if (!result.success) {
      throw new Error(result.error || 'Failed to switch to demo mode');
    }
  }

  public async switchToProduction(): Promise<void> {
    const result = await this.switchDataMode('production');
    if (!result.success) {
      throw new Error(result.error || 'Failed to switch to production mode');
    }
  }

  public async transitionToLiveMode(
    confirmationInputs: Record<string, string> = {},
  ): Promise<any> {
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

  public getDataModeState(): DataModeState {
    return getDataModeState(this.config.dataMode, this.config.environment);
  }

  public getEnvironmentConfig(): EnvironmentConfig {
    return this.config.environmentConfig.config;
  }

  public updateEnvironment(
    environment: Environment,
    source: 'url' | 'env' | 'manual' = 'manual',
  ): void {
    const envConfig = getEnvironmentConfig(environment);
    const defaultDataMode = getDefaultDataMode(environment);

    this.config.environment = environment;
    this.config.environmentConfig = {
      current: environment,
      config: envConfig,
      detectedAutomatically: source !== 'manual',
      overrideSource: source,
    };

    if (!envConfig.allowedDataModes.includes(this.config.dataMode)) {
      this.config.dataMode = defaultDataMode;
    }

    this.config.database.allowedProviders = envConfig.allowedDatabaseProviders;

    this.config.demo.available = envConfig.allowedDataModes.includes('demo');
    this.config.demo.canToggle = envConfig.canSwitchDataModes;

    if (environment === 'production') {
      this.config.productionDemo.state = getProductionDemoState();
      this.config.productionDemo.transitionAvailable = true;
    } else {
      this.config.productionDemo.transitionAvailable = false;
    }

    this.config.features = {
      ...this.config.features,
      ...envConfig.features,
    };

    this.saveConfig();
    this.notifyListeners();
  }

  public applyPreset(preset: keyof typeof CONFIG_PRESETS): void {
    const presetConfig = CONFIG_PRESETS[preset];
    this.updateConfig(presetConfig);
  }

  public subscribe(listener: (config: UnifiedAppConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.config));
  }

  public reset(): void {
    this.config = createDefaultConfig();
    this.saveConfig();
    this.notifyListeners();
  }

  public validate(): boolean {
    try {
      if (!this.config.environment || !this.config.dataMode) {
        return false;
      }
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

  public isFeatureEnabled(feature: keyof FeatureConfig): boolean {
    return this.config.features[feature];
  }

  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  public updateFeatures(features: Partial<FeatureConfig>): void {
    this.config.features = {
      ...this.config.features,
      ...features,
    };
    this.saveConfig();
    this.notifyListeners();
  }

  public getConfigVersion(): string {
    return CONFIG_VERSION;
  }

  public getDatabaseConfig(): DatabaseConfig {
    return { ...this.config.database };
  }

  public updateDatabaseConfig(updates: Partial<DatabaseConfig>): void {
    this.config.database = {
      ...this.config.database,
      ...updates,
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

  public updateDatabaseProvider(provider: DatabaseProvider): void {
    const envConfig = this.getEnvironmentConfig();

    if (!envConfig.allowedDatabaseProviders.includes(provider)) {
      throw new Error(
        `Provider ${provider} is not allowed in ${this.config.environment} environment`,
      );
    }

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
          healthCheckInterval: 60000,
          enablePerformanceMetrics: true,
          enableErrorReporting: true,
          logLevel: 'info',
        },
      },

      storage_optimized: {
        storage: {
          maxSize: 1000,
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
          interval: 10000,
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
          healthCheckInterval: 300000,
          enablePerformanceMetrics: false,
          enableErrorReporting: false,
          logLevel: 'debug',
        },
        storage: {
          maxSize: 100,
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
          maxSize: 0,
          compressionEnabled: true,
          encryptionEnabled: true,
          backupEnabled: true,
          retentionDays: 365,
        },
        monitoring: {
          enableHealthChecks: true,
          healthCheckInterval: 60000,
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

  public applyDatabaseConfigPreset(preset: string): void {
    const presets = this.getDatabaseConfigPresets();
    const presetConfig = presets[preset];

    if (!presetConfig) {
      throw new Error(`Unknown database configuration preset: ${preset}`);
    }

    this.updateDatabaseConfig(presetConfig);
  }

  private async loadConfigurationFile(): Promise<void> {
    try {
      const fileConfig = await loadDatabaseConfigFromFile();

      if (Object.keys(fileConfig).length > 0) {
        logger.info('ðŸ“ [UnifiedConfig] Applying configuration from file');
        this.updateDatabaseConfig(fileConfig);
      }
    } catch (error) {
      logger.warn('ðŸ“ [UnifiedConfig] Failed to load configuration file:', error);
    }
  }

  public reloadFromEnvironment(): void {
    logger.info('ðŸ”„ [UnifiedConfig] Reloading configuration from environment variables');

    const envDatabaseConfig = loadDatabaseConfigFromEnvironment();

    if (Object.keys(envDatabaseConfig).length > 0) {
      this.updateDatabaseConfig(envDatabaseConfig);
      logger.info('âœ… [UnifiedConfig] Applied environment variable overrides');
    }
  }

  public exportDatabaseConfigAsEnvVars(): Record<string, string> {
    return exportDatabaseConfigToEnvVars(this.config.database);
  }

  public exportDatabaseConfigAsJSON(): string {
    return JSON.stringify(this.config.database, null, 2);
  }

  public validateDatabaseConfig(): ValidationResult {
    const config = this.config.database;
    const envConfig = this.getEnvironmentConfig();

    const schemaValidation = databaseConfigValidator.validate(config);

    const environmentErrors: ValidationError[] = [];

    if (!envConfig.allowedDatabaseProviders.includes(config.provider)) {
      environmentErrors.push({
        field: 'provider',
        message: `Provider ${config.provider} is not allowed in ${this.config.environment} environment`,
        currentValue: config.provider,
        expectedValue: envConfig.allowedDatabaseProviders[0],
        autoFix: () => envConfig.allowedDatabaseProviders[0],
      });
    }

    return {
      ...schemaValidation,
      errors: [...schemaValidation.errors, ...environmentErrors],
      isValid: schemaValidation.isValid && environmentErrors.length === 0,
    };
  }

  public autoFixDatabaseConfig(): {
    success: boolean;
    changes: string[];
    remainingIssues: ValidationResult;
  } {
    try {
      const { fixed, changes } = databaseConfigValidator.autoFix(this.config.database);

      this.config.database = fixed;
      this.saveConfig();
      this.notifyListeners();

      const remainingIssues = this.validateDatabaseConfig();

      return { success: true, changes, remainingIssues };
    } catch (error) {
      logger.error('Auto-fix failed:', error);
      return {
        success: false,
        changes: [],
        remainingIssues: this.validateDatabaseConfig(),
      };
    }
  }

  public migrateDatabaseConfig(currentVersion = '1.0.0'): {
    success: boolean;
    appliedMigrations: string[];
    validation: ValidationResult;
  } {
    try {
      const { migrated, appliedMigrations } = databaseConfigValidator.migrate(
        this.config.database,
        currentVersion,
      );

      this.config.database = migrated;
      this.saveConfig();
      this.notifyListeners();

      const validation = this.validateDatabaseConfig();

      return { success: true, appliedMigrations, validation };
    } catch (error) {
      logger.error('Migration failed:', error);
      return {
        success: false,
        appliedMigrations: [],
        validation: this.validateDatabaseConfig(),
      };
    }
  }

  public resetDatabaseConfigToDefaults(): {
    success: boolean;
    validation: ValidationResult;
  } {
    try {
      const defaults = databaseConfigValidator.resetToDefaults(this.config.environment);

      const envConfig = this.getEnvironmentConfig();
      if (envConfig.allowedDatabaseProviders.length > 0) {
        defaults.provider = envConfig.allowedDatabaseProviders[0];
      }

      this.config.database = defaults;
      this.saveConfig();
      this.notifyListeners();

      const validation = this.validateDatabaseConfig();

      return { success: true, validation };
    } catch (error) {
      logger.error('Reset to defaults failed:', error);
      return { success: false, validation: this.validateDatabaseConfig() };
    }
  }

  public repairDatabaseConfig(currentVersion = '1.0.0'): {
    success: boolean;
    changes: string[];
    migrations: string[];
    validation: ValidationResult;
  } {
    try {
      const { repaired, changes, migrations } = databaseConfigValidator.repair(
        this.config.database,
        currentVersion,
      );

      const envConfig = this.getEnvironmentConfig();
      if (!envConfig.allowedDatabaseProviders.includes(repaired.provider)) {
        repaired.provider = envConfig.allowedDatabaseProviders[0];
        changes.push(
          `provider: ${this.config.database.provider} â†’ ${repaired.provider} (environment constraint)`,
        );
      }

      this.config.database = repaired;
      this.saveConfig();
      this.notifyListeners();

      const validation = this.validateDatabaseConfig();

      return { success: true, changes, migrations, validation };
    } catch (error) {
      logger.error('Repair failed:', error);
      return {
        success: false,
        changes: [],
        migrations: [],
        validation: this.validateDatabaseConfig(),
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance + init function
// ---------------------------------------------------------------------------
export const unifiedConfigManager = UnifiedConfigManager.getInstance();

export const initUnifiedConfig = async (): Promise<void> => {
  await unifiedConfigManager.init();
};

// ---------------------------------------------------------------------------
// Default Configuration (exported for direct access)
// ---------------------------------------------------------------------------
export const DEFAULT_UNIFIED_CONFIG: UnifiedAppConfig = createDefaultConfig();
