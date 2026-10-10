# Continuing the PRD on your own machine (local Claude Code)

Everything needed is in the repository. Wave **P0-W1** is being finished on branch
**`prd/P0-W1`** (PR into `consolidation`). Read the newest log first:
[`workflow-log/P0-W1-2026-10-10.md`](./workflow-log/P0-W1-2026-10-10.md).

## 0. Current state (updated at every checkpoint)

_Last update: 2026-10-10, after the scope-widening decision (G03, A01 in fix rounds)._

| Task | State | Where |
| --- | --- | --- |
| A02 B01 C01 C02 D01 D02 E01 F02 | done | on `prd/P0-W1` |
| E02 | done (`b20d180`) | on `prd/P0-W1` |
| G02 | under independent verification | `prd/P0-G02` (origin copy based on `origin/consolidation`; rebase per §3b) |
| G03 | verifier: CHANGES_REQUIRED (no hub used the reset path) → fix round widened to the hub pages | `prd/P0-G03`; fix branch `prd/P0-G03-fix1` (cloud, local until integrated) |
| A01 | widened per decision → fix round making the app fail closed everywhere | `prd/P0-A01`; fix branch `prd/P0-A01-fix1` (cloud, local until integrated) |
| G04, G05, B02 | being implemented by the cloud workflow run `wf_ddc982d0-a8d` | task branches are local to the cloud session until integrated; if the session dies, re-run §3a |
| F01 | waiting on a decision (§3c) | `prd/P0-F01-retry` |

**Standing rule** ([decisions/2026-10-10-scope-widening.md](./workflow-log/decisions/2026-10-10-scope-widening.md)):
a task blocked only by file ownership is widened and proceeds if it gates and merges cleanly.

If a fix round is lost with the cloud session, redo it locally from the task branch with the
verifier's findings (they are in this file's history and the W1 log), then integrate per §3b.

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
