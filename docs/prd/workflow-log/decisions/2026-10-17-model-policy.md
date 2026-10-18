# Decision: model and effort per workflow role  (2026-10-17)

**Decided by:** project owner · **Applies to:** every wave from P0-W3 on

The orchestrating session stays on Opus (medium effort). Sub-agents use cheaper models where the work allows it.
Implemented by `route()` in `.claude/workflows/prd-wave.js`. Task size comes from `size` in `docs/prd/tasks.json`.

| Role | S task | M task | L task |
| --- | --- | --- | --- |
| load (read ledger) | Haiku, low | Haiku, low | Haiku, low |
| exploration / lookups (ad-hoc sub-agents) | Haiku | Haiku | Haiku |
| implement | Sonnet, low | Sonnet, medium | Sonnet, high |
| verify | Sonnet, high | Sonnet, high | **Opus**, medium |
| fix round | Sonnet, high | Sonnet, high | **Opus**, medium |
| re-verify (after a rejection) | **Opus**, medium | **Opus**, medium | **Opus**, medium |
| integrate, commit, push (command running) | Haiku, medium | Haiku, medium | Haiku, medium |
| wave log | Haiku, medium | Haiku, medium | Haiku, medium |

Overrides:
- `args.opusTasks: ["P0-X01"]` forces Opus for that task's implement, verify and fix stages.
- `args.models: { verify: { model: "opus", effort: "high" } }` overrides a role for the whole run.

Escalate a task to Opus (`opusTasks`) when Sonnet's fix round is rejected twice for the same finding.
The gate and the verifier still decide what merges. The model choice only changes cost and the number of rounds.

## Commit and push per task (same date)
Each task is integrated, committed and pushed as soon as its review approves it (`args.pushTo`, e.g. `"prd/P0-W3"`),
instead of waiting for the whole wave. Integration stays strictly serial. The Haiku integrator never resolves
conflicts: any conflict returns the task as blocked for the orchestrator.
