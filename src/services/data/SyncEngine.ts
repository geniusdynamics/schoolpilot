import { logger } from '@/utils/logging';

/**
 * Sync Engine
 * 
 * Handles synchronization between local and remote data stores.
 * Works with any DataProvider that supports sync capabilities.
 * 
 * Features:
 * - Offline-first queue management
 * - Conflict detection and resolution
 * - Delta sync (only changed data)
 * - Retry logic with exponential backoff
 * - Sync status monitoring
 */

import { BehaviorSubject } from 'rxjs';
import type {
  DataProvider,
  SyncResult,
  Change,
  SyncConflict,
  Filter
} from './types';

interface SyncEngineConfig {
  localProvider: DataProvider;
  remoteProvider: DataProvider;
  conflictStrategy: 'local-wins' | 'remote-wins' | 'timestamp-wins' | 'manual';
  autoSync: boolean;
  syncInterval: number; // milliseconds
  retryAttempts: number;
  batchSize: number;
}

interface SyncStatus {
  state: 'idle' | 'syncing' | 'error' | 'offline';
  lastSyncTime: Date | null;
  pendingCount: number;
  error: Error | null;
  progress: number; // 0-100
}

interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  attempts: number;
}

export class SyncEngine {
  private config: SyncEngineConfig;
  private operationQueue: QueuedOperation[] = [];
  private isSyncing = false;
  private syncIntervalId: any = null;
  private retryTimeouts: Map<string, any> = new Map();

  // Status observable
  private statusSubject = new BehaviorSubject<SyncStatus>({
    state: 'idle',
    lastSyncTime: null,
    pendingCount: 0,
    error: null,
    progress: 0
  });
  public status$ = this.statusSubject.asObservable();

  // Conflict observable
  private conflictSubject = new BehaviorSubject<SyncConflict | null>(null);
  public conflicts$ = this.conflictSubject.asObservable();

  constructor(config: Partial<SyncEngineConfig>) {
    this.config = {
      conflictStrategy: 'timestamp-wins',
      autoSync: true,
      syncInterval: 30000, // 30 seconds
      retryAttempts: 3,
      batchSize: 100,
      ...config
    } as SyncEngineConfig;

    // Load queue from storage
    this.loadQueue();

    // Setup auto-sync
    if (this.config.autoSync) {
      this.startAutoSync();
    }

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  // ==================== Public API ====================

  /**
   * Start automatic synchronization
   */
  startAutoSync(): void {
    if (this.syncIntervalId) {
      return;
    }

    this.syncIntervalId = setInterval(() => {
      this.sync();
    }, this.config.syncInterval);

    logger.info('🔄 Auto-sync started');
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }

    logger.info('⏹️ Auto-sync stopped');
  }

  /**
   * Trigger a manual sync
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      logger.info('Sync already in progress');
      return {
        success: true,
        pulled: 0,
        pushed: 0,
        conflicts: []
      };
    }

    if (!navigator.onLine) {
      logger.info('Offline, skipping sync');
      this.updateStatus({ state: 'offline' });
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        errors: [new Error('Device is offline')]
      };
    }

    this.isSyncing = true;
    this.updateStatus({ state: 'syncing', progress: 0 });

    try {
      // Process queued operations first
      await this.processQueue();

      // Get changes from local provider
      const localChanges = await this.getLocalChanges();

      // Push local changes to remote
      const pushResult = await this.pushChanges(localChanges);

      // Pull changes from remote
      const pullResult = await this.pullChanges();

      // Resolve any conflicts
      const resolvedConflicts = await this.resolveConflicts(pushResult.conflicts);

      // Clear synced changes from queue
      await this.clearSyncedChanges(localChanges);

      const result: SyncResult = {
        success: true,
        pulled: pullResult.count,
        pushed: pushResult.count,
        conflicts: resolvedConflicts
      };

      this.updateStatus({
        state: 'idle',
        lastSyncTime: new Date(),
        pendingCount: this.operationQueue.length,
        error: null,
        progress: 100
      });

      return result;
    } catch (error) {
      this.updateStatus({
        state: 'error',
        error: error instanceof Error ? error : new Error(String(error))
      });

      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: [],
        errors: [error instanceof Error ? error : new Error(String(error))]
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Queue an operation for sync
   */
  queueOperation(
    type: 'create' | 'update' | 'delete',
    collection: string,
    data: any
  ): void {
    const operation: QueuedOperation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      collection,
      data,
      timestamp: Date.now(),
      attempts: 0
    };

    this.operationQueue.push(operation);
    this.saveQueue();
    this.updateStatus({ pendingCount: this.operationQueue.length });

    logger.info(`📤 Queued ${type} operation for ${collection}`);

    // Try to sync immediately if online
    if (navigator.onLine && this.config.autoSync) {
      this.sync();
    }
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict(
    conflict: SyncConflict,
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any
  ): Promise<void> {
    try {
      if (resolution === 'local') {
        // Keep local version
        await this.config.remoteProvider.update(
          conflict.collection,
          conflict.id,
          conflict.local
        );
      } else if (resolution === 'remote') {
        // Accept remote version
        await this.config.localProvider.update(
          conflict.collection,
          conflict.id,
          conflict.remote
        );
      } else if (resolution === 'merge' && mergedData) {
        // Use merged data
        await Promise.all([
          this.config.localProvider.update(conflict.collection, conflict.id, mergedData),
          this.config.remoteProvider.update(conflict.collection, conflict.id, mergedData)
        ]);
      }

      logger.info(`✅ Resolved conflict for ${conflict.collection}:${conflict.id}`);
    } catch (error) {
      logger.error('Failed to resolve conflict:', error);
      throw error;
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.statusSubject.value;
  }

  /**
   * Check if there are pending changes
   */
  hasPendingChanges(): boolean {
    return this.operationQueue.length > 0;
  }

  /**
   * Get pending changes count
   */
  getPendingCount(): number {
    return this.operationQueue.length;
  }

  /**
   * Clear all pending changes
   */
  clearQueue(): void {
    this.operationQueue = [];
    this.saveQueue();
    this.updateStatus({ pendingCount: 0 });
  }

  /**
   * Destroy the sync engine
   */
  destroy(): void {
    this.stopAutoSync();
    this.statusSubject.complete();
    this.conflictSubject.complete();

    // Clear all retry timeouts
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();
  }

  // ==================== Private Methods ====================

  private async processQueue(): Promise<void> {
    if (this.operationQueue.length === 0) return;

    const operations = [...this.operationQueue];
    const batchSize = this.config.batchSize;

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      for (const operation of batch) {
        try {
          await this.processOperation(operation);
          
          // Remove from queue
          this.operationQueue = this.operationQueue.filter(op => op.id !== operation.id);
          this.saveQueue();
        } catch (error) {
          logger.error(`Failed to process operation ${operation.id}:`, error);
          
          operation.attempts++;
          
          if (operation.attempts >= this.config.retryAttempts) {
            // Remove failed operation after max retries
            this.operationQueue = this.operationQueue.filter(op => op.id !== operation.id);
            this.saveQueue();
            
            logger.error(`Operation ${operation.id} failed after ${this.config.retryAttempts} attempts`);
          } else {
            // Schedule retry with exponential backoff
            this.scheduleRetry(operation);
          }
        }
      }

      // Update progress
      const progress = Math.round(((i + batch.length) / operations.length) * 50);
      this.updateStatus({ progress });
    }
  }

  private async processOperation(operation: QueuedOperation): Promise<void> {
    const { localProvider, remoteProvider } = this.config;

    switch (operation.type) {
      case 'create':
        await remoteProvider.create(operation.collection, operation.data);
        break;
      case 'update':
        await remoteProvider.update(
          operation.collection,
          operation.data.id,
          operation.data
        );
        break;
      case 'delete':
        await remoteProvider.delete(operation.collection, operation.data.id);
        break;
    }
  }

  private scheduleRetry(operation: QueuedOperation): void {
    const delay = Math.pow(2, operation.attempts) * 1000; // Exponential backoff
    
    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(operation.id);
      
      if (navigator.onLine) {
        this.sync();
      }
    }, delay);

    this.retryTimeouts.set(operation.id, timeout);
  }

  private async getLocalChanges(): Promise<Change[]> {
    if (!this.config.localProvider.getPendingChanges) {
      return [];
    }

    return this.config.localProvider.getPendingChanges();
  }

  private async pushChanges(changes: Change[]): Promise<{ count: number; conflicts: SyncConflict[] }> {
    if (changes.length === 0) {
      return { count: 0, conflicts: [] };
    }

    const conflicts: SyncConflict[] = [];
    let count = 0;

    for (const change of changes) {
      try {
        switch (change.type) {
          case 'create':
            await this.config.remoteProvider.create(change.collection, change.data);
            break;
          case 'update':
            await this.config.remoteProvider.update(
              change.collection,
              change.data.id,
              change.data
            );
            break;
          case 'delete':
            await this.config.remoteProvider.delete(change.collection, change.data?.id || change.id);
            break;
        }
        count++;
      } catch (error: any) {
        if (error.status === 409) {
          // Conflict detected
          const localDoc = await this.config.localProvider.findOne(
            change.collection,
            change.data?.id || change.id
          );
          const remoteDoc = await this.config.remoteProvider.findOne(
            change.collection,
            change.data?.id || change.id
          );

          conflicts.push({
            collection: change.collection,
            id: change.data?.id || change.id,
            local: localDoc,
            remote: remoteDoc
          });

          // Notify about conflict
          this.conflictSubject.next(conflicts[conflicts.length - 1]);
        } else {
          throw error;
        }
      }
    }

    return { count, conflicts };
  }

  private async pullChanges(): Promise<{ count: number }> {
    // Get remote changes since last sync
    // This would typically use a changes feed or sync protocol
    // For now, we'll rely on the provider's sync method

    if (this.config.remoteProvider.sync) {
      const result = await this.config.remoteProvider.sync();
      return { count: result.pulled };
    }

    return { count: 0 };
  }

  private async resolveConflicts(conflicts: SyncConflict[]): Promise<SyncConflict[]> {
    const resolved: SyncConflict[] = [];

    for (const conflict of conflicts) {
      try {
        let resolution: 'local' | 'remote';

        switch (this.config.conflictStrategy) {
          case 'local-wins':
            resolution = 'local';
            break;
          case 'remote-wins':
            resolution = 'remote';
            break;
          case 'timestamp-wins':
            const localTime = new Date(conflict.local?.updatedAt || 0).getTime();
            const remoteTime = new Date(conflict.remote?.updatedAt || 0).getTime();
            resolution = localTime > remoteTime ? 'local' : 'remote';
            break;
          case 'manual':
          default:
            // Skip auto-resolution, leave for manual handling
            resolved.push({ ...conflict, resolution: undefined });
            continue;
        }

        await this.resolveConflict(conflict, resolution);
        resolved.push({ ...conflict, resolution });
      } catch (error) {
        logger.error('Failed to resolve conflict:', error);
        resolved.push(conflict);
      }
    }

    return resolved;
  }

  private async clearSyncedChanges(changes: Change[]): Promise<void> {
    if (this.config.localProvider.applyRemoteChanges) {
      // Mark changes as synced
      await this.config.localProvider.applyRemoteChanges(
        changes.map(c => ({ ...c, synced: true }))
      );
    }
  }

  private handleOnline(): void {
    logger.info('🌐 Online - resuming sync');
    this.updateStatus({ state: 'idle' });
    
    if (this.config.autoSync) {
      this.sync();
    }
  }

  private handleOffline(): void {
    logger.info('📴 Offline - pausing sync');
    this.updateStatus({ state: 'offline' });
  }

  private updateStatus(updates: Partial<SyncStatus>): void {
    const current = this.statusSubject.value;
    this.statusSubject.next({ ...current, ...updates });
  }

  private saveQueue(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sync_queue', JSON.stringify(this.operationQueue));
    }
  }

  private loadQueue(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('sync_queue');
      if (stored) {
        try {
          this.operationQueue = JSON.parse(stored);
        } catch (error) {
          logger.error('Failed to load sync queue:', error);
        }
      }
    }
  }
}

export default SyncEngine;
