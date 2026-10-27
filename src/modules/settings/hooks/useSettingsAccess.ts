// ABOUTME: What the signed-in user may do in Settings, by the same rule the route guard applies.
// ABOUTME: The pages used to ask a separate in-memory RBAC service that grants nobody anything in a live school.

import { useCallback } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { userHasPermission } from '@/services/auth/accessRules';

export interface SettingsAccess {
  /** True when the signed-in user holds the permission. */
  readonly can: (permissionId: string) => boolean;
  /** True when the signed-in user holds at least one of the permissions. */
  readonly canAny: (permissionIds: readonly string[]) => boolean;
}

/**
 * The route guard lets the administrator into a Settings hub by asking the auth context whether
 * they hold `settings.view`; a page inside it has to give the same answer. It used to ask
 * `useRBAC()`, which keeps roles in memory and creates none outside demo mode, so it denied
 * everyone - the administrator included - on a page the guard had just opened.
 */
export function useSettingsAccess(): SettingsAccess {
  const { user } = useAuth();

  const can = useCallback((permissionId: string) => userHasPermission(user, permissionId), [user]);
  const canAny = useCallback(
    (permissionIds: readonly string[]) => permissionIds.some((permissionId) => userHasPermission(user, permissionId)),
    [user]
  );

  return { can, canAny };
}
