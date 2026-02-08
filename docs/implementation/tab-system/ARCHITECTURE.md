# Tab System Architecture v2.0

## Executive Summary

This document defines the architecture for the new URL-driven tab system that resolves synchronization issues while enabling powerful multi-tasking workflows for school administrators and teachers.

**Key Principle:** The URL is the single source of truth. Tab state is derived from the URL, not stored separately.

---

## Problem Statement

### Current Issues

1. **State Synchronization Drift**
   ```
   React Router State ──────► URL: /academics/students
          │                           │
          ▼                           ▼
   TabStore State ◄─────X────► URL Mismatch!
   ```
   When user clicks browser back, React Router updates but TabStore doesn't know.

2. **Persistence Corruption**
   - LocalStorage can become corrupted
   - No validation of stored data
   - No recovery mechanism

3. **Multi-Tasking Limitations**
   - Cannot easily compare two students side-by-side
   - Entering marks requires navigating away from attendance
   - No workflow grouping (related tabs)

4. **Browser Integration**
   - Back/forward buttons don't work correctly
   - Refreshing loses context
   - Cannot bookmark specific tab state

---

## Solution Architecture

### Core Concept: URL-Driven State

```
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER URL                             │
│  /academics/students?tab=abc123&view=list&filter=active     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    URL PARSER ENGINE                         │
│  - Extracts module, entity, view, filters                   │
│  - Generates tab configuration                              │
│  - Determines if new tab or existing                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  TAB STATE DERIVER                           │
│  - Maps URL to tab array                                    │
│  - Calculates active tab                                    │
│  - No separate state storage!                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    UI LAYER                                  │
│  - TabBar (render from derived state)                       │
│  - TabContent (render active tab)                           │
│  - Navigation (triggers URL change)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Design

### 1. URL Schema

#### Standard Entity URL
```
/{module}/{entity}?tab={tabId}&id={entityId}&action={action}&{filters}

Examples:
/academics/students?tab=stu-001&id=123&action=edit
/academics/attendance?tab=att-001&class=10A&date=2026-02-08
/finance/fees?tab=fee-001&student=123&term=Term1
```

#### Special URLs
```
/dashboard                    → Main dashboard, always pinned
/settings/database            → Settings pages
/login                        → Auth (no tabs)
/new-tab                      → Empty tab placeholder
```

#### Tab ID Generation
```typescript
// Deterministic tab ID based on content
function generateTabId(url: string): string {
  const urlObj = new URL(url, window.location.origin);
  const module = urlObj.pathname.split('/')[1];
  const entity = urlObj.pathname.split('/')[2];
  const entityId = urlObj.searchParams.get('id');
  
  // Same entity + ID = same tab
  if (entityId) {
    return `${module}-${entity}-${entityId}`;
  }
  
  // New tab for list views without specific ID
  return `${module}-${entity}-${Date.now()}`;
}
```

---

### 2. State Derivation

#### Tab Interface
```typescript
interface Tab {
  id: string;           // Generated from URL
  url: string;          // Full URL including query params
  title: string;        // Resolved from entity
  subtitle?: string;    // e.g., student name
  module: string;       // academics, finance, etc.
  entity?: string;      // students, attendance, etc.
  entityId?: string;    // Specific record ID
  view?: string;        // list, detail, edit
  isDirty: boolean;     // Unsaved changes
  pinned: boolean;      // Cannot close
  icon?: string;        // Module icon
  metadata?: {
    createdAt: number;
    lastAccessed: number;
    relatedTabs?: string[];  // IDs of related tabs
    workflow?: string;       // Workflow group ID
  };
}
```

#### Derivation Algorithm
```typescript
function deriveTabState(urls: string[]): Tab[] {
  return urls.map(url => {
    const parsed = parseURL(url);
    const entityConfig = getEntityConfig(parsed.module, parsed.entity);
    
    return {
      id: generateTabId(url),
      url,
      title: resolveTitle(parsed, entityConfig),
      subtitle: resolveSubtitle(parsed),
      module: parsed.module,
      entity: parsed.entity,
      entityId: parsed.entityId,
      view: parsed.view,
      isDirty: checkDirtyState(url),
      pinned: isPinnedUrl(url),
      icon: entityConfig?.icon,
      metadata: loadMetadata(url)
    };
  });
}
```

---

### 3. Navigation System

#### Navigation Actions
```typescript
interface NavigationAPI {
  // Basic navigation
  navigate(url: string): void;
  
  // Tab-specific navigation
  openInNewTab(url: string, options?: TabOptions): string;
  openRelatedTab(fromTabId: string, relation: Relation): string;
  duplicateTab(tabId: string): string;
  
  // Tab management
  closeTab(tabId: string): void;
  closeOtherTabs(keepTabId: string): void;
  closeTabsToRight(tabId: string): void;
  closeAllTabs(): void;
  
  // Tab organization
  pinTab(tabId: string): void;
  unpinTab(tabId: string): void;
  reorderTabs(newOrder: string[]): void;
  
  // Workflow management
  createWorkflow(name: string, tabIds: string[]): string;
  closeWorkflow(workflowId: string): void;
}
```

#### URL Manipulation
```typescript
class URLManager {
  // Add tab to URL without navigation
  addTabToUrl(url: string): string {
    const currentUrl = new URL(window.location.href);
    const tabs = currentUrl.searchParams.getAll('tabs');
    
    if (!tabs.includes(url)) {
      tabs.push(url);
    }
    
    currentUrl.searchParams.delete('tabs');
    tabs.forEach(tab => currentUrl.searchParams.append('tabs', tab));
    
    return currentUrl.toString();
  }
  
  // Remove tab from URL
  removeTabFromUrl(tabId: string): string {
    // Implementation...
  }
  
  // Set active tab
  setActiveTab(tabId: string): string {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('active', tabId);
    return currentUrl.toString();
  }
}
```

---

### 4. Multi-Tasking Workflow Support

#### Workflow Concept
A workflow is a group of related tabs that represent a business process.

```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  tabs: string[];        // Ordered tab IDs
  primaryTab: string;    // Main tab of workflow
  createdAt: number;
  status: 'active' | 'completed' | 'suspended';
}

// Example workflows
const enrollmentWorkflow: Workflow = {
  id: 'wf-enroll-001',
  name: 'New Student Enrollment',
  tabs: ['stu-new', 'par-new', 'pay-setup', 'doc-upload'],
  primaryTab: 'stu-new',
  status: 'active'
};
```

#### Workflow Integration
```typescript
// When opening related entity
function openRelatedTab(
  sourceTabId: string,
  target: { module: string; entity: string; id?: string },
  relation: 'child' | 'parent' | 'reference'
): string {
  const sourceTab = getTab(sourceTabId);
  const newTabId = openInNewTab(buildUrl(target));
  
  // Link tabs
  linkTabs(sourceTabId, newTabId, relation);
  
  // Add to workflow if source is in one
  const workflow = findWorkflowForTab(sourceTabId);
  if (workflow) {
    addTabToWorkflow(workflow.id, newTabId);
  }
  
  return newTabId;
}
```

#### Common Workflows

1. **New Student Enrollment**
   ```
   Tab 1: Student Registration Form (primary)
   Tab 2: Parent/Guardian Registration
   Tab 3: Fee Structure Assignment
   Tab 4: Document Upload
   ```

2. **Attendance + Grading**
   ```
   Tab 1: Class Attendance (primary)
   Tab 2: Student List (reference)
   Tab 3: Marks Entry
   ```

3. **Fee Management**
   ```
   Tab 1: Fee Template (primary)
   Tab 2: Student Balances
   Tab 3: Payment Recording
   Tab 4: Receipt Generation
   ```

---

### 5. Persistence Strategy

#### Layered Persistence
```typescript
interface PersistenceLayer {
  // Layer 1: URL (immediate, always available)
  primary: {
    type: 'url-params';
    encode(tabs: Tab[]): string;
    decode(url: string): Tab[];
  };
  
  // Layer 2: sessionStorage (survives refresh)
  secondary: {
    type: 'session-storage';
    key: 'sp_tabs_current';
    ttl: number; // 4 hours
  };
  
  // Layer 3: localStorage (survives restart)
  tertiary: {
    type: 'local-storage';
    key: 'sp_tabs_persistent';
    compress: true;
    maxAge: number; // 30 days
  };
  
  // Layer 4: IndexedDB (large data, async)
  quaternary: {
    type: 'indexed-db';
    store: 'tab-sessions';
    version: 1;
  };
}
```

#### Recovery Mechanism
```typescript
class TabStateRecovery {
  async recover(): Promise<Tab[] | null> {
    // Try layers in order
    const layers = [
      () => this.recoverFromURL(),
      () => this.recoverFromSessionStorage(),
      () => this.recoverFromLocalStorage(),
      () => this.recoverFromIndexedDB()
    ];
    
    for (const layer of layers) {
      try {
        const tabs = await layer();
        if (tabs && tabs.length > 0) {
          if (await this.validateTabs(tabs)) {
            return tabs;
          }
        }
      } catch (e) {
        console.warn('Recovery layer failed:', e);
      }
    }
    
    return null; // Fallback to default
  }
  
  async validateTabs(tabs: Tab[]): Promise<boolean> {
    // Validate with Zod schema
    // Check URLs are still valid routes
    // Remove invalid tabs
  }
}
```

---

### 6. Browser Integration

#### History Management
```typescript
class TabHistoryManager {
  private history: string[] = [];
  private index = -1;
  
  push(url: string): void {
    // Remove forward history
    this.history = this.history.slice(0, this.index + 1);
    this.history.push(url);
    this.index++;
    
    // Update browser history
    window.history.pushState({ tabUrl: url }, '', url);
  }
  
  back(): void {
    if (this.index > 0) {
      this.index--;
      const url = this.history[this.index];
      window.history.replaceState({ tabUrl: url }, '', url);
    }
  }
  
  // Handle browser back/forward
  handlePopState(event: PopStateEvent): void {
    const tabUrl = event.state?.tabUrl;
    if (tabUrl) {
      this.restoreTabFromUrl(tabUrl);
    }
  }
}
```

#### Keyboard Shortcuts
```typescript
const keyboardShortcuts = {
  // Tab navigation
  'Ctrl+Tab': 'next-tab',
  'Ctrl+Shift+Tab': 'previous-tab',
  'Ctrl+W': 'close-tab',
  'Ctrl+Shift+T': 'reopen-closed-tab',
  
  // New tabs
  'Ctrl+T': 'new-empty-tab',
  'Ctrl+Click': 'open-in-new-tab',
  
  // Workflows
  'Ctrl+G': 'group-tabs',
  'Ctrl+Shift+G': 'close-workflow',
  
  // Special
  'Ctrl+1-9': 'go-to-tab-n',
  'Ctrl+S': 'save-current-tab',
  'Ctrl+R': 'refresh-current-tab'
};
```

---

## Component Architecture

### TabBar Component
```typescript
interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabReorder: (fromIndex: number, toIndex: number) => void;
  maxVisibleTabs?: number;
  enableGrouping?: boolean;
}

// Implementation notes:
// - Use react-beautiful-dnd for drag-drop reordering
// - Virtualize if >20 tabs
// - Collapse overflow into dropdown
// - Show workflow indicators
```

### TabContent Component
```typescript
interface TabContentProps {
  tab: Tab;
  isActive: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  onTitleChange: (title: string) => void;
}

// Implementation notes:
// - Lazy load component based on tab.module/tab.entity
// - Use React.Suspense for loading states
// - Keep mounted but hidden for quick switching
// - Unmount after 5 inactive minutes (configurable)
```

### Navigation Integration
```typescript
// In Sidebar/Navigation items
const handleNavigationClick = (item: NavItem, event: MouseEvent) => {
  if (event.ctrlKey || event.metaKey) {
    // Open in new tab
    openInNewTab(item.path);
  } else if (event.shiftKey) {
    // Open in new window
    openInNewWindow(item.path);
  } else {
    // Normal navigation
    navigate(item.path);
  }
};
```

---

## Migration from v1.0

### Step 1: Dual System (Week 1)
```typescript
// Run both systems side by side
const useHybridTabSystem = () => {
  const legacy = useLegacyTabStore();
  const modern = useModernTabSystem();
  
  // Feature flag controls which is active
  const enabled = useFeatureFlag('new-tab-system');
  
  return enabled ? modern : legacy;
};
```

### Step 2: Data Migration (Week 2)
```typescript
const migrateTabState = (): string[] => {
  const legacyTabs = localStorage.getItem('tabbed-workspace-storage');
  if (!legacyTabs) return [];
  
  const parsed = JSON.parse(legacyTabs);
  return parsed.state.tabs.map((tab: LegacyTab) => {
    // Convert to URL format
    return buildUrl({
      module: tab.module,
      entity: tab.entity,
      id: tab.entityId,
      view: tab.view
    });
  });
};
```

### Step 3: Full Cutover (Week 3)
- Remove legacy code
- Update all navigation calls
- Clean up LocalStorage keys

---

## Performance Considerations

### Tab Rendering
```typescript
// Optimization strategies:

// 1. Virtualize long tab lists
<TabBar>
  <VirtualizedList
    items={tabs}
    renderItem={TabItem}
    overscan={5}
  />
</TabBar>

// 2. Memoize tab content
const TabContent = React.memo(({ tab }) => {
  // Only re-render if tab props change
}, (prev, next) => {
  return prev.tab.url === next.tab.url &&
         prev.tab.isDirty === next.tab.isDirty;
});

// 3. Lazy load inactive tabs
const LazyTab = ({ tab, isActive }) => {
  const [isMounted, setIsMounted] = useState(isActive);
  
  useEffect(() => {
    if (isActive) setIsMounted(true);
    // Unmount after delay when inactive
    else setTimeout(() => setIsMounted(false), 300000);
  }, [isActive]);
  
  return isMounted ? <ActualContent tab={tab} /> : null;
};
```

### URL Parsing
```typescript
// Cache parsed URLs
const urlCache = new Map<string, ParsedURL>();

function parseURL(url: string): ParsedURL {
  if (urlCache.has(url)) {
    return urlCache.get(url)!;
  }
  
  const parsed = expensiveParse(url);
  urlCache.set(url, parsed);
  
  // LRU cache - clear oldest if >1000 entries
  if (urlCache.size > 1000) {
    const firstKey = urlCache.keys().next().value;
    urlCache.delete(firstKey);
  }
  
  return parsed;
}
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('TabStateDeriver', () => {
  it('should derive tabs from URLs', () => {
    const urls = [
      '/academics/students?id=123',
      '/finance/fees?student=123'
    ];
    
    const tabs = deriveTabState(urls);
    
    expect(tabs).toHaveLength(2);
    expect(tabs[0].module).toBe('academics');
    expect(tabs[0].entity).toBe('students');
  });
  
  it('should deduplicate same entity+id', () => {
    const urls = [
      '/academics/students?id=123',
      '/academics/students?id=123&view=edit'
    ];
    
    const tabs = deriveTabState(urls);
    expect(tabs).toHaveLength(1); // Same student
  });
});
```

### Integration Tests
```typescript
describe('Multi-Tasking Workflows', () => {
  it('should create enrollment workflow', async () => {
    const { user } = render(<App />);
    
    // Start enrollment
    await user.click(screen.getByText('New Student'));
    expect(screen.getByText('Student Registration')).toBeVisible();
    
    // Open parent registration in new tab
    await user.keyboard('{Control>}p{/Control}');
    expect(screen.getByText('Parent Registration')).toBeVisible();
    
    // Both tabs should show
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
```

### E2E Tests
```typescript
test('should survive page refresh', async ({ page }) => {
  // Open multiple tabs
  await page.goto('/academics/students?id=1');
  await page.keyboard.press('Control+t');
  await page.goto('/academics/students?id=2');
  
  // Refresh
  await page.reload();
  
  // Both tabs should be restored
  const tabs = await page.locator('[role="tab"]').count();
  expect(tabs).toBe(2);
});
```

---

## Deployment Mode Adaptations

### Standalone Mode
- Store tabs in URL + localStorage
- No cross-tab sync needed
- Aggressive caching

### Networked Mode
- Broadcast tab changes via WebSocket
- Leader election for tab state
- Collaborative tab viewing

### SaaS Mode
- Persist tab state to user profile
- Sync across devices
- Session restoration on login

### Mobile Mode
- Bottom sheet instead of top tabs
- Maximum 5 tabs (screen real estate)
- Swipe gestures for tab switching

---

## Appendix: Migration Checklist

### Pre-Migration
- [ ] Backup all existing tab data
- [ ] Document current user workflows
- [ ] Set up feature flags
- [ ] Create rollback plan

### Migration
- [ ] Deploy URL-driven system behind flag
- [ ] Migrate existing tab data
- [ ] Test all navigation paths
- [ ] Verify browser integration
- [ ] Enable for beta users
- [ ] Monitor error rates

### Post-Migration
- [ ] Remove legacy code
- [ ] Update documentation
- [ ] Train support team
- [ ] Announce new features
- [ ] Gather user feedback

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-08  
**Author:** Architecture Team
