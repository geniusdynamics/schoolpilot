# Data Migration

<cite>
**Referenced Files in This Document**
- [run_full_migration.ts](file://scripts/migration/run_full_migration.ts)
- [transform_data.ts](file://scripts/migration/transform_data.ts)
- [load_data.ts](file://scripts/migration/load_data.ts)
- [verify_migration.ts](file://scripts/migration/verify_migration.ts)
- [chunk_processor.ts](file://scripts/migration/chunk_processor.ts)
- [database_manager.ts](file://scripts/migration/database_manager.ts)
- [migration-logger.ts](file://scripts/migration/migration-logger.ts)
- [migration-utils.ts](file://src/modules/academics/data/migration-utils.ts)
- [extract_legacy_examinations.sql](file://scripts/migration/extract_legacy_examinations.sql)
- [extract_legacy_subjects.sql](file://scripts/migration/extract_legacy_subjects.sql)
- [extract_legacy_exam_results.sql](file://scripts/migration/extract_legacy_exam_results.sql)
</cite>

## Update Summary
**Changes Made**
- Updated project structure documentation to reflect the current migration directory organization
- Revised component analysis to align with the actual implementation in the repository
- Updated architecture diagrams to match the current codebase structure
- Removed references to non-existent migration specification documents
- Enhanced troubleshooting guidance with current implementation details
- Updated configuration and dependency analysis sections

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
This document provides a comprehensive overview of the data migration framework in schoolpilot3, detailing the end-to-end process of migrating from legacy systems. The framework follows the Extract, Transform, Load (ETL) pattern with verification, ensuring data integrity throughout the migration process. The system is designed to handle complex academic data including examinations, subjects, exam results, and grading schemes, transforming legacy schemas into the current RxDB collections used by the application.

**Updated** The framework now operates as a streamlined ETL pipeline with four distinct phases: extraction from legacy databases, transformation using specialized utilities, chunked loading with rollback capabilities, and comprehensive verification.

## Project Structure
The data migration framework is organized within the `scripts/migration` directory, containing specialized scripts for each phase of the migration process. The framework leverages configuration files, utility classes, and modular scripts to ensure a reliable and verifiable migration process.

```mermaid
graph TD
A[Migrations] --> B[Configuration]
A --> C[Orchestration]
A --> D[Extraction]
A --> E[Transformation]
A --> F[Loading]
A --> G[Verification]
B --> B1[database_manager.ts]
C --> C1[run_full_migration.ts]
D --> D1[extract_data.ts]
D --> D2[SQL Scripts]
E --> E1[transform_data.ts]
E --> E2[transform_exam_results.ts]
E --> E3[transform_grading_schemes.ts]
E --> E4[transform_school_periods.ts]
E --> E5[transform_subjects.ts]
F --> F1[load_data.ts]
F --> F2[chunk_processor.ts]
G --> G1[verify_migration.ts]
G --> G2[verification_queries.ts]
G --> G3[migration-logger.ts]
F --> F3[database_manager.ts]
```

**Diagram sources**
- [run_full_migration.ts](file://scripts/migration/run_full_migration.ts)
- [transform_data.ts](file://scripts/migration/transform_data.ts)
- [load_data.ts](file://scripts/migration/load_data.ts)
- [verify_migration.ts](file://scripts/migration/verify_migration.ts)
- [database_manager.ts](file://scripts/migration/database_manager.ts)

**Section sources**
- [run_full_migration.ts](file://scripts/migration/run_full_migration.ts)
- [transform_data.ts](file://scripts/migration/transform_data.ts)
- [load_data.ts](file://scripts/migration/load_data.ts)
- [verify_migration.ts](file://scripts/migration/verify_migration.ts)

## Core Components
The data migration framework consists of several core components that work together to ensure a successful migration from legacy systems to the current RxDB-based architecture. These components include configuration management, data extraction, transformation utilities, chunked data loading, and comprehensive verification processes.

**Updated** The core components now include a sophisticated chunk processor with rollback capabilities, a robust database manager supporting both PostgreSQL and MySQL connections, and a comprehensive logging system with progress tracking.

**Section sources**
- [database_manager.ts](file://scripts/migration/database_manager.ts)
- [chunk_processor.ts](file://scripts/migration/chunk_processor.ts)
- [migration-logger.ts](file://scripts/migration/migration-logger.ts)

## Architecture Overview
The data migration architecture follows a sequential ETL (Extract, Transform, Load) process with a final verification phase. The framework is orchestrated by the `run_full_migration.ts` script, which coordinates the execution of individual migration phases. Each phase is designed to be modular and can be executed independently if needed.

```mermaid
sequenceDiagram
participant Orchestrator as run_full_migration.ts
participant Extractor as extract_data.ts
participant Transformer as transform_data.ts
participant Loader as load_data.ts
participant Verifier as verify_migration.ts
participant LegacyDB as Legacy Database
participant RxDB as RxDB Instance
Orchestrator->>Orchestrator : Start migration process
Orchestrator->>Extractor : Execute extraction
Extractor->>LegacyDB : Query data via SQL
LegacyDB-->>Extractor : Return legacy data
Extractor->>Extractor : Save to data/extracted/
Extractor-->>Orchestrator : Extraction complete
Orchestrator->>Transformer : Execute transformation
Transformer->>Transformer : Read extracted data
Transformer->>Transformer : Apply mapping rules
Transformer->>Transformer : Save to data/transformed/
Transformer-->>Orchestrator : Transformation complete
Orchestrator->>Loader : Execute loading
Loader->>Loader : Read transformed data
Loader->>RxDB : Load via chunk_processor
RxDB-->>Loader : Confirm loading
Loader-->>Orchestrator : Loading complete
Orchestrator->>Verifier : Execute verification
Verifier->>LegacyDB : Query source counts
Verifier->>RxDB : Query target counts
RxDB-->>Verifier : Return counts
Verifier->>Verifier : Generate report
Verifier-->>Orchestrator : Verification results
Orchestrator->>Orchestrator : Process completed
```

**Diagram sources**
- [run_full_migration.ts](file://scripts/migration/run_full_migration.ts)
- [transform_data.ts](file://scripts/migration/transform_data.ts)
- [load_data.ts](file://scripts/migration/load_data.ts)
- [verify_migration.ts](file://scripts/migration/verify_migration.ts)

## Detailed Component Analysis

### Data Extraction Phase
The data extraction phase retrieves data from legacy databases using SQL queries and stores it in JSON format for subsequent processing. The extraction process connects to both the legacy Akademico system (PostgreSQL) and the target SchoolPilot system (MySQL).

```mermaid
flowchart TD
Start([Start Extraction]) --> ReadConfig["Read database_manager.ts"]
ReadConfig --> ConnectLegacy["Connect to Legacy Database"]
ConnectLegacy --> ExecuteSQL["Execute SQL Scripts"]
ExecuteSQL --> examinations["extract_legacy_examinations.sql"]
ExecuteSQL --> subjects["extract_legacy_subjects.sql"]
ExecuteSQL --> exam_results["extract_legacy_exam_results.sql"]
ExecuteSQL --> QueryData["Query Data from Legacy DB"]
QueryData --> StoreJSON["Store as JSON Files"]
StoreJSON --> data_extracted["data/extracted/examinations.json"]
StoreJSON --> data_extracted_subjects["data/extracted/subjects.json"]
StoreJSON --> data_extracted_results["data/extracted/exam_results.json"]
data_extracted --> End([Extraction Complete])
data_extracted_subjects --> End
data_extracted_results --> End
```

**Diagram sources**
- [extract_legacy_examinations.sql](file://scripts/migration/extract_legacy_examinations.sql)
- [extract_legacy_subjects.sql](file://scripts/migration/extract_legacy_subjects.sql)
- [extract_legacy_exam_results.sql](file://scripts/migration/extract_legacy_exam_results.sql)

**Section sources**
- [database_manager.ts](file://scripts/migration/database_manager.ts)

### Data Transformation Phase
The transformation phase maps legacy data schemas to the current RxDB collections using the `AcademicsMigrationUtils` class. This phase handles the conversion of various academic entities including examinations, subjects, exam results, and grading schemes.

```mermaid
classDiagram
class AcademicsMigrationUtils {
+generateMigrationUUID(legacyTable : string, legacyId : string) : string
+transformExaminationToExamSession(legacyExam : LegacyExamination, schoolPeriodId : number) : AcademicsExamSessionType
+transformLegacySubject(legacySubject : LegacySubject, departmentId? : number) : AcademicsSubjectType
+transformSplitSubjectToSubjectPaper(splitSubject : LegacySplitSubject, subjectId : number) : AcademicsSubjectPaperType
+transformExamResultToStudentExamResult(legacyResult : LegacyExamResult, studentId : string, examSessionId : string) : AcademicsStudentExamResultWithDetailsType
+transformSubjectMarksToStudentPaperMarks(legacyResult : LegacyExamResult, studentExamResultId : string, subjectPapers : Array) : AcademicsStudentPaperMarkWithDetailsType[]
+transformLegacyGradingToGradingScheme(legacyGrading : LegacyGrading) : AcademicsGradingSchemeType
+createSchoolPeriodLookup(examinations : LegacyExamination[]) : Map<string, number>
+processBatch<T, R>(items : T[], batchSize : number, processor : (batch : T[]) => Promise<R[]>) : Promise<R[]>
}
class transform_data_ts {
+transformData() : Promise<void>
}
class transform_exam_results_ts {
+main() : Promise<void>
}
class transform_grading_schemes_ts {
+main() : Promise<void>
}
class transform_school_periods_ts {
+main() : Promise<void>
}
class transform_subjects_ts {
+main() : Promise<void>
}
transform_data_ts --> AcademicsMigrationUtils : "uses"
transform_exam_results_ts --> AcademicsMigrationUtils : "uses"
transform_grading_schemes_ts --> AcademicsMigrationUtils : "uses"
transform_school_periods_ts --> AcademicsMigrationUtils : "uses"
transform_subjects_ts --> AcademicsMigrationUtils : "uses"
```

**Diagram sources**
- [transform_data.ts](file://scripts/migration/transform_data.ts)
- [migration-utils.ts](file://src/modules/academics/data/migration-utils.ts)

**Section sources**
- [transform_data.ts](file://scripts/migration/transform_data.ts)
- [migration-utils.ts](file://src/modules/academics/data/migration-utils.ts)

### Data Loading Phase
The data loading phase uses a chunked processing approach to safely load transformed data into RxDB collections. The `MigrationManager` class handles chunking, validation, error handling, and rollback capabilities to ensure data integrity during the loading process.

```mermaid
flowchart TD
Start([Start Loading]) --> ReadConfig["Read migration_config.ts"]
ReadConfig --> InitRxDB["Initialize RxDB Connection"]
InitRxDB --> ReadTransformed["Read Transformed Data"]
ReadTransformed --> examinations["data/transformed/examinations.json"]
ReadTransformed --> subjects["data/transformed/subjects.json"]
ReadTransformed --> exam_results["data/transformed/exam_results.json"]
examinations --> ProcessExams["Process Examinations"]
subjects --> ProcessSubjects["Process Subjects"]
exam_results --> ProcessResults["Process Exam Results"]
subgraph ChunkProcessor
ProcessExams --> ChunkExams["Split into Chunks"]
ChunkExams --> ValidateExams["Validate Chunk"]
ValidateExams --> CommitExams["Commit to exam_sessions"]
CommitExams --> RetryExams{"Commit Failed?"}
RetryExams -- Yes --> BackoffExams["Exponential Backoff"]
BackoffExams --> RetryExams
RetryExams -- No --> SuccessExams["Chunk Processed"]
ProcessSubjects --> ChunkSubjects["Split into Chunks"]
ChunkSubjects --> ValidateSubjects["Validate Chunk"]
ValidateSubjects --> CommitSubjects["Commit to subjects"]
CommitSubjects --> RetrySubjects{"Commit Failed?"}
RetrySubjects -- Yes --> BackoffSubjects["Exponential Backoff"]
BackoffSubjects --> RetrySubjects
RetrySubjects -- No --> SuccessSubjects["Chunk Processed"]
ProcessResults --> ChunkResults["Split into Chunks"]
ChunkResults --> ValidateResults["Validate Chunk"]
ValidateResults --> CommitResults["Commit to student_exam_results"]
CommitResults --> RetryResults{"Commit Failed?"}
RetryResults -- Yes --> BackoffResults["Exponential Backoff"]
BackoffResults --> RetryResults
RetryResults -- No --> SuccessResults["Chunk Processed"]
end
SuccessExams --> End([Loading Complete])
SuccessSubjects --> End
SuccessResults --> End
```

**Diagram sources**
- [load_data.ts](file://scripts/migration/load_data.ts)
- [chunk_processor.ts](file://scripts/migration/chunk_processor.ts)
- [database_manager.ts](file://scripts/migration/database_manager.ts)

**Section sources**
- [load_data.ts](file://scripts/migration/load_data.ts)
- [chunk_processor.ts](file://scripts/migration/chunk_processor.ts)

### Data Verification Phase
The verification phase ensures data integrity by comparing record counts between the source and target databases and performing additional data integrity checks. The process generates a comprehensive report that documents the verification results.

```mermaid
flowchart TD
Start([Start Verification]) --> ConnectDatabases["Connect to Both Databases"]
ConnectDatabases --> VerifyExams["Verify Examinations"]
ConnectDatabases --> VerifySubjects["Verify Subjects"]
ConnectDatabases --> VerifyResults["Verify Exam Results"]
VerifyExams --> QuerySourceExams["Query Source: SELECT COUNT(*) FROM examinations"]
QuerySourceExams --> QueryTargetExams["Query Target: db.exam_sessions.count().exec()"]
QueryTargetExams --> CompareExams{"Counts Match?"}
CompareExams -- Yes --> PassExams["Status: PASS"]
CompareExams -- No --> FailExams["Status: FAIL"]
VerifySubjects --> QuerySourceSubjects["Query Source: SELECT COUNT(*) FROM subjects"]
QuerySourceSubjects --> QueryTargetSubjects["Query Target: db.subjects.count().exec()"]
QueryTargetSubjects --> CompareSubjects{"Counts Match?"}
CompareSubjects -- Yes --> PassSubjects["Status: PASS"]
CompareSubjects -- No --> FailSubjects["Status: FAIL"]
VerifyResults --> QuerySourceResults["Query Source: SELECT COUNT(*) FROM exam_results"]
QuerySourceResults --> QueryTargetResults["Query Target: db.student_exam_results.count().exec()"]
QueryTargetResults --> CompareResults{"Counts Match?"}
CompareResults -- Yes --> PassResults["Status: PASS"]
CompareResults -- No --> FailResults["Status: FAIL"]
PassExams --> CheckOrphans["Check for Orphaned Records"]
FailExams --> CheckOrphans
PassSubjects --> CheckOrphans
FailSubjects --> CheckOrphans
PassResults --> CheckOrphans
FailResults --> CheckOrphans
CheckOrphans --> FindOrphans["Find results without valid exam session ID"]
FindOrphans --> OrphansFound{"Orphans Found?"}
OrphansFound -- Yes --> WarningOrphans["Status: WARNING"]
OrphansFound -- No --> NoOrphans["No Orphans"]
WarningOrphans --> GenerateReport["Generate Verification Report"]
NoOrphans --> GenerateReport
PassExams --> GenerateReport
PassSubjects --> GenerateReport
PassResults --> GenerateReport
FailExams --> GenerateReport
FailSubjects --> GenerateReport
FailResults --> GenerateReport
GenerateReport --> SaveReport["Save to data/reports/migration-verification-*.json"]
SaveReport --> LogResults["Log Results to Console"]
LogResults --> DetermineStatus["Determine Overall Status"]
DetermineStatus --> End([Verification Complete])
```

**Diagram sources**
- [verify_migration.ts](file://scripts/migration/verify_migration.ts)

**Section sources**
- [verify_migration.ts](file://scripts/migration/verify_migration.ts)

## Dependency Analysis
The data migration framework has a well-defined dependency structure that ensures modularity and separation of concerns. The components are organized in a way that allows for independent execution of each migration phase.

```mermaid
graph TD
A[run_full_migration.ts] --> B[extract_data.ts]
A --> C[transform_data.ts]
A --> D[load_data.ts]
A --> E[verify_migration.ts]
B --> F[database_manager.ts]
B --> G[SQL Scripts]
C --> H[migration-utils.ts]
C --> I[database_manager.ts]
D --> J[chunk_processor.ts]
D --> K[database_manager.ts]
D --> L[rxdbService.ts]
E --> M[database_manager.ts]
E --> N[rxdbService.ts]
J --> O[migration-utils.ts]
J --> P[database_manager.ts]
F --> Q[SQL Scripts]
C --> R[JSON Files]
D --> R
```

**Diagram sources**
- [run_full_migration.ts](file://scripts/migration/run_full_migration.ts)
- [transform_data.ts](file://scripts/migration/transform_data.ts)
- [load_data.ts](file://scripts/migration/load_data.ts)
- [verify_migration.ts](file://scripts/migration/verify_migration.ts)
- [chunk_processor.ts](file://scripts/migration/chunk_processor.ts)
- [database_manager.ts](file://scripts/migration/database_manager.ts)

**Section sources**
- [run_full_migration.ts](file://scripts/migration/run_full_migration.ts)
- [database_manager.ts](file://scripts/migration/database_manager.ts)

## Performance Considerations
The data migration framework incorporates several performance optimizations to handle large datasets efficiently:

1. **Chunked Processing**: The `MigrationManager` processes data in configurable chunks (default: 1000 items) to prevent memory overflow and allow for progress tracking.

2. **Exponential Backoff**: When a chunk fails to process, the system implements exponential backoff with retries (default: 3 attempts) before failing the migration.

3. **Bulk Operations**: The loading phase groups operations by collection to enable efficient bulk inserts, reducing the number of database transactions.

4. **Connection Pooling**: The `DatabaseManager` implements connection pooling for both PostgreSQL and MySQL connections to optimize database performance.

5. **Parallel Processing**: While the current implementation processes entities sequentially, the architecture supports parallel processing of independent entities.

The framework also includes comprehensive logging with different log levels (debug, info, warn, error) to monitor performance and troubleshoot issues during migration.

**Updated** The logging system now includes timer functionality for performance tracking and progress indicators for long-running operations.

**Section sources**
- [chunk_processor.ts](file://scripts/migration/chunk_processor.ts)
- [database_manager.ts](file://scripts/migration/database_manager.ts)
- [migration-logger.ts](file://scripts/migration/migration-logger.ts)

## Troubleshooting Guide
This section provides guidance for common migration issues and their solutions.

### Data Type Mismatches
**Issue**: Data type mismatches between legacy and target schemas can cause transformation or loading failures.

**Solution**:
1. Review the `migration-utils.ts` transformation functions to ensure proper type conversion
2. Add validation in the transformation phase to catch type issues early
3. Use the deterministic UUID generation for consistent identifier mapping

```typescript
// Example: Ensure proper type conversion
static transformExaminationToExamSession(
  legacyExam: LegacyExamination,
  schoolPeriodId: number
): types.AcademicsExamSessionType {
  return {
    id: this.generateMigrationUUID('examinations', legacyExam.id.toString()),
    name: legacyExam.ExamName,
    school_period_id: schoolPeriodId,
    status: types.ExamSessionStatus.COMPLETED,
    result_publication_date: legacyExam.last_date_of_entry || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    school_period_name: null,
    paper_settings: []
  };
}
```

**Section sources**
- [migration-utils.ts](file://src/modules/academics/data/migration-utils.ts)

### Referential Integrity Violations
**Issue**: Foreign key constraints may be violated when loading data, especially when entities have dependencies on each other.

**Solution**:
1. Ensure proper loading order: load parent entities before child entities
2. Use the chunk processor's validation phase to check for required fields
3. Implement proper error handling and rollback mechanisms

```typescript
// The chunk processor validates referential integrity
private async validateChunk(migrationItems: MigrationItem[]): Promise<void> {
  for (const item of migrationItems) {
    // Validate required fields
    if (!item.id || !item.collectionName || !item.operation) {
      throw new Error(`Invalid migration item: missing required fields`);
    }
    
    // Validate collection exists
    if (!this.db[item.collectionName]) {
      throw new Error(`Collection '${item.collectionName}' does not exist`);
    }
    
    // Validate data schema if inserting/updating
    if ((item.operation === 'insert' || item.operation === 'update') && !item.data) {
      throw new Error(`Migration item with operation '${item.operation}' must have data`);
    }
  }
}
```

**Section sources**
- [chunk_processor.ts](file://scripts/migration/chunk_processor.ts)

### Handling Complex Migrations

#### Academic Records with Historical Grading Schemes
For academic records with historical grading schemes, the framework uses the `transformLegacyGradingToGradingScheme` method to convert legacy grading data into the current schema:

```typescript
static transformLegacyGradingToGradingScheme(
  legacyGrading: LegacyGrading
): types.AcademicsGradingSchemeType {
  const gradeMapping = [
    { grade: 'A', min_score: legacyGrading.A, max_score: 100, points: 12 },
    { grade: 'A-', min_score: legacyGrading.A_minus, max_score: legacyGrading.A - 1, points: 11 },
    // ... other grade mappings
  ];

  const levels: types.AcademicsGradingSchemeLevelType[] = gradeMapping.map((grade, index) => ({
    id: index + 1,
    scheme_id: legacyGrading.id,
    grade: grade.grade,
    min_score: grade.min_score,
    max_score: grade.max_score,
    points: grade.points,
    comment: null
  }));

  return {
    id: legacyGrading.id,
    name: `${legacyGrading.Class} - ${legacyGrading.Term} ${legacyGrading.Year}`,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    levels: levels
  };
}
```

#### Financial Data with Multiple Currency Transactions
Although not explicitly shown in the current codebase, the framework's modular design allows for handling financial data with multiple currency transactions by:

1. Creating specialized transformation utilities for financial data
2. Implementing currency conversion logic during the transformation phase
3. Using the same chunked processing approach for large financial datasets
4. Adding currency-specific validation rules

The `MigrationManager` class can be extended to handle financial data with additional validation rules for currency fields and exchange rates.

**Section sources**
- [migration-utils.ts](file://src/modules/academics/data/migration-utils.ts)
- [chunk_processor.ts](file://scripts/migration/chunk_processor.ts)

## Conclusion
The data migration framework in schoolpilot3 provides a robust and reliable solution for migrating from legacy systems to the current RxDB-based architecture. The framework follows a well-structured ETL process with comprehensive verification, ensuring data integrity throughout the migration. Key features include:

1. **Modular Design**: Each migration phase is implemented as a separate script, allowing for independent execution and testing.
2. **Configurable Parameters**: Database connections and migration behavior can be configured through environment variables and configuration files.
3. **Error Handling and Rollback**: The chunk processor provides robust error handling with retry logic and rollback capabilities.
4. **Data Integrity Verification**: Comprehensive verification ensures that data is accurately migrated with proper counts and relationships.
5. **Performance Optimization**: Chunked processing and bulk operations enable efficient migration of large datasets.

The framework is particularly well-suited for complex academic data migrations, with specialized utilities for handling examinations, subjects, exam results, and grading schemes. By following the documented patterns and best practices, organizations can successfully migrate their legacy data to the schoolpilot3 platform with confidence in data integrity and completeness.

**Updated** The framework has been streamlined to focus on the core migration phases while maintaining its robustness and reliability. The removal of non-existent migration specification documents has simplified the overall structure and improved maintainability.