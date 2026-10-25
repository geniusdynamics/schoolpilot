// ABOUTME: GP-7, the multi-device golden path of spec 08: a bursar's PC and two teachers' phones work
// ABOUTME: offline against one hub, issue receipts and enter marks concurrently, then reconnect and
// ABOUTME: converge - no duplicate receipt number, different mark cells merged, the same cell surfaced.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestContext, type Seed, type TestContext } from '@/data/__tests__/harness';
import { createHttpBlockSource } from '@/data/sequences';
import { createHttpSyncTransport, DeviceNode, HlcClock } from '@/data/sync';
import {
  BlockAllocator,
  createSqliteSequenceStore,
  ensureSequenceSchema,
  SequenceBlockExhaustedError,
  SequenceService,
  type ScopeValues,
} from '@/domain/sequences';
import { ENTITY_NAMES, type EntityName } from '@/domain/schema';
import { LANServer } from '@/server/LANServer';

import { hashPassword } from '../auth';
import { grantRoles } from './helpers/authorisation';

interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

const USERNAME = 'grace.wekesa';
const PASSWORD = 'mwangaza-hub-2027';
const YEAR = 2027;
/** Numbers a device is given at a time: the offline run below uses exactly one block. */
const BLOCK_SIZE = 5;
/** The wall times the teachers' clocks are pinned to, so which write is later is by construction. */
const TEACHER_A_WALL = 1_800_000_000_000;
const TEACHER_B_WALL = 1_800_000_001_000;

let workDir: string;
let hub: LANServer;
let port: number;
let token: string;
let seed: Seed;
let scope: ScopeValues;
let paper2: string;
let paper3: string;
let paper4: string;

/** A device: its own database, its own sync place and number blocks, and a switch for its network. */
interface Device {
  readonly id: string;
  readonly context: TestContext;
  readonly node: DeviceNode;
  readonly numbers: BlockAllocator;
  readonly transport: ReturnType<typeof createHttpSyncTransport>;
  online: boolean;
}

const opened: Device[] = [];

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-gp7-'));
  const databaseFile = path.join(workDir, 'schoolpilot.db');

  const seeded = await createTestContext({ database: { kind: 'file', filename: databaseFile } });
  seed = seeded.seed;
  scope = { institution: seed.idOf('institution'), year: YEAR };

  // Three components give the three mark cells of the scenario their own identity, apart from the
  // seeded fixture's.
  const components: string[] = [];
  for (const [code, name] of [
    ['P2', 'Paper 2'],
    ['P3', 'Paper 3'],
    ['P4', 'Paper 4'],
  ] as const) {
    const created = await seeded.repository.create('component', seed.inputFor('component', { code, name }));
    components.push(created.id);
  }
  [paper2, paper3, paper4] = components as [string, string, string];

  // The hub authenticates against the canonical user table; the fixture's hash is a placeholder.
  const users = await seeded.repository.list('user', { where: { username: USERNAME } });
  const seededUser = users.items[0];
  if (!seededUser) throw new Error(`the ${USERNAME} fixture was not seeded`);
  await seeded.repository.update(
    'user',
    seededUser.id,
    { password_hash: hashPassword(PASSWORD), status: 'active', mfa: false },
    { expectedVersion: seededUser.rowVersion, actor: seededUser.id, reason: 'test fixture' }
  );
  await grantRoles(seeded.adapter, seededUser.id);
  await seeded.close();

  hub = new LANServer({ dataDir: workDir, databaseFile, host: '127.0.0.1', port: 0, rateLimits: false });
  await hub.start();
  port = hub.address?.port ?? 0;
  expect(port).toBeGreaterThan(0);

  const login = await api('POST', '/api/auth/login', { username: USERNAME, password: PASSWORD });
  if (login.status !== 200) {
    throw new Error(`the hub refused the sign-in: ${JSON.stringify(login.body)}`);
  }
  token = (login.body as { token: string }).token;
}, 120000);

afterAll(async () => {
  try {
    for (const device of opened.reverse()) await device.context.close();
    if (hub) await hub.stop();
  } finally {
    if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}, 120000);

/** Opens a device that has never synced. `wall` pins its clock so the order of two writes is known. */
async function openDevice(id: string, wall?: number): Promise<Device> {
  const context = await createTestContext({ seed: false });
  await ensureSequenceSchema(context.adapter);

  const device: Device = {
    id,
    context,
    node: await DeviceNode.open({
      repository: context.repository,
      adapter: context.adapter,
      deviceId: id,
      dialect: 'sqlite',
      ...(wall === undefined ? {} : { clock: new HlcClock(id, () => wall) }),
    }),
    // Assigned below: the network switch needs the device itself.
    numbers: undefined as never,
    transport: undefined as never,
    online: true,
  };

  // One switch for the whole network: while the device is offline neither a sync nor a request for
  // a block of numbers reaches the hub, which is what offline means.
  const networkFetch = ((input: string | URL | Request, init?: RequestInit) =>
    device.online
      ? nodeFetch(input, init)
      : Promise.reject(new Error(`${id} is offline`))) as unknown as typeof fetch;
  const headers = { authorization: `Bearer ${token}` };

  Object.assign(device, {
    transport: createHttpSyncTransport({
      baseUrl: `http://127.0.0.1:${port}`,
      headers,
      fetch: networkFetch,
    }),
    numbers: new BlockAllocator({
      service: new SequenceService({ store: createSqliteSequenceStore(context.adapter), deviceId: id }),
      deviceId: id,
      blockSize: BLOCK_SIZE,
      hub: createHttpBlockSource({ baseUrl: `http://127.0.0.1:${port}`, headers, fetch: networkFetch }),
    }),
  });

  opened.push(device);
  return device;
}

/** Takes the next receipt number and records the payment it numbers, on the device's own database. */
async function takePayment(device: Device): Promise<string> {
  const { number } = await device.numbers.issue('receipt', scope);
  await device.node.create('payment', seed.inputFor('payment', { reference: number }));
  return number;
}

/** The ids of every row of an entity on a database. */
async function idsOf(repo: { list: DeviceNode['repo']['list'] }, entity: EntityName): Promise<string[]> {
  const page = await repo.list(entity, { limit: 1000 });
  return page.items.map((row) => row.id as string).sort();
}

describe('GP-7: a bursar and two teachers work offline, then converge', () => {
  it('issues unique receipts, merges different mark cells, surfaces a same-cell conflict, and converges', async () => {
    const bursar = await openDevice('device-bursar-pc');
    const teacherA = await openDevice('device-teacher-a', TEACHER_A_WALL);
    const teacherB = await openDevice('device-teacher-b', TEACHER_B_WALL);
    const devices = [bursar, teacherA, teacherB];

    // 1. Online: every device pulls the hub's school, and takes its first receipt, which is when it
    //    is given a block of numbers.
    for (const device of devices) {
      const pulled = await device.node.pull(device.transport);
      expect(pulled.failed, `${device.id} pull`).toBe(0);
      expect(pulled.applied, `${device.id} pull`).toBeGreaterThanOrEqual(ENTITY_NAMES.length);
    }
    const receipts = new Map<string, string[]>(devices.map((device) => [device.id, []]));
    for (const device of devices) receipts.get(device.id)?.push(await takePayment(device));

    // 2. All three go offline. Neither a sync nor a request for numbers can reach the hub now.
    for (const device of devices) device.online = false;
    await expect(teacherA.node.push(teacherA.transport)).rejects.toThrow(/offline/);

    // 3. Concurrent receipts, interleaved as three counters would be: each device finishes its block.
    for (let i = 0; i < BLOCK_SIZE - 1; i += 1) {
      for (const device of devices) receipts.get(device.id)?.push(await takePayment(device));
    }
    // A block used up offline is refused loudly; a device never invents or reuses a number.
    await expect(takePayment(bursar)).rejects.toBeInstanceOf(SequenceBlockExhaustedError);

    // 4. Concurrent mark entry. Two different cells (different papers): both must survive the merge.
    //    One cell both teachers enter: it must fold into one row and be surfaced as a conflict.
    await teacherA.node.create('mark', seed.inputFor('mark', { component_id: paper2, score: '51' }));
    await teacherB.node.create('mark', seed.inputFor('mark', { component_id: paper3, score: '72' }));
    const sameCellByA = await teacherA.node.create('mark', seed.inputFor('mark', { component_id: paper4, score: '40' }));
    await teacherB.node.create('mark', seed.inputFor('mark', { component_id: paper4, score: '45' }));

    // 5. Reconnect. Everyone pushes, then everyone pulls what the others pushed.
    for (const device of devices) device.online = true;
    for (const device of [bursar, teacherA, teacherB]) {
      const pushed = await device.node.push(device.transport);
      expect(pushed.rejected, `${device.id} push`).toHaveLength(0);
    }
    for (const device of devices) {
      const pulled = await device.node.pull(device.transport);
      expect(pulled.failed, `${device.id} second pull`).toBe(0);
    }

    // No duplicate receipt number, on the hub or anywhere: three devices took five each.
    const hubNode = hub.getSyncNode();
    if (!hubNode) throw new Error('the hub has no sync node');
    const payments = await hubNode.repo.list('payment', { limit: 1000 });
    const numbered = payments.items
      .map((row) => row.reference as string | undefined)
      .filter((reference): reference is string => typeof reference === 'string' && reference.startsWith('RCT/'));
    expect(numbered).toHaveLength(BLOCK_SIZE * devices.length);
    expect(new Set(numbered).size).toBe(numbered.length);
    expect([...numbered].sort()).toEqual([...[...receipts.values()].flat()].sort());
    for (const number of numbered) expect(number).toMatch(new RegExp(`^RCT/${YEAR}/\\d{6}$`));

    // Different cells merge: both papers' marks are on the hub with the scores their teacher typed.
    const marks = await hubNode.repo.list('mark', { limit: 1000 });
    const scoreOf = (component: string): string[] =>
      marks.items.filter((row) => row.component_id === component).map((row) => String(row.score));
    expect(scoreOf(paper2)).toEqual(['51']);
    expect(scoreOf(paper3)).toEqual(['72']);

    // The same cell is one row - the id that landed first - holding the later write, and the
    // collision is surfaced rather than silently resolved.
    const sameCell = marks.items.filter((row) => row.component_id === paper4);
    expect(sameCell).toHaveLength(1);
    expect(sameCell[0]?.id).toBe(sameCellByA.row.id);
    expect(sameCell[0]?.score).toBe('45');

    const conflicts = await api('GET', '/api/sync/conflicts', undefined, true);
    expect(conflicts.status).toBe(200);
    const kinds = (conflicts.body as { conflicts: Array<{ kind: string }> }).conflicts.map((note) => note.kind);
    expect(kinds).toContain('cell_identity');

    // Converged: every device holds exactly the hub's rows, for every entity.
    for (const entity of ENTITY_NAMES) {
      const onHub = await idsOf(hubNode.repo, entity);
      for (const device of devices) {
        expect(await idsOf(device.node.repo, entity), `${device.id} ${entity}`).toEqual(onHub);
      }
    }

    // And on the content that mattered: the merged mark reads the same on all three devices.
    for (const device of devices) {
      const cell = await device.node.repo.list('mark', { where: { component_id: paper4 } });
      expect(cell.items.map((row) => String(row.score)), `${device.id} paper 4`).toEqual(['45']);
    }
  }, 240000);
});

/** A request against the running hub. */
function api(
  method: string,
  pathname: string,
  body?: unknown,
  authenticated: boolean | string = false
): Promise<ApiResponse> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const bearer = authenticated === true ? token : typeof authenticated === 'string' ? authenticated : undefined;
  return new Promise<ApiResponse>((resolve, reject) => {
    const outgoing = http.request(
      {
        host: '127.0.0.1',
        port,
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

/**
 * A `fetch` over `node:http`.
 *
 * jsdom does not provide one, and the transports' injectable `fetch` is the seam that lets a device
 * run against a real socket here and the platform's `fetch` in the browser.
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
