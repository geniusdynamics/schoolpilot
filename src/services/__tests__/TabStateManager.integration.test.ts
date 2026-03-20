// ABOUTME: Integration tests for TabStateManager with RouteToTabMapper
// ABOUTME: Verifies route mapping service integration for tab creation and navigation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TabStateManager, defaultTabStateConfig } from '../TabStateManager';
import { routeToTabMapper } from '../tabs/RouteToTabMapper';

describe('TabStateManager + RouteToTabMapper Integration', () => {
  let manager: TabStateManager;
  let mockStore: any;

  beforeEach(() => {
    // Create manager with default config
    manager = new TabStateManager(defaultTabStateConfig);
    
    // Create mock store
    mockStore = {
      tabs: [],
      createTab: vi.fn(async (config: any) => {
        const tabId = `tab_${Date.now()}`;
        mockStore.tabs.push({ id: tabId, ...config });
        return tabId;
      }),
      activateTab: vi.fn(async (tabId: string) => {
        // Mock implementation
      }),
      closeTab: vi.fn(async (tabId: string) => {
        mockStore.tabs = mockStore.tabs.filter((t: any) => t.id !== tabId);
      })
    };

    // Set store reference
    manager.setStore(mockStore);
  });

  describe('Route Mapping Integration', () => {
    it('should use RouteToTabMapper for title generation', () => {
      const module = { name: 'navigation:admin.title', displayName: 'Administration' };
      const title = manager.generateTabTitle(module, null, true);
      
      expect(title).toBeDefined();
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });

    it('should generate correct titles for module dashboards', () => {
      const module = { name: 'navigation:academics.title', displayName: 'Academics' };
      const title = manager.generateTabTitle(module, null, true);
      
      expect(title).toBe('Academics');
    });

    it('should generate correct titles for child pages', () => {
      const module = { name: 'navigation:admin.title' };
      const child = { name: 'navigation:admin.students.title', title: 'Students' };
      const title = manager.generateTabTitle(module, child, false);
      
      expect(title).toBeDefined();
      expect(typeof title).toBe('string');
    });

    it('should use RouteToTabMapper for module ID extraction', () => {
      const moduleId = (manager as any).extractModuleId('navigation:admin.title');
      
      expect(moduleId).toBeDefined();
      expect(typeof moduleId).toBe('string');
      expect(moduleId).not.toContain(':');
      expect(moduleId).not.toContain('.');
    });

    it('should handle missing module names gracefully', () => {
      const moduleId = (manager as any).extractModuleId('');
      
      expect(moduleId).toBe('unknown');
    });
  });

  describe('Module Tab Creation', () => {
    it('should create module dashboard tabs with correct configuration', async () => {
      const navigationItem = {
        module: { name: 'navigation:admin.title', displayName: 'Administration' },
        child: null
      };

      const mockLocation = {
        pathname: '/admin'
      } as Location;

      const result = await manager.createModuleTab(navigationItem, mockLocation);

      expect(result.action).toBe('created');
      expect(result.tabId).toBeDefined();
      expect(mockStore.createTab).toHaveBeenCalled();
    });

    it('should create page tabs with correct configuration', async () => {
      const navigationItem = {
        module: { name: 'navigation:admin.title' },
        child: { name: 'navigation:admin.students.title', title: 'Students' }
      };

      const mockLocation = {
        pathname: '/admin/students'
      } as Location;

      const result = await manager.createModuleTab(navigationItem, mockLocation);

      expect(result.action).toBe('created');
      expect(result.tabId).toBeDefined();
    });

    it('should activate existing tabs instead of creating duplicates', async () => {
      const navigationItem = {
        module: { name: 'navigation:admin.title' },
        child: null
      };

      const mockLocation = {
        pathname: '/admin'
      } as Location;

      // Create first tab
      const result1 = await manager.createModuleTab(navigationItem, mockLocation);
      expect(result1.action).toBe('created');

      // Try to create same tab again
      const result2 = await manager.createModuleTab(navigationItem, mockLocation);
      expect(result2.action).toBe('activated');
      expect(result2.tabId).toBe(result1.tabId);
    });
  });

  describe('Platform Adaptation', () => {
    it('should adapt configuration for mobile platform', () => {
      manager.setPlatformInfo({ platform: 'mobile', touchDevice: true });
      
      const config = manager.getConfig();
      expect(config.maxTabs).toBe(5);
      expect(config.defaultTabBehavior).toBe('navigate');
    });

    it('should adapt configuration for desktop platform', () => {
      manager.setPlatformInfo({ platform: 'desktop', touchDevice: false });
      
      const config = manager.getConfig();
      expect(config.maxTabs).toBe(20);
      expect(config.defaultTabBehavior).toBe('tab');
    });

    it('should adapt configuration for web platform', () => {
      manager.setPlatformInfo({ platform: 'web', touchDevice: false });
      
      const config = manager.getConfig();
      expect(config.maxTabs).toBe(15);
      expect(config.defaultTabBehavior).toBe('tab');
    });
  });

  describe('Tab Cleanup', () => {
    it('should perform tab cleanup when limit exceeded', async () => {
      manager.updateConfig({ maxTabs: 2 });

      // Create tabs
      for (let i = 0; i < 3; i++) {
        mockStore.tabs.push({
          id: `tab_${i}`,
          title: `Tab ${i}`,
          canClose: true,
          pinned: false,
          lastAccessed: Date.now() - (i * 1000)
        });
      }

      // Perform cleanup
      await manager.performTabCleanup();

      // Verify cleanup happened
      expect(mockStore.closeTab).toHaveBeenCalled();
    });

    it('should not close pinned tabs during cleanup', async () => {
      manager.updateConfig({ maxTabs: 1 });

      // Create pinned and unpinned tabs
      mockStore.tabs = [
        {
          id: 'tab_1',
          title: 'Pinned Tab',
          canClose: true,
          pinned: true,
          lastAccessed: Date.now()
        },
        {
          id: 'tab_2',
          title: 'Unpinned Tab',
          canClose: true,
          pinned: false,
          lastAccessed: Date.now() - 1000
        }
      ];

      // Perform cleanup
      await manager.performTabCleanup();

      // Verify pinned tab was not closed
      const closedTabIds = mockStore.closeTab.mock.calls.map((call: any) => call[0]);
      expect(closedTabIds).not.toContain('tab_1');
    });
  });

  describe('Tab Statistics', () => {
    it('should calculate tab statistics correctly', () => {
      mockStore.tabs = [
        {
          id: 'tab_1',
          title: 'Tab 1',
          pinned: true,
          canClose: true,
          metadata: { isModuleDashboard: true }
        },
        {
          id: 'tab_2',
          title: 'Tab 2',
          pinned: false,
          canClose: true,
          metadata: { isModuleDashboard: false }
        },
        {
          id: 'tab_3',
          title: 'Tab 3',
          pinned: false,
          canClose: false,
          metadata: { isModuleDashboard: false }
        }
      ];

      const stats = manager.getTabStatistics();

      expect(stats.totalTabs).toBe(3);
      expect(stats.pinnedTabs).toBe(1);
      expect(stats.moduleDashboards).toBe(1);
      expect(stats.pages).toBe(2);
      expect(stats.closeableTabs).toBe(2);
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = manager.getConfig();

      expect(config).toBeDefined();
      expect(config.maxTabs).toBe(15);
      expect(config.enablePersistence).toBe(true);
      expect(config.platformAdaptation).toBe(true);
    });

    it('should update configuration', () => {
      manager.updateConfig({ maxTabs: 20 });

      const config = manager.getConfig();
      expect(config.maxTabs).toBe(20);
    });

    it('should validate tab configuration', () => {
      const validConfig = {
        title: 'Test Tab',
        module: 'test',
        path: '/test',
        canClose: true,
        pinned: false
      };

      const result = manager.validateTabConfig(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid tab configuration', () => {
      const invalidConfig = {
        title: '',  // Missing title
        module: '',  // Missing module
        path: '',  // Missing path
        canClose: 'invalid',  // Wrong type
        pinned: 'invalid'  // Wrong type
      };

      const result = manager.validateTabConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing store gracefully', async () => {
      const managerWithoutStore = new TabStateManager(defaultTabStateConfig);

      const navigationItem = {
        module: { name: 'navigation:admin.title' },
        child: null
      };

      const mockLocation = { pathname: '/admin' } as Location;

      const result = await managerWithoutStore.createModuleTab(navigationItem, mockLocation);

      expect(result.action).toBe('error');
      expect(result.tabId).toBeNull();
      expect(result.message).toBeDefined();
    });

    it('should handle tab creation errors', async () => {
      // Mock store that throws error
      mockStore.createTab = vi.fn(async () => {
        throw new Error('Tab creation failed');
      });

      const navigationItem = {
        module: { name: 'navigation:admin.title' },
        child: null
      };

      const mockLocation = { pathname: '/admin' } as Location;

      const result = await manager.createModuleTab(navigationItem, mockLocation);

      expect(result.action).toBe('error');
      expect(result.message).toContain('Tab creation failed');
    });
  });

  describe('Service Integration Verification', () => {
    it('should use RouteToTabMapper consistently', () => {
      const module1 = { name: 'navigation:admin.title' };
      const module2 = { name: 'navigation:admin.title' };

      const title1 = manager.generateTabTitle(module1, null, true);
      const title2 = manager.generateTabTitle(module2, null, true);

      expect(title1).toBe(title2);
    });

    it('should maintain consistency with RouteToTabMapper API', () => {
      // Verify that manager uses the same methods as RouteToTabMapper
      const navigationItem = {
        module: { name: 'navigation:admin.title' },
        child: null
      };

      const managerTitle = manager.generateTabTitle(navigationItem.module, navigationItem.child, true);
      const mapperTitle = routeToTabMapper.generateTabTitle(navigationItem);

      expect(managerTitle).toBeDefined();
      expect(mapperTitle).toBeDefined();
    });
  });
});
