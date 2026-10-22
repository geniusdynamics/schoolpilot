// ABOUTME: Canonical finance document schemas from spec 02 §10 and spec 05: fee items and schedules,
// ABOUTME: invoices, payments and allocations, receipts, credit notes and refunds.

import { z } from 'zod/v4';

import {
  auditShape,
  entityIdShape,
  isoDate,
  jsonObjectSchema,
  moneySchema,
  shortText,
  tenancyShape,
  uuid,
} from './common';
import { defineEntity } from './defineEntity';
import { RESIDENCE_STATUSES } from './people';

export const FEE_ITEM_CATEGORIES = [
  'tuition',
  'boarding',
  'meals',
  'transport',
  'activity',
  'exam',
  'development_levy',
  'uniform_books',
  'deposit',
  'fine',
  'other',
] as const;
/**
 * Who funds a fee item (spec 05 §2.1).
 *
 * `parent` is the learner's family paying, `government_capitation` the government's per-learner
 * grant (Free Primary Education, Free Day Secondary Education), `sponsor` a sponsor or
 * scholarship body. `bursary` and `government` were added by P3-B01: a fee item may be funded by
 * a bursary, and a government grant that is not a per-learner capitation (a county or
 * constituency fund) is not the same source as capitation. The column is TEXT with no CHECK
 * constraint, so widening this list changes no table and no stored row.
 */
export const FEE_FUNDING_SOURCES = [
  'parent',
  'bursary',
  'sponsor',
  'government_capitation',
  'government',
] as const;
export const FEE_SCHEDULE_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'published',
  'archived',
] as const;
export const FEE_LINE_FREQUENCIES = [
  'per_term',
  'per_year',
  'monthly',
  'one_off_at_admission',
] as const;
export const PRORATION_RULES = [
  'full',
  'none',
  'pro_rata_weeks',
  'pro_rata_days',
  'from_half_term',
] as const;
export const DISCOUNT_KINDS = ['percent', 'fixed'] as const;
export const DISCOUNT_FUNDING_SOURCES = [
  'school',
  'government',
  'county_bursary',
  'ngo',
  'church',
  'alumni',
  'other',
] as const;
export const INVOICE_STATUSES = ['draft', 'posted', 'partially_paid', 'paid', 'void'] as const;
export const INVOICE_LINE_KINDS = [
  'fee',
  'discount',
  'adjustment',
  'fine',
  'opening_balance',
  'other',
] as const;
export const PAYMENT_CHANNELS = [
  'cash',
  'bank_deposit',
  'cheque',
  'mobile_money',
  'card',
  'in_kind',
] as const;
export const PAYMENT_STATUSES = [
  'pending',
  'posted',
  'cleared',
  'bounced',
  'reversed',
] as const;
export const RECEIPT_STATUSES = ['issued', 'void'] as const;
export const REFUND_STATUSES = ['requested', 'approved', 'paid', 'rejected'] as const;

export const feeCategorySchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  code: shortText(50),
  name: shortText(200),
  attributes: jsonObjectSchema.optional(),
  ...auditShape,
});

export type FeeCategory = z.infer<typeof feeCategorySchema>;

export const feeCategoryEntity = defineEntity({
  name: 'fee_category',
  schema: feeCategorySchema,
  storage: {
    table: 'fee_category',
    primaryKey: 'id',
    indexes: ['institution_id', 'code'],
    unique: [['institution_id', 'code']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => `${row.code} ${row.name}`,
});

export const feeItemSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  code: shortText(50),
  name: shortText(200),
  revenue_account_code: z.string().max(50).optional(),
  category: z.enum(FEE_ITEM_CATEGORIES),
  refundable: z.boolean(),
  taxable: z.boolean(),
  priority: z.int().min(0),
  funding_source: z.enum(FEE_FUNDING_SOURCES),
  ...auditShape,
});

export type FeeItem = z.infer<typeof feeItemSchema>;

export const feeItemEntity = defineEntity({
  name: 'fee_item',
  schema: feeItemSchema,
  storage: {
    table: 'fee_item',
    primaryKey: 'id',
    indexes: ['institution_id', 'category', 'funding_source'],
    unique: [['institution_id', 'code']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => `${row.code} ${row.name}`,
});

export const feeScheduleSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  name: shortText(200),
  academic_year_id: uuid(),
  academic_period_ids: z.array(uuid()),
  programme_ids: z.array(uuid()),
  level_ids: z.array(uuid()),
  residence_statuses: z.array(z.enum(RESIDENCE_STATUSES)),
  fee_category_ids: z.array(uuid()),
  campus_id: uuid().optional(),
  new_learners_only: z.boolean(),
  version: z.int().min(1),
  status: z.enum(FEE_SCHEDULE_STATUSES),
  ...auditShape,
});

export type FeeSchedule = z.infer<typeof feeScheduleSchema>;

export const feeScheduleEntity = defineEntity({
  name: 'fee_schedule',
  schema: feeScheduleSchema,
  storage: {
    table: 'fee_schedule',
    primaryKey: 'id',
    indexes: ['institution_id', 'academic_year_id', 'campus_id', 'status'],
    unique: [
      ['institution_id', 'campus_id', 'name', 'version'],
      // An institution-wide schedule (no campus) still needs one row per name and version.
      { columns: ['institution_id', 'name', 'version'], where: 'campus_id IS NULL' },
    ],
    refs: {
      institution_id: 'institution',
      academic_year_id: 'academic_year',
      campus_id: 'campus',
    },
    encrypted: [],
  },
  label: (row) => `${row.name} v${row.version}`,
});

export const feeScheduleLineSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  fee_schedule_id: uuid(),
  fee_item_id: uuid(),
  /**
   * The matrix cell the line prices (spec 05 §2.2). A schedule's header names the dimensions it
   * spans (`level_ids`, `residence_statuses`, `fee_category_ids`, `campus_id`); these three columns
   * say which point of that space the line belongs to, so the same fee item can be priced
   * differently for a Grade 10 boarder and a Form 3 day learner. All three are optional: a line of
   * a single-point schedule (the shape the fee migration and the demo seed write) carries none, and
   * a null column means "the schedule's only value for that dimension".
   */
  level_id: uuid().optional(),
  residence_status: z.enum(RESIDENCE_STATUSES).optional(),
  fee_category_id: uuid().optional(),
  amount: moneySchema,
  mandatory: z.boolean(),
  frequency: z.enum(FEE_LINE_FREQUENCIES),
  due_dates: z.array(isoDate()).optional(),
  installment_plan_id: uuid().optional(),
  proration_rule: z.enum(PRORATION_RULES),
  ...auditShape,
});

export type FeeScheduleLine = z.infer<typeof feeScheduleLineSchema>;

export const feeScheduleLineEntity = defineEntity({
  name: 'fee_schedule_line',
  schema: feeScheduleLineSchema,
  storage: {
    table: 'fee_schedule_line',
    primaryKey: 'id',
    indexes: [
      'institution_id',
      'fee_schedule_id',
      'fee_item_id',
      'installment_plan_id',
      'level_id',
      'fee_category_id',
    ],
    unique: [],
    refs: {
      institution_id: 'institution',
      fee_schedule_id: 'fee_schedule',
      fee_item_id: 'fee_item',
      installment_plan_id: 'installment_plan',
      level_id: 'level',
      fee_category_id: 'fee_category',
    },
    encrypted: [],
  },
  label: (row) => `${row.fee_item_id} · ${row.amount.amount_minor} ${row.amount.currency}`,
});

export const discountRuleSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    name: shortText(200),
    kind: z.enum(DISCOUNT_KINDS),
    value: z.number().min(0),
    fee_item_ids: z.array(uuid()),
    conditions: z.record(z.string(), z.json()).optional(),
    funding_source: z.enum(DISCOUNT_FUNDING_SOURCES),
    ...auditShape,
  })
  .refine((row) => row.kind !== 'percent' || row.value <= 100, {
    path: ['value'],
    message: 'a percentage discount cannot exceed 100',
  });

export type DiscountRule = z.infer<typeof discountRuleSchema>;

export const discountRuleEntity = defineEntity({
  name: 'discount_rule',
  schema: discountRuleSchema,
  storage: {
    table: 'discount_rule',
    primaryKey: 'id',
    indexes: ['institution_id', 'kind', 'funding_source'],
    unique: [['institution_id', 'name']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const sponsorshipSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    name: shortText(200),
    sponsor_name: shortText(200),
    funding_source: z.enum(DISCOUNT_FUNDING_SOURCES),
    fee_item_ids: z.array(uuid()),
    coverage_percent: z.number().min(0).max(100).optional(),
    starts_on: isoDate().optional(),
    ends_on: isoDate().optional(),
    ...auditShape,
  })
  .refine((row) => !row.starts_on || !row.ends_on || row.ends_on >= row.starts_on, {
    path: ['ends_on'],
    message: 'ends_on must be on or after starts_on',
  });

export type Sponsorship = z.infer<typeof sponsorshipSchema>;

export const sponsorshipEntity = defineEntity({
  name: 'sponsorship',
  schema: sponsorshipSchema,
  storage: {
    table: 'sponsorship',
    primaryKey: 'id',
    indexes: ['institution_id', 'funding_source', 'sponsor_name'],
    unique: [['institution_id', 'name']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const installmentPlanSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  name: shortText(200),
  academic_period_id: uuid().optional(),
  installments: z.array(
    z.strictObject({
      sequence: z.int().min(1),
      due_date: isoDate(),
      percent: z.number().min(0).max(100),
    })
  ),
  ...auditShape,
});

export type InstallmentPlan = z.infer<typeof installmentPlanSchema>;

export const installmentPlanEntity = defineEntity({
  name: 'installment_plan',
  schema: installmentPlanSchema,
  storage: {
    table: 'installment_plan',
    primaryKey: 'id',
    indexes: ['institution_id', 'academic_period_id'],
    unique: [['institution_id', 'name']],
    refs: { institution_id: 'institution', academic_period_id: 'academic_period' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const invoiceSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    number: shortText(64),
    learner_id: uuid().optional(),
    payer_guardian_id: uuid().optional(),
    household_id: uuid().optional(),
    academic_period_id: uuid().optional(),
    issue_date: isoDate(),
    due_date: isoDate().nullish(),
    total: moneySchema,
    status: z.enum(INVOICE_STATUSES),
    ...auditShape,
  })
  .refine((row) => !row.due_date || row.due_date >= row.issue_date, {
    path: ['due_date'],
    message: 'due_date must be on or after issue_date',
  })
  .refine((row) => Boolean(row.learner_id ?? row.payer_guardian_id ?? row.household_id), {
    path: ['learner_id'],
    message: 'an invoice needs a learner, payer guardian or household',
  });

export type Invoice = z.infer<typeof invoiceSchema>;

export const invoiceEntity = defineEntity({
  name: 'invoice',
  schema: invoiceSchema,
  storage: {
    table: 'invoice',
    primaryKey: 'id',
    indexes: ['institution_id', 'learner_id', 'payer_guardian_id', 'household_id', 'status'],
    // The sequence-formatted number embeds its year/term scope, so uniqueness is institution-wide.
    unique: [['institution_id', 'number']],
    refs: {
      institution_id: 'institution',
      learner_id: 'learner',
      payer_guardian_id: 'guardian',
      household_id: 'household',
      academic_period_id: 'academic_period',
    },
    encrypted: [],
  },
  label: (row) => row.number,
});

export const invoiceLineSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  invoice_id: uuid(),
  fee_item_id: uuid().optional(),
  description: shortText(500),
  amount: moneySchema,
  kind: z.enum(INVOICE_LINE_KINDS),
  ...auditShape,
});

export type InvoiceLine = z.infer<typeof invoiceLineSchema>;

export const invoiceLineEntity = defineEntity({
  name: 'invoice_line',
  schema: invoiceLineSchema,
  storage: {
    table: 'invoice_line',
    primaryKey: 'id',
    indexes: ['institution_id', 'invoice_id', 'fee_item_id', 'kind'],
    unique: [],
    refs: {
      institution_id: 'institution',
      invoice_id: 'invoice',
      fee_item_id: 'fee_item',
    },
    encrypted: [],
  },
  label: (row) => row.description,
});

export const creditNoteSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  number: shortText(64),
  learner_id: uuid().optional(),
  invoice_id: uuid().optional(),
  amount: moneySchema,
  reason: shortText(500),
  issue_date: isoDate(),
  status: z.enum(['draft', 'posted', 'void']),
  ...auditShape,
});

export type CreditNote = z.infer<typeof creditNoteSchema>;

export const creditNoteEntity = defineEntity({
  name: 'credit_note',
  schema: creditNoteSchema,
  storage: {
    table: 'credit_note',
    primaryKey: 'id',
    indexes: ['institution_id', 'learner_id', 'invoice_id', 'status'],
    unique: [['institution_id', 'number']],
    refs: {
      institution_id: 'institution',
      learner_id: 'learner',
      invoice_id: 'invoice',
    },
    encrypted: [],
  },
  label: (row) => row.number,
});

export const paymentSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    payer_guardian_id: uuid().optional(),
    learner_id: uuid().optional(),
    household_id: uuid().optional(),
    amount: moneySchema,
    channel: z.enum(PAYMENT_CHANNELS),
    reference: z.string().max(100).optional(),
    external_reference: z.string().max(200).optional(),
    received_at: z.iso.datetime(),
    cashier_user_id: uuid().optional(),
    status: z.enum(PAYMENT_STATUSES),
    exchange_rate: z.number().positive().optional(),
    base_amount: moneySchema.optional(),
    ...auditShape,
  })
  .refine(
    (row) => (row.exchange_rate === undefined) === (row.base_amount === undefined),
    {
      path: ['base_amount'],
      message: 'exchange_rate and base_amount must be recorded together',
    }
  );

export type Payment = z.infer<typeof paymentSchema>;

export const paymentEntity = defineEntity({
  name: 'payment',
  schema: paymentSchema,
  storage: {
    table: 'payment',
    primaryKey: 'id',
    indexes: [
      'institution_id',
      'payer_guardian_id',
      'learner_id',
      'household_id',
      'external_reference',
      'status',
    ],
    unique: [],
    refs: {
      institution_id: 'institution',
      payer_guardian_id: 'guardian',
      learner_id: 'learner',
      household_id: 'household',
      cashier_user_id: 'user',
    },
    encrypted: [],
  },
  label: (row) => row.reference ?? row.external_reference ?? row.received_at,
});

export const paymentAllocationSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    payment_id: uuid(),
    invoice_id: uuid(),
    amount: moneySchema,
    allocated_at: z.iso.datetime(),
    allocated_by: uuid().optional(),
    ...auditShape,
  })
  .refine((row) => row.amount.amount_minor > 0, {
    path: ['amount', 'amount_minor'],
    message: 'an allocation must be positive',
  });

export type PaymentAllocation = z.infer<typeof paymentAllocationSchema>;

export const paymentAllocationEntity = defineEntity({
  name: 'payment_allocation',
  schema: paymentAllocationSchema,
  storage: {
    table: 'payment_allocation',
    primaryKey: 'id',
    indexes: ['institution_id', 'payment_id', 'invoice_id', 'allocated_at'],
    unique: [],
    refs: {
      institution_id: 'institution',
      payment_id: 'payment',
      invoice_id: 'invoice',
      allocated_by: 'user',
    },
    encrypted: [],
  },
  label: (row) => `${row.payment_id} → ${row.invoice_id}`,
});

export const receiptSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  number: shortText(64),
  payment_id: uuid(),
  issued_at: z.iso.datetime(),
  issued_by: uuid().optional(),
  status: z.enum(RECEIPT_STATUSES),
  ...auditShape,
});

export type Receipt = z.infer<typeof receiptSchema>;

export const receiptEntity = defineEntity({
  name: 'receipt',
  schema: receiptSchema,
  storage: {
    table: 'receipt',
    primaryKey: 'id',
    indexes: ['institution_id', 'payment_id', 'issued_at', 'status'],
    // The sequence-formatted number embeds year/campus/cashier scope, so institution-wide uniqueness holds.
    unique: [['institution_id', 'number']],
    refs: {
      institution_id: 'institution',
      payment_id: 'payment',
      issued_by: 'user',
    },
    encrypted: [],
  },
  label: (row) => row.number,
});

export const refundSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    number: shortText(64),
    payment_id: uuid().optional(),
    learner_id: uuid().optional(),
    amount: moneySchema,
    reason: shortText(500),
    requested_at: z.iso.datetime(),
    approved_by: uuid().optional(),
    paid_at: z.iso.datetime().optional(),
    status: z.enum(REFUND_STATUSES),
    ...auditShape,
  })
  .refine((row) => row.status !== 'paid' || row.paid_at !== undefined, {
    path: ['paid_at'],
    message: 'paid_at is required once a refund is paid',
  });

export type Refund = z.infer<typeof refundSchema>;

export const refundEntity = defineEntity({
  name: 'refund',
  schema: refundSchema,
  storage: {
    table: 'refund',
    primaryKey: 'id',
    indexes: ['institution_id', 'payment_id', 'learner_id', 'status'],
    unique: [['institution_id', 'number']],
    refs: {
      institution_id: 'institution',
      payment_id: 'payment',
      learner_id: 'learner',
      approved_by: 'user',
    },
    encrypted: [],
  },
  label: (row) => row.number,
});
