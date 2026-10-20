// ABOUTME: The useLookup hook: one list read per entity and filter, turned into the rows,
// ABOUTME: the labels and the archived resolution the entity picker consumes.

import { useCallback, useMemo, useRef } from 'react';

import type { ListQuery, RepositoryRow } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import { labelOf, type EntityName } from '@/domain/schema';

import { queryCache, type QueryRepository } from './cache';
import { queryKey, type Status } from './keys';
import { useQuerySnapshot, useStableKey } from './useQuery';

/** How a lookup is configured. */
export interface UseLookupOptions<E extends EntityName> {
  /** The repository the rows are read from. */
  readonly repository?: QueryRepository;
  /** The key column of the rows. Defaults to `id`. */
  readonly idField?: string;
  /** The label of a row. Defaults to the label the entity registers. */
  readonly label?: (row: RepositoryRow<E>) => string;
  /** The equality filters of the read. */
  readonly filter?: Readonly<Record<string, unknown>>;
  /** Whether archived rows are offered as options. They always stay resolvable. */
  readonly includeArchived?: boolean;
  /** How many rows the read may return. */
  readonly limit?: number;
  /** A disabled lookup stays idle until it is enabled. */
  readonly enabled?: boolean;
}

/** The options of the short spelling, which names the repository in the options. */
export type UseLookupOptionsWithRepository<E extends EntityName> = UseLookupOptions<E> & {
  readonly repository: QueryRepository;
};

/** What a lookup hands to the view. */
export interface LookupResult<E extends EntityName> {
  /** The rows offered by the picker; archived rows are excluded. */
  readonly options: readonly RepositoryRow<E>[];
  /** Every row of the lookup, archived ones included, keyed by id. */
  readonly byId: ReadonlyMap<Id<E>, RepositoryRow<E>>;
  /** The label of an id. Archived rows carry the archived marker. */
  readonly label: (id: Id<E>, fallback?: string) => string;
  /** The row of an id, even when it is archived. */
  readonly resolve: (id: Id<E>) => RepositoryRow<E> | undefined;
  readonly status: Status;
  readonly error: unknown;
  readonly isFetching: boolean;
  /** True when a row is archived. The picker uses it to mark an archived option. */
  readonly isArchived: (row: RepositoryRow<E>) => boolean;
  /** The id of a row. The picker uses it when the id column is not `id`. */
  readonly getId: (row: RepositoryRow<E>) => Id<E>;
}

/**
 * The part of a lookup every consumer of the same entity and filter shares.
 *
 * The map is built once per read; the label of a row is computed when it is asked for,
 * so a consumer that passes a new label function on every render does not build a new
 * map.
 */
interface SharedLookup<E extends EntityName> {
  readonly byId: ReadonlyMap<Id<E>, RepositoryRow<E>>;
  readonly rows: readonly RepositoryRow<E>[];
}

/** The number of rows a lookup reads when no limit is given. */
const DEFAULT_LOOKUP_LIMIT = 500;

/**
 * Reads the rows of one entity for a picker.
 *
 * The read is shared by every consumer of the same entity and filter, and so is the
 * derived map. Archived rows stay resolvable and keep their label, but they are only
 * offered as options when the caller asks for them.
 */
export function useLookup<E extends EntityName>(
  entity: E,
  options: UseLookupOptionsWithRepository<E>
): LookupResult<E>;
export function useLookup<E extends EntityName>(
  repository: QueryRepository,
  entity: E,
  options: UseLookupOptions<E>
): LookupResult<E>;
export function useLookup<E extends EntityName>(
  repositoryOrEntity: QueryRepository | E,
  entityOrOptions: E | UseLookupOptions<E>,
  maybeOptions?: UseLookupOptions<E>
): LookupResult<E> {
  const entityFirst = typeof repositoryOrEntity === 'string';
  const entity = (entityFirst ? repositoryOrEntity : entityOrOptions) as E;
  const options = (entityFirst ? entityOrOptions : maybeOptions) as UseLookupOptions<E>;
  const repository = entityFirst ? options.repository : (repositoryOrEntity as QueryRepository);

  if (!repository) {
    throw new Error(
      `useLookup(${entity}) needs a repository: pass it as the first argument or as options.repository`
    );
  }

  const {
    idField = 'id',
    label,
    filter,
    includeArchived = false,
    limit = DEFAULT_LOOKUP_LIMIT,
    enabled = true,
  } = options;

  const key = queryKey(entity, {
    $lookup: { filter: filter ?? {} },
  });
  const listQuery: ListQuery = {
    where: filter ?? {},
    includeDeleted: true,
    limit,
  };

  queryCache.attachRepository(repository);
  queryCache.define({
    key,
    repository,
    mode: 'watch',
    fetcher: async () => {
      const page = await repository.list(entity, listQuery);
      return page.items;
    },
    watch: (_query, listener) =>
      repository.watch(entity, listQuery, (rows, commitSequence, error) => {
        listener(rows as readonly unknown[], commitSequence, error);
      }),
    mergeWatch: (_base, rows) => rows,
  });

  const snapshot = useQuerySnapshot<readonly RepositoryRow<E>[]>(key, repository, enabled);
  const stableKey = useStableKey(key);
  const rows = snapshot.data;

  const shared = useMemo(
    () =>
      queryCache.derivedValue<SharedLookup<E>>(stableKey, repository, rows, (data) =>
        createSharedLookup<E>((data as readonly RepositoryRow<E>[]) ?? [], idField)
      ),
    [stableKey, repository, rows, idField]
  );

  const isArchived = useMemo(() => (row: RepositoryRow<E>) => isArchivedRow(row), []);

  const pickerOptions = useMemo(
    () => shared.rows.filter((row) => includeArchived || !isArchived(row)),
    [shared, includeArchived, isArchived]
  );

  // The label function is read when a label is asked for, so a caller that passes one
  // inline does not rebuild the map on every render.
  const labelRef = useRef(label);
  labelRef.current = label;

  const labelFor = useMemo(
    () =>
      (id: Id<E>, fallback = ''): string => {
        const row = shared.byId.get(id);
        if (!row) return fallback;
        const current = labelRef.current;
        const text = current ? current(row) : labelOf(entity, row);
        return isArchived(row) ? `${text} (archived)` : text;
      },
    [shared, entity, isArchived]
  );

  const resolve = useCallback((id: Id<E>) => shared.byId.get(id), [shared]);
  const getId = useCallback(
    (row: RepositoryRow<E>) => asId<E>(String(fieldOf(row, idField))),
    [idField]
  );

  return useMemo(
    () => ({
      options: pickerOptions,
      byId: shared.byId,
      label: labelFor,
      resolve,
      status: snapshot.status,
      error: snapshot.error,
      isFetching: snapshot.isFetching,
      isArchived,
      getId,
    }),
    [
      pickerOptions,
      shared,
      labelFor,
      resolve,
      snapshot.status,
      snapshot.error,
      snapshot.isFetching,
      isArchived,
      getId,
    ]
  );
}

/** Builds the part of a lookup every consumer shares. */
function createSharedLookup<E extends EntityName>(
  rows: readonly RepositoryRow<E>[],
  idField: string
): SharedLookup<E> {
  const byId = new Map<Id<E>, RepositoryRow<E>>();
  for (const row of rows ?? []) {
    byId.set(asId<E>(String(fieldOf(row, idField))), row);
  }
  return { byId, rows: rows ?? [] };
}

/** True when a row is archived: soft deleted, flagged or archived by its status. */
function isArchivedRow(row: RepositoryRow<EntityName>): boolean {
  if (fieldOf(row, 'deleted_at') != null) return true;
  if (fieldOf(row, 'archived') === true) return true;
  return fieldOf(row, 'status') === 'archived';
}

function fieldOf(row: unknown, field: string): unknown {
  if (row === null || typeof row !== 'object') return undefined;
  return (row as Record<string, unknown>)[field];
}
