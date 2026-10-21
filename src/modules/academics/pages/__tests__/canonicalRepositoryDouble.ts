// ABOUTME: The repository double the academics page tests render against: seeded canonical rows,
// ABOUTME: the list/watch contract the query layer binds to, and the write methods the pages call.

import {
  RepositoryConflictError,
  type ChangeEvent,
  type CreateInput,
  type ListQuery,
  type Page,
  type RepositoryRow,
  type UpdateInput,
  type UpdateOptions,
  type WriteOptions,
} from '@/data/repository';
import type { QueryRepository, QueryWatchListener } from '@/data/query';
import type { EntityName } from '@/domain/schema';
import type { Id } from '@/domain/ids';

import type { WritableQueryRepository } from '../../data/canonicalRepository';

/** The rows a double serves, keyed by the canonical entity name. */
export type FakeRepositoryRows = Partial<Record<EntityName, readonly Record<string, unknown>[]>>;

/** One write the pages asked the double for. */
export interface RecordedWrite {
  readonly operation: 'create' | 'update' | 'remove';
  readonly entity: EntityName;
  readonly id?: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface FakeRepository extends WritableQueryRepository {
  /** The rows the double holds, keyed by entity. */
  readonly rows: Record<string, readonly Record<string, unknown>[]>;
  /** The writes the page asked for, in order. */
  readonly writes: RecordedWrite[];
  /** Adds or replaces the rows of one entity and tells the watchers. */
  readonly publish: (entity: EntityName, rows: readonly Record<string, unknown>[]) => void;
  /** The next write rejects with this error instead of reaching the rows. */
  readonly failNext: (error: unknown) => void;
  /** Forgets the recorded writes. */
  readonly clearWrites: () => void;
}

/** The unique keys the registered entities enforce, so a duplicate is refused as it is in storage. */
const UNIQUE_KEYS: Partial<Record<EntityName, readonly (readonly string[])[]>> = {
  learning_area: [['programme_id', 'code']],
  component: [['learning_area_id', 'code']],
  teaching_group: [['campus_id', 'academic_year_id', 'learning_area_id', 'name']],
  teaching_assignment: [['staff_id', 'teaching_group_id', 'valid_from']],
  teaching_group_member: [['teaching_group_id', 'enrolment_id', 'valid_from']],
  mark: [
    ['assessment_id', 'enrolment_id', 'learning_area_id', 'component_id'],
    ['assessment_id', 'enrolment_id', 'learning_area_id'],
  ],
};

/** Rows that are not soft deleted. */
function live(rows: readonly Record<string, unknown>[]): readonly Record<string, unknown>[] {
  return rows.filter((row) => row.deleted_at == null);
}

/** The rows of one entity that match the equality filters of a list query. */
function matching(
  rows: readonly Record<string, unknown>[],
  query: ListQuery | undefined
): readonly Record<string, unknown>[] {
  const visible = query?.includeDeleted ? rows : live(rows);
  const filters = Object.entries(query?.where ?? {}).filter(([, value]) => value !== undefined);
  if (filters.length === 0) return visible;
  return visible.filter((row) => filters.every(([column, value]) => row[column] === value));
}

function conflicts(
  entity: EntityName,
  rows: readonly Record<string, unknown>[],
  candidate: Record<string, unknown>,
  ignoreId?: string
): boolean {
  const keys = UNIQUE_KEYS[entity] ?? [];
  return keys.some((columns) =>
    rows.some(
      (row) =>
        row.id !== ignoreId &&
        row.deleted_at == null &&
        columns.every((column) => row[column] === candidate[column])
    )
  );
}

/**
 * Builds the repository double the page tests render against.
 *
 * The double answers `list` with the seeded rows and hands the same rows to a watcher on
 * subscribe, so a page that reads through `useEntityQuery` sees them right away. A write
 * mutates the rows, records itself and tells the watchers, so the page re-reads exactly as
 * it does over the real repository.
 */
export function createFakeRepository(seed: FakeRepositoryRows = {}): FakeRepository {
  const rows: Record<string, readonly Record<string, unknown>[]> = {};
  for (const [entity, entityRows] of Object.entries(seed)) {
    rows[entity] = entityRows.map((row) => ({ ...row, id: String(row.id), rowVersion: row.rowVersion ?? 1 }));
  }
  const writes: RecordedWrite[] = [];
  const watchers = new Map<EntityName, Set<() => void>>();
  const subscribers = new Set<(event: ChangeEvent) => void>();
  let sequence = 1;
  let failure: unknown = null;
  let nextId = 0;

  const takeFailure = () => {
    const pending = failure;
    failure = null;
    return pending;
  };

  const emit = (entity: EntityName, type: ChangeEvent['type'], id?: string) => {
    sequence += 1;
    const event: ChangeEvent = {
      entity,
      type,
      ids: id === undefined ? [] : [id],
      origin: 'test',
      commitSequence: sequence,
    };
    for (const subscriber of subscribers) subscriber(event);
    for (const deliver of watchers.get(entity) ?? []) deliver();
  };

  const rowsOf = (entity: EntityName): Record<string, unknown>[] =>
    [...(rows[entity] ?? [])];

  const repository: FakeRepository = {
    rows,
    writes,
    get currentCommitSequence() {
      return sequence;
    },
    async list<E extends EntityName>(entity: E, query?: ListQuery): Promise<Page<RepositoryRow<E>>> {
      const items = matching(rows[entity] ?? [], query) as readonly RepositoryRow<E>[];
      return { items, total: items.length, hasMore: false };
    },
    watch<E extends EntityName>(
      entity: E,
      query: ListQuery,
      listener: QueryWatchListener<RepositoryRow<E>>
    ) {
      const deliver = () =>
        listener(matching(rows[entity] ?? [], query) as readonly RepositoryRow<E>[], sequence);
      deliver();
      const set = watchers.get(entity) ?? new Set<() => void>();
      set.add(deliver);
      watchers.set(entity, set);
      return () => {
        set.delete(deliver);
      };
    },
    subscribe(listener: (event: ChangeEvent) => void) {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },
    async get<E extends EntityName>(
      entity: E,
      id: Id<E>,
      options?: { readonly includeDeleted?: boolean }
    ): Promise<RepositoryRow<E> | null> {
      const row = (rows[entity] ?? []).find((candidate) => candidate.id === id);
      if (!row) return null;
      if (!options?.includeDeleted && row.deleted_at != null) return null;
      return row as unknown as RepositoryRow<E>;
    },
    async create<E extends EntityName>(
      entity: E,
      input: CreateInput<E>
    ): Promise<RepositoryRow<E>> {
      const failed = takeFailure();
      if (failed) throw failed;
      const candidate = {
        ...(input as unknown as Record<string, unknown>),
        id: `${entity}-${++nextId}`,
        rowVersion: 1,
        created_at: '2026-10-20T08:00:00.000Z',
        updated_at: '2026-10-20T08:00:00.000Z',
      };
      if (conflicts(entity, rows[entity] ?? [], candidate)) {
        throw new RepositoryConflictError(entity, 'unique', `A ${entity} row already holds this key`, {
          columns: (UNIQUE_KEYS[entity] ?? [])[0] ?? [],
        });
      }
      rows[entity] = [...(rows[entity] ?? []), candidate];
      writes.push({ operation: 'create', entity, id: candidate.id, payload: candidate });
      emit(entity, 'create', candidate.id);
      return candidate as unknown as RepositoryRow<E>;
    },
    async update<E extends EntityName>(
      entity: E,
      id: Id<E>,
      patch: UpdateInput<E>,
      options: UpdateOptions
    ): Promise<RepositoryRow<E>> {
      const failed = takeFailure();
      if (failed) throw failed;
      const current = (rows[entity] ?? []).find((candidate) => candidate.id === id);
      if (!current) throw new Error(`No ${entity} row with id ${id}`);
      if (current.rowVersion !== options.expectedVersion) {
        throw new RepositoryConflictError(entity, 'stale_version', `The ${entity} row moved on`, {
          id: String(id),
          expectedVersion: options.expectedVersion,
          actualVersion: Number(current.rowVersion),
        });
      }
      const candidate = {
        ...current,
        ...(patch as unknown as Record<string, unknown>),
        rowVersion: Number(current.rowVersion) + 1,
        updated_at: '2026-10-20T09:00:00.000Z',
      };
      if (conflicts(entity, rows[entity] ?? [], candidate, String(id))) {
        throw new RepositoryConflictError(entity, 'unique', `A ${entity} row already holds this key`);
      }
      rows[entity] = rowsOf(entity).map((row) => (row.id === id ? candidate : row));
      writes.push({ operation: 'update', entity, id: String(id), payload: candidate });
      emit(entity, 'update', String(id));
      return candidate as unknown as RepositoryRow<E>;
    },
    async remove<E extends EntityName>(
      entity: E,
      id: Id<E>,
      options?: WriteOptions & { readonly expectedVersion?: number }
    ): Promise<RepositoryRow<E>> {
      const failed = takeFailure();
      if (failed) throw failed;
      const current = (rows[entity] ?? []).find((candidate) => candidate.id === id);
      if (!current) throw new Error(`No ${entity} row with id ${id}`);
      if (options?.expectedVersion !== undefined && current.rowVersion !== options.expectedVersion) {
        throw new RepositoryConflictError(entity, 'stale_version', `The ${entity} row moved on`, {
          id: String(id),
          expectedVersion: options.expectedVersion,
          actualVersion: Number(current.rowVersion),
        });
      }
      const candidate = { ...current, deleted_at: '2026-10-20T10:00:00.000Z' };
      rows[entity] = rowsOf(entity).map((row) => (row.id === id ? candidate : row));
      writes.push({ operation: 'remove', entity, id: String(id), payload: candidate });
      emit(entity, 'remove', String(id));
      return candidate as unknown as RepositoryRow<E>;
    },
    publish(entity: EntityName, next: readonly Record<string, unknown>[]) {
      rows[entity] = next.map((row) => ({ ...row, id: String(row.id), rowVersion: row.rowVersion ?? 1 }));
      emit(entity, 'update');
    },
    failNext(error: unknown) {
      failure = error;
    },
    clearWrites() {
      writes.length = 0;
    },
  };

  return repository;
}

/** A repository double that is only read, for a test that checks a page's reads. */
export function createReadOnlyRepository(seed: FakeRepositoryRows = {}): QueryRepository {
  return createFakeRepository(seed);
}
