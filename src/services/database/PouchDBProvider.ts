// PouchDB Provider Implementation
// Supports unlimited collections for the dual-database architecture

import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
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
  CollectionError
} from './interfaces';

// Add PouchDB plugins
PouchDB.plugin(PouchDBFind);

// PouchDB Collection Implementation
export class PouchDBCollection<T extends { id?: string }> implements ICollection<T> {
  private changeSubject = new Subject<CollectionChangeEvent<T>>();
  private dataSubject = new BehaviorSubject<T[]>([]);
  private isDestroyed = false;

  constructor(
    private db: PouchDB.Database,
    public readonly name: string,
    public readonly schema: CollectionSchema
  ) {
    this.setupChangeListener();
    this.loadInitialData();
  }

  private setupChangeListener(): void {
    this.db.changes({
      since: 'now',
      live: true,
      include_docs: true
    }).on('change', (change) => {
      if (this.isDestroyed) return;
      
      const doc = change.doc as T;
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
      console.error(`PouchDB change listener error for ${this.name}:`, err);
    });
  }

  private async loadInitialData(): Promise<void> {
    try {
      const result = await this.db.allDocs({ include_docs: true });
      const docs = result.rows
        .filter(row => row.doc && !row.id.startsWith('_design/'))
        .map(row => this.transformDoc(row.doc as any));
      this.dataSubject.next(docs);
    } catch (error) {
      console.error(`Failed to load initial data for ${this.name}:`, error);
    }
  }

  private async refreshDataSubject(): Promise<void> {
    try {
      const docs = await this.find();
      this.dataSubject.next(docs);
    } catch (error) {
      console.error(`Failed to refresh data subject for ${this.name}:`, error);
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
    const pouchDoc = { ...doc };
    if ('id' in doc && doc.id) {
      pouchDoc._id = doc.id as string;
      delete (pouchDoc as any).id;
    }
    return pouchDoc;
  }

  // CRUD Operations
  async insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>> {
    try {
      const pouchDoc = this.transformToPouch(doc);
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
    } catch (error) {
      throw new CollectionError(
        `Failed to insert document in ${this.name}: ${error.message}`,
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
            id: res.id || `doc_${index}`,
            error: res.error,
            reason: res.reason || 'Unknown error'
          });
        } else {
          insertResults.push({
            id: res.id,
            rev: res.rev,
            doc: { ...docs[index], id: res.id } as T,
            ok: res.ok
          });
        }
      });
      
      return { docs: insertResults, errors };
    } catch (error) {
      throw new CollectionError(
        `Failed to insert multiple documents in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async findOne(query: QueryOptions): Promise<T | null> {
    try {
      const results = await this.find({ ...query, limit: 1 });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      throw new CollectionError(
        `Failed to find document in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const doc = await this.db.get(id);
      return this.transformDoc(doc);
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw new CollectionError(
        `Failed to find document by ID in ${this.name}: ${error.message}`,
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
        result = await this.db.allDocs({
          include_docs: true,
          limit: query.limit,
          skip: query.skip,
          startkey: query.startkey,
          endkey: query.endkey,
          key: query.key,
          keys: query.keys
        });
        
        return result.rows
          .filter(row => row.doc && !row.id.startsWith('_design/'))
          .map(row => this.transformDoc(row.doc));
      }
    } catch (error) {
      throw new CollectionError(
        `Failed to find documents in ${this.name}: ${error.message}`,
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
    } catch (error) {
      throw new CollectionError(
        `Failed to update document in ${this.name}: ${error.message}`,
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
    } catch (error) {
      throw new CollectionError(
        `Failed to update multiple documents in ${this.name}: ${error.message}`,
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
    } catch (error) {
      throw new CollectionError(
        `Failed to remove document from ${this.name}: ${error.message}`,
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
    } catch (error) {
      throw new CollectionError(
        `Failed to remove multiple documents from ${this.name}: ${error.message}`,
        this.name
      );
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
          } catch (error) {
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
    } catch (error) {
      throw new CollectionError(
        `Failed to count documents in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      await this.db.get(id);
      return true;
    } catch (error) {
      if (error.status === 404) {
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
    } catch (error) {
      throw new CollectionError(
        `Failed to create index in ${this.name}: ${error.message}`,
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
        storageSize: info.disk_size || 0,
        lastModified: new Date()
      };
    } catch (error) {
      throw new CollectionError(
        `Failed to get stats for ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async compact(): Promise<void> {
    try {
      await this.db.compact();
    } catch (error) {
      throw new CollectionError(
        `Failed to compact ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async destroy(): Promise<void> {
    try {
      this.isDestroyed = true;
      this.changeSubject.complete();
      this.dataSubject.complete();
      await this.db.destroy();
    } catch (error) {
      throw new CollectionError(
        `Failed to destroy ${this.name}: ${error.message}`,
        this.name
      );
    }
  }
}

// PouchDB Provider Implementation
export class PouchDBProvider implements IDatabaseProvider {
  public readonly name = 'PouchDB';
  public readonly version = '8.0.0';
  
  private collections = new Map<string, ICollection<any>>();
  private config: DatabaseConfig | null = null;
  private isInitialized = false;
  private performanceStats = {
    avgQueryTime: 0,
    totalQueries: 0,
    memoryUsage: 0
  };

  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      this.config = config;
      
      // Configure PouchDB defaults
      PouchDB.defaults({
        auto_compaction: config.autoCompaction ?? true,
        revs_limit: 10 // Limit revision history to save space
      });
      
      this.isInitialized = true;
      console.log('PouchDB Provider initialized successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize PouchDB provider: ${error.message}`,
        'INITIALIZATION_ERROR',
        this.name
      );
    }
  }

  async createCollection<T>(name: string, schema: CollectionSchema): Promise<ICollection<T>> {
    try {
      if (!this.isInitialized) {
        throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', this.name);
      }
      
      // Create PouchDB instance for this collection
      const dbName = this.config?.name ? `${this.config.name}_${name}` : name;
      const db = new PouchDB(dbName, {
        adapter: 'idb', // Use IndexedDB adapter
        auto_compaction: true
      });
      
      // Create collection wrapper
      const collection = new PouchDBCollection<T>(db, name, schema);
      this.collections.set(name, collection);
      
      console.log(`PouchDB collection '${name}' created successfully`);
      return collection;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create collection '${name}': ${error.message}`,
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
        } catch (error) {
          console.error(`Failed to destroy collection '${name}':`, error);
        }
      }
      
      this.collections.clear();
      this.isInitialized = false;
      console.log('PouchDB Provider destroyed successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to destroy PouchDB provider: ${error.message}`,
        'DESTRUCTION_ERROR',
        this.name
      );
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
        collections: backupData
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to create backup: ${error.message}`,
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
            if (doc.id) {
              await collection.remove(doc.id);
            }
          }
          
          // Insert backup data
          if (docs.length > 0) {
            await collection.insertMany(docs as any[]);
          }
        }
      }
      
      console.log('PouchDB backup restored successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to restore backup: ${error.message}`,
        'RESTORE_ERROR',
        this.name
      );
    }
  }
}