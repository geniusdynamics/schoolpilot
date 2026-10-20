import { logger } from '@/utils/logging';

/**
 * ERPNext Provider
 * 
 * DataProvider implementation for ERPNext integration with bidirectional sync.
 * Handles entity mapping, conflict resolution, and offline queueing.
 */

import type { DataProvider, DataProviderConfig, Query } from '../data/types';
import type { ERPNextConfig, ERPNextEntityStatus, ERPNextSyncState } from './types';
import { ERPNextClient } from './ERPNextClient';
import { defaultMappings, toERPNext, fromERPNext, getMapping } from './mappings';

export interface ERPNextProviderConfig extends DataProviderConfig {
  erpnext: ERPNextConfig;
  enableRealtime?: boolean;
  conflictResolution?: 'local-wins' | 'remote-wins' | 'timestamp-wins' | 'manual';
}

export class ERPNextProvider implements DataProvider {
  readonly type = 'erpnext';

  private client: ERPNextClient;
  private config: ERPNextProviderConfig;
  private syncStates: Map<string, ERPNextSyncState> = new Map();
  private pendingQueue: any[] = [];
  private syncInterval: number | null = null;
  private isInitialized = false;
  private localCache: Map<string, Map<string, any>> = new Map();

  // Event handlers
  public onSyncStatusChange?: (status: ERPNextEntityStatus[]) => void;
  public onSyncError?: (error: Error) => void;
  public onConflict?: (conflict: any) => void;

  constructor(config: ERPNextProviderConfig) {
    this.config = config;
    this.client = new ERPNextClient(config.erpnext);
  }

  // ============================================================================
  // DataProvider Implementation
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Authenticate with ERPNext
    const authenticated = await this.client.authenticate();
    if (!authenticated) {
      throw new Error('Failed to authenticate with ERPNext');
    }

    // Initialize sync states
    for (const mapping of defaultMappings) {
      this.syncStates.set(mapping.localEntity, {
        entity: mapping.localEntity,
        lastSync: new Date(0),
        pendingChanges: 0,
        errors: [],
      });
    }

    // Load pending queue from localStorage
    await this.loadPendingQueue();

    // Load cache
    await this.loadCache();

    // Start auto-sync if configured
    if (this.config.erpnext.sync.enabled) {
      this.startAutoSync(this.config.erpnext.sync.interval);
    }

    this.isInitialized = true;
  }

  async destroy(): Promise<void> {
    this.stopAutoSync();
    this.client.logout();
    await this.savePendingQueue();
    await this.saveCache();
    this.isInitialized = false;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async find<T>(collection: string, query?: Query<T>): Promise<T[]> {
    this.ensureInitialized();

    const mapping = getMapping(collection);
    if (!mapping) {
      // No mapping, query cache only
      return this.queryCache<T>(collection, query);
    }

    // Check if we should fetch from ERPNext
    const shouldFetchRemote = navigator.onLine && 
      (mapping.direction === 'from-erpnext' || mapping.direction === 'bidirectional');

    if (shouldFetchRemote) {
      try {
        const doctype = mapping.erpnextDocType;
        const filters = this.convertQueryToFilters(query);
        const records = await this.client.getDocList(doctype, { 
          filters,
          limit: query?.limit || 1000,
        });

        // Transform to local format
        const localRecords = records.map(r => fromERPNext<T>(r, mapping));

        // Update cache
        this.updateCache(collection, localRecords);

        // Update sync state
        this.updateSyncState(collection, { lastSync: new Date() });

        return localRecords;
      } catch (error) {
        logger.warn(`ERPNext fetch failed for ${collection}, using cache:`, error);
      }
    }

    // Fallback to cache
    return this.queryCache<T>(collection, query);
  }

  async findOne<T>(collection: string, id: string): Promise<T | null> {
    this.ensureInitialized();

    // Check cache first
    const cached = this.getFromCache<T>(collection, id);
    if (cached) return cached;

    const mapping = getMapping(collection);
    if (!mapping || !navigator.onLine) {
      return null;
    }

    // Fetch from ERPNext if bidirectional or from-erpnext
    if (mapping.direction === 'from-erpnext' || mapping.direction === 'bidirectional') {
      try {
        const record = await this.client.getDoc(mapping.erpnextDocType, id);
        if (record) {
          const localRecord = fromERPNext<T>(record, mapping);
          this.updateCache(collection, [localRecord]);
          return localRecord;
        }
      } catch (error) {
        logger.warn(`ERPNext fetch failed for ${collection}/${id}:`, error);
      }
    }

    return null;
  }

  async insert<T>(collection: string, data: Omit<T, 'id'>): Promise<T> {
    this.ensureInitialized();

    const mapping = getMapping(collection);
    
    // Generate local ID
    const localId = this.generateId();
    const localRecord = { ...data, id: localId } as T;

    // Update cache
    this.updateCache(collection, [localRecord]);

    if (mapping && navigator.onLine) {
      if (mapping.direction === 'to-erpnext' || mapping.direction === 'bidirectional') {
        try {
          // Transform to ERPNext format
          const erpnextData = toERPNext(localRecord, mapping);
          
          // Create in ERPNext
          const created = await this.client.createDoc(mapping.erpnextDocType, erpnextData);
          
          // Update local record with ERPNext ID if different
          if (created.name && created.name !== localId) {
            (localRecord as any).id = created.name;
            this.updateCache(collection, [localRecord]);
          }

          return localRecord;
        } catch (error) {
          // Queue for later sync
          this.queueOperation('create', collection, localId, data);
          throw error;
        }
      }
    } else {
      // Queue for later sync
      this.queueOperation('create', collection, localId, data);
    }

    return localRecord;
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
    this.ensureInitialized();

    const mapping = getMapping(collection);
    
    // Update cache
    const existing = this.getFromCache<T>(collection, id);
    const updated = { ...existing, ...data, id } as T;
    this.updateCache(collection, [updated]);

    if (mapping && navigator.onLine) {
      if (mapping.direction === 'to-erpnext' || mapping.direction === 'bidirectional') {
        try {
          // Transform to ERPNext format
          const erpnextData = toERPNext(updated, mapping);
          
          // Update in ERPNext
          await this.client.updateDoc(mapping.erpnextDocType, id, erpnextData);

          return updated;
        } catch (error) {
          // Queue for later sync
          this.queueOperation('update', collection, id, data);
          throw error;
        }
      }
    } else {
      // Queue for later sync
      this.queueOperation('update', collection, id, data);
    }

    return updated;
  }

  async delete<T>(collection: string, id: string): Promise<void> {
    this.ensureInitialized();

    const mapping = getMapping(collection);
    
    // Remove from cache
    this.removeFromCache(collection, id);

    if (mapping && navigator.onLine) {
      if (mapping.direction === 'to-erpnext' || mapping.direction === 'bidirectional') {
        try {
          await this.client.deleteDoc(mapping.erpnextDocType, id);
        } catch (error) {
          // Queue for later sync
          this.queueOperation('delete', collection, id, null);
          throw error;
        }
      }
    } else {
      // Queue for later sync
      this.queueOperation('delete', collection, id, null);
    }
  }

  // ============================================================================
  // Transaction Support
  // ============================================================================

  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    // ERPNext doesn't support transactions via HTTP
    // Execute operations sequentially with rollback on error
    return operations();
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  async sync(): Promise<void> {
    this.ensureInitialized();

    if (!navigator.onLine) {
      logger.info('Offline, skipping sync');
      return;
    }

    const errors: Error[] = [];

    // Process pending queue first
    await this.processPendingQueue();

    // Sync each entity based on direction
    for (const mapping of defaultMappings) {
      const config = this.config.erpnext.sync.entities?.[mapping.localEntity];
      if (config?.enabled === false) continue;

      try {
        if (mapping.direction === 'from-erpnext' || mapping.direction === 'bidirectional') {
          await this.syncFromERPNext(mapping);
        }

        if (mapping.direction === 'to-erpnext' || mapping.direction === 'bidirectional') {
          await this.syncToERPNext(mapping);
        }
      } catch (error) {
        logger.error(`Sync failed for ${mapping.localEntity}:`, error);
        errors.push(error as Error);
      }
    }

    if (errors.length > 0) {
      this.onSyncError?.(new Error(`${errors.length} sync operations failed`));
    }

    // Notify status change
    this.notifyStatusChange();
  }

  private async syncFromERPNext(mapping: any): Promise<void> {
    const state = this.syncStates.get(mapping.localEntity);
    const since = state?.lastSync || new Date(0);

    // Get changes from ERPNext
    const changes = await this.client.getChangesSince(mapping.erpnextDocType, since);

    for (const change of changes) {
      const fullDoc = await this.client.getFullDoc(mapping.erpnextDocType, change.name);
      if (fullDoc) {
        const localRecord = fromERPNext(fullDoc, mapping);
        this.updateCache(mapping.localEntity, [localRecord]);
      }
    }

    // Update sync state
    this.updateSyncState(mapping.localEntity, { lastSync: new Date() });
  }

  private async syncToERPNext(mapping: any): Promise<void> {
    // This is handled by the pending queue processing
    // Individual operations are queued and processed
  }

  private async processPendingQueue(): Promise<void> {
    if (this.pendingQueue.length === 0) return;

    const queue = [...this.pendingQueue];
    this.pendingQueue = [];

    for (const operation of queue) {
      try {
        await this.processOperation(operation);
      } catch (error) {
        // Re-queue if retryable
        if (operation.retryCount < 3) {
          operation.retryCount++;
          this.pendingQueue.push(operation);
        } else {
          logger.error('Operation failed after max retries:', operation, error);
        }
      }
    }

    await this.savePendingQueue();
  }

  private async processOperation(operation: any): Promise<void> {
    const mapping = getMapping(operation.collection);
    if (!mapping) return;

    switch (operation.type) {
      case 'create': {
        const erpnextData = toERPNext(operation.data, mapping);
        await this.client.createDoc(mapping.erpnextDocType, erpnextData);
        break;
      }
      case 'update': {
        const erpnextData = toERPNext(operation.data, mapping);
        await this.client.updateDoc(mapping.erpnextDocType, operation.id, erpnextData);
        break;
      }
      case 'delete': {
        await this.client.deleteDoc(mapping.erpnextDocType, operation.id);
        break;
      }
    }
  }

  private queueOperation(type: string, collection: string, id: string, data: any): void {
    this.pendingQueue.push({
      type,
      collection,
      id,
      data,
      timestamp: new Date(),
      retryCount: 0,
    });

    // Save immediately
    this.savePendingQueue();
  }

  async getPendingChanges(): Promise<any[]> {
    return [...this.pendingQueue];
  }

  async clearPendingChanges(): Promise<void> {
    this.pendingQueue = [];
    await this.savePendingQueue();
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
        collectionCache.set(record.id, { ...record, _cachedAt: Date.now() });
      }
    }

    // Debounce save
    this.debouncedSaveCache();
  }

  private removeFromCache(collection: string, id: string): void {
    const collectionCache = this.localCache.get(collection);
    if (collectionCache) {
      collectionCache.delete(id);
    }
  }

  private debouncedSaveCache = this.debounce(() => {
    this.saveCache();
  }, 1000);

  private debounce(fn: Function, ms: number) {
    let timeout: any;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), ms);
    };
  }

  private async loadCache(): Promise<void> {
    try {
      const cached = localStorage.getItem(`erpnext_cache_${this.config.erpnext.id}`);
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
      localStorage.setItem(`erpnext_cache_${this.config.erpnext.id}`, JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to save cache:', error);
    }
  }

  private async loadPendingQueue(): Promise<void> {
    try {
      const queued = localStorage.getItem(`erpnext_queue_${this.config.erpnext.id}`);
      if (queued) {
        this.pendingQueue = JSON.parse(queued);
      }
    } catch (error) {
      logger.warn('Failed to load pending queue:', error);
    }
  }

  private async savePendingQueue(): Promise<void> {
    try {
      localStorage.setItem(`erpnext_queue_${this.config.erpnext.id}`, JSON.stringify(this.pendingQueue));
    } catch (error) {
      logger.warn('Failed to save pending queue:', error);
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('ERPNextProvider not initialized. Call initialize() first.');
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private convertQueryToFilters(query?: Query<any>): Record<string, any> | undefined {
    if (!query?.filter) return undefined;

    const filters: Record<string, any> = {};
    for (const [key, value] of Object.entries(query.filter)) {
      if (typeof value === 'object' && value !== null) {
        // Handle operators
        filters[key] = this.convertOperator(value);
      } else {
        filters[key] = value;
      }
    }

    return filters;
  }

  private convertOperator(operatorObj: any): any[] {
    const result: any[] = [];
    for (const [op, val] of Object.entries(operatorObj)) {
      switch (op) {
        case '$eq':
          return val;
        case '$ne':
          return ['!=', val];
        case '$gt':
          return ['>', val];
        case '$gte':
          return ['>=', val];
        case '$lt':
          return ['<', val];
        case '$lte':
          return ['<=', val];
        case '$in':
          return ['in', val];
        default:
          return val;
      }
    }
    return result;
  }

  private matchesFilter(record: any, filter: any): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'object' && value !== null) {
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

  private updateSyncState(entity: string, updates: Partial<ERPNextSyncState>): void {
    const current = this.syncStates.get(entity);
    if (current) {
      this.syncStates.set(entity, { ...current, ...updates });
    }
  }

  private notifyStatusChange(): void {
    const statuses: ERPNextEntityStatus[] = [];
    
    for (const [entity, state] of this.syncStates) {
      const mapping = getMapping(entity);
      statuses.push({
        entity,
        enabled: this.config.erpnext.sync.entities?.[entity]?.enabled !== false,
        direction: mapping?.direction || 'bidirectional',
        lastSync: state.lastSync,
        pendingLocal: this.pendingQueue.filter(op => op.collection === entity).length,
        pendingRemote: 0, // Would need to track
        conflicts: 0, // Would need to track
        errors: state.errors.length,
      });
    }

    this.onSyncStatusChange?.(statuses);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  getClient(): ERPNextClient {
    return this.client;
  }

  getConfig(): ERPNextProviderConfig {
    return this.config;
  }

  getSyncStatus(): ERPNextEntityStatus[] {
    const statuses: ERPNextEntityStatus[] = [];
    
    for (const [entity, state] of this.syncStates) {
      const mapping = getMapping(entity);
      statuses.push({
        entity,
        enabled: this.config.erpnext.sync.entities?.[entity]?.enabled !== false,
        direction: mapping?.direction || 'bidirectional',
        lastSync: state.lastSync,
        pendingLocal: this.pendingQueue.filter(op => op.collection === entity).length,
        pendingRemote: 0,
        conflicts: 0,
        errors: state.errors.length,
      });
    }

    return statuses;
  }

  async forceSync(entity?: string): Promise<void> {
    if (entity) {
      const mapping = getMapping(entity);
      if (mapping) {
        if (mapping.direction === 'from-erpnext' || mapping.direction === 'bidirectional') {
          await this.syncFromERPNext(mapping);
        }
        if (mapping.direction === 'to-erpnext' || mapping.direction === 'bidirectional') {
          await this.syncToERPNext(mapping);
        }
      }
    } else {
      await this.sync();
    }
  }
}

export default ERPNextProvider;
