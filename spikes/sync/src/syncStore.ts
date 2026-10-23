// ABOUTME: The sync metadata and the write path both sync candidates feed a change into: the
// ABOUTME: per-field clock, the outbox, the server change log, the conflict log and the row write.

import { generateUuidv7 } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';
import type { SqliteAdapter, SqliteRow, SqliteTransaction } from '@/data/adapters/sqlite';
import {
  INITIAL_VERSION,
  RepositoryError,
  columnsFor,
  decodeRow,
  encodeRow,
  entitySchema,
  guardsFor,
  issuesFromZodError,
  writeAuditEvent,
} from '@/data/repository';
// The removal guard is not re-exported by the repository's public surface.
import { guardsForRemoval } from '@/data/repository/invariants';

import type { ConflictNote, Envelope, Snapshot } from './envelope';
import { deviceOf, laterHlc } from './hlc';
import { mergeChange, mergeSnapshot, policyFor, type StoredState } from './policies';

/** The SQL dialect the metadata tables are created in. The two differ only in the sequence. */
export type StorageDialect = 'sqlite' | 'postgres';

/** Which side of the sync a store belongs to. */
export type SyncRole = 'device' | 'server';

/** What applying a change did. */
export type ApplyStatus = 'insert' | 'update' | 'noop' | 'immutable' | 'rejected' | 'replay';

/** The result of feeding one change into a replica. */
export interface ApplyResult {
  readonly status: ApplyStatus;
  /** The id the row is stored under; a folded cell keeps the id that landed first. */
  readonly id: string;
  readonly fields: readonly string[];
  readonly conflicts: readonly ConflictNote[];
  /** The row after the merge, absent for a no-op or a rejection. */
  readonly row?: Readonly<Record<string, unknown>>;
  /** The clock of each column after the merge. */
  readonly clock?: Readonly<Record<string, string>>;
  readonly error?: string;
}

/** One unsent change of a device. */
export interface OutboxEntry {
  readonly seq: number;
  readonly envelope: Envelope;
}

/** The sync metadata tables and the apply path. */
export interface SyncStoreOptions {
  readonly adapter: SqliteAdapter;
  readonly role: SyncRole;
  readonly dialect: StorageDialect;
  readonly deviceId: string;
}

/** A conflict read back from the table. */
export interface StoredConflict extends ConflictNote {
  readonly id: string;
  readonly detectedAt: string;
}

/**
 * The replica's sync metadata.
 *
 * The tables are separate from the canonical schema, so the canonical registry and its DDL
 * are unchanged: the spike adds columns of bookkeeping, not a second entity model.
 */
export class SyncStore {
  private readonly adapter: SqliteAdapter;
  private readonly role: SyncRole;
  private readonly dialect: StorageDialect;
  private readonly deviceId: string;

  constructor(options: SyncStoreOptions) {
    this.adapter = options.adapter;
    this.role = options.role;
    this.dialect = options.dialect;
    this.deviceId = options.deviceId;
  }

  /** Creates the metadata tables. Idempotent. */
  async setup(): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS "sync_state" (
         "key" TEXT NOT NULL PRIMARY KEY,
         "value" TEXT NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS "sync_field_clock" (
         "entity" TEXT NOT NULL,
         "entity_id" TEXT NOT NULL,
         "field" TEXT NOT NULL,
         "hlc" TEXT NOT NULL,
         PRIMARY KEY ("entity", "entity_id", "field")
       )`,
      `CREATE TABLE IF NOT EXISTS "sync_conflict" (
         "id" TEXT NOT NULL PRIMARY KEY,
         "entity" TEXT NOT NULL,
         "entity_id" TEXT NOT NULL,
         "policy" TEXT NOT NULL,
         "kind" TEXT NOT NULL,
         "field" TEXT NOT NULL,
         "winner" TEXT NOT NULL,
         "loser" TEXT NOT NULL,
         "winner_hlc" TEXT NOT NULL,
         "loser_hlc" TEXT NOT NULL,
         "resolved" TEXT NOT NULL,
         "detected_at" TEXT NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS "ix_sync_conflict_row"
         ON "sync_conflict" ("entity", "entity_id")`,
    ];

    if (this.role === 'device') {
      statements.push(
        `CREATE TABLE IF NOT EXISTS "sync_outbox" (
           "seq" ${this.sequenceColumn()},
           "entity" TEXT NOT NULL,
           "entity_id" TEXT NOT NULL,
           "op" TEXT NOT NULL,
           "hlc" TEXT NOT NULL,
           "device_id" TEXT NOT NULL,
           "fields" TEXT NOT NULL,
           "base" TEXT NOT NULL,
           "payload" TEXT NOT NULL,
           "sent" INTEGER NOT NULL DEFAULT 0
         )`,
        `CREATE INDEX IF NOT EXISTS "ix_sync_outbox_unsent" ON "sync_outbox" ("sent", "seq")`
      );
    }

    if (this.role === 'server') {
      statements.push(
        `CREATE TABLE IF NOT EXISTS "sync_change" (
           "server_seq" ${this.sequenceColumn()},
           "entity" TEXT NOT NULL,
           "entity_id" TEXT NOT NULL,
           "intent_id" TEXT NOT NULL,
           "op" TEXT NOT NULL,
           "hlc" TEXT NOT NULL,
           "device_id" TEXT NOT NULL,
           "fields" TEXT NOT NULL,
           "payload" TEXT NOT NULL,
           "clock" TEXT NOT NULL,
           "outcome" TEXT NOT NULL,
           "applied_at" TEXT NOT NULL
         )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "ux_sync_change_intent"
           ON "sync_change" ("entity", "intent_id", "hlc")`,
        `CREATE INDEX IF NOT EXISTS "ix_sync_change_seq" ON "sync_change" ("server_seq")`,
        `CREATE TABLE IF NOT EXISTS "sync_reject" (
           "id" TEXT NOT NULL PRIMARY KEY,
           "entity" TEXT NOT NULL,
           "entity_id" TEXT NOT NULL,
           "hlc" TEXT NOT NULL,
           "device_id" TEXT NOT NULL,
           "error" TEXT NOT NULL,
           "rejected_at" TEXT NOT NULL
         )`
      );
    }

    for (const statement of statements) await this.adapter.exec(statement);
  }

  /** The device id this store writes as. */
  get writer(): string {
    return this.deviceId;
  }

  // ------------------------------------------------------------------ state

  /** Reads a cursor or a setting. */
  async readState(key: string): Promise<string | null> {
    const row = await this.adapter.get<{ value: string }>(
      `SELECT "value" FROM "sync_state" WHERE "key" = ?`,
      [key]
    );
    return row?.value ?? null;
  }

  /** Writes a cursor or a setting. */
  async writeState(key: string, value: string): Promise<void> {
    await this.adapter.run(
      `INSERT INTO "sync_state" ("key", "value") VALUES (?, ?)
       ON CONFLICT ("key") DO UPDATE SET "value" = excluded."value"`,
      [key, value]
    );
  }

  // ------------------------------------------------------------------ clocks

  /** The clock the row held for each named column before a local write. */
  async baseClocks(
    tx: SqliteTransaction,
    entity: EntityName,
    entityId: string,
    fields: readonly string[]
  ): Promise<Record<string, string>> {
    if (fields.length === 0) return {};

    const rows = await tx.all<{ field: string; hlc: string }>(
      `SELECT "field", "hlc" FROM "sync_field_clock" WHERE "entity" = ? AND "entity_id" = ?`,
      [entity, entityId]
    );
    const stored = new Map(rows.map((row) => [row.field, row.hlc]));

    const base: Record<string, string> = {};
    for (const field of fields) {
      const hlc = stored.get(field);
      if (hlc !== undefined) base[field] = hlc;
    }
    return base;
  }

  /**
   * Moves the clock of each column forward.
   *
   * A plain string compare is the total order, so the guard is the same expression in SQLite
   * and Postgres and a late-arriving older change can never move a clock backwards.
   */
  async rememberClocks(
    tx: SqliteTransaction,
    entity: EntityName,
    entityId: string,
    clock: Readonly<Record<string, string>>
  ): Promise<void> {
    for (const [field, hlc] of Object.entries(clock)) {
      if (field === 'id' || hlc === '') continue;
      await tx.run(
        `INSERT INTO "sync_field_clock" ("entity", "entity_id", "field", "hlc")
         VALUES (?, ?, ?, ?)
         ON CONFLICT ("entity", "entity_id", "field")
         DO UPDATE SET "hlc" = excluded."hlc"
         WHERE excluded."hlc" > "sync_field_clock"."hlc"`,
        [entity, entityId, field, hlc]
      );
    }
  }

  /** The clock of each column of a row. */
  async rowClock(
    runner: SqliteTransaction | SqliteAdapter,
    entity: EntityName,
    entityId: string
  ): Promise<Record<string, string>> {
    const rows = await runner.all<{ field: string; hlc: string }>(
      `SELECT "field", "hlc" FROM "sync_field_clock" WHERE "entity" = ? AND "entity_id" = ?`,
      [entity, entityId]
    );
    const clock: Record<string, string> = {};
    for (const row of rows) clock[row.field] = row.hlc;
    return clock;
  }

  // ------------------------------------------------------------------ outbox

  /** Records a local write: its clocks and one outbox entry. */
  async recordLocal(tx: SqliteTransaction, envelope: Envelope): Promise<void> {
    const clock: Record<string, string> = {};
    for (const field of envelope.fields) {
      if (field === 'id') continue;
      clock[field] = envelope.hlc;
    }
    await this.rememberClocks(tx, envelope.entity, envelope.id, clock);

    await tx.run(
      `INSERT INTO "sync_outbox"
         ("entity", "entity_id", "op", "hlc", "device_id", "fields", "base", "payload")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        envelope.entity,
        envelope.id,
        envelope.op,
        envelope.hlc,
        envelope.deviceId,
        JSON.stringify(envelope.fields),
        JSON.stringify(envelope.base),
        JSON.stringify(envelope.payload),
      ]
    );
  }

  /** The changes the device has not pushed yet, oldest first. */
  async unsent(limit = 1000): Promise<readonly OutboxEntry[]> {
    const rows = await this.adapter.all<OutboxRow>(
      `SELECT * FROM "sync_outbox" WHERE "sent" = 0 ORDER BY "seq" LIMIT ?`,
      [limit]
    );
    return rows.map((row) => ({ seq: Number(row.seq), envelope: parseEnvelope(row) }));
  }

  /** How many changes are waiting to be pushed. */
  async outboxDepth(): Promise<number> {
    const row = await this.adapter.get<{ depth: number }>(
      `SELECT COUNT(*) AS depth FROM "sync_outbox" WHERE "sent" = 0`
    );
    return Number(row?.depth ?? 0);
  }

  /** Marks a change as pushed. */
  async markSent(seq: number): Promise<void> {
    await this.adapter.run(`UPDATE "sync_outbox" SET "sent" = 1 WHERE "seq" = ?`, [seq]);
  }

  // ------------------------------------------------------------------ apply

  /**
   * Folds a pushed change into the canonical table.
   *
   * This is the verb the repository does not have: it applies a row under the id the writer
   * chose instead of generating one, and it runs the entity's own schema, codec, guards and
   * audit so the domain layer is reused rather than duplicated.
   */
  async applyIntent(tx: SqliteTransaction, intent: Envelope): Promise<ApplyResult> {
    const policy = policyFor(intent.entity);
    const existing = await this.findExisting(tx, intent, policy);

    if (intent.op === 'remove' && !existing) {
      return { status: 'noop', id: intent.id, fields: [], conflicts: [] };
    }

    const merged = mergeChange(policy, intent, existing);
    const conflicts = merged.conflicts;

    if (merged.action === 'noop') {
      return { status: 'noop', id: merged.id, fields: [], conflicts };
    }
    if (merged.action === 'immutable') {
      await this.writeConflicts(tx, conflicts);
      return { status: 'immutable', id: merged.id, fields: [], conflicts };
    }

    const guardAction =
      intent.op === 'remove' ? 'remove' : merged.action === 'insert' ? 'create' : 'update';
    const invalid = this.validate(intent.entity, merged.row);
    if (invalid) {
      return { status: 'rejected', id: merged.id, fields: [], conflicts, error: invalid };
    }

    try {
      await this.runGuards(tx, intent.entity, guardAction, existing?.row ?? null, merged.row);
    } catch (error) {
      if (!(error instanceof RepositoryError)) throw error;
      return { status: 'rejected', id: merged.id, fields: [], conflicts, error: error.message };
    }

    const auditAction =
      guardAction === 'remove' ? 'remove' : merged.action === 'insert' ? 'create' : 'update';
    await this.writeRow(tx, intent.entity, merged.action, merged.row, merged.id);
    await this.writeAudit(
      tx,
      intent.entity,
      merged.id,
      auditAction,
      existing?.row ?? null,
      merged.row,
      merged.fields
    );
    await this.rememberClocks(tx, intent.entity, merged.id, merged.clock);
    await this.writeConflicts(tx, conflicts);

    return {
      status: merged.action,
      id: merged.id,
      fields: merged.fields,
      conflicts,
      row: merged.row,
      clock: merged.clock,
    };
  }

  /**
   * Folds a server transfer into a device.
   *
   * The server has already merged and run the guards, so this validates the shape and stores
   * it; running the guards again would judge a row against local state that may not have
   * arrived yet. A cell that arrived under another id first is dropped here, because the
   * losing device still holds the row it created under its own id.
   */
  async applySnapshot(tx: SqliteTransaction, snapshot: Snapshot): Promise<ApplyResult> {
    const policy = policyFor(snapshot.entity);
    const existing = await this.findById(tx, snapshot.entity, snapshot.id);
    const conflicts: ConflictNote[] = [];

    if (!existing && policy === 'cell_merge') {
      const byCell = await this.findByCell(tx, snapshot.entity, snapshot.payload);
      if (byCell && byCell.id !== snapshot.id) {
        await this.hardDelete(tx, snapshot.entity, byCell.id);
        await this.writeAudit(tx, snapshot.entity, byCell.id, 'remove', byCell.row, null, Object.keys(byCell.row));
        conflicts.push({
          entity: snapshot.entity,
          entityId: snapshot.id,
          policy: 'cell_merge',
          kind: 'cell_identity',
          field: 'id',
          winner: snapshot.id,
          loser: byCell.id,
          winnerHlc: snapshot.hlc,
          loserHlc: latestOf(byCell.clock),
          resolved: 'the server folded the cell under its first id; the local duplicate is dropped',
        });
      }
    }

    const merged = mergeSnapshot(existing, snapshot);
    const allConflicts = [...conflicts, ...merged.conflicts];

    if (merged.action !== 'insert' && merged.action !== 'update') {
      await this.writeConflicts(tx, allConflicts);
      return { status: merged.action, id: merged.id, fields: [], conflicts: allConflicts };
    }

    const invalid = this.validate(snapshot.entity, merged.row);
    if (invalid) {
      return { status: 'rejected', id: merged.id, fields: [], conflicts: allConflicts, error: invalid };
    }

    const auditAction = merged.action === 'insert' ? 'create' : 'update';
    await this.writeRow(tx, snapshot.entity, merged.action, merged.row, merged.id);
    await this.writeAudit(
      tx,
      snapshot.entity,
      merged.id,
      auditAction,
      existing?.row ?? null,
      merged.row,
      merged.fields
    );
    await this.rememberClocks(tx, snapshot.entity, merged.id, merged.clock);
    await this.writeConflicts(tx, allConflicts);

    return {
      status: merged.action,
      id: merged.id,
      fields: merged.fields,
      conflicts: allConflicts,
      row: merged.row,
      clock: merged.clock,
    };
  }

  // ------------------------------------------------------------------ change log

  /** True when this exact change has already been applied. */
  async findIntent(
    tx: SqliteTransaction,
    intent: Envelope
  ): Promise<{ entityId: string; outcome: string } | null> {
    const row = await tx.get<{ entity_id: string; outcome: string }>(
      `SELECT "entity_id", "outcome" FROM "sync_change"
        WHERE "entity" = ? AND "intent_id" = ? AND "hlc" = ?`,
      [intent.entity, intent.id, intent.hlc]
    );
    return row ? { entityId: row.entity_id, outcome: row.outcome } : null;
  }

  /** Appends the applied change to the server log. */
  async appendChange(
    tx: SqliteTransaction,
    intent: Envelope,
    result: ApplyResult
  ): Promise<void> {
    await tx.run(
      `INSERT INTO "sync_change"
         ("entity", "entity_id", "intent_id", "op", "hlc", "device_id", "fields", "payload", "clock", "outcome", "applied_at")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        intent.entity,
        result.id,
        intent.id,
        intent.op,
        intent.hlc,
        intent.deviceId,
        JSON.stringify(result.fields),
        JSON.stringify(result.row ?? intent.payload),
        JSON.stringify(result.clock ?? {}),
        result.status,
        new Date().toISOString(),
      ]
    );
  }

  /** Appends a rejection so the device learns the change was refused, not lost. */
  async recordRejection(
    tx: SqliteTransaction,
    intent: Envelope,
    error: string
  ): Promise<void> {
    await tx.run(
      `INSERT INTO "sync_reject"
         ("id", "entity", "entity_id", "hlc", "device_id", "error", "rejected_at")
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        generateUuidv7(),
        intent.entity,
        intent.id,
        intent.hlc,
        intent.deviceId,
        error,
        new Date().toISOString(),
      ]
    );
  }

  /** The state of every row that changed after a server sequence, newest state per row. */
  async serverChangesSince(since: number): Promise<{
    readonly snapshots: readonly Snapshot[];
    readonly cursor: number;
  }> {
    const head = await this.adapter.get<{ seq: number | null }>(
      `SELECT MAX("server_seq") AS seq FROM "sync_change"`
    );
    const cursor = Number(head?.seq ?? 0);

    const rows = await this.adapter.all<{ entity: string; entity_id: string; seq: number }>(
      `SELECT "entity", "entity_id", MAX("server_seq") AS seq
         FROM "sync_change"
        WHERE "server_seq" > ? AND "outcome" IN ('insert', 'update')
        GROUP BY "entity", "entity_id"
        ORDER BY seq`,
      [since]
    );

    const snapshots: Snapshot[] = [];
    for (const row of rows) {
      const entity = row.entity as EntityName;
      const columns = columnsFor(entity);
      const raw = await this.adapter.get<SqliteRow>(
        `SELECT * FROM "${columns.table}" WHERE "${columns.primaryKey}" = ?`,
        [row.entity_id]
      );
      if (!raw) continue;

      const decoded = decodeRow(columns, raw);
      const clock = await this.rowClock(this.adapter, entity, row.entity_id);
      let hlc = '';
      for (const value of Object.values(clock)) hlc = laterHlc(hlc, value);
      if (hlc === '') continue;

      snapshots.push({
        entity,
        id: row.entity_id,
        op: decoded.row.deleted_at ? 'remove' : 'update',
        hlc,
        deviceId: deviceOf(hlc),
        payload: decoded.row,
        clock,
        serverSeq: Number(row.seq),
      });
    }

    return { snapshots, cursor };
  }

  /** Every conflict the replica recorded, oldest first. */
  async conflicts(): Promise<readonly StoredConflict[]> {
    const rows = await this.adapter.all<Record<string, string>>(
      `SELECT * FROM "sync_conflict" ORDER BY "detected_at", "id"`
    );
    return rows.map((row) => ({
      id: String(row.id),
      entity: String(row.entity) as EntityName,
      entityId: String(row.entity_id),
      policy: String(row.policy),
      kind: String(row.kind) as ConflictNote['kind'],
      field: String(row.field),
      winner: String(row.winner),
      loser: String(row.loser),
      winnerHlc: String(row.winner_hlc),
      loserHlc: String(row.loser_hlc),
      resolved: String(row.resolved),
      detectedAt: String(row.detected_at),
    }));
  }

  /** The number of conflicts the replica recorded. */
  async conflictCount(): Promise<number> {
    const row = await this.adapter.get<{ count: number }>(
      `SELECT COUNT(*) AS count FROM "sync_conflict"`
    );
    return Number(row?.count ?? 0);
  }

  // ------------------------------------------------------------------ internals

  private sequenceColumn(): string {
    return this.dialect === 'postgres'
      ? 'BIGSERIAL PRIMARY KEY'
      : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  }

  /** The row a change refers to: by cell for a cell-merged create/update, else by id. */
  private async findExisting(
    tx: SqliteTransaction,
    intent: Envelope,
    policy: string
  ): Promise<StoredState | null> {
    if (policy === 'cell_merge' && intent.op !== 'remove') {
      const byCell = await this.findByCell(tx, intent.entity, intent.payload);
      if (byCell) return byCell;
    }
    return this.findById(tx, intent.entity, intent.id);
  }

  private async findById(
    tx: SqliteTransaction,
    entity: EntityName,
    id: string
  ): Promise<StoredState | null> {
    const columns = columnsFor(entity);
    const raw = await tx.get<SqliteRow>(
      `SELECT * FROM "${columns.table}" WHERE "${columns.primaryKey}" = ?`,
      [id]
    );
    return raw ? await this.storedState(tx, entity, raw) : null;
  }

  /** A row found by its cell key rather than its id. */
  private async findByCell(
    tx: SqliteTransaction,
    entity: EntityName,
    row: Readonly<Record<string, unknown>>
  ): Promise<StoredState | null> {
    const fields = policyFor(entity) === 'cell_merge' ? CELL_FIELDS[entity] : undefined;
    if (!fields) return null;

    const clauses = fields.map((field) => `("${field}" = ? OR ("${field}" IS NULL AND ? IS NULL))`);
    const params = fields.flatMap((field) => [row[field] ?? null, row[field] ?? null]);
    const columns = columnsFor(entity);
    const raw = await tx.get<SqliteRow>(
      `SELECT * FROM "${columns.table}" WHERE ${clauses.join(' AND ')}`,
      params as (string | number | null)[]
    );
    return raw ? await this.storedState(tx, entity, raw) : null;
  }

  private async storedState(
    runner: SqliteTransaction,
    entity: EntityName,
    raw: SqliteRow
  ): Promise<StoredState> {
    const decoded = decodeRow(columnsFor(entity), raw);
    const id = String(decoded.row.id);
    return { id, row: decoded.row, clock: await this.rowClock(runner, entity, id) };
  }

  private validate(entity: EntityName, row: Readonly<Record<string, unknown>>): string | null {
    const result = entitySchema(entity).safeParse(row);
    if (result.success) return null;
    const issues = issuesFromZodError(result.error)
      .slice(0, 4)
      .map((issue) => `${issue.path || '(row)'}: ${issue.message}`);
    return `${entity} rejected: ${issues.join('; ')}`;
  }

  private async runGuards(
    tx: SqliteTransaction,
    entity: EntityName,
    action: 'create' | 'update' | 'remove',
    before: Readonly<Record<string, unknown>> | null,
    after: Readonly<Record<string, unknown>>
  ): Promise<void> {
    const guards = action === 'remove' ? guardsForRemoval(entity) : guardsFor(entity);
    for (const guard of guards) {
      await guard({ entity, action, before, after, runner: tx, now: new Date() });
    }
  }

  private async writeRow(
    tx: SqliteTransaction,
    entity: EntityName,
    action: 'insert' | 'update',
    row: Readonly<Record<string, unknown>>,
    id: string
  ): Promise<void> {
    const columns = columnsFor(entity);
    const encoded = encodeRow(columns, row);

    if (action === 'insert') {
      encoded[columns.concurrencyColumn] = INITIAL_VERSION;
      const names = Object.keys(encoded);
      await tx.run(
        `INSERT INTO "${columns.table}" (${names.map((name) => `"${name}"`).join(', ')})
         VALUES (${names.map(() => '?').join(', ')})`,
        Object.values(encoded)
      );
      return;
    }

    const names = Object.keys(encoded).filter((name) => name !== columns.primaryKey);
    const assignments = names.map((name) => `"${name}" = ?`);
    assignments.push(`"${columns.concurrencyColumn}" = "${columns.concurrencyColumn}" + 1`);
    await tx.run(
      `UPDATE "${columns.table}" SET ${assignments.join(', ')} WHERE "${columns.primaryKey}" = ?`,
      [...names.map((name) => encoded[name]), id]
    );
  }

  private async hardDelete(
    tx: SqliteTransaction,
    entity: EntityName,
    id: string
  ): Promise<void> {
    const columns = columnsFor(entity);
    await tx.run(`DELETE FROM "${columns.table}" WHERE "${columns.primaryKey}" = ?`, [id]);
  }

  /**
   * Writes the audit record of an applied change.
   *
   * The repository's commit counter is private and applying a remote row does not advance it,
   * so the sequence is read from the table. Two applies in one transaction therefore share no
   * number, but a repository write that follows can reuse one: the gap is recorded in DR-02.
   */
  private async writeAudit(
    tx: SqliteTransaction,
    entity: EntityName,
    id: string,
    action: 'create' | 'update' | 'remove',
    before: Readonly<Record<string, unknown>> | null,
    after: Readonly<Record<string, unknown>> | null,
    changedFields: readonly string[]
  ): Promise<void> {
    const sequence = await tx.get<{ next: number }>(
      `SELECT COALESCE(MAX("commit_sequence"), 0) + 1 AS next FROM "audit_event"`
    );
    await writeAuditEvent(tx, {
      entity,
      entityId: id,
      action,
      actorId: actorOf(after ?? before),
      changedFields: action === 'create' ? Object.keys(after ?? {}) : changedFields,
      before,
      after: action === 'remove' ? null : after,
      reason: 'sync',
      createdAt: new Date().toISOString(),
      commitSequence: Number(sequence?.next ?? 1),
    });
  }

  private async writeConflicts(
    tx: SqliteTransaction,
    conflicts: readonly ConflictNote[]
  ): Promise<void> {
    for (const conflict of conflicts) {
      await tx.run(
        `INSERT INTO "sync_conflict"
           ("id", "entity", "entity_id", "policy", "kind", "field", "winner", "loser",
            "winner_hlc", "loser_hlc", "resolved", "detected_at")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUuidv7(),
          conflict.entity,
          conflict.entityId,
          conflict.policy,
          conflict.kind,
          conflict.field,
          conflict.winner,
          conflict.loser,
          conflict.winnerHlc,
          conflict.loserHlc,
          conflict.resolved,
          new Date().toISOString(),
        ]
      );
    }
  }
}

/** The columns that name a cell, for the entities merged by cell. */
const CELL_FIELDS: Partial<Record<EntityName, readonly string[]>> = {
  mark: ['assessment_id', 'enrolment_id', 'learning_area_id', 'component_id'],
};

interface OutboxRow {
  readonly seq: number;
  readonly entity: string;
  readonly entity_id: string;
  readonly op: string;
  readonly hlc: string;
  readonly device_id: string;
  readonly fields: string;
  readonly base: string;
  readonly payload: string;
}

function parseEnvelope(row: OutboxRow): Envelope {
  return {
    entity: row.entity as EntityName,
    id: row.entity_id,
    op: row.op as Envelope['op'],
    hlc: row.hlc,
    deviceId: row.device_id,
    fields: JSON.parse(row.fields) as string[],
    base: JSON.parse(row.base) as Record<string, string>,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
  };
}

function actorOf(row: Readonly<Record<string, unknown>> | null): string | null {
  if (!row) return null;
  const candidate = row.updated_by ?? row.created_by;
  return typeof candidate === 'string' ? candidate : null;
}

/** The latest reading in a clock map, or the empty string when it holds none. */
function latestOf(clock: Readonly<Record<string, string>>): string {
  let best = '';
  for (const value of Object.values(clock)) best = laterHlc(best, value);
  return best;
}
