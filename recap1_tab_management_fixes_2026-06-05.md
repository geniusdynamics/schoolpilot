# Recap 1: Tab Management & Dashboard Title Fixes

**Date:** 2026-06-05
**Author:** MiniMax-M3
**Scope:** Browser tab title, tab context menu, tab close operations, sidebar navigation

## Issues Resolved

### 1. Browser tab name "dashboard.title" placeholder
- **Root cause:** `MODULE_NAMES` map in `TabStateDeriver.ts` used the key
  `navigation:dashboard.title` which did not resolve. The i18n key
  `navigation:dashboard.title` did not exist in `src/i18n/locales/en/navigation.json`,
  so `t('navigation:dashboard.title')` returned the raw key string.
- **Fix:** Changed mapping to `navigation:dashboard` (which is a flat string
  in `navigation.json` that resolves to `"Dashboard"`).
- **File:** `src/services/tabs/TabStateDeriver.ts:13`

### 2. Browser `<title>` element now updates dynamically
- **Root cause:** The HTML `<title>` was static (`SchoolPilot - Modern School
  Management`) and there was no logic to update it when the active tab
  changed.
- **Fix:** Added a `useEffect` in `useTabs` that watches `activeTab?.title`
  and sets `document.title` to `<TabTitle> - SchoolPilot`. Falls back to
  the static title when no tab is active.
- **File:** `src/hooks/tabs/useTabs.ts` (lines 207-214)

### 3. "Close Other Tabs" reversed the kept/closed set
- **Root cause:** `closeOtherTabs` had an empty `useCallback` dependency
  array (`}, []`). This captured the initial empty `state.tabs` forever
  (stale closure), so calls against later state were a no-op. When
  combined with the way the context-menu was wired, the wrong tabs were
  being closed.
- **Fix:** Changed dependency array to `[state]` so the function always
  reads the latest tab list.
- **File:** `src/hooks/tabs/useTabs.ts:364`

### 4. Only the currently active tab could be closed
- **Root cause:** The context menu only had `Close Other Tabs`,
  `Close Tabs to Right`, `Close Tabs to Left`, and `Close All Tabs`. There
  was no `Close Tab` option, so a right-click on a non-active tab had no
  way to close just that one tab.
- **Fix:** Added a new `Close Tab` menu item at the top of the menu
  (with the `Del` shortcut hint), wired to the existing `onClose`
  callback. Also added the new `onCloseTab?: () => void` prop to all
  three relevant interfaces (`LegacyTabProps`, `HierarchicalTabProps`,
  `ContextMenuProps`) and passed it from the Tab component to the
  ContextMenu.
- **Files:** `src/components/tabbedWorkspace/Tab.tsx`

### 5. "Close All Tabs" was actually "Close All Non-Pinned Tabs"
- **Root cause:** `closeAllTabs` filtered out pinned tabs before
  closing, so pinned tabs survived. The user explicitly wanted every
  tab closed.
- **Fix:** Removed the `!t.pinned` filter from `closeAllTabs`. It now
  calls `closeTabs` with every tab id. The
  `closeAllExceptPinned` function is unchanged and still preserves
  pinned tabs.
- **File:** `src/hooks/tabs/useTabs.ts:390-394`

### 6. Sidebar nav item clicks closed all other tabs (Student Clearance, Student Import, etc.)
- **Root cause:** `handleNavItemClick` in `LayoutNew.tsx` called
  `transitionToModule` whenever the clicked nav item belonged to a
  different module than `selectedModuleKey`. `transitionToModule` uses
  `switchModuleSession`, which calls `buildModuleSessionState`, which
  keeps only pinned tabs and discards the rest. So clicking a nav item
  for a different module from the secondary sidebar wiped every other
  non-pinned tab.
- **Fix:** `handleNavItemClick` now always calls `openTab(item.path, { pinned: false })`
  regardless of which module the item belongs to. Module switching that
  legitimately closes other tabs is still driven by `handleModuleSelect`
  on the primary sidebar (the module icon column), where the user has
  explicitly chosen to switch modules.
- **File:** `src/components/LayoutNew.tsx:258-264`

## Audit notes

- `closeTabsToRight` and `closeTabsToLeft` already work correctly
  (state-dependent `useCallback`s, pinned tabs preserved). No changes
  required.
- The `TabBar` component correctly forwards every close callback to the
  `Tab` component; no changes required there.
- The new "Close Tab" entry in the context menu uses the existing
  close-button styling and `X` icon so it is visually consistent with
  the rest of the menu.

## Files modified

1. `src/services/tabs/TabStateDeriver.ts` - dashboard i18n key fix
2. `src/hooks/tabs/useTabs.ts` - stale closure fix, document.title sync, closeAllTabs fix
3. `src/components/tabbedWorkspace/Tab.tsx` - added "Close Tab" context menu entry
4. `src/components/LayoutNew.tsx` - fixed sidebar nav item close-others regression

## Files NOT changed (verified correct)

- `src/components/tabbedWorkspace/TabBar.tsx` - callback forwarding
- `src/services/tabs/URLTabSyncEngine.ts` - URL <-> tab state sync
- `src/stores/tabStore.ts` - legacy Zustand store (used as fallback)

## Verification

- `npx tsc --noEmit` reports **zero errors** in the files modified
  for this fix (`useTabs.ts`, `Tab.tsx`, `TabStateDeriver.ts`).
  Pre-existing errors in `LayoutNew.tsx`, `TabBar.tsx`, `Header`,
  several test files, and `utils/*` are unrelated to this change.
- `npx vite build` produces a complete `dist/` output. Warnings about
  circular chunks and the pre-existing
  `BuiltinLoader.ts` dynamic-import message are not introduced by
  these changes.
