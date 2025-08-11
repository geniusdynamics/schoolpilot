# Migration Plan: SP3 to EduGen OS

## Mapping Legacy Tables to New Schema

### Legacy to New Schema Mapping:

- **`students` table**: Map to `studentSchema` (Students module)
  - `admin_no` → `admissionNo`
  - `student_name` → `firstName`, `lastName`
  - `class`, `stream` → `currentClassId`, `currentClassStreamName`

- **`examinations` table**: Map to `examSessionSchema` (Academics module)
  - `Term`, `Year` → `school_period_id`
  - `ExamName` → `name`
  
- **`exam_results` table**: Map to `studentExamResultSchema` (Academics module)
  - Subject columns (`ENG`, `KIS`, etc.) → `StudentPaperMark rows`
  - `total`, `mean_grade` → `total_marks`, `mean_grade`

- **`split_subjects` table**: Map to `subjectPaperSchema` (Academics module)
  - `subject`, `abbreviation` → `name`
  - `contribution` → `weight_percentage`

## Transformation Rules

- **`Term` + `Year` → `school_period_id`**
- **`split_subjects` to `StudentPaperMark rows`**: Each split subject's details are transformed into individual rows with properties like `score`, `marks_out_of`.

## Migration Pipeline Outline

- **ETL Scripts**:
  - **Extract**: Connect to existing database, and extract data using SQL queries.
  - **Transform**: Apply mapping and transformation rules, e.g., combine `Term` + `Year`, convert split_subjects to individual marks.
  - **Load**: Insert into EduGen OS Schema using RxDB collections.

- **Chunk Processing**: Migrate in manageable data chunks to ensure efficiency and rollback capability.

- **Verification Queries**: Conduct verification by querying both databases to compare sample outputs.

## Archival Strategy

- Non-migrated historical artefacts should be archived with full metadata, possibly in a separate archival database or cloud storage service with search capabilities.

