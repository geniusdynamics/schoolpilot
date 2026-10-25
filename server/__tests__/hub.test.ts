// ABOUTME: The hub proved end to end: a domain service admitted through HTTP against a real SQLite
// ABOUTME: file, the same service run in-process over an identical file, and the results compared.

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter } from '@/data/adapters/sqlite';
import { createRepository, type Page, type RepositoryRow } from '@/data/repository';
import { createTestContext, TEST_ACTOR } from '@/data/__tests__/harness';
import type { Id } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';
import { AdmissionService, type AdmissionInput, type AdmissionResult } from '@/domain/services';
import { LANServer } from '@/server/LANServer';

import { hashPassword } from '../auth';
import { grantRoles } from './helpers/authorisation';

interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

/** The seeded account the hub signs in as. */
const USERNAME = 'grace.wekesa';
const PASSWORD = 'mwangaza-hub-2027';

let workDir: string;
let databaseFile: string;
let inProcessFile: string;
let hub: LANServer;
let port: number;
/** The bearer token every request after the sign-in carries. */
let token: string | undefined;
let userId: string;
let classGroupId: Id<'class_group'>;
let staffId: Id<'staff'>;
let periodId: Id<'academic_period'>;
let academicYearId: Id<'academic_year'>;
let institutionId: Id<'institution'>;
let httpAdmission: AdmissionResult;

/** The admission both sides run: the same input, the same seeded class group, the same actor. */
const admission = (): AdmissionInput => ({
  learner: {
    givenName: 'Amani',
    familyName: 'Njeri',
    nameOrder: 'given_first',
    gender: 'female',
    dateOfBirth: '2014-03-04',
    phones: [{ number: '+254712345678', label: 'parent' }],
    admissionDate: '2027-01-05',
    residenceStatus: 'day',
  },
  guardians: [
    {
      givenName: 'Grace',
      familyName: 'Njeri',
      nameOrder: 'given_first',
      gender: 'female',
      relationship: 'mother',
      isPrimary: true,
      phones: [{ number: '+254798765432', label: 'mobile' }],
    },
  ],
  enrolment: {
    classGroupId,
    startDate: '2027-01-05',
    entryReason: 'new_admission',
  },
  identifiers: [{ scheme: 'ke.kemis_upi', value: 'UPI-HUB-0001', owner: 'learner' }],
});

beforeAll(async () => {
  workDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'schoolpilot-hub-'));
  databaseFile = path.join(workDir, 'schoolpilot.db');

  // A real SQLite file, seeded through the same repository the browser uses.
  const seeded = await createTestContext({
    database: { kind: 'file', filename: databaseFile },
  });
  classGroupId = seeded.seed.idOf('class_group');
  staffId = seeded.seed.idOf('staff');
  periodId = seeded.seed.idOf('academic_period');
  academicYearId = seeded.seed.idOf('academic_year');
  institutionId = seeded.seed.idOf('institution');

  // The fixture user's password hash is a placeholder; the hub needs one it can verify.
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
  // The hub denies an account that holds no role.
  await grantRoles(seeded.adapter, seededUser.id);
  await seeded.close();

  // The in-process run starts from the same file: a copy of the seeded database, taken before
  // the hub writes anything, so both runs see exactly the same world.
  inProcessFile = path.join(workDir, 'in-process.db');
  await fs.promises.copyFile(databaseFile, inProcessFile);

  hub = new LANServer({
    dataDir: workDir,
    databaseFile,
    host: '127.0.0.1',
    port: 0,
  });
  await hub.start();
  port = hub.address?.port ?? 0;
  expect(port).toBeGreaterThan(0);

  const login = await api('POST', '/api/auth/login', { username: USERNAME, password: PASSWORD });
  if (login.status !== 200) {
    throw new Error(`the hub refused the sign-in: ${JSON.stringify(login.body)}`);
  }
  token = (login.body as { token: string }).token;

  const response = await api('POST', '/api/services/admissions', admission());
  if (response.status !== 201) {
    throw new Error(`the hub refused the admission: ${JSON.stringify(response.body)}`);
  }
  httpAdmission = response.body as AdmissionResult;
}, 60000);

afterAll(async () => {
  try {
    if (hub) await hub.stop();

    if (!httpAdmission) return;

    // The proof that the hub wrote the row to the file, not to a memory of it.
    const disk = createNodeSqliteAdapter({ filename: databaseFile, foreignKeys: true });
    await disk.open();
    try {
      const rows = await disk.all<{ id: string; admission_number: string; family_name: string }>(
        'SELECT id, admission_number, family_name FROM learner WHERE admission_number = ?',
        [httpAdmission.learner.admission_number]
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.family_name).toBe('Njeri');
    } finally {
      await disk.close();
    }
  } finally {
    if (workDir) await fs.promises.rm(workDir, { recursive: true, force: true });
  }
}, 60000);

describe('the hub over a SQLite file', () => {
  it('admits a learner through an HTTP endpoint', () => {
    expect(httpAdmission.learner.given_name).toBe('Amani');
    expect(httpAdmission.learner.admission_number).toMatch(/^ADM\/\d{4}\/\d{3}$/);
    expect(httpAdmission.learner.institution_id).toBe(institutionId);
    expect(httpAdmission.guardians).toHaveLength(1);
    expect(httpAdmission.guardians[0]?.family_name).toBe('Njeri');
    expect(httpAdmission.links).toHaveLength(1);
    expect(httpAdmission.links[0]?.relationship).toBe('mother');
    expect(httpAdmission.links[0]?.is_primary).toBe(true);
    expect(httpAdmission.identifiers).toHaveLength(1);
    expect(httpAdmission.identifiers[0]?.value).toBe('UPI-HUB-0001');
    expect(httpAdmission.enrolment.class_group_id).toBe(classGroupId);
  });

  it('reads the admitted learner and the rows the admission created back over HTTP', async () => {
    const learner = await api('GET', `/api/entities/learner/${httpAdmission.learner.id}`);
    expect(learner.status).toBe(200);
    expect(bodyOf<RepositoryRow<'learner'>>(learner).given_name).toBe('Amani');
    expect(bodyOf<RepositoryRow<'learner'>>(learner).rowVersion).toBe(1);

    const enrolments = await listOf('enrolment', {
      learner_id: httpAdmission.learner.id,
    });
    expect(enrolments.items).toHaveLength(1);
    expect(enrolments.items[0]?.class_group_id).toBe(classGroupId);
    expect(enrolments.items[0]?.academic_year_id).toBe(academicYearId);

    const links = await listOf('learner_guardian', {
      learner_id: httpAdmission.learner.id,
    });
    expect(links.items).toHaveLength(1);
    expect(links.items[0]?.guardian_id).toBe(httpAdmission.guardians[0]?.id);

    const identifiers = await listOf('identifier', {
      owner_id: httpAdmission.learner.id,
    });
    expect(identifiers.items).toHaveLength(1);
    expect(identifiers.items[0]?.scheme).toBe('ke.kemis_upi');

    const audit = await api('GET', `/api/entities/learner/${httpAdmission.learner.id}/audit`);
    expect(audit.status).toBe(200);
    const events = bodyOf<{ events: Array<{ action: string; reason: string | null; actorId: string | null }> }>(
      audit
    ).events;
    expect(events.some((event) => event.action === 'create' && event.reason === 'learner admitted')).toBe(
      true
    );
    // The write is stamped with the user behind the bearer token, not with a trusted header.
    expect(events.every((event) => event.actorId === userId)).toBe(true);
  });

  it('produces the same result when the same service runs in-process', async () => {
    const adapter = createNodeSqliteAdapter({ filename: inProcessFile, foreignKeys: true });
    await adapter.open();
    try {
      const repository = createRepository({ adapter, actor: TEST_ACTOR });
      await repository.setup();

      // No HTTP, no harness, no server: the browser's own service over the browser's own repository.
      const direct = await new AdmissionService({
        repository,
        actor: TEST_ACTOR,
      }).admit(admission());

      expect(canonical(shapeOf(direct))).toEqual(canonical(shapeOf(httpAdmission)));

      // And the same rows landed: the admission number is derived, not sent, so this is the
      // service's own decision matching on both sides.
      const stored = await repository.get('learner', direct.learner.id);
      expect(stored?.admission_number).toBe(httpAdmission.learner.admission_number);
      expect(stored?.family_name).toBe(httpAdmission.learner.family_name);
    } finally {
      await adapter.close();
    }
  });

  it('serves the typed repository API: list, create, patch and refuse a stale write', async () => {
    const entities = await api('GET', '/api/entities');
    expect(bodyOf<{ entities: string[] }>(entities).entities).toContain('learner');

    const created = await api('POST', '/api/entities/learner', {
      institution_id: institutionId,
      given_name: 'Api',
      family_name: 'Created',
      name_order: 'given_first',
      gender: 'not_stated',
      admission_number: 'ADM/API/001',
      status: 'enrolled',
      residence_status: 'day',
    });
    expect(created.status).toBe(201);
    const row = bodyOf<RepositoryRow<'learner'>>(created);
    expect(row.rowVersion).toBe(1);

    const patched = await api('PATCH', `/api/entities/learner/${row.id}`, {
      expectedVersion: row.rowVersion,
      patch: { family_name: 'Patched' },
      reason: 'the family name was corrected',
    });
    expect(patched.status).toBe(200);
    expect(bodyOf<RepositoryRow<'learner'>>(patched).family_name).toBe('Patched');
    expect(bodyOf<RepositoryRow<'learner'>>(patched).rowVersion).toBe(2);

    const stale = await api('PATCH', `/api/entities/learner/${row.id}`, {
      expectedVersion: 1,
      patch: { family_name: 'Stale' },
    });
    expect(stale.status).toBe(409);
    expect(errorCodeOf(stale)).toBe('stale_version');

    const unknown = await api('GET', '/api/entities/unicorn');
    expect(unknown.status).toBe(404);
    expect(errorCodeOf(unknown)).toBe('unknown_entity');

    const invalid = await api('POST', '/api/entities/learner', {});
    expect(invalid.status).toBe(400);
    expect(errorCodeOf(invalid)).toBe('validation');
  });

  it('runs the attendance service: opens a register and marks the admitted learner', async () => {
    const opened = await api('POST', '/api/services/attendance/registers', {
      scope: { kind: 'class_group', id: classGroupId },
      date: '2027-02-01',
      session: 'am',
      takenBy: staffId,
      takenAt: '2027-02-01T07:30:00.000Z',
    });
    expect(opened.status).toBe(200);
    const register = bodyOf<RepositoryRow<'attendance_session'>>(opened);
    expect(register.class_group_id).toBe(classGroupId);
    expect(register.academic_period_id).toBe(periodId);

    const marked = await api('POST', '/api/services/attendance/marks', {
      sessionId: register.id,
      learnerId: httpAdmission.learner.id,
      status: 'present',
    });
    expect(marked.status).toBe(201);
    expect(bodyOf<RepositoryRow<'attendance_mark'>>(marked).learner_id).toBe(httpAdmission.learner.id);

    const marks = await api('GET', `/api/services/attendance/registers/${register.id}/marks`);
    expect(bodyOf<{ marks: unknown[] }>(marks).marks).toHaveLength(1);

    const duplicate = await api('POST', '/api/services/attendance/marks', {
      sessionId: register.id,
      learnerId: httpAdmission.learner.id,
      status: 'present',
    });
    expect(duplicate.status).toBe(409);
    expect(errorCodeOf(duplicate)).toBe('duplicate');
  });

  it('runs the billing-run service over the repository as its store', async () => {
    const preview = await api('POST', '/api/services/billing/preview', {
      scope: { periodId },
    });
    expect(preview.status).toBe(200);
    const body = bodyOf<{
      key: string;
      periodId: string;
      lines: unknown[];
      totals: { learnersInScope: number };
    }>(preview);
    expect(body.periodId).toBe(periodId);
    expect(typeof body.key).toBe('string');
    expect(Array.isArray(body.lines)).toBe(true);
    expect(body.totals.learnersInScope).toBeGreaterThan(0);
  });
});

/** A request against the running hub, carrying the session the suite signed in with. */
function api(method: string, pathname: string, body?: unknown): Promise<ApiResponse> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise<ApiResponse>((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        path: pathname,
        method,
        headers: {
          ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
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

/** The JSON body of a response, typed by the caller. */
function bodyOf<T>(response: ApiResponse): T {
  return response.body as T;
}

/** The error code of a refusal. */
function errorCodeOf(response: ApiResponse): string | undefined {
  const body = response.body as { error?: { code?: string } } | null;
  return body?.error?.code;
}

/** A page of one entity, filtered by equality. */
async function listOf<E extends EntityName>(
  entity: E,
  where: Readonly<Record<string, unknown>>
): Promise<Page<RepositoryRow<E>>> {
  const query = new URLSearchParams({ where: JSON.stringify(where) });
  const response = await api('GET', `/api/entities/${entity}?${query.toString()}`);
  expect(response.status).toBe(200);
  return bodyOf<Page<RepositoryRow<E>>>(response);
}

/**
 * The parts of an admission the service decides, without the ids and timestamps that are
 * generated per run: the learner, the guardians, the links, the identifiers and the enrolment.
 */
function shapeOf(result: AdmissionResult) {
  return {
    admissionNumber: result.learner.admission_number,
    learner: {
      institution_id: result.learner.institution_id,
      given_name: result.learner.given_name,
      family_name: result.learner.family_name,
      name_order: result.learner.name_order,
      gender: result.learner.gender,
      date_of_birth: result.learner.date_of_birth,
      status: result.learner.status,
      residence_status: result.learner.residence_status,
    },
    guardians: result.guardians
      .map((guardian) => ({
        institution_id: guardian.institution_id,
        given_name: guardian.given_name,
        family_name: guardian.family_name,
        name_order: guardian.name_order,
      }))
      .sort(byJson),
    links: result.links
      .map((link) => ({
        relationship: link.relationship,
        is_primary: link.is_primary,
        has_parental_responsibility: link.has_parental_responsibility,
        is_fee_payer: link.is_fee_payer,
        preferred_channel: link.preferred_channel,
      }))
      .sort(byJson),
    identifiers: result.identifiers
      .map((identifier) => ({
        owner_type: identifier.owner_type,
        scheme: identifier.scheme,
        value: identifier.value,
      }))
      .sort(byJson),
    enrolment: {
      institution_id: result.enrolment.institution_id,
      class_group_id: result.enrolment.class_group_id,
      academic_year_id: result.enrolment.academic_year_id,
      level_id: result.enrolment.level_id,
      programme_id: result.enrolment.programme_id,
      start_date: result.enrolment.start_date,
      status: result.enrolment.status,
      entry_reason: result.enrolment.entry_reason,
    },
  };
}

/** Normalises a value the way the HTTP boundary does, so both sides compare alike. */
function canonical(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

/** Sorts objects by their JSON text, so set-like comparisons do not depend on write order. */
function byJson(left: unknown, right: unknown): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}
