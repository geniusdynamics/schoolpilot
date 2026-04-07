/**
 * Sync Service Types
 *
 * Type definitions and interfaces for synchronization services.
 * Enables dependency injection and testability.
 */

import type { DataProvider } from '../data/types';
import type { Conflict, ConflictResolutionStrategy } from '../backend/types';

// ============================================================================
// Sync Manager Types
// ============================================================================

export interface SyncManagerConfig {
  autoSync: boolean;
  syncInterval: number;
  retryInterval: number;
  maxRetries: number;
  compressionEnabled: boolean;
  compressionThreshold: number;
  skipAttachmentsOnSlowConnection: boolean;
  conflictStrategy: ConflictResolutionStrategy;
  entityStrategies: Record<string, ConflictResolutionStrategy>;
  syncOnMobile: boolean;
  syncOnWifiOnly: boolean;
  minBatteryLevel: number;
}

export interface SyncStats {
  lastSync: Date | null;
  nextSync: Date | null;
  totalOperations: number;
  pendingOperations: number;
  failedOperations: number;
  conflictsDetected: number;
  conflictsResolved: number;
  bytesUploaded: number;
  bytesDownloaded: number;
  syncDuration: number;
}

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  recordId: string;
  data?: any;
  timestamp: Date;
  retryCount: number;
}

export interface SyncProgress {
  current: number;
  total: number;
  entity: string;
  percentage: number;
}

export interface SyncResult {
  success: boolean;
  operationsCompleted: number;
  operationsFailed: number;
  conflicts: Conflict[];
  errors: SyncError[];
  duration: number;
  stats: SyncStats;
}

export interface SyncError {
  operation: SyncOperation;
  error: Error;
  retryable: boolean;
  timestamp: Date;
}

// ============================================================================
// Conflict Resolver Types
// ============================================================================

export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  fieldResolutions?: Record<string, 'local' | 'remote' | 'custom'>;
  customValues?: Record<string, any>;
}

export interface FieldConflict {
  field: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: Date;
  remoteTimestamp: Date;
}

export interface ConflictDetectionOptions {
  ignoreFields?: string[];
  compareFields?: string[];
}

export interface ConflictResolutionResult {
  resolved: boolean;
  data: Record<string, any>;
  strategy: ConflictResolutionStrategy;
  timestamp: Date;
}

// ============================================================================
// Service Worker Sync Types
// ============================================================================

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  priority: 'critical' | 'high' | 'normal' | 'low';
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface SyncQueue {
  items: SyncQueueItem[];
  processing: boolean;
  lastProcessed: Date | null;
}

export interface BackgroundSyncStatus {
  supported: boolean;
  registered: boolean;
  tag?: string;
  lastSync?: Date;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Sync Manager Interface
 *
 * Central coordinator for all sync operations.
 */
export interface ISyncManager {
  /**
   * Register a data provider
   */
  registerProvider(name: string, provider: DataProvider): void;

  /**
   * Unregister a data provider
   */
  unregisterProvider(name: string): void;

  /**
   * Get a registered provider
   */
  getProvider(name: string): DataProvider | undefined;

  /**
   * Start sync manager
   */
  start(): void;

  /**
   * Stop sync manager
   */
  stop(): void;

  /**
   * Trigger sync immediately
   */
  syncNow(force?: boolean): Promise<SyncStats>;

  /**
   * Get current sync state
   */
  getState(): SyncState;

  /**
   * Get sync statistics
   */
  getStats(): SyncStats;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SyncManagerConfig>): void;

  /**
   * Get current configuration
   */
  getConfig(): SyncManagerConfig;

  /**
   * Check if sync should run
   */
  shouldSync(): boolean;

  /**
   * Register background sync
   */
  registerBackgroundSync(): Promise<boolean>;

  /**
   * Unregister background sync
   */
  unregisterBackgroundSync(): Promise<boolean>;

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): Conflict[];

  /**
   * Resolve a conflict
   */
  resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<boolean>;

  /**
   * Event handlers
   */
  onStateChange?: (state: SyncState) => void;
  onSyncStart?: () => void;
  onSyncComplete?: (stats: SyncStats) => void;
  onSyncError?: (error: Error) => void;
  onConflict?: (conflict: Conflict) => void;
  onProgress?: (progress: SyncProgress) => void;
}

/**
 * Conflict Resolver Interface
 *
 * Handles detection and resolution of sync conflicts.
 */
export interface IConflictResolver {
  /**
   * Set default resolution strategy
   */
  setStrategy(strategy: ConflictResolutionStrategy): void;

  /**
   * Set custom rule for a specific entity
   */
  setEntityRule(entity: string, strategy: ConflictResolutionStrategy): void;

  /**
   * Detect conflicts between local and remote records
   */
  detectConflicts(
    local: Record<string, any>,
    remote: Record<string, any>,
    options?: ConflictDetectionOptions
  ): FieldConflict[];

  /**
   * Resolve a conflict using the configured strategy
   */
  resolve(conflict: Conflict, resolution?: ConflictResolution): Record<string, any>;

  /**
   * Resolve all conflicts in a batch
   */
  resolveBatch(conflicts: Conflict[], resolutions?: ConflictResolution[]): Record<string, any>[];

  /**
   * Get current strategy
   */
  getStrategy(): ConflictResolutionStrategy;

  /**
   * Get entity-specific strategy
   */
  getEntityStrategy(entity: string): ConflictResolutionStrategy | undefined;
}

/**
 * Service Worker Sync Interface
 *
 * Manages background sync via service worker.
 */
export interface IServiceWorkerSync {
  /**
   * Add item to sync queue
   */
  addToQueue(item: Omit<SyncQueueItem, 'id'>): string;

  /**
   * Remove item from queue
   */
  removeFromQueue(itemId: string): boolean;

  /**
   * Get current queue
   */
  getQueue(): SyncQueueItem[];

  /**
   * Process queue
   */
  processQueue(): Promise<SyncResult>;

  /**
   * Clear queue
   */
  clearQueue(): void;

  /**
   * Get queue status
   */
  getQueueStatus(): {
    pending: number;
    processing: boolean;
    lastProcessed: Date | null;
  };

  /**
   * Check if background sync is supported
   */
  isBackgroundSyncSupported(): boolean;

  /**
   * Get background sync status
   */
  getBackgroundSyncStatus(): BackgroundSyncStatus;
}

// ============================================================================
// Event Types
// ============================================================================

export type SyncEventType =
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'sync_paused'
  | 'sync_resumed'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'progress_update';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: Date;
  stats?: SyncStats;
  conflict?: Conflict;
  progress?: SyncProgress;
  error?: Error;
}

export type SyncEventListener = (event: SyncEvent) => void;
