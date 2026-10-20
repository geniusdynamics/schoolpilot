// ABOUTME: Public surface of the query layer: the canonical keys, the live cache and the
// ABOUTME: four hooks a page uses to read, write and look up data.

export {
  queryKey,
  stableStringify,
  type QueryKey,
  type QuerySnapshotObject,
  type Status,
} from './keys';

export {
  DEFAULT_GC_TIME,
  QueryCache,
  queryCache,
  sameValue,
  type CommitOutcome,
  type Fetcher,
  type QueryDefinition,
  type QueryMode,
  type QueryRepository,
  type QuerySnapshot,
  type QueryWatchListener,
  type Settlement,
  type WatchFactory,
  type WatchMerge,
} from './cache';

export {
  useQuery,
  useQuerySnapshot,
  useStableKey,
  type UseQueryOptions,
  type UseQueryResult,
} from './useQuery';

export {
  useEntityQuery,
  type UseEntityQueryOptions,
  type UseEntityQueryResult,
} from './useEntityQuery';

export {
  useMutation,
  type OptimisticPatch,
  type UseMutationOptions,
  type UseMutationResult,
} from './useMutation';

export {
  useLookup,
  type LookupResult,
  type UseLookupOptions,
  type UseLookupOptionsWithRepository,
} from './useLookup';
