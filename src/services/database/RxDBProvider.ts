// ABOUTME: RxDB Provider Implementation for dual-database architecture
// ABOUTME: Provides RxDB-based database operations with reactive capabilities

import { addRxPlugin, createRxDatabase, RxDatabase } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
// import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
// import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
// import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
// import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
// import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { Observable, Subject, BehaviorSubject, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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

// Add RxDB plugins
// addRxPlugin(RxDBMigrationSchemaPlugin);
// addRxPlugin(RxDBUpdatePlugin);
// if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
//   addRxPlugin(RxDBDevModePlugin);
// }
// addRxPlugin(RxDBQueryBuilderPlugin);

if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
  // addRxPlugin(RxDBLeaderElectionPlugin);
}

// RxDB Collection Implementation
export class RxDBCollection<T extends { id?: string }> implements ICollection<T> {
  private changeSubject = new Subject<CollectionChangeEvent<T>>();
  private dataSubject = new BehaviorSubject<T[]>([]);
  private isDestroyed = false;

  constructor(
    private rxCollection: RxCollection<T>,
    public readonly name: string,
    public readonly schema: CollectionSchema
  ) {
    this.setupChangeListener();
    this.loadInitialData();
  }

  private setupChangeListener(): void {
    this.rxCollection.$.subscribe({
      next: (changeEvent) => {
        if (this.isDestroyed) return;
        
        const doc = changeEvent.documentData as T;
        const eventType = changeEvent.operation;
        
        this.changeSubject.next({
          type: eventType as 'insert' | 'update' | 'delete',
          doc,
          id: changeEvent.documentId
        });
        
        // Update data subject for reactive queries
        this.refreshDataSubject();
      },
      error: (err) => {
        console.error(`RxDB change listener error for ${this.name}:`, err);
      }
    });
  }

  private async loadInitialData(): Promise<void> {
    try {
      const docs = await this.rxCollection.find().exec();
      const transformedDocs = docs.map(doc => this.transformDoc(doc));
      this.dataSubject.next(transformedDocs);
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

  private transformDoc(doc: RxDocument<T> | T): T {
    if (!doc) return doc as T;
    
    // If it's an RxDocument, convert to plain object
    if (typeof doc.toJSON === 'function') {
      return (doc as RxDocument<T>).toJSON();
    }
    
    return doc as T;
  }

  // CRUD Operations
  async insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>> {
    try {
      const insertedDoc = await this.rxCollection.insert(doc as any);
      const transformedDoc = this.transformDoc(insertedDoc);
      
      return {
        id: insertedDoc.primary,
        doc: transformedDoc,
        ok: true
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
      const insertResults: InsertResult<T>[] = [];
      const errors: Array<{ id: string; error: string; reason: string }> = [];
      
      for (let i = 0; i < docs.length; i++) {
        try {
          const result = await this.insert(docs[i]);
          insertResults.push(result);
        } catch (error) {
          errors.push({
            id: `doc_${i}`,
            error: error.name || 'InsertError',
            reason: error.message || 'Unknown error'
          });
        }
      }
      
      return { docs: insertResults, errors };
    } catch (error) {
      throw new CollectionError(
        `Failed to insert multiple documents in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async findOne(idOrQuery: string | QueryOptions): Promise<T | null> {
    try {
      let result;
      
      if (typeof idOrQuery === 'string') {
        // Find by ID
        result = await this.rxCollection.findOne(idOrQuery).exec();
      } else {
        // Find by query
        const query = this.rxCollection.findOne(idOrQuery.selector || {});
        
        if (idOrQuery.sort) {
          query.sort(idOrQuery.sort as any);
        }
        
        result = await query.exec();
      }
      
      return result ? this.transformDoc(result) : null;
    } catch (error) {
      throw new CollectionError(
        `Failed to find document in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async findById(id: string): Promise<T | null> {
    return this.findOne(id);
  }

  async find(query: QueryOptions = {}): Promise<T[]> {
    try {
      let rxQuery = this.rxCollection.find(query.selector || {});
      
      if (query.sort) {
        rxQuery = rxQuery.sort(query.sort as any);
      }
      
      if (query.limit) {
        rxQuery = rxQuery.limit(query.limit);
      }
      
      if (query.skip) {
        rxQuery = rxQuery.skip(query.skip);
      }
      
      const docs = await rxQuery.exec();
      return docs.map(doc => this.transformDoc(doc));
    } catch (error) {
      throw new CollectionError(
        `Failed to find documents in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async update(id: string, update: Partial<T>): Promise<UpdateResult<T>> {
    try {
      const doc = await this.rxCollection.findOne(id).exec();
      if (!doc) {
        throw new Error(`Document with id ${id} not found`);
      }
      
      const updatedDoc = await doc.update({ $set: update });
      const transformedDoc = this.transformDoc(updatedDoc);
      
      return {
        id,
        doc: transformedDoc,
        ok: true
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
      const doc = await this.rxCollection.findOne(id).exec();
      if (!doc) {
        throw new Error(`Document with id ${id} not found`);
      }
      
      await doc.remove();
      
      return {
        id,
        ok: true,
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

  // RxDB-compatible methods
  async upsert(id: string, doc: Partial<T>): Promise<UpdateResult<T> | InsertResult<T>> {
    try {
      const existingDoc = await this.findById(id);
      if (existingDoc) {
        return await this.update(id, doc);
      } else {
        return await this.insert({ ...doc, id } as Omit<T, 'id'>);
      }
    } catch (error) {
      throw new CollectionError(
        `Failed to upsert document in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    return this.remove(id);
  }

  // Reactive Operations
  subscribe(query: QueryOptions = {}): Observable<T[]> {
    try {
      let rxQuery = this.rxCollection.find(query.selector || {});
      
      if (query.sort) {
        rxQuery = rxQuery.sort(query.sort as any);
      }
      
      if (query.limit) {
        rxQuery = rxQuery.limit(query.limit);
      }
      
      if (query.skip) {
        rxQuery = rxQuery.skip(query.skip);
      }
      
      return rxQuery.$.pipe(
        map(docs => docs.map(doc => this.transformDoc(doc))),
        catchError(error => {
          console.error(`Subscription error in ${this.name}:`, error);
          return [];
        })
      );
    } catch (error) {
      throw new CollectionError(
        `Failed to create subscription for ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  subscribeToChanges(): Observable<CollectionChangeEvent<T>> {
    return this.changeSubject.asObservable();
  }

  // Performance Operations
  async count(query: QueryOptions = {}): Promise<number> {
    try {
      const docs = await this.find(query);
      return docs.length;
    } catch (error) {
      throw new CollectionError(
        `Failed to count documents in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const doc = await this.findById(id);
      return doc !== null;
    } catch (error) {
      return false;
    }
  }

  async createIndex(index: IndexDefinition): Promise<void> {
    try {
      // RxDB handles indexes through schema definition
      console.warn(`Index creation for ${this.name} should be done through schema definition`);
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
      const docs = await this.find();
      return {
        name: this.name,
        documentCount: docs.length,
        indexCount: 0, // RxDB doesn't expose index count easily
        storageSize: 0, // Not easily available in RxDB
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
      // RxDB doesn't have a direct compact method
      console.log(`Compact operation not available for RxDB collection ${this.name}`);
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
      await this.rxCollection.destroy();
    } catch (error) {
      throw new CollectionError(
        `Failed to destroy ${this.name}: ${error.message}`,
        this.name
      );
    }
  }
}

// RxDB Provider Implementation
export class RxDBProvider implements IDatabaseProvider {
  public readonly name = 'rxdb';
  public readonly version = '15.0.0';
  
  private database: RxDatabase | null = null;
  private collections = new Map<string, ICollection<any>>();
  private isInitialized = false;
  private initializationError: Error | null = null;

  // Lifecycle management
  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Check if IndexedDB is available
      if (!this.isAvailable()) {
        throw new DatabaseError('IndexedDB not available', 'INDEXEDDB_UNAVAILABLE');
      }

      this.database = await createRxDatabase({
        name: config.name,
        storage: wrappedValidateAjvStorage({ storage: getRxStorageDexie() }),
        multiInstance: config.multiInstance ?? true,
        ignoreDuplicate: config.ignoreDuplicate ?? true
      });

      this.isInitialized = true;
      this.initializationError = null;
      
      console.log(`RxDB Provider initialized with database: ${config.name}`);
    } catch (error) {
      this.initializationError = error as Error;
      this.isInitialized = false;
      throw new DatabaseError(
        `Failed to initialize RxDB provider: ${error.message}`,
        'INITIALIZATION_ERROR'
      );
    }
  }

  async createCollection<T>(name: string, schema: CollectionSchema): Promise<ICollection<T>> {
    try {
      if (!this.database) {
        throw new DatabaseError('Database not initialized', 'DATABASE_NOT_INITIALIZED');
      }

      // Convert our schema format to RxDB schema format
      const rxdbSchema: RxJsonSchema<T> = {
        version: schema.version,
        type: 'object',
        properties: schema.properties as any,
        required: schema.required,
        primaryKey: schema.primaryKey || 'id',
        indexes: schema.indexes?.map(idx => idx.fields) || []
      };

      const rxCollection = await this.database.addCollections({
        [name]: {
          schema: rxdbSchema
        }
      });

      const collection = new RxDBCollection<T>(
        rxCollection[name],
        name,
        schema
      );

      this.collections.set(name, collection);
      
      console.log(`RxDB collection '${name}' created successfully`);
      return collection;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create RxDB collection '${name}': ${error.message}`,
        'COLLECTION_CREATION_ERROR'
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
      for (const collection of this.collections.values()) {
        await collection.destroy();
      }
      this.collections.clear();

      // Destroy database
      if (this.database) {
        await this.database.destroy();
        this.database = null;
      }

      this.isInitialized = false;
      console.log('RxDB Provider destroyed');
    } catch (error) {
      throw new DatabaseError(
        `Failed to destroy RxDB provider: ${error.message}`,
        'DESTRUCTION_ERROR'
      );
    }
  }

  // Status and health
  isAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && 
             !!window.indexedDB && 
             typeof crypto !== 'undefined' && 
             !!crypto.randomUUID;
    } catch {
      return false;
    }
  }

  getStatus(): ProviderStatus {
    return {
      name: this.name,
      version: this.version,
      isConnected: this.isInitialized && !this.initializationError,
      collectionsCount: this.collections.size,
      lastError: this.initializationError,
      performance: {
        avgQueryTime: 0, // Would need to implement query timing
        totalQueries: 0,
        memoryUsage: 0
      }
    };
  }

  // Backup and restore
  async backup(): Promise<string> {
    try {
      if (!this.database) {
        throw new DatabaseError('Database not initialized', 'DATABASE_NOT_INITIALIZED');
      }

      const backup: any = {};
      
      for (const [name, collection] of this.collections) {
        const docs = await collection.find();
        backup[name] = docs;
      }

      return JSON.stringify(backup);
    } catch (error) {
      throw new DatabaseError(
        `Failed to create backup: ${error.message}`,
        'BACKUP_ERROR'
      );
    }
  }

  async restore(backupData: string): Promise<void> {
    try {
      const backup = JSON.parse(backupData);
      
      for (const [collectionName, docs] of Object.entries(backup)) {
        const collection = this.getCollection(collectionName);
        if (collection && Array.isArray(docs)) {
          await collection.insertMany(docs as any[]);
        }
      }
      
      console.log('RxDB Provider backup restored successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to restore backup: ${error.message}`,
        'RESTORE_ERROR'
      );
    }
  }
}

// Export error classes
export { DatabaseError, CollectionError } from './interfaces';