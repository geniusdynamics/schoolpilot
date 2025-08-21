/**
 * SQLite WASM Database Provider Implementation
 * 
 * This provider integrates SQLite WASM with the existing database provider architecture,
 * enabling offline storage, cross-tab persistence using OPFS, and high-performance queries.
 * 
 * Features:
 * - SQLite WASM with OPFS storage
 * - Offline-first architecture
 * - Cross-tab persistence
 * - High-performance SQL queries
 * - Reactive data subscriptions
 * - Performance monitoring
 */

import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map, filter } from 'rxjs/operators';
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
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { schema } from '../livestore/schema';

// SQLite WASM Collection Implementation
export class SQLiteCollectionWrapper<T extends { id?: string }> implements ICollection<T> {
  private changeSubject = new Subject<CollectionChangeEvent<T>>();
  private dataSubject = new BehaviorSubject<T[]>([]);
  private isDestroyed = false;
  private tableName: string;

  constructor(
    private db: Database,
    public readonly name: string,
    public readonly schema: CollectionSchema
  ) {
    this.tableName = this.sanitizeTableName(name);
    this.createTable();
    this.loadInitialData();
  }

  private sanitizeTableName(name: string): string {
    // Convert collection name to valid SQL table name
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }

  private createTable(): void {
    const columns = Object.entries(this.schema.properties)
      .map(([key, prop]) => {
        let sqlType = 'TEXT';
        if (prop.type === 'number') sqlType = 'REAL';
        if (prop.type === 'integer') sqlType = 'INTEGER';
        if (prop.type === 'boolean') sqlType = 'BOOLEAN';
        return `${key} ${sqlType}`;
      })
      .join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (
      id TEXT PRIMARY KEY,
      ${columns},
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`;

    this.db.exec(sql);

    // Create indexes
    if (this.schema.indexes) {
      this.schema.indexes.forEach(index => {
        const indexName = `idx_${this.tableName}_${index.fields.join('_')}`;
        const indexSql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${this.tableName} (${index.fields.join(', ')})`;
        this.db.exec(indexSql);
      });
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      const data = await this.find();
      this.dataSubject.next(data);
    } catch (error) {
      console.error(`Failed to load initial data for collection ${this.name}:`, error);
    }
  }

  private handleLiveStoreEvent(event: any): void {
    const changeEvent: CollectionChangeEvent<T> = {
      type: event.type || 'update',
      doc: event.doc,
      oldDoc: event.oldDoc,
      id: event.doc?.id || event.id
    };
    
    this.changeSubject.next(changeEvent);
    
    // Update the data subject
    this.loadInitialData();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateDocument(doc: any): void {
    if (!doc) {
      throw new CollectionError('Document cannot be null or undefined', this.name);
    }
  }

  // CRUD Operations
  async insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    this.validateDocument(doc);
    
    const id = this.generateId();
    const fullDoc = { ...doc, id } as T;
    
    try {
      const columns = Object.keys(fullDoc).join(', ');
      const placeholders = Object.keys(fullDoc).map(() => '?').join(', ');
      const values = Object.values(fullDoc);

      const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
      this.db.exec(sql, values);
      
      return {
        id,
        doc: fullDoc,
        ok: true
      };
    } catch (error) {
      throw new CollectionError(
        `Failed to insert document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
  }

  async insertMany(docs: Omit<T, 'id'>[]): Promise<BulkResult<T>> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    const results: InsertResult<T>[] = [];
    const errors: Array<{ id: string; error: string; reason: string }> = [];

    for (const doc of docs) {
      try {
        const result = await this.insert(doc);
        results.push(result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          id: 'unknown',
          error: 'insert_failed',
          reason: errorMsg
        });
      }
    }

    return { docs: results, errors };
  }

  async findOne(idOrQuery: string | QueryOptions): Promise<T | null> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      if (typeof idOrQuery === 'string') {
        return await this.findById(idOrQuery);
      }
      
      const results = await this.find({ ...idOrQuery, limit: 1 });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      throw new CollectionError(
        `Failed to find document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
  }

  async findById(id: string): Promise<T | null> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`;
      const stmt = this.db.prepare(sql);
      const result = stmt.get([id]);
      stmt.finalize();
      
      return result ? this.parseRow(result) : null;
    } catch (error) {
      throw new CollectionError(
        `Failed to find document by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
  }

  private parseRow(row: any): T {
    // Convert SQLite row to typed document
    const doc = { ...row } as T;
    
    // Parse JSON fields if needed
    Object.entries(this.schema.properties).forEach(([key, prop]) => {
      if (prop.type === 'object' || prop.type === 'array') {
        if (doc[key as keyof T] && typeof doc[key as keyof T] === 'string') {
          try {
            doc[key as keyof T] = JSON.parse(doc[key as keyof T] as string);
          } catch {
            // Keep as string if parsing fails
          }
        }
      }
    });
    
    return doc;
  }

  async find(query?: QueryOptions): Promise<T[]> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];
      
      // Build WHERE clause from selector
      if (query?.selector) {
        const whereConditions = this.buildWhereClause(query.selector, params);
        if (whereConditions) {
          sql += ` WHERE ${whereConditions}`;
        }
      }
      
      // Build ORDER BY clause
      if (query?.sort) {
        const orderBy = this.buildOrderByClause(query.sort);
        if (orderBy) {
          sql += ` ORDER BY ${orderBy}`;
        }
      }
      
      // Add LIMIT and OFFSET
      if (query?.limit) {
        sql += ` LIMIT ${query.limit}`;
      }
      
      if (query?.skip) {
        sql += ` OFFSET ${query.skip}`;
      }
      
      const stmt = this.db.prepare(sql);
      const results = stmt.all(params);
      stmt.finalize();
      
      return results.map(row => this.parseRow(row));
    } catch (error) {
      throw new CollectionError(
        `Failed to find documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
  }

  private buildWhereClause(selector: any, params: any[]): string {
    const conditions: string[] = [];
    
    Object.entries(selector).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Handle operators like $eq, $gt, $lt, etc.
        Object.entries(value).forEach(([op, opValue]) => {
          switch (op) {
            case '$eq':
              conditions.push(`${key} = ?`);
              params.push(opValue);
              break;
            case '$gt':
              conditions.push(`${key} > ?`);
              params.push(opValue);
              break;
            case '$gte':
              conditions.push(`${key} >= ?`);
              params.push(opValue);
              break;
            case '$lt':
              conditions.push(`${key} < ?`);
              params.push(opValue);
              break;
            case '$lte':
              conditions.push(`${key} <= ?`);
              params.push(opValue);
              break;
            case '$ne':
              conditions.push(`${key} != ?`);
              params.push(opValue);
              break;
            case '$in':
              if (Array.isArray(opValue)) {
                const placeholders = opValue.map(() => '?').join(', ');
                conditions.push(`${key} IN (${placeholders})`);
                params.push(...opValue);
              }
              break;
            case '$regex':
              conditions.push(`${key} LIKE ?`);
              params.push(`%${opValue}%`);
              break;
          }
        });
      } else {
        // Simple equality
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });
    
    return conditions.join(' AND ');
  }

  private buildOrderByClause(sort: any): string {
    if (typeof sort === 'string') {
      return `${sort} ASC`;
    }
    
    if (Array.isArray(sort)) {
      return sort.map(s => {
        if (typeof s === 'string') {
          return `${s} ASC`;
        } else {
          return Object.entries(s)
            .map(([field, direction]) => `${field} ${direction === 1 ? 'ASC' : 'DESC'}`)
            .join(', ');
        }
      }).join(', ');
    }
    
    if (typeof sort === 'object') {
      return Object.entries(sort)
        .map(([field, direction]) => `${field} ${direction === 1 ? 'ASC' : 'DESC'}`)
        .join(', ');
    }
    
    return '';
  }

  private convertQueryToLiveStore(query?: QueryOptions): any {
    if (!query) return {};
    
    const liveStoreQuery: any = {};
    
    if (query.selector) {
      liveStoreQuery.where = query.selector;
    }
    
    if (query.sort) {
      liveStoreQuery.orderBy = query.sort;
    }
    
    if (query.limit) {
      liveStoreQuery.limit = query.limit;
    }
    
    if (query.skip) {
      liveStoreQuery.offset = query.skip;
    }
    
    return liveStoreQuery;
  }

  async update(id: string, update: Partial<T>): Promise<UpdateResult<T>> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new CollectionError(`Document with ID ${id} not found`, this.name);
      }

      const updatedDoc = { ...existing, ...update, id } as T;
      
      const setClause = Object.keys(update)
        .map(key => `${key} = ?`)
        .join(', ');
      const values = [...Object.values(update), id];

      const sql = `UPDATE ${this.tableName} SET ${setClause}, updated_at = strftime('%s', 'now') WHERE id = ?`;
      this.db.exec(sql, values);
      
      return {
        id,
        doc: updatedDoc,
        ok: true
      };
    } catch (error) {
      throw new CollectionError(
        `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
  }

  async updateMany(query: QueryOptions, update: Partial<T>): Promise<UpdateResult<T>[]> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

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
        `Failed to update documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
  }

  async remove(id: string): Promise<DeleteResult> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      await this.liveStoreCollection.delete(id);
      
      return {
        id,
        ok: true,
        deleted: true
      };
    } catch (error) {
      throw new CollectionError(
        `Failed to remove document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
  }

  async removeMany(query: QueryOptions): Promise<DeleteResult[]> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

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
        `Failed to remove documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
  }

  // RxDB-compatible methods
  async upsert(id: string, doc: Partial<T>): Promise<UpdateResult<T> | InsertResult<T>> {
    const existing = await this.findById(id);
    
    if (existing) {
      return await this.update(id, doc);
    } else {
      return await this.insert({ ...doc, id } as Omit<T, 'id'>);
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      const existing = await this.findById(id);
      if (!existing) {
        return {
          id,
          ok: false,
          deleted: false
        };
      }

      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      this.db.exec(sql, [id]);
      
      return {
        id,
        ok: true,
        deleted: true
      };
    } catch (error) {
      throw new CollectionError(
        `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name
      );
    }
  }

  // Reactive Operations
  subscribe(query?: QueryOptions): Observable<T[]> {
    if (query) {
      return this.dataSubject.pipe(
        map(data => {
          // Apply query filtering on the client side
          let filtered = data;
          
          if (query.selector) {
            filtered = filtered.filter(doc => this.matchesSelector(doc, query.selector!));
          }
          
          if (query.sort) {
            filtered = this.applySorting(filtered, query.sort);
          }
          
          if (query.skip) {
            filtered = filtered.slice(query.skip);
          }
          
          if (query.limit) {
            filtered = filtered.slice(0, query.limit);
          }
          
          return filtered;
        })
      );
    }
    
    return this.dataSubject.asObservable();
  }

  private matchesSelector(doc: T, selector: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(selector)) {
      const docValue = (doc as any)[key];
      if (docValue !== value) {
        return false;
      }
    }
    return true;
  }

  private applySorting(data: T[], sort: Array<string | Record<string, 'asc' | 'desc'>>): T[] {
    return data.sort((a, b) => {
      for (const sortItem of sort) {
        let field: string;
        let direction: 'asc' | 'desc' = 'asc';
        
        if (typeof sortItem === 'string') {
          field = sortItem;
        } else {
          field = Object.keys(sortItem)[0];
          direction = Object.values(sortItem)[0];
        }
        
        const aValue = (a as any)[field];
        const bValue = (b as any)[field];
        
        if (aValue < bValue) {
          return direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return direction === 'asc' ? 1 : -1;
        }
      }
      return 0;
    });
  }

  subscribeToChanges(): Observable<CollectionChangeEvent<T>> {
    return this.changeSubject.asObservable();
  }

  // Performance Operations
  async count(query?: QueryOptions): Promise<number> {
    const results = await this.find(query);
    return results.length;
  }

  async exists(id: string): Promise<boolean> {
    const doc = await this.findById(id);
    return doc !== null;
  }

  async createIndex(index: IndexDefinition): Promise<void> {
    // LiveStore handles indexing automatically based on schema
    console.log(`Index creation for ${index.name} is handled automatically by LiveStore`);
  }

  // Collection management
  async getStats(): Promise<CollectionStats> {
    const count = await this.count();
    
    return {
      name: this.name,
      documentCount: count,
      indexCount: this.schema.indexes?.length || 0,
      storageSize: 0, // LiveStore doesn't expose storage size
      lastModified: new Date()
    };
  }

  async compact(): Promise<void> {
    // LiveStore handles compaction automatically
    console.log(`Compaction for collection ${this.name} is handled automatically by LiveStore`);
  }

  async destroy(): Promise<void> {
    this.isDestroyed = true;
    this.changeSubject.complete();
    this.dataSubject.complete();
  }
}

// SQLite WASM Provider Implementation
export class SQLiteWASMProvider implements IDatabaseProvider {
  public readonly name = 'SQLite WASM';
  public readonly version = '1.0.0';
  
  private db: Database | null = null;
  private sqlite3: any = null;
  private collections = new Map<string, SQLiteCollectionWrapper<any>>();
  private isInitialized = false;
  private config: DatabaseConfig | null = null;
  private dbPath: string = 'schoolpilot.db';

  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      this.config = config;
      
      // Initialize SQLite WASM
      this.sqlite3 = await sqlite3InitModule({
        print: console.log,
        printErr: console.error,
      });

      // Configure for OPFS if available
      const opfsAvailable = 'opfs' in this.sqlite3.capi;
      
      if (opfsAvailable && config.storage?.type === 'opfs') {
        // Use OPFS for persistent storage
        this.dbPath = `/opfs/${config.name || 'schoolpilot'}.db`;
        this.db = new this.sqlite3.oo1.OpfsDb(this.dbPath);
        console.log('SQLite WASM initialized with OPFS storage');
      } else {
        // Fallback to in-memory database
        this.db = new this.sqlite3.oo1.DB();
        console.log('SQLite WASM initialized with in-memory storage');
      }

      // Enable WAL mode for better concurrency
      this.db.exec('PRAGMA journal_mode=WAL');
      this.db.exec('PRAGMA synchronous=NORMAL');
      this.db.exec('PRAGMA cache_size=10000');
      this.db.exec('PRAGMA temp_store=MEMORY');
      
      this.isInitialized = true;
      
      console.log('SQLite WASM initialized successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize SQLite WASM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_ERROR',
        this.name
      );
    }
  }

  async createCollection<T>(name: string, schema: CollectionSchema): Promise<ICollection<T>> {
    if (!this.isInitialized || !this.db) {
      throw new DatabaseError('SQLite WASM not initialized', 'NOT_INITIALIZED', this.name);
    }

    try {
      // Create SQLite collection wrapper
      const collection = new SQLiteCollectionWrapper<T>(
        this.db,
        name,
        schema
      );
      
      this.collections.set(name, collection);
      return collection;
      
    } catch (error) {
      throw new DatabaseError(
        `Failed to create collection ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      for (const collection of this.collections.values()) {
        await collection.destroy();
      }
      this.collections.clear();
      
      // Close SQLite database
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      this.sqlite3 = null;
      this.isInitialized = false;
      
    } catch (error) {
      throw new DatabaseError(
        `Failed to destroy SQLite WASM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DESTRUCTION_ERROR',
        this.name
      );
    }
  }

  isAvailable(): boolean {
    // Check if LiveStore dependencies are available
    try {
      return typeof window !== 'undefined' && 
             'indexedDB' in window && 
             window.indexedDB !== null;
    } catch {
      return false;
    }
  }

  getStatus(): ProviderStatus {
    return {
      name: this.name,
      version: this.version,
      isConnected: this.isInitialized,
      collectionsCount: this.collections.size,
      performance: {
        avgQueryTime: 0, // LiveStore doesn't expose this
        totalQueries: 0,
        memoryUsage: 0
      }
    };
  }

  async backup(): Promise<string> {
    if (!this.isInitialized) {
      throw new DatabaseError('LiveStore not initialized', 'NOT_INITIALIZED', this.name);
    }

    try {
      const backup: Record<string, any[]> = {};
      
      for (const [name, collection] of this.collections) {
        backup[name] = await collection.find();
      }
      
      return JSON.stringify({
        version: this.version,
        timestamp: new Date().toISOString(),
        config: this.config,
        data: backup
      });
      
    } catch (error) {
      throw new DatabaseError(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BACKUP_ERROR',
        this.name
      );
    }
  }

  async restore(backupData: string): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseError('LiveStore not initialized', 'NOT_INITIALIZED', this.name);
    }

    try {
      const backup = JSON.parse(backupData);
      
      if (!backup.data) {
        throw new Error('Invalid backup format');
      }
      
      for (const [collectionName, documents] of Object.entries(backup.data)) {
        const collection = this.collections.get(collectionName);
        if (collection && Array.isArray(documents)) {
          // Clear existing data
          const existing = await collection.find();
          for (const doc of existing) {
            if (doc.id) {
              await collection.remove(doc.id);
            }
          }
          
          // Insert backup data
          for (const doc of documents) {
            const { id, ...docWithoutId } = doc;
            await collection.insert(docWithoutId);
          }
        }
      }
      
    } catch (error) {
      throw new DatabaseError(
        `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RESTORE_ERROR',
        this.name
      );
    }
  }
}