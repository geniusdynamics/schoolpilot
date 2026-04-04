# Administration Data Models

<cite>
**Referenced Files in This Document**
- [collections.ts](file://src/modules/administration/data/collections.ts)
- [schema.ts](file://src/modules/administration/data/schema.ts)
- [types.ts](file://src/modules/administration/data/types.ts)
</cite>

## Update Summary
**Changes Made**
- Added documentation for new data models: disciplinary_cases, certificate_requests, and visitor_logs collections
- Updated entity relationship diagrams to include new collections
- Added field definitions and schema details for three new administrative systems
- Enhanced business rules section with new operational processes
- Updated data access patterns to reflect new collection structures

## Table of Contents
1. [Introduction](#introduction)
2. [Core Entity Relationships](#core-entity-relationships)
3. [Data Model Definitions](#data-model-definitions)
4. [Schema Design and Normalization](#schema-design-and-normalization)
5. [TypeScript Interfaces and Type Safety](#typescript-interfaces-and-type-safety)
6. [Data Access Patterns](#data-access-patterns)
7. [Sample Data Records](#sample-data-records)
8. [Business Rules and Constraints](#business-rules-and-constraints)

## Introduction
This document provides comprehensive documentation for the Administration module data models in schoolpilot3. The module manages core administrative entities including student information, staff details, departments, academic years, classes, dormitories, and designations. The data architecture is designed to support both operational efficiency and analytical capabilities through a normalized structure with strategic denormalization for performance optimization. The implementation uses a database-agnostic schema approach that supports multiple database backends through RxDB and PouchDB services.

**Section sources**
- [schema.ts:1-50](file://src/modules/administration/data/schema.ts#L1-L50)
- [types.ts:1-50](file://src/modules/administration/data/types.ts#L1-L50)

## Core Entity Relationships
The Administration module implements a relational data model with well-defined relationships between core entities. These relationships support the school's organizational structure and administrative workflows.

```mermaid
erDiagram
STUDENT {
string id PK
string first_name
string last_name
string date_of_birth
string gender
string class_id FK
string dormitory_id FK
string student_category_id FK
}
STAFF {
string id PK
string first_name
string last_name
string email
string phone
string department_id FK
string designation_id FK
string dormitory_id FK
}
DEPARTMENT {
string id PK
string name
boolean is_academic
}
DESIGNATION {
number id PK
string title
}
ACADEMIC_YEAR {
string id PK
string name
string start_date
string end_date
boolean is_current
}
CLASS {
string id PK
string name
string academic_year_id FK
string stream
number capacity
}
DORMITORY {
number id PK
string name
string master_id FK
}
STUDENT_HEALTH_RECORD {
string id PK
string student_id FK
string blood_type
string allergies
string medical_conditions
}
STUDENT_ATTENDANCE {
string id PK
string student_id FK
number period_id FK
string date
string status
}
APPLICATION {
string id PK
string application_number
string academic_year_id FK
string intended_class_id FK
string status
string first_name
string last_name
string date_of_birth
string gender
}
DISCIPLINARY_CASE {
string id PK
string case_number
string student_id FK
string category
string severity
string status
string title
string description
string incident_date
string reported_by FK
boolean follow_up_required
boolean parent_notified
}
DISCIPLINARY_RECORD {
string id PK
string student_id FK
string case_id FK
string category
string action
string action_date
}
CERTIFICATE_REQUEST {
string id PK
string certificate_number
string student_id FK
string certificate_type
string status
string purpose
string requested_by FK
string requested_at
}
VISITOR_LOG {
string id PK
string visitor_name
string visitor_type
string phone
string purpose
string status
string check_in_time
}
STUDENT ||--o{ STUDENT_HEALTH_RECORD : "has"
STUDENT ||--o{ STUDENT_ATTENDANCE : "has"
STUDENT ||--|| CLASS : "belongs to"
STUDENT ||--|| DORMITORY : "resides in"
STUDENT ||--|| STUDENT_CATEGORY : "categorized as"
STAFF ||--|| DEPARTMENT : "belongs to"
STAFF ||--|| DESIGNATION : "holds"
STAFF ||--|| DORMITORY : "masters"
CLASS ||--|| ACADEMIC_YEAR : "belongs to"
CLASS ||--o{ STUDENT : "contains"
APPLICATION ||--|| ACADEMIC_YEAR : "targets"
APPLICATION ||--|| CLASS : "intends"
APPLICATION ||--o{ APPLICATION_REVIEW : "has"
APPLICATION ||--o{ APPLICATION_DOCUMENT : "has"
APPLICATION ||--o{ APPLICATION_INTERVIEW : "has"
APPLICATION ||--o{ APPLICATION_APPROVAL : "has"
DORMITORY ||--|| STAFF : "mastered by"
DEPARTMENT }o--|| STAFF : "contains"
DESIGNATION }o--|| STAFF : "assigned to"
ACADEMIC_YEAR }o--|| CLASS : "contains"
ACADEMIC_YEAR }o--|| APPLICATION : "contains"
DISCIPLINARY_CASE ||--|| STUDENT : "involves"
DISCIPLINARY_CASE ||--o{ DISCIPLINARY_RECORD : "generates"
CERTIFICATE_REQUEST ||--|| STUDENT : "requests"
VISITOR_LOG ||--o{ USERS : "person_to_meet"
```

**Diagram sources**
- [schema.ts:1-734](file://src/modules/administration/data/schema.ts#L1-L734)
- [types.ts:1-847](file://src/modules/administration/data/types.ts#L1-L847)

**Section sources**
- [schema.ts:1-734](file://src/modules/administration/data/schema.ts#L1-L734)
- [types.ts:1-847](file://src/modules/administration/data/types.ts#L1-L847)

## Data Model Definitions
This section details the field definitions, data types, primary/foreign keys, and constraints for each collection in the Administration module.

### Student Entity
The Student entity represents enrolled students in the school system.

**Properties:**
- `id`: Unique identifier (string, primary key)
- `first_name`: Student's first name (string, required)
- `last_name`: Student's last name (string, required)
- `date_of_birth`: Date of birth in ISO format (string, required)
- `gender`: Gender of the student (string, enum: Male, Female, Other, required)
- `class_id`: Reference to the student's current class (string, foreign key)
- `dormitory_id`: Reference to the student's dormitory (string, foreign key)
- `student_category_id`: Reference to the student's category (number, foreign key)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)

### Staff Entity
The Staff entity represents teaching and non-teaching personnel.

**Properties:**
- `id`: Unique identifier (string, primary key)
- `first_name`: Staff first name (string, required)
- `last_name`: Staff last name (string, required)
- `email`: Staff email address (string)
- `phone`: Staff phone number (string)
- `department_id`: Reference to the staff's department (string, foreign key)
- `designation_id`: Reference to the staff's designation (number, foreign key)
- `dormitory_id`: Reference to the dormitory the staff masters (string, foreign key)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)

### Department Entity
The Department entity represents academic and administrative departments.

**Properties:**
- `id`: Unique identifier (string, primary key)
- `name`: Department name (string, required)
- `is_academic`: Flag indicating if the department is academic (boolean, required)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)

### Designation Entity
The Designation entity represents staff positions and roles.

**Properties:**
- `id`: Unique identifier (number, primary key)
- `title`: Designation title (string, required)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)

### AcademicYear Entity
The AcademicYear entity represents academic calendar years.

**Properties:**
- `id`: Unique identifier (string, primary key)
- `name`: Academic year name (string, required)
- `start_date`: Start date of the academic year (string, required)
- `end_date`: End date of the academic year (string, required)
- `is_current`: Flag indicating if this is the current academic year (boolean, required)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)

### Class Entity
The Class entity represents class groups within an academic year.

**Properties:**
- `id`: Unique identifier (string, primary key)
- `name`: Class name (string, required)
- `academic_year_id`: Reference to the academic year (string, foreign key)
- `stream`: Class stream identifier (string)
- `capacity`: Maximum student capacity (number)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)

### Dormitory Entity
The Dormitory entity represents student boarding houses.

**Properties:**
- `id`: Unique identifier (number, primary key)
- `name`: Dormitory name (string, required)
- `master_id`: Reference to the staff member who masters the dormitory (string, foreign key)
- `master_name`: Denormalized master name for performance (string)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)

### StudentHealthRecord Entity
The StudentHealthRecord entity stores medical information for students.

**Properties:**
- `id`: Unique identifier (string, primary key)
- `student_id`: Reference to the student (string, foreign key, required)
- `blood_type`: Student's blood type (string)
- `allergies`: Known allergies (string)
- `medical_conditions`: Medical conditions (string)
- `emergency_contact_override`: Emergency contact override information (string)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)
- `student_name`: Denormalized student name for performance (string)

### StudentAttendance Entity
The StudentAttendance entity tracks student attendance.

**Properties:**
- `id`: Unique identifier (string, primary key)
- `student_id`: Reference to the student (string, foreign key, required)
- `period_id`: Reference to the timetable period (number, foreign key, required)
- `date`: Attendance date (string, required)
- `status`: Attendance status (string, enum: Present, Absent, Late, Excused, required)
- `reason_for_absence`: Reason for absence (string)
- `created_at`: Record creation timestamp (string, required)
- `student_name`: Denormalized student name for performance (string)
- `period_name`: Denormalized period name for performance (string)

### DisciplinaryCase Entity
The DisciplinaryCase entity manages student discipline incidents and cases.

**Properties:**
- `id`: Unique identifier (string, primary key)
- `case_number`: Unique case identification number (string, required)
- `student_id`: Reference to the involved student (string, foreign key, required)
- `student_name`: Denormalized student name (string)
- `admission_number`: Denormalized admission number (string)
- `class_name`: Denormalized class name (string)
- `category`: Disciplinary category (string, enum: Attendance, Behavior, Academic Dishonesty, etc.)
- `severity`: Severity level (string, enum: Minor, Moderate, Serious, Critical)
- `status`: Case status (string, enum: Reported, Under Investigation, Pending Review, Resolved, etc.)
- `title`: Brief case title (string, required)
- `description`: Detailed incident description (string, required)
- `incident_date`: Date of incident (string, required)
- `incident_time`: Time of incident (string)
- `incident_location`: Location of incident (string)
- `reported_by`: Reference to reporting user (string, foreign key, required)
- `reported_by_name`: Denormalized reporter name (string)
- `assigned_to`: Reference to assigned user (string, foreign key)
- `assigned_to_name`: Denormalized assignee name (string)
- `witnesses`: Witness information (string)
- `action_taken`: Disciplinary action taken (string, enum: Verbal Warning, Written Warning, Detention, Suspension, Expulsion, etc.)
- `action_details`: Action details and rationale (string)
- `action_date`: Date action was taken (timestamp)
- `follow_up_required`: Follow-up requirement flag (boolean, default: false)
- `follow_up_date`: Follow-up appointment date (string)
- `follow_up_notes`: Follow-up notes (string)
- `parent_notified`: Parent notification status (boolean, default: false)
- `parent_notification_date`: Parent notification timestamp (timestamp)
- `parent_response`: Parent response information (string)
- `resolved_at`: Resolution timestamp (timestamp)
- `resolution_notes`: Resolution details (string)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)

### DisciplinaryRecord Entity
The DisciplinaryRecord entity maintains historical disciplinary actions.

**Properties:**
- `id`: Unique identifier (string, primary key)
- `student_id`: Reference to the student (string, foreign key, required)
- `student_name`: Denormalized student name (string)
- `admission_number`: Denormalized admission number (string)
- `case_id`: Reference to the disciplinary case (string, foreign key, required)
- `category`: Disciplinary category (string, enum: Attendance, Behavior, Academic Dishonesty, etc.)
- `action`: Disciplinary action (string, enum: Verbal Warning, Written Warning, Detention, Suspension, Expulsion, etc.)
- `action_details`: Action details (string)
- `action_date`: Date action was taken (timestamp, required)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)

### CertificateRequest Entity
The CertificateRequest entity manages student certificate requests and issuance.

**Properties:**
- `id`: Unique identifier (string, primary key)
- `certificate_number`: Generated certificate identification number (string, required)
- `student_id`: Reference to the requesting student (string, foreign key, required)
- `student_name`: Denormalized student name (string)
- `admission_number`: Denormalized admission number (string)
- `class_name`: Denormalized class name (string)
- `certificate_type`: Certificate type (string, enum: Birth Certificate, Transfer Certificate, Character Certificate, etc.)
- `status`: Request status (string, enum: Requested, In Progress, Approved, Rejected, Issued, Cancelled)
- `purpose`: Purpose of certificate (string)
- `remarks`: Administrative remarks (string)
- `requested_by`: Reference to requesting user (string, foreign key, required)
- `requested_by_name`: Denormalized requester name (string)
- `requested_at`: Request timestamp (timestamp, required)
- `approved_by`: Reference to approving user (string, foreign key)
- `approved_by_name`: Denormalized approver name (string)
- `approved_at`: Approval timestamp (timestamp)
- `issued_by`: Reference to issuing user (string, foreign key)
- `issued_by_name`: Denormalized issuer name (string)
- `issued_at`: Issuance timestamp (timestamp)
- `rejection_reason`: Reason for rejection (string)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)

### VisitorLog Entity
The VisitorLog entity tracks visitor entries and exits.

**Properties:**
- `id`: Unique identifier (string, primary key)
- `visitor_name`: Visitor's full name (string, required)
- `visitor_type`: Visitor type (string, enum: Parent, Guardian, Official, Delivery, Interview, Maintenance, Guest, Other)
- `phone`: Visitor phone number (string)
- `email`: Visitor email address (string)
- `id_type`: Government ID type (string)
- `id_number`: Government ID number (string)
- `purpose`: Purpose of visit (string, required)
- `person_to_meet`: Person being visited (string)
- `person_to_meet_id`: Reference to person being met (string, foreign key)
- `status`: Visit status (string, enum: Checked In, Checked Out, Expected, No Show)
- `check_in_time`: Visitor check-in timestamp (timestamp, required)
- `check_out_time`: Visitor check-out timestamp (timestamp)
- `expected_arrival`: Expected arrival timestamp (timestamp)
- `remarks`: Security or administrative remarks (string)
- `created_at`: Record creation timestamp (string, required)
- `updated_at`: Record last update timestamp (string, required)

**Section sources**
- [schema.ts:605-734](file://src/modules/administration/data/schema.ts#L605-L734)
- [types.ts:710-847](file://src/modules/administration/data/types.ts#L710-L847)

## Schema Design and Normalization
The Administration module employs a balanced approach to database normalization, combining normalized structures with strategic denormalization for performance optimization.

### Normalization Strategy
The schema follows third normal form (3NF) principles to eliminate data redundancy and ensure data integrity. Entities are separated based on their functional dependencies, with foreign keys establishing relationships between related entities. This approach ensures that each piece of data is stored in exactly one place, reducing the risk of inconsistencies.

The core entities (Student, Staff, Department, Designation, AcademicYear, Class, Dormitory) are fully normalized, with each entity responsible for a specific domain of information. Relationships between entities are established through foreign key constraints, ensuring referential integrity across the data model.

### Indexing Patterns
The schema implements strategic indexing to optimize query performance for common access patterns:

- **Primary Keys**: All collections have a primary key index on the `id` field for efficient record retrieval
- **Foreign Keys**: Indexes on foreign key fields (e.g., `student_id`, `class_id`, `department_id`) to optimize join operations
- **Frequently Queried Fields**: Indexes on commonly searched fields such as `name`, `status`, and `date`
- **Composite Indexes**: Multi-field indexes for queries that filter on multiple criteria simultaneously

For example, the `student_attendance` collection has indexes on `student_id`, `date`, and `period_id` to support efficient queries for attendance records by student, date range, or specific period.

### Denormalization for Performance
While the schema is primarily normalized, strategic denormalization is employed to optimize read performance for frequently accessed data:

- **Denormalized Names**: Fields like `student_name`, `patron_name`, and `approver_name` are denormalized to avoid expensive join operations when displaying lists or reports
- **Calculated Fields**: Fields like `total_marks` and `mean_grade` in the `pre_nas_marks` collection are pre-calculated to avoid runtime computation
- **Status Flags**: Fields like `is_current` in the `academic_years` collection allow for quick filtering of active records

This hybrid approach balances data integrity with performance requirements, ensuring that the system remains responsive even with large datasets.

```mermaid
graph TD
A[Normalized Schema] --> B[Data Integrity]
A --> C[Reduced Redundancy]
A --> D[Update Efficiency]
E[Denormalized Fields] --> F[Read Performance]
E --> G[Reduced Joins]
E --> H[Faster Reporting]
I[Hybrid Approach] --> A
I --> E
I --> J[Optimal Balance]
K[Indexes] --> L[Query Performance]
K --> M[Filtering Efficiency]
K --> N[Sorting Speed]
I --> K
```

**Diagram sources**
- [schema.ts:1-734](file://src/modules/administration/data/schema.ts#L1-L734)

**Section sources**
- [schema.ts:1-734](file://src/modules/administration/data/schema.ts#L1-L734)

## TypeScript Interfaces and Type Safety
The Administration module leverages TypeScript interfaces to enforce type safety across the application layer.

### Interface Definitions
The `types.ts` file defines comprehensive TypeScript interfaces for all administration entities, ensuring consistent data structures throughout the codebase. These interfaces extend the database schema definitions with additional type information and constraints.

For example, the `Student` interface includes:
- Strict typing for all fields
- Optional field indicators for nullable properties
- Enum types for constrained fields (e.g., gender)
- Timestamp formatting requirements

### Type Enforcement
The interfaces serve multiple purposes:
- **Compile-time validation**: Catch type errors during development
- **Code completion**: Provide IDE support for field names and types
- **Documentation**: Serve as living documentation for data structures
- **Refactoring safety**: Enable safe refactoring across the codebase

The type system also defines enums for controlled vocabularies, such as `AttendanceStatus` and `ApplicationStatus`, preventing invalid values and ensuring consistency across the application.

```mermaid
classDiagram
class Student {
+string id
+string first_name
+string last_name
+string date_of_birth
+string gender
+string class_id
+string dormitory_id
+number student_category_id
+string created_at
+string updated_at
}
class Staff {
+string id
+string first_name
+string last_name
+string email
+string phone
+string department_id
+number designation_id
+string dormitory_id
+string created_at
+string updated_at
}
class Department {
+string id
+string name
+boolean is_academic
+string created_at
+string updated_at
}
class Designation {
+number id
+string title
+string created_at
+string updated_at
}
class AcademicYear {
+string id
+string name
+string start_date
+string end_date
+boolean is_current
+string created_at
+string updated_at
}
class Class {
+string id
+string name
+string academic_year_id
+string stream
+number capacity
+string created_at
+string updated_at
}
class Dormitory {
+number id
+string name
+string master_id
+string master_name
+string created_at
+string updated_at
}
Student --> Class : "belongs to"
Student --> Dormitory : "resides in"
Staff --> Department : "belongs to"
Staff --> Designation : "holds"
Staff --> Dormitory : "masters"
Class --> AcademicYear : "belongs to"
```

**Diagram sources**
- [types.ts:1-847](file://src/modules/administration/data/types.ts#L1-L847)

**Section sources**
- [types.ts:1-847](file://src/modules/administration/data/types.ts#L1-L847)

## Data Access Patterns
The Administration module implements a consistent data access pattern through specialized hooks and a unified data service layer.

### Use Data Hooks
The module provides a series of `use*Data` hooks that abstract data access complexity:

- `useStudentData()`: Manages student records with CRUD operations
- `useStaffData()`: Handles staff information and relationships
- `useAcademicYearData()`: Manages academic year lifecycle
- `useClassData()`: Controls class creation and student assignment
- `useDormitoryData()`: Handles dormitory management and occupancy
- `useStudentAttendanceData()`: Tracks and reports attendance
- `useDisciplinaryCaseData()`: Manages discipline incident tracking
- `useCertificateRequestData()`: Handles certificate request processing
- `useVisitorLogData()`: Manages visitor entry/exit tracking

These hooks encapsulate data fetching, caching, and state management, providing a consistent interface for components to interact with the data layer.

### Unified Data Service
The hooks integrate with a unified data service layer that provides:
- **Consistent API**: Standardized methods for create, read, update, and delete operations
- **Error Handling**: Centralized error handling and retry logic
- **Caching**: Intelligent caching to reduce database load
- **Synchronization**: Support for offline operation and data synchronization

The service layer abstracts the underlying database implementation (RxDB, PouchDB, etc.), allowing the application to switch between storage backends with minimal code changes.

```mermaid
sequenceDiagram
participant UI as "User Interface"
participant Hook as "use*Data Hook"
participant Service as "Unified Data Service"
participant Database as "RxDB/PouchDB"
UI->>Hook : Request data (e.g., getAllStudents())
Hook->>Service : Forward request with parameters
Service->>Database : Execute query
Database-->>Service : Return data
Service-->>Hook : Process and cache results
Hook-->>UI : Provide data and loading state
UI->>Hook : Update record (e.g., updateStudent())
Hook->>Service : Forward update request
Service->>Database : Execute update
Database-->>Service : Confirm success/failure
Service-->>Hook : Return result
Hook-->>UI : Update state accordingly
```

**Diagram sources**
- [collections.ts:1-91](file://src/modules/administration/data/collections.ts#L1-L91)
- [schema.ts:1-734](file://src/modules/administration/data/schema.ts#L1-L734)

**Section sources**
- [collections.ts:1-91](file://src/modules/administration/data/collections.ts#L1-L91)

## Sample Data Records
This section provides example data records for key entities in the Administration module.

### Sample Student Record
```json
{
  "id": "std-001",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "2008-05-15",
  "gender": "Male",
  "class_id": "cls-2023-01",
  "dormitory_id": 101,
  "student_category_id": 1,
  "created_at": "2023-01-15T08:30:00Z",
  "updated_at": "2023-01-15T08:30:00Z"
}
```

### Sample Staff Record
```json
{
  "id": "stf-001",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@school.edu",
  "phone": "+254712345678",
  "department_id": "dept-math",
  "designation_id": 5,
  "dormitory_id": 101,
  "created_at": "2022-09-01T08:00:00Z",
  "updated_at": "2022-09-01T08:00:00Z"
}
```

### Sample Academic Year Record
```json
{
  "id": "ay-2023",
  "name": "2023-2024",
  "start_date": "2023-01-15",
  "end_date": "2023-12-15",
  "is_current": true,
  "created_at": "2022-10-01T09:00:00Z",
  "updated_at": "2022-10-01T09:00:00Z"
}
```

### Sample Class Record
```json
{
  "id": "cls-2023-01",
  "name": "Form 1",
  "academic_year_id": "ay-2023",
  "stream": "A",
  "capacity": 40,
  "created_at": "2022-11-01T10:00:00Z",
  "updated_at": "2022-11-01T10:00:00Z"
}
```

### Sample Dormitory Record
```json
{
  "id": 101,
  "name": "Victoria Hall",
  "master_id": "stf-001",
  "master_name": "Jane Smith",
  "created_at": "2020-01-01T08:00:00Z",
  "updated_at": "2020-01-01T08:00:00Z"
}
```

### Sample Disciplinary Case Record
```json
{
  "id": "dc-001",
  "case_number": "DC-2024-001",
  "student_id": "std-001",
  "student_name": "John Doe",
  "admission_number": "STD-001",
  "class_name": "Form 1A",
  "category": "Behavior",
  "severity": "Moderate",
  "status": "Under Investigation",
  "title": "Late to Class",
  "description": "Student consistently arriving late to class without valid excuse",
  "incident_date": "2024-01-15",
  "incident_time": "08:30:00",
  "incident_location": "Classroom 101",
  "reported_by": "stf-002",
  "reported_by_name": "Mr. Johnson",
  "assigned_to": "stf-003",
  "assigned_to_name": "Ms. Williams",
  "witnesses": "Teacher and class monitor",
  "action_taken": "Verbal Warning",
  "action_details": "Written warning issued with parent notification",
  "action_date": "2024-01-16T10:00:00Z",
  "follow_up_required": true,
  "follow_up_date": "2024-01-23",
  "follow_up_notes": "Student showed improvement in punctuality",
  "parent_notified": true,
  "parent_notification_date": "2024-01-16T11:30:00Z",
  "parent_response": "Apologized and committed to better punctuality",
  "created_at": "2024-01-15T09:00:00Z",
  "updated_at": "2024-01-23T14:30:00Z"
}
```

### Sample Certificate Request Record
```json
{
  "id": "cr-001",
  "certificate_number": "CERT-2024-001",
  "student_id": "std-001",
  "student_name": "John Doe",
  "admission_number": "STD-001",
  "class_name": "Form 1A",
  "certificate_type": "Character Certificate",
  "status": "Issued",
  "purpose": "University Admission Application",
  "remarks": "Certificate issued with good conduct",
  "requested_by": "std-001",
  "requested_by_name": "John Doe",
  "requested_at": "2024-01-10T09:00:00Z",
  "approved_by": "stf-004",
  "approved_by_name": "Dr. Brown",
  "approved_at": "2024-01-12T10:30:00Z",
  "issued_by": "stf-005",
  "issued_by_name": "Mrs. Davis",
  "issued_at": "2024-01-15T14:00:00Z",
  "rejection_reason": "",
  "created_at": "2024-01-10T09:00:00Z",
  "updated_at": "2024-01-15T14:00:00Z"
}
```

### Sample Visitor Log Record
```json
{
  "id": "vl-001",
  "visitor_name": "Mary Jane Doe",
  "visitor_type": "Parent",
  "phone": "+254712345678",
  "email": "mary.j.doe@email.com",
  "id_type": "National ID",
  "id_number": "12345678",
  "purpose": "Parent-Teacher Meeting",
  "person_to_meet": "Mr. Johnson",
  "person_to_meet_id": "stf-002",
  "status": "Checked Out",
  "check_in_time": "2024-01-15T15:30:00Z",
  "check_out_time": "2024-01-15T16:15:00Z",
  "expected_arrival": "2024-01-15T15:30:00Z",
  "remarks": "Visited classroom 205 for meeting",
  "created_at": "2024-01-15T15:25:00Z",
  "updated_at": "2024-01-15T16:15:00Z"
}
```

**Section sources**
- [types.ts:710-847](file://src/modules/administration/data/types.ts#L710-L847)

## Business Rules and Constraints
The Administration module enforces several business rules to maintain data integrity and support school operations.

### Academic Year Validity
Academic years must have non-overlapping date ranges to prevent scheduling conflicts. The system validates that:
- The start date is before the end date
- No two academic years have overlapping date ranges
- Only one academic year can have `is_current` set to true

When creating a new academic year, the system automatically sets `is_current` to false for all other years.

### Class-Stream Hierarchies
Classes are organized within academic years and may have streams to support differentiated instruction. The system enforces:
- Each class must belong to exactly one academic year
- Stream names within a class must be unique
- Class capacity must be a positive integer
- Student enrollment cannot exceed class capacity

### Data Integrity Constraints
The system enforces referential integrity through foreign key constraints:
- Students must reference existing classes and dormitories
- Staff must reference existing departments and designations
- Attendance records must reference existing students and periods
- Health records must reference existing students
- Disciplinary cases must reference existing students and users
- Certificate requests must reference existing students and users
- Visitor logs must reference existing users for person_to_meet

### Disciplinary Management Rules
The disciplinary system enforces comprehensive policies:
- Disciplinary cases require unique case numbers
- Severity levels must be categorized appropriately (Minor, Moderate, Serious, Critical)
- Status progression follows proper workflow (Reported → Under Investigation → Pending Review → Resolved)
- Actions must match severity levels and institutional policies
- Parent notification is mandatory for certain actions
- Follow-up requirements are tracked for ongoing supervision

### Certificate Management Rules
The certificate system maintains strict controls:
- Certificate numbers must be unique and sequentially generated
- Status tracking ensures proper authorization workflow
- Approval requires authorized personnel signatures
- Issuance requires final approval and timestamping
- Rejection reasons must be documented for transparency

### Visitor Management Rules
The visitor management system enforces security protocols:
- Visitor types are categorized for appropriate access control
- Check-in/check-out timestamps ensure accurate tracking
- Expected arrival times facilitate scheduling coordination
- Status tracking prevents unauthorized extended stays
- ID verification ensures visitor authenticity

### Validation Rules
The system implements comprehensive validation rules:
- Required fields must be present
- String fields have maximum length constraints
- Numeric fields have appropriate ranges
- Date fields follow ISO format
- Email fields follow standard email format
- Phone numbers follow international format
- Foreign key references must exist in referenced collections

These business rules are enforced at both the application and database levels to ensure data consistency and reliability across the system.

**Section sources**
- [schema.ts:605-734](file://src/modules/administration/data/schema.ts#L605-L734)
- [types.ts:666-847](file://src/modules/administration/data/types.ts#L666-L847)