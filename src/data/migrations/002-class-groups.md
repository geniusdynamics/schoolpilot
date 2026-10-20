# M2 — the classes, the streams and the class groups

Migration M2 turns the legacy classes and streams into canonical **levels** and **year-scoped
class groups**. It is the first interactive migration: the class-to-level decision cannot be
read off the legacy data reliably (`Form 1`, `Grade 7` and `Year 8` all name a grade, and a
legacy stream carries no year at all), so the operator confirms the mapping before M2 writes
anything.

- The migration: `002-class-groups.ts` (the `Migration` object, the writer).
- The mapping: `002-level-mapping.ts` (the legacy source, the proposal rule, the confirmed
  table and its persistence).
- The step: `src/components/migration/LevelMappingStep.tsx` (what the operator sees).
- The plan: `002-class-groups-plan.ts` (the confirmed decisions become canonical rows).
- The verification: `002-class-groups-verification.ts` (the counts, the level and year of
  every row, and every learner).
- The fixture: `002-legacy-fixture.ts` (the legacy database the tests run against).
- The tests: `002-class-groups.test.ts`, `002-level-mapping.test.ts`,
  `src/components/migration/__tests__/LevelMappingStep.test.tsx`.

## The legacy rows it reads

| Legacy table | Canonical entity | Notes |
| --- | --- | --- |
| `classes` | `level` | One level per class. A class with no streams also becomes one default class group. |
| `class_streams` | `class_group` | One class group per stream, in the academic year the operator confirms. |
| `classes.streams` | `class_group` | The nested copy; a stream only the nested array holds still becomes a class group. |
| `students` | — | Read for the count and for the stream each learner points at; M2 writes no enrolment (C03 does). |

The legacy numeric ids are stored as doubles in TEXT columns (`1.0`), so every key the
migration uses is normalised with `legacyKey` from M1. The id map is written under `1`, and a
learner reference of `1.0` resolves to it.

## The interactive mapping

The step reads the legacy classes, streams and learners and proposes:

- **the level** from the class name (spec 02 §13: "classes map to levels by name match + user
  confirmation"):
  - a name that carries a system word and a number (`Form 1`, `Grade 7`, `Year 8`,
    `Standard 4`) names the level: the same word with the number, the code `FORM-1`, and the
    ordinal the number gives. **High** confidence.
  - a name that carries a number anywhere else (`Senior 3`) keeps the name, takes the code
    from the name and the ordinal from the number. **Medium** confidence.
  - a name without a number (`Senior`) takes the class's position in the list as its ordinal.
    **Low** confidence; the operator has to look at it.
  - the class with the highest ordinal is proposed as the final level.
- **the academic year** for each stream:
  - the year that covers the migration day. **High** confidence.
  - otherwise the year marked `current`. **Medium**.
  - otherwise the latest year that had ended. **Medium**.
  - otherwise the earliest year to come. **Low**.
  - a database with no academic year proposes none, and the step says so.

The operator can correct the level name, code and order, the final-level flag, and the
academic year of every stream. The step's **Confirm the mapping** button writes the decisions
to `_legacy_level_mapping`, a table of its own. Confirming replaces the saved set, so the
mapping is one decision, not a merge of two.

| Column | Holds |
| --- | --- |
| `legacy_class_id`, `legacy_stream_id` | The legacy row, normalised. `''` for a class with no streams. |
| `legacy_class_name`, `legacy_stream_name` | What the step showed, so the decision is readable years later. |
| `stage_code`, `stage_name`, `stage_sequence` | The stage the level goes in. |
| `level_code`, `level_name`, `level_ordinal`, `level_is_terminal` | The level the class becomes. |
| `academic_year_id` | The year the stream's class group belongs to. |
| `level_confidence`, `level_rule`, `year_confidence`, `year_rule` | The proposal the operator saw. |
| `operator_corrected` | Whether the operator changed the row. |
| `confirmed_at`, `confirmed_by` | When, and by whom, the decision was confirmed. |

The step saves through the adapter in one transaction, so a half-written mapping cannot exist.
It writes no canonical row: the campus, programme, stage, levels and class groups are M2's.

## The canonical rows M2 writes

| Entity | Rule |
| --- | --- |
| `campus` | The main campus the database holds, or `Main Campus` when it holds none. |
| `programme` | The programme for the calendar of the first year the decisions name, or `Migrated programme` (`legacy` / `1`, active) when the database holds none. |
| `stage` | The stage the decisions name (`LEGACY` / `Legacy classes`), or the existing stage with that code. |
| `level` | One per legacy class: the confirmed code, name, ordinal and final flag. |
| `class_group` | One per legacy stream (or one per streamless class), named after the stream, in the confirmed academic year, campus, programme and level. |

Every row gets a fresh UUIDv7 id generated inside the migration's transaction. The legacy class
teacher is a legacy staff id, and staff is C04's migration, so `homeroom_teacher_ids` is written
empty and the assumption is recorded.

A class group whose name would repeat inside one level and year gets the legacy stream id as a
suffix (`A (7)`), and the change is recorded as a warning. A name longer than 100 characters is
cut and the cut is recorded. The migration never silently renames a class.

## The id map

M2 appends to M1's `_legacy_id_map`:

| `legacy_table` | `legacy_id` | `canonical_entity` | `canonical_id` |
| --- | --- | --- | --- |
| `classes` | the class id | `level` | the level id |
| `class_streams` | the stream id | `class_group` | the class group id |
| `classes` | the class id | `class_group` | the default class group of a class with no streams |

C03 follows a learner's `current_class_stream_id` through the third row. The key is the
normalised id, as M1's contract requires.

## What it refuses to do

- **No confirmed mapping**: the migration refuses to run before the step has saved one.
- **A class the mapping does not cover**, or two decisions for one class that name different
  levels: the run fails before writing, because the operator confirms the mapping, not the
  migration.
- **Nothing mapped**: a run that would write no class group fails; an empty migration is a
  migration that silently lost the school's classes.
- **A legacy row it cannot map** is reported in `_legacy_unmappable`, never dropped:
  - a stream whose class the legacy database does not hold;
  - a stream whose confirmed academic year the canonical database does not hold (or none);
  - a level the canonical model cannot store (empty code or name, a negative order);
  - a class whose level code another class already took.
- **A learner whose stream is gone** is reported in `_legacy_migration_notes` as a warning
  (`learner_without_class`), with the learner's admission number and the missing stream. The
  learner is not invented into a class group.

The warnings are reported and the migration still commits; an error stops it. The migration
writes the report and then verifies it, so a report that does not add up fails the run.

## The acceptance

> Every learner keeps their class.

The migration enforces it three ways:

1. **In the plan**: every learner whose stream the legacy database holds is resolved through
   the mapping, and the class group's level and year are compared with the decision. A
   mismatch is an error.
2. **In the verification**: the same check is re-read from the database. Every learner gets a
   `learner_class` check; a learner without a class group is a warning, not a silent pass.
3. **In the fixture test**: the test reads the learners, resolves each stream through
   `_legacy_id_map` with the normalised key, and asserts that all 52 seed learners resolve and
   that each class group is in the level and year of the learner's legacy class. The awkward
   cases are in the fixture: a learner pointing at a stream that does not exist (reported), a
   stream with no learners (still migrated), and two streams called `A` in different classes
   (two class groups, two levels).

## The rollback

`down` removes exactly what the migration created. Every canonical row M2 writes is recorded
in `_legacy_migration_created`, so the rollback deletes the class groups, levels, stages,
programme and campus it created, in the order the foreign keys need, and leaves a campus,
programme or stage it found alone. It also deletes its id-map rows, its unmappable rows and
its notes, and drops the created-rows table. The legacy tables are never written.

The confirmed mapping is **not** deleted: it is the operator's decision, it is auditable, and
a re-run of the migration uses it without asking again.
