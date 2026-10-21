// ABOUTME: The verification of migration M5: the counts, every canonical finance document read
// ABOUTME: back, every allocation against its payment, and every learner's balance before and after.

import type { SqliteRow } from '@/data/adapters/sqlite';

import { legacyText, tableExists, type SqlReader } from './001-legacy-calendar';
import {
  LEGACY_ID_MAP_TABLE,
  LEGACY_NOTES_TABLE,
  LEGACY_UNMAPPABLE_TABLE,
} from './001-institution-calendar';
import { readFeePlanSource, type FeePlanSource } from './005-legacy-fees';
import {
  FEE_ENTITIES,
  legacyFeeBalances,
  legacyFeeCounts,
  legacyLedger,
  type FeeCounts,
  type FeeEntity,
  type FeeIssue,
  type FeeMapEntry,
  type FeeUnmappableRow,
  type LearnerFeeBalance,
} from './005-fee-plan';
import { invoiceStatusOf, toMinorUnits, adjustmentDirection } from './005-fee-rules';

/** One check the migration made about the rows it wrote. */
export interface FeeCheck {
  readonly entity: FeeEntity | 'learner';
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalId: string;
  readonly check: string;
  readonly expected: string;
  readonly actual: string;
  readonly ok: boolean;
  /** `error` breaks the migration; `warning` is a problem the legacy data carried in. */
  readonly severity: 'error' | 'warning';
}

/** What one payment's allocations add up to. */
export interface FeeAllocationCheck {
  readonly paymentId: string;
  readonly legacyPaymentId: string;
  readonly paidMinor: number;
  readonly allocatedMinor: number;
  readonly unallocatedMinor: number;
  readonly withinPayment: boolean;
  readonly currency: string;
}

/** The verification the migration made, read back from the database. */
export interface FeeMigrationVerification {
  readonly currency: string;
  readonly counts: {
    /** The legacy rows that could become a row of the entity. */
    readonly before: FeeCounts;
    /** The canonical rows the id map names. */
    readonly after: FeeCounts;
    /** The canonical rows the migration did not write. */
    readonly stray: FeeCounts;
  };
  readonly balances: readonly LearnerFeeBalance[];
  readonly allocations: readonly FeeAllocationCheck[];
  readonly checks: readonly FeeCheck[];
  readonly issues: readonly FeeIssue[];
  readonly assumptions: readonly string[];
  readonly unmappable: readonly FeeUnmappableRow[];
  readonly mapping: readonly FeeMapEntry[];
}

/** A learner's balance read from both sides, before the comparison. */
export interface LearnerBalanceRows {
  readonly learnerId: string;
  readonly legacyLearnerId: string;
  readonly admissionNumber: string;
  readonly beforeMinor: number;
  readonly afterMinor: number;
}

/** What the balance comparison found. */
export interface FeeBalanceComparison {
  readonly balances: readonly LearnerFeeBalance[];
  readonly mismatched: readonly LearnerFeeBalance[];
}

/**
 * Compares each learner's legacy balance with the balance the canonical documents add up to.
 *
 * The two are compared to the minor unit: a difference of one cent is a conversion that drifted,
 * a dropped row or a doubled one, and the migration refuses to commit over it.
 */
export function compareFeeBalances(rows: readonly LearnerBalanceRows[]): FeeBalanceComparison {
  const balances: LearnerFeeBalance[] = rows.map((row) => ({
    learnerId: row.learnerId,
    legacyLearnerId: row.legacyLearnerId,
    admissionNumber: row.admissionNumber,
    beforeMinor: row.beforeMinor,
    afterMinor: row.afterMinor,
    matched: row.beforeMinor === row.afterMinor,
  }));
  return { balances, mismatched: balances.filter((row) => !row.matched) };
}

/**
 * Refuses the run when a learner's balance differs.
 *
 * The message names every learner and both amounts, so an operator can see which ledger moved
 * rather than that "a check failed".
 */
export function assertFeeBalances(balances: readonly LearnerFeeBalance[]): void {
  const mismatched = balances.filter((row) => !row.matched);
  if (mismatched.length === 0) return;
  const detail = mismatched
    .map(
      (row) =>
        `${row.admissionNumber || row.learnerId}: ${row.beforeMinor} before, ${row.afterMinor} after`
    )
    .join('; ');
  throw new Error(
    `Migration M5 moved ${mismatched.length} learner balance(s) out of balance: ${detail}`
  );
}

function emptyCounts(): FeeCounts {
  return {
    fee_item: 0,
    fee_schedule: 0,
    fee_schedule_line: 0,
    invoice: 0,
    invoice_line: 0,
    payment: 0,
    payment_allocation: 0,
    receipt: 0,
    credit_note: 0,
  };
}

function isFeeEntity(value: string): value is FeeEntity {
  return (FEE_ENTITIES as readonly string[]).includes(value);
}

/** Reads the id-map rows migration M5 wrote. */
async function readFeeIdMap(reader: SqlReader): Promise<FeeMapEntry[]> {
  if (!(await tableExists(reader, LEGACY_ID_MAP_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_table, legacy_id, canonical_entity, canonical_id
       FROM "${LEGACY_ID_MAP_TABLE}"
      ORDER BY legacy_table, legacy_id, canonical_entity`
  );
  const entries: FeeMapEntry[] = [];
  for (const row of rows) {
    const canonicalEntity = legacyText(row, 'canonical_entity') ?? '';
    if (!isFeeEntity(canonicalEntity)) continue;
    entries.push({
      legacyTable: legacyText(row, 'legacy_table') ?? '',
      legacyId: legacyText(row, 'legacy_id') ?? '',
      canonicalEntity,
      canonicalId: legacyText(row, 'canonical_id') ?? '',
    });
  }
  return entries;
}

/** Reads the unmappable rows migration M5 wrote. */
async function readFeeUnmappable(reader: SqlReader): Promise<FeeUnmappableRow[]> {
  if (!(await tableExists(reader, LEGACY_UNMAPPABLE_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_table, legacy_id, canonical_entity, reason, detail
       FROM "${LEGACY_UNMAPPABLE_TABLE}"
      ORDER BY legacy_table, legacy_id, canonical_entity`
  );
  const entries: FeeUnmappableRow[] = [];
  for (const row of rows) {
    const canonicalEntity = legacyText(row, 'canonical_entity') ?? '';
    if (!isFeeEntity(canonicalEntity)) continue;
    const detail = legacyText(row, 'detail');
    entries.push({
      legacyTable: legacyText(row, 'legacy_table') ?? '',
      legacyId: legacyText(row, 'legacy_id') ?? '',
      canonicalEntity,
      reason: legacyText(row, 'reason') ?? '',
      ...(detail === null ? {} : { detail }),
    });
  }
  return entries;
}

/** A note migration M5 left behind. */
interface MigrationNote {
  readonly severity: string;
  readonly code: string;
  readonly entity: string;
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly message: string;
}

/** Reads the notes migration M5 left; M1's, M2's and M3's notes are other versions. */
async function readFeeNotes(reader: SqlReader): Promise<MigrationNote[]> {
  if (!(await tableExists(reader, LEGACY_NOTES_TABLE))) return [];
  const rows = await reader.all<SqliteRow>(
    `SELECT severity, code, entity, legacy_table, legacy_id, message
       FROM "${LEGACY_NOTES_TABLE}"
      WHERE migration_version = 5
      ORDER BY rowid`
  );
  return rows.map((row) => ({
    severity: legacyText(row, 'severity') ?? 'warning',
    code: legacyText(row, 'code') ?? '',
    entity: legacyText(row, 'entity') ?? '',
    legacyTable: legacyText(row, 'legacy_table') ?? '',
    legacyId: legacyText(row, 'legacy_id') ?? '',
    message: legacyText(row, 'message') ?? '',
  }));
}

/** Every canonical row of a table, by id. */
async function canonicalRows(reader: SqlReader, table: string): Promise<Map<string, SqliteRow>> {
  if (!(await tableExists(reader, table))) return new Map();
  const rows = await reader.all<SqliteRow>(`SELECT * FROM "${table}"`);
  return new Map(rows.map((row) => [legacyText(row, 'id') ?? '', row]));
}

/** The whole minor units a canonical money column holds. */
function amountOf(row: SqliteRow | undefined, column: string): number | null {
  if (row === undefined) return null;
  const raw = row[column];
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const amount = (parsed as Record<string, unknown>)['amount_minor'];
    if (typeof amount !== 'number' || !Number.isSafeInteger(amount)) return null;
    return amount;
  } catch {
    return null;
  }
}

/** The currency a canonical money column holds. */
function currencyOf(row: SqliteRow | undefined, column: string): string {
  if (row === undefined) return '';
  const raw = row[column];
  if (typeof raw !== 'string' || raw.trim() === '') return '';
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return '';
    const currency = (parsed as Record<string, unknown>)['currency'];
    return typeof currency === 'string' ? currency : '';
  } catch {
    return '';
  }
}

function check(
  entity: FeeEntity | 'learner',
  legacyTable: string,
  legacyId: string,
  canonicalId: string,
  name: string,
  expected: string,
  actual: string,
  severity: 'error' | 'warning'
): FeeCheck {
  return {
    entity,
    legacyTable,
    legacyId,
    canonicalId,
    check: name,
    expected,
    actual,
    ok: expected === actual,
    severity,
  };
}

/** The counts the id map and the unmappable rows add up to. */
function countsByEntity(rows: readonly { readonly canonicalEntity: FeeEntity }[]): FeeCounts {
  const counts = emptyCounts();
  for (const row of rows) counts[row.canonicalEntity] += 1;
  return counts;
}

/** The money each legacy row should have become, keyed by legacy table and id. */
interface ExpectedAmounts {
  readonly documentMinor: ReadonlyMap<string, number>;
  readonly lineMinor: ReadonlyMap<string, number>;
  readonly paymentMinor: ReadonlyMap<string, string>;
  readonly allocationMinor: ReadonlyMap<string, number>;
  readonly scheduleLineMinor: ReadonlyMap<string, number>;
}

function entryKey(legacyTable: string, legacyId: string): string {
  return `${legacyTable}::${legacyId}`;
}

/** Reads the money the legacy rows describe, for the per-row checks. */
function expectedAmounts(source: FeePlanSource): ExpectedAmounts {
  const currency = source.baseCurrency ?? 'KES';
  const documentMinor = new Map<string, number>();
  const lineMinor = new Map<string, number>();
  const paymentMinor = new Map<string, string>();
  const allocationMinor = new Map<string, number>();
  const scheduleLineMinor = new Map<string, number>();

  const ledger = legacyLedger(source);
  for (const entry of ledger.entries) {
    documentMinor.set(entryKey(entry.legacyTable, entry.legacyId), entry.documentMinor);
  }
  for (const application of ledger.applications) {
    allocationMinor.set(application.applicationId, application.appliedMinor);
  }

  for (const invoice of source.invoices) {
    for (const item of invoice.items) {
      const conversion = toMinorUnits(item.amount, currency);
      if (conversion.ok) lineMinor.set(entryKey('student_invoice_items', item.id), conversion.value.amountMinor);
    }
    if (invoice.items.length === 0) {
      const conversion = toMinorUnits(invoice.totalBilled, currency);
      if (conversion.ok) {
        lineMinor.set(entryKey('student_invoice_items', `${invoice.id}#total`), conversion.value.amountMinor);
      }
    }
  }
  for (const template of source.templates) {
    for (const item of template.items) {
      const conversion = toMinorUnits(item.amount, currency);
      if (conversion.ok) scheduleLineMinor.set(entryKey('fee_template_items', item.id), conversion.value.amountMinor);
    }
  }
  for (const payment of source.payments) {
    const paymentCurrency = payment.currency ?? currency;
    const conversion = toMinorUnits(payment.amount, paymentCurrency);
    if (conversion.ok) {
      paymentMinor.set(payment.id, `${conversion.value.amountMinor} ${paymentCurrency}`);
    }
  }

  // A charged adjustment and a debit balance are one-line invoices, so their line carries the
  // same amount as the document.
  for (const adjustment of source.adjustments) {
    if (adjustmentDirection(adjustment.type, adjustment.amount) === 'credit') continue;
    const conversion = toMinorUnits(adjustment.amount, currency);
    if (conversion.ok) {
      lineMinor.set(
        entryKey('fee_adjustments', adjustment.id),
        Math.abs(conversion.value.amountMinor)
      );
    }
  }
  for (const balance of source.openingBalances) {
    if (balance.isBilled) continue;
    if ((balance.type ?? '').trim().toLowerCase() === 'credit') continue;
    const conversion = toMinorUnits(balance.amount, currency);
    if (conversion.ok) {
      lineMinor.set(
        entryKey('student_opening_balances', balance.id),
        Math.abs(conversion.value.amountMinor)
      );
    }
  }

  return { documentMinor, lineMinor, paymentMinor, allocationMinor, scheduleLineMinor };
}

/** The per-learner money the canonical documents add up to. */
interface CanonicalBalances {
  readonly balances: Map<string, number>;
  readonly invoiceCountByLearner: Map<string, number>;
}

function canonicalBalances(
  invoices: ReadonlyMap<string, SqliteRow>,
  allocations: ReadonlyMap<string, SqliteRow>,
  creditNotes: ReadonlyMap<string, SqliteRow>
): CanonicalBalances {
  const balances = new Map<string, number>();
  const invoiceCountByLearner = new Map<string, number>();
  const add = (learnerId: string, amountMinor: number): void => {
    balances.set(learnerId, (balances.get(learnerId) ?? 0) + amountMinor);
  };

  const voidInvoices = new Set<string>();
  for (const [id, invoice] of invoices) {
    const status = legacyText(invoice, 'status');
    if (status === 'void') {
      voidInvoices.add(id);
      continue;
    }
    const learnerId = legacyText(invoice, 'learner_id');
    const total = amountOf(invoice, 'total');
    if (learnerId === null || total === null) continue;
    add(learnerId, total);
    invoiceCountByLearner.set(learnerId, (invoiceCountByLearner.get(learnerId) ?? 0) + 1);
  }

  for (const allocation of allocations.values()) {
    const invoiceId = legacyText(allocation, 'invoice_id') ?? '';
    if (voidInvoices.has(invoiceId)) continue;
    const invoice = invoices.get(invoiceId);
    const learnerId = invoice === undefined ? null : legacyText(invoice, 'learner_id');
    const amount = amountOf(allocation, 'amount');
    if (learnerId === null || amount === null) continue;
    add(learnerId, -amount);
  }

  for (const note of creditNotes.values()) {
    if (legacyText(note, 'status') !== 'posted') continue;
    const learnerId = legacyText(note, 'learner_id');
    const amount = amountOf(note, 'amount');
    if (learnerId === null || amount === null) continue;
    add(learnerId, -amount);
  }

  return { balances, invoiceCountByLearner };
}

/**
 * Verifies the rows the migration wrote against the legacy rows they came from.
 *
 * The checks are read back from the database, not from the plan, so they say what the database
 * holds. The acceptance is the last check: every learner's balance, in whole minor units, is what
 * the legacy invoices, payments, allocations and adjustments add up to.
 */
export async function verifyFeeMigration(
  reader: SqlReader,
  source: FeePlanSource
): Promise<FeeMigrationVerification> {
  const currency = source.baseCurrency ?? 'KES';
  const mapping = await readFeeIdMap(reader);
  const unmappable = await readFeeUnmappable(reader);
  const notes = await readFeeNotes(reader);
  const expected = expectedAmounts(source);

  const feeItems = await canonicalRows(reader, 'fee_item');
  const schedules = await canonicalRows(reader, 'fee_schedule');
  const scheduleLines = await canonicalRows(reader, 'fee_schedule_line');
  const invoices = await canonicalRows(reader, 'invoice');
  const invoiceLines = await canonicalRows(reader, 'invoice_line');
  const payments = await canonicalRows(reader, 'payment');
  const allocations = await canonicalRows(reader, 'payment_allocation');
  const receipts = await canonicalRows(reader, 'receipt');
  const creditNotes = await canonicalRows(reader, 'credit_note');
  const learners = await canonicalRows(reader, 'learner');

  const canonicalByEntity: Record<FeeEntity, Map<string, SqliteRow>> = {
    fee_item: feeItems,
    fee_schedule: schedules,
    fee_schedule_line: scheduleLines,
    invoice: invoices,
    invoice_line: invoiceLines,
    payment: payments,
    payment_allocation: allocations,
    receipt: receipts,
    credit_note: creditNotes,
  };

  const linesByInvoice = new Map<string, number>();
  for (const line of invoiceLines.values()) {
    const invoiceId = legacyText(line, 'invoice_id') ?? '';
    const amount = amountOf(line, 'amount');
    if (amount === null) continue;
    linesByInvoice.set(invoiceId, (linesByInvoice.get(invoiceId) ?? 0) + amount);
  }

  const legacyInvoiceStatus = new Map(
    source.invoices.map((invoice) => [invoice.id, (invoice.status ?? '').trim().toLowerCase()])
  );

  const checks: FeeCheck[] = [];

  for (const entry of mapping) {
    const canonical = canonicalByEntity[entry.canonicalEntity].get(entry.canonicalId);
    checks.push(
      check(
        entry.canonicalEntity,
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'row_present',
        'present',
        canonical === undefined ? 'the canonical row is missing' : 'present',
        'error'
      )
    );
    if (canonical === undefined) continue;

    const key = entryKey(entry.legacyTable, entry.legacyId);
    if (entry.canonicalEntity === 'fee_item') {
      const name = legacyText(canonical, 'name') ?? '';
      checks.push(
        check('fee_item', entry.legacyTable, entry.legacyId, entry.canonicalId, 'fee_item_name', 'a non-empty vote head name', name === '' ? 'the name is empty' : 'a non-empty vote head name', 'error'),
        check('fee_item', entry.legacyTable, entry.legacyId, entry.canonicalId, 'fee_item_code', 'a non-empty code', (legacyText(canonical, 'code') ?? '') === '' ? 'the code is empty' : 'a non-empty code', 'error')
      );
      continue;
    }

    if (entry.canonicalEntity === 'fee_schedule') {
      checks.push(
        check('fee_schedule', entry.legacyTable, entry.legacyId, entry.canonicalId, 'fee_schedule_year', 'an academic year', (legacyText(canonical, 'academic_year_id') ?? '') === '' ? 'no academic year' : 'an academic year', 'error'),
        check('fee_schedule', entry.legacyTable, entry.legacyId, entry.canonicalId, 'fee_schedule_status', 'published', legacyText(canonical, 'status') ?? '', 'error')
      );
      continue;
    }

    if (entry.canonicalEntity === 'fee_schedule_line') {
      const amount = amountOf(canonical, 'amount');
      const wanted = expected.scheduleLineMinor.get(key);
      checks.push(
        check(
          'fee_schedule_line',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'schedule_line_amount',
          wanted === undefined ? 'the legacy amount' : String(wanted),
          amount === null ? 'no amount' : String(amount),
          'error'
        ),
        check(
          'fee_schedule_line',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'schedule_line_currency',
          currency,
          currencyOf(canonical, 'amount'),
          'error'
        )
      );
      continue;
    }

    if (entry.canonicalEntity === 'invoice') {
      const total = amountOf(canonical, 'total');
      const wanted = expected.documentMinor.get(key);
      const lineTotal = linesByInvoice.get(entry.canonicalId) ?? 0;
      const status = legacyText(canonical, 'status') ?? '';
      checks.push(
        check(
          'invoice',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'invoice_amount',
          wanted === undefined ? 'the legacy amount' : String(wanted),
          total === null ? 'no amount' : String(total),
          'error'
        ),
        check(
          'invoice',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'invoice_total_equals_lines',
          total === null ? 'the total' : String(total),
          String(lineTotal),
          'error'
        ),
        check(
          'invoice',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'invoice_currency',
          currency,
          currencyOf(canonical, 'total'),
          'error'
        ),
        check(
          'invoice',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'invoice_learner',
          'a learner',
          (legacyText(canonical, 'learner_id') ?? '') === '' ? 'no learner' : 'a learner',
          'error'
        ),
        check(
          'invoice',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'invoice_final_state',
          entry.legacyTable === 'student_invoices'
            ? invoiceStatusOf(legacyInvoiceStatus.get(entry.legacyId) ?? null).status
            : 'posted',
          status,
          'error'
        ),
        check(
          'invoice',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'posted_document_frozen',
          'created_at equals updated_at',
          legacyText(canonical, 'created_at') === legacyText(canonical, 'updated_at')
            ? 'created_at equals updated_at'
            : 'the document was written more than once',
          'error'
        )
      );
      continue;
    }

    if (entry.canonicalEntity === 'invoice_line') {
      const amount = amountOf(canonical, 'amount');
      const wanted = expected.lineMinor.get(key);
      checks.push(
        check(
          'invoice_line',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'invoice_line_amount',
          wanted === undefined ? 'the legacy amount' : String(wanted),
          amount === null ? 'no amount' : String(amount),
          'error'
        ),
        check(
          'invoice_line',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'invoice_line_invoice',
          'an invoice',
          (legacyText(canonical, 'invoice_id') ?? '') === '' ? 'no invoice' : 'an invoice',
          'error'
        )
      );
      continue;
    }

    if (entry.canonicalEntity === 'payment') {
      const amount = amountOf(canonical, 'amount');
      const wanted = expected.paymentMinor.get(entry.legacyId);
      const status = legacyText(canonical, 'status') ?? '';
      checks.push(
        check(
          'payment',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'payment_amount',
          wanted ?? 'the legacy amount',
          amount === null ? 'no amount' : `${amount} ${currencyOf(canonical, 'amount')}`,
          'error'
        ),
        check(
          'payment',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'payment_status',
          'posted',
          status,
          'error'
        ),
        check(
          'payment',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'posted_document_frozen',
          'created_at equals updated_at',
          legacyText(canonical, 'created_at') === legacyText(canonical, 'updated_at')
            ? 'created_at equals updated_at'
            : 'the document was written more than once',
          'error'
        )
      );
      continue;
    }

    if (entry.canonicalEntity === 'receipt') {
      checks.push(
        check(
          'receipt',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'receipt_payment',
          'a payment',
          (legacyText(canonical, 'payment_id') ?? '') === '' ? 'no payment' : 'a payment',
          'error'
        ),
        check(
          'receipt',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'receipt_status',
          'issued',
          legacyText(canonical, 'status') ?? '',
          'error'
        )
      );
      continue;
    }

    if (entry.canonicalEntity === 'payment_allocation') {
      const amount = amountOf(canonical, 'amount');
      const wanted = expected.allocationMinor.get(entry.legacyId);
      checks.push(
        check(
          'payment_allocation',
          entry.legacyTable,
          entry.legacyId,
          entry.canonicalId,
          'allocation_amount',
          wanted === undefined ? 'the legacy amount' : String(wanted),
          amount === null ? 'no amount' : String(amount),
          'error'
        )
      );
      continue;
    }

    const status = legacyText(canonical, 'status') ?? '';
    const amount = amountOf(canonical, 'amount');
    const wanted = expected.documentMinor.get(key);
    checks.push(
      check(
        'credit_note',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'credit_note_amount',
        wanted === undefined ? 'the legacy amount' : String(wanted),
        amount === null ? 'no amount' : String(amount),
        'error'
      ),
      check(
        'credit_note',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'credit_note_status',
        'posted',
        status,
        'error'
      ),
      check(
        'credit_note',
        entry.legacyTable,
        entry.legacyId,
        entry.canonicalId,
        'posted_document_frozen',
        'created_at equals updated_at',
        legacyText(canonical, 'created_at') === legacyText(canonical, 'updated_at')
          ? 'created_at equals updated_at'
          : 'the document was written more than once',
        'error'
      )
    );
  }

  // The allocations of a payment never exceed the amount paid (spec 02 §12.8).
  const allocationChecks: FeeAllocationCheck[] = [];
  const allocationsByPayment = new Map<string, number>();
  for (const allocation of allocations.values()) {
    const paymentId = legacyText(allocation, 'payment_id') ?? '';
    const amount = amountOf(allocation, 'amount');
    if (amount === null) continue;
    allocationsByPayment.set(paymentId, (allocationsByPayment.get(paymentId) ?? 0) + amount);
  }
  const legacyPaymentByCanonical = new Map(
    mapping
      .filter((entry) => entry.canonicalEntity === 'payment')
      .map((entry) => [entry.canonicalId, entry.legacyId] as const)
  );
  for (const [paymentId, payment] of payments) {
    const paid = amountOf(payment, 'amount') ?? 0;
    const allocated = allocationsByPayment.get(paymentId) ?? 0;
    const withinPayment = allocated <= paid;
    allocationChecks.push({
      paymentId,
      legacyPaymentId: legacyPaymentByCanonical.get(paymentId) ?? '',
      paidMinor: paid,
      allocatedMinor: allocated,
      unallocatedMinor: paid - allocated,
      withinPayment,
      currency: currencyOf(payment, 'amount'),
    });
    checks.push(
      check(
        'payment',
        'student_payments',
        legacyPaymentByCanonical.get(paymentId) ?? '',
        paymentId,
        'allocation_sums_to_payment',
        'allocations at most the amount paid',
        withinPayment
          ? 'allocations at most the amount paid'
          : `${allocated} allocated against ${paid} paid`,
        'error'
      )
    );
  }

  // An allocation never settles a draft or a void invoice.
  for (const allocation of allocations.values()) {
    const invoice = invoices.get(legacyText(allocation, 'invoice_id') ?? '');
    const invoiceStatus = invoice === undefined ? '' : legacyText(invoice, 'status') ?? '';
    checks.push(
      check(
        'payment_allocation',
        'invoice_payment_applications',
        '',
        legacyText(allocation, 'id') ?? '',
        'allocation_invoice_posted',
        'a posted invoice',
        invoiceStatus === 'draft' || invoiceStatus === 'void'
          ? `the invoice is ${invoiceStatus}`
          : 'a posted invoice',
        'error'
      )
    );
  }

  // The acceptance: every learner's balance is what the legacy rows add up to.
  const before = legacyFeeBalances(source);
  const canonical = canonicalBalances(invoices, allocations, creditNotes);
  const legacyByLearner = new Map<string, string>();
  for (const [legacyStudentId, learnerId] of source.learnerByStudentId) {
    if (!legacyByLearner.has(learnerId)) legacyByLearner.set(learnerId, legacyStudentId);
  }
  const balanceRows: LearnerBalanceRows[] = [...learners.entries()]
    .map(([learnerId, learner]) => ({
      learnerId,
      legacyLearnerId: legacyByLearner.get(learnerId) ?? '',
      admissionNumber: legacyText(learner, 'admission_number') ?? '',
      beforeMinor: before.get(learnerId) ?? 0,
      afterMinor: canonical.balances.get(learnerId) ?? 0,
    }))
    .sort((left, right) => left.admissionNumber.localeCompare(right.admissionNumber));
  const comparison = compareFeeBalances(balanceRows);
  for (const balance of comparison.balances) {
    checks.push(
      check(
        'learner',
        'students',
        balance.legacyLearnerId,
        balance.learnerId,
        'learner_balance',
        String(balance.beforeMinor),
        String(balance.afterMinor),
        'error'
      )
    );
  }

  // The counts: every legacy row either became a canonical row or was reported.
  const countsBefore = legacyFeeCounts(source);
  const countsAfter = countsByEntity(mapping);
  const countsUnmapped = countsByEntity(unmappable);
  for (const entity of FEE_ENTITIES) {
    checks.push(
      check(
        entity,
        'legacy',
        '',
        '',
        'count',
        String(countsBefore[entity]),
        String(countsAfter[entity] + countsUnmapped[entity]),
        'error'
      )
    );
  }

  const stray = emptyCounts();
  for (const entity of FEE_ENTITIES) {
    stray[entity] = Math.max(0, canonicalByEntity[entity].size - countsAfter[entity]);
    checks.push(
      check(entity, 'canonical', '', '', 'stray', '0', String(stray[entity]), 'error')
    );
  }

  const issues: FeeIssue[] = notes
    .filter((note) => note.severity !== 'info' && isFeeEntity(note.entity))
    .map((note) => ({
      code: note.code,
      severity: note.severity === 'error' ? 'error' : 'warning',
      entity: note.entity as FeeEntity,
      legacyTable: note.legacyTable,
      legacyId: note.legacyId,
      message: note.message,
    }));
  const assumptions = notes.filter((note) => note.severity === 'info').map((note) => note.message);

  return {
    currency,
    counts: { before: countsBefore, after: countsAfter, stray },
    balances: comparison.balances,
    allocations: allocationChecks,
    checks,
    issues,
    assumptions,
    unmappable,
    mapping,
  };
}

/**
 * The report the migration left in the database.
 *
 * The report is read back from the database and re-derived from the legacy rows, so it says what
 * the database holds rather than what the plan intended.
 */
export async function readFeeMigrationReport(reader: SqlReader): Promise<FeeMigrationVerification> {
  const source = await readFeePlanSource(reader);
  return verifyFeeMigration(reader, source);
}
