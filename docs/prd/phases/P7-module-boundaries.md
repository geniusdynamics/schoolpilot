<!--
ABOUTME: Phase 7 plan: make each module own its bounded context over a shared kernel (DR-06, layout B), with one
ABOUTME: manifest, one composition root, public.ts surfaces and CI ratchets. Status lives in ../tasks.json.
-->

# Phase 7 — Module boundaries

**Goal:** a module is a capability, not a set of screens ([DR-06](../workflow-log/decisions/DR-06.md), requirement
NFR-09).
- Each module owns its screens, hooks, domain code, entity schemas and migrations, and contributes them through one
  schema-validated `module.json` to one composition root.
- Modules meet only through typed `public.ts` surfaces.
- The shared kernel (`src/domain`: ids, money, calendar, sequences, shared entities and engines) stays shared.
- CI ratchets the boundary counts (M1–M3) and initial JS (NFR-02) down.

**Not in this phase:** new features; changes to entity definitions or the database schema (every move keeps the
canonical DDL byte-identical); plug-in host wiring (P6-A01's follow-up).

**Inputs:** [modularity audit](../../audit/2026-11-modularity/README.md) · [DR-06](../workflow-log/decisions/DR-06.md)
**Depends on:** P1, P2, P3 · **Runs alongside:** P6 W3–W4 (pilot term, release) · **Estimate:** ≈ 5–7 weeks.

**Baselines** (`scripts/modularity/report.mjs`, at `7bbfadb`):

| Measure | Value |
| --- | --- |
| M1 module → module | 36 edges (26 runtime) in 20 files |
| M2 live shared → module | 61 edges, 11 files |
| M3 domain → data outside the ports | 11 edges (4 runtime) |
| Initial JS | 2,672 KB gzip (at `547cdcd`) |

## Lanes

| Lane | Scope |
| --- | --- |
| A | Measurement & guardrails |
| B | Manifest & composition root |
| C | Startup path & bundle |
| D | Cross-module edges |
| E | Kernel, data & test hygiene |
| F | Context moves (layout B) |
| Z | Phase integration |

## Exit criteria

1. **Boundaries.** `scripts/modularity` report on the exit commit:
   - M1 = 0: modules meet only through `public.ts`;
   - M2 = 0 outside the composition root and the router;
   - M3 = 0 outside the persistence ports.
2. **Manifests.** Every module has one `module.json` that validates against `src/schemas/module-schema.json`, and its
   declared dependencies cover every cross-module import (CI check).
3. **Removal.** Removing any single module folder leaves a passing type-check (the module-removal check, run for every
   module).
4. **Startup.** No module page, mock data or definition is on the static startup graph. Initial JS is reported in CI
   and is not above its ratchet; the NFR-02 hard gate is on once initial JS ≤ 500 KB.
5. **Tests.** No test imports another module's internals or `__tests__` folder; generic doubles live in shared test
   support.
6. **Gate.** `node scripts/prd/gate.mjs phase --probe` → GATE PASSED; baseline tightened; phase-complete log written.

## Waves

| Wave | Focus | Tasks (run in parallel) |
| --- | --- | --- |
| `P7-W1` | Measure in CI; delete the machinery DR-06 drops; mock data off startup; one money; legacy guardian | P7-A01, P7-B01, P7-C01, P7-E01, P7-E02 |
| `P7-W2` | Ratchet; `module.json` as the single manifest; chunking; shared test doubles; domain reaches data through ports | P7-A02, P7-B02, P7-C02, P7-E03, P7-E04 |
| `P7-W3` | `public.ts` contract; composition root and lifecycle | P7-B03, P7-B04 |
| `P7-W4` | Providers and collections contributed; analytics and finance consumers through `public.ts`; composed entity registry | P7-B05, P7-D01, P7-D02, P7-F01 |
| `P7-W5` | Setup, settings and report contributions; home of assessment and curriculum | P7-B06, P7-F03 |
| `P7-W6` | Finance context into `modules/finance`; module enable/disable; startup without module code | P7-F02, P7-B07, P7-C03 |
| `P7-W7` | NFR-02 gate; module-removal check; phase integration | P7-A03, P7-A04, P7-Z01 |

```
W1  A01 │ B01 │ C01 │ E01 E02                     measure · delete · mock data off startup
                  ▼
W2  A02 │ B02 │ C02 │ E03 E04                     ratchet · single manifest · chunks
                  ▼
W3  B03 B04                                       public.ts · composition root
                  ▼
W4  B05 │ D01 D02 │ F01                           providers · edges · composed registry
                  ▼
W5  B06 │ F03                                     setup/settings/reports · assessment home
                  ▼
W6  F02 │ B07 │ C03                               finance move · enable/disable · startup
                  ▼
W7  A03 A04 │ Z01                                 NFR-02 gate · removal check · close
```

**Critical path:** B01 → B02 → B04 → B05 → B06 → C03 → A03 → Z01; the move path B04 → F01 → F02 → A04 runs alongside.

**Highest risk** (size L; Opus review):
- B02: one manifest, and boot without fetching module chunks.
- F01: `EntityName` derived from contributions and still closed.
- F02: 132 finance files moved; refine into sub-tasks at wave start.

### File ownership highlights (full lists in `tasks.json`)

| Wave | Hot file | Owner |
| --- | --- | --- |
| W1 | `.github/workflows/ci.yml`, `package.json` | P7-A01 |
| W1 | `src/contexts/AppDataContext.tsx` | P7-C01 |
| W2 | `ci.yml`, `eslint.config.js`, `package.json` | P7-A02 |
| W2 | `src/modules/*/module.json`, `src/modules/*/moduleDefinition.tsx`, `src/core/moduleRegistration.ts` | P7-B02 |
| W3 | `src/modules/*/module.json` | P7-B03 |
| W3 | `src/modules/*/moduleDefinition.tsx`, `src/core/moduleRegistration.ts` | P7-B04 |
| W4 | `src/modules/*/moduleDefinition.tsx`, `src/contexts/AppDataContext.tsx` | P7-B05 |
| W4 | `src/core/moduleRegistration.ts`, `src/domain/schema/index.ts` | P7-F01 |
| W4 | `src/modules/academics/public.ts` | P7-D01 |
| W4 | `src/modules/finance/public.ts` | P7-D02 |
| W5 | `src/modules/*/moduleDefinition.tsx` | P7-B06 |
| W5 | `src/modules/academics/public.ts` | P7-F03 |
| W6 | `src/modules/finance/**`, `src/domain/finance/**` | P7-F02 |
| W6 | `vite.config.ts` | P7-C03 |

### Notes for implementers

- **Measure before and after every task.** Run `node scripts/modularity/graph.mjs . <tmp>/edges.json`
  and then `report.mjs` (from `scripts/modularity/` once P7-A01 lands), and record M1–M3 in the task notes. "Unreachable"
  means unreachable from `src/index.tsx` and `src/server/cli.ts` per the report. The code moves, so re-run it instead of
  trusting the audit's lists.
- **Interim test policy (DR-06 decision 6).** Until P7-E03 lands, a test may import another module's test doubles and
  nothing else of that module.
- **P7-C01.** `AppDataContext.tsx:22` imports `hasRequiredSchoolData` from `demoDataSeed.ts`; move it out of the glob
  module, or it keeps the mock data on the startup path. `mockPathsRetired.test.ts:47` asserts the glob's pattern
  string; a lazy glob keeps that string.
- **P7-E01.** Keep `canonicalFinance`'s exported names as delegates. Portal and reports still import them, until P7-D02.
- **P7-B02.** Navigation entries carry icon components, so they stay in `moduleDefinition.tsx`; paths and labels may
  move to `module.json`. No field may live in both. At boot, read `module.json` with an eager JSON glob; definitions
  load lazily.
- **P7-B04.** The contribution API must cover everything P7-B05, P7-B06 and P7-F01 contribute, so those tasks add
  entries without editing the shared files.
- **P7-B07** waits for the D lane: once disabling is real, an "optional" dependency the code imports unconditionally
  becomes a crash.
- **P7-D01.** Move the calculations into `src/domain/assessment`. Their final home is P7-F03's decision; don't create
  `modules/academics/domain` early.
- **P7-E04.** `hasPermission` and `assertCan` are pure predicates. Moving them into the kernel or allow-listing them is
  the call DR-07 records.
- **P7-F01.** Build `EntityName` from a `const` tuple that the composition root assembles, and keep the union closed (DR-01).
- **P7-F02.**
  - Refine into sub-tasks per finance area (ledger, billing, payments, statements, …), as in P3's lanes.
  - The DDL dump must be byte-identical before and after.
  - The hub server must still run finance services (P4-B01).
- **P7-A04.** Use no cron: scheduled workflows do not fire on `consolidation`. Use `workflow_dispatch` and the
  phase-exit gate.
- **Done tasks in earlier phases.** Their `files` fields name old paths. They are history; leave them.

## Tasks

Snapshot generated with the ledger; **status lives in [`../tasks.json`](../tasks.json)**.

#### P7-W1 — Measure in CI; delete the machinery DR-06 drops; mock data off startup; one money; legacy guardian

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P7-A01` | A | Measure module boundaries in CI: promote the audit scripts to scripts/modularity/ and report M1-M3, startup paths and initial JS on every pull request | — | S | The CI job summary of a consolidation pull request shows M1, M2, M3, the static startup... |
| `P7-B01` | B | Delete the module machinery DR-06 drops (ServiceRegistry, useService, registerServices, dynamicModuleLoader, ModuleBundler, useLazyModule, ModularSystem, loading-progress hooks, moduleOrder, moduleCollectionRegistry, hooks/data, pageComponentResolver, portal examples, core/index) and finance's barrel self-import | — | M | Every file on the DR-06 delete list is gone, with its tests; DynamicPageComponent and r... |
| `P7-C01` | C | Take mock data off the startup path: lazy demo seeding (non-eager glob, dynamic imports from dataModeManager, AppDataContext and UnifiedDatabaseManager) | — | S | Report: no mockData.ts file on the static startup graph |
| `P7-E01` | E | One money implementation: canonicalFinance and accountingReports delegate to src/domain/money instead of their own currencyDigits, money, zeroMoney, sumMoney and subtractMoney | — | S | grep: money arithmetic is defined only in src/domain/money (the frozen 005 migration ex... |
| `P7-E02` | E | Remove the legacy guardian write path in src/domain/students and keep only the two record types useLookups needs | — | S | No production code defines or imports saveStudentGuardian, resolvePrimaryGuardian or fi... |

#### P7-W2 — Ratchet; module.json as the single manifest; chunking; shared test doubles; domain reaches data through ports

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P7-A02` | A | Ratchet the boundaries: CI fails when M1, M2 or M3 exceed scripts/modularity/baseline.json; ESLint mirrors M1 and M3, keeps modules/<x>/domain free of UI imports and counts useAppData (spec 06:52); remove the old cross-module script and workflow | P7-A01, P7-B01, P7-C01 | M | A pull request adding a module-to-module import outside public.ts fails CI, naming file... |
| `P7-B02` | B | Make module.json the single manifest: ModuleMetadataLoader feeds registration, moduleDefinition.tsx keeps only React-bound fields, add src/schemas/module-schema.json, reconcile the disagreeing manifests, settle todos and modules/core, drop the unused feature flags | P7-B01 | L | No field is declared in both module.json and moduleDefinition.tsx (manifest check) |
| `P7-C02` | C | Let Rollup split on real import boundaries: drop the per-module and catch-all vendor manualChunks rules | P7-C01 | S | vite.config.ts names no module chunk and no catch-all vendor chunk |
| `P7-E03` | E | End the interim test policy of DR-06: move the generic repository doubles into shared test support and point every test at them | — | S | Report: no test imports another module's __tests__ folder |
| `P7-E04` | E | Domain reaches data only through the persistence ports: resolve the 11 imports of data/auth and data/query, and record the finance stores' repository bypass as DR-07 | — | S | Report: M3 = 0 outside data/repository and data/adapters/sqlite, or each remaining edge... |

#### P7-W3 — public.ts contract; composition root and lifecycle

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P7-B03` | B | Give every module a typed public.ts checked by ModuleExports against module.json provides; delete the unused index.ts barrels | P7-B02 | M | Every module has public.ts exporting what other modules import today |
| `P7-B04` | B | Composition root: registration built from the manifests with lazy definitions, lifecycle hooks honoured, and a typed contribution API so a module needs no shared edits | P7-B02 | M | A fixture module folder (module.json + moduleDefinition.tsx) registers with no edit out... |

#### P7-W4 — Providers and collections contributed; analytics and finance consumers through public.ts; composed entity registry

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P7-B05` | B | Contributions part 1: data providers and collections come from module manifests, providers mount inside their module's routes, and contexts/data and services/database stop naming modules | P7-B04 | M | Report: contexts/data/index.ts, services/database/collections.ts and services/database/... |
| `P7-D01` | D | Reports analytics go through academics' public surface: move the cohort, heatmap, ranking and distribution calculations out of academics pages | P7-B03 | M | Report: reports-to-academics edges only through modules/academics/public.ts |
| `P7-D02` | D | Finance's consumers go through finance's public surface (portal balances, the votehead statement, administration's financial pages), and administration stops importing admissions' internals | P7-B03, P7-E01 | M | Report: portal-to-finance, reports-to-finance (outside the hub, see P7-B06) and adminis... |
| `P7-F01` | F | Composed entity registry: EntityName derived from kernel and module contributions; the schema-migration list, ledger-chart seeding and demo seeding move from src/data into the composition root (amends spec 06:56 and DR-01) | P7-B04, P7-E04 | L | EntityName stays a closed union (type test: an unknown entity name does not compile) |

#### P7-W5 — Setup, settings and report contributions; home of assessment and curriculum

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P7-B06` | B | Contributions part 2: setup steps, settings tabs, report entries and shared types come from module manifests; the reports hub renders finance's reports by id | P7-B05 | M | Report: M2 = 0 outside the composition root and the router |
| `P7-F03` | F | Decide and apply the home of assessment and curriculum (academics' context or the kernel), place PromotionService, and record where payroll goes once hr uses it | P7-F01, P7-D01 | M | src/domain/README.md lists every remaining src/domain folder as kernel, with its reason |

#### P7-W6 — Finance context into modules/finance; module enable/disable; startup without module code

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P7-F02` | F | Move the finance context into modules/finance: domain code, entity schemas and migrations contributed through the manifest (refined into sub-tasks at wave start) | P7-F01, P7-D02 | L | src/domain/finance is gone; finance domain code lives in src/modules/finance/domain wit... |
| `P7-B07` | B | Wire module enable and disable (useModule, moduleManagementService, moduleConfigService) behind the settings Modules tab, refusing to disable a module that another enabled module requires | P7-B06, P7-D01, P7-D02 | M | Disabling a module in Settings hides its routes and navigation and runs its onDisable (... |
| `P7-C03` | C | Startup carries no module code: confirm per-route providers, split the remaining vendor code and lazy-load the retired providers' dependencies | P7-B05, P7-B06, P7-C02 | M | initialjs: no module chunk or module page code in modulepreload; initial JS recorded ag... |

#### P7-W7 — NFR-02 gate; module-removal check; phase integration

| Task | Lane | Title | Depends on | Size | Acceptance (summary) |
| --- | --- | --- | --- | --- | --- |
| `P7-A03` | A | Enforce NFR-02: initial JS ratchet in CI, switching to a hard 500 KB gate once under it | P7-C03 | S | A build whose initial JS exceeds the baseline fails CI |
| `P7-A04` | A | Module-removal check: deleting any one module folder leaves a passing type-check (manual workflow and phase gate) | P7-F02, P7-F03 | S | For every module, removing its folder in a scratch worktree type-checks clean (the run... |
| `P7-Z01` | Z | Phase integration: rewrite MODULE_STRUCTURE_STANDARD and ARCHITECTURE.md to the implemented structure, regenerate PROGRESS and the scorecard, tighten the gate baseline | P7-A03, P7-A04 | S | Every path the rewritten docs name exists (doc path check) |
