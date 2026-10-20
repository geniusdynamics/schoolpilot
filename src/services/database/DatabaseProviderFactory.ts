import { logger } from '@/utils/logging';

// Enhanced Database Provider Factory
// Implements provider selection logic and factory pattern for dual-database architecture

import { Observable } from 'rxjs';
import {
  IDatabaseProvider,
  IDatabaseProviderFactory,
  ICollection,
  DatabaseConfig,
  CollectionRequirements,
  ProviderStatus,
  DatabaseError
} from './interfaces';
import { PouchDBProvider } from './PouchDBProvider';
import { SQLiteProvider } from './SQLiteProvider';
import {
  SQLiteWASMProvider,
  StorageUnavailableError,
  memoryDatabaseAllowed,
  toStorageUnavailableError
} from './SQLiteWASMProvider';
import { BackendAPIProvider } from './BackendAPIProvider';
// RXDB removed - Phase 4: No longer importing RxDBProvider
import { getCurrentUnifiedConfig } from '@/config/unifiedConfig';

// Provider Types
// RXDB removed - Phase 4
export type ProviderType = 'pouchdb' | 'sqlite' | 'sqlite-wasm' | 'sqlite-file' | 'livestore' | 'backend-api' | 'hybrid';

// Provider creation options
export interface ProviderCreationOptions {
  storageType?: 'file' | 'memory' | 'opfs';
  backendIntegration?: 'none' | 'supabase' | 'firebase';
  config?: any;
  environment?: 'development' | 'demo' | 'production';
}

// Provider Selection Strategy
export interface ProviderSelectionStrategy {
  selectProvider(
    requirements: CollectionRequirements,
    availableProviders?: ProviderType[]
  ): ProviderType;
}

// Default Provider Selection Strategy with UnifiedConfig Integration
export class DefaultProviderSelectionStrategy implements ProviderSelectionStrategy {
  selectProvider(
    requirements: CollectionRequirements,
    availableProviders?: ProviderType[]
  ): ProviderType {
    // Get current unified configuration
    const config = getCurrentUnifiedConfig();
    
    // Helper: check if a provider type is registered/available
    const isAvailable = (type: ProviderType): boolean =>
      !availableProviders || availableProviders.length === 0 || availableProviders.includes(type);
    
    // Check if user has explicitly configured a provider in unifiedConfig
    if (config.database?.provider) {
      logger.info(`[ProviderSelectionStrategy] Using configured provider: ${config.database.provider}`);
      
      switch (config.database.provider) {
        case 'sqlite': {
          // Pick best SQLite variant that's actually registered
          if (isAvailable('sqlite-wasm' as ProviderType)) {
            logger.info('[ProviderSelectionStrategy] sqlite-wasm available, using it');
            return 'sqlite-wasm';
          }
          if (isAvailable('sqlite-file' as ProviderType)) {
            logger.info('[ProviderSelectionStrategy] sqlite-file available, using it');
            return 'sqlite-file';
          }
          // Neither SQLite variant available, fall through to defaults
          logger.warn('[ProviderSelectionStrategy] No SQLite provider available, using fallback');
          const env = config.environment || 'production';
          return env === 'development' ? 'sqlite-wasm' : 'pouchdb';
        }
        case 'pouchdb':
          return 'pouchdb';
        // RXDB removed - Phase 4
        // case 'rxdb':
        //   return 'rxdb';
        case 'backend-api':
          return 'backend-api';
        // case 'livestore': // Temporarily disabled
        //   return 'pouchdb';
        case 'sqlite-wasm':
          return 'sqlite-wasm';
        case 'sqlite-file':
          return 'sqlite-file';
        default:
          logger.warn(`[ProviderSelectionStrategy] Unknown configured provider ${config.database.provider}, using automatic selection`);
      }
    }
    
    // Automatic provider selection based on environment and requirements
    const environment = config.environment || 'production';
    const isDevelopment = environment === 'development';
    
    logger.info(`[ProviderSelectionStrategy] Automatic selection for environment: ${environment}`);
    
    // Development environment preferences
    if (isDevelopment) {
      if (requirements.requiresOffline) {
        if (isAvailable('sqlite-wasm' as ProviderType)) return 'sqlite-wasm';
        if (isAvailable('sqlite-file' as ProviderType)) return 'sqlite-file';
        return 'pouchdb'; // Fallback
      }
      return 'pouchdb'; // PouchDB for development flexibility
    }
    
    // Production environment preferences
    if (environment === 'production') {
      // Use SQLite WASM for high-performance offline applications
      if (requirements.requiresOffline && requirements.performanceLevel === 'high') {
        if (isAvailable('sqlite-wasm' as ProviderType)) return 'sqlite-wasm';
        if (isAvailable('sqlite-file' as ProviderType)) return 'sqlite-file';
        return 'pouchdb';
      }
      
      // RXDB removed - Phase 4: Using PouchDB for reactivity
      if (requirements.requiresReactivity && requirements.performanceLevel === 'high') {
        return 'pouchdb';
      }
    }
    
    // Fallback logic based on requirements
    if (requirements.requiresSync) {
      if (isAvailable('backend-api' as ProviderType) && config.database?.apiConfig?.apiBaseUrl) {
        return 'backend-api'; // Use Backend API for external sync
      }
      if (isAvailable('pouchdb' as ProviderType)) return 'pouchdb'; // PouchDB sync
      return 'sqlite-wasm'; // Fallback
    }
    
    if (requirements.requiresOffline) {
      if (isAvailable('sqlite-wasm' as ProviderType)) return 'sqlite-wasm';
      if (isAvailable('sqlite-file' as ProviderType)) return 'sqlite-file';
      return 'pouchdb';
    }
    
    // Default fallback
    logger.info('[ProviderSelectionStrategy] Using default fallback: pouchdb');
    return 'pouchdb';
  }
}

// Enhanced Query Builder
export class QueryBuilder<T> {
  private query: any = {};
  private sortOptions: any[] = [];
  private limitValue?: number;
  private skipValue?: number;
  private fieldsValue?: string[];

  constructor(private collectionName: string) {}

  // Selection methods
  where(field: keyof T, operator: string, value: any): QueryBuilder<T> {
    if (!this.query.selector) {
      this.query.selector = {};
    }
    
    switch (operator) {
      case '=':
      case 'eq':
        this.query.selector[field as string] = value;
        break;
      case '!=':
      case 'ne':
        this.query.selector[field as string] = { $ne: value };
        break;
      case '>':
      case 'gt':
        this.query.selector[field as string] = { $gt: value };
        break;
      case '>=':
      case 'gte':
        this.query.selector[field as string] = { $gte: value };
        break;
      case '<':
      case 'lt':
        this.query.selector[field as string] = { $lt: value };
        break;
      case '<=':
      case 'lte':
        this.query.selector[field as string] = { $lte: value };
        break;
      case 'in':
        this.query.selector[field as string] = { $in: value };
        break;
      case 'nin':
        this.query.selector[field as string] = { $nin: value };
        break;
      case 'exists':
        this.query.selector[field as string] = { $exists: value };
        break;
      case 'regex':
        this.query.selector[field as string] = { $regex: value };
        break;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
    
    return this;
  }

  // Logical operators
  and(conditions: Array<{ field: keyof T; operator: string; value: any }>): QueryBuilder<T> {
    if (!this.query.selector) {
      this.query.selector = {};
    }
    
    const andConditions = conditions.map(condition => {
      const conditionQuery = new QueryBuilder<T>(this.collectionName)
        .where(condition.field, condition.operator, condition.value)
        .build();
      return conditionQuery.selector;
    });
    
    if (this.query.selector.$and) {
      this.query.selector.$and.push(...andConditions);
    } else {
      this.query.selector.$and = andConditions;
    }
    
    return this;
  }

  or(conditions: Array<{ field: keyof T; operator: string; value: any }>): QueryBuilder<T> {
    if (!this.query.selector) {
      this.query.selector = {};
    }
    
    const orConditions = conditions.map(condition => {
      const conditionQuery = new QueryBuilder<T>(this.collectionName)
        .where(condition.field, condition.operator, condition.value)
        .build();
      return conditionQuery.selector;
    });
    
    this.query.selector.$or = orConditions;
    return this;
  }

  // Sorting
  sort(field: keyof T, direction: 'asc' | 'desc' = 'asc'): QueryBuilder<T> {
    const sortObj: any = {};
    sortObj[field as string] = direction;
    this.sortOptions.push(sortObj);
    return this;
  }

  // Pagination
  limit(count: number): QueryBuilder<T> {
    this.limitValue = count;
    return this;
  }

  skip(count: number): QueryBuilder<T> {
    this.skipValue = count;
    return this;
  }

  // Field selection
  select(fields: (keyof T)[]): QueryBuilder<T> {
    this.fieldsValue = fields as string[];
    return this;
  }

  // Build final query
  build(): any {
    const finalQuery: any = { ...this.query };
    
    if (this.sortOptions.length > 0) {
      finalQuery.sort = this.sortOptions;
    }
    
    if (this.limitValue !== undefined) {
      finalQuery.limit = this.limitValue;
    }
    
    if (this.skipValue !== undefined) {
      finalQuery.skip = this.skipValue;
    }
    
    if (this.fieldsValue) {
      finalQuery.fields = this.fieldsValue;
    }
    
    return finalQuery;
  }

  // Execute query methods
  async execute(collection: ICollection<T>): Promise<T[]> {
    const query = this.build();
    return await collection.find(query);
  }

  async executeOne(collection: ICollection<T>): Promise<T | null> {
    const query = this.build();
    return await collection.findOne(query);
  }

  async count(collection: ICollection<T>): Promise<number> {
    const query = this.build();
    return await collection.count(query);
  }

  subscribe(collection: ICollection<T>): Observable<T[]> {
    const query = this.build();
    return collection.subscribe(query);
  }
}

// Database Provider Factory Implementation
export class DatabaseProviderFactory implements IDatabaseProviderFactory {
  private providers = new Map<ProviderType, IDatabaseProvider>();
  private providerFactories = new Map<string, () => IDatabaseProvider>();
  private activeProvider: IDatabaseProvider | null = null;
  private selectionStrategy: ProviderSelectionStrategy;

  private initializationPromise: Promise<void> | null = null;

  constructor(selectionStrategy?: ProviderSelectionStrategy) {
    this.selectionStrategy = selectionStrategy || new DefaultProviderSelectionStrategy();
    // Skip provider initialization in test environment to prevent DOM access
    if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
      this.initializationPromise = this.initializeProviders();
    }
  }

  /**
   * Wait for provider initialization to complete
   */
  async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  public registerProvider(name: string, factory: () => IDatabaseProvider): void;
  public registerProvider(provider: IDatabaseProvider): void;
  public registerProvider(nameOrProvider: string | IDatabaseProvider, factory?: () => IDatabaseProvider): void {
    if (typeof nameOrProvider === 'string' && factory) {
      // Interface implementation: registerProvider(name: string, factory: () => IDatabaseProvider)
      this.providerFactories.set(nameOrProvider, factory);
      logger.info(`Registered provider factory: ${nameOrProvider}`);
    } else if (typeof nameOrProvider === 'object') {
      // Internal implementation: registerProvider(provider: IDatabaseProvider)
      const provider = nameOrProvider as IDatabaseProvider;
      const providerType = this.getProviderType(provider);
      this.providers.set(providerType, provider);
      logger.info(`Registered database provider: ${providerType}`);
    }
  }

  private async createMockProvider(): Promise<IDatabaseProvider> {
    // Create a minimal mock provider that prevents crashes
    return {
      name: 'MockProvider',
      version: '1.0.0',
      initialize: async () => {},
      createCollection: async () => ({
        name: 'mock',
        insert: async () => ({ id: 'mock' }),
        findById: async () => null,
        find: async () => [],
        update: async () => ({ id: 'mock' }),
        delete: async () => true,
        count: async () => 0,
        clear: async () => {},
        subscribe: () => ({ subscribe: () => ({ unsubscribe: () => {} }) })
      } as any),
      getCollection: () => null,
      getAllCollections: () => new Map(),
      destroy: async () => {},
      isAvailable: () => true,
      getStatus: () => ({ 
        isConnected: true, 
        isReady: true, 
        error: null,
        name: 'MockProvider',
        version: '1.0.0',
        collectionsCount: 0,
        performance: { avgQueryTime: 0, totalQueries: 0, memoryUsage: 0 }
      }),
      backup: async () => '/mock/backup/path',
      restore: async () => {}
    };
  }

  private getProviderType(provider: IDatabaseProvider): ProviderType {
    // Determine provider type based on constructor name or other identifying features
    const constructorName = provider.constructor.name;
    
    if (constructorName.includes('PouchDB')) {
      return 'pouchdb';
    } else if (constructorName.includes('SQLiteWASM')) {
      // RXDB case removed - Phase 4
      // SQLiteWASMProvider for WASM-based SQLite
      return 'sqlite-wasm';
    } else if (constructorName.includes('SQLiteFile')) {
      // SQLiteFileProvider for file-based SQLite
      return 'sqlite-file';
    } else if (constructorName.includes('SQLite')) {
      // Other SQLite providers
      return 'sqlite';
    } else if (constructorName.includes('LiveStore')) {
      // Direct LiveStore providers
      return 'sqlite-wasm'; // Map LiveStore to sqlite-wasm for now
    } else if (constructorName.includes('BackendAPI')) {
      // Backend API providers
      return 'backend-api';
    } else {
      throw new Error(`Unknown provider type: ${constructorName}`);
    }
  }

  private async initializeProviders(): Promise<void> {
    try {
      logger.info('[DatabaseProviderFactory] Starting provider initialization...');
      
      // Check environment variables for provider enablement
      // RXDB removed - Phase 4
      const enablePouchDB = process.env.REACT_APP_ENABLE_POUCHDB !== 'false'; // Default true
      const enableSQLiteWASM = process.env.REACT_APP_ENABLE_SQLITE_WASM !== 'false'; // Default true
      const enableBackendAPI = process.env.REACT_APP_ENABLE_BACKEND_API !== 'false'; // Default true
      
      logger.info('[DatabaseProviderFactory] Provider enablement flags:', {
        enablePouchDB,
        enableSQLiteWASM,
        enableBackendAPI
      });
      
      // Register available providers based on configuration
      if (enablePouchDB) {
        try {
          const pouchProvider = new PouchDBProvider();
          this.registerProvider(pouchProvider);
          logger.info('[DatabaseProviderFactory] PouchDB provider registered, isAvailable:', pouchProvider.isAvailable());
        } catch (error) {
          logger.error('[DatabaseProviderFactory] Failed to register PouchDB provider:', error);
        }
      } else {
        logger.info('[DatabaseProviderFactory] PouchDB provider disabled via environment variable');
      }
      
      // RXDB provider initialization removed - Phase 4
      
      if (enableSQLiteWASM) {
        try {
          const sqliteWasmProvider = new SQLiteWASMProvider();
          this.registerProvider(sqliteWasmProvider);
          logger.info('[DatabaseProviderFactory] SQLite WASM provider registered, isAvailable:', sqliteWasmProvider.isAvailable());
        } catch (error) {
          logger.error('[DatabaseProviderFactory] Failed to register SQLite WASM provider:', error);
        }
      } else {
        logger.info('[DatabaseProviderFactory] SQLite WASM provider disabled via environment variable');
      }
      
      if (enableBackendAPI) {
        try {
          const backendProvider = new BackendAPIProvider();
          this.registerProvider(backendProvider);
          logger.info('[DatabaseProviderFactory] Backend API provider registered, isAvailable:', backendProvider.isAvailable());
        } catch (error) {
          logger.error('[DatabaseProviderFactory] Failed to register Backend API provider:', error);
        }
      } else {
        logger.info('[DatabaseProviderFactory] Backend API provider disabled via environment variable');
      }
      
      // Register SQLiteFileProvider only in Node-like runtimes.
      // Dynamic import avoids bundling Node-only SQLite dependencies into browser builds.
      void this.registerSQLiteFileProvider();
      
      logger.info('[DatabaseProviderFactory] Database providers initialized:', Array.from(this.providers.keys()));
      logger.info('[DatabaseProviderFactory] Available providers:', this.getAvailableProviderTypes());
    } catch (error) {
      logger.error('[DatabaseProviderFactory] Provider initialization failed:', error);
      // Continue with minimal providers
      logger.info('[DatabaseProviderFactory] Continuing with minimal provider set');
    }
  }

  private async registerSQLiteFileProvider(): Promise<void> {
    if (typeof window !== 'undefined') {
      logger.info('[DatabaseProviderFactory] SQLiteFileProvider skipped in browser environment');
      return;
    }

    try {
      const sqliteFileProviderPath = './SQLiteFileProvider';
      const sqliteFileModule = await import(/* @vite-ignore */ sqliteFileProviderPath);
      const sqliteFileProvider = new sqliteFileModule.SQLiteFileProvider();
      this.registerProvider(sqliteFileProvider);
      logger.info('[DatabaseProviderFactory] SQLiteFileProvider registered successfully, isAvailable:', sqliteFileProvider.isAvailable());
    } catch (error) {
      logger.warn('[DatabaseProviderFactory] SQLiteFileProvider registration failed:', error);
      logger.info('[DatabaseProviderFactory] Continuing without SQLiteFileProvider');
    }
  }

  async createProviderWithRequirements(
    config: DatabaseConfig, 
    requirements?: CollectionRequirements,
    options?: ProviderCreationOptions
  ): Promise<IDatabaseProvider> {
    try {
      logger.info('[DatabaseProviderFactory] Creating provider with requirements:', requirements);
      
      // Determine which provider to use (pass available providers for smart selection)
      const availableTypes = this.getAvailableProviderTypes();
      const primaryProviderType = requirements 
        ? this.selectionStrategy.selectProvider(requirements, availableTypes)
        : 'pouchdb'; // Default to PouchDB
      
      logger.info(`[DatabaseProviderFactory] Primary provider selected: ${primaryProviderType}`);
      
      // Try to create and initialize the primary provider
      const provider = await this.createAndInitializeProvider(primaryProviderType, config, options);
      
      if (provider) {
        this.activeProvider = provider;
        logger.info(`[DatabaseProviderFactory] Successfully created provider: ${primaryProviderType}`);
        return provider;
      }
      
      // Persistent SQLite is never swapped for another store unless a temporary
      // database was explicitly allowed.
      if (primaryProviderType === 'sqlite-wasm' && !memoryDatabaseAllowed()) {
        throw new StorageUnavailableError('The SQLite database provider is not available');
      }

      // If primary provider failed, try fallback providers
      logger.warn(`[DatabaseProviderFactory] Primary provider ${primaryProviderType} failed, trying fallbacks...`);
      
      const fallbackProviders: ProviderType[] = ['pouchdb', 'sqlite-wasm', 'backend-api'];
      
      for (const fallbackType of fallbackProviders) {
        if (fallbackType === primaryProviderType) continue; // Skip already tried provider
        
        logger.info(`[DatabaseProviderFactory] Trying fallback provider: ${fallbackType}`);
        
        const fallbackProvider = await this.createAndInitializeProvider(fallbackType, config, options);
        if (fallbackProvider) {
          this.activeProvider = fallbackProvider;
          logger.info(`[DatabaseProviderFactory] Successfully created fallback provider: ${fallbackType}`);
          return fallbackProvider;
        }
      }
      
      // The mock provider keeps nothing, so once real stores were registered and
      // all failed it is only acceptable when a temporary database was explicitly
      // allowed; otherwise fail closed. (Unit tests register no stores at all.)
      if (!memoryDatabaseAllowed() && this.providers.size > 0) {
        throw new StorageUnavailableError('No persistent database provider could be initialised');
      }
      logger.warn('[DatabaseProviderFactory] All providers failed, creating mock provider as fallback');
      const mockProvider = await this.createMockProvider();
      this.activeProvider = mockProvider;
      return mockProvider;
    } catch (error) {
      if (error instanceof StorageUnavailableError) throw error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new DatabaseError(
        `Failed to create database provider: ${errorMessage}`,
        'PROVIDER_CREATION_ERROR'
      );
    }
  }

  private async createAndInitializeProvider(
    providerType: ProviderType,
    config: DatabaseConfig,
    options?: ProviderCreationOptions
  ): Promise<IDatabaseProvider | null> {
    try {
      let provider = this.providers.get(providerType);
      
      // Special handling for SQLiteProvider which needs config in constructor
      if (providerType === 'sqlite' && !provider) {
        provider = new SQLiteProvider(config);
        this.registerProvider(provider);
      }
      
      if (!provider) {
        logger.warn(`[DatabaseProviderFactory] Provider '${providerType}' not registered`);
        return null;
      }

      // Check if provider is available in current environment. SQLite WASM is
      // exempt: its initialize() decides between persistent storage, an allowed
      // temporary database, or StorageUnavailableError.
      if (providerType !== 'sqlite-wasm' && !provider.isAvailable()) {
        logger.warn(`[DatabaseProviderFactory] Provider '${providerType}' not available in current environment`);
        return null;
      }

      // Merge options into config if provided
      const finalConfig = options ? { ...config, ...options } : config;

      // Initialize the provider
      await provider.initialize(finalConfig);
      
      return provider;
    } catch (error) {
      logger.error(`[DatabaseProviderFactory] Failed to initialize provider ${providerType}:`, error);
      // Missing persistent storage is not a reason to try another store.
      if (error instanceof StorageUnavailableError) throw error;
      // Any SQLite failure means there is no persistent store: fail closed.
      if (providerType === 'sqlite-wasm' && !memoryDatabaseAllowed()) {
        throw toStorageUnavailableError(error, 'SQLite database could not be opened');
      }
      return null;
    }
  }

  getActiveProvider(): IDatabaseProvider | null {
    return this.activeProvider;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys()).filter(type => {
      const provider = this.providers.get(type);
      return provider?.isAvailable() ?? false;
    });
  }

  getAvailableProviderTypes(): ProviderType[] {
    return Array.from(this.providers.keys()).filter(type => {
      const provider = this.providers.get(type);
      return provider?.isAvailable() ?? false;
    });
  }

  // Check if a specific provider type is available
  isProviderAvailable(type: ProviderType): boolean {
    const provider = this.providers.get(type);
    return provider?.isAvailable() ?? false;
  }

  async switchProvider(providerType: ProviderType, config: DatabaseConfig): Promise<IDatabaseProvider> {
    try {
      // Destroy current provider if exists
      if (this.activeProvider) {
        await this.activeProvider.destroy();
        this.activeProvider = null;
      }

      // Create new provider
      const provider = await this.createProviderWithRequirements(config, {
        collectionsCount: 88, // Support all collections
        requiresOffline: true,
        requiresSync: false,
        requiresReactivity: false,
        performanceLevel: 'standard',
        storageQuota: 100 * 1024 * 1024 // 100MB default
      });

      return provider;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new DatabaseError(
        `Failed to switch to provider '${providerType}': ${errorMessage}`,
        'PROVIDER_SWITCH_ERROR'
      );
    }
  }

  getProviderStatus(): ProviderStatus[] {
    return Array.from(this.providers.entries()).map(([type, provider]) => ({
      ...provider.getStatus(),
      type,
      isActive: provider === this.activeProvider
    }));
  }

  // Query builder factory
  createQueryBuilder<T>(collectionName: string): QueryBuilder<T> {
    return new QueryBuilder<T>(collectionName);
  }

  // Get deployment mode from unifiedConfig
  getDeploymentMode(): string {
    const config = getCurrentUnifiedConfig();
    return config.environment || 'production';
  }

  // Get database configuration from unifiedConfig
  getDatabaseConfig(): any {
    const config = getCurrentUnifiedConfig();
    return config.database || {};
  }

  // Check if provider switching is allowed (development mode only)
  isProviderSwitchingAllowed(): boolean {
    const deploymentMode = this.getDeploymentMode();
    return deploymentMode === 'development';
  }

  // IDatabaseProviderFactory interface implementation
  async createProvider(type: string, config: DatabaseConfig): Promise<IDatabaseProvider> {
    // Convert string type to ProviderType and use enhanced createProvider
    const requirements: CollectionRequirements = {
      collectionsCount: 88,
      requiresOffline: true,
      requiresSync: false,
      requiresReactivity: true,
      performanceLevel: 'standard',
      storageQuota: 100 * 1024 * 1024
    };
    
    return this.createProviderWithRequirements(config, requirements);
  }

  validateProvider(type: string): boolean {
    const providerType = type as ProviderType;
    return this.isProviderAvailable(providerType);
  }

  selectOptimalProvider(requirements: CollectionRequirements): string {
    const availableTypes = this.getAvailableProviderTypes();
    return this.selectionStrategy.selectProvider(requirements, availableTypes);
  }

  async destroy(): Promise<void> {
    try {
      if (this.activeProvider) {
        await this.activeProvider.destroy();
        this.activeProvider = null;
      }
      
      // Destroy all providers
      for (const provider of this.providers.values()) {
        try {
          await provider.destroy();
        } catch (error) {
          logger.error('Error destroying provider:', error);
        }
      }
      
      this.providers.clear();
      logger.info('Database provider factory destroyed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new DatabaseError(
        `Failed to destroy provider factory: ${errorMessage}`,
        'FACTORY_DESTRUCTION_ERROR'
      );
    }
  }
}

// Singleton instance for global access
let factoryInstance: DatabaseProviderFactory | null = null;

export function getDatabaseProviderFactory(): DatabaseProviderFactory {
  if (!factoryInstance) {
    factoryInstance = new DatabaseProviderFactory();
  }
  return factoryInstance;
}

export function resetDatabaseProviderFactory(): void {
  if (factoryInstance) {
    factoryInstance.destroy();
    factoryInstance = null;
  }
}

// Export types and utilities
// Note: ProviderSelectionStrategy exported above in class definition
