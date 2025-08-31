// ABOUTME: Data Service Factory for dual database architecture
// ABOUTME: Creates appropriate data service based on environment and configuration

import { getDatabaseProviderFactory, ProviderType } from '../services/database/DatabaseProviderFactory';
import { DATA_LAYER_CONFIG } from '../config/dataLayerConfig';
import { DatabaseConfig, CollectionRequirements } from '../services/database/interfaces';
import { getLiveStoreConfig, createLiveStoreProviderConfig } from '../config/productionLiveStoreConfig';

// User-configurable database provider settings
interface UserDatabaseConfig {
  provider: ProviderType;
  environment: 'development' | 'production' | 'demo';
  options: Record<string, any>;
}

// Default user configuration
let userDatabaseConfig: UserDatabaseConfig | null = null;

export class DataServiceFactory {
  // Method to set user database configuration
  static setUserDatabaseConfig(config: UserDatabaseConfig) {
    userDatabaseConfig = config;
    console.log(`[DataServiceFactory] User database config set: ${config.provider} for ${config.environment}`);
  }

  // Method to get current user database configuration
  static getUserDatabaseConfig(): UserDatabaseConfig | null {
    return userDatabaseConfig;
  }

  // Method to reset to default configuration
  static resetToDefaultConfig() {
    userDatabaseConfig = null;
    console.log('[DataServiceFactory] Reset to default configuration');
  }

  static async createDataService(environment: 'development' | 'production' | 'demo' = 'development') {
    try {
      console.log(`[DataServiceFactory] Creating data service for environment: ${environment}`);
      
      // Determine provider based on user configuration or environment defaults
      let providerType: ProviderType;
      let config: DatabaseConfig;
      let requirements: CollectionRequirements;
      
      // Check if user has set a custom configuration
      if (userDatabaseConfig && userDatabaseConfig.environment === environment) {
        providerType = userDatabaseConfig.provider;
        console.log(`[DataServiceFactory] Using user-configured provider: ${providerType}`);
      } else {
        // Use default configuration based on environment
        switch (environment) {
          case 'development':
            providerType = DATA_LAYER_CONFIG.development.provider as ProviderType;
            break;
          case 'production':
            providerType = DATA_LAYER_CONFIG.production.provider as ProviderType;
            break;
          case 'demo':
          default:
            providerType = DATA_LAYER_CONFIG.demo.provider as ProviderType;
            break;
        }
        console.log(`[DataServiceFactory] Using default provider: ${providerType} for ${environment}`);
      }

      switch (environment) {
        case 'development':
          config = {
            name: 'schoolpilot_dev',
            autoCompaction: true,
            debug: true
          };
          requirements = {
            collectionsCount: 88,
            requiresOffline: true,
            requiresSync: false,
            requiresReactivity: true,
            performanceLevel: 'standard',
            storageQuota: 100 * 1024 * 1024 // 100MB
          };
          break;
          
        case 'production':
          // Get enhanced LiveStore configuration for production
          const liveStoreConfig = getLiveStoreConfig('production');
          const providerConfig = createLiveStoreProviderConfig(liveStoreConfig);
          
          config = {
            name: providerConfig.name,
            version: providerConfig.version,
            storage: providerConfig.storage,
            autoCompaction: liveStoreConfig.database.autoCompaction,
            debug: false,
            ...providerConfig.options
          };
          
          requirements = {
            collectionsCount: 88,
            requiresOffline: true,
            requiresSync: liveStoreConfig.sync.enabled,
            requiresReactivity: true,
            performanceLevel: 'high',
            storageQuota: liveStoreConfig.performance.cacheSize * 1024 * 1024
          };
          
          console.log(`[DataServiceFactory] Production LiveStore config:`, {
            syncEnabled: liveStoreConfig.sync.enabled,
            cacheSize: liveStoreConfig.performance.cacheSize,
            opfsStorage: liveStoreConfig.database.opfsStorage
          });
          break;
          
        case 'demo':
        default:
          config = {
            name: 'schoolpilot_demo',
            autoCompaction: false,
            debug: true
          };
          requirements = {
            collectionsCount: 88,
            requiresOffline: true,
            requiresSync: false,
            requiresReactivity: true,
            performanceLevel: 'standard',
            storageQuota: 50 * 1024 * 1024 // 50MB
          };
          
          // Special handling for demo mode - ensure SQLite WASM is properly configured
          if (providerType === 'sqlite' || providerType === 'livestore') {
            config.storage = {
              type: 'opfs',
              wasmSqlite: true,
              crossTabPersistence: false
            };
          }
          break;
      }
      
      // Create provider using factory
      const factory = getDatabaseProviderFactory();
      const provider = await factory.createProvider(config, requirements);
      
      console.log(`[DataServiceFactory] Created data service with provider: ${provider.name} for environment: ${environment}`);
      return provider;
    } catch (error) {
      console.error('[DataServiceFactory] Failed to create data service:', error);
      throw error;
    }
  }
  
  private static createMockDataService() {
    // Placeholder for mock data service
    // This will be replaced with SQLite implementation
    console.log('[DataServiceFactory] Using mock data service for demo mode');
    return null;
  }
}