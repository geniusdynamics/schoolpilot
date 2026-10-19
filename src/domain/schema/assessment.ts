// ABOUTME: Canonical assessment schemas from spec 02 §8: schemes, grading scales, assessments,
// ABOUTME: marks, competency observations, results, period aggregates and report cards.

import { z } from 'zod/v4';

import {
  auditShape,
  entityIdShape,
  isoDate,
  shortText,
  tenancyShape,
  uuid,
} from './common';
import { defineEntity } from './defineEntity';

export const GRADING_SCALE_KINDS = [
  'numeric_bands',
  'rubric',
  'points',
  'letter',
  'division',
  'gpa',
  'mark_out_of_20',
] as const;
export const ASSESSMENT_KINDS = [
  'formative',
  'cat',
  'opener',
  'mid_term',
  'end_term',
  'mock',
  'project',
  'practical',
  'portfolio',
  'national',
] as const;
export const ASSESSMENT_STATUSES = ['draft', 'open', 'closed', 'moderated', 'published'] as const;
export const MARK_STATUSES = ['present', 'absent', 'exempt', 'incomplete', 'malpractice'] as const;
export const COMMENT_SCOPES = ['learning_area', 'overall', 'conduct'] as const;

const DECIMAL_STRING = /^-?\d+(\.\d+)?$/;

export const gradingScaleBandSchema = z.strictObject({
  code: shortText(50),
  label: shortText(200),
  min: z.number(),
  max: z.number(),
  points: z.number().optional(),
  descriptor: z.string().max(500).optional(),
});

export type GradingScaleBand = z.infer<typeof gradingScaleBandSchema>;

export const assessmentSchemeSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  programme_id: uuid(),
  level_ids: z.array(uuid()),
  version: shortText(50),
  definition: z.json(),
  ...auditShape,
});

export type AssessmentScheme = z.infer<typeof assessmentSchemeSchema>;

export const assessmentSchemeEntity = defineEntity({
  name: 'assessment_scheme',
  schema: assessmentSchemeSchema,
  storage: {
    table: 'assessment_scheme',
    primaryKey: 'id',
    indexes: ['institution_id', 'programme_id'],
    unique: [['programme_id', 'version']],
    refs: { institution_id: 'institution', programme_id: 'programme' },
    encrypted: [],
  },
  label: (row) => `${row.programme_id} · v${row.version}`,
});

export const gradingScaleSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    programme_id: uuid(),
    code: shortText(50),
    kind: z.enum(GRADING_SCALE_KINDS),
    bands: z.array(gradingScaleBandSchema),
    version: shortText(50),
    ...auditShape,
  })
  .refine((row) => row.bands.every((band) => band.min <= band.max), {
    path: ['bands'],
    message: 'every grading band must have min <= max',
  });

export type GradingScale = z.infer<typeof gradingScaleSchema>;

export const gradingScaleEntity = defineEntity({
  name: 'grading_scale',
  schema: gradingScaleSchema,
  storage: {
    table: 'grading_scale',
    primaryKey: 'id',
    indexes: ['institution_id', 'programme_id', 'kind', 'code'],
    unique: [['programme_id', 'code', 'version']],
    refs: { institution_id: 'institution', programme_id: 'programme' },
    encrypted: [],
  },
  label: (row) => `${row.code} (${row.kind})`,
});

export const dateWindowSchema = z
  .strictObject({
    start_date: isoDate(),
    end_date: isoDate(),
  })
  .refine((row) => row.end_date >= row.start_date, {
    path: ['end_date'],
    message: 'end_date must be on or after start_date',
  });

export type DateWindow = z.infer<typeof dateWindowSchema>;

export const assessmentSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  academic_period_id: uuid(),
  kind: z.enum(ASSESSMENT_KINDS),
  name: shortText(200),
  scheme_slot: z.string().max(50).optional(),
  level_ids: z.array(uuid()),
  class_group_ids: z.array(uuid()),
  learning_area_ids: z.array(uuid()),
  component_ids: z.array(uuid()),
  max_score: z.number().min(0).optional(),
  date_window: dateWindowSchema.optional(),
  status: z.enum(ASSESSMENT_STATUSES),
  grading_scale_id: uuid().optional(),
  ...auditShape,
});

export type Assessment = z.infer<typeof assessmentSchema>;

export const assessmentEntity = defineEntity({
  name: 'assessment',
  schema: assessmentSchema,
  storage: {
    table: 'assessment',
    primaryKey: 'id',
    indexes: ['institution_id', 'academic_period_id', 'status', 'kind'],
    // Names repeat legitimately across levels and class groups within a period.
    unique: [],
    refs: {
      institution_id: 'institution',
      academic_period_id: 'academic_period',
      grading_scale_id: 'grading_scale',
    },
    encrypted: [],
  },
  label: (row) => row.name,
});

export const markSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  assessment_id: uuid(),
  enrolment_id: uuid(),
  learning_area_id: uuid(),
  component_id: uuid().optional(),
  score: z
    .string()
    .regex(DECIMAL_STRING, 'score must be a decimal string')
    .optional(),
  rubric_level: z.string().max(100).optional(),
  status_code: z.enum(MARK_STATUSES),
  comment: z.string().max(2000).optional(),
  entered_by: uuid().optional(),
  entered_at: z.iso.datetime().optional(),
  version: z.int().min(1),
  ...auditShape,
});

export type Mark = z.infer<typeof markSchema>;

export const markEntity = defineEntity({
  name: 'mark',
  schema: markSchema,
  storage: {
    table: 'mark',
    primaryKey: 'id',
    indexes: ['institution_id', 'assessment_id', 'enrolment_id', 'learning_area_id', 'status_code'],
    unique: [
      ['assessment_id', 'enrolment_id', 'learning_area_id', 'component_id'],
      // SQLite treats NULLs as distinct, so component-less marks need an explicit partial index.
      {
        columns: ['assessment_id', 'enrolment_id', 'learning_area_id'],
        where: 'component_id IS NULL',
      },
    ],
    refs: {
      institution_id: 'institution',
      assessment_id: 'assessment',
      enrolment_id: 'enrolment',
      learning_area_id: 'learning_area',
      component_id: 'component',
      entered_by: 'user',
    },
    encrypted: [],
  },
  label: (row) => `${row.assessment_id} · ${row.enrolment_id}`,
});

export const competencyObservationSchema = z
  .strictObject({
    ...entityIdShape,
    ...tenancyShape,
    enrolment_id: uuid(),
    learning_area_id: uuid(),
    outcome_id: uuid().optional(),
    competency_id: uuid().optional(),
    rubric_level: shortText(100),
    evidence: z.string().max(2000).optional(),
    observed_on: isoDate(),
    observer_id: uuid().optional(),
    ...auditShape,
  })
  .refine(
    (row) =>
      (row.outcome_id !== undefined ? 1 : 0) + (row.competency_id !== undefined ? 1 : 0) === 1,
    {
      path: ['outcome_id'],
      message: 'exactly one of outcome_id or competency_id is required',
    }
  );

export type CompetencyObservation = z.infer<typeof competencyObservationSchema>;

export const competencyObservationEntity = defineEntity({
  name: 'competency_observation',
  schema: competencyObservationSchema,
  storage: {
    table: 'competency_observation',
    primaryKey: 'id',
    indexes: [
      'institution_id',
      'enrolment_id',
      'learning_area_id',
      'outcome_id',
      'competency_id',
      'observed_on',
    ],
    unique: [],
    refs: {
      institution_id: 'institution',
      enrolment_id: 'enrolment',
      learning_area_id: 'learning_area',
      outcome_id: 'outcome',
      competency_id: 'competency',
      observer_id: 'user',
    },
    encrypted: [],
  },
  label: (row) => `${row.observed_on} · ${row.rubric_level}`,
});

export const resultSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  enrolment_id: uuid(),
  academic_period_id: uuid(),
  learning_area_id: uuid(),
  score: z.number().optional(),
  grade: z.string().max(50).optional(),
  points: z.number().optional(),
  rubric_level: z.string().max(100).optional(),
  rank_in_group: z.int().min(1).optional(),
  teacher_comment: z.string().max(2000).optional(),
  computed_at: z.iso.datetime(),
  engine_version: shortText(50),
  is_final: z.boolean(),
  ...auditShape,
});

export type Result = z.infer<typeof resultSchema>;

export const resultEntity = defineEntity({
  name: 'result',
  schema: resultSchema,
  storage: {
    table: 'result',
    primaryKey: 'id',
    indexes: ['institution_id', 'enrolment_id', 'academic_period_id', 'learning_area_id'],
    unique: [['enrolment_id', 'academic_period_id', 'learning_area_id']],
    refs: {
      institution_id: 'institution',
      enrolment_id: 'enrolment',
      academic_period_id: 'academic_period',
      learning_area_id: 'learning_area',
    },
    encrypted: [],
  },
  label: (row) =>
    `${row.learning_area_id} · ${row.grade ?? row.score ?? row.rubric_level ?? 'result'}`,
});

export const periodResultSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  enrolment_id: uuid(),
  academic_period_id: uuid(),
  aggregates: z.strictObject({
    total: z.number().optional(),
    mean: z.number().optional(),
    mean_grade: z.string().max(50).optional(),
    points: z.number().optional(),
    division: z.string().max(50).optional(),
    gpa: z.number().optional(),
    average_out_of_20: z.number().optional(),
    position: z.int().min(1).optional(),
    out_of: z.int().min(1).optional(),
  }),
  class_teacher_comment: z.string().max(2000).optional(),
  head_comment: z.string().max(2000).optional(),
  conduct: z.string().max(500).optional(),
  ...auditShape,
});

export type PeriodResult = z.infer<typeof periodResultSchema>;

export const periodResultEntity = defineEntity({
  name: 'period_result',
  schema: periodResultSchema,
  storage: {
    table: 'period_result',
    primaryKey: 'id',
    indexes: ['institution_id', 'enrolment_id', 'academic_period_id'],
    unique: [['enrolment_id', 'academic_period_id']],
    refs: {
      institution_id: 'institution',
      enrolment_id: 'enrolment',
      academic_period_id: 'academic_period',
    },
    encrypted: [],
  },
  label: (row) => `${row.enrolment_id} · ${row.academic_period_id}`,
});

export const reportCardSchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  enrolment_id: uuid(),
  academic_period_id: uuid(),
  template_code: shortText(100),
  template_version: shortText(50),
  version: z.int().min(1),
  snapshot: z.json(),
  pdf_attachment_id: uuid().optional(),
  published_at: z.iso.datetime().optional(),
  published_by: uuid().optional(),
  acknowledged_by_guardian_at: z.iso.datetime().optional(),
  ...auditShape,
});

export type ReportCard = z.infer<typeof reportCardSchema>;

export const reportCardEntity = defineEntity({
  name: 'report_card',
  schema: reportCardSchema,
  storage: {
    table: 'report_card',
    primaryKey: 'id',
    indexes: ['institution_id', 'enrolment_id', 'academic_period_id', 'published_at'],
    unique: [
      ['enrolment_id', 'academic_period_id', 'template_code', 'template_version', 'version'],
    ],
    refs: {
      institution_id: 'institution',
      enrolment_id: 'enrolment',
      academic_period_id: 'academic_period',
      published_by: 'user',
    },
    encrypted: ['snapshot'],
  },
  label: (row) => `${row.template_code} v${row.template_version} (rev ${row.version})`,
});

export const commentBankEntrySchema = z.strictObject({
  ...entityIdShape,
  ...tenancyShape,
  scope: z.enum(COMMENT_SCOPES),
  band: z.string().max(100).optional(),
  text: z.string().min(1).max(2000),
  locale: z.string().min(2).max(35),
  ...auditShape,
});

export type CommentBankEntry = z.infer<typeof commentBankEntrySchema>;

export const commentBankEntryEntity = defineEntity({
  name: 'comment_bank_entry',
  schema: commentBankEntrySchema,
  storage: {
    table: 'comment_bank_entry',
    primaryKey: 'id',
    indexes: ['institution_id', 'scope', 'locale'],
    unique: [],
    refs: { institution_id: 'institution' },
    encrypted: [],
  },
  label: (row) => row.text,
});
