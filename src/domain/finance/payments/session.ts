// ABOUTME: The cashier session of spec 05 §5.1: an opening float, the payments taken in it, a close
// ABOUTME: that reconciles the expected cash against the counted cash, and the Z-report of figures.
// ABOUTME: The session is its own table beside the canonical rows, the posture the ledger takes.

import {
  AUDIT_TABLE,
  applyAuditSchema,
  writeAuditEvent,
} from '@/data/repository';
import {
  SqliteAdapterError,
  type SqliteAdapter,
  type SqliteBindValue,
  type SqliteTransaction,
} from '@/data/adapters/sqlite';
import { generateUuidv7 } from '@/domain/ids';
import { add, compare, fromMinor, isCurrencyCode, subtract, zero, type Money } from '@/domain/money';

import { channelLabel, isCashChannel } from './channels';
import { PaymentError } from './errors';
import type {
  CashierReconciliation,
  CashierSession,
  CashierSessionPayment,
  CashierSessionStatus,
  CloseSessionInput,
  OpenSessionInput,
  PaymentChannel,
  ZReport,
  ZReportChannelLine,
} from './types';

/** The table holding one row per cashier session. */
export const CASHIER_SESSION_TABLE = 'cashier_session';
/** The table holding the payments attached to a session. */
export const CASHIER_SESSION_PAYMENT_TABLE = 'cashier_session_payment';
/** The entity name a session change is recorded under in the repository's audit trail. */
export const CASHIER_SESSION_AUDIT_ENTITY = 'cashier_session';

/**
 * The DDL of the cashier session.
 *
 * The canonical registry does not model a session, so - like the ledger and the sequences module -
 * the session keeps its own tables and `ensureCashierSchema` applies them beside the canonical
 * ones. A session closes once, which the `closed_at`/`status` pair records, and a payment is
 * attached once, which the primary key of the link table makes a property of the database.
 */
export const CASHIER_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "${CASHIER_SESSION_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "cashier_user_id" TEXT NOT NULL,
     "cashier_name" TEXT NOT NULL,
     "currency" TEXT NOT NULL,
     "opening_float_minor" INTEGER NOT NULL,
     "status" TEXT NOT NULL,
     "opened_at" TEXT NOT NULL,
     "closed_at" TEXT,
     "counted_cash_minor" INTEGER,
     "expected_cash_minor" INTEGER,
     "variance_minor" INTEGER,
     "close_reason" TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS "${CASHIER_SESSION_TABLE}_cashier"
     ON "${CASHIER_SESSION_TABLE}" ("institution_id", "cashier_user_id", "status")`,
  `CREATE INDEX IF NOT EXISTS "${CASHIER_SESSION_TABLE}_opened"
     ON "${CASHIER_SESSION_TABLE}" ("institution_id", "opened_at")`,
  `CREATE TABLE IF NOT EXISTS "${CASHIER_SESSION_PAYMENT_TABLE}" (
     "session_id" TEXT NOT NULL REFERENCES "${CASHIER_SESSION_TABLE}" ("id"),
     "payment_id" TEXT NOT NULL,
     "channel" TEXT NOT NULL,
     "amount_minor" INTEGER NOT NULL,
     "currency" TEXT NOT NULL,
     "attached_at" TEXT NOT NULL,
     PRIMARY KEY ("session_id", "payment_id")
   )`,
  `CREATE INDEX IF NOT EXISTS "${CASHIER_SESSION_PAYMENT_TABLE}_payment"
     ON "${CASHIER_SESSION_PAYMENT_TABLE}" ("payment_id")`,
];

/** One audit record the session writes, in the repository's own audit table. */
export interface CashierAuditRecord {
  readonly subjectId: string;
  readonly action: 'create' | 'update';
  readonly actorId: string | null;
  readonly reason: string | null;
  readonly detail: unknown;
  readonly changedFields: readonly string[];
  readonly createdAt: string;
}

/** What a caller can narrow the session list by. */
export interface CashierSessionQuery {
  readonly institutionId?: string;
  readonly cashierUserId?: string;
  readonly status?: CashierSessionStatus;
  readonly limit?: number;
}

/**
 * The persistence a cashier session needs.
 *
 * It stores sessions and the payments attached to them and reads them back. There is no method
 * that reopens a closed session: a session closes once, and the store offers no way around it.
 */
export interface CashierSessionStore {
  transaction<T>(work: (tx: CashierSessionStore) => Promise<T>): Promise<T>;
  insertSession(session: CashierSession): Promise<void>;
  updateSession(session: CashierSession): Promise<void>;
  session(id: string): Promise<CashierSession | null>;
  findOpenSession(institutionId: string, cashierUserId: string): Promise<CashierSession | null>;
  listSessions(query: CashierSessionQuery): Promise<readonly CashierSession[]>;
  /** Attaches a payment to a session. The database refuses the same payment twice. */
  attachPayment(link: CashierSessionPayment): Promise<void>;
  paymentsOf(sessionId: string): Promise<readonly CashierSessionPayment[]>;
  /** Appends a row to the repository's audit trail, inside the write's transaction. */
  writeAudit(record: CashierAuditRecord): Promise<string>;
}

/** Applies the cashier session's DDL and the audit table it records into; safe to call repeatedly. */
export async function ensureCashierSchema(adapter: SqliteAdapter): Promise<void> {
  await applyAuditSchema(adapter);
  await adapter.transaction(async (tx) => {
    for (const statement of CASHIER_DDL) {
      await tx.exec(statement);
    }
  });
}

/** Builds the SQLite store over an open adapter. */
export function createSqliteCashierSessionStore(adapter: SqliteAdapter): CashierSessionStore {
  return new SqliteCashierSessionStore(adapter, adapter);
}

interface SessionRow {
  readonly id: string;
  readonly institution_id: string;
  readonly cashier_user_id: string;
  readonly cashier_name: string;
  readonly currency: string;
  readonly opening_float_minor: number;
  readonly status: string;
  readonly opened_at: string;
  readonly closed_at: string | null;
  readonly counted_cash_minor: number | null;
  readonly expected_cash_minor: number | null;
  readonly variance_minor: number | null;
  readonly close_reason: string | null;
}

interface LinkRow {
  readonly session_id: string;
  readonly payment_id: string;
  readonly channel: string;
  readonly amount_minor: number;
  readonly currency: string;
  readonly attached_at: string;
}

const INSERT_SESSION_SQL = `INSERT INTO "${CASHIER_SESSION_TABLE}"
   ("id", "institution_id", "cashier_user_id", "cashier_name", "currency", "opening_float_minor",
    "status", "opened_at", "closed_at", "counted_cash_minor", "expected_cash_minor", "variance_minor", "close_reason")
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const UPDATE_SESSION_SQL = `UPDATE "${CASHIER_SESSION_TABLE}"
   SET "status" = ?, "closed_at" = ?, "counted_cash_minor" = ?, "expected_cash_minor" = ?,
       "variance_minor" = ?, "close_reason" = ?
   WHERE "id" = ?`;

const INSERT_LINK_SQL = `INSERT INTO "${CASHIER_SESSION_PAYMENT_TABLE}"
   ("session_id", "payment_id", "channel", "amount_minor", "currency", "attached_at")
   VALUES (?, ?, ?, ?, ?, ?)`;

const SESSION_COLUMNS = `"id" AS "id", "institution_id" AS "institution_id",
   "cashier_user_id" AS "cashier_user_id", "cashier_name" AS "cashier_name", "currency" AS "currency",
   "opening_float_minor" AS "opening_float_minor", "status" AS "status", "opened_at" AS "opened_at",
   "closed_at" AS "closed_at", "counted_cash_minor" AS "counted_cash_minor",
   "expected_cash_minor" AS "expected_cash_minor", "variance_minor" AS "variance_minor",
   "close_reason" AS "close_reason"`;

const LINK_COLUMNS = `"session_id" AS "session_id", "payment_id" AS "payment_id", "channel" AS "channel",
   "amount_minor" AS "amount_minor", "currency" AS "currency", "attached_at" AS "attached_at"`;

/**
 * The SQLite session store.
 *
 * `runner` is the adapter outside a transaction and the transaction handle inside one, so a
 * statement never has to know which it is running on. A transaction binds a new store rather than
 * mutating this one, so two overlapping callers cannot borrow each other's transaction.
 */
class SqliteCashierSessionStore implements CashierSessionStore {
  constructor(
    private readonly runner: SqliteTransaction,
    private readonly adapter: SqliteAdapter | null
  ) {}

  async transaction<T>(work: (tx: CashierSessionStore) => Promise<T>): Promise<T> {
    if (!this.adapter) {
      throw new PaymentError(
        'storage',
        'this store is already bound to a transaction; the session cannot open a second one'
      );
    }
    try {
      return await this.adapter.transaction((tx) => work(new SqliteCashierSessionStore(tx, null)));
    } catch (error) {
      throw translate(error);
    }
  }

  async insertSession(session: CashierSession): Promise<void> {
    try {
      await this.runner.run(INSERT_SESSION_SQL, sessionValues(session));
    } catch (error) {
      throw translate(error);
    }
  }

  async updateSession(session: CashierSession): Promise<void> {
    try {
      await this.runner.run(UPDATE_SESSION_SQL, [
        session.status,
        session.closedAt,
        session.countedCash?.amount_minor ?? null,
        session.expectedCash?.amount_minor ?? null,
        session.variance?.amount_minor ?? null,
        session.closeReason,
        session.id,
      ]);
    } catch (error) {
      throw translate(error);
    }
  }

  async session(id: string): Promise<CashierSession | null> {
    try {
      const row = await this.runner.get<SessionRow>(
        `SELECT ${SESSION_COLUMNS} FROM "${CASHIER_SESSION_TABLE}" WHERE "id" = ?`,
        [id]
      );
      return row ? toSession(row) : null;
    } catch (error) {
      throw translate(error);
    }
  }

  async findOpenSession(institutionId: string, cashierUserId: string): Promise<CashierSession | null> {
    try {
      const row = await this.runner.get<SessionRow>(
        `SELECT ${SESSION_COLUMNS} FROM "${CASHIER_SESSION_TABLE}"
           WHERE "institution_id" = ? AND "cashier_user_id" = ? AND "status" = 'open'
           ORDER BY "opened_at" LIMIT 1`,
        [institutionId, cashierUserId]
      );
      return row ? toSession(row) : null;
    } catch (error) {
      throw translate(error);
    }
  }

  async listSessions(query: CashierSessionQuery): Promise<readonly CashierSession[]> {
    const clauses: string[] = [];
    const params: SqliteBindValue[] = [];
    if (query.institutionId !== undefined) {
      clauses.push('"institution_id" = ?');
      params.push(query.institutionId);
    }
    if (query.cashierUserId !== undefined) {
      clauses.push('"cashier_user_id" = ?');
      params.push(query.cashierUserId);
    }
    if (query.status !== undefined) {
      clauses.push('"status" = ?');
      params.push(query.status);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Math.max(1, Math.min(query.limit ?? 200, 1000));
    try {
      const rows = await this.runner.all<SessionRow>(
        `SELECT ${SESSION_COLUMNS} FROM "${CASHIER_SESSION_TABLE}" ${where}
           ORDER BY "opened_at" DESC LIMIT ?`,
        [...params, limit]
      );
      return rows.map(toSession);
    } catch (error) {
      throw translate(error);
    }
  }

  async attachPayment(link: CashierSessionPayment): Promise<void> {
    try {
      await this.runner.run(INSERT_LINK_SQL, [
        link.sessionId,
        link.paymentId,
        link.channel,
        link.amount.amount_minor,
        link.amount.currency,
        link.attachedAt,
      ]);
    } catch (error) {
      throw translate(error);
    }
  }

  async paymentsOf(sessionId: string): Promise<readonly CashierSessionPayment[]> {
    try {
      const rows = await this.runner.all<LinkRow>(
        `SELECT ${LINK_COLUMNS} FROM "${CASHIER_SESSION_PAYMENT_TABLE}"
           WHERE "session_id" = ? ORDER BY "attached_at", "payment_id"`,
        [sessionId]
      );
      return rows.map(toLink);
    } catch (error) {
      throw translate(error);
    }
  }

  async writeAudit(record: CashierAuditRecord): Promise<string> {
    try {
      const row = await this.runner.get<{ value: number }>(
        `SELECT COALESCE(MAX("commit_sequence"), 0) + 1 AS "value" FROM "${AUDIT_TABLE}"`
      );
      const commitSequence = row && Number.isSafeInteger(row.value) ? row.value : 1;
      return await writeAuditEvent(this.runner, {
        entity: CASHIER_SESSION_AUDIT_ENTITY,
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
      throw translate(error);
    }
  }
}

function sessionValues(session: CashierSession): SqliteBindValue[] {
  return [
    session.id,
    session.institutionId,
    session.cashierUserId,
    session.cashierName,
    session.currency,
    session.openingFloat.amount_minor,
    session.status,
    session.openedAt,
    session.closedAt,
    session.countedCash?.amount_minor ?? null,
    session.expectedCash?.amount_minor ?? null,
    session.variance?.amount_minor ?? null,
    session.closeReason,
  ];
}

function toSession(row: SessionRow): CashierSession {
  const currency = row.currency;
  return {
    id: row.id,
    institutionId: row.institution_id,
    cashierUserId: row.cashier_user_id,
    cashierName: row.cashier_name,
    currency,
    openingFloat: fromMinor(row.opening_float_minor, asCurrency(currency, row.id)),
    status: row.status === 'closed' ? 'closed' : 'open',
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    countedCash:
      row.counted_cash_minor === null ? null : fromMinor(row.counted_cash_minor, asCurrency(currency, row.id)),
    expectedCash:
      row.expected_cash_minor === null ? null : fromMinor(row.expected_cash_minor, asCurrency(currency, row.id)),
    variance:
      row.variance_minor === null ? null : fromMinor(row.variance_minor, asCurrency(currency, row.id)),
    closeReason: row.close_reason,
  };
}

function toLink(row: LinkRow): CashierSessionPayment {
  return {
    sessionId: row.session_id,
    paymentId: row.payment_id,
    channel: row.channel as PaymentChannel,
    amount: fromMinor(row.amount_minor, asCurrency(row.currency, row.session_id)),
    attachedAt: row.attached_at,
  };
}

function asCurrency(value: string, subject: string) {
  if (!isCurrencyCode(value)) {
    throw new PaymentError(
      'storage',
      `cashier session ${subject} is counted in "${value}", which is not a currency the money module knows`
    );
  }
  return value;
}

/** Turns a database failure into the module's own error. */
function translate(error: unknown): Error {
  if (error instanceof PaymentError) return error;
  if (error instanceof SqliteAdapterError) {
    return new PaymentError('storage', error.message, { cause: error });
  }
  return error instanceof Error ? error : new PaymentError('storage', String(error));
}

/** What a close reports: the session, its reconciliation and its Z-report. */
export interface SessionClose {
  readonly session: CashierSession;
  readonly reconciliation: CashierReconciliation;
  readonly report: ZReport;
}

/**
 * Opens, reads, reconciles and closes cashier sessions, and renders their Z-reports.
 *
 * The service writes through the store, and the store's only update moves a session between open
 * and closed: a closed session is never reopened. The expected cash is the opening float plus the
 * cash-channel payments, and the variance is stated rather than hidden, exactly as spec 05 §5.1
 * asks ("opening float, closing count, variance").
 */
export class CashierSessionService {
  private readonly store: CashierSessionStore;
  private readonly clock: () => Date;
  private readonly actor: string | undefined;

  constructor(options: {
    readonly store: CashierSessionStore;
    readonly now?: () => Date;
    readonly actor?: string;
  }) {
    this.store = options.store;
    this.clock = options.now ?? (() => new Date());
    this.actor = options.actor;
  }

  /** Opens a session. A cashier who already holds an open one is refused. */
  async open(input: OpenSessionInput): Promise<CashierSession> {
    if (!Number.isSafeInteger(input.openingFloat.amount_minor) || input.openingFloat.amount_minor < 0) {
      throw new PaymentError(
        'opening_float_invalid',
        `an opening float is a whole number of minor units at or above zero, got ${input.openingFloat.amount_minor}`,
        { detail: { amount: input.openingFloat.amount_minor } }
      );
    }
    const open = await this.store.findOpenSession(input.institutionId, input.cashierUserId);
    if (open) {
      throw new PaymentError(
        'session_already_open',
        `cashier ${input.cashierUserId} already holds an open session (${open.id}); close it before opening another`,
        { detail: { sessionId: open.id } }
      );
    }
    const now = this.clock().toISOString();
    const session: CashierSession = {
      id: generateUuidv7(),
      institutionId: input.institutionId,
      cashierUserId: input.cashierUserId,
      cashierName: input.cashierName ?? input.cashierUserId,
      currency: input.openingFloat.currency,
      openingFloat: input.openingFloat,
      status: 'open',
      openedAt: input.openedAt ?? now,
      closedAt: null,
      countedCash: null,
      expectedCash: null,
      variance: null,
      closeReason: null,
    };

    return this.store.transaction(async (tx) => {
      await tx.insertSession(session);
      await tx.writeAudit({
        subjectId: session.id,
        action: 'create',
        actorId: this.actor ?? input.cashierUserId,
        reason: input.reason ?? null,
        detail: {
          institutionId: session.institutionId,
          cashierUserId: session.cashierUserId,
          openingFloatMinor: session.openingFloat.amount_minor,
          currency: session.currency,
        },
        changedFields: ['status', 'opening_float_minor', 'opened_at'],
        createdAt: session.openedAt,
      });
      return session;
    });
  }

  /** One session, or null. */
  session(id: string): Promise<CashierSession | null> {
    return this.store.session(id);
  }

  /** The sessions a query names, newest first. */
  sessions(query: CashierSessionQuery = {}): Promise<readonly CashierSession[]> {
    return this.store.listSessions(query);
  }

  /** The session a cashier holds open, or null. */
  openSessionFor(institutionId: string, cashierUserId: string): Promise<CashierSession | null> {
    return this.store.findOpenSession(institutionId, cashierUserId);
  }

  /**
   * Attaches a payment to a session.
   *
   * A closed session refuses it: a payment cannot be taken in a session that has been reconciled,
   * because the drawer the Z-report counted is already gone.
   */
  async attach(
    sessionId: string,
    payment: { readonly paymentId: string; readonly channel: PaymentChannel; readonly amount: Money },
    attachedAt?: string
  ): Promise<CashierSessionPayment> {
    const session = await this.requireSession(sessionId);
    this.assertOpen(session);
    if (session.currency !== payment.amount.currency) {
      throw new PaymentError(
        'session_currency_mismatch',
        `session ${sessionId} is counted in ${session.currency}, the payment in ${payment.amount.currency}`,
        { detail: { sessionId, sessionCurrency: session.currency, amountCurrency: payment.amount.currency } }
      );
    }
    const link: CashierSessionPayment = {
      sessionId,
      paymentId: payment.paymentId,
      channel: payment.channel,
      amount: payment.amount,
      attachedAt: attachedAt ?? this.clock().toISOString(),
    };
    await this.store.attachPayment(link);
    return link;
  }

  /** What the session reconciles to: the float plus the cash taken, and the cash that was taken. */
  async reconciliation(sessionId: string): Promise<CashierReconciliation> {
    const session = await this.requireSession(sessionId);
    const links = await this.store.paymentsOf(sessionId);
    const currency = session.currency as Money['currency'];
    const cashTaken = links
      .filter((link) => isCashChannel(link.channel))
      .reduce((running, link) => add(running, link.amount), zero(currency));
    const expectedCash = add(session.openingFloat, cashTaken);
    const countedCash = session.countedCash ?? expectedCash;
    const variance = subtract(countedCash, expectedCash);
    return {
      sessionId,
      currency: session.currency,
      openingFloat: session.openingFloat,
      cashTaken,
      expectedCash,
      countedCash,
      variance,
      balanced: compare(variance, zero(currency)) === 0,
    };
  }

  /**
   * Closes a session: the expected cash against the counted cash, with the difference stated.
   *
   * The session closes once. A close of an already-closed session is refused, and so is a counted
   * cash that is not a whole number of minor units.
   */
  async close(input: CloseSessionInput): Promise<SessionClose> {
    if (!Number.isSafeInteger(input.countedCash.amount_minor) || input.countedCash.amount_minor < 0) {
      throw new PaymentError(
        'counted_cash_invalid',
        `counted cash is a whole number of minor units at or above zero, got ${input.countedCash.amount_minor}`,
        { detail: { amount: input.countedCash.amount_minor } }
      );
    }
    const session = await this.requireSession(input.sessionId);
    if (session.status === 'closed') {
      throw new PaymentError(
        'session_already_closed',
        `session ${session.id} was closed at ${session.closedAt}; a session closes once`,
        { detail: { sessionId: session.id, closedAt: session.closedAt } }
      );
    }
    if (session.currency !== input.countedCash.currency) {
      throw new PaymentError(
        'session_currency_mismatch',
        `session ${session.id} is counted in ${session.currency}, the counted cash in ${input.countedCash.currency}`,
        { detail: { sessionId: session.id, sessionCurrency: session.currency, countedCurrency: input.countedCash.currency } }
      );
    }

    const links = await this.store.paymentsOf(session.id);
    const currency = session.currency as Money['currency'];
    const cashTaken = links
      .filter((link) => isCashChannel(link.channel))
      .reduce((running, link) => add(running, link.amount), zero(currency));
    const expectedCash = add(session.openingFloat, cashTaken);
    const variance = subtract(input.countedCash, expectedCash);
    const closedAt = input.closedAt ?? this.clock().toISOString();

    const closed: CashierSession = {
      ...session,
      status: 'closed',
      closedAt,
      countedCash: input.countedCash,
      expectedCash,
      variance,
      closeReason: input.reason ?? null,
    };

    const reconciliation: CashierReconciliation = {
      sessionId: session.id,
      currency: session.currency,
      openingFloat: session.openingFloat,
      cashTaken,
      expectedCash,
      countedCash: input.countedCash,
      variance,
      balanced: compare(variance, zero(currency)) === 0,
    };

    await this.store.transaction(async (tx) => {
      await tx.updateSession(closed);
      await tx.writeAudit({
        subjectId: closed.id,
        action: 'update',
        actorId: input.actor ?? this.actor ?? session.cashierUserId,
        reason: input.reason ?? null,
        detail: {
          status: closed.status,
          countedCashMinor: input.countedCash.amount_minor,
          expectedCashMinor: expectedCash.amount_minor,
          varianceMinor: variance.amount_minor,
          currency: session.currency,
        },
        changedFields: ['status', 'closed_at', 'counted_cash_minor', 'expected_cash_minor', 'variance_minor'],
        createdAt: closedAt,
      });
    });

    return { session: closed, reconciliation, report: await this.zReport(closed) };
  }

  /**
   * The Z-report of a session: what it took, by channel, and the drawer it reconciles to.
   *
   * A report of an open session states the expected cash but no counted cash; a report of a closed
   * session states both and the variance between them.
   */
  async zReport(sessionOrId: CashierSession | string): Promise<ZReport> {
    const session =
      typeof sessionOrId === 'string' ? await this.requireSession(sessionOrId) : sessionOrId;
    const links = await this.store.paymentsOf(session.id);
    const currency = session.currency as Money['currency'];

    const byChannel = new Map<PaymentChannel, { count: number; amount: Money }>();
    for (const link of links) {
      const current = byChannel.get(link.channel) ?? { count: 0, amount: zero(currency) };
      byChannel.set(link.channel, {
        count: current.count + 1,
        amount: add(current.amount, link.amount),
      });
    }

    const lines: ZReportChannelLine[] = [...byChannel.entries()]
      .map(([channel, totals]) => ({
        channel,
        label: channelLabel(channel),
        count: totals.count,
        amount: totals.amount,
        isCash: isCashChannel(channel),
      }))
      .sort((left, right) => left.channel.localeCompare(right.channel));

    const total = lines.reduce((running, line) => add(running, line.amount), zero(currency));
    const cashTotal = lines
      .filter((line) => line.isCash)
      .reduce((running, line) => add(running, line.amount), zero(currency));
    const expectedCash = add(session.openingFloat, cashTotal);

    return {
      session,
      generatedAt: this.clock().toISOString(),
      lines,
      total,
      cashTotal,
      paymentCount: links.length,
      expectedCash,
      countedCash: session.countedCash,
      variance: session.variance,
    };
  }

  private async requireSession(id: string): Promise<CashierSession> {
    const session = await this.store.session(id);
    if (!session) {
      throw new PaymentError('session_missing', `cashier session ${id} does not exist`, {
        detail: { sessionId: id },
      });
    }
    return session;
  }

  private assertOpen(session: CashierSession): void {
    if (session.status === 'closed') {
      throw new PaymentError(
        'session_closed',
        `session ${session.id} was closed at ${session.closedAt}; a payment cannot be taken in a closed session`,
        { detail: { sessionId: session.id, closedAt: session.closedAt } }
      );
    }
  }
}
