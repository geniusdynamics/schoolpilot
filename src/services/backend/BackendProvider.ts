import { logger } from '@/utils/logging';

/**
 * Backend Provider
 * 
 * DataProvider implementation that connects to external backend services.
 * Integrates with the Unified Data Service (UDS) system.
 */

import type { DataProvider, Query, DataProviderConfig } from '../data/types';
import type { BackendConfig, SyncConfig, BackendStatus } from './types';
import { BackendClient } from './BackendClient';

export interface BackendProviderConfig extends DataProviderConfig {
  backend: BackendConfig;
  localCache?: boolean;  // Whether to maintain local cache
}

export class BackendProvider implements DataProvider {
  readonly type = 'backend';
  
  private client: BackendClient;
  private config: BackendProviderConfig;
  private localCache: Map<string, Map<string, any>> = new Map();
  private syncInterval: number | null = null;
  private isInitialized = false;

  // Event handlers
  public onStatusChange?: (status: BackendStatus) => void;
  public onSyncError?: (error: Error) => void;

  constructor(config: BackendProviderConfig) {
    this.config = config;
    this.client = new BackendClient(config.backend);
    
    // Wire up event handlers
    this.client.onStatusChange = (status) => {
      this.onStatusChange?.(status);
    };
    
    this.client.onError = (error) => {
      this.onSyncError?.(new Error(error.message));
    };
  }

  // ============================================================================
  // DataProvider Implementation
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Authenticate with backend
    const authenticated = await this.client.authenticate();
    if (!authenticated) {
      throw new Error('Failed to authenticate with backend');
    }

    // Load local cache if enabled
    if (this.config.localCache) {
      await this.loadCache();
    }

    // Setup auto-sync if configured
    if (this.config.backend.sync.enabled && this.config.backend.sync.interval > 0) {
      this.startAutoSync(this.config.backend.sync.interval);
    }

    this.isInitialized = true;
  }

  async destroy(): Promise<void> {
    this.stopAutoSync();
    this.client.logout();
    
    if (this.config.localCache) {
      await this.saveCache();
    }
    
    this.localCache.clear();
    this.isInitialized = false;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async find<T>(collection: string, query?: Query<T>): Promise<T[]> {
    this.ensureInitialized();

    // Check local cache first if offline or cache-first
    if (this.config.localCache && !navigator.onLine) {
      return this.queryCache<T>(collection, query);
    }

    try {
      const records = await this.client.fetchCollection(collection, query);
      
      // Update cache
      if (this.config.localCache) {
        this.updateCache(collection, records);
      }

      return records as T[];
    } catch (error) {
      // Fallback to cache on error
      if (this.config.localCache) {
        logger.warn(`Backend fetch failed, using cache: ${error}`);
        return this.queryCache<T>(collection, query);
      }
      throw error;
    }
  }

  async findOne<T>(collection: string, id: string): Promise<T | null> {
    this.ensureInitialized();

    // Check cache first
    if (this.config.localCache) {
      const cached = this.getFromCache<T>(collection, id);
      if (cached) return cached;
    }

    try {
      const record = await this.client.fetchRecord(collection, id);
      
      if (record && this.config.localCache) {
        this.updateCache(collection, [record]);
      }

      return record as T;
    } catch (error) {
      if (this.config.localCache) {
        logger.warn(`Backend fetch failed, using cache: ${error}`);
        return this.getFromCache<T>(collection, id);
      }
      throw error;
    }
  }

  async insert<T>(collection: string, data: Omit<T, 'id'>): Promise<T> {
    this.ensureInitialized();

    const record = await this.client.createRecord(collection, data as any);
    
    if (this.config.localCache) {
      this.updateCache(collection, [record]);
    }

    return record as T;
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
    this.ensureInitialized();

    const record = await this.client.updateRecord(collection, id, data as any);
    
    if (this.config.localCache) {
      this.updateCache(collection, [record]);
    }

    return record as T;
  }

  async delete<T>(collection: string, id: string): Promise<void> {
    this.ensureInitialized();

    await this.client.deleteRecord(collection, id);
    
    if (this.config.localCache) {
      this.removeFromCache(collection, id);
    }
  }

  // ============================================================================
  // Transaction Support
  // ============================================================================

  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    // Backend doesn't support true transactions via HTTP
    // Operations are executed sequentially, best effort
    return operations();
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  async sync(): Promise<void> {
    this.ensureInitialized();

    try {
      // TODO: Implement proper sync with local changes
      // This would involve:
      // 1. Get pending local changes
      // 2. Fetch remote changes
      // 3. Resolve conflicts
      // 4. Apply changes

      const status = await this.client.checkHealth();
      this.onStatusChange?.(status);
    } catch (error) {
      this.onSyncError?.(error as Error);
      throw error;
    }
  }

  async getPendingChanges(): Promise<any[]> {
    // TODO: Implement pending changes tracking
    return [];
  }

  async clearPendingChanges(): Promise<void> {
    // TODO: Implement clear pending changes
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async checkHealth(): Promise<{ status: 'healthy' | 'unhealthy' | 'degraded'; latency?: number; error?: string }> {
    try {
      const status = await this.client.checkHealth();
      
      return {
        status: status.connected ? 'healthy' : 'unhealthy',
        latency: status.latency,
        error: status.error?.message,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // Auto-Sync
  // ============================================================================

  startAutoSync(intervalSeconds: number): void {
    this.stopAutoSync();
    
    this.syncInterval = window.setInterval(() => {
      this.sync().catch(error => {
        logger.error('Auto-sync failed:', error);
      });
    }, intervalSeconds * 1000);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  private getFromCache<T>(collection: string, id: string): T | null {
    const collectionCache = this.localCache.get(collection);
    if (!collectionCache) return null;
    
    const record = collectionCache.get(id);
    return record ? { ...record } as T : null;
  }

  private queryCache<T>(collection: string, query?: Query<T>): T[] {
    const collectionCache = this.localCache.get(collection);
    if (!collectionCache) return [];

    let records = Array.from(collectionCache.values());

    if (query?.filter) {
      records = records.filter(record => this.matchesFilter(record, query.filter));
    }

    if (query?.sort) {
      records = this.applySort(records, query.sort);
    }

    if (query?.offset) {
      records = records.slice(query.offset);
    }

    if (query?.limit) {
      records = records.slice(0, query.limit);
    }

    return records.map(r => ({ ...r })) as T[];
  }

  private updateCache(collection: string, records: any[]): void {
    if (!this.localCache.has(collection)) {
      this.localCache.set(collection, new Map());
    }
    
    const collectionCache = this.localCache.get(collection)!;
    
    for (const record of records) {
      if (record.id) {
        collectionCache.set(record.id, { ...record });
      }
    }
  }

  private removeFromCache(collection: string, id: string): void {
    const collectionCache = this.localCache.get(collection);
    if (collectionCache) {
      collectionCache.delete(id);
    }
  }

  private matchesFilter(record: any, filter: any): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'object' && value !== null) {
        // Handle operators like $gt, $lt, etc.
        if (!this.matchesOperator(record[key], value)) {
          return false;
        }
      } else if (record[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private matchesOperator(fieldValue: any, operatorObj: any): boolean {
    for (const [op, val] of Object.entries(operatorObj)) {
      switch (op) {
        case '$eq':
          if (fieldValue !== val) return false;
          break;
        case '$ne':
          if (fieldValue === val) return false;
          break;
        case '$gt':
          if (!(fieldValue > val)) return false;
          break;
        case '$gte':
          if (!(fieldValue >= val)) return false;
          break;
        case '$lt':
          if (!(fieldValue < val)) return false;
          break;
        case '$lte':
          if (!(fieldValue <= val)) return false;
          break;
        case '$in':
          if (!Array.isArray(val) || !val.includes(fieldValue)) return false;
          break;
        case '$nin':
          if (!Array.isArray(val) || val.includes(fieldValue)) return false;
          break;
        default:
          return false;
      }
    }
    return true;
  }

  private applySort(records: any[], sort: any): any[] {
    const sortKeys = Object.entries(sort);
    
    return records.sort((a, b) => {
      for (const [key, direction] of sortKeys) {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private async loadCache(): Promise<void> {
    try {
      const cached = localStorage.getItem(`backend_cache_${this.config.backend.id}`);
      if (cached) {
        const data = JSON.parse(cached);
        for (const [collection, records] of Object.entries(data)) {
          const map = new Map();
          for (const record of records as any[]) {
            map.set(record.id, record);
          }
          this.localCache.set(collection, map);
        }
      }
    } catch (error) {
      logger.warn('Failed to load cache:', error);
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const data: Record<string, any[]> = {};
      for (const [collection, map] of this.localCache) {
        data[collection] = Array.from(map.values());
      }
      localStorage.setItem(`backend_cache_${this.config.backend.id}`, JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to save cache:', error);
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('BackendProvider not initialized. Call initialize() first.');
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  getClient(): BackendClient {
    return this.client;
  }

  getConfig(): BackendProviderConfig {
    return this.config;
  }

  async getCapabilities() {
    return this.client.getCapabilities();
  }
}

export default BackendProvider;
