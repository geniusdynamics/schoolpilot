// ABOUTME: The sync metadata a replica keeps beside the canonical tables: per-field clocks, the
// ABOUTME: device outbox, the server change log, rejections and the conflict log.

import { generateUuidv7 } from '@/domain/ids';
import { ENTITY_NAMES, type EntityName } from '@/domain/schema';
import type { SqliteAdapter, SqliteRow, SqliteTransaction } from '@/data/adapters/sqlite';
import { columnsFor, decodeRow } from '@/data/repository';
import type { FieldCipher } from '@/data/security';

import type { ConflictNote, Envelope, Snapshot } from './envelope';
import { deviceOf, laterHlc } from './hlc';
import { referenceRank, rowInScope, scopedEntities, type ReplicaScope } from './scope';

/** The SQL dialect the metadata tables are created in. The two differ only in the sequence. */
export type StorageDialect = 'sqlite' | 'postgres';

/** Which side of the sync a store belongs to. */
export type SyncRole = 'device' | 'server';

/** What applying a change did. */
export type ApplyStatus =
  | 'insert'
  | 'update'
  | 'noop'
  | 'immutable'
  | 'rejected'
  | 'replay'
  | 'forbidden';

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
  /** The cipher that opens the canonical tables' sealed columns; absent when they are not sealed. */
  readonly cipher?: FieldCipher;
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
 * are unchanged: sync adds columns of bookkeeping, not a second entity model.
 */
export class SyncStore {
  private readonly adapter: SqliteAdapter;
  private readonly role: SyncRole;
  private readonly dialect: StorageDialect;
  private readonly deviceId: string;
  private readonly cipher: FieldCipher | undefined;

  constructor(options: SyncStoreOptions) {
    this.adapter = options.adapter;
    this.role = options.role;
    this.dialect = options.dialect;
    this.deviceId = options.deviceId;
    this.cipher = options.cipher;
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
         "detail" TEXT,
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
           "institution_id" TEXT NOT NULL,
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
        `CREATE INDEX IF NOT EXISTS "ix_sync_change_scope"
           ON "sync_change" ("institution_id", "server_seq")`,
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

  /** True when the server already holds any change for a row. */
  async hasChange(
    runner: SqliteTransaction | SqliteAdapter,
    entity: EntityName,
    entityId: string
  ): Promise<boolean> {
    const row = await runner.get<{ present: number }>(
      `SELECT 1 AS present FROM "sync_change" WHERE "entity" = ? AND "entity_id" = ? LIMIT 1`,
      [entity, entityId]
    );
    return row !== null && row !== undefined;
  }

  /** Appends the applied change to the server log. */
  async appendChange(
    tx: SqliteTransaction,
    intent: Envelope,
    result: ApplyResult
  ): Promise<void> {
    const row = result.row ?? intent.payload;
    await tx.run(
      `INSERT INTO "sync_change"
         ("entity", "entity_id", "institution_id", "intent_id", "op", "hlc", "device_id", "fields", "payload", "clock", "outcome", "applied_at")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        intent.entity,
        result.id,
        institutionOf(intent.entity, row),
        intent.id,
        intent.op,
        intent.hlc,
        intent.deviceId,
        JSON.stringify(result.fields),
        JSON.stringify(row),
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

  /**
   * The state of every row that changed after a server sequence, newest state per row.
   *
   * A scope filters in SQL by entity and institution, then re-checks each decoded row in
   * JavaScript: the SQL is the index-friendly filter, the re-check is the guarantee. The
   * cursor is the log's global head, so a scoped replica does not re-read what it skipped.
   */
  async serverChangesSince(
    since: number,
    scope?: ReplicaScope
  ): Promise<{
    readonly snapshots: readonly Snapshot[];
    readonly cursor: number;
  }> {
    const head = await this.adapter.get<{ seq: number | null }>(
      `SELECT MAX("server_seq") AS seq FROM "sync_change"`
    );
    const cursor = Number(head?.seq ?? 0);

    const entities = scope ? scopedEntities(scope) : ENTITY_NAMES;
    if (entities.length === 0) return { snapshots: [], cursor };

    const params: (string | number)[] = [since, ...entities];
    const placeholders = entities.map(() => '?').join(', ');
    let where = `"server_seq" > ? AND "outcome" IN ('insert', 'update') AND "entity" IN (${placeholders})`;
    if (scope) {
      where += ` AND "institution_id" = ?`;
      params.push(scope.institutionId);
    }

    const rows = await this.adapter.all<{ entity: string; entity_id: string; seq: number }>(
      `SELECT "entity", "entity_id", MAX("server_seq") AS seq
         FROM "sync_change"
        WHERE ${where}
        GROUP BY "entity", "entity_id"
        ORDER BY seq`,
      params
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

      const decoded = decodeRow(columns, raw, this.cipher);
      if (scope && !rowInScope(scope, entity, decoded.row)) continue;

      const clock = await this.rowClock(this.adapter, entity, row.entity_id);
      const hlc = latestOf(clock);
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

    return { snapshots: sortByReference(snapshots), cursor };
  }

  // ------------------------------------------------------------------ conflicts

  /** Every conflict the replica recorded, oldest first. */
  async conflicts(): Promise<readonly StoredConflict[]> {
    const rows = await this.adapter.all<Record<string, string | null>>(
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
      ...(row.detail !== null && row.detail !== undefined ? { detail: String(row.detail) } : {}),
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

  /** Stores the conflicts a merge recorded. */
  async writeConflicts(
    tx: SqliteTransaction,
    conflicts: readonly ConflictNote[]
  ): Promise<void> {
    for (const conflict of conflicts) {
      await tx.run(
        `INSERT INTO "sync_conflict"
           ("id", "entity", "entity_id", "policy", "kind", "field", "winner", "loser",
            "winner_hlc", "loser_hlc", "resolved", "detail", "detected_at")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          conflict.detail ?? null,
          new Date().toISOString(),
        ]
      );
    }
  }

  // ------------------------------------------------------------------ internals

  private sequenceColumn(): string {
    return this.dialect === 'postgres'
      ? 'BIGSERIAL PRIMARY KEY'
      : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  }
}

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

/** The institution a row belongs to; the institution row names itself. */
function institutionOf(
  entity: EntityName,
  row: Readonly<Record<string, unknown>>
): string {
  if (entity === 'institution') return String(row.id ?? '');
  return String(row.institution_id ?? '');
}

/** The latest reading in a clock map, or the empty string when it holds none. */
function latestOf(clock: Readonly<Record<string, string>>): string {
  let best = '';
  for (const value of Object.values(clock)) best = laterHlc(best, value);
  return best;
}

/** Sorts a pull so a parent row lands before the rows that reference it. */
function sortByReference(snapshots: readonly Snapshot[]): readonly Snapshot[] {
  const rank = referenceRank();
  return [...snapshots].sort((left, right) => {
    const byEntity = (rank.get(left.entity) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(right.entity) ?? Number.MAX_SAFE_INTEGER);
    if (byEntity !== 0) return byEntity;
    return (left.serverSeq ?? 0) - (right.serverSeq ?? 0);
  });
}
