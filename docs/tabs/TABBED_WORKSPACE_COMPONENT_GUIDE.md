# Tabbed Workspace Component Guide

A comprehensive reference for all components in the tabbed workspace system.

## Table of Contents

1. [TabbedWorkspace](#tabbedworkspace)
2. [TabBar](#tabbar)
3. [Tab](#tab)
4. [TabContent](#tabcontent)
5. [SubTabNavigation](#subtabnavigation)
6. [TabWorkspaceErrorBoundary](#tabworkspaceerrorboundary)
7. [Hooks](#hooks)
8. [Services](#services)

---

## TabbedWorkspace

**Location**: `src/components/tabbedWorkspace/TabbedWorkspace.tsx`

The main container component that orchestrates the entire tabbed workspace.

### Props

```typescript
interface TabbedWorkspaceProps {
  children?: React.ReactNode;
  maxTabs?: number;                    // Maximum allowed tabs (default: 20)
  enablePersistence?: boolean;         // Enable state persistence (default: true)
  enableDragDrop?: boolean;            // Enable drag-and-drop (default: true)
  enableHierarchical?: boolean;        // Enable sub-tabs (default: true)
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
}
```

### Usage

```typescript
import { TabbedWorkspace } from '@/components/tabbedWorkspace/TabbedWorkspace';

function App() {
  return (
    <TabbedWorkspace
      maxTabs={15}
      enablePersistence={true}
      enableDragDrop={true}
      onTabChange={(tabId) => console.log('Active tab:', tabId)}
    >
      <Router />
    </TabbedWorkspace>
  );
}
```

### Features

- **State Management**: Integrates with Zustand tab store
- **Persistence**: Automatically saves/loads tab state
- **Drag-and-Drop**: Reorder tabs via drag handles
- **Error Boundaries**: Isolates errors to individual tabs
- **Hierarchical Tabs**: Supports parent-child relationships

---

## TabBar

**Location**: `src/components/tabbedWorkspace/TabBar.tsx`

Renders the horizontal tab bar with drag-and-drop support.

### Props

```typescript
interface TabBarProps {
  tabs: TabState[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabReorder: (startIndex: number, endIndex: number) => void;
  onTabPin?: (tabId: string) => void;
  onTabUnpin?: (tabId: string) => void;
  maxVisibleTabs?: number;             // Tabs before overflow (default: 10)
}
```

### Features

- **Drag-and-Drop**: Uses react-beautiful-dnd for reordering
- **Overflow Handling**: Shows dropdown for excess tabs
- **Context Menu**: Right-click for tab actions
- **Pinning**: Pin important tabs to the left
- **Visual Indicators**: Active state, unsaved changes, close button

### Context Menu Actions

| Action | Description |
|--------|-------------|
| Close | Close the clicked tab |
| Close Others | Close all tabs except this one |
| Close All | Close all tabs |
| Duplicate | Create a copy of this tab |
| Pin/Unpin | Pin or unpin the tab |
| Reload | Reload tab content |

---

## Tab

**Location**: `src/components/tabbedWorkspace/Tab.tsx`

Individual tab component with interactive features.

### Props

```typescript
interface TabProps {
  tab: TabState;
  isActive: boolean;
  isDragging?: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}
```

### Tab State Interface

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
  isPinned?: boolean;
  isDirty?: boolean;        // Unsaved changes
  createdAt: number;
  lastAccessed: number;
}
```

### Visual States

- **Active**: Highlighted background, bold text
- **Inactive**: Subtle background
- **Dragging**: Elevated shadow, reduced opacity
- **Pinned**: Lock icon, stays at left
- **Dirty**: Dot indicator for unsaved changes
- **Hover**: Close button appears

---

## TabContent

**Location**: `src/components/tabbedWorkspace/TabContent.tsx`

Renders the content area for tabs with lazy loading.

### Props

```typescript
interface TabContentProps {
  tabId: string;
  route: string;
  isActive: boolean;
  preserveState?: boolean;    // Keep state when inactive (default: true)
  lazyLoad?: boolean;         // Defer rendering until first active (default: true)
}
```

### Features

- **Lazy Loading**: Only renders when tab becomes active
- **State Preservation**: Maintains scroll position and form data
- **Route Resolution**: Maps routes to components
- **Error Boundaries**: Catches rendering errors

### State Preservation

The following state is preserved when switching tabs:
- Scroll position
- Form input values
- Filter/sort selections
- Pagination state
- Expanded/collapsed sections

---

## SubTabNavigation

**Location**: `src/components/tabbedWorkspace/SubTabNavigation.tsx`

Navigation component for hierarchical (parent-child) tabs.

### Props

```typescript
interface SubTabNavigationProps {
  parentTabId: string;
  subTabs: TabState[];
  activeSubTabId?: string;
  onSubTabClick: (tabId: string) => void;
  onSubTabClose: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';  // default: 'horizontal'
}
```

### Usage

```typescript
<SubTabNavigation
  parentTabId="student-123"
  subTabs={[
    { id: 'grades', title: 'Grades', path: '/students/123/grades' },
    { id: 'attendance', title: 'Attendance', path: '/students/123/attendance' },
  ]}
  activeSubTabId="grades"
  onSubTabClick={(id) => activateSubTab(id)}
/>
```

### Hierarchical Tab Creation

```typescript
// Create parent tab
const parentId = tabStore.addTab({
  title: 'Student Profile',
  path: '/students/123',
  module: 'administration',
});

// Create child tab
tabStore.addSubTab(parentId, {
  title: 'Edit Grades',
  path: '/students/123/grades/edit',
  module: 'academics',
});
```

---

## TabWorkspaceErrorBoundary

**Location**: `src/components/tabbedWorkspace/TabWorkspaceErrorBoundary.tsx`

Error boundary that isolates crashes to individual tabs.

### Props

```typescript
interface TabWorkspaceErrorBoundaryProps {
  tabId: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: React.ReactNode;    // Custom error UI
}
```

### Error UI

Default error display includes:
- Error message
- Retry button
- Close tab button
- Error details (in development)

### Usage

```typescript
<TabWorkspaceErrorBoundary tabId={tab.id}>
  <TabContent tabId={tab.id} route={tab.path} />
</TabWorkspaceErrorBoundary>
```

---

## Hooks

### useTabs

**Location**: `src/hooks/tabs/useTabs.ts`

Main hook for tab operations.

```typescript
function useTabs() {
  return {
    // State
    tabs: TabState[];
    activeTabId: string | null;
    activeTab: TabState | undefined;
    
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
    getSubTabs: (parentId: string) => TabState[];
    
    // Utilities
    findTabByPath: (path: string) => TabState | undefined;
    closeAllTabs: () => void;
    closeOtherTabs: (keepId: string) => void;
  };
}
```

### useTabPersistence

**Location**: `src/hooks/tabs/useTabPersistence.ts`

Hook for persisting tab-specific state.

```typescript
function useTabPersistence<T>(tabId: string, key: string, defaultValue: T) {
  return {
    value: T;
    setValue: (value: T) => void;
    clearValue: () => void;
  };
}

// Usage
const { value: scrollPosition, setValue: setScrollPosition } = useTabPersistence(
  tabId,
  'scrollPosition',
  0
);
```

---

## Services

### URLTabSyncEngine

**Location**: `src/services/tabs/URLTabSyncEngine.ts`

Synchronizes tab state with URL parameters.

```typescript
class URLTabSyncEngine {
  // Create tabs from URL on app load
  syncTabsFromURL(): TabState[];
  
  // Update URL when tabs change
  syncURLFromTabs(tabs: TabState[]): void;
  
  // Enable/disable sync
  setEnabled(enabled: boolean): void;
}
```

### TabPersistenceService

**Location**: `src/services/tabs/TabPersistenceService.ts`

Advanced persistence with state restoration.

```typescript
class TabPersistenceService {
  // Save tab state
  saveTabState(tabId: string, state: TabPersistentState): void;
  
  // Load tab state
  loadTabState(tabId: string): TabPersistentState | null;
  
  // Clear saved state
  clearTabState(tabId: string): void;
}

interface TabPersistentState {
  scrollPosition: { x: number; y: number };
  formData: Record<string, any>;
  filters: Record<string, any>;
  sortConfig: { field: string; direction: 'asc' | 'desc' };
  expandedSections: string[];
}
```

### TabValidationService

**Location**: `src/services/tabs/TabValidationService.ts`

Validates tab operations against RBAC and limits.

```typescript
class TabValidationService {
  // Check if user can create tab
  canCreateTab(user: User, module: string): boolean;
  
  // Check if tab limit reached
  isWithinTabLimit(currentCount: number, maxTabs: number): boolean;
  
  // Validate tab path
  isValidPath(path: string): boolean;
}
```

---

## Keyboard Shortcuts

The tab system supports the following keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | Open new tab |
| `Ctrl+W` | Close active tab |
| `Ctrl+Tab` | Switch to next tab |
| `Ctrl+Shift+Tab` | Switch to previous tab |
| `Ctrl+1-9` | Switch to tab at position 1-9 |
| `Ctrl+Shift+T` | Reopen last closed tab |
| `Ctrl+Alt+T` | Duplicate current tab |
| `Ctrl+Shift+W` | Close all tabs |

---

## Styling

### CSS Variables

```css
:root {
  --tab-height: 40px;
  --tab-bg-inactive: #f3f4f6;
  --tab-bg-active: #ffffff;
  --tab-bg-hover: #e5e7eb;
  --tab-border: #d1d5db;
  --tab-text: #374151;
  --tab-text-active: #111827;
  --tab-pin-color: #f59e0b;
  --tab-dirty-indicator: #ef4444;
}
```

### Tailwind Classes

Common styling patterns:

```typescript
// Tab container
className="flex items-center h-10 px-4 bg-gray-100 border-r border-gray-300"

// Active tab
className="bg-white border-t-2 border-blue-500 text-gray-900"

// Inactive tab
className="bg-gray-100 text-gray-600 hover:bg-gray-200"

// Dragging state
className="opacity-50 shadow-lg"
```

---

## Best Practices

1. **Tab Creation**
   - Check if tab already exists before creating
   - Set meaningful titles and icons
   - Include module information for RBAC

2. **State Management**
   - Use `useTabPersistence` for tab-specific state
   - Clean up state when tab closes
   - Avoid storing large objects in tab state

3. **Performance**
   - Enable lazy loading for heavy components
   - Use React.memo for tab content
   - Debounce expensive operations

4. **Error Handling**
   - Wrap tab content in error boundaries
   - Provide meaningful error messages
   - Allow users to retry or close crashed tabs

5. **Accessibility**
   - Include ARIA labels
   - Support keyboard navigation
   - Provide focus indicators

---

## Related Documentation

- [Tab System Architecture](../architecture/tab-system.md) - Architectural overview
- [Tabbed Workspace User Guide](./TABDED_MODE_USER_GUIDE.md) - End-user documentation
- [Optimization Guide](../../src/components/tabbedWorkspace/OPTIMIZATION_GUIDE.md) - Performance tuning
- [Render Loop Fix](../../src/components/tabbedWorkspace/RENDER_LOOP_FIX_DOCUMENTATION.md) - Debugging
