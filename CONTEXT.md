# SchoolPilot3 - Enterprise Education Management System

> A comprehensive, modular school management platform built with React 19, TypeScript 5, and cutting-edge web technologies. Features a sophisticated multi-tier database architecture supporting everything from single-computer deployments to cloud-scale SaaS operations.

[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![RxDB](https://img.shields.io/badge/RxDB-Reactive-8D1F89)](https://rxdb.info)
[![Tests](https://img.shields.io/badge/Tests-Vitest-6E9F18?logo=vitest)](https://vitest.dev)

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Architecture Overview](#architecture-overview)
- [Technical Innovations](#technical-innovations)
- [Multi-Tier Database Architecture](#multi-tier-database-architecture)
- [Module System](#module-system)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Development Guide](#development-guide)
- [Testing Strategy](#testing-strategy)
- [Deployment Options](#deployment-options)
- [API Reference](#api-reference)
- [Contributing](#contributing)

---

## Executive Summary

SchoolPilot3 is an enterprise-grade Education Management System (EMS) designed for schools, colleges, and educational institutions of all sizes. Built with modern web technologies and architectural patterns, it provides a complete solution for managing students, staff, academics, finances, inventory, library, and more.

### Key Differentiators

- **Multi-Tier Database Architecture**: Seamlessly scales from single-computer SQLite deployments to cloud-scale PostgreSQL with CouchDB sync
- **True Offline-First**: PouchDB enables complete offline functionality with automatic synchronization
- **Modular Domain Design**: 15+ self-contained business modules with clear boundaries
- **Advanced TypeScript Architecture**: 1,400+ lines of centralized type definitions with zero `any` types
- **Enterprise RBAC**: Granular role-based access control with permission inheritance
- **Real-time Reactivity**: RxDB-powered observable data streams for instant UI updates

---

## Architecture Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SchoolPilot3 Application                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         React Application (React 19)                  │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │                      Provider Hierarchy                        │  │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │  │   │
│  │  │  │Unified  │ │ Network │ │   Auth  │ │  User   │ │  App    │  │  │   │
│  │  │  │Config   │ │Provider │ │Provider │ │Provider │ │  Data   │  │  │   │
│  │  │  │Provider │ │         │ │         │ │         │ │Provider │  │  │   │
│  │  │  └────┬────┘ └─────────┘ └─────────┘ └─────────┘ └────┬────┘  │  │   │
│  │  │       └──────────────────┬────────────────────────────┘       │  │   │
│  │  │                          │                                    │  │   │
│  │  │              ┌───────────┴───────────┐                        │  │   │
│  │  │              │   StableAction      │                        │  │   │
│  │  │              │     Provider        │                        │  │   │
│  │  │              └─────────────────────┘                        │  │   │
│  │  └─────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Module System (15+ Modules)                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │Academics │ │   HR     │ │Inventory │ │   Admin  │ │ Finance  │   │   │
│  │  │  (101)   │ │  (34)    │ │  (59)    │ │  (110)   │ │  (66)    │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Library  │ │ Nutrition│ │  Portal  │ │ Reports  │ │Admissions│   │   │
│  │  │  (38)    │ │  (37)    │ │  (27)    │ │  (42)    │ │  (22)    │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Service Layer                                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ Database│ │   Data  │ │  Sync   │ │   Tab   │ │ Plugin  │       │   │
│  │  │ Manager │ │ Service │ │ Service │ │ Service │ │ Service │       │   │
│  │  │ (63)    │ │  (17)   │ │  (5)    │ │  (11)   │ │  (4)    │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ Database Providers
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Database Layer (4 Providers)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐     │
│  │ SQLite WASM │  │   PouchDB   │  │    RxDB     │  │  Backend API    │     │
│  │  + OPFS     │  │  + CouchDB  │  │  + CouchDB  │  │  (ERPNext/      │     │
│  │  (Browser)   │  │  (Sync)     │  │ (Reactive)  │  │   Custom)       │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Innovations

### 1. Advanced TypeScript Architecture

```typescript
// Polymorphic Components with TypeScript 5.7
interface ButtonProps<T extends React.ElementType = 'button'> {
  as?: T;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

type PolymorphicButtonProps<T extends React.ElementType> = 
  ButtonProps<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof ButtonProps<T>>;

export function Button<T extends React.ElementType = 'button'>(
  props: PolymorphicButtonProps<T>
) {
  // Full type inference and IntelliSense support
}

// Usage with complete type safety
<Button<'a'> as="a" href="/dashboard" variant="primary">
  Dashboard
</Button>
<Button<'button'> onClick={handleClick} variant="secondary">
  Submit
</Button>
```

**Features:**
- **Generic UI Components**: Sophisticated type inference and runtime safety
- **1,400+ Lines of Centralized Types**: `@/core/types/` domain-driven type organization
- **Module Federation**: Distributed schema definitions with central aggregation
- **Zero `any` Types**: Comprehensive type coverage with strict configuration

### 2. Multi-Provider Database Architecture

The system implements a sophisticated **DatabaseProviderFactory** pattern that enables seamless switching between storage backends:

| Provider | Use Case | Persistence | Sync | Best For |
|----------|----------|-------------|------|----------|
| **SQLite WASM + OPFS** | Single-computer | Browser OPFS | None | Desktop-like experience |
| **PouchDB + CouchDB** | LAN deployment | IndexedDB | Automatic | Multi-user offline-first |
| **RxDB + CouchDB** | Advanced sync | Multiple | Reactive | Real-time collaboration |
| **Backend API** | Cloud/SaaS | PostgreSQL | API-based | Enterprise deployments |

### 3. The "Switchboard" Pattern (AppDataContext)

```typescript
// Unified data interface - components don't know the data source
const { 
  students, 
  addStudent, 
  updateStudent, 
  deleteStudent,
  collections  // 70+ reactive collections
} = useAppData();

// Reactive subscriptions in production mode
students.$.subscribe(updatedStudents => {
  // UI automatically updates when data changes
});

// Mock operations in demo mode
const newStudent = await addStudent(studentData);
// Simulated async with realistic delays
```

**Key Benefits:**
- **Source Agnostic**: UI components never know data source
- **Graceful Fallback**: Automatic degradation if database fails
- **Type Safety**: Full TypeScript coverage across all operations
- **Hot Swapping**: Switch modes without code changes

### 4. Modular Data Generator System

```typescript
// Module-specific data hooks with live data integration
const { 
  data: feeTemplates, 
  isLoading, 
  error,
  refresh 
} = useFeeTemplateData();

// Aggregated via useModularMockData
const allModuleData = useModularMockData();
// Combines data from all 15 modules automatically
```

**Features:**
- **40+ Entity Types**: Students, teachers, classes, subjects, fees, etc.
- **Realistic Relationships**: Proper foreign key relationships
- **Configurable Volume**: Adjustable data generation
- **CRUD Operations**: Full create, read, update, delete per module

---

## Multi-Tier Database Architecture

### Tier 1: Single Computer (SQLite WASM + OPFS)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              SQLite WASM + OPFS                         │  │
│  │   • No server required                                    │  │
│  │   • Data stored locally in browser's Origin Private FS    │  │
│  │   • Best performance (direct file access)               │  │
│  │   • Single user only                                    │  │
│  │   • Persistent across sessions                          │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Best For**: Standalone installations, single-administrator schools

### Tier 2: Local Network (PouchDB + CouchDB)

```
┌─────────────┐                              ┌─────────────────┐
│   Browser   │◄────── Local Network ───────►│    CouchDB      │
│  (PouchDB)  │        (WebSocket/HTTP)       │   (Server)      │
└──────┬──────┘                              └─────────────────┘
       │                                               ▲
       │              ┌─────────────────┐             │
       └─────────────►│   PouchDB       │───────────────┘
                      │   Replication   │
                      │   (Automatic)   │
                      └─────────────────┘
```

**Best For**: Schools with local network, offline-first requirements

### Tier 3: Cloud / SaaS (Backend API)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│   Browser   │◄──┬─►│  Backend API│◄──┬─►│   PostgreSQL    │
│             │   │  │  (ERPNext/   │   │  │   Database      │
│             │   │  │   Custom)    │   │  │                 │
└─────────────┘   │  └─────────────┘   │  └─────────────────┘
                  │                    │
                  └──── Real-time ─────┘
                       WebSocket/SSE
```

**Best For**: Multi-tenant SaaS, enterprise deployments

### Tier 4: Hybrid (Best of All Worlds)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│   Browser   │◄──┬─►│  Backend API│◄──┬─►│   PostgreSQL    │
│  (PouchDB)  │   │  │  (ERPNext)  │   │  │   Database      │
└──────┬──────┘   │  └─────────────┘   │  └─────────────────┘
       │          │         ▲          │           ▲
       │          │         │          │           │
       └──────────┴─────────┼──────────┴───────────┘
                            │
                     ┌──────┴──────┐
                     │  CouchDB    │
                     │  (LAN Sync) │
                     └─────────────┘
```

**Best For**: Schools needing offline capability with cloud backup

---

## Module System

SchoolPilot3 is organized into 15 self-contained business modules following **Domain-Driven Design** principles:

### Module Inventory

| Module | Files | Purpose | Key Features |
|--------|-------|---------|--------------|
| **Academics** | 101 | Curriculum & exams | Subjects, grading, timetabling, exam sessions |
| **Administration** | 110 | School operations | Students, staff, calendar, communications |
| **Finance** | 66 | Financial management | Fees, accounting, transport, procurement |
| **HR** | 34 | Human resources | Payroll, attendance, leave management |
| **Inventory** | 59 | Asset management | Stock, warehouses, procurement |
| **Library** | 38 | Library system | Catalog, circulation, fines |
| **Nutrition** | 37 | Meal management | Meal plans, student wallet |
| **Admissions** | 22 | Student intake | Applications, enrollment, documents |
| **Portal** | 27 | External access | Parent portal, student portal |
| **Reports** | 42 | Analytics | Student reports, financial summaries |
| **Settings** | 28 | System config | RBAC, workflows, database |
| **Dashboard** | 15 | Overview | Widgets, KPIs, quick actions |
| **Core** | 13 | Shared utilities | Types, utilities, common components |
| **Audit** | 1 | Compliance | Activity tracking |

### Module Structure

Each module follows a consistent structure:

```
src/modules/{module-name}/
├── index.ts                    # Module definition & registration
├── moduleDefinition.ts         # Module metadata & config
├── lifecycle.ts               # Module lifecycle hooks
├── routes.tsx                 # Route definitions
├── pages/                     # Page components
│   ├── index.tsx              # Page router
│   └── {Feature}Page.tsx      # Feature pages
├── data/                      # Data layer
│   ├── index.ts               # Hook exports
│   ├── types.ts               # Module types
│   ├── schema.ts              # RxDB schemas
│   ├── collections.ts         # Collection configs
│   └── use{Feature}Data.ts    # Data hooks
├── components/                # Module components
│   ├── {Component}.tsx
│   └── __tests__/
├── hooks/                     # Module-specific hooks
└── README.md                  # Module documentation
```

### Module Dependencies

Modules declare dependencies with semantic versioning:

```typescript
// src/modules/finance/moduleDefinition.ts
export const financeModule: ModuleDefinition = {
  id: 'finance',
  name: 'Finance',
  version: '1.0.0',
  dependencies: {
    required: [
      { moduleId: 'administration', version: '^1.0.0' },
      { moduleId: 'academics', version: '^1.0.0' }
    ],
    optional: [
      { moduleId: 'inventory', version: '^1.0.0' }
    ]
  },
  routes: financeRoutes,
  dataHooks: financeDataHooks,
  permissions: financePermissions
};
```

---

## Project Structure

```
schoolpilot3/
├── src/                          # Source code (15,000+ files)
│   ├── App.tsx                   # Application entry point
│   ├── components/              # Reusable UI components (173 items)
│   │   ├── ui/                   # Generic UI (60 items)
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Select.tsx        # 24KB - complex data grid integration
│   │   │   ├── Table.tsx
│   │   │   ├── Input.tsx         # 10KB - comprehensive form input
│   │   │   └── forms/            # Form components (14 items)
│   │   ├── Layout.tsx            # Main layout shell
│   │   ├── Sidebar.tsx           # Navigation sidebar (13KB)
│   │   ├── Header.tsx            # Application header
│   │   ├── tabbedWorkspace/     # Tab system (13 items)
│   │   └── settings/             # Settings components (6 items)
│   ├── contexts/                  # React contexts (32 items)
│   │   ├── UnifiedConfigContext.tsx   # 15KB - configuration management
│   │   ├── AppDataContext.tsx         # 67KB - data switchboard
│   │   ├── AppProviders.tsx           # Provider hierarchy
│   │   ├── AuthContext.tsx            # Authentication
│   │   ├── UserContext.tsx            # User session
│   │   ├── SyncContext.tsx            # Data synchronization
│   │   ├── NetworkContext.tsx         # Online/offline detection
│   │   └── StableActionProvider.tsx   # Toast notifications (10KB)
│   ├── core/                      # Core types & utilities
│   │   └── types/                 # Type definitions (7 files)
│   │       ├── index.ts           # Central export
│   │       ├── app-data.ts        # AppData types (10KB)
│   │       ├── module.ts          # Module types (8KB)
│   │       ├── crud.ts            # CRUD types (5KB)
│   │       └── enums.ts           # Enumeration types
│   ├── hooks/                     # Custom React hooks (65 items)
│   │   ├── useAppData.ts          # Data access hook
│   │   ├── useModularMockData.ts  # 40KB - modular data system
│   │   ├── useCrudFactory.ts      # 12KB - CRUD hook generator
│   │   ├── useDatabaseProvider.ts # 17KB - database switching
│   │   ├── useRBAC.ts             # 9KB - permission system
│   │   ├── useToast.tsx           # Toast notifications
│   │   ├── useModal.tsx           # Modal management
│   │   ├── useKanban.tsx          # 12KB - Kanban board state
│   │   ├── useTabNavigation.ts    # 19KB - tab system navigation
│   │   └── tabs/                  # Tab-specific hooks (3 items)
│   ├── modules/                   # Feature modules (594 items)
│   │   ├── academics/             # 101 items
│   │   ├── administration/        # 110 items
│   │   ├── finance/               # 66 items
│   │   ├── hr/                    # 34 items
│   │   ├── inventory/             # 59 items
│   │   ├── library/               # 38 items
│   │   ├── nutrition/             # 37 items
│   │   └── [11 more modules...]
│   ├── services/                  # Service layer (190 items)
│   │   ├── database/              # Database providers (63 items)
│   │   ├── data/                  # Data services (17 items)
│   │   ├── tabs/                  # Tab services (11 items)
│   │   ├── sync/                  # Sync services (5 items)
│   │   ├── auth/                  # Auth services (4 items)
│   │   ├── plugin/                # Plugin services (4 items)
│   │   └── backend/               # Backend detection (7 items)
│   ├── routing/                   # Routing configuration
│   │   ├── moduleRoutes.tsx       # Module route definitions (10KB)
│   │   ├── AppContent.tsx         # Route rendering (8KB)
│   │   └── ModuleRouteLoader.tsx  # Dynamic route loading
│   ├── i18n/                      # Internationalization (38 items)
│   │   ├── i18n.ts                # i18next configuration
│   │   ├── modularLoader.ts       # Modular translation loading
│   │   └── locales/               # Translation files
│   │       ├── en/                # English translations
│   │       └── fr/                # French translations
│   ├── config/                    # Configuration (33 items)
│   │   ├── unifiedConfig.ts       # Unified configuration system
│   │   └── backendArchitecture.ts # Backend architecture config
│   ├── utils/                     # Utilities (28 items)
│   └── stores/                    # Zustand stores (5 items)
├── tests/                         # Test files (46+ test files)
│   ├── integration/               # Integration tests
│   ├── performance/               # Performance tests
│   └── *.test.tsx                 # Component tests
├── docs/                          # Documentation (200+ files)
│   ├── architecture/              # Architecture docs (18 items)
│   ├── guides/                    # Developer guides (26 items)
│   ├── database/                  # Database docs (21 items)
│   ├── tabs/                      # Tab system docs (21 items)
│   ├── workflows/                 # Work logs (72 items)
│   └── README.md                  # Documentation index
├── scripts/                       # Utility scripts (40+ scripts)
│   ├── migration/                 # Data migration scripts (18 items)
│   ├── test/                      # Test scripts
│   └── *.ts                       # Various utilities
├── public/                        # Static assets
├── schemas/                       # JSON schemas
├── vitest.config.ts               # Vitest configuration
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind configuration
└── package.json                   # Dependencies

```

---

## Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.1.1 | UI framework with concurrent features |
| **TypeScript** | 5.7.2 | Type-safe development |
| **Vite** | 6.2.0 | Build tool & dev server |
| **React Router** | 6.23.1 | Client-side routing |

### State Management

| Technology | Purpose |
|------------|---------|
| **Zustand** | Global state (tabs, config) |
| **React Context** | Provider hierarchy |
| **RxDB** | Reactive database state |
| **RxJS** | Observable streams |

### Database & Storage

| Technology | Purpose |
|------------|---------|
| **RxDB** | Reactive NoSQL database |
| **PouchDB** | Offline-first sync |
| **SQLite WASM** | Browser-based SQL |
| **@sqlite.org/sqlite-wasm** | Official SQLite WASM |
| **@livestore/wa-sqlite** | WebAssembly SQLite |
| **Dexie** | IndexedDB wrapper |

### UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 3.4.4 | Utility-first styling |
| **MUI (Material-UI)** | 5.18.0 | Component library |
| **MUI X Data Grid** | 8.9.2 | Advanced data tables |
| **MUI X Date Pickers** | 8.9.2 | Date/time components |
| **Recharts** | 3.1.2 | Data visualization |
| **Framer Motion** | 12.23.12 | Animations |
| **Lucide React** | 0.294.0 | Icons |
| **Heroicons** | 2.2.0 | Additional icons |

### Forms & Validation

| Technology | Purpose |
|------------|---------|
| **React Hook Form** | Form state management |
| **Zod** | Schema validation |
| **Yup** | Alternative validation |

### Internationalization

| Technology | Version | Purpose |
|------------|---------|---------|
| **i18next** | 23.11.5 | i18n framework |
| **react-i18next** | 14.1.2 | React integration |
| **i18next-browser-languagedetector** | 8.0.0 | Language detection |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| **Vitest** | 3.2.4 | Unit testing |
| **React Testing Library** | 16.3.0 | Component testing |
| **Playwright** | 1.54.2 | E2E testing |
| **Happy DOM** | 18.0.1 | DOM simulation |

### Development Tools

| Technology | Purpose |
|------------|---------|
| **ESLint** | Linting |
| **tsx** | TypeScript execution |
| **@faker-js/faker** | Mock data generation |
| **date-fns** | Date manipulation |
| **lodash** | Utilities |
| **uuid** | UUID generation |
| **semver** | Version comparison |

### MCP Servers (AI Enhancement)

| Server | Purpose |
|--------|---------|
| **@modelcontextprotocol/server-puppeteer** | Web automation |
| **@modelcontextprotocol/server-sequential-thinking** | Multi-step reasoning |
| **mcp-deepwebresearch** | Web research |
| **firecrawl-mcp** | Web crawling |

---

## Getting Started

### Prerequisites

- **Node.js**: 18+ (20+ recommended)
- **Package Manager**: npm, pnpm, or yarn
- **Git**: For version control

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd schoolpilot3

# 2. Install dependencies
npm install
# or
pnpm install

# 3. Set up environment
copy .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY

# 4. Start development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:5200
```

### Environment Configuration

```bash
# .env.local
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_BACKEND_TYPE=frontend-only  # or 'frappe-education', 'custom-api', 'hybrid'
VITE_COUCHDB_URL=http://localhost:5984
VITE_API_URL=http://localhost:3000/api
```

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (port 5200)
npm run preview          # Preview production build

# Building
npm run build            # Production build

# Testing
npm run test             # Run Vitest tests
npm run test:run         # Run tests once
npm run test:ui          # Open Vitest UI

# Code Quality
npm run lint             # ESLint check
npm run lint:all         # Lint + file-size + module imports
npm run lint:modules     # Check cross-module imports
npm run typecheck        # TypeScript type checking

# Translations
npm run check-translations
npm run analyze-translations
npm run fix-translation-keys

# Database & Migration
npm run test-sqlite-implementation
npm run test-wasm-sqlite
npm run migrate-mock-data
npm run export-database
npm run explore-database

# MCP Servers
npm run verify-mcp-servers

# Self-Hosting Setup
npm run setup:self-hosted
```

---

## Development Guide

### 1. Understanding the Provider Hierarchy

```
App.tsx (Entry Point)
│
├── UnifiedConfigProvider     # Configuration & feature flags
│   ├── ToastProvider         # Global notifications
│   │   ├── Suspense          # i18n loading boundary
│   │   │   └── OnboardingGate  # First-run experience
│   │   │       └── AppInner    # Main application
│   │   │           ├── HashRouter
│   │   │           ├── NetworkProvider
│   │   │           ├── SyncProvider
│   │   │           ├── DataProviderWrapper
│   │   │           │   └── AppDataProvider
│   │   │           ├── AuthProvider
│   │   │           ├── UserProvider
│   │   │           └── StableActionProvider
```

### 2. Data Layer Patterns

#### Using the Unified Data API

```typescript
import { useAppData } from '@/hooks/useAppData';

function StudentList() {
  // Access any collection from any module
  const { 
    students, 
    staff, 
    classes,
    feeTemplates,
    addStudent,
    updateStudent,
    deleteStudent,
    isLoading,
    error 
  } = useAppData();

  // Reactive subscription (auto-updates UI)
  useEffect(() => {
    const subscription = students.$.subscribe(allStudents => {
      console.log('Students updated:', allStudents.length);
    });
    return () => subscription.unsubscribe();
  }, [students]);

  // CRUD operations
  const handleAdd = async (studentData) => {
    const newStudent = await addStudent(studentData);
    // newStudent is fully typed with all fields
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <StudentTable data={students} />;
}
```

#### Creating Module-Specific Data Hooks

```typescript
// src/modules/finance/data/useFeeTemplateData.ts
import { useAppData } from '@/hooks/useAppData';
import type { FeeTemplate } from './types';

export function useFeeTemplateData() {
  const { feeTemplates, addFeeTemplate, updateFeeTemplate, deleteFeeTemplate } = useAppData();

  // Add module-specific logic
  const getActiveTemplates = () => 
    feeTemplates.filter(t => t.isActive && new Date(t.validUntil) > new Date());

  const getTemplatesByProgram = (programId: string) =>
    feeTemplates.filter(t => t.programId === programId);

  return {
    data: feeTemplates,
    add: addFeeTemplate,
    update: updateFeeTemplate,
    delete: deleteFeeTemplate,
    getActiveTemplates,
    getTemplatesByProgram,
    isLoading: false, // From useAppData
    error: null       // From useAppData
  };
}
```

### 3. Component Development Patterns

#### Polymorphic Components

```typescript
// src/components/ui/Button.tsx
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for Tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Polymorphic button that can render as any element
type ButtonProps<T extends React.ElementType = 'button'> = {
  as?: T;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children'>;

export function Button<T extends React.ElementType = 'button'>({
  as,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  ...props
}: ButtonProps<T>) {
  const Component = as || 'button';

  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded',
    md: 'px-4 py-2 text-base rounded-md',
    lg: 'px-6 py-3 text-lg rounded-lg'
  };

  return (
    <Component
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading && <Spinner size="sm" className="mr-2" />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </Component>
  );
}
```

### 4. Form Development

```typescript
// Using the form validation framework
import { useFormValidation } from '@/hooks/useFormValidation';
import { z } from 'zod';

const studentSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  dateOfBirth: z.date().max(new Date(), 'Date of birth must be in the past'),
  classId: z.string().uuid('Please select a class')
});

type StudentFormData = z.infer<typeof studentSchema>;

function StudentForm({ onSubmit }: { onSubmit: (data: StudentFormData) => void }) {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    validateField,
    touchedFields
  } = useFormValidation(studentSchema);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField
        label="First Name"
        error={errors.firstName}
        touched={touchedFields.firstName}
      >
        <Input {...register('firstName')} />
      </FormField>

      <FormField
        label="Last Name"
        error={errors.lastName}
        touched={touchedFields.lastName}
      >
        <Input {...register('lastName')} />
      </FormField>

      <FormField
        label="Email"
        error={errors.email}
        touched={touchedFields.email}
      >
        <Input type="email" {...register('email')} />
      </FormField>

      <FormField
        label="Date of Birth"
        error={errors.dateOfBirth}
        touched={touchedFields.dateOfBirth}
      >
        <DatePicker {...register('dateOfBirth')} />
      </FormField>

      <FormField
        label="Class"
        error={errors.classId}
        touched={touchedFields.classId}
      >
        <ClassSelect {...register('classId')} />
      </FormField>

      <Button type="submit" isLoading={isSubmitting}>
        Save Student
      </Button>
    </form>
  );
}
```

### 5. Adding Translations

```typescript
// src/i18n/locales/en/student.json
{
  "student": {
    "title": "Students",
    "addNew": "Add New Student",
    "edit": "Edit Student",
    "fields": {
      "firstName": "First Name",
      "lastName": "Last Name",
      "email": "Email Address",
      "dateOfBirth": "Date of Birth",
      "class": "Class/Grade"
    },
    "validation": {
      "firstNameRequired": "First name is required",
      "emailInvalid": "Please enter a valid email"
    }
  }
}

// Usage in component
import { useTranslation } from 'react-i18next';

function StudentPage() {
  const { t } = useTranslation('student');

  return (
    <div>
      <h1>{t('student.title')}</h1>
      <Button>{t('student.addNew')}</Button>
      
      <FormField label={t('student.fields.firstName')}>
        <Input />
      </FormField>
    </div>
  );
}
```

---

## Testing Strategy

### Test Organization

```
tests/
├── integration/           # Integration tests
│   ├── UserFlowIntegration.test.tsx
│   └── DatabaseIntegration.test.tsx
├── performance/           # Performance tests
│   └── RenderCount.test.tsx
├── unit/                  # Unit tests
│   └── dataMode.test.ts
├── e2e/                   # Playwright E2E tests
│   └── auth.spec.ts
└── TabNavigation.test.tsx # Specific feature tests
```

### Running Tests

```bash
# Unit tests
npm run test

# With coverage
npm run test -- --coverage

# UI mode
npm run test:ui

# E2E tests
npx playwright test

# Specific test file
npm run test -- src/components/ui/Button.test.tsx
```

### Writing Tests

```typescript
// src/components/ui/__tests__/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders as different elements', () => {
    const { container } = render(
      <Button<'a'> as="a" href="/dashboard">
        Dashboard
      </Button>
    );
    expect(container.querySelector('a')).toHaveAttribute('href', '/dashboard');
  });

  it('applies variant styles', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.firstChild).toHaveClass('bg-red-600');
  });
});
```

### Integration Testing Pattern

```typescript
// tests/integration/StudentManagement.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProviders } from '@/contexts/AppProviders';
import { StudentListPage } from '@/modules/administration/pages/StudentListPage';

describe('Student Management Integration', () => {
  beforeEach(() => {
    // Reset database state
    // Seed test data
  });

  it('completes full student enrollment flow', async () => {
    render(
      <AppProviders>
        <StudentListPage />
      </AppProviders>
    );

    // 1. Navigate to students
    // 2. Click add new
    // 3. Fill form
    // 4. Submit
    // 5. Verify in list
    // 6. Edit student
    // 7. Delete student
    // 8. Verify removed
  });
});
```

---

## Deployment Options

### Option 1: Static Hosting (Vercel/Netlify)

```bash
# Build for static hosting
npm run build

# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

**Pros**: Simple, free tier available, global CDN
**Cons**: Database limited to browser storage

### Option 2: Self-Hosted with CouchDB

```bash
# 1. Setup CouchDB
docker run -d -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password couchdb

# 2. Configure CORS
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/httpd/enable_cors -d '"true"'

# 3. Build application
npm run build

# 4. Serve with nginx/apache
# Or use the built-in preview
npm run preview
```

**Pros**: Full offline support, multi-user, data sync
**Cons**: Requires server infrastructure

### Option 3: ERPNext Integration

```bash
# Configure for Frappe Education
VITE_BACKEND_TYPE=frappe-education
VITE_FRAPPE_API_URL=https://your-erpnext-instance.com/api
VITE_FRAPPE_AUTH_URL=https://your-erpnext-instance.com/api/method/login

# Build
npm run build
```

**Pros**: Enterprise features, existing ERP integration
**Cons**: Requires ERPNext backend

### Option 4: Hybrid Deployment

```bash
# Local-first with cloud backup
VITE_BACKEND_TYPE=hybrid
VITE_COUCHDB_URL=http://local-couchdb:5984
VITE_API_URL=https://cloud-api.example.com/api

# Build
npm run build
```

**Pros**: Best of both worlds - offline capability + cloud sync
**Cons**: More complex setup

---

## API Reference

### AppDataContext API

The central data interface used by all components:

```typescript
interface AppDataContextValue {
  // Collections (70+ reactive collections)
  students: RxCollection<Student>;
  staff: RxCollection<Staff>;
  classes: RxCollection<Class>;
  academicYears: RxCollection<AcademicYear>;
  // ... 60+ more collections

  // CRUD Operations
  addStudent: (data: StudentInput) => Promise<Student>;
  updateStudent: (id: string, data: Partial<StudentInput>) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;
  // ... similar for all entities

  // Data Management
  refreshData: () => Promise<void>;
  backupData: () => Promise<BackupData>;
  restoreData: (backup: BackupData) => Promise<void>;
  exportData: (format: 'json' | 'csv') => Promise<string>;
  
  // State
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
}
```

### Hook API Reference

```typescript
// useAppData - Access all data
const appData = useAppData();

// useRBAC - Permission checking
const { can, user, roles } = useRBAC();
const canEditStudents = can('student', 'edit');

// useToast - Notifications
const toast = useToast();
toast.success('Student saved successfully');
toast.error('Failed to save student');

// useModal - Modal management
const modal = useModal();
modal.open(<StudentForm />, { title: 'Add Student' });

// useDatabaseProvider - Database switching
const { currentProvider, switchProvider, providers } = useDatabaseProvider();

// useTabNavigation - Tab management
const { openTab, closeTab, activeTab, tabs } = useTabNavigation();
openTab({ id: 'student-123', title: 'John Doe', component: StudentDetail });

// useUnifiedConfig - Configuration
const { config, updateConfig, switchDataMode } = useUnifiedConfig();
```

---

## Contributing

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow existing code patterns
   - Add types for all new code
   - Include tests for new functionality
   - Update documentation

3. **Quality Checks**
   ```bash
   npm run lint:all          # Lint everything
   npm run typecheck         # Type checking
   npm run test:run          # Run tests
   ```

4. **Commit**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push & PR**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request
   ```

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **Components**: Use functional components with hooks
- **Styling**: Tailwind CSS utility classes
- **Testing**: Vitest + React Testing Library
- **Documentation**: JSDoc for public APIs

### Commit Message Format

```
feat: add new feature
fix: fix bug in feature
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add or update tests
chore: maintenance tasks
```

---

## Documentation

Comprehensive documentation is available in the `docs/` directory:

| Document | Purpose |
|----------|---------|
| `docs/architecture/architecture.md` | System architecture overview |
| `docs/guides/onboarding.md` | New developer setup |
| `docs/guides/data-dev-guide.md` | Data layer development |
| `docs/database/README.md` | Database documentation |
| `docs/tabs/README_TABBED_WORKSPACE.md` | Tab system guide |
| `docs/guides/PLUGIN_DEVELOPMENT_MANUAL.md` | Creating plugins |
| `docs/SELF_HOSTING_DEPLOYMENT.md` | Deployment guide |

---

## License

This project is proprietary software. All rights reserved.

---

## Support

For technical support and questions:

- **Documentation**: Check `docs/` directory
- **Issues**: Review existing documentation first
- **Architecture**: See `docs/architecture/`
- **API Reference**: See inline JSDoc comments

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

<p align="center">
  <strong>Built with ❤️ for Education</strong><br>
  <sub>SchoolPilot3 - Empowering Educational Institutions Worldwide</sub>
</p>
