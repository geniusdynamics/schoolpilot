// ABOUTME: Canonical people schemas from spec 02 §6: shared person fields, learners, identifiers,
// ABOUTME: guardians, learner-guardian links, households, staff and application users.

import { z } from 'zod/v4';

import {
  auditShape,
  entityIdShape,
  isoDate,
  jsonObjectSchema,
  jsonValueSchema,
  shortText,
  tenancyShape,
  uuid,
} from './common';
import { defineEntity } from './defineEntity';

export const GENDERS = ['female', 'male', 'other', 'not_stated'] as const;
export const NAME_ORDERS = ['given_first', 'family_first'] as const;
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
export const IDENTIFIER_OWNER_TYPES = ['learner', 'guardian', 'staff'] as const;
export const GUARDIAN_RELATIONSHIPS = [
  'mother',
  'father',
  'guardian',
  'grandparent',
  'sibling',
  'sponsor',
  'other',
] as const;
export const PREFERRED_CHANNELS = ['sms', 'whatsapp', 'email', 'phone', 'portal'] as const;
export const EMPLOYMENT_TYPES = [
  'permanent',
  'contract',
  'board_employed',
  'volunteer',
  'intern',
] as const;
export const USER_STATUSES = ['active', 'disabled', 'locked'] as const;
export const PERSON_REF_TYPES = ['staff', 'guardian', 'learner'] as const;

export const phoneSchema = z.strictObject({
  number: z.string().regex(/^\+[1-9]\d{1,14}$/, 'phone number must be E.164'),
  label: z.string().max(50).optional(),
});

export type Phone = z.infer<typeof phoneSchema>;

export const emailSchema = z.strictObject({
  address: z.email(),
  label: z.string().max(50).optional(),
});

export type Email = z.infer<typeof emailSchema>;

export const addressSchema = z.strictObject({
  line1: z.string().max(200).optional(),
  line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  postal_code: z.string().max(30).optional(),
  country: z.string().length(2).optional(),
});

export type Address = z.infer<typeof addressSchema>;

/** Shared person fields from spec 02 §6.1. */
export const personShape = {
  given_name: shortText(100),
  middle_names: z.array(shortText(100)).optional(),
  family_name: shortText(100),
  preferred_name: shortText(100).optional(),
  name_order: z.enum(NAME_ORDERS),
  gender: z.enum(GENDERS),
  date_of_birth: isoDate().optional(),
  nationality: z.string().max(100).optional(),
  languages: z.array(shortText(50)).optional(),
  photo_attachment_id: uuid().optional(),
  phones: z.array(phoneSchema).optional(),
  emails: z.array(emailSchema).optional(),
  address: addressSchema.optional(),
  attributes: jsonObjectSchema.optional(),
} as const;

function personLabel(row: {
  given_name: string;
  family_name: string;
  preferred_name?: string;
}): string {
  return `${row.preferred_name ?? row.given_name} ${row.family_name}`;
}

export const learnerSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  ...personShape,
  admission_number: shortText(64),
  admission_date: isoDate().optional(),
  status: z.enum(LEARNER_STATUSES),
  house_id: uuid().optional(),
  residence_status: z.enum(RESIDENCE_STATUSES),
  special_needs: z.array(shortText(100)).optional(),
  medical: z
    .strictObject({
      allergies: z.array(z.string().min(1)).optional(),
      conditions: z.array(z.string().min(1)).optional(),
      medications: z.array(z.string().min(1)).optional(),
    })
    .optional(),
  previous_school: z.string().max(200).optional(),
  household_id: uuid().optional(),
  ...auditShape,
});

export type Learner = z.infer<typeof learnerSchema>;

export const learnerEntity = defineEntity({
  name: 'learner',
  schema: learnerSchema,
  storage: {
    table: 'learner',
    primaryKey: 'id',
    indexes: ['institution_id', 'status', 'house_id', 'household_id', 'admission_number'],
    unique: [['institution_id', 'admission_number']],
    refs: {
      institution_id: 'institution',
      house_id: 'house',
      household_id: 'household',
    },
    // Medical detail and disability support are special-category data (spec 06 §8.1), so both
    // are sealed at rest and access-logged. Neither is indexed or filtered on: an encrypted
    // column cannot be compared in SQL, which is why they are stored as text and never queried.
    encrypted: ['medical', 'special_needs'],
  },
  label: (row) => `${personLabel(row)} · ${row.admission_number}`,
});

export const identifierSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  owner_type: z.enum(IDENTIFIER_OWNER_TYPES),
  owner_id: uuid(),
  scheme: shortText(100),
  value: shortText(200),
  issued_by: z.string().max(200).optional(),
  verified_at: z.iso.datetime().optional(),
  ...auditShape,
});

export type Identifier = z.infer<typeof identifierSchema>;

export const identifierEntity = defineEntity({
  name: 'identifier',
  schema: identifierSchema,
  storage: {
    table: 'identifier',
    primaryKey: 'id',
    indexes: ['institution_id', 'owner_type', 'owner_id', 'scheme'],
    unique: [['owner_type', 'owner_id', 'scheme', 'value']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => `${row.scheme}: ${row.value}`,
});

export const guardianSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  ...personShape,
  occupation: z.string().max(200).optional(),
  employer: z.string().max(200).optional(),
  national_id: z.string().max(100).optional(),
  is_staff_member_id: uuid().optional(),
  ...auditShape,
});

export type Guardian = z.infer<typeof guardianSchema>;

export const guardianEntity = defineEntity({
  name: 'guardian',
  schema: guardianSchema,
  storage: {
    table: 'guardian',
    primaryKey: 'id',
    indexes: ['institution_id', 'family_name', 'is_staff_member_id'],
    unique: [],
    refs: { institution_id: 'institution', is_staff_member_id: 'staff' },
    encrypted: [],
  },
  label: (row) => personLabel(row),
});

export const learnerGuardianSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  learner_id: uuid(),
  guardian_id: uuid(),
  relationship: z.enum(GUARDIAN_RELATIONSHIPS),
  is_primary: z.boolean(),
  has_parental_responsibility: z.boolean(),
  is_fee_payer: z.boolean(),
  fee_share_percent: z.number().min(0).max(100).optional(),
  can_pick_up: z.boolean(),
  receives_reports: z.boolean(),
  receives_sms: z.boolean(),
  preferred_channel: z.enum(PREFERRED_CHANNELS),
  preferred_language: z.string().max(35).optional(),
  priority: z.int().min(0).optional(),
  ...auditShape,
});

export type LearnerGuardian = z.infer<typeof learnerGuardianSchema>;

export const learnerGuardianEntity = defineEntity({
  name: 'learner_guardian',
  schema: learnerGuardianSchema,
  storage: {
    table: 'learner_guardian',
    primaryKey: 'id',
    indexes: ['institution_id', 'learner_id', 'guardian_id', 'is_fee_payer'],
    unique: [['learner_id', 'guardian_id']],
    refs: {
      institution_id: 'institution',
      learner_id: 'learner',
      guardian_id: 'guardian',
    },
    encrypted: [],
  },
  label: (row) => `${row.relationship} · ${row.guardian_id}`,
});

export const householdSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  name: shortText(200),
  primary_payer_guardian_id: uuid().optional(),
  ...auditShape,
});

export type Household = z.infer<typeof householdSchema>;

export const householdEntity = defineEntity({
  name: 'household',
  schema: householdSchema,
  storage: {
    table: 'household',
    primaryKey: 'id',
    indexes: ['institution_id', 'primary_payer_guardian_id'],
    // Household names are display labels, not identifiers; two families may share one.
    unique: [],
    refs: { institution_id: 'institution', primary_payer_guardian_id: 'guardian' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const staffSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    ...personShape,
    employee_number: shortText(64),
    employment_type: z.enum(EMPLOYMENT_TYPES),
    job_title_id: uuid().optional(),
    department_ids: z.array(uuid()),
    start_date: isoDate(),
    end_date: isoDate().nullish(),
    qualifications: z.array(z.string().min(1)).optional(),
    teaching_competences: z
      .array(
        z.strictObject({
          learning_area_id: uuid(),
          level_ids: z.array(uuid()),
        })
      )
      .optional(),
    user_id: uuid().optional(),
    payroll_profile: jsonValueSchema.optional(),
    ...auditShape,
  })
  .refine((row) => !row.end_date || row.end_date >= row.start_date, {
    path: ['end_date'],
    message: 'end_date must be on or after start_date',
  });

export type Staff = z.infer<typeof staffSchema>;

export const staffEntity = defineEntity({
  name: 'staff',
  schema: staffSchema,
  storage: {
    table: 'staff',
    primaryKey: 'id',
    indexes: ['institution_id', 'family_name', 'job_title_id', 'user_id', 'employment_type'],
    unique: [['institution_id', 'employee_number']],
    refs: {
      institution_id: 'institution',
      job_title_id: 'job_title',
      user_id: 'user',
    },
    encrypted: [],
  },
  label: (row) => `${personLabel(row)} · ${row.employee_number}`,
});

export const userSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  username: shortText(100),
  password_hash: z.string().min(1),
  status: z.enum(USER_STATUSES),
  person_ref: z
    .strictObject({
      type: z.enum(PERSON_REF_TYPES),
      id: uuid(),
    })
    .optional(),
  mfa: z.boolean(),
  last_login_at: z.iso.datetime().nullish(),
  ...auditShape,
});

export type User = z.infer<typeof userSchema>;

export const userEntity = defineEntity({
  name: 'user',
  schema: userSchema,
  storage: {
    table: 'user',
    primaryKey: 'id',
    indexes: ['institution_id', 'username', 'status'],
    unique: [['institution_id', 'username']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => row.username,
});
