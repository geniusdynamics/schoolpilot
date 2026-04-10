# Modules System

<cite>
**Referenced Files in This Document**
- [ModularSystem.ts](file://src/core/ModularSystem.ts)
- [moduleRegistration.ts](file://src/core/moduleRegistration.ts)
- [moduleRegistry.ts](file://src/core/moduleRegistry.ts)
- [moduleLoader.ts](file://src/core/moduleLoader.ts)
- [ModuleLifecycle.ts](file://src/core/ModuleLifecycle.ts)
- [ModuleExports.ts](file://src/core/ModuleExports.ts)
- [ServiceRegistry.ts](file://src/core/ServiceRegistry.ts)
- [DependencyResolver.ts](file://src/core/DependencyResolver.ts)
- [module.ts](file://src/core/types/module.ts)
- [administration moduleDefinition.tsx](file://src/modules/administration/moduleDefinition.tsx)
- [modules.json](file://src/config/modules.json)
- [MODULE_STRUCTURE_STANDARD.md](file://docs/architecture/MODULE_STRUCTURE_STANDARD.md)
- [package.json](file://package.json)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document explains SchoolPilot3’s modular architecture system with a domain-driven design approach. Each business module (administration, academics, finance, hr, inventory, library, nutrition, reports, settings) is self-contained and contributes to a unified system through a module federation pattern. The system supports dynamic loading, lifecycle management, dependency resolution, and type-safe inter-module communication. It also documents the module structure standards, dependency management with version constraints, and integration with the central database schema.

## Project Structure
SchoolPilot3 organizes modules under a consistent structure that promotes separation of concerns and maintainability. The core modular system resides in the src/core directory and orchestrates module registration, loading, lifecycle, and exports. Each business module lives under src/modules/<module-name> and follows a standardized layout.

```mermaid
graph TB
subgraph "Core Modular System"
MS["ModularSystem"]
MR["ModuleRegistry"]
ML["ModuleLoader"]
MLC["ModuleLifecycle"]
SER["ServiceRegistry"]
ME["ModuleExportsManager"]
DR["DependencyResolver"]
end
subgraph "Business Modules"
ADM["Administration Module"]
ACD["Academics Module"]
FIN["Finance Module"]
HRM["HR Module"]
INV["Inventory Module"]
LIB["Library Module"]
NUT["Nutrition Module"]
REP["Reports Module"]
SET["Settings Module"]
end
MS --> MR
MS --> ML
MS --> MLC
MS --> SER
MS --> ME
MR --> DR
ML --> MR
ML --> MLC
MR --> MLC
SER --> MS
ME --> MS
MR --> ADM
MR --> ACD
MR --> FIN
MR --> HRM
MR --> INV
MR --> LIB
MR --> NUT
MR --> REP
MR --> SET
```

**Diagram sources**
- [ModularSystem.ts:59-384](file://src/core/ModularSystem.ts#L59-L384)
- [moduleRegistry.ts:24-348](file://src/core/moduleRegistry.ts#L24-L348)
- [moduleLoader.ts:43-560](file://src/core/moduleLoader.ts#L43-L560)
- [ModuleLifecycle.ts:37-295](file://src/core/ModuleLifecycle.ts#L37-L295)
- [ServiceRegistry.ts:32-277](file://src/core/ServiceRegistry.ts#L32-L277)
- [ModuleExports.ts:31-309](file://src/core/ModuleExports.ts#L31-L309)
- [DependencyResolver.ts:19-252](file://src/core/DependencyResolver.ts#L19-L252)

**Section sources**
- [MODULE_STRUCTURE_STANDARD.md:1-109](file://docs/architecture/MODULE_STRUCTURE_STANDARD.md#L1-L109)
- [moduleRegistration.ts:11-230](file://src/core/moduleRegistration.ts#L11-L230)
- [modules.json:1-74](file://src/config/modules.json#L1-L74)

## Core Components
The modular system is composed of several cohesive subsystems that work together to manage modules, their lifecycles, dependencies, and exports.

- ModularSystem: Central integration point that coordinates ModuleRegistry, ModuleLoader, ModuleExports, and ServiceRegistry. It exposes APIs for registration, dynamic loading, service retrieval, and system status.
- ModuleRegistry: Manages module registration, dependency resolution, and lifecycle orchestration. It emits events for module state changes and supports parallel or sequential initialization.
- ModuleLoader: Handles dynamic loading of modules via factories, retries, timeouts, and progress tracking. It integrates with ModuleRegistry and ModuleLifecycle.
- ModuleLifecycle: Implements module lifecycle hooks (register, enable, disable, unregister) and tracks module states.
- ServiceRegistry: Provides cross-module service discovery, dependency injection, and initialization with event emission.
- ModuleExportsManager: Registers and validates exports (services, entities, hooks, components, utilities, types) per module.
- DependencyResolver: Performs topological sorting and detects circular dependencies to ensure safe loading order.

**Section sources**
- [ModularSystem.ts:59-384](file://src/core/ModularSystem.ts#L59-L384)
- [moduleRegistry.ts:24-348](file://src/core/moduleRegistry.ts#L24-L348)
- [moduleLoader.ts:43-560](file://src/core/moduleLoader.ts#L43-L560)
- [ModuleLifecycle.ts:37-295](file://src/core/ModuleLifecycle.ts#L37-L295)
- [ServiceRegistry.ts:32-277](file://src/core/ServiceRegistry.ts#L32-L277)
- [ModuleExports.ts:31-309](file://src/core/ModuleExports.ts#L31-L309)
- [DependencyResolver.ts:19-252](file://src/core/DependencyResolver.ts#L19-L252)

## Architecture Overview
The modular architecture follows a module federation pattern where each module defines its metadata, navigation, dependencies, and provides resources. The system enforces type safety through shared TypeScript interfaces and manages inter-module communication via services and exports.

```mermaid
sequenceDiagram
participant App as "Application"
participant MS as "ModularSystem"
participant MR as "ModuleRegistry"
participant ML as "ModuleLoader"
participant MLC as "ModuleLifecycle"
participant SER as "ServiceRegistry"
participant ME as "ModuleExportsManager"
App->>MS : initialize()
MS->>MR : initialize()
MR->>ML : loadOrdered()
ML->>MR : register(loadedModule)
MR->>MLC : enable(moduleId)
ML->>SER : initializeAll()
MS->>ME : registerModule(exports)
App-->>MS : getService(moduleId, name)
MS-->>App : service instance
```

**Diagram sources**
- [ModularSystem.ts:80-161](file://src/core/ModularSystem.ts#L80-L161)
- [moduleRegistry.ts:108-134](file://src/core/moduleRegistry.ts#L108-L134)
- [moduleLoader.ts:229-244](file://src/core/moduleLoader.ts#L229-L244)
- [ModuleLifecycle.ts:98-137](file://src/core/ModuleLifecycle.ts#L98-L137)
- [ServiceRegistry.ts:204-216](file://src/core/ServiceRegistry.ts#L204-L216)
- [ModuleExports.ts:38-51](file://src/core/ModuleExports.ts#L38-L51)

## Detailed Component Analysis

### ModularSystem
ModularSystem acts as the central coordinator. It:
- Initializes subsystems and forwards events
- Registers modules with hooks, services, and exports
- Supports dynamic loading and unloading
- Exposes service retrieval and system status
- Validates exports and provides dependency graph

Key responsibilities:
- Event forwarding from subsystems
- Batch registration and initialization
- Dynamic module loading with retry and timeout
- Dev tools integration for debugging

**Section sources**
- [ModularSystem.ts:59-384](file://src/core/ModularSystem.ts#L59-L384)

### ModuleRegistry
ModuleRegistry:
- Registers modules and builds dependency graphs
- Resolves dependencies using topological sort
- Enables/disables modules in correct order
- Emits lifecycle and registry events
- Supports parallel loading batches

Operational highlights:
- Detects circular dependencies and prevents invalid states
- Provides loading order and dependency batches
- Maintains readiness state and wait-for-ready mechanism

**Section sources**
- [moduleRegistry.ts:24-348](file://src/core/moduleRegistry.ts#L24-L348)
- [DependencyResolver.ts:54-117](file://src/core/DependencyResolver.ts#L54-L117)

### ModuleLoader
ModuleLoader:
- Registers factories for dynamic loading
- Loads modules with retries, timeouts, and progress updates
- Integrates with ModuleRegistry and ModuleLifecycle
- Supports preloading and batch loading
- Validates module dependencies before enabling

**Section sources**
- [moduleLoader.ts:43-560](file://src/core/moduleLoader.ts#L43-L560)

### ModuleLifecycle
ModuleLifecycle:
- Manages module states: registered, enabled, disabled, error
- Executes lifecycle hooks with context
- Supports batch enable/disable operations
- Emits lifecycle events

**Section sources**
- [ModuleLifecycle.ts:37-295](file://src/core/ModuleLifecycle.ts#L37-L295)

### ServiceRegistry
ServiceRegistry:
- Registers service factories with dependencies
- Provides dependency injection and singleton caching
- Emits service lifecycle events
- Supports bulk initialization and module cleanup

**Section sources**
- [ServiceRegistry.ts:32-277](file://src/core/ServiceRegistry.ts#L32-L277)

### ModuleExportsManager
ModuleExportsManager:
- Registers exports per module (services, entities, hooks, components, utils, types)
- Validates exports against module metadata
- Provides lookup and search capabilities
- Supports cross-module discovery

**Section sources**
- [ModuleExports.ts:31-309](file://src/core/ModuleExports.ts#L31-L309)

### Module Definition Pattern
Each module defines its identity, navigation, dependencies, and capabilities through a moduleDefinition file. The administration module exemplifies this pattern with:
- Navigation items mapped to page components
- Optional dependencies on other modules
- Feature flags and settings

**Section sources**
- [administration moduleDefinition.tsx:35-184](file://src/modules/administration/moduleDefinition.tsx#L35-L184)

### Module Federation and Type Safety
Modules contribute to the central system by:
- Declaring dependencies and optional dependencies with semver constraints
- Providing services, entities, hooks, and components
- Defining capabilities (offline support, backend requirements, multi-tenancy, sync, real-time)
- Using shared TypeScript interfaces for type safety across module boundaries

**Section sources**
- [module.ts:15-398](file://src/core/types/module.ts#L15-L398)
- [moduleRegistration.ts:60-124](file://src/core/moduleRegistration.ts#L60-L124)

## Dependency Analysis
The system enforces dependency management with version constraints and resolves loading order to prevent circular dependencies. The module configuration demonstrates inter-module dependencies (e.g., reports depends on administration, academics, and finance).

```mermaid
graph TB
A["Administration"] --> R["Reports"]
AC["Academics"] --> R
F["Finance"] --> R
A --> AC
A --> F
A --> HR["HR"]
A --> N["Nutrition"]
```

**Diagram sources**
- [modules.json:67-74](file://src/config/modules.json#L67-L74)

**Section sources**
- [modules.json:1-74](file://src/config/modules.json#L1-L74)
- [DependencyResolver.ts:119-158](file://src/core/DependencyResolver.ts#L119-L158)

## Performance Considerations
- Parallel loading: ModuleRegistry supports parallel initialization based on dependency levels to reduce startup time.
- Retry and timeout: ModuleLoader applies retry attempts with exponential backoff-like delays and configurable timeouts.
- Lazy loading: Modules are loaded on demand via factories, minimizing initial bundle size.
- Caching: ServiceRegistry caches singleton instances to avoid repeated initialization overhead.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Circular dependencies: Detected during dependency resolution; fix by adjusting module dependencies.
- Module load failures: Investigate retry logs and error emissions from ModuleLoader.
- Service initialization errors: Check ServiceRegistry events and factory dependencies.
- Export validation failures: Review ModuleExportsManager validation results for undeclared or missing exports.

**Section sources**
- [moduleRegistry.ts:112-133](file://src/core/moduleRegistry.ts#L112-L133)
- [moduleLoader.ts:162-179](file://src/core/moduleLoader.ts#L162-L179)
- [ServiceRegistry.ts:110-114](file://src/core/ServiceRegistry.ts#L110-L114)
- [ModuleExports.ts:210-270](file://src/core/ModuleExports.ts#L210-L270)

## Conclusion
SchoolPilot3’s modular architecture enables scalable, maintainable, and type-safe development across business domains. Through module federation, dynamic loading, lifecycle management, and robust dependency resolution, the system supports flexible growth and integration. The standardized module structure and strict type contracts ensure predictable inter-module communication and reliable system behavior.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Module Structure Standards
- Standard structure: components/, data/, hooks/, i18n/, pages/, services/, strategies/, index.ts, lifecycle.ts, moduleDefinition.tsx, module.json, rbac.ts
- Subdirectory guidelines: Use subdirectories for distinct feature areas with multiple related files
- Cross-module dependencies: Prefer shared data hooks and service access over direct imports

**Section sources**
- [MODULE_STRUCTURE_STANDARD.md:1-109](file://docs/architecture/MODULE_STRUCTURE_STANDARD.md#L1-L109)

### Module Registration and Initialization
- Dynamic factories: ModuleRegistration registers factories for all modules and converts module definitions to LoadedModule format
- Batch registration: Modules can be registered and initialized in dependency order
- Auto-enable: Modules can be automatically enabled upon registration

**Section sources**
- [moduleRegistration.ts:129-230](file://src/core/moduleRegistration.ts#L129-L230)
- [moduleRegistry.ts:72-102](file://src/core/moduleRegistry.ts#L72-L102)

### Inter-Module Communication Patterns
- Services: Use ServiceRegistry to register and retrieve cross-module services
- Exports: Use ModuleExportsManager to register and validate exports; search and find services across modules
- Navigation: Dynamic navigation items are built from enabled modules’ metadata

**Section sources**
- [ServiceRegistry.ts:47-114](file://src/core/ServiceRegistry.ts#L47-L114)
- [ModuleExports.ts:144-172](file://src/core/ModuleExports.ts#L144-L172)
- [moduleLoader.ts:451-515](file://src/core/moduleLoader.ts#L451-L515)

### Example: Creating a New Module
Steps to create a new module:
1. Define module metadata in moduleDefinition.tsx with id, name, navigation, dependencies, and optionalDependencies
2. Declare exports (services, entities, hooks, components, utils, types) and register them via ModuleExportsManager
3. Register the module with ModuleRegistry and initialize services with ServiceRegistry
4. Integrate navigation and settings as needed

**Section sources**
- [administration moduleDefinition.tsx:35-184](file://src/modules/administration/moduleDefinition.tsx#L35-L184)
- [ModuleExports.ts:38-51](file://src/core/ModuleExports.ts#L38-L51)
- [ServiceRegistry.ts:47-62](file://src/core/ServiceRegistry.ts#L47-L62)

### Dependency Declaration and Version Constraints
- Required dependencies: Must be present and enabled before the dependent module can be enabled
- Optional dependencies: Enhance functionality but are not required
- Version constraints: Semver ranges define compatibility requirements

**Section sources**
- [module.ts:15-39](file://src/core/types/module.ts#L15-L39)
- [moduleRegistration.ts:71-83](file://src/core/moduleRegistration.ts#L71-L83)

### Integration with Central Database Schema
Modules declare schemas and migrations in their metadata. The central database schema evolves through module contributions, with migrations managed per module and validated during registration.

**Section sources**
- [module.ts:209-215](file://src/core/types/module.ts#L209-L215)
- [moduleRegistration.ts:84-85](file://src/core/moduleRegistration.ts#L84-L85)

### External Dependencies and Tooling
- Package dependencies: Managed via package.json with extensive libraries for UI, data, and integrations
- Scripts: Linting, testing, and migration helpers support modular development workflows

**Section sources**
- [package.json:66-161](file://package.json#L66-L161)