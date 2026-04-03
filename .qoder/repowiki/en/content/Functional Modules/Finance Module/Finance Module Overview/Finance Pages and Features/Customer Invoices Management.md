# Customer Invoices Management

<cite>
**Referenced Files in This Document**   
- [CustomerInvoicesPage.tsx](file://src/modules/finance/pages/CustomerInvoicesPage.tsx)
- [types.ts](file://src/modules/finance/data/types.ts)
- [useCustomerInvoiceData.ts](file://src/modules/finance/data/useCustomerInvoiceData.ts)
- [mockData.ts](file://src/modules/finance/data/mockData.ts)
- [schema.ts](file://src/modules/finance/data/schema.ts)
- [AppDataContext.tsx](file://src/contexts/AppDataContext.tsx)
- [useAppData.ts](file://src/hooks/useAppData.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Data Structure and Types](#data-structure-and-types)
3. [Core Functionality and Workflows](#core-functionality-and-workflows)
4. [User Interface Components](#user-interface-components)
5. [Data Management and Hooks](#data-management-and-hooks)
6. [Status Management and Business Logic](#status-management-and-business-logic)
7. [Integration with Financial Systems](#integration-with-financial-systems)
8. [Troubleshooting Guide](#troubleshooting-guide)

## Introduction
The Customer Invoices Management system in schoolpilot3 provides a comprehensive solution for generating, tracking, and managing invoices for non-student customers such as parent associations, community partners, and external organizations. This system enables financial administrators to create professional invoices with proper due dates, payment terms, and tax calculations. The interface supports filtering, searching, and bulk actions through a DataGrid component, while invoice creation and editing workflows are facilitated through a TabbedForm interface. The system integrates with the broader financial ecosystem, maintaining status synchronization across payment receipts and supporting both partial and full payments.

**Section sources**
- [CustomerInvoicesPage.tsx](file://src/modules/finance/pages/CustomerInvoicesPage.tsx#L1-L50)

## Data Structure and Types
The customer invoice system is built on well-defined TypeScript interfaces that ensure data consistency and type safety throughout the application. The core data structures are defined in the finance module's types.ts file, establishing a clear contract for invoice data across the system.

```mermaid
classDiagram
class FinCustomerInvoiceType {
+string id
+number customer_id
+string invoice_number
+string issue_date
+string due_date
+number total_amount
+FinCustomerInvoiceStatusEnum status
+string notes
+FinCustomerInvoiceItemType[] items
+string created_at
+string updated_at
+string customer_name
}
class FinCustomerInvoiceItemType {
+string id
+string invoice_id
+string description
+number quantity
+number unit_price
+number amount
+number revenue_account_id
+string revenue_account_name
}
class FinCustomerInvoiceStatusEnum {
DRAFT
SENT
PAID
PARTIALLY_PAID
OVERDUE
VOIDED
}
FinCustomerInvoiceType --> FinCustomerInvoiceItemType : "has many"
FinCustomerInvoiceItemType --> FinCustomerInvoiceStatusEnum : "references"
```

**Diagram sources**
- [types.ts](file://src/modules/finance/data/types.ts#L200-L279)

**Section sources**
- [types.ts](file://src/modules/finance/data/types.ts#L0-L279)

## Core Functionality and Workflows
The CustomerInvoicesPage provides a complete workflow for managing customer invoices from creation to payment processing. The interface supports filtering, searching, and bulk actions through the DataGrid component, allowing users to efficiently manage large volumes of invoices.

The invoice creation and editing workflow is implemented using the TabbedForm component, which organizes invoice details and line items into logical tabs. When creating a new invoice, the system provides sensible defaults including a 30-day due date from the current date and sets the initial status to "Due".

```mermaid
sequenceDiagram
participant User as "Financial Officer"
participant UI as "CustomerInvoicesPage"
participant Hook as "useCustomerInvoiceData"
participant Data as "AppDataContext"
User->>UI : Clicks "New Invoice"
UI->>UI : Opens invoice modal with default values
User->>UI : Fills invoice details and line items
UI->>Hook : Calls create() with new invoice data
Hook->>Data : Updates global data context
Data->>UI : Notifies of data change
UI->>User : Displays success message and updated list
```

**Diagram sources**
- [CustomerInvoicesPage.tsx](file://src/modules/finance/pages/CustomerInvoicesPage.tsx#L23-L50)
- [useCustomerInvoiceData.ts](file://src/modules/finance/data/useCustomerInvoiceData.ts#L0-L39)

**Section sources**
- [CustomerInvoicesPage.tsx](file://src/modules/finance/pages/CustomerInvoicesPage.tsx#L23-L50)

## User Interface Components
The CustomerInvoicesPage leverages several key UI components to provide an intuitive and efficient user experience. The DataGrid component serves as the primary interface for viewing and managing invoices, supporting filtering, searching, and bulk actions.

The TabbedForm component facilitates the invoice creation and editing process, organizing related fields into logical tabs. Modal dialogs are used for both invoice creation/editing and line item management, providing focused interfaces for data entry.

```mermaid
flowchart TD
A[CustomerInvoicesPage] --> B[DataGrid]
A --> C[ActionBar]
A --> D[ModalDialog]
D --> E[TabbedForm]
E --> F[Invoice Details Tab]
E --> G[Line Items Tab]
B --> H[Filter Controls]
B --> I[Search Functionality]
B --> J[Bulk Actions]
C --> K[New Invoice Button]
C --> L[Bulk Delete Button]
D --> M[Save Button]
D --> N[Cancel Button]
style A fill:#f9f,stroke:#333
style B fill:#bbf,stroke:#333
style D fill:#f96,stroke:#333
```

**Diagram sources**
- [CustomerInvoicesPage.tsx](file://src/modules/finance/pages/CustomerInvoicesPage.tsx#L23-L50)

**Section sources**
- [CustomerInvoicesPage.tsx](file://src/modules/finance/pages/CustomerInvoicesPage.tsx#L23-L50)

## Data Management and Hooks
The customer invoice system employs a robust data management architecture centered around React hooks. The useAppData hook provides access to the global application data context, which includes customer invoice data among other financial entities.

The useCustomerInvoiceData hook provides a self-contained interface for managing customer invoice data with CRUD operations. This hook works with mock data during development and can be integrated with the actual database layer in production.

```mermaid
graph TB
subgraph "Data Layer"
A[useCustomerInvoiceData]
B[initialMockCustomerInvoices]
C[Database]
end
subgraph "Context Layer"
D[AppDataContext]
E[useAppData]
end
subgraph "UI Layer"
F[CustomerInvoicesPage]
G[DataGrid]
H[TabbedForm]
end
A --> |Provides data| D
D --> |Exposes via| E
E --> |Consumed by| F
F --> |Displays| G
F --> |Enables editing| H
B --> |Development data| A
C --> |Production data| A
style A fill:#f96,stroke:#333
style D fill:#f9f,stroke:#333
style F fill:#bbf,stroke:#333
```

**Diagram sources**
- [useCustomerInvoiceData.ts](file://src/modules/finance/data/useCustomerInvoiceData.ts#L0-L39)
- [AppDataContext.tsx](file://src/contexts/AppDataContext.tsx#L0-L168)
- [useAppData.ts](file://src/hooks/useAppData.ts#L8-L14)

**Section sources**
- [useCustomerInvoiceData.ts](file://src/modules/finance/data/useCustomerInvoiceData.ts#L0-L39)
- [AppDataContext.tsx](file://src/contexts/AppDataContext.tsx#L0-L168)
- [useAppData.ts](file://src/hooks/useAppData.ts#L8-L14)

## Status Management and Business Logic
The customer invoice system implements a comprehensive status management workflow that tracks invoices through their lifecycle. The FinCustomerInvoiceStatusEnum defines the possible states: Draft, Sent, Paid, Partially Paid, Overdue, and Voided.

The system automatically calculates the total amount based on line items and updates the status accordingly. When payments are applied, the system updates the invoice status to reflect whether it is fully paid, partially paid, or still due.

```mermaid
stateDiagram-v2
[*] --> Draft
Draft --> Sent : Send Invoice
Sent --> Paid : Full Payment
Sent --> PartiallyPaid : Partial Payment
PartiallyPaid --> Paid : Additional Payment
Sent --> Overdue : Due Date Passed
PartiallyPaid --> Overdue : Due Date Passed
Sent --> Voided : Cancel Invoice
PartiallyPaid --> Voided : Cancel Invoice
Paid --> [*]
Voided --> [*]
note right of Overdue
System triggers
reminders and
notifications
end note
```

**Diagram sources**
- [types.ts](file://src/modules/finance/data/types.ts#L0-L199)

**Section sources**
- [types.ts](file://src/modules/finance/data/types.ts#L0-L199)

## Integration with Financial Systems
The customer invoice system is tightly integrated with the broader financial management ecosystem. It connects with the chart of accounts to ensure proper revenue account allocation, and maintains synchronization with payment receipts through the invoice payment application system.

The schema definition in schema.ts ensures data integrity with validation rules for amounts, dates, and required fields. The system supports recurring invoices through integration with the financial year and school period structures.

```mermaid
erDiagram
CUSTOMER_INVOICE ||--o{ CUSTOMER_INVOICE_ITEM : contains
CUSTOMER_INVOICE ||--|| CHART_OF_ACCOUNTS : "revenue_account_id"
CUSTOMER_INVOICE ||--|| CUSTOMERS : "customer_id"
CUSTOMER_INVOICE ||--o{ INVOICE_PAYMENT_APPLICATION : "payments"
INVOICE_PAYMENT_APPLICATION ||--|| STUDENT_PAYMENT : "payment_id"
CUSTOMER_INVOICE {
string id PK
number customer_id FK
string invoice_number
string issue_date
string due_date
number total_amount
string status
string notes
string created_at
string updated_at
}
CUSTOMER_INVOICE_ITEM {
string id PK
string invoice_id FK
string description
number quantity
number unit_price
number amount
number revenue_account_id FK
}
INVOICE_PAYMENT_APPLICATION {
string id PK
string payment_id FK
string invoice_item_id FK
number amount_applied
}
```

**Diagram sources**
- [schema.ts](file://src/modules/finance/data/schema.ts#L280-L328)

**Section sources**
- [schema.ts](file://src/modules/finance/data/schema.ts#L280-L328)

## Troubleshooting Guide
This section addresses common issues encountered when managing customer invoices and provides diagnostic and resolution guidance.

### Invoice Duplication
**Symptoms**: Duplicate invoice numbers appearing in the system, double billing customers.
**Diagnosis**: Check the invoice creation workflow and ID generation mechanism.
**Resolution**: Ensure the system validates invoice numbers for uniqueness before creation. The current implementation uses a simple timestamp-based ID generation that should prevent duplicates.

### Incorrect Tax Application
**Symptoms**: Tax amounts calculated incorrectly on invoices.
**Diagnosis**: Verify the revenue account configuration and tax settings.
**Resolution**: Check that the revenue accounts linked to invoice items have the correct tax treatment configured. The system currently does not have explicit tax fields, suggesting tax calculation may occur at the payment processing level.

### Reconciliation Mismatches
**Symptoms**: Payments not properly applied to invoices, balance discrepancies.
**Diagnosis**: Examine the invoice payment application data.
**Resolution**: Verify that the FinInvoicePaymentApplicationType records correctly link payments to invoice items with accurate amount_applied values. Check for orphaned payment applications or incorrect invoice_item_id references.

**Section sources**
- [types.ts](file://src/modules/finance/data/types.ts#L200-L279)
- [mockData.ts](file://src/modules/finance/data/mockData.ts#L0-L199)
- [useCustomerInvoiceData.ts](file://src/modules/finance/data/useCustomerInvoiceData.ts#L0-L39)