# Akademico Examination audit and gap analysis

Date: 2026-11-01
Old system source: `docs/AkademicoNotes/Akademico_Examination` (VB.NET forms) and `docs/AkademicoNotes/Akademico_Admissions` (subject/class-teacher assignment), plus the live old `schoolss` schema.
New system: `src/modules/academics` on `feat/exam-grids` (base `c9da673`).

## 1. The old model

The old examination module used one row per learner per exam and **fixed subject columns**:

```
exam_results: ADMNo, StudentName, Examination, Term, Year,
              ENG, KISW, MATH, CHEM, BIO, PHY, GEO, HIST, CRE, BST, IRE, AGRIC,
              Total, B7_Total, B7SB_TP, B7NSB_TP, SB_TP, NSB_TP, Class, STREAM
exam_results_subjects_out_of: the maximum per subject per exam/term/year/class/stream
exam_split_subject_results: one column per split paper (`FORM_3_231/1`, …)
subjects: subject, abbreviation, department, compulsory/optional
subjects_done: one Yes/No column per subject per learner
subjects_taken: one Yes/No column per subject per learner and year/stream
class_teachers: class, stream, teacher
subject_teachers: teacher, teacherID, class, stream, subject, year, term
class_subjects: class, subject, abbreviation, department, compulsory/optional
split_subjects: class, subject, split name, abbreviation, contribution, weight
grading / s_grading / class_subject_grading: grade boundaries by class, subject or class-subject
examinations: ExamName, Term, Year, Total, last_date_of_entry
```

The live schema shows 17 subject columns on `exam_results` and 20 split-paper columns on
`exam_split_subject_results`; the tables are empty in the sample database, but the forms and
indexes show how they were used.

## 2. Marks-entry workflow

`frmEnterMarks.vb` is the reference form. It has:

- exam, term, year, class, stream, subject and sort filters;
- a grid of learners down and subjects across, with split-paper columns when the class has them;
- a subject filter of `All` or one subject;
- an index-number/admission-number/name sort;
- Excel import;
- per-subject out-of marks, with the total being the sum of each subject's percentage;
- `last_date_of_entry` on the exam, checked before entry;
- a permissions method: administrators (hardcoded user ids 1 and 3) see all subjects; a teacher sees
  only subjects where `IsSubjectTeacher(subject, class, stream, term, year)` is true;
- class/stream selection; stream `All` includes the whole class.

A learner is included only when `subjects_done` marks the subject `Yes`, or all learners are shown
when the subject filter is `All`.

## 3. Assignment workflow

- `frmAssignSubjectTeachers.cs` saves a whole `class + stream + term + year` grid by deleting and
  re-inserting `subject_teachers`, one row per teacher/subject, and sends the teacher an SMS.
- `frmClassTeachers.cs` saves the same kind of grid into `class_teachers`.
- `frmSubjects.cs` and `frmClassSubjects.cs` choose the subjects and their compulsory/optional
  status per class.
- `frmSubjectsDone.vb` and `frmSubjectsTaken.vb` are the learner-subject Yes/No grids.

The important behaviour is that a subject teacher is scoped by **class + stream + subject + term +
year**, and a class teacher is scoped by **class + stream** only.

## 4. Reports and analysis

The old module had a large report set, all rebuilt from `exam_results`:

- `frmResultAnalysis`: pick one or many exams with a contribution percentage, class, stream, sort by
  total/mean marks/mean points/total points, and produce a class merit list.
- `frmResultMeanAnalysis`: mean marks/points for a class across exams.
- `frmSubjectPerformanceSpecific/General/Index`: subject mean, highest, lowest, pass rate and index;
  specific vs general, with class and stream filters.
- `frmStudentSubjectRank`, `frmSubjectRank`, `frmBestStudentSubject`: rank a learner in a subject,
  rank subjects, and find the best learner per subject.
- `frmGradesAttained` and `frmNationalGradesAttained`: grade counts/distribution.
- `frmDepartmentalSubjectAnalysis`: aggregate by department.
- `frmMeanResults`, `frmResults`, `frmComputeResults`: the computed result tables.
- `frmNationalExaminationsEntry/Performance`: national exam entry and performance.

The analysis joins on hardcoded subject columns and assumes a percentage total; it cannot express a
learning area without a column and cannot keep two exams with different schemes apart cleanly.

## 5. New-system mapping

| Old concept | New equivalent | State |
|---|---|---|
| `examinations` | `assessment` with `academic_period_id`, `kind`, `scheme_slot`, `max_score`, `status` | present |
| `exam_results` subject column | `mark` (`assessment_id`, `enrolment_id`, `learning_area_id`, `score`, `status_code`) | present |
| `exam_results_subjects_out_of` | `assessment.max_score` and the assessment scheme's slot maximum | present |
| `subjects_done` | `teaching_group_member` for the learner's subject group | present |
| `subjects_taken` | `teaching_group_member` plus `enrolment` in the year | present |
| `class_subjects` | `teaching_group` per class group + learning area | present |
| `subject_teachers` | `teaching_assignment` and `teaching_group.teacher_ids` | present |
| `class_teachers` | `class_group.homeroom_teacher_ids` | present |
| `split_subjects` | `component` and `assessment.component_ids` / `mark.component_id` | present, no split-paper entry UI yet |
| `grading` / `s_grading` / `class_subject_grading` | `grading_scale` and `assessment_scheme` | present |
| result analysis | `result`, `period_result`, `useResults` and the grading/aggregation engines | present, now analysed in a canonical tab |
| national exams | `assessment` kind `national` and the national results pages | partial |

## 6. What this pass adds

### 6.1 Whole-class marks grid

`ClassMarksEntryPage` (Marks Entry → Class grid) shows:

- filters for period, level, class/stream, exam slot and subject;
- learners down and the class's subjects across;
- one column per learning area, with the assessment that belongs to the selected exam slot;
- a per-cell state: valid, missing, invalid, not registered, read-only;
- save-all writes the canonical `mark` rows, creating or updating each cell;
- membership-aware cells: a learner not in the subject's teaching group is not editable;
- scope-aware columns and rows:
  - administrator/head/academic master: every class and subject;
  - class teacher: every subject in the homeroom class, read-only;
  - subject teacher: only their assigned teaching groups, writable;
- level-only shows all streams at that level; class/stream narrows to one.

### 6.2 Single-student grid

The same page has a **Single student** mode: choose the period, class and learner, and every subject
the class offers appears as a column. Until a learner is chosen the grid stays closed and says so,
so the view never looks like the class grid mislabelled. The same membership, scope and save rules
apply, and the summary counts only the learner on screen.

### 6.3 Canonical exam analysis

The legacy `ExamAnalysisContent` tab is replaced by `CanonicalExamAnalysisContent`, which reads
`useResults`:

- subject table: sat, mean %, highest, lowest, pass rate and the grades attained in the subject;
- the aggregate is graded on the scale the class's assessments agree on, so the merit list carries a
  grade and the distribution has bands instead of a single "No grade" bucket;
- grade distribution from the aggregate grades;
- merit order by the engine's aggregate, with incomplete learners left unranked rather than last;
- period and class/stream filters, CSV and print.

The arithmetic is in `results/analysis.ts` and is tested directly.

### 6.4 Scope language

`resolveTeachingScope` now recognises `academic_master`, `academic_master_teacher`,
`director_of_studies`, `dos` and `deputy_principal` as whole-institution academic roles, alongside
administrator, head teacher and principal.

### 6.5 Bulk curriculum assignments

The old `frmAssignSubjectTeachers` and `frmSubjectsTaken` grids saved a whole class at once. The
Curriculum Allocations hub (`/academics/allocations`) now has the same two views:

- **Teacher grid**: one row per subject of the chosen class and year, with a subject-teacher picker.
  Saving creates, moves or clears the `teaching_assignment` row the marks scope reads; clearing a
  teacher removes the assignment.
- **Subject matrix**: learners down, the class's subjects across, a tick per registration. A tick
  creates a `teaching_group_member`, a cleared tick removes it, and the marks grid reads exactly
  those memberships to decide which cells a learner may be marked in.

### 6.6 Class and stream labels

A stream is named `A` or `B`, so the same name repeats in every level. Every class picker - the
marks grids, the analysis page, the teacher grid and the subject matrix - now shows the level too
(`Grade 7 · A`), which is what makes a class-plus-stream filter readable.

## 7. Remaining gaps

- **Split-paper entry**: `component` exists, but the grid does not yet show component columns per
  learning area. The assessment scheme's component policy already computes a combined score; the
  entry UI is the next step.
- **A class teacher who also teaches a subject** reads their class and writes nothing, because the
  class-teacher role is resolved before the teaching assignments. The two scopes are not combined
  yet; the permission matrix gives `class_teacher` `mark.read` only, so the fix is a role decision
  (add `mark.write` and merge the scopes) rather than a page change.
- **Rank reports**: subject rank, best learner per subject and departmental analysis are not yet
  separate pages; the merit list and subject table cover the core.
- **National examination entry/performance** remains its own partial area.
- **Stream-level analysis across a whole level**: the analysis page selects one class/stream at a
  time; the marks grid can show a whole level.

## 8. Verification

- `classGrid.test.ts`: administrator sees all subjects/learners; subject teacher is narrowed to the
  assigned group; class teacher sees all subjects read-only; subject filter and exam slot work.
- `ClassMarksEntryPage.test.tsx`: class view, single-student view (a learner must be chosen before
  the grid appears) and save action.
- `useClassMarkEntry.test.tsx`: a typed score creates the exact canonical mark row.
- `analysis.test.ts`: subject mean/pass rate from complete results only, grade totals and merit rank.
- `aggregation.test.ts`: the aggregate is graded on the scale the class's assessments share, the
  programme's only scale, or none when the data cannot name one.
- `BulkSubjectAssignmentsPage.test.tsx`: a teacher assignment and a learner's subject registration
  are written through the repository, clearing a teacher removes the assignment, and the class
  picker names the level.
- `demoSchool.test.ts`: the demo's teaching groups still cover every learner and assessment.
- PRD gate, typecheck, ESLint, build and i18n check run before the PR.
