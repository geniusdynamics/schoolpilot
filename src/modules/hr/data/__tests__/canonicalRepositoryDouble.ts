// ABOUTME: The repository double the five module trees test their pages against.
// ABOUTME: It serves the rows a test seeds and nothing else: no storage, no schema, no mock data.

import type { ChangeEvent, ListQuery, Page, RepositoryRow, Unsubscribe } from '@/data/repository';
import type { QueryRepository, QueryWatchListener } from '@/data/query';
import type { EntityName } from '@/domain/schema';

/** The rows a double serves, keyed by the canonical entity name. */
export type FakeRepositoryRows = Partial<Record<EntityName, readonly Record<string, unknown>[]>>;

/** A repository that serves seeded rows and records the writes it was asked for. */
export interface FakeRepository extends QueryRepository {
  /** The rows the double holds, keyed by entity. */
  readonly rows: FakeRepositoryRows;
  /** The entities the page asked for, in the order it asked for them. */
  readonly requested: EntityName[];
  /** Adds or replaces the rows of one entity and tells the watchers about it. */
  readonly publish: (entity: EntityName, rows: readonly Record<string, unknown>[]) => void;
}

/**
 * The rows of one entity that match the equality filters of a list query.
 *
 * The double honours the filter the query layer sends, so a picker that filters by
 * a relation sees the same rows the repository would hand it.
 */
function matching(
  rows: readonly Record<string, unknown>[],
  query: ListQuery | undefined
): readonly Record<string, unknown>[] {
  const where = query?.where ?? {};
  const filters = Object.entries(where).filter(([, value]) => value !== undefined);
  if (filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every(([column, value]) => row[column] === value)
  );
}

/**
 * Builds a repository double over the given rows.
 *
 * The double answers `list` with the seeded rows and hands the same rows to a watcher
 * on subscribe, so a page that reads through `useEntityQuery` sees them right away.
 */
export function createFakeRepository(seed: FakeRepositoryRows = {}): FakeRepository {
  const rows: Record<string, readonly Record<string, unknown>[]> = { ...seed };
  const requested: EntityName[] = [];
  const watchers = new Set<() => void>();
  const subscribers = new Set<(event: ChangeEvent) => void>();
  let sequence = 1;

  const repository: FakeRepository = {
    rows,
    requested,
    get currentCommitSequence() {
      return sequence;
    },
    async list<E extends EntityName>(entity: E, query?: ListQuery): Promise<Page<RepositoryRow<E>>> {
      requested.push(entity);
      const items = matching(rows[entity] ?? [], query) as readonly RepositoryRow<E>[];
      return { items, total: items.length, hasMore: false };
    },
    watch<E extends EntityName>(
      entity: E,
      query: ListQuery,
      listener: QueryWatchListener<RepositoryRow<E>>
    ): Unsubscribe {
      requested.push(entity);
      const deliver = () => listener(matching(rows[entity] ?? [], query) as readonly RepositoryRow<E>[], sequence);
      deliver();
      watchers.add(deliver);
      return () => {
        watchers.delete(deliver);
      };
    },
    subscribe(listener: (event: ChangeEvent) => void): Unsubscribe {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },
    publish(entity: EntityName, next: readonly Record<string, unknown>[]) {
      rows[entity] = next;
      sequence += 1;
      const event: ChangeEvent = { entity, type: 'update', ids: [], origin: 'test', commitSequence: sequence };
      for (const subscriber of subscribers) subscriber(event);
      for (const deliver of watchers) deliver();
    },
  };

  return repository;
}
