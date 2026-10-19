// ABOUTME: Applies the canonical entity DDL (tables, indexes, unique keys, foreign keys) from
// ABOUTME: the spec 02 registry to a SQLite adapter in one transaction.

import {
  databaseSchemaFor,
  ENTITY_NAMES,
  storageFor,
  type EntityName,
} from '@/domain/schema';
import type {
  DatabaseSchema,
  UniqueConstraintDefinition,
} from '@/utils/databaseAgnosticSchema';

import type { SqliteAdapter } from './driver';

/** The database schema for one entity, including unique keys carried by its storage sidecar. */
export function canonicalDatabaseSchema(entity: EntityName): DatabaseSchema {
  const storage = storageFor(entity);
  const unique: UniqueConstraintDefinition[] = storage.unique.map((constraint) =>
    'columns' in constraint
      ? { columns: [...constraint.columns], ...(constraint.where ? { where: constraint.where } : {}) }
      : [...constraint]
  );

  return { ...databaseSchemaFor(entity), unique, strict: true };
}

/** Create every canonical table; safe to run against an existing database. */
export async function applyCanonicalSchema(
  adapter: SqliteAdapter,
  entities: readonly EntityName[] = ENTITY_NAMES
): Promise<void> {
  await adapter.applySchema(entities.map(canonicalDatabaseSchema));
}
