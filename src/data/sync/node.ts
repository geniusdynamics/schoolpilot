// ABOUTME: The two replicas of the protocol: a device that writes through the repository and
// ABOUTME: queues an envelope, and a server that merges envelopes and serves the change log.

import { ENTITY_NAMES, type EntityName } from '@/domain/schema';
import type { Id } from '@/domain/ids';
import type { SqliteAdapter, SqliteRow, SqliteTransaction } from '@/data/adapters/sqlite';
import {
  RepositoryNotFoundError,
  RepositoryPermissionError,
  columnsFor,
  decodeRow,
  type CreateInput,
  type RemoveOptions,
  type Repository,
  type RepositoryRow,
  type UpdateInput,
  type UpdateOptions,
  type WriteOptions,
} from '@/data/repository';
import { referenceOrder } from '@/data/repository/referenceOrder';

import { SyncApplier } from './apply';
import type { ConflictNote, Envelope, Snapshot } from './envelope';
import { HlcClock } from './hlc';
import { entityInScope, rowInScope, scopeKey, type ReplicaScope } from './scope';
import {
  SyncStore,
  type ApplyResult,
  type StorageDialect,
  type StoredConflict,
} from './store';

/** How a replica is built. The dialect is explicit because the metadata DDL differs. */
export interface ReplicaOptions {
  readonly repository: Repository;
  readonly adapter: SqliteAdapter;
  readonly deviceId: string;
  readonly dialect: StorageDialect;
  /** The clock; injectable so a test can pin the wall time. */
  readonly clock?: HlcClock;
  /** The data this replica may hold and write; absent means the whole database. */
  readonly scope?: ReplicaScope;
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
  /** Snapshots the device could not store; each left an unresolved conflict behind. */
  readonly failed: number;
  readonly cursor: number;
}

/** A page of server state. */
export interface PullPage {
  readonly snapshots: readonly Snapshot[];
  readonly cursor: number;
}

/**
 * The wire between a device and a server.
 *
 * The transport batches: one call carries every pending change and one call carries a whole
 * pull page. A device does not need to know whether the other side is in-process or behind
 * HTTP, which is what keeps the protocol testable without a socket.
 */
export interface SyncTransport {
  push(changes: readonly Envelope[]): Promise<readonly ApplyResult[]>;
  pull(since: number): Promise<PullPage>;
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
  private readonly applier: SyncApplier;
  private readonly scope: ReplicaScope | undefined;

  private constructor(
    repository: Repository,
    adapter: SqliteAdapter,
    store: SyncStore,
    clock: HlcClock,
    deviceId: string,
    scope: ReplicaScope | undefined
  ) {
    this.repository = repository;
    this.adapter = adapter;
    this.store = store;
    this.clock = clock;
    this.deviceId = deviceId;
    this.scope = scope;
    this.applier = new SyncApplier(store);
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
    return new DeviceNode(
      options.repository,
      options.adapter,
      store,
      clock,
      options.deviceId,
      options.scope
    );
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
    this.assertInScope(entity, input as unknown as Record<string, unknown>);
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
      const existing = await this.repository.get(entity, id, { includeDeleted: true });
      if (!existing) throw new RepositoryNotFoundError(entity, String(id));
      this.assertInScope(entity, existing as unknown as Record<string, unknown>);

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
      if (!existing) throw new RepositoryNotFoundError(entity, String(id));
      this.assertInScope(entity, existing as unknown as Record<string, unknown>);

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

  /** Pushes every unsent change in one batch, oldest first. */
  async push(transport: SyncTransport): Promise<PushSummary> {
    const entries = await this.store.unsent();
    if (entries.length === 0) return { sent: 0, outcomes: {}, rejected: [] };

    const results = await transport.push(entries.map((entry) => entry.envelope));
    if (results.length !== entries.length) {
      throw new Error(
        `the transport answered ${results.length} results for ${entries.length} changes`
      );
    }

    const outcomes: Record<string, number> = {};
    const rejected: Envelope[] = [];

    for (const [index, entry] of entries.entries()) {
      const result = results[index] as ApplyResult;
      outcomes[result.status] = (outcomes[result.status] ?? 0) + 1;
      if (result.status === 'rejected' || result.status === 'forbidden') {
        rejected.push(entry.envelope);
        await this.logRefusal(entry.envelope, result);
      }
      // A refused change is marked too: a guard refusal is permanent, and retrying it forever
      // would block every later change behind it.
      await this.store.markSent(entry.seq);
    }

    return { sent: entries.length, outcomes, rejected };
  }

  /**
   * Pulls the server's state and folds it in, one snapshot per transaction.
   *
   * Each applied row is announced on the repository's bus, so a live query refreshes for a
   * pulled row exactly as it does for a local write. A snapshot that cannot be stored leaves
   * an unresolved conflict and is counted, and the cursor still moves: a permanently bad row
   * must not freeze every row behind it.
   */
  async pull(transport: SyncTransport): Promise<PullSummary> {
    const key = this.scope ? scopeKey(this.scope) : 'all';
    const storedKey = await this.store.readState('scope_key');
    if (storedKey !== key) {
      await this.store.writeState('scope_key', key);
      await this.store.writeState('pulled_seq', '0');
    }

    const since = Number((await this.store.readState('pulled_seq')) ?? 0);
    const { snapshots, cursor } = await transport.pull(since);
    let applied = 0;
    let failed = 0;

    for (const snapshot of snapshots) {
      if (!this.snapshotInScope(snapshot)) {
        failed += 1;
        await this.logScopeRefusal(snapshot);
        continue;
      }

      try {
        const result = await this.repository.transaction((tx) =>
          this.applier.applySnapshot(tx, snapshot)
        );
        this.clock.observe(snapshot.hlc);
        if (result.status === 'insert' || result.status === 'update') {
          applied += 1;
          this.repository.announceChange({
            entity: snapshot.entity,
            type:
              snapshot.op === 'remove'
                ? 'remove'
                : result.status === 'insert'
                  ? 'create'
                  : 'update',
            ids: [result.id],
            origin: 'sync',
            commitSequence: this.repository.currentCommitSequence,
          });
        } else if (result.status === 'rejected') {
          failed += 1;
        }
      } catch (error) {
        failed += 1;
        await this.logSnapshotFailure(snapshot, error);
      }
    }

    if (cursor > since) await this.store.writeState('pulled_seq', String(cursor));
    await this.repository.whenIdle();
    return { received: snapshots.length, applied, failed, cursor };
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

  /** Refuses a write outside the replica's scope before the repository runs it. */
  private assertInScope(entity: EntityName, row: Readonly<Record<string, unknown>>): void {
    if (!this.scope) return;
    if (entity === 'institution') {
      throw new RepositoryPermissionError(entity, 'create', {
        id: this.scope.institutionId,
      });
    }
    if (!rowInScope(this.scope, entity, row)) {
      throw new RepositoryPermissionError(entity, 'write');
    }
  }

  /**
   * True when a pulled snapshot belongs to this replica.
   *
   * The server is expected to scope what it serves; this is the device's own check, so a
   * transport that hands over another institution's rows cannot put them in this database.
   */
  private snapshotInScope(snapshot: Snapshot): boolean {
    if (!this.scope) return true;
    if (!entityInScope(this.scope, snapshot.entity)) return false;
    return rowInScope(this.scope, snapshot.entity, snapshot.payload);
  }

  /** Records a pulled snapshot this replica refused as outside its scope. */
  private async logScopeRefusal(snapshot: Snapshot): Promise<void> {
    const scope = this.scope;
    if (!scope) return;
    const note: ConflictNote = {
      entity: snapshot.entity,
      entityId: snapshot.id,
      policy: 'scope',
      kind: 'unresolved',
      field: '*',
      winner: 'server',
      loser: snapshot.deviceId,
      winnerHlc: snapshot.hlc,
      loserHlc: '',
      resolved: 'the pulled row is outside this replica scope and was not stored',
      detail: `the row does not belong to institution ${scope.institutionId}`,
    };
    await this.repository.transaction((tx) => this.store.writeConflicts(tx, [note]));
  }

  /** Records a push refusal so it appears in this device's conflict log. */
  private async logRefusal(envelope: Envelope, result: ApplyResult): Promise<void> {
    const note: ConflictNote = {
      entity: envelope.entity,
      entityId: envelope.id,
      policy: 'server',
      kind: 'unresolved',
      field: '*',
      winner: 'server',
      loser: envelope.deviceId,
      winnerHlc: '',
      loserHlc: envelope.hlc,
      resolved: 'the server refused the change; the local row stands until a human resolves it',
      detail: result.error ?? result.status,
    };
    await this.repository.transaction((tx) => this.store.writeConflicts(tx, [note]));
  }

  /** Records a snapshot this device could not store. */
  private async logSnapshotFailure(snapshot: Snapshot, error: unknown): Promise<void> {
    const detail = error instanceof Error ? error.message : String(error);
    const note: ConflictNote = {
      entity: snapshot.entity,
      entityId: snapshot.id,
      policy: 'server',
      kind: 'unresolved',
      field: '*',
      winner: 'server',
      loser: snapshot.deviceId,
      winnerHlc: snapshot.hlc,
      loserHlc: '',
      resolved: 'the pulled row could not be stored; it is logged and retried on the next pull',
      detail,
    };
    await this.repository.transaction((tx) => this.store.writeConflicts(tx, [note]));
  }
}

/**
 * The server replica.
 *
 * It owns the merge: every pushed envelope is folded into the canonical tables inside its own
 * transaction, then appended to the change log. The guards run here, against the server's
 * state, which is the only place they can be judged. One change per transaction means a hard
 * failure rolls back only that change, never the ones beside it.
 */
export class ServerNode {
  readonly store: SyncStore;
  readonly clock: HlcClock;
  readonly deviceId: string;
  private readonly repository: Repository;
  private readonly adapter: SqliteAdapter;
  private readonly applier: SyncApplier;

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
    this.applier = new SyncApplier(store);
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
  async accept(intent: Envelope, scope?: ReplicaScope): Promise<ApplyResult> {
    try {
      return await this.repository.transaction((tx) => this.applyWithin(tx, intent, scope));
    } catch (error) {
      return this.failure(intent, error);
    }
  }

  /** Accepts a batch, one transaction per change, so one refusal cannot poison its neighbours. */
  async acceptBatch(
    intents: readonly Envelope[],
    scope?: ReplicaScope
  ): Promise<readonly ApplyResult[]> {
    const results: ApplyResult[] = [];
    for (const intent of intents) results.push(await this.accept(intent, scope));
    return results;
  }

  /** The state of every row that changed after a sequence, for one replica's scope. */
  async changesSince(sequence: number, scope?: ReplicaScope): Promise<PullPage> {
    return this.store.serverChangesSince(sequence, scope);
  }

  /** A transport bound to one replica's scope, for both push and pull. */
  transport(scope?: ReplicaScope): SyncTransport {
    return {
      push: (changes) => this.acceptBatch(changes, scope),
      pull: (since) => this.changesSince(since, scope),
    };
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
   * A row that already has a change is left alone, so the seed is safe to run again.
   */
  async bootstrap(): Promise<number> {
    return this.repository.transaction(async (tx) => {
      let rows = 0;

      for (const entity of referenceOrder(ENTITY_NAMES)) {
        const columns = columnsFor(entity);
        const raws = await tx.all<SqliteRow>(`SELECT * FROM "${columns.table}"`);

        for (const raw of raws) {
          const decoded = decodeRow(columns, raw);
          const id = String(decoded.row.id);
          if (await this.store.hasChange(tx, entity, id)) continue;

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

  private async applyWithin(
    tx: SqliteTransaction,
    intent: Envelope,
    scope: ReplicaScope | undefined
  ): Promise<ApplyResult> {
    if (scope && !rowInScope(scope, intent.entity, intent.payload)) {
      const refusal: ConflictNote = {
        entity: intent.entity,
        entityId: intent.id,
        policy: 'scope',
        kind: 'unresolved',
        field: '*',
        winner: 'server',
        loser: intent.deviceId,
        winnerHlc: '',
        loserHlc: intent.hlc,
        resolved: 'the change is outside the replica scope and was refused',
        detail: `the row does not belong to institution ${scope.institutionId}`,
      };
      const result: ApplyResult = {
        status: 'forbidden',
        id: intent.id,
        fields: [],
        conflicts: [refusal],
        error: refusal.detail,
      };
      await this.store.writeConflicts(tx, [refusal]);
      await this.store.appendChange(tx, intent, result);
      await this.store.recordRejection(tx, intent, refusal.detail ?? 'forbidden');
      return result;
    }

    const seen = await this.store.findIntent(tx, intent);
    if (seen) {
      return { status: 'replay', id: seen.entityId, fields: [], conflicts: [] };
    }

    const result = await this.applier.applyIntent(tx, intent);
    await this.store.appendChange(tx, intent, result);
    if (result.status === 'rejected') {
      await this.store.recordRejection(tx, intent, result.error ?? 'rejected');
    }
    return result;
  }

  /**
   * Turns an unexpected failure into a refusal for that change alone.
   *
   * The transaction has rolled back, so this records the refusal in a fresh one. If even that
   * fails the error is reported and the batch still continues.
   */
  private async failure(intent: Envelope, error: unknown): Promise<ApplyResult> {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`sync refused ${intent.entity} ${intent.id}:`, error);

    const note: ConflictNote = {
      entity: intent.entity,
      entityId: intent.id,
      policy: 'server',
      kind: 'unresolved',
      field: '*',
      winner: 'server',
      loser: intent.deviceId,
      winnerHlc: '',
      loserHlc: intent.hlc,
      resolved: 'the server could not apply the change; the stored row stands',
      detail: message,
    };

    try {
      await this.repository.transaction(async (tx) => {
        await this.store.writeConflicts(tx, [note]);
        await this.store.recordRejection(tx, intent, message);
      });
    } catch (logError) {
      console.error('the sync failure could not be logged:', logError);
    }

    return {
      status: 'rejected',
      id: intent.id,
      fields: [],
      conflicts: [note],
      error: message,
    };
  }
}

/** A stored row without the concurrency counter, in the shape a change carries. */
function withoutVersion(row: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...row };
  delete copy.rowVersion;
  return copy;
}
