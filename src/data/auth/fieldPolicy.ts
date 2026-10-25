// ABOUTME: The field policy of the permission model: the columns a role is not handed even when it
// ABOUTME: may read the row, applied by the scoped repository and by the hub's entity API alike.

import type { RepositoryRow } from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import { hasPermission, type Role } from './roles';

/**
 * The fields of an entity the roles are not handed.
 *
 * The policy is a property of the model, not of one caller: the client's scoped repository and the
 * hub's entity API both read it, so a field the browser withholds cannot leak through the server.
 *
 * - The **learner** row carries `medical` and `special_needs`, which are special/restricted data
 *   (spec 06 §8.1): they are handed only to a role that holds `learner.medical.read`.
 * - The **user** row carries `password_hash`, the hub's own credential column. No caller of the
 *   entity API is handed it, whatever its roles; the authentication service reads the row through
 *   a repository with no field policy.
 */
export function withheldFields(roles: readonly Role[], entity: EntityName): readonly string[] {
  if (entity === 'learner') {
    return hasPermission(roles, 'learner.medical.read') ? [] : ['medical', 'special_needs'];
  }
  if (entity === 'user') return ['password_hash'];
  return [];
}

/**
 * The row as the roles are handed it.
 *
 * A row with nothing to withhold is returned unchanged, so the common case allocates nothing.
 */
export function redactRow<E extends EntityName>(
  roles: readonly Role[],
  entity: E,
  row: RepositoryRow<E>
): RepositoryRow<E> {
  const withheld = withheldFields(roles, entity);
  if (withheld.length === 0) return row;

  const copy: Record<string, unknown> = { ...row };
  for (const field of withheld) delete copy[field];
  return copy as unknown as RepositoryRow<E>;
}

/** The rows as the roles are handed them, in order. */
export function redactRows<E extends EntityName>(
  roles: readonly Role[],
  entity: E,
  rows: readonly RepositoryRow<E>[]
): RepositoryRow<E>[] {
  return rows.map((row) => redactRow(roles, entity, row));
}
