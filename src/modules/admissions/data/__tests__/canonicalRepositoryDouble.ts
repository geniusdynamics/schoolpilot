// ABOUTME: The repository double the admissions page tests run against: seeded canonical rows
// ABOUTME: it serves and records, with real creates, updates and reads. No storage, no schema.

import type {
  ChangeEvent,
  CreateInput,
  ListQuery,
  Page,
  RepositoryRow,
  Unsubscribe,
  UpdateInput,
  UpdateOptions,
} from '@/data/repository';
import type { QueryRepository, QueryWatchListener } from '@/data/query';
import type { EntityName } from '@/domain/schema';

/** The rows a double serves, keyed by the canonical entity name. */
export type FakeRepositoryRows = Partial<Record<EntityName, readonly Record<string, unknown>[]>>;

/** A repository that serves seeded rows, records the writes, and tells its watchers. */
export interface FakeRepository extends QueryRepository {
  /** The rows the double holds, keyed by entity. */
  readonly rows: FakeRepositoryRows;
  /** The entities the page asked for, in the order it asked for them. */
  readonly requested: EntityName[];
  /** Adds or replaces the rows of one entity and tells the watchers about it. */
  readonly publish: (entity: EntityName, rows: readonly Record<string, unknown>[]) => void;
  get<E extends EntityName>(
    entity: E,
    id: string,
    options?: { readonly includeDeleted?: boolean }
  ): Promise<RepositoryRow<E> | null>;
  create<E extends EntityName>(
    entity: E,
    input: CreateInput<E>,
    options?: { readonly reason?: string }
  ): Promise<RepositoryRow<E>>;
  update<E extends EntityName>(
    entity: E,
    id: string,
    patch: UpdateInput<E>,
    options?: UpdateOptions
  ): Promise<RepositoryRow<E>>;
  remove<E extends EntityName>(entity: E, id: string): Promise<RepositoryRow<E>>;
  transaction<T>(work: () => Promise<T>): Promise<T>;
}

type Row = Record<string, unknown>;

/** The rows of one entity that match the equality filters of a list query. */
function matching(rows: readonly Row[], query: ListQuery | undefined): readonly Row[] {
  const includeDeleted = query?.includeDeleted === true;
  const where = query?.where ?? {};
  const filters = Object.entries(where).filter(([, value]) => value !== undefined);
  return rows.filter((row) => {
    if (!includeDeleted && row.deleted_at != null) return false;
    return filters.every(([column, value]) => row[column] === value);
  });
}

/**
 * Builds a repository double over the given rows.
 *
 * The double answers `list` and `watch` with the seeded rows and keeps the writes it is
 * asked for, so the admission service can run over it exactly as it runs over the real
 * repository. A row with `deleted_at` is archived: hidden unless the query asks for it.
 */
export function createFakeRepository(seed: FakeRepositoryRows = {}): FakeRepository {
  const rows: Record<string, Row[]> = Object.fromEntries(
    Object.entries(seed).map(([entity, entityRows]) => [
      entity,
      (entityRows ?? []).map((row) => ({ ...row })),
    ])
  ) as Record<string, Row[]>;
  const requested: EntityName[] = [];
  const watchers = new Set<() => void>();
  const subscribers = new Set<(event: ChangeEvent) => void>();
  let sequence = 1;
  let nextId = 0;

  const nextOpaqueId = (): string => {
    nextId += 1;
    return `01930000-0000-7000-8000-${String(nextId).padStart(12, '0')}`;
  };

  const publish = (entity: EntityName, next: readonly Record<string, unknown>[]) => {
    rows[entity] = next.map((row) => ({ ...row }));
    sequence += 1;
    const event: ChangeEvent = {
      entity,
      type: 'update',
      ids: [],
      origin: 'test',
      commitSequence: sequence,
    };
    for (const subscriber of subscribers) subscriber(event);
    for (const deliver of watchers) deliver();
  };

  const repository: FakeRepository = {
    rows,
    requested,
    publish,
    get currentCommitSequence() {
      return sequence;
    },
    async list<E extends EntityName>(entity: E, query?: ListQuery): Promise<Page<RepositoryRow<E>>> {
      requested.push(entity);
      const items = matching(rows[entity] ?? [], query) as unknown as readonly RepositoryRow<E>[];
      return { items, total: items.length, hasMore: false };
    },
    watch<E extends EntityName>(
      entity: E,
      query: ListQuery,
      listener: QueryWatchListener<RepositoryRow<E>>
    ): Unsubscribe {
      requested.push(entity);
      const deliver = () =>
        listener(matching(rows[entity] ?? [], query) as unknown as readonly RepositoryRow<E>[], sequence);
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
    async whenIdle(): Promise<void> {
      return undefined;
    },
    async get<E extends EntityName>(
      entity: E,
      id: string,
      options: { readonly includeDeleted?: boolean } = {}
    ): Promise<RepositoryRow<E> | null> {
      const row = (rows[entity] ?? []).find(
        (candidate) =>
          candidate.id === id && (options.includeDeleted || candidate.deleted_at == null)
      );
      return row ? ({ ...row } as unknown as RepositoryRow<E>) : null;
    },
    async create<E extends EntityName>(
      entity: E,
      input: CreateInput<E>
    ): Promise<RepositoryRow<E>> {
      const row: Row = {
        ...(input as unknown as Row),
        id: nextOpaqueId(),
        rowVersion: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      publish(entity, [...(rows[entity] ?? []), row]);
      return { ...row } as unknown as RepositoryRow<E>;
    },
    async update<E extends EntityName>(
      entity: E,
      id: string,
      patch: UpdateInput<E>,
      options: UpdateOptions = { expectedVersion: 1 }
    ): Promise<RepositoryRow<E>> {
      const current = (rows[entity] ?? []).find((candidate) => candidate.id === id);
      if (!current) throw new Error(`No ${entity} row with id ${id}`);
      if (options?.expectedVersion !== undefined && current.rowVersion !== options.expectedVersion) {
        throw new Error(`Stale ${entity} row ${id}`);
      }
      const next: Row = {
        ...current,
        ...(patch as unknown as Row),
        rowVersion: Number(current.rowVersion ?? 1) + 1,
        updated_at: new Date().toISOString(),
      };
      publish(
        entity,
        (rows[entity] ?? []).map((candidate) => (candidate.id === id ? next : candidate))
      );
      return { ...next } as unknown as RepositoryRow<E>;
    },
    async remove<E extends EntityName>(entity: E, id: string): Promise<RepositoryRow<E>> {
      const current = (rows[entity] ?? []).find((candidate) => candidate.id === id);
      if (!current) throw new Error(`No ${entity} row with id ${id}`);
      publish(
        entity,
        (rows[entity] ?? []).filter((candidate) => candidate.id !== id)
      );
      return { ...current } as unknown as RepositoryRow<E>;
    },
    async transaction<T>(work: () => Promise<T>): Promise<T> {
      return work();
    },
  };

  return repository;
}
