# School Management System - Architecture Overview

## 1. Introduction

This document outlines the high-level architecture of the School Management System (SMS). The SMS is a frontend-only React application designed to be robust, maintainable, and scalable. It features a mode-based data layer allowing it to operate with mock data for demonstration and development, or with a local RxDB database for persistent storage in a production-like environment.

## 2. Core Technologies

*   **React 18+**: For building the user interface with components.
*   **TypeScript**: For static typing, improving code quality and maintainability.
*   **Tailwind CSS**: For utility-first CSS styling.
*   **React Router DOM v6+**: For client-side routing and navigation.
*   **RxDB (Reactive Database)**: For local, in-browser database storage and reactivity in "production" mode. Uses Dexie.js as its storage adapter.
*   **RxJS**: Used by RxDB for managing observable data streams.
*   **i18next & react-i18next**: For internationalization (i18n) and multilingual support.
*   **ES Modules & Import Maps**: Leveraged for module management directly in the browser, sourcing dependencies from CDNs like `esm.sh`.

## 3. Application Structure

The application follows a component-based architecture, organized into several key areas:

*   **`src/components`**: Reusable UI components (e.g., `Layout`, `Card`, `Table`, `Modal`).
*   **`src/pages`**: Top-level components representing different views/pages of the application, organized by module (e.g., `administration`, `academics`, `finance`).
*   **`src/contexts`**: React Context API implementations for global state management.
*   **`src/hooks`**: Custom React Hooks that contain the core data logic.
*   **`src/services`**: Low-level service implementations, like the RxDB service.
*   **`src/modules`**: A key architectural pattern where data definitions for different parts of the application are self-contained. Each module folder contains:
    *   `data/types.ts`: TypeScript interfaces for the module.
    *   `data/mockData.ts`: Mock data for demo mode.
    *   `data/schema.ts`: RxDB schema definitions.
    *   `data/collections.ts`: RxDB collection configurations.
*   **`src/i18n`**: Contains all configuration and translation files for internationalization.
*   **`src/types.ts`**: A central file that **re-exports** all types from the individual modules, making them easily accessible throughout the app.

## 4. Data Layer Architecture

A key feature of this application is its dual-mode data layer, controlled by the `APP_MODE` setting in `config.ts`.

### 4.1. Demo Mode (`APP_MODE = 'demo'`)

*   The application **exclusively** uses `useMockData.ts`.
*   Data is loaded by dynamically importing all `mockData.ts` files from `src/modules/**/data/`.
*   CRUD operations modify this in-memory state.
*   **No RxDB code is imported or initialized.**
*   Data is lost on page refresh.

### 4.2. Production Mode (`APP_MODE = 'production'`)

*   `AppDataContext.tsx` attempts to **dynamically import** `useRxDBData.ts` and `rxdbService.ts`.
*   If successful, `useRxDBData.ts` initializes RxDB.
*   Schemas for the database are loaded from each module (`src/modules/**/data/schema.ts`).
*   Data is persisted in the browser's IndexedDB.
*   Features for managing RxDB data (seeding with mock data, clearing data) are available.
*   **Fallback Mechanism**: If RxDB fails to initialize, the application gracefully falls back to using `useMockData.ts` and displays a warning.

### 4.3. `AppDataContext.tsx` - The Switchboard

*   This context provider is responsible for determining the active data mode.
*   It provides a unified API (defined by `AppDataContextType` in `types.ts`) to the rest of the application, abstracting the underlying data source.

## 5. UI and Styling

*   **Tailwind CSS**: Used for all styling.
*   **Reusable UI Components**: Found in `src/components/ui`, these are generic components like `Button`, `Modal`, `Table`, etc.
*   **Layout Component**: `src/components/Layout.tsx` provides the main application shell, including the `Sidebar` and `Header`.

## 6. Internationalization (i18n)

*   The application uses `i18next` for handling translations.
*   Language resources are stored as JSON files in `src/i18n/locales/`.
*   Namespaces are used to organize translations by module (e.g., `academics.json`, `finance.json`).
*   The `useTranslation` hook is used in components to access translated strings.

This architecture aims for a clean separation of concerns, developer-friendliness through modularity, and adaptability for future growth.