# HR Module

<cite>
**Referenced Files in This Document**
- [index.ts](file://src/modules/hr/index.ts)
- [moduleDefinition.tsx](file://src/modules/hr/moduleDefinition.tsx)
- [rbac.ts](file://src/modules/hr/rbac.ts)
- [HRDashboardPage.tsx](file://src/modules/hr/pages/HRDashboardPage.tsx)
- [index.ts](file://src/modules/hr/pages/index.ts)
- [schema.ts](file://src/modules/hr/data/schema.ts)
- [mockData.ts](file://src/modules/hr/data/mockData.ts)
- [useHRData.ts](file://src/modules/hr/data/useHRData.ts)
- [HRDataProvider.tsx](file://src/modules/hr/data/HRDataProvider.tsx)
- [en.json](file://src/modules/hr/i18n/en.json)
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
This document describes the HR module functionality for managing staff records, salary settings, payroll item types, payroll periods, and payslips. It explains the payroll processing system including recurring items, payslip generation, and integration points with the broader data layer. It also covers staff benefits, deductions, and compensation tracking, along with data models, calculation considerations, and reporting features.

## Project Structure
The HR module is organized as a self-contained module with clear separation of concerns:
- Module definition and navigation
- RBAC permissions and roles
- Data schemas, collections, and mock data
- Page components for dashboards and management screens
- Data provider and hooks for data operations
- Internationalization keys for UI labels

```mermaid
graph TB
subgraph "HR Module"
IDX["index.ts<br/>Barrel exports"]
MOD["moduleDefinition.tsx<br/>Module definition"]
RBAC["rbac.ts<br/>Permissions & roles"]
PAGES["pages/<br/>Dashboard & Management"]
DATA["data/<br/>Schema, Collections, Hooks, Provider, Mock"]
I18N["i18n/en.json<br/>UI labels"]
end
IDX --> MOD
IDX --> RBAC
IDX --> DATA
IDX --> PAGES
IDX --> I18N
PAGES --> MOD
DATA --> MOD
RBAC --> MOD
```

**Diagram sources**
- [index.ts:1-28](file://src/modules/hr/index.ts#L1-L28)
- [moduleDefinition.tsx:1-57](file://src/modules/hr/moduleDefinition.tsx#L1-L57)
- [rbac.ts:1-151](file://src/modules/hr/rbac.ts#L1-L151)
- [HRDashboardPage.tsx:1-36](file://src/modules/hr/pages/HRDashboardPage.tsx#L1-L36)
- [schema.ts:36-75](file://src/modules/hr/data/schema.ts#L36-L75)
- [HRDataProvider.tsx:1-120](file://src/modules/hr/data/HRDataProvider.tsx#L1-L120)
- [en.json:1-14](file://src/modules/hr/i18n/en.json#L1-L14)

**Section sources**
- [index.ts:1-28](file://src/modules/hr/index.ts#L1-L28)
- [moduleDefinition.tsx:1-57](file://src/modules/hr/moduleDefinition.tsx#L1-L57)

## Core Components
- Module definition: Defines navigation, features, dependencies, and settings for the HR module.
- RBAC: Provides granular permissions for dashboard, payroll item types, payroll periods, payslips, and staff salary settings.
- Data schemas: Define payroll item types, staff salary settings, staff recurring items, and related indexes.
- Mock data: Provides initial datasets for payroll item types, staff salary settings, recurring items, and payslips.
- Data hooks and provider: Offer CRUD operations and state management for payroll-related entities.
- Pages: Dashboard and management pages for payroll item types, payroll periods, payslips, and staff salary settings.

**Section sources**
- [moduleDefinition.tsx:15-57](file://src/modules/hr/moduleDefinition.tsx#L15-L57)
- [rbac.ts:3-144](file://src/modules/hr/rbac.ts#L3-L144)
- [schema.ts:36-75](file://src/modules/hr/data/schema.ts#L36-L75)
- [mockData.ts:21-47](file://src/modules/hr/data/mockData.ts#L21-L47)
- [useHRData.ts:59-83](file://src/modules/hr/data/useHRData.ts#L59-L83)
- [HRDataProvider.tsx:1-120](file://src/modules/hr/data/HRDataProvider.tsx#L1-L120)
- [HRDashboardPage.tsx:1-36](file://src/modules/hr/pages/HRDashboardPage.tsx#L1-L36)

## Architecture Overview
The HR module integrates with the application's module system and data layer. It exposes navigation entries for payroll item types, payroll periods, payslips, and staff salary settings. Permissions are enforced via RBAC, and data operations are handled through a data provider and hooks.

```mermaid
graph TB
UI["Pages<br/>HRDashboardPage, PayrollItemTypesPage,<br/>PayrollPeriodsPage, PayslipsPage,<br/>StaffSalarySettingsPage"]
RBAC["RBAC<br/>Permissions & Roles"]
DATA["Data Layer<br/>Schemas, Collections, Hooks"]
PROVIDER["HRDataProvider<br/>CRUD operations"]
STORE["App Data Store<br/>useAppData"]
UI --> RBAC
UI --> DATA
DATA --> PROVIDER
UI --> STORE
STORE --> DATA
```

**Diagram sources**
- [moduleDefinition.tsx:23-29](file://src/modules/hr/moduleDefinition.tsx#L23-L29)
- [rbac.ts:3-144](file://src/modules/hr/rbac.ts#L3-L144)
- [schema.ts:36-75](file://src/modules/hr/data/schema.ts#L36-L75)
- [HRDataProvider.tsx:1-120](file://src/modules/hr/data/HRDataProvider.tsx#L1-L120)
- [HRDashboardPage.tsx:10-36](file://src/modules/hr/pages/HRDashboardPage.tsx#L10-L36)

## Detailed Component Analysis

### Module Definition and Navigation
- Navigation entries include dashboard, payroll item types, payroll periods, payslips, and staff salary settings.
- Features include payroll management, staff compensation, and HR records.
- Dependencies include the administration module.
- Settings define toggles for enabling payroll management and salary settings.

```mermaid
flowchart TD
Start(["Module Load"]) --> Nav["Build Navigation<br/>Dashboard, Payroll Item Types,<br/>Payroll Periods, Payslips,<br/>Staff Salary Settings"]
Nav --> Features["Enable Features<br/>payroll-management<br/>staff-compensation<br/>hr-records"]
Features --> Deps["Require administration module"]
Deps --> Settings["Expose Settings<br/>enablePayrollManagement<br/>enableSalarySettings"]
Settings --> End(["Ready"])
```

**Diagram sources**
- [moduleDefinition.tsx:23-52](file://src/modules/hr/moduleDefinition.tsx#L23-L52)

**Section sources**
- [moduleDefinition.tsx:15-57](file://src/modules/hr/moduleDefinition.tsx#L15-L57)

### RBAC Permissions
- Dashboard: read permission for viewing the HR dashboard.
- Payroll Item Types: read, create, update, delete permissions.
- Payroll Periods: read, create, update, delete permissions.
- Payslips: read, create, update, delete permissions.
- Staff Salary Settings: read, update permissions.
- Default roles include hr_manager and administrator.

```mermaid
classDiagram
class Permission {
+string id
+string name
+string description
+string resource
+string action
+string moduleId
+string feature
}
class HRPermissions {
+Permission[] hrPermissions
+string[] hrDefaultRoles
}
HRPermissions --> Permission : "defines"
```

**Diagram sources**
- [rbac.ts:3-144](file://src/modules/hr/rbac.ts#L3-L144)

**Section sources**
- [rbac.ts:3-144](file://src/modules/hr/rbac.ts#L3-L144)

### Data Models and Schemas
- Payroll Item Types: Earnings and deductions with tax implications and categories.
- Staff Salary Settings: Basic salary, payment bank, bank account number, max advance, recurring items, computed staff name.
- Staff Recurring Items: Link to payroll item types, amounts, computed category and name.
- Indexes: Name and category for payroll item types; staff_id for staff salary settings.

```mermaid
erDiagram
PAYROLL_ITEM_TYPE {
string id
string name
enum category
enum tax_implication
timestamp created_at
timestamp updated_at
}
STAFF_SALARY_SETTING {
string id
string staff_id
number basic_salary
string payment_bank
string bank_account_no
number max_advance_amount
timestamp created_at
timestamp updated_at
}
STAFF_RECURRING_ITEM {
string id
string staff_salary_setting_id
string item_type_id
number amount
string item_type_name
enum item_category
timestamp created_at
}
PAYROLL_ITEM_TYPE ||--o{ STAFF_RECURRING_ITEM : "references"
STAFF_SALARY_SETTING ||--o{ STAFF_RECURRING_ITEM : "contains"
```

**Diagram sources**
- [schema.ts:36-75](file://src/modules/hr/data/schema.ts#L36-L75)

**Section sources**
- [schema.ts:36-75](file://src/modules/hr/data/schema.ts#L36-L75)

### Mock Data
- Initial payroll item types include earnings (Basic Salary, House Allowance, Commuter Allowance) and deductions (PAYE, NHIF, NSSF Tier I) with tax implications.
- Initial staff salary settings include staff_id, basic_salary, payment_bank, bank_account_no, and computed staff_name.
- Initial staff recurring items link salary settings to specific payroll item types with amounts and computed metadata.
- Initial payslips include staff_id, period_id, and generated payslip data.

**Section sources**
- [mockData.ts:21-47](file://src/modules/hr/data/mockData.ts#L21-L47)

### Data Hooks and Provider
- useHRData provides CRUD operations for payroll item types and staff salary settings.
- HRDataProvider encapsulates data operations for payroll item types, staff salary settings, and related entities, including insert, update, and error handling.

```mermaid
sequenceDiagram
participant UI as "Page Component"
participant Hook as "useHRData"
participant Provider as "HRDataProvider"
participant DB as "Database"
UI->>Hook : "Call updateStaffSalarySetting(staffId, data)"
Hook->>Provider : "Forward operation"
Provider->>DB : "Update staff_members.salary_settings"
DB-->>Provider : "Result"
Provider-->>Hook : "Return updated doc"
Hook-->>UI : "Updated data"
```

**Diagram sources**
- [useHRData.ts:76-83](file://src/modules/hr/data/useHRData.ts#L76-L83)
- [HRDataProvider.tsx:1-120](file://src/modules/hr/data/HRDataProvider.tsx#L1-L120)

**Section sources**
- [useHRData.ts:59-83](file://src/modules/hr/data/useHRData.ts#L59-L83)
- [HRDataProvider.tsx:1-120](file://src/modules/hr/data/HRDataProvider.tsx#L1-L120)

### Dashboard and Reporting
- The HR dashboard aggregates staff counts by employment type and displays metrics and charts.
- It relies on app data hooks to load staff, payroll periods, payroll item types, and staff salary settings.

```mermaid
flowchart TD
Load["Load App Data<br/>staff, payrollPeriods,<br/>payrollItemTypes, staffSalarySettings"]
Count["Aggregate Employment Types"]
Metrics["Render Metrics & Charts"]
Display["Show Dashboard"]
Load --> Count --> Metrics --> Display
```

**Diagram sources**
- [HRDashboardPage.tsx:10-36](file://src/modules/hr/pages/HRDashboardPage.tsx#L10-L36)

**Section sources**
- [HRDashboardPage.tsx:1-36](file://src/modules/hr/pages/HRDashboardPage.tsx#L1-L36)

### Payroll Processing Workflows
- Payroll item types define earnings and deductions with tax implications.
- Staff salary settings define basic salary and recurring items linked to payroll item types.
- Payslips are generated per staff member and period, aggregating earnings and deductions from recurring items and item types.

```mermaid
sequenceDiagram
participant Admin as "HR Manager"
participant UI as "Payroll Item Types Page"
participant Settings as "Staff Salary Settings Page"
participant Payslips as "Payslips Page"
participant DB as "Database"
Admin->>UI : "Define item types (Earnings/Deductions)"
UI->>DB : "Insert/Update payroll_item_types"
Admin->>Settings : "Set basic salary and recurring items"
Settings->>DB : "Update staff_salary_settings.recurring_items"
Admin->>Payslips : "Generate payslips for selected period"
Payslips->>DB : "Read staff members, recurring items, item types"
Payslips-->>Admin : "Generated payslips"
```

**Diagram sources**
- [moduleDefinition.tsx:25-28](file://src/modules/hr/moduleDefinition.tsx#L25-L28)
- [schema.ts:36-75](file://src/modules/hr/data/schema.ts#L36-L75)
- [HRDataProvider.tsx:1-120](file://src/modules/hr/data/HRDataProvider.tsx#L1-L120)

## Dependency Analysis
- The HR module depends on the administration module and exposes its own RBAC permissions and default roles.
- Navigation entries reference page components by name, aligning with the pages barrel export.

```mermaid
graph LR
ADMIN["administration module"] --> HR["hr module"]
HR --> RBAC["hrPermissions, hrDefaultRoles"]
HR --> NAV["Navigation Entries"]
NAV --> PAGES["Page Components"]
```

**Diagram sources**
- [moduleDefinition.tsx:31-37](file://src/modules/hr/moduleDefinition.tsx#L31-L37)
- [rbac.ts:146-151](file://src/modules/hr/rbac.ts#L146-L151)
- [index.ts:1-7](file://src/modules/hr/pages/index.ts#L1-L7)

**Section sources**
- [moduleDefinition.tsx:31-37](file://src/modules/hr/moduleDefinition.tsx#L31-L37)
- [index.ts:1-7](file://src/modules/hr/pages/index.ts#L1-L7)

## Performance Considerations
- Use indexes on frequently queried fields (e.g., payroll item type name/category, staff salary settings staff_id) to optimize reads.
- Batch operations for recurring item updates to minimize database writes.
- Virtualize large lists in payslips and staff salary settings pages to reduce rendering overhead.
- Debounce search/filter operations in payroll item types and payslips listings.

## Troubleshooting Guide
- Permission denied errors: Verify RBAC permissions for the current role and ensure the role includes hr_manager or administrator.
- Data not loading: Confirm that the data provider is connected to the correct database and that collections exist (payroll_item_types, staff_salary_settings, staff_recurring_items).
- CRUD failures: Check for validation errors in staff salary settings (e.g., amount ranges, required fields) and ensure recurring items reference valid payroll item types.
- Dashboard rendering issues: Ensure app data hooks are returning expected shapes for staff, payroll periods, payroll item types, and staff salary settings.

**Section sources**
- [rbac.ts:3-144](file://src/modules/hr/rbac.ts#L3-L144)
- [HRDataProvider.tsx:1-120](file://src/modules/hr/data/HRDataProvider.tsx#L1-L120)
- [HRDashboardPage.tsx:10-36](file://src/modules/hr/pages/HRDashboardPage.tsx#L10-L36)

## Conclusion
The HR module provides a structured foundation for managing staff records, salary settings, payroll item types, payroll periods, and payslips. Its RBAC model ensures secure access, while schemas and mock data support development and testing. The module’s integration with the application’s data layer enables scalable payroll processing and reporting capabilities.