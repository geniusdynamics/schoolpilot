# SchoolPilot3 - Architecture Overview

## 1. Introduction

This document outlines the high-level architecture of SchoolPilot3, a comprehensive school management system. SchoolPilot3 is a React-based application designed to be robust, maintainable, and scalable. It features a modular architecture with a sophisticated data layer supporting multiple database providers, a plugin system for extensibility, and a tabbed workspace for enhanced user experience.

## 2. Core Technologies

*   **React 18+**: Modern UI framework with concurrent features and hooks
*   **TypeScript 5+**: Static typing for improved code quality and maintainability
*   **Tailwind CSS**: Utility-first CSS styling framework
*   **React Router DOM v6+**: Client-side routing with nested route support
*   **Zustand**: Lightweight state management for global and tab state
*   **RxDB/PouchDB/SQLite**: Multi-provider database system for different deployment scenarios
*   **RxJS**: Reactive programming for observable data streams
*   **i18next & react-i18next**: Internationalization with namespace support
*   **Go WASM**: High-performance computation engines compiled to WebAssembly
*   **Vite**: Modern build tool with fast HMR and optimized production builds

## 3. Application Structure

The application follows a modular, component-based architecture:

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Button, Modal, Table, etc.)
│   ├── layout/          # Layout components (PageContainer, PageHeader)
│   ├── tabbedWorkspace/ # Tab system components
│   ├── PrimarySidebar.tsx
│   ├── SecondarySidebar.tsx
│   └── TopOverflowMenu.tsx
├── pages/               # Top-level page components
├── contexts/            # React Context providers
│   ├── AppDataContext.tsx
│   ├── AuthContext.tsx
│   └── DataSourceContext.tsx
├── hooks/               # Custom React hooks
│   ├── tabs/            # Tab-related hooks
│   └── useDynamicNavigation.ts
├── services/            # Business logic services
│   ├── database/        # Database providers and management
│   ├── tabs/            # Tab services
│   ├── sync/            # Data synchronization
│   └── dataGeneration/  # Mock data generation
├── modules/             # Feature modules (self-contained)
│   ├── academics/
│   ├── finance/
│   ├── administration/
│   └── ...
├── plugins/             # Plugin system
│   ├── PluginManager.ts
│   ├── BuiltinLoader.ts
│   └── builtin/         # Built-in plugins
├── stores/              # Zustand stores
│   ├── tabStore.ts
│   └── adapters/
├── config/              # Configuration system
│   ├── unifiedConfig.ts
│   └── databaseConfigSchema.ts
├── types/               # TypeScript type definitions
│   ├── tabbedWorkspace.ts
│   └── hierarchical.ts
└── i18n/                # Internationalization
```

## 4. Core Architectural Systems

### 4.1. Tabbed Workspace System

The tabbed workspace provides a modern, browser-like navigation experience:

**Key Components:**
- **TabbedWorkspace** (`src/components/tabbedWorkspace/TabbedWorkspace.tsx`): Main container
- **TabBar** (`src/components/tabbedWorkspace/TabBar.tsx`): Drag-and-drop tab navigation
- **TabStore** (`src/stores/tabStore.ts`): Zustand-based state management
- **Tab Services** (`src/services/tabs/`): URL sync, persistence, validation

**Features:**
- Drag-and-drop tab reordering
- Tab state persistence (scroll position, form data, filters)
- Hierarchical sub-tabs for complex workflows
- Context menu with actions (duplicate, close, pin)
- RBAC-based tab access control
- Keyboard shortcuts (Ctrl+Tab, Ctrl+W)
- Tab overflow handling with dropdown menu

**State Flow:**
```
User Action → TabStore → Persistence Adapter → localStorage
                    ↓
              Tab Services → URL Sync
```

### 4.2. Plugin System

A comprehensive plugin architecture enabling extensibility:

**Core Components:**
- **PluginManager** (`src/plugins/PluginManager.ts`): Lifecycle management
- **BuiltinLoader** (`src/plugins/BuiltinLoader.ts`): Auto-discovery of built-in plugins
- **PluginsProvider** (`src/plugins/PluginsProvider.tsx`): React context
- **PluginMarketplace** (`src/services/PluginMarketplace.ts`): Marketplace integration

**Plugin Types:**
- `module` - Full feature modules
- `theme` - Visual customization
- `integration` - External service connections
- `report` - Custom report templates
- `widget` - Dashboard widgets
- `whitelabel` - Branding customization
- `engine` - Go WASM computation engines

**Security Model:**
- Tiered sandboxing (Trusted, Verified, Community)
- Permission-based access control
- Hook timeout and circuit breaker protection
- Code validation for dangerous patterns

**Builtin Plugins:**
- `fee-calculator` - Fee calculation engine
- `grading-engine` - Advanced grading calculations
- `whitelabel` - Branding and white-label support

### 4.3. Data Layer Architecture

Multi-provider database system with automatic fallback:

**Providers:**
1. **SQLite WASM** - Browser-based SQLite with OPFS
2. **PouchDB** - CouchDB-compatible with sync
3. **RxDB** - Reactive database with RxJS
4. **Backend API** - External backend integration
5. **Hybrid** - Combined providers for redundancy

**Core Components:**
- **UnifiedDatabaseManager** (`src/services/database/UnifiedDatabaseManager.ts`): Central coordinator
- **DatabaseProviderFactory** (`src/services/database/DatabaseProviderFactory.ts`): Provider creation
- **ProviderSelector** (`src/services/database/ProviderSelector.ts`): Automatic selection
- **CapabilityDetector** (`src/services/database/detection/CapabilityDetector.ts`): Environment detection

**Provider Selection Logic:**
```
Initialize → Detect Capabilities → Select Provider → Fallback Chain
                ↓
        SQLite WASM (preferred for browser)
        ↓ (fallback)
        PouchDB
        ↓ (fallback)
        RxDB
        ↓ (fallback)
        Backend API
```

**Monitoring & Performance:**
- **HealthChecker** - Database health monitoring
- **MetricsCollector** - Performance metrics
- **CircuitBreaker** - Failure protection
- **ConnectionPool** - Resource optimization

### 4.4. Unified Configuration System

Centralized configuration management:

**Components:**
- **unifiedConfig.ts** (`src/config/unifiedConfig.ts`): Single source of truth
- **ConfigurationMigration** (`src/config/ConfigurationMigration.ts`): Migration utilities
- **databaseConfigSchema.ts** (`src/config/databaseConfigSchema.ts`): Schema validation

**Configuration Sources (priority order):**
1. Environment variables
2. Configuration files
3. Local storage
4. Default values

**Feature Flags:**
- **tabbedModeFeatureFlag.ts** (`src/services/tabbedModeFeatureFlag.ts`): Tab system enablement
- Per-module feature control
- Environment-based configuration

## 5. Navigation System

Modern navigation with multiple components:

**PrimarySidebar** (`src/components/PrimarySidebar.tsx`):
- Module icons and navigation
- Fixed positioning with logo
- Collapsible on mobile

**SecondarySidebar** (`src/components/SecondarySidebar.tsx`):
- Contextual navigation based on active module
- Dynamic content based on routes

**TopOverflowMenu** (`src/components/TopOverflowMenu.tsx`):
- Additional actions and navigation
- Responsive overflow handling
- Integration with tab system

**BreadcrumbNavigation** (`src/components/BreadcrumbNavigation.tsx`):
- Hierarchical location indicator
- Clickable navigation history

## 6. State Management

**Zustand Stores:**
- **tabStore** - Tab state and persistence
- **authStore** - Authentication state
- **configStore** - Configuration state

**React Contexts:**
- **AppDataContext** - Data layer abstraction
- **AuthContext** - Authentication and RBAC
- **DataSourceContext** - Data source management
- **PluginsProvider** - Plugin system context

**Data Flow:**
```
UI Components → Hooks → Services → Database Providers
     ↑                                      ↓
     └─────────── Reactive Updates ←────────┘
```

## 7. Internationalization (i18n)

- **i18next** with namespace support
- Modular translation files in `src/i18n/locales/`
- Module-specific namespaces (e.g., `academics.json`, `finance.json`)
- Dynamic loading of translation resources
- `useTranslation` hook for component access

## 8. Security Architecture

**RBAC (Role-Based Access Control):**
- **RBACEngine** (`src/rbac/RBACEngine.ts`): Core authorization
- **rbacService** (`src/core/rbacService.ts`): Service layer
- Route-level and component-level protection

**Plugin Security:**
- Sandboxed execution environments
- Permission-based access control
- Hook timeout protection
- Code validation

**Data Security:**
- Input validation and sanitization
- Audit logging
- Encryption at rest (optional)

## 9. Performance Optimizations

**Tabbed Workspace:**
- Lazy loading of tab content
- Memoization of tab components
- Virtual scrolling for many tabs
- Render loop prevention

**Database:**
- Connection pooling
- Query caching
- Indexed query optimization
- Batch operations

**General:**
- Code splitting by route
- Tree shaking
- Asset optimization
- Service worker caching

## 10. Development Architecture

**Module System:**
Each module is self-contained with:
- `data/types.ts` - TypeScript interfaces
- `data/schema.ts` - Database schemas
- `data/mockData.ts` - Development data
- `pages/` - Module pages
- `components/` - Module-specific components

**Development Modes:**
- **Demo Mode** - Mock data, no persistence
- **Development Mode** - Local database with dev tools
- **Production Mode** - Full database with optimizations

This architecture enables:
- Clean separation of concerns
- Modular development and testing
- Scalable feature additions
- Multiple deployment scenarios
- Extensive customization through plugins
