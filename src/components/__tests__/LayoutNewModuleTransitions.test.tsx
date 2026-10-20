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
const switchModuleSessionMock = vi.fn();
const hasModuleAccessMock = vi.fn(async () => true);
const hasPermissionMock = vi.fn(async () => true);

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
      <button onClick={() => onModuleSelect('administration')}>module-administration</button>
      <button onClick={() => onModuleSelect('academics')}>module-academics</button>
      <button onClick={() => onModuleSelect('finance')}>module-finance</button>
    </div>
  )
}));

vi.mock('../SecondarySidebar', () => ({
  default: ({ onItemClick }: { onItemClick?: (item: { path: string }) => void }) => (
    <div>
      <button onClick={() => onItemClick?.({ path: '/administration/applications' })}>same-module-item</button>
      <button onClick={() => onItemClick?.({ path: '/finance/reports' })}>cross-module-item</button>
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
    hasModuleAccess: hasModuleAccessMock,
    hasPermission: hasPermissionMock
  })
}));

vi.mock('../../hooks/useDynamicNavigation', () => ({
  useDynamicNavigation: () => ({
    isLoading: false,
    getMainModules: () => [
      {
        id: 'administration',
        name: 'navigation:administration.title',
        modulePath: '/administration',
        isGroup: true,
        children: [
          { name: 'administration.dashboard', path: '/administration/dashboard' },
          { name: 'administration.applications', path: '/administration/applications' }
        ]
      },
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
        children: [
          { name: 'finance.dashboard', path: '/finance/dashboard' },
          { name: 'finance.reports', path: '/finance/reports', permissions: ['finance.reports.view'] }
        ]
      }
    ],
    navigationItems: [
      {
        id: 'administration',
        name: 'navigation:administration.title',
        modulePath: '/administration',
        isGroup: true,
        children: [
          { name: 'administration.dashboard', path: '/administration/dashboard' },
          { name: 'administration.applications', path: '/administration/applications' }
        ]
      },
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
        children: [
          { name: 'finance.dashboard', path: '/finance/dashboard' },
          { name: 'finance.reports', path: '/finance/reports', permissions: ['finance.reports.view'] }
        ]
      }
    ]
  })
}));

vi.mock('../../hooks/tabs', () => ({
  useTabs: () => ({
    tabs: [
      {
        id: 'tab-administration-dashboard',
        url: '/administration/dashboard',
        title: 'Dashboard',
        module: 'administration',
        pinned: false,
        isDirty: false,
        metadata: { lastAccessed: Date.now() }
      }
    ],
    activeTab: {
      id: 'tab-administration-dashboard',
      url: '/administration/dashboard',
      title: 'Dashboard',
      module: 'administration',
      pinned: false,
      isDirty: false,
      metadata: { lastAccessed: Date.now() }
    },
    activeTabId: 'tab-administration-dashboard',
    activateTab: vi.fn(),
    closeTab: vi.fn(),
    reorderTabs: vi.fn(),
    pinTab: vi.fn(),
    unpinTab: vi.fn(),
    openTab: openTabMock,
    switchModuleSession: switchModuleSessionMock
  })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe('LayoutNew module transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasModuleAccessMock.mockResolvedValue(true);
    hasPermissionMock.mockResolvedValue(true);
    switchModuleSessionMock.mockResolvedValue('tab-academics-dashboard');
  });

  it('switches to the target module dashboard via a module session', async () => {
    render(
      <MemoryRouter initialEntries={['/administration/dashboard']}>
        <LayoutNew />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('module-academics'));

    await waitFor(() => {
      expect(switchModuleSessionMock).toHaveBeenCalledWith(
        '/academics/dashboard',
        expect.objectContaining({
          preservePinned: true,
          refresh: false,
          pinned: false,
          canPreserveTab: expect.any(Function)
        })
      );
    });
  });

  it('keeps same-module navigation inside the current tab session', async () => {
    render(
      <MemoryRouter initialEntries={['/administration/dashboard']}>
        <LayoutNew />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('same-module-item'));

    await waitFor(() => {
      expect(openTabMock).toHaveBeenCalledWith('/administration/applications', { pinned: false });
    });

    expect(switchModuleSessionMock).not.toHaveBeenCalled();
  });

  it('opens a tab for cross-module submenu clicks', async () => {
    render(
      <MemoryRouter initialEntries={['/administration/dashboard']}>
        <LayoutNew />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('cross-module-item'));

    await waitFor(() => {
      // Sidebar nav clicks always open a tab — module sessions are only
      // switched from the primary sidebar's module selection.
      expect(openTabMock).toHaveBeenCalledWith('/finance/reports', { pinned: false });
    });
    expect(switchModuleSessionMock).not.toHaveBeenCalled();
  });
});
