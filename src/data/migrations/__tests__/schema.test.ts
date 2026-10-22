// ABOUTME: The schema migration suite: the module schemas applied to a real SQLite database from
// ABOUTME: a fresh one, over an existing one, rolled back, failed part-way and composed with the data ledger.

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { ensureLedgerSchema } from '@/domain/finance/ledger/store';
import { ensureSequenceSchema } from '@/domain/sequences/store';

import { migrateInstitutionAndCalendar } from '../001-institution-calendar';
import { migrateClassGroups } from '../002-class-groups';
import { migrateLearners } from '../003-learners';
import { migrateExams } from '../004-exams';
import { migrateFees } from '../005-fees';
import { MigrationError } from '../errors';
import { MIGRATIONS_TABLE, readApplied } from '../ledger';
import { createMigrationRunner } from '../runner';
import { dropStatementsFor } from '../schemaDdl';
import {
  KNOWN_MIGRATION_VERSIONS,
  LEGACY_DATA_MIGRATION_VERSIONS,
  moduleSchemaMigration,
  SCHEMA_MIGRATIONS,
} from '../schemaMigrations';
import {
  applySchemaMigrations,
  createSchemaMigrationRunner,
  readSchemaVersion,
  rollbackSchemaMigrations,
} from '../schemaStartup';
import type { Migration } from '../types';

interface SqliteObjectRow {
  readonly type: string;
  readonly name: string;
}

interface CounterRow {
  readonly next_value: number;
}

interface SchoolRow {
  readonly id: string;
  readonly name: string;
}

async function openAdapter(): Promise<SqliteAdapter> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  return adapter;
}

/** Every table, index and trigger the database holds, keyed `kind:name`. */
async function objectKeys(adapter: SqliteAdapter): Promise<Set<string>> {
  const rows = await adapter.all<SqliteObjectRow>(
    `SELECT type, name FROM sqlite_master WHERE type IN ('table', 'index', 'trigger')`
  );
  return new Set(rows.map((row) => `${row.type}:${row.name}`));
}

/** Every object the module schemas promise, keyed `kind:name`. */
function moduleObjectKeys(): string[] {
  return SCHEMA_MIGRATIONS.flatMap((migration) =>
    migration.objects.map((object) => `${object.kind}:${object.name}`)
  );
}

/** Writes one sequence counter row. */
async function countOnce(adapter: SqliteAdapter): Promise<void> {
  await adapter.run(
    `INSERT INTO sequence_counter (sequence, scope_key, next_value) VALUES ('admission', 'school-1', 1)`
  );
}

/** Writes one reconciliation statement, its one line, and a confirmed match over it. */
async function writeReconciliationRows(adapter: SqliteAdapter): Promise<void> {
  await adapter.run(
    `INSERT INTO reconciliation_statement
       (id, institution_id, account_id, format, currency, fingerprint, line_count, imported_at)
     VALUES ('statement-1', 'school-1', 'account-1', 'csv', 'KES', 'fingerprint-1', 1,
             '2026-01-12T09:00:00.000Z')`
  );
  await adapter.run(
    `INSERT INTO reconciliation_line
       (id, statement_id, institution_id, account_id, file_line, value_date, amount_minor,
        currency, direction, raw, dedupe_key)
     VALUES ('line-1', 'statement-1', 'school-1', 'account-1', 2, '2026-01-11', 12000,
             'KES', 'inflow', '{}', 'dedupe-1')`
  );
  await adapter.run(
    `INSERT INTO reconciliation_match
       (id, institution_id, statement_line_id, candidate_id, candidate_kind, status, reasons, matched_at)
     VALUES ('match-1', 'school-1', 'line-1', 'payment-1', 'payment', 'confirmed', '[]',
             '2026-01-12T09:05:00.000Z')`
  );
}

describe('the module schema migrations', () => {
  it('gives a fresh database every module table, index and trigger, in version order', async () => {
    const adapter = await openAdapter();

    const result = await applySchemaMigrations(adapter);

    expect(result.status).toBe('completed');
    expect(result.applied.map((entry) => entry.version)).toEqual([100, 101, 102]);
    expect(result.skipped).toEqual([]);
    expect(result.version).toBe(102);

    const objects = await objectKeys(adapter);
    for (const key of moduleObjectKeys()) {
      expect(objects.has(key), `${key} should exist`).toBe(true);
    }

    // The schema is real, not only a row in the ledger: the tables take a write, and the
    // ledger's immutability trigger refuses the update a posted entry must never take.
    await countOnce(adapter);
    const [counter] = await adapter.all<CounterRow>(
      `SELECT next_value FROM sequence_counter WHERE sequence = 'admission' AND scope_key = 'school-1'`
    );
    expect(counter.next_value).toBe(1);

    await adapter.run(
      `INSERT INTO journal_entry
         (id, institution_id, entry_date, source_kind, source_id, narration, currency,
          total_debit_minor, total_credit_minor, posted_at)
       VALUES ('entry-1', 'school-1', '2026-01-12', 'invoice', 'invoice-1', 'a posted invoice',
               'KES', 12000, 12000, '2026-01-12T09:00:00.000Z')`
    );
    await expect(
      adapter.run(`UPDATE journal_entry SET narration = 'edited' WHERE id = 'entry-1'`)
    ).rejects.toThrow(/immutable/);

    const version = await readSchemaVersion(adapter);
    expect(version).toMatchObject({ current: 102, latest: 102, complete: true });
    expect(version.applied.map((entry) => [entry.version, entry.module])).toEqual([
      [100, 'sequences'],
      [101, 'ledger'],
      [102, 'reconciliation'],
    ]);
    expect(version.pending).toEqual([]);
  });

  it('records the migration once: applying again changes nothing', async () => {
    const adapter = await openAdapter();
    await applySchemaMigrations(adapter);
    const recorded = await readApplied(adapter);

    const second = await applySchemaMigrations(adapter);

    expect(second.status).toBe('noop');
    expect(second.applied).toEqual([]);
    expect(second.skipped.map((entry) => entry.version)).toEqual([100, 101, 102]);
    expect(second.version).toBe(102);
    // Same rows, same timestamps: the ledger is the record of a single application.
    expect(await readApplied(adapter)).toEqual(recorded);
  });

  it('recognises a database that already holds the tables, and keeps the rows in them', async () => {
    const adapter = await openAdapter();
    // The path the module tests take: the module applies its own DDL first.
    await ensureSequenceSchema(adapter);
    await ensureLedgerSchema(adapter);
    await countOnce(adapter);

    const result = await applySchemaMigrations(adapter);

    expect(result.status).toBe('completed');
    expect((await readSchemaVersion(adapter)).complete).toBe(true);
    const objects = await objectKeys(adapter);
    for (const key of moduleObjectKeys()) {
      expect(objects.has(key), `${key} should exist`).toBe(true);
    }
    const [counter] = await adapter.all<CounterRow>(
      `SELECT next_value FROM sequence_counter WHERE sequence = 'admission' AND scope_key = 'school-1'`
    );
    expect(counter.next_value).toBe(1);
  });

  it('rolls back to the state before it ran, leaving the other tables alone', async () => {
    const adapter = await openAdapter();
    await adapter.exec(`CREATE TABLE school (id TEXT PRIMARY KEY, name TEXT NOT NULL)`);
    await adapter.run(`INSERT INTO school (id, name) VALUES ('school-1', 'a school')`);
    await applySchemaMigrations(adapter);

    const rolled = await rollbackSchemaMigrations(adapter);

    expect(rolled.status).toBe('completed');
    expect(rolled.undone.map((entry) => entry.version)).toEqual([102, 101, 100]);

    const objects = await objectKeys(adapter);
    for (const key of moduleObjectKeys()) {
      expect(objects.has(key), `${key} should be gone`).toBe(false);
    }
    expect(objects.has('table:school')).toBe(true);
    const [school] = await adapter.all<SchoolRow>(`SELECT id, name FROM school`);
    expect(school).toEqual({ id: 'school-1', name: 'a school' });

    const version = await readSchemaVersion(adapter);
    expect(version).toMatchObject({ current: 0, complete: false });
    expect(version.applied).toEqual([]);
    expect(version.pending.map((entry) => entry.version)).toEqual([100, 101, 102]);
    expect(await readApplied(adapter)).toEqual([]);
  });

  it('shares the ledger with the data migrations without running or undoing them', async () => {
    const adapter = await openAdapter();
    const dataMigration: Migration = {
      version: 2,
      name: 'a legacy data migration',
      statements: ['CREATE TABLE legacy_row (id TEXT PRIMARY KEY)'],
    };
    const data = createMigrationRunner({ adapter, migrations: [dataMigration] });
    expect((await data.run()).status).toBe('completed');

    // The startup runner knows the data band, so a row it did not write is not mistaken for a
    // database written by a newer build.
    const applied = await applySchemaMigrations(adapter);
    expect(applied.status).toBe('completed');
    expect(applied.applied.map((entry) => entry.version)).toEqual([100, 101, 102]);

    const rolled = await rollbackSchemaMigrations(adapter);
    expect(rolled.status).toBe('completed');
    expect(rolled.undone.map((entry) => entry.version)).toEqual([102, 101, 100]);

    // The data migration keeps its ledger row and its table: the two bands compose.
    expect((await readApplied(adapter)).map((entry) => entry.version)).toEqual([2]);
    expect((await objectKeys(adapter)).has('table:legacy_row')).toBe(true);
    expect((await readSchemaVersion(adapter)).current).toBe(0);
  });

  it('creates the reconciliation tables, indexes and triggers, and drops them again', async () => {
    const adapter = await openAdapter();
    await applySchemaMigrations(adapter);

    const reconciliation = SCHEMA_MIGRATIONS.find(
      (migration) => migration.module === 'reconciliation'
    );
    expect(reconciliation?.version).toBe(102);
    // The reader covers every form this module's DDL uses: three tables, nine indexes (three of
    // them unique and two of those partial) and the two match-history triggers.
    expect(reconciliation?.objects.filter((object) => object.kind === 'table')).toHaveLength(3);
    expect(reconciliation?.objects.filter((object) => object.kind === 'index')).toHaveLength(9);
    expect(reconciliation?.objects.filter((object) => object.kind === 'trigger')).toHaveLength(2);

    const objects = await objectKeys(adapter);
    for (const object of reconciliation?.objects ?? []) {
      expect(objects.has(`${object.kind}:${object.name}`), `${object.name} should exist`).toBe(true);
    }

    // The schema is real: a statement, its line and a match take a write, and then the two
    // invariants and the two triggers the module declares refuse what they are there to refuse.
    await writeReconciliationRows(adapter);

    // One confirmed match per statement line, the invariant the partial unique index carries.
    await expect(
      adapter.run(
        `INSERT INTO reconciliation_match
           (id, institution_id, statement_line_id, candidate_id, candidate_kind, status, reasons, matched_at)
         VALUES ('match-2', 'school-1', 'line-1', 'payment-2', 'payment', 'confirmed', '[]',
                 '2026-01-12T09:06:00.000Z')`
      )
    ).rejects.toThrow();
    // A match is history: it is never deleted, and the two sides it links are never re-pointed.
    await expect(
      adapter.run(`DELETE FROM reconciliation_match WHERE id = 'match-1'`)
    ).rejects.toThrow(/history/);
    await expect(
      adapter.run(`UPDATE reconciliation_match SET candidate_id = 'payment-9' WHERE id = 'match-1'`)
    ).rejects.toThrow(/immutable/);

    const rolled = await rollbackSchemaMigrations(adapter);
    expect(rolled.status).toBe('completed');
    expect(rolled.undone.map((entry) => entry.version)).toEqual([102, 101, 100]);
    const after = await objectKeys(adapter);
    for (const object of reconciliation?.objects ?? []) {
      expect(after.has(`${object.kind}:${object.name}`), `${object.name} should be gone`).toBe(false);
    }

    // The canonical database opens with foreign keys enforced, and the rollback drops the match
    // table before the line table it references and the line table before the statement. This is
    // the same apply and rollback over such a connection, with the rows still in place, so the
    // order the derived drops run in is the one the keys need.
    const enforced = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
    await enforced.open();
    await applySchemaMigrations(enforced);
    await writeReconciliationRows(enforced);
    // The connection really enforces the keys and the child rows are really there: a statement
    // with a line under it cannot be deleted. So the rollback below is dropping live children.
    await expect(
      enforced.run(`DELETE FROM reconciliation_statement WHERE id = 'statement-1'`)
    ).rejects.toThrow(/foreign key/i);

    const enforcedRolled = await rollbackSchemaMigrations(enforced);

    expect(enforcedRolled.status).toBe('completed');
    expect(enforcedRolled.undone.map((entry) => entry.version)).toEqual([102, 101, 100]);
    expect((await objectKeys(enforced)).has('table:reconciliation_statement')).toBe(false);
    await enforced.close();
  });

  it('still refuses a ledger row that comes from a newer build', async () => {
    const adapter = await openAdapter();
    await applySchemaMigrations(adapter);
    await adapter.run(
      `INSERT INTO ${MIGRATIONS_TABLE} (version, name, checksum, checksum_kind, applied_at) VALUES (999, 'a future migration', 'future', 'explicit', '2026-01-01T00:00:00.000Z')`
    );

    await expect(applySchemaMigrations(adapter)).rejects.toThrow(/does not know/);
  });

  it('leaves no table behind when a migration fails part-way', async () => {
    const adapter = await openAdapter();
    const failing: Migration = {
      version: 103,
      name: 'a migration that creates a table and then fails',
      // The second statement fails on a table the first one created: the failure happens inside
      // the migration's transaction, after real DDL has run.
      statements: [
        'CREATE TABLE half_applied (id TEXT PRIMARY KEY)',
        'CREATE TABLE half_applied (id TEXT PRIMARY KEY)',
      ],
      async down(context) {
        await context.exec('DROP TABLE IF EXISTS half_applied');
      },
    };

    let failure: unknown;
    try {
      await applySchemaMigrations(adapter, {
        migrations: [...SCHEMA_MIGRATIONS, failing],
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(MigrationError);
    expect((failure as MigrationError).message).toMatch(/103/);
    expect((failure as MigrationError).code).toBe('migration_failed');

    // SQLite's DDL is transactional: the table the first statement created is gone.
    expect((await objectKeys(adapter)).has('table:half_applied')).toBe(false);
    // The ledger keeps the position it reached: the successful migrations stay, the failed one
    // is not recorded, and the start-up path retries it next time.
    expect((await readApplied(adapter)).map((entry) => entry.version)).toEqual([100, 101, 102]);
    expect((await readSchemaVersion(adapter)).current).toBe(102);
  });
});

describe('the schema registry', () => {
  it('reads the down of a migration out of the DDL it declares', () => {
    const sequence = moduleSchemaMigration({
      version: 1,
      module: 'example',
      name: 'the example tables',
      ddl: [
        'CREATE TABLE IF NOT EXISTS example (id TEXT PRIMARY KEY)',
        'CREATE UNIQUE INDEX IF NOT EXISTS example_value ON example (id)',
        'CREATE TRIGGER IF NOT EXISTS example_immutable_delete BEFORE DELETE ON example BEGIN SELECT RAISE(ABORT, \'immutable\'); END',
      ],
    });

    expect(sequence.objects).toEqual([
      { kind: 'table', name: 'example' },
      { kind: 'index', name: 'example_value' },
      { kind: 'trigger', name: 'example_immutable_delete' },
    ]);
    expect(sequence.statements).toHaveLength(3);
    // The down is the reverse: the trigger and the index go before the table they belong to.
    expect(
      dropStatementsFor([
        'CREATE TABLE IF NOT EXISTS example (id TEXT PRIMARY KEY)',
        'CREATE UNIQUE INDEX IF NOT EXISTS example_value ON example (id)',
        'CREATE TRIGGER IF NOT EXISTS example_immutable_delete BEFORE DELETE ON example BEGIN SELECT RAISE(ABORT, \'immutable\'); END',
      ])
    ).toEqual([
      'DROP TRIGGER IF EXISTS "example_immutable_delete"',
      'DROP INDEX IF EXISTS "example_value"',
      'DROP TABLE IF EXISTS "example"',
    ]);
  });

  it('refuses a DDL statement it cannot reverse', () => {
    expect(() =>
      moduleSchemaMigration({
        version: 1,
        module: 'example',
        name: 'a migration with a view',
        ddl: ['CREATE VIEW example_view AS SELECT 1'],
      })
    ).toThrow(/only understands CREATE TABLE/);
  });

  it('knows the versions the legacy data migrations use', () => {
    // The constant the startup runner is given must not drift from the migrations it stands for:
    // the ledger is shared, and a renumbered data migration would make the startup runner read
    // its row as one written by a newer build.
    const versions = [
      migrateInstitutionAndCalendar.version,
      migrateClassGroups.version,
      migrateLearners.version,
      migrateExams.version,
      migrateFees.version,
    ].sort((left, right) => left - right);

    expect(versions).toEqual([...LEGACY_DATA_MIGRATION_VERSIONS]);
  });

  it('starts with every module schema pending', async () => {
    const adapter = await openAdapter();
    const runner = createSchemaMigrationRunner(adapter);
    const status = await runner.status();
    expect(status.total).toBe(SCHEMA_MIGRATIONS.length);
    expect(status.remaining.map((entry) => entry.version)).toEqual([100, 101, 102]);
  });

  it('knows every version this build ships, in either band', () => {
    // 102 must be known for the same reason 100 and 101 must: the startup runner refuses a ledger
    // row it has never heard of as a database written by a newer build.
    expect(KNOWN_MIGRATION_VERSIONS).toEqual([1, 2, 3, 4, 5, 100, 101, 102]);
  });
});
