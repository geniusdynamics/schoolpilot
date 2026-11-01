// ABOUTME: Tests the whole-class hook's save path: an edited cell creates the canonical mark row with
// ABOUTME: the assessment, enrolment and learning area, and the written row is shown afterwards.

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createFinanceRepositoryDouble } from '@/modules/finance/data/__tests__/canonicalRepositoryDouble';
import type { Id } from '@/domain/ids';

const repository = vi.hoisted(() => ({ current: null as ReturnType<typeof createFinanceRepositoryDouble> | null }));
const period = { id: 'p1', name: 'Term 1', status: 'current', start_date: '2027-01-01', end_date: '2027-04-30' };
const level = { id: 'l1', name: 'Form 1' };
const classGroup = { id: 'c1', name: 'Form 1 Blue', level_id: 'l1', homeroom_teacher_ids: [] };
const learner = {
  id: 'l1',
  given_name: 'Amina',
  family_name: 'Wanjiku',
  preferred_name: null,
  admission_number: 'ADM-1',
};
const enrolment = { id: 'e1', learner_id: 'l1', class_group_id: 'c1', status: 'active' };
const area = { id: 'math', name: 'Mathematics' };
const group = { id: 'g1', learning_area_id: 'math', class_group_ids: ['c1'], teacher_ids: [] };
const membership = { id: 'm1', teaching_group_id: 'g1', enrolment_id: 'e1', valid_from: '2027-01-01', valid_to: null };
const assessment = {
  id: 'a1',
  name: 'End of term Maths',
  kind: 'end_term',
  scheme_slot: 'ET',
  academic_period_id: 'p1',
  learning_area_ids: ['math'],
  class_group_ids: ['c1'],
  level_ids: ['l1'],
  max_score: 100,
  status: 'open',
};

vi.mock('@/data/useCanonicalSessionActor', () => ({
  useCanonicalSessionActor: () => ({ actorId: 'admin-1', role: 'administrator' }),
}));

vi.mock('@/modules/academics/data/useCanonicalAcademics', () => ({
  useCanonicalAcademics: () => ({
    repository: repository.current,
    institutionId: 'inst-1',
    isLoading: false,
    assessments: [assessment],
    teachingGroups: [group],
    teachingAssignments: [],
    teachingGroupMembers: [membership],
    marks: [],
    academicPeriods: [period],
    classGroups: [classGroup],
    levels: [level],
    learningAreas: [area],
    staff: [],
    learners: [learner],
    enrolments: [enrolment],
    learnerById: new Map([['l1', learner]]),
    enrolmentById: new Map([['e1', enrolment]]),
    learningAreaById: new Map([['math', area]]),
    classGroupById: new Map([['c1', classGroup]]),
    staffById: new Map(),
    academicYearById: new Map(),
    programmeById: new Map(),
  }),
}));

import { useClassMarkEntry } from '../useClassMarkEntry';

beforeEach(() => {
  repository.current = createFinanceRepositoryDouble({
    mark: [],
  });
});

describe('useClassMarkEntry', () => {
  it('saves a typed score as one canonical mark row', async () => {
    const { result } = renderHook(() =>
      useClassMarkEntry({
        periodId: 'p1' as Id<'academic_period'>,
        levelId: 'l1' as Id<'level'>,
        classGroupId: 'c1' as Id<'class_group'>,
        examKey: 'ET',
        learningAreaId: null,
        search: '',
      })
    );

    await waitFor(() => expect(result.current.grid.rows).toHaveLength(1));
    const row = result.current.grid.rows[0];
    const column = result.current.grid.columns[0];
    expect(row).toBeDefined();
    expect(column).toBeDefined();

    act(() => {
      result.current.setScore(row!.id, column!.key, '80');
    });
    expect(result.current.dirtyCount).toBe(1);

    let report;
    await act(async () => {
      report = await result.current.saveAll();
    });

    expect(report).toMatchObject({ saved: 1, failed: 0 });
    const marks = repository.current?.rows.mark ?? [];
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({
      assessment_id: 'a1',
      enrolment_id: 'e1',
      learning_area_id: 'math',
      score: '80',
      status_code: 'present',
    });
  });
});
