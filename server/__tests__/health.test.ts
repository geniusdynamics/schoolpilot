// ABOUTME: The system health API over a real hub: the report an operator reads, the per-device
// ABOUTME: sync lag, the backup and drill state, and the diagnostic bundle's redactions.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestContext, TEST_ACTOR } from '@/data/__tests__/harness';
import { LANServer } from '@/server/LANServer';

import { hashPassword } from '../auth/passwords';
import {
  buildDiagnosticBundle,
  redactDiagnosticValue,
  summariseSync,
  type HubHealthReport,
} from '../health';

const PASSPHRASE = 'a hub passphrase for the health routes';

/** The seeded user the hub authenticates against. */
const USERNAME = 'grace.wekesa';
const PASSWORD = 'mwangaza-hub-2027';

interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
  readonly headers: http.IncomingHttpHeaders;
}

let workDir: string;
let hub: LANServer;
let port: number;
let token: string;

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-health-'));
  const databaseFile = path.join(workDir, 'schoolpilot.db');

  const seeded = await createTestContext({ database: { kind: 'file', filename: databaseFile } });
  await giveFixtureUserAPassword(seeded);
  await seeded.close();

  hub = new LANServer({
    dataDir: workDir,
    databaseFile,
    host: '127.0.0.1',
    port: 0,
    actor: TEST_ACTOR,
    backup: { passphrase: PASSPHRASE, dailyAt: '02:00' },
  });
  await hub.start();
  port = hub.address?.port ?? 0;
  expect(port).toBeGreaterThan(0);
  token = await signIn(port);
}, 60000);

afterAll(async () => {
  try {
    if (hub) await hub.stop();
  } finally {
    if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}, 60000);

describe('the health report', () => {
  it('is refused without a session, like every other hub route', async () => {
    const refused = await apiTo(port, 'GET', '/api/health/report', undefined, undefined);
    expect(refused.status).toBe(401);
  });

  it('reports storage, backup, sync and integrations', async () => {
    const response = await api('GET', '/api/health/report');
    expect(response.status).toBe(200);
    const report = bodyOf<HubHealthReport>(response);

    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Storage: the hub's SQLite file, on disk, and it is not empty.
    expect(report.storage.value?.durable).toBe(true);
    expect(report.storage.value?.databaseFile).toBe(path.join(workDir, 'schoolpilot.db'));
    expect(report.storage.value?.bytes ?? 0).toBeGreaterThan(0);
    expect(report.storage.level).toBe('ok');

    // Backup: the automatic run the start path took, and a drill that is due.
    expect(report.backup.value?.available).toBe(true);
    expect(report.backup.value?.lastBackupAt).not.toBeNull();
    expect(report.backup.value?.drillDue).toBe(true);
    expect(report.backup.value?.encryption.algorithm).toBe('aes-256-gcm');
    expect(report.backup.level).toBe('attention');

    // Sync: the bootstrap seeded the change log, so there is a head and at least one device.
    expect(report.sync.value?.head ?? 0).toBeGreaterThan(0);
    expect(report.sync.value?.devices.map((device) => device.deviceId)).toContain('hub');
    expect(report.sync.level).toBe('ok');

    // Integrations: the delivery channel is reported honestly, not assumed healthy.
    const delivery = report.integrations.value?.find((entry) => entry.id === 'delivery');
    expect(delivery).toBeDefined();
    expect(delivery?.level).toBe('attention');
  });
});

describe('the diagnostic bundle', () => {
  it('downloads as an attachment and carries the report', async () => {
    const response = await api('GET', '/api/health/diagnostics');
    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('schoolpilot-diagnostics-');

    const bundle = bodyOf<{
      format: string;
      version: number;
      report: HubHealthReport;
      redactions: string[];
    }>(response);
    expect(bundle.format).toBe('schoolpilot-diagnostic-bundle');
    expect(bundle.version).toBe(1);
    expect(bundle.report.storage.value?.databaseFile).toBeDefined();
  });

  it('carries no token, secret, sealed value or personal data', async () => {
    const response = await api('GET', '/api/health/diagnostics');
    const serialized = JSON.stringify(response.body);

    // The bearer token that fetched it, the backup passphrase, the password hash and the
    // restricted-data ciphertext are all absent, by pattern.
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain(PASSPHRASE);
    expect(serialized).not.toMatch(/pbkdf2-sha256\$/);
    expect(serialized).not.toMatch(/enc:v1:/);
    expect(serialized).not.toMatch(/sp1_[A-Za-z0-9]/);
    expect(serialized).not.toMatch(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./);
    expect(serialized).not.toContain('password_hash');
  });
});

describe('the diagnostic redactor', () => {
  const home = os.homedir();

  it('removes a bearer token, a password hash and a sealed value from free text', () => {
    const message = [
      'Authorization: Bearer sp1_abcdefghijklmnop',
      'stored pbkdf2-sha256$600000$c2FsdA$aGFzaA as the password',
      'a restricted column reads enc:v1:aaaa:bbbb:cccc',
      `a path under ${home}\\data\\schoolpilot.db`,
    ].join('; ');

    const redacted = redactDiagnosticValue(message);
    expect(redacted).not.toContain('sp1_abcdefghijklmnop');
    expect(redacted).not.toContain('pbkdf2-sha256$600000$c2FsdA$aGFzaA');
    expect(redacted).not.toContain('enc:v1:aaaa:bbbb:cccc');
    expect(redacted).not.toContain(home);
    expect(redacted).toContain('~');
  });

  it('drops a denylisted key entirely and names what it withheld', () => {
    const bundle = buildDiagnosticBundle(
      reportFixture(),
      {
        password: 'hunter2-hunter2',
        nested: { authorization: 'Bearer sp1_abcdefghijklmnop' },
        note: 'contact the head at head@example.org about it',
      },
      new Date('2026-10-24T10:00:00.000Z')
    );

    const serialized = JSON.stringify(bundle);
    expect(serialized).not.toContain('hunter2-hunter2');
    expect(serialized).not.toContain('sp1_abcdefghijklmnop');
    expect(serialized).not.toContain('head@example.org');
    expect(bundle.redactions.length).toBeGreaterThan(0);
    expect(bundle.redactions.join(' ')).toMatch(/password/);
  });

  it('names the redacted field, never its value', () => {
    const bundle = buildDiagnosticBundle(
      reportFixture(),
      { apiKey: 'a-very-secret-key', detail: 'ok' },
      new Date('2026-10-24T10:00:00.000Z')
    );
    expect(JSON.stringify(bundle)).not.toContain('a-very-secret-key');
    expect(bundle.redactions.join(' ')).toContain('apiKey');
  });
});

describe('the per-device sync summary', () => {
  const now = new Date('2026-10-24T12:00:00.000Z');

  it('reports a fresh device as ok and a silent one as attention', () => {
    const summary = summariseSync(
      [
        { deviceId: 'desk-1', changes: 4, lastChangeAt: '2026-10-24T11:59:30.000Z' },
        { deviceId: 'desk-2', changes: 2, lastChangeAt: '2026-10-22T09:00:00.000Z' },
      ],
      now
    );

    expect(summary.devices).toHaveLength(2);
    expect(summary.devices[0]?.lagSeconds).toBe(30);
    expect(summary.staleDeviceIds).toEqual(['desk-2']);
    expect(summary.level).toBe('attention');
  });

  it('is ok when every device has synced inside the window', () => {
    const summary = summariseSync(
      [{ deviceId: 'desk-1', changes: 4, lastChangeAt: '2026-10-24T11:00:00.000Z' }],
      now
    );
    expect(summary.staleDeviceIds).toEqual([]);
    expect(summary.level).toBe('ok');
  });
});

/** A minimal report the redactor tests can hand over. */
function reportFixture(): HubHealthReport {
  return {
    generatedAt: '2026-10-24T10:00:00.000Z',
    storage: {
      level: 'ok',
      detail: 'durable',
      value: { databaseFile: '/data/schoolpilot.db', durable: true, bytes: 1024 },
    },
    backup: {
      level: 'ok',
      detail: 'backed up',
      value: {
        available: true,
        lastBackupAt: '2026-10-24T02:00:00.000Z',
        drillDue: false,
        drillReason: 'on_schedule',
        drillDueAt: '2026-11-20T02:00:00.000Z',
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
      detail: 'in step',
      value: { head: 12, devices: [], rejected: 0 },
    },
    integrations: {
      level: 'ok',
      detail: 'one integration',
      value: [{ id: 'delivery', name: 'Delivery', level: 'ok', detail: 'configured', checkedAt: null }],
    },
  };
}

async function giveFixtureUserAPassword(
  context: Awaited<ReturnType<typeof createTestContext>>
): Promise<void> {
  const users = await context.repository.list('user', { where: { username: USERNAME } });
  const seededUser = users.items[0];
  if (!seededUser) throw new Error(`the ${USERNAME} fixture was not seeded`);
  await context.repository.update(
    'user',
    seededUser.id,
    { password_hash: hashPassword(PASSWORD), status: 'active', mfa: false },
    { expectedVersion: seededUser.rowVersion, actor: seededUser.id, reason: 'test fixture' }
  );
}

async function signIn(targetPort: number): Promise<string> {
  const login = await apiTo(targetPort, 'POST', '/api/auth/login', {
    username: USERNAME,
    password: PASSWORD,
  });
  if (login.status !== 200) {
    throw new Error(`the hub refused the sign-in: ${JSON.stringify(login.body)}`);
  }
  return (login.body as { token: string }).token;
}

function api(method: string, pathname: string, body?: unknown): Promise<ApiResponse> {
  return apiTo(port, method, pathname, body, token);
}

function apiTo(
  targetPort: number,
  method: string,
  pathname: string,
  body?: unknown,
  bearer?: string
): Promise<ApiResponse> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise<ApiResponse>((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port: targetPort,
        path: pathname,
        method,
        headers: {
          ...(bearer === undefined ? {} : { authorization: `Bearer ${bearer}` }),
          ...(payload !== undefined
            ? {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (response) => {
        response.setEncoding('utf8');
        let text = '';
        response.on('data', (chunk: string) => {
          text += chunk;
        });
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            body: text.length > 0 ? (JSON.parse(text) as unknown) : null,
            headers: response.headers,
          });
        });
      }
    );
    request.on('error', reject);
    if (payload !== undefined) request.write(payload);
    request.end();
  });
}

function bodyOf<T>(response: ApiResponse): T {
  return response.body as T;
}
