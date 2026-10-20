# Demo school

The demo a fresh installation gets, written through the canonical repository instead of the
legacy mock collections.

```ts
import { seedDemoSchool, defaultDemoSchool } from '@/domain/demo';

const result = await seedDemoSchool(repository, defaultDemoSchool());
// { institutionId, created, demoSeeded, counts: { institution: 1, class_group: 6, learner: 12, ... } }
```

`src/data/demo/seedCanonicalDemo.ts` is the application entry point: it opens the canonical
database the pages share and seeds the default school over it. The setup wizard, the onboarding's
demo pathway and the app shell all use it, so a fresh install has canonical rows as soon as the
first migrated page mounts.

## What it writes

Every row goes through the repository, so the entity schema, the invariants of spec 02 §12, the
tenancy rule, the audit trail and the concurrency columns are exercised exactly as they are for a
real school. The learners are admitted through `AdmissionService` (learner, guardians, links,
identifiers and enrolment in one transaction) and the register is taken through
`AttendanceService`.

| Part | Rows |
| --- | --- |
| Structure (always) | institution, campus, calendar, financial year, academic year, its terms, programme, stage, a level per class, a year-scoped class group per stream |
| People | staff and job titles, 12 learners with guardians (two siblings share one guardian), `ke.kemis_upi` identifiers, enrolments |
| Teaching | teaching groups per class group and learning area, their members, teaching assignments, a grading scale |
| Assessment | one published end-of-term assessment per learning area, a mark per learner |
| Finance | fee items, one published fee schedule with its lines, a posted invoice and its lines per learner, a payment with its allocation and receipt for the first three |
| Attendance | one morning register per class group with a mark per learner |

## Idempotency and failure

The structure is looked up by its natural key before it is created, so re-opening the wizard
reuses the school and adds only what is missing. The demo rows are written only when `demo` is set
**and** the school has no learners yet: a real school never receives them.

The whole run is **one transaction** of the repository; every service it calls (the admissions, the
registers) joins it instead of opening a second one. A failure therefore leaves nothing behind - not
a half-built school, not a learner without their guardians, not an invoice without its lines. It
surfaces as `DemoSchoolSeedError` with the substep that was running (`institution`, `structure`,
`staff`, `curriculum`, `learners`, `teaching`, `assessment`, `fees`, `register`) and the counts the
attempt had reached, so a caller can see how far it got and where it stopped.

## What stays legacy

The module `mockData.ts` files and `services/database/demoDataSeed.ts` still exist: the pages that
carry a `GAP(P1-E0x)` marker read legacy collections (inventory, library, nutrition, payroll, the
finance ledger, admission applications, student categories, dormitories), and the legacy demo
seeder is the only thing that fills them. They are retired when the last of those entities is
modelled, not before. The in-memory mock provider (`useModularMockData`) and the migration hook
that copied its collections into a provider are gone.
