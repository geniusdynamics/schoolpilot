// ABOUTME: The entity definition contract that pairs a zod schema with its storage metadata and
// ABOUTME: display-label function, so types, validation, DDL and lookups share one source.

import type { z } from 'zod/v4';

/** A composite unique key, optionally partial through a SQL predicate in `where`. */
export interface UniqueKey {
  /** Key columns, in index order. */
  readonly columns: readonly string[];
  /** SQL predicate selecting the rows the index applies to (e.g. `component_id IS NULL`). */
  readonly where?: string;
}

export type UniqueConstraint = readonly string[] | UniqueKey;

/** Storage-only metadata a JSON Schema cannot express. Consumed by the DDL adapter (P1-A04). */
export interface EntityStorage {
  /** Physical table name. */
  readonly table: string;
  /** Primary-key column. */
  readonly primaryKey: string;
  /** Non-unique index columns; arrays are composite indexes. */
  readonly indexes: readonly (string | readonly string[])[];
  /** Composite unique keys; an object form declares a partial unique index. */
  readonly unique: readonly UniqueConstraint[];
  /** Foreign key column -> target table. */
  readonly refs: Readonly<Record<string, string>>;
  /** Columns whose contents are encrypted at rest. */
  readonly encrypted: readonly string[];
}

/** One canonical entity: schema, storage sidecar and the label used by pickers and lookups. */
export interface EntityDefinition<S extends z.ZodType = z.ZodType> {
  readonly name: string;
  readonly schema: S;
  readonly storage: EntityStorage;
  readonly label: (row: z.output<S>) => string;
}

/**
 * Declares an entity and keeps the inferred row type attached to its schema. `name` stays a
 * literal so the entity registry can build a closed union of names.
 */
export function defineEntity<const N extends string, S extends z.ZodType>(definition: {
  readonly name: N;
  readonly schema: S;
  readonly storage: EntityStorage;
  readonly label: (row: z.output<S>) => string;
}): EntityDefinition<S> & { readonly name: N } {
  return definition;
}
