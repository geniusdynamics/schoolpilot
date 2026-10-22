// ABOUTME: Resolves what a signed-in teacher may mark: the teaching groups their assignments name,
// ABOUTME: never a group they are not assigned to. The same answer filters the picker and refuses
// ABOUTME: a write, so hiding a group and refusing its marks are the same decision.

import { MarkEntryError, type TeachingScope } from './types';

export type { TeachingScope } from './types';

/** A staff row, reduced to the link between the login and the person. */
export interface ScopeStaff {
  readonly id: string;
  readonly userId: string | null;
}

/** A teaching group, reduced to the two ways it names its teachers. */
export interface ScopeTeachingGroup {
  readonly id: string;
  readonly teacherIds: readonly string[];
  readonly classGroupIds: readonly string[];
}

/** A teaching assignment, reduced to the group and the window it is effective in. */
export interface ScopeAssignment {
  readonly staffId: string;
  readonly teachingGroupId: string;
  readonly validFrom: string;
  readonly validTo: string | null;
}

/** A class group, reduced to its homeroom teachers. */
export interface ScopeClassGroup {
  readonly id: string;
  readonly homeroomTeacherIds: readonly string[];
}

export interface TeachingScopeInput {
  readonly role: string | null;
  readonly actorId: string;
  readonly staff: readonly ScopeStaff[];
  readonly groups: readonly ScopeTeachingGroup[];
  readonly assignments: readonly ScopeAssignment[];
  readonly classGroups: readonly ScopeClassGroup[];
  /** The date the assignments are judged at; defaults to today. */
  readonly at?: string;
}

/** Roles that reach every group, and may write. */
const INSTITUTION_WRITERS: readonly string[] = [
  'administrator',
  'admin',
  'super_admin',
  'superadmin',
  'head_teacher',
  'headteacher',
  'principal',
];

/** Roles that reach every group but may not write a mark. */
const INSTITUTION_READERS: readonly string[] = ['registrar', 'auditor', 'examinations_officer'];

/** The app's login roles mapped onto the vocabulary above. */
function normaliseRole(role: string | null): string | null {
  if (role === null) return null;
  return role.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function isEffective(assignment: ScopeAssignment, at: string): boolean {
  const from = assignment.validFrom.slice(0, 10);
  if (from > at) return false;
  if (assignment.validTo === null) return true;
  return assignment.validTo.slice(0, 10) >= at;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The scope of the signed-in actor.
 *
 * An administrator or head teacher reaches every group. A teacher reaches the groups their own
 * staff record is assigned to - through `teaching_assignment` or the group's `teacher_ids` - and
 * nothing else: a teacher whose login has no staff record reaches no group at all, rather than
 * every group. A class teacher reaches the groups of their homeroom classes, read-only, because
 * the class-teacher role holds `mark.read` and not `mark.write`.
 */
export function resolveTeachingScope(input: TeachingScopeInput): TeachingScope {
  const role = normaliseRole(input.role);
  const all = new Set(input.groups.map((group) => group.id));

  if (role !== null && INSTITUTION_WRITERS.includes(role)) {
    return {
      groupIds: all,
      staffId: null,
      mode: 'all',
      canWrite: true,
      reason: 'Your role reaches every teaching group.',
    };
  }

  if (role !== null && INSTITUTION_READERS.includes(role)) {
    return {
      groupIds: all,
      staffId: null,
      mode: 'all',
      canWrite: false,
      reason: 'Your role may read marks, not change them.',
    };
  }

  const staff = input.staff.find((row) => row.userId !== null && row.userId === input.actorId);
  const at = (input.at ?? today()).slice(0, 10);

  if (role === 'class_teacher') {
    const homeroom = new Set(
      input.classGroups
        .filter((group) => staff !== undefined && group.homeroomTeacherIds.includes(staff.id))
        .map((group) => group.id)
    );
    const groupIds = new Set(
      input.groups.filter((group) => group.classGroupIds.some((id) => homeroom.has(id))).map((group) => group.id)
    );
    return {
      groupIds,
      staffId: staff?.id ?? null,
      mode: 'class',
      canWrite: false,
      reason:
        staff === undefined
          ? 'No staff record is linked to this login, so no class is reachable.'
          : 'A class teacher may read the marks of their class, not change them.',
    };
  }

  if (staff === undefined) {
    return {
      groupIds: new Set(),
      staffId: null,
      mode: 'teaching',
      canWrite: false,
      reason: 'No staff record is linked to this login, so no teaching group is reachable.',
    };
  }

  const assigned = new Set(
    input.assignments
      .filter((assignment) => assignment.staffId === staff.id && isEffective(assignment, at))
      .map((assignment) => assignment.teachingGroupId)
  );
  const groupIds = new Set(
    input.groups
      .filter((group) => assigned.has(group.id) || group.teacherIds.includes(staff.id))
      .map((group) => group.id)
  );

  return {
    groupIds,
    staffId: staff.id,
    mode: 'teaching',
    canWrite: role === 'teacher',
    reason:
      groupIds.size === 0
        ? 'You are not assigned to a teaching group, so there is nothing to mark.'
        : 'You see the teaching groups you are assigned to.',
  };
}

/** True when the group is inside the scope. */
export function coversGroup(scope: TeachingScope, groupId: string): boolean {
  return scope.groupIds.has(groupId);
}

/**
 * Refuses a group outside the scope.
 *
 * This is the guard the write path calls, so a call that never went through the picker is refused
 * for the same reason a hidden group is never offered.
 */
export function assertGroupInScope(scope: TeachingScope, groupId: string): void {
  if (coversGroup(scope, groupId)) return;
  throw new MarkEntryError(
    'scope',
    'This teaching group is outside your scope, so its marks cannot be changed.'
  );
}

/** Refuses a write the role does not hold. */
export function assertCanWrite(scope: TeachingScope): void {
  if (scope.canWrite) return;
  throw new MarkEntryError('scope', scope.reason);
}
