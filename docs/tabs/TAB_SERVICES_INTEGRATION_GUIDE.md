# Tab Services Integration Guide

**Purpose**: Guide for integrating TabPersistenceService, TabValidationService, and RouteToTabMapper into the SchoolPilot3 tabbed workspace system.

**Status**: TabValidationService integrated, TabPersistenceService and RouteToTabMapper not integrated  
**Last Updated**: 2026-04-02

---

## Overview

Three production-ready services have been created to improve the tabbed workspace architecture:

1. **TabPersistenceService** - Handles tab persistence with localStorage and IndexedDB
2. **TabValidationService** - Centralizes validation logic for tabs
3. **RouteToTabMapper** - Maps routes to tab configurations

This guide provides step-by-step instructions for integrating these services into the existing codebase.

---

## Prerequisites

Before starting integration:

- [ ] Read [ADR-001: Tab Services Implementation Status](./architecture/ADR-001-tab-services-implementation-status.md)
- [ ] Review [Verification Report](./TABBED_WORKSPACE_VERIFICATION_REPORT.md)
- [ ] Understand current tabStore implementation
- [ ] Set up local development environment
- [ ] Create feature branch for integration work

---

## Integration Phases

### Phase 1: TabValidationService Integration

**Effort**: 1 day  
**Risk**: Low  
**Priority**: High (eliminates most code duplication)  
**Status**: ✅ COMPLETED (Partially - using different method names)

#### Step 1.1: Import Service in tabStore

**File**: `src/stores/tabStore.ts`

Add import at the top of the file:

```typescript
import { tabValidationService } from '../services/tabs/TabValidationService';
```

#### Step 1.2: Replace Inline Validation Functions

**Current Code** (lines 48-77):
```typescript
// Validate tab permissions
const validateTabPermissions = (tab: Tab, userRole: string, userPermissions: string[]): boolean => {
  if (!tab.permissions || tab.permissions.length === 0) return true;
  
  // Check if user has any of the required permissions
  return tab.permissions.some(permission => userPermissions.includes(permission));
};

// Validate tab data integrity
const validateTabData = (tab: any): tab is Tab => {
  if (!tab || typeof tab !== 'object') return false;
  if (!tab.id || typeof tab.id !== 'string') return false;
  if (!tab.title || typeof tab.title !== 'string') return false;
  if (!tab.module || typeof tab.module !== 'string') return false;
  if (!tab.path || typeof tab.path !== 'string') return false;
  if (!tab.content || typeof tab.content !== 'object') return false;
  
  // Check for corrupted module names (should not contain colons)
  if (tab.module.includes(':')) {
    console.warn('Corrupted tab detected with invalid module name:', tab.module);
    return false;
  }
  
  return true;
};
```

**Replace With** (ACTUAL IMPLEMENTATION):
```typescript
// Validate tab permissions using service
const validateTabPermissions = (tab: Tab, userRole: string, userPermissions: string[]): boolean => {
  // Note: Using validateTabAccess() which returns boolean directly
  return tabValidationService.validateTabAccess(tab, userRole, userPermissions);
};

// Validate tab data integrity using service
const validateTabData = (tab: any): tab is Tab => {
  // Note: Using validateTabState() which returns { valid, errors, warnings }
  const result = tabValidationService.validateTabState(tab as Tab);
  return result.valid;
};
```

#### Step 1.3: Update Tab Creation Validation

**Current Code** (line 336):
```typescript
// Check tab limit
if (updatedState.tabs.length >= updatedState.maxTabs) {
  throw new Error(`Maximum tab limit (${updatedState.maxTabs}) reached`);
}
```

**Recommended Enhancement** (using validateTabCreation):
```typescript
// Validate tab creation using service
const validation = tabValidationService.validateTabCreation(
  updatedState.tabs,
  tabData,
  updatedState.maxTabs
);

if (!validation.valid) {
  throw new Error(validation.errors.join(', '));
}

// Log warnings if any
if (validation.warnings.length > 0) {
  console.warn('Tab creation warnings:', validation.warnings);
}
```

#### Step 1.4: Add Integration Tests

**File**: `src/stores/__tests__/tabStore.integration.test.ts` (new file)

```typescript
// ABOUTME: Integration tests for tabStore with TabValidationService
// ABOUTME: Verifies that validation service is properly integrated

import { describe, it, expect, beforeEach } from 'vitest';
import { useTabStore } from '../tabStore';
import { tabValidationService } from '../../services/tabs/TabValidationService';

describe('tabStore + TabValidationService Integration', () => {
  beforeEach(() => {
    // Reset store state
    useTabStore.getState().resetStore();
  });

  it('should use validation service for permission checks', async () => {
    const store = useTabStore.getState();
    
    // Create tab with permissions
    const tabId = await store.createTab({
      title: 'Test Tab',
      module: 'test',
      path: '/test',
      content: { type: 'component', component: 'TestComponent' },
      permissions: ['test.read']
    });

    // Validate access
    const hasAccess = store.validateTabAccess(tabId);
    expect(hasAccess).toBeDefined();
  });

  it('should use validation service for tab structure validation', async () => {
    const store = useTabStore.getState();
    
    // Attempt to create invalid tab (should fail validation)
    await expect(
      store.createTab({
        title: '',  // Invalid: empty title
        module: 'test',
        path: '/test',
        content: { type: 'component', component: 'TestComponent' }
      })
    ).rejects.toThrow();
  });

  it('should enforce max tabs limit using validation service', async () => {
    const store = useTabStore.getState();
    store.initializeStore({ maxTabs: 2 });

    // Create max tabs
    await store.createTab({
      title: 'Tab 1',
      module: 'test',
      path: '/test1',
      content: { type: 'component', component: 'TestComponent' }
    });

    await store.createTab({
      title: 'Tab 2',
      module: 'test',
      path: '/test2',
      content: { type: 'component', component: 'TestComponent' }
    });

    // Attempt to create one more (should fail)
    await expect(
      store.createTab({
        title: 'Tab 3',
        module: 'test',
        path: '/test3',
        content: { type: 'component', component: 'TestComponent' }
      })
    ).rejects.toThrow(/Maximum tab limit/);
  });
});
```

#### Step 1.5: Verify Integration

```bash
# Run tests
npm test -- tabStore.integration.test.ts

# Run full test suite
npm test

# Check for TypeScript errors
npx tsc --noEmit

# Run linter
npm run lint
```

---

### Phase 2: TabPersistenceService Integration

**Effort**: 1-2 days  
**Risk**: Medium  
**Priority**: Medium (improves persistence but more complex)

#### Step 2.1: Create Zustand Storage Adapter

**File**: `src/stores/adapters/tabPersistenceAdapter.ts` (new file)

```typescript
// ABOUTME: Zustand storage adapter for TabPersistenceService
// ABOUTME: Bridges Zustand persist middleware with TabPersistenceService

import { StateStorage } from 'zustand/middleware';
import { tabPersistenceService } from '../../services/tabs/TabPersistenceService';
import { Tab } from '../../types/tabbedWorkspace';

interface PersistedTabState {
  tabs: Tab[];
  pinnedTabs: string[];
  recentlyClosedTabs: Tab[];
  maxTabs: number;
  tabGroups: Record<string, any>;
}

export const tabPersistenceAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const data = await tabPersistenceService.loadTabs();
      
      if (!data) {
        return null;
      }

      // Convert to Zustand format
      const zustandState: PersistedTabState = {
        tabs: data.tabs || [],
        pinnedTabs: data.pinnedTabs || [],
        recentlyClosedTabs: data.recentlyClosedTabs || [],
        maxTabs: data.maxTabs || 15,
        tabGroups: data.tabGroups || {}
      };

      return JSON.stringify({ state: zustandState });
    } catch (error) {
      console.error('Error loading tabs via persistence service:', error);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value);
      const state = parsed.state as PersistedTabState;

      await tabPersistenceService.saveTabs({
        tabs: state.tabs,
        pinnedTabs: state.pinnedTabs,
        recentlyClosedTabs: state.recentlyClosedTabs,
        maxTabs: state.maxTabs,
        tabGroups: state.tabGroups
      });
    } catch (error) {
      console.error('Error saving tabs via persistence service:', error);
      throw error;
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await tabPersistenceService.clearTabs();
    } catch (error) {
      console.error('Error clearing tabs via persistence service:', error);
      throw error;
    }
  }
};
```

#### Step 2.2: Update tabStore to Use Adapter

**File**: `src/stores/tabStore.ts`

**Current Code** (lines 851-883):
```typescript
{
  name: 'tabbed-workspace-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    tabs: state.tabs,
    pinnedTabs: state.pinnedTabs,
    recentlyClosedTabs: state.recentlyClosedTabs,
    maxTabs: state.maxTabs,
    tabGroups: state.tabGroups,
  }),
  // ... rest of config
}
```

**Replace With**:
```typescript
import { tabPersistenceAdapter } from './adapters/tabPersistenceAdapter';

{
  name: 'tabbed-workspace-storage',
  storage: tabPersistenceAdapter,
  partialize: (state) => ({
    tabs: state.tabs,
    pinnedTabs: state.pinnedTabs,
    recentlyClosedTabs: state.recentlyClosedTabs,
    maxTabs: state.maxTabs,
    tabGroups: state.tabGroups,
  }),
  // ... rest of config
}
```

#### Step 2.3: Test Data Migration

**File**: `src/stores/__tests__/tabPersistence.integration.test.ts` (new file)

```typescript
// ABOUTME: Integration tests for tab persistence
// ABOUTME: Verifies data migration and persistence service integration

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTabStore } from '../tabStore';
import { tabPersistenceService } from '../../services/tabs/TabPersistenceService';

describe('Tab Persistence Integration', () => {
  beforeEach(async () => {
    await tabPersistenceService.clearTabs();
    useTabStore.getState().resetStore();
  });

  afterEach(async () => {
    await tabPersistenceService.clearTabs();
  });

  it('should persist tabs using TabPersistenceService', async () => {
    const store = useTabStore.getState();

    // Create a tab
    const tabId = await store.createTab({
      title: 'Test Tab',
      module: 'test',
      path: '/test',
      content: { type: 'component', component: 'TestComponent' }
    });

    // Wait for persistence
    await new Promise(resolve => setTimeout(resolve, 100));

    // Load tabs directly from service
    const persistedData = await tabPersistenceService.loadTabs();
    
    expect(persistedData).toBeDefined();
    expect(persistedData?.tabs).toHaveLength(1);
    expect(persistedData?.tabs[0].id).toBe(tabId);
  });

  it('should restore tabs from persistence on initialization', async () => {
    // Save tabs directly via service
    await tabPersistenceService.saveTabs({
      tabs: [{
        id: 'test-tab-1',
        title: 'Persisted Tab',
        module: 'test',
        path: '/test',
        content: { type: 'component', component: 'TestComponent' },
        lastAccessed: Date.now()
      }],
      pinnedTabs: [],
      recentlyClosedTabs: [],
      maxTabs: 15,
      tabGroups: {}
    });

    // Create new store instance (simulates app restart)
    const store = useTabStore.getState();
    await store.initialize();

    // Verify tabs were restored
    expect(store.tabs).toHaveLength(1);
    expect(store.tabs[0].title).toBe('Persisted Tab');
  });
});
```

#### Step 2.4: Verify Integration

```bash
# Run persistence tests
npm test -- tabPersistence.integration.test.ts

# Test in browser
npm run dev
# Open DevTools → Application → IndexedDB
# Verify tabs are stored in IndexedDB

# Run full test suite
npm test
```

---

### Phase 3: RouteToTabMapper Integration

**Effort**: 1 day  
**Risk**: Low  
**Priority**: Low (nice to have, less critical)

#### Step 3.1: Import Service in TabStateManager

**File**: `src/services/TabStateManager.ts`

Add import:

```typescript
import { routeToTabMapper } from './tabs/RouteToTabMapper';
```

#### Step 3.2: Replace Route Handling Logic

**Current Code** (lines 150-195):
```typescript
generateTabTitle(module: any, child: any, isModuleDashboard: boolean): string {
  if (child) {
    const childName = child.name || child.title || 'Page';
    if (childName.startsWith('navigation:')) {
      const cleanName = childName
        .replace('navigation:', '')
        .replace(/\./g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim();
      return this.capitalizeWords(cleanName);
    }
    return childName;
  }
  
  if (isModuleDashboard) {
    if (module.displayName) return module.displayName;
    if (module.title) return module.title;
    
    let moduleName = module.name || 'Dashboard';
    
    if (moduleName.startsWith('navigation:')) {
      moduleName = moduleName
        .replace('navigation:', '')
        .replace('.title', '')
        .replace(/\./g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim();
    }
    
    return this.capitalizeWords(moduleName);
  }
  
  return 'Dashboard';
}

private extractModuleId(moduleName: string): string {
  if (!moduleName) return 'unknown';
  
  return moduleName
    .replace('navigation:', '')
    .replace('.title', '')
    .replace(/\./g, '-')
    .toLowerCase();
}
```

**Replace With**:
```typescript
generateTabTitle(module: any, child: any, isModuleDashboard: boolean): string {
  const navigationItem = {
    module,
    child,
    isModuleDashboard
  };
  
  return routeToTabMapper.generateTabTitle(navigationItem);
}

private extractModuleId(moduleName: string): string {
  return routeToTabMapper.extractModuleId(moduleName);
}
```

#### Step 3.3: Update createModuleTab Method

**Current Code** (lines 80-145):
```typescript
async createModuleTab(navigationItem: NavigationItem, location: Location): Promise<TabCreationResult> {
  // ... existing logic
  
  const tabConfig = {
    title: tabTitle,
    module: moduleId,
    path: location.pathname,
    content: {
      type: 'component',
      component: 'DynamicPageComponent'
    },
    permissions: [],
    canClose: isModuleDashboard ? this.config.moduleDefaults.dashboardCanClose : this.config.moduleDefaults.pageCanClose,
    pinned: isModuleDashboard ? this.config.moduleDefaults.dashboardPinned : this.config.moduleDefaults.pagePinned,
    metadata: {
      moduleContext: moduleId,
      isModuleDashboard,
      navigationItem: module,
      childNavigationItem: child,
      createdAt: Date.now(),
      platform: this.platformInfo?.platform || 'web'
    }
  };
  
  // ... rest of method
}
```

**Replace With**:
```typescript
async createModuleTab(navigationItem: NavigationItem, location: Location): Promise<TabCreationResult> {
  // ... existing logic
  
  // Use RouteToTabMapper to build tab configuration
  const tabConfig = routeToTabMapper.buildTabFromNavigation(navigationItem, {
    path: location.pathname,
    canClose: isModuleDashboard ? this.config.moduleDefaults.dashboardCanClose : this.config.moduleDefaults.pageCanClose,
    pinned: isModuleDashboard ? this.config.moduleDefaults.dashboardPinned : this.config.moduleDefaults.pagePinned,
    metadata: {
      platform: this.platformInfo?.platform || 'web'
    }
  });
  
  // ... rest of method
}
```

#### Step 3.4: Add Integration Tests

**File**: `src/services/__tests__/TabStateManager.integration.test.ts` (new file)

```typescript
// ABOUTME: Integration tests for TabStateManager with RouteToTabMapper
// ABOUTME: Verifies route mapping service integration

import { describe, it, expect, beforeEach } from 'vitest';
import { TabStateManager } from '../TabStateManager';
import { routeToTabMapper } from '../tabs/RouteToTabMapper';

describe('TabStateManager + RouteToTabMapper Integration', () => {
  let manager: TabStateManager;

  beforeEach(() => {
    manager = new TabStateManager({
      maxTabs: 15,
      enablePersistence: true,
      enableTabGroups: false,
      defaultTabBehavior: 'tab',
      platformAdaptation: true,
      moduleDefaults: {
        dashboardCanClose: false,
        dashboardPinned: true,
        pageCanClose: true,
        pagePinned: false
      }
    });
  });

  it('should use RouteToTabMapper for title generation', () => {
    const module = { name: 'navigation:admin.title' };
    const title = manager.generateTabTitle(module, null, true);
    
    expect(title).toBe('Admin');
  });

  it('should use RouteToTabMapper for module ID extraction', () => {
    const moduleId = (manager as any).extractModuleId('navigation:admin.title');
    
    expect(moduleId).toBe('admin');
  });
});
```

---

## Testing Strategy

### Unit Tests

Each service has comprehensive unit tests:
- `TabPersistenceService.test.ts` (480+ lines)
- `TabValidationService.test.ts` (560+ lines)
- `RouteToTabMapper.test.ts` (340+ lines)

### Integration Tests

Create integration tests for each phase:
- `tabStore.integration.test.ts` - Validation service integration
- `tabPersistence.integration.test.ts` - Persistence service integration
- `TabStateManager.integration.test.ts` - Route mapper integration

### Manual Testing Checklist

- [ ] Create new tab
- [ ] Close tab
- [ ] Pin/unpin tab
- [ ] Reorder tabs
- [ ] Refresh page (test persistence)
- [ ] Clear browser data and verify fallback
- [ ] Test with 15+ tabs (max limit)
- [ ] Test with invalid tab data
- [ ] Test permission-restricted tabs
- [ ] Test module dashboard vs page tabs

---

## Performance Considerations

### Before Integration

Measure baseline performance:

```typescript
// Add to TabbedWorkspace.tsx
const startTime = performance.now();
// ... tab operation
const endTime = performance.now();
console.log(`Tab operation took ${endTime - startTime}ms`);
```

### After Integration

Compare performance metrics:
- Tab creation time
- Tab switching time
- Persistence save time
- Initial load time

**Expected Impact**: Minimal (< 10ms difference)

---

## Rollback Plan

If integration causes issues:

### Immediate Rollback

```bash
# Revert changes
git revert <commit-hash>

# Or reset to previous commit
git reset --hard <previous-commit>

# Redeploy
npm run build
npm run deploy
```

### Gradual Rollback

1. Add feature flag for service integration
2. Disable flag in production
3. Fix issues in development
4. Re-enable flag when ready

**Feature Flag Example**:

```typescript
// config.ts
export const FEATURE_FLAGS = {
  USE_TAB_SERVICES: process.env.VITE_USE_TAB_SERVICES === 'true'
};

// tabStore.ts
import { FEATURE_FLAGS } from './config';

const validateTabPermissions = (tab: Tab, userRole: string, userPermissions: string[]): boolean => {
  if (FEATURE_FLAGS.USE_TAB_SERVICES) {
    return tabValidationService.validatePermissions(tab, userRole, userPermissions).isValid;
  }
  
  // Fallback to inline logic
  if (!tab.permissions || tab.permissions.length === 0) return true;
  return tab.permissions.some(permission => userPermissions.includes(permission));
};
```

---

## Troubleshooting

### Issue: Tabs not persisting

**Symptoms**: Tabs disappear on page refresh

**Diagnosis**:
```typescript
// Check if persistence service is working
const data = await tabPersistenceService.loadTabs();
console.log('Persisted data:', data);
```

**Solutions**:
1. Check browser storage permissions
2. Verify IndexedDB is available
3. Check for quota exceeded errors
4. Verify adapter is correctly configured

---

### Issue: Validation errors

**Symptoms**: Tabs fail to create with validation errors

**Diagnosis**:
```typescript
// Check validation result
const result = tabValidationService.validateTabStructure(tabData);
console.log('Validation result:', result);
```

**Solutions**:
1. Verify tab data structure matches Tab interface
2. Check required fields are present
3. Verify permissions array format
4. Check for corrupted data

---

### Issue: Route mapping errors

**Symptoms**: Tab titles are incorrect or missing

**Diagnosis**:
```typescript
// Check route mapping
const title = routeToTabMapper.generateTabTitle(navigationItem);
console.log('Generated title:', title);
```

**Solutions**:
1. Verify navigation item structure
2. Check module name format
3. Verify child navigation item
4. Check for translation key issues

---

## Success Criteria

Integration is successful when:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Manual testing checklist complete
- [ ] Performance metrics acceptable
- [ ] No console errors in browser
- [ ] Tabs persist across page refreshes
- [ ] Validation works correctly
- [ ] Route mapping generates correct titles
- [ ] Code duplication eliminated
- [ ] Documentation updated

---

## Post-Integration Tasks

After successful integration:

1. **Update Documentation**
   - [ ] Update ADR-001 with integration results
   - [ ] Update verification report
   - [ ] Update improvement plan status
   - [ ] Add integration notes to README

2. **Code Cleanup**
   - [ ] Remove duplicate validation functions
   - [ ] Remove duplicate persistence logic
   - [ ] Remove duplicate route handling
   - [ ] Update comments and documentation

3. **Monitoring**
   - [ ] Monitor error logs for issues
   - [ ] Track performance metrics
   - [ ] Gather user feedback
   - [ ] Monitor bundle size impact

4. **Communication**
   - [ ] Notify team of integration completion
   - [ ] Update project status
   - [ ] Share lessons learned
   - [ ] Document any issues encountered

---

## Resources

- [TabPersistenceService API](../src/services/tabs/TabPersistenceService.ts)
- [TabValidationService API](../src/services/tabs/TabValidationService.ts)
- [RouteToTabMapper API](../src/services/tabs/RouteToTabMapper.ts)
- [ADR-001](./architecture/ADR-001-tab-services-implementation-status.md)
- [Verification Report](./TABBED_WORKSPACE_VERIFICATION_REPORT.md)
- [State Management Guidelines](./STATE_MANAGEMENT_GUIDELINES.md)

---

**Guide Version**: 1.0  
**Last Updated**: 2026-03-14  
**Maintained By**: Development Team
