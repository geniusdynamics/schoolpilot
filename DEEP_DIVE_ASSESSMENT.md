# SchoolPilot3 — Deep Dive Assessment & Action Plan

> **Assessment Date:** July 2025
> **Assessor:** Architecture Review
> **Project:** SchoolPilot3 — Education Management System
> **Tech Stack:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS 3

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture & Structure Analysis](#2-architecture--structure-analysis)
3. [Critical Issues](#3-critical-issues)
4. [Security Vulnerabilities](#4-security-vulnerabilities)
5. [Functional Gaps](#5-functional-gaps)
6. [Code Quality Issues](#6-code-quality-issues)
7. [Performance Concerns](#7-performance-concerns)
8. [What Works Well](#8-what-works-well)
9. [Action Plan — Phase 1: Stabilize & Clean](#9-action-plan--phase-1-stabilize--clean)
10. [Action Plan — Phase 2: Core Functionality](#10-action-plan--phase-2-core-functionality)
11. [Action Plan — Phase 3: School-Ready Features](#11-action-plan--phase-3-school-ready-features)
12. [Action Plan — Phase 4: Production Hardening](#12-action-plan--phase-4-production-hardening)
13. [Summary Scorecard](#13-summary-scorecard)
14. [Issue Tracker Checklist](#14-issue-tracker-checklist)

---

## 1. Executive Summary

**SchoolPilot3** is an ambitious, React + TypeScript school management system with a sophisticated modular architecture spanning 13 modules (Administration, Academics, Finance, HR, Inventory, Library, Nutrition, Reports, Settings, Dashboard, Admissions, Audit, and Core). It contains ~100+ page components, 1,400+ lines of centralized TypeScript type definitions, and a full custom UI component library.

**The project has a well-conceived multi-deployment data layer architecture** — designed so a single codebase can serve schools ranging from a single offline laptop in rural Kenya (SQLite OPFS) to a networked school LAN (PouchDB + CouchDB sync) to a hosted or SaaS backend (REST API). This is an intentional, strategic design documented extensively in `docs/architecture/DATA_LAYER_STRATEGY.md`, `docs/architecture/DEPLOYMENT_CLARIFICATION.md`, and `docs/roadmap/MASTER_ROADMAP.md`.

**However, the Unified Data Service (UDS) that ties these providers together is incomplete, and the app currently falls back to in-memory mock data.** Meanwhile, core school functionality — user management, workflows, admissions, grading — remains unimplemented. The project is a **strong architectural skeleton** but not yet production-ready for any school.

### Key Findings

| Area | Verdict |
|---|---|
| Data Layer Architecture | 🟢 **Well-designed multi-deployment provider strategy** — SQLite (standalone), PouchDB (networked/sync), Backend API (hosted/SaaS), ERPNext (integration). Philosophy is sound. |
| Data Layer Completion | 🔴 **UDS not fully wired.** All feature flags off. App runs on in-memory mock provider. PouchDB provider is verified complete but not activated. SQLite provider exists but feature-flagged off. None of the real providers are the active default. |
| Authentication | 🔴 **Demo mode is hardcoded to always-on.** Any password is accepted. No real auth exists. |
| Core Features | 🔴 **Many critical features are `alert("not yet implemented")`** — user management, workflows, roles, approvals. |
| Modules | 🔴 **Admissions module is completely empty.** Audit module has only a types file. |
| Dashboards | 🟡 **Hardcoded mock values** — Finance shows fake income of 5,850,000; main dashboard fakes fee structure and exam counts. |
| Code Quality | 🟡 **Hundreds of console.log statements in production code.** Backup files, dead code, and duplicate type definitions. |
| Security | 🔴 **API keys compiled into client bundle.** No CSRF protection. No password hashing. No server-side validation. |
| Bundle Size | 🟡 **70+ production dependencies** including server-only packages (mysql2, pg, better-sqlite3, sqlite3) that should be in a separate backend package, not the frontend bundle. |

---

## 2. Architecture & Structure Analysis

### 2.0 Multi-Deployment Philosophy (Key Context)

Before evaluating individual issues, it is essential to understand the **core architectural philosophy** documented across the project's own design docs:

> **Core Principle:** "One unified API, multiple storage backends, zero data loss."
> — `docs/architecture/DATA_LAYER_STRATEGY.md`

> **SchoolPilot3 is ALWAYS single-tenant.** Each deployed instance serves exactly one school. It can CONNECT to various backends, some of which may be multi-tenant.
> — `docs/architecture/DEPLOYMENT_CLARIFICATION.md`

The project supports **six deployment modes**, each serving a different school environment:

| Mode | Target User | Database | Sync | Use Case |
|---|---|---|---|---|
| **Standalone** | Single laptop school | SQLite OPFS | None | Rural school, one computer, no internet |
| **Networked** | Small school LAN | SQLite + PouchDB sync | WebSocket/LAN | Small school, 2-20 users on local network |
| **Hosted** | Medium school server | PostgreSQL via Backend API | Real-time | School with IT staff and a server |
| **SaaS Connect** | Multi-tenant cloud | PouchDB → external SaaS | Continuous | School subscribing to a cloud service |
| **ERPNext** | ERPNext users | SQLite/PouchDB → ERPNext API | API Bridge | School already using ERPNext for finance |
| **Demo** | Developers/sales | In-memory mock | None | Testing, demonstrations |

Each data layer technology has a **specific, justified role**:

| Technology | Deployment Mode(s) | Justification (from docs) |
|---|---|---|
| **SQLite OPFS** | Standalone, Mobile | File-based (easy backup/transfer), full SQL for complex reporting, modern browser OPFS storage |
| **PouchDB** | Networked, SaaS Connect | No collection limits (school needs 88 collections, RxDB free has 16-collection limit), battle-tested CouchDB sync, smaller bundle than RxDB |
| **Backend API Provider** | Hosted, SaaS | REST client for schools with dedicated servers or cloud backends |
| **ERPNext Provider** | ERPNext integration | API bridge mapping SchoolPilot entities to ERPNext doctypes |
| **Mock Provider** | Demo/Dev | Quick demonstrations, zero-setup development |

The **Unified Data Service (UDS)** is the abstraction layer that sits above all providers. Application code (hooks like `useStudents()`, `useAttendance()`) calls the UDS, which delegates to whichever provider is configured for the current deployment mode. This is the "Switchboard Pattern."

**The multi-provider architecture is a strength, not a problem.** The problem is that **the UDS wiring is incomplete** — all feature flags are off, and the app falls back to the mock provider. The providers themselves (PouchDB verified complete, SQLite implemented, Backend API scaffolded) need to be activated, not deleted.

**Key Reference Documents:**
- `docs/architecture/DATA_LAYER_STRATEGY.md` — Full UDS architecture with interfaces and provider specs
- `docs/architecture/DEPLOYMENT_CLARIFICATION.md` — Single-tenant philosophy, deployment mode matrix
- `docs/architecture/deployment-modes/DEPLOYMENT_SPECIFICATION.md` — Technical specs per mode
- `docs/database/DATA-layer-modernization-plan.md` — Migration roadmap from mock → SQLite → LiveStore
- `docs/database/deployment-guide.md` — Docker, Kubernetes, environment configs per mode
- `docs/database/api-unification.md` — ICollection API unifying PouchDB and RxDB method signatures
- `docs/collection_reduction_plan.md` — Documents why RxDB was abandoned (16-collection limit) in favor of PouchDB (88 collections)
- `docs/verify-pouchdb-implementation.md` — PouchDB provider verified as complete
- `docs/roadmap/MASTER_ROADMAP.md` — 12-week phased plan (Foundation → Enhancement → Expansion)
- `docs/backend-integration-guide.md` — Hybrid data layer with offline-first sync

### 2.1 Module Inventory

| Module | Pages | Data Hooks | Status |
|---|---|---|---|
| **Dashboard** | 1 | Uses `useAppData` | ⚠️ Partially working (hardcoded values) |
| **Administration** | 24 | Uses `useAppData` | ⚠️ Most CRUD works on mock data only |
| **Academics** | 17 | Uses `useAppData` + module hooks | ⚠️ Partial — grading engine missing |
| **Finance** | 16 | Uses `useAppData` + module hooks | ⚠️ Partial — dashboards use fake data |
| **HR** | 5 | Uses `useAppData` | ⚠️ Basic pages exist |
| **Inventory** | 16 | Uses module hooks + services | ⚠️ Pages exist, procurement workflows incomplete |
| **Library** | 10 | Uses `useAppData` | ⚠️ Basic CRUD exists |
| **Nutrition** | 7 | Uses `useAppData` | ⚠️ Basic CRUD exists |
| **Reports** | 11 | Uses `useAppData` | ⚠️ Static report layouts, no export |
| **Settings** | 20+ | Uses `useAppData` + config | ⚠️ User/Workflow/Role management is TODO |
| **Admissions** | 0 | None | 🔴 **Completely empty directory** |
| **Audit** | 0 (1 type file) | None | 🔴 **Only `data/types.ts` exists** |
| **Core** | 1 (LoginPage) | Auth hooks | ⚠️ Demo-only login |

### 2.2 Data Layer Status — The Gap Between Design and Reality

The multi-deployment architecture is well-designed (see §2.0), but **the implementation is incomplete**. Here is the honest status of each provider:

| Technology | Package(s) | Intended Mode | Implementation Status | Current State |
|---|---|---|---|---|
| **PouchDB** | `pouchdb`, `pouchdb-browser`, `pouchdb-find`, `pouchdb-upsert` | Networked, SaaS Connect | ✅ **Verified complete** (per `docs/verify-pouchdb-implementation.md`) — full CRUD, subscribe, sync, backup/restore | Not activated — feature flag off, UDS defaults to mock |
| **SQLite WASM** | `@sqlite.org/sqlite-wasm` | Standalone, Mobile | ⚠️ **Implemented** — `SQLiteProvider.ts` exists in `services/data/providers/` | Feature-flagged off (`enableSQLiteProvider: false`) |
| **Backend API** | Built-in (`BackendAPIService.ts`) | Hosted, SaaS | ⚠️ **Scaffolded** — service exists with caching, retry, queuing | No real backend server to connect to |
| **RxDB** | `rxdb`, `rxjs` | Legacy (being replaced by PouchDB) | 🟡 **Schemas defined** — 500+ lines in `rxdbService.ts`, 40+ collection schemas | Superseded by PouchDB per `collection_reduction_plan.md` (RxDB free has 16-collection limit, school needs 88) |
| **LiveStore** | `@livestore/*` (6 packages) | Experimental future alternative | ❌ **Not implemented** — plugin commented out in `vite.config.ts` | Phase 4 per modernization plan, premature to wire now |
| **Mock/In-Memory** | Built-in | Demo/Dev | ✅ **Working** — `createMockProvider()` in `UnifiedDataService.ts` | **This is the only thing currently running** |

**The core issue is not that there are multiple providers — that's by design.** The issues are:

1. **The UDS feature flag is off** (`useUnifiedDataService: false`) — so the entire provider architecture is bypassed
2. **All provider feature flags are off** — `enableSQLiteProvider: false`, `enableSyncEngine: false`, `enableERPNextIntegration: false`
3. **The `DataProviderWrapper` in `App.tsx`** falls through to the legacy `AppDataProvider` which uses mock data
4. **PouchDB is verified complete but never activated** as the default for any mode
5. **No deployment mode selector exists in the UI** — there's no way for an installer to pick Standalone vs Networked vs Hosted

**Key files in the data layer:**
- `src/services/data/UnifiedDataService.ts` — UDS core (partially complete, mock provider default)
- `src/services/data/providers/PouchDBProvider.ts` — PouchDB implementation (verified complete)
- `src/services/data/providers/SQLiteProvider.ts` — SQLite WASM implementation
- `src/services/data/types.ts` — `DataProvider` interface, `Query`, `Filter`, `SyncResult` types
- `src/services/data/SyncEngine.ts` — Sync engine (scaffolded)
- `src/services/database/PouchDBProvider.ts` — Alternate PouchDB impl with `ICollection` interface
- `src/services/database/DatabaseProviderFactory.ts` — Factory for runtime provider selection
- `src/services/rxdbService.ts` — RxDB schemas (legacy, 500+ lines)
- `src/contexts/AppDataContext.tsx` — 1,147-line context wrapping everything
- `src/services/dataModeManager.ts` — mode switching logic
- `src/services/DataServiceFactory.ts` — factory pattern for providers
- `src/services/DataStrategyManager.ts` — strategy management
- `src/config/dataLayerConfig.ts` — configuration
- `src/config/featureFlags.ts` — all features disabled

**Feature flags (all disabled — this is the root cause):**
```
useNewTabSystem: false
useUnifiedDataService: false
enableSQLiteProvider: false
enableSyncEngine: false
enableERPNextIntegration: false
enableMobileOptimizations: false
```

### 2.3 Misplaced Server-Side Dependencies

These Node.js native modules are listed as **frontend** production dependencies but **cannot run in a browser**. They may have been intended for migration scripts (`src/scripts/data-migration/`) or a future backend companion, but they should not be in the frontend `package.json`:

| Package | Why It Doesn't Belong in Frontend | Likely Intended For |
|---|---|---|
| `better-sqlite3` | C++ native addon, requires Node.js | Migration scripts, backend companion |
| `sqlite3` | C++ native addon, requires Node.js | Migration scripts, backend companion |
| `mysql2` | TCP socket-based, requires Node.js | ERPNext/backend migration scripts |
| `pg` | TCP socket-based, requires Node.js | Hosted mode backend server |
| `pouchdb-node` | Node.js-specific PouchDB adapter | Server-side CouchDB sync scripts |
| `puppeteer` | Headless Chrome automation, requires Node.js | E2E testing scripts |

**Action:** These should be moved to a separate `server/package.json` or `scripts/package.json`, not deleted entirely — they serve legitimate purposes outside the browser bundle.

---

## 3. Critical Issues

### CRIT-001: No Data Persistence (UDS Not Wired)
- **Location:** `src/services/data/UnifiedDataService.ts`, `src/config/featureFlags.ts`, `src/App.tsx` (`DataProviderWrapper`)
- **Description:** The Unified Data Service (UDS) defaults to a mock in-memory provider because `useUnifiedDataService` is `false`. The `DataProviderWrapper` in `App.tsx` bypasses the UDS entirely and loads the legacy `AppDataProvider` with mock data. When the page refreshes, all data is lost. Meanwhile, **PouchDB provider is verified complete** and SQLite provider is implemented — they just aren't activated.
- **Impact:** A school cannot store student records, financial transactions, or any operational data.
- **Action:** 
  1. Enable `useUnifiedDataService: true` as the default
  2. Wire PouchDB as the default provider for the initial "Standalone" deployment mode
  3. Implement a first-run deployment mode selector (Standalone / Networked / Hosted)
  4. Ensure the UDS `initialize()` path creates the correct provider based on selected mode
  5. Test data persistence across page refreshes

### CRIT-002: Authentication Is Permanently Demo Mode
- **Location:** `src/contexts/AuthContext.tsx` line 61
- **Code:** `const demoMode = session?.isDemo || true;`
- **Description:** The `|| true` short-circuit means `isDemoMode` is always `true` regardless of session state. Demo mode accepts any password.
- **Impact:** Anyone can log in as any user role. No access control is enforceable.
- **Action:** Remove `|| true`, implement proper auth flow with password hashing and server validation.

### CRIT-003: Demo Login Accepts Any Password
- **Location:** `src/services/authService.ts` lines 369-383
- **Description:** In `loginDemo()`, after checking the username exists, the only password check is `password.length < 1`. Any non-empty string is accepted.
- **Impact:** Zero authentication security.
- **Action:** Implement proper credential validation.

### CRIT-004: Session Tokens Are Fake
- **Location:** `src/services/authService.ts` line 389
- **Code:** `token: 'demo_token_${Date.now()}'`
- **Description:** Session tokens are just timestamp strings with no cryptographic security.
- **Impact:** Tokens are predictable and unsecured.
- **Action:** Implement JWT or opaque session tokens issued by a backend.

### CRIT-005: Admissions Module Is Empty
- **Location:** `src/modules/admissions/`
- **Description:** The directory exists but contains zero files. For a school system, admissions is a core workflow.
- **Impact:** Schools cannot process student applications.
- **Action:** Build the complete admissions module.

### CRIT-006: User/Role/Workflow Management Not Implemented
- **Location:** `src/modules/settings/pages/UnifiedSettingsPage.tsx`, `SettingsUsersPage.tsx`, `SettingsWorkflowsPage.tsx`
- **Description:** All submit handlers contain:
  ```
  // TODO: Implement user management API calls
  alert("Update user functionality not yet implemented");
  ```
- **Impact:** Administrators cannot manage users, roles, or approval workflows.
- **Action:** Implement all CRUD operations for users, roles, and workflows.

### CRIT-007: No Backend Server (Required for Networked/Hosted/SaaS Modes)
- **Location:** Project-wide
- **Description:** There is no backend API server. The `src/server/` directory exists but contains no functioning server. The `BackendAPIProvider` is scaffolded in the frontend but has nothing to connect to. For **Standalone mode**, a backend is NOT required (SQLite OPFS is sufficient). But for **Networked, Hosted, and SaaS modes**, a backend is essential.
- **Impact:** Multi-user deployment modes (Networked, Hosted, SaaS) cannot function. No server-side validation, no centralized data, no real authentication.
- **Action:**
  1. **For Standalone mode (first priority):** No backend needed — focus on wiring SQLite OPFS or PouchDB locally
  2. **For Networked mode:** Deploy a CouchDB instance that PouchDB can sync to (per deployment guide's Docker Compose spec in `docs/database/deployment-guide.md`)
  3. **For Hosted/SaaS mode:** Build an Express/Fastify API server in a separate `server/` package — this is where `pg`, `mysql2`, `better-sqlite3` dependencies belong
  4. **For ERPNext mode:** Complete the ERPNext connector (scaffolded in `src/services/erpnext/`)

---

## 4. Security Vulnerabilities

### SEC-001: API Keys in Client Bundle (HIGH)
- **Location:** `vite.config.ts` lines 99-101
- **Code:**
  ```
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  ```
- **Risk:** API keys are compiled into the JavaScript bundle, visible to anyone who opens browser DevTools.
- **Action:** Move all API calls to a backend proxy. Never expose API keys in frontend code.

### SEC-002: No Password Hashing (CRITICAL)
- **Location:** `src/services/authService.ts`
- **Description:** No bcrypt, argon2, or any hashing is used. Demo users have plaintext implied passwords.
- **Action:** Implement bcrypt password hashing on the backend.

### SEC-003: No Input Sanitization (MEDIUM)
- **Location:** All form pages (StudentsListPage, StaffListPage, etc.)
- **Description:** Form data is passed directly to data layer without sanitization. XSS payloads could be stored and rendered.
- **Action:** Add input validation library (e.g., zod or yup) and output encoding.

### SEC-004: No CSRF Protection (MEDIUM)
- **Description:** No CSRF tokens, no SameSite cookie configuration, no anti-CSRF headers.
- **Action:** Implement CSRF tokens when a backend is added.

### SEC-005: window.confirm for Destructive Actions (LOW)
- **Location:** Multiple settings pages
- **Code:** `if (window.confirm('Are you sure you want to delete this user?'))`
- **Description:** Browser-native `confirm()` is used for destructive operations. These are trivially bypassable.
- **Action:** Replace with proper confirmation modals that enforce business logic.

---

## 5. Functional Gaps

### 5.1 Features That Are TODO/Unimplemented

| Feature | Location | Current State |
|---|---|---|
| User CRUD | `settings/pages/SettingsUsersPage.tsx` L108-112 | `// TODO: Implement updateRole` |
| Role CRUD | `settings/pages/SettingsUsersPage.tsx` L125-129 | `// TODO: Implement addRole` |
| Delete User | `settings/pages/SettingsUsersPage.tsx` L135-137 | `// TODO: Implement deleteRole` |
| Delete Role | `settings/pages/SettingsUsersPage.tsx` L140-142 | `// TODO: Implement deleteRole` |
| Workflow CRUD | `settings/pages/SettingsWorkflowsPage.tsx` L105-111 | `alert("not yet implemented")` |
| Workflow State Management | `settings/pages/SettingsWorkflowsPage.tsx` L115-122 | `alert("not yet implemented")` |
| Delete Workflow | `settings/pages/SettingsWorkflowsPage.tsx` L125-129 | `alert("not yet implemented")` |
| Delete Workflow State | `settings/pages/SettingsWorkflowsPage.tsx` L134-137 | `alert("not yet implemented")` |
| Application Approval | `administration/components/ApplicationManagement.tsx` L255-259 | `// TODO: Implement approval` |
| Admission Reviews | `administration/components/ApplicationManagement.tsx` L361-364 | `// TODO: Implement reviews view` |
| Bulk Import | `administration/components/PreNAsMarksManagement.tsx` L622-626 | `// TODO: Implement bulk import` |
| Edit Student Profile | `administration/pages/StudentDetailPage.tsx` L209-212 | `// TODO: Navigate to edit` |
| Task View Modal | `components/ui/ContentRenderer.tsx` L160-163 | `// TODO: Implement task view` |

### 5.2 Missing Business Features (from gap_matrix.md + analysis)

| Feature | Priority | Notes |
|---|---|---|
| **EducationSystem Model** | HIGH | No implementation found. Kenya's CBC system needs specific support. |
| **GradingEngine Logic** | HIGH | No grading calculation engine. Only UI shells exist. |
| **Approval Workflow Engine** | HIGH | Workflows defined in DB schema but no execution engine. |
| **CBC Competency Tracking** | HIGH | Kenya-specific requirement. Not implemented. |
| **Advanced Reporting** | HIGH | Report pages exist but generate no actual reports. No PDF/Excel export. |
| **Student Admissions Pipeline** | HIGH | Module directory is empty. |
| **Audit Trail** | MEDIUM | Types defined, no implementation. |
| **SMS/Email Notifications** | MEDIUM | Templates page exists, no gateway integration. |
| **Bulk Data Import (CSV)** | MEDIUM | No import capability for mass enrollment. |
| **Fee Invoicing Automation** | MEDIUM | Manual only, no term-based auto-generation. |
| **Parent Portal** | LOW | No parent-facing views or login. |
| **Student Portal** | LOW | Student role exists but has minimal access. |

### 5.3 Dashboard Data Integrity Issues

| Dashboard | Issue | Location |
|---|---|---|
| Main Dashboard | `activeFeeStructures = 3` hardcoded | `modules/dashboard/pages/DashboardPage.tsx` L80 |
| Main Dashboard | `analyzedExams = 5` hardcoded | `modules/dashboard/pages/DashboardPage.tsx` L81 |
| Finance Dashboard | `mockTotalIncome = 5850000` hardcoded | `modules/finance/pages/FinanceDashboardPage.tsx` L46 |
| Finance Dashboard | `mockTotalExpenses = 2340000` hardcoded | `modules/finance/pages/FinanceDashboardPage.tsx` L47 |
| Main Dashboard | Fee collection chart uses static BarChartData array | `modules/dashboard/pages/DashboardPage.tsx` L89-93 |

---

## 6. Code Quality Issues

### 6.1 Excessive Debug Logging (HIGH)

**Scope:** Hundreds of `console.log`, `console.warn`, `console.error` statements across the codebase.

**Worst offenders:**

| File | Count | Impact |
|---|---|---|
| `src/App.tsx` | 10+ | Runs on every render/route change |
| `src/AppLegacy.tsx` | 8+ | Legacy code still executing |
| `src/components/ProtectedRoute.tsx` | 5+ | Runs on every route navigation |
| `src/core/moduleRegistry.ts` | 5+ | Runs on every navigation rebuild |
| `src/modules/dashboard/pages/DashboardPage.tsx` | 4+ | Runs on dashboard load |

**Action items:**
- [ ] Create a logging service that respects `NODE_ENV`
- [ ] Add ESLint rule `no-console: "warn"` (or `"error"` for production builds)
- [ ] Replace all `console.log` with the logging service
- [ ] Remove all emoji-prefixed debug logs (`📦`, `🔍`, `✅`, `❌`, `🗺️`)

### 6.2 Backup and Junk Files

**Files to delete from project root:**

```
DataModeManager.test.ts.backup
app-current-state.png
apply_missing_translations.js
check-app-status.js
check-console-logs.html
check_mode.html
check_translations.js
complete-user-journeys-results.json
debug-console.html
debug-dashboard.js
debug-import-test.js
debug-routes.js
demo.ts
direct_test.js
eslint_report.txt
fix-navigation-issues.js
fix-unified-settings-comprehensive.js
fix-unified-settings.js
fix_imports.js
generate_comprehensive_data.cjs
metadata.json
migration_config.ts
missing_translations_fix.json
module-loading-test-results.json
react19-test-results.txt
run-data-generation.ts
run-demo.ts
schoolpilot_backup_summary.json
schoolpilot_comprehensive_backup.json
schoolpilot_data_backup.json
schoolpilot_final_backup.json
schoolpilot_sqlite_backup.json
simple_test.js
test-all-generators.ts
test-backup-page.cjs
test-clubs-generator.ts
test-dashboard.html
test-generators.ts
test-navigation-debug.tsx
test-output-capture.cjs
test-react19-check.cjs
test-react19-final.cjs
test-react19-simple.cjs
test-results.txt
test-runner.cjs
test-runner.js
test_basic_modules.cjs
test_comprehensive_generation.cjs
test_comprehensive_generation.js
test_create_generator.js
test_data_generation.js
test_data_management.js
test_index_import.js
test_integration_verification.cjs
test_localstorage.html
test_localstorage.js
test_referential_integrity.cjs
test_simple.cjs
test_storage_adapters.cjs
test_storage_simple.cjs
unified-test-dashboard.html
update_imports.cjs
update_imports.ps1
validate-sqlite-implementation.mjs
verify-routing.js
verify_fix.html
```

**Backup files to delete from source:**

```
src/hooks/useTabNavigation.ts.backup
src/modules/settings/moduleDefinition.tsx.backup
src/modules/settings/pages/UnifiedSettingsPage.tsx.backup
src/modules/settings/pages/UnifiedSettingsPage.tsx.backup2
src/modules/settings/pages/UnifiedSettingsPage.tsx.fixed
src/tests/DataGridIntegration.test.tsx.backup
```

**Legacy files to delete from source:**

```
src/App-Simple.tsx
src/AppLegacy.tsx
src/test-db-init.js
src/globalMockData.ts (if migrated to proper data layer)
```

### 6.3 Type Definition Duplication

**File:** `src/core/types.ts`

The `ModuleDefinition` interface is defined **three times**:

| Line Range | Variant |
|---|---|
| L1512-L1534 | First definition |
| L1571-L1598 | Second definition (different shape) |
| L1609-L1635 | Third definition (yet another shape) |

Similarly, `ModuleDependency` is defined twice at L1601-L1606 and L1638-L1643.

**Action:**
- [ ] Audit all three `ModuleDefinition` interfaces
- [ ] Determine which is the canonical one
- [ ] Consolidate into a single definition
- [ ] Update all imports

### 6.4 Deprecated Components Still in Codebase

| Component | Replacement | Files to Clean Up |
|---|---|---|
| `DataModeSwitch.tsx` | `UnifiedModeSwitch.tsx` | Component + 2 test files |
| `DataLayerSettingsPage.tsx` | `DataManagementSettingsPage.tsx` | Page + integration test |
| `DatabaseProviderSettingsPage.tsx` | `DataManagementSettingsPage.tsx` | Page + integration test |
| `DatabaseSettingsPage.tsx` | `DataManagementSettingsPage.tsx` | Page + integration test |

### 6.5 Internationalization — English Only

**Current state:** Only `src/locales/en/` exists with `common.json` and `settings.json`.

**Per the project's own `translation_status_report.md`:** Many translation keys are missing even in English.

**Impact:** The system is built for Kenyan schools (CBC, KCPE, Kiswahili subjects in types) but only supports English.

---

## 7. Performance Concerns

### 7.1 Bundle Size Bloat

**Production dependencies that should be devDependencies or removed:**

| Package | Why | Action |
|---|---|---|
| `@faker-js/faker` ^10.0.0 | Test data generation only | Move to devDeps |
| `puppeteer` ^24.16.2 | Browser automation for testing | Move to devDeps |
| `better-sqlite3` ^12.2.0 | Node.js native, cannot run in browser | Remove |
| `sqlite3` ^5.1.7 | Node.js native, cannot run in browser | Remove |
| `mysql2` ^3.9.1 | Node.js native, cannot run in browser | Remove |
| `pg` ^8.11.3 | Node.js native, cannot run in browser | Remove |
| `pouchdb-node` ^9.0.0 | Node.js-specific adapter | Remove (keep pouchdb-browser) |
| `@effect/rpc` ^0.69.0 | Not used anywhere | Remove |
| `@livestore/*` (6 packages) | Commented out, not in use | Remove |
| `dotenv` ^16.4.5 | Vite handles env vars natively | Remove |

**Estimated impact:** Removing these could reduce `node_modules` size by 200+ MB and eliminate native build issues.

### 7.2 Module-Scope Side Effects

**File:** `src/App.tsx` lines 54-65

```javascript
const pageModules = {
  ...import.meta.glob('./modules/*/pages/*.tsx'),
  ...import.meta.glob('./modules/*/pages/**/*.tsx'),
};

const allPageKeys = Object.keys(pageModules);
console.log('📦 [App] Total page modules loaded:', allPageKeys.length);
// ... more logging
```

This code runs at **module evaluation time** — before the app even renders. The `import.meta.glob` is fine (Vite handles it lazily), but the console.log calls execute unconditionally.

### 7.3 Over-Engineered Infrastructure Components

These components add complexity without delivering user value for a school:

| Component | Lines (est.) | Purpose | School Value |
|---|---|---|---|
| `MemoryDashboard.tsx` | 400+ | Real-time memory monitoring | None |
| `PerformanceBenchmark.tsx` | 300+ | Performance benchmarking | None |
| `ModuleHealthDashboard.tsx` | 200+ | Module health monitoring | None |
| `DatabaseMonitoringDashboard.tsx` | 300+ | Database monitoring | None |
| `SyncManagementPanel.tsx` | 200+ | Sync management | None (no sync exists) |
| `PerformanceMonitor.tsx` | 200+ | Performance monitoring | None |
| `PerformanceMonitorWidget.tsx` | 150+ | Performance widget | None |
| `ModuleLoadingPerformancePanel.tsx` | 150+ | Module loading performance | None |
| `ModuleHealthIndicator.tsx` | 100+ | Health indicator widget | None |

**Total:** ~2,000+ lines of infrastructure monitoring code that no school administrator will use.

**Action:** Move to a `dev-tools` bundle that is not included in production builds.

### 7.4 Render-Cycle Console Logging

`DynamicRoutes` component logs on **every render**:

```javascript
const DynamicRoutes = ({ modulesInitialized }) => {
  console.log('🔍 [DynamicRoutes] Component is rendering!');
  console.log('🔍 [DynamicRoutes] Modules initialized:', modulesInitialized);
  // ...
```

Combined with navigation items being mapped and logged:

```javascript
console.log('🗺️ [DynamicRoutes] Processing module:', module.name);
// For each nav item:
console.log('🗺️ [DynamicRoutes] Processing nav item:', { name, path, page, deprecated });
```

With 13 modules and ~100 nav items, this produces **100+ console messages on every route change**.

---

## 8. What Works Well

| ✅ Strength | Details |
|---|---|
| **Multi-Deployment Data Layer Architecture** | The crown jewel of this project. A thoroughly documented, intentional strategy (`docs/architecture/DATA_LAYER_STRATEGY.md`, `DEPLOYMENT_CLARIFICATION.md`, `MASTER_ROADMAP.md`) providing a Unified Data Service (UDS) abstraction over multiple storage backends — SQLite OPFS for standalone/offline schools, PouchDB for networked sync with CouchDB, Backend API for hosted/SaaS, ERPNext bridge for ERP integration. Each technology has a specific, justified deployment mode. The `DataProvider` interface, `SyncEngine`, conflict resolution, and provider factory are well-designed. PouchDB provider is verified complete with full CRUD, subscribe, sync, backup/restore. This architecture means one codebase serves schools from a single rural laptop to a cloud-hosted multi-user deployment. |
| **Single-Tenant / Offline-First Philosophy** | Every instance serves exactly one school and works completely offline — critical for schools with unreliable connectivity. Local data is always authoritative; sync to backends is opportunistic. Documented with clear deployment mode matrix (Standalone, Networked, Hosted, SaaS, ERPNext, Mobile, Demo). |
| **Module Architecture** | Clean domain-driven separation. Each module has consistent structure: `pages/`, `data/`, `i18n/`, `rbac.ts`, `moduleDefinition.tsx`. Easy to reason about. 13 modules covering the full school domain. |
| **UI Component Library** | Comprehensive custom components: DataGrid, Modal, SlideoutForm, KanbanBoard, Toast, Tooltip, DatePicker, TabbedForm, Card, Button, Input, Select. Well-built with TypeScript. |
| **TypeScript Type System** | 1,400+ lines of centralized type definitions covering all business entities. Strict mode enabled. Good coverage of school domain objects (Students, Staff, Classes, Fees, etc.). 88 collection schemas defined. |
| **RBAC Foundation** | Well-structured `RBACService` with roles (Super Admin, Administrator, Teacher, Student, Parent, Staff, Finance Officer, HR Officer, Librarian, Inventory Manager, Nutrition Officer). Per-module permission checks. |
| **Route Protection** | `ProtectedRoute` component with module-level and permission-level access checks. Redirect to login for unauthenticated users. |
| **Error Boundary Strategy** | Multiple error boundaries at different levels: `ApplicationErrorBoundary`, `ModuleErrorBoundary`, `PageErrorBoundary`, `NavigationErrorBoundary`, `HookErrorBoundary`, `DatabaseErrorBoundary`. Good fault isolation. |
| **Responsive Design** | Tailwind CSS with responsive grid layouts. Mobile-aware sidebar. |
| **Module Registry** | Dynamic module loading with `import.meta.glob`. Modules register themselves. Navigation items generated from module definitions. Feature flags for progressive rollout. |
| **Extensive Architecture Documentation** | Over 90 docs in `docs/` covering architecture decisions, deployment specs, migration plans, roadmaps, database guides (Docker, Kubernetes, per-mode configs), API unification, and module dependency management. Far more thoughtful documentation than typical projects. |
| **Test Infrastructure** | Vitest + Testing Library + happy-dom setup. ~60 test files exist. Integration test patterns established. |
| **PWA Foundation** | Service worker configured via `vite-plugin-pwa`. Workbox caching strategies defined. Manifest configured. Offline-first aligns with the deployment philosophy. |
| **Lazy Loading** | Page components use `React.lazy` with `Suspense` boundaries and loading states. |
| **Data Generator System** | Modular data generator framework with `BaseGenerator` class, configurable volume, and relationship-aware data creation. Supports all 88 entity types with realistic foreign key relationships. |
| **ICollection API Unification** | `docs/database/api-unification.md` documents how the `ICollection` interface unifies PouchDB and RxDB method signatures (e.g., `delete()` vs `remove()`, `findOne(id)` vs `findById(id)`) — ensuring provider-agnostic application code. |
| **Deployment Infrastructure** | Docker Compose spec (SchoolPilot + CouchDB), Kubernetes deployment YAML, health checks, security headers (CSP, CORS), connection pooling, automated backup config — all documented in `docs/database/deployment-guide.md`. Ready to operationalize. |

---

## 9. Action Plan — Phase 1: Stabilize & Clean

**Timeline: Weeks 1-3**
**Goal: Activate the data layer, remove dead weight, establish a clean foundation**

### ACTION-1.1: Activate the Unified Data Service and PouchDB Provider

**Priority:** 🔴 CRITICAL
**Effort:** 3-5 days

**The providers are built — they just need to be turned on.** The PouchDB provider is verified complete. The UDS exists. The feature flags just need to be enabled and the wiring completed.

**Step 1 — Enable the UDS:**
- [ ] Set `useUnifiedDataService: true` in `src/config/featureFlags.ts` defaults
- [ ] Update `DataProviderWrapper` in `src/App.tsx` to route through UDS instead of legacy `AppDataProvider`
- [ ] Ensure `uds.initialize()` selects the correct provider based on deployment config

**Step 2 — Wire PouchDB as the default Standalone provider:**
- [ ] In `UnifiedDataService.createProvider()`, make `pouchdb` the default mode (not mock)
- [ ] Verify PouchDB provider initializes correctly with IndexedDB persistence
- [ ] Test: data survives page refresh
- [ ] Test: all module pages load data from PouchDB instead of mock

**Step 3 — Create a first-run deployment mode selector:**
- [ ] Build a simple setup page that appears on first launch (no school configured yet)
- [ ] Options: Standalone (SQLite/PouchDB local), Networked (PouchDB + CouchDB URL), Demo (mock)
- [ ] Store selected mode in `localStorage` or IndexedDB
- [ ] Wire mode to `DataServiceFactory` / `featureFlags`

**Step 4 — Seed initial data into real provider:**
- [ ] Migrate the mock data seeding logic to work with PouchDB provider
- [ ] Ensure `seedDatabase()` in `AppDataContext` populates PouchDB on first run
- [ ] Verify all 88 collections can be created in PouchDB (this is why PouchDB was chosen over RxDB)

**Step 5 — Enable SQLite provider for Standalone mode (secondary):**
- [ ] Set `enableSQLiteProvider: true` and test SQLite OPFS provider
- [ ] Allow Standalone mode to choose between SQLite and PouchDB

### ACTION-1.1b: Clean Up Legacy and Premature Dependencies

**Priority:** 🟡 HIGH
**Effort:** 1-2 days

**Move server-side packages to a separate `server/package.json`** (do NOT delete — they serve migration scripts and future backend):
- [ ] `better-sqlite3` → `server/package.json`
- [ ] `sqlite3` → `server/package.json`
- [ ] `mysql2` → `server/package.json`
- [ ] `pg` → `server/package.json`
- [ ] `pouchdb-node` → `server/package.json` or `scripts/package.json`

**Remove premature/unused packages from frontend `package.json`:**
- [ ] `@livestore/*` (6 packages) — Phase 4 per modernization plan; re-add when actually implementing
- [ ] `@effect/rpc` — not used anywhere
- [ ] `dotenv` — Vite handles env vars natively

**Keep but evaluate later:**
- [ ] `rxdb` and `rxjs` — RxDB schemas in `rxdbService.ts` still define the 40+ collection schemas. These schemas could be migrated to PouchDB schema definitions, then RxDB can be removed. Don't delete yet.
- [ ] `@sqlite.org/sqlite-wasm` — needed for Standalone mode SQLite provider. Keep.
- [ ] All `pouchdb-*` packages — needed for Networked and default Standalone mode. Keep.
- [ ] `dexie` — may be used for offline cache layer. Evaluate.

### ACTION-1.2: Move Wrong-Category Dependencies to devDependencies

**Priority:** 🟡 HIGH
**Effort:** 30 minutes

Move to `devDependencies`:
- [ ] `@faker-js/faker` — test data generation only
- [ ] `puppeteer` — E2E testing only
- [ ] `@types/pouchdb` — type definitions
- [ ] `@types/pouchdb-find` — type definitions
- [ ] `@types/react` — type definitions
- [ ] `@types/react-beautiful-dnd` — type definitions
- [ ] `@types/react-dom` — type definitions
- [ ] `@types/semver` — type definitions

### ACTION-1.3: Clean Project Root

**Priority:** 🟡 HIGH
**Effort:** 1 hour

Delete all files listed in Section 6.2 (~65 files). These are test scripts, debug HTML files, backup JSONs, and other artifacts that don't belong in the project root.

### ACTION-1.4: Delete Backup and Legacy Files

**Priority:** 🟡 HIGH
**Effort:** 30 minutes

- [ ] Delete all `.backup`, `.backup2`, `.fixed` files (6 files)
- [ ] Delete `src/App-Simple.tsx`
- [ ] Delete `src/AppLegacy.tsx`
- [ ] Delete `src/test-db-init.js`

### ACTION-1.5: Remove All Debug Console Statements

**Priority:** 🟡 HIGH
**Effort:** 2-3 days

- [ ] Create `src/utils/logger.ts` with environment-aware logging
- [ ] Find and replace all `console.log` calls (~200+) with logger
- [ ] Add ESLint rule: `"no-console": "warn"`
- [ ] Remove all emoji-prefixed debug logs (`📦`, `🔍`, `✅`, `❌`, `🗺️`, `📊`, `🚀`)

### ACTION-1.6: Consolidate Duplicate Type Definitions

**Priority:** 🟡 HIGH
**Effort:** 2-3 hours

- [ ] Audit the three `ModuleDefinition` interfaces in `src/core/types.ts` (L1512, L1571, L1609)
- [ ] Audit the two `ModuleDependency` interfaces in `src/core/types.ts` (L1601, L1638)
- [ ] Determine which variant is canonical (check all imports across codebase)
- [ ] Merge into single definitions with all required fields
- [ ] Update all consumers
- [ ] Verify build passes

### ACTION-1.7: Remove Deprecated Components

**Priority:** 🟢 MEDIUM
**Effort:** 1-2 days

- [ ] Delete `src/components/DataModeSwitch.tsx` and its tests
- [ ] Delete `src/tests/DataModeSwitch.test.tsx`
- [ ] Delete `src/tests/DataModeSwitchDeprecation.test.tsx`
- [ ] Delete deprecated settings pages if superseded:
  - `DataLayerSettingsPage.tsx` (if `DataManagementSettingsPage` covers it)
  - `DatabaseProviderSettingsPage.tsx` (if `DataManagementSettingsPage` covers it)
- [ ] Delete deprecated integration tests for removed pages
- [ ] Update any routes that reference deleted pages
- [ ] Search for `deprecated` flags in navigation items and clean up

---

## 10. Action Plan — Phase 2: Core Functionality

**Timeline: Weeks 4-8**
**Goal: Make the system actually functional for a school**

### ACTION-2.1: Implement Real Authentication

**Priority:** 🔴 CRITICAL
**Effort:** 5-7 days

**Standalone mode (PouchDB/SQLite — no backend required):**
- [ ] Fix `src/contexts/AuthContext.tsx` line 61: change `const demoMode = session?.isDemo || true;` to `const demoMode = session?.isDemo ?? false;`
- [ ] Implement local user/password storage in PouchDB `users` collection with bcrypt hashing
- [ ] Implement local session management with expiry (stored in IndexedDB, not just `localStorage`)
- [ ] Keep demo mode available via explicit config flag (not hardcoded true)
- [ ] Remove hardcoded demo token generation (`demo_token_${Date.now()}`)
- [ ] Create a "first admin" setup flow on fresh install (user picks admin username/password)

**Networked/Hosted modes (backend required):**
- [ ] Create authentication API endpoints (`POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`)
- [ ] Implement JWT token issuance with proper expiry (access: 15 min, refresh: 7 days)
- [ ] Implement session management with refresh token rotation
- [ ] Add rate limiting on login endpoint (5 attempts per minute)
- [ ] Update `src/services/authService.ts` to call real backend endpoints when `deploymentMode !== 'standalone'`
- [ ] Store JWT in httpOnly cookie (not localStorage) for security
- [ ] Implement token refresh flow in an Axios/fetch interceptor
- [ ] Add logout that clears server-side session

### ACTION-2.2: Implement User, Role & Workflow CRUD

**Priority:** 🔴 CRITICAL
**Effort:** 5-7 days

**User Management (`SettingsUsersPage.tsx` / `UnifiedSettingsPage.tsx`):**
- [ ] Replace `alert("not yet implemented")` with real API calls
- [ ] Implement `createUser(data)` → `POST /api/users`
- [ ] Implement `updateUser(id, data)` → `PUT /api/users/:id`
- [ ] Implement `deleteUser(id)` → `DELETE /api/users/:id`
- [ ] Implement `listUsers()` → `GET /api/users`
- [ ] Add password reset functionality
- [ ] Add form validation with error messages
- [ ] Replace `window.confirm()` with proper confirmation modal

**Role Management:**
- [ ] Implement `createRole(data)` → `POST /api/roles`
- [ ] Implement `updateRole(id, data)` → `PUT /api/roles/:id`
- [ ] Implement `deleteRole(id)` → `DELETE /api/roles/:id`
- [ ] Implement `listRoles()` → `GET /api/roles`
- [ ] Implement permission assignment UI (checkboxes per module)
- [ ] Implement role assignment to users

**Workflow Management:**
- [ ] Implement `createWorkflow(data)` → `POST /api/workflows`
- [ ] Implement `updateWorkflow(id, data)` → `PUT /api/workflows/:id`
- [ ] Implement `deleteWorkflow(id)` → `DELETE /api/workflows/:id`
- [ ] Implement workflow state management (add/edit/delete/reorder states)
- [ ] Implement workflow execution engine (state transitions, approvals)

### ACTION-2.3: Build the Admissions Module

**Priority:** 🔴 CRITICAL
**Effort:** 7-10 days

**Directory:** `src/modules/admissions/` (currently empty)

**Files to create:**
- [ ] `moduleDefinition.tsx` — module registration with navigation items
- [ ] `rbac.ts` — permissions (admissions.view, admissions.create, admissions.approve, admissions.manage)
- [ ] `i18n/en.json` — English translations
- [ ] `data/types.ts` — Application, Applicant, AdmissionDecision types
- [ ] `data/useAdmissionsData.ts` — data hook for admissions operations
- [ ] `pages/AdmissionsDashboardPage.tsx` — overview with stats (pending, approved, rejected, enrolled)
- [ ] `pages/ApplicationFormPage.tsx` — student application intake form
- [ ] `pages/ApplicationsListPage.tsx` — table of all applications with filters (status, class, date)
- [ ] `pages/ApplicationDetailPage.tsx` — detailed view with documents, notes, decision history
- [ ] `pages/ApplicationReviewPage.tsx` — review interface with approve/reject/waitlist actions
- [ ] `pages/AdmissionLetterPage.tsx` — generate and preview admission letters
- [ ] `pages/BulkAdmissionPage.tsx` — bulk approve/reject selected applications

**Business logic:**
- [ ] Application status workflow: Draft → Submitted → Under Review → Approved/Rejected/Waitlisted → Enrolled
- [ ] Automatic student record creation upon enrollment
- [ ] Document attachment support (birth certificate, previous school records)
- [ ] Class/stream assignment during admission
- [ ] Fee structure assignment during admission

### ACTION-2.4: Build the Audit Module

**Priority:** 🟡 HIGH
**Effort:** 3-5 days

**Directory:** `src/modules/audit/` (currently only has `data/types.ts`)

**Files to create:**
- [ ] `moduleDefinition.tsx` — module registration
- [ ] `rbac.ts` — permissions (audit.view, audit.manage, audit.export)
- [ ] `i18n/en.json` — English translations
- [ ] `data/useAuditData.ts` — data hook for audit log operations
- [ ] `pages/AuditDashboardPage.tsx` — overview with recent activity, stats
- [ ] `pages/AuditLogPage.tsx` — searchable/filterable table of all audit entries
- [ ] `pages/EntityAuditTrailPage.tsx` — audit history for a specific record
- [ ] `services/auditService.ts` — service that intercepts data operations and logs changes

**Business logic:**
- [ ] Automatically log all CREATE, UPDATE, DELETE operations across all modules
- [ ] Capture: user, timestamp, action, table, record ID, old values, new values, IP address
- [ ] Immutable log (entries cannot be deleted or modified)
- [ ] Filter by: user, module, action type, date range, entity type
- [ ] Export audit log to CSV/PDF

### ACTION-2.5: Connect Dashboards to Real Data

**Priority:** 🟡 HIGH
**Effort:** 2-3 days

**Main Dashboard (`modules/dashboard/pages/DashboardPage.tsx`):**
- [ ] Replace `const activeFeeStructures = 3;` with computed count from `feeTemplates` data
- [ ] Replace `const analyzedExams = 5;` with computed count from exam sessions data
- [ ] Replace static `feeCollectionData` array with actual collection totals per term
- [ ] Add real "recent activity" feed from audit log
- [ ] Add upcoming events/deadlines widget

**Finance Dashboard (`modules/finance/pages/FinanceDashboardPage.tsx`):**
- [ ] Replace `mockTotalIncome = 5850000` with sum of actual student payments
- [ ] Replace `mockTotalExpenses = 2340000` with sum of actual expense claims
- [ ] Replace `mockNetPosition` with computed difference
- [ ] Add real outstanding invoices chart
- [ ] Add real fee collection trends from payment records

**Module Dashboards (all):**
- [ ] Audit each module dashboard for hardcoded values
- [ ] Replace with aggregations from actual data
- [ ] Add loading states for computed values

---

## 11. Action Plan — Phase 3: School-Ready Features

**Timeline: Weeks 9-14**
**Goal: Deliver the features that schools need daily**

### ACTION-3.1: Implement the Grading Engine

**Priority:** 🔴 CRITICAL
**Effort:** 7-10 days

- [ ] Create `src/modules/academics/services/gradingEngine.ts`
- [ ] Support CBC (Competency-Based Curriculum) rubrics:
  - Below Expectation (BE), Approaching Expectation (AE), Meeting Expectation (ME), Exceeding Expectation (EE)
  - Per-strand and per-subject assessment
- [ ] Support traditional percentage-based grading (A, B+, B, C+, C, D+, D, E)
- [ ] Support configurable custom grading scales
- [ ] Implement mark-to-grade conversion logic
- [ ] Implement class ranking engine (position in class, stream, overall)
- [ ] Implement subject-level analysis (mean, median, mode, pass rate)
- [ ] Implement student progress tracking across terms/years
- [ ] Wire grading engine to `ExamAnalysisPage.tsx` and `StudentExamResultsEntryPage.tsx`
- [ ] Add grading scale configuration to Settings module

### ACTION-3.2: Implement Report Generation

**Priority:** 🔴 CRITICAL
**Effort:** 10-14 days

**Report types to implement:**
- [ ] **Student Report Card** — term-end with grades per subject, teacher comments, position
- [ ] **Fee Statement** — per-student invoice history with balance
- [ ] **Class Performance Summary** — subject-by-subject analysis with charts
- [ ] **Student Masterlist** — filterable by class, status, category with export
- [ ] **Staff Payroll Report** — monthly payroll summary per department
- [ ] **Financial Summary** — income vs expenditure per period
- [ ] **Overdue Fees Report** — students with outstanding balances
- [ ] **Attendance Summary** — per-class, per-student attendance percentages
- [ ] **Inventory Status Report** — stock levels, reorder alerts
- [ ] **Library Report** — most borrowed books, overdue returns

**Export formats:**
- [ ] PDF generation (use `@react-pdf/renderer` or `jspdf`)
- [ ] Excel export (use `xlsx` or `exceljs`)
- [ ] CSV export for all tabular reports
- [ ] Print-optimized layouts

**Infrastructure:**
- [ ] Create `src/services/reportService.ts` — centralized report generation
- [ ] Create `src/components/ReportViewer.tsx` — preview component with export buttons
- [ ] Create `src/components/PrintLayout.tsx` — print-friendly wrapper
- [ ] Add school logo/header to all printed reports

### ACTION-3.3: Add Multi-Language Support

**Priority:** 🟡 HIGH
**Effort:** 5-7 days

- [ ] Create `src/locales/sw/` directory for Kiswahili translations
- [ ] Translate `common.json` to Kiswahili
- [ ] Translate `settings.json` to Kiswahili
- [ ] Create and translate all module-level i18n files (`academics/i18n/sw.json`, etc.)
- [ ] Complete all missing English translation keys (per `translation_status_report.md`)
- [ ] Add language switcher to the user menu
- [ ] Store language preference per user
- [ ] Add RTL support infrastructure (for potential Arabic/Somali support)
- [ ] Consider adding French for East African French-speaking regions

### ACTION-3.4: Implement Bulk Data Import

**Priority:** 🟡 HIGH
**Effort:** 3-5 days

- [ ] Create `src/services/importService.ts` — CSV parsing and validation
- [ ] Create `src/components/BulkImportWizard.tsx` — step-by-step import UI
  - Step 1: Upload CSV file
  - Step 2: Map CSV columns to system fields
  - Step 3: Preview and validate data (show errors per row)
  - Step 4: Confirm and import
  - Step 5: Show results (imported, skipped, errors)
- [ ] Implement student bulk import (admission_no, name, class, gender, guardian info)
- [ ] Implement staff bulk import
- [ ] Implement fee structure import
- [ ] Implement marks/grades import
- [ ] Add downloadable CSV templates for each entity type
- [ ] Wire into `PreNAsMarksManagement.tsx` (currently has TODO for bulk import)

### ACTION-3.5: Implement Communication System

**Priority:** 🟡 HIGH
**Effort:** 5-7 days

- [ ] Create SMS gateway integration service (Africa's Talking, Twilio, or local provider)
- [ ] Create email notification service (SendGrid, Mailgun, or SMTP)
- [ ] Implement communication templates with variable substitution (`{student_name}`, `{balance}`, etc.)
- [ ] Wire `CommunicationTemplatesPage.tsx` to real template CRUD
- [ ] Wire `MessageCampaignsPage.tsx` to real campaign execution
- [ ] Implement fee reminder notifications (automated and manual)
- [ ] Implement exam results notification to parents
- [ ] Implement general announcement broadcast
- [ ] Add delivery tracking (sent, delivered, failed)
- [ ] Add opt-out management for parents

### ACTION-3.6: Implement Fee Invoicing Automation

**Priority:** 🟡 HIGH
**Effort:** 3-5 days

- [ ] Implement automatic invoice generation per term based on fee templates
- [ ] Support per-class and per-category fee structures
- [ ] Support transport fee auto-assignment based on route
- [ ] Support boarding fee auto-assignment based on dormitory
- [ ] Implement fee adjustment workflows (scholarships, discounts, penalties)
- [ ] Implement payment allocation to oldest invoice first
- [ ] Implement receipt generation upon payment
- [ ] Add payment method tracking (cash, bank transfer, M-Pesa, cheque)

---

## 12. Action Plan — Phase 4: Production Hardening

**Timeline: Weeks 15-18**
**Goal: Make it safe, reliable, and deployable**

### ACTION-4.1: Build a Backend API Server

**Priority:** 🔴 CRITICAL
**Effort:** 14-21 days

**Option A — Node.js/Express (recommended for consistency with frontend):**
- [ ] Create `server/` directory with Express application
- [ ] Implement PostgreSQL or MySQL database with Prisma ORM
- [ ] Create RESTful API endpoints for all modules
- [ ] Implement authentication middleware (JWT verification)
- [ ] Implement authorization middleware (RBAC permission checks)
- [ ] Implement input validation middleware (zod or joi)
- [ ] Implement rate limiting
- [ ] Implement request logging
- [ ] Implement error handling middleware
- [ ] Create database migration system
- [ ] Create seed data scripts

**Option B — Integrate with ERPNext (faster for schools already using ERPNext):**
- [ ] Use existing ERPNext infrastructure in `src/services/erpnext/`
- [ ] Map SchoolPilot entities to ERPNext doctypes
- [ ] Implement ERPNext API adapter
- [ ] Handle authentication via ERPNext OAuth

**Database schema priorities:**
- [ ] Students, Staff, Parents/Guardians (core entities)
- [ ] Classes, Streams, Subjects (academic structure)
- [ ] Fee Templates, Invoices, Payments (financial)
- [ ] Exams, Results, Grading Schemes (academic performance)
- [ ] Users, Roles, Permissions (access control)
- [ ] Audit Logs (compliance)
- [ ] Academic Years, Terms, Periods (temporal structure)

### ACTION-4.2: Security Hardening

**Priority:** 🔴 CRITICAL
**Effort:** 3-5 days

- [ ] Remove API key injection from `vite.config.ts` (`process.env.GEMINI_API_KEY`)
- [ ] Move all API calls requiring keys to backend proxy
- [ ] Implement Content Security Policy headers
- [ ] Implement CORS configuration (whitelist school's domain only)
- [ ] Implement CSRF protection on all state-changing endpoints
- [ ] Add input sanitization library (DOMPurify for HTML content)
- [ ] Implement input validation on both client and server (zod schemas)
- [ ] Store sessions server-side (Redis or database)
- [ ] Use httpOnly, Secure, SameSite cookies for tokens
- [ ] Implement account lockout after failed login attempts
- [ ] Add password complexity requirements
- [ ] Implement audit logging for all sensitive operations (login, data export, user changes)
- [ ] Add data encryption at rest for sensitive fields (guardian phone, student medical info)
- [ ] Implement data backup encryption
- [ ] Run `npm audit fix` and resolve all vulnerabilities

### ACTION-4.3: Implement Real Offline Support

**Priority:** 🟢 MEDIUM
**Effort:** 5-7 days

- [ ] Configure service worker for static asset caching (already started in `vite.config.ts`)
- [ ] Implement offline data queue for pending writes
- [ ] Implement background sync when connectivity returns
- [ ] Implement conflict resolution UI (`ConflictResolutionInterface.tsx` exists, needs wiring)
- [ ] Show clear offline/online status indicator (`OfflineIndicator.tsx` exists)
- [ ] Queue fee payments and student updates for sync
- [ ] Implement "last synced" timestamp display
- [ ] Test thoroughly with simulated network interruptions

### ACTION-4.4: Performance Optimization

**Priority:** 🟢 MEDIUM
**Effort:** 3-5 days

- [ ] Move infrastructure monitoring components to a dev-only bundle:
  - `MemoryDashboard.tsx`
  - `PerformanceBenchmark.tsx`
  - `ModuleHealthDashboard.tsx`
  - `DatabaseMonitoringDashboard.tsx`
  - `SyncManagementPanel.tsx`
  - `PerformanceMonitor.tsx`
  - `PerformanceMonitorWidget.tsx`
  - `ModuleLoadingPerformancePanel.tsx`
  - `ModuleHealthIndicator.tsx`
- [ ] Implement proper code splitting per module (each module as a separate chunk)
- [ ] Add pagination to all list views that don't have it yet
- [ ] Implement virtual scrolling for large lists (students, transactions)
- [ ] Optimize `import.meta.glob` — only glob pages for enabled modules
- [ ] Remove render-cycle console.log statements
- [ ] Add `React.memo` to expensive pure components
- [ ] Lazy load charting libraries (Recharts) only on pages that use them
- [ ] Measure and optimize Largest Contentful Paint (LCP)
- [ ] Set up bundle size tracking in CI

### ACTION-4.5: Comprehensive Testing

**Priority:** 🟡 HIGH
**Effort:** 7-10 days

**Unit tests (per module):**
- [ ] Test grading engine calculations (all grading scales)
- [ ] Test fee calculation logic (templates, adjustments, balances)
- [ ] Test RBAC permission checks (all roles, all modules)
- [ ] Test data validation rules (required fields, formats, ranges)
- [ ] Test audit log generation

**Integration tests:**
- [ ] Test complete student enrollment flow (application → admission → enrollment → class assignment)
- [ ] Test complete fee cycle (invoice generation → payment → receipt → balance update)
- [ ] Test exam results flow (entry → grading → analysis → report card)
- [ ] Test payroll cycle (setup → computation → payslip generation → approval)
- [ ] Test inventory flow (requisition → PO → reception → stock update)

**E2E tests (Playwright):**
- [ ] Test login as each role (admin, teacher, finance, student)
- [ ] Test student registration complete flow
- [ ] Test fee payment recording
- [ ] Test mark entry and report card generation
- [ ] Test offline → online sync scenario
- [ ] Test concurrent multi-user operations

**Performance tests:**
- [ ] Test with 1,000 students, 100 staff, 50 classes
- [ ] Test with 10,000 students, 500 staff, 200 classes
- [ ] Measure page load times for each module dashboard
- [ ] Measure time-to-interactive for the main dashboard

### ACTION-4.6: Deployment & DevOps

**Priority:** 🟢 MEDIUM
**Effort:** 3-5 days

- [ ] Set up CI/CD pipeline (GitHub Actions or similar)
- [ ] Implement automated testing on pull requests
- [ ] Implement build validation (TypeScript compilation, ESLint, bundle size limits)
- [ ] Create Docker containers for frontend + backend
- [ ] Create docker-compose for local development
- [ ] Set up staging environment
- [ ] Set up production environment with:
  - HTTPS/TLS certificate
  - Database backups (daily)
  - Application monitoring (Sentry is already configured)
  - Uptime monitoring
- [ ] Create deployment runbook
- [ ] Create rollback procedures
- [ ] Set up database migration pipeline

---

## 13. Summary Scorecard

| Category | Current Score | Target Score | Gap |
|---|---|---|---|
| **Architecture & Design** | ⭐⭐⭐⭐⭐ (5/5) | ⭐⭐⭐⭐⭐ (5/5) | Multi-deployment provider strategy, module federation, UDS design — all excellent |
| **Data Layer Wiring** | ⭐⭐ (2/5) | ⭐⭐⭐⭐⭐ (5/5) | Providers are built (PouchDB verified, SQLite implemented) but UDS not wired, feature flags all off, mock is the only active path |
| **UI/UX** | ⭐⭐⭐⭐ (4/5) | ⭐⭐⭐⭐⭐ (5/5) | Polish, accessibility |
| **Functionality** | ⭐⭐ (2/5) | ⭐⭐⭐⭐⭐ (5/5) | Implement all TODOs, build missing modules (Admissions, Audit, grading engine) |
| **Security** | ⭐ (1/5) | ⭐⭐⭐⭐ (4/5) | Real auth (local for Standalone, JWT for Networked+), input validation, encryption |
| **Code Quality** | ⭐⭐ (2/5) | ⭐⭐⭐⭐ (4/5) | Clean dead code, logging, duplicates |
| **Test Coverage** | ⭐⭐ (2/5) | ⭐⭐⭐⭐ (4/5) | Business logic tests, E2E tests |
| **Production Readiness** | ⭐ (1/5) | ⭐⭐⭐⭐ (4/5) | Activate providers, backend for Networked+ modes, deployment pipeline |
| **Documentation** | ⭐⭐⭐⭐ (4/5) | ⭐⭐⭐⭐⭐ (5/5) | Extensive arch docs exist; README needs update to reflect actual (not aspirational) state |
| **i18n** | ⭐ (1/5) | ⭐⭐⭐ (3/5) | Add Kiswahili, complete English keys |

**Overall: ⭐⭐ (2.3/5) → Target: ⭐⭐⭐⭐ (4.4/5)**

**Bottom Line:** The architectural vision is strong and thoroughly documented. The gap is in **activation and completion** — providers need to be turned on (not rebuilt), feature flags need to be enabled, and the core school features (auth, admissions, grading, reports) need implementation behind the now-working data layer.

---

## 14. Issue Tracker Checklist

Copy these into your issue tracker (GitHub Issues, Jira, Linear, etc.) for tracking.

### 🔴 Critical (Must Fix Before Any School Deployment)

- [ ] **CRIT-001** — Activate the UDS and wire PouchDB as default Standalone provider (providers exist — turn them on, enable feature flags, test persistence across page refresh)
- [ ] **CRIT-002** — Fix hardcoded demo mode (`|| true` in AuthContext line 61 → `?? false`)
- [ ] **CRIT-003** — Implement real password validation (bcrypt in PouchDB `users` collection for Standalone; JWT for Networked+)
- [ ] **CRIT-004** — Implement proper session tokens (local secure session for Standalone; JWT for backend modes)
- [ ] **CRIT-005** — Build the Admissions module (directory is completely empty)
- [ ] **CRIT-006** — Implement User/Role/Workflow CRUD (replace all `alert("not yet implemented")`)
- [ ] **CRIT-007** — Build backend API server for Networked/Hosted/SaaS modes (not needed for Standalone — PouchDB/SQLite is sufficient)
- [ ] **SEC-001** — Remove API keys from client bundle
- [ ] **SEC-002** — Implement password hashing
- [ ] **ACTION-1.1** — Enable `useUnifiedDataService: true`, wire PouchDB as default, create first-run deployment mode selector
- [ ] **ACTION-2.1** — Implement real authentication (Standalone local auth + Networked+ JWT auth)
- [ ] **ACTION-2.2** — Implement user/role/workflow management via UDS (not direct API calls)
- [ ] **ACTION-3.1** — Implement grading engine (CBC rubrics + traditional percentage grading)
- [ ] **ACTION-3.2** — Implement report generation with PDF/Excel export
- [ ] **ACTION-4.1** — Build Express backend API for Hosted/SaaS modes (move `pg`, `mysql2`, `better-sqlite3` deps here)
- [ ] **ACTION-4.2** — Security hardening

### 🟡 High Priority (Required for Practical Use)

- [ ] **ACTION-1.1b** — Clean up dependencies: move server-side native modules to `server/package.json`, remove premature LiveStore packages, move `@faker-js/faker` and `puppeteer` to devDeps
- [ ] **ACTION-1.2** — Move wrong-category dependencies to devDeps
- [ ] **ACTION-1.3** — Clean ~65 junk files from project root
- [ ] **ACTION-1.4** — Delete backup and legacy files
- [ ] **ACTION-1.5** — Remove ~200+ debug console.log statements
- [ ] **ACTION-1.6** — Consolidate duplicate type definitions
- [ ] **ACTION-2.4** — Build the Audit module
- [ ] **ACTION-2.5** — Connect dashboards to real data (remove hardcoded values)
- [ ] **ACTION-3.3** — Add Kiswahili language support
- [ ] **ACTION-3.4** — Implement bulk data import (CSV)
- [ ] **ACTION-3.5** — Implement SMS/email communication system
- [ ] **ACTION-3.6** — Implement fee invoicing automation
- [ ] **ACTION-4.5** — Comprehensive testing suite
- [ ] **SEC-003** — Implement input sanitization
- [ ] **SEC-004** — Implement CSRF protection

### 🟢 Medium Priority (Nice to Have for Launch)

- [ ] **ACTION-1.7** — Remove deprecated components (DataModeSwitch, legacy settings pages)
- [ ] **Activate SQLite OPFS** as alternative Standalone provider (gives schools a choice between PouchDB and SQLite)
- [ ] **Deploy CouchDB companion** for Networked mode (Docker Compose spec already in `docs/database/deployment-guide.md`)
- [ ] **Migrate RxDB schemas** — Port the 40+ collection schema definitions from `rxdbService.ts` to PouchDB schema format, then evaluate removing `rxdb`/`rxjs` packages
- [ ] **ACTION-4.3** — Implement real offline support (sync queue, conflict resolution UI)
- [ ] **ACTION-4.4** — Performance optimization (move infra dashboards to dev-only bundle, code splitting per module)
- [ ] **ACTION-4.6** — CI/CD pipeline and deployment
- [ ] **SEC-005** — Replace `window.confirm()` with proper modals

### 🔵 Low Priority (Post-Launch Improvements)

- [ ] Parent portal with login and student progress view
- [ ] Student self-service portal
- [ ] Mobile app wrapper (Capacitor/React Native) — Mobile deployment mode already designed in `MASTER_ROADMAP.md`
- [ ] Advanced analytics dashboards
- [ ] Complete ERPNext connector (`src/services/erpnext/`) — ERPNext deployment mode
- [ ] Evaluate LiveStore integration — Phase 4 per `DATA-layer-modernization-plan.md`; re-add `@livestore/*` packages at that time
- [ ] Multi-school district dashboard (separate app consuming SaaS API, per `DEPLOYMENT_CLARIFICATION.md`)
- [ ] API for third-party integrations
- [ ] Automated fee reconciliation with bank statements
- [ ] M-Pesa Daraja API integration for Kenyan fee collection
- [ ] Barcode/QR code for library books
- [ ] Biometric attendance integration
- [ ] Custom report builder

---

## Appendix A: File Inventory — Root-Level Files to Delete

These files at the project root are test scripts, debug artifacts, or backup files that should be removed:

```
DataModeManager.test.ts.backup
QWEN.md
ROUTING_ISSUE_RESOLVED.md
SETTINGS_MODULE_RESTORATION.md
SETTINGS_ROUTING_FIX.md
URGENT_ROUTING_DEBUG.md
app-current-state.png
apply_missing_translations.js
check-app-status.js
check-console-logs.html
check_mode.html
check_translations.js
complete-user-journeys-results.json
debug-console.html
debug-dashboard.js
debug-import-test.js
debug-routes.js
demo.ts
direct_test.js
eslint_report.txt
fix-navigation-issues.js
fix-unified-settings-comprehensive.js
fix-unified-settings.js
fix_imports.js
generate_comprehensive_data.cjs
metadata.json
migration_config.ts
missing_translations_fix.json
module-loading-test-results.json
react19-test-results.txt
run-data-generation.ts
run-demo.ts
schoolpilot_backup_summary.json
schoolpilot_comprehensive_backup.json
schoolpilot_data_backup.json
schoolpilot_final_backup.json
schoolpilot_sqlite_backup.json
simple_test.js
test-all-generators.ts
test-backup-page.cjs
test-clubs-generator.ts
test-dashboard.html
test-generators.ts
test-navigation-debug.tsx
test-output-capture.cjs
test-react19-check.cjs
test-react19-final.cjs
test-react19-simple.cjs
test-results.txt
test-runner.cjs
test-runner.js
test_basic_modules.cjs
test_comprehensive_generation.cjs
test_comprehensive_generation.js
test_create_generator.js
test_data_generation.js
test_data_management.js
test_index_import.js
test_integration_verification.cjs
test_localstorage.html
test_localstorage.js
test_referential_integrity.cjs
test_simple.cjs
test_storage_adapters.cjs
test_storage_simple.cjs
typescript-unified-config-errors-resolution.md
unified-test-dashboard.html
update_imports.cjs
update_imports.ps1
validate-sqlite-implementation.mjs
verify-exports.md
verify-routing.js
verify_fix.html
```

**Total: ~68 files that should not be in the project root.**

---

## Appendix B: Dependency Audit Summary

### Frontend `package.json` — Production Dependencies (current: 70+)

The multi-deployment architecture means most data layer packages are **intentionally present** — each serves a specific deployment mode. The cleanup is about **organizing** them, not deleting them.

| Keep in Frontend | Move to devDependencies | Move to `server/package.json` | Remove from Everywhere |
|---|---|---|---|
| `react`, `react-dom` | `@faker-js/faker` | `better-sqlite3` | `@livestore/*` (6 packages — Phase 4, premature) |
| `react-router-dom` | `puppeteer` | `sqlite3` | `@effect/rpc` (unused) |
| `@mui/material`, `@mui/icons-material` | `@types/*` (all type packages) | `mysql2` | `dotenv` (Vite handles env vars) |
| `@emotion/react`, `@emotion/styled` | | `pg` | |
| `i18next`, `react-i18next` | | `pouchdb-node` | |
| `recharts` | | | |
| `zustand` | | | |
| `date-fns` | | | |
| `framer-motion` | | | |
| `notistack` | | | |
| `clsx`, `tailwind-merge` | | | |
| `uuid`, `lodash` | | | |
| `@sentry/react` | | | |
| `pouchdb`, `pouchdb-browser`, `pouchdb-find`, `pouchdb-upsert` | | | |
| `@sqlite.org/sqlite-wasm` | | | |
| `rxdb`, `rxjs` (keep until schema migration to PouchDB is complete) | | | |
| `dexie` (offline cache layer) | | | |
| `semver` (module dependency versioning) | | | |

**Key principle:** Server-side native modules (`better-sqlite3`, `sqlite3`, `mysql2`, `pg`) are legitimate for migration scripts and the future backend companion server — they just don't belong in the browser bundle. Create a `server/` workspace with its own `package.json`.

**Estimated impact:** Removing LiveStore packages and moving native modules to `server/` eliminates native build requirements for the frontend, reduces `npm install` time, and prevents Vite from attempting to bundle Node.js modules.

---

## Appendix C: Technology Decisions — Aligned with Multi-Deployment Architecture

### The Existing Architecture Is Correct

The project's own documentation (`docs/architecture/DATA_LAYER_STRATEGY.md`, `docs/architecture/DEPLOYMENT_CLARIFICATION.md`, `docs/roadmap/MASTER_ROADMAP.md`) defines a well-reasoned multi-deployment strategy. **The technology choices below respect and extend that strategy** rather than replacing it.

### Provider-Per-Deployment-Mode Matrix (from project docs)

| Deployment Mode | Primary Provider | Sync Provider | Backend | Target School |
|---|---|---|---|---|
| **Standalone** | SQLite OPFS (`@sqlite.org/sqlite-wasm`) | None | None | Rural school, single laptop, no internet |
| **Networked** | PouchDB (`pouchdb-browser`) | PouchDB → CouchDB | CouchDB on LAN server | Small school, 2-20 users, local network |
| **Hosted** | Backend API Provider (`BackendAPIService.ts`) | Real-time via WebSocket | Express/Fastify + PostgreSQL | Medium school with IT staff and server |
| **SaaS Connect** | PouchDB (local cache) | PouchDB → remote CouchDB | External SaaS platform | School subscribing to cloud service |
| **ERPNext** | PouchDB (local cache) | ERPNext API bridge | ERPNext instance | School already running ERPNext |
| **Demo** | Mock (in-memory) | None | None | Development, sales demos |
| **Mobile** | SQLite OPFS | Periodic PouchDB sync | Any of the above | Teachers on-field with tablets |

### Why Each Technology Exists (from `docs/roadmap/MASTER_ROADMAP.md` Appendix)

| Technology | Justification | Status |
|---|---|---|
| **PouchDB** | No collection limits (school needs 88; RxDB free limits to 16). Battle-tested CouchDB sync. Smaller bundle than RxDB. | ✅ Provider verified complete |
| **SQLite WASM (OPFS)** | File-based (easy backup/USB transfer for rural schools). Full SQL for complex report queries. Modern browser storage. | ⚠️ Provider implemented, feature-flagged off |
| **Backend API** | Standard REST client for schools with dedicated servers or cloud backends. Caching, retry, offline queuing built in. | ⚠️ Scaffolded, needs backend server |
| **RxDB** | Legacy — originally chosen for reactive queries, abandoned due to 16-collection limit on free tier. Schemas still define 40+ collections. | 🟡 Migrate schemas to PouchDB, then remove |
| **LiveStore** | Experimental future alternative to PouchDB. Documented as "Phase 4" in modernization plan. | ❌ Premature — remove packages, re-add when implementing |

### Recommended Activation Order

| Priority | What | Why |
|---|---|---|
| **1st** | Activate PouchDB as default Standalone provider | Verified complete, covers the most common school scenario (offline-first) |
| **2nd** | Activate SQLite OPFS as alternative Standalone provider | Better for complex SQL reporting; gives schools a choice |
| **3rd** | Deploy CouchDB companion for Networked mode | PouchDB sync "just works" with CouchDB — Docker Compose spec already exists in `docs/database/deployment-guide.md` |
| **4th** | Build Express backend API for Hosted mode | Where `pg`, `mysql2`, `better-sqlite3` dependencies move to |
| **5th** | Complete ERPNext connector | Scaffolded in `src/services/erpnext/` — map SchoolPilot entities to ERPNext doctypes |
| **6th** | Evaluate LiveStore | Only when Phases 1-5 are stable; re-add packages at that time |

### Complementary Stack (New Additions)

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | Already in place, solid foundation |
| **UI** | Tailwind CSS + Custom component library | Already in place, good quality |
| **State** | Zustand (global) + UDS hooks (data) | Zustand already installed; UDS hooks (`useCollection`, `useDocument`, `useMutation`) defined in `docs/architecture/DATA_LAYER_STRATEGY.md` |
| **Data Layer** | Unified Data Service (UDS) → per-mode providers | The existing architecture — activate it, don't replace it |
| **Standalone Storage** | PouchDB (default) or SQLite OPFS (alternative) | Both providers exist; PouchDB verified, SQLite implemented |
| **Networked Sync** | PouchDB ↔ CouchDB | Battle-tested, Docker Compose spec exists in docs |
| **Hosted Backend** | Node.js + Express + Prisma + PostgreSQL | Consistent with frontend team skills; where native modules belong |
| **Auth (Standalone)** | Local bcrypt hashing in PouchDB `users` collection | No backend needed for single-laptop deployment |
| **Auth (Networked+)** | JWT (access: 15min, refresh: 7 days) | Standard pattern, issued by backend server |
| **Hosting** | VPS (Hetzner/DigitalOcean) or on-premise | Schools need data sovereignty; avoid US-only cloud lock-in |
| **SMS** | Africa's Talking API | Best coverage for Kenyan mobile networks |
| **Payments** | M-Pesa Daraja API | Essential for Kenyan fee collection |
| **Report Export** | `@react-pdf/renderer` + `exceljs` | PDF report cards, Excel fee statements |

---

## Appendix D: Effort Estimation Summary

| Phase | Duration | Key Deliverables |
|---|---|---|
| **Phase 1: Stabilize & Clean** | Weeks 1-3 | Activate UDS + PouchDB provider, enable feature flags, clean codebase, remove dead code, first-run deployment mode selector |
| **Phase 2: Core Functionality** | Weeks 4-8 | Real auth, CRUD for all settings, Admissions module, Audit module, real dashboard data |
| **Phase 3: School-Ready Features** | Weeks 9-14 | Grading engine, report cards (PDF), Kiswahili i18n, CSV import, SMS/email, fee automation |
| **Phase 4: Production Hardening** | Weeks 15-18 | Backend API, security hardening, offline support, testing, CI/CD, deployment |

**Total estimated effort: 18 weeks (4.5 months) with 1-2 developers**

**Minimum Viable School Deployment (Phases 1+2 only): 8 weeks (2 months)**

This gets you: activated data layer with PouchDB persistence, real authentication (local for Standalone mode), working CRUD for all modules, admissions, audit trail, and real dashboard data — enough for a school to start using the system for basic administration in Standalone (offline) mode.

---

*End of Assessment Document*