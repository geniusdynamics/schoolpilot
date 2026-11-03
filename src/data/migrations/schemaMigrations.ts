// ABOUTME: The registry of module schema migrations: every module's own tables turned into numbered
// ABOUTME: migrations that declare the module's own DDL, so the tables have one source of truth.

import { COLLECTIONS_DDL } from '@/domain/finance/collections/store';
import { LEDGER_DDL } from '@/domain/finance/ledger/store';
import { PROVIDER_EVENT_DDL } from '@/domain/finance/payments/providers/store';
import { PROVIDER_SUSPENSE_DDL } from '@/domain/finance/payments/providers/suspense';
import { CASHIER_DDL } from '@/domain/finance/payments/session';
import { RECONCILIATION_DDL } from '@/domain/finance/reconciliation/store';
import { SUBSCRIPTION_DDL } from '@/domain/finance/subscriptions/store';
import { SEQUENCE_DDL } from '@/domain/sequences/store';

import { canonicalDatabaseSchema } from '../adapters/sqlite/canonical';
import { statementsForSchema } from '../adapters/sqlite/ddl';
import { dropStatementsFor, schemaObjectsOf, type SchemaObject } from './schemaDdl';
import type { Migration } from './types';

/**
 * The first version a schema migration may take.
 *
 * The legacy data migrations (P1 C01-C05) own 1-99, the module schemas own 100-199. A version
 * is an identity in one shared ledger, so the two bands must never overlap: a data migration
 * and a schema migration that shared a version would be the same row in `_migrations`.
 */
export const SCHEMA_MIGRATION_FLOOR = 100;

/**
 * The versions the legacy data migrations use.
 *
 * A schema runner does not run them, but it has to know they exist: the ledger is shared, and
 * the framework refuses a version it has never heard of as a database written by a newer build.
 * The migration suite holds this list to the exported migrations themselves, so it cannot drift.
 */
export const LEGACY_DATA_MIGRATION_VERSIONS: readonly number[] = [1, 2, 3, 4, 5];

/** A migration that creates a module's tables, as the module declares them. */
export interface ModuleSchemaMigration extends Migration {
  /** The module the tables belong to. A diagnostics screen shows it. */
  readonly module: string;
  /** The objects the migration creates, read from the DDL it applies. */
  readonly objects: readonly SchemaObject[];
}

interface ModuleSchemaSpec {
  readonly version: number;
  readonly module: string;
  readonly name: string;
  /** The module's own DDL constant. Never a copy of it. */
  readonly ddl: readonly string[];
}

/**
 * Builds a schema migration out of a module's DDL.
 *
 * The `up` is the module's declared DDL, unchanged, so the migration and `ensureSchema` can
 * never disagree. The `down` is derived from the same text: the objects read out of the CREATE
 * statements, dropped in reverse.
 *
 * The migration is marked `destructive` although its `up` only creates: the framework uses the
 * flag for both directions, and the `down` drops the tables together with whatever they hold.
 * A caller that rolls back a populated database therefore gets the backup the framework takes
 * before a destructive rollback, when it gave the runner a backup strategy.
 */
export function moduleSchemaMigration(spec: ModuleSchemaSpec): ModuleSchemaMigration {
  const objects = schemaObjectsOf(spec.ddl);
  return {
    version: spec.version,
    module: spec.module,
    name: spec.name,
    objects,
    statements: [...spec.ddl],
    destructive: true,
    async down(context) {
      for (const statement of dropStatementsFor(spec.ddl)) {
        await context.exec(statement);
      }
    },
  };
}

/** The sequences module: the counter, the issued-number ledger and the offline device blocks. */
export const sequencesSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 100,
  module: 'sequences',
  name: 'the sequence store: counters, issued numbers and device blocks',
  ddl: SEQUENCE_DDL,
});

/** The ledger module: journal entries, their lines, the periods and the immutability. */
export const ledgerSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 101,
  module: 'ledger',
  name: 'the ledger: journal entries, lines, periods, their indexes and immutability triggers',
  ddl: LEDGER_DDL,
});

/** The reconciliation module: imported statements, their lines and the match history. */
export const reconciliationSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 102,
  module: 'reconciliation',
  name: 'reconciliation: statements, their lines, the matches and the immutable-match triggers',
  ddl: RECONCILIATION_DDL,
});

/** The subscriptions module: one row per subscription, priced from the fee schedule it names. */
export const subscriptionsSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 103,
  module: 'subscriptions',
  name: 'subscriptions: the subscription table and the indexes the billing run reads',
  ddl: SUBSCRIPTION_DDL,
});

/** The cashier: the sessions a cashier opens and closes, and the payments taken in each. */
export const cashierSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 104,
  module: 'cashier',
  name: 'cashier sessions and the payments attached to each',
  ddl: CASHIER_DDL,
});

/** The payment providers: every provider notification received, kept once by its key. */
export const providerEventsSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 105,
  module: 'payment providers',
  name: 'payment provider events, unique by key and by receipt',
  ddl: PROVIDER_EVENT_DDL,
});

/** The payment providers: the money that arrived without a learner to match it to. */
export const providerSuspenseSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 106,
  module: 'payment providers',
  name: 'payment provider suspense: unmatched money, unique by transaction',
  ddl: PROVIDER_SUSPENSE_DDL,
});

/** Collections: reminder schedules, opt-outs, promises to pay, pay links and the attempts made. */
export const collectionsSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 107,
  module: 'collections',
  name: 'collections: reminder schedules, opt-outs, promises, pay links and attempts',
  ddl: COLLECTIONS_DDL,
});

/**
 * Expenses: the recorded expense and the indexes the list, the account filter and idempotency read.
 *
 * The statements are derived from the canonical entity declaration itself, so the migration and
 * the registry cannot describe two different tables. The canonical setup creates the table too;
 * the migration gives the upgrade a ledger row and a rollback.
 */
export const expenseSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 108,
  module: 'expenses',
  name: 'expenses: the recorded expense, its voucher, its posting and its reversal',
  ddl: statementsForSchema(canonicalDatabaseSchema('expense')),
});

/**
 * Ledger accounts: the canonical chart of accounts the posting engine reads.
 *
 * As with expenses, the statements come from the entity declaration itself, so the migration and
 * the registry describe one table. The canonical setup creates it too; the migration gives the
 * upgrade a ledger row and a rollback.
 */
export const ledgerAccountSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 109,
  module: 'ledger',
  name: 'ledger accounts: the chart of accounts the postings resolve against',
  ddl: statementsForSchema(canonicalDatabaseSchema('ledger_account')),
 * Transport: the routes a school runs and the learner assignments billed each term.
 *
 * Version 109 belongs to another branch in flight, so this one takes 110. The statements are
 * derived from both canonical entity declarations, exactly as the expense migration is derived
 * from its entity.
 */
export const transportSchemaMigration: ModuleSchemaMigration = moduleSchemaMigration({
  version: 110,
  module: 'transport',
  name: 'transport: routes, their revenue account and the learner assignments billed each term',
  ddl: [
    ...statementsForSchema(canonicalDatabaseSchema('transport_route')),
    ...statementsForSchema(canonicalDatabaseSchema('transport_assignment')),
  ],
});

/**
 * The module schema migrations this build applies at startup, in version order.
 *
 * Adding a module table is adding its DDL to this list - not a change to the runner, the
 * startup path or the ledger.
 */
export const SCHEMA_MIGRATIONS: readonly ModuleSchemaMigration[] = [
  sequencesSchemaMigration,
  ledgerSchemaMigration,
  reconciliationSchemaMigration,
  subscriptionsSchemaMigration,
  cashierSchemaMigration,
  providerEventsSchemaMigration,
  providerSuspenseSchemaMigration,
  collectionsSchemaMigration,
  expenseSchemaMigration,
  ledgerAccountSchemaMigration,
  transportSchemaMigration,
];

/** The versions of the schema migrations, in order. */
export const SCHEMA_MIGRATION_VERSIONS: readonly number[] = SCHEMA_MIGRATIONS.map(
  (migration) => migration.version
);

/**
 * Every version this build knows, in either band.
 *
 * The startup runner applies only the schema migrations, but it is given this list so a ledger
 * row written by a data migration is not mistaken for one written by a newer build.
 */
export const KNOWN_MIGRATION_VERSIONS: readonly number[] = [
  ...LEGACY_DATA_MIGRATION_VERSIONS,
  ...SCHEMA_MIGRATION_VERSIONS,
];

/** The schema migration that owns a version, if this build has one. */
export function schemaMigrationFor(version: number): ModuleSchemaMigration | undefined {
  return SCHEMA_MIGRATIONS.find((migration) => migration.version === version);
}
