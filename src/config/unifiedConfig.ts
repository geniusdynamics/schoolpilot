/**
 * Unified Configuration System
 * Replaces both appConfig.ts and config.ts with a single, coherent configuration management system
 * Supports development/production environments with demo mode capabilities
 */

export type Environment = 'development' | 'production';
export type DataMode = 'backend' | 'demo' | 'offline';
export type BackendEnvironment = 'development' | 'production' | 'unknown';

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

// Main Unified Configuration Interface
export interface UnifiedAppConfig {
  environment: Environment;
  dataMode: DataMode;
  useEnhancedFeatures: boolean;
  backend: BackendConfig;
  demo: DemoConfig;
  features: FeatureConfig;
  development: DevelopmentConfig;
  version: string;
  lastUpdated: Date;
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
};

// Default Development Configuration
const DEFAULT_DEVELOPMENT: DevelopmentConfig = {
  enableDebugMode: false,
  enableMockData: true,
  enablePerformanceMonitoring: false,
  logLevel: 'info',
};

// Default Configuration
export const DEFAULT_UNIFIED_CONFIG: UnifiedAppConfig = {
  environment: 'development',
  dataMode: 'demo',
  useEnhancedFeatures: true,
  backend: {
    url: process.env.REACT_APP_API_URL || '',
    environment: 'unknown',
    available: false,
  },
  demo: {
    available: true,
    active: true,
    canToggle: true,
  },
  features: DEFAULT_FEATURES,
  development: DEFAULT_DEVELOPMENT,
  version: '1.0.0',
  lastUpdated: new Date(),
};

// Configuration Presets
export const CONFIG_PRESETS = {
  development: {
    ...DEFAULT_UNIFIED_CONFIG,
    environment: 'development' as Environment,
    dataMode: 'backend' as DataMode,
    useEnhancedFeatures: true,
    features: {
      ...DEFAULT_FEATURES,
      enablePerformanceMonitoring: true,
    },
    development: {
      ...DEFAULT_DEVELOPMENT,
      enableDebugMode: true,
      enableMockData: true,
      enablePerformanceMonitoring: true,
      logLevel: 'debug' as const,
    },
  },
  production: {
    ...DEFAULT_UNIFIED_CONFIG,
    environment: 'production' as Environment,
    dataMode: 'backend' as DataMode,
    useEnhancedFeatures: true,
    features: {
      ...DEFAULT_FEATURES,
      enableAdvancedReporting: true,
      enableAuditLog: true,
      enablePerformanceMonitoring: true,
    },
    development: {
      ...DEFAULT_DEVELOPMENT,
      enableDebugMode: false,
      enableMockData: false,
      enablePerformanceMonitoring: false,
      logLevel: 'warn' as const,
    },
  },
  demo: {
    ...DEFAULT_UNIFIED_CONFIG,
    environment: 'production' as Environment,
    dataMode: 'demo' as DataMode,
    useEnhancedFeatures: false,
    demo: {
      available: true,
      active: true,
      canToggle: true,
    },
    features: {
      ...DEFAULT_FEATURES,
      enableBulkOperations: true,
      enableDataExport: true,
      enableNotifications: true,
      enablePerformanceMonitoring: false,
    },
  },
};

// Configuration Storage Keys
export const CONFIG_STORAGE_KEY = 'unified_app_config';
export const BACKEND_STATUS_CACHE_KEY = 'backend_status_cache';
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// RxDB Constants (migrated from config.ts)
export const RXDB_DB_NAME = 'school_management_db';
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
   * Load configuration from localStorage or use defaults
   */
  private loadConfig(): UnifiedAppConfig {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_UNIFIED_CONFIG,
          ...parsed,
          lastUpdated: new Date(parsed.lastUpdated || Date.now()),
        };
      }
    } catch (error) {
      console.warn('Failed to load stored configuration:', error);
    }
    return { ...DEFAULT_UNIFIED_CONFIG };
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
   * Switch to demo mode
   */
  public async switchToDemo(): Promise<void> {
    if (!this.config.demo.available) {
      throw new Error('Demo mode is not available');
    }

    this.config.dataMode = 'demo';
    this.config.demo.active = true;
    this.config.demo.lastActivated = new Date();
    
    this.saveConfig();
    this.notifyListeners();
  }

  /**
   * Switch to production mode
   */
  public async switchToProduction(): Promise<void> {
    this.config.dataMode = 'backend';
    this.config.demo.active = false;
    
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
    this.config = { ...DEFAULT_UNIFIED_CONFIG };
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
  unifiedConfigManager.getConfig();
};