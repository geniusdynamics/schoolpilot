// ABOUTME: Reads the live shape of a table - the columns the database actually holds - so the
// ABOUTME: integrity checks also work on audit-era tables whose shape predates the canonical model.

import type { SqliteAdapter } from '@/data/adapters/sqlite';

/** One column of a table, as the database holds it. */
export interface TableColumn {
  readonly name: string;
  readonly type: string;
  /** True when the column refuses a null value. */
  readonly notNull: boolean;
  readonly primaryKey: boolean;
}

/** The live shape of a table. */
export interface LiveTable {
  readonly table: string;
  readonly columns: readonly TableColumn[];
  /** True when the table has a rowid, so one row can be addressed on its own. */
  readonly hasRowId: boolean;
}

/** Quotes an identifier so it can be used in a statement. */
export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** True when the database holds the table. */
export async function tableExists(adapter: SqliteAdapter, table: string): Promise<boolean> {
  const row = await adapter.get<{ name: string }>(
    `SELECT "name" FROM "sqlite_master" WHERE "type" = 'table' AND "name" = ? LIMIT 1`,
    [table]
  );
  return row !== null;
}

/**
 * Reads the live shape of a table, or null when the database does not hold it.
 *
 * The canonical DDL is CREATE-only, so a table that predates the model keeps the shape it
 * had. The checks read the shape instead of assuming it.
 */
export async function readLiveTable(
  adapter: SqliteAdapter,
  table: string
): Promise<LiveTable | null> {
  if (!(await tableExists(adapter, table))) return null;

  const rows = await adapter.all<{ name: string; type: string; notnull: number; pk: number }>(
    `PRAGMA table_info(${quoteIdentifier(table)})`
  );

  const columns: TableColumn[] = rows.map((row) => ({
    name: row.name,
    type: row.type,
    notNull: row.notnull === 1,
    primaryKey: row.pk > 0,
  }));

  return { table, columns, hasRowId: await tableHasRowId(adapter, table) };
}

/** True when the table carries a rowid. A WITHOUT ROWID table does not. */
async function tableHasRowId(adapter: SqliteAdapter, table: string): Promise<boolean> {
  const row = await adapter.get<{ sql: string | null }>(
    `SELECT "sql" FROM "sqlite_master" WHERE "type" = 'table' AND "name" = ? LIMIT 1`,
    [table]
  );
  const sql = row?.sql ?? '';
  return !/WITHOUT\s+ROWID/i.test(sql);
}

/** The column of a table, or undefined when the table does not have it. */
export function columnOf(table: LiveTable, name: string): TableColumn | undefined {
  return table.columns.find((column) => column.name === name);
}

/** True when the table accepts a null value in the column. */
export function acceptsNull(table: LiveTable, name: string): boolean {
  const column = columnOf(table, name);
  if (!column) return false;
  return !column.notNull;
}

/** The primary key column of a table, by the metadata the registry declares. */
export function primaryKeyColumn(table: LiveTable, declared: string): string | undefined {
  const declaredColumn = columnOf(table, declared);
  if (declaredColumn) return declaredColumn.name;
  const primary = table.columns.find((column) => column.primaryKey);
  return primary?.name;
}
