/**
 * PouchDB Provider
 * 
 * Implementation of DataProvider using PouchDB with CouchDB sync protocol.
 * Designed for networked and SaaS deployment modes with real-time synchronization.
 * 
 * Features:
 * - Offline-first architecture
 * - Automatic sync with remote CouchDB
 * - Conflict detection and resolution
 * - Real-time change feed
 * - Full-text search via pouchdb-quick-search
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, fromEventPattern } from 'rxjs';
import type {
  DataProvider,
  ProviderCapabilities,
  Query,
  PaginatedResult,
  WriteOptions,
  Operation,
  Filter,
  SyncResult,
  Change,
  SyncConflict
} from '../types';

// PouchDB will be imported dynamically to avoid SSR issues
interface PouchDBInstance {
  put(doc: any): Promise<any>;
  get(id: string): Promise<any>;
  remove(doc: any): Promise<any>;
  find(query: any): Promise<{ docs: any[] }>;
  allDocs(options?: any): Promise<{ rows: any[] }>;
  changes(options?: any): any;
  replicate: {
    to(url: string, options?: any): any;
    from(url: string, options?: any): any;
    sync(url: string, options?: any): any;
  };
  createIndex(options: any): Promise<any>;
  info(): Promise<any>;
}

interface PouchDBConfig {
  localDbName?: string;
  remoteUrl?: string;
  syncOptions?: {
    live?: boolean;
    retry?: boolean;
    batch_size?: number;
  };
  auth?: {
    username: string;
    password: string;
  };
}

export class PouchDBProvider implements DataProvider {
  readonly name = 'pouchdb';
  readonly version = '1.0.0';
  readonly capabilities: ProviderCapabilities = {
    realtime: true,
    sync: true,
    transactions: false,  // PouchDB doesn't support ACID transactions
    offline: true,
    encryption: false,
    fullTextSearch: true,
    relations: false
  };

  private localDb: PouchDBInstance | null = null;
  private remoteDb: PouchDBInstance | null = null;
  private syncHandler: any = null;
  private config: PouchDBConfig = {};
  private PouchDB: any = null;

  // Observable for real-time changes
  private changeSubject = new BehaviorSubject<Change | null>(null);
  public changes$ = this.changeSubject.asObservable();

  // Sync status
  private syncStatus = new BehaviorSubject<'idle' | 'syncing' | 'error'>('idle');
  public syncStatus$ = this.syncStatus.asObservable();

  // Pending changes queue (for offline support)
  private pendingChanges: Change[] = [];

  async initialize(config: PouchDBConfig): Promise<void> {
    this.config = {
      localDbName: 'schoolpilot_local',
      syncOptions: {
        live: true,
        retry: true,
        batch_size: 100
      },
      ...config
    };

    try {
      // Dynamically import PouchDB
      const pouchModule = await import('pouchdb-browser');
      this.PouchDB = pouchModule.default;

      // Import find plugin for Mango queries
      const findPlugin = await import('pouchdb-find');
      this.PouchDB.plugin(findPlugin.default);

      // Initialize local database
      this.localDb = new this.PouchDB(this.config.localDbName!);

      // Initialize remote database if URL provided
      if (this.config.remoteUrl) {
        const remoteOptions: any = {};
        if (this.config.auth) {
          remoteOptions.auth = this.config.auth;
        }
        this.remoteDb = new this.PouchDB(this.config.remoteUrl, remoteOptions);

        // Set up sync
        await this.setupSync();
      }

      // Create indexes for common queries
      await this.createIndexes();

      console.log('✅ PouchDBProvider initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize PouchDBProvider:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (this.syncHandler) {
      this.syncHandler.cancel();
    }

    if (this.localDb) {
      await this.localDb.close?.();
    }

    if (this.remoteDb) {
      await this.remoteDb.close?.();
    }

    this.changeSubject.complete();
    this.syncStatus.complete();
  }

  // ==================== CRUD Operations ====================

  async find<T>(collection: string, query: Query): Promise<PaginatedResult<T>> {
    this.ensureInitialized();

    // Build Mango query
    const selector: any = {
      _collection: collection,
      ...this.buildSelector(query.filter)
    };

    const mangoQuery: any = {
      selector,
      limit: query.pagination?.pageSize || 50,
      skip: ((query.pagination?.page || 1) - 1) * (query.pagination?.pageSize || 50)
    };

    if (query.sort && query.sort.length > 0) {
      mangoQuery.sort = query.sort.map(s => ({ [s.field]: s.direction }));
    }

    const result = await this.localDb!.find(mangoQuery);

    // Get total count (PouchDB doesn't give this easily, so we estimate)
    const countResult = await this.localDb!.find({
      selector: { _collection: collection },
      limit: 10000  // Reasonable upper limit
    });
    const totalCount = countResult.docs.length;

    // Transform and return
    const data = result.docs.map(doc => this.transformDoc(doc));

    return {
      data,
      pagination: {
        page: query.pagination?.page || 1,
        pageSize: mangoQuery.limit,
        totalCount,
        totalPages: Math.ceil(totalCount / mangoQuery.limit),
        hasNextPage: mangoQuery.skip + result.docs.length < totalCount,
        hasPreviousPage: mangoQuery.skip > 0
      }
    };
  }

  async findOne<T>(collection: string, id: string): Promise<T | null> {
    this.ensureInitialized();

    try {
      const doc = await this.localDb!.get(`${collection}:${id}`);
      return this.transformDoc(doc);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async findByIds<T>(collection: string, ids: string[]): Promise<T[]> {
    this.ensureInitialized();

    const docIds = ids.map(id => `${collection}:${id}`);
    
    const result = await this.localDb!.allDocs({
      keys: docIds,
      include_docs: true
    });

    return result.rows
      .filter((row: any) => row.doc && !row.error)
      .map((row: any) => this.transformDoc(row.doc));
  }

  async create<T>(collection: string, data: any, options?: WriteOptions): Promise<T> {
    this.ensureInitialized();

    const id = data.id || this.generateId();
    const timestamp = new Date().toISOString();

    const doc = {
      _id: `${collection}:${id}`,
      _collection: collection,
      ...data,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1
    };

    // Remove 'id' from top level to avoid duplication
    delete doc.id;

    const result = await this.localDb!.put(doc);

    // Return created document
    const created = await this.localDb!.get(result.id);
    const transformed = this.transformDoc(created);

    // Notify observers
    this.changeSubject.next({
      id: `${collection}:${id}`,
      collection,
      type: 'create',
      timestamp: Date.now(),
      data: transformed
    });

    return transformed;
  }

  async update<T>(collection: string, id: string, data: any, options?: WriteOptions): Promise<T> {
    this.ensureInitialized();

    const docId = `${collection}:${id}`;
    
    // Get current revision
    let doc;
    try {
      doc = await this.localDb!.get(docId);
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Record ${id} not found in ${collection}`);
      }
      throw error;
    }

    const timestamp = new Date().toISOString();

    // Update document
    const updated = {
      ...doc,
      ...data,
      _id: docId,
      _collection: collection,
      updatedAt: timestamp,
      version: (doc.version || 0) + 1
    };

    await this.localDb!.put(updated);

    // Get updated document
    const result = await this.localDb!.get(docId);
    const transformed = this.transformDoc(result);

    // Notify observers
    this.changeSubject.next({
      id: `${collection}:${id}`,
      collection,
      type: 'update',
      timestamp: Date.now(),
      data: transformed
    });

    return transformed;
  }

  async delete(collection: string, id: string, options?: WriteOptions): Promise<void> {
    this.ensureInitialized();

    const docId = `${collection}:${id}`;
    
    try {
      const doc = await this.localDb!.get(docId);
      await this.localDb!.remove(doc);

      // Notify observers
      this.changeSubject.next({
        id: `${collection}:${id}`,
        collection,
        type: 'delete',
        timestamp: Date.now(),
        data: null
      });
    } catch (error: any) {
      if (error.status !== 404) {
        throw error;
      }
    }
  }

  // ==================== Real-time Subscriptions ====================

  subscribe<T>(collection: string, query: Query): Observable<T[]> {
    return new Observable(subscriber => {
      // Initial fetch
      this.find<T>(collection, query).then(result => {
        subscriber.next(result.data);
      });

      // Subscribe to changes
      const subscription = this.changes$.subscribe(change => {
        if (change?.collection === collection) {
          // Refetch to get updated results
          this.find<T>(collection, query).then(result => {
            subscriber.next(result.data);
          });
        }
      });

      return () => subscription.unsubscribe();
    });
  }

  subscribeOne<T>(collection: string, id: string): Observable<T | null> {
    return new Observable(subscriber => {
      // Initial fetch
      this.findOne<T>(collection, id).then(result => {
        subscriber.next(result);
      });

      // Subscribe to changes
      const subscription = this.changes$.subscribe(change => {
        if (change?.collection === collection && change.data?.id === id) {
          if (change.type === 'delete') {
            subscriber.next(null);
          } else {
            subscriber.next(change.data);
          }
        }
      });

      return () => subscription.unsubscribe();
    });
  }

  // ==================== Bulk Operations ====================

  async bulkCreate<T>(collection: string, data: T[]): Promise<T[]> {
    const results: T[] = [];
    
    // PouchDB doesn't support transactions, so we do best-effort
    for (const item of data) {
      try {
        const result = await this.create<T>(collection, item);
        results.push(result);
      } catch (error) {
        console.error('Bulk create error:', error);
        throw error;
      }
    }

    return results;
  }

  async bulkUpdate<T>(collection: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    const results: T[] = [];
    
    for (const { id, data } of updates) {
      try {
        const result = await this.update<T>(collection, id, data);
        results.push(result);
      } catch (error) {
        console.error('Bulk update error:', error);
        throw error;
      }
    }

    return results;
  }

  async bulkDelete(collection: string, ids: string[]): Promise<void> {
    const docsToDelete: any[] = [];

    // Get current revisions
    for (const id of ids) {
      try {
        const doc = await this.localDb!.get(`${collection}:${id}`);
        docsToDelete.push({
          ...doc,
          _deleted: true
        });
      } catch (error: any) {
        if (error.status !== 404) {
          throw error;
        }
      }
    }

    // Bulk delete
    if (docsToDelete.length > 0) {
      await this.localDb!.bulkDocs(docsToDelete);
    }
  }

  // ==================== Transactions ====================

  async transaction<T>(operations: Operation[]): Promise<T> {
    // PouchDB doesn't support ACID transactions
    // We simulate it with best-effort approach
    const results: any[] = [];
    
    for (const op of operations) {
      let result;
      switch (op.type) {
        case 'create':
          result = await this.create(op.collection, op.data);
          break;
        case 'update':
          result = await this.update(op.collection, op.id!, op.data);
          break;
        case 'delete':
          result = await this.delete(op.collection, op.id!);
          break;
      }
      results.push(result);
    }

    return results as T;
  }

  // ==================== Sync Operations ====================

  async sync(): Promise<SyncResult> {
    if (!this.remoteDb) {
      return {
        success: true,
        pulled: 0,
        pushed: 0,
        conflicts: []
      };
    }

    this.syncStatus.next('syncing');

    try {
      // One-time sync
      const syncResult = await this.localDb!.replicate.sync(
        this.config.remoteUrl!,
        { ...this.config.syncOptions, live: false }
      );

      const conflicts: SyncConflict[] = [];

      // Handle conflicts if any
      if (syncResult.pull?.errors) {
        for (const error of syncResult.pull.errors) {
          if (error.status === 409) { // Conflict
            const resolved = await this.resolveConflict(error.doc);
            conflicts.push({
              collection: error.doc._collection,
              id: error.doc.id,
              local: error.doc,
              remote: error.doc,
              resolution: resolved ? 'local' : 'remote'
            });
          }
        }
      }

      this.syncStatus.next('idle');

      return {
        success: true,
        pulled: syncResult.pull?.docs_read || 0,
        pushed: syncResult.push?.docs_written || 0,
        conflicts
      };
    } catch (error) {
      this.syncStatus.next('error');
      throw error;
    }
  }

  async getPendingChanges(): Promise<Change[]> {
    // Get changes that haven't been synced
    const changes = await this.localDb!.changes({
      since: 0,
      include_docs: true
    });

    return changes.results
      .filter((change: any) => !change.synced)
      .map((change: any) => ({
        id: change.id,
        collection: change.doc._collection,
        type: change.deleted ? 'delete' : change.doc._rev.startsWith('1-') ? 'create' : 'update',
        timestamp: Date.now(),
        data: change.deleted ? null : this.transformDoc(change.doc)
      }));
  }

  // ==================== Utility Methods ====================

  async count(collection: string, filter?: Filter): Promise<number> {
    const result = await this.find(collection, { filter });
    return result.pagination.totalCount;
  }

  async exists(collection: string, id: string): Promise<boolean> {
    try {
      await this.localDb!.get(`${collection}:${id}`);
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  // Export/Import not supported directly in PouchDB (use sync instead)
  async export(): Promise<Blob> {
    throw new Error('Export not supported in PouchDBProvider. Use sync instead.');
  }

  async import(data: Blob): Promise<void> {
    throw new Error('Import not supported in PouchDBProvider. Use sync instead.');
  }

  // ==================== Private Methods ====================

  private async setupSync(): Promise<void> {
    if (!this.config.remoteUrl) return;

    this.syncHandler = this.localDb!.replicate.sync(
      this.config.remoteUrl,
      this.config.syncOptions
    );

    this.syncHandler
      .on('change', (change: any) => {
        console.log('Sync change:', change);
        
        // Notify about changes from remote
        if (change.change?.docs) {
          for (const doc of change.change.docs) {
            if (doc._collection) {
              this.changeSubject.next({
                id: doc._id,
                collection: doc._collection,
                type: doc._deleted ? 'delete' : 'update',
                timestamp: Date.now(),
                data: doc._deleted ? null : this.transformDoc(doc)
              });
            }
          }
        }
      })
      .on('paused', () => {
        console.log('Sync paused');
        this.syncStatus.next('idle');
      })
      .on('active', () => {
        console.log('Sync active');
        this.syncStatus.next('syncing');
      })
      .on('error', (error: any) => {
        console.error('Sync error:', error);
        this.syncStatus.next('error');
      });
  }

  private async createIndexes(): Promise<void> {
    // Create index for collection lookups
    await this.localDb!.createIndex({
      index: {
        fields: ['_collection', 'updatedAt']
      }
    });

    // Create index for common query fields
    await this.localDb!.createIndex({
      index: {
        fields: ['_collection', 'id']
      }
    });
  }

  private buildSelector(filter?: Filter): any {
    if (!filter || Object.keys(filter).length === 0) {
      return {};
    }

    const selector: any = {};

    for (const [field, condition] of Object.entries(filter)) {
      if (typeof condition === 'object' && condition !== null) {
        if ('$eq' in condition) {
          selector[field] = condition.$eq;
        } else if ('$ne' in condition) {
          selector[field] = { $ne: condition.$ne };
        } else if ('$gt' in condition) {
          selector[field] = { $gt: condition.$gt };
        } else if ('$gte' in condition) {
          selector[field] = { $gte: condition.$gte };
        } else if ('$lt' in condition) {
          selector[field] = { $lt: condition.$lt };
        } else if ('$lte' in condition) {
          selector[field] = { $lte: condition.$lte };
        } else if ('$in' in condition) {
          selector[field] = { $in: condition.$in };
        } else if ('$contains' in condition) {
          // For text search, we'd need pouchdb-quick-search
          selector[field] = { $regex: condition.$contains };
        }
      } else {
        selector[field] = condition;
      }
    }

    return selector;
  }

  private transformDoc(doc: any): any {
    if (!doc) return null;

    const result: any = { ...doc };
    
    // Extract id from _id
    if (doc._id && doc._collection) {
      result.id = doc._id.replace(`${doc._collection}:`, '');
    }

    // Remove internal fields
    delete result._id;
    delete result._rev;
    delete result._collection;

    return result;
  }

  private async resolveConflict(doc: any): Promise<boolean> {
    // Simple conflict resolution: local wins
    // In production, you might want more sophisticated logic
    try {
      const localDoc = await this.localDb!.get(doc._id);
      
      // Keep local version
      await this.localDb!.put({
        ...localDoc,
        _rev: doc._rev  // Use remote's revision
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureInitialized(): void {
    if (!this.localDb) {
      throw new Error('PouchDBProvider not initialized. Call initialize() first.');
    }
  }
}

export default PouchDBProvider;
