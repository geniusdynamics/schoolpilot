// ABOUTME: Factory for creating storage adapters based on configuration
// ABOUTME: Provides centralized adapter management and initialization

import { IStorageAdapter, StorageType } from '../types';
import { SQLiteOPFSAdapter } from './SQLiteOPFSAdapter';
import { PouchDBAdapter } from './PouchDBAdapter';
import { MockAdapter } from './MockAdapter';

export class AdapterFactory {
  private static adapters: Map<StorageType, IStorageAdapter> = new Map();

  static async createAdapter(storageType: StorageType): Promise<IStorageAdapter> {
    // Return existing adapter if already created
    if (this.adapters.has(storageType)) {
      return this.adapters.get(storageType)!;
    }

    let adapter: IStorageAdapter;

    switch (storageType) {
      case 'sqlite-opfs':
        adapter = new SQLiteOPFSAdapter();
        break;
      
      case 'sqlite-livestore':
        // For now, use SQLite OPFS as base - can be extended for Livestore specifics
        adapter = new SQLiteOPFSAdapter();
        break;
      
      case 'pouchdb':
        adapter = new PouchDBAdapter();
        break;
      
      case 'mock':
        adapter = new MockAdapter();
        break;
      
      default:
        throw new Error(`Unsupported storage type: ${storageType}`);
    }

    // Initialize the adapter
    await adapter.initialize();
    
    // Cache the adapter
    this.adapters.set(storageType, adapter);
    
    console.log(`Created and initialized ${storageType} adapter`);
    return adapter;
  }

  static async getAdapter(storageType: StorageType): Promise<IStorageAdapter> {
    const adapter = this.adapters.get(storageType);
    if (!adapter) {
      return this.createAdapter(storageType);
    }
    return adapter;
  }

  static async cleanupAdapter(storageType: StorageType): Promise<void> {
    const adapter = this.adapters.get(storageType);
    if (adapter) {
      await adapter.cleanup();
      this.adapters.delete(storageType);
      console.log(`Cleaned up ${storageType} adapter`);
    }
  }

  static async cleanupAllAdapters(): Promise<void> {
    const cleanupPromises = Array.from(this.adapters.entries()).map(
      async ([storageType, adapter]) => {
        try {
          await adapter.cleanup();
          console.log(`Cleaned up ${storageType} adapter`);
        } catch (error) {
          console.error(`Error cleaning up ${storageType} adapter:`, error);
        }
      }
    );

    await Promise.all(cleanupPromises);
    this.adapters.clear();
    console.log('All adapters cleaned up');
  }

  static getActiveAdapters(): StorageType[] {
    return Array.from(this.adapters.keys());
  }

  static isAdapterActive(storageType: StorageType): boolean {
    return this.adapters.has(storageType);
  }

  static async testAdapter(storageType: StorageType): Promise<boolean> {
    try {
      const adapter = await this.createAdapter(storageType);
      
      // Test basic operations
      await adapter.createSchema('test_table', `
        CREATE TABLE test_table (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TEXT
        )
      `);
      
      await adapter.insertBatch('test_table', [
        { id: 'test1', name: 'Test Record', created_at: new Date().toISOString() }
      ]);
      
      const results = await adapter.query('SELECT * FROM test_table WHERE id = ?', ['test1']);
      
      const success = results.length === 1 && results[0].name === 'Test Record';
      
      // Cleanup test data
      try {
        await adapter.query('DROP TABLE test_table');
      } catch {
        // Ignore cleanup errors
      }
      
      return success;
    } catch (error) {
      console.error(`Adapter test failed for ${storageType}:`, error);
      return false;
    }
  }

  static async getAdapterCapabilities(storageType: StorageType): Promise<{
    supportsTransactions: boolean;
    supportsIndexes: boolean;
    supportsFullTextSearch: boolean;
    supportsSync: boolean;
    supportsOffline: boolean;
    maxBatchSize: number;
  }> {
    const capabilities = {
      supportsTransactions: false,
      supportsIndexes: false,
      supportsFullTextSearch: false,
      supportsSync: false,
      supportsOffline: false,
      maxBatchSize: 1000
    };

    switch (storageType) {
      case 'sqlite-opfs':
      case 'sqlite-livestore':
        return {
          ...capabilities,
          supportsTransactions: true,
          supportsIndexes: true,
          supportsFullTextSearch: true,
          supportsOffline: true,
          maxBatchSize: 10000
        };
      
      case 'pouchdb':
        return {
          ...capabilities,
          supportsIndexes: true,
          supportsSync: true,
          supportsOffline: true,
          maxBatchSize: 5000
        };
      
      case 'mock':
        return {
          ...capabilities,
          supportsOffline: true,
          maxBatchSize: 50000
        };
      
      default:
        return capabilities;
    }
  }
}