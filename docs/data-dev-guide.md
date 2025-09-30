# Data Layer Development Guide

## 1. Introduction

This guide provides an overview of the data layer in SchoolPilot. Understanding this layer is crucial for fetching, displaying, and manipulating data throughout the application.

The application employs a sophisticated data layer strategy that supports multiple modes with advanced synchronization capabilities:
*   **Demo Mode**: Uses in-memory mock data. Ideal for UI development, testing, and running in environments without persistent storage capabilities.
*   **Production Mode**: Uses **PouchDB as the primary database provider** with a comprehensive sync system including offline-first capabilities, conflict resolution, and intelligent data strategy management. Features dynamic provider detection with fallback to RxDB if needed.

## 2. Core Components of the Data Layer

### 2.1. Modular Data Definitions (`src/modules/`)

This is the primary location for defining data structures. Each functional area of the application (e.g., academics, finance) has its own module folder. Inside `src/modules/<module_name>/data/`, you will find:
*   **`types.ts`**: Defines TypeScript interfaces and enums for this specific module.
*   **`mockData.ts`**: Provides the initial mock data for the module's entities.
*   **`schema.ts`**: Contains the RxDB JSON schema definitions for the module's entities.
*   **`collections.ts`**: Exports the collection configurations for RxDB.

### 2.2. `types.ts` (Root) - The Central Re-Export Hub

*   Located at `src/types.ts`.
*   This file **does not define** new types. Its sole purpose is to **re-export all types** from the individual modules (`src/modules/**/data/types.ts`).
*   It also defines the central `AppDataContextType`, which aggregates all data and functions provided to the application.
*   **Rule**: To add a new entity, define its type in a module, then re-export it from here.

### 2.3. `config.ts` - Mode Configuration

*   Located at `src/config.ts`.
*   The `APP_MODE: 'demo' | 'production'` constant is critical. It determines which data source implementation is used.
*   Other database-related constants like `RXDB_DB_NAME` are also defined here.

### 2.4. `AppDataContext.tsx` - The Data Hub

*   Located at `src/contexts/AppDataContext.tsx`.
*   This React Context provider is the central point for accessing and manipulating application data.
*   It abstracts the underlying data source (mock or RxDB) from the UI components.
*   **Dynamic Data Source Switching**:
    *   If `APP_MODE` is `'demo'`, it exclusively uses the `useMockData` hook.
    *   If `APP_MODE` is `'production'`, it uses the **DatabaseService with PouchDB-first strategy**. The system automatically detects and uses the best available provider (PouchDB → RxDB → Mock) with graceful fallback if database initialization fails.
*   **Consuming Data**: UI components use the `useAppData()` custom hook to access data and action functions provided by the context.

### 2.5. Data Hooks

#### Legacy Data Hooks
*   **`src/hooks/useMockData.ts`** (Legacy):
    *   Original implementation using centralized mock data.
    *   See `mock-data-dev-guide.md` for details.
*   **`src/hooks/useRxDBData.ts`**:
    *   Implements `AppDataContextType` using RxDB.
    *   See `rxdb-data-dev-guide.md` for details.

#### Modern Modular Data Generator System
*   **`src/hooks/useModularMockData.ts`** (Current):
    *   **Purpose**: Aggregates data from module-specific data hooks
    *   **Architecture**: Modular approach where each module provides its own data hooks
    *   **Live Data Integration**: Uses actual module hooks instead of static mock data
    *   **Fallback System**: Graceful fallback to `rawInitialData` for modules not yet integrated
    *   **CRUD Operations**: Full create, read, update, delete operations per module

#### Module-Specific Data Hooks
Each module now provides dedicated data hooks in `src/modules/{module}/data/`:

**Finance Module** (Fully Integrated):
*   `useFeeTemplateData.ts` - Fee template management with live data
*   `useFeeTemplateItemData.ts` - Fee template items with live data
*   `useBankData.ts` - Bank account management
*   `useChartOfAccountData.ts` - Chart of accounts

**Academics Module** (Fully Integrated):
*   `useAcademicYearData.ts` - Academic year management
*   `useClassSubjectAllocationData.ts` - Class-subject allocations
*   `useTimetableEntryData.ts` - Timetable management
*   `useEducationSystemData.ts` - Education system configuration

**Administration Module** (Partially Integrated):
*   Various hooks for user management and system configuration

#### Data Loading Context
Data generators are materialized through this flow:
1. **Authentication**: After successful login via `AuthContext`
2. **App Initialization**: `App.tsx` orchestrates the main application flow
3. **Data Provider Loading**: `DataProviderWrapper` conditionally loads `AppDataProvider`
4. **Module Hook Execution**: `useModularMockData` calls all module-specific hooks
5. **Context Propagation**: Data becomes available through `AppDataContext`

### 2.6. Database Provider System (Production Mode)

The production mode uses a sophisticated database provider system with PouchDB as the primary provider:

#### DatabaseService (`src/services/database/databaseService.ts`)
*   **Purpose**: Dynamic database service that automatically detects and uses the best available provider
*   **Strategy**: **PouchDB-first approach** - tries PouchDB first, falls back to RxDB if unavailable
*   **Features**: Provider availability checking, automatic fallback, collection creation from RxDB definitions
*   **Initialization**: `await databaseService.initialize(config)` with automatic provider detection

#### DatabaseProviderFactory (`src/services/database/DatabaseProviderFactory.ts`)
*   **Purpose**: Factory for creating database providers with intelligent selection strategy
*   **Default Strategy**: **PouchDB-first** - eliminates artificial 16-collection limit
*   **Provider Selection Logic**:
    ```typescript
    // PouchDB is preferred for:
    // - All collection counts (no artificial limits)
    // - Offline-first applications  
    // - Simple to moderate complexity queries
    // - Better IndexedDB integration
    ```
*   **Query Builder**: Enhanced query builder supporting both PouchDB and RxDB query formats

#### Collection Support
*   **PouchDB**: Supports all 88 collections without limitations
*   **RxDB**: Fallback option with potential collection constraints
*   **Schema Compatibility**: Uses RxDB schema definitions for both providers
*   **Migration**: Seamless migration between providers when needed

### 2.7. `services/rxdbService.ts` (Legacy/Fallback)

*   Aggregates schemas from all modules for RxDB initialization when used as fallback provider.
*   See `rxdb-data-dev-guide.md` for details.

### 2.8. Sync System Services (Production Mode)

The production mode includes a comprehensive synchronization system with the following services:

#### DataSyncMonitoringService (`src/services/DataSyncMonitoringService.ts`)
*   **Purpose**: Central monitoring and conflict management service
*   **Key Features**:
    *   Conflict detection and recording
    *   Multiple resolution strategies (local wins, remote wins, merge, manual)
    *   Sync status tracking and performance metrics
    *   Error management and retry logic
*   **Integration**: Works with DataStrategyManager to apply conflict resolutions

#### DataStrategyManager (`src/services/DataStrategyManager.ts`)
*   **Purpose**: Intelligent routing and execution engine for data operations
*   **Data Strategies**:
    *   **Offline-First**: Prioritizes local RxDB operations with background sync
    *   **Online-First**: Attempts backend operations first, falls back to local
    *   **Hybrid**: Intelligent routing based on network conditions and operation type
    *   **Demo**: Uses mock data exclusively
*   **Key Features**:
    *   Priority-based sync queue management
    *   Batch processing with configurable sizes
    *   Automatic retry with exponential backoff
    *   Persistent sync queue in RxDB

#### NetworkStateManager (`src/services/NetworkStateManager.ts`)
*   **Purpose**: Real-time network monitoring and backend health assessment
*   **Key Features**:
    *   Continuous connectivity monitoring
    *   Periodic backend health checks (30-second intervals)
    *   Latency measurement and connection quality assessment
    *   Network state broadcasting to subscribers
*   **Connection Quality Levels**: Excellent (<100ms), Good (<300ms), Poor (>300ms), Offline

#### UnifiedCRUDService (`src/services/UnifiedCRUDService.ts`)
*   **Purpose**: Provides consistent CRUD interface across all data sources
*   **Key Features**:
    *   Multi-source support (mock, RxDB, backend)
    *   TTL-based intelligent caching
    *   Data validation integration
    *   Batch operation support
    *   Detailed operation result metadata

### 2.9. Enhanced AppDataContext

The `AppDataContext.tsx` has been enhanced to expose sync capabilities:
*   **Sync Status**: Real-time synchronization status and progress
*   **Conflict Resolution**: Access to conflicts and resolution methods
*   **Network State**: Current connectivity and backend availability
*   **Performance Metrics**: Sync performance and operation statistics
*   **Sync Control**: Manual sync triggers and queue management

## 3. Workflow for Adding/Modifying Data Entities

### 3.1. Modern Approach: Modular Data Generator System

#### 3.1.1. Define Types
1.  **Add to `src/types/index.ts`**:
    *   Define the TypeScript interface for your entity.
    *   Example: `Student`, `Teacher`, `Class`, etc.

#### 3.1.2. Update `AppDataContextType`
1.  **Edit `src/contexts/AppDataContext.tsx`**:
    *   Add your entity array to the context type.
    *   Add CRUD functions for your entity.
    *   Example: `students: Student[]`, `addStudent`, `updateStudent`, `deleteStudent`.

#### 3.1.3. Create Module Data Hook
1.  **Create `src/modules/{module}/data/use{Entity}Data.ts`**:
    *   Implement a dedicated hook for your entity
    *   Include initial mock data generation
    *   Implement full CRUD operations
    *   Follow the pattern from existing hooks like `useFeeTemplateData.ts`

#### 3.1.4. Export from Module Data Index
1.  **Update `src/modules/{module}/data/index.ts`**:
    *   Export your new data hook
    *   Ensure it's available for import

#### 3.1.5. Integrate with Modular Data System
1.  **Update `src/hooks/useModularMockData.ts`**:
    *   Import your new data hook
    *   Add hook execution in the appropriate module section
    *   Map the hook's data and functions to the context
    *   Move entity from fallback section to live data section

#### 3.1.6. Test Integration
1.  **Verify data loading**:
    *   Check that data appears in components
    *   Test CRUD operations
    *   Ensure no console errors

### 3.2. Legacy Approach (Deprecated)

1.  **Define/Update Type**:
    *   Find the appropriate module in `src/modules/` or create a new one.
    *   Add or modify the entity's interface/enum in the module's `data/types.ts` file.
2.  **Update Central `types.ts`**:
    *   Re-export your new type from `src/types.ts`.
    *   Add the new entity array (e.g., `newEntities: NewEntityType[]`) and CRUD function signatures to `AppDataContextType`.
3.  **Create Mock Data**: Add initial data to the module's `data/mockData.ts` file.
4.  **Define RxDB Schema**:
    *   Add the schema to the module's `data/schema.ts` file.
    *   Export the collection configuration from the module's `data/collections.ts` file.
5.  **Integrate Schema into Database System**: 
    *   Add the new module's `collections` object to the master `collectionsDefinition` in `src/services/rxdbService.ts`
    *   The **DatabaseService** will automatically create collections for both PouchDB and RxDB providers using the same schema definitions
6.  **Implement Data Logic**:
    *   **Mock**: `useMockData.ts` will automatically load the new mock data. Implement any new specific CRUD functions if needed.
    *   **Production**: The **DatabaseService with PouchDB-first strategy** will handle data operations automatically. The UnifiedCRUDService provides consistent interface across all providers.
7.  **Update `AppDataContext.tsx`**:
    *   The context should automatically pick up the new data and functions if the hooks correctly implement the updated `AppDataContextType`.

## 4. Working with the Sync System

### 4.1. Accessing Sync Capabilities

Components can access sync functionality through the enhanced `useAppData()` hook:

```typescript
const {
  // Standard data access
  students, teachers, courses,
  
  // Sync system capabilities
  syncStatus,
  networkState,
  conflicts,
  resolveConflict,
  resolveAllConflicts,
  forceSyncAll,
  clearSyncQueue,
  syncMetrics
} = useAppData();
```

### 4.2. Monitoring Sync Status

```typescript
// Check if sync is active
const isSyncing = syncStatus.mode === 'syncing';

// Monitor sync progress
const progress = syncStatus.progress.percentage;

// Check for conflicts
const hasConflicts = conflicts.length > 0;

// Monitor network state
const isOnline = networkState.isOnline;
const connectionQuality = networkState.connectionQuality;
```

### 4.3. Handling Conflicts

```typescript
// Resolve individual conflict
const handleResolveConflict = async (conflictId: string) => {
  await resolveConflict(conflictId, 'merge'); // or 'local_wins', 'remote_wins', 'manual'
};

// Resolve all conflicts with same strategy
const handleResolveAllConflicts = async () => {
  await resolveAllConflicts('remote_wins');
};
```

### 4.4. Manual Sync Control

```typescript
// Force sync all pending operations
const handleForceSync = async () => {
  await forceSyncAll();
};

// Clear sync queue (use with caution)
const handleClearQueue = () => {
  clearSyncQueue();
};
```

### 4.5. Performance Monitoring

```typescript
// Access sync metrics
const {
  totalOperations,
  successfulOperations,
  averageLatency,
  throughput,
  errorRate,
  conflictRate,
  cacheHitRate
} = syncMetrics;
```

## 5. Data Reactivity

*   **Demo Mode**: Reactivity is handled by React's `useState`.
*   **Production Mode**: 
    *   RxDB provides core reactivity through subscriptions (`.$`)
    *   Sync system adds real-time status updates
    *   Network state changes trigger automatic strategy adjustments
    *   Conflict resolution updates are broadcast to all subscribers

## 6. Development Best Practices

### 6.1. Sync Strategy Selection

*   **Offline-First**: Best for mobile apps and unreliable connections
*   **Online-First**: Suitable for desktop apps with stable internet
*   **Hybrid**: Recommended for most applications, adapts to conditions
*   **Demo**: Use only for demonstrations and testing

### 6.2. Conflict Prevention

*   Implement optimistic locking where appropriate
*   Use timestamps for conflict detection
*   Design UI to minimize concurrent editing scenarios
*   Provide clear feedback about sync status to users

### 6.3. Performance Optimization

*   Configure appropriate batch sizes for sync operations
*   Use caching effectively to reduce backend calls
*   Monitor sync metrics to identify bottlenecks
*   Implement proper error handling and retry logic

This enhanced data layer design provides a robust, scalable foundation for offline-first applications with sophisticated synchronization capabilities.
