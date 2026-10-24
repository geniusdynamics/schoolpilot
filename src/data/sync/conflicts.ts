// ABOUTME: The conflict log as the settings UI reads it: the stored notes plus a summary, with
// ABOUTME: no sync node and no metadata setup required on a database that has never synced.

import type { EntityName } from '@/domain/schema';
import type { SqliteAdapter } from '@/data/adapters/sqlite';

import type { ConflictNote } from './envelope';
import type { StoredConflict } from './store';

/** A conflict note as the log stores it. */
export type SyncConflict = StoredConflict;

/** The counts the conflict panel shows above the table. */
export interface ConflictSummary {
  readonly total: number;
  readonly unresolved: number;
  /** Conflicts per entity, largest first. */
  readonly byEntity: readonly { readonly entity: EntityName; readonly count: number }[];
}

/**
 * Every conflict a replica recorded, oldest first.
 *
 * A database that has never synced has no conflict table yet; that is an empty log, not a
 * failure, so the read answers an empty list instead of throwing at the page.
 */
export async function readSyncConflicts(adapter: SqliteAdapter): Promise<readonly SyncConflict[]> {
  let rows: readonly Record<string, string | null>[];
  try {
    rows = await adapter.all<Record<string, string | null>>(
      `SELECT * FROM "sync_conflict" ORDER BY "detected_at", "id"`
    );
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }

  return rows.map(toConflict);
}

/** Counts the conflicts a page shows: how many, how many unresolved, and where they cluster. */
export function summariseConflicts(conflicts: readonly SyncConflict[]): ConflictSummary {
  const counts = new Map<EntityName, number>();
  let unresolved = 0;

  for (const conflict of conflicts) {
    if (conflict.kind === 'unresolved') unresolved += 1;
    counts.set(conflict.entity, (counts.get(conflict.entity) ?? 0) + 1);
  }

  const byEntity = [...counts.entries()]
    .map(([entity, count]) => ({ entity, count }))
    .sort((left, right) => right.count - left.count || left.entity.localeCompare(right.entity));

  return { total: conflicts.length, unresolved, byEntity };
}

function toConflict(row: Readonly<Record<string, string | null>>): SyncConflict {
  return {
    id: String(row.id),
    entity: String(row.entity) as EntityName,
    entityId: String(row.entity_id),
    policy: String(row.policy),
    kind: String(row.kind) as ConflictNote['kind'],
    field: String(row.field),
    winner: String(row.winner),
    loser: String(row.loser),
    winnerHlc: String(row.winner_hlc),
    loserHlc: String(row.loser_hlc),
    resolved: String(row.resolved),
    ...(row.detail !== null && row.detail !== undefined ? { detail: String(row.detail) } : {}),
    detectedAt: String(row.detected_at),
  };
}

function isMissingTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /no such table|does not exist|undefined table/i.test(message);
}
