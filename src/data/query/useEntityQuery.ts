// ABOUTME: The useEntityQuery hook: a repository read as a page, kept live by the watch
// ABOUTME: stream of the repository and refreshed by the change bus of its dependencies.

import { useCallback } from 'react';

import type { ListQuery, Page, RepositoryRow } from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import { queryCache, type QueryMode, type QueryRepository } from './cache';
import { queryKey, type Status } from './keys';
import { useQuerySnapshot, useStableKey } from './useQuery';

/** How a `useEntityQuery` entry reacts to the change bus. */
export interface UseEntityQueryOptions {
  /** Entities whose changes refresh this entry. */
  readonly deps?: readonly EntityName[];
  /** A disabled query stays idle until it is enabled or refetched. */
  readonly enabled?: boolean;
  /** How long a successful read stays fresh, in milliseconds. Defaults to 0. */
  readonly staleTime?: number;
  /** The invalidation mode. Defaults to `watch`. */
  readonly mode?: QueryMode;
}

/** What an entity query hands to the view. */
export interface UseEntityQueryResult<E extends EntityName> {
  /** The page, unchanged: `{ items, total, hasMore, nextCursor? }`. */
  readonly data: Page<RepositoryRow<E>> | undefined;
  readonly error: unknown;
  readonly status: Status;
  readonly isFetching: boolean;
  /** Forces a list and refreshes the page metadata. */
  readonly refetch: () => Promise<void>;
}

/**
 * Reads one entity through the repository.
 *
 * In watch mode the entry issues no initial list: the watch delivers the current page
 * on subscribe and every later page after a commit. The metadata of the page stays
 * advisory until a `refetch` runs.
 */
export function useEntityQuery<E extends EntityName>(
  repository: QueryRepository,
  entity: E,
  query: ListQuery = {},
  options: UseEntityQueryOptions = {}
): UseEntityQueryResult<E> {
  const { deps = [], enabled = true, staleTime = 0, mode = 'watch' } = options;
  const key = queryKey(entity, query);
  const live = mode === 'watch' && typeof repository.watch === 'function';

  queryCache.attachRepository(repository);
  queryCache.define({
    key,
    repository,
    mode: live ? 'watch' : mode === 'watch' ? 'invalidate' : mode,
    deps,
    staleTime,
    fetcher: () => repository.list(entity, query),
    watch: live
      ? (_query, listener) =>
          repository.watch(entity, query, (rows, commitSequence, error) => {
            listener(rows as readonly unknown[], commitSequence, error);
          })
      : null,
    mergeWatch: mergePage,
  });

  const snapshot = useQuerySnapshot<Page<RepositoryRow<E>>>(key, repository, enabled);
  const stableKey = useStableKey(key);
  const refetch = useCallback(
    () => queryCache.refetch(stableKey, repository),
    [stableKey, repository]
  );

  return {
    data: snapshot.data,
    error: snapshot.error,
    status: snapshot.status,
    isFetching: snapshot.isFetching,
    refetch,
  };
}

/** Replaces the items of a page and keeps its metadata. */
function mergePage(base: unknown, rows: readonly unknown[]): Page<unknown> {
  if (isPage(base)) return { ...base, items: rows };
  return { items: rows, total: rows.length, hasMore: false };
}

function isPage(base: unknown): base is Page<unknown> {
  if (base === null || typeof base !== 'object') return false;
  return Array.isArray((base as { items?: unknown }).items);
}
