import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LayoutNew from '../Layout'; // merged into Layout.tsx (flag-aware)
import { SecondarySidebarProvider } from '../../contexts/SecondarySidebarContext';

// Layout.tsx itself calls useSecondarySidebar(); these files import RTL's
// render directly (bypassing the global provider wrapper), so wrap the layout
// in the SecondarySidebarProvider it expects. FullWidthContext is mocked below.
const render = (ui: React.ReactElement, options?: Parameters<typeof rtlRender>[1]) =>
  rtlRender(<SecondarySidebarProvider>{ui}</SecondarySidebarProvider>, options);

const openTabMock = vi.fn();
const switchModuleSessionMock = vi.fn(async () => 'tab-id');
const activateTabMock = vi.fn();
const closeTabMock = vi.fn();
const reorderTabsMock = vi.fn();
const pinTabMock = vi.fn();
const unpinTabMock = vi.fn();
const markDirtyMock = vi.fn();

vi.mock('../Header', () => ({
  default: () => <div>header</div>
}));

vi.mock('../LoadingScreen', () => ({
  default: () => <div>loading</div>
}));

vi.mock('../SettingsPopup', () => ({
  default: () => null
}));

vi.mock('../tabbedWorkspace/TabBar', () => ({
  TabBar: () => <div>tabbar</div>
}));

vi.mock('../tabbedWorkspace/TabWorkspaceErrorBoundary', () => ({
  TabWorkspaceErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../PrimarySidebar', () => ({
  default: ({ onModuleSelect }: { onModuleSelect: (value: string) => void }) => (
    <div>
      <button onClick={() => onModuleSelect('academics')}>open-academics</button>
      <button onClick={() => onModuleSelect('finance')}>open-finance</button>
    </div>
  )
}));

vi.mock('../SecondarySidebar', () => ({
  default: ({ onItemClick }: { onItemClick?: (item: { path: string }) => void }) => (
    <div>
      <button onClick={() => onItemClick?.({ path: '/academics/students' })}>open-students</button>
      <button onClick={() => onItemClick?.({ path: '/finance/reports' })}>open-finance-report</button>
    </div>
  )
}));

vi.mock('../../contexts/FullWidthContext', () => ({
  useFullWidth: () => ({
    isFullWidth: false,
    isSecondaryAsPrimary: false,
    toggleFullWidth: vi.fn(),
    enableFullWidth: vi.fn(),
    disableFullWidth: vi.fn(),
    setSecondaryAsPrimary: vi.fn()
  })
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    hasModuleAccess: vi.fn(async () => true),
    hasPermission: vi.fn(async () => true)
  })
}));

vi.mock('../../hooks/useDynamicNavigation', () => ({
  useDynamicNavigation: () => ({
    isLoading: false,
    getMainModules: () => [
      {
        id: 'academics',
        name: 'navigation:academics.title',
        modulePath: '/academics',
        isGroup: true,
        children: [{ name: 'academics.dashboard', path: '/academics/dashboard' }]
      },
      {
        id: 'finance',
        name: 'navigation:finance.title',
        modulePath: '/finance',
        isGroup: true,
        children: [{ name: 'finance.dashboard', path: '/finance/dashboard' }]
      }
    ],
    navigationItems: [
      {
        id: 'academics',
        name: 'navigation:academics.title',
        modulePath: '/academics',
        isGroup: true,
        children: [{ name: 'academics.students', path: '/academics/students' }]
      },
      {
        id: 'finance',
        name: 'navigation:finance.title',
        modulePath: '/finance',
        isGroup: true,
        children: [{ name: 'finance.reports', path: '/finance/reports' }]
      }
    ]
  })
}));

vi.mock('../../hooks/tabs', () => ({
  useTabs: () => ({
    tabs: [
      {
        id: 'tab-dashboard',
        url: '/dashboard',
        title: 'Dashboard',
        module: 'dashboard',
        pinned: true,
        isDirty: false,
        metadata: { lastAccessed: Date.now() }
      }
    ],
    activeTab: {
      id: 'tab-dashboard',
      url: '/dashboard',
      title: 'Dashboard',
      module: 'dashboard',
      pinned: true,
      isDirty: false,
      metadata: { lastAccessed: Date.now() }
    },
    activeTabId: 'tab-dashboard',
    activateTab: activateTabMock,
    closeTab: closeTabMock,
    reorderTabs: reorderTabsMock,
    pinTab: pinTabMock,
    unpinTab: unpinTabMock,
    openTab: openTabMock,
    switchModuleSession: switchModuleSessionMock,
    markDirty: markDirtyMock
  })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe('LayoutNew module tab sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens same-module submenu in a tab and switches module session when switching module', async () => {
    render(
      <MemoryRouter initialEntries={['/academics/dashboard']}>
        <LayoutNew />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('open-students'));
    await waitFor(() => {
      expect(openTabMock).toHaveBeenCalledWith('/academics/students', { pinned: false });
    });

    fireEvent.click(screen.getByText('open-finance'));
    await waitFor(() => {
      // Module switching from the primary sidebar goes through switchModuleSession
      expect(switchModuleSessionMock).toHaveBeenCalledWith(
        '/finance/dashboard',
        expect.objectContaining({
          preservePinned: true,
          refresh: false,
          pinned: false,
          canPreserveTab: expect.any(Function)
        })
      );
    });
  });

  it('opens a tab when submenu route points to a different module', async () => {
    render(
      <MemoryRouter initialEntries={['/academics/dashboard']}>
        <LayoutNew />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('open-finance-report'));
    await waitFor(() => {
      // Sidebar nav clicks always open a tab, even cross-module
      expect(openTabMock).toHaveBeenCalledWith('/finance/reports', { pinned: false });
    });
  });
});
