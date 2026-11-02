// ABOUTME: Tests for the canonical person the header shows: the name comes from the staff or
// ABOUTME: learner behind the user's person_ref, and the role from the school's job title.

import { describe, expect, it } from 'vitest';

import { resolveCanonicalPerson } from '../sessionActor';

describe('resolveCanonicalPerson', () => {
  it('names a staff user from the staff record and roles them by job title', () => {
    const person = resolveCanonicalPerson(
      { username: 'jbarasa', person_ref: { type: 'staff', id: 'staff-1' } },
      {
        staff: { given_name: 'John', family_name: 'Barasa' },
        jobTitle: { name: 'Teacher' },
      },
      'teacher'
    );

    expect(person).toEqual({ displayName: 'John Barasa', roleLabel: 'Teacher' });
  });

  it('prefers a staff preferred name, and falls back to the login role with no job title', () => {
    const person = resolveCanonicalPerson(
      { username: 'jbarasa', person_ref: { type: 'staff', id: 'staff-1' } },
      { staff: { given_name: 'John', preferred_name: 'Johnny', family_name: 'Barasa' } },
      'head_teacher'
    );

    expect(person).toEqual({ displayName: 'Johnny Barasa', roleLabel: 'head teacher' });
  });

  it('names a learner user from the learner record', () => {
    const person = resolveCanonicalPerson(
      { username: 'aotieno', person_ref: { type: 'learner', id: 'learner-1' } },
      { learner: { given_name: 'Amani', family_name: 'Otieno' } },
      'student'
    );

    expect(person.displayName).toBe('Amani Otieno');
  });

  it('falls back to the username when the person record is missing', () => {
    const person = resolveCanonicalPerson(
      { username: 'jbarasa', person_ref: { type: 'staff', id: 'missing' } },
      {},
      null
    );

    expect(person).toEqual({ displayName: 'jbarasa', roleLabel: null });
  });

  it('keeps the username for a user with no person_ref at all', () => {
    expect(resolveCanonicalPerson({ username: 'clerk' }, {}, 'admin').displayName).toBe('clerk');
  });
});
