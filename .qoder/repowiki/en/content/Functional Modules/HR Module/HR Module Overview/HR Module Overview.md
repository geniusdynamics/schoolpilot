# HR Module Overview

<cite>
**Referenced Files in This Document**   
- [moduleDefinition.tsx](file://src/modules/hr/moduleDefinition.tsx)
- [rbac.ts](file://src/modules/hr/rbac.ts)
- [HRDashboardPage.tsx](file://src/modules/hr/pages/HRDashboardPage.tsx)
- [schema.ts](file://src/modules/hr/data/schema.ts)
- [collections.ts](file://src/modules/hr/data/collections.ts)
- [types.ts](file://src/core/types.ts)
- [rxdbService.ts](file://src/services/rxdbService.ts)
- [finance/moduleDefinition.tsx](file://src/modules/finance/moduleDefinition.tsx)
- [administration/moduleDefinition.tsx](file://src/modules/administration/moduleDefinition.tsx)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Module Architecture](#module-architecture)
3. [Core Data Models](#core-data-models)
4. [Module Registration and Loading](#module-registration-and-loading)
5. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
6. [HR Dashboard and User Interface](#hr-dashboard-and-user-interface)
7. [Integration with Other Modules](#integration-with-other-modules)
8. [Data Flow and Payroll Processing](#data-flow-and-payroll-processing)
9. [Feature Configuration and Availability](#feature-configuration-and-availability)
10. [System Architecture Diagram](#system-architecture-diagram)

## Introduction

The HR Module in the schoolpilot3 system serves as a centralized platform for managing all human resources functions within an educational institution. It provides comprehensive tools for staff payroll management, salary configuration, and HR record keeping. The module is designed to integrate seamlessly with other core systems such as Finance and Administration, creating a unified ecosystem for school management. This document provides a detailed overview of the HR module's architecture, functionality, and integration points, focusing on its role in managing PayrollPeriod, Payslip, and StaffSalarySetting entities.

## Module Architecture

The HR module follows a modular architecture pattern, with self-contained components for data management, user interface, and business logic. It leverages the core module loading system to register itself with the application and expose its functionality through a well-defined interface. The module's architecture is organized into distinct layers including data models, services, user interface components, and configuration files.

```mermaid
graph TD
subgraph "HR Module"
A[moduleDefinition.tsx] --> B[rbac.ts]
A --> C[pages/]
A --> D[data/]
D --> E[schema.ts]
D --> F[collections.ts]
C --> G[HRDashboardPage.tsx]
C --> H[PayrollPeriodsPage.tsx]
C --> I[PayslipsPage.tsx]
C --> J[StaffSalarySettingsPage.tsx]
end
subgraph "Core System"
K[core/moduleLoader.ts]
L[core/rbacService.ts]
M[services/rxdbService.ts]
end
A --> K
B --> L
D --> M
G --> K
style A fill:#f9f,stroke:#333
style K fill:#bbf,stroke:#333
style M fill:#bbf,stroke:#333
```

**Diagram sources**
- [moduleDefinition.tsx](file://src/modules/hr/moduleDefinition.tsx)
- [rbac.ts](file://src/modules/hr/rbac.ts)
- [schema.ts](file://src/modules/hr/data/schema.ts)
- [collections.ts](file://src/modules/hr/data/collections.ts)
- [HRDashboardPage.tsx](file://src/modules/hr/pages/HRDashboardPage.tsx)
- [rxdbService.ts](file://src/services/rxdbService.ts)

**Section sources**
- [moduleDefinition.tsx](file://src/modules/hr/moduleDefinition.tsx)
- [schema.ts](file://src/modules/hr/data/schema.ts)

## Core Data Models

The HR module defines several key data entities that form the foundation of its payroll and compensation management system. These entities are implemented using database-agnostic schemas that can be used with different database providers.

### PayrollPeriod
The PayrollPeriod entity represents a specific time interval for which payroll is processed. It includes start and end dates, financial year references, and status information.

**Section sources**
- [schema.ts](file://src/modules/hr/data/schema.ts#L5-L35)
- [types.ts](file://src/core/types.ts#L950-L961)

### StaffSalarySetting
The StaffSalarySetting entity contains the salary configuration for individual staff members, including basic salary, payment bank details, and recurring payroll items.

**Section sources**
- [schema.ts](file://src/modules/hr/data/schema.ts#L77-L109)
- [types.ts](file://src/core/types.ts#L983-L995)

### Payslip
The Payslip entity represents the payroll statement generated for a staff member for a specific PayrollPeriod. It includes gross salary, deductions, net salary, and detailed breakdown of earnings and deductions.

**Section sources**
- [schema.ts](file://src/modules/hr/data/schema.ts#L111-L142)
- [types.ts](file://src/core/types.ts#L1008-L1022)

## Module Registration and Loading

The HR module registers itself with the core application through the moduleDefinition.tsx file, which provides metadata about the module and its components. This registration process enables the core module loading system to discover and initialize the HR module.

```mermaid
sequenceDiagram
participant Core as Core Module Loader
participant HR as HR Module Definition
participant DB as RxDB Service
Core->>HR : Load module definition
HR->>Core : Return module metadata
Core->>Core : Register navigation routes
Core->>Core : Register RBAC permissions
Core->>DB : Register collections
DB->>DB : Add payroll_periods collection
DB->>DB : Add payroll_item_types collection
DB->>DB : Add staff_salary_settings collection
DB->>DB : Add payslips collection
DB-->>Core : Collections registered
Core-->>User : Module available in UI
```

**Diagram sources**
- [moduleDefinition.tsx](file://src/modules/hr/moduleDefinition.tsx)
- [collections.ts](file://src/modules/hr/data/collections.ts)
- [rxdbService.ts](file://src/services/rxdbService.ts)

**Section sources**
- [moduleDefinition.tsx](file://src/modules/hr/moduleDefinition.tsx)
- [collections.ts](file://src/modules/hr/data/collections.ts)

## Role-Based Access Control (RBAC)

The HR module implements a comprehensive role-based access control system through its rbac.ts configuration file. This system defines granular permissions for different HR operations, ensuring that users can only perform actions appropriate to their roles.

```mermaid
flowchart TD
A[HR Module] --> B[Permissions]
B --> C[hr.payrollPeriods.read]
B --> D[hr.payrollPeriods.create]
B --> E[hr.payrollPeriods.update]
B --> F[hr.payrollPeriods.delete]
B --> G[hr.payslips.read]
B --> H[hr.payslips.create]
B --> I[hr.payslips.update]
B --> J[hr.payslips.delete]
B --> K[hr.staffSalarySettings.read]
B --> L[hr.staffSalarySettings.update]
M[Roles] --> N[hr_manager]
M --> O[administrator]
N --> |Has all| B
O --> |Has all| B
P[UI Components] --> Q[Check Permissions]
Q --> |Allowed| R[Enable Actions]
Q --> |Denied| S[Disable Actions]
```

**Diagram sources**
- [rbac.ts](file://src/modules/hr/rbac.ts)

**Section sources**
- [rbac.ts](file://src/modules/hr/rbac.ts)

## HR Dashboard and User Interface

The HRDashboardPage.tsx serves as the primary entry point to the HR module, providing an overview of key HR metrics and navigation to specific functionality. The dashboard is designed to give HR managers quick access to essential payroll and staff management tools.

```mermaid
flowchart TB
A[HR Dashboard] --> B[Key Metrics]
B --> C[Active Staff Count]
B --> D[Pending Payslips]
B --> E[Payroll Periods Status]
B --> F[Salary Budget Utilization]
A --> G[Quick Actions]
G --> H[Create Payroll Period]
G --> I[Generate Payslips]
G --> J[Configure Salary Settings]
A --> K[Navigation Menu]
K --> L[Payroll Item Types]
K --> M[Payroll Periods]
K --> N[Payslips]
K --> O[Staff Salary Settings]
```

**Diagram sources**
- [HRDashboardPage.tsx](file://src/modules/hr/pages/HRDashboardPage.tsx)

**Section sources**
- [HRDashboardPage.tsx](file://src/modules/hr/pages/HRDashboardPage.tsx)

## Integration with Other Modules

The HR module integrates with other modules in the schoolpilot3 ecosystem to provide a comprehensive management solution. These integrations enable data sharing and coordinated workflows across different functional areas.

### Integration with Administration Module
The HR module has a required dependency on the Administration module, which provides staff records and organizational structure information.

```mermaid
graph LR
HR[HR Module] -- Depends on --> ADM[Administration Module]
ADM --> ST[Staff Records]
ADM --> DE[Departments]
ADM --> DS[Designations]
HR --> PP[PayrollPeriods]
HR --> SS[StaffSalarySettings]
HR --> PS[Payslips]
PP --> ADM
SS --> ST
PS --> ST
```

**Diagram sources**
- [moduleDefinition.tsx](file://src/modules/hr/moduleDefinition.tsx)
- [administration/moduleDefinition.tsx](file://src/modules/administration/moduleDefinition.tsx)

### Integration with Finance Module
While not a required dependency, the HR module can integrate with the Finance module for payment disbursements and accounting integration.

```mermaid
graph LR
HR[HR Module] -- Optional --> FIN[Finance Module]
HR --> PS[Payslips]
PS --> |Payment Data| FIN
FIN --> GL[General Ledger]
FIN --> BN[Banks]
FIN --> PY[Payments]
```

**Diagram sources**
- [moduleDefinition.tsx](file://src/modules/hr/moduleDefinition.tsx)
- [finance/moduleDefinition.tsx](file://src/modules/finance/moduleDefinition.tsx)

**Section sources**
- [moduleDefinition.tsx](file://src/modules/hr/moduleDefinition.tsx)
- [finance/moduleDefinition.tsx](file://src/modules/finance/moduleDefinition.tsx)

## Data Flow and Payroll Processing

The HR module implements a structured data flow for payroll processing, starting from configuration and ending with payslip generation. This process ensures accurate and consistent payroll calculations.

```mermaid
flowchart LR
A[Configure Payroll Item Types] --> B[Set Staff Salary Settings]
B --> C[Create Payroll Period]
C --> D[Generate Payslips]
D --> E[Review and Approve]
E --> F[Process Payments]
F --> G[Update Financial Records]
subgraph "Configuration"
A
B
end
subgraph "Execution"
C
D
E
F
end
subgraph "Integration"
G
end
```

**Section sources**
- [schema.ts](file://src/modules/hr/data/schema.ts)
- [types.ts](file://src/core/types.ts)

## Feature Configuration and Availability

The HR module supports feature configuration through settings that control module availability and functionality. These settings can be used to enable or disable specific features based on institutional requirements.

:enablePayrollManagement: boolean setting that controls access to payroll management features
:enableSalarySettings: boolean setting that controls access to staff salary configuration

The module's availability can also be controlled through the isActive flag in the module definition, allowing administrators to completely enable or disable the HR module as needed.

**Section sources**
- [moduleDefinition.tsx](file://src/modules/hr/moduleDefinition.tsx)

## System Architecture Diagram

The following diagram illustrates the position of the HR module within the overall application architecture, showing its relationships with the core system and other modules.

```mermaid
graph TB
subgraph "Core System"
ML[Module Loader]
RBAC[RBAC Service]
DB[Database Service]
end
subgraph "Modules"
HR[HR Module]
ADM[Administration Module]
FIN[Finance Module]
ACAD[Academics Module]
INV[Inventory Module]
end
HR --> ML
HR --> RBAC
HR --> DB
HR --> ADM
HR -. Optional .-> FIN
ADM --> ML
ADM --> RBAC
ADM --> DB
FIN --> ML
FIN --> RBAC
FIN --> DB
style HR fill:#f96,stroke:#333
style ML fill:#bbf,stroke:#333
style DB fill:#bbf,stroke:#333
```

**Diagram sources**
- [moduleDefinition.tsx](file://src/modules/hr/moduleDefinition.tsx)
- [administration/moduleDefinition.tsx](file://src/modules/administration/moduleDefinition.tsx)
- [finance/moduleDefinition.tsx](file://src/modules/finance/moduleDefinition.tsx)
- [rxdbService.ts](file://src/services/rxdbService.ts)