// ABOUTME: Tests that the layout route mirror never turns an unknown route into a tab.
// ABOUTME: Reproduces a direct hash visit to a hub sub-tab id that the router shows as 404.

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '@/components/Layout';
import { SecondarySidebarProvider } from '@/contexts/SecondarySidebarContext';

vi.mock('@/components/Header', () => ({
  default: () => <div>header</div>
}));

vi.mock('@/components/LoadingScreen', () => ({
  default: () => <div>loading</div>
}));

vi.mock('@/components/SettingsPopup', () => ({
  default: () => null
}));

vi.mock('@/components/tabbedWorkspace/TabBar', () => ({
  TabBar: ({ tabs }: { tabs: Array<{ path: string }> }) => (
    <div data-testid="tab-paths">{tabs.map(tab => tab.path).join('|')}</div>
  )
}));

vi.mock('@/components/tabbedWorkspace/TabWorkspaceErrorBoundary', () => ({
  TabWorkspaceErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/components/PrimarySidebar', () => ({
  default: () => <div>primary</div>
}));

vi.mock('@/components/SecondarySidebar', () => ({
  default: () => <div>secondary</div>
}));

const layoutMocks = vi.hoisted(() => ({
  navigationItems: [] as Array<{ path?: string }>,
  getMainModules: () => [],
  hasModuleAccess: async () => true,
  hasPermission: async () => true,
  t: (key: string) => key
}));

vi.mock('@/contexts/FullWidthContext', () => ({
  useFullWidth: () => ({
    isFullWidth: false,
    isSecondaryAsPrimary: false,
    toggleFullWidth: vi.fn(),
    enableFullWidth: vi.fn(),
    disableFullWidth: vi.fn(),
    setSecondaryAsPrimary: vi.fn()
  })
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    hasModuleAccess: layoutMocks.hasModuleAccess,
    hasPermission: layoutMocks.hasPermission
  })
}));

vi.mock('@/hooks/useDynamicNavigation', () => ({
  useDynamicNavigation: () => ({
    isLoading: false,
    getMainModules: layoutMocks.getMainModules,
    navigationItems: layoutMocks.navigationItems
  })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: layoutMocks.t
  })
}));

const renderLayout = (route: string) => render(
  <SecondarySidebarProvider>
    <MemoryRouter initialEntries={[route]}>
      <Layout />
    </MemoryRouter>
  </SecondarySidebarProvider>
);

describe('Layout route mirror', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/#/dashboard');
    sessionStorage.clear();
  });

  it('creates no tab and persists nothing for a direct 404 visit', async () => {
    renderLayout('/bulk-streams');

    await waitFor(() => {
      expect(screen.getByTestId('tab-paths')).toBeInTheDocument();
    });

    expect(screen.getByTestId('tab-paths').textContent).not.toContain('/bulk-streams');
    expect(sessionStorage.getItem('sp_tabs_v2')).toBeNull();
  });

  it('still mirrors a real route into the tab strip', async () => {
    renderLayout('/academics/students');

    await waitFor(() => {
      expect(screen.getByTestId('tab-paths').textContent).toContain('/academics/students');
    });

    expect(sessionStorage.getItem('sp_tabs_v2')).toContain('/academics/students');
  });
});
