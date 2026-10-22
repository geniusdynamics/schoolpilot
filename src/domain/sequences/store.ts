// ABOUTME: The store the sequences are counted on: its DDL, the port the service codes against,
// ABOUTME: and the SQLite implementation whose atomic counter and unique ledger make a number unique.

import {
  SqliteAdapterError,
  type SqliteAdapter,
  type SqliteBindValue,
  type SqliteTransaction,
} from '@/data/adapters/sqlite';

import { SequenceConflictError, SequenceStoreError } from './errors';
import type { BlockStatus, BlockSummary, IssuedNumber } from './types';

/** The table holding one counter per sequence and scope. */
export const SEQUENCE_COUNTER_TABLE = 'sequence_counter';
/** The ledger of every number handed out. */
export const SEQUENCE_NUMBER_TABLE = 'sequence_number';
/** The ranges of numbers reserved by offline devices. */
export const SEQUENCE_BLOCK_TABLE = 'sequence_block';

/**
 * The DDL of the sequence store.
 *
 * A canonical migration must apply these statements; `ensureSequenceSchema` does it, and the
 * tests call it. Nothing here references a domain table, so the module can be adopted before the
 * document tables grow their own sequence columns.
 */
export const SEQUENCE_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${SEQUENCE_COUNTER_TABLE} (
     sequence TEXT NOT NULL,
     scope_key TEXT NOT NULL,
     next_value INTEGER NOT NULL,
     PRIMARY KEY (sequence, scope_key)
   )`,
  `CREATE TABLE IF NOT EXISTS ${SEQUENCE_NUMBER_TABLE} (
     sequence TEXT NOT NULL,
     scope_key TEXT NOT NULL,
     seq INTEGER NOT NULL,
     number TEXT NOT NULL,
     issued_at TEXT NOT NULL,
     device_id TEXT,
     block_start INTEGER,
     PRIMARY KEY (sequence, scope_key, seq)
   )`,
  // The counter already never goes backwards; this index is what makes "never reused" a
  // property of the database. A reset, a replayed block or a hand-edited counter cannot record
  // a number that is already in the ledger.
  `CREATE UNIQUE INDEX IF NOT EXISTS ${SEQUENCE_NUMBER_TABLE}_value
     ON ${SEQUENCE_NUMBER_TABLE} (sequence, scope_key, number)`,
  `CREATE TABLE IF NOT EXISTS ${SEQUENCE_BLOCK_TABLE} (
     sequence TEXT NOT NULL,
     scope_key TEXT NOT NULL,
     device_id TEXT NOT NULL,
     start_seq INTEGER NOT NULL,
     end_seq INTEGER NOT NULL,
     used_upto INTEGER,
     status TEXT NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     PRIMARY KEY (sequence, scope_key, device_id, start_seq)
   )`,
  // Two devices must never be handed the same range, whatever the counter says.
  `CREATE UNIQUE INDEX IF NOT EXISTS ${SEQUENCE_BLOCK_TABLE}_range
     ON ${SEQUENCE_BLOCK_TABLE} (sequence, scope_key, start_seq)`,
  `CREATE INDEX IF NOT EXISTS ${SEQUENCE_BLOCK_TABLE}_outstanding
     ON ${SEQUENCE_BLOCK_TABLE} (sequence, scope_key, status)`,
];

/** A number about to be recorded in the ledger. */
export interface IssuedNumberEntry {
  readonly sequence: string;
  readonly scopeKey: string;
  readonly seq: number;
  readonly number: string;
  readonly issuedAt: string;
  readonly deviceId?: string | null;
  readonly blockStart?: number | null;
}

/** A reserved range about to be recorded. */
export interface BlockEntry {
  readonly sequence: string;
  readonly scopeKey: string;
  readonly deviceId: string;
  readonly startSeq: number;
  readonly endSeq: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Narrows a block query. */
export interface BlockFilter {
  readonly sequence?: string;
  readonly scopeKey?: string;
  readonly deviceId?: string;
}

/**
 * The persistence a sequence needs.
 *
 * The contract is deliberately small and the guarantees are the store's: `allocate` takes values
 * atomically (two callers never get the same one) and `record` refuses a number that is already
 * in the ledger. A caller never reads a counter and writes it back, so there is no race to lose.
 *
 * `transaction` hands the callback a store bound to that transaction. Every statement a sequence
 * makes must go through the bound store: the adapter refuses a public call while a transaction is
 * open, which is what keeps a number and the work it belongs to in one unit.
 */
export interface SequenceStore {
  /** Runs `work` in one store transaction, so several store calls commit together. */
  transaction<T>(work: (tx: SequenceStore) => Promise<T>): Promise<T>;
  /**
   * Takes the next `count` values for a scope and returns the highest one taken.
   *
   * Atomic: the counter row is upserted in a single statement, so concurrent callers each get a
   * distinct run. A `count` of 1 is a single number; a `count` of 50 reserves a device block.
   */
  allocate(sequence: string, scopeKey: string, count: number): Promise<number>;
  /** The highest value handed out for a scope, or 0 when none has been. */
  counterValue(sequence: string, scopeKey: string): Promise<number>;
  /** Records an issued number; a duplicate is refused by the store's unique key. */
  record(entry: IssuedNumberEntry): Promise<void>;
  /** One recorded number, or null. */
  issued(sequence: string, scopeKey: string, seq: number): Promise<IssuedNumber | null>;
  /** How many numbers the ledger holds for a scope. */
  countIssued(sequence: string, scopeKey: string): Promise<number>;
  /** The recorded numbers of a scope, lowest first. */
  listIssued(sequence: string, scopeKey: string, limit?: number): Promise<readonly IssuedNumber[]>;
  /** Records a reserved range. */
  createBlock(entry: BlockEntry): Promise<void>;
  /** Takes the next value of a reserved block, or null when the block is used up. */
  claimWithinBlock(input: {
    sequence: string;
    scopeKey: string;
    deviceId: string;
    startSeq: number;
    updatedAt: string;
  }): Promise<number | null>;
  /** The device's current open block for a scope, or null. */
  openBlock(sequence: string, scopeKey: string, deviceId: string): Promise<BlockSummary | null>;
  /** Marks a block released. The numbers it did not use stay burnt. */
  releaseBlock(input: {
    sequence: string;
    scopeKey: string;
    deviceId: string;
    startSeq: number;
    updatedAt: string;
  }): Promise<void>;
  /** Every block, ordered by sequence, scope and start. */
  blocks(filter?: BlockFilter): Promise<readonly BlockSummary[]>;
  /** The blocks still holding numbers: the ones the hub cannot hand to anyone else. */
  outstandingBlocks(filter?: BlockFilter): Promise<readonly BlockSummary[]>;
}

const ALLOCATE_SQL = `INSERT INTO ${SEQUENCE_COUNTER_TABLE} (sequence, scope_key, next_value)
   VALUES (?, ?, ?)
   ON CONFLICT (sequence, scope_key) DO UPDATE SET next_value = next_value + excluded.next_value
   RETURNING next_value AS value`;

const COUNTER_SQL = `SELECT next_value AS value FROM ${SEQUENCE_COUNTER_TABLE} WHERE sequence = ? AND scope_key = ?`;

const RECORD_SQL = `INSERT INTO ${SEQUENCE_NUMBER_TABLE} (sequence, scope_key, seq, number, issued_at, device_id, block_start)
   VALUES (?, ?, ?, ?, ?, ?, ?)`;

const ISSUED_COLUMNS =
  'sequence, scope_key AS scopeKey, seq, number, issued_at AS issuedAt, device_id AS deviceId, block_start AS blockStart';

const ISSUED_SQL = `SELECT ${ISSUED_COLUMNS} FROM ${SEQUENCE_NUMBER_TABLE} WHERE sequence = ? AND scope_key = ? AND seq = ?`;

const COUNT_ISSUED_SQL = `SELECT COUNT(*) AS value FROM ${SEQUENCE_NUMBER_TABLE} WHERE sequence = ? AND scope_key = ?`;

const LIST_ISSUED_SQL = `SELECT ${ISSUED_COLUMNS} FROM ${SEQUENCE_NUMBER_TABLE} WHERE sequence = ? AND scope_key = ? ORDER BY seq LIMIT ?`;

const CREATE_BLOCK_SQL = `INSERT INTO ${SEQUENCE_BLOCK_TABLE} (sequence, scope_key, device_id, start_seq, end_seq, used_upto, status, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, NULL, 'open', ?, ?)`;

const CLAIM_SQL = `UPDATE ${SEQUENCE_BLOCK_TABLE}
   SET used_upto = COALESCE(used_upto, start_seq - 1) + 1,
       status = CASE WHEN COALESCE(used_upto, start_seq - 1) + 1 >= end_seq THEN 'exhausted' ELSE 'open' END,
       updated_at = ?
   WHERE sequence = ? AND scope_key = ? AND device_id = ? AND start_seq = ?
     AND status = 'open'
     AND COALESCE(used_upto, start_seq - 1) < end_seq
   RETURNING used_upto AS value`;

const BLOCK_COLUMNS =
  'sequence, scope_key AS scopeKey, device_id AS deviceId, start_seq AS startSeq, end_seq AS endSeq, used_upto AS usedUpto, status, created_at AS createdAt, updated_at AS updatedAt';

const OPEN_BLOCK_SQL = `SELECT ${BLOCK_COLUMNS} FROM ${SEQUENCE_BLOCK_TABLE}
   WHERE sequence = ? AND scope_key = ? AND device_id = ? AND status = 'open'
   ORDER BY start_seq DESC LIMIT 1`;

const RELEASE_SQL = `UPDATE ${SEQUENCE_BLOCK_TABLE} SET status = 'released', updated_at = ?
   WHERE sequence = ? AND scope_key = ? AND device_id = ? AND start_seq = ?`;

/** Applies the store's DDL; safe to call repeatedly. */
export function ensureSequenceSchema(adapter: SqliteAdapter): Promise<void> {
  return adapter.transaction(async (tx) => {
    for (const statement of SEQUENCE_DDL) {
      await tx.exec(statement);
    }
  });
}

/** Builds the SQLite store over an open adapter. */
export function createSqliteSequenceStore(adapter: SqliteAdapter): SequenceStore {
  return new SqliteSequenceStore(adapter, adapter);
}

interface BlockRow {
  readonly sequence: string;
  readonly scopeKey: string;
  readonly deviceId: string;
  readonly startSeq: number;
  readonly endSeq: number;
  readonly usedUpto: number | null;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * The SQLite store.
 *
 * `runner` is the adapter outside a transaction and the transaction handle inside one, so a
 * statement never has to know which it is running on. A transaction binds a *new* store rather
 * than mutating this one, so two overlapping callers can never borrow each other's transaction.
 */
class SqliteSequenceStore implements SequenceStore {
  constructor(
    private readonly runner: SqliteTransaction,
    private readonly adapter: SqliteAdapter | null
  ) {}

  async transaction<T>(work: (tx: SequenceStore) => Promise<T>): Promise<T> {
    if (!this.adapter) {
      throw new SequenceStoreError(
        'nested_transaction',
        'this store is already bound to a transaction; a sequence cannot open a second one'
      );
    }
    try {
      return await this.adapter.transaction((tx) => work(new SqliteSequenceStore(tx, null)));
    } catch (error) {
      throw this.translate(error);
    }
  }

  async allocate(sequence: string, scopeKey: string, count: number): Promise<number> {
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new SequenceStoreError('storage', `an allocation count must be a positive integer, got ${count}`);
    }
    try {
      const row = await this.runner.get<{ value: number }>(ALLOCATE_SQL, [sequence, scopeKey, count]);
      if (!row || !Number.isSafeInteger(row.value)) {
        throw new SequenceStoreError('storage', 'the sequence counter did not return a value');
      }
      return row.value;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async counterValue(sequence: string, scopeKey: string): Promise<number> {
    try {
      const row = await this.runner.get<{ value: number }>(COUNTER_SQL, [sequence, scopeKey]);
      return row && Number.isSafeInteger(row.value) ? row.value : 0;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async record(entry: IssuedNumberEntry): Promise<void> {
    try {
      await this.runner.run(RECORD_SQL, [
        entry.sequence,
        entry.scopeKey,
        entry.seq,
        entry.number,
        entry.issuedAt,
        entry.deviceId ?? null,
        entry.blockStart ?? null,
      ]);
    } catch (error) {
      throw this.translate(error, entry);
    }
  }

  async issued(sequence: string, scopeKey: string, seq: number): Promise<IssuedNumber | null> {
    try {
      return await this.runner.get<IssuedNumber>(ISSUED_SQL, [sequence, scopeKey, seq]);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async countIssued(sequence: string, scopeKey: string): Promise<number> {
    try {
      const row = await this.runner.get<{ value: number }>(COUNT_ISSUED_SQL, [sequence, scopeKey]);
      return row && Number.isSafeInteger(row.value) ? row.value : 0;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async listIssued(sequence: string, scopeKey: string, limit = 1000): Promise<readonly IssuedNumber[]> {
    try {
      return await this.runner.all<IssuedNumber>(LIST_ISSUED_SQL, [sequence, scopeKey, limit]);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async createBlock(entry: BlockEntry): Promise<void> {
    try {
      await this.runner.run(CREATE_BLOCK_SQL, [
        entry.sequence,
        entry.scopeKey,
        entry.deviceId,
        entry.startSeq,
        entry.endSeq,
        entry.createdAt,
        entry.updatedAt,
      ]);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async claimWithinBlock(input: {
    sequence: string;
    scopeKey: string;
    deviceId: string;
    startSeq: number;
    updatedAt: string;
  }): Promise<number | null> {
    try {
      const row = await this.runner.get<{ value: number }>(CLAIM_SQL, [
        input.updatedAt,
        input.sequence,
        input.scopeKey,
        input.deviceId,
        input.startSeq,
      ]);
      return row && Number.isSafeInteger(row.value) ? row.value : null;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async openBlock(sequence: string, scopeKey: string, deviceId: string): Promise<BlockSummary | null> {
    try {
      const row = await this.runner.get<BlockRow>(OPEN_BLOCK_SQL, [sequence, scopeKey, deviceId]);
      return row ? toBlockSummary(row) : null;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async releaseBlock(input: {
    sequence: string;
    scopeKey: string;
    deviceId: string;
    startSeq: number;
    updatedAt: string;
  }): Promise<void> {
    try {
      await this.runner.run(RELEASE_SQL, [
        input.updatedAt,
        input.sequence,
        input.scopeKey,
        input.deviceId,
        input.startSeq,
      ]);
    } catch (error) {
      throw this.translate(error);
    }
  }

  blocks(filter?: BlockFilter): Promise<readonly BlockSummary[]> {
    return this.queryBlocks(filter);
  }

  outstandingBlocks(filter?: BlockFilter): Promise<readonly BlockSummary[]> {
    return this.queryBlocks(filter, 'open');
  }

  private async queryBlocks(filter?: BlockFilter, status?: BlockStatus): Promise<readonly BlockSummary[]> {
    const conditions: string[] = [];
    const params: SqliteBindValue[] = [];
    if (filter?.sequence !== undefined) {
      conditions.push('sequence = ?');
      params.push(filter.sequence);
    }
    if (filter?.scopeKey !== undefined) {
      conditions.push('scope_key = ?');
      params.push(filter.scopeKey);
    }
    if (filter?.deviceId !== undefined) {
      conditions.push('device_id = ?');
      params.push(filter.deviceId);
    }
    if (status !== undefined) {
      conditions.push('status = ?');
      params.push(status);
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT ${BLOCK_COLUMNS} FROM ${SEQUENCE_BLOCK_TABLE}${where} ORDER BY sequence, scope_key, start_seq`;
    try {
      const rows = await this.runner.all<BlockRow>(sql, params);
      return rows.map(toBlockSummary);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Turns an adapter failure into the module's own error.
   *
   * A unique violation on the ledger is the acceptance criterion working: the store refused a
   * number it already holds.
   */
  private translate(error: unknown, entry?: IssuedNumberEntry): Error {
    if (error instanceof SequenceStoreError || error instanceof SequenceConflictError) return error;
    if (error instanceof SqliteAdapterError) {
      if (error.code === 'nested_transaction') {
        return new SequenceStoreError('nested_transaction', error.message, { cause: error });
      }
      if (error.constraint === 'unique' && entry) {
        return new SequenceConflictError(entry, `the number "${entry.number}" is already recorded`, {
          cause: error,
        });
      }
      return new SequenceStoreError('storage', error.message, { cause: error });
    }
    return error instanceof Error ? error : new SequenceStoreError('storage', String(error));
  }
}

function toBlockSummary(row: BlockRow): BlockSummary {
  const status = toBlockStatus(row.status);
  const size = row.endSeq - row.startSeq + 1;
  const used = row.usedUpto === null ? 0 : row.usedUpto - row.startSeq + 1;
  return {
    sequence: row.sequence,
    scopeKey: row.scopeKey,
    deviceId: row.deviceId,
    startSeq: row.startSeq,
    endSeq: row.endSeq,
    size,
    status,
    usedUpto: row.usedUpto,
    used,
    remaining: size - used,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toBlockStatus(value: string): BlockStatus {
  if (value === 'open' || value === 'exhausted' || value === 'released') return value;
  throw new SequenceStoreError('storage', `the block table holds an unknown status "${value}"`);
}
