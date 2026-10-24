// ABOUTME: The apply verb: folds a pushed change or a pulled snapshot into the canonical tables,
// ABOUTME: reusing the entity schema, codec, guards and audit trail of the repository.

import type { EntityName } from '@/domain/schema';
import type { SqliteRow, SqliteTransaction } from '@/data/adapters/sqlite';
import {
  INITIAL_VERSION,
  RepositoryError,
  columnsFor,
  decodeRow,
  encodeRow,
  entitySchema,
  guardsFor,
  guardsForRemoval,
  issuesFromZodError,
  writeAuditEvent,
} from '@/data/repository';
import type { FieldCipher } from '@/data/security';

import type { ConflictNote, Envelope, Snapshot } from './envelope';
import { latestHlc } from './hlc';
import {
  cellFieldsFor,
  mergeChange,
  mergeSnapshot,
  policyFor,
  type ConflictPolicy,
  type StoredState,
} from './policies';
import type { ApplyResult, SyncStore } from './store';

/**
 * The merge of one change into one replica.
 *
 * This is the verb the repository does not have: it applies a row under the id the writer
 * chose instead of generating one, and it runs the entity's own schema, codec, guards and
 * audit so the domain layer is reused rather than duplicated. A refusal is written to the
 * conflict log as an `unresolved` note, so it is visible instead of silently dropped.
 */
export class SyncApplier {
  constructor(
    private readonly store: SyncStore,
    private readonly cipher?: FieldCipher
  ) {}

  /** Folds a pushed change into the canonical table. */
  async applyIntent(tx: SqliteTransaction, intent: Envelope): Promise<ApplyResult> {
    const policy = policyFor(intent.entity);
    const existing = await this.findExisting(tx, intent, policy);

    if (intent.op === 'remove' && !existing) {
      return { status: 'noop', id: intent.id, fields: [], conflicts: [] };
    }

    const merged = mergeChange(policy, intent, existing);
    const conflicts = [...merged.conflicts];

    if (merged.action === 'noop') {
      return { status: 'noop', id: merged.id, fields: [], conflicts };
    }
    if (merged.action === 'immutable') {
      await this.store.writeConflicts(tx, conflicts);
      return { status: 'immutable', id: merged.id, fields: [], conflicts };
    }

    const guardAction =
      intent.op === 'remove' ? 'remove' : merged.action === 'insert' ? 'create' : 'update';
    const invalid = this.validate(intent.entity, merged.row);
    if (invalid) {
      const refusal = this.refusal(intent.entity, merged.id, policy, intent, invalid);
      await this.store.writeConflicts(tx, [...conflicts, refusal]);
      return {
        status: 'rejected',
        id: merged.id,
        fields: [],
        conflicts: [...conflicts, refusal],
        error: invalid,
      };
    }

    try {
      await this.runGuards(tx, intent.entity, guardAction, existing?.row ?? null, merged.row);
    } catch (error) {
      if (!(error instanceof RepositoryError)) throw error;
      const refusal = this.refusal(intent.entity, merged.id, policy, intent, error.message);
      await this.store.writeConflicts(tx, [...conflicts, refusal]);
      return {
        status: 'rejected',
        id: merged.id,
        fields: [],
        conflicts: [...conflicts, refusal],
        error: error.message,
      };
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
    await this.store.rememberClocks(tx, intent.entity, merged.id, merged.clock);
    await this.store.writeConflicts(tx, conflicts);

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
        await this.writeAudit(
          tx,
          snapshot.entity,
          byCell.id,
          'remove',
          byCell.row,
          null,
          Object.keys(byCell.row)
        );
        conflicts.push({
          entity: snapshot.entity,
          entityId: snapshot.id,
          policy: 'cell_merge',
          kind: 'cell_identity',
          field: 'id',
          winner: snapshot.id,
          loser: byCell.id,
          winnerHlc: snapshot.hlc,
          loserHlc: latestHlc(byCell.clock),
          resolved: 'the server folded the cell under its first id; the local duplicate is dropped',
        });
      }
    }

    const merged = mergeSnapshot(existing, snapshot);
    const allConflicts = [...conflicts, ...merged.conflicts];

    if (merged.action !== 'insert' && merged.action !== 'update') {
      await this.store.writeConflicts(tx, allConflicts);
      return { status: merged.action, id: merged.id, fields: [], conflicts: allConflicts };
    }

    const invalid = this.validate(snapshot.entity, merged.row);
    if (invalid) {
      const refusal = this.snapshotRefusal(snapshot, invalid);
      await this.store.writeConflicts(tx, [...allConflicts, refusal]);
      return {
        status: 'rejected',
        id: merged.id,
        fields: [],
        conflicts: [...allConflicts, refusal],
        error: invalid,
      };
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
    await this.store.rememberClocks(tx, snapshot.entity, merged.id, merged.clock);
    await this.store.writeConflicts(tx, allConflicts);

    return {
      status: merged.action,
      id: merged.id,
      fields: merged.fields,
      conflicts: allConflicts,
      row: merged.row,
      clock: merged.clock,
    };
  }

  // ------------------------------------------------------------------ internals

  /** The row a change refers to: by cell for a cell-merged create/update, else by id. */
  private async findExisting(
    tx: SqliteTransaction,
    intent: Envelope,
    policy: ConflictPolicy
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
    return raw ? this.storedState(tx, entity, raw) : null;
  }

  /** A row found by its cell key rather than its id. */
  private async findByCell(
    tx: SqliteTransaction,
    entity: EntityName,
    row: Readonly<Record<string, unknown>>
  ): Promise<StoredState | null> {
    const fields = cellFieldsFor(entity);
    if (!fields) return null;

    const clauses = fields.map((field) => `("${field}" = ? OR ("${field}" IS NULL AND ? IS NULL))`);
    const params = fields.flatMap((field) => [row[field] ?? null, row[field] ?? null]);
    const columns = columnsFor(entity);
    const raw = await tx.get<SqliteRow>(
      `SELECT * FROM "${columns.table}" WHERE ${clauses.join(' AND ')}`,
      params as (string | number | null)[]
    );
    return raw ? this.storedState(tx, entity, raw) : null;
  }

  private async storedState(
    runner: SqliteTransaction,
    entity: EntityName,
    raw: SqliteRow
  ): Promise<StoredState> {
    const decoded = decodeRow(columnsFor(entity), raw, this.cipher);
    const id = String(decoded.row.id);
    return { id, row: decoded.row, clock: await this.store.rowClock(runner, entity, id) };
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
    const encoded = encodeRow(columns, row, this.cipher);

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
   * number, but a repository write that follows can reuse one: P4-A03 moves allocation to the
   * server.
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

  /** The conflict note a refused push leaves behind. */
  private refusal(
    entity: EntityName,
    entityId: string,
    policy: ConflictPolicy,
    intent: Envelope,
    detail: string
  ): ConflictNote {
    return {
      entity,
      entityId,
      policy,
      kind: 'unresolved',
      field: '*',
      winner: 'stored',
      loser: intent.deviceId,
      winnerHlc: '',
      loserHlc: intent.hlc,
      resolved: 'the change was refused; the stored row stands and the refusal is logged',
      detail,
    };
  }

  /** The conflict note a refused pull leaves behind. */
  private snapshotRefusal(snapshot: Snapshot, detail: string): ConflictNote {
    return {
      entity: snapshot.entity,
      entityId: snapshot.id,
      policy: policyFor(snapshot.entity),
      kind: 'unresolved',
      field: '*',
      winner: 'stored',
      loser: snapshot.deviceId,
      winnerHlc: '',
      loserHlc: snapshot.hlc,
      resolved: 'the server state could not be stored; it is logged and will be retried on the next pull',
      detail,
    };
  }
}

function actorOf(row: Readonly<Record<string, unknown>> | null): string | null {
  if (!row) return null;
  const candidate = row.updated_by ?? row.created_by;
  return typeof candidate === 'string' ? candidate : null;
}
