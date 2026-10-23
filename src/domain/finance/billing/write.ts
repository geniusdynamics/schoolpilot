// ABOUTME: The writes of a billing run, all inside the one transaction the run opened: the invoices
// ABOUTME: and their lines through the canonical repository, the journal entries through the ledger,
// ABOUTME: the numbers through the sequences module, and the run identity in the audit trail.

import type { SqliteAdapter, SqliteBindValue, SqliteTransaction } from '@/data/adapters/sqlite';
import { AUDIT_DDL, AUDIT_TABLE, writeAuditEvent } from '@/data/repository';
import { generateUuidv7 } from '@/domain/ids';
import { add, isZero, zero, type CurrencyCode, type Money } from '@/domain/money';
import {
  CONTROL_ACCOUNTS,
  LEDGER_DDL,
  LedgerService,
  createLedgerAccountMapping,
  createSqliteLedgerStore,
  type LedgerAccount,
} from '@/domain/finance/ledger';
import { SEQUENCE_DDL, SequenceService, createSqliteSequenceStore } from '@/domain/sequences';

import { BillingError } from './errors';
import type { RunFacts } from './facts';
import type { PlannedItem, PlannedLearner } from './plan';
import type { BillingRunStore, PostedBillingRun, SchedulePin } from './types';

/** The entity name a posted run is recorded under in the audit trail. */
export const BILLING_RUN_AUDIT_ENTITY = 'billing_run';

/**
 * A `SqliteAdapter`-shaped handle over the transaction the run already holds.
 *
 * The ledger's and the sequences' stores take an adapter and use only its statement methods plus
 * `transaction`. The run has already opened the one transaction it posts in, so the handle runs the
 * statements on it and runs a nested `transaction` callback directly rather than opening a second
 * one, which the adapter would refuse anyway. The members a real adapter has and a transaction
 * cannot offer — `driverName`, `isOpen`, `open`, `close`, `applySchema` — are absent, which is why
 * this one cast is here and nowhere else.
 */
function transactionAdapter(tx: SqliteTransaction): SqliteAdapter {
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
 * Applies the DDL of the ledger, the sequences and the audit trail through the run's transaction.
 *
 * Every statement is `CREATE ... IF NOT EXISTS`, so this is idempotent and safe on a database that
 * already has them. The three modules keep their own tables because the canonical registry does not
 * model journal entries or sequence counters yet; the billing run is the seam that makes sure they
 * exist before it posts, the same posture `useAccountingReports` takes for the ledger.
 */
export async function ensureRunSchema(tx: SqliteTransaction): Promise<void> {
  for (const statement of [...AUDIT_DDL, ...LEDGER_DDL, ...SEQUENCE_DDL]) {
    await tx.exec(statement);
  }
}

/** The chart of accounts the run posts against: the fee items' own GL mappings. */
export function chartFor(facts: RunFacts) {
  const revenueCodeByItem = new Map<string, string>();
  for (const item of facts.feeItems.values()) {
    const code = item.revenue_account_code;
    if (code !== undefined && code.trim() !== '') revenueCodeByItem.set(item.id, code.trim());
  }
  const fallback: LedgerAccount = CONTROL_ACCOUNTS.fee_revenue;
  return createLedgerAccountMapping({
    revenueAccountForFeeItem: (feeItemId) => {
      const code = revenueCodeByItem.get(feeItemId);
      // A fee item with no mapping posts to fee revenue, exactly as `glMappingOf` says.
      return code === undefined ? fallback : { code, name: code, kind: 'revenue' };
    },
  });
}

/** Reads the run a key already posted, or null. */
export async function readPostedRun(
  tx: SqliteTransaction,
  key: string
): Promise<PostedBillingRun | null> {
  const row = await tx.get<{ after: string | null }>(
    `SELECT "after" AS "after" FROM "${AUDIT_TABLE}"
       WHERE "entity" = ? AND "entity_id" = ?
       ORDER BY "commit_sequence" DESC LIMIT 1`,
    [BILLING_RUN_AUDIT_ENTITY, key]
  );
  if (!row?.after) return null;
  try {
    return JSON.parse(row.after) as PostedBillingRun;
  } catch {
    return null;
  }
}

/** Records the run, inside the run's own transaction, so a failure leaves no trace of it. */
export async function writePostedRun(
  tx: SqliteTransaction,
  record: PostedBillingRun
): Promise<void> {
  const sequence = await tx.get<{ value: number | null }>(
    `SELECT COALESCE(MAX("commit_sequence"), 0) + 1 AS "value" FROM "${AUDIT_TABLE}"`
  );
  const commitSequence =
    sequence && Number.isSafeInteger(sequence.value) ? Number(sequence.value) : 1;
  await writeAuditEvent(tx, {
    entity: BILLING_RUN_AUDIT_ENTITY,
    entityId: record.key,
    action: 'create',
    actorId: record.postedBy,
    changedFields: [
      'period_id',
      'schedule_pins',
      'invoices_created',
      'supplementary_invoices',
      'ledger_entries',
      'amount',
    ],
    before: null,
    after: record,
    reason: `Billing run posted for period ${record.periodId}`,
    createdAt: record.postedAt,
    commitSequence,
  });
}

/** What the writer needs beyond the plan. */
export interface WriteRunOptions {
  readonly store: BillingRunStore;
  readonly tx: SqliteTransaction;
  readonly facts: RunFacts;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly actor?: string;
  readonly now: () => Date;
}

/** What a post wrote. */
export interface WriteRunResult {
  readonly invoicesCreated: number;
  readonly supplementaryInvoices: number;
  readonly ledgerEntries: number;
  readonly amount: Money;
  readonly runId: string;
}

const itemsOf = (line: PlannedLearner, source: PlannedItem['source']): readonly PlannedItem[] =>
  line.items.filter((item) => item.source === source);

/** Sums a list of items, or zero when there is nothing to sum. */
function totalOf(items: readonly PlannedItem[], currency: CurrencyCode): Money {
  let total = zero(currency);
  for (const item of items) total = add(total, item.amount);
  return total;
}

/** Writes every invoice of a planned run and posts it, inside the run's transaction. */
export async function writeRunPlan(
  plan: { readonly lines: readonly PlannedLearner[]; readonly schedulePins: readonly SchedulePin[] },
  options: WriteRunOptions
): Promise<WriteRunResult> {
  const { store, tx, facts } = options;
  const currency = facts.currency;
  const ledger = new LedgerService({
    store: createSqliteLedgerStore(transactionAdapter(tx)),
    mapping: chartFor(facts),
    ...(options.actor === undefined ? {} : { actor: options.actor }),
    now: options.now,
  });
  const sequences = new SequenceService({
    store: createSqliteSequenceStore(transactionAdapter(tx)),
    now: options.now,
  });
  const scope = {
    institution: facts.institutionId,
    year: Number(facts.period.start_date.slice(0, 4)),
    term: facts.period.sequence,
  };

  const nextNumber = async (): Promise<string> => {
    const allocation = await sequences.issue('invoice', scope, { policy: 'reuse' });
    return allocation.number;
  };

  let invoicesCreated = 0;
  let supplementaryInvoices = 0;
  let ledgerEntries = 0;
  let amount = zero(currency);

  for (const line of plan.lines) {
    const feeItems = itemsOf(line, 'schedule').concat(itemsOf(line, 'adhoc'));
    const openings = itemsOf(line, 'opening_balance');

    if (feeItems.length > 0) {
      const total = totalOf(feeItems, currency);
      const number = await nextNumber();
      const invoice = await store.create(
        'invoice',
        {
          institution_id: facts.institutionId,
          number,
          learner_id: line.learnerId,
          academic_period_id: facts.period.id,
          issue_date: options.issueDate,
          due_date: options.dueDate,
          total,
          status: 'posted',
        },
        writeOptions(options)
      );
      for (const item of feeItems) {
        await store.create(
          'invoice_line',
          {
            institution_id: facts.institutionId,
            invoice_id: invoice.id,
            ...(item.feeItemId === null ? {} : { fee_item_id: item.feeItemId }),
            description: item.description,
            amount: item.amount,
            kind: item.kind,
          },
          writeOptions(options)
        );
      }
      await ledger.postInvoice({
        invoice: {
          id: invoice.id,
          number,
          institutionId: facts.institutionId,
          issueDate: options.issueDate,
          total,
          lines: feeItems.map((item) => ({
            feeItemId: item.feeItemId,
            amount: item.amount,
            description: item.description,
          })),
        },
        ...(options.actor === undefined ? {} : { postedBy: options.actor }),
      });
      invoicesCreated += 1;
      if (line.supplementary) supplementaryInvoices += 1;
      ledgerEntries += 1;
      amount = add(amount, total);
    }

    for (const opening of line.openingBalances) {
      const item = openings.find(
        (candidate) => candidate.description === `Opening balance as at ${opening.asOfDate}`
      );
      if (!item) continue;
      const number = await nextNumber();
      const invoice = await store.create(
        'invoice',
        {
          institution_id: facts.institutionId,
          number,
          learner_id: line.learnerId,
          issue_date: opening.asOfDate,
          total: item.amount,
          status: 'posted',
        },
        writeOptions(options)
      );
      await store.create(
        'invoice_line',
        {
          institution_id: facts.institutionId,
          invoice_id: invoice.id,
          description: item.description,
          amount: item.amount,
          kind: 'opening_balance',
        },
        writeOptions(options)
      );
      // The opening balance posts against opening-balance equity, not against revenue: an
      // `invoiceEntry` would credit a revenue account and overstate income for a balance the
      // school merely carried forward. The invoice carries the line, so the learner's statement
      // shows it; the entry carries the right accounts.
      await ledger.postOpeningBalance({
        openingBalance: {
          id: invoice.id,
          institutionId: facts.institutionId,
          asOfDate: opening.asOfDate,
          amount: item.amount,
          side: opening.side,
          learnerId: line.learnerId,
        },
        ...(options.actor === undefined ? {} : { postedBy: options.actor }),
      });
      invoicesCreated += 1;
      ledgerEntries += 1;
      amount = add(amount, item.amount);
    }
  }

  if (isZero(amount) && invoicesCreated > 0) {
    throw new BillingError('storage', 'the run created an invoice that adds up to nothing');
  }

  return {
    invoicesCreated,
    supplementaryInvoices,
    ledgerEntries,
    amount,
    runId: generateUuidv7(),
  };
}

function writeOptions(options: WriteRunOptions): { readonly actor?: string; readonly reason?: string } {
  return {
    ...(options.actor === undefined ? {} : { actor: options.actor }),
    reason: 'billing run',
  };
}
