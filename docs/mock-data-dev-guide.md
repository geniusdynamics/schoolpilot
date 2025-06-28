# Mock Data Layer Development Guide (`useMockData.ts`)

## 1. Purpose

The `useMockData.ts` hook is central to the application's "demo" mode. It provides a complete, in-memory simulation of the application's backend and database, allowing for full UI development, testing, and demonstration without any external dependencies or persistent storage.

**Key Goals:**

*   Provide a fully functional data layer conforming to `AppDataContextType`.
*   Ensure all CRUD operations work as expected on in-memory data.
*   Serve as the source for initial data (`rawInitialData`) which is also used for seeding RxDB in production mode.
*   Be entirely independent of RxDB or any other persistence mechanism.

## 2. File Structure and Core Components

Located at `src/hooks/useMockData.ts`.

### 2.1. Dynamic Data Loading

*   The `useMockData` hook **dynamically loads** mock data from all modules at runtime.
*   It uses `import.meta.glob('/src/modules/**/data/mockData.ts', { eager: true });` to find and import all `mockData.ts` files.
*   This means you **do not need to manually import** mock data into this hook. Just add a `mockData.ts` file to your new module, and it will be included automatically.

### 2.2. State Management

*   A single `useState` hook, `const [data, setData] = useState(...)`, holds the entire application state as a large object.
*   This object's keys correspond to the data entity properties in `AppDataContextType` (e.g., `students`, `staff`).

### 2.3. Initialization `useEffect`

*   A `useEffect` hook runs once on mount.
*   It performs the dynamic import of all `mockData.ts` modules.
*   It aggregates all the imported mock data into a single `rawInitialData` object.
*   This aggregated data is then used to set the initial state of the `data` object.
*   Finally, it sets all loading flags to `false`.

### 2.4. CRUD Function Implementations

For each entity, CRUD functions are implemented to manipulate the in-memory `data` state object.

*   **ID Generation**: Utility functions `generateId()` (for UUIDs) and `generateNumericId()` are available.
*   **Timestamps**: `created_at` and `updated_at` fields are set using `new Date().toISOString()`.
*   **Denormalization**: Helper functions (e.g., `resolveStudentDetails`, `resolveStaffDetails`) are used within `add` and `update` functions to populate related display names (e.g., `department_name` from `department_id`). This mimics how a backend might return enriched data.

**Example: `addStudent` (Conceptual)**
```typescript
const addStudent = useCallback(async (studentData, guardianData) => {
  await delay(MOCK_API_DELAY);
  const now = new Date().toISOString();
  // ... logic to create new student and guardian objects ...
  const resolvedStudent = resolveStudentDetails(newStudentBase);
  
  setData(prev => ({
    ...prev,
    students: [...prev.students, resolvedStudent],
    parentsGuardians: [...prev.parentsGuardians, newGuardian] 
  }));

  return resolvedStudent;
}, [/* dependencies like other state arrays for denormalization */]);
```
The actual implementation may vary but follows this pattern of updating the central `data` state object.

### 2.5. Return Value

The `useMockData` hook returns an object that **must fully conform** to the `AppDataContextType` interface defined in `src/types.ts`.

## 3. Adding a New Entity to the Mock Data Layer

1.  **Define Type**: Add the new entity's interface/enum in the appropriate module's `data/types.ts`.
2.  **Update `AppDataContextType`**: In `src/types.ts`, add the new entity array (e.g., `newEntities: NewEntityType[]`) and CRUD function signatures.
3.  **Create Mock Data File**: In your module's `data` directory, create a `mockData.ts` file.
4.  **Export Mock Data**: In `mockData.ts`, export an array of your new entity's mock data. The exported variable name must follow the pattern `initialMock<EntityPluralName>`.
    ```typescript
    // In src/modules/newModule/data/mockData.ts
    export const initialMockNewEntities: NewEntityType[] = [
      { /* ... sample data ... */ }
    ];
    ```
5.  **Implement CRUD Functions**: In `useMockData.ts`, add the new CRUD functions (`addNewEntity`, `updateNewEntity`, etc.) that use `setData` to manipulate the `newEntities` array within the main state object.
6.  **Add to Return Object**: Add the new data array and functions to the hook's final return object.

By following this modular approach, `useMockData.ts` remains clean and automatically adapts to new modules without needing manual imports.
