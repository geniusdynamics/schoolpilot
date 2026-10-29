# Class teacher's guide

What a class teacher does each day and each term in SchoolPilot: take the register, enter marks for
your own group, record competency observations, and write the class teacher's comment on the
report cards.

Written for a class teacher working on a laptop or a phone. Each section gives the sidebar path and
the address. Some sidebar entries have no English label yet and display as their translation key;
the address is the reliable part.

## What you can see

Your screens are scoped to the groups you are assigned to. A class teacher sees their homeroom's
learners; a subject teacher sees their teaching groups. If a page says *This class group is outside
your scope* or shows no class, the assignment is missing — ask the administrator to put you on the
class group (homeroom teacher) or on the teaching group. Nothing you can click changes that scope.

## 1. The register

**Administration → Attendance** (`/administration/attendance`) → **Manual Entry** tab.

1. **Date** — today by default. Set it back if you are catching up on yesterday.
2. **Class** — pick your class group. The register loads the learners enrolled on that date.
3. Mark each learner **Present**, **Absent** or **Late**. Everyone you do not touch is saved as
   present, so mark the exceptions, not the whole list.
4. **Save Attendance**. The page confirms with *Saved N attendance record(s).*
5. The counters at the top (**Total Students**, **Present**, **Absent**, **Late**) are the running
   totals for the register you are editing.

The other tabs on the page: **Dynamic Tracker** (attendance as it is happening), **Attendance View**
(read a saved register: choose the class and date, and the tab shows each learner's mark, with
present/absent/late totals; it is read-only, so correct a mark on **Manual Entry**) and **Reports**
(attendance reports). Use **Search** on the register to find a learner by name or admission number
in a long class.

A register is per class group per day. Taking the same day twice overwrites rather than duplicates,
so a corrected register is safe to save again.

## 2. Marks for your group

**Academics → Marks Entry** (`/academics/marks-entry`) → **Mark Entry v2** tab (the default).

1. **Period** — the term. The current period is pre-selected.
2. **Teaching group** — only the groups you teach are offered. A group with no members on the
   period's date says so; memberships are added on the teaching groups screen, not here.
3. Type the marks straight into the grid. Each assessment the period declares is a column, and each
   cell is labelled with the assessment and the learner, so a screen reader announces exactly which
   mark you are on. The grid autosaves after a pause; **Save now** is only enabled while an edit is
   pending, and the page tells you when edits are unsaved.
4. A cell the scheme refuses (out of range, wrong format) is marked invalid on the cell itself. Fix
   it before you leave the page.

### Submitting, moderating, locking

Above the grid is the **Workflow** bar for the chosen assessment. The buttons follow the order the
term runs in:

| Button | Moves the assessment to | Who it is for |
| --- | --- | --- |
| **Submit marks** | submitted | The teacher who entered them. |
| **Moderate marks** | moderated | The moderator. A reason is required. |
| **Lock marks** | locked | The person closing mark entry. |
| **Publish marks** | published | Makes the marks available to results and reports. |
| **Reopen with a reason** | back to open | Corrections after a lock; the reason is kept. |

Do not start report cards for a class whose marks are not yet published: results and reports read
the computed result, and an unpublished assessment is not in it.

## 3. Competency observations (CBC)

**Academics → Observations** (`/academics/observations`; sidebar label **Observations**), page title
*CBC observations*.

1. **Class** — your class group.
2. **Learning area** — the area you are observing in.
3. **Observed on** — the date of the evidence.
4. **Capture** — choose *outcome* (a curriculum outcome) or *competency* (a core competency).
5. For each learner, pick the **level** and type the **evidence**. The evidence box is what makes an
   observation defensible later; a level with no evidence is a number with no story.
6. The page derives the term judgement from the level you recorded, using the scheme and scale the
   installed curriculum pack declares.

On a phone the capture layout switches to one learner at a time with **Previous learner** and
**Next learner** buttons, which is faster than scrolling a wide matrix.

If the page says *The curriculum pack cannot drive observation capture*, the school's programme is
not on a pack with an observational scheme (for example a Form 1–4 class on a marks-only pack).
Observations are not available for that class; use marks.

## 4. Results for your class

**Academics → Results** (`/academics/results`).

1. **Period** and **Class group** — both are needed; the page explains which state it is in when
   one is missing (no learners enrolled, no learning area marked, outside your scope).
2. Read the table: one row per learner, one column per learning area, the aggregate from the
   programme's own aggregation. Grades here are **computed**, never typed.
3. **Why this grade** opens the engine's own trace — each step, its numbers and the bands it
   looked up. This is the answer to "why did my child get a B?" that a parent can follow.
4. **Moderate** records an override beside the computed grade, with your reason and the time. The
   engine's grade stays on the record; the override is kept next to it.

The badge above the table tells you whether you may moderate (*You may moderate these results*) or
are read-only for that class, and why.

## 5. The report card comment

**Academics → Report Cards** (`/academics/report-cards`).

1. **Exam** and **Class**.
2. **Learner** — *Whole class* prepares the class batch; one learner prepares a single card.
3. **Class teacher's comment** — used for every learner who has no comment of their own.
4. **Head teacher's comment** and **Next term begins** — usually the head's line, filled once for
   the batch.
5. **Print N report cards** prints the prepared batch.

There is a separate publishing step with its own review before a report is final: see the
[exams officer's guide](exams-officer.md). The Report Cards page is the printable card; **Report
Publishing** is the version that is frozen and recorded.

## 6. Homework and lesson plans

| Screen | Address | What it does |
| --- | --- | --- |
| **Assignments** | `/academics/assignments` | Create an assignment and grade submissions. |
| **Lesson Plans** | `/academics/lesson-plans` | Weekly plans, lesson notes and the approval tab. |

Both are hub pages with tabs; the address opens the hub's first tab. These are records of work,
not a substitute for the register or the mark grid.

## What the app cannot do yet

- **See another teacher's group.** The scope is enforced by the teaching assignment; there is no
  "view as" for a colleague's class.
- **Mark a learner who is not enrolled.** Add the membership first, or the cell will not exist.
- **Send anything to a parent.** The guardian portal pages exist but guardians have no accounts
  yet. Hand the printed report card or statement over at the desk.
- **Enter a mark on a locked assessment.** Reopening needs a reason and the permission to do it.

---

Menu labels and addresses were checked against
`src/modules/administration/moduleDefinition.tsx`, `src/modules/academics/moduleDefinition.tsx`,
the pages under `src/modules/academics/pages/` (marks, observations, results, report cards) and the
English locale files on 2026-10-28. The workflow order and its button labels are from
`src/modules/academics/pages/marks/MarkEntryV2Page.tsx`; the mark → results → report journey is the
one the GP-3 and GP-4 end-to-end specs drive. The screens were not clicked through during this
review.
