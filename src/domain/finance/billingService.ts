// ABOUTME: Term billing service: generateTermInvoices bills active learners for a period from matching fee templates.
// ABOUTME: Templates match by period, level (applicable_level_ids) and category; runs are idempotent and support dry-run previews.

import { nextSequenceNumber, sequenceYear } from '@/domain/sequences';

export const INVOICE_PREFIX = 'INV';
const INVOICE_STATUS_DUE = 'Due';

type AnyId = string | number;

export interface BillingStudent {
  id: AnyId;
  first_name?: string | null;
  last_name?: string | null;
  admission_no?: string | null;
  status?: string | null;
  deleted_at?: string | null;
  current_class_stream_id?: AnyId | null;
  student_category_id?: AnyId | null;
}

export interface BillingClassStream {
  id: AnyId;
  class_id: AnyId;
}

export interface BillingTemplateItem {
  id: AnyId;
  description: string;
  amount: number | string;
}

export interface BillingTemplate {
  id: AnyId;
  name: string;
  school_period_id: AnyId;
  student_category_id?: AnyId | null;
  /** Levels (classes, e.g. "Form 1") the template applies to; empty or missing means every level. */
  applicable_level_ids?: AnyId[] | null;
  items?: BillingTemplateItem[] | null;
}

export interface BillingInvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  amount: number;
  fee_template_item_id?: string | null;
}

export interface BillingInvoice {
  id: string;
  student_id: string;
  school_period_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount_billed: number;
  amount_paid: number;
  status: string;
  items: BillingInvoiceItem[];
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Data access the billing service needs; implemented over the database by useTermBilling. */
export interface BillingRepository {
  listStudents(): Promise<BillingStudent[]>;
  listClassStreams(): Promise<BillingClassStream[]>;
  listFeeTemplates(): Promise<BillingTemplate[]>;
  listStudentInvoices(): Promise<BillingInvoice[]>;
  insertStudentInvoice(invoice: BillingInvoice): Promise<unknown>;
  updateStudentInvoice(id: string, patch: Partial<BillingInvoice>): Promise<unknown>;
  generateId(): string;
  now?(): string;
}

export interface GenerateTermInvoicesParams {
  periodId: AnyId;
  /** Only use these templates (otherwise every template of the period). */
  templateIds?: AnyId[];
  /** Only bill learners in these levels (classes). */
  levelIds?: AnyId[];
  /** Only bill learners in these student categories. */
  categoryIds?: AnyId[];
  /** Only bill these learners. */
  studentIds?: AnyId[];
  /** Preview only: compute the lines but write nothing. */
  dryRun: boolean;
  issueDate?: string;
  dueDate?: string;
}

export interface BillingPreviewLine {
  studentId: string;
  studentName: string;
  levelId: string | null;
  categoryId: string | null;
  /** True when a new invoice is created; false when missing items are added to the learner's existing invoice. */
  isNewInvoice: boolean;
  invoiceId: string;
  invoiceNumber: string;
  templateIds: string[];
  /** Items that this run adds. */
  items: BillingInvoiceItem[];
  /** Amount this run adds. */
  amount: number;
}

export interface GenerateTermInvoicesResult {
  dryRun: boolean;
  periodId: string;
  lines: BillingPreviewLine[];
  /** Learners in scope whose invoice already holds every applicable item. */
  alreadyBilledStudentIds: string[];
  /** Learners in scope that no template of the period applies to. */
  unmatchedStudentIds: string[];
  summary: { learners: number; invoicesCreated: number; invoicesUpdated: number; amount: number };
}

const key = (value: AnyId | null | undefined): string | null =>
  value === null || value === undefined || value === '' ? null : String(value);

const toSet = (values?: AnyId[]): Set<string> | null =>
  values && values.length ? new Set(values.map(String)) : null;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const isActive = (student: BillingStudent) =>
  !student.deleted_at && String(student.status ?? 'active').toLowerCase() === 'active';

/** True when the template applies to a learner of this level and category. */
export function templateAppliesTo(
  template: BillingTemplate,
  learner: { levelId: AnyId | null | undefined; categoryId: AnyId | null | undefined },
): boolean {
  const category = key(template.student_category_id);
  if (category !== null && category !== key(learner.categoryId)) return false;
  const levels = (template.applicable_level_ids ?? []).map(String);
  if (levels.length > 0) {
    const level = key(learner.levelId);
    if (level === null || !levels.includes(level)) return false;
  }
  return true;
}

/**
 * Bills active learners for a period: one invoice per learner per period holding the items of every
 * applicable template. Re-running adds only missing items or invoices; a dry run returns the preview only.
 */
export async function generateTermInvoices(
  repository: BillingRepository,
  params: GenerateTermInvoicesParams,
): Promise<GenerateTermInvoicesResult> {
  const periodId = key(params.periodId);
  if (periodId === null) throw new Error('A billing period is required');

  const [students, streams, templates, invoices] = await Promise.all([
    repository.listStudents(),
    repository.listClassStreams(),
    repository.listFeeTemplates(),
    repository.listStudentInvoices(),
  ]);

  const levelByStream = new Map(streams.map((stream) => [String(stream.id), String(stream.class_id)]));
  const templateFilter = toSet(params.templateIds);
  const levelFilter = toSet(params.levelIds);
  const categoryFilter = toSet(params.categoryIds);
  const studentFilter = toSet(params.studentIds);

  const periodTemplates = templates.filter((template) =>
    key(template.school_period_id) === periodId && (!templateFilter || templateFilter.has(String(template.id))));

  const invoiceByStudent = new Map<string, BillingInvoice>();
  for (const invoice of invoices) {
    if (!invoice.deleted_at && key(invoice.school_period_id) === periodId) invoiceByStudent.set(String(invoice.student_id), invoice);
  }

  const issueDate = params.issueDate || (repository.now?.() ?? new Date().toISOString()).slice(0, 10);
  const dueDate = params.dueDate || issueDate;
  const timestamp = repository.now?.() ?? new Date().toISOString();
  const invoiceNumbers = invoices.map((invoice) => invoice.invoice_number);

  const lines: BillingPreviewLine[] = [];
  const alreadyBilledStudentIds: string[] = [];
  const unmatchedStudentIds: string[] = [];
  const writes: Array<() => Promise<unknown>> = [];

  for (const student of students) {
    const studentId = String(student.id);
    if (!isActive(student) || (studentFilter && !studentFilter.has(studentId))) continue;
    const levelId = levelByStream.get(String(student.current_class_stream_id)) ?? null;
    const categoryId = key(student.student_category_id);
    if (levelFilter && (levelId === null || !levelFilter.has(levelId))) continue;
    if (categoryFilter && (categoryId === null || !categoryFilter.has(categoryId))) continue;

    const applicable = periodTemplates.filter((template) => templateAppliesTo(template, { levelId, categoryId }));
    if (!applicable.length) { unmatchedStudentIds.push(studentId); continue; }

    const existing = invoiceByStudent.get(studentId);
    const invoiceId = existing?.id ?? repository.generateId();
    const billed = new Set((existing?.items ?? []).map((item) => key(item.fee_template_item_id)).filter(Boolean));
    const newItems: BillingInvoiceItem[] = [];
    for (const template of applicable) {
      for (const item of template.items ?? []) {
        const itemKey = String(item.id);
        if (billed.has(itemKey)) continue;
        billed.add(itemKey);
        newItems.push({
          id: repository.generateId(),
          invoice_id: invoiceId,
          description: item.description,
          amount: roundMoney(Number(item.amount) || 0),
          fee_template_item_id: itemKey,
        });
      }
    }
    if (!newItems.length) { alreadyBilledStudentIds.push(studentId); continue; }

    const amount = roundMoney(newItems.reduce((sum, item) => sum + item.amount, 0));
    let invoiceNumber: string;
    if (existing) {
      invoiceNumber = existing.invoice_number;
      const patch: Partial<BillingInvoice> = {
        items: [...(existing.items ?? []), ...newItems],
        total_amount_billed: roundMoney(Number(existing.total_amount_billed || 0) + amount),
        updated_at: timestamp,
      };
      writes.push(() => repository.updateStudentInvoice(existing.id, patch));
    } else {
      invoiceNumber = nextSequenceNumber(invoiceNumbers, { prefix: INVOICE_PREFIX, year: sequenceYear(issueDate) });
      invoiceNumbers.push(invoiceNumber);
      const invoice: BillingInvoice = {
        id: invoiceId,
        student_id: studentId,
        school_period_id: periodId,
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: dueDate,
        total_amount_billed: amount,
        amount_paid: 0,
        status: INVOICE_STATUS_DUE,
        items: newItems,
        created_at: timestamp,
        updated_at: timestamp,
      };
      writes.push(() => repository.insertStudentInvoice(invoice));
    }

    lines.push({
      studentId,
      studentName: [student.first_name, student.last_name].filter(Boolean).join(' ') || student.admission_no || studentId,
      levelId,
      categoryId,
      isNewInvoice: !existing,
      invoiceId,
      invoiceNumber,
      templateIds: applicable.map((template) => String(template.id)),
      items: newItems,
      amount,
    });
  }

  if (!params.dryRun) {
    for (const write of writes) await write();
  }

  return {
    dryRun: params.dryRun,
    periodId,
    lines,
    alreadyBilledStudentIds,
    unmatchedStudentIds,
    summary: {
      learners: lines.length,
      invoicesCreated: lines.filter((line) => line.isNewInvoice).length,
      invoicesUpdated: lines.filter((line) => !line.isNewInvoice).length,
      amount: roundMoney(lines.reduce((sum, line) => sum + line.amount, 0)),
    },
  };
}
