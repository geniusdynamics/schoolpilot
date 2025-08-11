// Enhanced Backend API service with intelligent request handling and offline queue
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  allowOffline?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  retryCount?: number;
  requiresAuth?: boolean;
}

export interface APIResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  timestamp: Date;
  source: 'backend' | 'cache' | 'queue';
}

export interface RequestQueueItem {
  id: string;
  endpoint: string;
  options: RequestOptions;
  resolve: (value: APIResponse<any>) => void;
  reject: (error: Error) => void;
  timestamp: Date;
  retryCount: number;
  priority: RequestOptions['priority'];
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class BackendAPIService {
  private baseURL: string;
  private authToken: string | null = null;
  private requestQueue: RequestQueueItem[] = [];
  private isProcessingQueue = false;
  private networkManager: import('./NetworkStateManager').NetworkStateManager;
  private requestCache = new Map<string, { data: any; timestamp: Date; ttl: number }>();
  private readonly DEFAULT_TIMEOUT = 10000;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(baseURL: string = '/api/v1') {
    this.baseURL = baseURL;
    this.networkManager = this.initializeNetworkManager();
    this.setupNetworkListener();
  }

  private async initializeNetworkManager(): Promise<NetworkStateManager> {
    const m = await import('./NetworkStateManager');
    return m.NetworkStateManager.getInstance();
  }

  private async setupNetworkListener(): Promise<void> {
    const networkManager = await this.networkManager;
    networkManager.subscribe((state) => {
      if (state.isOnline && state.backendAvailable && !this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const networkManager = await this.networkManager;
    const networkState = networkManager.getState();

    // Check cache first for GET requests
    if (options.method === 'GET' || !options.method) {
      const cached = this.getCachedResponse<T>(endpoint);
      if (cached && (!networkState.backendAvailable || options.allowOffline)) {
        return cached;
      }
    }

    // If offline or backend unavailable, handle based on options
    if (!networkState.isOnline || !networkState.backendAvailable) {
      if (options.allowOffline === false) {
        throw new APIError('Backend required but not available', 503);
      }
      
      // For write operations, queue the request
      if (options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)) {
        return this.queueRequest<T>(endpoint, options);
      }
      
      // For read operations, try cache
      const cached = this.getCachedResponse<T>(endpoint);
      if (cached) {
        return cached;
      }
      
      throw new APIError('No cached data available and backend is offline', 503);
    }

    return this.executeRequest<T>(endpoint, options);
  }

  private async executeRequest<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const config: RequestInit = {
      method: options.method || 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && options.requiresAuth !== false && { 
          Authorization: `Bearer ${this.authToken}` 
        }),
        ...options.headers
      },
      ...(options.body && { body: JSON.stringify(options.body) })
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      if (!response.ok) {
        throw new APIError(
          (data as any)?.message || `Request failed with status ${response.status}`,
          response.status,
          data
        );
      }

      const apiResponse: APIResponse<T> = {
        data,
        status: response.status,
        headers: response.headers,
        timestamp: new Date(),
        source: 'backend'
      };

      // Cache successful GET requests
      if ((!options.method || options.method === 'GET') && response.ok) {
        this.setCachedResponse(endpoint, apiResponse);
      }

      return apiResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      
      throw new APIError('Network request failed', 0, error);
    }
  }

  private async queueRequest<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<APIResponse<T>> {
    return new Promise((resolve, reject) => {
      const queueItem: RequestQueueItem = {
        id: this.generateRequestId(),
        endpoint,
        options,
        resolve,
        reject,
        timestamp: new Date(),
        retryCount: 0,
        priority: options.priority || 'normal'
      };

      // Insert based on priority
      const insertIndex = this.findInsertIndex(queueItem.priority);
      this.requestQueue.splice(insertIndex, 0, queueItem);

      // Try to process queue immediately
      this.processQueue();
    });
  }

  private findInsertIndex(priority: RequestOptions['priority']): number {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const targetPriority = priorityOrder[priority || 'normal'];

    for (let i = 0; i < this.requestQueue.length; i++) {
      const itemPriority = priorityOrder[this.requestQueue[i].priority || 'normal'];
      if (itemPriority > targetPriority) {
        return i;
      }
    }
    
    return this.requestQueue.length;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    const networkManager = await this.networkManager;
    const networkState = networkManager.getState();
    
    if (!networkState.isOnline || !networkState.backendAvailable) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const networkState = networkManager.getState();
      
      if (!networkState.isOnline || !networkState.backendAvailable) {
        break; // Stop processing if network becomes unavailable
      }

      const item = this.requestQueue.shift()!;
      
      try {
        const result = await this.executeRequest(item.endpoint, item.options);
        item.resolve(result);
      } catch (error) {
        if (item.retryCount < this.MAX_RETRY_COUNT) {
          item.retryCount++;
          // Re-queue with exponential backoff
          setTimeout(() => {
            this.requestQueue.unshift(item);
          }, Math.pow(2, item.retryCount) * 1000);
        } else {
          this.logError('Request execution failed', error instanceof Error ? error : new Error(String(error)));
          item.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private getCachedResponse<T>(endpoint: string): APIResponse<T> | null {
    const cacheKey = this.getCacheKey(endpoint);
    const cached = this.requestCache.get(cacheKey);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp.getTime() > cached.ttl) {
      this.requestCache.delete(cacheKey);
      return null;
    }
    
    return {
      data: cached.data,
      status: 200,
      headers: new Headers(),
      timestamp: cached.timestamp,
      source: 'cache'
    };
  }

  private setCachedResponse<T>(endpoint: string, response: APIResponse<T>): void {
    const cacheKey = this.getCacheKey(endpoint);
    this.requestCache.set(cacheKey, {
      data: response.data,
      timestamp: response.timestamp,
      ttl: this.CACHE_TTL
    });
  }

  private getCacheKey(endpoint: string): string {
    return `${this.baseURL}${endpoint}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getQueueStatus(): {
    pending: number;
    processing: boolean;
    byPriority: Record<string, number>;
  } {
    const byPriority = this.requestQueue.reduce((acc, item) => {
      const priority = item.priority || 'normal';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      pending: this.requestQueue.length,
      processing: this.isProcessingQueue,
      byPriority
    };
  }

  public clearQueue(): void {
    this.requestQueue.forEach(item => {
      item.reject(new APIError('Queue cleared', 499));
    });
    this.requestQueue = [];
  }

  public clearCache(): void {
    this.requestCache.clear();
  }

  private logError(message: string, error: Error): void {
    console.error(`[BackendAPIService] ${message}:`, error);
  }

  // CRUD Operations for BackendServiceAdapter compatibility
  async create<T = any>(entity: string, data: any): Promise<T> {
    const response = await this.request<T>(`/${entity}`, {
      method: 'POST',
      body: data,
      requiresAuth: true
    });
    return response.data;
  }

  async read<T = any>(entity: string, id: string | number): Promise<T> {
    const response = await this.request<T>(`/${entity}/${id}`, {
      method: 'GET',
      requiresAuth: true
    });
    return response.data;
  }

  async update<T = any>(entity: string, id: string | number, data: any): Promise<T> {
    const response = await this.request<T>(`/${entity}/${id}`, {
      method: 'PUT',
      body: data,
      requiresAuth: true
    });
    return response.data;
  }

  async delete<T = any>(entity: string, id: string | number): Promise<T> {
    const response = await this.request<T>(`/${entity}/${id}`, {
      method: 'DELETE',
      requiresAuth: true
    });
    return response.data;
  }

  async list<T = any>(entity: string, options?: any): Promise<T[]> {
    const queryParams = options ? new URLSearchParams(options).toString() : '';
    const endpoint = queryParams ? `/${entity}?${queryParams}` : `/${entity}`;
    
    const response = await this.request<T[]>(endpoint, {
      method: 'GET',
      requiresAuth: true
    });
    return response.data;
  }

  async search<T = any>(entity: string, query: string, options?: any): Promise<T[]> {
    const searchParams = new URLSearchParams({
      q: query,
      ...options
    }).toString();
    
    const response = await this.request<T[]>(`/${entity}/search?${searchParams}`, {
      method: 'GET',
      requiresAuth: true
    });
    return response.data;
  }
}