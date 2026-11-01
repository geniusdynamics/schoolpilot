# Browser walkthrough: whole system, end to end

Date: 2026-11-01
Build: `consolidation` at `a3bea3d` (PRs #65 and #66 merged), run on a fresh demo database in
Chromium at 1440×900.
Method: sign in as the demo administrator, visit every route the navigation declares (137 routes,
deprecated redirects excluded), and capture the page text, console errors, failed requests and page
errors for each. Then sign in as the demo teacher, finance officer and student and walk the pages
each role is meant to use. Finally exercise the write paths a user touches first: enter a mark, save
it, and confirm it survives.

## What the crawl covered

- 137 routes across 11 modules, every entry in every `moduleDefinition.tsx`.
- Four roles: administrator (crawl), teacher, finance officer, student.
- Console and network: every error and failed request is attributed to the page that produced it.

## Issues found, and what was done

### 1. A page's own tab strip was read as the workspace's tab list (fixed)

The workspace keeps its open tabs in the address bar as `?tab=<url>&a=<index>`. Hub pages keep
their own tab strip in `?tab=<name>` inside the hash route. `useTabs` fed the routed search into the
tab-state parser, so opening Marks Entry on "Student grid" produced a warning
`Ignoring tab url that is not an app route: student-grid`, dropped the real tab list, and could
restore a tab named after the view.

Fix: the hook reads the workspace state from the address bar alone (`engine.parseURL()`), never from
the routed page's search. `src/hooks/tabs/useTabs.ts`.

### 2. Two hub views opened two workspace tabs with the same id (fixed)

Switching Marks Entry from the class grid to the student grid opened a second "Marks Entry" tab.
Both tabs derived the id `tab-academics-marks-entry-list`, which React reported as
`Encountered two children with the same key`.

Fix:
- `TabStateDeriver.isSameView` treats two addresses that differ only in the page's `tab` parameter
  as one page; `openTab` moves the existing tab to the new view instead of appending.
- `generateTabId` now digests any query that is more than the view parameter (`?page=2`), so two
  list tabs can never share an id.
- `src/services/tabs/TabStateDeriver.ts`, `src/hooks/tabs/useTabs.ts`.

### 3. "Module Not Available" while a module was still loading (fixed)

Deep-linking to a page (`/finance/fee-rules`, `/finance/payments`, `/finance/transport`) showed
"Module Not Available — the finance module is not loaded. Please enable it in settings" for as long
as the module's import took. It is a loading state, not an error, and the message told the school to
fix something that was not broken.

Fix: `ModuleRouteLoader` starts in its loading state when the module is not loaded, so the first
paint is the spinner. `src/routing/ModuleRouteLoader.tsx`.

### 4. Tables declared two columns with the key `id` (fixed)

Seven grids reused `key: 'id'` for their Actions column, so `DataGrid` warned
`Duplicate column keys: id` and React rendered duplicate keys: Payslips, Payroll Periods, Staff
Salary Settings, Users & Roles, Suppliers, Database Backup, Transferred Students.

Fix: the Actions column has its own key. These files under `src/modules/{hr,finance,settings,administration}`.

### 5. The sidebar offered modules the login could not open (fixed)

The teacher's rail showed Administration, Finance, HR, Inventory, Library, Nutrition and Settings;
clicking any of them produced an "Access Denied" wall. The route guard was right — the rail was
wrong.

Fix: `PrimarySidebar` filters the module rail by the login's `moduleAccess`, and keeps the full rail
for a super administrator or a login with no module list. The teacher now sees Dashboard and
Academics only. `src/components/PrimarySidebar.tsx`.

### 6. The demo teacher could edit logins (fixed)

The demo teacher and finance accounts carried `settings.view`, so both could open
Settings → School & People → Users & Roles and edit users. The demo roles now carry only what the
role does: the teacher gets academics, the finance officer gets finance, the student gets academics
and the portal. `src/services/auth/authService.ts`.

### 7. The demo teacher has no staff record, so teacher scoping cannot be demonstrated (open)

Signing in as `teacher` and opening Marks Entry says "No staff record is linked to this login, so no
teaching group is reachable". The scope is correct; the demo data has nothing to link. A link needs
`staff.user_id = <canonical user id>`, the repository owns canonical ids (a create carrying an id is
refused), and the demo login ids are fixed strings. Closing it needs a demo identity mapping or
seeding the login through Settings → Users; it is not a page-level fix.

Impact: a teacher sees the grids, the scope explanation and read-only cells, but no writable marks.
The subject-teacher scope is covered by `teachingScope.test.ts`; the demo cannot show it.

### 8. The student lands on the staff dashboard (open)

`/dashboard` is the same page for every role. A student sees "Add Student", school-wide enrolment
figures and the finance summary under "Current Role View: Student". No role-specific dashboard is
wired for the demo student; the portal is the intended surface.

### 9. The demo student's portal is empty (open)

The portal resolves the signed-in login to a canonical `user` row and from there to a guardian or
learner. The demo seeds neither for the demo student, so `/portal` renders without a learner. Needs
canonical user/person_ref rows for the demo accounts (blocked by the same id ownership as issue 7).

### 10. Startup noise that is not an error (open, low)

- `[PluginManager] Builtin plugin … already registered`: plugins register again on remount.
- `[SQLiteWASMCollection] Index creation warning for app_settings: … no such …`: an index is
  created on a table/column the adapter spells differently.
- `db.type() is deprecated` (PouchDB) and `[URLTabSyncEngine] Saved state to storage` at info level
  appear on every route.
- `VITE_BUGSINK_DSN` in `.env` points at `app1.genius2.mrmarkuz.ddnss.eu`, which refuses
  connections from this machine: the crawl logged 29 refused requests and 4 timeouts against it. Set
  the DSN to empty locally, or to a reachable host, when error tracking is not wanted.

## Verification

- New tests: `useTabsUrlSync.test.tsx` (the hub's `?tab=` is not workspace state),
  `TabStateDeriver.test.ts` (same view, query-digested ids), `ModuleRouteLoader.test.tsx` (spinner
  first, never "not available" while loading), `PrimarySecondaryNavigation.test.tsx` (rail filtered
  by module access).
- Browser: no `Ignoring tab url`, no duplicate-key, no duplicate-column warnings and no
  "Module Not Available" on the pages that produced them before; Marks Entry keeps one workspace tab
  while switching class/student views; the teacher's rail lists Academics only; an administrator
  still sees every module.
- Crawl output kept at `.prd-gate/` for this pass; the route list and per-route text are reproducible
  with the crawl script described above.

## Not covered by this pass

- Destructive flows (promotion, graduation, billing run posting, period close) were not run: they
  need a scratch database and a supervisor's decision, not a walkthrough.
- Payment and attendance write paths were exercised only through their pages rendering and their
  form validation; the money paths keep their own e2e suites.
