# Tab System Migration Guide

## Breaking Changes

### 1. Navigation API Changes

#### Before
```typescript
// Old route-based navigation
router.push('/students/list');

// Old tab management
const tab = {
  id: generateId(),
  title: 'Students',
  component: StudentsListPage,
};
tabManager.openTab(tab);
```

#### After
```typescript
// New tab-based navigation
const result = await navigateToTab('/students/list', {
  title: 'Students',
  icon: UsersIcon,
  module: 'students',
  metadata: {
    source: 'navigation',
    timestamp: new Date().toISOString()
  }
});

// Handle result
if (result.wasCreated) {
  showInfo(`Opened Students in new tab`);
}
```

### 2. Tab State Management

#### Before
```typescript
// Old global state management
const globalState = useGlobalState();
const students = globalState.students;

// Component-level state
const [localState, setLocalState] = useState(initialState);
```

#### After
```typescript
// New isolated tab state
const { tabId } = useTabContext();
const tabState = useTabState(tabId);

// Per-tab persistence
useEffect(() => {
  return () => {
    // Cleanup tab state on unmount
    cleanupTabState(tabId);
  };
}, [tabId]);
```

### 3. Error Handling

#### Before
```typescript
// Old global error boundary
try {
  // Component logic
} catch (error) {
  showError('An error occurred');
}
```

#### After
```typescript
// New per-tab error boundary
<TabWorkspaceErrorBoundary>
  <TabContent />
</TabWorkspaceErrorBoundary>
```

## Migration Steps

1. **Update Navigation Logic**
   ```typescript
   // 1. Replace direct routing calls
   - router.push('/path')
   + await navigateToTab('/path', options)

   // 2. Update link components
   - <Link to="/path">
   + <TabLink to="/path">

   // 3. Handle navigation results
   const result = await navigateToTab(path, options);
   if (result.wasCreated) {
     // Handle new tab creation
   }
   ```

2. **Convert State Management**
   ```typescript
   // 1. Identify tab-specific state
   const tabState = {
     filters: {},
     sorting: {},
     pagination: {},
     selectedItems: [],
   };

   // 2. Use tab context
   const { tabId } = useTabContext();
   const state = useTabState(tabId);

   // 3. Implement cleanup
   useEffect(() => {
     return () => cleanupTabState(tabId);
   }, [tabId]);
   ```

3. **Add Error Boundaries**
   ```typescript
   // 1. Wrap tab content
   <TabWorkspaceErrorBoundary>
     <YourTabContent />
   </TabWorkspaceErrorBoundary>

   // 2. Implement error reporting
   class TabWorkspaceErrorBoundary extends Component {
     componentDidCatch(error, info) {
       reportError({
         error,
         info,
         tabId: this.props.tabId,
       });
     }
   }
   ```

## Troubleshooting

### Common Issues

1. **Lost Tab State**
   ```typescript
   // Problem: Tab state disappears after refresh
   // Solution: Implement state persistence
   const persistTabState = () => {
     const state = getTabState(tabId);
     sessionStorage.setItem(`tab_${tabId}`, JSON.stringify(state));
   };
   
   // Add to cleanup
   window.addEventListener('beforeunload', persistTabState);
   ```

2. **Memory Leaks**
   ```typescript
   // Problem: Memory usage grows with tabs
   // Solution: Proper cleanup
   useEffect(() => {
     const subscription = subscribe();
     return () => {
       subscription.unsubscribe();
       cleanupTabResources(tabId);
     };
   }, [tabId]);
   ```

3. **Navigation Conflicts**
   ```typescript
   // Problem: Multiple navigation sources
   // Solution: Centralize through tab system
   const navigate = async (path) => {
     try {
       await navigateToTab(path, options);
     } catch (error) {
       // Handle navigation error
       showError('Navigation failed');
     }
   };
   ```

### Debugging

1. **Tab State Inspection**
   ```typescript
   // Add debug helpers
   if (process.env.NODE_ENV === 'development') {
     window.__TAB_DEBUG__ = {
       getState: (tabId) => getTabState(tabId),
       listTabs: () => getAllTabs(),
       inspectTab: (tabId) => getTabDetails(tabId),
     };
   }
   ```

2. **Performance Monitoring**
   ```typescript
   // Add performance marks
   performance.mark('tab-operation-start');
   await performTabOperation();
   performance.mark('tab-operation-end');
   
   // Measure and log
   const measure = performance.measure(
     'tab-operation',
     'tab-operation-start',
     'tab-operation-end'
   );
   console.log(`Tab operation took ${measure.duration}ms`);
   ```

## Migration Checklist

- [ ] Update all direct routing calls to use tab navigation
- [ ] Identify and isolate tab-specific state
- [ ] Implement proper state cleanup for all tabs
- [ ] Add error boundaries to tab components
- [ ] Update navigation components to use tab system
- [ ] Implement state persistence where needed
- [ ] Add performance monitoring
- [ ] Test all tab operations
- [ ] Verify cleanup and memory management
- [ ] Update documentation and comments

### Testing Points

1. **Navigation**
   - Multiple tab creation
   - Tab switching
   - State preservation
   - URL synchronization

2. **State Management**
   - Isolated state per tab
   - State persistence
   - Cleanup on tab close
   - Memory usage

3. **Error Handling**
   - Individual tab errors
   - Recovery mechanisms
   - Error reporting
   - User feedback

4. **Performance**
   - Tab creation time
   - Memory usage
   - State restoration
   - Navigation responsiveness
