// ABOUTME: The hub's number-block API over a real HTTP socket: two offline devices numbering
// ABOUTME: receipts from the blocks it hands out never collide, and the blocks outlive a restart.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { createTestContext } from '@/data/__tests__/harness';
import { createHttpBlockSource } from '@/data/sequences';
import {
  BlockAllocator,
  createSqliteSequenceStore,
  ensureSequenceSchema,
  SequenceService,
  type BlockReservation,
  type ScopeValues,
} from '@/domain/sequences';
import { LANServer } from '@/server/LANServer';

import { hashPassword } from '../auth/passwords';

interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

/** The seeded user the hub authenticates against; it has no administrator of its own. */
const USERNAME = 'grace.wekesa';
const PASSWORD = 'mwangaza-hub-2027';

const SCOPE: ScopeValues = { institution: 'INST-1', year: 2027 };

let workDir: string;
let databaseFile: string;
let hub: LANServer;
let port: number;
/** The bearer token every request after the sign-in carries. */
let token: string | undefined;

const devices: SqliteAdapter[] = [];

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-sequences-'));
  databaseFile = path.join(workDir, 'schoolpilot.db');

  // A real SQLite file, seeded through the same repository the browser uses.
  const seeded = await createTestContext({ database: { kind: 'file', filename: databaseFile } });
  // The fixture user's password hash is a placeholder; the hub needs one it can verify.
  const users = await seeded.repository.list('user', { where: { username: USERNAME } });
  const seededUser = users.items[0];
  if (!seededUser) throw new Error(`the ${USERNAME} fixture was not seeded`);
  await seeded.repository.update(
    'user',
    seededUser.id,
    { password_hash: hashPassword(PASSWORD), status: 'active', mfa: false },
    { expectedVersion: seededUser.rowVersion, actor: seededUser.id, reason: 'test fixture' }
  );
  await seeded.close();

  await startHub();
}, 60000);

afterEach(async () => {
  while (devices.length > 0) await devices.pop()?.close();
});

afterAll(async () => {
  try {
    if (hub) await hub.stop();
  } finally {
    if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}, 60000);

/** Starts the hub over the suite's database and signs in, as a restart does. */
async function startHub(): Promise<void> {
  token = undefined;
  hub = new LANServer({ dataDir: workDir, databaseFile, host: '127.0.0.1', port: 0 });
  await hub.start();
  port = hub.address?.port ?? 0;
  expect(port).toBeGreaterThan(0);

  const login = await api('POST', '/api/auth/login', { username: USERNAME, password: PASSWORD });
  if (login.status !== 200) {
    throw new Error(`the hub refused the sign-in: ${JSON.stringify(login.body)}`);
  }
  token = (login.body as { token: string }).token;
}

/** A device: its own database, its own sequences, numbering from the hub's blocks over HTTP. */
async function device(deviceId: string, blockSize: number): Promise<BlockAllocator> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
  await adapter.open();
  await ensureSequenceSchema(adapter);
  devices.push(adapter);

  return new BlockAllocator({
    service: new SequenceService({ store: createSqliteSequenceStore(adapter), deviceId }),
    deviceId,
    blockSize,
    hub: createHttpBlockSource({
      baseUrl: `http://127.0.0.1:${port}`,
      headers: { authorization: `Bearer ${token}` },
      fetch: nodeFetch as unknown as typeof fetch,
    }),
  });
}

describe('the block API', () => {
  it('refuses a caller with no session, so nobody can burn a school receipt range', async () => {
    const refused = await api('POST', '/api/sequences/blocks', block('device-a'), false);

    expect(refused.status).toBe(401);
    expect(errorCodeOf(refused)).toBe('unauthenticated');
  });

  it('hands out a block of the size asked for, recorded against the device', async () => {
    const response = await api('POST', '/api/sequences/blocks', { ...block('device-a'), size: 5 });

    expect(response.status).toBe(201);
    const reserved = (response.body as { block: BlockReservation }).block;
    expect(reserved).toMatchObject({ sequence: 'receipt', deviceId: 'device-a', size: 5, status: 'open' });
    expect(reserved.endSeq - reserved.startSeq + 1).toBe(5);
  });

  it('refuses a malformed request rather than reserving numbers for it', async () => {
    const noScope = await api('POST', '/api/sequences/blocks', { sequence: 'receipt', deviceId: 'device-a' });
    const noDevice = await api('POST', '/api/sequences/blocks', { sequence: 'receipt', scope: SCOPE });
    const badSize = await api('POST', '/api/sequences/blocks', { ...block('device-a'), size: 0 });

    expect([noScope.status, noDevice.status, badSize.status]).toEqual([400, 400, 400]);
    expect(errorCodeOf(noScope)).toBe('invalid_body');
  });

  it('lists the blocks still holding numbers for a device', async () => {
    const first = await api('POST', '/api/sequences/blocks', { ...block('device-list'), size: 3 });
    const reserved = (first.body as { block: BlockReservation }).block;

    const listed = await api('GET', '/api/sequences/blocks?deviceId=device-list');

    expect(listed.status).toBe(200);
    const blocks = (listed.body as { blocks: Array<{ startSeq: number; remaining: number }> }).blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ startSeq: reserved.startSeq, remaining: 3 });
  });
});

describe('no duplicate receipt numbers across devices', () => {
  it('numbers two devices over HTTP without a single repeat, through block top-ups', async () => {
    // A block of 5 and 8 receipts each: both devices run out and top up from the hub.
    const front = await device('device-front-desk', 5);
    const bursar = await device('device-bursar', 5);

    const numbers: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      // Interleaved, as two cashiers at the counter would be.
      numbers.push((await front.issue('receipt', SCOPE)).number);
      numbers.push((await bursar.issue('receipt', SCOPE)).number);
    }

    expect(numbers).toHaveLength(16);
    expect(new Set(numbers).size).toBe(16);
    // Receipts print as RCT/<year>/<six digit counter>.
    for (const printed of numbers) expect(printed).toMatch(/^RCT\/2027\/\d{6}$/);
  }, 60000);

  it('keeps blocks disjoint across a hub restart, so a restart cannot re-offer a printed number', async () => {
    const before = await api('POST', '/api/sequences/blocks', { ...block('device-restart'), size: 4 });
    const reservedBefore = (before.body as { block: BlockReservation }).block;

    await hub.stop();
    await startHub();

    const after = await api('POST', '/api/sequences/blocks', { ...block('device-restart-2'), size: 4 });
    const reservedAfter = (after.body as { block: BlockReservation }).block;

    expect(reservedAfter.startSeq).toBeGreaterThan(reservedBefore.endSeq);
  }, 60000);
});

/** A block request for the receipt sequence. */
function block(deviceId: string): { sequence: string; scope: ScopeValues; deviceId: string } {
  return { sequence: 'receipt', scope: SCOPE, deviceId };
}

/** A request against the running hub. */
function api(
  method: string,
  pathname: string,
  body?: unknown,
  authenticated = true
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
          ...(authenticated && token !== undefined ? { authorization: `Bearer ${token}` } : {}),
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

/** The error code of a refusal. */
function errorCodeOf(response: ApiResponse): string | undefined {
  const body = response.body as { error?: { code?: string } } | null;
  return body?.error?.code;
}

/**
 * A `fetch` over `node:http`.
 *
 * jsdom does not provide one, and the block source's injectable `fetch` is the seam that lets a
 * device run against a real socket here and the platform's `fetch` in the browser.
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
