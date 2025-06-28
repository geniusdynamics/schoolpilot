# Workflow Plan for SchoolPilot Project

This document outlines the comprehensive plan to bring the SchoolPilot application to a production-grade state, addressing existing issues, implementing missing functionalities, and ensuring robust data management.

## Phase 1: Comprehensive Codebase Audit & Problem Identification

**Objective:** To gain a complete understanding of the current state of the codebase, identify all existing issues, and pinpoint areas requiring implementation or correction.

1.  **Re-evaluate `package.json` and `tsconfig.json`:**
    *   **What was wrong:** Previous `npm install` failures indicated issues with package names and React versions.
    *   **What needs to be done:** Verify all dependencies are correctly listed and resolved. Ensure TypeScript compilation is configured optimally, especially for module resolution. Pay close attention to RxDB related dependencies and their versions, ensuring they align with the documentation.
    *   **Status:** Pending.

2.  **Deep Scan for `unimplementedAsync`:**
    *   **What was wrong:** Numerous `unimplementedAsync` placeholders exist, indicating incomplete CRUD operations.
    *   **What needs to be done:** Perform a thorough search across all `.ts` and `.tsx` files to identify every instance. For each instance:
        *   Determine the intended functionality based on surrounding code, type definitions (`types.ts`), and `api-spec.md`.
        *   Identify whether the function is part of `useMockData.ts` (demo mode) or `useRxDBData.ts` (production mode) implementation.
    *   **Status:** Pending.

3.  **Verify Data Flow and Type Consistency:**
    *   **What was wrong:** Potential inconsistencies in data handling between mock and RxDB modes, and type mismatches.
    *   **What needs to be done:** Trace data flow through `AppDataContext.tsx`, `useMockData.ts`, `useRxDBData.ts`, and `rxdbService.ts`. Ensure type consistency and correct data manipulation. Specifically check:
        *   How `APP_MODE` is used to switch between data sources.
        *   The `rawInitialData` flow from `useMockData.ts` to `rxdbService.ts` for seeding.
        *   The `triggerSeedRxDB` and `triggerClearRxDB` logic, ensuring the "no re-import after data entry" rule is considered (i.e., if data exists, seeding should not overwrite unless explicitly confirmed, or a flag is set).
    *   **Status:** Pending.

4.  **Review UI Component Imports:**
    *   **What was wrong:** Previous build errors indicated incorrect relative import paths for UI components after moving them to `src/components/ui/`.
    *   **What needs to be done:** Systematically check all page and component files for correct relative import paths.
    *   **Status:** Partially addressed, needs full verification.

## Phase 2: Prioritized Fixes & Implementations

**Objective:** To systematically resolve identified issues and implement missing functionalities, ensuring the application builds and runs correctly in both `demo` and `production` modes.

1.  **Resolve All Build Errors:**
    *   **What needs to be done:** Address any remaining build errors, starting with the `Could not resolve "../config"` error in `AppDataContext.tsx` and `DatabaseSettingsPage.tsx`. Ensure all import paths are correct based on the current file structure and `tsconfig.json` aliases.
    *   **Status:** Pending.

2.  **Implement `unimplementedAsync` in `useMockData.ts`:**
    *   **What needs to be done:** For all identified `unimplementedAsync` functions, implement their mock data counterparts in `useMockData.ts`. This will involve:
        *   Adding logic to manipulate the in-memory state (`setData`).
        *   Ensuring correct ID generation, timestamping, and denormalization as per `mock-data-dev-guide.md`.
        *   Adding appropriate `delay(MOCK_API_DELAY)` calls to simulate asynchronous operations.
    *   **Status:** Pending.

3.  **Implement `unimplementedAsync` in `useRxDBData.ts`:**
    *   **What needs to be done:** For all identified `unimplementedAsync` functions, implement their RxDB counterparts in `useRxDBData.ts`. This will involve:
        *   Interacting with the RxDB collections (`dbInstance[collectionName]`).
        *   Using `insert`, `patch`, `remove`, and `find().$` as appropriate.
        *   Ensuring `.toJSON()` is called when retrieving data for React state.
        *   Implementing the logic for `triggerSeedRxDB` and `triggerClearRxDB` to respect the "no re-import after data entry" rule. This will likely involve checking if a collection has existing documents before allowing a seed operation, and providing a mechanism to reset to a truly empty state.
    *   **Status:** Pending.

4.  **Refine RxDB Plugin Imports:**
    *   **What needs to be done:** Based on the documentation, ensure that RxDB and its plugins are correctly imported and configured in `rxdbService.ts` and `package.json`. This includes verifying the correct package names and versions.
    *   **Status:** Pending.

5.  **Final Build & Verification:**
    *   **What needs to be done:** After implementing all identified fixes and features, perform a clean build and verify that the application compiles without errors.
    *   **Status:** Pending.

## Phase 3: Functional Testing & Refinement

**Objective:** To ensure the application functions as expected in both data modes and to perform final code quality checks.

1.  **Manual Testing (Conceptual):**
    *   **What needs to be done:** Outline a plan for manual testing in both `demo` and `production` modes to ensure all CRUD operations and data flows work as expected. This will include testing the data seeding and clearing functionality, and verifying that data persists in production mode.
    *   **Status:** Pending.

2.  **Code Cleanup & Optimization:**
    *   **What needs to be done:** Perform a final pass for code style, consistency, and minor optimizations. Remove any temporary comments or debugging code.
    *   **Status:** Pending.
