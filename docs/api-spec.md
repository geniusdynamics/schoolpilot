# SchoolPilot - "API" Specification (AppDataContext)

## 1. Introduction

Since this is a frontend-only application, the term "API" refers to the data and functions exposed by the `AppDataContext`. Components interact with the application's data layer exclusively through the `useAppData()` hook, which provides access to the context value conforming to `AppDataContextType`.

This document outlines the structure of `AppDataContextType`, including available data entities and CRUD (Create, Read, Update, Delete) operations.

## 2. Consuming the API

To access data and actions, components should use the `useAppData()` hook:

```typescript
import { useAppData } from '../contexts/AppDataContext';

const MyComponent: React.FC = () => {
  const { students, addStudent, loading } = useAppData();

  // ... use students data and addStudent function
};
```

## 3. Core Context Properties

The `AppDataContextType` provides the following top-level properties:

*   **Data Entities**: Arrays of data for each entity type (e.g., `students: Student[]`, `staff: Staff[]`). See `types.ts` for the full list and individual type definitions.
*   **`loading: AppDataLoadingStates`**: An object indicating the loading state for various data entities. `loading.all` is true if any initial core data is loading.
*   **`rawInitialData: RawInitialData`**: Contains the aggregated initial mock data structures from all modules. Useful for populating forms or understanding data shapes.
*   **`initializationError?: Error | null`**: If in "production" mode and RxDB fails to initialize, this will contain the error object. Otherwise, it's `null`.
*   **`isRxDBModeActive: boolean`**: True if `APP_MODE` is 'production' and RxDB has initialized successfully. False otherwise (i.e., using mock data).
*   **`isUsingRxDBDummyData: boolean | null`**:
    *   `true`: RxDB is active and has been seeded with dummy data.
    *   `false`: RxDB is active and is using live data (or has been cleared of dummy data).
    *   `null`: RxDB is not active or status is unknown.
*   **`triggerSeedRxDB?: () => Promise<void>`**: (Production Mode Only) A function to seed the RxDB database with mock data.
*   **`triggerClearRxDB?: () => Promise<void>`**: (Production Mode Only) A function to clear all data from the RxDB database.
*   **CRUD Functions**: A comprehensive set of asynchronous functions for creating, reading (getting one or listing), updating, and deleting entities.

## 4. Data Entities

The context provides access to all application data entities. The TypeScript interfaces for these entities are defined within their respective modules (e.g., `src/modules/academics/data/types.ts`) and then **re-exported from the central `src/types.ts` file** for easy access.

The `AppDataContextType` interface (defined in `src/types.ts`) aggregates all these entities. Key examples include:

*   `schoolDetails: SchoolDetails | null`
*   `roles: Role[]`
*   `users: User[]`
*   `students: Student[]`
*   `staff: Staff[]`
*   `classes: Class[]`
*   **Academics Module**: `subjects`, `examSessions`, etc.
*   **Finance Module**: `feeTemplates`, `chartOfAccounts`, etc.
*   **And all other modules...**

Refer to `AppDataContextType` in `src/types.ts` for the complete and authoritative list.

## 5. CRUD Functions (General Pattern)

For most entities `<Entity>`, the following CRUD functions are generally available. All functions are asynchronous (`Promise`). Input types usually omit `id`, `created_at`, `updated_at`, and resolved/denormalized fields (e.g., `department_name`).

*   `add<Entity>(data: Omit<EntityType, ...>) : Promise<EntityType>`
*   `update<Entity>(updatedData: EntityType) : Promise<EntityType>`
*   `delete<Entity>(entityId: string | number) : Promise<void>`
*   **List/Get All**: Access directly via the entity array (e.g., `students`). These arrays are reactive in RxDB mode.
*   **Get One by ID**: Specific getter functions like `getStudentDetailsById(studentId: string): Promise<StudentDetailProfile | null>` are provided for more complex data retrieval or when specific details are needed. For simpler cases, components can filter the list arrays.

**Note:** The exact signatures and availability of all functions should be referenced directly from `AppDataContextType` in `src/types.ts` as it is the single source of truth for the context's contract.

## 6. Loading States

The `loading` object provides boolean flags for different data slices:

```typescript
interface AppDataLoadingStates {
  all: boolean; // True if any core initial data is loading
  schoolDetails: boolean;
  roles: boolean;
  // ... and so on for all entities
}
```

Components should check these flags to display loading indicators appropriately. `loading.all` is a general flag for the initial load of core data.

## 7. Error Handling

*   `initializationError`: If `APP_MODE` is 'production', components should check this. If it's set, the app has fallen back to mock data, and a notification should be shown to the user.
*   Individual CRUD operations return Promises. Components should use `.then().catch()` or `async/await` with `try/catch` blocks to handle potential errors from these operations (e.g., validation errors, database errors in production).

This "API" provided by `AppDataContext` aims to give a consistent and comprehensive way for UI components to interact with application data, regardless of whether it's coming from the mock service or RxDB.
