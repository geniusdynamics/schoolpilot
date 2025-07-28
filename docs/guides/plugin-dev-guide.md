# Plugin Development Guide

## 1. Current Status

Currently, the School Management System **does not have a formal plugin architecture or system**. The application is built as a single, modular frontend application.

## 2. Extending the Application (The "Plugin" Pattern)

While a dedicated plugin system is not in place, the application's modular architecture under `src/modules/` provides a clean way to extend its functionality. Treating a new feature set as a "module" is the recommended "plugin" pattern.

To add a new feature module (e.g., "Transportation"):

1.  **Create a New Module Directory**:
    *   Create `src/modules/transportation/data/`.
    *   Inside, create `types.ts`, `mockData.ts`, `schema.ts`, and `collections.ts`.
2.  **Define Data Structures**:
    *   Define TypeScript interfaces (e.g., `TransportRoute`, `Vehicle`) in `transportation/data/types.ts`.
    *   Create mock data in `transportation/data/mockData.ts`.
    *   Define RxDB schemas in `transportation/data/schema.ts`.
    *   Export collection configurations from `transportation/data/collections.ts`.
3.  **Integrate into Core Systems**:
    *   **Types**: Re-export your new types from the central `src/types.ts` file and add them to `AppDataContextType`.
    *   **Data Layer**: `useMockData.ts` will automatically discover and load your `mockData.ts`. For RxDB, import your `transportationCollections` object into `rxdbService.ts` and add it to the main `collectionsDefinition`. Then, implement the data subscriptions and CRUD logic in `useRxDBData.ts`.
4.  **Create UI Pages**:
    *   Create a new page directory: `src/pages/transportation/`.
    *   Build your page components (e.g., `RoutesPage.tsx`, `VehicleManagementPage.tsx`).
    *   Use the `useAppData()` hook to interact with your new data entities.
5.  **Add Navigation**:
    *   Add a new group and its child items to `NAVIGATION_ITEMS` in `src/constants.tsx`.
    *   Add the corresponding translation keys to the `en/navigation.json` and `fr/navigation.json` files.
    *   Add the routes to `src/App.tsx`.

## 3. Future Considerations for a True Plugin System

If a formal plugin system were to be developed, it might involve:

*   **Defined Extension Points**: Specific areas in the UI or data lifecycle where plugins can hook into (e.g., adding menu items, new dashboard widgets, custom data processors).
*   **Plugin Registration**: A mechanism for the core application to discover and load plugins, perhaps from a configuration file.
*   **Isolated Scope**: Ensuring plugins operate in a somewhat isolated manner to prevent conflicts.
*   **Shared API**: A well-defined API that plugins can use to interact with the core application's data and services securely.

For now, the modular approach provides a robust and maintainable way to extend the application.