// ABOUTME: The typed repository over the canonical entity registry: get, list, create, update,
// ABOUTME: remove and watch, with schema validation, referential integrity, audit events and
// ABOUTME: optimistic concurrency.

import { asId, generateUuidv7, isId, type Id } from '@/domain/ids';
import { ENTITY_NAMES, type EntityName, type EntityRow } from '@/domain/schema';
import {
  applyCanonicalSchema,
  SqliteAdapterError,
  type SqliteAdapter,
  type SqliteBindValue,
  type SqliteRow,
  type SqliteTransaction,
} from '@/data/adapters/sqlite';

import {
  applyAuditSchema,
  readAuditEntities,
  readAuditEvents,
  readMaxAuditSequence,
  writeAuditEvent,
  type AuditRunner,
} from './audit';
import { columnsFor, decodeRow, encodeRow } from './columns';
import {
  ensureConcurrencyColumns,
  INITIAL_VERSION,
} from './concurrency';
import {
  RepositoryConflictError,
  RepositoryError,
  RepositoryNotFoundError,
  RepositoryPermissionError,
  RepositoryStorageError,
  RepositoryValidationError,
} from './errors';
import { guardsFor, guardsForRemoval } from './invariants';
import {
  buildOrder,
  buildWhere,
  clampLimit,
  encodeCursor,
  pageOffset,
} from './query';
import {
  entitySchema,
  fieldIssue,
  isServerOwnedField,
  issuesFromZodError,
} from './schemas';
import { mapStorageError, mapWriteError } from './storageErrors';
import type {
  AuditEvent,
  AuditQuery,
  AuthorizationRequest,
  Authorizer,
  ChangeEvent,
  ChangeType,
  CreateInput,
  ListQuery,
  Page,
  RepositoryRow,
  UpdateInput,
  Unsubscribe,
  UpdateOptions,
  WatchListener,
  WriteOptions,
  WritableFields,
} from './types';

export type { CreateInput, UpdateInput, WritableFields };

/** How a repository is built. */
export interface RepositoryOptions {
  /** The storage adapter every statement runs on. */
  readonly adapter: SqliteAdapter;
  /** The entities the repository serves. Defaults to every registered entity. */
  readonly entities?: readonly EntityName[];
  /** The acting user id used when a write does not name one. */
  readonly actor?: string;
  /** Decides whether an action is allowed; throwing denies it. */
  readonly authorize?: Authorizer;
  /** The clock. Injectable so a caller can pin the timestamps. */
  readonly now?: () => Date;
  /** Called when a watch listener throws. */
  readonly onListenerError?: (error: unknown) => void;
}

interface Watcher {
  readonly entity: EntityName;
  readonly query: ListQuery;
  readonly listener: WatchListener<never>;
}

/**
 * The transaction a write joins while one is open.
 *
 * The events of the writes that joined it are held here until the transaction commits:
 * a watcher must never see a change that a later failure rolls back.
 */
interface AmbientTransaction {
  readonly tx: SqliteTransaction;
  readonly events: ChangeEvent[];
  /** Resolves when the transaction is over: committed or rolled back. */
  readonly done: Promise<void>;
}

/**
 * The typed repository.
 *
 * Every method works on the canonical entity registry, so one implementation serves all
 * 63 entities: validation runs the entity's own zod schema, the storage mapping follows
 * the entity's canonical column types, and the invariants of spec 02 §12 are enforced in
 * the write path.
 */
export class Repository {
  private readonly adapter: SqliteAdapter;
  private readonly entities: readonly EntityName[];
  private readonly defaultActor: string | undefined;
  private readonly authorize: Authorizer | undefined;
  private readonly clock: () => Date;
  private readonly onListenerError: ((error: unknown) => void) | undefined;

  private readonly changeListeners = new Set<(event: ChangeEvent) => void>();
  private readonly watchers = new Map<EntityName, Set<Watcher>>();
  private readonly pendingEntities = new Set<EntityName>();
  private deliveryChain: Promise<void> = Promise.resolve();
  private commitSequence = 0;
  /** The transaction a write joins while one is open; null when there is none. */
  private ambient: AmbientTransaction | null = null;
  /**
   * The transaction in flight, if any.
   *
   * It spans the commit, not only the callback, so a read of the committed state can
   * wait for the transaction to be over instead of joining it.
   */
  private inFlight: { readonly done: Promise<void> } | null = null;

  constructor(options: RepositoryOptions) {
    this.adapter = options.adapter;
    this.entities = options.entities ?? ENTITY_NAMES;
    this.defaultActor = options.actor;
    this.authorize = options.authorize;
    this.clock = options.now ?? (() => new Date());
    this.onListenerError = options.onListenerError;
  }

  /**
   * Prepares the database: foreign keys on, the canonical DDL, the concurrency columns
   * and the audit table. Idempotent, so it is safe to call on every start.
   */
  async setup(): Promise<void> {
    await this.adapter.exec('PRAGMA foreign_keys = ON');
    const [pragma] = await this.adapter.all<{ foreign_keys: number }>('PRAGMA foreign_keys');
    if (!pragma || pragma.foreign_keys !== 1) {
      throw new RepositoryStorageError(
        undefined,
        'the connection does not enforce foreign keys, so referential integrity cannot be guaranteed'
      );
    }

    await applyCanonicalSchema(this.adapter, this.entities);
    await ensureConcurrencyColumns(this.adapter, this.entities);
    await applyAuditSchema(this.adapter);
    // The trail can hold events written by something else (the repair tool numbers its own from
    // the table), so the counter starts where the table already is.
    this.commitSequence = await readMaxAuditSequence(this.adapter);
  }

  /** The commit sequence of the last write. */
  get currentCommitSequence(): number {
    return this.commitSequence;
  }

  /**
   * Runs a callback inside one transaction.
   *
   * A write made while the callback runs joins this transaction instead of opening its
   * own, so several rows land together or not at all. The adapter refuses nested
   * transactions, so the join is the only way a service can write several rows
   * atomically.
   *
   * A read made while the callback runs joins it too, so it sees the rows the
   * transaction wrote but has not committed yet. A read that has to show the committed
   * state - a watch delivery - waits for the transaction to be over instead.
   *
   * The change events of the writes that joined are delivered when the transaction
   * commits, never inside it: a watcher must never see a change that a later failure
   * rolls back. Their order is the order the writes happened in, and their commit
   * sequences stay monotonic.
   *
   * A callback that throws rolls the whole transaction back and rethrows. The audit rows
   * of the writes that joined roll back with it, so a failed transaction leaves no
   * trail. The repository is usable again straight after: the ambient transaction is
   * released whatever the callback did.
   *
   * A write issued while the callback runs joins the transaction, whatever asked for it. The
   * repository is the unit of the write, so there is one ambient transaction at a time; a
   * transaction opened inside another joins it instead of opening a second one, which the
   * adapter would refuse.
   */
  async transaction<T>(work: (tx: SqliteTransaction) => Promise<T>): Promise<T> {
    // A service called inside a transaction joins it instead of opening a second one. The adapter
    // refuses a nested transaction, and a guardian created while a learner is being admitted is the
    // ordinary case, not an edge one: without this, "admit a learner and their guardian" throws.
    if (this.ambient) return work(this.ambient.tx);

    const events: ChangeEvent[] = [];
    const done = deferred();
    this.inFlight = { done: done.promise };

    let result: T;
    try {
      result = await this.adapter.transaction(async (tx) => {
        const previous = this.ambient;
        this.ambient = { tx, events, done: done.promise };
        try {
          return await work(tx);
        } finally {
          this.ambient = previous;
        }
      });
    } catch (error) {
      // A nested transaction is a mistake in the calling code, not a storage failure, so
      // it keeps the adapter's own error.
      if (error instanceof SqliteAdapterError && error.code === 'nested_transaction') {
        throw error;
      }
      if (error instanceof RepositoryError) throw error;
      throw mapStorageError(undefined, error);
    } finally {
      this.inFlight = null;
      done.resolve();
    }

    // The transaction committed, so the events of the writes that joined it are
    // delivered now, in the order the writes happened.
    for (const event of events) {
      this.emitChangeEvent(event);
      this.scheduleDelivery(event.entity);
    }

    return result;
  }

  /**
   * The handle a read runs on.
   *
   * A read made while a transaction callback runs joins that transaction, so it sees the
   * rows the transaction wrote but has not committed yet. Outside a transaction the read
   * runs on the adapter, exactly as before.
   */
  private reader(): SqliteTransaction {
    return this.ambient?.tx ?? this.adapter;
  }

  /**
   * The handle a read of the committed state runs on.
   *
   * A watch delivery must not show the rows an open transaction has not committed, so it
   * waits for the transaction in flight to be over and then reads through the adapter.
   */
  private async committedReader(): Promise<SqliteTransaction> {
    for (;;) {
      const inFlight = this.inFlight;
      if (!inFlight) return this.adapter;
      await inFlight.done;
    }
  }

  /** Reads one row. Soft-deleted rows are hidden unless `includeDeleted` is set. */
  async get<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options: { readonly includeDeleted?: boolean } = {}
  ): Promise<RepositoryRow<E> | null> {
    this.assertId(entity, id);
    this.checkPermission({ action: 'read', entity, id });

    const columns = columnsFor(entity);
    const raw = await this.reader().get<SqliteRow>(
      `SELECT * FROM "${columns.table}" WHERE "${columns.primaryKey}" = ?`,
      [id]
    );
    if (!raw) return null;

    const decoded = decodeRow(columns, raw);
    if (!options.includeDeleted && decoded.row.deleted_at) return null;

    return toRepositoryRow(entity, decoded.row, decoded.version);
  }

  /** Reads a page of rows. */
  async list<E extends EntityName>(
    entity: E,
    query: ListQuery = {}
  ): Promise<Page<RepositoryRow<E>>> {
    this.checkPermission({ action: 'list', entity });
    return this.readPage(entity, query);
  }

  /**
   * Creates a row.
   *
   * The repository owns the id, the timestamps and the actor, so a payload that carries
   * them is rejected. The assembled row is validated with the entity's own schema.
   */
  async create<E extends EntityName>(
    entity: E,
    input: CreateInput<E>,
    options: WriteOptions = {}
  ): Promise<RepositoryRow<E>> {
    const actor = options.actor ?? this.defaultActor;
    const now = this.timestamp();
    const commitSequence = this.nextCommitSequence();

    this.rejectServerOwnedFields(entity, input as Readonly<Record<string, unknown>>);

    const assembled = {
      ...(input as Readonly<Record<string, unknown>>),
      id: generateUuidv7(),
      created_at: now,
      updated_at: now,
      created_by: actor,
      updated_by: actor,
    };

    const row = this.validateRow(entity, assembled);
    this.checkPermission({ action: 'create', entity, row });

    const columns = columnsFor(entity);
    const encoded = encodeRow(columns, row);
    encoded[columns.concurrencyColumn] = INITIAL_VERSION;

    await this.runWrite(
      entity,
      async (tx) => {
        await this.runGuards(tx, entity, 'create', null, row);
        await this.writeStatement(
          tx,
          entity,
          insertStatement(columns, encoded),
          Object.values(encoded),
          encoded
        );
        await writeAuditEvent(tx, {
          entity,
          entityId: row.id,
          action: 'create',
          actorId: actor ?? null,
          changedFields: Object.keys(row),
          before: null,
          after: row,
          reason: options.reason ?? null,
          createdAt: now,
          commitSequence,
        });
      },
      () => this.changeEvent(entity, 'create', [row.id], options.origin, commitSequence)
    );

    return toRepositoryRow(entity, row, INITIAL_VERSION);
  }

  /**
   * Applies a partial patch to a row.
   *
   * The caller's expected version is mandatory: the write only lands when the row still
   * carries that version, so two writers cannot silently overwrite each other.
   */
  async update<E extends EntityName>(
    entity: E,
    id: Id<E>,
    patch: UpdateInput<E>,
    options: UpdateOptions
  ): Promise<RepositoryRow<E>> {
    this.assertId(entity, id);
    const actor = options.actor ?? this.defaultActor;
    const now = this.timestamp();
    const commitSequence = this.nextCommitSequence();
    const expectedVersion = options.expectedVersion;

    this.rejectServerOwnedFields(entity, patch as Readonly<Record<string, unknown>>);

    const columns = columnsFor(entity);
    let version = INITIAL_VERSION;
    let stored: Record<string, unknown> = {};

    await this.runWrite(
      entity,
      async (tx) => {
        const raw = await tx.get<SqliteRow>(
          `SELECT * FROM "${columns.table}" WHERE "${columns.primaryKey}" = ?`,
          [id]
        );
        if (!raw) throw new RepositoryNotFoundError(entity, id);

        const current = decodeRow(columns, raw);
        // An archived row is out of the default view, so it is out of reach for a write.
        if (current.row.deleted_at) throw new RepositoryNotFoundError(entity, id);
        if (current.version !== expectedVersion) {
          throw new RepositoryConflictError(
            entity,
            'stale_version',
            `${entity} ${id} has version ${current.version}, but the write expected ${expectedVersion}`,
            { id, expectedVersion, actualVersion: current.version }
          );
        }

        const merged: Record<string, unknown> = {
          ...current.row,
          ...definedEntries(patch as Readonly<Record<string, unknown>>),
        };
        merged.updated_at = now;
        // Without an actor the row keeps the actor of the last write that named one.
        if (actor !== undefined) merged.updated_by = actor;

        const row = this.validateRow(entity, merged);
        this.checkPermission({ action: 'update', entity, id, row });

        await this.runGuards(tx, entity, 'update', current.row, row);

        const encoded = encodeRow(columns, row);
        const setColumns = Object.keys(encoded).filter((name) => name !== columns.primaryKey);
        const assignments = [
          ...setColumns.map((name) => `"${name}" = ?`),
          `"${columns.concurrencyColumn}" = "${columns.concurrencyColumn}" + 1`,
        ];
        const params: SqliteBindValue[] = [
          ...setColumns.map((name) => encoded[name]),
          id,
          expectedVersion,
        ];

        const result = await this.writeStatement(
          tx,
          entity,
          `UPDATE "${columns.table}" SET ${assignments.join(', ')}
             WHERE "${columns.primaryKey}" = ? AND "${columns.concurrencyColumn}" = ?`,
          params,
          encoded
        );

        if (result.changes === 0) {
          throw new RepositoryConflictError(
            entity,
            'stale_version',
            `${entity} ${id} changed while the write was in flight`,
            { id, expectedVersion }
          );
        }

        await writeAuditEvent(tx, {
          entity,
          entityId: row.id,
          action: 'update',
          actorId: actor ?? null,
          changedFields: changedFields(current.row, row),
          before: current.row,
          after: row,
          reason: options.reason ?? null,
          createdAt: now,
          commitSequence,
        });

        stored = row;
        version = current.version + 1;
      },
      () => this.changeEvent(entity, 'update', [id], options.origin, commitSequence)
    );

    return toRepositoryRow(entity, stored, version);
  }

  /**
   * Removes a row.
   *
   * Entities that carry a `deleted_at` column are soft-deleted: the row stays, marked as
   * deleted, and drops out of the default reads.
   */
  async remove<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options: WriteOptions & { readonly expectedVersion?: number } = {}
  ): Promise<RepositoryRow<E>> {
    this.assertId(entity, id);
    const actor = options.actor ?? this.defaultActor;
    const now = this.timestamp();
    const commitSequence = this.nextCommitSequence();

    const columns = columnsFor(entity);
    const soft = columns.columns.deleted_at !== undefined;
    let stored: Record<string, unknown> = {};
    let version = INITIAL_VERSION;

    await this.runWrite(
      entity,
      async (tx) => {
        const raw = await tx.get<SqliteRow>(
          `SELECT * FROM "${columns.table}" WHERE "${columns.primaryKey}" = ?`,
          [id]
        );
        if (!raw) throw new RepositoryNotFoundError(entity, id);

        const current = decodeRow(columns, raw);
        // An archived row is already removed.
        if (current.row.deleted_at) throw new RepositoryNotFoundError(entity, id);
        if (
          options.expectedVersion !== undefined &&
          current.version !== options.expectedVersion
        ) {
          throw new RepositoryConflictError(
            entity,
            'stale_version',
            `${entity} ${id} has version ${current.version}, but the removal expected ${options.expectedVersion}`,
            { id, expectedVersion: options.expectedVersion, actualVersion: current.version }
          );
        }

        const row: Record<string, unknown> = { ...current.row };
        if (soft) {
          row.deleted_at = now;
          row.updated_at = now;
          if (actor !== undefined) row.updated_by = actor;
        }

        // A removal is a write, so the authorizer judges it. The row is passed the same
        // way an update passes it, because a scope can only be judged against the row.
        this.checkPermission({ action: 'remove', entity, id, row });

        // The freeze of a posted document follows it into the removal: a document that
        // cannot be edited cannot be erased either.
        await this.runGuards(tx, entity, 'remove', current.row, row);

        const params: SqliteBindValue[] = [id];
        let statement: string;
        let encoded: Record<string, SqliteBindValue> = {};

        if (soft) {
          const encodedRow = encodeRow(columns, row);
          encoded = encodedRow;
          const setColumns = Object.keys(encodedRow).filter(
            (name) => name !== columns.primaryKey
          );
          statement = `UPDATE "${columns.table}" SET ${setColumns
            .map((name) => `"${name}" = ?`)
            .join(', ')}, "${columns.concurrencyColumn}" = "${columns.concurrencyColumn}" + 1
             WHERE "${columns.primaryKey}" = ?`;
          params.unshift(...setColumns.map((name) => encodedRow[name]));
        } else {
          statement = `DELETE FROM "${columns.table}" WHERE "${columns.primaryKey}" = ?`;
        }

        if (options.expectedVersion !== undefined) {
          statement += ` AND "${columns.concurrencyColumn}" = ?`;
          params.push(options.expectedVersion);
        }

        const result = await this.writeStatement(tx, entity, statement, params, encoded);
        if (result.changes === 0) {
          throw new RepositoryNotFoundError(entity, id);
        }

        await writeAuditEvent(tx, {
          entity,
          entityId: id,
          action: 'remove',
          actorId: actor ?? null,
          changedFields: soft ? ['deleted_at'] : Object.keys(current.row),
          before: current.row,
          after: soft ? row : null,
          reason: options.reason ?? null,
          createdAt: now,
          commitSequence,
        });

        stored = row;
        version = current.version + 1;
      },
      () => this.changeEvent(entity, 'remove', [id], options.origin, commitSequence)
    );

    return toRepositoryRow(entity, stored, version);
  }

  /**
   * Watches a query.
   *
   * The listener receives the current page on subscribe and after every commit that
   * touches the entity. Each payload carries the commit sequence it reflects, and it is
   * delivered after the write promise resolved, so a caller never sees a change before
   * its own write resolves and the cache may assume read-your-writes.
   */
  watch<E extends EntityName>(
    entity: E,
    listener: WatchListener<RepositoryRow<E>>
  ): Unsubscribe;
  watch<E extends EntityName>(
    entity: E,
    query: ListQuery,
    listener: WatchListener<RepositoryRow<E>>
  ): Unsubscribe;
  watch<E extends EntityName>(
    entity: E,
    queryOrListener: ListQuery | WatchListener<RepositoryRow<E>>,
    maybeListener?: WatchListener<RepositoryRow<E>>
  ): Unsubscribe {
    const query = typeof queryOrListener === 'function' ? {} : queryOrListener;
    const listener = typeof queryOrListener === 'function' ? queryOrListener : maybeListener;
    if (!listener) throw new Error('watch needs a listener');

    this.checkPermission({ action: 'watch', entity });

    const watcher: Watcher = {
      entity,
      query,
      listener: listener as WatchListener<never>,
    };

    const watchers = this.watchers.get(entity) ?? new Set<Watcher>();
    watchers.add(watcher);
    this.watchers.set(entity, watchers);

    // The current page is delivered the same way a change is, so a watcher never sees a
    // payload that is older than one that was already on its way.
    this.scheduleDelivery(entity);

    return () => {
      watchers.delete(watcher);
      if (watchers.size === 0) this.watchers.delete(entity);
    };
  }

  /**
   * Subscribes to the change bus.
   *
   * Every committed write emits one event synchronously, before the write promise
   * resolves. The query cache uses the bus to invalidate dependent views.
   */
  subscribe(listener: (event: ChangeEvent) => void): Unsubscribe {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  /** The audit trail of one row, newest first. */
  async auditTrail(entity: EntityName, entityId: string): Promise<readonly AuditEvent[]> {
    this.checkPermission({ action: 'audit', entity, id: entityId });
    return readAuditEvents(this.reader(), { entity, entityId });
  }

  /**
   * The audit trail, filtered.
   *
   * A trail without an entity filter spans entities, so every entity it covers is judged
   * before the trail is read: the trail holds the row before and after every mutation,
   * so it must not be handed out without a check.
   */
  async auditLog(query: AuditQuery = {}): Promise<readonly AuditEvent[]> {
    const reader = this.reader();

    if (query.entity !== undefined) {
      this.checkPermission({ action: 'audit', entity: query.entity });
      return readAuditEvents(reader, query);
    }

    for (const entity of await readAuditEntities(reader)) {
      this.checkPermission({ action: 'audit', entity });
    }
    return readAuditEvents(reader, query);
  }

  /** Resolves when no watch delivery is pending. */
  async whenIdle(): Promise<void> {
    let chain = this.deliveryChain;
    while (chain !== this.deliveryChain) {
      await chain;
      chain = this.deliveryChain;
    }
    await chain;
  }

  // ---------------------------------------------------------------- internals

  private async readPage<E extends EntityName>(
    entity: E,
    query: ListQuery,
    reader?: SqliteTransaction
  ): Promise<Page<RepositoryRow<E>>> {
    const columns = columnsFor(entity);
    const where = buildWhere(entity, query);
    const order = buildOrder(entity, query);
    const limit = clampLimit(query.limit);
    const offset = pageOffset(entity, query);
    const handle = reader ?? this.reader();

    const rows = await handle.all<SqliteRow>(
      `SELECT * FROM "${columns.table}" ${where.clause} ${order} LIMIT ? OFFSET ?`,
      [...where.params, limit + 1, offset]
    );

    const counted = await handle.get<{ total: number }>(
      `SELECT COUNT(*) AS total FROM "${columns.table}" ${where.clause}`,
      where.params
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((raw) => {
      const decoded = decodeRow(columns, raw);
      return toRepositoryRow(entity, decoded.row, decoded.version);
    });

    return {
      items,
      total: counted ? Number(counted.total) : items.length,
      hasMore,
      ...(hasMore ? { nextCursor: encodeCursor(offset + limit) } : {}),
    };
  }

  private validateRow<E extends EntityName>(entity: E, candidate: unknown): EntityRow<E> {
    const result = entitySchema(entity).safeParse(candidate);
    if (!result.success) {
      throw new RepositoryValidationError(entity, issuesFromZodError(result.error));
    }
    return result.data;
  }

  private rejectServerOwnedFields(
    entity: EntityName,
    payload: Readonly<Record<string, unknown>>
  ): void {
    const issues = Object.keys(payload)
      .filter((key) => isServerOwnedField(key))
      .map((key) => fieldIssue(key, `${key} is set by the repository and cannot be written`));

    if (issues.length > 0) throw new RepositoryValidationError(entity, issues);
  }

  private async runGuards(
    tx: SqliteTransaction,
    entity: EntityName,
    action: ChangeType,
    before: Readonly<Record<string, unknown>> | null,
    after: Readonly<Record<string, unknown>>
  ): Promise<void> {
    const context = {
      entity,
      action,
      before,
      after,
      runner: tx as AuditRunner,
      now: this.clock(),
    };

    const guards = action === 'remove' ? guardsForRemoval(entity) : guardsFor(entity);
    for (const guard of guards) {
      await guard(context);
    }
  }

  /**
   * Runs a write.
   *
   * A write made while a transaction is open joins it: the adapter refuses nested
   * transactions, so the join is the only way several rows land together. The change
   * event of the write is delivered when the transaction that owns it commits - straight
   * away for a write of its own, at the commit for a write that joined one.
   */
  private async runWrite(
    entity: EntityName,
    work: (tx: SqliteTransaction) => Promise<void>,
    event: () => ChangeEvent
  ): Promise<void> {
    const ambient = this.ambient;

    try {
      if (ambient) {
        await work(ambient.tx);
        ambient.events.push(event());
        return;
      }
      await this.adapter.transaction(work);
    } catch (error) {
      // A typed repository error is the answer already; only a raw storage failure is
      // mapped here. A nested transaction is a mistake in the calling code, so it keeps
      // the adapter's own error.
      if (error instanceof RepositoryError) throw error;
      if (isNestedTransaction(error)) throw error;
      throw mapStorageError(entity, error);
    }

    const change = event();
    this.emitChangeEvent(change);
    this.scheduleDelivery(change.entity);
  }

  private async writeStatement(
    tx: SqliteTransaction,
    entity: EntityName,
    sql: string,
    params: readonly SqliteBindValue[],
    written: Readonly<Record<string, SqliteBindValue>>
  ): Promise<{ changes: number }> {
    try {
      return await tx.run(sql, params);
    } catch (error) {
      throw await mapWriteError(entity, error, written, tx);
    }
  }

  private checkPermission(request: AuthorizationRequest): void {
    if (!this.authorize) return;
    try {
      this.authorize(request);
    } catch (error) {
      if (error instanceof RepositoryPermissionError) throw error;
      throw new RepositoryPermissionError(request.entity, request.action, { cause: error });
    }
  }

  private assertId(entity: EntityName, id: string): void {
    if (isId(id)) return;
    throw new RepositoryValidationError(entity, [
      fieldIssue('id', 'the id must be a UUIDv7 string'),
    ]);
  }

  private timestamp(): string {
    return this.clock().toISOString();
  }

  private nextCommitSequence(): number {
    this.commitSequence += 1;
    return this.commitSequence;
  }

  /** The change event of a write. */
  private changeEvent(
    entity: EntityName,
    type: ChangeType,
    ids: readonly string[],
    origin: string | undefined,
    commitSequence: number
  ): ChangeEvent {
    return { entity, type, ids, origin: origin ?? 'repository', commitSequence };
  }

  /** Delivers a change event to the bus. */
  private emitChangeEvent(event: ChangeEvent): void {
    if (this.changeListeners.size === 0) return;

    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        this.reportListenerError(error);
      }
    }
  }

  private scheduleDelivery(entity: EntityName): void {
    this.pendingEntities.add(entity);
    this.deliveryChain = this.deliveryChain.then(() => this.deliverPending());
  }

  private async deliverPending(): Promise<void> {
    // One macrotask later, so the write promise resolves before the payload is delivered.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const entities = [...this.pendingEntities];
    this.pendingEntities.clear();

    for (const entity of entities) {
      const watchers = this.watchers.get(entity);
      if (!watchers) continue;
      for (const watcher of [...watchers]) {
        await this.deliverToWatcher(watcher);
      }
    }
  }

  private async deliverToWatcher(watcher: Watcher): Promise<void> {
    const commitSequence = this.commitSequence;
    try {
      const page = await this.readCommittedPage(watcher.entity, watcher.query);
      watcher.listener(page.items as unknown as readonly never[], commitSequence);
    } catch (error) {
      this.reportListenerError(error);
    }
  }

  /**
   * Reads a page of the committed state.
   *
   * A delivery shows what is committed, so it waits for a transaction in flight instead
   * of joining it: a watcher must never see the rows of a transaction that a later
   * failure rolls back.
   */
  private async readCommittedPage<E extends EntityName>(
    entity: E,
    query: ListQuery
  ): Promise<Page<RepositoryRow<E>>> {
    for (;;) {
      const reader = await this.committedReader();
      try {
        return await this.readPage(entity, query, reader);
      } catch (error) {
        // A transaction opened between the wait and the read: wait for it and try again.
        if (!isNestedTransaction(error)) throw error;
      }
    }
  }

  private reportListenerError(error: unknown): void {
    if (this.onListenerError) {
      this.onListenerError(error);
      return;
    }
    // A listener that throws must not break the delivery of the other watchers.
  }
}

/** A promise the repository resolves when a transaction is over. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  const state: { resolve?: () => void } = {};
  const promise = new Promise<void>((resolve) => {
    state.resolve = () => resolve();
  });
  return { promise, resolve: () => state.resolve?.() };
}

/** True when the failure is the adapter refusing a statement inside a transaction. */
function isNestedTransaction(error: unknown): boolean {
  return error instanceof SqliteAdapterError && error.code === 'nested_transaction';
}

function toRepositoryRow<E extends EntityName>(
  entity: E,
  row: Readonly<Record<string, unknown>>,
  version: number
): RepositoryRow<E> {
  const id = String(row.id);
  if (!isId(id)) {
    throw new RepositoryStorageError(entity, `the stored ${entity} row carries a malformed id`);
  }
  return {
    ...row,
    id: asId<E>(id),
    rowVersion: version,
  } as unknown as RepositoryRow<E>;
}

function insertStatement(
  columns: ReturnType<typeof columnsFor>,
  encoded: Readonly<Record<string, SqliteBindValue>>
): string {
  const names = Object.keys(encoded);
  return `INSERT INTO "${columns.table}" (${names
    .map((name) => `"${name}"`)
    .join(', ')}) VALUES (${names.map(() => '?').join(', ')})`;
}

function definedEntries(
  payload: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  const entries: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    entries[key] = value;
  }
  return entries;
}

/**
 * The fields a write touched.
 *
 * The bookkeeping columns every write moves (`updated_at`, `updated_by`) are left out:
 * they say when the row was touched, not what changed.
 */
function changedFields(
  before: Readonly<Record<string, unknown>>,
  after: Readonly<Record<string, unknown>>
): string[] {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];

  for (const name of names) {
    if (name === 'updated_at' || name === 'updated_by') continue;
    if (JSON.stringify(before[name] ?? null) === JSON.stringify(after[name] ?? null)) continue;
    changed.push(name);
  }

  return changed.sort();
}

/** Create a repository over an adapter. */
export function createRepository(options: RepositoryOptions): Repository {
  return new Repository(options);
}