import { logger } from '@/utils/logging';

/**
 * SaaS Backend Provider
 * 
 * Implements IBackendProvider for SchoolPilot's custom Go SaaS backend.
 * Supports both REST and GraphQL APIs with WebSocket for real-time updates.
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
import { RESTClient } from './RESTClient';
import { GraphQLClient } from './GraphQLClient';
import { WebSocketClient } from './WebSocketClient';

export interface SaaSBackendConfig extends BackendConfig {
  saas?: {
    graphqlUrl?: string;
    tenantId: string;
    apiVersion: string;
    useGraphQL: boolean;
    enableWebSocket: boolean;
    wsUrl?: string;
    enableCache: boolean;
    cacheTimeout: number;
    enableCompression: boolean;
    retryAttempts: number;
  };
}

export class SaaSBackendProvider implements IBackendProvider {
  readonly id = 'saas-backend';
  readonly name = 'SchoolPilot SaaS Backend';
  readonly version = '1.0.0';
  readonly type = 'saas-api' as const;
  
  private restClient: RESTClient | null = null;
  private graphqlClient: GraphQLClient | null = null;
  private wsClient: WebSocketClient | null = null;
  private config: SaaSBackendConfig | null = null;
  private authToken: AuthToken | null = null;
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  // ============================================================================
  // Lifecycle
  // ============================================================================
  
  async initialize(config: BackendConfig): Promise<void> {
    this.config = config as SaaSBackendConfig;
    
    // Initialize REST client
    this.restClient = new RESTClient({
      baseUrl: config.baseUrl,
      timeout: config.timeout || 30000,
      tenantId: this.config.saas!.tenantId,
      apiVersion: this.config.saas!.apiVersion,
      enableCompression: this.config.saas!.enableCompression,
      retryAttempts: this.config.saas!.retryAttempts,
    });
    
    // Initialize GraphQL client if enabled
    if (this.config.saas!.useGraphQL) {
      const graphqlUrl = this.config.saas!.graphqlUrl || `${config.baseUrl}/graphql`;
      this.graphqlClient = new GraphQLClient({
        url: graphqlUrl,
        timeout: config.timeout || 30000,
        tenantId: this.config.saas!.tenantId,
      });
    }
    
    // Initialize WebSocket client if enabled
    if (this.config.saas!.enableWebSocket) {
      const wsUrl = this.config.saas!.wsUrl || config.baseUrl.replace('http', 'ws') + '/ws';
      this.wsClient = new WebSocketClient({
        url: wsUrl,
        tenantId: this.config.saas!.tenantId,
      });
    }
    
    // Authenticate
    this.authToken = await this.authenticate(config.auth);
    
    logger.info('[SaaSBackendProvider] Initialized successfully');
  }
  
  async disconnect(): Promise<void> {
    if (this.wsClient) {
      await this.wsClient.disconnect();
    }
    
    this.restClient = null;
    this.graphqlClient = null;
    this.wsClient = null;
    this.authToken = null;
    this.config = null;
    this.cache.clear();
  }
  
  async healthCheck(): Promise<BackendStatus> {
    if (!this.restClient) {
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
      const response = await this.restClient.get('/health');
      const latency = Date.now() - start;
      
      return {
        connected: response.ok,
        authenticated: this.isAuthenticated(),
        pendingChanges: 0,
        version: this.config?.saas?.apiVersion,
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
    if (!this.restClient) {
      throw new Error('Provider not initialized');
    }
    
    // JWT authentication
    if (credentials.type === 'jwt') {
      const response = await this.restClient.post('/auth/token', {
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: 'client_credentials',
      });
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      const data = await response.json();
      
      this.authToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: 'Bearer',
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
      
      // Set token in clients
      this.restClient.setAuth(this.authToken.accessToken);
      if (this.graphqlClient) {
        this.graphqlClient.setAuth(this.authToken.accessToken);
      }
      if (this.wsClient) {
        this.wsClient.setAuth(this.authToken.accessToken);
      }
      
      return this.authToken;
    }
    
    throw new Error('Unsupported authentication type');
  }
  
  async refreshAuth(): Promise<AuthToken> {
    if (!this.authToken?.refreshToken || !this.restClient) {
      throw new Error('No refresh token available');
    }
    
    const response = await this.restClient.post('/auth/refresh', {
      refresh_token: this.authToken.refreshToken,
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const data = await response.json();
    
    this.authToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.authToken.refreshToken,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
    
    // Update token in clients
    this.restClient.setAuth(this.authToken.accessToken);
    if (this.graphqlClient) {
      this.graphqlClient.setAuth(this.authToken.accessToken);
    }
    if (this.wsClient) {
      this.wsClient.setAuth(this.authToken.accessToken);
    }
    
    return this.authToken;
  }
  
  isAuthenticated(): boolean {
    if (!this.authToken) return false;
    return this.authToken.expiresAt > new Date();
  }
  
  // ============================================================================
  // CRUD Operations
  // ============================================================================
  
  async create(entity: string, data: Record): Promise<Record> {
    if (!this.restClient) throw new Error('Provider not initialized');
    
    // Check if token needs refresh
    await this.checkAndRefreshToken();
    
    const response = await this.restClient.post(`/${entity}`, data);
    
    if (!response.ok) {
      throw new Error(`Failed to create ${entity}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Invalidate cache
    this.invalidateCache(entity);
    
    return result.data;
  }
  
  async read(entity: string, id: string): Promise<Record | null> {
    // Check cache first
    if (this.config?.saas?.enableCache) {
      const cached = this.getFromCache(`${entity}:${id}`);
      if (cached) return cached;
    }
    
    await this.checkAndRefreshToken();
    
    // Use GraphQL if enabled
    if (this.graphqlClient && this.config?.saas?.useGraphQL) {
      try {
        const result = await this.graphqlClient.query(`
          query Get${entity}($id: ID!) {
            ${entity}(id: $id) {
              id
              ... on ${entity} {
                __typename
              }
            }
          }
        `, { id });
        
        const data = result.data[entity];
        
        // Cache result
        if (this.config?.saas?.enableCache) {
          this.setCache(`${entity}:${id}`, data);
        }
        
        return data;
      } catch (error) {
        logger.error(`GraphQL query failed, falling back to REST:`, error);
      }
    }
    
    // Fallback to REST
    if (!this.restClient) throw new Error('Provider not initialized');
    
    const response = await this.restClient.get(`/${entity}/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to read ${entity}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const data = result.data;
    
    // Cache result
    if (this.config?.saas?.enableCache) {
      this.setCache(`${entity}:${id}`, data);
    }
    
    return data;
  }
  
  async update(entity: string, id: string, data: Partial<Record>): Promise<Record> {
    if (!this.restClient) throw new Error('Provider not initialized');
    
    await this.checkAndRefreshToken();
    
    const response = await this.restClient.put(`/${entity}/${id}`, data);
    
    if (!response.ok) {
      throw new Error(`Failed to update ${entity}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Invalidate cache
    this.invalidateCache(entity, id);
    
    return result.data;
  }
  
  async delete(entity: string, id: string): Promise<boolean> {
    if (!this.restClient) throw new Error('Provider not initialized');
    
    await this.checkAndRefreshToken();
    
    const response = await this.restClient.delete(`/${entity}/${id}`);
    
    // Invalidate cache
    this.invalidateCache(entity, id);
    
    return response.ok;
  }
  
  async query(entity: string, query: Query): Promise<Record[]> {
    await this.checkAndRefreshToken();
    
    // Use GraphQL if enabled
    if (this.graphqlClient && this.config?.saas?.useGraphQL) {
      try {
        const gqlQuery = this.buildGraphQLQuery(entity, query);
        const result = await this.graphqlClient.query(gqlQuery.query, gqlQuery.variables);
        return result.data[entity + 's'] || [];
      } catch (error) {
        logger.error(`GraphQL query failed, falling back to REST:`, error);
      }
    }
    
    // Fallback to REST
    if (!this.restClient) throw new Error('Provider not initialized');
    
    const params = this.buildQueryParams(query);
    const response = await this.restClient.get(`/${entity}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to query ${entity}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || [];
  }
  
  // ============================================================================
  // Batch Operations
  // ============================================================================
  
  async batchCreate(entity: string, records: Record[]): Promise<BatchResult> {
    if (!this.restClient) throw new Error('Provider not initialized');
    
    await this.checkAndRefreshToken();
    
    const response = await this.restClient.post(`/${entity}/batch`, {
      operations: records.map(r => ({ action: 'create', data: r })),
    });
    
    if (!response.ok) {
      throw new Error(`Batch create failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Invalidate cache
    this.invalidateCache(entity);
    
    return {
      success: result.success,
      successful: result.successful,
      failed: result.failed,
      results: result.results,
    };
  }
  
  async batchUpdate(
    entity: string,
    updates: Array<{ id: string; data: Partial<Record> }>
  ): Promise<BatchResult> {
    if (!this.restClient) throw new Error('Provider not initialized');
    
    await this.checkAndRefreshToken();
    
    const response = await this.restClient.post(`/${entity}/batch`, {
      operations: updates.map(u => ({ action: 'update', id: u.id, data: u.data })),
    });
    
    if (!response.ok) {
      throw new Error(`Batch update failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Invalidate cache
    this.invalidateCache(entity);
    
    return {
      success: result.success,
      successful: result.successful,
      failed: result.failed,
      results: result.results,
    };
  }
  
  async batchDelete(entity: string, ids: string[]): Promise<BatchResult> {
    if (!this.restClient) throw new Error('Provider not initialized');
    
    await this.checkAndRefreshToken();
    
    const response = await this.restClient.post(`/${entity}/batch`, {
      operations: ids.map(id => ({ action: 'delete', id })),
    });
    
    if (!response.ok) {
      throw new Error(`Batch delete failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Invalidate cache
    this.invalidateCache(entity);
    
    return {
      success: result.success,
      successful: result.successful,
      failed: result.failed,
      results: result.results,
    };
  }
  
  // ============================================================================
  // Sync Operations
  // ============================================================================
  
  async getChanges(entity: string, since: Date): Promise<ChangeSet> {
    if (!this.restClient) throw new Error('Provider not initialized');
    
    await this.checkAndRefreshToken();
    
    const response = await this.restClient.get(
      `/${entity}/changes?since=${since.toISOString()}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get changes: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      since,
      operations: result.changes || [],
    };
  }
  
  async pushChanges(entity: string, operations: SyncOperation[]): Promise<SyncResult> {
    if (!this.restClient) throw new Error('Provider not initialized');
    
    await this.checkAndRefreshToken();
    
    const response = await this.restClient.post(`/${entity}/sync`, {
      operations,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to push changes: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: result.success,
      uploaded: result.uploaded,
      downloaded: result.downloaded,
      conflicts: result.conflicts || [],
      errors: result.errors || [],
      timestamp: new Date(),
    };
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
    if (!this.restClient) throw new Error('Provider not initialized');
    
    await this.checkAndRefreshToken();
    
    const formData = new FormData();
    formData.append('file', file.file, file.name);
    
    if (file.metadata) {
      formData.append('metadata', JSON.stringify(file.metadata));
    }
    
    const response = await this.restClient.uploadFile('/files', formData);
    
    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      id: result.data.id,
      name: result.data.name,
      url: result.data.url,
      size: result.data.size,
      mimeType: result.data.mime_type,
      uploadedAt: new Date(result.data.uploaded_at),
      metadata: result.data.metadata,
    };
  }
  
  async downloadFile(fileId: string): Promise<Blob> {
    if (!this.restClient) throw new Error('Provider not initialized');
    
    await this.checkAndRefreshToken();
    
    const response = await this.restClient.get(`/files/${fileId}/download`);
    
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
      entities: [
        'students', 'employees', 'courses', 'programs', 'classes',
        'subjects', 'fees', 'payments', 'attendance', 'grades',
        'assignments', 'exams', 'timetables', 'announcements', 'events',
      ],
      authMethods: ['jwt', 'oauth2'],
      fileUpload: true,
      realtime: this.config?.saas?.enableWebSocket ?? false,
      batchOperations: true,
      webhooks: true,
    };
  }
  
  supportsEntity(entity: string): boolean {
    return this.getCapabilities().entities.includes(entity);
  }
  
  getSupportedEntities(): string[] {
    return this.getCapabilities().entities;
  }
  
  // ============================================================================
  // Entity Mapping
  // ============================================================================
  
  mapToBackend(entity: string, localRecord: Record): any {
    // SaaS backend uses same format as local
    return localRecord;
  }
  
  mapFromBackend(entity: string, backendRecord: any): Record {
    // SaaS backend uses same format as local
    return backendRecord;
  }
  
  // ============================================================================
  // Helper Methods
  // ============================================================================
  
  private async checkAndRefreshToken(): Promise<void> {
    if (!this.authToken) return;
    
    // Refresh if token expires in less than 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    if (this.authToken.expiresAt.getTime() - Date.now() < fiveMinutes) {
      await this.refreshAuth();
    }
  }
  
  private buildQueryParams(query: Query): string {
    const params = new URLSearchParams();
    
    if (query.filters) {
      params.append('filters', JSON.stringify(query.filters));
    }
    
    if (query.fields) {
      params.append('fields', query.fields.join(','));
    }
    
    if (query.limit) {
      params.append('limit', query.limit.toString());
    }
    
    if (query.offset) {
      params.append('offset', query.offset.toString());
    }
    
    if (query.sort) {
      const sortField = Object.keys(query.sort)[0];
      const sortOrder = query.sort[sortField] === 1 ? 'asc' : 'desc';
      params.append('sort', `${sortField}:${sortOrder}`);
    }
    
    return params.toString();
  }
  
  private buildGraphQLQuery(entity: string, query: Query): { query: string; variables: any } {
    const fields = query.fields?.join('\n') || 'id';
    const variables: any = {};
    
    let filterString = '';
    if (query.filters) {
      filterString = 'filters: $filters';
      variables.filters = query.filters;
    }
    
    let limitString = '';
    if (query.limit) {
      limitString = 'limit: $limit';
      variables.limit = query.limit;
    }
    
    const gqlQuery = `
      query Query${entity}($filters: JSON, $limit: Int) {
        ${entity}s(${filterString} ${limitString}) {
          ${fields}
        }
      }
    `;
    
    return { query: gqlQuery, variables };
  }
  
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const timeout = (this.config?.saas?.cacheTimeout || 300) * 1000;
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
  
  // ============================================================================
  // WebSocket / Real-time
  // ============================================================================
  
  /**
   * Subscribe to real-time updates for an entity
   */
  subscribeToEntity(entity: string, callback: (data: any) => void): () => void {
    if (!this.wsClient) {
      logger.warn('[SaaSBackendProvider] WebSocket not enabled');
      return () => {};
    }
    
    return this.wsClient.subscribe(`${entity}:*`, callback);
  }
  
  /**
   * Subscribe to real-time updates for a specific record
   */
  subscribeToRecord(entity: string, id: string, callback: (data: any) => void): () => void {
    if (!this.wsClient) {
      logger.warn('[SaaSBackendProvider] WebSocket not enabled');
      return () => {};
    }
    
    return this.wsClient.subscribe(`${entity}:${id}`, callback);
  }
}
