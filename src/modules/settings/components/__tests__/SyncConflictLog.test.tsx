// ABOUTME: The sync conflict log as a settings component: the summary it counts, the row it
// ABOUTME: shows, the empty and error states, and the refresh it asks for.

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SyncConflict } from '@/data/sync';

import { SyncConflictLog } from '../SyncConflictLog';

const conflict = (overrides: Partial<SyncConflict> = {}): SyncConflict => ({
  id: 'conflict-1',
  entity: 'learner',
  entityId: '01930000-0000-7000-8000-000000000008',
  policy: 'field_lww',
  kind: 'field',
  field: 'given_name',
  winner: 'device-b',
  loser: 'device-a',
  winnerHlc: '000001800000001000:000000:device-b',
  loserHlc: '000001800000000000:000000:device-a',
  resolved: 'last writer wins; the incoming value is stored',
  detectedAt: '2027-01-05T08:00:00.000Z',
  ...overrides,
});

describe('the sync conflict log', () => {
  it('shows the conflicts and the summary above them', () => {
    render(
      <SyncConflictLog
        conflicts={[
          conflict(),
          conflict({ id: 'conflict-2', entity: 'payment', kind: 'unresolved', detail: 'refused' }),
        ]}
      />
    );

    expect(screen.getByText('Sync conflicts')).toBeInTheDocument();
    expect(screen.getByText('Entities affected')).toBeInTheDocument();

    const table = within(screen.getByRole('table'));
    expect(table.getByText('learner')).toBeInTheDocument();
    expect(table.getByText('payment')).toBeInTheDocument();
    expect(table.getByText('given_name')).toBeInTheDocument();
    expect(table.getByText('last writer wins; the incoming value is stored')).toBeInTheDocument();
    expect(table.getByText('refused')).toBeInTheDocument();
    expect(table.getByText('device-b')).toBeInTheDocument();
  });

  it('shows the empty state when nothing conflicted', () => {
    render(<SyncConflictLog conflicts={[]} />);

    expect(screen.getByText('No sync conflicts')).toBeInTheDocument();
    expect(screen.queryByText('learner')).not.toBeInTheDocument();
  });

  it('shows why the log could not be read', () => {
    render(<SyncConflictLog conflicts={[]} error="the table is gone" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('the table is gone');
  });

  it('asks for a refresh when the button is pressed', async () => {
    const onRefresh = vi.fn();
    render(<SyncConflictLog conflicts={[conflict()]} onRefresh={onRefresh} />);

    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('offers no refresh button when the caller has nothing to refresh', () => {
    render(<SyncConflictLog conflicts={[]} />);

    expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
  });
});
