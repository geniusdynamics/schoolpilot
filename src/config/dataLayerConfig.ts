// ABOUTME: Comprehensive database configuration for multi-tier architecture
// ABOUTME: Supports development (SQLite file), demo (SQLite WASM+OPFS), and flexible production modes

import type { BackendType } from './backendArchitecture';

// Storage Types for SQLite providers
export type SQLiteStorageType = 'file' | 'opfs' | 'memory';

// Backend Integration Types
export type BackendIntegrationType = 'none' | 'api' | 'erpnext' | 'couchdb' | 'postgresql' | 'hybrid';

// Provider Configuration Interface
export interface ProviderConfig {
  provider: 'sqlite' | 'sqlite-wasm' | 'pouchdb' | 'rxdb' | 'livestore' | 'mock';
  storageType?: SQLiteStorageType;
  backendIntegration?: BackendIntegrationType;
  options: Record<string, any>;
  description?: string;
  recommended?: boolean;
}

// Environment-specific Configuration
export interface DataLayerConfig {
  development: ProviderConfig;
  demo: ProviderConfig;
  production: {
    default: ProviderConfig;
    alternatives: ProviderConfig[];
  };
  backendIntegrations: {
    erpnext: ProviderConfig;
    couchdb: ProviderConfig;
    postgresql: ProviderConfig;
    api: ProviderConfig;
  };
}

export type ApplicationSettingsMode = 'demo' | 'production';

export interface ConsolidatedConfigurationOption {
  id: string;
  applicationMode: ApplicationSettingsMode;
  sourceMode: 'development' | 'demo' | 'production';
  provider: ProviderConfig['provider'];
  normalizedProvider: 'sqlite' | 'sqlite-file' | 'sqlite-wasm' | 'pouchdb' | 'rxdb' | 'livestore' | 'mock';
  storageType?: SQLiteStorageType;
  backendIntegration: BackendIntegrationType;
  backendType: BackendType;
  label: string;
  description: string;
  options: Record<string, any>;
  recommended?: boolean;
}

export const DATA_LAYER_CONFIG: DataLayerConfig = {
  // Development Mode: SQLite with file storage for easy database exploration
  development: {
    provider: 'sqlite',
    storageType: 'file',
    backendIntegration: 'none',
    description: 'SQLite with file storage for development - easy database inspection and exploration',
    recommended: true,
    options: {
      persistence: true,
      cacheSize: 1000,
      filePath: './data/schoolpilot-dev.db',
      enableWAL: true,
      enableForeignKeys: true,
      busyTimeout: 5000,
      debugMode: true
    }
  },

  // Demo Mode: SQLite WASM with OPFS for production-like testing
  demo: {
    provider: 'sqlite-wasm',
    storageType: 'opfs',
    backendIntegration: 'none',
    description: 'SQLite WASM with OPFS for production-like demo testing with dummy data',
    recommended: true,
    options: {
      sync: false,
      offlineSupport: true,
      wasmSqlite: true,
      opfsStorage: true,
      crossTabPersistence: false,
      demoDataSeeding: true,
      allowDataClear: true,
      allowDataReseed: true,
      dbName: 'schoolpilot-demo.db'
    }
  },

  // Production Mode: Flexible configuration with multiple options
  production: {
    // Default: LiveStore with SQLite WASM + OPFS
    default: {
      provider: 'livestore',
      storageType: 'opfs',
      backendIntegration: 'none',
      description: 'LiveStore with SQLite WASM and OPFS - optimal for local-first applications',
      recommended: true,
      options: {
        sync: true,
        offlineSupport: true,
        wasmSqlite: true,
        opfsStorage: true,
        crossTabPersistence: true,
        performanceOptimizations: true,
        enableIndexedDB: true,
        enableServiceWorker: true
      }
    },

    // Alternative production configurations
    alternatives: [
      {
        provider: 'pouchdb',
        backendIntegration: 'couchdb',
        description: 'PouchDB with CouchDB sync - ideal for distributed teams',
        options: {
          sync: true,
          offlineSupport: true,
          replication: true,
          conflictResolution: 'auto',
          couchdbUrl: process.env.COUCHDB_URL || 'http://localhost:5984'
        }
      },
      {
        provider: 'rxdb',
        storageType: 'opfs',
        backendIntegration: 'postgresql',
        description: 'RxDB with PostgreSQL via ElectricSQL - reactive database with real-time sync',
        options: {
          sync: true,
          offlineSupport: true,
          reactive: true,
          electricSqlUrl: process.env.ELECTRIC_SQL_URL,
          postgresqlUrl: process.env.POSTGRESQL_URL
        }
      },
      {
        provider: 'sqlite-wasm',
        storageType: 'opfs',
        backendIntegration: 'api',
        description: 'SQLite WASM with custom API backend - lightweight with API sync',
        options: {
          sync: true,
          offlineSupport: true,
          wasmSqlite: true,
          opfsStorage: true,
          apiUrl: process.env.API_URL || '/api',
          syncInterval: 30000
        }
      }
    ]
  },

  // Backend Integration Configurations
  backendIntegrations: {
    // ERPNext Integration
    erpnext: {
      provider: 'sqlite-wasm',
      storageType: 'opfs',
      backendIntegration: 'erpnext',
      description: 'ERPNext integration with SQLite WASM local persistence',
      options: {
        sync: true,
        offlineSupport: true,
        wasmSqlite: true,
        opfsStorage: true,
        erpnextUrl: process.env.ERPNEXT_URL,
        erpnextApiKey: process.env.ERPNEXT_API_KEY,
        erpnextApiSecret: process.env.ERPNEXT_API_SECRET,
        syncInterval: 60000,
        conflictResolution: 'server-wins'
      }
    },

    // CouchDB Integration
    couchdb: {
      provider: 'pouchdb',
      backendIntegration: 'couchdb',
      description: 'PouchDB with CouchDB for distributed data synchronization',
      options: {
        sync: true,
        offlineSupport: true,
        replication: true,
        couchdbUrl: process.env.COUCHDB_URL || 'http://localhost:5984',
        couchdbUsername: process.env.COUCHDB_USERNAME,
        couchdbPassword: process.env.COUCHDB_PASSWORD,
        conflictResolution: 'auto',
        continuousSync: true
      }
    },

    // PostgreSQL Integration via ElectricSQL
    postgresql: {
      provider: 'rxdb',
      storageType: 'opfs',
      backendIntegration: 'postgresql',
      description: 'RxDB with PostgreSQL via ElectricSQL for reactive real-time sync',
      options: {
        sync: true,
        offlineSupport: true,
        reactive: true,
        electricSqlUrl: process.env.ELECTRIC_SQL_URL,
        postgresqlUrl: process.env.POSTGRESQL_URL,
        postgresqlUsername: process.env.POSTGRESQL_USERNAME,
        postgresqlPassword: process.env.POSTGRESQL_PASSWORD,
        realTimeSync: true,
        conflictResolution: 'last-write-wins'
      }
    },

    // Custom API Integration
    api: {
      provider: 'sqlite-wasm',
      storageType: 'opfs',
      backendIntegration: 'api',
      description: 'Custom API backend with SQLite WASM local storage',
      options: {
        sync: true,
        offlineSupport: true,
        wasmSqlite: true,
        opfsStorage: true,
        apiUrl: process.env.API_URL || '/api',
        apiKey: process.env.API_KEY,
        syncInterval: 30000,
        batchSync: true,
        conflictResolution: 'client-wins'
      }
    }
  }
};

const providerLabels: Record<ConsolidatedConfigurationOption['normalizedProvider'], string> = {
  sqlite: 'SQLite',
  'sqlite-file': 'SQLite File',
  'sqlite-wasm': 'SQLite WASM',
  pouchdb: 'PouchDB',
  rxdb: 'RxDB',
  livestore: 'LiveStore',
  mock: 'Mock Storage'
};

const backendIntegrationLabels: Record<BackendIntegrationType, string> = {
  none: 'Local Only',
  api: 'Custom API',
  erpnext: 'ERPNext',
  couchdb: 'CouchDB Sync',
  postgresql: 'PostgreSQL API',
  hybrid: 'Hybrid Backend'
};

const backendTypeByIntegration: Record<BackendIntegrationType, BackendType> = {
  none: 'frontend-only',
  api: 'custom-api',
  erpnext: 'frappe-education',
  couchdb: 'frontend-only',
  postgresql: 'custom-api',
  hybrid: 'hybrid'
};

export function normalizeProvider(
  provider: ProviderConfig['provider'],
  storageType?: SQLiteStorageType
): ConsolidatedConfigurationOption['normalizedProvider'] {
  if (provider === 'sqlite' && storageType === 'file') {
    return 'sqlite-file';
  }

  return provider;
}

function createConsolidatedOption(
  id: string,
  applicationMode: ApplicationSettingsMode,
  sourceMode: ConsolidatedConfigurationOption['sourceMode'],
  config: ProviderConfig,
  backendIntegration: BackendIntegrationType = config.backendIntegration || 'none',
  label?: string
): ConsolidatedConfigurationOption {
  const normalizedProvider = normalizeProvider(config.provider, config.storageType);

  return {
    id,
    applicationMode,
    sourceMode,
    provider: config.provider,
    normalizedProvider,
    storageType: config.storageType,
    backendIntegration,
    backendType: backendTypeByIntegration[backendIntegration],
    label: label || `${providerLabels[normalizedProvider]} · ${backendIntegrationLabels[backendIntegration]}`,
    description: config.description || `${providerLabels[normalizedProvider]} with ${backendIntegrationLabels[backendIntegration]}`,
    options: config.options,
    recommended: config.recommended
  };
}

const CONSOLIDATED_CONFIGURATION_OPTIONS: ConsolidatedConfigurationOption[] = [
  createConsolidatedOption(
    'demo-local-sqlite-file',
    'demo',
    'development',
    DATA_LAYER_CONFIG.development,
    'none',
    'SQLite File · Local Development'
  ),
  createConsolidatedOption(
    'demo-browser-sqlite-wasm',
    'demo',
    'demo',
    DATA_LAYER_CONFIG.demo,
    'none',
    'SQLite WASM · Browser Demo'
  ),
  createConsolidatedOption(
    'production-livestore',
    'production',
    'production',
    DATA_LAYER_CONFIG.production.default,
    'none',
    'LiveStore · Local First'
  ),
  createConsolidatedOption(
    'production-pouchdb-couchdb',
    'production',
    'production',
    DATA_LAYER_CONFIG.production.alternatives[0],
    'couchdb'
  ),
  createConsolidatedOption(
    'production-rxdb-postgresql',
    'production',
    'production',
    DATA_LAYER_CONFIG.production.alternatives[1],
    'postgresql'
  ),
  createConsolidatedOption(
    'production-sqlite-api',
    'production',
    'production',
    DATA_LAYER_CONFIG.production.alternatives[2],
    'api'
  ),
  createConsolidatedOption(
    'production-erpnext',
    'production',
    'production',
    DATA_LAYER_CONFIG.backendIntegrations.erpnext,
    'erpnext'
  ),
  createConsolidatedOption(
    'production-couchdb',
    'production',
    'production',
    DATA_LAYER_CONFIG.backendIntegrations.couchdb,
    'couchdb'
  ),
  createConsolidatedOption(
    'production-postgresql',
    'production',
    'production',
    DATA_LAYER_CONFIG.backendIntegrations.postgresql,
    'postgresql'
  ),
  createConsolidatedOption(
    'production-api',
    'production',
    'production',
    DATA_LAYER_CONFIG.backendIntegrations.api,
    'api'
  )
];

export function getConsolidatedConfigurationOptions(
  applicationMode?: ApplicationSettingsMode
): ConsolidatedConfigurationOption[] {
  if (!applicationMode) {
    return [...CONSOLIDATED_CONFIGURATION_OPTIONS];
  }

  return CONSOLIDATED_CONFIGURATION_OPTIONS.filter(option => option.applicationMode === applicationMode);
}

export function getDatabaseOptionsForMode(applicationMode: ApplicationSettingsMode) {
  const options = getConsolidatedConfigurationOptions(applicationMode);
  const databaseMap = new Map<string, {
    value: ConsolidatedConfigurationOption['normalizedProvider'];
    label: string;
    description: string;
  }>();

  options.forEach(option => {
    if (!databaseMap.has(option.normalizedProvider)) {
      databaseMap.set(option.normalizedProvider, {
        value: option.normalizedProvider,
        label: providerLabels[option.normalizedProvider],
        description: option.description
      });
    }
  });

  return Array.from(databaseMap.values());
}

export function getBackendOptionsForModeAndProvider(
  applicationMode: ApplicationSettingsMode,
  normalizedProvider: ConsolidatedConfigurationOption['normalizedProvider']
) {
  return getConsolidatedConfigurationOptions(applicationMode).filter(
    option => option.normalizedProvider === normalizedProvider
  );
}

export function resolveConsolidatedConfigurationOption(
  applicationMode: ApplicationSettingsMode,
  normalizedProvider: ConsolidatedConfigurationOption['normalizedProvider'],
  backendIntegration?: BackendIntegrationType
) {
  const providerOptions = getBackendOptionsForModeAndProvider(applicationMode, normalizedProvider);

  if (backendIntegration) {
    const exactMatch = providerOptions.find(option => option.backendIntegration === backendIntegration);
    if (exactMatch) {
      return exactMatch;
    }
  }

  return providerOptions[0];
}

// Helper function to get configuration by environment and mode
export function getDataLayerConfig(
  environment: 'development' | 'demo' | 'production',
  backendIntegration?: BackendIntegrationType,
  alternativeIndex?: number
): ProviderConfig {
  if (environment === 'development') {
    return DATA_LAYER_CONFIG.development;
  }
  
  if (environment === 'demo') {
    return DATA_LAYER_CONFIG.demo;
  }
  
  if (environment === 'production') {
    // Check for backend integration override
    if (backendIntegration && backendIntegration !== 'none') {
      const integrationConfig = DATA_LAYER_CONFIG.backendIntegrations[backendIntegration];
      if (integrationConfig) {
        return integrationConfig;
      }
    }
    
    // Check for alternative configuration
    if (alternativeIndex !== undefined && alternativeIndex >= 0) {
      const alternative = DATA_LAYER_CONFIG.production.alternatives[alternativeIndex];
      if (alternative) {
        return alternative;
      }
    }
    
    // Return default production configuration
    return DATA_LAYER_CONFIG.production.default;
  }
  
  throw new Error(`Unknown environment: ${environment}`);
}

// Helper function to get all available configurations for an environment
export function getAvailableConfigurations(environment: 'development' | 'demo' | 'production'): ProviderConfig[] {
  if (environment === 'development') {
    return [DATA_LAYER_CONFIG.development];
  }
  
  if (environment === 'demo') {
    return [DATA_LAYER_CONFIG.demo];
  }
  
  if (environment === 'production') {
    return [
      DATA_LAYER_CONFIG.production.default,
      ...DATA_LAYER_CONFIG.production.alternatives,
      ...Object.values(DATA_LAYER_CONFIG.backendIntegrations)
    ];
  }
  
  return [];
}

// Helper function to validate configuration
export function validateProviderConfig(config: ProviderConfig): boolean {
  if (!config.provider) {
    return false;
  }
  
  // Validate SQLite storage type
  if ((config.provider === 'sqlite' || config.provider === 'sqlite-wasm') && !config.storageType) {
    return false;
  }
  
  // Validate backend integration requirements
  if (config.backendIntegration && config.backendIntegration !== 'none') {
    const requiredOptions = {
      'erpnext': ['erpnextUrl'],
      'couchdb': ['couchdbUrl'],
      'postgresql': ['postgresqlUrl'],
      'api': ['apiUrl']
    };
    
    const required = requiredOptions[config.backendIntegration];
    if (required && !required.every(option => config.options[option])) {
      return false;
    }
  }
  
  return true;
}