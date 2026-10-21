// ABOUTME: The plan that turns the legacy fee templates, invoices, payments, applications and
// ABOUTME: adjustments into canonical finance documents in whole minor units.

import { generateUuidv7 } from '@/domain/ids';
import type {
  CreditNote,
  FeeItem,
  FeeSchedule,
  FeeScheduleLine,
  Invoice,
  InvoiceLine,
  Payment,
  PaymentAllocation,
  Receipt,
} from '@/domain/schema';

import { canonicalTimestamp, isCalendarDay } from './001-legacy-calendar';
import {
  invoiceItemsById,
  type FeePlanSource,
  type LegacyApplication,
  type LegacyInvoice,
  type LegacyTemplateItem,
} from './005-legacy-fees';
import {
  adjustmentDirection,
  adjustmentLineKind,
  codeFrom,
  feeItemCategory,
  feeItemKey,
  fitText,
  invoiceStatusOf,
  LEGACY_ITEM_LINE_KIND,
  MIGRATED_CREDIT_NOTE_STATUS,
  MIGRATED_FUNDING_SOURCE,
  MIGRATED_LINE_FREQUENCY,
  MIGRATED_PAYMENT_STATUS,
  MIGRATED_PRORATION_RULE,
  MIGRATED_SCHEDULE_STATUS,
  paymentChannelOf,
  toMinorUnits,
} from './005-fee-rules';

/** The canonical entities migration M5 writes. */
export const FEE_ENTITIES = [
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

export type FeeEntity = (typeof FEE_ENTITIES)[number];

/** A legacy row the plan could not map onto a canonical row. */
export interface FeeUnmappableRow {
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalEntity: FeeEntity;
  readonly reason: string;
  readonly detail?: string;
}

/** A problem the plan found. An error stops the migration; a warning is reported. */
export interface FeeIssue {
  readonly code: string;
  readonly severity: 'warning' | 'error';
  readonly entity: FeeEntity;
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly message: string;
}

/** The mapping between a legacy row and the canonical row it became. */
export interface FeeMapEntry {
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly canonicalEntity: FeeEntity;
  readonly canonicalId: string;
}

/** A canonical row the migration wrote, so the rollback knows what to remove. */
export interface CreatedRow {
  readonly entity: FeeEntity;
  readonly id: string;
}

/** The rows one entity holds, counted before and after the migration. */
export type FeeCounts = Record<FeeEntity, number>;

/** A learner's balance, in whole minor units of the institution's currency. */
export interface LearnerFeeBalance {
  readonly learnerId: string;
  readonly legacyLearnerId: string;
  readonly admissionNumber: string;
  /** Charges minus credits, from the legacy rows. */
  readonly beforeMinor: number;
  /** Charges minus credits, from the canonical documents. */
  readonly afterMinor: number;
  readonly matched: boolean;
}

/** Everything the plan decided. */
export interface FeeMigrationPlan {
  readonly referenceTimestamp: string;
  readonly currency: string;
  readonly feeItems: readonly FeeItem[];
  readonly schedules: readonly FeeSchedule[];
  readonly scheduleLines: readonly FeeScheduleLine[];
  readonly invoices: readonly Invoice[];
  readonly invoiceLines: readonly InvoiceLine[];
  readonly payments: readonly Payment[];
  readonly receipts: readonly Receipt[];
  readonly allocations: readonly PaymentAllocation[];
  readonly creditNotes: readonly CreditNote[];
  readonly mapping: readonly FeeMapEntry[];
  readonly unmappable: readonly FeeUnmappableRow[];
  readonly issues: readonly FeeIssue[];
  readonly assumptions: readonly string[];
  readonly created: readonly CreatedRow[];
}

/** The options the plan needs. */
export interface FeePlanOptions {
  /** The timestamp the canonical audit columns carry when a legacy row carries none. */
  readonly referenceTimestamp: string;
}

/** What the plan collects while it walks the legacy rows. */
interface PlanContext {
  readonly options: FeePlanOptions;
  readonly currency: string;
  readonly unmappable: FeeUnmappableRow[];
  readonly issues: FeeIssue[];
  readonly assumptions: string[];
  readonly mapping: FeeMapEntry[];
}

function createPlanContext(options: FeePlanOptions, currency: string): PlanContext {
  return { options, currency, unmappable: [], issues: [], assumptions: [], mapping: [] };
}

function addUnmappable(
  context: PlanContext,
  legacyTable: string,
  legacyId: string,
  entity: FeeEntity,
  reason: string,
  detail?: string
): void {
  const duplicate = context.unmappable.some(
    (row) => row.legacyId === legacyId && row.canonicalEntity === entity && row.reason === reason
  );
  if (duplicate) return;
  context.unmappable.push({
    legacyTable,
    legacyId,
    canonicalEntity: entity,
    reason,
    ...(detail === undefined ? {} : { detail }),
  });
}

function addIssue(
  context: PlanContext,
  severity: 'warning' | 'error',
  code: string,
  entity: FeeEntity,
  legacyTable: string,
  legacyId: string,
  message: string
): void {
  const duplicate = context.issues.some(
    (issue) => issue.code === code && issue.legacyId === legacyId && issue.message === message
  );
  if (duplicate) return;
  context.issues.push({ code, severity, entity, legacyTable, legacyId, message });
}

/** The document numbers the migration allocates, kept unique per institution. */
interface DocumentNumbers {
  /** The legacy number when it is usable and free; a generated one otherwise. */
  claim(preferred: string | null, prefix: string): { readonly number: string; readonly kept: boolean };
}

function createDocumentNumbers(): DocumentNumbers {
  const used = new Set<string>();
  let sequence = 0;
  return {
    claim(preferred, prefix) {
      const fitted = preferred === null ? null : fitText(preferred, 64).text;
      if (fitted !== null && fitted !== '' && !used.has(fitted)) {
        used.add(fitted);
        return { number: fitted, kept: true };
      }
      let generated = '';
      do {
        sequence += 1;
        generated = `${prefix}-${String(sequence).padStart(6, '0')}`;
      } while (used.has(generated));
      used.add(generated);
      return { number: generated, kept: false };
    },
  };
}

/** The learner a legacy student id resolves to, or null with the row reported. */
function resolveLearner(
  context: PlanContext,
  source: FeePlanSource,
  legacyTable: string,
  legacyId: string,
  entity: FeeEntity,
  studentId: string | null
): string | null {
  if (source.institutionId === null) {
    addIssue(
      context,
      'error',
      'no_institution',
      entity,
      'institution',
      '',
      'the canonical institution table is empty, so no fee document can be attached to a school; migration M1 has to run first'
    );
    return null;
  }
  if (studentId === null) {
    addUnmappable(
      context,
      legacyTable,
      legacyId,
      entity,
      'the row names no learner, so the canonical document cannot say whose money it is'
    );
    return null;
  }
  const learnerId = source.learnerByStudentId.get(studentId);
  if (learnerId === undefined) {
    addUnmappable(
      context,
      legacyTable,
      legacyId,
      entity,
      `the learner "${studentId}" was not one migration M3 could migrate, so the document has no learner to belong to`,
      'the learner row is reported by migration M3'
    );
    return null;
  }
  return learnerId;
}

/** The period a legacy school period id resolves to, or null. */
function resolvePeriod(
  source: FeePlanSource,
  schoolPeriodId: string | null
): { id: string; academicYearId: string } | null {
  if (schoolPeriodId === null) return null;
  const period = source.periodByLegacyId.get(schoolPeriodId);
  return period === undefined ? null : { id: period.id, academicYearId: period.academicYearId };
}

/** The calendar day a legacy text names, or null. */
function dayOfText(value: string | null): string | null {
  if (value === null) return null;
  const day = value.slice(0, 10);
  return isCalendarDay(day) ? day : null;
}

/**
 * The audit timestamps a canonical document carries.
 *
 * The document is written once, at migration time: its created_at is the moment the legacy row
 * says it came into being, and its updated_at is the same moment, because the migration never
 * touches it again. A later edit to the legacy row is not a canonical write, and carrying it here
 * would claim the posted document was changed after it was posted - the one thing spec 02 §12.7
 * forbids.
 */
function auditOf(
  referenceTimestamp: string,
  createdAt: string | null
): { createdAt: string; updatedAt: string } {
  const created = canonicalTimestamp(createdAt, referenceTimestamp);
  return { createdAt: created, updatedAt: created };
}

/** The fee items, schedules and schedule lines of the legacy templates. */
interface PlannedTemplates {
  readonly items: readonly FeeItem[];
  readonly schedules: readonly FeeSchedule[];
  readonly lines: readonly FeeScheduleLine[];
  /** The legacy template item id to the fee item it became. */
  readonly feeItemByTemplateItemId: ReadonlyMap<string, string>;
}

/** The residence statuses a legacy student category names, in the canonical vocabulary. */
function residenceStatusesOf(categoryName: string | null): FeeSchedule['residence_statuses'] {
  const key = (categoryName ?? '').toLowerCase();
  if (key.includes('weekly')) return ['weekly_boarder'];
  if (key.includes('board')) return ['boarder'];
  if (key.includes('day')) return ['day'];
  return [];
}

/** The English ordinal suffix of a position, for the report text. */
function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (value % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/** The shared state the fee item and schedule line planning writes through. */
interface TemplateState {
  readonly items: FeeItem[];
  readonly lines: FeeScheduleLine[];
  readonly feeItemByKey: Map<string, FeeItem>;
  readonly feeItemByTemplateItemId: Map<string, string>;
  readonly usedCodes: Set<string>;
}

/** Plans one schedule line and the fee item it names. */
function planTemplateLine(
  context: PlanContext,
  state: TemplateState,
  entry: {
    readonly item: LegacyTemplateItem;
    readonly position: number;
    readonly scheduleId: string;
    readonly institutionId: string;
    readonly templateName: string;
  }
): void {
  const original = entry.item.description;
  const description = original === null ? '' : fitText(original, 200).text;
  if (description === '') {
    addUnmappable(
      context,
      'fee_template_items',
      entry.item.id,
      'fee_schedule_line',
      'the template item carries no description, so the vote head cannot be named',
      `the item is the ${entry.position + 1}${ordinal(entry.position + 1)} of the template "${entry.templateName}"`
    );
    return;
  }
  if (original !== null && description.length !== original.trim().length) {
    addIssue(
      context,
      'warning',
      'fee_item_name_truncated',
      'fee_item',
      'fee_template_items',
      entry.item.id,
      `the template item "${original}" is longer than 200 characters; the vote head is cut to the canonical column`
    );
  }

  const conversion = toMinorUnits(entry.item.amount, context.currency);
  if (!conversion.ok) {
    addUnmappable(
      context,
      'fee_template_items',
      entry.item.id,
      'fee_schedule_line',
      conversion.reason,
      `the item is the "${description}" line of the template "${entry.templateName}"`
    );
    return;
  }
  if (conversion.value.roundedFrom !== null) {
    addIssue(
      context,
      'warning',
      'amount_rounded',
      'fee_schedule_line',
      'fee_template_items',
      entry.item.id,
      `the amount "${conversion.value.roundedFrom}" is finer than a whole minor unit of ${context.currency}; it is written as ${conversion.value.amountMinor} minor units`
    );
  }

  const timestamp = context.options.referenceTimestamp;
  const key = feeItemKey(description);
  let feeItem = state.feeItemByKey.get(key);
  if (feeItem === undefined) {
    const baseCode = codeFrom(description);
    let code = baseCode;
    let suffix = 1;
    while (state.usedCodes.has(code)) {
      suffix += 1;
      code = `${baseCode.slice(0, 46)}_${suffix}`;
    }
    state.usedCodes.add(code);
    const category = feeItemCategory(description);
    feeItem = {
      id: generateUuidv7(),
      institution_id: entry.institutionId,
      code,
      name: description,
      category,
      refundable: category === 'deposit',
      taxable: false,
      priority: entry.position,
      funding_source: MIGRATED_FUNDING_SOURCE,
      created_at: timestamp,
      updated_at: timestamp,
    };
    state.items.push(feeItem);
    state.feeItemByKey.set(key, feeItem);
    context.mapping.push({
      legacyTable: 'fee_template_items',
      legacyId: entry.item.id,
      canonicalEntity: 'fee_item',
      canonicalId: feeItem.id,
    });
  }
  if (!state.feeItemByTemplateItemId.has(entry.item.id)) {
    state.feeItemByTemplateItemId.set(entry.item.id, feeItem.id);
  }

  const scheduleLine: FeeScheduleLine = {
    id: generateUuidv7(),
    institution_id: entry.institutionId,
    fee_schedule_id: entry.scheduleId,
    fee_item_id: feeItem.id,
    amount: { amount_minor: conversion.value.amountMinor, currency: context.currency },
    mandatory: true,
    frequency: MIGRATED_LINE_FREQUENCY,
    proration_rule: MIGRATED_PRORATION_RULE,
    created_at: timestamp,
    updated_at: timestamp,
  };
  state.lines.push(scheduleLine);
  context.mapping.push({
    legacyTable: 'fee_template_items',
    legacyId: entry.item.id,
    canonicalEntity: 'fee_schedule_line',
    canonicalId: scheduleLine.id,
  });
}

/** Reports every item of a template whose schedule could not be written. */
function reportTemplateLines(
  context: PlanContext,
  template: { readonly id: string; readonly items: readonly LegacyTemplateItem[] },
  reason: string
): void {
  for (const item of template.items) {
    addUnmappable(context, 'fee_template_items', item.id, 'fee_schedule_line', reason);
  }
}

/** Plans the fee items, schedules and schedule lines. */
function planTemplates(context: PlanContext, source: FeePlanSource): PlannedTemplates {
  const schedules: FeeSchedule[] = [];
  const state: TemplateState = {
    items: [],
    lines: [],
    feeItemByKey: new Map(),
    feeItemByTemplateItemId: new Map(),
    usedCodes: new Set(),
  };
  const usedScheduleNames = new Set<string>();
  const institutionId = source.institutionId ?? '';

  for (const template of source.templates) {
    const name = template.name === null ? '' : fitText(template.name, 200).text;
    if (name === '') {
      addUnmappable(
        context,
        'fee_templates',
        template.id,
        'fee_schedule',
        'the template carries no name, so the canonical schedule cannot be named'
      );
      reportTemplateLines(
        context,
        template,
        'the schedule of the template could not be written, so its line has no schedule to belong to'
      );
      continue;
    }
    const period = resolvePeriod(source, template.schoolPeriodId);
    if (period === null) {
      addUnmappable(
        context,
        'fee_templates',
        template.id,
        'fee_schedule',
        `the school period "${template.schoolPeriodId ?? ''}" is not one migration M1 mapped to an academic period`,
        `the template is named "${name}"`
      );
      reportTemplateLines(
        context,
        template,
        'the schedule of the template could not be written, so its line has no schedule to belong to'
      );
      continue;
    }

    const levelIds: string[] = [];
    for (const legacyClassId of template.applicableLevelIds) {
      const levelId = source.levelByLegacyClassId.get(legacyClassId);
      if (levelId === undefined) {
        addIssue(
          context,
          'warning',
          'fee_schedule_level_unresolved',
          'fee_schedule',
          'fee_templates',
          template.id,
          `the template "${name}" applies to the class "${legacyClassId}", which migration M2 did not map to a level; that class is not carried into the schedule`
        );
        continue;
      }
      if (!levelIds.includes(levelId)) levelIds.push(levelId);
    }

    // Two legacy templates can share a name; the canonical schedule is unique per name and
    // version, so a later one is numbered apart rather than merged with the first.
    let scheduleName = name;
    let copy = 1;
    while (usedScheduleNames.has(scheduleName.toLowerCase())) {
      copy += 1;
      scheduleName = fitText(`${name} (${copy})`, 200).text;
    }
    usedScheduleNames.add(scheduleName.toLowerCase());
    if (scheduleName !== name) {
      addIssue(
        context,
        'warning',
        'fee_schedule_name_duplicate',
        'fee_schedule',
        'fee_templates',
        template.id,
        `a fee schedule named "${name}" already exists; this template is written as "${scheduleName}"`
      );
    }

    const audit = auditOf(context.options.referenceTimestamp, template.createdAt);
    const schedule: FeeSchedule = {
      id: generateUuidv7(),
      institution_id: institutionId,
      name: scheduleName,
      academic_year_id: period.academicYearId,
      academic_period_ids: [period.id],
      programme_ids: [],
      level_ids: levelIds,
      residence_statuses: residenceStatusesOf(template.categoryName),
      fee_category_ids: [],
      new_learners_only: false,
      version: 1,
      status: MIGRATED_SCHEDULE_STATUS,
      created_at: audit.createdAt,
      updated_at: audit.updatedAt,
    };
    schedules.push(schedule);
    context.mapping.push({
      legacyTable: 'fee_templates',
      legacyId: template.id,
      canonicalEntity: 'fee_schedule',
      canonicalId: schedule.id,
    });

    template.items.forEach((item, position) =>
      planTemplateLine(context, state, {
        item,
        position,
        scheduleId: schedule.id,
        institutionId,
        templateName: name,
      })
    );
  }

  return {
    items: state.items,
    schedules,
    lines: state.lines,
    feeItemByTemplateItemId: state.feeItemByTemplateItemId,
  };
}

/** An invoice planned from a legacy invoice, a charge adjustment or a debit opening balance. */
interface PlannedInvoice {
  readonly legacyId: string;
  readonly legacyTable: string;
  readonly learnerId: string;
  readonly totalMinor: number;
  readonly row: Invoice;
  readonly lines: readonly InvoiceLine[];
}

/** The invoices, their lines, and the legacy rows they came from. */
interface PlannedInvoices {
  readonly invoices: readonly PlannedInvoice[];
  /** The legacy invoice id to the invoice it became. */
  readonly byLegacyId: ReadonlyMap<string, PlannedInvoice>;
  /** Legacy invoice ids the plan refused, so an application to one is refused with the reason. */
  readonly refused: ReadonlyMap<string, string>;
}

/** Reports the lines of an invoice whose document could not be written. */
function reportInvoiceLines(
  context: PlanContext,
  invoice: { readonly id: string; readonly items: readonly { readonly id: string }[] },
  reason: string
): void {
  if (invoice.items.length === 0) {
    addUnmappable(context, 'student_invoice_items', `${invoice.id}#total`, 'invoice_line', reason);
    return;
  }
  for (const item of invoice.items) {
    addUnmappable(context, 'student_invoice_items', item.id, 'invoice_line', reason);
  }
}

/** Plans the canonical invoices and their lines. */
function planInvoices(
  context: PlanContext,
  source: FeePlanSource,
  templates: PlannedTemplates,
  numbers: DocumentNumbers
): PlannedInvoices {
  const invoices: PlannedInvoice[] = [];
  const byLegacyId = new Map<string, PlannedInvoice>();
  const refused = new Map<string, string>();
  const timestamp = context.options.referenceTimestamp;
  const institutionId = source.institutionId ?? '';

  for (const legacy of source.invoices) {
    const learnerId = resolveLearner(
      context,
      source,
      'student_invoices',
      legacy.id,
      'invoice',
      legacy.studentId
    );
    if (learnerId === null) {
      refused.set(legacy.id, `the invoice "${legacy.number ?? legacy.id}" has no learner`);
      reportInvoiceLines(
        context,
        legacy,
        'the invoice it belongs to could not be written, so the line has no invoice to belong to'
      );
      continue;
    }

    const lines: InvoiceLine[] = [];
    const legacyLineIds: string[] = [];
    let failure: string | null = null;
    legacy.items.forEach((item, position) => {
      const conversion = toMinorUnits(item.amount, context.currency);
      if (!conversion.ok) {
        failure = `its ${ordinal(position + 1)} line "${item.description ?? ''}" carries ${conversion.reason}`;
        return;
      }
      if (conversion.value.roundedFrom !== null) {
        addIssue(
          context,
          'warning',
          'amount_rounded',
          'invoice_line',
          'student_invoice_items',
          item.id,
          `the amount "${conversion.value.roundedFrom}" is finer than a whole minor unit of ${context.currency}; it is written as ${conversion.value.amountMinor} minor units`
        );
      }
      const description = fitText(item.description ?? '', 500).text;
      const feeItemId =
        item.templateItemId === null
          ? undefined
          : templates.feeItemByTemplateItemId.get(item.templateItemId);
      lines.push({
        id: generateUuidv7(),
        institution_id: institutionId,
        invoice_id: '',
        ...(feeItemId === undefined ? {} : { fee_item_id: feeItemId }),
        description: description === '' ? 'Fee charge' : description,
        amount: { amount_minor: conversion.value.amountMinor, currency: context.currency },
        kind: LEGACY_ITEM_LINE_KIND,
        created_at: timestamp,
        updated_at: timestamp,
      });
      legacyLineIds.push(item.id);
    });
    if (failure !== null) {
      addUnmappable(
        context,
        'student_invoices',
        legacy.id,
        'invoice',
        `the invoice "${legacy.number ?? legacy.id}" holds a line the migration cannot express exactly: ${failure}`,
        'the whole invoice is left behind, because an invoice whose lines do not add up to its total is worse than a reported one'
      );
      refused.set(legacy.id, `the invoice "${legacy.number ?? legacy.id}" could not be written`);
      reportInvoiceLines(
        context,
        legacy,
        'the invoice it belongs to could not be written, so the line has no invoice to belong to'
      );
      continue;
    }

    const legacyTotal = toMinorUnits(legacy.totalBilled, context.currency);
    if (legacyTotal.ok && legacyTotal.value.roundedFrom !== null) {
      addIssue(
        context,
        'warning',
        'amount_rounded',
        'invoice',
        'student_invoices',
        legacy.id,
        `the billed total "${legacyTotal.value.roundedFrom}" is finer than a whole minor unit of ${context.currency}; the lines are written exactly and the total follows them`
      );
    }

    if (lines.length === 0) {
      // An invoice whose items never made it into the database still holds a charge. The
      // canonical invoice carries its money on a line, so the billed total becomes one.
      if (!legacyTotal.ok) {
        addUnmappable(
          context,
          'student_invoices',
          legacy.id,
          'invoice',
          `the invoice "${legacy.number ?? legacy.id}" carries no line and its total cannot be read: ${legacyTotal.reason}`
        );
        refused.set(legacy.id, `the invoice "${legacy.number ?? legacy.id}" could not be written`);
        reportInvoiceLines(
          context,
          legacy,
          'the invoice it belongs to could not be written, so the line has no invoice to belong to'
        );
        continue;
      }
      lines.push({
        id: generateUuidv7(),
        institution_id: institutionId,
        invoice_id: '',
        description: fitText(`Fee charge carried from invoice ${legacy.number ?? legacy.id}`, 500).text,
        amount: { amount_minor: legacyTotal.value.amountMinor, currency: context.currency },
        kind: 'other',
        created_at: timestamp,
        updated_at: timestamp,
      });
      legacyLineIds.push(`${legacy.id}#total`);
      addIssue(
        context,
        'warning',
        'invoice_line_synthesised',
        'invoice',
        'student_invoices',
        legacy.id,
        `the invoice "${legacy.number ?? legacy.id}" carries a billed total but no items; the total is written as one line so the charge is not lost`
      );
    }

    const totalMinor = lines.reduce((total, line) => total + line.amount.amount_minor, 0);
    if (legacyTotal.ok && legacyTotal.value.amountMinor !== totalMinor) {
      addIssue(
        context,
        'warning',
        'invoice_total_differs_from_lines',
        'invoice',
        'student_invoices',
        legacy.id,
        `the invoice "${legacy.number ?? legacy.id}" bills ${legacyTotal.value.amountMinor} minor units and its lines add up to ${totalMinor}; the lines are the charge, and the invoice total follows them`
      );
    }

    const status = invoiceStatusOf(legacy.status);
    if (!status.known) {
      addIssue(
        context,
        'warning',
        'invoice_status_unknown',
        'invoice',
        'student_invoices',
        legacy.id,
        `the invoice "${legacy.number ?? legacy.id}" carries the status "${legacy.status ?? ''}", which the canonical model does not name; it is written as posted`
      );
    }
    const period = resolvePeriod(source, legacy.schoolPeriodId);
    if (period === null && legacy.schoolPeriodId !== null) {
      addIssue(
        context,
        'warning',
        'invoice_period_unresolved',
        'invoice',
        'student_invoices',
        legacy.id,
        `the invoice "${legacy.number ?? legacy.id}" names the school period "${legacy.schoolPeriodId}", which migration M1 did not map to an academic period; it is written without a period`
      );
    }

    const recordedIssueDate = dayOfText(legacy.issueDate);
    const issueDate =
      recordedIssueDate ?? dayOfText(legacy.createdAt) ?? context.options.referenceTimestamp.slice(0, 10);
    if (recordedIssueDate === null) {
      addIssue(
        context,
        'warning',
        'invoice_issue_date_missing',
        'invoice',
        'student_invoices',
        legacy.id,
        `the invoice "${legacy.number ?? legacy.id}" carries no readable issue date; it is dated ${issueDate} from the row's own timestamp`
      );
    }
    const recordedDueDate = dayOfText(legacy.dueDate);
    const dueDate = recordedDueDate !== null && recordedDueDate >= issueDate ? recordedDueDate : null;
    if (recordedDueDate !== null && dueDate === null) {
      addIssue(
        context,
        'warning',
        'invoice_due_date_before_issue',
        'invoice',
        'student_invoices',
        legacy.id,
        `the invoice "${legacy.number ?? legacy.id}" falls due on ${recordedDueDate}, before it is issued on ${issueDate}; the canonical invoice carries no due date`
      );
    }

    const claimed = numbers.claim(legacy.number, 'INV-LEGACY');
    if (!claimed.kept && legacy.number !== null && legacy.number.trim() !== '') {
      addIssue(
        context,
        'warning',
        'invoice_number_duplicate',
        'invoice',
        'student_invoices',
        legacy.id,
        `the invoice number "${legacy.number.trim()}" is already held by another invoice; this one is written as "${claimed.number}"`
      );
    }

    const audit = auditOf(context.options.referenceTimestamp, legacy.createdAt);
    const invoiceId = generateUuidv7();
    const ownedLines = lines.map((line) => ({ ...line, invoice_id: invoiceId }));
    const row: Invoice = {
      id: invoiceId,
      institution_id: institutionId,
      number: claimed.number,
      learner_id: learnerId,
      ...(period === null ? {} : { academic_period_id: period.id }),
      issue_date: issueDate,
      due_date: dueDate,
      total: { amount_minor: totalMinor, currency: context.currency },
      status: status.status,
      created_at: audit.createdAt,
      updated_at: audit.updatedAt,
    };
    const planned: PlannedInvoice = {
      legacyId: legacy.id,
      legacyTable: 'student_invoices',
      learnerId,
      totalMinor,
      row,
      lines: ownedLines,
    };
    invoices.push(planned);
    byLegacyId.set(legacy.id, planned);
    context.mapping.push({
      legacyTable: 'student_invoices',
      legacyId: legacy.id,
      canonicalEntity: 'invoice',
      canonicalId: invoiceId,
    });
    ownedLines.forEach((line, index) => {
      context.mapping.push({
        legacyTable: 'student_invoice_items',
        legacyId: legacyLineIds[index] ?? `${legacy.id}#${index}`,
        canonicalEntity: 'invoice_line',
        canonicalId: line.id,
      });
    });
  }

  return { invoices, byLegacyId, refused };
}

/** The payments and their receipts. */
interface PlannedPayments {
  readonly payments: readonly Payment[];
  readonly receipts: readonly Receipt[];
  /** The legacy payment id to the payment row and the amount left to allocate. */
  readonly byLegacyId: ReadonlyMap<
    string,
    { readonly row: Payment; readonly remainingMinor: number }
  >;
}

/** Plans the canonical payments and their receipts. */
function planPayments(
  context: PlanContext,
  source: FeePlanSource,
  numbers: DocumentNumbers
): PlannedPayments {
  const payments: Payment[] = [];
  const receipts: Receipt[] = [];
  const byLegacyId = new Map<string, { row: Payment; remainingMinor: number }>();
  const timestamp = context.options.referenceTimestamp;
  const institutionId = source.institutionId ?? '';
  const baseCurrency = context.currency;

  for (const legacy of source.payments) {
    const currency = legacy.currency ?? baseCurrency;
    const conversion = toMinorUnits(legacy.amount, currency);
    if (!conversion.ok) {
      addUnmappable(
        context,
        'student_payments',
        legacy.id,
        'payment',
        `the payment "${legacy.receiptNumber ?? legacy.id}" carries ${conversion.reason}`,
        'the payment and every application it holds are left behind'
      );
      continue;
    }
    if (conversion.value.roundedFrom !== null) {
      addIssue(
        context,
        'warning',
        'amount_rounded',
        'payment',
        'student_payments',
        legacy.id,
        `the amount "${conversion.value.roundedFrom}" is finer than a whole minor unit of ${currency}; it is written as ${conversion.value.amountMinor} minor units`
      );
    }
    if (currency !== baseCurrency) {
      addIssue(
        context,
        'warning',
        'payment_foreign_currency',
        'payment',
        'student_payments',
        legacy.id,
        `the payment "${legacy.receiptNumber ?? legacy.id}" is recorded in ${currency}, and the legacy row carries no exchange rate; it is written in ${currency} and left unallocated, so no ${currency} amount settles a ${baseCurrency} invoice`
      );
    }

    const learnerId =
      legacy.studentId === null
        ? null
        : source.learnerByStudentId.get(legacy.studentId) ?? null;
    if (learnerId === null) {
      addIssue(
        context,
        'warning',
        'payment_learner_unknown',
        'payment',
        'student_payments',
        legacy.id,
        `the payment "${legacy.receiptNumber ?? legacy.id}" names the learner "${legacy.studentId ?? ''}", which migration M3 did not migrate; the money is written without a learner rather than dropped`
      );
    }

    const channel = paymentChannelOf(legacy.method);
    if (!channel.known) {
      addIssue(
        context,
        'warning',
        'payment_channel_unknown',
        'payment',
        'student_payments',
        legacy.id,
        `the payment "${legacy.receiptNumber ?? legacy.id}" was received by "${legacy.method ?? ''}", which the canonical channels do not name; it is written as cash`
      );
    }

    const receivedAt = canonicalTimestamp(legacy.transactionDate, timestamp);
    if (legacy.transactionDate === null) {
      addIssue(
        context,
        'warning',
        'payment_date_missing',
        'payment',
        'student_payments',
        legacy.id,
        `the payment "${legacy.receiptNumber ?? legacy.id}" carries no transaction date; it is dated ${receivedAt}`
      );
    }

    const audit = auditOf(context.options.referenceTimestamp, legacy.createdAt);
    const paymentId = generateUuidv7();
    const reference = legacy.reference === null ? '' : fitText(legacy.reference, 100).text;
    const row: Payment = {
      id: paymentId,
      institution_id: institutionId,
      ...(learnerId === null ? {} : { learner_id: learnerId }),
      amount: { amount_minor: conversion.value.amountMinor, currency },
      channel: channel.channel,
      ...(reference === '' ? {} : { reference }),
      received_at: receivedAt,
      status: MIGRATED_PAYMENT_STATUS,
      created_at: audit.createdAt,
      updated_at: audit.updatedAt,
    };
    payments.push(row);
    byLegacyId.set(legacy.id, { row, remainingMinor: conversion.value.amountMinor });
    context.mapping.push({
      legacyTable: 'student_payments',
      legacyId: legacy.id,
      canonicalEntity: 'payment',
      canonicalId: paymentId,
    });

    const claimed = numbers.claim(legacy.receiptNumber, 'RCT-LEGACY');
    if (!claimed.kept) {
      const missing = legacy.receiptNumber === null || legacy.receiptNumber.trim() === '';
      addIssue(
        context,
        'warning',
        missing ? 'receipt_number_generated' : 'receipt_number_duplicate',
        'receipt',
        'student_payments',
        legacy.id,
        missing
          ? `the payment "${legacy.id}" carries no receipt number; its receipt is numbered "${claimed.number}"`
          : `the receipt number "${legacy.receiptNumber?.trim() ?? ''}" is already held by another payment; this receipt is numbered "${claimed.number}"`
      );
    }
    const receipt: Receipt = {
      id: generateUuidv7(),
      institution_id: institutionId,
      number: claimed.number,
      payment_id: paymentId,
      issued_at: receivedAt,
      status: 'issued',
      created_at: audit.createdAt,
      updated_at: audit.updatedAt,
    };
    receipts.push(receipt);
    context.mapping.push({
      legacyTable: 'student_payments',
      legacyId: legacy.id,
      canonicalEntity: 'receipt',
      canonicalId: receipt.id,
    });
  }

  return { payments, receipts, byLegacyId };
}

/** Plans the payment allocations, applying each legacy application to the invoice it names. */
function planAllocations(
  context: PlanContext,
  source: FeePlanSource,
  invoices: PlannedInvoices,
  payments: PlannedPayments
): PaymentAllocation[] {
  const allocations: PaymentAllocation[] = [];
  const items = invoiceItemsById(source);
  const institutionId = source.institutionId ?? '';
  const baseCurrency = context.currency;
  const applicationsByPayment = new Map<string, LegacyApplication[]>();
  for (const application of source.applications) {
    if (application.paymentId === null) continue;
    const list = applicationsByPayment.get(application.paymentId) ?? [];
    list.push(application);
    applicationsByPayment.set(application.paymentId, list);
  }

  for (const legacy of source.payments) {
    const applications = applicationsByPayment.get(legacy.id) ?? [];
    if (applications.length === 0) continue;
    const payment = payments.byLegacyId.get(legacy.id);
    if (payment === undefined) {
      for (const application of applications) {
        addUnmappable(
          context,
          'invoice_payment_applications',
          application.id,
          'payment_allocation',
          `the payment "${legacy.receiptNumber ?? legacy.id}" could not be written, so the application has no payment to belong to`
        );
      }
      continue;
    }

    let remaining = payment.remainingMinor;
    for (const application of applications) {
      const conversion = toMinorUnits(application.amount, payment.row.amount.currency);
      if (!conversion.ok) {
        addUnmappable(
          context,
          'invoice_payment_applications',
          application.id,
          'payment_allocation',
          `the application carries ${conversion.reason}`
        );
        continue;
      }
      if (payment.row.amount.currency !== baseCurrency) {
        addUnmappable(
          context,
          'invoice_payment_applications',
          application.id,
          'payment_allocation',
          `the application credits a ${baseCurrency} invoice from a payment recorded in ${payment.row.amount.currency}, and the legacy row carries no rate to convert it`
        );
        continue;
      }

      const item =
        application.invoiceItemId === null ? undefined : items.get(application.invoiceItemId);
      const legacyInvoiceId = item?.invoiceId ?? null;
      if (legacyInvoiceId === null) {
        addUnmappable(
          context,
          'invoice_payment_applications',
          application.id,
          'payment_allocation',
          `the application names the invoice item "${application.invoiceItemId ?? ''}", which the legacy database does not hold, so the invoice it settles is unknown`
        );
        continue;
      }
      const invoice = invoices.byLegacyId.get(legacyInvoiceId);
      if (invoice === undefined) {
        addUnmappable(
          context,
          'invoice_payment_applications',
          application.id,
          'payment_allocation',
          `the invoice "${legacyInvoiceId}" the application settles could not be migrated`,
          invoices.refused.get(legacyInvoiceId) ?? 'the invoice was refused'
        );
        continue;
      }
      if (invoice.row.status === 'draft') {
        addUnmappable(
          context,
          'invoice_payment_applications',
          application.id,
          'payment_allocation',
          `the invoice "${invoice.row.number}" is a draft, and the canonical model refuses an allocation to a draft invoice`,
          'the money stays on the payment as learner credit'
        );
        continue;
      }
      if (invoice.row.status === 'void') {
        addUnmappable(
          context,
          'invoice_payment_applications',
          application.id,
          'payment_allocation',
          `the invoice "${invoice.row.number}" is void, and a void invoice is not a charge to settle`,
          'the money stays on the payment as learner credit'
        );
        continue;
      }
      if (conversion.value.amountMinor <= 0) {
        addUnmappable(
          context,
          'invoice_payment_applications',
          application.id,
          'payment_allocation',
          'the application carries no positive amount, and the canonical model refuses a zero or negative allocation'
        );
        continue;
      }

      const applied = Math.min(conversion.value.amountMinor, remaining);
      if (applied <= 0) {
        addUnmappable(
          context,
          'invoice_payment_applications',
          application.id,
          'payment_allocation',
          'the payment is already fully allocated, and the canonical model refuses an allocation beyond the amount paid',
          `the application names ${conversion.value.amountMinor} minor units of a payment of ${payment.row.amount.amount_minor}`
        );
        continue;
      }
      if (applied < conversion.value.amountMinor) {
        addIssue(
          context,
          'warning',
          'payment_over_allocated',
          'payment_allocation',
          'invoice_payment_applications',
          application.id,
          `the payment "${legacy.receiptNumber ?? legacy.id}" was paid ${payment.row.amount.amount_minor} minor units and its applications add up to more; ${applied} are written and ${conversion.value.amountMinor - applied} are reported, because the canonical model refuses an allocation beyond the amount paid`
        );
      }

      const allocation: PaymentAllocation = {
        id: generateUuidv7(),
        institution_id: institutionId,
        payment_id: payment.row.id,
        invoice_id: invoice.row.id,
        amount: { amount_minor: applied, currency: baseCurrency },
        allocated_at: payment.row.received_at,
        created_at: payment.row.created_at,
        updated_at: payment.row.updated_at,
      };
      allocations.push(allocation);
      remaining -= applied;
      context.mapping.push({
        legacyTable: 'invoice_payment_applications',
        legacyId: application.id,
        canonicalEntity: 'payment_allocation',
        canonicalId: allocation.id,
      });
    }
  }

  return allocations;
}

/** The credit notes and the charged adjustments, which become one-line invoices. */
interface PlannedAdjustments {
  readonly creditNotes: readonly CreditNote[];
  readonly invoices: readonly PlannedInvoice[];
}

/** Plans the legacy fee adjustments. */
function planAdjustments(
  context: PlanContext,
  source: FeePlanSource,
  invoices: PlannedInvoices,
  numbers: DocumentNumbers
): PlannedAdjustments {
  const creditNotes: CreditNote[] = [];
  const charged: PlannedInvoice[] = [];
  const timestamp = context.options.referenceTimestamp;
  const institutionId = source.institutionId ?? '';

  for (const adjustment of source.adjustments) {
    // The direction decides which canonical document the row becomes, so it decides which entity
    // a refusal is reported against: a credit is a credit note, a charge is an invoice.
    const direction = adjustmentDirection(adjustment.type, adjustment.amount);
    const documentEntity: FeeEntity = direction === 'credit' ? 'credit_note' : 'invoice';
    const learnerId = resolveLearner(
      context,
      source,
      'fee_adjustments',
      adjustment.id,
      documentEntity,
      adjustment.studentId
    );
    if (learnerId === null) {
      if (documentEntity === 'invoice') {
        addUnmappable(
          context,
          'fee_adjustments',
          adjustment.id,
          'invoice_line',
          'the charge it becomes could not be written, so the line has no invoice to belong to'
        );
      }
      continue;
    }

    const conversion = toMinorUnits(adjustment.amount, context.currency);
    if (!conversion.ok) {
      addUnmappable(
        context,
        'fee_adjustments',
        adjustment.id,
        documentEntity,
        `the adjustment carries ${conversion.reason}`
      );
      if (documentEntity === 'invoice') {
        addUnmappable(
          context,
          'fee_adjustments',
          adjustment.id,
          'invoice_line',
          'the charge it becomes could not be written, so the line has no invoice to belong to'
        );
      }
      continue;
    }
    const magnitude = Math.abs(conversion.value.amountMinor);
    if (magnitude === 0) {
      addUnmappable(
        context,
        'fee_adjustments',
        adjustment.id,
        documentEntity,
        'the adjustment carries no amount, so there is nothing to post'
      );
      if (documentEntity === 'invoice') {
        addUnmappable(
          context,
          'fee_adjustments',
          adjustment.id,
          'invoice_line',
          'the charge it becomes could not be written, so the line has no invoice to belong to'
        );
      }
      continue;
    }
    const label = adjustment.reason === null
      ? `${adjustment.type ?? 'Adjustment'} carried from the legacy fee adjustments`
      : fitText(adjustment.reason, 500).text;
    const reason = label === '' ? 'Adjustment carried from the legacy fee adjustments' : label;
    const issueDate =
      dayOfText(adjustment.createdAt) ?? context.options.referenceTimestamp.slice(0, 10);
    const audit = auditOf(context.options.referenceTimestamp, adjustment.createdAt);

    if (direction === 'credit') {
      const invoiceId =
        adjustment.appliedInvoiceId === null
          ? undefined
          : invoices.byLegacyId.get(adjustment.appliedInvoiceId)?.row.id;
      const claimed = numbers.claim(null, 'CNT-LEGACY');
      const note: CreditNote = {
        id: generateUuidv7(),
        institution_id: institutionId,
        number: claimed.number,
        learner_id: learnerId,
        ...(invoiceId === undefined ? {} : { invoice_id: invoiceId }),
        amount: { amount_minor: magnitude, currency: context.currency },
        reason,
        issue_date: issueDate,
        status: MIGRATED_CREDIT_NOTE_STATUS,
        created_at: audit.createdAt,
        updated_at: audit.updatedAt,
      };
      creditNotes.push(note);
      context.mapping.push({
        legacyTable: 'fee_adjustments',
        legacyId: adjustment.id,
        canonicalEntity: 'credit_note',
        canonicalId: note.id,
      });
      continue;
    }

    // A charge (a fine, a penalty, a positive `Other`) cannot be a credit note: it adds to what
    // the learner owes. It becomes a one-line posted invoice, the canonical charge document.
    const period = resolvePeriod(source, adjustment.schoolPeriodId);
    const claimed = numbers.claim(null, 'INV-LEGACY');
    const invoiceId = generateUuidv7();
    const line: InvoiceLine = {
      id: generateUuidv7(),
      institution_id: institutionId,
      invoice_id: invoiceId,
      description: fitText(reason, 500).text,
      amount: { amount_minor: magnitude, currency: context.currency },
      kind: adjustmentLineKind(adjustment.type),
      created_at: timestamp,
      updated_at: timestamp,
    };
    const row: Invoice = {
      id: invoiceId,
      institution_id: institutionId,
      number: claimed.number,
      learner_id: learnerId,
      ...(period === null ? {} : { academic_period_id: period.id }),
      issue_date: issueDate,
      total: { amount_minor: magnitude, currency: context.currency },
      status: 'posted',
      created_at: audit.createdAt,
      updated_at: audit.updatedAt,
    };
    charged.push({
      legacyId: adjustment.id,
      legacyTable: 'fee_adjustments',
      learnerId,
      totalMinor: magnitude,
      row,
      lines: [line],
    });
    context.mapping.push({
      legacyTable: 'fee_adjustments',
      legacyId: adjustment.id,
      canonicalEntity: 'invoice',
      canonicalId: invoiceId,
    });
    context.mapping.push({
      legacyTable: 'fee_adjustments',
      legacyId: adjustment.id,
      canonicalEntity: 'invoice_line',
      canonicalId: line.id,
    });
  }

  return { creditNotes, invoices: charged };
}

/** Plans the opening balances brought forward: a charge or a credit of their own. */
function planOpeningBalances(
  context: PlanContext,
  source: FeePlanSource,
  numbers: DocumentNumbers
): PlannedAdjustments {
  const creditNotes: CreditNote[] = [];
  const charged: PlannedInvoice[] = [];
  const institutionId = source.institutionId ?? '';

  for (const balance of source.openingBalances) {
    if (balance.isBilled) {
      addIssue(
        context,
        'warning',
        'opening_balance_already_billed',
        'invoice',
        'student_opening_balances',
        balance.id,
        `the opening balance "${balance.id}" is marked as billed, so an invoice already carries it as a line; the migration does not write it twice`
      );
      continue;
    }
    const isCredit = (balance.type ?? '').trim().toLowerCase() === 'credit';
    const documentEntity: FeeEntity = isCredit ? 'credit_note' : 'invoice';
    const learnerId = resolveLearner(
      context,
      source,
      'student_opening_balances',
      balance.id,
      documentEntity,
      balance.studentId
    );
    if (learnerId === null) {
      if (!isCredit) {
        addUnmappable(
          context,
          'student_opening_balances',
          balance.id,
          'invoice_line',
          'the charge it becomes could not be written, so the line has no invoice to belong to'
        );
      }
      continue;
    }

    const conversion = toMinorUnits(balance.amount, context.currency);
    if (!conversion.ok) {
      addUnmappable(
        context,
        'student_opening_balances',
        balance.id,
        documentEntity,
        `the opening balance carries ${conversion.reason}`
      );
      if (!isCredit) {
        addUnmappable(
          context,
          'student_opening_balances',
          balance.id,
          'invoice_line',
          'the charge it becomes could not be written, so the line has no invoice to belong to'
        );
      }
      continue;
    }
    const magnitude = Math.abs(conversion.value.amountMinor);
    if (magnitude === 0) continue;

    const issueDate =
      balance.asOfDate ??
      dayOfText(balance.createdAt) ??
      context.options.referenceTimestamp.slice(0, 10);
    const audit = auditOf(context.options.referenceTimestamp, balance.createdAt);
    const label = isCredit
      ? 'Balance brought forward (credit)'
      : 'Balance brought forward (debit)';

    if (isCredit) {
      const claimed = numbers.claim(null, 'CNT-LEGACY');
      const note: CreditNote = {
        id: generateUuidv7(),
        institution_id: institutionId,
        number: claimed.number,
        learner_id: learnerId,
        amount: { amount_minor: magnitude, currency: context.currency },
        reason: label,
        issue_date: issueDate,
        status: MIGRATED_CREDIT_NOTE_STATUS,
        created_at: audit.createdAt,
        updated_at: audit.updatedAt,
      };
      creditNotes.push(note);
      context.mapping.push({
        legacyTable: 'student_opening_balances',
        legacyId: balance.id,
        canonicalEntity: 'credit_note',
        canonicalId: note.id,
      });
      continue;
    }

    const claimed = numbers.claim(null, 'INV-LEGACY');
    const invoiceId = generateUuidv7();
    const line: InvoiceLine = {
      id: generateUuidv7(),
      institution_id: institutionId,
      invoice_id: invoiceId,
      description: label,
      amount: { amount_minor: magnitude, currency: context.currency },
      kind: 'opening_balance',
      created_at: audit.createdAt,
      updated_at: audit.updatedAt,
    };
    const row: Invoice = {
      id: invoiceId,
      institution_id: institutionId,
      number: claimed.number,
      learner_id: learnerId,
      issue_date: issueDate,
      total: { amount_minor: magnitude, currency: context.currency },
      status: 'posted',
      created_at: audit.createdAt,
      updated_at: audit.updatedAt,
    };
    charged.push({
      legacyId: balance.id,
      legacyTable: 'student_opening_balances',
      learnerId,
      totalMinor: magnitude,
      row,
      lines: [line],
    });
    context.mapping.push({
      legacyTable: 'student_opening_balances',
      legacyId: balance.id,
      canonicalEntity: 'invoice',
      canonicalId: invoiceId,
    });
    context.mapping.push({
      legacyTable: 'student_opening_balances',
      legacyId: balance.id,
      canonicalEntity: 'invoice_line',
      canonicalId: line.id,
    });
  }

  return { creditNotes, invoices: charged };
}

/**
 * Plans the canonical finance documents.
 *
 * The function is pure: it reads nothing and writes nothing. Every amount is converted from the
 * legacy decimal text to whole minor units, and a row whose amount cannot be expressed exactly
 * is reported rather than rounded into the ledger. Nothing is invented: a document whose learner
 * M3 could not migrate is reported, a payment whose currency the institution does not use is
 * written in its own currency and left unallocated, and an application the canonical model would
 * refuse is reported with the money it carried.
 */
export function planFeeMigration(source: FeePlanSource, options: FeePlanOptions): FeeMigrationPlan {
  const currency = source.baseCurrency ?? 'KES';
  const context = createPlanContext(options, currency);
  const numbers = createDocumentNumbers();

  context.assumptions.push(
    'every amount is converted from the legacy decimal text to whole minor units of the institution base currency; no amount is multiplied by 100 as a float'
  );
  context.assumptions.push(
    'a legacy fee template becomes one published fee schedule version 1 for the academic period its school period became; the template was the live bill the school invoiced from'
  );
  context.assumptions.push(
    'a legacy template item becomes a fee schedule line, and its description becomes the vote head (fee item); the same description in two templates is one fee item'
  );
  context.assumptions.push(
    'the fee item category and the fee schedule residence statuses are read from the words the legacy row carries; the legacy template names neither'
  );
  context.assumptions.push(
    'a legacy invoice keeps the status the school recorded: draft stays draft, Due and Overdue become posted, Partially Paid and Paid keep their state, Voided becomes void'
  );
  context.assumptions.push(
    'an invoice total follows the sum of its lines, because that is what a canonical invoice means; a legacy total that disagrees is reported'
  );
  context.assumptions.push(
    'a legacy invoice with no items becomes one line for its billed total, so the charge is not lost'
  );
  context.assumptions.push(
    'a legacy payment becomes a posted payment and an issued receipt; the receipt number is the legacy one when it is usable and unique'
  );
  context.assumptions.push(
    'a legacy invoice payment application becomes a payment allocation against the invoice of the item it names, allocated at the moment the payment was received'
  );
  context.assumptions.push(
    'a discount, scholarship or exemption becomes a posted credit note; a fine or penalty becomes a one-line posted invoice, because a credit note cannot add to what a learner owes'
  );
  context.assumptions.push(
    'an unbilled opening balance becomes a charge invoice (debit) or a posted credit note (credit); a billed one is already an invoice line and is not written twice'
  );
  context.assumptions.push(
    'every document is written in its final state: no migrated invoice, payment or credit note is ever updated, so the posting freeze is never tested by the migration'
  );
  context.assumptions.push(
    'the legacy payment notes, the denormalised student and period names, and the legacy revenue account ids are not carried: the canonical documents hold none of them, and the legacy row keeps them'
  );

  if (source.institutionId === null) {
    addIssue(
      context,
      'error',
      'no_institution',
      'invoice',
      'institution',
      '',
      'the canonical institution table is empty, so no fee document can be attached to a school; migration M1 has to run first'
    );
  }

  const templates = planTemplates(context, source);
  const legacyInvoices = planInvoices(context, source, templates, numbers);
  const payments = planPayments(context, source, numbers);
  const allocations = planAllocations(context, source, legacyInvoices, payments);
  const adjustments = planAdjustments(context, source, legacyInvoices, numbers);
  const openingBalances = planOpeningBalances(context, source, numbers);

  const allInvoices: PlannedInvoice[] = [
    ...legacyInvoices.invoices,
    ...adjustments.invoices,
    ...openingBalances.invoices,
  ];
  const creditNotes = [...adjustments.creditNotes, ...openingBalances.creditNotes];

  const created: CreatedRow[] = [
    ...templates.items.map((row) => ({ entity: 'fee_item' as const, id: row.id })),
    ...templates.schedules.map((row) => ({ entity: 'fee_schedule' as const, id: row.id })),
    ...templates.lines.map((row) => ({ entity: 'fee_schedule_line' as const, id: row.id })),
    ...allInvoices.map((entry) => ({ entity: 'invoice' as const, id: entry.row.id })),
    ...allInvoices.flatMap((entry) =>
      entry.lines.map((line) => ({ entity: 'invoice_line' as const, id: line.id }))
    ),
    ...payments.payments.map((row) => ({ entity: 'payment' as const, id: row.id })),
    ...payments.receipts.map((row) => ({ entity: 'receipt' as const, id: row.id })),
    ...allocations.map((row) => ({ entity: 'payment_allocation' as const, id: row.id })),
    ...creditNotes.map((row) => ({ entity: 'credit_note' as const, id: row.id })),
  ];

  return {
    referenceTimestamp: options.referenceTimestamp,
    currency,
    feeItems: templates.items,
    schedules: templates.schedules,
    scheduleLines: templates.lines,
    invoices: allInvoices.map((entry) => entry.row),
    invoiceLines: allInvoices.flatMap((entry) => entry.lines),
    payments: payments.payments,
    receipts: payments.receipts,
    allocations,
    creditNotes,
    mapping: context.mapping,
    unmappable: context.unmappable,
    issues: context.issues,
    assumptions: context.assumptions,
    created,
  };
}

/**
 * What the legacy rows say the canonical finance documents should be, read a second time.
 *
 * The balance check compares this against the documents the migration actually wrote, so it is
 * deliberately an independent reading of the legacy rows: it shares the conversion rules with the
 * plan but not the plan's aggregation, and a plan that drops, doubles or mis-signs an amount is
 * caught here rather than agreeing with itself.
 */
export interface LegacyLedgerEntry {
  readonly legacyTable: string;
  readonly legacyId: string;
  readonly learnerId: string;
  readonly entity: 'invoice' | 'credit_note';
  /** The signed effect on what the learner owes: a charge is positive, a credit negative. */
  readonly amountMinor: number;
  /** The document's own amount, whatever its effect: a void invoice still holds its total. */
  readonly documentMinor: number;
  /** How many invoice lines the document carries. */
  readonly lineCount: number;
}

/** An application the legacy rows allow, with the amount the payment can cover. */
export interface LegacyApplicationDecision {
  readonly applicationId: string;
  readonly legacyInvoiceId: string;
  readonly learnerId: string;
  readonly appliedMinor: number;
}

/** The legacy rows the canonical model would refuse, and why. */
export interface LegacyApplicationRefusal {
  readonly applicationId: string;
  readonly reason: string;
}

/** The ledger the legacy rows describe, and the applications they allow. */
export interface LegacyLedger {
  readonly entries: readonly LegacyLedgerEntry[];
  readonly applications: readonly LegacyApplicationDecision[];
  readonly refusedApplications: readonly LegacyApplicationRefusal[];
}

/** Reads the legacy rows into the ledger they describe. */
export function legacyLedger(source: FeePlanSource): LegacyLedger {
  const currency = source.baseCurrency ?? 'KES';
  const entries: LegacyLedgerEntry[] = [];
  const chargedInvoices = new Set<string>();
  const invoiceByLegacyId = new Map<string, LegacyInvoice>();
  const itemInvoice = new Map<string, string>();

  for (const invoice of source.invoices) {
    invoiceByLegacyId.set(invoice.id, invoice);
    for (const item of invoice.items) {
      if (!itemInvoice.has(item.id)) itemInvoice.set(item.id, invoice.id);
    }
  }

  const learnerOf = (studentId: string | null): string | null =>
    studentId === null ? null : source.learnerByStudentId.get(studentId) ?? null;

  for (const invoice of source.invoices) {
    const learnerId = learnerOf(invoice.studentId);
    if (learnerId === null) continue;

    let amountMinor = 0;
    let usable = true;
    for (const item of invoice.items) {
      const conversion = toMinorUnits(item.amount, currency);
      if (!conversion.ok) {
        usable = false;
        break;
      }
      amountMinor += conversion.value.amountMinor;
    }
    if (!usable) continue;
    let lineCount = invoice.items.length;
    if (lineCount === 0) {
      const conversion = toMinorUnits(invoice.totalBilled, currency);
      if (!conversion.ok) continue;
      amountMinor = conversion.value.amountMinor;
      lineCount = 1;
    }
    // A void invoice is still written, with its lines, so a reader can see what was voided; it
    // is not a charge, so it moves no balance and settles no application.
    const isVoid = invoiceStatusOf(invoice.status).status === 'void';
    if (!isVoid) chargedInvoices.add(invoice.id);
    entries.push({
      legacyTable: 'student_invoices',
      legacyId: invoice.id,
      learnerId,
      entity: 'invoice',
      amountMinor: isVoid ? 0 : amountMinor,
      documentMinor: amountMinor,
      lineCount,
    });
  }

  for (const adjustment of source.adjustments) {
    const learnerId = learnerOf(adjustment.studentId);
    if (learnerId === null) continue;
    const conversion = toMinorUnits(adjustment.amount, currency);
    if (!conversion.ok) continue;
    const magnitude = Math.abs(conversion.value.amountMinor);
    if (magnitude === 0) continue;
    const credit = adjustmentDirection(adjustment.type, adjustment.amount) === 'credit';
    entries.push({
      legacyTable: 'fee_adjustments',
      legacyId: adjustment.id,
      learnerId,
      entity: credit ? 'credit_note' : 'invoice',
      amountMinor: credit ? -magnitude : magnitude,
      documentMinor: magnitude,
      lineCount: credit ? 0 : 1,
    });
  }

  for (const balance of source.openingBalances) {
    if (balance.isBilled) continue;
    const learnerId = learnerOf(balance.studentId);
    if (learnerId === null) continue;
    const conversion = toMinorUnits(balance.amount, currency);
    if (!conversion.ok) continue;
    const magnitude = Math.abs(conversion.value.amountMinor);
    if (magnitude === 0) continue;
    const credit = (balance.type ?? '').trim().toLowerCase() === 'credit';
    entries.push({
      legacyTable: 'student_opening_balances',
      legacyId: balance.id,
      learnerId,
      entity: credit ? 'credit_note' : 'invoice',
      amountMinor: credit ? -magnitude : magnitude,
      documentMinor: magnitude,
      lineCount: credit ? 0 : 1,
    });
  }

  const remaining = new Map<string, number>();
  for (const payment of source.payments) {
    const paymentCurrency = payment.currency ?? currency;
    if (paymentCurrency !== currency) continue;
    const conversion = toMinorUnits(payment.amount, currency);
    if (!conversion.ok) continue;
    remaining.set(payment.id, conversion.value.amountMinor);
  }

  const applications: LegacyApplicationDecision[] = [];
  const refusedApplications: LegacyApplicationRefusal[] = [];
  for (const application of source.applications) {
    if (application.paymentId === null) {
      refusedApplications.push({
        applicationId: application.id,
        reason: 'the application names no payment',
      });
      continue;
    }
    const left = remaining.get(application.paymentId);
    if (left === undefined) {
      refusedApplications.push({
        applicationId: application.id,
        reason: 'the payment it names is not one the canonical model can hold',
      });
      continue;
    }
    const conversion = toMinorUnits(application.amount, currency);
    if (!conversion.ok || conversion.value.amountMinor <= 0) {
      refusedApplications.push({
        applicationId: application.id,
        reason: 'the application carries no positive amount',
      });
      continue;
    }
    const legacyInvoiceId =
      application.invoiceItemId === null ? null : itemInvoice.get(application.invoiceItemId) ?? null;
    if (legacyInvoiceId === null || !chargedInvoices.has(legacyInvoiceId)) {
      refusedApplications.push({
        applicationId: application.id,
        reason: 'the invoice item it names is not one the canonical model can hold',
      });
      continue;
    }
    const invoice = invoiceByLegacyId.get(legacyInvoiceId);
    const learnerId = invoice === undefined ? null : learnerOf(invoice.studentId);
    if (invoice === undefined || learnerId === null) {
      refusedApplications.push({
        applicationId: application.id,
        reason: 'the invoice it settles has no learner',
      });
      continue;
    }
    const invoiceStatus = invoiceStatusOf(invoice.status).status;
    if (invoiceStatus === 'draft' || invoiceStatus === 'void') {
      refusedApplications.push({
        applicationId: application.id,
        reason: `a ${invoiceStatus} invoice cannot receive an allocation`,
      });
      continue;
    }
    const applied = Math.min(conversion.value.amountMinor, left);
    if (applied <= 0) {
      refusedApplications.push({
        applicationId: application.id,
        reason: 'the payment is already fully allocated',
      });
      continue;
    }
    remaining.set(application.paymentId, left - applied);
    applications.push({ applicationId: application.id, legacyInvoiceId, learnerId, appliedMinor: applied });
  }

  return { entries, applications, refusedApplications };
}

/** The balance every learner's legacy rows add up to, in whole minor units. */
export function legacyFeeBalances(source: FeePlanSource): Map<string, number> {
  const balances = new Map<string, number>();
  const ledger = legacyLedger(source);
  for (const entry of ledger.entries) {
    balances.set(entry.learnerId, (balances.get(entry.learnerId) ?? 0) + entry.amountMinor);
  }
  for (const application of ledger.applications) {
    balances.set(
      application.learnerId,
      (balances.get(application.learnerId) ?? 0) - application.appliedMinor
    );
  }
  return balances;
}

/** The counts every legacy row adds up to, per canonical entity. */
export function legacyFeeCounts(source: FeePlanSource): FeeCounts {
  const counts: FeeCounts = {
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
  const currency = source.baseCurrency ?? 'KES';

  // A template names one schedule and one line per item, whether or not the migration could
  // write the schedule: a refused template is reported together with its items.
  counts.fee_schedule = source.templates.length;
  for (const template of source.templates) counts.fee_schedule_line += template.items.length;

  // A vote head is a distinct description. An item whose schedule was refused still names the
  // same description as the template that was written, so the count is the descriptions the
  // migration wrote a fee item for.
  const feeItemKeys = new Set<string>();
  for (const template of source.templates) {
    if (template.name === null || template.name.trim() === '') continue;
    if (template.schoolPeriodId === null) continue;
    if (!source.periodByLegacyId.has(template.schoolPeriodId)) continue;
    for (const item of template.items) {
      const description = item.description === null ? '' : fitText(item.description, 200).text;
      if (description === '') continue;
      if (!toMinorUnits(item.amount, currency).ok) continue;
      feeItemKeys.add(feeItemKey(description));
    }
  }
  counts.fee_item = feeItemKeys.size;

  // An invoice carries its items, or one line when the billed total is all it holds.
  counts.invoice = source.invoices.length;
  for (const invoice of source.invoices) {
    counts.invoice_line += Math.max(invoice.items.length, 1);
  }

  for (const adjustment of source.adjustments) {
    if (adjustmentDirection(adjustment.type, adjustment.amount) === 'credit') {
      counts.credit_note += 1;
      continue;
    }
    counts.invoice += 1;
    counts.invoice_line += 1;
  }

  for (const balance of source.openingBalances) {
    // A billed balance is already an invoice line; writing it again would double the charge.
    if (balance.isBilled) continue;
    if ((balance.type ?? '').trim().toLowerCase() === 'credit') {
      counts.credit_note += 1;
      continue;
    }
    counts.invoice += 1;
    counts.invoice_line += 1;
  }

  counts.payment = source.payments.length;
  counts.receipt = source.payments.length;
  counts.payment_allocation = source.applications.length;

  return counts;
}
