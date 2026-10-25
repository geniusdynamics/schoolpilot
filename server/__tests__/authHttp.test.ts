// ABOUTME: The authentication boundary over real HTTP: a protected hub refuses an unauthenticated
// ABOUTME: caller, a bearer session opens it, and the trusted `x-actor` header it replaced is ignored.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestContext } from '@/data/__tests__/harness';
import type { Id } from '@/domain/ids';
import type { RepositoryRow } from '@/data/repository';
import { LANServer } from '@/server/LANServer';

import { hashPassword } from '../auth';
import { grantRoles } from './helpers/authorisation';

const USERNAME = 'grace.wekesa';
const PASSWORD = 'mwangaza-portal-2027';
/** An id the caller has no claim to; the hub must never believe it. */
const SPOOFED_ACTOR = '01930000-0000-7000-8000-00000000ffff';

interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
  readonly headers: http.IncomingHttpHeaders;
}

let workDir: string;
let hub: LANServer;
let port: number;
let institutionId: Id<'institution'>;
let userId: string;
let token: string | undefined;

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-auth-http-'));
  const databaseFile = path.join(workDir, 'schoolpilot.db');

  // The seeded fixture user carries a placeholder hash, so the first thing the test does is give
  // it a password this suite knows.
  const seeded = await createTestContext({
    database: { kind: 'file', filename: databaseFile },
  });
  institutionId = seeded.seed.idOf('institution');

  const page = await seeded.repository.list('user', { where: { username: USERNAME } });
  const row = page.items[0];
  if (!row) throw new Error(`the ${USERNAME} fixture was not seeded`);
  userId = row.id;
  await seeded.repository.update(
    'user',
    row.id,
    { password_hash: hashPassword(PASSWORD), status: 'active', mfa: false },
    { expectedVersion: row.rowVersion, actor: row.id, reason: 'test fixture' }
  );
  // The hub denies an account that holds no role.
  await grantRoles(seeded.adapter, row.id);
  await seeded.close();

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

describe('an unauthenticated caller', () => {
  it('reads the health of the hub without a token', async () => {
    const health = await api('GET', '/health');
    expect(health.status).toBe(200);
    expect(bodyOf<{ running: boolean }>(health).running).toBe(true);
  });

  it('is refused the entity registry with a 401 that names the scheme', async () => {
    const refused = await api('GET', '/api/entities');
    expect(refused.status).toBe(401);
    expect(errorCodeOf(refused)).toBe('unauthenticated');
    expect(refused.headers['www-authenticate']).toBe('Bearer');

    const junk = await api('GET', '/api/entities', undefined, { token: 'not-a-token' });
    expect(junk.status).toBe(401);
    expect(errorCodeOf(junk)).toBe('unauthenticated');
  });

  it('is told the hub needs no first-run setup but cannot deliver codes', async () => {
    const state = await api('GET', '/api/auth/state');
    expect(state.status).toBe(200);
    expect(bodyOf<{ setupRequired: boolean; deliveryAvailable: boolean }>(state)).toEqual({
      setupRequired: false,
      deliveryAvailable: false,
    });
  });

  it('cannot create a second administrator', async () => {
    const refused = await api('POST', '/api/auth/setup', {
      institutionId,
      username: 'second.admin',
      password: PASSWORD,
    });
    expect(refused.status).toBe(409);
    expect(errorCodeOf(refused)).toBe('setup_complete');
  });

  it('is refused a wrong password', async () => {
    const refused = await api('POST', '/api/auth/login', {
      username: USERNAME,
      password: 'wrong-password',
    });
    expect(refused.status).toBe(401);
    expect(errorCodeOf(refused)).toBe('invalid_credentials');
  });
});

describe('a signed-in caller', () => {
  it('signs in and reads the registry with the session it was given', async () => {
    const login = await api('POST', '/api/auth/login', { username: USERNAME, password: PASSWORD });
    expect(login.status).toBe(200);
    const outcome = bodyOf<{ status: string; token: string; user: { id: string } }>(login);
    expect(outcome.status).toBe('authenticated');
    expect(outcome.user.id).toBe(userId);
    token = outcome.token;

    const session = await api('GET', '/api/auth/session');
    expect(session.status).toBe(200);
    const described = bodyOf<{ session: { current: boolean } | null; user: { username: string } }>(
      session
    );
    expect(described.session?.current).toBe(true);
    expect(described.user.username).toBe(USERNAME);

    const entities = await api('GET', '/api/entities');
    expect(entities.status).toBe(200);
    expect(bodyOf<{ entities: string[] }>(entities).entities).toContain('learner');
  }, 60000);

  it('stamps a write with the session user and ignores a spoofed x-actor header', async () => {
    const created = await api(
      'POST',
      '/api/entities/learner',
      {
        institution_id: institutionId,
        given_name: 'Api',
        family_name: 'Created',
        name_order: 'given_first',
        gender: 'not_stated',
        admission_number: 'ADM/AUTH/001',
        status: 'enrolled',
        residence_status: 'day',
      },
      { headers: { 'x-actor': SPOOFED_ACTOR } }
    );
    expect(created.status).toBe(201);

    const row = bodyOf<RepositoryRow<'learner'>>(created);
    expect(row.created_by).toBe(userId);
    expect(row.created_by).not.toBe(SPOOFED_ACTOR);

    const audit = await api('GET', `/api/entities/learner/${row.id}/audit`);
    const events = bodyOf<{ events: Array<{ action: string; actorId: string | null }> }>(
      audit
    ).events;
    expect(events.some((event) => event.action === 'create' && event.actorId === userId)).toBe(true);
    expect(events.every((event) => event.actorId !== SPOOFED_ACTOR)).toBe(true);
  }, 60000);

  it('loses access the moment it signs out', async () => {
    const ended = await api('POST', '/api/auth/logout');
    expect(ended.status).toBe(204);

    const reused = await api('GET', '/api/entities', undefined, { token });
    expect(reused.status).toBe(401);
    expect(errorCodeOf(reused)).toBe('unauthenticated');
  });
});

// --------------------------------------------------------------------------- helpers

/** A request against the running hub, carrying the suite's session unless told otherwise. */
function api(
  method: string,
  pathname: string,
  body?: unknown,
  options: { readonly token?: string | null; readonly headers?: Record<string, string> } = {}
): Promise<ApiResponse> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const bearer = options.token === undefined ? token : options.token ?? undefined;

  return new Promise<ApiResponse>((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        path: pathname,
        method,
        headers: {
          ...(bearer === undefined ? {} : { authorization: `Bearer ${bearer}` }),
          ...(options.headers ?? {}),
          ...(payload === undefined
            ? {}
            : {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(payload),
              }),
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

function errorCodeOf(response: ApiResponse): string | undefined {
  const body = response.body as { error?: { code?: string } } | null;
  return body?.error?.code;
}
