# Continuing the PRD on your own machine (local Claude Code)

## 0x. P5 complete, P6 next (2026-10-27)

**P0 to P5 are done and merged.** P5 finished 13/13 (PRs #53 and #56) and the UI branches merged too (#54, #55). The phase log is
`workflow-log/P5-phase-complete-2026-10-27.md`. `consolidation` is the integration branch and this checkout sits on it.

**Before P6:** four follow-ups were opened by the phase exit and deferred - P5-Q01 (the gate's own Windows-only suites, so P1 can be
measured locally), P5-Q02 (Ghana BECE aggregate), P5-Q03 (Francophone progression), P5-Q04 (wire the packs into HR and reports). And
the items only people can close: native-speaker review of every locale, the payroll accountant's sign-off on the Kenya pack,
country-pack stewards, the public application wizard's step 1, and the Ethiopian-calendar default for ET locales.

**How P5 was verified, and its one waiver.** Every task was checked by an independent verifier agent. The phase gate passed G1-G8, the
production build and the school-ops probe (15/16, floor 14). P1 (the full suite) **failed locally** on Windows with six files - four
platform-only, two load flakes that pass alone - and is **waived in favour of CI**, whose "Unit tests (no failures beyond
knownFailingFiles)" step passed on all three pull requests. Read the waiver section of the phase log before trusting a local
full-suite run, and run the probe with `--port` because 5299 is the owner's dev server.

## 0y. Paused by the Claude session limit (2026-10-27 00:40 Nairobi; resets 02:10) - history

P5-W2 is complete on `prd/P5-W2` (A03, B01, B02, C01, plus B03 from W3; wave gate 8/8, log `workflow-log/P5-W2-2026-10-26.md`).
Three sub-agents stopped mid-work when the limit hit. Resume each by its OpenChamber session id (model `claude-code/claude-sonnet-5-5`):

| Task | Session | Worktree state at the stop | Resume with |
| --- | --- | --- | --- |
| P5-D01 verifier | `ses_e866196e0ffe56F9EwcFDdmUl2` | `p5d01-verify` clean at `05b88ba` (implementer done, pushed) | rerun the whole verification (brief: the D01 verifier prompt; `_briefs/P5-D01.md`) |
| P5-C02 Uganda | `ses_e86725c2fffeQopt7nD7Lvi2k7` | `p5c02` on `prd/P5-C02`, no commit, 1 changed file | continue from the worktree state (`_briefs/P5-C-PACKS.md`) |
| P5-C03 Nigeria | `ses_e86727220ffeablVeuCqvLxyHW` | `p5c03` on `prd/P5-C03`, local commit `fa533c6` not pushed, 1 changed file | continue: finish, gate (`--base prd/P5-W2`), push |

Then: verifiers for C02 and C03, integrate approved tasks into `prd/P5-W2`, launch C04, C05, C06 (same brief), the P5 phase exit, then P6.
Open PRs (by the owner, from the links in the session): the two UI branches and `prd/P5-W2`.

## 0z. P5-W2 in flight (2026-10-26)

**Done and merged: P0 to P4 (134 tasks) and P5-W1 (A01 #47, A02 #50).** P5 is 2/13, P6 is 0/11. The ledger,
`workflow-log/PROGRESS.md` and `workflow-log/WAVE-MAP.md` agree with this block.

**This wave is P5-W2** (Ethiopian calendar, Kiswahili, French, country pack format), on the wave branch `prd/P5-W2`.
Tasks run in parallel in their own worktrees and are integrated into the wave branch one at a time, once verified:

| Task | What | Branch and worktree | State |
| --- | --- | --- | --- |
| P5-A03 | Calendar abstraction, Ethiopian calendar in the date fields | `prd/P5-A03`, `.claude/worktrees/p5a03` | implemented, gate running, then independent verification |
| P5-B01 | Kiswahili core flows and ke packs, plus the locale completeness check | `prd/P5-B01`, `.claude/worktrees/p5b01` | implementer working |
| P5-B02 | French core flows (reuses B01's checker) | `prd/P5-B02`, same worktree | after B01 |
| P5-C01 | Country pack format and the KE pack, used by the admission and application forms | `prd/P5-C01`, `.claude/worktrees/p5c01` | implementer working |

**Then:** P5-W3 (B03 Portuguese and Arabic, C02 to C06 the country and curriculum packs, D01 the payroll interface and
KE payroll pack) and the P5 phase exit (`node scripts/prd/gate.mjs phase --probe`), then P6. Tasks an agent cannot finish
alone are called out in the wave logs: native-speaker review of every locale, the E04 pilot schools, the E01 licence
decision (DR-03) and the 1.0 release.

**Resume commands** (from the main checkout or any worktree):

```
node scripts/prd/prd.mjs status            # phases, last done, next runnable per lane
node scripts/prd/prd.mjs wave P5-W2        # the wave's tasks with readiness
git worktree list                          # task worktrees; the implementer briefs are in .claude/worktrees/_briefs/
```

Integrating a verified task: in `.claude/worktrees/p5w2`, `git merge --squash prd/<task>`, run
`node scripts/prd/gate.mjs task --base schoolpilot/consolidation --task <id>`, commit with the ledger update in the same commit
(`node scripts/prd/prd.mjs set <id> done --commit <sha>`), push `prd/P5-W2`.

**Sub-agents run on `claude-code/claude-sonnet-5-5`** (the owner's instruction); the default model route has no
credential and fails at once. Implementer and verifier are different agents.

**Pushed and not merged, no PR yet** (opening one needs the owner or a GitHub login on this machine; `gh` is not signed in
here): `prd/ui-brand-home-module-names` and, stacked on it, `prd/ui-settings-hubs`. Merge the first, then the second, with
merge commits. Read `workflow-log/UI-brand-and-settings-hubs-2026-10-26.md`.

## 0a. History — P3 complete, paused before P4 (2026-10-23)

**Phases P0 (52), P1 (28), P2 (22) and P3 (20) are done and merged.** Read
[`workflow-log/P3-W4-2026-10-23.md`](./workflow-log/P3-W4-2026-10-23.md) and the newest P3 log for the
finance phase; [`../architecture/finance-reporting-coverage.md`](../architecture/finance-reporting-coverage.md)
records which finance reports are real and which are placeholders.

**Where the work stands.** P3 was integrated on one branch, `prd/P3-W1`, with a PR opened from it per
wave (#37 W1/W2, #38 W3, #39 W4-W6). The UI-density sweep is on `prd/ui-density`, which **descends from
`prd/P3-W1`**, so P3 must merge first or the cosmetic PR would drag the finance work with it.

**Paused at the owner's request** (tooling update, credits, laptop restart). Resume with **P4**:
`docs/prd/tasks.json` has P4 (12 tasks), P5 (13) and P6 (11) open; `node scripts/prd/status.mjs` lists
what is runnable. Branch P4 from `consolidation` after the P3 and ui-density PRs are merged.

**Two things a resume must know:**

1. **The local gate cannot verify a diff this size on Windows.** `gate.mjs`'s G3 batches
   `vitest related` because of the ~8k command-line cap, and on Windows the batched run fails for
   reasons that are not the code: four suites fail locally that pass on CI (two load-sensitive, two
   gate-tooling tests that are Windows-only). **CI is the authority for a large diff.**
2. **The browser golden paths need one tab only.** Two same-origin tabs fight over the OPFS handle and
   the app refuses to start; use a private `GP1_PORT` because Playwright reuses a running dev server
   outside CI.

Everything needed is in the repository. Wave **P0-W1** is being finished on branch
**`prd/P0-W1`** (PR into `consolidation`). Read the newest log first:
[`workflow-log/P0-W1-2026-10-10.md`](./workflow-log/P0-W1-2026-10-10.md).

## 0. Current state (updated at every checkpoint)

_Last update: 2026-10-19 — P0 waves merged (#18 W3, #19 W4, #21 W5); P0 phase exit deferred (nine unrouted pages, C11/C13). **P1-W1 complete on `prd/P1-W1` (PR #23)**: DR-01 zod v4 `106ea8c`, branded ids + `no-numeric-id` rule `312c34e`, DR-04 live-query cache `fe3ae74`; wave gate PASSED. Next: P1-W2 (P1-A03 entity schemas with zod@3.25.76, P1-D01 EntityPicker)._

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

**Scorecard (prd-builder skill, 2026-10-18):** [SCORECARD.md](./SCORECARD.md) and [SCORECARD-P0.md](./SCORECARD-P0.md) are generated by
`node scripts/prd/prd.mjs scorecard --write [--phase P0]`. Reviews before this date were recorded in logs, not in `tasks.json`, so every
done task shows as *unverified* (half credit). To make the scorecard reflect them, import the verdicts
(`node scripts/prd/prd.mjs verify-import <file.json>`, format in `.claude/skills/prd-builder/references/06-verification-and-review.md` §8)
or audit P0 independently: `Workflow({ name: "prd-scorecard", args: { date: "<YYYY-MM-DD>", phase: "P0" } })`.
`node scripts/prd/prd.mjs check` lists planning gaps (e.g. NFR-02…NFR-06 have no tasks).

**Standing rule** ([decisions/2026-10-10-scope-widening.md](./workflow-log/decisions/2026-10-10-scope-widening.md)):
a task blocked only by file ownership is widened and proceeds if it gates and merges cleanly.

If a fix round is lost with the cloud session, redo it locally from the task branch with the
verifier's findings (they are in this file's history and the W1 log), then integrate per §3b.

Open in W1 now: nothing. Follow-ups are listed in the W1 log ("Wave closure").

### P0-W3 — START HERE (state at 2026-10-18)
Branch **`prd/P0-W3`** (PR #18, draft) = `consolidation` + all W3 work. Every built task is merged into it
(one squashed, gated commit per task). Merge PRs with a **merge commit** only. Nothing is running.

| Task | State | Commit on prd/P0-W3 | Next action |
| --- | --- | --- | --- |
| C06 | done | `4c37e91` | — |
| C07 | done | `4954d7f` | follow-up: pages swallow save/delete errors |
| A05 | done | `24c7ef4` | follow-up: `setup_completed_at` in `src/livestore/schema.ts` if LiveStore goes live |
| E05 | done (verifier APPROVE) | `0c24de5` | — |
| F04 | done (verifier APPROVE) | `02010ff` | — |
| H01 | done (verifier APPROVE) | `09a28bf` | note: stock returns now go through StockLevelService |
| H03 | done (reviewed locally) | `ee51aec` | verifier APPROVE; follow-ups: wallet balance race, plan-activity check |
| H04 | done (reviewed locally) | `f94e641` | verifier APPROVE; follow-up: numeric role types, `SettingsUsersPage` |
| H02 | done (reviewed locally); widened to `crawlCrashPages.smoke.test.tsx` | `caeb00b` | verifier APPROVE; follow-up: fines `amount`/`fine_amount` |
| E04 | done (reviewed locally); widened to `crawlCrashPages.smoke.test.tsx` | `53cba39` | verifier APPROVE; follow-up: transport route schema drift |
| F05 | done (reviewed locally) | `5ff7222` | verifier APPROVE; 40 learners assemble in 6 ms, print-to-PDF 970 ms |
| G08 | done (reviewed locally) | `feea74f` | build `1ddbdc5` + fix `dfb4ad9`; verifier APPROVE after one fix round |
| Q01 | done | `082b71b` | gate `--base` ref resolution, smoke-test import pre-warm, unused test imports |

Reviewing a merged task: ask Claude to "adversarially verify commit <sha> against task <id> in docs/prd/tasks.json
(diff <sha>^..<sha>)". Fixes go on a branch from prd/P0-W3 and are squash-merged back the same way.

Gate base: until PR #18 is merged, always pass `--base consolidation` (the default base, `origin/consolidation`, is stale and lints other W3 files).

Integrating an approved branch (one at a time, main checkout, clean tree):
```bash
git switch consolidation && git merge --squash origin/<branch>
node scripts/prd/gate.mjs task --task <id> --base HEAD     # must print GATE PASSED
node scripts/prd/status.mjs --set <id> done --date <date> && git add -A && git commit   # "<type>(<scope>): <summary> [<id>]"
node scripts/prd/status.mjs --set <id> done --commit $(git rev-parse --short HEAD) && git commit -am "chore(prd): record <id> commit [<id>]"
git push origin consolidation:prd/P0-W3
```

Local steps:
```bash
git fetch origin && git switch -C consolidation origin/prd/P0-W3   # local alias the workflow integrates into
PUPPETEER_SKIP_DOWNLOAD=1 pnpm install --frozen-lockfile
node scripts/prd/status.mjs --wave P0-W3
```
Wave run for G08 (and any task you want re-run from scratch): `Workflow({ name: "prd-wave", args: { wave: "P0-W3", date: "<YYYY-MM-DD>", pushTo: "prd/P0-W3", maxParallel: 2, only: ["P0-G08"] } })`.
When W3 is all done: append "Wave closure" to the W3 log, push, mark PR #18 ready, merge when CI is green. Then W4 (B05, G09–G13, Z01), then `Workflow({ name: "prd-phase-exit", args: { phase: "P0", date: "<date>" } })`.

Model policy: `prd-wave` now picks the model and effort per role and task size (Haiku for loading/logging, Sonnet implements, Opus reviews L tasks and every re-review). Force Opus for a task with `opusTasks: ["P0-…"]` — see [decisions/2026-10-17-model-policy.md](./workflow-log/decisions/2026-10-17-model-policy.md).

Rules that held throughout (keep them): one squashed commit per task, gate before every commit, independent verifier before integration, owner's widening rule (decisions/2026-10-10-scope-widening.md), never commit in the main checkout while a workflow is integrating, merge wave PRs with merge commits.

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
