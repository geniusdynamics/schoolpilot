// ABOUTME: Node SQLite driver backed by better-sqlite3, used by tests, scripts and the LAN
// ABOUTME: server. The module is loaded lazily so browser bundles never include the native addon.

import { createSqliteAdapter, type SqliteAdapterOptions } from './core';
import type {
  SqliteAdapter,
  SqliteDriver,
  SqliteRunResult,
  SqliteValue,
} from './driver';

export interface NodeSqliteAdapterOptions extends SqliteAdapterOptions {
  /** Database file path, or `:memory:` for an ephemeral database. */
  readonly filename?: string;
  readonly readonly?: boolean;
}

interface BetterSqlite3Statement {
  all(...params: SqliteValue[]): unknown[];
  get(...params: SqliteValue[]): unknown;
  run(...params: SqliteValue[]): { changes: number; lastInsertRowid: number | bigint };
}

interface BetterSqlite3Database {
  exec(sql: string): void;
  prepare(sql: string): BetterSqlite3Statement;
  close(): void;
}

interface BetterSqlite3Constructor {
  new (filename: string, options?: { readonly?: boolean }): BetterSqlite3Database;
}

const NODE_MODULE = 'node:module';
const BETTER_SQLITE3 = 'better-sqlite3';

/** Load the native module without a static import, so Vite never bundles it for the browser. */
async function loadBetterSqlite3(): Promise<BetterSqlite3Constructor> {
  const { createRequire } = (await import(/* @vite-ignore */ NODE_MODULE)) as typeof import('node:module');
  const require = createRequire(import.meta.url);
  const loaded: unknown = require(BETTER_SQLITE3);
  const candidate =
    loaded && typeof loaded === 'object' && 'default' in loaded
      ? (loaded as { default: unknown }).default
      : loaded;

  if (typeof candidate !== 'function') {
    throw new Error('better-sqlite3 did not export a database constructor');
  }
  return candidate as BetterSqlite3Constructor;
}

class NodeSqliteDriver implements SqliteDriver {
  readonly name = 'node' as const;
  private database: BetterSqlite3Database | null = null;

  constructor(private readonly options: NodeSqliteAdapterOptions) {}

  async open(): Promise<void> {
    if (this.database) return;
    const Database = await loadBetterSqlite3();
    this.database = new Database(this.options.filename ?? ':memory:', {
      readonly: this.options.readonly === true,
    });
  }

  async close(): Promise<void> {
    if (!this.database) return;
    this.database.close();
    this.database = null;
  }

  async exec(sql: string): Promise<void> {
    this.db().exec(sql);
  }

  async all(sql: string, params: readonly SqliteValue[]): Promise<unknown[]> {
    return this.db().prepare(sql).all(...params);
  }

  async get(sql: string, params: readonly SqliteValue[]): Promise<unknown> {
    return this.db().prepare(sql).get(...params) ?? null;
  }

  async run(sql: string, params: readonly SqliteValue[]): Promise<SqliteRunResult> {
    const result = this.db().prepare(sql).run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid ?? 0,
    };
  }

  private db(): BetterSqlite3Database {
    if (!this.database) throw new Error('better-sqlite3 database is not open');
    return this.database;
  }
}

/** Create a Node adapter; call `open()` before issuing statements. */
export function createNodeSqliteAdapter(
  options: NodeSqliteAdapterOptions = {}
): SqliteAdapter {
  return createSqliteAdapter(new NodeSqliteDriver(options), {
    foreignKeys: options.foreignKeys,
  });
}
