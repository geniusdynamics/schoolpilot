/**
 * Consistency Service Types
 *
 * Type definitions and interfaces for data consistency and synchronization services.
 * Enables dependency injection and testability.
 */

import type { ValidationError, ValidationResult } from '@/utils/dataValidation';
import type { EntityData } from '@/hooks/useDataHookFactory';
import type { NetworkState } from '../data/NetworkStateManager';

// ============================================================================
// Data Consistency Service Types
// ============================================================================

export interface DataConsistencyConfig {
  enableValidation: boolean;
  enableReferentialIntegrity: boolean;
  enableConsistencyChecks: boolean;
  validationMode: 'strict' | 'lenient' | 'disabled';
  autoFix: boolean;
  logErrors: boolean;
}

export interface ConsistencyReport {
  timestamp: Date;
  mode: 'demo' | 'production';
  totalEntities: number;
  totalRecords: number;
  validationErrors: ValidationError[];
  consistencyErrors: ValidationError[];
  warnings: number;
  criticalErrors: number;
  summary: {
    isConsistent: boolean;
    entitiesWithErrors: string[];
    errorsByType: Record<string, number>;
  };
}

export interface DataMigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migratedEntities: string[];
  errors: ValidationError[];
  warnings: string[];
  backupCreated: boolean;
  backupPath?: string;
}

export interface EntityValidationContext {
  dataContext?: Record<string, any[]>;
  operation: 'create' | 'update' | 'delete';
  userId?: string;
  timestamp?: Date;
}

export interface CascadeRule {
  entity: string;
  field: string;
  allowCascade: boolean;
}

export type CascadeRules = Record<string, CascadeRule[]>;

// ============================================================================
// Data Sync Monitoring Types
// ============================================================================

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
    throughput: number;
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

export interface SyncHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  lastSync: Date | null;
  pendingChanges: number;
  unresolvedConflicts: number;
  recentErrors: number;
  averageLatency: number;
}

// ============================================================================
// Data Strategy Manager Types
// ============================================================================

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

export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  source: 'backend' | 'cache' | 'mock';
  synced: boolean;
  queued?: boolean;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Data Consistency Service Interface
 *
 * Maintains data consistency across demo and production modes.
 */
export interface IDataConsistencyService {
  /**
   * Validate a single entity before CRUD operations
   */
  validateEntity(
    entityName: string,
    data: EntityData,
    operation: 'create' | 'update' | 'delete',
    context?: EntityValidationContext
  ): Promise<ValidationResult>;

  /**
   * Run comprehensive consistency check
   */
  runConsistencyCheck(
    dataContext: Record<string, any[]>,
    mode?: 'demo' | 'production'
  ): Promise<ConsistencyReport>;

  /**
   * Validate data migration between modes
   */
  validateDataMigration(
    fromData: Record<string, any[]>,
    toData: Record<string, any[]>,
    fromVersion?: string,
    toVersion?: string
  ): Promise<DataMigrationResult>;

  /**
   * Get the last consistency report
   */
  getLastReport(): ConsistencyReport | null;

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DataConsistencyConfig>): void;

  /**
   * Get current configuration
   */
  getConfig(): DataConsistencyConfig;

  /**
   * Register custom validation schema
   */
  registerValidationSchema(schema: any): void;

  /**
   * Register custom consistency check
   */
  registerConsistencyCheck(check: any): void;
}

/**
 * Data Sync Monitoring Service Interface
 *
 * Monitors data synchronization and handles conflicts.
 */
export interface IDataSyncMonitoringService {
  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus;

  /**
   * Get sync metrics
   */
  getMetrics(): SyncMetrics;

  /**
   * Get all conflicts
   */
  getConflicts(): SyncConflict[];

  /**
   * Get unresolved conflicts
   */
  getUnresolvedConflicts(): SyncConflict[];

  /**
   * Resolve a conflict
   */
  resolveConflict(conflictId: string, resolution: ConflictResolution): boolean;

  /**
   * Get sync errors
   */
  getErrors(): SyncError[];

  /**
   * Get unresolved errors
   */
  getUnresolvedErrors(): SyncError[];

  /**
   * Acknowledge an error
   */
  acknowledgeError(errorId: string): void;

  /**
   * Get sync health status
   */
  getHealthStatus(): SyncHealthStatus;

  /**
   * Subscribe to sync status changes
   */
  subscribe(callback: (status: SyncStatus) => void): () => void;

  /**
   * Start monitoring
   */
  startMonitoring(): void;

  /**
   * Stop monitoring
   */
  stopMonitoring(): void;

  /**
   * Reset metrics
   */
  resetMetrics(): void;
}

/**
 * Data Strategy Manager Interface
 *
 * Manages data strategies and intelligent operation routing.
 */
export interface IDataStrategyManager {
  /**
   * Execute a data operation
   */
  executeOperation<T>(operation: DataOperation, params: any): Promise<T>;

  /**
   * Plan execution for an operation
   */
  planExecution(operation: DataOperation, networkState: NetworkState): ExecutionPlan;

  /**
   * Add item to sync queue
   */
  queueSync(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>): string;

  /**
   * Process sync queue
   */
  processSyncQueue(): Promise<void>;

  /**
   * Get sync queue status
   */
  getQueueStatus(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };

  /**
   * Get sync queue items
   */
  getQueueItems(): SyncQueueItem[];

  /**
   * Remove item from queue
   */
  removeFromQueue(itemId: string): boolean;

  /**
   * Update data strategy
   */
  updateStrategy(strategy: Partial<DataStrategy>): void;

  /**
   * Get current strategy
   */
  getStrategy(): DataStrategy;

  /**
   * Pause sync processing
   */
  pauseSync(): void;

  /**
   * Resume sync processing
   */
  resumeSync(): void;

  /**
   * Force immediate sync
   */
  forceSync(): Promise<void>;
}

// ============================================================================
// Event Types
// ============================================================================

export type ConsistencyEventType =
  | 'validation_failed'
  | 'consistency_check_complete'
  | 'migration_complete'
  | 'error';

export interface ConsistencyEvent {
  type: ConsistencyEventType;
  timestamp: Date;
  entityName?: string;
  errors?: ValidationError[];
  report?: ConsistencyReport;
  migrationResult?: DataMigrationResult;
}

export type SyncEventType =
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'error_occurred';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: Date;
  entityName?: string;
  entityId?: string | number;
  conflict?: SyncConflict;
  error?: SyncError;
  status?: SyncStatus;
}
