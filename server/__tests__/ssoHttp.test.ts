// ABOUTME: Single sign-on over the hub's real HTTP socket: a staff member signs in through a provider
// ABOUTME: running in this process and ends with the same bearer session a password gives, a stranger
// ABOUTME: is turned away, and a hub with no provider configured serves no SSO endpoints at all.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, TEST_ACTOR } from '@/data/__tests__/harness';
import { LANServer } from '@/server/LANServer';

import { namedProviderConfig } from '../auth/oidc';
import { LocalOidcProvider } from './oidcProvider';

interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

const REDIRECT_URI = 'http://127.0.0.1:5173/auth/sso/callback';
const STAFF_EMAIL = 'grace.wekesa@mwangaza.ac.ke';

let workDir: string;
let idp: LocalOidcProvider;
let hub: LANServer;
let port: number;
let seededUserId: string;

beforeAll(async () => {
  idp = new LocalOidcProvider();
  await idp.start();

  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-sso-'));
  const databaseFile = path.join(workDir, 'schoolpilot.db');

  // A real SQLite file in which a staff member's recorded email is the address the provider will
  // assert: that record is what an SSO identity links to.
  const seeded = await createTestContext({ database: { kind: 'file', filename: databaseFile } });
  const staffId = seeded.seed.idOf('staff');
  const staff = await seeded.repository.get('staff', staffId);
  await seeded.repository.update(
    'staff',
    staffId,
    { emails: [{ address: STAFF_EMAIL, label: 'work' }] },
    { expectedVersion: staff?.rowVersion ?? 0, actor: TEST_ACTOR, reason: 'test fixture' }
  );
  seededUserId = seeded.seed.idOf('user');
  await seeded.close();

  hub = new LANServer({
    dataDir: workDir,
    databaseFile,
    host: '127.0.0.1',
    port: 0,
    rateLimits: false,
    sso: [
      namedProviderConfig('google', {
        issuer: idp.issuer,
        clientId: idp.clientId,
        clientSecret: idp.clientSecret,
        redirectUri: REDIRECT_URI,
        allowedDomains: ['mwangaza.ac.ke'],
      }),
    ],
  });
  await hub.start();
  port = hub.address?.port ?? 0;
  expect(port).toBeGreaterThan(0);
}, 60000);

afterAll(async () => {
  try {
    await hub?.stop();
    await idp?.stop();
  } finally {
    if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}, 60000);

beforeEach(() => {
  idp.identity = { sub: 'provider-subject-1', email: STAFF_EMAIL, email_verified: true, name: 'Grace Wekesa' };
});

/** Drives the browser half: ask the hub where to go, follow the provider's redirect, return its code. */
async function authorise(provider = 'google'): Promise<{ code: string; state: string }> {
  const started = await api('POST', `/api/auth/sso/${provider}/start`);
  expect(started.status).toBe(200);
  const { authorizationUrl, state } = started.body as { authorizationUrl: string; state: string };

  const redirected = await fetch(authorizationUrl, { redirect: 'manual' });
  expect(redirected.status).toBe(302);
  const location = new URL(redirected.headers.get('location') as string);
  expect(location.searchParams.get('state')).toBe(state);
  return { code: location.searchParams.get('code') as string, state };
}

describe('signing in with SSO over HTTP', () => {
  it('offers the configured providers to a caller with no session, and never a secret', async () => {
    const response = await api('GET', '/api/auth/sso/providers');

    expect(response.status).toBe(200);
    const { providers } = response.body as { providers: Array<{ id: string; label: string }> };
    expect(providers.map((provider) => provider.id)).toEqual(['google']);
    expect(JSON.stringify(response.body)).not.toContain(idp.clientSecret);
  });

  it('turns a provider sign-in into a bearer session the hub accepts', async () => {
    const { code, state } = await authorise();

    const completed = await api('POST', '/api/auth/sso/google/complete', { code, state });
    expect(completed.status).toBe(200);
    const outcome = completed.body as { status: string; token: string; user: { id: string } };
    expect(outcome.status).toBe('authenticated');
    expect(outcome.user.id).toBe(seededUserId);

    // The same token a password sign-in issues opens a protected route.
    const session = await api('GET', '/api/auth/session', undefined, outcome.token);
    expect(session.status).toBe(200);
  });

  it('refuses the same authorisation state a second time', async () => {
    const { code, state } = await authorise();
    const first = await api('POST', '/api/auth/sso/google/complete', { code, state });
    expect(first.status).toBe(200);

    const replay = await api('POST', '/api/auth/sso/google/complete', { code, state });
    expect(replay.status).toBe(401);
    expect(errorCodeOf(replay)).toBe('invalid_state');
  });

  it('turns away an identity no account matches, and one outside the allowed domains', async () => {
    idp.identity = { sub: 'stranger', email: 'stranger@mwangaza.ac.ke', email_verified: true };
    const stranger = await authorise();
    const refused = await api('POST', '/api/auth/sso/google/complete', stranger);
    expect(refused.status).toBe(403);
    expect(errorCodeOf(refused)).toBe('no_account');

    idp.identity = { sub: 'outsider', email: 'someone@example.org', email_verified: true };
    const outsider = await authorise();
    const outside = await api('POST', '/api/auth/sso/google/complete', outsider);
    expect(outside.status).toBe(403);
    expect(errorCodeOf(outside)).toBe('domain_not_allowed');
  });

  it('refuses a provider the hub was never configured with, and a body with no code', async () => {
    const unknown = await api('POST', '/api/auth/sso/okta/start');
    expect(unknown.status).toBe(404);
    expect(errorCodeOf(unknown)).toBe('unknown_provider');

    const empty = await api('POST', '/api/auth/sso/google/complete', { state: 'x' });
    expect(empty.status).toBe(400);
    expect(errorCodeOf(empty)).toBe('invalid_body');
  });
});

describe('a hub with no provider configured', () => {
  it('serves no SSO endpoints at all', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-sso-off-'));
    const bare = new LANServer({ dataDir: dir, host: '127.0.0.1', port: 0, rateLimits: false, sso: false });
    await bare.start();
    try {
      const response = await apiTo(bare.address?.port ?? 0, 'GET', '/api/auth/sso/providers');
      expect(response.status).toBe(404);
    } finally {
      await bare.stop();
      await fs.promises.rm(dir, { recursive: true, force: true });
    }
  }, 60000);
});

function api(method: string, pathname: string, body?: unknown, bearer?: string): Promise<ApiResponse> {
  return apiTo(port, method, pathname, body, bearer);
}

/** The error code of a refusal. */
function errorCodeOf(response: ApiResponse): string | undefined {
  const body = response.body as { error?: { code?: string } } | null;
  return body?.error?.code;
}

/** A request against a hub on a port, with an optional JSON body and bearer token. */
function apiTo(
  targetPort: number,
  method: string,
  pathname: string,
  body?: unknown,
  bearer?: string
): Promise<ApiResponse> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise<ApiResponse>((resolve, reject) => {
    const outgoing = http.request(
      {
        host: '127.0.0.1',
        port: targetPort,
        path: pathname,
        method,
        headers: {
          ...(bearer === undefined ? {} : { authorization: `Bearer ${bearer}` }),
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
            body: text.length > 0 ? (JSON.parse(text) as unknown) : null,
          });
        });
      }
    );
    outgoing.on('error', reject);
    if (payload !== undefined) outgoing.write(payload);
    outgoing.end();
  });
}
