// Enhanced Database Provider Factory
// Implements provider selection logic and factory pattern for dual-database architecture

import { Observable } from 'rxjs';
import {
  IDatabaseProvider,
  IDatabaseProviderFactory,
  ICollection,
  DatabaseConfig,
  CollectionSchema,
  CollectionRequirements,
  ProviderStatus,
  DatabaseError
} from './interfaces';
import { PouchDBProvider } from './PouchDBProvider';

// Provider Types
export type ProviderType = 'pouchdb' | 'rxdb' | 'hybrid';

// Provider Selection Strategy
export interface ProviderSelectionStrategy {
  selectProvider(requirements: CollectionRequirements): ProviderType;
}

// Default Provider Selection Strategy
export class DefaultProviderSelectionStrategy implements ProviderSelectionStrategy {
  selectProvider(requirements: CollectionRequirements): ProviderType {
    // PouchDB-first strategy: Use PouchDB as primary provider for all collections
    // This eliminates the artificial 16-collection limit and leverages PouchDB's capabilities
    
    // PouchDB is preferred for:
    // - All collection counts (no artificial limits)
    // - Offline-first applications
    // - Simple to moderate complexity queries
    // - Better IndexedDB integration
    
    if (requirements.requiresOffline || requirements.requiresSync) {
      return 'pouchdb';
    }
    
    // Use RxDB only for specific advanced reactive requirements
    if (requirements.requiresReactivity && requirements.performanceLevel === 'high') {
      return 'rxdb';
    }
    
    // Default to PouchDB for all other cases
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
  private activeProvider: IDatabaseProvider | null = null;
  private selectionStrategy: ProviderSelectionStrategy;

  constructor(selectionStrategy?: ProviderSelectionStrategy) {
    this.selectionStrategy = selectionStrategy || new DefaultProviderSelectionStrategy();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Register PouchDB provider
    this.providers.set('pouchdb', new PouchDBProvider());
    
    // Note: RxDB provider would be registered here when implemented
    // this.providers.set('rxdb', new RxDBProvider());
    
    console.log('Database providers initialized:', Array.from(this.providers.keys()));
  }

  async createProvider(config: DatabaseConfig, requirements?: CollectionRequirements): Promise<IDatabaseProvider> {
    try {
      // Determine which provider to use
      const providerType = requirements 
        ? this.selectionStrategy.selectProvider(requirements)
        : 'pouchdb'; // Default to PouchDB
      
      const provider = this.providers.get(providerType);
      if (!provider) {
        throw new DatabaseError(
          `Provider '${providerType}' not available`,
          'PROVIDER_NOT_FOUND'
        );
      }

      // Check if provider is available in current environment
      if (!provider.isAvailable()) {
        // Fallback to PouchDB if primary provider is not available
        const fallbackProvider = this.providers.get('pouchdb');
        if (!fallbackProvider || !fallbackProvider.isAvailable()) {
          throw new DatabaseError(
            'No database providers available in current environment',
            'NO_PROVIDERS_AVAILABLE'
          );
        }
        
        console.warn(`Provider '${providerType}' not available, falling back to PouchDB`);
        await fallbackProvider.initialize(config);
        this.activeProvider = fallbackProvider;
        return fallbackProvider;
      }

      // Initialize the selected provider
      await provider.initialize(config);
      this.activeProvider = provider;
      
      console.log(`Database provider '${providerType}' initialized successfully`);
      return provider;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create database provider: ${error.message}`,
        'PROVIDER_CREATION_ERROR'
      );
    }
  }

  getActiveProvider(): IDatabaseProvider | null {
    return this.activeProvider;
  }

  getAvailableProviders(): ProviderType[] {
    return Array.from(this.providers.keys()).filter(type => {
      const provider = this.providers.get(type);
      return provider?.isAvailable() ?? false;
    });
  }

  async switchProvider(providerType: ProviderType, config: DatabaseConfig): Promise<IDatabaseProvider> {
    try {
      // Destroy current provider if exists
      if (this.activeProvider) {
        await this.activeProvider.destroy();
        this.activeProvider = null;
      }

      // Create new provider
      const provider = await this.createProvider(config, {
        collectionsCount: 88, // Support all collections
        requiresOffline: true,
        requiresSync: false,
        requiresReactivity: false,
        performanceLevel: 'standard',
        storageQuota: 100 * 1024 * 1024 // 100MB default
      });

      return provider;
    } catch (error) {
      throw new DatabaseError(
        `Failed to switch to provider '${providerType}': ${error.message}`,
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
          console.error('Error destroying provider:', error);
        }
      }
      
      this.providers.clear();
      console.log('Database provider factory destroyed');
    } catch (error) {
      throw new DatabaseError(
        `Failed to destroy provider factory: ${error.message}`,
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
export {
  ProviderType,
  ProviderSelectionStrategy
};