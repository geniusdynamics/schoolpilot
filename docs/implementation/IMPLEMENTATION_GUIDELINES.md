# Implementation Guidelines

## Overview

This document provides step-by-step implementation guidelines for the roadmap, including coding standards, testing requirements, and deployment procedures.

---

## Phase 1 Implementation Details

### Week 1-2: Tab System

#### Task 1.1: URL-Driven Tab Architecture

**File Structure:**
```
src/services/tabs/
├── URLTabSyncEngine.ts       # Core sync engine
├── TabStateDeriver.ts        # State derivation logic
├── TabPersistence.ts         # Persistence layers
├── types.ts                  # TypeScript interfaces
└── index.ts                  # Public API

src/hooks/tabs/
├── useTabs.ts               # Main hook
├── useTabNavigation.ts      # Navigation helpers
├── useWorkflow.ts           # Workflow management
└── index.ts
```

**Implementation Steps:**

1. **Create URL Parser**
```typescript
// src/services/tabs/URLTabSyncEngine.ts

export class URLTabSyncEngine {
  private subscribers: Set<(tabs: Tab[]) => void> = new Set();
  
  constructor() {
    // Listen for URL changes
    window.addEventListener('popstate', () => this.handleURLChange());
  }
  
  parseURL(url: string = window.location.href): ParsedTabState {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    // Parse tabs from URL
    const tabsParam = params.get('tabs');
    const tabs: Tab[] = tabsParam 
      ? JSON.parse(decodeURIComponent(tabsParam))
      : [this.createDefaultTab()];
    
    const activeTabId = params.get('active') || tabs[0]?.id;
    
    return { tabs, activeTabId };
  }
  
  updateURL(tabs: Tab[], activeTabId: string): void {
    const url = new URL(window.location.href);
    
    // Serialize tabs
    url.searchParams.set('tabs', encodeURIComponent(JSON.stringify(tabs)));
    url.searchParams.set('active', activeTabId);
    
    // Update URL without navigation
    window.history.replaceState({}, '', url.toString());
    
    // Notify subscribers
    this.subscribers.forEach(cb => cb(tabs));
  }
  
  subscribe(callback: (tabs: Tab[]) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  private createDefaultTab(): Tab {
    return {
      id: 'tab-' + Date.now(),
      url: '/dashboard',
      title: 'Dashboard',
      module: 'dashboard',
      isDirty: false,
      pinned: true
    };
  }
}
```

2. **Create State Deriver**
```typescript
// src/services/tabs/TabStateDeriver.ts

export class TabStateDeriver {
  deriveFromURLs(urls: string[]): Tab[] {
    return urls.map(url => this.deriveTab(url));
  }
  
  private deriveTab(url: string): Tab {
    const parsed = new URL(url, window.location.origin);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    
    const module = pathParts[0] || 'dashboard';
    const entity = pathParts[1];
    const entityId = parsed.searchParams.get('id');
    
    // Resolve title from module/entity
    const title = this.resolveTitle(module, entity, entityId);
    
    // Generate deterministic ID
    const id = entityId 
      ? `${module}-${entity}-${entityId}`
      : `${module}-${Date.now()}`;
    
    return {
      id,
      url,
      title,
      module,
      entity,
      entityId: entityId || undefined,
      isDirty: false,
      pinned: module === 'dashboard'
    };
  }
  
  private resolveTitle(module: string, entity?: string, entityId?: string | null): string {
    // Use i18n for titles
    if (entity && entityId) {
      return i18n.t(`${module}.${entity}.detail`, { id: entityId });
    }
    if (entity) {
      return i18n.t(`${module}.${entity}.list`);
    }
    return i18n.t(`${module}.dashboard`);
  }
}
```

3. **Create React Hook**
```typescript
// src/hooks/tabs/useTabs.ts

export function useTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const engine = useMemo(() => new URLTabSyncEngine(), []);
  const deriver = useMemo(() => new TabStateDeriver(), []);
  
  // Initialize from URL
  useEffect(() => {
    const { tabs: parsedTabs, activeTabId: parsedActive } = engine.parseURL();
    setTabs(parsedTabs);
    setActiveTabId(parsedActive);
    
    // Subscribe to changes
    const unsubscribe = engine.subscribe((newTabs) => {
      setTabs(newTabs);
    });
    
    return unsubscribe;
  }, [engine]);
  
  const activateTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    engine.updateURL(tabs, tabId);
    
    // Navigate to tab URL
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      window.history.pushState({}, '', tab.url);
    }
  }, [tabs, engine]);
  
  const openTab = useCallback((url: string, options?: TabOptions) => {
    const newTab = deriver.deriveTab(url);
    
    // Check if tab already exists
    const existingIndex = tabs.findIndex(t => t.id === newTab.id);
    
    let newTabs: Tab[];
    if (existingIndex >= 0) {
      // Activate existing
      newTabs = tabs;
      activateTab(tabs[existingIndex].id);
    } else {
      // Create new
      newTabs = [...tabs, { ...newTab, ...options }];
      setTabs(newTabs);
      activateTab(newTab.id);
    }
    
    engine.updateURL(newTabs, newTab.id);
    
    return newTab.id;
  }, [tabs, deriver, engine, activateTab]);
  
  const closeTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.pinned) return; // Can't close pinned tabs
    
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    
    // Activate another tab if closing active
    if (activeTabId === tabId && newTabs.length > 0) {
      const newActive = newTabs[Math.min(
        tabs.findIndex(t => t.id === tabId),
        newTabs.length - 1
      )];
      setActiveTabId(newActive.id);
    }
    
    engine.updateURL(newTabs, activeTabId === tabId ? newTabs[0]?.id : activeTabId);
  }, [tabs, activeTabId, engine]);
  
  return {
    tabs,
    activeTabId,
    activateTab,
    openTab,
    closeTab
  };
}
```

---

### Week 3: Data Layer

#### Task 1.4: Unified Data Provider

**File Structure:**
```
src/services/data/
├── types.ts                  # Core interfaces
├── UnifiedDataService.ts     # Main service
├── providers/
│   ├── SQLiteProvider.ts
│   ├── PouchDBProvider.ts
│   ├── BackendAPIProvider.ts
│   └── index.ts
├── hooks/
│   ├── useCollection.ts
│   ├── useDocument.ts
│   └── useMutation.ts
└── index.ts
```

**Implementation Steps:**

1. **Define Core Types**
```typescript
// src/services/data/types.ts

export interface DataProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  
  initialize(config: any): Promise<void>;
  find<T>(collection: string, query: Query): Promise<PaginatedResult<T>>;
  findOne<T>(collection: string, id: string): Promise<T | null>;
  create<T>(collection: string, data: any): Promise<T>;
  update<T>(collection: string, id: string, data: any): Promise<T>;
  delete(collection: string, id: string): Promise<void>;
  subscribe?<T>(collection: string, query: Query): Observable<T[]>;
}

export interface Query {
  filter?: Record<string, any>;
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  pagination?: { page: number; pageSize: number };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
```

2. **Implement SQLite Provider**
```typescript
// src/services/data/providers/SQLiteProvider.ts

export class SQLiteProvider implements DataProvider {
  readonly name = 'sqlite';
  readonly capabilities: ProviderCapabilities = {
    realtime: false,
    sync: false,
    transactions: true,
    offline: true,
    encryption: true,
    fullTextSearch: true,
    relations: true
  };
  
  private db: any; // SQLite instance
  
  async initialize(config: { filename: string }): Promise<void> {
    const sqlite = await initSqlJs({
      locateFile: file => `/sqlite/${file}`
    });
    
    // Try to load existing or create new
    try {
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle(config.filename);
      const file = await handle.getFile();
      const buffer = await file.arrayBuffer();
      this.db = new sqlite.Database(new Uint8Array(buffer));
    } catch {
      this.db = new sqlite.Database();
    }
    
    // Create tables if not exist
    await this.initializeSchema();
  }
  
  async find<T>(collection: string, query: Query): Promise<PaginatedResult<T>> {
    const { page = 1, pageSize = 50 } = query.pagination || {};
    const offset = (page - 1) * pageSize;
    
    // Build SQL
    let sql = `SELECT * FROM ${collection}`;
    const where = this.buildWhereClause(query.filter);
    if (where) sql += ` WHERE ${where}`;
    
    if (query.sort) {
      const orderBy = query.sort.map(s => `${s.field} ${s.direction}`).join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }
    
    sql += ` LIMIT ${pageSize} OFFSET ${offset}`;
    
    // Execute
    const results = this.db.exec(sql);
    const data = this.transformResults(results);
    
    // Get total count
    const countSql = `SELECT COUNT(*) FROM ${collection}${where ? ` WHERE ${where}` : ''}`;
    const countResult = this.db.exec(countSql);
    const totalCount = countResult[0]?.values[0][0] || 0;
    
    return {
      data,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    };
  }
  
  private buildWhereClause(filter?: Record<string, any>): string | null {
    if (!filter) return null;
    
    const conditions = Object.entries(filter).map(([key, value]) => {
      if (typeof value === 'object') {
        // Handle operators like $gt, $lt
        return this.buildOperatorCondition(key, value);
      }
      return `${key} = ${this.escapeValue(value)}`;
    });
    
    return conditions.join(' AND ');
  }
  
  private escapeValue(value: any): string {
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'number') return value.toString();
    if (value === null) return 'NULL';
    return `'${String(value)}'`;
  }
}
```

3. **Create Unified Service**
```typescript
// src/services/data/UnifiedDataService.ts

export class UnifiedDataService {
  private provider: DataProvider;
  private cache = new Map<string, any>();
  
  async initialize(mode: DeploymentMode, config: any): Promise<void> {
    this.provider = ProviderFactory.create(mode, config);
    await this.provider.initialize(config);
  }
  
  async find<T>(collection: string, query: Query): Promise<PaginatedResult<T>> {
    const cacheKey = `${collection}:${JSON.stringify(query)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = await this.provider.find<T>(collection, query);
    this.cache.set(cacheKey, result);
    
    // Clear cache after 60 seconds
    setTimeout(() => this.cache.delete(cacheKey), 60000);
    
    return result;
  }
  
  subscribe<T>(collection: string, query: Query): Observable<T[]> {
    if (this.provider.subscribe) {
      return this.provider.subscribe<T>(collection, query);
    }
    
    // Fallback to polling
    return new Observable(subscriber => {
      const fetch = async () => {
        const result = await this.find<T>(collection, query);
        subscriber.next(result.data);
      };
      
      fetch();
      const interval = setInterval(fetch, 5000);
      
      return () => clearInterval(interval);
    });
  }
  
  // ... other methods
}

// Singleton instance
export const uds = new UnifiedDataService();
```

---

## Testing Guidelines

### Unit Test Template

```typescript
// src/services/tabs/__tests__/URLTabSyncEngine.test.ts

describe('URLTabSyncEngine', () => {
  let engine: URLTabSyncEngine;
  
  beforeEach(() => {
    engine = new URLTabSyncEngine();
    window.history.replaceState({}, '', '/');
  });
  
  describe('parseURL', () => {
    it('should parse tabs from URL', () => {
      const tabs = [
        { id: 'tab-1', url: '/dashboard', title: 'Dashboard', module: 'dashboard' }
      ];
      window.history.replaceState({}, '', `/?tabs=${encodeURIComponent(JSON.stringify(tabs))}`);
      
      const result = engine.parseURL();
      
      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0].id).toBe('tab-1');
    });
    
    it('should create default tab when no tabs in URL', () => {
      const result = engine.parseURL();
      
      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0].url).toBe('/dashboard');
    });
  });
  
  describe('updateURL', () => {
    it('should update URL with tabs', () => {
      const tabs = [
        { id: 'tab-1', url: '/academics/students', title: 'Students', module: 'academics' }
      ];
      
      engine.updateURL(tabs, 'tab-1');
      
      expect(window.location.search).toContain('tabs=');
      expect(window.location.search).toContain('active=tab-1');
    });
  });
});
```

### Integration Test Template

```typescript
// src/tests/integration/TabSystem.test.tsx

describe('Tab System Integration', () => {
  it('should handle multi-tasking workflow', async () => {
    const { user } = render(<App />);
    
    // Navigate to students
    await user.click(screen.getByText('Students'));
    expect(screen.getByText('Students List')).toBeVisible();
    
    // Open student detail in new tab
    await user.click(screen.getByText('John Doe'));
    
    // Should have 2 tabs
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    
    // Switch between tabs
    await user.click(screen.getByRole('tab', { name: /Students List/i }));
    expect(screen.getByText('Students List')).toBeVisible();
    
    await user.click(screen.getByRole('tab', { name: /John Doe/i }));
    expect(screen.getByText('Student Details')).toBeVisible();
  });
  
  it('should restore tabs after refresh', async () => {
    const { user, unmount } = render(<App />);
    
    // Open multiple tabs
    await user.click(screen.getByText('Students'));
    await user.click(screen.getByText('Attendance'));
    
    expect(screen.getAllByRole('tab')).toHaveLength(3); // Dashboard + 2 new
    
    // Unmount and remount (simulating refresh)
    unmount();
    const { screen: newScreen } = render(<App />);
    
    // Tabs should be restored
    expect(newScreen.getAllByRole('tab')).toHaveLength(3);
  });
});
```

### E2E Test Template

```typescript
// e2e/tabs.spec.ts

test('complete enrollment workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Start enrollment
  await page.click('text=New Student');
  await page.fill('[name="firstName"]', 'Test');
  await page.fill('[name="lastName"]', 'Student');
  
  // Open parent form in new tab
  await page.keyboard.down('Control');
  await page.click('text=Add Parent');
  await page.keyboard.up('Control');
  
  // Should have 2 tabs
  const tabs = page.locator('[role="tab"]');
  await expect(tabs).toHaveCount(2);
  
  // Fill parent form
  await tabs.nth(1).click();
  await page.fill('[name="parentName"]', 'Parent Name');
  
  // Go back to student tab
  await tabs.nth(0).click();
  await page.click('text=Save Student');
  
  // Student should be saved
  await expect(page.locator('text=Student saved successfully')).toBeVisible();
});
```

---

## Code Standards

### TypeScript Guidelines

```typescript
// 1. Always use explicit return types on public APIs
export function useTabs(): UseTabsReturn {
  // ...
}

// 2. Use strict null checks
function findTab(id: string): Tab | undefined {
  return tabs.find(t => t.id === id);
}

// 3. Prefer interfaces over types for objects
interface Tab {
  id: string;
  title: string;
}

// 4. Use readonly for immutable data
interface Props {
  readonly tabs: readonly Tab[];
}

// 5. Document complex functions
/**
 * Opens a new tab or activates existing one for the given URL.
 * @param url - The URL to open
 * @param options - Tab configuration options
 * @returns The ID of the opened/activated tab
 * @throws {TabLimitError} if maximum tabs reached
 */
function openTab(url: string, options?: TabOptions): string {
  // ...
}
```

### React Guidelines

```typescript
// 1. Use functional components with hooks
const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onTabClick }) => {
  // ...
};

// 2. Memoize expensive computations
const sortedTabs = useMemo(() => {
  return [...tabs].sort((a, b) => a.order - b.order);
}, [tabs]);

// 3. Use callback for event handlers passed to children
const handleTabClick = useCallback((tabId: string) => {
  onTabClick(tabId);
}, [onTabClick]);

// 4. Clean up effects
useEffect(() => {
  const subscription = subscribe();
  return () => subscription.unsubscribe();
}, []);

// 5. Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (unit, integration, e2e)
- [ ] TypeScript compilation successful
- [ ] Linting passes
- [ ] Bundle size analyzed
- [ ] Environment variables configured
- [ ] Database migrations tested

### Deployment Steps

```bash
# 1. Build
npm run build

# 2. Run tests
npm run test:ci

# 3. Deploy to staging
npm run deploy:staging

# 4. Run smoke tests
npm run test:smoke

# 5. Deploy to production
npm run deploy:production

# 6. Verify deployment
curl https://app.schoolpilot.io/health
```

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all deployment modes
- [ ] Test critical user flows
- [ ] Enable feature flags gradually

---

## Performance Budgets

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Bundle Size | < 500KB (gzipped) | webpack-bundle-analyzer |
| First Load | < 3s | Lighthouse |
| Time to Interactive | < 5s | Lighthouse |
| Tab Switch | < 100ms | React Profiler |
| Data Query | < 500ms | Network panel |
| Memory Usage | < 100MB | Chrome DevTools |

---

## Troubleshooting Guide

### Common Issues

**1. Tabs not syncing with URL**
```
Symptom: URL changes but tabs don't update
Solution: Check URLTabSyncEngine subscription
Debug: Add console.log in handleURLChange()
```

**2. Data not persisting**
```
Symptom: Data lost on refresh
Solution: Check provider.initialize() success
Debug: Verify IndexedDB/LocalStorage access
```

**3. Performance degradation**
```
Symptom: Slow tab switching
Solution: Check for unnecessary re-renders
Debug: Use React DevTools Profiler
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-08  
**Author:** Implementation Team
