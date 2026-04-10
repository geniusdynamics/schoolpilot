# Academics Module

<cite>
**Referenced Files in This Document**
- [moduleDefinition.tsx](file://src/modules/academics/moduleDefinition.tsx)
- [index.ts](file://src/modules/academics/index.ts)
- [lifecycle.ts](file://src/modules/academics/lifecycle.ts)
- [AcademicsDashboardPage.tsx](file://src/modules/academics/pages/AcademicsDashboardPage.tsx)
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
This document describes the Academics module functionality and its integration within the broader system. It focuses on the module's navigation structure, feature set, and the dashboard that surfaces academic metrics. The module exposes capabilities for managing subjects, timetables, exams, grading schemes, and related academic workflows, while integrating with administrative and optional financial systems.

## Project Structure
The Academics module is defined as a self-contained module with:
- A module definition that declares navigation entries, features, dependencies, and settings
- A lifecycle that registers services upon enabling the module
- A dashboard page that visualizes academic metrics and departmental subject counts

```mermaid
graph TB
subgraph "Academics Module"
MD["moduleDefinition.tsx<br/>Defines module metadata, navigation, features, dependencies, settings"]
IDX["index.ts<br/>Exports module definition and pages"]
LC["lifecycle.ts<br/>Registers services on enable"]
DP["AcademicsDashboardPage.tsx<br/>Renders dashboard metrics and charts"]
end
MD --> IDX
IDX --> DP
LC --> MD
```

**Diagram sources**
- [moduleDefinition.tsx:25-96](file://src/modules/academics/moduleDefinition.tsx#L25-L96)
- [index.ts:4-8](file://src/modules/academics/index.ts#L4-L8)
- [lifecycle.ts:9-23](file://src/modules/academics/lifecycle.ts#L9-L23)
- [AcademicsDashboardPage.tsx:13-82](file://src/modules/academics/pages/AcademicsDashboardPage.tsx#L13-L82)

**Section sources**
- [moduleDefinition.tsx:25-96](file://src/modules/academics/moduleDefinition.tsx#L25-L96)
- [index.ts:4-8](file://src/modules/academics/index.ts#L4-L8)
- [lifecycle.ts:9-23](file://src/modules/academics/lifecycle.ts#L9-L23)
- [AcademicsDashboardPage.tsx:13-82](file://src/modules/academics/pages/AcademicsDashboardPage.tsx#L13-L82)

## Core Components
- Module definition: Declares navigation entries for subjects, timetables, exam scheduling, papers, allocations, assignments, and lesson plans; defines features and dependencies; exposes settings toggles.
- Lifecycle: Provides hooks for registration, enabling (service registration), and disabling (placeholder).
- Dashboard: Aggregates and visualizes academic metrics such as total subjects, subject papers, exam sessions, grading schemes, and departmental subject distribution.

**Section sources**
- [moduleDefinition.tsx:33-58](file://src/modules/academics/moduleDefinition.tsx#L33-L58)
- [moduleDefinition.tsx:59-95](file://src/modules/academics/moduleDefinition.tsx#L59-L95)
- [lifecycle.ts:9-23](file://src/modules/academics/lifecycle.ts#L9-L23)
- [AcademicsDashboardPage.tsx:37-68](file://src/modules/academics/pages/AcademicsDashboardPage.tsx#L37-L68)

## Architecture Overview
The module integrates with the core module system and depends on administrative services. It optionally integrates with financial services. The dashboard consumes application data to render metrics and charts.

```mermaid
graph TB
Core["Core Module System"]
Admin["Administration Module"]
Finance["Finance Module (optional)"]
AM["Academics Module"]
MD["moduleDefinition.tsx"]
LC["lifecycle.ts"]
DP["AcademicsDashboardPage.tsx"]
Core --> AM
AM --> MD
AM --> LC
AM --> DP
AM -. optional .-> Finance
AM --> Admin
```

**Diagram sources**
- [moduleDefinition.tsx:60-73](file://src/modules/academics/moduleDefinition.tsx#L60-L73)
- [lifecycle.ts:3-34](file://src/modules/academics/lifecycle.ts#L3-L34)
- [AcademicsDashboardPage.tsx:15-22](file://src/modules/academics/pages/AcademicsDashboardPage.tsx#L15-L22)

## Detailed Component Analysis

### Module Definition
The module definition encapsulates:
- Navigation entries for core academic workflows (dashboard, subjects, timetable periods/entries, exam scheduling, subject papers, allocations, student enrollment, exam sessions, analysis, results entry, grading schemes, education systems)
- Sub-features merged from other modules (assignments and lesson plans)
- Features list indicating capabilities (subject-management, class-management, timetable, exam-management, grading, assignment-management, lesson-planning)
- Dependencies on administration (required) and finance (optional)
- Settings toggles for enabling/disabling exam management, timetable management, and grading schemes

```mermaid
classDiagram
class ModuleDefinition {
+string id
+string name
+string description
+Icon icon
+string path
+boolean isActive
+string version
+NavigationEntry[] navigation
+string[] features
+Dependency[] dependencies
+Dependency[] optionalDependencies
+Settings settings
+Permissions rbacPermissions
+Role[] defaultRoles
}
class NavigationEntry {
+string name
+string path
+Icon icon
+string page
+string feature
}
class Dependency {
+string moduleId
+string version
+boolean required
}
class Settings {
+string category
+SettingItem[] items
}
ModuleDefinition --> NavigationEntry : "contains"
ModuleDefinition --> Dependency : "has"
ModuleDefinition --> Settings : "has"
```

**Diagram sources**
- [moduleDefinition.tsx:25-96](file://src/modules/academics/moduleDefinition.tsx#L25-L96)

**Section sources**
- [moduleDefinition.tsx:33-58](file://src/modules/academics/moduleDefinition.tsx#L33-L58)
- [moduleDefinition.tsx:59-95](file://src/modules/academics/moduleDefinition.tsx#L59-L95)

### Lifecycle Management
The lifecycle manages service registration when the module is enabled and logs registration/disable events. The service registration mechanism is delegated to a dedicated registration function.

```mermaid
sequenceDiagram
participant Core as "Core Module System"
participant Mod as "Academics Module"
participant Reg as "registerAcademicsServices"
Core->>Mod : "onAcademicsModuleEnable()"
Mod->>Mod : "Load educationSystemConfig (TODO)"
Mod->>Reg : "registerAcademicsServices(config)"
Reg-->>Mod : "Services registered"
Mod-->>Core : "Enabled"
```

**Diagram sources**
- [lifecycle.ts:18-23](file://src/modules/academics/lifecycle.ts#L18-L23)

**Section sources**
- [lifecycle.ts:9-23](file://src/modules/academics/lifecycle.ts#L9-L23)

### Dashboard Metrics and Charts
The dashboard aggregates academic metrics and departmental subject distribution:
- Metrics: Total subjects, total subject papers, exam sessions, grading schemes
- Chart: Bar chart of subjects per academic department
- Notifications: Status messages based on department availability

```mermaid
flowchart TD
Start(["Render Dashboard"]) --> LoadData["Load app data:<br/>subjects, subjectPapers, examSessions, gradingSchemes, departments"]
LoadData --> CheckLoading{"Any loading flag true?"}
CheckLoading --> |Yes| ShowSpinner["Show spinner until data ready"]
CheckLoading --> |No| FilterDepts["Filter academic departments"]
FilterDepts --> BuildMetrics["Build metrics array"]
BuildMetrics --> BuildChart["Compute subjects per department"]
BuildChart --> HasData{"Has departmental data?"}
HasData --> |Yes| RenderChart["Render bar chart"]
HasData --> |No| NoChart["No chart to render"]
RenderChart --> BuildNotif["Build notification based on departments"]
NoChart --> BuildNotif
BuildNotif --> End(["Render dashboard"])
```

**Diagram sources**
- [AcademicsDashboardPage.tsx:15-68](file://src/modules/academics/pages/AcademicsDashboardPage.tsx#L15-L68)

**Section sources**
- [AcademicsDashboardPage.tsx:15-68](file://src/modules/academics/pages/AcademicsDashboardPage.tsx#L15-L68)

## Dependency Analysis
The module declares:
- Required dependency on the administration module
- Optional dependency on the finance module
- Navigation entries for assignments and lesson plans sub-features

```mermaid
graph TB
AM["Academics Module"]
ADM["Administration Module"]
FIN["Finance Module (optional)"]
AM --> ADM
AM -. optional .-> FIN
```

**Diagram sources**
- [moduleDefinition.tsx:60-73](file://src/modules/academics/moduleDefinition.tsx#L60-L73)

**Section sources**
- [moduleDefinition.tsx:60-73](file://src/modules/academics/moduleDefinition.tsx#L60-L73)

## Performance Considerations
- Dashboard rendering defers until all relevant data loads to avoid partial renders
- Chart rendering uses responsive containers and tooltips for efficient presentation
- Filtering and aggregation of departmental data occur client-side; consider pagination or virtualization for large datasets

## Troubleshooting Guide
- If the dashboard remains blank, verify that loading flags for subjects, subject papers, exam sessions, grading schemes, and departments are resolved
- If departmental chart does not appear, confirm that academic departments exist and are properly filtered
- If navigation links are missing, check the navigation array in the module definition for correct page references

**Section sources**
- [AcademicsDashboardPage.tsx:24-28](file://src/modules/academics/pages/AcademicsDashboardPage.tsx#L24-L28)
- [AcademicsDashboardPage.tsx:30-34](file://src/modules/academics/pages/AcademicsDashboardPage.tsx#L30-L34)
- [moduleDefinition.tsx:33-58](file://src/modules/academics/moduleDefinition.tsx#L33-L58)

## Conclusion
The Academics module provides a structured foundation for academic workflows, including navigation, feature flags, and a dashboard for key metrics. Its lifecycle integrates with the core module system, and its dashboard offers immediate visibility into academic activity. Future development should focus on implementing service registration, data models, and workflows for exam scheduling, paper setting, results processing, student enrollment, teacher allocations, timetables, grading engines, merit lists, and analytics.