// ABOUTME: Tests the System Health data layer: the device signals read from the canonical adapter,
// ABOUTME: the hub signals merged in, and the honest unknown state when either side cannot answer.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTestContext, TEST_ACTOR, type TestContext } from '@/data/__tests__/harness';
import type { HubHealthReport } from '@/data/health';
import { DeviceNode } from '@/data/sync';

import {
  createHubHealthClient,
  fetchDiagnosticBundle,
  loadSystemHealth,
  readDeviceHealth,
} from '../systemHealth';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.close();
  context = undefined;
});

/** A hub report with every section healthy, so a test can change one thing at a time. */
function hubReport(overrides: Partial<HubHealthReport> = {}): HubHealthReport {
  return {
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
        drillReason: 'interval_elapsed',
        drillDueAt: null,
        directory: '/data/backups',
        encryption: { algorithm: 'aes-256-gcm', kdf: 'scrypt', keyId: 'abcd1234' },
        count: 3,
        totalBytes: 4096,
        unreadable: 0,
        lastFailure: null,
      },
    },
    sync: {
      level: 'ok',
      detail: '1 device(s) in step at change 12',
      value: {
        head: 12,
        devices: [
          { deviceId: 'desk-1', changes: 4, lastChangeAt: '2026-10-24T09:59:00.000Z', lagSeconds: 60 },
        ],
        rejected: 0,
      },
    },
    integrations: {
      level: 'attention',
      detail: '1 of 1 integration(s) need attention: Delivery',
      value: [{ id: 'delivery', name: 'Delivery', level: 'attention', detail: 'no channel', checkedAt: null }],
    },
    ...overrides,
  };
}

describe('readDeviceHealth', () => {
  it('is honest when the device has no sync metadata at all', async () => {
    context = await createTestContext({ seed: false });

    const signals = await readDeviceHealth({
      adapter: context.adapter,
      storage: { mode: 'opfs-sahpool', persisted: true },
    });

    expect(signals.cursor).toBeNull();
    expect(signals.outbox.level).toBe('unknown');
    expect(signals.outbox.value).toBeNull();
    expect(signals.outbox.detail).toMatch(/sync/i);
    expect(signals.storage.level).toBe('ok');
  });

  it('is honest when the device database is not open', async () => {
    const signals = await readDeviceHealth({ adapter: null, storage: null });
    expect(signals.storage.level).toBe('unknown');
    expect(signals.outbox.value).toBeNull();
    expect(signals.cursor).toBeNull();
  });

  it('counts the pending outbox and dates its oldest change from its clock', async () => {
    context = await createTestContext({ entities: ['institution'] });
    const device = await DeviceNode.open({
      repository: context.repository,
      adapter: context.adapter,
      deviceId: 'desk-1',
      dialect: 'sqlite',
    });
    await device.create('institution', context.seed.inputFor('institution', { name: 'Mwangaza' }), {
      actor: TEST_ACTOR,
    });

    const signals = await readDeviceHealth({
      adapter: context.adapter,
      storage: { mode: 'memory', persisted: null },
      now: new Date('2026-10-24T12:00:00.000Z'),
    });

    expect(signals.outbox.level).toBe('attention');
    expect(signals.outbox.value?.pending).toBe(1);
    expect(signals.outbox.value?.oldestPendingAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // Memory storage is not durable, so the page must say so rather than call it fine.
    expect(signals.storage.level).toBe('attention');
    expect(signals.storage.value?.mode).toBe('memory');
  });
});

describe('loadSystemHealth', () => {
  it('marks the hub sections unavailable when no hub is configured', async () => {
    context = await createTestContext({ seed: false });
    const report = await loadSystemHealth({
      adapter: context.adapter,
      storage: { mode: 'opfs-sahpool', persisted: true },
      hub: null,
    });

    expect(report.backup.level).toBe('unavailable');
    expect(report.backup.detail).toMatch(/hub/i);
    expect(report.integrations.level).toBe('unavailable');
    expect(report.sync.level).toBe('unknown');
    expect(report.sync.detail).toMatch(/hub/i);
  });

  it('computes the sync lag from the device cursor and the hub head', async () => {
    context = await createTestContext({ seed: false });
    const report = await loadSystemHealth({
      adapter: context.adapter,
      storage: { mode: 'opfs-sahpool', persisted: true },
      hub: { report: async () => hubReport() },
      deviceCursor: 9,
    });

    expect(report.sync.value?.deviceCursor).toBe(9);
    expect(report.sync.value?.hubHead).toBe(12);
    expect(report.sync.value?.lagChanges).toBe(3);
    expect(report.sync.level).toBe('attention');
  });

  it('is ok when the device is in step with the hub', async () => {
    context = await createTestContext({ seed: false });
    const report = await loadSystemHealth({
      adapter: context.adapter,
      storage: { mode: 'opfs-sahpool', persisted: true },
      hub: { report: async () => hubReport() },
      deviceCursor: 12,
    });

    expect(report.sync.value?.lagChanges).toBe(0);
    expect(report.sync.level).toBe('ok');
    expect(report.backup.level).toBe('attention');
    expect(report.storage.value?.hub?.databaseFile).toBe('/data/schoolpilot.db');
  });

  it('reports a hub that refuses the read as unknown, not as healthy', async () => {
    context = await createTestContext({ seed: false });
    const report = await loadSystemHealth({
      adapter: context.adapter,
      storage: { mode: 'opfs-sahpool', persisted: true },
      hub: {
        report: async () => {
          throw new Error('the hub did not answer');
        },
      },
    });

    expect(report.backup.level).toBe('unknown');
    expect(report.backup.detail).toMatch(/hub did not answer/);
    expect(report.integrations.level).toBe('unknown');
    expect(report.storage.value?.hub).toBeNull();
  });
});

describe('createHubHealthClient', () => {
  it('reads the report over an authenticated request', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(hubReport()), { status: 200 }));
    const client = createHubHealthClient({
      baseUrl: 'http://hub.local:3000/',
      token: 'sp1_test',
      fetch: fetchMock as unknown as typeof fetch,
    });

    const report = await client.report();
    expect(report.sync.value?.head).toBe(12);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://hub.local:3000/api/health/report');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sp1_test');
  });

  it('throws when the hub refuses the read', async () => {
    const client = createHubHealthClient({
      baseUrl: 'http://hub.local:3000',
      token: 'sp1_test',
      fetch: (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch,
    });
    await expect(client.report()).rejects.toThrow(/401/);
  });
});

describe('fetchDiagnosticBundle', () => {
  it('downloads the bundle with the session and names the file from the hub', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('{"generatedAt":"2026-10-24T10:00:00.000Z"}', {
          status: 200,
          headers: {
            'content-disposition': 'attachment; filename="schoolpilot-diagnostics-2026-10-24.json"',
          },
        })
    );

    const bundle = await fetchDiagnosticBundle({
      baseUrl: 'http://hub.local:3000/',
      token: 'sp1_test',
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(bundle.filename).toBe('schoolpilot-diagnostics-2026-10-24.json');
    expect(JSON.parse(bundle.text).generatedAt).toBe('2026-10-24T10:00:00.000Z');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://hub.local:3000/api/health/diagnostics');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sp1_test');
  });

  it('falls back to a dated name when the hub names none', async () => {
    const bundle = await fetchDiagnosticBundle({
      baseUrl: 'http://hub.local:3000',
      token: 'sp1_test',
      fetch: (async () => new Response('{}', { status: 200 })) as unknown as typeof fetch,
    });
    expect(bundle.filename).toMatch(/^schoolpilot-diagnostics-.*\.json$/);
  });

  it('throws when the hub refuses, rather than saving an error body as a bundle', async () => {
    await expect(
      fetchDiagnosticBundle({
        baseUrl: 'http://hub.local:3000',
        token: 'sp1_test',
        fetch: (async () => new Response('{}', { status: 403 })) as unknown as typeof fetch,
      })
    ).rejects.toThrow(/403/);
  });
});
