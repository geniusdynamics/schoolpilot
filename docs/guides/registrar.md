# Registrar's guide

A walkthrough of the admissions and learner-record screens in SchoolPilot, in the order a school
year runs: check the structure → admit → place → keep the record → roll over at year end.

Written for a registrar or secretary who has used a browser but not this system. Every screen
below exists in this build; where the app cannot do something yet, the section says so instead of
describing what it was meant to do.

> Where a step gives a menu path, the address in brackets is the page it opens. Some sidebar
> entries have no English label yet and display as their translation key; the address is always
> the reliable part. See [the guide index](README.md).

## 1. Before the first admission: check the structure

The admission form picks from records that must already exist. If a picker is empty, the problem is
in the structure, not the form.

| Check | Where | Address |
| --- | --- | --- |
| School name, address, head teacher, motto | Settings → **School & People** → **School Profile** | `/settings/school` |
| Academic years and their terms | Administration → **Academic Calendar** | `/administration/academic-calendar` |
| Classes and their streams | Administration → **Classes & Streams** | `/administration/classes` |
| Programmes and the curriculum pack each runs on | Academics → **Programmes** | `/academics/programmes` |

Notes that matter in practice:

- The **Classes & Streams** page is titled *Classes & Streams Management*. A class is a level name
  ("Form 1"); a stream is a division inside it ("North"). The admission form's **Class group**
  picker offers the class groups the programme and level you chose allow, so choose programme and
  level first.
- **Programmes** lists each programme with the pack code, version and the pack's verification
  status. A pack whose status is `draft` is disclosed as unreviewed — the Kenyan packs shipped with
  this build are all `draft`. Read the status before you tell a parent the school follows a
  national rule.
- The academic calendar is where the year and its terms are recorded. Billing, marks and reports
  are all pinned to a term, so a wrong term date is a wrong invoice and a wrong report.

## 2. Admitting a learner

**Admissions → Admit learner** (`/admissions/admit`). The page is one form in four sections; the
admission writes the learner, their guardians, their identifiers and the first enrolment in one
go.

1. **Learner** — first name, family name, gender, date of birth (optional), residence
   (day or boarding), previous school (optional). First name, family name, gender and residence are
   required.
2. **Guardian 1 (primary contact)** — either link a guardian the school already knows
   (**Link an existing guardian** searches by name and phone) or type the guardian's first name,
   family name, relationship and phone. Add further guardians with the section's own add control.
   Two siblings sharing one guardian is the case this is built for: link the existing guardian on
   the second child instead of retyping them.
3. **Placement** — programme, level, class group, start date and entry reason. All five are
   required. The **Start date** is the date the learner joined, not the date you are typing: it
   decides which term's bills, marks and registers apply to them.
4. **Identifiers** — the identifier scheme and value for the learner and for each guardian (for
   Kenya: UPI, birth certificate, national ID, KRA PIN, and the rest of the country pack's
   schemes). Optional; a scheme the country pack declares validates its format.

Press **Admit learner**. The result card says **Learner admitted**, shows the admission number
(for example `ADM/2027/001`), the class group, and how many guardians, links and identifiers were
written. Press **Admit another learner** to start the next one.

What the form refuses, and why:

| Message | What it means |
| --- | --- |
| A required field is marked in red | The field is required for every admission; fill it. |
| The programme/level/class group picker is empty | The structure is missing that record; fix it in step 1. |
| A duplicate or reference error on submit | The guardian phone or admission number already belongs to another record; search the register before retrying. |

## 3. Checking the admission landed

Three screens read the same records. Use all three until you trust the flow:

- **Admissions → Register** (`/admissions/register`) — card titled *Applicants and admitted
  learners*. It is the registrar's working list: learner, class group, guardian and admission
  number. This is where you edit a guardian's details and record an identifier after the fact.
- **Administration → Students** (`/administration/students`) — card titled *Student Management*,
  with a search over name, admission number and guardian. The **Directory** tab is the full learner
  list; **Bio Data**, **Health Records**, **Clearance** and **Transferred** are the other tabs.
- **Admission number** — the number the result card shows is the one other pages quote. If a parent
  asks for it, that is the string to give them.

If a learner does not appear in the directory after an admission that reported success, reload the
page once (the grids read live data), then check that you are looking at the right academic year's
class group.

## 4. Applications from outside the school

**Admissions → Applications Hub** (`/admissions/applications-hub`, page title *Application
Management*) has four tabs: **Applications**, **Review Queue**, **Form Builder** and **Tracking**.
**Admissions → New Application** (`/admissions/new-application`) is the staff-side form for an
application taken at the desk.

One known defect: the public application wizard's first step does not submit (see the project
README's *Broken* note). Capture public applications from the staff-side pages instead.

## 5. Bulk work at the start of a term

**Administration → Bulk Operations** (`/administration/students/bulk-ops`) has four tabs:

| Tab | What it is for |
| --- | --- |
| **Bulk Update** | Change one field across a selection of learners. |
| **Data Import** | Import learners from a spreadsheet. |
| **Roll Numbers** | Assign roll numbers across a class. |
| **Promotion** | The bulk promotion helper. For the audited year-end run use **Promotion Run** instead (section 7). |

Import in a small batch first and check the directory before importing the rest: a bad spreadsheet
column becomes a bad column on every learner.

## 6. Transferring, clearing and certifying

- **Transferred students** — Administration → Students → **Transferred** tab, which lists learners
  who left. The standalone transferred page redirects here.
- **Clearance** — Administration → Students → **Clearance** tab. A learner's clearance request is
  recorded against their record.
- **Certificates** — Administration → **Certificates** (`/administration/certificates`) issues
  transfer, character and birth certificates.
- **Alumni** — Administration → **Alumni** (`/administration/alumni`) holds the leavers' list.

## 7. Year-end: the promotion run

**Administration → Promotion Run** (`/administration/promotion`). Nothing is applied until a
reviewer has settled every learner, a head teacher has approved, and the run has been committed.

1. Choose **Year being closed** and **Year being opened**.
2. **Compute suggestions** — the suggestions come from the curriculum pack's progression rules.
3. **Review per class group** — each row shows the learner, the rule that fired, the suggestion
   and the decision. A conflict (a rule that cannot decide) is listed under *A human still has to
   decide* and must be resolved before approval is possible.
4. **Override** any suggestion with a reason. The reason is kept with the decision.
5. **Approve run** — only a head teacher or an administrator may approve; the page tells you when
   your role cannot.
6. **Commit run** — writes the new class lists and carries balances. The record shows promoted,
   repeated, graduated, overridden and carried-balance counts.
7. **Undo run** — available after a commit, until the school is satisfied.

The run is the only supported way to move a whole cohort. Do not move learners one at a time in the
directory and expect the balances to follow.

## What the app cannot do yet

- **Guardian portal sign-in.** The Portal module has the pages (`/portal`, `/portal/results`,
  `/portal/fees`), but guardians do not yet get accounts or a phone-code sign-in from this screen.
  Send statements and reports from the staff-side pages.
- **A public application that submits.** The first step of `/admissions/apply` is broken in this
  build.
- **Merging duplicate learners.** There is no merge tool; correct the record in place.
- **A printable admission form.** The admission is entered on screen; print the learner's record
  from the directory if a paper copy is required.

---

Menu labels and addresses in this guide were checked against the module definitions
(`src/modules/*/moduleDefinition.tsx`), the Settings hub table
(`src/modules/settings/hubTabs.ts`) and the English locale files on 2026-10-28. The flow steps were
read from the page components and cross-checked against the admissions and promotion end-to-end
specs in `tests/e2e/`; they were not clicked through by a person during this review.
