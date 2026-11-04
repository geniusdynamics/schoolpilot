// ABOUTME: Tests the canonical report rows: the chosen year's placement (active or repeating), every
// ABOUTME: page of a large table, the teaching-group memberships behind a roster, and every class of a
// ABOUTME: teaching group on a teacher assignment.

import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { queryCache, type QueryRepository } from '@/data/query';
import {
  MAX_LIMIT,
  type ListQuery,
  type Page,
  type RepositoryRow,
  type Unsubscribe,
} from '@/data/repository';
import type { EntityName } from '@/domain/schema';
import { createFakeRepository } from '@/modules/hr/data/__tests__/canonicalRepositoryDouble';

import { useCanonicalReportData } from '../useCanonicalReportData';

const IDS = {
  year2024: '00000000-0000-7000-8000-000000000024',
  year2025: '00000000-0000-7000-8000-000000000025',
  grade6: '00000000-0000-7000-8000-000000000106',
  grade7: '00000000-0000-7000-8000-000000000107',
  west2024: '00000000-0000-7000-8000-000000000206',
  east2025: '00000000-0000-7000-8000-000000000207',
  west2025: '00000000-0000-7000-8000-000000000208',
  amina: '00000000-0000-7000-8000-000000000301',
  brian: '00000000-0000-7000-8000-000000000302',
  chloe: '00000000-0000-7000-8000-000000000303',
  amina2024: '00000000-0000-7000-8000-000000000401',
  amina2025: '00000000-0000-7000-8000-000000000402',
  brian2024: '00000000-0000-7000-8000-000000000403',
  chloe2025: '00000000-0000-7000-8000-000000000404',
  staff: '00000000-0000-7000-8000-000000000501',
  teachingGroup: '00000000-0000-7000-8000-000000000601',
  assignment: '00000000-0000-7000-8000-000000000701',
  mathematics: '00000000-0000-7000-8000-000000000801',
  membership: '00000000-0000-7000-8000-000000000901',
} as const;

const learner = (id: string, admission: string, given: string, family: string) => ({
  id,
  institution_id: '00000000-0000-7000-8000-000000000001',
  given_name: given,
  family_name: family,
  name_order: 'given_first',
  gender: 'female',
  admission_number: admission,
  status: 'enrolled',
  residence_status: 'day',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const enrolment = (
  id: string,
  learnerId: string,
  yearId: string,
  levelId: string,
  classGroupId: string,
  status: 'active' | 'repeating'
) => ({
  id,
  institution_id: '00000000-0000-7000-8000-000000000001',
  learner_id: learnerId,
  academic_year_id: yearId,
  programme_id: '00000000-0000-7000-8000-000000000010',
  level_id: levelId,
  class_group_id: classGroupId,
  status,
  start_date: yearId === IDS.year2024 ? '2024-01-08' : '2025-01-06',
  entry_reason: 'new_admission',
  fee_category_ids: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

/**
 * The school's rows: two years, two grades, three learners. Amina's 2025 enrolment is a repeat and
 * her 2024 one is still marked active, which is the shape that trips the "latest placement across
 * all years" read.
 */
function seed() {
  return {
    academic_year: [
      {
        id: IDS.year2024,
        institution_id: '00000000-0000-7000-8000-000000000001',
        name: '2024',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'closed',
      },
      {
        id: IDS.year2025,
        institution_id: '00000000-0000-7000-8000-000000000001',
        name: '2025',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        status: 'current',
      },
    ],
    level: [
      { id: IDS.grade6, name: 'Grade 6', ordinal: 6 },
      { id: IDS.grade7, name: 'Grade 7', ordinal: 7 },
    ],
    class_group: [
      {
        id: IDS.west2024,
        academic_year_id: IDS.year2024,
        level_id: IDS.grade6,
        name: 'West',
      },
      {
        id: IDS.east2025,
        academic_year_id: IDS.year2025,
        level_id: IDS.grade7,
        name: 'East',
      },
      {
        id: IDS.west2025,
        academic_year_id: IDS.year2025,
        level_id: IDS.grade6,
        name: 'West',
      },
    ],
    learner: [
      learner(IDS.amina, 'ADM001', 'Amina', 'Otieno'),
      learner(IDS.brian, 'ADM002', 'Brian', 'Kamau'),
      learner(IDS.chloe, 'ADM003', 'Chloe', 'Wanjiku'),
    ],
    enrolment: [
      // The older year first, so a "last row wins" read lands on the wrong placement.
      enrolment(IDS.amina2024, IDS.amina, IDS.year2024, IDS.grade6, IDS.west2024, 'active'),
      enrolment(IDS.amina2025, IDS.amina, IDS.year2025, IDS.grade7, IDS.east2025, 'repeating'),
      enrolment(IDS.brian2024, IDS.brian, IDS.year2024, IDS.grade6, IDS.west2024, 'active'),
      enrolment(IDS.chloe2025, IDS.chloe, IDS.year2025, IDS.grade7, IDS.east2025, 'active'),
    ],
  };
}

function renderReportData(
  repository: QueryRepository,
  options?: { readonly academicYearId?: string | null }
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CanonicalRepositoryProvider repository={repository}>{children}</CanonicalRepositoryProvider>
  );
  return renderHook(() => useCanonicalReportData(options), { wrapper });
}

/** A repository that hands back two rows a page, the way a large table paginates. */
function createPagedRepository(
  seedRows: Record<string, readonly Record<string, unknown>[]>,
  pageSize: number
) {
  const base = createFakeRepository(seedRows);
  const calls: { entity: EntityName; query?: ListQuery }[] = [];

  const repository: QueryRepository = {
    ...base,
    async list<E extends EntityName>(
      entity: E,
      query?: ListQuery
    ): Promise<Page<RepositoryRow<E>>> {
      calls.push({ entity, query });
      const all = await base.list(entity, { ...query, cursor: undefined, offset: 0 });
      const offset = query?.cursor === undefined ? 0 : Number(query.cursor);
      const items = all.items.slice(offset, offset + pageSize);
      const hasMore = offset + pageSize < all.items.length;
      return {
        items,
        total: all.items.length,
        hasMore,
        nextCursor: hasMore ? String(offset + pageSize) : undefined,
      };
    },
    // The live watch delivers one page, exactly like the real repository. A read that does not
    // follow the cursor therefore sees only the first page.
    watch<E extends EntityName>(
      entity: E,
      query: ListQuery,
      listener: (rows: readonly RepositoryRow<E>[], commitSequence: number) => void
    ): Unsubscribe {
      calls.push({ entity, query });
      void (async () => {
        const all = await base.list(entity, { ...query, cursor: undefined, offset: 0 });
        listener(all.items.slice(0, pageSize), 1);
      })();
      return () => undefined;
    },
  };

  return { repository, calls };
}

beforeEach(() => {
  queryCache.clear();
});

describe('useCanonicalReportData placements', () => {
  it('resolves the chosen year, counting a repeating enrolment as on the roll', async () => {
    const { result } = renderReportData(createFakeRepository(seed()), {
      academicYearId: IDS.year2025,
    });
    await waitFor(() => expect(result.current.students).toHaveLength(3));

    const amina = result.current.students.find((student) => student.id === IDS.amina);
    expect(amina?.classLabel).toBe('Grade 7');
    expect(amina?.streamName).toBe('East');
    expect(amina?.classGroupId).toBe(IDS.east2025);
    expect(amina?.levelId).toBe(IDS.grade7);
    expect(amina?.academicYearId).toBe(IDS.year2025);
    // The older fields the rest of the reports still read name the same placement.
    expect(amina?.current_class_name).toBe('Grade 7');
    expect(amina?.current_class_stream_name).toBe('East');
    expect(amina?.current_class_stream_id).toBe(IDS.east2025);

    const brian = result.current.students.find((student) => student.id === IDS.brian);
    expect(brian?.classLabel).toBeNull();
    expect(brian?.classGroupId).toBeNull();
  });

  it('reads the older year when it is the chosen one, not the newest year on file', async () => {
    const { result } = renderReportData(createFakeRepository(seed()), {
      academicYearId: IDS.year2024,
    });
    await waitFor(() => expect(result.current.students).toHaveLength(3));

    const amina = result.current.students.find((student) => student.id === IDS.amina);
    expect(amina?.classLabel).toBe('Grade 6');
    expect(amina?.streamName).toBe('West');
    expect(amina?.classGroupId).toBe(IDS.west2024);

    const chloe = result.current.students.find((student) => student.id === IDS.chloe);
    expect(chloe?.classLabel).toBeNull();
  });

  it('defaults to the year the school flags current', async () => {
    const { result } = renderReportData(createFakeRepository(seed()));
    await waitFor(() => expect(result.current.students).toHaveLength(3));

    expect(result.current.academicYearName).toBe('2025');
    const amina = result.current.students.find((student) => student.id === IDS.amina);
    expect(amina?.classLabel).toBe('Grade 7');
  });

  it('lists the learning areas of the chosen year behind a learner', async () => {
    const rows = {
      ...seed(),
      learning_area: [{ id: IDS.mathematics, name: 'Mathematics' }],
      teaching_group: [
        {
          id: IDS.teachingGroup,
          academic_year_id: IDS.year2025,
          learning_area_id: IDS.mathematics,
          name: 'Grade 7 Mathematics',
          class_group_ids: [IDS.east2025],
          level_ids: [IDS.grade7],
          teacher_ids: [IDS.staff],
          kind: 'whole_class',
        },
      ],
      teaching_group_member: [
        {
          id: IDS.membership,
          teaching_group_id: IDS.teachingGroup,
          enrolment_id: IDS.amina2025,
          valid_from: '2025-01-06',
          valid_to: null,
        },
      ],
    };
    const { result } = renderReportData(createFakeRepository(rows), {
      academicYearId: IDS.year2025,
    });
    await waitFor(() => expect(result.current.students).toHaveLength(3));

    const amina = result.current.students.find((student) => student.id === IDS.amina);
    expect(amina?.learningAreaNames).toEqual(['Mathematics']);
    const chloe = result.current.students.find((student) => student.id === IDS.chloe);
    expect(chloe?.learningAreaNames).toEqual([]);
  });
});

describe('useCanonicalReportData reads whole tables', () => {
  it('follows every page of learners instead of stopping at the first', async () => {
    const learners = Array.from({ length: 5 }, (_, index) =>
      learner(
        `00000000-0000-7000-8000-00000000030${index + 1}`,
        `ADM10${index + 1}`,
        `Learner${index + 1}`,
        'Test'
      )
    );
    const { repository, calls } = createPagedRepository({ learner: learners }, 2);
    const { result } = renderReportData(repository);

    await waitFor(() => expect(result.current.students).toHaveLength(5));
    expect(calls.some((call) => call.entity === 'learner' && call.query?.limit === MAX_LIMIT)).toBe(
      true
    );
  });
});

describe('useCanonicalReportData teacher assignments', () => {
  it('names every class of a teaching group and carries the year id', async () => {
    const rows = {
      ...seed(),
      staff: [
        {
          id: IDS.staff,
          given_name: 'Jane',
          family_name: 'Doe',
          employee_number: 'T001',
          department_ids: [],
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      learning_area: [{ id: IDS.mathematics, name: 'Mathematics' }],
      teaching_group: [
        {
          id: IDS.teachingGroup,
          academic_year_id: IDS.year2025,
          learning_area_id: IDS.mathematics,
          name: 'Grade 6 and 7 Mathematics',
          class_group_ids: [IDS.east2025, IDS.west2025],
          level_ids: [IDS.grade7, IDS.grade6],
          teacher_ids: [IDS.staff],
          kind: 'set',
        },
      ],
      teaching_assignment: [
        {
          id: IDS.assignment,
          staff_id: IDS.staff,
          teaching_group_id: IDS.teachingGroup,
          role: 'main',
          valid_from: '2025-01-06',
        },
      ],
    };
    const { result } = renderReportData(createFakeRepository(rows));
    await waitFor(() => expect(result.current.teacherSubjectAssignments).toHaveLength(2));

    const assignments = result.current.teacherSubjectAssignments;
    expect(assignments.map((row) => row.class_stream_name).sort()).toEqual(['East', 'West']);
    for (const assignment of assignments) {
      expect(assignment.teacher_name).toBe('Jane Doe');
      expect(assignment.subject_name).toBe('Mathematics');
      expect(assignment.academic_year_id).toBe(IDS.year2025);
      expect(assignment.academic_year_name).toBe('2025');
    }
    expect(new Set(assignments.map((row) => row.id)).size).toBe(2);
  });
});
