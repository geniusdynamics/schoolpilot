// ABOUTME: The canonical candidate: a device replica that writes through the repository and queues
// ABOUTME: an envelope, and a server replica that merges the envelope into SQLite or Postgres.

import type { Id } from '@/domain/ids';
import { type EntityName } from '@/domain/schema';
import type { SqliteAdapter, SqliteRow, SqliteTransaction } from '@/data/adapters/sqlite';
import { SEED_ORDER } from '@/data/__tests__/harness';
import {
  RepositoryNotFoundError,
  columnsFor,
  decodeRow,
  type CreateInput,
  type Repository,
  type RepositoryRow,
  type UpdateInput,
  type UpdateOptions,
  type WriteOptions,
} from '@/data/repository';
// The removal guard is not re-exported by the repository's public surface.
import type { RemoveOptions } from '@/data/repository/types';

import type { Envelope, Snapshot } from './envelope';
import { HlcClock } from './hlc';
import { SyncStore, type ApplyResult, type StorageDialect, type StoredConflict } from './syncStore';

/** How a replica is built. The dialect is explicit because the metadata DDL differs. */
export interface ReplicaOptions {
  readonly repository: Repository;
  readonly adapter: SqliteAdapter;
  readonly deviceId: string;
  readonly dialect: StorageDialect;
  /** The clock; injectable so a test can pin the wall time. */
  readonly clock?: HlcClock;
}

/** One locally written change and the row it produced. */
export interface LocalWrite<E extends EntityName> {
  readonly row: RepositoryRow<E>;
  readonly envelope: Envelope;
}

/** What a push did. */
export interface PushSummary {
  readonly sent: number;
  readonly outcomes: Readonly<Record<string, number>>;
  readonly rejected: readonly Envelope[];
}

/** What a pull did. */
export interface PullSummary {
  readonly received: number;
  readonly applied: number;
  readonly cursor: number;
}

/**
 * A device replica.
 *
 * Every local write takes the repository's own transaction and records the outbox entry
 * inside it, so the row and the change that carries it commit together. Nothing about the
 * canonical schema or the repository's write path changes.
 */
export class DeviceNode {
  readonly store: SyncStore;
  readonly clock: HlcClock;
  readonly deviceId: string;
  private readonly repository: Repository;
  private readonly adapter: SqliteAdapter;

  private constructor(
    repository: Repository,
    adapter: SqliteAdapter,
    store: SyncStore,
    clock: HlcClock,
    deviceId: string
  ) {
    this.repository = repository;
    this.adapter = adapter;
    this.store = store;
    this.clock = clock;
    this.deviceId = deviceId;
  }

  /** Opens a device: creates the metadata tables, keeps the repository as it is. */
  static async open(options: ReplicaOptions): Promise<DeviceNode> {
    const store = new SyncStore({
      adapter: options.adapter,
      role: 'device',
      dialect: options.dialect,
      deviceId: options.deviceId,
    });
    await store.setup();
    const clock = options.clock ?? new HlcClock(options.deviceId);
    return new DeviceNode(options.repository, options.adapter, store, clock, options.deviceId);
  }

  /** The repository this device writes through. */
  get repo(): Repository {
    return this.repository;
  }

  /** The adapter this device runs on. */
  get database(): SqliteAdapter {
    return this.adapter;
  }

  /** Creates a row and queues the change that carries it. */
  async create<E extends EntityName>(
    entity: E,
    input: CreateInput<E>,
    options: WriteOptions = {}
  ): Promise<LocalWrite<E>> {
    const hlc = this.clock.tick();
    let envelope: Envelope | undefined;

    const row = await this.repository.transaction(async (tx) => {
      const created = await this.repository.create(entity, input, {
        ...options,
        origin: options.origin ?? this.deviceId,
      });
      const payload = withoutVersion(created as unknown as Record<string, unknown>);
      envelope = {
        entity,
        id: String(created.id),
        op: 'create',
        hlc,
        deviceId: this.deviceId,
        fields: Object.keys(payload),
        base: {},
        payload,
      };
      await this.store.recordLocal(tx, envelope);
      return created;
    });

    if (!envelope) throw new Error('the create produced no envelope');
    return { row, envelope };
  }

  /** Patches a row and queues the change, with the clock each touched column had before. */
  async update<E extends EntityName>(
    entity: E,
    id: Id<E>,
    patch: UpdateInput<E>,
    options: UpdateOptions
  ): Promise<LocalWrite<E>> {
    const fields = Object.entries(patch as Readonly<Record<string, unknown>>)
      .filter(([, value]) => value !== undefined)
      .map(([field]) => field);

    let envelope: Envelope | undefined;
    const row = await this.repository.transaction(async (tx) => {
      const base = await this.store.baseClocks(tx, entity, String(id), fields);
      const hlc = this.clock.tick();
      const updated = await this.repository.update(entity, id, patch, {
        ...options,
        origin: options.origin ?? this.deviceId,
      });
      const payload = withoutVersion(updated as unknown as Record<string, unknown>);
      envelope = {
        entity,
        id: String(id),
        op: 'update',
        hlc,
        deviceId: this.deviceId,
        fields,
        base,
        payload,
      };
      await this.store.recordLocal(tx, envelope);
      return updated;
    });

    if (!envelope) throw new Error('the update produced no envelope');
    return { row, envelope };
  }

  /** Removes a row and queues the change. A soft delete travels as an update of `deleted_at`. */
  async remove<E extends EntityName>(
    entity: E,
    id: Id<E>,
    options: RemoveOptions = {}
  ): Promise<LocalWrite<E>> {
    const columns = columnsFor(entity);
    const soft = columns.columns.deleted_at !== undefined;
    let envelope: Envelope | undefined;

    const row = await this.repository.transaction(async (tx) => {
      const existing = await this.repository.get(entity, id, { includeDeleted: true });
      if (!existing) throw new RepositoryNotFoundError(entity, id);
      const before = withoutVersion(existing as unknown as Record<string, unknown>);
      const base = soft ? await this.store.baseClocks(tx, entity, String(id), ['deleted_at']) : {};
      const hlc = this.clock.tick();
      const removed = await this.repository.remove(entity, id, {
        ...options,
        origin: options.origin ?? this.deviceId,
      });
      const payload = soft
        ? withoutVersion(removed as unknown as Record<string, unknown>)
        : before;
      envelope = {
        entity,
        id: String(id),
        op: 'remove',
        hlc,
        deviceId: this.deviceId,
        fields: soft ? ['deleted_at'] : Object.keys(before),
        base,
        payload,
      };
      await this.store.recordLocal(tx, envelope);
      return removed;
    });

    if (!envelope) throw new Error('the removal produced no envelope');
    return { row, envelope };
  }

  /** Pushes every unsent change, oldest first. */
  async push(server: ServerNode): Promise<PushSummary> {
    const entries = await this.store.unsent();
    const outcomes: Record<string, number> = {};
    const rejected: Envelope[] = [];

    for (const entry of entries) {
      const result = await server.accept(entry.envelope);
      outcomes[result.status] = (outcomes[result.status] ?? 0) + 1;
      if (result.status === 'rejected') rejected.push(entry.envelope);
      // A rejected change is marked too: a guard rejection is permanent, and retrying it
      // forever would block every later change behind it.
      await this.store.markSent(entry.seq);
    }

    return { sent: entries.length, outcomes, rejected };
  }

  /**
   * Pulls the server's state and folds it in.
   *
   * The whole batch lands in one transaction, and no repository verb runs, so the bus stays
   * silent: `watch` does not fire for a pulled row.
   */
  async pull(server: ServerNode): Promise<PullSummary> {
    const since = Number((await this.store.readState('pulled_seq')) ?? 0);
    const { snapshots, cursor } = await server.changesSince(since);
    let applied = 0;

    await this.repository.transaction(async (tx) => {
      for (const snapshot of snapshots) {
        const result = await this.store.applySnapshot(tx, snapshot);
        if (result.status === 'insert' || result.status === 'update') applied += 1;
        this.clock.observe(snapshot.hlc);
      }
    });

    if (cursor > since) await this.store.writeState('pulled_seq', String(cursor));
    return { received: snapshots.length, applied, cursor };
  }

  /** Reads a row as the device sees it now. */
  async read(entity: EntityName, id: string): Promise<Record<string, unknown> | null> {
    const row = await this.repository.get(entity, id as Id<EntityName>, { includeDeleted: true });
    if (!row) return null;
    return withoutVersion(row as unknown as Record<string, unknown>);
  }

  /** The conflicts this device recorded. */
  async conflicts(): Promise<readonly StoredConflict[]> {
    return this.store.conflicts();
  }
}

/**
 * The server replica.
 *
 * It owns the merge: every pushed envelope is folded into the canonical tables inside one
 * transaction, then appended to the change log. The guards run here, against the server's
 * state, which is the only place they can be judged.
 */
export class ServerNode {
  readonly store: SyncStore;
  readonly clock: HlcClock;
  readonly deviceId: string;
  private readonly repository: Repository;
  private readonly adapter: SqliteAdapter;

  private constructor(
    repository: Repository,
    adapter: SqliteAdapter,
    store: SyncStore,
    clock: HlcClock,
    deviceId: string
  ) {
    this.repository = repository;
    this.adapter = adapter;
    this.store = store;
    this.clock = clock;
    this.deviceId = deviceId;
  }

  /** Opens a server over an already prepared repository. */
  static async open(options: ReplicaOptions): Promise<ServerNode> {
    const store = new SyncStore({
      adapter: options.adapter,
      role: 'server',
      dialect: options.dialect,
      deviceId: options.deviceId,
    });
    await store.setup();
    const clock = options.clock ?? new HlcClock(options.deviceId);
    return new ServerNode(options.repository, options.adapter, store, clock, options.deviceId);
  }

  /** The repository the server serves. */
  get repo(): Repository {
    return this.repository;
  }

  /** The adapter the server runs on. */
  get database(): SqliteAdapter {
    return this.adapter;
  }

  /** Accepts one pushed change. A replay of an accepted change is a no-op. */
  async accept(intent: Envelope): Promise<ApplyResult> {
    return this.repository.transaction((tx) => this.applyWithin(tx, intent));
  }

  /** Accepts a batch in one transaction, which is the fair comparison with a CouchDB batch. */
  async acceptBatch(intents: readonly Envelope[]): Promise<readonly ApplyResult[]> {
    return this.repository.transaction(async (tx) => {
      const results: ApplyResult[] = [];
      for (const intent of intents) results.push(await this.applyWithin(tx, intent));
      return results;
    });
  }

  /** The state of every row that changed after a sequence. */
  async changesSince(sequence: number): Promise<{
    readonly snapshots: readonly Snapshot[];
    readonly cursor: number;
  }> {
    return this.store.serverChangesSince(sequence);
  }

  /** The conflicts the server recorded. */
  async conflicts(): Promise<readonly StoredConflict[]> {
    return this.store.conflicts();
  }

  /**
   * Materialises the change log and the clocks of rows the server already holds.
   *
   * A server that was populated before it started syncing has no change rows, so a device
   * would pull nothing. This seeds the log from the canonical tables without rewriting them.
   *
   * The entities are walked in the harness's reference order because the pull applies the
   * snapshots in this order with foreign keys on, and the registry order is not a valid
   * creation order (a learner points at a household the registry lists later).
   */
  async bootstrap(): Promise<number> {
    return this.repository.transaction(async (tx) => {
      let rows = 0;

      for (const entity of SEED_ORDER) {
        const columns = columnsFor(entity);
        const raws = await tx.all<SqliteRow>(`SELECT * FROM "${columns.table}"`);

        for (const raw of raws) {
          const decoded = decodeRow(columns, raw);
          const id = String(decoded.row.id);
          const hlc = this.clock.tick();
          const fields = Object.keys(decoded.row).filter((field) => field !== 'id');
          const clock: Record<string, string> = {};
          for (const field of fields) clock[field] = hlc;

          await this.store.rememberClocks(tx, entity, id, clock);
          await this.store.appendChange(
            tx,
            {
              entity,
              id,
              op: 'create',
              hlc,
              deviceId: this.deviceId,
              fields,
              base: {},
              payload: decoded.row,
            },
            { status: 'insert', id, fields, conflicts: [], row: decoded.row, clock }
          );
          rows += 1;
        }
      }

      return rows;
    });
  }

  private async applyWithin(tx: SqliteTransaction, intent: Envelope): Promise<ApplyResult> {
    const seen = await this.store.findIntent(tx, intent);
    if (seen) {
      return { status: 'replay', id: seen.entityId, fields: [], conflicts: [] };
    }

    const result = await this.store.applyIntent(tx, intent);
    await this.store.appendChange(tx, intent, result);
    if (result.status === 'rejected') {
      await this.store.recordRejection(tx, intent, result.error ?? 'rejected');
    }
    return result;
  }
}

/** A stored row without the concurrency counter, in the shape a change carries. */
function withoutVersion(row: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...row };
  delete copy.rowVersion;
  return copy;
}
