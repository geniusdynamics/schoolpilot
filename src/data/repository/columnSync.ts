// ABOUTME: Brings an existing table up to the canonical column set: a column the schema declares
// ABOUTME: but the table lacks is added by an idempotent ALTER before the canonical indexes run.

import {
  canonicalDatabaseSchema,
  columnsForSchema,
  type SqliteAdapter,
} from '@/data/adapters/sqlite';
import { storageFor, type EntityName } from '@/domain/schema';

/**
 * One column the canonical DDL declares, reduced to what an ALTER needs.
 *
 * `type` is the SQLite type CREATE TABLE would give the column. `defaultValue` is the SQL
 * literal of the column default, already quoted by the DDL generator, or absent when the
 * column has none.
 */
interface DeclaredColumn {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly defaultValue?: string | number;
}

/** The declared columns of every entity, resolved once: the sync runs on every app open. */
const declaredColumnCache = new Map<EntityName, readonly DeclaredColumn[]>();

/** The columns the canonical schema declares for an entity, as CREATE TABLE would define them. */
function declaredColumnsFor(entity: EntityName): readonly DeclaredColumn[] {
  const cached = declaredColumnCache.get(entity);
  if (cached) return cached;

  const columns = columnsForSchema(canonicalDatabaseSchema(entity)).map((column) => ({
    name: column.name,
    type: column.type,
    nullable: column.nullable,
    ...(column.defaultValue !== undefined ? { defaultValue: column.defaultValue } : {}),
  }));
  declaredColumnCache.set(entity, columns);
  return columns;
}

/**
 * The ALTER that adds one declared column to an existing table.
 *
 * A column added to a table that already holds rows must be nullable or carry a default: the
 * rows have no value for it. So the NOT NULL clause is emitted only when there is a default to
 * fill the existing rows with. A non-nullable column without one lands nullable instead - the
 * honest answer, because the alternative is an ALTER SQLite refuses on a non-empty table - and
 * the reader tolerates the null it may then hold.
 */
function addColumnStatement(table: string, column: DeclaredColumn): string {
  let definition = `"${column.name}" ${column.type}`;
  if (column.defaultValue !== undefined) {
    if (!column.nullable) definition += ' NOT NULL';
    definition += ` DEFAULT ${column.defaultValue}`;
  }
  return `ALTER TABLE "${table}" ADD COLUMN ${definition}`;
}

/**
 * Adds every column the canonical schema declares that an existing table lacks.
 *
 * The canonical DDL is CREATE-only, so a table created before a column was declared never
 * receives it. Reading the column list of the table first keeps the ALTER idempotent and cheap
 * enough to run on every open: nothing is written when the table already matches the schema.
 *
 * A table that does not exist yet is skipped whole - the canonical DDL creates it with every
 * column in one statement. This runs before the DDL so the indexes the DDL also carries find
 * the columns they name.
 *
 * Returns the `table.column` pairs that were added by this call.
 */
export async function ensureDeclaredColumns(
  adapter: SqliteAdapter,
  entities: readonly EntityName[]
): Promise<readonly string[]> {
  const added: string[] = [];

  for (const entity of entities) {
    const table = storageFor(entity).table;
    const existing = await adapter.all<{ name: string }>(`PRAGMA table_info("${table}")`);

    // An empty result means the table does not exist yet; the canonical DDL owns it whole.
    if (existing.length === 0) continue;

    const present = new Set(existing.map((column) => column.name));
    for (const column of declaredColumnsFor(entity)) {
      if (present.has(column.name)) continue;
      await adapter.exec(addColumnStatement(table, column));
      added.push(`${table}.${column.name}`);
    }
  }

  return added;
}
