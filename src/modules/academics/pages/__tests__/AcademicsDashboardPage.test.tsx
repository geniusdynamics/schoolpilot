// ABOUTME: The academics dashboard shows the canonical school's own rows. It never prints an
// ABOUTME: invented trend or a fabricated activity row: an empty school says "No marks entered yet".

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { AcademicsDashboardPageContent } from '../AcademicsDashboardPage';
import { createFakeRepository, type FakeRepository } from './canonicalRepositoryDouble';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

// recharts' ResponsiveContainer subscribes to ResizeObserver, which jsdom does not provide.
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

const INSTITUTION = '0192a1b2-0000-7000-8000-000000000001';
const YEAR = '0192a1b2-0000-7000-8000-000000000002';
const PERIOD = '0192a1b2-0000-7000-8000-000000000003';
const LEVEL = '0192a1b2-0000-7000-8000-000000000004';
const CLASS_GROUP = '0192a1b2-0000-7000-8000-000000000005';
const PROGRAMME = '0192a1b2-0000-7000-8000-000000000006';
const AREA = '0192a1b2-0000-7000-8000-000000000007';
const ASSESSMENT = '0192a1b2-0000-7000-8000-000000000008';
const LEARNER = '0192a1b2-0000-7000-8000-000000000009';
const ENROLMENT = '0192a1b2-0000-7000-8000-00000000000a';

const baseRows = () => ({
  institution: [{ id: INSTITUTION, name: 'Greenfields Academy' }],
  academic_year: [{ id: YEAR, name: '2026', status: 'current' }],
  academic_period: [
    {
      id: PERIOD,
      name: 'Term 3',
      academic_year_id: YEAR,
      status: 'current',
      start_date: '2026-09-07',
      end_date: '2026-11-27',
    },
  ],
  programme: [{ id: PROGRAMME, name: 'CBE' }],
  level: [{ id: LEVEL, name: 'Grade 7' }],
  class_group: [
    {
      id: CLASS_GROUP,
      name: 'East',
      level_id: LEVEL,
      academic_year_id: YEAR,
      programme_id: PROGRAMME,
      campus_id: 'campus',
      institution_id: INSTITUTION,
      homeroom_teacher_ids: [],
    },
  ],
  learning_area: [
    {
      id: AREA,
      name: 'Mathematics',
      code: 'MAT',
      kind: 'core',
      programme_id: PROGRAMME,
      level_ids: [LEVEL],
      pathway_ids: [],
      institution_id: INSTITUTION,
    },
  ],
  assessment: [
    {
      id: ASSESSMENT,
      name: 'End of Term',
      kind: 'end_term',
      status: 'open',
      academic_period_id: PERIOD,
      learning_area_ids: [AREA],
      level_ids: [LEVEL],
      class_group_ids: [CLASS_GROUP],
      component_ids: [],
      institution_id: INSTITUTION,
    },
  ],
  learner: [
    {
      id: LEARNER,
      given_name: 'Amani',
      family_name: 'Otieno',
      admission_number: 'ADM-001',
      institution_id: INSTITUTION,
    },
  ],
  enrolment: [
    {
      id: ENROLMENT,
      learner_id: LEARNER,
      class_group_id: CLASS_GROUP,
      academic_year_id: YEAR,
      status: 'active',
      institution_id: INSTITUTION,
    },
  ],
});

let repository: FakeRepository;

function renderDashboard() {
  return render(
    <MemoryRouter>
      <CanonicalRepositoryProvider repository={repository}>
        <AcademicsDashboardPageContent />
      </CanonicalRepositoryProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  repository = createFakeRepository(baseRows());
});

describe('academics dashboard', () => {
  it('says no marks have been entered and shows no invented activity', async () => {
    renderDashboard();

    expect((await screen.findAllByText('No marks entered yet.')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/New exam session scheduled/)).toBeNull();
    expect(screen.queryByText(/hours ago/)).toBeNull();
    expect(screen.queryByText('+3')).toBeNull();
    // Nothing from the legacy demo school's curriculum or classes.
    expect(screen.queryByText('Biology')).toBeNull();
    expect(screen.queryByText(/Form 1 A/)).toBeNull();
  });

  it('shows the real last mark and its school, not a demo class', async () => {
    repository.publish('mark', [
      {
        id: 'mark-1',
        learning_area_id: AREA,
        assessment_id: ASSESSMENT,
        enrolment_id: ENROLMENT,
        score: '72',
        status_code: 'present',
        entered_at: '2026-10-20T09:00:00.000Z',
        institution_id: INSTITUTION,
      },
    ]);

    renderDashboard();

    expect(await screen.findByText('Amani Otieno')).toBeTruthy();
    expect(screen.getByText(/Mathematics · End of Term/)).toBeTruthy();
    expect(screen.getByText('72')).toBeTruthy();
    expect(screen.queryByText(/Form 1 A/)).toBeNull();
  });
});
