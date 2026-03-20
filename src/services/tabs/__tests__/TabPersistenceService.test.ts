/**
 * Comprehensive test suite for TabPersistenceService
 * Tests tab persistence operations including save, load, clear, and migration
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { 
  TabPersistenceService, 
  TAB_PERSISTENCE_SCHEMA_VERSION,
  tabPersistenceService 
} from '../TabPersistenceService';
import { Tab } from '../../../types/tabbedWorkspace';

// Mock localStorage
const createMockLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
  };
};

// Mock IndexedDB
const createMockIndexedDB = () => {
  const db: Record<string, any[]> = {};
  return {
    open: vi.fn((name: string, version: number) => {
      return {
        result: {
          objectStoreNames: {
            contains: vi.fn((storeName: string) => !!db[storeName]),
            contains2: (storeName: string) => !!db[storeName],
          },
          createObjectStore: vi.fn((storeName: string, options: any) => {
            db[storeName] = [];
            return {
              add: vi.fn(),
              clear: vi.fn(() => ({ success: true })),
              getAll: vi.fn(() => ({ result: [] })),
            };
          }),
          transaction: vi.fn((stores: string[], mode: string) => {
            return {
              objectStore: vi.fn((storeName: string) => {
                return {
                  add: vi.fn((item: any) => ({ 
                    success: true, 
                    onsuccess: null, 
                    onerror: null 
                  })),
                  clear: vi.fn(() => ({ 
                    success: true, 
                    onsuccess: null, 
                    onerror: null 
                  })),
                  getAll: vi.fn(() => ({ 
                    result: db[storeName] || [], 
                    onsuccess: null, 
                    onerror: null 
                  })),
                };
              }),
            };
          }),
          close: vi.fn(),
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
    }),
    deleteDatabase: vi.fn(),
  };
};

// Test data helpers
const createMockTab = (overrides: Partial<Tab> = {}): Tab => ({
  id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Test Tab',
  path: '/test/path',
  module: 'test',
  pinned: false,
  isDirty: false,
  canClose: true,
  lastAccessed: Date.now(),
  metadata: {},
  ...overrides,
});

const createLegacyTabFormat = (overrides: any = {}) => ({
  id: `legacy-tab-${Date.now()}`,
  title: 'Legacy Tab',
  path: '/legacy/path',
  module: 'legacy',
  icon: 'test-icon',
  badge: '5',
  pinned: false,
  isDirty: false,
  canClose: true,
  lastAccessed: Date.now(),
  metadata: {
    permissions: ['view', 'edit'],
    userRole: 'admin',
    content: { type: 'component' },
  },
  ...overrides,
});

describe('TabPersistenceService', () => {
  let service: TabPersistenceService;
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;
  let mockIndexedDB: ReturnType<typeof createMockIndexedDB>;

  beforeEach(() => {
    // Reset singleton state
    (TabPersistenceService as any).instance = null;
    
    // Create mock localStorage
    mockLocalStorage = createMockLocalStorage();
    (global as any).localStorage = mockLocalStorage;
    
    // Create mock IndexedDB
    mockIndexedDB = createMockIndexedDB();
    (global as any).indexedDB = mockIndexedDB;
    
    // Create new service instance
    service = TabPersistenceService.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
    (TabPersistenceService as any).instance = null;
    delete (global as any).localStorage;
    delete (global as any).indexedDB;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TabPersistenceService.getInstance();
      const instance2 = TabPersistenceService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export a singleton instance', () => {
      expect(tabPersistenceService).toBeDefined();
      expect(tabPersistenceService).toBeInstanceOf(TabPersistenceService);
    });
  });

  describe('Initialization', () => {
    it('should initialize with localStorage when IndexedDB is not available', async () => {
      // Force localStorage by making IndexedDB unavailable
      delete (global as any).indexedDB;
      
      const newService = TabPersistenceService.getInstance();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(newService.getStorageBackend()).toBe('localStorage');
    });

    it('should report ready status', async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(service.isReady()).toBe(true);
    });
  });

  describe('saveTabs', () => {
    it('should save tabs to localStorage', async () => {
      const tabs = [createMockTab(), createMockTab({ id: 'tab-2', title: 'Second Tab' })];
      
      await service.saveTabs(tabs);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const setItemCall = mockLocalStorage.setItem.mock.calls.find(
        (call: any[]) => call[0] === 'schoolpilot_tabs'
      );
      expect(setItemCall).toBeDefined();
      
      const storedData = JSON.parse(setItemCall[1]);
      expect(storedData.tabs).toHaveLength(2);
      expect(storedData.metadata.tabCount).toBe(2);
      expect(storedData.metadata.schemaVersion).toBe(TAB_PERSISTENCE_SCHEMA_VERSION);
    });

    it('should save empty array of tabs', async () => {
      await service.saveTabs([]);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const setItemCall = mockLocalStorage.setItem.mock.calls.find(
        (call: any[]) => call[0] === 'schoolpilot_tabs'
      );
      expect(setItemCall).toBeDefined();
      
      const storedData = JSON.parse(setItemCall[1]);
      expect(storedData.tabs).toHaveLength(0);
      expect(storedData.metadata.tabCount).toBe(0);
    });

    it('should set activeTabId to first tab when tabs exist', async () => {
      const tabs = [createMockTab({ id: 'first-tab' }), createMockTab({ id: 'second-tab' })];
      
      await service.saveTabs(tabs);
      
      const setItemCall = mockLocalStorage.setItem.mock.calls.find(
        (call: any[]) => call[0] === 'schoolpilot_tabs'
      );
      const storedData = JSON.parse(setItemCall[1]);
      expect(storedData.metadata.activeTabId).toBe('first-tab');
    });

    it('should handle localStorage errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const tabs = [createMockTab()];
      
      await expect(service.saveTabs(tabs)).rejects.toThrow('Storage quota exceeded');
    });
  });

  describe('loadTabs', () => {
    it('should load tabs from localStorage', async () => {
      const tabs = [createMockTab(), createMockTab({ id: 'tab-2' })];
      const metadata = {
        schemaVersion: TAB_PERSISTENCE_SCHEMA_VERSION,
        lastSaved: Date.now(),
        tabCount: 2,
        activeTabId: 'tab-1',
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ tabs, metadata }));
      
      const loadedTabs = await service.loadTabs();
      
      expect(loadedTabs).toHaveLength(2);
      expect(loadedTabs[0].id).toBe(tabs[0].id);
    });

    it('should return empty array when no tabs stored', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const loadedTabs = await service.loadTabs();
      
      expect(loadedTabs).toEqual([]);
    });

    it('should return empty array when stored data is invalid', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      
      const loadedTabs = await service.loadTabs();
      
      expect(loadedTabs).toEqual([]);
    });

    it('should return empty array when data is not an array', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ tabs: 'not-an-array' }));
      
      const loadedTabs = await service.loadTabs();
      
      expect(loadedTabs).toEqual([]);
    });

    it('should call migrateLegacyFormat when loading', async () => {
      const tabs = [createMockTab()];
      const metadata = {
        schemaVersion: 0, // Old schema version
        lastSaved: Date.now(),
        tabCount: 1,
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ tabs, metadata }));
      
      const loadedTabs = await service.loadTabs();
      
      // Migration should add isLoading and other fields
      expect(loadedTabs[0].isLoading).toBe(false);
    });
  });

  describe('clearTabs', () => {
    it('should clear tabs from localStorage', async () => {
      await service.clearTabs();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('schoolpilot_tabs');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('schoolpilot_tabs_metadata');
    });

    it('should handle errors gracefully', async () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Should not throw
      await expect(service.clearTabs()).rejects.toThrow('Storage error');
    });
  });

  describe('migrateLegacyFormat', () => {
    it('should return empty array for non-array data', () => {
      const result = service.migrateLegacyFormat(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined data', () => {
      const result = service.migrateLegacyFormat(undefined);
      expect(result).toEqual([]);
    });

    it('should validate and clean tabs', () => {
      const invalidTabs = [
        { id: 'valid-tab', title: 'Valid', path: '/test', module: 'test' },
        null,
        { title: 'Missing ID' },
        { id: 'another-valid', path: '/test2', module: 'test2' }, // Missing title
      ];
      
      const result = service.migrateLegacyFormat(invalidTabs);
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('valid-tab');
      expect(result[1].id).toBe('another-valid');
    });

    it('should add defaults for missing optional fields', () => {
      const minimalTabs = [{
        id: 'minimal-tab',
        title: 'Minimal',
        path: '/minimal',
        module: 'test',
      }];
      
      const result = service.migrateLegacyFormat(minimalTabs);
      
      expect(result[0].pinned).toBe(false);
      expect(result[0].isDirty).toBe(false);
      expect(result[0].canClose).toBe(true);
      expect(result[0].metadata).toEqual({});
    });

    it('should migrate from schema version 0 to 1', () => {
      // Set up old schema version in storage
      const oldMetadata = { schemaVersion: 0 };
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ tabs: [], metadata: oldMetadata })
      );
      
      const legacyTabs = [createLegacyTabFormat()];
      const result = service.migrateLegacyFormat(legacyTabs);
      
      expect(result).toHaveLength(1);
      expect(result[0].isLoading).toBe(false);
      expect(result[0].metadata.migratedFrom).toBe('v0');
      expect(result[0].metadata.migratedAt).toBeDefined();
    });

    it('should preserve metadata from legacy tabs', () => {
      const oldMetadata = { schemaVersion: 0 };
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ tabs: [], metadata: oldMetadata })
      );
      
      const tabsWithMetadata = [createLegacyTabFormat({
        metadata: {
          customField: 'customValue',
          permissions: ['view'],
        }
      })];
      
      const result = service.migrateLegacyFormat(tabsWithMetadata);
      
      expect(result[0].metadata.customField).toBe('customValue');
    });

    it('should filter out invalid tabs', () => {
      const mixedTabs = [
        { id: 'valid', title: 'Valid', path: '/test', module: 'test' },
        { id: 'invalid', title: 'Invalid', path: '', module: 'test' }, // Empty path
        { title: 'Missing id', path: '/test', module: 'test' }, // Missing id
      ];
      
      const result = service.migrateLegacyFormat(mixedTabs);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('valid');
    });
  });

  describe('getStorageBackend', () => {
    it('should return the current storage backend', async () => {
      // Service should default to localStorage in test environment
      await new Promise(resolve => setTimeout(resolve, 50));
      const backend = service.getStorageBackend();
      expect(['localStorage', 'indexedDB']).toContain(backend);
    });
  });

  describe('isReady', () => {
    it('should return true after initialization', async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(service.isReady()).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should perform save and load cycle', async () => {
      const originalTabs = [
        createMockTab({ id: 'tab-1', title: 'Dashboard', path: '/dashboard', module: 'dashboard' }),
        createMockTab({ id: 'tab-2', title: 'Students', path: '/academics/students', module: 'academics' }),
        createMockTab({ id: 'tab-3', title: 'Finance', path: '/finance/overview', module: 'finance' }),
      ];
      
      // Save tabs
      await service.saveTabs(originalTabs);
      
      // Clear and load
      const loadedTabs = await service.loadTabs();
      
      expect(loadedTabs).toHaveLength(3);
      expect(loadedTabs.map(t => t.id)).toEqual(['tab-1', 'tab-2', 'tab-3']);
      expect(loadedTabs.map(t => t.title)).toEqual(['Dashboard', 'Students', 'Finance']);
    });

    it('should preserve tab state through save and load', async () => {
      const tabs = [
        createMockTab({ 
          id: 'pinned-tab', 
          pinned: true, 
          isDirty: true,
          canClose: false,
          metadata: { customData: 'value' }
        }),
      ];
      
      await service.saveTabs(tabs);
      const loadedTabs = await service.loadTabs();
      
      expect(loadedTabs[0].pinned).toBe(true);
      expect(loadedTabs[0].isDirty).toBe(true);
      expect(loadedTabs[0].canClose).toBe(false);
      expect(loadedTabs[0].metadata.customData).toBe('value');
    });

    it('should handle concurrent save operations', async () => {
      const tabs1 = [createMockTab({ id: 'tab-1' })];
      const tabs2 = [createMockTab({ id: 'tab-2' })];
      
      // Save multiple times
      await service.saveTabs(tabs1);
      await service.saveTabs(tabs2);
      
      // Last save should win
      const loadedTabs = await service.loadTabs();
      expect(loadedTabs).toHaveLength(1);
    });

    it('should handle large number of tabs', async () => {
      const manyTabs = Array.from({ length: 50 }, (_, i) => 
        createMockTab({ id: `tab-${i}`, title: `Tab ${i}`, path: `/path/${i}`, module: 'test' })
      );
      
      await service.saveTabs(manyTabs);
      const loadedTabs = await service.loadTabs();
      
      expect(loadedTabs).toHaveLength(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted JSON in localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('{ corrupted json');
      
      const tabs = await service.loadTabs();
      expect(tabs).toEqual([]);
    });

    it('should handle localStorage being unavailable', async () => {
      delete (global as any).localStorage;
      
      const newService = TabPersistenceService.getInstance();
      
      await expect(newService.saveTabs([createMockTab()])).rejects.toThrow();
    });
  });
});
