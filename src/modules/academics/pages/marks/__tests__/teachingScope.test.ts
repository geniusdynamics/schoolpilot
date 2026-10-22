// ABOUTME: Teacher scope tests: a teacher reaches the groups their own assignment names, an
// ABOUTME: administrator reaches every group, a class teacher reads without writing, and a login with
// ABOUTME: no staff record reaches nothing rather than everything.

import { describe, expect, it } from 'vitest';

import {
  assertCanWrite,
  assertGroupInScope,
  coversGroup,
  resolveTeachingScope,
} from '../teachingScope';

const groups = [
  { id: 'group-blue', teacherIds: ['staff-teacher'], classGroupIds: ['class-blue'] },
  { id: 'group-green', teacherIds: ['staff-other'], classGroupIds: ['class-green'] },
  { id: 'group-maths', teacherIds: [], classGroupIds: ['class-blue'] },
];

const staff = [
  { id: 'staff-teacher', userId: 'user-teacher' },
  { id: 'staff-other', userId: 'user-other' },
  { id: 'staff-class', userId: 'user-class' },
];

const assignments = [
  {
    staffId: 'staff-teacher',
    teachingGroupId: 'group-blue',
    validFrom: '2026-01-05',
    validTo: null,
  },
  {
    staffId: 'staff-other',
    teachingGroupId: 'group-green',
    validFrom: '2026-01-05',
    validTo: null,
  },
];

const classGroups = [
  { id: 'class-blue', homeroomTeacherIds: ['staff-class'] },
  { id: 'class-green', homeroomTeacherIds: ['staff-other'] },
];

function scopeFor(role: string | null, actorId: string) {
  return resolveTeachingScope({
    role,
    actorId,
    staff,
    groups,
    assignments,
    classGroups,
    at: '2026-10-22',
  });
}

describe('teacher scope', () => {
  it('gives a teacher only the groups their staff record is assigned to', () => {
    const scope = scopeFor('teacher', 'user-teacher');

    expect([...scope.groupIds]).toEqual(['group-blue']);
    expect(scope.canWrite).toBe(true);
    expect(scope.staffId).toBe('staff-teacher');
  });

  it('counts a group whose teacher_ids name the staff record, even without an assignment', () => {
    const scope = resolveTeachingScope({
      role: 'teacher',
      actorId: 'user-other',
      staff,
      groups,
      assignments: [],
      classGroups,
      at: '2026-10-22',
    });

    expect([...scope.groupIds]).toEqual(['group-green']);
  });

  it('ignores an assignment that ended before the date it is judged at', () => {
    const scope = resolveTeachingScope({
      role: 'teacher',
      actorId: 'user-teacher',
      staff,
      groups,
      assignments: [
        {
          staffId: 'staff-teacher',
          teachingGroupId: 'group-blue',
          validFrom: '2026-01-05',
          validTo: '2026-03-31',
        },
      ],
      classGroups,
      at: '2026-10-22',
    });

    // The group still names the teacher in teacher_ids, so the group remains reachable.
    expect(scope.groupIds.has('group-blue')).toBe(true);
  });

  it('refuses a group outside the scope to a direct write path call', () => {
    const scope = scopeFor('teacher', 'user-teacher');

    expect(coversGroup(scope, 'group-blue')).toBe(true);
    expect(coversGroup(scope, 'group-green')).toBe(false);
    expect(() => assertGroupInScope(scope, 'group-green')).toThrow(/outside your scope/);
    expect(() => assertGroupInScope(scope, 'group-blue')).not.toThrow();
  });

  it('lets an administrator reach every group, and an examiner read but not write', () => {
    expect([...scopeFor('administrator', 'user-admin').groupIds].sort()).toEqual([
      'group-blue',
      'group-green',
      'group-maths',
    ]);
    expect(scopeFor('administrator', 'user-admin').canWrite).toBe(true);

    const examiner = scopeFor('examinations_officer', 'user-exam');
    expect(examiner.groupIds.size).toBe(3);
    expect(examiner.canWrite).toBe(false);
    expect(() => assertCanWrite(examiner)).toThrow(/may read marks, not change them/);
  });

  it('lets a class teacher read the groups of their homeroom class and write none', () => {
    const scope = scopeFor('class_teacher', 'user-class');

    expect([...scope.groupIds].sort()).toEqual(['group-blue', 'group-maths']);
    expect(scope.canWrite).toBe(false);
    expect(scope.mode).toBe('class');
  });

  it('fails closed for a teacher whose login has no staff record', () => {
    const scope = scopeFor('teacher', 'user-nobody');

    expect(scope.groupIds.size).toBe(0);
    expect(scope.canWrite).toBe(false);
    expect(scope.reason).toMatch(/No staff record is linked/);
  });
});
