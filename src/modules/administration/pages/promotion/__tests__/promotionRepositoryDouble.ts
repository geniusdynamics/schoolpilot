// ABOUTME: The repository double the promotion page tests run against: canonical rows it serves and
// ABOUTME: records, with real creates, updates and reads, filters by equality and by an operator, and
// ABOUTME: no storage. It answers the same calls the real repository does, so the page and the service
// ABOUTME: run over it unchanged.

import type {
  FilterCondition,
  ListQuery,
  Page,
  Unsubscribe,
  UpdateOptions,
} from '@/data/repository';
import type { EntityName } from '@/domain/schema';

type Row = Record<string, unknown>;

/** The rows a double serves, keyed by the canonical entity name. */
export type DoubleRows = Partial<Record<EntityName, readonly Row[]>>;

export interface PromotionRepositoryDouble {
  readonly rows: Record<string, Row[]>;
  get currentCommitSequence(): number;
  publish(entity: EntityName, rows: readonly Row[]): void;
  get(entity: EntityName, id: string): Promise<Row | null>;
  list(entity: EntityName, query?: ListQuery): Promise<Page<Row>>;
  create(entity: EntityName, input: Row): Promise<Row>;
  update(entity: EntityName, id: string, patch: Row, options?: UpdateOptions): Promise<Row>;
  remove(entity: EntityName, id: string): Promise<Row>;
  watch(
    entity: EntityName,
    query: ListQuery,
    listener: (rows: readonly Row[], commitSequence: number) => void
  ): Unsubscribe;
  subscribe(listener: (event: unknown) => void): Unsubscribe;
  whenIdle(): Promise<void>;
  transaction<T>(work: () => Promise<T>): Promise<T>;
}

/** True when a row passes the equality filters and the operator filters of a query. */
function matches(row: Row, query: ListQuery | undefined): boolean {
  if (!query) return true;
  if (query.includeDeleted !== true && row.deleted_at != null) return false;
  for (const [column, value] of Object.entries(query.where ?? {})) {
    if (value !== undefined && row[column] !== value) return false;
  }
  for (const [column, condition] of Object.entries(query.conditions ?? {})) {
    if (!passes(row[column], condition)) return false;
  }
  return true;
}

function passes(value: unknown, condition: FilterCondition): boolean {
  if (condition.equals !== undefined && value !== condition.equals) return false;
  if (condition.notEquals !== undefined && value === condition.notEquals) return false;
  if (condition.in !== undefined && !condition.in.includes(value)) return false;
  if (condition.isNull === true && value != null) return false;
  if (condition.isNull === false && value == null) return false;
  return true;
}

/** Builds a repository double over the given rows. */
export function createPromotionRepositoryDouble(seed: DoubleRows = {}): PromotionRepositoryDouble {
  const rows: Record<string, Row[]> = Object.fromEntries(
    Object.entries(seed).map(([entity, entityRows]) => [entity, (entityRows ?? []).map((row) => ({ ...row }))])
  );
  const watchers = new Set<() => void>();
  let sequence = 1;
  let nextId = 0;

  const nextRowId = (): string => {
    nextId += 1;
    return `01930000-0000-7000-8000-${String(nextId).padStart(12, '0')}`;
  };

  const deliver = (): void => {
    sequence += 1;
    for (const watcher of watchers) watcher();
  };

  const repository: PromotionRepositoryDouble = {
    rows,
    get currentCommitSequence() {
      return sequence;
    },
    publish(entity, next) {
      rows[entity] = next.map((row) => ({ ...row }));
      deliver();
    },
    async get(entity, id) {
      const row = (rows[entity] ?? []).find((candidate) => candidate.id === id);
      return row && row.deleted_at == null ? { ...row } : null;
    },
    async list(entity, query) {
      const items = (rows[entity] ?? []).filter((row) => matches(row, query));
      return { items: items.map((row) => ({ ...row })), total: items.length, hasMore: false };
    },
    async create(entity, input) {
      const row: Row = {
        ...input,
        id: nextRowId(),
        rowVersion: 1,
        created_at: '2029-01-01T00:00:00.000Z',
        updated_at: '2029-01-01T00:00:00.000Z',
      };
      rows[entity] = [...(rows[entity] ?? []), row];
      deliver();
      return { ...row };
    },
    async update(entity, id, patch, options) {
      const current = (rows[entity] ?? []).find((candidate) => candidate.id === id);
      if (!current) throw new Error(`no ${entity} row with id ${id}`);
      if (options?.expectedVersion !== undefined && current.rowVersion !== options.expectedVersion) {
        throw new Error(`stale ${entity} row ${id}`);
      }
      const next: Row = {
        ...current,
        ...patch,
        rowVersion: Number(current.rowVersion ?? 1) + 1,
        updated_at: '2029-01-01T00:00:00.000Z',
      };
      rows[entity] = (rows[entity] ?? []).map((candidate) => (candidate.id === id ? next : candidate));
      deliver();
      return { ...next };
    },
    async remove(entity, id) {
      const current = (rows[entity] ?? []).find((candidate) => candidate.id === id);
      if (!current) throw new Error(`no ${entity} row with id ${id}`);
      rows[entity] = (rows[entity] ?? []).filter((candidate) => candidate.id !== id);
      deliver();
      return { ...current };
    },
    watch(entity, query, listener) {
      const run = () => listener((rows[entity] ?? []).filter((row) => matches(row, query)), sequence);
      run();
      watchers.add(run);
      return () => {
        watchers.delete(run);
      };
    },
    subscribe() {
      return () => undefined;
    },
    async whenIdle() {
      return undefined;
    },
    async transaction<T>(work: () => Promise<T>): Promise<T> {
      return work();
    },
  };

  return repository;
}
