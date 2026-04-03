# Data Strategy Management

<cite>
**Referenced Files in This Document**   
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts)
- [dataModePolicies.ts](file://src/config/dataModePolicies.ts)
- [DataSourceContext.tsx](file://src/contexts/DataSourceContext.tsx)
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Data Strategy Implementation](#data-strategy-implementation)
3. [Configuration Policies](#configuration-policies)
4. [Decision Logic for Strategy Selection](#decision-logic-for-strategy-selection)
5. [Integration with DataSourceContext](#integration-with-datasourcecontext)
6. [Fallback Mechanisms](#fallback-mechanisms)
7. [Monitoring with DataSyncMonitoringService](#monitoring-with-datasyncmonitoringservice)
8. [Caching and Performance Optimization](#caching-and-performance-optimization)
9. [State and Sequence Diagrams](#state-and-sequence-diagrams)

## Introduction
The DataStrategyManager component in schoolpilot3 implements a sophisticated data access management system that supports multiple data access patterns including api-first, offline-first, hybrid, and mock modes. This system intelligently routes data operations based on network availability, user permissions, and performance requirements. The component integrates with various data sources including backend APIs, RxDB (a reactive database), and mock data services, providing a seamless experience across different operational contexts.

**Section sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L50)

## Data Strategy Implementation
The DataStrategyManager class implements a comprehensive strategy pattern for data access, allowing the application to adapt its data retrieval and persistence behavior based on configuration and runtime conditions. The core implementation revolves around the `DataStrategy` interface which defines key properties including the operational mode, fallback behavior, synchronization policy, conflict resolution strategy, and batch processing parameters.

The manager supports four primary modes:
- **offline-first**: Prioritizes local data access with background synchronization
- **online-first**: Prefers direct API calls with local storage as fallback
- **hybrid**: Intelligent routing based on operation type and network conditions
- **demo/mock**: Uses mock data for demonstration or testing purposes

Each mode is configured with specific behaviors for fallback mechanisms, synchronization policies, and conflict resolution strategies. The implementation uses a pluggable architecture with distinct execution paths for backend API calls, RxDB operations, and mock data access.

```mermaid
classDiagram
class DataStrategy {
+mode : 'offline-first' | 'online-first' | 'hybrid' | 'demo'
+fallbackMode : 'offline' | 'cache' | 'error'
+syncPolicy : 'immediate' | 'batched' | 'manual'
+conflictResolution : 'server-wins' | 'client-wins' | 'merge' | 'prompt'
+batchSize? : number
+syncInterval? : number
}
class DataOperation {
+type : 'read' | 'write' | 'delete'
+entity : string
+priority : 'critical' | 'high' | 'normal' | 'low'
+requiresBackend : boolean
+allowOffline : boolean
+cacheStrategy? : 'cache-first' | 'network-first' | 'cache-only' | 'network-only'
}
class ExecutionPlan {
+primary : 'backend' | 'rxdb' | 'mock'
+fallback : 'backend' | 'rxdb' | 'mock' | null
+syncRequired : boolean
+deferredBackend? : boolean
+cacheStrategy? : DataOperation['cacheStrategy']
}
class DataStrategyManager {
-strategy : DataStrategy
-networkManager : NetworkStateManager
-backendAPI : BackendAPIService
-rxdbService : any
-mockDataService : any
-syncQueue : SyncQueueItem[]
-isProcessingSync : boolean
-syncInterval : NodeJS.Timeout | null
+executeOperation(operation, params) : Promise<T>
+planExecution(operation, networkState) : ExecutionPlan
+getSyncStatus() : Object
+updateStrategy(newStrategy) : void
+forceSyncAll() : Promise<void>
+clearSyncQueue() : void
+destroy() : void
}
DataStrategyManager --> DataStrategy : "uses"
DataStrategyManager --> DataOperation : "accepts"
DataStrategyManager --> ExecutionPlan : "returns"
DataStrategyManager --> NetworkStateManager : "depends on"
DataStrategyManager --> BackendAPIService : "uses"
DataStrategyManager --> RxDBProvider : "integrates with"
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)

**Section sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)

## Configuration Policies
The data access strategies are governed by configuration policies defined in the dataModePolicies.ts file. These policies establish the rules for data mode switching, validation, and environment-specific constraints. The system uses a comprehensive policy framework that considers the current environment (development, staging, production) when determining allowed data modes and switching behaviors.

The configuration includes storage mechanisms for persisting the current data mode using localStorage, with timestamp tracking for audit purposes. The policy system validates mode switches based on environment constraints and user permissions, preventing unauthorized changes in production environments. Each data mode has specific validation rules that ensure the selected strategy is appropriate for the current deployment context.

The policy framework exposes several key functions:
- `validateDataMode()`: Validates whether a mode switch is permitted in the current environment
- `switchDataMode()`: Executes a mode switch with appropriate confirmation requirements
- `getDataModeState()`: Returns the current state including available modes and switching capabilities
- `getStoredDataMode()`: Retrieves the persisted data mode from storage

These policies work in conjunction with the DataStrategyManager to ensure that data access patterns align with organizational requirements and operational constraints.

```mermaid
classDiagram
class DataModeState {
+current : DataMode
+available : DataMode[]
+canSwitch : boolean
+requiresConfirmation : boolean
+lastSwitched? : Date
}
class DataModeSwitchResult {
+success : boolean
+previousMode : DataMode
+newMode : DataMode
+requiresReload : boolean
+message? : string
+error? : string
}
class DataModePolicies {
+getStoredDataMode() : DataMode | null
+storeDataMode(dataMode : DataMode) : void
+getDataModeState(currentMode, environment) : DataModeState
+validateDataMode(newMode, environment) : { valid : boolean; error? : string }
+switchDataMode(newMode, currentMode, environment, options) : Promise<DataModeSwitchResult>
+clearStoredDataMode() : void
+getDataModeHistory() : { mode : DataMode; timestamp : Date }[]
}
DataStrategyManager --> DataModePolicies : "respects"
DataModePolicies --> EnvironmentMatrix : "uses"
```

**Diagram sources**
- [dataModePolicies.ts](file://src/config/dataModePolicies.ts#L1-L190)

**Section sources**
- [dataModePolicies.ts](file://src/config/dataModePolicies.ts#L1-L190)

## Decision Logic for Strategy Selection
The DataStrategyManager employs a sophisticated decision engine to select the appropriate data strategy based on multiple factors including network availability, user permissions, operation type, and performance requirements. The decision logic is implemented through the `planExecution()` method, which evaluates the current network state and operation characteristics to determine the optimal execution path.

For **offline-first** strategy:
- Primary data source is RxDB (local database)
- Backend serves as fallback when available
- Synchronization is required for write operations when network is available
- Cache strategy defaults to 'cache-first'

For **online-first** strategy:
- Primary data source is backend API when available
- RxDB serves as fallback for offline scenarios
- Cache strategy defaults to 'network-first'
- Immediate synchronization is preferred

For **hybrid** strategy:
- Read operations use RxDB as primary with backend fallback
- Write operations prefer backend when network quality is good
- Local storage serves as primary when network is poor
- Intelligent caching with 'cache-first' for reads and 'network-first' for writes

The decision process considers several key factors:
- Network connectivity and backend availability
- Operation priority (critical, high, normal, low)
- Whether the operation requires backend access
- User permissions and role-based access controls
- Connection quality metrics

The system also evaluates performance requirements, giving priority to critical operations in the synchronization queue and adjusting batch sizes based on network conditions.

```mermaid
flowchart TD
Start([Operation Request]) --> CheckDemoMode{"Mode is 'demo'?"}
CheckDemoMode --> |Yes| UseMock["Primary: mock"]
CheckDemoMode --> |No| CheckBackendRequirement{"Operation requires backend?"}
CheckBackendRequirement --> |Yes| CheckBackendAvailable{"Backend available?"}
CheckBackendAvailable --> |Yes| PlanBasedOnStrategy["Plan based on strategy"]
CheckBackendRequirement --> |No| PlanBasedOnStrategy
CheckBackendAvailable --> |No| CheckAllowOffline{"Operation allows offline?"}
CheckAllowOffline --> |Yes| UseRxDBForCritical["Primary: rxdb, sync required"]
CheckAllowOffline --> |No| ThrowError["Throw error: Backend required"]
PlanBasedOnStrategy --> CheckStrategy{"Strategy mode?"}
CheckStrategy --> |offline-first| PlanOfflineFirst["Plan: rxdb primary, backend fallback"]
CheckStrategy --> |online-first| PlanOnlineFirst["Plan: backend primary, rxdb fallback"]
CheckStrategy --> |hybrid| PlanHybrid["Plan: rxdb for reads, backend for writes"]
UseMock --> ReturnPlan
UseRxDBForCritical --> ReturnPlan
PlanOfflineFirst --> ReturnPlan
PlanOnlineFirst --> ReturnPlan
PlanHybrid --> ReturnPlan
ReturnPlan([Return Execution Plan]) --> End([Decision Complete])
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)

**Section sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)

## Integration with DataSourceContext
The DataStrategyManager integrates with the DataSourceContext to expose the current data strategy to UI components through a React context provider. The DataSourceContext acts as a bridge between the low-level data strategy implementation and the presentation layer, providing a simplified interface for components to access data source information and modify strategies.

The context exposes several key properties:
- **dataStrategy**: Current strategy ('api-first', 'offline-first', 'hybrid', 'mock')
- **currentDataMode**: Derived mode based on network and strategy ('online', 'offline', 'hybrid')
- **getDataSourceConfig()**: Returns configuration for the current strategy
- **updateDataStrategy()**: Allows components to change the data strategy
- **dataSourceDescription**: Human-readable description of current data source
- **enhancedOperations**: Availability of advanced features based on current context

The context uses React's `useMemo` and `useCallback` hooks to optimize performance, ensuring that consumers only re-render when relevant state changes. It subscribes to network state changes through the NetworkContext and sync status through the SyncContext, automatically updating the exposed values when these states change.

This integration enables UI components to display appropriate indicators about data source status, provide strategy selection controls, and adapt their behavior based on the current data access mode.

```mermaid
classDiagram
class DataSourceContextType {
+dataStrategy : DataStrategy
+currentDataMode : 'online' | 'offline' | 'hybrid'
+getDataSourceConfig() : DataSourceConfig
+updateDataStrategy(strategy) : void
+dataSourceDescription : string
+enhancedOperations : Object
}
class DataSourceConfig {
+strategy : DataStrategy
+fallbackEnabled : boolean
+cacheTimeout : number
+retryAttempts : number
}
class DataSourceProvider {
-dataStrategy : DataStrategy
-currentDataMode : 'online' | 'offline' | 'hybrid'
+getDataSourceConfig() : DataSourceConfig
+updateDataStrategy(strategy) : void
}
class UseDataSource {
+returns DataSourceContextType
}
DataSourceProvider --> DataSourceContextType : "implements"
DataSourceProvider --> DataSourceConfig : "contains"
DataSourceProvider --> NetworkContext : "subscribes to"
DataSourceProvider --> SyncContext : "subscribes to"
UseDataSource --> DataSourceContext : "consumes"
```

**Diagram sources**
- [DataSourceContext.tsx](file://src/contexts/DataSourceContext.tsx#L1-L149)

**Section sources**
- [DataSourceContext.tsx](file://src/contexts/DataSourceContext.tsx#L1-L149)

## Fallback Mechanisms
The DataStrategyManager implements robust fallback mechanisms to ensure data availability and application resilience when primary data sources are unavailable. These mechanisms are designed to handle various failure scenarios including network outages, backend service unavailability, and temporary connectivity issues.

When a primary data operation fails, the system automatically attempts fallback execution if a fallback strategy is defined in the execution plan. The fallback process follows these steps:
1. Capture the original operation and parameters
2. Log a warning about the primary execution failure
3. Create a fallback execution plan with the fallback source as primary
4. Re-execute the operation with the fallback strategy
5. If fallback also fails, propagate the error to the caller

The fallback behavior varies by strategy:
- **offline-first**: Falls back to backend API when available, otherwise fails
- **online-first**: Falls back to RxDB for read operations when offline
- **hybrid**: Has context-specific fallbacks based on operation type
- **mock**: No fallback (mock is the final fallback itself)

The system also implements a persistent synchronization queue that stores operations when the backend is unavailable. These operations are automatically retried when connectivity is restored, with exponential backoff and a maximum retry count of three attempts. Failed sync items are tracked in the monitoring service for diagnostic purposes.

```mermaid
sequenceDiagram
participant Component as "UI Component"
participant Strategy as "DataStrategyManager"
participant Primary as "Primary Source"
participant Fallback as "Fallback Source"
participant Queue as "Sync Queue"
Component->>Strategy : executeOperation()
Strategy->>Strategy : planExecution()
Strategy->>Primary : Execute operation
Primary-->>Strategy : Failure response
alt Fallback available
Strategy->>Strategy : Log warning
Strategy->>Strategy : Create fallback plan
Strategy->>Fallback : Execute with fallback
Fallback-->>Strategy : Result or failure
alt Fallback failed
Strategy->>Queue : Queue for later retry
Queue-->>Strategy : Queued confirmation
end
Strategy-->>Component : Return result or error
else No fallback
Strategy->>Strategy : Throw error
Strategy-->>Component : Propagate error
end
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)

**Section sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)

## Monitoring with DataSyncMonitoringService
The DataSyncMonitoringService provides comprehensive monitoring capabilities for tracking synchronization status, performance metrics, and conflict resolution. This service integrates directly with the DataStrategyManager to collect and expose detailed information about data operations and their outcomes.

Key monitoring features include:
- **Sync Status Tracking**: Real-time monitoring of synchronization state including idle, syncing, paused, and error modes
- **Performance Metrics**: Collection of latency, throughput, success rates, and error rates
- **Conflict Detection**: Identification and tracking of data conflicts between local and remote sources
- **Error Logging**: Comprehensive error tracking with timestamps, operation details, and retry information
- **Historical Analysis**: Maintenance of sync history for trend analysis and performance optimization

The monitoring service maintains several key data structures:
- **SyncQueue**: Tracks pending, processing, and completed operations
- **Conflicts Map**: Stores unresolved data conflicts with resolution status
- **Errors Array**: Maintains recent sync errors for diagnostic purposes
- **Metrics Object**: Aggregates performance statistics over time

The service automatically subscribes to network state changes, pausing monitoring when offline and resuming when connectivity is restored. It also provides a subscription mechanism for UI components to receive real-time updates about sync status, enabling the creation of monitoring dashboards and status indicators.

```mermaid
classDiagram
class SyncStatus {
+isActive : boolean
+mode : 'idle' | 'syncing' | 'paused' | 'error'
+progress : Object
+queue : Object
+conflicts : Object
+lastSync : Date | null
+nextSync : Date | null
+errors : SyncError[]
+performance : Object
}
class SyncConflict {
+id : string
+entityName : string
+entityId : string | number
+conflictType : 'version' | 'concurrent_edit' | 'deleted_locally' | 'deleted_remotely'
+localData : any
+remoteData : any
+timestamp : Date
+resolved : boolean
+resolution? : ConflictResolution
}
class ConflictResolution {
+strategy : 'local_wins' | 'remote_wins' | 'merge' | 'manual'
+resolvedData? : any
+resolvedBy? : string
+resolvedAt : Date
+notes? : string
}
class SyncError {
+id : string
+timestamp : Date
+entityName : string
+entityId? : string | number
+operation : 'create' | 'update' | 'delete' | 'sync'
+error : string
+retryCount : number
+resolved : boolean
}
class SyncMetrics {
+totalOperations : number
+successfulOperations : number
+failedOperations : number
+averageLatency : number
+peakLatency : number
+throughput : number
+errorRate : number
+conflictRate : number
+cacheHitRate : number
}
class DataSyncMonitoringService {
-dataStrategyManager : DataStrategyManager | null
-networkManager : NetworkStateManager
-conflicts : Map<string, SyncConflict>
-errors : SyncError[]
-metrics : SyncMetrics
-syncHistory : Array<Object>
-subscribers : Array<Function>
-monitoringInterval : NodeJS.Timeout | null
+getSyncStatus() : SyncStatus
+recordConflict() : string
+resolveConflict() : Promise<boolean>
+recordError() : void
+subscribe() : Function
+forceSyncAll() : Promise<void>
+destroy() : void
}
DataSyncMonitoringService --> DataStrategyManager : "monitors"
DataSyncMonitoringService --> NetworkStateManager : "subscribes to"
DataSyncMonitoringService --> SyncStatus : "produces"
DataSyncMonitoringService --> SyncConflict : "tracks"
DataSyncMonitoringService --> SyncError : "logs"
DataSyncMonitoringService --> SyncMetrics : "aggregates"
```

**Diagram sources**
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L1-L483)

**Section sources**
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L1-L483)

## Caching and Performance Optimization
The DataStrategyManager implements comprehensive caching policies and performance optimization techniques to ensure responsive application behavior and efficient data access. These optimizations are tailored to each data strategy while maintaining consistency across the system.

### Caching Policies
Each strategy employs different caching approaches:
- **api-first**: Short cache timeout (5 minutes), network-first strategy
- **offline-first**: Long cache timeout (1 hour), cache-first strategy
- **hybrid**: Moderate cache timeout (10 minutes), context-aware strategy
- **mock**: No caching (data is already local)

The system supports multiple cache strategies:
- **cache-first**: Attempt local cache first, then network
- **network-first**: Attempt network first, then cache
- **cache-only**: Use only local cache
- **network-only**: Use only network, bypass cache

### Bandwidth Optimization
The implementation includes several bandwidth optimization techniques:
- **Batched synchronization**: Groups multiple operations into single requests
- **Priority-based queuing**: Processes critical operations first
- **Conditional requests**: Uses ETags and last-modified headers
- **Delta synchronization**: Transfers only changed data when possible

### Data Freshness Guarantees
The system provides configurable data freshness guarantees:
- **Immediate sync**: Changes sync as soon as they occur
- **Batched sync**: Changes sync at configured intervals
- **Manual sync**: Changes sync only on user request

The synchronization queue prioritizes operations based on their priority level (critical, high, normal, low), ensuring that important data changes are processed first. The system also implements exponential backoff for failed sync attempts and automatically resumes synchronization when network connectivity is restored.

```mermaid
flowchart TD
A([Data Operation]) --> B{Operation Type}
B --> |Read| C{Cache Strategy}
B --> |Write/Delete| D[Queue for Sync]
C --> |cache-first| E{Cache Valid?}
C --> |network-first| F{Network Available?}
C --> |cache-only| G[Return Cache]
C --> |network-only| H[Fetch from Network]
E --> |Yes| I[Return Cache]
E --> |No| J[Fetch from Network]
J --> K[Update Cache]
K --> L[Return Data]
F --> |Yes| M[Fetch from Network]
F --> |No| N[Return Cache]
M --> O{Success?}
O --> |Yes| P[Update Cache]
O --> |No| Q[Return Cache if available]
D --> R{Sync Policy}
R --> |immediate| S[Process Immediately]
R --> |batched| T[Add to Batch Queue]
R --> |manual| U[Wait for Manual Trigger]
S --> V[Send to Backend]
T --> W{Batch Full or Interval?}
W --> |Yes| X[Send Batch]
W --> |No| Y[Wait]
V --> Z{Success?}
X --> AA{Success?}
Z --> |Yes| AB[Mark Complete]
Z --> |No| AC{Retry < 3?}
AA --> |Yes| AB
AA --> |No| AC
AC --> |Yes| AD[Retry with Backoff]
AC --> |No| AE[Log Error]
AB --> AF[Update Local Cache]
AF --> AG[Operation Complete]
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)

**Section sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)

## State and Sequence Diagrams
This section provides visual representations of the strategy transitions and data retrieval workflows under different operational scenarios.

### Strategy Transition State Diagram
```mermaid
stateDiagram-v2
[*] --> Initial
Initial --> OfflineFirst : "Configure offline-first"
Initial --> OnlineFirst : "Configure online-first"
Initial --> Hybrid : "Configure hybrid"
Initial --> Mock : "Configure mock/demo"
OfflineFirst --> OnlineFirst : "Update strategy"
OfflineFirst --> Hybrid : "Update strategy"
OfflineFirst --> Mock : "Update strategy"
OnlineFirst --> OfflineFirst : "Update strategy"
OnlineFirst --> Hybrid : "Update strategy"
OnlineFirst --> Mock : "Update strategy"
Hybrid --> OfflineFirst : "Update strategy"
Hybrid --> OnlineFirst : "Update strategy"
Hybrid --> Mock : "Update strategy"
Mock --> OfflineFirst : "Update strategy"
Mock --> OnlineFirst : "Update strategy"
Mock --> Hybrid : "Update strategy"
OfflineFirst --> OfflineFirst : "Network state change"
OnlineFirst --> OnlineFirst : "Network state change"
Hybrid --> Hybrid : "Network state change"
Mock --> Mock : "Network state change"
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)

### Data Retrieval Workflow - Offline-First Strategy
```mermaid
sequenceDiagram
participant UI as "UI Component"
participant DSM as "DataStrategyManager"
participant RxDB as "RxDB (Local)"
participant API as "Backend API"
participant Queue as "Sync Queue"
UI->>DSM : executeOperation(read, student/123)
DSM->>DSM : planExecution()
DSM->>RxDB : executeRxDBRead(student, {id : 123})
RxDB-->>DSM : Return student data
DSM-->>UI : Return data
Note over DSM,RxDB : Read from local cache
UI->>DSM : executeOperation(write, student/123, {name : "John"})
DSM->>DSM : planExecution()
DSM->>RxDB : executeRxDBWrite(student, {id : 123, name : "John"})
RxDB-->>DSM : Return updated data
DSM->>Queue : queueForSync(write, student/123)
Queue-->>DSM : Queued confirmation
DSM-->>UI : Return updated data
Note over DSM,Queue : Update local, queue for sync
alt Network Available
Queue->>DSM : processSyncQueue()
DSM->>API : syncSingleItem(write, student/123)
API-->>DSM : Success
DSM->>Queue : removeSyncItem()
end
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)

### Data Retrieval Workflow - Online-First Strategy
```mermaid
sequenceDiagram
participant UI as "UI Component"
participant DSM as "DataStrategyManager"
participant API as "Backend API"
participant RxDB as "RxDB (Local)"
UI->>DSM : executeOperation(read, student/123)
DSM->>DSM : planExecution()
alt Backend Available
DSM->>API : executeBackendOperation(read, student/123)
API-->>DSM : Return student data
DSM->>RxDB : updateLocalCache(student, data)
RxDB-->>DSM : Cache updated
DSM-->>UI : Return data
else Backend Unavailable
DSM->>RxDB : executeRxDBRead(student, {id : 123})
RxDB-->>DSM : Return cached data
DSM-->>UI : Return data
end
Note over DSM,API : Prefer network, fallback to cache
UI->>DSM : executeOperation(write, student/123, {name : "John"})
DSM->>DSM : planExecution()
alt Backend Available
DSM->>API : executeBackendOperation(write, student/123, {name : "John"})
API-->>DSM : Return updated data
DSM->>RxDB : updateLocalCache(student, data)
RxDB-->>DSM : Cache updated
DSM-->>UI : Return updated data
else Backend Unavailable
DSM->>RxDB : executeRxDBWrite(student, {id : 123, name : "John"})
RxDB-->>DSM : Return updated data
DSM->>DSM : queueForSync(write, student/123)
DSM-->>UI : Return updated data
Note over DSM : Queue for later sync
end
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)

### Data Retrieval Workflow - Hybrid Strategy
```mermaid
sequenceDiagram
participant UI as "UI Component"
participant DSM as "DataStrategyManager"
participant RxDB as "RxDB (Local)"
participant API as "Backend API"
participant Queue as "Sync Queue"
UI->>DSM : executeOperation(read, student/123)
DSM->>DSM : planExecution()
DSM->>RxDB : executeRxDBRead(student, {id : 123})
RxDB-->>DSM : Return student data
alt Backend Available
DSM->>API : executeBackendOperation(read, student/123)
API-->>DSM : Return fresh data
DSM->>RxDB : updateLocalCache(student, freshData)
RxDB-->>DSM : Cache updated
end
DSM-->>UI : Return data
Note over DSM,RxDB : Fast local read, background refresh
UI->>DSM : executeOperation(write, student/123, {name : "John"})
DSM->>DSM : planExecution()
alt Backend Available & Good Connection
DSM->>API : executeBackendOperation(write, student/123, {name : "John"})
API-->>DSM : Return updated data
DSM->>RxDB : updateLocalCache(student, data)
RxDB-->>DSM : Cache updated
DSM-->>UI : Return updated data
else Poor Connection or Offline
DSM->>RxDB : executeRxDBWrite(student, {id : 123, name : "John"})
RxDB-->>DSM : Return updated data
DSM->>Queue : queueForSync(write, student/123)
Queue-->>DSM : Queued confirmation
DSM-->>UI : Return updated data
Note over DSM,Queue : Queue for sync when possible
end
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L1-L574)