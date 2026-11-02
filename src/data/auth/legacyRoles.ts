// ABOUTME: Maps the legacy login's role string onto the canonical role catalogue, so the browser can
// ABOUTME: judge a write against roles the permission model actually knows.

import type { Role } from './roles';

/**
 * The canonical roles a legacy login role stands for.
 *
 * The login lives in the legacy `users` collection and carries one flat role string; the canonical
 * model names eleven roles. The map is deliberately conservative: it grants the role that does the
 * job today and nothing more, because every entry here is a role whose permissions now apply.
 *
 * `finance` and `finance_officer` map to `bursar` rather than `accountant`: the school's finance
 * login is the person who takes money and posts it, and `accountant` holds the approval half of
 * the maker/checker pairs (`fee_schedule.approve`, `payment.void`), which a maker must not hold.
 * `student` maps to no role: the canonical catalogue has no learner role, and a login with no role
 * holds no permission.
 */
const LEGACY_ROLE_MAP: Readonly<Record<string, readonly Role[]>> = {
  super_admin: ['administrator'],
  superadmin: ['administrator'],
  admin: ['administrator'],
  administrator: ['administrator'],
  head_teacher: ['head_teacher'],
  headteacher: ['head_teacher'],
  head: ['head_teacher'],
  principal: ['head_teacher'],
  deputy: ['head_teacher'],
  registrar: ['registrar'],
  admissions: ['registrar'],
  teacher: ['teacher'],
  class_teacher: ['class_teacher', 'teacher'],
  exams_officer: ['teacher'],
  librarian: ['teacher'],
  finance: ['bursar'],
  finance_officer: ['bursar'],
  bursar: ['bursar'],
  accountant: ['accountant'],
  accounts_clerk: ['accounts_clerk'],
  cashier: ['accounts_clerk'],
  nurse: ['nurse'],
  auditor: ['auditor'],
  parent: ['parent'],
  guardian: ['parent'],
  student: [],
  learner: [],
};

/**
 * The canonical roles of a legacy login.
 *
 * An unknown role resolves to none, so a custom login keeps reading and cannot write until the
 * school gives it a role the model knows. The one exception is a login whose module access is `*`:
 * that is a superuser whatever its role string says, and it maps to the administrator.
 */
export function canonicalRolesFor(
  legacyRole: string | null | undefined,
  moduleAccess?: readonly string[] | null
): readonly Role[] {
  if (moduleAccess?.includes('*')) return ['administrator'];
  const key = (legacyRole ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return LEGACY_ROLE_MAP[key] ?? [];
}

/** True when the map knows the role, so a caller can log the ones it does not. */
export function isKnownLegacyRole(legacyRole: string | null | undefined): boolean {
  const key = (legacyRole ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return key in LEGACY_ROLE_MAP;
}
