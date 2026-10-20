// ABOUTME: Exports a SQLite database as SQL text through the adapter and restores that text
// ABOUTME: into the database. The restore is atomic: a dump that fails leaves the database as it was.

import type { SqliteAdapter, SqliteTransaction, SqliteValue } from '@/data/adapters/sqlite';

interface MasterRow {
  readonly type: string;
  readonly name: string;
  readonly sql: string;
}

interface TableInfoRow {
  readonly name: string;
}

/** A piece of SQL: either code or a quoted literal, which is never touched. */
interface SqlChunk {
  readonly kind: 'code' | 'literal';
  readonly text: string;
}

/** Quotes an identifier for SQLite. */
function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Splits a SQL text into code and quoted literals.
 *
 * The scanner knows about the three quote characters SQLite accepts and about the two
 * comment forms, so a `--` inside a string is not a comment and a `/*` inside an
 * identifier is not one either. Comments are dropped and the code around them is
 * collapsed onto one line: the dump holds one statement per line, and a comment that
 * survived would swallow the rest of the statement.
 */
function scanSql(sql: string): SqlChunk[] {
  const chunks: SqlChunk[] = [];
  let code = '';
  let index = 0;
  const length = sql.length;

  const flush = () => {
    if (code.length > 0) {
      chunks.push({ kind: 'code', text: code });
      code = '';
    }
  };

  while (index < length) {
    const char = sql[index];

    if (char === '-' && sql[index + 1] === '-') {
      while (index < length && sql[index] !== '\n') index += 1;
      code += ' ';
      continue;
    }

    if (char === '/' && sql[index + 1] === '*') {
      index += 2;
      while (index < length && !(sql[index] === '*' && sql[index + 1] === '/')) index += 1;
      index = Math.min(length, index + 2);
      code += ' ';
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      flush();
      let literal = char;
      index += 1;
      while (index < length) {
        const inner = sql[index];
        literal += inner;
        index += 1;
        if (inner !== char) continue;
        if (sql[index] === char) {
          literal += char;
          index += 1;
          continue;
        }
        break;
      }
      chunks.push({ kind: 'literal', text: literal });
      continue;
    }

    if (char === '[') {
      flush();
      const end = sql.indexOf(']', index);
      if (end === -1) {
        chunks.push({ kind: 'literal', text: sql.slice(index) });
        index = length;
        break;
      }
      chunks.push({ kind: 'literal', text: sql.slice(index, end + 1) });
      index = end + 1;
      continue;
    }

    if (/\s/.test(char)) {
      if (code.length > 0 && !code.endsWith(' ')) code += ' ';
      while (index < length && /\s/.test(sql[index])) index += 1;
      continue;
    }

    code += char;
    index += 1;
  }

  flush();
  return chunks;
}

/** Puts a statement on one line, without its comments. */
export function compactSql(sql: string): string {
  return scanSql(sql)
    .map((chunk) => chunk.text)
    .join('')
    .trim();
}

/** Renders a value as a SQL literal that survives a line-based dump. */
function literal(value: SqliteValue): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NULL';
    if (value === Infinity) return '9.0e999';
    if (value === -Infinity) return '-9.0e999';
    return String(value);
  }
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Uint8Array) {
    let hex = '';
    for (const byte of value) hex += byte.toString(16).padStart(2, '0');
    return `X'${hex}'`;
  }
  let hex = '';
  for (const byte of new TextEncoder().encode(value)) hex += byte.toString(16).padStart(2, '0');
  return `CAST(X'${hex}' AS TEXT)`;
}

/** Ends a statement with a semicolon, unless it already has one. */
function terminate(statement: string): string {
  const trimmed = statement.trim();
  return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
}

/** The tables the database holds, in the order the dump recreates them. */
async function readTableNames(runner: SqliteTransaction): Promise<string[]> {
  const rows = await runner.all<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  );
  return rows.map((row) => row.name);
}

/** Drops every table the database holds. Foreign keys have to be off for this. */
async function dropAllTables(tx: SqliteTransaction): Promise<void> {
  const tables = await tx.all<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
  );
  for (const table of tables) {
    await tx.exec(`DROP TABLE IF EXISTS ${quoteIdentifier(table.name)}`);
  }
}

/** Reads whether the connection enforces foreign keys. */
async function foreignKeysEnabled(adapter: SqliteAdapter): Promise<boolean> {
  const [pragma] = await adapter.all<{ foreign_keys: number }>('PRAGMA foreign_keys');
  return pragma?.foreign_keys === 1;
}

/**
 * Thrown to make the adapter roll a transaction back. The validation uses it to try the
 * dump out and then undo the attempt.
 */
class ValidationRollback extends Error {}

/**
 * Checks that the dump restores.
 *
 * The dump is replayed against the database inside a transaction that is rolled back
 * afterwards, so the check is real - SQLite parses every statement - and the database is
 * left exactly as it was. A dump that does not restore is never handed out.
 */
export async function validateDump(
  adapter: SqliteAdapter,
  dump: string,
  expectedTables: readonly string[]
): Promise<void> {
  const foreignKeys = await foreignKeysEnabled(adapter);
  await adapter.exec('PRAGMA foreign_keys = OFF');
  try {
    try {
      await adapter.transaction(async (tx) => {
        await dropAllTables(tx);
        await tx.exec(dump);
        const tables = (await readTableNames(tx)).sort();
        const expected = [...expectedTables].sort();
        if (tables.join('|') !== expected.join('|')) {
          throw new Error(
            `the dump holds ${tables.length} tables, the database holds ${expected.length}`
          );
        }
        throw new ValidationRollback();
      });
    } catch (error) {
      if (error instanceof ValidationRollback) return;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`the dump does not restore: ${message}`);
    }
  } finally {
    await adapter.exec(`PRAGMA foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`);
  }
}

/**
 * Exports the whole database as SQL text.
 *
 * The dump carries the schema and every row, so a restore reproduces the database. Text is
 * written as a hex blob cast back to text, which keeps every statement on one line and
 * makes the dump safe to read and to replay. The dump does not carry `sqlite_sequence`:
 * after a restore the counter of an AUTOINCREMENT table is the highest id the dump holds,
 * not the counter the database had.
 *
 * The dump is checked before it is handed out: it is replayed against the database inside
 * a transaction that is rolled back, so a dump that cannot be restored is never produced.
 */
export async function dumpDatabase(adapter: SqliteAdapter): Promise<string> {
  const master = await adapter.all<MasterRow>(
    `SELECT type, name, sql FROM sqlite_master
     WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
     ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name`
  );

  const statements: string[] = [];
  const tableNames: string[] = [];

  for (const entry of master) {
    if (entry.type !== 'table') continue;
    statements.push(terminate(compactSql(entry.sql)));
    tableNames.push(entry.name);

    const columns = await adapter.all<TableInfoRow>(
      `PRAGMA table_info(${quoteIdentifier(entry.name)})`
    );
    if (columns.length === 0) continue;
    const columnNames = columns.map((column) => quoteIdentifier(column.name));

    const rows = await adapter.all<Record<string, SqliteValue>>(
      `SELECT * FROM ${quoteIdentifier(entry.name)}`
    );
    for (const row of rows) {
      const values = columns.map((column) => {
        const value = row[column.name];
        return literal(value === undefined ? null : value);
      });
      statements.push(
        `INSERT INTO ${quoteIdentifier(entry.name)} (${columnNames.join(', ')}) VALUES (${values.join(', ')});`
      );
    }
  }

  for (const entry of master) {
    if (entry.type === 'table') continue;
    statements.push(terminate(compactSql(entry.sql)));
  }

  const dump = statements.join('\n');
  await validateDump(adapter, dump, tableNames);
  return dump;
}

/**
 * Restores a dump into the database the adapter is connected to.
 *
 * The restore replaces the database: every table the database holds is dropped, then the
 * dump recreates the tables and their rows. It runs in one transaction, so a dump that
 * fails leaves the database exactly as it was - the tables and their rows survive. The
 * framework's own tables are part of the dump, so the ledger comes back with it and the
 * migrations the backup was taken before are applied again by the next run.
 */
export async function restoreDatabase(adapter: SqliteAdapter, dump: string): Promise<void> {
  const foreignKeys = await foreignKeysEnabled(adapter);
  // A PRAGMA is a no-op inside a transaction, so it is set before the transaction opens.
  await adapter.exec('PRAGMA foreign_keys = OFF');
  try {
    await adapter.transaction(async (tx) => {
      await dropAllTables(tx);
      await tx.exec(dump);
    });
  } finally {
    await adapter.exec(`PRAGMA foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`);
  }
}
