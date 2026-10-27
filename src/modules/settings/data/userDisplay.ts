// ABOUTME: How a login row reads on a settings page: active or not, which role it holds, whether it administers
// ABOUTME: the school. A row carries the schema's snake_case columns (is_active, role_id) or the older camelCase.

import { isUserRowActive } from '@/services/auth/accessRules';

/** The columns of a login row a settings page reads, whichever way the row was written. */
export interface UserRow {
  readonly role?: string | null;
  readonly role_id?: string | number | null;
  readonly is_active?: unknown;
  readonly isActive?: unknown;
}

/** A named role a login can point at. */
export interface RoleRow {
  readonly id: string | number;
  readonly name: string;
}

/** The roles that administer the school. */
const ADMINISTRATOR_ROLES: readonly string[] = ['super_admin', 'administrator'];

/** "super_admin" read as words: "Super admin". */
function inWords(value: string): string {
  const words = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Whether the login can sign in. A row that says nothing is not active, as the sign-in itself reads it. */
export function userStatusLabel(row: UserRow): 'Active' | 'Inactive' {
  return isUserRowActive(row) ? 'Active' : 'Inactive';
}

/**
 * The role a row shows: the name of the role it points at, else its stored role in words.
 * Ids are compared as text, since a role id is a number in one place and a string in another.
 */
export function userRoleLabel(row: UserRow, roles: readonly RoleRow[]): string {
  const pointedAt = row.role_id;
  if (pointedAt !== undefined && pointedAt !== null && pointedAt !== '') {
    const named = roles.find((role) => String(role.id) === String(pointedAt));
    if (named) return named.name;
  }
  const stored = row.role ?? (typeof pointedAt === 'string' ? pointedAt : '');
  return stored ? inWords(stored) : '';
}

/** True when the login administers the school. */
export function isAdministratorRow(row: UserRow): boolean {
  return [row.role, row.role_id].some((value) => typeof value === 'string' && ADMINISTRATOR_ROLES.includes(value));
}

/** How many of the logins can sign in. */
export function countActiveUsers(rows: readonly UserRow[]): number {
  return rows.filter(isUserRowActive).length;
}

/** How many of the logins administer the school. */
export function countAdministrators(rows: readonly UserRow[]): number {
  return rows.filter(isAdministratorRow).length;
}
