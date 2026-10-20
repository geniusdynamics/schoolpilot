import { logger } from '@/utils/logging';

// ABOUTME: Service for monitoring data synchronization and handling conflicts
// ABOUTME: Provides sync status tracking, conflict resolution, and queue management

import { DataStrategyManager } from './DataStrategyManager';
import { NetworkStateManager, NetworkState } from '../data/NetworkStateManager';
import { globalDataConsistencyService } from './DataConsistencyService';

export interface SyncConflict {
  id: string;
  entityName: string;
  entityId: string | number;
  conflictType: 'version' | 'concurrent_edit' | 'deleted_locally' | 'deleted_remotely';
  localData: any;
  remoteData: any;
  timestamp: Date;
  resolved: boolean;
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  strategy: 'local_wins' | 'remote_wins' | 'merge' | 'manual';
  resolvedData?: any;
  resolvedBy?: string;
  resolvedAt: Date;
  notes?: string;
}

export interface SyncStatus {
  isActive: boolean;
  mode: 'idle' | 'syncing' | 'paused' | 'error';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    byPriority: Record<string, number>;
  };
  conflicts: {
    total: number;
    unresolved: number;
    byType: Record<string, number>;
  };
  lastSync: Date | null;
  nextSync: Date | null;
  errors: SyncError[];
  performance: {
    averageSyncTime: number;
    successRate: number;
    throughput: number; // items per minute
  };
}

export interface SyncError {
  id: string;
  timestamp: Date;
  entityName: string;
  entityId?: string | number;
  operation: 'create' | 'update' | 'delete' | 'sync';
  error: string;
  retryCount: number;
  resolved: boolean;
}

export interface SyncMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageLatency: number;
  peakLatency: number;
  throughput: number;
  errorRate: number;
  conflictRate: number;
  cacheHitRate: number;
}

export class DataSyncMonitoringService {
  private dataStrategyManager: DataStrategyManager | null = null;
  private networkManager: NetworkStateManager;
  private conflicts: Map<string, SyncConflict> = new Map();
  private errors: SyncError[] = [];
  private metrics: SyncMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageLatency: 0,
    peakLatency: 0,
    throughput: 0,
    errorRate: 0,
    conflictRate: 0,
    cacheHitRate: 0
  };
  private syncHistory: Array<{ timestamp: Date; duration: number; success: boolean }> = [];
  private subscribers: Array<(status: SyncStatus) => void> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(dataStrategyManager?: DataStrategyManager) {
    this.dataStrategyManager = dataStrategyManager;
    this.networkManager = NetworkStateManager.getInstance();
    this.startMonitoring();
  }

  // Start monitoring sync operations
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.notifySubscribers();
    }, 5000); // Update every 5 seconds

    // Listen to network changes
    this.networkManager.subscribe((networkState) => {
      this.handleNetworkStateChange(networkState);
    });
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Get current sync status
  getSyncStatus(): SyncStatus {
    const queueStatus = this.dataStrategyManager?.getSyncStatus() || {
      pending: 0,
      processing: false,
      byPriority: {},
      errors: 0
    };

    const conflictsByType = Array.from(this.conflicts.values()).reduce((acc, conflict) => {
      acc[conflict.conflictType] = (acc[conflict.conflictType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const unresolvedConflicts = Array.from(this.conflicts.values()).filter(c => !c.resolved).length;

    // Calculate performance metrics
    const recentSyncs = this.syncHistory.slice(-10); // Last 10 syncs
    const averageSyncTime = recentSyncs.length > 0 
      ? recentSyncs.reduce((sum, sync) => sum + sync.duration, 0) / recentSyncs.length 
      : 0;
    
    const successRate = recentSyncs.length > 0 
      ? (recentSyncs.filter(s => s.success).length / recentSyncs.length) * 100 
      : 100;

    const throughput = this.calculateThroughput();

    return {
      isActive: queueStatus.processing,
      mode: this.determineSyncMode(queueStatus),
      progress: {
        current: this.metrics.successfulOperations,
        total: this.metrics.totalOperations,
        percentage: this.metrics.totalOperations > 0 
          ? (this.metrics.successfulOperations / this.metrics.totalOperations) * 100 
          : 0
      },
      queue: {
        pending: queueStatus.pending,
        processing: queueStatus.processing ? 1 : 0,
        completed: this.metrics.successfulOperations,
        failed: this.metrics.failedOperations,
        byPriority: queueStatus.byPriority
      },
      conflicts: {
        total: this.conflicts.size,
        unresolved: unresolvedConflicts,
        byType: conflictsByType
      },
      lastSync: this.getLastSyncTime(),
      nextSync: this.getNextSyncTime(),
      errors: this.errors.slice(-10), // Last 10 errors
      performance: {
        averageSyncTime,
        successRate,
        throughput
      }
    };
  }

  // Determine sync mode based on queue status and network state
  private determineSyncMode(queueStatus: any): SyncStatus['mode'] {
    if (queueStatus.errors > 0) return 'error';
    if (queueStatus.processing) return 'syncing';
    if (!this.networkManager.getState().isOnline) return 'paused';
    return 'idle';
  }

  // Handle network state changes
  private handleNetworkStateChange(networkState: NetworkState): void {
    if (networkState.isOnline && networkState.backendAvailable) {
      // Network is back, resume sync if there are pending items
      this.resumeSync();
    } else {
      // Network is down, pause sync
      this.pauseSync();
    }
  }

  // Resume sync operations
  private resumeSync(): void {
    if (this.dataStrategyManager) {
      this.dataStrategyManager.forceSyncAll().catch(error => {
        this.recordError('sync', 'resume_sync', error);
      });
    }
  }

  // Pause sync operations
  private pauseSync(): void {
    // Sync will naturally pause when network is unavailable
    // DataStrategyManager handles this automatically
  }

  // Record a sync conflict
  recordConflict(
    entityName: string,
    entityId: string | number,
    conflictType: SyncConflict['conflictType'],
    localData: any,
    remoteData: any
  ): string {
    const conflictId = `${entityName}_${entityId}_${Date.now()}`;
    
    const conflict: SyncConflict = {
      id: conflictId,
      entityName,
      entityId,
      conflictType,
      localData,
      remoteData,
      timestamp: new Date(),
      resolved: false
    };

    this.conflicts.set(conflictId, conflict);
    this.metrics.conflictRate = this.conflicts.size / Math.max(this.metrics.totalOperations, 1);
    
    return conflictId;
  }

  // Resolve a conflict
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution
  ): Promise<boolean> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    try {
      // Apply the resolution
      let resolvedData: any;

      switch (resolution.strategy) {
        case 'local_wins':
          resolvedData = conflict.localData;
          break;
        case 'remote_wins':
          resolvedData = conflict.remoteData;
          break;
        case 'merge':
          resolvedData = this.mergeData(conflict.localData, conflict.remoteData);
          break;
        case 'manual':
          resolvedData = resolution.resolvedData;
          break;
        default:
          throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
      }

      // Validate the resolved data
      const validation = await globalDataConsistencyService.validateEntity(
        conflict.entityName,
        resolvedData,
        'update'
      );

      if (!validation.isValid) {
        throw new Error(`Resolved data is invalid: ${validation.errors.map(e => e.message).join('; ')}`);
      }

      // Update the conflict record
      conflict.resolved = true;
      conflict.resolution = {
        ...resolution,
        resolvedData,
        resolvedAt: new Date()
      };

      // Apply the resolution to the data store
      if (this.dataStrategyManager) {
        await this.dataStrategyManager.executeOperation({
          type: 'write',
          entity: conflict.entityName,
          priority: 'high',
          requiresBackend: false,
          allowOffline: true
        }, resolvedData);
      }

      return true;
    } catch (error) {
      this.recordError('conflict_resolution', conflictId, error);
      return false;
    }
  }

  // Merge data for conflict resolution
  private mergeData(localData: any, remoteData: any): any {
    // Simple merge strategy - prefer remote for most fields, keep local timestamps
    const merged = { ...remoteData };
    
    // Keep local creation timestamp if it exists
    if (localData.created_at && !remoteData.created_at) {
      merged.created_at = localData.created_at;
    }
    
    // Use the latest update timestamp
    if (localData.updated_at && remoteData.updated_at) {
      merged.updated_at = new Date(Math.max(
        new Date(localData.updated_at).getTime(),
        new Date(remoteData.updated_at).getTime()
      )).toISOString();
    }

    return merged;
  }

  // Record a sync error
  recordError(
    operation: SyncError['operation'],
    entityId: string | number | string,
    error: any
  ): void {
    const syncError: SyncError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      entityName: typeof entityId === 'string' && entityId.includes('_') ? entityId.split('_')[0] : 'unknown',
      entityId: typeof entityId === 'string' && entityId.includes('_') ? entityId.split('_')[1] : entityId,
      operation,
      error: error instanceof Error ? error.message : String(error),
      retryCount: 0,
      resolved: false
    };

    this.errors.push(syncError);
    
    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    this.metrics.failedOperations++;
    this.metrics.errorRate = this.metrics.failedOperations / Math.max(this.metrics.totalOperations, 1);
  }

  // Update metrics
  private updateMetrics(): void {
    this.metrics.totalOperations = this.metrics.successfulOperations + this.metrics.failedOperations;
    
    if (this.syncHistory.length > 0) {
      const latencies = this.syncHistory.map(h => h.duration);
      this.metrics.averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      this.metrics.peakLatency = Math.max(...latencies);
    }

    this.metrics.throughput = this.calculateThroughput();
  }

  // Calculate throughput (operations per minute)
  private calculateThroughput(): number {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentOperations = this.syncHistory.filter(h => h.timestamp > oneMinuteAgo);
    return recentOperations.length;
  }

  // Get last sync time
  private getLastSyncTime(): Date | null {
    if (this.syncHistory.length === 0) return null;
    return this.syncHistory[this.syncHistory.length - 1].timestamp;
  }

  // Get next sync time (estimated)
  private getNextSyncTime(): Date | null {
    // This would depend on the sync strategy and current queue
    // For now, return null (immediate sync)
    return null;
  }

  // Subscribe to sync status updates
  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  // Notify all subscribers
  private notifySubscribers(): void {
    const status = this.getSyncStatus();
    this.subscribers.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        logger.error('Error in sync status subscriber:', error);
      }
    });
  }

  // Get all unresolved conflicts
  getUnresolvedConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolved);
  }

  // Get sync metrics
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  // Clear resolved conflicts
  clearResolvedConflicts(): void {
    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.resolved) {
        this.conflicts.delete(id);
      }
    }
  }

  // Clear all errors
  clearErrors(): void {
    this.errors = [];
    this.metrics.failedOperations = 0;
    this.metrics.errorRate = 0;
  }

  // Force sync all pending operations
  async forceSyncAll(): Promise<void> {
    if (this.dataStrategyManager) {
      const startTime = Date.now();
      try {
        await this.dataStrategyManager.forceSyncAll();
        const duration = Date.now() - startTime;
        this.syncHistory.push({ timestamp: new Date(), duration, success: true });
        this.metrics.successfulOperations++;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.syncHistory.push({ timestamp: new Date(), duration, success: false });
        this.recordError('sync', 'force_sync_all', error);
      }
    }
  }

  // Update data strategy manager
  updateDataStrategyManager(dataStrategyManager: DataStrategyManager): void {
    this.dataStrategyManager = dataStrategyManager;
  }

  // Cleanup
  destroy(): void {
    this.stopMonitoring();
    this.subscribers = [];
    this.conflicts.clear();
    this.errors = [];
  }
}

// Global instance
export const globalDataSyncMonitoringService = new DataSyncMonitoringService();