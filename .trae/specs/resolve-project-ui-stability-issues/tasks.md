# Tasks
- [ ] Task 1: Establish a hard stabilization baseline and CI quality gates.
  - [ ] SubTask 1.1: Add and validate mandatory scripts for lint, typecheck, tests, and build.
  - [ ] SubTask 1.2: Wire baseline checks into CI and block merges on failure.
  - [ ] SubTask 1.3: Fix highest-impact blockers preventing green baseline.

- [ ] Task 2: Consolidate routing into one canonical route authority.
  - [ ] SubTask 2.1: Inventory explicit, module-derived, and nav-derived route owners.
  - [ ] SubTask 2.2: Migrate route definitions to canonical source and remove duplicates.
  - [ ] SubTask 2.3: Add route collision checks and regression tests.

- [ ] Task 3: Unify startup navigation and restore behavior.
  - [ ] SubTask 3.1: Define single startup policy owner for authenticated flows.
  - [ ] SubTask 3.2: Remove competing redirect paths from layout and restore hooks.
  - [ ] SubTask 3.3: Add tests for deterministic landing behavior.

- [ ] Task 4: Collapse parallel tab/session engines into one model.
  - [ ] SubTask 4.1: Choose canonical tab engine and deprecate alternate path.
  - [ ] SubTask 4.2: Ensure URL, state, and rendered tabs stay synchronized.
  - [ ] SubTask 4.3: Add regression tests for restore, switch, and persistence flows.

- [ ] Task 5: Converge to a canonical UI primitive and styling system.
  - [ ] SubTask 5.1: Define canonical primitives for button, input, dialog, table, alert, and toast.
  - [ ] SubTask 5.2: Migrate high-traffic pages to canonical primitives first.
  - [ ] SubTask 5.3: Remove or quarantine duplicate component implementations.

- [ ] Task 6: Finalize layout and navigation shell consolidation.
  - [ ] SubTask 6.1: Select production layout implementation and disable alternate runtime layout.
  - [ ] SubTask 6.2: Validate spacing, scroll behavior, and sticky interactions across core pages.
  - [ ] SubTask 6.3: Verify navigation consistency across sidebars and settings entry points.

- [ ] Task 7: Execute staged rollout with rollback readiness.
  - [ ] SubTask 7.1: Define ring-based rollout and measurable regression thresholds.
  - [ ] SubTask 7.2: Run backup/restore validation before each migration wave.
  - [ ] SubTask 7.3: Publish and rehearse rollback playbook with success criteria.

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 2] and [Task 3]
- [Task 5] depends on [Task 1]
- [Task 6] depends on [Task 3], [Task 4], and [Task 5]
- [Task 7] depends on [Task 1], [Task 4], [Task 5], and [Task 6]
