// ABOUTME: Unit tests for deprecated navigation filtering functionality
// ABOUTME: Tests moduleRegistry.getNavigationItems() filtering and empty group pruning

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { moduleRegistry } from '../../core/moduleRegistry';
import { ModuleDefinition, NavItem } from '../../core/types';
import { moduleConfigService } from '../../services/module/moduleConfigService';

// Mock the moduleConfigService
vi.mock('../../services/module/moduleConfigService', () => ({
  moduleConfigService: {
    enableModule: vi.fn(() => true),
    disableModule: vi.fn(() => true),
    isModuleEnabled: vi.fn(() => true),
    getEnabledModules: vi.fn(() => [])
  }
}));

// Mock MODULE_ORDER
vi.mock('../../moduleOrder', () => ({
  MODULE_ORDER: ['dashboard', 'settings', 'testModule', 'academics']
}));

describe('Deprecated Navigation Filtering', () => {
  beforeEach(() => {
    // Clear all registered modules before each test
    const modules = moduleRegistry.getAllModules();
    modules.forEach(module => moduleRegistry.unregisterModule(module.id));
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  it('should filter out deprecated nav items from module navigation', () => {
    // Setup mock for moduleConfigService
    vi.mocked(moduleConfigService.isModuleEnabled).mockReturnValue(true);

    // Register test module with mixed deprecated and active nav items
    const testModule: ModuleDefinition = {
      id: 'testModule',
      name: 'Test Module',
      description: 'Test module with deprecated items',
      icon: 'TestIcon',
      path: '/test',
      isActive: true,
      version: '1.0.0',
      navigation: [
        { name: 'Active Item 1', path: '/test/active1', icon: 'Icon1', page: 'ActivePage1' },
        { name: 'Deprecated Item 1', path: '/test/deprecated1', icon: 'Icon2', page: 'DeprecatedPage1', deprecated: true },
        { name: 'Active Item 2', path: '/test/active2', icon: 'Icon3', page: 'ActivePage2' },
        { name: 'Deprecated Item 2', path: '/test/deprecated2', icon: 'Icon4', page: 'DeprecatedPage2', deprecated: true }
      ]
    };

    moduleRegistry.registerModule(testModule);
    const navigationItems = moduleRegistry.getNavigationItems();

    // Find the test module nav item
    const testModuleNav = navigationItems.find(item => item.name === 'Test Module');
    expect(testModuleNav).toBeDefined();
    
    // Check that deprecated items are filtered out
    expect(testModuleNav!.children).toHaveLength(2);
    expect(testModuleNav!.children!.map(child => child.name)).toEqual([
      'Active Item 1',
      'Active Item 2'
    ]);
    
    // Ensure deprecated items are not present
    const childNames = testModuleNav!.children!.map(child => child.name);
    expect(childNames).not.toContain('Deprecated Item 1');
    expect(childNames).not.toContain('Deprecated Item 2');
  });

  it('should prune modules that have no active nav items after filtering', () => {
    // Setup mock for moduleConfigService
    vi.mocked(moduleConfigService.isModuleEnabled).mockReturnValue(true);

    // Register module with only deprecated nav items
    const deprecatedOnlyModule: ModuleDefinition = {
      id: 'deprecatedOnly',
      name: 'Deprecated Only Module',
      description: 'Module with only deprecated items',
      icon: 'DeprecatedIcon',
      path: '/deprecated-only',
      isActive: true,
      version: '1.0.0',
      navigation: [
        { name: 'Deprecated Item 1', path: '/deprecated-only/item1', icon: 'Icon1', page: 'DeprecatedPage1', deprecated: true },
        { name: 'Deprecated Item 2', path: '/deprecated-only/item2', icon: 'Icon2', page: 'DeprecatedPage2', deprecated: true }
      ]
    };

    // Register module with active nav items
    const activeModule: ModuleDefinition = {
      id: 'activeModule',
      name: 'Active Module',
      description: 'Module with active items',
      icon: 'ActiveIcon',
      path: '/active',
      isActive: true,
      version: '1.0.0',
      navigation: [
        { name: 'Active Item', path: '/active/item', icon: 'Icon', page: 'ActivePage' }
      ]
    };

    moduleRegistry.registerModule(deprecatedOnlyModule);
    moduleRegistry.registerModule(activeModule);

    const navigationItems = moduleRegistry.getNavigationItems();

    // Check that deprecated-only module is pruned from navigation
    const moduleNames = navigationItems.map(item => item.name);
    expect(moduleNames).not.toContain('Deprecated Only Module');
    expect(moduleNames).toContain('Active Module');
  });

  it('should handle modules with no navigation items gracefully', () => {
    // Setup mock for moduleConfigService
    vi.mocked(moduleConfigService.isModuleEnabled).mockReturnValue(true);

    // Register module with no navigation
    const noNavModule: ModuleDefinition = {
      id: 'noNav',
      name: 'No Navigation Module',
      description: 'Module without navigation',
      icon: 'NoNavIcon',
      path: '/no-nav',
      isActive: true,
      version: '1.0.0'
      // No navigation property
    };

    moduleRegistry.registerModule(noNavModule);
    const navigationItems = moduleRegistry.getNavigationItems();

    // Should include module but with empty children
    const noNavItem = navigationItems.find(item => item.name === 'No Navigation Module');
    expect(noNavItem).toBeDefined();
    expect(noNavItem!.children).toEqual([]);
  });

  it('should preserve non-deprecated items while filtering deprecated ones', () => {
    // Setup mock for moduleConfigService
    vi.mocked(moduleConfigService.isModuleEnabled).mockReturnValue(true);

    const mixedModule: ModuleDefinition = {
      id: 'mixed',
      name: 'Mixed Module',
      description: 'Module with mixed items',
      icon: 'MixedIcon',
      path: '/mixed',
      isActive: true,
      version: '1.0.0',
      navigation: [
        { name: 'First Active', path: '/mixed/first', icon: 'Icon1', page: 'FirstPage' },
        { name: 'First Deprecated', path: '/mixed/deprecated1', icon: 'Icon2', page: 'DeprecatedPage1', deprecated: true },
        { name: 'Second Active', path: '/mixed/second', icon: 'Icon3', page: 'SecondPage' },
        { name: 'Second Deprecated', path: '/mixed/deprecated2', icon: 'Icon4', page: 'DeprecatedPage2', deprecated: true },
        { name: 'Third Active', path: '/mixed/third', icon: 'Icon5', page: 'ThirdPage' }
      ]
    };

    moduleRegistry.registerModule(mixedModule);
    const navigationItems = moduleRegistry.getNavigationItems();

    const mixedItem = navigationItems.find(item => item.name === 'Mixed Module');
    expect(mixedItem).toBeDefined();
    expect(mixedItem!.children).toHaveLength(3);
    
    const childNames = mixedItem!.children!.map(child => child.name);
    expect(childNames).toEqual(['First Active', 'Second Active', 'Third Active']);
  });

  it('should handle empty navigation arrays after filtering', () => {
    // Setup mock for moduleConfigService
    vi.mocked(moduleConfigService.isModuleEnabled).mockReturnValue(true);

    const emptyAfterFilterModule: ModuleDefinition = {
      id: 'emptyAfterFilter',
      name: 'Empty After Filter',
      description: 'Module that becomes empty after filtering',
      icon: 'EmptyIcon', 
      path: '/empty-after-filter',
      isActive: true,
      version: '1.0.0',
      navigation: [
        { name: 'Only Deprecated', path: '/empty/deprecated', icon: 'Icon', page: 'DeprecatedPage', deprecated: true }
      ]
    };

    moduleRegistry.registerModule(emptyAfterFilterModule);
    const navigationItems = moduleRegistry.getNavigationItems();

    // Module should be pruned since no active children remain
    const moduleNames = navigationItems.map(item => item.name);
    expect(moduleNames).not.toContain('Empty After Filter');
  });
});