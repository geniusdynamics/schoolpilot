# Integrity and repair

The pre-flight integrity report of spec 08 §5, and the tool that repairs what it finds -
but only when the user says so.

```ts
const report = await runIntegrityReport(adapter);
const result = await applyIntegrityFixes({
  adapter,
  report,
  consent: { findingIds: [finding.id], decisions: { [finding.id]: classGroupId } },
  actor: currentUserId,
});
```

The report only reads. `applyIntegrityFixes` writes only for the findings the consent
names, and every change it writes is recorded in the repository's audit trail.

## The checks

The checks run over the canonical tables of the entity registry, and they are driven by
the storage metadata of A03 (`storageFor(entity).refs`): every column the metadata
declares as a reference is looked at, so an entity that joins the registry later is
covered without a new rule.

| Check | What it finds | How it is found |
| --- | --- | --- |
| `orphan_reference` | a reference that points at a row that is not there | the value is a canonical id, but the target table has no row with it |
| `malformed_reference` | a reference that does not hold an id the model can use | the value is a legacy number, `NaN`, an empty string, a space, or any id that is not a UUIDv7 |
| `null_stream` | a row the model puts in a class group, but which has none | a required reference to the class-group table is empty, or a learner has no enrolment at all |
| `duplicate_id` | the same id on more than one row | the primary key column groups by more than one row |

Every finding names the entity, the column, the offending value and the row it sits in,
so a human can judge the fix before it runs.

### The null-stream rule, in full

The class group of a learner is its enrolment (the P1 model makes the enrolment the
source of the current class). The rule has two halves:

- a **row** that the model puts in a class group - a reference to the class-group table
  that the model requires - must not be empty;
- a **learner** whose status is exactly `enrolled` must have an enrolment. A learner whose
  status is `suspended`, `applicant`, `withdrawn`, `graduated` or anything else is not
  reported: the rule only speaks about the learners the model says are in a class, and a
  suspended learner is not one of them.

A row that is archived (`deleted_at` is set) is never reported: the model does not hold
it, so its references do not matter.

### The shape of the table, not the shape of the model

The canonical DDL is CREATE-only, so a table that predates the model keeps the shape it
had. The checks read the live shape (`PRAGMA table_info`) and only look at the columns the
table really has: a reference column the legacy table does not have is not checked, and a
column the legacy table has but the model does not know is not touched. A table the
database does not hold is reported as missing, not as an error.

## The fixes

A fix is a proposal. It is applied only when the user consents to the finding it belongs
to, and it says plainly what it does.

| Fix | What it does | When it is offered |
| --- | --- | --- |
| `replace_reference` | points the reference at the row the user chooses, or clears it | the model allows the field to be absent |
| `set_reference` | points the reference at the row the user chooses | the model requires the field |
| `create_enrolment` | creates the active enrolment a learner needs to be in a class | the learner has no enrolment |
| `rekey_duplicate` | gives the second row of a duplicate id a new UUIDv7 | the table holds the same id twice |

### The tool does not guess

A legacy number in a reference column says which row it meant to a human who remembers
the old system, and to nobody else. The tool refuses: it offers the live rows of the
target table as choices and writes the one the user picks, or it writes nothing. The same
holds for the class group of a learner without one: the tool creates the enrolment, with
the year, level and programme of the class group the user names, and it says so in the
description of the fix before anything is written.

The choices a fix offers are the live rows of the target table, and a column the model
allows to be absent can also be cleared - that is one of the choices, not a fix of its
own. The list is complete: a row the user cannot see is a row the user cannot choose, so
nothing is hidden behind a limit. The rows are ordered by their label, with the id as the
tiebreaker.

### The choices that are not available

Two kinds of row are not a choice, and the tool says which:

- an **archived** row (`deleted_at` is set) is not part of the live model, so a reference
  that points at one points at a row the model does not hold. The tool refuses such a
  choice, and it refuses one that is named by hand as well;
- a **class group of another level or academic year** would break spec 02 §12.2 - the
  class group of an enrolment carries the same level and academic year. The repository
  refuses such a row, so the tool marks the choice as not available and refuses it when
  it is named by hand.

The choices that are not available are shown with their reason, not hidden.

### The consent model

```ts
interface RepairConsent {
  /** The findings the user consented to fix. A finding that is not named is never touched. */
  readonly findingIds: readonly string[];
  /** The decisions the user made, keyed by finding id. */
  readonly decisions?: Readonly<Record<string, string>>;
}
```

- A finding that is not in `findingIds` is not touched, however good its fix looks.
- A fix that needs a decision the user did not make is skipped, and the result says what
  it needs.
- A dry run (`dryRun: true`) reports the same changes and writes nothing at all - not
  even the audit table.
- Every change is written to the `audit_event` table of the repository, in the change's
  own transaction, with the row before and the row after.

No fix deletes a row. A fix that rewrites a row says so in its description, and the audit
event holds the row before and the row after, so the change can be read back - and undone
by hand - from the trail.

## The page

`src/modules/settings/pages/DataIntegrityPage.tsx` renders the report, groups the
findings by kind, shows the proposed fix of every finding and applies the fixes the user
ticked. It uses the repository's own confirmation dialog, never `window.confirm`.

The page takes the storage it reads as a prop. The application has no repository yet
(P1-E01 onwards wires the modules to one), so the page says that the data layer is not
connected when it is rendered without one.

## Known limits

- **The report reads every row.** It is a maintenance task, not a page load: it walks
  every table of the registry and every reference column of every table it finds.
- **A JSON list of ids is not checked.** Only the scalar reference columns are resolved,
  the same way the repository resolves them.
- **A reference the model does not declare is not checked.** A legacy column such as
  `current_class_stream_id` is outside the canonical model; the migration that retires it
  owns those rows.
- **A row whose own level or year matches no class group is not repairable by the
  reference fix.** The tool points the row at a class group of its level and year, and it
  refuses to move the row into another level or year. When no class group of the row's
  level and year exists, the level or the year of the row has to be repaired first.
- **The commit sequence of a repair is its own.** The repair writes into the audit table
  of the repository, but it is not the repository, so it numbers its audit events from the
  highest sequence the table holds.
- **The tool writes to the tables it reads.** It does not go through the repository's
  write path, because the write path is what refuses the rows the tool exists to repair.
  Two consequences follow. The repository's change feed never sees a repair, so a watcher
  or a screen that reads through the query cache stays stale until it refetches; and the
  repository's guards - the invariants of spec 02 §12 - do not run over a repair either.
  The tool therefore checks the invariants it can see itself (the class-group alignment of
  §12.2, and the live/archived rule) and refuses what it cannot.
- **A report that is applied twice records two events.** The consent answers a report, not
  a row: a report that is applied after the row was already repaired records a second
  audit event whose "before" already holds the repaired value. The original value is still
  in the first event, so the undo path survives - but the second event does not describe
  the original change.

The legacy class-stream repair of P0-C04 lives next to this module
(`repairCorruptStreams.ts`): it works on the legacy classes and streams, not on the
canonical model.

## Tests

`src/domain/repair/__tests__/` runs against a real `better-sqlite3` database. The fixture
is audit-era data: a learner table without a primary key, references that hold legacy
numbers, a learner that is in no class and a duplicated id. There is no storage double in
the suite.
