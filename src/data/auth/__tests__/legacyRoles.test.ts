// ABOUTME: Proves every legacy login role the app can sign in maps to canonical roles, and that an
// ABOUTME: unknown or learner role maps to none rather than to something privileged.

import { describe, expect, it } from 'vitest';

import { canonicalRolesFor, isKnownLegacyRole } from '../legacyRoles';

describe('the legacy login role map', () => {
  it('gives the superuser every administrator permission', () => {
    expect(canonicalRolesFor('super_admin')).toEqual(['administrator']);
    expect(canonicalRolesFor('admin')).toEqual(['administrator']);
  });

  it('maps the finance login to the bursar, not to an approver', () => {
    expect(canonicalRolesFor('finance')).toEqual(['bursar']);
    expect(canonicalRolesFor('finance_officer')).toEqual(['bursar']);
  });

  it('keeps a teacher a teacher and adds the class teacher of their homeroom', () => {
    expect(canonicalRolesFor('teacher')).toEqual(['teacher']);
    expect(canonicalRolesFor('class_teacher')).toEqual(['class_teacher', 'teacher']);
  });

  it('maps a learner to no role, so a learner login reads and cannot write', () => {
    expect(canonicalRolesFor('student')).toEqual([]);
    expect(canonicalRolesFor('learner')).toEqual([]);
  });

  it('maps an unknown role to none, and says so, rather than guessing', () => {
    expect(canonicalRolesFor('library_prefect')).toEqual([]);
    expect(isKnownLegacyRole('library_prefect')).toBe(false);
    expect(isKnownLegacyRole('teacher')).toBe(true);
  });

  it('reads the role however it is written', () => {
    expect(canonicalRolesFor('Head Teacher')).toEqual(['head_teacher']);
    expect(canonicalRolesFor('  FINANCE-OFFICER ')).toEqual(['bursar']);
    expect(canonicalRolesFor(null)).toEqual([]);
  });

  it('treats full module access as the administrator whatever the role string says', () => {
    expect(canonicalRolesFor('custom', ['*'])).toEqual(['administrator']);
  });
});
