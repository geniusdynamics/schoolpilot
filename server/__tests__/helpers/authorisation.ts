// ABOUTME: The roles a hub suite's seeded account holds. The hub denies an account that holds no role,
// ABOUTME: so a suite that signs a fixture user in must grant it the roles its requests need.

import type { SqliteAdapter } from '@/data/adapters/sqlite';
import type { Role } from '@/data/auth';

import { applyRbacSchema, RoleAssignmentStore } from '../../auth/rbac';

/**
 * Grants an account roles in a database before a hub opens it.
 *
 * The authorisation tables are created here as well as by the hub, because a suite seeds its
 * database through the repository first and starts the hub over the file afterwards; creating
 * them is idempotent, so the hub's own start finds them in place.
 */
export async function grantRoles(
  adapter: SqliteAdapter,
  userId: string,
  roles: readonly Role[] = ['administrator']
): Promise<void> {
  await applyRbacSchema(adapter);
  await new RoleAssignmentStore(adapter).grantAll(userId, roles, { grantedBy: null });
}
