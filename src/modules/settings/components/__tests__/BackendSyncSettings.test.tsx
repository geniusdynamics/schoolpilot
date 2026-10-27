// ABOUTME: Backend sync settings show the sync settings the school has and write each change back, with the history
// ABOUTME: of the runs it has made. The old panel's queue controls (pause, resume, delete, priority) only logged a line.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const updateSyncSettings = vi.fn();
let online = true;
let backend = true;
let history: Array<{ id: string; startedAt: Date; completedAt: Date; status: 'success' | 'error' }> = [];

const settings = {
  autoSync: true,
  backgroundSync: false,
  syncInterval: 30000,
  batchSize: 10,
  maxRetries: 3,
  retryDelay: 5000,
  enableConflictResolution: true,
  conflictResolution: 'manual' as const,
};

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({
    getSyncSettings: () => settings,
    updateSyncSettings,
    isOnline: online,
    backendAvailable: backend,
    syncStatus: { state: 'idle' },
  }),
}));

vi.mock('@/contexts/SyncContext', () => ({
  useSync: () => ({ getSyncHistory: () => history }),
}));

import { BackendSyncSettings } from '../BackendSyncSettings';

describe('BackendSyncSettings', () => {
  beforeEach(() => {
    updateSyncSettings.mockReset();
    online = true;
    backend = true;
    history = [];
  });

  it('shows the settings the school has now', () => {
    render(<BackendSyncSettings />);

    expect((screen.getByLabelText('Auto sync') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Background sync') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Sync interval') as HTMLSelectElement).value).toBe('30');
    expect((screen.getByLabelText('Conflict resolution') as HTMLSelectElement).value).toBe('manual');
  });

  it('writes a changed switch back as a setting', () => {
    render(<BackendSyncSettings />);

    fireEvent.click(screen.getByLabelText('Auto sync'));

    expect(updateSyncSettings).toHaveBeenCalledWith({ autoSync: false });
  });

  it('writes a changed interval back in milliseconds', () => {
    render(<BackendSyncSettings />);

    fireEvent.change(screen.getByLabelText('Sync interval'), { target: { value: '300' } });

    expect(updateSyncSettings).toHaveBeenCalledWith({ syncInterval: 300000 });
  });

  it('writes a changed default for conflicts back', () => {
    render(<BackendSyncSettings />);

    fireEvent.change(screen.getByLabelText('Conflict resolution'), { target: { value: 'merge' } });

    expect(updateSyncSettings).toHaveBeenCalledWith({ conflictResolution: 'merge' });
  });

  it('says whether the backend can be reached', () => {
    const { rerender } = render(<BackendSyncSettings />);
    expect(screen.getByText('Online')).toBeTruthy();

    backend = false;
    rerender(<BackendSyncSettings />);
    expect(screen.getByText('Offline')).toBeTruthy();
  });

  it('says there is no history yet, and lists the runs there are', () => {
    const { rerender } = render(<BackendSyncSettings />);
    expect(screen.getByText(/no sync runs yet/i)).toBeTruthy();

    history = [
      { id: 'a', startedAt: new Date('2026-10-25T08:00:00Z'), completedAt: new Date('2026-10-25T08:00:05Z'), status: 'success' },
      { id: 'b', startedAt: new Date('2026-10-25T09:00:00Z'), completedAt: new Date('2026-10-25T09:00:02Z'), status: 'error' },
    ];
    rerender(<BackendSyncSettings />);

    expect(screen.getByText('success')).toBeTruthy();
    expect(screen.getByText('error')).toBeTruthy();
  });

  it('offers no queue controls: nothing here pauses, resumes or deletes', () => {
    render(<BackendSyncSettings />);

    for (const name of [/pause/i, /resume/i, /delete/i, /retry/i, /resolve/i]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });
});
