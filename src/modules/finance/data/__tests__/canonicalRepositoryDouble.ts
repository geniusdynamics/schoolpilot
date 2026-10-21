// ABOUTME: The writable repository double the finance page tests run against: seeded canonical rows,
// ABOUTME: the repository's records, and the posting freeze and allocation limit enforced like the real one.

import type { QueryRepository, QueryWatchListener } from '@/data/query';
import {
  RepositoryInvariantError,
  RepositoryNotFoundError,
  type ChangeEvent,
  type CreateInput,
  type ListQuery,
  type Page,
  type RepositoryRow,
  type Unsubscribe,
  type UpdateInput,
  type UpdateOptions,
  type WriteOptions,
} from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';

export type FakeRepositoryRows = Partial<Record<EntityName, readonly Record<string, unknown>[]>>;

/** A repository that serves seeded rows, records writes and enforces the posted-document freeze. */
export interface FinanceRepositoryDouble extends QueryRepository {
  readonly rows: FakeRepositoryRows;
  readonly requested: EntityName[];
  readonly writes: { entity: EntityName; action: 'create' | 'update' | 'remove'; id?: string }[];
  readonly publish: (entity: EntityName, rows: readonly Record<string, unknown>[]) => void;
  get<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: { readonly includeDeleted?: boolean }
  ): Promise<RepositoryRow<E> | null>;
  create<E extends EntityName>(
    entity: E,
    input: CreateInput<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>>;
  update<E extends EntityName>(
    entity: E,
    id: Id<E>,
    patch: UpdateInput<E>,
    options: UpdateOptions
  ): Promise<RepositoryRow<E>>;
  remove<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options?: WriteOptions
  ): Promise<RepositoryRow<E>>;
}

type StoredRow = Record<string, unknown> & { id: string; rowVersion: number; deleted_at?: string | null };

const FROZEN_AFTER_POSTING: Partial<
  Record<EntityName, { readonly statuses: readonly string[]; readonly fields: readonly string[] }>
> = {
  invoice: {
    statuses: ['posted', 'partially_paid', 'paid', 'void'],
    fields: [
      'number',
      'issue_date',
      'total',
      'learner_id',
      'payer_guardian_id',
      'household_id',
      'academic_period_id',
    ],
  },
  payment: {
    statuses: ['posted', 'cleared', 'bounced', 'reversed'],
    fields: [
      'amount',
      'received_at',
      'channel',
      'payer_guardian_id',
      'learner_id',
      'household_id',
      'reference',
      'external_reference',
      'exchange_rate',
      'base_amount',
    ],
  },
  credit_note: {
    statuses: ['posted', 'void'],
    fields: ['number', 'issue_date', 'amount', 'learner_id', 'invoice_id', 'reason'],
  },
  refund: {
    statuses: ['approved', 'paid', 'rejected'],
    fields: ['number', 'amount', 'requested_at', 'payment_id', 'learner_id', 'reason'],
  },
};

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function moneyMinor(value: unknown): number {
  if (value === null || typeof value !== 'object') return 0;
  const amount = (value as { amount_minor?: unknown }).amount_minor;
  return typeof amount === 'number' ? amount : 0;
}

function matching(
  rows: readonly StoredRow[],
  query: ListQuery | undefined
): readonly StoredRow[] {
  const where = query?.where ?? {};
  const filters = Object.entries(where).filter(([, value]) => value !== undefined);
  return rows.filter(
    (row) =>
      (query?.includeDeleted === true || !row.deleted_at) &&
      filters.every(([column, value]) => row[column] === value)
  );
}

/** Builds the writable repository double over the given rows. */
export function createFinanceRepositoryDouble(
  seed: FakeRepositoryRows = {}
): FinanceRepositoryDouble {
  const rows: Record<string, StoredRow[]> = {};
  for (const [entity, entityRows] of Object.entries(seed)) {
    rows[entity] = (entityRows ?? []).map((row) => ({
      ...row,
      rowVersion: typeof row.rowVersion === 'number' ? row.rowVersion : 1,
    })) as StoredRow[];
  }
  const requested: EntityName[] = [];
  const writes: FinanceRepositoryDouble['writes'] = [];
  interface WatchEntry {
    readonly query: ListQuery;
    readonly listener: (query: ListQuery, rows: readonly StoredRow[]) => void;
  }
  const watchers = new Map<EntityName, Set<WatchEntry>>();
  const subscribers = new Set<(event: ChangeEvent) => void>();
  let sequence = 1;
  let nextId = 0;

  const entityRows = (entity: EntityName): StoredRow[] => {
    rows[entity] ??= [];
    return rows[entity] as StoredRow[];
  };

  const deliver = (entity: EntityName) => {
    sequence += 1;
    const event: ChangeEvent = {
      entity,
      type: 'update',
      ids: [],
      origin: 'test',
      commitSequence: sequence,
    };
    for (const subscriber of subscribers) subscriber(event);
    for (const entry of watchers.get(entity) ?? []) {
      entry.listener(entry.query, matching(entityRows(entity), entry.query));
    }
  };

  const freeze = (entity: EntityName, before: StoredRow, patch: Record<string, unknown>) => {
    const rule = FROZEN_AFTER_POSTING[entity];
    const status = before.status;
    if (!rule || typeof status !== 'string' || !rule.statuses.includes(status)) return;
    const nextStatus = patch.status;
    if (typeof nextStatus === 'string' && nextStatus !== status && !rule.statuses.includes(nextStatus)) {
      throw new RepositoryInvariantError(entity, `${entity}.posted_immutable`, [
        { path: 'status', message: 'a posted document is never un-posted' },
      ]);
    }
    const changed = rule.fields.filter(
      (field) => field in patch && !sameValue(patch[field], before[field])
    );
    if (changed.length > 0) {
      throw new RepositoryInvariantError(
        entity,
        `${entity}.posted_immutable`,
        changed.map((path) => ({ path, message: 'a posted document is immutable' }))
      );
    }
  };

  const checkAllocations = (entity: EntityName, candidate: Record<string, unknown>, id?: string) => {
    if (entity !== 'payment_allocation') return;
    const paymentId = candidate.payment_id;
    if (typeof paymentId !== 'string') return;
    const payment = entityRows('payment').find((row) => row.id === paymentId);
    if (!payment) throw new RepositoryNotFoundError('payment', paymentId);
    const allocated = entityRows('payment_allocation')
      .filter((row) => row.payment_id === paymentId && row.id !== id && !row.deleted_at)
      .reduce((total, row) => total + moneyMinor(row.amount), 0);
    if (allocated + moneyMinor(candidate.amount) > moneyMinor(payment.amount)) {
      throw new RepositoryInvariantError('payment_allocation', 'payment_allocation.within_payment', [
        {
          path: 'amount',
          message: 'the allocations of this payment exceed the amount that was paid',
        },
      ]);
    }
  };

  const repository: FinanceRepositoryDouble = {
    get rows() {
      return rows;
    },
    requested,
    writes,
    get currentCommitSequence() {
      return sequence;
    },
    async get<E extends EntityName>(entity: E, id: Id<E>): Promise<RepositoryRow<E> | null> {
      requested.push(entity);
      const row = entityRows(entity).find((candidate) => candidate.id === id && !candidate.deleted_at);
      return (row ?? null) as RepositoryRow<E> | null;
    },
    async list<E extends EntityName>(entity: E, query?: ListQuery): Promise<Page<RepositoryRow<E>>> {
      requested.push(entity);
      const items = matching(entityRows(entity), query) as readonly RepositoryRow<E>[];
      return { items, total: items.length, hasMore: false };
    },
    watch<E extends EntityName>(
      entity: E,
      query: ListQuery,
      listener: QueryWatchListener<RepositoryRow<E>>
    ): Unsubscribe {
      requested.push(entity);
      const delivery = (nextQuery: ListQuery, nextRows: readonly StoredRow[]) =>
        listener(matching(nextRows, nextQuery) as readonly RepositoryRow<E>[], sequence);
      delivery(query, entityRows(entity));
      const entry: WatchEntry = { query, listener: delivery };
      const set = watchers.get(entity) ?? new Set<WatchEntry>();
      set.add(entry);
      watchers.set(entity, set);
      return () => {
        set.delete(entry);
      };
    },
    subscribe(listener: (event: ChangeEvent) => void): Unsubscribe {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },
    publish(entity: EntityName, next: readonly Record<string, unknown>[]) {
      rows[entity] = next.map((row) => ({ ...row, rowVersion: 1 })) as StoredRow[];
      deliver(entity);
    },
    async create<E extends EntityName>(
      entity: E,
      input: CreateInput<E>
    ): Promise<RepositoryRow<E>> {
      const payload: Record<string, unknown> = { ...(input as unknown as Record<string, unknown>) };
      nextId += 1;
      const row: StoredRow = {
        ...payload,
        id: `${entity}-${nextId}`,
        rowVersion: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      checkAllocations(entity, row);
      entityRows(entity).push(row);
      writes.push({ entity, action: 'create', id: row.id });
      deliver(entity);
      return row as RepositoryRow<E>;
    },
    async update<E extends EntityName>(
      entity: E,
      id: Id<E>,
      patch: UpdateInput<E>,
      options: UpdateOptions
    ): Promise<RepositoryRow<E>> {
      const list = entityRows(entity);
      const index = list.findIndex((row) => row.id === id && !row.deleted_at);
      if (index < 0) throw new RepositoryNotFoundError(entity, id);
      const before = list[index] as StoredRow;
      if (before.rowVersion !== options.expectedVersion) {
        throw new Error(`stale version: expected ${options.expectedVersion}, found ${before.rowVersion}`);
      }
      const changes = patch as unknown as Record<string, unknown>;
      freeze(entity, before, changes);
      const after: StoredRow = {
        ...before,
        ...changes,
        rowVersion: before.rowVersion + 1,
        updated_at: new Date().toISOString(),
      };
      checkAllocations(entity, after, id);
      list[index] = after;
      writes.push({ entity, action: 'update', id });
      deliver(entity);
      return after as RepositoryRow<E>;
    },
    async remove<E extends EntityName>(entity: E, id: Id<E>): Promise<RepositoryRow<E>> {
      const list = entityRows(entity);
      const index = list.findIndex((row) => row.id === id && !row.deleted_at);
      if (index < 0) throw new RepositoryNotFoundError(entity, id);
      const before = list[index] as StoredRow;
      // A posted document cannot be edited and cannot be erased either, exactly as the repository
      // withholds the removal.
      const rule = FROZEN_AFTER_POSTING[entity];
      const status = before.status;
      if (rule && typeof status === 'string' && rule.statuses.includes(status)) {
        throw new RepositoryInvariantError(entity, `${entity}.posted_immutable`, [
          { path: 'status', message: `a ${status} ${entity} cannot be removed; post a reversal instead` },
        ]);
      }
      const removed = { ...before, deleted_at: new Date().toISOString() } as StoredRow;
      list[index] = removed;
      writes.push({ entity, action: 'remove', id });
      deliver(entity);
      return removed as RepositoryRow<E>;
    },
  };

  return repository;
}

/** A learner id the tests can reuse without repeating the literal. */
export const TEST_LEARNER_ID = asId<'learner'>('11111111-1111-7111-8111-111111111111');
