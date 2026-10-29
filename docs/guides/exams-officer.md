# Exams officer's guide

The assessment year in SchoolPilot, end to end: set up the exam → teachers enter marks → verify →
compute results → moderate → publish report cards → distribute them.

Written for a director of studies or exams officer. Each section gives the sidebar path and the
address; some sidebar entries have no English label yet and display as their translation key, so
the address is the reliable part.

Two rules run through everything below:

- **Grades are computed, never typed.** A grade comes from the scheme's bands and the programme's
  aggregation, both declared by the installed curriculum pack. A human can *moderate* a grade; that
  keeps the computed value beside the override and its reason.
- **A published report is frozen.** Publishing a batch writes an immutable snapshot. Later mark
  changes, moderation or a template edit cannot alter it; a re-issue is a new version and the old
  one stays readable.

## 1. Check the grading structure before the term

**Academics → Grading** (`/academics/grading-systems`) has three tabs: **Grading Schemes**,
**Education Systems** and **System Config**.

- A **grading scheme** maps a mark or a rubric level to a band and a grade code (A*–G, 9–1, EE/ME/
  AE/BE, division I–IV). Schemes are declared per learning area and level range by the curriculum
  pack.
- Do not invent bands in this screen when the school follows a national scale. If the pack's bands
  are wrong, the correction belongs in the pack (see the [pack authoring guide](pack-authoring.md)),
  with the official source cited — otherwise every school on that pack inherits your guess.

**Academics → Programmes** (`/academics/programmes`) shows what each programme is pinned to: the
pack code, version, and whether the pack is `draft` or `verified`. Every curriculum pack in this
build ships as **draft**, so the status line is not a formality — it means no curriculum officer has
signed the data off.

## 2. Setting up the exam

**Academics → Exam Setup** (`/academics/exam-setup`) has three tabs:

| Tab | What it is for |
| --- | --- |
| **Scheduling** | The exam and its dates. |
| **Subject Papers** | The papers each subject sits, and what each paper is out of. |
| **Exam Sessions** | The sitting: which class, which papers, when. |

The paper settings are what the marks grid reads: a paper declared out of 80 will not accept 90.
Set papers before the first teacher opens the marks grid, because changing a paper's maximum after
marks are entered invalidates the marks already keyed against it.

> A known gap in this build: the exam-session screens still read the older data layer, and the
> canonical marks grid does not consume a session — it writes a mark against a *published
> assessment*. The practical consequence is that a session is a record for the timetable and the
> papers, while what makes a mark column appear on the grid is the assessment the period declares.
> The GP-1 end-to-end spec records this scoping decision in its header.

## 3. Mark entry

**Academics → Marks Entry** (`/academics/marks-entry`) — three tabs:

| Tab | Use |
| --- | --- |
| **Mark Entry v2** | The grid teachers use: a period and a teaching group, one column per assessment. |
| **Student Results** | Per-learner entry for a single learner's marks. |
| **Entry by Token** | Entry with a token, for a marker who should not see the class list. |

The workflow above the grid is the control you own: **Submit marks → Moderate marks → Lock marks →
Publish marks**, with **Reopen with a reason** for a correction after the lock. Moderate and lock
require a reason; the reason is kept with the state change.

Lock a subject as soon as its marks are complete. A lock is the only thing that stops a teacher
editing a mark while results are being computed.

## 4. Verifying the marks

**Academics → Verification** (`/academics/marks-verification`) has two tabs:

- **Cross Check** — compare one assessment's marks against another source or sitting.
- **By Structure** — walk the structure (class → learning area → assessment) and confirm every
  expected cell exists and is complete.

Do this before you compute results. A missing cell becomes a missing learning-area grade, and a
missing learning-area grade becomes an aggregate the parent will question.

## 5. Results and moderation

**Academics → Results** (`/academics/results`). Choose the **Period** and the **Class group**.

- The table shows one row per learner and one column per learning area, plus the aggregate from the
  programme's declared aggregation.
- **Why this grade** opens the engine's trace: the slots, the totals, the band lookup, the
  aggregate. Use it in a parent meeting rather than re-deriving the number by hand.
- **Moderate** records an override with a reason. Use it for a documented correction (a remark, a
  mis-keyed paper), not to move a learner up a band because the parent asked.
- The page states plainly when marks for the class are incomplete — every result below that banner
  is provisional.

**Academics → Analysis** (`/academics/exam-analysis`) has **Exam Analysis** and **Student Analysis**
tabs for subject and learner breakdowns. The Reports module's **Analytics** hub
(`/reports/analytics`) covers teacher, subject and class analysis with exports.

## 6. Report cards and publishing

There are two report screens and they are not the same thing.

**Academics → Report Cards** (`/academics/report-cards`) prepares the printable card: exam, class,
learner, class teacher's comment, head teacher's comment, next term begins, then print.

**Academics → Report Publishing** (`/academics/report-publishing`, page title *Report publishing*)
is the controlled version:

1. **Period**, **Class group**, **Report template** — the templates come from the installed pack
   (for the Kenyan CBE pack: primary term, junior school term, senior school term).
2. **Generate reports** — prepares the batch from the computed results; the bar reports how many of
   how many were prepared and how many could not be.
3. **Review before publish** — every learner is listed; exclude the ones that must not go out
   (unpaid fees, a pending case). Nothing publishes until a reviewer has seen this.
4. **Publish N reports** — freezes the content as a snapshot.
5. The **distribution** card below then offers **Print order** (admission number, surname, house),
   **Print the batch**, **Store PDFs**, **Retry failed**, the print queue with per-learner status,
   and the published-snapshot table with its verification link and version.

Notes that will save you an afternoon:

- Stored PDFs need a print worker. When none is configured the panel says so and the batch prints
  through the browser dialog from the same document.
- A printed card carries a QR verification link. Re-issuing produces a new version; the earlier one
  stays readable, so a parent holding last week's card is not holding a forged one.
- Publishing is per class group and period. A whole-school run is several batches.

## 7. Distributing results

**Academics → Distribution** (`/academics/results-distribution`) has **Exam Gazette**,
**Distribute Results** and **Board Results** tabs: the class gazette, the distribution step, and the
record of external board results (KCSE/KJSEA-style outcomes keyed from the board, not computed by
the school).

Related: **Academics → Report Publishing** is the per-class batch (section 6); **Board Results** is
the national result you did not produce.

## 8. A term's checklist

1. Papers and sessions set (section 2).
2. Marks entered and **submitted** per group (section 3).
3. Verification clean (section 4).
4. Results computed; moderations recorded with reasons (section 5).
5. Report batch generated, reviewed, exclusions justified, **published** (section 6).
6. Cards printed and the distribution recorded (section 7).
7. Next term's fee schedule published before billing (see the [bursar's guide](bursar.md)).

## What the app cannot do yet

- **Board results that feed the school's own reports.** Board Results records them; it does not
  merge them into the term report.
- **A report template editor for a school.** Templates come from the pack; changing one is a pack
  change or a code change, not a screen.
- **Automatic SMS of a report-ready notice.** The distribution panel builds the notice text, but no
  gateway is configured and the guardian portal has no accounts yet.
- **Un-publishing.** A snapshot is final by design; a correction is a re-issue.

---

Menu labels and addresses were checked against `src/modules/academics/moduleDefinition.tsx`, the
hub pages (`ExamSetupPage`, `MarksEntryPage`, `MarksVerificationPage`, `ResultsPage`,
`ReportsPage`, `ResultsDistributionPage`, `GradingSystemsPage`), the report distribution panel and
the English locale files on 2026-10-28. The compute → moderate → publish journey is what
`tests/e2e/gp3-marks-results-report.spec.ts` and `gp4-term-cycle.spec.ts` drive; this review did not
run them.
