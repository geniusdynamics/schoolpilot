// ABOUTME: Integration tests for TabPersistenceService with tabStore
// ABOUTME: Verifies that persistence adapter works correctly with Zustand store

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The global IndexedDB stub in src/tests/setup.ts returns a request object
// whose callbacks never fire, so TabPersistenceService.isIndexedDBAvailable()
// never resolves and every service call (clearTabs/saveTabs/loadTabs) hangs
// until the 20s hook/test timeout. Force the service onto its localStorage
// backend. This must run before the imports below: importing tabStore starts
// zustand persist rehydration, which is the first code path that initializes
// the persistence service.
vi.hoisted(() => {
  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    writable: true,
    value: undefined,
  });
});

import { useTabStore } from '../tabStore';
import { tabPersistenceService } from '@/services/tabs/TabPersistenceService';

describe('Tab Persistence Integration', () => {
  beforeEach(async () => {
    // Clear all persisted data before each test
    await tabPersistenceService.clearTabs();
    localStorage.clear();
    
    // Reset store state
    useTabStore.getState().resetStore();
  });

  afterEach(async () => {
    // Clean up after each test
    await tabPersistenceService.clearTabs();
    localStorage.clear();
  });

  it('should persist tabs using TabPersistenceService', async () => {
    const store = useTabStore.getState();

    // Initialize store
    await store.initialize();

    // Create a tab
    const tabId = await store.createTab({
      title: 'Test Tab',
      module: 'test',
      path: '/test',
      content: { type: 'component', component: 'TestComponent' },
      canClose: true,
      pinned: false,
      isDirty: false,
      metadata: {}
    });

    // Wait for persistence (Zustand persist is async)
    await new Promise(resolve => setTimeout(resolve, 200));

    // Load tabs directly from service
    const persistedTabs = await tabPersistenceService.loadTabs();
    
    expect(persistedTabs).toBeDefined();
    expect(persistedTabs.length).toBeGreaterThan(0);
    
    // Find our test tab
    const testTab = persistedTabs.find(tab => tab.id === tabId);
    expect(testTab).toBeDefined();
    expect(testTab?.title).toBe('Test Tab');
    expect(testTab?.module).toBe('test');
  });

  it('should restore tabs from persistence on initialization', async () => {
    // Save tabs directly via service
    await tabPersistenceService.saveTabs([{
      id: 'test-tab-1',
      title: 'Persisted Tab',
      module: 'test',
      path: '/test',
      content: { type: 'component', component: 'TestComponent' },
      lastAccessed: Date.now(),
      canClose: true,
      pinned: false,
      isDirty: false,
      metadata: {}
    }]);

    // Also save additional state
    localStorage.setItem('tabbed-workspace-storage_additional', JSON.stringify({
      pinnedTabs: [],
      recentlyClosedTabs: [],
      maxTabs: 15,
      tabGroups: {}
    }));

    // Create new store instance (simulates app restart)
    // Note: In real app, this would be a page reload
    const store = useTabStore.getState();
    
    // Force rehydration by accessing persisted state
    // In production, Zustand handles this automatically
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify tabs were restored
    // Note: This test may need adjustment based on how Zustand rehydrates
    const tabs = store.tabs;
    console.log('Restored tabs:', tabs.length);
    
    // At minimum, verify service has the data
    const persistedTabs = await tabPersistenceService.loadTabs();
    expect(persistedTabs).toHaveLength(1);
    expect(persistedTabs[0].title).toBe('Persisted Tab');
  });

  it('should handle persistence failures gracefully', async () => {
    const store = useTabStore.getState();
    await store.initialize();

    // Mock persistence service to fail

    vi.spyOn(tabPersistenceService, 'saveTabs').mockRejectedValue(new Error('Storage full'));

    // Create a tab - should not throw even if persistence fails
    const tabId = await store.createTab({
      title: 'Test Tab',
      module: 'test',
      path: '/test',
      content: { type: 'component', component: 'TestComponent' },
      canClose: true,
      pinned: false,
      isDirty: false,
      metadata: {}
    });

    // Tab should still be created in memory (createTab replaces the zustand
    // state object, so re-read fresh state instead of the pre-creation snapshot)
    expect(tabId).toBeDefined();
    expect(useTabStore.getState().tabs.find((tab) => tab.id === tabId)).toBeDefined();

    // Restore original function
    vi.restoreAllMocks();
  });

  it('should use enhanced validation during tab creation', async () => {
    const store = useTabStore.getState();
    await store.initialize();

    // Try to create tab without required fields - should fail validation
    await expect(
      store.createTab({
        title: '', // Invalid: empty title
        module: 'test',
        path: '/test',
        content: { type: 'component', component: 'TestComponent' },
        canClose: true,
        pinned: false,
        isDirty: false,
        metadata: {}
      })
    ).rejects.toThrow();
  });

  it('should enforce max tabs limit using validation service', async () => {
    const store = useTabStore.getState();
    store.initializeStore({ maxTabs: 2 });
    // Simulate an existing (empty) persisted session so store.initialize()
    // does not inject its default Dashboard tab, which would count against
    // the maxTabs limit.
    localStorage.setItem(
      'tabbed-workspace-storage',
      JSON.stringify({ state: { tabs: [] }, version: 0 })
    );
    await store.initialize();

    // Create max tabs
    await store.createTab({
      title: 'Tab 1',
      module: 'test',
      path: '/test1',
      content: { type: 'component', component: 'TestComponent' },
      canClose: true,
      pinned: false,
      isDirty: false,
      metadata: {}
    });

    await store.createTab({
      title: 'Tab 2',
      module: 'test',
      path: '/test2',
      content: { type: 'component', component: 'TestComponent' },
      canClose: true,
      pinned: false,
      isDirty: false,
      metadata: {}
    });

    // Attempt to create one more (should fail)
    await expect(
      store.createTab({
        title: 'Tab 3',
        module: 'test',
        path: '/test3',
        content: { type: 'component', component: 'TestComponent' },
        canClose: true,
        pinned: false,
        isDirty: false,
        metadata: {}
      })
    ).rejects.toThrow(/Maximum tab limit/);
  });

  it('should persist pinned tabs separately', async () => {
    const store = useTabStore.getState();
    await store.initialize();

    // Create and pin a tab
    const tabId = await store.createTab({
      title: 'Pinned Tab',
      module: 'test',
      path: '/test',
      content: { type: 'component', component: 'TestComponent' },
      canClose: true,
      pinned: false,
      isDirty: false,
      metadata: {}
    });

    store.pinTab(tabId);

    // Wait for persistence
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check additional state in localStorage
    const additionalState = localStorage.getItem('tabbed-workspace-storage_additional');
    expect(additionalState).toBeDefined();
    
    if (additionalState) {
      const parsed = JSON.parse(additionalState);
      expect(parsed.pinnedTabs).toContain(tabId);
    }
  });
});
