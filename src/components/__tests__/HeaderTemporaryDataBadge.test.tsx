// ABOUTME: Tests that the app header shows the red TEMPORARY DATA badge while SQLite runs on an allowed memory database.
// ABOUTME: With persistent storage the header shows no badge.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

const statusStore = vi.hoisted(() => {
  let status: any = { mode: 'opfs-sahpool', persisted: true };
  const listeners = new Set<() => void>();
  return {
    get: () => status,
    set: (next: any) => {
      status = next;
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
});

vi.mock('@/services/database/SQLiteWASMProvider', () => ({
  getSQLiteStorageStatus: () => statusStore.get(),
  subscribeSQLiteStorageStatus: (l: () => void) => statusStore.subscribe(l),
}));

vi.mock('../../hooks/useUnifiedConfig', () => ({
  useUnifiedConfig: () => ({ config: { features: { networkStatusIndicator: false, moduleHealthIndicator: false } } }),
}));
vi.mock('../ui/LanguageSwitcher', () => ({ default: () => null }));
vi.mock('../UserMenu', () => ({ default: () => null }));
vi.mock('../OfflineCapability', () => ({ NetworkStatusIndicator: () => null }));
vi.mock('../ModuleHealthIndicator', () => ({ default: () => null }));

import Header from '../Header';

describe('Header temporary data badge', () => {
  beforeEach(() => statusStore.set({ mode: 'opfs-sahpool', persisted: true }));

  it('shows the TEMPORARY DATA badge when the database lives in memory', () => {
    statusStore.set({ mode: 'memory', persisted: null });
    render(<Header onSettings={() => {}} />);
    expect(screen.getByText('TEMPORARY DATA')).toBeTruthy();
  });

  it('shows no badge on persistent storage', () => {
    render(<Header onSettings={() => {}} />);
    expect(screen.queryByText('TEMPORARY DATA')).toBeNull();
  });
});
