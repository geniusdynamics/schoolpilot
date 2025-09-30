// ABOUTME: SQLite File Service for development mode with file storage
// ABOUTME: Provides SQLite database with regular file storage for easy inspection and exploration

import { ICollection, CollectionSchema, InsertResult, UpdateResult, DeleteResult, QueryOptions, BulkResult } from '../database/interfaces';
import { CollectionError, DatabaseError } from '../database/interfaces';
import { SchemaConverter } from '../database/SchemaConverter';
import { v4 as uuidv4 } from 'uuid';
import { Subject } from 'rxjs';

// SQLite WASM types
type SqlValue = string | number | null | bigint | Uint8Array | Int8Array | ArrayBuffer;
type BindableValue = SqlValue | undefined | boolean;
type BindingSpec = readonly BindableValue[] | { [paramName: string]: BindableValue } | (SqlValue | boolean);

// SQLite Collection Implementation for File Storage
export class SQLiteFileCollection<T extends { id?: string }> implements ICollection<T> {
  private db: any; // Will be set by the service
  private isDestroyed = false;
  private changeSubject = new Subject<{ action: string; doc: T; id?: string }>();
  public readonly changes$ = this.changeSubject.asObservable();

  constructor(
    private sqliteService: SQLiteFileService,
    private dbName: string,
    public readonly name: string,
    public readonly schema: CollectionSchema
  ) {
    this.db = sqliteService.getDatabase();
    this.createTable();
  }

  private createTable(): void {
    try {
      const sqlSchema = SchemaConverter.convertToSQL(this.schema, this.name);
      this.db.exec(sqlSchema.createTable);
      
      // Create indexes
      sqlSchema.indexes.forEach(indexSql => {
        try {
          this.db.exec(indexSql);
        } catch (error) {
          // Index might already exist, ignore error
          console.warn(`[SQLiteFile] Index creation warning for ${this.name}:`, error.message);
        }
      });
      
      console.log(`[SQLiteFile] Table '${this.name}' created successfully`);
    } catch (error) {
      console.error(`[SQLiteFile] Failed to create table '${this.name}':`, error);
      throw new CollectionError(
        `Failed to create table for collection '${this.name}': ${error.message}`,
        this.name
      );
    }
  }

  async insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      const id = uuidv4();
      const docWithId = { ...doc, id } as T;
      
      // Get column names from schema
      const columns = Object.keys(this.schema.properties);
      const placeholders = columns.map(() => '?').join(', ');
      const columnNames = columns.join(', ');
      
      const sql = `INSERT INTO ${this.name} (${columnNames}) VALUES (${placeholders})`;
      const values = columns.map(col => (docWithId as any)[col] ?? null);
      
      this.db.exec({
        sql,
        bind: values
      });
      
      this.changeSubject.next({ action: 'INSERT', doc: docWithId, id });
      
      return {
        id,
        doc: docWithId,
        success: true
      };
    } catch (error) {
      throw new CollectionError(
        `Failed to insert document in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async insertMany(docs: Omit<T, 'id'>[]): Promise<BulkResult<T>> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    const results: InsertResult<T>[] = [];
    const errors: { doc: Omit<T, 'id'>; error: Error }[] = [];

    for (const doc of docs) {
      try {
        const result = await this.insert(doc);
        results.push(result);
      } catch (error) {
        errors.push({ doc, error: error as Error });
      }
    }

    return {
      success: results,
      errors,
      total: docs.length,
      successCount: results.length,
      errorCount: errors.length
    };
  }

  async findOne(query: Partial<T> = {}): Promise<T | null> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      const results = await this.find(query, { limit: 1 });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      throw new CollectionError(
        `Failed to find document in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async findById(id: string): Promise<T | null> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      const sql = `SELECT * FROM ${this.name} WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.get([id]);
      stmt.finalize();
      
      return result ? this.parseRow(result) : null;
    } catch (error) {
      throw new CollectionError(
        `Failed to find document by ID in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async find(query: Partial<T> = {}, options: QueryOptions = {}): Promise<T[]> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      let sql = `SELECT * FROM ${this.name}`;
      const bindings: any[] = [];
      
      // Build WHERE clause
      if (Object.keys(query).length > 0) {
        const conditions = Object.entries(query)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => {
            bindings.push(value);
            return `${key} = ?`;
          });
        
        if (conditions.length > 0) {
          sql += ` WHERE ${conditions.join(' AND ')}`;
        }
      }
      
      // Add sorting
      if (options.sort) {
        const sortClauses = Object.entries(options.sort)
          .map(([field, direction]) => `${field} ${direction === 1 ? 'ASC' : 'DESC'}`);
        sql += ` ORDER BY ${sortClauses.join(', ')}`;
      }
      
      // Add pagination
      if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
        if (options.skip) {
          sql += ` OFFSET ${options.skip}`;
        }
      }
      
      const stmt = this.db.prepare(sql);
      const results = stmt.all(bindings);
      stmt.finalize();
      
      return results.map(row => this.parseRow(row));
    } catch (error) {
      throw new CollectionError(
        `Failed to find documents in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async update(id: string, update: Partial<T>): Promise<UpdateResult<T>> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      const existing = await this.findById(id);
      if (!existing) {
        return {
          id,
          success: false,
          error: 'Document not found'
        };
      }
      
      const updateFields = Object.entries(update)
        .filter(([key, _]) => key !== 'id')
        .filter(([_, value]) => value !== undefined);
      
      if (updateFields.length === 0) {
        return {
          id,
          doc: existing,
          success: true
        };
      }
      
      const setClause = updateFields.map(([key, _]) => `${key} = ?`).join(', ');
      const values = updateFields.map(([_, value]) => value);
      values.push(id);
      
      const sql = `UPDATE ${this.name} SET ${setClause} WHERE id = ?`;
      
      this.db.exec({
        sql,
        bind: values
      });
      
      const updatedDoc = { ...existing, ...update } as T;
      this.changeSubject.next({ action: 'UPDATE', doc: updatedDoc, id });
      
      return {
        id,
        doc: updatedDoc,
        success: true
      };
    } catch (error) {
      throw new CollectionError(
        `Failed to update document in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async remove(id: string): Promise<DeleteResult> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      const existing = await this.findById(id);
      if (!existing) {
        return {
          id,
          success: false,
          error: 'Document not found'
        };
      }
      
      const sql = `DELETE FROM ${this.name} WHERE id = ?`;
      
      this.db.exec({
        sql,
        bind: [id]
      });
      
      this.changeSubject.next({ action: 'DELETE', doc: existing, id });
      
      return {
        id,
        success: true
      };
    } catch (error) {
      throw new CollectionError(
        `Failed to remove document from ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async count(query: Partial<T> = {}): Promise<number> {
    if (this.isDestroyed) {
      throw new CollectionError('Collection has been destroyed', this.name);
    }

    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.name}`;
      const bindings: any[] = [];
      
      if (Object.keys(query).length > 0) {
        const conditions = Object.entries(query)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => {
            bindings.push(value);
            return `${key} = ?`;
          });
        
        if (conditions.length > 0) {
          sql += ` WHERE ${conditions.join(' AND ')}`;
        }
      }
      
      const stmt = this.db.prepare(sql);
      const result = stmt.get(bindings);
      stmt.finalize();
      
      return result?.count || 0;
    } catch (error) {
      throw new CollectionError(
        `Failed to count documents in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  private parseRow(row: any): T {
    const parsed = { ...row };
    
    // Parse JSON fields based on schema
    Object.entries(this.schema.properties).forEach(([key, prop]) => {
      if (prop.type === 'object' || prop.type === 'array') {
        if (parsed[key] && typeof parsed[key] === 'string') {
          try {
            parsed[key] = JSON.parse(parsed[key]);
          } catch (error) {
            console.warn(`[SQLiteFile] Failed to parse JSON field '${key}' in ${this.name}:`, error);
          }
        }
      }
    });
    
    return parsed as T;
  }

  async destroy(): Promise<void> {
    try {
      this.isDestroyed = true;
      this.changeSubject.complete();
      // Don't destroy the database itself, just mark collection as destroyed
    } catch (error) {
      throw new CollectionError(
        `Failed to destroy ${this.name}: ${error.message}`,
        this.name
      );
    }
  }
}

// SQLite File Service
export class SQLiteFileService {
  private db: any | null = null; // Using 'any' type for now, will be SQLite3DB
  private initialized = false;
  private collections = new Map<string, SQLiteFileCollection<any>>();
  private dbPath: string = '';

  async initialize(dbName: string = 'schoolpilot_dev.db'): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamically import the SQLite WASM module
      const sqlite3InitModule = (await import('@sqlite.org/sqlite-wasm')).default;
      
      // Initialize SQLite
      const sqlite3 = await sqlite3InitModule({
        print: console.log,
        printErr: console.error,
      });
      
      console.log('[SQLiteFile] SQLite version:', sqlite3.version.libVersion);
      
      // Use regular file storage (not OPFS)
      this.dbPath = dbName;
      console.log('[SQLiteFile] Using file storage for database:', this.dbPath);
      
      // Open database with file storage
      this.db = new sqlite3.oo1.DB(this.dbPath, 'c');
      
      this.initialized = true;
      console.log('[SQLiteFile] Service initialized successfully');
    } catch (error) {
      console.error('[SQLiteFile] Failed to initialize:', error);
      throw new DatabaseError(
        `Failed to initialize SQLite File service: ${error.message}`,
        'INITIALIZATION_ERROR'
      );
    }
  }

  getDatabase(): any {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  getDatabasePath(): string {
    return this.dbPath;
  }

  async createCollection<T>(name: string, schema: CollectionSchema): Promise<SQLiteFileCollection<T>> {
    try {
      if (!this.initialized) {
        throw new DatabaseError('Service not initialized', 'NOT_INITIALIZED');
      }
      
      const collection = new SQLiteFileCollection<T>(this, 'schoolpilot_dev', name, schema);
      this.collections.set(name, collection);
      
      console.log(`[SQLiteFile] Collection '${name}' created successfully`);
      return collection;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create collection '${name}': ${error.message}`,
        'COLLECTION_CREATION_ERROR',
        'SQLiteFile'
      );
    }
  }

  getCollection<T>(name: string): SQLiteFileCollection<T> | null {
    return this.collections.get(name) || null;
  }

  getAllCollections(): Map<string, SQLiteFileCollection<any>> {
    return new Map(this.collections);
  }

  isAvailable(): boolean {
    // Check if the environment supports SQLite (both browser and Node.js)
    return typeof window !== 'undefined' || typeof process !== 'undefined';
  }

  getStatus(): any {
    return {
      name: 'SQLiteFile',
      version: '1.0.0',
      isConnected: this.initialized,
      collectionsCount: this.collections.size,
      databasePath: this.dbPath
    };
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
      this.initialized = false;
      
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      console.log('[SQLiteFile] Service destroyed successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to destroy SQLite File service: ${error.message}`,
        'DESTRUCTION_ERROR'
      );
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
        provider: 'SQLiteFile',
        version: '1.0.0',
        databasePath: this.dbPath,
        collections: backupData
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to create backup: ${error.message}`,
        'BACKUP_ERROR',
        'SQLiteFile'
      );
    }
  }

  async restore(backupData: string): Promise<void> {
    try {
      const backup = JSON.parse(backupData);
      
      if (backup.provider !== 'SQLiteFile') {
        throw new Error(`Backup was created with ${backup.provider}, not SQLiteFile`);
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
      
      console.log('[SQLiteFile] Backup restored successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to restore backup: ${error.message}`,
        'RESTORE_ERROR',
        'SQLiteFile'
      );
    }
  }

  // Development-specific methods
  async exportToFile(filePath: string): Promise<void> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      // Export database to a file for inspection
      const backup = await this.backup();
      
      // In a real implementation, you would write to the file system
      // For now, we'll log the backup data
      console.log('[SQLiteFile] Database export:', backup);
      console.log(`[SQLiteFile] Database would be exported to: ${filePath}`);
    } catch (error) {
      throw new DatabaseError(
        `Failed to export database: ${error.message}`,
        'EXPORT_ERROR',
        'SQLiteFile'
      );
    }
  }

  async loadSeedData(seedData: Record<string, any[]>): Promise<void> {
    try {
      for (const [collectionName, docs] of Object.entries(seedData)) {
        const collection = this.getCollection(collectionName);
        if (collection && Array.isArray(docs) && docs.length > 0) {
          await collection.insertMany(docs);
          console.log(`[SQLiteFile] Loaded ${docs.length} seed documents into '${collectionName}'`);
        }
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to load seed data: ${error.message}`,
        'SEED_DATA_ERROR',
        'SQLiteFile'
      );
    }
  }
}