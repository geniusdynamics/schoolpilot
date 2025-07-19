// Application configuration system for feature flags and settings
import { AppMode } from '../contexts/config';

export interface AppConfig {
  // Core application settings
  mode: AppMode;
  useEnhancedFeatures: boolean;
  enableOfflineCapabilities: boolean;
  enableBackendIntegration: boolean;
  
  // Feature flags
  features: {
    enhancedDataLayer: boolean;
    networkStatusIndicator: boolean;
    moduleHealthIndicator: boolean;
    syncStatusComponent: boolean;
    globalNotifications: boolean;
    performanceOptimizations: boolean;
    advancedErrorBoundaries: boolean;
  };
  
  // Development settings
  development: {
    enableDebugLogging: boolean;
    showPerformanceMetrics: boolean;
    enableHotReload: boolean;
  };
  
  // Backward compatibility
  compatibility: {
    maintainLegacyRouting: boolean;
    supportOldDataContext: boolean;
    enableFallbackComponents: boolean;
  };
}

// Default configuration
const DEFAULT_CONFIG: AppConfig = {
  mode: 'demo',
  useEnhancedFeatures: false,
  enableOfflineCapabilities: false,
  enableBackendIntegration: false,
  
  features: {
    enhancedDataLayer: false,
    networkStatusIndicator: false,
    moduleHealthIndicator: false,
    syncStatusComponent: false,
    globalNotifications: false,
    performanceOptimizations: true,
    advancedErrorBoundaries: true,
  },
  
  development: {
    enableDebugLogging: process.env.NODE_ENV === 'development',
    showPerformanceMetrics: false,
    enableHotReload: process.env.NODE_ENV === 'development',
  },
  
  compatibility: {
    maintainLegacyRouting: true,
    supportOldDataContext: true,
    enableFallbackComponents: true,
  },
};

// Configuration presets
export const CONFIG_PRESETS: Record<string, Partial<AppConfig>> = {
  demo: {
    mode: 'demo',
    useEnhancedFeatures: false,
    enableOfflineCapabilities: false,
    enableBackendIntegration: false,
    features: {
      enhancedDataLayer: false,
      networkStatusIndicator: false,
      moduleHealthIndicator: false,
      syncStatusComponent: false,
      globalNotifications: false,
      performanceOptimizations: true,
      advancedErrorBoundaries: true,
    },
  },
  
  enhanced: {
    mode: 'production',
    useEnhancedFeatures: true,
    enableOfflineCapabilities: true,
    enableBackendIntegration: true,
    features: {
      enhancedDataLayer: true,
      networkStatusIndicator: true,
      moduleHealthIndicator: true,
      syncStatusComponent: true,
      globalNotifications: true,
      performanceOptimizations: true,
      advancedErrorBoundaries: true,
    },
  },
  
  development: {
    mode: 'demo',
    useEnhancedFeatures: true,
    enableOfflineCapabilities: true,
    enableBackendIntegration: false,
    features: {
      enhancedDataLayer: true,
      networkStatusIndicator: true,
      moduleHealthIndicator: true,
      syncStatusComponent: true,
      globalNotifications: true,
      performanceOptimizations: false,
      advancedErrorBoundaries: true,
    },
    development: {
      enableDebugLogging: true,
      showPerformanceMetrics: true,
      enableHotReload: true,
    },
  },
};

// Configuration manager
class AppConfigManager {
  private config: AppConfig;
  private listeners: Array<(config: AppConfig) => void> = [];

  constructor() {
    this.config = this.loadConfiguration();
  }

  private loadConfiguration(): AppConfig {
    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('app-config');
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_CONFIG, ...parsed };
        }
      } catch (error) {
        console.warn('Failed to load stored configuration:', error);
      }

      // Check URL parameters for configuration overrides
      const urlParams = new URLSearchParams(window.location.search);
      const preset = urlParams.get('preset');
      const mode = urlParams.get('mode') as AppMode;
      const enhanced = urlParams.get('enhanced') === 'true';

      let config = { ...DEFAULT_CONFIG };

      // Apply preset if specified
      if (preset && CONFIG_PRESETS[preset]) {
        config = { ...config, ...CONFIG_PRESETS[preset] };
      }

      // Apply URL parameter overrides
      if (mode) {
        config.mode = mode;
      }
      if (enhanced !== undefined) {
        config.useEnhancedFeatures = enhanced;
      }

      return config;
    }

    return DEFAULT_CONFIG;
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('app-config', JSON.stringify(this.config));
      } catch (error) {
        console.warn('Failed to save configuration:', error);
      }
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(this.config));
  }

  public subscribe(listener: (config: AppConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public applyPreset(presetName: string): void {
    const preset = CONFIG_PRESETS[presetName];
    if (preset) {
      this.updateConfig(preset);
    } else {
      console.warn(`Unknown preset: ${presetName}`);
    }
  }

  public isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
}

// Singleton instance
export const appConfigManager = new AppConfigManager();

// Convenience functions
export const getAppConfig = (): AppConfig => appConfigManager.getConfig();
export const updateAppConfig = (updates: Partial<AppConfig>): void => appConfigManager.updateConfig(updates);
export const isFeatureEnabled = (feature: keyof AppConfig['features']): boolean => appConfigManager.isFeatureEnabled(feature);
export const subscribeToConfig = (listener: (config: AppConfig) => void): (() => void) => appConfigManager.subscribe(listener);

// Environment-based configuration detection
export const detectOptimalConfiguration = (): Partial<AppConfig> => {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasIndexedDB = 'indexedDB' in window;
  const isOnline = navigator.onLine;

  return {
    useEnhancedFeatures: hasIndexedDB && hasServiceWorker,
    enableOfflineCapabilities: hasServiceWorker && hasIndexedDB,
    enableBackendIntegration: isOnline && isProduction,
    features: {
      enhancedDataLayer: hasIndexedDB,
      networkStatusIndicator: true,
      moduleHealthIndicator: true,
      syncStatusComponent: hasServiceWorker,
      globalNotifications: true,
      performanceOptimizations: isProduction,
      advancedErrorBoundaries: true,
    },
  };
};