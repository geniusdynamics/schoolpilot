// ABOUTME: Zod v4 definition of the DR-01 spike entity: learner plus enrolment, with enums, dates,
// ABOUTME: optional fields, foreign keys and cross-field refinements. Used only by the DR-01 spike.

import { z } from 'zod/v4';

export const LEARNER_STATUSES = [
  'applicant',
  'enrolled',
  'suspended',
  'withdrawn',
  'transferred_out',
  'graduated',
  'deceased',
] as const;

export const RESIDENCE_STATUSES = ['day', 'boarder', 'weekly_boarder'] as const;
export const GENDERS = ['female', 'male', 'other', 'not_stated'] as const;

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

const isoDate = () => z.iso.date();
const isoDateTime = () => z.iso.datetime();
const uuid = () => z.uuid();

export function buildLearnerSchema() {
  return z.strictObject({
    id: uuid(),
    institution_id: uuid(),
    admission_number: z.string().min(1).max(32),
    given_name: z.string().min(1).max(100),
    middle_names: z.array(z.string().min(1).max(100)).optional(),
    family_name: z.string().min(1).max(100),
    gender: z.enum(GENDERS),
    date_of_birth: isoDate().optional(),
    status: z.enum(LEARNER_STATUSES),
    residence_status: z.enum(RESIDENCE_STATUSES),
    house_id: uuid().optional(),
    special_needs: z.array(z.string().min(1).max(100)).optional(),
    attributes: z.record(z.string(), z.json()).optional(),
    created_at: isoDateTime(),
    updated_at: isoDateTime(),
    deleted_at: isoDateTime().optional(),
  });
}

export function buildEnrolmentSchema() {
  return z
    .strictObject({
      id: uuid(),
      learner_id: uuid(),
      academic_year_id: uuid(),
      programme_id: uuid(),
      level_id: uuid(),
      class_group_id: uuid(),
      pathway_id: uuid().optional(),
      status: z.enum(ENROLMENT_STATUSES),
      start_date: isoDate(),
      end_date: isoDate().optional(),
      entry_reason: z.enum(ENTRY_REASONS),
      exit_reason: z.enum(EXIT_REASONS).optional(),
      fee_category_ids: z.array(uuid()).optional(),
      sponsorship_id: uuid().optional(),
      created_at: isoDateTime(),
      updated_at: isoDateTime(),
    })
    .refine((v) => !v.end_date || v.end_date >= v.start_date, {
      message: 'end_date must be on or after start_date',
      path: ['end_date'],
    })
    .refine((v) => !(v.status === 'left' || v.status === 'completed') || v.exit_reason !== undefined, {
      message: 'exit_reason is required when status is left or completed',
      path: ['exit_reason'],
    });
}

export const learnerSchema = buildLearnerSchema();
export const enrolmentSchema = buildEnrolmentSchema();

export type Learner = z.infer<typeof learnerSchema>;
export type Enrolment = z.infer<typeof enrolmentSchema>;

// Storage-only metadata that a JSON Schema cannot carry. Kept next to the entity so the
// DDL generator has one place to read primary key, indexes, unique keys and foreign keys.
export const learnerStorage = {
  table: 'learner',
  primaryKey: 'id',
  indexes: ['institution_id', 'status', 'house_id'],
  unique: [['institution_id', 'admission_number']],
  refs: { institution_id: 'institution', house_id: 'house' },
  encrypted: ['attributes'],
} as const;

export const enrolmentStorage = {
  table: 'enrolment',
  primaryKey: 'id',
  indexes: ['learner_id', 'academic_year_id', 'class_group_id', 'level_id', 'status'],
  unique: [],
  refs: {
    learner_id: 'learner',
    academic_year_id: 'academic_year',
    programme_id: 'programme',
    level_id: 'level',
    class_group_id: 'class_group',
    pathway_id: 'pathway',
    sponsorship_id: 'sponsorship',
  },
  encrypted: [],
} as const;

export const storageByEntity = {
  learner: learnerStorage,
  enrolment: enrolmentStorage,
} as const;
