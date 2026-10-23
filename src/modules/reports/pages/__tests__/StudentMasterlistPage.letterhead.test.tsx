// ABOUTME: Tests that the Student Masterlist report prints under a header with the saved school name.
// ABOUTME: school_details comes from the in-memory fake databaseService; app data is an empty stub.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const fake = await vi.hoisted(async () => {
  const { createFakeDatabaseService } = await import('@/tests/utils/schoolDetailsDb');
  return { current: createFakeDatabaseService() };
});
vi.mock('@/services/database/databaseService', () => ({ databaseService: fake.current.databaseService }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key) }),
}));

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({
    loading: {},
  }),
}));

import StudentMasterlistPage from '../StudentMasterlistPage';
import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { createFakeRepository } from '@/modules/hr/data/__tests__/canonicalRepositoryDouble';

const repository = createFakeRepository({
  learner: [
    {
      id: '874b9758-2c1d-4f1e-9a01-5b7c2d3e4f50',
      institution_id: '00000000-0000-7000-8000-000000000001',
      given_name: 'Amina',
      family_name: 'Otieno',
      name_order: 'given_first',
      gender: 'female',
      admission_number: 'ADM001',
      status: 'enrolled',
      residence_status: 'day',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
});

describe('StudentMasterlistPage report header', () => {
  it('shows the saved school name and address above the report', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Probe Academy', postal_address: 'P.O. Box 1', town: 'Nairobi' }]);
    render(
      <CanonicalRepositoryProvider repository={repository}>
        <StudentMasterlistPage />
      </CanonicalRepositoryProvider>
    );
    expect(await screen.findByText('Probe Academy')).toBeTruthy();
    expect(screen.getByText('P.O. Box 1, Nairobi')).toBeTruthy();
  });

  it('lists the learners the repository holds', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Probe Academy', postal_address: 'P.O. Box 1', town: 'Nairobi' }]);
    render(
      <CanonicalRepositoryProvider repository={repository}>
        <StudentMasterlistPage />
      </CanonicalRepositoryProvider>
    );
    expect(await screen.findByText(/Amina Otieno/)).toBeTruthy();
  });

  it('keeps the masterlist explanation on the card heading instead of a filter description row', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Probe Academy', postal_address: 'P.O. Box 1', town: 'Nairobi' }]);
    render(
      <CanonicalRepositoryProvider repository={repository}>
        <StudentMasterlistPage />
      </CanonicalRepositoryProvider>
    );
    await screen.findByText('Probe Academy');

    // The sentence moved off the card body onto the heading, reachable from the info hint.
    expect(screen.getByRole('button', { name: 'About this section' })).toBeTruthy();
    expect(screen.getByText('studentMasterlistPage.filterDescription')).toBeTruthy();
  });
});
