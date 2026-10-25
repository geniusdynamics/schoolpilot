// ABOUTME: The sync conflicts panel opens the canonical database itself. While it opens the log says it is loading,
// ABOUTME: not that the database is "not open yet"; if it cannot open, the log says why.

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { SqliteAdapter } from '@/data/adapters/sqlite';

const canonical = vi.fn<(enabled?: boolean) => { adapter: SqliteAdapter | null; error: string | null }>();
const conflictsFor = vi.fn<(adapter: SqliteAdapter | null | undefined) => unknown>();

vi.mock('../../hooks/useCanonicalAdapter', () => ({
  useCanonicalAdapter: (enabled?: boolean) => canonical(enabled),
}));

vi.mock('../../hooks/useSyncConflicts', () => ({
  useSyncConflicts: (adapter: SqliteAdapter | null | undefined) => conflictsFor(adapter),
}));

vi.mock('../SyncConflictLog', () => ({
  SyncConflictLog: (props: { loading: boolean; error: string | null }) => (
    <div data-testid="log" data-loading={String(props.loading)} data-error={props.error ?? ''} />
  ),
}));

import { SyncConflictsPanel } from '../SyncConflictsPanel';

const adapter = { name: 'adapter' } as unknown as SqliteAdapter;
const idle = { conflicts: [], loading: false, error: null, refresh: vi.fn() };
const notOpen = { ...idle, error: 'the canonical database is not open yet' };

describe('SyncConflictsPanel', () => {
  beforeEach(() => {
    canonical.mockReset();
    conflictsFor.mockReset();
  });

  it('says it is loading while the database opens, not that it is not open', () => {
    canonical.mockReturnValue({ adapter: null, error: null });
    conflictsFor.mockReturnValue(notOpen);

    render(<SyncConflictsPanel />);

    const log = screen.getByTestId('log');
    expect(log.dataset.loading).toBe('true');
    expect(log.dataset.error).toBe('');
  });

  it('reads the log from the database it opened', () => {
    canonical.mockReturnValue({ adapter, error: null });
    conflictsFor.mockReturnValue(idle);

    render(<SyncConflictsPanel />);

    expect(conflictsFor).toHaveBeenLastCalledWith(adapter);
    expect(screen.getByTestId('log').dataset.loading).toBe('false');
  });

  it('says why when the database cannot be opened', () => {
    canonical.mockReturnValue({ adapter: null, error: 'OPFS is unavailable' });
    conflictsFor.mockReturnValue(notOpen);

    render(<SyncConflictsPanel />);

    expect(screen.getByTestId('log').dataset.error).toBe('OPFS is unavailable');
  });

  it('uses the adapter it is handed and opens nothing', () => {
    canonical.mockReturnValue({ adapter: null, error: null });
    conflictsFor.mockReturnValue(idle);

    render(<SyncConflictsPanel adapter={adapter} />);

    expect(canonical).toHaveBeenCalledWith(false);
    expect(conflictsFor).toHaveBeenLastCalledWith(adapter);
    expect(screen.getByTestId('log').dataset.loading).toBe('false');
  });
});
