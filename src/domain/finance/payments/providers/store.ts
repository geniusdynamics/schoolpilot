// ABOUTME: The provider event ledger: one row per charge, notification or refund the provider
// ABOUTME: seam has seen, keyed by the provider's transaction id, so an identical delivery writes
// ABOUTME: nothing twice. The DDL's unique indexes are the idempotency invariants expressed in the
// ABOUTME: database, the way the reconciliation module's dedupe index is.

import {
  SqliteAdapterError,
  type SqliteAdapter,
  type SqliteBindValue,
  type SqliteTransaction,
} from '@/data/adapters/sqlite';
import { generateUuidv7 } from '@/domain/ids';
import { fingerprintOf } from '@/domain/finance/reconciliation';

import { ProviderError } from './errors';

/** The table holding one row per charge, notification or refund. */
export const PROVIDER_EVENT_TABLE = 'provider_payment_event';

/** How many rows a read returns when the caller names no limit. */
export const DEFAULT_PROVIDER_EVENT_LIMIT = 1000;

/** Where a provider event has got to. */
export type ProviderEventOutcome =
  /** A charge was initiated and the provider has not been heard from. */
  | 'pending'
  /** A validation callback was accepted; no money has moved yet. */
  | 'validated'
  /** A payment was recorded and posted against a learner. */
  | 'matched'
  /** The money arrived but no learner matched; it is held in suspense. */
  | 'suspense'
  /** A refund was paid. */
  | 'refunded'
  /** The provider reported a failure. */
  | 'failed'
  /** The seam refused the notification (an amount that does not match what was charged). */
  | 'refused';

/** What kind of provider event a row records. */
export type ProviderEventKind = 'charge' | 'notification' | 'refund';

/** One row of the provider event ledger. */
export interface ProviderEventRecord {
  readonly id: string;
  readonly institutionId: string;
  readonly providerId: string;
  /** The idempotency key: `<providerId>:<transactionId>`. */
  readonly idempotencyKey: string;
  /** The provider's transaction id, on its own. */
  readonly transactionId: string;
  readonly receipt: string | null;
  readonly kind: ProviderEventKind;
  /** The hash of the payload: a repeat of the same delivery, as opposed to a status update. */
  readonly payloadFingerprint: string;
  /** The exact payload, as JSON text. */
  readonly payload: string;
  readonly outcome: ProviderEventOutcome;
  readonly amountMinor: number | null;
  readonly currency: string | null;
  /** The account reference the payer quoted, when the payload carries one. */
  readonly accountReference: string | null;
  readonly learnerId: string | null;
  readonly paymentId: string | null;
  readonly refundId: string | null;
  readonly ledgerEntryId: string | null;
  readonly suspenseEntryId: string | null;
  /** The provider's own words, for a failure or a refusal. */
  readonly message: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** What a caller asks of the ledger. */
export interface ProviderEventQuery {
  readonly institutionId?: string;
  readonly providerId?: string;
  readonly transactionId?: string;
  readonly outcome?: ProviderEventOutcome;
  readonly limit?: number;
}

/**
 * Where the provider event ledger is kept.
 *
 * The seam writes one row per event and reads it back by its idempotency key: that read is the
 * duplicate check, and the unique index behind it is the invariant that holds when two deliveries
 * race.
 */
export interface ProviderEventStore {
  findByIdempotencyKey(key: string): Promise<ProviderEventRecord | null>;
  /** The row a provider receipt was first seen under, when it was. */
  findByReceipt(providerId: string, receipt: string): Promise<ProviderEventRecord | null>;
  insert(record: ProviderEventRecord): Promise<void>;
  update(record: ProviderEventRecord): Promise<void>;
  get(id: string): Promise<ProviderEventRecord | null>;
  list(query?: ProviderEventQuery): Promise<readonly ProviderEventRecord[]>;
}

/**
 * The DDL of the provider event ledger.
 *
 * A canonical migration must apply these statements; `ensureProviderEventSchema` does it and the
 * tests call it. The unique index on `idempotency_key` is the idempotency of a webhook: the same
 * delivery cannot be written twice. The partial unique index on `(provider_id, receipt)` is the
 * second invariant: one payment per provider receipt, so a re-sent transaction under a new request
 * id is still one payment.
 */
export const PROVIDER_EVENT_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "${PROVIDER_EVENT_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "provider_id" TEXT NOT NULL,
     "idempotency_key" TEXT NOT NULL,
     "transaction_id" TEXT NOT NULL,
     "receipt" TEXT,
     "kind" TEXT NOT NULL,
     "payload_fingerprint" TEXT NOT NULL,
     "payload" TEXT NOT NULL,
     "outcome" TEXT NOT NULL,
     "amount_minor" INTEGER,
     "currency" TEXT,
     "account_reference" TEXT,
     "learner_id" TEXT,
     "payment_id" TEXT,
     "refund_id" TEXT,
     "ledger_entry_id" TEXT,
     "suspense_entry_id" TEXT,
     "message" TEXT,
     "created_at" TEXT NOT NULL,
     "updated_at" TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${PROVIDER_EVENT_TABLE}_key"
     ON "${PROVIDER_EVENT_TABLE}" ("idempotency_key")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${PROVIDER_EVENT_TABLE}_receipt"
     ON "${PROVIDER_EVENT_TABLE}" ("provider_id", "receipt") WHERE "receipt" IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "${PROVIDER_EVENT_TABLE}_transaction"
     ON "${PROVIDER_EVENT_TABLE}" ("provider_id", "transaction_id")`,
  `CREATE INDEX IF NOT EXISTS "${PROVIDER_EVENT_TABLE}_institution"
     ON "${PROVIDER_EVENT_TABLE}" ("institution_id", "updated_at")`,
];

/** Applies the provider event ledger's DDL; safe to call repeatedly. */
export async function ensureProviderEventSchema(adapter: SqliteAdapter): Promise<void> {
  await adapter.transaction(async (tx) => {
    for (const statement of PROVIDER_EVENT_DDL) {
      await tx.exec(statement);
    }
  });
}

/** Builds the SQLite store over an open adapter. */
export function createSqliteProviderEventStore(adapter: SqliteAdapter): ProviderEventStore {
  return new SqliteProviderEventStore(adapter);
}

interface EventRow {
  readonly id: string;
  readonly institution_id: string;
  readonly provider_id: string;
  readonly idempotency_key: string;
  readonly transaction_id: string;
  readonly receipt: string | null;
  readonly kind: string;
  readonly payload_fingerprint: string;
  readonly payload: string;
  readonly outcome: string;
  readonly amount_minor: number | null;
  readonly currency: string | null;
  readonly account_reference: string | null;
  readonly learner_id: string | null;
  readonly payment_id: string | null;
  readonly refund_id: string | null;
  readonly ledger_entry_id: string | null;
  readonly suspense_entry_id: string | null;
  readonly message: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

const COLUMNS =
  '"id", "institution_id", "provider_id", "idempotency_key", "transaction_id", "receipt", "kind", ' +
  '"payload_fingerprint", "payload", "outcome", "amount_minor", "currency", "account_reference", ' +
  '"learner_id", "payment_id", "refund_id", "ledger_entry_id", "suspense_entry_id", "message", ' +
  '"created_at", "updated_at"';

class SqliteProviderEventStore implements ProviderEventStore {
  constructor(private readonly runner: SqliteTransaction) {}

  async findByIdempotencyKey(key: string): Promise<ProviderEventRecord | null> {
    return this.one('"idempotency_key" = ?', [key]);
  }

  async findByReceipt(providerId: string, receipt: string): Promise<ProviderEventRecord | null> {
    return this.one('"provider_id" = ? AND "receipt" = ?', [providerId, receipt]);
  }

  async get(id: string): Promise<ProviderEventRecord | null> {
    return this.one('"id" = ?', [id]);
  }

  async insert(record: ProviderEventRecord): Promise<void> {
    try {
      await this.runner.run(
        `INSERT INTO "${PROVIDER_EVENT_TABLE}" (${COLUMNS})
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        valuesOf(record)
      );
    } catch (error) {
      throw translate(error);
    }
  }

  async update(record: ProviderEventRecord): Promise<void> {
    try {
      await this.runner.run(
        `UPDATE "${PROVIDER_EVENT_TABLE}" SET
           "receipt" = ?, "kind" = ?, "payload_fingerprint" = ?, "payload" = ?, "outcome" = ?,
           "amount_minor" = ?, "currency" = ?, "account_reference" = ?, "learner_id" = ?,
           "payment_id" = ?, "refund_id" = ?, "ledger_entry_id" = ?, "suspense_entry_id" = ?,
           "message" = ?, "updated_at" = ?
         WHERE "id" = ?`,
        [
          record.receipt,
          record.kind,
          record.payloadFingerprint,
          record.payload,
          record.outcome,
          record.amountMinor,
          record.currency,
          record.accountReference,
          record.learnerId,
          record.paymentId,
          record.refundId,
          record.ledgerEntryId,
          record.suspenseEntryId,
          record.message,
          record.updatedAt,
          record.id,
        ]
      );
    } catch (error) {
      throw translate(error);
    }
  }

  async list(query: ProviderEventQuery = {}): Promise<readonly ProviderEventRecord[]> {
    const clauses: string[] = [];
    const params: SqliteBindValue[] = [];
    if (query.institutionId !== undefined) {
      clauses.push('"institution_id" = ?');
      params.push(query.institutionId);
    }
    if (query.providerId !== undefined) {
      clauses.push('"provider_id" = ?');
      params.push(query.providerId);
    }
    if (query.transactionId !== undefined) {
      clauses.push('"transaction_id" = ?');
      params.push(query.transactionId);
    }
    if (query.outcome !== undefined) {
      clauses.push('"outcome" = ?');
      params.push(query.outcome);
    }
    const limit = clampLimit(query.limit);
    try {
      const rows = await this.runner.all<EventRow>(
        `SELECT ${COLUMNS} FROM "${PROVIDER_EVENT_TABLE}"
           ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
           ORDER BY "created_at", "id" LIMIT ?`,
        [...params, limit]
      );
      return rows.map(toRecord);
    } catch (error) {
      throw translate(error);
    }
  }

  private async one(
    condition: string,
    params: readonly SqliteBindValue[]
  ): Promise<ProviderEventRecord | null> {
    try {
      const row = await this.runner.get<EventRow>(
        `SELECT ${COLUMNS} FROM "${PROVIDER_EVENT_TABLE}" WHERE ${condition} LIMIT 1`,
        params
      );
      return row ? toRecord(row) : null;
    } catch (error) {
      throw translate(error);
    }
  }
}

/**
 * The in-memory ledger: the double a caller without a database uses.
 *
 * It enforces the same two uniqueness invariants the DDL does, so a test that proves a duplicate
 * collapses against the double proves it against the shape the database enforces too.
 */
export function createMemoryProviderEventStore(
  seed: readonly ProviderEventRecord[] = []
): ProviderEventStore {
  const rows = new Map<string, ProviderEventRecord>();
  for (const record of seed) rows.set(record.id, record);
  return {
    async findByIdempotencyKey(key: string): Promise<ProviderEventRecord | null> {
      return [...rows.values()].find((row) => row.idempotencyKey === key) ?? null;
    },
    async findByReceipt(providerId: string, receipt: string): Promise<ProviderEventRecord | null> {
      return (
        [...rows.values()].find(
          (row) => row.providerId === providerId && row.receipt === receipt
        ) ?? null
      );
    },
    async get(id: string): Promise<ProviderEventRecord | null> {
      return rows.get(id) ?? null;
    },
    async insert(record: ProviderEventRecord): Promise<void> {
      if ([...rows.values()].some((row) => row.idempotencyKey === record.idempotencyKey)) {
        throw new ProviderError(
          'storage',
          `the idempotency key ${record.idempotencyKey} is already recorded`,
          { detail: { idempotencyKey: record.idempotencyKey } }
        );
      }
      if (
        record.receipt !== null &&
        [...rows.values()].some(
          (row) => row.providerId === record.providerId && row.receipt === record.receipt
        )
      ) {
        throw new ProviderError(
          'duplicate_receipt',
          `receipt ${record.receipt} is already recorded for ${record.providerId}`,
          { detail: { receipt: record.receipt } }
        );
      }
      rows.set(record.id, record);
    },
    async update(record: ProviderEventRecord): Promise<void> {
      if (!rows.has(record.id)) {
        throw new ProviderError('not_found', `provider event ${record.id} does not exist`, {
          detail: { id: record.id },
        });
      }
      rows.set(record.id, record);
    },
    async list(query: ProviderEventQuery = {}): Promise<readonly ProviderEventRecord[]> {
      return [...rows.values()]
        .filter(
          (row) =>
            (query.institutionId === undefined || row.institutionId === query.institutionId) &&
            (query.providerId === undefined || row.providerId === query.providerId) &&
            (query.transactionId === undefined || row.transactionId === query.transactionId) &&
            (query.outcome === undefined || row.outcome === query.outcome)
        )
        .slice(0, clampLimit(query.limit));
    },
  };
}

/** A new event row, with the id and the two timestamps filled in. */
export function newProviderEvent(
  input: Omit<ProviderEventRecord, 'id' | 'createdAt' | 'updatedAt'>,
  at: string
): ProviderEventRecord {
  return { ...input, id: generateUuidv7(), createdAt: at, updatedAt: at };
}

/**
 * The fingerprint of a payload: the stable hash that tells a repeat of the same delivery from a
 * status update.
 *
 * Objects are serialised with their keys sorted, so two deliveries that differ only in key order
 * hash the same and collapse. The hash itself is the reconciliation module's `fingerprintOf`, so
 * the codebase holds one fingerprinting rule rather than two.
 */
export function fingerprintPayload(raw: unknown): string {
  return fingerprintOf([stableJson(raw)]);
}

/**
 * The fingerprint of an event: what it is, and what it carried.
 *
 * The kind is part of the hash because M-Pesa's C2B validation and confirmation callbacks are
 * byte-identical and are told apart only by the URL they arrive on. Without the kind, the
 * confirmation would look like a second delivery of the validation and the payment would never be
 * recorded; with it, the confirmation is a status update of the same transaction, which is what it
 * is. An identical re-delivery still carries the same kind and the same body, so it still collapses.
 */
export function fingerprintOfEvent(kind: string, raw: unknown): string {
  return fingerprintPayload({ kind, raw });
}

/** A JSON text of a value with object keys sorted, so the same value always writes the same text. */
export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
}

function valuesOf(record: ProviderEventRecord): SqliteBindValue[] {
  return [
    record.id,
    record.institutionId,
    record.providerId,
    record.idempotencyKey,
    record.transactionId,
    record.receipt,
    record.kind,
    record.payloadFingerprint,
    record.payload,
    record.outcome,
    record.amountMinor,
    record.currency,
    record.accountReference,
    record.learnerId,
    record.paymentId,
    record.refundId,
    record.ledgerEntryId,
    record.suspenseEntryId,
    record.message,
    record.createdAt,
    record.updatedAt,
  ];
}

function toRecord(row: EventRow): ProviderEventRecord {
  return {
    id: row.id,
    institutionId: row.institution_id,
    providerId: row.provider_id,
    idempotencyKey: row.idempotency_key,
    transactionId: row.transaction_id,
    receipt: row.receipt,
    kind: row.kind as ProviderEventKind,
    payloadFingerprint: row.payload_fingerprint,
    payload: row.payload,
    outcome: row.outcome as ProviderEventOutcome,
    amountMinor: row.amount_minor,
    currency: row.currency,
    accountReference: row.account_reference,
    learnerId: row.learner_id,
    paymentId: row.payment_id,
    refundId: row.refund_id,
    ledgerEntryId: row.ledger_entry_id,
    suspenseEntryId: row.suspense_entry_id,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_PROVIDER_EVENT_LIMIT;
  if (!Number.isSafeInteger(limit) || limit < 1) return DEFAULT_PROVIDER_EVENT_LIMIT;
  return Math.min(limit, 10_000);
}

/** Turns a database failure into the seam's own error. */
function translate(error: unknown): Error {
  if (error instanceof ProviderError) return error;
  if (error instanceof SqliteAdapterError) {
    const message = error.message;
    if (/idempotency_key|_key/.test(message)) {
      return new ProviderError(
        'storage',
        `this delivery is already recorded; a webhook is written once: ${message}`,
        { cause: error, detail: { constraint: error.constraint } }
      );
    }
    if (/receipt/.test(message)) {
      return new ProviderError(
        'duplicate_receipt',
        `a receipt number is paid once: ${message}`,
        { cause: error, detail: { constraint: error.constraint } }
      );
    }
    return new ProviderError('storage', message, {
      cause: error,
      detail: { code: error.code, constraint: error.constraint },
    });
  }
  return error instanceof Error ? error : new Error(String(error));
}
