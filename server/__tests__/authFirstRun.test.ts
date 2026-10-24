// ABOUTME: The first run of a hub that has just been installed: it holds no institution and no
// ABOUTME: account, so the setup endpoint has to bring both, and it refuses to run a second time.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestContext } from '@/data/__tests__/harness';
import { LANServer } from '@/server/LANServer';

const ADMIN = 'grace.wekesa';
const PASSWORD = 'mwangaza-hub-2027';
const SCHOOL = 'Mwangaza Secondary School';

interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

let workDir: string;
let hub: LANServer;
let port: number;
let token: string;

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-first-run-'));
  const databaseFile = path.join(workDir, 'schoolpilot.db');

  // A hub that has just been installed: the schema and nothing else. No institution and no
  // account, which is the state the first run has to get itself out of.
  const empty = await createTestContext({
    database: { kind: 'file', filename: databaseFile },
    seed: false,
  });
  await empty.close();

  hub = new LANServer({ dataDir: workDir, databaseFile, host: '127.0.0.1', port: 0 });
  await hub.start();
  port = hub.address?.port ?? 0;
  expect(port).toBeGreaterThan(0);
}, 120000);

afterAll(async () => {
  try {
    if (hub) await hub.stop();
  } finally {
    if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}, 60000);

describe('the first run of a freshly installed hub', () => {
  it('reports that it needs setting up', async () => {
    const state = await api('GET', '/api/auth/state');
    expect(state.status).toBe(200);
    expect(bodyOf<{ setupRequired: boolean }>(state).setupRequired).toBe(true);
  });

  it('refuses the entity API while nobody can sign in', async () => {
    const refused = await api('GET', '/api/entities/institution');
    expect(refused.status).toBe(401);
  });

  it('creates the institution and the first administrator in one step', async () => {
    const created = await api('POST', '/api/auth/setup', {
      institution: {
        name: SCHOOL,
        country: 'KE',
        ownership: 'private',
        gender_policy: 'mixed',
        boarding_policy: 'day',
        default_locale: 'en-KE',
        time_zone: 'Africa/Nairobi',
        base_currency: 'KES',
      },
      username: ADMIN,
      password: PASSWORD,
    });
    expect(created.status).toBe(201);

    token = bodyOf<{ token: string }>(created).token;
    expect(token).toMatch(/^sp1_/);

    const institutions = await hub.getRepository()?.list('institution');
    expect(institutions?.items.map((row) => row.name)).toContain(SCHOOL);

    // The session it issued is a real one, so the hub is usable from here on.
    const session = await api('GET', '/api/auth/session', undefined, token);
    expect(session.status).toBe(200);
  });

  it('refuses a second setup once an administrator exists', async () => {
    const refused = await api('POST', '/api/auth/setup', {
      institution: { name: 'Somewhere Else', country: 'KE' },
      username: 'second.admin',
      password: PASSWORD,
    });
    expect(refused.status).toBe(409);
    expect(errorCodeOf(refused)).toBe('setup_complete');
  });

  it('lets the administrator it created sign in', async () => {
    const login = await api('POST', '/api/auth/login', { username: ADMIN, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(bodyOf<{ token: string }>(login).token).toMatch(/^sp1_/);
  });
});

/** A request against the hub under test. */
function api(
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
        port,
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
