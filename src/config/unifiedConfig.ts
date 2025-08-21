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

// Enhanced Database Configuration
export interface DatabaseConfig {
  provider: DatabaseProvider;
  allowedProviders: DatabaseProvider[];
  autoDetect: boolean;
  connectionString?: string;
  options: Record<string, any>;
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
    enhancedDataLayer: false,
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
    
    // Database Configuration
    database: {
      provider: defaultDatabaseProvider,
      allowedProviders: envConfig.allowedDatabaseProviders,
      autoDetect: false, // Default value since envConfig.autoDetectBackend doesn't exist
      connectionString: process.env.REACT_APP_DATABASE_URL,
      options: {},
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
    useEnhancedFeatures: false,
    features: {
      enhancedDataLayer: false,
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