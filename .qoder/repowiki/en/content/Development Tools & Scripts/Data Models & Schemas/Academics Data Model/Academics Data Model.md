# Academics Data Model

<cite>
**Referenced Files in This Document**   
- [collections.ts](file://src/modules/academics/data/collections.ts#L1-L51)
- [schema.ts](file://src/modules/academics/data/schema.ts)
- [types.ts](file://src/modules/academics/data/types.ts)
- [migration-utils.ts](file://src/modules/academics/data/migration-utils.ts#L1-L357)
- [LetterGradeStrategy.ts](file://src/modules/academics/strategies/LetterGradeStrategy.ts#L1-L86)
- [PercentageGradeStrategy.ts](file://src/modules/academics/strategies/PercentageGradeStrategy.ts#L1-L15)
- [CBCGradeStrategy.ts](file://src/modules/academics/strategies/CBCGradeStrategy.ts)
- [GPA_GradeStrategy.ts](file://src/modules/academics/strategies/GPA_GradeStrategy.ts)
- [PassFailGradeStrategy.ts](file://src/modules/academics/strategies/PassFailGradeStrategy.ts)
- [education_integration_summary.md](file://src/modules/academics/education_integration_summary.md#L1-L59)
- [README.md](file://README.md#L1-L467)
- [core/types.ts](file://src/core/types.ts#L373-L383)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Data Collections](#core-data-collections)
4. [Hierarchical Relationships](#hierarchical-relationships)
5. [Polymorphic Grading Strategy Pattern](#polymorphic-grading-strategy-pattern)
6. [Field-Level Documentation](#field-level-documentation)
7. [Sample JSON Instances](#sample-json-instances)
8. [Schema Evolution and Migration](#schema-evolution-and-migration)
9. [Timetabling and Exam Scheduling Relationships](#timetabling-and-exam-scheduling-relationships)
10. [Conclusion](#conclusion)

## Introduction

The Academics module in schoolpilot3 provides a comprehensive data model for managing educational institutions' academic operations. This documentation details the schema design for over 12 collections including AcademicYear, EducationSystem, Subject, ExamSession, GradingScheme, StudentExamResult, and TimetableEntry. The system implements a polymorphic grading strategy pattern supporting CBC, GPA, Letter, Pass/Fail, and Percentage grading systems. The data model supports hierarchical relationships between educational entities and provides robust mechanisms for schema evolution and migration from legacy systems.

**Section sources**
- [README.md](file://README.md#L1-L467)
- [education_integration_summary.md](file://src/modules/academics/education_integration_summary.md#L1-L59)

## Project Structure

The Academics module follows a domain-driven design pattern with a consistent structure across all modules in the schoolpilot3 application. The module is organized into components, data, i18n, pages, services, and strategies directories, each serving a specific purpose in the application architecture.

The data directory contains the core schema definitions, types, and collection configurations that define the academic data model. The strategies directory implements the polymorphic grading system, while the services directory contains business logic for academic operations. The pages directory contains the user interface components for interacting with academic data.

```mermaid
graph TB
subgraph "Academics Module"
subgraph "components"
AMC[AcademicModuleStatus]
AV[AuditTrailViewer]
BME[BulkMarkEntry]
EFF[ExamSchedulingUI]
GCW[GradeCalculatorWidget]
RRI[ResultReviewInterface]
SC[SchedulingCalendar]
end
subgraph "data"
DT[types.ts]
MD[mockData.ts]
S[schema.ts]
C[collections.ts]
MU[migration-utils.ts]
end
subgraph "i18n"
EN[en.json]
FR[fr.json]
RW[rw.json]
SW[sw.json]
end
subgraph "pages"
ADP[AcademicsDashboardPage]
CSE[ClassSubjectAllocationsPage]
ECP[EducationSystemConfigPage]
ESP[EducationSystemsPage]
EAP[ExamAnalysisPage]
ESP[ExamSchedulingPage]
ESEP[ExamSessionsPage]
GSP[GradingSchemesPage]
RAD[ResultApprovalDashboard]
SREP[StudentExamResultsEntryPage]
SSEP[StudentSubjectEnrollmentPage]
SPM[SubjectPapersManagementPage]
SP[SubjectsPage]
TSA[TeacherSubjectAssignmentPage]
TEP[TimetableEntriesPage]
TPP[TimetablePeriodsPage]
end
subgraph "services"
ATS[AuditTrailService]
CDE[ConflictDetectionEngine]
EVS[EducationSystemValidationService]
ESM[ExamScheduleManager]
GES[GradingEngineService]
RAS[ResultApprovalStateMachine]
TIS[TimetableIntegrationService]
MS[marksService]
end
subgraph "strategies"
CBC[CBCGradeStrategy]
GPA[GPA_GradeStrategy]
LG[LetterGradeStrategy]
PF[PassFailGradeStrategy]
PCT[PercentageGradeStrategy]
end
end
DT --> S
S --> C
C --> rxdbService[src/services/rxdbService.ts]
MU --> legacy[Legacy Systems]
LG --> GS[GradingScheme]
CBC --> GS
GPA --> GS
PF --> GS
PCT --> GS
```

**Diagram sources**
- [collections.ts](file://src/modules/academics/data/collections.ts#L1-L51)
- [schema.ts](file://src/modules/academics/data/schema.ts)
- [types.ts](file://src/modules/academics/data/types.ts)

**Section sources**
- [README.md](file://README.md#L1-L467)
- [collections.ts](file://src/modules/academics/data/collections.ts#L1-L51)

## Core Data Collections

The Academics module defines 12+ collections that represent the core entities in the academic data model. These collections are configured in the collections.ts file and use schema definitions from the schema.ts file. The collections follow RxDB conventions and are registered with the central database service.

The primary collections include:
- **subjects**: Academic subjects offered by the institution
- **subject_papers**: Components or papers that make up a subject
- **exam_sessions**: Examination periods within an academic year
- **exam_schedules**: Detailed schedules for examinations
- **grading_schemes**: Configuration for grading systems
- **student_exam_results**: Results of students in examinations
- **class_subject_allocations**: Assignment of subjects to class streams
- **teacher_subject_assignments**: Assignment of teachers to subjects
- **student_subject_enrollments**: Enrollment of students in subjects
- **timetable_period_definitions**: Definitions of timetable periods
- **timetable_entries**: Scheduled classes in the timetable

```mermaid
erDiagram
SUBJECT {
string id PK
string subject_code
string abbreviation
string name
number department_id
boolean is_compulsory
string grouping
string department_name
string created_at
string updated_at
}
SUBJECT_PAPER {
string id PK
string subject_id FK
string name
string created_at
string updated_at
string subject_name
}
EXAM_SESSION {
string id PK
string name
number school_period_id
string status
string result_publication_date
string created_at
string updated_at
string school_period_name
}
GRADING_SCHEME {
string id PK
string name
boolean is_default
string created_at
string updated_at
}
STUDENT_EXAM_RESULT {
string id PK
string student_id
string exam_session_id
number total_marks
string mean_grade
number class_rank
number stream_rank
string overall_comment
string created_at
string updated_at
string student_name
string admission_no
string class_name
string stream_name
string exam_session_name
}
TIMETABLE_PERIOD_DEFINITION {
string id PK
string period_name
string start_time
string end_time
string day_of_week
string created_at
string updated_at
}
TIMETABLE_ENTRY {
string id PK
string period_def_id FK
string subject_id FK
string class_id FK
string teacher_id FK
string room_id
string created_at
string updated_at
string period_name
string subject_name
string class_name
string teacher_name
}
SUBJECT ||--o{ SUBJECT_PAPER : "contains"
SUBJECT ||--o{ CLASS_SUBJECT_ALLOCATION : "assigned to"
SUBJECT ||--o{ TEACHER_SUBJECT_ASSIGNMENT : "taught by"
SUBJECT ||--o{ STUDENT_SUBJECT_ENROLLMENT : "enrolled in"
EXAM_SESSION ||--o{ STUDENT_EXAM_RESULT : "has results"
GRADING_SCHEME ||--o{ GRADING_SCHEME_LEVEL : "defines levels"
TIMETABLE_PERIOD_DEFINITION ||--o{ TIMETABLE_ENTRY : "scheduled in"
SUBJECT ||--o{ TIMETABLE_ENTRY : "taught in"
```

**Diagram sources**
- [collections.ts](file://src/modules/academics/data/collections.ts#L1-L51)
- [schema.ts](file://src/modules/academics/data/schema.ts)

**Section sources**
- [collections.ts](file://src/modules/academics/data/collections.ts#L1-L51)
- [schema.ts](file://src/modules/academics/data/schema.ts)

## Hierarchical Relationships

The academic data model implements a hierarchical relationship structure that reflects the organizational nature of educational institutions. The primary hierarchy flows from EducationSystem to AcademicYear to ExamSession to StudentExamResult, with parallel hierarchies for curriculum management through Subject to SubjectPaper to ExamPaperSetting.

The EducationSystem represents the highest level of academic organization, defining the curriculum framework, grading approaches, and assessment methodologies used by the institution. Each EducationSystem contains one or more AcademicYears, which represent the annual academic cycle.

Each AcademicYear contains multiple ExamSessions, which represent examination periods such as mid-term, end-of-term, or final examinations. Each ExamSession contains StudentExamResults for all students who participated in that examination session.

Parallel to this assessment hierarchy, the Subject hierarchy manages the curriculum. Subjects are composed of SubjectPapers, which represent components or papers within a subject. SubjectPapers are linked to ExamPaperSettings, which define the assessment parameters for each paper in an examination.

```mermaid
graph TD
ES[EducationSystem] --> AY[AcademicYear]
AY --> ES[ExamSession]
ES --> SER[StudentExamResult]
S[Subject] --> SP[SubjectPaper]
SP --> EPS[ExamPaperSetting]
EPS --> ES
C[Class] --> CSA[ClassSubjectAllocation]
CSA --> S
T[Teacher] --> TSA[TeacherSubjectAssignment]
TSA --> S
ST[Student] --> SSE[StudentSubjectEnrollment]
SSE --> S
ST --> SER
TTD[TimetablePeriodDef] --> TE[TimetableEntry]
TE --> S
TE --> C
TE --> T
style ES fill:#f9f,stroke:#333
style AY fill:#bbf,stroke:#333
style ES fill:#f96,stroke:#333
style SER fill:#6f9,stroke:#333
style S fill:#ff9,stroke:#333
style SP fill:#9cf,stroke:#333
```

**Diagram sources**
- [education_integration_summary.md](file://src/modules/academics/education_integration_summary.md#L1-L59)
- [schema.ts](file://src/modules/academics/data/schema.ts)

**Section sources**
- [education_integration_summary.md](file://src/modules/academics/education_integration_summary.md#L1-L59)
- [schema.ts](file://src/modules/academics/data/schema.ts)

## Polymorphic Grading Strategy Pattern

The Academics module implements a polymorphic grading strategy pattern through a set of strategy classes that handle different grading methodologies. This design follows the Strategy pattern, allowing the system to support multiple grading systems while maintaining a consistent interface for grade calculation.

The grading strategies are implemented as classes that implement the GradingStrategy interface, which defines a calculate method for computing student grades. The available strategies include:

- **CBCGradeStrategy**: Competency-Based Curriculum grading
- **GPA_GradeStrategy**: Grade Point Average system
- **LetterGradeStrategy**: Letter grade system (A, B, C, etc.)
- **PassFailGradeStrategy**: Binary pass/fail assessment
- **PercentageGradeStrategy**: Percentage-based grading

Each strategy encapsulates the logic for its specific grading methodology, allowing the system to switch between grading systems based on institutional requirements or educational frameworks.

```mermaid
classDiagram
class GradingStrategy {
<<interface>>
+calculate(result : StudentExamResult, gradingScheme? : GradingScheme) : StudentExamResult
}
class CBCGradeStrategy {
+calculate(result : StudentExamResult, gradingScheme? : GradingScheme) : StudentExamResult
+calculateCompetencyScore(competencies : any[]) : number
+determineLevel(score : number) : string
}
class GPA_GradeStrategy {
+calculate(result : StudentExamResult, gradingScheme? : GradingScheme) : StudentExamResult
+calculateGPA(points : number[], credits : number[]) : number
+convertToGradePoints(grade : string) : number
}
class LetterGradeStrategy {
+calculate(result : StudentExamResult, gradingScheme? : GradingScheme) : StudentExamResult
+calculateWithModifiers(score : number) : string
+getGradePoints(grade : string) : number
+isPassing(grade : string) : boolean
}
class PassFailGradeStrategy {
+calculate(result : StudentExamResult, gradingScheme? : GradingScheme) : StudentExamResult
+isPassing(score : number, passingThreshold : number) : boolean
+getPassingThreshold() : number
}
class PercentageGradeStrategy {
+calculate(result : StudentExamResult) : StudentExamResult
}
GradingStrategy <|-- CBCGradeStrategy
GradingStrategy <|-- GPA_GradeStrategy
GradingStrategy <|-- LetterGradeStrategy
GradingStrategy <|-- PassFailGradeStrategy
GradingStrategy <|-- PercentageGradeStrategy
class GradingEngineService {
-strategies : Map<string, GradingStrategy>
+registerStrategy(type : string, strategy : GradingStrategy) : void
+calculateGrade(result : StudentExamResult, strategyType : string, gradingScheme? : GradingScheme) : StudentExamResult
+getAvailableStrategies() : string[]
}
GradingEngineService --> GradingStrategy
```

**Diagram sources**
- [LetterGradeStrategy.ts](file://src/modules/academics/strategies/LetterGradeStrategy.ts#L1-L86)
- [PercentageGradeStrategy.ts](file://src/modules/academics/strategies/PercentageGradeStrategy.ts#L1-L15)
- [CBCGradeStrategy.ts](file://src/modules/academics/strategies/CBCGradeStrategy.ts)
- [GPA_GradeStrategy.ts](file://src/modules/academics/strategies/GPA_GradeStrategy.ts)
- [PassFailGradeStrategy.ts](file://src/modules/academics/strategies/PassFailGradeStrategy.ts)

**Section sources**
- [LetterGradeStrategy.ts](file://src/modules/academics/strategies/LetterGradeStrategy.ts#L1-L86)
- [PercentageGradeStrategy.ts](file://src/modules/academics/strategies/PercentageGradeStrategy.ts#L1-L15)

## Field-Level Documentation

This section provides detailed documentation for critical properties in the academic data model, explaining their purpose, data types, constraints, and usage patterns.

### GradingScheme Fields

**gradingScale**: This field represents the scale used for grading, typically defined by the levels array in the grading scheme. It determines the range of possible grades and their corresponding score ranges.

**passingThreshold**: The minimum score required to pass an assessment. This value is used by grading strategies to determine pass/fail status and can be configured per grading scheme.

**levels**: An array of GradingSchemeLevel objects that define the grade boundaries, points, and comments for each grade. Each level specifies a minimum score threshold and the corresponding grade.

```mermaid
classDiagram
class GradingScheme {
+id : string
+name : string
+is_default : boolean
+created_at : string
+updated_at : string
+levels : GradingSchemeLevel[]
}
class GradingSchemeLevel {
+id : number
+scheme_id : string
+grade : string
+min_score : number
+max_score : number
+points : number
+comment : string
}
GradingScheme --> GradingSchemeLevel : "contains"
```

### StudentExamResult Fields

**resultStatus**: Indicates the current status of the exam result, such as DRAFT, SUBMITTED, APPROVED, or PUBLISHED. This field is used in the result approval workflow.

**total_marks**: The total score achieved by the student in the examination, calculated from the sum of marks across all subject papers.

**mean_grade**: The letter or symbolic grade corresponding to the total marks, calculated using the configured grading strategy.

**class_rank** and **stream_rank**: The student's position within their class and stream based on their performance relative to peers.

**Section sources**
- [schema.ts](file://src/modules/academics/data/schema.ts)
- [types.ts](file://src/modules/academics/data/types.ts)

## Sample JSON Instances

This section provides sample JSON instances for complex entities in the academic data model, illustrating the structure and relationships between fields.

### GradingScheme with Levels

```json
{
  "id": "gs-kenya-secondary-2023",
  "name": "Kenya Secondary School Grading Scheme 2023",
  "is_default": true,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z",
  "levels": [
    {
      "id": 1,
      "scheme_id": "gs-kenya-secondary-2023",
      "grade": "A",
      "min_score": 80,
      "max_score": 100,
      "points": 12,
      "comment": "Excellent"
    },
    {
      "id": 2,
      "scheme_id": "gs-kenya-secondary-2023",
      "grade": "A-",
      "min_score": 75,
      "max_score": 79,
      "points": 11,
      "comment": "Very Good"
    },
    {
      "id": 3,
      "scheme_id": "gs-kenya-secondary-2023",
      "grade": "B+",
      "min_score": 70,
      "max_score": 74,
      "points": 10,
      "comment": "Good"
    },
    {
      "id": 4,
      "scheme_id": "gs-kenya-secondary-2023",
      "grade": "B",
      "min_score": 65,
      "max_score": 69,
      "points": 9,
      "comment": "Good"
    },
    {
      "id": 5,
      "scheme_id": "gs-kenya-secondary-2023",
      "grade": "B-",
      "min_score": 60,
      "max_score": 64,
      "points": 8,
      "comment": "Above Average"
    }
  ]
}
```

### SubjectPaper with Assessment Weightings

```json
{
  "id": "sp-mat-p1-2023",
  "subject_id": "sub-mathematics-2023",
  "name": "Paper 1",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z",
  "subject_name": "Mathematics",
  "assessment_weightings": [
    {
      "component": "exam",
      "weight": 70,
      "description": "Final examination"
    },
    {
      "component": "continuous_assessment",
      "weight": 30,
      "description": "Class exercises, quizzes, and assignments"
    }
  ],
  "marks_out_of": 100,
  "duration_minutes": 180,
  "syllabus_sections": [
    "Algebra",
    "Geometry",
    "Trigonometry"
  ]
}
```

**Section sources**
- [schema.ts](file://src/modules/academics/data/schema.ts)
- [types.ts](file://src/modules/academics/data/types.ts)

## Schema Evolution and Migration

The academic data model includes comprehensive mechanisms for schema evolution and migration from legacy examination systems. The migration-utils.ts file contains utilities for transforming data from legacy systems to the new SP3 schema, implementing the transformation rules defined in the Phase 4 data schema mapping.

The migration process uses deterministic UUID generation to ensure consistent mapping between legacy and new records. The AcademicsMigrationUtils class provides methods for transforming various legacy entities to their new counterparts:

- **transformExaminationToExamSession**: Converts legacy examinations to new exam sessions
- **transformLegacySubject**: Transforms legacy subjects to the new subject schema
- **transformSplitSubjectToSubjectPaper**: Converts split subjects to subject papers
- **transformExamResultToStudentExamResult**: Transforms legacy exam results to student exam results
- **transformSubjectMarksToStudentPaperMarks**: Transforms subject column marks to student paper marks
- **transformLegacyGradingToGradingScheme**: Converts legacy grading configurations to grading schemes

The migration process also includes validation methods to ensure data integrity during transformation, with batch processing capabilities for handling large datasets efficiently.

```mermaid
sequenceDiagram
participant Legacy as "Legacy System"
participant Migration as "MigrationUtils"
participant New as "New Schema"
Legacy->>Migration : Extract legacy data
Migration->>Migration : Create school period lookup
Migration->>Migration : Generate deterministic UUIDs
loop For each legacy examination
Migration->>Migration : transformExaminationToExamSession()
Migration->>New : Create ExamSession
end
loop For each legacy subject
Migration->>Migration : transformLegacySubject()
Migration->>New : Create Subject
end
loop For each legacy split subject
Migration->>Migration : transformSplitSubjectToSubjectPaper()
Migration->>New : Create SubjectPaper
end
loop For each legacy exam result
Migration->>Migration : transformExamResultToStudentExamResult()
Migration->>New : Create StudentExamResult
Migration->>Migration : transformSubjectMarksToStudentPaperMarks()
Migration->>New : Create StudentPaperMarks
end
loop For each legacy grading
Migration->>Migration : transformLegacyGradingToGradingScheme()
Migration->>New : Create GradingScheme
end
Migration->>Migration : validateTransformedData()
New->>Legacy : Confirmation of successful migration
```

**Diagram sources**
- [migration-utils.ts](file://src/modules/academics/data/migration-utils.ts#L1-L357)

**Section sources**
- [migration-utils.ts](file://src/modules/academics/data/migration-utils.ts#L1-L357)

## Timetabling and Exam Scheduling Relationships

The academic data model includes comprehensive relationships between timetabling, subject allocation, and exam scheduling entities. These relationships ensure that the curriculum, instruction, and assessment components are properly coordinated.

The timetabling system is built around TimetablePeriodDefinition and TimetableEntry entities. Period definitions specify the time slots for classes (e.g., 8:00-9:00 AM, Monday-Friday), while timetable entries assign specific subjects, classes, teachers, and rooms to these periods.

These timetabling entities are linked to subject allocation through ClassSubjectAllocation and TeacherSubjectAssignment, ensuring that only subjects allocated to a class and teachers assigned to those subjects can be scheduled in the timetable.

Exam scheduling is coordinated with timetabling through the ExamSession and ExamSchedule entities. Exam sessions represent examination periods, while exam schedules detail the specific dates, times, and venues for each subject examination.

The integration between timetabling and exam scheduling ensures that examination periods do not conflict with regular class schedules and that appropriate venues are available for examinations.

```mermaid
graph TD
subgraph "Timetabling"
TPD[TimetablePeriodDef]
TE[TimetableEntry]
end
subgraph "Subject Management"
S[Subject]
CSA[ClassSubjectAllocation]
TSA[TeacherSubjectAssignment]
SSE[StudentSubjectEnrollment]
end
subgraph "Exam Scheduling"
ES[ExamSession]
ESE[ExamScheduleEntry]
EPS[ExamPaperSetting]
end
TPD --> TE
S --> CSA
S --> TSA
S --> SSE
S --> EPS
CSA --> TE
TSA --> TE
TE --> TPD
ES --> ESE
EPS --> ESE
S --> ESE
classDef data fill:#f9f,stroke:#333;
classDef relationship fill:#ff9,stroke:#333;
class TPD,TE,ES,ESE,EPS,CSA,TSA,SSE data
class S relationship
```

**Diagram sources**
- [schema.ts](file://src/modules/academics/data/schema.ts)
- [collections.ts](file://src/modules/academics/data/collections.ts#L1-L51)

**Section sources**
- [schema.ts](file://src/modules/academics/data/schema.ts)
- [collections.ts](file://src/modules/academics/data/collections.ts#L1-L51)

## Conclusion

The Academics module in schoolpilot3 provides a robust and flexible data model for managing educational institutions' academic operations. The schema design supports 12+ collections with well-defined hierarchical relationships between educational entities. The polymorphic grading strategy pattern allows the system to support multiple grading methodologies including CBC, GPA, Letter, Pass/Fail, and Percentage systems.

The data model includes comprehensive field-level documentation for critical properties and provides sample JSON instances for complex entities. Schema evolution practices are well-documented, with migration procedures from legacy examination systems implemented through the migration-utils.ts file.

The relationships between timetabling, subject allocation, and exam scheduling entities are clearly defined, ensuring proper coordination between curriculum, instruction, and assessment components. The modular architecture and domain-driven design make the system scalable and maintainable, with clear separation of concerns and consistent patterns across all components.

This comprehensive data model enables educational institutions to effectively manage their academic operations while providing flexibility to adapt to different curricula, grading systems, and assessment methodologies.

**Section sources**
- [README.md](file://README.md#L1-L467)
- [education_integration_summary.md](file://src/modules/academics/education_integration_summary.md#L1-L59)