/**
 * Comprehensive test suite for TabValidationService
 * Tests tab validation, access control, permissions, and data sanitization
 */

import { TabValidationService, tabValidationService, RoleAccessConfig } from '../TabValidationService';
import { Tab, TabState } from '../../../types/tabbedWorkspace';

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

const createMockTabState = (overrides: Partial<TabState> = {}): TabState => ({
  scrollPosition: 0,
  ...overrides,
});

describe('TabValidationService', () => {
  let service: TabValidationService;

  beforeEach(() => {
    // Reset singleton state
    (TabValidationService as any).instance = null;
    service = TabValidationService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TabValidationService.getInstance();
      const instance2 = TabValidationService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export a singleton instance', () => {
      expect(tabValidationService).toBeDefined();
      expect(tabValidationService).toBeInstanceOf(TabValidationService);
    });
  });

  describe('validateTabAccess', () => {
    describe('with admin role', () => {
      it('should allow access for admin role with wildcard permission', () => {
        const result = service.validateTabAccess('tab-1', 'admin', ['*']);
        expect(result).toBe(true);
      });

      it('should allow access for admin role with admin permission', () => {
        const result = service.validateTabAccess('tab-1', 'admin', ['admin']);
        expect(result).toBe(true);
      });

      it('should allow access for admin role regardless of other permissions', () => {
        const result = service.validateTabAccess('tab-1', 'admin', ['read']);
        expect(result).toBe(true);
      });
    });

    describe('with teacher role', () => {
      it('should allow access for teacher role with allowed module permissions', () => {
        const result = service.validateTabAccess('tab-1', 'teacher', ['academics']);
        expect(result).toBe(true);
      });

      it('should return true for any tab access check (simplified validation)', () => {
        // The current implementation returns true for any valid role
        const result = service.validateTabAccess('tab-1', 'teacher', []);
        expect(result).toBe(true);
      });
    });

    describe('with unknown role', () => {
      it('should deny access for unknown role', () => {
        const result = service.validateTabAccess('tab-1', 'unknown_role', []);
        expect(result).toBe(false);
      });
    });

    describe('with invalid tabId', () => {
      it('should return false for empty tabId', () => {
        const result = service.validateTabAccess('', 'admin', ['*']);
        expect(result).toBe(false);
      });

      it('should return false for null tabId', () => {
        const result = service.validateTabAccess(null as any, 'admin', ['*']);
        expect(result).toBe(false);
      });

      it('should return false for undefined tabId', () => {
        const result = service.validateTabAccess(undefined as any, 'admin', ['*']);
        expect(result).toBe(false);
      });
    });
  });

  describe('validateTabCreation', () => {
    const existingTabs: Tab[] = [];

    describe('with valid tab', () => {
      it('should return valid result for valid new tab', () => {
        const newTab: Partial<Tab> = {
          title: 'New Tab',
          path: '/new/path',
          module: 'test',
        };
        
        const result = service.validateTabCreation(existingTabs, newTab, 20);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return valid result with maximum tabs at limit', () => {
        const tabs = Array.from({ length: 19 }, (_, i) => 
          createMockTab({ id: `tab-${i}` })
        );
        
        const newTab: Partial<Tab> = {
          title: 'New Tab',
          path: '/new/path',
          module: 'test',
        };
        
        const result = service.validateTabCreation(tabs, newTab, 20);
        
        expect(result.valid).toBe(true);
      });
    });

    describe('with maximum tabs reached', () => {
      it('should return error when tab limit is reached', () => {
        const tabs = Array.from({ length: 20 }, (_, i) => 
          createMockTab({ id: `tab-${i}` })
        );
        
        const newTab: Partial<Tab> = {
          title: 'New Tab',
          path: '/new/path',
          module: 'test',
        };
        
        const result = service.validateTabCreation(tabs, newTab, 20);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Maximum tab limit (20) reached. Please close some tabs first.');
      });
    });

    describe('with missing required fields', () => {
      it('should return error when title is missing', () => {
        const newTab: Partial<Tab> = {
          path: '/new/path',
          module: 'test',
        };
        
        const result = service.validateTabCreation(existingTabs, newTab, 20);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tab title is required and cannot be empty.');
      });

      it('should return error when title is empty string', () => {
        const newTab: Partial<Tab> = {
          title: '',
          path: '/new/path',
          module: 'test',
        };
        
        const result = service.validateTabCreation(existingTabs, newTab, 20);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tab title is required and cannot be empty.');
      });

      it('should return error when title is whitespace only', () => {
        const newTab: Partial<Tab> = {
          title: '   ',
          path: '/new/path',
          module: 'test',
        };
        
        const result = service.validateTabCreation(existingTabs, newTab, 20);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tab title is required and cannot be empty.');
      });

      it('should return error when path is missing', () => {
        const newTab: Partial<Tab> = {
          title: 'New Tab',
          module: 'test',
        };
        
        const result = service.validateTabCreation(existingTabs, newTab, 20);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tab path is required and cannot be empty.');
      });

      it('should return error when module is missing', () => {
        const newTab: Partial<Tab> = {
          title: 'New Tab',
          path: '/new/path',
        };
        
        const result = service.validateTabCreation(existingTabs, newTab, 20);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tab module is required and cannot be empty.');
      });
    });

    describe('with duplicate tab', () => {
      it('should return warning when tab with same path exists and is not dirty', () => {
        const existingTabs = [
          createMockTab({ id: 'existing-tab', path: '/students', isDirty: false }),
        ];
        
        const newTab: Partial<Tab> = {
          title: 'New Tab',
          path: '/students',
          module: 'academics',
        };
        
        const result = service.validateTabCreation(existingTabs, newTab, 20);
        
        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('A tab with this path already exists and is not dirty.');
      });

      it('should not return warning when existing tab is dirty', () => {
        const existingTabs = [
          createMockTab({ id: 'existing-tab', path: '/students', isDirty: true }),
        ];
        
        const newTab: Partial<Tab> = {
          title: 'New Tab',
          path: '/students',
          module: 'academics',
        };
        
        const result = service.validateTabCreation(existingTabs, newTab, 20);
        
        expect(result.warnings).not.toContain('A tab with this path already exists and is not dirty.');
      });
    });

    describe('with path format validation', () => {
      it('should return warning when path does not start with /', () => {
        const newTab: Partial<Tab> = {
          title: 'New Tab',
          path: 'no-leading-slash',
          module: 'test',
        };
        
        const result = service.validateTabCreation(existingTabs, newTab, 20);
        
        expect(result.warnings).toContain('Tab path should start with a forward slash (/) for consistency.');
      });
    });

    describe('with metadata validation', () => {
      it('should return error when metadata is not an object', () => {
        const newTab: Partial<Tab> = {
          title: 'New Tab',
          path: '/new/path',
          module: 'test',
          metadata: 'invalid' as any,
        };
        
        const result = service.validateTabCreation(existingTabs, newTab, 20);
        
        expect(result.errors).toContain('Tab metadata must be a valid object.');
      });
    });
  });

  describe('validateTabState', () => {
    describe('with valid tab', () => {
      it('should return valid result for complete tab', () => {
        const tab = createMockTab();
        
        const result = service.validateTabState(tab);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept valid tab with all optional fields', () => {
        const tab = createMockTab({
          pinned: true,
          isDirty: true,
          canClose: false,
          icon: 'test-icon',
          badge: '5',
          permissions: ['read', 'write'],
          userRole: 'admin',
        });
        
        const result = service.validateTabState(tab);
        
        expect(result.valid).toBe(true);
      });
    });

    describe('with missing required fields', () => {
      it('should return error when id is missing', () => {
        const tab = {
          title: 'Test',
          path: '/test',
          module: 'test',
        } as any;
        
        const result = service.validateTabState(tab);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tab must have a valid string ID.');
      });

      it('should return error when title is missing', () => {
        const tab = {
          id: 'tab-1',
          path: '/test',
          module: 'test',
        } as any;
        
        const result = service.validateTabState(tab);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tab must have a valid title string.');
      });

      it('should return error when path is missing', () => {
        const tab = {
          id: 'tab-1',
          title: 'Test',
          module: 'test',
        } as any;
        
        const result = service.validateTabState(tab);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tab must have a valid path string.');
      });

      it('should return error when module is missing', () => {
        const tab = {
          id: 'tab-1',
          title: 'Test',
          path: '/test',
        } as any;
        
        const result = service.validateTabState(tab);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tab must have a valid module string.');
      });
    });

    describe('with invalid boolean fields', () => {
      it('should return warning when pinned is not boolean', () => {
        const tab = {
          ...createMockTab(),
          pinned: 'true' as any,
        };
        
        const result = service.validateTabState(tab);
        
        expect(result.warnings).toContain('Tab pinned state should be explicitly set. Defaulting to false.');
      });

      it('should return warning when isDirty is not boolean', () => {
        const tab = {
          ...createMockTab(),
          isDirty: 1 as any,
        };
        
        const result = service.validateTabState(tab);
        
        expect(result.warnings).toContain('Tab dirty state should be explicitly set. Defaulting to false.');
      });

      it('should return warning when canClose is not boolean', () => {
        const tab = {
          ...createMockTab(),
          canClose: 'yes' as any,
        };
        
        const result = service.validateTabState(tab);
        
        expect(result.warnings).toContain('Tab canClose should be explicitly set. Defaulting to true.');
      });
    });

    describe('with invalid lastAccessed timestamp', () => {
      it('should return error when lastAccessed is not a positive number', () => {
        const tab = {
          ...createMockTab(),
          lastAccessed: -1,
        };
        
        const result = service.validateTabState(tab);
        
        expect(result.errors).toContain('Tab must have a valid lastAccessed timestamp (positive number).');
      });

      it('should return error when lastAccessed is zero', () => {
        const tab = {
          ...createMockTab(),
          lastAccessed: 0,
        };
        
        const result = service.validateTabState(tab);
        
        expect(result.errors).toContain('Tab must have a valid lastAccessed timestamp (positive number).');
      });
    });

    describe('with metadata validation', () => {
      it('should return warning when metadata is undefined', () => {
        const tab: Tab = {
          ...createMockTab(),
          metadata: {} as any,
        };
        // @ts-ignore - testing with undefined metadata
        delete tab.metadata;
        
        const result = service.validateTabState(tab);
        
        expect(result.warnings).toContain('Tab metadata should be defined. Defaulting to empty object.');
      });

      it('should return error when metadata is not an object', () => {
        const tab = {
          ...createMockTab(),
          metadata: 'invalid' as any,
        };
        
        const result = service.validateTabState(tab);
        
        expect(result.errors).toContain('Tab metadata must be a valid object.');
      });
    });

    describe('with permissions validation', () => {
      it('should return error when permissions is not an array', () => {
        const tab = {
          ...createMockTab(),
          permissions: 'read,write' as any,
        };
        
        const result = service.validateTabState(tab);
        
        expect(result.errors).toContain('Tab permissions must be an array.');
      });

      it('should return error when permissions contains non-strings', () => {
        const tab = {
          ...createMockTab(),
          permissions: ['read', 123] as any,
        };
        
        const result = service.validateTabState(tab);
        
        expect(result.errors).toContain('All tab permissions must be strings.');
      });
    });

    describe('with TabState validation', () => {
      it('should accept valid tab state', () => {
        const tab = createMockTab({
          state: createMockTabState({
            scrollPosition: 100,
            viewMode: 'list',
            searchQuery: 'test',
          }),
        });
        
        const result = service.validateTabState(tab);
        
        expect(result.valid).toBe(true);
      });

      it('should return warning for invalid scrollPosition', () => {
        const tab = createMockTab({
          state: {
            scrollPosition: -5,
          } as any,
        });
        
        const result = service.validateTabState(tab);
        
        expect(result.warnings).toContain('TabState scrollPosition should be a non-negative number.');
      });

      it('should return error for invalid formData', () => {
        const tab = createMockTab({
          state: {
            formData: 'not an object',
          } as any,
        });
        
        const result = service.validateTabState(tab);
        
        expect(result.errors).toContain('TabState formData must be a valid object if provided.');
      });

      it('should return error for invalid filters', () => {
        const tab = createMockTab({
          state: {
            filters: 123,
          } as any,
        });
        
        const result = service.validateTabState(tab);
        
        expect(result.errors).toContain('TabState filters must be a valid object if provided.');
      });

      it('should return error for invalid selectedItems', () => {
        const tab = createMockTab({
          state: {
            selectedItems: 'not an array',
          } as any,
        });
        
        const result = service.validateTabState(tab);
        
        expect(result.errors).toContain('TabState selectedItems must be an array if provided.');
      });

      it('should return warning for invalid viewMode', () => {
        const tab = createMockTab({
          state: {
            viewMode: 'invalid',
          } as any,
        });
        
        const result = service.validateTabState(tab);
        
        expect(result.warnings).toContain('TabState viewMode should be one of: list, grid, kanban.');
      });

      it('should return warning for invalid sortOrder', () => {
        const tab = createMockTab({
          state: {
            sortOrder: 'invalid',
          } as any,
        });
        
        const result = service.validateTabState(tab);
        
        expect(result.warnings).toContain('TabState sortOrder should be one of: asc, desc.');
      });
    });
  });

  describe('validatePermissions', () => {
    it('should return true when no permissions required', () => {
      const result = service.validatePermissions([], ['read', 'write']);
      expect(result).toBe(true);
    });

    it('should return true when user has wildcard permission', () => {
      const result = service.validatePermissions(['read'], ['*']);
      expect(result).toBe(true);
    });

    it('should return true when user has admin permission', () => {
      const result = service.validatePermissions(['read'], ['admin']);
      expect(result).toBe(true);
    });

    it('should return true when user has all required permissions', () => {
      const result = service.validatePermissions(['read', 'write'], ['read', 'write', 'delete']);
      expect(result).toBe(true);
    });

    it('should return false when user is missing required permissions', () => {
      const result = service.validatePermissions(['read', 'write'], ['read']);
      expect(result).toBe(false);
    });

    it('should return false when user has no permissions', () => {
      const result = service.validatePermissions(['read'], []);
      expect(result).toBe(false);
    });
  });

  describe('filterAccessibleTabs', () => {
    const tabs: Tab[] = [
      createMockTab({ id: 'tab-1', module: 'academics' }),
      createMockTab({ id: 'tab-2', module: 'finance' }),
      createMockTab({ id: 'tab-3', module: 'settings' }),
      createMockTab({ id: 'tab-4', module: 'students' }),
    ];

    describe('with admin role', () => {
      it('should return all tabs for admin with wildcard permission', () => {
        const result = service.filterAccessibleTabs(tabs, 'admin', ['*']);
        expect(result).toHaveLength(4);
      });

      it('should return all tabs for admin with admin permission', () => {
        const result = service.filterAccessibleTabs(tabs, 'admin', ['admin']);
        expect(result).toHaveLength(4);
      });
    });

    describe('with teacher role', () => {
      it('should filter tabs by allowed modules', () => {
        const result = service.filterAccessibleTabs(tabs, 'teacher', []);
        
        // Teacher role has access to: academics, students, attendance, assignments, grades
        expect(result.some(t => t.module === 'academics')).toBe(true);
        expect(result.some(t => t.module === 'students')).toBe(true);
        expect(result.some(t => t.module === 'finance')).toBe(false);
        expect(result.some(t => t.module === 'settings')).toBe(false);
      });
    });

    describe('with finance role', () => {
      it('should filter tabs by allowed modules', () => {
        const result = service.filterAccessibleTabs(tabs, 'finance', []);
        
        // Finance role has access to: finance, fees, payments, accounts
        expect(result.some(t => t.module === 'finance')).toBe(true);
        expect(result.some(t => t.module === 'academics')).toBe(false);
      });
    });

    describe('with unknown role', () => {
      it('should return empty array for unknown role', () => {
        const result = service.filterAccessibleTabs(tabs, 'unknown_role', []);
        expect(result).toHaveLength(0);
      });
    });

    describe('with no role provided', () => {
      it('should return empty array', () => {
        const result = service.filterAccessibleTabs(tabs, '', []);
        expect(result).toHaveLength(0);
      });
    });

    describe('with tab-specific permissions', () => {
      it('should filter by tab permissions when present', () => {
        const tabsWithPermissions: Tab[] = [
          createMockTab({ id: 'tab-1', module: 'academics', permissions: ['view_students'] }),
          createMockTab({ id: 'tab-2', module: 'academics', permissions: [] }),
        ];
        
        const result = service.filterAccessibleTabs(tabsWithPermissions, 'teacher', ['view_students']);
        
        expect(result).toHaveLength(2); // Both accessible - one has matching permission, one has none
      });

      it('should filter out tabs when user lacks required permissions', () => {
        const tabsWithPermissions: Tab[] = [
          createMockTab({ id: 'tab-1', module: 'academics', permissions: ['admin_access'] }),
          createMockTab({ id: 'tab-2', module: 'academics' }),
        ];
        
        const result = service.filterAccessibleTabs(tabsWithPermissions, 'teacher', ['view_students']);
        
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('tab-2');
      });
    });

    describe('with empty tabs array', () => {
      it('should return empty array', () => {
        const result = service.filterAccessibleTabs([], 'admin', ['*']);
        expect(result).toHaveLength(0);
      });
    });
  });

  describe('sanitizeTabData', () => {
    it('should generate ID when not provided', () => {
      const result = service.sanitizeTabData({});
      
      expect(result.id).toMatch(/^tab_\d+_/);
    });

    it('should use provided ID when given', () => {
      const result = service.sanitizeTabData({ id: 'custom-id' });
      
      expect(result.id).toBe('custom-id');
    });

    it('should sanitize title with trimming', () => {
      const result = service.sanitizeTabData({ title: '  Test Title  ' });
      
      expect(result.title).toBe('Test Title');
    });

    it('should use default title when not provided', () => {
      const result = service.sanitizeTabData({});
      
      expect(result.title).toBe('Untitled');
    });

    it('should sanitize path with trimming', () => {
      const result = service.sanitizeTabData({ path: '  /test/path  ' });
      
      expect(result.path).toBe('/test/path');
    });

    it('should use generated path when not provided', () => {
      const result = service.sanitizeTabData({});
      
      expect(result.path).toMatch(/^\/untitled-/);
    });

    it('should sanitize module with trimming', () => {
      const result = service.sanitizeTabData({ module: '  test  ' });
      
      expect(result.module).toBe('test');
    });

    it('should use unknown module when not provided', () => {
      const result = service.sanitizeTabData({});
      
      expect(result.module).toBe('unknown');
    });

    it('should default pinned to false', () => {
      const result = service.sanitizeTabData({});
      
      expect(result.pinned).toBe(false);
    });

    it('should default isDirty to false', () => {
      const result = service.sanitizeTabData({});
      
      expect(result.isDirty).toBe(false);
    });

    it('should default canClose to true', () => {
      const result = service.sanitizeTabData({});
      
      expect(result.canClose).toBe(true);
    });

    it('should use provided timestamp', () => {
      const timestamp = Date.now() - 1000;
      const result = service.sanitizeTabData({ lastAccessed: timestamp });
      
      expect(result.lastAccessed).toBe(timestamp);
    });

    it('should use current time when timestamp not provided', () => {
      const before = Date.now();
      const result = service.sanitizeTabData({});
      const after = Date.now();
      
      expect(result.lastAccessed).toBeGreaterThanOrEqual(before);
      expect(result.lastAccessed).toBeLessThanOrEqual(after);
    });

    it('should use current time for invalid timestamp', () => {
      const result = service.sanitizeTabData({ lastAccessed: -1 });
      
      expect(result.lastAccessed).toBeGreaterThan(0);
    });

    it('should sanitize metadata', () => {
      const result = service.sanitizeTabData({ metadata: { key: 'value' } });
      
      expect(result.metadata).toEqual({ key: 'value' });
    });

    it('should use empty object when metadata not provided', () => {
      const result = service.sanitizeTabData({});
      
      expect(result.metadata).toEqual({});
    });

    it('should sanitize permissions array', () => {
      const result = service.sanitizeTabData({ permissions: ['read', 'write', 123, null] as any });
      
      expect(result.permissions).toEqual(['read', 'write']);
    });

    it('should use empty array when permissions not provided', () => {
      const result = service.sanitizeTabData({});
      
      expect(result.permissions).toEqual([]);
    });

    it('should sanitize tab state', () => {
      const state: Partial<TabState> = {
        scrollPosition: 100,
        viewMode: 'grid',
        searchQuery: 'test',
      };
      
      const result = service.sanitizeTabData({ state: state as TabState });
      
      expect(result.state).toEqual({
        scrollPosition: 100,
        viewMode: 'grid',
        searchQuery: 'test',
      });
    });

    it('should filter invalid viewMode', () => {
      const result = service.sanitizeTabData({ 
        state: { viewMode: 'invalid' } as any 
      });
      
      expect(result.state?.viewMode).toBeUndefined();
    });

    it('should filter invalid sortOrder', () => {
      const result = service.sanitizeTabData({ 
        state: { sortOrder: 'invalid' } as any 
      });
      
      expect(result.state?.sortOrder).toBeUndefined();
    });
  });

  describe('Role Configuration', () => {
    describe('getRoleConfig', () => {
      it('should return config for admin role', () => {
        const config = service.getRoleConfig('admin');
        
        expect(config).toBeDefined();
        expect(config?.role).toBe('admin');
        expect(config?.allowedModules).toContain('*');
      });

      it('should return config for teacher role', () => {
        const config = service.getRoleConfig('teacher');
        
        expect(config).toBeDefined();
        expect(config?.role).toBe('teacher');
        expect(config?.allowedModules).toContain('academics');
      });

      it('should return undefined for unknown role', () => {
        const config = service.getRoleConfig('unknown_role');
        
        expect(config).toBeUndefined();
      });
    });

    describe('getAllRoleConfigs', () => {
      it('should return all role configs', () => {
        const configs = service.getAllRoleConfigs();
        
        expect(Object.keys(configs)).toContain('admin');
        expect(Object.keys(configs)).toContain('teacher');
        expect(Object.keys(configs)).toContain('finance');
        expect(Object.keys(configs)).toContain('student');
        expect(Object.keys(configs)).toContain('parent');
      });
    });

    describe('setRoleConfig', () => {
      it('should add new role config', () => {
        const newConfig: RoleAccessConfig = {
          role: 'custom_role',
          allowedModules: ['custom'],
          maxTabs: 15,
        };
        
        service.setRoleConfig(newConfig);
        const config = service.getRoleConfig('custom_role');
        
        expect(config).toEqual(newConfig);
      });

      it('should update existing role config', () => {
        const updatedConfig: RoleAccessConfig = {
          role: 'teacher',
          allowedModules: ['custom'],
          maxTabs: 50,
        };
        
        service.setRoleConfig(updatedConfig);
        const config = service.getRoleConfig('teacher');
        
        expect(config?.allowedModules).toEqual(['custom']);
        expect(config?.maxTabs).toBe(50);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should validate and filter tabs in workflow', async () => {
      const tabs: Tab[] = [
        createMockTab({ id: 'tab-1', title: 'Dashboard', path: '/dashboard', module: 'dashboard', pinned: true }),
        createMockTab({ id: 'tab-2', title: 'Students', path: '/academics/students', module: 'academics' }),
        createMockTab({ id: 'tab-3', title: 'Finance', path: '/finance/overview', module: 'finance' }),
        createMockTab({ id: 'tab-4', title: 'Settings', path: '/settings', module: 'settings' }),
      ];

      // Validate each tab
      for (const tab of tabs) {
        const validation = service.validateTabState(tab);
        expect(validation.valid).toBe(true);
      }

      // Filter accessible tabs for teacher
      const accessibleTabs = service.filterAccessibleTabs(tabs, 'teacher', []);
      
      expect(accessibleTabs.some(t => t.module === 'academics')).toBe(true);
      expect(accessibleTabs.some(t => t.module === 'finance')).toBe(false);
    });

    it('should sanitize and validate new tab creation', () => {
      const userInput = {
        title: '  New Student  ',
        path: '/academics/students/new',
        module: '  academics  ',
      };

      const sanitized = service.sanitizeTabData(userInput);
      const validation = service.validateTabState(sanitized);

      expect(sanitized.title).toBe('New Student');
      expect(sanitized.module).toBe('academics');
      expect(validation.valid).toBe(true);
    });
  });
});
