# Tab System Architecture

## Overview

The tab system provides a robust mechanism for managing multiple workspace contexts within the application. It allows users to work on different tasks simultaneously while maintaining state isolation and providing seamless navigation.

## Core Components

### 1. TabbedWorkspace

**Location**: `src/components/tabbedWorkspace/TabbedWorkspace.tsx`

The main container component that orchestrates all tab-related functionality. Key responsibilities:
- Tab creation and management
- Tab state persistence
- Error boundary handling
- Drag-and-drop tab reordering

```typescript
interface TabState {
  id: string;
  title: string;
  path: string;
  icon?: React.ComponentType;
  module: string;
  submodule?: string;
  metadata?: Record<string, any>;
}
```

### 2. TabBar

**Location**: `src/components/tabbedWorkspace/TabBar.tsx`

Handles the visual representation and interaction with tabs:
- Tab rendering
- Close/active state management
- Drag-and-drop functionality
- Tab overflow handling

### 3. Error Boundary

**Location**: `src/components/tabbedWorkspace/TabWorkspaceErrorBoundary.tsx`

Provides isolated error handling for each tab to prevent cascading failures:
- Catches and logs errors
- Displays user-friendly error messages
- Provides retry functionality
- Isolates errors to individual tabs

## Initialization Sequence

1. **Application Boot**
   ```typescript
   // App.tsx
   const App = () => {
     return (
       <TabbedWorkspaceProvider>
         <TabbedWorkspace>
           {/* App content */}
         </TabbedWorkspace>
       </TabbedWorkspaceProvider>
     );
   };
   ```

2. **Tab Provider Initialization**
   - Load saved tab state from storage
   - Initialize empty workspace if no saved state
   - Set up event listeners for tab state changes

3. **Tab State Restoration**
   - Restore tab content and position
   - Rehydrate tab-specific data
   - Re-establish routing context

## Common Issues and Solutions

### 1. Tab State Loss
**Issue**: Tabs sometimes lose their state after page refresh
**Solution**: 
```typescript
// Implement state persistence in your tab component
useEffect(() => {
  // Save state to localStorage/sessionStorage
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
// Implement cleanup in your tab components
useEffect(() => {
  return () => {
    // Cleanup resources
    unsubscribeFromEvents();
    clearCaches();
  };
}, []);
```

### 3. Tab Limit Handling
**Issue**: Performance degradation with too many open tabs
**Solution**: 
```typescript
// Implement tab limits in TabbedWorkspace
const MAX_TABS = 10;

const createTab = () => {
  if (tabs.length >= MAX_TABS) {
    showWarning('Please close some tabs before opening new ones');
    return;
  }
  // Create new tab
};
```

## Debugging Tips

1. **Tab State Inspection**
   ```typescript
   // In browser console
   window.__DEBUG_TABS__ = {
     getState: () => tabWorkspaceRef.current?.getState(),
     listTabs: () => tabWorkspaceRef.current?.getTabs(),
   };
   ```

2. **Performance Monitoring**
   ```typescript
   // Add performance marks in critical paths
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
   - Keep tab-specific state isolated
   - Use proper cleanup on tab close
   - Implement state persistence for critical data

2. **Performance**
   - Lazy load tab content
   - Implement virtual scrolling for many tabs
   - Use proper memoization of tab components

3. **Error Handling**
   - Use error boundaries per tab
   - Provide meaningful error messages
   - Implement recovery mechanisms

4. **Accessibility**
   - Ensure proper keyboard navigation
   - Maintain ARIA attributes
   - Support screen readers
