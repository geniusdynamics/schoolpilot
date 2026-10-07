# Execution Protocol

How every PRD task is built, verified, committed, logged and — if needed — continued by
hand. This protocol is binding for humans and sub-agents alike.

## 1. Units of work

| Unit | Example | Meaning |
| --- | --- | --- |
| **Phase** | `P0` | A release-level outcome with exit criteria ([phases/](./phases)) |
| **Wave** | `P0-W2` | A set of tasks that can run **in parallel** because their files do not overlap and their dependencies are met |
| **Lane** | `P0 · Lane C (Academic structure)` | A stream of related tasks that owns a set of files for the duration of a wave |
| **Task** | `P0-C03` | The smallest unit: one concern, one test-first change, **one commit** |

Task ids: `<phase>-<lane letter><nn>`. Status values in `tasks.json`: `todo`, `in_progress`,
`review`, `done`, `blocked`, `deferred`.

## 2. Golden rules

1. **One task → one commit on `consolidation`.** Intermediate commits on task branches are squashed at integration.
2. **The gate decides.** `node scripts/prd/gate.mjs task --task <id>` must print `GATE PASSED` on the integrated result **before** the commit is created. Any `FAIL` is blocking; `WARN` is allowed and recorded.
3. **Test first** (CLAUDE.md TDD rule). A source change without a test needs `--no-test-reason`, which is recorded in the commit and the wave log.
4. **Never weaken the bar.** No `--no-verify`, no skipped/deleted tests to pass, no edits to `gate-baseline.json` except `gate.mjs baseline --update` (which only tightens), no raising `.type-ratchet`.
5. **Stay in your lane.** A task edits only files listed in its `files` field (plus new tests/fixtures it creates). Needing another lane's file → stop, mark `blocked` with reason, the orchestrator schedules it.
6. **Log as you go.** Each wave and each phase ends with a log file in `workflow-log/` and an updated `PROGRESS.md`.
7. **Small, reviewable diffs.** Target < 400 changed lines per task; split otherwise.

## 3. Branches and commits

```
consolidation ──●──────────●───────────●──────▶  (one squashed commit per task, gated)
                 \          ↑ squash    ↑ squash
                  prd/P0-A01 (worktree)  prd/P0-C02 (worktree)
```

- Task branch: `prd/<task-id>` created from the current `consolidation` HEAD inside an isolated git worktree.
- Fix rounds: `prd/<task-id>-fix<n>` branched from the previous task branch.
- Integration (always serial, in the main checkout): `git merge --squash <final branch>` → resolve → gate → commit → update ledger in the **same** commit.
- Push after each wave (or after each task when a human is following along). Pull request: [geniusdynamics/schoolpilot#14](https://github.com/geniusdynamics/schoolpilot/pull/14) tracks `consolidation`.

Commit message format:

```
<type>(<scope>): <imperative summary> [<task-id>]

<what changed and why, 2–6 lines>

Findings: SO-01, SO-02          # audit findings closed (if any)
Requirements: FR-01             # PRD requirements advanced
Gate: task PASS — tsc 3041/3056, missingNames 120/138, contracts ↓ undefinedCollections 8/10, related tests 14 passed
Test waiver: <reason>           # only if --no-test-reason was used

Co-Authored-By: …
Claude-Session: …
```

`type` ∈ `fix`, `feat`, `refactor`, `test`, `chore`, `docs`, `perf`, `build`, `ci`.

## 4. Gates

| Gate | When | Command | Blocking checks |
| --- | --- | --- | --- |
| **Task** | Before every commit (on the task branch and again after squash on `consolidation`) | `node scripts/prd/gate.mjs task --task <id>` | G1 typecheck total and missing-name errors ≤ baseline · G2 every contract-scan section ≤ baseline · G3 related tests pass · G4 tests accompany source changes · G5 no mojibake added · G6 no `as any as`, `alert/confirm`, numeric id coercion added · G7 ESLint on changed files (enforced once P0-G01 lands) |
| **Wave** | After the last task of a wave | `node scripts/prd/gate.mjs task --base <wave start sha>` | All task checks over the whole wave diff |
| **Phase** | Phase exit | `node scripts/prd/gate.mjs phase --probe` | Task checks + P1 full suite failed files ≤ baseline · P2 production build · P3 probe passes ≥ baseline, plus the phase's own exit criteria |
| **Baseline** | After each phase (and optionally each wave) | `node scripts/prd/gate.mjs baseline --update --full --date <YYYY-MM-DD>` | Writes tighter numbers; never looser |

Reports land in `.prd-gate/report.md` (git-ignored); paste the table into the wave/phase log.

**What counts as a blocking issue** (do not commit): any gate `FAIL`; acceptance criteria not
met; a new console error on a page touched by the task; data migration without rollback; an
unresolved verifier finding rated `blocking`.

## 5. Lanes and file ownership

Each phase plan lists, per wave, the lanes and the **files each lane owns**. Rules:

- A file appears in at most one lane per wave. Shared hot spots (`AppDataContext.tsx`, `collections.ts`, routing, `moduleDefinition.tsx` files, i18n locale JSON) are owned by exactly one lane or by a dedicated *integration task* at the end of the wave.
- New files are owned by the lane that creates them.
- Locale JSON additions are collected by each task in `docs/prd/workflow-log/pending-i18n/<task-id>.json` and merged by the wave's integration task, to avoid conflicts in large locale files.
- Lockfile changes (`pnpm-lock.yaml`) are allowed only in tasks flagged `deps: true`, and at most one such task per wave.

## 6. Parallel execution with sub-agents

### 6.1 Roles

| Role | Runs as | Isolation | Responsibility |
| --- | --- | --- | --- |
| **Orchestrator** | Main Claude session (or a human) | Main checkout | Picks the wave, launches the workflow, reviews results, pushes, resolves blocked tasks, writes phase logs |
| **Implementer** | Sub-agent, one per task | Git worktree | Branch `prd/<id>`, failing test, implementation, task gate, commit on the branch |
| **Verifier** | Sub-agent, one per task | Git worktree (detached at the task branch) | Adversarially checks acceptance criteria, scope (files), test quality, regressions; runs the gate independently |
| **Fixer** | Sub-agent (only if the verifier finds blocking issues; max 1 round) | Git worktree | Branch `prd/<id>-fix1`, fixes findings, gate, commit |
| **Integrator** | Sub-agent, strictly one at a time | Main checkout | Squash-merge in dependency order, gate on `consolidation`, commit with ledger update, or mark blocked and reset |
| **Logger** | Sub-agent | Main checkout | Writes the wave log, regenerates `PROGRESS.md`, commits `chore(prd): log <wave>` |

### 6.2 Running a wave

```
Workflow({ name: "prd-wave", args: { wave: "P0-W1", date: "2026-10-08", push: false } })
```

Arguments: `wave` (required), `date` (required, `YYYY-MM-DD` — workflows cannot read the clock), `push` (default false),
`only` (array of task ids to run a subset), `maxParallel` (default 4; the runtime additionally caps concurrent agents at
CPUs − 2, so a 4-core container runs 2 at a time and a 16-core machine up to 14), `trailers` (commit trailer lines).

`.claude/workflows/prd-wave.js` does: **Load** (runnable tasks of the wave from `tasks.json`)
→ **Implement → Verify → (Fix → Re-verify)** as a pipeline, all tasks concurrently in
worktrees → **Integrate** serially in dependency order → **Log**. The orchestrator then reads
the wave log, spot-checks diffs, and pushes.

Close a phase with:

```
Workflow({ name: "prd-phase-exit", args: { phase: "P0", date: "2026-10-20" } })
```

which runs the phase gate (with probe), checks the phase exit criteria, tightens the
baseline, and writes `workflow-log/<phase>-phase-complete-<date>.md`.

### 6.3 Worktree setup (implementers, verifiers, fixers)

```bash
# inside the fresh worktree
ln -s /home/user/schoolpilot/node_modules node_modules   # or: pnpm install --frozen-lockfile (tasks with deps: true)
git switch -c prd/<task-id>                               # implementer; verifier: git switch --detach prd/<task-id>
```

Worktrees share the repository's object store, so branches created there are visible to the
integrator in the main checkout. Worktrees left behind are removed by the logger
(`git worktree prune`).

### 6.4 Concurrency guidance
- Up to 8 implementers per wave (lanes × tasks whose dependencies are satisfied); the workflow runtime caps concurrency automatically.
- Typecheck runs are the bottleneck (~2–3 min each); the gate runs them once per task branch and once at integration.
- Integration is serial on purpose: each squash is gated against the real latest `consolidation`.

## 7. Logging

| File | Written | Content |
| --- | --- | --- |
| `workflow-log/PROGRESS.md` | After every integration and log step (`node scripts/prd/status.mjs --write`) | Phase/wave/task status table, last commit, next runnable tasks per lane |
| `workflow-log/<wave>-<date>.md` | End of each wave | Tasks attempted/done/blocked with commits, gate tables, verifier findings, deviations, follow-ups, exact next steps |
| `workflow-log/<phase>-phase-complete-<date>.md` | End of each phase | Exit criteria evidence, phase gate report, probe report, baseline before/after, deferred items with owners, how to start the next phase |
| `workflow-log/decisions/DR-xx.md` | When a decision task completes | Context, options, decision, consequences |

Template: [workflow-log/TEMPLATE.md](./workflow-log/TEMPLATE.md).

## 8. Resuming manually (runbook)

1. `git switch consolidation && git pull`
2. `node scripts/prd/status.mjs` — shows the current phase, the last completed task (with commit), blocked tasks with reasons, and **the next runnable tasks per lane**.
3. Read the newest file in `docs/prd/workflow-log/` — its *Next steps* section lists exact commands.
4. Pick a task: `node scripts/prd/status.mjs --show P0-C03` prints its description, files, acceptance criteria, spec links and dependencies.
5. Work on a branch: `git switch -c prd/P0-C03`; write the failing test; implement; run `node scripts/prd/gate.mjs task --task P0-C03` until `GATE PASSED`.
6. Integrate: `git switch consolidation && git merge --squash prd/P0-C03 && node scripts/prd/gate.mjs task --task P0-C03`, then `node scripts/prd/status.mjs --set P0-C03 done` and commit (format in §3) — the ledger change rides in the same commit.
7. When a wave's tasks are all `done`/`deferred`, write the wave log from the template and run `node scripts/prd/status.mjs --write`; commit `chore(prd): log <wave>`; push.
8. At phase end: `node scripts/prd/gate.mjs phase --probe`, check the exit criteria in the phase plan, write the phase-complete log, `node scripts/prd/gate.mjs baseline --update --full --date <today>`, commit, push.

## 9. Handling problems

| Situation | Action |
| --- | --- |
| Gate FAIL on task branch | Fix within the task; if the failure is pre-existing and unrelated, record it and stop — do not "fix" outside the lane |
| Gate FAIL after squash on `consolidation` | `git reset --hard HEAD` (discards only the uncommitted squash), mark task `blocked` with the failing check, keep the branch for the next round |
| Merge conflict at integration | Resolve only if mechanical (imports, adjacent lines); otherwise abort, mark `blocked: conflict with <task>` and reschedule after the other task |
| Verifier and implementer disagree | One fix round; if still disputed, mark `review` and escalate to the orchestrator/human |
| A committed task turns out wrong | `git revert <sha>` with message `revert: <summary> [<task-id>]`, set task back to `todo`, log it |
| Flaky test | Never retry-until-green silently: record it, open a task `<phase>-Q..` to stabilise it |
| Spec ambiguity | Record the question in the wave log; choose the conservative option; open a decision task if it affects other tasks |
