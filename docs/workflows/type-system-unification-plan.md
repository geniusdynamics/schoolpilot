# Comprehensive Type System Unification Plan

**Document Version:** 2.0
**Status:** In Progress
**Author:** Gemini & Mr. GENIUS
**Change Log:** v2.0 represents a major strategic pivot. It introduces a two-script generation system, a `gn-` file staging convention for safety, and mandates the generation of intelligent, relationally-aware mock data based on deep analysis of the system's business logic.

## 1.0 Executive Summary & Strategic Goals

This document outlines the complete technical strategy for unifying the data type definitions across the SchoolPilot3 frontend application.

### 1.1 The Core Problem: The Three Worlds of Data

Currently, the application's data definitions exist in three separate, manually-maintained "worlds," creating a high risk of inconsistency, bugs, and maintenance overhead:
1.  **Backend Blueprint Types:** The new, architecturally superior types defined in `src/core/backend-types.ts`, which represent our future backend's "source of truth."
2.  **RxDB Schemas:** The client-side database schemas located in `src/modules/.../data/schema.ts`.
3.  **Curated Mock Data:** The highly realistic, hand-crafted mock data structures in `src/globalMockData.ts` that simulate real-world school operations.

Any change to a data structure requires manual updates in all three locations, which is inefficient and error-prone.

### 1.2 The Strategic Solution: A Single Source of Truth with Intelligent Generation

The goal is to refactor the application so that the **Backend Blueprint Types (`backend-types.ts`)** become the single, unimpeachable source of truth.

From this single file, we will **automatically generate** all other necessary data definitions. This will be achieved via a **two-script system**:
1.  `scripts/generate-schemas.ts`: Generates RxDB schemas.
2.  `scripts/generate-mock-data.ts`: Generates a complete, relationally-consistent set of mock data that respects the application's business logic.

This approach will:
- **Eliminate Data Drift:** Ensure 100% consistency across all parts of the application.
- **Preserve Business Logic:** Retain the high-fidelity, realistic scenarios of the original mock data in the new, generated data set.
- **Improve Robustness:** Prepare the frontend to be perfectly aligned with the future backend API.
- **Ensure Data Parity:** The generated mock data will be used for both `demo` mode and for seeding the `production` (RxDB) database, guaranteeing identical behavior.

---

## 2.0 The Five-Phase Grand Unification Plan

We will execute this refactoring in a controlled, non-destructive manner using a `gn-` prefix for all generated files as a safe staging mechanism.

- **Phase 1: Analysis & Tooling:** Split the generator script and perform a deep analysis of existing documentation and business logic to inform the mock data generator.
- **Phase 2: Schema Generation:** Use the new script to generate a staged `gn-rxdb-schemas.ts` file.
- **Phase 3: Intelligent Mock Data Generation:** Use the second script to generate a staged `gn-globalMockData.ts` file that is relationally sound.
- **Phase 4: Integration & Refactoring:** Carefully integrate the new `gn-` prefixed files into the application's data layer.
- **Phase 5: Finalization:** Once the system is fully validated, promote the staged files by removing the `gn-` prefix and clean up legacy assets.

---

## 3.0 Master Task & Sub-Task List

This checklist corresponds to the generated TODO list.

### ✅ Phase 0: Foundation (Completed)

- [x] Create the "North Star" type definition file: `src/core/backend-types.ts`.
- [x] Implement the **Branded ID** pattern for all entity IDs to ensure type-safe relationships.
- [x] Implement a universal `BaseModel` that all entities extend.

### ☐ Phase 1: Foundational Tooling & Analysis

- [ ] **Task 1.1:** Split the original `generate-definitions.ts` into `scripts/generate-schemas.ts` and `scripts/generate-mock-data.ts`. Delete the original script.
- [ ] **Task 1.2:** Deeply analyze project documentation (`docs/AkademicoNotes`, user stories, `src/globalMockData.ts`) to map out all entity relationships and business logic for realistic data generation.
- [ ] **Task 1.3:** Update this unification plan document (this task).

### ☐ Phase 2: Schema Generation

- [ ] **Task 2.1:** Implement the logic in `scripts/generate-schemas.ts` to read `backend-types.ts` and generate a staged schema file at `src/core/gn-rxdb-schemas.ts`.
- [ ] **Task 2.2:** Run the schema generator and verify the output.

### ☐ Phase 3: Intelligent Mock Data Generation

- [ ] **Task 3.1:** Implement the core data generation engine in `scripts/generate-mock-data.ts`. This engine will use the analysis from Phase 1 to create relationally-consistent data.
- [ ] **Task 3.2:** Generate a staged mock data file at `src/gn-globalMockData.ts`.
- [ ] **Task 3.3:** Run the mock data generator and verify the output's logical integrity.

### ☐ Phase 4: Integration & Refactoring

- [ ] **Task 4.1:** Modify the application's data loading mechanism (`DataStrategyManager.ts`, `AppDataContext`, etc.) to use the new `gn-globalMockData.ts` in demo mode.
- [ ] **Task 4.2:** Modify `rxdbService.ts` to use the new `gn-rxdb-schemas.ts` and the data from `gn-globalMockData.ts` for seeding the database in production mode.
- [ ] **Task 4.3:** Run the application and perform a full validation check to ensure all features work as expected with the new generated data.

### ☐ Phase 5: Finalization

- [ ] **Task 5.1:** Once validation is complete, rename the `gn-` prefixed files to their final names, replacing the old files (e.g., `src/core/gn-rxdb-schemas.ts` becomes `src/core/rxdb-schemas.ts`).
- [ ] **Task 5.2:** Delete the old, manually maintained files (`globalMockData.ts`, all module-level `schema.ts` and `mockData.ts` files).
- [ ] **Task 5.3:** Delete the generator scripts (or move them to a non-runtime directory).
- [ ] **Task 5.4:** Final commit and cleanup.
- [ ] **Task 5.5:** Mark this project as complete and celebrate a major architectural victory. 