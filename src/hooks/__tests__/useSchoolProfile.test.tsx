// ABOUTME: Tests that useSchoolProfile reads the single school_details record and follows later saves live.
// ABOUTME: Backed by the in-memory fake databaseService from src/tests/utils/schoolDetailsDb.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const fake = await vi.hoisted(async () => {
  const { createFakeDatabaseService } = await import('@/tests/utils/schoolDetailsDb');
  return { current: createFakeDatabaseService() };
});
vi.mock('@/services/database/databaseService', () => ({ databaseService: fake.current.databaseService }));

import { useSchoolProfile, formatSchoolAddress, formatSchoolContact } from '../useSchoolProfile';

describe('useSchoolProfile', () => {
  beforeEach(() => fake.current.collections.school_details.seed([]));

  it('returns no name when nothing has been saved', async () => {
    const { result } = renderHook(() => useSchoolProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.schoolName).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('returns the saved school name and updates when the record changes', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Probe Academy' }]);
    const { result } = renderHook(() => useSchoolProfile());
    await waitFor(() => expect(result.current.schoolName).toBe('Probe Academy'));

    await act(async () => {
      await fake.current.collections.school_details.update('s1', { name: 'Renamed Academy' });
    });
    await waitFor(() => expect(result.current.schoolName).toBe('Renamed Academy'));
  });

  it('formats address and contact lines from the profile fields', () => {
    const profile = { name: 'X', postal_address: 'P.O. Box 1', town: 'Nairobi', telephone: '0700', email: 'a@b.ke' };
    expect(formatSchoolAddress(profile)).toBe('P.O. Box 1, Nairobi');
    expect(formatSchoolContact(profile)).toBe('0700 | a@b.ke');
    expect(formatSchoolAddress(null)).toBe('');
  });
});
