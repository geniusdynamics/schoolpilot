# RxDB Data Layer Development Guide

## 1. Introduction

This guide is for developers working with the RxDB data layer in the School Management System. RxDB is used in "production" mode (`APP_MODE = 'production'`) to provide persistent, reactive, client-side storage.

**Key Files:**

*   **`src/modules/**/data/schema.ts`**: Each module defines its own RxDB schemas.
*   **`src/modules/**/data/collections.ts`**: Each module exports its collection configuration.
*   **`src/services/rxdbService.ts`**: Handles database schema aggregation, initialization, and core database utilities (seeding, clearing).
*   **`src/hooks/useRxDBData.ts`**: Provides the React hook that interacts with `rxdbService`, manages data subscriptions, and implements CRUD operations against RxDB.
*   **`src/contexts/AppDataContext.tsx`**: Dynamically loads and uses `useRxDBData` when in production mode.
*   **`src/types.ts`**: Contains re-exported TypeScript interfaces for all data entities, which are used as the basis for RxDB schemas.

## 2. `rxdbService.ts` - Database Core

### 2.1. Database Initialization (`initializeDatabaseInternal` & `getDatabase`)

*   `createRxDatabase` is used to set up the database instance.
*   **Storage Adapter**: `getRxStorageDexie()` is used, meaning Dexie.js (and thus IndexedDB) is the underlying storage.
*   **Plugins**: Essential RxDB plugins are added (`RxDBMigrationPlugin`, `RxDBUpdatePlugin`, etc.).
*   **Collections**: All application collections are dynamically aggregated from all modules and added to the database using `db.addCollections(collectionsDefinition)`.

### 2.2. Modular Schema Definition

*   **Module-level Schemas**: Schemas are **not** defined centrally. Each module is responsible for its own schemas. Inside `src/modules/<module_name>/data/`, you will find:
    *   `schema.ts`: Defines the `RxJsonSchema` for each entity in the module.
    *   `collections.ts`: Exports a configuration object mapping collection names to their schemas.
*   **`rxdbService.ts` Aggregation**: The service imports all `...Collections` objects from the modules and merges them into a single `collectionsDefinition` object before initializing the database. This makes adding new entities highly modular.
*   **`createEntitySchema<T>(...)`**: A helper function in `rxdbService.ts` to standardize schema creation.

### 2.3. Data Seeding and Clearing

*   **`seedDatabaseWithMockData(db, mockData)`**: This function iterates through defined collections, clears existing data, and then bulk-inserts the mock data. It gets the mock data as a parameter from `useRxDBData`.
*   **`clearDatabase(db)`**: Removes all documents from all collections.

## 3. `useRxDBData.ts` - Reactivity and CRUD

This hook is the bridge between React components (via `AppDataContext`) and the RxDB database.

### 3.1. Reactive Subscriptions

*   A `useEffect` hook sets up subscriptions to all RxDB collections when the database is ready.
    ```typescript
    // Simplified example from inside the hook
    const setupCollectionSubscription = <T>(collectionName, setter) => {
      const sub = dbInstance[collectionName].find().$.subscribe(docs => {
        setter(docs.map(doc => doc.toJSON())); // MUST call .toJSON()
      });
      subscriptions.push(sub);
    };
    
    // Called for every collection
    setupCollectionSubscription('students', setStudentsState, 'students');
    ```
*   **`collection.find().$`**: This creates an RxJS Observable that emits an array of documents whenever the collection changes. This is the foundation of the app's reactivity in production mode.
*   **`.toJSON()`**: RxDB documents are rich objects. **You must call `.toJSON()`** to get plain JavaScript objects before setting them in React state.

### 3.2. CRUD Operations

*   CRUD functions (e.g., `addStudent`, `updateStaffMember`) interact with the RxDB collections. Generic helpers (`addGeneric`, `updateGeneric`, `deleteGeneric`) are used to reduce boilerplate.
*   **Create**: `await db.students.insert(newStudentData);`
*   **Read (One)**: `await db.students.findOne(studentId).exec();`
*   **Update**: `await doc.patch({ fieldToUpdate: newValue });`
*   **Delete**: `await doc.remove();`

## 4. Adding a New Entity (RxDB Specifics)

1.  **Define Type**: Add the TypeScript interface in the appropriate module's `data/types.ts`.
2.  **Define Schema & Collection**:
    *   In the module's `data/schema.ts`, create the `RxJsonSchema` using the `createEntitySchema` helper. Define primary keys and indexes.
    *   In the module's `data/collections.ts`, add the new schema to the exported collections object.
3.  **Aggregate Collection**: In `src/services/rxdbService.ts`, import your new module's `...Collections` object and spread it into the master `collectionsDefinition`. Also update the `SchoolDatabaseCollections` type.
4.  **Implement in `useRxDBData.ts`**:
    *   Add a `useState` for the new entity's data array.
    *   In the main `useEffect`, call `setupCollectionSubscription` for the new collection.
    *   Implement CRUD functions for the new entity, preferably using the generic helpers if applicable.
    *   Add the new data array and CRUD functions to the hook's return object.
5.  **Update `useMockData.ts`**: Ensure the mock implementation is also complete (see `mock-data-dev-guide.md`).

## 5. Key Considerations

*   **Reactivity**: Always use the observable queries (`.$`) for data that needs to be live in the UI.
*   **Performance**: Define indexes in your schemas for fields that are frequently queried.
*   **Migrations**: If you change a schema, you will need to increment its `version` and provide a migration strategy in the collection definition in `rxdbService.ts`.
*   **Data Integrity**: Complex relational integrity (like cascading deletes) must be handled in your application logic within the CRUD functions. RxDB `ref` provides population but not foreign key constraints.