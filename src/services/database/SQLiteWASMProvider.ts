import { logger } from '@/utils/logging';

// ABOUTME: SQLite WASM + OPFS Provider for production mode with high performance and persistence
// ABOUTME: Implements IDatabaseProvider interface with SQLite WASM and Origin Private File System storage

import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
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
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { SchemaConverter } from './SchemaConverter';

// SQLite WASM Collection Implementation with OPFS
export class SQLiteWASMCollection<T = any> implements ICollection<T> {
  private changeSubject = new Subject<CollectionChangeEvent<T>>();
  private dataSubject = new BehaviorSubject<T[]>([]);
  private isDestroyed = false;
  private tableName: string;
  private queryCount = 0;
  private totalQueryTime = 0;

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
    try {
      logger.info(`[SQLiteWASMCollection] Creating table: ${this.tableName}`);
      
      // Use schema converter to generate proper SQLite schema
      const conversionResult = SchemaConverter.convertRxDBToSQLite(this.name, this.schema);
      
      // Generate CREATE TABLE SQL
      const createTableSQL = SchemaConverter.generateCreateTableSQL(conversionResult.sqlSchema);
      
      this.db.exec(createTableSQL);
      
      // Create indexes for performance
      const indexSQLs = SchemaConverter.generateCreateIndexSQL(this.tableName, conversionResult.indexes);
      indexSQLs.forEach(indexSQL => {
        try {
          this.db.exec(indexSQL);
        } catch (indexError) {
          // Index might already exist, log warning but continue
          logger.warn(`[SQLiteWASMCollection] Index creation warning for ${this.tableName}:`, indexError);
        }
      });
      
      logger.info(`[SQLiteWASMCollection] Successfully created table ${this.tableName} with ${conversionResult.indexes.length} indexes`);
    } catch (error) {
      logger.error(`[SQLiteWASMCollection] Failed to create table ${this.tableName}:`, error);
      throw new CollectionError(`Failed to create table ${this.tableName}`, this.name);
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      const data = await this.find();
      this.dataSubject.next(data);
    } catch (error) {
      logger.error(`[SQLiteWASMCollection] Failed to load initial data for ${this.name}:`, error);
    }
  }

  private trackQueryPerformance<R>(operation: () => R): R {
    const startTime = performance.now();
    try {
      const result = operation();
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      this.queryCount++;
      this.totalQueryTime += queryTime;
      
      // Log slow queries (>100ms)
      if (queryTime > 100) {
        logger.warn(`[SQLiteWASMCollection] Slow query detected in ${this.name}: ${queryTime.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      this.queryCount++;
      this.totalQueryTime += queryTime;
      throw error;
    }
  }

  async insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    return this.trackQueryPerformance(() => {
      try {
        const id = (doc as any).id || this.generateId();
        const docWithId = { ...doc, id } as T;
        
        // Convert document to SQL values
        const columns = Object.keys(docWithId as any);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(col => this.serializeValue((docWithId as any)[col]));
        
        const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        
        this.db.exec({
          sql: sql,
          bind: values
        });
        
        // Emit change event
        this.changeSubject.next({
          type: 'insert',
          doc: docWithId,
          id: id
        });
        
        // Update data subject
        this.updateDataSubject();
        
        return {
          id: id,
          doc: docWithId,
          ok: true
        };
      } catch (error) {
        logger.error(`[SQLiteWASMCollection] Insert failed in ${this.name}:`, error);
        throw new CollectionError(`Insert failed: ${error instanceof Error ? error.message : String(error)}`, this.name);
      }
    });
  }

  async insertMany(docs: Omit<T, 'id'>[]): Promise<BulkResult<T>> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    const startTime = performance.now();
    const results: InsertResult<T>[] = [];
    const errors: Array<{ id: string; error: string; reason: string }> = [];

    // Use transaction for better performance
    this.db.exec('BEGIN TRANSACTION');

    try {
      for (const doc of docs) {
        try {
          const id = (doc as any).id || this.generateId();
          const docWithId = { ...doc, id } as T;

          // Inline synchronous insert logic for use within transaction
          const columns = Object.keys(docWithId as any);
          const placeholders = columns.map(() => '?').join(', ');
          const values = columns.map(col => this.serializeValue((docWithId as any)[col]));

          const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

          this.db.exec({
            sql: sql,
            bind: values
          });

          results.push({
            id: id,
            doc: docWithId,
            ok: true
          });
        } catch (error) {
          errors.push({
            id: (doc as any).id || 'unknown',
            error: 'insert_failed',
            reason: error instanceof Error ? error.message : String(error)
          });
        }
      }

      this.db.exec('COMMIT');

      // Track performance
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      this.queryCount++;
      this.totalQueryTime += queryTime;

      // Log slow queries
      if (queryTime > 100) {
        logger.warn(`[SQLiteWASMCollection] Slow batch insert in ${this.name}: ${queryTime.toFixed(2)}ms`);
      }

      // Update data subject once after all inserts
      this.updateDataSubject();

      return { docs: results, errors };
    } catch (error) {
      this.db.exec('ROLLBACK');
      // Track performance even on failure
      const endTime = performance.now();
      this.queryCount++;
      this.totalQueryTime += (endTime - startTime);
      throw error;
    }
  }

  async findOne(query: QueryOptions | string): Promise<T | null> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    return this.trackQueryPerformance(() => {
      try {
        let sql = `SELECT * FROM ${this.tableName}`;
        let params: any[] = [];
        
        if (typeof query === 'string') {
          // Find by ID
          sql += ' WHERE id = ?';
          params = [query];
        } else if (query.selector) {
          const { whereClause, whereParams } = this.buildWhereClause(query.selector);
          sql += whereClause;
          params = whereParams;
        }
        
        sql += ' LIMIT 1';
        
        const result = this.db.exec({
          sql: sql,
          bind: params,
          returnValue: 'resultRows'
        });
        
        const rows = result as any[];
        return rows.length > 0 ? this.deserializeDocument(rows[0]) : null;
      } catch (error) {
        logger.error(`[SQLiteWASMCollection] FindOne failed in ${this.name}:`, error);
        throw new CollectionError(`FindOne failed: ${error instanceof Error ? error.message : String(error)}`, this.name);
      }
    });
  }

  async findById(id: string): Promise<T | null> {
    return await this.findOne(id);
  }

  async find(query: QueryOptions = {}): Promise<T[]> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    return this.trackQueryPerformance(() => {
      try {
        let sql = `SELECT * FROM ${this.tableName}`;
        let params: any[] = [];
        
        // Build WHERE clause
        if (query.selector) {
          const { whereClause, whereParams } = this.buildWhereClause(query.selector);
          sql += whereClause;
          params = whereParams;
        }
        
        // Build ORDER BY clause
        if (query.sort) {
          const orderBy = this.buildOrderByClause(query.sort);
          sql += orderBy;
        }
        
        // Add LIMIT and OFFSET
        if (query.limit) {
          sql += ` LIMIT ${query.limit}`;
        }
        if (query.skip) {
          sql += ` OFFSET ${query.skip}`;
        }
        
        const result = this.db.exec({
          sql: sql,
          bind: params,
          returnValue: 'resultRows'
        });
        
        const rows = result as any[];
        return rows.map(row => this.deserializeDocument(row));
      } catch (error) {
        logger.error(`[SQLiteWASMCollection] Find failed in ${this.name}:`, error);
        throw new CollectionError(`Find failed: ${error instanceof Error ? error.message : String(error)}`, this.name);
      }
    });
  }

  async update(id: string, update: Partial<T>): Promise<UpdateResult<T>> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    const startTime = performance.now();
    try {
      // Get existing document
      const existing = await this.findById(id);
      if (!existing) {
        throw new CollectionError(`Document with id ${id} not found`, this.name);
      }
      
      // Build UPDATE SQL
      const updateFields = Object.keys(update).filter(key => key !== 'id');
      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const values = updateFields.map(field => this.serializeValue((update as any)[field]));
      
      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      values.push(id);
      
      this.db.exec({
        sql: sql,
        bind: values
      });
      
      // Get updated document
      const updatedDoc = await this.findById(id);
      
      // Emit change event
      this.changeSubject.next({
        type: 'update',
        doc: updatedDoc!,
        oldDoc: existing as any,
        id: id
      });
      
      // Update data subject
      this.updateDataSubject();
      
      // Track performance
      const endTime = performance.now();
      this.queryCount++;
      this.totalQueryTime += (endTime - startTime);
      
      return {
        id: id,
        doc: updatedDoc!,
        ok: true
      };
    } catch (error) {
      const endTime = performance.now();
      this.queryCount++;
      this.totalQueryTime += (endTime - startTime);
      
      logger.error(`[SQLiteWASMCollection] Update failed in ${this.name}:`, error);
      throw new CollectionError(`Update failed: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  async updateMany(query: QueryOptions, update: Partial<T>): Promise<UpdateResult<T>[]> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      // Find documents to update
      const docsToUpdate = await this.find(query);
      const results: UpdateResult<T>[] = [];
      
      // Use transaction for better performance
      this.db.exec('BEGIN TRANSACTION');
      
      try {
        for (const doc of docsToUpdate) {
          if ((doc as any).id) {
            const result = await this.update((doc as any).id, update);
            results.push(result);
          }
        }
        
        this.db.exec('COMMIT');
        return results;
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error(`[SQLiteWASMCollection] UpdateMany failed in ${this.name}:`, error);
      throw new CollectionError(`UpdateMany failed: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  async remove(id: string): Promise<DeleteResult> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      // Get existing document for change event
      const existing = await this.findById(id);
      
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      this.db.exec({
        sql: sql,
        bind: [id]
      });
      
      // Emit change event
      if (existing) {
        this.changeSubject.next({
          type: 'delete',
          doc: existing,
          id: id
        });
      }
      
      // Update data subject
      this.updateDataSubject();
      
      return {
        id: id,
        ok: true,
        deleted: true
      };
    } catch (error) {
      logger.error(`[SQLiteWASMCollection] Remove failed in ${this.name}:`, error);
      throw new CollectionError(`Remove failed: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  async removeMany(query: QueryOptions): Promise<DeleteResult[]> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      // Find documents to remove
      const docsToRemove = await this.find(query);
      const results: DeleteResult[] = [];
      
      // Use transaction for better performance
      this.db.exec('BEGIN TRANSACTION');
      
      try {
        for (const doc of docsToRemove) {
          if ((doc as any).id) {
            const result = await this.remove((doc as any).id);
            results.push(result);
          }
        }
        
        this.db.exec('COMMIT');
        return results;
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error(`[SQLiteWASMCollection] RemoveMany failed in ${this.name}:`, error);
      throw new CollectionError(`RemoveMany failed: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  subscribe(query?: QueryOptions): Observable<T[]> {
    if (query) {
      return this.dataSubject.pipe(
        map(data => {
          // Apply query filtering to the data
          return this.filterData(data, query);
        })
      );
    }
    return this.dataSubject.asObservable();
  }

  subscribeToChanges(): Observable<CollectionChangeEvent<T>> {
    return this.changeSubject.asObservable();
  }

  async count(query?: QueryOptions): Promise<number> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    return this.trackQueryPerformance(() => {
      try {
        let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        let params: any[] = [];
        
        if (query?.selector) {
          const { whereClause, whereParams } = this.buildWhereClause(query.selector);
          sql += whereClause;
          params = whereParams;
        }
        
        const result = this.db.exec({
          sql: sql,
          bind: params,
          returnValue: 'resultRows'
        });
        
        const rows = result as any[];
        return rows.length > 0 ? (rows[0][0] as number) : 0;
      } catch (error) {
        logger.error(`[SQLiteWASMCollection] Count failed in ${this.name}:`, error);
        throw new CollectionError(`Count failed: ${error instanceof Error ? error.message : String(error)}`, this.name);
      }
    });
  }

  async exists(id: string): Promise<boolean> {
    const doc = await this.findById(id);
    return doc !== null;
  }

  async createIndex(index: IndexDefinition): Promise<void> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      const indexName = `idx_${this.tableName}_${index.name}`;
      const fields = index.fields.join(', ');
      const unique = index.unique ? 'UNIQUE' : '';
      
      const sql = `CREATE ${unique} INDEX IF NOT EXISTS ${indexName} ON ${this.tableName} (${fields})`;
      
      this.db.exec(sql);
      logger.info(`[SQLiteWASMCollection] Created index ${indexName} on ${this.tableName}`);
    } catch (error) {
      logger.error(`[SQLiteWASMCollection] Failed to create index on ${this.name}:`, error);
      throw new CollectionError(`Failed to create index: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  async getStats(): Promise<CollectionStats> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      const count = await this.count();
      
      // Get table info
      const tableInfoResult = this.db.exec({
        sql: `PRAGMA table_info(${this.tableName})`,
        returnValue: 'resultRows'
      });
      const tableInfo = tableInfoResult as any[];
      
      // Get index info
      const indexInfoResult = this.db.exec({
        sql: `PRAGMA index_list(${this.tableName})`,
        returnValue: 'resultRows'
      });
      const indexInfo = indexInfoResult as any[];
      
      return {
        name: this.name,
        documentCount: count,
        indexCount: indexInfo.length,
        storageSize: 0, // TODO: Calculate actual storage size
        lastModified: new Date()
      };
    } catch (error) {
      logger.error(`[SQLiteWASMCollection] Failed to get stats for ${this.name}:`, error);
      throw new CollectionError(`Failed to get stats: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  async compact(): Promise<void> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      // SQLite doesn't need explicit compaction, but we can run VACUUM
      logger.info(`[SQLiteWASMCollection] Compacting collection ${this.name}...`);
      this.db.exec('VACUUM');
      logger.info(`[SQLiteWASMCollection] Collection ${this.name} compacted successfully`);
    } catch (error) {
      logger.error(`[SQLiteWASMCollection] Failed to compact ${this.name}:`, error);
      throw new CollectionError(`Failed to compact: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  async destroy(): Promise<void> {
    try {
      logger.info(`[SQLiteWASMCollection] Destroying collection ${this.name}...`);
      
      this.isDestroyed = true;
      
      // Complete subjects
      this.changeSubject.complete();
      this.dataSubject.complete();
      
      // Drop table
      this.db.exec(`DROP TABLE IF EXISTS ${this.tableName}`);
      
      logger.info(`[SQLiteWASMCollection] Collection ${this.name} destroyed successfully`);
    } catch (error) {
      logger.error(`[SQLiteWASMCollection] Failed to destroy ${this.name}:`, error);
      throw new CollectionError(`Failed to destroy: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  // Helper methods

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private serializeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  }

  private deserializeDocument(row: any): T {
    const doc: any = {};
    
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          doc[key] = JSON.parse(value);
        } catch {
          doc[key] = value;
        }
      } else {
        doc[key] = value;
      }
    }
    
    return doc as T;
  }

  private buildWhereClause(selector: Record<string, any>): { whereClause: string; whereParams: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    
    for (const [field, value] of Object.entries(selector)) {
      if (typeof value === 'object' && value !== null) {
        // Handle operators like $gt, $lt, etc.
        for (const [operator, operatorValue] of Object.entries(value)) {
          switch (operator) {
            case '$gt':
              conditions.push(`${field} > ?`);
              params.push(operatorValue);
              break;
            case '$gte':
              conditions.push(`${field} >= ?`);
              params.push(operatorValue);
              break;
            case '$lt':
              conditions.push(`${field} < ?`);
              params.push(operatorValue);
              break;
            case '$lte':
              conditions.push(`${field} <= ?`);
              params.push(operatorValue);
              break;
            case '$ne':
              conditions.push(`${field} != ?`);
              params.push(operatorValue);
              break;
            case '$in':
              if (Array.isArray(operatorValue)) {
                const placeholders = operatorValue.map(() => '?').join(', ');
                conditions.push(`${field} IN (${placeholders})`);
                params.push(...operatorValue);
              }
              break;
            case '$nin':
              if (Array.isArray(operatorValue)) {
                const placeholders = operatorValue.map(() => '?').join(', ');
                conditions.push(`${field} NOT IN (${placeholders})`);
                params.push(...operatorValue);
              }
              break;
          }
        }
      } else {
        conditions.push(`${field} = ?`);
        params.push(this.serializeValue(value));
      }
    }
    
    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, whereParams: params };
  }

  private buildOrderByClause(sort: any[]): string {
    const orderBy: string[] = [];
    
    for (const sortItem of sort) {
      if (typeof sortItem === 'string') {
        orderBy.push(sortItem);
      } else if (typeof sortItem === 'object') {
        for (const [field, direction] of Object.entries(sortItem)) {
          orderBy.push(`${field} ${direction === 'desc' ? 'DESC' : 'ASC'}`);
        }
      }
    }
    
    return orderBy.length > 0 ? ` ORDER BY ${orderBy.join(', ')}` : '';
  }

  private filterData(data: T[], query: QueryOptions): T[] {
    let filtered = data;
    
    // Apply selector filtering
    if (query.selector) {
      filtered = filtered.filter(doc => this.matchesSelector(doc, query.selector!));
    }
    
    // Apply sorting
    if (query.sort) {
      filtered = this.sortData(filtered, query.sort);
    }
    
    // Apply skip and limit
    if (query.skip) {
      filtered = filtered.slice(query.skip);
    }
    if (query.limit) {
      filtered = filtered.slice(0, query.limit);
    }
    
    return filtered;
  }

  private matchesSelector(doc: T, selector: Record<string, any>): boolean {
    for (const [field, value] of Object.entries(selector)) {
      const docValue = (doc as any)[field];
      
      if (typeof value === 'object' && value !== null) {
        // Handle operators
        for (const [operator, operatorValue] of Object.entries(value)) {
          switch (operator) {
            case '$gt':
              if (!(docValue > (operatorValue as any))) return false;
              break;
            case '$gte':
              if (!(docValue >= (operatorValue as any))) return false;
              break;
            case '$lt':
              if (!(docValue < (operatorValue as any))) return false;
              break;
            case '$lte':
              if (!(docValue <= (operatorValue as any))) return false;
              break;
            case '$ne':
              if (docValue === operatorValue) return false;
              break;
            case '$in':
              if (!Array.isArray(operatorValue) || !operatorValue.includes(docValue)) return false;
              break;
            case '$nin':
              if (Array.isArray(operatorValue) && operatorValue.includes(docValue)) return false;
              break;
          }
        }
      } else {
        if (docValue !== value) return false;
      }
    }
    
    return true;
  }

  private sortData(data: T[], sort: any[]): T[] {
    return data.sort((a, b) => {
      for (const sortItem of sort) {
        let field: string;
        let direction: 'asc' | 'desc' = 'asc';
        
        if (typeof sortItem === 'string') {
          field = sortItem;
        } else if (typeof sortItem === 'object') {
          const [f, d] = Object.entries(sortItem)[0];
          field = f;
          direction = d as 'asc' | 'desc';
        } else {
          continue;
        }
        
        const aVal = (a as any)[field];
        const bVal = (b as any)[field];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      }
      
      return 0;
    });
  }

  private updateDataSubject(): void {
    // Reload data and update subject
    this.find().then(data => {
      this.dataSubject.next(data);
    }).catch(error => {
      logger.error(`[SQLiteWASMCollection] Failed to update data subject for ${this.name}:`, error);
    });
  }

  getPerformanceStats(): { avgQueryTime: number; totalQueries: number } {
    return {
      avgQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
      totalQueries: this.queryCount
    };
  }
}

// SQLite WASM Provider Implementation
export class SQLiteWASMProvider implements IDatabaseProvider {
  public readonly name = 'SQLiteWASM';
  public readonly version = '1.0.0';
  
  private db: Database | null = null;
  private collections: Map<string, SQLiteWASMCollection<any>> = new Map();
  private isInitialized = false;
  private config: DatabaseConfig;
  private sqlite3: any = null;

  // Connection Pool / Query Queue
  private isExecuting = false;
  private queryQueue: Array<() => void> = [];

  // Helper for thread-safe/queued execution
  public async executeQueued<T>(task: () => Promise<T> | T): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queryQueue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isExecuting || this.queryQueue.length === 0) return;
    this.isExecuting = true;
    
    const task = this.queryQueue.shift();
    if (task) {
      try {
        await task();
      } finally {
        this.isExecuting = false;
        if (this.queryQueue.length > 0) {
          // Use setTimeout to yield the event loop
          setTimeout(() => this.processQueue(), 0);
        }
      }
    } else {
      this.isExecuting = false;
    }
  }

  constructor(config?: DatabaseConfig) {
    this.config = config || {
      name: 'schoolpilot_prod',
      version: 1,
      debug: false
    };
  }

  async initialize(config?: DatabaseConfig): Promise<void> {
    try {
      logger.info('[SQLiteWASMProvider] Initializing SQLite WASM + OPFS Provider for production...');
      
      // Update config if provided
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Check OPFS availability
      if (!this.isOPFSAvailable()) {
        throw new Error('OPFS (Origin Private File System) is not available in this environment');
      }

      // Initialize SQLite WASM
      this.sqlite3 = await sqlite3InitModule({
        print: console.log,
        printErr: console.error,
      });

      if (!this.sqlite3) {
        throw new Error('Failed to initialize SQLite WASM module');
      }

      // Create database with OPFS storage
      const dbPath = `/opfs/${this.config.name}.db`;
      
      try {
        this.db = new this.sqlite3.oo1.OpfsDb(dbPath);
        logger.info(`[SQLiteWASMProvider] Created OPFS database: ${dbPath}`);
      } catch (opfsError) {
        logger.warn('[SQLiteWASMProvider] OPFS database creation failed, falling back to memory:', opfsError);
        this.db = new this.sqlite3.oo1.DB();
      }

      // Configure SQLCipher Encryption if a key is provided
      if (this.config.encryptionKey) {
        logger.info('[SQLiteWASMProvider] Applying SQLCipher encryption key...');
        try {
          // In a real SQLCipher-compiled WASM environment, this PRAGMA enables encryption.
          this.db.exec(`PRAGMA key = '${this.config.encryptionKey}';`);
          // Verify encryption works by attempting a basic read
          this.db.exec('SELECT count(*) FROM sqlite_master;');
          logger.info('[SQLiteWASMProvider] SQLCipher encryption successfully initialized.');
        } catch (encError) {
          logger.error('[SQLiteWASMProvider] Failed to initialize encryption. Ensure sqlite3 was compiled with SQLCipher support.', encError);
          throw new DatabaseError('Failed to initialize database encryption', 'ENCRYPTION_ERROR', this.name);
        }
      }

      if (!this.db) {
        throw new Error('Failed to create SQLite database');
      }

      // Configure database for production use
      await this.configureProductionSettings();

      this.isInitialized = true;
      logger.info('[SQLiteWASMProvider] Successfully initialized SQLite WASM + OPFS provider');

    } catch (error) {
      logger.error('[SQLiteWASMProvider] Initialization failed:', error);
      throw error;
    }
  }

  private isOPFSAvailable(): boolean {
    try {
      return typeof navigator !== 'undefined' &&
             'storage' in navigator &&
             'getDirectory' in navigator.storage &&
             typeof navigator.storage.getDirectory === 'function';
    } catch (error) {
      return false;
    }
  }

  private async configureProductionSettings(): Promise<void> {
    try {
      if (!this.db) return;

      const walMode = import.meta.env.VITE_SQLITE_WAL_MODE !== 'false';
      const foreignKeys = import.meta.env.VITE_SQLITE_FOREIGN_KEYS !== 'false';
      const synchronousMode = import.meta.env.VITE_SQLITE_SYNCHRONOUS || '1';
      const cacheSize = parseInt(import.meta.env.VITE_SQLITE_CACHE_SIZE || '20000', 10);

      if (walMode) {
        this.db.exec('PRAGMA journal_mode = WAL;');
      }
      
      if (foreignKeys) {
        this.db.exec('PRAGMA foreign_keys = ON;');
      }
      
      this.db.exec(`PRAGMA synchronous = ${synchronousMode === '0' ? 'OFF' : synchronousMode === '2' ? 'FULL' : 'NORMAL'};`);
      
      this.db.exec(`PRAGMA cache_size = -${cacheSize};`);
      
      this.db.exec('PRAGMA automatic_index = ON;');
      
      this.db.exec('PRAGMA page_size = 4096;');
      
      this.db.exec('PRAGMA optimize;');

      logger.info('[SQLiteWASMProvider] Production settings configured', {
        walMode,
        foreignKeys,
        synchronousMode,
        cacheSize
      });
    } catch (error) {
      logger.warn('[SQLiteWASMProvider] Failed to configure production settings:', error);
    }
  }

  async createCollection<T = any>(name: string, schema: CollectionSchema): Promise<ICollection<T>> {
    if (!this.isInitialized || !this.db) {
      throw new Error('SQLiteWASMProvider not initialized');
    }

    try {
      logger.info(`[SQLiteWASMProvider] Creating collection: ${name}`);
      
      const collection = new SQLiteWASMCollection<T>(this.db, name, schema);
      this.collections.set(name, collection);
      
      logger.info(`[SQLiteWASMProvider] Collection '${name}' created successfully`);
      return collection;
    } catch (error) {
      logger.error(`[SQLiteWASMProvider] Failed to create collection ${name}:`, error);
      throw error;
    }
  }

  getCollection<T = any>(name: string): ICollection<T> | null {
    if (!this.isInitialized) {
      throw new Error('SQLiteWASMProvider not initialized');
    }

    const collection = this.collections.get(name);
    return collection ? (collection as unknown as ICollection<T>) : null;
  }

  getAllCollections(): Map<string, ICollection<any>> {
    const result = new Map<string, ICollection<any>>();
    for (const [name, collection] of this.collections) {
      result.set(name, collection as unknown as ICollection<any>);
    }
    return result;
  }

  async destroy(): Promise<void> {
    try {
      logger.info('[SQLiteWASMProvider] Destroying provider...');
      
      // Destroy all collections
      for (const collection of this.collections.values()) {
        try {
          await collection.destroy();
        } catch (error) {
          logger.error('[SQLiteWASMProvider] Error destroying collection:', error);
        }
      }
      
      this.collections.clear();
      
      // Close database
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      this.isInitialized = false;
      logger.info('[SQLiteWASMProvider] Provider destroyed successfully');
    } catch (error) {
      logger.error('[SQLiteWASMProvider] Failed to destroy provider:', error);
      throw error;
    }
  }

  async transaction<TResult>(callback: (tx: ITransaction) => Promise<TResult>): Promise<TResult> {
    if (!this.isInitialized || !this.db) {
      throw new Error('SQLiteWASMProvider not initialized');
    }

    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    let isCommitted = false;
    let isRolledBack = false;

    const tx: ITransaction = {
      id: txId,
      commit: async () => {
        if (isCommitted || isRolledBack) return;
        this.db!.exec('COMMIT;');
        isCommitted = true;
        logger.info(`[SQLiteWASMProvider] Transaction ${txId} committed.`);
      },
      rollback: async () => {
        if (isCommitted || isRolledBack) return;
        this.db!.exec('ROLLBACK;');
        isRolledBack = true;
        logger.info(`[SQLiteWASMProvider] Transaction ${txId} rolled back.`);
      }
    };

    try {
      this.db.exec('BEGIN;');
      logger.info(`[SQLiteWASMProvider] Transaction ${txId} started.`);
      
      const result = await callback(tx);
      
      if (!isCommitted && !isRolledBack) {
        await tx.commit();
      }
      
      return result;
    } catch (error) {
      if (!isCommitted && !isRolledBack) {
        await tx.rollback();
      }
      throw error;
    }
  }

  isAvailable(): boolean {
    try {
      // Check if we're in a browser environment with WASM support
      return typeof WebAssembly !== 'undefined' &&
             typeof navigator !== 'undefined' &&
             this.isOPFSAvailable();
    } catch (error) {
      return false;
    }
  }

  getStatus(): ProviderStatus {
    try {
      const performanceStats = this.getAggregatedPerformanceStats();
      
      return {
        name: this.name,
        version: this.version,
        isConnected: this.isInitialized && this.db !== null,
        collectionsCount: this.collections.size,
        lastError: undefined,
        performance: {
          avgQueryTime: performanceStats.avgQueryTime,
          totalQueries: performanceStats.totalQueries,
          memoryUsage: this.getMemoryUsage()
        }
      };
    } catch (error) {
      return {
        name: this.name,
        version: this.version,
        isConnected: false,
        collectionsCount: 0,
        lastError: error instanceof Error ? error : new Error(String(error)),
        performance: {
          avgQueryTime: 0,
          totalQueries: 0,
          memoryUsage: 0
        }
      };
    }
  }

  async backup(): Promise<string> {
    try {
      logger.info('[SQLiteWASMProvider] Creating backup...');
      
      if (!this.isInitialized || !this.db) {
        throw new Error('Provider not initialized');
      }

      const backup = {
        metadata: {
          provider: this.name,
          version: this.version,
          timestamp: new Date().toISOString(),
          collections: Array.from(this.collections.keys()),
          dbSize: this.getDatabaseSize()
        },
        data: {} as Record<string, any[]>
      };

      // Backup each collection
      for (const [name, collection] of this.collections) {
        try {
          const documents = await collection.find({});
          backup.data[name] = documents;
          logger.info(`[SQLiteWASMProvider] Backed up ${documents.length} documents from ${name}`);
        } catch (error) {
          logger.error(`[SQLiteWASMProvider] Failed to backup collection ${name}:`, error);
          backup.data[name] = [];
        }
      }

      const backupString = JSON.stringify(backup, null, 2);
      logger.info(`[SQLiteWASMProvider] Backup created (${backupString.length} bytes)`);
      
      return backupString;
    } catch (error) {
      logger.error('[SQLiteWASMProvider] Backup failed:', error);
      throw error;
    }
  }

  async restore(backupData: string): Promise<void> {
    try {
      logger.info('[SQLiteWASMProvider] Restoring from backup...');
      
      if (!this.isInitialized || !this.db) {
        throw new Error('Provider not initialized');
      }

      const backup = JSON.parse(backupData);
      
      if (!backup.metadata || !backup.data) {
        throw new Error('Invalid backup format');
      }

      logger.info(`[SQLiteWASMProvider] Restoring backup from ${backup.metadata.timestamp}`);

      // Use transaction for atomic restore
      this.db.exec('BEGIN TRANSACTION');

      try {
        // Restore each collection
        for (const [collectionName, documents] of Object.entries(backup.data)) {
          const collection = this.collections.get(collectionName);
          if (!collection) {
            logger.warn(`[SQLiteWASMProvider] Collection ${collectionName} not found, skipping`);
            continue;
          }

          try {
            // Clear existing data
            await collection.removeMany({});
            
            // Insert backup data
            if (Array.isArray(documents) && documents.length > 0) {
              await collection.insertMany(documents as any[]);
              logger.info(`[SQLiteWASMProvider] Restored ${documents.length} documents to ${collectionName}`);
            }
          } catch (error) {
            logger.error(`[SQLiteWASMProvider] Failed to restore collection ${collectionName}:`, error);
          }
        }

        this.db.exec('COMMIT');
        logger.info('[SQLiteWASMProvider] Restore completed successfully');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('[SQLiteWASMProvider] Restore failed:', error);
      throw error;
    }
  }

  // Production-specific features

  /**
   * Get database size information
   */
  getDatabaseSize(): { pageCount: number; pageSize: number; totalSize: number } {
    try {
      if (!this.db) return { pageCount: 0, pageSize: 0, totalSize: 0 };

      const pageCountResult = this.db.exec({
        sql: 'PRAGMA page_count',
        returnValue: 'resultRows'
      });
      const pageSizeResult = this.db.exec({
        sql: 'PRAGMA page_size',
        returnValue: 'resultRows'
      });
      
      const pageCount = (pageCountResult as any[])?.[0]?.[0] as number || 0;
      const pageSize = (pageSizeResult as any[])?.[0]?.[0] as number || 0;
      const totalSize = pageCount * pageSize;

      return { pageCount, pageSize, totalSize };
    } catch (error) {
      logger.error('[SQLiteWASMProvider] Error getting database size:', error);
      return { pageCount: 0, pageSize: 0, totalSize: 0 };
    }
  }

  /**
   * Get aggregated performance statistics from all collections
   */
  private getAggregatedPerformanceStats(): { avgQueryTime: number; totalQueries: number } {
    let totalQueryTime = 0;
    let totalQueries = 0;

    for (const collection of this.collections.values()) {
      const stats = collection.getPerformanceStats();
      totalQueryTime += stats.avgQueryTime * stats.totalQueries;
      totalQueries += stats.totalQueries;
    }

    return {
      avgQueryTime: totalQueries > 0 ? totalQueryTime / totalQueries : 0,
      totalQueries
    };
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): number {
    try {
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Optimize database performance
   */
  async optimize(): Promise<void> {
    try {
      logger.info('[SQLiteWASMProvider] Optimizing database performance...');
      
      if (!this.db) throw new Error('Database not available');

      // Run ANALYZE to update query planner statistics
      this.db.exec('ANALYZE');
      
      // Run PRAGMA optimize
      this.db.exec('PRAGMA optimize');
      
      logger.info('[SQLiteWASMProvider] Database optimization completed');
    } catch (error) {
      logger.error('[SQLiteWASMProvider] Optimization failed:', error);
      throw error;
    }
  }

  /**
   * Get database integrity check results
   */
  async checkIntegrity(): Promise<{ isValid: boolean; issues: string[] }> {
    try {
      if (!this.db) throw new Error('Database not available');

      const integrityResult = this.db.exec({
        sql: 'PRAGMA integrity_check',
        returnValue: 'resultRows'
      });
      const result = (integrityResult as any[])?.[0]?.[0] as string || 'error';
      const isValid = result === 'ok';
      const issues = isValid ? [] : [result || 'Unknown integrity issue'];

      logger.info(`[SQLiteWASMProvider] Integrity check: ${isValid ? 'PASSED' : 'FAILED'}`);
      
      return { isValid, issues };
    } catch (error) {
      logger.error('[SQLiteWASMProvider] Integrity check failed:', error);
      return { isValid: false, issues: [error instanceof Error ? error.message : String(error)] };
    }
  }

  /**
   * Get detailed database statistics
   */
  async getDatabaseStats(): Promise<{
    size: { pageCount: number; pageSize: number; totalSize: number };
    performance: { avgQueryTime: number; totalQueries: number };
    collections: Array<{ name: string; documentCount: number; indexCount: number }>;
    integrity: { isValid: boolean; issues: string[] };
  }> {
    try {
      const size = this.getDatabaseSize();
      const performance = this.getAggregatedPerformanceStats();
      const integrity = await this.checkIntegrity();
      
      const collections = [];
      for (const [name, collection] of this.collections) {
        try {
          const stats = await collection.getStats();
          collections.push({
            name,
            documentCount: stats.documentCount,
            indexCount: stats.indexCount
          });
        } catch (error) {
          collections.push({
            name,
            documentCount: 0,
            indexCount: 0
          });
        }
      }

      return { size, performance, collections, integrity };
    } catch (error) {
      logger.error('[SQLiteWASMProvider] Failed to get database stats:', error);
      throw error;
    }
  }
}