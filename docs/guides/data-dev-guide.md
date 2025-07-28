# Data Layer Development Guide

## 1. Introduction

This guide provides an overview of the data layer in the School Management System. Understanding this layer is crucial for fetching, displaying, and manipulating data throughout the application.

The application employs a flexible data layer strategy that supports two modes:
*   **Demo Mode**: Uses in-memory mock data. Ideal for UI development, testing, and running in environments without persistent storage capabilities.
*   **Production Mode**: Uses RxDB (a reactive, local NoSQL database) for persistent client-side storage.

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
    *   If `APP_MODE` is `'production'`, it attempts to dynamically import and use the `useRxDBData` hook. If RxDB initialization fails, it gracefully falls back to `useMockData`.
*   **Consuming Data**: UI components use the `useAppData()` custom hook to access data and action functions provided by the context.

### 2.5. Data Hooks

*   **`src/hooks/useMockData.ts`**:
    *   Implements `AppDataContextType` using in-memory data.
    *   Dynamically loads all `mockData.ts` files from the modules to create its initial state.
    *   See `mock-data-dev-guide.md` for details.
*   **`src/hooks/useRxDBData.ts`**:
    *   Implements `AppDataContextType` using RxDB.
    *   See `rxdb-data-dev-guide.md` for details.

### 2.6. `services/rxdbService.ts` (Production Mode Only)

*   Aggregates schemas from all modules to initialize the database.
*   See `rxdb-data-dev-guide.md` for details.

## 3. Workflow for Adding/Modifying Data Entities

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
5.  **Integrate Schema into RxDB**: In `src/services/rxdbService.ts`, import the new module's `collections` object and add it to the master `collectionsDefinition`.
6.  **Implement Data Logic**:
    *   **Mock**: `useMockData.ts` will automatically load the new mock data. Implement any new specific CRUD functions if needed.
    *   **RxDB**: In `useRxDBData.ts`, add a `useState` for the data, set up a subscription, and implement the CRUD functions to interact with the database.
7.  **Update `AppDataContext.tsx`**:
    *   The context should automatically pick up the new data and functions if the hooks correctly implement the updated `AppDataContextType`.

## 4. Data Reactivity

*   **Demo Mode**: Reactivity is handled by React's `useState`.
*   **Production Mode**: RxDB provides reactivity. `useRxDBData.ts` subscribes to RxDB queries (`.$`), which automatically update React state when data changes in IndexedDB.

This modular data layer design provides a flexible and maintainable foundation for development.