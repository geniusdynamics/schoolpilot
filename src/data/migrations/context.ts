// ABOUTME: The handle a migration body writes through: the transaction the framework opened,
// ABOUTME: and the capture of the SQL the body actually ran.

import type { SqliteBindValue, SqliteRow, SqliteTransaction } from '@/data/adapters/sqlite';

import { MigrationError } from './errors';
import type { Migration, MigrationContext } from './types';

/** A context and the statements that ran through it. */
export interface MigrationCapture {
  readonly context: MigrationContext;
  /** The SQL the body ran, in the order it ran it. */
  readonly statements: readonly string[];
}

/**
 * Builds the handle a migration body writes through.
 *
 * Every statement is recorded, so the framework can hold the body to the SQL the
 * migration declared.
 */
export function createMigrationContext(
  migration: Migration,
  tx: SqliteTransaction
): MigrationCapture {
  const statements: string[] = [];

  const context: MigrationContext = {
    version: migration.version,
    name: migration.name,
    async exec(sql: string) {
      statements.push(sql);
      await tx.exec(sql);
    },
    async all<T extends object = SqliteRow>(
      sql: string,
      params?: readonly SqliteBindValue[]
    ) {
      statements.push(sql);
      return tx.all<T>(sql, params);
    },
    async get<T extends object = SqliteRow>(
      sql: string,
      params?: readonly SqliteBindValue[]
    ) {
      statements.push(sql);
      return tx.get<T>(sql, params);
    },
    async run(sql: string, params?: readonly SqliteBindValue[]) {
      statements.push(sql);
      return tx.run(sql, params);
    },
  };

  return { context, statements };
}

/** True when two lists of statements are the same, in the same order. */
export function sameStatements(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

/** The first statement that differs, for the message of a mismatch. */
function describeMismatch(
  declared: readonly string[],
  ran: readonly string[]
): string {
  const length = Math.max(declared.length, ran.length);
  for (let index = 0; index < length; index += 1) {
    if (declared[index] !== ran[index]) {
      return `statement ${index + 1} is declared as "${declared[index] ?? 'nothing'}" and ran as "${ran[index] ?? 'nothing'}"`;
    }
  }
  return 'the statements differ';
}

/**
 * Holds a migration to the SQL it declared.
 *
 * A migration with dynamic SQL declares no statements and states a checksum instead; there
 * is nothing to hold it to, and the checksum is its identity.
 */
export function assertDeclaredStatements(
  migration: Migration,
  ran: readonly string[]
): void {
  const declared = migration.statements;
  if (!declared) return;
  if (sameStatements(ran, declared)) return;
  throw new MigrationError(
    `Migration ${migration.version} (${migration.name}) declared ${declared.length} statements and ran ${ran.length}: ${describeMismatch(declared, ran)}`,
    {
      code: 'declared_statements_mismatch',
      version: migration.version,
      migrationName: migration.name,
    }
  );
}
