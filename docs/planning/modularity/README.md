<!--
ABOUTME: Index note for the April 2026 modularity plan: superseded by DR-06, and which of its ideas survive.
ABOUTME: Read DR-06 and phase P7 for the current design; the files here are kept as history.
-->

# Modularity plan (April 2026), superseded

**Status:** superseded on 2026-11-04 by [DR-06](../../prd/workflow-log/decisions/DR-06.md). Phase
[P7](../../prd/phases/P7-module-boundaries.md) executes the current design. The files in this folder are history.

**What DR-06 keeps from this plan:**
- modules own their domain types, entity schemas and migrations, and register them automatically through their
  manifest;
- `module.json` as the module manifest.

**What DR-06 replaces:**

| April plan | DR-06 |
| --- | --- |
| Cross-module data through `AppDataContext` | Typed imports of `modules/<x>/public.ts`; `AppDataContext` is retired (spec 06:27) |
| Module-local copies of shared entities | One definition per entity: shared entities in the `src/domain` kernel, module entities in their module, composed into one registry |
| `ServiceRegistry` / `useService` for cross-module services | Removed; typed `public.ts` imports, visible to the CI ratchet |
| Barrels in `src/contexts/data` and `src/hooks/data` | Removed; modules contribute providers through their manifest |

The measurements behind the decision are in [`docs/audit/2026-11-modularity`](../../audit/2026-11-modularity/README.md).
