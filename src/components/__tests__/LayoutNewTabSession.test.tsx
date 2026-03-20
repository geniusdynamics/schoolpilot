import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LayoutNew from '../LayoutNew';

const openTabMock = vi.fn();
const startSessionMock = vi.fn();
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

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' }
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
    startSession: startSessionMock,
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

  it('opens same-module submenu in a tab and resets session when switching module', async () => {
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
      expect(startSessionMock).toHaveBeenCalledWith('/finance/dashboard', { pinned: false });
    });
  });

  it('starts a new session when submenu route points to a different module', async () => {
    render(
      <MemoryRouter initialEntries={['/academics/dashboard']}>
        <LayoutNew />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('open-finance-report'));
    await waitFor(() => {
      expect(startSessionMock).toHaveBeenCalledWith('/finance/reports', { pinned: false });
    });
  });
});
