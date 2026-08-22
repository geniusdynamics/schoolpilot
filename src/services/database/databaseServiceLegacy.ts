import { logger } from '@/utils/logging';

// ABOUTME: Dynamic database service that automatically detects and uses the best available provider
// ABOUTME: Tries RxDB first, falls back to PouchDB if RxDB is unavailable

import { DatabaseProviderFactory } from './DatabaseProviderFactory';
import {
  IDatabaseProvider,
  ICollection,
  DatabaseConfig,
  CollectionSchema,
  ProviderType,
  DatabaseError
} from './interfaces';
// RXDB removed - Phase 2: Using provider-agnostic collections
import { collectionsDefinition } from './collections';

export class DatabaseService {
  private static instance: DatabaseService;
  private provider: IDatabaseProvider | null = null;
  private factory: DatabaseProviderFactory;
  private isInitialized = false;
  private initializationError: Error | null = null;
  private detectedProviderType: ProviderType | null = null;

  private constructor() {
    this.factory = new DatabaseProviderFactory();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database service with dynamic provider detection
   * Tries RxDB first, falls back to PouchDB if RxDB is unavailable
   */
  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      if (this.isInitialized && this.provider) {
        logger.info(`Database service already initialized with ${this.detectedProviderType}`);
        return;
      }

      logger.info('Initializing database service with dynamic provider detection...');
      
      // Try to detect and initialize the best available provider
      this.provider = await this.detectAndInitializeProvider(config);
      
      if (!this.provider) {
        throw new DatabaseError(
          'No suitable database provider available',
          'NO_PROVIDER_AVAILABLE'
        );
      }

      // Create collections based on RxDB definitions
      await this.createCollections();
      
      this.isInitialized = true;
      this.initializationError = null;
      
      logger.info(`Database service initialized successfully with ${this.detectedProviderType} provider`);
    } catch (error) {
      this.initializationError = error as Error;
      this.isInitialized = false;
      logger.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  /**
   * Detect and initialize the best available database provider
   * Priority: RxDB > PouchDB
   */
  private async detectAndInitializeProvider(config: DatabaseConfig): Promise<IDatabaseProvider | null> {
    const providerPriority: ProviderType[] = ['rxdb', 'pouchdb'];
    
    for (const providerType of providerPriority) {
      try {
        logger.info(`Attempting to initialize ${providerType} provider...`);
        
        // Check if provider is available
        const isAvailable = await this.checkProviderAvailability(providerType);
        if (!isAvailable) {
          logger.info(`${providerType} provider not available, trying next...`);
          continue;
        }

        // Try to create and initialize the provider
        const provider = await this.factory.createProvider(config);
        await provider.initialize(config);
        
        this.detectedProviderType = providerType;
        logger.info(`Successfully initialized ${providerType} provider`);
        return provider;
      } catch (error) {
        logger.warn(`Failed to initialize ${providerType} provider:`, error.message);
        continue;
      }
    }

    return null;
  }

  /**
   * Check if a specific provider type is available in the current environment
   */
  private async checkProviderAvailability(providerType: ProviderType): Promise<boolean> {
    try {
      switch (providerType) {
        case 'rxdb':
          // Check if RxDB requirements are met
          return typeof window !== 'undefined' && 
                 !!window.indexedDB && 
                 typeof crypto !== 'undefined' && 
                 !!crypto.randomUUID;
        
        case 'pouchdb':
          // Check if PouchDB requirements are met
          return typeof window !== 'undefined' && !!window.indexedDB;
        
        default:
          return false;
      }
    } catch (error) {
      logger.warn(`Error checking availability for ${providerType}:`, error);
      return false;
    }
  }

  /**
   * Create collections based on RxDB definitions
   */
  private async createCollections(): Promise<void> {
    if (!this.provider) {
      throw new DatabaseError('Provider not initialized', 'PROVIDER_NOT_INITIALIZED');
    }

    try {
      logger.info('Creating collections from RxDB definitions...');
      
      for (const [collectionName, collectionDef] of Object.entries(collectionsDefinition)) {
        const schema: CollectionSchema = {
          version: collectionDef.schema.version,
          properties: collectionDef.schema.properties,
          required: collectionDef.schema.required || [],
          primaryKey: collectionDef.schema.primaryKey || 'id',
          indexes: collectionDef.schema.indexes?.map(idx => ({
            name: Array.isArray(idx) ? idx.join('_') : idx,
            fields: Array.isArray(idx) ? idx : [idx]
          })) || []
        };

        await this.provider.createCollection(collectionName, schema);
        logger.info(`Created collection: ${collectionName}`);
      }
      
      logger.info('All collections created successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to create collections: ${error.message}`,
        'COLLECTION_CREATION_ERROR'
      );
    }
  }

  /**
   * Get the initialized database provider
   */
  getProvider(): IDatabaseProvider | null {
    return this.provider;
  }

  /**
   * Get a specific collection
   */
  getCollection<T>(name: string): ICollection<T> | null {
    if (!this.provider) {
      logger.warn('Database provider not initialized');
      return null;
    }
    return this.provider.getCollection<T>(name);
  }

  /**
   * Get all collections
   */
  getAllCollections(): Map<string, ICollection<any>> {
    if (!this.provider) {
      return new Map();
    }
    return this.provider.getAllCollections();
  }

  /**
   * Get the detected provider type
   */
  getDetectedProviderType(): ProviderType | null {
    return this.detectedProviderType;
  }

  /**
   * Check if the service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized && !!this.provider;
  }

  /**
   * Get initialization error if any
   */
  getInitializationError(): Error | null {
    return this.initializationError;
  }

  /**
   * Get provider status
   */
  getStatus() {
    if (!this.provider) {
      return {
        isInitialized: false,
        providerType: null,
        error: this.initializationError?.message || 'Provider not initialized'
      };
    }

    return {
      isInitialized: this.isInitialized,
      providerType: this.detectedProviderType,
      providerStatus: this.provider.getStatus(),
      error: this.initializationError?.message || null
    };
  }

  /**
   * Force switch to a specific provider (for testing or manual override)
   */
  async switchProvider(providerType: ProviderType, config: DatabaseConfig): Promise<void> {
    try {
      logger.info(`Switching to ${providerType} provider...`);
      
      // Destroy current provider if exists
      if (this.provider) {
        await this.provider.destroy();
      }

      // Create new provider
      this.provider = await this.factory.createProvider(config, undefined, providerType);
      await this.provider.initialize(config);
      
      // Recreate collections
      await this.createCollections();
      
      this.detectedProviderType = providerType;
      this.isInitialized = true;
      this.initializationError = null;
      
      logger.info(`Successfully switched to ${providerType} provider`);
    } catch (error) {
      this.initializationError = error as Error;
      throw new DatabaseError(
        `Failed to switch to ${providerType} provider: ${error.message}`,
        'PROVIDER_SWITCH_ERROR'
      );
    }
  }

  /**
   * Destroy the database service
   */
  async destroy(): Promise<void> {
    try {
      if (this.provider) {
        await this.provider.destroy();
        this.provider = null;
      }
      
      this.isInitialized = false;
      this.detectedProviderType = null;
      this.initializationError = null;
      
      logger.info('Database service destroyed');
    } catch (error) {
      throw new DatabaseError(
        `Failed to destroy database service: ${error.message}`,
        'DESTRUCTION_ERROR'
      );
    }
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static reset(): void {
    if (DatabaseService.instance) {
      DatabaseService.instance.destroy().catch(console.error);
    }
    DatabaseService.instance = null as any;
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();

// Backward compatibility exports
export default databaseService;