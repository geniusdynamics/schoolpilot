# Workflow Log Template

Copy the relevant section into a new file. File names:
`<wave>-<YYYY-MM-DD>.md` (e.g. `P0-W1-2026-10-09.md`), `<phase>-phase-complete-<YYYY-MM-DD>.md`,
`<phase>-phase-exit-attempt-<YYYY-MM-DD>.md`. Logs are append-only: never rewrite an old log; write a new one.

---

## Wave log

```markdown
# <wave> — <wave focus>  (<date>)

**Operator:** <human or "prd-wave workflow"> · **Start commit:** <sha> · **End commit:** <sha> · **Pushed:** yes/no

## Result
| Task | Outcome | Commit | Tests added | Notes |
| --- | --- | --- | --- | --- |
| P0-A01 | done | abc1234 | src/…test.ts | |
| P0-A02 | review | — | | verifier: <blocking finding> |

## Gate summary (integration gate per task)
<paste .prd-gate/report.md tables or one-line summaries>

## Verifier notes (non-blocking)
- …

## Waivers and deviations
- Test waivers (task, reason) · scope exceptions · spec ambiguities and the choice made

## Pending i18n files
- docs/prd/workflow-log/pending-i18n/<task>.json (merged by the wave integration task)

## Blocked / needs review
| Task | Reason | Proposed resolution |
| --- | --- | --- |

## Next steps
1. `node scripts/prd/status.mjs`  → next wave: <wave>
2. <exact commands, e.g. Workflow({ name: "prd-wave", args: { wave: "P0-W2", date: "<date>" } })>
3. <manual follow-ups>
```

---

## Phase completion

```markdown
# <phase> — <name> — phase complete (<date>)

**Commits:** <first sha>..<last sha> · **Tasks:** <done>/<total> done, <deferred> deferred · **Pushed:** yes/no

## Exit criteria
| Criterion | Met | Evidence (command → output) |
| --- | --- | --- |

## Phase gate
<.prd-gate/report.md>

## Probe
<.prd-gate/probe.md>

## Baseline before → after
| Metric | Before | After |
| --- | --- | --- |

## Deferred tasks (owner, target phase)

## Lessons learned / process changes

## How to start the next phase
1. `node scripts/prd/status.mjs`
2. Refine the next phase's coarse tasks into sub-tasks if needed (same id + suffix).
3. Run its first wave: Workflow({ name: "prd-wave", args: { wave: "<P?-W1>", date: "<date>" } })
```

---

## Decision record (`decisions/DR-xx.md`)

```markdown
# DR-xx — <title>
**Date:** · **Status:** accepted/superseded · **Task:** <id>
## Context
## Options considered (with spike evidence)
## Decision
## Consequences
```
