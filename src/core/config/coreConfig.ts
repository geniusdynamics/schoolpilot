/**
 * Core Configuration
 * Centralized configuration for core system settings.
 */

export interface CoreConfig {
  appName: string;
  appVersion: string;
  environment: 'development' | 'production' | 'test';
  debug: boolean;
  features: {
    [key: string]: boolean;
  };
}

export const CORE_CONFIG: CoreConfig = {
  appName: 'SchoolPilot3',
  appVersion: '3.0.0',
  environment: import.meta.env?.MODE || 'development',
  debug: import.meta.env?.VITE_DEBUG === 'true',
  features: {
    // Feature flags
    darkMode: true,
    notifications: true,
    offlineMode: true,
    // Add more feature flags as needed
  },
};

/**
 * Get a configuration value by key
 */
export function getConfig<T = any>(key: string): T | undefined {
  const keys = key.split('.');
  let value: any = CORE_CONFIG;

  for (const k of keys) {
    value = value?.[k];
  }

  return value as T;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  return !!getConfig<boolean>(`features.${feature}`);
}

/**
 * Update a configuration value
 */
export function updateConfig(key: string, value: any): void {
  const keys = key.split('.');
  let config: any = CORE_CONFIG;

  for (let i = 0; i < keys.length - 1; i++) {
    config = config[keys[i]];
  }

  config[keys[keys.length - 1]] = value;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  Object.keys(CORE_CONFIG.features).forEach(key => {
    CORE_CONFIG.features[key] = true;
  });
}