// ABOUTME: Backend API Integration Provider for external systems integration
// ABOUTME: Provides bidirectional sync with ERPNext, custom APIs, and other backend systems

import { Observable, Subject, BehaviorSubject, interval } from 'rxjs';
import { map, filter, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import {
  IDatabaseProvider,
  ICollection,
  DatabaseConfig,
  CollectionSchema,
  QueryOptions,
  InsertResult,
  UpdateResult,
  DeleteResult,
  BulkResult,
  CollectionChangeEvent,
  ProviderStatus,
  CollectionStats,
  IndexDefinition,
  DatabaseError,
  CollectionError
} from './interfaces';

// Backend API Configuration
export interface BackendAPIConfig extends DatabaseConfig {
  apiBaseUrl: string;
  apiKey?: string;
  authToken?: string;
  authType?: 'bearer' | 'api-key' | 'basic' | 'custom';
  customHeaders?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  syncInterval?: number;
  batchSize?: number;
  enableOfflineQueue?: boolean;
  conflictResolution?: 'local' | 'remote' | 'manual';
  endpoints?: {
    [collectionName: string]: BackendEndpointConfig;
  };
}

export interface BackendEndpointConfig {
  basePath: string;
  idField?: string;
  timestampField?: string;
  methods?: {
    list?: string; // GET /api/students
    get?: string;  // GET /api/students/:id
    create?: string; // POST /api/students
    update?: string; // PUT /api/students/:id
    delete?: string; // DELETE /api/students/:id
    sync?: string;   // GET /api/students/sync?since=timestamp
  };
  mapping?: {
    [localField: string]: string; // Map local field to API field
  };
  filters?: Record<string, any>; // Default filters for this collection
}

// Sync Status and Queue Management
export interface SyncStatus {
  isActive: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  conflicts: number;
  errors: string[];
  direction: 'push' | 'pull' | 'bidirectional' | 'none';
}

export interface QueuedOperation {
  id: string;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

// Backend API Collection Implementation
export class BackendAPICollection<T extends { id?: string }> implements ICollection<T> {
  private changeSubject = new Subject<CollectionChangeEvent<T>>();
  private dataSubject = new BehaviorSubject<T[]>([]);
  private isDestroyed = false;
  private syncStatus: SyncStatus;
  private operationQueue: QueuedOperation[] = [];
  private isOnline = true;
  private syncInterval: any;
  private lastSyncTimestamp: string | null = null;

  constructor(
    private apiConfig: BackendAPIConfig,
    private endpointConfig: BackendEndpointConfig,
    public readonly name: string,
    public readonly schema: CollectionSchema
  ) {
    this.syncStatus = {
      isActive: false,
      lastSync: null,
      pendingOperations: 0,
      conflicts: 0,
      errors: [],
      direction: 'bidirectional'
    };

    this.setupNetworkMonitoring();
    this.loadInitialData();
    this.startSyncInterval();
  }

  private setupNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log(`[BackendAPICollection] Network online for ${this.name}`);
        this.isOnline = true;
        this.processOperationQueue();
      });

      window.addEventListener('offline', () => {
        console.log(`[BackendAPICollection] Network offline for ${this.name}`);
        this.isOnline = false;
      });

      this.isOnline = navigator.onLine;
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      const data = await this.find();
      this.dataSubject.next(data);
    } catch (error) {
      console.error(`[BackendAPICollection] Failed to load initial data for ${this.name}:`, error);
    }
  }

  private startSyncInterval(): void {
    const syncIntervalMs = this.apiConfig.syncInterval || 30000; // 30 seconds default
    
    this.syncInterval = setInterval(async () => {
      if (this.isOnline && !this.syncStatus.isActive) {
        await this.performSync();
      }
    }, syncIntervalMs);
  }

  private async performSync(): Promise<void> {
    if (!this.isOnline || this.syncStatus.isActive) {
      return;
    }

    try {
      this.syncStatus.isActive = true;
      console.log(`[BackendAPICollection] Starting sync for ${this.name}`);

      // Process pending operations first (push)
      await this.processOperationQueue();

      // Pull changes from backend
      await this.pullChangesFromBackend();

      this.syncStatus.lastSync = new Date();
      console.log(`[BackendAPICollection] Sync completed for ${this.name}`);
    } catch (error) {
      console.error(`[BackendAPICollection] Sync failed for ${this.name}:`, error);
      this.syncStatus.errors.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.syncStatus.isActive = false;
    }
  }

  private async pullChangesFromBackend(): Promise<void> {
    try {
      const syncEndpoint = this.endpointConfig.methods?.sync || this.endpointConfig.methods?.list;
      if (!syncEndpoint) {
        console.warn(`[BackendAPICollection] No sync endpoint configured for ${this.name}`);
        return;
      }

      const url = this.buildUrl(syncEndpoint);
      const params = new URLSearchParams();
      
      if (this.lastSyncTimestamp && this.endpointConfig.timestampField) {
        params.append('since', this.lastSyncTimestamp);
      }

      const response = await this.makeRequest('GET', `${url}?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.data || data.results || [];
        
        // Update local data with backend changes
        for (const item of items) {
          const mappedItem = this.mapFromBackend(item as any);
          await this.updateLocalData(mappedItem);
        }

        // Update sync timestamp
        if (items.length > 0 && this.endpointConfig.timestampField) {
          const timestamps = items
            .map((item: any) => item[this.endpointConfig.timestampField!])
            .filter(Boolean)
            .sort();
          
          if (timestamps.length > 0) {
            this.lastSyncTimestamp = timestamps[timestamps.length - 1];
          }
        }
      }
    } catch (error) {
      console.error(`[BackendAPICollection] Failed to pull changes for ${this.name}:`, error);
      throw error;
    }
  }

  private async processOperationQueue(): Promise<void> {
    if (this.operationQueue.length === 0) {
      return;
    }

    console.log(`[BackendAPICollection] Processing ${this.operationQueue.length} queued operations for ${this.name}`);
    
    const queue = [...this.operationQueue];
    this.operationQueue = [];

    for (const operation of queue) {
      try {
        await this.executeQueuedOperation(operation);
        console.log(`[BackendAPICollection] Processed queued ${operation.operation} for ${this.name}`);
      } catch (error) {
        console.error(`[BackendAPICollection] Failed to process queued ${operation.operation} for ${this.name}:`, error);
        
        // Retry logic
        operation.retryCount++;
        if (operation.retryCount < operation.maxRetries) {
          this.operationQueue.push(operation);
        } else {
          this.syncStatus.errors.push(`Max retries exceeded for ${operation.operation}: ${operation.id}`);
        }
      }
    }

    this.syncStatus.pendingOperations = this.operationQueue.length;
  }

  private async executeQueuedOperation(operation: QueuedOperation): Promise<void> {
    switch (operation.operation) {
      case 'create':
        await this.createOnBackend(operation.data);
        break;
      case 'update':
        await this.updateOnBackend(operation.data.id, operation.data);
        break;
      case 'delete':
        await this.deleteOnBackend(operation.data.id);
        break;
    }
  }

  private async createOnBackend(doc: any): Promise<any> {
    const endpoint = this.endpointConfig.methods?.create || this.endpointConfig.basePath;
    const url = this.buildUrl(endpoint);
    const mappedDoc = this.mapToBackend(doc);

    const response = await this.makeRequest('POST', url, mappedDoc);
    
    if (!response.ok) {
      throw new Error(`Backend create failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async updateOnBackend(id: string, doc: any): Promise<any> {
    const endpoint = this.endpointConfig.methods?.update || `${this.endpointConfig.basePath}/:id`;
    const url = this.buildUrl(endpoint, { id });
    const mappedDoc = this.mapToBackend(doc);

    const response = await this.makeRequest('PUT', url, mappedDoc);
    
    if (!response.ok) {
      throw new Error(`Backend update failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async deleteOnBackend(id: string): Promise<void> {
    const endpoint = this.endpointConfig.methods?.delete || `${this.endpointConfig.basePath}/:id`;
    const url = this.buildUrl(endpoint, { id });

    const response = await this.makeRequest('DELETE', url);
    
    if (!response.ok) {
      throw new Error(`Backend delete failed: ${response.status} ${response.statusText}`);
    }
  }

  private buildUrl(endpoint: string, params: Record<string, string> = {}): string {
    let url = `${this.apiConfig.apiBaseUrl}${endpoint}`;
    
    // Replace path parameters
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    }

    return url;
  }

  private async makeRequest(method: string, url: string, body?: any): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.apiConfig.customHeaders
    };

    // Add authentication
    if (this.apiConfig.authType === 'bearer' && this.apiConfig.authToken) {
      headers['Authorization'] = `Bearer ${this.apiConfig.authToken}`;
    } else if (this.apiConfig.authType === 'api-key' && this.apiConfig.apiKey) {
      headers['X-API-Key'] = this.apiConfig.apiKey;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.apiConfig.timeout || 30000)
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(body);
    }

    return fetch(url, requestOptions);
  }

  private mapToBackend(doc: any): any {
    if (!this.endpointConfig.mapping) {
      return doc;
    }

    const mapped: any = {};
    for (const [localField, backendField] of Object.entries(this.endpointConfig.mapping)) {
      if (doc[localField] !== undefined) {
        mapped[backendField] = doc[localField];
      }
    }

    // Include unmapped fields
    for (const [key, value] of Object.entries(doc)) {
      if (!this.endpointConfig.mapping[key]) {
        mapped[key] = value;
      }
    }

    return mapped;
  }

  private mapFromBackend(doc: any): any {
    if (!this.endpointConfig.mapping) {
      return doc;
    }

    const mapped: any = {};
    const reverseMapping = Object.fromEntries(
      Object.entries(this.endpointConfig.mapping).map(([local, backend]) => [backend, local])
    );

    for (const [backendField, localField] of Object.entries(reverseMapping)) {
      if (doc[backendField] !== undefined) {
        mapped[localField] = doc[backendField];
      }
    }

    // Include unmapped fields
    for (const [key, value] of Object.entries(doc)) {
      if (!reverseMapping[key]) {
        mapped[key] = value;
      }
    }

    return mapped;
  }

  private async updateLocalData(doc: T): Promise<void> {
    // This would typically update a local cache/database
    // For now, we'll just emit a change event
    this.changeSubject.next({
      type: 'update',
      doc,
      id: (doc as any).id || (doc as any)[this.endpointConfig.idField || 'id']
    });

    // Update data subject
    const currentData = this.dataSubject.value;
    const docId = (doc as any).id || (doc as any)[this.endpointConfig.idField || 'id'];
    const existingIndex = currentData.findIndex(item => 
      (item as any).id === docId || (item as any)[this.endpointConfig.idField || 'id'] === docId
    );

    if (existingIndex >= 0) {
      currentData[existingIndex] = doc;
    } else {
      currentData.push(doc);
    }

    this.dataSubject.next([...currentData]);
  }

  private queueOperation(operation: 'create' | 'update' | 'delete', data: any): void {
    const queuedOp: QueuedOperation = {
      id: data.id || `temp_${Date.now()}`,
      operation,
      collection: this.name,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: this.apiConfig.retryAttempts || 3
    };

    this.operationQueue.push(queuedOp);
    this.syncStatus.pendingOperations = this.operationQueue.length;

    // Try to process immediately if online
    if (this.isOnline) {
      this.processOperationQueue();
    }
  }

  // ICollection Implementation

  async insert(doc: Omit<T, 'id'>): Promise<InsertResult<T>> {
    try {
      const id = this.generateId();
      const docWithId = { ...doc, id } as T;

      if (this.isOnline) {
        // Try to create on backend immediately
        try {
          const backendResult = await this.createOnBackend(docWithId);
          const mappedResult = this.mapFromBackend(backendResult);
          
          // Update local data
          await this.updateLocalData(mappedResult);
          
          return {
            id: mappedResult.id || id,
            doc: mappedResult,
            ok: true
          };
        } catch (error) {
          console.warn(`[BackendAPICollection] Immediate create failed for ${this.name}, queuing:`, error);
          // Fall through to queue operation
        }
      }

      // Queue operation for later sync
      this.queueOperation('create', docWithId);
      
      // Update local data optimistically
      await this.updateLocalData(docWithId);

      return {
        id,
        doc: docWithId,
        ok: true
      };
    } catch (error) {
      throw new CollectionError(
        `Failed to insert document in ${this.name}: ${error instanceof Error ? error.message : String(error)}`,
        this.name
      );
    }
  }

  async insertMany(docs: Omit<T, 'id'>[]): Promise<BulkResult<T>> {
    const results: InsertResult<T>[] = [];
    const errors: Array<{ id: string; error: string; reason: string }> = [];

    for (const doc of docs) {
      try {
        const result = await this.insert(doc);
        results.push(result);
      } catch (error) {
        errors.push({
          id: (doc as any).id || 'unknown',
          error: 'insert_failed',
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { docs: results, errors };
  }

  async findOne(idOrQuery: string | QueryOptions): Promise<T | null> {
    if (typeof idOrQuery === 'string') {
      return this.findById(idOrQuery);
    }

    const results = await this.find({ ...idOrQuery, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async findById(id: string): Promise<T | null> {
    try {
      if (this.isOnline) {
        const endpoint = this.endpointConfig.methods?.get || `${this.endpointConfig.basePath}/:id`;
        const url = this.buildUrl(endpoint, { id });
        
        const response = await this.makeRequest('GET', url);
        
        if (response.ok) {
          const data = await response.json();
          return this.mapFromBackend(data);
        } else if (response.status === 404) {
          return null;
        }
      }

      // Fallback to local data
      const currentData = this.dataSubject.value;
      return currentData.find(item => 
        (item as any).id === id || (item as any)[this.endpointConfig.idField || 'id'] === id
      ) || null;
    } catch (error) {
      console.error(`[BackendAPICollection] FindById failed for ${this.name}:`, error);
      
      // Fallback to local data
      const currentData = this.dataSubject.value;
      return currentData.find(item => 
        (item as any).id === id || (item as any)[this.endpointConfig.idField || 'id'] === id
      ) || null;
    }
  }

  async find(query: QueryOptions = {}): Promise<T[]> {
    try {
      if (this.isOnline) {
        const endpoint = this.endpointConfig.methods?.list || this.endpointConfig.basePath;
        const url = this.buildUrl(endpoint);
        const params = new URLSearchParams();

        // Add query parameters
        if (query.limit) params.append('limit', query.limit.toString());
        if (query.skip) params.append('offset', query.skip.toString());
        
        // Add filters
        if (this.endpointConfig.filters) {
          for (const [key, value] of Object.entries(this.endpointConfig.filters)) {
            params.append(key, String(value));
          }
        }

        const response = await this.makeRequest('GET', `${url}?${params.toString()}`);
        
        if (response.ok) {
          const data = await response.json();
          const items = Array.isArray(data) ? data : data.data || data.results || [];
          return items.map((item: any) => this.mapFromBackend(item));
        }
      }

      // Fallback to local data
      let results = this.dataSubject.value;

      // Apply basic filtering (limited compared to full query capabilities)
      if (query.selector) {
        results = results.filter(item => this.matchesSelector(item, query.selector!));
      }

      // Apply sorting
      if (query.sort) {
        results = this.sortData(results, query.sort);
      }

      // Apply pagination
      if (query.skip) {
        results = results.slice(query.skip);
      }
      if (query.limit) {
        results = results.slice(0, query.limit);
      }

      return results;
    } catch (error) {
      console.error(`[BackendAPICollection] Find failed for ${this.name}:`, error);
      
      // Return local data as fallback
      return this.dataSubject.value;
    }
  }

  async update(id: string, update: Partial<T>): Promise<UpdateResult<T>> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new CollectionError(`Document with id ${id} not found`, this.name);
      }

      const updatedDoc = { ...existing, ...update } as T;

      if (this.isOnline) {
        try {
          const backendResult = await this.updateOnBackend(id, updatedDoc);
          const mappedResult = this.mapFromBackend(backendResult);
          
          // Update local data
          await this.updateLocalData(mappedResult);
          
          return {
            id,
            doc: mappedResult,
            ok: true
          };
        } catch (error) {
          console.warn(`[BackendAPICollection] Immediate update failed for ${this.name}, queuing:`, error);
          // Fall through to queue operation
        }
      }

      // Queue operation for later sync
      this.queueOperation('update', updatedDoc);
      
      // Update local data optimistically
      await this.updateLocalData(updatedDoc);

      return {
        id,
        doc: updatedDoc,
        ok: true
      };
    } catch (error) {
      throw new CollectionError(
        `Failed to update document in ${this.name}: ${error instanceof Error ? error.message : String(error)}`,
        this.name
      );
    }
  }

  async updateMany(query: QueryOptions, update: Partial<T>): Promise<UpdateResult<T>[]> {
    const docs = await this.find(query);
    const results: UpdateResult<T>[] = [];

    for (const doc of docs) {
      if ((doc as any).id) {
        const result = await this.update((doc as any).id, update);
        results.push(result);
      }
    }

    return results;
  }

  async remove(id: string): Promise<DeleteResult> {
    try {
      if (this.isOnline) {
        try {
          await this.deleteOnBackend(id);
          
          // Update local data
          const currentData = this.dataSubject.value;
          const filteredData = currentData.filter(item => 
            (item as any).id !== id && (item as any)[this.endpointConfig.idField || 'id'] !== id
          );
          this.dataSubject.next(filteredData);
          
          this.changeSubject.next({
            type: 'delete',
            doc: {} as T,
            id
          });
          
          return {
            id,
            ok: true,
            deleted: true
          };
        } catch (error) {
          console.warn(`[BackendAPICollection] Immediate delete failed for ${this.name}, queuing:`, error);
          // Fall through to queue operation
        }
      }

      // Queue operation for later sync
      this.queueOperation('delete', { id });
      
      // Update local data optimistically
      const currentData = this.dataSubject.value;
      const filteredData = currentData.filter(item => 
        (item as any).id !== id && (item as any)[this.endpointConfig.idField || 'id'] !== id
      );
      this.dataSubject.next(filteredData);
      
      this.changeSubject.next({
        type: 'delete',
        doc: {} as T,
        id
      });

      return {
        id,
        ok: true,
        deleted: true
      };
    } catch (error) {
      throw new CollectionError(
        `Failed to remove document from ${this.name}: ${error instanceof Error ? error.message : String(error)}`,
        this.name
      );
    }
  }

  async removeMany(query: QueryOptions): Promise<DeleteResult[]> {
    const docs = await this.find(query);
    const results: DeleteResult[] = [];

    for (const doc of docs) {
      if ((doc as any).id) {
        const result = await this.remove((doc as any).id);
        results.push(result);
      }
    }

    return results;
  }

  // Reactive Operations
  subscribe(query?: QueryOptions): Observable<T[]> {
    if (query) {
      return this.dataSubject.pipe(
        map(data => {
          let filtered = data;
          
          if (query.selector) {
            filtered = filtered.filter(item => this.matchesSelector(item, query.selector!));
          }
          
          if (query.sort) {
            filtered = this.sortData(filtered, query.sort);
          }
          
          if (query.skip) {
            filtered = filtered.slice(query.skip);
          }
          
          if (query.limit) {
            filtered = filtered.slice(0, query.limit);
          }
          
          return filtered;
        })
      );
    }
    
    return this.dataSubject.asObservable();
  }

  subscribeToChanges(): Observable<CollectionChangeEvent<T>> {
    return this.changeSubject.asObservable();
  }

  async count(query?: QueryOptions): Promise<number> {
    const data = await this.find(query);
    return data.length;
  }

  async exists(id: string): Promise<boolean> {
    const doc = await this.findById(id);
    return doc !== null;
  }

  async createIndex(index: IndexDefinition): Promise<void> {
    // Backend API collections don't support local indexing
    console.warn(`[BackendAPICollection] Index creation not supported for ${this.name}`);
  }

  async getStats(): Promise<CollectionStats> {
    const count = await this.count();
    
    return {
      name: this.name,
      documentCount: count,
      indexCount: 0,
      storageSize: 0,
      lastModified: new Date()
    };
  }

  async compact(): Promise<void> {
    // No compaction needed for API collections
    console.log(`[BackendAPICollection] Compact operation not applicable for ${this.name}`);
  }

  async destroy(): Promise<void> {
    try {
      console.log(`[BackendAPICollection] Destroying collection ${this.name}...`);
      
      this.isDestroyed = true;
      
      // Clear sync interval
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
      }
      
      // Process remaining queue if online
      if (this.isOnline && this.operationQueue.length > 0) {
        console.log(`[BackendAPICollection] Processing ${this.operationQueue.length} remaining operations`);
        await this.processOperationQueue();
      }
      
      // Complete subjects
      this.changeSubject.complete();
      this.dataSubject.complete();
      
      console.log(`[BackendAPICollection] Collection ${this.name} destroyed successfully`);
    } catch (error) {
      console.error(`[BackendAPICollection] Failed to destroy ${this.name}:`, error);
      throw new CollectionError(
        `Failed to destroy: ${error instanceof Error ? error.message : String(error)}`,
        this.name
      );
    }
  }

  // Helper methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private matchesSelector(doc: T, selector: Record<string, any>): boolean {
    for (const [field, value] of Object.entries(selector)) {
      const docValue = (doc as any)[field];
      
      if (typeof value === 'object' && value !== null) {
        // Handle operators
        for (const [operator, operatorValue] of Object.entries(value)) {
          switch (operator) {
            case '$gt':
              if (!(docValue > (operatorValue as any))) return false;
              break;
            case '$gte':
              if (!(docValue >= (operatorValue as any))) return false;
              break;
            case '$lt':
              if (!(docValue < (operatorValue as any))) return false;
              break;
            case '$lte':
              if (!(docValue <= (operatorValue as any))) return false;
              break;
            case '$ne':
              if (docValue === operatorValue) return false;
              break;
            case '$in':
              if (!Array.isArray(operatorValue) || !operatorValue.includes(docValue)) return false;
              break;
            case '$nin':
              if (Array.isArray(operatorValue) && operatorValue.includes(docValue)) return false;
              break;
          }
        }
      } else {
        if (docValue !== value) return false;
      }
    }
    
    return true;
  }

  private sortData(data: T[], sort: any[]): T[] {
    return data.sort((a, b) => {
      for (const sortItem of sort) {
        let field: string;
        let direction: 'asc' | 'desc' = 'asc';
        
        if (typeof sortItem === 'string') {
          field = sortItem;
        } else if (typeof sortItem === 'object') {
          const [f, d] = Object.entries(sortItem)[0];
          field = f;
          direction = d as 'asc' | 'desc';
        } else {
          continue;
        }
        
        const aVal = (a as any)[field];
        const bVal = (b as any)[field];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      }
      
      return 0;
    });
  }

  // Backend API specific methods
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new CollectionError('Cannot sync while offline', this.name);
    }

    await this.performSync();
  }

  getQueueStatus(): { count: number; operations: Array<{ operation: string; timestamp: Date }> } {
    return {
      count: this.operationQueue.length,
      operations: this.operationQueue.map(op => ({
        operation: op.operation,
        timestamp: op.timestamp
      }))
    };
  }

  clearQueue(): void {
    const count = this.operationQueue.length;
    this.operationQueue = [];
    this.syncStatus.pendingOperations = 0;
    console.log(`[BackendAPICollection] Cleared ${count} queued operations for ${this.name}`);
  }
}

// Backend API Provider Implementation
export class BackendAPIProvider implements IDatabaseProvider {
  public readonly name = 'BackendAPI';
  public readonly version = '1.0.0';
  
  private collections = new Map<string, BackendAPICollection<any>>();
  private config: BackendAPIConfig | null = null;
  private isInitialized = false;

  async initialize(config: DatabaseConfig): Promise<void> {
    try {
      console.log('[BackendAPIProvider] Initializing Backend API Provider...');
      
      this.config = config as BackendAPIConfig;
      
      if (!this.config.apiBaseUrl) {
        throw new Error('apiBaseUrl is required for Backend API Provider');
      }

      // Validate authentication configuration
      if (this.config.authType && this.config.authType !== 'custom') {
        if (this.config.authType === 'bearer' && !this.config.authToken) {
          throw new Error('authToken is required for bearer authentication');
        }
        if (this.config.authType === 'api-key' && !this.config.apiKey) {
          throw new Error('apiKey is required for api-key authentication');
        }
      }

      this.isInitialized = true;
      console.log('[BackendAPIProvider] Provider initialized successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize Backend API provider: ${error instanceof Error ? error.message : String(error)}`,
        'INITIALIZATION_ERROR',
        this.name
      );
    }
  }

  async createCollection<T = any>(name: string, schema: CollectionSchema): Promise<ICollection<T>> {
    if (!this.isInitialized || !this.config) {
      throw new DatabaseError('Provider not initialized', 'NOT_INITIALIZED', this.name);
    }

    try {
      // Get endpoint configuration for this collection
      const endpointConfig = this.config.endpoints?.[name] || {
        basePath: `/${name}`,
        idField: 'id',
        timestampField: 'updated_at'
      };

      const collection = new BackendAPICollection<T & { id?: string }>(
        this.config,
        endpointConfig,
        name,
        schema
      );

      this.collections.set(name, collection);
      console.log(`[BackendAPIProvider] Created collection: ${name}`);
      
      return collection;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create collection ${name}: ${error instanceof Error ? error.message : String(error)}`,
        'COLLECTION_CREATION_ERROR',
        this.name
      );
    }
  }

  getCollection<T = any>(name: string): ICollection<T> | null {
    return this.collections.get(name) || null;
  }

  getAllCollections(): Map<string, ICollection<any>> {
    return new Map(this.collections);
  }

  isAvailable(): boolean {
    // Backend API provider is available if we have fetch API
    return typeof fetch !== 'undefined';
  }

  getStatus(): ProviderStatus {
    const collectionsArray = Array.from(this.collections.values());
    
    return {
      name: this.name,
      version: this.version,
      isConnected: this.isInitialized,
      collectionsCount: this.collections.size,
      performance: {
        avgQueryTime: 0, // TODO: Implement performance tracking
        totalQueries: 0,
        memoryUsage: 0
      }
    };
  }

  async backup(): Promise<string> {
    const backupData: any = {
      provider: this.name,
      version: this.version,
      timestamp: new Date().toISOString(),
      collections: {}
    };

    for (const [name, collection] of this.collections) {
      try {
        const data = await collection.find();
        backupData.collections[name] = {
          schema: collection.schema,
          data
        };
      } catch (error) {
        console.error(`[BackendAPIProvider] Failed to backup collection ${name}:`, error);
      }
    }

    return JSON.stringify(backupData);
  }

  async restore(backupData: string): Promise<void> {
    try {
      const backup = JSON.parse(backupData);
      
      for (const [name, collectionData] of Object.entries(backup.collections as any)) {
        const collection = this.collections.get(name);
        if (collection && (collectionData as any).data) {
          // Insert all documents from backup
          await collection.insertMany((collectionData as any).data);
          console.log(`[BackendAPIProvider] Restored ${(collectionData as any).data.length} documents to ${name}`);
        }
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to restore backup: ${error instanceof Error ? error.message : String(error)}`,
        'RESTORE_ERROR',
        this.name
      );
    }
  }

  async destroy(): Promise<void> {
    try {
      console.log('[BackendAPIProvider] Destroying provider...');
      
      // Destroy all collections
      for (const collection of this.collections.values()) {
        await collection.destroy();
      }
      
      this.collections.clear();
      this.isInitialized = false;
      
      console.log('[BackendAPIProvider] Provider destroyed successfully');
    } catch (error) {
      throw new DatabaseError(
        `Failed to destroy provider: ${error instanceof Error ? error.message : String(error)}`,
        'DESTRUCTION_ERROR',
        this.name
      );
    }
  }

  // Backend API specific methods
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      const response = await fetch(this.config.apiBaseUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(this.config.timeout || 10000)
      });
      
      return response.ok;
    } catch (error) {
      console.error('[BackendAPIProvider] Connection test failed:', error);
      return false;
    }
  }

  getGlobalSyncStatus(): { [collectionName: string]: SyncStatus } {
    const status: { [collectionName: string]: SyncStatus } = {};
    
    for (const [name, collection] of this.collections) {
      status[name] = collection.getSyncStatus();
    }
    
    return status;
  }

  async forceGlobalSync(): Promise<void> {
    console.log('[BackendAPIProvider] Starting global sync...');
    
    const syncPromises = Array.from(this.collections.values()).map(collection => 
      collection.forceSync().catch(error => {
        console.error(`[BackendAPIProvider] Sync failed for collection:`, error);
      })
    );
    
    await Promise.all(syncPromises);
    console.log('[BackendAPIProvider] Global sync completed');
  }
}