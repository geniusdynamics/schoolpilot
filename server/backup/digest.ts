// ABOUTME: Logical checksums of a whole SQLite database: one SHA-256 per table over its rows in
// ABOUTME: canonical JSON, and one digest over the table set, so two instances can be compared.

import { createHash } from 'node:crypto';

import type { SqliteAdapter, SqliteRow } from '@/data/adapters/sqlite';
import { ENTITY_NAMES, storageFor } from '@/domain/schema';

import type { DatabaseDigest, TableDigest } from './types';

/** Table name to canonical entity name, for the digest's readable labels. */
const entityByTable: ReadonlyMap<string, string> = new Map(
  ENTITY_NAMES.map((entity) => [storageFor(entity).table, entity as string])
);

/**
 * Hashes every user table of an open database.
 *
 * Rows are sorted before hashing, so the digest depends on content and not on the order SQLite
 * happens to return pages in. The repository's own `audit_event` table is included: a restore
 * that lost the audit trail would otherwise still look identical.
 */
export async function digestDatabase(adapter: SqliteAdapter): Promise<DatabaseDigest> {
  const tables = await adapter.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );

  const digests: TableDigest[] = [];
  for (const { name } of tables) {
    digests.push(await digestTable(adapter, name));
  }

  return {
    algorithm: 'sha256',
    overall: overallDigest(digests),
    rows: digests.reduce((total, table) => total + table.rows, 0),
    tables: digests,
  };
}

/** The single digest over a table set; a restore compares it with the digest it recomputes. */
export function overallDigest(tables: readonly TableDigest[]): string {
  return createHash('sha256')
    .update(tables.map((table) => `${table.table}:${table.rows}:${table.digest}`).join('\n'))
    .digest('hex');
}

/** Hashes one table through an open adapter. */
export async function digestTable(adapter: SqliteAdapter, table: string): Promise<TableDigest> {
  const quoted = quoteIdentifier(table);
  const columns = await adapter.all<{ name: string }>(`PRAGMA table_info(${quoted})`);
  const names = columns.map((column) => column.name).sort();
  const rows = await adapter.all<SqliteRow>(`SELECT * FROM ${quoted}`);

  const rowDigests = rows.map((row) => rowHash(row, names)).sort();
  const digest = createHash('sha256')
    .update(`rows:${rowDigests.length}\n`)
    .update(rowDigests.join('\n'))
    .digest('hex');

  return {
    table,
    entity: entityByTable.get(table) ?? null,
    rows: rows.length,
    digest,
  };
}

/** A stable SHA-256 of one row, with its keys in a fixed order. */
function rowHash(row: SqliteRow, names: readonly string[]): string {
  const canonical: Record<string, string> = {};
  for (const name of names) {
    if (!(name in row)) continue;
    canonical[name] = valueText(row[name]);
  }
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/** Turns any SQLite value into text that cannot depend on the platform's JSON encoding. */
function valueText(value: SqliteRow[string]): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'bigint') return `bigint:${value.toString()}`;
  if (value instanceof Uint8Array) return `blob:${Buffer.from(value).toString('base64')}`;
  if (typeof value === 'number') return `number:${String(value)}`;
  return `text:${value}`;
}

/** Quotes a table name read from `sqlite_master`; the doubled quote is SQLite's own escape. */
export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
