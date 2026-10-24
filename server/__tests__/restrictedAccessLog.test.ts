// ABOUTME: The restricted-data access trail over a running hub: a restricted read and write are
// ABOUTME: recorded with the actor and the fields but never a value, and a read that cannot be
// ABOUTME: recorded is not served.

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter } from '@/data/adapters/sqlite';
import { createTestContext, TEST_ACTOR, type TestContext } from '@/data/__tests__/harness';
import { LANServer } from '@/server/LANServer';

import { createHubRouter } from '../http/hubRouter';
import {
  FileRestrictedAccessLog,
  MemoryRestrictedAccessLog,
  type RestrictedAccessEntry,
  type RestrictedAccessLog,
} from '../security/restrictedAccessLog';

interface ApiResponse {
  readonly status: number;
  readonly headers: http.IncomingHttpHeaders;
  readonly body: unknown;
}

let workDir: string;
let databaseFile: string;
let hub: LANServer;
let port: number;
let accessLog: MemoryRestrictedAccessLog;
let healthVisitId: string;

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-access-'));
  databaseFile = path.join(workDir, 'schoolpilot.db');

  const seeded = await createTestContext({
    database: { kind: 'file', filename: databaseFile },
    entities: ['learner', 'health_visit', 'conduct_incident'],
  });
  healthVisitId = seeded.seed.idOf('health_visit');
  await seeded.close();

  accessLog = new MemoryRestrictedAccessLog();
  hub = new LANServer({
    dataDir: workDir,
    databaseFile,
    host: '127.0.0.1',
    port: 0,
    actor: TEST_ACTOR,
    restrictedKey: randomBytes(32).toString('base64'),
    accessLog,
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
});

describe('the restricted-access log over the hub', () => {
  it('records a restricted read with the actor, the row and the fields, and no value', async () => {
    accessLog.entries.length = 0;

    const response = await api('GET', `/api/entities/health_visit/${healthVisitId}`);
    expect(response.status).toBe(200);
    expect(bodyOf<{ complaint: string }>(response).complaint).toBe('Headache and dizziness.');

    expect(accessLog.entries).toHaveLength(1);
    const entry = accessLog.entries[0] as RestrictedAccessEntry;
    expect(entry.action).toBe('read');
    expect(entry.entity).toBe('health_visit');
    expect(entry.actor).toBe(TEST_ACTOR);
    expect(entry.ids).toEqual([healthVisitId]);
    expect(entry.fields.sort()).toEqual(['complaint', 'treatment']);
    expect(entry.outcome).toBe('allowed');
    expect(entry.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(JSON.stringify(entry)).not.toContain('Headache');
  });

  it('records a restricted list once for the page', async () => {
    accessLog.entries.length = 0;

    const response = await api('GET', '/api/entities/health_visit?limit=10');
    expect(response.status).toBe(200);

    expect(accessLog.entries).toHaveLength(1);
    expect(accessLog.entries[0]?.action).toBe('list');
    expect(accessLog.entries[0]?.ids).toEqual([healthVisitId]);
  });

  it('records a write that carries a restricted value', async () => {
    const current = await api('GET', `/api/entities/health_visit/${healthVisitId}`);
    const rowVersion = bodyOf<{ rowVersion: number }>(current).rowVersion;
    accessLog.entries.length = 0;

    const response = await api('PATCH', `/api/entities/health_visit/${healthVisitId}`, {
      expectedVersion: rowVersion,
      patch: { treatment: 'Reviewed after an hour.' },
    });
    expect(response.status).toBe(200);

    expect(accessLog.entries).toHaveLength(1);
    expect(accessLog.entries[0]?.action).toBe('update');
    expect(accessLog.entries[0]?.fields).toContain('treatment');
  });

  it('records nothing for a read that carries no restricted value', async () => {
    accessLog.entries.length = 0;

    expect((await api('GET', '/api/entities')).status).toBe(200);
    // The audit trail holds the redaction marker, not the clinical detail, so reading it is not
    // reading restricted data.
    expect((await api('GET', `/api/entities/health_visit/${healthVisitId}/audit`)).status).toBe(200);

    expect(accessLog.entries).toEqual([]);
  });

  it('serves the value sealed in the database and the plaintext over the API', async () => {
    const disk = createNodeSqliteAdapter({ filename: databaseFile, foreignKeys: true });
    await disk.open();
    try {
      const row = await disk.get<{ complaint: string; treatment: string }>(
        'SELECT complaint, treatment FROM health_visit WHERE id = ?',
        [healthVisitId]
      );
      expect(row?.complaint.startsWith('enc:v1:')).toBe(true);
      expect(row?.complaint).not.toContain('Headache');
      expect(row?.treatment.startsWith('enc:v1:')).toBe(true);
    } finally {
      await disk.close();
    }

    const response = await api('GET', `/api/entities/health_visit/${healthVisitId}`);
    expect(bodyOf<{ complaint: string; treatment: string }>(response).complaint).toBe(
      'Headache and dizziness.'
    );
  });

  it('sets the hub security headers on every response', async () => {
    const response = await api('GET', '/health');
    expect(response.status).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });
});

describe('the file access log', () => {
  it('appends one JSON line per entry', () => {
    const file = path.join(workDir, 'logs', 'restricted-access.jsonl');
    const log = new FileRestrictedAccessLog(file);

    log.record({
      at: '2027-01-07T08:00:00.000Z',
      actor: TEST_ACTOR,
      action: 'read',
      entity: 'health_visit',
      ids: ['h1'],
      fields: ['complaint'],
      outcome: 'allowed',
    });
    log.record({
      at: '2027-01-07T08:01:00.000Z',
      actor: null,
      action: 'list',
      entity: 'learner',
      ids: ['l1'],
      fields: ['medical'],
      outcome: 'allowed',
    });

    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0] as string)).toMatchObject({
      action: 'read',
      entity: 'health_visit',
      ids: ['h1'],
    });
    expect(JSON.parse(lines[1] as string)).toMatchObject({ actor: null, action: 'list' });

    if (process.platform !== 'win32') {
      expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    }
  });
});

describe('when the access log cannot be written', () => {
  let context: TestContext;
  let server: http.Server;
  let ownPort: number;

  beforeAll(async () => {
    context = await createTestContext({
      entities: ['learner', 'health_visit', 'conduct_incident'],
    });

    const broken: RestrictedAccessLog = {
      record(): void {
        throw new Error('the access log is not writable');
      },
    };

    const router = createHubRouter({
      repository: context.repository,
      actor: TEST_ACTOR,
      accessLog: broken,
    });
    server = http.createServer((req, res) => void router.handle(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    ownPort = address && typeof address !== 'string' ? address.port : 0;
  }, 60000);

  afterAll(async () => {
    if (server?.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
    await context?.close();
  });

  it('refuses the read rather than serving it unlogged', async () => {
    const id = context.seed.idOf('health_visit');
    const response = await request(ownPort, 'GET', `/api/entities/health_visit/${id}`);

    expect(response.status).toBe(500);
    expect(errorCodeOf(response)).toBe('internal');
    // The row is not in the body: a read that could not be recorded was not served.
    expect(JSON.stringify(response.body)).not.toContain('Headache');
  });
});

/** A request against the hub. */
function api(method: string, pathname: string, body?: unknown): Promise<ApiResponse> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise<ApiResponse>((resolve, reject) => {
    const request_ = http.request(
      {
        host: '127.0.0.1',
        port,
        path: pathname,
        method,
        headers: {
          'x-actor': TEST_ACTOR,
          ...(payload !== undefined
            ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) }
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
            headers: response.headers,
            body: text.length > 0 ? (JSON.parse(text) as unknown) : null,
          });
        });
      }
    );
    request_.on('error', reject);
    if (payload !== undefined) request_.write(payload);
    request_.end();
  });
}

/** A request against an arbitrary server, for the hub that has no fixed port. */
function request(portNumber: number, method: string, pathname: string): Promise<ApiResponse> {
  return new Promise<ApiResponse>((resolve, reject) => {
    const request_ = http.request(
      { host: '127.0.0.1', port: portNumber, path: pathname, method },
      (response) => {
        response.setEncoding('utf8');
        let text = '';
        response.on('data', (chunk: string) => {
          text += chunk;
        });
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: text.length > 0 ? (JSON.parse(text) as unknown) : null,
          });
        });
      }
    );
    request_.on('error', reject);
    request_.end();
  });
}

/** The JSON body of a response, typed by the caller. */
function bodyOf<T>(response: ApiResponse): T {
  return response.body as T;
}

/** The error code of a refusal. */
function errorCodeOf(response: ApiResponse): string | undefined {
  const body = response.body as { error?: { code?: string } } | null;
  return body?.error?.code;
}
