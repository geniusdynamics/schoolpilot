# Demo school

The sample school a fresh installation can start from, written through the canonical repository and the
domain services instead of the legacy mock collections. It is built to be *looked at*: every situation a
school meets in a year is somewhere in it, so a walk through the app has something to show on every
page.

```ts
import { seedDemoSchool, defaultDemoSchool } from '@/domain/demo';

const result = await seedDemoSchool(repository, defaultDemoSchool(), {
  packDocument: shippedPackDocument, // from '@/components/setup/packs/packLibrary'
});
// { institutionId, created, demoSeeded, counts: { learner: 33, invoice: ..., payment: ... } }
```

The default demo runs the Kenyan CBE pack (`curriculumPack: 'ke-cbe'`): its classes are Grade 7 to 9
under the pack's level codes (`G7`, `G8`, `G9`), the programme is pinned to the shipped version, and the
head teacher installs the pack through the pack registry once the logins exist. The promotion run reads
its rules from that install. The pack document comes from `packDocument`, so the domain never reaches
into the pack library itself; a pack the installation cannot produce fails the seed.

`src/data/demo/seedCanonicalDemo.ts` is the application entry point: it opens the canonical database
the pages share, seeds the school over it and writes the `school_details` profile the header and the
receipts read. The setup wizard's "sample data" step and the onboarding's demo pathway both use it.

## What it writes

The **structure** is written on every run, demo or not: institution, campus, calendar, financial year,
academic year with its terms (numbered from 1, which is what an invoice prints), programme, stage, a
level per class and a year-scoped class group per stream. A blank school gets this and nothing else.

The **sample school** is written only when `demo` is set and the school has no learners yet, in the
order its life happened:

| Step | What it holds |
| --- | --- |
| `history` | last year: a closed academic year, its financial year, its three terms and the same class groups |
| `staff` | 18 people: head and deputy, teachers (permanent, board employed, contract; two started this year), a bursar, secretary, librarian, storekeeper, technician, cook, driver, watchman and a nurse; 11 departments, each with its head; a class teacher for every class |
| `learners` | 33 learners in 35 guardians, admitted in the year they joined, promoted into this year, graduated, transferred, expelled or suspended (see the cast) |
| `curriculum`, `teaching` | nine core learning areas, three electives, seven sports and clubs; English and Science split into papers; two grading scales; a teaching group for every area at every level, the electives and the clubs with the learners who chose them |
| `assessment` | one exam per core area per term: past terms published with every mark in, this term's end-of-term exam open and part entered (some areas in full, one for the first stream only, some not at all) |
| `fees` | twelve fee items each with a GL revenue account and a place in the payment order; published schedules for last year and this; next year, with a class group for every class of this one so a promotion run has somewhere to place each learner, and its schedules at draft, submitted and approved; discount rules and sponsorships; a billing run for every term so far, with a bus fare, uniform, library fines and an opening balance on the invoices that carry them |
| `payments` | what each family did about each term (below), through the payments and adjustments services |
| `register` | ten school days of registers for every class, with lateness, absence, clinic days and a suspension |
| `pastoral` | conduct incidents, a suspension with its disciplinary leave, clinic visits, a medical leave |
| `departures` | the learners who have left take the status their story ends in |

### The cast

`cast.ts` is the people as data. Each learner exists to show something the notes of the old system asked
a demo to carry, and says so in a comment:

- **Families**: siblings in different classes sharing both parents (one household); twins in one class;
  two learners each with their own mother and father; two single mothers and two single fathers; a
  learner with only a grandparent; a teacher's child, a support staff member's child and the
  proprietor's child.
- **Standings**: cleared; owing this term; owing across two terms; owing across years; paid ahead;
  paid in instalments; a bounced cheque; a half-fee, quarter-fee and fully waived discount; a bursary;
  and, for the alumni, a refund paid and one waiting, a write-off requested and one approved, one
  cleared to leave and one refused.
- **Fates**: current, suspended, graduated (alumni), transferred out, expelled.

The cast is placed *relative to the school's levels* (the lowest, the one above, the terminal one), so
the same people fill a school of two levels or of three.

### What it goes through

Rows are written through the repository, and the learners, the invoices, the payments and the registers
through the services the pages use, so the schema, the invariants, the audit trail and the ledger are
exercised for real:

| Row | Written by |
| --- | --- |
| learner, guardians, links, identifiers, first enrolment | `AdmissionService` |
| promotion into this year, graduation, transfer, expulsion | `EnrolmentService` |
| invoices, their lines, numbers and journal entries | `BillingRunService` |
| payments, receipts, allocations, cheque lifecycle, ledger postings | `PaymentsService` |
| discounts, refunds, write-offs, clearances | `AdjustmentsService` |
| registers, incidents, clinic visits, leave | `AttendanceService` |

The ledger of the finished school balances (debits equal credits), and every learner's documents agree
with it; both are tests.

## The day it is set on

`today` (default: the day of the run) decides what is history. Terms that ended before it are billed,
paid and examined; the term holding it is current; terms after it have not begun, and a story that ends
after a later term is not told yet. Seeded in the first term, the school has last year and one term;
seeded after the last term, it has two full years of history.

## Idempotency and failure

The structure is found by its natural key before it is created, so re-opening the wizard reuses the
school. The sample rows are written only when the school has no learners.

The whole run is **one transaction** of the repository, and every service it calls joins it, with the
ledger and the sequences bound to the same transaction. A failure leaves nothing behind: not a half-built
school, not a learner without their guardians, not an invoice without its journal entry. It surfaces as
`DemoSchoolSeedError` with the step that was running and the counts it had reached. `onProgress` is told
each step as it begins, which is how the onboarding shows what a long install is doing.

## What stays legacy

The library, inventory and procurement, nutrition and meals, payroll, transport routes, pocket money and
dormitories are not canonical entities yet. Their pages read legacy collections and the legacy seeder
(`services/database/demoDataSeed.ts`, `services/dataGeneration`) is the only thing that fills them. The
people in those collections are not the people of this school, which is the cost of the transition and the
reason the sample school does not pretend to cover them. The legacy mock paths are retired when the last
of those entities is modelled.

## Known limits of the products it was written against

Writing a school at this volume exposed some limits of the app. They are recorded, with what was done
about each, in `docs/audits/setup-and-demo-defaults-2026-11-01.md`.
