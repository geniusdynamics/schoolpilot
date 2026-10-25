// ABOUTME: The tab context menu's bulk closes, through the hook the menu actually calls: closing the
// ABOUTME: other tabs, the tabs to one side, and a tab that is not the active one.
//
// The menu writes the new tab list through `URLTabSyncEngine.updateURL`, which changes the URL with
// `history.replaceState`. React Router does not observe that, so a caller that writes the list and
// does not also navigate leaves the hook holding the list it started with: the tabs stay on screen
// and the action looks like it did nothing. These tests pin the hook to what the URL now says,
// whichever way it was written.
//
// Tab ids are the engine's own (`buildRestoredTabId` rebuilds them from module and entity), so the
// tests read the ids of the tabs that actually mounted rather than naming them.

import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { urlTabSyncEngine } from '@/services/tabs/URLTabSyncEngine';
import type { ParsedTabState } from '@/services/tabs/types';

import { useTabs } from '../useTabs';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      typeof options?.defaultValue === 'string' ? options.defaultValue : key,
  }),
}));

/** Three tabs: the pinned dashboard, the active applications tab, and a finance tab. */
const initialState = (): ParsedTabState => ({
  tabs: [
    {
      id: 'tab-dashboard',
      url: '/dashboard',
      title: 'Dashboard',
      module: 'dashboard',
      pinned: true,
      isDirty: false,
    },
    {
      id: 'tab-applications',
      url: '/administration/applications',
      title: 'Applications',
      module: 'administration',
      pinned: false,
      isDirty: false,
    },
    {
      id: 'tab-finance',
      url: '/finance/dashboard',
      title: 'Finance',
      module: 'finance',
      pinned: false,
      isDirty: false,
    },
  ],
  activeTabId: 'tab-applications',
});

/** The hook as the tab bar mounts it, over the URL the engine writes for these three tabs.
 *
 * The router is given that same URL: the hook re-reads the tab list from the routed location, so the
 * location and the URL the engine writes have to agree, exactly as they do on the app's first load.
 */
function renderTabs(state: ParsedTabState = initialState()) {
  const url = urlTabSyncEngine.createURL(state);
  window.history.replaceState(null, '', url);
  const routed = new URL(url);
  const entry = `${routed.pathname}${routed.search}`;
  return renderHook(() => useTabs(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    ),
  });
}

type TabsResult = { readonly current: { readonly tabs: readonly { id: string }[] } };

const ids = (result: TabsResult) => result.current.tabs.map((tab) => tab.id);

describe('the tab context menu closes', () => {
  beforeEach(() => {
    // The engine falls back to session storage when the routed location carries no tab list, and the
    // storage outlives a test. Clearing it keeps each test starting from its own URL.
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('mounts the three tabs the URL describes, which is the state these tests start from', () => {
    const { result } = renderTabs();

    expect(ids(result)).toHaveLength(3);
    // The engine rebuilds the ids from module and entity, so the list is asserted by length and by
    // the active tab rather than by ids this test would have to invent.
    expect(result.current.activeTabId).toBe(ids(result)[1]);
  });

  it('closes the other tabs, keeping the one that was right-clicked', () => {
    const { result } = renderTabs();
    const [dashboard, , finance] = ids(result);

    act(() => result.current.closeOtherTabs(finance));

    // The pinned dashboard stays; the active applications tab is one of the others and goes.
    expect(ids(result)).toEqual([dashboard, finance]);
    expect(result.current.activeTabId).toBe(finance);
  });

  it('closes the tabs to the right of the one that was right-clicked', () => {
    const { result } = renderTabs();
    const [dashboard, applications] = ids(result);

    act(() => result.current.closeTabsToRight(applications));

    expect(ids(result)).toEqual([dashboard, applications]);
  });

  it('closes the tabs to the left of the one that was right-clicked', () => {
    const { result } = renderTabs();
    const [dashboard, , finance] = ids(result);

    act(() => result.current.closeTabsToLeft(finance));

    // The pinned dashboard is to the left and pinned, so it stays.
    expect(ids(result)).toEqual([dashboard, finance]);
  });

  it('closes every tab but the pinned ones', () => {
    const { result } = renderTabs();
    const [dashboard] = ids(result);

    act(() => result.current.closeAllExceptPinned());

    expect(ids(result)).toEqual([dashboard]);
  });

  it('closes a tab that is not the active one', () => {
    const { result } = renderTabs();
    const [dashboard, applications] = ids(result);

    act(() => result.current.closeTab(ids(result)[2]));

    expect(ids(result)).toEqual([dashboard, applications]);
    expect(result.current.activeTabId).toBe(applications);
  });
});
