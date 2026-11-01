# Setup completion, the demo seed, and the defaults a school needs

Date: 2026-11-01
Build: `consolidation` after PR #67, nothing in production anywhere, so seed data and defaults may be
changed freely.

## What "set up" means

A school can open the app with the database initialized and still have nothing a page can use. The
checklist the app now reads is the five rows the wizard writes, counted in the canonical tables:

| Item | Proof the row exists |
|---|---|
| School profile | `school_details.name` is not blank |
| Education system | at least one `programme` |
| Academic year and terms | at least one `academic_year` **and** one `academic_period` |
| Classes and streams | at least one `class_group` |
| Subjects | at least one `learning_area` |

It is read from the rows, not from `setup_completed_at`: a demo database that already holds a whole
school is complete without anyone pressing Finish, and a database whose rows were removed is
incomplete even if the flag survived.

## The header nag

- `src/hooks/useSetupChecklist.ts` counts the rows and combines them with the live `school_details`
  row the header already reads. A database that cannot be read yet is reported as *unreadable* and
  does not nag.
- `src/components/setup/SetupNag.tsx` renders a compact amber button in the main window header —
  "Finish setup · 2/5", with the missing items in its tooltip — and opens `/setup`. It is shown only
  to a login that can change settings (super administrator, administrator, or a login holding a
  `settings.*` permission); a teacher or student does not see it.
- `/setup` (`src/components/setup/SetupPage.tsx`) renders the existing seven-step wizard outside
  first-run onboarding. Every step writes through the idempotent writers, so re-running it reuses
  what exists. Finishing records `school_details.setup_completed_at` and reloads into the dashboard.

Before this, the wizard was reachable only during first-run onboarding; an administrator who
skipped it or lost the tab had no way back to it.

## The demo seed (demo and trial use)

The demo pathway now produces a school that a walkthrough can use end to end:

- **The school profile is written.** The canonical seed always created the institution, but the
  header, receipts and report headers read the single legacy `school_details` row, which nothing
  created. The demo header now shows the school name instead of the product name, and the setup
  checklist is complete (5/5) without pressing Finish.
- **The demo logins are canonical `user` rows.** The seeder writes `teacher` with a `person_ref` to
  a staff record and sets that record's `user_id` to the row; `student` with a `person_ref` to the
  first learner. `useCanonicalSessionActor` resolves a login to a canonical user by username, so:
  - the teacher reaches the groups they teach (marks grids are writable, columns narrowed to their
    subjects), and
  - the student portal shows the learner, attendance and balance.
- **The rows are idempotent.** A second seed run reuses the school, the logins and the links rather
  than duplicating them (covered by `demoSchool.test.ts`).

## Default records: what a blank school gets, and what it does not

Present after a production initialization, before the wizard completes:

- institution, campus, academic year, three terms, one programme, two levels and three class groups
  (`seedDemoSchool` with `demo: false`).

Written by the wizard, not by the seed:

- `school_details` (name, motto, address, phone, email), the chosen programme from the packs, the
  academic year and its financial year, classes and streams, subjects, and the first administrator.

Still missing on a blank school, and deliberately not invented by the seed:

- **Approval workflows.** The engine's catalogue (`src/domain/workflows/catalogue.ts`: marks
  lifecycle, promotion run, fee-schedule approval, document posting, …) is code-defined and runs
  without rows, but Settings → Workflows lists the legacy `workflows` collection, which starts
  empty. Seeding the catalogue into that collection is the natural next step if schools should see
  and extend them; it needs a decision on whether system workflows may be edited or only viewed.
- **Grading scale.** A demo school gets `demo_numeric`; a blank school gets one from the chosen
  pack. A school that installs no pack has no scale until it creates one in Academics → Grading.
- **Fee items, fee schedules and the fee book.** Finance is a school's own policy; the wizard does
  not invent fees.
- **Document numbering sequences and notice templates.** Created lazily by the features that need
  them; neither is required to open the app.
- **Staff and learners.** The wizard's administrator is the only person a blank school has; staff
  and learners are admitted through their own pages.

## Verification

- `useSetupChecklist.test.ts`: the five items, a year without terms counted as incomplete, and that
  a profile counts from its name alone.
- `SetupNag.test.tsx`: visible with a missing count and a tooltip listing what is missing, opens
  `/setup`, silent when complete, while loading, or for a role that cannot change settings.
- `demoSchool.test.ts`: the teacher and student `user` rows exist with their `person_ref` types, and
  a staff row points at the teacher's user row.
- Browser, fresh demo: header shows the school name, no nag, teacher grid scoped to their subjects,
  student portal shows learner and balance. Browser, demo seeded before the fix: the header shows
  "Finish setup · 4/5" and the button opens the wizard.
