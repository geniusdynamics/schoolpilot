// ABOUTME: Tests that Class Lists is the canonical roster of the chosen year, class and stream:
// ABOUTME: no hard-coded form/stream options and no grade aggregation from unrelated exam sessions.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const fake = await vi.hoisted(async () => {
  const { createFakeDatabaseService } = await import('@/tests/utils/schoolDetailsDb');
  return { current: createFakeDatabaseService() };
});
vi.mock('@/services/database/databaseService', () => ({ databaseService: fake.current.databaseService }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

// The live announcement's timer outlives jsdom; the scope bar's popup needs the rest of the module.
vi.mock('@/utils/accessibility', async () => {
  const actual = await vi.importActual<typeof import('@/utils/accessibility')>(
    '@/utils/accessibility'
  );
  return { ...actual, announceToScreenReader: vi.fn() };
});

import { CanonicalRepositoryProvider } from '@/data/canonicalRepository';
import { createFakeRepository } from '@/modules/hr/data/__tests__/canonicalRepositoryDouble';

import { ClassListsPageContent } from '../ClassListsPage';

const IDS = {
  year2023: '00000000-0000-7000-8000-000000000023',
  year2024: '00000000-0000-7000-8000-000000000024',
  year2025: '00000000-0000-7000-8000-000000000025',
  grade5: '00000000-0000-7000-8000-000000000105',
  grade6: '00000000-0000-7000-8000-000000000106',
  grade7: '00000000-0000-7000-8000-000000000107',
  north2023: '00000000-0000-7000-8000-000000000205',
  west2024: '00000000-0000-7000-8000-000000000206',
  east2025: '00000000-0000-7000-8000-000000000207',
  amina: '00000000-0000-7000-8000-000000000301',
  brian: '00000000-0000-7000-8000-000000000302',
  chloe: '00000000-0000-7000-8000-000000000303',
  mathematics: '00000000-0000-7000-8000-000000000801',
  teachingGroup: '00000000-0000-7000-8000-000000000601',
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
  start_date: yearId === IDS.year2024 ? '2024-01-08' : yearId === IDS.year2023 ? '2023-01-09' : '2025-01-06',
  entry_reason: 'new_admission',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const repository = createFakeRepository({
  academic_year: [
    {
      id: IDS.year2023,
      name: '2023',
      start_date: '2023-01-01',
      end_date: '2023-12-31',
      status: 'closed',
    },
    {
      id: IDS.year2024,
      name: '2024',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'closed',
    },
    {
      id: IDS.year2025,
      name: '2025',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      status: 'current',
    },
  ],
  level: [
    { id: IDS.grade5, name: 'Grade 5', ordinal: 5 },
    { id: IDS.grade6, name: 'Grade 6', ordinal: 6 },
    { id: IDS.grade7, name: 'Grade 7', ordinal: 7 },
  ],
  class_group: [
    { id: IDS.north2023, academic_year_id: IDS.year2023, level_id: IDS.grade5, name: 'North' },
    { id: IDS.west2024, academic_year_id: IDS.year2024, level_id: IDS.grade6, name: 'West' },
    { id: IDS.east2025, academic_year_id: IDS.year2025, level_id: IDS.grade7, name: 'East' },
  ],
  learner: [
    learner(IDS.amina, 'ADM001', 'Amina', 'Otieno'),
    learner(IDS.brian, 'ADM002', 'Brian', 'Kamau'),
    learner(IDS.chloe, 'ADM003', 'Chloe', 'Wanjiku'),
  ],
  enrolment: [
    enrolment('e1', IDS.amina, IDS.year2024, IDS.grade6, IDS.west2024, 'active'),
    enrolment('e2', IDS.amina, IDS.year2025, IDS.grade7, IDS.east2025, 'repeating'),
    enrolment('e3', IDS.brian, IDS.year2024, IDS.grade6, IDS.west2024, 'active'),
    enrolment('e4', IDS.chloe, IDS.year2025, IDS.grade7, IDS.east2025, 'active'),
  ],
  learning_area: [{ id: IDS.mathematics, name: 'Mathematics' }],
  teaching_group: [
    {
      id: IDS.teachingGroup,
      academic_year_id: IDS.year2025,
      learning_area_id: IDS.mathematics,
      name: 'Grade 7 Mathematics',
      class_group_ids: [IDS.east2025],
      level_ids: [IDS.grade7],
      teacher_ids: [],
      kind: 'whole_class',
    },
  ],
  teaching_group_member: [
    {
      id: 'm1',
      teaching_group_id: IDS.teachingGroup,
      enrolment_id: 'e2',
      valid_from: '2025-01-06',
      valid_to: null,
    },
  ],
});

function renderPage() {
  return render(
    <CanonicalRepositoryProvider repository={repository}>
      <ClassListsPageContent />
    </CanonicalRepositoryProvider>
  );
}

async function chooseYear(yearName: string) {
  fireEvent.click(screen.getByTestId('scope-year'));
  fireEvent.click(await screen.findByRole('option', { name: yearName }));
}

describe('ClassListsPage canonical roster', () => {
  it('lists the chosen year’s learners with class, stream and learning areas', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Probe Academy' }]);
    renderPage();

    expect(await screen.findByText(/Amina Otieno/)).toBeTruthy();
    // Brian has no placement in 2025, so he has no class list to appear on.
    expect(screen.queryByText(/Brian Kamau/)).toBeNull();
    expect((await screen.findAllByText('Grade 7')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('East').length).toBeGreaterThan(0);
    expect(screen.getByText('Mathematics')).toBeTruthy();
    // No older-year placement leaks onto a current roster.
    expect(screen.queryAllByText('Grade 6')).toHaveLength(0);
    // The page is a roster, not the old grade aggregation over every exam session.
    expect(screen.queryByText('Grade Breakdown')).toBeNull();
    expect(screen.queryByText('Mean Marks by Stream')).toBeNull();
  });

  it('regenerates the roster for another year when Generate is pressed', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Probe Academy' }]);
    renderPage();
    await screen.findByText(/Amina Otieno/);

    await chooseYear('2024');
    fireEvent.click(screen.getByRole('button', { name: 'Generate Report' }));

    await waitFor(() => expect(screen.getAllByText('Grade 6').length).toBeGreaterThan(0));
    expect(screen.queryAllByText('Grade 7')).toHaveLength(0);
    expect(screen.getAllByText('West').length).toBeGreaterThan(0);
    // Brian is on the 2024 roll, Chloe is not.
    expect(screen.getByText(/Brian Kamau/)).toBeTruthy();
    expect(screen.queryByText(/Chloe Wanjiku/)).toBeNull();
  });

  it('says honestly when a year has no learners', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Probe Academy' }]);
    renderPage();
    await screen.findByText(/Amina Otieno/);

    await chooseYear('2023');
    fireEvent.click(screen.getByRole('button', { name: 'Generate Report' }));

    expect(
      await screen.findByText('No learners match the selected year, class and stream.')
    ).toBeTruthy();
  });
});
