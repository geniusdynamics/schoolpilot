// ABOUTME: The repository a scoped actor reads and writes through: the write scope is judged by the
// ABOUTME: authorizer, the read scope by the row every read passes through.

import type { Id } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  Repository,
  createRepository,
  type AuditEvent,
  type AuditQuery,
  type ListQuery,
  type Page,
  type RepositoryOptions,
  type RepositoryRow,
  type UpdateInput,
  type UpdateOptions,
  type WatchListener,
  type WriteOptions,
} from '@/data/repository';
import type { SqliteAdapter } from '@/data/adapters/sqlite';

import {
  createAuthorizer,
  resolvePermissionContext,
  ScopePermissionError,
  type PermissionContext,
} from './authorizer';
import { coversInstitution, coversRow, refinesRows, scopeFilterFor, type ScopeFilter } from './scope';
import { hasPermission, type Role } from './roles';

/** How the scoped repository is built. */
export interface ScopedRepositoryOptions extends RepositoryOptions {
  /** The context of the actor the repository acts for. */
  readonly context: PermissionContext;
}

/**
 * The repository of a scoped actor.
 *
 * The repository's `authorize` hook judges the permission and the scope of a write, because the
 * hook sees the row a write would store. A read has no such row: the hook only knows the id, so
 * the scope of a read is judged here, after the row was loaded. Both denials are explicit: they
 * raise a permission error naming the action and the reason.
 */
export class ScopedRepository extends Repository {
  private readonly context: PermissionContext;

  constructor(options: ScopedRepositoryOptions) {
    const { context, ...rest } = options;
    const authorizer = rest.authorize ?? createAuthorizer(context);
    super({ ...rest, authorize: authorizer });
    this.context = context;
  }

  /** The context the repository acts for. */
  get permissionContext(): PermissionContext {
    return this.context;
  }

  /** Reads one row, and refuses a row outside the actor's scope. */
  async get<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options: { readonly includeDeleted?: boolean } = {}
  ): Promise<RepositoryRow<E> | null> {
    const row = await super.get(entity, id, options);
    if (!row) return null;
    if (!this.covers(entity, row)) throw this.denied(entity, 'read');
    return this.project(entity, row);
  }

  /**
   * Reads a page of rows, narrowed to the actor's scope.
   *
   * The scope filter runs in SQL, so the page and its total stay honest. The entities whose rule
   * needs a second column - the mark of another learning area, the assessment of another learning
   * area - are judged row by row on top of the filter, and the total counts the rows that passed.
   */
  async list<E extends EntityName>(
    entity: E,
    query: ListQuery = {}
  ): Promise<Page<RepositoryRow<E>>> {
    const filter = scopeFilterFor(this.context.scope, entity);
    if (!refinesRows(this.context.scope, entity)) {
      const merged = mergeScopeQuery(query, filter);
      if (merged) {
        const page = await super.list(entity, merged);
        return { ...page, items: page.items.map((row) => this.project(entity, row)) };
      }
    }
    return this.narrowedList(entity, query, filter);
  }

  /**
   * Patches a row, and refuses a row outside the actor's scope.
   *
   * The stored row is judged before the patch is applied: a patch that would move a row out of
   * another group cannot start from a row the actor may not touch. The merged row is judged by
   * the authorizer, inside the write.
   */
  async update<E extends EntityName>(
    entity: E,
    id: Id<E>,
    patch: UpdateInput<E>,
    options: UpdateOptions
  ): Promise<RepositoryRow<E>> {
    const row = await super.get(entity, id);
    if (row && !this.covers(entity, row)) throw this.denied(entity, 'update');
    return super.update(entity, id, patch, options);
  }

  /** Removes a row, and refuses a row outside the actor's scope. */
  async remove<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options: WriteOptions & { readonly expectedVersion?: number } = {}
  ): Promise<RepositoryRow<E>> {
    const row = await super.get(entity, id);
    if (row && !this.covers(entity, row)) throw this.denied(entity, 'remove');
    // The repository asks the authorizer about the removal itself, with the row it would store.
    return super.remove(entity, id, options);
  }

  /** Watches a query; the payload holds the rows of the actor's scope only. */
  watch<E extends EntityName>(
    entity: E,
    listener: WatchListener<RepositoryRow<E>>
  ): () => void;
  watch<E extends EntityName>(
    entity: E,
    query: ListQuery,
    listener: WatchListener<RepositoryRow<E>>
  ): () => void;
  watch<E extends EntityName>(
    entity: E,
    queryOrListener: ListQuery | WatchListener<RepositoryRow<E>>,
    maybeListener?: WatchListener<RepositoryRow<E>>
  ): () => void {
    const query = typeof queryOrListener === 'function' ? {} : queryOrListener;
    const listener = typeof queryOrListener === 'function' ? queryOrListener : maybeListener;
    if (!listener) throw new Error('watch needs a listener');

    const filtered: WatchListener<RepositoryRow<E>> = (rows, commitSequence) => {
      listener(
        rows
          .filter((row) => this.covers(entity, row))
          .map((row) => this.project(entity, row)),
        commitSequence
      );
    };
    return super.watch(entity, query, filtered);
  }

  /** The audit trail of one row, and refuses a row outside the actor's scope. */
  async auditTrail(entity: EntityName, entityId: string): Promise<readonly AuditEvent[]> {
    const row = await this.rowFor(entity, entityId);
    if (row && !this.covers(entity, row)) throw this.denied(entity, 'audit');
    return super.auditTrail(entity, entityId);
  }

  /**
   * The audit trail of an entity, narrowed to the rows of the actor's scope.
   *
   * The trail of a whole database names rows the actor may not read, so the events are judged by
   * the row they describe: the payload of the event carries the row, and the scope decides whether
   * the event is returned.
   */
  async auditLog(query: AuditQuery = {}): Promise<readonly AuditEvent[]> {
    if (query.entity === undefined) {
      // The trail of the whole database is only reachable by the roles whose scope covers the
      // institution, and only with the permission to read a trail at all.
      if (
        !hasPermission(this.context.roles, 'audit.read') ||
        !coversInstitution(this.context.scope)
      ) {
        throw this.denied(
          'institution',
          'audit',
          'the audit trail of the whole database is only reachable by the roles whose scope covers the institution'
        );
      }
    }
    const events = await super.auditLog(query);
    return events.filter((event) => this.coversEvent(event));
  }

  // ---------------------------------------------------------------- internals

  private covers(entity: EntityName, row: Readonly<Record<string, unknown>>): boolean {
    return coversRow(this.context.scope, entity, row);
  }

  /**
   * The row a change event describes.
   *
   * The event carries the row before and after the change, so the scope can be judged without
   * reading the row again.
   */
  private coversEvent(event: AuditEvent): boolean {
    const payload = (event.after ?? event.before) as Record<string, unknown> | null;
    if (!payload || typeof payload !== 'object') return false;
    return this.covers(event.entity, payload);
  }

  /**
   * The field policy of a row.
   *
   * The medical record and the disability support notes of a learner are both special/restricted
   * data (spec 06 §8.1), so both are handed only to the roles that hold `learner.medical.read`;
   * the row of every other role is stripped of them.
   */
  private project<E extends EntityName>(entity: E, row: RepositoryRow<E>): RepositoryRow<E> {
    if (entity !== 'learner') return row;
    if (hasPermission(this.context.roles, 'learner.medical.read')) return row;
    return withoutRestrictedLearnerFields(row);
  }

  private denied(entity: EntityName, action: string, detail?: string): ScopePermissionError {
    return new ScopePermissionError(
      entity,
      action,
      'scope',
      detail ??
        `the ${entity} row is outside the scope of the roles [${this.context.roles.join(', ')}]`
    );
  }

  private async rowFor(entity: EntityName, entityId: string): Promise<RepositoryRow<EntityName> | null> {
    const page = await super.list(entity, { where: { id: entityId }, limit: 1 });
    return page.items[0] ?? null;
  }

  /**
   * The page of an entity whose rows are judged one by one.
   *
   * The total counts the rows that passed the scope, not the rows of the page, and the cursor
   * points at the next row of that narrowed set.
   */
  private async narrowedList<E extends EntityName>(
    entity: E,
    query: ListQuery,
    filter: ScopeFilter
  ): Promise<Page<RepositoryRow<E>>> {
    const limit = pageLimit(query.limit);
    const offset = pageOffset(query);
    const candidates = await this.candidates(entity, query, filter);
    const narrowed = candidates.filter((row) => this.covers(entity, row));
    const items = narrowed.slice(offset, offset + limit).map((row) => this.project(entity, row));
    const hasMore = offset + items.length < narrowed.length;
    return {
      items,
      total: narrowed.length,
      hasMore,
      ...(hasMore ? { nextCursor: encodeOffset(offset + items.length) } : {}),
    };
  }

  /** Every row the scope filter admits. */
  private async candidates<E extends EntityName>(
    entity: E,
    query: ListQuery,
    filter: ScopeFilter
  ): Promise<RepositoryRow<E>[]> {
    const scan: ListQuery = { ...query, cursor: undefined, offset: undefined };
    const scoped = mergeScopeQuery(scan, filter) ?? scan;
    const rows: RepositoryRow<E>[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await super.list(entity, { ...scoped, cursor, limit: MAX_LIMIT });
      rows.push(...page.items);
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }
    return rows;
  }
}

/**
 * Merges the scope filter into the caller's query.
 *
 * Returns null when the caller's own condition on the scope column cannot be expressed together
 * with the scope, so the caller filters the rows itself.
 */
function mergeScopeQuery(query: ListQuery, filter: ScopeFilter): ListQuery | null {
  const conditions = query.conditions ?? {};
  const existing = conditions[filter.column];

  if (!existing) {
    return {
      ...query,
      conditions: { ...conditions, [filter.column]: { in: [...filter.values] } },
    };
  }

  if (existing.in !== undefined) {
    const allowed = existing.in.filter((value) => filter.values.includes(String(value)));
    return {
      ...query,
      conditions: { ...conditions, [filter.column]: { in: allowed } },
    };
  }

  if (existing.equals !== undefined) {
    const value = String(existing.equals);
    return {
      ...query,
      conditions: {
        ...conditions,
        [filter.column]: { in: filter.values.includes(value) ? [value] : [] },
      },
    };
  }

  if (existing.isNull === true) {
    // A null key is never inside the scope.
    return { ...query, conditions: { ...conditions, [filter.column]: { in: [] } } };
  }

  if (existing.isNull === false) {
    return {
      ...query,
      conditions: { ...conditions, [filter.column]: { in: [...filter.values] } },
    };
  }

  return null;
}

/** The learner row without the fields only a role holding the medical permission may read. */
function withoutRestrictedLearnerFields<E extends EntityName>(
  row: RepositoryRow<E>
): RepositoryRow<E> {
  const copy: Record<string, unknown> = { ...row };
  delete copy.medical;
  delete copy.special_needs;
  return copy as unknown as RepositoryRow<E>;
}

/** The number of rows a page holds, within the limits of the repository. */
function pageLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(Math.trunc(limit), MAX_LIMIT));
}

/** The offset a page starts at. */
function pageOffset(query: ListQuery): number {
  if (query.cursor !== undefined) return decodeOffset(query.cursor);
  return Math.max(0, query.offset ?? 0);
}

/**
 * The cursor of the narrowed set.
 *
 * It carries the same shape as the cursor of the repository - an offset - so a caller that hands
 * it back keeps paging through the rows that passed the scope.
 */
function encodeOffset(offset: number): string {
  return btoa(`offset:${offset}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The offset a cursor of the narrowed set carries. */
function decodeOffset(cursor: string): number {
  try {
    const decoded = atob(cursor.replace(/-/g, '+').replace(/_/g, '/'));
    const match = /^offset:(\d+)$/.exec(decoded);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

/** How the authorised repository is built. */
export interface AuthorizedRepositoryOptions {
  readonly adapter: SqliteAdapter;
  /** The acting user. */
  readonly actorId: string;
  /** The roles the actor holds. */
  readonly roles: readonly Role[];
  /** The entities the repository serves. Defaults to every registered entity. */
  readonly entities?: readonly EntityName[];
  /** The date the scope is effective at. Defaults to today. */
  readonly at?: string;
  /** The clock. Injectable so a caller can pin the timestamps. */
  readonly now?: () => Date;
  /** Called when a watch listener throws. */
  readonly onListenerError?: (error: unknown) => void;
}

/** The authorised repository and the context it acts for. */
export interface AuthorizedRepository {
  readonly repository: ScopedRepository;
  readonly context: PermissionContext;
}

/**
 * Builds the repository an actor works through.
 *
 * The scope is resolved first, through a reader without the authorisation hook: the resolution
 * is a privileged read of the assignment data, and it cannot run against a repository that
 * already denies the actor. The repository that follows carries the authorizer, so every write is
 * judged against the resolved scope.
 */
export async function createAuthorizedRepository(
  options: AuthorizedRepositoryOptions
): Promise<AuthorizedRepository> {
  const reader = createRepository({
    adapter: options.adapter,
    entities: options.entities,
    now: options.now,
  });
  await reader.setup();

  const context = await resolvePermissionContext({
    actorId: options.actorId,
    roles: options.roles,
    reader,
    at: options.at,
  });

  const repository = new ScopedRepository({
    adapter: options.adapter,
    entities: options.entities,
    actor: options.actorId,
    now: options.now,
    onListenerError: options.onListenerError,
    context,
  });
  await repository.setup();

  return { repository, context };
}
