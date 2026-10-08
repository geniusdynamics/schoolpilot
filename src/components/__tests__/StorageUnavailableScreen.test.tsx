// ABOUTME: Tests the blocking storage-unavailable screen and the red TEMPORARY DATA badge.
// ABOUTME: The badge must appear only when the SQLite provider runs on an explicitly allowed memory database.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

import { StorageUnavailableScreen, TemporaryDataBadge } from '../StorageUnavailableScreen';

describe('StorageUnavailableScreen', () => {
  beforeEach(() => statusStore.set({ mode: 'uninitialised', persisted: null }));

  it('blocks the app with an actionable message and the technical cause', () => {
    render(<StorageUnavailableScreen error={new Error('Missing required OPFS APIs.')} onRetry={() => {}} />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/This browser cannot store data offline/)).toBeInTheDocument();
    expect(screen.getByText(/Chrome or Edge 109 or newer, or connect to the school server/)).toBeInTheDocument();
    expect(screen.getByText('Missing required OPFS APIs.')).toBeInTheDocument();
  });

  it('falls back to the provider-reported error and retries on demand', () => {
    statusStore.set({ mode: 'unavailable', persisted: null, error: 'no such vfs: opfs-sahpool' });
    const onRetry = vi.fn();
    render(<StorageUnavailableScreen onRetry={onRetry} />);

    expect(screen.getByText('no such vfs: opfs-sahpool')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('TemporaryDataBadge', () => {
  it('renders nothing while data is persistent', () => {
    statusStore.set({ mode: 'opfs-sahpool', persisted: true });
    const { container } = render(<TemporaryDataBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a red TEMPORARY DATA badge for an allowed in-memory database', () => {
    statusStore.set({ mode: 'memory', persisted: null });
    render(<TemporaryDataBadge />);

    const badge = screen.getByText('TEMPORARY DATA');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-red-600/);
  });

  it('appears as soon as the provider switches to memory', () => {
    statusStore.set({ mode: 'uninitialised', persisted: null });
    render(<TemporaryDataBadge />);
    expect(screen.queryByText('TEMPORARY DATA')).toBeNull();

    React.act(() => statusStore.set({ mode: 'memory', persisted: null }));
    expect(screen.getByText('TEMPORARY DATA')).toBeInTheDocument();
  });
});
