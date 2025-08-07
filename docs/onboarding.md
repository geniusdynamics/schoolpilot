# SchoolPilot - Developer Onboarding Guide

Welcome, new developer! This guide will get you up to speed on SchoolPilot (SMS) project, also known as **SchoolPilot**.

## 1. Project Goal

The SMS is a comprehensive, frontend-only application designed to manage all aspects of a school, including students, staff, academics, and finances. It is built to be robust, performant, and easy to maintain, featuring a modular architecture and a dual-mode data layer for both demonstration and persistent use.

## 2. Technology Stack

*   **Core**: React 18+, TypeScript
*   **Styling**: Tailwind CSS
*   **Routing**: React Router DOM v6+
*   **Data Layer**:
    *   **RxDB (Reactive Database)**: For local, in-browser database storage (via IndexedDB) in "production" mode.
    *   **In-Memory Mock**: For "demo" mode, development, and seeding the production database.
*   **Internationalization**: `i18next` and `react-i18next` for multilingual support (English & French).
*   **Module Loading**: Native ES Modules with import maps defined in `index.html`, sourcing dependencies from CDNs like `esm.sh`.

## 3. Getting Started: Local Setup

This project is designed to run directly in the browser without a complex build step.

1.  **Prerequisites**: A modern web browser (like Chrome or Firefox) and a simple local web server.
2.  **Serve the Project**: From the project's root directory, use any simple web server.
    *   If you have Python 3: `python -m http.server`
    *   If you have Node.js and `serve` installed (`npm install -g serve`): `serve .`
    *   Using a VS Code extension like "Live Server".
3.  **Access the App**: Open your browser to the local server's address (e.g., `http://localhost:8000` or `http://localhost:3000`). The application should load.

## 4. Understanding the Core Concepts

### 4.1. Application Modes (`src/config.ts`)

*   **`demo`**: (Default) Uses an in-memory mock data layer from `src/hooks/useMockData.ts`. Data resets on page refresh. Ideal for UI development.
*   **`production`**: Attempts to initialize an RxDB database. Provides data persistence across sessions. If RxDB fails, it gracefully falls back to the mock data layer and displays a warning.

### 4.2. Modular Architecture (`src/modules/`)

*   The application's data definitions are organized into self-contained modules (e.g., `academics`, `finance`).
*   Each module's `data` subdirectory contains its own `types.ts`, `mockData.ts`, and `schema.ts`.
*   This modularity makes the codebase easier to navigate, maintain, and extend.

### 4.3. `AppDataContext` - The Data Switchboard

*   **Rule of Thumb**: **NEVER** import `useMockData` or `useRxDBData` directly in a page or component.
*   **ALWAYS** use the `useAppData()` hook from `src/contexts/AppDataContext.tsx`.
*   This context provides a unified API for all data operations, abstracting the underlying data source from the UI. It handles all the logic for choosing and managing the data layer.

### 4.4. Internationalization (`src/i18n/`)

*   We use `i18next` for all user-facing text.
*   Translation files are in `src/i18n/locales/` organized by language and namespace (e.g., `en/finance.json`).
*   In components, use the `useTranslation` hook: `const { t } = useTranslation('my-namespace');` then render text with `t('myKey')`.

## 5. Project Status (as of last update)

### What's Done

*   **Modular Project Structure**: Core architecture is in place under `src/modules/`.
*   **Dual-Mode Data Layer**: The `AppDataContext` correctly switches between mock data and the RxDB layer.
*   **Internationalization (i18n)**: The framework is fully set up with English and French translation files for all modules.
*   **Core UI Components**: A solid set of reusable UI components exists in `src/components/ui/`.
*   **CRUD Pages**: Most CRUD (Create, Read, Update, Delete) pages for all major modules are implemented and functional in `demo` mode.
*   **Basic Reporting**: Several key reports (Student Masterlist, Financial Summary, etc.) are implemented with basic filtering.

### What's Pending / Needs Improvement

*   **Full RxDB Implementation**: The **highest priority** is to fully implement all CRUD functions in `src/hooks/useRxDBData.ts`. Many functions are still placeholders (`unimplementedAsync`). This will make the application fully persistent in production mode.
*   **Real Authentication**: The `UserContext` is currently mocked. A real authentication flow (e.g., with JWT, OAuth) needs to be implemented.
*   **Complex Workflows**: The `Workflows` page is basic. Implementing actual approval logic for requisitions, expense claims, etc., is a major pending task.
*   **Advanced Reporting**: Reports need more advanced data aggregation, charting, and robust export features (PDF/Excel).
*   **Backend Integration**: The application is frontend-only. Future work will involve connecting it to a real backend API, which will require refactoring the data layer hooks.
*   **Comprehensive Testing**: The project needs a robust suite of unit, integration, and end-to-end tests.
*   **UI/UX Polish**: Some pages could benefit from improved layouts, form validation, and user feedback (e.g., toast notifications for success/error messages).

## 6. Where to Go Next

*   Familiarize yourself with the overall structure by reading `docs/code-structure-dev-guide.md`.
*   Understand how data flows by reading `docs/data-dev-guide.md`.
*   To add a new feature, follow the modular pattern described in the development guides.

Welcome to the team, and happy coding!
