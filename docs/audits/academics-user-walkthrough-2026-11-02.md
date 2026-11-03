# Academics, walked through as a user

Date: 2026-11-02
Build: `consolidation` at `e632f4a` (after PR #76), Vite dev server.

> **Status, 2026-11-03.** The findings below were worked in order. What closed them: #80 (no write
> permission was enforced in the browser; the legacy pages retired), #83 (the dashboard reads the
> canonical school; term and class labels; save feedback; the header names the person; table actions
> fit) and #84 (a teacher no longer sees the curriculum controls they cannot use). What is still
> open is a decision rather than a defect: the results roster's stream scoping, the duplicate
> Class grid / Student grid tabs, and observations listing class groups from every year. The
> running list is `.opencode/todo.md`.

## How it was tested

- A fresh browser profile, through onboarding, "Explore with Demo Data", the sample school (Greenfields
  Academy, Grade 7-9, East/West, the Kenyan CBE pack), desktop 1440x900.
- **By hand** in the browser panel: the Academics dashboard, Subjects (adding a learning area), Marks
  Entry.
- **Scripted, clicking through the UI as a user does** (Playwright, in-app navigation, no reloads
  between pages): every one of the 18 Academics pages and each of their 32 in-page tabs, recording
  headings, alerts, empty states, row counts, raw translation keys, controls past the right edge and
  console errors; then five workflows as the administrator and the teacher.
- Each data-source claim below was checked in the code, with the file named.

Not covered: phone and tablet widths, Firefox and Safari, the head teacher and class teacher roles,
every create and edit form on every page, printing, the observation entry and lesson-plan approval
flows end to end.

## Summary

Academics is **two systems in one menu**. About half the pages work on the school that was actually
installed: subjects (learning areas), allocations, marks entry, results, exam analysis, report
publishing, programmes, observations. Marks entered there save, survive a reload and flow into results and
reports. The other half read the legacy collections, which the old demo seed fills with **a different,
invented school** - "Form 1 A", "Grade 10A", "End of Term 3 Exams 2024", IGCSE and SAT results. On a
production install those pages would be empty instead. Either way, nothing set up on them reaches marks
entry or results.

The most serious finding is that **the browser enforces no write permissions**: signed in as the
demo teacher, I deleted a learning area.

| Severity | Count |
|---|---|
| Blocker | 2 |
| High | 7 |
| Medium | 10 |
| Low | 6 |

## Blockers

**B1. No write permission is enforced in the browser.** As the demo teacher (`teacher`), Subjects
showed Add, Edit and Delete (22 write buttons); Grading shows "Add Grading Scheme"; Programmes shows
its actions. Deleting the learning area "Girl Guides" succeeded: "Learning area deleted.", 19 rows
before, 18 after a full reload. The role catalogue, the authorizer and the scoped repository exist and
are tested (`src/data/auth/authorizer.ts`, `scopedRepository.ts`), but `openCanonicalRepository`
creates a plain repository with no `authorize` hook (`src/data/canonicalRepository.tsx:71`), so every
page writes as anyone. The teacher's marks-entry list *is* scoped (7 groups: Pre-Technical Studies
and Agriculture for Grade 7-9, Football) - that is a filter on what is shown, not a refusal of what is
written.

**B2. The Academics dashboard reports another school and invents activity.** It reads only the legacy
collections (`AcademicsDashboardPage.tsx:21,47`): 18 subjects and 40 papers including Biology,
Chemistry and Physics, 4 classes, "Exam Results Recorded 0" and "Active Exams 0" - while the installed
school has Term 3's end-of-term exam open with hundreds of marks. The "+3" trend (line 100) and the
whole "Recent Activity" list ("New exam session scheduled - 3 hours ago", "1 day ago", "2 days ago",
"3 days ago", lines 285-288) are literals.

## High

**H1. Legacy pages are disconnected from marks and results.** Exam Setup (Scheduling and Exam Sessions),
Report Cards, Grading & Systems, Timetable, Assignments and Lesson Plans read the legacy collections
(`AcademicDataContext`, `useDatabaseCollection`, `useAssignmentsData`, `useLessonPlansData`), seeded with
the old demo school: classes "Form 1 A ... Form 4 East", "Form 1 - A" timetables, "Grade 10A" lesson
plans, exam session "End of Term 3 Exams 2024 / Term 3 - 2023 / Marks Entry Open". Marks Entry, Results
and Report publishing read the canonical assessments. So "set up an exam, then enter its marks" does not
work as a user expects: a session created in Exam Setup is not an assessment Marks Entry can open (by the
data model; I did not create one and look for it).

Seven of these pages are the most misleading, because their figures look like a school's real
activity. Each filters a legacy collection into a local variable named `mock...` - the name is not the
data, the data is the legacy seed's:

| Page / tab | Variable (legacy collection) | What a demo user sees |
|---|---|---|
| Marks Entry > Entry by Token | `mockSessions` (`sessionsCollection`) | token `TKN-2024-ABCD1234`, "End of Term 3 Exams 2024" |
| Marks Verification > Cross Check | `mockRecords` (`crossCheckCollection`) | 4 records, 2 verified, 1 discrepancy |
| Marks Verification > By Structure | `mockValidationItems` (`validationCollection`) | 6 components, 1 invalid, sessions from 2024/2025 |
| Results Distribution > Exam Gazette | `mockGazettes` (`gazettesCollection`) | classes "Grade 10 - A", "Grade 10 - B" |
| Results Distribution > Distribute Results | `mockDistributions` (`distributionsCollection`) | "4 distributions, 3 distributed, 0 failed" |
| Results Distribution > Board Results | `mockBoardResults` (`resultsCollection`) | IGCSE, A-Level, IB, SAT results for a CBE school |
| Events Manager | `mockEvents` (`eventsCollection`) | 5 upcoming events |

A demo visitor reading "3 distributed" believes results reached parents. On a production install the
same pages would be empty - and still unable to verify, distribute or publish the school's real results.

**H2. Two report systems.** Report Cards (legacy: exam "End of Term 3 Exams 2024", classes "Form 1 A") and
Report publishing (canonical: generated "9 of 9 prepared" for the real school) sit side by side with no
hint which one is real.

**H3. Two grading systems.** Grading & Systems lists the legacy "Standard A-E Grading" (12 levels) and
legacy education systems. The CBE scale the results actually use comes from the installed pack and is
nowhere on that page, so a school trying to see or change its grading edits the wrong thing.

**H4. Every term picker shows two years with no year.** Marks Entry, Class grid, Results, Report
publishing and Exam Analysis list "Term 1, Term 2, Term 3, Term 1, Term 2, Term 3": last year's and this
year's terms with identical labels. Observations does the same with classes (each Grade/stream twice).

**H5. Pages open on the wrong term.** Marks Entry, Results and Report publishing open on Term 1, which is
published and locked ("Read-only: a change needs a reason", "Locked: 9"), instead of the current term
(Term 3). A teacher's first sight of marks entry is a grid they cannot type in.

**H6. Class groups are named by stream alone.** Results and Report publishing offer "East | West | East |
West | East | West" - six options, no grade. And the "East" report batch prepared **9 of 9**: every Grade 7
learner, West included. The roster comes from the teaching groups declared for the class group, with no
check of the learner's own class group (`useResults.ts:300-329`, recorded with PR #75).

**H7. Deleting a learning area orphans its data.** The confirmation says so itself: "Its components and
teaching groups stay, but no longer resolve." Combined with B1, a teacher can break the school's
teaching groups with two clicks.

## Medium

**M1. Controls past the right edge at 1440 px.** The main area clips (`overflow: hidden`) and the window
scrolls sideways. Cut off: Subjects' Edit and Delete (Delete at x 1451-1542), Subject Papers' Delete,
the Subject matrix checkboxes, Class grid mark cells (Kiswahili, Mathematics, Pre-Technical Studies,
Social Studies), "Distribute Now", "Clone" on Education Systems, an unlabelled button on Events Manager.

**M2. Adding a learning area is hard to do right.** The button opens the form *below* the table
(y about 1360), off-screen, so the click looks like it did nothing. The form has no level or pathway field
(the footer says "The levels and pathways of a learning area are kept as stored"), so a new learning area
belongs to no grade and cannot reach marks entry. Submitting without a Programme shows the raw schema
text "Invalid input: expected string, received undefined". The Programme option could not be picked by
clicking it in the panel; the e2e helper records the same problem - long option lists are clipped by the
popover and clicks are flaky, so the tests drive them by keyboard (`tests/e2e/goldenPathSupport.ts:311-325`).

**M3. A column labelled with a page title.** Subject Papers' learning-area column reads
"SUBJECTS MANAGEMENT": the header uses the key `subjects.title` (the page title) with "Learning area" as
a fallback that never applies (`SubjectPapersManagementPage.tsx:116`).

**M4. A raw key in the menu.** The Report Publishing menu item shows `academics.reportPublishing`; the key
is missing from `src/i18n/locales/en/navigation.json` (used at `moduleDefinition.tsx:31`). It is the only
missing Academics navigation key.

**M5. Five ways to enter marks.** Marks Entry has "Mark Entry v2" (an internal version name), "Class grid",
"Student grid", "Student Exam Results Entry" and "Entry by Token" (legacy, H1). "Class grid" and "Student
grid" render the same "Class marks grid". Nothing says which to use.

**M6. Mark entry gives little feedback.** Typing 72 and Tab saved the mark (it survived a full reload) but
nothing on screen said "saved". Entering 150 where the maximum is 100 marks the cell invalid and adds a
counter "Out of range: 1"; the cell never says the maximum.

**M7. The teacher is someone else.** Signed in as `teacher`, the header reads "John Smith (Teacher)": the
legacy demo user list, not the sample school's staff (its teacher login belongs to John Barasa).

**M8. Assignments are free text.** The create form's only dropdown is Status (Draft, Published, Archived);
Subject, Class and Teacher are not linked fields, so an assignment points at no real class or teacher.

**M9. Broken page states.** Exam Setup > Scheduling renders "Invalid Date". Exam Analysis > Student
Analysis shows "Unknown Student", "+2", "Total Points 28" over "0 / 0", and "No exam results recorded for
this student". Assignments > Grading opened from its tab shows "Assignment not found".

**M10. The main dashboard (the first screen after sign-in) reads the legacy data too.** "Total Students 52"
(the school has 33), "Faculty 25" (18), attendance "0 of 0 present", fee collection KES 0, "No exam
results recorded yet". Not an Academics page, but it is where a user forms their first impression.

## Low

- **L1. Names change between screens.** One page is "Subjects" in the menu, "Subjects Management" three times
  in its heading and tab, "learning area" on the button and the form, and "SUBJECT CODE" in the table.
- **L2. Jargon and developer wording reach the user.** "Your role reaches every teaching group.", the
  Subjects footer above, "A teaching group joins one class group and one learning area for an academic
  year".
- **L3. Raw enum values are shown as labels.** "co curricular", "malpractice", "present" in lower case.
- **L4. Accessibility gaps.** The login username and password fields and the learning-area form inputs have
  no accessible name. The password reveal button, an element in the tab strip and an Events Manager button
  are unlabelled.
- **L5. Onboarding contradicts itself.** The demo card promises "33 sample learners"; the next screen says
  "150+ students". The login footer reads "© 2024".
- **L6. Console noise on every page.** Every page logs "[SecondarySidebar] No selected module found for:
  academics". The install logs a failed `CREATE UNIQUE INDEX ... "idx_app_settings_[object Object]"`
  (an index spec passed as an object) and "Already initialized as 'schoolpilot_prod'; ignoring request for
  'schoolpilot_development'".

## Workflows

| Workflow | Role | Outcome |
|---|---|---|
| Enter an end-of-term mark (Term 3, Grade 7 Kiswahili, Baraka Wekesa = 72) | admin | **Works**: saved and still 72 after a full reload. No "saved" feedback (M6). |
| Reject an out-of-range mark (150 of 100) | admin | **Works**, weakly explained (M6). |
| Results reflect the new mark | admin | **Works**: Baraka is listed "Incomplete" because the seed leaves Agriculture and Creative Arts unmarked, as designed. Wrong default term (H5), ambiguous class groups (H6). |
| Generate the term reports | admin | **Works**: "9 of 9 prepared" - but for a class group that is one stream (H6). |
| Add a learning area | admin | **Blocked in practice**: form off-screen, no levels, raw validation text, programme picker hard to use (M2). |
| Create an assignment | admin | Form opens; subject, class and teacher are free text (M8). Not submitted. |
| See only my teaching groups | teacher | **Works** for marks entry (7 groups). |
| Be refused a write I should not have | teacher | **Fails**: deleted a learning area (B1, H7). |

## Suggested order of work

1. B1: wire the authorizer into the browser's canonical repository and hide what a role cannot do.
2. B2: the dashboard reads the canonical school and shows no invented trend or activity.
3. H1-H3: decide, per legacy page, whether it moves onto the canonical model (exam setup, report cards,
   grading, timetable) or leaves the menu until it has a real source. Report Cards and Report publishing
   need to become one.
4. H4-H6: name terms with their year and class groups with their grade, and open on the current term.
5. The Medium and Low items, most of which are small.
