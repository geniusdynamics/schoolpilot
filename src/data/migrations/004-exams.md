# M4 — the exam sessions, marks and results

Migration M4 turns the legacy subjects, papers, exam sessions and results into canonical
**learning_area**, **component**, **assessment**, **mark** and **period_result** rows. It is the
migration the school's marks outgrow `exam_sessions.paper_settings` and
`student_exam_results.marks` in: after M4 a score is a mark on an enrolment, in a learning area,
under an assessment the school can close and publish.

- The migration: `004-exams.ts` (the `Migration` object, the writer, the refusals, the acceptance).
- The rules: `004-exam-rules.ts` (session kind and status, a subject's kind, a paper's code, a
  score column).
- The source: `004-legacy-exams.ts` (the legacy rows and the canonical rows they resolve through).
- The plan: `004-exam-plan.ts` (the legacy rows become canonical rows).
- The verification: `004-exam-verification.ts` (the counts, every row, every mark, every learner).
- The fixture: `004-legacy-fixture.ts` (the legacy database the tests run against).
- The tests: `004-exams.test.ts`.

## The legacy rows it reads

| Legacy table | Canonical entity | Notes |
| --- | --- | --- |
| `subjects` | `learning_area` | The code, the name, the abbreviation and the grouping. |
| `subject_papers` | `component` | One paper of one subject. |
| `exam_sessions` (+ `paper_settings`) | `assessment` | One assessment per session and learning area. |
| `student_exam_results` | `period_result` | The session totals, the mean grade, the class rank and the comment. |
| `student_exam_results.marks[]` | `mark` | The older shape: the marks the result row embeds. |
| `student_paper_marks` | `mark` | The shape the legacy app's horizontal view computes from. |

The legacy numeric ids are stored as doubles in TEXT columns (`1.0`), so every key is normalised
with `legacyKey` from M1. A session's `school_period_id` of `3.0` resolves to the academic period
M1 wrote for school period `3`; a paper's `subject_id` of `1.0` resolves to the learning area
subject `1` became.

## One assessment per session and learning area

Spec 02 §8 says an assessment replaces `exam_sessions` and its nested `paper_settings`. The
canonical mark names **one** learning area and **one** optional component, so the migration splits
a session into one assessment per learning area its paper settings configure:

- `academic_period_id` — the period the legacy `school_period_id` became through M1's id map.
- `kind` — from the session name (`End of Term…` is `end_term`, `Mid Term…` is `mid_term`, `CAT`
  is `cat`, `Mock` is `mock`, `Opener` is `opener`, `National`/`KCSE`/`KNEC` is `national`, and so
  on). A name the patterns do not recognise is `end_term`, and the assumption is recorded.
- `name` — `<session name> — <learning area name>`.
- `status` — `Planning` is `draft`, `Marks Entry Open` is `open`, `Closed` is `closed`,
  `Published` and `Archived` are `published`. A status the map does not name is `closed` (the
  marks exist; no claim is made that they were released), and the assumption is recorded.
- `learning_area_ids` — the one learning area.
- `component_ids` — the papers of that learning area the session configures, in paper order.
- `max_score` — the sum of those papers' `marks_out_of`. The plan omits it when a paper states
  none, rather than inventing a total.
- `class_group_ids`, `level_ids` — the class groups and levels of the enrolments its marks sit
  in. The legacy session names no class, so the marks are the only statement of its scope; an
  assessment no learner sat is written with both empty.
- `grading_scale_id` — never set: the migration writes no grading scale.
- `date_window` — never set: the legacy session carries no dates.
- `scheme_slot` — never set: the legacy session carries no weight bucket.

A session whose school period M1 did not map writes no assessment, and the plan reports **one
unmappable row per learning area the session configured**, so the count says exactly how many
assessments were lost. A session that configures no paper is reported as a warning and writes
nothing.

## The learning areas and the components

A learning area is a subject:

| Column | Rule |
| --- | --- |
| `code` | `subject_code`, or the abbreviation when the row carries no code. A subject with neither is reported. |
| `name` | The subject name. A name longer than 200 characters is reported. |
| `short_name` | The abbreviation. |
| `group` | The legacy grouping (`Group 1 (Compulsory)`, `Group 2 (Sciences)`…). |
| `kind` | `core` when the row is compulsory, `optional` otherwise. |
| `level_ids`, `pathway_ids` | Empty: the legacy subject is scoped to neither. |

The canonical unique key is `(programme_id, code)`, so a second subject with a code the first
already holds is **reported**, never merged: `101` names one learning area, not two.

A component is a paper: `learning_area_id` from its subject, `code` as `P<n>` (its order within
the subject, in legacy id order), the paper's name, and `kind` as `paper`. The paper's maximum
and weight are the **session's**, not the paper's — the same paper is marked out of 100 in one
session and 50 in another — so neither is written on the component. A paper whose subject did not
become a learning area, whose name is empty, or whose subject does not exist is reported.

## The marks

A mark is one learner's score on one paper of one assessment:

| Column | Rule |
| --- | --- |
| `enrolment_id` | The enrolment M3 wrote for the result's `student_id`, through M3's id map. |
| `assessment_id` | The assessment of the session and the learning area the paper belongs to. |
| `learning_area_id`, `component_id` | The paper's component and its learning area. |
| `score` | The legacy score as it was entered, when it is a decimal. |
| `rubric_level` | A value that is neither a decimal nor a status (`A`). |
| `status_code` | `present`, `absent`, `exempt`, `incomplete` or `malpractice`. |
| `version` | 1: a migrated mark has never been edited. |

**One mark per (assessment, enrolment, learning area, component).** The plan keys every mark that
way, and the canonical partial unique index is the database's own guard. Two legacy rows that hold
the same learner, session, subject and paper become one mark: the first is written, the second is
reported with the legacy row that already holds it. The mark table is read **before** the result
rows' embedded `marks` arrays, so the table wins when both name the same paper; the embedded copy
is reported.

### What a score column can hold

| Value | Mark | Reported |
| --- | --- | --- |
| `85`, `70.50` | `score` = the text as entered, `status_code` = `present`. | — |
| `ABS`, `EXM`, `INC` (and their words) | no score, `status_code` = `absent` / `exempt` / `incomplete`. | — |
| `-`, `--`, `—`, `N/A`, `nil` | no score, `status_code` = `incomplete`. | warning `mark_without_score` |
| anything else (`A`, `B+`, a remark) | `rubric_level` = the text, `status_code` = `present`. | warning `mark_score_not_numeric` |
| empty | no score, `status_code` = `incomplete`. | warning `mark_without_score` |

A letter in a numeric column is **not graded**: the migration does not invent a scale, does not
derive a band, and leaves the raw value as the mark's level. `A` is not read as `absent`; `P` is
not read as `present` — a single letter is a grade in many scales.

## The results

`student_exam_results` carries an **overall** total and mean grade for one sitting, not a
per-learning-area score. Spec 02 §8 gives `period_result` a place for exactly that, so:

| Column | Rule |
| --- | --- |
| `total` | `total_marks`. |
| `mean_grade` | `mean_grade` (a grade longer than 50 characters is reported and not carried). |
| `position` | `class_rank`, when it is a whole number of at least 1. |
| `class_teacher_comment` | `overall_comment`, the only comment the legacy result holds. |
| `stream_rank` | **Not carried**: `period_result` holds one position, and the migration kept the class rank. The assumption is on the record. |

**No `result` row is written.** A canonical `result` is the engine's computed value for one
learner, period and learning area; the legacy data holds no such value, and computing one is the
engine's job, not the migration's. The assumption is recorded, and the counts check that the
`result` table is still empty.

`period_result` is unique per enrolment and period, so two sessions in one period cannot both
write a learner's totals: the first result is written, the second is reported with the row that
holds the period. A result whose learner has no enrolment, whose session does not exist, or whose
session's period M1 did not map is reported.

## The id map

M4 appends to M1's `_legacy_id_map`:

| `legacy_table` | `legacy_id` | `canonical_entity` | `canonical_id` |
| --- | --- | --- | --- |
| `subjects` | the subject id | `learning_area` | the learning area id |
| `subject_papers` | the paper id | `component` | the component id |
| `student_paper_marks` | the mark id | `mark` | the mark id |
| `student_exam_results` | the result id | `period_result` | the period result id |
| `student_exam_results` | a mark the result row embeds | `mark` | the mark id |

The id map names one canonical row per legacy row, and its unique index is on `canonical_id`.
**Assessments are not in the map**: one session becomes several assessments, and the map's key
cannot name more than one. A nested mark is mapped under the table that carries it, with the
mark's own id — the same rule M3 applies to a guardian a student row embeds.

## The report and the verification

`readExamMigrationReport(reader)` reads the database back and re-derives the report from the
legacy rows and the canonical tables, not from the plan. The counts are:

| Entity | Before | After | Unmapped |
| --- | --- | --- | --- |
| `learning_area` | the legacy subjects | the learning area map rows | the subjects that could not be named |
| `component` | the legacy papers | the component map rows | the papers whose subject or name is missing |
| `assessment` | the (session, learning area) pairs the settings imply | the assessment rows | the pairs of a session with no mapped period |
| `mark` | the legacy mark rows (table and embedded) | the mark map rows | the marks that could not attach |
| `period_result` | the legacy results | the period result map rows | the results that could not be placed |
| `result` | 0 | the result rows (none) | 0 |

`before = after + unmapped` holds for every entity, and a stray canonical row — one the map (or,
for assessments, the created-rows record) does not name — is an error. Every learning area's code
and name, every component's name and learning area, every mark's enrolment, learner, assessment,
learning area, component and value, and every period result's enrolment, period, total and grade
are checked back against the legacy rows.

### The acceptance: marks per learner equal before and after

The migration does not assert the acceptance, it **computes** it. For every learner:

- **Before** — one tuple `(academic period, learning area, component, value)` per legacy mark the
  migration did not report, read from the legacy rows through M1's, M2's and M3's id maps.
- **After** — the same tuple per canonical mark: the mark's assessment period, its learning area,
  its component, and its value (`score:<decimal>`, `level:<text>`, or `status:<code>`).
- The two **multisets** must be equal. A mark that moved to another learner, another period,
  another learning area, another paper, or lost or changed its value makes them differ.

`assertMarksCarried` fails the migration on the first learner whose multisets differ: the
transaction rolls back and the database keeps the state it had. The report keeps the tuples, so
the failure names the learner and the counts before and after.

## What it refuses to do

- **No canonical tables, no report tables**: it refuses a database that has not applied the
  canonical schema and run M1, as M2 and M3 do.
- **No enrolments**: a mark belongs to an enrolment. A database with no `enrolment` row has not
  run M3, and a database whose id map names no enrolment is refused even when the table exists:
  migrating it would write no mark at all.
- **An exam table that already holds a row**: the canonical data is newer than the legacy data, so
  there is nothing to migrate. This covers `result`, so a canonical result written by the engine
  stops the migration rather than being mixed with migrated period results.
- **A legacy row it cannot map** is reported in `_legacy_unmappable`, never dropped: a subject with
  no code or no name, a code another subject holds, a paper with no subject or no name, a session
  whose period M1 did not map (one row per learning area), a mark whose result, setting, paper,
  learner or enrolment is missing, a mark that duplicates another, a result whose learner or
  session is missing, a result whose period already holds one, a result that carries nothing.
- **A warning is reported and the migration still commits**; an error stops it. The migration
  writes the report and then verifies it, so a report that does not add up fails the run.

## The acceptance in the fixture

The fixture is the P0-era seed plus the drift an installation can hold:

- the 18 seed subjects and 40 seed papers, and 5 exam sessions with their paper settings (the two
  seed sessions, an opener, a session whose period M1 did not map and a session with no papers);
- a subject with no code, and a subject whose code `101` English already holds;
- a paper whose subject does not exist, and a paper no session configures;
- 8 results for 5 learners, including a learner M3 wrote no enrolment for (`S903`), a learner
  whose session belongs to an unmapped period, and a second result row for one sitting;
- 15 paper marks and one mark embedded in a result row, including a score of `A`, a score of `-`,
  a score of `ABS`, a paper marked twice in one result, a paper an earlier result already marked
  for the same learner, and a paper setting that belongs to another session.

The fixture test reads the rows back and asserts the learning areas and their codes, the
components and their order, the assessments and their periods and maxima, the marks and their
values and uniqueness, every learner's multiset equality, the report counts, the unmappable rows,
a learner whose mark is changed and is refused, and the rollback.

## The rollback

`down` removes exactly what the migration created. Every canonical row M4 writes is recorded in
M2's `_legacy_migration_created` under version 4, so the rollback deletes the period results, the
marks, the assessments, the components and the learning areas it wrote, in the order the foreign
keys need, and leaves a row it found alone. It also deletes its id-map rows, its unmappable rows
and its notes, and its own rows in the created-rows table. The table itself stays: M2's and M3's
rows live in it, and a rollback to version 2 must leave them able to undo their own rows later.
The legacy tables are never written.
