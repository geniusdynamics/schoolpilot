// ABOUTME: The school's name and logo in the header take the user to the main dashboard. The header
// ABOUTME: only reports the click: it renders without a router, so where "home" is belongs to the layout.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));
vi.mock('../../hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({ config: { features: { networkStatusIndicator: false, moduleHealthIndicator: false } } }),
}));
vi.mock('../../hooks/useSchoolProfile', () => ({
  useSchoolProfile: () => ({ schoolName: 'Mwangaza Secondary' }),
}));
vi.mock('../ui/LanguageSwitcher', () => ({ default: () => null }));
vi.mock('../UserMenu', () => ({ default: () => null }));
vi.mock('../OfflineCapability', () => ({ NetworkStatusIndicator: () => null }));
vi.mock('../ModuleHealthIndicator', () => ({ default: () => null }));
vi.mock('../StorageUnavailableScreen', () => ({ TemporaryDataBadge: () => null }));

import Header from '../Header';

describe('the header brand', () => {
  it('is a button that reports a click, so the layout can take the user home', () => {
    const onHome = vi.fn();
    render(<Header onSettings={() => {}} onHome={onHome} />);

    fireEvent.click(screen.getByRole('button', { name: /main dashboard/i }));

    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it('is the school name and the logo together, not the name alone', () => {
    render(<Header onSettings={() => {}} onHome={() => {}} />);

    const brand = screen.getByRole('button', { name: /main dashboard/i });
    expect(brand.textContent).toContain('Mwangaza Secondary');
    expect(brand.textContent).toContain('E');
  });

  it('says what it does, to a pointer and to a screen reader', () => {
    render(<Header onSettings={() => {}} onHome={() => {}} />);

    const brand = screen.getByRole('button', { name: /main dashboard/i });
    expect(brand.getAttribute('title')).toMatch(/main dashboard/i);
  });

  it('stays a plain label when there is nowhere to go, as it was', () => {
    render(<Header onSettings={() => {}} />);

    expect(screen.queryByRole('button', { name: /main dashboard/i })).toBeNull();
    expect(screen.getByText('Mwangaza Secondary')).toBeTruthy();
  });
});
