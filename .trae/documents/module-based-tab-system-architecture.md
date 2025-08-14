# Module-Based Tab System - Technical Architecture Document

> **⚠️ DOCUMENT STATUS: SUPERSEDED**
> 
> This document has been superseded by the [Navigation System Analysis and Recommendations](./navigation_system_analysis_and_recommendations.md) document. After comprehensive analysis, it was determined that the existing navigation system already implements the architecture patterns described in this document effectively.
> 
> **Recommendation**: Maintain the current technical architecture instead of implementing the changes described below.

## 1. Architecture Design

```mermaid
graph TD
    A[User Browser] --> B[React Frontend Application]
    B --> C[Module-Based Tab System]
    C --> D[Enhanced TabbedWorkspace]
    C --> E[ModuleSidebar Component]
    C --> F[ModuleContextBar Component]
    C --> G[WorkspaceSwitcher Component]
    
    D --> H[useTabNavigation Hook]
    H --> I[useTabStore Hook]
    I --> J[Zustand State Management]
    
    C --> K[Module Registry Service]
    K --> L[RBAC Service]
    K --> M[Navigation Service]
    
    J --> N[Local Storage Persistence]
    L --> O[Supabase Authentication]
    
    subgraph "Frontend Layer"
        B
        C
        D
        E
        F
        G
    end
    
    subgraph "State Management Layer"
        H
        I
        J
        N
    end
    
    subgraph "Service Layer"
        K
        L
        M
        O
    end
```

## 2. Technology Description

* Frontend: React\@18 + TypeScript\@5 + Tailwind CSS\@3 + Vite

* State Management: Zustand\@4 (existing tab store enhancement)

* Authentication: Supabase (existing integration)

* UI Components: Headless UI + Heroicons

* Drag & Drop: @dnd-kit/core\@6

* Animations: Framer Motion\@10

## 3. Route Definitions

| Route                       | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| /workspace                  | Main workspace with module-based tab system |
| /workspace/:moduleId        | Direct module access with tab restoration   |
| /workspace/:moduleId/:tabId | Direct tab access within module context     |
| /workspace/settings         | Workspace configuration and preferences     |
| /workspace/history          | Tab history and recently closed tabs        |

## 4. API Definitions

### 4.1 Enhanced Tab Store API

**Module-aware tab creation**

```typescript
interface CreateTabOptions {
  title: string;
  content: TabContent;
  moduleId: string;
  submodule?: string;
  feature?: string;
  workspaceId?: string;
  groupId?: string;
  isPinned?: boolean;
}

function createModuleTab(options: CreateTabOptions): Tab
```

**Module navigation**

```typescript
function switchToModule(moduleId: string): void
function getTabsByModule(moduleId: string): Tab[]
function closeTabsByModule(moduleId: string): void
function pinTabsInModule(moduleId: string, tabIds: string[]): void
```

**Workspace management**

```typescript
interface WorkspaceState {
  id: string;
  name: string;
  activeModuleId: string;
  tabGroups: TabGroup[];
  moduleStates: Record<string, ModuleState>;
}

function switchWorkspace(workspaceId: string): void
function saveWorkspaceState(): void
function restoreWorkspaceState(workspaceId: string): void
```

### 4.2 Module Registry API

**Module registration and retrieval**

```typescript
interface ModuleDefinition {
  id: string;
  name: string;
  icon: string;
  path: string;
  isActive: boolean;
  permissions: string[];
  navigation: NavItem[];
  defaultTabs?: DefaultTab[];
}

function getAvailableModules(): ModuleDefinition[]
function getModuleById(moduleId: string): ModuleDefinition | null
function checkModuleAccess(moduleId: string, userRole: string): boolean
```

### 4.3 Tab Management API

**Bulk operations**

```typescript
function bulkCloseTabsByFilter(filter: TabFilter): void
function bulkPinTabs(tabIds: string[]): void
function bulkMoveTabsToGroup(tabIds: string[], groupId: string): void
function searchTabs(query: string): Tab[]
```

**Tab history**

```typescript
interface TabHistoryEntry {
  tab: Tab;
  closedAt: Date;
  moduleId: string;
  workspaceId: string;
}

function getTabHistory(limit?: number): TabHistoryEntry[]
function restoreTabFromHistory(entryId: string): void
function clearTabHistory(): void
```

## 5. Server Architecture Diagram

```mermaid
graph TD
    A[Client / Frontend] --> B[Component Layer]
    B --> C[Hook Layer]
    C --> D[Service Layer]
    D --> E[State Management]
    E --> F[Persistence Layer]
    
    subgraph "Component Layer"
        B1[TabbedWorkspace]
        B2[ModuleSidebar]
        B3[ModuleContextBar]
        B4[WorkspaceSwitcher]
    end
    
    subgraph "Hook Layer"
        C1[useTabNavigation]
        C2[useTabStore]
        C3[useModuleRegistry]
        C4[useWorkspaceState]
    end
    
    subgraph "Service Layer"
        D1[ModuleRegistryService]
        D2[NavigationService]
        D3[RBACService]
        D4[WorkspaceService]
    end
    
    subgraph "State Management"
        E1[Zustand Tab Store]
        E2[Module State]
        E3[Workspace State]
    end
    
    subgraph "Persistence Layer"
        F1[Local Storage]
        F2[Session Storage]
        F3[Supabase User Preferences]
    end
```

## 6. Data Model

### 6.1 Data Model Definition

```mermaid
erDiagram
    WORKSPACE ||--o{ TAB_GROUP : contains
    TAB_GROUP ||--o{ TAB : contains
    MODULE ||--o{ TAB : creates
    MODULE ||--o{ NAV_ITEM : defines
    USER ||--o{ WORKSPACE : owns
    USER ||--o{ USER_PREFERENCES : has
    
    WORKSPACE {
        string id PK
        string name
        string userId FK
        string activeModuleId
        json moduleStates
        datetime createdAt
        datetime updatedAt
    }
    
    TAB_GROUP {
        string id PK
        string workspaceId FK
        string name
        string moduleId FK
        int sortOrder
        boolean isCollapsed
    }
    
    TAB {
        string id PK
        string title
        string path
        string moduleId FK
        string submodule
        string feature
        string groupId FK
        boolean isPinned
        boolean isActive
        json content
        json metadata
        datetime createdAt
        datetime lastAccessedAt
    }
    
    MODULE {
        string id PK
        string name
        string icon
        string path
        boolean isActive
        string version
        json permissions
        json navigation
        json defaultTabs
    }
    
    NAV_ITEM {
        string id PK
        string moduleId FK
        string name
        string path
        string icon
        string parentId FK
        int sortOrder
        json permissions
    }
    
    USER_PREFERENCES {
        string id PK
        string userId FK
        json sidebarState
        json tabPreferences
        json modulePreferences
        string defaultWorkspaceId
        datetime updatedAt
    }
```

### 6.2 Data Definition Language

**Enhanced Tab Store Schema**

```typescript
// Extended tab interface
interface Tab {
  id: string;
  title: string;
  path: string;
  moduleId: string;
  submodule?: string;
  feature?: string;
  groupId?: string;
  workspaceId: string;
  isPinned: boolean;
  isActive: boolean;
  content: TabContent;
  metadata: TabMetadata;
  createdAt: Date;
  lastAccessedAt: Date;
}

// Tab group for organization
interface TabGroup {
  id: string;
  name: string;
  moduleId: string;
  workspaceId: string;
  tabs: Tab[];
  isCollapsed: boolean;
  sortOrder: number;
}

// Module state tracking
interface ModuleState {
  moduleId: string;
  isActive: boolean;
  activeTabId?: string;
  lastAccessedAt: Date;
  tabGroups: TabGroup[];
  sidebarExpanded: boolean;
}

// Workspace configuration
interface WorkspaceConfig {
  id: string;
  name: string;
  userId: string;
  activeModuleId: string;
  moduleStates: Record<string, ModuleState>;
  preferences: WorkspacePreferences;
  createdAt: Date;
  updatedAt: Date;
}

// User preferences for workspace behavior
interface WorkspacePreferences {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  tabCloseConfirmation: boolean;
  autoGroupTabs: boolean;
  maxTabsPerGroup: number;
  tabHistoryLimit: number;
  defaultModuleId?: string;
}
```

**Local Storage Schema**

```typescript
// Workspace state persistence
const WORKSPACE_STORAGE_KEY = 'schoolpilot_workspace_state';
const TAB_HISTORY_STORAGE_KEY = 'schoolpilot_tab_history';
const USER_PREFERENCES_STORAGE_KEY = 'schoolpilot_user_preferences';

// Storage structure
interface StoredWorkspaceState {
  currentWorkspaceId: string;
  workspaces: Record<string, WorkspaceConfig>;
  tabHistory: TabHistoryEntry[];
  userPreferences: WorkspacePreferences;
  lastSavedAt: Date;
}
```

**Module Registry Schema**

```typescript
// Enhanced module definition
interface EnhancedModuleDefinition extends ModuleDefinition {
  defaultTabs?: DefaultTab[];
  tabGrouping?: TabGroupingConfig;
  contextActions?: ContextAction[];
  shortcuts?: KeyboardShortcut[];
}

interface DefaultTab {
  title: string;
  path: string;
  content: TabContent;
  isPinned?: boolean;
  autoCreate?: boolean;
}

interface TabGroupingConfig {
  autoGroup: boolean;
  groupBy: 'feature' | 'submodule' | 'custom';
  maxTabsPerGroup: number;
  groupNaming: string;
}

interface ContextAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  permissions?: string[];
  shortcut?: string;
}
```

## 7. Implementation Phases

### Phase 1: Core Infrastructure

* Enhance existing tab store with module awareness

* Create base module registry service

* Implement workspace state management

### Phase 2: UI Components

* Develop ModuleSidebar component

* Create ModuleContextBar component

* Implement WorkspaceSwitcher component

### Phase 3: Advanced Features

* Add drag-and-drop functionality

* Implement tab grouping and bulk operations

* Create tab history and search features

### Phase 4: Integration & Polish

* RBAC integration for module access

* Performance optimization

* User preference persistence

* Comprehensive testing

## 8. Performance Considerations

* **Lazy Loading**: Modules and tabs loaded on-demand

* **Virtual Scrolling**: For large tab lists and history

* **Memoization**: React.memo for tab components

* **State Optimization**: Selective re-renders with Zustand

* **Persistence Throttling**: Debounced state saving

* **Memory Management**: Automatic cleanup of inactive tabs

