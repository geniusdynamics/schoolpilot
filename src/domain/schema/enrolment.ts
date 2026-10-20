// ABOUTME: Canonical enrolment schemas from spec 02 §7: enrolments and their history, learning-area
// ABOUTME: enrolments and promotion decisions, with the exit-reason and date-order refinements.

import { z } from 'zod/v4';

import {
  auditShape,
  entityIdShape,
  isoDate,
  jsonValueSchema,
  shortText,
  tenancyShape,
  uuid,
} from './common';
import { defineEntity } from './defineEntity';

export const ENROLMENT_STATUSES = ['active', 'repeating', 'left', 'completed'] as const;
export const ENTRY_REASONS = [
  'new_admission',
  'promoted',
  'repeated',
  'transferred_in',
  're_admitted',
] as const;
export const EXIT_REASONS = [
  'promoted',
  'graduated',
  'transferred_out',
  'withdrawn',
  'expelled',
  'deceased',
] as const;
export const ENROLMENT_CHANGE_KINDS = [
  'class_change',
  'pathway_change',
  'category_change',
] as const;
export const LEARNING_AREA_ENROLMENT_STATUSES = ['taking', 'dropped', 'exempt'] as const;
export const PROMOTION_DECISIONS = [
  'promote',
  'repeat',
  'conditional',
  'graduate',
  'transfer',
  'leave',
] as const;

export const enrolmentSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    learner_id: uuid(),
    academic_year_id: uuid(),
    programme_id: uuid(),
    level_id: uuid(),
    class_group_id: uuid(),
    pathway_id: uuid().optional(),
    status: z.enum(ENROLMENT_STATUSES),
    start_date: isoDate(),
    end_date: isoDate().nullish(),
    entry_reason: z.enum(ENTRY_REASONS),
    exit_reason: z.enum(EXIT_REASONS).nullish(),
    fee_category_ids: z.array(uuid()).optional(),
    sponsorship_id: uuid().optional(),
    ...auditShape,
  })
  .refine((row) => !row.end_date || row.end_date >= row.start_date, {
    path: ['end_date'],
    message: 'end_date must be on or after start_date',
  })
  .refine(
    (row) =>
      !(row.status === 'left' || row.status === 'completed') || row.exit_reason !== undefined,
    {
      path: ['exit_reason'],
      message: 'exit_reason is required when status is left or completed',
    }
  );

export type Enrolment = z.infer<typeof enrolmentSchema>;

export const enrolmentEntity = defineEntity({
  name: 'enrolment',
  schema: enrolmentSchema,
  storage: {
    table: 'enrolment',
    primaryKey: 'id',
    indexes: [
      'institution_id',
      'learner_id',
      'academic_year_id',
      'class_group_id',
      'level_id',
      'status',
    ],
    unique: [['learner_id', 'academic_year_id', 'start_date']],
    refs: {
      institution_id: 'institution',
      learner_id: 'learner',
      academic_year_id: 'academic_year',
      programme_id: 'programme',
      level_id: 'level',
      class_group_id: 'class_group',
      pathway_id: 'pathway',
      sponsorship_id: 'sponsorship',
    },
    encrypted: [],
  },
  label: (row) => `${row.learner_id} · ${row.status}`,
});

export const enrolmentChangeSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  enrolment_id: uuid(),
  kind: z.enum(ENROLMENT_CHANGE_KINDS),
  from: jsonValueSchema,
  to: jsonValueSchema,
  effective_date: isoDate(),
  reason: shortText(500),
  approved_by: uuid().optional(),
  ...auditShape,
});

export type EnrolmentChange = z.infer<typeof enrolmentChangeSchema>;

export const enrolmentChangeEntity = defineEntity({
  name: 'enrolment_change',
  schema: enrolmentChangeSchema,
  storage: {
    table: 'enrolment_change',
    primaryKey: 'id',
    indexes: ['institution_id', 'enrolment_id', 'kind', 'effective_date'],
    unique: [],
    refs: {
      institution_id: 'institution',
      enrolment_id: 'enrolment',
      approved_by: 'user',
    },
    encrypted: [],
  },
  label: (row) => `${row.kind} · ${row.effective_date}`,
});

export const learningAreaEnrolmentSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    enrolment_id: uuid(),
    learning_area_id: uuid(),
    teaching_group_id: uuid().optional(),
    status: z.enum(LEARNING_AREA_ENROLMENT_STATUSES),
    valid_from: isoDate(),
    valid_to: isoDate().nullish(),
    ...auditShape,
  })
  .refine((row) => !row.valid_to || row.valid_to >= row.valid_from, {
    path: ['valid_to'],
    message: 'valid_to must be on or after valid_from',
  });

export type LearningAreaEnrolment = z.infer<typeof learningAreaEnrolmentSchema>;

export const learningAreaEnrolmentEntity = defineEntity({
  name: 'learning_area_enrolment',
  schema: learningAreaEnrolmentSchema,
  storage: {
    table: 'learning_area_enrolment',
    primaryKey: 'id',
    indexes: [
      'institution_id',
      'enrolment_id',
      'learning_area_id',
      'teaching_group_id',
      'status',
    ],
    unique: [['enrolment_id', 'learning_area_id', 'valid_from']],
    refs: {
      institution_id: 'institution',
      enrolment_id: 'enrolment',
      learning_area_id: 'learning_area',
      teaching_group_id: 'teaching_group',
    },
    encrypted: [],
  },
  label: (row) => `${row.learning_area_id} · ${row.status}`,
});

export const promotionDecisionSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  enrolment_id: uuid(),
  decision: z.enum(PROMOTION_DECISIONS),
  to_level_id: uuid().optional(),
  to_class_group_id: uuid().optional(),
  rule_evaluation: jsonValueSchema.optional(),
  decided_by: uuid().optional(),
  decided_at: z.iso.datetime(),
  committed_at: z.iso.datetime().nullish(),
  ...auditShape,
});

export type PromotionDecision = z.infer<typeof promotionDecisionSchema>;

export const promotionDecisionEntity = defineEntity({
  name: 'promotion_decision',
  schema: promotionDecisionSchema,
  storage: {
    table: 'promotion_decision',
    primaryKey: 'id',
    indexes: ['institution_id', 'enrolment_id', 'decision', 'decided_at'],
    unique: [['enrolment_id', 'decided_at']],
    refs: {
      institution_id: 'institution',
      enrolment_id: 'enrolment',
      to_level_id: 'level',
      to_class_group_id: 'class_group',
      decided_by: 'user',
    },
    encrypted: [],
  },
  label: (row) => `${row.decision} · ${row.enrolment_id}`,
});
