# System Architecture Diagrams

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SchoolPilot3 Application                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         React Application                              │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │                      AppProviders                                │  │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │  │   │
│  │  │  │ Network │ │  Sync   │ │   Auth  │ │  User   │ │  App    │ │  │   │
│  │  │  │Provider │ │Provider │ │Provider │ │Provider │ │  Data   │ │  │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │Provider │ │  │   │
│  │  │                                           ┌─────┴─────────┘ │  │   │
│  │  │                                           │  StableAction   │  │   │
│  │  │                                           │   Provider     │  │   │
│  │  └───────────────────────────────────────────┴────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Module System                                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │Academics │ │   Fin.   │ │Inventory │ │   Admin  │ │Reports   │   │   │
│  │  │          │ │          │ │          │ │          │ │          │   │   │
│  │  │ • Exams  │ │ • Fees   │ │ • Store  │ │ • Staff  │ │ • Charts │   │   │
│  │  │ •Attend. │ │ • Ledger │ │ • Suppl. │ │ • Students│ │ • Tables │   │   │
│  │  │ • Timetab│ │ • Invoice│ │ • Items  │ │ • Health │ │ • Export │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       Service Layer                                     │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ Database│ │   Data  │ │  Sync   │ │   ERP   │ │   Data  │       │   │
│  │  │ Manager │ │ Service │ │ Service │ │  Next   │ │  Gen.   │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ Database Providers
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Database Layer                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ SQLite WASM  │  │   PouchDB   │  │    RxDB     │  │ Backend API │       │
│  │  (Browser)   │  │  + CouchDB  │  │  + CouchDB  │  │  (ERPNext)  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Provider Composition Flow

```
App.tsx
    │
    ▼
AppProviders
    │
    ├──► HashRouter          (Routing)
    │         │
    │         ▼
    │    Routes
    │
    ├──► NetworkProvider     (Online/Offline detection)
    │
    ├──► SyncProvider        (Data synchronization)
    │
    ├──► DataProviderWrapper
    │         │
    │         ├──► useUnifiedConfig()   (Configuration)
    │         │
    │         ├──► featureFlags         (Feature toggles)
    │         │
    │         ├──► uds.initialize()     (Data Service)
    │         │
    │         └──► AppDataProvider (lazy loaded)
    │                   │
    │                   ▼
    │              AppDataContext
    │                   │
    │                   ▼
    │         ┌────────┴────────┐
    │         │                 │
    │         ▼                 ▼
    │    Collections      Database Operations
    │    (students,       (CRUD via
    │     staff, etc.)     UnifiedDatabaseManager)
    │
    ├──► AuthProvider     (Authentication)
    │
    ├──► UserProvider     (User session)
    │
    ├──► ErrorBoundary    (Error handling)
    │
    └──► StableActionProvider  (Toast notifications)
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface                               │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐      │
│   │  Module   │  │  Module   │  │  Module   │  │  Module   │      │
│   │  Pages    │  │  Pages    │  │  Pages    │  │  Pages    │      │
│   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘      │
└─────────┼───────────────┼───────────────┼───────────────┼───────────┘
          │               │               │               │
          └───────────────┴───────┬───────┴───────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Hook Layer                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  useAppData()  │  useAuth()  │  useUnifiedConfig()  │ ... │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Context Layer                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    AppDataContext                            │   │
│   │   • Collections (students, staff, classes, etc.)            │   │
│   │   • CRUD operations                                          │   │
│   │   • Data loading/refresh                                     │   │
│   │   • Backup/restore                                           │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Service Layer                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              UnifiedDatabaseManager                           │   │
│   │   • DatabaseProviderFactory.selectProvider()                 │   │
│   │   • Auto-detect or manual provider selection                 │   │
│   │   • Connection management                                    │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Database Providers                                │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐   │
│   │ SQLite WASM │  │   PouchDB   │  │    RxDB     │  │ Backend  │   │
│   │             │◄─►  +CouchDB  │◄─►  +CouchDB  │◄─►   API   │   │
│   │  (OPFS)     │  │  (Sync)     │  │  (Reactive)│  │(ERPNext)│   │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Module Template                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   src/modules/{domain}/                                              │
│   ├── index.ts                    # Module definition & registration │
│   ├── routes.tsx                  # Route definitions               │
│   ├── pages/                      # Page components                 │
│   │   ├── index.tsx               # Page router                     │
│   │   └── {Feature}Page.tsx       # Feature pages                  │
│   ├── data/                       # Data hooks                      │
│   │   ├── index.ts                # Hook exports                    │
│   │   ├── use{Feature}Data.ts     # Data fetching hooks            │
│   │   └── types.ts                # Type definitions                │
│   ├── components/                 # Feature components              │
│   │   ├── {Component}.tsx         # UI components                  │
│   │   └── {Component}.test.tsx    # Component tests                │
│   └── __tests__/                  # Integration tests               │
│       └── {Feature}.test.tsx      # Feature tests                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Deployment Tiers

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Tier 1: Single Computer                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                        Browser                                 │  │
│  │   ┌─────────────────────────────────────────────────────┐    │  │
│  │   │              SQLite WASM + OPFS                       │    │  │
│  │   │   • No server required                                │    │  │
│  │   │   • Data stored locally in browser                    │    │  │
│  │   │   • Best performance                                  │    │  │
│  │   │   • Single user only                                  │    │  │
│  │   └─────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Tier 2: Local Network                             │
│  ┌─────────────┐                              ┌─────────────────┐    │
│  │   Browser   │◄────── Local Network ───────►│    CouchDB      │    │
│  │  (PouchDB)  │                              │   (Server)      │    │
│  └─────────────┘                              └─────────────────┘    │
│        │                                               ▲            │
│        │              ┌─────────────────┐                │            │
│        └─────────────►│   PouchDB       │────────────────┘            │
│                       │   Replication   │                              │
│                       └─────────────────┘                              │
│                                                                          │
│  • Multi-user support                                                   │
│  • Offline-first capability                                              │
│  • Automatic sync when connected                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Tier 3: Cloud / SaaS                               │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────────┐       │
│  │   Browser   │◄───►│  Backend API │◄───►│   Database      │       │
│  │             │      │  (ERPNext)  │      │   (PostgreSQL)  │       │
│  └─────────────┘      └─────────────┘      └─────────────────┘       │
│                                                                          │
│  • Full cloud functionality                                             │
│  • Real-time sync                                                       │
│  • Centralized data management                                          │
│  • Access from anywhere                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Tier 4: Hybrid                                     │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────────┐       │
│  │   Browser   │◄──┬─►│  Backend API│◄──┬─►│   Database      │       │
│  │  (PouchDB)  │   │  │  (ERPNext)  │   │  │   (PostgreSQL)  │       │
│  └─────────────┘   │  └─────────────┘   │  └─────────────────┘       │
│        │           │         ▲           │           ▲                 │
│        │           │         │           │           │                  │
│        └───────────┴─────────┼┴──────────┴───────────┘                  │
│                              │                                         │
│                       ┌──────┴──────┐                                   │
│                       │  CouchDB    │                                   │
│                       │  (LAN Sync) │                                   │
│                       └─────────────┘                                   │
│                                                                          │
│  • Offline-first with local PouchDB                                     │
│  • LAN sync for local network users                                     │
│  • Cloud sync when available                                             │
│  • Best of all worlds                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Context Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Application                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      UnifiedConfigContext                             │
│   • Configuration state                                               │
│   • Environment detection                                             │
│   • Feature flags                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────────┐
│        AppDataContext        │   │        AuthContext               │
│                             │   │                                  │
│  Collections:               │   │  • isAuthenticated               │
│  • students                 │   │  • currentUser                   │
│  • staff                    │   │  • login/logout                   │
│  • classes                  │   │  • RBAC permissions               │
│  • academic_years           │   │                                  │
│  • exam_sessions            │   └─────────────────────────────────┘
│  • ... (70+ total)          │
│                             │
│  Operations:                │   ┌─────────────────────────────────┐
│  • add/update/delete        │   │        UserContext               │
│  • backup/restore           │   │                                  │
│  • data generation          │   │  • user profile                  │
│  • validation               │   │  • preferences                   │
│                             │   │  • session management           │
└─────────────────────────────┘   └─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Database Providers (via hook)                      │
│   ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐            │
│   │   SQLite  │ │  PouchDB  │ │   RxDB    │ │  Backend  │            │
│   │   WASM    │ │           │ │           │ │    API    │            │
│   └───────────┘ └───────────┘ └───────────┘ └───────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```
