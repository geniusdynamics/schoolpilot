// ABOUTME: The store reconciliation is written to: the DDL of the statements, their lines and the
// ABOUTME: match records (with the triggers that make a match history immutable), the port the
// ABOUTME: service codes against, and the SQLite implementation that reads and writes it.

import {
  SqliteAdapterError,
  type SqliteAdapter,
  type SqliteBindValue,
  type SqliteTransaction,
} from '@/data/adapters/sqlite';
import { AUDIT_TABLE, applyAuditSchema, writeAuditEvent } from '@/data/repository';
import { fromMinor, isCurrencyCode, type CurrencyCode } from '@/domain/money';

import { ReconciliationError } from './errors';
import type {
  CandidateKind,
  LineQuery,
  MatchQuery,
  MatchRecord,
  MatchStatus,
  ReconciliationAuditEvent,
  Statement,
  StatementDirection,
  StatementFormat,
  StatementLine,
  StatementQuery,
} from './types';

/** The table holding one row per imported statement. */
export const RECONCILIATION_STATEMENT_TABLE = 'reconciliation_statement';
/** The table holding the normalised lines of every statement. */
export const RECONCILIATION_LINE_TABLE = 'reconciliation_line';
/** The table holding the record of every match and its undoing. */
export const RECONCILIATION_MATCH_TABLE = 'reconciliation_match';
/** The entity name an import is recorded under in the repository's audit trail. */
export const RECONCILIATION_STATEMENT_AUDIT_ENTITY = 'reconciliation_statement';
/** The entity name a match change is recorded under in the repository's audit trail. */
export const RECONCILIATION_MATCH_AUDIT_ENTITY = 'reconciliation_match';

/** How many rows a read returns when the caller names no limit. */
export const DEFAULT_RECONCILIATION_LIMIT = 10_000;
/** The most rows a single read returns. */
export const MAX_RECONCILIATION_LIMIT = 100_000;

const FORMATS: readonly StatementFormat[] = ['csv', 'ofx'];
const DIRECTIONS: readonly StatementDirection[] = ['inflow', 'outflow'];
const CANDIDATE_KINDS: readonly CandidateKind[] = ['payment', 'ledger_entry'];
const MATCH_STATUSES: readonly MatchStatus[] = ['confirmed', 'unmatched'];

/**
 * The DDL of reconciliation.
 *
 * A canonical migration must apply these statements; `ensureReconciliationSchema` does it, and the
 * tests call it. Two partial unique indexes on the match table are the invariants of matching
 * expressed in the database: a statement line carries one confirmed match, and a payment carries
 * one confirmed match. The unique index on the statement's fingerprint is the idempotency of the
 * import: the same file cannot be imported twice into the same account. The two triggers make a
 * match record history: it is never deleted, and the two sides it links are never re-pointed.
 */
export const RECONCILIATION_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "${RECONCILIATION_STATEMENT_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "account_id" TEXT NOT NULL,
     "format" TEXT NOT NULL,
     "currency" TEXT NOT NULL,
     "fingerprint" TEXT NOT NULL,
     "source_name" TEXT,
     "first_date" TEXT,
     "last_date" TEXT,
     "line_count" INTEGER NOT NULL,
     "imported_at" TEXT NOT NULL,
     "imported_by" TEXT
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${RECONCILIATION_STATEMENT_TABLE}_fingerprint"
     ON "${RECONCILIATION_STATEMENT_TABLE}" ("institution_id", "account_id", "fingerprint")`,
  `CREATE INDEX IF NOT EXISTS "${RECONCILIATION_STATEMENT_TABLE}_account"
     ON "${RECONCILIATION_STATEMENT_TABLE}" ("institution_id", "account_id", "imported_at")`,
  `CREATE TABLE IF NOT EXISTS "${RECONCILIATION_LINE_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "statement_id" TEXT NOT NULL REFERENCES "${RECONCILIATION_STATEMENT_TABLE}" ("id"),
     "institution_id" TEXT NOT NULL,
     "account_id" TEXT NOT NULL,
     "file_line" INTEGER NOT NULL,
     "value_date" TEXT NOT NULL,
     "amount_minor" INTEGER NOT NULL,
     "currency" TEXT NOT NULL,
     "direction" TEXT NOT NULL,
     "reference" TEXT,
     "description" TEXT,
     "payer_name" TEXT,
     "raw" TEXT NOT NULL,
     "dedupe_key" TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${RECONCILIATION_LINE_TABLE}_position"
     ON "${RECONCILIATION_LINE_TABLE}" ("statement_id", "file_line")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${RECONCILIATION_LINE_TABLE}_dedupe"
     ON "${RECONCILIATION_LINE_TABLE}" ("dedupe_key")`,
  `CREATE INDEX IF NOT EXISTS "${RECONCILIATION_LINE_TABLE}_account_date"
     ON "${RECONCILIATION_LINE_TABLE}" ("institution_id", "account_id", "value_date")`,
  `CREATE TABLE IF NOT EXISTS "${RECONCILIATION_MATCH_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "statement_line_id" TEXT NOT NULL REFERENCES "${RECONCILIATION_LINE_TABLE}" ("id"),
     "candidate_id" TEXT NOT NULL,
     "candidate_kind" TEXT NOT NULL,
     "status" TEXT NOT NULL,
     "score" INTEGER,
     "reasons" TEXT NOT NULL,
     "matched_by" TEXT,
     "matched_at" TEXT NOT NULL,
     "unmatched_by" TEXT,
     "unmatched_at" TEXT,
     "unmatched_reason" TEXT
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${RECONCILIATION_MATCH_TABLE}_one_per_line"
     ON "${RECONCILIATION_MATCH_TABLE}" ("statement_line_id") WHERE "status" = 'confirmed'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${RECONCILIATION_MATCH_TABLE}_one_per_candidate"
     ON "${RECONCILIATION_MATCH_TABLE}" ("candidate_kind", "candidate_id") WHERE "status" = 'confirmed'`,
  `CREATE INDEX IF NOT EXISTS "${RECONCILIATION_MATCH_TABLE}_candidate"
     ON "${RECONCILIATION_MATCH_TABLE}" ("candidate_kind", "candidate_id", "status")`,
  `CREATE INDEX IF NOT EXISTS "${RECONCILIATION_MATCH_TABLE}_institution"
     ON "${RECONCILIATION_MATCH_TABLE}" ("institution_id", "status")`,
  `CREATE TRIGGER IF NOT EXISTS "${RECONCILIATION_MATCH_TABLE}_no_delete"
     BEFORE DELETE ON "${RECONCILIATION_MATCH_TABLE}"
     BEGIN SELECT RAISE(ABORT, 'a match record is history; unmatch it instead of deleting it'); END`,
  `CREATE TRIGGER IF NOT EXISTS "${RECONCILIATION_MATCH_TABLE}_link_immutable"
     BEFORE UPDATE OF "statement_line_id", "candidate_id", "candidate_kind" ON "${RECONCILIATION_MATCH_TABLE}"
     BEGIN SELECT RAISE(ABORT, 'the two sides a match links are immutable; unmatch and match again'); END`,
];

/** One audit record reconciliation writes, in the repository's own audit table. */
export interface ReconciliationAuditRecord {
  readonly subjectId: string;
  readonly entity: string;
  readonly action: 'create' | 'update';
  readonly actorId: string | null;
  readonly reason: string | null;
  readonly detail: unknown;
  readonly changedFields: readonly string[];
  readonly createdAt: string;
}

/**
 * The persistence reconciliation needs.
 *
 * The contract has no method that deletes a match and none that re-points one: unmatching is an
 * update that records who undid the link and why, and the database refuses a delete anyway.
 */
export interface ReconciliationStore {
  transaction<T>(work: (tx: ReconciliationStore) => Promise<T>): Promise<T>;
  insertStatement(statement: Statement): Promise<void>;
  statement(id: string): Promise<Statement | null>;
  statementByFingerprint(
    institutionId: string,
    accountId: string,
    fingerprint: string
  ): Promise<Statement | null>;
  listStatements(query: StatementQuery): Promise<readonly Statement[]>;
  insertLines(lines: readonly StatementLine[]): Promise<void>;
  line(id: string): Promise<StatementLine | null>;
  listLines(query: LineQuery): Promise<readonly StatementLine[]>;
  insertMatch(record: MatchRecord): Promise<void>;
  match(id: string): Promise<MatchRecord | null>;
  /** Records an unmatch. The only update reconciliation makes to a match. */
  updateMatch(record: MatchRecord): Promise<void>;
  confirmedMatchForLine(statementLineId: string): Promise<MatchRecord | null>;
  confirmedMatchForCandidate(kind: CandidateKind, candidateId: string): Promise<MatchRecord | null>;
  listMatches(query: MatchQuery): Promise<readonly MatchRecord[]>;
  /** Appends a row to the repository's audit trail, inside the write's transaction. */
  writeAudit(record: ReconciliationAuditRecord): Promise<string>;
  /** The audit trail of one match, oldest first. */
  auditTrail(subjectId: string): Promise<readonly ReconciliationAuditEvent[]>;
}

interface StatementRow {
  readonly id: string;
  readonly institution_id: string;
  readonly account_id: string;
  readonly format: string;
  readonly currency: string;
  readonly fingerprint: string;
  readonly source_name: string | null;
  readonly first_date: string | null;
  readonly last_date: string | null;
  readonly line_count: number;
  readonly imported_at: string;
  readonly imported_by: string | null;
}

interface LineRow {
  readonly id: string;
  readonly statement_id: string;
  readonly institution_id: string;
  readonly account_id: string;
  readonly file_line: number;
  readonly value_date: string;
  readonly amount_minor: number;
  readonly currency: string;
  readonly direction: string;
  readonly reference: string | null;
  readonly description: string | null;
  readonly payer_name: string | null;
  readonly raw: string;
  readonly dedupe_key: string;
}

interface MatchRow {
  readonly id: string;
  readonly institution_id: string;
  readonly statement_line_id: string;
  readonly candidate_id: string;
  readonly candidate_kind: string;
  readonly status: string;
  readonly score: number | null;
  readonly reasons: string;
  readonly matched_by: string | null;
  readonly matched_at: string;
  readonly unmatched_by: string | null;
  readonly unmatched_at: string | null;
  readonly unmatched_reason: string | null;
}

const STATEMENT_COLUMNS = [
  'id',
  'institution_id',
  'account_id',
  'format',
  'currency',
  'fingerprint',
  'source_name',
  'first_date',
  'last_date',
  'line_count',
  'imported_at',
  'imported_by',
] as const;

const LINE_COLUMNS = [
  'id',
  'statement_id',
  'institution_id',
  'account_id',
  'file_line',
  'value_date',
  'amount_minor',
  'currency',
  'direction',
  'reference',
  'description',
  'payer_name',
  'raw',
  'dedupe_key',
] as const;

const MATCH_COLUMNS = [
  'id',
  'institution_id',
  'statement_line_id',
  'candidate_id',
  'candidate_kind',
  'status',
  'score',
  'reasons',
  'matched_by',
  'matched_at',
  'unmatched_by',
  'unmatched_at',
  'unmatched_reason',
] as const;

const select = (alias: string, columns: readonly string[]): string =>
  columns.map((column) => `${alias}."${column}" AS "${column}"`).join(', ');

const insertSql = (table: string, columns: readonly string[]): string =>
  `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${columns
    .map(() => '?')
    .join(', ')})`;

const INSERT_STATEMENT_SQL = insertSql(RECONCILIATION_STATEMENT_TABLE, STATEMENT_COLUMNS);
const INSERT_LINE_SQL = insertSql(RECONCILIATION_LINE_TABLE, LINE_COLUMNS);
const INSERT_MATCH_SQL = insertSql(RECONCILIATION_MATCH_TABLE, MATCH_COLUMNS);

const UPDATE_MATCH_SQL = `UPDATE "${RECONCILIATION_MATCH_TABLE}"
   SET "status" = ?, "unmatched_by" = ?, "unmatched_at" = ?, "unmatched_reason" = ?
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

/** Applies reconciliation's DDL and the audit table it records into; safe to call repeatedly. */
export async function ensureReconciliationSchema(adapter: SqliteAdapter): Promise<void> {
  await applyAuditSchema(adapter);
  await adapter.transaction(async (tx) => {
    for (const statement of RECONCILIATION_DDL) {
      await tx.exec(statement);
    }
  });
}

/** Builds the SQLite store over an open adapter. */
export function createSqliteReconciliationStore(adapter: SqliteAdapter): ReconciliationStore {
  return new SqliteReconciliationStore(adapter, adapter);
}

/**
 * The SQLite store.
 *
 * `runner` is the adapter outside a transaction and the transaction handle inside one, so a
 * statement never has to know which it is running on, and a transaction binds a new store rather
 * than mutating this one.
 */
class SqliteReconciliationStore implements ReconciliationStore {
  constructor(
    private readonly runner: SqliteTransaction,
    private readonly adapter: SqliteAdapter | null
  ) {}

  async transaction<T>(work: (tx: ReconciliationStore) => Promise<T>): Promise<T> {
    if (!this.adapter) {
      throw new ReconciliationError(
        'nested_transaction',
        'this store is already bound to a transaction; reconciliation cannot open a second one'
      );
    }
    try {
      return await this.adapter.transaction((tx) =>
        work(new SqliteReconciliationStore(tx, null))
      );
    } catch (error) {
      throw this.translate(error);
    }
  }

  async insertStatement(statement: Statement): Promise<void> {
    try {
      await this.runner.run(INSERT_STATEMENT_SQL, statementValues(statement));
    } catch (error) {
      throw this.translate(error);
    }
  }

  async statement(id: string): Promise<Statement | null> {
    return this.oneStatement('s."id" = ?', [id]);
  }

  async statementByFingerprint(
    institutionId: string,
    accountId: string,
    fingerprint: string
  ): Promise<Statement | null> {
    return this.oneStatement(
      's."institution_id" = ? AND s."account_id" = ? AND s."fingerprint" = ?',
      [institutionId, accountId, fingerprint]
    );
  }

  async listStatements(query: StatementQuery): Promise<readonly Statement[]> {
    const clauses: string[] = [];
    const params: SqliteBindValue[] = [];
    if (query.institutionId !== undefined) {
      clauses.push('s."institution_id" = ?');
      params.push(query.institutionId);
    }
    if (query.accountId !== undefined) {
      clauses.push('s."account_id" = ?');
      params.push(query.accountId);
    }
    const limit = clampLimit(query.limit);
    try {
      const rows = await this.runner.all<StatementRow>(
        `SELECT ${select('s', STATEMENT_COLUMNS)} FROM "${RECONCILIATION_STATEMENT_TABLE}" s
           ${whereOf(clauses)} ORDER BY s."imported_at", s."id" LIMIT ?`,
        [...params, limit]
      );
      return rows.map(toStatement);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async insertLines(lines: readonly StatementLine[]): Promise<void> {
    try {
      for (const line of lines) {
        await this.runner.run(INSERT_LINE_SQL, lineValues(line));
      }
    } catch (error) {
      throw this.translate(error);
    }
  }

  async line(id: string): Promise<StatementLine | null> {
    try {
      const row = await this.runner.get<LineRow>(
        `SELECT ${select('l', LINE_COLUMNS)} FROM "${RECONCILIATION_LINE_TABLE}" l WHERE l."id" = ?`,
        [id]
      );
      return row ? toLine(row) : null;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async listLines(query: LineQuery): Promise<readonly StatementLine[]> {
    const clauses: string[] = [];
    const params: SqliteBindValue[] = [];
    if (query.institutionId !== undefined) {
      clauses.push('l."institution_id" = ?');
      params.push(query.institutionId);
    }
    if (query.accountId !== undefined) {
      clauses.push('l."account_id" = ?');
      params.push(query.accountId);
    }
    if (query.statementId !== undefined) {
      clauses.push('l."statement_id" = ?');
      params.push(query.statementId);
    }
    if (query.from !== undefined) {
      clauses.push('l."value_date" >= ?');
      params.push(query.from);
    }
    if (query.to !== undefined) {
      clauses.push('l."value_date" <= ?');
      params.push(query.to);
    }
    if (query.direction !== undefined) {
      clauses.push('l."direction" = ?');
      params.push(query.direction);
    }
    const limit = clampLimit(query.limit);
    try {
      const rows = await this.runner.all<LineRow>(
        `SELECT ${select('l', LINE_COLUMNS)} FROM "${RECONCILIATION_LINE_TABLE}" l
           ${whereOf(clauses)} ORDER BY l."value_date", l."file_line", l."id" LIMIT ?`,
        [...params, limit]
      );
      return rows.map(toLine);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async insertMatch(record: MatchRecord): Promise<void> {
    try {
      await this.runner.run(INSERT_MATCH_SQL, matchValues(record));
    } catch (error) {
      throw this.translate(error);
    }
  }

  async match(id: string): Promise<MatchRecord | null> {
    return this.oneMatch('m."id" = ?', [id]);
  }

  async updateMatch(record: MatchRecord): Promise<void> {
    try {
      await this.runner.run(UPDATE_MATCH_SQL, [
        record.status,
        record.unmatchedBy,
        record.unmatchedAt,
        record.unmatchedReason,
        record.id,
      ]);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async confirmedMatchForLine(statementLineId: string): Promise<MatchRecord | null> {
    return this.oneMatch('m."statement_line_id" = ? AND m."status" = \'confirmed\'', [
      statementLineId,
    ]);
  }

  async confirmedMatchForCandidate(
    kind: CandidateKind,
    candidateId: string
  ): Promise<MatchRecord | null> {
    return this.oneMatch(
      'm."candidate_kind" = ? AND m."candidate_id" = ? AND m."status" = \'confirmed\'',
      [kind, candidateId]
    );
  }

  async listMatches(query: MatchQuery): Promise<readonly MatchRecord[]> {
    const clauses: string[] = [];
    const params: SqliteBindValue[] = [];
    if (query.institutionId !== undefined) {
      clauses.push('m."institution_id" = ?');
      params.push(query.institutionId);
    }
    if (query.statementLineId !== undefined) {
      clauses.push('m."statement_line_id" = ?');
      params.push(query.statementLineId);
    }
    if (query.candidateId !== undefined) {
      clauses.push('m."candidate_id" = ?');
      params.push(query.candidateId);
    }
    if (query.candidateKind !== undefined) {
      clauses.push('m."candidate_kind" = ?');
      params.push(query.candidateKind);
    }
    if (query.status !== undefined) {
      clauses.push('m."status" = ?');
      params.push(query.status);
    }
    const limit = clampLimit(query.limit);
    try {
      const rows = await this.runner.all<MatchRow>(
        `SELECT ${select('m', MATCH_COLUMNS)} FROM "${RECONCILIATION_MATCH_TABLE}" m
           ${whereOf(clauses)} ORDER BY m."matched_at", m."id" LIMIT ?`,
        [...params, limit]
      );
      return rows.map(toMatch);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async writeAudit(record: ReconciliationAuditRecord): Promise<string> {
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

  async auditTrail(subjectId: string): Promise<readonly ReconciliationAuditEvent[]> {
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

  private async oneStatement(
    condition: string,
    params: readonly SqliteBindValue[]
  ): Promise<Statement | null> {
    try {
      const row = await this.runner.get<StatementRow>(
        `SELECT ${select('s', STATEMENT_COLUMNS)} FROM "${RECONCILIATION_STATEMENT_TABLE}" s
           WHERE ${condition} LIMIT 1`,
        params
      );
      return row ? toStatement(row) : null;
    } catch (error) {
      throw this.translate(error);
    }
  }

  private async oneMatch(
    condition: string,
    params: readonly SqliteBindValue[]
  ): Promise<MatchRecord | null> {
    try {
      const row = await this.runner.get<MatchRow>(
        `SELECT ${select('m', MATCH_COLUMNS)} FROM "${RECONCILIATION_MATCH_TABLE}" m
           WHERE ${condition} ORDER BY m."matched_at" LIMIT 1`,
        params
      );
      return row ? toMatch(row) : null;
    } catch (error) {
      throw this.translate(error);
    }
  }

  /** Turns a database failure into the module's own error. */
  private translate(error: unknown): Error {
    if (error instanceof ReconciliationError) return error;
    if (error instanceof SqliteAdapterError) {
      const message = error.message;
      if (error.code === 'nested_transaction') {
        return new ReconciliationError('nested_transaction', message, { cause: error });
      }
      if (/immutable|history/i.test(message)) {
        return new ReconciliationError('match_immutable', message, { cause: error });
      }
      if (/dedupe_key|file_line/.test(message)) {
        return new ReconciliationError(
          'duplicate_statement',
          `a statement line cannot be imported twice: ${message}`,
          { cause: error }
        );
      }
      if (/reconciliation_statement\.fingerprint|"fingerprint"/.test(message)) {
        return new ReconciliationError(
          'duplicate_statement',
          'the same statement file has already been imported into this account',
          { cause: error }
        );
      }
      if (/reconciliation_match\.candidate/.test(message)) {
        return new ReconciliationError(
          'candidate_already_matched',
          `the payment is already matched to a statement line: ${message}`,
          { cause: error }
        );
      }
      if (/reconciliation_match/.test(message)) {
        return new ReconciliationError(
          'line_already_matched',
          `the statement line is already matched: ${message}`,
          { cause: error }
        );
      }
      return new ReconciliationError('storage', message, { cause: error });
    }
    return error instanceof Error ? error : new ReconciliationError('storage', String(error));
  }
}

function whereOf(clauses: readonly string[]): string {
  return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
}

function clampLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(limit ?? DEFAULT_RECONCILIATION_LIMIT, MAX_RECONCILIATION_LIMIT));
}

function statementValues(statement: Statement): SqliteBindValue[] {
  return [
    statement.id,
    statement.institutionId,
    statement.accountId,
    statement.format,
    statement.currency,
    statement.fingerprint,
    statement.sourceName,
    statement.firstDate,
    statement.lastDate,
    statement.lineCount,
    statement.importedAt,
    statement.importedBy,
  ];
}

function lineValues(line: StatementLine): SqliteBindValue[] {
  return [
    line.id,
    line.statementId,
    line.institutionId,
    line.accountId,
    line.fileLine,
    line.valueDate,
    line.amount.amount_minor,
    line.amount.currency,
    line.direction,
    line.reference,
    line.description,
    line.payerName,
    line.raw,
    line.dedupeKey,
  ];
}

function matchValues(record: MatchRecord): SqliteBindValue[] {
  return [
    record.id,
    record.institutionId,
    record.statementLineId,
    record.candidateId,
    record.candidateKind,
    record.status,
    record.score,
    JSON.stringify(record.reasons),
    record.matchedBy,
    record.matchedAt,
    record.unmatchedBy,
    record.unmatchedAt,
    record.unmatchedReason,
  ];
}

function toStatement(row: StatementRow): Statement {
  return {
    id: row.id,
    institutionId: row.institution_id,
    accountId: row.account_id,
    format: toFormat(row.format, row.id),
    currency: toCurrency(row.currency, row.id),
    fingerprint: row.fingerprint,
    sourceName: row.source_name,
    firstDate: row.first_date,
    lastDate: row.last_date,
    lineCount: row.line_count,
    importedAt: row.imported_at,
    importedBy: row.imported_by,
  };
}

function toLine(row: LineRow): StatementLine {
  return {
    id: row.id,
    statementId: row.statement_id,
    institutionId: row.institution_id,
    accountId: row.account_id,
    fileLine: row.file_line,
    valueDate: row.value_date,
    amount: fromMinor(row.amount_minor, toCurrency(row.currency, row.id)),
    direction: toDirection(row.direction, row.id),
    reference: row.reference,
    description: row.description,
    payerName: row.payer_name,
    raw: row.raw,
    dedupeKey: row.dedupe_key,
  };
}

function toMatch(row: MatchRow): MatchRecord {
  return {
    id: row.id,
    institutionId: row.institution_id,
    statementLineId: row.statement_line_id,
    candidateId: row.candidate_id,
    candidateKind: toCandidateKind(row.candidate_kind, row.id),
    status: toMatchStatus(row.status, row.id),
    score: row.score,
    reasons: parseReasons(row.reasons),
    matchedBy: row.matched_by,
    matchedAt: row.matched_at,
    unmatchedBy: row.unmatched_by,
    unmatchedAt: row.unmatched_at,
    unmatchedReason: row.unmatched_reason,
  };
}

function toAuditEvent(row: AuditRow): ReconciliationAuditEvent {
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

function toCurrency(value: string, subject: string): CurrencyCode {
  if (!isCurrencyCode(value)) {
    throw new ReconciliationError(
      'storage',
      `${subject} is counted in "${value}", which is not a currency the money module knows`
    );
  }
  return value;
}

function toFormat(value: string, subject: string): StatementFormat {
  const format = FORMATS.find((candidate) => candidate === value);
  if (!format) {
    throw new ReconciliationError('storage', `statement ${subject} names the unknown format "${value}"`);
  }
  return format;
}

function toDirection(value: string, subject: string): StatementDirection {
  const direction = DIRECTIONS.find((candidate) => candidate === value);
  if (!direction) {
    throw new ReconciliationError(
      'storage',
      `statement line ${subject} names the unknown direction "${value}"`
    );
  }
  return direction;
}

function toCandidateKind(value: string, subject: string): CandidateKind {
  const kind = CANDIDATE_KINDS.find((candidate) => candidate === value);
  if (!kind) {
    throw new ReconciliationError(
      'storage',
      `match ${subject} names the unknown candidate kind "${value}"`
    );
  }
  return kind;
}

function toMatchStatus(value: string, subject: string): MatchStatus {
  const status = MATCH_STATUSES.find((candidate) => candidate === value);
  if (!status) {
    throw new ReconciliationError('storage', `match ${subject} names the unknown status "${value}"`);
  }
  return status;
}

function parseReasons(value: string): MatchRecord['reasons'] {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? (parsed as MatchRecord['reasons']) : [];
}

function parseJson(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
