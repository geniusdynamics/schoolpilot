// ABOUTME: Tests the System Health tab: an unconnected device says so instead of looking healthy,
// ABOUTME: a connected hub fills the backup, sync and integration cards, and a refusal is shown.

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// useSyncExternalStore needs a stable snapshot, as the real provider gives: one object, not one per call.
const storageStatus = vi.hoisted(() => ({ mode: 'opfs-sahpool', persisted: true }));

vi.mock('@/services/database/SQLiteWASMProvider', () => ({
  getSQLiteStorageStatus: () => storageStatus,
  subscribeSQLiteStorageStatus: () => () => undefined,
}));

// No device database is open in this test: the outbox and cursor read as unknown, not zero.
vi.mock('@/data/canonicalRepository', () => ({ canonicalAdapter: () => null }));

import { SystemHealthContent } from '../SystemHealthPage';

const hubReport = {
  generatedAt: '2026-10-24T10:00:00.000Z',
  storage: {
    level: 'ok',
    detail: "the hub's database is /data/schoolpilot.db on disk",
    value: { databaseFile: '/data/schoolpilot.db', durable: true, bytes: 2048 },
  },
  backup: {
    level: 'attention',
    detail: 'the monthly restore drill is due',
    value: {
      available: true,
      lastBackupAt: '2026-10-24T02:00:00.000Z',
      drillDue: true,
      drillReason: 'no drill has been run in 30 days',
      drillDueAt: null,
      directory: '/data/backups',
      encryption: { algorithm: 'aes-256-gcm', kdf: 'scrypt', keyId: 'k1' },
      count: 3,
      totalBytes: 4096,
      unreadable: 0,
      lastFailure: null,
    },
  },
  sync: {
    level: 'ok',
    detail: 'the change log is at 12',
    value: {
      head: 12,
      rejected: 0,
      devices: [{ deviceId: 'device-front-desk', changes: 7, lastChangeAt: null, lagSeconds: 30 }],
    },
  },
  integrations: {
    level: 'ok',
    detail: '1 integration reported',
    value: [{ id: 'sms', name: 'SMS gateway', level: 'unavailable', detail: 'not configured', checkedAt: null }],
  },
};

function connect() {
  fireEvent.change(screen.getByLabelText('Hub address'), { target: { value: 'http://hub.local:3000' } });
  fireEvent.change(screen.getByLabelText('Session token'), { target: { value: 'sp1_test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SystemHealthContent', () => {
  it('says an unconnected device cannot read the hub, rather than showing it healthy', async () => {
    render(<SystemHealthContent />);

    const backup = await screen.findByTestId('health-backup');
    expect(backup.textContent).toMatch(/not connected to a hub/);
    expect(screen.getByTestId('health-integrations').textContent).toMatch(/not connected to a hub/);
    // Backup and integrations need a hub: "Not configured", never "Healthy". Sync and the outbox
    // need a device database that is not open here: "Unknown", never a zero that reads as fine.
    expect(screen.getAllByText('Not configured')).toHaveLength(2);
    expect(screen.getAllByText('Unknown').length).toBeGreaterThanOrEqual(2);
    // Only the device's own storage, which is real, reads healthy.
    expect(screen.getAllByText('Healthy')).toHaveLength(1);
    expect(screen.getByTestId('health-storage').textContent).toContain('opfs-sahpool');
  });

  it('fills the hub cards once connected, over an authenticated request', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(hubReport), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SystemHealthContent />);
    await screen.findByTestId('health-backup');
    connect();

    await waitFor(() => expect(screen.getByTestId('health-backup').textContent).toMatch(/3 \(4\.0 KB\)/));
    expect(screen.getByTestId('health-backup').textContent).toMatch(/no drill has been run in 30 days/);
    expect(screen.getByTestId('health-sync').textContent).toContain('device-front-desk');
    expect(screen.getByTestId('health-integrations').textContent).toContain('SMS gateway');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://hub.local:3000/api/health/report');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sp1_test');
  });

  it('shows the hub as unknown, with the reason, when it refuses the read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));

    render(<SystemHealthContent />);
    await screen.findByTestId('health-backup');
    connect();

    await waitFor(() => expect(screen.getByTestId('health-backup').textContent).toMatch(/401/));
    expect(screen.getByTestId('health-backup').textContent).not.toMatch(/Healthy/);
  });

  it('keeps the diagnostic bundle unavailable until a hub is connected', async () => {
    render(<SystemHealthContent />);
    await screen.findByTestId('health-backup');

    expect((screen.getByRole('button', { name: 'Diagnostic bundle' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
