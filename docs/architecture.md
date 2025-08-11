# SchoolPilot - Architecture Overview

## 1. Introduction

This document outlines the high-level architecture of SchoolPilot (SMS). SchoolPilot is a frontend-only React application designed to be robust, maintainable, and scalable. It features a mode-based data layer allowing it to operate with mock data for demonstration and development, or with a local RxDB database for persistent storage in a production-like environment.

## 2. Core Technologies

*   **React 18+**: For building the user interface with components.
*   **TypeScript**: For static typing, improving code quality and maintainability.
*   **Tailwind CSS**: For utility-first CSS styling.
*   **React Router DOM v6+**: For client-side routing and navigation.
*   **PouchDB**: Primary database provider for local, in-browser storage with IndexedDB backend. Supports all 88 collections without limitations.
*   **RxDB (Reactive Database)**: Secondary fallback database provider with Dexie.js storage adapter.
*   **RxJS**: Used by RxDB for managing observable data streams.
*   **i18next & react-i18next**: For internationalization (i18n) and multilingual support.
*   **ES Modules & Import Maps**: Leveraged for module management directly in the browser, sourcing dependencies from CDNs like `esm.sh`.

## 3. Application Structure

The application follows a component-based architecture, organized into several key areas:

*   **`src/components`**: Reusable UI components (e.g., `Layout`, `Card`, `Table`, `Modal`).
*   **`src/pages`**: Top-level components representing different views/pages of the application, organized by module (e.g., `administration`, `academics`, `finance`).
*   **`src/contexts`**: React Context API implementations for global state management.
*   **`src/hooks`**: Custom React Hooks that contain the core data logic.
*   **`src/services`**: Low-level service implementations including:
    *   **RxDB Service**: Database operations and schema management
    *   **Sync Services**: DataSyncMonitoringService, DataStrategyManager, NetworkStateManager
    *   **CRUD Services**: UnifiedCRUDService for consistent data operations
    *   **Utility Services**: DataConsistencyService, BackendAPIService
*   **`src/modules`**: A key architectural pattern where data definitions for different parts of the application are self-contained. Each module folder contains:
    *   `data/types.ts`: TypeScript interfaces for the module.
    *   `data/mockData.ts`: Mock data for demo mode.
    *   `data/schema.ts`: RxDB schema definitions.
    *   `data/collections.ts`: RxDB collection configurations.
*   **`src/i18n`**: Contains all configuration and translation files for internationalization.
*   **`src/types.ts`**: A central file that **re-exports** all types from the individual modules, making them easily accessible throughout the app.

## 4. Data Layer Architecture

The application features a sophisticated multi-layered data architecture with offline-first capabilities, intelligent synchronization, and conflict resolution.

### 4.1. Core Data Modes

The data layer operates in multiple modes controlled by the `APP_MODE` setting in `config.ts`:

#### Demo Mode (`APP_MODE = 'demo'`)
*   Uses exclusively `useMockData.ts` for in-memory data operations
*   Data loaded by dynamically importing all `mockData.ts` files from `src/modules/**/data/`
*   CRUD operations modify in-memory state
*   No RxDB code is imported or initialized
*   Data is lost on page refresh

#### Production Mode (`APP_MODE = 'production'`)
*   Utilizes the full sync system with **PouchDB as the primary database provider**
*   Features offline-first capabilities with background synchronization
*   Includes conflict resolution and network state management
*   Data persisted in browser's IndexedDB via PouchDB (supports all 88 collections)
*   **Dynamic Provider Detection**: Automatically detects and uses the best available provider (PouchDB → RxDB → Mock)
*   Graceful fallback chain: PouchDB → RxDB → Mock data if database initialization fails

### 4.2. Database Provider Architecture

The application uses a sophisticated database provider system with dynamic detection and fallback capabilities:

#### DatabaseService & DatabaseProviderFactory
*   **Location**: `src/services/database/databaseService.ts` and `DatabaseProviderFactory.ts`
*   **Strategy**: **PouchDB-first approach** with intelligent fallback
*   **Provider Priority**: PouchDB → RxDB → Mock (in order of preference)
*   **Dynamic Detection**: Automatically detects available providers and selects the best option

#### PouchDB Provider (Primary)
*   **Advantages**: No collection limitations, supports all 88 collections
*   **Storage**: Direct IndexedDB integration
*   **Use Cases**: All collection counts, offline-first applications, simple to moderate complexity queries
*   **Selection Strategy**: Preferred for all scenarios unless specific reactive requirements exist

#### RxDB Provider (Fallback)
*   **Advantages**: Advanced reactive capabilities, observable data streams
*   **Limitations**: Collection count constraints in free version
*   **Use Cases**: High-performance reactive requirements when PouchDB is unavailable
*   **Selection Strategy**: Used only when PouchDB fails or for specific advanced reactive needs

#### Provider Selection Logic
```typescript
// Priority order: PouchDB > RxDB > Mock
const providerPriority: ProviderType[] = ['pouchdb', 'rxdb'];

// PouchDB-first strategy eliminates artificial 16-collection limit
// Uses PouchDB as primary provider for all collections
```

### 4.3. Sync System Architecture

The production mode includes a comprehensive synchronization system with the following components:

#### DataSyncMonitoringService
*   **Location**: `src/services/DataSyncMonitoringService.ts`
*   **Purpose**: Central monitoring and conflict management
*   **Features**: Conflict detection, resolution strategies, sync status tracking, performance metrics

#### DataStrategyManager
*   **Location**: `src/services/DataStrategyManager.ts`
*   **Purpose**: Intelligent routing and execution engine
*   **Strategies**: Offline-first, online-first, hybrid, and demo modes
*   **Features**: Priority-based sync queue, batch processing, retry logic

#### NetworkStateManager
*   **Location**: `src/services/NetworkStateManager.ts`
*   **Purpose**: Real-time network monitoring and backend health checks
*   **Features**: Connection quality assessment, latency tracking, periodic health checks

#### UnifiedCRUDService
*   **Location**: `src/services/UnifiedCRUDService.ts`
*   **Purpose**: Consistent CRUD interface across all data sources
*   **Features**: Intelligent caching, data validation, batch operations

### 4.3. Enhanced AppDataContext

The `AppDataContext.tsx` has been enhanced to support the new sync capabilities:

*   **Sync Status**: Real-time synchronization status and progress
*   **Conflict Resolution**: Access to conflicts and resolution methods
*   **Network State**: Current network connectivity and backend availability
*   **Performance Metrics**: Sync performance and operation statistics
*   **Sync Control**: Manual sync triggers and queue management

### 4.4. Conflict Resolution System

The application includes a sophisticated conflict resolution system:

*   **Conflict Types**: Version conflicts, concurrent edits, deletion conflicts
*   **Resolution Strategies**: Local wins, remote wins, intelligent merge, manual resolution
*   **UI Integration**: Conflict resolution components in `FeatureSettings.tsx` and `OfflineCapability.tsx`
*   **Automated Resolution**: Configurable automatic resolution based on conflict type

## 5. Sync System Workflow

### 5.1. Data Operation Flow

When a component performs a data operation:

1. **Request Initiation**: Component calls UnifiedCRUDService
2. **Strategy Determination**: DataStrategyManager evaluates network state and configuration
3. **Operation Routing**: Based on strategy (offline-first, online-first, hybrid, demo)
4. **Execution**: Operation performed on appropriate data source
5. **Sync Queuing**: If offline or hybrid mode, operation queued for later sync
6. **Conflict Detection**: During sync, conflicts detected and recorded
7. **Resolution**: Conflicts resolved automatically or presented to user

### 5.2. Network State Management

*   **Real-time Monitoring**: Continuous network connectivity assessment
*   **Backend Health Checks**: Periodic API endpoint health verification
*   **Quality Assessment**: Connection quality categorization (excellent, good, poor, offline)
*   **Strategy Adaptation**: Automatic strategy switching based on network conditions

### 5.3. Performance Monitoring

*   **Sync Metrics**: Operation success rates, latency tracking, throughput measurement
*   **Cache Performance**: Hit/miss ratios and cache efficiency metrics
*   **Conflict Analytics**: Conflict frequency and resolution success rates
*   **Error Tracking**: Comprehensive error logging and recovery metrics

## 6. UI and Styling

*   **Tailwind CSS**: Used for all styling.
*   **Reusable UI Components**: Found in `src/components/ui`, these are generic components like `Button`, `Modal`, `Table`, etc.
*   **Layout Component**: `src/components/Layout.tsx` provides the main application shell, including the `Sidebar` and `Header`.

## 7. Internationalization (i18n)

*   The application uses `i18next` for handling translations.
*   Language resources are stored as JSON files in `src/i18n/locales/`.
*   Namespaces are used to organize translations by module (e.g., `academics.json`, `finance.json`).
*   The `useTranslation` hook is used in components to access translated strings.

This architecture aims for a clean separation of concerns, developer-friendliness through modularity, and adaptability for future growth.
