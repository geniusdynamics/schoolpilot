// ABOUTME: Canonical curriculum schemas from spec 02 §4: packs, programmes, stages, levels,
// ABOUTME: pathways, learning areas, components, outcomes, competencies and combination rules.

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

export const PROGRAMME_STATUSES = ['draft', 'active', 'archived'] as const;
export const LEARNING_AREA_KINDS = [
  'core',
  'optional',
  'elective',
  'co_curricular',
  'pastoral',
] as const;
export const COMPONENT_KINDS = [
  'paper',
  'practical',
  'coursework',
  'oral',
  'project',
  'strand',
] as const;
export const OUTCOME_KINDS = [
  'strand',
  'sub_strand',
  'specific_learning_outcome',
  'assessment_objective',
] as const;
export const COMPETENCY_KINDS = [
  'core_competency',
  'value',
  'pertinent_issue',
  'attitude',
] as const;

export const curriculumPackSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  code: shortText(50),
  version: shortText(50),
  country: z.string().length(2),
  issuer: shortText(200),
  effective_from: isoDate(),
  checksum: shortText(200),
  ...auditShape,
});

export type CurriculumPack = z.infer<typeof curriculumPackSchema>;

export const curriculumPackEntity = defineEntity({
  name: 'curriculum_pack',
  schema: curriculumPackSchema,
  storage: {
    table: 'curriculum_pack',
    primaryKey: 'id',
    indexes: ['institution_id', 'code', 'country'],
    unique: [['institution_id', 'code', 'version']],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => `${row.code} v${row.version}`,
});

export const programmeSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  curriculum_pack_code: shortText(50),
  pack_version: shortText(50),
  name: shortText(200),
  calendar_id: uuid(),
  status: z.enum(PROGRAMME_STATUSES),
  overrides: z.record(z.string(), z.json()).optional(),
  ...auditShape,
});

export type Programme = z.infer<typeof programmeSchema>;

export const programmeEntity = defineEntity({
  name: 'programme',
  schema: programmeSchema,
  storage: {
    table: 'programme',
    primaryKey: 'id',
    indexes: ['institution_id', 'calendar_id', 'status'],
    unique: [['institution_id', 'name']],
    refs: { institution_id: 'institution', calendar_id: 'calendar' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const stageSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  programme_id: uuid(),
  code: shortText(50),
  name: shortText(200),
  sequence: z.int().min(0),
  ...auditShape,
});

export type Stage = z.infer<typeof stageSchema>;

export const stageEntity = defineEntity({
  name: 'stage',
  schema: stageSchema,
  storage: {
    table: 'stage',
    primaryKey: 'id',
    indexes: ['institution_id', 'programme_id', 'sequence'],
    unique: [['programme_id', 'code']],
    refs: { institution_id: 'institution', programme_id: 'programme' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const levelSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  stage_id: uuid(),
  code: shortText(50),
  name: shortText(200),
  ordinal: z.int().min(0),
  typical_age: z.int().min(0).max(100).optional(),
  next_level_id: uuid().optional(),
  is_terminal: z.boolean(),
  national_assessment_code: z.string().max(100).optional(),
  ...auditShape,
});

export type Level = z.infer<typeof levelSchema>;

export const levelEntity = defineEntity({
  name: 'level',
  schema: levelSchema,
  storage: {
    table: 'level',
    primaryKey: 'id',
    indexes: ['institution_id', 'stage_id', 'ordinal', 'next_level_id'],
    unique: [['stage_id', 'code']],
    refs: {
      institution_id: 'institution',
      stage_id: 'stage',
      next_level_id: 'level',
    },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const pathwaySchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  programme_id: uuid(),
  code: shortText(50),
  name: shortText(200),
  level_ids: z.array(uuid()),
  rules: jsonValueSchema.optional(),
  ...auditShape,
});

export type Pathway = z.infer<typeof pathwaySchema>;

export const pathwayEntity = defineEntity({
  name: 'pathway',
  schema: pathwaySchema,
  storage: {
    table: 'pathway',
    primaryKey: 'id',
    indexes: ['institution_id', 'programme_id', 'code'],
    unique: [['programme_id', 'code']],
    refs: { institution_id: 'institution', programme_id: 'programme' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const learningAreaSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  programme_id: uuid(),
  code: shortText(50),
  name: shortText(200),
  short_name: shortText(100).optional(),
  group: z.string().max(100).optional(),
  kind: z.enum(LEARNING_AREA_KINDS),
  level_ids: z.array(uuid()),
  pathway_ids: z.array(uuid()),
  national_code: z.string().max(100).optional(),
  ...auditShape,
});

export type LearningArea = z.infer<typeof learningAreaSchema>;

export const learningAreaEntity = defineEntity({
  name: 'learning_area',
  schema: learningAreaSchema,
  storage: {
    table: 'learning_area',
    primaryKey: 'id',
    indexes: ['institution_id', 'programme_id', 'kind', 'code'],
    unique: [['programme_id', 'code']],
    refs: { institution_id: 'institution', programme_id: 'programme' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const componentSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  learning_area_id: uuid(),
  code: shortText(50),
  name: shortText(200),
  kind: z.enum(COMPONENT_KINDS),
  weight: z.number().min(0).optional(),
  max_score: z.number().min(0).optional(),
  ...auditShape,
});

export type Component = z.infer<typeof componentSchema>;

export const componentEntity = defineEntity({
  name: 'component',
  schema: componentSchema,
  storage: {
    table: 'component',
    primaryKey: 'id',
    indexes: ['institution_id', 'learning_area_id', 'kind'],
    unique: [['learning_area_id', 'code']],
    refs: { institution_id: 'institution', learning_area_id: 'learning_area' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const outcomeSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  learning_area_id: uuid(),
  level_id: uuid(),
  parent_id: uuid().optional(),
  code: shortText(50),
  text: z.string().min(1),
  kind: z.enum(OUTCOME_KINDS),
  ...auditShape,
});

export type Outcome = z.infer<typeof outcomeSchema>;

export const outcomeEntity = defineEntity({
  name: 'outcome',
  schema: outcomeSchema,
  storage: {
    table: 'outcome',
    primaryKey: 'id',
    indexes: ['institution_id', 'learning_area_id', 'level_id', 'parent_id'],
    unique: [['learning_area_id', 'level_id', 'code']],
    refs: {
      institution_id: 'institution',
      learning_area_id: 'learning_area',
      level_id: 'level',
      parent_id: 'outcome',
    },
    encrypted: [],
  },
  label: (row) => row.text,
});

export const competencySchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  programme_id: uuid(),
  code: shortText(50),
  name: shortText(200),
  kind: z.enum(COMPETENCY_KINDS),
  descriptors: z.array(z.string().min(1)),
  ...auditShape,
});

export type Competency = z.infer<typeof competencySchema>;

export const competencyEntity = defineEntity({
  name: 'competency',
  schema: competencySchema,
  storage: {
    table: 'competency',
    primaryKey: 'id',
    indexes: ['institution_id', 'programme_id', 'kind'],
    unique: [['programme_id', 'code']],
    refs: { institution_id: 'institution', programme_id: 'programme' },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const combinationRuleSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  programme_id: uuid(),
  level_ids: z.array(uuid()),
  rule: jsonValueSchema,
  ...auditShape,
});

export type CombinationRule = z.infer<typeof combinationRuleSchema>;

export const combinationRuleEntity = defineEntity({
  name: 'combination_rule',
  schema: combinationRuleSchema,
  storage: {
    table: 'combination_rule',
    primaryKey: 'id',
    indexes: ['institution_id', 'programme_id'],
    unique: [],
    refs: { institution_id: 'institution', programme_id: 'programme' },
    encrypted: [],
  },
  label: (row) => `${row.level_ids.length} level${row.level_ids.length === 1 ? '' : 's'}`,
});
