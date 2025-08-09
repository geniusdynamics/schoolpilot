// Provider Selector Logic
// Integrates dual-database architecture with existing rxdbService.ts

import { Observable, BehaviorSubject } from 'rxjs';
import {
  IDatabaseProvider,
  ICollection,
  DatabaseConfig,
  CollectionSchema,
  CollectionRequirements,
  ProviderStatus,
  DatabaseError
} from './interfaces';
import {
  DatabaseProviderFactory,
  getDatabaseProviderFactory,
  ProviderType,
  QueryBuilder
} from './DatabaseProviderFactory';
import { PouchDBProvider } from './PouchDBProvider';

// Collection Configuration
export interface CollectionConfig {
  name: string;
  schema: CollectionSchema;
  requirements?: CollectionRequirements;
}

// Database Manager that orchestrates the dual-database architecture
export class DatabaseManager {
  private factory: DatabaseProviderFactory;
  private activeProvider: IDatabaseProvider | null = null;
  private collections = new Map<string, ICollection<any>>();
  private statusSubject = new BehaviorSubject<ProviderStatus | null>(null);
  private isInitialized = false;

  constructor() {
    this.factory = getDatabaseProviderFactory();
  }

  // Initialize the database with all 88 collections
  async initialize(config: DatabaseConfig, collectionConfigs: CollectionConfig[]): Promise<void> {
    try {
      console.log(`Initializing database with ${collectionConfigs.length} collections`);
      
      // Determine requirements based on collection count and features
      const requirements: CollectionRequirements = {
        collectionsCount: collectionConfigs.length,
        offlineFirst: true,
        syncRequired: false,
        reactiveQueries: true,
        complexQueries: false
      };

      // Create provider using factory
      this.activeProvider = await this.factory.createProvider(config, requirements);
      
      // Create all collections
      for (const collectionConfig of collectionConfigs) {
        try {
          const collection = await this.activeProvider.createCollection(
            collectionConfig.name,
            collectionConfig.schema
          );
          this.collections.set(collectionConfig.name, collection);
          console.log(`Collection '${collectionConfig.name}' created successfully`);
        } catch (error) {
          console.error(`Failed to create collection '${collectionConfig.name}':`, error);
          // Continue with other collections even if one fails
        }
      }

      this.isInitialized = true;
      this.updateStatus();
      
      console.log(`Database initialized successfully with ${this.collections.size} collections using ${this.activeProvider.name}`);
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize database: ${error.message}`,
        'INITIALIZATION_ERROR'
      );
    }
  }

  // Get a specific collection
  getCollection<T>(name: string): ICollection<T> | null {
    const collection = this.collections.get(name);
    if (!collection) {
      console.warn(`Collection '${name}' not found`);
      return null;
    }
    return collection as ICollection<T>;
  }

  // Get all collections
  getAllCollections(): Map<string, ICollection<any>> {
    return new Map(this.collections);
  }

  // Create query builder for a collection
  createQuery<T>(collectionName: string): QueryBuilder<T> {
    return this.factory.createQueryBuilder<T>(collectionName);
  }

  // Check if database is available
  isAvailable(): boolean {
    return this.isInitialized && this.activeProvider?.isAvailable() === true;
  }

  // Get current provider status
  getStatus(): ProviderStatus | null {
    return this.activeProvider?.getStatus() || null;
  }

  // Subscribe to status changes
  subscribeToStatus(): Observable<ProviderStatus | null> {
    return this.statusSubject.asObservable();
  }

  // Update status subject
  private updateStatus(): void {
    const status = this.getStatus();
    this.statusSubject.next(status);
  }

  // Switch provider (for testing or fallback scenarios)
  async switchProvider(providerType: ProviderType, config: DatabaseConfig): Promise<void> {
    try {
      // Store current collection configurations
      const collectionConfigs: CollectionConfig[] = [];
      for (const [name, collection] of this.collections) {
        // Note: In a real implementation, you'd want to preserve the schema
        collectionConfigs.push({
          name,
          schema: { properties: {} } // Simplified for this example
        });
      }

      // Clear current collections
      this.collections.clear();

      // Switch provider
      this.activeProvider = await this.factory.switchProvider(providerType, config);

      // Recreate collections with new provider
      for (const collectionConfig of collectionConfigs) {
        const collection = await this.activeProvider.createCollection(
          collectionConfig.name,
          collectionConfig.schema
        );
        this.collections.set(collectionConfig.name, collection);
      }

      this.updateStatus();
      console.log(`Switched to provider: ${providerType}`);
    } catch (error) {
      throw new DatabaseError(
        `Failed to switch provider: ${error.message}`,
        'PROVIDER_SWITCH_ERROR'
      );
    }
  }

  // Backup all collections
  async backup(): Promise<string> {
    if (!this.activeProvider) {
      throw new DatabaseError('No active provider for backup', 'NO_PROVIDER');
    }
    return await this.activeProvider.backup();
  }

  // Restore from backup
  async restore(backupData: string): Promise<void> {
    if (!this.activeProvider) {
      throw new DatabaseError('No active provider for restore', 'NO_PROVIDER');
    }
    await this.activeProvider.restore(backupData);
    this.updateStatus();
  }

  // Get collection statistics
  async getCollectionStats(): Promise<Array<{ name: string; stats: any }>> {
    const stats: Array<{ name: string; stats: any }> = [];
    
    for (const [name, collection] of this.collections) {
      try {
        const collectionStats = await collection.getStats();
        stats.push({ name, stats: collectionStats });
      } catch (error) {
        console.error(`Failed to get stats for collection '${name}':`, error);
      }
    }
    
    return stats;
  }

  // Compact all collections (for performance)
  async compact(): Promise<void> {
    console.log('Starting database compaction...');
    
    for (const [name, collection] of this.collections) {
      try {
        await collection.compact();
        console.log(`Collection '${name}' compacted successfully`);
      } catch (error) {
        console.error(`Failed to compact collection '${name}':`, error);
      }
    }
    
    console.log('Database compaction completed');
  }

  // Destroy the database
  async destroy(): Promise<void> {
    try {
      // Clear collections
      this.collections.clear();
      
      // Destroy provider
      if (this.activeProvider) {
        await this.activeProvider.destroy();
        this.activeProvider = null;
      }
      
      // Destroy factory
      await this.factory.destroy();
      
      this.isInitialized = false;
      this.statusSubject.next(null);
      this.statusSubject.complete();
      
      console.log('Database destroyed successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to destroy database: ${error.message}`,
        'DESTRUCTION_ERROR'
      );
    }
  }
}

// Singleton instance for global access
let databaseManagerInstance: DatabaseManager | null = null;

export function getDatabaseManager(): DatabaseManager {
  if (!databaseManagerInstance) {
    databaseManagerInstance = new DatabaseManager();
  }
  return databaseManagerInstance;
}

export function resetDatabaseManager(): void {
  if (databaseManagerInstance) {
    databaseManagerInstance.destroy();
    databaseManagerInstance = null;
  }
}

// Helper function to convert RxDB schema to our interface
export function convertRxDBSchema(rxdbSchema: any): CollectionSchema {
  const properties: Record<string, any> = {};
  
  if (rxdbSchema.properties) {
    for (const [key, value] of Object.entries(rxdbSchema.properties)) {
      properties[key] = {
        type: (value as any).type || 'string',
        required: rxdbSchema.required?.includes(key) || false,
        index: (value as any).index || false
      };
    }
  }
  
  return {
    properties,
    required: rxdbSchema.required || [],
    indexes: rxdbSchema.indexes || []
  };
}

// Integration helper for existing rxdbService.ts
export class RxDBIntegrationHelper {
  private databaseManager: DatabaseManager;
  
  constructor() {
    this.databaseManager = getDatabaseManager();
  }

  // Initialize with existing collection definitions
  async initializeWithRxDBCollections(
    collectionsDefinition: Record<string, any>,
    databaseName: string = 'schoolpilot'
  ): Promise<void> {
    try {
      console.log('🔍 [RxDBIntegrationHelper] Starting initialization...');
      console.log('🔍 [RxDBIntegrationHelper] collectionsDefinition type:', typeof collectionsDefinition);
      console.log('🔍 [RxDBIntegrationHelper] collectionsDefinition is null?', collectionsDefinition === null);
      console.log('🔍 [RxDBIntegrationHelper] collectionsDefinition is undefined?', collectionsDefinition === undefined);
      
      // Add guard for undefined or null collectionsDefinition
      if (!collectionsDefinition || typeof collectionsDefinition !== 'object') {
        const errorMsg = `collectionsDefinition is invalid: ${typeof collectionsDefinition}`;
        console.error('❌ [RxDBIntegrationHelper]', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Try to safely get Object.entries
      let entries;
      try {
        entries = Object.entries(collectionsDefinition);
        console.log('🔍 [RxDBIntegrationHelper] Successfully got entries, count:', entries.length);
      } catch (entriesError) {
        console.error('❌ [RxDBIntegrationHelper] Failed to get Object.entries:', entriesError);
        console.error('❌ [RxDBIntegrationHelper] collectionsDefinition value:', collectionsDefinition);
        throw new Error(`Cannot get entries from collectionsDefinition: ${entriesError.message}`);
      }
      
      const config: DatabaseConfig = {
        name: databaseName,
        version: 1,
        autoCompaction: true
      };

      const collectionConfigs: CollectionConfig[] = [];
      
      // Convert RxDB collection definitions to our format
      for (const [name, schema] of entries) {
        console.log(`🔍 [RxDBIntegrationHelper] Processing collection: ${name}`);
        collectionConfigs.push({
          name,
          schema: convertRxDBSchema(schema),
          requirements: {
            collectionsCount: entries.length,
            offlineFirst: true,
            syncRequired: false,
            reactiveQueries: true,
            complexQueries: false
          }
        });
      }

      await this.databaseManager.initialize(config, collectionConfigs);
      console.log(`Initialized dual-database architecture with ${collectionConfigs.length} collections`);
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize with RxDB collections: ${error.message}`,
        'RXDB_INTEGRATION_ERROR'
      );
    }
  }

  // Get database manager instance
  getDatabaseManager(): DatabaseManager {
    return this.databaseManager;
  }

  // Check if initialization is complete
  isInitialized(): boolean {
    return this.databaseManager.isAvailable();
  }

  // Get collection by name (compatible with existing code)
  getCollection<T>(name: string): ICollection<T> | null {
    return this.databaseManager.getCollection<T>(name);
  }
}

// Export singleton helper
let integrationHelperInstance: RxDBIntegrationHelper | null = null;

export function getRxDBIntegrationHelper(): RxDBIntegrationHelper {
  if (!integrationHelperInstance) {
    integrationHelperInstance = new RxDBIntegrationHelper();
  }
  return integrationHelperInstance;
}