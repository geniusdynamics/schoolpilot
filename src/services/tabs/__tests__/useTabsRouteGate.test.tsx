// ABOUTME: Tests that useTabs.openTab refuses paths the router cannot render.
// ABOUTME: Covers the live tab-creation path so a 404 route never becomes a workspace tab.

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useTabs } from '@/hooks/tabs/useTabs';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/dashboard']}>{children}</MemoryRouter>
);

describe('useTabs route gating', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/#/dashboard');
    sessionStorage.clear();
  });

  it('creates no tab and persists nothing for a 404 route', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });

    act(() => {
      result.current.openTab('/bulk-streams');
    });

    expect(result.current.tabs.map(tab => tab.url)).toEqual(['/dashboard']);
    expect(sessionStorage.getItem('sp_tabs_v2')).toBeNull();
  });

  it('still opens a tab for a route the router renders', () => {
    const { result } = renderHook(() => useTabs(), { wrapper });

    act(() => {
      result.current.openTab('/academics/students');
    });

    expect(result.current.tabs.map(tab => tab.url)).toContain('/academics/students');
    expect(sessionStorage.getItem('sp_tabs_v2')).toContain('/academics/students');
  });
});
