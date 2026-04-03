# Data Models & Schemas

<cite>
**Referenced Files in This Document**
- [databaseAgnosticSchema.ts](file://src/utils/databaseAgnosticSchema.ts)
- [schemaUtils.ts](file://src/utils/schemaUtils.ts)
- [SchemaConverter.ts](file://src/services/database/SchemaConverter.ts)
- [collections.ts](file://src/modules/inventory/data/collections.ts)
- [types.ts](file://src/modules/finance/data/types.ts)
- [schema.ts](file://src/modules/finance/data/schema.ts)
- [types.ts](file://src/modules/hr/data/types.ts)
- [schema.ts](file://src/modules/hr/data/schema.ts)
- [schema.ts](file://src/modules/academics/data/schema.ts)
- [types.ts](file://src/modules/academics/data/types.ts)
- [schema.ts](file://src/modules/administration/data/schema.ts)
- [ProviderSelector.ts](file://src/services/database/ProviderSelector.ts)
- [interfaces.ts](file://src/services/database/interfaces.ts)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for new database-agnostic schema system
- Updated finance module schemas with enhanced data models
- Documented new schema conversion utilities and provider selection logic
- Enhanced cross-module integration with database abstraction layer
- Added new section on schema conversion and normalization processes

## Table of Contents
1. [Introduction](#introduction)
2. [Core Data Model Overview](#core-data-model-overview)
3. [Database-Agnostic Schema System](#database-agnostic-schema-system)
4. [Academics Module](#academics-module)
5. [Finance Module](#finance-module)
6. [HR Module](#hr-module)
7. [Inventory Module](#inventory-module)
8. [Cross-Module Relationships](#cross-module-relationships)
9. [Schema Design Principles](#schema-design-principles)
10. [Schema Conversion and Normalization](#schema-conversion-and-normalization)
11. [Entity Relationship Diagram](#entity-relationship-diagram)
12. [Sample Data Instances](#sample-data-instances)
13. [Schema Evolution & Migration](#schema-evolution--migration)

## Introduction
This document provides comprehensive documentation of the data models and schemas for schoolpilot3, an educational management system with 88 collections spanning academics, finance, HR, inventory, and administration modules. The system uses RxDB for client-side data management with a new database-agnostic schema abstraction layer that supports multiple storage backends. The data model emphasizes referential integrity through foreign key patterns and computed fields for performance optimization. This documentation details the schema design, entity relationships, field-level specifications, and normalization strategies across all major modules.

## Core Data Model Overview
The schoolpilot3 application implements a modular data architecture with domain-specific collections organized by functional modules. The system now uses a database-agnostic schema abstraction layer that provides backward compatibility while enabling support for multiple database providers (RxDB, PouchDB, SQLite). Each module contains its own schema and type definitions, promoting encapsulation while maintaining cross-module referential integrity through standardized identifier patterns. The data model supports complex relationships such as Student → Enrollment → ExamResults and Item → StockTransaction → Requisition through foreign key references and nested data structures.

**Section sources**
- [databaseAgnosticSchema.ts:1-375](file://src/utils/databaseAgnosticSchema.ts#L1-L375)
- [schemaUtils.ts:1-35](file://src/utils/schemaUtils.ts#L1-L35)
- [collections.ts:1-51](file://src/modules/inventory/data/collections.ts#L1-L51)

## Database-Agnostic Schema System
The new database-agnostic schema system provides a unified approach to defining database schemas that work across multiple database providers. This system introduces standardized field types, property definitions, and schema validation that ensures consistency and compatibility across different storage backends.

### Schema Architecture
The database-agnostic schema system defines core interfaces for schema creation, property definitions, and type safety. The system supports both single-field and composite primary keys, array properties, and reference relationships between collections.

```mermaid
erDiagram
DATABASE_SCHEMA ||--o{ DATABASE_PROPERTY : contains
DATABASE_SCHEMA ||--|| PRIMARY_KEY : has
DATABASE_PROPERTY ||--|| DATABASE_FIELD_TYPE : uses
DATABASE_SCHEMA {
string title
number version
primary_key primary_key
string type
record properties
string[] required
array indexes
string[] encrypted
}
DATABASE_PROPERTY {
database_field_type type
string description
any default
any[] enum
database_property items
record properties
string[] required
number min_length
number max_length
number minimum
number maximum
number multiple_of
string pattern
string format
string ref
boolean nullable
boolean final
}
PRIMARY_KEY {
string_or_composite key
string[] fields
string separator
}
```

**Diagram sources**
- [databaseAgnosticSchema.ts:4-70](file://src/utils/databaseAgnosticSchema.ts#L4-L70)

### Field Type System
The system defines a comprehensive set of database field types that work consistently across different database providers. These include basic types (string, number, integer, boolean), complex types (array, object, date, timestamp), and specialized types (uuid, ref for references).

**Section sources**
- [databaseAgnosticSchema.ts:4-47](file://src/utils/databaseAgnosticSchema.ts#L4-L47)

## Academics Module
The Academics module manages educational content, student assessments, and instructional scheduling. It implements a normalized schema design with entities for subjects, exams, grading, and timetabling, connected through well-defined relationships that support comprehensive academic reporting and analysis.

### Subject and Paper Management
The subject management system separates subjects from their papers (examination components) to support modular assessment design. Each subject can have multiple papers, and papers are linked to specific exam sessions through exam paper settings.

```mermaid
erDiagram
SUBJECT ||--o{ SUBJECT_PAPER : contains
SUBJECT_PAPER ||--o{ EXAM_PAPER_SETTING : configured_for
EXAM_PAPER_SETTING }|--|| EXAM_SESSION : belongs_to
SUBJECT_PAPER ||--o{ STUDENT_PAPER_MARK : scored_on
STUDENT_PAPER_MARK }|--|| STUDENT_EXAM_RESULT : part_of
SUBJECT {
integer id PK
string subject_code
string name
string grouping
boolean is_compulsory
string department_id FK
}
SUBJECT_PAPER {
integer id PK
string subject_id FK
string name
}
EXAM_PAPER_SETTING {
string id PK
string exam_session_id FK
string subject_paper_id FK
number marks_out_of
number weight_percentage
}
EXAM_SESSION {
string id PK
string name
string school_period_id FK
string status
}
STUDENT_EXAM_RESULT {
string id PK
string student_id FK
string exam_session_id FK
number total_marks
string mean_grade
}
STUDENT_PAPER_MARK {
string id PK
string student_exam_result_id FK
string paper_setting_id FK
number score
}
```

**Diagram sources**
- [schema.ts:100-150](file://src/modules/academics/data/schema.ts#L100-L150)
- [schema.ts:151-200](file://src/modules/academics/data/schema.ts#L151-L200)

**Section sources**
- [schema.ts:100-250](file://src/modules/academics/data/schema.ts#L100-L250)

### Exam Results and Grading
The exam results system implements a hierarchical structure where student exam results contain individual paper marks. Grading schemes define the criteria for converting numerical scores to letter grades or other grading systems, supporting multiple educational frameworks.

```mermaid
erDiagram
GRADING_SCHEME ||--o{ GRADING_SCHEME_LEVEL : contains
GRADING_SCHEME ||--|| EXAM_SESSION : applied_to
STUDENT_EXAM_RESULT ||--|| RESULT_APPROVAL : requires
STUDENT_EXAM_RESULT ||--o{ STUDENT_PAPER_MARK : contains
EXAM_SESSION ||--o{ EXAM_SCHEDULE : scheduled_in
GRADING_SCHEME {
integer id PK
string name
boolean is_default
}
GRADING_SCHEME_LEVEL {
integer id PK
integer scheme_id FK
string grade
number min_score
number max_score
number points
}
RESULT_APPROVAL {
string id PK
string result_id FK
string state
}
EXAM_SCHEDULE {
string id PK
string exam_id FK
string period_id FK
string class_stream_id FK
string invigilator_id FK
}
```

**Diagram sources**
- [schema.ts:201-250](file://src/modules/academics/data/schema.ts#L201-L250)
- [schema.ts:50-100](file://src/modules/academics/data/schema.ts#L50-L100)

**Section sources**
- [schema.ts:201-305](file://src/modules/academics/data/schema.ts#L201-L305)

### Class and Student Enrollment
The enrollment system connects students to subjects through class subject allocations, which represent the curriculum for a specific class stream in an academic year. Teacher assignments are linked to these allocations, creating a complete instructional framework.

```mermaid
erDiagram
CLASS_SUBJECT_ALLOCATION ||--|| CLASS_STREAM : taught_in
CLASS_SUBJECT_ALLOCATION ||--|| SUBJECT : covers
CLASS_SUBJECT_ALLOCATION ||--|| ACADEMIC_YEAR : occurs_in
CLASS_SUBJECT_ALLOCATION ||--o{ TEACHER_SUBJECT_ASSIGNMENT : assigned_to
CLASS_SUBJECT_ALLOCATION ||--o{ STUDENT_SUBJECT_ENROLLMENT : enrolled_in
TEACHER_SUBJECT_ASSIGNMENT }|--|| STAFF : taught_by
STUDENT_SUBJECT_ENROLLMENT }|--|| STUDENTS : enrolled_student
CLASS_SUBJECT_ALLOCATION {
string id PK
string class_stream_id FK
string subject_id FK
string academic_year_id FK
boolean is_enrolled
}
TEACHER_SUBJECT_ASSIGNMENT {
string id PK
string allocation_id FK
string teacher_id FK
}
STUDENT_SUBJECT_ENROLLMENT {
string id PK
string student_id FK
string class_subject_allocation_id FK
string enrollment_date
string status
}
```

**Diagram sources**
- [schema.ts:251-305](file://src/modules/academics/data/schema.ts#L251-L305)

**Section sources**
- [schema.ts:251-305](file://src/modules/academics/data/schema.ts#L251-L305)

## Finance Module
The Finance module implements a comprehensive accounting system with entities for financial periods, chart of accounts, fee management, and payment processing. The schema follows accounting principles with support for double-entry bookkeeping through general ledger entries.

### Chart of Accounts and Financial Structure
The financial structure is built around the chart of accounts, which categorizes all financial transactions into standard accounting categories (Asset, Liability, Equity, Revenue, Expense). Each financial year contains multiple school periods, creating a hierarchical time-based organization.

```mermaid
erDiagram
FINANCIAL_YEAR ||--o{ SCHOOL_PERIOD : contains
CHART_OF_ACCOUNT ||--o{ ACCOUNT : belongs_to
FINANCIAL_YEAR {
string id PK
string name
date start_date
date end_date
string status
}
SCHOOL_PERIOD {
string id PK
string financial_year_id FK
string name
date start_date
date end_date
string status
}
CHART_OF_ACCOUNT {
string id PK
string code
string name
string category
string parent_id FK
boolean is_active
}
ACCOUNT {
string id PK
string coa_id FK
string code
string name
string description
string currency
string created_by
date created_at
}
```

**Diagram sources**
- [schema.ts](file://src/modules/finance/data/schema.ts)

**Section sources**
- [schema.ts](file://src/modules/finance/data/schema.ts)
- [types.ts](file://src/modules/finance/data/types.ts)

### Fee Management and Student Invoices
The fee management system tracks academic fees, payment plans, and student invoicing. Student invoices contain detailed breakdowns of charges, discounts, and payments, supporting comprehensive financial tracking and reporting.

```mermaid
erDiagram
FEE_TEMPLATE ||--o{ FEE_TEMPLATE_ITEM : contains
FEE_TEMPLATE_ITEM ||--|| ACCOUNT : mapped_to
STUDENT_INVOICE ||--o{ INVOICE_LINE_ITEM : contains
STUDENT_INVOICE ||--o{ PAYMENT : recorded_as
PAYMENT ||--|| ACCOUNT : credited_to
FEE_TEMPLATE {
string id PK
string academic_year_id FK
string name
string description
string status
}
FEE_TEMPLATE_ITEM {
string id PK
string template_id FK
string account_id FK
number amount
number discount_percent
number discount_amount
string description
}
STUDENT_INVOICE {
string id PK
string student_id FK
string academic_year_id FK
string fee_template_id FK
number subtotal
number discount_total
number tax_total
number grand_total
string status
date due_date
date issued_date
}
INVOICE_LINE_ITEM {
string id PK
string invoice_id FK
string account_id FK
number quantity
number unit_price
number total_amount
string description
}
PAYMENT {
string id PK
string invoice_id FK
string account_id FK
number amount
string payment_method
string reference_number
date payment_date
string status
}
```

**Diagram sources**
- [schema.ts](file://src/modules/finance/data/schema.ts)

**Section sources**
- [schema.ts](file://src/modules/finance/data/schema.ts)
- [types.ts](file://src/modules/finance/data/types.ts)

## HR Module
The HR module manages staff records, payroll processing, and human resource operations. The schema supports comprehensive employee data management with detailed personal information, employment history, and compensation structures.

### Staff Management and Employment Records
The HR system maintains detailed staff profiles with personal information, employment details, and organizational hierarchy. Staff members are linked to departments, positions, and employment contracts.

```mermaid
erDiagram
DEPARTMENT ||--o{ STAFF : employs
DEPARTMENT ||--o{ POSITION : contains
STAFF ||--o{ EMPLOYMENT_HISTORY : has
EMPLOYMENT_HISTORY ||--|| PAYROLL : processed_through
PAYROLL ||--o{ PAYSLIP : generates
PAYROLL {
string id PK
string staff_id FK
string pay_period_id FK
number basic_salary
number allowances
number deductions
number net_pay
date pay_date
string status
}
EMPLOYMENT_HISTORY {
string id PK
string staff_id FK
string department_id FK
string position_id FK
date start_date
date end_date
string employment_type
string status
}
PAYSLIP {
string id PK
string payroll_id FK
string staff_id FK
string pay_period_id FK
number gross_earnings
number total_deductions
number net_payment
date generated_date
string status
}
```

**Diagram sources**
- [schema.ts](file://src/modules/hr/data/schema.ts)
- [types.ts](file://src/modules/hr/data/types.ts)

**Section sources**
- [schema.ts](file://src/modules/hr/data/schema.ts)
- [types.ts](file://src/modules/hr/data/types.ts)

## Inventory Module
The Inventory module handles warehouse management, stock control, and procurement processes. The schema supports comprehensive inventory tracking with item categories, stock levels, and transaction management.

### Warehouse and Stock Management
The inventory system manages multiple warehouses with detailed item tracking, stock levels, and transaction histories. Items are categorized and tracked through various stock transactions including receipts, issues, and transfers.

```mermaid
erDiagram
WAREHOUSE ||--o{ ITEM_CATEGORY : contains
WAREHOUSE ||--o{ STOCK_LEVEL : tracks
ITEM_CATEGORY ||--o{ ITEM : belongs_to
ITEM ||--o{ STOCK_TRANSACTION : involved_in
STOCK_TRANSACTION ||--o{ REQUISITION : supports
REQUISITION ||--o{ PURCHASE_ORDER : generates
WAREHOUSE {
string id PK
string name
string location
string manager_id FK
string status
}
ITEM_CATEGORY {
string id PK
string warehouse_id FK
string name
string description
}
ITEM {
string id PK
string category_id FK
string code
string name
string description
string unit_of_measure
number reorder_level
string status
}
STOCK_LEVEL {
string id PK
string item_id FK
string warehouse_id FK
number current_stock
number reserved_stock
number available_stock
date last_updated
}
STOCK_TRANSACTION {
string id PK
string item_id FK
string warehouse_id FK
string transaction_type
number quantity
number unit_cost
number total_value
string reference_number
string approved_by
date transaction_date
string status
}
REQUISITION {
string id PK
string requested_by FK
string approved_by FK
string department
string purpose
date request_date
date required_by
string status
}
PURCHASE_ORDER {
string id PK
string supplier_id FK
string requested_by FK
string approved_by FK
date order_date
date delivery_date
number total_amount
string status
}
```

**Diagram sources**
- [collections.ts:1-51](file://src/modules/inventory/data/collections.ts#L1-L51)

**Section sources**
- [collections.ts:1-51](file://src/modules/inventory/data/collections.ts#L1-L51)

## Cross-Module Relationships
The schoolpilot3 system implements comprehensive cross-module relationships that enable data sharing and integration across different functional areas. The database-agnostic schema system ensures consistent referential integrity across all module boundaries.

### Data Integration Patterns
The system uses standardized identifier patterns and foreign key relationships to maintain referential integrity across modules. Common integration patterns include student references across academics and finance modules, staff references in HR and inventory modules, and departmental hierarchies spanning multiple modules.

```mermaid
erDiagram
STUDENT ||--o{ ACADEMIC_ENROLLMENT : enrolled_in
STUDENT ||--o{ FINANCIAL_ACCOUNT : has
STAFF ||--o{ HR_RECORD : employed_as
DEPARTMENT ||--o{ STAFF : contains
DEPARTMENT ||--o{ ACADEMIC_COURSE : offers
ACADEMIC_ENROLLMENT ||--|| FINANCIAL_INVOICE : generates
FINANCIAL_INVOICE ||--|| PAYMENT : receives
STAFF ||--o{ INVENTORY_ISSUE : requests
INVENTORY_ISSUE ||--|| WAREHOUSE : sourced_from
```

**Diagram sources**
- [databaseAgnosticSchema.ts:34-37](file://src/utils/databaseAgnosticSchema.ts#L34-L37)
- [schema.ts](file://src/modules/finance/data/schema.ts)

**Section sources**
- [databaseAgnosticSchema.ts:34-37](file://src/utils/databaseAgnosticSchema.ts#L34-L37)
- [ProviderSelector.ts](file://src/services/database/ProviderSelector.ts)
- [interfaces.ts](file://src/services/database/interfaces.ts)

## Schema Design Principles
The schoolpilot3 data model follows established database design principles with emphasis on normalization, referential integrity, and performance optimization. The schema design prioritizes data consistency while supporting complex business operations across multiple modules.

### Normalization Strategies
The system implements third normal form (3NF) with strategic denormalization for frequently accessed data. Composite primary keys are used for multi-dimensional entities, and foreign key constraints ensure referential integrity across related tables.

### Indexing and Performance
The schema includes strategic indexing on frequently queried fields including academic year identifiers, student IDs, and financial period references. Composite indexes support common query patterns for reporting and analytics.

## Schema Conversion and Normalization
The new database-agnostic schema system provides comprehensive conversion utilities that enable seamless migration between different database providers while maintaining schema integrity and performance characteristics.

### Schema Conversion Process
The schema conversion system automatically translates database-agnostic schemas into provider-specific formats (RxDB, PouchDB, SQLite) while preserving all structural and referential integrity constraints. The conversion process validates schema completeness and provides detailed error reporting for debugging.

```mermaid
flowchart TD
A[Database-Agnostic Schema] --> B[Schema Validation]
B --> C[Property Type Conversion]
C --> D[RxDB Schema Generation]
D --> E[Provider-Specific Schema]
E --> F[Migration Strategy Creation]
F --> G[Final Schema Output]
```

**Diagram sources**
- [databaseAgnosticSchema.ts:72-91](file://src/utils/databaseAgnosticSchema.ts#L72-L91)
- [SchemaConverter.ts:92-132](file://src/services/database/SchemaConverter.ts#L92-L132)

**Section sources**
- [databaseAgnosticSchema.ts:72-355](file://src/utils/databaseAgnosticSchema.ts#L72-L355)
- [SchemaConverter.ts:92-132](file://src/services/database/SchemaConverter.ts#L92-L132)

## Entity Relationship Diagram
The comprehensive entity relationship diagram illustrates the interconnected data model across all schoolpilot3 modules, showing how entities from different domains interact and depend on each other for complete system functionality.

```mermaid
erDiagram
ACADEMIC_YEAR ||--o{ CLASS_STREAM : contains
ACADEMIC_YEAR ||--o{ SUBJECT : offered_in
STUDENT ||--o{ ACADEMIC_ENROLLMENT : enrolled_in
STUDENT ||--o{ FINANCIAL_ACCOUNT : has
STAFF ||--o{ EMPLOYMENT_HISTORY : has
DEPARTMENT ||--o{ STAFF : employs
DEPARTMENT ||--o{ SUBJECT : offers
SUBJECT ||--o{ CLASS_SUBJECT_ALLOCATION : allocated_in
CLASS_SUBJECT_ALLOCATION ||--o{ STUDENT_SUBJECT_ENROLLMENT : contains
FINANCIAL_YEAR ||--o{ SCHOOL_PERIOD : contains
FINANCIAL_YEAR ||--o{ CHART_OF_ACCOUNT : contains
STUDENT ||--o{ STUDENT_INVOICE : generates
STUDENT_INVOICE ||--o{ INVOICE_LINE_ITEM : contains
PAYMENT ||--|| ACCOUNT : credited_to
WAREHOUSE ||--o{ ITEM : contains
ITEM ||--o{ STOCK_LEVEL : tracked_by
ITEM ||--o{ STOCK_TRANSACTION : involved_in
```

**Diagram sources**
- [schema.ts:251-305](file://src/modules/academics/data/schema.ts#L251-L305)
- [schema.ts](file://src/modules/finance/data/schema.ts)
- [schema.ts](file://src/modules/hr/data/schema.ts)
- [collections.ts:1-51](file://src/modules/inventory/data/collections.ts#L1-L51)

## Sample Data Instances
The following sample data instances demonstrate the structure and relationships of key entities in the schoolpilot3 data model, providing concrete examples of how data flows through the system.

### Grading Scheme Sample
```json
{
  "id": "grading_scheme_001",
  "name": "Standard Academic Grading",
  "is_default": true,
  "levels": [
    {
      "id": "grade_a_plus",
      "scheme_id": "grading_scheme_001",
      "grade": "A+",
      "min_score": 90,
      "max_score": 100,
      "points": 4.0
    },
    {
      "id": "grade_a",
      "scheme_id": "grading_scheme_001",
      "grade": "A",
      "min_score": 80,
      "max_score": 89,
      "points": 4.0
    }
  ]
}
```

### Student Invoice Sample
```json
{
  "id": "invoice_001",
  "student_id": "student_123",
  "academic_year_id": "ay_2024",
  "fee_template_id": "template_tuition",
  "subtotal": 1500000,
  "discount_total": 0,
  "tax_total": 0,
  "grand_total": 1500000,
  "status": "pending",
  "due_date": "2024-12-31",
  "issued_date": "2024-01-15",
  "line_items": [
    {
      "id": "line_item_001",
      "account_id": "account_tuition",
      "quantity": 1,
      "unit_price": 1500000,
      "total_amount": 1500000,
      "description": "Tuition Fee"
    }
  ]
}
```

**Section sources**
- [schema.ts:201-250](file://src/modules/academics/data/schema.ts#L201-L250)
- [schema.ts](file://src/modules/finance/data/schema.ts)

## Schema Evolution & Migration
The schoolpilot3 system implements comprehensive schema evolution and migration capabilities that support gradual updates to the data model without disrupting existing functionality. The database-agnostic approach enables seamless migration between different database providers while maintaining data integrity.

### Migration Strategy
The migration system uses versioned schemas with explicit migration strategies for each version increment. The system supports both forward and backward compatibility through careful schema design and automated migration procedures.

### Provider Selection Logic
The database provider selection system automatically chooses the most appropriate storage backend based on runtime conditions, environment variables, and performance requirements. The system maintains backward compatibility through schema conversion utilities that translate between different provider formats.

**Section sources**
- [ProviderSelector.ts](file://src/services/database/ProviderSelector.ts)
- [interfaces.ts](file://src/services/database/interfaces.ts)
- [schemaUtils.ts:12-35](file://src/utils/schemaUtils.ts#L12-L35)