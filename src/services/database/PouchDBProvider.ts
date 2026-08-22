import { logger } from '@/utils/logging';

// ABOUTME: Enhanced PouchDB provider for network deployments with sync capabilities
// ABOUTME: Provides offline-first storage with remote synchronization, conflict resolution, and network optimization

import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
// Note: PouchDB replication is built-in, no separate import needed
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { map, filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';
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
  CollectionError,
  ITransaction
} from './interfaces';

// Add PouchDB plugins
PouchDB.plugin(PouchDBFind);
// Note: Replication and adapters are built into PouchDB, no plugin registration needed

// Network deployment specific interfaces
export interface NetworkConfig {
  remoteUrl?: string;
  syncOptions?: {
    live?: boolean;
    retry?: boolean;
    continuous?: boolean;
    heartbeat?: number;
    timeout?: number;
    batch_size?: number;
  };
  conflictResolution?: 'local' | 'remote' | 'manual';
  networkOptimization?: {
    enableCompression?: boolean;
    batchSize?: number;
    syncInterval?: number;
    offlineQueueSize?: number;
  };
}

export interface SyncStatus {
  isActive: boolean;
  direction: 'push' | 'pull' | 'bidirectional' | 'none';
  lastSync: Date | null;
  pendingChanges: number;
  conflicts: number;
  errors: string[];
}

// Enhanced PouchDB Collection Implementation with Network Features
export class PouchDBCollection<T extends { id?: string }> implements ICollection<T> {
  private changeSubject = new Subject<CollectionChangeEvent<T>>();
  private dataSubject = new BehaviorSubject<T[]>([]);
  private isDestroyed = false;
  private networkConfig: NetworkConfig;
  private syncStatus: SyncStatus;
  private offlineQueue: Array<{ operation: string; data: any; timestamp: Date }> = [];
  private isOnline = true;
  private retryAttempts = 0;
  private maxRetryAttempts = 3;
  private syncHandler: any;

  constructor(
    private db: PouchDB.Database,
    public readonly name: string,
    public readonly schema: CollectionSchema,
    networkConfig: NetworkConfig = {}
  ) {
    this.networkConfig = networkConfig;
    this.syncStatus = {
      isActive: false,
      direction: 'none',
      lastSync: null,
      pendingChanges: 0,
      conflicts: 0,
      errors: []
    };
    
    this.setupChangeListener();
    this.setupNetworkMonitoring();
    this.loadInitialData();
    
    // Initialize sync if remote URL is provided
    if (this.networkConfig.remoteUrl) {
      this.initializeSync();
    }
  }

  private setupChangeListener(): void {
    this.db.changes({
      since: 'now',
      live: true,
      include_docs: true
    }).on('change', (change) => {
      if (this.isDestroyed) return;
      
      if (!change.doc) return;
      
      const doc = change.doc as unknown as T;
      const eventType = change.deleted ? 'delete' : 
                       change.doc._rev?.startsWith('1-') ? 'insert' : 'update';
      
      this.changeSubject.next({
        type: eventType,
        doc,
        id: change.id
      });
      
      // Update data subject for reactive queries
      this.refreshDataSubject();
    }).on('error', (err) => {
      logger.error(`[PouchDBCollection] Change listener error in ${this.name}:`, err);
      this.syncStatus.errors.push(`Change listener error: ${err.message}`);
    });
  }

  private setupNetworkMonitoring(): void {
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        logger.info(`[PouchDBCollection] Network online for ${this.name}`);
        this.isOnline = true;
        this.processOfflineQueue();
        if (this.networkConfig.remoteUrl) {
          this.resumeSync();
        }
      });

      window.addEventListener('offline', () => {
        logger.info(`[PouchDBCollection] Network offline for ${this.name}`);
        this.isOnline = false;
        this.pauseSync();
      });

      this.isOnline = navigator.onLine;
    }
  }

  private async initializeSync(): Promise<void> {
    if (!this.networkConfig.remoteUrl || !this.isOnline) {
      return;
    }

    try {
      logger.info(`[PouchDBCollection] Initializing sync for ${this.name} with ${this.networkConfig.remoteUrl}`);
      
      const syncOptions = {
        live: true,
        retry: true,
        continuous: true,
        heartbeat: 10000,
        timeout: 30000,
        batch_size: 100,
        ...this.networkConfig.syncOptions
      };

      this.syncHandler = this.db.sync(this.networkConfig.remoteUrl, syncOptions)
        .on('change', (info: any) => {
          logger.info(`[PouchDBCollection] Sync change in ${this.name}:`, info);
          this.syncStatus.lastSync = new Date();
          this.syncStatus.pendingChanges = (info as any).pending || 0;
        })
        .on('paused', (err: any) => {
          if (err) {
            logger.error(`[PouchDBCollection] Sync paused with error in ${this.name}:`, err);
            this.syncStatus.errors.push(`Sync paused: ${err.message || String(err)}`);
          } else {
            logger.info(`[PouchDBCollection] Sync paused in ${this.name}`);
          }
          this.syncStatus.isActive = false;
        })
        .on('active', () => {
          logger.info(`[PouchDBCollection] Sync active in ${this.name}`);
          this.syncStatus.isActive = true;
          this.retryAttempts = 0;
        })
        .on('denied', (err: any) => {
          logger.error(`[PouchDBCollection] Sync denied in ${this.name}:`, err);
          this.syncStatus.errors.push(`Sync denied: ${err.message || String(err)}`);
        })
        .on('complete', (info) => {
          logger.info(`[PouchDBCollection] Sync complete in ${this.name}:`, info);
          this.syncStatus.isActive = false;
        })
        .on('error', (err: any) => {
          logger.error(`[PouchDBCollection] Sync error in ${this.name}:`, err);
          this.syncStatus.errors.push(`Sync error: ${err.message || String(err)}`);
          this.handleSyncError(err);
        });

      this.syncStatus.direction = 'bidirectional';
      logger.info(`[PouchDBCollection] Sync initialized for ${this.name}`);
    } catch (error: any) {
      logger.error(`[PouchDBCollection] Failed to initialize sync for ${this.name}:`, error);
      this.syncStatus.errors.push(`Sync initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private handleSyncError(error: any): void {
    this.retryAttempts++;
    
    if (this.retryAttempts < this.maxRetryAttempts) {
      const retryDelay = Math.pow(2, this.retryAttempts) * 1000; // Exponential backoff
      logger.info(`[PouchDBCollection] Retrying sync for ${this.name} in ${retryDelay}ms (attempt ${this.retryAttempts})`);
      
      setTimeout(() => {
        if (this.networkConfig.remoteUrl && this.isOnline) {
          this.initializeSync();
        }
      }, retryDelay);
    } else {
      logger.error(`[PouchDBCollection] Max retry attempts reached for ${this.name}`);
      this.syncStatus.errors.push('Max retry attempts reached');
    }
  }

  private pauseSync(): void {
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.syncStatus.isActive = false;
      logger.info(`[PouchDBCollection] Sync paused for ${this.name}`);
    }
  }

  private resumeSync(): void {
    if (this.networkConfig.remoteUrl && this.isOnline) {
      this.initializeSync();
      logger.info(`[PouchDBCollection] Sync resumed for ${this.name}`);
    }
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {
      return;
    }

    logger.info(`[PouchDBCollection] Processing ${this.offlineQueue.length} offline operations for ${this.name}`);
    
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const operation of queue) {
      try {
        switch (operation.operation) {
          case 'insert':
            await this.db.put(operation.data);
            break;
          case 'update':
            await this.db.put(operation.data);
            break;
          case 'delete':
            await this.db.remove(operation.data);
            break;
        }
        logger.info(`[PouchDBCollection] Processed offline ${operation.operation} for ${this.name}`);
      } catch (error: any) {
        logger.error(`[PouchDBCollection] Failed to process offline ${operation.operation} for ${this.name}:`, error);
        // Re-queue failed operations
        this.offlineQueue.push(operation);
      }
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      const result = await this.db.allDocs({ include_docs: true });
      const docs = result.rows
        .filter(row => row.doc && !row.id.startsWith('_design/'))
        .map(row => this.transformDoc(row.doc as any));
      this.dataSubject.next(docs);
    } catch (error: any) {
      logger.error(`Failed to load initial data for ${this.name}:`, error);
    }
  }

  private async refreshDataSubject(): Promise<void> {
    try {
      const docs = await this.find();
      this.dataSubject.next(docs);
    } catch (error: any) {
      logger.error(`Failed to refresh data subject for ${this.name}:`, error);
    }
  }

  private transformDoc(doc: any): T {
    if (!doc) return doc;
    
    // Transform PouchDB document to application format
    const transformed = { ...doc };
    if (doc._id) {
      transformed.id = doc._id;
      delete transformed._id;
    }
    delete transformed._rev;
    return transformed;
  }

  private transformToPouch(doc: Omit<T, 'id'> | Partial<T>): any {
    const pouchDoc = { ...doc } as any;
    if ('id' in doc && doc.id) {
      pouchDoc._id = String(doc.id);
      delete pouchDoc.id;
    }
    return pouchDoc;
  }

  // CRUD Operations with Network Support
  async insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>> {
    try {
      const pouchDoc = this.transformToPouch(doc);
      
      // If offline, queue the operation
      if (!this.isOnline) {
        this.offlineQueue.push({
          operation: 'insert',
          data: pouchDoc,
          timestamp: new Date()
        });
        
        logger.info(`[PouchDBCollection] Queued insert operation for ${this.name} (offline)`);
        
        // Return optimistic result
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
          id: tempId,
          rev: '1-temp',
          doc: { ...doc, id: tempId } as T,
          ok: true
        };
      }

      const result = await this.db.post(pouchDoc);
      
      const insertedDoc = {
        ...doc,
        id: result.id
      } as T;
      
      return {
        id: result.id,
        rev: result.rev,
        doc: insertedDoc,
        ok: result.ok
      };
    } catch (error: any) {
      // Handle conflicts with resolution strategy
      if (error?.name === 'conflict') {
        return this.handleConflict('insert', doc as any, error);
      }
      
      throw new CollectionError(
        `Failed to insert document in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async insertMany(docs: Omit<T, 'id'>[]): Promise<BulkResult<T>> {
    try {
      const pouchDocs = docs.map(doc => this.transformToPouch(doc));
      const result = await this.db.bulkDocs(pouchDocs);
      
      const insertResults: InsertResult<T>[] = [];
      const errors: Array<{ id: string; error: string; reason: string }> = [];
      
      result.forEach((res, index) => {
        if ('error' in res) {
          errors.push({
            id: String(res.id || `doc_${index}`),
            error: String(res.error || 'Unknown error'),
            reason: String(res.reason || 'Unknown reason')
          });
        } else {
          insertResults.push({
            id: String(res.id),
            rev: String(res.rev),
            doc: { ...docs[index], id: String(res.id) } as T,
            ok: Boolean((res as any).ok)
          });
        }
      });
      
      return { docs: insertResults, errors };
    } catch (error: any) {
      throw new CollectionError(
        `Failed to insert multiple documents in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const doc = await this.db.get(id);
      return this.transformDoc(doc);
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw new CollectionError(
        `Failed to find document by ID in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async find(query: QueryOptions = {}): Promise<T[]> {
    try {
      let result;
      
      if (query.selector) {
        // Use PouchDB-Find for complex queries
        result = await this.db.find({
          selector: query.selector,
          sort: query.sort,
          limit: query.limit,
          skip: query.skip,
          fields: query.fields
        });
        return result.docs.map(doc => this.transformDoc(doc));
      } else {
        // Use allDocs for simple queries
        const allDocsOptions: any = {
          include_docs: true
        };
        
        if (query.limit !== undefined) allDocsOptions.limit = query.limit;
        if (query.skip !== undefined) allDocsOptions.skip = query.skip;
        if (query.startkey !== undefined) allDocsOptions.startkey = query.startkey;
        if (query.endkey !== undefined) allDocsOptions.endkey = query.endkey;
        if (query.key !== undefined) allDocsOptions.key = query.key;
        if (query.keys !== undefined) allDocsOptions.keys = query.keys;
        
        result = await this.db.allDocs(allDocsOptions);
        
        return result.rows
          .filter(row => row.doc && !row.id.startsWith('_design/'))
          .map(row => this.transformDoc(row.doc));
      }
    } catch (error: any) {
      throw new CollectionError(
        `Failed to find documents in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async update(id: string, update: Partial<T>): Promise<UpdateResult<T>> {
    try {
      const existingDoc = await this.db.get(id);
      const updatedDoc = { ...existingDoc, ...this.transformToPouch(update) };
      const result = await this.db.put(updatedDoc);
      
      return {
        id: result.id,
        rev: result.rev,
        doc: this.transformDoc(updatedDoc),
        ok: result.ok
      };
    } catch (error: any) {
      throw new CollectionError(
        `Failed to update document in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async updateMany(query: QueryOptions, update: Partial<T>): Promise<UpdateResult<T>[]> {
    try {
      const docs = await this.find(query);
      const results: UpdateResult<T>[] = [];
      
      for (const doc of docs) {
        if (doc.id) {
          const result = await this.update(doc.id, update);
          results.push(result);
        }
      }
      
      return results;
    } catch (error: any) {
      throw new CollectionError(
        `Failed to update multiple documents in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async remove(id: string): Promise<DeleteResult> {
    try {
      const doc = await this.db.get(id);
      const result = await this.db.remove(doc);
      
      return {
        id: result.id,
        rev: result.rev,
        ok: result.ok,
        deleted: true
      };
    } catch (error: any) {
      throw new CollectionError(
        `Failed to remove document from ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async removeMany(query: QueryOptions): Promise<DeleteResult[]> {
    try {
      const docs = await this.find(query);
      const results: DeleteResult[] = [];
      
      for (const doc of docs) {
        if (doc.id) {
          const result = await this.remove(doc.id);
          results.push(result);
        }
      }
      
      return results;
    } catch (error: any) {
      throw new CollectionError(
        `Failed to remove multiple documents from ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  // Upsert operation (update or insert)
  async upsert(id: string, doc: Partial<T>): Promise<UpdateResult<T> | InsertResult<T>> {
    try {
      const existing = await this.findById(id);
      if (existing) {
        // Update existing document
        return await this.update(id, doc);
      } else {
        // Insert new document
        const docWithId = { ...doc, id } as Omit<T, 'id'>;
        return await this.insert(docWithId);
      }
    } catch (error: any) {
      throw new CollectionError(
        `Failed to upsert document in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  // RxDB Compatibility Aliases
  // These methods provide compatibility with RxDB-like API expectations
  
  /**
   * Alias for remove() to match RxDB API
   * @param id Document ID to delete
   */
  async delete(id: string): Promise<DeleteResult> {
    return this.remove(id);
  }

  /**
   * Enhanced findOne that accepts either ID string or query options
   * @param idOrQuery Either a document ID string or query options
   */
  async findOne(idOrQuery: string | QueryOptions): Promise<T | null> {
    if (typeof idOrQuery === 'string') {
      // If string, treat as ID and use findById
      return this.findById(idOrQuery);
    } else {
      // If object, use existing findOne with query options
      try {
        const results = await this.find({ ...idOrQuery, limit: 1 });
        return results.length > 0 ? results[0] : null;
      } catch (error: any) {
        throw new CollectionError(
          `Failed to find document in ${this.name}: ${error?.message || String(error)}`,
          this.name
        );
      }
    }
  }

  // Reactive Operations
  subscribe(query?: QueryOptions): Observable<T[]> {
    if (query) {
      // For specific queries, we need to filter the data stream
      return new Observable(subscriber => {
        const updateData = async () => {
          try {
            const data = await this.find(query);
            subscriber.next(data);
          } catch (error: any) {
            subscriber.error(error);
          }
        };
        
        // Initial data
        updateData();
        
        // Subscribe to changes
        const changeSubscription = this.changeSubject.subscribe(() => {
          updateData();
        });
        
        return () => changeSubscription.unsubscribe();
      });
    } else {
      // Return all data
      return this.dataSubject.asObservable();
    }
  }

  subscribeToChanges(): Observable<CollectionChangeEvent<T>> {
    return this.changeSubject.asObservable();
  }

  // Performance Operations
  async count(query?: QueryOptions): Promise<number> {
    try {
      if (query?.selector) {
        const result = await this.db.find({
          selector: query.selector,
          fields: ['_id']
        });
        return result.docs.length;
      } else {
        const result = await this.db.allDocs();
        return result.rows.filter(row => !row.id.startsWith('_design/')).length;
      }
    } catch (error: any) {
      throw new CollectionError(
        `Failed to count documents in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      await this.db.get(id);
      return true;
    } catch (error: any) {
      if (error?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async createIndex(index: IndexDefinition): Promise<void> {
    try {
      await this.db.createIndex({
        index: {
          fields: index.fields,
          name: index.name,
          ddoc: index.name
        }
      });
    } catch (error: any) {
      throw new CollectionError(
        `Failed to create index in ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  // Collection management
  async getStats(): Promise<CollectionStats> {
    try {
      const info = await this.db.info();
      const count = await this.count();
      
      return {
        name: this.name,
        documentCount: count,
        indexCount: 0, // PouchDB doesn't provide easy access to index count
        storageSize: (info as any).disk_size || 0,
        lastModified: new Date()
      };
    } catch (error: any) {
      throw new CollectionError(
        `Failed to get stats for ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async compact(): Promise<void> {
    try {
      await this.db.compact();
    } catch (error: any) {
      throw new CollectionError(
        `Failed to compact ${this.name}: ${error?.message || String(error)}`,
        this.name
      );
    }
  }

  async destroy(): Promise<void> {
    try {
      logger.info(`[PouchDBCollection] Destroying collection ${this.name}...`);
      
      this.isDestroyed = true;
      
      // Cancel sync
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      
      // Process any remaining offline queue
      if (this.offlineQueue.length > 0) {
        logger.info(`[PouchDBCollection] Processing ${this.offlineQueue.length} remaining offline operations`);
        await this.processOfflineQueue();
      }
      
      // Complete subjects
      this.changeSubject.complete();
      this.dataSubject.complete();
      
      await this.db.destroy();
      logger.info(`[PouchDBCollection] Collection ${this.name} destroyed successfully`);
    } catch (error: any) {
      logger.error(`[PouchDBCollection] Failed to destroy ${this.name}:`, error);
      throw new CollectionError(
        `Failed to destroy: ${error instanceof Error ? error.message : String(error)}`,
        this.name
      );
    }
  }

  // Network deployment specific methods

  /**
   * Handle document conflicts based on resolution strategy
   */
  private async handleConflict(operation: string, doc: any, error: any): Promise<any> {
    this.syncStatus.conflicts++;
    
    switch (this.networkConfig.conflictResolution) {
      case 'local':
        // Local wins - force update
        try {
          const docAny = doc as any;
          const existing = await this.db.get(docAny._id || docAny.id);
          docAny._rev = (existing as any)._rev;
          const result = await this.db.put(docAny);
          logger.info(`[PouchDBCollection] Conflict resolved (local wins) for ${this.name}`);
          return { id: result.id, rev: result.rev, doc: { ...docAny, id: result.id } as any, ok: result.ok };
        } catch (getError) {
          throw error; // Original conflict error
        }
        
      case 'remote':
        // Remote wins - fetch latest
        try {
          const docAny = doc as any;
          const latest = await this.db.get(docAny._id || docAny.id);
          logger.info(`[PouchDBCollection] Conflict resolved (remote wins) for ${this.name}`);
          return { id: (latest as any)._id, rev: (latest as any)._rev, doc: this.transformDoc(latest as any) as any, ok: true };
        } catch (getError) {
          throw error; // Original conflict error
        }
        
      case 'manual':
      default:
        // Manual resolution required
        logger.warn(`[PouchDBCollection] Manual conflict resolution required for ${this.name}`);
        throw new CollectionError(`Conflict requires manual resolution: ${error.message}`, this.name);
    }
  }

  /**
   * Get sync status information
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Force sync with remote database
   */
  async forceSync(): Promise<void> {
    if (!this.networkConfig.remoteUrl) {
      throw new CollectionError('No remote URL configured for sync', this.name);
    }

    if (!this.isOnline) {
      throw new CollectionError('Cannot sync while offline', this.name);
    }

    try {
      logger.info(`[PouchDBCollection] Force syncing ${this.name}`);
      
      const result = await this.db.sync(this.networkConfig.remoteUrl, {
        ...this.networkConfig.syncOptions,
        live: false,
        retry: false
      });
      
      this.syncStatus.lastSync = new Date();
      logger.info(`[PouchDBCollection] Force sync completed for ${this.name}:`, result);
    } catch (error: any) {
      logger.error(`[PouchDBCollection] Force sync failed for ${this.name}:`, error);
      throw new CollectionError(`Force sync failed: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  /**
   * Get offline queue status
   */
  getOfflineQueueStatus(): { count: number; operations: Array<{ operation: string; timestamp: Date }> } {
    return {
      count: this.offlineQueue.length,
      operations: this.offlineQueue.map(item => ({
        operation: item.operation,
        timestamp: item.timestamp
      }))
    };
  }

  /**
   * Clear offline queue (use with caution)
   */
  clearOfflineQueue(): void {
    const count = this.offlineQueue.length;
    this.offlineQueue = [];
    logger.info(`[PouchDBCollection] Cleared ${count} offline operations for ${this.name}`);
  }

  /**
   * Get network optimization statistics
   */
  getNetworkStats(): {
    isOnline: boolean;
    syncActive: boolean;
    lastSync: Date | null;
    pendingChanges: number;
    conflicts: number;
    offlineQueueSize: number;
    errors: string[];
  } {
    return {
      isOnline: this.isOnline,
      syncActive: this.syncStatus.isActive,
      lastSync: this.syncStatus.lastSync,
      pendingChanges: this.syncStatus.pendingChanges,
      conflicts: this.syncStatus.conflicts,
      offlineQueueSize: this.offlineQueue.length,
      errors: [...this.syncStatus.errors]
    };
  }
}

// Enhanced PouchDB Provider Implementation with Network Features
export class PouchDBProvider implements IDatabaseProvider {
  public readonly name = 'PouchDB';
  public readonly version = '8.0.0';
  
  private collections = new Map<string, ICollection<any>>();
  private config: DatabaseConfig | null = null;
  private networkConfig: NetworkConfig = {
    conflictResolution: 'manual',
    networkOptimization: {
      enableCompression: true,
      batchSize: 100,
      syncInterval: 30000,
      offlineQueueSize: 1000
    }
  };
  private isInitialized = false;
  private performanceStats = {
    avgQueryTime: 0,
    totalQueries: 0,
    memoryUsage: 0
  };
  private globalSyncStatus: { [collectionName: string]: SyncStatus } = {};

  async initialize(config: DatabaseConfig, networkConfig?: NetworkConfig): Promise<void> {
    try {
      this.config = config;
      this.networkConfig = networkConfig || {
        conflictResolution: 'manual',
        networkOptimization: {
          enableCompression: true,
          batchSize: 100,
          syncInterval: 30000,
          offlineQueueSize: 1000
        }
      };
      
      // Configure PouchDB defaults with network optimization
      PouchDB.defaults({
        auto_compaction: this.networkConfig.networkOptimization?.enableCompression ?? true,
        revs_limit: 10 // Limit revision history to save space
      });
      
      this.isInitialized = true;
      logger.info('[PouchDBProvider] Provider initialized successfully with network config:', this.networkConfig);
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize PouchDB provider: ${error instanceof Error ? error.message : String(error)}`,
        'INITIALIZATION_ERROR',
        this.name
      );
    }
  }

  async createCollection<T = any>(name: string, schema: CollectionSchema): Promise<ICollection<T>> {
    try {
      if (!this.isInitialized) {
        throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', this.name);
      }
      
      // Create PouchDB instance for this collection with network optimization
      const dbName = this.config?.name ? `${this.config.name}_${name}` : name;
      const db = new PouchDB(dbName, {
        adapter: 'idb', // Use IndexedDB adapter
        auto_compaction: this.networkConfig.networkOptimization?.enableCompression || false,
        revs_limit: 10 // Limit revision history for network efficiency
      });
      
      // Collection-specific network config
      const collectionNetworkConfig = {
        ...this.networkConfig,
        remoteUrl: this.networkConfig.remoteUrl ? `${this.networkConfig.remoteUrl}/${name}` : undefined
      };
      
      // Create collection wrapper with network config
      const collection = new PouchDBCollection<T & { id?: string }>(db, name, schema, collectionNetworkConfig);
      this.collections.set(name, collection);
      
      // Initialize sync status tracking
      this.globalSyncStatus[name] = {
        isActive: false,
        direction: 'none',
        lastSync: null,
        pendingChanges: 0,
        conflicts: 0,
        errors: []
      };
      
      logger.info(`[PouchDBProvider] Collection '${name}' created successfully with network config`);
      return collection;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create collection '${name}': ${error instanceof Error ? error.message : String(error)}`,
        'COLLECTION_CREATION_ERROR',
        this.name,
        name
      );
    }
  }

  getCollection<T>(name: string): ICollection<T> | null {
    return this.collections.get(name) || null;
  }

  getAllCollections(): Map<string, ICollection<any>> {
    return new Map(this.collections);
  }

  async destroy(): Promise<void> {
    try {
      // Destroy all collections
      for (const [name, collection] of this.collections) {
        try {
          await collection.destroy();
        } catch (error: any) {
          logger.error(`Failed to destroy collection '${name}':`, error);
        }
      }
      
      this.collections.clear();
      this.isInitialized = false;
      logger.info('PouchDB Provider destroyed successfully');
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to destroy PouchDB provider: ${error?.message || String(error)}`,
        'DESTRUCTION_ERROR',
        this.name
      );
    }
  }

  async transaction<TResult>(callback: (tx: ITransaction) => Promise<TResult>): Promise<TResult> {
    if (!this.isInitialized) {
      throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', this.name);
    }

    logger.warn('[PouchDBProvider] Native ACID transactions are not fully supported by PouchDB. Executing in best-effort simulated mode.');
    
    const txId = `tx-pouch-${Date.now()}`;
    const tx: ITransaction = {
      id: txId,
      commit: async () => {
        logger.info(`[PouchDBProvider] Simulated transaction ${txId} committed.`);
      },
      rollback: async () => {
        logger.warn(`[PouchDBProvider] Simulated transaction ${txId} rollback requested, but PouchDB does not support automatic rollback.`);
      }
    };

    try {
      const result = await callback(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  isAvailable(): boolean {
    // Check if the environment supports PouchDB (IndexedDB availability)
    // Don't check isInitialized here as this method is called before initialization
    return typeof window !== 'undefined' && !!window.indexedDB;
  }

  getStatus(): ProviderStatus {
    return {
      name: this.name,
      version: this.version,
      isConnected: this.isInitialized,
      collectionsCount: this.collections.size,
      performance: { ...this.performanceStats }
    };
  }

  // Network deployment specific methods

  /**
   * Configure network settings for all collections
   */
  configureNetwork(networkConfig: NetworkConfig): void {
    this.networkConfig = { ...this.networkConfig, ...networkConfig };
    logger.info('[PouchDBProvider] Network configuration updated:', this.networkConfig);
  }

  /**
   * Get global sync status for all collections
   */
  getGlobalSyncStatus(): { [collectionName: string]: SyncStatus } {
    const status: { [collectionName: string]: SyncStatus } = {};
    
    for (const [name, collection] of this.collections) {
      status[name] = (collection as any).getSyncStatus();
    }
    
    return status;
  }

  /**
   * Force sync all collections
   */
  async syncAllCollections(): Promise<{ [collectionName: string]: { success: boolean; error?: string } }> {
    const results: { [collectionName: string]: { success: boolean; error?: string } } = {};
    
    logger.info('[PouchDBProvider] Syncing all collections...');
    
    for (const [name, collection] of this.collections) {
      try {
        await (collection as any).forceSync();
        results[name] = { success: true };
        logger.info(`[PouchDBProvider] Successfully synced collection: ${name}`);
      } catch (error: any) {
        results[name] = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
        logger.error(`[PouchDBProvider] Failed to sync collection ${name}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get network statistics for all collections
   */
  getNetworkStatistics(): {
    totalCollections: number;
    onlineCollections: number;
    activeSyncs: number;
    totalConflicts: number;
    totalOfflineOperations: number;
    lastSyncTimes: { [collectionName: string]: Date | null };
  } {
    let onlineCollections = 0;
    let activeSyncs = 0;
    let totalConflicts = 0;
    let totalOfflineOperations = 0;
    const lastSyncTimes: { [collectionName: string]: Date | null } = {};
    
    for (const [name, collection] of this.collections) {
      const stats = (collection as any).getNetworkStats();
      
      if (stats.isOnline) onlineCollections++;
      if (stats.syncActive) activeSyncs++;
      totalConflicts += stats.conflicts;
      totalOfflineOperations += stats.offlineQueueSize;
      lastSyncTimes[name] = stats.lastSync;
    }
    
    return {
      totalCollections: this.collections.size,
      onlineCollections,
      activeSyncs,
      totalConflicts,
      totalOfflineOperations,
      lastSyncTimes
    };
  }

  /**
   * Handle network reconnection
   */
  async handleNetworkReconnection(): Promise<void> {
    logger.info('[PouchDBProvider] Handling network reconnection...');
    
    for (const [name, collection] of this.collections) {
      try {
        // Process offline queue
        await (collection as any).processOfflineQueue();
        
        // Resume sync if configured
        if (this.networkConfig.remoteUrl) {
          await (collection as any).resumeSync();
        }
        
        logger.info(`[PouchDBProvider] Reconnection handled for collection: ${name}`);
      } catch (error: any) {
        logger.error(`[PouchDBProvider] Failed to handle reconnection for ${name}:`, error);
      }
    }
  }

  /**
   * Optimize network performance
   */
  async optimizeNetworkPerformance(): Promise<void> {
    logger.info('[PouchDBProvider] Optimizing network performance...');
    
    for (const [name, collection] of this.collections) {
      try {
        // Compact database to reduce size
        await collection.compact();
        
        // Clear old offline operations
        const queueStatus = (collection as any).getOfflineQueueStatus();
        if (queueStatus.count > (this.networkConfig.networkOptimization?.offlineQueueSize || 1000)) {
          logger.warn(`[PouchDBProvider] Large offline queue detected for ${name}: ${queueStatus.count} operations`);
        }
        
        logger.info(`[PouchDBProvider] Performance optimized for collection: ${name}`);
      } catch (error: any) {
        logger.error(`[PouchDBProvider] Failed to optimize performance for ${name}:`, error);
      }
    }
  }

  async backup(): Promise<string> {
    try {
      const backupData: Record<string, any[]> = {};
      
      for (const [name, collection] of this.collections) {
        const docs = await collection.find();
        backupData[name] = docs;
      }
      
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        provider: this.name,
        version: this.version,
        networkConfig: this.networkConfig,
        syncStatus: this.globalSyncStatus,
        collections: backupData
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
        'BACKUP_ERROR',
        this.name
      );
    }
  }

  async restore(backupData: string): Promise<void> {
    try {
      const backup = JSON.parse(backupData);
      
      if (backup.provider !== this.name) {
        throw new Error(`Backup was created with ${backup.provider}, not ${this.name}`);
      }
      
      for (const [collectionName, docs] of Object.entries(backup.collections)) {
        const collection = this.getCollection(collectionName);
        if (collection && Array.isArray(docs)) {
          // Clear existing data
          const existingDocs = await collection.find();
          for (const doc of existingDocs) {
            if ((doc as any).id) {
              await collection.remove((doc as any).id);
            }
          }
          
          // Insert backup data
          if (docs.length > 0) {
            await collection.insertMany(docs as any[]);
          }
        }
      }
      
      logger.info('PouchDB backup restored successfully');
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to restore backup: ${error?.message || String(error)}`,
        'RESTORE_ERROR',
        this.name
      );
    }
  }
}