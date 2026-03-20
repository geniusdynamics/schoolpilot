/**
 * Comprehensive test suite for RouteToTabMapper
 * Tests route-to-tab mapping, path normalization, and navigation item resolution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  RouteToTabMapper, 
  routeToTabMapper,
  NavigationItem,
  BuildTabOptions 
} from '../RouteToTabMapper';
import { Tab } from '../../../types/tabbedWorkspace';

// Test data helpers
const createMockNavigationItem = (overrides: Partial<NavigationItem> = {}): NavigationItem => ({
  name: 'Test Item',
  path: '/test/path',
  module: 'test',
  ...overrides,
});

describe('RouteToTabMapper', () => {
  let mapper: RouteToTabMapper;

  beforeEach(() => {
    // Create new instance for each test
    mapper = new RouteToTabMapper();
  });

  describe('Singleton Export', () => {
    it('should export a singleton instance', () => {
      expect(routeToTabMapper).toBeDefined();
      expect(routeToTabMapper).toBeInstanceOf(RouteToTabMapper);
    });
  });

  describe('resolveNavigationItem', () => {
    const navigationConfig: NavigationItem[] = [
      {
        name: 'Dashboard',
        path: '/dashboard',
        module: 'dashboard',
        icon: 'dashboard-icon',
      },
      {
        name: 'Academics',
        path: '/academics',
        module: 'academics',
        children: [
          {
            name: 'Students',
            path: '/academics/students',
            module: 'academics',
          },
          {
            name: 'Teachers',
            path: '/academics/teachers',
            module: 'academics',
          },
        ],
      },
      {
        name: 'Finance',
        path: '/finance',
        module: 'finance',
      },
      {
        name: 'Settings',
        path: '/settings',
        module: 'settings',
      },
    ];

    describe('with exact match', () => {
      it('should find exact match in root items', () => {
        const result = mapper.resolveNavigationItem('/dashboard', navigationConfig);
        
        expect(result).not.toBeNull();
        expect(result?.name).toBe('Dashboard');
        expect(result?.path).toBe('/dashboard');
      });

      it('should find exact match in nested children', () => {
        const result = mapper.resolveNavigationItem('/academics/students', navigationConfig);
        
        expect(result).not.toBeNull();
        expect(result?.name).toBe('Students');
        expect(result?.path).toBe('/academics/students');
      });

      it('should be case-insensitive', () => {
        const result = mapper.resolveNavigationItem('/DASHBOARD', navigationConfig);
        
        expect(result).not.toBeNull();
        expect(result?.name).toBe('Dashboard');
      });

      it('should handle paths with different casing', () => {
        const result = mapper.resolveNavigationItem('/Academics/Students', navigationConfig);
        
        expect(result).not.toBeNull();
        expect(result?.name).toBe('Students');
      });
    });

    describe('with parameterized routes', () => {
      it('should find parameterized match', () => {
        const configWithParam: NavigationItem[] = [
          {
            name: 'Student Details',
            path: '/academics/students/:id',
            module: 'academics',
          },
        ];
        
        const result = mapper.resolveNavigationItem('/academics/students/123', configWithParam);
        
        expect(result).not.toBeNull();
        expect(result?.name).toBe('Student Details');
      });

      it('should find parameterized match in nested children', () => {
        const configWithNestedParam: NavigationItem[] = [
          {
            name: 'Academics',
            path: '/academics',
            children: [
              {
                name: 'Student Details',
                path: '/academics/students/:id',
                module: 'academics',
              },
            ],
          },
        ];
        
        const result = mapper.resolveNavigationItem('/academics/students/456', configWithNestedParam);
        
        expect(result).not.toBeNull();
        expect(result?.name).toBe('Student Details');
      });
    });

    describe('with prefix matching', () => {
      it('should find prefix match for parent route', () => {
        const result = mapper.resolveNavigationItem('/academics/students/list', navigationConfig);
        
        expect(result).not.toBeNull();
        expect(result?.name).toBe('Academics');
      });

      it('should prefer exact match over prefix match', () => {
        const result = mapper.resolveNavigationItem('/academics', navigationConfig);
        
        expect(result).not.toBeNull();
        expect(result?.name).toBe('Academics');
        expect(result?.path).toBe('/academics');
      });
    });

    describe('with invalid input', () => {
      it('should return null for empty path', () => {
        const result = mapper.resolveNavigationItem('', navigationConfig);
        
        expect(result).toBeNull();
      });

      it('should return null for null path', () => {
        const result = mapper.resolveNavigationItem(null as any, navigationConfig);
        
        expect(result).toBeNull();
      });

      it('should return null for undefined path', () => {
        const result = mapper.resolveNavigationItem(undefined as any, navigationConfig);
        
        expect(result).toBeNull();
      });

      it('should return null for empty navigation config', () => {
        const result = mapper.resolveNavigationItem('/test', []);
        
        expect(result).toBeNull();
      });

      it('should return null for null navigation config', () => {
        const result = mapper.resolveNavigationItem('/test', null as any);
        
        expect(result).toBeNull();
      });

      it('should return null for non-matching path', () => {
        const result = mapper.resolveNavigationItem('/nonexistent', navigationConfig);
        
        expect(result).toBeNull();
      });
    });
  });

  describe('parseRouteParams', () => {
    describe('with simple parameterized routes', () => {
      it('should parse single parameter', () => {
        const params = mapper.parseRouteParams('/students/123', '/students/:id');
        
        expect(params).toEqual({ id: '123' });
      });

      it('should parse multiple parameters', () => {
        const params = mapper.parseRouteParams('/students/123/edit/details', '/students/:id/edit/:tab');
        
        expect(params).toEqual({ id: '123', tab: 'details' });
      });

      it('should return empty object for non-matching paths', () => {
        const params = mapper.parseRouteParams('/students/123', '/teachers/:id');
        
        expect(params).toEqual({});
      });
    });

    describe('with wildcard routes', () => {
      it('should parse wildcard at end', () => {
        const params = mapper.parseRouteParams('/students/123/extra/path', '/students/:id/*');
        
        expect(params.id).toBe('123');
        expect(params['']).toBe('extra/path');
      });

      it('should parse named wildcard', () => {
        const params = mapper.parseRouteParams('/api/v1/users/list', '/api/*/users/:action');
        
        expect(params.action).toBe('list');
      });
    });

    describe('with different segment counts', () => {
      it('should handle path with more segments than pattern', () => {
        const params = mapper.parseRouteParams('/students/123/edit', '/students/:id');
        
        // Should still extract the id
        expect(params.id).toBe('123');
      });
    });

    describe('with case normalization', () => {
      it('should normalize path case', () => {
        const params = mapper.parseRouteParams('/STUDENTS/123', '/students/:id');
        
        expect(params).toEqual({ id: '123' });
      });
    });

    describe('with empty input', () => {
      it('should return empty object for empty path', () => {
        const params = mapper.parseRouteParams('', '/students/:id');
        
        expect(params).toEqual({});
      });

      it('should return empty object for empty pattern', () => {
        const params = mapper.parseRouteParams('/students/123', '');
        
        expect(params).toEqual({});
      });
    });
  });

  describe('buildTabFromRoute', () => {
    const navigationItem: NavigationItem = {
      name: 'Students',
      path: '/academics/students',
      module: 'academics',
      icon: 'students-icon',
      page: 'students-list',
      permissions: ['view_students'],
    };

    describe('with basic input', () => {
      it('should build tab from route and navigation item', () => {
        const tab = mapper.buildTabFromRoute('/academics/students', navigationItem);
        
        expect(tab.id).toBeDefined();
        expect(tab.title).toBe('Students');
        expect(tab.path).toBe('/academics/students');
        expect(tab.module).toBe('academics');
        expect(tab.icon).toBe('students-icon');
        expect(tab.pinned).toBe(false);
        expect(tab.isDirty).toBe(false);
        expect(tab.canClose).toBe(true);
      });

      it('should include navigation item info in metadata', () => {
        const tab = mapper.buildTabFromRoute('/academics/students', navigationItem);
        
        expect(tab.metadata?.createdFrom).toBe('route');
        expect((tab.metadata?.navigationItem as any)?.name).toBe('Students');
        expect((tab.metadata?.navigationItem as any)?.path).toBe('/academics/students');
      });
    });

    describe('with options', () => {
      it('should apply custom title option', () => {
        const options: BuildTabOptions = { title: 'Custom Title' };
        
        const tab = mapper.buildTabFromRoute('/academics/students', navigationItem, options);
        
        expect(tab.title).toBe('Custom Title');
      });

      it('should apply pinned option', () => {
        const options: BuildTabOptions = { pinned: true };
        
        const tab = mapper.buildTabFromRoute('/academics/students', navigationItem, options);
        
        expect(tab.pinned).toBe(true);
      });

      it('should apply canClose option', () => {
        const options: BuildTabOptions = { canClose: false };
        
        const tab = mapper.buildTabFromRoute('/academics/students', navigationItem, options);
        
        expect(tab.canClose).toBe(false);
      });

      it('should apply metadata option', () => {
        const options: BuildTabOptions = { 
          metadata: { customKey: 'customValue' } 
        };
        
        const tab = mapper.buildTabFromRoute('/academics/students', navigationItem, options);
        
        expect(tab.metadata?.customKey).toBe('customValue');
        expect(tab.metadata?.createdFrom).toBe('route');
      });
    });

    describe('with path normalization', () => {
      it('should normalize path with trailing slash', () => {
        const tab = mapper.buildTabFromRoute('/academics/students/', navigationItem);
        
        expect(tab.path).toBe('/academics/students');
      });

      it('should normalize path with double slashes', () => {
        const tab = mapper.buildTabFromRoute('/academics//students', navigationItem);
        
        expect(tab.path).toBe('/academics/students');
      });

      it('should normalize uppercase path', () => {
        const tab = mapper.buildTabFromRoute('/ACADEMICS/STUDENTS', navigationItem);
        
        expect(tab.path).toBe('/academics/students');
      });

      it('should handle backslashes', () => {
        const tab = mapper.buildTabFromRoute('\\academics\\students', navigationItem);
        
        expect(tab.path).toBe('/academics/students');
      });

      it('should handle query strings', () => {
        const tab = mapper.buildTabFromRoute('/academics/students?page=1', navigationItem);
        
        expect(tab.path).toBe('/academics/students');
      });

      it('should handle hash fragments', () => {
        const tab = mapper.buildTabFromRoute('/academics/students#section', navigationItem);
        
        expect(tab.path).toBe('/academics/students');
      });
    });

    describe('with empty input', () => {
      it('should return empty object for empty path', () => {
        const tab = mapper.buildTabFromRoute('', navigationItem);
        
        expect(tab).toEqual({});
      });

      it('should handle navigation item without module', () => {
        const itemWithoutModule = { name: 'Test', path: '/test' };
        
        const tab = mapper.buildTabFromRoute('/test', itemWithoutModule as NavigationItem);
        
        expect(tab.module).toBe('unknown');
      });
    });

    describe('with permission handling', () => {
      it('should include permissions from navigation item', () => {
        const tab = mapper.buildTabFromRoute('/academics/students', navigationItem);
        
        expect(tab.permissions).toEqual(['view_students']);
      });

      it('should not include permissions when not provided', () => {
        const itemWithoutPermissions: NavigationItem = {
          name: 'Test',
          path: '/test',
        };
        
        const tab = mapper.buildTabFromRoute('/test', itemWithoutPermissions);
        
        expect(tab.permissions).toBeUndefined();
      });
    });
  });

  describe('matchRoute', () => {
    const patterns = [
      '/dashboard',
      '/academics',
      '/academics/students',
      '/academics/students/:id',
      '/finance',
      '/finance/invoices',
      '/finance/invoices/:id',
      '/settings',
      '/settings/*',
    ];

    describe('with exact match', () => {
      it('should match exact pattern', () => {
        const result = mapper.matchRoute('/dashboard', patterns);
        
        expect(result).toBe('/dashboard');
      });

      it('should return null for non-matching path', () => {
        const result = mapper.matchRoute('/unknown', patterns);
        
        expect(result).toBeNull();
      });

      it('should be case-insensitive', () => {
        const result = mapper.matchRoute('/DASHBOARD', patterns);
        
        expect(result).toBe('/dashboard');
      });
    });

    describe('with parameterized match', () => {
      it('should match parameterized pattern', () => {
        const result = mapper.matchRoute('/academics/students/123', patterns);
        
        expect(result).toBe('/academics/students/:id');
      });

      it('should match deeply nested parameterized pattern', () => {
        const result = mapper.matchRoute('/finance/invoices/456', patterns);
        
        expect(result).toBe('/finance/invoices/:id');
      });
    });

    describe('with wildcard match', () => {
      it('should match wildcard pattern', () => {
        const result = mapper.matchRoute('/settings/extra/path', patterns);
        
        expect(result).toBe('/settings/*');
      });
    });

    describe('with invalid input', () => {
      it('should return null for empty path', () => {
        const result = mapper.matchRoute('', patterns);
        
        expect(result).toBeNull();
      });

      it('should return null for empty patterns', () => {
        const result = mapper.matchRoute('/test', []);
        
        expect(result).toBeNull();
      });

      it('should return null for null patterns', () => {
        const result = mapper.matchRoute('/test', null as any);
        
        expect(result).toBeNull();
      });
    });
  });

  describe('extractModuleFromPath', () => {
    describe('with common modules', () => {
      it('should extract dashboard module', () => {
        expect(mapper.extractModuleFromPath('/dashboard')).toBe('dashboard');
      });

      it('should extract academics module', () => {
        expect(mapper.extractModuleFromPath('/academics/students')).toBe('academics');
      });

      it('should extract finance module', () => {
        expect(mapper.extractModuleFromPath('/finance/overview')).toBe('finance');
      });

      it('should extract settings module', () => {
        expect(mapper.extractModuleFromPath('/settings/general')).toBe('settings');
      });

      it('should extract library module', () => {
        expect(mapper.extractModuleFromPath('/library/books')).toBe('library');
      });

      it('should extract health module', () => {
        expect(mapper.extractModuleFromPath('/health/records')).toBe('health');
      });

      it('should extract transport module', () => {
        expect(mapper.extractModuleFromPath('/transport/routes')).toBe('transport');
      });

      it('should extract dormitory module', () => {
        expect(mapper.extractModuleFromPath('/dormitory/rooms')).toBe('dormitory');
      });

      it('should extract communication module', () => {
        expect(mapper.extractModuleFromPath('/communication/messages')).toBe('communication');
      });

      it('should extract reports module', () => {
        expect(mapper.extractModuleFromPath('/reports/summary')).toBe('reports');
      });

      it('should extract hr module', () => {
        expect(mapper.extractModuleFromPath('/hr/employees')).toBe('hr');
      });

      it('should extract payroll module', () => {
        expect(mapper.extractModuleFromPath('/payroll/salaries')).toBe('payroll');
      });

      it('should extract inventory module', () => {
        expect(mapper.extractModuleFromPath('/inventory/items')).toBe('inventory');
      });

      it('should extract clubs module', () => {
        expect(mapper.extractModuleFromPath('/clubs/list')).toBe('clubs');
      });

      it('should extract administration module', () => {
        expect(mapper.extractModuleFromPath('/administration/users')).toBe('administration');
      });
    });

    describe('with unknown modules', () => {
      it('should return unknown for unrecognized module', () => {
        expect(mapper.extractModuleFromPath('/custom/path')).toBe('custom');
      });

      it('should return root for root path', () => {
        expect(mapper.extractModuleFromPath('/')).toBe('root');
      });

      it('should return unknown for empty path', () => {
        expect(mapper.extractModuleFromPath('')).toBe('unknown');
      });

      it('should return unknown for undefined path', () => {
        expect(mapper.extractModuleFromPath(undefined as any)).toBe('unknown');
      });
    });

    describe('with path normalization', () => {
      it('should normalize path before extraction', () => {
        expect(mapper.extractModuleFromPath('/DASHBOARD')).toBe('dashboard');
      });

      it('should handle paths with extra slashes', () => {
        expect(mapper.extractModuleFromPath('//academics//students')).toBe('academics');
      });

      it('should handle trailing slash', () => {
        expect(mapper.extractModuleFromPath('/academics/')).toBe('academics');
      });
    });
  });

  describe('normalizePath', () => {
    describe('with basic normalization', () => {
      it('should add leading slash if missing', () => {
        expect(mapper.normalizePath('test/path')).toBe('/test/path');
      });

      it('should remove trailing slash', () => {
        expect(mapper.normalizePath('/test/path/')).toBe('/test/path');
      });

      it('should keep root slash', () => {
        expect(mapper.normalizePath('/')).toBe('/');
      });

      it('should remove duplicate slashes', () => {
        expect(mapper.normalizePath('/test//path')).toBe('/test/path');
      });

      it('should convert backslashes to forward slashes', () => {
        expect(mapper.normalizePath('\\test\\path')).toBe('/test/path');
      });
    });

    describe('with query strings', () => {
      it('should remove query strings', () => {
        expect(mapper.normalizePath('/test/path?query=value')).toBe('/test/path');
      });

      it('should handle complex query strings', () => {
        expect(mapper.normalizePath('/test?a=1&b=2')).toBe('/test');
      });
    });

    describe('with hash fragments', () => {
      it('should remove hash fragments', () => {
        expect(mapper.normalizePath('/test/path#section')).toBe('/test/path');
      });
    });

    describe('with case normalization', () => {
      it('should convert to lowercase', () => {
        expect(mapper.normalizePath('/TEST/PATH')).toBe('/test/path');
      });

      it('should handle mixed case', () => {
        expect(mapper.normalizePath('/Test/Path')).toBe('/test/path');
      });
    });

    describe('with edge cases', () => {
      it('should handle empty string', () => {
        expect(mapper.normalizePath('')).toBe('/');
      });

      it('should handle null', () => {
        expect(mapper.normalizePath(null as any)).toBe('/');
      });

      it('should handle undefined', () => {
        expect(mapper.normalizePath(undefined as any)).toBe('/');
      });

      it('should handle whitespace only', () => {
        expect(mapper.normalizePath('   ')).toBe('/');
      });

      it('should handle multiple trailing slashes', () => {
        expect(mapper.normalizePath('/test/path///')).toBe('/test/path');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete route to tab workflow', () => {
      const navigationConfig: NavigationItem[] = [
        {
          name: 'Dashboard',
          path: '/dashboard',
          module: 'dashboard',
          icon: 'home',
        },
        {
          name: 'Academics',
          path: '/academics',
          module: 'academics',
          children: [
            {
              name: 'Students',
              path: '/academics/students',
              module: 'academics',
            },
            {
              name: 'Student Details',
              path: '/academics/students/:id',
              module: 'academics',
            },
          ],
        },
      ];

      // Resolve navigation item
      const navItem = mapper.resolveNavigationItem('/academics/students', navigationConfig);
      expect(navItem).not.toBeNull();

      // Build tab from route
      const tab = mapper.buildTabFromRoute('/academics/students', navItem!);
      expect(tab.module).toBe('academics');
      expect(tab.title).toBe('Students');

      // Extract module
      const moduleName = mapper.extractModuleFromPath('/academics/students');
      expect(moduleName).toBe('academics');
    });

    it('should handle parameterized route workflow', () => {
      const navigationConfig: NavigationItem[] = [
        {
          name: 'Student',
          path: '/students/:id',
          module: 'academics',
        },
      ];

      // Resolve with parameter
      const navItem = mapper.resolveNavigationItem('/students/123', navigationConfig);
      expect(navItem).not.toBeNull();

      // Parse parameters
      const params = mapper.parseRouteParams('/students/123', '/students/:id');
      expect(params.id).toBe('123');

      // Match route
      const matched = mapper.matchRoute('/students/123', ['/students/:id']);
      expect(matched).toBe('/students/:id');

      // Build tab
      const tab = mapper.buildTabFromRoute('/students/123', navItem!);
      expect(tab.id).toContain('students-123');
    });

    it('should handle complex nested routes', () => {
      const navigationConfig: NavigationItem[] = [
        {
          name: 'Finance',
          path: '/finance',
          module: 'finance',
          children: [
            {
              name: 'Invoices',
              path: '/finance/invoices',
              module: 'finance',
              children: [
                {
                  name: 'Invoice Details',
                  path: '/finance/invoices/:id',
                  module: 'finance',
                },
              ],
            },
          ],
        },
      ];

      // Should find deeply nested item
      const result = mapper.resolveNavigationItem('/finance/invoices/456', navigationConfig);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Invoice Details');
    });
  });
});
