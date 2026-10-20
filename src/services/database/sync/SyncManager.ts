import { logger } from '@/utils/logging';

/**
 * SyncManager - Bidirectional sync between backend and local cache
 *
 * Manages data synchronization between a backend API and local cache provider,
 * handles conflict resolution, tracks sync progress and statistics, and supports
 * pause/resume functionality.
 *
 * Requirements: 6.1-6.11, 8.6-8.8
 */

import { EventEmitter } from 'events';

export type SyncStatus = 'idle' | 'syncing' | 'paused' | 'error';
export type SyncDirection = 'push' | 'pull' | 'bidirectional';
export type ConflictResolution = 'local-wins' | 'remote-wins' | 'last-write-wins' | 'manual';

export interface SyncStatistics {
  documentsUploaded: number;
  documentsDownloaded: number;
  conflicts: number;
  errors: number;
}

export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface SyncState {
  status: SyncStatus;
  direction: SyncDirection;
  lastSync: Date | null;
  nextSync: Date | null;
  progress: SyncProgress;
  statistics: SyncStatistics;
}

export interface SyncChange {
  collection: string;
  id: string;
  data: any;
  deleted: boolean;
  timestamp: number;
  version?: string;
}

export interface SyncConflict {
  collection: string;
  id: string;
  local: any;
  remote: any;
  localModified: number;
  remoteModified: number;
}

export interface SyncManagerConfig {
  autoSync?: boolean;
  syncInterval?: number; // ms
  syncOnStartup?: boolean;
  syncOnNetworkReconnect?: boolean;
  batchSize?: number;
  conflictResolution?: ConflictResolution;
  direction?: SyncDirection;
}

const DEFAULT_CONFIG: Required<SyncManagerConfig> = {
  autoSync: true,
  syncInterval: 30_000,
  syncOnStartup: true,
  syncOnNetworkReconnect: true,
  batchSize: 100,
  conflictResolution: 'last-write-wins',
  direction: 'bidirectional',
};

export type SyncEvents = {
  'sync-start': void;
  'sync-complete': SyncState;
  'sync-error': Error;
  'sync-progress': SyncProgress;
  'conflict': SyncConflict;
  'pause': void;
  'resume': void;
};

/**
 * SyncManager - Manages bidirectional sync between backend and cache
 */
export class SyncManager extends EventEmitter {
  private config: Required<SyncManagerConfig>;
  private state: SyncState;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  constructor(
    private backendProvider: SyncBackendProvider,
    private cacheProvider: SyncCacheProvider,
    config: SyncManagerConfig = {},
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  /**
   * Start sync process
   */
  async start(): Promise<void> {
    if (this.isProcessing) return;

    if (this.config.syncOnStartup) {
      await this.performSync();
    }

    if (this.config.autoSync) {
      this.syncIntervalId = setInterval(() => {
        if (!this.isProcessing && this.state.status !== 'paused') {
          this.performSync();
        }
      }, this.config.syncInterval);
    }
  }

  /**
   * Stop sync process
   */
  async stop(): Promise<void> {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    this.state.status = 'idle';
    this.emit('pause');
  }

  /**
   * Pause sync (can be resumed)
   */
  pause(): void {
    this.state.status = 'paused';
    this.emit('pause');
  }

  /**
   * Resume sync
   */
  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'idle';
      this.emit('resume');

      if (this.config.syncOnNetworkReconnect) {
        this.performSync();
      }
    }
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Perform a single sync cycle
   */
  async performSync(): Promise<void> {
    if (this.isProcessing || this.state.status === 'paused') return;

    this.isProcessing = true;
    this.state.status = 'syncing';
    this.state.direction = this.config.direction;
    this.state.progress = { current: 0, total: 0, percentage: 0 };

    this.emit('sync-start');

    try {
      if (this.config.direction === 'pull' || this.config.direction === 'bidirectional') {
        await this.pullFromBackend();
      }

      if (this.config.direction === 'push' || this.config.direction === 'bidirectional') {
        await this.pushToBackend();
      }

      this.state.status = 'idle';
      this.state.lastSync = new Date();
      this.state.nextSync = new Date(Date.now() + this.config.syncInterval);

      this.emit('sync-complete', this.state);
    } catch (error) {
      this.state.status = 'error';
      this.state.statistics.errors++;
      this.emit('sync-error', error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isProcessing = false;
    }
  }

  // ==================== Internal Sync Methods ====================

  private async pullFromBackend(): Promise<void> {
    const lastSync = this.state.lastSync?.getTime() || 0;

    let changes: SyncChange[];
    try {
      changes = await this.backendProvider.getChangesSince(lastSync);
    } catch (error) {
      logger.warn('[SyncManager] Failed to fetch changes from backend:', error);
      return;
    }

    this.state.progress.total = changes.length;
    this.state.progress.current = 0;

    for (const change of changes) {
      try {
        if (change.deleted) {
          await this.cacheProvider.delete(change.collection, change.id);
        } else {
          const existing = await this.cacheProvider.read(change.collection, change.id);

          if (existing) {
            // Check for conflicts
            if (this.hasConflict(existing, change)) {
              await this.resolveConflict(change.collection, change.id, existing, change.data);
              this.state.statistics.conflicts++;
            } else {
              await this.cacheProvider.update(change.collection, change.id, change.data);
            }
          } else {
            await this.cacheProvider.create(change.collection, change.data);
          }
        }

        this.state.progress.current++;
        this.state.progress.percentage =
          this.state.progress.total > 0
            ? (this.state.progress.current / this.state.progress.total) * 100
            : 0;
        this.state.statistics.documentsDownloaded++;

        this.emit('sync-progress', this.state.progress);
      } catch (error) {
        logger.error(`[SyncManager] Failed to sync ${change.collection}/${change.id}:`, error);
        this.state.statistics.errors++;
      }
    }
  }

  private async pushToBackend(): Promise<void> {
    const lastSync = this.state.lastSync?.getTime() || 0;

    let localChanges: SyncChange[];
    try {
      localChanges = await this.cacheProvider.getChangesSince(lastSync);
    } catch (error) {
      logger.warn('[SyncManager] Failed to fetch local changes:', error);
      return;
    }

    this.state.progress.total =
      (this.state.progress.total || 0) + localChanges.length;
    this.state.progress.current = this.state.progress.current || 0;

    for (const change of localChanges) {
      try {
        if (change.deleted) {
          await this.backendProvider.delete(change.collection, change.id);
        } else {
          try {
            await this.backendProvider.read(change.collection, change.id);
            await this.backendProvider.update(change.collection, change.id, change.data);
          } catch {
            // Not found on backend, create it
            await this.backendProvider.create(change.collection, change.data);
          }
        }

        this.state.progress.current++;
        this.state.progress.percentage =
          this.state.progress.total > 0
            ? (this.state.progress.current / this.state.progress.total) * 100
            : 0;
        this.state.statistics.documentsUploaded++;

        this.emit('sync-progress', this.state.progress);
      } catch (error) {
        logger.error(`[SyncManager] Failed to push ${change.collection}/${change.id}:`, error);
        this.state.statistics.errors++;
      }
    }
  }

  private hasConflict(local: any, remote: SyncChange): boolean {
    const localModified = (local as any)._modified || (local as any).updatedAt || 0;
    const remoteModified = remote.timestamp;

    // Both have been modified since last sync
    const lastSync = this.state.lastSync?.getTime() || 0;
    return localModified > lastSync && remoteModified > lastSync;
  }

  private async resolveConflict(
    collection: string,
    id: string,
    local: any,
    remote: any,
  ): Promise<void> {
    const conflict: SyncConflict = {
      collection,
      id,
      local,
      remote,
      localModified: (local as any)._modified || (local as any).updatedAt || 0,
      remoteModified: remote.timestamp || remote._modified || 0,
    };

    // Emit conflict event for manual resolution
    this.emit('conflict', conflict);

    switch (this.config.conflictResolution) {
      case 'local-wins':
        await this.backendProvider.update(collection, id, local);
        break;

      case 'remote-wins':
        await this.cacheProvider.update(collection, id, remote);
        break;

      case 'last-write-wins':
        if (conflict.localModified >= conflict.remoteModified) {
          await this.backendProvider.update(collection, id, local);
        } else {
          await this.cacheProvider.update(collection, id, remote);
        }
        break;

      case 'manual':
        // Conflict emitted above, await manual resolution
        break;
    }
  }

  private createInitialState(): SyncState {
    return {
      status: 'idle',
      direction: this.config.direction,
      lastSync: null,
      nextSync: null,
      progress: { current: 0, total: 0, percentage: 0 },
      statistics: {
        documentsUploaded: 0,
        documentsDownloaded: 0,
        conflicts: 0,
        errors: 0,
      },
    };
  }
}

// ==================== Provider Interfaces ====================

/**
 * Interface for backend provider in sync operations
 */
export interface SyncBackendProvider {
  create(collection: string, data: any): Promise<any>;
  read(collection: string, id: string): Promise<any>;
  update(collection: string, id: string, data: any): Promise<any>;
  delete(collection: string, id: string): Promise<void>;
  getChangesSince(timestamp: number): Promise<SyncChange[]>;
}

/**
 * Interface for cache provider in sync operations
 */
export interface SyncCacheProvider {
  create(collection: string, data: any): Promise<any>;
  read(collection: string, id: string): Promise<any>;
  update(collection: string, id: string, data: any): Promise<any>;
  delete(collection: string, id: string): Promise<void>;
  getChangesSince(timestamp: number): Promise<SyncChange[]>;
}
