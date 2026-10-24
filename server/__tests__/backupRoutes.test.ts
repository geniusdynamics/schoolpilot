// ABOUTME: The backup API over a real hub: the automatic backup at start, manual archives,
// ABOUTME: status and checksum, restore to a new instance, the drill, the export and refusals.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestContext, TEST_ACTOR } from '@/data/__tests__/harness';
import { LANServer } from '@/server/LANServer';

const PASSPHRASE = 'a hub passphrase for the backup routes';

interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

interface BackupEntryBody {
  readonly id: string;
  readonly kind: string;
  readonly file: string;
  readonly createdAt: string;
  readonly digest: string;
}

interface StatusBody {
  readonly available: boolean;
  readonly retention: { readonly daily: number; readonly weekly: number; readonly monthly: number };
  readonly lastBackupAt: string | null;
  readonly drill: { readonly due: boolean; readonly reason: string };
  readonly backups: { readonly count: number };
}

let workDir: string;
let hub: LANServer;
let port: number;

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-backup-api-'));
  const databaseFile = path.join(workDir, 'schoolpilot.db');

  const seeded = await createTestContext({ database: { kind: 'file', filename: databaseFile } });
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
}, 60000);

afterAll(async () => {
  try {
    if (hub) await hub.stop();
  } finally {
    if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}, 60000);

describe('the backup API', () => {
  it('reports the automatic backup that the start path took', async () => {
    const health = await api('GET', '/health');
    expect(health.status).toBe(200);
    const body = bodyOf<{
      backup: { enabled: boolean; available: boolean; lastBackupAt: string | null; drillDue: boolean };
    }>(health);
    expect(body.backup.enabled).toBe(true);
    expect(body.backup.available).toBe(true);
    expect(body.backup.lastBackupAt).not.toBeNull();
    expect(body.backup.drillDue).toBe(true);

    const list = await api('GET', '/api/backups');
    expect(list.status).toBe(200);
    const backups = bodyOf<{ backups: BackupEntryBody[] }>(list).backups;
    expect(backups).toHaveLength(1);
    expect(backups[0]?.kind).toBe('automatic');
  });

  it('takes a manual backup and reads its header', async () => {
    const created = await api('POST', '/api/backups', {});
    expect(created.status).toBe(201);
    const entry = bodyOf<BackupEntryBody>(created);
    expect(entry.kind).toBe('manual');
    expect(fs.existsSync(entry.file)).toBe(true);

    const header = await api('GET', `/api/backups/${entry.id}`);
    expect(header.status).toBe(200);
    expect(bodyOf<{ content: { digest: string } }>(header).content.digest).toBe(entry.digest);

    const list = await api('GET', '/api/backups');
    expect(bodyOf<{ backups: BackupEntryBody[] }>(list).backups.length).toBeGreaterThanOrEqual(2);
  });

  it('reports the status, the retention policy and the live checksum', async () => {
    const status = await api('GET', '/api/backups/status');
    expect(status.status).toBe(200);
    const body = bodyOf<StatusBody>(status);
    expect(body.available).toBe(true);
    expect(body.retention).toEqual({ daily: 7, weekly: 4, monthly: 12 });
    expect(body.drill.due).toBe(true);
    expect(body.backups.count).toBeGreaterThanOrEqual(2);

    const checksum = await api('GET', '/api/backups/checksum');
    expect(checksum.status).toBe(200);
    const digest = bodyOf<{ overall: string; tables: Array<{ table: string }> }>(checksum);
    expect(digest.tables.map((table) => table.table)).toContain('learner');

    const service = hub.getBackupService();
    expect(service).not.toBeNull();
    const live = await service?.checksum();
    expect(digest.overall).toBe(live?.overall);
  });

  it('restores a backup into a new instance and proves the checksum', async () => {
    const list = await api('GET', '/api/backups');
    const newest = bodyOf<{ backups: BackupEntryBody[] }>(list).backups[0];
    expect(newest).toBeDefined();
    if (!newest) return;

    const before = await hub.getBackupService()?.checksum();
    const restored = await api('POST', `/api/backups/${newest.id}/restore`);
    expect(restored.status).toBe(201);

    const result = bodyOf<{ databaseFile: string; digest: { overall: string } }>(restored);
    expect(fs.existsSync(result.databaseFile)).toBe(true);
    expect(result.digest.overall).toBe(before?.overall);
  });

  it('runs the restore drill and clears the reminder', async () => {
    const drilled = await api('POST', '/api/backups/drill');
    expect(drilled.status).toBe(200);
    expect(bodyOf<{ digest: { overall: string } }>(drilled).digest.overall).toMatch(/^[0-9a-f]{64}$/);

    const status = await api('GET', '/api/backups/status');
    const body = bodyOf<StatusBody>(status);
    expect(body.drill.due).toBe(false);
    expect(body.drill.reason).toBe('on_schedule');
  });

  it('writes a portable export and reports what it withheld', async () => {
    const exported = await api('POST', '/api/backups/export', {});
    expect(exported.status).toBe(201);

    const manifest = bodyOf<{
      directory: string;
      files: Array<{ entity: string; json: string; csv: string }>;
      excludedEntities: string[];
    }>(exported);
    expect(fs.existsSync(path.join(manifest.directory, 'manifest.json'))).toBe(true);
    expect(manifest.files.some((file) => file.entity === 'learner')).toBe(true);
    expect(manifest.excludedEntities).toContain('identifier');
  });

  it('refuses an id that names no archive', async () => {
    const missing = await api('GET', '/api/backups/backup-does-not-exist');
    expect(missing.status).toBe(404);
    expect(errorCodeOf(missing)).toBe('backup_not_found');

    const refused = await api('POST', '/api/backups/backup-does-not-exist/restore');
    expect(refused.status).toBe(404);
    expect(errorCodeOf(refused)).toBe('backup_not_found');
  });
});

describe('a hub without a backup key', () => {
  let bareDir: string;
  let bareHub: LANServer;
  let barePort: number;

  beforeAll(async () => {
    bareDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-no-key-'));
    bareHub = new LANServer({
      dataDir: bareDir,
      host: '127.0.0.1',
      port: 0,
      actor: TEST_ACTOR,
      // An empty passphrase is the explicit "no key" this test needs, even if the machine
      // running the suite has SCHOOLPILOT_BACKUP_PASSPHRASE set.
      backup: { passphrase: '' },
    });
    await bareHub.start();
    barePort = bareHub.address?.port ?? 0;
  }, 60000);

  afterAll(async () => {
    try {
      if (bareHub) await bareHub.stop();
    } finally {
      if (bareDir) await fs.promises.rm(bareDir, { recursive: true, force: true });
    }
  }, 60000);

  it('reports the surface as unavailable and refuses to write with 503', async () => {
    const status = await apiTo(barePort, 'GET', '/api/backups/status');
    expect(status.status).toBe(200);
    const body = bodyOf<StatusBody>(status);
    expect(body.available).toBe(false);
    expect(body.backups.count).toBe(0);

    const created = await apiTo(barePort, 'POST', '/api/backups', {});
    expect(created.status).toBe(503);
    expect(errorCodeOf(created)).toBe('key_missing');

    const health = await apiTo(barePort, 'GET', '/health');
    const backup = bodyOf<{ backup: { available: boolean } }>(health).backup;
    expect(backup.available).toBe(false);
  });
});

/** A request against the hub under test. */
function api(method: string, pathname: string, body?: unknown): Promise<ApiResponse> {
  return apiTo(port, method, pathname, body);
}

function apiTo(
  targetPort: number,
  method: string,
  pathname: string,
  body?: unknown
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
          'x-actor': TEST_ACTOR,
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

function errorCodeOf(response: ApiResponse): string | undefined {
  const body = response.body as { error?: { code?: string } } | null;
  return body?.error?.code;
}
