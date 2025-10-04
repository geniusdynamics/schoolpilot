/**
 * Environment Matrix Configuration
 * Defines environment-specific configurations and data mode policies
 */

// Environment Types
export type Environment = 'development' | 'staging' | 'production';
export type DataMode = 'demo' | 'production';
export type DatabaseProvider = 'rxdb' | 'pouchdb' | 'sqlite' | 'sqlite-file' | 'sqlite-wasm' | 'memory' | 'backend-api' | 'livestore' | 'hybrid';

// Environment Configuration
export interface EnvironmentConfig {
  name: Environment;
  allowedDataModes: DataMode[];
  defaultDataMode: DataMode;
  allowedDatabaseProviders: DatabaseProvider[];
  defaultDatabaseProvider: DatabaseProvider;
  canSwitchDataModes: boolean;
  requiresConfirmation: boolean;
  features: {
    enableAdvancedReporting: boolean;
    enableBulkOperations: boolean;
    enableDataExport: boolean;
    enableOfflineMode: boolean;
    enableRealTimeSync: boolean;
    enablePerformanceMonitoring: boolean;
  };
}

// Environment Matrix
const ENVIRONMENT_MATRIX: Record<Environment, EnvironmentConfig> = {
  development: {
    name: 'development',
    allowedDataModes: ['demo', 'production'],
    defaultDataMode: 'demo',
    allowedDatabaseProviders: ['rxdb', 'pouchdb', 'sqlite', 'memory', 'backend-api'],
    defaultDatabaseProvider: 'sqlite',
    canSwitchDataModes: true,
    requiresConfirmation: false,
    features: {
      enableAdvancedReporting: true,
      enableBulkOperations: true,
      enableDataExport: true,
      enableOfflineMode: true,
      enableRealTimeSync: false,
      enablePerformanceMonitoring: true,
    },
  },
  staging: {
    name: 'staging',
    allowedDataModes: ['demo', 'production'],
    defaultDataMode: 'demo',
    allowedDatabaseProviders: ['rxdb', 'pouchdb', 'backend-api'],
    defaultDatabaseProvider: 'rxdb',
    canSwitchDataModes: true,
    requiresConfirmation: true,
    features: {
      enableAdvancedReporting: true,
      enableBulkOperations: true,
      enableDataExport: true,
      enableOfflineMode: true,
      enableRealTimeSync: true,
      enablePerformanceMonitoring: true,
    },
  },
  production: {
    name: 'production',
    allowedDataModes: ['production'],
    defaultDataMode: 'production',
    allowedDatabaseProviders: ['rxdb', 'backend-api'],
    defaultDatabaseProvider: 'rxdb',
    canSwitchDataModes: false,
    requiresConfirmation: true,
    features: {
      enableAdvancedReporting: true,
      enableBulkOperations: true,
      enableDataExport: true,
      enableOfflineMode: false,
      enableRealTimeSync: true,
      enablePerformanceMonitoring: true,
    },
  },
};

// Environment Detection
export const detectEnvironment = (): Environment => {
  if (typeof window === 'undefined') {
    return 'development';
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Check for production indicators
  if (protocol === 'https:' && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    if (hostname.includes('staging') || hostname.includes('test')) {
      return 'staging';
    }
    return 'production';
  }
  
  // Check environment variables
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  if (process.env.NODE_ENV === 'staging') {
    return 'staging';
  }
  
  return 'development';
};

// Configuration Getters
export const getEnvironmentConfig = (environment: Environment): EnvironmentConfig => {
  return ENVIRONMENT_MATRIX[environment];
};

export const getDefaultDataMode = (environment: Environment): DataMode => {
  return ENVIRONMENT_MATRIX[environment].defaultDataMode;
};

export const canSwitchDataModes = (environment: Environment): boolean => {
  return ENVIRONMENT_MATRIX[environment].canSwitchDataModes;
};

export const getAllowedDataModes = (environment: Environment): DataMode[] => {
  return ENVIRONMENT_MATRIX[environment].allowedDataModes;
};

export const getDefaultDatabaseProvider = (environment: Environment): DatabaseProvider => {
  return ENVIRONMENT_MATRIX[environment].defaultDatabaseProvider;
};

export const getAllowedDatabaseProviders = (environment: Environment): DatabaseProvider[] => {
  return ENVIRONMENT_MATRIX[environment].allowedDatabaseProviders;
};

// Validation Functions
export const isValidDataMode = (dataMode: DataMode, environment: Environment): boolean => {
  return ENVIRONMENT_MATRIX[environment].allowedDataModes.includes(dataMode);
};

export const isValidDatabaseProvider = (provider: DatabaseProvider, environment: Environment): boolean => {
  return ENVIRONMENT_MATRIX[environment].allowedDatabaseProviders.includes(provider);
};

// Export the matrix for advanced usage
export { ENVIRONMENT_MATRIX };