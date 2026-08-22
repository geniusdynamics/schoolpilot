import { logger } from '@/utils/logging';

// ABOUTME: Enhanced SQLite provider for development mode using file storage instead of OPFS
// ABOUTME: Implements IDatabaseProvider interface with file-based SQLite for easy database inspection and development tools

import { IDatabaseProvider, ICollection, DatabaseConfig, CollectionSchema, ProviderStatus } from './interfaces';
import { SQLiteFileService } from '../sqlite/SQLiteFileService';
import { SQLiteFileCollection } from '../sqlite/SQLiteFileService';
import * as path from 'path';
import * as fs from 'fs';

export class SQLiteFileProvider implements IDatabaseProvider {
  public readonly name = 'SQLiteFile';
  public readonly version = '1.0.0';
  private sqliteService: SQLiteFileService;
  private collections: Map<string, SQLiteFileCollection<any>> = new Map();
  private isInitialized = false;
  private config: DatabaseConfig;
  private dbPath: string;

  constructor(config?: DatabaseConfig) {
    this.config = config || {
      name: 'schoolpilot_dev',
      version: 1,
      debug: true
    };
    
    // Set up database file path for development
    this.dbPath = (this.config.storage as any)?.path || path.join(process.cwd(), 'data', `${this.config.name}.db`);
    
    this.sqliteService = new SQLiteFileService();
    
    logger.info(`[SQLiteFileProvider] Initialized with database path: ${this.dbPath}`);
  }

  async initialize(config?: DatabaseConfig): Promise<void> {
    try {
      logger.info('[SQLiteFileProvider] Initializing SQLite File Provider for development...');
      
      // Update config if provided
      if (config) {
        this.config = { ...this.config, ...config };
      }
      
      // Ensure data directory exists
      await this.ensureDataDirectory();
      
      // Initialize SQLite service
      await this.sqliteService.initialize();
      
      // Set up development-specific features
      await this.setupDevelopmentFeatures();
      
      this.isInitialized = true;
      logger.info(`[SQLiteFileProvider] Successfully initialized with database: ${this.dbPath}`);
      
      // Log database info for development
      if (this.config.debug) {
        await this.logDatabaseInfo();
      }
      
    } catch (error) {
      logger.error('[SQLiteFileProvider] Failed to initialize:', error);
      throw error;
    }
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        logger.info(`[SQLiteFileProvider] Created data directory: ${dataDir}`);
      }
    } catch (error) {
      logger.error('[SQLiteFileProvider] Failed to create data directory:', error);
      throw error;
    }
  }

  private async setupDevelopmentFeatures(): Promise<void> {
    try {
      // Enable SQLite development features
      const db = this.sqliteService.getDatabase();
      
      if (db) {
        // Enable foreign key constraints
        db.exec('PRAGMA foreign_keys = ON;');
        
        // Enable WAL mode for better concurrency
        db.exec('PRAGMA journal_mode = WAL;');
        
        // Enable query optimization
        db.exec('PRAGMA optimize;');
        
        // Set reasonable cache size (10MB)
        db.exec('PRAGMA cache_size = -10000;');
        
        logger.info('[SQLiteFileProvider] Development features enabled');
      }
    } catch (error) {
      logger.warn('[SQLiteFileProvider] Failed to setup development features:', error);
    }
  }

  private async logDatabaseInfo(): Promise<void> {
    try {
      const db = this.sqliteService.getDatabase();
      if (db) {
        const info = {
          path: this.dbPath,
          size: this.getDatabaseSize(),
          tables: this.getTableList(),
          pragmas: this.getDatabasePragmas()
        };
        
        logger.info('[SQLiteFileProvider] Database Info:', info);
      }
    } catch (error) {
      logger.warn('[SQLiteFileProvider] Failed to log database info:', error);
    }
  }

  async createCollection<T = any>(name: string, schema: CollectionSchema): Promise<ICollection<T>> {
    if (!this.isInitialized) {
      throw new Error('SQLiteFileProvider not initialized');
    }

    try {
      logger.info(`[SQLiteFileProvider] Creating collection: ${name}`);
      
      const collection = await this.sqliteService.createCollection<T>(name, schema);
      this.collections.set(name, collection);
      
      // Log collection creation for development
      if (this.config.debug) {
        logger.info(`[SQLiteFileProvider] Collection '${name}' created with schema:`, {
          properties: Object.keys(schema.properties || {}),
          indexes: schema.indexes?.length || 0,
          primaryKey: schema.primaryKey
        });
      }
      
      return collection as unknown as ICollection<T>;
    } catch (error) {
      logger.error(`[SQLiteFileProvider] Failed to create collection ${name}:`, error);
      throw error;
    }
  }

  getCollection<T = any>(name: string): ICollection<T> | null {
    if (!this.isInitialized) {
      throw new Error('SQLiteFileProvider not initialized');
    }

    // Return cached collection
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
      logger.info('[SQLiteFileProvider] Destroying provider...');
      
      // Clear collections cache
      this.collections.clear();
      
      // Destroy the SQLite service
      await this.sqliteService.destroy();
      this.isInitialized = false;
      
      logger.info('[SQLiteFileProvider] Provider destroyed successfully');
    } catch (error) {
      logger.error('[SQLiteFileProvider] Failed to destroy provider:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    try {
      // Check if we're in a Node.js environment (required for file access)
      return typeof process !== 'undefined' && 
             process.versions && 
             !!process.versions.node &&
             typeof require !== 'undefined';
    } catch (error) {
      logger.error('[SQLiteFileProvider] Error checking availability:', error);
      return false;
    }
  }

  getStatus(): ProviderStatus {
    try {
      return {
        name: this.name,
        version: this.version,
        isConnected: this.isInitialized,
        collectionsCount: this.collections.size,
        lastError: undefined,
        performance: {
          avgQueryTime: 0, // TODO: Implement query time tracking
          totalQueries: 0,
          memoryUsage: this.getMemoryUsage()
        }
      };
    } catch (error) {
      logger.error('[SQLiteFileProvider] Error getting status:', error);
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
      logger.info('[SQLiteFileProvider] Creating backup...');
      
      if (!this.isInitialized) {
        throw new Error('Provider not initialized');
      }

      const backup = {
        metadata: {
          provider: this.name,
          version: this.version,
          timestamp: new Date().toISOString(),
          dbPath: this.dbPath,
          collections: Array.from(this.collections.keys())
        },
        data: {} as Record<string, any[]>
      };

      // Backup each collection
      for (const [name, collection] of this.collections) {
        try {
          const documents = await collection.find({});
          backup.data[name] = documents;
          logger.info(`[SQLiteFileProvider] Backed up ${documents.length} documents from ${name}`);
        } catch (error) {
          logger.error(`[SQLiteFileProvider] Failed to backup collection ${name}:`, error);
          backup.data[name] = [];
        }
      }

      const backupString = JSON.stringify(backup, null, 2);
      logger.info(`[SQLiteFileProvider] Backup created (${backupString.length} bytes)`);
      
      return backupString;
    } catch (error) {
      logger.error('[SQLiteFileProvider] Backup failed:', error);
      throw error;
    }
  }

  async restore(backupData: string): Promise<void> {
    try {
      logger.info('[SQLiteFileProvider] Restoring from backup...');
      
      if (!this.isInitialized) {
        throw new Error('Provider not initialized');
      }

      const backup = JSON.parse(backupData);
      
      if (!backup.metadata || !backup.data) {
        throw new Error('Invalid backup format');
      }

      logger.info(`[SQLiteFileProvider] Restoring backup from ${backup.metadata.timestamp}`);

      // Restore each collection
      for (const [collectionName, documents] of Object.entries(backup.data)) {
        const collection = this.collections.get(collectionName);
        if (!collection) {
          logger.warn(`[SQLiteFileProvider] Collection ${collectionName} not found, skipping`);
          continue;
        }

        try {
          // Clear existing data (use remove method if removeMany not available)
          try {
            if (typeof (collection as any).removeMany === 'function') {
              await (collection as any).removeMany({});
            } else {
              // Fallback: remove all documents individually
              const allDocs = await collection.find({});
              for (const doc of allDocs) {
                if (doc.id) {
                  await collection.remove(doc.id);
                }
              }
            }
          } catch (clearError) {
            logger.warn(`[SQLiteFileProvider] Failed to clear collection ${collectionName}:`, clearError);
          }
          
          // Insert backup data
          if (Array.isArray(documents) && documents.length > 0) {
            if (typeof (collection as any).insertMany === 'function') {
              await (collection as any).insertMany(documents as any[]);
            } else {
              // Fallback: insert documents individually
              for (const doc of documents as any[]) {
                await collection.insert(doc);
              }
            }
            logger.info(`[SQLiteFileProvider] Restored ${documents.length} documents to ${collectionName}`);
          }
        } catch (error) {
          logger.error(`[SQLiteFileProvider] Failed to restore collection ${collectionName}:`, error);
        }
      }

      logger.info('[SQLiteFileProvider] Restore completed');
    } catch (error) {
      logger.error('[SQLiteFileProvider] Restore failed:', error);
      throw error;
    }
  }

  // Development-specific features

  /**
   * Get database file path (development feature)
   */
  getDatabasePath(): string {
    return this.dbPath;
  }

  /**
   * Get database file size in bytes (development feature)
   */
  getDatabaseSize(): number {
    try {
      if (fs.existsSync(this.dbPath)) {
        const stats = fs.statSync(this.dbPath);
        return stats.size;
      }
      return 0;
    } catch (error) {
      logger.error('[SQLiteFileProvider] Error getting database size:', error);
      return 0;
    }
  }

  /**
   * Get list of tables in the database (development feature)
   */
  getTableList(): string[] {
    try {
      const db = this.sqliteService.getDatabase();
      if (!db) return [];

      const result = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();

      return result.map((row: any) => row.name);
    } catch (error) {
      logger.error('[SQLiteFileProvider] Error getting table list:', error);
      return [];
    }
  }

  /**
   * Get database pragma settings (development feature)
   */
  getDatabasePragmas(): Record<string, any> {
    try {
      const db = this.sqliteService.getDatabase();
      if (!db) return {};

      const pragmas = [
        'journal_mode',
        'synchronous',
        'cache_size',
        'foreign_keys',
        'page_size',
        'auto_vacuum'
      ];

      const result: Record<string, any> = {};
      
      for (const pragma of pragmas) {
        try {
          const value = db.prepare(`PRAGMA ${pragma}`).get();
          result[pragma] = value;
        } catch (error) {
          result[pragma] = 'error';
        }
      }

      return result;
    } catch (error) {
      logger.error('[SQLiteFileProvider] Error getting pragmas:', error);
      return {};
    }
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): number {
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage().heapUsed;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Execute raw SQL query (development feature - use with caution)
   */
  executeRawSQL(sql: string, params?: any[]): any {
    try {
      const db = this.sqliteService.getDatabase();
      if (!db) throw new Error('Database not available');

      logger.warn('[SQLiteFileProvider] Executing raw SQL:', sql);
      
      if (params) {
        return db.prepare(sql).all(params);
      } else {
        return db.exec(sql);
      }
    } catch (error) {
      logger.error('[SQLiteFileProvider] Raw SQL execution failed:', error);
      throw error;
    }
  }

  /**
   * Vacuum database to reclaim space (development feature)
   */
  async vacuum(): Promise<void> {
    try {
      logger.info('[SQLiteFileProvider] Running VACUUM to optimize database...');
      
      const db = this.sqliteService.getDatabase();
      if (!db) throw new Error('Database not available');

      const sizeBefore = this.getDatabaseSize();
      db.exec('VACUUM;');
      const sizeAfter = this.getDatabaseSize();
      
      const savedBytes = sizeBefore - sizeAfter;
      logger.info(`[SQLiteFileProvider] VACUUM completed. Saved ${savedBytes} bytes (${Math.round(savedBytes / 1024)}KB)`);
    } catch (error) {
      logger.error('[SQLiteFileProvider] VACUUM failed:', error);
      throw error;
    }
  }
}