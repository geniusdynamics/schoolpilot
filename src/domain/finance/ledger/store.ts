// ABOUTME: The store the ledger is written to: its DDL (the entry and line tables, the periods and
// ABOUTME: the immutability triggers), the port the engine codes against, and the SQLite
// ABOUTME: implementation that reads and writes it.

import {
  SqliteAdapterError,
  type SqliteAdapter,
  type SqliteBindValue,
  type SqliteTransaction,
} from '@/data/adapters/sqlite';
import { AUDIT_TABLE, applyAuditSchema, writeAuditEvent } from '@/data/repository';
import { fromMinor, isCurrencyCode, type CurrencyCode } from '@/domain/money';

import { LedgerError } from './errors';
import type {
  EntryQuery,
  JournalEntry,
  JournalLine,
  LedgerAuditEvent,
  LedgerPeriod,
  LedgerPeriodStatus,
  SourceDocument,
  SourceDocumentKind,
} from './types';

/** The table holding one row per journal entry. */
export const LEDGER_ENTRY_TABLE = 'journal_entry';
/** The table holding the lines of every entry. */
export const LEDGER_LINE_TABLE = 'journal_line';
/** The table holding the accounting periods an institution can close. */
export const LEDGER_PERIOD_TABLE = 'ledger_period';
/** The entity name a posting is recorded under in the repository's audit trail. */
export const LEDGER_ENTRY_AUDIT_ENTITY = 'journal_entry';
/** The entity name a period change is recorded under in the repository's audit trail. */
export const LEDGER_PERIOD_AUDIT_ENTITY = 'ledger_period';

/** How many entries a read returns when the caller names no limit. */
export const DEFAULT_ENTRY_LIMIT = 10_000;
/** The most entries a single read returns. */
export const MAX_ENTRY_LIMIT = 100_000;

const SOURCE_KINDS: readonly SourceDocumentKind[] = [
  'invoice',
  'payment',
  'refund',
  'credit_note',
  'opening_balance',
];

/**
 * The DDL of the ledger.
 *
 * A canonical migration must apply these statements; `ensureLedgerSchema` does it, and the tests
 * call it. The three partial unique indexes are the invariants of the posting engine expressed in
 * the database: one original posting per document, one reversal per entry, one correction per
 * document. The four triggers make a posted entry and its lines immutable: an edit and a delete
 * are refused by the database itself, not by a convention the application could forget.
 */
export const LEDGER_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "${LEDGER_ENTRY_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "entry_date" TEXT NOT NULL,
     "source_kind" TEXT NOT NULL,
     "source_id" TEXT NOT NULL,
     "source_number" TEXT,
     "narration" TEXT NOT NULL,
     "currency" TEXT NOT NULL,
     "total_debit_minor" INTEGER NOT NULL,
     "total_credit_minor" INTEGER NOT NULL,
     "period_id" TEXT,
     "reverses_entry_id" TEXT REFERENCES "${LEDGER_ENTRY_TABLE}" ("id"),
     "corrects_entry_id" TEXT REFERENCES "${LEDGER_ENTRY_TABLE}" ("id"),
     "reversal_reason" TEXT,
     "posted_at" TEXT NOT NULL,
     "posted_by" TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS "${LEDGER_ENTRY_TABLE}_institution_date"
     ON "${LEDGER_ENTRY_TABLE}" ("institution_id", "entry_date")`,
  `CREATE INDEX IF NOT EXISTS "${LEDGER_ENTRY_TABLE}_source"
     ON "${LEDGER_ENTRY_TABLE}" ("institution_id", "source_kind", "source_id")`,
  // One original posting per document: a replayed billing run cannot post an invoice twice.
  `CREATE UNIQUE INDEX IF NOT EXISTS "${LEDGER_ENTRY_TABLE}_one_original"
     ON "${LEDGER_ENTRY_TABLE}" ("institution_id", "source_kind", "source_id")
     WHERE "reverses_entry_id" IS NULL AND "corrects_entry_id" IS NULL`,
  // An entry is reversed once, and a document is corrected once.
  `CREATE UNIQUE INDEX IF NOT EXISTS "${LEDGER_ENTRY_TABLE}_one_reversal"
     ON "${LEDGER_ENTRY_TABLE}" ("reverses_entry_id")
     WHERE "reverses_entry_id" IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${LEDGER_ENTRY_TABLE}_one_correction"
     ON "${LEDGER_ENTRY_TABLE}" ("corrects_entry_id")
     WHERE "corrects_entry_id" IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS "${LEDGER_LINE_TABLE}" (
     "entry_id" TEXT NOT NULL REFERENCES "${LEDGER_ENTRY_TABLE}" ("id"),
     "line_number" INTEGER NOT NULL,
     "account_code" TEXT NOT NULL,
     "account_name" TEXT,
     "debit_minor" INTEGER,
     "credit_minor" INTEGER,
     "memo" TEXT,
     PRIMARY KEY ("entry_id", "line_number")
   )`,
  `CREATE INDEX IF NOT EXISTS "${LEDGER_LINE_TABLE}_account"
     ON "${LEDGER_LINE_TABLE}" ("account_code", "entry_id")`,
  `CREATE TABLE IF NOT EXISTS "${LEDGER_PERIOD_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "name" TEXT NOT NULL,
     "start_date" TEXT NOT NULL,
     "end_date" TEXT NOT NULL,
     "status" TEXT NOT NULL,
     "closed_at" TEXT,
     "closed_by" TEXT,
     "close_reason" TEXT,
     "reopened_at" TEXT,
     "reopened_by" TEXT,
     "reopen_reason" TEXT,
     "created_at" TEXT NOT NULL,
     "updated_at" TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${LEDGER_PERIOD_TABLE}_scope"
     ON "${LEDGER_PERIOD_TABLE}" ("institution_id", "start_date", "end_date")`,
  `CREATE INDEX IF NOT EXISTS "${LEDGER_PERIOD_TABLE}_institution"
     ON "${LEDGER_PERIOD_TABLE}" ("institution_id", "status")`,
  // Immutability. A posted entry is corrected by a reversal, never by an edit or a delete, and the
  // database refuses either one whoever asks.
  `CREATE TRIGGER IF NOT EXISTS "${LEDGER_ENTRY_TABLE}_immutable_update"
     BEFORE UPDATE ON "${LEDGER_ENTRY_TABLE}"
     BEGIN SELECT RAISE(ABORT, 'a posted journal entry is immutable; post a reversal instead'); END`,
  `CREATE TRIGGER IF NOT EXISTS "${LEDGER_ENTRY_TABLE}_immutable_delete"
     BEFORE DELETE ON "${LEDGER_ENTRY_TABLE}"
     BEGIN SELECT RAISE(ABORT, 'a posted journal entry is immutable; post a reversal instead'); END`,
  `CREATE TRIGGER IF NOT EXISTS "${LEDGER_LINE_TABLE}_immutable_update"
     BEFORE UPDATE ON "${LEDGER_LINE_TABLE}"
     BEGIN SELECT RAISE(ABORT, 'a posted journal line is immutable; post a reversal instead'); END`,
  `CREATE TRIGGER IF NOT EXISTS "${LEDGER_LINE_TABLE}_immutable_delete"
     BEFORE DELETE ON "${LEDGER_LINE_TABLE}"
     BEGIN SELECT RAISE(ABORT, 'a posted journal line is immutable; post a reversal instead'); END`,
];

/** One audit record the ledger writes, in the repository's own audit table. */
export interface LedgerAuditRecord {
  readonly subjectId: string;
  /** Which of the ledger's entities the row belongs to. */
  readonly entity: string;
  readonly action: 'create' | 'update';
  readonly actorId: string | null;
  readonly reason: string | null;
  readonly detail: unknown;
  readonly changedFields: readonly string[];
  readonly createdAt: string;
}

/**
 * The persistence a ledger needs.
 *
 * The contract is deliberately small: it stores entries and periods and reads them back. It has no
 * method that edits or deletes an entry, and the database refuses one anyway.
 *
 * `transaction` hands the callback a store bound to that transaction. Every statement a posting
 * makes must go through the bound store: the adapter refuses a public call while a transaction is
 * open, which is what keeps an entry and its lines and its audit row in one unit.
 */
export interface LedgerStore {
  transaction<T>(work: (tx: LedgerStore) => Promise<T>): Promise<T>;
  /** Writes an entry and its lines. A duplicate original posting is refused by the database. */
  insertEntry(entry: JournalEntry): Promise<void>;
  entry(id: string): Promise<JournalEntry | null>;
  listEntries(query: EntryQuery): Promise<readonly JournalEntry[]>;
  /** The original posting of a document, or null. */
  originalFor(
    institutionId: string,
    kind: SourceDocumentKind,
    sourceId: string
  ): Promise<JournalEntry | null>;
  /** The entry that reverses `entryId`, or null. */
  reversalOf(entryId: string): Promise<JournalEntry | null>;
  /** The entry that corrects `entryId`, or null. */
  correctionOf(entryId: string): Promise<JournalEntry | null>;
  insertPeriod(period: LedgerPeriod): Promise<void>;
  /** Moves a period between open and closed. The only update the ledger makes. */
  updatePeriod(period: LedgerPeriod): Promise<void>;
  period(id: string): Promise<LedgerPeriod | null>;
  /** The period of an institution whose range covers a day, or null. */
  periodCovering(institutionId: string, date: string): Promise<LedgerPeriod | null>;
  listPeriods(institutionId: string): Promise<readonly LedgerPeriod[]>;
  /** Appends a row to the repository's audit trail, inside the write's transaction. */
  writeAudit(record: LedgerAuditRecord): Promise<string>;
  /** The audit trail of one entry or period, oldest first. */
  auditTrail(subjectId: string): Promise<readonly LedgerAuditEvent[]>;
  /** The ledger's recent audit trail, newest first. */
  auditLog(query?: { limit?: number; offset?: number }): Promise<readonly LedgerAuditEvent[]>;
}

interface EntryRow {
  readonly id: string;
  readonly institution_id: string;
  readonly entry_date: string;
  readonly source_kind: string;
  readonly source_id: string;
  readonly source_number: string | null;
  readonly narration: string;
  readonly currency: string;
  readonly total_debit_minor: number;
  readonly total_credit_minor: number;
  readonly period_id: string | null;
  readonly reverses_entry_id: string | null;
  readonly corrects_entry_id: string | null;
  readonly reversal_reason: string | null;
  readonly posted_at: string;
  readonly posted_by: string | null;
}

interface LineRow {
  readonly entry_id: string;
  readonly line_number: number;
  readonly account_code: string;
  readonly account_name: string | null;
  readonly debit_minor: number | null;
  readonly credit_minor: number | null;
  readonly memo: string | null;
}

interface PeriodRow {
  readonly id: string;
  readonly institution_id: string;
  readonly name: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly status: string;
  readonly closed_at: string | null;
  readonly closed_by: string | null;
  readonly close_reason: string | null;
  readonly reopened_at: string | null;
  readonly reopened_by: string | null;
  readonly reopen_reason: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

const ENTRY_COLUMNS = [
  'id',
  'institution_id',
  'entry_date',
  'source_kind',
  'source_id',
  'source_number',
  'narration',
  'currency',
  'total_debit_minor',
  'total_credit_minor',
  'period_id',
  'reverses_entry_id',
  'corrects_entry_id',
  'reversal_reason',
  'posted_at',
  'posted_by',
] as const;

const LINE_COLUMNS = [
  'entry_id',
  'line_number',
  'account_code',
  'account_name',
  'debit_minor',
  'credit_minor',
  'memo',
] as const;

const PERIOD_COLUMNS = [
  'id',
  'institution_id',
  'name',
  'start_date',
  'end_date',
  'status',
  'closed_at',
  'closed_by',
  'close_reason',
  'reopened_at',
  'reopened_by',
  'reopen_reason',
  'created_at',
  'updated_at',
] as const;

const select = (alias: string, columns: readonly string[]): string =>
  columns.map((column) => `${alias}."${column}" AS "${column}"`).join(', ');

const INSERT_ENTRY_SQL = `INSERT INTO "${LEDGER_ENTRY_TABLE}"
   (${ENTRY_COLUMNS.map((column) => `"${column}"`).join(', ')})
   VALUES (${ENTRY_COLUMNS.map(() => '?').join(', ')})`;

const INSERT_LINE_SQL = `INSERT INTO "${LEDGER_LINE_TABLE}"
   (${LINE_COLUMNS.map((column) => `"${column}"`).join(', ')})
   VALUES (${LINE_COLUMNS.map(() => '?').join(', ')})`;

const INSERT_PERIOD_SQL = `INSERT INTO "${LEDGER_PERIOD_TABLE}"
   (${PERIOD_COLUMNS.map((column) => `"${column}"`).join(', ')})
   VALUES (${PERIOD_COLUMNS.map(() => '?').join(', ')})`;

const UPDATE_PERIOD_SQL = `UPDATE "${LEDGER_PERIOD_TABLE}"
   SET "status" = ?, "closed_at" = ?, "closed_by" = ?, "close_reason" = ?,
       "reopened_at" = ?, "reopened_by" = ?, "reopen_reason" = ?, "updated_at" = ?
   WHERE "id" = ?`;

const AUDIT_COLUMNS =
  '"id" AS "id", "entity_id" AS "subject_id", "action" AS "action", "actor_id" AS "actor_id", ' +
  '"reason" AS "reason", "after" AS "detail", "created_at" AS "created_at", ' +
  '"commit_sequence" AS "commit_sequence"';

interface AuditRow {
  readonly id: string;
  readonly subject_id: string;
  readonly action: string;
  readonly actor_id: string | null;
  readonly reason: string | null;
  readonly detail: string | null;
  readonly created_at: string;
  readonly commit_sequence: number;
}

/** Applies the ledger's DDL and the audit table it records into; safe to call repeatedly. */
export async function ensureLedgerSchema(adapter: SqliteAdapter): Promise<void> {
  await applyAuditSchema(adapter);
  await adapter.transaction(async (tx) => {
    for (const statement of LEDGER_DDL) {
      await tx.exec(statement);
    }
  });
}

/** Builds the SQLite store over an open adapter. */
export function createSqliteLedgerStore(adapter: SqliteAdapter): LedgerStore {
  return new SqliteLedgerStore(adapter, adapter);
}

/**
 * The SQLite store.
 *
 * `runner` is the adapter outside a transaction and the transaction handle inside one, so a
 * statement never has to know which it is running on. A transaction binds a *new* store rather
 * than mutating this one, so two overlapping callers can never borrow each other's transaction.
 */
class SqliteLedgerStore implements LedgerStore {
  constructor(
    private readonly runner: SqliteTransaction,
    private readonly adapter: SqliteAdapter | null
  ) {}

  async transaction<T>(work: (tx: LedgerStore) => Promise<T>): Promise<T> {
    if (!this.adapter) {
      throw new LedgerError(
        'nested_transaction',
        'this store is already bound to a transaction; the ledger cannot open a second one'
      );
    }
    try {
      return await this.adapter.transaction((tx) => work(new SqliteLedgerStore(tx, null)));
    } catch (error) {
      throw this.translate(error);
    }
  }

  async insertEntry(entry: JournalEntry): Promise<void> {
    try {
      await this.runner.run(INSERT_ENTRY_SQL, entryValues(entry));
      for (const line of entry.lines) {
        await this.runner.run(INSERT_LINE_SQL, lineValues(entry.id, line));
      }
    } catch (error) {
      throw this.translate(error);
    }
  }

  async entry(id: string): Promise<JournalEntry | null> {
    try {
      const row = await this.runner.get<EntryRow>(
        `SELECT ${select('e', ENTRY_COLUMNS)} FROM "${LEDGER_ENTRY_TABLE}" e WHERE e."id" = ?`,
        [id]
      );
      if (!row) return null;
      const lines = await this.runner.all<LineRow>(
        `SELECT ${select('l', LINE_COLUMNS)} FROM "${LEDGER_LINE_TABLE}" l
           WHERE l."entry_id" = ? ORDER BY l."line_number"`,
        [id]
      );
      return toEntry(row, lines);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async listEntries(query: EntryQuery): Promise<readonly JournalEntry[]> {
    const { where, params } = entryFilter(query);
    const limit = Math.max(1, Math.min(query.limit ?? DEFAULT_ENTRY_LIMIT, MAX_ENTRY_LIMIT));
    try {
      const entries = await this.runner.all<EntryRow>(
        `SELECT ${select('e', ENTRY_COLUMNS)} FROM "${LEDGER_ENTRY_TABLE}" e
           ${where} ORDER BY e."entry_date", e."id" LIMIT ?`,
        [...params, limit]
      );
      if (entries.length === 0) return [];
      const lines = await this.runner.all<LineRow>(
        `SELECT ${select('l', LINE_COLUMNS)} FROM "${LEDGER_LINE_TABLE}" l
           JOIN "${LEDGER_ENTRY_TABLE}" e ON e."id" = l."entry_id"
           ${where} ORDER BY e."entry_date", e."id", l."line_number"`,
        params
      );
      return groupEntries(entries, lines);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async originalFor(
    institutionId: string,
    kind: SourceDocumentKind,
    sourceId: string
  ): Promise<JournalEntry | null> {
    return this.oneWhere(
      `"institution_id" = ? AND "source_kind" = ? AND "source_id" = ?
         AND "reverses_entry_id" IS NULL AND "corrects_entry_id" IS NULL`,
      [institutionId, kind, sourceId]
    );
  }

  async reversalOf(entryId: string): Promise<JournalEntry | null> {
    return this.oneWhere('"reverses_entry_id" = ?', [entryId]);
  }

  async correctionOf(entryId: string): Promise<JournalEntry | null> {
    return this.oneWhere('"corrects_entry_id" = ?', [entryId]);
  }

  async insertPeriod(period: LedgerPeriod): Promise<void> {
    try {
      await this.runner.run(INSERT_PERIOD_SQL, periodValues(period));
    } catch (error) {
      throw this.translate(error);
    }
  }

  async updatePeriod(period: LedgerPeriod): Promise<void> {
    try {
      await this.runner.run(UPDATE_PERIOD_SQL, [
        period.status,
        period.closedAt,
        period.closedBy,
        period.closeReason,
        period.reopenedAt,
        period.reopenedBy,
        period.reopenReason,
        period.updatedAt,
        period.id,
      ]);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async period(id: string): Promise<LedgerPeriod | null> {
    try {
      const row = await this.runner.get<PeriodRow>(
        `SELECT ${select('p', PERIOD_COLUMNS)} FROM "${LEDGER_PERIOD_TABLE}" p WHERE p."id" = ?`,
        [id]
      );
      return row ? toPeriod(row) : null;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async periodCovering(institutionId: string, date: string): Promise<LedgerPeriod | null> {
    try {
      const row = await this.runner.get<PeriodRow>(
        `SELECT ${select('p', PERIOD_COLUMNS)} FROM "${LEDGER_PERIOD_TABLE}" p
           WHERE p."institution_id" = ? AND p."start_date" <= ? AND p."end_date" >= ?
           ORDER BY p."start_date" LIMIT 1`,
        [institutionId, date, date]
      );
      return row ? toPeriod(row) : null;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async listPeriods(institutionId: string): Promise<readonly LedgerPeriod[]> {
    try {
      const rows = await this.runner.all<PeriodRow>(
        `SELECT ${select('p', PERIOD_COLUMNS)} FROM "${LEDGER_PERIOD_TABLE}" p
           WHERE p."institution_id" = ? ORDER BY p."start_date"`,
        [institutionId]
      );
      return rows.map(toPeriod);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async writeAudit(record: LedgerAuditRecord): Promise<string> {
    try {
      const row = await this.runner.get<{ value: number }>(
        `SELECT COALESCE(MAX("commit_sequence"), 0) + 1 AS "value" FROM "${AUDIT_TABLE}"`
      );
      const commitSequence = row && Number.isSafeInteger(row.value) ? row.value : 1;
      return await writeAuditEvent(this.runner, {
        entity: record.entity,
        entityId: record.subjectId,
        action: record.action,
        actorId: record.actorId,
        changedFields: record.changedFields,
        before: null,
        after: record.detail,
        reason: record.reason,
        createdAt: record.createdAt,
        commitSequence,
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  async auditTrail(subjectId: string): Promise<readonly LedgerAuditEvent[]> {
    try {
      const rows = await this.runner.all<AuditRow>(
        `SELECT ${AUDIT_COLUMNS} FROM "${AUDIT_TABLE}"
           WHERE "entity_id" = ? ORDER BY "commit_sequence"`,
        [subjectId]
      );
      return rows.map(toAuditEvent);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async auditLog(query: { limit?: number; offset?: number } = {}): Promise<readonly LedgerAuditEvent[]> {
    const limit = Math.max(1, Math.min(query.limit ?? 100, 1000));
    const offset = Math.max(0, query.offset ?? 0);
    try {
      const rows = await this.runner.all<AuditRow>(
        `SELECT ${AUDIT_COLUMNS} FROM "${AUDIT_TABLE}"
           ORDER BY "commit_sequence" DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      return rows.map(toAuditEvent);
    } catch (error) {
      throw this.translate(error);
    }
  }

  private async oneWhere(
    condition: string,
    params: readonly SqliteBindValue[]
  ): Promise<JournalEntry | null> {
    try {
      const row = await this.runner.get<EntryRow>(
        `SELECT ${select('e', ENTRY_COLUMNS)} FROM "${LEDGER_ENTRY_TABLE}" e
           WHERE ${condition} LIMIT 1`,
        params
      );
      if (!row) return null;
      const lines = await this.runner.all<LineRow>(
        `SELECT ${select('l', LINE_COLUMNS)} FROM "${LEDGER_LINE_TABLE}" l
           WHERE l."entry_id" = ? ORDER BY l."line_number"`,
        [row.id]
      );
      return toEntry(row, lines);
    } catch (error) {
      throw this.translate(error);
    }
  }

  /**
   * Turns a database failure into the module's own error.
   *
   * A trigger that refused an edit or a delete is the immutability working; a partial unique index
   * that refused a row is the double-posting guard working. Both are reported as the refusals they
   * are rather than as a storage failure.
   */
  private translate(error: unknown): Error {
    if (error instanceof LedgerError) return error;
    if (error instanceof SqliteAdapterError) {
      const message = error.message;
      if (error.code === 'nested_transaction') {
        return new LedgerError('nested_transaction', message, { cause: error });
      }
      if (/immutable/i.test(message)) {
        return new LedgerError('immutable', message, { cause: error });
      }
      if (/"reverses_entry_id"/.test(message) || /journal_entry\.reverses_entry_id/.test(message)) {
        return new LedgerError(
          'already_reversed',
          'the entry has already been reversed; post a correction in the current period instead',
          { cause: error }
        );
      }
      if (/"corrects_entry_id"/.test(message) || /journal_entry\.corrects_entry_id/.test(message)) {
        return new LedgerError(
          'conflict',
          'the document has already been corrected; a second correction is a new adjustment',
          { cause: error }
        );
      }
      if (error.constraint === 'unique' || /UNIQUE constraint failed/.test(message)) {
        return new LedgerError(
          'conflict',
          `the source document already has a journal entry (${message})`,
          { cause: error }
        );
      }
      return new LedgerError('storage', message, { cause: error });
    }
    return error instanceof Error ? error : new LedgerError('storage', String(error));
  }
}

function entryFilter(query: EntryQuery): { where: string; params: SqliteBindValue[] } {
  const clauses: string[] = [];
  const params: SqliteBindValue[] = [];
  if (query.institutionId !== undefined) {
    clauses.push('e."institution_id" = ?');
    params.push(query.institutionId);
  }
  if (query.asOf !== undefined) {
    clauses.push('e."entry_date" <= ?');
    params.push(query.asOf);
  }
  if (query.periodId !== undefined) {
    clauses.push('e."period_id" = ?');
    params.push(query.periodId);
  }
  if (query.sourceKind !== undefined) {
    clauses.push('e."source_kind" = ?');
    params.push(query.sourceKind);
  }
  if (query.sourceId !== undefined) {
    clauses.push('e."source_id" = ?');
    params.push(query.sourceId);
  }
  return { where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function entryValues(entry: JournalEntry): SqliteBindValue[] {
  return [
    entry.id,
    entry.institutionId,
    entry.entryDate,
    entry.source.kind,
    entry.source.id,
    entry.source.number ?? null,
    entry.narration,
    entry.currency,
    entry.totalDebit.amount_minor,
    entry.totalCredit.amount_minor,
    entry.periodId,
    entry.reversesEntryId,
    entry.correctsEntryId,
    entry.reversalReason,
    entry.postedAt,
    entry.postedBy,
  ];
}

function lineValues(entryId: string, line: JournalLine): SqliteBindValue[] {
  return [
    entryId,
    line.lineNumber,
    line.accountCode,
    line.accountName,
    line.debit === null ? null : line.debit.amount_minor,
    line.credit === null ? null : line.credit.amount_minor,
    line.memo,
  ];
}

function periodValues(period: LedgerPeriod): SqliteBindValue[] {
  return [
    period.id,
    period.institutionId,
    period.name,
    period.startDate,
    period.endDate,
    period.status,
    period.closedAt,
    period.closedBy,
    period.closeReason,
    period.reopenedAt,
    period.reopenedBy,
    period.reopenReason,
    period.createdAt,
    period.updatedAt,
  ];
}

function groupEntries(
  entries: readonly EntryRow[],
  lines: readonly LineRow[]
): readonly JournalEntry[] {
  const byEntry = new Map<string, LineRow[]>();
  for (const line of lines) {
    const bucket = byEntry.get(line.entry_id);
    if (bucket) bucket.push(line);
    else byEntry.set(line.entry_id, [line]);
  }
  return entries.map((row) => toEntry(row, byEntry.get(row.id) ?? []));
}

function toEntry(row: EntryRow, lines: readonly LineRow[]): JournalEntry {
  const currency = toCurrency(row.currency, row.id);
  const source: SourceDocument = {
    kind: toSourceKind(row.source_kind),
    id: row.source_id,
    ...(row.source_number === null ? {} : { number: row.source_number }),
  };
  return {
    id: row.id,
    institutionId: row.institution_id,
    entryDate: row.entry_date,
    source,
    narration: row.narration,
    currency,
    lines: lines.map((line) => toLine(line, currency)),
    totalDebit: fromMinor(row.total_debit_minor, currency),
    totalCredit: fromMinor(row.total_credit_minor, currency),
    postedAt: row.posted_at,
    postedBy: row.posted_by,
    periodId: row.period_id,
    reversesEntryId: row.reverses_entry_id,
    correctsEntryId: row.corrects_entry_id,
    reversalReason: row.reversal_reason,
  };
}

function toLine(row: LineRow, currency: CurrencyCode): JournalLine {
  return {
    lineNumber: row.line_number,
    accountCode: row.account_code,
    accountName: row.account_name,
    debit: row.debit_minor === null ? null : fromMinor(row.debit_minor, currency),
    credit: row.credit_minor === null ? null : fromMinor(row.credit_minor, currency),
    memo: row.memo,
  };
}

function toPeriod(row: PeriodRow): LedgerPeriod {
  return {
    id: row.id,
    institutionId: row.institution_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: toPeriodStatus(row.status),
    closedAt: row.closed_at,
    closedBy: row.closed_by,
    closeReason: row.close_reason,
    reopenedAt: row.reopened_at,
    reopenedBy: row.reopened_by,
    reopenReason: row.reopen_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAuditEvent(row: AuditRow): LedgerAuditEvent {
  return {
    id: row.id,
    subjectId: row.subject_id,
    action: row.action === 'update' ? 'update' : 'create',
    actorId: row.actor_id,
    reason: row.reason,
    detail: parseJson(row.detail),
    createdAt: row.created_at,
    commitSequence: row.commit_sequence,
  };
}

function toCurrency(value: string, entryId: string): CurrencyCode {
  if (!isCurrencyCode(value)) {
    throw new LedgerError(
      'storage',
      `journal entry ${entryId} is counted in "${value}", which is not a currency the money module knows`
    );
  }
  return value;
}

function toSourceKind(value: string): SourceDocumentKind {
  const kind = SOURCE_KINDS.find((candidate) => candidate === value);
  if (!kind) {
    throw new LedgerError('storage', `a journal entry names the unknown source kind "${value}"`);
  }
  return kind;
}

function toPeriodStatus(value: string): LedgerPeriodStatus {
  if (value === 'open' || value === 'closed') return value;
  throw new LedgerError('storage', `a ledger period holds the unknown status "${value}"`);
}

function parseJson(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
