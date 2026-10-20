// ABOUTME: The useQuery hook: one cached read per key, shared by every component that asks
// ABOUTME: for the same key, with explicit loading, error and empty states.

import { useCallback, useRef, useSyncExternalStore } from 'react';

import type { EntityName } from '@/domain/schema';

import {
  queryCache,
  type QueryMode,
  type QueryRepository,
  type QuerySnapshot,
} from './cache';
import { type QueryKey, type QuerySnapshotObject, type Status } from './keys';

/** How a `useQuery` entry reacts to the change bus. */
export interface UseQueryOptions {
  /** Entities whose changes refresh this entry. */
  readonly deps?: readonly EntityName[];
  /** A disabled query stays idle until it is enabled or refetched. */
  readonly enabled?: boolean;
  /** How long a successful read stays fresh, in milliseconds. Defaults to 0. */
  readonly staleTime?: number;
  /** The invalidation mode. Defaults to `invalidate`. */
  readonly mode?: QueryMode;
  /**
   * The repository whose change bus carries the events this entry listens to.
   *
   * The entry belongs to that repository: two repositories over one entity keep two
   * entries, so their commit sequences never mix.
   */
  readonly repository?: QueryRepository;
}

/** What a query hands to the view. */
export interface UseQueryResult<T> {
  /** `undefined` means "not loaded"; it is distinct from an empty list. */
  readonly data: T | undefined;
  readonly error: unknown;
  readonly status: Status;
  readonly isFetching: boolean;
  /** Forces a read and refreshes the page metadata. */
  readonly refetch: () => Promise<void>;
}

const IDLE_SNAPSHOT: QuerySnapshot<unknown> = Object.freeze({
  data: undefined,
  error: null,
  status: 'idle' as Status,
  isFetching: false,
});

/**
 * Keeps one key object per hash.
 *
 * The key of a query is rebuilt on every render, but the cache only cares about its
 * hash, so the stable key keeps the subscription of `useSyncExternalStore` stable.
 */
export function useStableKey<E extends EntityName>(key: QueryKey<E>): QueryKey<E> {
  const reference = useRef<QueryKey<E> | null>(null);
  if (reference.current === null || reference.current.hash !== key.hash) {
    reference.current = key;
  }
  return reference.current;
}

/**
 * Subscribes to one cache entry.
 *
 * The snapshot is the object the cache publishes, so a subscriber only re-renders when
 * the data, the status or the error actually changed.
 */
export function useQuerySnapshot<T>(
  key: QueryKey,
  repository: QueryRepository | null,
  enabled: boolean
): QuerySnapshot<T> {
  const stableKey = useStableKey(key);

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      enabled ? queryCache.subscribe(stableKey, repository, onStoreChange) : () => undefined,
    [stableKey, repository, enabled]
  );

  const getSnapshot = useCallback(
    () =>
      enabled
        ? queryCache.getSnapshot<T>(stableKey, repository)
        : (IDLE_SNAPSHOT as QuerySnapshot<T>),
    [stableKey, repository, enabled]
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Reads one key.
 *
 * One entry per key and repository: N components share one fetch and one snapshot. A
 * failed refresh keeps the last good data and sets `error`; a failed first load leaves
 * the data undefined.
 */
export function useQuery<T>(
  key: QueryKey,
  fetcher: (query: QuerySnapshotObject) => Promise<T>,
  options: UseQueryOptions = {}
): UseQueryResult<T> {
  const {
    deps = [],
    enabled = true,
    staleTime = 0,
    mode = 'invalidate',
    repository,
  } = options;

  const owner = repository ?? null;
  queryCache.define({
    key,
    mode,
    deps,
    staleTime,
    repository: owner,
    fetcher: (query) => fetcher(query),
  });
  if (owner) queryCache.attachRepository(owner);

  const snapshot = useQuerySnapshot<T>(key, owner, enabled);
  const stableKey = useStableKey(key);
  const refetch = useCallback(() => queryCache.refetch(stableKey, owner), [stableKey, owner]);

  return {
    data: snapshot.data,
    error: snapshot.error,
    status: snapshot.status,
    isFetching: snapshot.isFetching,
    refetch,
  };
}
