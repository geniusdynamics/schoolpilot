// ABOUTME: The hub's authorisation over a real HTTP socket: every role is answered the way the client's
// ABOUTME: permission model answers it, an account with no role is denied, restricted fields follow
// ABOUTME: the role, the maker-checker engine separates the two people, and a fresh hub has an administrator.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter } from '@/data/adapters/sqlite';
import { createTestContext } from '@/data/__tests__/harness';
import { createAuthorizer, hasPermission, ROLES, type Role } from '@/data/auth';
import { RepositoryPermissionError } from '@/data/repository';
import type { EntityName } from '@/domain/schema';
import { LANServer } from '@/server/LANServer';

import { hashPassword } from '../auth';
import { ApprovalEngine, applyRbacSchema, RbacError, type RbacService } from '../auth/rbac';

interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

const USERNAME = 'grace.wekesa';
const PASSWORD = 'mwangaza-hub-2027';
const ADMIN = 'first.admin';
const ADMIN_PASSWORD = 'a-first-admin-password-2027';

/** The entities the parity check asks each role about. */
const ENTITIES: readonly EntityName[] = [
  'learner',
  'staff',
  'invoice',
  'payment',
  'mark',
  'institution',
];

let workDir: string;
let databaseFile: string;
let hub: LANServer;
let port: number;
let token: string;
let userId: string;
let learnerId: string;
let institutionId: string;
let rbac: RbacService;

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-rbac-'));
  databaseFile = path.join(workDir, 'schoolpilot.db');

  const seeded = await createTestContext({ database: { kind: 'file', filename: databaseFile } });
  learnerId = seeded.seed.idOf('learner');
  institutionId = seeded.seed.idOf('institution');
  const users = await seeded.repository.list('user', { where: { username: USERNAME } });
  const seededUser = users.items[0];
  if (!seededUser) throw new Error(`the ${USERNAME} fixture was not seeded`);
  userId = seededUser.id;
  await seeded.repository.update(
    'user',
    seededUser.id,
    { password_hash: hashPassword(PASSWORD), status: 'active', mfa: false },
    { expectedVersion: seededUser.rowVersion, actor: seededUser.id, reason: 'test fixture' }
  );

  // A medical record to read, so the field policy has something to withhold.
  const learner = await seeded.repository.get('learner', learnerId as never);
  if (!learner) throw new Error('the seeded learner is missing');
  await seeded.repository.update(
    'learner',
    learner.id,
    { medical: { allergies: ['peanuts'] } },
    { expectedVersion: learner.rowVersion, actor: seededUser.id, reason: 'test fixture' }
  );
  await seeded.close();

  hub = new LANServer({
    dataDir: workDir,
    databaseFile,
    host: '127.0.0.1',
    port: 0,
    rateLimits: false,
  });
  await hub.start();
  port = hub.address?.port ?? 0;
  expect(port).toBeGreaterThan(0);
  rbac = hub.getAuthorisation() as RbacService;

  const login = await request(port, 'POST', '/api/auth/login', { username: USERNAME, password: PASSWORD });
  if (login.status !== 200) {
    throw new Error(`the hub refused the sign-in: ${JSON.stringify(login.body)}`);
  }
  token = (login.body as { token: string }).token;
}, 60000);

afterAll(async () => {
  try {
    if (hub) await hub.stop();
  } finally {
    if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}, 60000);

/** Makes the signed-in account hold exactly these roles; they are read afresh on every request. */
async function holdOnly(roles: readonly Role[]): Promise<void> {
  await rbac.roles.revokeAll(userId);
  await rbac.assignRoles(userId, roles);
}

describe('the hub answers every role as the client permission model does', () => {
  it('matches the client authorizer for list, read, create and remove, for every role', async () => {
    // The rows the client judges are the rows the hub holds, read once as the administrator.
    await holdOnly(['administrator']);
    const rows = new Map<EntityName, Record<string, unknown>>();
    for (const entity of ENTITIES) {
      const page = await request(port, 'GET', `/api/entities/${entity}`, undefined, token);
      expect(page.status, `administrator list ${entity}`).toBe(200);
      const first = (page.body as { items: Array<Record<string, unknown>> }).items[0];
      expect(first, `a seeded ${entity}`).toBeDefined();
      rows.set(entity, first as Record<string, unknown>);
    }

    const mismatches: string[] = [];
    let compared = 0;
    const compare = (label: string, expected: 'allow' | 'deny', response: ApiResponse): void => {
      const actual = response.status === 403 && errorCodeOf(response) === 'permission' ? 'deny' : 'allow';
      compared += 1;
      if (actual !== expected) mismatches.push(`${label}: client ${expected}, hub ${actual} (${response.status})`);
    };

    for (const role of ROLES) {
      // A campus to remove, made by the administrator before the role under test takes over.
      await holdOnly(['administrator']);
      const made = await request(
        port,
        'POST',
        '/api/entities/campus',
        { institution_id: institutionId, name: `Remove ${role}`, is_main: false },
        token
      );
      expect(made.status, 'the administrator makes a campus').toBe(201);
      const toRemove = made.body as Record<string, unknown> & { id: string };

      await holdOnly([role]);
      // The client's own authorizer, over the context resolved from the real assignment data.
      const authorizer = createAuthorizer((await rbac.accessFor({ userId })).context);

      for (const entity of ENTITIES) {
        compare(
          `${role} list ${entity}`,
          clientDecision(authorizer, entity, 'list'),
          await request(port, 'GET', `/api/entities/${entity}`, undefined, token)
        );
        const row = rows.get(entity) as Record<string, unknown> & { id: string };
        compare(
          `${role} read ${entity}`,
          clientDecision(authorizer, entity, 'read', row),
          await request(port, 'GET', `/api/entities/${entity}/${row.id}`, undefined, token)
        );
      }

      const input = { institution_id: institutionId, name: `Create ${role}`, is_main: false };
      compare(
        `${role} create campus`,
        clientDecision(authorizer, 'campus', 'create', input),
        await request(port, 'POST', '/api/entities/campus', input, token)
      );
      compare(
        `${role} remove campus`,
        clientDecision(authorizer, 'campus', 'remove', toRemove),
        await request(port, 'DELETE', `/api/entities/campus/${toRemove.id}`, undefined, token)
      );
    }

    // Four decisions per entity (list, read) and two for the campus, for every role.
    expect(compared).toBe(ROLES.length * (ENTITIES.length * 2 + 2));
    expect(mismatches).toEqual([]);
  }, 180000);

  it('refuses a billing run to every role that does not hold billing.post', async () => {
    const mismatches: string[] = [];
    for (const role of ROLES) {
      await holdOnly([role]);
      const response = await request(port, 'POST', '/api/services/billing/runs', {}, token);
      const denied = response.status === 403 && errorCodeOf(response) === 'permission';
      if (denied === hasPermission([role], 'billing.post')) {
        mismatches.push(`${role}: billing.post held=${hasPermission([role], 'billing.post')}, denied=${denied}`);
      }
    }
    expect(mismatches).toEqual([]);
  }, 60000);

  it('answers a missing permission 403 permission, not a server fault', async () => {
    await holdOnly(['teacher']);
    const response = await request(port, 'POST', '/api/services/billing/runs', {}, token);

    expect(response.status).toBe(403);
    expect(errorCodeOf(response)).toBe('permission');
  });

  it('denies an account that holds no role everything, rather than falling back to everything', async () => {
    await rbac.roles.revokeAll(userId);

    for (const entity of ENTITIES) {
      const response = await request(port, 'GET', `/api/entities/${entity}`, undefined, token);
      expect(response.status, `list ${entity}`).toBe(403);
      expect(errorCodeOf(response)).toBe('permission');
    }
  });
});

describe('restricted fields follow the role', () => {
  it('serves a medical record to a role that may read it and withholds it from one that may not', async () => {
    expect(hasPermission(['nurse'], 'learner.medical.read')).toBe(true);
    expect(hasPermission(['registrar'], 'learner.medical.read')).toBe(false);

    await holdOnly(['nurse']);
    const nurse = await request(port, 'GET', `/api/entities/learner/${learnerId}`, undefined, token);
    expect(nurse.status).toBe(200);
    expect((nurse.body as { medical?: unknown }).medical).toEqual({ allergies: ['peanuts'] });

    await holdOnly(['registrar']);
    const registrar = await request(port, 'GET', `/api/entities/learner/${learnerId}`, undefined, token);
    expect(registrar.status).toBe(200);
    expect((registrar.body as { medical?: unknown }).medical).toBeUndefined();
    // The row itself is still served: the policy withholds the field, not the learner.
    expect((registrar.body as { id: string }).id).toBe(learnerId);
  });
});

describe('the maker-checker engine', () => {
  async function engine(): Promise<{ approvals: ApprovalEngine; close: () => Promise<void> }> {
    const adapter = createNodeSqliteAdapter({ filename: ':memory:' });
    await adapter.open();
    await applyRbacSchema(adapter);
    return { approvals: new ApprovalEngine({ adapter }), close: () => adapter.close() };
  }

  const maker = { id: 'maker-1', roles: ['administrator'] as readonly Role[] };
  const checker = { id: 'checker-1', roles: ['administrator'] as readonly Role[] };

  it('lets a second person decide, and records both of them', async () => {
    const { approvals, close } = await engine();
    try {
      const raised = await approvals.request({
        action: 'mark.change_after_lock',
        entityId: 'mark-1',
        actor: maker,
        reason: 'the script was re-marked',
      });
      expect(raised).toMatchObject({ status: 'pending', requestedBy: 'maker-1' });

      const decided = await approvals.approve({ id: raised.id, actor: checker });
      expect(decided).toMatchObject({ status: 'approved', requestedBy: 'maker-1', decidedBy: 'checker-1' });

      const trail = await approvals.history(raised.id);
      expect(trail.map((event) => [event.kind, event.actorId])).toEqual([
        ['requested', 'maker-1'],
        ['approved', 'checker-1'],
      ]);
    } finally {
      await close();
    }
  });

  it('refuses the maker deciding their own request', async () => {
    const { approvals, close } = await engine();
    try {
      const raised = await approvals.request({ action: 'mark.change_after_lock', entityId: 'mark-1', actor: maker });
      await expect(approvals.approve({ id: raised.id, actor: maker })).rejects.toMatchObject({
        code: 'self_approval',
      });
    } finally {
      await close();
    }
  });

  it('refuses a checker whose roles may not decide it, and a maker who may not raise it', async () => {
    const { approvals, close } = await engine();
    try {
      const raised = await approvals.request({ action: 'mark.change_after_lock', entityId: 'mark-1', actor: maker });
      await expect(
        approvals.approve({ id: raised.id, actor: { id: 'teacher-1', roles: ['teacher'] } })
      ).rejects.toMatchObject({ code: 'permission' });

      await expect(
        approvals.request({ action: 'mark.change_after_lock', entityId: 'mark-2', actor: { id: 'auditor-1', roles: ['auditor'] } })
      ).rejects.toMatchObject({ code: 'permission' });
    } finally {
      await close();
    }
  });

  it('refuses a second decision, a rejection without a reason and an action nobody registered', async () => {
    const { approvals, close } = await engine();
    try {
      const raised = await approvals.request({ action: 'mark.change_after_lock', entityId: 'mark-1', actor: maker });
      await approvals.approve({ id: raised.id, actor: checker });

      await expect(approvals.approve({ id: raised.id, actor: checker })).rejects.toMatchObject({
        code: 'already_decided',
      });

      const second = await approvals.request({ action: 'mark.change_after_lock', entityId: 'mark-3', actor: maker });
      await expect(approvals.reject({ id: second.id, actor: checker, reason: '  ' })).rejects.toMatchObject({
        code: 'reason_required',
      });
      await expect(
        approvals.request({ action: 'delete.everything', entityId: 'x', actor: maker })
      ).rejects.toBeInstanceOf(RbacError);
    } finally {
      await close();
    }
  });
});

describe('the approval API', () => {
  it('raises a request for the signed-in account and refuses that same account deciding it', async () => {
    await holdOnly(['administrator']);

    const raised = await request(
      port,
      'POST',
      '/api/approvals',
      { action: 'mark.change_after_lock', entityId: 'mark-9', reason: 'a late correction' },
      token
    );
    expect(raised.status).toBe(201);
    const record = raised.body as { id: string; requestedBy: string; status: string };
    expect(record).toMatchObject({ requestedBy: userId, status: 'pending' });

    const self = await request(port, 'POST', `/api/approvals/${record.id}/approve`, undefined, token);
    expect(self.status, JSON.stringify(self.body)).toBe(403);
    expect(errorCodeOf(self)).toBe('self_approval');

    const listed = await request(port, 'GET', '/api/approvals', undefined, token);
    expect(listed.status).toBe(200);
    expect((listed.body as { approvals: Array<{ id: string }> }).approvals.map((a) => a.id)).toContain(record.id);
  });

  it('refuses an action the account may not raise, with the permission it lacks', async () => {
    await holdOnly(['auditor']);

    const refused = await request(
      port,
      'POST',
      '/api/approvals',
      { action: 'mark.change_after_lock', entityId: 'mark-9' },
      token
    );
    expect(refused.status).toBe(403);
    expect(errorCodeOf(refused)).toBe('permission');
  });
});

describe('a fresh hub has an administrator', () => {
  it('hands the account that set the hub up the administrator role, so it can act at once', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-rbac-fresh-'));
    const first = new LANServer({ dataDir: dir, host: '127.0.0.1', port: 0, rateLimits: false });
    await first.start();
    const firstPort = first.address?.port ?? 0;
    try {
      const created = await request(firstPort, 'POST', '/api/auth/setup', {
        institution: {
          name: 'Mwangaza Secondary School',
          country: 'KE',
          ownership: 'private',
          gender_policy: 'mixed',
          boarding_policy: 'day',
          default_locale: 'en-KE',
          time_zone: 'Africa/Nairobi',
          base_currency: 'KES',
        },
        username: ADMIN,
        password: ADMIN_PASSWORD,
      });
      expect(created.status).toBe(201);
      const adminToken = (created.body as { token: string }).token;
      const adminId = (created.body as { user: { id: string } }).user.id;

      const institutions = await request(firstPort, 'GET', '/api/entities/institution', undefined, adminToken);
      expect(institutions.status).toBe(200);
      expect(await (first.getAuthorisation() as RbacService).roles.rolesFor(adminId)).toEqual(['administrator']);

      // A restart over the same data: the role is still held, and a role revoked on purpose stays so.
      await first.stop();
      const again = new LANServer({ dataDir: dir, host: '127.0.0.1', port: 0, rateLimits: false });
      await again.start();
      try {
        const service = again.getAuthorisation() as RbacService;
        expect(await service.roles.rolesFor(adminId)).toEqual(['administrator']);

        await service.roles.revokeAll(adminId);
        await service.roles.grant(adminId, 'auditor');
      } finally {
        await again.stop();
      }

      const third = new LANServer({ dataDir: dir, host: '127.0.0.1', port: 0, rateLimits: false });
      await third.start();
      try {
        expect(await (third.getAuthorisation() as RbacService).roles.rolesFor(adminId)).toEqual(['auditor']);
      } finally {
        await third.stop();
      }
    } finally {
      await first.stop().catch(() => undefined);
      await fs.promises.rm(dir, { recursive: true, force: true });
    }
  }, 120000);

  it('restores the administrator of a hub set up before roles existed, once', async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-rbac-legacy-'));
    const first = new LANServer({ dataDir: dir, host: '127.0.0.1', port: 0, rateLimits: false });
    await first.start();
    let adminId = '';
    try {
      const created = await request(first.address?.port ?? 0, 'POST', '/api/auth/setup', {
        institution: {
          name: 'Mwangaza Secondary School',
          country: 'KE',
          ownership: 'private',
          gender_policy: 'mixed',
          boarding_policy: 'day',
          default_locale: 'en-KE',
          time_zone: 'Africa/Nairobi',
          base_currency: 'KES',
        },
        username: ADMIN,
        password: ADMIN_PASSWORD,
      });
      adminId = (created.body as { user: { id: string } }).user.id;
      // A hub that predates roles has the account and no assignment at all.
      await (first.getAuthorisation() as RbacService).roles.revokeAll(adminId);
    } finally {
      await first.stop();
    }

    const second = new LANServer({ dataDir: dir, host: '127.0.0.1', port: 0, rateLimits: false });
    await second.start();
    try {
      expect(await (second.getAuthorisation() as RbacService).roles.rolesFor(adminId)).toEqual(['administrator']);
    } finally {
      await second.stop();
      await fs.promises.rm(dir, { recursive: true, force: true });
    }
  }, 120000);
});

/** The client authorizer's answer, as allow or deny. */
function clientDecision(
  authorizer: ReturnType<typeof createAuthorizer>,
  entity: EntityName,
  action: string,
  row?: Readonly<Record<string, unknown>>
): 'allow' | 'deny' {
  try {
    authorizer({ entity, action: action as never, ...(row === undefined ? {} : { row }) });
    return 'allow';
  } catch (error) {
    if (error instanceof RepositoryPermissionError) return 'deny';
    throw error;
  }
}

/** The error code of a refusal. */
function errorCodeOf(response: ApiResponse): string | undefined {
  const body = response.body as { error?: { code?: string } } | null;
  return body?.error?.code;
}

/** A request against a hub on a port, with an optional JSON body and bearer token. */
function request(
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
