// ABOUTME: Tests that the masterlist places learners in the chosen academic year (never the newest
// ABOUTME: placement on file) and that filters only apply when Generate is pressed.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const fake = await vi.hoisted(async () => {
  const { createFakeDatabaseService } = await import('@/tests/utils/schoolDetailsDb');
  return { current: createFakeDatabaseService() };
});
vi.mock('@/services/database/databaseService', () => ({ databaseService: fake.current.databaseService }));

const LABELS: Record<string, string> = {
  'studentMasterlistPage.title': 'Student Masterlist',
  'studentMasterlistPage.filterDescription': 'Filter students by class, stream, status, and gender',
  'studentMasterlistPage.filterByStatus': 'Filter by Status',
  'studentMasterlistPage.allStatuses': 'All Statuses',
  'studentMasterlistPage.filterByGender': 'Filter by Gender',
  'studentMasterlistPage.allGenders': 'All Genders',
  'studentMasterlistPage.generateReport': 'Generate Report',
  'studentMasterlistPage.loadingInitialData': 'Loading initial data...',
  'studentMasterlistPage.print': 'Print',
  'studentMasterlistPage.exportCSV': 'Export CSV',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      LABELS[key] ?? (typeof fallback === 'string' ? fallback : key),
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

import { StudentMasterlistPageContent } from '../StudentMasterlistPage';

const IDS = {
  year2024: '00000000-0000-7000-8000-000000000024',
  year2025: '00000000-0000-7000-8000-000000000025',
  grade6: '00000000-0000-7000-8000-000000000106',
  grade7: '00000000-0000-7000-8000-000000000107',
  west2024: '00000000-0000-7000-8000-000000000206',
  east2025: '00000000-0000-7000-8000-000000000207',
  amina: '00000000-0000-7000-8000-000000000301',
  brian: '00000000-0000-7000-8000-000000000302',
  chloe: '00000000-0000-7000-8000-000000000303',
} as const;

const learner = (id: string, admission: string, given: string, family: string, status = 'enrolled') => ({
  id,
  institution_id: '00000000-0000-7000-8000-000000000001',
  given_name: given,
  family_name: family,
  name_order: 'given_first',
  gender: 'female',
  admission_number: admission,
  status,
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
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const repository = createFakeRepository({
  academic_year: [
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
    { id: IDS.grade6, name: 'Grade 6', ordinal: 6 },
    { id: IDS.grade7, name: 'Grade 7', ordinal: 7 },
  ],
  class_group: [
    { id: IDS.west2024, academic_year_id: IDS.year2024, level_id: IDS.grade6, name: 'West' },
    { id: IDS.east2025, academic_year_id: IDS.year2025, level_id: IDS.grade7, name: 'East' },
  ],
  learner: [
    learner(IDS.amina, 'ADM001', 'Amina', 'Otieno'),
    learner(IDS.brian, 'ADM002', 'Brian', 'Kamau', 'withdrawn'),
    learner(IDS.chloe, 'ADM003', 'Chloe', 'Wanjiku'),
  ],
  enrolment: [
    enrolment('e1', IDS.amina, IDS.year2024, IDS.grade6, IDS.west2024, 'active'),
    enrolment('e2', IDS.amina, IDS.year2025, IDS.grade7, IDS.east2025, 'repeating'),
    enrolment('e3', IDS.brian, IDS.year2024, IDS.grade6, IDS.west2024, 'active'),
    enrolment('e4', IDS.chloe, IDS.year2025, IDS.grade7, IDS.east2025, 'active'),
  ],
});

function renderPage() {
  return render(
    <CanonicalRepositoryProvider repository={repository}>
      <StudentMasterlistPageContent />
    </CanonicalRepositoryProvider>
  );
}

async function chooseYear(yearName: string) {
  fireEvent.click(screen.getByTestId('scope-year'));
  fireEvent.click(await screen.findByRole('option', { name: yearName }));
}

describe('StudentMasterlistPage academic scope', () => {
  it('shows the chosen year’s placement and never an older year’s class', async () => {
    fake.current.collections.school_details.seed([
      { id: 's1', name: 'Probe Academy', postal_address: 'P.O. Box 1', town: 'Nairobi' },
    ]);
    renderPage();

    expect(await screen.findByText(/Amina Otieno/)).toBeTruthy();
    expect((await screen.findAllByText('Grade 7')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('East').length).toBeGreaterThan(0);
    // Brian is only enrolled in 2024, so the 2025 report leaves his class and stream blank.
    expect(screen.queryAllByText('Grade 6')).toHaveLength(0);
    expect(screen.getByText(/Brian Kamau/)).toBeTruthy();
  });

  it('keeps the current snapshot until Generate is pressed, then applies the chosen year', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Probe Academy' }]);
    renderPage();
    await screen.findByText(/Amina Otieno/);
    expect(screen.getAllByText('Grade 7').length).toBeGreaterThan(0);

    await chooseYear('2024');
    // The scope changed, but the report is an explicit snapshot: it still shows 2025.
    expect(screen.getAllByText('Grade 7').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Grade 6')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Generate Report' }));
    await waitFor(() => expect(screen.getAllByText('Grade 6').length).toBeGreaterThan(0));
    expect(screen.queryAllByText('Grade 7')).toHaveLength(0);
  });

  it('applies the status filter to the same scoped rows on Generate', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Probe Academy' }]);
    renderPage();
    await screen.findByText(/Amina Otieno/);

    fireEvent.change(screen.getByLabelText('Filter by Status'), { target: { value: 'Withdrawn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Report' }));

    await waitFor(() => expect(screen.queryByText(/Amina Otieno/)).toBeNull());
    expect(screen.getByText(/Brian Kamau/)).toBeTruthy();
  });
});
