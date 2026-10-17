# Continuing the PRD on your own machine (local Claude Code)

Everything needed is in the repository. Wave **P0-W1** is being finished on branch
**`prd/P0-W1`** (PR into `consolidation`). Read the newest log first:
[`workflow-log/P0-W1-2026-10-10.md`](./workflow-log/P0-W1-2026-10-10.md).

## 0. Current state (updated at every checkpoint)

_Last update: 2026-10-17 — **P0-W2 complete** (14/14 on `prd/P0-W2`, PR #17). Next: merge PR #17, then P0-W3._

| Task | State | Where |
| --- | --- | --- |
| A02 B01 C01 C02 D01 D02 E01 F02 | done | on `prd/P0-W1` |
| E02 | done (`b20d180`) | on `prd/P0-W1` |
| G03 | done (`d61e4fc`) — widened to all 48 hub pages; real-hub crash test | on `prd/P0-W1` |
| G02 | done (`b5ad0be`) — widened to `BookCategoriesPage.tsx` (missing `FormSection` import found by probe C16) | on `prd/P0-W1` |
| A01 | done (`39f990e`) — two fix rounds, independently re-verified (APPROVE); e2e reload + probe C01 PASS | on `prd/P0-W1` |
| G04 | done (`0ab5ce6`) — integration gate PASSED (`--base HEAD`); CI + nightly-probe workflows; actionlint test skips locally unless `ACTIONLINT`/`actionlint` on PATH. CI unit step will fail until `TestCoverage.test.ts` (69.89 < 70) is fixed or baselined | on `prd/P0-W1` |
| G05 | done (`158af75`) — widened per the standing rule: `fast-check@3.23.2` added as a devDependency; full suite 804 files, 0 failed | on `prd/P0-W1` |
| B02 | done — source changes landed in `d50d2ec` (a concurrent handoff commit swept up the staged squash; already pushed, so not rewritten), task record in the following `[P0-B02]` commit — integration gate PASSED (`--base HEAD`, 485 tests); widened to `useExamResultsHorizontal.ts`, `useFinanceServices.ts` and `SyncContext.tsx` (recorded in task notes) | on `prd/P0-W1` |
| F01 | done (`f5e713e`) — accepted on unit evidence; probe C12 deferred until real data ([decision](./workflow-log/decisions/2026-10-10-f01-evidence.md)) | on `prd/P0-W1` |

**Standing rule** ([decisions/2026-10-10-scope-widening.md](./workflow-log/decisions/2026-10-10-scope-widening.md)):
a task blocked only by file ownership is widened and proceeds if it gates and merges cleanly.

If a fix round is lost with the cloud session, redo it locally from the task branch with the
verifier's findings (they are in this file's history and the W1 log), then integrate per §3b.

Open in W1 now: nothing. Follow-ups are listed in the W1 log ("Wave closure").

### P0-W2 status
All 14 tasks done on `prd/P0-W2` — see the "Wave closure" section of [`workflow-log/P0-W2-2026-10-11.md`](./workflow-log/P0-W2-2026-10-11.md) for commits and follow-ups.

### P0-W2 (in progress)
Branch `prd/P0-W2` (based on `consolidation` after the W1 merge; `consolidation` was merged into it as `6574256`). Tasks: A03 A04 B03 C03 C04 C05 D03 D04 D05 D06 E03 F03 G06 G07, run by cloud workflow `prd-wave` (wave P0-W2). Local `consolidation` points at the W2 tip; publish with `git push origin consolidation:prd/P0-W2`.
If the session dies: `git switch -C consolidation origin/prd/P0-W2`, `node scripts/prd/status.mjs --wave P0-W2`, then run §3a with the tasks still `todo` (wave `P0-W2`). Task branches of unfinished tasks live only in the cloud session unless listed here.
Merging rule: wave PRs are merged with a **merge commit** (not squash/rebase) so commit ids stay stable for stacked waves.

Known follow-ups (not W1 blockers): `src/services/database/__tests__/TestCoverage.test.ts` derives coverage from `Math.random()` and fails intermittently (will redden the new CI unit step) — needs a Q task to make it deterministic; never skip it.

Lesson: while a workflow integrates in the main checkout, make orchestrator commits from a separate worktree — a `git commit` in the main checkout takes whatever the integrator has staged (this is how B02's source ended up in `d50d2ec`).

If the cloud session stops: pull `prd/P0-W1`, run `node scripts/prd/status.mjs`, and do whatever the
table above still lists as open, using §3.

## 1. One-time setup

| Need | Version / note |
| --- | --- |
| Node.js | 22.x |
| pnpm | 10.x (`corepack enable`) |
| Claude Code CLI | current; run it from the repo root so `.claude/workflows/prd-wave.js` is found |
| Chromium/Chrome | only for the probe (`gate.mjs phase --probe`); set `CHROMIUM_PATH=/path/to/chrome` |
| Machine | 4+ cores, 8 GB+ RAM per 2 parallel agents (each runs `tsc` + vitest) |

```bash
git clone https://github.com/geniusdynamics/schoolpilot && cd schoolpilot
git fetch origin && git switch prd/P0-W1
PUPPETEER_SKIP_DOWNLOAD=1 pnpm install --frozen-lockfile
node scripts/prd/gate.mjs task --base HEAD --no-test-reason "smoke"   # must print GATE PASSED
node scripts/prd/status.mjs                                           # where we are
```

## 2. The wave branch convention

The workflows integrate into a local branch named `consolidation`. To build a wave on its own branch
(one branch + one PR per wave), point the local `consolidation` at the wave branch and push back to it:

```bash
git branch -f consolidation origin/prd/P0-W1   # local only; never push this to origin/consolidation
git switch consolidation
```

Run the workflow with `push: false`, then publish with `git push origin consolidation:prd/P0-W1`.

## 3. Finish wave P0-W1

**a. Tasks not started (G04, G05, B02)** — in Claude Code:

```
Workflow({ name: "prd-wave", args: { wave: "P0-W1", date: "<YYYY-MM-DD>", push: false, maxParallel: 2,
  only: ["P0-G04", "P0-G05", "P0-B02"] } })
```
then `git push origin consolidation:prd/P0-W1`.

**b. Implemented but not yet integrated (E02, G02, G03)** — their branches are on origin
(`prd/P0-E02-retry`, `prd/P0-G02`, `prd/P0-G03`) but based on the old W0 commit `eb04103`.
Rebase and integrate by hand (each still has to pass the gate; review the diff yourself or ask Claude
to "adversarially verify prd/P0-G02 against task P0-G02 in docs/prd/tasks.json"):

```bash
for b in P0-E02-retry P0-G02 P0-G03; do git fetch origin prd/$b && git switch -C prd/$b origin/prd/$b && git rebase --onto prd/P0-W1 origin/consolidation; done
git switch prd/P0-W1
PRD_DATE=<YYYY-MM-DD> scripts/prd/integrate.sh P0-E02=prd/P0-E02-retry P0-G02=prd/P0-G02 P0-G03=prd/P0-G03
git add docs/prd/tasks.json && git commit -m "chore(prd): record integration commits [P0-W1]" && git push origin prd/P0-W1
```

**c. Decisions you need to make**
- **P0-A01 (persistent storage)** — widen the task to `src/services/database/DatabaseProviderFactory.ts`,
  `UnifiedDatabaseManager.ts`, the app header, `SystemManagementPage.tsx` and the bootstrap so the app
  never silently falls back to memory. Edit the task's `files` in `docs/prd/tasks.json`, set it to `todo`,
  and re-run it starting from branch `prd/P0-A01`.
- **P0-F01 (marks entry)** — accept unit/component evidence and defer probe C12 to P0-B02, or seed exam
  sessions first. Then integrate `prd/P0-F01-retry` as in (b).

When every W1 task is `done`/`deferred`: update the W1 log, `node scripts/prd/status.mjs --write`,
commit, push, and merge PR `prd/P0-W1` → `consolidation`.

## 4. Next waves

`node scripts/prd/status.mjs` lists the next runnable tasks. For wave `P0-W2`: create `prd/P0-W2` from
the updated `origin/consolidation`, repeat §2–§3 with that branch, open one PR.
At the end of P0: `Workflow({ name: "prd-phase-exit", args: { phase: "P0", date: "<YYYY-MM-DD>" } })`.

## 5. Things that went wrong in the cloud runs (avoid them)

- Usage limits stop sub-agents mid-wave. Completed agent results survive; resume the same run with
  `resumeFromRunId` from the same Claude Code session. Task branches are only local until pushed — push
  them (`git push origin prd/<id>`) if you stop for the day.
- After a PR is **rebase-merged**, local branches based on the old commits have different history from
  `origin/consolidation`; the gate's default base then picks an old merge-base. Re-point local
  `consolidation` at the new origin state before the next wave, or pass `--base <branch>` to the gate.
- vitest must not see `.claude/worktrees/` (already excluded in `vitest.config.ts`).
