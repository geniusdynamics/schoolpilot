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
  /** The database as one file image (a node Buffer). */
  serialize(): Uint8Array;
  close(): void;
}

interface BetterSqlite3Constructor {
  /** A Buffer instead of a file name opens an in-memory database holding that image. */
  new (filename: string | Uint8Array, options?: { readonly?: boolean }): BetterSqlite3Database;
}

interface NodeBuffer {
  from(buffer: ArrayBufferLike, byteOffset: number, length: number): Uint8Array;
}

const NODE_MODULE = 'node:module';
const NODE_FS = 'node:fs';
const BETTER_SQLITE3 = 'better-sqlite3';

/** better-sqlite3 accepts an image only as a node Buffer; wrap the bytes without copying them. */
function asNodeBuffer(bytes: Uint8Array): Uint8Array {
  const buffer = (globalThis as { Buffer?: NodeBuffer }).Buffer;
  if (!buffer) throw new Error('The node SQLite driver needs the node Buffer global');
  return buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function isInMemory(filename: string): boolean {
  return filename === ':memory:' || filename === '';
}

/**
 * Open a file image as an in-memory database and read its schema once: SQLite accepts any
 * bytes at open time and only reports "file is not a database" on the first read.
 */
function openImage(Database: BetterSqlite3Constructor, bytes: Uint8Array): BetterSqlite3Database {
  const database = new Database(asNodeBuffer(bytes));
  try {
    database.prepare('SELECT count(*) FROM sqlite_master').get();
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

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

  async exportDatabase(): Promise<Uint8Array> {
    // Copy out of the node Buffer pool so the caller owns a plain, independent array.
    return new Uint8Array(this.db().serialize());
  }

  async importDatabase(bytes: Uint8Array): Promise<void> {
    if (this.options.readonly === true) {
      throw new Error('A read-only database cannot be replaced');
    }
    const current = this.db();
    const Database = await loadBetterSqlite3();
    const filename = this.options.filename ?? ':memory:';

    // Open the image first: if it is not a database the current connection is untouched.
    const replacement = openImage(Database, bytes);
    if (isInMemory(filename)) {
      current.close();
      this.database = replacement;
      return;
    }
    replacement.close();

    // A file database is written beside the original and renamed over it, so a failure before
    // the rename leaves the original file as it was, and the driver reopens it.
    const fs = (await import(/* @vite-ignore */ NODE_FS)) as typeof import('node:fs');
    const staging = `${filename}.import`;
    fs.writeFileSync(staging, bytes);
    current.close();
    this.database = null;
    try {
      fs.renameSync(staging, filename);
    } finally {
      this.database = new Database(filename);
    }
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
