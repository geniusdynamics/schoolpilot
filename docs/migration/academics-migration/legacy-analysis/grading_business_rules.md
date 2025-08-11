
# Legacy System Deep-Dive: Grading & Business Rules Dossier

**Objective**: This document details the complex grading algorithms, business rules, and logic reverse-engineered from the Akademico VB.NET application, primarily from `frmComputeResults.vb`, `frmEnterMarks.vb`, and `publicSubsNFunctions.vb`.

---

## 1. Core Grading & Point Calculation

-   **Grading Schemes**: The system supports two types of grading schemes:
    1.  **Class-Based Grading**: A general grading scale applied to all subjects in a class. Stored in the `grading` table.
    2.  **Subject-Based Grading**: A specific grading scale for a particular subject within a class. Stored in the `s_grading` table. **This scheme overrides the class-based scheme if it exists for a subject.**

-   **Grade to Point Mapping**: After a grade is determined, it is converted into points based on a fixed scale (hardcoded in `frmComputeResults.vb`):

| Grade | Points |
| :---- | :----- |
| A     | 12     |
| A-    | 11     |
| B+    | 10     |
| B     | 9      |
| B-    | 8      |
| C+    | 7      |
| C     | 6      |
| C-    | 5      |
| D+    | 4      |
| D     | 3      |
| D-    | 2      |
| E     | 1      |
| Y/X   | 0      | 


## 2. Split Subjects & Contribution Logic

-   **Definition**: A subject can be split into multiple papers (e.g., Biology P1, Biology P2). This is defined in the `split_subjects` table.
-   **Contribution**: Each paper contributes a specific percentage to the final subject score. This is stored in `split_subjects.contribution`.
-   **Calculation**:
    1.  Raw scores for each paper are entered in `frmEnterMarks` and stored in `exam_split_subject_results`.
    2.  The final subject score is calculated as a weighted average:
        `Final Score = (Score_P1 * Contrib_P1) + (Score_P2 * Contrib_P2) + ...`
    3.  The calculated `Final Score` is then stored in the corresponding subject column in the `exam_results` table and used for grading.

## 3. Best-of-7 (or Best-of-X) Subject Logic

-   **Concept**: In some final calculations (especially for ranking), the system considers only the best-performing subjects of a student.
-   **Implementation**:
    1.  The system categorizes subjects into groups (Sciences, Humanities, Technicals). These groups are hardcoded constants in `publicSubsNFunctions.vb`.
    2.  The logic in `frmComputeResults.vb` (`getHighestMark` function) selects a predefined number of subjects from each group to contribute to the final point total.
    3.  **Rule Example**: The system might be configured to take the best 2 sciences, the best humanities, and the best 4 other subjects.
    4.  The total points (`TP`) and mean points (`MP`) are then calculated based on this subset of subjects, which is critical for the final ranking.

## 4. Key Business Rules & System Logic

-   **Marks Entry Deadline**: The `examinations.last_date_of_entry` field is strictly enforced. The `IsEditableResults` function in `frmEnterMarks` checks this date, and if the current date has passed the deadline, the marks entry grid is disabled.

-   **User Roles & Permissions**: The system has a simple but effective RBAC.
    -   An `Admin1234` user has full access.
    -   For other users, the `getMenus` function is called upon login to fetch a list of permitted form/button captions from the `priviledges` table. The UI is then dynamically configured to disable elements not in this list.

-   **Data Validation**: Input validation is performed in `frmEnterMarks.isvalid()`:
    -   Ensures marks are numeric.
    -   Checks that marks do not exceed the maximum score defined for the subject (fetched via the `markOutOf` function).

-   **Automatic Backup**: The application has a built-in database backup mechanism (`frmMainForm_FormClosing` event).
    -   It checks the date of the last backup in the `app_databases` folder within `ApplicationData`.
    -   It can be configured via the `db_back_up` table to run daily, weekly, etc.

-   **Reporting**: The `reporting.vb` module uses DevExpress XtraReports to generate all printable documents. It can generate reports from a SQL query, a `DataTable`, or a `DataGridView`, providing flexibility.

