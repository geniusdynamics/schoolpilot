/**
 * Backend API Client
 * 
 * Generic HTTP client for connecting SchoolPilot3 to external backend services.
 * Supports authentication, retries, caching, and request/response interceptors.
 */

import type {
  ApiRequest,
  ApiResponse,
  ApiError,
  BackendConfig,
  BackendStatus,
  BackendCapabilities,
  AuthToken,
  SyncResult,
  ChangeSet,
  FileUpload,
  FileRecord,
} from './types';
import type { Query, Record } from '../data/types';

export class BackendClient {
  private config: BackendConfig;
  private authToken: AuthToken | null = null;
  private refreshPromise: Promise<AuthToken> | null = null;
  private requestQueue: ApiRequest[] = [];
  private isRefreshing = false;
  
  // Event handlers
  public onStatusChange?: (status: BackendStatus) => void;
  public onSyncComplete?: (result: SyncResult) => void;
  public onError?: (error: ApiError) => void;

  constructor(config: BackendConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  async authenticate(): Promise<boolean> {
    try {
      switch (this.config.auth.type) {
        case 'apikey':
          // API key auth - no separate auth call needed
          this.authToken = {
            accessToken: this.config.auth.apiKey || '',
            tokenType: 'ApiKey',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          };
          return true;

        case 'basic':
          // Basic auth - encoded in headers
          const credentials = btoa(`${this.config.auth.username}:${this.config.auth.password}`);
          this.authToken = {
            accessToken: credentials,
            tokenType: 'Basic',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          };
          return true;

        case 'jwt':
          return await this.authenticateJWT();

        case 'oauth2':
          return await this.authenticateOAuth2();

        case 'none':
          return true;

        default:
          throw new Error(`Unsupported auth type: ${this.config.auth.type}`);
      }
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  private async authenticateJWT(): Promise<boolean> {
    const response = await this.rawRequest({
      method: 'POST',
      endpoint: '/auth/login',
      body: {
        username: this.config.auth.username,
        password: this.config.auth.password,
      },
    });

    if (response.success && response.data?.token) {
      this.authToken = {
        accessToken: response.data.token,
        refreshToken: response.data.refreshToken,
        tokenType: 'Bearer',
        expiresAt: new Date(response.data.expiresAt || Date.now() + 3600000),
      };
      return true;
    }

    return false;
  }

  private async authenticateOAuth2(): Promise<boolean> {
    const response = await this.rawRequest({
      method: 'POST',
      endpoint: '/oauth/token',
      body: {
        grant_type: 'client_credentials',
        client_id: this.config.auth.clientId,
        client_secret: this.config.auth.clientSecret,
      },
    });

    if (response.success && response.data?.access_token) {
      this.authToken = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        tokenType: response.data.token_type || 'Bearer',
        expiresAt: new Date(Date.now() + (response.data.expires_in || 3600) * 1000),
      };
      return true;
    }

    return false;
  }

  async refreshToken(): Promise<AuthToken> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshToken();
    
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<AuthToken> {
    if (!this.authToken?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.rawRequest({
      method: 'POST',
      endpoint: '/auth/refresh',
      body: {
        refreshToken: this.authToken.refreshToken,
      },
    });

    if (response.success && response.data?.token) {
      this.authToken = {
        accessToken: response.data.token,
        refreshToken: response.data.refreshToken || this.authToken.refreshToken,
        tokenType: 'Bearer',
        expiresAt: new Date(response.data.expiresAt || Date.now() + 3600000),
      };
      return this.authToken;
    }

    throw new Error('Token refresh failed');
  }

  isAuthenticated(): boolean {
    if (!this.authToken) return false;
    return this.authToken.expiresAt > new Date();
  }

  logout(): void {
    this.authToken = null;
    this.requestQueue = [];
  }

  // ============================================================================
  // Core HTTP Methods
  // ============================================================================

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request({ method: 'GET', endpoint, params });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request({ method: 'POST', endpoint, body });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request({ method: 'PUT', endpoint, body });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request({ method: 'PATCH', endpoint, body });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request({ method: 'DELETE', endpoint });
  }

  // ============================================================================
  // Request Handling
  // ============================================================================

  private async request<T>(apiRequest: ApiRequest): Promise<ApiResponse<T>> {
    // Check auth
    if (this.config.auth.type !== 'none' && !this.isAuthenticated()) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        return {
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Authentication failed',
          },
        };
      }
    }

    // Check if token needs refresh
    if (this.authToken && this.authToken.expiresAt < new Date(Date.now() + 60000)) {
      await this.refreshToken();
    }

    return this.executeRequest<T>(apiRequest);
  }

  private async executeRequest<T>(apiRequest: ApiRequest, attempt = 1): Promise<ApiResponse<T>> {
    try {
      const response = await this.rawRequest<T>(apiRequest);
      
      // Handle token expiration
      if (!response.success && response.error?.code === 'TOKEN_EXPIRED' && attempt < 2) {
        await this.refreshToken();
        return this.executeRequest<T>(apiRequest, attempt + 1);
      }

      return response;
    } catch (error) {
      const apiError = this.normalizeError(error);
      
      // Retry on network errors
      if (attempt < 3 && this.isRetryableError(apiError)) {
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        return this.executeRequest<T>(apiRequest, attempt + 1);
      }

      this.onError?.(apiError);
      
      return {
        success: false,
        error: apiError,
      };
    }
  }

  private async rawRequest<T>(apiRequest: ApiRequest): Promise<ApiResponse<T>> {
    const url = new URL(apiRequest.endpoint, this.config.baseUrl);
    
    if (apiRequest.params) {
      Object.entries(apiRequest.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.config.headers,
      ...apiRequest.headers,
    };

    // Add auth header
    if (this.authToken) {
      if (this.authToken.tokenType === 'ApiKey') {
        headers['X-API-Key'] = this.authToken.accessToken;
      } else if (this.authToken.tokenType === 'Basic') {
        headers['Authorization'] = `Basic ${this.authToken.accessToken}`;
      } else {
        headers['Authorization'] = `${this.authToken.tokenType} ${this.authToken.accessToken}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: apiRequest.method,
        headers,
        body: apiRequest.body ? JSON.stringify(apiRequest.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      let data: T | undefined;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (response.status !== 204) {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text) as T;
          } catch {
            data = text as unknown as T;
          }
        }
      }

      if (!response.ok) {
        return {
          success: false,
          data,
          error: {
            code: this.getErrorCode(response.status),
            message: (data as any)?.message || response.statusText,
            statusCode: response.status,
            details: data,
          },
        };
      }

      return {
        success: true,
        data,
        meta: this.extractMeta(data),
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // ============================================================================
  // CRUD Operations (for DataProvider interface)
  // ============================================================================

  async fetchCollection(collection: string, query?: Query): Promise<Record[]> {
    const params: Record<string, any> = {};
    
    if (query?.filter) {
      params.filter = JSON.stringify(query.filter);
    }
    if (query?.sort) {
      params.sort = JSON.stringify(query.sort);
    }
    if (query?.limit) {
      params.limit = query.limit;
    }
    if (query?.offset) {
      params.offset = query.offset;
    }

    const response = await this.get<Record[]>(`/api/${collection}`, params);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch collection');
    }

    return response.data || [];
  }

  async fetchRecord(collection: string, id: string): Promise<Record | null> {
    const response = await this.get<Record>(`/api/${collection}/${id}`);
    
    if (!response.success) {
      if (response.error?.statusCode === 404) {
        return null;
      }
      throw new Error(response.error?.message || 'Failed to fetch record');
    }

    return response.data || null;
  }

  async createRecord(collection: string, data: Omit<Record, 'id'>): Promise<Record> {
    const response = await this.post<Record>(`/api/${collection}`, data);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create record');
    }

    return response.data!;
  }

  async updateRecord(collection: string, id: string, data: Partial<Record>): Promise<Record> {
    const response = await this.patch<Record>(`/api/${collection}/${id}`, data);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update record');
    }

    return response.data!;
  }

  async deleteRecord(collection: string, id: string): Promise<void> {
    const response = await this.delete(`/api/${collection}/${id}`);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete record');
    }
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  async getChanges(since: Date): Promise<ChangeSet> {
    const response = await this.get<ChangeSet>('/api/sync/changes', {
      since: since.toISOString(),
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch changes');
    }

    return response.data || { since, operations: [] };
  }

  async pushChanges(operations: any[]): Promise<SyncResult> {
    const response = await this.post<SyncResult>('/api/sync/push', { operations });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to push changes');
    }

    this.onSyncComplete?.(response.data!);
    return response.data!;
  }

  // ============================================================================
  // File Operations
  // ============================================================================

  async uploadFile(upload: FileUpload): Promise<FileRecord> {
    const formData = new FormData();
    formData.append('file', upload.file, upload.name);
    
    if (upload.metadata) {
      formData.append('metadata', JSON.stringify(upload.metadata));
    }

    const headers: Record<string, string> = {};
    
    // Don't set Content-Type for FormData - browser will set it with boundary
    if (this.authToken) {
      if (this.authToken.tokenType === 'ApiKey') {
        headers['X-API-Key'] = this.authToken.accessToken;
      } else {
        headers['Authorization'] = `${this.authToken.tokenType} ${this.authToken.accessToken}`;
      }
    }

    const response = await fetch(`${this.config.baseUrl}/api/files`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await fetch(`${this.config.baseUrl}/api/files/${fileId}/download`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return await response.blob();
  }

  // ============================================================================
  // Health & Status
  // ============================================================================

  async checkHealth(): Promise<BackendStatus> {
    const startTime = Date.now();
    
    try {
      const response = await this.rawRequest({
        method: 'GET',
        endpoint: '/health',
      });

      const latency = Date.now() - startTime;

      return {
        connected: response.success,
        authenticated: this.isAuthenticated(),
        latency,
        version: response.data?.version,
        pendingChanges: 0, // TODO: Get from local queue
        error: response.error,
      };
    } catch (error) {
      return {
        connected: false,
        authenticated: false,
        pendingChanges: 0,
        error: this.normalizeError(error),
      };
    }
  }

  async getCapabilities(): Promise<BackendCapabilities> {
    const response = await this.get<BackendCapabilities>('/api/capabilities');
    
    if (!response.success) {
      return {
        entities: [],
        authMethods: ['apikey'],
        fileUpload: false,
        realtime: false,
        batchOperations: false,
        webhooks: false,
      };
    }

    return response.data!;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.authToken) {
      if (this.authToken.tokenType === 'ApiKey') {
        headers['X-API-Key'] = this.authToken.accessToken;
      } else if (this.authToken.tokenType === 'Basic') {
        headers['Authorization'] = `Basic ${this.authToken.accessToken}`;
      } else {
        headers['Authorization'] = `${this.authToken.tokenType} ${this.authToken.accessToken}`;
      }
    }

    return headers;
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[status] || 'UNKNOWN_ERROR';
  }

  private extractMeta(data: any): any {
    if (!data) return undefined;
    
    // Common pagination patterns
    if (data.meta) return data.meta;
    if (data.pagination) return data.pagination;
    if (data.page !== undefined) {
      return {
        page: data.page,
        pageSize: data.pageSize || data.limit,
        total: data.total,
        hasMore: data.hasMore || (data.page * (data.pageSize || data.limit)) < data.total,
      };
    }
    
    return undefined;
  }

  private normalizeError(error: any): ApiError {
    if (error.name === 'AbortError') {
      return {
        code: 'TIMEOUT',
        message: 'Request timed out',
      };
    }

    if (error.message?.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error,
    };
  }

  private isRetryableError(error: ApiError): boolean {
    return ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED', 'SERVER_ERROR', 'BAD_GATEWAY', 'SERVICE_UNAVAILABLE'].includes(error.code);
  }

  private handleError(error: Error): void {
    this.onError?.({
      code: 'AUTH_ERROR',
      message: error.message,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BackendClient;
