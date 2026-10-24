// ABOUTME: The hub's sync API over a real HTTP socket: the change log, a batched push, the
// ABOUTME: scope a request asks for, the refusals, and the HTTP transport a device uses.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestContext, type Seed } from '@/data/__tests__/harness';
import { createHttpSyncTransport, DeviceNode, type Snapshot } from '@/data/sync';
import { ENTITY_NAMES } from '@/domain/schema';
import { LANServer } from '@/server/LANServer';

interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

interface ChangesPage {
  readonly snapshots: Snapshot[];
  readonly cursor: number;
}

interface PushPage {
  readonly results: Array<{ status: string; id: string; error?: string }>;
}

let workDir: string;
let hub: LANServer;
let port: number;
let seed: Seed;
let institutionId: string;

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-sync-'));
  const databaseFile = path.join(workDir, 'schoolpilot.db');

  // A real SQLite file, seeded through the same repository the browser uses.
  const seeded = await createTestContext({ database: { kind: 'file', filename: databaseFile } });
  seed = seeded.seed;
  institutionId = seed.idOf('institution');
  await seeded.close();

  hub = new LANServer({ dataDir: workDir, databaseFile, host: '127.0.0.1', port: 0 });
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

describe('the change log over HTTP', () => {
  it('serves every row the hub already held when it started', async () => {
    const page = await changes(0);

    expect(page.snapshots).toHaveLength(ENTITY_NAMES.length);
    expect(page.cursor).toBeGreaterThan(0);
    // The log is ordered so a parent row lands before the rows that reference it.
    expect(page.snapshots[0]?.entity).toBe('institution');
  });

  it('serves nothing after the cursor the caller already holds', async () => {
    const first = await changes(0);
    const second = await changes(first.cursor);

    expect(second.snapshots).toHaveLength(0);
    expect(second.cursor).toBe(first.cursor);
  });

  it('refuses a cursor that is not a non-negative integer', async () => {
    const response = await api('GET', '/api/sync/changes?since=abc');

    expect(response.status).toBe(400);
    expect(errorCodeOf(response)).toBe('invalid_query');
  });
});

describe('a push over HTTP', () => {
  it('applies a change and serves it on the next pull', async () => {
    const before = await changes(0);
    const campusId = '01930000-0000-7000-8000-0000000000a1';

    const response = await api('POST', '/api/sync/push', {
      changes: [
        {
          entity: 'campus',
          id: campusId,
          op: 'create',
          hlc: '000001800000000000:000000:device-a',
          deviceId: 'device-a',
          fields: ['id', 'institution_id', 'name', 'is_main', 'created_at', 'updated_at'],
          base: {},
          payload: {
            id: campusId,
            institution_id: institutionId,
            name: 'Pushed Campus',
            is_main: false,
            created_at: '2027-01-05T08:00:00.000Z',
            updated_at: '2027-01-05T08:00:00.000Z',
          },
        },
      ],
    });

    expect(response.status).toBe(200);
    const results = bodyOf<PushPage>(response).results;
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe('insert');

    const after = await changes(before.cursor);
    expect(after.snapshots.map((snapshot) => snapshot.id)).toContain(campusId);
    expect(hub.getRepository()).not.toBeNull();
    expect((await hub.getRepository()?.list('campus'))?.total).toBe(2);
  });

  it('refuses a body that is not a changes array', async () => {
    const response = await api('POST', '/api/sync/push', { changes: 'nope' });

    expect(response.status).toBe(400);
    expect(errorCodeOf(response)).toBe('invalid_body');
  });

  it('refuses a change that names an unregistered entity', async () => {
    const response = await api('POST', '/api/sync/push', {
      changes: [{ entity: 'unicorn', id: 'x' }],
    });

    expect(response.status).toBe(400);
    expect(errorCodeOf(response)).toBe('invalid_body');
  });

  it('refuses a change outside the scope the request names, and logs it', async () => {
    const outsiderId = '01930000-0000-7000-8000-0000000000a2';

    const response = await api(
      'POST',
      `/api/sync/push?institutionId=${institutionId}`,
      {
        changes: [
          {
            entity: 'campus',
            id: outsiderId,
            op: 'create',
            hlc: '000001800000000000:000001:device-a',
            deviceId: 'device-a',
            fields: ['id', 'institution_id', 'name', 'is_main'],
            base: {},
            payload: {
              id: outsiderId,
              institution_id: '01930000-0000-7000-8000-00000000ffff',
              name: 'Somebody Else',
              is_main: false,
            },
          },
        ],
      }
    );

    expect(response.status).toBe(200);
    const results = bodyOf<PushPage>(response).results;
    expect(results[0]?.status).toBe('forbidden');

    const conflicts = await api('GET', '/api/sync/conflicts');
    expect(conflicts.status).toBe(200);
    const logged = bodyOf<{ conflicts: Array<{ policy: string; entityId: string }> }>(conflicts);
    expect(logged.conflicts.some((note) => note.entityId === outsiderId)).toBe(true);
    expect(logged.conflicts.find((note) => note.entityId === outsiderId)?.policy).toBe('scope');
  });
});

describe('a scoped pull over HTTP', () => {
  it('serves one institution and nothing of another', async () => {
    const own = await changes(0, institutionId);
    expect(own.snapshots.length).toBeGreaterThan(0);
    expect(own.snapshots.every((snapshot) => snapshot.entity === 'institution'
      ? snapshot.id === institutionId
      : snapshot.payload.institution_id === institutionId)).toBe(true);

    const other = await changes(0, '01930000-0000-7000-8000-00000000ffff');
    expect(other.snapshots).toHaveLength(0);
  });

  it('refuses a narrowed entity list without an institution to narrow it to', async () => {
    const response = await api(
      'GET',
      `/api/sync/changes?since=0&entities=${encodeURIComponent('["campus"]')}`
    );

    expect(response.status).toBe(400);
    expect(errorCodeOf(response)).toBe('invalid_query');
  });
});

describe('a device syncing over the HTTP transport', () => {
  it('pulls the hub and pushes a change back into it', async () => {
    const deviceContext = await createTestContext({ seed: false });
    try {
      const device = await DeviceNode.open({
        repository: deviceContext.repository,
        adapter: deviceContext.adapter,
        deviceId: 'device-http',
        dialect: 'sqlite',
      });
      const transport = createHttpSyncTransport({
        baseUrl: `http://127.0.0.1:${port}`,
        fetch: nodeFetch as unknown as typeof fetch,
      });

      const pulled = await device.pull(transport);
      expect(pulled.failed).toBe(0);
      expect(pulled.applied).toBeGreaterThanOrEqual(ENTITY_NAMES.length);
      expect((await device.repo.list('payment')).total).toBe(1);

      await device.create('payment', seed.inputFor('payment', { reference: 'HTTP-1' }));
      const pushed = await device.push(transport);

      expect(pushed.outcomes).toEqual({ insert: 1 });
      expect((await hub.getRepository()?.list('payment'))?.total).toBe(2);
    } finally {
      await deviceContext.close();
    }
  }, 60000);
});

/** A pull page, optionally scoped to one institution. */
async function changes(since: number, institution?: string): Promise<ChangesPage> {
  const query = new URLSearchParams({ since: String(since) });
  if (institution !== undefined) query.set('institutionId', institution);

  const response = await api('GET', `/api/sync/changes?${query.toString()}`);
  expect(response.status).toBe(200);
  return bodyOf<ChangesPage>(response);
}

/** A request against the running hub. */
function api(method: string, pathname: string, body?: unknown): Promise<ApiResponse> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise<ApiResponse>((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        path: pathname,
        method,
        headers:
          payload !== undefined
            ? {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(payload),
              }
            : {},
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

/** The JSON body of a response, typed by the caller. */
function bodyOf<T>(response: ApiResponse): T {
  return response.body as T;
}

/** The error code of a refusal. */
function errorCodeOf(response: ApiResponse): string | undefined {
  const body = response.body as { error?: { code?: string } } | null;
  return body?.error?.code;
}

/**
 * A `fetch` over `node:http`.
 *
 * jsdom does not provide one, and the transport's injectable `fetch` is the seam that lets
 * the device run against a real socket here and the platform's `fetch` in the browser.
 */
function nodeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));
  const body = typeof init?.body === 'string' ? init.body : undefined;

  return new Promise<Response>((resolve, reject) => {
    const request = http.request(
      {
        host: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: init?.method ?? 'GET',
        headers: (init?.headers as Record<string, string> | undefined) ?? {},
      },
      (response) => {
        response.setEncoding('utf8');
        let text = '';
        response.on('data', (chunk: string) => {
          text += chunk;
        });
        response.on('end', () => {
          const status = response.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: response.statusMessage ?? '',
            text: async () => text,
          } as Response);
        });
      }
    );
    request.on('error', reject);
    if (body !== undefined) request.write(body);
    request.end();
  });
}
