<!--
ABOUTME: Workflow log for the 2026-11-04 modularity audit: what was checked, which files changed, what comes next.
ABOUTME: Documentation only; the findings and the proposed plan live in docs/audit/2026-11-modularity/README.md.
-->

# Modularity audit (2026-11-04)

**Operator:** Mr Genius with Claude · **Base commit:** `547cdcd` (`consolidation`) · **Pushed:** no

## What was done

- **The question.** Does `src/domain` go against the goal of self-sufficient modules, how should it have been built,
  and what else reduces modularity? The first-pass answer was re-checked against source, a fresh build and the
  documents.
- **Corrections.** Of the 22 first-pass claims re-checked, 18 were corrected, reframed or withdrawn and 4 were
  confirmed (audit §3.1).
- **Advisor review (Opus).** It found that the draft's import graph ignored `import.meta.glob`. The rewrite adds glob
  expansion and reachability from the app and server entries.
- **Main finding.** The April 2026 modularity plan (`docs/planning/modularity/`) and the October 2026 PRD and specs
  set opposite metrics. No document supersedes the April plan, and its machinery is still in the tree. A module is
  now a set of screens; half of finance lives in `src/domain/finance`.
- **Recommendation.** Vertical slices over a shared kernel (option B), reached after the steps that both layouts
  share (R1–R10). R0 is a set of decisions for Mr Genius.

## Files

| File | Change |
| --- | --- |
| `docs/audit/2026-11-modularity/README.md` | new: findings, corrections, decisions D1–D9, plan R0–R11 |
| `scripts/modularity/graph.mjs` | new: import graph via the TypeScript parser, globs expanded |
| `scripts/modularity/report.mjs` | new: M1–M3 baselines, cycles, reachability, startup paths |
| `scripts/modularity/deps.mjs` | new: `module.json` vs `moduleDefinition.tsx` dependencies |
| `scripts/modularity/initialjs.mjs` | new: initial JS and preloaded chunks of a build |
| `docs/architecture/MODULE_STRUCTURE_STANDARD.md` | status note: the cross-module advice does not match the code |
| `docs/architecture/module-dependency-system.md` | status note: the described machinery is not on the runtime path |
| `ARCHITECTURE.md` | one row in "Where to look" pointing at the audit |

## Checks

- `npx eslint` on the four scripts: clean.
- `node scripts/prd/fix-encoding.mjs --check` on every changed document: 0 problems.
- The scripts reproduce the audit's numbers: 2,650 files and 12,757 edges; M1 34, M2 61 live, M3 11; 2,672 KB
  initial JS.
- The test suite was not run, because no product code changed.

## Next steps

1. Mr Genius answers R0 (audit §7): layout A or B; delete or wire the unreachable machinery; amend
   `ARCHITECTURE.md:91`; whether NFR-02 is a hard target; the test-import policy.
2. R1: write `docs/prd/workflow-log/decisions/DR-06.md` from those answers, and add R2–R11 to `docs/prd/tasks.json`.
3. R2 then R3: put `report.mjs` and `initialjs.mjs` into CI in report-only mode, then delete the unreachable code
   listed in audit §4.5.

---

## Decisions and R1 (same day, appended)

**Base commit:** `7bbfadb` (`consolidation` was fast-forwarded at 16:53 to include PR #96).

### Mr Genius's R0 answers

- **Layout:** B.
- **Tests:** may import other modules' test doubles for now.
- **Unreachable machinery:** wire it. After the trade-offs were laid out (two loaders, two manifests that disagree, and
  barrels that defeat the bundle ratchet), this was narrowed to "wire the parts that fit B, delete the rest".
- **Cross-module calls:** typed `public.ts` imports.
- **NFR-02:** a ratchet, then a hard gate.
- **Scope:** DR-06, the doc updates and a PRD phase P7, landed on a branch and pushed for a PR.

### Re-measured at `7bbfadb`

- M1 = 36 (26 runtime), up from 34. PR #96 added `reports/pages/StudentVoteheadStatementPage.tsx:18,22` into
  finance's `data/`.
- M2 = 61 and M3 = 11, unchanged.

### Files (R1)

| File | Change |
| --- | --- |
| `docs/prd/workflow-log/decisions/DR-06.md` | new: the decision record |
| `docs/prd/phases/P7-module-boundaries.md` | new: phase plan, 7 waves, 24 tasks |
| `docs/prd/tasks.json` | phase P7 and tasks P7-A01 … P7-Z01 (insertions only, CRLF kept) |
| `docs/prd/README.md` | version 1.1; NFR-09; P7 in the release plan; risk row; DR-06 and DR-07 rows |
| `docs/specs/multi-curriculum-platform/06-platform-architecture.md` | §2.5 amendment note |
| `ARCHITECTURE.md` | layout B in "Modules vs plugins"; invariant 3 amended |
| `docs/architecture/MODULE_STRUCTURE_STANDARD.md` | structure, `public.ts` and cross-module rules per DR-06 |
| `docs/architecture/module-dependency-system.md`, `docs/architecture/architecture.md` | status notes |
| `README.md` | "Modular Design" and the schema-registry line (the old link pointed at a missing file) |
| `docs/planning/modularity/README.md` (new), `modularity_assessment_and_improvement_plan.md` | superseded notes |
| `docs/audit/2026-11-modularity/README.md` | decision summary; D4 marked as revised |
| `docs/prd/workflow-log/PROGRESS.md`, `docs/prd/SCORECARD.md` | regenerated, in a separate commit; the scorecard was last generated on 2026-10-18, so its diff also carries P1–P6 progress since then |

### Next steps

1. Merge the R1 pull request into `consolidation`.
2. Run P7-W1: `Workflow({ name: "prd-wave", args: { wave: "P7-W1", date: "<date>" } })`, or by hand per
   `EXECUTION.md` §8.

### Noticed, not changed (pre-existing at `7bbfadb`)

- `README.md` links that were already broken before this work: `docs/module-dependency-system.md` (the file lives at
  `docs/architecture/module-dependency-system.md`) and `src/contexts/config.ts` (gone).
- `docs/specs/multi-curriculum-platform/06-platform-architecture.md:117` quotes mojibake sequences as examples of what
  CI rejects, so `fix-encoding.mjs --check` flags the whole file. The PRD gate's G5 only checks added lines, so this
  does not fail pull requests; the line predates this work and is left for its owner.
