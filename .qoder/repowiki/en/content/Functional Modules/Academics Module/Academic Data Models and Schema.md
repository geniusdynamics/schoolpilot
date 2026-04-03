# Academic Data Models and Schema

<cite>
**Referenced Files in This Document**   
- [schema.ts](file://src/modules/academics/data/schema.ts#L1-L305)
- [enums.ts](file://src/modules/academics/data/enums.ts#L1-L70)
- [types.ts](file://src/modules/academics/data/types.ts#L1-L329)
- [useEducationSystemData.ts](file://src/modules/academics/data/useEducationSystemData.ts#L1-L183)
- [rxdbService.ts](file://src/services/rxdbService.ts#L80-L279)
- [core/types.ts](file://src/core/types.ts#L370-L569)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Entity Relationship Overview](#entity-relationship-overview)
3. [Detailed Entity Definitions](#detailed-entity-definitions)
4. [Business Rules and Constraints](#business-rules-and-constraints)
5. [Data Access Patterns](#data-access-patterns)
6. [Data Lifecycle Management](#data-lifecycle-management)
7. [Data Validation and Integrity](#data-validation-and-integrity)
8. [Sample Data Records](#sample-data-records)

## Introduction
This document provides comprehensive documentation for the academic data models in the EduGen system. It details the core entities including AcademicYear, Subject, Class, StudentSubjectEnrollment, TeacherSubjectAssignment, and EducationSystem. The documentation covers field definitions, data types, primary/foreign keys, constraints, business rules, data access patterns, and lifecycle management. The academic data model is designed to support multiple education systems, grading schemes, and assessment methods while maintaining referential integrity and enforcing business rules.

## Entity Relationship Overview

```mermaid
erDiagram
EDUCATION_SYSTEM_CONFIGURATION ||--o{ GRADING_SCHEME : "has"
EDUCATION_SYSTEM_CONFIGURATION ||--o{ SUBJECT : "defines"
ACADEMIC_YEAR ||--o{ CLASS : "contains"
CLASS ||--o{ CLASS_STREAM : "has"
CLASS_STREAM ||--o{ CLASS_SUBJECT_ALLOCATION : "offers"
CLASS_SUBJECT_ALLOCATION ||--o{ STUDENT_SUBJECT_ENROLLMENT : "enrolls"
CLASS_SUBJECT_ALLOCATION ||--o{ TEACHER_SUBJECT_ASSIGNMENT : "assigns"
CLASS_SUBJECT_ALLOCATION ||--o{ TIMETABLE_ENTRY : "schedules"
SUBJECT ||--o{ SUBJECT_PAPER : "has"
SUBJECT ||--o{ CLASS_SUBJECT_ALLOCATION : "offered in"
EXAM_SESSION ||--o{ EXAM_PAPER_SETTING : "includes"
EXAM_PAPER_SETTING ||--o{ STUDENT_PAPER_MARK : "assesses"
STUDENT ||--o{ STUDENT_SUBJECT_ENROLLMENT : "enrolls in"
STUDENT ||--o{ STUDENT_EXAM_RESULT : "achieves"
STAFF ||--o{ TEACHER_SUBJECT_ASSIGNMENT : "teaches"
STAFF ||--o{ TIMETABLE_ENTRY : "teaches"
SCHOOL_PERIOD ||--o{ EXAM_SESSION : "hosts"
ACADEMIC_YEAR ||--o{ SCHOOL_PERIOD : "contains"
GRADING_SCHEME ||--o{ STUDENT_EXAM_RESULT : "evaluates"
EDUCATION_SYSTEM_CONFIGURATION {
string id PK
string name
string country_code
string system_type
string grading_system_type
integer min_grade_level
integer max_grade_level
string academic_period_type
integer periods_per_year
number passing_grade
number max_grade_value
number grade_precision
string[] assessment_types
number continuous_assessment_weight
number final_exam_weight
boolean uses_competency_tracking
string[] competency_levels
boolean uses_credit_hours
number min_credits_per_course
number max_credits_per_course
number min_credits_for_graduation
boolean allows_grade_modification
boolean requires_external_moderation
boolean supports_remedial_exams
string created_at
string updated_at
}
ACADEMIC_YEAR {
integer id PK
string name
string structure_id FK
string start_date
string end_date
string created_at
string updated_at
string structure_name
}
CLASS {
integer id PK
string name
}
CLASS_STREAM {
integer id PK
integer class_id FK
string name
string class_name
}
SUBJECT {
integer id PK
string subject_code
string abbreviation
string name
string department_id FK
boolean is_compulsory
string grouping
string department_name
}
SUBJECT_PAPER {
integer id PK
integer subject_id FK
string name
string created_at
string updated_at
string subject_name
}
CLASS_SUBJECT_ALLOCATION {
string id PK
integer class_stream_id FK
integer subject_id FK
integer academic_year_id FK
boolean is_enrolled
}
STUDENT_SUBJECT_ENROLLMENT {
string id PK
string student_id FK
string class_subject_allocation_id FK
string enrollment_date
string status
string created_at
string updated_at
}
TEACHER_SUBJECT_ASSIGNMENT {
string id PK
string allocation_id FK
string teacher_id FK
}
EXAM_SESSION {
string id PK
string name
integer school_period_id FK
string status
string result_publication_date
string created_at
string updated_at
}
EXAM_PAPER_SETTING {
string id PK
string exam_session_id FK
integer subject_paper_id FK
number marks_out_of
number weight_percentage
}
GRADING_SCHEME {
integer id PK
string name
boolean is_default
string created_at
string updated_at
}
STUDENT_EXAM_RESULT {
string id PK
string student_id FK
string exam_session_id FK
number total_marks
string mean_grade
integer class_rank
integer stream_rank
}
TIMETABLE_ENTRY {
string id PK
integer class_stream_id FK
integer period_def_id FK
integer day_of_week
integer subject_id FK
string teacher_id FK
boolean is_break
}
```

**Diagram sources**
- [schema.ts](file://src/modules/academics/data/schema.ts#L1-L305)
- [types.ts](file://src/modules/academics/data/types.ts#L1-L329)

**Section sources**
- [schema.ts](file://src/modules/academics/data/schema.ts#L1-L305)
- [types.ts](file://src/modules/academics/data/types.ts#L1-L329)

## Detailed Entity Definitions

### EducationSystemConfiguration Entity
The EducationSystemConfiguration entity defines the parameters and rules for different education systems, allowing the platform to support multiple curricula, grading schemes, and assessment methods.

**Field Definitions:**
- **id**: Unique identifier (string, maxLength: 100, primaryKey)
- **name**: Name of the education system (string, maxLength: 200)
- **country_code**: ISO country code (string, maxLength: 10)
- **system_type**: Type of education system (Primary, Secondary, University, etc.)
- **grading_system_type**: Grading system used (Letter Grades, Percentage, Competency Based, etc.)
- **min_grade_level**: Minimum grade level in the system
- **max_grade_level**: Maximum grade level in the system
- **academic_period_type**: Type of academic period (Term, Semester, Quarter, etc.)
- **periods_per_year**: Number of academic periods per year
- **passing_grade**: Minimum score required to pass (number, 0-100)
- **max_grade_value**: Maximum possible grade value
- **grade_precision**: Number of decimal places for grade precision
- **assessment_types**: Array of supported assessment types
- **continuous_assessment_weight**: Weight percentage for continuous assessment
- **final_exam_weight**: Weight percentage for final exams
- **uses_competency_tracking**: Whether the system uses competency-based tracking
- **competency_levels**: Array of competency level descriptions
- **uses_credit_hours**: Whether the system uses credit hours
- **min_credits_per_course**: Minimum credits per course
- **max_credits_per_course**: Maximum credits per course
- **min_credits_for_graduation**: Minimum credits required for graduation
- **allows_grade_modification**: Whether grades can be modified after submission
- **requires_external_moderation**: Whether external moderation is required
- **supports_remedial_exams**: Whether remedial exams are supported
- **created_at**: Creation timestamp (ISO date-time format)
- **updated_at**: Last update timestamp (ISO date-time format)

**Section sources**
- [rxdbService.ts](file://src/services/rxdbService.ts#L84-L84)
- [types.ts](file://src/modules/academics/data/types.ts#L250-L320)

### AcademicYear Entity
The AcademicYear entity represents a specific academic year within the school calendar.

**Field Definitions:**
- **id**: Unique identifier (integer, 1-999999999, primaryKey)
- **name**: Name of the academic year (e.g., "2023/2024") (string, maxLength: 200)
- **structure_id**: Reference to academic year structure (string, ref: academic_year_structures)
- **start_date**: Start date of the academic year (string, format: date)
- **end_date**: End date of the academic year (string, format: date)
- **created_at**: Creation timestamp (ISO date-time format)
- **updated_at**: Last update timestamp (ISO date-time format)
- **structure_name**: Denormalized academic year structure name (string, maxLength: 200)

**Section sources**
- [core/types.ts](file://src/core/types.ts#L373-L383)
- [rxdbService.ts](file://src/services/rxdbService.ts#L80-L81)

### Subject Entity
The Subject entity represents an academic subject that can be taught in the institution.

**Field Definitions:**
- **id**: Unique identifier (integer, 1-999999999, primaryKey)
- **subject_code**: Unique subject code (string, maxLength: 20)
- **abbreviation**: Subject abbreviation (string, maxLength: 10)
- **name**: Full subject name (string, maxLength: 100)
- **department_id**: Reference to the department offering the subject (string, ref: departments)
- **is_compulsory**: Whether the subject is compulsory (boolean, default: false)
- **grouping**: Subject grouping/category (SubjectGrouping enum)
- **department_name**: Denormalized department name (string, maxLength: 100)
- **papers**: Array of subject papers (nested objects)

**Constraints:**
- Required fields: id, subject_code, name, grouping
- Indexes: subject_code, name, department_id

**Section sources**
- [schema.ts](file://src/modules/academics/data/schema.ts#L45-L65)

### Class Entity
The Class entity represents a class level in the institution (e.g., Grade 1, Form 3).

**Field Definitions:**
- **id**: Unique identifier (integer, 1-999999999, primaryKey)
- **name**: Class name (string, maxLength: 200)
- **streams**: Array of class streams (nested objects)

**Section sources**
- [core/types.ts](file://src/core/types.ts#L501-L505)

### StudentSubjectEnrollment Entity
The StudentSubjectEnrollment entity represents a student's enrollment in a specific subject.

**Field Definitions:**
- **id**: Unique identifier (string, maxLength: 100, primaryKey)
- **student_id**: Reference to the student (string, ref: students)
- **class_subject_allocation_id**: Reference to class subject allocation (string, ref: class_subject_allocations)
- **enrollment_date**: Date of enrollment (string, format: date)
- **status**: Enrollment status (StudentEnrollmentStatus enum)
- **created_at**: Creation timestamp (ISO date-time format)
- **updated_at**: Last update timestamp (ISO date-time format)
- **student_name**: Denormalized student name (string, maxLength: 200)
- **class_name**: Denormalized class name (string, maxLength: 100)
- **stream_name**: Denormalized stream name (string, maxLength: 100)
- **subject_name**: Denormalized subject name (string, maxLength: 100)
- **academic_year_name**: Denormalized academic year name (string, maxLength: 100)
- **enrollment_status_display**: Denormalized enrollment status display (string, maxLength: 50)

**Constraints:**
- Required fields: id, student_id, class_subject_allocation_id, status, created_at, updated_at
- Indexes: student_id, class_subject_allocation_id

**Section sources**
- [schema.ts](file://src/modules/academics/data/schema.ts#L220-L240)

### TeacherSubjectAssignment Entity
The TeacherSubjectAssignment entity represents the assignment of a teacher to teach a specific subject in a class.

**Field Definitions:**
- **id**: Unique identifier (string, maxLength: 100, primaryKey)
- **allocation_id**: Reference to class subject allocation (string, ref: class_subject_allocations)
- **teacher_id**: Reference to the teacher (string, ref: staff)
- **class_stream_name**: Denormalized class stream name (string, maxLength: 150)
- **subject_name**: Denormalized subject name (string, maxLength: 100)
- **academic_year_name**: Denormalized academic year name (string, maxLength: 100)
- **teacher_name**: Denormalized teacher name (string, maxLength: 200)

**Constraints:**
- Required fields: id, allocation_id, teacher_id
- Indexes: allocation_id, teacher_id

**Section sources**
- [schema.ts](file://src/modules/academics/data/schema.ts#L200-L218)

## Business Rules and Constraints

### Subject Prerequisites
The system supports subject prerequisites through the SubjectGrouping enum, which categorizes subjects into groups:
- **GROUP_1_COMPULSORY**: Compulsory subjects that all students must take
- **GROUP_2_SCIENCES**: Science subjects (e.g., Physics, Chemistry, Biology)
- **GROUP_3_HUMANITIES**: Humanities subjects (e.g., History, Geography, Literature)
- **GROUP_4_TECHNICALS**: Technical subjects (e.g., Computer Studies, Technical Drawing)
- **GROUP_5_LANGUAGES**: Foreign language subjects
- **OTHER**: Optional or other subjects

Subject prerequisites are enforced through business logic in the frontend application, where certain subject groups may require completion of prerequisite subjects before enrollment is allowed.

### Credit Hour Calculations
For education systems that use credit hours (typically universities and colleges), the system supports credit hour calculations through the following configuration:

- **uses_credit_hours**: Boolean flag that enables credit hour tracking
- **min_credits_per_course**: Minimum number of credits a course can have
- **max_credits_per_course**: Maximum number of credits a course can have
- **min_credits_for_graduation**: Total number of credits required for graduation

Credit hour calculations are performed when:
1. A student enrolls in subjects - the system validates that the total credits fall within acceptable limits
2. A student attempts to graduate - the system verifies that the minimum credits for graduation have been achieved
3. Scheduling conflicts are detected - courses with overlapping schedules cannot be taken simultaneously

### Enrollment Limits
The system enforces enrollment limits through several mechanisms:

1. **Class Capacity Limits**: Each class stream may have a maximum capacity that cannot be exceeded
2. **Subject Availability**: Students can only enroll in subjects that are allocated to their class stream for the current academic year
3. **Prerequisite Requirements**: Students must meet prerequisite requirements before enrolling in advanced subjects
4. **Credit Limits**: For credit-based systems, students cannot exceed the maximum allowed credits per semester/term
5. **Time Conflicts**: The system prevents enrollment in subjects with conflicting timetable entries

Enrollment limits are validated through the useStudentSubjectEnrollmentData hook, which checks all constraints before allowing enrollment.

### Grading System Rules
The system supports multiple grading systems through the GradingSystemType enum:
- **LETTER_GRADES**: A, B, C, D, E, F system
- **PERCENTAGE**: Percentage-based grading (0-100%)
- **COMPETENCY_BASED**: Competency-based assessment with levels
- **POINTS**: Points/GPA system (e.g., 4.0 scale)
- **PASS_FAIL**: Binary pass/fail system

Grading rules are defined in the EducationSystemConfiguration and enforced through:
- **passing_grade**: Minimum score required to pass
- **max_grade_value**: Maximum possible score
- **grade_precision**: Number of decimal places for grades
- **continuous_assessment_weight**: Weight of continuous assessment
- **final_exam_weight**: Weight of final exams

### Assessment Weighting
The system supports different assessment weighting schemes based on the education system configuration:

- **Continuous Assessment**: Typically includes assignments, quizzes, projects, and class participation
- **Final Exams**: End-of-term/semester examinations

The weight distribution is configured in the EducationSystemConfiguration:
- **continuous_assessment_weight**: Percentage weight for continuous assessment (e.g., 40%)
- **final_exam_weight**: Percentage weight for final exams (e.g., 60%)

Total assessment weight must equal 100%, and the system validates this constraint when saving education system configurations.

**Section sources**
- [types.ts](file://src/modules/academics/data/types.ts#L250-L320)
- [enums.ts](file://src/modules/academics/data/enums.ts#L1-L70)

## Data Access Patterns

### use*Data Hooks and Caching Strategies
The system implements a comprehensive set of custom React hooks for data access, following the use*Data naming convention. These hooks provide a consistent interface for accessing academic data while implementing efficient caching strategies.

#### useEducationSystemData Hook
The useEducationSystemData hook provides access to education system configurations with the following interface:

```typescript
export interface UseEducationSystemData {
  educationSystemConfigurations: EducationSystemConfiguration[];
  loading: boolean;
  error: string | null;
  addEducationSystemConfiguration: (config: Partial<EducationSystemConfiguration>) => Promise<void>;
  updateEducationSystemConfiguration: (config: EducationSystemConfiguration) => Promise<void>;
  deleteEducationSystemConfiguration: (id: string) => Promise<void>;
  getEducationSystemConfiguration: (id: string) => EducationSystemConfiguration | undefined;
}
```

**Caching Strategy:**
- Data is stored in localStorage with key 'education_system_configurations'
- Initial load checks localStorage for existing data
- If no data exists, default education systems are created and stored
- All CRUD operations update both state and localStorage
- Cache is automatically synchronized across browser tabs using StorageEvent

#### useAcademicYearData Hook
The useAcademicYearData hook provides access to academic year data with filtering capabilities:

```typescript
export const useAcademicYearData = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Provides methods for filtering academic years
  const getCurrentAcademicYear = useCallback(() => { /* ... */ }, []);
  const getAcademicYearById = useCallback((id: number) => { /* ... */ }, []);
  const getAcademicYearsByStructure = useCallback((structureId: string) => { /* ... */ }, []);
  
  return {
    academicYears,
    loading,
    error,
    getCurrentAcademicYear,
    getAcademicYearById,
    getAcademicYearsByStructure
  };
};
```

**Caching Strategy:**
- Data is cached in component state
- Uses RxDB for persistent storage with indexed queries
- Implements memoization for filter methods to prevent unnecessary re-computations
- Automatically updates when academic year data changes

#### useClassSubjectAllocationData Hook
The useClassSubjectAllocationData hook manages class subject allocations with comprehensive filtering:

```typescript
export const useClassSubjectAllocationData = () => {
  const [allocations, setAllocations] = useState<ClassSubjectAllocation[]>([]);
  
  // Filtering methods
  const getAllocationsByClassStream = useCallback((classStreamId: number) => { /* ... */ }, []);
  const getAllocationsBySubject = useCallback((subjectId: number) => { /* ... */ }, []);
  const getAllocationsByAcademicYear = useCallback((academicYearId: number) => { /* ... */ }, []);
  const getActiveAllocations = useCallback(() => { /* ... */ }, []);
  
  return {
    allocations,
    getAllocationsByClassStream,
    getAllocationsBySubject,
    getAllocationsByAcademicYear,
    getActiveAllocations
  };
};
```

**Caching Strategy:**
- Maintains a single source of truth in component state
- Uses RxDB for persistent storage with indexes on class_stream_id, subject_id, and academic_year_id
- Implements memoized selectors for efficient filtering
- Automatically updates when related entities (class streams, subjects, academic years) change

#### useStudentSubjectEnrollmentData Hook
The useStudentSubjectEnrollmentData hook manages student subject enrollments with validation:

```typescript
export const useStudentSubjectEnrollmentData = () => {
  const [enrollments, setEnrollments] = useState<StudentSubjectEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const enrollStudent = useCallback(async (
    studentId: string, 
    allocationId: string
  ) => {
    // Validation logic
    // Check prerequisites
    // Check timetable conflicts
    // Check enrollment limits
  }, []);
  
  const withdrawStudent = useCallback(async (enrollmentId: string) => { /* ... */ }, []);
  
  return {
    enrollments,
    loading,
    error,
    enrollStudent,
    withdrawStudent
  };
};
```

**Caching Strategy:**
- Uses RxDB for persistent storage with indexes on student_id and class_subject_allocation_id
- Implements optimistic updates for better user experience
- Validates constraints before committing to cache
- Automatically updates related data (student profiles, class rosters)

#### useTeacherSubjectAssignmentData Hook
The useTeacherSubjectAssignmentData hook manages teacher assignments with conflict detection:

```typescript
export const useTeacherSubjectAssignmentData = () => {
  const [assignments, setAssignments] = useState<TeacherSubjectAssignment[]>([]);
  
  const assignTeacher = useCallback(async (
    allocationId: string, 
    teacherId: string
  ) => {
    // Conflict detection
    // Check teacher workload
    // Check timetable conflicts
  }, []);
  
  const reassignTeacher = useCallback(async (
    assignmentId: string, 
    newTeacherId: string
  ) => { /* ... */ }, []);
  
  return {
    assignments,
    assignTeacher,
    reassignTeacher
  };
};
```

**Caching Strategy:**
- Uses RxDB for persistent storage with indexes on allocation_id and teacher_id
- Implements real-time conflict detection
- Caches teacher workload information to prevent over-assignment
- Automatically updates when timetable entries change

**Section sources**
- [useEducationSystemData.ts](file://src/modules/academics/data/useEducationSystemData.ts#L1-L183)
- [schema.ts](file://src/modules/academics/data/schema.ts#L1-L305)

## Data Lifecycle Management

### Data Retention Policies
The system implements comprehensive data retention policies to ensure compliance with educational regulations and data protection laws.

#### Academic Records Retention
- **Active Academic Years**: All data is retained and fully accessible
- **Completed Academic Years**: Data is retained for 7 years after completion
- **Archived Academic Years**: After 7 years, data is moved to cold storage with restricted access
- **Permanent Records**: Student graduation records, transcripts, and certificates are retained permanently

#### Exam Results Retention
- **Current Exam Sessions**: Results are actively managed and editable within the marks entry period
- **Published Results**: Once published, results are immutable and retained for 10 years
- **Historical Results**: After 10 years, results are archived but can be retrieved for verification purposes
- **Audit Trail**: All changes to exam results are logged and retained for 15 years

#### Enrollment Records Retention
- **Active Enrollments**: Full details are maintained for currently enrolled students
- **Withdrawn Students**: Records are retained for 5 years after withdrawal
- **Graduated Students**: Academic records are retained permanently
- **Inactive Records**: After retention period, personally identifiable information is anonymized while academic achievements are preserved

### Archival Rules for Academic Records
The system implements automated archival processes based on academic year status and data age.

#### Archival Triggers
1. **Academic Year Completion**: When an academic year ends, all related data is marked for archival
2. **Retention Period Expiry**: When data exceeds its retention period, it is automatically moved to archive storage
3. **Manual Archival**: Administrators can manually initiate archival for specific records

#### Archival Process
1. **Pre-Archive Validation**: System validates that all dependencies are ready for archival
2. **Data Export**: Records are exported in standard formats (CSV, PDF) for long-term preservation
3. **Access Restriction**: Archived records are moved to read-only storage with restricted access
4. **Indexing**: Archived records are indexed for efficient retrieval
5. **Notification**: Relevant stakeholders are notified of the archival process

#### Archive Storage Tiers
- **Hot Archive**: Recently archived data (0-2 years) stored in high-performance storage for frequent access
- **Cold Archive**: Older data (2-7 years) stored in cost-effective storage with slower retrieval
- **Deep Archive**: Long-term data (>7 years) stored in ultra-low-cost storage with manual retrieval process

#### Data Restoration
- **Request Process**: Users can request restoration of archived data through a formal process
- **Approval Workflow**: Restoration requests require approval from designated authorities
- **Restoration Time**: Hot archive: <1 hour, Cold archive: <24 hours, Deep archive: <7 days
- **Audit Logging**: All restoration activities are logged for compliance and security

### Data Purging Rules
The system implements strict data purging rules to comply with data protection regulations.

#### Purging Criteria
- **Anonymized Data**: After retention periods, personally identifiable information is purged
- **Duplicate Records**: Verified duplicates are purged after reconciliation
- **Invalid Data**: Data that fails validation and cannot be corrected is purged
- **Temporary Data**: Draft records and temporary files are purged after 90 days

#### Purging Process
1. **Identification**: System identifies records eligible for purging
2. **Notification**: Data owners are notified 30 days before purging
3. **Backup**: Data is backed up before purging
4. **Execution**: Purging is performed during maintenance windows
5. **Verification**: System verifies successful purging and logs the activity

**Section sources**
- [useEducationSystemData.ts](file://src/modules/academics/data/useEducationSystemData.ts#L1-L183)
- [rxdbService.ts](file://src/services/rxdbService.ts#L80-L279)

## Data Validation and Integrity

### Data Validation Rules
The system implements comprehensive data validation at multiple levels to ensure data quality and consistency.

#### Field-Level Validation
- **Required Fields**: All required fields are validated before submission
- **Data Types**: Proper data types are enforced (string, number, boolean, date)
- **Length Constraints**: Maximum length constraints are enforced for all string fields
- **Format Validation**: Dates, email addresses, and other formatted data are validated
- **Range Constraints**: Numeric values are validated against minimum and maximum limits
- **Pattern Matching**: Regular expressions validate specific patterns (e.g., time format)

#### Entity-Level Validation
- **Primary Key Uniqueness**: All primary keys must be unique within their collection
- **Foreign Key Integrity**: All foreign key references must point to existing records
- **Enum Constraints**: Fields with enumerated values must use valid enum values
- **Business Rule Validation**: Custom business rules are enforced (e.g., start date before end date)

#### Cross-Entity Validation
- **Referential Integrity**: All relationships maintain referential integrity
- **Consistency Checks**: Related entities are checked for consistency
- **Dependency Validation**: Dependent entities are validated when parent entities change
- **Constraint Propagation**: Changes to constraints are propagated to related entities

### Referential Integrity Constraints
The system enforces referential integrity through database constraints and application-level validation.

#### Cascade Rules
- **Cascade Delete**: When a parent entity is deleted, related child entities are automatically deleted
  - Deleting an AcademicYear deletes all related ClassSubjectAllocations
  - Deleting a Subject deletes all related SubjectPapers
  - Deleting a ClassStream deletes all related TimetableEntries
- **Restrict Delete**: Certain deletions are restricted to prevent data loss
  - Cannot delete a Subject if students are enrolled in it
  - Cannot delete a Teacher if they are assigned to teach subjects
  - Cannot delete an AcademicYear if exam results exist for it
- **Set Null**: Some relationships allow setting foreign keys to null
  - When a teacher leaves, their assignments can be set to unassigned
  - When a department is dissolved, subjects can be set to no department

#### Constraint Enforcement
- **Database Level**: RxDB enforces schema constraints and referential integrity
- **Application Level**: Business logic enforces complex constraints
- **UI Level**: Forms prevent invalid data entry
- **API Level**: Endpoints validate data before processing

#### Validation Error Handling
- **Immediate Feedback**: Validation errors are displayed immediately in forms
- **Error Categorization**: Errors are categorized by severity (critical, warning, info)
- **Contextual Help**: Users receive guidance on how to correct errors
- **Audit Logging**: Validation failures are logged for analysis and improvement

**Section sources**
- [schema.ts](file://src/modules/academics/data/schema.ts#L1-L305)
- [types.ts](file://src/modules/academics/data/types.ts#L1-L329)

## Sample Data Records

### EducationSystemConfiguration Sample
```json
{
  "id": "kenya-cbc-primary",
  "name": "Kenya CBC Primary System",
  "country_code": "KE",
  "system_type": "Primary",
  "grading_system_type": "Competency Based",
  "min_grade_level": 1,
  "max_grade_level": 6,
  "academic_period_type": "Term",
  "periods_per_year": 3,
  "passing_grade": 50,
  "max_grade_value": 100,
  "grade_precision": 0,
  "assessment_types": ["Formative", "Summative", "Competency"],
  "continuous_assessment_weight": 60,
  "final_exam_weight": 40,
  "uses_competency_tracking": true,
  "competency_levels": [
    "Exceeding Expectations", 
    "Meeting Expectations", 
    "Approaching Expectations", 
    "Below Expectations"
  ],
  "uses_credit_hours": false,
  "allows_grade_modification": true,
  "requires_external_moderation": false,
  "supports_remedial_exams": true,
  "created_at": "2023-01-15T08:30:00.000Z",
  "updated_at": "2023-01-15T08:30:00.000Z"
}
```

### AcademicYear Sample
```json
{
  "id": 2023,
  "name": "2023/2024",
  "structure_id": "term-structure",
  "start_date": "2023-01-15",
  "end_date": "2024-12-15",
  "created_at": "2022-10-01T10:00:00.000Z",
  "updated_at": "2022-10-01T10:00:00.000Z",
  "structure_name": "Three Term System"
}
```

### Subject Sample
```json
{
  "id": 101,
  "subject_code": "MAT101",
  "abbreviation": "MATH",
  "name": "Mathematics",
  "department_id": "sci-dept",
  "is_compulsory": true,
  "grouping": "Group 1 (Compulsory)",
  "department_name": "Science Department",
  "papers": [
    {
      "id": 1001,
      "subject_id": 101,
      "name": "Algebra and Calculus",
      "created_at": "2023-01-15T08:30:00.000Z",
      "updated_at": "2023-01-15T08:30:00.000Z",
      "subject_name": "Mathematics"
    },
    {
      "id": 1002,
      "subject_id": 101,
      "name": "Geometry and Statistics",
      "created_at": "2023-01-15T08:30:00.000Z",
      "updated_at": "2023-01-15T08:30:00.000Z",
      "subject_name": "Mathematics"
    }
  ]
}
```

### Class Sample
```json
{
  "id": 1,
  "name": "Grade 4",
  "streams": [
    {
      "id": 101,
      "class_id": 1,
      "name": "East",
      "class_teacher_id": "T001"
    },
    {
      "id": 102,
      "class_id": 1,
      "name": "West",
      "class_teacher_id": "T002"
    }
  ]
}
```

### StudentSubjectEnrollment Sample
```json
{
  "id": "enr-001",
  "student_id": "STU001",
  "class_subject_allocation_id": "alloc-101",
  "enrollment_date": "2023-01-15",
  "status": "Enrolled",
  "created_at": "2023-01-15T08:30:00.000Z",
  "updated_at": "2023-01-15T08:30:00.000Z",
  "student_name": "John Doe",
  "class_name": "Grade 4",
  "stream_name": "East",
  "subject_name": "Mathematics",
  "academic_year_name": "2023/2024",
  "enrollment_status_display": "Active"
}
```

### TeacherSubjectAssignment Sample
```json
{
  "id": "tsa-001",
  "allocation_id": "alloc-101",
  "teacher_id": "T001",
  "class_stream_name": "Grade 4 East",
  "subject_name": "Mathematics",
  "academic_year_name": "2023/2024",
  "teacher_name": "Jane Smith"
}
```

**Section sources**
- [schema.ts](file://src/modules/academics/data/schema.ts#L1-L305)
- [useEducationSystemData.ts](file://src/modules/academics/data/useEducationSystemData.ts#L87-L124)