// ABOUTME: The fixture migration test for M5: the legacy fee data of the P0-era seed, the exact
// ABOUTME: minor-unit conversion, the per-learner balance equality and the rollback.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyCanonicalSchema,
  createNodeSqliteAdapter,
  type SqliteAdapter,
} from '@/data/adapters/sqlite';
import {
  createDumpBackupStrategy,
  createMigrationRunner,
  type MigrationRunner,
} from '@/data/migrations';
import { createRepository, type RepositoryInvariantError } from '@/data/repository';
import { asId } from '@/domain/ids';

import { createInstitutionCalendarMigration, LEGACY_ID_MAP_TABLE, LEGACY_NOTES_TABLE, LEGACY_UNMAPPABLE_TABLE } from './001-institution-calendar';
import { createClassGroupMigration, CREATED_TABLE } from './002-class-groups';
import {
  LEVEL_MAPPING_TABLE,
  proposeLevelMapping,
  readLevelMappingSource,
  saveLevelMapping,
  type LevelMappingEntry,
} from './002-level-mapping';
import { createLearnerMigration } from './003-learners';
import {
  assertFeeBalances,
  compareFeeBalances,
  createFeeMigration,
  readFeeMigrationReport,
} from './005-fees';
import { legacyFeeBalances, legacyFeeCounts } from './005-fee-plan';
import { readFeePlanSource } from './005-legacy-fees';
import { buildFeeFixture, FIXTURE_NOW, type FeeFixtureOptions } from './005-legacy-fixture';
import { toMinorUnits } from './005-fee-rules';

/** The only id format the canonical model stores (spec 02 §1.1). */
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

const FEE_TABLES = [
  'fee_item',
  'fee_schedule',
  'fee_schedule_line',
  'invoice',
  'invoice_line',
  'payment',
  'payment_allocation',
  'receipt',
  'credit_note',
] as const;

async function readRows(adapter: SqliteAdapter, table: string): Promise<Row[]> {
  return adapter.all<Row>(`SELECT * FROM "${table}" ORDER BY rowid`);
}

async function tableExists(adapter: SqliteAdapter, table: string): Promise<boolean> {
  const row = await adapter.get<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [table]
  );
  return row !== null;
}

/** The whole minor units a canonical money column holds. */
function amountOf(row: Row, column: string): number {
  const parsed: unknown = JSON.parse(String(row[column]));
  if (typeof parsed !== 'object' || parsed === null) throw new Error('not a money value');
  const amount = (parsed as Record<string, unknown>)['amount_minor'];
  return typeof amount === 'number' ? amount : NaN;
}

/** The currency a canonical money column holds. */
function currencyOf(row: Row, column: string): string {
  const parsed: unknown = JSON.parse(String(row[column]));
  if (typeof parsed !== 'object' || parsed === null) throw new Error('not a money value');
  return String((parsed as Record<string, unknown>)['currency']);
}

/** Runs migration M1 alone; the class groups and the people wait for the full runner. */
async function migrateCalendarOnly(adapter: SqliteAdapter): Promise<void> {
  const runner = createMigrationRunner({
    adapter,
    migrations: [createInstitutionCalendarMigration({ now: () => FIXTURE_NOW })],
    backupPolicy: 'never',
    now: () => FIXTURE_NOW,
  });
  const result = await runner.run();
  if (result.status === 'failed') throw new Error(result.failed?.error ?? 'migration M1 failed');
}

/** Saves the proposed level mapping, the way the interactive step does. */
async function confirm(adapter: SqliteAdapter): Promise<LevelMappingEntry[]> {
  const source = await readLevelMappingSource(adapter);
  const proposal = proposeLevelMapping(source, { referenceDate: '2024-10-01' });
  const entries = proposal.entries.map((entry) => ({
    ...entry,
    confirmedAt: '2024-10-01T09:00:00Z',
  }));
  await adapter.transaction(async (tx) => {
    await saveLevelMapping(tx, entries);
  });
  return entries;
}

function runnerFor(adapter: SqliteAdapter, withBackup = false): MigrationRunner {
  return createMigrationRunner({
    adapter,
    migrations: [
      createInstitutionCalendarMigration({ now: () => FIXTURE_NOW }),
      createClassGroupMigration({ now: () => FIXTURE_NOW }),
      createLearnerMigration({ now: () => FIXTURE_NOW }),
      createFeeMigration({ now: () => FIXTURE_NOW }),
    ],
    ...(withBackup ? { backup: createDumpBackupStrategy() } : { backupPolicy: 'never' as const }),
    now: () => FIXTURE_NOW,
  });
}

/** Prepares the database and runs M1, M2, M3 and M5. */
async function prepareAndRun(options: FeeFixtureOptions = {}): Promise<SqliteAdapter> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  await applyCanonicalSchema(adapter);
  await buildFeeFixture(adapter, options);
  await migrateCalendarOnly(adapter);
  await confirm(adapter);
  const result = await runnerFor(adapter).run();
  if (result.status === 'failed') throw new Error(result.failed?.error ?? 'migration M5 failed');
  return adapter;
}

function invoiceOf(rows: readonly Row[], number: string): Row {
  const found = rows.find((row) => row.number === number);
  if (found === undefined) throw new Error(`the invoice ${number} is missing`);
  return found;
}

function invoiceLinesOf(rows: readonly Row[], invoiceId: unknown): Row[] {
  return rows.filter((row) => row.invoice_id === invoiceId);
}

function paymentOf(rows: readonly Row[], amountMinor: number): Row {
  const found = rows.find((row) => amountOf(row, 'amount') === amountMinor);
  if (found === undefined) throw new Error(`the payment of ${amountMinor} is missing`);
  return found;
}

/** The balance one admission number's learner carries in the report. */
function balanceOf(report: Awaited<ReturnType<typeof readFeeMigrationReport>>, admission: string) {
  const found = report.balances.find((row) => row.admissionNumber === admission);
  if (found === undefined) throw new Error(`the learner ${admission} has no balance`);
  return found;
}

describe('migration M5: the fee documents in whole minor units', () => {
  let adapter: SqliteAdapter;

  beforeEach(async () => {
    adapter = await prepareAndRun();
  });

  afterEach(async () => {
    await adapter?.close();
  });

  it('writes a fee item, a schedule and a line for every legacy template', async () => {
    const items = await readRows(adapter, 'fee_item');
    const schedules = await readRows(adapter, 'fee_schedule');
    const lines = await readRows(adapter, 'fee_schedule_line');
    const years = await readRows(adapter, 'academic_year');
    const periods = await readRows(adapter, 'academic_period');

    expect(items).toHaveLength(4);
    expect(schedules).toHaveLength(2);
    expect(lines).toHaveLength(5);
    for (const item of items) {
      expect(String(item.id)).toMatch(UUID_V7);
      expect(String(item.code)).not.toBe('');
      expect(String(item.name)).not.toBe('');
      expect(item.institution_id).toBeTruthy();
    }
    // Two terms that both bill tuition share one vote head with one code.
    const tuition = items.filter((item) => item.name === 'Tuition');
    expect(tuition).toHaveLength(1);
    expect(new Set(items.map((item) => item.code)).size).toBe(4);

    for (const schedule of schedules) {
      expect(String(schedule.id)).toMatch(UUID_V7);
      expect(schedule.status).toBe('published');
      expect(schedule.version).toBe(1);
      const year = years.find((row) => row.id === schedule.academic_year_id);
      expect(year).toBeDefined();
      const periodIds = JSON.parse(String(schedule.academic_period_ids)) as string[];
      expect(periodIds).toHaveLength(1);
      expect(periods.some((row) => row.id === periodIds[0])).toBe(true);
    }

    // The template that names a school period migration M1 never mapped is reported.
    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    const refused = unmappable.find(
      (row) => row.canonical_entity === 'fee_schedule' && row.legacy_id === '902'
    );
    expect(refused).toBeDefined();
    expect(String(refused?.reason)).toContain('not one migration M1 mapped');
    const refusedLine = unmappable.find(
      (row) => row.canonical_entity === 'fee_schedule_line' && row.legacy_id === 'FTI-921'
    );
    expect(refusedLine).toBeDefined();
  });

  it('converts every legacy amount from its decimal text, never by multiplying a float', async () => {
    // The amount the seed writes as 15000.05 is 1500005 minor units, to the unit.
    const lines = await readRows(adapter, 'fee_schedule_line');
    const line = lines.find((row) => row.fee_item_id !== undefined && amountOf(row, 'amount') === 1500005);
    expect(line).toBeDefined();
    expect(currencyOf(line ?? {}, 'amount')).toBe('KES');

    const cases: readonly (readonly [string, number])[] = [
      ['15000.05', 1500005],
      ['15000', 1500000],
      ['15000.5', 1500050],
      ['19.99', 1999],
      ['0.01', 1],
      ['15000.049999', 1500005],
      ['1234.567', 123457],
      ['-0.005', -1],
      ['-150.00', -15000],
      ['00012.30', 1230],
    ];
    for (const [text, expected] of cases) {
      const conversion = toMinorUnits(text, 'KES');
      expect(conversion.ok, text).toBe(true);
      if (conversion.ok) expect(conversion.value.amountMinor, text).toBe(expected);
    }

    // A currency with no minor unit rounds to the whole unit, on the decimal string.
    const whole = toMinorUnits('1500.5', 'UGX');
    expect(whole.ok && whole.value.amountMinor).toBe(1501);

    // An amount that is not a plain decimal is refused, not coerced.
    expect(toMinorUnits('not a number', 'KES').ok).toBe(false);
    expect(toMinorUnits('1e5', 'KES').ok).toBe(false);
    expect(toMinorUnits(null, 'KES').ok).toBe(false);

    // The three-decimal invoice line is rounded once and reported.
    const invoices = await readRows(adapter, 'invoice');
    const activity = invoiceOf(invoices, 'INV-2024-0005');
    expect(amountOf(activity, 'total')).toBe(123457);
    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    expect(
      notes.some((note) => Number(note.migration_version) === 5 && note.code === 'amount_rounded')
    ).toBe(true);
  });

  it('writes a posted invoice and its lines for every legacy invoice it can read', async () => {
    const invoices = await readRows(adapter, 'invoice');
    const lines = await readRows(adapter, 'invoice_line');
    const learners = await readRows(adapter, 'learner');

    // Ten invoices: the eight legacy ones migration M5 could read (the void invoice is written
    // too, the one with no learner is not), the fine and the opening balance.
    expect(invoices).toHaveLength(10);
    expect(lines).toHaveLength(11);
    for (const invoice of invoices) {
      expect(String(invoice.id)).toMatch(UUID_V7);
      const owned = invoiceLinesOf(lines, invoice.id);
      expect(owned.length).toBeGreaterThan(0);
      const total = owned.reduce((sum, row) => sum + amountOf(row, 'amount'), 0);
      expect(amountOf(invoice, 'total')).toBe(total);
      expect(invoice.learner_id).toBeTruthy();
      expect(learners.some((row) => row.id === invoice.learner_id)).toBe(true);
    }

    const first = invoiceOf(invoices, 'INV-2024-0001');
    expect(first.status).toBe('paid');
    expect(amountOf(first, 'total')).toBe(2000005);
    expect(invoiceLinesOf(lines, first.id)).toHaveLength(2);

    // A legacy draft is carried as a draft: it is the one state the model still lets an
    // operator edit, and the migration never writes a posted row and then un-posts it.
    const draft = invoiceOf(invoices, 'INV-2024-0004');
    expect(draft.status).toBe('draft');

    // A voided invoice is written as void, with its line.
    const voided = invoiceOf(invoices, 'INV-2024-0007');
    expect(voided.status).toBe('void');

    // The invoice with no items keeps its charge as one line for the billed total.
    const synthesised = invoiceOf(invoices, 'INV-2024-0009');
    expect(amountOf(synthesised, 'total')).toBe(60000);
    expect(invoiceLinesOf(lines, synthesised.id)).toHaveLength(1);

    // The invoice whose total disagrees with its items follows its lines, and says so.
    const drifted = invoiceOf(invoices, 'INV-2024-0008');
    expect(amountOf(drifted, 'total')).toBe(250055);
    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    expect(
      notes.some(
        (note) =>
          Number(note.migration_version) === 5 &&
          note.code === 'invoice_total_differs_from_lines' &&
          note.legacy_id === 'INV-1008'
      )
    ).toBe(true);

    // The invoice whose learner is gone is reported, with its line.
    expect(invoices.some((row) => row.number === 'INV-2024-0006')).toBe(false);
    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    expect(
      unmappable.find(
        (row) => row.canonical_entity === 'invoice' && row.legacy_id === 'INV-1006'
      )
    ).toBeDefined();
    expect(
      unmappable.find(
        (row) => row.canonical_entity === 'invoice_line' && row.legacy_id === 'INI-1006'
      )
    ).toBeDefined();
  });

  it('writes a posted payment and an issued receipt for every legacy payment', async () => {
    const payments = await readRows(adapter, 'payment');
    const receipts = await readRows(adapter, 'receipt');

    expect(payments).toHaveLength(8);
    expect(receipts).toHaveLength(8);
    for (const payment of payments) {
      expect(String(payment.id)).toMatch(UUID_V7);
      expect(payment.status).toBe('posted');
      expect(String(payment.received_at)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      const receipt = receipts.filter((row) => row.payment_id === payment.id);
      expect(receipt).toHaveLength(1);
      expect(receipt[0].status).toBe('issued');
    }

    // The legacy channels, and the one the canonical vocabulary does not name.
    expect(payments.find((row) => row.reference === 'CASH-1')?.channel).toBe('cash');
    expect(payments.find((row) => row.reference === 'MPESA-QK1')?.channel).toBe('mobile_money');
    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    expect(
      notes.some((note) => Number(note.migration_version) === 5 && note.code === 'payment_channel_unknown')
    ).toBe(true);

    // A payment in another currency is written in its own currency and left unallocated.
    const foreign = payments.filter((row) => currencyOf(row, 'amount') === 'USD');
    expect(foreign).toHaveLength(1);
    expect(amountOf(foreign[0], 'amount')).toBe(10000);
    expect(
      notes.some(
        (note) => Number(note.migration_version) === 5 && note.code === 'payment_foreign_currency'
      )
    ).toBe(true);

    // The receipt number the legacy row carries is kept; a missing or duplicated one is
    // numbered from the payment and reported.
    expect(receipts.some((row) => row.number === 'RCT-1001')).toBe(true);
    expect(receipts.some((row) => row.number === 'RCT-LEGACY-000001')).toBe(true);
    expect(
      notes.some((note) => Number(note.migration_version) === 5 && note.code === 'receipt_number_generated')
    ).toBe(true);
    expect(
      notes.some((note) => Number(note.migration_version) === 5 && note.code === 'receipt_number_duplicate')
    ).toBe(true);
  });

  it('allocates each application and reports the ones the canonical model refuses', async () => {
    const payments = await readRows(adapter, 'payment');
    const invoices = await readRows(adapter, 'invoice');
    const allocations = await readRows(adapter, 'payment_allocation');

    // Six of the eight applications are written: a draft invoice and a missing item are not.
    expect(allocations).toHaveLength(6);
    for (const allocation of allocations) {
      expect(String(allocation.id)).toMatch(UUID_V7);
      expect(invoices.some((row) => row.id === allocation.invoice_id)).toBe(true);
      expect(payments.some((row) => row.id === allocation.payment_id)).toBe(true);
      expect(amountOf(allocation, 'amount')).toBeGreaterThan(0);
    }

    // The allocations of a payment never exceed the amount paid.
    for (const payment of payments) {
      const allocated = allocations
        .filter((row) => row.payment_id === payment.id)
        .reduce((sum, row) => sum + amountOf(row, 'amount'), 0);
      expect(allocated).toBeLessThanOrEqual(amountOf(payment, 'amount'));
    }

    // The payment paid 1000 applies 800 and then 200 of 500; the 300 it cannot cover are
    // reported rather than written.
    const second = paymentOf(payments, 100000);
    const applied = allocations
      .filter((row) => row.payment_id === second.id)
      .reduce((sum, row) => sum + amountOf(row, 'amount'), 0);
    expect(applied).toBe(100000);

    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    const over = notes.find(
      (note) => Number(note.migration_version) === 5 && note.code === 'payment_over_allocated'
    );
    expect(over).toBeDefined();
    expect(String(over?.message)).toContain('300');

    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    const toDraft = unmappable.find(
      (row) => row.canonical_entity === 'payment_allocation' && row.legacy_id === 'APP-1005'
    );
    expect(String(toDraft?.reason)).toContain('draft');
    const missingItem = unmappable.find(
      (row) => row.canonical_entity === 'payment_allocation' && row.legacy_id === 'APP-1008'
    );
    expect(String(missingItem?.reason)).toContain('INI-MISSING');

    const report = await readFeeMigrationReport(adapter);
    expect(report.allocations).toHaveLength(8);
    expect(report.allocations.every((entry) => entry.withinPayment)).toBe(true);
  });

  it('writes a posted credit note for every credit and a charge invoice for every fine', async () => {
    const creditNotes = await readRows(adapter, 'credit_note');
    const invoices = await readRows(adapter, 'invoice');
    const lines = await readRows(adapter, 'invoice_line');
    const learners = await readRows(adapter, 'learner');

    expect(creditNotes).toHaveLength(5);
    for (const note of creditNotes) {
      expect(String(note.id)).toMatch(UUID_V7);
      expect(note.status).toBe('posted');
      expect(amountOf(note, 'amount')).toBeGreaterThan(0);
      expect(learners.some((row) => row.id === note.learner_id)).toBe(true);
    }
    // The exemption names the invoice it was applied to.
    const exemption = creditNotes.find((row) => row.reason === 'Staff child exemption');
    expect(exemption?.invoice_id).toBe(invoiceOf(invoices, 'INV-2024-0002').id);

    // A fine adds to what the learner owes, so it is a posted one-line invoice, not a credit.
    const fine = lines.find((row) => row.kind === 'fine');
    expect(fine).toBeDefined();
    expect(fine?.description).toBe('Late payment penalty');
    expect(amountOf(fine ?? {}, 'amount')).toBe(30000);
    const fineInvoice = invoices.find((row) => row.id === fine?.invoice_id);
    expect(fineInvoice?.status).toBe('posted');
    expect(amountOf(fineInvoice ?? {}, 'total')).toBe(30000);
    expect(invoiceLinesOf(lines, fineInvoice?.id)).toHaveLength(1);

    // The opening balance brought forward is a charge invoice line of its own kind.
    const opening = lines.find((row) => row.kind === 'opening_balance');
    expect(opening).toBeDefined();
    expect(amountOf(opening ?? {}, 'amount')).toBe(100000);

    // A balance the school already billed is not written twice.
    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    expect(
      notes.some(
        (note) =>
          Number(note.migration_version) === 5 &&
          note.code === 'opening_balance_already_billed' &&
          note.legacy_id === 'OB-3'
      )
    ).toBe(true);
  });

  it('keeps every learner balance equal to the legacy invoices, payments and credits', async () => {
    const report = await readFeeMigrationReport(adapter);

    // The acceptance: every learner, including the ones with no fee data at all.
    expect(report.balances.length).toBeGreaterThan(60);
    expect(report.balances.filter((row) => !row.matched)).toEqual([]);

    const expectations: readonly (readonly [string, number])[] = [
      ['ADM001', -50000],
      ['ADM002', 1150055],
      ['ADM003', -50000],
      ['ADM004', 65000],
      ['ADM005', 153457],
      ['ADM006', 60000],
      ['ADM007', 0],
      ['ADM905', 0],
    ];
    for (const [admission, expected] of expectations) {
      const balance = balanceOf(report, admission);
      expect(balance.beforeMinor, admission).toBe(expected);
      expect(balance.afterMinor, admission).toBe(expected);
      expect(balance.matched, admission).toBe(true);
    }

    // The learner with no fee data carries no documents and no balance.
    const learners = await readRows(adapter, 'learner');
    const withoutFeeData = learners.find((row) => row.admission_number === 'ADM905');
    expect(withoutFeeData).toBeDefined();
    expect(
      (await readRows(adapter, 'invoice')).some(
        (row) => row.learner_id === withoutFeeData?.id
      )
    ).toBe(false);
  });

  it('verifies the counts, every document and every payment', async () => {
    const report = await readFeeMigrationReport(adapter);

    expect(report.counts.after).toEqual({
      fee_item: 4,
      fee_schedule: 2,
      fee_schedule_line: 5,
      invoice: 10,
      invoice_line: 11,
      payment: 8,
      payment_allocation: 6,
      receipt: 8,
      credit_note: 5,
    });
    for (const entity of FEE_TABLES) {
      expect(report.counts.stray[entity], entity).toBe(0);
    }

    const failures = report.checks.filter((entry) => !entry.ok && entry.severity === 'error');
    expect(failures).toEqual([]);

    const countChecks = report.checks.filter((entry) => entry.check === 'count');
    expect(countChecks).toHaveLength(FEE_TABLES.length);
    expect(countChecks.every((entry) => entry.ok)).toBe(true);

    const balanceChecks = report.checks.filter((entry) => entry.check === 'learner_balance');
    expect(balanceChecks.length).toBe(report.balances.length);

    // The legacy balances the report compared against, read from the legacy rows alone.
    const source = await readFeePlanSource(adapter);
    const legacy = legacyFeeBalances(source);
    const s001 = source.learnerByStudentId.get('S001');
    expect(s001).toBeDefined();
    expect(legacy.get(s001 ?? '')).toBe(-50000);
    expect(legacyFeeCounts(source).invoice).toBe(11);
  });

  it('writes every document in its final state, so the posting freeze never blocks it', async () => {
    const invoices = await readRows(adapter, 'invoice');
    const payments = await readRows(adapter, 'payment');
    const creditNotes = await readRows(adapter, 'credit_note');

    for (const row of [...invoices, ...payments, ...creditNotes]) {
      // The migration inserts each row once: nothing it wrote carries a second write.
      expect(row.created_at, String(row.id)).toBe(row.updated_at);
    }

    const repository = createRepository({
      adapter,
      entities: ['invoice', 'payment', 'credit_note'],
      now: () => FIXTURE_NOW,
    });
    await repository.setup();

    const posted = invoiceOf(invoices, 'INV-2024-0001');
    const refused = await repository
      .update(
        'invoice',
        asId<'invoice'>(String(posted.id)),
        { total: { amount_minor: 1, currency: 'KES' } },
        { expectedVersion: 1 }
      )
      .then(() => null)
      .catch((error: unknown) => error as RepositoryInvariantError);
    expect(refused).not.toBeNull();
    expect(refused?.invariant).toBe('finance.posted_immutable');

    // The carried draft is the one document still editable, which is why it was written as a
    // draft instead of a posted row the migration would have had to un-post.
    const draft = invoiceOf(invoices, 'INV-2024-0004');
    const updated = await repository.update(
      'invoice',
      asId<'invoice'>(String(draft.id)),
      { total: { amount_minor: 65000, currency: 'KES' } },
      { expectedVersion: 1 }
    );
    expect(updated.status).toBe('draft');
  });

  it('refuses a learner whose balance no longer matches the legacy rows', async () => {
    const invoices = await readRows(adapter, 'invoice');
    const draft = invoiceOf(invoices, 'INV-2024-0004');

    // A write the draft still allows: the invoice is editable, so its total can move. The
    // report reads the documents back and must see the learner's balance move with it.
    await adapter.run(`UPDATE "invoice" SET "total" = ? WHERE "id" = ?`, [
      JSON.stringify({ amount_minor: 90000, currency: 'KES' }),
      String(draft.id),
    ]);

    const report = await readFeeMigrationReport(adapter);
    const mismatched = report.balances.filter((row) => !row.matched);
    expect(mismatched.map((row) => row.admissionNumber)).toEqual(['ADM004']);
    expect(mismatched[0].beforeMinor).toBe(65000);
    expect(mismatched[0].afterMinor).toBe(75000);

    const comparison = compareFeeBalances([
      { learnerId: 'learner-a', legacyLearnerId: 'S001', admissionNumber: 'ADM001', beforeMinor: 100, afterMinor: 100 },
      { learnerId: 'learner-b', legacyLearnerId: 'S004', admissionNumber: 'ADM004', beforeMinor: 65000, afterMinor: 75000 },
    ]);
    expect(comparison.mismatched).toHaveLength(1);
    expect(() => assertFeeBalances(comparison.balances)).toThrow(/ADM004/);
    expect(() => assertFeeBalances(comparison.balances)).toThrow(/65000 before, 75000 after/);
  });

  it('rolls back to the state before M5 and leaves the earlier migrations and the legacy rows alone', async () => {
    const runner = runnerFor(adapter, true);
    const rolled = await runner.rollbackTo(3);
    expect(rolled.status, rolled.error).toBe('completed');

    for (const table of FEE_TABLES) {
      expect(await readRows(adapter, table), table).toHaveLength(0);
    }

    // The created-rows table stays for M2 and M3, with their rows and none of M5's.
    expect(await tableExists(adapter, CREATED_TABLE)).toBe(true);
    const created = await readRows(adapter, CREATED_TABLE);
    expect(created.some((row) => Number(row.migration_version) === 5)).toBe(false);
    expect(created.some((row) => Number(row.migration_version) === 3)).toBe(true);

    const map = await readRows(adapter, LEGACY_ID_MAP_TABLE);
    for (const entity of FEE_TABLES) {
      expect(map.some((row) => row.canonical_entity === entity), entity).toBe(false);
    }
    expect(map.some((row) => row.canonical_entity === 'learner')).toBe(true);

    const notes = await readRows(adapter, LEGACY_NOTES_TABLE);
    expect(notes.some((note) => Number(note.migration_version) === 5)).toBe(false);
    const unmappable = await readRows(adapter, LEGACY_UNMAPPABLE_TABLE);
    expect(unmappable.some((row) => row.canonical_entity === 'invoice')).toBe(false);

    // The people M3 wrote, the class groups M2 wrote and the legacy rows are untouched.
    expect(await readRows(adapter, 'learner')).toHaveLength(64);
    expect(await readRows(adapter, 'enrolment')).toHaveLength(62);
    expect(await readRows(adapter, 'class_group')).toHaveLength(7);
    expect(await readRows(adapter, LEVEL_MAPPING_TABLE)).toHaveLength(7);
    expect(await readRows(adapter, 'fee_templates')).toHaveLength(3);
    expect(await readRows(adapter, 'student_invoices')).toHaveLength(9);
    expect(await readRows(adapter, 'student_payments')).toHaveLength(8);

    // A re-run writes the same rows again.
    const again = await runner.run();
    expect(again.status).toBe('completed');
    expect(await readRows(adapter, 'invoice')).toHaveLength(10);
    expect(await readRows(adapter, 'payment')).toHaveLength(8);
    const report = await readFeeMigrationReport(adapter);
    expect(report.balances.filter((row) => !row.matched)).toEqual([]);
  });
});

describe('migration M5 on a database it cannot map', () => {
  let adapter: SqliteAdapter;

  afterEach(async () => {
    await adapter.close();
  });

  it('refuses to run before the learners migration M3', async () => {
    adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    await applyCanonicalSchema(adapter);
    await buildFeeFixture(adapter);
    await migrateCalendarOnly(adapter);
    await confirm(adapter);
    const runner = createMigrationRunner({
      adapter,
      migrations: [
        createInstitutionCalendarMigration({ now: () => FIXTURE_NOW }),
        createClassGroupMigration({ now: () => FIXTURE_NOW }),
        createFeeMigration({ now: () => FIXTURE_NOW }),
      ],
      backupPolicy: 'never',
      now: () => FIXTURE_NOW,
    });
    const result = await runner.run();
    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('run migration M3 first');
    expect(await readRows(adapter, 'invoice')).toHaveLength(0);
  });

  it('refuses to write when the canonical fee tables already hold rows', async () => {
    adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    await applyCanonicalSchema(adapter);
    await buildFeeFixture(adapter);
    await migrateCalendarOnly(adapter);
    await confirm(adapter);

    // M1 to M3 applied, M5 not: the moment a canonical fee row exists the canonical data is
    // newer than the legacy rows, and there is nothing to migrate.
    const people = createMigrationRunner({
      adapter,
      migrations: [
        createInstitutionCalendarMigration({ now: () => FIXTURE_NOW }),
        createClassGroupMigration({ now: () => FIXTURE_NOW }),
        createLearnerMigration({ now: () => FIXTURE_NOW }),
      ],
      backupPolicy: 'never',
      now: () => FIXTURE_NOW,
    });
    expect((await people.run()).status).toBe('completed');

    const institution = await adapter.get<Row>(
      `SELECT id FROM "institution" ORDER BY rowid LIMIT 1`
    );
    const learner = await adapter.get<Row>(`SELECT id FROM "learner" ORDER BY id LIMIT 1`);
    await adapter.run(
      `INSERT INTO "invoice" ("id", "institution_id", "number", "learner_id", "issue_date",
         "total", "status", "created_at", "updated_at")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '00000000-0000-7000-8000-0000000000bb',
        String(institution?.['id']),
        'INV-HAND-0001',
        String(learner?.['id']),
        '2024-09-01',
        JSON.stringify({ amount_minor: 100, currency: 'KES' }),
        'posted',
        '2024-09-01T00:00:00Z',
        '2024-09-01T00:00:00Z',
      ]
    );

    const result = await runnerFor(adapter).run();
    expect(result.status).toBe('failed');
    expect(result.failed?.error).toContain('already holds 1 row');
    expect(await readRows(adapter, 'payment')).toHaveLength(0);
  });
});

describe('migration M5 with foreign keys enforced', () => {
  it('writes and rolls back in the order the keys need', async () => {
    const adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
    await adapter.open();
    try {
      await applyCanonicalSchema(adapter);
      await buildFeeFixture(adapter);
      await migrateCalendarOnly(adapter);
      await confirm(adapter);
      const runner = runnerFor(adapter);

      const result = await runner.run();
      expect(result.status).toBe('completed');
      expect(await readRows(adapter, 'invoice')).toHaveLength(10);
      expect(await readRows(adapter, 'payment_allocation')).toHaveLength(6);

      const rolled = await runner.rollbackTo(3);
      expect(rolled.status, rolled.error).toBe('completed');
      for (const table of FEE_TABLES) {
        expect(await readRows(adapter, table), table).toHaveLength(0);
      }
      expect(await readRows(adapter, 'learner')).toHaveLength(64);
    } finally {
      await adapter.close();
    }
  });
});
