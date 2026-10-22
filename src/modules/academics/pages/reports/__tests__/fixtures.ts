// ABOUTME: Deterministic fixtures for the report publishing tests: a real results computation from
// ABOUTME: the assessment engine (the P2-E03 path), the pack's primary-term template and its locales.

import type { AggregationDefinition } from '@/domain/assessment/aggregation';
import type { SchemeDefinition } from '@/domain/assessment/engine';
import type { GradingScaleDefinition } from '@/domain/assessment/scales';
import type { ReportLocaleBundles, ReportSchool, ReportTemplate } from '@/domain/reports/types';

import { aggregateLearner, evaluateArea, type AreaSource, type AreaMark } from '../../results';
import type { LearnerResultRow } from '../../results';
import type { SchemeColumn } from '../../marks/types';

export const INSTITUTION_ID = '0192a1b2-0000-7000-8000-000000000001';
export const PERIOD_ID = '0192a1b2-0000-7000-8000-000000000002';
export const CLASS_GROUP_ID = '0192a1b2-0000-7000-8000-000000000003';
export const ACTOR_ID = '0192a1b2-0000-7000-8000-000000000004';
export const AT = '2026-10-22T08:00:00.000Z';

export const HOSTS = {
  verification: 'https://verify.schoolpilot.app',
  portal: 'https://portal.schoolpilot.app',
  short: 'https://sp.app',
} as const;

export const SECRET = 'test-signing-secret';

export const SCHOOL: ReportSchool = {
  name: 'Riverside Academy',
  motto: 'Knowledge · Integrity · Service',
  address: 'Nairobi',
  contact: 'Riverside',
  logo: null,
};

const SCALE: GradingScaleDefinition = {
  code: 'subject_bands',
  kind: 'numeric_bands',
  bands: [
    { code: 'A', label: 'A', min: 80, max: 101, points: 12 },
    { code: 'B', label: 'B', min: 70, max: 80, points: 9 },
    { code: 'C', label: 'C', min: 60, max: 70, points: 7 },
    { code: 'D', label: 'D', min: 50, max: 60, points: 5 },
    { code: 'E', label: 'E', min: 0, max: 50, points: 3 },
  ],
};

const SCHEME: SchemeDefinition = {
  code: 'end-of-term',
  slots: [{ code: 'ET', max: '100' }],
  learning_area_score: { op: 'sum', of: ['ET'], out_of: '100' },
  default_missing: 'incomplete',
};

export const AGGREGATION: AggregationDefinition = {
  code: 'overall',
  op: 'mean',
  value: 'score',
  precision: 2,
  result_scale: 'subject_bands',
};

interface AreaFixture {
  readonly id: string;
  readonly assessmentId: string;
  readonly code: string;
  readonly name: string;
  readonly group: string;
}

const AREA_FIXTURES: readonly AreaFixture[] = [
  { id: 'area-eng', assessmentId: 'assess-eng', code: 'ENG', name: 'English', group: 'languages' },
  { id: 'area-mat', assessmentId: 'assess-mat', code: 'MAT', name: 'Mathematics', group: 'mathematics' },
  { id: 'area-sci', assessmentId: 'assess-sci', code: 'SCI', name: 'Science', group: 'sciences' },
];

function columnFor(area: AreaFixture): SchemeColumn {
  return {
    key: area.assessmentId,
    assessmentId: area.assessmentId,
    slot: 'ET',
    label: 'End of Term',
    max: 100,
    kind: 'end_term',
    assessmentStatus: 'open',
  };
}

export const AREAS: readonly AreaSource[] = AREA_FIXTURES.map((area) => ({
  groupId: `group-${area.code}`,
  learningAreaId: area.id,
  code: area.code,
  name: area.name,
  group: area.group,
  scheme: SCHEME,
  columns: [columnFor(area)],
  scale: SCALE,
}));

export interface LearnerFixture {
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly admissionNumber: string | null;
  readonly scores: Readonly<Record<string, string | null>>;
}

export const LEARNERS: readonly LearnerFixture[] = [
  {
    enrolmentId: 'enrol-amani',
    learnerName: 'Amani Otieno',
    admissionNumber: 'ADM-001',
    scores: { ENG: '88', MAT: '79', SCI: '65' },
  },
  {
    enrolmentId: 'enrol-bello',
    learnerName: 'Bello Mwangi',
    admissionNumber: 'ADM-002',
    scores: { ENG: '70', MAT: '60', SCI: '50' },
  },
  {
    enrolmentId: 'enrol-chidi',
    learnerName: 'Chidi Nkemdirim',
    admissionNumber: 'ADM-003',
    scores: { ENG: '55', MAT: '48', SCI: '41' },
  },
];

/** One learner's stored marks, in the shape the results page reads. */
export function marksFor(learner: LearnerFixture): AreaMark[] {
  const marks: AreaMark[] = [];
  for (const area of AREA_FIXTURES) {
    const score = learner.scores[area.code];
    if (score === null || score === undefined) continue;
    marks.push({ assessmentId: area.assessmentId, score, status: 'present' });
  }
  return marks;
}

/** The computed results, through the same engine calls the results page makes. */
export function computeRows(learners: readonly LearnerFixture[] = LEARNERS): LearnerResultRow[] {
  return learners.map((learner) => {
    const outcomes = AREAS.map((area, index) => {
      const areaFixture = AREA_FIXTURES[index];
      const marks = marksFor(learner).filter((mark) => mark.assessmentId === areaFixture.assessmentId);
      return evaluateArea(area, marks);
    });
    return {
      enrolmentId: learner.enrolmentId,
      learnerName: learner.learnerName,
      admissionNumber: learner.admissionNumber,
      areas: outcomes,
      aggregate: aggregateLearner({
        definition: AGGREGATION,
        areas: AREAS,
        outcomes,
        context: { scales: [SCALE] },
      }),
    };
  });
}

/** The pack's primary-term template (packs/ke-cbe/reports/primary-term.report.json). */
export const TEMPLATE: ReportTemplate = {
  code: 'primary-term',
  name: 'Primary term report (PP1 to G6)',
  levels: ['PP1', 'PP2', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
  page: { size: 'A4', orientation: 'portrait' },
  blocks: [
    { type: 'header', label_key: 'block.header' },
    { type: 'learner', label_key: 'block.learner' },
    { type: 'attendance', label_key: 'block.attendance' },
    { type: 'results_table', label_key: 'block.results', columns: ['total', 'grade'] },
    { type: 'rubric_table', label_key: 'block.rubric' },
    { type: 'summary', label_key: 'block.summary' },
    { type: 'comments', label_key: 'block.comments' },
    { type: 'signatures', label_key: 'block.signatures' },
    { type: 'verification', label_key: 'block.verification' },
  ],
  comment_max_length: 500,
};

export const LOCALES: ReportLocaleBundles = {
  en: {
    labels: {
      'block.header': 'School report',
      'block.learner': 'Learner',
      'block.attendance': 'Attendance',
      'block.results': 'Results',
      'block.rubric': 'Learning areas and levels',
      'block.summary': 'Summary',
      'block.comments': 'Comments',
      'block.signatures': 'Signatures',
      'block.verification': 'Verification',
      'summary.moderated': 'Moderated',
      'summary.moderation_reason': 'Moderation reason',
    },
  },
  sw: {
    labels: {
      'block.header': 'Ripoti ya shule',
      'block.summary': 'Muhtasari',
    },
  },
};

export const TEMPLATE_VERSION = '2026.1.0';
