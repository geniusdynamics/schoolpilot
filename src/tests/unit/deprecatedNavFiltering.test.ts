// ABOUTME: Unit tests for deprecated navigation filtering functionality
// ABOUTME: The filtering contract now lives in useSecondarySidebar()'s subMenus
// ABOUTME: memo (the former moduleRegistry.getNavigationItems() API was removed).
// ABOUTME: Deprecated items must be hidden, empty groups pruned to no children,
// ABOUTME: and active items preserved.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// The hook under test consumes several data hooks; mock their data sources and
// render the hook through the global renderHook (which setup.ts wraps in
// ToastProvider + FullWidthProvider — useFullWidth needs the latter).
vi.mock('../../hooks/useDynamicNavigation', () => ({
  useDynamicNavigation: () => ({
    navigationItems: navFixture,
    isLoading: false
  })
}));

vi.mock('../../hooks/useRBAC', () => ({
  useRBAC: () => ({
    accessibleModules: ['testmodule', 'mixed', 'deprecatedonly', 'nonav', 'emptyafterfilter'],
    hasModuleAccess: vi.fn(() => true)
  })
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' }
  })
}));

vi.mock('../../hooks/useTabNavigation', () => ({
  useTabNavigation: () => ({
    navigateToTab: vi.fn().mockResolvedValue({ tabId: 't1', wasCreated: true })
  })
}));

vi.mock('../../hooks/useToast', () => ({
  useToastHelpers: () => ({
    showInfo: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn()
  })
}));

vi.mock('../../hooks/useFavorites', () => ({
  useFavorites: () => ({
    favorites: [],
    reorderFavorites: vi.fn()
  })
}));

let navFixture: any[] = [];

import { useSecondarySidebar } from '../../hooks/useSecondarySidebar';

const buildFixture = (children: any[]) => ([
  {
    id: 'testModule',
    name: 'navigation:testModule.title',
    modulePath: '/testModule',
    path: '/testModule',
    isGroup: true,
    children
  }
]);

const renderHookWithProviders = (selectedModuleKey: string) =>
  // Global renderHook is provider-wrapped by src/tests/setup.ts
  renderHook(() => useSecondarySidebar({
    selectedModuleKey,
    isOpen: true,
    onClose: vi.fn()
  }));

describe('Deprecated Navigation Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navFixture = [];
  });

  it('filters out deprecated nav items from module navigation', () => {
    navFixture = buildFixture([
      { name: 'Active Item 1', path: '/testModule/active1', id: 'active1' },
      { name: 'Deprecated Item 1', path: '/testModule/deprecated1', id: 'deprecated1', deprecated: true },
      { name: 'Active Item 2', path: '/testModule/active2', id: 'active2' },
      { name: 'Deprecated Item 2', path: '/testModule/deprecated2', id: 'deprecated2', deprecated: true }
    ]);

    const { result } = renderHookWithProviders('testModule');

    const names = result.current.subMenus.map(item => item.name);
    expect(names).toEqual(['Active Item 1', 'Active Item 2']);
    expect(names).not.toContain('Deprecated Item 1');
    expect(names).not.toContain('Deprecated Item 2');
  });

  it('prunes modules that have no active nav items after filtering', () => {
    navFixture = buildFixture([
      { name: 'Deprecated Item 1', path: '/testModule/item1', id: 'item1', deprecated: true },
      { name: 'Deprecated Item 2', path: '/testModule/item2', id: 'item2', deprecated: true }
    ]);

    const { result } = renderHookWithProviders('testModule');

    // A module whose items are all deprecated yields an empty submenu
    expect(result.current.subMenus).toEqual([]);
  });

  it('handles modules with no navigation items gracefully', () => {
    navFixture = buildFixture([]);

    const { result } = renderHookWithProviders('testModule');

    expect(result.current.subMenus).toEqual([]);
  });

  it('preserves non-deprecated items while filtering deprecated ones', () => {
    navFixture = buildFixture([
      { name: 'First Active', path: '/testModule/first', id: 'first' },
      { name: 'First Deprecated', path: '/testModule/deprecated1', id: 'deprecated1', deprecated: true },
      { name: 'Second Active', path: '/testModule/second', id: 'second' },
      { name: 'Second Deprecated', path: '/testModule/deprecated2', id: 'deprecated2', deprecated: true },
      { name: 'Third Active', path: '/testModule/third', id: 'third' }
    ]);

    const { result } = renderHookWithProviders('testModule');

    expect(result.current.subMenus.map(item => item.name)).toEqual([
      'First Active',
      'Second Active',
      'Third Active'
    ]);
  });

  it('handles empty navigation arrays after filtering', () => {
    navFixture = buildFixture([
      { name: 'Only Deprecated', path: '/testModule/deprecated', id: 'deprecated', deprecated: true }
    ]);

    const { result } = renderHookWithProviders('testModule');

    expect(result.current.subMenus).toEqual([]);
  });

  it('deduplicates items that share the same path', () => {
    navFixture = buildFixture([
      { name: 'First', path: '/testModule/dup', id: 'dup-1' },
      { name: 'Second', path: '/testModule/dup', id: 'dup-2' }
    ]);

    const { result } = renderHookWithProviders('testModule');

    expect(result.current.subMenus.map(item => item.name)).toEqual(['First']);
  });
});
