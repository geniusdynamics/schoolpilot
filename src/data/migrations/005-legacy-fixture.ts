// ABOUTME: The legacy fee database migration M5 runs against: the P0-era templates, invoices and
// ABOUTME: payments, plus the drift an installation can hold and the seed does not.

import type { SqliteAdapter, SqliteBindValue } from '@/data/adapters/sqlite';
import { collectionsDefinition } from '@/services/database/collections';
import { SchemaConverter } from '@/services/database/SchemaConverter';

import { FIXTURE_NOW, buildPeopleFixture, type PeopleFixtureOptions } from './003-legacy-fixture';

export { FIXTURE_NOW };

/** The legacy fee tables migration M5 reads, in the order the fixture creates them. */
export const FEE_FIXTURE_TABLES = [
  'fee_templates',
  'student_invoices',
  'student_invoice_items',
  'student_payments',
  'invoice_payment_applications',
  'fee_adjustments',
  'student_opening_balances',
] as const;

/** One item of a fixture fee template. */
export interface TemplateItemRow {
  readonly id: string;
  readonly description: string;
  readonly amount: number;
}

/** One fixture fee template. */
export interface TemplateRow {
  readonly id: number;
  readonly name: string;
  readonly schoolPeriodId: number;
  readonly categoryName?: string;
  readonly applicableLevelIds?: readonly number[];
  readonly items: readonly TemplateItemRow[];
}

/** The templates the fixture writes: two terms, sharing the tuition vote head. */
export const FEE_TEMPLATES: readonly TemplateRow[] = [
  {
    id: 900,
    name: 'Term 1 2024',
    schoolPeriodId: 1,
    categoryName: 'Day Scholar',
    applicableLevelIds: [1, 2],
    items: [
      { id: 'FTI-901', description: 'Tuition', amount: 15000.05 },
      { id: 'FTI-902', description: 'Meals', amount: 5000 },
      { id: 'FTI-903', description: 'Transport', amount: 2500.55 },
    ],
  },
  {
    id: 901,
    name: 'Term 2 2024',
    schoolPeriodId: 2,
    items: [
      { id: 'FTI-911', description: 'Tuition', amount: 15000.05 },
      { id: 'FTI-912', description: 'Examination', amount: 1200 },
    ],
  },
  {
    // The school period is not one migration M1 mapped: the template cannot become a schedule.
    id: 902,
    name: 'Orphan term',
    schoolPeriodId: 99,
    items: [{ id: 'FTI-921', description: 'Tuition', amount: 1000 }],
  },
];

/** One item of a fixture invoice. */
export interface InvoiceItemRow {
  readonly id: string;
  readonly description: string;
  readonly amount: number;
  readonly feeTemplateItemId?: string;
}

/** One fixture invoice. */
export interface InvoiceRow {
  readonly id: string;
  readonly studentId: string;
  readonly number: string;
  readonly schoolPeriodId: number;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly total: number;
  readonly amountPaid: number;
  readonly status: string;
  readonly items: readonly InvoiceItemRow[];
  /** True when the items are also written to the standalone item table. */
  readonly withStandaloneItems?: boolean;
}

/** The invoices the fixture writes. */
export const FEE_INVOICES: readonly InvoiceRow[] = [
  {
    id: 'INV-1001',
    studentId: 'S001',
    number: 'INV-2024-0001',
    schoolPeriodId: 1,
    issueDate: '2024-09-02',
    dueDate: '2024-09-30',
    total: 20000.05,
    amountPaid: 20000.05,
    status: 'Paid',
    items: [
      { id: 'INI-1001', description: 'Tuition', amount: 15000.05, feeTemplateItemId: 'FTI-901' },
      { id: 'INI-1002', description: 'Meals', amount: 5000, feeTemplateItemId: 'FTI-902' },
    ],
    withStandaloneItems: true,
  },
  {
    id: 'INV-1002',
    studentId: 'S002',
    number: 'INV-2024-0002',
    schoolPeriodId: 1,
    issueDate: '2024-09-02',
    dueDate: '2024-09-30',
    total: 15000.05,
    amountPaid: 5000.05,
    status: 'Partially Paid',
    items: [
      { id: 'INI-1003', description: 'Tuition', amount: 15000.05, feeTemplateItemId: 'FTI-901' },
    ],
  },
  {
    id: 'INV-1003',
    studentId: 'S003',
    number: 'INV-2024-0003',
    schoolPeriodId: 1,
    issueDate: '2024-09-03',
    dueDate: '2024-09-30',
    total: 1200,
    amountPaid: 1200,
    status: 'Paid',
    items: [{ id: 'INI-1009', description: 'Tuition', amount: 1200, feeTemplateItemId: 'FTI-911' }],
  },
  {
    // A draft: the school had not billed it yet, and the canonical row stays a draft.
    id: 'INV-1004',
    studentId: 'S004',
    number: 'INV-2024-0004',
    schoolPeriodId: 1,
    issueDate: '2024-09-04',
    dueDate: '2024-10-04',
    total: 800,
    amountPaid: 0,
    status: 'Draft',
    items: [{ id: 'INI-1004', description: 'Tuition', amount: 800, feeTemplateItemId: 'FTI-901' }],
  },
  {
    // An amount finer than a cent: it is rounded on the decimal string and reported.
    id: 'INV-1005',
    studentId: 'S005',
    number: 'INV-2024-0005',
    schoolPeriodId: 1,
    issueDate: '2024-09-05',
    dueDate: '2024-09-30',
    total: 1234.567,
    amountPaid: 0,
    status: 'Due',
    items: [{ id: 'INI-1005', description: 'Activity', amount: 1234.567 }],
  },
  {
    // No learner the database holds: the invoice cannot say whose money it is.
    id: 'INV-1006',
    studentId: 'S-NOPE',
    number: 'INV-2024-0006',
    schoolPeriodId: 1,
    issueDate: '2024-09-06',
    dueDate: '2024-09-30',
    total: 900,
    amountPaid: 0,
    status: 'Due',
    items: [{ id: 'INI-1006', description: 'Tuition', amount: 900 }],
  },
  {
    // A voided invoice: it is written as void and is not a charge.
    id: 'INV-1007',
    studentId: 'S007',
    number: 'INV-2024-0007',
    schoolPeriodId: 1,
    issueDate: '2024-09-07',
    dueDate: '2024-09-30',
    total: 500,
    amountPaid: 0,
    status: 'Voided',
    items: [{ id: 'INI-1007', description: 'Tuition', amount: 500 }],
  },
  {
    // The billed total disagrees with the items: the lines are the charge, and it is reported.
    id: 'INV-1008',
    studentId: 'S002',
    number: 'INV-2024-0008',
    schoolPeriodId: 1,
    issueDate: '2024-09-08',
    dueDate: '2024-09-30',
    total: 3000,
    amountPaid: 0,
    status: 'Due',
    items: [{ id: 'INI-1008', description: 'Transport', amount: 2500.55, feeTemplateItemId: 'FTI-903' }],
  },
  {
    // A billed total with no items: the charge is one synthesised line.
    id: 'INV-1009',
    studentId: 'S006',
    number: 'INV-2024-0009',
    schoolPeriodId: 1,
    issueDate: '2024-09-09',
    dueDate: '2024-09-30',
    total: 600,
    amountPaid: 0,
    status: 'Due',
    items: [],
  },
];

/** One fixture payment. */
export interface PaymentRow {
  readonly id: string;
  readonly studentId: string;
  readonly receiptNumber: string;
  readonly amount: number;
  readonly method: string;
  readonly transactionDate: string;
  readonly reference?: string;
  /** A currency column an installation carries; the P0-era schema does not declare one. */
  readonly currency?: string;
}

/** The payments the fixture writes. */
export const FEE_PAYMENTS: readonly PaymentRow[] = [
  {
    id: 'PAY-1001',
    studentId: 'S001',
    receiptNumber: 'RCT-1001',
    amount: 20000.05,
    method: 'Cash',
    transactionDate: '2024-09-10T09:15:00Z',
    reference: 'CASH-1',
  },
  {
    id: 'PAY-1002',
    studentId: 'S002',
    receiptNumber: 'RCT-1002',
    amount: 6000.05,
    method: 'M-Pesa',
    transactionDate: '2024-09-11T10:00:00Z',
    reference: 'MPESA-QK1',
  },
  {
    // The receipt number is missing: the receipt is numbered from the legacy payment.
    id: 'PAY-1003',
    studentId: 'S003',
    receiptNumber: '',
    amount: 1200,
    method: 'Bank Transfer',
    transactionDate: '2024-09-12',
  },
  {
    // A payment with no allocation at all: the money is learner credit.
    id: 'PAY-1004',
    studentId: 'S004',
    receiptNumber: 'RCT-1004',
    amount: 500,
    method: 'Cash',
    transactionDate: '2024-09-13T08:00:00Z',
  },
  {
    // A payment in a currency the institution does not use: no rate, so it is left unallocated.
    id: 'PAY-1005',
    studentId: 'S005',
    receiptNumber: 'RCT-1005',
    amount: 100,
    method: 'Card',
    transactionDate: '2024-09-14T12:00:00Z',
    currency: 'USD',
  },
  {
    // A payment an application over-allocates: the excess is reported, not written.
    id: 'PAY-1006',
    studentId: 'S002',
    receiptNumber: 'RCT-1006',
    amount: 1000,
    method: 'Cash',
    transactionDate: '2024-09-15T09:00:00Z',
  },
  {
    // A payment received by a method the canonical channels do not name.
    id: 'PAY-1007',
    studentId: 'S003',
    receiptNumber: 'RCT-1007',
    amount: 50,
    method: 'Barter',
    transactionDate: '2024-09-16T09:00:00Z',
  },
  {
    // A second receipt with a number already used above.
    id: 'PAY-1008',
    studentId: 'S005',
    receiptNumber: 'RCT-1001',
    amount: 300,
    method: 'Cash',
    transactionDate: '2024-09-17T09:00:00Z',
  },
];

/** One fixture payment application. */
export interface ApplicationRow {
  readonly id: string;
  readonly paymentId: string;
  readonly invoiceItemId: string;
  readonly amount: number;
}

/** The applications the fixture writes. */
export const FEE_APPLICATIONS: readonly ApplicationRow[] = [
  { id: 'APP-1001', paymentId: 'PAY-1001', invoiceItemId: 'INI-1001', amount: 15000.05 },
  { id: 'APP-1002', paymentId: 'PAY-1001', invoiceItemId: 'INI-1002', amount: 5000 },
  { id: 'APP-1003', paymentId: 'PAY-1002', invoiceItemId: 'INI-1003', amount: 5000.05 },
  { id: 'APP-1004', paymentId: 'PAY-1003', invoiceItemId: 'INI-1009', amount: 1200 },
  // The invoice is a draft: the canonical model refuses the allocation.
  { id: 'APP-1005', paymentId: 'PAY-1006', invoiceItemId: 'INI-1004', amount: 500 },
  // The payment is paid 1000 and the two applications add up to 1300: 300 are reported.
  { id: 'APP-1006', paymentId: 'PAY-1006', invoiceItemId: 'INI-1008', amount: 800 },
  { id: 'APP-1007', paymentId: 'PAY-1006', invoiceItemId: 'INI-1008', amount: 500 },
  // The invoice item does not exist.
  { id: 'APP-1008', paymentId: 'PAY-1007', invoiceItemId: 'INI-MISSING', amount: 50 },
];

/** One fixture fee adjustment. */
export interface AdjustmentRow {
  readonly id: string;
  readonly studentId: string;
  readonly schoolPeriodId: number;
  readonly type: string;
  readonly amount: number;
  readonly reason?: string;
  readonly appliedInvoiceId?: string;
}

/** The adjustments the fixture writes. */
export const FEE_ADJUSTMENTS: readonly AdjustmentRow[] = [
  { id: 'ADJ-1', studentId: 'S001', schoolPeriodId: 1, type: 'Discount', amount: 500, reason: 'Sibling discount' },
  { id: 'ADJ-2', studentId: 'S003', schoolPeriodId: 1, type: 'Scholarship', amount: 200, reason: 'County bursary' },
  { id: 'ADJ-3', studentId: 'S005', schoolPeriodId: 1, type: 'Fine', amount: 300, reason: 'Late payment penalty' },
  { id: 'ADJ-4', studentId: 'S002', schoolPeriodId: 1, type: 'Exemption', amount: 1000, reason: 'Staff child exemption', appliedInvoiceId: 'INV-1002' },
  { id: 'ADJ-5', studentId: 'S004', schoolPeriodId: 1, type: 'Other', amount: -150, reason: 'Library refund' },
];

/** One fixture opening balance. */
export interface OpeningBalanceRow {
  readonly id: string;
  readonly studentId: string;
  readonly balanceType: string;
  readonly amount: number;
  readonly asOfDate: string;
  readonly isBilled: boolean;
}

/** The opening balances the fixture writes. */
export const FEE_OPENING_BALANCES: readonly OpeningBalanceRow[] = [
  { id: 'OB-1', studentId: 'S002', balanceType: 'Debit', amount: 1000, asOfDate: '2024-09-01', isBilled: false },
  { id: 'OB-2', studentId: 'S003', balanceType: 'Credit', amount: 300, asOfDate: '2024-09-01', isBilled: false },
  // Already carried inside an invoice: writing it again would double the charge.
  { id: 'OB-3', studentId: 'S001', balanceType: 'Debit', amount: 700, asOfDate: '2024-08-01', isBilled: true },
];

/** How the fixture differs from the P0-era seed. */
export interface FeeFixtureOptions extends PeopleFixtureOptions {
  /** Whether the fixture holds the fee tables. */
  readonly withFees?: boolean;
  /** Whether the fixture holds the columns and rows the awkward cases need. */
  readonly withDrift?: boolean;
}

/** A value the legacy table can hold; nested objects and arrays travel as JSON text. */
function legacyValue(value: unknown): SqliteBindValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return JSON.stringify(value);
}

async function insertRows(
  adapter: SqliteAdapter,
  table: string,
  rows: readonly Record<string, unknown>[]
): Promise<void> {
  for (const row of rows) {
    const columns = Object.keys(row);
    await adapter.run(
      `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')})`
        + ` VALUES (${columns.map(() => '?').join(', ')})`,
      columns.map((column) => legacyValue(row[column]))
    );
  }
}

/** Creates a legacy table with the DDL the legacy converter produces. */
async function createLegacyTable(adapter: SqliteAdapter, table: string): Promise<void> {
  const schema = collectionsDefinition[table].schema;
  const conversion = SchemaConverter.convertRxDBToSQLite(table, schema);
  await adapter.exec(SchemaConverter.generateCreateTableSQL(conversion.sqlSchema));
}

/** The template rows, with the nested items each template carries. */
function templateRows(): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  return FEE_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    school_period_id: `${template.schoolPeriodId}.0`,
    ...(template.categoryName === undefined
      ? {}
      : { student_category_name: template.categoryName }),
    ...(template.applicableLevelIds === undefined
      ? {}
      : { applicable_level_ids: template.applicableLevelIds.map((id) => `${id}.0`) }),
    items: template.items.map((item) => ({
      id: item.id,
      fee_template_id: `${template.id}.0`,
      description: item.description,
      amount: item.amount,
    })),
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

/** The invoice rows, with the nested items each invoice carries. */
function invoiceRows(): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  return FEE_INVOICES.map((invoice) => ({
    id: invoice.id,
    student_id: invoice.studentId,
    invoice_number: invoice.number,
    school_period_id: `${invoice.schoolPeriodId}.0`,
    issue_date: invoice.issueDate,
    due_date: invoice.dueDate,
    total_amount_billed: invoice.total,
    amount_paid: invoice.amountPaid,
    status: invoice.status,
    items: invoice.items.map((item) => ({
      id: item.id,
      invoice_id: invoice.id,
      description: item.description,
      amount: item.amount,
      ...(item.feeTemplateItemId === undefined
        ? {}
        : { fee_template_item_id: item.feeTemplateItemId }),
    })),
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

/** The standalone invoice item rows: the shape an installation that writes them holds. */
function standaloneInvoiceItemRows(): Record<string, unknown>[] {
  return FEE_INVOICES.filter((invoice) => invoice.withStandaloneItems ?? false).flatMap((invoice) =>
    invoice.items.map((item) => ({
      id: item.id,
      invoice_id: invoice.id,
      description: item.description,
      amount: item.amount,
      ...(item.feeTemplateItemId === undefined
        ? {}
        : { fee_template_item_id: item.feeTemplateItemId }),
    }))
  );
}

/** The payment rows. */
function paymentRows(options: FeeFixtureOptions): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  return FEE_PAYMENTS.filter(
    (payment) => (options.withDrift ?? true) || payment.currency === undefined
  ).map((payment) => ({
    id: payment.id,
    student_id: payment.studentId,
    receipt_no: payment.receiptNumber,
    total_amount_paid: payment.amount,
    payment_method: payment.method,
    transaction_date: payment.transactionDate,
    ...(payment.reference === undefined ? {} : { reference_no: payment.reference }),
    ...(payment.currency === undefined ? {} : { currency: payment.currency }),
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

/** The adjustment rows. */
function adjustmentRows(): Record<string, unknown>[] {
  return FEE_ADJUSTMENTS.map((adjustment) => ({
    id: adjustment.id,
    student_id: adjustment.studentId,
    school_period_id: `${adjustment.schoolPeriodId}.0`,
    adjustment_type: adjustment.type,
    amount: adjustment.amount,
    ...(adjustment.reason === undefined ? {} : { reason: adjustment.reason }),
    ...(adjustment.appliedInvoiceId === undefined
      ? {}
      : { applied_invoice_id: adjustment.appliedInvoiceId }),
    created_at: FIXTURE_NOW.toISOString(),
  }));
}

/** The opening balance rows. */
function openingBalanceRows(): Record<string, unknown>[] {
  const timestamp = FIXTURE_NOW.toISOString();
  return FEE_OPENING_BALANCES.map((balance) => ({
    id: balance.id,
    student_id: balance.studentId,
    balance_type: balance.balanceType,
    amount: balance.amount,
    as_of_date: balance.asOfDate,
    is_billed: balance.isBilled,
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

/**
 * Builds the legacy database migration M5 reads.
 *
 * The rows are the fee data a P0-era school holds, plus the drift an installation can carry: an
 * invoice with no items, a draft invoice, an invoice whose total disagrees with its lines, an
 * amount finer than a cent, an invoice with no learner, a voided invoice, a payment with no
 * allocation, a payment in another currency, a payment whose applications over-allocate it, an
 * application to a draft invoice, an application whose invoice item is gone, a missing receipt
 * number, a duplicated one, a discount, a scholarship, a fine and an exemption, and an opening
 * balance of each direction.
 */
export async function buildFeeFixture(
  adapter: SqliteAdapter,
  options: FeeFixtureOptions = {}
): Promise<void> {
  await buildPeopleFixture(adapter, options);
  if (!(options.withFees ?? true)) return;

  for (const table of FEE_FIXTURE_TABLES) {
    await createLegacyTable(adapter, table);
  }
  if (options.withDrift ?? true) {
    await adapter.exec(`ALTER TABLE "student_payments" ADD COLUMN "currency" TEXT`);
  }

  await insertRows(adapter, 'fee_templates', templateRows());
  await insertRows(adapter, 'student_invoices', invoiceRows());
  await insertRows(adapter, 'student_invoice_items', standaloneInvoiceItemRows());
  await insertRows(adapter, 'student_payments', paymentRows(options));
  await insertRows(
    adapter,
    'invoice_payment_applications',
    FEE_APPLICATIONS.map((application) => ({
      id: application.id,
      payment_id: application.paymentId,
      invoice_item_id: application.invoiceItemId,
      amount_applied: application.amount,
    }))
  );
  await insertRows(adapter, 'fee_adjustments', adjustmentRows());
  await insertRows(adapter, 'student_opening_balances', openingBalanceRows());
}
