ABOUTME: This document outlines the migration path for Akademiko Admissions features.
ABOUTME: It details the integration of old system functionalities into the new modular architecture.

# Akademiko Admissions Migration and New Feature Specification Document

## 1. Introduction
This document serves as a comprehensive specification for migrating missing functionalities from the old Akademiko Admissions WinForms system (desktop application with MySQL, no ORM, lacking internationalization) into the new modular web application. It also outlines the development of new features and enhancements to achieve full feature parity, focusing on modularity, internationalization, dynamic module loading, robust data handling, and enhanced reporting capabilities.

## 2. Scope
The scope of this document covers:
- Analysis and detailed specification of missing forms and reports from the old Akademiko Admissions system.
- Proposed module placements for these functionalities within the new modular architecture.
- Architectural design for new components, including a module-based reporting system and an enhanced `DetailedStudentList`.
- Data migration strategy from the old MySQL database to the new RxDB implementation.
- Integration of Role-Based Access Control (RBAC) and Internationalization (i18n).
- Testing strategy and phased implementation plan.

## 3. Missing Features Analysis
This section details each missing feature identified during the comparison between the old Akademiko Admissions system and the current administration module. For each feature, the following will be provided:

### 3.1. Certificates Management
- **Old System Functionality**: Description of how certificates were managed, generated, and issued in the old WinForms application. This includes any specific forms (`frm*.cs`) or reports (`rpt*.cs`) related to certificates, their underlying SQL queries, and DataGrid views.
- **Business Logic**: Explanation of the rules and processes governing certificate generation (e.g., student eligibility, data sources, approval workflows).
- **Proposed New System Implementation**: How this functionality will be implemented in the new modular system, including new pages, components, and integration points within the `Administration` module.

### 3.2. Disciplinary Cases Management
- **Old System Functionality**: Details on how disciplinary cases were recorded, tracked, and managed, including associated forms, SQL queries, and DataGrid views.
- **Business Logic**: Rules for logging incidents, assigning penalties, tracking resolutions, and reporting.
- **Proposed New System Implementation**: Integration into the `Administration` module, outlining UI/UX, data models, and workflows.

### 3.3. Student Data Import
- **Old System Functionality**: Description of the process for importing student data, including file formats supported, validation rules, and any associated forms or scripts.
- **Business Logic**: Data mapping, error handling, and update/insert logic.
- **Proposed New System Implementation**: Design of a robust data import utility within the `Administration` module, supporting various formats and providing clear feedback.

### 3.4. K.C.P.E. Marks Management
- **Old System Functionality**: How K.C.P.E. (Kenya Certificate of Primary Education) marks were entered, stored, and processed, including relevant forms, SQL queries, and DataGrid views.
- **Business Logic**: Calculation of aggregates, ranking, and reporting based on K.C.P.E. marks.
- **Proposed New System Implementation**: Dedicated pages and components within the `Administration` or `Academics` module for managing these marks.

### 3.5. SMS Communication Features
- **Old System Functionality**: Details on SMS sending capabilities, including message templates, recipient selection, and sending logs.
- **Business Logic**: Integration with SMS gateways, message queuing, and delivery status tracking.
- **Proposed New System Implementation**: Enhancement of the existing `Communication` module with these features, ensuring scalability and reliability.

### 3.6. Report Configurations
- **Old System Functionality**: How reports were configured and generated, including any parameters or customization options.
- **Business Logic**: Rules for report generation, data aggregation, and presentation.
- **Proposed New System Implementation**: A flexible reporting configuration interface within the new `Reports` module.

### 3.7. Scheduler
- **Old System Functionality**: Any scheduling functionalities present in the old system (e.g., task scheduling, event reminders).
- **Business Logic**: Logic for recurring tasks, notifications, and event management.
- **Proposed New System Implementation**: Integration into the `Administration` module or a dedicated `Scheduler` module.

### 3.8. Student Clearance
- **Old System Functionality**: Process for student clearance (e.g., at graduation or transfer), including checklists, approvals, and record updates.
- **Business Logic**: Dependencies, approval workflows, and status tracking.
- **Proposed New System Implementation**: A structured workflow within the `Administration` module.

### 3.9. Visitors Management
- **Old System Functionality**: How visitor information was recorded and managed.
- **Business Logic**: Visitor logging, entry/exit tracking, and reporting.
- **Proposed New System Implementation**: A dedicated section within the `Administration` module.

### 3.10. Other Identified Missing Forms/Reports
(List all other forms/reports identified in previous steps, following the same structure as above)

## 4. Proposed Module Placements
Based on the analysis, the identified missing forms and reports will be logically placed within the new modular architecture:

- **Administration Module**: Certificates Management, Disciplinary Cases Management, Student Data Import, K.C.P.E. Marks Management, Report Configurations, Scheduler, Student Clearance, Visitors Management, Enhanced Student List (including `DetailedStudentList`), User and Privileges Management, School Information Management, Database Management, Partners Management, Sports/Clubs Management, Dormitory Management, County/District Management.
- **Communication Module**: All SMS Communication Features.
- **Academics Module**: Assign Subject Teachers, Class Stream Management, Class Teachers Management, Subjects Management, Term Dates Management, Graduate Students.
- **HR Module**: Designation Management, Teacher Duty Schedule.
- **Core Application Level**: Login/License/Logo (these are foundational and not module-specific).
- **Module-Based Reporting**: A dedicated `src/modules/reports` module or enhancements to the existing `reports` module.

## 5. Architectural Design

### 5.1. New Module-Based Reporting System
- **Dedicated Module**: A new `src/modules/reports` module will be created to centralize all reporting functionalities.
- **Standardized Report Definition**: Each report will adhere to a standardized definition, including:
    - `reportId`: Unique identifier.
    - `name`: Display name (for i18n).
    - `component`: React component responsible for rendering the report UI.
    - `rbacPolicy`: RBAC policy for access control.
    - `parameters`: Definition of input parameters for the report (e.g., date ranges, student IDs).
    - `dataFetcher`: Function to fetch report data, potentially leveraging RxDB or direct API calls.
- **Dynamic Report Discovery**: The system will dynamically discover available reports from the `reports` module, allowing for easy addition of new reports without modifying core application code.
- **Integration**: Seamless integration with RxDB for data access, RBAC for permissions, internationalization for multi-language support, and the main navigation menu for user accessibility.

### 5.2. Enhanced Student List (`DetailedStudentList`)
- **New Page**: A new page, `DetailedStudentsListPage.tsx`, will be created within `src/modules/administration/pages`.
- **Advanced Filtering**: Comprehensive filtering options based on various student attributes (e.g., name, ID, class, status, gender, age, admission date).
- **Configurable DataGrid View**: A highly configurable DataGrid component with features such as:
    - Column customization (show/hide, reorder).
    - Sorting and grouping capabilities.
    - Export functionality (e.g., CSV, Excel).
    - Inline editing for quick data updates (with appropriate RBAC).
- **Integrated Student Detail View**: Clicking on a student in the DataGrid will open a detailed view, potentially in a slide-out panel or a new route, with a tabbed interface for different categories of student information (e.g., personal, academic, financial, disciplinary).
- **Data Integration**: Leveraging RxDB for efficient local data storage and synchronization, ensuring fast data retrieval and responsiveness.
- **Performance Optimization**: Implementation of virtualization for large datasets, debouncing for search inputs, and lazy loading for detailed views to ensure optimal performance.
- **RBAC and Internationalization**: Full integration with RBAC policies for data access and actions, and internationalization for all UI elements and data labels.

## 6. Data Migration Strategy
- **Source**: Old MySQL database (schema to be analyzed).
- **Target**: RxDB collections within the new application.
- **Schema Mapping**: Detailed mapping of old MySQL table schemas to new RxDB collection schemas. This will involve identifying primary keys, relationships, and data types.
- **Data Transformation**: Development of scripts or processes to transform data from the old schema to the new, handling data type conversions, normalization/denormalization, and data cleaning.
- **Incremental Migration**: Consideration for incremental data migration strategies if the system needs to remain operational during the transition.
- **Data Integrity**: Implementation of validation checks and reconciliation processes to ensure data integrity and consistency post-migration.

## 7. RBAC Integration
- **Granular Permissions**: Define granular permissions for all new and migrated features, specifying which roles can access, view, create, edit, or delete specific data or functionalities.
- **Policy Enforcement**: Integration with the existing RBAC service (`src/core/rbacService.ts`) to enforce policies at the UI and API levels.
- **Dynamic Permissions**: Support for dynamic permission assignment and management through an administrative interface.

## 8. Internationalization (i18n)
- **Multi-language Support**: All new UI elements, labels, messages, and data (where applicable) will support multiple languages.
- **Modular Translation Files**: Utilize modular translation files (`src/i18n/modularLoader.ts`) to manage translations efficiently.
- **Contextual Translations**: Implement mechanisms for contextual translations where text might vary based on the module or specific usage.

## 9. Testing Strategy
- **Unit Tests**: Comprehensive unit tests for all new components, services, and business logic, ensuring individual parts function correctly.
- **Integration Tests**: Integration tests to verify the interaction between different modules and components, including data flow and API calls.
- **End-to-End (E2E) Tests**: E2E tests to simulate user workflows and ensure the entire system functions as expected from a user perspective.
- **Performance Testing**: Specific tests for performance-critical areas, such as the `DetailedStudentList` and data import functionalities.
- **Security Testing**: Review and testing for security vulnerabilities, especially related to RBAC and data handling.

## 10. Phased Implementation Plan
- **Phase 1: Foundation & Core Migrations**: Establish the new `Reports` module structure, implement the basic `DetailedStudentList` with core filtering, and migrate essential data entities.
- **Phase 2: Key Feature Migrations**: Implement high-priority missing features (e.g., Certificates Management, SMS Communication) and enhance the `DetailedStudentList` with advanced DataGrid features.
- **Phase 3: Remaining Features & Refinement**: Migrate remaining functionalities, refine existing pages, and conduct comprehensive testing and performance optimization.
- **Phase 4: Deployment & Post-Launch Support**: Deploy the updated application, monitor performance, and provide ongoing support and maintenance.

Each phase will have defined milestones, deliverables, and success criteria.