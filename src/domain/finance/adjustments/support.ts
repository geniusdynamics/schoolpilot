// ABOUTME: The plumbing the adjustments module shares: a `SqliteAdapter`-shaped handle over the
// ABOUTME: transaction the module already holds, the DDL of the ledger, the sequences and the audit
// ABOUTME: trail, the chart of accounts a write-off posts against, and the module's own
// ABOUTME: audit-trail documents (a write-off, a recovery, a clearance, a credit-note application).

import type { SqliteAdapter, SqliteBindValue, SqliteTransaction } from '@/data/adapters/sqlite';
import { AUDIT_DDL, AUDIT_TABLE, writeAuditEvent } from '@/data/repository';
import { generateUuidv7 } from '@/domain/ids';
import {
  CONTROL_ACCOUNTS,
  LEDGER_DDL,
  createLedgerAccountMapping,
  type LedgerAccount,
  type LedgerAccountMapping,
} from '@/domain/finance/ledger';
import { SEQUENCE_DDL } from '@/domain/sequences';

/** A row of the module's own audit-trail documents. */
interface DocumentRow {
  readonly entity_id: string;
  readonly after: string | null;
  readonly commit_sequence: number;
}

/** The runner a document read needs; the adapter and a transaction both fit. */
export interface DocumentRunner {
  all<T extends object>(sql: string, params?: readonly SqliteBindValue[]): Promise<T[]>;
  get<T extends object>(sql: string, params?: readonly SqliteBindValue[]): Promise<T | null>;
}

/** The entity names the module records its own documents under. */
export const WRITE_OFF_AUDIT_ENTITY = 'write_off';
export const WRITE_OFF_RECOVERY_AUDIT_ENTITY = 'write_off_recovery';
export const CLEARANCE_AUDIT_ENTITY = 'clearance';
export const CREDIT_NOTE_APPLICATION_AUDIT_ENTITY = 'credit_note_application';
export const REFUND_REQUEST_AUDIT_ENTITY = 'refund_request';

/**
 * The account a write-off debits: `5100 Bad debts written off`, an expense.
 *
 * A write-off is not revenue given back; it is a loss. Debiting an expense and crediting the
 * receivable removes the debt from what the school is owed and records the loss in the period it is
 * recognised, which is the double entry spec 05 section 8 asks for.
 */
export const WRITE_OFF_ACCOUNT: LedgerAccount = {
  code: '5100',
  name: 'Bad debts written off',
  kind: 'expense',
};

/**
 * The account a recovery credits: `5101 Bad debts recovered`, an income account.
 *
 * A written-off debt that is later recovered is a new posting, never a reversal: debiting the
 * receivable again and crediting this account reinstates the debt and recognises the recovery, so
 * the write-off and the recovery both stay in the history.
 */
export const RECOVERY_ACCOUNT: LedgerAccount = {
  code: '5101',
  name: 'Bad debts recovered',
  kind: 'revenue',
};

/**
 * A `SqliteAdapter`-shaped handle over the transaction the module already holds.
 *
 * The ledger's and the sequences' stores take an adapter and use only its statement methods plus
 * `transaction`. The module has already opened the one transaction it posts in, so the handle runs
 * the statements on it and runs a nested `transaction` callback directly rather than opening a
 * second one, which the adapter would refuse anyway. The members a real adapter has and a
 * transaction cannot offer are absent, which is why this one cast is here and nowhere else.
 */
export function transactionAdapter(tx: SqliteTransaction): SqliteAdapter {
  const statements = {
    exec: (sql: string) => tx.exec(sql),
    all: (sql: string, params?: readonly SqliteBindValue[]) => tx.all(sql, params),
    get: (sql: string, params?: readonly SqliteBindValue[]) => tx.get(sql, params),
    run: (sql: string, params?: readonly SqliteBindValue[]) => tx.run(sql, params),
    transaction: (work: (inner: SqliteTransaction) => Promise<unknown>) => work(tx),
  };
  return statements as unknown as SqliteAdapter;
}

/**
 * Applies the DDL of the audit trail, the ledger and the sequences through the open transaction.
 *
 * Every statement is `CREATE ... IF NOT EXISTS`, so this is idempotent. The three modules keep their
 * own tables because the canonical registry models neither journal entries nor sequence counters;
 * the module is the seam that makes sure they exist before it posts, the posture the billing run and
 * `useAccountingReports` take.
 */
export async function ensureAdjustmentSchema(runner: {
  exec(sql: string): Promise<void>;
}): Promise<void> {
  for (const statement of [...AUDIT_DDL, ...LEDGER_DDL, ...SEQUENCE_DDL]) {
    await runner.exec(statement);
  }
}

/** The chart of accounts the module posts against: the fee items' own GL mappings plus the two bad-debt accounts. */
export function buildChart(
  feeItemRevenueAccounts: Readonly<Record<string, string>>
): LedgerAccountMapping {
  return createLedgerAccountMapping({
    accounts: [WRITE_OFF_ACCOUNT, RECOVERY_ACCOUNT],
    // The fee item's own revenue account is a code the chart may not hold as a named account, so it
    // is resolved to the account it names rather than looked up. An item with no mapping posts to
    // fee revenue, exactly as the ledger's default does.
    revenueAccountForFeeItem: (feeItemId) => {
      const code = feeItemRevenueAccounts[feeItemId];
      if (code === undefined || code === '') return CONTROL_ACCOUNTS.fee_revenue;
      return { code, name: code, kind: 'revenue' };
    },
  });
}

/** The revenue account code of every fee item, keyed by id, for {@link buildChart}. */
export function revenueAccountsOf(
  feeItems: readonly { readonly id: string; readonly revenue_account_code?: string | undefined }[]
): Record<string, string> {
  const accounts: Record<string, string> = {};
  for (const item of feeItems) {
    const code = item.revenue_account_code?.trim();
    if (code !== undefined && code !== '') accounts[item.id] = code;
  }
  return accounts;
}

/** The next commit sequence of the audit trail, taken inside the write's own transaction. */
export async function nextCommitSequence(runner: DocumentRunner): Promise<number> {
  const row = await runner.get<{ value: number | null }>(
    `SELECT COALESCE(MAX("commit_sequence"), 0) + 1 AS "value" FROM "${AUDIT_TABLE}"`
  );
  return row && Number.isSafeInteger(row.value) ? Number(row.value) : 1;
}

/** Appends one of the module's own documents to the repository's audit trail. */
export async function appendDocument(
  runner: Parameters<typeof writeAuditEvent>[0],
  input: {
    readonly entity: string;
    readonly id: string;
    readonly payload: unknown;
    readonly actorId: string | null;
    readonly reason: string | null;
    readonly createdAt: string;
    readonly commitSequence: number;
    readonly action?: 'create' | 'update';
  }
): Promise<void> {
  await writeAuditEvent(runner, {
    entity: input.entity,
    entityId: input.id,
    action: input.action ?? 'create',
    actorId: input.actorId,
    changedFields: ['document'],
    before: null,
    after: input.payload,
    reason: input.reason,
    createdAt: input.createdAt,
    commitSequence: input.commitSequence,
  });
}

/** Reads the newest state of every document of one entity, keyed by document id. */
export async function readLatestDocuments<T>(
  runner: DocumentRunner,
  entity: string
): Promise<Map<string, T>> {
  const rows = await runner.all<DocumentRow>(
    `SELECT "entity_id", "after", "commit_sequence" FROM "${AUDIT_TABLE}"
       WHERE "entity" = ? ORDER BY "commit_sequence" ASC`,
    [entity]
  );
  const latest = new Map<string, T>();
  for (const row of rows) {
    if (row.after === null) continue;
    try {
      latest.set(row.entity_id, JSON.parse(row.after) as T);
    } catch {
      // A row the module did not write is left out rather than crashing a read.
    }
  }
  return latest;
}

/** Reads one document's newest state, or null. */
export async function readDocument<T>(
  runner: DocumentRunner,
  entity: string,
  id: string
): Promise<T | null> {
  const row = await runner.get<{ after: string | null }>(
    `SELECT "after" FROM "${AUDIT_TABLE}"
       WHERE "entity" = ? AND "entity_id" = ?
       ORDER BY "commit_sequence" DESC LIMIT 1`,
    [entity, id]
  );
  if (row?.after === null || row?.after === undefined) return null;
  try {
    return JSON.parse(row.after) as T;
  } catch {
    return null;
  }
}

/** A fresh document id. */
export function newDocumentId(): string {
  return generateUuidv7();
}

export { CONTROL_ACCOUNTS };
