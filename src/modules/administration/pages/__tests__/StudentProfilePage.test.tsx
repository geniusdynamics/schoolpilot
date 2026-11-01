// ABOUTME: Tests the canonical student profile route: a learner is read by the route id and the
// ABOUTME: directory's View link lands on a real record, not the old legacy student not-found page.
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const learner = vi.hoisted(() => ({
  id: '0192f4a1-1c2d-7b3e-9f40-0a1b2c3d4e5f',
  institution_id: 'institution-1',
  given_name: 'Amina',
  family_name: 'Wanjiku',
  admission_number: 'ADM/2026/012',
  status: 'enrolled',
  gender: 'female',
  residence_status: 'day',
  phones: [{ number: '+254700000012' }],
  emails: [],
  admission_date: '2026-01-05',
  date_of_birth: '2012-04-11',
  previous_school: 'Riverside Primary',
  rowVersion: 1,
}));

vi.mock('@/data/query', () => ({
  useEntityQuery: (_repository: unknown, entity: string) => ({
    data: { items: entity === 'learner' ? [learner] : [] },
    status: 'success',
    error: null,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../data/canonicalRepository', () => ({
  useCanonicalRepository: () => ({}),
}));

import { StudentProfileContent } from '../StudentProfilePage';

describe('StudentProfilePage', () => {
  it('renders the learner behind the route id, with the admission number', () => {
    render(
      <MemoryRouter initialEntries={[`/administration/students/${learner.id}`]}>
        <Routes>
          <Route path="/administration/students/:studentId" element={<StudentProfileContent />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Student Profile')).toBeInTheDocument();
    expect(screen.getByText('Amina Wanjiku')).toBeInTheDocument();
    expect(screen.getByText('ADM/2026/012')).toBeInTheDocument();
    expect(screen.getByText('+254700000012')).toBeInTheDocument();
    expect(screen.getByText(/No active class placement/)).toBeInTheDocument();
  });
});
