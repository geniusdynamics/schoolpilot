/**
 * Comprehensive test suite for TabStateManager
 * Tests module dashboard detection, platform adaptation, and tab management functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { TabStateManager, defaultTabStateConfig, TabStateConfig } from '../services/ui/TabStateManager';

// Mock store for testing
const createMockStore = () => ({
  tabs: [],
  createTab: vi.fn(),
  activateTab: vi.fn(),
  closeTab: vi.fn()
});

// Mock navigation item
const createMockNavigationItem = (isModuleDashboard = false) => ({
  module: {
    name: isModuleDashboard ? 'navigation:settings.title' : 'navigation:settings',
    displayName: 'Settings',
    path: '/settings'
  },
  child: isModuleDashboard ? null : {
    name: 'General Settings',
    path: '/settings/general'
  }
});

// Mock location
const createMockLocation = (pathname: string) => ({
  pathname,
  search: '',
  hash: '',
  state: null,
  key: 'test'
} as Location);

describe('TabStateManager', () => {
  let tabStateManager: TabStateManager;
  let mockStore: ReturnType<typeof createMockStore>;
  let config: TabStateConfig;

  beforeEach(() => {
    config = { ...defaultTabStateConfig };
    tabStateManager = new TabStateManager(config);
    mockStore = createMockStore();
    tabStateManager.setStore(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const manager = new TabStateManager(defaultTabStateConfig);
      const retrievedConfig = manager.getConfig();
      
      expect(retrievedConfig.maxTabs).toBe(15);
      expect(retrievedConfig.enablePersistence).toBe(true);
      expect(retrievedConfig.moduleDefaults.dashboardCanClose).toBe(false);
      expect(retrievedConfig.moduleDefaults.dashboardPinned).toBe(true);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: Partial<TabStateConfig> = {
        maxTabs: 20,
        moduleDefaults: {
          dashboardCanClose: true,
          dashboardPinned: false,
          pageCanClose: false,
          pagePinned: true
        }
      };
      
      const manager = new TabStateManager(customConfig as TabStateConfig);
      const retrievedConfig = manager.getConfig();
      
      expect(retrievedConfig.maxTabs).toBe(20);
      expect(retrievedConfig.moduleDefaults.dashboardCanClose).toBe(true);
      expect(retrievedConfig.enablePersistence).toBe(true); // Should keep default
    });
  });

  describe('Module Dashboard Detection', () => {
    it('should correctly identify module dashboard', () => {
      const navigationItem = createMockNavigationItem(true);
      const location = createMockLocation('/settings');
      
      mockStore.createTab.mockResolvedValue('tab-123');
      
      return tabStateManager.createModuleTab(navigationItem, location).then(result => {
        expect(result.action).toBe('created');
        expect(mockStore.createTab).toHaveBeenCalledWith(
          expect.objectContaining({
            canClose: false,
            pinned: true,
            metadata: expect.objectContaining({
              isModuleDashboard: true
            })
          })
        );
      });
    });

    it('should correctly identify page tab', () => {
      const navigationItem = createMockNavigationItem(false);
      const location = createMockLocation('/settings/general');
      
      mockStore.createTab.mockResolvedValue('tab-456');
      
      return tabStateManager.createModuleTab(navigationItem, location).then(result => {
        expect(result.action).toBe('created');
        expect(mockStore.createTab).toHaveBeenCalledWith(
          expect.objectContaining({
            canClose: true,
            pinned: false,
            metadata: expect.objectContaining({
              isModuleDashboard: false
            })
          })
        );
      });
    });
  });

  describe('Tab Title Generation', () => {
    it('should generate clean title for module dashboard', () => {
      const navigationItem = createMockNavigationItem(true);
      const location = createMockLocation('/settings');
      
      mockStore.createTab.mockResolvedValue('tab-123');
      
      return tabStateManager.createModuleTab(navigationItem, location).then(() => {
        // generateTabTitle prefers module.displayName ('Settings')
        expect(mockStore.createTab).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Settings'
          })
        );
      });
    });

    it('should use child name for page tabs', () => {
      const navigationItem = createMockNavigationItem(false);
      const location = createMockLocation('/settings/general');
      
      mockStore.createTab.mockResolvedValue('tab-456');
      
      return tabStateManager.createModuleTab(navigationItem, location).then(() => {
        expect(mockStore.createTab).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'General Settings'
          })
        );
      });
    });

    it('should handle navigation keys properly', () => {
      const navigationItem = {
        module: {
          name: 'navigation:administration.title',
          path: '/administration'
        },
        child: null
      };
      const location = createMockLocation('/administration');
      
      mockStore.createTab.mockResolvedValue('tab-789');
      
      return tabStateManager.createModuleTab(navigationItem, location).then(() => {
        // The '.title' suffix is stripped from navigation keys
        expect(mockStore.createTab).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Administration'
          })
        );
      });
    });
  });

  describe('Existing Tab Activation', () => {
    it('should activate existing tab instead of creating new one', () => {
      const navigationItem = createMockNavigationItem(true);
      const location = createMockLocation('/settings');
      
      // Mock existing tab
      mockStore.tabs = [{
        id: 'existing-tab',
        path: '/settings',
        title: 'Settings'
      }];
      
      mockStore.activateTab.mockResolvedValue(undefined);
      
      return tabStateManager.createModuleTab(navigationItem, location).then(result => {
        expect(result.action).toBe('activated');
        expect(result.tabId).toBe('existing-tab');
        expect(mockStore.activateTab).toHaveBeenCalledWith('existing-tab');
        expect(mockStore.createTab).not.toHaveBeenCalled();
      });
    });
  });

  describe('Platform Adaptation', () => {
    it('should adapt configuration for mobile platform', () => {
      tabStateManager.setPlatformInfo({ platform: 'mobile', touchDevice: true });
      
      const config = tabStateManager.getConfig();
      expect(config.maxTabs).toBe(5);
      expect(config.defaultTabBehavior).toBe('navigate');
    });

    it('should adapt configuration for desktop platform', () => {
      tabStateManager.setPlatformInfo({ platform: 'desktop', touchDevice: false });
      
      const config = tabStateManager.getConfig();
      expect(config.maxTabs).toBe(20);
      expect(config.defaultTabBehavior).toBe('tab');
    });

    it('should adapt configuration for web platform', () => {
      tabStateManager.setPlatformInfo({ platform: 'web', touchDevice: false });
      
      const config = tabStateManager.getConfig();
      expect(config.maxTabs).toBe(15);
      expect(config.defaultTabBehavior).toBe('tab');
    });
  });

  describe('Tab Cleanup', () => {
    beforeEach(() => {
      // Mock tabs that exceed the limit
      mockStore.tabs = Array.from({ length: 20 }, (_, index) => ({
        id: `tab-${index}`,
        path: `/page-${index}`,
        title: `Tab ${index}`,
        canClose: index >= 5, // First 5 cannot be closed
        pinned: index < 3, // First 3 are pinned
        lastAccessed: Date.now() - (index * 60000), // Older tabs have earlier access times
        metadata: {
          isModuleDashboard: index < 3 // First 3 are module dashboards
        }
      }));
    });

    it('should perform cleanup when tab limit is exceeded', async () => {
      mockStore.closeTab.mockResolvedValue(undefined);
      
      // Set lower limit to trigger cleanup
      tabStateManager.updateConfig({ maxTabs: 10 });
      
      await tabStateManager.performTabCleanup();
      
      // Should close some tabs, but not pinned ones or module dashboards
      expect(mockStore.closeTab).toHaveBeenCalled();
    });

    it('should not cleanup pinned tabs', async () => {
      mockStore.closeTab.mockResolvedValue(undefined);
      tabStateManager.updateConfig({ maxTabs: 5 });
      
      await tabStateManager.performTabCleanup();
      
      // Verify pinned tabs were not closed
      const closedTabIds = (mockStore.closeTab as Mock).mock.calls.map(call => call[0]);
      expect(closedTabIds).not.toContain('tab-0');
      expect(closedTabIds).not.toContain('tab-1');
      expect(closedTabIds).not.toContain('tab-2');
    });
  });

  describe('Tab Statistics', () => {
    beforeEach(() => {
      mockStore.tabs = [
        {
          id: 'tab-1',
          pinned: true,
          canClose: false,
          metadata: { isModuleDashboard: true }
        },
        {
          id: 'tab-2',
          pinned: true,
          canClose: false,
          metadata: { isModuleDashboard: true }
        },
        {
          id: 'tab-3',
          pinned: false,
          canClose: true,
          metadata: { isModuleDashboard: false }
        }
      ];
    });

    it('should calculate correct statistics', () => {
      const stats = tabStateManager.getTabStatistics();
      
      expect(stats.totalTabs).toBe(3);
      expect(stats.pinnedTabs).toBe(2);
      expect(stats.moduleDashboards).toBe(2);
      expect(stats.pages).toBe(1);
      expect(stats.closeableTabs).toBe(1);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const updates = {
        maxTabs: 25,
        enablePersistence: false
      };
      
      tabStateManager.updateConfig(updates);
      const config = tabStateManager.getConfig();
      
      expect(config.maxTabs).toBe(25);
      expect(config.enablePersistence).toBe(false);
      expect(config.enableTabGroups).toBe(false); // Should keep existing values
    });
  });

  describe('Error Handling', () => {
    it('should handle store creation errors gracefully', async () => {
      mockStore.createTab.mockRejectedValue(new Error('Creation failed'));
      
      const navigationItem = createMockNavigationItem(true);
      const location = createMockLocation('/settings');
      
      const result = await tabStateManager.createModuleTab(navigationItem, location);
      
      expect(result.action).toBe('error');
      expect(result.message).toBe('Creation failed');
    });

    it('should handle missing store gracefully', async () => {
      const manager = new TabStateManager(defaultTabStateConfig);
      // Don't set store
      
      const navigationItem = createMockNavigationItem(true);
      const location = createMockLocation('/settings');
      
      const result = await manager.createModuleTab(navigationItem, location);
      
      expect(result.action).toBe('error');
      expect(result.message).toBe('TabStore not initialized');
    });
  });

  describe('Tab Configuration Validation', () => {
    it('should validate correct tab configuration', () => {
      const validConfig = {
        title: 'Test Tab',
        module: 'test',
        path: '/test',
        canClose: true,
        pinned: false
      };
      
      const validation = tabStateManager.validateTabConfig(validConfig);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should identify invalid tab configuration', () => {
      const invalidConfig = {
        title: '',
        module: null,
        path: undefined,
        canClose: 'yes',
        pinned: 'no'
      };
      
      const validation = tabStateManager.validateTabConfig(invalidConfig);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Tab title is required');
      expect(validation.errors).toContain('Tab module is required');
      expect(validation.errors).toContain('Tab path is required');
    });
  });
});

describe('TabStateManager Integration', () => {
  let tabStateManager: TabStateManager;
  let mockStore: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    tabStateManager = new TabStateManager(defaultTabStateConfig);
    mockStore = createMockStore();
    tabStateManager.setStore(mockStore);
  });

  it('should handle complete workflow from navigation to tab creation', async () => {
    // Simulate navigation to settings module
    const settingsNavigation = createMockNavigationItem(true);
    const settingsLocation = createMockLocation('/settings');
    
    mockStore.createTab.mockResolvedValue('settings-dashboard');
    
    // Create settings dashboard
    const settingsResult = await tabStateManager.createModuleTab(settingsNavigation, settingsLocation);
    
    expect(settingsResult.action).toBe('created');
    expect(settingsResult.tabId).toBe('settings-dashboard');
    
    // Verify settings dashboard properties
    expect(mockStore.createTab).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Settings',
        module: 'settings',
        path: '/settings',
        canClose: false,
        pinned: true,
        metadata: expect.objectContaining({
          isModuleDashboard: true
        })
      })
    );
    
    // Now navigate to a page within settings
    const generalNavigation = createMockNavigationItem(false);
    const generalLocation = createMockLocation('/settings/general');
    
    mockStore.createTab.mockResolvedValue('settings-general');
    
    // Create general settings page tab
    const generalResult = await tabStateManager.createModuleTab(generalNavigation, generalLocation);
    
    expect(generalResult.action).toBe('created');
    expect(generalResult.tabId).toBe('settings-general');
    
    // Verify general page properties
    expect(mockStore.createTab).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'General Settings',
        module: 'settings',
        path: '/settings/general',
        canClose: true,
        pinned: false,
        metadata: expect.objectContaining({
          isModuleDashboard: false
        })
      })
    );
  });

  it('should handle platform changes dynamically', () => {
    // Start with web platform
    tabStateManager.setPlatformInfo({ platform: 'web', touchDevice: false });
    expect(tabStateManager.getConfig().maxTabs).toBe(15);
    
    // Switch to mobile
    tabStateManager.setPlatformInfo({ platform: 'mobile', touchDevice: true });
    expect(tabStateManager.getConfig().maxTabs).toBe(5);
    expect(tabStateManager.getConfig().defaultTabBehavior).toBe('navigate');
    
    // Switch to desktop
    tabStateManager.setPlatformInfo({ platform: 'desktop', touchDevice: false });
    expect(tabStateManager.getConfig().maxTabs).toBe(20);
    expect(tabStateManager.getConfig().defaultTabBehavior).toBe('tab');
  });
});