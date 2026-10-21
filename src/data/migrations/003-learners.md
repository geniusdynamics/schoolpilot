# M3 — the learners, the guardians and the enrolments

Migration M3 turns the legacy students and their guardians into canonical **learners**,
**guardians**, **learner_guardian** links, **identifier** rows and **enrolment** rows. It is the
migration the school's people outgrow the old collections in: after M3 a learner exists as a
person with an admission number, a status and a class the enrolment records, not as a `students`
row carrying a class name and a guardian object.

- The migration: `003-learners.ts` (the `Migration` object, the writer, the refusal to run).
- The rules: `003-people-rules.ts` (the phone normalisation, the name split, the statuses).
- The source: `003-legacy-people.ts` (the legacy rows and the canonical class groups).
- The plan: `003-people-plan.ts` (the legacy rows become canonical rows).
- The verification: `003-people-verification.ts` (the counts, every row, every learner's class).
- The fixture: `003-legacy-fixture.ts` (the legacy database the tests run against).
- The tests: `003-learners.test.ts`.

## The legacy rows it reads

| Legacy table | Canonical entity | Notes |
| --- | --- | --- |
| `students` | `learner` | The person, the admission number, the status and the address. |
| `students.current_class_stream_id` | `enrolment` | Resolved through M2's `_legacy_id_map` to a class group. |
| `students.upi_no` | `identifier` | The KEMIS UPI, scheme `ke.kemis_upi`. |
| `students.primary_guardian` | `guardian`, `learner_guardian` | The guardian copy the row embeds; a primary link. |
| `parents_guardians` | `guardian` | One row per person, de-duplicated by phone. |
| `parents_guardians.national_id` | `identifier` | Scheme `national_id`, owned by the guardian. An installation may carry the column; the P0-era schema does not declare one. |
| `student_guardian_relationships` | `learner_guardian` | `is_primary`, `relationship_type`, `can_pickup`, `receives_communication`. |

The legacy numeric ids are stored as doubles in TEXT columns (`1.0`), so every key is normalised
with `legacyKey` from M1. A learner's `current_class_stream_id` of `1.0` resolves to the class
group M2 wrote for stream `1`.

## Guardians are de-duplicated by phone (acceptance 1)

Spec 08 §5 says guardians are de-duplicated by phone, and the legacy data makes that necessary:
siblings repeat the same person across `parents_guardians` and each student's `primary_guardian`,
and the same number is written nationally by one row and with a country code by another. The
migration therefore normalises every legacy number to **E.164** before it compares:

1. The separators a person types are dropped: spaces, dots, dashes, parentheses, slashes.
2. A number that already starts with `+` keeps its digits.
3. A number that starts with `00` replaces that prefix with `+`.
4. A 12-digit number that starts with `254` takes a `+`.
5. A 10-digit number that starts with `0` replaces that `0` with `+254`.
6. A 9-digit number that starts with `7` or `1` takes `+254`.
7. Anything else cannot be normalised, and the row is reported rather than guessed at.

So `0711 223 344`, `0711-223-344`, `254711223344`, `00254711223344` and `+254 711 223 344` are one
phone, and one phone is one guardian. The rule is stored in `_legacy_migration_notes` as an
assumption, and `PHONE_NORMALISATION_RULE` is the same text the code exports. The national format
is Kenya's; an institution whose country is not `KE` gets a warning that the national rule
assumes it. `GuardianService.findByPhone` is **not** used: it compares the number as given, so
`0711…` and `+254711…` would be two people.

The first row that names a phone keeps it; a later row with the same phone is folded into that
guardian and reported as a warning (`guardian_merged`) carrying both names. The canonical
guardian row carries the number once.

**A guardian with no phone is not merged into a bucket of the others.** It cannot be told apart
from a guardian a later row names, so it is reported in `_legacy_unmappable` and no guardian row,
link or identifier is written for it. A guardian whose name is empty, or one word with no family
name the canonical model can read, is reported the same way.

Each canonical guardian is written once, with the given, middle and family names read from the
legacy free-text name (first word given, last word family, the words between them middle names),
the normalised phone, a valid email when the row carries one, and the address the row carries.

## The links

A learner's guardians come from two places: the guardian copy the student row embeds, and the
`student_guardian_relationships` rows. Both name one learner and one guardian, so they are one
`learner_guardian` row, not two:

- `is_primary` is true when either source says so.
- `relationship` is the relationship table's type when it names one, else the embedded copy's.
  The canonical enum is the one spec 02 §6.2 lists: `Father` is `father`, `Mother` is `mother`,
  `Guardian` is `guardian`, a grandparent is `grandparent`, a sibling is `sibling`, a sponsor is
  `sponsor`, and a type the enum does not carry (`Uncle`, `Aunt`, `Cousin`) is `other`.
  A row that names no type is a `guardian`.
- `can_pick_up` follows the relationship table's flag; an embedded primary guardian with no flag
  is allowed to pick up.
- `receives_reports` and `receives_sms` follow the relationship table's `receives_communication`
  flag, and are true when no source carries one.
- The canonical model names **one primary guardian** per learner. A learner with two is reported
  (`learner_guardian_multiple_primary`) and the first stays primary; a learner whose only links
  are not primary gets its first link as its primary, reported
  (`learner_guardian_no_primary`).
- `has_parental_responsibility` is true for the primary guardian and for a mother, father or
  guardian relationship, `is_fee_payer` is true for the primary guardian, and `preferred_channel`
  is `sms`. The legacy row expresses none of these, so the assumptions are recorded.

A learner with no guardian is not an error: the learner and the enrolment are written and no link
is.

## The identifiers (acceptance 2)

- A learner's `upi_no` becomes an `identifier` with scheme `ke.kemis_upi`, `owner_type`
  `learner` and the learner's id as the owner.
- A guardian's `national_id` becomes an `identifier` with scheme `national_id`, `owner_type`
  `guardian` and the guardian's id as the owner. The guardian row also keeps the value in its
  `national_id` column, the field the guardian service reads.
- **One value names one owner.** A value a second owner claims is reported in
  `_legacy_unmappable` and no identifier is written for it; the first owner keeps it. Two legacy
  guardian rows that share a phone are one owner, so their national id is recorded once and not
  reported. The identifier table's own unique key (`owner_type`, `owner_id`, `scheme`, `value`)
  is the model's rule; the migration reports the duplicate rather than letting the insert fail.

## The enrolments

Every learner whose class stream migration M2 mapped gets one enrolment, in the class group the
stream became:

| Column | Rule |
| --- | --- |
| `academic_year_id`, `level_id`, `programme_id` | Read from the class group M2 wrote, so the enrolment sits in the same year, level and programme as its class. |
| `class_group_id` | The class group the learner's `current_class_stream_id` resolved to. |
| `start_date` | The learner's admission date; the academic year's first day when the row carries none, or carries a date after the year the enrolment belongs to and the enrolment ends. |
| `entry_reason` | `new_admission` when the learner was admitted on or after the year's first day (or the row carries no date), `promoted` when they were admitted earlier. |
| `status`, `exit_reason`, `end_date` | From the legacy learner status: `Active` and `Suspended` are `active`; `Alumni` is `completed`/`graduated`; `Transferred` is `left`/`transferred_out`; `Expelled` is `left`/`expelled`; `Withdrawn` is `left`/`withdrawn`. An exited enrolment ends on the academic year's last day. |

The legacy rows hold one class per learner and no per-year history, so M3 writes **one**
enrolment per learner: the current one. A learner admitted before the year therefore carries
their admission date as the enrolment's start and `promoted` as the reason, which is the
migration's record that this class is a continuation. The assumptions are in the report.

A learner whose `current_class_stream_id` is empty, or names a stream M2 did not map, is
**reported** in `_legacy_unmappable` with `canonical_entity = 'enrolment'`; the learner row is
still written, because the class is what is missing, not the learner.

## The canonical rows M3 writes

| Entity | Rule |
| --- | --- |
| `learner` | One per legacy student whose admission number, first name and last name the migration can read. `admission_number` unique per institution; a later row that names a number an earlier one took is reported. |
| `guardian` | One per normalised phone. |
| `learner_guardian` | One per learner and guardian, `is_primary` from the sources, `priority` by link order. |
| `identifier` | One per UPI and one per guardian national id, one owner per value. |
| `enrolment` | One per learner whose stream M2 mapped. |

Every row gets a fresh UUIDv7 id generated inside the migration's transaction. The learner's
`residence_status` comes from the legacy student category (`Boarder`, `Day Scholar`,
`Weekly Boarder`); `previous_school` from `primary_school`; `medical` from a `medical_notes`
column an installation may carry; and `remarks`, `religion`, the category and the dormitory are
kept in `attributes` under `legacy.*`, with the legacy exam summary under `attributes['ke.kcpe']`
(spec 02 §13). `student_type`, `class_admitted`, `stream_admitted` and
`marks_attained_primary` are not carried; the legacy row keeps them and the assumption is on the
record.

## The id map

M3 appends to M1's `_legacy_id_map`:

| `legacy_table` | `legacy_id` | `canonical_entity` | `canonical_id` |
| --- | --- | --- | --- |
| `students` | the student id | `learner` | the learner id |
| `students` | the student id | `enrolment` | the enrolment id |
| `students` | the student id | `identifier` | the UPI identifier id |
| `students` | the student id | `learner_guardian` | the link the student's embedded guardian named |
| `parents_guardians` | the guardian id | `guardian` | the guardian id |
| `parents_guardians` | the guardian id | `identifier` | the national id identifier id |
| `student_guardian_relationships` | the relationship id | `learner_guardian` | the link id |

A canonical row appears in the map once: the map's unique index is on `canonical_id`. A legacy
guardian row that was folded into another because it named the same phone therefore has no map
row of its own; the merge is in the notes instead. A guardian found only in a student's embedded
copy is mapped under `students` with the guardian id the copy carries (or the student's id when
it carries none).

## What it refuses to do

- **No class groups**: the migration refuses to run before M2. A learner's class is the class
  group its stream became; migrating a database without them would write every learner with no
  class at all.
- **No canonical tables, no report tables**: it refuses a database that has not applied the
  canonical schema and run M1, as M2 does.
- **A people table that already holds a row**: the canonical data is newer than the legacy data,
  so there is nothing to migrate.
- **No learner at all**: an empty migration is a migration that silently lost the school's
  learners.
- **A legacy row it cannot map** is reported in `_legacy_unmappable`, never dropped:
  - a student with no admission number, no first name or no last name;
  - an admission number an earlier learner already took;
  - a guardian with no phone, no name, or a one-word name with no family name;
  - a learner whose stream is empty or not one M2 mapped (the enrolment is what is missing);
  - a UPI or a national id another owner already holds.
- **A warning is reported and the migration still commits**; an error stops it. M3 writes the
  report and then verifies it, so a report that does not add up fails the run.

## The report and the verification

`readPeopleMigrationReport(reader)` reads the database back and re-derives the report from the
legacy rows. The counts are:

| Entity | Before | After | Unmapped |
| --- | --- | --- | --- |
| `learner` | the legacy students | the learner map rows | the students that could not become one |
| `guardian` | the distinct guardian identities (a normalised phone, or the legacy row when it has none) | the guardian map rows | the guardians that could not be written |
| `learner_guardian` | the distinct learner-and-guardian pairs | the link map rows | the pairs whose guardian could not be written |
| `identifier` | the distinct identifier values | the identifier map rows | the refused duplicate claims |
| `enrolment` | the learners that could be enrolled | the enrolment map rows | the learners with no mapped stream |

`before = after + unmapped` holds for the first three and for the enrolments; an identifier
value is one row, so its check is `before = after` and a refused duplicate is a claim, not a lost
value. Every mapping row is checked back for its name, admission number, status, phone, owner,
value or class; every learner gets a `learner_class` check that its enrolment sits in the class
group's year, level and programme; and a stray row (one the map does not name) is an error.

## The acceptance in the fixture

The fixture is the P0-era seed plus the drift an installation can hold:

- the 52 seed learners, whose streams M2 mapped, and the learner M2 reported with a stream that
  does not exist;
- 25 seed guardians across 11 phones, so the de-duplication is visible on the seed data itself;
- a sibling pair whose guardian is written `0712345678` by one row and `+254 712 345 678` by the
  other: one guardian, two links;
- a learner with no class stream, and a learner whose stream is not in M2's map: no enrolment,
  reported;
- two learners who share a UPI: one identifier, one report;
- a guardian with no phone and a guardian with no name: reported, never merged;
- a learner with no guardian: written, with no link;
- an alumnus and a learner who transferred out: `completed`/`graduated` and
  `left`/`transferred_out`;
- a duplicate admission number: reported, not merged.

The fixture test reads the rows back and asserts the guardians (one per phone, one link per
learner), the identifiers and their owners, every enrolment's year, level and programme, the id
map with the normalised key, the counts, the unmappable report and the rollback.

## The rollback

`down` removes exactly what the migration created. Every canonical row M3 writes is recorded in
M2's `_legacy_migration_created` under version 3, so the rollback deletes the enrolments, links,
identifiers, guardians and learners it wrote, in the order the foreign keys need, and leaves a
row it found alone. It also deletes its id-map rows, its unmappable rows and its notes, and its
own rows in the created-rows table. The table itself stays: M2's rows live in it, and a rollback
to version 2 must leave M2 able to undo its own rows later. The legacy tables are never written.
