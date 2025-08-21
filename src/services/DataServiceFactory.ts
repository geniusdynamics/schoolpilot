// ABOUTME: Data Service Factory for dual database architecture
// ABOUTME: Creates appropriate data service based on environment and configuration

import { getDatabaseProviderFactory, ProviderType } from '../services/database/DatabaseProviderFactory';
import { DATA_LAYER_CONFIG } from '../config/dataLayerConfig';
import { DatabaseConfig, CollectionRequirements } from '../services/database/interfaces';

export class DataServiceFactory {
  static async createDataService(environment: 'development' | 'production' | 'demo' = 'development') {
    try {
      console.log(`[DataServiceFactory] Creating data service for environment: ${environment}`);
      
      // Determine provider based on environment
      let providerType: ProviderType;
      let config: DatabaseConfig;
      let requirements: CollectionRequirements;
      
      switch (environment) {
        case 'development':
          providerType = DATA_LAYER_CONFIG.development.provider as ProviderType;
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
          providerType = DATA_LAYER_CONFIG.production.provider as ProviderType;
          config = {
            name: 'schoolpilot_prod',
            autoCompaction: true,
            debug: false
          };
          requirements = {
            collectionsCount: 88,
            requiresOffline: true,
            requiresSync: true,
            requiresReactivity: true,
            performanceLevel: 'high',
            storageQuota: 500 * 1024 * 1024 // 500MB
          };
          break;
          
        case 'demo':
        default:
          providerType = DATA_LAYER_CONFIG.demo.provider as ProviderType;
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