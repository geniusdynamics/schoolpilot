# Code Structure & Development Guide

## 1. Introduction

This guide provides an overview of the project's code structure, naming conventions, and general development practices to ensure consistency and maintainability.

## 2. Directory Structure

The `src` directory is the main container for all application source code:

```
src/
├── App.tsx                   # Root React component, sets up routing and global providers
├── index.tsx                 # Main entry point, renders App to the DOM
├── types.ts                  # Central file re-exporting all module types
├── constants.tsx             # Application-wide constants (e.g., navigation items)
├── config.ts                 # Application mode configuration (demo/production)
│
├── components/
│   ├── ui/                   # Generic, reusable UI components (Button, Card, Modal, etc.)
│   └── ... (Other shared components like Layout, Sidebar, Header)
│
├── contexts/
│   ├── AppDataContext.tsx    # Manages and provides all application data and actions
│   └── UserContext.tsx       # Manages current user state
│
├── hooks/
│   ├── useMockData.ts        # Implements data logic for "demo" mode
│   └── useRxDBData.ts        # Implements data logic for "production" mode
│
├── i18n/                     # Internationalization files
│   ├── locales/              # Translation JSON files organized by language and namespace
│   ├── i18n.ts               # i18next configuration
│   └── loader.ts             # Central loader for translation resources
│
├── modules/                  # Self-contained data definitions for application modules
│   └── academics/
│       └── data/
│           ├── types.ts
│           ├── mockData.ts
│           ├── schema.ts
│           └── collections.ts
│   └── finance/
│       └── data/
│           └── ...
│   └── ... (other modules)
│
├── pages/                    # Top-level route components, organized by module
│   ├── DashboardPage.tsx
│   ├── administration/
│   │   └── StudentsListPage.tsx
│   └── ... (other page components)
│
└── services/
    └── rxdbService.ts        # RxDB schema aggregation, database initialization, etc.
```

## 3. Naming Conventions

*   **Components**: PascalCase (e.g., `StudentCard.tsx`, `Button.tsx`).
*   **Files**:
    *   React components: PascalCase.
    *   Hooks, services, types: camelCase or PascalCase (e.g., `useAppData.ts`, `rxdbService.ts`).
*   **Interfaces & Types**: PascalCase, often prefixed with their module abbreviation when re-exported (e.g., `AdminPartnerType`, `FinBankType`).
*   **Enums**: PascalCase for the enum name, UPPER_SNAKE_CASE for members.

## 4. Component Design

*   **UI Components (`src/components/ui/`)**: Should be purely presentational, receiving data and callbacks via props. They should not contain business logic.
*   **Page Components (`src/pages/`)**: Responsible for page layout, fetching data via `useAppData()`, and passing data/handlers to UI components.

## 5. State Management

*   **Global State**: Managed via `AppDataContext`.
*   **Local State**: Use `useState` for component-level state.
*   Data fetching and manipulation logic is encapsulated within the data hooks (`useMockData.ts`, `useRxDBData.ts`).

## 6. Styling

*   **Tailwind CSS**: The primary styling method. Use utility classes directly in your JSX.
*   **Global Styles**: Minimal global styles are defined in `index.html`.

## 7. Adding New Features (The Modular Way)

1.  **Create Module Folder**: If your feature belongs to a new module, create a new folder under `src/modules/` (e.g., `src/modules/newModule/data/`).
2.  **Define Types**: Add new TypeScript interfaces and enums in the module's `types.ts` file (e.g., `src/modules/newModule/data/types.ts`).
3.  **Update Central `types.ts`**: Re-export your new types from `src/types.ts`. Also, update the main `AppDataContextType` interface in `types.ts` to include your new data arrays and function signatures.
4.  **Create Mock Data**: Add mock data for your entities in `src/modules/newModule/data/mockData.ts`. The `useMockData` hook will automatically pick this up.
5.  **Define RxDB Schema**: Create `schema.ts` and `collections.ts` files in your module's data directory. Define the RxDB schema for your entities there.
6.  **Update `rxdbService.ts`**: Import your module's `collections` configuration and add it to the master `collectionsDefinition` object.
7.  **Implement Data Logic**:
    *   Add state, subscriptions, and CRUD functions to `useRxDBData.ts`.
    *   Add corresponding (simpler) CRUD functions to `useMockData.ts`.
8.  **Create UI**:
    *   Build page components in the appropriate `src/pages/` directory.
    *   Add routes in `App.tsx`.
    *   Add navigation links in `src/constants.tsx`.
    *   Use the `useAppData()` hook in your page components to interact with the data.

By following these guidelines, developers can contribute to the project effectively, maintaining code quality and consistency.