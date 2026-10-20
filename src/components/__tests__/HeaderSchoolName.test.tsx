// ABOUTME: Tests that the app header shows the school name saved in school_details, live after a save.
// ABOUTME: Without a saved profile the header falls back to the product name.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';

const fake = await vi.hoisted(async () => {
  const { createFakeDatabaseService } = await import('@/tests/utils/schoolDetailsDb');
  return { current: createFakeDatabaseService() };
});
vi.mock('@/services/database/databaseService', () => ({ databaseService: fake.current.databaseService }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));
vi.mock('../../hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({ config: { features: { networkStatusIndicator: false, moduleHealthIndicator: false } } }),
}));
vi.mock('../ui/LanguageSwitcher', () => ({ default: () => null }));
vi.mock('../UserMenu', () => ({ default: () => null }));
vi.mock('../OfflineCapability', () => ({ NetworkStatusIndicator: () => null }));
vi.mock('../ModuleHealthIndicator', () => ({ default: () => null }));
vi.mock('../StorageUnavailableScreen', () => ({ TemporaryDataBadge: () => null }));

import Header from '../Header';

describe('Header school name', () => {
  beforeEach(() => fake.current.collections.school_details.seed([]));

  it('shows the saved school name', async () => {
    fake.current.collections.school_details.seed([{ id: 's1', name: 'Probe Academy' }]);
    render(<Header onSettings={() => {}} />);
    expect(await screen.findByText('Probe Academy')).toBeTruthy();
  });

  it('falls back to the product name with no saved profile, then follows a save', async () => {
    render(<Header onSettings={() => {}} />);
    expect(await screen.findByText('schoolpilot')).toBeTruthy();
    await waitFor(() => expect(fake.current.collections.school_details.listenerCount()).toBeGreaterThan(0));
    await act(async () => {
      await fake.current.collections.school_details.insert({ id: 's1', name: 'Greenfields Academy' });
    });
    expect(await screen.findByText('Greenfields Academy')).toBeTruthy();
  });
});
