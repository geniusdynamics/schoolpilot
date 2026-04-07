# SchoolPilot3 Quick Reference

A quick reference guide for common patterns, imports, and commands in SchoolPilot3.

## Table of Contents

1. [Common Imports](#common-imports)
2. [Tab System Patterns](#tab-system-patterns)
3. [Database Patterns](#database-patterns)
4. [Plugin Patterns](#plugin-patterns)
5. [Configuration Access](#configuration-access)
6. [Navigation Patterns](#navigation-patterns)
7. [Hooks Quick Reference](#hooks-quick-reference)
8. [CLI Commands](#cli-commands)
9. [File Locations](#file-locations)

---

## Common Imports

### Core Components

```typescript
// Layout Components
import { PrimarySidebar } from '@/components/PrimarySidebar';
import { SecondarySidebar } from '@/components/SecondarySidebar';
import { TopOverflowMenu } from '@/components/TopOverflowMenu';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

// Tab Components
import { TabbedWorkspace } from '@/components/tabbedWorkspace/TabbedWorkspace';
import { useTabs } from '@/hooks/tabs/useTabs';

// UI Components
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DataGrid } from '@/components/ui/DataGrid';
```

### Services

```typescript
// Database
import { UnifiedDatabaseManager } from '@/services/database/UnifiedDatabaseManager';
import { databaseProviderFactory } from '@/services/database/DatabaseProviderFactory';

// Plugins
import { getPlugins } from '@/plugins';
import { usePlugins } from '@/plugins/usePlugins';

// Tabs
import { urlTabSyncEngine } from '@/services/tabs/URLTabSyncEngine';
import { tabPersistenceService } from '@/services/tabs/TabPersistenceService';
```

### Configuration

```typescript
// Config
import { unifiedConfig } from '@/config/unifiedConfig';
import { featureFlags } from '@/services/tabbedModeFeatureFlag';

// Types
import type { TabState } from '@/types/tabbedWorkspace';
import type { PluginManifest } from '@/plugins/types';
import type { DatabaseConfig } from '@/config/databaseConfigSchema';
```

### Hooks

```typescript
// Data
import { useAppDataContext } from '@/contexts/AppDataContext';
import { useDynamicNavigation } from '@/hooks/useDynamicNavigation';

// Auth
import { useAuth } from '@/hooks/useAuth';

// Utils
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDebounce } from '@/hooks/useDebounce';
```

---

## Tab System Patterns

### Create a New Tab

```typescript
const { addTab, activateTab } = useTabs();

const tabId = addTab({
  title: 'Student Profile',
  path: '/students/123',
  module: 'administration',
  icon: UserIcon,
});

activateTab(tabId);
```

### Check if Tab Exists

```typescript
const { tabs, activateTab } = useTabs();

function openOrActivateTab(path: string, tabData: Omit<TabState, 'id'>) {
  const existingTab = tabs.find(t => t.path === path);
  
  if (existingTab) {
    activateTab(existingTab.id);
    return existingTab.id;
  }
  
  return addTab(tabData);
}
```

### Create Hierarchical Tab

```typescript
const { addTab, addSubTab } = useTabs();

const parentId = addTab({
  title: 'Student: John Doe',
  path: '/students/123',
  module: 'administration',
});

addSubTab(parentId, {
  title: 'Edit Grades',
  path: '/students/123/grades/edit',
  module: 'academics',
});
```

### Persist Tab State

```typescript
import { useTabPersistence } from '@/hooks/tabs/useTabPersistence';

function MyTabComponent({ tabId }: { tabId: string }) {
  const { value: scrollPos, setValue: setScrollPos } = useTabPersistence(
    tabId,
    'scrollPosition',
    0
  );
  
  useEffect(() => {
    window.scrollTo(0, scrollPos);
  }, []);
  
  useEffect(() => {
    const handleScroll = () => setScrollPos(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}
```

---

## Database Patterns

### Initialize Database

```typescript
import { UnifiedDatabaseManager } from '@/services/database/UnifiedDatabaseManager';

const dbManager = UnifiedDatabaseManager.getInstance();

await dbManager.initialize({
  provider: 'sqlite-wasm',
  config: {
    databasePath: './data/school.db',
    enableWAL: true,
  },
});
```

### Get Collection

```typescript
const studentsCollection = await dbManager.getCollection('students');

// CRUD Operations
const student = await studentsCollection.insert({
  id: 'student-1',
  name: 'John Doe',
  grade: '10',
});

const allStudents = await studentsCollection.find();
const grade10Students = await studentsCollection.find({ grade: '10' });

await studentsCollection.updateOne(
  { id: 'student-1' },
  { grade: '11' }
);

await studentsCollection.deleteOne({ id: 'student-1' });
```

### Use in React Component

```typescript
import { useAppDataContext } from '@/contexts/AppDataContext';

function StudentList() {
  const { students, loading, error, refresh } = useAppDataContext();
  
  if (loading) return <Loading />;
  if (error) return <Error message={error} />;
  
  return (
    <ul>
      {students.map(s => (
        <li key={s.id}>{s.name}</li>
      ))}
    </ul>
  );
}
```

### Database Provider Selection

```typescript
import { ProviderSelector } from '@/services/database/ProviderSelector';
import { CapabilityDetector } from '@/services/database/detection/CapabilityDetector';

const capabilities = await CapabilityDetector.detect();
const provider = ProviderSelector.selectProvider(capabilities);
// Returns: 'sqlite-wasm' | 'pouchdb' | 'rxdb' | 'backend-api'
```

---

## Plugin Patterns

### Create a Plugin

```typescript
// src/plugins/builtin/my-plugin/index.ts
import type { PluginManifest, PluginModule } from '../../types';

export const manifest: PluginManifest = {
  id: 'com.mycompany.my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  type: 'module',
  entry: './index.ts',
  category: 'builtin',
};

const module: PluginModule = {
  async activate(context) {
    // Register hooks
    context.api.addHook('data.beforeSave', (data) => {
      return transformData(data);
    });
    
    // Add routes
    context.api.addRoute({
      path: '/my-plugin',
      component: MyPluginPage,
    });
  },
  
  async deactivate() {
    // Cleanup
  },
};

export default { manifest, module };
```

### Use Plugin Hook

```typescript
import { usePlugins } from '@/plugins/usePlugins';

function MyComponent() {
  const { plugins, isLoaded } = usePlugins();
  
  useEffect(() => {
    if (isLoaded) {
      const result = plugins.applyHook('data.transform', inputData);
    }
  }, [isLoaded]);
}
```

### Check if Plugin is Active

```typescript
const pluginManager = getPlugins();
const isActive = pluginManager.isPluginActive('com.mycompany.my-plugin');
```

---

## Configuration Access

### Access Unified Config

```typescript
import { unifiedConfig } from '@/config/unifiedConfig';

// Database config
const dbProvider = unifiedConfig.database.provider;
const poolConfig = unifiedConfig.database.connectionPool;

// Tab config
const maxTabs = unifiedConfig.tabs.maxTabs;
const tabbedEnabled = unifiedConfig.tabs.globalEnabled;

// Feature flags
const isMarketplaceEnabled = unifiedConfig.features.marketplace;
```

### Use Config Hook

```typescript
import { useConfig } from '@/hooks/useConfig';

function MyComponent() {
  const config = useConfig();
  
  return (
    <div>
      {config.features.darkMode && <DarkModeToggle />}
    </div>
  );
}
```

### Feature Flags

```typescript
import { featureFlags } from '@/services/tabbedModeFeatureFlag';

// Check feature
if (featureFlags.isEnabled('tabbedWorkspace')) {
  // Enable tabs
}

// Check module
if (featureFlags.isModuleEnabled('academics')) {
  // Show academics
}

// Enable/disable
featureFlags.enable('darkMode');
featureFlags.disable('marketplace');
```

### Environment Variables

```typescript
// Vite environment variables
const apiUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

// With fallback
const dbProvider = import.meta.env.VITE_DB_PROVIDER || 'sqlite-wasm';
```

---

## Navigation Patterns

### Module Navigation

```typescript
import { useDynamicNavigation } from '@/hooks/useDynamicNavigation';

const { items, loading } = useDynamicNavigation('academics');

// Navigate to item
function handleNavigation(item: NavigationItem) {
  const { addTab, activateTab, tabs } = useTabs();
  
  const existingTab = tabs.find(t => t.path === item.route);
  if (existingTab) {
    activateTab(existingTab.id);
  } else {
    addTab({
      title: item.label,
      path: item.route,
      module: 'academics',
      icon: item.icon,
    });
  }
}
```

### Breadcrumbs

```typescript
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

const breadcrumbs = useBreadcrumbs();
// Returns: [{ label: 'Academics', route: '/academics' }, ...]
```

### TopOverflowMenu

```typescript
const menuItems = [
  {
    id: 'new-tab',
    label: 'New Tab',
    icon: PlusIcon,
    action: () => createNewTab(),
  },
  {
    id: 'close-all',
    label: 'Close All',
    icon: XIcon,
    action: () => closeAllTabs(),
  },
];
```

---

## Hooks Quick Reference

### Data Hooks

```typescript
// App Data Context
const { data, loading, error, refresh } = useAppDataContext();

// Dynamic Navigation
const { items, loading, error } = useDynamicNavigation(moduleId);

// Breadcrumbs
const breadcrumbs = useBreadcrumbs();
```

### Tab Hooks

```typescript
// Tabs
const { tabs, activeTabId, addTab, removeTab, activateTab } = useTabs();

// Tab Persistence
const { value, setValue } = useTabPersistence(tabId, key, defaultValue);
```

### Auth Hooks

```typescript
// Auth
const { user, isAuthenticated, login, logout } = useAuth();

// RBAC
const { hasPermission, hasRole } = useRBAC();
```

### Utility Hooks

```typescript
// Local Storage
const [value, setValue] = useLocalStorage(key, defaultValue);

// Debounce
const debouncedValue = useDebounce(value, 500);

// Previous Value
const prevValue = usePrevious(value);

// Mount Status
const isMounted = useIsMounted();
```

---

## CLI Commands

### Development

```bash
# Start development server
npm run dev

# Start with specific port
npm run dev -- --port 5201

# Start with host
npm run dev -- --host
```

### Build

```bash
# Production build
npm run build

# Build with analysis
npm run build:analyze

# Preview production build
npm run preview
```

### Testing

```bash
# Run all tests
npm test

# Run with watch mode
npm test -- --watch

# Run specific test file
npm test src/components/MyComponent.test.tsx

# Run with coverage
npm test -- --coverage
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Run TypeScript check
npm run typecheck

# Run all checks
npm run check
```

### Database

```bash
# Generate demo data
npm run db:seed

# Reset database
npm run db:reset

# Backup database
npm run db:backup

# Restore database
npm run db:restore
```

---

## File Locations

### Core Architecture

```
src/
├── components/
│   ├── tabbedWorkspace/      # Tab system components
│   ├── PrimarySidebar.tsx    # Main navigation
│   ├── SecondarySidebar.tsx  # Contextual navigation
│   ├── TopOverflowMenu.tsx   # Overflow actions
│   └── ui/                   # Base UI components
├── hooks/
│   ├── tabs/                 # Tab-related hooks
│   ├── useDynamicNavigation.ts
│   └── useAuth.ts
├── services/
│   ├── database/             # Database providers
│   ├── tabs/                 # Tab services
│   └── sync/                 # Sync services
├── plugins/
│   ├── PluginManager.ts
│   ├── BuiltinLoader.ts
│   └── builtin/              # Built-in plugins
├── config/
│   ├── unifiedConfig.ts      # Main config
│   ├── databaseConfigSchema.ts
│   └── tabbedModeConfig.ts
├── stores/
│   ├── tabStore.ts           # Zustand tab store
│   └── adapters/
└── types/
    ├── tabbedWorkspace.ts
    └── hierarchical.ts
```

### Documentation

```
docs/
├── README.md                           # Documentation index
├── architecture/
│   ├── architecture.md                 # System overview
│   ├── PLUGIN_ARCHITECTURE_SPEC.md     # Plugin system
│   ├── tab-system.md                   # Tab system
│   └── UNIFIED_CONFIGURATION.md        # Configuration
├── tabs/
│   ├── README_TABBED_WORKSPACE.md      # Tab overview
│   └── TABBED_WORKSPACE_COMPONENT_GUIDE.md
├── guides/
│   ├── NAVIGATION_COMPONENTS_GUIDE.md  # Navigation
│   ├── PLUGIN_DEVELOPMENT_MANUAL.md    # Plugin dev
│   └── onboarding.md                   # Getting started
└── database/
    └── README.md                       # Database guide
```

---

## Keyboard Shortcuts

### Tab Navigation

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close active tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+1-9` | Jump to tab 1-9 |
| `Ctrl+Shift+T` | Reopen closed tab |

### General

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open command palette |
| `Ctrl+/` | Show keyboard shortcuts |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+F` | Search |

---

## Common Type Definitions

```typescript
// Tab State
interface TabState {
  id: string;
  title: string;
  path: string;
  icon?: React.ComponentType;
  module: string;
  submodule?: string;
  parentId?: string;
  isPinned?: boolean;
  isDirty?: boolean;
}

// Plugin Manifest
interface PluginManifest {
  id: string;
  name: string;
  version: string;
  type: 'module' | 'theme' | 'integration' | 'engine';
  entry: string;
  category: 'builtin' | 'verified' | 'community';
  hooks?: string[];
  permissions?: string[];
}

// Navigation Item
interface NavigationItem {
  id: string;
  label: string;
  icon?: React.ComponentType;
  route?: string;
  children?: NavigationItem[];
  badge?: number;
  disabled?: boolean;
}
```

---

## Troubleshooting

### Common Issues

**Tabs not persisting:**
```typescript
// Check if persistence is enabled
unifiedConfig.tabs.enablePersistence // should be true

// Check localStorage
localStorage.getItem('tab-store');
```

**Database connection failed:**
```typescript
// Check provider
const provider = unifiedConfig.database.provider;

// Check capabilities
const capabilities = await CapabilityDetector.detect();
```

**Plugin not loading:**
```typescript
// Check if plugin is registered
const plugins = getPlugins();
const isRegistered = plugins.getPlugin('plugin-id') !== undefined;

// Check console for errors
```

---

## Resources

- [Full Documentation](./README.md)
- [Architecture Overview](./architecture/architecture.md)
- [Tab System](./architecture/tab-system.md)
- [Plugin System](./architecture/PLUGIN_ARCHITECTURE_SPEC.md)
- [Configuration](./architecture/UNIFIED_CONFIGURATION.md)
