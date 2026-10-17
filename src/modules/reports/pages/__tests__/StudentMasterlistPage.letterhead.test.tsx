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
    students: [],
    classes: [],
    classStreams: [],
    loading: { students: false, classes: false, classStreams: false },
  }),
}));

import StudentMasterlistPage from '../StudentMasterlistPage';

describe('StudentMasterlistPage report header', () => {
  it('shows the saved school name and address above the report', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Probe Academy', postal_address: 'P.O. Box 1', town: 'Nairobi' }]);
    render(<StudentMasterlistPage />);
    expect(await screen.findByText('Probe Academy')).toBeTruthy();
    expect(screen.getByText('P.O. Box 1, Nairobi')).toBeTruthy();
  });
});
