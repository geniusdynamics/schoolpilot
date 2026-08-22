import { logger } from '@/utils/logging';

/**
 * ERPNext Backend Provider
 * 
 * Implements IBackendProvider for ERPNext integration.
 * Handles authentication, CRUD operations, sync, and entity mapping.
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
import { ERPNextClient } from './ERPNextClient';
import { entityMappings } from './mappings';

export class ERPNextProvider implements IBackendProvider {
  readonly id = 'erpnext';
  readonly name = 'ERPNext';
  readonly version = '1.0.0';
  readonly type = 'erpnext' as const;
  
  private client: ERPNextClient | null = null;
  private config: BackendConfig | null = null;
  private authToken: AuthToken | null = null;
  
  // ============================================================================
  // Lifecycle
  // ============================================================================
  
  async initialize(config: BackendConfig): Promise<void> {
    this.config = config;
    this.client = new ERPNextClient(config.baseUrl, config.timeout);
    
    // Authenticate
    if (config.auth.apiKey && config.auth.apiSecret) {
      this.authToken = await this.authenticate(config.auth);
    }
  }
  
  async disconnect(): Promise<void> {
    this.client = null;
    this.authToken = null;
    this.config = null;
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
      const response = await this.client.get('/api/method/ping');
      const latency = Date.now() - start;
      
      return {
        connected: response.ok,
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
    
    // ERPNext uses API Key/Secret authentication
    if (credentials.apiKey && credentials.apiSecret) {
      this.client.setAuth(credentials.apiKey, credentials.apiSecret);
      
      this.authToken = {
        accessToken: credentials.apiKey,
        tokenType: 'api_key',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      };
      
      return this.authToken;
    }
    
    throw new Error('Invalid credentials for ERPNext');
  }
  
  async refreshAuth(): Promise<AuthToken> {
    if (!this.authToken) {
      throw new Error('No auth token to refresh');
    }
    
    // ERPNext API keys don't expire, so just return existing token
    return this.authToken;
  }
  
  isAuthenticated(): boolean {
    return this.authToken !== null && this.client !== null;
  }
  
  // ============================================================================
  // CRUD Operations
  // ============================================================================
  
  async create(entity: string, data: Record): Promise<Record> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const docType = this.getDocType(entity);
    const backendData = this.mapToBackend(entity, data);
    
    const response = await this.client.post(`/api/resource/${docType}`, backendData);
    
    if (!response.ok) {
      throw new Error(`Failed to create ${entity}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return this.mapFromBackend(entity, result.data);
  }
  
  async read(entity: string, id: string): Promise<Record | null> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const docType = this.getDocType(entity);
    
    try {
      const response = await this.client.get(`/api/resource/${docType}/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to read ${entity}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return this.mapFromBackend(entity, result.data);
    } catch (error) {
      logger.error(`Error reading ${entity} ${id}:`, error);
      return null;
    }
  }
  
  async update(entity: string, id: string, data: Partial<Record>): Promise<Record> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const docType = this.getDocType(entity);
    const backendData = this.mapToBackend(entity, data as Record);
    
    const response = await this.client.put(`/api/resource/${docType}/${id}`, backendData);
    
    if (!response.ok) {
      throw new Error(`Failed to update ${entity}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return this.mapFromBackend(entity, result.data);
  }
  
  async delete(entity: string, id: string): Promise<boolean> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const docType = this.getDocType(entity);
    
    const response = await this.client.delete(`/api/resource/${docType}/${id}`);
    
    return response.ok;
  }
  
  async query(entity: string, query: Query): Promise<Record[]> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const docType = this.getDocType(entity);
    const filters = this.buildFilters(query);
    
    const response = await this.client.get(`/api/resource/${docType}?${filters}`);
    
    if (!response.ok) {
      throw new Error(`Failed to query ${entity}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data.map((item: any) => this.mapFromBackend(entity, item));
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
    
    for (const record of records) {
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
    
    const docType = this.getDocType(entity);
    const sinceStr = since.toISOString();
    
    // Query for modified documents
    const filters = `filters=[["modified", ">", "${sinceStr}"]]&fields=["*"]`;
    const response = await this.client.get(`/api/resource/${docType}?${filters}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get changes for ${entity}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    const operations: SyncOperation[] = result.data.map((doc: any) => ({
      id: doc.name,
      type: 'update' as const,
      entity,
      recordId: doc.name,
      data: this.mapFromBackend(entity, doc),
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
        return conflict.remote; // Default to remote
    }
  }
  
  // ============================================================================
  // File Operations
  // ============================================================================
  
  async uploadFile(file: FileUpload): Promise<FileRecord> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const formData = new FormData();
    formData.append('file', file.file, file.name);
    
    const response = await this.client.uploadFile('/api/method/upload_file', formData);
    
    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      id: result.message.name,
      name: result.message.file_name,
      url: result.message.file_url,
      size: file.size,
      mimeType: file.type,
      uploadedAt: new Date(),
      metadata: result.message,
    };
  }
  
  async downloadFile(fileId: string): Promise<Blob> {
    if (!this.client) throw new Error('Provider not initialized');
    
    const response = await this.client.get(`/api/method/frappe.utils.file_manager.get_file?name=${fileId}`);
    
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
      entities: this.getSupportedEntities(),
      authMethods: ['apikey'],
      fileUpload: true,
      realtime: false,
      batchOperations: true,
      webhooks: true,
    };
  }
  
  supportsEntity(entity: string): boolean {
    return entity in entityMappings;
  }
  
  getSupportedEntities(): string[] {
    return Object.keys(entityMappings);
  }
  
  // ============================================================================
  // Entity Mapping
  // ============================================================================
  
  mapToBackend(entity: string, localRecord: Record): any {
    const mapping = entityMappings[entity];
    if (!mapping) return localRecord;
    
    const backendRecord: any = {};
    
    for (const [localField, backendField] of Object.entries(mapping.fieldMappings)) {
      if (localRecord[localField] !== undefined) {
        backendRecord[backendField] = localRecord[localField];
      }
    }
    
    return backendRecord;
  }
  
  mapFromBackend(entity: string, backendRecord: any): Record {
    const mapping = entityMappings[entity];
    if (!mapping) return backendRecord as Record;
    
    const localRecord: Record = {};
    
    // Reverse mapping
    for (const [localField, backendField] of Object.entries(mapping.fieldMappings)) {
      if (backendRecord[backendField] !== undefined) {
        localRecord[localField] = backendRecord[backendField];
      }
    }
    
    return localRecord;
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  private getDocType(entity: string): string {
    const mapping = entityMappings[entity];
    return mapping?.backendEntity || entity;
  }
  
  private buildFilters(query: Query): string {
    const params = new URLSearchParams();
    
    if (query.filters) {
      params.append('filters', JSON.stringify(query.filters));
    }
    
    if (query.fields) {
      params.append('fields', JSON.stringify(query.fields));
    }
    
    if (query.limit) {
      params.append('limit_page_length', query.limit.toString());
    }
    
    if (query.offset) {
      params.append('limit_start', query.offset.toString());
    }
    
    if (query.sort) {
      const sortField = Object.keys(query.sort)[0];
      const sortOrder = query.sort[sortField] === 1 ? 'asc' : 'desc';
      params.append('order_by', `${sortField} ${sortOrder}`);
    }
    
    return params.toString();
  }
}
