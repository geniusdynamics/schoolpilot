// ABOUTME: Unit tests for the term billing service generateTermInvoices (FR-17, SO-09).
// ABOUTME: Covers level/category template matching, one invoice per learner, idempotent re-runs and dry-run previews.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateTermInvoices,
  templateAppliesTo,
  INVOICE_PREFIX,
  type BillingRepository,
  type BillingStudent,
  type BillingTemplate,
  type BillingInvoice,
  type BillingClassStream,
} from '../billingService';

const TERM_1 = 'period-t1';
const FORM_1 = 'class-f1';
const FORM_2 = 'class-f2';
const BOARDER = 'cat-boarder';
const DAY = 'cat-day';

const streams: BillingClassStream[] = [
  { id: 'f1-east', class_id: FORM_1 },
  { id: 'f1-west', class_id: FORM_1 },
  { id: 'f2-east', class_id: FORM_2 },
];

const student = (id: string, stream: string, category: string, extra: Partial<BillingStudent> = {}): BillingStudent => ({
  id,
  first_name: id,
  last_name: 'Learner',
  status: 'Active',
  current_class_stream_id: stream,
  student_category_id: category,
  ...extra,
});

const form1Boarders: BillingTemplate = {
  id: 'tpl-f1-boarders',
  name: 'Form 1 Boarders Term 1',
  school_period_id: TERM_1,
  student_category_id: BOARDER,
  applicable_level_ids: [FORM_1],
  items: [
    { id: 'item-tuition', description: 'Tuition', amount: 15000 },
    { id: 'item-boarding', description: 'Boarding', amount: 12000 },
    { id: 'item-exam', description: 'Exam', amount: 1500 },
  ],
};

function createRepository(seed: {
  students: BillingStudent[];
  templates: BillingTemplate[];
  invoices?: BillingInvoice[];
}) {
  let counter = 0;
  const invoices: BillingInvoice[] = [...(seed.invoices ?? [])];
  const inserted: BillingInvoice[] = [];
  const updated: Array<{ id: string; patch: Partial<BillingInvoice> }> = [];
  const repository: BillingRepository = {
    listStudents: async () => seed.students,
    listClassStreams: async () => streams,
    listFeeTemplates: async () => seed.templates,
    listStudentInvoices: async () => invoices,
    insertStudentInvoice: async (invoice) => {
      invoices.push(invoice);
      inserted.push(invoice);
    },
    updateStudentInvoice: async (id, patch) => {
      updated.push({ id, patch });
      const index = invoices.findIndex((invoice) => invoice.id === id);
      invoices[index] = { ...invoices[index], ...patch };
    },
    generateId: () => `id-${++counter}`,
    now: () => '2027-01-05T08:00:00.000Z',
  };
  return { repository, invoices, inserted, updated };
}

describe('templateAppliesTo', () => {
  it('matches on level and category; empty levels or no category mean "all"', () => {
    const base = { id: 't', name: 't', school_period_id: TERM_1, items: [] };
    expect(templateAppliesTo(form1Boarders, { levelId: FORM_1, categoryId: BOARDER })).toBe(true);
    expect(templateAppliesTo(form1Boarders, { levelId: FORM_2, categoryId: BOARDER })).toBe(false);
    expect(templateAppliesTo(form1Boarders, { levelId: FORM_1, categoryId: DAY })).toBe(false);
    expect(templateAppliesTo({ ...base, applicable_level_ids: [] }, { levelId: FORM_2, categoryId: DAY })).toBe(true);
    expect(templateAppliesTo({ ...base, student_category_id: null }, { levelId: null, categoryId: null })).toBe(true);
  });

  it('compares ids as strings so numeric and string ids match', () => {
    const numeric = { ...form1Boarders, student_category_id: 7, applicable_level_ids: [3] };
    expect(templateAppliesTo(numeric, { levelId: '3', categoryId: '7' })).toBe(true);
  });
});

describe('generateTermInvoices', () => {
  let students: BillingStudent[];

  beforeEach(() => {
    students = [
      student('s1', 'f1-east', BOARDER),
      student('s2', 'f1-west', BOARDER),
      student('s3', 'f1-east', DAY),
      student('s4', 'f2-east', BOARDER),
      student('s5', 'f1-east', BOARDER, { status: 'Inactive' }),
      student('s6', 'f1-east', BOARDER, { deleted_at: '2026-12-01T00:00:00.000Z' }),
    ];
  });

  it('bills Term 1 for Form 1 boarders: one invoice per learner with the template items', async () => {
    const { repository, inserted } = createRepository({ students, templates: [form1Boarders] });

    const result = await generateTermInvoices(repository, { periodId: TERM_1, dryRun: false, issueDate: '2027-01-05' });

    expect(inserted.map((invoice) => invoice.student_id).sort()).toEqual(['s1', 's2']);
    for (const invoice of inserted) {
      expect(invoice.school_period_id).toBe(TERM_1);
      expect(invoice.total_amount_billed).toBe(28500);
      expect(invoice.amount_paid).toBe(0);
      expect(invoice.items.map((item) => item.description)).toEqual(['Tuition', 'Boarding', 'Exam']);
      expect(invoice.items.map((item) => item.fee_template_item_id)).toEqual(['item-tuition', 'item-boarding', 'item-exam']);
      expect(invoice.items.every((item) => item.invoice_id === invoice.id)).toBe(true);
    }
    expect(new Set(inserted.map((invoice) => invoice.invoice_number)).size).toBe(2);
    expect(inserted[0].invoice_number).toBe(`${INVOICE_PREFIX}/2027/000001`);
    expect(result.summary).toMatchObject({ invoicesCreated: 2, invoicesUpdated: 0, amount: 57000 });
    expect(result.unmatchedStudentIds.sort()).toEqual(['s3', 's4']);
  });

  it('creates nothing new when re-run', async () => {
    const { repository, inserted, updated } = createRepository({ students, templates: [form1Boarders] });
    await generateTermInvoices(repository, { periodId: TERM_1, dryRun: false });
    inserted.length = 0;

    const rerun = await generateTermInvoices(repository, { periodId: TERM_1, dryRun: false });

    expect(inserted).toHaveLength(0);
    expect(updated).toHaveLength(0);
    expect(rerun.summary).toMatchObject({ invoicesCreated: 0, invoicesUpdated: 0, amount: 0 });
    expect(rerun.alreadyBilledStudentIds.sort()).toEqual(['s1', 's2']);
  });

  it('adds only missing items to an existing invoice for the same learner and period', async () => {
    const existing: BillingInvoice = {
      id: 'inv-s1',
      student_id: 's1',
      school_period_id: TERM_1,
      invoice_number: `${INVOICE_PREFIX}/2027/000001`,
      issue_date: '2027-01-02',
      due_date: '2027-01-02',
      total_amount_billed: 15000,
      amount_paid: 0,
      status: 'Due',
      items: [{ id: 'old', invoice_id: 'inv-s1', description: 'Tuition', amount: 15000, fee_template_item_id: 'item-tuition' }],
    };
    const { repository, inserted, updated } = createRepository({ students, templates: [form1Boarders], invoices: [existing] });

    await generateTermInvoices(repository, { periodId: TERM_1, dryRun: false, studentIds: ['s1'] });

    expect(inserted).toHaveLength(0);
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe('inv-s1');
    expect(updated[0].patch.items?.map((item) => item.fee_template_item_id)).toEqual(['item-tuition', 'item-boarding', 'item-exam']);
    expect(updated[0].patch.total_amount_billed).toBe(28500);
  });

  it('a paid invoice that gains items is no longer marked Paid', async () => {
    const paid: BillingInvoice = {
      id: 'inv-paid',
      student_id: 's1',
      school_period_id: TERM_1,
      invoice_number: `${INVOICE_PREFIX}/2027/000001`,
      issue_date: '2027-01-02',
      due_date: '2027-01-02',
      total_amount_billed: 15000,
      amount_paid: 15000,
      status: 'Paid',
      items: [{ id: 'old', invoice_id: 'inv-paid', description: 'Tuition', amount: 15000, fee_template_item_id: 'item-tuition' }],
    };
    const { repository, updated } = createRepository({ students, templates: [form1Boarders], invoices: [paid] });

    await generateTermInvoices(repository, { periodId: TERM_1, dryRun: false, studentIds: ['s1'] });

    expect(updated).toHaveLength(1);
    expect(updated[0].patch.total_amount_billed).toBe(28500);
    expect(updated[0].patch.status).toBe('Partially Paid');
  });

  it('an unpaid Paid-marked invoice that gains items becomes Due; other statuses are left alone', async () => {
    const base = {
      student_id: 's1',
      school_period_id: TERM_1,
      issue_date: '2027-01-02',
      due_date: '2027-01-02',
      total_amount_billed: 15000,
      items: [{ id: 'old', invoice_id: 'x', description: 'Tuition', amount: 15000, fee_template_item_id: 'item-tuition' }],
    };
    const zeroPaid: BillingInvoice = { ...base, id: 'inv-a', invoice_number: `${INVOICE_PREFIX}/2027/000001`, amount_paid: 0, status: 'Paid' };
    const overdue: BillingInvoice = { ...base, id: 'inv-b', student_id: 's2', invoice_number: `${INVOICE_PREFIX}/2027/000002`, amount_paid: 0, status: 'Overdue' };
    const { repository, updated } = createRepository({ students, templates: [form1Boarders], invoices: [zeroPaid, overdue] });

    await generateTermInvoices(repository, { periodId: TERM_1, dryRun: false, studentIds: ['s1', 's2'] });

    const byId = Object.fromEntries(updated.map((u) => [u.id, u.patch]));
    expect(byId['inv-a'].status).toBe('Due');
    expect(byId['inv-b'].status).toBeUndefined();
  });

  it('rejects an amount that rounds to zero', async () => {
    const tiny: BillingTemplate = { ...form1Boarders, id: 'tpl-tiny', items: [{ id: 'i-tiny', description: 'Tiny', amount: 0.001 }] };
    const { repository, inserted } = createRepository({ students, templates: [tiny] });

    await expect(generateTermInvoices(repository, { periodId: TERM_1, dryRun: false })).rejects.toThrow(/invalid amount/);
    expect(inserted).toHaveLength(0);
  });

  it('dry run returns the preview and writes nothing', async () => {
    const { repository, inserted, updated } = createRepository({ students, templates: [form1Boarders] });

    const preview = await generateTermInvoices(repository, { periodId: TERM_1, dryRun: true });

    expect(inserted).toHaveLength(0);
    expect(updated).toHaveLength(0);
    expect(preview.dryRun).toBe(true);
    expect(preview.lines.map((line) => line.studentId).sort()).toEqual(['s1', 's2']);
    expect(preview.lines[0]).toMatchObject({ isNewInvoice: true, amount: 28500, levelId: FORM_1 });
    expect(preview.lines[0].items.map((item) => item.description)).toEqual(['Tuition', 'Boarding', 'Exam']);
    expect(preview.summary).toMatchObject({ invoicesCreated: 2, amount: 57000 });
  });

  it('restricts the run by level, template and learner scope', async () => {
    const allLevelsDay: BillingTemplate = {
      id: 'tpl-day', name: 'Day scholars', school_period_id: TERM_1, student_category_id: DAY,
      items: [{ id: 'item-day', description: 'Tuition (day)', amount: 9000 }],
    };
    const otherTerm: BillingTemplate = { ...form1Boarders, id: 'tpl-t2', school_period_id: 'period-t2' };
    const { repository } = createRepository({ students, templates: [form1Boarders, allLevelsDay, otherTerm] });

    const byLevel = await generateTermInvoices(repository, { periodId: TERM_1, dryRun: true, levelIds: [FORM_2] });
    expect(byLevel.lines).toHaveLength(0);
    expect(byLevel.unmatchedStudentIds).toEqual(['s4']);

    const byTemplate = await generateTermInvoices(repository, { periodId: TERM_1, dryRun: true, templateIds: ['tpl-day'] });
    expect(byTemplate.lines.map((line) => line.studentId)).toEqual(['s3']);

    const byStudent = await generateTermInvoices(repository, { periodId: TERM_1, dryRun: true, studentIds: ['s2'] });
    expect(byStudent.lines.map((line) => line.studentId)).toEqual(['s2']);
  });

  it('dry run bills each template only to learners in its applicable levels; no levels means every level', async () => {
    const form2Only: BillingTemplate = {
      id: 'tpl-f2', name: 'Form 2 Lab', school_period_id: TERM_1, student_category_id: null,
      applicable_level_ids: [FORM_2],
      items: [{ id: 'item-lab', description: 'Lab', amount: 2000 }],
    };
    const everyLevel: BillingTemplate = {
      id: 'tpl-all', name: 'Activity', school_period_id: TERM_1, student_category_id: null,
      applicable_level_ids: [],
      items: [{ id: 'item-activity', description: 'Activity', amount: 500 }],
    };
    const legacyNoLevels: BillingTemplate = {
      id: 'tpl-legacy', name: 'Library', school_period_id: TERM_1, student_category_id: null,
      applicable_level_ids: null,
      items: [{ id: 'item-library', description: 'Library', amount: 300 }],
    };
    const { repository, inserted } = createRepository({ students, templates: [form2Only, everyLevel, legacyNoLevels] });

    const preview = await generateTermInvoices(repository, { periodId: TERM_1, dryRun: true });

    expect(inserted).toHaveLength(0);
    const byStudent = Object.fromEntries(preview.lines.map((line) => [line.studentId, line]));
    expect(Object.keys(byStudent).sort()).toEqual(['s1', 's2', 's3', 's4']);
    expect(byStudent.s4.templateIds.sort()).toEqual(['tpl-all', 'tpl-f2', 'tpl-legacy']);
    expect(byStudent.s4.items.map((item) => item.description).sort()).toEqual(['Activity', 'Lab', 'Library']);
    for (const form1Learner of ['s1', 's2', 's3']) {
      expect(byStudent[form1Learner].templateIds.sort()).toEqual(['tpl-all', 'tpl-legacy']);
      expect(byStudent[form1Learner].amount).toBe(800);
    }
  });

  const invoiceFor = (id: string, itemIds: string[], extra: Partial<BillingInvoice> = {}): BillingInvoice => {
    const amounts: Record<string, number> = { 'item-tuition': 15000, 'item-boarding': 12000, 'item-exam': 1500 };
    return {
      id,
      student_id: 's1',
      school_period_id: TERM_1,
      invoice_number: `${INVOICE_PREFIX}/2027/${id}`,
      issue_date: '2027-01-02',
      due_date: '2027-01-02',
      total_amount_billed: itemIds.reduce((sum, itemId) => sum + amounts[itemId], 0),
      amount_paid: 0,
      status: 'Due',
      items: itemIds.map((itemId) => ({
        id: `${id}-${itemId}`, invoice_id: id, description: itemId, amount: amounts[itemId], fee_template_item_id: itemId,
      })),
      ...extra,
    };
  };

  it('bills each item once across every invoice the learner has for the period', async () => {
    const { repository, inserted, updated } = createRepository({
      students,
      templates: [form1Boarders],
      invoices: [invoiceFor('inv-a', ['item-tuition']), invoiceFor('inv-b', ['item-boarding'])],
    });

    const result = await generateTermInvoices(repository, { periodId: TERM_1, dryRun: false, studentIds: ['s1'] });

    expect(inserted).toHaveLength(0);
    expect(updated).toHaveLength(1);
    const added = result.lines[0].items.map((item) => item.fee_template_item_id);
    expect(added).toEqual(['item-exam']);
    expect(result.lines[0].amount).toBe(1500);
  });

  it('ignores Voided invoices: their items are billed again on a live invoice', async () => {
    const voided = invoiceFor('inv-void', ['item-tuition', 'item-boarding', 'item-exam'], { status: 'Voided' });
    const { repository, inserted, updated } = createRepository({ students, templates: [form1Boarders], invoices: [voided] });

    const result = await generateTermInvoices(repository, { periodId: TERM_1, dryRun: false, studentIds: ['s1'] });

    expect(updated).toHaveLength(0);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].id).not.toBe('inv-void');
    expect(inserted[0].total_amount_billed).toBe(28500);
    expect(result.summary).toMatchObject({ invoicesCreated: 1, invoicesUpdated: 0 });
  });

  it('adds missing items to the live invoice, never to a Voided one', async () => {
    const voided = invoiceFor('inv-void', ['item-tuition'], { status: 'Voided' });
    const live = invoiceFor('inv-live', ['item-tuition']);
    const { repository, inserted, updated } = createRepository({ students, templates: [form1Boarders], invoices: [live, voided] });

    await generateTermInvoices(repository, { periodId: TERM_1, dryRun: false, studentIds: ['s1'] });

    expect(inserted).toHaveLength(0);
    expect(updated.map((update) => update.id)).toEqual(['inv-live']);
    expect(updated[0].patch.items?.map((item) => item.fee_template_item_id)).toEqual(['item-tuition', 'item-boarding', 'item-exam']);
  });

  it('rejects templates with items missing ids, before any write and in dry run', async () => {
    const broken: BillingTemplate = {
      ...form1Boarders,
      name: 'Broken Template',
      items: [
        { id: undefined as unknown as string, description: 'Tuition', amount: 15000 },
        { id: undefined as unknown as string, description: 'Boarding', amount: 12000 },
      ],
    };
    for (const dryRun of [true, false]) {
      const { repository, inserted, updated } = createRepository({ students, templates: [broken] });
      await expect(generateTermInvoices(repository, { periodId: TERM_1, dryRun })).rejects.toThrow(/Broken Template.*Fee Templates/);
      expect(inserted).toHaveLength(0);
      expect(updated).toHaveLength(0);
    }
  });

  it.each([
    ['not a number', 'abc'],
    ['zero', 0],
    ['negative', -500],
    ['empty', ''],
  ])('rejects template items with an invalid amount (%s) before any write', async (_label, amount) => {
    const valid: BillingTemplate = { ...form1Boarders, id: 'tpl-ok', name: 'Fine', items: [{ id: 'ok', description: 'Ok', amount: 100 }] };
    const broken: BillingTemplate = {
      ...form1Boarders,
      name: 'Bad Amounts',
      items: [{ id: 'item-x', description: 'Lab', amount: amount as number }],
    };
    for (const dryRun of [true, false]) {
      const { repository, inserted, updated } = createRepository({ students, templates: [valid, broken] });
      await expect(generateTermInvoices(repository, { periodId: TERM_1, dryRun })).rejects.toThrow(/Bad Amounts.*Lab/);
      expect(inserted).toHaveLength(0);
      expect(updated).toHaveLength(0);
    }
  });

  it('requires a period', async () => {
    const { repository } = createRepository({ students, templates: [form1Boarders] });
    await expect(generateTermInvoices(repository, { periodId: '', dryRun: true })).rejects.toThrow(/period/i);
  });
});
