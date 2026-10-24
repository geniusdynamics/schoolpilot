// ABOUTME: The scope of a replica: one institution, optionally a narrower entity list, and an
// ABOUTME: optional row predicate, plus the reference closure a pull needs to stay FK-safe.

import {
  ENTITY_NAMES,
  isEntityName,
  storageFor,
  type EntityName,
} from '@/domain/schema';

import { referenceOrder } from '@/data/repository/referenceOrder';

/**
 * The data one replica may hold.
 *
 * `institutionId` is the tenancy boundary every canonical row carries. `entities` narrows the
 * replica further - a subject teacher syncs their groups' marks, not the ledger - and is
 * closed over the reference graph before it is used, because a row cannot land before the
 * rows it points at. `allowsRow` is the permission seam: a scope that has already resolved
 * the user's visible rows passes a predicate, and the server re-checks every row against it.
 */
export interface ReplicaScope {
  readonly institutionId: string;
  readonly entities?: readonly EntityName[];
  readonly allowsRow?: (entity: EntityName, row: Readonly<Record<string, unknown>>) => boolean;
}

/** A stable key for a scope, so a replica can notice that its scope changed. */
export function scopeKey(scope: ReplicaScope): string {
  const entities = scope.entities ? [...scope.entities].sort().join(',') : '*';
  return `${scope.institutionId}|${entities}|${scope.allowsRow ? 'filtered' : 'all'}`;
}

/**
 * The entities a scoped pull covers.
 *
 * The list is closed over references transitively: a mark needs its enrolment, the enrolment
 * its learner, the learner its household. `institution` is always included, because every
 * other row points at it and a pull cannot satisfy a foreign key without it.
 */
export function scopedEntities(scope: ReplicaScope): readonly EntityName[] {
  if (!scope.entities) return ENTITY_NAMES;

  const included = new Set<EntityName>(scope.entities);
  included.add('institution');

  const queue = [...included];
  while (queue.length > 0) {
    const entity = queue.shift() as EntityName;
    for (const table of Object.values(storageFor(entity).refs)) {
      if (!isEntityName(table)) continue;
      if (included.has(table)) continue;
      included.add(table);
      queue.push(table);
    }
  }

  return referenceOrder([...included]);
}

/** True when an entity belongs to the replica at all. */
export function entityInScope(scope: ReplicaScope, entity: EntityName): boolean {
  return scopedEntities(scope).includes(entity);
}

/**
 * True when a row belongs to the replica.
 *
 * The institution row names itself; every other canonical row carries `institution_id`. A
 * row whose tenancy cannot be established is refused rather than leaked.
 */
export function rowInScope(
  scope: ReplicaScope,
  entity: EntityName,
  row: Readonly<Record<string, unknown>>
): boolean {
  if (scope.allowsRow && !scope.allowsRow(entity, row)) return false;

  if (entity === 'institution') return row.id === scope.institutionId;

  const institutionId = row.institution_id;
  if (institutionId === undefined || institutionId === null) return false;
  return institutionId === scope.institutionId;
}

/** The position of an entity in the reference order, used to sort a pull. */
export function referenceRank(): ReadonlyMap<EntityName, number> {
  return new Map(referenceOrder(ENTITY_NAMES).map((entity, index) => [entity, index]));
}
