# Head teacher's guide

What the head teacher or principal uses SchoolPilot for: to see the school as it actually is, to
approve the decisions that need a second signature, and to read the numbers before a board meeting.

Written for the head. Each section gives the sidebar path and the address; some sidebar entries have
no English label yet and display as their translation key, so the address is the reliable part.

The first thing to know: a dashboard is meant to show **real data or an explicit empty state**, never
sample numbers — the finance dashboard states that in its own source. The exception is a deliberate
one: a school that chose **Explore with Demo Data** is looking at a sample school. If a real
installation's dashboard is empty, the school has no records of that kind yet; it is not a rendering
problem.

## 1. The home dashboard

**Dashboard** (`/dashboard`). It is the landing page after sign-in and the one screen with the
school name in the header on every page. The coloured **TEMPORARY DATA** badge in the header means
the browser opened a throwaway database: nothing you type will survive a reload. Stop and call the
administrator (see [the administrator's guide](administrator.md)).

Each module has its own dashboard at its root address — Administration, Admissions, Academics,
Finance, Reports and Settings all have one. A module dashboard is the summary of that module, not a
second copy of the school-wide one.

## 2. Reports: the school in numbers

**Reports** (`/reports`) is the reporting module. Its hubs:

| Hub | Address | What is in it |
| --- | --- | --- |
| **Student Reports** | `/reports/student-reports` | **Masterlist**, **Class Lists**, **Teacher Assignments**, **Financial Summary**, **Votehead Statement**, **Exam Results** tabs. |
| **Finance** | `/reports/finance` | **Fees Due**, **Students Paid**, **Votehead Statement** tabs. |
| **Analytics** | `/reports/analytics` | **Teacher Dashboard**, **Subject Analysis**, **Class Analysis**, **Exports**, **Trends** tabs. |
| **Analysis v2** | `/reports/analysis-v2` | The newer analysis screen. |
| **Exam Results** | `/reports/exam-results-horizontal` | Results laid out per learner across subjects — the shape a board folder takes. |
| **Fee Collection Summary** | `/reports/fee-collection-summary` | Collection by period. |
| **Student Financial Summary** | `/reports/student-financial-summary` | One row per learner. |
| **Student Votehead Statement** | `/reports/student-votehead-statement` | Charges per vote head per learner. |
| **Account Ledger** | `/reports/account-ledger` | The ledger view. |

**Class Lists** is the one to print for a new term: it is built from the class group's enrolments,
so it agrees with what the teachers see.

## 3. Approving the year-end promotion

**Administration → Promotion Run** (`/administration/promotion`). This is the single most
consequential screen in the system: it moves every learner and carries balances.

1. The exams officer or registrar computes the suggestions and settles every learner, including the
   conflicts the page lists under *A human still has to decide*.
2. **Approve run** — only a head teacher or an administrator may approve; the page says so when the
   signed-in role cannot. Approval is recorded with the approver.
3. **Commit run** — writes the new class lists, the stage transitions, the graduates and the carried
   balances. The committed record lists promoted, repeated, graduated, overridden and carried-balance
   counts.
4. **Undo run** exists for the period after commit. Once the school is satisfied, do not use it.

Read the override list before you approve. An override without a reason is the thing an audit
picks up first.

## 4. The money

| What you need | Where |
| --- | --- |
| Trial balance, balance sheet, income statement | Finance → **Financial Statements** (`/finance/financial-statements`) |
| Day book, cash book, ledger, journal | Finance → **Accounting Ops** (`/finance/accounting-ops`) |
| Outstanding fees by learner and age | Reports → **Finance** → **Fees Due** (`/reports/finance?tab=fees-due`) |
| Per-learner statement to hand to a parent | Finance → **Statements** (`/finance/statements`) |
| Expenses and suppliers | Finance → **Expenses** (`/finance/expenses`) |

Two structural facts to keep in mind when you read the figures:

- **Fee schedules need an approver who is not the author.** The schedule lifecycle is draft →
  submitted → approved → published, and approval is a separate permission. If you are the approver,
  the bursar cannot also be, by design.
- **Segregation of duties is defined but not enforced everywhere.** The maker/checker pairs are
  written down and tested for receipts, voids and fee schedules; a billing run, a period close and a
  discount do not yet consult them (`src/data/auth/README.md` says which). Until that lands, treat
  those three as processes you check by reading, not controls the system enforces.

## 5. People and the school's operations

| Screen | Address | Use |
| --- | --- | --- |
| **Staff Directory** | `/administration/staff` | Who is on staff, their designations and departments. |
| **Staff Operations** | `/administration/staff/operations` | Staff attendance, ID cards and related actions. |
| **School Life** | `/administration/student-life` | Categories, dormitories, partners, clubs. |
| **Organization** | `/administration/organization` | Departments, designations, clubs. |
| **Academic Calendar** | `/administration/academic-calendar` | Years, terms, period definitions, school periods. |
| **Communication** | `/administration/communication` | Templates and campaigns. No gateway is configured in this build, so a campaign is a record, not a send. |
| **Security & Gate Pass** | `/administration/security` | Visitors and gate passes. |
| **Disciplinary Cases** | `/administration/disciplinary-cases` | Cases and their outcomes. |
| **Certificates** | `/administration/certificates` | Transfer, character and birth certificates. |

## 6. Settings: what this installation is

**Settings** (`/settings`) is the overview: how many accounts can sign in, how many modules are
running, whether the school profile is set, whether the browser keeps the data. It links into the
three hubs:

| Hub | Address | Tabs |
| --- | --- | --- |
| **School & People** | `/settings/school` | **School Profile**, **Users & Roles**, **Workflows**, **Audit Log** |
| **Modules & Features** | `/settings/modules` | **Modules**, **Features**, **Plugins** |
| **Data & System** | `/settings/system` | **Data Layer**, **Sync**, **Backup & Restore**, **Data Integrity**, **System Health** |

Two of these are yours to watch rather than to change:

- **Audit Log** — who changed what. The trail is the record an accusation is settled with.
- **System Health** — the storage, the last backup, sync lag, the pending outbox and integrations.
  If the last backup is "Never", the school has no recoverable copy; that is a conversation with the
  administrator the same day.

## 7. Reading a report card before it goes out

Ask for the frozen one, not the preview: **Academics → Report Publishing**
(`/academics/report-publishing`) lists each published snapshot with its version and verification
link. A card printed from **Report Cards** (`/academics/report-cards`) is a preview of the same
data; only a published snapshot is immutable and carries the QR that a third party can check.

Check on one card of each kind: the learner's name and admission number, the term, every learning
area the class takes, the aggregate, and the comments. A missing learning area is a missing
teaching group or a missing mark, not a template fault.

## What the app cannot do yet

- **Approve from a phone with a signature.** Approval is a signed-in role action, not a
  cryptographic signature.
- **A board pack export in one click.** Use the Exam Results and Analytics hubs and the browser's
  print.
- **Message parents.** No gateway, and guardians have no portal accounts yet.
- **See a colleague's screen.** There is no impersonation.

---

Menu labels and addresses were checked against the module definitions, the reports and settings hub
pages, and the English locale files on 2026-10-28. The promotion approval rule is read from
`src/modules/administration/pages/promotion/PromotionRunPage.tsx` and the GP-5 end-to-end spec; the
dashboard and report screens were not opened in a browser during this review.
