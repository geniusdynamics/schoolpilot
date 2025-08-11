
# Legacy System Deep-Dive: Database ERD & Schema Notes

**Objective**: This document provides a detailed Entity-Relationship Diagram (ERD) and field notes for the key tables in the Akademico MySQL database. The schema has been reverse-engineered from connection strings in `app.config` and SQL queries found throughout the VB.NET source code.

---

## Database Connection Details

-   **Host**: `localhost` (configurable in `My.Settings`)
-   **Port**: `7474`
-   **Database Name**: `schoolss`
-   **User**: `root`
-   **Authentication**: Password-based (default: `ADMIN1234`)

---

## Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    students {
        INT admin_no PK "Admission Number"
        VARCHAR student_name
        VARCHAR class
        VARCHAR stream
        VARCHAR indexno "KCPE Index Number"
        BOOLEAN IsStudent "Is Currently a Student"
    }

    examinations {
        INT id PK
        VARCHAR Term
        VARCHAR ExamName
        INT TotalMarks
        VARCHAR Year
        DATE last_date_of_entry
    }

    examined_classes {
        INT id PK
        VARCHAR examination
        VARCHAR term
        VARCHAR year
        VARCHAR class
    }

    subjects {
        INT id PK
        VARCHAR subject_name
        VARCHAR subject_code
        VARCHAR department
    }

    split_subjects {
        INT id PK
        VARCHAR subject "Parent Subject Name"
        VARCHAR abbreviation "Split Subject Abbreviation (e.g., P1, P2)"
        INT contribution "Weight in %"
        VARCHAR class
    }

    subjects_done {
        INT id PK
        INT admno FK "FK to students.admin_no"
        VARCHAR subject_name "e.g., English, Maths"
        VARCHAR Yes_No "'Yes' if taken"
    }

    exam_results {
        INT id PK
        INT admno FK "FK to students.admin_no"
        VARCHAR Examination
        VARCHAR Term
        VARCHAR Year
        VARCHAR Class
        VARCHAR Stream
        FLOAT ENG
        FLOAT KIS
        FLOAT MAT
        -- ... other subject columns ...
        FLOAT total
        FLOAT mean
        VARCHAR mean_grade
        INT points
        INT stream_pos
        INT overall_pos
    }

    exam_split_subject_results {
        INT id PK
        INT admno FK "FK to students.admin_no"
        VARCHAR Examination
        VARCHAR Term
        VARCHAR Year
        VARCHAR Class
        VARCHAR Stream
        FLOAT BIO_P1
        FLOAT BIO_P2
        -- ... other split subject columns ...
    }

    grading {
        INT id PK
        VARCHAR Class
        VARCHAR Term
        VARCHAR Year
        INT A, A_minus, B_plus, ..., E "Score thresholds"
    }

    s_grading {
        INT id PK
        VARCHAR Class
        VARCHAR Subject
        VARCHAR Term
        VARCHAR Year
        INT A, A_minus, B_plus, ..., E "Score thresholds for a specific subject"
    }

    priviledges {
        INT id PK
        VARCHAR user
        VARCHAR domain "e.g., Exam"
        TEXT rights "Comma-separated list of accessible menu items"
    }

    students ||--o{ subjects_done : takes
    students ||--o{ exam_results : has
    students ||--o{ exam_split_subject_results : has
    examinations ||--o{ examined_classes : for
    examinations ||--o{ exam_results : contains
    subjects ||--o{ split_subjects : can_be_split_into
    subjects ||--o{ s_grading : has_grading_scheme
    grading ||--o{ examined_classes : applies_to

```

---

## Table & Field Notes

1.  **`students`**
    *   **Purpose**: Stores core student information.
    *   `admin_no` (PK): The unique student identifier, used as a foreign key in many other tables.
    *   `IsStudent`: A flag to distinguish active students from alumni.

2.  **`examinations`**
    *   **Purpose**: Defines an instance of an exam.
    *   The combination of `Term`, `ExamName`, and `Year` acts as a composite unique key.
    *   `last_date_of_entry`: A critical field used to lock marks entry after the specified date.

3.  **`examined_classes`**
    *   **Purpose**: A link table that specifies which classes are taking a particular exam.

4.  **`subjects`** & **`split_subjects`**
    *   **Purpose**: Defines the subjects offered and how they are broken down (e.g., Biology Paper 1, Paper 2).
    *   `split_subjects.contribution`: Stores the percentage weight of each paper, which is used to calculate the final subject score.

5.  **`subjects_done`**
    *   **Purpose**: Tracks which subjects each student has registered for. This is crucial for filtering student lists during marks entry.
    *   The table is structured with subject names as columns and a 'Yes'/'No' value.

6.  **`exam_results`**
    *   **Purpose**: The main transaction table storing the final, aggregated score for each subject for each student in an exam.
    *   This table is wide, with a column for every subject abbreviation (e.g., `ENG`, `KIS`, `MAT`).
    *   Computed fields (`total`, `mean`, `points`, etc.) are populated by the `frmComputeResults` form.

7.  **`exam_split_subject_results`**
    *   **Purpose**: Stores the raw scores for individual papers of a split subject.
    *   Like `exam_results`, this table is also wide, with columns for each split paper (e.g., `BIO_P1`, `CHEM_P2`).

8.  **`grading`** & **`s_grading`**
    *   **Purpose**: Define the grading schemes.
    *   `grading`: Stores the general, class-level grading scheme.
    *   `s_grading`: Stores subject-specific grading schemes, which override the general scheme if present.

9.  **`priviledges`**
    *   **Purpose**: Manages role-based access control.
    *   `rights`: Contains a comma-separated string of menu item captions that a user is allowed to access.

