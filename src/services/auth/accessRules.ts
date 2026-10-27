// ABOUTME: Who holds a permission and which user rows are active, as pure functions of a user.
// ABOUTME: One rule for the route guard, the auth service and the pages, so they cannot disagree.

/** The role of the school's first administrator. */
export const SUPER_ADMIN_ROLE = 'super_admin';

/** The part of a signed-in user the permission rule reads. */
export interface PermissionHolder {
  readonly role?: string;
  readonly permissions?: readonly string[];
}

/**
 * True when the user holds the permission.
 *
 * A super administrator, or anyone holding the `*` permission, holds every permission - listed or
 * not. Anyone else holds exactly what they were granted. Nobody signed in holds nothing.
 */
export function userHasPermission(user: PermissionHolder | null | undefined, permissionId: string): boolean {
  if (!user) return false;
  const granted = user.permissions ?? [];
  if (user.role === SUPER_ADMIN_ROLE || granted.includes('*')) return true;
  return granted.includes(permissionId);
}

/**
 * True when a users row is active.
 *
 * SQLite rows carry the schema column `is_active` (1/0); older rows use `isActive`. A row that
 * says neither is not active: a login that is not marked active cannot sign in.
 */
export function isUserRowActive(row: { readonly is_active?: unknown; readonly isActive?: unknown }): boolean {
  const flag = row.is_active ?? row.isActive;
  return flag === true || flag === 1 || flag === '1' || flag === 'true';
}
