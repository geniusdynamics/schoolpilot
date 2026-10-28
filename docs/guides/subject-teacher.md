# Subject teacher's guide

What a subject teacher does in SchoolPilot: enter marks for the teaching groups you are assigned to,
record observations for your learning area, set and grade assignments, keep lesson plans, and read
the results your marks produce.

Written for a teacher with a laptop or an Android phone. Each section gives the sidebar path and the
address; some sidebar entries have no English label yet and display as their translation key, so the
address is the reliable part.

## 1. Which groups are yours

**Academics → Subjects Allocation** (`/academics/allocations`) → **Teacher Assignments** tab
(`/academics/allocations?tab=teacher-assignments`). Your rows there are the groups you can mark.
The same page's **Class Allocations** and **Student Enrollment** tabs show who teaches what and
which learners are in each group — useful when a mark cell is missing because a learner was never
enrolled in your group.

Teaching assignments are effective-dated. A membership that does not cover the date of the
assessment grants you nothing, so a group that "disappeared" usually means the assignment or the
membership ended before that date.

## 2. Entering marks

**Academics → Marks Entry** (`/academics/marks-entry`).

1. **Period** — the term; the current one is pre-selected.
2. **Teaching group** — only your groups are offered.
3. Fill the grid. One column per assessment, one row per learner; each cell announces its assessment
   and learner. The grid saves as you type and tells you when edits are still pending.
4. **Submit marks** when the group is complete — that is the hand-off to the moderator.

The workflow bar moves an assessment **submitted → moderated → locked → published**, and
**Reopen with a reason** takes it back. You normally only press **Submit marks**; if you also
moderate, the reason you type is kept on the record.

Marks can be entered on a phone: the same grid reflows into narrow cards, which the GP-4 end-to-end
spec exercises at phone width.

Two things the grid will not do: create a learner's membership or invent an assessment. Both come
from the structure — the teaching group's memberships and the period's assessments.

## 3. Observations for your learning area

**Academics → Observations** (`/academics/observations`) records a competency level and the
evidence behind it, per learner, per learning area, per date. Choose **Class**, **Learning area**,
**Observed on**, then **Capture** *outcome* or *competency*. On a phone the page switches to one
learner at a time.

Where the class runs on a pack with no observational scheme, the page says so and there is nothing
to record; use marks.

## 4. Assignments

**Academics → Assignments** (`/academics/assignments`) — the hub with the list and the grading
screen. Create the assignment against your teaching group, then grade submissions from the
**Grading** tab (`/academics/assignments?tab=grading`).

Assignment marks are not exam marks. They do not enter the term result unless the curriculum pack's
assessment scheme includes a slot that reads them; check with the exams officer before you tell a
class that homework counts towards the report.

## 5. Lesson plans

**Academics → Lesson Plans** (`/academics/lesson-plans`) — weekly plans and lesson notes. The
**Approval** tab is where a head of department or deputy reviews them. A plan belongs to the week
and the class, so write it from the week you actually taught, not the week you meant to.

## 6. Your timetable

**Academics → Timetable** (`/academics/timetable`) shows the periods and the entries. Timetable
entries are built from the school's periods (`?tab=periods`) and the class/subject allocation, so a
lesson can only appear once the allocation exists.

## 7. Reading the results

**Academics → Results** (`/academics/results`) — pick the **Period** and the **Class group**. As a
subject teacher you will usually be read-only: the badge says *Read-only* and gives the reason.
**Why this grade** shows the engine's trail for any learner, which is the honest answer to "how was
this calculated?" — the grade follows the scheme's bands and the programme's aggregation, not a
teacher's judgement.

If you believe a grade is wrong, the mark is the thing to check: correct the mark (through the
workflow, with a reason) and let the result recompute. Do not ask for the grade to be typed in; it
cannot be.

## What the app cannot do yet

- **A mark for a learner outside your groups.** There is no override; the membership has to exist.
- **Assignment marks flowing into the report automatically.** Only if the pack declares it.
- **Messaging a class or a parent.** There is no teacher-to-guardian channel in this build.
- **Seeing the moderation history of a colleague's assessment.** The workflow state is visible; who
  moderated it and why is on the record, not in a screen of its own.

---

Menu labels and addresses were checked against `src/modules/academics/moduleDefinition.tsx`, the
marks and allocation pages, and the English locale files on 2026-10-28. The mark-entry and
term-cycle behaviour described is the journey the GP-3 and GP-4 end-to-end specs drive against a
real browser; this review did not run them.
