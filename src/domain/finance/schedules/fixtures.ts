// ABOUTME: The fee schedule of spec 05 §2.2, transcribed as data: the Kenyan mixed day/boarding
// ABOUTME: secondary school's 2027 Term 1 matrix, its levels, its fee items and its exact amounts,
// ABOUTME: so the acceptance — the spec's own example is reproducible — is a test, not a claim.

import { fromMajor, type Money } from '@/domain/money';
import type { Id } from '@/domain/ids';

import type {
  ScheduleCellInput,
  ScheduleFrequency,
  ScheduleProrationRule,
  ScheduleVersionInput,
} from './types';

/** The currency the spec's example is stated in. */
export const SPEC_EXAMPLE_CURRENCY = 'KES';

/** The levels the example prices. "Form 3/4" is two levels: the exam row prices them differently. */
export const SPEC_EXAMPLE_LEVELS = ['Grade 10', 'Form 3', 'Form 4'] as const;
export type SpecLevel = (typeof SPEC_EXAMPLE_LEVELS)[number];

/** The residences the example prices. */
export const SPEC_EXAMPLE_RESIDENCES = ['day', 'boarder'] as const;
export type SpecResidence = (typeof SPEC_EXAMPLE_RESIDENCES)[number];

/** The fee items the example bills, with the code each is created under. */
export const SPEC_EXAMPLE_ITEMS = [
  { code: 'TUITION', name: 'Tuition', category: 'tuition' },
  { code: 'BOARDING_MEALS', name: 'Boarding & meals', category: 'boarding' },
  { code: 'LUNCH', name: 'Lunch (optional subscription)', category: 'meals' },
  { code: 'ACTIVITY', name: 'Activity', category: 'activity' },
  { code: 'EXAM', name: 'Exam (KCSE registration)', category: 'exam' },
  { code: 'ADMISSION', name: 'Admission (new learners only, one-off)', category: 'other' },
] as const;
export type SpecItemCode = (typeof SPEC_EXAMPLE_ITEMS)[number]['code'];

/** One line of the spec's table. */
export interface SpecLine {
  readonly code: SpecItemCode;
  /** The amount as the spec writes it, in major units of KES. */
  readonly major: string;
  readonly mandatory: boolean;
  readonly frequency: ScheduleFrequency;
  readonly prorationRule: ScheduleProrationRule;
}

/** One column of the spec's table. */
export interface SpecCell {
  readonly level: SpecLevel;
  readonly residence: SpecResidence;
  readonly lines: readonly SpecLine[];
}

function line(code: SpecItemCode, major: string, frequency: ScheduleFrequency = 'per_term'): SpecLine {
  return { code, major, mandatory: true, frequency, prorationRule: 'full' };
}

function optional(code: SpecItemCode, major: string): SpecLine {
  return { code, major, mandatory: false, frequency: 'per_term', prorationRule: 'full' };
}

/**
 * The spec's §2.2 table, cell by cell.
 *
 * | Fee item | Grade 10 day | Grade 10 boarder | Form 3/4 day | Form 3/4 boarder |
 * | Tuition | 6,000 | 6,000 | 5,500 | 5,500 |
 * | Boarding & meals | — | 18,500 | — | 17,000 |
 * | Lunch (optional) | 4,200 | — | 4,200 | — |
 * | Activity | 1,000 | 1,000 | 1,000 | 1,000 |
 * | Exam (F4 only) | — | — | 0 / 5,000 | 0 / 5,000 |
 * | Admission (new learners, one-off) | 2,000 | 2,000 | — | — |
 *
 * The spec's "Form 3/4" column groups two levels, and its "0 / 5,000" prices them apart: Form 3 pays
 * nothing (KCSE registration is a Form 4 event) and Form 4 pays 5,000. The example is therefore
 * transcribed as three levels, so every number the spec writes has a cell and none is dropped.
 * The Admission row is the spec's "new learners only" item; the canonical `fee_schedule_line` has no
 * per-line new-learner flag, so it is modelled as lines that exist only in the Grade 10 cells.
 */
export const SPEC_EXAMPLE_MATRIX: readonly SpecCell[] = [
  {
    level: 'Grade 10',
    residence: 'day',
    lines: [
      line('TUITION', '6000'),
      optional('LUNCH', '4200'),
      line('ACTIVITY', '1000'),
      line('ADMISSION', '2000', 'one_off_at_admission'),
    ],
  },
  {
    level: 'Grade 10',
    residence: 'boarder',
    lines: [
      line('TUITION', '6000'),
      line('BOARDING_MEALS', '18500'),
      line('ACTIVITY', '1000'),
      line('ADMISSION', '2000', 'one_off_at_admission'),
    ],
  },
  {
    level: 'Form 3',
    residence: 'day',
    lines: [line('TUITION', '5500'), optional('LUNCH', '4200'), line('ACTIVITY', '1000'), line('EXAM', '0')],
  },
  {
    level: 'Form 3',
    residence: 'boarder',
    lines: [line('TUITION', '5500'), line('BOARDING_MEALS', '17000'), line('ACTIVITY', '1000'), line('EXAM', '0')],
  },
  {
    level: 'Form 4',
    residence: 'day',
    lines: [
      line('TUITION', '5500'),
      optional('LUNCH', '4200'),
      line('ACTIVITY', '1000'),
      line('EXAM', '5000', 'one_off_at_admission'),
    ],
  },
  {
    level: 'Form 4',
    residence: 'boarder',
    lines: [
      line('TUITION', '5500'),
      line('BOARDING_MEALS', '17000'),
      line('ACTIVITY', '1000'),
      line('EXAM', '5000', 'one_off_at_admission'),
    ],
  },
];

/** The exact total of each column of the spec's table, in KES. */
export const SPEC_EXAMPLE_TOTALS: Readonly<Record<string, Money>> = {
  'Grade 10/day': specAmount('13200'),
  'Grade 10/boarder': specAmount('27500'),
  'Form 3/day': specAmount('10700'),
  'Form 3/boarder': specAmount('23500'),
  'Form 4/day': specAmount('15700'),
  'Form 4/boarder': specAmount('28500'),
};

/** The ids the example's rows need, so a caller maps its own rows onto the fixture. */
export interface SpecExampleIds {
  readonly institutionId: Id<'institution'>;
  readonly academicYearId: Id<'academic_year'>;
  readonly academicPeriodId: Id<'academic_period'>;
  readonly programmeId: Id<'programme'>;
  readonly feeCategoryId: Id<'fee_category'>;
  readonly campusId: Id<'campus'>;
  readonly levelId: (level: SpecLevel) => Id<'level'>;
  readonly feeItemId: (code: SpecItemCode) => Id<'fee_item'>;
}

/** The example's amount as Money, in KES. */
export function specAmount(major: string): Money {
  return fromMajor(major, SPEC_EXAMPLE_CURRENCY);
}

/** The default name of the example's matrix. */
export const SPEC_EXAMPLE_NAME = '2027 Term 1 Fees (spec §2.2)';

/** Builds the spec's §2.2 example as a version input the service can write. */
export function buildSpecExampleVersion(
  ids: SpecExampleIds,
  options: { readonly version?: number; readonly name?: string } = {}
): ScheduleVersionInput {
  const cells: ScheduleCellInput[] = SPEC_EXAMPLE_MATRIX.map((cell) => ({
    levelId: ids.levelId(cell.level),
    residence: cell.residence,
    feeCategoryId: ids.feeCategoryId,
    campusId: ids.campusId,
    lines: cell.lines.map((entry) => ({
      feeItemId: ids.feeItemId(entry.code),
      amount: specAmount(entry.major),
      mandatory: entry.mandatory,
      frequency: entry.frequency,
      prorationRule: entry.prorationRule,
    })),
  }));

  return {
    institutionId: ids.institutionId,
    name: options.name ?? SPEC_EXAMPLE_NAME,
    academicYearId: ids.academicYearId,
    academicPeriodIds: [ids.academicPeriodId],
    programmeIds: [ids.programmeId],
    levelIds: SPEC_EXAMPLE_LEVELS.map(ids.levelId),
    residenceStatuses: [...SPEC_EXAMPLE_RESIDENCES],
    feeCategoryIds: [ids.feeCategoryId],
    campusId: ids.campusId,
    newLearnersOnly: false,
    version: options.version ?? 1,
    cells,
  };
}
