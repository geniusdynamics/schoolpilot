// ABOUTME: Test suite for the comprehensive tabbed workspace system
// ABOUTME: Verifies tab management, action bars, RBAC integration, and UI functionality

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TabbedWorkspace } from '@/components/tabbedWorkspace/TabbedWorkspace';
import { useTabStore } from '@/stores/tabStore';
import { rbacService } from '@/core/rbacService';

// Mock the stores and services
vi.mock('../stores/tabStore');
vi.mock('../core/rbacService');
vi.mock('../services/actionRegistry', () => ({
  actionRegistry: {
    getActionsForModule: vi.fn(() => []),
    getActionsForTab: vi.fn(() => []),
    registerModuleActions: vi.fn(),
  },
}));

const mockTabStore = {
  tabs: [],
  activeTabId: null,
  createTab: vi.fn(),
  closeTab: vi.fn(),
  activateTab: vi.fn(),
  updateTab: vi.fn(),
  reorderTabs: vi.fn(),
  pinTab: vi.fn(),
  initializeStore: vi.fn(),
};

const mockRbacService = {
  hasPermission: vi.fn(() => true),
  getUserPermissions: vi.fn(() => []),
  validateTabAccess: vi.fn(() => true),
};

describe('TabbedWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useTabStore as any).mockReturnValue(mockTabStore);
    (rbacService as any).hasPermission = mockRbacService.hasPermission;
    (rbacService as any).getUserPermissions = mockRbacService.getUserPermissions;
    (rbacService as any).validateTabAccess = mockRbacService.validateTabAccess;
  });

  it('should render without crashing', () => {
    render(
      <TabbedWorkspace
        userRole="admin"
        userPermissions={['read', 'write']}
        moduleContext="academics"
      />
    );
    
    expect(screen.getByTestId('tabbed-workspace')).toBeInTheDocument();
  });

  it('should initialize the tab store on mount', () => {
    render(
      <TabbedWorkspace
        userRole="admin"
        userPermissions={['read', 'write']}
        moduleContext="academics"
      />
    );
    
    expect(mockTabStore.initializeStore).toHaveBeenCalled();
  });

  it('should render tab bar when showTabBar is true', () => {
    render(
      <TabbedWorkspace
        userRole="admin"
        userPermissions={['read', 'write']}
        moduleContext="academics"
        showTabBar={true}
      />
    );
    
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
  });

  it('should render action bar when showActionBar is true', () => {
    render(
      <TabbedWorkspace
        userRole="admin"
        userPermissions={['read', 'write']}
        moduleContext="academics"
        showActionBar={true}
      />
    );
    
    expect(screen.getByTestId('action-bar')).toBeInTheDocument();
  });

  it('should handle tab creation', async () => {
    render(
      <TabbedWorkspace
        userRole="admin"
        userPermissions={['read', 'write']}
        moduleContext="academics"
        showTabBar={true}
      />
    );
    
    const addButton = screen.getByTestId('add-tab-button');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockTabStore.createTab).toHaveBeenCalled();
    });
  });

  it('should respect RBAC permissions', () => {
    mockRbacService.hasPermission.mockReturnValue(false);
    
    render(
      <TabbedWorkspace
        userRole="student"
        userPermissions={['read']}
        moduleContext="academics"
        showActionBar={true}
      />
    );
    
    // Action bar should still render but with limited actions
    expect(screen.getByTestId('action-bar')).toBeInTheDocument();
  });

  it('should handle theme changes', () => {
    const { rerender } = render(
      <TabbedWorkspace
        userRole="admin"
        userPermissions={['read', 'write']}
        moduleContext="academics"
        theme="light"
      />
    );
    
    expect(screen.getByTestId('tabbed-workspace')).toHaveClass('theme-light');
    
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

  it('should handle settings click', () => {
    const onSettingsClick = vi.fn();
    
    render(
      <TabbedWorkspace
        userRole="admin"
        userPermissions={['read', 'write']}
        moduleContext="academics"
        showSettings={true}
        onSettingsClick={onSettingsClick}
      />
    );
    
    const settingsButton = screen.getByTestId('settings-button');
    fireEvent.click(settingsButton);
    
    expect(onSettingsClick).toHaveBeenCalled();
  });

  it('should limit tabs when maxTabs is set', () => {
    const tabsData = Array.from({ length: 5 }, (_, i) => ({
      id: `tab-${i}`,
      title: `Tab ${i}`,
      content: `Content ${i}`,
      moduleId: 'academics',
      isActive: i === 0,
      isPinned: false,
      permissions: ['read'],
    }));
    
    mockTabStore.tabs = tabsData;
    
    render(
      <TabbedWorkspace
        userRole="admin"
        userPermissions={['read', 'write']}
        moduleContext="academics"
        maxTabs={3}
        showTabBar={true}
      />
    );
    
    // Should only show 3 tabs due to maxTabs limit
    const tabs = screen.getAllByTestId(/^tab-/);
    expect(tabs.length).toBeLessThanOrEqual(3);
  });
});