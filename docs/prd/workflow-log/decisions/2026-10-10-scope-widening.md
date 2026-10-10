# Decision: widen a task's file list when the blocker is file ownership  (2026-10-10)

**Decided by:** project owner (Mr GENIUS) · **Applies to:** all phases from P0-W1 on

## Rule
When a task cannot meet its acceptance criteria only because the files it must change are outside
its card's `files` list — whether owned by another task (including one in a later wave) or simply not
listed — the orchestrator widens the task to those files and proceeds, **provided** the result:

1. passes the task gate on the integrated branch (`gate.mjs task --task <id> --base HEAD`), and
2. merges without non-mechanical conflicts with work already integrated.

The later task that owns the file builds on top of the change. The widening is recorded in the task's
`notes` in `tasks.json` and in the wave log. Blockers of another kind (missing evidence, product
decisions, spec ambiguity) still go to the owner.

## Applied
| Task | Widened to | Reason |
| --- | --- | --- |
| P0-G03 | hub pages under `src/modules/**` that render `PageHeaderWithTabs` (incl. `SchoolOperationsPage.tsx`, also listed for P0-D06 in W2) | resettable tab panel only takes effect when hubs pass tab content as children (SO-27) |
| P0-A01 | `DatabaseProviderFactory.ts`, `UnifiedDatabaseManager.ts`, app bootstrap, app header, `SystemManagementPage.tsx` | fail closed app-wide; show blocking screen, temporary-data badge and storage status |
