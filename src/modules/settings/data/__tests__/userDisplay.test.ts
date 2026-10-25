// ABOUTME: How a login row reads on a settings page: active or not, which role it holds, whether it administers
// ABOUTME: the school. A row carries the schema's snake_case columns (is_active, role_id) or the older camelCase.

import { describe, expect, it } from 'vitest';

import {
  countActiveUsers,
  countAdministrators,
  isAdministratorRow,
  userRoleLabel,
  userStatusLabel,
} from '../userDisplay';

/** The first administrator, exactly as the setup wizard writes it. */
const wizardAdmin = {
  id: 'u1',
  username: 'principal',
  role: 'super_admin',
  role_id: 'super_admin',
  is_active: true,
};

describe('userStatusLabel', () => {
  it('reads is_active, the schema column', () => {
    expect(userStatusLabel({ is_active: true })).toBe('Active');
    expect(userStatusLabel({ is_active: 1 })).toBe('Active');
    expect(userStatusLabel({ is_active: false })).toBe('Inactive');
  });

  it('reads the older isActive', () => {
    expect(userStatusLabel({ isActive: true })).toBe('Active');
  });

  it('calls a row that says nothing inactive, as the sign-in does', () => {
    expect(userStatusLabel({})).toBe('Inactive');
  });
});

describe('userRoleLabel', () => {
  const roles = [
    { id: 'r-teacher', name: 'Teacher' },
    { id: 7, name: 'Bursar' },
  ];

  it('shows the name of the role the row points at', () => {
    expect(userRoleLabel({ role_id: 'r-teacher' }, roles)).toBe('Teacher');
  });

  it('matches a numeric role id against the same id as text, and the other way round', () => {
    expect(userRoleLabel({ role_id: '7' }, roles)).toBe('Bursar');
    expect(userRoleLabel({ role_id: 7 }, [{ id: '7', name: 'Bursar' }])).toBe('Bursar');
  });

  it('says a system role in words when no named role matches', () => {
    expect(userRoleLabel(wizardAdmin, roles)).toBe('Super admin');
    expect(userRoleLabel({ role: 'finance_officer' }, roles)).toBe('Finance officer');
  });

  it('is empty for a row with no role at all', () => {
    expect(userRoleLabel({}, roles)).toBe('');
  });
});

describe('isAdministratorRow', () => {
  it('is true for the super administrator and for an administrator', () => {
    expect(isAdministratorRow(wizardAdmin)).toBe(true);
    expect(isAdministratorRow({ role: 'administrator' })).toBe(true);
    expect(isAdministratorRow({ role_id: 'administrator' })).toBe(true);
  });

  it('is false for everyone else', () => {
    expect(isAdministratorRow({ role: 'teacher' })).toBe(false);
    expect(isAdministratorRow({})).toBe(false);
  });
});

describe('the counts', () => {
  const rows = [
    wizardAdmin,
    { id: 'u2', username: 'ann', role: 'teacher', is_active: true },
    { id: 'u3', username: 'bob', role: 'teacher', is_active: false },
    { id: 'u4', username: 'cy', role: 'administrator', isActive: true },
  ];

  it('counts the active logins', () => {
    expect(countActiveUsers(rows)).toBe(3);
  });

  it('counts the administrators, the school\'s first one included', () => {
    expect(countAdministrators(rows)).toBe(2);
  });
});
