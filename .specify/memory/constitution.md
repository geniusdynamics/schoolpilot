<!--
SYNC IMPACT REPORT
Version change: [CONSTITUTION_VERSION] -> 1.0.0
Modified principles: All (Initial Setup)
Added sections: Technical Constraints, Development Workflow
Removed sections: Placeholder sections
Templates requiring updates: 
  - .specify/templates/plan-template.md (✅ updated)
  - .specify/templates/spec-template.md (✅ updated)
  - .specify/templates/tasks-template.md (✅ updated)
Follow-up TODOs: None
-->
# SchoolPilot3 Constitution
<!-- Established to govern the architecture and development of the EduGen SchoolPilot3 system. -->

## Core Principles

### I. Modular Domain-Driven Design (MDDD)
Every business feature MUST be self-contained within a dedicated module under `src/modules/`. Each module is responsible for its own TypeScript interfaces, RxDB schemas, and mock data. Cross-module dependencies must be explicitly declared and minimized to ensure high maintainability and scalability.

### II. Strict Type-Driven Development (STDD)
Zero `any` policy. All data structures, component props, and API boundaries MUST be fully typed. We prioritize polymorphic components with sophisticated type inference to ensure runtime safety and developer productivity. The central type system in `src/core/types.ts` serves as the source of truth for all shared entities.

### III. Unified Data Abstraction (The Switchboard Pattern)
UI components MUST remain source-agnostic. All data operations MUST go through the `AppDataContext` (the Switchboard), which abstracts the underlying data layer (SQLite OPFS for dev, PouchDB for prod, or Mock data for demo). This ensures seamless mode switching and robust fallback mechanisms.

### IV. Reactive-First Architecture
We prioritize reactive data streams using RxDB observables and RxJS. UI components should subscribe to data changes rather than relying on manual state synchronization. This ensures real-time updates and a highly responsive user experience, especially for data-heavy administrative modules.

### V. Mobile-First & Internationalized (A11y & i18n)
All UI development MUST follow a mobile-first approach, ensuring full responsiveness from 320px to 1440px. Internationalization is a first-class citizen; every user-facing string MUST use i18next namespaces organized by module. We maintain AA color contrast and keyboard navigability as baseline standards.

## Technical Constraints

### Architecture Compliance
- **Frontend-Only**: The system is designed as a robust client-side React application.
- **Dual-Mode Persistence**: Must support both SQLite OPFS (persistent dev) and PouchDB (offline-capable prod).
- **Module Federation**: Schemas must be federated from individual modules into a central aggregator.

## Development Workflow

### Quality Gates
- **TDD (Test-Driven Development)**: Write tests before implementation for core logic and data hooks.
- **Consistent Structure**: New modules MUST follow the established `data/`, `pages/`, `i18n/` structure.
- **Documentation**: Every architectural change MUST be documented in `docs/architecture/` and reflected in the constitution if principles are affected.

## Governance
The SchoolPilot3 Constitution supersedes all individual development preferences. Amendments require a version bump and a Sync Impact Report to ensure all templates and artifacts remain aligned.

**Version**: 1.0.0 | **Ratified**: 2026-03-25 | **Last Amended**: 2026-03-25

