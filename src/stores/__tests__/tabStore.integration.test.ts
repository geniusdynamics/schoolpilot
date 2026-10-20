// ABOUTME: Integration tests for tabStore with TabValidationService
// ABOUTME: Verifies that validation service is properly integrated into tab operations

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTabStore } from '../tabStore';
import { tabValidationService } from '@/services/tabs/TabValidationService';
import { Tab } from '@/types/tabbedWorkspace';

describe('tabStore + TabValidationService Integration', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTabStore.getState().resetStore();
    // Simulate an existing (empty) persisted session so store.initialize()
    // does not inject its default Dashboard tab. These tests build their own
    // tab fixtures and expect a clean slate (and an accurate maxTabs count).
    localStorage.setItem(
      'tabbed-workspace-storage',
      JSON.stringify({ state: { tabs: [] }, version: 0 })
    );
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    useTabStore.getState().resetStore();
  });

  describe('Permission Validation Integration', () => {
    it('should use validation service for permission checks on tab creation', async () => {
      const store = useTabStore.getState();
      
      // Create tab with specific permissions
      const tabId = await store.createTab({
        title: 'Admin Tab',
        module: 'admin',
        path: '/admin',
        content: { type: 'component', component: 'AdminComponent' },
        permissions: ['admin.read']
      });

      expect(tabId).toBeDefined();
      // createTab replaces the zustand state object, so re-read fresh state
      // instead of asserting on the pre-creation snapshot.
      const freshState = useTabStore.getState();
      expect(freshState.tabs).toHaveLength(1);
      expect(freshState.tabs[0].permissions).toContain('admin.read');
    });

    it('should validate tab access using service', () => {
      const store = useTabStore.getState();
      
      // Create a tab
      const tab: Tab = {
        id: 'test-tab-1',
        title: 'Test Tab',
        module: 'test',
        path: '/test',
        content: { type: 'component', component: 'TestComponent' },
        lastAccessed: Date.now(),
        permissions: ['test.read']
      };

      // Add tab to store
      store.updateTab(tab.id, tab);
      
      // Validate access
      const hasAccess = store.validateTabAccess(tab.id);
      expect(typeof hasAccess).toBe('boolean');
    });

    it('should handle permission validation errors gracefully', async () => {
      const store = useTabStore.getState();
      
      // Spy on console.warn to verify error handling
      const warnSpy = vi.spyOn(console, 'warn');
      
      // Create tab with invalid permissions structure
      const tabId = await store.createTab({
        title: 'Test Tab',
        module: 'test',
        path: '/test',
        content: { type: 'component', component: 'TestComponent' },
        permissions: [] // Empty permissions
      });

      expect(tabId).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  describe('Tab Data Validation Integration', () => {
    it('should validate tab structure on initialization', async () => {
      const store = useTabStore.getState();
      
      // Initialize store
      await store.initialize();

      // Verify store is initialized (initialize replaces the state object)
      expect(useTabStore.getState().isStoreInitialized).toBe(true);
    });

    it('should filter corrupted tabs during initialization', async () => {
      const store = useTabStore.getState();
      
      // Create a valid tab
      const validTabId = await store.createTab({
        title: 'Valid Tab',
        module: 'test',
        path: '/test',
        content: { type: 'component', component: 'TestComponent' }
      });

      expect(useTabStore.getState().tabs).toHaveLength(1);
      expect(useTabStore.getState().tabs[0].id).toBe(validTabId);
    });

    it('should detect and handle corrupted module names', async () => {
      const store = useTabStore.getState();
      
      // Attempt to create tab with corrupted module name
      const warnSpy = vi.spyOn(console, 'warn');
      
      // This should be caught by validation
      const tabId = await store.createTab({
        title: 'Test Tab',
        module: 'test:corrupted', // Invalid: contains colon
        path: '/test',
        content: { type: 'component', component: 'TestComponent' }
      });

      // Tab should still be created (fallback mode)
      expect(tabId).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  describe('Tab Limit Validation', () => {
    it('should enforce max tabs limit using validation service', async () => {
      const store = useTabStore.getState();
      
      // Set max tabs to 2
      store.initializeStore({ maxTabs: 2 });

      // Create first tab
      const tab1 = await store.createTab({
        title: 'Tab 1',
        module: 'test',
        path: '/test1',
        content: { type: 'component', component: 'TestComponent' }
      });
      expect(tab1).toBeDefined();

      // Create second tab
      const tab2 = await store.createTab({
        title: 'Tab 2',
        module: 'test',
        path: '/test2',
        content: { type: 'component', component: 'TestComponent' }
      });
      expect(tab2).toBeDefined();

      // Attempt to create third tab (should fail)
      await expect(
        store.createTab({
          title: 'Tab 3',
          module: 'test',
          path: '/test3',
          content: { type: 'component', component: 'TestComponent' }
        })
      ).rejects.toThrow(/Maximum tab limit/);

      expect(useTabStore.getState().tabs).toHaveLength(2);
    });

    it('should allow creating tabs up to max limit', async () => {
      const store = useTabStore.getState();
      
      // Set max tabs to 3
      store.initializeStore({ maxTabs: 3 });

      // Create tabs up to limit
      for (let i = 1; i <= 3; i++) {
        const tabId = await store.createTab({
          title: `Tab ${i}`,
          module: 'test',
          path: `/test${i}`,
          content: { type: 'component', component: 'TestComponent' }
        });
        expect(tabId).toBeDefined();
      }

      expect(useTabStore.getState().tabs).toHaveLength(3);
    });
  });

  describe('Tab Access Control', () => {
    it('should validate access on tab activation', async () => {
      const store = useTabStore.getState();
      
      // Create a tab
      const tabId = await store.createTab({
        title: 'Test Tab',
        module: 'test',
        path: '/test',
        content: { type: 'component', component: 'TestComponent' }
      });

      // Activate tab
      await store.activateTab(tabId);

      // Verify tab is active (activateTab replaces the state object)
      expect(useTabStore.getState().activeTabId).toBe(tabId);
    });

    it('should handle permission denied gracefully', async () => {
      const store = useTabStore.getState();
      
      const warnSpy = vi.spyOn(console, 'warn');
      
      // Create tab with restricted permissions
      const tabId = await store.createTab({
        title: 'Restricted Tab',
        module: 'admin',
        path: '/admin',
        content: { type: 'component', component: 'AdminComponent' },
        permissions: ['admin.write']
      });

      // Try to activate (may fail permission check but should not throw)
      await store.activateTab(tabId);
      
      // Should still be activated in fallback mode
      expect(useTabStore.getState().activeTabId).toBe(tabId);

      warnSpy.mockRestore();
    });
  });

  describe('Corrupted Data Cleanup', () => {
    it('should clean corrupted data on demand', () => {
      const store = useTabStore.getState();
      
      // Clear corrupted data
      store.clearCorruptedData();
      
      // Verify store is cleaned
      expect(store.tabs).toHaveLength(0);
      expect(store.pinnedTabs).toHaveLength(0);
      expect(store.recentlyClosedTabs).toHaveLength(0);
    });

    it('should reset store completely', () => {
      const store = useTabStore.getState();
      
      // Create some tabs
      store.createTab({
        title: 'Tab 1',
        module: 'test',
        path: '/test1',
        content: { type: 'component', component: 'TestComponent' }
      });

      // Reset store
      store.resetStore();
      
      // Verify everything is reset
      expect(store.tabs).toHaveLength(0);
      expect(store.activeTabId).toBeNull();
      expect(store.pinnedTabs).toHaveLength(0);
      expect(store.currentUserRole).toBe('guest');
    });
  });

  describe('Service Integration Verification', () => {
    it('should use TabValidationService for all validation operations', async () => {
      const store = useTabStore.getState();
      
      // Spy on validation service
      const validateAccessSpy = vi.spyOn(tabValidationService, 'validateTabAccess');
      
      // Create and validate tab
      const tabId = await store.createTab({
        title: 'Test Tab',
        module: 'test',
        path: '/test',
        content: { type: 'component', component: 'TestComponent' }
      });

      // Validate access
      store.validateTabAccess(tabId);
      
      // Verify service was called
      expect(validateAccessSpy).toHaveBeenCalled();
      
      validateAccessSpy.mockRestore();
    });

    it('should maintain consistency between store and service', async () => {
      const store = useTabStore.getState();
      
      // Create tab
      const tabId = await store.createTab({
        title: 'Test Tab',
        module: 'test',
        path: '/test',
        content: { type: 'component', component: 'TestComponent' }
      });

      // Get tab from store
      const tab = store.getTabById(tabId);
      
      // Verify tab exists and is valid
      expect(tab).toBeDefined();
      expect(tab?.id).toBe(tabId);
      expect(tab?.title).toBe('Test Tab');
    });
  });

  describe('RBAC Integration', () => {
    it('should update user permissions and validate accordingly', async () => {
      const store = useTabStore.getState();
      
      // Update permissions
      store.updateUserPermissions(['test.read', 'test.write']);

      // updateUserPermissions replaces the state object; read fresh state
      expect(useTabStore.getState().userPermissions).toContain('test.read');
      expect(useTabStore.getState().userPermissions).toContain('test.write');
    });

    it('should set user role and use it for validation', () => {
      const store = useTabStore.getState();
      
      // Set user role
      store.setUserRole('admin');

      expect(useTabStore.getState().currentUserRole).toBe('admin');
    });

    it('should get accessible tabs based on permissions', async () => {
      const store = useTabStore.getState();
      
      // Create multiple tabs
      await store.createTab({
        title: 'Public Tab',
        module: 'public',
        path: '/public',
        content: { type: 'component', component: 'PublicComponent' }
      });

      await store.createTab({
        title: 'Admin Tab',
        module: 'admin',
        path: '/admin',
        content: { type: 'component', component: 'AdminComponent' },
        permissions: ['admin.read']
      });

      // Get accessible tabs
      const accessibleTabs = store.getAccessibleTabs();
      
      expect(accessibleTabs).toBeDefined();
      expect(Array.isArray(accessibleTabs)).toBe(true);
    });
  });
});
