// ABOUTME: SQLite OPFS Service for persistent development database
// ABOUTME: Replaces mock data with SQLite storage using Origin Private File System

import { ICollection, CollectionSchema, InsertResult, UpdateResult, DeleteResult, QueryOptions, BulkResult } from '../database/interfaces';
import { CollectionError, DatabaseError } from '../database/interfaces';

// SQLite WASM types
type SqlValue = string | number | null | bigint | Uint8Array | Int8Array | ArrayBuffer;
type BindableValue = SqlValue | undefined | boolean;
type BindingSpec = readonly BindableValue[] | { [paramName: string]: BindableValue } | (SqlValue | boolean);

interface PreparedStatement {
  bind(binding: BindingSpec): this;
  bind(idx: number, binding: SqlValue): this;
  step(): boolean;
  reset(alsoClearBinds?: boolean): this;
  finalize(): void;
  get(...args: any[]): any;
  getColumnNames(): string[];
  getSQL(): string;
}

interface Database {
  prepare(sql: string): PreparedStatement;
  exec(sql: string, callback?: Function): any;
  close(): void;
  isOpen(): boolean;
}

// SQLite Collection Implementation
export class SQLiteCollection<T extends { id?: string }> implements ICollection<T> {
  private db: any; // Will be set by the service
  private isDestroyed = false;

  constructor(
    private sqliteService: SQLiteOPFSService,
    private dbName: string,
    public readonly name: string,
    public readonly schema: CollectionSchema
  ) {
    this.db = sqliteService.getDatabase();
    this.createTable();
  }

  private createTable(): void {
    try {
      const columns: string[] = [];
      
      // Add primary key
      columns.push('id TEXT PRIMARY KEY');
      
      // Add other columns based on schema
      for (const [fieldName, fieldDef] of Object.entries(this.schema.properties)) {
        if (fieldName === 'id') continue; // Skip primary key
        
        let sqliteType = 'TEXT';
        switch (fieldDef.type) {
          case 'string':
            sqliteType = 'TEXT';
            break;
          case 'number':
            sqliteType = 'REAL';
            break;
          case 'integer':
            sqliteType = 'INTEGER';
            break;
          case 'boolean':
            sqliteType = 'INTEGER'; // SQLite doesn't have boolean type
            break;
          case 'array':
          case 'object':
            sqliteType = 'TEXT'; // Store as JSON string
            break;
        }
        
        const nullable = !this.schema.required?.includes(fieldName) ? 'NULL' : 'NOT NULL';
        columns.push(`${fieldName} ${sqliteType} ${nullable}`);
      }
      
      // Add timestamps if not present
      if (!this.schema.properties['created_at']) {
        columns.push('created_at TEXT');
      }
      if (!this.schema.properties['updated_at']) {
        columns.push('updated_at TEXT');
      }
      
      const createTableSQL = `CREATE TABLE IF NOT EXISTS ${this.name} (${columns.join(', ')})`;
      this.db.exec(createTableSQL);
      
      // Create indexes
      if (this.schema.indexes && this.schema.indexes.length > 0) {
        for (const index of this.schema.indexes) {
          const indexFields = index.fields.join(', ');
          const indexSQL = `CREATE INDEX IF NOT EXISTS idx_${this.name}_${index.name} ON ${this.name} (${indexFields})`;
          this.db.exec(indexSQL);
        }
      }
      
      console.log(`[SQLiteCollection] Table '${this.name}' created successfully`);
    } catch (error) {
      throw new CollectionError(
        `Failed to create table for collection '${this.name}': ${error.message}`,
        this.name
      );
    }
  }

  private serializeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    
    // Serialize objects and arrays to JSON
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    // Convert boolean to integer for SQLite
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    
    return value;
  }

  private deserializeValue(value: any, fieldType: string): any {
    if (value === null || value === undefined) {
      return value;
    }
    
    // Deserialize JSON strings back to objects/arrays
    if (fieldType === 'object' || fieldType === 'array') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value; // Return as-is if not valid JSON
      }
    }
    
    // Convert integer to boolean
    if (fieldType === 'boolean') {
      return value === 1;
    }
    
    return value;
  }

  private deserializeDoc(row: any): T {
    if (!row) return row;
    
    const doc: any = { ...row };
    
    // Deserialize fields based on schema
    for (const [fieldName, fieldDef] of Object.entries(this.schema.properties)) {
      if (row[fieldName] !== undefined) {
        doc[fieldName] = this.deserializeValue(row[fieldName], fieldDef.type);
      }
    }
    
    return doc as T;
  }

  // CRUD Operations
  async insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>> {
    try {
      const id = (doc as any).id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const fullDoc = { ...doc, id } as T;
      
      const columns: string[] = [];
      const values: any[] = [];
      const placeholders: string[] = [];
      
      for (const [fieldName, value] of Object.entries(fullDoc)) {
        columns.push(fieldName);
        values.push(this.serializeValue(value));
        placeholders.push('?');
      }
      
      // Add timestamps if not present
      if (!('created_at' in fullDoc)) {
        columns.push('created_at');
        values.push(new Date().toISOString());
        placeholders.push('?');
      }
      
      if (!('updated_at' in fullDoc)) {
        columns.push('updated_at');
        values.push(new Date().toISOString());
        placeholders.push('?');
      }
      
      const sql = `INSERT INTO ${this.name} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
      const stmt = this.db.prepare(sql);
      stmt.bind(values);
      stmt.step();
      stmt.finalize();
      
      return {
        id,
        doc: fullDoc,
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
      
      // Use transaction for better performance
      this.db.exec('BEGIN TRANSACTION');
      try {
        for (const doc of docs) {
          try {
            const result = await this.insert(doc);
            insertResults.push(result);
          } catch (error) {
            errors.push({
              id: (doc as any).id || 'unknown',
              error: 'INSERT_ERROR',
              reason: error.message
            });
          }
        }
        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
      
      return { docs: insertResults, errors };
    } catch (error) {
      throw new CollectionError(
        `Failed to insert multiple documents in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.name} WHERE id = ?`);
      stmt.bind([id]);
      let row = null;
      if (stmt.step()) {
        row = stmt.get({});
      }
      stmt.finalize();
      return row ? this.deserializeDoc(row) : null;
    } catch (error) {
      throw new CollectionError(
        `Failed to find document by ID in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async findOne(idOrQuery: string | QueryOptions): Promise<T | null> {
    if (typeof idOrQuery === 'string') {
      return this.findById(idOrQuery);
    } else {
      const results = await this.find({ ...idOrQuery, limit: 1 });
      return results.length > 0 ? results[0] : null;
    }
  }

  async find(query: QueryOptions = {}): Promise<T[]> {
    try {
      let sql = `SELECT * FROM ${this.name}`;
      const params: any[] = [];
      
      // Handle selector-based queries
      if (query.selector) {
        const whereConditions: string[] = [];
        
        for (const [field, value] of Object.entries(query.selector)) {
          // Handle simple equality
          if (typeof value !== 'object') {
            whereConditions.push(`${field} = ?`);
            params.push(this.serializeValue(value));
          } 
          // Handle operators
          else if (typeof value === 'object' && value !== null) {
            for (const [operator, opValue] of Object.entries(value)) {
              switch (operator) {
                case '$eq':
                  whereConditions.push(`${field} = ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$ne':
                  whereConditions.push(`${field} != ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$gt':
                  whereConditions.push(`${field} > ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$gte':
                  whereConditions.push(`${field} >= ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$lt':
                  whereConditions.push(`${field} < ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$lte':
                  whereConditions.push(`${field} <= ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$in':
                  if (Array.isArray(opValue)) {
                    const placeholders = opValue.map(() => '?').join(', ');
                    whereConditions.push(`${field} IN (${placeholders})`);
                    params.push(...opValue.map(v => this.serializeValue(v)));
                  }
                  break;
                case '$nin':
                  if (Array.isArray(opValue)) {
                    const placeholders = opValue.map(() => '?').join(', ');
                    whereConditions.push(`${field} NOT IN (${placeholders})`);
                    params.push(...opValue.map(v => this.serializeValue(v)));
                  }
                  break;
              }
            }
          }
        }
        
        if (whereConditions.length > 0) {
          sql += ` WHERE ${whereConditions.join(' AND ')}`;
        }
      }
      
      // Handle sorting
      if (query.sort) {
        const sortConditions: string[] = [];
        for (const sortItem of query.sort) {
          if (typeof sortItem === 'string') {
            sortConditions.push(`${sortItem} ASC`);
          } else if (typeof sortItem === 'object') {
            for (const [field, direction] of Object.entries(sortItem)) {
              sortConditions.push(`${field} ${direction === 'desc' ? 'DESC' : 'ASC'}`);
            }
          }
        }
        
        if (sortConditions.length > 0) {
          sql += ` ORDER BY ${sortConditions.join(', ')}`;
        }
      }
      
      // Handle pagination
      if (query.skip) {
        sql += ` LIMIT -1 OFFSET ${query.skip}`;
      }
      
      if (query.limit) {
        sql += ` LIMIT ${query.limit}`;
      }
      
      const results: T[] = [];
      const stmt = this.db.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      
      while (stmt.step()) {
        const row = stmt.get({});
        results.push(this.deserializeDoc(row));
      }
      
      stmt.finalize();
      return results;
    } catch (error) {
      throw new CollectionError(
        `Failed to find documents in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async update(id: string, update: Partial<T>): Promise<UpdateResult<T>> {
    try {
      const existingDoc = await this.findById(id);
      if (!existingDoc) {
        throw new Error(`Document with id ${id} not found`);
      }
      
      const columns: string[] = [];
      const values: any[] = [];
      
      for (const [fieldName, value] of Object.entries(update)) {
        if (fieldName === 'id') continue; // Don't update ID
        columns.push(`${fieldName} = ?`);
        values.push(this.serializeValue(value));
      }
      
      // Update timestamp
      columns.push('updated_at = ?');
      values.push(new Date().toISOString());
      
      values.push(id); // For WHERE clause
      
      const sql = `UPDATE ${this.name} SET ${columns.join(', ')} WHERE id = ?`;
      const stmt = this.db.prepare(sql);
      stmt.bind(values);
      stmt.step();
      stmt.finalize();
      
      const updatedDoc = { ...existingDoc, ...update } as T;
      
      return {
        id,
        doc: updatedDoc,
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
      const stmt = this.db.prepare(`DELETE FROM ${this.name} WHERE id = ?`);
      stmt.bind([id]);
      stmt.step();
      stmt.finalize();
      
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

  // RxDB Compatibility Aliases
  async delete(id: string): Promise<DeleteResult> {
    return this.remove(id);
  }

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
    } catch (error) {
      throw new CollectionError(
        `Failed to upsert document in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  // Reactive Operations (simplified for SQLite)
  subscribe(query?: QueryOptions): any {
    // SQLite doesn't support reactive queries natively
    // This is a placeholder that would need to be implemented with polling or other mechanisms
    console.warn(`Reactive queries not supported in SQLite collection ${this.name}`);
    return null;
  }

  subscribeToChanges(): any {
    // SQLite doesn't support change notifications natively
    console.warn(`Change notifications not supported in SQLite collection ${this.name}`);
    return null;
  }

  // Performance Operations
  async count(query?: QueryOptions): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.name}`;
      const params: any[] = [];
      
      if (query?.selector) {
        const whereConditions: string[] = [];
        
        for (const [field, value] of Object.entries(query.selector)) {
          if (typeof value !== 'object') {
            whereConditions.push(`${field} = ?`);
            params.push(this.serializeValue(value));
          } else if (typeof value === 'object' && value !== null) {
            for (const [operator, opValue] of Object.entries(value)) {
              switch (operator) {
                case '$eq':
                  whereConditions.push(`${field} = ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$ne':
                  whereConditions.push(`${field} != ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$gt':
                  whereConditions.push(`${field} > ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$gte':
                  whereConditions.push(`${field} >= ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$lt':
                  whereConditions.push(`${field} < ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$lte':
                  whereConditions.push(`${field} <= ?`);
                  params.push(this.serializeValue(opValue));
                  break;
                case '$in':
                  if (Array.isArray(opValue)) {
                    const placeholders = opValue.map(() => '?').join(', ');
                    whereConditions.push(`${field} IN (${placeholders})`);
                    params.push(...opValue.map(v => this.serializeValue(v)));
                  }
                  break;
                case '$nin':
                  if (Array.isArray(opValue)) {
                    const placeholders = opValue.map(() => '?').join(', ');
                    whereConditions.push(`${field} NOT IN (${placeholders})`);
                    params.push(...opValue.map(v => this.serializeValue(v)));
                  }
                  break;
              }
            }
          }
        }
        
        if (whereConditions.length > 0) {
          sql += ` WHERE ${whereConditions.join(' AND ')}`;
        }
      }
      
      const stmt = this.db.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      let count = 0;
      if (stmt.step()) {
        const result = stmt.get({}) as { count: number };
        count = result.count;
      }
      stmt.finalize();
      return count;
    } catch (error) {
      throw new CollectionError(
        `Failed to count documents in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`SELECT 1 FROM ${this.name} WHERE id = ? LIMIT 1`);
      stmt.bind([id]);
      const result = stmt.step();
      stmt.finalize();
      return result;
    } catch (error) {
      throw new CollectionError(
        `Failed to check existence in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  async createIndex(index: any): Promise<void> {
    try {
      const indexFields = index.fields.join(', ');
      const indexSQL = `CREATE INDEX IF NOT EXISTS idx_${this.name}_${index.name} ON ${this.name} (${indexFields})`;
      this.db.exec(indexSQL);
    } catch (error) {
      throw new CollectionError(
        `Failed to create index in ${this.name}: ${error.message}`,
        this.name
      );
    }
  }

  // Collection management
  async getStats(): Promise<any> {
    try {
      const count = await this.count();
      
      return {
        name: this.name,
        documentCount: count,
        indexCount: this.schema.indexes?.length || 0,
        storageSize: 0, // Would need to query SQLite for actual size
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
      this.db.exec('VACUUM');
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
      // Don't destroy the database itself, just mark collection as destroyed
    } catch (error) {
      throw new CollectionError(
        `Failed to destroy ${this.name}: ${error.message}`,
        this.name
      );
    }
  }
}

// SQLite OPFS Service
export class SQLiteOPFSService {
  private db: any | null = null; // Using 'any' type for now, will be SQLite3DB
  private initialized = false;
  private collections = new Map<string, SQLiteCollection<any>>();

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
      
      console.log('[SQLiteOPFS] SQLite version:', sqlite3.version.libVersion);
      
      // Try to use OPFS for persistent storage
      let dbFilename = dbName;
      if ('opfs' in sqlite3) {
        // Use OPFS if available
        dbFilename = `file:${dbName}?vfs=opfs`;
        console.log('[SQLiteOPFS] Using OPFS for database storage');
      } else {
        console.log('[SQLiteOPFS] OPFS not available, using regular file storage');
      }
      
      // Open database
      this.db = new sqlite3.oo1.DB(dbFilename, 'c');
      
      this.initialized = true;
      console.log('[SQLiteOPFS] Service initialized successfully');
    } catch (error) {
      console.error('[SQLiteOPFS] Failed to initialize:', error);
      throw new DatabaseError(
        `Failed to initialize SQLite OPFS service: ${error.message}`,
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

  async createCollection<T>(name: string, schema: CollectionSchema): Promise<SQLiteCollection<T>> {
    try {
      if (!this.initialized) {
        throw new DatabaseError('Service not initialized', 'NOT_INITIALIZED');
      }
      
      const collection = new SQLiteCollection<T>(this, 'schoolpilot_dev', name, schema);
      this.collections.set(name, collection);
      
      console.log(`[SQLiteOPFS] Collection '${name}' created successfully`);
      return collection;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create collection '${name}': ${error.message}`,
        'COLLECTION_CREATION_ERROR',
        'SQLiteOPFS'
      );
    }
  }

  getCollection<T>(name: string): SQLiteCollection<T> | null {
    return this.collections.get(name) || null;
  }

  getAllCollections(): Map<string, SQLiteCollection<any>> {
    return new Map(this.collections);
  }

  isAvailable(): boolean {
    // Check if the environment supports SQLite
    return typeof window !== 'undefined';
  }

  getStatus(): any {
    return {
      name: 'SQLiteOPFS',
      version: '1.0.0',
      isConnected: this.initialized,
      collectionsCount: this.collections.size
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
      
      console.log('[SQLiteOPFS] Service destroyed successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to destroy SQLite OPFS service: ${error.message}`,
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
        provider: 'SQLiteOPFS',
        version: '1.0.0',
        collections: backupData
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to create backup: ${error.message}`,
        'BACKUP_ERROR',
        'SQLiteOPFS'
      );
    }
  }

  async restore(backupData: string): Promise<void> {
    try {
      const backup = JSON.parse(backupData);
      
      if (backup.provider !== 'SQLiteOPFS') {
        throw new Error(`Backup was created with ${backup.provider}, not SQLiteOPFS`);
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
      
      console.log('[SQLiteOPFS] Backup restored successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to restore backup: ${error.message}`,
        'RESTORE_ERROR',
        'SQLiteOPFS'
      );
    }
  }
}