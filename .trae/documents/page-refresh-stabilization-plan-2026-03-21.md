# Page Refresh Stability Plan

## Goal
Stabilize normal application usage by identifying and eliminating unintended full-page reloads, aggressive redirect churn, and update flows that feel like random refreshes.

## What We Already Found
1. Service worker update behavior is aggressive:
   - `vite.config.ts` uses PWA `registerType: 'autoUpdate'`.
   - `src/sw.ts` uses `skipWaiting()` and `clients.claim()` immediately.
   - `src/hooks/usePWA.ts` calls `window.location.reload()` when applying updates.
2. Explicit reload points exist in runtime code:
   - `src/index.tsx` debug helper `window.testLogin` triggers `location.reload()`.
   - `TabbedWorkspace` registers `workspace.refresh` -> `window.location.reload()`.
   - Multiple error boundaries include manual reload actions.
3. Route and state churn can feel like refresh:
   - Aggressive `Navigate` redirects in `App.tsx` and `ProtectedRoute`.
   - Route restoration after auth can re-navigate on startup.
4. Tab sync infrastructure risk:
   - `URLTabSyncEngine` singleton is exported, but `useTabs` creates another engine instance, duplicating global listeners (`popstate`, `storage`) and increasing navigation churn risk.

## Scope
- In scope:
  - Runtime stability during regular use (not debug workflows only).
  - PWA/service-worker update UX and registration strategy.
  - Navigation/redirect stabilization for authenticated sessions.
  - Tab URL-sync listener deduplication.
  - Instrumentation to prove root causes and validate fixes.
- Out of scope:
  - Large architectural rewrites.
  - Broad unrelated refactors.

## Implementation Plan

### Phase 1: Instrument and Reproduce (Evidence First)
1. Add lightweight reload/navigation diagnostics:
   - Track and log reasons for `beforeunload`, `visibilitychange`, router transitions, and service worker update lifecycle events.
   - Add a small in-memory event buffer and optional console dump for support diagnostics.
2. Reproduce and capture baseline:
   - Validate in development and production build locally.
   - Capture whether “refresh” is true document reload, router remount, or auth redirect.
3. Produce a short baseline report:
   - Frequency and trigger matrix by scenario (idle, tab switching, background/foreground, login, data sync periods).

### Phase 2: Apply Low-Risk Stabilization Fixes
1. Service worker update hardening:
   - Move to prompt-driven update flow for normal sessions.
   - Avoid immediate takeover behavior that can interrupt active users.
   - Ensure reload is user-intent driven (update confirmation) and debounced once per version.
2. Remove accidental runtime reload vectors:
   - Restrict debug-only reload helpers to development mode only.
   - Replace `workspace.refresh` full reload with state-level refresh where possible; keep hard reload as explicit fallback action.
3. Deduplicate tab sync engine listeners:
   - Ensure only one `URLTabSyncEngine` instance is used application-wide.
   - Validate no duplicated `popstate/storage` subscriptions remain.

### Phase 3: Route/Auth Churn Mitigation
1. Tighten startup navigation policy:
   - Prevent competing redirects during auth initialization and route restoration.
   - Gate catch-all redirects so they do not override legitimate late-loaded routes.
2. Reduce refresh-like remounting:
   - Review `ErrorBoundary` keying strategy on pathname and adjust to avoid unnecessary full subtree remounts.
3. Validate session continuity:
   - Ensure expired-session handling is deterministic and does not oscillate between states.

### Phase 4: Verification and Hardening
1. Unit tests:
   - SW update decision logic.
   - URL tab sync singleton usage.
   - Route guard behavior for auth-ready vs auth-loading states.
2. Integration tests:
   - Navigation continuity across module switches and tab operations.
   - Update notification flow without forced reload.
3. End-to-end tests:
   - Long-running usage path (idle + interactions + sync windows) with assertion of no unexpected full page reload.
   - Login/logout/session restore path with stable route outcomes.

## Proposed File Targets (Initial)
- `vite.config.ts`
- `src/sw.ts`
- `src/hooks/usePWA.ts`
- `src/index.tsx`
- `src/components/tabbedWorkspace/TabbedWorkspace.tsx`
- `src/hooks/tabs/useTabs.ts`
- `src/services/tabs/URLTabSyncEngine.ts` (if needed for singleton-safe access pattern)
- `src/App.tsx`
- `src/components/ProtectedRoute.tsx`
- Test files under relevant `__tests__` folders

## Acceptance Criteria
1. No unexpected full-page reload occurs during normal usage scenarios.
2. Service worker updates do not interrupt active sessions without explicit user action.
3. Navigation does not bounce between routes during normal authenticated startup.
4. Single tab-sync listener topology is confirmed.
5. Unit + integration + e2e tests covering this issue pass cleanly.
6. A short stabilization report is produced documenting root causes, fixes, and verification evidence.

## Risk Controls
- Feature-flag or environment gating for behavior changes that can impact update cadence.
- Keep hard reload options as explicit manual recovery actions.
- Add telemetry logs around every preserved reload path for post-fix monitoring.

## Execution Order After Approval
1. Add diagnostics and capture baseline.
2. Implement SW + explicit reload vector fixes.
3. Implement tab sync deduplication.
4. Implement route/auth churn mitigation.
5. Add/adjust tests.
6. Run full verification and publish stabilization report.
