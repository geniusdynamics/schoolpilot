// ABOUTME: The collections module's own SQLite tables and the store over them: schedules, opt-outs,
// ABOUTME: promises, pay links and the one attempt row per document and interval that proves a
// ABOUTME: re-run cannot send the same reminder twice. Its own tables, the posture the ledger takes.

import {
  SqliteAdapterError,
  type SqliteAdapter,
  type SqliteTransaction,
} from '@/data/adapters/sqlite';
import { fromMinor, isCurrencyCode, type CurrencyCode } from '@/domain/money';

import { CollectionsError } from './errors';
import { optOutScopeKey } from './optOuts';
import type {
  CollectionsStore,
  PayLink,
  PromiseStatus,
  PromiseToPay,
  ReminderAttempt,
  ReminderAttemptState,
  ReminderCategory,
  ReminderChannel,
  ReminderOptOut,
  ReminderOptOutScope,
  ReminderSchedule,
} from './types';

/** The table holding one row per schedule. */
export const REMINDER_SCHEDULE_TABLE = 'reminder_schedule';
/** The table holding one row per payer opt-out. */
export const REMINDER_OPT_OUT_TABLE = 'reminder_opt_out';
/** The table holding one row per promise to pay. */
export const REMINDER_PROMISE_TABLE = 'reminder_promise';
/** The table holding one row per pay link. */
export const REMINDER_PAY_LINK_TABLE = 'reminder_pay_link';
/** The table holding one row per (document, interval): the idempotency record. */
export const REMINDER_ATTEMPT_TABLE = 'reminder_attempt';

/**
 * The DDL of the collections module.
 *
 * The unique key of `reminder_attempt` is the idempotency proof: one row per institution, document
 * and interval, so a re-run finds the row rather than sending again. A queued row's `scheduled_for`
 * is when its quiet-hours window opens; a sent row's `sent_at` is when it went out.
 */
export const COLLECTIONS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "${REMINDER_SCHEDULE_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "name" TEXT NOT NULL,
     "enabled" INTEGER NOT NULL,
     "audience" TEXT NOT NULL,
     "category" TEXT NOT NULL,
     "escalation_category" TEXT,
     "intervals_json" TEXT NOT NULL,
     "channels_json" TEXT NOT NULL,
     "locale" TEXT,
     "quiet_hours_json" TEXT NOT NULL,
     "catch_up_days" INTEGER,
     "min_amount_minor" INTEGER,
     "escalate_on_broken_promise" INTEGER,
     "template_ids_json" TEXT,
     "pay_link_ttl_days" INTEGER,
     "created_at" TEXT NOT NULL,
     "updated_at" TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS "${REMINDER_SCHEDULE_TABLE}_institution"
     ON "${REMINDER_SCHEDULE_TABLE}" ("institution_id")`,

  `CREATE TABLE IF NOT EXISTS "${REMINDER_OPT_OUT_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "payer_id" TEXT NOT NULL,
     "scope_kind" TEXT NOT NULL,
     "scope_value" TEXT NOT NULL,
     "source" TEXT NOT NULL,
     "reason" TEXT,
     "recorded_at" TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${REMINDER_OPT_OUT_TABLE}_payer_scope"
     ON "${REMINDER_OPT_OUT_TABLE}" ("institution_id", "payer_id", "scope_kind", "scope_value")`,

  `CREATE TABLE IF NOT EXISTS "${REMINDER_PROMISE_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "document_key" TEXT NOT NULL,
     "payer_id" TEXT NOT NULL,
     "amount_minor" INTEGER NOT NULL,
     "currency" TEXT NOT NULL,
     "promised_on" TEXT NOT NULL,
     "status" TEXT NOT NULL,
     "note" TEXT,
     "recorded_at" TEXT NOT NULL,
     "resolved_at" TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS "${REMINDER_PROMISE_TABLE}_document"
     ON "${REMINDER_PROMISE_TABLE}" ("institution_id", "document_key")`,

  `CREATE TABLE IF NOT EXISTS "${REMINDER_PAY_LINK_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "document_key" TEXT NOT NULL,
     "payer_id" TEXT NOT NULL,
     "amount_minor" INTEGER NOT NULL,
     "currency" TEXT NOT NULL,
     "created_at" TEXT NOT NULL,
     "expires_at" TEXT NOT NULL,
     "signature" TEXT NOT NULL,
     "used_at" TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS "${REMINDER_PAY_LINK_TABLE}_document"
     ON "${REMINDER_PAY_LINK_TABLE}" ("institution_id", "document_key")`,

  `CREATE TABLE IF NOT EXISTS "${REMINDER_ATTEMPT_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "schedule_id" TEXT NOT NULL,
     "document_key" TEXT NOT NULL,
     "interval_id" TEXT NOT NULL,
     "payer_id" TEXT NOT NULL,
     "payer_name" TEXT NOT NULL,
     "subject_name" TEXT NOT NULL,
     "document_number" TEXT,
     "due_date" TEXT,
     "amount_minor" INTEGER NOT NULL,
     "currency" TEXT NOT NULL,
     "channel" TEXT NOT NULL,
     "category" TEXT NOT NULL,
     "to_address" TEXT NOT NULL,
     "state" TEXT NOT NULL,
     "reason" TEXT NOT NULL,
     "scheduled_for" TEXT,
     "sent_at" TEXT,
     "message_id" TEXT,
     "created_at" TEXT NOT NULL,
     "updated_at" TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${REMINDER_ATTEMPT_TABLE}_document_interval"
     ON "${REMINDER_ATTEMPT_TABLE}" ("institution_id", "document_key", "interval_id")`,
  `CREATE INDEX IF NOT EXISTS "${REMINDER_ATTEMPT_TABLE}_queue"
     ON "${REMINDER_ATTEMPT_TABLE}" ("institution_id", "state", "scheduled_for")`,
];

/** Applies the collections DDL; safe to call repeatedly. */
export async function ensureCollectionsSchema(adapter: SqliteAdapter): Promise<void> {
  await adapter.transaction(async (tx) => {
    for (const statement of COLLECTIONS_DDL) {
      await tx.exec(statement);
    }
  });
}

/** Builds the store over an open adapter. */
export function createSqliteCollectionsStore(adapter: SqliteAdapter): CollectionsStore {
  return new SqliteCollectionsStore(adapter, adapter);
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (value === null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function currencyOf(value: string, subject: string): CurrencyCode {
  if (!isCurrencyCode(value)) {
    throw new CollectionsError(
      'storage',
      `reminder ${subject} is counted in "${value}", which is not a currency the money module knows`
    );
  }
  return value;
}

function translate(error: unknown): Error {
  if (error instanceof CollectionsError) return error;
  if (error instanceof SqliteAdapterError) {
    return new CollectionsError('storage', error.message, { cause: error });
  }
  return error instanceof Error ? error : new CollectionsError('storage', String(error));
}

interface ScheduleRow {
  readonly id: string;
  readonly institution_id: string;
  readonly name: string;
  readonly enabled: number;
  readonly audience: string;
  readonly category: string;
  readonly escalation_category: string | null;
  readonly intervals_json: string;
  readonly channels_json: string;
  readonly locale: string | null;
  readonly quiet_hours_json: string;
  readonly catch_up_days: number | null;
  readonly min_amount_minor: number | null;
  readonly escalate_on_broken_promise: number | null;
  readonly template_ids_json: string | null;
  readonly pay_link_ttl_days: number | null;
}

interface OptOutRow {
  readonly id: string;
  readonly institution_id: string;
  readonly payer_id: string;
  readonly scope_kind: string;
  readonly scope_value: string;
  readonly source: string;
  readonly reason: string | null;
  readonly recorded_at: string;
}

interface PromiseRow {
  readonly id: string;
  readonly institution_id: string;
  readonly document_key: string;
  readonly payer_id: string;
  readonly amount_minor: number;
  readonly currency: string;
  readonly promised_on: string;
  readonly status: string;
  readonly note: string | null;
  readonly recorded_at: string;
  readonly resolved_at: string | null;
}

interface PayLinkRow {
  readonly id: string;
  readonly institution_id: string;
  readonly document_key: string;
  readonly payer_id: string;
  readonly amount_minor: number;
  readonly currency: string;
  readonly created_at: string;
  readonly expires_at: string;
  readonly signature: string;
  readonly used_at: string | null;
}

interface AttemptRow {
  readonly id: string;
  readonly institution_id: string;
  readonly schedule_id: string;
  readonly document_key: string;
  readonly interval_id: string;
  readonly payer_id: string;
  readonly payer_name: string;
  readonly subject_name: string;
  readonly document_number: string | null;
  readonly due_date: string | null;
  readonly amount_minor: number;
  readonly currency: string;
  readonly channel: string;
  readonly category: string;
  readonly to_address: string;
  readonly state: string;
  readonly reason: string;
  readonly scheduled_for: string | null;
  readonly sent_at: string | null;
  readonly message_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

const SCHEDULE_COLUMNS = `"id", "institution_id", "name", "enabled", "audience", "category",
   "escalation_category", "intervals_json", "channels_json", "locale", "quiet_hours_json",
   "catch_up_days", "min_amount_minor", "escalate_on_broken_promise", "template_ids_json",
   "pay_link_ttl_days", "created_at", "updated_at"`;

const OPT_OUT_COLUMNS = `"id", "institution_id", "payer_id", "scope_kind", "scope_value", "source",
   "reason", "recorded_at"`;

const PROMISE_COLUMNS = `"id", "institution_id", "document_key", "payer_id", "amount_minor",
   "currency", "promised_on", "status", "note", "recorded_at", "resolved_at"`;

const PAY_LINK_COLUMNS = `"id", "institution_id", "document_key", "payer_id", "amount_minor",
   "currency", "created_at", "expires_at", "signature", "used_at"`;

const ATTEMPT_COLUMNS = `"id", "institution_id", "schedule_id", "document_key", "interval_id",
   "payer_id", "payer_name", "subject_name", "document_number", "due_date", "amount_minor",
   "currency", "channel", "category", "to_address", "state", "reason", "scheduled_for", "sent_at",
   "message_id", "created_at", "updated_at"`;

const SCHEDULE_UPSERT = `INSERT INTO "${REMINDER_SCHEDULE_TABLE}" (${SCHEDULE_COLUMNS})
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT("id") DO UPDATE SET
     "name" = excluded."name", "enabled" = excluded."enabled", "audience" = excluded."audience",
     "category" = excluded."category", "escalation_category" = excluded."escalation_category",
     "intervals_json" = excluded."intervals_json", "channels_json" = excluded."channels_json",
     "locale" = excluded."locale", "quiet_hours_json" = excluded."quiet_hours_json",
     "catch_up_days" = excluded."catch_up_days", "min_amount_minor" = excluded."min_amount_minor",
     "escalate_on_broken_promise" = excluded."escalate_on_broken_promise",
     "template_ids_json" = excluded."template_ids_json", "pay_link_ttl_days" = excluded."pay_link_ttl_days",
     "updated_at" = excluded."updated_at"`;

const OPT_OUT_UPSERT = `INSERT INTO "${REMINDER_OPT_OUT_TABLE}" (${OPT_OUT_COLUMNS})
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT("institution_id", "payer_id", "scope_kind", "scope_value") DO UPDATE SET
     "source" = excluded."source", "reason" = excluded."reason", "recorded_at" = excluded."recorded_at"`;

const PROMISE_UPSERT = `INSERT INTO "${REMINDER_PROMISE_TABLE}" (${PROMISE_COLUMNS})
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT("id") DO UPDATE SET
     "status" = excluded."status", "note" = excluded."note", "resolved_at" = excluded."resolved_at"`;

const PAY_LINK_INSERT = `INSERT INTO "${REMINDER_PAY_LINK_TABLE}" (${PAY_LINK_COLUMNS})
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const ATTEMPT_UPSERT = `INSERT INTO "${REMINDER_ATTEMPT_TABLE}" (${ATTEMPT_COLUMNS})
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT("institution_id", "document_key", "interval_id") DO UPDATE SET
     "schedule_id" = excluded."schedule_id", "payer_id" = excluded."payer_id",
     "payer_name" = excluded."payer_name", "subject_name" = excluded."subject_name",
     "document_number" = excluded."document_number", "due_date" = excluded."due_date",
     "amount_minor" = excluded."amount_minor", "currency" = excluded."currency",
     "channel" = excluded."channel", "category" = excluded."category",
     "to_address" = excluded."to_address", "state" = excluded."state", "reason" = excluded."reason",
     "scheduled_for" = excluded."scheduled_for", "sent_at" = excluded."sent_at",
     "message_id" = excluded."message_id", "updated_at" = excluded."updated_at"`;

/**
 * The SQLite store.
 *
 * `runner` is the adapter outside a transaction and the transaction handle inside one, so a
 * statement never has to know which it runs on. A transaction binds a new store rather than
 * mutating this one, so two overlapping callers cannot borrow each other's transaction.
 */
class SqliteCollectionsStore implements CollectionsStore {
  constructor(
    private readonly runner: SqliteTransaction,
    private readonly adapter: SqliteAdapter | null
  ) {}

  async transaction<T>(work: (tx: CollectionsStore) => Promise<T>): Promise<T> {
    if (!this.adapter) {
      throw new CollectionsError(
        'storage',
        'this store is already bound to a transaction; it cannot open a second one'
      );
    }
    try {
      return await this.adapter.transaction((tx) => work(new SqliteCollectionsStore(tx, null)));
    } catch (error) {
      throw translate(error);
    }
  }

  async saveSchedule(schedule: ReminderSchedule): Promise<void> {
    const now = new Date().toISOString();
    try {
      await this.runner.run(SCHEDULE_UPSERT, [
        schedule.id,
        schedule.institutionId,
        schedule.name,
        schedule.enabled ? 1 : 0,
        schedule.audience,
        schedule.category,
        schedule.escalationCategory ?? null,
        JSON.stringify(schedule.intervals),
        JSON.stringify(schedule.channels),
        schedule.locale ?? null,
        JSON.stringify(schedule.quietHours),
        schedule.catchUpDays ?? null,
        schedule.minAmountMinor ?? null,
        schedule.escalateOnBrokenPromise === undefined ? null : schedule.escalateOnBrokenPromise ? 1 : 0,
        schedule.templateIds === undefined ? null : JSON.stringify(schedule.templateIds),
        schedule.payLinkTtlDays ?? null,
        now,
        now,
      ]);
    } catch (error) {
      throw translate(error);
    }
  }

  async schedule(id: string): Promise<ReminderSchedule | null> {
    try {
      const row = await this.runner.get<ScheduleRow>(
        `SELECT ${SCHEDULE_COLUMNS} FROM "${REMINDER_SCHEDULE_TABLE}" WHERE "id" = ?`,
        [id]
      );
      return row ? toSchedule(row) : null;
    } catch (error) {
      throw translate(error);
    }
  }

  async listSchedules(institutionId: string): Promise<readonly ReminderSchedule[]> {
    try {
      const rows = await this.runner.all<ScheduleRow>(
        `SELECT ${SCHEDULE_COLUMNS} FROM "${REMINDER_SCHEDULE_TABLE}"
           WHERE "institution_id" = ? ORDER BY "name", "id"`,
        [institutionId]
      );
      return rows.map(toSchedule);
    } catch (error) {
      throw translate(error);
    }
  }

  async insertOptOut(optOut: ReminderOptOut): Promise<void> {
    try {
      await this.runner.run(OPT_OUT_UPSERT, [
        optOut.id,
        optOut.institutionId,
        optOut.payerId,
        optOut.scope.kind,
        optOutScopeKey(optOut.scope),
        optOut.source,
        optOut.reason ?? null,
        optOut.recordedAt,
      ]);
    } catch (error) {
      throw translate(error);
    }
  }

  async optOuts(institutionId: string): Promise<readonly ReminderOptOut[]> {
    try {
      const rows = await this.runner.all<OptOutRow>(
        `SELECT ${OPT_OUT_COLUMNS} FROM "${REMINDER_OPT_OUT_TABLE}"
           WHERE "institution_id" = ? ORDER BY "recorded_at", "id"`,
        [institutionId]
      );
      return rows.map(toOptOut);
    } catch (error) {
      throw translate(error);
    }
  }

  async savePromise(promise: PromiseToPay): Promise<void> {
    try {
      await this.runner.run(PROMISE_UPSERT, [
        promise.id,
        promise.institutionId,
        promise.documentKey,
        promise.payerId,
        promise.amount.amount_minor,
        promise.amount.currency,
        promise.promisedOn,
        promise.status,
        promise.note ?? null,
        promise.recordedAt,
        promise.resolvedAt,
      ]);
    } catch (error) {
      throw translate(error);
    }
  }

  async promises(institutionId: string, documentKey?: string): Promise<readonly PromiseToPay[]> {
    try {
      const rows =
        documentKey === undefined
          ? await this.runner.all<PromiseRow>(
              `SELECT ${PROMISE_COLUMNS} FROM "${REMINDER_PROMISE_TABLE}"
                 WHERE "institution_id" = ? ORDER BY "promised_on", "id"`,
              [institutionId]
            )
          : await this.runner.all<PromiseRow>(
              `SELECT ${PROMISE_COLUMNS} FROM "${REMINDER_PROMISE_TABLE}"
                 WHERE "institution_id" = ? AND "document_key" = ? ORDER BY "promised_on", "id"`,
              [institutionId, documentKey]
            );
      return rows.map(toPromise);
    } catch (error) {
      throw translate(error);
    }
  }

  async insertPayLink(link: PayLink): Promise<void> {
    try {
      await this.runner.run(PAY_LINK_INSERT, [
        link.token,
        link.institutionId,
        link.documentKey,
        link.payerId,
        link.amount.amount_minor,
        link.amount.currency,
        link.createdAt,
        link.expiresAt,
        link.signature,
        link.usedAt,
      ]);
    } catch (error) {
      throw translate(error);
    }
  }

  async payLink(token: string): Promise<PayLink | null> {
    try {
      const row = await this.runner.get<PayLinkRow>(
        `SELECT ${PAY_LINK_COLUMNS} FROM "${REMINDER_PAY_LINK_TABLE}" WHERE "id" = ?`,
        [token]
      );
      return row ? toPayLink(row) : null;
    } catch (error) {
      throw translate(error);
    }
  }

  async markPayLinkUsed(token: string, usedAt: string): Promise<void> {
    try {
      await this.runner.run(
        `UPDATE "${REMINDER_PAY_LINK_TABLE}" SET "used_at" = ? WHERE "id" = ? AND "used_at" IS NULL`,
        [usedAt, token]
      );
    } catch (error) {
      throw translate(error);
    }
  }

  async attempt(
    institutionId: string,
    documentKey: string,
    intervalId: string
  ): Promise<ReminderAttempt | null> {
    try {
      const row = await this.runner.get<AttemptRow>(
        `SELECT ${ATTEMPT_COLUMNS} FROM "${REMINDER_ATTEMPT_TABLE}"
           WHERE "institution_id" = ? AND "document_key" = ? AND "interval_id" = ?`,
        [institutionId, documentKey, intervalId]
      );
      return row ? toAttempt(row) : null;
    } catch (error) {
      throw translate(error);
    }
  }

  async attempts(institutionId: string): Promise<readonly ReminderAttempt[]> {
    try {
      const rows = await this.runner.all<AttemptRow>(
        `SELECT ${ATTEMPT_COLUMNS} FROM "${REMINDER_ATTEMPT_TABLE}"
           WHERE "institution_id" = ? ORDER BY "document_key", "interval_id"`,
        [institutionId]
      );
      return rows.map(toAttempt);
    } catch (error) {
      throw translate(error);
    }
  }

  async queuedAttempts(institutionId: string, at: string): Promise<readonly ReminderAttempt[]> {
    try {
      const rows = await this.runner.all<AttemptRow>(
        `SELECT ${ATTEMPT_COLUMNS} FROM "${REMINDER_ATTEMPT_TABLE}"
           WHERE "institution_id" = ? AND "state" = 'queued' AND "scheduled_for" IS NOT NULL
             AND "scheduled_for" <= ?
           ORDER BY "scheduled_for", "document_key", "interval_id"`,
        [institutionId, at]
      );
      return rows.map(toAttempt);
    } catch (error) {
      throw translate(error);
    }
  }

  async saveAttempt(attempt: ReminderAttempt): Promise<void> {
    try {
      await this.runner.run(ATTEMPT_UPSERT, [
        attempt.id,
        attempt.institutionId,
        attempt.scheduleId,
        attempt.documentKey,
        attempt.intervalId,
        attempt.payerId,
        attempt.payerName,
        attempt.subjectName,
        attempt.documentNumber,
        attempt.dueDate,
        attempt.amount.amount_minor,
        attempt.amount.currency,
        attempt.channel,
        attempt.category,
        attempt.toAddress,
        attempt.state,
        attempt.reason,
        attempt.scheduledFor,
        attempt.sentAt,
        attempt.messageId,
        attempt.createdAt,
        attempt.updatedAt,
      ]);
    } catch (error) {
      throw translate(error);
    }
  }
}

function toSchedule(row: ScheduleRow): ReminderSchedule {
  const templateIds = parseJson<Record<string, string> | null>(row.template_ids_json, null);
  return {
    id: row.id,
    institutionId: row.institution_id,
    name: row.name,
    enabled: row.enabled === 1,
    audience: row.audience as ReminderSchedule['audience'],
    category: row.category as ReminderCategory,
    ...(row.escalation_category === null
      ? {}
      : { escalationCategory: row.escalation_category as ReminderCategory }),
    intervals: parseJson<ReminderSchedule['intervals']>(row.intervals_json, []),
    channels: parseJson<ReminderSchedule['channels']>(row.channels_json, []),
    ...(row.locale === null ? {} : { locale: row.locale }),
    quietHours: parseJson<ReminderSchedule['quietHours']>(row.quiet_hours_json, {
      enabled: false,
      start: '00:00',
      end: '00:00',
      timezone: 'UTC',
    }),
    ...(row.catch_up_days === null ? {} : { catchUpDays: row.catch_up_days }),
    ...(row.min_amount_minor === null ? {} : { minAmountMinor: row.min_amount_minor }),
    ...(row.escalate_on_broken_promise === null
      ? {}
      : { escalateOnBrokenPromise: row.escalate_on_broken_promise === 1 }),
    ...(templateIds === null ? {} : { templateIds }),
    ...(row.pay_link_ttl_days === null ? {} : { payLinkTtlDays: row.pay_link_ttl_days }),
  };
}

function toOptOutScope(kind: string, value: string): ReminderOptOutScope {
  switch (kind) {
    case 'all':
      return { kind: 'all' };
    case 'channel':
      return { kind: 'channel', channel: value.replace(/^channel:/, '') as ReminderChannel };
    default:
      return { kind: 'category', category: value.replace(/^category:/, '') as ReminderCategory };
  }
}

function toOptOut(row: OptOutRow): ReminderOptOut {
  return {
    id: row.id,
    institutionId: row.institution_id,
    payerId: row.payer_id,
    scope: toOptOutScope(row.scope_kind, row.scope_value),
    source: row.source === 'staff' ? 'staff' : 'payer',
    ...(row.reason === null ? {} : { reason: row.reason }),
    recordedAt: row.recorded_at,
  };
}

function toPromise(row: PromiseRow): PromiseToPay {
  return {
    id: row.id,
    institutionId: row.institution_id,
    documentKey: row.document_key,
    payerId: row.payer_id,
    amount: fromMinor(row.amount_minor, currencyOf(row.currency, row.id)),
    promisedOn: row.promised_on,
    status: row.status as PromiseStatus,
    ...(row.note === null ? {} : { note: row.note }),
    recordedAt: row.recorded_at,
    resolvedAt: row.resolved_at,
  };
}

function toPayLink(row: PayLinkRow): PayLink {
  return {
    token: row.id,
    institutionId: row.institution_id,
    documentKey: row.document_key,
    payerId: row.payer_id,
    amount: fromMinor(row.amount_minor, currencyOf(row.currency, row.id)),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    signature: row.signature,
    usedAt: row.used_at,
  };
}

function toAttempt(row: AttemptRow): ReminderAttempt {
  return {
    id: row.id,
    institutionId: row.institution_id,
    scheduleId: row.schedule_id,
    documentKey: row.document_key,
    intervalId: row.interval_id,
    payerId: row.payer_id,
    payerName: row.payer_name,
    subjectName: row.subject_name,
    documentNumber: row.document_number,
    dueDate: row.due_date,
    amount: fromMinor(row.amount_minor, currencyOf(row.currency, row.id)),
    channel: row.channel as ReminderChannel,
    category: row.category as ReminderCategory,
    toAddress: row.to_address,
    state: row.state as ReminderAttemptState,
    reason: row.reason,
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at,
    messageId: row.message_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
