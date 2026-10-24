// ABOUTME: The repository's own audit trail: the audit_event table, its DDL, the write that
// ABOUTME: every mutation makes inside its own transaction, and the reader for the trail.

import { generateUuidv7, asId } from '@/domain/ids';
import { isEntityName, type EntityName } from '@/domain/schema';
import type { SqliteAdapter, SqliteBindValue, SqliteRunResult } from '@/data/adapters/sqlite';
import { redactRestricted } from '@/data/security';

import type { AuditEvent, AuditQuery, ChangeType } from './types';

/**
 * The table the repository records its audit trail in.
 *
 * This is deliberately the repository's own table and not the platform `audit_event`
 * entity of spec 02 §11: that entity is not modelled yet, and adding it to the registry
 * is not this task's business. The columns follow spec 02 §1.5 - actor, entity, id,
 * before, after, reason - plus the changed field names and the commit sequence.
 */
export const AUDIT_TABLE = 'audit_event';

/** The audit table and its indexes. Safe to run against an existing database. */
export const AUDIT_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "${AUDIT_TABLE}" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "entity" TEXT NOT NULL,
      "entity_id" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "actor_id" TEXT,
      "changed_fields" TEXT NOT NULL,
      "before" TEXT,
      "after" TEXT,
      "reason" TEXT,
      "created_at" TEXT NOT NULL,
      "commit_sequence" INTEGER NOT NULL
    )`,
  `CREATE INDEX IF NOT EXISTS "idx_audit_event_entity" ON "${AUDIT_TABLE}" ("entity", "entity_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_audit_event_created_at" ON "${AUDIT_TABLE}" ("created_at")`,
];

/** The statement runner the audit trail needs; the adapter and a transaction both fit. */
export interface AuditRunner {
  exec(sql: string): Promise<void>;
  all<T extends object>(sql: string, params?: readonly SqliteBindValue[]): Promise<T[]>;
  get<T extends object>(sql: string, params?: readonly SqliteBindValue[]): Promise<T | null>;
  run(sql: string, params?: readonly SqliteBindValue[]): Promise<SqliteRunResult>;
}

/** Creates the audit table and its indexes. */
export async function applyAuditSchema(adapter: SqliteAdapter): Promise<void> {  for (const statement of AUDIT_DDL) {
    await adapter.exec(statement);
  }
}

/** One audit record about to be written. */
export interface AuditRecord {
  readonly entity: string;
  readonly entityId: string;
  readonly action: ChangeType;
  readonly actorId: string | null;
  readonly changedFields: readonly string[];
  readonly before: unknown;
  readonly after: unknown;
  readonly reason: string | null;
  readonly createdAt: string;
  readonly commitSequence: number;
}

/**
 * Writes one audit record. The caller runs it inside the mutation's transaction.
 *
 * Restricted values are replaced by a marker before the row is serialised: the trail records that
 * a restricted field changed and who changed it, never what it held. The value therefore exists at
 * rest in one place, sealed in the row itself, and not in a second copy a reader of the trail
 * could open without the key.
 */
export async function writeAuditEvent(runner: AuditRunner, record: AuditRecord): Promise<string> {
  const id = generateUuidv7();
  const entity = isEntityName(record.entity) ? record.entity : null;
  const before = entity ? redactRestricted(entity, record.before) : record.before;
  const after = entity ? redactRestricted(entity, record.after) : record.after;

  await runner.run(
    `INSERT INTO "${AUDIT_TABLE}"
       ("id", "entity", "entity_id", "action", "actor_id", "changed_fields", "before", "after", "reason", "created_at", "commit_sequence")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      record.entity,
      record.entityId,
      record.action,
      record.actorId,
      JSON.stringify(record.changedFields),
      before === undefined ? null : JSON.stringify(before),
      after === undefined ? null : JSON.stringify(after),
      record.reason,
      record.createdAt,
      record.commitSequence,
    ]
  );

  return id;
}

interface AuditRow {
  readonly id: string;
  readonly entity: string;
  readonly entity_id: string;
  readonly action: string;
  readonly actor_id: string | null;
  readonly changed_fields: string;
  readonly before: string | null;
  readonly after: string | null;
  readonly reason: string | null;
  readonly created_at: string;
  readonly commit_sequence: number;
}

/** Reads the entities the audit trail covers. */
export async function readAuditEntities(runner: AuditRunner): Promise<readonly EntityName[]> {
  const rows = await runner.all<{ entity: string }>(
    `SELECT DISTINCT "entity" FROM "${AUDIT_TABLE}" ORDER BY "entity"`
  );
  return rows.map((row) => row.entity as EntityName);
}

/** Reads the audit trail, newest first. */
/**
 * The highest commit sequence the audit trail already holds, or 0 when it is empty.
 *
 * The trail can be written by something that is not the repository (the repair tool numbers its
 * own events from the table), so the repository seeds its counter from the table instead of from
 * zero. Otherwise two events could carry the same sequence and a consumer comparing tokens could
 * read a stale payload as current.
 */
export async function readMaxAuditSequence(runner: AuditRunner): Promise<number> {
  const rows = await runner.all<{ max_sequence: number | null }>(
    `SELECT MAX("commit_sequence") AS max_sequence FROM "${AUDIT_TABLE}"`
  );
  const value = rows[0]?.max_sequence;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function readAuditEvents(
  runner: AuditRunner,
  query: AuditQuery = {}
): Promise<readonly AuditEvent[]> {
  const clauses: string[] = [];
  const params: SqliteBindValue[] = [];

  if (query.entity !== undefined) {
    clauses.push('"entity" = ?');
    params.push(query.entity);
  }
  if (query.entityId !== undefined) {
    clauses.push('"entity_id" = ?');
    params.push(query.entityId);
  }
  if (query.action !== undefined) {
    clauses.push('"action" = ?');
    params.push(query.action);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.max(1, Math.min(query.limit ?? 100, 1000));
  const offset = Math.max(0, query.offset ?? 0);

  const rows = await runner.all<AuditRow>(
    `SELECT * FROM "${AUDIT_TABLE}" ${where} ORDER BY "created_at" DESC, "rowid" DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return rows.map((row) => ({
    id: asId<'audit_event'>(row.id),
    entity: row.entity as AuditEvent['entity'],
    entityId: row.entity_id,
    action: row.action as ChangeType,
    actorId: row.actor_id,
    changedFields: parseJson<string[]>(row.changed_fields, []),
    before: parseJson<unknown>(row.before, null),
    after: parseJson<unknown>(row.after, null),
    reason: row.reason,
    createdAt: row.created_at,
    commitSequence: row.commit_sequence,
  }));
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (value === null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
