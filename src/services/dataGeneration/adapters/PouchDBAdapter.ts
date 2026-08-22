import { logger } from '@/utils/logging';

// ABOUTME: PouchDB adapter for document-based storage with CouchDB sync
// ABOUTME: Provides offline-first capabilities with automatic conflict resolution

import { BaseStorageAdapter } from './BaseStorageAdapter';

export class PouchDBAdapter extends BaseStorageAdapter {
  private databases: Map<string, any> = new Map();
  private PouchDB: any = null;

  async initialize(): Promise<void> {
    try {
      // Import PouchDB for Node.js environment
      const PouchDBModule = await import('pouchdb');
      this.PouchDB = (PouchDBModule as any).default || PouchDBModule;
      
      // Add plugins
      const PouchDBFind = await import('pouchdb-find');
      const PouchDBUpsert = await import('pouchdb-upsert');
      
      this.PouchDB.plugin((PouchDBFind as any).default || PouchDBFind);
      this.PouchDB.plugin((PouchDBUpsert as any).default || PouchDBUpsert);

      this.initialized = true;
      logger.info('PouchDB adapter initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PouchDB adapter:', error);
      throw error;
    }
  }

  async createSchema(tableName: string, schema: string): Promise<void> {
    this.validateInitialization();
    
    try {
      // Create or get database for this table
      const dbName = `schoolpilot_${tableName}`;
      const db = new this.PouchDB(dbName);
      this.databases.set(tableName, db);
      
      // Create indexes based on schema analysis
      await this.createIndexesFromSchema(db, schema);
      
      logger.info(`Created PouchDB database: ${dbName}`);
    } catch (error) {
      logger.error(`Failed to create schema for ${tableName}:`, error);
      throw error;
    }
  }

  async insertBatch(tableName: string, data: any[]): Promise<void> {
    this.validateInitialization();
    
    if (!data.length) return;

    const db = this.databases.get(tableName);
    if (!db) {
      throw new Error(`Database for table ${tableName} not found`);
    }

    try {
      // Convert relational data to documents
      const documents = data.map(record => ({
        _id: record.id || this.generateId(),
        type: tableName,
        ...record,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Bulk insert with conflict handling
      const result = await db.bulkDocs(documents);
      
      // Check for conflicts
      const conflicts = result.filter((r: any) => r.error);
      if (conflicts.length > 0) {
        logger.warn(`${conflicts.length} conflicts during batch insert to ${tableName}`);
        await this.handleConflicts(db, conflicts, documents);
      }
      
      logger.info(`Inserted ${data.length} documents into ${tableName}`);
    } catch (error) {
      logger.error(`Failed to insert batch into ${tableName}:`, error);
      throw error;
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    this.validateInitialization();
    
    try {
      // Convert SQL-like query to PouchDB find query
      const { tableName, findQuery } = this.convertSqlToFind(sql, params);
      
      const db = this.databases.get(tableName);
      if (!db) {
        throw new Error(`Database for table ${tableName} not found`);
      }

      const result = await db.find(findQuery);
      return result.docs.map((doc: any) => {
        const { _id, _rev, type, created_at, updated_at, ...data } = doc;
        return { id: _id, ...data };
      });
    } catch (error) {
      logger.error('Query execution failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      for (const [tableName, db] of Array.from(this.databases.entries())) {
        await db.close();
        logger.info(`Closed database for ${tableName}`);
      }
      this.databases.clear();
      this.initialized = false;
      logger.info('PouchDB adapter cleaned up');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  // PouchDB-specific methods
  async setupSync(tableName: string, remoteUrl: string): Promise<void> {
    const db = this.databases.get(tableName);
    if (!db) {
      throw new Error(`Database for table ${tableName} not found`);
    }

    const remoteDb = new this.PouchDB(remoteUrl);
    
    // Setup bidirectional sync
    const sync = db.sync(remoteDb, {
      live: true,
      retry: true,
      back_off_function: (delay: number) => {
        if (delay === 0) return 1000;
        return Math.min(delay * 3, 30000);
      }
    });

    sync.on('change', (info: any) => {
      logger.info(`Sync change for ${tableName}:`, info);
    });

    sync.on('error', (err: any) => {
      logger.error(`Sync error for ${tableName}:`, err);
    });

    return sync;
  }

  async getConflicts(tableName: string): Promise<any[]> {
    const db = this.databases.get(tableName);
    if (!db) return [];

    const result = await db.allDocs({
      include_docs: true,
      conflicts: true
    });

    return result.rows
      .filter((row: any) => row.doc._conflicts)
      .map((row: any) => row.doc);
  }

  private async createIndexesFromSchema(db: any, schema: string): Promise<void> {
    // Extract field names from DDL and create indexes
    const fieldMatches = schema.match(/\b(\w+)\s+(?:INTEGER|TEXT|REAL|BLOB|NUMERIC)/gi);
    if (!fieldMatches) return;

    const fields = fieldMatches.map(match => match.split(/\s+/)[0].toLowerCase());
    
    // Create compound index for common fields
    const commonFields = ['id', 'created_at', 'updated_at', 'status', 'type'];
    const indexFields = fields.filter(field => commonFields.includes(field));
    
    if (indexFields.length > 0) {
      await db.createIndex({
        index: { fields: indexFields }
      });
    }
  }

  private convertSqlToFind(sql: string, params: any[] = []): { tableName: string; findQuery: any } {
    // Simple SQL to PouchDB find conversion
    // This is a basic implementation - would need more sophisticated parsing for complex queries
    
    // Extract table name from SQL (handle both quoted and unquoted table names)
    const tableMatch = sql.match(/FROM\s+(?:"(\w+)"|'(\w+)'|(\w+))/i);
    const tableName = tableMatch ? (tableMatch[1] || tableMatch[2] || tableMatch[3]) : 'unknown';
    
    const findQuery: any = {
      selector: { type: tableName },
      limit: 1000
    };

    // Handle WHERE clauses
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      // Simple field = value parsing
      const fieldMatch = whereClause.match(/(\w+)\s*=\s*\?/);
      if (fieldMatch && params.length > 0) {
        findQuery.selector[fieldMatch[1]] = params[0];
      }
    }

    // Handle LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      findQuery.limit = parseInt(limitMatch[1]);
    }

    return { tableName, findQuery };
  }

  private async handleConflicts(db: any, conflicts: any[], documents: any[]): Promise<void> {
    // Simple conflict resolution: last write wins
    for (const conflict of conflicts) {
      if (conflict.error === 'conflict') {
        const doc = documents.find(d => d._id === conflict.id);
        if (doc) {
          try {
            const existing = await db.get(conflict.id);
            doc._rev = existing._rev;
            await db.put(doc);
            logger.info(`Resolved conflict for document ${conflict.id}`);
          } catch (error) {
            logger.error(`Failed to resolve conflict for ${conflict.id}:`, error);
          }
        }
      }
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

}