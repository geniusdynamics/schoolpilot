# Transactions & Sync

<cite>
**Referenced Files in This Document**
- [UnifiedDataService.ts](file://src/services/data/UnifiedDataService.ts)
- [SQLiteWASMProvider.ts](file://src/services/database/SQLiteWASMProvider.ts)
- [OfflineQueue.ts](file://src/services/database/sync/OfflineQueue.ts)
- [SyncManager.ts](file://src/services/sync/SyncManager.ts)
- [DataSyncMonitoringService.ts](file://src/services/consistency/DataSyncMonitoringService.ts)
- [types.ts](file://src/services/data/types.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains the transaction and synchronization capabilities in UnifiedDataService. It covers atomic transaction execution, operation validation, rollback behavior, provider-specific sync workflows, pending changes detection, sync result interpretation, conflict resolution, and error handling. Practical examples illustrate complex transaction scenarios and sync workflow management, along with troubleshooting guidance for synchronization issues.

## Project Structure
The transaction and sync features span several modules:
- UnifiedDataService orchestrates provider selection, exposes transaction and sync APIs, and emits lifecycle events.
- Provider implementations (e.g., SQLiteWASMProvider) implement provider-specific transaction semantics and persistence.
- OfflineQueue manages pending operations and retries during sync.
- SyncManager coordinates multi-provider synchronization and schedules periodic sync cycles.
- DataSyncMonitoringService detects and resolves conflicts during sync.

```mermaid
graph TB
UDS["UnifiedDataService<br/>orchestrates transactions & sync"] --> Types["Types & Interfaces"]
UDS --> SQP["SQLiteWASMProvider<br/>implements transactions"]
UDS --> OQ["OfflineQueue<br/>pending changes & retries"]
UDS --> SM["SyncManager<br/>orchestrates sync"]
SM --> DMS["DataSyncMonitoringService<br/>conflict detection & resolution"]
UDS --> DMS
UDS --> Types
```

**Diagram sources**
- [UnifiedDataService.ts:36-128](file://src/services/data/UnifiedDataService.ts#L36-L128)
- [SQLiteWASMProvider.ts:1083-1117](file://src/services/database/SQLiteWASMProvider.ts#L1083-L1117)
- [OfflineQueue.ts:152-192](file://src/services/database/sync/OfflineQueue.ts#L152-L192)
- [SyncManager.ts:192-207](file://src/services/sync/SyncManager.ts#L192-L207)
- [DataSyncMonitoringService.ts:293-340](file://src/services/consistency/DataSyncMonitoringService.ts#L293-L340)

**Section sources**
- [UnifiedDataService.ts:36-128](file://src/services/data/UnifiedDataService.ts#L36-L128)
- [types.ts:1-200](file://src/services/data/types.ts#L1-L200)

## Core Components
- UnifiedDataService
  - Provides transaction() to execute multiple operations atomically via the current provider.
  - Provides sync() to trigger provider-specific synchronization and emits lifecycle events.
  - Exposes getPendingChanges() to enumerate pending operations awaiting sync.
  - Manages provider initialization, capability checks, and event emission.

- Provider Implementations
  - SQLiteWASMProvider implements provider-level transactions with explicit commit/rollback semantics.

- OfflineQueue
  - Queues pending operations, tracks statuses, applies retry/backoff strategies, and persists to IndexedDB.

- SyncManager
  - Coordinates provider sync cycles, aggregates statistics, and schedules subsequent syncs.

- DataSyncMonitoringService
  - Detects conflicts between local and remote data and resolves them by applying merged results.

**Section sources**
- [UnifiedDataService.ts:374-428](file://src/services/data/UnifiedDataService.ts#L374-L428)
- [UnifiedDataService.ts:389-415](file://src/services/data/UnifiedDataService.ts#L389-L415)
- [UnifiedDataService.ts:420-428](file://src/services/data/UnifiedDataService.ts#L420-L428)
- [SQLiteWASMProvider.ts:1083-1117](file://src/services/database/SQLiteWASMProvider.ts#L1083-L1117)
- [OfflineQueue.ts:152-192](file://src/services/database/sync/OfflineQueue.ts#L152-L192)
- [SyncManager.ts:192-207](file://src/services/sync/SyncManager.ts#L192-L207)
- [DataSyncMonitoringService.ts:293-340](file://src/services/consistency/DataSyncMonitoringService.ts#L293-L340)

## Architecture Overview
The transaction and sync architecture centers on UnifiedDataService delegating to providers and coordinating with auxiliary services for offline handling and conflict resolution.

```mermaid
sequenceDiagram
participant Client as "Client"
participant UDS as "UnifiedDataService"
participant Provider as "DataProvider"
participant Queue as "OfflineQueue"
participant SM as "SyncManager"
participant DMS as "DataSyncMonitoringService"
Client->>UDS : "transaction(operations)"
UDS->>Provider : "transaction(operations)"
Provider-->>UDS : "result or throws"
UDS-->>Client : "result"
Client->>UDS : "sync()"
UDS->>Provider : "sync()"
Provider-->>UDS : "SyncResult"
UDS->>DMS : "process conflicts (if any)"
DMS-->>UDS : "resolved"
UDS-->>Client : "SyncResult"
UDS->>Queue : "getPendingChanges()"
Queue-->>UDS : "pending operations"
UDS-->>Client : "pending changes"
```

**Diagram sources**
- [UnifiedDataService.ts:374-428](file://src/services/data/UnifiedDataService.ts#L374-L428)
- [UnifiedDataService.ts:389-415](file://src/services/data/UnifiedDataService.ts#L389-L415)
- [OfflineQueue.ts:152-192](file://src/services/database/sync/OfflineQueue.ts#L152-L192)
- [SyncManager.ts:192-207](file://src/services/sync/SyncManager.ts#L192-L207)
- [DataSyncMonitoringService.ts:293-340](file://src/services/consistency/DataSyncMonitoringService.ts#L293-L340)

## Detailed Component Analysis

### Transaction Method: Atomic Execution and Rollback
The transaction method delegates to the active provider and ensures the provider supports transactions. The provider-level implementation (e.g., SQLiteWASMProvider) defines commit and rollback semantics.

```mermaid
sequenceDiagram
participant Client as "Client"
participant UDS as "UnifiedDataService"
participant Provider as "SQLiteWASMProvider"
participant TX as "Transaction Scope"
Client->>UDS : "transaction(operations)"
UDS->>UDS : "ensureInitialized()"
UDS->>UDS : "capability check : transactions"
UDS->>Provider : "transaction(operations)"
Provider->>TX : "BEGIN"
Provider->>TX : "execute operations"
alt "success"
TX-->>Provider : "commit"
Provider-->>UDS : "result"
UDS-->>Client : "result"
else "failure"
TX-->>Provider : "rollback"
Provider-->>UDS : "throws"
UDS-->>Client : "error"
end
```

**Diagram sources**
- [UnifiedDataService.ts:374-382](file://src/services/data/UnifiedDataService.ts#L374-L382)
- [SQLiteWASMProvider.ts:1083-1117](file://src/services/database/SQLiteWASMProvider.ts#L1083-L1117)

Key behaviors:
- Capability gating: Throws if the provider does not support transactions.
- Provider responsibility: The provider starts a transaction, executes the supplied operations, and either commits or rolls back on error.
- Automatic commit/rollback: If the callback completes without error, the provider commits; otherwise, it rolls back.

Practical examples of complex transaction scenarios:
- Multi-entity insertions with cross-references: Insert parent records, then child records referencing parent IDs, ensuring atomicity. If any child insertion fails, the entire transaction is rolled back.
- Conditional updates with validation: Validate preconditions, compute derived values, and update multiple entities atomically. Failures roll back all changes.
- Bulk operations with partial failures: For providers that support partial execution, handle per-operation outcomes while maintaining transactional boundaries around the group.

**Section sources**
- [UnifiedDataService.ts:374-382](file://src/services/data/UnifiedDataService.ts#L374-L382)
- [SQLiteWASMProvider.ts:1083-1117](file://src/services/database/SQLiteWASMProvider.ts#L1083-L1117)

### Sync Operations: Provider-Specific Synchronization
The sync method triggers provider-specific synchronization, emits lifecycle events, and clears caches upon completion. Providers may enqueue pending changes and apply them during sync.

```mermaid
sequenceDiagram
participant Client as "Client"
participant UDS as "UnifiedDataService"
participant Provider as "DataProvider"
participant Queue as "OfflineQueue"
participant SM as "SyncManager"
participant DMS as "DataSyncMonitoringService"
Client->>UDS : "sync()"
UDS->>UDS : "ensureInitialized()"
UDS->>UDS : "capability check : sync"
UDS->>UDS : "emit 'sync-started'"
UDS->>Provider : "sync()"
Provider-->>UDS : "SyncResult"
alt "success"
UDS->>UDS : "emit 'sync-completed'"
UDS->>UDS : "cache.clear()"
else "failure"
UDS->>UDS : "emit 'sync-failed'"
end
UDS-->>Client : "SyncResult"
Client->>UDS : "getPendingChanges()"
UDS->>Provider : "getPendingChanges() (if supported)"
Provider-->>UDS : "pending operations"
UDS-->>Client : "pending changes"
```

**Diagram sources**
- [UnifiedDataService.ts:389-415](file://src/services/data/UnifiedDataService.ts#L389-L415)
- [UnifiedDataService.ts:420-428](file://src/services/data/UnifiedDataService.ts#L420-L428)
- [OfflineQueue.ts:152-192](file://src/services/database/sync/OfflineQueue.ts#L152-L192)
- [SyncManager.ts:192-207](file://src/services/sync/SyncManager.ts#L192-L207)

Sync status tracking and conflict resolution:
- Status tracking: Events indicate sync lifecycle transitions. Providers and services maintain internal state and statistics.
- Conflict resolution: DataSyncMonitoringService detects conflicts and merges local and remote data, persisting resolved results.

**Section sources**
- [UnifiedDataService.ts:389-415](file://src/services/data/UnifiedDataService.ts#L389-L415)
- [UnifiedDataService.ts:420-428](file://src/services/data/UnifiedDataService.ts#L420-L428)
- [OfflineQueue.ts:152-192](file://src/services/database/sync/OfflineQueue.ts#L152-L192)
- [SyncManager.ts:192-207](file://src/services/sync/SyncManager.ts#L192-L207)
- [DataSyncMonitoringService.ts:293-340](file://src/services/consistency/DataSyncMonitoringService.ts#L293-L340)

### Pending Changes Detection and Retry Management
OfflineQueue maintains a prioritized queue of pending operations, applies retry/backoff strategies, and prunes old failed items to prevent queue bloat.

```mermaid
flowchart TD
Start(["Start Processing"]) --> CheckProcessing{"Already Processing?"}
CheckProcessing --> |Yes| ReturnZero["Return counts: 0/0/0"]
CheckProcessing --> |No| SetFlag["Set processing flag"]
SetFlag --> Loop{"Queue not empty"}
Loop --> |No| ClearFlag["Clear processing flag"]
ClearFlag --> End(["End"])
Loop --> Sort["Sort by priority"]
Sort --> Dequeue["Take next operation"]
Dequeue --> StatusCheck{"Status == pending?"}
StatusCheck --> |No| Shift["Remove from queue"] --> Loop
StatusCheck --> |Yes| MarkProcessing["Mark status = processing"]
MarkProcessing --> Execute["Execute via OperationExecutor"]
Execute --> Result{"Result.success?"}
Result --> |Yes| MarkCompleted["status = completed<br/>remove from queue (persist if enabled)"] --> Loop
Result --> |No| IncRetry["increment retryCount<br/>record error"] --> MaxRetries{"retryCount >= maxRetries?"}
MaxRetries --> |Yes| MarkFailed["status = failed"] --> Loop
MaxRetries --> |No| Backoff["calculate backoff delay"] --> Sleep["sleep(backoff)"] --> Loop
```

**Diagram sources**
- [OfflineQueue.ts:152-192](file://src/services/database/sync/OfflineQueue.ts#L152-L192)
- [OfflineQueue.ts:328-335](file://src/services/database/sync/OfflineQueue.ts#L328-L335)
- [OfflineQueue.ts:337-340](file://src/services/database/sync/OfflineQueue.ts#L337-L340)
- [OfflineQueue.ts:341-353](file://src/services/database/sync/OfflineQueue.ts#L341-L353)

**Section sources**
- [OfflineQueue.ts:152-192](file://src/services/database/sync/OfflineQueue.ts#L152-L192)
- [OfflineQueue.ts:328-353](file://src/services/database/sync/OfflineQueue.ts#L328-L353)

### Sync Workflow Management
SyncManager coordinates provider synchronization, processes pending conflict resolutions, updates statistics, and schedules future syncs.

```mermaid
sequenceDiagram
participant SM as "SyncManager"
participant Provider as "DataProvider"
participant DMS as "DataSyncMonitoringService"
SM->>SM : "setState('syncing')"
loop "for each provider"
SM->>Provider : "sync()"
Provider-->>SM : "result"
end
SM->>DMS : "processPendingResolutions()"
DMS-->>SM : "resolved"
SM->>SM : "update stats (lastSync, duration, nextSync)"
alt "autoSync && no errors"
SM->>SM : "scheduleNextSync()"
else "errors"
SM->>SM : "setState('error'), scheduleRetry()"
end
SM-->>Caller : "stats"
```

**Diagram sources**
- [SyncManager.ts:162-207](file://src/services/sync/SyncManager.ts#L162-L207)

**Section sources**
- [SyncManager.ts:162-207](file://src/services/sync/SyncManager.ts#L162-L207)

### Conflict Resolution and Data Merging
DataSyncMonitoringService detects conflicts and merges local and remote data, preserving timestamps and applying resolved data to the store.

```mermaid
flowchart TD
Start(["Conflict Detected"]) --> Compare["Compare local vs remote"]
Compare --> Merge["Merge data:<br/>prefer remote fields,<br/>keep local timestamps"]
Merge --> Apply["Apply resolution via data strategy manager"]
Apply --> Record["Record resolution with timestamp"]
Record --> End(["Resolved"])
```

**Diagram sources**
- [DataSyncMonitoringService.ts:293-340](file://src/services/consistency/DataSyncMonitoringService.ts#L293-L340)

**Section sources**
- [DataSyncMonitoringService.ts:293-340](file://src/services/consistency/DataSyncMonitoringService.ts#L293-L340)

## Dependency Analysis
UnifiedDataService depends on provider capabilities and auxiliary services for offline and consistency handling.

```mermaid
graph TB
UDS["UnifiedDataService"] --> Types["Types & Capabilities"]
UDS --> Provider["DataProvider"]
UDS --> Events["Event Bus"]
UDS --> Cache["In-memory Cache"]
Provider --> TX["Transaction Implementation"]
Provider --> Sync["Sync Implementation"]
Provider --> Pending["Pending Changes"]
UDS --> SM["SyncManager"]
SM --> DMS["DataSyncMonitoringService"]
SM --> Stats["Sync Statistics"]
```

**Diagram sources**
- [UnifiedDataService.ts:36-128](file://src/services/data/UnifiedDataService.ts#L36-L128)
- [types.ts:1-200](file://src/services/data/types.ts#L1-L200)
- [SyncManager.ts:162-207](file://src/services/sync/SyncManager.ts#L162-L207)
- [DataSyncMonitoringService.ts:293-340](file://src/services/consistency/DataSyncMonitoringService.ts#L293-L340)

**Section sources**
- [UnifiedDataService.ts:36-128](file://src/services/data/UnifiedDataService.ts#L36-L128)
- [types.ts:1-200](file://src/services/data/types.ts#L1-L200)

## Performance Considerations
- Transaction batching: Group related operations within a single transaction to minimize overhead and improve throughput.
- Provider-level optimizations: Use provider-specific transaction primitives (e.g., BEGIN/COMMIT) and avoid unnecessary work inside the transaction callback.
- OfflineQueue prioritization: Ensure high-priority operations are executed first to reduce staleness.
- Retry backoff: Configure exponential or linear backoff to balance responsiveness and resource usage.
- Caching: UnifiedDataService caches query results; sync clears caches to ensure consistency after successful sync.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Transaction not supported
  - Symptom: Error indicating the provider does not support transactions.
  - Resolution: Switch to a provider that supports transactions or refactor operations to avoid requiring atomicity.

- Transaction failure and rollback
  - Symptom: Transaction throws; provider rolls back all changes.
  - Resolution: Inspect operation validation and preconditions; ensure data integrity constraints are satisfied.

- Sync fails with errors
  - Symptom: sync() emits a failed event and returns a result with errors.
  - Resolution: Review SyncResult for specific errors, address network/backend issues, and reattempt sync.

- Pending changes not applied
  - Symptom: getPendingChanges() returns operations; they remain queued.
  - Resolution: Verify OfflineQueue retry limits and backoff delays; check provider connectivity and backend availability.

- Conflicts not resolved
  - Symptom: Conflicts detected but not merged.
  - Resolution: Confirm DataSyncMonitoringService is invoked; review merge strategy and ensure resolved data is persisted.

**Section sources**
- [UnifiedDataService.ts:374-382](file://src/services/data/UnifiedDataService.ts#L374-L382)
- [UnifiedDataService.ts:389-415](file://src/services/data/UnifiedDataService.ts#L389-L415)
- [UnifiedDataService.ts:420-428](file://src/services/data/UnifiedDataService.ts#L420-L428)
- [OfflineQueue.ts:152-192](file://src/services/database/sync/OfflineQueue.ts#L152-L192)
- [DataSyncMonitoringService.ts:293-340](file://src/services/consistency/DataSyncMonitoringService.ts#L293-L340)

## Conclusion
UnifiedDataService centralizes transaction and sync operations across providers, enabling atomic multi-step writes and robust provider-specific synchronization. By leveraging provider-level transactions, OfflineQueue for pending changes, SyncManager for orchestration, and DataSyncMonitoringService for conflict resolution, applications can achieve reliable data consistency and resilient offline experiences.