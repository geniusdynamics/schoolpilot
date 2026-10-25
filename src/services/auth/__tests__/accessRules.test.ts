// ABOUTME: Who holds a permission and which user rows are active are decided by two pure functions, so the route
// ABOUTME: guard, the auth service and the Settings pages cannot disagree about the signed-in administrator.

import { describe, expect, it } from 'vitest';

import { SUPER_ADMIN_ROLE, isUserRowActive, userHasPermission } from '@/services/auth/accessRules';

describe('userHasPermission', () => {
  it('holds nothing when nobody is signed in', () => {
    expect(userHasPermission(null, 'settings.view')).toBe(false);
    expect(userHasPermission(undefined, 'settings.view')).toBe(false);
  });

  it('gives a super administrator every permission, listed or not', () => {
    const superAdmin = { role: SUPER_ADMIN_ROLE, permissions: [] };

    expect(userHasPermission(superAdmin, 'settings.view')).toBe(true);
    expect(userHasPermission(superAdmin, 'settings.workflows.manage_states')).toBe(true);
    expect(userHasPermission(superAdmin, 'a.permission.nobody.declared')).toBe(true);
  });

  it('gives a user holding the wildcard every permission', () => {
    expect(userHasPermission({ role: 'administrator', permissions: ['*'] }, 'modules.manage')).toBe(true);
  });

  it('gives anyone else exactly the permissions they were granted', () => {
    const teacher = { role: 'teacher', permissions: ['settings.view'] };

    expect(userHasPermission(teacher, 'settings.view')).toBe(true);
    expect(userHasPermission(teacher, 'settings.manage')).toBe(false);
  });

  it('treats a user with no permission list as holding none', () => {
    expect(userHasPermission({ role: 'teacher' }, 'settings.view')).toBe(false);
  });
});

describe('isUserRowActive', () => {
  it('reads the schema column is_active', () => {
    expect(isUserRowActive({ is_active: true })).toBe(true);
    expect(isUserRowActive({ is_active: 1 })).toBe(true);
    expect(isUserRowActive({ is_active: '1' })).toBe(true);
    expect(isUserRowActive({ is_active: false })).toBe(false);
    expect(isUserRowActive({ is_active: 0 })).toBe(false);
  });

  it('reads the older isActive when is_active is absent', () => {
    expect(isUserRowActive({ isActive: true })).toBe(true);
    expect(isUserRowActive({ isActive: false })).toBe(false);
  });

  it('prefers is_active over isActive', () => {
    expect(isUserRowActive({ is_active: false, isActive: true })).toBe(false);
  });

  it('calls a row that says nothing inactive: a login that is not marked active cannot sign in', () => {
    expect(isUserRowActive({})).toBe(false);
  });
});
