import { logger } from '@/utils/logging';

/**
 * SQLite Provider
 * 
 * Implementation of DataProvider using SQLite with OPFS (Origin Private File System)
 * for standalone/single-user deployment mode.
 * 
 * Features:
 * - Full SQL support with SQLite WASM
 * - Persistent storage via OPFS
 * - Transaction support
 * - Export/Import for backup
 * - Change tracking for sync preparation
 */

import { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type {
  DataProvider,
  ProviderCapabilities,
  Query,
  PaginatedResult,
  WriteOptions,
  Operation,
  Filter,
  SyncResult,
  Change
} from '../types';

// SQLite WASM types (will be loaded dynamically)
interface SQLiteDB {
  run(sql: string, params?: any[]): void;
  exec(sql: string): any[];
  prepare(sql: string): SQLiteStatement;
  export(): Uint8Array;
  close(): void;
}

interface SQLiteStatement {
  run(params?: any[]): { changes: number; lastInsertRowid: number };
  get(params?: any[]): any;
  all(params?: any[]): any[];
  free(): void;
}

interface SQLiteJS {
  Database: new (data?: Uint8Array) => SQLiteDB;
}

interface SQLiteConfig {
  filename?: string;
  encryptionKey?: string;
  enableChangeTracking?: boolean;
}

export class SQLiteProvider implements DataProvider {
  readonly name = 'sqlite';
  readonly version = '1.0.0';
  readonly capabilities: ProviderCapabilities = {
    realtime: false,  // Will use polling
    sync: false,      // Sync handled by SyncEngine
    transactions: true,
    offline: true,
    encryption: true,
    fullTextSearch: true,
    relations: true
  };

  private db: SQLiteDB | null = null;
  private SQLite: SQLiteJS | null = null;
  private config: SQLiteConfig = {};
  private opfsRoot: FileSystemDirectoryHandle | null = null;
  private changeTracking: Change[] = [];
  private enableChangeTracking = false;
  private tableSchemas: Map<string, TableSchema> = new Map();
  
  // Observable for change notifications
  private changeSubject = new BehaviorSubject<Change | null>(null);
  public changes$ = this.changeSubject.asObservable();

  async initialize(config: SQLiteConfig): Promise<void> {
    this.config = {
      filename: 'schoolpilot.db',
      enableChangeTracking: true,
      ...config
    };
    
    this.enableChangeTracking = this.config.enableChangeTracking ?? true;

    try {
      // Dynamically import sqlite-wasm
      const sqliteModule = await import('@sqlite.org/sqlite-wasm');
      this.SQLite = sqliteModule.default;

      // Initialize OPFS
      await this.initializeOPFS();
      
      // Load or create database
      await this.loadDatabase();
      
      // Initialize schema
      await this.initializeSchema();
      
      // Create change tracking table if enabled
      if (this.enableChangeTracking) {
        await this.initializeChangeTracking();
      }

      logger.info('✅ SQLiteProvider initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize SQLiteProvider:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (this.db) {
      await this.saveToOPFS();
      this.db.close();
      this.db = null;
    }
  }

  // ==================== CRUD Operations ====================

  async find<T>(collection: string, query: Query): Promise<PaginatedResult<T>> {
    this.ensureInitialized();

    const { whereClause, params } = this.buildWhereClause(query.filter);
    const orderClause = this.buildOrderClause(query.sort);
    const { limit, offset } = this.buildPagination(query.pagination);

    // Build SQL
    let sql = `SELECT * FROM ${this.escapeIdentifier(collection)}`;
    if (whereClause) sql += ` WHERE ${whereClause}`;
    if (orderClause) sql += ` ORDER BY ${orderClause}`;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    // Execute query
    const stmt = this.db!.prepare(sql);
    const rows = stmt.all(params);
    stmt.free();

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM ${this.escapeIdentifier(collection)}${whereClause ? ` WHERE ${whereClause}` : ''}`;
    const countStmt = this.db!.prepare(countSql);
    const countResult = countStmt.get(params);
    countStmt.free();
    const totalCount = countResult?.count || 0;

    // Transform rows
    const data = rows.map(row => this.transformRow(row));

    return {
      data,
      pagination: {
        page: query.pagination?.page || 1,
        pageSize: limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: offset + limit < totalCount,
        hasPreviousPage: offset > 0
      }
    };
  }

  async findOne<T>(collection: string, id: string): Promise<T | null> {
    this.ensureInitialized();

    const sql = `SELECT * FROM ${this.escapeIdentifier(collection)} WHERE id = ?`;
    const stmt = this.db!.prepare(sql);
    const row = stmt.get([id]);
    stmt.free();

    return row ? this.transformRow(row) : null;
  }

  async findByIds<T>(collection: string, ids: string[]): Promise<T[]> {
    this.ensureInitialized();

    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT * FROM ${this.escapeIdentifier(collection)} WHERE id IN (${placeholders})`;
    const stmt = this.db!.prepare(sql);
    const rows = stmt.all(ids);
    stmt.free();

    return rows.map(row => this.transformRow(row));
  }

  async create<T>(collection: string, data: any, options?: WriteOptions): Promise<T> {
    this.ensureInitialized();

    const id = data.id || this.generateId();
    const timestamp = new Date().toISOString();
    
    const record = {
      ...data,
      id,
      created_at: timestamp,
      updated_at: timestamp,
      version: 1
    };

    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(',');
    const values = Object.values(record);

    const sql = `INSERT INTO ${this.escapeIdentifier(collection)} (${columns.map(c => this.escapeIdentifier(c)).join(',')}) VALUES (${placeholders})`;
    
    const stmt = this.db!.prepare(sql);
    stmt.run(values);
    stmt.free();

    // Track change
    if (this.enableChangeTracking) {
      await this.trackChange('create', collection, id, record);
    }

    // Notify observers
    this.changeSubject.next({
      id: `${collection}:${id}`,
      collection,
      type: 'create',
      timestamp: Date.now(),
      data: record
    });

    return record as T;
  }

  async update<T>(collection: string, id: string, data: any, options?: WriteOptions): Promise<T> {
    this.ensureInitialized();

    // Get current record
    const current = await this.findOne<T>(collection, id);
    if (!current) {
      throw new Error(`Record ${id} not found in ${collection}`);
    }

    const timestamp = new Date().toISOString();
    const updates = {
      ...data,
      updated_at: timestamp,
      version: ((current as any).version || 0) + 1
    };

    const sets = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => `${this.escapeIdentifier(key)} = ?`)
      .join(', ');
    
    const values = [...Object.values(updates), id];

    const sql = `UPDATE ${this.escapeIdentifier(collection)} SET ${sets} WHERE id = ?`;
    
    const stmt = this.db!.prepare(sql);
    stmt.run(values);
    stmt.free();

    // Get updated record
    const updated = await this.findOne<T>(collection, id);

    // Track change
    if (this.enableChangeTracking) {
      await this.trackChange('update', collection, id, updated);
    }

    // Notify observers
    this.changeSubject.next({
      id: `${collection}:${id}`,
      collection,
      type: 'update',
      timestamp: Date.now(),
      data: updated
    });

    return updated!;
  }

  async delete(collection: string, id: string, options?: WriteOptions): Promise<void> {
    this.ensureInitialized();

    const sql = `DELETE FROM ${this.escapeIdentifier(collection)} WHERE id = ?`;
    const stmt = this.db!.prepare(sql);
    stmt.run([id]);
    stmt.free();

    // Track change
    if (this.enableChangeTracking) {
      await this.trackChange('delete', collection, id, null);
    }

    // Notify observers
    this.changeSubject.next({
      id: `${collection}:${id}`,
      collection,
      type: 'delete',
      timestamp: Date.now(),
      data: null
    });
  }

  // ==================== Real-time Subscriptions ====================

  subscribe<T>(collection: string, query: Query): Observable<T[]> {
    // SQLite doesn't have native pub/sub, so we poll
    return new Observable(subscriber => {
      // Initial fetch
      this.find<T>(collection, query).then(result => {
        subscriber.next(result.data);
      });

      // Subscribe to changes and refetch
      const subscription = this.changes$.subscribe(change => {
        if (change?.collection === collection) {
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
    this.ensureInitialized();

    const results: T[] = [];
    
    // Use transaction for atomicity
    this.db!.run('BEGIN TRANSACTION');
    
    try {
      for (const item of data) {
        const result = await this.create<T>(collection, item, { silent: true });
        results.push(result);
      }
      this.db!.run('COMMIT');
    } catch (error) {
      this.db!.run('ROLLBACK');
      throw error;
    }

    return results;
  }

  async bulkUpdate<T>(collection: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    this.ensureInitialized();

    const results: T[] = [];
    
    this.db!.run('BEGIN TRANSACTION');
    
    try {
      for (const { id, data } of updates) {
        const result = await this.update<T>(collection, id, data, { silent: true });
        results.push(result);
      }
      this.db!.run('COMMIT');
    } catch (error) {
      this.db!.run('ROLLBACK');
      throw error;
    }

    return results;
  }

  async bulkDelete(collection: string, ids: string[]): Promise<void> {
    this.ensureInitialized();

    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM ${this.escapeIdentifier(collection)} WHERE id IN (${placeholders})`;
    
    const stmt = this.db!.prepare(sql);
    stmt.run(ids);
    stmt.free();
  }

  // ==================== Transactions ====================

  async transaction<T>(operations: Operation[]): Promise<T> {
    this.ensureInitialized();

    this.db!.run('BEGIN TRANSACTION');
    
    try {
      const results: any[] = [];
      
      for (const op of operations) {
        let result;
        switch (op.type) {
          case 'create':
            result = await this.create(op.collection, op.data, { silent: true });
            break;
          case 'update':
            result = await this.update(op.collection, op.id!, op.data, { silent: true });
            break;
          case 'delete':
            result = await this.delete(op.collection, op.id!, { silent: true });
            break;
        }
        results.push(result);
      }
      
      this.db!.run('COMMIT');
      return results as T;
    } catch (error) {
      this.db!.run('ROLLBACK');
      throw error;
    }
  }

  // ==================== Utility Methods ====================

  async count(collection: string, filter?: Filter): Promise<number> {
    this.ensureInitialized();

    const { whereClause, params } = this.buildWhereClause(filter);
    const sql = `SELECT COUNT(*) as count FROM ${this.escapeIdentifier(collection)}${whereClause ? ` WHERE ${whereClause}` : ''}`;
    
    const stmt = this.db!.prepare(sql);
    const result = stmt.get(params);
    stmt.free();

    return result?.count || 0;
  }

  async exists(collection: string, id: string): Promise<boolean> {
    const count = await this.count(collection, { id: { $eq: id } });
    return count > 0;
  }

  async export(): Promise<Blob> {
    this.ensureInitialized();

    // Save to OPFS first to ensure all changes are persisted
    await this.saveToOPFS();

    // Export database
    const data = this.db!.export();
    
    return new Blob([data], { type: 'application/x-sqlite3' });
  }

  async import(data: Blob): Promise<void> {
    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Close current database
    if (this.db) {
      this.db.close();
    }

    // Create new database from imported data
    this.db = new this.SQLite!.Database(uint8Array);

    // Save to OPFS
    await this.saveToOPFS();
  }

  // ==================== Schema Management ====================

  async ensureCollection(name: string, schema: TableSchema): Promise<void> {
    this.ensureInitialized();

    // Check if table exists
    const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
    const stmt = this.db!.prepare(sql);
    const result = stmt.get([name]);
    stmt.free();

    if (!result) {
      // Create table
      const columns = Object.entries(schema.columns)
        .map(([colName, colDef]) => {
          const def = `${this.escapeIdentifier(colName)} ${colDef.type}`;
          if (colDef.primaryKey) return `${def} PRIMARY KEY`;
          if (colDef.notNull) return `${def} NOT NULL`;
          if (colDef.default !== undefined) return `${def} DEFAULT ${colDef.default}`;
          return def;
        })
        .join(', ');

      const createSql = `CREATE TABLE ${this.escapeIdentifier(name)} (${columns})`;
      this.db!.run(createSql);

      // Create indexes
      if (schema.indexes) {
        for (const index of schema.indexes) {
          const indexColumns = index.columns.map(c => this.escapeIdentifier(c)).join(', ');
          const indexSql = `CREATE ${index.unique ? 'UNIQUE' : ''} INDEX IF NOT EXISTS ${this.escapeIdentifier(index.name)} ON ${this.escapeIdentifier(name)} (${indexColumns})`;
          this.db!.run(indexSql);
        }
      }

      this.tableSchemas.set(name, schema);
    }
  }

  // ==================== Private Methods ====================

  private async initializeOPFS(): Promise<void> {
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      this.opfsRoot = await navigator.storage.getDirectory();
    } else {
      throw new Error('OPFS not supported in this browser');
    }
  }

  private async loadDatabase(): Promise<void> {
    if (!this.opfsRoot || !this.SQLite) {
      throw new Error('Not initialized');
    }

    try {
      // Try to open existing file
      const fileHandle = await this.opfsRoot.getFileHandle(this.config.filename!);
      const file = await fileHandle.getFile();
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      // Create database from file
      this.db = new this.SQLite.Database(data);
      logger.info('📂 Loaded existing database from OPFS');
    } catch (error) {
      // Create new database
      this.db = new this.SQLite.Database();
      logger.info('🆕 Created new database');
    }
  }

  private async saveToOPFS(): Promise<void> {
    if (!this.opfsRoot || !this.db) return;

    try {
      const data = this.db.export();
      
      // Write to OPFS
      const fileHandle = await this.opfsRoot.getFileHandle(this.config.filename!, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
    } catch (error) {
      logger.error('Failed to save database to OPFS:', error);
    }
  }

  private async initializeSchema(): Promise<void> {
    // Create metadata table for tracking schema version
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS _metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      )
    `);

    // Create standard columns for all tables
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS _collections (
        name TEXT PRIMARY KEY,
        schema TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);
  }

  private async initializeChangeTracking(): Promise<void> {
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS _changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT,
        timestamp TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      )
    `);

    // Create index for efficient querying
    this.db!.run(`
      CREATE INDEX IF NOT EXISTS idx_changes_synced ON _changes(synced, timestamp)
    `);
  }

  private async trackChange(operation: 'create' | 'update' | 'delete', collection: string, recordId: string, data: any): Promise<void> {
    const sql = `
      INSERT INTO _changes (collection, record_id, operation, data, timestamp, synced)
      VALUES (?, ?, ?, ?, ?, 0)
    `;
    
    const stmt = this.db!.prepare(sql);
    stmt.run([
      collection,
      recordId,
      operation,
      data ? JSON.stringify(data) : null,
      new Date().toISOString()
    ]);
    stmt.free();
  }

  private buildWhereClause(filter?: Filter): { whereClause: string; params: any[] } {
    if (!filter || Object.keys(filter).length === 0) {
      return { whereClause: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    for (const [field, condition] of Object.entries(filter)) {
      if (typeof condition === 'object' && condition !== null) {
        if ('$eq' in condition) {
          conditions.push(`${this.escapeIdentifier(field)} = ?`);
          params.push(condition.$eq);
        } else if ('$ne' in condition) {
          conditions.push(`${this.escapeIdentifier(field)} != ?`);
          params.push(condition.$ne);
        } else if ('$gt' in condition) {
          conditions.push(`${this.escapeIdentifier(field)} > ?`);
          params.push(condition.$gt);
        } else if ('$gte' in condition) {
          conditions.push(`${this.escapeIdentifier(field)} >= ?`);
          params.push(condition.$gte);
        } else if ('$lt' in condition) {
          conditions.push(`${this.escapeIdentifier(field)} < ?`);
          params.push(condition.$lt);
        } else if ('$lte' in condition) {
          conditions.push(`${this.escapeIdentifier(field)} <= ?`);
          params.push(condition.$lte);
        } else if ('$in' in condition) {
          const placeholders = (condition.$in as any[]).map(() => '?').join(',');
          conditions.push(`${this.escapeIdentifier(field)} IN (${placeholders})`);
          params.push(...condition.$in);
        } else if ('$contains' in condition) {
          conditions.push(`${this.escapeIdentifier(field)} LIKE ?`);
          params.push(`%${condition.$contains}%`);
        } else if ('$startsWith' in condition) {
          conditions.push(`${this.escapeIdentifier(field)} LIKE ?`);
          params.push(`${condition.$startsWith}%`);
        } else if ('$endsWith' in condition) {
          conditions.push(`${this.escapeIdentifier(field)} LIKE ?`);
          params.push(`%${condition.$endsWith}`);
        }
      } else {
        conditions.push(`${this.escapeIdentifier(field)} = ?`);
        params.push(condition);
      }
    }

    return { whereClause: conditions.join(' AND '), params };
  }

  private buildOrderClause(sort?: Array<{ field: string; direction: 'asc' | 'desc' }>): string {
    if (!sort || sort.length === 0) return '';
    
    return sort
      .map(s => `${this.escapeIdentifier(s.field)} ${s.direction.toUpperCase()}`)
      .join(', ');
  }

  private buildPagination(pagination?: { page?: number; pageSize?: number }): { limit: number; offset: number } {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 50;
    
    return {
      limit: pageSize,
      offset: (page - 1) * pageSize
    };
  }

  private escapeIdentifier(identifier: string): string {
    // Simple escaping for SQLite identifiers
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private transformRow(row: any): any {
    // Convert snake_case to camelCase and parse JSON fields
    const result: any = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Try to parse JSON strings
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          result[camelKey] = JSON.parse(value);
        } catch {
          result[camelKey] = value;
        }
      } else {
        result[camelKey] = value;
      }
    }
    return result;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error('SQLiteProvider not initialized. Call initialize() first.');
    }
  }
}

// Table schema definition
interface TableSchema {
  columns: Record<string, {
    type: string;
    primaryKey?: boolean;
    notNull?: boolean;
    default?: any;
  }>;
  indexes?: Array<{
    name: string;
    columns: string[];
    unique?: boolean;
  }>;
}

export default SQLiteProvider;
