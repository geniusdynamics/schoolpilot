// ABOUTME: The repository's own audit trail: the audit_event table, its DDL, the write that
// ABOUTME: every mutation makes inside its own transaction, and the reader for the trail.

import { generateUuidv7, asId } from '@/domain/ids';
import type { SqliteAdapter, SqliteBindValue, SqliteRunResult } from '@/data/adapters/sqlite';

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
export async function applyAuditSchema(adapter: SqliteAdapter): Promise<void> {
  for (const statement of AUDIT_DDL) {
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

/** Writes one audit record. The caller runs it inside the mutation's transaction. */
export async function writeAuditEvent(runner: AuditRunner, record: AuditRecord): Promise<string> {
  const id = generateUuidv7();

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
      record.before === undefined ? null : JSON.stringify(record.before),
      record.after === undefined ? null : JSON.stringify(record.after),
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

/** Reads the audit trail, newest first. */
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
