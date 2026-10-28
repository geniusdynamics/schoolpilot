# P6-E02 — repository hygiene before the repository goes public

Branch `prd/P6-E02`, base `schoolpilot/consolidation` (d4ad94b). Spec 08 §7, second bullet.

## 1. Assistant and IDE configuration: untracked, not deleted

`git rm -r --cached`, so every local copy is still on disk and the tooling that reads it keeps
working; a public clone no longer ships it. Counts are tracked files removed from the index.

| Tree | Files untracked | Why it stays out of the repository |
| --- | --- | --- |
| `.qoder/` | 112 | Qoder assistant agents, a repowiki and specs — local assistant state |
| `.trae/` | 36 | Trae documents, specs and reference screenshots — local assistant state |
| `.agents/` | 10 | A locally installed `master-systems-architect` skill — local assistant state |
| `.zcodeignore` | 1 | ZCode assistant ignore file — local assistant configuration |

`.gitignore` gained a one-line reason for each (`.qoder/` and `.zcode/` were already listed).

## 2. What stays tracked in `.claude/` (31 files), and why

`git grep` over the tracked tree shows these files are read by the project's own documentation
and by the orchestrator, so they ship:

| Kept | Referenced by |
| --- | --- |
| `.claude/workflows/prd-wave.js`, `prd-phase-exit.js`, `prd-scorecard.js` | `docs/prd/EXECUTION.md:106`, `docs/prd/README.md:15`, `docs/prd/LOCAL-HANDOFF.md:200`, `docs/prd/workflow-log/decisions/2026-10-17-model-policy.md:6` |
| `.claude/skills/prd-builder/**` (28 files) | `docs/prd/LOCAL-HANDOFF.md:120` (verification-file format), `docs/prd/README.md:14`, `docs/prd/prd.config.json:11`, `docs/prd/SCORECARD*.md:3` |

Nothing was moved. Moving `.claude/workflows/*.js` to `docs/prd/workflows/` would break the
running PRD workflow, which is launched by path (`.claude/workflows/prd-wave.js`), for the
orchestrator and for every wave still in flight; the brief allows a doc-referenced file to stay
tracked, so the path stays. Historical logs (`docs/prd/workflow-log/P0-W0-2026-10-07.md:110`)
keep their old `.claude/workflows/...` wording: they record what happened, not the current state.

`.claude/*` is now ignored with `.claude/workflows/` and `.claude/skills/prd-builder/` negated,
so a locally installed skill or a `settings.local.json` cannot be committed by accident.

## 3. `.gitignore` and `.gitattributes`

Already ignored and confirmed not tracked: `.env` / `.env.*` (only `.env.example` is tracked),
`coverage/`, `dist/`, `test-results/`, `playwright-report/`, `.prd-gate/`, `*.log`.
Added: `.trae/`, `.agents/`, `.zcodeignore`, the `.claude/*` block above, and `analysis/`
(local analysis scratch space; it does not exist in a clean checkout).

`.gitattributes` is new: `* text=auto` so the index stays normalised (the Windows checkout has
`core.autocrlf=true`), and `binary` for png, jpg, jpeg, gif, ico, webp, woff, woff2, ttf, zip,
pdf. `git status` after adding it lists only this branch's own changes, so it caused no mass
renormalisation.

## 4. Dead code removed (8 files, each with a zero-reference proof)

Proof method: `rg -l -F '<basename>' . --hidden -g '!.git' -g '!node_modules'` over the whole
tracked tree (sources, tests, scripts, configs and docs), which also covers `import.meta.glob`
and string-path imports. Each candidate returned no file other than itself.

| File | Proof / why it is dead |
| --- | --- |
| `public/manifest.json.bak` | 0 hits for `manifest.json.bak`; the PWA reads `public/manifest.json` |
| `fix-content-exports.ps1` | 0 hits for `fix-content-exports`; one-off root script |
| `src/services/database/databaseServiceLegacy.ts` | 0 hits for `databaseServiceLegacy` |
| `src/services/database/test-integration.ts` | 0 hits for `test-integration.ts`; no `package.json` script and no test imports it |
| `src/services/database/test-schema-conversion.ts` | 0 hits for `test-schema-conversion` |
| `src/utils/utils-premium.ts` | 0 hits for `utils-premium` |
| `src/services/dataGeneration/simple-test.js` | 0 hits for `simple-test.js` |
| `src/services/dataGeneration/test-clubs-generator.cjs` | 0 hits for `test-clubs-generator.cjs` |

`src/plugins/**` was not touched (P6-A01 owns that rationalisation).

## 5. Found and listed, deliberately not removed

- **Duplicate pages** (both sides are exported and routed, so removal needs a routing decision,
  not a hygiene delete):
  - `src/modules/academics/pages/ResultsPage.tsx` and `src/modules/academics/pages/results/ResultsPage.tsx`
  - `src/modules/academics/pages/ReportsPage.tsx` and `src/modules/academics/pages/reports/ReportsPage.tsx`
  - `src/modules/academics/pages/ProgrammesPage.tsx` and `src/modules/academics/pages/programmes/ProgrammesPage.tsx`
  - `src/modules/academics/pages/ObservationsCapturePage.tsx` and `src/modules/academics/pages/observations/ObservationsCapturePage.tsx`
  - `src/modules/administration/pages/PromotionRunPage.tsx` and `src/modules/administration/pages/promotion/PromotionRunPage.tsx`
  - `src/modules/reports/pages/AnalysisV2Page.tsx` and `src/modules/reports/pages/analytics/AnalysisV2Page.tsx`

  Evidence: `src/modules/academics/pages/index.ts` exports the flat page, the sub-feature
  `index.ts` exports the nested one, and each has its own `__tests__`; `moduleDefinition.tsx`
  routes `page: 'ResultsPage'`, `'ReportsPage'`, `'ProgrammesPage'`, `'ObservationsCapturePage'`.
- **Duplicate service implementations**: `src/services/database/PouchDBProvider.ts` vs
  `src/services/data/providers/PouchDBProvider.ts`, `SQLiteProvider.ts`, `SQLiteFileProvider.ts`
  (`database/` vs `sqlite/`), `LiveStoreProvider.ts` (`database/`) vs `livestore/LiveStoreProvider.tsx`,
  `sync/SyncManager.ts` (`database/`) vs `services/sync/SyncManager.ts`,
  `database/DatabasePerformanceOptimizer.ts` vs `database/performance/DatabasePerformanceOptimizer.ts`.
  `src/services/database/index.ts` re-exports the `database/` copy and `src/services/data/index.ts`
  the provider copy, so both are live today.
- `src/services/database/test-provider-verification.ts`, `src/modules/portal/examples/StudentInvoiceComponent.tsx`
  and `src/modules/portal/examples/SharedDataExample.tsx`: no code imports them, but
  `docs/database/verify-pouchdb-implementation.md`, `docs/prd/workflow-log/P0-W5-2026-10-18.md`,
  `docs/planning/modularity/1775705853804-silent-harbor.md` and
  `src/core/docs/comprehensive-verification-report.md` name them. Listed, not deleted.
- **Broken `package.json` scripts**: 18 `test:*`, `migrate*`, `export-database` and `analyze-backup`
  entries point at `src/scripts/data-migration/*.ts`, which does not exist; the only copies live
  under `src/scripts/archive/data-migration/` (excluded from typecheck). Left alone: repairing or
  deleting migration tooling for existing installations is a separate decision.
- **Encoding**: `README.md` and several docs still contain mojibake (`??` runs from a failed
  UTF-8 round-trip). Spec 08 §7 asks for it, but it is a separate, mechanical task across dozens
  of files and does not belong in a hygiene commit.
