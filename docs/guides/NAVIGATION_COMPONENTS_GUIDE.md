# Navigation Components Guide

A comprehensive guide to the navigation system in SchoolPilot3, including sidebars, breadcrumbs, and the TopOverflowMenu.

## Table of Contents

1. [Overview](#overview)
2. [PrimarySidebar](#primarysidebar)
3. [SecondarySidebar](#secondarysidebar)
4. [TopOverflowMenu](#topoverflowmenu)
5. [BreadcrumbNavigation](#breadcrumbnavigation)
6. [Integration with Tab System](#integration-with-tab-system)
7. [Hooks](#hooks)
8. [Styling](#styling)

---

## Overview

The navigation system in SchoolPilot3 consists of multiple coordinated components:

```
┌─────────────────────────────────────────────────────────────┐
│  TopOverflowMenu (optional actions)                         │
├──────────┬──────────────────────────────────────────────────┤
│          │  BreadcrumbNavigation                            │
│ Primary  ├──────────────────────────────────────────────────┤
│ Sidebar  │                                                  │
│          │  Main Content Area                               │
│          │                                                  │
│          │  ┌──────────────────────────────────────────┐   │
│          │  │  Tabbed Workspace                        │   │
│          │  │  ┌────────────────────────────────────┐  │   │
│          │  │  │ TabBar                             │  │   │
│          │  │  └────────────────────────────────────┘  │   │
│          │  │  ┌────────────────────────────────────┐  │   │
│          │  │  │ Tab Content                        │  │   │
│          │  │  │                                    │  │   │
│          │  │  │                                    │  │   │
│          │  │  └────────────────────────────────────┘  │   │
│          │  └──────────────────────────────────────────┘   │
├──────────┴──────────────────────────────────────────────────┤
│  SecondarySidebar (contextual navigation)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## PrimarySidebar

**Location**: `src/components/PrimarySidebar.tsx`

The main navigation sidebar displaying module icons and primary navigation.

### Features

- **Fixed Positioning**: Stays visible during scroll
- **Logo Integration**: Displays application logo
- **Module Icons**: Visual navigation to main modules
- **Active State**: Highlights current module
- **Collapsible**: Can be collapsed on mobile
- **Responsive**: Adapts to screen size

### Props

```typescript
interface PrimarySidebarProps {
  modules: ModuleConfig[];           // Module configurations
  activeModule?: string;             // Currently active module ID
  onModuleSelect: (moduleId: string) => void;
  logo?: React.ReactNode;            // Custom logo component
  collapsed?: boolean;               // Collapsed state
  onCollapse?: (collapsed: boolean) => void;
}

interface ModuleConfig {
  id: string;
  name: string;
  icon: React.ComponentType;
  route: string;
  badge?: number;                    // Notification badge
  disabled?: boolean;                // Disable interaction
  requiredPermission?: string;       // RBAC permission required
}
```

### Usage

```typescript
import { PrimarySidebar } from '@/components/PrimarySidebar';

const modules = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: HomeIcon,
    route: '/dashboard',
  },
  {
    id: 'academics',
    name: 'Academics',
    icon: BookOpenIcon,
    route: '/academics',
    badge: 5,
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: DollarSignIcon,
    route: '/finance',
    requiredPermission: 'finance.view',
  },
];

function Layout() {
  return (
    <PrimarySidebar
      modules={modules}
      activeModule="academics"
      onModuleSelect={(id) => navigateToModule(id)}
      logo={<AppLogo />}
    />
  );
}
```

### Module Selection Behavior

When a module is selected:
1. Creates/activates a tab for the module
2. Updates the active module state
3. Triggers navigation to module route
4. Updates SecondarySidebar content

---

## SecondarySidebar

**Location**: `src/components/SecondarySidebar.tsx`

Contextual navigation sidebar that changes based on the active module.

### Features

- **Dynamic Content**: Changes based on active module
- **Nested Navigation**: Supports hierarchical menu items
- **Collapsible Sections**: Expand/collapse menu groups
- **Active Item Highlighting**: Shows current page
- **Quick Actions**: Module-specific action buttons

### Props

```typescript
interface SecondarySidebarProps {
  moduleId: string;                  // Current module
  items: NavigationItem[];           // Navigation items
  activeItem?: string;               // Active item ID
  onItemClick: (item: NavigationItem) => void;
  header?: React.ReactNode;          // Custom header content
  footer?: React.ReactNode;          // Custom footer content
}

interface NavigationItem {
  id: string;
  label: string;
  icon?: React.ComponentType;
  route?: string;
  children?: NavigationItem[];       // Nested items
  badge?: number;
  disabled?: boolean;
  shortcut?: string;                 // Keyboard shortcut
  action?: () => void;               // Custom action
}
```

### Usage

```typescript
import { SecondarySidebar } from '@/components/SecondarySidebar';

const academicsItems = [
  {
    id: 'students',
    label: 'Students',
    icon: UsersIcon,
    route: '/academics/students',
  },
  {
    id: 'grades',
    label: 'Grades',
    icon: AwardIcon,
    children: [
      { id: 'grade-entry', label: 'Grade Entry', route: '/academics/grades/entry' },
      { id: 'grade-reports', label: 'Reports', route: '/academics/grades/reports' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: CalendarIcon,
    route: '/academics/attendance',
    badge: 3,
  },
];

function AcademicsLayout() {
  return (
    <SecondarySidebar
      moduleId="academics"
      items={academicsItems}
      activeItem="grade-entry"
      onItemClick={(item) => navigate(item.route)}
      header={<ModuleHeader title="Academics" />}
    />
  );
}
```

### Dynamic Content Loading

The SecondarySidebar content is typically loaded dynamically based on the active module:

```typescript
// In your layout component
const moduleNavigation = useModuleNavigation(activeModule);

return (
  <SecondarySidebar
    moduleId={activeModule}
    items={moduleNavigation.items}
    activeItem={currentRoute}
  />
);
```

---

## TopOverflowMenu

**Location**: `src/components/TopOverflowMenu.tsx`

A top-mounted overflow menu for additional actions and navigation.

### Features

- **Overflow Actions**: Actions that don't fit in main UI
- **Quick Access**: Frequently used operations
- **Contextual**: Changes based on current view
- **Responsive**: Adapts to available space
- **Keyboard Accessible**: Full keyboard navigation

### Props

```typescript
interface TopOverflowMenuProps {
  items: OverflowMenuItem[];
  onItemClick: (item: OverflowMenuItem) => void;
  position?: 'left' | 'right' | 'center';  // default: 'right'
  trigger?: 'click' | 'hover';             // default: 'click'
  icon?: React.ComponentType;              // Custom trigger icon
  label?: string;                          // Trigger label
}

interface OverflowMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;                       // Show divider before this item
  children?: OverflowMenuItem[];           // Sub-menu
  action?: () => void;
}
```

### Usage

```typescript
import { TopOverflowMenu } from '@/components/TopOverflowMenu';

const menuItems = [
  {
    id: 'new-tab',
    label: 'New Tab',
    icon: PlusIcon,
    shortcut: 'Ctrl+T',
    action: () => createNewTab(),
  },
  {
    id: 'close-all',
    label: 'Close All Tabs',
    icon: XIcon,
    action: () => closeAllTabs(),
  },
  { id: 'divider1', divider: true },
  {
    id: 'settings',
    label: 'Settings',
    icon: SettingsIcon,
    children: [
      { id: 'general', label: 'General', action: () => openSettings('general') },
      { id: 'appearance', label: 'Appearance', action: () => openSettings('appearance') },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    icon: HelpCircleIcon,
    action: () => openHelp(),
  },
];

function Header() {
  return (
    <TopOverflowMenu
      items={menuItems}
      position="right"
      label="Menu"
    />
  );
}
```

### Integration with Tab System

The TopOverflowMenu is commonly used for tab management actions:

```typescript
const tabMenuItems = [
  {
    id: 'new-tab',
    label: 'New Tab',
    action: () => tabs.addTab({ title: 'New Tab', path: '/new' }),
  },
  {
    id: 'duplicate',
    label: 'Duplicate Tab',
    action: () => tabs.duplicateTab(activeTabId),
  },
  {
    id: 'close-others',
    label: 'Close Other Tabs',
    action: () => tabs.closeOtherTabs(activeTabId),
  },
  {
    id: 'reopen-closed',
    label: 'Reopen Closed Tab',
    shortcut: 'Ctrl+Shift+T',
    action: () => tabs.reopenLastClosed(),
  },
];
```

---

## BreadcrumbNavigation

**Location**: `src/components/BreadcrumbNavigation.tsx`

Breadcrumb trail showing the user's current location in the application hierarchy.

### Features

- **Hierarchical Path**: Shows navigation path
- **Clickable Segments**: Navigate to parent levels
- **Dynamic Generation**: Builds from current route
- **Truncation**: Handles long paths gracefully
- **Home Link**: Always links to dashboard

### Props

```typescript
interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  homeRoute?: string;                // Home route (default: '/dashboard')
  separator?: React.ReactNode;       // Custom separator
  maxItems?: number;                 // Max items before truncation
  onItemClick?: (item: BreadcrumbItem) => void;
}

interface BreadcrumbItem {
  label: string;
  route?: string;                    // Clickable if provided
  icon?: React.ComponentType;
  active?: boolean;                  // Current page (non-clickable)
}
```

### Usage

```typescript
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

const breadcrumbs = [
  { label: 'Academics', route: '/academics', icon: BookOpenIcon },
  { label: 'Students', route: '/academics/students', icon: UsersIcon },
  { label: 'John Doe', active: true },
];

function StudentPage() {
  return (
    <BreadcrumbNavigation
      items={breadcrumbs}
      homeRoute="/dashboard"
      separator="/"
    />
  );
}
```

### Automatic Generation

Breadcrumbs can be automatically generated from the current route:

```typescript
// Using the hook
const breadcrumbs = useBreadcrumbs();

// Returns:
// [
//   { label: 'Academics', route: '/academics' },
//   { label: 'Students', route: '/academics/students' },
//   { label: 'Profile', active: true }
// ]
```

---

## Integration with Tab System

The navigation components work together with the tabbed workspace:

### Navigation to Tab Creation

```typescript
// When user clicks a navigation item
function handleNavigation(item: NavigationItem) {
  // Check if tab already exists
  const existingTab = tabs.findTabByPath(item.route);
  
  if (existingTab) {
    // Activate existing tab
    tabs.activateTab(existingTab.id);
  } else {
    // Create new tab
    tabs.addTab({
      title: item.label,
      path: item.route,
      module: activeModule,
      icon: item.icon,
    });
  }
}
```

### Tab Changes Update Navigation

```typescript
// Update active states when tab changes
useEffect(() => {
  const activeTab = tabs.getActiveTab();
  if (activeTab) {
    setActiveModule(activeTab.module);
    setActiveRoute(activeTab.path);
  }
}, [tabs.activeTabId]);
```

### Complete Layout Example

```typescript
function AppLayout() {
  const { tabs, activeTabId } = useTabs();
  const activeTab = tabs.find(t => t.id === activeTabId);
  
  return (
    <div className="flex h-screen">
      {/* Primary Sidebar */}
      <PrimarySidebar
        modules={modules}
        activeModule={activeTab?.module}
        onModuleSelect={handleModuleSelect}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <BreadcrumbNavigation items={breadcrumbs} />
          <TopOverflowMenu items={overflowItems} />
        </div>
        
        {/* Tabbed Workspace */}
        <TabbedWorkspace>
          <Router />
        </TabbedWorkspace>
      </div>
      
      {/* Secondary Sidebar */}
      <SecondarySidebar
        moduleId={activeTab?.module}
        items={getModuleNavigation(activeTab?.module)}
      />
    </div>
  );
}
```

---

## Hooks

### useDynamicNavigation

**Location**: `src/hooks/useDynamicNavigation.ts`

Generates navigation items dynamically based on user permissions and current context.

```typescript
function useDynamicNavigation(moduleId: string) {
  return {
    items: NavigationItem[];
    loading: boolean;
    error: Error | null;
    refresh: () => void;
  };
}

// Usage
const { items } = useDynamicNavigation('academics');
```

### useEnhancedNavigation

**Location**: `src/hooks/useEnhancedNavigation.ts`

Enhanced navigation with search and favorites.

```typescript
function useEnhancedNavigation() {
  return {
    items: NavigationItem[];
    favorites: string[];
    recent: NavigationItem[];
    search: (query: string) => NavigationItem[];
    addFavorite: (itemId: string) => void;
    removeFavorite: (itemId: string) => void;
  };
}
```

### useBreadcrumbs

**Location**: `src/hooks/useBreadcrumbs.ts`

Generates breadcrumb items from current route.

```typescript
function useBreadcrumbs() {
  return BreadcrumbItem[];
}

// Usage
const breadcrumbs = useBreadcrumbs();
```

---

## Styling

### CSS Variables

```css
:root {
  /* Sidebar */
  --sidebar-width: 240px;
  --sidebar-collapsed-width: 64px;
  --sidebar-bg: #ffffff;
  --sidebar-border: #e5e7eb;
  
  /* Navigation Items */
  --nav-item-height: 40px;
  --nav-item-padding: 12px 16px;
  --nav-item-hover-bg: #f3f4f6;
  --nav-item-active-bg: #e5e7eb;
  --nav-item-active-color: #111827;
  
  /* Breadcrumbs */
  --breadcrumb-separator: '/';
  --breadcrumb-color: #6b7280;
  --breadcrumb-active-color: #111827;
}
```

### Tailwind Classes

```typescript
// PrimarySidebar
className="fixed left-0 top-0 h-full w-16 bg-white border-r border-gray-200"

// SecondarySidebar
className="w-60 bg-gray-50 border-r border-gray-200 overflow-y-auto"

// Navigation Item
className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"

// Active Navigation Item
className="flex items-center px-4 py-2 bg-gray-200 text-gray-900 font-medium rounded-md"

// Breadcrumb
className="flex items-center space-x-2 text-sm text-gray-600"

// Breadcrumb Active
className="text-gray-900 font-medium"
```

---

## Best Practices

1. **Consistent Navigation**
   - Keep navigation structure consistent across modules
   - Use familiar icons and labels
   - Group related items together

2. **Accessibility**
   - Include ARIA labels
   - Support keyboard navigation
   - Ensure sufficient color contrast
   - Provide focus indicators

3. **Mobile Responsiveness**
   - Collapse sidebars on small screens
   - Use hamburger menu for mobile
   - Prioritize important navigation items

4. **Performance**
   - Lazy load navigation items
   - Cache navigation configuration
   - Debounce search operations

5. **User Preferences**
   - Remember sidebar collapse state
   - Support custom favorites
   - Allow recent items tracking

---

## Related Documentation

- [Tab System Architecture](../architecture/tab-system.md) - Tab system integration
- [Tabbed Workspace Component Guide](./TABBED_WORKSPACE_COMPONENT_GUIDE.md) - Tab components
- [RBAC Implementation Guide](./RBAC_IMPLEMENTATION_GUIDE.md) - Permission-based navigation
