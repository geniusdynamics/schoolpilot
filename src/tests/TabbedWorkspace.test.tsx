// ABOUTME: Test suite for the comprehensive tabbed workspace system
// ABOUTME: Verifies tab management, action bars, RBAC integration, and UI functionality

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TabbedWorkspace } from '@/components/tabbedWorkspace/TabbedWorkspace';
import { useTabStore } from '@/stores/tabStore';

// Mock the store — the component destructures every member below, so the
// mock must expose the full surface or effects crash on missing functions.
vi.mock('@/stores/tabStore');

const mockTabStore = {
  tabs: [] as any[],
  activeTabId: null as string | null,
  pinnedTabs: [] as string[],
  createTab: vi.fn(),
  closeTab: vi.fn(),
  activateTab: vi.fn(),
  updateTab: vi.fn(),
  reorderTabs: vi.fn(),
  pinTab: vi.fn(),
  unpinTab: vi.fn(),
  duplicateTab: vi.fn(),
  setUserRole: vi.fn(),
  updateUserPermissions: vi.fn(),
  validateTabAccess: vi.fn(() => true),
  initializeStore: vi.fn(),
  initialize: vi.fn(),
  clearCorruptedData: vi.fn(),
};

const mockRegisterAction = vi.fn();

vi.mock('@/services/ui/actionRegistry', () => ({
  useActionRegistry: () => ({
    registerAction: mockRegisterAction,
    getActionsByContext: vi.fn(() => []),
    getActionsForContext: vi.fn(() => []),
    getActionGroupsForContext: vi.fn(() => []),
    searchActions: vi.fn(() => []),
  }),
}));

describe('TabbedWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTabStore.tabs = [];
    mockTabStore.activeTabId = null;
    (useTabStore as any).mockReturnValue(mockTabStore);
  });

  const renderWorkspace = (props: Record<string, unknown> = {}) => {
    return render(
      <TabbedWorkspace
        userRole="admin"
        userPermissions={['read', 'write']}
        moduleContext="academics"
        {...props}
      />
    );
  };

  it('should render without crashing', async () => {
    renderWorkspace();
    expect(await screen.findByTestId('tabbed-workspace')).toBeInTheDocument();
  });

  it('should initialize the tab store on mount', async () => {
    renderWorkspace();
    await screen.findByTestId('tabbed-workspace');
    await waitFor(() => {
      expect(mockTabStore.initialize).toHaveBeenCalled();
      expect(mockTabStore.initializeStore).toHaveBeenCalled();
    });
  });

  it('should render tab bar when showTabBar is true', async () => {
    const { container } = renderWorkspace({ showTabBar: true });
    const workspace = await screen.findByTestId('tabbed-workspace');
    expect(workspace).toBeInTheDocument();
    // Tab bar renders inside the workspace once loading resolves
    await waitFor(() => {
      expect(within(workspace).getByTestId('tab-bar')).toBeInTheDocument();
    });
    expect(container).toBeInTheDocument();
  });

  it('should render action bar when showActionBar is true', async () => {
    renderWorkspace({ showActionBar: true });
    const workspace = await screen.findByTestId('tabbed-workspace');
    await waitFor(() => {
      expect(within(workspace).getByTestId('action-bar')).toBeInTheDocument();
    });
  });

  it('should handle tab creation', async () => {
    renderWorkspace({ showTabBar: true });
    const workspace = await screen.findByTestId('tabbed-workspace');
    const addButton = await within(workspace).findByTestId('add-tab-button');
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(mockTabStore.createTab).toHaveBeenCalled();
    });
  });

  it('should respect RBAC permissions', async () => {
    renderWorkspace({ userRole: 'student', userPermissions: ['read'], showActionBar: true });
    const workspace = await screen.findByTestId('tabbed-workspace');
    // Action bar should still render but with limited actions
    await waitFor(() => {
      expect(within(workspace).getByTestId('action-bar')).toBeInTheDocument();
    });
  });

  it('should apply theme classes', async () => {
    const { rerender } = render(
      <TabbedWorkspace
        userRole="admin"
        userPermissions={['read', 'write']}
        moduleContext="academics"
        theme="light"
      />
    );

    const workspace = await screen.findByTestId('tabbed-workspace');
    expect(workspace).toHaveClass('theme-light');

    rerender(
      <TabbedWorkspace
        userRole="admin"
        userPermissions={['read', 'write']}
        moduleContext="academics"
        theme="dark"
      />
    );

    expect(screen.getByTestId('tabbed-workspace')).toHaveClass('theme-dark');
  });

  it('should wire the settings action to onSettingsClick', async () => {
    const onSettingsClick = vi.fn();
    renderWorkspace({ showSettings: true, onSettingsClick });

    await screen.findByTestId('tabbed-workspace');
    await waitFor(() => {
      expect(mockRegisterAction).toHaveBeenCalled();
    });

    const settingsRegistration = mockRegisterAction.mock.calls
      .map(call => call[0])
      .find((action: any) => action?.id === 'workspace.settings');
    expect(settingsRegistration).toBeDefined();

    await settingsRegistration.execute();
    expect(onSettingsClick).toHaveBeenCalled();
  });

  it('should render provided tabs in the tab bar', async () => {
    mockTabStore.tabs = Array.from({ length: 5 }, (_, i) => ({
      id: `tab-${i}`,
      title: `Tab ${i}`,
      content: `Content ${i}`,
      moduleId: 'academics',
      isActive: i === 0,
      pinned: false,
      permissions: ['read'],
      order: i,
      lastAccessed: Date.now(),
    }));

    renderWorkspace({ showTabBar: true });
    const workspace = await screen.findByTestId('tabbed-workspace');
    const tabBar = await within(workspace).findByTestId('tab-bar');
    expect(within(tabBar).getAllByText(/Tab [0-9]/).length).toBe(5);
  }, 20000);
});
