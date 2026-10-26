# UI - brand home, module names and the Settings overhaul (2026-10-26)

**Operator:** Claude (Sonnet 5.5) with Mr Genius, in OpenChamber - **Branches:** `prd/ui-brand-home-module-names` (4 commits, pushed earlier) and
`prd/ui-settings-hubs` (30 commits, stacked on the first) - **Start commit:** `0f79749` (`consolidation`) - **End commit:** `8c67770` (before this log)
- **Pushed:** yes, both branches, to the remote `schoolpilot`, by explicit refspec - **Pull requests:** not opened and not merged: this machine has no
GitHub login, see the last section.

This is UI work between P4 and P5, not a PRD wave: it has no rows in `tasks.json`.

## Result

Settings was five sidebar entries, 16 hub tabs and up to three levels of tab strips, with the same feature in several places, controls that
looked real and did nothing, pages that refused the signed-in administrator, and links through deprecated addresses. It is now an
overview and three hubs, each with one row of tabs and no strip inside a tab:

| Sidebar entry | Route | Tabs |
| --- | --- | --- |
| Overview | `/settings` | none: figures that are true, and links to the hubs and their tabs |
| School & People | `/settings/school` | School Profile, Users & Roles, Workflows, Audit Log |
| Modules & Features | `/settings/modules` | Modules, Features, Plugins |
| Data & System | `/settings/system` | Data Layer, Sync, Backup & Restore, Data Integrity, System Health |

Rules the code now keeps: one tab level; a tab body has no header of its own; every control works for an administrator or is not shown; the
address decides the active tab; every old address redirects (22 are exercised by the browser spec). The hub and tab titles live in one list,
`src/modules/settings/hubTabs.ts`, which the hubs, the overview and the tests read. The first branch is the brand click, module
names and the Settings dashboard as a page of its own.

## Commits (oldest first)

| Commit | What |
| --- | --- |
| `ed910aa` `0b346de` `9cd931a` `b93b0b8` | Branch 1: a module's dashboard is its root page and is named for the module; the school name returns to the main dashboard; compact banner; browser spec |
| `82c01bc` `d435630` `b6c94de` | Settings access: Workflows asks the route guard's question; the Users tab shows the first administrator as active; sync-conflict and integrity pages open the database they read |
| `f293243` `a6a800c` `90a9ced` `fc0c1ba` | `SettingsHub` (the address decides the tab, moved tabs redirect); sidebar labels in en/fr/sw/rw; hubs are routes the module declares |
| `b7c1d5e` `26ca4af` | School & People hub |
| `1d3a92f` `361ef79` `a67da2f` `213869d` `b33881e` | Modules & Features hub: the dependency report reads the registry as it is; Plugins, Modules and Features tabs |
| `45abc88` `6c45715` `882df59` `d233b00` | Data & System hub; one list of hubs and tabs; the overview; the pages and components the hubs replaced are removed |
| `0c9e456` `55fb0bf` | Workspace tab titles for the hubs; module dashboards no longer spread a key into JSX |
| `6e2f968` `3be7cac` | Found by the first browser run: the cycle detector counted optional links; the overview read the profile from the wrong place |
| `fe34bcc` `28844fc` `85bb33b` `5d7e4fe` | Found by later runs: a reload renamed every Settings tab "Settings"; each old address left a ghost tab; the header popup offered the old addresses; the Workflows tables repeated a column key |
| `d326223` | An unused import the gate's lint check reported in a file this change touches |
| `c973004` `e5e2a1e` | The two faults that made the spec flake: a sign-in timer that outlived the login page, and a route table that remounted every page |
| `8c67770` | The browser spec |

## What the real browser found that unit tests had not

Each of these passed its unit tests; each was found by `tests/e2e/settings-hubs.spec.ts` on a real SQLite-WASM database, and each now has a unit
test written first and watched failing.

1. **The overview said the school profile was "Not set"** on a school the wizard had just configured. It read `schoolProfile` from app data, which
   does not carry it; the profile is the `school_details` document (`3be7cac`). It also read "1 accounts".
2. **"1 module with problems" on every healthy install.** The cycle detector counted optional links, so administration (which optionally uses
   finance, which requires administration) was nine "circular dependencies" (`6e2f968`).
3. **A reload renamed the overview and all three hubs "Settings".** The tab engine rebuilds the tab list from the address with a stand-in
   translator that read every navigation key as its first segment (`fe34bcc`).
4. **Each old address left a tab named for itself** ("Unified", "General", "Configuration") beside the tab it redirected to. One visit to each of
   the fifteen filled the bar to its 20-tab limit, and at the limit the oldest real tab is closed (`28844fc`). This is the app's behaviour
   for every deprecated address of every module, not just Settings'.
5. **The header's Settings popup offered the fifteen old addresses** as buttons; the sidebars hide deprecated items, the popup did not (`85bb33b`).
6. **The Workflows tables logged "two children with the same key, id"** on every draw (`5d7e4fe`).
7. **A stale sign-in timer.** After a sign-in the login page scheduled a redirect one second later and never cancelled it. A visitor who had
   clicked into a module inside that second was sent back to the dashboard. The spec hit it on a fast machine (`c973004`).
8. **A moved tab that never redirected.** The route table called `React.lazy` while it rendered, for every page, every time, so each render gave
   every page a new component type and React remounted the page on screen. A hub redirecting a moved tab ran its layout effect and never the
   passive effect that navigates: the address stayed and the body stayed blank. A throwaway probe reproduced it in 3 rounds out of 3; with one lazy
   component per page loader, 30 rounds of 4 moved tabs (120 redirects) had no stall (`e5e2a1e`). Every page of the app is affected by the remounting.

## Verification

| Check | Result |
| --- | --- |
| Unit tests, by area, on the last run of each | `src/modules/settings` 27 files / 265 tests; `src/routing` 5 / 174; `src/services/tabs` + `src/hooks/tabs` + `src/components/__tests__` 32 / 544; login pages and integration 8 / 181 - all passing |
| Task gate on the whole change, run 1 | G1 PASS (typecheck 2253/2500), G2 PASS, **G3 FAIL**, G4 PASS, G5 PASS, G6 PASS, **G7 FAIL** |
| Why G3 and G7 failed | G7: an unused import in `src/tests/integration/DataLayerSettingsPage.test.tsx`, which was already unused before this change; fixed in `d326223`. G3: one of 889 related tests, `AuthLoginRedirect`, failed in the big batch run on a machine whose free memory was 1 to 2 GB; it takes 2.6 to 3.7 s alone against its own 5 s waits, passed alone three times and passed in the next gate run. Recorded as a suspected load flake, not stabilised (follow-up) |
| Task gate, run 2 (before the sign-in, routing and spec commits) | GATE PASSED, 8 checks, 0 failed: typecheck 2252/2500, related tests 87 files / 889 tests, ESLint on changed files clean, secret and dependency scans clean |
| Browser spec `tests/e2e/settings-hubs.spec.ts` | Passed on its last two runs (2.8 and 3.7 min). Of the six runs before it: three were stopped by the faults above, one by the stale sign-in timer, one by the remounting; their causes were found and fixed rather than waited out |
| Task gate, final run on `8c67770` | **GATE PASSED, 8 checks, 0 failed** (table below) |
| Screenshots of the passing run | 14 images (overview, each hub tab, the phone layout) in `%TEMP%\settings-shots-final`; they are not committed |

Final gate (`node scripts/prd/gate.mjs task --task UI-settings-hubs --base schoolpilot/consolidation`, `.prd-gate/report.md`):

| Check | Result | Detail |
| --- | --- | --- |
| G1 Typecheck errors do not increase | PASS | total 2252/2500, missingNames 0/0 |
| G2 Contract-scan sections do not increase | PASS | all seven sections 0/0 |
| G3 Related tests pass | PASS | 89 files / 898 tests |
| G4 Source changes include tests (TDD) | PASS | 52 test files changed |
| G5 No mojibake introduced | PASS | |
| G6 No forbidden patterns added | PASS | |
| G7 ESLint on changed files | PASS | |
| G8 Secret and dependency scans pass | PASS | secret scan clean; dependency scan clean |

## Not verified, or only partly

- **Translations.** The four sidebar entries are translated in fr and sw as unreviewed drafts and are English in rw. The hubs' own titles, tab
  labels and the overview's text carry English defaults in the code (`t(key, default)`); they are not in the `settings` catalogue, so fr, sw and rw
  show English there. 517 keys across the app are used in code and absent from the English catalogue (510 carry an inline default); the pattern
  predates this work and is P5's to close.
- **Merging.** Nothing was merged: see below.
- **The module side menu** was left as it was, as asked.
- **Browser storage reads "At risk"** in headless Chromium because it does not grant persistence; the overview and the Data & System warning say
  so honestly there. The spec therefore does not assert "Durable".
- **The sign-in redirect and the lazy-component cache change behaviour for the whole app**, not only Settings. They are covered by unit tests and
  by one journey in a real browser, not by a run of every page.
- **Restored tabs.** A workspace tab saved with an old Settings address before this change is restored with that address and its old name until it
  is opened (the router then redirects). New visits no longer create such tabs.

## Follow-ups (also in the saved plan)

- `ModuleDependencyValidator.validateDependencies` (runs at registration) treats `getEnabledModules()` ids as modules, the mistake the report had.
- The performance and memory dashboards are unreachable (they were only reachable from the old Feature Settings page); the components are kept.
- `moduleConfigService` and `moduleManagementService` are used by nothing now; keep them as the base for real module on/off or delete them.
- Plugin settings of kind file and multiselect cannot be edited yet; `MarketplaceDiscovery` is shown nowhere.
- `useTabs.openTab` still opens a tab at whatever address it is given; only the layout's mirror skips redirecting addresses. The tab limit closes the
  oldest real tab silently.
- `SettingsPopup` is a drawer with no dialog role or label; the spec finds it by its classes.
- `AuthLoginRedirect` is slow enough (2.6-3.7 s of a 5 s wait) to fail under load; stabilise it (open `P5-Q..` or similar).
- `src/components/index.ts` names exports that do not exist; the typecheck reports them.

## Files

The full list (`git diff --name-status schoolpilot/consolidation...8c67770`, 140 files: 54 added, 62 modified, 24 deleted) is the appendix at the end.

## Pull requests and merging

I searched this harness's tool catalogue for anything that opens or merges a pull request (queries: github, pull request, merge, pr create, gh,
git push, repository, issue, octokit, review): nothing does. `gh` is not logged in on this machine and no token is set, and I did not use the
credential that `git push` stores. So the branches are pushed and the pull requests are two links away, in this order:

1. https://github.com/geniusdynamics/schoolpilot/compare/consolidation...prd/ui-brand-home-module-names
2. https://github.com/geniusdynamics/schoolpilot/compare/consolidation...prd/ui-settings-hubs

Merge each with a merge commit (not a squash), the first before the second: the second contains the first's four commits until then.

## Next steps

1. Open and merge the two pull requests as above.
2. P5-W2 (calendars, Kiswahili and French, the country pack format) starts from `consolidation`, not from these branches. Before it, the ledger needs
   `P5-A01` and `P5-A02` marked done (their work is merged in #47 and #50) and the scorecard regenerated.

## Appendix - files changed

`git diff --name-status schoolpilot/consolidation...8c67770` (A added, M modified, D deleted), before this log was added:

    D  src/components/ConflictResolutionInterface.tsx
    D  src/components/FeatureSettings.tsx
    M  src/components/Header.tsx
    M  src/components/Layout.tsx
    M  src/components/ModuleDashboardShell.tsx
    M  src/components/SecondarySidebar.tsx
    M  src/components/SettingsPopup.tsx
    D  src/components/SyncManagementPanel.tsx
    D  src/components/UnifiedModeSwitch.tsx
    D  src/components/__tests__/FeatureSettings.test.tsx
    A  src/components/__tests__/HeaderBrandHome.test.tsx
    A  src/components/__tests__/LayoutBrandHome.test.tsx
    M  src/components/__tests__/LayoutNewModuleTransitions.test.tsx
    M  src/components/__tests__/LayoutNewTabSession.test.tsx
    A  src/components/__tests__/ModuleDashboardShell.test.tsx
    M  src/components/__tests__/SecondarySidebarActiveItem.test.tsx
    A  src/components/__tests__/SecondarySidebarPlacement.test.tsx
    M  src/components/__tests__/SettingsPopupNavigation.test.tsx
    M  src/components/index.ts
    D  src/components/settings/FeatureSettings.tsx
    D  src/components/settings/ModuleManagementPanel.tsx
    D  src/components/settings/TooltipsShowcase.tsx
    D  src/components/settings/UnifiedModeSwitch.tsx
    D  src/components/settings/UserPermissionsPanel.tsx
    M  src/components/settings/index.ts
    A  src/core/__tests__/DependencyReports.test.ts
    M  src/core/services/DependencyVisualizer.ts
    M  src/core/services/ModuleDependencyValidator.ts
    M  src/hooks/tabs/__tests__/useTabsBulkClose.test.tsx
    M  src/hooks/tabs/__tests__/useTabsModuleSession.test.ts
    M  src/hooks/tabs/useTabs.ts
    M  src/i18n/locales/en/navigation.json
    M  src/i18n/locales/fr/navigation.json
    M  src/i18n/locales/rw/navigation.json
    M  src/i18n/locales/sw/navigation.json
    M  src/modules/__tests__/ModuleDashboardsModernization.test.tsx
    M  src/modules/academics/moduleDefinition.tsx
    M  src/modules/administration/moduleDefinition.tsx
    M  src/modules/admissions/moduleDefinition.tsx
    M  src/modules/core/pages/LoginPage.tsx
    A  src/modules/core/pages/__tests__/LoginPage.redirect.test.tsx
    M  src/modules/finance/moduleDefinition.tsx
    M  src/modules/hr/moduleDefinition.tsx
    M  src/modules/inventory/moduleDefinition.tsx
    M  src/modules/library/moduleDefinition.tsx
    M  src/modules/nutrition/moduleDefinition.tsx
    M  src/modules/portal/moduleDefinition.tsx
    M  src/modules/reports/moduleDefinition.tsx
    A  src/modules/settings/__tests__/hubTabs.test.ts
    A  src/modules/settings/__tests__/settingsNavigation.test.ts
    A  src/modules/settings/components/BackendSyncSettings.tsx
    A  src/modules/settings/components/DataIntegrityTab.tsx
    A  src/modules/settings/components/FeaturesTab.tsx
    A  src/modules/settings/components/ModulesTab.tsx
    A  src/modules/settings/components/PluginSettingsForm.tsx
    A  src/modules/settings/components/SettingsHub.tsx
    A  src/modules/settings/components/StorageWarning.tsx
    M  src/modules/settings/components/SyncConflictsPanel.tsx
    A  src/modules/settings/components/__tests__/BackendSyncSettings.test.tsx
    A  src/modules/settings/components/__tests__/DataIntegrityTab.test.tsx
    A  src/modules/settings/components/__tests__/FeaturesTab.test.tsx
    A  src/modules/settings/components/__tests__/ModulesTab.test.tsx
    A  src/modules/settings/components/__tests__/SettingsHub.test.tsx
    A  src/modules/settings/components/__tests__/StorageWarning.test.tsx
    A  src/modules/settings/components/__tests__/SyncConflictsPanel.test.tsx
    A  src/modules/settings/data/__tests__/moduleOverview.test.ts
    A  src/modules/settings/data/__tests__/overview.test.ts
    A  src/modules/settings/data/__tests__/pluginPrivileges.test.ts
    A  src/modules/settings/data/__tests__/userDisplay.test.ts
    A  src/modules/settings/data/moduleOverview.ts
    A  src/modules/settings/data/overview.ts
    A  src/modules/settings/data/pluginPrivileges.ts
    A  src/modules/settings/data/userDisplay.ts
    A  src/modules/settings/hooks/__tests__/useCanonicalAdapter.test.tsx
    A  src/modules/settings/hooks/__tests__/useSettingsAccess.test.tsx
    M  src/modules/settings/hooks/index.ts
    A  src/modules/settings/hooks/useCanonicalAdapter.ts
    A  src/modules/settings/hooks/useSettingsAccess.ts
    A  src/modules/settings/hubTabs.ts
    M  src/modules/settings/moduleDefinition.tsx
    D  src/modules/settings/pages/ConfigurationPage.tsx
    A  src/modules/settings/pages/DataAndSystemPage.tsx
    M  src/modules/settings/pages/DataIntegrityPage.tsx
    M  src/modules/settings/pages/DataLayerSettingsPage.tsx
    D  src/modules/settings/pages/FeatureSettingsPage.tsx
    D  src/modules/settings/pages/ModuleDependencyReportPage.tsx
    D  src/modules/settings/pages/ModuleManagementPage.tsx
    A  src/modules/settings/pages/ModulesAndFeaturesPage.tsx
    M  src/modules/settings/pages/PluginSettingsPage.tsx
    A  src/modules/settings/pages/SchoolAndPeoplePage.tsx
    D  src/modules/settings/pages/SchoolOperationsPage.tsx
    M  src/modules/settings/pages/SettingsDashboardPage.tsx
    D  src/modules/settings/pages/SettingsGeneralPage.tsx
    D  src/modules/settings/pages/SettingsPage.tsx
    M  src/modules/settings/pages/SettingsUsersPage.tsx
    M  src/modules/settings/pages/SettingsWorkflowsPage.tsx
    D  src/modules/settings/pages/SystemManagementPage.tsx
    D  src/modules/settings/pages/TabSettingsPage.tsx
    D  src/modules/settings/pages/UnifiedSettingsPage.tsx
    A  src/modules/settings/pages/__tests__/DataAndSystemHub.test.tsx
    M  src/modules/settings/pages/__tests__/DataIntegrityPage.test.tsx
    A  src/modules/settings/pages/__tests__/ModulesAndFeaturesHub.test.tsx
    A  src/modules/settings/pages/__tests__/PluginSettingsPage.test.tsx
    A  src/modules/settings/pages/__tests__/SchoolAndPeopleHub.test.tsx
    A  src/modules/settings/pages/__tests__/SettingsOverview.test.tsx
    A  src/modules/settings/pages/__tests__/SettingsUsersPage.test.tsx
    A  src/modules/settings/pages/__tests__/SettingsWorkflowsPage.test.tsx
    D  src/modules/settings/pages/__tests__/SystemManagementStorageStatus.test.tsx
    D  src/modules/settings/pages/__tests__/UnifiedSettingsRolePicker.test.tsx
    M  src/modules/settings/pages/index.ts
    M  src/plugins/usePlugins.ts
    M  src/routing/__tests__/moduleRoutes.test.tsx
    M  src/routing/__tests__/moduleRoutesCoverage.test.tsx
    A  src/routing/__tests__/pageLoader.test.tsx
    M  src/routing/__tests__/pageRouteExemptions.ts
    M  src/routing/__tests__/redirectMap.test.ts
    M  src/routing/moduleRoutes.tsx
    M  src/routing/pageLoader.ts
    M  src/routing/redirectMap.ts
    M  src/routing/routeConfig.ts
    A  src/services/auth/__tests__/accessRules.test.ts
    A  src/services/auth/accessRules.ts
    M  src/services/auth/authService.ts
    M  src/services/tabs/TabStateDeriver.ts
    M  src/services/tabs/URLTabSyncEngine.ts
    M  src/services/tabs/__tests__/LayoutRouteMirror.test.tsx
    A  src/services/tabs/__tests__/TabStateDeriver.test.ts
    M  src/services/tabs/__tests__/URLTabSyncEngine.test.ts
    A  src/services/tabs/__tests__/moduleDashboardUrl.test.ts
    A  src/services/tabs/moduleDashboardUrl.ts
    M  src/services/ui/pageComponentResolver.ts
    D  src/tests/DataLayerSettingsPage.test.tsx
    D  src/tests/UnifiedModeSwitch.test.tsx
    M  src/tests/end-to-end/DataManagementSettingsWorkflow.test.tsx
    M  src/tests/integration/DataLayerSettingsPage.test.tsx
    M  src/tests/integration/DataLayerSettingsPageConsolidation.test.tsx
    A  src/utils/__tests__/moduleUtils.test.ts
    M  src/utils/moduleUtils.ts
    A  tests/e2e/module-dashboards-brand.spec.ts
    A  tests/e2e/settings-hubs.spec.ts
