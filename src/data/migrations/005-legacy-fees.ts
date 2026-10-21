// ABOUTME: The legacy fee source: the fee templates, invoices, payments, applications, adjustments
// ABOUTME: and opening balances migration M5 reads, and the canonical rows it resolves them through.

import type { SqliteRow, SqliteValue } from '@/data/adapters/sqlite';

import {
  legacyDay,
  legacyFlag,
  legacyId,
  legacyKey,
  legacyRef,
  legacyText,
  tableExists,
  type SqlReader,
} from './001-legacy-calendar';
import { LEGACY_ID_MAP_TABLE } from './001-institution-calendar';

/** The legacy tables migration M5 reads. */
export const LEGACY_SOURCES = {
  feeTemplates: 'fee_templates',
  feeTemplateItems: 'fee_template_items',
  invoices: 'student_invoices',
  invoiceItems: 'student_invoice_items',
  payments: 'student_payments',
  applications: 'invoice_payment_applications',
  adjustments: 'fee_adjustments',
  openingBalances: 'student_opening_balances',
} as const;

/** One item of a legacy fee template, as the nested array or the item table holds it. */
export interface LegacyTemplateItem {
  /** The legacy item id; synthesised from the template and the position when it carries none. */
  readonly id: string;
  readonly description: string | null;
  /** The amount as the legacy row spells it; the plan converts it to minor units. */
  readonly amount: SqliteValue;
  readonly templateId: string;
}

/** A legacy fee template: one school period's bill for one population. */
export interface LegacyFeeTemplate {
  readonly id: string;
  readonly name: string | null;
  readonly schoolPeriodId: string | null;
  readonly categoryName: string | null;
  /** The legacy class ids the template applies to; empty means every class. */
  readonly applicableLevelIds: readonly string[];
  readonly items: readonly LegacyTemplateItem[];
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** One item of a legacy invoice. */
export interface LegacyInvoiceItem {
  readonly id: string;
  readonly invoiceId: string | null;
  readonly description: string | null;
  readonly amount: SqliteValue;
  readonly templateItemId: string | null;
}

/** A legacy invoice. */
export interface LegacyInvoice {
  readonly id: string;
  readonly studentId: string | null;
  readonly number: string | null;
  readonly schoolPeriodId: string | null;
  readonly issueDate: string | null;
  readonly dueDate: string | null;
  readonly totalBilled: SqliteValue;
  readonly amountPaid: SqliteValue;
  readonly status: string | null;
  readonly items: readonly LegacyInvoiceItem[];
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** A legacy payment. */
export interface LegacyPayment {
  readonly id: string;
  readonly studentId: string | null;
  readonly receiptNumber: string | null;
  readonly amount: SqliteValue;
  readonly method: string | null;
  readonly transactionDate: string | null;
  /** A currency column an installation carries; the P0-era schema does not declare one. */
  readonly currency: string | null;
  readonly reference: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** A legacy statement that a payment settled part of an invoice item. */
export interface LegacyApplication {
  readonly id: string;
  readonly paymentId: string | null;
  readonly invoiceItemId: string | null;
  readonly amount: SqliteValue;
}

/** A legacy fee adjustment: a discount, an exemption, a fine. */
export interface LegacyAdjustment {
  readonly id: string;
  readonly studentId: string | null;
  readonly schoolPeriodId: string | null;
  readonly type: string | null;
  readonly amount: SqliteValue;
  readonly reason: string | null;
  readonly appliedInvoiceId: string | null;
  readonly createdAt: string | null;
}

/** A legacy opening balance brought forward. */
export interface LegacyOpeningBalance {
  readonly id: string;
  readonly studentId: string | null;
  readonly type: string | null;
  readonly amount: SqliteValue;
  readonly asOfDate: string | null;
  /** True when an invoice already carries it as a "balance brought forward" item. */
  readonly isBilled: boolean;
  readonly createdAt: string | null;
}

/** A canonical academic period, and the year it belongs to. */
export interface CanonicalPeriod {
  readonly id: string;
  readonly academicYearId: string;
  readonly startDate: string;
  readonly endDate: string;
}

/** Every legacy row migration M5 plans from, with the canonical rows it resolves them through. */
export interface FeePlanSource {
  /** The canonical institution, and the base currency its money is recorded in. */
  readonly institutionId: string | null;
  readonly baseCurrency: string | null;
  readonly templates: readonly LegacyFeeTemplate[];
  readonly invoices: readonly LegacyInvoice[];
  readonly payments: readonly LegacyPayment[];
  readonly applications: readonly LegacyApplication[];
  readonly adjustments: readonly LegacyAdjustment[];
  readonly openingBalances: readonly LegacyOpeningBalance[];
  /** The normalised legacy period id to the academic period migration M1 made of it. */
  readonly periodByLegacyId: ReadonlyMap<string, CanonicalPeriod>;
  /** The normalised legacy class id to the level migration M2 made of it. */
  readonly levelByLegacyClassId: ReadonlyMap<string, string>;
  /** The legacy student id to the learner migration M3 made of it. */
  readonly learnerByStudentId: ReadonlyMap<string, string>;
  /** The canonical learner id to the admission number it carries, for the report. */
  readonly admissionByLearnerId: ReadonlyMap<string, string>;
}

/** A legacy amount column as a bind value, or null when the row does not carry one. */
function amountValue(row: Record<string, unknown>, column: string): SqliteValue {
  const value = row[column];
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return value;
  }
  return null;
}

/** A text column of a parsed JSON object, or null when it is not a string. */
function recordText(record: Record<string, unknown>, column: string): string | null {
  const value = record[column];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** The objects a JSON array column holds. */
function jsonObjects(raw: SqliteValue): Record<string, unknown>[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === 'object' && entry !== null && !Array.isArray(entry)
    );
  } catch {
    return [];
  }
}

/** The strings a JSON array column holds, numeric entries included as their text. */
function jsonStrings(raw: SqliteValue): string[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const values: string[] = [];
    for (const entry of parsed) {
      if (typeof entry === 'string') values.push(entry);
      else if (typeof entry === 'number') values.push(String(entry));
    }
    return values;
  } catch {
    return [];
  }
}

/** The id a parsed JSON item carries, or the position the item holds in its array. */
function itemId(record: Record<string, unknown>, ownerId: string, position: number): string {
  return recordText(record, 'id') ?? `${ownerId}#${position}`;
}

/** A template item from a parsed JSON object. */
function templateItemOf(
  record: Record<string, unknown>,
  templateId: string,
  position: number
): LegacyTemplateItem {
  return {
    id: itemId(record, templateId, position),
    description: recordText(record, 'description'),
    amount: amountValue(record, 'amount'),
    templateId,
  };
}

/** The template items a legacy database holds: the nested copy, then the standalone item table. */
function templateItemsOf(
  row: SqliteRow,
  templateId: string,
  standalone: readonly LegacyTemplateItem[]
): LegacyTemplateItem[] {
  const items = jsonObjects(row['items']).map((record, position) =>
    templateItemOf(record, templateId, position)
  );
  const seen = new Set(items.map((item) => item.id));
  for (const item of standalone) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return items;
}

/** An invoice item from a parsed JSON object. */
function invoiceItemOf(
  record: Record<string, unknown>,
  invoiceId: string,
  position: number
): LegacyInvoiceItem {
  return {
    id: recordText(record, 'id') ?? `${invoiceId}#${position}`,
    invoiceId,
    description: recordText(record, 'description'),
    amount: amountValue(record, 'amount'),
    templateItemId: recordText(record, 'fee_template_item_id'),
  };
}

/** The invoice items a legacy database holds: the nested copy, then the standalone item table. */
function invoiceItemsOf(
  row: SqliteRow,
  invoiceId: string,
  standalone: readonly LegacyInvoiceItem[]
): LegacyInvoiceItem[] {
  const items = jsonObjects(row['items']).map((record, position) =>
    invoiceItemOf(record, invoiceId, position)
  );
  const seen = new Set(items.map((item) => item.id));
  for (const item of standalone) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return items;
}

/** Reads a legacy table, or nothing when the database does not hold it. */
async function readTable(reader: SqlReader, table: string): Promise<SqliteRow[]> {
  if (!(await tableExists(reader, table))) return [];
  return reader.all<SqliteRow>(`SELECT * FROM "${table}" ORDER BY id`);
}

/** The institution row migration M1 wrote: the base currency every document is recorded in. */
async function readInstitution(
  reader: SqlReader
): Promise<{ id: string; currency: string } | null> {
  if (!(await tableExists(reader, 'institution'))) return null;
  const row = await reader.get<SqliteRow>(
    `SELECT id, base_currency FROM "institution" ORDER BY rowid LIMIT 1`
  );
  if (row === null) return null;
  const id = legacyText(row, 'id');
  if (id === null) return null;
  return { id, currency: legacyText(row, 'base_currency') ?? 'KES' };
}

/** The id-map rows the plan resolves legacy fee rows through. */
interface MappedRows {
  readonly periods: ReadonlyMap<string, string>;
  readonly levels: ReadonlyMap<string, string>;
  readonly learners: ReadonlyMap<string, string>;
}

async function readIdMap(reader: SqlReader): Promise<MappedRows> {
  if (!(await tableExists(reader, LEGACY_ID_MAP_TABLE))) {
    return { periods: new Map(), levels: new Map(), learners: new Map() };
  }
  const rows = await reader.all<SqliteRow>(
    `SELECT legacy_table, legacy_id, canonical_entity, canonical_id FROM "${LEGACY_ID_MAP_TABLE}"`
  );
  const periods = new Map<string, string>();
  const levels = new Map<string, string>();
  const learners = new Map<string, string>();
  for (const row of rows) {
    const entity = legacyText(row, 'canonical_entity');
    const legacyIdValue = legacyKey(legacyText(row, 'legacy_id'));
    const canonicalId = legacyText(row, 'canonical_id');
    if (legacyIdValue === null || canonicalId === null) continue;
    if (entity === 'academic_period') periods.set(legacyIdValue, canonicalId);
    if (entity === 'level') levels.set(legacyIdValue, canonicalId);
    if (entity === 'learner') learners.set(legacyIdValue, canonicalId);
  }
  return { periods, levels, learners };
}

/** The canonical academic periods, by id. */
async function readPeriods(reader: SqlReader): Promise<Map<string, CanonicalPeriod>> {
  const periods = new Map<string, CanonicalPeriod>();
  if (!(await tableExists(reader, 'academic_period'))) return periods;
  const rows = await reader.all<SqliteRow>(
    `SELECT id, academic_year_id, start_date, end_date FROM "academic_period"`
  );
  for (const row of rows) {
    const id = legacyText(row, 'id');
    const academicYearId = legacyText(row, 'academic_year_id');
    const startDate = legacyText(row, 'start_date');
    const endDate = legacyText(row, 'end_date');
    if (id === null || academicYearId === null || startDate === null || endDate === null) continue;
    periods.set(id, { id, academicYearId, startDate, endDate });
  }
  return periods;
}

/** The admission number of every canonical learner, for the report. */
async function readAdmissions(reader: SqlReader): Promise<Map<string, string>> {
  const admissions = new Map<string, string>();
  if (!(await tableExists(reader, 'learner'))) return admissions;
  const rows = await reader.all<SqliteRow>(`SELECT id, admission_number FROM "learner"`);
  for (const row of rows) {
    const id = legacyText(row, 'id');
    if (id === null) continue;
    admissions.set(id, legacyText(row, 'admission_number') ?? '');
  }
  return admissions;
}

/** Reads every legacy fee row migration M5 plans from. */
export async function readFeePlanSource(reader: SqlReader): Promise<FeePlanSource> {
  const institution = await readInstitution(reader);
  const mapped = await readIdMap(reader);
  const periods = await readPeriods(reader);

  const periodByLegacyId = new Map<string, CanonicalPeriod>();
  for (const [legacyPeriodId, periodId] of mapped.periods) {
    const period = periods.get(periodId);
    if (period !== undefined) periodByLegacyId.set(legacyPeriodId, period);
  }

  const standaloneTemplateItems: LegacyTemplateItem[] = (
    await readTable(reader, LEGACY_SOURCES.feeTemplateItems)
  ).flatMap((row) => {
    const templateId = legacyRef(row, 'fee_template_id');
    if (templateId === null) return [];
    return [
      {
        id: legacyId(row),
        description: legacyText(row, 'description'),
        amount: amountValue(row, 'amount'),
        templateId,
      },
    ];
  });
  const templateItemsByTemplate = new Map<string, LegacyTemplateItem[]>();
  for (const item of standaloneTemplateItems) {
    const list = templateItemsByTemplate.get(item.templateId) ?? [];
    list.push(item);
    templateItemsByTemplate.set(item.templateId, list);
  }

  const templates: LegacyFeeTemplate[] = (
    await readTable(reader, LEGACY_SOURCES.feeTemplates)
  ).map((row) => {
    const id = legacyId(row);
    return {
      id,
      name: legacyText(row, 'name'),
      schoolPeriodId: legacyRef(row, 'school_period_id'),
      categoryName: legacyText(row, 'student_category_name'),
      applicableLevelIds: jsonStrings(row['applicable_level_ids'])
        .map((entry) => legacyKey(entry))
        .filter((entry): entry is string => entry !== null),
      items: templateItemsOf(row, id, templateItemsByTemplate.get(id) ?? []),
      createdAt: legacyText(row, 'created_at'),
      updatedAt: legacyText(row, 'updated_at'),
    };
  });

  const standaloneInvoiceItems: LegacyInvoiceItem[] = (
    await readTable(reader, LEGACY_SOURCES.invoiceItems)
  ).map((row) => ({
    id: legacyId(row),
    invoiceId: legacyRef(row, 'invoice_id'),
    description: legacyText(row, 'description'),
    amount: amountValue(row, 'amount'),
    templateItemId: legacyRef(row, 'fee_template_item_id'),
  }));
  const itemsByInvoice = new Map<string, LegacyInvoiceItem[]>();
  for (const item of standaloneInvoiceItems) {
    if (item.invoiceId === null) continue;
    const list = itemsByInvoice.get(item.invoiceId) ?? [];
    list.push(item);
    itemsByInvoice.set(item.invoiceId, list);
  }

  const invoices: LegacyInvoice[] = (
    await readTable(reader, LEGACY_SOURCES.invoices)
  ).map((row) => {
    const id = legacyId(row);
    return {
      id,
      studentId: legacyRef(row, 'student_id'),
      number: legacyText(row, 'invoice_number'),
      schoolPeriodId: legacyRef(row, 'school_period_id'),
      issueDate: legacyText(row, 'issue_date'),
      dueDate: legacyText(row, 'due_date'),
      totalBilled: amountValue(row, 'total_amount_billed'),
      amountPaid: amountValue(row, 'amount_paid'),
      status: legacyText(row, 'status'),
      items: invoiceItemsOf(row, id, itemsByInvoice.get(id) ?? []),
      createdAt: legacyText(row, 'created_at'),
      updatedAt: legacyText(row, 'updated_at'),
    };
  });

  const payments: LegacyPayment[] = (await readTable(reader, LEGACY_SOURCES.payments)).map(
    (row) => ({
      id: legacyId(row),
      studentId: legacyRef(row, 'student_id'),
      receiptNumber: legacyText(row, 'receipt_no'),
      amount: amountValue(row, 'total_amount_paid'),
      method: legacyText(row, 'payment_method'),
      transactionDate: legacyText(row, 'transaction_date'),
      currency: legacyText(row, 'currency'),
      reference: legacyText(row, 'reference_no'),
      createdAt: legacyText(row, 'created_at'),
      updatedAt: legacyText(row, 'updated_at'),
    })
  );

  const applications: LegacyApplication[] = (
    await readTable(reader, LEGACY_SOURCES.applications)
  ).map((row) => ({
    id: legacyId(row),
    paymentId: legacyRef(row, 'payment_id'),
    invoiceItemId: legacyRef(row, 'invoice_item_id'),
    amount: amountValue(row, 'amount_applied'),
  }));

  const adjustments: LegacyAdjustment[] = (
    await readTable(reader, LEGACY_SOURCES.adjustments)
  ).map((row) => ({
    id: legacyId(row),
    studentId: legacyRef(row, 'student_id'),
    schoolPeriodId: legacyRef(row, 'school_period_id'),
    type: legacyText(row, 'adjustment_type'),
    amount: amountValue(row, 'amount'),
    reason: legacyText(row, 'reason'),
    appliedInvoiceId: legacyRef(row, 'applied_invoice_id'),
    createdAt: legacyText(row, 'created_at'),
  }));

  const openingBalances: LegacyOpeningBalance[] = (
    await readTable(reader, LEGACY_SOURCES.openingBalances)
  ).map((row) => ({
    id: legacyId(row),
    studentId: legacyRef(row, 'student_id'),
    type: legacyText(row, 'balance_type'),
    amount: amountValue(row, 'amount'),
    asOfDate: legacyDay(row, 'as_of_date'),
    isBilled: legacyFlag(row, 'is_billed'),
    createdAt: legacyText(row, 'created_at'),
  }));

  return {
    institutionId: institution?.id ?? null,
    baseCurrency: institution?.currency ?? null,
    templates,
    invoices,
    payments,
    applications,
    adjustments,
    openingBalances,
    periodByLegacyId,
    levelByLegacyClassId: mapped.levels,
    learnerByStudentId: mapped.learners,
    admissionByLearnerId: await readAdmissions(reader),
  };
}

/** The legacy invoice item a payment application names, by legacy item id. */
export function invoiceItemsById(source: FeePlanSource): Map<string, LegacyInvoiceItem> {
  const byId = new Map<string, LegacyInvoiceItem>();
  for (const invoice of source.invoices) {
    for (const item of invoice.items) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
  }
  return byId;
}
