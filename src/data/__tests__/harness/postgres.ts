// ABOUTME: The optional Postgres path of the integration harness: a driver over the `pg`
// ABOUTME: client that speaks the repository's SQL, with the dialect differences bridged.

import { randomUUID } from 'node:crypto';

import {
  canonicalDatabaseSchema,
  createSqliteAdapter,
  type SqliteAdapter,
  type SqliteDriver,
  type SqliteRunResult,
  type SqliteValue,
} from '@/data/adapters/sqlite';
import { ENTITY_NAMES, type EntityName } from '@/domain/schema';

import { referenceOrder } from './order';

/** The parts of a `pg` client the driver uses. */
interface PgClient {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(text: string, values?: readonly unknown[]): Promise<{
    rows: unknown[];
    rowCount: number | null;
  }>;
}

/** The type registry of `pg`: it decides how a column value is parsed. */
interface PgTypeRegistry {
  getTypeParser(oid: number, format?: string): (value: string) => unknown;
  setTypeParser(
    oid: number,
    format: string | ((value: string) => unknown),
    parseFn?: (value: string) => unknown
  ): void;
}

/** The object id of a Postgres `bigint`. */
const INT8_OID = 20;

/**
 * A type registry that reads a `bigint` as a number.
 *
 * `COUNT(*)` is a `bigint` in Postgres and a number in SQLite, and `pg` reads a
 * `bigint` as a string. The repository compares a count with `=== 0`, so the driver
 * hands it the number the SQLite driver would have returned. The registry belongs to
 * this client alone; the global one of `pg` is left alone.
 */
export function int8AsNumber(base: PgTypeRegistry): PgTypeRegistry {
  const overrides = new Map<string, (value: string) => unknown>();
  const key = (oid: number, format: string | undefined): string =>
    `${format ?? 'text'}:${oid}`;

  overrides.set(key(INT8_OID, 'text'), (value: string) => Number(value));

  return {
    getTypeParser(oid: number, format?: string): (value: string) => unknown {
      const own = overrides.get(key(oid, format));
      if (own) return own;
      return base.getTypeParser(oid, format);
    },
    setTypeParser(
      oid: number,
      format: string | ((value: string) => unknown),
      parseFn?: (value: string) => unknown
    ): void {
      if (typeof format === 'function') {
        overrides.set(key(oid, 'text'), format);
        return;
      }
      if (!parseFn) return;
      overrides.set(key(oid, format), parseFn);
    },
  };
}

/** The error fields of a `pg` failure the driver reads. */
interface PgError {
  readonly code?: string;
  readonly constraint?: string;
  readonly table?: string;
  readonly column?: string;
  readonly detail?: string;
  readonly message?: string;
}

/** A Postgres database the harness owns. */
export interface PostgresHarness {
  /** The adapter the repository runs on. */
  readonly adapter: SqliteAdapter;
  /** The schema the harness works in; every context gets its own. */
  readonly schema: string;
  /** Drops the schema and closes the connection. The drop happens first: the closed
   * connection cannot run it. A failed drop is reported, not swallowed. */
  dispose(): Promise<void>;
}

/** The options of the Postgres path. */
export interface PostgresHarnessOptions {
  /** The connection string of the server. */
  readonly connectionString: string;
  /** The schema to work in. A fresh one is created when it is not given. */
  readonly schema?: string;
}

/** The name of a fresh schema for a harness context. */
export function newSchemaName(): string {
  return `sp_test_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

/**
 * The entities in an order their foreign keys allow the tables to be created in.
 *
 * SQLite accepts a table that references a table that does not exist yet, so the
 * canonical DDL can be applied in registry order. Postgres does not, so the tables are
 * created parents first.
 */
export function canonicalSchemaOrder(
  entities: readonly EntityName[] = ENTITY_NAMES
): readonly EntityName[] {
  return referenceOrder(entities);
}

/**
 * Rewrites the SQL of the repository for Postgres.
 *
 * The repository speaks the SQLite dialect, because that is the database the product
 * runs on. Three constructs differ and are bridged here:
 *
 * - `PRAGMA` has no Postgres equivalent. The foreign-key pragma becomes the answer
 *   Postgres always gives, and `PRAGMA table_info` becomes a read of
 *   `information_schema.columns`.
 * - `BEGIN IMMEDIATE` is SQLite's spelling of a transaction; Postgres writes `BEGIN`.
 * - `rowid` is SQLite's row locator; Postgres names the same thing `ctid`.
 */
export function translateSql(sql: string): string {
  return numberPlaceholders(rewriteDialect(rewritePragmas(sql)));
}

const PRAGMA_TABLE_INFO = /^PRAGMA\s+table_info\(\s*"([^"]*)"\s*\)\s*;?$/i;
const PRAGMA_FOREIGN_KEYS = /^PRAGMA\s+foreign_keys\s*;?$/i;
const PRAGMA_FOREIGN_KEYS_SET = /^PRAGMA\s+foreign_keys\s*=\s*(?:ON|OFF)\s*;?$/i;
const PRAGMA_BUSY_TIMEOUT = /^PRAGMA\s+busy_timeout\s*=\s*\d+\s*;?$/i;

function rewritePragmas(sql: string): string {
  const tableInfo = PRAGMA_TABLE_INFO.exec(sql);
  if (tableInfo) {
    const table = tableInfo[1] ?? '';
    return (
      'SELECT column_name AS name FROM information_schema.columns ' +
      `WHERE table_schema = current_schema() AND table_name = '${table.replace(/'/g, "''")}'`
    );
  }
  if (PRAGMA_FOREIGN_KEYS.test(sql)) return 'SELECT 1 AS foreign_keys';
  if (PRAGMA_FOREIGN_KEYS_SET.test(sql)) return 'SELECT 1';
  if (PRAGMA_BUSY_TIMEOUT.test(sql)) return 'SELECT 1';
  return sql;
}

function rewriteDialect(sql: string): string {
  let rewritten = sql.replace(/^BEGIN\s+IMMEDIATE\s*;?$/i, 'BEGIN');
  rewritten = rewritten.replace(/"rowid"/g, 'ctid');
  return rewritten;
}

/**
 * Numbers the placeholders the way Postgres expects them.
 *
 * A `?` inside a string literal is left alone; the repository never writes one, but the
 * rewrite must not corrupt a literal that happens to hold a question mark.
 */
export function numberPlaceholders(sql: string): string {
  let result = '';
  let index = 0;
  let position = 0;

  while (position < sql.length) {
    const char = sql[position];
    if (char === "'") {
      const end = endOfStringLiteral(sql, position);
      result += sql.slice(position, end);
      position = end;
      continue;
    }
    if (char === '?') {
      index += 1;
      result += `$${index}`;
      position += 1;
      continue;
    }
    result += char;
    position += 1;
  }

  return result;
}

function endOfStringLiteral(sql: string, start: number): number {
  let position = start + 1;
  while (position < sql.length) {
    const char = sql[position];
    if (char === '\\') {
      position += 2;
      continue;
    }
    if (char === "'") {
      if (sql[position + 1] === "'") {
        position += 2;
        continue;
      }
      return position + 1;
    }
    position += 1;
  }
  return sql.length;
}

/** The value a Postgres driver returns, in the shape the adapter core accepts. */
export function normaliseValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value)) return new Uint8Array(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

/** One row of a Postgres result, in the shape the adapter core accepts. */
export function normaliseRow(row: unknown): unknown {
  if (row === null || typeof row !== 'object' || Array.isArray(row)) return row;
  const normalised: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(row as Record<string, unknown>)) {
    normalised[column] = normaliseValue(value);
  }
  return normalised;
}

/** The value a caller binds, in the shape the Postgres driver accepts. */
function normaliseParam(value: SqliteValue): unknown {
  if (value === null) return null;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Uint8Array) return Buffer.from(value);
  return value;
}

/**
 * Rewrites a Postgres failure into the wording the repository reads.
 *
 * The repository maps a failed statement onto a typed error by looking at the message of
 * the driver, and SQLite and Postgres word the same violation differently. The driver
 * reports the SQLite wording, so the typed errors are the same on both databases.
 */
export function normaliseError(error: unknown): unknown {
  if (!error || typeof error !== 'object') return error;
  const pgError = error as PgError;

  switch (pgError.code) {
    case '23505':
      return new Error(`UNIQUE constraint failed: ${uniqueTarget(pgError)}`, { cause: error });
    case '23502':
      return new Error(`NOT NULL constraint failed: ${notNullTarget(pgError)}`, { cause: error });
    case '23503':
      return new Error('FOREIGN KEY constraint failed', { cause: error });
    case '23514':
      return new Error('CHECK constraint failed', { cause: error });
    default:
      return error;
  }
}

function uniqueTarget(error: PgError): string {
  const table = error.table ?? '';
  const columns = keyColumns(error.detail);
  if (columns.length === 0) return table;
  return columns.map((column) => (table ? `${table}.${column}` : column)).join(', ');
}

function notNullTarget(error: PgError): string {
  const table = error.table ?? '';
  const fromMessage = /null value in column "([^"]+)"/.exec(error.message ?? '');
  const column = error.column ?? fromMessage?.[1] ?? '';
  return table && column ? `${table}.${column}` : table;
}

function keyColumns(detail: string | undefined): string[] {
  if (!detail) return [];
  const match = /Key \(([^)]*)\)/.exec(detail);
  if (!match) return [];
  return (match[1] ?? '')
    .split(',')
    .map((column) => column.trim())
    .filter((column) => column.length > 0);
}

/**
 * The driver that runs the repository's SQL on a Postgres server.
 *
 * It sits under the same adapter core as the SQLite drivers, so the queue, the
 * transactions, the DDL application and the error mapping are the ones the product uses.
 * The adapter core names its drivers `node` and `wasm`, and this one reports `node`:
 * it is a server-side driver, and nothing in the product branches on the name.
 */
class PostgresDriver implements SqliteDriver {
  readonly name = 'node' as const;
  private connected = false;

  constructor(
    private readonly client: PgClient,
    private readonly schema: string
  ) {}

  async open(): Promise<void> {
    if (this.connected) return;
    await this.client.connect();
    this.connected = true;
    await this.client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schema)}`);
    await this.client.query(`SET search_path TO ${quoteIdentifier(this.schema)}`);
  }

  async close(): Promise<void> {
    if (!this.connected) return;
    this.connected = false;
    await this.client.end();
  }

  async exec(sql: string): Promise<void> {
    await this.execute(sql, []);
  }

  async all(sql: string, params: readonly SqliteValue[]): Promise<unknown[]> {
    const result = await this.execute(sql, params);
    return result.rows;
  }

  async get(sql: string, params: readonly SqliteValue[]): Promise<unknown> {
    const result = await this.execute(sql, params);
    return result.rows[0] ?? null;
  }

  async run(sql: string, params: readonly SqliteValue[]): Promise<SqliteRunResult> {
    const result = await this.execute(sql, params);
    return { changes: result.rowCount ?? 0, lastInsertRowid: 0 };
  }

  private async execute(
    sql: string,
    params: readonly SqliteValue[]
  ): Promise<{ rows: unknown[]; rowCount: number | null }> {
    try {
      const result = await this.client.query(
        translateSql(sql),
        params.map(normaliseParam)
      );
      return { rows: result.rows.map(normaliseRow), rowCount: result.rowCount };
    } catch (error) {
      throw normaliseError(error);
    }
  }
}

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Opens a Postgres database for the harness.
 *
 * The connection string comes from the environment (`DATABASE_URL`) in CI, so the same
 * harness runs against SQLite locally and against Postgres in the pipeline.
 */
export async function createPostgresHarness(
  options: PostgresHarnessOptions
): Promise<PostgresHarness> {
  const schema = options.schema ?? newSchemaName();
  const ownsSchema = options.schema === undefined;
  const pg = await import('pg');
  const client = new pg.Client({
    connectionString: options.connectionString,
    types: int8AsNumber(pg.types as unknown as PgTypeRegistry),
  }) as unknown as PgClient;
  const driver = new PostgresDriver(client, schema);
  const adapter = createSqliteAdapter(driver, { foreignKeys: true });

  await adapter.open();

  return {
    adapter,
    schema,
    dispose: async () => {
      // The schema has to go while the client is still open: the adapter closes the
      // connection when it closes, and a closed client cannot run the DROP. The failure
      // is not swallowed - a schema that stays behind is a leak the caller has to see.
      let failure: unknown;
      if (ownsSchema) {
        try {
          await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
        } catch (error) {
          failure = error;
        }
      }
      await adapter.close();
      if (failure !== undefined) throw failure;
    },
  };
}

/**
 * Applies the canonical DDL in an order Postgres accepts.
 *
 * The tables are created parents first, so every foreign key names a table that exists.
 * The statements are the canonical ones, unchanged.
 */
export async function applyCanonicalSchemaForPostgres(adapter: SqliteAdapter): Promise<void> {
  await adapter.applySchema(canonicalSchemaOrder().map(canonicalDatabaseSchema));
}
