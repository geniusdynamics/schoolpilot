// ABOUTME: Unit tests for the guardian service: creating/updating guardian + relationship rows for a learner.
// ABOUTME: Also covers read-time resolution of a learner's primary guardian (relationship first, legacy copy last).

import { describe, it, expect, vi } from 'vitest';
import {
  saveStudentGuardian,
  resolvePrimaryGuardian,
  findPrimaryRelationship,
  type GuardianRecord,
  type GuardianRelationshipRecord,
  type GuardianStore,
} from '../guardianService';

const NOW = '2027-01-10T08:00:00.000Z';

function makeStore(existingRelationships: GuardianRelationshipRecord[] = []) {
  const guardians = { insert: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined) };
  const relationships = { insert: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined) };
  const store: GuardianStore = { guardians, relationships, existingRelationships };
  return { store, guardians, relationships };
}

function idSequence(...ids: string[]) {
  let i = 0;
  return () => ids[i++] ?? `id-${i}`;
}

describe('saveStudentGuardian', () => {
  it('creates a guardian row and a primary relationship row for a new learner', async () => {
    const { store, guardians, relationships } = makeStore();

    const saved = await saveStudentGuardian(
      store,
      'stu-uuid-1',
      { name: '  Probe Guardian ', phone: '0700000000', relationship_type: 'Mother' },
      { now: () => NOW, newId: idSequence('g-new', 'rel-new') },
    );

    expect(saved).toEqual({ guardianId: 'g-new', relationshipId: 'rel-new' });
    expect(guardians.insert).toHaveBeenCalledWith({
      id: 'g-new',
      name: 'Probe Guardian',
      phone: '0700000000',
      relationship_type: 'Mother',
      created_at: NOW,
      updated_at: NOW,
    });
    expect(relationships.insert).toHaveBeenCalledWith({
      id: 'rel-new',
      student_id: 'stu-uuid-1',
      guardian_id: 'g-new',
      relationship_type: 'Mother',
      is_primary: true,
      can_pickup: true,
      receives_communication: true,
      created_at: NOW,
      updated_at: NOW,
    });
    expect(guardians.update).not.toHaveBeenCalled();
    expect(relationships.update).not.toHaveBeenCalled();
  });

  it('writes nothing when no guardian name was entered', async () => {
    const { store, guardians, relationships } = makeStore();

    expect(await saveStudentGuardian(store, 'stu-1', { name: '   ', relationship_type: 'Mother' })).toBeNull();
    expect(await saveStudentGuardian(store, 'stu-1', undefined)).toBeNull();

    expect(guardians.insert).not.toHaveBeenCalled();
    expect(relationships.insert).not.toHaveBeenCalled();
  });

  it('updates the existing guardian and its relationship on edit instead of duplicating them', async () => {
    const existing: GuardianRelationshipRecord = {
      id: 'rel-1', student_id: 'stu-1', guardian_id: 'g-1', relationship_type: 'Guardian', is_primary: true,
    };
    const { store, guardians, relationships } = makeStore([existing]);

    const saved = await saveStudentGuardian(
      store,
      'stu-1',
      { id: 'g-1', name: 'Jane Doe', phone: '0711', relationship_type: 'Mother' },
      { now: () => NOW },
    );

    expect(saved).toEqual({ guardianId: 'g-1', relationshipId: 'rel-1' });
    expect(guardians.update).toHaveBeenCalledWith('g-1', {
      name: 'Jane Doe', phone: '0711', relationship_type: 'Mother', updated_at: NOW,
    });
    expect(relationships.update).toHaveBeenCalledWith('rel-1', {
      guardian_id: 'g-1', relationship_type: 'Mother', is_primary: true, updated_at: NOW,
    });
    expect(guardians.insert).not.toHaveBeenCalled();
    expect(relationships.insert).not.toHaveBeenCalled();
  });

  it('adds a guardian on edit for a learner who had none, keeping UUID student ids intact', async () => {
    const studentId = '874b9758-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
    const { store, relationships } = makeStore([
      { id: 'rel-other', student_id: 'someone-else', guardian_id: 'g-9', relationship_type: 'Father', is_primary: true },
    ]);

    await saveStudentGuardian(store, studentId, { name: 'New Guardian', relationship_type: 'Father' }, {
      now: () => NOW, newId: idSequence('g-2', 'rel-2'),
    });

    expect(relationships.insert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'rel-2', student_id: studentId, guardian_id: 'g-2', is_primary: true,
    }));
    expect(relationships.update).not.toHaveBeenCalled();
  });

  it('requires a student id', async () => {
    const { store } = makeStore();
    await expect(saveStudentGuardian(store, '', { name: 'X', relationship_type: 'Mother' })).rejects.toThrow(/student id/);
  });
});

describe('findPrimaryRelationship', () => {
  it('prefers the primary link (including the legacy is_primary_contact flag) over other links', () => {
    const rels: GuardianRelationshipRecord[] = [
      { id: 'a', student_id: 's', guardian_id: 'g1', relationship_type: 'Father', is_primary: false },
      { id: 'b', student_id: 's', guardian_id: 'g2', relationship_type: 'Mother', is_primary_contact: 'true' },
    ];
    expect(findPrimaryRelationship('s', rels)?.id).toBe('b');
  });

  it('falls back to the first link when none is flagged primary', () => {
    const rels: GuardianRelationshipRecord[] = [
      { id: 'a', student_id: 's', guardian_id: 'g1', relationship_type: 'Father' },
    ];
    expect(findPrimaryRelationship('s', rels)?.id).toBe('a');
    expect(findPrimaryRelationship('other', rels)).toBeUndefined();
  });
});

describe('resolvePrimaryGuardian', () => {
  const guardian: GuardianRecord = { id: 'g-1', name: 'Probe Guardian', phone: '0700', relationship_type: 'Guardian' };
  const guardiansById = new Map([[guardian.id, guardian]]);

  it('resolves the guardian through the relationship rows', () => {
    const rels: GuardianRelationshipRecord[] = [
      { id: 'r', student_id: 'stu-1', guardian_id: 'g-1', relationship_type: 'Mother', is_primary: true },
    ];
    expect(resolvePrimaryGuardian({ id: 'stu-1' }, rels, guardiansById)).toEqual({
      id: 'g-1', name: 'Probe Guardian', phone: '0700', relationship_type: 'Mother',
    });
  });

  it('falls back to the legacy embedded copy only when no relationship exists', () => {
    const student = { id: 'stu-2', primary_guardian: { id: 'legacy-x', name: 'Old Copy', phone: '1', relationship_type: 'Father' } };
    expect(resolvePrimaryGuardian(student, [], guardiansById)).toEqual({
      id: '', name: 'Old Copy', phone: '1', relationship_type: 'Father',
    });
    expect(resolvePrimaryGuardian({ id: 'stu-3' }, [], guardiansById)).toBeNull();
  });

  it('keeps the legacy guardian id when that guardian row exists', () => {
    const student = { id: 'stu-2', primary_guardian: { id: 'g-1', name: 'Probe Guardian' } };
    expect(resolvePrimaryGuardian(student, [], guardiansById)?.id).toBe('g-1');
  });
});
