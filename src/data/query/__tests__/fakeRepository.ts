// ABOUTME: A fake repository for the query layer tests: the watch contract of P1-B02 without
// ABOUTME: a database, so the cache can be driven through writes, events and tagged payloads.

import type {
  ChangeEvent,
  ChangeType,
  ListQuery,
  Page,
  RepositoryRow,
  Unsubscribe,
} from '@/data/repository';
import type { EntityName } from '@/domain/schema';

import type { QueryRepository, QueryWatchListener } from '../cache';

/** A row of the fake repository. */
export interface FakeRow {
  readonly id: string;
  readonly name: string;
  readonly deleted_at?: string | null;
  readonly archived?: boolean;
  readonly status?: string;
  readonly [field: string]: unknown;
}

interface Watcher {
  readonly entity: EntityName;
  readonly query: ListQuery;
  readonly listener: QueryWatchListener<FakeRow>;
}

/**
 * A repository double that honours the watch contract of P1-B02.
 *
 * A write allocates a commit sequence, emits the change event synchronously before the
 * write promise resolves and queues the watch delivery on a macrotask, so the payload
 * arrives after the write. Every payload carries the sequence it reflects.
 */
export class FakeRepository implements QueryRepository {
  private readonly rows = new Map<EntityName, FakeRow[]>();
  private readonly changeListeners = new Set<(event: ChangeEvent) => void>();
  private readonly watchers = new Set<Watcher>();
  private sequence = 0;
  private pending = 0;

  /** How many times `list` was called. */
  listCalls = 0;

  /** How many times a watch was subscribed. */
  watchSubscriptions = 0;

  /** When set, the next watch subscription fails. */
  failWatch = false;

  /** When set, the watch delivery reports an error instead of the rows. */
  failDelivery = false;

  get currentCommitSequence(): number {
    return this.sequence;
  }

  /** The rows of one entity. */
  rowsOf(entity: EntityName): readonly FakeRow[] {
    return this.rows.get(entity) ?? [];
  }

  /** Replaces the rows of one entity without touching the commit sequence. */
  seed(entity: EntityName, rows: readonly FakeRow[]): void {
    this.rows.set(entity, [...rows]);
  }

  async list<E extends EntityName>(
    entity: E,
    query?: ListQuery
  ): Promise<Page<RepositoryRow<E>>> {
    this.listCalls += 1;
    const items = this.filter(entity, query);
    return {
      items: items as unknown as RepositoryRow<E>[],
      total: items.length,
      hasMore: false,
    };
  }

  watch<E extends EntityName>(
    entity: E,
    query: ListQuery,
    listener: QueryWatchListener<RepositoryRow<E>>
  ): Unsubscribe {
    const watcher: Watcher = {
      entity,
      query,
      listener: listener as unknown as QueryWatchListener<FakeRow>,
    };
    this.watchers.add(watcher);
    this.watchSubscriptions += 1;
    if (this.failWatch) {
      this.watchers.delete(watcher);
      throw new Error('watch failed');
    }
    // The current page is delivered like a change, on a macrotask.
    this.schedule(() => this.deliverTo(watcher));
    return () => {
      this.watchers.delete(watcher);
    };
  }

  subscribe(listener: (event: ChangeEvent) => void): Unsubscribe {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  async whenIdle(): Promise<void> {
    while (this.pending > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  /**
   * A write.
   *
   * The commit sequence is allocated first, the change event is emitted synchronously
   * and the watch delivery is queued, so the payload arrives after the write resolved.
   */
  async write(
    entity: EntityName,
    row: FakeRow,
    type: ChangeType = 'create'
  ): Promise<FakeRow> {
    this.sequence += 1;
    const commitSequence = this.sequence;

    const current = this.rowsOf(entity).filter((candidate) => candidate.id !== row.id);
    this.rows.set(entity, [...current, row]);

    const event: ChangeEvent = {
      entity,
      type,
      ids: [row.id],
      origin: 'fake',
      commitSequence,
    };
    for (const listener of this.changeListeners) listener(event);

    this.schedule(() => this.deliverToEntity(entity));
    return row;
  }

  /** Removes a row, the way a soft delete does. */
  async archive(entity: EntityName, id: string): Promise<void> {
    const row = this.rowsOf(entity).find((candidate) => candidate.id === id);
    if (!row) return;
    await this.write(entity, { ...row, deleted_at: new Date().toISOString() }, 'remove');
  }

  /** Delivers a payload to the watchers of an entity right away. */
  deliver(entity: EntityName, rows: readonly FakeRow[], commitSequence?: number): void {
    for (const watcher of [...this.watchers]) {
      if (watcher.entity !== entity) continue;
      watcher.listener(rows, commitSequence);
    }
  }

  private filter(entity: EntityName, query?: ListQuery): readonly FakeRow[] {
    const where = query?.where ?? {};
    const searchTerm = query?.search?.term.trim().toLowerCase() ?? '';
    const searchFields = query?.search?.fields ?? [];
    return this.rowsOf(entity).filter((row) => {
      if (query?.includeDeleted !== true && row.deleted_at != null) return false;
      if (!Object.entries(where).every(([field, value]) => row[field] === value)) return false;
      if (!searchTerm) return true;
      return searchFields.some((field) =>
        String(row[field] ?? '').toLowerCase().includes(searchTerm)
      );
    });
  }

  private deliverTo(watcher: Watcher): void {
    if (this.failDelivery) {
      watcher.listener([], this.sequence, new Error('delivery failed'));
      return;
    }
    watcher.listener(this.filter(watcher.entity, watcher.query), this.sequence);
  }

  private deliverToEntity(entity: EntityName): void {
    for (const watcher of [...this.watchers]) {
      if (watcher.entity !== entity) continue;
      this.deliverTo(watcher);
    }
  }

  private schedule(work: () => void): void {
    this.pending += 1;
    setTimeout(() => {
      this.pending -= 1;
      work();
    }, 0);
  }
}
