/**
 * HybridProvider - Composes BackendAPIProvider with local cache for offline-first architecture
 *
 * Reads from local cache by default, writes to both cache and backend.
 * Automatically syncs when online, queues operations when offline.
 * Falls back to backend API when cache is unavailable.
 *
 * Requirements: 3.1-3.8, 4.1-4.5
 */

import { Observable, Subject, BehaviorSubject } from 'rxjs';
import {
  IDatabaseProvider,
  ICollection,
  DatabaseConfig,
  CollectionSchema,
  QueryOptions,
  InsertResult,
  UpdateResult,
  DeleteResult,
  BulkResult,
  CollectionChangeEvent,
  ProviderStatus,
  CollectionStats,
  IndexDefinition,
  DatabaseError,
  ITransaction,
} from './interfaces';
import { BackendAPIProvider, BackendAPIConfig } from './BackendAPIProvider';
import { DatabaseProviderFactory, getDatabaseProviderFactory, ProviderType } from './DatabaseProviderFactory';
import { OfflineQueue } from './sync/OfflineQueue';
import { SyncManager, SyncCacheProvider, SyncBackendProvider } from './sync/SyncManager';
import { NetworkMonitor } from './sync/NetworkMonitor';

export interface HybridProviderConfig extends DatabaseConfig {
  backendConfig: BackendAPIConfig;
  cacheProviderType?: 'sqlite-wasm' | 'pouchdb' | 'rxdb';
  syncDirection?: 'push' | 'pull' | 'bidirectional';
  enableOfflineQueue?: boolean;
  cacheFirst?: boolean; // If true, reads from cache first; falls back to backend
}

/**
 * HybridCollection - Wraps cache collection and syncs with backend
 */
class HybridCollection<T> implements ICollection<T> {
  private changeSubject = new Subject<CollectionChangeEvent<T>>();
  private dataSubject = new BehaviorSubject<T[]>([]);
  private isDestroyed = false;

  constructor(
    public readonly name: string,
    public readonly schema: CollectionSchema,
    private cacheCollection: ICollection<T>,
    private backendCollection: ICollection<T> | null,
    private offlineQueue: OfflineQueue | null,
    private networkMonitor: NetworkMonitor,
    private cacheFirst: boolean,
    private syncManager: SyncManager | null,
  ) {
    // Subscribe to cache changes and emit them
    this.cacheCollection.subscribeToChanges().subscribe({
      next: (event) => {
        this.changeSubject.next(event);
      },
    });
  }

  async insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>> {
    // Insert into cache first for immediate response
    const cacheResult = await this.cacheCollection.insert(doc);

    // If online, also insert into backend
    if (this.networkMonitor.isOnline() && this.backendCollection) {
      try {
        await this.backendCollection.insert(doc);
      } catch (error) {
        console.warn(`[HybridCollection] Backend insert failed for ${this.name}, queuing:`, error);
        if (this.offlineQueue) {
          await this.offlineQueue.enqueue({
            operation: 'create',
            collection: this.name,
            data: { ...doc, id: cacheResult.id },
          });
        }
      }
    } else if (this.offlineQueue) {
      // Queue for later sync
      await this.offlineQueue.enqueue({
        operation: 'create',
        collection: this.name,
        data: { ...doc, id: cacheResult.id },
      });
    }

    return cacheResult;
  }

  async insertMany(docs: Omit<T, 'id'>[]): Promise<BulkResult<T>> {
    const cacheResult = await this.cacheCollection.insertMany(docs);

    if (this.networkMonitor.isOnline() && this.backendCollection) {
      try {
        await this.backendCollection.insertMany(docs);
      } catch (error) {
        console.warn(`[HybridCollection] Backend insertMany failed for ${this.name}, queuing:`, error);
        if (this.offlineQueue) {
          for (const doc of cacheResult.docs) {
            await this.offlineQueue.enqueue({
              operation: 'create',
              collection: this.name,
              data: doc.doc,
            });
          }
        }
      }
    } else if (this.offlineQueue) {
      for (const doc of cacheResult.docs) {
        await this.offlineQueue.enqueue({
          operation: 'create',
          collection: this.name,
          data: doc.doc,
        });
      }
    }

    return cacheResult;
  }

  async findOne(idOrQuery: string | QueryOptions): Promise<T | null> {
    // Cache-first read
    if (this.cacheFirst) {
      try {
        const result = await this.cacheCollection.findOne(idOrQuery);
        if (result !== null) return result;
      } catch (error) {
        console.warn(`[HybridCollection] Cache findOne failed for ${this.name}, falling back:`, error);
      }
    }

    // Fall back to backend
    if (this.backendCollection) {
      return await this.backendCollection.findOne(idOrQuery);
    }

    return null;
  }

  async findById(id: string): Promise<T | null> {
    if (this.cacheFirst) {
      try {
        const result = await this.cacheCollection.findById(id);
        if (result !== null) return result;
      } catch (error) {
        console.warn(`[HybridCollection] Cache findById failed for ${this.name}, falling back:`, error);
      }
    }

    if (this.backendCollection) {
      return await this.backendCollection.findById(id);
    }

    return null;
  }

  async find(query?: QueryOptions): Promise<T[]> {
    if (this.cacheFirst) {
      try {
        return await this.cacheCollection.find(query);
      } catch (error) {
        console.warn(`[HybridCollection] Cache find failed for ${this.name}, falling back:`, error);
      }
    }

    if (this.backendCollection) {
      return await this.backendCollection.find(query);
    }

    return [];
  }

  async update(id: string, update: Partial<T>): Promise<UpdateResult<T>> {
    const cacheResult = await this.cacheCollection.update(id, update);

    if (this.networkMonitor.isOnline() && this.backendCollection) {
      try {
        await this.backendCollection.update(id, update);
      } catch (error) {
        console.warn(`[HybridCollection] Backend update failed for ${this.name}, queuing:`, error);
        if (this.offlineQueue) {
          await this.offlineQueue.enqueue({
            operation: 'update',
            collection: this.name,
            data: { id, ...update },
          });
        }
      }
    } else if (this.offlineQueue) {
      await this.offlineQueue.enqueue({
        operation: 'update',
        collection: this.name,
        data: { id, ...update },
      });
    }

    return cacheResult;
  }

  async updateMany(query: QueryOptions, update: Partial<T>): Promise<UpdateResult<T>[]> {
    const cacheResult = await this.cacheCollection.updateMany(query, update);

    if (this.networkMonitor.isOnline() && this.backendCollection) {
      try {
        await this.backendCollection.updateMany(query, update);
      } catch (error) {
        console.warn(`[HybridCollection] Backend updateMany failed for ${this.name}:`, error);
      }
    }

    return cacheResult;
  }

  async remove(id: string): Promise<DeleteResult> {
    const cacheResult = await this.cacheCollection.remove(id);

    if (this.networkMonitor.isOnline() && this.backendCollection) {
      try {
        await this.backendCollection.remove(id);
      } catch (error) {
        console.warn(`[HybridCollection] Backend remove failed for ${this.name}, queuing:`, error);
        if (this.offlineQueue) {
          await this.offlineQueue.enqueue({
            operation: 'delete',
            collection: this.name,
            data: { id },
          });
        }
      }
    } else if (this.offlineQueue) {
      await this.offlineQueue.enqueue({
        operation: 'delete',
        collection: this.name,
        data: { id },
      });
    }

    return cacheResult;
  }

  async removeMany(query: QueryOptions): Promise<DeleteResult[]> {
    const cacheResult = await this.cacheCollection.removeMany(query);

    if (this.networkMonitor.isOnline() && this.backendCollection) {
      try {
        await this.backendCollection.removeMany(query);
      } catch (error) {
        console.warn(`[HybridCollection] Backend removeMany failed for ${this.name}:`, error);
      }
    }

    return cacheResult;
  }

  subscribe(query?: QueryOptions): Observable<T[]> {
    return this.cacheCollection.subscribe(query);
  }

  subscribeToChanges(): Observable<CollectionChangeEvent<T>> {
    return this.changeSubject.asObservable();
  }

  async count(query?: QueryOptions): Promise<number> {
    try {
      return await this.cacheCollection.count(query);
    } catch (error) {
      console.warn(`[HybridCollection] Cache count failed for ${this.name}, falling back:`, error);
      if (this.backendCollection) {
        return await this.backendCollection.count(query);
      }
      return 0;
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      return await this.cacheCollection.exists(id);
    } catch (error) {
      console.warn(`[HybridCollection] Cache exists failed for ${this.name}, falling back:`, error);
      if (this.backendCollection) {
        return await this.backendCollection.exists(id);
      }
      return false;
    }
  }

  async createIndex(index: IndexDefinition): Promise<void> {
    await this.cacheCollection.createIndex(index);
    if (this.backendCollection) {
      try {
        await this.backendCollection.createIndex(index);
      } catch {
        // Backend may not support index creation
      }
    }
  }

  async getStats(): Promise<CollectionStats> {
    return await this.cacheCollection.getStats();
  }

  async compact(): Promise<void> {
    await this.cacheCollection.compact();
  }

  async destroy(): Promise<void> {
    this.isDestroyed = true;
    this.changeSubject.complete();
    this.dataSubject.complete();
    await this.cacheCollection.destroy();
  }
}

/**
 * HybridProvider - Backend API + local cache with offline-first support
 */
export class HybridProvider implements IDatabaseProvider {
  public readonly name = 'Hybrid';
  public readonly version = '1.0.0';

  private backendProvider: BackendAPIProvider | null = null;
  private cacheProvider: IDatabaseProvider | null = null;
  private collections = new Map<string, HybridCollection<any>>();
  private config: HybridProviderConfig | null = null;
  private isInitialized = false;
  private offlineQueue: OfflineQueue | null = null;
  private syncManager: SyncManager | null = null;
  private networkMonitor: NetworkMonitor;
  private cacheProviderFactory: DatabaseProviderFactory;

  constructor() {
    this.networkMonitor = NetworkMonitor.getInstance();
    this.cacheProviderFactory = getDatabaseProviderFactory();
  }

  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      const hybridConfig = config as HybridProviderConfig;
      this.config = hybridConfig;

      console.log('[HybridProvider] Initializing HybridProvider...');

      // Initialize backend provider
      this.backendProvider = new BackendAPIProvider();
      await this.backendProvider.initialize(hybridConfig.backendConfig);
      console.log('[HybridProvider] Backend provider initialized');

      // Initialize cache provider
      const cacheProviderType = hybridConfig.cacheProviderType || 'sqlite-wasm';
      console.log(`[HybridProvider] Initializing cache provider: ${cacheProviderType}`);

      const cacheConfig: DatabaseConfig = {
        name: `${hybridConfig.name}_cache`,
        version: hybridConfig.version,
        autoCompaction: hybridConfig.autoCompaction,
        debug: hybridConfig.debug,
      };

      this.cacheProvider = await this.cacheProviderFactory.createProvider(cacheConfig, {
        collectionsCount: 0,
        requiresOffline: true,
        requiresSync: true,
        requiresReactivity: true,
        performanceLevel: 'high',
        storageQuota: 200 * 1024 * 1024, // 200MB
      });
      console.log(`[HybridProvider] Cache provider initialized: ${this.cacheProvider.name}`);

      // Initialize offline queue if enabled
      if (hybridConfig.enableOfflineQueue !== false) {
        this.offlineQueue = await OfflineQueue.getInstance();
        console.log('[HybridProvider] Offline queue initialized');
      }

      // Initialize sync manager if both providers are available
      if (this.cacheProvider && this.backendProvider) {
        const syncBackend: SyncBackendProvider = {
          fetch: async (url, init) => {
            // Delegate to backend provider's internal fetch/collection methods
            return fetch(url, init);
          },
          isOnline: () => this.networkMonitor.isOnline,
        };

        const syncCache: SyncCacheProvider = {
          getAll: async (collection: string) => {
            const col = this.cacheProvider?.getCollection(collection);
            if (!col) return [];
            return await col.find();
          },
          put: async (collection: string, doc: any) => {
            const col = this.cacheProvider?.getCollection(collection);
            if (!col) return;
            if (doc.id) {
              await col.update(doc.id, doc);
            } else {
              await col.insert(doc);
            }
          },
          remove: async (collection: string, id: string) => {
            const col = this.cacheProvider?.getCollection(collection);
            if (!col) return;
            await col.remove(id);
          },
        };

        this.syncManager = new SyncManager(syncBackend, syncCache, {
          direction: (hybridConfig.syncDirection as 'push' | 'pull' | 'bidirectional') || 'bidirectional',
          syncInterval: hybridConfig.backendConfig.syncInterval || 30000,
          batchSize: hybridConfig.backendConfig.batchSize || 100,
        });

        console.log('[HybridProvider] Sync manager initialized');
      }

      this.isInitialized = true;
      console.log('[HybridProvider] HybridProvider initialized successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize Hybrid provider: ${error instanceof Error ? error.message : String(error)}`,
        'INITIALIZATION_ERROR',
        this.name,
      );
    }
  }

  async createCollection<T = any>(name: string, schema: CollectionSchema): Promise<ICollection<T>> {
    if (!this.isInitialized || !this.config) {
      throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', this.name);
    }

    try {
      // Create cache collection
      const cacheCollection = await this.cacheProvider!.createCollection<T>(name, schema);

      // Create backend collection
      let backendCollection: ICollection<T> | null = null;
      try {
        backendCollection = await this.backendProvider!.createCollection<T>(name, schema);
      } catch (error) {
        console.warn(`[HybridProvider] Failed to create backend collection ${name}, using cache only:`, error);
      }

      // Wrap in HybridCollection
      const hybridCollection = new HybridCollection<T>(
        name,
        schema,
        cacheCollection,
        backendCollection,
        this.offlineQueue,
        this.networkMonitor,
        this.config.cacheFirst !== false,
        this.syncManager,
      );

      this.collections.set(name, hybridCollection);
      console.log(`[HybridProvider] Created hybrid collection: ${name}`);

      return hybridCollection;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create hybrid collection ${name}: ${error instanceof Error ? error.message : String(error)}`,
        'COLLECTION_CREATION_ERROR',
        this.name,
      );
    }
  }

  getCollection<T = any>(name: string): ICollection<T> | null {
    return this.collections.get(name) || null;
  }

  getAllCollections(): Map<string, ICollection<any>> {
    return new Map(this.collections);
  }

  isAvailable(): boolean {
    return this.isInitialized && (this.cacheProvider?.isAvailable() === true || this.backendProvider?.isAvailable() === true);
  }

  getStatus(): ProviderStatus {
    const cacheStatus = this.cacheProvider?.getStatus();
    const backendStatus = this.backendProvider?.getStatus();

    return {
      name: this.name,
      version: this.version,
      isConnected: this.isInitialized,
      collectionsCount: this.collections.size,
      performance: {
        avgQueryTime: cacheStatus?.performance.avgQueryTime ?? 0,
        totalQueries: (cacheStatus?.performance.totalQueries ?? 0) + (backendStatus?.performance.totalQueries ?? 0),
        memoryUsage: (cacheStatus?.performance.memoryUsage ?? 0) + (backendStatus?.performance.memoryUsage ?? 0),
      },
    };
  }

  async backup(): Promise<string> {
    if (!this.isInitialized) {
      throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', this.name);
    }

    // Backup both cache and backend
    const cacheBackup = await this.cacheProvider?.backup() || '';
    const backendBackup = await this.backendProvider?.backup() || '';

    return JSON.stringify({
      cache: cacheBackup,
      backend: backendBackup,
      timestamp: new Date().toISOString(),
    });
  }

  async restore(backupData: string): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', this.name);
    }

    const backup = JSON.parse(backupData);

    if (backup.cache && this.cacheProvider) {
      await this.cacheProvider.restore(backup.cache);
    }

    if (backup.backend && this.backendProvider) {
      await this.backendProvider.restore(backup.backend);
    }
  }

  async destroy(): Promise<void> {
    // Stop sync manager
    if (this.syncManager) {
      this.syncManager.stop();
    }

    // Destroy providers
    if (this.cacheProvider) {
      await this.cacheProvider.destroy();
    }
    if (this.backendProvider) {
      await this.backendProvider.destroy();
    }

    this.collections.clear();
    this.isInitialized = false;

    console.log('[HybridProvider] Destroyed');
  }

  /**
   * Get the cache provider instance
   */
  getCacheProvider(): IDatabaseProvider | null {
    return this.cacheProvider;
  }

  /**
   * Get the backend provider instance
   */
  getBackendProvider(): BackendAPIProvider | null {
    return this.backendProvider;
  }

  /**
   * Get the sync manager
   */
  getSyncManager(): SyncManager | null {
    return this.syncManager;
  }

  /**
   * Get the offline queue
   */
  getOfflineQueue(): OfflineQueue | null {
    return this.offlineQueue;
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(direction?: 'push' | 'pull' | 'bidirectional'): Promise<void> {
    if (!this.syncManager) {
      throw new DatabaseError('Sync manager not initialized', 'SYNC_NOT_INITIALIZED', this.name);
    }
    await this.syncManager.sync(direction);
  }

  /**
   * Process queued offline operations
   */
  async processOfflineQueue(): Promise<void> {
    if (!this.offlineQueue) {
      console.log('[HybridProvider] Offline queue not initialized');
      return;
    }
    await this.offlineQueue.process();
  }
}
