import { logger } from '@/utils/logging';

/**
 * Unified Data Service
 * 
 * Main service that provides a consistent API across all storage backends.
 * Routes operations to the appropriate provider based on configuration.
 */

import { BehaviorSubject, Observable } from 'rxjs';
import type {
  DataProvider,
  DeploymentMode,
  DataServiceConfig,
  Query,
  PaginatedResult,
  WriteOptions,
  Operation,
  Filter,
  DataEvent,
  DataEventType,
  SyncResult
} from './types';

// Provider imports will be added when implementing specific providers
// import { SQLiteProvider } from './providers/SQLiteProvider';
// import { PouchDBProvider } from './providers/PouchDBProvider';
// import { BackendAPIProvider } from './providers/BackendAPIProvider';

interface ServiceState {
  initialized: boolean;
  initializing: boolean;
  mode: DeploymentMode | null;
  error: Error | null;
}

export class UnifiedDataService {
  private provider: DataProvider | null = null;
  private config: DataServiceConfig | null = null;
  private state = new BehaviorSubject<ServiceState>({
    initialized: false,
    initializing: false,
    mode: null,
    error: null
  });
  
  private eventBus = new BehaviorSubject<DataEvent | null>(null);
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  // Public state observable
  public readonly state$ = this.state.asObservable();
  public readonly events$ = this.eventBus.asObservable();

  /**
   * Get current state
   */
  get currentState(): ServiceState {
    return this.state.value;
  }

  /**
   * Check if service is ready
   */
  get isReady(): boolean {
    return this.state.value.initialized && !this.state.value.initializing;
  }

  /**
   * Get current provider
   */
  get currentProvider(): DataProvider | null {
    return this.provider;
  }

  /**
   * Initialize the service with a specific deployment mode
   */
  async initialize(mode: DeploymentMode, options: Record<string, any> = {}): Promise<void> {
    if (this.state.value.initializing) {
      logger.warn('Data service already initializing');
      return;
    }

    if (this.state.value.initialized) {
      logger.warn('Data service already initialized');
      return;
    }

    this.state.next({
      ...this.state.value,
      initializing: true,
      mode
    });

    try {
      // Select and initialize provider based on mode
      this.provider = await this.createProvider(mode, options);
      
      await this.provider.initialize(options);

      this.config = {
        mode,
        provider: this.provider.name as any,
        options
      };

      this.state.next({
        initialized: true,
        initializing: false,
        mode,
        error: null
      });

      logger.info(`✅ UnifiedDataService initialized in ${mode} mode with ${this.provider.name}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      this.state.next({
        initialized: false,
        initializing: false,
        mode,
        error: err
      });

      logger.error('❌ Failed to initialize UnifiedDataService:', err);
      throw err;
    }
  }

  /**
   * Destroy the service and cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.provider) {
      await this.provider.destroy();
      this.provider = null;
    }
    
    this.cache.clear();
    this.state.next({
      initialized: false,
      initializing: false,
      mode: null,
      error: null
    });
  }

  // ==================== CRUD Operations ====================

  /**
   * Find multiple entities
   */
  async find<T>(collection: string, query: Query = {}): Promise<PaginatedResult<T>> {
    this.ensureInitialized();
    
    const cacheKey = this.buildCacheKey(collection, query);
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.provider!.find<T>(collection, query);
    
    // Update cache
    this.setCache(cacheKey, result);
    
    return result;
  }

  /**
   * Find a single entity by ID
   */
  async findOne<T>(collection: string, id: string): Promise<T | null> {
    this.ensureInitialized();
    
    const cacheKey = `${collection}:${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.provider!.findOne<T>(collection, id);
    
    if (result) {
      this.setCache(cacheKey, result);
    }
    
    return result;
  }

  /**
   * Find multiple entities by IDs
   */
  async findByIds<T>(collection: string, ids: string[]): Promise<T[]> {
    this.ensureInitialized();
    
    if (this.provider!.findByIds) {
      return this.provider!.findByIds<T>(collection, ids);
    }

    // Fallback: fetch one by one
    const results = await Promise.all(
      ids.map(id => this.findOne<T>(collection, id))
    );
    
    return results.filter((r): r is T => r !== null);
  }

  /**
   * Create a new entity
   */
  async create<T>(
    collection: string, 
    data: Omit<T, 'id'>, 
    options: WriteOptions = {}
  ): Promise<T> {
    this.ensureInitialized();

    // Add metadata
    const dataWithMeta = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    const result = await this.provider!.create<T>(collection, dataWithMeta, options);
    
    // Clear relevant caches
    this.invalidateCache(collection);
    
    // Emit event
    this.emitEvent('entity-created', collection, result);
    
    return result;
  }

  /**
   * Update an entity
   */
  async update<T>(
    collection: string, 
    id: string, 
    data: Partial<T>, 
    options: WriteOptions = {}
  ): Promise<T> {
    this.ensureInitialized();

    // Add metadata
    const dataWithMeta = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    const result = await this.provider!.update<T>(collection, id, dataWithMeta, options);
    
    // Clear caches
    this.invalidateCache(`${collection}:${id}`);
    this.invalidateCache(collection);
    
    // Emit event
    this.emitEvent('entity-updated', collection, result, id);
    
    return result;
  }

  /**
   * Delete an entity
   */
  async delete(collection: string, id: string, options: WriteOptions = {}): Promise<void> {
    this.ensureInitialized();
    
    await this.provider!.delete(collection, id, options);
    
    // Clear caches
    this.invalidateCache(`${collection}:${id}`);
    this.invalidateCache(collection);
    
    // Emit event
    this.emitEvent('entity-deleted', collection, undefined, id);
  }

  // ==================== Real-time Subscriptions ====================

  /**
   * Subscribe to query results
   */
  subscribe<T>(collection: string, query: Query = {}): Observable<T[]> {
    this.ensureInitialized();
    
    if (!this.provider!.capabilities.realtime) {
      // Fallback to polling for non-realtime providers
      return this.createPollingObservable(collection, query);
    }

    return this.provider!.subscribe<T>(collection, query);
  }

  /**
   * Subscribe to a single entity
   */
  subscribeOne<T>(collection: string, id: string): Observable<T | null> {
    this.ensureInitialized();
    
    if (!this.provider!.capabilities.realtime) {
      // Fallback to polling
      return this.createPollingObservableForOne(collection, id);
    }

    if (this.provider!.subscribeOne) {
      return this.provider!.subscribeOne<T>(collection, id);
    }

    // Fallback: filter from collection subscription
    return this.provider!.subscribe<T>(collection, { filter: { id: { $eq: id } } })
      .pipe(
        map(results => results[0] || null)
      );
  }

  // ==================== Bulk Operations ====================

  /**
   * Create multiple entities
   */
  async bulkCreate<T>(collection: string, data: T[]): Promise<T[]> {
    this.ensureInitialized();
    
    const result = await this.provider!.bulkCreate<T>(collection, data);
    
    this.invalidateCache(collection);
    
    return result;
  }

  /**
   * Update multiple entities
   */
  async bulkUpdate<T>(
    collection: string, 
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<T[]> {
    this.ensureInitialized();
    
    const result = await this.provider!.bulkUpdate<T>(collection, updates);
    
    // Invalidate caches
    updates.forEach(u => this.invalidateCache(`${collection}:${u.id}`));
    this.invalidateCache(collection);
    
    return result;
  }

  /**
   * Delete multiple entities
   */
  async bulkDelete(collection: string, ids: string[]): Promise<void> {
    this.ensureInitialized();
    
    await this.provider!.bulkDelete(collection, ids);
    
    // Invalidate caches
    ids.forEach(id => this.invalidateCache(`${collection}:${id}`));
    this.invalidateCache(collection);
  }

  // ==================== Transactions ====================

  /**
   * Execute operations in a transaction
   */
  async transaction<T>(operations: Operation[]): Promise<T> {
    this.ensureInitialized();
    
    if (!this.provider!.capabilities.transactions) {
      throw new Error('Current provider does not support transactions');
    }

    return this.provider!.transaction<T>(operations);
  }

  // ==================== Sync Operations ====================

  /**
   * Trigger sync (if provider supports it)
   */
  async sync(): Promise<SyncResult> {
    this.ensureInitialized();
    
    if (!this.provider!.sync) {
      throw new Error('Current provider does not support sync');
    }

    this.emitEvent('sync-started', 'system');
    
    try {
      const result = await this.provider!.sync();
      
      if (result.success) {
        this.emitEvent('sync-completed', 'system');
      } else {
        this.emitEvent('sync-failed', 'system', { errors: result.errors });
      }
      
      // Clear all caches after sync
      this.cache.clear();
      
      return result;
    } catch (error) {
      this.emitEvent('sync-failed', 'system', { error });
      throw error;
    }
  }

  /**
   * Get pending changes (if provider supports it)
   */
  async getPendingChanges() {
    this.ensureInitialized();
    
    if (!this.provider!.getPendingChanges) {
      return [];
    }

    return this.provider!.getPendingChanges();
  }

  // ==================== Utility Methods ====================

  /**
   * Count entities in collection
   */
  async count(collection: string, filter?: Filter): Promise<number> {
    this.ensureInitialized();
    return this.provider!.count(collection, filter);
  }

  /**
   * Check if entity exists
   */
  async exists(collection: string, id: string): Promise<boolean> {
    this.ensureInitialized();
    return this.provider!.exists(collection, id);
  }

  /**
   * Export all data (if provider supports it)
   */
  async export(): Promise<Blob> {
    this.ensureInitialized();
    
    if (!this.provider!.export) {
      throw new Error('Current provider does not support export');
    }

    return this.provider!.export();
  }

  /**
   * Import data (if provider supports it)
   */
  async import(data: Blob): Promise<void> {
    this.ensureInitialized();
    
    if (!this.provider!.import) {
      throw new Error('Current provider does not support import');
    }

    await this.provider!.import(data);
    
    // Clear all caches
    this.cache.clear();
  }

  // ==================== Private Methods ====================

  private async createProvider(mode: DeploymentMode, options: Record<string, any>): Promise<DataProvider> {
    const { createProvider } = await import('./providers');
    
    switch (mode) {
      case 'standalone':
        // Use PouchDB as default provider for standalone mode
        return createProvider({
          mode: 'standalone',
          pouchdb: options.pouchdb
        });
      
      case 'networked':
      case 'saas':
        return createProvider({
          mode,
          pouchdb: options.pouchdb
        });
      
      case 'hosted':
        // Will be implemented in Phase 3: BackendAPIProvider
        return this.createMockProvider();
      
      case 'demo':
      default:
        return this.createMockProvider();
    }
  }

  private createMockProvider(): DataProvider {
    // Simple in-memory provider for Phase 1
    const storage = new Map<string, Map<string, any>>();
    
    return {
      name: 'mock',
      version: '1.0.0',
      capabilities: {
        realtime: false,
        sync: false,
        transactions: false,
        offline: true,
        encryption: false,
        fullTextSearch: false,
        relations: false
      },
      
      async initialize() {},
      async destroy() {},
      
      async find<T>(collection: string, query: Query): Promise<PaginatedResult<T>> {
        const coll = storage.get(collection) || new Map();
        let data = Array.from(coll.values()) as T[];
        
        // Simple filtering
        if (query.filter) {
          data = data.filter(item => this.matchesFilter(item, query.filter!));
        }
        
        // Simple sorting
        if (query.sort) {
          data = this.sortData(data, query.sort);
        }
        
        const totalCount = data.length;
        const page = query.pagination?.page || 1;
        const pageSize = query.pagination?.pageSize || 50;
        const start = (page - 1) * pageSize;
        const paginatedData = data.slice(start, start + pageSize);
        
        return {
          data: paginatedData,
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
            hasNextPage: start + pageSize < totalCount,
            hasPreviousPage: page > 1
          }
        };
      },
      
      async findOne<T>(collection: string, id: string): Promise<T | null> {
        const coll = storage.get(collection);
        return coll?.get(id) || null;
      },
      
      async create<T>(collection: string, data: any): Promise<T> {
        if (!storage.has(collection)) {
          storage.set(collection, new Map());
        }
        const id = data.id || `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const item = { ...data, id };
        storage.get(collection)!.set(id, item);
        return item;
      },
      
      async update<T>(collection: string, id: string, data: any): Promise<T> {
        const coll = storage.get(collection);
        if (!coll?.has(id)) {
          throw new Error(`Entity ${id} not found in ${collection}`);
        }
        const updated = { ...coll.get(id), ...data, id };
        coll.set(id, updated);
        return updated;
      },
      
      async delete(collection: string, id: string): Promise<void> {
        storage.get(collection)?.delete(id);
      },
      
      subscribe: () => new Observable(),
      
      async count(collection: string): Promise<number> {
        return storage.get(collection)?.size || 0;
      },
      
      async exists(collection: string, id: string): Promise<boolean> {
        return storage.get(collection)?.has(id) || false;
      }
    } as DataProvider;
  }

  private ensureInitialized(): void {
    if (!this.isReady) {
      throw new Error('UnifiedDataService not initialized. Call initialize() first.');
    }
  }

  private buildCacheKey(collection: string, query: Query): string {
    return `${collection}:${JSON.stringify(query)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private emitEvent(type: DataEventType, collection: string, data?: any, entityId?: string): void {
    this.eventBus.next({
      type,
      collection,
      entityId,
      timestamp: Date.now(),
      data
    });
  }

  private createPollingObservable<T>(collection: string, query: Query): Observable<T[]> {
    return new Observable(subscriber => {
      const fetch = async () => {
        try {
          const result = await this.find<T>(collection, query);
          subscriber.next(result.data);
        } catch (error) {
          subscriber.error(error);
        }
      };

      fetch();
      const interval = setInterval(fetch, 5000);

      return () => clearInterval(interval);
    });
  }

  private createPollingObservableForOne<T>(collection: string, id: string): Observable<T | null> {
    return new Observable(subscriber => {
      const fetch = async () => {
        try {
          const result = await this.findOne<T>(collection, id);
          subscriber.next(result);
        } catch (error) {
          subscriber.error(error);
        }
      };

      fetch();
      const interval = setInterval(fetch, 5000);

      return () => clearInterval(interval);
    });
  }

  private matchesFilter(item: any, filter: Filter): boolean {
    // Simple filter implementation
    for (const [field, condition] of Object.entries(filter)) {
      const value = item[field];
      
      if (typeof condition === 'object') {
        if ('$eq' in condition && value !== condition.$eq) return false;
        if ('$ne' in condition && value === condition.$ne) return false;
        if ('$gt' in condition && !(value > condition.$gt)) return false;
        if ('$gte' in condition && !(value >= condition.$gte)) return false;
        if ('$lt' in condition && !(value < condition.$lt)) return false;
        if ('$lte' in condition && !(value <= condition.$lte)) return false;
        if ('$in' in condition && !condition.$in.includes(value)) return false;
      } else if (value !== condition) {
        return false;
      }
    }
    return true;
  }

  private sortData<T>(data: T[], sort: Array<{ field: string; direction: 'asc' | 'desc' }>): T[] {
    return [...data].sort((a: any, b: any) => {
      for (const { field, direction } of sort) {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
}

// Import map helper
import { map } from 'rxjs/operators';

// Singleton instance
export const uds = new UnifiedDataService();

// Export factory for testing
export function createDataService(): UnifiedDataService {
  return new UnifiedDataService();
}
