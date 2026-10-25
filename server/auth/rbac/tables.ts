// ABOUTME: The authorisation tables of the hub - the roles an account holds and the maker-checker
// ABOUTME: approvals it has raised or decided - as raw SQLite DDL.

import type { SqliteAdapter } from '@/data/adapters/sqlite';

/**
 * The authorisation tables.
 *
 * They are the hub's own tables, not canonical entities: a role assignment is deployment state
 * (spec 02 §11 names `role_assignment` as a platform entity, and the registry does not carry it
 * yet), and a pending approval is a decision in flight rather than a school record. Putting either
 * in the entity registry would expose it to the repository API.
 *
 * - `auth_role_assignment` holds one row per user × role. The scope is not stored: it is resolved
 *   from the real assignment data (`teaching_assignment`, `teaching_group_member`,
 *   `class_group.homeroom_teacher_ids`), which is what keeps it effective-dated and self-maintaining.
 * - `auth_approval` holds one pending or decided privileged action. It names the maker and the
 *   checker, so the two actors of a maker-checker move are on the row itself.
 * - `auth_approval_event` is the append-only trail of the approvals: who raised one, who decided it,
 *   when and why. A decision writes the row and the event in one transaction.
 *
 * None of the tables carries a foreign key to `user`: a role assignment or an approval outlives the
 * account it names only as an audit record, and the identity rows of a school are never hard-deleted.
 */
export const RBAC_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "auth_role_assignment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "granted_at" TEXT NOT NULL,
      "granted_by" TEXT,
      UNIQUE ("user_id", "role")
    )`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_role_user" ON "auth_role_assignment" ("user_id")`,

  `CREATE TABLE IF NOT EXISTS "auth_approval" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "action" TEXT NOT NULL,
      "entity" TEXT NOT NULL,
      "entity_id" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "payload" TEXT,
      "requested_by" TEXT NOT NULL,
      "requested_at" TEXT NOT NULL,
      "decided_by" TEXT,
      "decided_at" TEXT,
      "reason" TEXT
    )`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_approval_status" ON "auth_approval" ("status")`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_approval_action" ON "auth_approval" ("action", "status")`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_approval_maker" ON "auth_approval" ("requested_by")`,

  `CREATE TABLE IF NOT EXISTS "auth_approval_event" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "approval_id" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "actor_id" TEXT NOT NULL,
      "at" TEXT NOT NULL,
      "reason" TEXT
    )`,
  `CREATE INDEX IF NOT EXISTS "idx_auth_approval_event" ON "auth_approval_event" ("approval_id")`,
];

/** Creates the authorisation tables and their indexes. Idempotent, so it runs on every start. */
export async function applyRbacSchema(adapter: SqliteAdapter): Promise<void> {
  for (const statement of RBAC_DDL) {
    await adapter.exec(statement);
  }
}
