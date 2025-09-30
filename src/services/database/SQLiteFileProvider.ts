// ABOUTME: SQLite provider for development mode using file storage instead of OPFS
// ABOUTME: Implements IDatabaseProvider interface with file-based SQLite for easy database inspection

import { IDatabaseProvider, ICollection, DatabaseConfig, BackupData } from './types';
import { SQLiteFileService } from '../sqlite/SQLiteFileService';
import { SQLiteFileCollection } from '../sqlite/SQLiteFileService';

export class SQLiteFileProvider implements IDatabaseProvider {
  public readonly name = 'SQLiteFile';
  public readonly version = '1.0.0';
  private sqliteService: SQLiteFileService;
  private collections: Map<string, SQLiteFileCollection> = new Map();
  private isInitialized = false;

  constructor(config?: DatabaseConfig) {
    this.sqliteService = new SQLiteFileService(config);
  }

  async initialize(): Promise<void> {
    try {
      await this.sqliteService.initialize();
      this.isInitialized = true;
      console.log('SQLiteFileProvider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQLiteFileProvider:', error);
      throw error;
    }
  }

  async createCollection<T = any>(name: string, schema?: any): Promise<ICollection<T>> {
    if (!this.isInitialized) {
      throw new Error('SQLiteFileProvider not initialized');
    }

    try {
      const collection = await this.sqliteService.createCollection<T>(name, schema);
      this.collections.set(name, collection);
      return collection;
    } catch (error) {
      console.error(`Failed to create collection ${name}:`, error);
      throw error;
    }
  }

  async getCollection<T = any>(name: string): Promise<ICollection<T> | null> {
    if (!this.isInitialized) {
      throw new Error('SQLiteFileProvider not initialized');
    }

    // Check if collection is already cached
    if (this.collections.has(name)) {
      return this.collections.get(name) as ICollection<T>;
    }

    try {
      const collection = await this.sqliteService.getCollection<T>(name);
      if (collection) {
        this.collections.set(name, collection);
      }
      return collection;
    } catch (error) {
      console.error(`Failed to get collection ${name}:`, error);
      return null;
    }
  }

  async destroy(): Promise<void> {
    try {
      // Clear collections cache
      this.collections.clear();
      
      // Destroy the SQLite service
      await this.sqliteService.destroy();
      this.isInitialized = false;
      
      console.log('SQLiteFileProvider destroyed successfully');
    } catch (error) {
      console.error('Failed to destroy SQLiteFileProvider:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if SQLite is available in the current environment
      return await this.sqliteService.isAvailable();
    } catch (error) {
      console.error('Error checking SQLiteFileProvider availability:', error);
      return false;
    }
  }

  async getStatus(): Promise<{
    isConnected: boolean;
    collections: string[];
    storageInfo?: any;
  }> {
    try {
      const status = await this.sqliteService.getStatus();
      return {
        isConnected: this.isInitialized && status.isConnected,
        collections: Array.from(this.collections.keys()),
        storageInfo: {
          type: 'file',
          path: status.databasePath,
          size: status.databaseSize
        }
      };
    } catch (error) {
      console.error('Error getting SQLiteFileProvider status:', error);
      return {
        isConnected: false,
        collections: []
      };
    }
  }

  async backup(): Promise<BackupData> {
    if (!this.isInitialized) {
      throw new Error('SQLiteFileProvider not initialized');
    }

    try {
      return await this.sqliteService.backup();
    } catch (error) {
      console.error('Failed to backup SQLiteFileProvider:', error);
      throw error;
    }
  }

  async restore(backupData: BackupData): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SQLiteFileProvider not initialized');
    }

    try {
      await this.sqliteService.restore(backupData);
      // Clear collections cache after restore
      this.collections.clear();
      console.log('SQLiteFileProvider restored successfully');
    } catch (error) {
      console.error('Failed to restore SQLiteFileProvider:', error);
      throw error;
    }
  }

  // Development-specific methods
  async exportDatabase(): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('SQLiteFileProvider not initialized');
    }

    try {
      return await this.sqliteService.exportDatabase();
    } catch (error) {
      console.error('Failed to export database:', error);
      throw error;
    }
  }

  async loadSeedData(seedData: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SQLiteFileProvider not initialized');
    }

    try {
      await this.sqliteService.loadSeedData(seedData);
      console.log('Seed data loaded successfully');
    } catch (error) {
      console.error('Failed to load seed data:', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SQLiteFileProvider not initialized');
    }

    try {
      await this.sqliteService.clearAllData();
      this.collections.clear();
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  async getCollectionStats(collectionName: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('SQLiteFileProvider not initialized');
    }

    try {
      return await this.sqliteService.getCollectionStats(collectionName);
    } catch (error) {
      console.error(`Failed to get stats for collection ${collectionName}:`, error);
      throw error;
    }
  }

  // File-specific methods for development
  getDatabasePath(): string {
    return this.sqliteService.getDatabasePath();
  }

  async vacuum(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SQLiteFileProvider not initialized');
    }

    try {
      await this.sqliteService.vacuum();
      console.log('Database vacuumed successfully');
    } catch (error) {
      console.error('Failed to vacuum database:', error);
      throw error;
    }
  }
}

export default SQLiteFileProvider;