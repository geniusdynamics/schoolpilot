// ABOUTME: The store subscriptions are written to: the DDL of the subscription table, the port the
// ABOUTME: service codes against, and the SQLite implementation that reads and writes it. The table
// ABOUTME: is a module table, declared here like the ledger's and reconciliation's own.

import {
  SqliteAdapterError,
  type SqliteAdapter,
  type SqliteBindValue,
  type SqliteTransaction,
} from '@/data/adapters/sqlite';
import { asId } from '@/domain/ids';
import { PRORATION_RULES } from '@/domain/schema';

import { SubscriptionError } from './errors';
import {
  SUBSCRIPTION_SERVICE_KINDS,
  type Subscription,
  type SubscriptionQuery,
  type SubscriptionServiceKind,
  type SubscriptionStatus,
  type SubscriptionStore,
} from './types';

/** The table holding one row per subscription. */
export const SUBSCRIPTION_TABLE = 'subscription';

const SERVICE_KINDS: readonly string[] = SUBSCRIPTION_SERVICE_KINDS;
const STATUSES: readonly string[] = ['active', 'cancelled'];

/**
 * The DDL of the subscription table.
 *
 * A canonical migration must apply these statements; `ensureSubscriptionSchema` does it, and the
 * tests call it. The table carries no amount: a subscription is priced from the fee schedule it
 * names, so there is no second number to drift. The index the billing run reads is
 * `(institution_id, learner_id, status)`, which is exactly the query a run makes per learner.
 */
export const SUBSCRIPTION_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "${SUBSCRIPTION_TABLE}" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "institution_id" TEXT NOT NULL,
     "learner_id" TEXT NOT NULL,
     "service_kind" TEXT NOT NULL,
     "service_ref" TEXT,
     "fee_item_id" TEXT NOT NULL,
     "fee_schedule_id" TEXT NOT NULL,
     "academic_period_id" TEXT,
     "starts_on" TEXT NOT NULL,
     "ends_on" TEXT,
     "proration_rule" TEXT NOT NULL,
     "status" TEXT NOT NULL,
     "cancelled_on" TEXT,
     "cancellation_reason" TEXT,
     "created_at" TEXT NOT NULL,
     "updated_at" TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS "${SUBSCRIPTION_TABLE}_learner"
     ON "${SUBSCRIPTION_TABLE}" ("institution_id", "learner_id", "status")`,
  `CREATE INDEX IF NOT EXISTS "${SUBSCRIPTION_TABLE}_item"
     ON "${SUBSCRIPTION_TABLE}" ("institution_id", "fee_item_id")`,
  `CREATE INDEX IF NOT EXISTS "${SUBSCRIPTION_TABLE}_schedule"
     ON "${SUBSCRIPTION_TABLE}" ("fee_schedule_id")`,
];

/** Applies the subscription DDL; safe to call repeatedly. */
export async function ensureSubscriptionSchema(adapter: SqliteAdapter): Promise<void> {
  await adapter.transaction(async (tx) => {
    for (const statement of SUBSCRIPTION_DDL) {
      await tx.exec(statement);
    }
  });
}

/** Builds the SQLite store over an open adapter. */
export function createSqliteSubscriptionStore(adapter: SqliteAdapter): SubscriptionStore {
  return new SqliteSubscriptionStore(adapter);
}

interface SubscriptionRow {
  readonly id: string;
  readonly institution_id: string;
  readonly learner_id: string;
  readonly service_kind: string;
  readonly service_ref: string | null;
  readonly fee_item_id: string;
  readonly fee_schedule_id: string;
  readonly academic_period_id: string | null;
  readonly starts_on: string;
  readonly ends_on: string | null;
  readonly proration_rule: string;
  readonly status: string;
  readonly cancelled_on: string | null;
  readonly cancellation_reason: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

const COLUMNS = [
  'id',
  'institution_id',
  'learner_id',
  'service_kind',
  'service_ref',
  'fee_item_id',
  'fee_schedule_id',
  'academic_period_id',
  'starts_on',
  'ends_on',
  'proration_rule',
  'status',
  'cancelled_on',
  'cancellation_reason',
  'created_at',
  'updated_at',
] as const;

const SELECT = COLUMNS.map((column) => `"${column}"`).join(', ');

const INSERT_SQL = `INSERT INTO "${SUBSCRIPTION_TABLE}" (${SELECT})
  VALUES (${COLUMNS.map(() => '?').join(', ')})`;

const UPDATE_SQL = `UPDATE "${SUBSCRIPTION_TABLE}"
  SET "service_kind" = ?, "service_ref" = ?, "fee_item_id" = ?, "fee_schedule_id" = ?,
      "academic_period_id" = ?, "starts_on" = ?, "ends_on" = ?, "proration_rule" = ?,
      "status" = ?, "cancelled_on" = ?, "cancellation_reason" = ?, "updated_at" = ?
  WHERE "id" = ?`;

class SqliteSubscriptionStore implements SubscriptionStore {
  constructor(private readonly runner: SqliteTransaction) {}

  async insert(subscription: Subscription): Promise<void> {
    try {
      await this.runner.run(INSERT_SQL, insertValues(subscription));
    } catch (error) {
      throw translate(error);
    }
  }

  async get(id: string): Promise<Subscription | null> {
    try {
      const row = await this.runner.get<SubscriptionRow>(
        `SELECT ${SELECT} FROM "${SUBSCRIPTION_TABLE}" WHERE "id" = ?`,
        [id]
      );
      return row ? toSubscription(row) : null;
    } catch (error) {
      throw translate(error);
    }
  }

  async list(query: SubscriptionQuery): Promise<readonly Subscription[]> {
    const clauses: string[] = [];
    const params: SqliteBindValue[] = [];
    if (query.institutionId !== undefined) {
      clauses.push('"institution_id" = ?');
      params.push(query.institutionId);
    }
    if (query.learnerId !== undefined) {
      clauses.push('"learner_id" = ?');
      params.push(query.learnerId);
    }
    if (query.status !== undefined) {
      clauses.push('"status" = ?');
      params.push(query.status);
    }
    if (query.serviceKind !== undefined) {
      clauses.push('"service_kind" = ?');
      params.push(query.serviceKind);
    }
    if (query.feeScheduleId !== undefined) {
      clauses.push('"fee_schedule_id" = ?');
      params.push(query.feeScheduleId);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    try {
      const rows = await this.runner.all<SubscriptionRow>(
        `SELECT ${SELECT} FROM "${SUBSCRIPTION_TABLE}" ${where}
           ORDER BY "starts_on", "id"`,
        params
      );
      return rows.map(toSubscription);
    } catch (error) {
      throw translate(error);
    }
  }

  async update(subscription: Subscription): Promise<void> {
    try {
      await this.runner.run(UPDATE_SQL, [
        subscription.serviceKind,
        subscription.serviceRef,
        subscription.feeItemId,
        subscription.feeScheduleId,
        subscription.academicPeriodId,
        subscription.startsOn,
        subscription.endsOn,
        subscription.prorationRule,
        subscription.status,
        subscription.cancelledOn,
        subscription.cancellationReason,
        subscription.updatedAt,
        subscription.id,
      ]);
    } catch (error) {
      throw translate(error);
    }
  }
}

function insertValues(subscription: Subscription): SqliteBindValue[] {
  return [
    subscription.id,
    subscription.institutionId,
    subscription.learnerId,
    subscription.serviceKind,
    subscription.serviceRef,
    subscription.feeItemId,
    subscription.feeScheduleId,
    subscription.academicPeriodId,
    subscription.startsOn,
    subscription.endsOn,
    subscription.prorationRule,
    subscription.status,
    subscription.cancelledOn,
    subscription.cancellationReason,
    subscription.createdAt,
    subscription.updatedAt,
  ];
}

function toSubscription(row: SubscriptionRow): Subscription {
  if (!SERVICE_KINDS.includes(row.service_kind)) {
    throw new SubscriptionError(
      'storage',
      `subscription ${row.id} names the unknown service kind "${row.service_kind}"`
    );
  }
  if (!STATUSES.includes(row.status)) {
    throw new SubscriptionError(
      'storage',
      `subscription ${row.id} holds the unknown status "${row.status}"`
    );
  }
  if (!PRORATION_RULES.includes(row.proration_rule as (typeof PRORATION_RULES)[number])) {
    throw new SubscriptionError(
      'storage',
      `subscription ${row.id} names the unknown proration rule "${row.proration_rule}"`
    );
  }
  return {
    id: row.id,
    institutionId: asId<'institution'>(row.institution_id),
    learnerId: asId<'learner'>(row.learner_id),
    serviceKind: row.service_kind as SubscriptionServiceKind,
    serviceRef: row.service_ref,
    feeItemId: asId<'fee_item'>(row.fee_item_id),
    feeScheduleId: asId<'fee_schedule'>(row.fee_schedule_id),
    academicPeriodId: row.academic_period_id
      ? asId<'academic_period'>(row.academic_period_id)
      : null,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    prorationRule: row.proration_rule as Subscription['prorationRule'],
    status: row.status as SubscriptionStatus,
    cancelledOn: row.cancelled_on,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function translate(error: unknown): Error {
  if (error instanceof SubscriptionError) return error;
  if (error instanceof SqliteAdapterError) {
    return new SubscriptionError('storage', error.message, { cause: error });
  }
  return error instanceof Error ? error : new SubscriptionError('storage', String(error));
}
