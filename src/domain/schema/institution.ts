// ABOUTME: Canonical organisation schemas from spec 02 §2: institution, identifiers, campuses,
// ABOUTME: departments, job titles, houses, residences and residence beds.

import { z } from 'zod/v4';

import { auditShape, entityIdShape, shortText, tenancyShape, uuid } from './common';
import { defineEntity } from './defineEntity';

export const OWNERSHIP_KINDS = [
  'public',
  'private',
  'faith_based',
  'community',
  'international',
] as const;

export const GENDER_POLICIES = ['mixed', 'boys', 'girls'] as const;
export const BOARDING_POLICIES = ['day', 'boarding', 'mixed'] as const;
export const RESIDENCE_GENDERS = ['mixed', 'boys', 'girls'] as const;
export const DEPARTMENT_KINDS = ['academic', 'administrative', 'support'] as const;
export const JOB_TITLE_CATEGORIES = ['teaching', 'non_teaching'] as const;

export const institutionSchema = z.strictObject({
  ...entityIdShape,
  name: shortText(200),
  short_name: shortText(100).optional(),
  motto: z.string().max(500).optional(),
  logo_attachment_id: uuid().optional(),
  country: z.string().length(2),
  region: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  ownership: z.enum(OWNERSHIP_KINDS),
  gender_policy: z.enum(GENDER_POLICIES),
  boarding_policy: z.enum(BOARDING_POLICIES),
  default_locale: z.string().min(2).max(35),
  time_zone: z.string().min(1).max(64),
  base_currency: z.string().regex(/^[A-Z]{3}$/, 'base_currency must be an ISO-4217 code'),
  setup_completed_at: z.iso.datetime().optional(),
  ...auditShape,
});

export type Institution = z.infer<typeof institutionSchema>;

export const institutionEntity = defineEntity({
  name: 'institution',
  schema: institutionSchema,
  storage: {
    table: 'institution',
    primaryKey: 'id',
    indexes: ['name', 'country'],
    unique: [],
    refs: {},
    encrypted: [],
  },
  label: (row) => row.short_name ?? row.name,
});

export const institutionIdentifierSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  scheme: shortText(100),
  value: shortText(200),
  ...auditShape,
});

export type InstitutionIdentifier = z.infer<typeof institutionIdentifierSchema>;

export const institutionIdentifierEntity = defineEntity({
  name: 'institution_identifier',
  schema: institutionIdentifierSchema,
  storage: {
    table: 'institution_identifier',
    primaryKey: 'id',
    indexes: ['institution_id', 'scheme'],
    unique: [['institution_id', 'scheme', 'value']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => `${row.scheme}: ${row.value}`,
});

export const campusSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  name: shortText(200),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  is_main: z.boolean(),
  ...auditShape,
});

export type Campus = z.infer<typeof campusSchema>;

export const campusEntity = defineEntity({
  name: 'campus',
  schema: campusSchema,
  storage: {
    table: 'campus',
    primaryKey: 'id',
    indexes: ['institution_id', 'name'],
    unique: [['institution_id', 'name']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const departmentSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  name: shortText(200),
  kind: z.enum(DEPARTMENT_KINDS),
  head_staff_id: uuid().optional(),
  ...auditShape,
});

export type Department = z.infer<typeof departmentSchema>;

export const departmentEntity = defineEntity({
  name: 'department',
  schema: departmentSchema,
  storage: {
    table: 'department',
    primaryKey: 'id',
    indexes: ['institution_id', 'head_staff_id'],
    unique: [['institution_id', 'name']],
    refs: { institution_id: 'institution', head_staff_id: 'staff' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const jobTitleSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  name: shortText(200),
  category: z.enum(JOB_TITLE_CATEGORIES),
  ...auditShape,
});

export type JobTitle = z.infer<typeof jobTitleSchema>;

export const jobTitleEntity = defineEntity({
  name: 'job_title',
  schema: jobTitleSchema,
  storage: {
    table: 'job_title',
    primaryKey: 'id',
    indexes: ['institution_id', 'category'],
    unique: [['institution_id', 'name']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const houseSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  name: shortText(200),
  colour: z.string().max(50).optional(),
  patron_staff_id: uuid().optional(),
  ...auditShape,
});

export type House = z.infer<typeof houseSchema>;

export const houseEntity = defineEntity({
  name: 'house',
  schema: houseSchema,
  storage: {
    table: 'house',
    primaryKey: 'id',
    indexes: ['institution_id', 'patron_staff_id'],
    unique: [['institution_id', 'name']],
    refs: { institution_id: 'institution', patron_staff_id: 'staff' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const residenceSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  campus_id: uuid(),
  name: shortText(200),
  gender: z.enum(RESIDENCE_GENDERS),
  capacity: z.int().min(0).optional(),
  warden_staff_id: uuid().optional(),
  ...auditShape,
});

export type Residence = z.infer<typeof residenceSchema>;

export const residenceEntity = defineEntity({
  name: 'residence',
  schema: residenceSchema,
  storage: {
    table: 'residence',
    primaryKey: 'id',
    indexes: ['institution_id', 'campus_id', 'warden_staff_id'],
    unique: [['campus_id', 'name']],
    refs: {
      institution_id: 'institution',
      campus_id: 'campus',
      warden_staff_id: 'staff',
    },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const residenceBedSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  residence_id: uuid(),
  label: shortText(100),
  ...auditShape,
});

export type ResidenceBed = z.infer<typeof residenceBedSchema>;

export const residenceBedEntity = defineEntity({
  name: 'residence_bed',
  schema: residenceBedSchema,
  storage: {
    table: 'residence_bed',
    primaryKey: 'id',
    indexes: ['institution_id', 'residence_id'],
    unique: [['residence_id', 'label']],
    refs: { institution_id: 'institution', residence_id: 'residence' },
    encrypted: [],
  },
  label: (row) => row.label,
});
