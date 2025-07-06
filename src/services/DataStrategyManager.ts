// Data strategy management and intelligent operation routing
import { NetworkStateManager, NetworkState } from './NetworkStateManager';
import { BackendAPIService, RequestOptions, APIResponse } from './BackendAPIService';
import { generateId } from './rxdbService';

export interface DataStrategy {
  mode: 'offline-first' | 'online-first' | 'hybrid' | 'demo';
  fallbackMode: 'offline' | 'cache' | 'error';
  syncPolicy: 'immediate' | 'batched' | 'manual';
  conflictResolution: 'server-wins' | 'client-wins' | 'merge' | 'prompt';
  batchSize?: number;
  syncInterval?: number;
}

export interface DataOperation {
  type: 'read' | 'write' | 'delete';
  entity: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  requiresBackend: boolean;
  allowOffline: boolean;
  cacheStrategy?: 'cache-first' | 'network-first' | 'cache-only' | 'network-only';
}

export interface ExecutionPlan {
  primary: 'backend' | 'rxdb' | 'mock';
  fallback: 'backend' | 'rxdb' | 'mock' | null;
  syncRequired: boolean;
  deferredBackend?: boolean;
  cacheStrategy?: DataOperation['cacheStrategy'];
}

export interface SyncQueueItem {
  id: string;
  operation: DataOperation;
  params: any;
  result?: any;
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  priority: DataOperation['priority'];
}

export class DataStrategyManager {
  private strategy: DataStrategy;
  private networkManager: NetworkStateManager;
  private backendAPI: BackendAPIService;
  private rxdbService: any;
  private mockDataService: any;
  private syncQueue: SyncQueueItem[] = [];
  private isProcessingSync = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(
    strategy: DataStrategy,
    rxdbService: any,
    mockDataService: any
  ) {
    this.strategy = strategy;
    this.networkManager = NetworkStateManager.getInstance();
    this.backendAPI = new BackendAPIService();
    this.rxdbService = rxdbService;
    this.mockDataService = mockDataService;
    
    this.setupSyncProcessor();
    this.setupNetworkListener();
  }

  private setupSyncProcessor(): void {
    if (this.strategy.syncPolicy === 'immediate') {
      // Process sync queue immediately when items are added
      return;
    }
    
    if (this.strategy.syncPolicy === 'batched' && this.strategy.syncInterval) {
      this.syncInterval = setInterval(() => {
        this.processSyncQueue();
      }, this.strategy.syncInterval);
    }
  }

  private setupNetworkListener(): void {
    this.networkManager.subscribe((state) => {
      if (state.isOnline && state.backendAvailable && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    });
  }

  public async executeOperation<T>(
    operation: DataOperation,
    params: any
  ): Promise<T> {
    const networkState = this.networkManager.getState();
    const executionPlan = this.planExecution(operation, networkState);

    try {
      switch (executionPlan.primary) {
        case 'backend':
          return await this.executeBackendOperation<T>(operation, params, executionPlan);
        
        case 'rxdb':
          return await this.executeRxDBOperation<T>(operation, params, executionPlan);
        
        case 'mock':
          return await this.executeMockOperation<T>(operation, params);
        
        default:
          throw new Error(`Unsupported execution plan: ${executionPlan.primary}`);
      }
    } catch (error) {
      // Try fallback if available
      if (executionPlan.fallback) {
        console.warn(`Primary execution failed, trying fallback: ${executionPlan.fallback}`, error);
        
        const fallbackPlan: ExecutionPlan = {
          ...executionPlan,
          primary: executionPlan.fallback,
          fallback: null,
          syncRequired: true
        };
        
        return this.executeOperation<T>(operation, params);
      }
      
      throw error;
    }
  }

  private planExecution(
    operation: DataOperation,
    networkState: NetworkState
  ): ExecutionPlan {
    // Demo mode - always use mock
    if (this.strategy.mode === 'demo') {
      return { 
        primary: 'mock', 
        fallback: null, 
        syncRequired: false 
      };
    }

    // Critical operations that require backend
    if (operation.requiresBackend && !networkState.backendAvailable) {
      if (operation.allowOffline) {
        return { 
          primary: 'rxdb', 
          fallback: null, 
          syncRequired: true,
          deferredBackend: true 
        };
      } else {
        throw new Error(`Operation ${operation.entity}:${operation.type} requires backend but it's not available`);
      }
    }

    // Strategy-based routing
    switch (this.strategy.mode) {
      case 'offline-first':
        return this.planOfflineFirstExecution(operation, networkState);

      case 'online-first':
        return this.planOnlineFirstExecution(operation, networkState);

      case 'hybrid':
        return this.planHybridExecution(operation, networkState);

      default:
        throw new Error(`Unsupported strategy mode: ${this.strategy.mode}`);
    }
  }

  private planOfflineFirstExecution(
    operation: DataOperation,
    networkState: NetworkState
  ): ExecutionPlan {
    return {
      primary: 'rxdb',
      fallback: networkState.backendAvailable ? 'backend' : null,
      syncRequired: networkState.backendAvailable && operation.type !== 'read',
      cacheStrategy: operation.cacheStrategy || 'cache-first'
    };
  }

  private planOnlineFirstExecution(
    operation: DataOperation,
    networkState: NetworkState
  ): ExecutionPlan {
    if (networkState.backendAvailable) {
      return {
        primary: 'backend',
        fallback: operation.allowOffline ? 'rxdb' : null,
        syncRequired: false,
        cacheStrategy: operation.cacheStrategy || 'network-first'
      };
    } else {
      return {
        primary: 'rxdb',
        fallback: null,
        syncRequired: true,
        cacheStrategy: operation.cacheStrategy || 'cache-only'
      };
    }
  }

  private planHybridExecution(
    operation: DataOperation,
    networkState: NetworkState
  ): ExecutionPlan {
    // Read operations: prefer cache/local data for speed
    if (operation.type === 'read') {
      return {
        primary: 'rxdb',
        fallback: networkState.backendAvailable ? 'backend' : null,
        syncRequired: false,
        cacheStrategy: 'cache-first'
      };
    }

    // Write operations: prefer backend for consistency
    if (networkState.backendAvailable && networkState.connectionQuality !== 'poor') {
      return {
        primary: 'backend',
        fallback: 'rxdb',
        syncRequired: false,
        cacheStrategy: 'network-first'
      };
    } else {
      return {
        primary: 'rxdb',
        fallback: null,
        syncRequired: true,
        deferredBackend: true,
        cacheStrategy: 'cache-first'
      };
    }
  }

  private async executeBackendOperation<T>(
    operation: DataOperation,
    params: any,
    plan: ExecutionPlan
  ): Promise<T> {
    const endpoint = this.buildEndpoint(operation, params);
    const requestOptions: RequestOptions = {
      method: this.mapOperationToHTTPMethod(operation),
      body: operation.type !== 'read' ? params : undefined,
      allowOffline: operation.allowOffline,
      priority: operation.priority,
      requiresAuth: true
    };

    const response = await this.backendAPI.request<T>(endpoint, requestOptions);

    // Update local cache if successful
    if (plan.syncRequired && response.source === 'backend') {
      await this.updateLocalCache(operation, params, response.data);
    }

    return response.data;
  }

  private async executeRxDBOperation<T>(
    operation: DataOperation,
    params: any,
    plan: ExecutionPlan
  ): Promise<T> {
    const db = await this.rxdbService.getDatabase();
    const collection = db[operation.entity];

    if (!collection) {
      throw new Error(`Collection ${operation.entity} not found in RxDB`);
    }

    let result: T;

    switch (operation.type) {
      case 'read':
        result = await this.executeRxDBRead<T>(collection, params);
        break;
      
      case 'write':
        result = await this.executeRxDBWrite<T>(collection, params);
        break;
      
      case 'delete':
        result = await this.executeRxDBDelete<T>(collection, params);
        break;
      
      default:
        throw new Error(`Unsupported operation type: ${operation.type}`);
    }

    // Queue for backend sync if required
    if (plan.syncRequired || plan.deferredBackend) {
      await this.queueForSync(operation, params, result);
    }

    return result;
  }

  private async executeMockOperation<T>(
    operation: DataOperation,
    params: any
  ): Promise<T> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // This would integrate with the existing mock data service
    // For now, return a placeholder
    return params as T;
  }

  private async executeRxDBRead<T>(collection: any, params: any): Promise<T> {
    if (params.id) {
      const doc = await collection.findOne(params.id).exec();
      return doc ? doc.toJSON() : null;
    }
    
    if (params.query) {
      const docs = await collection.find(params.query).exec();
      return docs.map((doc: any) => doc.toJSON());
    }
    
    const docs = await collection.find().exec();
    return docs.map((doc: any) => doc.toJSON());
  }

  private async executeRxDBWrite<T>(collection: any, params: any): Promise<T> {
    if (params.id) {
      // Update existing document
      const doc = await collection.findOne(params.id).exec();
      if (doc) {
        await doc.patch(params);
        return doc.toJSON();
      }
    }
    
    // Create new document
    const doc = await collection.insert(params);
    return doc.toJSON();
  }

  private async executeRxDBDelete<T>(collection: any, params: any): Promise<T> {
    const doc = await collection.findOne(params.id).exec();
    if (doc) {
      const result = doc.toJSON();
      await doc.remove();
      return result;
    }
    return null;
  }

  private async updateLocalCache(
    operation: DataOperation,
    params: any,
    result: any
  ): Promise<void> {
    try {
      const db = await this.rxdbService.getDatabase();
      const collection = db[operation.entity];
      
      if (!collection) return;

      if (operation.type === 'write') {
        await collection.upsert(result);
      } else if (operation.type === 'delete') {
        const doc = await collection.findOne(params.id).exec();
        if (doc) {
          await doc.remove();
        }
      }
    } catch (error) {
      console.warn('Failed to update local cache:', error);
    }
  }

  private async queueForSync(
    operation: DataOperation,
    params: any,
    result: any
  ): Promise<void> {
    const syncItem: SyncQueueItem = {
      id: generateId(),
      operation,
      params,
      result,
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
      priority: operation.priority
    };

    // Insert based on priority
    const insertIndex = this.findSyncInsertIndex(syncItem.priority);
    this.syncQueue.splice(insertIndex, 0, syncItem);

    // Store in persistent sync queue if RxDB is available
    try {
      const db = await this.rxdbService.getDatabase();
      if (db.sync_queue) {
        await db.sync_queue.insert(syncItem);
      }
    } catch (error) {
      console.warn('Failed to persist sync queue item:', error);
    }

    // Process immediately if strategy allows
    if (this.strategy.syncPolicy === 'immediate') {
      this.processSyncQueue();
    }
  }

  private findSyncInsertIndex(priority: DataOperation['priority']): number {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const targetPriority = priorityOrder[priority];

    for (let i = 0; i < this.syncQueue.length; i++) {
      const itemPriority = priorityOrder[this.syncQueue[i].priority];
      if (itemPriority > targetPriority) {
        return i;
      }
    }
    
    return this.syncQueue.length;
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isProcessingSync || this.syncQueue.length === 0) {
      return;
    }

    const networkState = this.networkManager.getState();
    if (!networkState.isOnline || !networkState.backendAvailable) {
      return;
    }

    this.isProcessingSync = true;

    const batchSize = this.strategy.batchSize || 10;
    const batch = this.syncQueue.splice(0, batchSize);

    for (const item of batch) {
      try {
        item.status = 'processing';
        await this.syncSingleItem(item);
        item.status = 'completed';
        
        // Remove from persistent queue
        await this.removeSyncItem(item.id);
      } catch (error) {
        item.status = 'error';
        item.error = error.message;
        item.retryCount++;
        
        if (item.retryCount < 3) {
          // Re-queue for retry
          this.syncQueue.push(item);
        } else {
          console.error('Sync item failed after max retries:', item, error);
          await this.removeSyncItem(item.id);
        }
      }
    }

    this.isProcessingSync = false;

    // Continue processing if there are more items
    if (this.syncQueue.length > 0) {
      setTimeout(() => this.processSyncQueue(), 1000);
    }
  }

  private async syncSingleItem(item: SyncQueueItem): Promise<void> {
    const endpoint = this.buildEndpoint(item.operation, item.params);
    const requestOptions: RequestOptions = {
      method: this.mapOperationToHTTPMethod(item.operation),
      body: item.operation.type !== 'read' ? item.params : undefined,
      priority: item.priority,
      requiresAuth: true
    };

    await this.backendAPI.request(endpoint, requestOptions);
  }

  private async removeSyncItem(id: string): Promise<void> {
    try {
      const db = await this.rxdbService.getDatabase();
      if (db.sync_queue) {
        const doc = await db.sync_queue.findOne(id).exec();
        if (doc) {
          await doc.remove();
        }
      }
    } catch (error) {
      console.warn('Failed to remove sync item from persistent queue:', error);
    }
  }

  private buildEndpoint(operation: DataOperation, params: any): string {
    const entity = operation.entity;
    
    switch (operation.type) {
      case 'read':
        return params.id ? `/${entity}/${params.id}` : `/${entity}`;
      case 'write':
        return params.id ? `/${entity}/${params.id}` : `/${entity}`;
      case 'delete':
        return `/${entity}/${params.id}`;
      default:
        throw new Error(`Cannot build endpoint for operation type: ${operation.type}`);
    }
  }

  private mapOperationToHTTPMethod(operation: DataOperation): RequestOptions['method'] {
    switch (operation.type) {
      case 'read':
        return 'GET';
      case 'write':
        return operation.params?.id ? 'PUT' : 'POST';
      case 'delete':
        return 'DELETE';
      default:
        throw new Error(`Cannot map operation type to HTTP method: ${operation.type}`);
    }
  }

  public getSyncStatus(): {
    pending: number;
    processing: boolean;
    byPriority: Record<string, number>;
    errors: number;
  } {
    const byPriority = this.syncQueue.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errors = this.syncQueue.filter(item => item.status === 'error').length;

    return {
      pending: this.syncQueue.length,
      processing: this.isProcessingSync,
      byPriority,
      errors
    };
  }

  public updateStrategy(newStrategy: Partial<DataStrategy>): void {
    this.strategy = { ...this.strategy, ...newStrategy };
    
    // Restart sync processor if needed
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.setupSyncProcessor();
  }

  public async forceSyncAll(): Promise<void> {
    await this.processSyncQueue();
  }

  public clearSyncQueue(): void {
    this.syncQueue = [];
  }

  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.clearSyncQueue();
  }
}