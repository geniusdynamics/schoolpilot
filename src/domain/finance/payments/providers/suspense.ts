// ABOUTME: The provider suspense queue: money a provider says arrived but which no learner matched.
// ABOUTME: It reuses the reconciliation module's unmatched-money model and the ledger's suspense
// ABOUTME: account (1990) rather than inventing a second one: an unmatched provider payment is the
// ABOUTME: same shape as an unmatched statement line, so it is posted the same way and reversed when
// ABOUTME: it is resolved.

import {
  SqliteAdapterError,
  type SqliteAdapter,
  type SqliteBindValue,
  type SqliteTransaction,
} from '@/data/adapters/sqlite';
import { generateUuidv7 } from '@/domain/ids';
import { fromMinor, isCurrencyCode, type Money } from '@/domain/money';
import {
  RECONCILIATION_ACCOUNTS,
  DEFAULT_SUSPENSE_SOURCE_KIND,
  type SuspensePosting,
} from '@/domain/finance/reconciliation';
import {
  resolveChannelAccount,
  type LedgerAccountMapping,
} from '@/domain/finance/ledger';

import { ProviderError } from './errors';

/** The table holding one row per unmatched provider payment. */
export const PROVIDER_SUSPENSE_TABLE = 'provider_suspense_entry';

/** How many rows a read returns when the caller names no limit. */
export const DEFAULT_PROVIDER_SUSPENSE_LIMIT = 1000;

/** Whether an unmatched provider payment is still waiting or has been resolved to a learner. */
export type ProviderSuspenseStatus = 'open' | 'resolved';

/**
 * One unmatched provider payment.
 *
 * The payload is kept verbatim: an operator resolving it later reads exactly what the provider
 * said, not a summary of it.
 */
export interface ProviderSuspenseEntry {
  readonly id: string;
  readonly institutionId: string;
  readonly providerId: string;
  readonly transactionId: string;
  readonly receipt: string | null;
  readonly amount: Money;
  readonly payerName: string | null;
  readonly payerPhone: string | null;
  /** The account reference the payer quoted — the unrecognised admission number, when there was one. */
  readonly accountReference: string | null;
  /** When the provider says the money moved. */
  readonly occurredAt: string;
  /** The exact payload, as JSON text. */
  readonly payload: string;
  readonly status: ProviderSuspenseStatus;
  /** The suspense journal entry the arrival posted, so resolving it can reverse it. */
  readonly ledgerEntryId: string;
  /** The payment recorded when it was resolved. */
  readonly paymentId: string | null;
  readonly resolvedLearnerId: string | null;
  readonly resolvedAt: string | null;
  readonly resolvedBy: string | null;
  readonly createdAt: string;
}

/** What a caller asks of the queue. */
export interface ProviderSuspenseQuery {
  readonly institutionId?: string;
  readonly providerId?: string;
  readonly status?: ProviderSuspenseStatus;
  readonly limit?: number;
}

/** Where the suspense queue is kept. */
export interface ProviderSuspenseStore {
  insert(entry: ProviderSuspenseEntry): Promise<void>;
  get(id: string): Promise<ProviderSuspenseEntry | null>;
  update(entry: ProviderSuspenseEntry): Promise<void>;
  list(query?: ProviderSuspenseQuery): Promise<readonly ProviderSuspenseEntry[]>;
}

/**
 * The DDL of the provider suspense queue.
 *
 * A canonical migration must apply these statements; `ensureProviderSuspenseSchema` does it and the
 * tests call it. The queue itself is a store, not a second suspense model: the money it holds is
 * posted to the reconciliation module's suspense account through the ledger, exactly as an
 * unmatched statement line is.
 */
export const PROVIDER_SUSPENSE_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "${PROVIDER_SUSPENSE_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "provider_id" TEXT NOT NULL,
     "transaction_id" TEXT NOT NULL,
     "receipt" TEXT,
     "amount_minor" INTEGER NOT NULL,
     "currency" TEXT NOT NULL,
     "payer_name" TEXT,
     "payer_phone" TEXT,
     "account_reference" TEXT,
     "occurred_at" TEXT NOT NULL,
     "payload" TEXT NOT NULL,
     "status" TEXT NOT NULL,
     "ledger_entry_id" TEXT NOT NULL,
     "payment_id" TEXT,
     "resolved_learner_id" TEXT,
     "resolved_at" TEXT,
     "resolved_by" TEXT,
     "created_at" TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "${PROVIDER_SUSPENSE_TABLE}_transaction"
     ON "${PROVIDER_SUSPENSE_TABLE}" ("provider_id", "transaction_id")`,
  `CREATE INDEX IF NOT EXISTS "${PROVIDER_SUSPENSE_TABLE}_open"
     ON "${PROVIDER_SUSPENSE_TABLE}" ("institution_id", "status", "occurred_at")`,
];

/** Applies the provider suspense queue's DDL; safe to call repeatedly. */
export async function ensureProviderSuspenseSchema(adapter: SqliteAdapter): Promise<void> {
  await adapter.transaction(async (tx) => {
    for (const statement of PROVIDER_SUSPENSE_DDL) {
      await tx.exec(statement);
    }
  });
}

/** Builds the SQLite queue over an open adapter. */
export function createSqliteProviderSuspenseStore(adapter: SqliteAdapter): ProviderSuspenseStore {
  return new SqliteProviderSuspenseStore(adapter);
}

interface SuspenseRow {
  readonly id: string;
  readonly institution_id: string;
  readonly provider_id: string;
  readonly transaction_id: string;
  readonly receipt: string | null;
  readonly amount_minor: number;
  readonly currency: string;
  readonly payer_name: string | null;
  readonly payer_phone: string | null;
  readonly account_reference: string | null;
  readonly occurred_at: string;
  readonly payload: string;
  readonly status: string;
  readonly ledger_entry_id: string;
  readonly payment_id: string | null;
  readonly resolved_learner_id: string | null;
  readonly resolved_at: string | null;
  readonly resolved_by: string | null;
  readonly created_at: string;
}

const COLUMNS =
  '"id", "institution_id", "provider_id", "transaction_id", "receipt", "amount_minor", "currency", ' +
  '"payer_name", "payer_phone", "account_reference", "occurred_at", "payload", "status", ' +
  '"ledger_entry_id", "payment_id", "resolved_learner_id", "resolved_at", "resolved_by", "created_at"';

class SqliteProviderSuspenseStore implements ProviderSuspenseStore {
  constructor(private readonly runner: SqliteTransaction) {}

  async insert(entry: ProviderSuspenseEntry): Promise<void> {
    try {
      await this.runner.run(
        `INSERT INTO "${PROVIDER_SUSPENSE_TABLE}" (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        valuesOf(entry)
      );
    } catch (error) {
      throw translate(error);
    }
  }

  async get(id: string): Promise<ProviderSuspenseEntry | null> {
    try {
      const row = await this.runner.get<SuspenseRow>(
        `SELECT ${COLUMNS} FROM "${PROVIDER_SUSPENSE_TABLE}" WHERE "id" = ? LIMIT 1`,
        [id]
      );
      return row ? toEntry(row) : null;
    } catch (error) {
      throw translate(error);
    }
  }

  async update(entry: ProviderSuspenseEntry): Promise<void> {
    try {
      await this.runner.run(
        `UPDATE "${PROVIDER_SUSPENSE_TABLE}" SET
           "status" = ?, "payment_id" = ?, "resolved_learner_id" = ?, "resolved_at" = ?, "resolved_by" = ?
         WHERE "id" = ?`,
        [
          entry.status,
          entry.paymentId,
          entry.resolvedLearnerId,
          entry.resolvedAt,
          entry.resolvedBy,
          entry.id,
        ]
      );
    } catch (error) {
      throw translate(error);
    }
  }

  async list(query: ProviderSuspenseQuery = {}): Promise<readonly ProviderSuspenseEntry[]> {
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
    if (query.status !== undefined) {
      clauses.push('"status" = ?');
      params.push(query.status);
    }
    const limit = clampLimit(query.limit);
    try {
      const rows = await this.runner.all<SuspenseRow>(
        `SELECT ${COLUMNS} FROM "${PROVIDER_SUSPENSE_TABLE}"
           ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
           ORDER BY "occurred_at", "id" LIMIT ?`,
        [...params, limit]
      );
      return rows.map(toEntry);
    } catch (error) {
      throw translate(error);
    }
  }
}

/** The in-memory queue: the double a caller without a database uses. */
export function createMemoryProviderSuspenseStore(
  seed: readonly ProviderSuspenseEntry[] = []
): ProviderSuspenseStore {
  const rows = new Map<string, ProviderSuspenseEntry>(seed.map((entry) => [entry.id, entry]));
  return {
    async insert(entry: ProviderSuspenseEntry): Promise<void> {
      if ([...rows.values()].some(
        (row) => row.providerId === entry.providerId && row.transactionId === entry.transactionId
      )) {
        throw new ProviderError(
          'storage',
          `suspense entry for ${entry.providerId}:${entry.transactionId} already exists`,
          { detail: { transactionId: entry.transactionId } }
        );
      }
      rows.set(entry.id, entry);
    },
    async get(id: string): Promise<ProviderSuspenseEntry | null> {
      return rows.get(id) ?? null;
    },
    async update(entry: ProviderSuspenseEntry): Promise<void> {
      if (!rows.has(entry.id)) {
        throw new ProviderError('not_found', `suspense entry ${entry.id} does not exist`, {
          detail: { id: entry.id },
        });
      }
      rows.set(entry.id, entry);
    },
    async list(query: ProviderSuspenseQuery = {}): Promise<readonly ProviderSuspenseEntry[]> {
      return [...rows.values()]
        .filter(
          (row) =>
            (query.institutionId === undefined || row.institutionId === query.institutionId) &&
            (query.providerId === undefined || row.providerId === query.providerId) &&
            (query.status === undefined || row.status === query.status)
        )
        .slice(0, clampLimit(query.limit));
    },
  };
}

/** A new suspense entry, with its id and its creation stamp filled in. */
export function newProviderSuspenseEntry(
  input: Omit<ProviderSuspenseEntry, 'id' | 'status' | 'paymentId' | 'resolvedLearnerId' | 'resolvedAt' | 'resolvedBy' | 'createdAt'>,
  at: string
): ProviderSuspenseEntry {
  return {
    ...input,
    id: generateUuidv7(),
    status: 'open',
    paymentId: null,
    resolvedLearnerId: null,
    resolvedAt: null,
    resolvedBy: null,
    createdAt: at,
  };
}

/**
 * The balanced suspense entry an unmatched provider payment posts.
 *
 * The arrival is money the provider moved and the books do not carry as a payment, which is the
 * same shape as the reconciliation module's unmatched statement line: it debits the channel the
 * money landed in and credits the suspense account, so the money is on the books as a liability
 * the school owes back until someone says whose it is.
 *
 * The reconciliation module's own `deriveSuspensePosting` nets a whole account over a day and
 * keys its entry `recon-suspense:<account>:<day>`, which is right for a period-end reconciliation
 * and wrong for a queue that files one arrival at a time: two arrivals on one day would collide on
 * that document id. This function therefore builds the same balanced shape and hands it to the
 * module's own `createLedgerSuspensePoster`, keyed by the entry instead.
 */
export function suspensePostingFor(
  entry: ProviderSuspenseEntry,
  mapping: LedgerAccountMapping
): SuspensePosting {
  const channel = resolveChannelAccount(mapping, 'mobile_money');
  const suspense = mapping.account(RECONCILIATION_ACCOUNTS.suspense.code) ?? RECONCILIATION_ACCOUNTS.suspense;
  const amount = entry.amount;
  return {
    institutionId: entry.institutionId,
    entryDate: entry.occurredAt.slice(0, 10),
    narration: `Unmatched ${entry.providerId} payment ${entry.receipt ?? entry.transactionId} held in suspense`,
    sourceKind: DEFAULT_SUSPENSE_SOURCE_KIND,
    sourceId: `provider-suspense:${entry.id}`,
    lines: [
      {
        accountCode: channel.code,
        accountName: channel.name,
        debit: amount,
        memo: `${entry.providerId} payment ${entry.receipt ?? entry.transactionId} awaiting a learner`,
      },
      {
        accountCode: suspense.code,
        accountName: suspense.name,
        credit: amount,
        memo: `unrecognised reference ${entry.accountReference ?? '(none quoted)'}`,
      },
    ],
    difference: amount,
    accountCode: channel.code,
  };
}

function valuesOf(entry: ProviderSuspenseEntry): SqliteBindValue[] {
  return [
    entry.id,
    entry.institutionId,
    entry.providerId,
    entry.transactionId,
    entry.receipt,
    entry.amount.amount_minor,
    entry.amount.currency,
    entry.payerName,
    entry.payerPhone,
    entry.accountReference,
    entry.occurredAt,
    entry.payload,
    entry.status,
    entry.ledgerEntryId,
    entry.paymentId,
    entry.resolvedLearnerId,
    entry.resolvedAt,
    entry.resolvedBy,
    entry.createdAt,
  ];
}

function toEntry(row: SuspenseRow): ProviderSuspenseEntry {
  if (!isCurrencyCode(row.currency)) {
    throw new ProviderError(
      'storage',
      `suspense entry ${row.id} is counted in "${row.currency}", which is not a currency of the table`,
      { detail: { id: row.id, currency: row.currency } }
    );
  }
  return {
    id: row.id,
    institutionId: row.institution_id,
    providerId: row.provider_id,
    transactionId: row.transaction_id,
    receipt: row.receipt,
    amount: fromMinor(row.amount_minor, row.currency),
    payerName: row.payer_name,
    payerPhone: row.payer_phone,
    accountReference: row.account_reference,
    occurredAt: row.occurred_at,
    payload: row.payload,
    status: row.status as ProviderSuspenseStatus,
    ledgerEntryId: row.ledger_entry_id,
    paymentId: row.payment_id,
    resolvedLearnerId: row.resolved_learner_id,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    createdAt: row.created_at,
  };
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_PROVIDER_SUSPENSE_LIMIT;
  if (!Number.isSafeInteger(limit) || limit < 1) return DEFAULT_PROVIDER_SUSPENSE_LIMIT;
  return Math.min(limit, 10_000);
}

/** Turns a database failure into the seam's own error. */
function translate(error: unknown): Error {
  if (error instanceof ProviderError) return error;
  if (error instanceof SqliteAdapterError) {
    return new ProviderError('storage', error.message, {
      cause: error,
      detail: { code: error.code, constraint: error.constraint },
    });
  }
  return error instanceof Error ? error : new Error(String(error));
}
