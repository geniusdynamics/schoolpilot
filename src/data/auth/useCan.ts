// ABOUTME: The hook a page uses to hide a control the signed-in actor may not use.
// ABOUTME: It reads the same authority the repository judges writes by, so the button and the write agree.

import { useSyncExternalStore } from 'react';

import { authorityVersion, can, currentRoles, subscribeAuthority } from './sessionAuthority';
import type { Permission } from './roles';

/**
 * Whether the signed-in actor holds a permission.
 *
 * A page calls this before offering a write ("Add account", "Delete", "Post"), so a role that
 * cannot make the change does not see the control that would fail. The repository still refuses
 * the write: hiding a button is courtesy, the authorizer is the rule.
 */
export function useCan(permission: Permission): boolean {
  return useSyncExternalStore(
    subscribeAuthority,
    () => can(permission),
    () => can(permission)
  );
}

/** Whether the actor holds every permission of a list, for a control that needs more than one. */
export function useCanAll(permissions: readonly Permission[]): boolean {
  return useSyncExternalStore(
    subscribeAuthority,
    () => permissions.every((permission) => can(permission)),
    () => false
  );
}

/** The roles the app is acting as, for a page that names the actor's role. */
export function useAuthorityRoles(): readonly string[] {
  return useSyncExternalStore(subscribeAuthority, currentRoles, () => currentRoles());
}

/** A number that changes when the actor does, for a caller that needs to recompute something. */
export function useAuthorityVersion(): number {
  return useSyncExternalStore(subscribeAuthority, authorityVersion, authorityVersion);
}
