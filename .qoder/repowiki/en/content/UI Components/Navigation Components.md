# Navigation Components

<cite>
**Referenced Files in This Document**
- [TabNavigation.tsx](file://src/components/ui/TabNavigation.tsx)
- [PageTabs.tsx](file://src/components/ui/PageTabs.tsx)
- [AdaptiveTabs.tsx](file://src/components/ui/AdaptiveTabs.tsx)
- [SubTabNavigation.tsx](file://src/components/tabbledWorkspace/SubTabNavigation.tsx)
- [useTabNavigation.ts](file://src/hooks/useTabNavigation.ts)
- [TabbedWorkspace.tsx](file://src/components/tabbledWorkspace/TabbedWorkspace.tsx)
- [Tabs.tsx](file://src/components/ui/Tabs.tsx)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document describes SchoolPilot3’s navigation component system with a focus on tab management, state persistence, and navigation patterns. It covers:
- Documented components: Tabs, TabNavigation, PageTabs, SubTabNavigation, and AdaptiveTabs
- Tabbed workspace integration, dynamic tab creation, and tab ordering
- Accessibility features, keyboard shortcuts, and focus management
- Examples of complex navigation scenarios, nested tab structures, and responsive tab behavior
- Performance optimization, lazy loading, and memory management for large numbers of tabs

## Project Structure
SchoolPilot3 organizes navigation components under two primary areas:
- UI primitives for general-purpose tabs and navigation: Tabs, TabNavigation, PageTabs, AdaptiveTabs
- Workspace-specific tabbed navigation: TabbedWorkspace and SubTabNavigation

```mermaid
graph TB
subgraph "UI Primitives"
A["Tabs.tsx"]
B["TabNavigation.tsx"]
C["PageTabs.tsx"]
D["AdaptiveTabs.tsx"]
end
subgraph "Workspace Integration"
E["TabbedWorkspace.tsx"]
F["SubTabNavigation.tsx"]
end
G["useTabNavigation.ts"]
B --> C
D --> E
G --> D
G --> E
```

**Diagram sources**
- [Tabs.tsx:1-146](file://src/components/ui/Tabs.tsx#L1-L146)
- [TabNavigation.tsx:1-183](file://src/components/ui/TabNavigation.tsx#L1-L183)
- [PageTabs.tsx:1-173](file://src/components/ui/PageTabs.tsx#L1-L173)
- [AdaptiveTabs.tsx:1-580](file://src/components/ui/AdaptiveTabs.tsx#L1-L580)
- [TabbedWorkspace.tsx:345-399](file://src/components/tabbledWorkspace/TabbedWorkspace.tsx#L345-L399)
- [SubTabNavigation.tsx:1-94](file://src/components/tabbledWorkspace/SubTabNavigation.tsx#L1-L94)
- [useTabNavigation.ts:113-394](file://src/hooks/useTabNavigation.ts#L113-L394)

**Section sources**
- [Tabs.tsx:1-146](file://src/components/ui/Tabs.tsx#L1-L146)
- [TabNavigation.tsx:1-183](file://src/components/ui/TabNavigation.tsx#L1-L183)
- [PageTabs.tsx:1-173](file://src/components/ui/PageTabs.tsx#L1-L173)
- [AdaptiveTabs.tsx:1-580](file://src/components/ui/AdaptiveTabs.tsx#L1-L580)
- [TabbedWorkspace.tsx:345-399](file://src/components/tabbledWorkspace/TabbedWorkspace.tsx#L345-L399)
- [SubTabNavigation.tsx:1-94](file://src/components/tabbledWorkspace/SubTabNavigation.tsx#L1-L94)
- [useTabNavigation.ts:113-394](file://src/hooks/useTabNavigation.ts#L113-L394)

## Core Components
- Tabs: Lightweight, stateful tab container for simple UI scenarios.
- TabNavigation: Route-aware horizontal tab bar with variants, sizes, badges, and icons.
- PageTabs: Page-level tabs with integrated filter bar and content switching.
- AdaptiveTabs: Cross-platform, responsive tab system with drag-and-drop reordering, action bars, and platform-aware behavior.
- SubTabNavigation: Secondary navigation within a tab, with optional add button and active state management.
- useTabNavigation: Hook orchestrating tab lifecycle, navigation, grouping, and history for the tabbed workspace.

Key capabilities:
- Controlled vs uncontrolled modes
- Accessibility via ARIA roles and keyboard handling
- Responsive behavior and platform detection
- Action overflow menus and customizable layouts

**Section sources**
- [Tabs.tsx:1-146](file://src/components/ui/Tabs.tsx#L1-L146)
- [TabNavigation.tsx:87-182](file://src/components/ui/TabNavigation.tsx#L87-L182)
- [PageTabs.tsx:65-172](file://src/components/ui/PageTabs.tsx#L65-L172)
- [AdaptiveTabs.tsx:50-580](file://src/components/ui/AdaptiveTabs.tsx#L50-L580)
- [SubTabNavigation.tsx:8-93](file://src/components/tabbledWorkspace/SubTabNavigation.tsx#L8-L93)
- [useTabNavigation.ts:113-394](file://src/hooks/useTabNavigation.ts#L113-L394)

## Architecture Overview
The navigation system integrates UI primitives with a workspace manager and a navigation hook:
- AdaptiveTabs drives the workspace tab bar and content area
- useTabNavigation centralizes tab creation, activation, closing, moving, pinning, grouping, and navigation history
- TabbedWorkspace renders active tab content and enforces access checks
- SubTabNavigation supports nested secondary navigation inside tabs
- TabNavigation and PageTabs provide complementary page-level navigation patterns

```mermaid
sequenceDiagram
participant U as "User"
participant NT as "useTabNavigation"
participant AT as "AdaptiveTabs"
participant TW as "TabbedWorkspace"
U->>AT : Click tab or add tab
AT->>NT : createTab()/activateTab()/closeTab()
NT-->>AT : Updated tab state
AT->>TW : Render active tab content
TW-->>U : Rendered content
```

**Diagram sources**
- [useTabNavigation.ts:113-394](file://src/hooks/useTabNavigation.ts#L113-L394)
- [AdaptiveTabs.tsx:361-580](file://src/components/ui/AdaptiveTabs.tsx#L361-L580)
- [TabbedWorkspace.tsx:345-399](file://src/components/tabbledWorkspace/TabbedWorkspace.tsx#L345-L399)

## Detailed Component Analysis

### TabNavigation
Purpose:
- Horizontal tab bar with route-aware active state, icons, badges, and multiple variants/sizes.

Highlights:
- Active detection via explicit activeTabId or pathname matching
- Support for both router links and button-based tabs
- Accessibility attributes: role="tablist" and role="tab" with aria-selected
- Responsive horizontal scrolling and touch-friendly sizing

Usage patterns:
- As a standalone navigation bar
- Embedded within PageTabs for page-level tab switching

**Section sources**
- [TabNavigation.tsx:87-182](file://src/components/ui/TabNavigation.tsx#L87-L182)

### PageTabs
Purpose:
- Page-level tabs with integrated filter bar and content area.

Highlights:
- Controlled/uncontrolled active tab support
- Tab-specific and global filters with search/clear actions
- Renders content based on active tab ID
- Uses TabNavigation internally for consistent styling

Typical usage:
- Class lists and reports pages with per-tab filters

**Section sources**
- [PageTabs.tsx:65-172](file://src/components/ui/PageTabs.tsx#L65-L172)

### AdaptiveTabs
Purpose:
- Cross-platform, responsive tab system supporting:
  - Variants: workspace, page, form
  - Action bars with overflow menus
  - Drag-and-drop reordering (desktop)
  - Platform-aware sizing and behavior
  - Max tabs, closeable tabs, loading states, badges

Highlights:
- Context-driven tab management
- Keyboard accessibility for tab selection
- Scrollable tab bar and overflow handling
- Action bar with configurable visibility and max visible actions

```mermaid
classDiagram
class AdaptiveTabs {
+props : AdaptiveTabsProps
+renderTabBar()
+renderContent()
}
class TabButton {
+props : TabButtonProps
+handleKeyDown()
+handleClose()
}
class ActionBar {
+props : ActionBarProps
+handleActionClick()
}
AdaptiveTabs --> TabButton : "renders"
AdaptiveTabs --> ActionBar : "renders"
```

**Diagram sources**
- [AdaptiveTabs.tsx:118-357](file://src/components/ui/AdaptiveTabs.tsx#L118-L357)

**Section sources**
- [AdaptiveTabs.tsx:50-580](file://src/components/ui/AdaptiveTabs.tsx#L50-L580)

### SubTabNavigation
Purpose:
- Secondary navigation within a tab, often used for subsections or views.

Highlights:
- Optional add button for creating new sub-tabs
- Active state management and disabled states
- Consistent styling with workspace context

**Section sources**
- [SubTabNavigation.tsx:8-93](file://src/components/tabbledWorkspace/SubTabNavigation.tsx#L8-L93)

### useTabNavigation Hook
Purpose:
- Centralized tab lifecycle and navigation orchestration for the workspace.

Key responsibilities:
- Create, activate, close, move, pin, and update tabs
- Manage tab groups and cross-group movement
- Maintain navigation history and enable back/forward navigation
- Resolve tab content types (component, URL, HTML/text)
- Module-aware navigation and context updates

Behavioral patterns:
- Deduplicates tabs by path unless forced
- Navigates to module/submodule routes
- Integrates with TabbedWorkspace for content rendering

```mermaid
flowchart TD
Start(["navigateToTab(path, options)"]) --> Exists{"Existing tab with same path?"}
Exists --> |Yes| Activate["Activate existing tab<br/>setModuleContext()"]
Exists --> |No| Create["createTab(path, options)"]
Create --> Store["storeCreateTab()"]
Activate --> Done(["Return {wasCreated:false, wasActivated:true}"])
Store --> Done2(["Return {wasCreated:true, wasActivated:true}"])
```

**Diagram sources**
- [useTabNavigation.ts:364-386](file://src/hooks/useTabNavigation.ts#L364-L386)

**Section sources**
- [useTabNavigation.ts:113-394](file://src/hooks/useTabNavigation.ts#L113-L394)

### TabbedWorkspace Integration
Purpose:
- Hosts AdaptiveTabs and renders active tab content with access checks and fallbacks.

Highlights:
- Empty state and “tab not found” messaging
- Access validation before rendering
- Custom content rendering hook and default route-based rendering

**Section sources**
- [TabbedWorkspace.tsx:345-399](file://src/components/tabbledWorkspace/TabbedWorkspace.tsx#L345-L399)

### Related UI Tabs (Legacy/Primitive)
Purpose:
- Simple, stateful Tabs component for basic scenarios.

Notes:
- Not used in the modern tabbed workspace; useful for simple pages or demos.

**Section sources**
- [Tabs.tsx:1-146](file://src/components/ui/Tabs.tsx#L1-L146)

## Dependency Analysis
Component relationships:
- AdaptiveTabs depends on useTabNavigation for stateful tab operations
- TabbedWorkspace composes AdaptiveTabs and renders active tab content
- PageTabs composes TabNavigation for page-level tabs
- SubTabNavigation complements AdaptiveTabs by enabling nested secondary navigation

```mermaid
graph LR
NT["useTabNavigation.ts"] --> AT["AdaptiveTabs.tsx"]
AT --> TW["TabbedWorkspace.tsx"]
PT["PageTabs.tsx"] --> TN["TabNavigation.tsx"]
ST["SubTabNavigation.tsx"] -. "nested within tabs" .-> AT
```

**Diagram sources**
- [useTabNavigation.ts:113-394](file://src/hooks/useTabNavigation.ts#L113-L394)
- [AdaptiveTabs.tsx:361-580](file://src/components/ui/AdaptiveTabs.tsx#L361-L580)
- [TabbedWorkspace.tsx:345-399](file://src/components/tabbledWorkspace/TabbedWorkspace.tsx#L345-L399)
- [PageTabs.tsx:65-172](file://src/components/ui/PageTabs.tsx#L65-L172)
- [TabNavigation.tsx:87-182](file://src/components/ui/TabNavigation.tsx#L87-L182)
- [SubTabNavigation.tsx:8-93](file://src/components/tabbledWorkspace/SubTabNavigation.tsx#L8-L93)

**Section sources**
- [useTabNavigation.ts:113-394](file://src/hooks/useTabNavigation.ts#L113-L394)
- [AdaptiveTabs.tsx:361-580](file://src/components/ui/AdaptiveTabs.tsx#L361-L580)
- [TabbedWorkspace.tsx:345-399](file://src/components/tabbledWorkspace/TabbedWorkspace.tsx#L345-L399)
- [PageTabs.tsx:65-172](file://src/components/ui/PageTabs.tsx#L65-L172)
- [TabNavigation.tsx:87-182](file://src/components/ui/TabNavigation.tsx#L87-L182)
- [SubTabNavigation.tsx:8-93](file://src/components/tabbledWorkspace/SubTabNavigation.tsx#L8-L93)

## Performance Considerations
Guidelines for large-scale tab environments:
- Limit concurrent active tabs using maxTabs configuration in AdaptiveTabs
- Prefer lazy loading for tab content:
  - Render tab content only when active
  - Defer heavy computations until tab becomes active
- Virtualize or paginate content for tabs with large datasets
- Avoid unnecessary re-renders:
  - Memoize tab content and props
  - Use controlled activeTab to prevent redundant state updates
- Minimize DOM nodes per tab:
  - Hide badges and icons when not needed
  - Collapse action bars when unused
- Use drag-and-drop only on desktop platforms to reduce overhead on mobile
- Persist only essential tab metadata to avoid bloated state

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Tab not found or empty workspace:
  - Verify activeTabId matches an existing tab
  - Confirm TabbedWorkspace fallback messages are not masking underlying errors
- Access denied to tab content:
  - Ensure validateTabAccess permits the active tab
  - Check permissions in tab metadata
- Excessive tabs causing performance problems:
  - Enforce maxTabs and close inactive tabs
  - Lazy-load content and dispose off-screen tabs
- Keyboard navigation not working:
  - Confirm TabButton handles Enter/Space keys
  - Ensure active tab receives focus via tabIndex
- Drag-and-drop not functional:
  - Verify draggable flag and platform detection
  - Ensure onTabReorder callback is provided

**Section sources**
- [TabbedWorkspace.tsx:345-399](file://src/components/tabbledWorkspace/TabbedWorkspace.tsx#L345-L399)
- [AdaptiveTabs.tsx:133-138](file://src/components/ui/AdaptiveTabs.tsx#L133-L138)
- [AdaptiveTabs.tsx:424-434](file://src/components/ui/AdaptiveTabs.tsx#L424-L434)

## Conclusion
SchoolPilot3’s navigation component system provides a robust, accessible, and responsive foundation for tabbed workspaces:
- AdaptiveTabs offers a unified, cross-platform experience with action bars, drag-and-drop, and platform-aware behavior
- useTabNavigation centralizes tab lifecycle and navigation history
- TabbedWorkspace integrates tabs with content rendering and access control
- TabNavigation and PageTabs complement page-level navigation needs
- SubTabNavigation enables nested secondary navigation within tabs

By combining these components with performance-conscious patterns—lazy loading, virtualization, and state pruning—teams can scale tabbed navigation to complex, data-rich applications while maintaining usability and accessibility.