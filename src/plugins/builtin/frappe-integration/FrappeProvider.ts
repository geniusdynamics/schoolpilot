import { logger } from '@/utils/logging';

/**
 * Frappe Backend Provider
 * 
 * Implements IBackendProvider using the official Frappe React SDK.
 * Provides optimized React hooks and real-time updates via Socket.IO.
 */

import type { IBackendProvider, BatchResult, ConflictResolution } from '@/services/backend/IBackendProvider';
import type {
  BackendConfig,
  BackendStatus,
  BackendCapabilities,
  AuthCredentials,
  AuthToken,
  ChangeSet,
  SyncOperation,
  SyncResult,
  Conflict,
  FileUpload,
  FileRecord,
} from '@/services/backend/types';
import type { Record, Query } from '@/services/data/types';
import { FrappeSDKClient } from './FrappeSDKClient';

export interface FrappeConfig extends BackendConfig {
  frappe?: {
    enableSocketIO?: boolean;
    socketPort?: number;
    enableCache?: boolean;
    cacheTimeout?: number;
    batchSize?: number;
  };
}

export class FrappeProvider implements IBackendProvider {
  readonly id = 'frappe';
  readonly name = 'Frappe Framework';
  readonly version = '1.0.0';
  readonly type = 'frappe' as const;
  
  private client: FrappeSDKClient | null = null;
  private config: FrappeConfig | null = null;
  private authToken: AuthToken | null = null;
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  // ============================================================================
  // Lifecycle
  // ============================================================================
  
  async initialize(config: BackendConfig): Promise<void> {
    this.config = config as FrappeConfig;
    
    // Initialize Frappe SDK client
    this.client = new FrappeSDKClient({
      url: config.baseUrl,
      tokenParams: {
        type: config.auth.type === 'token' ? 'token' : 'Bearer',
        useToken: true,
      },
      enableSocketIO: this.config.frappe?.enableSocketIO ?? true,
      socketPort: this.config.frappe?.socketPort || 9000,
    });
    
    // Authenticate
    if (config.auth.apiKey && config.auth.apiSecret) {
      this.authToken = await this.authenticate(config.auth);
    }
    
    logger.info('[FrappeProvider] Initialized successfully');
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
    }
    
    this.client = null;
    this.authToken = null;
    this.config = null;
    this.cache.clear();
  }
  
  async healthCheck(): Promise<BackendStatus> {
    if (!this.client) {
      return {
        connected: false,
        authenticated: false,
        pendingChanges: 0,
        error: {
          code: 'NOT_INITIALIZED',
          message: 'Provider not initialized',
        },
      };
    }
    
    try {
      const start = Date.now();
      const response = await this.client.call('ping');
      const latency = Date.now() - start;
      
      return {
        connected: true,
        authenticated: this.isAuthenticated(),
        pendingChanges: 0,
        version: this.config?.version,
        latency,
      };
    } catch (error) {
      return {
        connected: false,
        authenticated: false,
        pendingChanges: 0,
        error: {
          code: 'CONNECTION_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
  
  // ============================================================================
  // Authentication
  // ============================================================================
  
  async authenticate(credentials: AuthCredentials): Promise<AuthToken> {
    if (!this.client) {
      throw new Error('Provider not initialized');
    }
    
    // Frappe uses API Key/Secret (token) authentication
    if (credentials.apiKey && credentials.apiSecret) {
      this.client.setAuth(credentials.apiKey, credentials.apiSecret);
      
      this.authToken = {
        accessToken: credentials.apiKey,
        tokenType: 'token',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      };
      
      return this.authToken;
    }
    
    throw new Error('Invalid credentials for Frappe');
  }
  
  async refreshAuth(): Promise<AuthToken> {
    if (!this.authToken) {
      throw new Error('No auth token to refresh');
    }
    
    // Frappe API keys don't expire, so just return existing token
    return this.authToken;
  }
  
  isAuthenticated(): boolean {
    return this.authToken !== null && this.client !== null;
  }
  
  // ============================================================================
  // CRUD Operations (using Frappe SDK)
  // ============================================================================
  
  async create(entity: string, data: Record): Promise<Record> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const doc = await this.client.db.createDoc(entity, data);
    
    // Invalidate cache
    this.invalidateCache(entity);
    
    return doc as Record;
  }
  
  async read(entity: string, id: string): Promise<Record | null> {
    if (!this.client) throw new Error('Provider not initialized');
    
    // Check cache first
    if (this.config?.frappe?.enableCache) {
      const cached = this.getFromCache(`${entity}:${id}`);
      if (cached) return cached;
    }
    
    try {
      const doc = await this.client.db.getDoc(entity, id);
      
      // Cache the result
      if (this.config?.frappe?.enableCache) {
        this.setCache(`${entity}:${id}`, doc);
      }
      
      return doc as Record;
    } catch (error) {
      logger.error(`Error reading ${entity} ${id}:`, error);
      return null;
    }
  }
  
  async update(entity: string, id: string, data: Partial<Record>): Promise<Record> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const doc = await this.client.db.updateDoc(entity, id, data);
    
    // Invalidate cache
    this.invalidateCache(entity, id);
    
    return doc as Record;
  }
  
  async delete(entity: string, id: string): Promise<boolean> {
    if (!this.client) throw new Error('Provider not initialized');
    
    await this.client.db.deleteDoc(entity, id);
    
    // Invalidate cache
    this.invalidateCache(entity, id);
    
    return true;
  }
  
  async query(entity: string, query: Query): Promise<Record[]> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const filters = this.buildFilters(query);
    const fields = query.fields || ['*'];
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    const orderBy = this.buildOrderBy(query);
    
    const docs = await this.client.db.getDocList(entity, {
      fields,
      filters,
      limit,
      offset,
      orderBy,
    });
    
    return docs as Record[];
  }
  
  // ============================================================================
  // Batch Operations
  // ============================================================================
  
  async batchCreate(entity: string, records: Record[]): Promise<BatchResult> {
    const results: BatchResult = {
      success: true,
      successful: 0,
      failed: 0,
      results: [],
    };
    
    const batchSize = this.config?.frappe?.batchSize || 100;
    
    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          const created = await this.create(entity, record);
          results.successful++;
          results.results.push({
            id: created.id as string,
            success: true,
            data: created,
          });
        } catch (error) {
          results.failed++;
          results.success = false;
          results.results.push({
            id: record.id as string || 'unknown',
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    
    return results;
  }
  
  async batchUpdate(
    entity: string,
    updates: Array<{ id: string; data: Partial<Record> }>
  ): Promise<BatchResult> {
    const results: BatchResult = {
      success: true,
      successful: 0,
      failed: 0,
      results: [],
    };
    
    for (const { id, data } of updates) {
      try {
        const updated = await this.update(entity, id, data);
        results.successful++;
        results.results.push({
          id,
          success: true,
          data: updated,
        });
      } catch (error) {
        results.failed++;
        results.success = false;
        results.results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    return results;
  }
  
  async batchDelete(entity: string, ids: string[]): Promise<BatchResult> {
    const results: BatchResult = {
      success: true,
      successful: 0,
      failed: 0,
      results: [],
    };
    
    for (const id of ids) {
      try {
        const deleted = await this.delete(entity, id);
        if (deleted) {
          results.successful++;
          results.results.push({ id, success: true });
        } else {
          results.failed++;
          results.success = false;
          results.results.push({ id, success: false, error: 'Delete failed' });
        }
      } catch (error) {
        results.failed++;
        results.success = false;
        results.results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    return results;
  }
  
  // ============================================================================
  // Sync Operations
  // ============================================================================
  
  async getChanges(entity: string, since: Date): Promise<ChangeSet> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const sinceStr = since.toISOString();
    
    // Query for modified documents
    const docs = await this.client.db.getDocList(entity, {
      fields: ['*'],
      filters: [['modified', '>', sinceStr]],
      limit: 1000,
    });
    
    const operations: SyncOperation[] = docs.map((doc: any) => ({
      id: doc.name,
      type: 'update' as const,
      entity,
      recordId: doc.name,
      data: doc as Record,
      timestamp: new Date(doc.modified),
      userId: doc.modified_by || 'system',
      retryCount: 0,
    }));
    
    return {
      since,
      operations,
    };
  }
  
  async pushChanges(entity: string, operations: SyncOperation[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      uploaded: 0,
      downloaded: 0,
      conflicts: [],
      errors: [],
      timestamp: new Date(),
    };
    
    for (const operation of operations) {
      try {
        switch (operation.type) {
          case 'create':
            await this.create(entity, operation.data!);
            result.uploaded++;
            break;
          case 'update':
            await this.update(entity, operation.recordId, operation.data!);
            result.uploaded++;
            break;
          case 'delete':
            await this.delete(entity, operation.recordId);
            result.uploaded++;
            break;
        }
      } catch (error) {
        result.success = false;
        result.errors.push({
          operation,
          error: {
            code: 'SYNC_ERROR',
            message: error instanceof Error ? error.message : String(error),
          },
          retryable: true,
        });
      }
    }
    
    return result;
  }
  
  async resolveConflict(conflict: Conflict, resolution: ConflictResolution): Promise<Record> {
    switch (resolution.strategy) {
      case 'local':
        return conflict.local;
      case 'remote':
        return conflict.remote;
      case 'merge':
        return resolution.mergedData || conflict.local;
      case 'manual':
        throw new Error('Manual conflict resolution not implemented');
      default:
        return conflict.remote;
    }
  }
  
  // ============================================================================
  // File Operations
  // ============================================================================
  
  async uploadFile(file: FileUpload): Promise<FileRecord> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const result = await this.client.file.uploadFile(
      file.file,
      {
        isPrivate: false,
        folder: 'Home',
        file_name: file.name,
      }
    );
    
    return {
      id: result.name,
      name: result.file_name,
      url: result.file_url,
      size: file.size,
      mimeType: file.type,
      uploadedAt: new Date(),
      metadata: result,
    };
  }
  
  async downloadFile(fileId: string): Promise<Blob> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const response = await fetch(`${this.config!.baseUrl}${fileId}`);
    
    if (!response.ok) {
      throw new Error(`File download failed: ${response.statusText}`);
    }
    
    return await response.blob();
  }
  
  // ============================================================================
  // Capabilities
  // ============================================================================
  
  getCapabilities(): BackendCapabilities {
    return {
      entities: ['*'], // Frappe supports all DocTypes
      authMethods: ['apikey', 'oauth2', 'jwt'],
      fileUpload: true,
      realtime: this.config?.frappe?.enableSocketIO ?? true,
      batchOperations: true,
      webhooks: true,
    };
  }
  
  supportsEntity(entity: string): boolean {
    // Frappe supports all DocTypes dynamically
    return true;
  }
  
  getSupportedEntities(): string[] {
    // Return all available DocTypes (would need to query Frappe)
    return ['*'];
  }
  
  // ============================================================================
  // Entity Mapping
  // ============================================================================
  
  mapToBackend(entity: string, localRecord: Record): any {
    // Frappe uses 'name' as ID field
    const { id, ...rest } = localRecord;
    return {
      name: id,
      ...rest,
    };
  }
  
  mapFromBackend(entity: string, backendRecord: any): Record {
    // Map 'name' to 'id'
    const { name, ...rest } = backendRecord;
    return {
      id: name,
      ...rest,
    };
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  private buildFilters(query: Query): any[] {
    if (!query.filters) return [];
    
    const filters: any[] = [];
    
    for (const [field, value] of Object.entries(query.filters)) {
      if (typeof value === 'object' && value !== null) {
        // Handle operators
        for (const [operator, operatorValue] of Object.entries(value)) {
          const frappeOp = this.mapOperator(operator);
          filters.push([field, frappeOp, operatorValue]);
        }
      } else {
        filters.push([field, '=', value]);
      }
    }
    
    return filters;
  }
  
  private mapOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      '$gt': '>',
      '$gte': '>=',
      '$lt': '<',
      '$lte': '<=',
      '$ne': '!=',
      '$in': 'in',
      '$nin': 'not in',
      '$like': 'like',
    };
    
    return operatorMap[operator] || '=';
  }
  
  private buildOrderBy(query: Query): any {
    if (!query.sort) return undefined;
    
    const sortField = Object.keys(query.sort)[0];
    const sortOrder = query.sort[sortField] === 1 ? 'asc' : 'desc';
    
    return {
      field: sortField,
      order: sortOrder,
    };
  }
  
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    const timeout = (this.config?.frappe?.cacheTimeout || 300) * 1000;
    
    if (Date.now() - cached.timestamp > timeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
  
  private invalidateCache(entity: string, id?: string): void {
    if (id) {
      this.cache.delete(`${entity}:${id}`);
    } else {
      // Clear all cache entries for this entity
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${entity}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }
  
  // ============================================================================
  // Frappe SDK Client Access (for advanced use cases)
  // ============================================================================
  
  /**
   * Get the underlying Frappe SDK client for advanced operations
   * @returns Frappe SDK client instance
   */
  getSDKClient(): FrappeSDKClient | null {
    return this.client;
  }
}
