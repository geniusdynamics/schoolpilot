
# Legacy System Deep-Dive: Exam Lifecycle Flowchart

**Objective**: This document outlines the complete lifecycle of an examination within the legacy Akademico VB.NET application, from creation to final reporting. The flow has been reverse-engineered from the analysis of core system forms.

---

## Exam Lifecycle Stages

```mermaid
graph TD
    A[Start: Main Menu] --> B{Exam Setup};
    B --> C[1. Create Exam];
    C --> D{Define Exam Details};
    D --> E[Name, Term, Year, Total Marks];
    D --> F[Set Last Date for Marks Entry];
    D --> G[Select Classes to be Examined];
    E & F & G --> H[Save Examination];
    H --> I{Enter Marks};
    I --> J[2. Open Marks Entry Form];
    J --> K[Select Exam, Class, Stream, Subject];
    K --> L{Load Student List};
    L --> M[Enter/Import Marks for each Student];
    M --> N[Validate Marks (e.g., against max score)];
    N --> O[Save Marks];
    O --> P{Process Results};
    P --> Q[3. Compute Results];
    Q --> R[Load Entered Marks];
    R --> S{Apply Grading Logic};
    S --> T[Calculate Totals & Averages];
    S --> U[Determine Grades (Class/Subject-based)];
    S --> V[Calculate Points & Rank];
    S --> W[Handle Split Subjects & Best-of-7];
    T & U & V & W --> X[Save Computed Results];
    X --> Y{Generate Reports};
    Y --> Z[4. View Reports];
    Z --> AA[Student Performance Profile];
    Z --> AB[Mean Score Analysis];
    Z --> AC[Grade Attainment Analysis];
    Z --> AD[Merit Lists];
    Z --> AE[Subject Performance Reports];

    subgraph "Phase 1: Setup"
        direction LR
        C
        D
        E
        F
        G
        H
    end

    subgraph "Phase 2: Data Entry"
        direction LR
        J
        K
        L
        M
        N
        O
    end

    subgraph "Phase 3: Computation"
        direction LR
        Q
        R
        S
        T
        U
        V
        W
        X
    end

    subgraph "Phase 4: Reporting"
        direction LR
        Z
        AA
        AB
        AC
        AD
        AE
    end

    classDef phase fill:#f9f,stroke:#333,stroke-width:2px;
    class A,B,I,P,Y phase;
```

---

### Key Forms & Their Roles:

1.  **`frmMainForm.vb`**:
    *   **Entry Point**: The main MDI container for the application.
    *   **Navigation**: Provides access to all other modules via a Ribbon menu (`mainRibbon`) and a navigation bar (`mainNavBar`).
    *   **Security**: Handles user login (`frmLogIn`) and applies role-based access control by enabling/disabling menu items based on user rights fetched from the `priviledges` table.
    *   **Initialization**: On load, it establishes a database connection, loads school details, subjects, and grades into memory, and performs a license check (`VerifyL.vb`).

2.  **`frmCreateExam.vb`**:
    *   **Function**: Allows users to define a new examination.
    *   **Workflow**:
        1.  User selects `Term` and `Year`.
        2.  User provides an `ExamName` or selects from a predefined list.
        3.  Sets the total marks (`txtTotal`).
        4.  Sets a deadline for marks entry (`DateTimePicker1`).
        5.  Selects the classes that will take the exam from `lstClass`.
    *   **Database Impact**:
        *   Inserts a new record into the `examinations` table.
        *   Inserts records into the `examined_classes` table for each selected class.
        *   Populates `exam_results_subjects_out_of` with the maximum score for each subject in the exam for each class/stream.

3.  **`frmEnterMarks.vb`**:
    *   **Function**: The primary interface for entering student marks for a specific exam and subject. It's the most complex form.
    *   **Workflow**:
        1.  User selects `Exam`, `Term`, `Year`, `Class`, `Stream`, and `Subject`.
        2.  The form loads the list of students matching the criteria. If results already exist, it loads them; otherwise, it presents a blank grid.
        3.  Marks can be entered manually or imported from an Excel file (`import_data`).
        4.  Handles complex UI logic for displaying columns for subjects, including split subjects.
    *   **Database Impact**:
        *   Reads from `students` and `subjects_done` to populate the grid.
        *   Saves/updates marks in the `exam_results` table.
        *   Saves/updates scores for split subjects in the `exam_split_subject_results` table.

4.  **`frmComputeResults.vb`**:
    *   **Function**: Calculates final results, grades, points, and ranks after marks have been entered.
    *   **Workflow**:
        1.  Loads grading schemes (`s_grading` or `grading` tables).
        2.  Loads all student marks for the selected exam.
        3.  Iterates through each student to calculate total marks, mean score, and mean grade.
        4.  Applies specific logic for `Best-of-7` calculations if applicable.
        5.  Converts raw scores to grades and points based on the loaded schemes.
        6.  Ranks students based on performance.
    *   **Database Impact**:
        *   Updates the `exam_results` table with computed values like `total`, `mean`, `mean_grade`, `points`, `stream_pos`, and `overall_pos`.

5.  **Reporting Forms (`frmResults.vb`, `frmMeanAnalysis.vb`, etc.)**:
    *   **Function**: Display the computed results in various formats.
    *   **Workflow**: These forms query the `exam_results` and other tables to populate data grids and generate printable reports using DevExpress XtraReports (`reporting.vb`).

