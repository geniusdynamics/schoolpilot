// ABOUTME: The storage warning shows at the top of the Data & System hub only when the browser is not keeping the school's
// ABOUTME: data durably: held in memory, unavailable, or persistence refused. Healthy storage shows nothing, and it updates live.

import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const statusStore = vi.hoisted(() => {
  let status: { mode: string; persisted: boolean | null } = { mode: 'uninitialised', persisted: null };
  const listeners = new Set<() => void>();
  return {
    get: () => status,
    set: (next: { mode: string; persisted: boolean | null }) => {
      status = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock('@/services/database/SQLiteWASMProvider', () => ({
  getSQLiteStorageStatus: () => statusStore.get(),
  subscribeSQLiteStorageStatus: (listener: () => void) => statusStore.subscribe(listener),
}));

import { StorageWarning } from '../StorageWarning';

const renderWarning = () =>
  render(
    <MemoryRouter>
      <StorageWarning />
    </MemoryRouter>
  );

describe('the storage warning', () => {
  beforeEach(() => statusStore.set({ mode: 'opfs-sahpool', persisted: true }));

  it('shows nothing while the browser keeps the data durably', () => {
    renderWarning();

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows nothing while storage has not been opened yet: that is a moment, not a fault', () => {
    statusStore.set({ mode: 'uninitialised', persisted: null });
    renderWarning();

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('warns that data held in memory is lost when the tab closes', () => {
    statusStore.set({ mode: 'memory', persisted: null });
    renderWarning();

    expect(screen.getByRole('alert').textContent).toContain('temporary memory');
  });

  it('warns that nothing can be saved when storage is unavailable', () => {
    statusStore.set({ mode: 'unavailable', persisted: null });
    renderWarning();

    expect(screen.getByRole('alert').textContent).toContain('nothing can be saved');
  });

  it('warns that the browser may clear the data when it has refused persistent storage', () => {
    statusStore.set({ mode: 'opfs-sahpool', persisted: false });
    renderWarning();

    expect(screen.getByRole('alert').textContent).toContain('may clear');
  });

  it('points at System Health for the details', () => {
    statusStore.set({ mode: 'memory', persisted: null });
    renderWarning();

    const link = screen.getByRole('link', { name: /system health/i });
    expect(link.getAttribute('href')).toBe('/settings/system?tab=health');
  });

  it('appears when storage turns bad and goes when it recovers', () => {
    renderWarning();
    expect(screen.queryByRole('alert')).toBeNull();

    act(() => statusStore.set({ mode: 'memory', persisted: null }));
    expect(screen.getByRole('alert')).toBeTruthy();

    act(() => statusStore.set({ mode: 'opfs-sahpool', persisted: true }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
