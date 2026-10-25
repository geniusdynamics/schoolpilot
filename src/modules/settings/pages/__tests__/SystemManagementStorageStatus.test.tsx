// ABOUTME: Tests that Settings › System shows the browser storage status from the SQLite provider.
// ABOUTME: Covers the navigator.storage.persist() result (yes, no, unknown) and the storage mode, updating live.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

const statusStore = vi.hoisted(() => {
  let status: any = { mode: 'uninitialised', persisted: null };
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

vi.mock('../DataLayerSettingsPage', () => ({ DataLayerSettingsContent: () => <div>data layer</div> }));
vi.mock('../DatabaseBackupPage', () => ({ DatabaseBackupContent: () => null }));

import SystemManagementPage from '../SystemManagementPage';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/settings/system']}>
      <SystemManagementPage />
    </MemoryRouter>
  );

describe('SystemManagementPage storage status', () => {
  beforeEach(() => statusStore.set({ mode: 'opfs-sahpool', persisted: true }));

  it('shows persistent OPFS storage with persistence granted', () => {
    renderPage();
    const panel = screen.getByTestId('storage-status');
    expect(panel.textContent).toContain('Persistent (OPFS)');
    expect(panel.textContent).toContain('Yes');
  });

  it('shows when the browser refused persistence and updates live to temporary memory', () => {
    statusStore.set({ mode: 'opfs-sahpool', persisted: false });
    renderPage();
    const panel = screen.getByTestId('storage-status');
    expect(panel.textContent).toContain('No');

    act(() => statusStore.set({ mode: 'memory', persisted: null }));
    expect(panel.textContent).toContain('Temporary (memory only)');
    expect(panel.textContent).toContain('Unknown');
  });
});
