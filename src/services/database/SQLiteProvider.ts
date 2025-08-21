// ABOUTME: SQLite Provider Factory for database abstraction layer
// ABOUTME: Integrates SQLite OPFS implementation with existing provider system

import { IDatabaseProvider, DatabaseConfig, CollectionSchema } from '../database/interfaces';
import { SQLiteOPFSService } from '../sqlite/SQLiteOPFSService';

export class SQLiteProvider implements IDatabaseProvider {
  public readonly name = 'SQLiteOPFS';
  public readonly version = '1.0.0';
  
  private sqliteService: SQLiteOPFSService;
  private isInitialized = false;
  private config: DatabaseConfig | null = null;

  constructor() {
    this.sqliteService = new SQLiteOPFSService();
  }

  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      this.config = config;
      const dbName = config.name ? `${config.name}.db` : 'schoolpilot.db';
      await this.sqliteService.initialize(dbName);
      this.isInitialized = true;
      console.log('[SQLiteProvider] Provider initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize SQLite provider: ${error.message}`);
    }
  }

  async createCollection<T>(name: string, schema: CollectionSchema): Promise<any> {
    try {
      if (!this.isInitialized) {
        throw new Error('Provider not initialized');
      }
      
      return await this.sqliteService.createCollection<T>(name, schema);
    } catch (error) {
      throw new Error(`Failed to create collection '${name}': ${error.message}`);
    }
  }

  getCollection<T>(name: string): any | null {
    if (!this.isInitialized) {
      return null;
    }
    
    return this.sqliteService.getCollection<T>(name);
  }

  getAllCollections(): Map<string, any> {
    if (!this.isInitialized) {
      return new Map();
    }
    
    return this.sqliteService.getAllCollections();
  }

  async destroy(): Promise<void> {
    try {
      await this.sqliteService.destroy();
      this.isInitialized = false;
      console.log('[SQLiteProvider] Provider destroyed successfully');
    } catch (error) {
      throw new Error(`Failed to destroy SQLite provider: ${error.message}`);
    }
  }

  isAvailable(): boolean {
    // Check if the environment supports SQLite
    // In Node.js, we can use SQLite
    // In browser, we check for window object
    return typeof window !== 'undefined' || typeof process !== 'undefined';
  }

  getStatus(): any {
    if (!this.isInitialized) {
      return {
        name: this.name,
        version: this.version,
        isConnected: false,
        collectionsCount: 0
      };
    }
    
    return this.sqliteService.getStatus();
  }

  async backup(): Promise<string> {
    try {
      return await this.sqliteService.backup();
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async restore(backupData: string): Promise<void> {
    try {
      await this.sqliteService.restore(backupData);
    } catch (error) {
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }
}