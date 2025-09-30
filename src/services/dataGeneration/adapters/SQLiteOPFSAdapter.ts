// ABOUTME: SQLite OPFS adapter for browser-based SQLite with Origin Private File System
// ABOUTME: Provides high-performance local storage with WASM SQLite

import { BaseStorageAdapter } from './BaseStorageAdapter';

export class SQLiteOPFSAdapter extends BaseStorageAdapter {
  private db: any = null;
  private sqlite3: any = null;

  async initialize(): Promise<void> {
    try {
      // Import SQLite WASM
      const sqlite3InitModule = (await import('@sqlite.org/sqlite-wasm')).default;
      this.sqlite3 = await sqlite3InitModule({
        print: console.log,
        printErr: console.error,
      });

      // Initialize OPFS VFS if available
      if (this.sqlite3.capi.sqlite3_vfs_find('opfs')) {
        const opfsVfs = this.sqlite3.capi.sqlite3_vfs_find('opfs');
        this.sqlite3.capi.sqlite3_vfs_register(opfsVfs, 1);
      }

      // Open database with OPFS
      this.db = new this.sqlite3.oo1.DB('/schoolpilot-data.db', 'ct');
      
      // Enable foreign keys and WAL mode
      this.db.exec('PRAGMA foreign_keys = ON');
      this.db.exec('PRAGMA journal_mode = WAL');
      this.db.exec('PRAGMA synchronous = NORMAL');
      this.db.exec('PRAGMA cache_size = 10000');
      this.db.exec('PRAGMA temp_store = MEMORY');

      this.initialized = true;
      console.log('SQLite OPFS adapter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite OPFS adapter:', error);
      throw error;
    }
  }

  async createSchema(tableName: string, schema: string): Promise<void> {
    this.validateInitialization();
    
    try {
      // Drop table if exists (for fresh migrations)
      this.db.exec(`DROP TABLE IF EXISTS ${tableName}`);
      
      // Create table with schema
      this.db.exec(schema);
      
      console.log(`Created table: ${tableName}`);
    } catch (error) {
      console.error(`Failed to create schema for ${tableName}:`, error);
      throw error;
    }
  }

  async insertBatch(tableName: string, data: any[]): Promise<void> {
    this.validateInitialization();
    
    if (!data.length) return;

    try {
      // Begin transaction for better performance
      this.db.exec('BEGIN TRANSACTION');

      const columns = Object.keys(data[0]);
      const placeholders = this.generatePlaceholders(columns.length);
      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      const stmt = this.db.prepare(sql);
      
      for (const record of data) {
        const values = columns.map(col => record[col]);
        stmt.bind(values).stepReset();
      }
      
      stmt.finalize();
      this.db.exec('COMMIT');
      
      console.log(`Inserted ${data.length} records into ${tableName}`);
    } catch (error) {
      this.db.exec('ROLLBACK');
      console.error(`Failed to insert batch into ${tableName}:`, error);
      throw error;
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    this.validateInitialization();
    
    try {
      // Use selectObjects for SELECT queries
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return this.db.selectObjects(sql, params);
      } else {
        // For non-SELECT queries, use exec
        this.db.exec(sql, { bind: params });
        return [];
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
        this.db = null;
        this.initialized = false;
        console.log('SQLite OPFS adapter cleaned up');
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
  }

  // OPFS-specific methods
  async getStorageInfo(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      };
    }
    return { used: 0, available: 0 };
  }

  async vacuum(): Promise<void> {
    this.validateInitialization();
    this.db.exec('VACUUM');
    console.log('Database vacuumed');
  }

  async analyze(): Promise<void> {
    this.validateInitialization();
    this.db.exec('ANALYZE');
    console.log('Database analyzed');
  }
}