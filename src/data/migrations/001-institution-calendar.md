# M1 — the institution and the calendar

Migration M1 turns the legacy calendar data into canonical rows. It is the first migration that
moves real data, so it is also the one that establishes the conventions the later migrations
(M2 class groups, M3 learners and enrolments) and the repair tool (C06) rely on.

- The migration: `001-institution-calendar.ts` (the `Migration` object, the writer, the tables).
- The source: `001-legacy-calendar.ts` (the legacy tables, the row accessors, the id key).
- The plan: `001-calendar-plan.ts` (the context, the assembly), `001-organisation-plan.ts` (the
  institution, the calendars, the financial years), `001-academic-plan.ts` (the academic years,
  the academic periods), `001-calendar-status.ts` (the statuses and the issues).
- The verification: `001-calendar-verification.ts` (the checks, the counts, the report).
- The fixture: `001-legacy-fixture.ts` (the legacy database the tests run against).
- The tests: `001-institution-calendar.test.ts`, `001-institution-calendar-cases.test.ts`.

## The legacy rows it reads

| Legacy table | Canonical entity | Notes |
| --- | --- | --- |
| `school_details` | `institution` | One row: the school profile. |
| `school_details` | `institution_identifier` | The school code, under the scheme `legacy.school_code`. |
| `academic_year_structures` | `calendar` | One calendar per year structure. |
| `academic_years` | `academic_year` | The dates are kept; the structure becomes the calendar. |
| `school_periods` | `academic_period` | The dates are kept; the definition gives the kind and the sequence. |
| `financial_years` | `financial_year` | The dates are kept; the legacy status becomes the canonical one. |
| `academic_period_definitions` | — | Read for the kind and the sequence; not a canonical entity (spec 02 §13). |
| `dormitories` | — | Read for the count only: a school with dormitories is a boarding school. |

The legacy ids are numbers and the legacy columns are TEXT, and the legacy provider binds the
numbers as doubles — so the database holds `1.0` where the seed data says `1`. The migration
normalises an id before it compares or stores it: `1.0` and `1` are one id, and an id that is not
a number is left exactly as it is.

## The mapping rules

| Legacy | Canonical | Rule |
| --- | --- | --- |
| `school_details.name` | `institution.name` | Required. |
| `school_details.town` | `institution.region` | The canonical model has no city. |
| `school_details.school_type` | `institution.ownership` | `Public`/`Private`/`International` map one to one. |
| `school_details.school_gender` | `institution.gender_policy` | `Mixed`/`Boys Only`/`Girls Only`. |
| `academic_years.structure_id` | `academic_year.calendar_id` | The structure's canonical calendar. |
| `school_periods.academic_year_id` | `academic_period.academic_year_id` | The year's canonical id. |
| `academic_period_definitions.name` | `academic_period.kind` | The name names the kind: term, semester, trimester, half term, quarter. |
| `academic_period_definitions.sequence_order` | `academic_period.sequence` | The sequence inside the year. |
| — | `academic_year.status` | The year the migration day falls in is the current one; the years that have not started are planned; the years that have ended are closed. |
| — | `academic_period.status` | The period of the current year that covers the migration day is the current one; at most one period per year. |
| `financial_years.status` | `financial_year.status` | `Open` becomes current, planned or closed, by the date; `Closed` and `Archived` become closed. |
| — | `academic_year.financial_year_id` | The financial year that covers the first day of the academic year. |

The legacy `school_periods.is_active` marked the term the school was in. The dates decide the
status, and the mark is read against them: when it does not cover the migration day, the plan
reports `stale_active_flag` and says which year the mark points at.

The values the legacy data never carried — country, locale, time zone, currency, ownership when
the school type is empty, the gender policy when the school gender is empty, the boarding policy
when the school has no dormitories, `is_reporting` and `is_billing` — are the platform defaults
(`DEFAULT_INSTITUTION_DEFAULTS`) or a rule the legacy app followed. **Every one of them is
recorded as an assumption in the report**, so nothing is decided silently.

## What it refuses to do

The migration never invents a value. A legacy row it cannot map is **reported**, not repaired and
not dropped silently:

- an academic year without a start or an end date, or one that ends before it starts;
- an academic year whose year structure the legacy database does not hold;
- a period whose academic year or whose period definition the legacy database does not hold;
- a period without dates, or one that ends before it starts;
- a period definition whose name names no kind the canonical model knows;
- a financial year without a name or dates, or with a status the canonical model does not know;
- a school profile without a name, or with a school type or school gender it does not know.

A date that does not match the legacy row is an **error**: the migration refuses to commit. A
period that lies outside its academic year is the legacy school's own inconsistency — the seed
data has one in every year — so the migration copies the dates faithfully and reports the
violation instead of inventing a date that would satisfy the rule.

A **school that cannot be migrated stops the migration**. Without an institution no other row
can be attached to one, so the run fails, the transaction rolls back with its ledger row, and the
error message names the reason. The operator fixes the legacy row and runs the migration again;
they never have to read the report and roll back by hand.

## The id map

`_legacy_id_map` records which canonical row a legacy row became, so the later migrations can
follow a reference from the legacy data:

| Column | Meaning |
| --- | --- |
| `legacy_table` | The legacy table the row came from. |
| `legacy_id` | The legacy id, **normalised** (see below). |
| `canonical_entity` | The canonical entity the row became. |
| `canonical_id` | The new UUIDv7 id. |

**The map is keyed by the normalised legacy id.** The legacy provider binds the numeric ids as
doubles into TEXT columns, so the database holds `1.0` where the seed data says `1`; a lookup
with the raw value (`'3.0'`) finds nothing. A later migration **must normalise the reference
before it looks the id up**:

```ts
import { legacyKey, legacyRef } from '@/data/migrations/001-legacy-calendar';

// From a legacy row: the key the map is written under.
const key = legacyRef(legacyRow, 'academic_year_id');   // '3', not '3.0'

// From a value the caller already has:
const same = legacyKey(value);                           // '3', not '3.0'

// Then the lookup.
const row = await adapter.get<{ canonical_id: string }>(
  `SELECT canonical_id FROM "_legacy_id_map"
    WHERE legacy_table = ? AND legacy_id = ? AND canonical_entity = ?`,
  ['academic_years', key, 'academic_year']
);
```

`legacyId(row)` gives the same key for a legacy row's own id. `legacyKey` is exported for
exactly this: a later migration that looks a reference up with the raw legacy value finds
nothing.

A legacy row can become more than one canonical row: the school profile becomes the institution
and, when it carries a school code, the institution identifier as well. The primary key is
therefore `(legacy_table, legacy_id, canonical_entity)`.

## The report

The migration leaves three tables behind:

| Table | Holds |
| --- | --- |
| `_legacy_id_map` | The mapping above. |
| `_legacy_unmappable` | The legacy rows that could not be mapped, with the reason. |
| `_legacy_migration_notes` | The assumptions the migration made and the problems it found. |

A note has a severity, and the severity means something:

| Severity | Meaning |
| --- | --- |
| `info` | An assumption: a value the migration applied where the legacy data had none. |
| `warning` | A problem the legacy data carried. The migration still commits; the repair tool (C06) can fix it. |
| `error` | A problem that stops the migration: the run fails and the database keeps the state it had. |

`readMigrationReport(reader)` reads the tables back and adds the verification: the counts before
and after, the checks that every canonical date is the legacy date, and the count check that
every legacy row either became a canonical row or was reported — the institution identifier
included.

## The repository invariant the migration writes around

The repository refuses an academic period that ends after its academic year: it throws a
`RepositoryInvariantError` with the invariant `academic_period.no_overlap` and the issue "the
period ends after the academic year" (spec 02 §12.3). The P0-era seed data breaks that rule in
every year — the third term ends weeks after the year does.

The migration writes those rows **on purpose and on the record**: it writes through the
migration context, never through the repository, so the repository invariant is deliberately
bypassed for the rows the legacy data already breaks. It does not repair the dates, because
repairing them would rewrite the school's calendar without telling anyone. Instead it copies the
dates faithfully and reports each violation as `period_outside_academic_year` in
`_legacy_migration_notes`, where C06 can find it. The violation is a warning, not an error: the
row is migrated, and the report says what is wrong with it.

## The rollback

`down` deletes the canonical rows the id map points at and drops the three tables. The legacy
tables are never written, so a rollback returns the database to the state before the migration.
