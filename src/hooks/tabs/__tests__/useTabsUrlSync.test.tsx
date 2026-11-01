// ABOUTME: The hook reads the workspace's tab list from the address bar's outer search, never from
// ABOUTME: the routed page's own `?tab=` strip: a hub's tab strip is a view of one page, not a list
// ABOUTME: of workspace tabs.

import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
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
      id: 'tab-academics-marks-entry-list',
      url: '/academics/marks-entry',
      title: 'Marks Entry',
      module: 'academics',
      pinned: false,
      isDirty: false,
    },
  ],
  activeTabId: 'tab-academics-marks-entry-list',
});

/** The hook as the tab bar mounts it, with the router sitting on a hub page that has its own tab. */
function renderAt(entry: string, state: ParsedTabState = initialState()) {
  const url = urlTabSyncEngine.createURL(state);
  window.history.replaceState(null, '', url);

  let go: ((to: string) => void) | null = null;
  const CaptureNavigate = () => {
    go = useNavigate();
    return null;
  };

  const rendered = renderHook(() => useTabs(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[entry]}>
        <CaptureNavigate />
        {children}
      </MemoryRouter>
    ),
  });

  return { ...rendered, go: (to: string) => act(() => go?.(to)) };
}

describe('useTabs and a page that owns its tab strip', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('keeps the workspace tabs when the page opens one of its own tabs', () => {
    const { result, go } = renderAt('/academics/marks-entry?tab=class-grid');
    const before = result.current.tabs.map((tab) => tab.id);
    expect(before).toHaveLength(2);

    go('/academics/marks-entry?tab=student-grid');

    expect(result.current.tabs.map((tab) => tab.id)).toEqual(before);
  });

  it('never turns the page tab strip into a workspace tab', () => {
    const { result } = renderAt('/settings/modules?tab=plugins');

    expect(result.current.tabs.some((tab) => tab.title.toLowerCase().includes('plugins'))).toBe(
      false
    );
  });
});
