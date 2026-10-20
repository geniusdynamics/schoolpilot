// ABOUTME: Tests for the admission service over a real repository: one call admits a learner, a
// ABOUTME: failed step leaves nothing behind, and a guardian the school already knows is linked
// ABOUTME: instead of copied.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ChangeEvent } from '@/data/repository';

import { AdmissionService } from '../admissionService';
import {
  closeTestContext,
  createServiceFixture,
  guardianInput,
  learnerInput,
  missingId,
  type ServiceFixture,
} from './helpers';

describe('the admission service', () => {
  let fixture: ServiceFixture;
  let service: AdmissionService;

  beforeAll(async () => {
    fixture = await createServiceFixture();
    service = new AdmissionService({ repository: fixture.repository });
  });

  afterAll(async () => {
    await closeTestContext(fixture.context);
  });

  it('creates the learner, the guardians, the links, the identifiers and the enrolment', async () => {
    const result = await service.admit({
      learner: learnerInput(),
      guardians: [guardianInput({ phones: [{ number: '+254700111222' }] })],
      enrolment: { classGroupId: fixture.classGroupId, startDate: '2027-01-05' },
      identifiers: [{ scheme: 'ke.kemis_upi', value: 'UPI-9001', owner: 'learner' }],
    });

    expect(result.learner.status).toBe('enrolled');
    expect(result.learner.institution_id).toBe(fixture.institutionId);
    expect(result.guardians).toHaveLength(1);
    expect(result.links).toHaveLength(1);
    expect(result.links[0].learner_id).toBe(result.learner.id);
    expect(result.links[0].guardian_id).toBe(result.guardians[0].id);
    expect(result.links[0].is_primary).toBe(true);
    expect(result.identifiers).toHaveLength(1);
    expect(result.identifiers[0].scheme).toBe('ke.kemis_upi');
    expect(result.identifiers[0].owner_id).toBe(result.learner.id);
    expect(result.enrolment.learner_id).toBe(result.learner.id);
    expect(result.enrolment.class_group_id).toBe(fixture.classGroupId);
    expect(result.enrolment.academic_year_id).toBe(fixture.academicYearId);
    expect(result.reusedGuardianIds).toHaveLength(0);
  });

  it('assigns the next admission number', async () => {
    const first = await service.admit({
      learner: learnerInput(),
      guardians: [guardianInput()],
      enrolment: { classGroupId: fixture.classGroupId, startDate: '2027-01-05' },
    });
    const second = await service.admit({
      learner: learnerInput(),
      guardians: [guardianInput()],
      enrolment: { classGroupId: fixture.classGroupId, startDate: '2027-01-05' },
    });

    expect(first.learner.admission_number).toMatch(/^ADM\/2027\/\d{3}$/);
    expect(second.learner.admission_number).not.toBe(first.learner.admission_number);
  });

  it('leaves nothing behind when a step fails inside the transaction', async () => {
    const before = await liveCounts();
    const archivedBefore = await archivedCounts();
    const auditBefore = await auditCounts();
    const events: ChangeEvent[] = [];
    const unsubscribe = fixture.repository.subscribe((event) => events.push(event));

    // The scheme of the identifier is empty, so the identifier cannot be written: the
    // admission fails after the learner, the guardian and the link are already written.
    await expect(
      service.admit({
        learner: learnerInput(),
        guardians: [guardianInput()],
        enrolment: { classGroupId: fixture.classGroupId, startDate: '2027-01-05' },
        identifiers: [{ scheme: '', value: 'UPI-FAIL', owner: 'learner' }],
      })
    ).rejects.toMatchObject({ code: 'validation' });

    unsubscribe();

    // The transaction rolled back: there is no row, not even an archived one.
    expect(await liveCounts()).toEqual(before);
    expect(await archivedCounts()).toEqual(archivedBefore);

    // The audit rows of the writes that joined the transaction rolled back with it.
    expect(await auditCounts()).toEqual(auditBefore);

    // A watcher never saw a change that the transaction rolled back.
    expect(events).toHaveLength(0);
  });

  it('announces the change events of an admission when it commits', async () => {
    const events: ChangeEvent[] = [];
    const unsubscribe = fixture.repository.subscribe((event) => events.push(event));

    await service.admit({
      learner: learnerInput(),
      guardians: [guardianInput()],
      enrolment: { classGroupId: fixture.classGroupId, startDate: '2027-01-05' },
    });

    unsubscribe();

    expect(events.map((event) => event.entity)).toEqual(
      expect.arrayContaining(['learner', 'guardian', 'learner_guardian', 'enrolment'])
    );
  });

  it('links a guardian the school already knows instead of copying it', async () => {
    const phone = '+254700999888';
    const guardiansBefore = await fixture.repository.list('guardian', { limit: 1 });

    const first = await service.admit({
      learner: learnerInput(),
      guardians: [guardianInput({ phones: [{ number: phone }] })],
      enrolment: { classGroupId: fixture.classGroupId, startDate: '2027-01-05' },
    });
    const second = await service.admit({
      learner: learnerInput(),
      guardians: [guardianInput({ phones: [{ number: phone }] })],
      enrolment: { classGroupId: fixture.classGroupId, startDate: '2027-01-05' },
    });

    expect(first.guardians).toHaveLength(1);
    expect(second.guardians).toHaveLength(0);
    expect(second.reusedGuardianIds).toEqual([first.guardians[0].id]);
    expect(second.links[0].guardian_id).toBe(first.guardians[0].id);

    // The second admission copied nobody: the school holds one guardian more than before.
    const guardiansAfter = await fixture.repository.list('guardian', { limit: 1 });
    expect(guardiansAfter.total).toBe(guardiansBefore.total + 1);
  });

  it('links one guardian for two inputs with the same phone', async () => {
    const phone = '+254700777666';

    const result = await service.admit({
      learner: learnerInput(),
      guardians: [
        guardianInput({ phones: [{ number: phone }], relationship: 'mother' }),
        guardianInput({ phones: [{ number: phone }], relationship: 'guardian' }),
      ],
      enrolment: { classGroupId: fixture.classGroupId, startDate: '2027-01-05' },
    });

    // One person, one guardian, one link.
    expect(result.guardians).toHaveLength(1);
    expect(result.links).toHaveLength(1);
    expect(result.links[0].guardian_id).toBe(result.guardians[0].id);
  });

  it('refuses a class group that does not exist', async () => {
    await expect(
      service.admit({
        learner: learnerInput(),
        guardians: [guardianInput()],
        enrolment: {
          classGroupId: missingId<'class_group'>('00000000ff02'),
          startDate: '2027-01-05',
        },
      })
    ).rejects.toMatchObject({ code: 'missing_reference', entity: 'class_group' });
  });

  it('refuses a programme the class group does not belong to', async () => {
    await expect(
      service.admit({
        learner: learnerInput(),
        guardians: [guardianInput()],
        enrolment: {
          classGroupId: fixture.classGroupId,
          startDate: '2027-01-05',
          programmeId: missingId<'programme'>('00000000ff03'),
        },
      })
    ).rejects.toMatchObject({ code: 'invalid_request' });
  });

  /** The number of live rows of the entities an admission writes. */
  async function liveCounts(): Promise<Record<string, number>> {
    const [learner, guardian, link, identifier, enrolment] = await Promise.all([
      fixture.repository.list('learner', { limit: 1 }),
      fixture.repository.list('guardian', { limit: 1 }),
      fixture.repository.list('learner_guardian', { limit: 1 }),
      fixture.repository.list('identifier', { limit: 1 }),
      fixture.repository.list('enrolment', { limit: 1 }),
    ]);
    return {
      learner: learner.total,
      guardian: guardian.total,
      learner_guardian: link.total,
      identifier: identifier.total,
      enrolment: enrolment.total,
    };
  }

  /** The number of rows of the entities an admission writes, archived ones included. */
  async function archivedCounts(): Promise<Record<string, number>> {
    const [learner, guardian, link, identifier, enrolment] = await Promise.all([
      fixture.repository.list('learner', { limit: 1, includeDeleted: true }),
      fixture.repository.list('guardian', { limit: 1, includeDeleted: true }),
      fixture.repository.list('learner_guardian', { limit: 1, includeDeleted: true }),
      fixture.repository.list('identifier', { limit: 1, includeDeleted: true }),
      fixture.repository.list('enrolment', { limit: 1, includeDeleted: true }),
    ]);
    return {
      learner: learner.total,
      guardian: guardian.total,
      learner_guardian: link.total,
      identifier: identifier.total,
      enrolment: enrolment.total,
    };
  }

  /** The number of audit rows of the entities an admission writes. */
  async function auditCounts(): Promise<Record<string, number>> {
    const [learner, guardian, link, identifier, enrolment] = await Promise.all([
      fixture.repository.auditLog({ entity: 'learner' }),
      fixture.repository.auditLog({ entity: 'guardian' }),
      fixture.repository.auditLog({ entity: 'learner_guardian' }),
      fixture.repository.auditLog({ entity: 'identifier' }),
      fixture.repository.auditLog({ entity: 'enrolment' }),
    ]);
    return {
      learner: learner.length,
      guardian: guardian.length,
      learner_guardian: link.length,
      identifier: identifier.length,
      enrolment: enrolment.length,
    };
  }
});
