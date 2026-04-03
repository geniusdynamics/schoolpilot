# Data Synchronization Workflow

<cite>
**Referenced Files in This Document**   
- [DatabaseService.ts](file://src/services/database/databaseService.ts#L14-L301)
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L80-L479) - *Updated in recent commit*
- [useDatabaseData.ts](file://src/hooks/useDatabaseData.ts#L86-L1958)
- [ConflictDetectionEngine.ts](file://src/modules/academics/services/ConflictDetectionEngine.ts#L14-L248)
- [ProviderSelector.ts](file://src/services/database/ProviderSelector.ts#L0-L449) - *Updated in recent commit*
</cite>

## Update Summary
**Changes Made**   
- Updated **DataSyncMonitoringService** section to reflect enhanced network state handling and provider fallback mechanisms
- Added new **Provider Selection and Fallback Mechanism** section to document improved provider selection logic
- Updated architecture overview diagram to include provider selection layer
- Enhanced conflict resolution details with new merge strategy implementation
- Added network state change handling details in bidirectional sync workflow

## Table of Contents
1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Data Synchronization Process](#data-synchronization-process)
5. [Conflict Detection and Resolution](#conflict-detection-and-resolution)
6. [Event-Driven Architecture and UI Integration](#event-driven-architecture-and-ui-integration)
7. [Error Handling and Retry Mechanisms](#error-handling-and-retry-mechanisms)
8. [Performance and Consistency Guarantees](#performance-and-consistency-guarantees)
9. [Provider Selection and Fallback Mechanism](#provider-selection-and-fallback-mechanism)

## Introduction
The schoolpilot3 application implements a robust bidirectional data synchronization workflow between local databases (RxDB/SQLite) and remote CouchDB instances via PouchDB. This system ensures data consistency across offline and online environments, supports multiple synchronization strategies, and provides comprehensive monitoring and conflict resolution capabilities. The architecture is designed to handle intermittent connectivity, maintain data integrity, and provide a seamless user experience regardless of network conditions.

## Architecture Overview

```mermaid
graph TB
subgraph "Frontend Application"
UI[User Interface]
Hook[useDatabaseData Hook]
Context[AppDataContext]
end
subgraph "Data Layer"
Strategy[DataStrategyManager]
Sync[DataSyncMonitoringService]
Database[DatabaseService]
ProviderSelector[ProviderSelector]
end
subgraph "Storage"
Local[(Local DB: RxDB/SQLite)]
Remote[(Remote DB: CouchDB)]
end
UI --> Hook
Hook --> Context
Context --> Strategy
Strategy --> Database
Database --> ProviderSelector
ProviderSelector --> Local
ProviderSelector --> Remote
Strategy --> Sync
Local --> Remote
Remote --> Local
style Local fill:#f9f,stroke:#333
style Remote fill:#bbf,stroke:#333
```

**Diagram sources**
- [DatabaseService.ts](file://src/services/database/databaseService.ts#L14-L301)
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L80-L479)
- [ProviderSelector.ts](file://src/services/database/ProviderSelector.ts#L0-L449)

## Core Components

### DatabaseService
The DatabaseService class serves as the central coordinator for database operations, implementing a singleton pattern to ensure consistent access across the application. It dynamically detects and initializes the most appropriate database provider (RxDB or PouchDB) based on environmental capabilities.

```mermaid
classDiagram
class DatabaseService {
-static instance : DatabaseService
-provider : IDatabaseProvider
-factory : DatabaseProviderFactory
-isInitialized : boolean
+initialize(config) : Promise~void~
+getProvider() : IDatabaseProvider
+getCollection~T~(name) : ICollection~T~
+getStatus() : Object
+switchProvider(type, config) : Promise~void~
}
class IDatabaseProvider {
<<interface>>
+initialize(config) : Promise~void~
+createCollection(name, schema) : Promise~void~
+getCollection~T~(name) : ICollection~T~
+getAllCollections() : Map~string, ICollection~any~~
+destroy() : Promise~void~
}
class DatabaseProviderFactory {
+createProvider(config, schema, type?) : Promise~IDatabaseProvider~
}
DatabaseService --> IDatabaseProvider : "uses"
DatabaseProviderFactory --> IDatabaseProvider : "creates"
```

**Diagram sources**
- [DatabaseService.ts](file://src/services/database/databaseService.ts#L14-L301)

**Section sources**
- [DatabaseService.ts](file://src/services/database/databaseService.ts#L14-L301)

### DataStrategyManager
The DataStrategyManager orchestrates data operations according to configurable strategies, determining whether operations should be executed against the backend, local database, or mock data. It manages the synchronization queue and implements retry mechanisms.

```mermaid
classDiagram
class DataStrategyManager {
-strategy : DataStrategy
-networkManager : NetworkStateManager
-backendAPI : BackendAPIService
-rxdbService : any
-syncQueue : SyncQueueItem[]
-isProcessingSync : boolean
+executeOperation~T~(operation, params) : Promise~T~
+queueForSync(operation, params, result) : Promise~void~
+processSyncQueue() : Promise~void~
+getSyncStatus() : Object
+updateStrategy(newStrategy) : void
}
class DataStrategy {
mode : string
syncPolicy : string
syncInterval : number
batchSize : number
}
class SyncQueueItem {
id : string
operation : DataOperation
params : any
result : any
timestamp : Date
retryCount : number
status : string
priority : string
}
DataStrategyManager --> DataStrategy : "uses"
DataStrategyManager --> SyncQueueItem : "contains"
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)

**Section sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)

### DataSyncMonitoringService
The DataSyncMonitoringService provides comprehensive monitoring of synchronization operations, tracking metrics such as latency, throughput, error rates, and conflict resolution. It maintains a history of sync operations and notifies subscribers of status changes. The service now includes enhanced network state change handling and automatic sync resumption.

```mermaid
classDiagram
class DataSyncMonitoringService {
-dataStrategyManager : DataStrategyManager
-networkManager : NetworkStateManager
-conflicts : Map~string, SyncConflict~
-errors : SyncError[]
-metrics : SyncMetrics
-syncHistory : {timestamp, duration, success}[]
-subscribers : (status) => void[]
+getSyncStatus() : SyncStatus
+recordConflict(entity, id, type, local, remote) : string
+resolveConflict(id, resolution) : Promise~boolean~
+recordError(operation, entityId, error) : void
+subscribe(callback) : () => void
+forceSyncAll() : Promise~void~
+updateDataStrategyManager(dataStrategyManager) : void
+destroy() : void
}
class SyncConflict {
id : string
entityName : string
entityId : string
conflictType : string
localData : any
remoteData : any
timestamp : Date
resolved : boolean
resolution : ConflictResolution
}
class SyncError {
id : string
timestamp : Date
entityName : string
entityId : string
operation : string
error : string
retryCount : number
resolved : boolean
}
class SyncMetrics {
totalOperations : number
successfulOperations : number
failedOperations : number
averageLatency : number
peakLatency : number
throughput : number
errorRate : number
conflictRate : number
cacheHitRate : number
}
DataSyncMonitoringService --> SyncConflict : "manages"
DataSyncMonitoringService --> SyncError : "manages"
DataSyncMonitoringService --> SyncMetrics : "tracks"
```

**Section sources**   
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L80-L479) - *Updated to include network state change handling and provider management*

## Data Synchronization Process

### Bidirectional Sync Workflow
The synchronization process follows a sophisticated bidirectional pattern that ensures data consistency between local and remote databases. The workflow adapts to network conditions and user requirements through configurable strategies. The system now includes automatic sync resumption when network connectivity is restored.

```mermaid
sequenceDiagram
participant UI as "User Interface"
participant Hook as "useDatabaseData"
participant Strategy as "DataStrategyManager"
participant LocalDB as "Local Database"
participant RemoteDB as "Remote CouchDB"
participant Network as "NetworkStateManager"
UI->>Hook : Initiate data operation
Hook->>Strategy : executeOperation()
alt Online & Backend Available
Strategy->>RemoteDB : Execute operation
RemoteDB-->>Strategy : Return result
Strategy->>LocalDB : Update local cache
LocalDB-->>Strategy : Confirmation
Strategy-->>Hook : Return data
else Offline or Poor Connection
Strategy->>LocalDB : Execute operation locally
LocalDB-->>Strategy : Return result
Strategy->>Strategy : queueForSync()
Strategy-->>Hook : Return data
Note over Strategy : Operation queued for sync when online
end
Hook-->>UI : Update UI with data
Network->>DataSyncMonitoringService : Network state change
DataSyncMonitoringService->>DataStrategyManager : resumeSync() when online
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)
- [useDatabaseData.ts](file://src/hooks/useDatabaseData.ts#L86-L1958)
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L80-L479)

**Section sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)
- [useDatabaseData.ts](file://src/hooks/useDatabaseData.ts#L86-L1958)
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L201-L254)

### Batch Processing and Queue Management
The system implements intelligent batch processing to optimize network usage and improve performance. Operations are queued and processed according to priority and network conditions.

```mermaid
flowchart TD
A[Data Operation] --> B{Network Available?}
B --> |Yes| C[Execute Immediately]
B --> |No| D[Add to Sync Queue]
D --> E[Sort by Priority]
E --> F[Store in Persistent Queue]
F --> G{Network Restored?}
G --> |Yes| H[Process Queue in Batches]
G --> |No| I[Wait for Connection]
H --> J[Apply Exponential Backoff on Failure]
J --> K{Max Retries Exceeded?}
K --> |No| L[Requeue for Retry]
K --> |Yes| M[Mark as Failed]
L --> H
M --> N[Notify User]
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)

**Section sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)

## Conflict Detection and Resolution

### Conflict Detection Algorithm
The system employs a comprehensive conflict detection mechanism that identifies version mismatches between local and remote data. The ConflictDetectionEngine analyzes data for inconsistencies and records conflicts for resolution.

```mermaid
sequenceDiagram
participant Local as "Local Data"
participant Remote as "Remote Data"
participant Engine as "ConflictDetectionEngine"
participant Monitor as "DataSyncMonitoringService"
Local->>Engine : Detect changes
Remote->>Engine : Receive remote updates
Engine->>Engine : Compare document revisions
alt Version Mismatch Detected
Engine->>Monitor : recordConflict()
Monitor->>Monitor : Add to conflicts map
Monitor-->>UI : Notify of conflict
else No Conflict
Engine->>Local : Apply update
Engine->>Remote : Confirm sync
end
```

**Diagram sources**
- [ConflictDetectionEngine.ts](file://src/modules/academics/services/ConflictDetectionEngine.ts#L14-L248)
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L80-L479)

**Section sources**
- [ConflictDetectionEngine.ts](file://src/modules/academics/services/ConflictDetectionEngine.ts#L14-L248)

### Conflict Resolution Strategies
The system supports multiple conflict resolution strategies to handle data inconsistencies according to business requirements and user preferences. The merge strategy now includes timestamp preservation logic.

```mermaid
flowchart TD
A[Conflict Detected] --> B{Resolution Strategy}
B --> C[Client-Wins]
B --> D[Server-Wins]
B --> E[Manual Merge]
B --> F[Custom Resolution]
C --> G[Apply Local Data]
D --> H[Apply Remote Data]
E --> I[Present Merge Interface]
I --> J[User Resolves Conflict]
J --> K[Apply Resolved Data]
F --> L[Execute Custom Logic]
G --> M[Update Both Databases]
H --> M
K --> M
L --> M
M --> N[Mark Conflict Resolved]
N --> O[Update Sync Status]
```

**Section sources**
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L292-L339)
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L251-L296)

## Event-Driven Architecture and UI Integration

### useDatabaseData Hook
The useDatabaseData hook serves as the primary interface between the application's UI components and the data synchronization system. It provides a reactive data layer that automatically updates when data changes.

```mermaid
classDiagram
class useDatabaseData {
+loading : AppDataLoadingStates
+initializationError : Error
+isUsingRxDBDummyData : boolean
+data : AppDataContextType
+rbac : RBACData
+getStudentDetailsById(id) : Promise~StudentDetailProfile~
+getStudentFinancialDetailsById(id) : Promise~any~
+CRUD Operations : add, update, delete methods
}
class AppDataContextType {
schoolDetails : SchoolDetail
students : Student[]
staff : StaffMember[]
classes : Class[]
subjects : Subject[]
examSessions : ExamSession[]
gradingSchemes : GradingScheme[]
// Additional data properties...
}
useDatabaseData --> AppDataContextType : "returns"
```

**Diagram sources**
- [useDatabaseData.ts](file://src/hooks/useDatabaseData.ts#L86-L1958)

**Section sources**
- [useDatabaseData.ts](file://src/hooks/useDatabaseData.ts#L86-L1958)

### Data Change Notification Flow
The event-driven architecture ensures that UI components are promptly notified of data changes, providing a responsive user experience.

```mermaid
sequenceDiagram
participant DB as "Database"
participant Strategy as "DataStrategyManager"
participant Context as "AppDataContext"
participant Hook as "useDatabaseData"
participant UI as "UI Component"
DB->>Strategy : Data change detected
Strategy->>Context : Emit change event
Context->>Hook : Update state
Hook->>UI : Trigger re-render
UI->>UI : Display updated data
Note over DB,UI : Real-time updates without page refresh
```

**Diagram sources**
- [useDatabaseData.ts](file://src/hooks/useDatabaseData.ts#L86-L1958)
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)

## Error Handling and Retry Mechanisms

### Retry Mechanisms and Exponential Backoff
The system implements robust error handling with exponential backoff strategies to handle transient failures and network issues.

```mermaid
flowchart TD
A[Sync Operation] --> B{Success?}
B --> |Yes| C[Mark as Completed]
B --> |No| D[Increment Retry Count]
D --> E{Retry Count < Max?}
E --> |Yes| F[Calculate Backoff Delay]
F --> G[Schedule Retry]
G --> H[Exponential Backoff: 1s, 2s, 4s, 8s...]
H --> A
E --> |No| I[Mark as Failed]
I --> J[Notify User]
J --> K[Manual Retry Option]
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)

**Section sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)

### Offline Queue Management
The system maintains a persistent queue of operations when offline, ensuring data integrity and synchronization when connectivity is restored.

```mermaid
classDiagram
class SyncQueueItem {
id : string
operation : DataOperation
params : any
result : any
timestamp : Date
retryCount : number
status : "pending" | "processing" | "completed" | "error"
priority : "critical" | "high" | "normal" | "low"
}
class DataStrategyManager {
-syncQueue : SyncQueueItem[]
-isProcessingSync : boolean
+queueForSync(item) : void
+processSyncQueue() : Promise~void~
+findSyncInsertIndex(priority) : number
}
DataStrategyManager --> SyncQueueItem : "manages"
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)

## Performance and Consistency Guarantees

### Data Consistency and Eventual Consistency
The system balances strong consistency requirements with the realities of distributed systems through an eventual consistency model.

```mermaid
flowchart TD
A[Local Operation] --> B[Immediate Local Update]
B --> C[Queue for Remote Sync]
C --> D{Network Available?}
D --> |Yes| E[Sync to Remote]
D --> |No| F[Store in Queue]
F --> G[Wait for Network]
G --> E
E --> H[Receive Remote Acknowledgment]
H --> I[Confirm Synchronization]
I --> J[Eventual Consistency Achieved]
style B fill:#d9ead3,stroke:#3c763d
style E fill:#d9ead3,stroke:#3c763d
style J fill:#d9ead3,stroke:#3c763d
```

**Diagram sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)

**Section sources**
- [DataStrategyManager.ts](file://src/services/DataStrategyManager.ts#L43-L573)

### Performance Monitoring and Metrics
The DataSyncMonitoringService collects comprehensive metrics to ensure optimal performance and identify potential issues.

```mermaid
flowchart TD
A[Sync Operation] --> B[Record Metrics]
B --> C[Update Metrics Object]
C --> D[Add to Sync History]
D --> E[Calculate Aggregates]
E --> F[Update SyncStatus]
F --> G[Broadcast to Subscribers]
G --> H[UI Components]
H --> I[Display Sync Status]
subgraph "Metrics Collected"
M1[Total Operations]
M2[Successful Operations]
M3[Failed Operations]
M4[Average Latency]
M5[Peak Latency]
M6[Throughput]
M7[Error Rate]
M8[Conflict Rate]
M9[Cache Hit Rate]
end
C --> M1
C --> M2
C --> M3
C --> M4
C --> M5
C --> M6
C --> M7
C --> M8
C --> M9
```

**Diagram sources**
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L80-L479)

**Section sources**
- [DataSyncMonitoringService.ts](file://src/services/DataSyncMonitoringService.ts#L80-L479)

## Provider Selection and Fallback Mechanism

The system implements an enhanced provider selection mechanism that ensures database availability across different environments. The ProviderSelector dynamically chooses the most appropriate database provider based on environmental capabilities and requirements.

```mermaid
flowchart TD
A[Initialize Database] --> B{Check Requirements}
B --> C[Select Provider Type]
C --> D{Provider Available?}
D --> |Yes| E[Initialize Selected Provider]
D --> |No| F[Fall Back to PouchDB]
F --> G{PouchDB Available?}
G --> |Yes| H[Initialize PouchDB]
G --> |No| I[Throw Error]
H --> J[Database Ready]
E --> J
J --> K[Monitor Provider Health]
K --> L{Provider Fails?}
L --> |Yes| M[Switch to Fallback]
M --> C
L --> |No| N[Continue Operation]
```

**Section sources**
- [ProviderSelector.ts](file://src/services/database/ProviderSelector.ts#L0-L449)
- [DatabaseProviderFactory.ts](file://src/services/database/DatabaseProviderFactory.ts#L291-L321)