# Tasks
- [x] Task 1: Implement module-scoped tab session orchestration in layout and tab hook integration.
  - [x] SubTask 1.1: Add module-switch detection and module-session reset behavior.
  - [x] SubTask 1.2: Ensure target module opens a deterministic landing tab after reset.
  - [x] SubTask 1.3: Preserve same-module tabs while opening/activating submenu tabs.

- [x] Task 2: Unify route resolution and module identity across primary and secondary sidebars.
  - [x] SubTask 2.1: Normalize module identity extraction (module id/path/name translation key).
  - [x] SubTask 2.2: Use shared resolution path for module click and submenu click.
  - [x] SubTask 2.3: Prevent invalid `/{moduleKey}` navigation that falls to dashboard.

- [x] Task 3: Align settings cog navigation with module-scoped tab policy.
  - [x] SubTask 3.1: Route settings entries through URL-driven tab opening/activation policy.
  - [x] SubTask 3.2: Ensure settings navigation respects current module session semantics.

- [x] Task 4: Correct user feedback timing and semantics for navigation outcomes.
  - [x] SubTask 4.1: Emit success only after navigation/tab outcome is confirmed.
  - [x] SubTask 4.2: Emit warning/error for fallback or failed route resolution.

- [x] Task 5: Add regression test coverage for module-scoped tab sessions.
  - [x] SubTask 5.1: Test same-module submenu clicks create/activate distinct tabs.
  - [x] SubTask 5.2: Test module switch clears previous module tabs and starts new session.
  - [x] SubTask 5.3: Test settings-cog navigation follows expected tab/session behavior.

- [x] Task 6: Validate end-to-end behavior with runtime and test verification.
  - [x] SubTask 6.1: Run targeted tests for sidebar/settings/tab flows.
  - [x] SubTask 6.2: Validate runtime navigation paths and absence of dashboard bounce on valid module click.

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 2] and [Task 3]
- [Task 5] depends on [Task 1], [Task 2], and [Task 3]
- [Task 6] depends on [Task 4] and [Task 5]
