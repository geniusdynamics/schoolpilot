# Menu/Submenu Launch Failure Resolution Plan

## Problem Summary
- After login, clicking module menus shows a "loaded module dashboard" notification but does not reliably open the corresponding submenu/page.
- Settings cog menu items also fail to open target pages consistently.
- Behavior appears like a tab opens and then quickly closes.

## Confirmed Root Causes
1. **Module selection contract mismatch in new layout**
   - `PrimarySidebar` passes translation keys / labels to `onModuleSelect`.
   - `LayoutNew` expects a canonical module id and navigates to `/${moduleKey}`.
   - Most valid module routes are `/${moduleId}/dashboard` or explicit routes (`/settings/...`), so `/${moduleKey}` often redirects to catch-all `/dashboard`.
2. **Secondary submenu lookup mismatch**
   - `SecondarySidebar` resolves selected module via exact `item.name === selectedModuleKey`.
   - `selectedModuleKey` may be path segment/module id (`settings`), while `item.name` is translation key format (`navigation:settings.title`), causing no module match and no submenu render.
3. **Settings popup uses legacy tabbed navigation path in new URL-driven tab runtime**
   - Settings actions go through `useEnhancedNavigation(...useTabbedMode:true)` and `useTabNavigation`.
   - In current runtime this can create stale tab-store actions without guaranteed router navigation.
4. **Notification timing is misleading**
   - Success/info toasts are emitted before route validity is confirmed, making failures look like successful opens.

## Implementation Plan (Execution Steps)

### Step 1: Standardize module identity model across sidebars and layout
- **Files**: `src/components/PrimarySidebar.tsx`, `src/components/LayoutNew.tsx`, `src/components/SecondarySidebar.tsx`
- Change the callback contract so module selection uses a **canonical module id** (e.g., `settings`, `finance`, `academics`) instead of translated labels/keys.
- In `PrimarySidebar`, derive and pass:
  - `moduleId` (canonical id used for routing/lookup),
  - `modulePath` (base path),
  - preserve display label for UI only.
- In `LayoutNew`, update `handleModuleSelect` to consume canonical id and navigate using robust resolver rules:
  - Prefer module default child route from navigation config when available,
  - fallback to `/${moduleId}/dashboard`,
  - fallback to explicit known route map for special modules (e.g., settings root if configured).
- Keep `selectedModuleKey` equal to canonical module id everywhere in new layout state.

### Step 2: Fix submenu resolution to use canonical ids and stable matching
- **File**: `src/components/SecondarySidebar.tsx`
- Replace `item.name === selectedModuleKey` matching with canonical-id matching:
  - normalize module key from item metadata (`modulePath`, `path`, or dedicated id field),
  - compare against normalized `selectedModuleKey`.
- Add deterministic fallback strategy:
  - if exact id match fails, resolve by route prefix (`/${selectedModuleKey}`),
  - if still not found, show a controlled empty-state message (not silent `null`) and log actionable debug data.
- Ensure submenu rendering does not disappear when labels/i18n keys change.

### Step 3: Align settings cog navigation with active tab/navigation architecture
- **Files**: `src/components/SettingsPopup.tsx`, `src/hooks/useEnhancedNavigation.ts`, optionally `src/hooks/useTabNavigation.ts`
- In settings popup actions, route through URL-first navigation for current runtime:
  - direct router navigate for target settings pages (`/settings/...`) with permission checks preserved.
- Keep tab creation behavior only where architecture explicitly requires it.
- Gate legacy tab-store navigation with feature flags / mode checks so it is not used in `LayoutNew` URL-driven mode.

### Step 4: Correct route target generation for module clicks
- **File**: `src/components/LayoutNew.tsx` (and helper extraction if needed)
- Add a centralized route resolver utility (local helper or shared util) used by:
  - module click navigation,
  - submenu click navigation,
  - settings popup navigation.
- Resolver responsibilities:
  - validate candidate route exists in registered navigation/routes,
  - avoid navigating to invalid module base paths,
  - fallback to first accessible child route if dashboard route missing,
  - only then notify success.

### Step 5: Fix notification semantics to reflect real navigation outcome
- **Files**: `src/components/PrimarySidebar.tsx`, `src/components/SecondarySidebar.tsx`, `src/components/SettingsPopup.tsx`
- Move success notifications to post-navigation confirmation path:
  - emit success after route resolution + navigation invocation succeeds,
  - emit warning/error when route missing/permission denied/fallback triggered.
- Remove misleading "loaded module dashboard" notification when no valid destination exists.

### Step 6: Add targeted regression tests for menu and settings navigation
- **Files (new or existing tests)**:
  - `src/components/__tests__/PrimarySecondaryNavigation.test.tsx`
  - `src/components/__tests__/SettingsPopupNavigation.test.tsx`
  - optionally extend existing integration navigation tests
- Cover:
  - module click opens expected submenu and route,
  - settings cog items open corresponding `/settings/...` pages,
  - no silent fallback to `/dashboard` for valid module clicks,
  - no false success notifications on failed navigation.

## Validation Plan
1. Manual verification flow:
   - login as admin,
   - click each primary module and verify submenu appears with correct items,
   - click representative submenu entries and confirm page loads,
   - use top-right settings cog and verify each item navigates to its intended page.
2. Runtime checks:
   - confirm no `Tab Content Error` and no sync/provider errors,
   - confirm no "open then close" tab behavior in navigation interactions.
3. Automated checks:
   - run targeted component/integration tests for navigation.
4. Sanity checks:
   - ensure route guard/permission behavior unchanged (only navigation correctness changes).

## Risk Controls
- Keep changes scoped strictly to navigation identity, resolver logic, and notification timing.
- Preserve existing RBAC checks and route guards.
- Prefer additive normalization utilities over broad rewrites to minimize regression risk.

## Expected Outcome
- Primary module clicks reliably display and activate the correct submenu.
- Settings cog menu items consistently open their corresponding pages.
- Notifications match actual outcomes (success only on successful navigation).
- No tab flash/open-close artifact from invalid route transitions.
