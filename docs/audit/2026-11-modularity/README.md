<!--
ABOUTME: Modularity audit of src/domain, the module system and the import boundaries, re-verified from source.
ABOUTME: Holds the corrected findings, the proposed decisions and an ordered resolution plan; documentation only.
-->

# Modularity audit — `src/domain`, the module system and the boundaries

**Date:** 2026-11-04 · **Commit:** `consolidation` @ `547cdcd` · **Status:** findings verified; decided in [DR-06](../../prd/workflow-log/decisions/DR-06.md), executed as phase [P7](../../prd/phases/P7-module-boundaries.md)

> **Decisions (2026-11-04, [DR-06](../../prd/workflow-log/decisions/DR-06.md)):**
> - **Layout:** B.
> - **Unreachable machinery:** *wire the parts that fit B* (`module.json` + `ModuleMetadataLoader`, `ModuleExports`,
>   lifecycle hooks, enable/disable) *and delete the rest*. This revises D4 below.
> - **Cross-module calls:** typed `public.ts` imports.
> - **NFR-02:** a ratchet, then a hard gate.
> - **Tests:** may import other modules' test doubles for now.
> - **`ARCHITECTURE.md:91`:** amended.
>
> This document stays a snapshot of `547cdcd`. At `7bbfadb`, M1 had grown to 36 (PR #96); M2 and M3 were unchanged.
**Scope:** documentation only; no product code changed.
- This audit re-checks the first-pass answer given in chat the same day; [§3](#3-corrections) records what changed.
- An advisor reviewed a draft. The review found that the draft's import graph ignored `import.meta.glob`, and the
  reachability analysis in this version came out of that.
- The counts can be reproduced with [`scripts/`](scripts/) ([§8](#8-method)).

## 1. The question

> Under `src/` we have `domain/`, which I presume corresponds to the domains the system correlates to (finance,
> academics, curriculum …). The project was built to be **fully modular**: each module self-reliant and
> self-sufficient, and every new module built the same way. Do these domains go against that metric? How should they
> have been implemented? And did `docs/prd`, which introduced them, or anything else, make the system less modular?

## 2. Short answer

1. **Yes, `src/domain` goes against that metric, and the metric is written down.**
   - Your metric is the project's own April 2026 plan: modules own their types, schemas and migrations
     (`docs/planning/modularity/modularity_assessment_and_improvement_plan.md:57-67`).
   - The root `README.md:122` still says "Each business module is self-contained with its own types, schemas, and data".
   - The October 2026 PRD and specs replaced that design without saying so. They introduced one canonical model, which
     "replaces … module-local types" (`docs/specs/multi-curriculum-platform/02-domain-model.md:3-5`). They also moved
     schemas to `src/domain/schema` (`06-platform-architecture.md:56`) and laid out `src/domain/finance/<area>` to
     mirror the work lanes "so W3–W4 run 4–5 implementers concurrently" (`docs/prd/phases/P3-finance.md:17`).
   - No document supersedes the April plan, and P1 left its machinery in place.
2. **A module is now a set of screens, not a capability.** Finance has 132 production files in `src/domain/finance` and
   135 in `src/modules/finance`. Deleting `modules/finance` removes the screens and leaves the capability behind.
   Adding a module means editing several shared lists ([§4.2](#42-a-module-is-a-ui-slice)).
3. **The shared layer itself is not the problem.** `src/domain` is the cleanest code in `src/`: in production it
   imports no module, component, context or hook. Learners, money, ids, sequences and the calendar must be shared. What
   costs modularity is elsewhere:
   - live shared files import specific modules (61 edges from 11 files);
   - modules import each other's internals (34 edges);
   - 28 source files of module-system code are unreachable;
   - the guardrails can't see globs;
   - the startup bundle loads every module, mainly through an eager glob of each module's **mock data**.
4. **How it should have been done:** vertical slices over a shared kernel.
   - The kernel holds ids, money, sequences, the calendar, shared entities and shared engines.
   - Each module owns its bounded context: domain code, entity schemas and migrations. It contributes them to one
     composed registry, so the canonical model and its single schema registry survive.
   - Modules meet only through a public surface and one composition root, enforced in CI.
   - This satisfies spec 02's goal (one definition per entity, no denormalised copies) *and* your metric. The two
     conflict only over **where** entity definitions live, not over **whether** there is one of each.

**Recommendation.** Do the common steps first (R1–R10 in [§7](#7-resolution-plan)): they fix the coupling that hurts
today under either layout. Moving contexts into their modules (R11) comes last, one context at a time, starting with
finance. It needs a decision record that amends spec 06:56.

## 3. Corrections

### 3.1 To the first-pass answer

| First-pass claim | Re-check | Verdict |
| --- | --- | --- |
| The "fully modular" expectation is yours, not the PRD's | It is not in the PRD or specs. It is the documented April 2026 plan, and `README.md:122` and `docs/architecture/architecture.md:46,272` still say it | Corrected |
| `domain → data`: 82 imports (51 type-only, 31 runtime) | 86 production edges in 60 files: 61 type-only, 25 runtime. The runtime ones are error classes, the audit writer, permission checks and `readEveryPage` | Numbers corrected |
| `data → domain`: 114 files | 114 edges including tests; 58 production files | Corrected |
| "That's a cycle; neither layer can be built alone" | No runtime cycle touches `data` or `domain` (6 cycles in `src`, none there). The folders point at each other only because `src/domain` holds the schema and ids (below the data layer) and the services (above it) | Withdrawn |
| `domain` is welded to a browser SQLite adapter and can't run on the server | `SqliteAdapter` is an interface (`src/data/adapters/sqlite/driver.ts:54`) with a browser and a `better-sqlite3` implementation (`node.ts:1`); `src/server/LANServer.ts:11` uses the Node one | Withdrawn |
| Rule: domain may import only domain and a new `src/contracts` | The repository and adapter interfaces already are the ports; a second folder of ports adds nothing | Withdrawn; see D3 |
| The schema registry is one closed module; split it per context | Entity schemas are already one file per context; the index is the composition point the closed `EntityName` union needs (P1-A03, `DR-01.md:100`). Composing it from module contributions is option B (D1), not a fix by itself | Reframed |
| 34 production module→module imports across 5 pairs | Confirmed: 34 edges in 19 files, 24 runtime, none through another module's barrel | Confirmed |
| "The declared graph is fiction" (table built from `module.json`) | `module.json` is never loaded. The runtime manifests (`moduleDefinition.tsx`) declare 4 of the 5 real pairs, 3 of them as *optional* although the code imports them unconditionally; only `administration → admissions` is undeclared. The two manifests disagree in 11 of the 12 modules that have both | Corrected |
| Finance `module.json`: administration plus *optional* academics | Both are **required** | Corrected |
| Flag `features.moduleJsonMetadata` | The flag is `useModuleMetadata` (`src/config/features.ts:129`). Nothing reads it, nor `useSharedDataHook` (`:119`) | Corrected |
| Registration is hand-written in four places, including `moduleOrder.ts` and `moduleCollectionRegistry.ts` | Both of those files are unreachable. The live hand-written lists are others ([§4.2](#42-a-module-is-a-ui-slice)) | Corrected |
| Lifecycle is dead | Confirmed. The lifecycle functions have no caller. `convertToLoadedModule` installs logger-only hooks (`src/core/moduleRegistration.ts:105-116`) | Confirmed |
| Guardian services exist twice | The legacy write path (`src/domain/students/guardianService.ts`) has no production caller; its only importer takes a type (`src/hooks/useLookups.ts:6`) | Corrected: dead code, not a rival |
| `domain/reports` holds test fixtures | It is the report-document engine; the only fixture is `__fixtures__/cards.ts` | Corrected |
| `dist` was newer than the last source change | Wrong: it was built 2026-11-03 21:13 and the last `src` commit is 23:02. A 2026-11-04 rebuild produced identical chunk hashes, so the sizes stand | Reasoning corrected |
| Initial JS 2,678 KB gzip, all 12 module chunks preloaded | 2,672 KB (gzip -9, 22 files); all 12 preloaded | Confirmed |
| Cause: `AppDataContext` statically imports the module providers | That is the *second* path. The first static path into 10 of the 12 modules is the eager glob of every `mockData.ts` in `services/database/demoDataSeed.ts:33` ([§4.7](#47-startup-bundle)) | Corrected |
| Mounting providers in module routes "gets you near 500 KB" | Module chunks are 911 KB of 2,672; `vendor` alone is 1,100 KB | Withdrawn |
| P1 exit criterion: "AppDataContext retired" | The criterion is "useAppData() only for read-only legacy compatibility or removed" (`docs/prd/phases/P1-core-model.md:39`). Retirement is the phase *outcome* (`docs/prd/README.md:105`, spec 06:27) | Corrected |
| Reuse the plug-in mechanism for cross-module calls | The P6-A01 notes say "SDK is real code, host wiring not done" (`docs/prd/tasks.json:4622-4646`); FR-26 is priority **Could** (`docs/prd/README.md:84`) | Withdrawn |
| ESLint guards 2 of 6 module subpaths; the detect script finds 9, not the 34 | Confirmed, and wider: neither tool sees `import.meta.glob` ([§4.6](#46-guardrails)) | Confirmed |

### 3.2 To this audit's own draft, after the advisor's review

- **Globs were ignored.** The draft's graph skipped `import.meta.glob`; this version expands globs and
  `new URL(…, import.meta.url)`.
- **"Unreachable" now means unreachable.** The draft judged dead code by "has no importer". This version uses
  reachability from the app entry (`src/index.tsx`) and the server entry (`src/server/cli.ts`). As a result:
  - `hooks/data/*` and `services/ui/pageComponentResolver.ts` moved from "live coupling" to dead code;
  - a second, unreachable module loader came to light (§4.5).
- **"No module barrel is imported" was wrong.** `modules/finance/pages/SupplierInvoicesPage.tsx:6` imports its own
  barrel.
- **"Users can disable modules" was wrong.** The draft cited `hooks/useModule.ts`, which is unreachable. No reachable
  code calls `disableModule` (`src/core/moduleLoader.ts:448`).
- **Spec 06 §2.1 was misread.** The diagram draws domain services and repositories as *siblings* under the hooks
  (`06:19-21`), and `06:25` says writes go "through domain services or repositories". That services sit on top of
  repositories is the implementation's choice (P1-B04; `src/domain/services/guardianService.ts:3`), not the spec's.
- **The `data/migrations/00x-legacy-fixture.ts` files don't run at startup.** Only tests import them.

## 4. Verified findings

### 4.1 What `src/domain` is

**Where it came from.**
- The PRD introduced it. The first file under it came with P0-E02 (`b20d180`, 2026-10-10).
- `docs/prd/phases/P0-stabilisation.md:97` puts billing "under `src/domain/finance/` so P3 can extend it".
- Spec 06 names the folder at `:53` and `:56`.
- P1-A02, P1-A03 and P1-B04 created `ids.ts`, `schema/` and `services/`.
- The P3 lane rule (`P3-finance.md:17`) shaped `domain/finance/<area>` to match `modules/finance/pages/<area>`.

**What it holds.** Four tiers, which no document names:

| Tier | Members |
| --- | --- |
| Kernel | `ids.ts`, `schema/`, `money/`, `sequences/`, `calendar/` |
| Contexts and engines | `finance/`, `assessment/`, `curriculum/`, `packs/`, `payroll/`, `reports/` (document engine), `country/`, `workflows/` |
| Application services | `services/` (Admission, Enrolment, Guardian, Attendance, Promotion); `students/` (legacy, dead write path) |
| Tooling | `demo/` (canonical seed data), `repair/` (spec 08 §5 integrity checks) |

**What it imports in production:**
- `modules/`, `components/`, `contexts/`, `hooks/`: **0**.
- `src/data`: 86 edges from 60 files. 61 are type-only; the 25 runtime ones are:
  - repository and adapter error classes;
  - `writeAuditEvent` and `applyAuditSchema`;
  - `assertCan` (`domain/finance/ledger/engine.ts:4`);
  - `hasPermission` (`domain/workflows/guard.ts:4`, `protection.ts:5`);
  - `readEveryPage` (`domain/finance/transport/service.ts:6`).
- 11 of the 86 edges fall outside the persistence ports, all to `data/auth` and `data/query`; 4 of those are runtime.

**The finance stores write their own tables.** `ledger/store.ts`, `payments/session.ts`, `reconciliation/store.ts`,
`subscriptions/store.ts`, `collections/store.ts` and `payments/providers/*` go through `SqliteAdapter` transactions and
call `writeAuditEvent` themselves, instead of going through repositories:
- The spec permits that (`06:25`).
- But those stores now carry the repository's duties themselves: audit (`06:44`), and possibly change events, which
  were not checked.
- No decision record states the choice. P3-C01's "one-transaction post" is the likely reason.

### 4.2 A module is a UI slice

- **The capability spans two trees.** Finance has 132 production files in `src/domain/finance` and 135 in
  `src/modules/finance`.
- **Adding a module means editing shared files, because there is no composition root:**
  - `src/core/moduleRegistration.ts:13-25` (the module list);
  - `vite.config.ts:187-199` (one chunk rule per module);
  - `src/services/database/collections.ts:11-20`, plus `src/contexts/data/index.ts:4-11` and
    `src/contexts/AppDataContext.tsx:34-43` if the module has a legacy provider;
  - `src/core/types/index.ts` if it shares types;
  - `src/domain/schema/index.ts` and `src/data/migrations/schemaMigrations.ts:4-11` for its entities and tables.
- **Removing one leaves the rest behind:** its domain context, its entities, its DDL and those list entries.

**Shared files that import specific modules.** Production edges, with the composition files
(`core/moduleRegistration.ts`, `routing/pageLoader.ts`, `routing/routeConfig.ts`) excluded:

| Live: reachable from the app or server | Edges |
| --- | --- |
| `src/services/database/demoDataSeed.ts:33`: **eager** glob of every module's `data/mockData.ts` | 9 |
| `src/services/database/collections.ts:11-20` | 10 |
| `src/globalProvidersRegistry.ts:44`: lazy glob of every module's `data/index.ts` | 9 |
| `src/contexts/data/index.ts:4-11`, re-exported into `src/contexts/AppDataContext.tsx:34-43` | 8 |
| `src/components/setup/steps/writers.ts:8-28`, `SetupWizard.tsx:24`, `steps/wizardDraft.ts:4` | 9 |
| `src/core/types/index.ts:27-56`, including runtime re-exports (119 production files import `@/core/types`) | 7 |
| `src/services/database/types.ts:17-80` (type-only) | 6 |
| `src/utils/validationSchemas.ts:15,19` | 2 |
| `src/services/tabs/TabStateDeriver.ts:11` | 1 |
| **Total** | **61 edges, 11 files** |

Another 60 edges come from 9 **unreachable** files: `services/module/dynamicModuleLoader.ts` (28),
`hooks/data/index.ts` and `useDatabaseData.ts` (16), `contexts/appData/moduleCollectionRegistry.ts` (8),
`services/ui/pageComponentResolver.ts` (3), and the four test-only `data/migrations/00x-legacy-fixture.ts` (5).

One runtime cycle runs through a module's mock data:
`services/database/UnifiedDatabaseManager.ts → ProviderSelector → databaseService → hooks/useDatabaseCollection →
modules/academics/data/lessonplans/useLessonPlansData → modules/academics/data/mockData → demoDataSeed →
UnifiedDatabaseManager`.

### 4.3 Where `src/domain` is used

Production files per module that import `domain`: academics 47, finance 47, administration 22, reports 9, admissions 6,
hr 4, portal 4, inventory 3, nutrition 3, settings 2, library 1. Every context in use has a clear main user, which is
what option B (D1) needs:

| Context | Production import edges |
| --- | --- |
| `domain/finance` | finance 35, portal 3 |
| `domain/assessment` | academics 33, reports 11, administration 1, `domain/services` 1 |
| `domain/curriculum` | academics 8, administration 1 |
| `domain/reports` | academics 11 |
| `domain/payroll` | none: unreachable from the app and the server; only tests use it |

### 4.4 Module-to-module imports

34 production edges in 19 files. Tests add 39 more; 8 of those import another module's test doubles.

| Pair | Edges (runtime) | What crosses | `moduleDefinition.tsx` declares |
| --- | --- | --- | --- |
| reports → academics | 18 (11) | `reports/pages/analytics/**` imports `academics/pages/marks`, `pages/results`, `pages/observations/data/judgement`, `data/useCanonicalAcademics`: assessment calculations living under academics *pages* | optional |
| reports → finance | 7 (7) | `reports/pages/FinancialReportsHubPage.tsx:18-23` renders six finance **page components**; `reports/utils/studentVoteheadStatement.ts:4` imports finance types | optional |
| portal → finance | 5 (3) | `portal/pages/PortalDashboardPage.tsx:12` and `PortalFeesPage.tsx:14` import `finance/data/canonicalFinance`; `portal/data/usePortalSession.ts:15` imports a finance hook | required |
| administration → finance | 2 (2) | `administration/pages/SchoolPeriodsPage.tsx:12`, `StudentFinancialDetailPage.tsx:6` | optional |
| administration → admissions | 2 (1) | `administration/data/mockData.ts:22-23` | **not declared** |

Two of these "optional" dependencies are imported unconditionally. That has no runtime consequence today, because
nothing reachable disables a module: `useDynamicNavigation` exposes `disableModule`, but no reachable code calls it.
The labels only mislead readers. Within finance, `pages/SupplierInvoicesPage.tsx:6` imports its own barrel, which
closes a 4-file cycle (`InvoicingPage`, `SupplierInvoicesPage`, `pages/index`, `finance/index`). It also pulls
`lifecycle.ts`, `registerServices.ts` and `core/ServiceRegistry.ts` into that page's load, although nothing calls them.

### 4.5 The module system: what runs and what does not

**Runs:**
- `core/moduleRegistration.ts` loads 11 hand-listed definitions at boot (`routing/AppContent.tsx:191` →
  `core/moduleRegistration.ts:216`).
- `moduleRegistry`, `moduleLoader`, `DependencyResolver` and `ModuleLifecycle`, with logger-only hooks.
- The lazy page glob in `routing/pageLoader.ts:30-78`.

**Unreachable from the app and the server:**

| Group | Files |
| --- | --- |
| April "modular system" | `core/ModularSystem.ts`, `ModuleExports.ts`, `ModuleBundler.ts`, `ModuleMetadataLoader.ts`, `core/index.ts`, `hooks/useLazyModule.ts` |
| Second module loader (eager globs over all definitions, including `modules/core`) | `services/module/dynamicModuleLoader.ts`, `moduleManagementService.ts`, `moduleConfigService.ts`, `hooks/useModule.ts`, `hooks/useModuleLoadingPerformance.ts`, `components/ModuleLoadingProgress.tsx` |
| Lists | `moduleOrder.ts` (5 ids that no longer exist), `contexts/appData/moduleCollectionRegistry.ts` (header: "No more manual editing!"), `hooks/data/index.ts`, `hooks/data/useDatabaseData.ts`, `services/ui/pageComponentResolver.ts` |
| Lifecycle and services | `modules/{academics,administration}/lifecycle.ts`; `registerServices.ts` in academics, administration, inventory and reports; `hooks/useService.ts` |
| Definitions | `modules/todos/moduleDefinition.tsx`, `modules/core/moduleDefinition.tsx` (id `dashboard`) |
| Other | `modules/portal/examples/` (2 files); all 13 `module.json` files, whose `$schema` points at a missing `../../schemas/module-schema.json`; the flags `useModuleMetadata` and `useSharedDataHook` |

**Reachable but never executed:** `modules/finance/{index,lifecycle}.ts`, `services/registerServices.ts` and
`core/ServiceRegistry.ts`, all through the self-import in §4.4.

**On the startup graph; whether they execute was not checked:** `services/data/DataContextIntegrationService.ts →
services/module/ModuleDataRegistry.ts → globalProvidersRegistry.ts` (through the `services/data/index.ts:33` barrel),
and `services/module/moduleHealthMonitor.ts`.

### 4.6 Guardrails

- **ESLint.** `eslint.config.js:47-80` blocks `@/modules/*/components/*`, `@/modules/*/services/*` and relative
  `../../*/data` paths. `pages`, `hooks`, `data` and `utils` through `@/` are open.
  - No ESLint rule can see an `import.meta.glob`.
  - The spec 06:52 rule against `useAppData` in new code does not exist. `useAppData` has 166 references in 55
    production module files.
- **`scripts/detect-cross-module-imports.ts:65-129`** finds 9 violations, all core or test files, and none of the 34.
- **`.github/workflows/module-validation.yml`** triggers on `main` and `develop`; pull requests here target
  `consolidation` (`ci.yml:6-7`). It runs `npm ci` in a repository that has only `pnpm-lock.yaml`.
- **`ci.yml`** runs the PRD gate.
  - Gate G7 *does* enforce ESLint (`scripts/prd/gate-baseline.json:32`, `lintRequired: true`), but only on changed
    files (`scripts/prd/gate.mjs:249-261`). So a new boundary rule would fail every pull request that touches a file
    with an existing violation. That is why D8 needs a ratchet.
  - There is no bundle-size step, although spec 06:124 says the budgets are "enforced in CI".

### 4.7 Startup bundle

Fresh `vite build` on 2026-11-04, measured with `scripts/initialjs.cjs`:

| Part | KB gzip |
| --- | --- |
| `vendor` (every `node_modules` package without its own chunk) | 1,100 |
| 12 module chunks: academics 381, administration 143, finance 128, settings 63, reports 42, inventory 38, admissions 32, library 22, nutrition 20, hr 17, portal 13, dashboard 12 | 911 |
| platform: react-vendor 163, database-services 134, routing 98, core 90, pouchdb-vendor 87, ui-components 57, animation 25, main 6, rxjs 3 | 663 |
| **Initial JS** (NFR-02 and spec 06:124: ≤ 500) | **2,672** |
| PWA precache (budget ≤ 3 MB; spec 06:124 recorded 9.1 MB) | 11,509 KiB |
| Largest module chunk (route-chunk budget ≤ 200 KB) | academics 381 |

**How the module chunks get in.** The static startup graph is 592 files. The module files on it are all data files:
mock data, data contexts and the code they import. **None is a page.** Three paths pull them in:

1. **Mock data, for 10 modules.** `App.tsx:5 → contexts/UnifiedConfigContext.tsx:18 → services/data/dataModeManager.ts:10
   → services/database/demoDataSeed.ts:33` eagerly globs every `mockData.ts`. `AppDataContext.tsx:22` and
   `UnifiedDatabaseManager.ts:14` also import `demoDataSeed`.
2. **Data providers and tabs.** `AppDataContext.tsx:34-43` reaches the module providers through
   `contexts/data/index.ts` (this is the path for `modules/core`). Settings comes in through
   `services/tabs/TabStateDeriver.ts:11`.
3. **Boot-time registration.** It fetches all 11 `moduleDefinition.tsx` files. This is dynamic, so it is not a
   preload, but it still happens at boot.

`vite.config.ts:187-199` then puts *every* file under `/modules/<x>/` into one chunk. So each lazy page shares a chunk
with its module's mock data, providers and definition, and the whole chunk is preloaded or fetched at boot.
`vite.config.ts:183` does the same for `node_modules`, in one `vendor` chunk.

**The mock data cannot simply be deleted.** `src/domain/demo/__tests__/mockPathsRetired.test.ts:39-51` keeps the glob
deliberately: pages carrying a GAP marker still read the legacy collections that the seeder fills from these fixtures.

### 4.8 Duplicated primitives

- **Money.** `src/domain/money` has `fromMinor` (`money.ts:92`), `add` (`:184`), `subtract` (`:192`) and
  `currencyDecimals` (`currency.ts:133`). Re-implemented in:
  - `modules/finance/data/canonicalFinance.ts:35-77`: `currencyDigits`, `money`, `zeroMoney`, `sumMoney`,
    `subtractMoney`;
  - `modules/finance/pages/accounting/accountingReports.ts:38`: `sumMoney`;
  - `src/data/migrations/005-fee-rules.ts:21`: `currencyDigits`.
- **Schemas.** Canonical zod schemas live in `src/domain/schema`. The legacy `createDatabaseSchema` is still used in 18
  production files and feeds `services/database/collections.ts`.

### 4.9 Documents that contradict each other

| Says modules are self-contained, or describes unwired machinery | Says otherwise |
| --- | --- |
| `README.md:122` (2025-07) and `docs/architecture/architecture.md:46,272` | spec 02:3-5 (2026-10): the model "replaces … module-local types" |
| `docs/planning/modularity/modularity_assessment_and_improvement_plan.md:57-67` (2026-04-09): modules MUST own types, schemas and migrations and MUST use `AppDataContext` for cross-module data | spec 06:56 (schemas in `src/domain/schema`) and spec 06:27 (`AppDataContext` retired) |
| `ARCHITECTURE.md:91`: "`AppDataContext`, routing, module registry: additive changes only" | spec 06:27; and D4, D5 and R3–R6 below, which delete and rewrite registry and routing code |
| `docs/architecture/MODULE_STRUCTURE_STANDARD.md:80-83`: use `useService()` and the `contexts/data` and `hooks/data` barrels | §4.2, §4.5: one barrel is the coupling, the other is unreachable, and `useService` is unreachable |
| `docs/architecture/module-dependency-system.md`: metadata, validation and version checks | §4.5: none of it runs |

No document in `docs/prd` or `docs/specs` cites `docs/planning/modularity/`. The words modular, self-contained,
standalone, bounded context and module boundary appear nowhere in the PRD or the specs.

## 5. Answer: the domains, the metric, and how it should have been done

**Did the domains go against the metric?** Yes, against your April metric, and silently. The PRD made a layout choice
for its own reasons and never weighed modularity:
- one canonical model (spec 02);
- framework-free services that run unchanged on the hub server (spec 06:26, P4-B01);
- file ownership for parallel work lanes (P3:17).

None of these reasons *requires* `src/domain/finance` to sit outside `modules/finance`.

**The case for modules owning their contexts (steelman).** Each module owns its bounded context: domain code, entity
schemas and migrations, and contributes them to one composed registry. A shared kernel holds what several modules need:
ids, money, calendar, sequences, shared entities. That is a standard modular monolith, and the April plan already let
modules use core services (`:47-50`). Against the arguments usually raised:
- **"One SQLite database needs one schema."** Composition gives one schema.
- **"Self-sufficiency means duplication."** Not if the kernel is shared.
- **"Spec 02 forbids module-local types."** Spec 02 is about one definition per entity, not about which folder holds it.

**The real costs of that option:**
- A large move: 132 production finance files, more for academics.
- The P3 lane layout and the `tasks.json` file paths stop matching the code.
- `assessment` is used by academics, reports, administration and `PromotionService`. It needs an owner with a public
  surface, or a place in the kernel.
- Server-safe domain code and React UI would share module folders, so a rule must keep `modules/<x>/domain/**` free of
  UI imports.

**The two layouts:**

| | A — layered (today) | B — vertical slices over a shared kernel |
| --- | --- | --- |
| A module is | screens and hooks | the capability: screens, domain code, schemas, migrations |
| Removing a module | delete the folder, then also its `src/domain` context, schema entries and DDL | delete the folder; the composed registry and composition root drop it |
| Adding a module | edit `src/domain/schema/index.ts`, `schemaMigrations.ts`, the composition root | add a folder |
| Matches | the PRD as written | your stated goal and spec 02's intent; amends spec 06:56 |
| Cost | the common steps R1–R10 | R1–R10 plus R11 (moving contexts, one at a time) |

**Recommendation: B as the target, because it is the only layout in which "a module" means the capability you asked
about.** R11 fixes no defect a user can see, so it goes last, finance first: finance has a single owner, and only
`portal` consumes it. If per-school builds or independently developed modules are not real requirements, stop after
R10 and stay on A. That is the R0 question.

**Target, under B:**

```
composition root (generated from module manifests)   — the only shared code that names modules
      │ registers
modules/<x>/   pages · components · hooks · domain/ (context services, entity schemas, migrations) · public.ts
      │ may import: own folder, other modules' public.ts, the kernel, data ports
domain/ kernel  ids · money · calendar · sequences · schema common shapes · shared entities and engines
      ▲
data/   repositories (composed from all entity schemas) · adapters
```

## 6. Proposed decisions

All of these are proposals until R0.

**D1 — The metric.** Replace "self-sufficient" with these rules. M5 depends on the layout:

| Rule | Baseline (`scripts/report.cjs`) |
| --- | --- |
| M1 No module imports another module except through `modules/<x>/public.ts` | 34 edges (24 runtime) |
| M2 No live shared file imports a module, except the composition root and the router | 61 edges from 11 files |
| M3 `src/domain` imports no module or UI layer, and imports `src/data` only through `data/repository` and `data/adapters/sqlite` | 0 UI edges; 11 edges outside the ports (4 runtime) |
| M4 One manifest per module, read at runtime; declared dependencies match the imports, and CI checks that | two manifests, unchecked |
| M5 A: removing a module and its domain context leaves a passing build. B: removing the folder alone does | not possible today |
| M6 No module page, mock data or definition on the startup path; NFR-02 budgets reported in CI | 12 module chunks preloaded |

Policy for tests: test files may import another module's `public.ts` or its published test doubles, and nothing else.

**D2 — The kernel stays in `src/domain` under either layout.** Name the tiers (§4.1) in `src/domain/README.md` and
enforce the directions.

**D3 — `data` and `domain`.**
- Keep services on top of repositories, as P1-B04 built them, and keep `data` importing the kernel. No `src/contracts`.
- Fix the 11 edges to `data/auth` and `data/query`: move the permission predicates and `readEveryPage` to a place
  domain may reach, or allow them in the rule explicitly.
- Move the composition that sits in `src/data` into the composition root: the DDL list in `schemaMigrations.ts`,
  `ensureDefaultLedgerCharts` in `canonicalRepository.tsx`, the demo seeding.
- Record the finance-store choice (§4.1) in a decision record.

**D4 — `moduleDefinition.tsx` is the only manifest.** *Revised by DR-06: `module.json` becomes the one manifest, and
`ModuleMetadataLoader`, `ModuleExports`, the lifecycle hooks and enable/disable are wired; the rest is deleted.*
- Delete everything unreachable in §4.5 rather than wiring it: none of it runs, a second loader already shows the cost
  of keeping both, and the plug-in SDK is the extension point for third parties.
- Delete the finance barrel's self-import, and then the barrel.
- Add an optional `lifecycle` to `ModuleDefinition` only when a module needs one; none does today.

**D5 — One composition root, generated from the manifests.**
- Build it from `import.meta.glob('/src/modules/*/moduleDefinition.tsx')` with **lazy** imports, plus a light static
  metadata list, so boot does not fetch every module.
- Settle `todos` and `modules/core` before the glob starts registering them.
- Modules declare contributions: providers, collections, report entries, setup steps and settings pages; under B,
  also entity schemas and migrations. The `EntityName` union is then derived from the contributions, which needs a
  decision record that amends `DR-01.md:100` and spec 06:56.
- The hand-written lists in §4.2 go, `vite.config.ts:187-199` included.

**D6 — The cross-module edges.**
- **Reports analytics:** move the calculations into `domain/assessment` (or academics' `public.ts` under B). Check
  first that they are pure.
- **Finance report pages:** finance contributes them, and the reports hub renders them by id.
- **Portal balances:** move to `domain/finance` on `domain/money`, and delete the money helpers in `canonicalFinance`.
- **Financial years:** administration uses a domain service instead of a finance hook.
- **`administration/data/mockData.ts`:** retired with the fixtures.

**D7 — Bundle, measured after each step; no target number before steps 1–3 are measured.**
1. Make `demoDataSeed` lazy: a non-eager glob, and dynamic imports from `dataModeManager.ts`, `AppDataContext.tsx` and
   `UnifiedDatabaseManager.ts`. `mockPathsRetired.test.ts` still passes, because the glob string stays.
2. Drop the per-module `manualChunks` rules and the catch-all `vendor` rule (`vite.config.ts:183,187-199`).
3. Cut the static shared-to-module imports (D5) and mount module providers inside module routes.
4. Inspect what is left in `vendor`.
5. Add the CI budget report.

**D8 — Guardrails that see globs.**
- Run `scripts/report.cjs` (or its successor) in `ci.yml`, failing when M1–M3 grow past a committed baseline.
- Mirror the simple cases in ESLint `no-restricted-imports` for fast local feedback.
- Add the spec 06:52 `useAppData` rule.
- Add a nightly job that deletes one module at a time and type-checks, for M5.
- Delete `detect-cross-module-imports.ts` and `module-validation.yml`.

**D9 — Documents.**
- `docs/prd/workflow-log/decisions/DR-06.md`, "modularity after the canonical domain model". It records R0, supersedes
  `docs/planning/modularity/`, `README.md:118-124` and the self-contained claims in `architecture.md`, and amends
  `ARCHITECTURE.md:91`. That invariant covers the module registry and routing as well as `AppDataContext`, so R3–R6
  break it unless it is amended first.
- Rewrite the cross-module section of `MODULE_STRUCTURE_STANDARD.md`.
- Turn R1–R11 into `docs/prd/tasks.json` entries with gates.

## 7. Resolution plan

| Step | Work | Size | Done when |
| --- | --- | --- | --- |
| R0 | Mr Genius decides: layout A or B; delete or wire (D4); amend `ARCHITECTURE.md:91`; is NFR-02 a hard target; the test-import policy | — | answers recorded in DR-06 |
| R1 | D9: DR-06, document fixes, `tasks.json` entries | S | no current document states module-owned schemas without a "superseded" note |
| R2 | Measure in CI, report only: `report.cjs`, `initialjs.cjs` | S | every pull request shows M1–M3, startup paths and initial JS |
| R3 | Delete the unreachable code in §4.5 (D4) | S | tests green; type ratchet not raised; M2's dead edges = 0 |
| R4 | D7 step 1: lazy demo seeding (breaks the cycle in §4.2) | S | no `mockData.ts` on the static startup graph |
| R5 | D8 ratchet on the new baseline | S | a new cross-module import fails CI on a `consolidation` pull request |
| R6 | D5 composition root, with `manualChunks` module rules removed | M | M2 = 0 outside the composition root and the router |
| R7 | D6 cross-module edges and `public.ts` | M | M1 = 0 |
| R8 | D7 steps 2–5 | M–L | no `module-*` chunk in `modulepreload`; initial JS reported against 500 KB |
| R9 | §4.8 duplicates; retire mock fixtures as the GAP entities are modelled | S–M | one implementation per money primitive; no `mockData.ts` |
| R10 | D3 `data`/`domain` clean-up | S | M3 = 0 outside the ports; decision recorded for the finance stores |
| R11 | B only: move single-owner contexts into their modules, finance first; decide `assessment`'s owner; place `domain/payroll` when hr starts using it | L | M5 (B) passes for each moved module |

**Not recommended:**
- giving modules their own learner, money or id types;
- loading first-party modules through the plug-in host, which has no host wiring;
- R11 before R6, because without a composition root a move only shifts the hand-written lists.

## 8. Method

All scripts are in [`scripts/`](scripts/) and read the repository without changing it.

```sh
node docs/audit/2026-11-modularity/scripts/graph.cjs . <tmp>/edges.json   # import graph incl. globs
node docs/audit/2026-11-modularity/scripts/report.cjs <tmp>/edges.json     # M1–M3, cycles, reachability, startup paths
node docs/audit/2026-11-modularity/scripts/deps.cjs .                      # module.json vs moduleDefinition.tsx
npx vite build --outDir <tmp>/dist                                         # ~4.5 min
node docs/audit/2026-11-modularity/scripts/initialjs.cjs <tmp>/dist        # initial JS and preloaded chunks
```

- **Graph.** The TypeScript compiler API, over 2,650 files and 12,757 resolved internal edges. It covers static
  imports, re-exports, `import()`, `require`, `vi.mock`, import types, `import.meta.glob` (expanded, with eager and
  lazy marked) and `new URL(…, import.meta.url)`.
- **Tests.** Test files are `__tests__/`, `__mocks__/`, `__fixtures__/`, `*.test.*`, `*.spec.*` and `setupTests`.
- **Reachability.** Computed over runtime edges from `src/index.tsx` and `src/server/cli.ts`. The static startup graph
  uses static imports and eager globs only. Cycles use Tarjan's algorithm over the same graph.
- **Documents.** A read-only search of `docs/prd`, `docs/specs`, `docs/architecture`, `docs/planning`, `README.md` and
  `ARCHITECTURE.md`.

## 9. Verified and not verified

**Verified** against `547cdcd`: every count and `file:line` above.

**Not verified:**
- Runtime behaviour; the app was not booted.
- Whether `ModuleDataRegistry`, `globalProvidersRegistry` and `moduleHealthMonitor` execute at startup.
- Whether the finance stores emit change events.
- Whether the 166 `useAppData` references are read-only, which is P1 exit criterion 1.
- Whether the reports analytics functions are pure.
- What the `vendor` chunk contains.

The test suite was not run, because no product code changed.

**Noticed, out of scope:**
- `docs/prd/tasks.json` still shows phase status `not_started` for P0 (`:38`) and P1 (`:73`), whose tasks are done.
- `docs/prd/SCORECARD.md:458,480` mark the P1 and P6 exit criteria "Not assessed".
- `ARCHITECTURE.md:93` ("Money renders via `formatKES`") predates multi-currency `src/domain/money`.
- `vite.config.ts:190` defines a `module-audit` chunk for a module with no definition. Because there is no
  `modules/core` rule, `modules/core` files fall through to the `'/core/'` rule (`:207`).
