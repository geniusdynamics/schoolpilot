# Unified Data Service

<cite>
**Referenced Files in This Document**
- [UnifiedDataService.ts](file://src/services/data/UnifiedDataService.ts)
- [types.ts](file://src/services/data/types.ts)
- [SyncEngine.ts](file://src/services/data/SyncEngine.ts)
- [index.ts](file://src/services/data/index.ts)
- [deployment.ts](file://src/config/deployment.ts)
- [providers/index.ts](file://src/services/data/providers/index.ts)
- [DATA_LAYER_STRATEGY.md](file://docs/architecture/DATA_LAYER_STRATEGY.md)
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
10. [Appendices](#appendices)

## Introduction
The UnifiedDataService (UDS) is the central data access abstraction in SchoolPilot3. It provides a unified API for CRUD operations, real-time subscriptions, bulk operations, transactions, and synchronization across multiple storage backends. UDS encapsulates provider selection logic, deployment mode handling, caching, and event emission while exposing a consistent interface to the rest of the application.

## Project Structure
The data layer is organized around a provider abstraction pattern with a factory responsible for selecting the appropriate backend based on deployment mode. The service exposes a singleton instance and a factory for testing.

```mermaid
graph TB
UDS["UnifiedDataService<br/>Singleton: uds"] --> PF["Provider Factory<br/>createProvider()"]
PF --> PM["Deployment Mode<br/>selection"]
PM --> P_SQLITE["SQLiteProvider"]
PM --> P_POUCH["PouchDBProvider"]
PM --> P_BACKEND["BackendProvider"]
PM --> P_ERPNEXT["ERPNextProvider"]
UDS --> CACHE["In-memory Cache<br/>TTL: 60s"]
UDS --> EVENTS["Event Bus<br/>BehaviorSubject"]
UDS --> SYNC["SyncEngine<br/>Optional"]
```

**Diagram sources**
- [UnifiedDataService.ts:479-505](file://src/services/data/UnifiedDataService.ts#L479-L505)
- [providers/index.ts:42-102](file://src/services/data/providers/index.ts#L42-L102)
- [deployment.ts:42-186](file://src/config/deployment.ts#L42-L186)

**Section sources**
- [index.ts:1-37](file://src/services/data/index.ts#L1-L37)
- [DATA_LAYER_STRATEGY.md:42-90](file://docs/architecture/DATA_LAYER_STRATEGY.md#L42-L90)

## Core Components
- UnifiedDataService: Central orchestrator for data operations, caching, subscriptions, and events.
- DataProvider interface: Contract for all storage backends.
- SyncEngine: Optional synchronization manager for offline-first workflows.
- Provider factory: Creates and configures providers based on deployment mode.

**Section sources**
- [UnifiedDataService.ts:36-146](file://src/services/data/UnifiedDataService.ts#L36-L146)
- [types.ts:135-182](file://src/services/data/types.ts#L135-L182)
- [SyncEngine.ts:51-95](file://src/services/data/SyncEngine.ts#L51-L95)

## Architecture Overview
The architecture follows a layered design with clear separation between the application layer, the unified data service, and backend providers. UDS routes operations to the selected provider and manages caching, subscriptions, and synchronization.

```mermaid
graph TB
subgraph "Application Layer"
Hooks["React Hooks<br/>useStudents(), useAttendance()"]
UI["UI Components"]
end
subgraph "Unified Data Service"
UDS["UnifiedDataService"]
Cache["Cache Manager"]
Events["Event Bus"]
Subs["Subscription Manager"]
end
subgraph "Storage Backends"
SQLite["SQLiteProvider"]
Pouch["PouchDBProvider"]
Backend["BackendProvider"]
ERPNext["ERPNextProvider"]
end
subgraph "Sync Layer"
Sync["SyncEngine"]
end
Hooks --> UDS
UI --> UDS
UDS --> Cache
UDS --> Events
UDS --> Subs
UDS --> SQLite
UDS --> Pouch
UDS --> Backend
UDS --> ERPNext
UDS --> Sync
```

**Diagram sources**
- [DATA_LAYER_STRATEGY.md:42-90](file://docs/architecture/DATA_LAYER_STRATEGY.md#L42-L90)
- [UnifiedDataService.ts:148-415](file://src/services/data/UnifiedDataService.ts#L148-L415)
- [SyncEngine.ts:1-559](file://src/services/data/SyncEngine.ts#L1-L559)

## Detailed Component Analysis

### UnifiedDataService Initialization and Provider Selection
The service initialization process validates state, selects a provider based on deployment mode, initializes the provider, and updates internal state.

```mermaid
sequenceDiagram
participant App as "Application"
participant UDS as "UnifiedDataService"
participant PF as "Provider Factory"
participant Prov as "DataProvider"
App->>UDS : initialize(mode, options)
UDS->>UDS : ensureInitializing()
UDS->>PF : createProvider(mode, options)
PF-->>UDS : provider instance
UDS->>Prov : initialize(options)
Prov-->>UDS : ready
UDS->>UDS : update state (initialized=true)
UDS-->>App : Promise<void>
```

**Diagram sources**
- [UnifiedDataService.ts:78-128](file://src/services/data/UnifiedDataService.ts#L78-L128)
- [providers/index.ts:42-102](file://src/services/data/providers/index.ts#L42-L102)

Key behaviors:
- State management with BehaviorSubject for initialization status and error reporting.
- Provider selection logic based on deployment mode with fallbacks.
- Configuration consolidation including provider capabilities and options.

**Section sources**
- [UnifiedDataService.ts:78-128](file://src/services/data/UnifiedDataService.ts#L78-L128)
- [deployment.ts:198-224](file://src/config/deployment.ts#L198-L224)
- [providers/index.ts:42-102](file://src/services/data/providers/index.ts#L42-L102)

### CRUD Operations
The service implements a comprehensive CRUD API with query support, pagination, and write options.

```mermaid
classDiagram
class UnifiedDataService {
+initialize(mode, options) Promise~void~
+find(collection, query) Promise~PaginatedResult~
+findOne(collection, id) Promise~T|null~
+create(collection, data, options) Promise~T~
+update(collection, id, data, options) Promise~T~
+delete(collection, id, options) Promise~void~
+bulkCreate(collection, data) Promise~T[]~
+bulkUpdate(collection, updates) Promise~T[]~
+bulkDelete(collection, ids) Promise~void~
+count(collection, filter) Promise~number~
+exists(collection, id) Promise~boolean~
+export() Promise~Blob~
+import(data) Promise~void~
+transaction(operations) Promise~T~
+sync() Promise~SyncResult~
+getPendingChanges() Promise~Change[]~
+subscribe(collection, query) Observable~T[]~
+subscribeOne(collection, id) Observable~T|null~
}
class DataProvider {
+name : string
+version : string
+capabilities : ProviderCapabilities
+initialize(config) Promise~void~
+destroy() Promise~void~
+find(collection, query) Promise~PaginatedResult~
+findOne(collection, id) Promise~T|null~
+create(collection, data, options) Promise~T~
+update(collection, id, data, options) Promise~T~
+delete(collection, id, options) Promise~void~
+bulkCreate(collection, data) Promise~T[]~
+bulkUpdate(collection, updates) Promise~T[]~
+bulkDelete(collection, ids) Promise~void~
+count(collection, filter) Promise~number~
+exists(collection, id) Promise~boolean~
+export?() Promise~Blob~
+import?() Promise~void~
+transaction?() Promise~T~
+sync?() Promise~SyncResult~
+getPendingChanges?() Promise~Change[]~
+applyRemoteChanges?() Promise~void~
+subscribe(collection, query) Observable~T[]~
+subscribeOne(collection, id) Observable~T|null~
}
UnifiedDataService --> DataProvider : "delegates to"
```

**Diagram sources**
- [UnifiedDataService.ts:148-475](file://src/services/data/UnifiedDataService.ts#L148-L475)
- [types.ts:135-182](file://src/services/data/types.ts#L135-L182)

CRUD implementation highlights:
- Query parameter support including filters, sorts, pagination, and projections.
- Write options for optimistic updates, silent writes, and custom metadata.
- Automatic cache invalidation on write operations.
- Event emission for entity lifecycle changes.

**Section sources**
- [UnifiedDataService.ts:153-283](file://src/services/data/UnifiedDataService.ts#L153-L283)
- [types.ts:64-107](file://src/services/data/types.ts#L64-L107)

### Caching Mechanism and Cache Invalidation
The service implements an in-memory cache with TTL-based expiration and pattern-based invalidation.

```mermaid
flowchart TD
Start([Cache Request]) --> BuildKey["Build Cache Key<br/>collection:query"]
BuildKey --> CheckCache{"Cache Hit<br/>(within TTL)?"}
CheckCache --> |Yes| ReturnCached["Return Cached Result"]
CheckCache --> |No| FetchProvider["Fetch from Provider"]
FetchProvider --> StoreCache["Store in Cache<br/>with timestamp"]
StoreCache --> ReturnResult["Return Result"]
ReturnCached --> End([End])
ReturnResult --> End
subgraph "Cache Invalidation"
WriteOp["Write Operation"] --> InvalidatePattern["Invalidate by Pattern"]
InvalidatePattern --> ClearCache["Remove Matching Keys"]
end
```

**Diagram sources**
- [UnifiedDataService.ts:607-629](file://src/services/data/UnifiedDataService.ts#L607-L629)

Cache characteristics:
- TTL: 60 seconds for both collection queries and individual entity lookups.
- Key format: collection:query-string for queries, collection:id for single entities.
- Granular invalidation on create/update/delete operations.

**Section sources**
- [UnifiedDataService.ts:47-48](file://src/services/data/UnifiedDataService.ts#L47-L48)
- [UnifiedDataService.ts:607-629](file://src/services/data/UnifiedDataService.ts#L607-L629)

### Real-time Subscription System
The service supports both real-time subscriptions (when available) and polling fallbacks.

```mermaid
sequenceDiagram
participant Comp as "Component"
participant UDS as "UnifiedDataService"
participant Prov as "DataProvider"
participant Poll as "Polling Timer"
Comp->>UDS : subscribe(collection, query)
alt Provider supports realtime
UDS->>Prov : subscribe(collection, query)
Prov-->>UDS : Observable<T[]>
UDS-->>Comp : Observable<T[]>
else Fallback to polling
UDS->>Poll : start interval (5s)
loop Every 5s
Poll->>UDS : find(collection, query)
UDS->>UDS : cache miss
UDS->>Prov : find(collection, query)
Prov-->>UDS : PaginatedResult<T>
UDS->>UDS : cache result
UDS-->>Comp : next(data)
end
end
```

**Diagram sources**
- [UnifiedDataService.ts:285-321](file://src/services/data/UnifiedDataService.ts#L285-L321)
- [UnifiedDataService.ts:641-675](file://src/services/data/UnifiedDataService.ts#L641-L675)

Subscription features:
- Single-entity and collection subscriptions.
- Capability-aware selection between real-time and polling.
- RxJS Observable streams with proper cleanup.
- Fallback logic for non-realtime providers.

**Section sources**
- [UnifiedDataService.ts:285-321](file://src/services/data/UnifiedDataService.ts#L285-L321)
- [UnifiedDataService.ts:641-675](file://src/services/data/UnifiedDataService.ts#L641-L675)

### Bulk Operations and Transactions
Bulk operations and transactions provide efficient batch processing and atomicity guarantees.

```mermaid
flowchart TD
BulkStart([Bulk Operation]) --> ValidateProvider{"Provider supports<br/>bulk/transactions?"}
ValidateProvider --> |No| ThrowError["Throw Error"]
ValidateProvider --> |Yes| ExecuteOps["Execute Operations"]
ExecuteOps --> InvalidateCache["Invalidate Related Cache"]
InvalidateCache --> EmitEvents["Emit Operation Events"]
EmitEvents --> BulkEnd([Complete])
TransactionStart([Transaction]) --> ValidateTxn{"Provider supports<br/>transactions?"}
ValidateTxn --> |No| ThrowTxnError["Throw Error"]
ValidateTxn --> |Yes| ExecuteTxn["Execute in Transaction"]
ExecuteTxn --> TxnEnd([Complete])
```

**Diagram sources**
- [UnifiedDataService.ts:323-382](file://src/services/data/UnifiedDataService.ts#L323-L382)

Bulk operation behaviors:
- Batch create, update, and delete operations.
- Efficient provider-side implementation when supported.
- Comprehensive cache invalidation for bulk updates.
- Transaction support with rollback semantics.

**Section sources**
- [UnifiedDataService.ts:323-382](file://src/services/data/UnifiedDataService.ts#L323-L382)
- [types.ts:102-107](file://src/services/data/types.ts#L102-L107)

### Sync Capabilities
The service integrates with the SyncEngine for offline-first synchronization.

```mermaid
sequenceDiagram
participant App as "Application"
participant UDS as "UnifiedDataService"
participant Sync as "SyncEngine"
participant Local as "Local Provider"
participant Remote as "Remote Provider"
App->>UDS : sync()
UDS->>Sync : sync()
Sync->>Local : getPendingChanges()
Sync->>Remote : pushChanges()
Sync->>Remote : pullChanges()
Sync->>Sync : resolveConflicts()
Sync-->>UDS : SyncResult
UDS->>UDS : clear cache
UDS-->>App : SyncResult
```

**Diagram sources**
- [UnifiedDataService.ts:384-415](file://src/services/data/UnifiedDataService.ts#L384-L415)
- [SyncEngine.ts:129-206](file://src/services/data/SyncEngine.ts#L129-L206)

Sync features:
- Automatic and manual sync triggers.
- Conflict detection and resolution strategies.
- Offline queue management with retry logic.
- Progress monitoring and status reporting.

**Section sources**
- [UnifiedDataService.ts:384-428](file://src/services/data/UnifiedDataService.ts#L384-L428)
- [SyncEngine.ts:51-95](file://src/services/data/SyncEngine.ts#L51-L95)

### Provider Abstraction and Extensibility
The provider abstraction enables pluggable storage backends with capability detection.

```mermaid
classDiagram
class ProviderCapabilities {
+realtime : boolean
+sync : boolean
+transactions : boolean
+offline : boolean
+encryption : boolean
+fullTextSearch : boolean
+relations : boolean
}
class DataProvider {
<<interface>>
+name : string
+version : string
+capabilities : ProviderCapabilities
+initialize(config) Promise~void~
+destroy() Promise~void~
+find(collection, query) Promise~PaginatedResult~
+create(collection, data, options) Promise~T~
+subscribe(collection, query) Observable~T[]~
}
class SQLiteProvider {
+capabilities : ProviderCapabilities
+initialize(config) Promise~void~
+sync() Promise~SyncResult~
}
class PouchDBProvider {
+capabilities : ProviderCapabilities
+initialize(config) Promise~void~
+sync() Promise~SyncResult~
}
class BackendProvider {
+capabilities : ProviderCapabilities
+initialize(config) Promise~void~
}
class ERPNextProvider {
+capabilities : ProviderCapabilities
+initialize(config) Promise~void~
}
DataProvider <|.. SQLiteProvider
DataProvider <|.. PouchDBProvider
DataProvider <|.. BackendProvider
DataProvider <|.. ERPNextProvider
```

**Diagram sources**
- [types.ts:9-31](file://src/services/data/types.ts#L9-L31)
- [types.ts:135-182](file://src/services/data/types.ts#L135-L182)
- [providers/index.ts:7-10](file://src/services/data/providers/index.ts#L7-L10)

Provider selection logic:
- Standalone mode: PouchDB by default, SQLite optional via feature flag.
- Networked/SaaS: PouchDB with live sync enabled.
- Hosted: BackendProvider with configured credentials.
- ERPNext: ERPNextProvider for enterprise integration.

**Section sources**
- [providers/index.ts:42-102](file://src/services/data/providers/index.ts#L42-L102)
- [deployment.ts:42-186](file://src/config/deployment.ts#L42-L186)

## Dependency Analysis
The service maintains loose coupling through the DataProvider interface and dependency injection via the factory pattern.

```mermaid
graph LR
UDS["UnifiedDataService"] --> Types["types.ts"]
UDS --> Providers["providers/index.ts"]
UDS --> Sync["SyncEngine.ts"]
UDS --> RxJS["rxjs"]
Providers --> SQLite["SQLiteProvider"]
Providers --> Pouch["PouchDBProvider"]
Providers --> Backend["BackendProvider"]
Providers --> ERPNext["ERPNextProvider"]
Deployment["deployment.ts"] --> Providers
```

**Diagram sources**
- [UnifiedDataService.ts:8-22](file://src/services/data/UnifiedDataService.ts#L8-L22)
- [providers/index.ts:1-103](file://src/services/data/providers/index.ts#L1-L103)
- [deployment.ts:1-241](file://src/config/deployment.ts#L1-L241)

Key dependencies:
- RxJS for observables and reactive patterns.
- Provider factory for runtime provider selection.
- Deployment configuration for mode-based behavior.
- SyncEngine for optional synchronization.

**Section sources**
- [UnifiedDataService.ts:8-22](file://src/services/data/UnifiedDataService.ts#L8-L22)
- [providers/index.ts:1-103](file://src/services/data/providers/index.ts#L1-L103)

## Performance Considerations
- Caching: 60-second TTL reduces redundant provider calls and improves response times.
- Pagination: Server-side pagination prevents large result sets and memory pressure.
- Bulk operations: Batch processing minimizes round trips and improves throughput.
- Polling fallback: 5-second intervals balance responsiveness with resource usage.
- Lazy loading: Provider instantiation deferred until initialization.

## Troubleshooting Guide
Common initialization issues:
- Uninitialized service: Call initialize() before using any methods.
- Provider errors: Check deployment mode configuration and provider availability.
- Cache corruption: Use destroy() to reset state and clear cache.

Operational diagnostics:
- Monitor state$ for initialization status and error conditions.
- Subscribe to events$ for entity lifecycle notifications.
- Use count() and exists() for data validation and debugging.

**Section sources**
- [UnifiedDataService.ts:601-605](file://src/services/data/UnifiedDataService.ts#L601-L605)
- [UnifiedDataService.ts:133-146](file://src/services/data/UnifiedDataService.ts#L133-L146)

## Conclusion
The UnifiedDataService provides a robust, extensible foundation for data access in SchoolPilot3. Its provider abstraction, comprehensive CRUD API, real-time capabilities, and synchronization support enable flexible deployment across diverse environments while maintaining a consistent developer experience.

## Appendices

### Practical Usage Examples
Service initialization:
- Initialize with deployment mode and provider options.
- Handle initialization state and error conditions.
- Use singleton instance (uds) for application-wide access.

Data operations:
- Perform CRUD operations with query parameters and pagination.
- Use write options for optimistic updates and silent writes.
- Leverage bulk operations for efficient batch processing.

Subscription handling:
- Subscribe to collections or single entities.
- Handle real-time updates or polling fallbacks.
- Manage subscription lifecycle with proper cleanup.

**Section sources**
- [UnifiedDataService.ts:78-128](file://src/services/data/UnifiedDataService.ts#L78-L128)
- [UnifiedDataService.ts:153-283](file://src/services/data/UnifiedDataService.ts#L153-L283)
- [UnifiedDataService.ts:285-321](file://src/services/data/UnifiedDataService.ts#L285-L321)