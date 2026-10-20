// ABOUTME: The driver-agnostic SQLite adapter core: statement queue, parameter binding,
// ABOUTME: transactions, DDL application, row decoding and error mapping.

import type { DatabaseSchema } from '@/utils/databaseAgnosticSchema';

import { statementsForSchemas } from './ddl';
import {
  constraintKind,
  SqliteAdapterError,
  type SqliteAdapterErrorCode,
} from './errors';
import {
  isSqliteValue,
  type SqliteAdapter,
  type SqliteBindValue,
  type SqliteDriver,
  type SqliteRow,
  type SqliteRunResult,
  type SqliteTransaction,
  type SqliteValue,
} from './driver';

export interface SqliteAdapterOptions {
  /**
   * Enable SQLite foreign-key enforcement on this connection. Off by default because
   * imports and seeders write tables in dependency order only when they choose to.
   */
  readonly foreignKeys?: boolean;
}

function adapterError(
  error: unknown,
  options: { code?: SqliteAdapterErrorCode; sql?: string } = {}
): SqliteAdapterError {
  if (error instanceof SqliteAdapterError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const constraint = constraintKind(message);
  return new SqliteAdapterError(message, {
    code: options.code ?? (constraint ? 'constraint' : 'driver'),
    sql: options.sql,
    constraint,
    cause: error,
  });
}

function normalizeParams(params: readonly SqliteBindValue[] | undefined): SqliteValue[] {
  if (!params) return [];
  return params.map((value, index) => {
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (isSqliteValue(value)) return value;
    throw new SqliteAdapterError(
      `Unsupported parameter at index ${index}: ${Object.prototype.toString.call(value)}`,
      { code: 'driver' }
    );
  });
}

function normalizeRow(row: unknown): SqliteRow {
  if (row === null || typeof row !== 'object' || Array.isArray(row)) {
    throw new SqliteAdapterError('SQLite driver returned a row that is not an object', {
      code: 'driver',
    });
  }
  const normalized: SqliteRow = {};
  for (const [column, value] of Object.entries(row)) {
    if (isSqliteValue(value)) {
      normalized[column] = value;
    } else if (value instanceof ArrayBuffer) {
      normalized[column] = new Uint8Array(value);
    } else {
      throw new SqliteAdapterError(
        `SQLite driver returned an unsupported value for column "${column}"`,
        { code: 'driver' }
      );
    }
  }
  return normalized;
}

class CoreSqliteAdapter implements SqliteAdapter {
  readonly driverName: SqliteDriver['name'];
  private state: 'closed' | 'open' = 'closed';
  private inTransaction = false;
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly driver: SqliteDriver,
    private readonly options: SqliteAdapterOptions
  ) {
    this.driverName = driver.name;
  }

  get isOpen(): boolean {
    return this.state === 'open';
  }

  /**
   * Serialise every public statement. A transaction callback holds the queue for its whole
   * duration, so no other caller can slip a statement between BEGIN and COMMIT.
   */
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(work, work);
    this.tail = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  open(): Promise<void> {
    const misuse = this.transactionMisuse('open');
    if (misuse) return Promise.reject(misuse);
    return this.enqueue(async () => {
      if (this.state === 'open') return;
      try {
        await this.driver.open();
        await this.driver.exec('PRAGMA busy_timeout = 5000');
        // better-sqlite3 enables enforcement by default while sqlite-wasm does not; set it
        // explicitly on both so the adapter behaves identically. Callers opt in when their
        // import order guarantees parent rows exist.
        await this.driver.exec(`PRAGMA foreign_keys = ${this.options.foreignKeys ? 'ON' : 'OFF'}`);
        this.state = 'open';
      } catch (error) {
        await this.driver.close().catch(() => undefined);
        throw adapterError(error);
      }
    });
  }

  close(): Promise<void> {
    const misuse = this.transactionMisuse('close');
    if (misuse) return Promise.reject(misuse);
    return this.enqueue(async () => {
      if (this.state === 'closed') return;
      try {
        await this.driver.close();
      } catch (error) {
        throw adapterError(error);
      } finally {
        this.state = 'closed';
      }
    });
  }

  exec(sql: string): Promise<void> {
    const misuse = this.transactionMisuse('exec');
    if (misuse) return Promise.reject(misuse);
    return this.enqueue(() => this.execDirect(sql));
  }

  all<T extends object = SqliteRow>(
    sql: string,
    params?: readonly SqliteBindValue[]
  ): Promise<T[]> {
    const misuse = this.transactionMisuse('all');
    if (misuse) return Promise.reject(misuse);
    return this.enqueue(() => this.allDirect<T>(sql, params));
  }

  get<T extends object = SqliteRow>(
    sql: string,
    params?: readonly SqliteBindValue[]
  ): Promise<T | null> {
    const misuse = this.transactionMisuse('get');
    if (misuse) return Promise.reject(misuse);
    return this.enqueue(() => this.getDirect<T>(sql, params));
  }

  run(sql: string, params?: readonly SqliteBindValue[]): Promise<SqliteRunResult> {
    const misuse = this.transactionMisuse('run');
    if (misuse) return Promise.reject(misuse);
    return this.enqueue(() => this.runDirect(sql, params));
  }

  transaction<T>(work: (tx: SqliteTransaction) => Promise<T>): Promise<T> {
    // Reject before enqueueing: an outer transaction owns the queue, so waiting for it
    // here would deadlock instead of reporting the misuse.
    if (this.inTransaction) {
      return Promise.reject(
        new SqliteAdapterError('Nested transactions are not supported', {
          code: 'nested_transaction',
        })
      );
    }
    return this.enqueue(async () => {
      this.assertOpen();
      if (this.inTransaction) {
        throw new SqliteAdapterError('Nested transactions are not supported', {
          code: 'nested_transaction',
        });
      }

      await this.execDirect('BEGIN IMMEDIATE');
      this.inTransaction = true;
      const tx = this.transactionApi();

      try {
        const result = await work(tx);
        await this.execDirect('COMMIT');
        return result;
      } catch (error) {
        try {
          await this.driver.exec('ROLLBACK');
        } catch (rollbackError) {
          const original = error instanceof Error ? error.message : String(error);
          const rollback =
            rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
          throw new SqliteAdapterError(
            `Transaction failed (${original}) and rollback failed (${rollback})`,
            { code: 'transaction', cause: error }
          );
        }
        throw error;
      } finally {
        this.inTransaction = false;
      }
    });
  }

  applySchema(schemas: readonly DatabaseSchema[]): Promise<void> {
    const statements = statementsForSchemas(schemas);
    return this.transaction(async (tx) => {
      for (const statement of statements) {
        await tx.exec(statement);
      }
    });
  }

  private transactionApi(): SqliteTransaction {
    return {
      exec: (sql) => this.execDirect(sql),
      all: <T extends object = SqliteRow>(sql: string, params?: readonly SqliteBindValue[]) =>
        this.allDirect<T>(sql, params),
      get: <T extends object = SqliteRow>(sql: string, params?: readonly SqliteBindValue[]) =>
        this.getDirect<T>(sql, params),
      run: (sql, params) => this.runDirect(sql, params),
    };
  }

  private assertOpen(): void {
    if (this.state !== 'open') {
      throw new SqliteAdapterError('SQLite adapter is not open', { code: 'not_open' });
    }
  }

  /** Queue-holding transactions must be driven through the callback's transaction object. */
  private transactionMisuse(operation: string): SqliteAdapterError | null {
    if (!this.inTransaction) return null;
    return new SqliteAdapterError(
      `Cannot call adapter.${operation}() inside a transaction`,
      { code: 'nested_transaction' }
    );
  }

  private async execDirect(sql: string): Promise<void> {
    this.assertOpen();
    try {
      await this.driver.exec(sql);
    } catch (error) {
      throw adapterError(error, { sql });
    }
  }

  private async allDirect<T extends object = SqliteRow>(
    sql: string,
    params?: readonly SqliteBindValue[]
  ): Promise<T[]> {
    this.assertOpen();
    try {
      const rows = await this.driver.all(sql, normalizeParams(params));
      return rows.map(normalizeRow) as unknown as T[];
    } catch (error) {
      throw adapterError(error, { sql });
    }
  }

  private async getDirect<T extends object = SqliteRow>(
    sql: string,
    params?: readonly SqliteBindValue[]
  ): Promise<T | null> {
    this.assertOpen();
    try {
      const row = await this.driver.get(sql, normalizeParams(params));
      return row === null || row === undefined ? null : (normalizeRow(row) as unknown as T);
    } catch (error) {
      throw adapterError(error, { sql });
    }
  }

  private async runDirect(
    sql: string,
    params?: readonly SqliteBindValue[]
  ): Promise<SqliteRunResult> {
    this.assertOpen();
    try {
      return await this.driver.run(sql, normalizeParams(params));
    } catch (error) {
      throw adapterError(error, { sql });
    }
  }
}

/** Build an adapter around any driver; both factories in this package use this core. */
export function createSqliteAdapter(
  driver: SqliteDriver,
  options: SqliteAdapterOptions = {}
): SqliteAdapter {
  return new CoreSqliteAdapter(driver, options);
}
