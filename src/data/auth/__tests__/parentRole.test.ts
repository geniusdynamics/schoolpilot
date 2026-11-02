// ABOUTME: The parent role's shape: the reads of their children's school life, and nothing that
// ABOUTME: writes, scopes, or touches restricted data. The catalogue is otherwise compile-checked.

import { describe, expect, it } from 'vitest';

import { PERMISSIONS, ROLES, ROLE_PERMISSIONS, ROLE_SCOPE_KINDS } from '../roles';

describe('the parent role', () => {
  it('holds reads only: no write, no finance duty, no workflow management', () => {
    const parent = ROLE_PERMISSIONS.parent;
    expect(parent.length).toBeGreaterThan(0);
    expect(parent.every((permission) => permission.endsWith('.read'))).toBe(true);
    expect(parent).not.toContain('workflow.manage');
    expect(parent.some((permission) => PERMISSIONS.includes(permission as never))).toBe(true);
  });

  it('does not hold the restricted medical record (spec 06 §8.1)', () => {
    expect(ROLE_PERMISSIONS.parent).not.toContain('learner.medical.read');
  });

  it('reaches no canonical scope: the portal scopes a parent to their children instead', () => {
    expect(ROLE_SCOPE_KINDS.parent).toEqual([]);
  });

  it('is part of the catalogue the compile-checked maps cover', () => {
    expect(ROLES).toContain('parent');
    expect(Object.keys(ROLE_PERMISSIONS)).toContain('parent');
    expect(Object.keys(ROLE_SCOPE_KINDS)).toContain('parent');
  });
});
