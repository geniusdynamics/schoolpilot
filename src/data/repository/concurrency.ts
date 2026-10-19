// ABOUTME: Optimistic concurrency: the per-row version counter, the idempotent ALTER that adds
// ABOUTME: it to tables the canonical DDL cannot add it to, and the helpers that read and bump it.

import { databaseSchemaFor, storageFor, type EntityName } from '@/domain/schema';
import type { SqliteAdapter } from '@/data/adapters/sqlite';

/**
 * The column that carries the optimistic-concurrency counter.
 *
 * Most entities do not declare a `version` field, so their table gets this column.
 */
export const CONCURRENCY_COLUMN = 'version';

/**
 * The column used by the entities that do declare a business `version` field
 * (`curriculum_pack`, `assessment_scheme`, `grading_scale`, `mark`, `report_card` and
 * `fee_schedule`). Their `version` column is business data - a re-issue number, a
 * scheme version - and must not double as the write counter, so the counter lives in
 * its own column.
 */
export const CONCURRENCY_FALLBACK_COLUMN = 'row_version';

/** The value a freshly inserted row carries. */
export const INITIAL_VERSION = 1;

/** True when the entity declares a business `version` field of its own. */
export function hasBusinessVersion(entity: EntityName): boolean {
  return Object.prototype.hasOwnProperty.call(databaseSchemaFor(entity).properties, CONCURRENCY_COLUMN);
}

/** The column that holds the optimistic-concurrency counter for an entity. */
export function concurrencyColumnFor(entity: EntityName): string {
  return hasBusinessVersion(entity) ? CONCURRENCY_FALLBACK_COLUMN : CONCURRENCY_COLUMN;
}

/**
 * Adds the concurrency column to every table that lacks it.
 *
 * The canonical DDL is CREATE-only, so a table created before this column existed never
 * receives it. The statement is therefore idempotent: the column list of the table is
 * read first and the ALTER only runs when the column is missing.
 *
 * Returns the `table.column` pairs that were added by this call.
 */
export async function ensureConcurrencyColumns(
  adapter: SqliteAdapter,
  entities: readonly EntityName[]
): Promise<readonly string[]> {
  const added: string[] = [];

  for (const entity of entities) {
    const table = storageFor(entity).table;
    const column = concurrencyColumnFor(entity);
    const existing = await adapter.all<{ name: string }>(`PRAGMA table_info("${table}")`);

    // An empty result means the table does not exist yet; the canonical DDL owns that.
    if (existing.length === 0) continue;
    if (existing.some((column_) => column_.name === column)) continue;

    await adapter.exec(
      `ALTER TABLE "${table}" ADD COLUMN "${column}" INTEGER NOT NULL DEFAULT ${INITIAL_VERSION}`
    );
    added.push(`${table}.${column}`);
  }

  return added;
}
