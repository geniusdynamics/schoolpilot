# Tab System Architecture

## Overview

The tab system provides a robust mechanism for managing multiple workspace contexts within the application. It allows users to work on different tasks simultaneously while maintaining state isolation, providing seamless navigation, and offering a modern browser-like experience.

## Core Components

### 1. TabbedWorkspace

**Location**: `src/components/tabbedWorkspace/TabbedWorkspace.tsx`

The main container component that orchestrates all tab-related functionality. Key responsibilities:
- Tab creation and management
- Tab state persistence
- Error boundary handling
- Drag-and-drop tab reordering
- Hierarchical tab support

```typescript
interface TabState {
  id: string;
  title: string;
  path: string;
  icon?: React.ComponentType;
  module: string;
  submodule?: string;
  metadata?: Record<string, any>;
  parentId?: string;        // For hierarchical tabs
  isPinned?: boolean;       // Pin state
  isDirty?: boolean;        // Unsaved changes indicator
  createdAt: number;
  lastAccessed: number;
}
```

### 2. TabBar

**Location**: `src/components/tabbedWorkspace/TabBar.tsx`

Handles the visual representation and interaction with tabs:
- Tab rendering with icons and titles
- Close/active state management
- Drag-and-drop functionality using react-beautiful-dnd
- Tab overflow handling with dropdown menu
- Context menu for tab actions

**Features:**
- Drag-and-drop reordering
- Pin/unpin tabs
- Close tab (with unsaved changes warning)
- Close other tabs
- Close all tabs
- Duplicate tab

### 3. Tab (Individual Tab)

**Location**: `src/components/tabbedWorkspace/Tab.tsx`

Individual tab component with:
- Active/inactive state styling
- Close button with hover effect
- Context menu trigger
- Drag handle
- Unsaved changes indicator
- Pin indicator

### 4. TabContent

**Location**: `src/components/tabbedWorkspace/TabContent.tsx`

Content renderer with:
- Lazy loading for performance
- Route-based content resolution
- State restoration
- Scroll position preservation

### 5. SubTabNavigation (Hierarchical Tabs)

**Location**: `src/components/tabbedWorkspace/SubTabNavigation.tsx`

Supports nested tab hierarchies for complex workflows:
- Parent-child tab relationships
- Breadcrumb-style navigation
- Independent state per sub-tab
- Automatic parent tab creation

```typescript
interface HierarchicalTabState extends TabState {
  parentId?: string;
  children: string[];
  level: number;
  maxDepth: number;
}
```

### 6. Error Boundary

**Location**: `src/components/tabbedWorkspace/TabWorkspaceErrorBoundary.tsx`

Provides isolated error handling for each tab:
- Catches and logs errors per tab
- Displays user-friendly error messages
- Provides retry functionality
- Isolates errors to prevent cascading failures
- Allows closing crashed tabs

## State Management

### TabStore (Zustand)

**Location**: `src/stores/tabStore.ts`

Central state management for tabs:

```typescript
interface TabStore {
  tabs: TabState[];
  activeTabId: string | null;
  
  // Actions
  addTab: (tab: Omit<TabState, 'id' | 'createdAt'>) => string;
  removeTab: (id: string) => void;
  activateTab: (id: string) => void;
  reorderTabs: (startIndex: number, endIndex: number) => void;
  pinTab: (id: string) => void;
  unpinTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<TabState>) => void;
  
  // Hierarchical
  addSubTab: (parentId: string, tab: Omit<TabState, 'id'>) => string;
  removeSubTab: (parentId: string, childId: string) => void;
}
```

### Persistence Adapter

**Location**: `src/stores/adapters/tabPersistenceAdapter.ts`

Handles saving and restoring tab state:
- Serializes tab state to localStorage
- Restores tabs on application load
- Handles persistence errors gracefully
- Throttles saves for performance

## Tab Services

### URLTabSyncEngine

**Location**: `src/services/tabs/URLTabSyncEngine.ts`

Synchronizes tabs with URL state:
- Creates tabs from URL parameters
- Updates URL when tabs change
- Supports browser back/forward navigation
- Deep linking to specific tabs

### TabPersistenceService

**Location**: `src/services/tabs/TabPersistenceService.ts`

Advanced persistence with:
- Scroll position restoration
- Form data preservation
- Filter and sort state
- Tab-specific metadata

### TabStateDeriver

**Location**: `src/services/tabs/TabStateDeriver.ts`

Derives tab state from application state:
- Route-to-tab mapping
- Module-based tab grouping
- Dynamic tab titles
- Icon resolution

### TabValidationService

**Location**: `src/services/tabs/TabValidationService.ts`

Validates tab operations:
- RBAC permission checks
- Tab limit enforcement
- Duplicate prevention
- Path validation

### RouteToTabMapper

**Location**: `src/services/tabs/RouteToTabMapper.ts`

Maps routes to tab configurations:
- Route pattern matching
- Parameter extraction
- Module resolution
- Breadcrumb generation

## Initialization Sequence

1. **Application Boot**
   ```typescript
   // App.tsx
   const App = () => {
     return (
       <PluginsProvider>
         <TabbedWorkspaceProvider>
           <TabbedWorkspace>
             {/* App content */}
           </TabbedWorkspace>
         </TabbedWorkspaceProvider>
       </PluginsProvider>
     );
   };
   ```

2. **Tab Store Initialization**
   - Load saved tab state from localStorage
   - Validate and clean up stale tabs
   - Initialize empty workspace if no saved state
   - Set up persistence listeners

3. **Tab Services Initialization**
   - Initialize URL sync engine
   - Set up persistence service
   - Register keyboard shortcuts
   - Configure validation rules

4. **Tab State Restoration**
   - Restore tab content and position
   - Rehydrate tab-specific data
   - Re-establish routing context
   - Restore scroll positions

## Hierarchical Tab System

### Parent-Child Relationships

```typescript
// Creating a hierarchical tab structure
const parentTab = tabStore.addTab({
  title: 'Student Profile',
  path: '/students/123',
  module: 'administration',
});

const childTab = tabStore.addSubTab(parentTab, {
  title: 'Edit Grades',
  path: '/students/123/grades/edit',
  module: 'academics',
});
```

### Navigation Patterns

- **Breadcrumb Navigation**: Shows parent → child hierarchy
- **SubTab Bar**: Renders child tabs below parent content
- **Auto-Creation**: Child tabs can auto-create parent if needed
- **Cascade Close**: Closing parent offers to close children

## Integration with Navigation Components

### TopOverflowMenu Integration

**Location**: `src/components/TopOverflowMenu.tsx`

The TopOverflowMenu works with the tab system:
- Provides overflow actions for tabs
- Quick access to tab management
- Integration with module navigation

```typescript
// TopOverflowMenu can trigger tab actions
<TopOverflowMenu
  items={[
    { label: 'New Tab', action: () => createTab() },
    { label: 'Close All', action: () => closeAllTabs() },
  ]}
/>
```

### Sidebar Integration

- **PrimarySidebar**: Clicking modules creates/activates tabs
- **SecondarySidebar**: Contextual actions affect active tab

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close active tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+1-9` | Jump to tab 1-9 |
| `Ctrl+Shift+T` | Reopen closed tab |

## Performance Optimizations

### Memoization Strategy

**Location**: `src/components/tabbedWorkspace/OPTIMIZATION_GUIDE.md`

Key optimizations:
- `React.memo` for tab components
- `useMemo` for expensive computations
- `useCallback` for event handlers
- Virtual rendering for many tabs

### Render Loop Prevention

**Location**: `src/components/tabbedWorkspace/RENDER_LOOP_FIX_DOCUMENTATION.md`

Prevents infinite render loops:
- Stable reference patterns
- Deep equality checks
- Batched state updates
- Effect dependency management

### Lazy Loading

Tab content is lazy-loaded:
- Only active tab renders fully
- Background tabs render placeholder
- Content loads on first activation
- Scroll position restored on reactivation

## Common Issues and Solutions

### 1. Tab State Loss
**Issue**: Tabs sometimes lose their state after page refresh
**Solution**: 
```typescript
// Implement state persistence in your tab component
useEffect(() => {
  const saveState = () => {
    sessionStorage.setItem(`tab_${id}`, JSON.stringify(state));
  };
  window.addEventListener('beforeunload', saveState);
  return () => window.removeEventListener('beforeunload', saveState);
}, [id, state]);
```

### 2. Memory Leaks
**Issue**: Long-running tabs consuming excessive memory
**Solution**:
```typescript
useEffect(() => {
  return () => {
    unsubscribeFromEvents();
    clearCaches();
    cancelPendingRequests();
  };
}, []);
```

### 3. Tab Limit Handling
**Issue**: Performance degradation with too many open tabs
**Solution**: 
```typescript
const MAX_TABS = 20;
const MAX_TABS_WARNING = 15;

const createTab = () => {
  if (tabs.length >= MAX_TABS) {
    showError('Maximum tab limit reached. Please close some tabs.');
    return;
  }
  if (tabs.length >= MAX_TABS_WARNING) {
    showWarning('Many tabs open. Consider closing unused tabs.');
  }
  // Create new tab
};
```

### 4. Hierarchical Tab Confusion
**Issue**: Users confused by parent-child tab relationships
**Solution**:
- Clear visual hierarchy
- Breadcrumb navigation
- Tooltips explaining relationships
- Option to flatten hierarchy

## Debugging Tips

1. **Tab State Inspection**
   ```typescript
   // In browser console
   window.__DEBUG_TABS__ = {
     getState: () => useTabStore.getState(),
     listTabs: () => useTabStore.getState().tabs,
     getActiveTab: () => useTabStore.getState().activeTabId,
   };
   ```

2. **Performance Monitoring**
   ```typescript
   performance.mark('tab-render-start');
   // ... tab rendering ...
   performance.mark('tab-render-end');
   performance.measure('tab-render', 'tab-render-start', 'tab-render-end');
   ```

3. **Error Tracking**
   ```typescript
   class TabWorkspaceErrorBoundary extends Component {
     componentDidCatch(error: Error, info: ErrorInfo) {
       console.error('Tab Error:', {
         error,
         info,
         tabId: this.props.tabId,
         timestamp: new Date().toISOString(),
       });
     }
   }
   ```

## Best Practices

1. **State Management**
   - Keep tab-specific state isolated in TabStore
   - Use proper cleanup on tab close
   - Implement state persistence for critical data
   - Avoid storing large objects in tab state

2. **Performance**
   - Lazy load tab content
   - Use React.memo for tab components
   - Implement virtual scrolling for many tabs
   - Debounce expensive operations

3. **Error Handling**
   - Use error boundaries per tab
   - Provide meaningful error messages
   - Implement recovery mechanisms
   - Log errors for debugging

4. **Accessibility**
   - Ensure proper keyboard navigation
   - Maintain ARIA attributes
   - Support screen readers
   - Provide focus indicators

5. **Hierarchical Tabs**
   - Keep nesting shallow (max 2-3 levels)
   - Provide clear visual hierarchy
   - Allow flattening for power users
   - Document parent-child relationships

## Related Documentation

- [Tabbed Workspace Component Guide](../tabs/TABBED_WORKSPACE_COMPONENT_GUIDE.md) - Detailed component reference
- [Tabbed Workspace User Guide](../tabs/TABDED_MODE_USER_GUIDE.md) - End-user documentation
- [Optimization Guide](../../src/components/tabbedWorkspace/OPTIMIZATION_GUIDE.md) - Performance tuning
- [Render Loop Fix](../../src/components/tabbedWorkspace/RENDER_LOOP_FIX_DOCUMENTATION.md) - Debugging renders
