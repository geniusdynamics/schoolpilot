/**
 * OfflineQueue - Persistent queue for offline operations
 *
 * Queues create/update/delete operations when network is unavailable,
 * persists them to IndexedDB for crash recovery, and processes them
 * in priority order when connectivity is restored.
 *
 * Requirements: 9.1-9.12
 */

export interface QueuedOperation {
  id: string;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  idField?: string; // For update/delete operations
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error?: string;
}

export interface OfflineQueueConfig {
  maxSize?: number; // Maximum queue size (default: 10,000)
  persistQueue?: boolean; // Persist to IndexedDB (default: true)
  storageKey?: string; // IndexedDB store name (default: 'offline_queue')
  retryStrategy?: {
    maxAttempts?: number;
    backoff?: 'linear' | 'exponential';
    initialDelay?: number; // ms
    maxDelay?: number; // ms
  };
}

export interface QueueStatus {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  totalSize: number;
  oldestOperation: Date | null;
  newestOperation: Date | null;
}

export type OperationExecutor = (
  op: QueuedOperation,
) => Promise<{ success: boolean; error?: Error }>;

const DEFAULT_CONFIG: Required<OfflineQueueConfig> = {
  maxSize: 10_000,
  persistQueue: true,
  storageKey: 'offline_queue',
  retryStrategy: {
    maxAttempts: 5,
    backoff: 'exponential',
    initialDelay: 1000,
    maxDelay: 60_000,
  },
};

/**
 * OfflineQueue - Manages queued operations with IndexedDB persistence
 */
export class OfflineQueue {
  private static instance: OfflineQueue | null = null;
  private queue: QueuedOperation[] = [];
  private config: Required<OfflineQueueConfig>;
  private processing = false;
  private db: IDBDatabase | null = null;
  private initialized = false;

  constructor(config: OfflineQueueConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      retryStrategy: {
        ...DEFAULT_CONFIG.retryStrategy,
        ...config.retryStrategy,
      },
    };
  }

  /**
   * Get singleton instance (creates and initializes on first call)
   */
  static async getInstance(config?: OfflineQueueConfig): Promise<OfflineQueue> {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue(config);
      await OfflineQueue.instance.initialize();
    }
    return OfflineQueue.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    OfflineQueue.instance = null;
  }

  /**
   * Initialize the queue and restore persisted operations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.persistQueue) {
      this.db = await this.openDatabase();
      await this.restoreFromDatabase();
    }

    this.initialized = true;
  }

  /**
   * Enqueue a new operation
   */
  async enqueue(
    operation: Omit<QueuedOperation, 'id' | 'retryCount' | 'maxRetries' | 'priority' | 'status'>,
  ): Promise<string> {
    // Check max size
    if (this.queue.length >= this.config.maxSize) {
      // Remove oldest failed operations to make room
      this.pruneOldFailed();
    }

    const queuedOp: QueuedOperation = {
      ...operation,
      id: this.generateId(),
      retryCount: 0,
      maxRetries: this.config.retryStrategy.maxAttempts,
      priority: this.calculatePriority(operation),
      status: 'pending',
    };

    this.queue.push(queuedOp);
    this.sortQueue();

    // Persist to IndexedDB
    if (this.config.persistQueue && this.db) {
      await this.saveOperation(queuedOp);
    }

    return queuedOp.id;
  }

  /**
   * Process all pending operations with the provided executor
   */
  async process(executor: OperationExecutor): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    if (this.processing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.processing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    while (this.queue.length > 0) {
      // Sort by priority before each operation
      this.sortQueue();

      const operation = this.queue[0];
      if (operation.status !== 'pending') {
        this.queue.shift();
        continue;
      }

      operation.status = 'processing';

      const result = await executor(operation);
      processed++;

      if (result.success) {
        operation.status = 'completed';
        succeeded++;
        this.queue.shift(); // Remove from queue

        if (this.config.persistQueue && this.db) {
          await this.removeOperation(operation.id);
        }
      } else {
        operation.retryCount++;
        operation.error = result.error?.message;

        if (operation.retryCount >= operation.maxRetries) {
          // Max retries reached - mark as failed
          operation.status = 'failed';
          failed++;
          this.queue.shift();

          if (this.config.persistQueue && this.db) {
            await this.updateOperation(operation);
          }
        } else {
          // Retry with backoff
          operation.status = 'pending';
          const delay = this.calculateBackoff(operation.retryCount);
          await this.sleep(delay);
        }
      }
    }

    this.processing = false;
    return { processed, succeeded, failed };
  }

  /**
   * Get queue status
   */
  getStatus(): QueueStatus {
    const pending = this.queue.filter((o) => o.status === 'pending').length;
    const processing = this.queue.filter((o) => o.status === 'processing').length;
    const failed = this.queue.filter((o) => o.status === 'failed').length;
    const completed = this.queue.filter((o) => o.status === 'completed').length;

    const timestamps = this.queue.map((o) => o.timestamp).filter((t) => t > 0);

    return {
      pending,
      processing,
      failed,
      completed,
      totalSize: this.queue.length,
      oldestOperation: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
      newestOperation: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
    };
  }

  /**
   * Get all pending operations (for debugging/UI)
   */
  getPendingOperations(): QueuedOperation[] {
    return this.queue.filter((o) => o.status === 'pending');
  }

  /**
   * Get all failed operations (for manual retry)
   */
  getFailedOperations(): QueuedOperation[] {
    return this.queue.filter((o) => o.status === 'failed');
  }

  /**
   * Retry a specific failed operation
   */
  async retryOperation(operationId: string, executor: OperationExecutor): Promise<boolean> {
    const operation = this.queue.find((o) => o.id === operationId);
    if (!operation || operation.status !== 'failed') {
      return false;
    }

    operation.status = 'pending';
    operation.retryCount = 0;
    operation.error = undefined;

    const result = await executor(operation);
    if (result.success) {
      this.queue = this.queue.filter((o) => o.id !== operationId);
      if (this.config.persistQueue && this.db) {
        await this.removeOperation(operationId);
      }
      return true;
    }

    operation.status = 'failed';
    operation.error = result.error?.message;
    operation.retryCount++;

    if (this.config.persistQueue && this.db) {
      await this.updateOperation(operation);
    }

    return false;
  }

  /**
   * Clear all pending operations
   */
  async clear(): Promise<void> {
    this.queue = [];

    if (this.config.persistQueue && this.db) {
      await this.clearDatabase();
    }
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  // ==================== Internal Methods ====================

  private calculatePriority(
    operation: Omit<QueuedOperation, 'id' | 'retryCount' | 'maxRetries' | 'priority' | 'status'>,
  ): number {
    // Higher priority for certain operations
    const opPriority: Record<string, number> = {
      delete: 3,
      update: 2,
      create: 1,
    };

    const opScore = opPriority[operation.operation] ?? 0;
    const ageScore = Date.now() - operation.timestamp;

    // Priority = operation type * 1000 - age (newer ops have higher priority)
    return opScore * 10000 - ageScore;
  }

  private calculateBackoff(retryCount: number): number {
    const strategy = this.config.retryStrategy;
    if (strategy.backoff === 'linear') {
      return Math.min(strategy.initialDelay * retryCount, strategy.maxDelay);
    }
    // Exponential backoff
    return Math.min(strategy.initialDelay * Math.pow(2, retryCount), strategy.maxDelay);
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  private pruneOldFailed(): void {
    // Remove oldest failed operations first
    const failedOps = this.queue.filter((o) => o.status === 'failed');
    if (failedOps.length > 0) {
      failedOps.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = failedOps[0];
      this.queue = this.queue.filter((o) => o.id !== toRemove.id);

      if (this.config.persistQueue && this.db) {
        this.removeOperation(toRemove.id);
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== IndexedDB Persistence ====================

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.storageKey, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('operations')) {
          const store = db.createObjectStore('operations', { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('collection', 'collection', { unique: false });
        }
      };
    });
  }

  private async restoreFromDatabase(): Promise<void> {
    if (!this.db) return;

    try {
      const operations = await new Promise<QueuedOperation[]>((resolve, reject) => {
        const transaction = this.db!.transaction('operations', 'readonly');
        const store = transaction.objectStore('operations');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Restore pending and processing operations (discard completed/failed)
      this.queue = operations.filter(
        (op) => op.status === 'pending' || op.status === 'processing',
      );

      // Reset processing operations back to pending
      for (const op of this.queue) {
        if (op.status === 'processing') {
          op.status = 'pending';
        }
      }

      this.sortQueue();
    } catch (error) {
      console.warn('[OfflineQueue] Failed to restore operations from IndexedDB:', error);
    }
  }

  private async saveOperation(operation: QueuedOperation): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('operations', 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.put(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateOperation(operation: QueuedOperation): Promise<void> {
    await this.saveOperation(operation);
  }

  private async removeOperation(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('operations', 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearDatabase(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('operations', 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
