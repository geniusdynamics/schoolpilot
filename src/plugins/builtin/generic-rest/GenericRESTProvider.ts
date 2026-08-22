import { logger } from '@/utils/logging';

/**
 * Generic REST Provider
 * 
 * Highly configurable REST API provider that can connect to any REST API
 * with custom endpoints, authentication, and field mappings.
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

export interface EntityEndpointConfig {
  basePath: string;
  idField?: string;
  methods?: {
    list?: string;
    get?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
}

export interface GenericRESTConfig extends BackendConfig {
  generic?: {
    apiKeyHeader?: string;
    customHeaders?: Record<string, string>;
    entityEndpoints: Record<string, EntityEndpointConfig>;
    fieldMappings?: Record<string, Record<string, string>>;
    responseDataPath?: string;
    paginationStyle?: 'offset' | 'page' | 'cursor' | 'none';
    paginationParams?: {
      limit?: string;
      offset?: string;
      page?: string;
      perPage?: string;
    };
    filterStyle?: 'query' | 'body' | 'custom';
    retryAttempts?: number;
    enableCache?: boolean;
    cacheTimeout?: number;
  };
}

export class GenericRESTProvider implements IBackendProvider {
  readonly id = 'generic-rest';
  readonly name = 'Generic REST API';
  readonly version = '1.0.0';
  readonly type = 'generic-json-api' as const;
  
  private config: GenericRESTConfig | null = null;
  private authToken: AuthToken | null = null;
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  // ============================================================================
  // Lifecycle
  // ============================================================================
  
  async initialize(config: BackendConfig): Promise<void> {
    this.config = config as GenericRESTConfig;
    
    // Authenticate if needed
    if (config.auth.type !== 'none') {
      this.authToken = await this.authenticate(config.auth);
    }
    
    logger.info('[GenericRESTProvider] Initialized successfully');
  }
  
  async disconnect(): Promise<void> {
    this.config = null;
    this.authToken = null;
    this.cache.clear();
  }
  
  async healthCheck(): Promise<BackendStatus> {
    if (!this.config) {
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
      const response = await this.makeRequest('GET', '/health');
      const latency = Date.now() - start;
      
      return {
        connected: response.ok,
        authenticated: this.isAuthenticated(),
        pendingChanges: 0,
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
    // For most REST APIs, authentication is handled via headers
    // This is a placeholder that creates a token object
    this.authToken = {
      accessToken: credentials.apiKey || credentials.token || '',
      tokenType: credentials.type === 'bearer' ? 'Bearer' : 'API-Key',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };
    
    return this.authToken;
  }
  
  async refreshAuth(): Promise<AuthToken> {
    if (!this.authToken) {
      throw new Error('No auth token to refresh');
    }
    return this.authToken;
  }
  
  isAuthenticated(): boolean {
    return this.authToken !== null;
  }
  
  // ============================================================================
  // CRUD Operations
  // ============================================================================
  
  async create(entity: string, data: Record): Promise<Record> {
    const endpoint = this.getEndpoint(entity, 'create');
    const mappedData = this.mapToBackend(entity, data);
    
    const response = await this.makeRequest('POST', endpoint, mappedData);
    
    if (!response.ok) {
      throw new Error(`Failed to create ${entity}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const resultData = this.extractData(result);
    
    this.invalidateCache(entity);
    
    return this.mapFromBackend(entity, resultData);
  }
  
  async read(entity: string, id: string): Promise<Record | null> {
    // Check cache
    if (this.config?.generic?.enableCache) {
      const cached = this.getFromCache(`${entity}:${id}`);
      if (cached) return cached;
    }
    
    const endpoint = this.getEndpoint(entity, 'get', { id });
    
    try {
      const response = await this.makeRequest('GET', endpoint);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to read ${entity}: ${response.statusText}`);
      }
      
      const result = await response.json();
      const data = this.extractData(result);
      const mappedData = this.mapFromBackend(entity, data);
      
      // Cache result
      if (this.config?.generic?.enableCache) {
        this.setCache(`${entity}:${id}`, mappedData);
      }
      
      return mappedData;
    } catch (error) {
      logger.error(`Error reading ${entity} ${id}:`, error);
      return null;
    }
  }
  
  async update(entity: string, id: string, data: Partial<Record>): Promise<Record> {
    const endpoint = this.getEndpoint(entity, 'update', { id });
    const mappedData = this.mapToBackend(entity, data as Record);
    
    const response = await this.makeRequest('PUT', endpoint, mappedData);
    
    if (!response.ok) {
      throw new Error(`Failed to update ${entity}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const resultData = this.extractData(result);
    
    this.invalidateCache(entity, id);
    
    return this.mapFromBackend(entity, resultData);
  }
  
  async delete(entity: string, id: string): Promise<boolean> {
    const endpoint = this.getEndpoint(entity, 'delete', { id });
    
    const response = await this.makeRequest('DELETE', endpoint);
    
    this.invalidateCache(entity, id);
    
    return response.ok;
  }
  
  async query(entity: string, query: Query): Promise<Record[]> {
    const endpoint = this.getEndpoint(entity, 'list');
    const params = this.buildQueryParams(query);
    
    const url = params ? `${endpoint}?${params}` : endpoint;
    
    const response = await this.makeRequest('GET', url);
    
    if (!response.ok) {
      throw new Error(`Failed to query ${entity}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const data = this.extractData(result);
    const items = Array.isArray(data) ? data : [data];
    
    return items.map(item => this.mapFromBackend(entity, item));
  }
  
  // ============================================================================
  // Batch Operations (Not supported by default)
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
  // Sync Operations (Not supported by default)
  // ============================================================================
  
  async getChanges(entity: string, since: Date): Promise<ChangeSet> {
    // Generic REST APIs typically don't support change tracking
    return {
      since,
      operations: [],
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
      default:
        return conflict.remote;
    }
  }
  
  // ============================================================================
  // File Operations (Basic implementation)
  // ============================================================================
  
  async uploadFile(file: FileUpload): Promise<FileRecord> {
    const formData = new FormData();
    formData.append('file', file.file, file.name);
    
    const response = await this.makeRequest('POST', '/files', formData);
    
    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    const data = this.extractData(result);
    
    return {
      id: data.id,
      name: data.name || file.name,
      url: data.url,
      size: data.size || file.size,
      mimeType: data.mime_type || file.type,
      uploadedAt: new Date(data.uploaded_at || Date.now()),
      metadata: data.metadata,
    };
  }
  
  async downloadFile(fileId: string): Promise<Blob> {
    const response = await this.makeRequest('GET', `/files/${fileId}`);
    
    if (!response.ok) {
      throw new Error(`File download failed: ${response.statusText}`);
    }
    
    return await response.blob();
  }
  
  // ============================================================================
  // Capabilities
  // ============================================================================
  
  getCapabilities(): BackendCapabilities {
    const entities = Object.keys(this.config?.generic?.entityEndpoints || {});
    
    return {
      entities,
      authMethods: ['apikey', 'bearer', 'basic', 'oauth2', 'custom'],
      fileUpload: true,
      realtime: false,
      batchOperations: false,
      webhooks: false,
    };
  }
  
  supportsEntity(entity: string): boolean {
    return entity in (this.config?.generic?.entityEndpoints || {});
  }
  
  getSupportedEntities(): string[] {
    return Object.keys(this.config?.generic?.entityEndpoints || {});
  }
  
  // ============================================================================
  // Entity Mapping
  // ============================================================================
  
  mapToBackend(entity: string, localRecord: Record): any {
    const mappings = this.config?.generic?.fieldMappings?.[entity];
    if (!mappings) return localRecord;
    
    const backendRecord: any = {};
    
    for (const [localField, backendField] of Object.entries(mappings)) {
      if (localRecord[localField] !== undefined) {
        backendRecord[backendField] = localRecord[localField];
      }
    }
    
    // Include unmapped fields
    for (const [key, value] of Object.entries(localRecord)) {
      if (!mappings[key]) {
        backendRecord[key] = value;
      }
    }
    
    return backendRecord;
  }
  
  mapFromBackend(entity: string, backendRecord: any): Record {
    const mappings = this.config?.generic?.fieldMappings?.[entity];
    if (!mappings) return backendRecord as Record;
    
    const localRecord: Record = {};
    
    // Reverse mapping
    const reverseMapping = Object.fromEntries(
      Object.entries(mappings).map(([local, backend]) => [backend, local])
    );
    
    for (const [backendField, localField] of Object.entries(reverseMapping)) {
      if (backendRecord[backendField] !== undefined) {
        localRecord[localField] = backendRecord[backendField];
      }
    }
    
    // Include unmapped fields
    for (const [key, value] of Object.entries(backendRecord)) {
      if (!reverseMapping[key]) {
        localRecord[key] = value;
      }
    }
    
    return localRecord;
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  private getEndpoint(entity: string, method: string, params: Record<string, string> = {}): string {
    const entityConfig = this.config?.generic?.entityEndpoints[entity];
    if (!entityConfig) {
      throw new Error(`No endpoint configuration for entity: ${entity}`);
    }
    
    let endpoint = entityConfig.methods?.[method as keyof typeof entityConfig.methods];
    
    if (!endpoint) {
      // Fallback to default endpoints
      switch (method) {
        case 'list':
        case 'create':
          endpoint = entityConfig.basePath;
          break;
        case 'get':
        case 'update':
        case 'delete':
          endpoint = `${entityConfig.basePath}/:id`;
          break;
        default:
          throw new Error(`No endpoint defined for ${entity}.${method}`);
      }
    }
    
    // Extract method from endpoint (e.g., "GET /students" -> "/students")
    endpoint = endpoint.split(' ').pop() || endpoint;
    
    // Replace path parameters
    for (const [key, value] of Object.entries(params)) {
      endpoint = endpoint.replace(`:${key}`, encodeURIComponent(value));
    }
    
    return endpoint;
  }
  
  private buildQueryParams(query: Query): string {
    const params = new URLSearchParams();
    const paginationParams = this.config?.generic?.paginationParams || {};
    const paginationStyle = this.config?.generic?.paginationStyle || 'offset';
    
    // Pagination
    if (paginationStyle === 'offset') {
      if (query.limit) {
        params.append(paginationParams.limit || 'limit', query.limit.toString());
      }
      if (query.offset) {
        params.append(paginationParams.offset || 'offset', query.offset.toString());
      }
    } else if (paginationStyle === 'page') {
      if (query.limit) {
        params.append(paginationParams.perPage || 'per_page', query.limit.toString());
      }
      if (query.offset && query.limit) {
        const page = Math.floor(query.offset / query.limit) + 1;
        params.append(paginationParams.page || 'page', page.toString());
      }
    }
    
    // Filters
    if (query.filters) {
      for (const [field, value] of Object.entries(query.filters)) {
        params.append(field, String(value));
      }
    }
    
    // Sorting
    if (query.sort) {
      const sortField = Object.keys(query.sort)[0];
      const sortOrder = query.sort[sortField] === 1 ? 'asc' : 'desc';
      params.append('sort', `${sortField}:${sortOrder}`);
    }
    
    return params.toString();
  }
  
  private extractData(response: any): any {
    const dataPath = this.config?.generic?.responseDataPath;
    
    if (!dataPath) return response;
    
    const parts = dataPath.split('.');
    let data = response;
    
    for (const part of parts) {
      if (data && typeof data === 'object' && part in data) {
        data = data[part];
      } else {
        return response;
      }
    }
    
    return data;
  }
  
  private async makeRequest(
    method: string,
    endpoint: string,
    body?: any,
    attempt = 0
  ): Promise<Response> {
    if (!this.config) throw new Error('Provider not initialized');
    
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = this.getHeaders();
    
    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    };
    
    if (body) {
      if (body instanceof FormData) {
        options.body = body;
        delete headers['Content-Type']; // Let browser set it
      } else {
        options.body = JSON.stringify(body);
      }
    }
    
    try {
      const response = await fetch(url, options);
      
      // Retry on 5xx errors
      const retryAttempts = this.config.generic?.retryAttempts || 3;
      if (response.status >= 500 && attempt < retryAttempts) {
        await this.delay(Math.pow(2, attempt) * 1000);
        return this.makeRequest(method, endpoint, body, attempt + 1);
      }
      
      return response;
    } catch (error) {
      const retryAttempts = this.config.generic?.retryAttempts || 3;
      if (attempt < retryAttempts) {
        await this.delay(Math.pow(2, attempt) * 1000);
        return this.makeRequest(method, endpoint, body, attempt + 1);
      }
      throw error;
    }
  }
  
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add authentication headers
    if (this.config?.auth.type === 'apikey' && this.config.auth.apiKey) {
      const headerName = this.config.generic?.apiKeyHeader || 'X-API-Key';
      headers[headerName] = this.config.auth.apiKey;
    } else if (this.config?.auth.type === 'bearer' && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken.accessToken}`;
    } else if (this.config?.auth.type === 'basic' && this.config.auth.username && this.config.auth.password) {
      const credentials = btoa(`${this.config.auth.username}:${this.config.auth.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }
    
    // Add custom headers
    if (this.config?.generic?.customHeaders) {
      Object.assign(headers, this.config.generic.customHeaders);
    }
    
    return headers;
  }
  
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const timeout = (this.config?.generic?.cacheTimeout || 300) * 1000;
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
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${entity}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
