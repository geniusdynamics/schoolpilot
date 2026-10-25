// ABOUTME: Clicking the school name in the header closes every open tab - the pinned ones too - and lands
// ABOUTME: on the main dashboard as one fresh pinned tab. It does nothing when the user is already home.

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import LayoutNew from '../Layout';
import { SecondarySidebarProvider } from '../../contexts/SecondarySidebarContext';

// Layout.tsx calls useSecondarySidebar(); this file imports RTL's render directly, so it wraps the
// layout in the provider it expects. FullWidthContext is mocked below.
const render = (ui: React.ReactElement, options?: Parameters<typeof rtlRender>[1]) =>
  rtlRender(<SecondarySidebarProvider>{ui}</SecondarySidebarProvider>, options);

interface TestTab {
  id: string;
  url: string;
  title: string;
  module: string;
  pinned: boolean;
  isDirty: boolean;
  metadata: { lastAccessed: number };
}

/** The tabs the mocked hook reports; each test sets them before it renders. */
const tabsState = vi.hoisted(() => ({ tabs: [] as TestTab[] }));

const tab = (id: string, url: string, title: string, module: string, pinned: boolean): TestTab => ({
  id,
  url,
  title,
  module,
  pinned,
  isDirty: false,
  metadata: { lastAccessed: Date.now() },
});

const DASHBOARD = tab('tab-dashboard', '/dashboard', 'Dashboard', 'dashboard', true);
const FINANCE = tab('tab-finance', '/finance', 'Finance', 'finance', true);
const STUDENTS = tab('tab-students', '/academics/students', 'Students', 'academics', false);

const openTabMock = vi.fn();
const switchModuleSessionMock = vi.fn(async () => 'tab-id');
const closeAllTabsMock = vi.fn();

// The header is reduced to the one thing under test: its brand button, wired the way the real one is.
vi.mock('../Header', () => ({
  default: ({ onHome }: { onHome?: () => void }) => <button onClick={onHome}>brand</button>,
}));

vi.mock('../LoadingScreen', () => ({ default: () => <div>loading</div> }));
vi.mock('../SettingsPopup', () => ({ default: () => null }));
vi.mock('../tabbedWorkspace/TabBar', () => ({ TabBar: () => <div>tabbar</div> }));
vi.mock('../tabbedWorkspace/TabWorkspaceErrorBoundary', () => ({
  TabWorkspaceErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../PrimarySidebar', () => ({ default: () => <div>primary</div> }));
vi.mock('../SecondarySidebar', () => ({ default: () => <div>secondary</div> }));

vi.mock('../../contexts/FullWidthContext', () => ({
  useFullWidth: () => ({
    isFullWidth: false,
    isSecondaryAsPrimary: false,
    toggleFullWidth: vi.fn(),
    enableFullWidth: vi.fn(),
    disableFullWidth: vi.fn(),
    setSecondaryAsPrimary: vi.fn(),
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    hasModuleAccess: vi.fn(async () => true),
    hasPermission: vi.fn(async () => true),
  }),
}));

vi.mock('../../hooks/useDynamicNavigation', () => ({
  useDynamicNavigation: () => ({
    isLoading: false,
    getMainModules: () => [],
    navigationItems: [],
  }),
}));

vi.mock('../../hooks/tabs', () => ({
  useTabs: () => ({
    tabs: tabsState.tabs,
    activeTab: tabsState.tabs[0] ?? null,
    activeTabId: tabsState.tabs[0]?.id ?? '',
    activateTab: vi.fn(),
    closeTab: vi.fn(),
    reorderTabs: vi.fn(),
    pinTab: vi.fn(),
    unpinTab: vi.fn(),
    openTab: openTabMock,
    switchModuleSession: switchModuleSessionMock,
    closeAllTabs: closeAllTabsMock,
    markDirty: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LayoutNew />
    </MemoryRouter>
  );

describe('clicking the school name in the header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabsState.tabs = [];
  });

  it('closes every tab, the pinned ones too, and opens one fresh pinned dashboard', async () => {
    tabsState.tabs = [DASHBOARD, FINANCE, STUDENTS];
    renderAt('/academics/students');

    fireEvent.click(screen.getByText('brand'));

    await waitFor(() => expect(switchModuleSessionMock).toHaveBeenCalledTimes(1));
    // preservePinned: false is what makes it a full close; the tab list is replaced in one step.
    expect(switchModuleSessionMock).toHaveBeenCalledWith('/dashboard', {
      preservePinned: false,
      refresh: false,
      pinned: true,
    });
  });

  it('does not use the tab menu\'s "close all", which keeps pinned tabs', async () => {
    tabsState.tabs = [DASHBOARD, FINANCE, STUDENTS];
    renderAt('/academics/students');

    fireEvent.click(screen.getByText('brand'));

    await waitFor(() => expect(switchModuleSessionMock).toHaveBeenCalled());
    expect(closeAllTabsMock).not.toHaveBeenCalled();
  });

  it('does nothing when the dashboard is already the only tab, and the user is on it', () => {
    tabsState.tabs = [DASHBOARD];
    renderAt('/dashboard');

    fireEvent.click(screen.getByText('brand'));

    expect(switchModuleSessionMock).not.toHaveBeenCalled();
  });

  it('still closes the other tabs when the user is on the dashboard but more are open', async () => {
    tabsState.tabs = [DASHBOARD, FINANCE];
    renderAt('/dashboard');

    fireEvent.click(screen.getByText('brand'));

    await waitFor(() => expect(switchModuleSessionMock).toHaveBeenCalledTimes(1));
  });

  it('takes the user home from a module page even when it is the only tab', async () => {
    tabsState.tabs = [FINANCE];
    renderAt('/finance');

    fireEvent.click(screen.getByText('brand'));

    await waitFor(() => expect(switchModuleSessionMock).toHaveBeenCalledTimes(1));
  });
});
