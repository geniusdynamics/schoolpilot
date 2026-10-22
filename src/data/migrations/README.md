# Migrations

The numbered migration framework the P1 module migrations (C01–C05) run on. It sits on the
SQLite adapter of P1-A04, so the same code migrates a browser database (OPFS through the
wasm worker) and a node database (a file, or a test fixture).

The framework is opt-in for the data migrations: nothing in the legacy start-up path calls it; a
caller creates a runner and runs it. The **module schema migrations** are the exception - the app
applies them while it opens the canonical database, so a module's tables exist before a page can
read them (see [Schema migrations](#schema-migrations)).

```ts
const runner = createMigrationRunner({
  adapter,
  migrations: [migrateCalendar, migrateClassGroups],
  backup: createDumpBackupStrategy(),
});

const result = await runner.run();
if (result.status === 'failed') showTheMigrationScreen(result);
```

## Writing a migration

A migration **declares its SQL**. The declaration is the identity of the migration and a
contract the framework holds the body to.

```ts
export const addTheWidgetTable: Migration = {
  version: 2,
  name: 'add the widget table',
  destructive: true,
  statements: ['CREATE TABLE widget (id TEXT PRIMARY KEY, label TEXT NOT NULL)'],
  async down(context) {
    await context.exec('DROP TABLE widget');
  },
};
```

| Field | Meaning |
| --- | --- |
| `version` | The order and the identity of the migration. Whole number, unique, never reused. The data migrations own 1-99 and the module schemas 100-199. |
| `name` | What the progress screen shows. |
| `statements` | The SQL the migration runs. The framework hashes it and holds the body to it. |
| `checksum` | The identity of a migration whose SQL cannot be declared. |
| `destructive` | `true` means the migration drops or rewrites data, so a backup is taken first. |
| `up` | Applies the migration. Optional when the SQL is declared: the framework runs the statements then. |
| `down` | Undoes the migration. Without it the migration cannot be rolled back. |

A migration body writes through `context` only. The context carries the transaction the
framework opened, so a migration cannot write outside it, and it cannot deadlock on the
adapter's statement queue. The context holds no adapter: every statement goes through
`context.tx`.

### The declaration is enforced

When a migration declares its SQL and also has an `up` body, the framework captures the
statements the body runs and compares them with the declaration. A body that runs
something else is refused, and the migration is rolled back with it:

```ts
{
  version: 3,
  name: 'a migration that lies',
  statements: ['CREATE TABLE gadget (id TEXT PRIMARY KEY)'],
  async up(context) {
    await context.exec('CREATE TABLE widget (id TEXT PRIMARY KEY)');  // refused
  },
}
```

A migration with dynamic SQL has no fixed text to declare, so it states a **checksum of
its own** instead:

```ts
{
  version: 4,
  name: 'copy the class groups into the new table',
  checksum: 'class-groups-copy-v1',
  async up(context) {
    await context.exec('INSERT INTO class_group_v2 SELECT * FROM class_group');
  },
}
```

A migration that declares neither its SQL nor a checksum has no identity - it could not be
told apart from another migration with the same version and name - so the runner refuses
to be built with it.

## The ledger

The framework owns three tables, created on the first run:

| Table | Holds |
| --- | --- |
| `_migrations` | The migrations the database has applied: `version`, `name`, `checksum`, `checksum_kind`, `applied_at`. |
| `_migration_attempts` | The attempts that did not finish: `version`, `name`, `checksum`, `checksum_kind`, `status`, `error`, `attempted_at`. |
| `_migration_backups` | Where the backups live: `id`, `version`, `migration_name`, `kind`, `location`, `created_at`, `bytes`. |

`_migrations` is the only truth about what has been applied. A version that is not in it has
never been applied - not partially, not at all.

## Run, resume, rollback

| Call | What it does |
| --- | --- |
| `run()` | Applies every migration the ledger does not record, in version order. |
| `resume()` | The same work, under the name that says what it is for. |
| `rollbackTo(version)` | Undoes every applied migration above `version`, newest first. |
| `status()` | Reads the ledger and reports where the database stands. |

### Resume semantics

The rules are deterministic, and the tests in `__tests__/` pin every one of them:

1. **A migration body and its ledger row commit together.** The body runs in one
   transaction, and the row that records the migration is written in that same
   transaction. A migration that throws is rolled back with its row: the database keeps
   the state it had before the migration, and the ledger does not mention it.
2. **An interrupted run leaves a trace.** Before a body starts, the framework records the
   attempt in `_migration_attempts` in its own transaction. If the process dies - a crash,
   a closed laptop, a killed tab - the attempt stays behind with the status `running`.
3. **The next run retries the migration.** A migration the ledger does not record was never
   applied, so it runs again from the start. The partial work of the interrupted attempt is
   gone: it was inside a transaction that never committed, and SQLite rolled it back when
   the database was opened again.
4. **A stale attempt is cleared.** An attempt of a migration the ledger *does* record means
   the process died between the commit and the clean-up. The ledger wins: the attempt row is
   deleted and the migration is not run again.
5. **A changed migration is refused.** When the identity of a migration no longer matches
   the one the ledger recorded, the run stops with `checksum_mismatch` and the database is
   not touched.
6. **An unknown migration is refused.** When the ledger holds a version this build does not
   know, the run stops with `unknown_migration`. That is the signal that the database was
   written by a newer build.

`run()` never throws for a failed migration: it returns a result with `status: 'failed'`
and the migration that failed. The error is in the result and in the progress events.

### Rollback semantics

`rollbackTo(version)` undoes the migrations above `version` that the runner owns, newest first.
Each `down` runs in its own transaction, and the ledger row goes with it, so a `down` that throws
leaves the database exactly as it was. The attempt row of a migration that was rolled back goes
with it as well, so a rolled-back migration is not reported as interrupted.

The whole rollback is refused when a migration above the target has no `down`: nothing is
undone, and the result says which migration cannot be rolled back. A rollback to `0` undoes
every migration the runner owns. A ledger row from a band the runner does not run is left where
it is: the ledger is shared, and one band's runner is not the other band's to undo.

### Checksums and their kinds

The ledger records a checksum for every migration and the **kind** of that checksum.

| Kind | How it is established | What it covers |
| --- | --- | --- |
| `declared` | The migration declares its SQL. | The version, the name and the declared statements. |
| `explicit` | The migration states a checksum of its own. | Whatever the author says it covers. |

The declared identity is a hash over the declared SQL text. That text survives minification
byte for byte - the same reason A04 hashes DDL text - so the identity of a shipped
migration does not change with the build.

The kind is recorded so the identity can move in one direction only:

| Recorded | Now | What happens |
| --- | --- | --- |
| `declared` | `declared` | The checksums have to match. |
| `explicit` | `explicit` | The checksums have to match. |
| `explicit` | `declared` | Accepted: the migration states its SQL after it had shipped, which is stronger. The ledger follows and records the declared identity. |
| `declared` | `explicit` | Refused: the identity of a shipped migration cannot be weakened. |

## Schema migrations

The framework carries two bands of migration in one ledger:

| Band | Versions | What it does | Who applies it |
| --- | --- | --- | --- |
| Data | 1-99 | Migrates legacy rows into the canonical tables (P1 C01-C05). | The migration screen, when an operator runs it. |
| Schema | 100-199 | Creates the tables a module owns: sequences, the ledger, reconciliation. | The app, while it opens the canonical database. |

A version is an identity in one ledger, so the bands never overlap. A migration of either band is
recorded in `_migrations` the same way, and the ledger stays the single truth about what has been
applied, whichever band applied it.

### The module schemas are the modules' own DDL

A module declares its DDL (`SEQUENCE_DDL`, `LEDGER_DDL`, ...) and an `ensureSchema` function that
applies it - the path the module's own tests take. The migration does not copy that text:

```ts
export const sequencesSchemaMigration = moduleSchemaMigration({
  version: 100,
  module: 'sequences',
  name: 'the sequence store: counters, issued numbers and device blocks',
  ddl: SEQUENCE_DDL,
});
```

The `up` is the module's declared DDL, unchanged, so the migration and `ensureSchema` cannot
disagree and a copy cannot drift. The `down` is read out of the same text: every `CREATE TABLE`,
`CREATE INDEX` and `CREATE TRIGGER` is found and dropped in reverse. A statement the reader does
not understand refuses the registry when it is built, rather than leaving an object a rollback
would miss.

| Migration | Module | Creates |
| --- | --- | --- |
| 100 | sequences | `sequence_counter`, `sequence_number`, `sequence_block`, the unique number and block-range indexes and the outstanding-block index. |
| 101 | ledger | `journal_entry`, `journal_line`, `ledger_period`, their eight indexes (three of them partial and unique), and the four triggers that make a posted entry and its lines immutable. |

Version 102 is reserved for the reconciliation module (P3-D04: `reconciliation_statement`,
`reconciliation_line`, `reconciliation_match`, its unique indexes and its immutable-match
triggers). It joins the registry when that module lands on this branch. Adding a module is adding
its migration to `SCHEMA_MIGRATIONS`: the startup path, the rollback and the version surface all
read that list.

### Startup

`openCanonicalRepository()` - the one place the app opens the canonical database - applies them
after `repository.setup()` and before it hands the repository to a page:

```ts
await applySchemaMigrations(adapter);
```

A migration that throws is rolled back with its ledger row (each migration is one transaction),
so the database keeps the position it had before that migration. `applySchemaMigrations` then
throws: the open fails, the canonical data layer reports itself unavailable, and the app does not
run against a database it could not prepare. The adapter is closed on the way out.

**DDL is transactional in SQLite, and the suite proves it.** The failure test creates a table and
then runs a statement that fails, and asserts the first table is gone afterwards: inside the
adapter's `BEGIN IMMEDIATE` transaction, `CREATE TABLE` is rolled back by the adapter's `ROLLBACK`
like a row write. The same test asserts the ledger has no row for the failed migration.

**An existing database.** The module DDL is `CREATE ... IF NOT EXISTS` throughout, so a database
where `ensureSequenceSchema` or `ensureLedgerSchema` already ran records the migration and keeps
its rows: the objects are the ones the same constant created. What `IF NOT EXISTS` cannot do is
notice a *different* definition of the same table - a table with the right name and the wrong
columns is left alone. The migration's identity is the hash of that DDL, so a later change to a
module's DDL is refused as a `checksum_mismatch` on the next start instead of being applied
silently; the fix is a new migration version.

### Rolling back

`rollbackSchemaMigrations(adapter)` undoes every schema migration, newest first, and returns the
database to the state before them: the tables, their indexes and their triggers are gone, and the
tables of the other band are untouched. `to` stops above a schema version; the default `0` undoes
the whole band.

A rollback is **not lossless for the rows the module tables held**: `down` drops the tables, and
the rows go with them. The migrations declare themselves `destructive` for that reason, so a
caller that hands the runner a backup strategy gets the framework's backup before a rollback that
would destroy data. Startup passes no strategy: it only runs `up`, where there is nothing to lose.

A data migration's ledger row is never undone by this runner - a runner undoes the migrations it
owns. It is also given the whole known catalog (`knownVersions`), so a row written by a data
migration is not mistaken for one written by a newer build.

### The schema version surface

`readSchemaVersion(adapter)` is what a diagnostics screen reads:

```ts
{
  current: 101,
  latest: 101,
  complete: true,
  applied: [{ version: 100, module: 'sequences', name: '...', appliedAt: '...' }, ...],
  pending: [],
}
```

It only reads: on a database that never opened the framework it reports version 0 instead of
creating a ledger table from a screen that asked a question.

## Backups

A backup is taken *before* the migration's transaction opens, so it holds the database as it
was before the migration.

| Policy | When a backup is taken |
| --- | --- |
| `destructive` (default) | Before every migration that declares `destructive: true`. |
| `always` | Before every migration. |
| `never` | Never. The opt-out. |

A rollback takes a backup too, and the decision covers **every migration the rollback is
about to undo**: a rollback that destroys a destructive migration is backed up like the
migration would have been.

### The strategies

| Strategy | How it exports | Where |
| --- | --- | --- |
| `createDumpBackupStrategy()` | The database is exported as SQL through the adapter. | The `BackupStore` the strategy is given; the default keeps it in memory. |
| `createFileBackupStrategy()` | The database file is copied. Node only. | A directory the caller names. |

The dump strategy is the portable one, and it is the browser path: there the adapter is the
OPFS-backed one, so the export is a snapshot of the database the browser holds. A browser
build that wants the dump to survive a reload gives the strategy a store that writes to
OPFS.

The file strategy lives in `nodeBackup.ts` and is deliberately **not** re-exported from the
package barrel, so a browser bundle never pulls `node:fs` in. A node caller imports it
directly:

```ts
import { createFileBackupStrategy } from '@/data/migrations/nodeBackup';

const backup = createFileBackupStrategy({
  source: '/srv/schoolpilot/schoolpilot.sqlite',
  directory: '/srv/schoolpilot/backups',
});
```

Its `restore` closes the adapter and copies the backup back over the database file; the
caller opens the database again afterwards.

**What the file copy guarantees.** The copy holds every transaction that was committed
before the copy started. In WAL mode the write-ahead log is checkpointed into the database
file first, so the copy is not missing the transactions that were committed after the last
checkpoint. It does not cover a write that commits *while* the copy is being taken, so the
database has to be quiet while the copy runs - the framework takes the backup before a
migration opens its transaction, which is exactly such a moment.

### Retention

The framework keeps the newest `backupRetention` backups (default: 5). When a backup leaves
the window, the strategy's `discard` removes the artefact and the row in
`_migration_backups` goes with it. The retention count is a runner option, so a deployment
that wants the last week rather than the last five backups can say so.

### Restoring

`strategy.restore(backup, adapter)` puts the backup back. The restore **replaces** the
database: every table is dropped, then the dump recreates the tables and their rows. The
framework's own tables are part of the dump, so the ledger comes back with it and the
migrations the backup was taken before are applied again by the next run.

The restore runs in one transaction, so a dump that fails to restore leaves the database
exactly as it was - the tables and their rows survive. A failed restore is a failed
migration, not a lost database.

### The dump

The dump holds the schema and every row. Text is written as a hex blob cast back to text,
which keeps a statement on one line and makes the dump safe to read.

- **Comments do not travel.** A `--` or `/* */` comment in a table definition is dropped
  from the dump. A comment that survived would swallow the rest of the statement when the
  dump is replayed.
- **A dump that cannot be restored is never produced.** The export is checked before it is
  handed out: it is replayed against the database inside a transaction that is rolled back
  afterwards, so every statement is parsed by SQLite for real and the database is left
  exactly as it was.
- **`sqlite_sequence` does not travel.** After a restore the counter of an AUTOINCREMENT
  table is the highest id the dump holds, not the counter the database had.
- **Triggers do not fire during a restore.** The dump recreates the tables and their rows
  first and the triggers afterwards, so the rows land as they are, not as the triggers
  would make them.

## Progress events

The runner emits an event for everything it does. `subscribe` returns the unsubscribe.

| Event | Carries |
| --- | --- |
| `run_started` | `total`, `pending` |
| `migration_started` | `version`, `name`, `index`, `total` |
| `migration_applied` | `version`, `name`, `index`, `total`, `durationMs` |
| `migration_failed` | `version`, `name`, `error` |
| `backup_created` | `backup` |
| `rollback_started` | `from`, `to`, `total` |
| `rollback_applied` | `version`, `name` |
| `rollback_failed` | `version`, `name`, `error` |
| `rollback_completed` | `to` |
| `run_completed` | `applied`, `skipped` |
| `run_failed` | `version`, `name`, `error` |

The progress screen (`src/components/MigrationScreen.tsx`) renders that state: the current
migration, the counts, the failure, and the retry and rollback actions.
`useMigrationStatus(runner)` follows a runner and returns the live status.

The screen is a blocking overlay, so it moves the focus into itself when it appears and
keeps it there while it is up. It offers the applied versions to roll back to, except the
newest one: rolling back to it would undo nothing.

## Errors

| Class | `code` | When |
| --- | --- | --- |
| `MigrationError` | `invalid_migration` | A migration declares both its SQL and a checksum, or the rollback target is not applied. |
| | `duplicate_version` | Two migrations share a version. |
| | `missing_checksum` | A migration declares neither its SQL nor a checksum. |
| | `checksum_mismatch` | The ledger holds a different identity for a migration. |
| | `declared_statements_mismatch` | The body of a migration ran statements other than the ones it declared. |
| | `unknown_migration` | The ledger holds a migration this build does not know. |
| | `migration_failed` | The body threw. |
| | `not_reversible` | A migration above the rollback target has no `down`. |
| | `backup_failed` | The backup could not be taken. |

## Tests

`src/data/migrations/__tests__/` runs against a real `better-sqlite3` database. There is no
storage double anywhere in the suite: the fixture databases are real files and in-memory
databases, and the canonical schema of A03 is applied to them.

| File | What it covers |
| --- | --- |
| `runner.test.ts` | The ordered apply, the no-op re-run, the failed migration, the retry, the edited declaration, the body that runs something else, the missing identity, the checksum kinds, the tightening, the event stream, the status and the rollback. |
| `interruption.test.ts` | A second process that dies half-way through a migration: the partial work is rolled back, the attempt is left behind and the next run retries the migration. |
| `backup.test.ts` | The backup before a destructive migration, where it is recorded, the backup a rollback takes, the retention window and the restore. |
| `dump.test.ts` | The atomic restore, a failed restore that changes nothing, and a table whose definition carries comments. |
| `nodeBackup.test.ts` | The node file copy strategy on a real database file: the copy, the restore and the discard. |
| `canonical.test.ts` | The framework over the canonical schema of A03, and a dump and restore of it. |
| `schema.test.ts` | The module schemas on a real database: a fresh one, one that already holds the tables, the no-op re-run, the rollback, the shared ledger with a data migration, a version from a newer build, and a migration that fails part-way. |
| `schemaStartup.test.ts` | The canonical start-up path applies them: the repository the app opens, then the tables read back from the adapter it opened. |

## Module layout

| File | Holds |
| --- | --- |
| `runner.ts` | The runner: the ordered apply, the resume, the ledger bookkeeping. |
| `rollback.ts` | The rollback: the undo, the refusal, the ledger rows. |
| `backupPolicy.ts` | When a backup is taken, what it is called and what is kept. |
| `list.ts` | The order of the migrations and the checks the list has to pass. |
| `context.ts` | The handle a migration body writes through, and the capture of the SQL it ran. |
| `types.ts` | The public types: the migration, the context, the status, the events. |
| `errors.ts` | The typed errors. |
| `ledger.ts` | The three tables and their readers and writers. |
| `backup.ts` | The dump strategy, the backup store. |
| `dump.ts` | The SQL export, the comment handling and the atomic restore. |
| `checksum.ts` | The identity of a migration and how it compares with the recorded one. |
| `state.ts` | The state the runner and the rollback share. |
| `schemaMigrations.ts` | The registry: the module DDL turned into numbered migrations, their bands and their versions. |
| `schemaDdl.ts` | The objects a DDL statement creates, and the statements that drop them again. |
| `schemaStartup.ts` | The startup runner, the apply, the rollback and the schema version surface. |
| `nodeBackup.ts` | The node-only file copy strategy. Not in the barrel. |
