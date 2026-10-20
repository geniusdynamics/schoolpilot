// ABOUTME: The order the canonical entities are created in: a row's references always point
// ABOUTME: at a row that exists already, so a seed never trips over its own foreign keys.

import { storageFor, type EntityName } from '@/domain/schema';

/**
 * Orders the entities so that every row can be created after the rows it points at.
 *
 * The order is a topological sort of the reference graph: an entity is only created when
 * every entity it references is created already. A self-reference is not a dependency -
 * a table may reference itself - and is left out.
 *
 * The `priority` list decides which of the ready entities comes first. An entity that is
 * not in the priority list comes last, which is how an entity that the registry gained
 * after the hand-written order was written still lands in a valid place.
 */
export function referenceOrder(
  entities: readonly EntityName[],
  priority: readonly EntityName[] = entities
): readonly EntityName[] {
  const byTable = new Map(entities.map((entity) => [storageFor(entity).table, entity]));
  const rank = new Map(priority.map((entity, index) => [entity, index]));

  const dependencies = new Map<EntityName, EntityName[]>();
  const dependents = new Map<EntityName, EntityName[]>();
  for (const entity of entities) {
    const parents: EntityName[] = [];
    for (const target of Object.values(storageFor(entity).refs)) {
      const parent = byTable.get(target);
      if (!parent || parent === entity) continue;
      parents.push(parent);
    }
    dependencies.set(entity, parents);
    dependents.set(entity, []);
  }
  for (const entity of entities) {
    for (const parent of dependencies.get(entity) ?? []) {
      dependents.get(parent)?.push(entity);
    }
  }

  const outstanding = new Map<EntityName, number>();
  const ready: EntityName[] = [];
  for (const entity of entities) {
    const count = (dependencies.get(entity) ?? []).length;
    outstanding.set(entity, count);
    if (count === 0) ready.push(entity);
  }

  const compare = (left: EntityName, right: EntityName): number => {
    const rankLeft = rank.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rankRight = rank.get(right) ?? Number.MAX_SAFE_INTEGER;
    if (rankLeft !== rankRight) return rankLeft - rankRight;
    return entities.indexOf(left) - entities.indexOf(right);
  };

  const ordered: EntityName[] = [];
  while (ready.length > 0) {
    ready.sort(compare);
    const next = ready.shift() as EntityName;
    ordered.push(next);

    for (const dependent of dependents.get(next) ?? []) {
      const left = (outstanding.get(dependent) ?? 0) - 1;
      outstanding.set(dependent, left);
      if (left === 0) ready.push(dependent);
    }
  }

  // A cycle in the reference graph would leave entities out; they are appended so the
  // list always names every registered entity.
  for (const entity of entities) {
    if (!ordered.includes(entity)) ordered.push(entity);
  }

  return ordered;
}
