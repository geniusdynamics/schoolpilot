# SchoolPilot Sync System API Reference

## Overview

This document provides a comprehensive API reference for the SchoolPilot sync system components. It includes detailed interface definitions, method signatures, and usage examples for developers working with the synchronization system.

## Core Interfaces

### SyncConflict

```typescript
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
```

**Properties:**

* `id`: Unique identifier for the conflict

* `entityName`: Name of the entity type (e.g., 'students', 'courses')

* `entityId`: Unique identifier of the conflicted entity

* `conflictType`: Type of conflict detected

* `localData`: Local version of the data

* `remoteData`: Remote version of the data

* `timestamp`: When the conflict was detected

* `resolved`: Whether the conflict has been resolved

* `resolution`: Applied resolution strategy (if resolved)

### ConflictResolution

```typescript
export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedData: any;
  timestamp: Date;
  resolvedBy: 'system' | 'user';
  metadata?: Record<string, any>;
}
```

**Properties:**

* `strategy`: Resolution strategy used

* `resolvedData`: Final resolved data

* `timestamp`: When resolution was applied

* `resolvedBy`: Whether resolved automatically or manually

* `metadata`: Additional resolution metadata

### SyncStatus

```typescript
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
  };
  conflicts: {
    total: number;
    unresolved: number;
    byType: Record<string, number>;
  };
  performance: {
    averageSyncTime: number;
    successRate: number;
    throughput: number;
  };
}
```

### NetworkState

```typescript
export interface NetworkState {
  isOnline: boolean;
  backendAvailable: boolean;
  latency: number | null;
  lastCheck: Date;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}
```

### DataStrategy

```typescript
export interface DataStrategy {
  mode: 'offline-first' | 'online-first' | 'hybrid' | 'demo';
  fallbackMode: 'offline' | 'cache' | 'error';
  syncPolicy: 'immediate' | 'batched' | 'manual';
  conflictResolution: 'server-wins' | 'client-wins' | 'merge' | 'prompt';
  batchSize?: number;
  syncInterval?: number;
}
```

### SyncMetrics

```typescript
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
```

## DataSyncMonitoringService API

### Constructor

```typescript
constructor(dataStrategyManager: DataStrategyManager)
```

### Methods

#### recordConflict

```typescript
recordConflict(conflict: Omit<SyncConflict, 'id' | 'timestamp' | 'resolved'>): string
```

**Purpose:** Records a new sync conflict

**Parameters:**

* `conflict`: Conflict data without id, timestamp, and resolved status

**Returns:** Unique conflict ID

**Example:**

```typescript
const conflictId = syncMonitor.recordConflict({
  entityName: 'students',
  entityId: '123',
  conflictType: 'version',
  localData: { name: 'John Doe', grade: 'A' },
  remoteData: { name: 'John Doe', grade: 'B' }
});
```

#### resolveConflict

```typescript
resolveConflict(
  conflictId: string, 
  strategy: ConflictResolutionStrategy, 
  customData?: any
): Promise<boolean>
```

**Purpose:** Resolves a specific conflict using the given strategy

**Parameters:**

* `conflictId`: ID of the conflict to resolve

* `strategy`: Resolution strategy to apply

* `customData`: Custom resolution data (for manual resolution)

**Returns:** Promise resolving to success status

**Example:**

```typescript
const success = await syncMonitor.resolveConflict(
  'conflict-123',
  'merge'
);
```

#### getSyncStatus

```typescript
getSyncStatus(): SyncStatus
```

**Purpose:** Returns current sync status

**Returns:** Current sync status object

#### subscribe

```typescript
subscribe(callback: (status: SyncStatus) => void): () => void
```

**Purpose:** Subscribe to sync status updates

**Parameters:**

* `callback`: Function called when status changes

**Returns:** Unsubscribe function

**Example:**

```typescript
const unsubscribe = syncMonitor.subscribe((status) => {
  console.log('Sync status updated:', status);
});

// Later...
unsubscribe();
```

#### getUnresolvedConflicts

```typescript
getUnresolvedConflicts(): SyncConflict[]
```

**Purpose:** Returns all unresolved conflicts

**Returns:** Array of unresolved conflicts

#### getSyncMetrics

```typescript
getSyncMetrics(): SyncMetrics
```

**Purpose:** Returns current sync performance metrics

**Returns:** Sync metrics object

## DataStrategyManager API

### Constructor

```typescript
constructor(
  strategy: DataStrategy,
  databaseService: DatabaseService,
  mockDataService: any,
  backendAPI?: any
)
```

### Methods

#### executeOperation

```typescript
executeOperation<T>(
  operation: DataOperation<T>
): Promise<OperationResult<T>>
```

**Purpose:** Executes a data operation using the current strategy

**Parameters:**

* `operation`: Data operation to execute

**Returns:** Promise resolving to operation result

#### updateStrategy

```typescript
updateStrategy(newStrategy: Partial<DataStrategy>): void
```

**Purpose:** Updates the current data strategy

**Parameters:**

* `newStrategy`: Partial strategy object with updates

#### getSyncQueueStatus

```typescript
getSyncQueueStatus(): {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}
```

**Purpose:** Returns current sync queue status

**Returns:** Queue status object

#### forceSync

```typescript
forceSync(): Promise<void>
```

**Purpose:** Forces immediate processing of sync queue

**Returns:** Promise that resolves when sync is complete

#### clearSyncQueue

```typescript
clearSyncQueue(): void
```

**Purpose:** Clears all pending sync operations

**Warning:** Use with caution as this will lose pending changes

## NetworkStateManager API

### Constructor

```typescript
constructor(healthCheckUrl?: string, checkInterval?: number)
```

### Methods

#### subscribe

```typescript
subscribe(callback: (state: NetworkState) => void): () => void
```

**Purpose:** Subscribe to network state changes

**Parameters:**

* `callback`: Function called when network state changes

**Returns:** Unsubscribe function

#### getState

```typescript
getState(): NetworkState
```

**Purpose:** Returns current network state

**Returns:** Current network state object

#### forceHealthCheck

```typescript
forceHealthCheck(): Promise<void>
```

**Purpose:** Forces an immediate backend health check

**Returns:** Promise that resolves when check is complete

## UnifiedCRUDService API

### Constructor

```typescript
constructor(
  dataStrategyManager: DataStrategyManager,
  mockDataService: any,
  databaseService: DatabaseService,
  consistencyService?: any
)
```

### Methods

#### create

```typescript
create<T>(
  entityName: string, 
  data: Omit<T, 'id'>, 
  options?: CRUDOptions
): Promise<CRUDResult<T>>
```

**Purpose:** Creates a new entity

**Parameters:**

* `entityName`: Name of the entity type

* `data`: Entity data without ID

* `options`: Optional CRUD options

**Returns:** Promise resolving to CRUD result

#### read

```typescript
read<T>(
  entityName: string, 
  id: string | number, 
  options?: CRUDOptions
): Promise<CRUDResult<T>>
```

**Purpose:** Reads an entity by ID

**Parameters:**

* `entityName`: Name of the entity type

* `id`: Entity ID

* `options`: Optional CRUD options

**Returns:** Promise resolving to CRUD result

#### update

```typescript
update<T>(
  entityName: string, 
  id: string | number, 
  data: Partial<T>, 
  options?: CRUDOptions
): Promise<CRUDResult<T>>
```

**Purpose:** Updates an existing entity

**Parameters:**

* `entityName`: Name of the entity type

* `id`: Entity ID

* `data`: Partial entity data to update

* `options`: Optional CRUD options

**Returns:** Promise resolving to CRUD result

#### delete

```typescript
delete(
  entityName: string, 
  id: string | number, 
  options?: CRUDOptions
): Promise<CRUDResult<boolean>>
```

**Purpose:** Deletes an entity

**Parameters:**

* `entityName`: Name of the entity type

* `id`: Entity ID

* `options`: Optional CRUD options

**Returns:** Promise resolving to CRUD result

#### query

```typescript
query<T>(
  entityName: string, 
  queryOptions?: QueryOptions, 
  options?: CRUDOptions
): Promise<CRUDResult<T[]>>
```

**Purpose:** Queries entities with optional filtering and pagination

**Parameters:**

* `entityName`: Name of the entity type

* `queryOptions`: Query filtering and pagination options

* `options`: Optional CRUD options

**Returns:** Promise resolving to CRUD result with array of entities

#### clearCache

```typescript
clearCache(entityName?: string): void
```

**Purpose:** Clears cache for specific entity type or all entities

**Parameters:**

* `entityName`: Optional entity name to clear specific cache

## Enhanced AppDataContext API

The `AppDataContext` has been enhanced with sync capabilities:

```typescript
export interface EnhancedAppDataContextType extends AppDataContextType {
  // Sync Status
  syncStatus: SyncStatus;
  networkState: NetworkState;
  
  // Conflict Resolution
  conflicts: SyncConflict[];
  resolveConflict: (conflictId: string, strategy: ConflictResolutionStrategy) => Promise<boolean>;
  resolveAllConflicts: (strategy: ConflictResolutionStrategy) => Promise<void>;
  
  // Sync Control
  forceSyncAll: () => Promise<void>;
  clearSyncQueue: () => void;
  
  // Performance Metrics
  syncMetrics: SyncMetrics;
}
```

### Usage Example

```typescript
const {
  // Standard data access
  students,
  addStudent,
  updateStudent,
  
  // Sync capabilities
  syncStatus,
  networkState,
  conflicts,
  resolveConflict,
  forceSyncAll,
  syncMetrics
} = useAppData();

// Monitor sync status
const isSyncing = syncStatus.mode === 'syncing';
const hasConflicts = conflicts.length > 0;

// Handle conflict resolution
const handleResolveConflict = async (conflictId: string) => {
  const success = await resolveConflict(conflictId, 'merge');
  if (success) {
    console.log('Conflict resolved successfully');
  }
};

// Force sync when needed
const handleForceSync = async () => {
  await forceSyncAll();
};
```

## Error Handling

All async methods in the sync system follow consistent error handling patterns:

```typescript
try {
  const result = await unifiedCRUD.create('students', studentData);
  if (result.success) {
    console.log('Student created:', result.data);
  } else {
    console.error('Creation failed:', result.error);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Configuration Examples

### Development Configuration

```typescript
const developmentStrategy: DataStrategy = {
  mode: 'offline-first',
  fallbackMode: 'cache',
  syncPolicy: 'immediate',
  conflictResolution: 'prompt',
  batchSize: 5,
  syncInterval: 10000
};
```

### Production Configuration

```typescript
const productionStrategy: DataStrategy = {
  mode: 'hybrid',
  fallbackMode: 'offline',
  syncPolicy: 'batched',
  conflictResolution: 'merge',
  batchSize: 20,
  syncInterval: 30000
};
```

This API reference provides comprehensive documentation for integ
