# Phase 4: Data Schema Mapping & Migration Strategy

**Objective**: Map legacy database tables to the new SP3 academics schema.ts entities and define transformation rules for seamless data migration.

---

## 4.1 Legacy Table to New Schema Mapping

### Core Academic Entities

#### **Legacy `examinations` → New `examSessionSchema`**
```
Legacy Field               → New Field              | Transformation Rule
-------------------------------------------------------------------------------
Term + Year                → school_period_id       | Lookup/create school_period record
ExamName                   → name                    | Direct mapping
TotalMarks                 → N/A                     | Calculated from sum of paper_settings
last_date_of_entry         → result_publication_date| Direct mapping
id                         → id (convert to string) | Convert INT to string UUID
```

#### **Legacy `subjects` → New `subjectSchema`**
```
Legacy Field               → New Field              | Transformation Rule
-------------------------------------------------------------------------------
id                         → id                     | Direct mapping
subject_name               → name                    | Direct mapping
subject_code               → subject_code           | Direct mapping
department                 → department_id          | Lookup department table
N/A                        → abbreviation           | Extract from subject_code or generate
N/A                        → is_compulsory          | Default false, set based on business rules
N/A                        → grouping               | Assign based on subject type
```

#### **Legacy `split_subjects` → New `subjectPaperSchema`**
```
Legacy Field               → New Field              | Transformation Rule
-------------------------------------------------------------------------------
id                         → id                     | Direct mapping
subject                    → subject_id             | Lookup from subjects table
abbreviation               → name                    | Direct mapping (e.g., "P1", "P2")
contribution               → weight_percentage       | Direct mapping (e.g., 50% → 50)
class                      → N/A                     | Not needed in new schema
```

#### **Legacy `exam_results` → New `studentExamResultSchema`**
```
Legacy Field               → New Field              | Transformation Rule
-------------------------------------------------------------------------------
id (generate UUID)         → id                     | Generate new UUID
admno                      → student_id             | Lookup student by admin_no
Examination+Term+Year      → exam_session_id        | Lookup exam_session record
total                      → total_marks            | Direct mapping
mean_grade                 → mean_grade             | Direct mapping
stream_pos                 → stream_rank            | Direct mapping
overall_pos                → class_rank             | Direct mapping
Class                      → class_name             | Direct mapping
Stream                     → stream_name            | Direct mapping
```

#### **Legacy Subject Columns (ENG, KIS, MAT, etc.) → New `studentPaperMarkProperties`**
```
Each subject column in exam_results becomes multiple StudentPaperMark records:

For each subject column (ENG, KIS, MAT, etc.):
- Create StudentPaperMark record(s) for each associated paper
- If subject has split_subjects, create one record per paper
- If no split_subjects, create single record

Legacy Field               → New Field              | Transformation Rule
-------------------------------------------------------------------------------
ENG/KIS/MAT/etc.          → score                   | Direct mapping of mark value
N/A (calculated)          → marks_out_of            | From examPaperSetting.marks_out_of
N/A (lookup)              → subject_paper_name      | From subject_papers.name
N/A (lookup)              → subject_name            | From subjects.name
N/A (generate UUID)       → id                      | Generate new UUID
N/A (parent result)       → student_exam_result_id  | Link to parent StudentExamResult
```

#### **Legacy `exam_split_subject_results` → New `studentPaperMarkProperties`**
```
Legacy Field               → New Field              | Transformation Rule
-------------------------------------------------------------------------------
BIO_P1, BIO_P2, etc.      → score                   | Direct mapping
admno                      → student_exam_result_id | Lookup parent StudentExamResult
Examination+Term+Year      → paper_setting_id       | Lookup examPaperSetting
```

### Supporting Entities

#### **Legacy `grading` → New `gradingSchemeSchema`**
```
Legacy Field               → New Field              | Transformation Rule
-------------------------------------------------------------------------------
Class+Term+Year           → name                    | Combine into descriptive name
A, A_minus, B_plus, etc.  → levels array           | Transform to GradingSchemeLevels
id                        → id                      | Direct mapping
```

#### **Legacy `s_grading` → New `gradingSchemeSchema` (Subject-specific)**
```
Legacy Field               → New Field              | Transformation Rule
-------------------------------------------------------------------------------
Subject+Class+Term+Year   → name                    | Combine into descriptive name
A, A_minus, B_plus, etc.  → levels array           | Transform to GradingSchemeLevels
id                        → id                      | Direct mapping
```

---

## 4.2 Transformation Rules

### **Rule TR-01: Term + Year → school_period_id**
```sql
-- Create or lookup school_period record
INSERT INTO school_periods (academic_year_id, period_definition_id, start_date, end_date)
SELECT 
  ay.id as academic_year_id,
  pd.id as period_definition_id,
  -- Calculate dates based on Term and Year
WHERE NOT EXISTS (...)
```

### **Rule TR-02: Split Subject Marks → StudentPaperMark Rows**
```typescript
// For each exam_result record with subject marks
for (const subjectColumn of ['ENG', 'KIS', 'MAT', 'BIO', 'CHEM', ...]) {
  const subjectPapers = await getSubjectPapers(subjectColumn);
  
  if (subjectPapers.length > 1) {
    // Split subject - get individual paper marks from exam_split_subject_results
    const splitMarks = await getSplitSubjectMarks(admno, examination, term, year, subjectColumn);
    for (const paper of subjectPapers) {
      createStudentPaperMark({
        student_exam_result_id,
        paper_setting_id: paper.exam_paper_setting_id,
        score: splitMarks[paper.abbreviation] || null,
        subject_paper_name: paper.name,
        subject_name: subjectColumn,
        marks_out_of: paper.marks_out_of
      });
    }
  } else {
    // Single paper subject
    createStudentPaperMark({
      student_exam_result_id,
      paper_setting_id: subjectPapers[0].exam_paper_setting_id,
      score: examResult[subjectColumn],
      subject_paper_name: subjectPapers[0].name,
      subject_name: subjectColumn,
      marks_out_of: subjectPapers[0].marks_out_of
    });
  }
}
```

### **Rule TR-03: Wide Table → Normalized Marks**
```sql
-- Transform wide exam_results table to normalized student_paper_marks
INSERT INTO student_paper_marks (id, student_exam_result_id, paper_setting_id, score)
SELECT 
  NEWID() as id,
  ser.id as student_exam_result_id,
  eps.id as paper_setting_id,
  CASE eps.subject_paper_name
    WHEN 'English' THEN er.ENG
    WHEN 'Kiswahili' THEN er.KIS
    WHEN 'Mathematics' THEN er.MAT
    -- ... for all subjects
  END as score
FROM exam_results er
JOIN student_exam_results ser ON ser.student_id = (SELECT id FROM students WHERE admin_no = er.admno)
JOIN exam_paper_settings eps ON eps.exam_session_id = ser.exam_session_id
```

---

## 4.3 Migration Pipeline Outline

### **Phase 4A: ETL Scripts Development**

#### **Extract Scripts**
- `extract_legacy_examinations.sql` - Extract examination records
- `extract_legacy_subjects.sql` - Extract subjects and split_subjects
- `extract_legacy_exam_results.sql` - Extract exam results (wide table)
- `extract_legacy_split_results.sql` - Extract split subject results
- `extract_legacy_grading.sql` - Extract grading schemes

#### **Transform Scripts**
- `transform_school_periods.ts` - Create school_period records from Term+Year
- `transform_exam_sessions.ts` - Transform examinations to exam_sessions
- `transform_subjects.ts` - Transform subjects and create subject_papers
- `transform_exam_results.ts` - Create student_exam_results and student_paper_marks
- `transform_grading_schemes.ts` - Transform grading tables to grading_schemes

#### **Load Scripts**
- `load_academic_entities.ts` - Bulk insert into RxDB collections
- `verify_data_integrity.ts` - Run validation queries

### **Phase 4B: ID Mapping Strategy**

#### **Legacy ID → New ID Mapping Tables**
```sql
CREATE TABLE migration_id_maps (
  legacy_table VARCHAR(50),
  legacy_id VARCHAR(50),
  new_collection VARCHAR(50),
  new_id VARCHAR(100),
  created_at DATETIME
);
```

#### **UUID Generation Strategy**
```typescript
// Deterministic UUID generation for consistency
const generateMigrationUUID = (legacyTable: string, legacyId: string): string => {
  return uuidv5(`${legacyTable}:${legacyId}`, MIGRATION_NAMESPACE);
};
```

### **Phase 4C: Chunk Processing**

#### **Chunking Strategy**
- Process 1000 students per chunk for exam results
- Process by academic year to maintain referential integrity
- Implement rollback capability for each chunk

#### **Processing Order**
1. **Reference Data**: subjects, split_subjects, grading schemes
2. **School Periods**: Create from unique Term+Year combinations
3. **Exam Sessions**: Transform examinations table
4. **Subject Papers**: Create from subjects and split_subjects
5. **Exam Paper Settings**: Link papers to exam sessions
6. **Student Results**: Transform exam_results (main table)
7. **Paper Marks**: Create individual mark records

### **Phase 4D: Verification Queries**

#### **Data Integrity Checks**
```sql
-- Verify all legacy exam results have corresponding new records
SELECT COUNT(*) as legacy_count FROM exam_results WHERE Year >= 2020;
SELECT COUNT(*) as new_count FROM student_exam_results ser
JOIN exam_sessions es ON es.id = ser.exam_session_id
JOIN school_periods sp ON sp.id = es.school_period_id
WHERE sp.start_date >= '2020-01-01';

-- Verify mark totals match
SELECT 
  legacy.admno,
  legacy.total as legacy_total,
  SUM(new_marks.score) as new_total
FROM exam_results legacy
JOIN students s ON s.admin_no = legacy.admno
JOIN student_exam_results ser ON ser.student_id = s.id
JOIN student_paper_marks new_marks ON new_marks.student_exam_result_id = ser.id
GROUP BY legacy.admno, legacy.total
HAVING ABS(legacy.total - SUM(new_marks.score)) > 0.01;
```

---

## 4.4 Archival Strategy for Non-migrated Historical Artefacts

### **Archival Categories**

#### **Category A: Complete Archive (Pre-2020 Data)**
- **Scope**: All exam records before 2020
- **Storage**: Read-only MySQL archive database
- **Access**: Via legacy reporting interface
- **Retention**: 10 years

#### **Category B: Metadata Archive (System Logs)**
- **Scope**: User access logs, system audit trails
- **Storage**: Compressed JSON files in cloud storage
- **Access**: Administrative access only
- **Retention**: 7 years

#### **Category C: Deprecated Features Archive**
- **Scope**: Legacy privilege system, old communication templates
- **Storage**: JSON export files with full schema documentation
- **Access**: Development team for reference
- **Retention**: Indefinite (reference purposes)

### **Archive Implementation**

#### **Archive Database Structure**
```sql
CREATE DATABASE schoolpilot_archive;

-- Mirror legacy tables with archive metadata
CREATE TABLE archive_exam_results (
  -- All original columns
  archived_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  archive_reason VARCHAR(255),
  original_id INT
);
```

#### **Archive Access Layer**
```typescript
// Read-only service for archived data
export class ArchiveDataService {
  async getLegacyExamResults(studentAdminNo: string, year: number) {
    // Query archive database
  }
  
  async generateLegacyReport(parameters: LegacyReportParams) {
    // Generate reports from archived data
  }
}
```

#### **Archive Documentation**
- **Data Dictionary**: Complete mapping of archived fields
- **Business Rules**: Context for why data was structured as-is
- **Access Procedures**: How to retrieve archived information
- **Migration Log**: What was migrated vs archived

---

## Implementation Dependencies

This phase depends on:
- **Phase 1**: ERD analysis (completed)
- **Phase 2**: Schema knowledge (completed)  
- **Phase 3**: Business rule validation (assumed completed)

## Next Steps

After Phase 4 completion:
- **Phase 5**: Migration script implementation
- **Phase 6**: Data validation and testing
- **Phase 7**: Production migration execution
- **Phase 8**: Archive system deployment
