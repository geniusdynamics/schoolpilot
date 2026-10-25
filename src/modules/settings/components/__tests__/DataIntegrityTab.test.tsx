// ABOUTME: The Data integrity tab opens the canonical database and runs the integrity checks against it as the
// ABOUTME: signed-in user. The page used to be given no database at all and always said "not connected".

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { SqliteAdapter } from '@/data/adapters/sqlite';

const canonical = vi.fn<() => { adapter: SqliteAdapter | null; error: string | null }>();

vi.mock('../../hooks/useCanonicalAdapter', () => ({
  useCanonicalAdapter: () => canonical(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'principal' } }),
}));

vi.mock('../../pages/DataIntegrityPage', () => ({
  DataIntegrityContent: (props: { adapter?: SqliteAdapter; actor?: string }) => (
    <div data-testid="integrity" data-has-adapter={String(Boolean(props.adapter))} data-actor={props.actor ?? ''} />
  ),
}));

import { DataIntegrityTab } from '../DataIntegrityTab';

const adapter = { name: 'adapter' } as unknown as SqliteAdapter;

describe('DataIntegrityTab', () => {
  beforeEach(() => {
    canonical.mockReset();
  });

  it('waits while the database opens, and shows no checks yet', () => {
    canonical.mockReturnValue({ adapter: null, error: null });

    render(<DataIntegrityTab />);

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByTestId('integrity')).toBeNull();
  });

  it('runs the checks against the database it opened, as the signed-in user', () => {
    canonical.mockReturnValue({ adapter, error: null });

    render(<DataIntegrityTab />);

    const checks = screen.getByTestId('integrity');
    expect(checks.dataset.hasAdapter).toBe('true');
    expect(checks.dataset.actor).toBe('principal');
  });

  it('says why when the database cannot be opened, and runs nothing', () => {
    canonical.mockReturnValue({ adapter: null, error: 'OPFS is unavailable' });

    render(<DataIntegrityTab />);

    expect(screen.getByRole('alert').textContent).toContain('OPFS is unavailable');
    expect(screen.queryByTestId('integrity')).toBeNull();
  });
});
