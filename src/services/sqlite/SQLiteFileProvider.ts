// ABOUTME: SQLite File Provider for development mode with file storage
// ABOUTME: Wraps SQLiteFileService to provide a consistent provider interface for development database access

import { ICollection, CollectionSchema, DatabaseProvider, ProviderConfig } from '../database/interfaces';
import { SQLiteFileService, SQLiteFileCollection } from './SQLiteFileService';
import { DatabaseError } from '../database/interfaces';

export interface SQLiteFileConfig extends ProviderConfig {
  type: 'sqlite-file';
  storage: {
    type: 'file';
    path?: string;
  };
  databaseName?: string;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
}

export class SQLiteFileProvider implements DatabaseProvider {
  private service: SQLiteFileService;
  private config: SQLiteFileConfig;
  private isInitialized = false;

  constructor(config: SQLiteFileConfig) {
    this.config = {
      databaseName: 'schoolpilot_dev.db',
      enableWAL: true,
      enableForeignKeys: true,
      ...config
    };
    this.service = new SQLiteFileService();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const dbName = this.config.databaseName || 'schoolpilot_dev.db';
      await this.service.initialize(dbName);
      this.isInitialized = true;
      
      console.log('[SQLiteFileProvider] Provider initialized successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize SQLite File provider: ${error.message}`,
        'INITIALIZATION_ERROR',
        'SQLiteFile'
      );
    }
  }

  async createCollection<T extends { id?: string }>(
    name: string, 
    schema: CollectionSchema
  ): Promise<ICollection<T>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await this.service.createCollection<T>(name, schema);
    } catch (error) {
      throw new DatabaseError(
        `Failed to create collection '${name}': ${error.message}`,
        'COLLECTION_CREATION_ERROR',
        'SQLiteFile'
      );
    }
  }

  async getCollection<T extends { id?: string }>(name: string): Promise<ICollection<T> | null> {
    if (!this.isInitialized) {
      return null;
    }

    return this.service.getCollection<T>(name);
  }

  async listCollections(): Promise<string[]> {
    if (!this.isInitialized) {
      return [];
    }

    const collections = this.service.getAllCollections();
    return Array.from(collections.keys());
  }

  async dropCollection(name: string): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', 'SQLiteFile');
    }

    try {
      const collection = this.service.getCollection(name);
      if (collection) {
        await collection.destroy();
        console.log(`[SQLiteFileProvider] Collection '${name}' dropped successfully`);
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to drop collection '${name}': ${error.message}`,
        'COLLECTION_DROP_ERROR',
        'SQLiteFile'
      );
    }
  }

  async destroy(): Promise<void> {
    try {
      await this.service.destroy();
      this.isInitialized = false;
      console.log('[SQLiteFileProvider] Provider destroyed successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to destroy SQLite File provider: ${error.message}`,
        'DESTRUCTION_ERROR',
        'SQLiteFile'
      );
    }
  }

  isAvailable(): boolean {
    return this.service.isAvailable();
  }

  getStatus(): any {
    const serviceStatus = this.service.getStatus();
    return {
      ...serviceStatus,
      provider: 'SQLiteFileProvider',
      isInitialized: this.isInitialized,
      config: {
        type: this.config.type,
        storage: this.config.storage,
        databaseName: this.config.databaseName,
        enableWAL: this.config.enableWAL,
        enableForeignKeys: this.config.enableForeignKeys
      }
    };
  }

  getConfig(): SQLiteFileConfig {
    return { ...this.config };
  }

  // Development-specific methods
  async backup(): Promise<string> {
    if (!this.isInitialized) {
      throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', 'SQLiteFile');
    }

    try {
      return await this.service.backup();
    } catch (error) {
      throw new DatabaseError(
        `Failed to create backup: ${error.message}`,
        'BACKUP_ERROR',
        'SQLiteFile'
      );
    }
  }

  async restore(backupData: string): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', 'SQLiteFile');
    }

    try {
      await this.service.restore(backupData);
    } catch (error) {
      throw new DatabaseError(
        `Failed to restore backup: ${error.message}`,
        'RESTORE_ERROR',
        'SQLiteFile'
      );
    }
  }

  async exportDatabase(filePath: string): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', 'SQLiteFile');
    }

    try {
      await this.service.exportToFile(filePath);
    } catch (error) {
      throw new DatabaseError(
        `Failed to export database: ${error.message}`,
        'EXPORT_ERROR',
        'SQLiteFile'
      );
    }
  }

  async loadSeedData(seedData: Record<string, any[]>): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', 'SQLiteFile');
    }

    try {
      await this.service.loadSeedData(seedData);
    } catch (error) {
      throw new DatabaseError(
        `Failed to load seed data: ${error.message}`,
        'SEED_DATA_ERROR',
        'SQLiteFile'
      );
    }
  }

  getDatabasePath(): string {
    return this.service.getDatabasePath();
  }

  // Static factory method
  static create(config: Partial<SQLiteFileConfig> = {}): SQLiteFileProvider {
    const defaultConfig: SQLiteFileConfig = {
      type: 'sqlite-file',
      storage: {
        type: 'file',
        path: './data'
      },
      databaseName: 'schoolpilot_dev.db',
      enableWAL: true,
      enableForeignKeys: true
    };

    return new SQLiteFileProvider({ ...defaultConfig, ...config });
  }

  // Utility methods for development
  async clearAllData(): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', 'SQLiteFile');
    }

    try {
      const collections = await this.listCollections();
      for (const collectionName of collections) {
        const collection = await this.getCollection(collectionName);
        if (collection) {
          const docs = await collection.find();
          for (const doc of docs) {
            if (doc.id) {
              await collection.remove(doc.id);
            }
          }
        }
      }
      console.log('[SQLiteFileProvider] All data cleared successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to clear all data: ${error.message}`,
        'CLEAR_DATA_ERROR',
        'SQLiteFile'
      );
    }
  }

  async getCollectionStats(): Promise<Record<string, { count: number; size?: string }>> {
    if (!this.isInitialized) {
      return {};
    }

    try {
      const stats: Record<string, { count: number; size?: string }> = {};
      const collections = await this.listCollections();
      
      for (const collectionName of collections) {
        const collection = await this.getCollection(collectionName);
        if (collection) {
          const count = await collection.count();
          stats[collectionName] = { count };
        }
      }
      
      return stats;
    } catch (error) {
      console.error('[SQLiteFileProvider] Failed to get collection stats:', error);
      return {};
    }
  }
}

// Export default instance for easy usage
export const sqliteFileProvider = SQLiteFileProvider.create();