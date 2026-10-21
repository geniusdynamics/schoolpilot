// ABOUTME: Migration M5: the legacy fee templates, invoices, payments, applications, adjustments
// ABOUTME: and opening balances become canonical finance documents in exact minor units.

import type { SqliteBindValue } from '@/data/adapters/sqlite';
import {
  creditNoteSchema,
  feeItemSchema,
  feeScheduleLineSchema,
  feeScheduleSchema,
  invoiceLineSchema,
  invoiceSchema,
  paymentAllocationSchema,
  paymentSchema,
  receiptSchema,
} from '@/domain/schema';

import { tableExists, type SqlReader } from './001-legacy-calendar';
import {
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
} from './001-institution-calendar';
import { CREATED_TABLE } from './002-class-groups';
import { readFeePlanSource } from './005-legacy-fees';
import { FEE_ENTITIES, planFeeMigration, type FeeEntity, type FeeMigrationPlan } from './005-fee-plan';
import {
  assertFeeBalances,
  compareFeeBalances,
  readFeeMigrationReport,
  verifyFeeMigration,
  type FeeAllocationCheck,
  type FeeBalanceComparison,
  type FeeCheck,
  type FeeMigrationVerification,
  type LearnerBalanceRows,
} from './005-fee-verification';
import type { Migration, MigrationContext } from './types';

export {
  assertFeeBalances,
  compareFeeBalances,
  readFeeMigrationReport,
  type FeeAllocationCheck,
  type FeeBalanceComparison,
  type FeeCheck,
  type FeeMigrationVerification,
  type LearnerBalanceRows,
};
export {
  FEE_ENTITIES,
  legacyFeeBalances,
  legacyFeeCounts,
  legacyLedger,
  planFeeMigration,
  type FeeCounts,
  type FeeEntity,
  type FeeIssue,
  type FeeMapEntry,
  type FeeMigrationPlan,
  type FeeUnmappableRow,
  type LearnerFeeBalance,
  type LegacyApplicationDecision,
  type LegacyApplicationRefusal,
  type LegacyLedger,
  type LegacyLedgerEntry,
} from './005-fee-plan';
export { readFeePlanSource, type FeePlanSource } from './005-legacy-fees';
export { toMinorUnits, currencyDigits, type MinorConversion, type MinorUnits } from './005-fee-rules';

/** The created-rows table M2 introduced; M5 records its own rows in it under its version. */
const CREATED_DDL = `CREATE TABLE IF NOT EXISTS "${CREATED_TABLE}" (
   migration_version INTEGER NOT NULL,
   entity TEXT NOT NULL,
   id TEXT NOT NULL,
   PRIMARY KEY (migration_version, entity, id)
 )`;

/** The options the migration takes. */
export interface FeeMigrationOptions {
  /** The clock; the audit timestamps are derived from it. */
  readonly now?: () => Date;
}

async function insertRow(
  context: MigrationContext,
  table: string,
  row: Record<string, SqliteBindValue | undefined>
): Promise<void> {
  const columns: string[] = [];
  const values: SqliteBindValue[] = [];
  for (const [column, value] of Object.entries(row)) {
    if (value === undefined) continue;
    columns.push(column);
    values.push(value);
  }
  await context.run(
    `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})`,
    values
  );
}

/** The JSON text a money column holds, so the repository's decoder reads it back. */
function money(amount: { readonly amount_minor: number; readonly currency: string }): string {
  return JSON.stringify({ amount_minor: amount.amount_minor, currency: amount.currency });
}

/**
 * Writes the canonical rows of a plan, the id map, the unmappable rows and the notes.
 *
 * Every row is written once, in the state it keeps: an insert and never an update, so the
 * posting freeze of spec 02 §12.7 is never tested by the migration. The rows go in the order
 * the foreign keys need.
 */
export async function writeFeePlan(
  context: MigrationContext,
  plan: FeeMigrationPlan
): Promise<void> {
  await context.exec(CREATED_DDL);

  for (const entry of plan.feeItems) {
    const row = feeItemSchema.parse(entry);
    await insertRow(context, 'fee_item', {
      id: row.id,
      institution_id: row.institution_id,
      code: row.code,
      name: row.name,
      ...(row.revenue_account_code === undefined
        ? {}
        : { revenue_account_code: row.revenue_account_code }),
      category: row.category,
      refundable: row.refundable ? 1 : 0,
      taxable: row.taxable ? 1 : 0,
      priority: row.priority,
      funding_source: row.funding_source,
      ...(row.created_by === undefined ? {} : { created_by: row.created_by }),
      ...(row.updated_by === undefined ? {} : { updated_by: row.updated_by }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.schedules) {
    const row = feeScheduleSchema.parse(entry);
    await insertRow(context, 'fee_schedule', {
      id: row.id,
      institution_id: row.institution_id,
      name: row.name,
      academic_year_id: row.academic_year_id,
      academic_period_ids: JSON.stringify(row.academic_period_ids),
      programme_ids: JSON.stringify(row.programme_ids),
      level_ids: JSON.stringify(row.level_ids),
      residence_statuses: JSON.stringify(row.residence_statuses),
      fee_category_ids: JSON.stringify(row.fee_category_ids),
      ...(row.campus_id === undefined ? {} : { campus_id: row.campus_id }),
      new_learners_only: row.new_learners_only ? 1 : 0,
      version: row.version,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.scheduleLines) {
    const row = feeScheduleLineSchema.parse(entry);
    await insertRow(context, 'fee_schedule_line', {
      id: row.id,
      institution_id: row.institution_id,
      fee_schedule_id: row.fee_schedule_id,
      fee_item_id: row.fee_item_id,
      amount: money(row.amount),
      mandatory: row.mandatory ? 1 : 0,
      frequency: row.frequency,
      ...(row.due_dates === undefined ? {} : { due_dates: JSON.stringify(row.due_dates) }),
      ...(row.installment_plan_id === undefined
        ? {}
        : { installment_plan_id: row.installment_plan_id }),
      proration_rule: row.proration_rule,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.invoices) {
    const row = invoiceSchema.parse(entry);
    await insertRow(context, 'invoice', {
      id: row.id,
      institution_id: row.institution_id,
      number: row.number,
      ...(row.learner_id === undefined ? {} : { learner_id: row.learner_id }),
      ...(row.payer_guardian_id === undefined
        ? {}
        : { payer_guardian_id: row.payer_guardian_id }),
      ...(row.household_id === undefined ? {} : { household_id: row.household_id }),
      ...(row.academic_period_id === undefined
        ? {}
        : { academic_period_id: row.academic_period_id }),
      issue_date: row.issue_date,
      due_date: row.due_date ?? null,
      total: money(row.total),
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.invoiceLines) {
    const row = invoiceLineSchema.parse(entry);
    await insertRow(context, 'invoice_line', {
      id: row.id,
      institution_id: row.institution_id,
      invoice_id: row.invoice_id,
      ...(row.fee_item_id === undefined ? {} : { fee_item_id: row.fee_item_id }),
      description: row.description,
      amount: money(row.amount),
      kind: row.kind,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.payments) {
    const row = paymentSchema.parse(entry);
    await insertRow(context, 'payment', {
      id: row.id,
      institution_id: row.institution_id,
      ...(row.payer_guardian_id === undefined
        ? {}
        : { payer_guardian_id: row.payer_guardian_id }),
      ...(row.learner_id === undefined ? {} : { learner_id: row.learner_id }),
      ...(row.household_id === undefined ? {} : { household_id: row.household_id }),
      amount: money(row.amount),
      channel: row.channel,
      ...(row.reference === undefined ? {} : { reference: row.reference }),
      ...(row.external_reference === undefined
        ? {}
        : { external_reference: row.external_reference }),
      received_at: row.received_at,
      ...(row.cashier_user_id === undefined ? {} : { cashier_user_id: row.cashier_user_id }),
      status: row.status,
      ...(row.exchange_rate === undefined ? {} : { exchange_rate: row.exchange_rate }),
      ...(row.base_amount === undefined ? {} : { base_amount: money(row.base_amount) }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.receipts) {
    const row = receiptSchema.parse(entry);
    await insertRow(context, 'receipt', {
      id: row.id,
      institution_id: row.institution_id,
      number: row.number,
      payment_id: row.payment_id,
      issued_at: row.issued_at,
      ...(row.issued_by === undefined ? {} : { issued_by: row.issued_by }),
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.allocations) {
    const row = paymentAllocationSchema.parse(entry);
    await insertRow(context, 'payment_allocation', {
      id: row.id,
      institution_id: row.institution_id,
      payment_id: row.payment_id,
      invoice_id: row.invoice_id,
      amount: money(row.amount),
      allocated_at: row.allocated_at,
      ...(row.allocated_by === undefined ? {} : { allocated_by: row.allocated_by }),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  for (const entry of plan.creditNotes) {
    const row = creditNoteSchema.parse(entry);
    await insertRow(context, 'credit_note', {
      id: row.id,
      institution_id: row.institution_id,
      number: row.number,
      ...(row.learner_id === undefined ? {} : { learner_id: row.learner_id }),
      ...(row.invoice_id === undefined ? {} : { invoice_id: row.invoice_id }),
      amount: money(row.amount),
      reason: row.reason,
      issue_date: row.issue_date,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at ?? null,
    });
  }

  const mapped = new Set<string>();
  for (const entry of plan.mapping) {
    const key = `${entry.legacyTable}::${entry.legacyId}::${entry.canonicalEntity}`;
    if (mapped.has(key)) {
      throw new Error(
        `Migration M5 maps the legacy row "${entry.legacyId}" of "${entry.legacyTable}" to "${entry.canonicalEntity}" twice`
      );
    }
    mapped.add(key);
    await context.run(
      `INSERT INTO "${LEGACY_ID_MAP_TABLE}" (legacy_table, legacy_id, canonical_entity, canonical_id)
       VALUES (?, ?, ?, ?)`,
      [entry.legacyTable, entry.legacyId, entry.canonicalEntity, entry.canonicalId]
    );
  }

  for (const row of plan.unmappable) {
    await context.run(
      `INSERT INTO "${LEGACY_UNMAPPABLE_TABLE}" (legacy_table, legacy_id, canonical_entity, reason, detail)
       VALUES (?, ?, ?, ?, ?)`,
      [row.legacyTable, row.legacyId, row.canonicalEntity, row.reason, row.detail ?? null]
    );
  }

  for (const issue of plan.issues) {
    await context.run(
      `INSERT INTO "${LEGACY_NOTES_TABLE}" (migration_version, severity, code, entity, legacy_table, legacy_id, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        context.version,
        issue.severity,
        issue.code,
        issue.entity,
        issue.legacyTable,
        issue.legacyId,
        issue.message,
      ]
    );
  }

  for (const assumption of plan.assumptions) {
    await context.run(
      `INSERT INTO "${LEGACY_NOTES_TABLE}" (migration_version, severity, code, entity, legacy_table, legacy_id, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [context.version, 'info', 'assumption', 'invoice', 'student_invoices', '', assumption]
    );
  }

  for (const row of plan.created) {
    await context.run(
      `INSERT INTO "${CREATED_TABLE}" (migration_version, entity, id) VALUES (?, ?, ?)`,
      [context.version, row.entity, row.id]
    );
  }
}

async function assertCanonicalTables(reader: SqlReader): Promise<void> {
  const missing: string[] = [];
  for (const table of FEE_ENTITIES) {
    if (!(await tableExists(reader, table))) missing.push(table);
  }
  if (missing.length > 0) {
    throw new Error(
      `Migration M5 writes the canonical tables (${missing.join(', ')}), but the database does not hold them; apply the canonical schema first`
    );
  }
}

/**
 * True when M1's report tables are there.
 *
 * M5 is a later migration: it appends to the id map, the unmappable rows and the notes M1
 * created. A database without them has not run M1, so the run is refused rather than writing a
 * second set of report tables under a different shape.
 */
async function assertReportTables(reader: SqlReader): Promise<void> {
  const missing: string[] = [];
  for (const table of [LEGACY_ID_MAP_TABLE, LEGACY_UNMAPPABLE_TABLE, LEGACY_NOTES_TABLE]) {
    if (!(await tableExists(reader, table))) missing.push(table);
  }
  if (missing.length > 0) {
    throw new Error(
      `Migration M5 appends to the report tables migration M1 created (${missing.join(', ')}); run migration M1 first`
    );
  }
}

/**
 * True when M3's learners are there.
 *
 * Every finance document belongs to a learner, so a database without the canonical learners has
 * not run M3 and migrating it would write invoices nobody owns.
 */
async function assertLearnersMigrated(reader: SqlReader): Promise<void> {
  if (!(await tableExists(reader, 'learner'))) {
    throw new Error(
      'Migration M5 attaches every fee document to a learner, but the database holds no learner table; run migration M3 first'
    );
  }
  const row = await reader.get<{ total: number }>(`SELECT COUNT(*) AS total FROM "learner"`);
  if ((row?.total ?? 0) === 0) {
    throw new Error(
      'Migration M5 attaches every fee document to a learner, but the database holds no learner; run migration M3 first'
    );
  }
}

/** The rows M5 owns: a second run would duplicate them, so the migration refuses a non-empty one. */
async function assertTargetsEmpty(reader: SqlReader): Promise<void> {
  for (const table of FEE_ENTITIES) {
    const row = await reader.get<{ total: number }>(`SELECT COUNT(*) AS total FROM "${table}"`);
    const total = row?.total ?? 0;
    if (total > 0) {
      throw new Error(
        `Migration M5 writes the canonical table "${table}", but it already holds ${total} row(s); the canonical data is newer than the legacy data, so there is nothing to migrate`
      );
    }
  }
}

/**
 * Builds migration M5.
 *
 * The migration reads the legacy fee rows and the learners migration M3 wrote, then writes the
 * canonical fee items, schedules, invoices, payments, allocations, receipts and credit notes in
 * the framework's transaction, so the rows and the ledger row commit together or not at all. It
 * then reads the database back and refuses the run when a learner's balance does not match the
 * legacy rows, when an allocation exceeds its payment, or when a document it wrote is not the
 * document the legacy row describes.
 *
 * Its SQL is not declared: the ids are generated and the rows are written one by one, so the
 * migration states a checksum of its own instead.
 */
export function createFeeMigration(options: FeeMigrationOptions = {}): Migration {
  return {
    version: 5,
    name: 'migrate the fee templates, invoices, payments and credit notes',
    checksum: 'm5-fees-v1',
    destructive: true,
    async up(context: MigrationContext) {
      await assertCanonicalTables(context);
      await assertReportTables(context);
      await assertLearnersMigrated(context);
      await assertTargetsEmpty(context);

      const source = await readFeePlanSource(context);
      if (
        source.templates.length === 0 &&
        source.invoices.length === 0 &&
        source.payments.length === 0 &&
        source.adjustments.length === 0 &&
        source.openingBalances.length === 0
      ) {
        throw new Error(
          'Migration M5 could not find a single fee row: the legacy database holds no template, invoice, payment, adjustment or opening balance, and an empty migration is a migration that silently lost the school fees'
        );
      }

      const referenceTimestamp = (options.now?.() ?? new Date())
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z');
      const plan = planFeeMigration(source, { referenceTimestamp });

      // An error stops the migration before it writes: a school that cannot be told where its
      // money is belongs to the operator, not to a guess.
      const fatal = plan.issues.filter((issue) => issue.severity === 'error');
      if (fatal.length > 0) {
        throw new Error(
          `Migration M5 cannot map this database: ${fatal.map((issue) => issue.message).join('; ')}`
        );
      }

      await writeFeePlan(context, plan);
      const verification = await verifyFeeMigration(context, source);

      const issueFailures = verification.issues.filter((issue) => issue.severity === 'error');
      if (issueFailures.length > 0) {
        throw new Error(
          `Migration M5 wrote a document it cannot verify: ${issueFailures
            .map((issue) => issue.message)
            .join('; ')}`
        );
      }

      const failures: readonly FeeCheck[] = verification.checks.filter(
        (entry) => !entry.ok && entry.severity === 'error'
      );
      if (failures.length > 0) {
        const detail = failures
          .slice(0, 5)
          .map(
            (entry) =>
              `${entry.entity} ${entry.legacyId || '(no id)'}: ${entry.check} was ${entry.actual}, expected ${entry.expected}`
          )
          .join('; ');
        throw new Error(
          `Migration M5 wrote ${failures.length} row(s) that do not match the legacy rows: ${detail}`
        );
      }
    },
    async down(context: MigrationContext) {
      // Everything the migration created is recorded, so the rollback removes exactly that and
      // never a row it found. The rows go in the order the foreign keys need.
      if (await tableExists(context, CREATED_TABLE)) {
        for (const entity of [
          'payment_allocation',
          'receipt',
          'credit_note',
          'invoice_line',
          'invoice',
          'payment',
          'fee_schedule_line',
          'fee_schedule',
          'fee_item',
        ] as const) {
          await context.run(
            `DELETE FROM "${entity}"
               WHERE id IN (SELECT id FROM "${CREATED_TABLE}"
                             WHERE migration_version = ? AND entity = ?)`,
            [context.version, entity]
          );
        }
        // The table and M2's rows stay: a rollback to version 2 must leave M2 able to undo
        // its own rows later.
        await context.run(`DELETE FROM "${CREATED_TABLE}" WHERE migration_version = ?`, [
          context.version,
        ]);
      }

      await context.run(
        `DELETE FROM "${LEGACY_ID_MAP_TABLE}"
           WHERE canonical_entity IN (${FEE_ENTITIES.map(() => '?').join(', ')})`,
        [...FEE_ENTITIES]
      );
      await context.run(
        `DELETE FROM "${LEGACY_UNMAPPABLE_TABLE}"
           WHERE canonical_entity IN (${FEE_ENTITIES.map(() => '?').join(', ')})`,
        [...FEE_ENTITIES]
      );
      await context.run(`DELETE FROM "${LEGACY_NOTES_TABLE}" WHERE migration_version = ?`, [
        context.version,
      ]);
    },
  };
}

/** Migration M5: the legacy fee data becomes canonical finance documents. */
export const migrateFees: Migration = createFeeMigration();

/** The canonical tables migration M5 writes, for the report and the rollback. */
export const CANONICAL_FEE_TABLES: Record<FeeEntity, string> = {
  fee_item: 'fee_item',
  fee_schedule: 'fee_schedule',
  fee_schedule_line: 'fee_schedule_line',
  invoice: 'invoice',
  invoice_line: 'invoice_line',
  payment: 'payment',
  payment_allocation: 'payment_allocation',
  receipt: 'receipt',
  credit_note: 'credit_note',
};
