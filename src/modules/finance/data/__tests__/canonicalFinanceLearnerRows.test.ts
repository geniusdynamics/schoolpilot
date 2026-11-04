// ABOUTME: Pins the finance learner rows to ids and to one chosen academic year: the class label is the
// ABOUTME: grade, the stream is the class group, and two grades' same-named stream never collide.

import { describe, expect, it } from 'vitest';

import type { RepositoryRow } from '@/data/repository';

import { buildFinanceLearnerRows } from '../canonicalFinance';

const YEAR_2026 = '21111111-1111-7111-8111-111111111111';
const YEAR_2027 = '21111111-1111-7111-8111-222222222222';
const INSTITUTION = '00000000-0000-7000-8000-000000000001';

const year = (id: string, name: string, status: string, start: string, end: string) =>
  ({
    id,
    institution_id: INSTITUTION,
    calendar_id: '0a0a0a0a-0a0a-7a0a-8a0a-0a0a0a0a0a0a',
    name,
    start_date: start,
    end_date: end,
    status,
  }) as unknown as RepositoryRow<'academic_year'>;

const grade = (id: string, name: string, ordinal: number) =>
  ({
    id,
    institution_id: INSTITUTION,
    stage_id: `stage-${id}`,
    code: name,
    name,
    ordinal,
    is_terminal: false,
  }) as unknown as RepositoryRow<'level'>;

const group = (id: string, name: string, yearId: string, levelId: string) =>
  ({
    id,
    institution_id: INSTITUTION,
    campus_id: '44444444-4444-7444-8444-444444444444',
    academic_year_id: yearId,
    programme_id: '55555555-5555-7555-8555-555555555555',
    level_id: levelId,
    name,
    homeroom_teacher_ids: [],
  }) as unknown as RepositoryRow<'class_group'>;

const student = (id: string, givenName: string) =>
  ({
    id,
    institution_id: INSTITUTION,
    admission_number: `ADM-${id}`,
    given_name: givenName,
    family_name: 'Wanjiru',
    name_order: 'given_first',
    gender: 'female',
    status: 'enrolled',
    residence_status: 'day',
  }) as unknown as RepositoryRow<'learner'>;

const placement = (input: {
  readonly id: string;
  readonly learnerId: string;
  readonly yearId: string;
  readonly levelId: string;
  readonly classGroupId: string;
  readonly start: string;
  readonly status?: string;
}) =>
  ({
    id: input.id,
    institution_id: INSTITUTION,
    learner_id: input.learnerId,
    academic_year_id: input.yearId,
    programme_id: '55555555-5555-7555-8555-555555555555',
    level_id: input.levelId,
    class_group_id: input.classGroupId,
    status: input.status ?? 'active',
    start_date: input.start,
    entry_reason: 'new_admission',
  }) as unknown as RepositoryRow<'enrolment'>;

describe('buildFinanceLearnerRows', () => {
  const years = [year(YEAR_2026, '2026', 'closed', '2026-01-01', '2026-12-31'), year(YEAR_2027, '2027', 'current', '2027-01-01', '2027-12-31')];
  const levels = [grade('level-7', 'Grade 7', 7), grade('level-8', 'Grade 8', 8)];
  const groups = [
    group('class-7-east', 'East', YEAR_2026, 'level-7'),
    group('class-8-east', 'East', YEAR_2026, 'level-8'),
    group('class-7-west', 'West', YEAR_2027, 'level-7'),
  ];

  it('keeps two grades’ same-named stream apart, with the grade as the class label', () => {
    const rows = buildFinanceLearnerRows({
      years,
      levels,
      classGroups: groups,
      learners: [student('learner-1', 'Amina'), student('learner-2', 'Brian')],
      enrolments: [
        placement({ id: 'enrolment-1', learnerId: 'learner-1', yearId: YEAR_2026, levelId: 'level-7', classGroupId: 'class-7-east', start: '2026-01-05' }),
        placement({ id: 'enrolment-2', learnerId: 'learner-2', yearId: YEAR_2026, levelId: 'level-8', classGroupId: 'class-8-east', start: '2026-01-05' }),
      ],
      academicYearId: YEAR_2026,
    });

    expect(rows.map((row) => row.classGroupId)).toEqual(['class-7-east', 'class-8-east']);
    expect(rows.map((row) => row.classLabel)).toEqual(['Grade 7', 'Grade 8']);
    expect(rows.map((row) => row.streamName)).toEqual(['East', 'East']);
    expect(rows.map((row) => row.className)).toEqual(['Grade 7 · East', 'Grade 8 · East']);
  });

  it('resolves the placement of the chosen year, not the latest across every year', () => {
    const enrolments = [
      placement({ id: 'enrolment-2026', learnerId: 'learner-1', yearId: YEAR_2026, levelId: 'level-7', classGroupId: 'class-7-east', start: '2026-01-05' }),
      placement({ id: 'enrolment-2027', learnerId: 'learner-1', yearId: YEAR_2027, levelId: 'level-7', classGroupId: 'class-7-west', start: '2027-01-05' }),
    ];

    const chosen = buildFinanceLearnerRows({
      years,
      levels,
      classGroups: groups,
      learners: [student('learner-1', 'Amina')],
      enrolments,
      academicYearId: YEAR_2026,
    });
    expect(chosen[0]).toMatchObject({
      classGroupId: 'class-7-east',
      className: 'Grade 7 · East',
    });

    const byDefault = buildFinanceLearnerRows({
      years,
      levels,
      classGroups: groups,
      learners: [student('learner-1', 'Amina')],
      enrolments,
    });
    expect(byDefault[0]).toMatchObject({
      classGroupId: 'class-7-west',
      className: 'Grade 7 · West',
    });
  });

  it('ignores a placement that is not active or repeating', () => {
    const rows = buildFinanceLearnerRows({
      years,
      levels,
      classGroups: groups,
      learners: [student('learner-1', 'Amina')],
      enrolments: [
        placement({
          id: 'enrolment-1',
          learnerId: 'learner-1',
          yearId: YEAR_2026,
          levelId: 'level-7',
          classGroupId: 'class-7-east',
          start: '2026-01-05',
          status: 'transferred',
        }),
      ],
      academicYearId: YEAR_2026,
    });

    expect(rows[0]).toMatchObject({
      classGroupId: '',
      classLabel: '',
      streamName: '',
      className: '',
    });
  });
});
